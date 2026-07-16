"use client";

import { EnvaultClient } from "@envault/api-client";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { getClientAuth } from "@/lib/firebase-client";
import { clearActiveVaultKey } from "@/lib/vault-key-store";

const apiClient = new EnvaultClient({ baseUrl: "" });

export function LogoutButton({
  variant = "default",
}: {
  variant?: "default" | "sidebar";
}) {
  const router = useRouter();

  return (
    <button
      className={
        variant === "sidebar"
          ? "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-red-500/[0.07] hover:text-red-600"
          : "inline-flex items-center gap-2 rounded-xl border bg-[var(--surface)] px-3.5 py-2 text-sm font-medium hover:bg-[var(--surface-hover)]"
      }
      onClick={() => {
        void (async () => {
          clearActiveVaultKey();
          await apiClient.auth.session.delete();
          await signOut(getClientAuth());
          router.push("/login");
          router.refresh();
        })();
      }}
      type="button"
    >
      <LogOut className="size-3.5" />
      Sign out
    </button>
  );
}
