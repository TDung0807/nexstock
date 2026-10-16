import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { GoogleOAuthGuard } from './guards/google-oauth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import type { AuthTokens, JwtPayload, JwtRefreshPayload } from './types/jwt-payload.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth(): void {
    // Guard redirects to Google's consent screen.
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  googleCallback(@CurrentUser() user: JwtPayload): Promise<AuthTokens> {
    return this.authService.login(user);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  refresh(@CurrentUser() user: JwtRefreshPayload): Promise<AuthTokens> {
    return this.authService.refreshTokens(user.sub, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.authService.logout(user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }
}
