import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserModel } from '../generated/prisma/models/User.js';
import type {
  AuthTokens,
  JwtPayload,
  VerifiedUser,
} from './types/jwt-payload.js';

const scrypt = promisify(scryptCallback);

interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateGoogleUser(profile: GoogleProfile): Promise<UserModel> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.googleId }, { email: profile.email }],
      },
    });

    if (!existing) {
      return this.prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          fullName: profile.fullName,
        },
      });
    }

    // Link the Google account to a pre-existing (e.g. password) user.
    if (!existing.googleId) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: { googleId: profile.googleId },
      });
    }

    return existing;
  }

  async login(payload: JwtPayload): Promise<AuthTokens> {
    const tokens = await this.issueTokens(payload);
    await this.storeRefreshToken(payload.sub, tokens.refreshToken);
    return tokens;
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }

    const valid = await this.verifyHash(refreshToken, user.refreshTokenHash);
    if (!valid) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  // Centralized verification used by other services: checks the token
  // signature/expiry and that the user still exists and is active.
  async verifyAccessToken(token: string): Promise<VerifiedUser> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    return {
      valid: true,
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TTL'),
      } as JwtSignOptions),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_TTL'),
      } as JwtSignOptions),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await this.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  private async hash(value: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(value, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  private async verifyHash(value: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) {
      return false;
    }
    const derived = (await scrypt(value, salt, 64)) as Buffer;
    const hashBuffer = Buffer.from(hash, 'hex');
    return (
      hashBuffer.length === derived.length &&
      timingSafeEqual(hashBuffer, derived)
    );
  }
}
