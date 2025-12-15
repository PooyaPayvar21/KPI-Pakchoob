import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  ASSIGN_ROLE = 'ASSIGN_ROLE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  LOCK_USER = 'LOCK_USER',
  UNLOCK_USER = 'UNLOCK_USER',
  IMPORT_USERS = 'IMPORT_USERS',
  APPROVE_KPI = 'APPROVE_KPI',
  SUBMIT_KPI = 'SUBMIT_KPI',
  UNKNOWN = 'UNKNOWN'
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ name: 'resource_type', type: 'varchar', nullable: true })
  resourceType?: string | null;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
