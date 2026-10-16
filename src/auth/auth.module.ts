import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessTokenStrategy } from './strategies/access-token.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    AccessTokenStrategy,
    RefreshTokenStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
