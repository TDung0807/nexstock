import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { OAuth2Client } from 'google-auth-library';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service.js';
import type { JwtPayload } from '../types/jwt-payload.js';

interface GoogleTokenParams {
  id_token?: string;
}

// `callbackArity: true` makes passport pass the token `params` (incl. id_token) to validate.
@Injectable()
export class GoogleStrategy extends PassportStrategy(
  Strategy,
  'google',
  true,
) {
  private readonly clientId: string;
  private readonly oauthClient: OAuth2Client;

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientId = configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    super({
      clientID: clientId,
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['openid', 'email', 'profile'],
    });
    this.clientId = clientId;
    this.oauthClient = new OAuth2Client(clientId);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    params: GoogleTokenParams,
    _profile: Profile,
  ): Promise<JwtPayload> {
    if (!params?.id_token) {
      throw new UnauthorizedException('Missing Google id_token');
    }

    // OIDC verification: validates signature, `aud` (our clientId), `iss` and expiry.
    const ticket = await this.oauthClient
      .verifyIdToken({ idToken: params.id_token, audience: this.clientId })
      .catch(() => {
        throw new UnauthorizedException('Invalid Google id_token');
      });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Google account has no email');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.authService.validateGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name ?? null,
    });

    return { sub: user.id, email: user.email, role: user.role };
  }
}
