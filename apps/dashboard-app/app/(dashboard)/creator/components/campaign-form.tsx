'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Alert, AlertDescription } from '@repo/ui';

interface CampaignMaterial {
  type: 'google_drive' | 'youtube' | 'image' | 'video';
  url: string;
  title: string;
  description?: string;
}

interface CampaignFormData {
  title: string;
  description: string;
  budget: number;
  ratePerView: number;
  requirements: string[];
  startDate: string;
  endDate: string;
  materials: CampaignMaterial[];
}

export function CampaignForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    description: '',
    budget: 0,
    ratePerView: 0,
    requirements: [''],
    startDate: '',
    endDate: '',
    materials: [],
  });

  const [newMaterial, setNewMaterial] = useState<CampaignMaterial>({
    type: 'google_drive',
    url: '',
    title: '',
    description: '',
  });

  const handleInputChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData(prev => ({
      ...prev,
      requirements: newRequirements,
    }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, ''],
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const addMaterial = () => {
    if (newMaterial.url && newMaterial.title) {
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, newMaterial],
      }));
      setNewMaterial({
        type: 'google_drive',
        url: '',
        title: '',
        description: '',
      });
    }
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Filter out empty requirements
      const cleanedData = {
        ...formData,
        requirements: formData.requirements.filter(req => req.trim() !== ''),
      };

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }

      const result = await response.json();
      router.push(`/creator/campaigns/${result.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const maxViews = formData.budget && formData.ratePerView 
    ? Math.floor(formData.budget / formData.ratePerView)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Campaign Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter campaign title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your campaign goals and content"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Budget & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Budget & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Total Budget (Rp) *</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget || ''}
                onChange={(e) => handleInputChange('budget', Number(e.target.value))}
                placeholder="1000000"
                min="1"
                required
              />
            </div>

            <div>
              <Label htmlFor="ratePerView">Rate per View (Rp) *</Label>
              <Input
                id="ratePerView"
                type="number"
                value={formData.ratePerView || ''}
                onChange={(e) => handleInputChange('ratePerView', Number(e.target.value))}
                placeholder="1000"
                min="1"
                required
              />
            </div>
          </div>

          {maxViews > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Estimated Maximum Views:</strong> {maxViews.toLocaleString()} views
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Based on your budget and rate per view
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Duration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Promoter Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.requirements.map((requirement, index) => (
            <div key={index} className="flex space-x-2">
              <Input
                value={requirement}
                onChange={(e) => handleRequirementChange(index, e.target.value)}
                placeholder="Enter requirement"
                className="flex-1"
              />
              {formData.requirements.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeRequirement(index)}
                  className="px-3"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addRequirement}>
            Add Requirement
          </Button>
        </CardContent>
      </Card>

      {/* Campaign Materials */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Materials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Material */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add Material</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="materialType">Type</Label>
                <select
                  id="materialType"
                  value={newMaterial.type}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="google_drive">Google Drive</option>
                  <option value="youtube">YouTube</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>

              <div>
                <Label htmlFor="materialTitle">Title</Label>
                <Input
                  id="materialTitle"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Material title"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="materialUrl">URL</Label>
              <Input
                id="materialUrl"
                value={newMaterial.url}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="materialDescription">Description (Optional)</Label>
              <Input
                id="materialDescription"
                value={newMaterial.description}
                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Material description"
              />
            </div>

            <Button type="button" onClick={addMaterial} variant="outline">
              Add Material
            </Button>
          </div>

          {/* Existing Materials */}
          {formData.materials.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Added Materials</h4>
              {formData.materials.map((material, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{material.title}</p>
                    <p className="text-sm text-gray-600">{material.type} - {material.url}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeMaterial(index)}
                    className="px-3"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex space-x-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}