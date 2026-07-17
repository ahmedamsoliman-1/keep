"use client";

import type { VaultDto } from "@keephq/api-contract";
import {
  unlockVaultWithBiometricSecret,
  unlockVaultWithPassphrase,
  unlockVaultWithRecoveryKey,
  type VaultKeyMaterialV1,
} from "@keephq/crypto";
import { getBrowserCryptoProvider } from "@keephq/crypto/browser";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { setActiveVaultKey } from "@/lib/vault-key-store";
import {
  getPasskeyPrfOutput,
  passkeyClient,
  preparePasskeyPrfOptions,
} from "@/lib/passkey-client";

export function VaultUnlock({ vault }: { vault: VaultDto }) {
  const router = useRouter();
  const [method, setMethod] = useState<"passphrase" | "recovery">("passphrase");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

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
      toast.error(
        method === "passphrase"
          ? "The vault passphrase is incorrect."
          : "The recovery key is invalid.",
      );
    } finally {
      setPending(false);
    }
  }

  async function unlockWithBiometrics() {
    setPending(true);
    try {
      const ceremony = await passkeyClient.vaultOptions(
        vault.vaultId,
        "unlock",
      );
      const response = await startAuthentication({
        optionsJSON: preparePasskeyPrfOptions(ceremony.options),
      });
      const prfOutput = getPasskeyPrfOutput(response);
      const verified = await passkeyClient.verifyVault(
        ceremony.flowId,
        response,
      );
      if (!("wrappedKey" in verified)) {
        throw new Error("Biometric vault unlock is not enabled.");
      }
      const key = await unlockVaultWithBiometricSecret(
        getBrowserCryptoProvider(),
        vault.vaultId,
        verified.wrappedKey,
        prfOutput,
      );
      setActiveVaultKey(vault.vaultId, key, vault.autoLockMinutes);
      key.fill(0);
      prfOutput.fill(0);
      toast.success("Vault unlocked with biometrics.");
      router.push("/app/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Biometric vault unlock could not be completed.",
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
      <button
        className="mt-6 w-full rounded-lg bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-[var(--background)] disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Unlocking…" : "Unlock vault"}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        or
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-50"
        disabled={pending}
        onClick={() => void unlockWithBiometrics()}
        type="button"
      >
        <Fingerprint className="size-4" />
        Unlock with biometrics
      </button>
    </form>
  );
}
