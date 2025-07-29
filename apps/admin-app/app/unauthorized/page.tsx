import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to access this admin panel
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            Admin privileges are required to access this area.
          </p>
          <Link href="/login">
            <Button>Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}