import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * KPI Categories as per the structure
 */
export enum KPICategory {
  BUSINESS = 'Business', // کسب و کار
  MAIN_TASKS = 'MainTasks', // کارهای اصلی
  PROJECTS = 'Projects', // پروژه ها
}

/**
 * KPI Type: positive (+) or negative (-)
 * Positive: higher achievement is better (e.g., production volume)
 * Negative: lower achievement is better (e.g., defect rate, cost)
 */
export enum KPIType {
  POSITIVE = '+',
  NEGATIVE = '-',
}

/**
 * KPI Status for approval workflow
 */
export enum KPIStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Performance rating based on achievement percentage
 */
export enum PerformanceRating {
  RED = 'RED', // <60%
  YELLOW = 'YELLOW', // 60%-99%
  GREEN = 'GREEN', // 100%+
}

@Entity('kpi_definitions')
@Index(['employeeId', 'quarter'])
@Index(['department', 'quarter'])
@Index(['managerId', 'status'])
export class KPIDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Reference
  @Column({ name: 'company_name', type: 'varchar' })
  companyName!: string; // e.g., "IRN"

  @Column({ type: 'varchar' })
  quarter!: string; // e.g., "Q2"

  @Column({ name: 'fiscal_year' })
  fiscalYear!: number; // e.g., 1404 (Iranian calendar)

  // Employee & Manager
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: User;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager?: User | null;

  // Organization
  @Column()
  department!: string; // e.g., "مالی", "تولید", "کیفیت"

  @Column({ name: 'job_title', type: 'varchar', nullable: true })
  jobTitle?: string | null;

  // KPI Details
  @Column({ type: 'enum', enum: KPICategory })
  category!: KPICategory;

  @Column({ name: 'kpi_name_en', type: 'varchar' })
  kpiNameEn!: string;

  @Column({ name: 'kpi_name_fa', type: 'varchar', nullable: true })
  kpiNameFa?: string | null;

  @Column({ name: 'kpi_description', type: 'text', nullable: true })
  kpiDescription?: string | null;

  // Weights
  @Column({ name: 'objective_weight', type: 'decimal', precision: 5, scale: 3 })
  objectiveWeight!: number; // 0.6, 0.8, etc.

  @Column({ name: 'kpi_weight', type: 'decimal', precision: 5, scale: 3 })
  kpiWeight!: number; // 0.4, 0.05, 0.25, etc.

  // Performance Targets
  @Column({ name: 'target_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  targetValue?: number | null;

  @Column({ name: 'achievement_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  achievementValue?: number | null;

  @Column({ type: 'enum', enum: KPIType })
  type!: KPIType;

  // Calculated Fields (from Excel formulas)
  @Column({ name: 'percentage_achievement', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentageAchievement?: number | null; // 60%, 100%, 86%, etc. (stored as 0.60, 1.00, 0.86)

  @Column({ name: 'score_achievement', type: 'decimal', precision: 10, scale: 4, nullable: true })
  scoreAchievement?: number | null;

  @Column({ type: 'enum', enum: PerformanceRating, nullable: true })
  performanceRating?: PerformanceRating | null;

  // Status & Workflow
  @Column({ type: 'enum', enum: KPIStatus, default: KPIStatus.DRAFT })
  status!: KPIStatus;

  // Comments & Notes
  @Column({ name: 'comments', type: 'text', nullable: true })
  comments?: string | null;

  // Approval
  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes?: string | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason?: string | null;

  // Audit
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  // Relations
  @OneToMany(() => KPIApprovalHistory, (history) => history.kpi)
  approvalHistory!: KPIApprovalHistory[];
}

/**
 * KPI Approval History - Track who approved/rejected and when
 */
@Entity('kpi_approval_history')
@Index(['kpiId', 'createdAt'])
@Index(['approverId'])
export class KPIApprovalHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'kpi_id', type: 'uuid' })
  kpiId!: string;

  @ManyToOne(() => KPIDefinition, (kpi) => kpi.approvalHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kpi_id' })
  kpi!: KPIDefinition;

  @Column({ type: 'enum', enum: KPIStatus })
  fromStatus!: KPIStatus;

  @Column({ type: 'enum', enum: KPIStatus })
  toStatus!: KPIStatus;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approver_id' })
  approver?: User | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

/**
 * KPI Period Summary - Aggregated scores per employee per period
 */
@Entity('kpi_period_summary')
@Index(['employeeId', 'quarter', 'fiscalYear'])
@Index(['department', 'fiscalYear'])
export class KPIPeriodSummary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: User;

  @Column({ name: 'quarter' })
  quarter!: string;

  @Column({ name: 'fiscal_year' })
  fiscalYear!: number;

  @Column({ name: 'department' })
  department!: string;

  // Aggregate scores
  @Column({ name: 'total_kpis' })
  totalKpis!: number;

  @Column({ name: 'completed_kpis' })
  completedKpis!: number;

  @Column({ name: 'average_achievement', type: 'decimal', precision: 5, scale: 2 })
  averageAchievement!: number;

  @Column({ name: 'total_score', type: 'decimal', precision: 10, scale: 4 })
  totalScore!: number;

  @Column({ type: 'enum', enum: PerformanceRating })
  overallRating!: PerformanceRating;

  // Breakdown by category
  @Column({ name: 'business_score', type: 'decimal', precision: 10, scale: 4, nullable: true })
  businessScore?: number | null;

  @Column({ name: 'main_tasks_score', type: 'decimal', precision: 10, scale: 4, nullable: true })
  mainTasksScore?: number | null;

  @Column({ name: 'projects_score', type: 'decimal', precision: 10, scale: 4, nullable: true })
  projectsScore?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
