"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignTemplateService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class CampaignTemplateService {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    async getTemplates(category) {
        try {
            let query = this.supabase
                .from('campaign_templates')
                .select('*')
                .order('name', { ascending: true });
            if (category) {
                query = query.eq('category', category);
            }
            const { data, error } = await query;
            if (error) {
                return { templates: null, error: error.message };
            }
            return { templates: data || [], error: null };
        }
        catch (error) {
            return { templates: null, error: 'Failed to fetch templates' };
        }
    }
    async getTemplate(templateId) {
        try {
            const { data, error } = await this.supabase
                .from('campaign_templates')
                .select('*')
                .eq('id', templateId)
                .single();
            if (error) {
                return { template: null, error: error.message };
            }
            return { template: data, error: null };
        }
        catch (error) {
            return { template: null, error: 'Failed to fetch template' };
        }
    }
    async createCampaignFromTemplate(request) {
        try {
            // Get the template
            const { template, error: templateError } = await this.getTemplate(request.template_id);
            if (templateError) {
                return { campaign: null, error: templateError };
            }
            if (!template) {
                return { campaign: null, error: 'Template not found' };
            }
            // Process template variables
            let title = request.customizations.title || template.template_config.title_template;
            let description = request.customizations.description ||
                template.template_config.description_template;
            // Replace common template variables
            const now = new Date();
            const replacements = {
                '{{CURRENT_YEAR}}': now.getFullYear().toString(),
                '{{CURRENT_MONTH}}': now.toLocaleDateString('en-US', { month: 'long' }),
                '{{SEASON}}': this.getCurrentSeason(),
                '{{COMPANY_NAME}}': '[Your Company Name]',
                '{{PRODUCT_NAME}}': '[Your Product Name]',
            };
            Object.entries(replacements).forEach(([placeholder, value]) => {
                title = title.replace(new RegExp(placeholder, 'g'), value);
                description = description.replace(new RegExp(placeholder, 'g'), value);
            });
            // Create the campaign
            const campaignData = {
                creator_id: request.creator_id,
                title: title,
                description: description,
                budget: request.customizations.budget ||
                    template.template_config.default_budget,
                status: 'draft',
                template_id: request.template_id,
                target_audience: request.customizations.target_audience ||
                    template.template_config.audience_targeting.demographics,
                duration_days: request.customizations.duration ||
                    template.template_config.recommended_duration,
                requirements: {
                    content_guidelines: template.template_config.content_guidelines,
                    promotional_materials: template.template_config.promotional_materials,
                    target_metrics: template.template_config.target_metrics,
                    additional_requirements: request.customizations.additional_requirements || '',
                },
            };
            const { data: campaign, error: campaignError } = await this.supabase
                .from('campaigns')
                .insert(campaignData)
                .select()
                .single();
            if (campaignError) {
                return { campaign: null, error: campaignError.message };
            }
            return { campaign, error: null };
        }
        catch (error) {
            return {
                campaign: null,
                error: 'Failed to create campaign from template',
            };
        }
    }
    async createTemplate(template) {
        try {
            const { data, error } = await this.supabase
                .from('campaign_templates')
                .insert({
                ...template,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error) {
                return { template: null, error: error.message };
            }
            return { template: data, error: null };
        }
        catch (error) {
            return { template: null, error: 'Failed to create template' };
        }
    }
    async updateTemplate(templateId, updates) {
        try {
            const { error } = await this.supabase
                .from('campaign_templates')
                .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
                .eq('id', templateId);
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: 'Failed to update template' };
        }
    }
    async deleteTemplate(templateId) {
        try {
            const { error } = await this.supabase
                .from('campaign_templates')
                .delete()
                .eq('id', templateId);
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: 'Failed to delete template' };
        }
    }
    async getPopularTemplates(limit = 10) {
        try {
            // Get templates with usage count (assuming we track this)
            const { data, error } = await this.supabase
                .from('campaign_templates')
                .select(`
          *,
          campaigns_count:campaigns(count)
        `)
                .order('campaigns_count', { ascending: false })
                .limit(limit);
            if (error) {
                return { templates: null, error: error.message };
            }
            return { templates: data || [], error: null };
        }
        catch (error) {
            // Fallback to regular query if aggregate doesn't work
            return this.getTemplates();
        }
    }
    getCurrentSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month <= 4)
            return 'Spring';
        if (month >= 5 && month <= 7)
            return 'Summer';
        if (month >= 8 && month <= 10)
            return 'Fall';
        return 'Winter';
    }
    // Seed method to create default templates
    async seedDefaultTemplates() {
        const defaultTemplates = [
            {
                name: 'Product Launch Campaign',
                description: 'Perfect for introducing a new product to the market with maximum impact.',
                category: 'product_launch',
                template_config: {
                    title_template: '🚀 Introducing {{PRODUCT_NAME}} - Revolutionary {{CURRENT_YEAR}} Launch!',
                    description_template: "We're excited to launch {{PRODUCT_NAME}} this {{CURRENT_MONTH}}! Help us spread the word about this innovative solution that will transform how people [describe main benefit]. Join our exclusive launch campaign and be among the first to share this amazing product with your audience.",
                    default_budget: 5000,
                    recommended_duration: 30,
                    target_metrics: [
                        'reach',
                        'engagement',
                        'conversions',
                        'brand_awareness',
                    ],
                    content_guidelines: [
                        'Focus on product benefits and unique features',
                        'Include high-quality product images or videos',
                        "Emphasize the 'new' and 'innovative' aspects",
                        'Use launch-specific language and urgency',
                    ],
                    promotional_materials: [
                        {
                            type: 'Product Images',
                            required: true,
                            description: 'High-resolution product photos from multiple angles',
                        },
                        {
                            type: 'Demo Video',
                            required: true,
                            description: 'Short video showing the product in action',
                        },
                        {
                            type: 'Key Features List',
                            required: true,
                            description: 'Bullet points highlighting main product benefits',
                        },
                        {
                            type: 'Launch Announcement Graphics',
                            required: false,
                            description: 'Branded graphics announcing the product launch',
                        },
                    ],
                    audience_targeting: {
                        demographics: [
                            'early_adopters',
                            'tech_enthusiasts',
                            'target_age_group',
                        ],
                        interests: ['innovation', 'new_products', 'technology'],
                        platforms: ['instagram', 'facebook', 'twitter', 'youtube'],
                    },
                    best_practices: [
                        'Create anticipation with teaser content',
                        'Partner with micro-influencers in your niche',
                        'Offer exclusive early access or discounts',
                        'Document the launch journey behind-the-scenes',
                    ],
                },
                preview_image: '/templates/product-launch.png',
            },
            {
                name: 'Brand Awareness Campaign',
                description: 'Build recognition and establish your brand presence in the market.',
                category: 'brand_awareness',
                template_config: {
                    title_template: 'Get to Know {{COMPANY_NAME}} - {{CURRENT_YEAR}} Brand Story',
                    description_template: "We're on a mission to [describe company mission]. This {{SEASON}}, help us share our story and connect with people who share our values. Join our brand awareness campaign and introduce your audience to who we are and what we stand for.",
                    default_budget: 3000,
                    recommended_duration: 45,
                    target_metrics: [
                        'reach',
                        'brand_mentions',
                        'engagement',
                        'follower_growth',
                    ],
                    content_guidelines: [
                        'Tell authentic brand stories',
                        'Showcase company values and culture',
                        'Focus on emotional connection over sales',
                        'Maintain consistent brand voice and visuals',
                    ],
                    promotional_materials: [
                        {
                            type: 'Brand Story Video',
                            required: true,
                            description: 'Video explaining company mission and values',
                        },
                        {
                            type: 'Brand Guidelines',
                            required: true,
                            description: 'Logo, colors, fonts, and brand voice guidelines',
                        },
                        {
                            type: 'Team Photos',
                            required: false,
                            description: 'Behind-the-scenes photos of the team and workspace',
                        },
                        {
                            type: 'Brand Assets Kit',
                            required: true,
                            description: 'Collection of branded graphics and templates',
                        },
                    ],
                    audience_targeting: {
                        demographics: ['target_market', 'brand_aligned_values'],
                        interests: ['brand_values', 'company_industry', 'lifestyle'],
                        platforms: ['instagram', 'facebook', 'linkedin', 'tiktok'],
                    },
                    best_practices: [
                        'Focus on storytelling over selling',
                        'Engage with community conversations',
                        'Share user-generated content',
                        'Collaborate with brand-aligned creators',
                    ],
                },
                preview_image: '/templates/brand-awareness.png',
            },
            {
                name: 'Seasonal Promotion',
                description: 'Capitalize on seasonal trends and holidays for timely promotional campaigns.',
                category: 'seasonal',
                template_config: {
                    title_template: '{{SEASON}} {{CURRENT_YEAR}} Special - Limited Time Offer!',
                    description_template: "This {{SEASON}} season calls for something special! We're offering exclusive deals and seasonal products that your audience will love. Help us make this {{CURRENT_MONTH}} memorable with promotions that capture the {{SEASON}} spirit.",
                    default_budget: 4000,
                    recommended_duration: 21,
                    target_metrics: [
                        'sales',
                        'conversions',
                        'seasonal_engagement',
                        'urgency_response',
                    ],
                    content_guidelines: [
                        'Incorporate seasonal themes and imagery',
                        'Create urgency with limited-time offers',
                        'Use season-appropriate colors and styling',
                        'Connect products to seasonal needs or occasions',
                    ],
                    promotional_materials: [
                        {
                            type: 'Seasonal Product Images',
                            required: true,
                            description: 'Products styled with seasonal themes and settings',
                        },
                        {
                            type: 'Promotional Graphics',
                            required: true,
                            description: 'Sale banners and promotional graphics with seasonal design',
                        },
                        {
                            type: 'Seasonal Lifestyle Content',
                            required: false,
                            description: 'Content showing products in seasonal contexts',
                        },
                        {
                            type: 'Countdown Graphics',
                            required: false,
                            description: 'Graphics showing time-limited nature of offers',
                        },
                    ],
                    audience_targeting: {
                        demographics: [
                            'seasonal_shoppers',
                            'gift_buyers',
                            'trend_followers',
                        ],
                        interests: [
                            'seasonal_activities',
                            'holidays',
                            'shopping',
                            'trends',
                        ],
                        platforms: ['instagram', 'facebook', 'pinterest', 'twitter'],
                    },
                    best_practices: [
                        'Start campaigns early to build anticipation',
                        'Use seasonal hashtags and trends',
                        'Create gift guides and seasonal collections',
                        'Partner with lifestyle and seasonal content creators',
                    ],
                },
                preview_image: '/templates/seasonal-promotion.png',
            },
            {
                name: 'User-Generated Content Campaign',
                description: 'Encourage customers to create content featuring your brand or products.',
                category: 'user_generated_content',
                template_config: {
                    title_template: 'Show Us Your {{PRODUCT_NAME}} Style - {{CURRENT_YEAR}} UGC Challenge!',
                    description_template: "We love seeing how our customers use {{PRODUCT_NAME}} in their daily lives! Join our user-generated content campaign and encourage your audience to share their own creative content. Let's build a community of brand advocates together.",
                    default_budget: 2500,
                    recommended_duration: 60,
                    target_metrics: [
                        'user_generated_posts',
                        'hashtag_usage',
                        'community_engagement',
                        'brand_mentions',
                    ],
                    content_guidelines: [
                        'Encourage authentic, creative user content',
                        'Provide clear hashtag and tagging instructions',
                        'Showcase diverse user stories and use cases',
                        'Respond to and engage with user submissions',
                    ],
                    promotional_materials: [
                        {
                            type: 'Campaign Guidelines',
                            required: true,
                            description: 'Clear instructions for users on how to participate',
                        },
                        {
                            type: 'Hashtag Kit',
                            required: true,
                            description: 'Branded hashtags and tagging guidelines',
                        },
                        {
                            type: 'Example Content',
                            required: true,
                            description: "Examples showing the type of content you're looking for",
                        },
                        {
                            type: 'Prize Information',
                            required: false,
                            description: 'Details about rewards or recognition for participants',
                        },
                    ],
                    audience_targeting: {
                        demographics: [
                            'existing_customers',
                            'brand_enthusiasts',
                            'content_creators',
                        ],
                        interests: [
                            'photography',
                            'creativity',
                            'community',
                            'brand_loyalty',
                        ],
                        platforms: ['instagram', 'tiktok', 'facebook', 'youtube'],
                    },
                    best_practices: [
                        'Make participation easy and fun',
                        'Feature user content on your own channels',
                        'Engage with every submission',
                        'Create a sense of community around the campaign',
                    ],
                },
                preview_image: '/templates/ugc-campaign.png',
            },
        ];
        try {
            for (const template of defaultTemplates) {
                await this.createTemplate(template);
            }
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error: 'Failed to seed default templates' };
        }
    }
}
exports.CampaignTemplateService = CampaignTemplateService;
//# sourceMappingURL=campaign-templates.js.map