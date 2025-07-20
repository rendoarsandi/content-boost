'use client';

import { useEffect, useState } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui';
import { Search, Eye, CheckCircle, XCircle, Pause, Play } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  creatorEmail: string;
  budget: number;
  ratePerView: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  createdAt: string;
  applicationsCount: number;
  totalViews: number;
  totalSpent: number;
}

export default function CampaignOversight() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns/admin');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampaignStatus = async (campaignId: string, newStatus: string) => {
    setActionLoading(campaignId);
    try {
      const response = await fetch(`/api/campaigns/admin/${campaignId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to update campaign status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns ({filteredCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium">{campaign.title}</h3>
                    <Badge className={getStatusBadgeColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Creator: {campaign.creatorName}</span>
                    <span>Budget: Rp {campaign.budget.toLocaleString('id-ID')}</span>
                    <span>Rate: Rp {campaign.ratePerView.toLocaleString('id-ID')}/view</span>
                    <span>Applications: {campaign.applicationsCount}</span>
                    <span>Views: {campaign.totalViews.toLocaleString('id-ID')}</span>
                    <span>Spent: Rp {campaign.totalSpent.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Campaign Details</DialogTitle>
                        <DialogDescription>
                          Detailed information about {selectedCampaign?.title}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedCampaign && (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <p className="text-sm text-gray-600">{selectedCampaign.title}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <p className="text-sm text-gray-600">{selectedCampaign.status}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Creator</label>
                              <p className="text-sm text-gray-600">{selectedCampaign.creatorName}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Creator Email</label>
                              <p className="text-sm text-gray-600">{selectedCampaign.creatorEmail}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Budget</label>
                              <p className="text-sm text-gray-600">
                                Rp {selectedCampaign.budget.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Rate per View</label>
                              <p className="text-sm text-gray-600">
                                Rp {selectedCampaign.ratePerView.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Applications</label>
                              <p className="text-sm text-gray-600">{selectedCampaign.applicationsCount}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Total Views</label>
                              <p className="text-sm text-gray-600">
                                {selectedCampaign.totalViews.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Total Spent</label>
                              <p className="text-sm text-gray-600">
                                Rp {selectedCampaign.totalSpent.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Created</label>
                              <p className="text-sm text-gray-600">
                                {new Date(selectedCampaign.createdAt).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <p className="text-sm text-gray-600">{selectedCampaign.description}</p>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {campaign.status === 'active' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === campaign.id}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Pause Campaign</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to pause "{campaign.title}"? This will stop all promotions.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateCampaignStatus(campaign.id, 'paused')}
                            disabled={actionLoading === campaign.id}
                          >
                            {actionLoading === campaign.id ? 'Pausing...' : 'Pause Campaign'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {campaign.status === 'paused' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === campaign.id}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resume Campaign</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to resume "{campaign.title}"? This will reactivate all promotions.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            onClick={() => handleUpdateCampaignStatus(campaign.id, 'active')}
                            disabled={actionLoading === campaign.id}
                          >
                            {actionLoading === campaign.id ? 'Resuming...' : 'Resume Campaign'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {(campaign.status === 'draft' || campaign.status === 'active') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionLoading === campaign.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          End
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>End Campaign</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to end "{campaign.title}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="destructive"
                            onClick={() => handleUpdateCampaignStatus(campaign.id, 'completed')}
                            disabled={actionLoading === campaign.id}
                          >
                            {actionLoading === campaign.id ? 'Ending...' : 'End Campaign'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
            {filteredCampaigns.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No campaigns found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}