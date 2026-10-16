import { UserStatus } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  email!: string;
  password!: string;
  fullName?: string | null;
  status?: UserStatus;
}
