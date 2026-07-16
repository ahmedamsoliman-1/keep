"use client";

import { LockKeyhole, LockOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  clearActiveVaultKey,
  getVaultKeyState,
  lockedVaultKeyState,
  subscribeToVaultKey,
} from "@/lib/vault-key-store";
import { getVaultMetadata } from "@/lib/vault-metadata-store";

export function VaultStatusCard() {
  const [exists, setExists] = useState<boolean | null>(null);
  const keyState = useSyncExternalStore(
    subscribeToVaultKey,
    getVaultKeyState,
    () => lockedVaultKeyState,
  );

  useEffect(() => {
    void getVaultMetadata()
      .then((status) => setExists(status.exists))
      .catch(() => {
        setExists(null);
        toast.error("Vault status could not be loaded.");
      });
  }, []);

  return (
    <article className="mt-10 max-w-xl rounded-xl border p-6">
      {exists && keyState.unlocked ? (
        <LockOpen className="size-5 text-[var(--accent)]" />
      ) : (
        <LockKeyhole className="size-5 text-[var(--accent)]" />
      )}
      <h3 className="mt-4 text-lg font-semibold">
        {exists === null
          ? "Checking vault status…"
          : exists
            ? keyState.unlocked
              ? "Vault unlocked"
              : "Vault locked"
            : "Create your encrypted vault"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {exists
          ? keyState.unlocked
            ? "The active vault key is held in memory only and will clear automatically."
            : "Unlock locally with your vault passphrase or recovery key."
          : "Generate your client-side vault key, passphrase wrapping, and recovery key."}
      </p>
      {exists && keyState.unlocked ? (
        <button
          className="mt-5 rounded-lg border px-4 py-2.5 text-sm font-medium"
          onClick={clearActiveVaultKey}
          type="button"
        >
          Lock vault
        </button>
      ) : exists ? (
        <Link
          className="mt-5 inline-flex rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)]"
          href="/app/vault"
        >
          Unlock vault
        </Link>
      ) : exists !== null ? (
        <Link
          className="mt-5 inline-flex rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)]"
          href="/app/vault"
        >
          Set up vault
        </Link>
      ) : null}
    </article>
  );
}
