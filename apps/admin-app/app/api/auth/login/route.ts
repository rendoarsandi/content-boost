import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const foundUser = await db.user.findUnique({
      where: { email }
    });

    if (!foundUser) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (foundUser.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // For demo purposes, we'll use a simple password check
    // In production, use proper password hashing
    const isValidPassword = password === 'admin123';

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: foundUser.id, 
        email: foundUser.email, 
        role: foundUser.role 
      },
      process.env.JWT_SECRET || 'admin-secret-key',
      { expiresIn: '24h' }
    );

    // Set cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}