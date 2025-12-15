import { KPICategory, KPIType, KPIStatus, PerformanceRating } from '../entities/kpi.entity';
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO for Excel import - matches the IRNQ2 sheet structure
 */
export class KPIExcelImportDto {
  rowNumber!: number; // ردیف
  companyName!: string; // نام شرکت
  quarter!: string; // فصل
  fiscalYear!: number; // Inferred from context (1404)
  employeeCode!: string; // کد پرسنلی
  employeeName!: string; // نام و نام خانوادگی
  jobTitle!: string; // عنوان شغلی
  managerCode!: string; // کد پرسنلی مدیر مستقیم
  managerName!: string; // مدیر مستقیم
  department!: string; // دپارتمان
  categoryEn!: string; // Category (Business, MainTasks, Projects)
  categoryFa!: string; // دسته بندی
  objectiveWeight!: number; // obj weight
  kpiNameEn!: string; // KPI En
  kpiNameFa!: string; // KPI Fa
  kpiDescription!: string; // kpi INFO
  targetValue!: number | string; // target
  kpiWeight!: number; // KPI weight
  achievementValue!: number | string; // KPI Achievement
  type!: string; // type (+, -)
  comments!: string; // توضیحات
}

/**
 * DTO for creating/updating a KPI
 */
export class CreateKPIDto {
  @Transform(({ value, obj }) => value ?? obj.company_name)
  @IsString()
  companyName!: string;

  @IsString()
  quarter!: string;

  @Transform(({ value, obj }) => value ?? obj.fiscal_year)
  @Type(() => Number)
  @IsNumber()
  fiscalYear!: number;

  @Transform(({ value, obj }) => value ?? obj.employee_id)
  @IsString()
  employeeId!: string;

  @Transform(({ value, obj }) => value ?? obj.manager_id)
  @IsOptional()
  @IsString()
  managerId?: string | null;

  @IsString()
  department!: string;

  @Transform(({ value, obj }) => value ?? obj.job_title)
  @IsOptional()
  @IsString()
  jobTitle?: string | null;

  @IsEnum(KPICategory)
  category!: KPICategory;

  @Transform(({ value, obj }) => value ?? obj.kpi_name_en ?? obj.kpi_name)
  @IsString()
  kpiNameEn!: string;

  @Transform(({ value, obj }) => value ?? obj.kpi_name_fa)
  @IsOptional()
  @IsString()
  kpiNameFa?: string | null;

  @Transform(({ value, obj }) => value ?? obj.kpi_description ?? obj.kpi_info)
  @IsOptional()
  @IsString()
  kpiDescription?: string | null;

  @Transform(({ value, obj }) => value ?? obj.object_weight ?? obj.obj_weight)
  @Type(() => Number)
  @IsNumber()
  objectiveWeight!: number;

  @Transform(({ value, obj }) => value ?? obj.kpi_weight)
  @Type(() => Number)
  @IsNumber()
  kpiWeight!: number;

  @Transform(({ value, obj }) => value ?? obj.target_value ?? obj.target)
  @Type(() => Number)
  @IsOptional()
  targetValue?: number | null;

  @Transform(({ value, obj }) => value ?? obj.achievement_value)
  @Type(() => Number)
  @IsOptional()
  achievementValue?: number | null;

  @Transform(({ value, obj }) => value ?? obj.type ?? obj.entry_type)
  @IsEnum(KPIType)
  type!: KPIType;

  @IsOptional()
  @IsString()
  comments?: string | null;
}

/**
 * DTO for updating KPI achievement and calculation
 */
export class UpdateKPIAchievementDto {
  achievementValue!: number;
  comments?: string | null;
}

export class UpdateKPIPercentageDto {
  percentageAchievement!: number;
}

/**
 * DTO for KPI approval
 */
export class ApproveKPIDto {
  approved!: boolean;
  notes?: string | null;
  rejectionReason?: string | null; // If approved = false
}

/**
 * DTO for KPI submission to manager
 */
export class SubmitKPIDto {
  notes?: string | null;
}

/**
 * Response DTO for KPI with calculated values
 */
export class KPIResponseDto {
  id!: string;
  companyName!: string;
  quarter!: string;
  fiscalYear!: number;
  employeeId!: string;
  employeeName!: string;
  jobTitle?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  department!: string;
  category!: KPICategory;
  kpiNameEn!: string;
  kpiNameFa?: string | null;
  kpiDescription?: string | null;
  objectiveWeight!: number;
  kpiWeight!: number;
  targetValue?: number | null;
  achievementValue?: number | null;
  type!: KPIType;
  percentageAchievement?: number | null;
  scoreAchievement?: number | null;
  performanceRating?: PerformanceRating | null;
  status!: KPIStatus;
  comments?: string | null;
  approvedAt?: Date | null;
  approvalNotes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * DTO for KPI period summary
 */
export class KPIPeriodSummaryDto {
  id!: string;
  employeeId!: string;
  employeeName!: string;
  quarter!: string;
  fiscalYear!: number;
  department!: string;
  totalKpis!: number;
  completedKpis!: number;
  averageAchievement!: number;
  totalScore!: number;
  overallRating!: PerformanceRating;
  businessScore?: number | null;
  mainTasksScore?: number | null;
  projectsScore?: number | null;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Bulk import response
 */
export class KPIBulkImportResponseDto {
  total!: number;
  successful!: number;
  failed!: number;
  errors!: Array<{
    row: number;
    employeeCode: string;
    employeeName: string;
    error: string;
  }>;
  createdKpis!: Array<{
    id: string;
    employeeCode: string;
    employeeName: string;
    kpiNameEn: string;
    category: KPICategory;
  }>;
  summary!: {
    totalByCategory: Record<KPICategory, number>;
    totalByDepartment: Record<string, number>;
  };
}

/**
 * KPI Calculation Input/Output
 */
export class KPICalculationDto {
  targetValue!: number;
  achievementValue!: number;
  type!: KPIType; // '+' or '-'
  objectiveWeight!: number;
  kpiWeight!: number;
}

/**
 * KPI Calculation Result
 */
export class KPICalculationResultDto {
  percentageAchievement!: number; // Decimal (0.86 = 86%)
  scoreAchievement!: number;
  performanceRating!: PerformanceRating;
  breakdown!: {
    isAchievementEmpty: boolean;
    isTargetEmpty: boolean;
    calculatedPercentage: number;
    appliedRuleSet: 'RED' | 'YELLOW' | 'GREEN' | 'BONUS';
    scoreValue: number;
  };
}

/**
 * Department Performance Report
 */
export class DepartmentPerformanceDto {
  department!: string;
  quarter!: string;
  fiscalYear!: number;
  employeeCount!: number;
  totalKpis!: number;
  averageAchievement!: number;
  topPerformer?: {
    employeeName: string;
    score: number;
    rating: PerformanceRating;
  };
  ratingDistribution!: {
    red: number;
    yellow: number;
    green: number;
  };
  categoryAverages!: Record<KPICategory, number>;
}

/**
 * Employee Performance Dashboard
 */
export class EmployeePerformanceDashboardDto {
  employeeId!: string;
  employeeName!: string;
  department!: string;
  currentQuarter!: string;
  currentFiscalYear!: number;
  overallScore!: number;
  overallRating!: PerformanceRating;
  kpiSummary!: {
    total: number;
    completed: number;
    pending: number;
    approved: number;
  };
  scoreByCategory!: Record<KPICategory, {
    count: number;
    average: number;
    rating: PerformanceRating;
  }>;
  recentKpis!: KPIResponseDto[];
  performanceTrend!: Array<{
    quarter: string;
    fiscalYear: number;
    score: number;
    rating: PerformanceRating;
  }>;
}
