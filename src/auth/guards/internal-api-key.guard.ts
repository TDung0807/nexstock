import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

// Protects service-to-service endpoints (e.g. /auth/verify) with a shared key.
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.get('x-internal-api-key') ?? '';
    const expected = this.configService.getOrThrow<string>(
      'INTERNAL_API_KEY',
    );

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    const valid =
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer);

    if (!valid) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}
