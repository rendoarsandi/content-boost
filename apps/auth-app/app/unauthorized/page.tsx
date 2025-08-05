import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Access Denied
          </CardTitle>
          <CardDescription>
            Anda tidak memiliki izin untuk mengakses halaman ini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Halaman yang Anda coba akses memerlukan izin khusus. Silakan hubungi
            administrator jika Anda yakin ini adalah kesalahan.
          </p>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Login with Different Account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
