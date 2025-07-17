import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Manage Users</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Oversee all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">View Campaigns</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bot Detection</CardTitle>
              <CardDescription>Monitor bot detection system</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">View Reports</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Finances</CardTitle>
              <CardDescription>Platform revenue and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">View Finances</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}