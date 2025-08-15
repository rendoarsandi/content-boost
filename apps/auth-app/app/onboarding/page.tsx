'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  RadioGroup,
  RadioGroupItem,
  Label,
  Alert,
  AlertDescription,
} from '@repo/ui';
import { Users, Video, Loader2 } from 'lucide-react';

function OnboardingForm() {
  const [selectedRole, setSelectedRole] = useState<
    'creator' | 'promoter' | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // The middleware should protect this page, so we can assume a user is logged in.
  // We might need the user object later for more complex logic.
  // const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // This API route will need to be updated to use Supabase admin client
      const response = await fetch('/api/auth/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      // Redirect to the main dashboard, which will handle role-specific views
      window.location.href = 'https://dashboard.domain.com'; // Or a relative path to the dashboard app
    } catch (err: any) {
      console.error('Role update error:', err);
      setError(err.message || 'Failed to update role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'creator' as const,
      title: 'Content Creator',
      description: 'I want to create campaigns and promote my content',
      icon: Video,
    },
    {
      value: 'promoter' as const,
      title: 'Promoter',
      description: 'I want to promote content and get paid',
      icon: Users,
    },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
          <CardDescription>
            Select your role on the Creator Promotion Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <RadioGroup
            value={selectedRole || ''}
            onValueChange={value =>
              setSelectedRole(value as 'creator' | 'promoter')
            }
          >
            {roleOptions.map(option => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className="h-6 w-6 text-blue-600 mt-1" />
                    <div>
                      <Label
                        htmlFor={option.value}
                        className="text-base font-medium cursor-pointer"
                      >
                        {option.title}
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          <Button
            className="w-full"
            onClick={handleRoleSelection}
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? 'Setting up your account...' : 'Continue'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>You can change this role later in your account settings</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-lg">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        </main>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
