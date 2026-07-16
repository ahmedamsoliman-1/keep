import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      description="Your account password authenticates you. A separate vault passphrase will protect your secrets."
      footer={
        <>
          Already registered?{" "}
          <Link
            className="font-medium text-indigo-600 hover:text-indigo-500"
            href="/login"
          >
            Sign in
          </Link>
        </>
      }
      title="Create your account"
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
