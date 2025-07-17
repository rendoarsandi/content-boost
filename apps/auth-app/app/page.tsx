import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';

export default function AuthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>
            Login ke akun Creator Promotion Platform Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button className="w-full">Login with TikTok</Button>
            <Button className="w-full" variant="outline">Login with Instagram</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}