interface ABTest {
    id: string;
    campaign_id: string;
    name: string;
    description: string;
    variants: ABTestVariant[];
    status: 'draft' | 'active' | 'completed' | 'paused';
    start_date: string | null;
    end_date: string | null;
    winner_variant_id: string | null;
    created_at: string;
    updated_at: string;
}
interface ABTestVariant {
    id: string;
    test_id: string;
    name: string;
    description: string;
    config: any;
    traffic_percentage: number;
    created_at: string;
}
interface ABTestMetric {
    id: string;
    test_id: string;
    variant_id: string;
    metric_type: 'clicks' | 'conversions' | 'views' | 'ctr' | 'conversion_rate';
    value: number;
    recorded_at: string;
}
export declare class ABTestingService {
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    createABTest(test: Omit<ABTest, 'id' | 'created_at' | 'updated_at'>): Promise<{
        test: ABTest | null;
        error: string | null;
    }>;
    getABTests(campaignId: string): Promise<{
        tests: ABTest[] | null;
        error: string | null;
    }>;
    getABTest(testId: string): Promise<{
        test: ABTest | null;
        error: string | null;
    }>;
    updateABTestStatus(testId: string, status: ABTest['status']): Promise<{
        success: boolean;
        error: string | null;
    }>;
    recordMetric(testId: string, variantId: string, metricType: ABTestMetric['metric_type'], value: number): Promise<{
        success: boolean;
        error: string | null;
    }>;
    getTestMetrics(testId: string): Promise<{
        metrics: ABTestMetric[] | null;
        error: string | null;
    }>;
    getVariantPerformance(testId: string): Promise<{
        performance: any | null;
        error: string | null;
    }>;
    selectWinner(testId: string, variantId: string): Promise<{
        success: boolean;
        error: string | null;
    }>;
}
export {};
//# sourceMappingURL=ab-testing.d.ts.map