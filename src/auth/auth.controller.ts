import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { VerifyTokenDto } from './dto/verify-token.dto.js';
import { GoogleOAuthGuard } from './guards/google-oauth.guard.js';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import type {
  AuthTokens,
  JwtPayload,
  JwtRefreshPayload,
  VerifiedUser,
} from './types/jwt-payload.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth(): void {
    // Guard redirects to Google's consent screen.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  googleCallback(@CurrentUser() user: JwtPayload): Promise<AuthTokens> {
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  refresh(@CurrentUser() user: JwtRefreshPayload): Promise<AuthTokens> {
    return this.authService.refreshTokens(user.sub, user.refreshToken);
  }

  // Called by other microservices (with the internal API key) to validate a token.
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  verify(@Body() dto: VerifyTokenDto): Promise<VerifiedUser> {
    return this.authService.verifyAccessToken(dto.token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.authService.logout(user.sub);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }
}
