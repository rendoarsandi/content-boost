'use client';

import React, { useState, useEffect } from 'react';
import { ABTestingService } from '@repo/database/services/ab-testing';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Progress } from './progress';

interface ABTestingDashboardProps {
  campaignId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

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

interface VariantPerformance {
  variant_id: string;
  clicks: number;
  views: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
}

export function ABTestingDashboard({
  campaignId,
  supabaseUrl,
  supabaseKey,
}: ABTestingDashboardProps) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [performance, setPerformance] = useState<VariantPerformance[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    variants: [
      {
        name: 'Control',
        description: 'Original version',
        config: {},
        traffic_percentage: 50,
      },
      {
        name: 'Variant A',
        description: 'Test version',
        config: {},
        traffic_percentage: 50,
      },
    ],
  });

  const abTestingService = new ABTestingService(supabaseUrl, supabaseKey);

  useEffect(() => {
    loadABTests();
  }, [campaignId]);

  const loadABTests = async () => {
    setLoading(true);
    const { tests: testsData, error: testsError } =
      await abTestingService.getABTests(campaignId);

    if (testsError) {
      setError(testsError);
    } else {
      setTests(testsData || []);
    }
    setLoading(false);
  };

  const createABTest = async () => {
    const { test, error: createError } = await abTestingService.createABTest({
      campaign_id: campaignId,
      name: newTest.name,
      description: newTest.description,
      variants: newTest.variants as ABTestVariant[],
      status: 'draft',
      start_date: null,
      end_date: null,
      winner_variant_id: null,
    });

    if (createError) {
      setError(createError);
    } else {
      setShowCreateDialog(false);
      setNewTest({
        name: '',
        description: '',
        variants: [
          {
            name: 'Control',
            description: 'Original version',
            config: {},
            traffic_percentage: 50,
          },
          {
            name: 'Variant A',
            description: 'Test version',
            config: {},
            traffic_percentage: 50,
          },
        ],
      });
      loadABTests();
    }
  };

  const startTest = async (testId: string) => {
    const { success, error: statusError } =
      await abTestingService.updateABTestStatus(testId, 'active');

    if (statusError) {
      setError(statusError);
    } else {
      loadABTests();
    }
  };

  const pauseTest = async (testId: string) => {
    const { success, error: statusError } =
      await abTestingService.updateABTestStatus(testId, 'paused');

    if (statusError) {
      setError(statusError);
    } else {
      loadABTests();
    }
  };

  const loadTestPerformance = async (testId: string) => {
    const { performance: performanceData, error: performanceError } =
      await abTestingService.getVariantPerformance(testId);

    if (performanceError) {
      setError(performanceError);
    } else {
      setPerformance(performanceData || []);
    }
  };

  const selectWinner = async (testId: string, variantId: string) => {
    const { success, error: winnerError } = await abTestingService.selectWinner(
      testId,
      variantId
    );

    if (winnerError) {
      setError(winnerError);
    } else {
      loadABTests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading A/B tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">A/B Testing</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create A/B Test
        </Button>
      </div>

      {/* Tests List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tests.map(test => (
          <Card
            key={test.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <Badge className={getStatusColor(test.status)}>
                  {test.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{test.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Variants:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {test.variants.map(variant => (
                      <Badge
                        key={variant.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {variant.name} ({variant.traffic_percentage}%)
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {test.status === 'draft' && (
                    <Button size="sm" onClick={() => startTest(test.id)}>
                      Start Test
                    </Button>
                  )}
                  {test.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pauseTest(test.id)}
                    >
                      Pause
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTest(test);
                      loadTestPerformance(test.id);
                    }}
                  >
                    View Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              No A/B tests found for this campaign
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              Create Your First A/B Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Test Name</label>
              <Input
                value={newTest.name}
                onChange={e =>
                  setNewTest(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Landing Page Headlines"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newTest.description}
                onChange={e =>
                  setNewTest(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of what you're testing"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Variants</label>
              <div className="space-y-2">
                {newTest.variants.map((variant, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      value={variant.name}
                      onChange={e => {
                        const updatedVariants = [...newTest.variants];
                        updatedVariants[index].name = e.target.value;
                        setNewTest(prev => ({
                          ...prev,
                          variants: updatedVariants,
                        }));
                      }}
                      placeholder="Variant name"
                    />
                    <Input
                      type="number"
                      value={variant.traffic_percentage}
                      onChange={e => {
                        const updatedVariants = [...newTest.variants];
                        updatedVariants[index].traffic_percentage = Number(
                          e.target.value
                        );
                        setNewTest(prev => ({
                          ...prev,
                          variants: updatedVariants,
                        }));
                      }}
                      placeholder="Traffic %"
                      className="w-24"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={createABTest}>Create Test</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Dialog */}
      <Dialog
        open={selectedTest !== null}
        onOpenChange={() => setSelectedTest(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTest?.name} - Performance Results
            </DialogTitle>
          </DialogHeader>
          {selectedTest && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {performance.map((variantPerf, index) => {
                  const variant = selectedTest.variants.find(
                    v => v.id === variantPerf.variant_id
                  );
                  const isWinner =
                    selectedTest.winner_variant_id === variantPerf.variant_id;

                  return (
                    <Card
                      key={variantPerf.variant_id}
                      className={isWinner ? 'border-green-500' : ''}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">
                            {variant?.name || 'Unknown'}
                          </CardTitle>
                          {isWinner && (
                            <Badge className="bg-green-100 text-green-800">
                              Winner
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Views</p>
                              <p className="text-2xl font-bold">
                                {variantPerf.views.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Clicks</p>
                              <p className="text-2xl font-bold">
                                {variantPerf.clicks.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">CTR</p>
                              <p className="text-xl font-semibold text-blue-600">
                                {formatPercentage(variantPerf.ctr)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                Conversions
                              </p>
                              <p className="text-xl font-semibold text-green-600">
                                {variantPerf.conversions}
                              </p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Conversion Rate</span>
                              <span>
                                {formatPercentage(variantPerf.conversion_rate)}
                              </span>
                            </div>
                            <Progress
                              value={variantPerf.conversion_rate}
                              className="mt-1"
                            />
                          </div>

                          {selectedTest.status === 'active' &&
                            !selectedTest.winner_variant_id && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  selectWinner(
                                    selectedTest.id,
                                    variantPerf.variant_id
                                  )
                                }
                                className="w-full"
                              >
                                Select as Winner
                              </Button>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
