import { UserStatus } from '../../generated/prisma/enums.js';

export class UpdateUserDto {
  email?: string;
  password?: string;
  fullName?: string | null;
  status?: UserStatus;
}
