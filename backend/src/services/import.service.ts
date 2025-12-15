import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Workbook } from 'exceljs';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { UserImportLog, ImportStatus } from '../entities/userImportLog.entity';
import { ApprovalChain } from '../entities/approvalChain.entity';
import { UsersService } from './users.service';
import { BulkImportResponseDto, PersianEmployeeImportDto, ImportSummaryDto } from '../dto/import.dto';

/**
 * Import service for Persian organizational structure from Excel
 * Handles 5 sheets: Group, ایرانیان, خراسان, خوزستان, تخته فشرده
 * 
 * Column structure:
 * - کد_پرسنلی: Employee ID (unique identifier)
 * - نام_و_نام_خانوادگی: Employee full name
 * - کد_پرسنلی_مدیر_مستقیم: Manager's personnel code
 * - مدیر_مستقیم: Manager's full name (for reference)
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly SHEETS = ['Group', 'ایرانیان', 'خراسان', 'خوزستان', 'تخته فشرده'];

  // Map for looking up employees by personnel code across all sheets
  // Key: کد_پرسنلی (Personnel Code), Value: employee data
  private employeeMap: Map<string, { name: string; email: string; userId: string; branch: string }> = new Map();

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(UserImportLog)
    private importLogsRepo: Repository<UserImportLog>,
    @InjectRepository(ApprovalChain)
    private approvalChainsRepo: Repository<ApprovalChain>,
    private usersService: UsersService,
  ) {}

  /**
   * Main entry point: import all sheets from Excel file
   */
  async importFromExcel(buffer: Buffer, userId: string): Promise<BulkImportResponseDto> {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);

    const result: BulkImportResponseDto = {
      total: 0,
      successful: 0,
      failed: 0,
      hierarchyLinksCreated: 0,
      errors: [],
      createdUsers: [],
      approvalChains: [],
    };

    // First pass: collect all employees and build employee map by personnel code
    this.employeeMap.clear();
    for (const sheetName of this.SHEETS) {
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) continue;

      await this.buildEmployeeMap(worksheet, sheetName);
    }

    // Second pass: create users and approval chains
    for (const sheetName of this.SHEETS) {
      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) continue;

      const sheetResult = await this.importSheet(worksheet, sheetName, userId);
      result.total += sheetResult.total;
      result.successful += sheetResult.successful;
      result.failed += sheetResult.failed;
      result.hierarchyLinksCreated += sheetResult.hierarchyLinksCreated;
      result.errors.push(...sheetResult.errors);
      result.createdUsers.push(...sheetResult.createdUsers);
      result.approvalChains.push(...sheetResult.approvalChains);
    }

    return result;
  }

  /**
   * Build a map of all employees indexed by their personnel code (کد_پرسنلی)
   * This enables fast lookup when creating approval chains
   */
  private async buildEmployeeMap(
    worksheet: any,
    sheetName: string,
  ): Promise<void> {
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as string[];

    const colMap = this.buildColumnMap(headers);
    if (!colMap['کد_پرسنلی'] || !colMap['نام_و_نام_خانوادگی']) return;

    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const values = row.values as any[];

      const employeeId = values[colMap['کد_پرسنلی']]?.toString()?.trim();
      const employeeName = values[colMap['نام_و_نام_خانوادگی']]?.toString()?.trim();

      if (employeeId && employeeName) {
        // Map by personnel code for lookups during manager chain creation
        this.employeeMap.set(employeeId, {
          name: employeeName,
          email: this.generateEmail(employeeName),
          userId: '',
          branch: sheetName,
        });
      }
    }
  }

  /**
   * Import single sheet: create users and approval chains
   */
  private async importSheet(
    worksheet: any,
    sheetName: string,
    userId: string,
  ): Promise<BulkImportResponseDto> {

    const headerRow = worksheet.getRow(1);
    // ExcelJS headerRow.values is 1-based, so first element may be null
    let headers = headerRow.values as string[];
    if (headers[0] === null || headers[0] === undefined) {
      headers = headers.slice(1);
    }
    this.logger.debug(`Headers for sheet ${sheetName}:`, headers);

    const colMap = this.buildColumnMap(headers);
    this.logger.debug(`Column map for sheet ${sheetName}:`, colMap);

    if (!colMap['کد_پرسنلی'] || !colMap['نام_و_نام_خانوادگی']) {
      this.logger.warn(`Sheet ${sheetName} missing required columns`);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        hierarchyLinksCreated: 0,
        errors: [],
        createdUsers: [],
        approvalChains: [],
      };
    }

    const result: BulkImportResponseDto = {
      total: 0,
      successful: 0,
      failed: 0,
      hierarchyLinksCreated: 0,
      errors: [],
      createdUsers: [],
      approvalChains: [],
    };

    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      try {
        const row = worksheet.getRow(rowNum);
        const values = row.values as any[];
        this.logger.debug(`Row ${rowNum} values:`, values);

        result.total++;

        const employeeData = this.parseRow(values, colMap, sheetName);
        if (!employeeData.کد_پرسنلی || !employeeData.نام_و_نام_خانوادگی) {
          this.logger.warn(`Row ${rowNum} missing required fields: کد_پرسنلی or نام_و_نام_خانوادگی`);
          throw new Error('Missing required fields: کد_پرسنلی or نام_و_نام_خانوادگی');
        }

        // Create user
        const createdUser = await this.createOrUpdateUser(employeeData, sheetName);

        // Update employee map with userId for this user
        if (this.employeeMap.has(employeeData.کد_پرسنلی)) {
          const entry = this.employeeMap.get(employeeData.کد_پرسنلی)!;
          entry.userId = createdUser.id;
        }

        result.successful++;
        result.createdUsers.push({
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          employeeId: employeeData.کد_پرسنلی,
          fullName: employeeData.نام_و_نام_خانوادگی,
          branch: sheetName,
          role: createdUser.role,
        });

        // Create approval chain
        const chainResult = await this.createApprovalChain(
          employeeData,
          createdUser.id,
          sheetName,
        );
        result.hierarchyLinksCreated += chainResult.linksCreated;
        result.approvalChains.push(chainResult.chain);
      } catch (error) {
        result.failed++;
        const values = worksheet.getRow(rowNum).values as any[];
        this.logger.error(`Error processing row ${rowNum}: ${(error as any).message}`);
        result.errors.push({
          row: rowNum,
          employeeId: values[colMap['کد_پرسنلی']]?.toString() || 'unknown',
          name: values[colMap['نام_و_نام_خانوادگی']]?.toString() || 'unknown',
          error: (error as any).message || 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Create or update user from employee data
   */
  private async createOrUpdateUser(
    data: PersianEmployeeImportDto,
    sheetName: string,
  ): Promise<User> {
    // Use کد_پرسنلی (personnel code) as the unique username
    const existingUser = await this.usersRepo.findOne({
      where: {
        username: data.کد_پرسنلی,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    const password = data.کد_پرسنلی;
    const userResult = await this.usersService.create({
      username: data.کد_پرسنلی,
      email: this.generateEmail(data.نام_و_نام_خانوادگی),
      password,
      role: this.determineRole(data.رده, sheetName),
      mustChangePassword: true,
    });

    const user = Array.isArray(userResult) ? userResult[0] : userResult;

    // Log import
    await this.importLogsRepo.save({
      username: data.کد_پرسنلی,
      email: user.email,
      role: user.role,
      status: ImportStatus.SUCCESS,
      notes: `Imported from ${sheetName} - ${data.نام_و_نام_خانوادگی}`,
      userId: 'system',
      createdUser: user,
    });

    return user;
  }

  /**
   * Create approval chain based on manager hierarchy
   * Manager code columns (کد_پرسنلی_مدیر_مستقیم X) contain the manager's personnel code
   * Manager name columns are for reference/validation only
   */
  private async createApprovalChain(
    data: PersianEmployeeImportDto,
    userId: string,
    sheetName: string,
  ): Promise<{ chain: any; linksCreated: number }> {
    let linksCreated = 0;
    const managerChain: any[] = [];

    for (let level = 1; level <= 5; level++) {
      // Get manager code (e.g., مدیر_مستقیم, مدیر_مستقیم۲, etc.)
      const managerCodeKey: keyof PersianEmployeeImportDto =
        level === 1
          ? ('مدیر_مستقیم' as keyof PersianEmployeeImportDto)
          : (`مدیر_مستقیم${level}` as keyof PersianEmployeeImportDto);

      const managerId = (data[managerCodeKey] as string | undefined)?.toString()?.trim();

      // If no manager code, stop processing higher levels
      if (!managerId) break;

      // Look up manager by personnel code from the employee map
      const managerEntry = this.employeeMap.get(managerId);
      
      // Use manager name from map if found, otherwise try to get from data
      const managerNameKey: keyof PersianEmployeeImportDto =
        level === 1
          ? ('مدیر_مستقیم_نام' as keyof PersianEmployeeImportDto)
          : (`مدیر_مستقیم${level}_نام` as keyof PersianEmployeeImportDto);
      
      const managerNameFromData = (data[managerNameKey] as string | undefined)?.toString()?.trim();
      const resolvedManagerName = managerEntry?.name || managerNameFromData || managerId;

      // Save approval chain record
      await this.approvalChainsRepo.save({
        employeeId: data.کد_پرسنلی,
        employeeName: data.نام_و_نام_خانوادگی,
        department: data.معاونت,
        sequenceLevel: level,
        managerId,
        managerName: resolvedManagerName,
        managerUser: managerEntry?.userId ? { id: managerEntry.userId } : null,
        branch: sheetName,
      });

      managerChain.push({
        level,
        managerId,
        managerName: resolvedManagerName,
      });

      linksCreated++;
    }

    return {
      chain: {
        employeeId: data.کد_پرسنلی,
        managerChain,
      },
      linksCreated,
    };
  }

  /**
   * Parse Excel row to PersianEmployeeImportDto
   * Extracts both manager codes (کد_پرسنلی_مدیر_مستقیم) and names (مدیر_مستقیم)
   */
  private parseRow(
    values: any[],
    colMap: Record<string, number>,
    sheetName: string,
  ): PersianEmployeeImportDto {
    const fullName = values[colMap['نام_و_نام_خانوادگی']]?.toString()?.trim() || '';
    const data: PersianEmployeeImportDto = {
      کد_پرسنلی: values[colMap['کد_پرسنلی']]?.toString()?.trim() || '',
      نام_و_نام_خانوادگی: fullName,
      معاونت: values[colMap['معاونت']]?.toString()?.trim(),
      مدیریت: values[colMap['مدیریت']]?.toString()?.trim(),
      بخش: values[colMap['بخش']]?.toString()?.trim(),
      گروه: values[colMap['گروه']]?.toString()?.trim(),
      رده: values[colMap['رده']]?.toString()?.trim(),
      branch: sheetName,
      email: this.generateEmail(fullName),
      password: this.generateTemporaryPassword(),
    };

    // Extract manager codes and names for each hierarchy level
    for (let level = 1; level <= 5; level++) {
      // Manager code column (e.g., کد_پرسنلی_مدیر_مستقیم, کد_پرسنلی_مدیر_مستقیم۲, etc.)
      const codeColKey: string =
        level === 1 ? 'کد_پرسنلی_مدیر_مستقیم' : `کد_پرسنلی_مدیر_مستقیم${level}`;
      
      // Manager name column (e.g., مدیر_مستقیم, مدیر_مستقیم۲, etc.)
      const nameColKey: string =
        level === 1 ? 'مدیر_مستقیم' : `مدیر_مستقیم${level}`;

      const codeColIndex = colMap[codeColKey];
      const nameColIndex = colMap[nameColKey];

      // Extract manager code
      if (codeColIndex) {
        const codeFieldKey: keyof PersianEmployeeImportDto =
          level === 1 
            ? 'مدیر_مستقیم' 
            : (`مدیر_مستقیم${level}` as keyof PersianEmployeeImportDto);
        (data as any)[codeFieldKey] = values[codeColIndex]?.toString()?.trim();
      }

      // Extract manager name for reference
      if (nameColIndex) {
        const nameFieldKey: keyof PersianEmployeeImportDto =
          level === 1 
            ? 'مدیر_مستقیم_نام' 
            : (`مدیر_مستقیم${level}_نام` as keyof PersianEmployeeImportDto);
        (data as any)[nameFieldKey] = values[nameColIndex]?.toString()?.trim();
      }
    }

    return data;
  }

  /**
   * Build column map from header row
   * Maps Persian column names to their indices in the Excel sheet
   * Matches exact headers as they appear in the file
   */
  private buildColumnMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};

    // Create a map of normalized headers for fast lookup
    const normalizedHeaders: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      if (headers[i]) {
        const normalized = headers[i].toString().trim();
        normalizedHeaders[normalized] = i + 1;
      }
    }

    // List of column names as they appear in the Excel file (with spaces, not underscores)
    const columnNames = [
      'کد پرسنلی',
      'نام و نام خانوادگی',
      'معاونت',
      'مدیریت',
      'بخش',
      'گروه',
      'رده',
      'عنوان شغلی',
      // Manager code columns
      'کد پرسنلی مدیر مستقیم',
      'کد پرسنلی مدیر مستقیم2',
      'کد پرسنلی مدیر مستقیم3',
      'کد پرسنلی مدیر مستقیم4',
      'کد پرسنلی مدیر مستقیم5',
      // Also try with Persian numerals
      'کد پرسنلی مدیر مستقیم۲',
      'کد پرسنلی مدیر مستقیم۳',
      'کد پرسنلی مدیر مستقیم۴',
      'کد پرسنلی مدیر مستقیم۵',
      // Manager name columns
      'مدیر مستقیم',
      'مدیر مستقیم2',
      'مدیر مستقیم3',
      'مدیر مستقیم4',
      'مدیر مستقیم5',
      // Also try with Persian numerals
      'مدیر مستقیم۲',
      'مدیر مستقیم۳',
      'مدیر مستقیم۴',
      'مدیر مستقیم۵',
    ];

    // Map internal keys to potential Excel column names
    const keyToColumns: Record<string, string[]> = {
      'کد_پرسنلی': ['کد پرسنلی'],
      'نام_و_نام_خانوادگی': ['نام و نام خانوادگی'],
      'معاونت': ['معاونت'],
      'مدیریت': ['مدیریت'],
      'بخش': ['بخش'],
      'گروه': ['گروه'],
      'رده': ['رده'],
      'عنوان_شغلی': ['عنوان شغلی'],
      'کد_پرسنلی_مدیر_مستقیم': ['کد پرسنلی مدیر مستقیم', 'کد پرسنلی مدیر مستقیم۱'],
      'کد_پرسنلی_مدیر_مستقیم۲': ['کد پرسنلی مدیر مستقیم2', 'کد پرسنلی مدیر مستقیم۲'],
      'کد_پرسنلی_مدیر_مستقیم۳': ['کد پرسنلی مدیر مستقیم3', 'کد پرسنلی مدیر مستقیم۳'],
      'کد_پرسنلی_مدیر_مستقیم۴': ['کد پرسنلی مدیر مستقیم4', 'کد پرسنلی مدیر مستقیم۴'],
      'کد_پرسنلی_مدیر_مستقیم۵': ['کد پرسنلی مدیر مستقیم5', 'کد پرسنلی مدیر مستقیم۵'],
      'مدیر_مستقیم': ['مدیر مستقیم', 'مدیر مستقیم۱'],
      'مدیر_مستقیم۲': ['مدیر مستقیم2', 'مدیر مستقیم۲'],
      'مدیر_مستقیم۳': ['مدیر مستقیم3', 'مدیر مستقیم۳'],
      'مدیر_مستقیم۴': ['مدیر مستقیم4', 'مدیر مستقیم۴'],
      'مدیر_مستقیم۵': ['مدیر مستقیم5', 'مدیر مستقیم۵'],
    };

    // Try to find each key in the headers
    for (const [key, possibleColumns] of Object.entries(keyToColumns)) {
      for (const colName of possibleColumns) {
        if (normalizedHeaders[colName]) {
          map[key] = normalizedHeaders[colName];
          break;
        }
      }
    }

    return map;
  }

  /**
   * Generate email from full name
   */
  private generateEmail(fullName: string): string {
    if (!fullName) return `user-${Date.now()}@company.local`;

    const parts = fullName.trim().split(' ');
    const username = parts.join('.').toLowerCase();
    return `${username}@company.local`;
  }

  /**
   * Determine user role based on job level (رده)
   */
  private determineRole(jobLevel: string | undefined, sheetName: string): UserRole {
    if (!jobLevel) return UserRole.EMPLOYEE;

    const level = jobLevel.toLowerCase();

    // Check for management titles
    if (level.includes('مدیر')) return UserRole.APPROVER;
    if (level.includes('معاون')) return UserRole.MODERATOR;
    if (level.includes('رئیس')) return UserRole.APPROVER;
    if (level.includes('سرپرست')) return UserRole.MODERATOR;
    if (level.includes('کارشناس')) return UserRole.MODERATOR;
    if (level.includes('کارمند')) return UserRole.EMPLOYEE;
    if (level.includes('ادمین')) return UserRole.PLANT_ADMIN;

    return UserRole.EMPLOYEE;
  }

  /**
   * Generate temporary password for newly imported users
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Get approval chain for an employee
   */
  async getApprovalChain(employeeId: string): Promise<ApprovalChain[]> {
    return this.approvalChainsRepo.find({
      where: { employeeId },
      order: { sequenceLevel: 'ASC' },
      relations: ['managerUser'],
    });
  }

  /**
   * Get all employees in a specific branch
   */
  async getEmployeesByBranch(branch: string): Promise<ApprovalChain[]> {
    return this.approvalChainsRepo.find({
      where: { branch },
      relations: ['managerUser'],
    });
  }

  /**
   * Get unique departments from approval chains with employee counts
   * Returns [{ department, employees }]
   */
  async getDepartmentsSummary(): Promise<Array<{ department: string; employees: number }>> {
    const rows = await this.approvalChainsRepo.find({
      select: ['department', 'employeeId'],
    });
    const deptEmployees = new Map<string, Set<string>>();
    for (const r of rows) {
      const dept = (r.department || '').trim();
      if (!dept) continue;
      if (!deptEmployees.has(dept)) deptEmployees.set(dept, new Set<string>());
      deptEmployees.get(dept)!.add(String(r.employeeId));
    }
    const list = Array.from(deptEmployees.entries()).map(([department, set]) => ({
      department,
      employees: set.size,
    }));
    list.sort((a, b) => a.department.localeCompare(b.department));
    return list;
  }

  /**
   * Get import history for a user
   */
  async getImportHistory(userId: string): Promise<any[]> {
    return this.importLogsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Get import statistics
   */
  async getImportStats(): Promise<any> {
    const totalImports = await this.importLogsRepo.count();
    const successfulImports = await this.importLogsRepo.count({
      where: { status: ImportStatus.SUCCESS },
    });
    const failedImports = await this.importLogsRepo.count({
      where: { status: ImportStatus.FAILED },
    });

    return {
      totalImports,
      successfulImports,
      failedImports,
      successRate: totalImports > 0 ? ((successfulImports / totalImports) * 100).toFixed(2) + '%' : '0%',
    };
  }
}
