export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult<T = any> {
  data?: T;
  error?: AuthError;
}

export type AuthProvider = "google" | "github" | "email";

export interface AuthConfig {
  redirectTo?: string;
  provider?: AuthProvider;
}