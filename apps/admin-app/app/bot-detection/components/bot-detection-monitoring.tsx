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
  Progress,
} from '@repo/ui';
import { Search, Eye, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface BotDetection {
  id: string;
  promoterId: string;
  promoterName: string;
  promoterEmail: string;
  campaignId: string;
  campaignTitle: string;
  platform: 'tiktok' | 'instagram';
  botScore: number;
  confidence: 'low' | 'medium' | 'high';
  action: 'none' | 'monitor' | 'warning' | 'ban';
  status: 'pending' | 'reviewed' | 'dismissed';
  detectedAt: string;
  reviewedAt?: string;
  metrics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    viewLikeRatio: number;
    viewCommentRatio: number;
    spikeDetected: boolean;
    spikePercentage?: number;
  };
  reason: string;
}

interface BotStats {
  totalDetections: number;
  pendingReview: number;
  highConfidence: number;
  bannedUsers: number;
  falsePositives: number;
}

export default function BotDetectionMonitoring() {
  const [detections, setDetections] = useState<BotDetection[]>([]);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDetection, setSelectedDetection] = useState<BotDetection | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchBotDetections();
    fetchBotStats();
  }, []);

  const fetchBotDetections = async () => {
    try {
      const response = await fetch('/api/bot-detection');
      if (response.ok) {
        const data = await response.json();
        setDetections(data);
      }
    } catch (error) {
      console.error('Failed to fetch bot detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBotStats = async () => {
    try {
      const response = await fetch('/api/bot-detection/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch bot stats:', error);
    }
  };

  const handleReviewDetection = async (detectionId: string, action: 'approve' | 'dismiss') => {
    setActionLoading(detectionId);
    try {
      const response = await fetch(`/api/bot-detection/${detectionId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        await fetchBotDetections();
        await fetchBotStats();
      }
    } catch (error) {
      console.error('Failed to review detection:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredDetections = detections.filter(detection => {
    const matchesSearch = detection.promoterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         detection.campaignTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesConfidence = confidenceFilter === 'all' || detection.confidence === confidenceFilter;
    const matchesStatus = statusFilter === 'all' || detection.status === statusFilter;
    
    return matchesSearch && matchesConfidence && matchesStatus;
  });

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'ban': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-orange-100 text-orange-800';
      case 'monitor': return 'bg-blue-100 text-blue-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Detections</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDetections}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReview}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highConfidence}</div>
              <p className="text-xs text-muted-foreground">Likely bots</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banned Users</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bannedUsers}</div>
              <p className="text-xs text-muted-foreground">Auto-banned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">False Positives</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.falsePositives}</div>
              <p className="text-xs text-muted-foreground">Dismissed</p>
            </CardContent>
          </Card>
        </div>
      )}

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
                  placeholder="Search detections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Detections List */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Detections ({filteredDetections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDetections.map((detection) => (
              <div key={detection.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium">{detection.promoterName}</h3>
                    <Badge className={getConfidenceBadgeColor(detection.confidence)}>
                      {detection.confidence} confidence
                    </Badge>
                    <Badge className={getStatusBadgeColor(detection.status)}>
                      {detection.status}
                    </Badge>
                    <Badge className={getActionBadgeColor(detection.action)}>
                      {detection.action}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Campaign: {detection.campaignTitle} | Platform: {detection.platform}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Bot Score: {detection.botScore}%</span>
                    <span>Views: {detection.metrics.viewCount.toLocaleString('id-ID')}</span>
                    <span>V:L Ratio: {detection.metrics.viewLikeRatio.toFixed(1)}</span>
                    <span>V:C Ratio: {detection.metrics.viewCommentRatio.toFixed(1)}</span>
                    {detection.metrics.spikeDetected && (
                      <span className="text-red-600">Spike: {detection.metrics.spikePercentage}%</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <Progress value={detection.botScore} className="w-32 h-2" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDetection(detection)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Bot Detection Details</DialogTitle>
                        <DialogDescription>
                          Detailed analysis for {selectedDetection?.promoterName}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedDetection && (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Promoter</label>
                              <p className="text-sm text-gray-600">{selectedDetection.promoterName}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Campaign</label>
                              <p className="text-sm text-gray-600">{selectedDetection.campaignTitle}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Platform</label>
                              <p className="text-sm text-gray-600">{selectedDetection.platform}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Bot Score</label>
                              <p className="text-sm text-gray-600">{selectedDetection.botScore}%</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Views</label>
                              <p className="text-sm text-gray-600">
                                {selectedDetection.metrics.viewCount.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Likes</label>
                              <p className="text-sm text-gray-600">
                                {selectedDetection.metrics.likeCount.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Comments</label>
                              <p className="text-sm text-gray-600">
                                {selectedDetection.metrics.commentCount.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">View:Like Ratio</label>
                              <p className="text-sm text-gray-600">
                                {selectedDetection.metrics.viewLikeRatio.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">View:Comment Ratio</label>
                              <p className="text-sm text-gray-600">
                                {selectedDetection.metrics.viewCommentRatio.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Spike Detected</label>
                              <p className="text-sm text-gray-600">
                                {selectedDetection.metrics.spikeDetected ? 'Yes' : 'No'}
                                {selectedDetection.metrics.spikePercentage && 
                                  ` (${selectedDetection.metrics.spikePercentage}%)`}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Reason</label>
                            <p className="text-sm text-gray-600">{selectedDetection.reason}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Detected At</label>
                            <p className="text-sm text-gray-600">
                              {new Date(selectedDetection.detectedAt).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {detection.status === 'pending' && (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading === detection.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Approve Ban
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Bot Detection</DialogTitle>
                            <DialogDescription>
                              Are you sure this is bot activity? This will ban the user and invalidate their views.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="destructive"
                              onClick={() => handleReviewDetection(detection.id, 'approve')}
                              disabled={actionLoading === detection.id}
                            >
                              {actionLoading === detection.id ? 'Processing...' : 'Approve Ban'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading === detection.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Dismiss
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Dismiss Detection</DialogTitle>
                            <DialogDescription>
                              Are you sure this is legitimate activity? This will mark it as a false positive.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              onClick={() => handleReviewDetection(detection.id, 'dismiss')}
                              disabled={actionLoading === detection.id}
                            >
                              {actionLoading === detection.id ? 'Processing...' : 'Dismiss'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredDetections.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No bot detections found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}