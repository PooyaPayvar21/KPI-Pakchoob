import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KPIDefinition, KPIApprovalHistory, KPIPeriodSummary } from '../entities/kpi.entity';
import { ApprovalChain } from '../entities/approvalChain.entity';
import { User } from '../entities/user.entity';
import { KPIController } from '../controllers/kpi.controller';
import { KPIAnalyticsController } from '../controllers/kpi-analytics.controller';
import { KPIImportService } from '../services/kpi-import.service';
import { KPIApprovalWorkflowService } from '../services/kpi-approval-workflow.service';
import { KPICalculationEngine } from '../services/kpi-calculation.engine';
import { KPIAnalyticsService } from '../services/kpi-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KPIDefinition,
      KPIApprovalHistory,
      KPIPeriodSummary,
      ApprovalChain,
      User,
    ]),
  ],
  controllers: [KPIController, KPIAnalyticsController],
  providers: [
    KPIImportService,
    KPIApprovalWorkflowService,
    KPICalculationEngine,
    KPIAnalyticsService,
  ],
  exports: [
    KPIImportService,
    KPIApprovalWorkflowService,
    KPICalculationEngine,
    KPIAnalyticsService,
  ],
})
export class KPIModule {}
