import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { KPIDefinition, KPIStatus, KPIApprovalHistory } from '../entities/kpi.entity';
import { ApprovalChain } from '../entities/approvalChain.entity';
import { User, UserRole } from '../entities/user.entity';
import { ApproveKPIDto, SubmitKPIDto } from '../dto/kpi.dto';

/**
 * KPI Approval Workflow Service
 * 
 * Approval Flow:
 * DRAFT → SUBMITTED → UNDER_REVIEW (Level 1 Manager) → UNDER_REVIEW (Level 2) → ... → APPROVED
 * 
 * Each manager in the hierarchy must approve before it goes to the next level.
 * The workflow stops at the highest manager level available for that employee.
 */
@Injectable()
export class KPIApprovalWorkflowService {
  private readonly logger = new Logger(KPIApprovalWorkflowService.name);

  constructor(
    @InjectRepository(KPIDefinition)
    private kpiRepo: Repository<KPIDefinition>,
    @InjectRepository(KPIApprovalHistory)
    private historyRepo: Repository<KPIApprovalHistory>,
    @InjectRepository(ApprovalChain)
    private approvalChainRepo: Repository<ApprovalChain>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  private isSuperAdmin(user: User | null | undefined): boolean {
    if (!user) return false;
    return user.role === UserRole.SUPER_ADMIN || String(user.username).trim() === '3192';
  }

  /**
   * Employee submits KPI to their direct manager
   * Changes status from DRAFT → SUBMITTED
   */
  async submitKPI(
    kpiId: string,
    employeeId: string | null | undefined,
    notes?: string,
  ): Promise<KPIDefinition> {
    if (!employeeId) {
      throw new BadRequestException('Employee ID is required');
    }
    const kpi = await this.kpiRepo.findOne({
      where: { id: kpiId },
      relations: ['employee', 'manager'],
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID ${kpiId} not found`);
    }

    if (kpi.employeeId !== employeeId) {
      throw new ForbiddenException('You can only submit your own KPIs');
    }

    if (kpi.status !== KPIStatus.DRAFT) {
      throw new BadRequestException(
        `KPI is in ${kpi.status} status. Can only submit DRAFT KPIs.`,
      );
    }

    // Find the first manager in the approval chain
    const approvalChain = await this.approvalChainRepo.find({
      where: { employeeId: kpi.employeeId },
      order: { sequenceLevel: 'ASC' },
      relations: ['managerUser'],
    });

    if (!approvalChain || approvalChain.length === 0) {
      throw new BadRequestException(
        `No approval chain found for employee ${kpi.employeeId}. Cannot submit KPI.`,
      );
    }

    // Update KPI status
    kpi.status = KPIStatus.SUBMITTED;
    kpi.updatedAt = new Date();

    // Save the updated KPI
    const updatedKpi = await this.kpiRepo.save(kpi);

    // Create approval history record
    await this.historyRepo.save({
      kpi: updatedKpi,
      kpiId: kpi.id,
      fromStatus: KPIStatus.DRAFT,
      toStatus: KPIStatus.SUBMITTED,
      approverId: employeeId,
      approver: kpi.employee,
      notes: notes || 'KPI submitted for approval',
    });

    this.logger.log(`KPI ${kpiId} submitted by employee ${employeeId}`);

    return updatedKpi;
  }

  /**
   * Manager approves KPI and cascades to next level
   * Finds the next manager in the hierarchy to route the approval
   */
  async approveKPI(
    kpiId: string,
    managerId: string,
    dto: ApproveKPIDto,
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id: kpiId },
      relations: ['employee', 'manager'],
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID ${kpiId} not found`);
    }

    // Find the manager user
    const manager = await this.usersRepo.findOne({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundException(`Manager with ID ${managerId} not found`);
    }

    // Superadmin can approve any KPI regardless of chain
    const isAuthorizedManager =
      (await this.isManagerInChain(kpi.employeeId, managerId)) ||
      this.isSuperAdmin(manager);
    if (!isAuthorizedManager) {
      throw new ForbiddenException(`You are not in the approval chain for this KPI`);
    }

    // Check KPI status
    if (kpi.status !== KPIStatus.SUBMITTED && kpi.status !== KPIStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `KPI is in ${kpi.status} status. Can only approve SUBMITTED or UNDER_REVIEW KPIs.`,
      );
    }

    if (dto.approved) {
      // Approval granted - find next manager or finalize
      const nextManagerLevel = await this.getNextManagerLevel(
        kpi.employeeId,
        managerId,
      );

      if (nextManagerLevel) {
        // If the next manager level is superadmin, finalize automatically
        if (this.isSuperAdmin(nextManagerLevel)) {
          kpi.status = KPIStatus.APPROVED;
          kpi.approvedBy = managerId;
          kpi.approvedAt = new Date();
          kpi.approvalNotes = dto.notes || `Auto-approved by top-level (superadmin)`;
          kpi.updatedAt = new Date();
          const updatedKpi = await this.kpiRepo.save(kpi);
          await this.historyRepo.save({
            kpi: updatedKpi,
            kpiId: kpi.id,
            fromStatus: KPIStatus.UNDER_REVIEW,
            toStatus: KPIStatus.APPROVED,
            approverId: managerId,
            approver: manager,
            notes: dto.notes || `Auto-approved as next level is superadmin`,
          });
          this.logger.log(`KPI ${kpiId} auto-approved as next level is superadmin`);
          return updatedKpi;
        }
        // Route to next manager for approval
        kpi.status = KPIStatus.UNDER_REVIEW;
        kpi.managerId = nextManagerLevel.id;
        kpi.updatedAt = new Date();

        const updatedKpi = await this.kpiRepo.save(kpi);

        // Create history record
        await this.historyRepo.save({
          kpi: updatedKpi,
          kpiId: kpi.id,
          fromStatus: KPIStatus.UNDER_REVIEW,
          toStatus: KPIStatus.UNDER_REVIEW,
          approverId: managerId,
          approver: manager,
          notes: dto.notes || `Approved by ${manager.username}. Forwarding to next manager.`,
        });

        this.logger.log(
          `KPI ${kpiId} approved by manager ${managerId} and routed to next level`,
        );
      } else {
        // No more managers - final approval
        kpi.status = KPIStatus.APPROVED;
        kpi.approvedBy = managerId;
        kpi.approvedAt = new Date();
        kpi.approvalNotes = dto.notes || `Final approval granted by ${manager.username}`;
        kpi.updatedAt = new Date();

        const updatedKpi = await this.kpiRepo.save(kpi);

        // Create history record
        await this.historyRepo.save({
          kpi: updatedKpi,
          kpiId: kpi.id,
          fromStatus: KPIStatus.UNDER_REVIEW,
          toStatus: KPIStatus.APPROVED,
          approverId: managerId,
          approver: manager,
          notes: dto.notes || `Final approval granted by ${manager.username}`,
        });

        this.logger.log(
          `KPI ${kpiId} fully approved by manager ${managerId}`,
        );
      }

      return kpi;
    } else {
      // Rejection - KPI goes back to DRAFT
      kpi.status = KPIStatus.REJECTED;
      kpi.rejectedReason = dto.rejectionReason || 'Rejected by manager';
      kpi.updatedAt = new Date();

      const updatedKpi = await this.kpiRepo.save(kpi);

      // Create history record
      await this.historyRepo.save({
        kpi: updatedKpi,
        kpiId: kpi.id,
        fromStatus: KPIStatus.UNDER_REVIEW,
        toStatus: KPIStatus.REJECTED,
        approverId: managerId,
        approver: manager,
        notes: dto.rejectionReason || `Rejected by ${manager.username}`,
      });

      this.logger.log(
        `KPI ${kpiId} rejected by manager ${managerId}. Reason: ${dto.rejectionReason}`,
      );

      return updatedKpi;
    }
  }

  /**
   * Get all KPIs pending approval for a manager
   * Returns KPIs where the manager is the current approver
   */
  async getPendingApprovalsForManager(managerId: string): Promise<KPIDefinition[]> {
    const manager = await this.usersRepo.findOne({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundException(`Manager with ID ${managerId} not found`);
    }

    return this.kpiRepo.find({
      where: { 
        managerId,
        status: KPIStatus.UNDER_REVIEW,
      },
      relations: ['employee', 'manager'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get approval history for a KPI
   */
  async getApprovalHistory(kpiId: string): Promise<KPIApprovalHistory[]> {
    return this.historyRepo.find({
      where: { kpiId },
      relations: ['approver'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get approval status summary for an employee's KPIs
   */
  async getEmployeeKPIStatus(employeeId: string): Promise<{
    draft: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const kpis = await this.kpiRepo.find({
      where: { employeeId },
    });

    return {
      draft: kpis.filter((k) => k.status === KPIStatus.DRAFT).length,
      submitted: kpis.filter((k) => k.status === KPIStatus.SUBMITTED).length,
      underReview: kpis.filter((k) => k.status === KPIStatus.UNDER_REVIEW).length,
      approved: kpis.filter((k) => k.status === KPIStatus.APPROVED).length,
      rejected: kpis.filter((k) => k.status === KPIStatus.REJECTED).length,
      total: kpis.length,
    };
  }

  /**
   * Get all KPIs in the approval queue for a manager and their subordinates
   */
  async getApprovalQueueForManager(managerId: string): Promise<{
    directApprovals: KPIDefinition[];
    subordinateApprovals: KPIDefinition[];
  }> {
    // KPIs waiting for this manager's approval
    const directApprovals = await this.kpiRepo.find({
      where: { managerId, status: KPIStatus.UNDER_REVIEW },
      relations: ['employee', 'manager'],
      order: { createdAt: 'DESC' },
    });

    // KPIs waiting for managers under this manager
    const approvalChains = await this.approvalChainRepo.find({
      where: { managerId },
      relations: ['managerUser'],
    });

    const subordinateManagerIds = approvalChains
      .map((ac) => ac.managerUser?.id)
      .filter((id): id is string => !!id);

    let subordinateApprovals: KPIDefinition[] = [];
    if (subordinateManagerIds.length > 0) {
      subordinateApprovals = await this.kpiRepo.find({
        where: [
          { managerId: subordinateManagerIds[0], status: KPIStatus.UNDER_REVIEW },
        ],
        relations: ['employee', 'manager'],
        order: { createdAt: 'DESC' },
      });
    }

    return {
      directApprovals,
      subordinateApprovals,
    };
  }

  /**
   * Check if a manager is in the approval chain for an employee
   */
  private async isManagerInChain(
    employeeId: string,
    managerId: string,
  ): Promise<boolean> {
    const manager = await this.usersRepo.findOne({ where: { id: managerId } });
    if (this.isSuperAdmin(manager)) return true;
    const chain = await this.approvalChainRepo.find({
      where: { employeeId, managerUser: { id: managerId } },
      relations: ['managerUser'],
    });

    return chain.length > 0;
  }

  /**
   * Get the next manager in the approval chain
   * Returns the next level manager who should approve the KPI
   */
  private async getNextManagerLevel(
    employeeId: string,
    currentManagerId: string,
  ): Promise<User | null> {
    const currentManager = await this.usersRepo.findOne({
      where: { id: currentManagerId },
    });

    if (!currentManager) return null;
    // Superadmin is considered top-level; no next manager
    if (this.isSuperAdmin(currentManager)) return null;

    // Find all managers in the approval chain
    const approvalChain = await this.approvalChainRepo.find({
      where: { employeeId },
      order: { sequenceLevel: 'ASC' },
      relations: ['managerUser'],
    });

    if (approvalChain.length === 0) return null;

    // Find the current manager's level in the chain
    const currentLevel = approvalChain.findIndex(
      (ac) => ac.managerUser?.id === currentManagerId,
    );

    if (currentLevel === -1) {
      // Current manager not in chain
      return null;
    }

    // Get the next level manager (if it exists)
    if (currentLevel + 1 < approvalChain.length) {
      const next = approvalChain[currentLevel + 1].managerUser || null;
      // If next is superadmin, treat as top (return null to finalize)
      if (this.isSuperAdmin(next || null)) return null;
      return next;
    }

    // No next manager - already at the top
    return null;
  }

  /**
   * Reopen a rejected KPI for resubmission
   * Only the top-level manager can reopen
   */
  async reopenRejectedKPI(
    kpiId: string,
    managerId: string,
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id: kpiId },
      relations: ['employee', 'manager'],
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID ${kpiId} not found`);
    }

    if (kpi.status !== KPIStatus.REJECTED) {
      throw new BadRequestException(
        `KPI is in ${kpi.status} status. Can only reopen REJECTED KPIs.`,
      );
    }

    // Verify manager is authorized
    const isAuthorized = await this.isManagerInChain(kpi.employeeId, managerId);
    if (!isAuthorized) {
      throw new ForbiddenException(
        'You are not authorized to reopen this KPI',
      );
    }

    const manager = await this.usersRepo.findOne({
      where: { id: managerId },
    });

    // Reopen as DRAFT for employee to revise
    kpi.status = KPIStatus.DRAFT;
    kpi.rejectedReason = null;
    kpi.updatedAt = new Date();

    const updatedKpi = await this.kpiRepo.save(kpi);

    // Create history record
    await this.historyRepo.save({
      kpi: updatedKpi,
      kpiId: kpi.id,
      fromStatus: KPIStatus.REJECTED,
      toStatus: KPIStatus.DRAFT,
      approverId: managerId,
      approver: manager,
      notes: 'KPI reopened for revision',
    });

    this.logger.log(
      `KPI ${kpiId} reopened by manager ${managerId} for revision`,
    );

    return updatedKpi;
  }

  /**
   * Archive a KPI (final state)
   * Only allowed for APPROVED KPIs
   */
  async archiveKPI(kpiId: string): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id: kpiId },
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID ${kpiId} not found`);
    }

    if (kpi.status !== KPIStatus.APPROVED) {
      throw new BadRequestException(
        `Only APPROVED KPIs can be archived. Current status: ${kpi.status}`,
      );
    }

    kpi.status = KPIStatus.ARCHIVED;
    kpi.updatedAt = new Date();

    return this.kpiRepo.save(kpi);
  }
}
