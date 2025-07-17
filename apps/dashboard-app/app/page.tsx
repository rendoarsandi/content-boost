import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Manage your promotion campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Create Campaign</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>View your performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">View Analytics</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
              <CardDescription>Track your earnings and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">View Earnings</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}