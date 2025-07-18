import { redirect } from "next/navigation";

export default function AuthPage() {
  // Always redirect to login page - let the login page handle authentication checks
  redirect("/login");
}