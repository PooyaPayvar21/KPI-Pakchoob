import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum ImportStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Entity('user_import_logs')
export class UserImportLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  userId?: string | null;

  @Column()
  username!: string;

  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  role?: string | null;

  @Column({ type: 'varchar', default: ImportStatus.PENDING })
  status!: ImportStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_user_id' })
  createdUser?: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

