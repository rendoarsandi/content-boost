import { NormalizationRule } from './types';
import { NORMALIZATION_RULES } from './constants';

export class MetricsNormalizer {
  private rules: NormalizationRule[];

  constructor(customRules?: NormalizationRule[]) {
    this.rules = customRules || NORMALIZATION_RULES;
  }

  async normalizeMetrics(metrics: any): Promise<{
    normalizedMetrics: any;
    appliedRules: string[];
  }> {
    let normalizedMetrics = this.deepClone(metrics);
    const appliedRules: string[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const currentValue = this.getFieldValue(normalizedMetrics, rule.field);
        const normalizedValue = rule.normalizer(currentValue);
        
        // Only apply if the value actually changed
        if (!this.isEqual(currentValue, normalizedValue)) {
          this.setFieldValue(normalizedMetrics, rule.field, normalizedValue);
          appliedRules.push(rule.name);
        }
      } catch (error) {
        console.error(`Normalization rule '${rule.name}' failed:`, error);
        // Continue with other rules even if one fails
      }
    }

    return {
      normalizedMetrics,
      appliedRules
    };
  }

  async normalizeMetricsBatch(metricsList: any[]): Promise<Array<{
    normalizedMetrics: any;
    appliedRules: string[];
  }>> {
    return Promise.all(
      metricsList.map(metrics => this.normalizeMetrics(metrics))
    );
  }

  addCustomRule(rule: NormalizationRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }

  enableRule(ruleName: string): void {
    const rule = this.rules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleName: string): void {
    const rule = this.rules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = false;
    }
  }

  getRules(): NormalizationRule[] {
    return [...this.rules];
  }

  getEnabledRules(): NormalizationRule[] {
    return this.rules.filter(rule => rule.enabled);
  }

  updateRule(ruleName: string, updates: Partial<NormalizationRule>): void {
    const ruleIndex = this.rules.findIndex(rule => rule.name === ruleName);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    }
  }

  // Utility method to test normalization without applying
  async previewNormalization(metrics: any): Promise<{
    original: any;
    normalized: any;
    changes: Array<{
      rule: string;
      field: string;
      originalValue: any;
      normalizedValue: any;
    }>;
  }> {
    const original = this.deepClone(metrics);
    const result = await this.normalizeMetrics(metrics);
    const changes: Array<{
      rule: string;
      field: string;
      originalValue: any;
      normalizedValue: any;
    }> = [];

    for (const ruleName of result.appliedRules) {
      const rule = this.rules.find(r => r.name === ruleName);
      if (rule) {
        const originalValue = this.getFieldValue(original, rule.field);
        const normalizedValue = this.getFieldValue(result.normalizedMetrics, rule.field);
        
        changes.push({
          rule: ruleName,
          field: rule.field,
          originalValue,
          normalizedValue
        });
      }
    }

    return {
      original,
      normalized: result.normalizedMetrics,
      changes
    };
  }

  // Built-in normalization functions that can be used in custom rules
  static normalizers = {
    trimString: (value: any): string => String(value).trim(),
    
    toLowerCase: (value: any): string => String(value).toLowerCase(),
    
    toUpperCase: (value: any): string => String(value).toUpperCase(),
    
    ensureInteger: (value: any): number => Math.floor(Number(value) || 0),
    
    ensurePositive: (value: any): number => Math.max(0, Number(value) || 0),
    
    capValue: (max: number) => (value: any): number => Math.min(Number(value) || 0, max),
    
    ensureDate: (value: any): Date => {
      if (value instanceof Date) return value;
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? new Date() : date;
      }
      return new Date();
    },
    
    roundToDecimals: (decimals: number) => (value: any): number => {
      const num = Number(value) || 0;
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    },
    
    removeSpecialChars: (value: any): string => {
      return String(value).replace(/[^\w\s-]/g, '');
    },
    
    normalizeUrl: (value: any): string => {
      const url = String(value).trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    },
    
    ensureArray: (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value === null || value === undefined) return [];
      return [value];
    }
  };

  private getFieldValue(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setFieldValue(obj: any, fieldPath: string, value: any): void {
    const keys = fieldPath.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined || current[key] === null) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((val, index) => this.isEqual(val, b[index]));
    }
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      return keysA.length === keysB.length && keysA.every(key => this.isEqual(a[key], b[key]));
    }
    return false;
  }
}