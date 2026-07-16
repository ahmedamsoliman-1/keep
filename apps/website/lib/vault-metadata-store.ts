"use client";

import { EnvaultClient } from "@envault/api-client";
import type { VaultStatus } from "@envault/api-contract";

const client = new EnvaultClient({ baseUrl: "" });

let cachedStatus: VaultStatus | null = null;
let pendingRequest: Promise<VaultStatus> | null = null;

export function getVaultMetadata(force = false): Promise<VaultStatus> {
  if (!force && cachedStatus) return Promise.resolve(cachedStatus);
  if (!force && pendingRequest) return pendingRequest;

  pendingRequest = client.vault
    .get()
    .then((status) => {
      cachedStatus = status;
      return status;
    })
    .finally(() => {
      pendingRequest = null;
    });
  return pendingRequest;
}

export function setVaultMetadata(status: VaultStatus) {
  cachedStatus = status;
}

export function clearVaultMetadata() {
  cachedStatus = null;
  pendingRequest = null;
}
