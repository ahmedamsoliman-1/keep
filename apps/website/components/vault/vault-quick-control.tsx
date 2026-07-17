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
import { Fingerprint, LockKeyhole, LockOpen } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/ui/action-dialog";
import {
  getPasskeyPrfOutput,
  passkeyClient,
  preparePasskeyPrfOptions,
} from "@/lib/passkey-client";
import {
  clearActiveVaultKey,
  getVaultKeyState,
  lockedVaultKeyState,
  setActiveVaultKey,
  subscribeToVaultKey,
} from "@/lib/vault-key-store";
import { getUserFacingError } from "@/lib/user-errors";
import { getVaultMetadata } from "@/lib/vault-metadata-store";

export function VaultQuickControl({ mobile = false }: { mobile?: boolean }) {
  const [vault, setVault] = useState<VaultDto | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"passphrase" | "recovery">("passphrase");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const keyState = useSyncExternalStore(
    subscribeToVaultKey,
    getVaultKeyState,
    () => lockedVaultKeyState,
  );

  const loadVault = useCallback((force = false) => {
    setLoadFailed(false);
    setVault(undefined);
    void getVaultMetadata(force)
      .then((result) => setVault(result.vault))
      .catch((error) => {
        setLoadFailed(true);
        toast.error(
          getUserFacingError(error, "Vault status could not be loaded."),
        );
      });
  }, []);

  useEffect(() => {
    loadVault(false);
  }, [loadVault]);

  if (loadFailed) {
    return (
      <button
        className={
          mobile
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)]"
            : "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium text-[var(--muted)]"
        }
        onClick={() => loadVault(true)}
        type="button"
      >
        <LockKeyhole className="size-4" />
        Retry vault status
      </button>
    );
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vault) return;
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
      setOpen(false);
      toast.success("Vault unlocked.");
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
    if (!vault) return false;
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
      setOpen(false);
      toast.success("Vault unlocked with biometrics.");
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Biometric vault unlock could not be completed.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  async function openUnlock() {
    if (!vault) return;
    try {
      const { enabled } = await passkeyClient.vaultStatus(vault.vaultId);
      if (enabled) {
        const unlocked = await unlockWithBiometrics();
        if (!unlocked) setOpen(true);
        return;
      }
    } catch {
      // The passphrase and recovery dialog remains available as fallback.
    }
    setOpen(true);
  }

  if (vault === undefined) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs text-[var(--muted)]">
        <LockKeyhole className="size-3.5" />
        Checking vault
      </span>
    );
  }

  if (!vault) {
    return (
      <Link
        className={
          mobile
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-500/10"
            : "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium hover:bg-[var(--surface-hover)]"
        }
        href="/app/settings"
      >
        <LockKeyhole className="size-4" />
        Set up vault
      </Link>
    );
  }

  if (keyState.unlocked && keyState.vaultId === vault.vaultId) {
    return (
      <button
        className={
          mobile
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10"
            : "inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs font-medium text-emerald-700"
        }
        onClick={() => {
          clearActiveVaultKey();
          toast.success("Vault locked.");
        }}
        type="button"
      >
        <LockOpen className="size-4" />
        Vault unlocked
      </button>
    );
  }

  return (
    <>
      <button
        className={
          mobile
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-amber-700 hover:bg-amber-500/10"
            : "inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs font-medium text-amber-800"
        }
        onClick={() => void openUnlock()}
        type="button"
      >
        <LockKeyhole className="size-4" />
        Unlock vault
      </button>
      <ActionDialog
        description="Decrypt your vault key locally without leaving the current page."
        footer={
          <>
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-medium"
              onClick={() => setOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={pending || !secret}
              form="quick-vault-unlock"
              type="submit"
            >
              {pending ? "Unlocking…" : "Unlock vault"}
            </button>
          </>
        }
        onOpenChange={setOpen}
        open={open}
        title="Unlock your vault"
      >
        <form
          className="space-y-5"
          id="quick-vault-unlock"
          onSubmit={(event) => void unlock(event)}
        >
          <div className="grid grid-cols-2 rounded-xl border p-1">
            {(["passphrase", "recovery"] as const).map((value) => (
              <button
                className={`rounded-lg px-3 py-2 text-sm ${
                  method === value
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)]"
                }`}
                key={value}
                onClick={() => {
                  setMethod(value);
                  setSecret("");
                }}
                type="button"
              >
                {value === "passphrase" ? "Passphrase" : "Recovery key"}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium">
            {method === "passphrase" ? "Vault passphrase" : "Recovery key"}
            <input
              autoComplete="off"
              autoFocus
              className="mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3 font-mono text-sm outline-none focus:border-indigo-500"
              onChange={(event) => setSecret(event.target.value)}
              required
              type={method === "passphrase" ? "password" : "text"}
              value={secret}
            />
          </label>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            or
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-50"
            disabled={pending}
            onClick={() => void unlockWithBiometrics()}
            type="button"
          >
            <Fingerprint className="size-4" />
            Unlock with biometrics
          </button>
        </form>
      </ActionDialog>
    </>
  );
}
