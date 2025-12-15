import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('approval_chains')
@Index(['employeeId', 'sequenceLevel'])
export class ApprovalChain {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  employeeId!: string;

  @Column({ type: 'varchar' })
  employeeName!: string;

  @Column({ type: 'varchar', nullable: true })
  department?: string | null;

  @Column({ type: 'int' })
  sequenceLevel!: number; // 1 = first manager, 2 = second manager, etc.

  @Column({ type: 'varchar' })
  managerId!: string;

  @Column({ type: 'varchar' })
  managerName!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_user_id' })
  managerUser?: User | null;

  @Column({ type: 'varchar' })
  branch!: string; // 'Group', 'ایرانیان', 'خراسان', 'خوزستان', 'تخته فشرده'

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
