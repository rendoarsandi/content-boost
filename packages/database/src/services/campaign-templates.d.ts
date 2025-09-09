interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'product_launch'
    | 'brand_awareness'
    | 'seasonal'
    | 'conversion'
    | 'engagement'
    | 'user_generated_content';
  template_config: {
    title_template: string;
    description_template: string;
    default_budget: number;
    recommended_duration: number;
    target_metrics: string[];
    content_guidelines: string[];
    promotional_materials: {
      type: string;
      required: boolean;
      description: string;
    }[];
    audience_targeting: {
      demographics: string[];
      interests: string[];
      platforms: string[];
    };
    best_practices: string[];
  };
  preview_image: string;
  created_at: string;
  updated_at: string;
}
interface CreateCampaignFromTemplate {
  template_id: string;
  creator_id: string;
  customizations: {
    title?: string;
    description?: string;
    budget?: number;
    duration?: number;
    target_audience?: string[];
    additional_requirements?: string;
  };
}
export declare class CampaignTemplateService {
  private supabase;
  constructor(supabaseUrl: string, supabaseKey: string);
  getTemplates(category?: string): Promise<{
    templates: CampaignTemplate[] | null;
    error: string | null;
  }>;
  getTemplate(templateId: string): Promise<{
    template: CampaignTemplate | null;
    error: string | null;
  }>;
  createCampaignFromTemplate(request: CreateCampaignFromTemplate): Promise<{
    campaign: any | null;
    error: string | null;
  }>;
  createTemplate(
    template: Omit<CampaignTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{
    template: CampaignTemplate | null;
    error: string | null;
  }>;
  updateTemplate(
    templateId: string,
    updates: Partial<CampaignTemplate>
  ): Promise<{
    success: boolean;
    error: string | null;
  }>;
  deleteTemplate(templateId: string): Promise<{
    success: boolean;
    error: string | null;
  }>;
  getPopularTemplates(limit?: number): Promise<{
    templates: CampaignTemplate[] | null;
    error: string | null;
  }>;
  private getCurrentSeason;
  seedDefaultTemplates(): Promise<{
    success: boolean;
    error: string | null;
  }>;
}
export {};
//# sourceMappingURL=campaign-templates.d.ts.map
