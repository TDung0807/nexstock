import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const name = (info as { name?: string } | undefined)?.name;
      if (name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      throw err instanceof Error
        ? err
        : new UnauthorizedException('Invalid or missing refresh token');
    }
    return user;
  }
}
