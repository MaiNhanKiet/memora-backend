import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UserRepository } from '../../repositories/user.repository';
import {
  toPublicUser,
  toUserAuthRecord,
  type PublicUser,
  type UserAuthRecord,
} from './users.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async findById(id: string): Promise<PublicUser | null> {
    const user = await this.users.findById(id);
    return user === null ? null : toPublicUser(user);
  }

  async findByEmail(email: string): Promise<PublicUser | null> {
    const user = await this.users.findByEmail(email);
    return user === null ? null : toPublicUser(user);
  }

  async findAuthByEmail(email: string): Promise<UserAuthRecord | null> {
    const user = await this.users.findByEmail(email);
    return user === null ? null : toUserAuthRecord(user);
  }

  async updateOwnProfile(
    userId: string,
    input: { fullName?: string; phone?: string | null },
  ): Promise<PublicUser> {
    const data: Prisma.UserUncheckedUpdateInput = {};
    if (input.fullName !== undefined) {
      const fullName = input.fullName.trim();
      if (fullName.length < 1 || fullName.length > 150) {
        throw new BadRequestException('fullName is invalid');
      }
      data.fullName = fullName;
    }
    if (input.phone === null) {
      data.phone = null;
    } else if (input.phone !== undefined) {
      const phone = input.phone.trim();
      if (phone.length < 1 || phone.length > 30) {
        throw new BadRequestException('phone is invalid');
      }
      data.phone = phone;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one profile field is required');
    }
    try {
      const updated = await this.users.updateById(userId, data);
      return toPublicUser(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async findAuthByGoogleSub(googleSub: string): Promise<UserAuthRecord | null> {
    const user = await this.users.findByGoogleSub(googleSub);
    return user === null ? null : toUserAuthRecord(user);
  }
}
