import { auth } from "../config";

export async function signInWithGoogle() {
  return await auth.api.signInSocial({
    body: {
      provider: "google",
    },
  });
}

export async function signInWithGithub() {
  return await auth.api.signInSocial({
    body: {
      provider: "github",
    },
  });
}

export function getGoogleSignInUrl(callbackURL?: string) {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirect = callbackURL || `${baseURL}/auth/callback`;
  
  return `${baseURL}/api/auth/signin/google?callbackURL=${encodeURIComponent(redirect)}`;
}

export function getGithubSignInUrl(callbackURL?: string) {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirect = callbackURL || `${baseURL}/auth/callback`;
  
  return `${baseURL}/api/auth/signin/github?callbackURL=${encodeURIComponent(redirect)}`;
}