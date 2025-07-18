'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@repo/auth';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, RadioGroup, RadioGroupItem, Label, Alert, AlertDescription } from '@repo/ui';
import { Users, Video, Shield, Loader2 } from 'lucide-react';

function OnboardingForm() {
  const [selectedRole, setSelectedRole] = useState<'creator' | 'promoter' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') || 'https://dashboard.domain.com';
  
  // Check session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentSession = await authClient.getSession();
        setSession(currentSession);
        
        // Redirect to login if not authenticated
        if (!currentSession?.data?.user) {
          router.push('/login');
          return;
        }
        
        // For now, just check if user exists
        // Role checking will be implemented when the user schema is properly configured
      } catch (error) {
        console.error('Error checking session:', error);
        router.push('/login');
      }
    };
    
    checkSession();
  }, [router, callbackUrl]);
  
  const handleRoleSelection = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Update user role via API
      const response = await fetch('/api/auth/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: selectedRole }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update role');
      }
      
      // Redirect to appropriate dashboard based on role
      const dashboardUrl = selectedRole === 'creator' 
        ? 'https://dashboard.domain.com/creator' 
        : 'https://dashboard.domain.com/promoter';
      
      window.location.href = dashboardUrl;
    } catch (err) {
      console.error('Role update error:', err);
      setError('Failed to update role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const roleOptions = [
    {
      value: 'creator' as const,
      title: 'Content Creator',
      description: 'Saya ingin membuat campaign dan mempromosikan konten saya',
      icon: Video,
    },
    {
      value: 'promoter' as const,
      title: 'Promoter',
      description: 'Saya ingin mempromosikan konten creator dan mendapat bayaran',
      icon: Users,
    },
  ];
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
          <CardDescription>
            Pilih peran Anda di Creator Promotion Platform
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
            onValueChange={(value) => setSelectedRole(value as 'creator' | 'promoter')}
          >
            {roleOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className="h-6 w-6 text-blue-600 mt-1" />
                    <div>
                      <Label htmlFor={option.value} className="text-base font-medium cursor-pointer">
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
            <p>
              Anda dapat mengubah peran ini nanti di pengaturan akun
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </main>
    }>
      <OnboardingForm />
    </Suspense>
  );
}