import { ValidationRule, ValidationResult, ProcessedMetrics } from './types';
import { VALIDATION_RULES } from './constants';

export class MetricsValidator {
  private rules: ValidationRule[];

  constructor(customRules?: ValidationRule[]) {
    this.rules = customRules || VALIDATION_RULES;
  }

  async validateMetrics(metrics: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const rule of this.rules) {
      try {
        const value = this.getFieldValue(metrics, rule.field);
        const passed = rule.validator(value);

        results.push({
          rule: rule.name,
          field: rule.field,
          passed,
          value,
          message: passed ? undefined : rule.errorMessage,
          severity: rule.severity
        });
      } catch (error) {
        results.push({
          rule: rule.name,
          field: rule.field,
          passed: false,
          value: undefined,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }

    return results;
  }

  async isValid(metrics: any): Promise<boolean> {
    const results = await this.validateMetrics(metrics);
    return !results.some(result => !result.passed && result.severity === 'error');
  }

  async getValidationSummary(metrics: any): Promise<{
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    passedCount: number;
    totalRules: number;
    errors: ValidationResult[];
    warnings: ValidationResult[];
  }> {
    const results = await this.validateMetrics(metrics);
    
    const errors = results.filter(r => !r.passed && r.severity === 'error');
    const warnings = results.filter(r => !r.passed && r.severity === 'warning');
    const passed = results.filter(r => r.passed);

    return {
      isValid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      passedCount: passed.length,
      totalRules: results.length,
      errors,
      warnings
    };
  }

  calculateQualityScore(validationResults: ValidationResult[]): number {
    if (validationResults.length === 0) return 0;

    let score = 100;
    
    for (const result of validationResults) {
      if (!result.passed) {
        if (result.severity === 'error') {
          score -= 20; // Major penalty for errors
        } else if (result.severity === 'warning') {
          score -= 5; // Minor penalty for warnings
        }
      }
    }

    return Math.max(0, score);
  }

  detectAnomalies(metrics: any, historicalData?: any[]): boolean {
    // Basic anomaly detection
    if (!historicalData || historicalData.length === 0) {
      return false;
    }

    try {
      // Calculate average metrics from historical data
      const avgViews = this.calculateAverage(historicalData, 'metrics.views');
      const avgLikes = this.calculateAverage(historicalData, 'metrics.likes');
      const avgComments = this.calculateAverage(historicalData, 'metrics.comments');

      // Check for significant spikes (more than 500% of average)
      const viewsSpike = metrics.metrics.views > avgViews * 5;
      const likesSpike = metrics.metrics.likes > avgLikes * 5;
      const commentsSpike = metrics.metrics.comments > avgComments * 5;

      // Check for unusual ratios
      const viewLikeRatio = metrics.metrics.views > 0 ? metrics.metrics.likes / metrics.metrics.views : 0;
      const avgViewLikeRatio = this.calculateAverageRatio(historicalData, 'metrics.likes', 'metrics.views');
      const ratioAnomaly = Math.abs(viewLikeRatio - avgViewLikeRatio) > avgViewLikeRatio * 2;

      return viewsSpike || likesSpike || commentsSpike || ratioAnomaly;
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return false;
    }
  }

  addCustomRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }

  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  updateRule(ruleName: string, updates: Partial<ValidationRule>): void {
    const ruleIndex = this.rules.findIndex(rule => rule.name === ruleName);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    }
  }

  private getFieldValue(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private calculateAverage(data: any[], fieldPath: string): number {
    const values = data
      .map(item => this.getFieldValue(item, fieldPath))
      .filter(value => typeof value === 'number' && !isNaN(value));
    
    if (values.length === 0) return 0;
    
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private calculateAverageRatio(data: any[], numeratorPath: string, denominatorPath: string): number {
    const ratios = data
      .map(item => {
        const numerator = this.getFieldValue(item, numeratorPath);
        const denominator = this.getFieldValue(item, denominatorPath);
        
        if (typeof numerator === 'number' && typeof denominator === 'number' && denominator > 0) {
          return numerator / denominator;
        }
        return null;
      })
      .filter(ratio => ratio !== null) as number[];
    
    if (ratios.length === 0) return 0;
    
    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  }
}