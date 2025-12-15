import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class ImportUserDto {
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/**
 * Persian organizational structure import DTO
 * Represents data from Excel sheets: Group, ایرانیان, خراسان, خوزستان, تخته فشرده
 */
export class PersianEmployeeImportDto {
  کد_پرسنلی!: string; // Employee ID
  نام_و_نام_خانوادگی!: string; // Full name
  معاونت?: string; // Department
  مدیریت?: string; // Sub-department/Management
  بخش?: string; // Section
  گروه?: string; // Group
  رده?: string; // Job level
  مدیر_مستقیم?: string; // Manager 1 ID
  مدیر_مستقیم_نام?: string; // Manager 1 name (optional, can be looked up)
  مدیر_مستقیم۲?: string; // Manager 2 ID
  مدیر_مستقیم۲_نام?: string; // Manager 2 name
  مدیر_مستقیم۳?: string; // Manager 3 ID
  مدیر_مستقیم۳_نام?: string; // Manager 3 name
  مدیر_مستقیم۴?: string; // Manager 4 ID
  مدیر_مستقیم۴_نام?: string; // Manager 4 name
  مدیر_مستقیم۵?: string; // Manager 5 ID (for تخته فشرده)
  مدیر_مستقیم۵_نام?: string; // Manager 5 name
  branch?: string; // Sheet name: 'Group', 'ایرانیان', 'خراسان', 'خوزستان', 'تخته فشرده'
  email?: string; // Generated or provided
  password?: string; // Generated temporarily
}

export class BulkImportResponseDto {
  total: number = 0;
  successful: number = 0;
  failed: number = 0;
  hierarchyLinksCreated: number = 0;
  errors: Array<{
    row: number;
    employeeId: string;
    name: string;
    error: string;
  }> = [];
  createdUsers: Array<{
    id: string;
    username: string;
    email: string;
    employeeId: string;
    fullName: string;
    branch: string;
    role: UserRole;
  }> = [];
  approvalChains: Array<{
    employeeId: string;
    managerChain: Array<{
      level: number;
      managerId: string;
      managerName: string;
    }>;
  }> = [];
}

export class ImportSummaryDto {
  sheetName: string = '';
  totalRows: number = 0;
  successfulImports: number = 0;
  failedImports: number = 0;
  hierarchyErrors: number = 0;
}
