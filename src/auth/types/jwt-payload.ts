import type { UserRole } from '../../generated/prisma/enums.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface VerifiedUser {
  valid: true;
  sub: string;
  email: string;
  role: UserRole;
  status: string;
}
