"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestingService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class ABTestingService {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async createABTest(test) {
        try {
            const { data: testData, error: testError } = await this.supabase
                .from('ab_tests')
                .insert({
                campaign_id: test.campaign_id,
                name: test.name,
                description: test.description,
                status: test.status,
                start_date: test.start_date,
                end_date: test.end_date,
                winner_variant_id: test.winner_variant_id,
            })
                .select()
                .single();
            if (testError) {
                return { test: null, error: testError.message };
            }
            // Create variants
            const variants = test.variants.map(variant => ({
                test_id: testData.id,
                name: variant.name,
                description: variant.description,
                config: variant.config,
                traffic_percentage: variant.traffic_percentage,
            }));
            const { data: variantsData, error: variantsError } = await this.supabase
                .from('ab_test_variants')
                .insert(variants)
                .select();
            if (variantsError) {
                return { test: null, error: variantsError.message };
            }
            return {
                test: { ...testData, variants: variantsData },
                error: null,
            };
        }
        catch (error) {
            return { test: null, error: 'Failed to create A/B test' };
        }
    }
    async getABTests(campaignId) {
        try {
            const { data, error } = await this.supabase
                .from('ab_tests')
                .select(`
          id,
          campaign_id,
          name,
          description,
          status,
          start_date,
          end_date,
          winner_variant_id,
          created_at,
          updated_at,
          ab_test_variants (
            id,
            test_id,
            name,
            description,
            config,
            traffic_percentage,
            created_at
          )
        `)
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });
            if (error) {
                return { tests: null, error: error.message };
            }
            const tests = data?.map((test) => ({
                ...test,
                variants: test.ab_test_variants,
            })) || [];
            return { tests, error: null };
        }
        catch (error) {
            return { tests: null, error: 'Failed to fetch A/B tests' };
        }
    }
    async getABTest(testId) {
        try {
            const { data, error } = await this.supabase
                .from('ab_tests')
                .select(`
          id,
          campaign_id,
          name,
          description,
          status,
          start_date,
          end_date,
          winner_variant_id,
          created_at,
          updated_at,
          ab_test_variants (
            id,
            test_id,
            name,
            description,
            config,
            traffic_percentage,
            created_at
          )
        `)
                .eq('id', testId)
                .single();
            if (error) {
                return { test: null, error: error.message };
            }
            const test = {
                ...data,
                variants: data.ab_test_variants,
            };
            return { test, error: null };
        }
        catch (error) {
            return { test: null, error: 'Failed to fetch A/B test' };
        }
    }
    async updateABTestStatus(testId, status) {
        try {
            const { error } = await this.supabase
                .from('ab_tests')
                .update({
                status,
                start_date: status === 'active' ? new Date().toISOString() : undefined,
                updated_at: new Date().toISOString(),
            })
                .eq('id', testId);
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: 'Failed to update A/B test status' };
        }
    }
    async recordMetric(testId, variantId, metricType, value) {
        try {
            const { error } = await this.supabase.from('ab_test_metrics').insert({
                test_id: testId,
                variant_id: variantId,
                metric_type: metricType,
                value: value,
                recorded_at: new Date().toISOString(),
            });
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: 'Failed to record metric' };
        }
    }
    async getTestMetrics(testId) {
        try {
            const { data, error } = await this.supabase
                .from('ab_test_metrics')
                .select('*')
                .eq('test_id', testId)
                .order('recorded_at', { ascending: false });
            if (error) {
                return { metrics: null, error: error.message };
            }
            return { metrics: data || [], error: null };
        }
        catch (error) {
            return { metrics: null, error: 'Failed to fetch test metrics' };
        }
    }
    async getVariantPerformance(testId) {
        try {
            const { data, error } = await this.supabase.rpc('get_variant_performance', { test_id: testId });
            if (error) {
                return { performance: null, error: error.message };
            }
            return { performance: data, error: null };
        }
        catch (error) {
            // Fallback to manual calculation if RPC doesn't exist
            const { metrics, error: metricsError } = await this.getTestMetrics(testId);
            if (metricsError) {
                return { performance: null, error: metricsError };
            }
            // Calculate performance manually
            const variantPerformance = {};
            metrics?.forEach(metric => {
                if (!variantPerformance[metric.variant_id]) {
                    variantPerformance[metric.variant_id] = {
                        variant_id: metric.variant_id,
                        clicks: 0,
                        views: 0,
                        conversions: 0,
                        ctr: 0,
                        conversion_rate: 0,
                    };
                }
                variantPerformance[metric.variant_id][metric.metric_type] =
                    metric.value;
            });
            // Calculate derived metrics
            Object.values(variantPerformance).forEach((performance) => {
                if (performance.views > 0) {
                    performance.ctr = (performance.clicks / performance.views) * 100;
                }
                if (performance.clicks > 0) {
                    performance.conversion_rate =
                        (performance.conversions / performance.clicks) * 100;
                }
            });
            return { performance: Object.values(variantPerformance), error: null };
        }
    }
    async selectWinner(testId, variantId) {
        try {
            const { error } = await this.supabase
                .from('ab_tests')
                .update({
                winner_variant_id: variantId,
                status: 'completed',
                end_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .eq('id', testId);
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: 'Failed to select winner' };
        }
    }
}
exports.ABTestingService = ABTestingService;
//# sourceMappingURL=ab-testing.js.map