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
  Label,
  Textarea,
} from '@repo/ui';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';

interface FinancialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  availableBalance: number;
  totalWithdrawn: number;
  pendingPayouts: number;
  totalPayouts: number;
  platformFeeRate: number;
}

interface Transaction {
  id: string;
  type: 'revenue' | 'withdrawal' | 'payout';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  processedAt?: string;
}

interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
}

export default function FinancialManagement() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'complaints'>('overview');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintNotes, setComplaintNotes] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const [statsRes, transactionsRes, complaintsRes] = await Promise.all([
        fetch('/api/finances/stats'),
        fetch('/api/finances/transactions'),
        fetch('/api/finances/complaints'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData);
      }

      if (complaintsRes.ok) {
        const complaintsData = await complaintsRes.json();
        setComplaints(complaintsData);
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !stats) return;
    
    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0 || amount > stats.availableBalance) {
      alert('Invalid withdrawal amount');
      return;
    }

    setWithdrawalLoading(true);
    try {
      const response = await fetch('/api/finances/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        setWithdrawalAmount('');
        await fetchFinancialData();
      } else {
        const error = await response.json();
        alert(error.message || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Withdrawal failed');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleComplaintUpdate = async (complaintId: string) => {
    if (!complaintStatus) return;

    try {
      const response = await fetch(`/api/finances/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: complaintStatus,
          adminNotes: complaintNotes 
        }),
      });

      if (response.ok) {
        await fetchFinancialData();
        setSelectedComplaint(null);
        setComplaintNotes('');
        setComplaintStatus('');
      }
    } catch (error) {
      console.error('Failed to update complaint:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
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
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: DollarSign },
            { id: 'transactions', name: 'Transactions', icon: CreditCard },
            { id: 'complaints', name: 'Complaints', icon: AlertCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {stats.totalRevenue.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground">All time platform fees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {stats.monthlyRevenue.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <CreditCard className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {stats.availableBalance.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground">Ready for withdrawal</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {stats.totalWithdrawn.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground">All time withdrawals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {stats.pendingPayouts.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting processing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Fee Rate</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.platformFeeRate}%</div>
                <p className="text-xs text-muted-foreground">Current fee rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Section */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Withdrawal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="withdrawal-amount">Withdrawal Amount (Rp)</Label>
                  <Input
                    id="withdrawal-amount"
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={stats.availableBalance}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: Rp {stats.availableBalance.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex items-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={!withdrawalAmount || withdrawalLoading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Withdrawal</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to withdraw Rp {parseFloat(withdrawalAmount || '0').toLocaleString('id-ID')}?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          onClick={handleWithdrawal}
                          disabled={withdrawalLoading}
                        >
                          {withdrawalLoading ? 'Processing...' : 'Confirm Withdrawal'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{transaction.description}</h3>
                      <Badge className={getStatusBadgeColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'revenue' ? '+' : '-'}Rp {transaction.amount.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{transaction.type}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No transactions found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complaints Tab */}
      {activeTab === 'complaints' && (
        <Card>
          <CardHeader>
            <CardTitle>User Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <div key={complaint.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium">{complaint.subject}</h3>
                      <Badge className={getStatusBadgeColor(complaint.status)}>
                        {complaint.status}
                      </Badge>
                      <Badge className={getPriorityBadgeColor(complaint.priority)}>
                        {complaint.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{complaint.description}</p>
                    <div className="text-xs text-gray-500">
                      <span>From: {complaint.userName} ({complaint.userEmail})</span>
                      <span className="ml-4">
                        Created: {new Date(complaint.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setComplaintStatus(complaint.status);
                            setComplaintNotes(complaint.adminNotes || '');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Manage Complaint</DialogTitle>
                          <DialogDescription>
                            Update complaint status and add admin notes
                          </DialogDescription>
                        </DialogHeader>
                        {selectedComplaint && (
                          <div className="space-y-4">
                            <div>
                              <Label>Subject</Label>
                              <p className="text-sm text-gray-600">{selectedComplaint.subject}</p>
                            </div>
                            <div>
                              <Label>Description</Label>
                              <p className="text-sm text-gray-600">{selectedComplaint.description}</p>
                            </div>
                            <div>
                              <Label>User</Label>
                              <p className="text-sm text-gray-600">
                                {selectedComplaint.userName} ({selectedComplaint.userEmail})
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="complaint-status">Status</Label>
                              <Select value={complaintStatus} onValueChange={setComplaintStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="admin-notes">Admin Notes</Label>
                              <Textarea
                                id="admin-notes"
                                value={complaintNotes}
                                onChange={(e) => setComplaintNotes(e.target.value)}
                                placeholder="Add admin notes..."
                                rows={3}
                              />
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button
                            onClick={() => selectedComplaint && handleComplaintUpdate(selectedComplaint.id)}
                          >
                            Update Complaint
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
              {complaints.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No complaints found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}