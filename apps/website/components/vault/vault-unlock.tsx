"use client";

import type { VaultDto } from "@envault/api-contract";
import {
  unlockVaultWithPassphrase,
  unlockVaultWithRecoveryKey,
  type VaultKeyMaterialV1,
} from "@envault/crypto";
import { getBrowserCryptoProvider } from "@envault/crypto/browser";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { setActiveVaultKey } from "@/lib/vault-key-store";

export function VaultUnlock({ vault }: { vault: VaultDto }) {
  const router = useRouter();
  const [method, setMethod] = useState<"passphrase" | "recovery">("passphrase");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const material: VaultKeyMaterialV1 = {
      protocolVersion: vault.protocolVersion,
      passphraseDerivation: vault.passphraseDerivation,
      passphraseWrappedKey: vault.passphraseWrappedKey,
      recoveryDerivation: vault.recoveryDerivation,
      recoveryWrappedKey: vault.recoveryWrappedKey,
    };

    try {
      const provider = getBrowserCryptoProvider();
      const key =
        method === "passphrase"
          ? await unlockVaultWithPassphrase(
              provider,
              vault.vaultId,
              secret,
              material,
            )
          : await unlockVaultWithRecoveryKey(
              provider,
              vault.vaultId,
              secret,
              material,
            );
      setActiveVaultKey(vault.vaultId, key, vault.autoLockMinutes);
      key.fill(0);
      setSecret("");
      router.push("/app/dashboard");
      router.refresh();
    } catch {
      setError(
        method === "passphrase"
          ? "The vault passphrase is incorrect."
          : "The recovery key is invalid.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="max-w-xl rounded-xl border p-6"
      onSubmit={(event) => {
        void unlock(event);
      }}
    >
      <KeyRound className="size-6 text-[var(--accent)]" />
      <h2 className="mt-5 text-2xl font-semibold">Unlock your vault</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Decryption happens locally. Your passphrase or recovery key is never
        sent to the server.
      </p>
      <div className="mt-6 grid grid-cols-2 rounded-lg border p-1">
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            method === "passphrase"
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : ""
          }`}
          onClick={() => {
            setMethod("passphrase");
            setSecret("");
            setError(null);
          }}
          type="button"
        >
          Passphrase
        </button>
        <button
          className={`rounded-md px-3 py-2 text-sm ${
            method === "recovery"
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : ""
          }`}
          onClick={() => {
            setMethod("recovery");
            setSecret("");
            setError(null);
          }}
          type="button"
        >
          Recovery key
        </button>
      </div>
      <label className="mt-5 block text-sm font-medium">
        {method === "passphrase" ? "Vault passphrase" : "Recovery key"}
        <input
          autoComplete="off"
          className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2.5 font-mono outline-none focus:ring-2 focus:ring-[var(--accent)]"
          onChange={(event) => setSecret(event.target.value)}
          required
          type={method === "passphrase" ? "password" : "text"}
          value={secret}
        />
      </label>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <button
        className="mt-6 w-full rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Unlocking…" : "Unlock vault"}
      </button>
    </form>
  );
}
