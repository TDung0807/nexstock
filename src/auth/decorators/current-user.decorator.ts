import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  JwtPayload,
  JwtRefreshPayload,
} from '../types/jwt-payload.js';

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): JwtPayload | JwtRefreshPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload | JwtRefreshPayload;
  },
);
