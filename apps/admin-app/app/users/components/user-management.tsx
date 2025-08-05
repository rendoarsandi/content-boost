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
import { Search, Ban, UserCheck, Eye, MoreHorizontal } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'promoter' | 'admin';
  status: 'active' | 'banned';
  createdAt: string;
  lastActive?: string;
  campaignsCount?: number;
  totalEarnings?: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/users/${userId}/ban`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/users/${userId}/unban`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'creator':
        return 'bg-blue-100 text-blue-800';
      case 'promoter':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="creator">Creator</SelectItem>
                <SelectItem value="promoter">Promoter</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{user.name}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge className={getStatusBadgeColor(user.status)}>
                        {user.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      Joined{' '}
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                        <DialogDescription>
                          Detailed information about {selectedUser?.name}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedUser && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Name</label>
                            <p className="text-sm text-gray-600">
                              {selectedUser.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Email</label>
                            <p className="text-sm text-gray-600">
                              {selectedUser.email}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Role</label>
                            <p className="text-sm text-gray-600">
                              {selectedUser.role}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Status
                            </label>
                            <p className="text-sm text-gray-600">
                              {selectedUser.status}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Joined
                            </label>
                            <p className="text-sm text-gray-600">
                              {new Date(
                                selectedUser.createdAt
                              ).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          {selectedUser.campaignsCount !== undefined && (
                            <div>
                              <label className="text-sm font-medium">
                                Campaigns
                              </label>
                              <p className="text-sm text-gray-600">
                                {selectedUser.campaignsCount}
                              </p>
                            </div>
                          )}
                          {selectedUser.totalEarnings !== undefined && (
                            <div>
                              <label className="text-sm font-medium">
                                Total Earnings
                              </label>
                              <p className="text-sm text-gray-600">
                                Rp{' '}
                                {selectedUser.totalEarnings.toLocaleString(
                                  'id-ID'
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {user.status === 'active' ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionLoading === user.id}
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Ban
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ban User</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to ban {user.name}? This will
                            prevent them from accessing the platform.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="destructive"
                            onClick={() => handleBanUser(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id
                              ? 'Banning...'
                              : 'Ban User'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === user.id}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Unban
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Unban User</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to unban {user.name}? This
                            will restore their access to the platform.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            onClick={() => handleUnbanUser(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id
                              ? 'Unbanning...'
                              : 'Unban User'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
