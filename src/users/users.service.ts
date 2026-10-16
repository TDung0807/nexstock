import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserModel } from '../generated/prisma/models/User.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

const scrypt = promisify(scryptCallback);

type PublicUser = Omit<UserModel, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await this.hashPassword(dto.password),
        fullName: dto.fullName ?? null,
        status: dto.status,
      },
    });

    return this.toPublic(user);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toPublic(user));
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return this.toPublic(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    await this.ensureExists(id);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        fullName: dto.fullName,
        status: dto.status,
        passwordHash: dto.password
          ? await this.hashPassword(dto.password)
          : undefined,
      },
    });

    return this.toPublic(user);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.user.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) {
      return false;
    }
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const hashBuffer = Buffer.from(hash, 'hex');
    return (
      hashBuffer.length === derived.length &&
      timingSafeEqual(hashBuffer, derived)
    );
  }

  private toPublic(user: UserModel): PublicUser {
    const { passwordHash, ...rest } = user;
    void passwordHash;
    return rest;
  }
}
