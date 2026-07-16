import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="Resetting your account password does not reset your future vault passphrase."
      footer={
        <Link
          className="font-medium text-indigo-600 hover:text-indigo-500"
          href="/login"
        >
          Return to sign in
        </Link>
      }
      title="Reset your password"
    >
      <AuthForm mode="forgot-password" />
    </AuthShell>
  );
}
