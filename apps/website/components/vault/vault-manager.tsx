"use client";

import { EnvaultClient } from "@envault/api-client";
import type { VaultDto } from "@envault/api-contract";
import { useEffect, useState } from "react";

import { VaultSetup } from "./vault-setup";
import { VaultUnlock } from "./vault-unlock";

const client = new EnvaultClient({ baseUrl: "" });

export function VaultManager() {
  const [vault, setVault] = useState<VaultDto | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client.vault
      .get()
      .then((status) => setVault(status.vault))
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load vault.",
        );
      });
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-red-500/30 p-4 text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (vault === undefined) {
    return (
      <p className="text-sm text-[var(--muted)]">Loading vault metadata…</p>
    );
  }
  return vault ? <VaultUnlock vault={vault} /> : <VaultSetup />;
}
