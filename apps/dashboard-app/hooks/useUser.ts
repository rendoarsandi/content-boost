'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock user data for development
    // In production, this would fetch from your auth system
    const mockUser: User = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'creator',
    };

    setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 1000);
  }, []);

  return { user, loading };
}
