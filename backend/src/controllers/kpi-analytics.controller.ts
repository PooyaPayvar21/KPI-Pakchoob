import { Controller, Get, Query, Param } from '@nestjs/common';
import { KPIAnalyticsService } from '../services/kpi-analytics.service';

@Controller('analytics/kpis')
export class KPIAnalyticsController {
  constructor(private analyticsService: KPIAnalyticsService) {}

  /**
   * Get department performance overview
   * GET /analytics/kpis/department/:department?quarter=Q2&fiscalYear=1404
   */
  @Get('department/:department')
  async getDepartmentPerformance(
    @Param('department') department: string,
    @Query('quarter') quarter: string,
    @Query('fiscalYear') fiscalYear: number,
  ): Promise<any> {
    return this.analyticsService.getDepartmentPerformance(
      department,
      quarter,
      fiscalYear,
    );
  }

  /**
   * Get employee performance trends
   * GET /analytics/kpis/employee-trends/:employeeId?year=1404
   */
  @Get('employee-trends/:employeeId')
  async getEmployeeTrends(
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
  ): Promise<any> {
    return this.analyticsService.getEmployeePerformanceTrend(employeeId, year);
  }

  /**
   * Get top and bottom performers
   * GET /analytics/kpis/performers?department=Sales&quarter=Q2&fiscalYear=1404&limit=10
   */
  @Get('performers')
  async getPerformers(
    @Query('department') department: string,
    @Query('quarter') quarter: string,
    @Query('fiscalYear') fiscalYear: number,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    return this.analyticsService.getTopBottomPerformers(
      department,
      quarter,
      fiscalYear,
      limit,
    );
  }

  /**
   * Get category-wise performance
   * GET /analytics/kpis/category-analysis?department=Sales&quarter=Q2&fiscalYear=1404
   */
  @Get('category-analysis')
  async getCategoryAnalysis(
    @Query('department') department: string,
    @Query('quarter') quarter: string,
    @Query('fiscalYear') fiscalYear: number,
  ): Promise<any> {
    return this.analyticsService.getDepartmentPerformance(
      department,
      quarter,
      fiscalYear,
    );
  }

  /**
   * Get approval bottlenecks
   * GET /analytics/kpis/bottlenecks?department=Sales&quarter=Q2
   */
  @Get('bottlenecks')
  async getBottlenecks(
    @Query('department') department?: string,
    @Query('quarter') quarter?: string,
  ): Promise<any> {
    return this.analyticsService.getApprovalBottlenecks(department, quarter);
  }

  /**
   * Get achievement dashboard
   * GET /analytics/kpis/dashboard?quarter=Q2&fiscalYear=1404&department=Sales
   */
  @Get('dashboard')
  async getDashboard(
    @Query('quarter') quarter: string,
    @Query('fiscalYear') fiscalYear: number,
    @Query('department') department?: string,
  ): Promise<any> {
    return this.analyticsService.getAchievementDashboard(
      quarter,
      fiscalYear,
      department,
    );
  }

  /**
   * Get KPI status report
   * GET /analytics/kpis/status-report?quarter=Q2&fiscalYear=1404
   */
  @Get('status-report')
  async getStatusReport(
    @Query('quarter') quarter: string,
    @Query('fiscalYear') fiscalYear: number,
  ): Promise<any> {
    return this.analyticsService.getKPIStatusReport(quarter, fiscalYear);
  }

  /**
   * Departments approval coverage based on approval_chains
   * GET /analytics/kpis/departments/approval-coverage?branch=Group
   */
  @Get('departments/approval-coverage')
  async getDepartmentsApprovalCoverage(
    @Query('branch') branch?: string,
  ): Promise<any[]> {
    return this.analyticsService.getDepartmentApprovalCoverage(branch);
  }
}
