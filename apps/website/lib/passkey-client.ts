"use client";

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type { WrappedVaultKeyV1 } from "@keephq/crypto";

interface SuccessEnvelope<T> {
  data: T;
}

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as
    SuccessEnvelope<T> | { error?: { message?: string } };
  if (!response.ok || !("data" in payload)) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "The passkey operation could not be completed.",
    );
  }
  return payload.data;
}

export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
}

export const passkeyClient = {
  list: () => request<PasskeySummary[]>("/api/v1/passkeys"),
  registrationOptions: () =>
    request<{
      flowId: string;
      options: PublicKeyCredentialCreationOptionsJSON;
    }>("/api/v1/passkeys/registration/options", { method: "POST" }),
  verifyRegistration: (
    flowId: string,
    response: RegistrationResponseJSON,
    name: string,
  ) =>
    request<PasskeySummary>("/api/v1/passkeys/registration/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId, response, name }),
    }),
  authenticationOptions: () =>
    request<{
      flowId: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/api/v1/passkeys/authentication/options", { method: "POST" }),
  verifyAuthentication: (
    flowId: string,
    response: AuthenticationResponseJSON,
  ) =>
    request<{ customToken: string; passkeyProof: string }>(
      "/api/v1/passkeys/authentication/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId, response }),
      },
    ),
  remove: (id: string) =>
    request<{ removed: true }>(
      `/api/v1/passkeys?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  vaultOptions: (vaultId: string, mode: "enroll" | "unlock") =>
    request<{
      flowId: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>("/api/v1/passkeys/vault/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultId, mode }),
    }),
  vaultStatus: (vaultId: string) =>
    request<{ enabled: boolean }>(
      `/api/v1/passkeys/vault/options?vaultId=${encodeURIComponent(vaultId)}`,
    ),
  verifyVault: (
    flowId: string,
    response: AuthenticationResponseJSON,
    wrappedKey?: WrappedVaultKeyV1,
  ) =>
    request<{ enabled: true } | { wrappedKey: WrappedVaultKeyV1 }>(
      "/api/v1/passkeys/vault/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowId, response, wrappedKey }),
      },
    ),
};

export function getPasskeyPrfOutput(response: AuthenticationResponseJSON) {
  const extensions = response.clientExtensionResults as {
    prf?: { results?: { first?: string | ArrayBuffer | ArrayBufferView } };
  };
  const output = extensions.prf?.results?.first;
  if (!output) {
    throw new Error(
      "This passkey or browser does not support biometric vault unlocking.",
    );
  }
  if (typeof output !== "string") {
    return output instanceof ArrayBuffer
      ? new Uint8Array(output)
      : new Uint8Array(output.buffer, output.byteOffset, output.byteLength);
  }
  const encoded = output;
  const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function preparePasskeyPrfOptions(
  options: PublicKeyCredentialRequestOptionsJSON,
) {
  const prepared = structuredClone(options) as unknown as {
    extensions?: {
      prf?: {
        eval?: { first: string | Uint8Array; second?: string | Uint8Array };
        evalByCredential?: Record<
          string,
          { first: string | Uint8Array; second?: string | Uint8Array }
        >;
      };
    };
  };
  const prf = prepared.extensions?.prf;
  if (prf?.eval) {
    if (typeof prf.eval.first === "string")
      prf.eval.first = base64UrlToBytes(prf.eval.first);
    if (typeof prf.eval.second === "string")
      prf.eval.second = base64UrlToBytes(prf.eval.second);
  }
  for (const values of Object.values(prf?.evalByCredential ?? {})) {
    if (typeof values.first === "string")
      values.first = base64UrlToBytes(values.first);
    if (typeof values.second === "string")
      values.second = base64UrlToBytes(values.second);
  }
  return prepared as unknown as PublicKeyCredentialRequestOptionsJSON;
}
