import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Workbook } from "exceljs";
import {
  KPIDefinition,
  KPICategory,
  KPIStatus,
  KPIPeriodSummary,
  PerformanceRating,
} from "../entities/kpi.entity";
import { User } from "../entities/user.entity";
import {
  KPIExcelImportDto,
  KPIBulkImportResponseDto,
  CreateKPIDto,
} from "../dto/kpi.dto";
import { KPICalculationEngine } from "./kpi-calculation.engine";

@Injectable()
export class KPIImportService {
  private readonly logger = new Logger(KPIImportService.name);
  private readonly KPI_SHEET_NAME = "IRNQ2";

  constructor(
    @InjectRepository(KPIDefinition)
    private kpiRepo: Repository<KPIDefinition>,
    @InjectRepository(KPIPeriodSummary)
    private periodSummaryRepo: Repository<KPIPeriodSummary>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private calculationEngine: KPICalculationEngine
  ) {}

  /**
   * Main entry point: import KPIs from Excel file
   */
  async importFromExcel(
    buffer: Buffer,
    userId: string
  ): Promise<KPIBulkImportResponseDto> {
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet(this.KPI_SHEET_NAME);
    if (!worksheet) {
      throw new BadRequestException(
        `Sheet "${
          this.KPI_SHEET_NAME
        }" not found in Excel file. Available sheets: ${workbook.worksheets
          .map((ws) => ws.name)
          .join(", ")}`
      );
    }

    this.logger.log(`Starting KPI import from sheet: ${this.KPI_SHEET_NAME}`);

    const result: KPIBulkImportResponseDto = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      createdKpis: [],
      summary: {
        totalByCategory: {
          [KPICategory.BUSINESS]: 0,
          [KPICategory.MAIN_TASKS]: 0,
          [KPICategory.PROJECTS]: 0,
        },
        totalByDepartment: {},
      },
    };

    // Get header row
    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as string[];
    const colMap = this.buildColumnMap(headers);

    this.logger.debug(`Column mapping: ${JSON.stringify(colMap)}`);

    // Extract fiscal year from data (usually in first data row or context)
    const fiscalYear = 1404; // Default for Iranian fiscal year

    // Process each data row
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const values = row.values as any[];

      // Skip empty rows
      if (!values || values.filter((v) => v).length === 0) {
        continue;
      }

      result.total++;

      try {
        const kpiData = this.parseRow(values, colMap, fiscalYear);
        const createdKpi = await this.createOrUpdateKPI(kpiData, userId);

        result.successful++;
        result.createdKpis.push({
          id: createdKpi.id,
          employeeCode: kpiData.employeeCode,
          employeeName: kpiData.employeeName,
          kpiNameEn: kpiData.kpiNameEn,
          category: this.mapCategoryStringToEnum(kpiData.categoryEn),
        });

        // Log the KPI creation with user linkage
        this.logger.debug(
          `KPI created: ${kpiData.employeeCode} - ${kpiData.kpiNameEn} (ID: ${createdKpi.id})`
        );

        // Update summary
        const categoryEnum = this.mapCategoryStringToEnum(kpiData.categoryEn);
        result.summary.totalByCategory[categoryEnum]++;

        if (!result.summary.totalByDepartment[kpiData.department]) {
          result.summary.totalByDepartment[kpiData.department] = 0;
        }
        result.summary.totalByDepartment[kpiData.department]++;
      } catch (error) {
        result.failed++;
        const employeeCode =
          values[colMap["employeeCode"]]?.toString() || "unknown";
        const employeeName =
          values[colMap["employeeName"]]?.toString() || "unknown";
        const errorMsg = (error as any).message || "Unknown error";

        // For MVP: Skip certain rows gracefully without reporting errors
        if (
          errorMsg.includes("not found") ||
          errorMsg.includes("Skipping:") ||
          errorMsg.includes("Missing required field: kpiNameEn")
        ) {
          this.logger.warn(`Row ${rowNum}: ${errorMsg}`);
          // Don't add to errors array - silently skip
        } else {
          // Log other errors for debugging
          result.errors.push({
            row: rowNum,
            employeeCode,
            employeeName,
            error: errorMsg,
          });
          this.logger.error(`Error processing row ${rowNum}: ${errorMsg}`);
        }
      }
    }

    this.logger.log(
      `KPI import completed: ${result.successful} successful, ${result.failed} failed out of ${result.total}`
    );

    // Verify linkages after import
    await this.verifyUserKpiLinkages(result);

    return result;
  }

  /**
   * Verify that all imported KPIs are properly linked to users
   */
  private async verifyUserKpiLinkages(
    result: KPIBulkImportResponseDto
  ): Promise<void> {
    const kpiCount = result.createdKpis.length;
    if (kpiCount === 0) return;

    // Get all created KPIs with their employee relations
    const kpis = await this.kpiRepo.find({
      relations: ["employee", "manager"],
      take: kpiCount,
    });

    let linkedCount = 0;
    let unlinkedCount = 0;

    for (const kpi of kpis) {
      if (kpi.employee && kpi.employeeId) {
        linkedCount++;
        this.logger.debug(
          `✓ KPI linked: ${kpi.kpiNameEn} → Employee: ${kpi.employee.username} (${kpi.employee.email})`
        );
      } else {
        unlinkedCount++;
        this.logger.warn(
          `✗ KPI NOT linked: ${kpi.kpiNameEn} (Employee ID: ${kpi.employeeId})`
        );
      }
    }

    this.logger.log(
      `User-KPI Linkage Verification: ${linkedCount} linked, ${unlinkedCount} unlinked out of ${kpiCount} KPIs`
    );

    if (unlinkedCount > 0) {
      this.logger.warn(
        `⚠️  WARNING: ${unlinkedCount} KPI(s) could not be linked to users. Check if users were created before KPI import.`
      );
    }
  }

  /**
   * Parse Excel row to KPI data with proper UTF-8 encoding for Persian text
   */
  private parseRow(
    values: any[],
    colMap: Record<string, number>,
    fiscalYear: number
  ): KPIExcelImportDto {
    // Helper to safely extract and normalize string values
    const getString = (index: number): string => {
      const value = values[index];
      if (!value) return "";
      let str = value.toString().trim();
      // Normalize whitespace and handle encoding
      str = str.replace(/\s+/g, " ");
      return str;
    };

    const data: KPIExcelImportDto = {
      rowNumber: values[colMap["rowNumber"]] || 0,
      companyName: getString(colMap["companyName"]),
      quarter: getString(colMap["quarter"]),
      fiscalYear,
      employeeCode: getString(colMap["employeeCode"]),
      employeeName: getString(colMap["employeeName"]),
      jobTitle: getString(colMap["jobTitle"]),
      managerCode: getString(colMap["managerCode"]),
      managerName: getString(colMap["managerName"]),
      department: getString(colMap["department"]),
      categoryEn: getString(colMap["categoryEn"]),
      categoryFa: getString(colMap["categoryFa"]),
      objectiveWeight: this.parseNumber(values[colMap["objectiveWeight"]]),
      kpiNameEn: getString(colMap["kpiNameEn"]),
      kpiNameFa: getString(colMap["kpiNameFa"]),
      kpiDescription: getString(colMap["kpiDescription"]),
      targetValue: this.parseNumber(values[colMap["targetValue"]]),
      kpiWeight: this.parseNumber(values[colMap["kpiWeight"]]),
      achievementValue: this.parseNumber(values[colMap["achievementValue"]]),
      type: getString(colMap["type"]) || "+",
      comments: getString(colMap["comments"]),
    };

    // Validate required fields
    if (!data.employeeCode || !data.employeeName) {
      throw new BadRequestException(
        `Missing required fields: employeeCode (${data.employeeCode}) or employeeName (${data.employeeName})`
      );
    }

    // For MVP: Skip rows with missing kpiNameEn silently
    if (!data.kpiNameEn) {
      throw new BadRequestException(
        "Skipping: Missing required field kpiNameEn"
      );
    }

    return data;
  }

  /**
   * Create or update KPI from import data
   * Links KPI to user by matching personnel code (which is used as username in user import)
   */
  private async createOrUpdateKPI(
    importData: KPIExcelImportDto,
    createdBy: string
  ): Promise<KPIDefinition> {
    // Find employee by personnel code (کد_پرسنلی)
    // This is the unique identifier used consistently in both user import and KPI import
    let employee = await this.usersRepo.findOne({
      where: { username: importData.employeeCode },
    });

    if (!employee) {
      // Try alternative lookup strategies for whitespace variations in personnel code
      // Some Excel/Unicode quirks cause space characters to be inconsistent
      const codeVariations = [
        importData.employeeCode.replace(/\s+/g, " ").trim(), // Normalize to single spaces
        importData.employeeCode.replace(/\s+/g, "").trim(), // Remove all internal spaces
      ];

      for (const variant of codeVariations) {
        if (variant === importData.employeeCode) continue; // Skip if same as original

        employee = await this.usersRepo.findOne({
          where: { username: variant },
        });

        if (employee) {
          this.logger.debug(
            `Employee code matched using variant: "${importData.employeeCode}" → "${variant}"`
          );
          break;
        }
      }

      if (!employee) {
        throw new NotFoundException(
          `Employee with personnel code ${importData.employeeCode} (${importData.employeeName}) not found. ` +
            `Please run employee import first to create user accounts.`
        );
      }
    }

    this.logger.debug(
      `Linking KPI to employee: ${importData.employeeCode} (${importData.employeeName}) → User ID: ${employee.id}`
    );

    // Find manager if manager personnel code exists
    let manager: User | null = null;
    if (importData.managerCode) {
      manager = await this.usersRepo.findOne({
        where: { username: importData.managerCode },
      });

      if (!manager) {
        // Try alternative lookup strategies for whitespace variations in manager code
        const managerCodeVariations = [
          importData.managerCode.replace(/\s+/g, " ").trim(), // Normalize to single spaces
          importData.managerCode.replace(/\s+/g, "").trim(), // Remove all internal spaces
        ];

        for (const variant of managerCodeVariations) {
          if (variant === importData.managerCode) continue; // Skip if same as original

          manager = await this.usersRepo.findOne({
            where: { username: variant },
          });

          if (manager) {
            this.logger.debug(
              `Manager code matched using variant: "${importData.managerCode}" → "${variant}"`
            );
            break;
          }
        }

        if (!manager) {
          this.logger.warn(
            `Manager with personnel code ${importData.managerCode} (${importData.managerName}) not found for employee ${importData.employeeCode}`
          );
        }
      }

      if (manager) {
        this.logger.debug(
          `Linking manager: ${importData.managerName} (Code: ${importData.managerCode}) → User ID: ${manager.id}`
        );
      }
    }

    // Check if KPI already exists for this period
    const existingKpi = await this.kpiRepo.findOne({
      where: {
        employeeId: employee.id,
        kpiNameEn: importData.kpiNameEn,
        quarter: importData.quarter,
        fiscalYear: importData.fiscalYear,
      },
    });

    const categoryEnum = this.mapCategoryStringToEnum(importData.categoryEn);

    // Calculate KPI scores
    const calculation = this.calculationEngine.calculateKPI({
      targetValue:
        typeof importData.targetValue === "string"
          ? parseFloat(importData.targetValue)
          : importData.targetValue,
      achievementValue:
        typeof importData.achievementValue === "string"
          ? parseFloat(importData.achievementValue)
          : importData.achievementValue,
      type: importData.type as any,
      objectiveWeight: importData.objectiveWeight,
      kpiWeight: importData.kpiWeight,
    });

    const kpiCreateData: CreateKPIDto = {
      companyName: importData.companyName,
      quarter: importData.quarter,
      fiscalYear: importData.fiscalYear,
      employeeId: employee.id,
      managerId: manager?.id || null,
      department: importData.department,
      jobTitle: importData.jobTitle,
      category: categoryEnum,
      kpiNameEn: importData.kpiNameEn,
      kpiNameFa: importData.kpiNameFa,
      kpiDescription: importData.kpiDescription,
      objectiveWeight: importData.objectiveWeight,
      kpiWeight: importData.kpiWeight,
      targetValue:
        typeof importData.targetValue === "string"
          ? parseFloat(importData.targetValue)
          : importData.targetValue,
      achievementValue:
        typeof importData.achievementValue === "string"
          ? parseFloat(importData.achievementValue)
          : importData.achievementValue,
      type: importData.type as any,
      comments: importData.comments,
    };

    if (existingKpi) {
      // Update existing KPI
      Object.assign(existingKpi, kpiCreateData);
      existingKpi.percentageAchievement = calculation.percentageAchievement;
      existingKpi.scoreAchievement = calculation.scoreAchievement;
      existingKpi.performanceRating = calculation.performanceRating;
      existingKpi.updatedAt = new Date();

      return this.kpiRepo.save(existingKpi);
    } else {
      // Create new KPI
      const kpi = this.kpiRepo.create({
        ...kpiCreateData,
        percentageAchievement: calculation.percentageAchievement,
        scoreAchievement: calculation.scoreAchievement,
        performanceRating: calculation.performanceRating,
        status: KPIStatus.DRAFT,
        createdBy,
      });

      return this.kpiRepo.save(kpi);
    }
  }

  /**
   * Build column map from header row
   */
  private buildColumnMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};

    const normalizedHeaders: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      if (headers[i]) {
        const normalized = headers[i].toString().trim().toLowerCase();
        normalizedHeaders[normalized] = i;
      }
    }

    // Map Excel columns to internal keys
    // Note: Using flexible matching with spaces instead of underscores
    const keyToColumns: Record<string, string[]> = {
      rowNumber: ["ردیف", "row", "row number"],
      companyName: ["نام شرکت", "company name"],
      quarter: ["فصل", "quarter"],
      employeeCode: ["کد پرسنلی", "personnel code", "employee code"],
      employeeName: ["نام و نام خانوادگی", "full name", "name"],
      jobTitle: ["عنوان شغلی", "job title", "title"],
      managerCode: [
        "کد پرسنلی مدیر مستقیم",
        "direct manager personnel code",
        "manager code",
      ],
      managerName: ["مدیر مستقیم", "direct manager", "manager"],
      department: ["دپارتمان", "department"],
      categoryEn: ["category", "category (english)"],
      categoryFa: ["دسته بندی", "category (persian)"],
      objectiveWeight: ["obj weight", "objective weight"],
      kpiNameEn: ["kpi en", "kpi (english)", "kpi"],
      kpiNameFa: ["kpi fa", "kpi (persian)"],
      kpiDescription: ["kpi info", "kpi description"],
      targetValue: ["target", "target value"],
      kpiWeight: ["kpi weight", "weight"],
      achievementValue: ["kpi achievement", "achievement", "achievement value"],
      type: ["type", "kpi type"],
      comments: ["توضیحات", "comments", "notes"],
    };

    for (const [key, possibleColumns] of Object.entries(keyToColumns)) {
      for (const colName of possibleColumns) {
        if (normalizedHeaders[colName.toLowerCase()]) {
          map[key] = normalizedHeaders[colName.toLowerCase()];
          break;
        }
      }
    }

    return map;
  }

  /**
   * Parse number values (handles various formats)
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === "") return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Map category string to enum
   */
  private mapCategoryStringToEnum(category: string): KPICategory {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("business") || cat.includes("کسب و کار")) {
      return KPICategory.BUSINESS;
    }
    if (cat.includes("maintasks") || cat.includes("کارهای اصلی")) {
      return KPICategory.MAIN_TASKS;
    }
    if (cat.includes("projects") || cat.includes("پروژه")) {
      return KPICategory.PROJECTS;
    }
    return KPICategory.MAIN_TASKS; // Default
  }

  /**
   * Get all KPIs for a specific employee (by personnel code/username)
   */
  async getKPIsByEmployeeCode(employeeCode: string): Promise<KPIDefinition[]> {
    const employee = await this.usersRepo.findOne({
      where: { username: employeeCode },
    });

    if (!employee) {
      throw new NotFoundException(
        `Employee with personnel code ${employeeCode} not found`
      );
    }

    return this.kpiRepo.find({
      where: { employeeId: employee.id },
      relations: ["employee", "manager"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get all KPIs for a specific user ID
   */
  async getKPIsByUserId(userId: string): Promise<KPIDefinition[]> {
    return this.kpiRepo.find({
      where: { employeeId: userId },
      relations: ["employee", "manager"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get all KPIs that need approval by a manager (by personnel code)
   */
  async getKPIsPendingApprovalByManager(
    managerCode: string
  ): Promise<KPIDefinition[]> {
    const manager = await this.usersRepo.findOne({
      where: { username: managerCode },
    });

    if (!manager) {
      throw new NotFoundException(
        `Manager with personnel code ${managerCode} not found`
      );
    }

    return this.kpiRepo.find({
      where: { managerId: manager.id, status: KPIStatus.SUBMITTED },
      relations: ["employee", "manager"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Calculate and update period summary after import
   */
  async calculatePeriodSummaries(
    quarter: string,
    fiscalYear: number
  ): Promise<void> {
    const kpis = await this.kpiRepo.find({
      where: { quarter, fiscalYear },
      relations: ["employee", "manager"],
    });

    // Group KPIs by employee
    const byEmployee: Record<string, KPIDefinition[]> = {};
    for (const kpi of kpis) {
      if (!byEmployee[kpi.employeeId]) {
        byEmployee[kpi.employeeId] = [];
      }
      byEmployee[kpi.employeeId].push(kpi);
    }

    // Calculate summary for each employee
    for (const [employeeId, employeeKpis] of Object.entries(byEmployee)) {
      const summary = this.calculateEmployeeSummary(
        employeeKpis,
        quarter,
        fiscalYear
      );

      // Check if summary exists
      let existingSummary = await this.periodSummaryRepo.findOne({
        where: { employeeId, quarter, fiscalYear },
      });

      if (existingSummary) {
        Object.assign(existingSummary, summary);
        await this.periodSummaryRepo.save(existingSummary);
      } else {
        const newSummary = this.periodSummaryRepo.create(summary);
        await this.periodSummaryRepo.save(newSummary);
      }
    }

    this.logger.log(`Period summaries calculated for ${quarter} ${fiscalYear}`);
  }

  /**
   * Calculate summary for single employee
   */
  private calculateEmployeeSummary(
    kpis: KPIDefinition[],
    quarter: string,
    fiscalYear: number
  ): Partial<KPIPeriodSummary> {
    if (kpis.length === 0) {
      return {};
    }

    const completedKpis = kpis.filter(
      (k) => k.achievementValue !== null && k.achievementValue !== undefined
    );

    const businessKpis = kpis.filter(
      (k) => k.category === KPICategory.BUSINESS
    );
    const mainTaskKpis = kpis.filter(
      (k) => k.category === KPICategory.MAIN_TASKS
    );
    const projectKpis = kpis.filter((k) => k.category === KPICategory.PROJECTS);

    const avgAchievement =
      completedKpis.length > 0
        ? completedKpis.reduce(
            (sum, k) => sum + (k.percentageAchievement || 0),
            0
          ) / completedKpis.length
        : 0;

    const totalScore = kpis.reduce(
      (sum, k) => sum + (k.scoreAchievement || 0),
      0
    );

    const businessScore =
      businessKpis.length > 0
        ? businessKpis.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) /
          businessKpis.length
        : 0;

    const mainTaskScore =
      mainTaskKpis.length > 0
        ? mainTaskKpis.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) /
          mainTaskKpis.length
        : 0;

    const projectScore =
      projectKpis.length > 0
        ? projectKpis.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) /
          projectKpis.length
        : 0;

    // Determine overall rating
    let overallRating: PerformanceRating;
    if (avgAchievement < 0.6) {
      overallRating = PerformanceRating.RED;
    } else if (avgAchievement < 1.0) {
      overallRating = PerformanceRating.YELLOW;
    } else {
      overallRating = PerformanceRating.GREEN;
    }

    return {
      employeeId: kpis[0].employeeId,
      quarter,
      fiscalYear,
      department: kpis[0].department,
      totalKpis: kpis.length,
      completedKpis: completedKpis.length,
      averageAchievement: Math.round(avgAchievement * 100) / 100,
      totalScore: Math.round(totalScore * 10000) / 10000,
      overallRating,
      businessScore: Math.round(businessScore * 10000) / 10000,
      mainTasksScore: Math.round(mainTaskScore * 10000) / 10000,
      projectsScore: Math.round(projectScore * 10000) / 10000,
    };
  }
}
