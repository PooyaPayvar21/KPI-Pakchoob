import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { KPIImportService } from "../services/kpi-import.service";
import { KPIApprovalWorkflowService } from "../services/kpi-approval-workflow.service";
import { KPICalculationEngine } from "../services/kpi-calculation.engine";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { KPIDefinition } from "../entities/kpi.entity";
import {
  KPIBulkImportResponseDto,
  ApproveKPIDto,
  SubmitKPIDto,
  UpdateKPIAchievementDto,
  KPIResponseDto,
  UpdateKPIPercentageDto,
  CreateKPIDto,
} from "../dto/kpi.dto";

@Controller("kpis")
export class KPIController {
  constructor(
    private kpiImportService: KPIImportService,
    private approvalWorkflowService: KPIApprovalWorkflowService,
    private calculationEngine: KPICalculationEngine,
    @InjectRepository(KPIDefinition)
    private kpiRepo: Repository<KPIDefinition>
  ) {}

  /**
   * Create a new KPI row
   * POST /kpis
   */
  @Post()
  async createKPI(
    @Body() dto: CreateKPIDto,
    @Request() req: any
  ): Promise<KPIDefinition> {
    // Basic validation
    if (!dto.employeeId) {
      throw new BadRequestException("employeeId is required");
    }
    if (!dto.companyName) {
      throw new BadRequestException("companyName is required");
    }
    if (!dto.quarter) {
      throw new BadRequestException("quarter is required");
    }
    if (!dto.fiscalYear) {
      throw new BadRequestException("fiscalYear is required");
    }
    if (!dto.department) {
      throw new BadRequestException("department is required");
    }
    if (!dto.category) {
      throw new BadRequestException("category is required");
    }
    if (!dto.kpiNameEn) {
      throw new BadRequestException("kpiNameEn is required");
    }
    if (dto.objectiveWeight == null) {
      throw new BadRequestException("objectiveWeight is required");
    }
    if (dto.kpiWeight == null) {
      throw new BadRequestException("kpiWeight is required");
    }
    if (!dto.type) {
      throw new BadRequestException("type is required");
    }

    // Normalize numeric fields
    const objectiveWeight =
      typeof dto.objectiveWeight === "string"
        ? Number(dto.objectiveWeight)
        : dto.objectiveWeight;
    const kpiWeight =
      typeof dto.kpiWeight === "string" ? Number(dto.kpiWeight) : dto.kpiWeight;
    const targetValue =
      dto.targetValue == null
        ? null
        : typeof dto.targetValue === "string"
        ? Number(dto.targetValue)
        : dto.targetValue;
    const achievementValue =
      dto.achievementValue == null
        ? null
        : typeof dto.achievementValue === "string"
        ? Number(dto.achievementValue)
        : dto.achievementValue;

    const entity = this.kpiRepo.create({
      companyName: dto.companyName,
      quarter: dto.quarter,
      fiscalYear: dto.fiscalYear,
      employeeId: dto.employeeId,
      managerId: dto.managerId || null,
      department: dto.department,
      jobTitle: dto.jobTitle || null,
      category: dto.category,
      kpiNameEn: dto.kpiNameEn,
      kpiNameFa: dto.kpiNameFa || null,
      kpiDescription: dto.kpiDescription || null,
      objectiveWeight,
      kpiWeight,
      targetValue,
      achievementValue,
      type: dto.type,
      comments: dto.comments || null,
      status: "DRAFT" as any,
      createdBy: req?.user?.id || null,
    });
    return this.kpiRepo.save(entity);
  }

  /**
   * Import KPIs from Excel file (IRNQ2 sheet)
   * POST /kpis/import
   */
  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importKPIsFromExcel(
    @UploadedFile() file: any,
    @Request() req: any
  ): Promise<KPIBulkImportResponseDto> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const validMimetypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/excel",
      "application/x-excel",
      "application/x-msexcel",
      "application/octet-stream",
    ];

    if (
      !validMimetypes.some((mt) => file.mimetype.includes(mt)) &&
      !file.originalname.endsWith(".xlsx")
    ) {
      throw new BadRequestException(
        `File must be an Excel file (.xlsx). Received: ${file.mimetype}`
      );
    }

    const userId = req.user?.id || "00000000-0000-0000-0000-000000000000";
    const result = await this.kpiImportService.importFromExcel(
      file.buffer,
      userId
    );

    // Calculate period summaries after import
    const quarter = "Q2"; // Extract from file if needed
    const fiscalYear = 1404; // Extract from file if needed
    await this.kpiImportService.calculatePeriodSummaries(quarter, fiscalYear);

    return result;
  }

  /**
   * Get all KPIs (with optional filters)
   * GET /kpis?status=DRAFT&employeeId=xxx&managerId=xxx&department=xxx
   */
  @Get()
  async listKPIs(
    @Query("status") status?: string,
    @Query("employeeId") employeeId?: string,
    @Query("managerId") managerId?: string,
    @Query("department") department?: string,
    @Query("quarter") quarter?: string,
    @Query("take") take: number = 50,
    @Query("skip") skip: number = 0
  ): Promise<{ data: KPIDefinition[]; total: number }> {
    const query = this.kpiRepo.createQueryBuilder("kpi");

    if (status) query.andWhere("kpi.status = :status", { status });
    if (employeeId)
      query.andWhere("kpi.employeeId = :employeeId", { employeeId });
    if (managerId) query.andWhere("kpi.managerId = :managerId", { managerId });
    if (department)
      query.andWhere("kpi.department = :department", { department });
    if (quarter) query.andWhere("kpi.quarter = :quarter", { quarter });

    const takeNumRaw = Number.isFinite(Number(take)) ? Number(take) : 50;
    const skipNumRaw = Number.isFinite(Number(skip)) ? Number(skip) : 0;
    const takeNum = Math.max(1, Math.min(10000, takeNumRaw));
    const skipNum = Math.max(0, skipNumRaw);

    const [data, total] = await query
      .leftJoinAndSelect("kpi.employee", "employee")
      .leftJoinAndSelect("kpi.manager", "manager")
      .orderBy("kpi.createdAt", "DESC")
      .take(takeNum)
      .skip(skipNum)
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Get KPI by ID
   * GET /kpis/:id
   */
  @Get(":id")
  async getKPI(@Param("id") id: string): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id },
      relations: ["employee", "manager", "approvalHistory"],
    });

    if (!kpi) {
      throw new BadRequestException(`KPI with ID ${id} not found`);
    }

    return kpi;
  }

  /**
   * Update KPI achievement value
   * PUT /kpis/:id/achievement
   */
  @Put(":id/achievement")
  async updateKPIAchievement(
    @Param("id") id: string,
    @Body() dto: UpdateKPIAchievementDto,
    @Request() req: any
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id },
      relations: ["employee", "manager"],
    });

    if (!kpi) {
      throw new BadRequestException(`KPI with ID ${id} not found`);
    }

    const userId = req.user?.id;
    if (kpi.employeeId !== userId) {
      throw new BadRequestException(
        "You can only update your own KPI achievements"
      );
    }

    // Update achievement value
    kpi.achievementValue = dto.achievementValue;
    kpi.comments = dto.comments || kpi.comments;

    // Recalculate scores
    if (kpi.targetValue !== null && kpi.targetValue !== undefined) {
      const calculation = this.calculationEngine.calculateKPI({
        targetValue: kpi.targetValue,
        achievementValue: kpi.achievementValue,
        type: kpi.type,
        objectiveWeight: kpi.objectiveWeight,
        kpiWeight: kpi.kpiWeight,
      });

      kpi.percentageAchievement = calculation.percentageAchievement;
      kpi.scoreAchievement = calculation.scoreAchievement;
      kpi.performanceRating = calculation.performanceRating;
    }

    kpi.updatedAt = new Date();
    return this.kpiRepo.save(kpi);
  }

  /**
   * Update KPI percentage_achievement directly
   * PUT /kpis/:id/percentage
   */
  @Put(":id/percentage")
  async updateKPIPercentage(
    @Param("id") id: string,
    @Body() dto: UpdateKPIPercentageDto,
    @Request() req: any
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id },
      relations: ["employee", "manager"],
    });
    if (!kpi) {
      throw new BadRequestException(`KPI with ID ${id} not found`);
    }
    const userId = req.user?.id;
    if (kpi.employeeId !== userId) {
      throw new BadRequestException(
        "You can only update your own KPI percentage"
      );
    }
    kpi.percentageAchievement = dto.percentageAchievement;
    kpi.updatedAt = new Date();
    return this.kpiRepo.save(kpi);
  }

  /**
   * Employee submits KPI for approval
   * POST /kpis/:id/submit
   */
  @Post(":id/submit")
  @HttpCode(200)
  async submitKPI(
    @Param("id") id: string,
    @Body() dto: SubmitKPIDto,
    @Request() req: any
  ): Promise<KPIDefinition> {
    const userId: string | undefined =
      req.user && req.user.id ? req.user.id : undefined;
    const notes: string | undefined = dto.notes || undefined;
    return this.approvalWorkflowService.submitKPI(id, userId, notes);
  }

  /**
   * Manager approves or rejects KPI
   * POST /kpis/:id/approve
   */
  @Post(":id/approve")
  @HttpCode(200)
  async approveKPI(
    @Param("id") id: string,
    @Body() dto: ApproveKPIDto,
    @Request() req: any
  ): Promise<KPIDefinition> {
    const managerId = req.user?.id;
    return this.approvalWorkflowService.approveKPI(id, managerId, dto);
  }

  /**
   * Get approval history for KPI
   * GET /kpis/:id/approval-history
   */
  @Get(":id/approval-history")
  async getApprovalHistory(@Param("id") id: string): Promise<any[]> {
    return this.approvalWorkflowService.getApprovalHistory(id);
  }

  /**
   * Get KPIs pending approval for manager
   * GET /kpis/approvals/pending
   */
  @Get("approvals/pending")
  async getPendingApprovals(@Request() req: any): Promise<KPIDefinition[]> {
    const managerId = req.user?.id;
    return this.approvalWorkflowService.getPendingApprovalsForManager(
      managerId
    );
  }

  /**
   * Get approval queue for manager (direct + subordinates)
   * GET /kpis/approvals/queue
   */
  @Get("approvals/queue")
  async getApprovalQueue(@Request() req: any): Promise<any> {
    const managerId = req.user?.id;
    return this.approvalWorkflowService.getApprovalQueueForManager(managerId);
  }

  /**
   * Get KPI status summary for employee
   * GET /kpis/status/summary
   */
  @Get("status/summary")
  async getKPIStatusSummary(@Request() req: any): Promise<any> {
    const employeeId = req.user?.id;
    return this.approvalWorkflowService.getEmployeeKPIStatus(employeeId);
  }

  /**
   * Get KPIs for a specific employee by personnel code
   * GET /kpis/employee/:employeeCode
   */
  @Get("employee/:employeeCode")
  async getKPIsByEmployeeCode(
    @Param("employeeCode") employeeCode: string
  ): Promise<KPIDefinition[]> {
    return this.kpiImportService.getKPIsByEmployeeCode(employeeCode);
  }

  /**
   * Get KPIs pending approval by manager (by personnel code)
   * GET /kpis/manager/:managerCode/pending
   */
  @Get("manager/:managerCode/pending")
  async getManagerPendingApprovals(
    @Param("managerCode") managerCode: string
  ): Promise<KPIDefinition[]> {
    return this.kpiImportService.getKPIsPendingApprovalByManager(managerCode);
  }

  /**
   * Reopen a rejected KPI
   * POST /kpis/:id/reopen
   */
  @Post(":id/reopen")
  @HttpCode(200)
  async reopenRejectedKPI(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<KPIDefinition> {
    const managerId = req.user?.id;
    return this.approvalWorkflowService.reopenRejectedKPI(id, managerId);
  }

  /**
   * Archive an approved KPI
   * POST /kpis/:id/archive
   */
  @Post(":id/archive")
  @HttpCode(200)
  async archiveKPI(@Param("id") id: string): Promise<KPIDefinition> {
    return this.approvalWorkflowService.archiveKPI(id);
  }
}
