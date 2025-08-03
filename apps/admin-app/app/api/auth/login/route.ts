import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Simple auth check for demo
    if (email === 'admin@example.com' && password === 'admin123') {
      // Set cookie
      const response = NextResponse.json({
        message: 'Login successful',
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
        },
      });

      response.cookies.set('auth-token', 'demo-admin-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
      });

      return response;
    }

    return NextResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}