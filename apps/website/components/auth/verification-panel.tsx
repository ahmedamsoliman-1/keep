"use client";

import { KeepClient } from "@keephq/api-client";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getClientAuth } from "@/lib/firebase-client";
import { clearActiveVaultKey } from "@/lib/vault-key-store";

const apiClient = new KeepClient({ baseUrl: "" });

export function VerificationPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => onAuthStateChanged(getClientAuth(), setUser), []);

  async function refreshStatus() {
    if (!user) {
      router.push("/login");
      return;
    }

    setPending(true);
    try {
      await user.reload();
      if (!user.emailVerified) {
        toast.warning("Your email is not verified yet.");
        return;
      }
      await apiClient.auth.session.create(await user.getIdToken(true));
      router.push("/app/dashboard");
      router.refresh();
    } catch (caughtError) {
      toast.error(getAuthErrorMessage(caughtError, "session"));
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!user) return;
    setPending(true);
    try {
      await sendEmailVerification(user);
      toast.success("A new verification email has been sent.");
    } catch (caughtError) {
      toast.error(getAuthErrorMessage(caughtError, "email-verification"));
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    clearActiveVaultKey();
    await apiClient.auth.session.delete().catch(() => undefined);
    await signOut(getClientAuth());
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg border px-3 py-3 text-sm">
        Signed in as <strong>{user?.email ?? "your account"}</strong>
      </p>
      <button
        className="w-full rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          void refreshStatus();
        }}
        type="button"
      >
        Refresh verification status
      </button>
      <button
        className="w-full rounded-lg border px-4 py-2.5 text-sm disabled:opacity-50"
        disabled={pending || !user}
        onClick={() => {
          void resend();
        }}
        type="button"
      >
        Resend verification email
      </button>
      <button
        className="w-full px-4 py-2 text-sm text-[var(--muted)]"
        onClick={() => {
          void logout();
        }}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
