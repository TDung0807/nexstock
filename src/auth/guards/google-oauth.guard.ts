import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  // Surface Google's `?error=...` (e.g. access_denied when the user declines)
  // and any strategy failure as a clear 401 instead of a generic error.
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<Request>();
    const oauthError = request.query?.error;
    if (typeof oauthError === 'string') {
      throw new UnauthorizedException(`Google login failed: ${oauthError}`);
    }
    if (err || !user) {
      const message =
        (info as { message?: string } | undefined)?.message ??
        'Google authentication failed';
      throw err instanceof Error ? err : new UnauthorizedException(message);
    }
    return user;
  }
}
