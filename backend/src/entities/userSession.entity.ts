import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'session_token' })
  sessionToken!: string;

  @Column({ name: 'refresh_token' })
  refreshToken!: string;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo?: any | null;

  @Column({ name: 'location', type: 'varchar', nullable: true })
  location?: string | null;

  @CreateDateColumn({ name: 'login_at' })
  loginAt!: Date;

  @Column({ name: 'last_activity', type: 'timestamp', nullable: true })
  lastActivity?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'logout_at', type: 'timestamp', nullable: true })
  logoutAt?: Date | null;

  @Column({ name: 'logout_reason', type: 'varchar', nullable: true })
  logoutReason?: string | null;
}
