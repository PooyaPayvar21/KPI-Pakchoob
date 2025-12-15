import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLANT_ADMIN = 'PLANT_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  MODERATOR = 'MODERATOR',
  APPROVER = 'APPROVER',
  EMPLOYEE = 'EMPLOYEE'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_ACTIVATION = 'PENDING_ACTIVATION'
}

@Entity('user_accounts')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid', nullable: true })
  employeeId?: string | null;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash?: string | null;

  @Column({ name: 'password_reset_token', type: 'varchar', nullable: true })
  passwordResetToken?: string | null;

  @Column({ name: 'password_reset_expires', type: 'timestamp', nullable: true })
  passwordResetExpires?: Date | null;

  @Column({ name: 'email_verified', default: true })
  emailVerified!: boolean;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true })
  phoneNumber?: string | null;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled!: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', nullable: true })
  mfaSecret?: string | null;

  @Column({ name: 'mfa_backup_codes', type: 'jsonb', nullable: true })
  mfaBackupCodes?: string[] | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role!: UserRole;

  @Column({ type: 'jsonb', nullable: true })
  permissions?: any | null;

  @Column({ name: 'access_levels', type: 'jsonb', nullable: true })
  accessLevels?: any | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  // Security & session
  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin?: Date | null;

  @Column({ name: 'login_attempts', type: 'int', default: 0 })
  loginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date | null;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt?: Date | null;

  // Profile
  @Column({ name: 'profile_image_url', type: 'varchar', nullable: true })
  profileImageUrl?: string | null;

  @Column({ default: 'EN' })
  language!: 'FA' | 'EN';

  @Column({ default: 'UTC' })
  timezone!: string;

  @Column({ name: 'notification_preferences', type: 'jsonb', nullable: true })
  notificationPreferences?: any | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deactivated_by', type: 'uuid', nullable: true })
  deactivatedBy?: string | null;

  @Column({ name: 'deactivated_at', type: 'timestamp', nullable: true })
  deactivatedAt?: Date | null;

  @Column({ name: 'deactivation_reason', type: 'varchar', nullable: true })
  deactivationReason?: string | null;
}
