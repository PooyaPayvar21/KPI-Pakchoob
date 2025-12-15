import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>
  ) {}

  async create(data: Partial<User> & { password?: string }) {
    // Validate required fields
    if (!data.username || !data.email || !data.password) {
      throw new BadRequestException('Username, email, and password are required');
    }

    // Check if user already exists
    const existing = await this.usersRepo.findOne({
      where: [{ username: data.username }, { email: data.email }]
    });
    if (existing) {
      throw new BadRequestException('Username or email already exists');
    }

    // Hash password
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;

    // Default role to EMPLOYEE if not specified
    if (!data.role) {
      data.role = UserRole.EMPLOYEE;
    }

    // Set account to ACTIVE and mark email as verified
    if (!data.status) {
      data.status = UserStatus.ACTIVE;
    }
    data.emailVerified = true;

    const user = this.usersRepo.create(data as any);
    return this.usersRepo.save(user);
  }

  async findById(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsernameOrEmail(q: string) {
    return this.usersRepo.findOne({ where: [{ username: q }, { email: q }] });
  }

  async list(filters?: { status?: UserStatus; role?: UserRole }) {
    const query = this.usersRepo.createQueryBuilder('user');
    if (filters?.status) {
      query.andWhere('user.status = :status', { status: filters.status });
    }
    if (filters?.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }
    return query.getMany();
  }

  async update(id: string, data: Partial<User>) {
    const user = await this.findById(id);
    Object.assign(user, data);
    return this.usersRepo.save(user);
  }

  async deactivate(id: string, deactivatedBy?: string, reason?: string) {
    const user = await this.findById(id);
    user.status = UserStatus.INACTIVE;
    user.deactivatedBy = deactivatedBy;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason;
    return this.usersRepo.save(user);
  }

  async reactivate(id: string) {
    const user = await this.findById(id);
    user.status = UserStatus.ACTIVE;
    user.deactivatedBy = null;
    user.deactivatedAt = null;
    user.deactivationReason = null;
    return this.usersRepo.save(user);
  }

  async assignRole(userId: string, role: UserRole) {
    const user = await this.findById(userId);
    user.role = role;
    return this.usersRepo.save(user);
  }

  async lock(id: string) {
    const user = await this.findById(id);
    user.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 24 hours
    return this.usersRepo.save(user);
  }

  async unlock(id: string) {
    const user = await this.findById(id);
    user.lockedUntil = null;
    user.loginAttempts = 0;
    return this.usersRepo.save(user);
  }

  async resetPassword(id: string, adminResetPassword: string) {
    const user = await this.findById(id);
    user.passwordHash = await bcrypt.hash(adminResetPassword, 10);
    user.mustChangePassword = true;
    user.passwordChangedAt = new Date();
    return this.usersRepo.save(user);
  }

  async setAccessLevels(userId: string, accessLevels: any) {
    const user = await this.findById(userId);
    user.accessLevels = accessLevels;
    return this.usersRepo.save(user);
  }

  async setPermissions(userId: string, permissions: any) {
    const user = await this.findById(userId);
    user.permissions = permissions;
    return this.usersRepo.save(user);
  }
}
