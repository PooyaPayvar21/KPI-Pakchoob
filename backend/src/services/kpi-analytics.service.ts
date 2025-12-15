import { Injectable, BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import {
  KPIDefinition,
  KPIPeriodSummary,
  KPIStatus,
  PerformanceRating,
  KPICategory,
} from "../entities/kpi.entity";
import { User } from "../entities/user.entity";
import { ApprovalChain } from "../entities/approvalChain.entity";

@Injectable()
export class KPIAnalyticsService {
  constructor(
    @InjectRepository(KPIDefinition)
    private kpiRepo: Repository<KPIDefinition>,
    @InjectRepository(KPIPeriodSummary)
    private periodSummaryRepo: Repository<KPIPeriodSummary>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(ApprovalChain)
    private approvalChainRepo: Repository<ApprovalChain>
  ) {}

  /**
   * Get department performance overview
   */
  async getDepartmentPerformance(
    department: string,
    quarter: string,
    fiscalYear: number
  ): Promise<any> {
    const kpis = await this.kpiRepo.find({
      where: {
        department,
        quarter,
        fiscalYear,
        status: KPIStatus.APPROVED,
      },
      relations: ["employee"],
    });

    if (kpis.length === 0) {
      throw new BadRequestException(
        `No approved KPIs found for department ${department} in ${quarter} ${fiscalYear}`
      );
    }

    // Calculate aggregates
    const totalKPIs = kpis.length;
    const avgAchievement =
      kpis.reduce((sum, k) => sum + (k.percentageAchievement || 0), 0) /
      totalKPIs;
    const avgScore =
      kpis.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) / totalKPIs;

    const performanceDistribution = {
      RED: kpis.filter((k) => k.performanceRating === PerformanceRating.RED)
        .length,
      YELLOW: kpis.filter(
        (k) => k.performanceRating === PerformanceRating.YELLOW
      ).length,
      GREEN: kpis.filter((k) => k.performanceRating === PerformanceRating.GREEN)
        .length,
    };

    // Category breakdown
    const categoryBreakdown = await this.getCategoryWisePerformance(kpis);

    return {
      department,
      quarter,
      fiscalYear,
      totalKPIs,
      averageAchievementPercentage: Math.round(avgAchievement * 100) / 100,
      averageScore: Math.round(avgScore * 100) / 100,
      performanceDistribution,
      categoryBreakdown,
    };
  }

  /**
   * Get employee performance trends over quarters
   */
  async getEmployeePerformanceTrend(
    employeeId: string,
    year: number
  ): Promise<any> {
    const employee = await this.userRepo.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new BadRequestException(`Employee ${employeeId} not found`);
    }

    const kpis = await this.kpiRepo.find({
      where: {
        employeeId,
        fiscalYear: year,
        status: KPIStatus.APPROVED,
      },
      order: { quarter: "ASC" },
    });

    const trends: Record<string, any> = {};
    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    for (const q of quarters) {
      const quarterKPIs = kpis.filter((k) => k.quarter === q);
      if (quarterKPIs.length > 0) {
        const avgAchievement =
          quarterKPIs.reduce(
            (sum, k) => sum + (k.percentageAchievement || 0),
            0
          ) / quarterKPIs.length;
        const avgScore =
          quarterKPIs.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) /
          quarterKPIs.length;

        trends[q] = {
          totalKPIs: quarterKPIs.length,
          averageAchievement: Math.round(avgAchievement * 100) / 100,
          averageScore: Math.round(avgScore * 100) / 100,
        };
      }
    }

    return {
      employee: {
        id: employee.id,
        username: employee.username,
        email: employee.email,
      },
      fiscalYear: year,
      trends,
    };
  }

  /**
   * Get top and bottom performers
   */
  async getTopBottomPerformers(
    department: string,
    quarter: string,
    fiscalYear: number,
    limit: number = 10
  ): Promise<any> {
    const kpis = await this.kpiRepo.find({
      where: {
        department,
        quarter,
        fiscalYear,
        status: KPIStatus.APPROVED,
      },
      relations: ["employee"],
    });

    if (kpis.length === 0) {
      throw new BadRequestException(
        `No approved KPIs found for ${department} in ${quarter} ${fiscalYear}`
      );
    }

    // Sort by average score
    const performers = kpis
      .map((k) => ({
        employee: {
          id: k.employee.id,
          username: k.employee.username,
          email: k.employee.email,
        },
        averageScore: k.scoreAchievement || 0,
        achievementPercentage: k.percentageAchievement || 0,
        performanceRating: k.performanceRating,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    return {
      department,
      quarter,
      fiscalYear,
      topPerformers: performers.slice(0, limit),
      bottomPerformers: performers.slice(-limit).reverse(),
    };
  }

  /**
   * Get category-wise performance distribution
   */
  async getCategoryWisePerformance(
    kpis: KPIDefinition[]
  ): Promise<Record<string, any>> {
    const categories = Object.values(KPICategory);
    const breakdown: Record<string, any> = {};

    for (const category of categories) {
      const categoryKPIs = kpis.filter((k) => k.category === category);
      if (categoryKPIs.length > 0) {
        const avgAchievement =
          categoryKPIs.reduce(
            (sum, k) => sum + (k.percentageAchievement || 0),
            0
          ) / categoryKPIs.length;
        const avgScore =
          categoryKPIs.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) /
          categoryKPIs.length;

        breakdown[category] = {
          totalKPIs: categoryKPIs.length,
          averageAchievement: Math.round(avgAchievement * 100) / 100,
          averageScore: Math.round(avgScore * 100) / 100,
          performanceDistribution: {
            RED: categoryKPIs.filter(
              (k) => k.performanceRating === PerformanceRating.RED
            ).length,
            YELLOW: categoryKPIs.filter(
              (k) => k.performanceRating === PerformanceRating.YELLOW
            ).length,
            GREEN: categoryKPIs.filter(
              (k) => k.performanceRating === PerformanceRating.GREEN
            ).length,
          },
        };
      }
    }

    return breakdown;
  }

  /**
   * Get approval bottleneck analysis
   */
  async getApprovalBottlenecks(
    department?: string,
    quarter?: string
  ): Promise<any> {
    let query = this.kpiRepo.createQueryBuilder("kpi");

    if (department) {
      query = query.where("kpi.department = :department", { department });
    }

    if (quarter) {
      query = query.andWhere("kpi.quarter = :quarter", { quarter });
    }

    const kpis = await query
      .andWhere("kpi.status = :status", { status: KPIStatus.UNDER_REVIEW })
      .leftJoinAndSelect("kpi.manager", "manager")
      .orderBy("kpi.updatedAt", "ASC")
      .getMany();

    // Group by manager
    const bottlenecks: Record<string, any> = {};
    for (const kpi of kpis) {
      if (kpi.manager) {
        if (!bottlenecks[kpi.manager.id]) {
          bottlenecks[kpi.manager.id] = {
            manager: {
              id: kpi.manager.id,
              username: kpi.manager.username,
              email: kpi.manager.email,
            },
            pendingKPIs: [],
          };
        }
        bottlenecks[kpi.manager.id].pendingKPIs.push({
          id: kpi.id,
          category: kpi.category,
          submittedAt: kpi.updatedAt,
          daysWaiting: this.calculateDaysWaiting(kpi.updatedAt),
        });
      }
    }

    return {
      totalBottlenecks: Object.keys(bottlenecks).length,
      bottlenecks: Object.values(bottlenecks),
    };
  }

  /**
   * Get KPI achievement dashboard
   */
  async getAchievementDashboard(
    quarter: string,
    fiscalYear: number,
    department?: string
  ): Promise<any> {
    let query = this.kpiRepo.createQueryBuilder("kpi");

    query = query
      .where("kpi.quarter = :quarter", { quarter })
      .andWhere("kpi.fiscalYear = :fiscalYear", { fiscalYear })
      .andWhere("kpi.status = :status", { status: KPIStatus.APPROVED });

    if (department) {
      query = query.andWhere("kpi.department = :department", { department });
    }

    const kpis = await query
      .leftJoinAndSelect("kpi.employee", "employee")
      .getMany();

    const totalKPIs = kpis.length;
    const avgAchievement =
      kpis.reduce((sum, k) => sum + (k.percentageAchievement || 0), 0) /
      totalKPIs;
    const avgScore =
      kpis.reduce((sum, k) => sum + (k.scoreAchievement || 0), 0) / totalKPIs;

    const performanceCount = {
      RED: kpis.filter((k) => k.performanceRating === PerformanceRating.RED)
        .length,
      YELLOW: kpis.filter(
        (k) => k.performanceRating === PerformanceRating.YELLOW
      ).length,
      GREEN: kpis.filter((k) => k.performanceRating === PerformanceRating.GREEN)
        .length,
    };

    const achievementDistribution = {
      belowTarget: kpis.filter((k) => (k.percentageAchievement || 0) < 100)
        .length,
      atTarget: kpis.filter(
        (k) =>
          (k.percentageAchievement || 0) >= 100 &&
          (k.percentageAchievement || 0) < 110
      ).length,
      aboveTarget: kpis.filter((k) => (k.percentageAchievement || 0) >= 110)
        .length,
    };

    return {
      period: { quarter, fiscalYear },
      department: department || "all",
      totalApprovedKPIs: totalKPIs,
      metrics: {
        averageAchievementPercentage: Math.round(avgAchievement * 100) / 100,
        averageScore: Math.round(avgScore * 100) / 100,
      },
      performanceDistribution: performanceCount,
      achievementDistribution,
    };
  }

  /**
   * Get KPI status report
   */
  async getKPIStatusReport(quarter: string, fiscalYear: number): Promise<any> {
    const allKPIs = await this.kpiRepo.find({
      where: {
        quarter,
        fiscalYear,
      },
    });

    const statusBreakdown = {
      DRAFT: allKPIs.filter((k) => k.status === KPIStatus.DRAFT).length,
      SUBMITTED: allKPIs.filter((k) => k.status === KPIStatus.SUBMITTED).length,
      UNDER_REVIEW: allKPIs.filter((k) => k.status === KPIStatus.UNDER_REVIEW)
        .length,
      APPROVED: allKPIs.filter((k) => k.status === KPIStatus.APPROVED).length,
      REJECTED: allKPIs.filter((k) => k.status === KPIStatus.REJECTED).length,
      ARCHIVED: allKPIs.filter((k) => k.status === KPIStatus.ARCHIVED).length,
    };

    const completionPercentage =
      ((statusBreakdown.APPROVED + statusBreakdown.REJECTED) / allKPIs.length) *
      100;

    return {
      period: { quarter, fiscalYear },
      totalKPIs: allKPIs.length,
      statusBreakdown,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
    };
  }

  /**
   * Helper: Calculate days waiting
   */
  private calculateDaysWaiting(submittedDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - submittedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Departments approval coverage based on approval_chains
   * Calculates, per department:
   * - totalChainLinks: total approval chain links
   * - linkedChainLinks: links where managerUser is present (resolved)
   * - employeeCount: distinct employees in department
   * - coveragePercent: linkedChainLinks / totalChainLinks * 100
   */
  async getDepartmentApprovalCoverage(branch?: string): Promise<any[]> {
    const qb = this.approvalChainRepo.createQueryBuilder("ac");
    if (branch) {
      qb.where("ac.branch = :branch", { branch });
    }
    const chains = await qb
      .leftJoinAndSelect("ac.managerUser", "managerUser")
      .getMany();

    const deptMap = new Map<
      string,
      {
        name: string;
        totalChainLinks: number;
        linkedChainLinks: number;
        employeeSet: Set<string>;
      }
    >();

    for (const c of chains) {
      const name = (c.department || "نامشخص").trim();
      if (!deptMap.has(name)) {
        deptMap.set(name, {
          name,
          totalChainLinks: 0,
          linkedChainLinks: 0,
          employeeSet: new Set<string>(),
        });
      }
      const agg = deptMap.get(name)!;
      agg.totalChainLinks += 1;
      if (c.managerUser && c.managerUser.id) {
        agg.linkedChainLinks += 1;
      }
      if (c.employeeId) {
        agg.employeeSet.add(String(c.employeeId));
      }
    }

    const result = Array.from(deptMap.values())
      .map((d) => ({
        department: d.name,
        totalChainLinks: d.totalChainLinks,
        linkedChainLinks: d.linkedChainLinks,
        employeeCount: d.employeeSet.size,
        coveragePercent:
          d.totalChainLinks > 0
            ? Math.round((d.linkedChainLinks / d.totalChainLinks) * 100)
            : 0,
      }))
      .sort((a, b) => a.department.localeCompare(b.department));

    return result;
  }
}
