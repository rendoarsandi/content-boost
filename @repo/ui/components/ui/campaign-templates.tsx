'use client';

import React, { useState, useEffect } from 'react';
import { CampaignTemplateService } from '@repo/database/services/campaign-templates';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Textarea } from './textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import {
  Rocket,
  Target,
  Calendar,
  Users,
  TrendingUp,
  Camera,
  Star,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface CampaignTemplatesProps {
  creatorId: string;
  supabaseUrl: string;
  supabaseKey: string;
  onCampaignCreated?: (campaign: any) => void;
}

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template_config: {
    title_template: string;
    description_template: string;
    default_budget: number;
    recommended_duration: number;
    target_metrics: string[];
    content_guidelines: string[];
    promotional_materials: Array<{
      type: string;
      required: boolean;
      description: string;
    }>;
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

export function CampaignTemplates({
  creatorId,
  supabaseUrl,
  supabaseKey,
  onCampaignCreated,
}: CampaignTemplatesProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<
    CampaignTemplate[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CampaignTemplate | null>(null);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [customizations, setCustomizations] = useState({
    title: '',
    description: '',
    budget: 0,
    duration: 0,
    target_audience: [] as string[],
    additional_requirements: '',
  });

  const templateService = new CampaignTemplateService(supabaseUrl, supabaseKey);

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'product_launch', label: 'Product Launch' },
    { value: 'brand_awareness', label: 'Brand Awareness' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'conversion', label: 'Conversion' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'user_generated_content', label: 'User Generated Content' },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'product_launch':
        return <Rocket className="h-5 w-5" />;
      case 'brand_awareness':
        return <Target className="h-5 w-5" />;
      case 'seasonal':
        return <Calendar className="h-5 w-5" />;
      case 'conversion':
        return <TrendingUp className="h-5 w-5" />;
      case 'engagement':
        return <Users className="h-5 w-5" />;
      case 'user_generated_content':
        return <Camera className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'product_launch':
        return 'bg-blue-100 text-blue-800';
      case 'brand_awareness':
        return 'bg-purple-100 text-purple-800';
      case 'seasonal':
        return 'bg-orange-100 text-orange-800';
      case 'conversion':
        return 'bg-green-100 text-green-800';
      case 'engagement':
        return 'bg-pink-100 text-pink-800';
      case 'user_generated_content':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    const { templates: templatesData, error: templatesError } =
      await templateService.getTemplates();

    if (templatesError) {
      setError(templatesError);
    } else {
      setTemplates(templatesData || []);
    }
    setLoading(false);
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        template => template.category === selectedCategory
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        template =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setCustomizations({
      title: template.template_config.title_template,
      description: template.template_config.description_template,
      budget: template.template_config.default_budget,
      duration: template.template_config.recommended_duration,
      target_audience: template.template_config.audience_targeting.demographics,
      additional_requirements: '',
    });
    setShowCustomizationDialog(true);
  };

  const createCampaignFromTemplate = async () => {
    if (!selectedTemplate) return;

    setCreating(true);
    setError(null);

    const { campaign, error: createError } =
      await templateService.createCampaignFromTemplate({
        template_id: selectedTemplate.id,
        creator_id: creatorId,
        customizations,
      });

    if (createError) {
      setError(createError);
    } else {
      setShowCustomizationDialog(false);
      setSelectedTemplate(null);
      if (onCampaignCreated) {
        onCampaignCreated(campaign);
      }
    }
    setCreating(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campaign Templates</h2>
          <p className="text-gray-600">
            Choose from proven campaign templates to get started quickly
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:w-64">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map(template => (
          <Card
            key={template.id}
            className="hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(template.category)}
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                {template.name}
              </CardTitle>
              <p className="text-sm text-gray-600 line-clamp-2">
                {template.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Budget:</span>
                    <p className="font-semibold">
                      {formatCurrency(template.template_config.default_budget)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="font-semibold">
                      {template.template_config.recommended_duration} days
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 text-sm">Target Metrics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.template_config.target_metrics
                      .slice(0, 3)
                      .map(metric => (
                        <Badge
                          key={metric}
                          variant="outline"
                          className="text-xs"
                        >
                          {metric.replace('_', ' ')}
                        </Badge>
                      ))}
                    {template.template_config.target_metrics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.template_config.target_metrics.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 text-sm">Platforms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.template_config.audience_targeting.platforms
                      .slice(0, 3)
                      .map(platform => (
                        <Badge
                          key={platform}
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {platform}
                        </Badge>
                      ))}
                  </div>
                </div>

                <Button
                  className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                  variant="outline"
                >
                  Use This Template
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              No templates found matching your criteria
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Customization Dialog */}
      <Dialog
        open={showCustomizationDialog}
        onOpenChange={setShowCustomizationDialog}
      >
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedTemplate && getCategoryIcon(selectedTemplate.category)}
              <span>Customize: {selectedTemplate?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <Tabs defaultValue="customize" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customize">Customize</TabsTrigger>
                <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
              </TabsList>

              <TabsContent value="customize" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">
                      Campaign Title
                    </label>
                    <Input
                      value={customizations.title}
                      onChange={e =>
                        setCustomizations(prev => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Enter campaign title"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Campaign Description
                    </label>
                    <Textarea
                      value={customizations.description}
                      onChange={e =>
                        setCustomizations(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe your campaign"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Budget ($)</label>
                      <Input
                        type="number"
                        value={customizations.budget}
                        onChange={e =>
                          setCustomizations(prev => ({
                            ...prev,
                            budget: Number(e.target.value),
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Duration (days)
                      </label>
                      <Input
                        type="number"
                        value={customizations.duration}
                        onChange={e =>
                          setCustomizations(prev => ({
                            ...prev,
                            duration: Number(e.target.value),
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Additional Requirements
                    </label>
                    <Textarea
                      value={customizations.additional_requirements}
                      onChange={e =>
                        setCustomizations(prev => ({
                          ...prev,
                          additional_requirements: e.target.value,
                        }))
                      }
                      placeholder="Any specific requirements or notes"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomizationDialog(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createCampaignFromTemplate}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Campaign'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="guidelines" className="space-y-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Content Guidelines
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.template_config.content_guidelines.map(
                        (guideline, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{guideline}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Best Practices
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.template_config.best_practices.map(
                        (practice, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{practice}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Target Audience
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">
                          Demographics
                        </h4>
                        <div className="space-y-1">
                          {selectedTemplate.template_config.audience_targeting.demographics.map(
                            (demo, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs mr-1 mb-1"
                              >
                                {demo.replace('_', ' ')}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">
                          Interests
                        </h4>
                        <div className="space-y-1">
                          {selectedTemplate.template_config.audience_targeting.interests.map(
                            (interest, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs mr-1 mb-1"
                              >
                                {interest}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">
                          Platforms
                        </h4>
                        <div className="space-y-1">
                          {selectedTemplate.template_config.audience_targeting.platforms.map(
                            (platform, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs mr-1 mb-1 capitalize"
                              >
                                {platform}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Required Promotional Materials
                  </h3>
                  <div className="space-y-4">
                    {selectedTemplate.template_config.promotional_materials.map(
                      (material, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">
                                    {material.type}
                                  </h4>
                                  <Badge
                                    variant={
                                      material.required ? 'default' : 'outline'
                                    }
                                  >
                                    {material.required
                                      ? 'Required'
                                      : 'Optional'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {material.description}
                                </p>
                              </div>
                              {material.required && (
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
