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
import { Users, Video, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

function OnboardingForm() {
  const [selectedRole, setSelectedRole] = useState<
    'creator' | 'promoter' | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update your role.');
      }

      window.location.href = 'https://dashboard.domain.com';
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'creator' as const,
      title: 'I am a Content Creator',
      description: 'I want to launch campaigns and boost my content.',
      icon: Video,
    },
    {
      value: 'promoter' as const,
      title: 'I am a Promoter',
      description: 'I want to promote content and earn money.',
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Button variant="ghost" asChild>
            {/* This should ideally log the user out or send them back to a safe page */}
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">One Last Step</CardTitle>
            <CardDescription>
              How will you be using ContentBoost?
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
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {roleOptions.map(option => {
                const Icon = option.icon;
                return (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 p-6 cursor-pointer',
                      'hover:bg-accent/50 hover:text-accent-foreground',
                      selectedRole === option.value
                        ? 'border-primary bg-accent/50'
                        : 'border-muted'
                    )}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="sr-only"
                    />
                    <Icon className="h-10 w-10 mb-4 text-primary" />
                    <span className="font-bold text-center mb-2">
                      {option.title}
                    </span>
                    <p className="text-sm text-muted-foreground text-center">
                      {option.description}
                    </p>
                  </Label>
                );
              })}
            </RadioGroup>

            <Button
              className="w-full"
              size="lg"
              onClick={handleRoleSelection}
              disabled={!selectedRole || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please
                  wait...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
