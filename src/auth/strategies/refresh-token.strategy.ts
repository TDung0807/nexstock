import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  JwtPayload,
  JwtRefreshPayload,
} from '../types/jwt-payload.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const header = req.get('authorization') ?? '';
    const refreshToken = header.replace('Bearer', '').trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token malformed');
    }
    return { sub: payload.sub, email: payload.email, refreshToken };
  }
}
