"use client";

import { EnvaultClient } from "@envault/api-client";
import type { VaultDto } from "@envault/api-contract";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getUserFacingError } from "@/lib/user-errors";

import { VaultSetup } from "./vault-setup";
import { VaultUnlock } from "./vault-unlock";

const client = new EnvaultClient({ baseUrl: "" });

export function VaultManager() {
  const [vault, setVault] = useState<VaultDto | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadVault = useCallback(() => {
    setLoadFailed(false);
    setVault(undefined);
    void client.vault
      .get()
      .then((status) => setVault(status.vault))
      .catch((caughtError: unknown) => {
        setLoadFailed(true);
        toast.error(
          getUserFacingError(
            caughtError,
            "Vault metadata could not be loaded.",
          ),
        );
      });
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  if (loadFailed) {
    return (
      <section className="max-w-xl rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Vault status unavailable</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Reconnect to the data service and try loading your vault again.
        </p>
        <button
          className="mt-5 rounded-lg border px-4 py-2.5 text-sm font-medium"
          onClick={loadVault}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }
  if (vault === undefined) {
    return (
      <p className="text-sm text-[var(--muted)]">Loading vault metadata…</p>
    );
  }
  return vault ? <VaultUnlock vault={vault} /> : <VaultSetup />;
}
