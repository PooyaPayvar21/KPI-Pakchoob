import { Injectable, Logger } from '@nestjs/common';
import { KPIType, PerformanceRating } from '../entities/kpi.entity';
import { KPICalculationDto, KPICalculationResultDto } from '../dto/kpi.dto';

/**
 * KPI Calculation Engine
 * Implements the scoring logic from the Excel spreadsheet:
 *
 * Percentage Achievement (S):
 * =ROUND(IF(OR(P="",R=""),0,IF(AND(P=0,R=0),1,IF(U="+",R/P,P/R))),2)
 *
 * Score Achievement (T):
 * 60%-99%: S × (KPI weight × Objective weight)
 * 100%: (KPI weight × Objective weight × S) × 100%
 * >100%: (Objective weight × KPI weight × 100%) × 100%
 * <60%: 0
 *
 * Rating:
 * <60%: RED
 * 60%-99%: YELLOW
 * ≥100%: GREEN
 */
@Injectable()
export class KPICalculationEngine {
  private readonly logger = new Logger(KPICalculationEngine.name);

  /**
   * Calculate KPI metrics based on target and achievement
   */
  calculateKPI(input: KPICalculationDto): KPICalculationResultDto {
    const {
      targetValue,
      achievementValue,
      type,
      objectiveWeight,
      kpiWeight,
    } = input;

    // Step 1: Calculate percentage achievement
    const { percentageAchievement, isAchievementEmpty, isTargetEmpty } =
      this.calculatePercentageAchievement(targetValue, achievementValue, type);

    // Step 2: Determine performance rating
    const performanceRating = this.determinePerformanceRating(percentageAchievement);

    // Step 3: Calculate score achievement based on rating
    const { scoreAchievement, appliedRuleSet } = this.calculateScoreAchievement(
      percentageAchievement,
      objectiveWeight,
      kpiWeight,
      performanceRating,
    );

    const result: KPICalculationResultDto = {
      percentageAchievement,
      scoreAchievement,
      performanceRating,
      breakdown: {
        isAchievementEmpty,
        isTargetEmpty,
        calculatedPercentage: percentageAchievement,
        appliedRuleSet,
        scoreValue: scoreAchievement,
      },
    };

    this.logger.debug(`KPI Calculation: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Calculate percentage achievement (Column S in Excel)
   * Logic:
   * - If target or achievement is empty: return 0
   * - If both are 0: return 1 (100%)
   * - If type is "+": return achievement / target
   * - If type is "-": return target / achievement (inverse)
   * - Round to 2 decimal places
   */
  private calculatePercentageAchievement(
    targetValue: number | undefined,
    achievementValue: number | undefined,
    type: KPIType,
  ): { percentageAchievement: number; isAchievementEmpty: boolean; isTargetEmpty: boolean } {
    const isAchievementEmpty = achievementValue === null || achievementValue === undefined || achievementValue === 0;
    const isTargetEmpty = targetValue === null || targetValue === undefined || targetValue === 0;

    // If either target or achievement is missing
    if (isTargetEmpty || isAchievementEmpty) {
      return {
        percentageAchievement: 0,
        isAchievementEmpty,
        isTargetEmpty,
      };
    }

    // Both are 0: treat as 100% achievement
    if (targetValue === 0 && achievementValue === 0) {
      return {
        percentageAchievement: 1.0, // 100%
        isAchievementEmpty: false,
        isTargetEmpty: false,
      };
    }

    let percentage: number;

    if (type === KPIType.POSITIVE) {
      // Positive KPI: higher is better (e.g., production volume)
      // Calculate: achievement / target
      percentage = achievementValue / targetValue;
    } else {
      // Negative KPI: lower is better (e.g., defect rate, cost)
      // Calculate: target / achievement (inverse)
      percentage = targetValue / achievementValue;
    }

    // Round to 2 decimal places
    percentage = Math.round(percentage * 100) / 100;

    return {
      percentageAchievement: percentage,
      isAchievementEmpty: false,
      isTargetEmpty: false,
    };
  }

  /**
   * Determine performance rating based on percentage achievement
   */
  private determinePerformanceRating(percentage: number): PerformanceRating {
    if (percentage < 0.6) {
      return PerformanceRating.RED;
    }
    if (percentage < 1.0) {
      return PerformanceRating.YELLOW;
    }
    return PerformanceRating.GREEN;
  }

  /**
   * Calculate score achievement (Column T in Excel)
   * Scoring rules:
   * - RED (<60%): 0 score
   * - YELLOW (60%-99%): S × (KPI weight × Objective weight)
   * - GREEN (100%): (KPI weight × Objective weight × S) × 100%
   * - BONUS (>100%): (Objective weight × KPI weight × 100%) × 100%
   */
  private calculateScoreAchievement(
    percentage: number,
    objectiveWeight: number,
    kpiWeight: number,
    rating: PerformanceRating,
  ): { scoreAchievement: number; appliedRuleSet: 'RED' | 'YELLOW' | 'GREEN' | 'BONUS' } {
    let score = 0;
    let appliedRuleSet: 'RED' | 'YELLOW' | 'GREEN' | 'BONUS' = 'RED';

    if (percentage < 0.6) {
      // RED: No score
      score = 0;
      appliedRuleSet = 'RED';
    } else if (percentage < 1.0) {
      // YELLOW: Proportional scoring
      // Score = Achievement% × (KPI weight × Objective weight)
      score = percentage * (kpiWeight * objectiveWeight);
      appliedRuleSet = 'YELLOW';
    } else if (percentage === 1.0) {
      // GREEN (exactly 100%): Full scoring with 100% multiplier
      // Score = (KPI weight × Objective weight × Achievement%) × 100%
      score = (kpiWeight * objectiveWeight * percentage) * 1.0; // Already 100%
      appliedRuleSet = 'GREEN';
    } else {
      // BONUS (>100%): Exceeds target
      // Score = (Objective weight × KPI weight × 100%) × 100%
      score = (objectiveWeight * kpiWeight * 1.0) * 1.0;
      appliedRuleSet = 'BONUS';
    }

    // Round to 4 decimal places
    score = Math.round(score * 10000) / 10000;

    return {
      scoreAchievement: score,
      appliedRuleSet,
    };
  }

  /**
   * Calculate aggregate score for employee across all KPIs in a category
   */
  calculateCategoryScore(
    categoryScores: number[],
    weights: number[],
  ): number {
    if (categoryScores.length === 0) return 0;
    if (categoryScores.length !== weights.length) {
      this.logger.warn('Score and weight arrays have different lengths');
      return 0;
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = categoryScores.reduce(
      (sum, score, index) => sum + (score * weights[index]),
      0,
    );

    return Math.round((weightedSum / totalWeight) * 10000) / 10000;
  }

  /**
   * Recalculate percentage to percentage string (for display)
   */
  formatPercentage(percentage: number): string {
    return `${Math.round(percentage * 100)}%`;
  }

  /**
   * Get performance rating label
   */
  getRatingLabel(rating: PerformanceRating): string {
    switch (rating) {
      case PerformanceRating.RED:
        return 'Below Target';
      case PerformanceRating.YELLOW:
        return 'On Track';
      case PerformanceRating.GREEN:
        return 'Achieved/Exceeded';
      default:
        return 'Unknown';
    }
  }
}
