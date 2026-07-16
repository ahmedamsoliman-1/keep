"use client";

import { wrapVaultKeyWithBiometricSecret } from "@envault/crypto";
import { getBrowserCryptoProvider } from "@envault/crypto/browser";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { CheckCircle2, Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/action-dialog";
import {
  getPasskeyPrfOutput,
  passkeyClient,
  preparePasskeyPrfOptions,
  type PasskeySummary,
} from "@/lib/passkey-client";
import { getActiveVaultKey } from "@/lib/vault-key-store";
import { getVaultMetadata } from "@/lib/vault-metadata-store";

export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<PasskeySummary | null>(null);

  useEffect(() => {
    void passkeyClient
      .list()
      .then(setPasskeys)
      .catch(() => undefined);
  }, []);

  async function enroll() {
    setPending(true);
    try {
      const enrollment = await passkeyClient.registrationOptions();
      const response = await startRegistration({
        optionsJSON: enrollment.options,
      });
      const created = await passkeyClient.verifyRegistration(
        enrollment.flowId,
        response,
        name,
      );
      setPasskeys((current) => [...current, created]);
      setName("");
      toast.success("Passkey enabled for sign-in.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The passkey could not be created.",
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setPending(true);
    try {
      await passkeyClient.remove(removing.id);
      setPasskeys((current) => current.filter(({ id }) => id !== removing.id));
      setRemoving(null);
      toast.success("Passkey removed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The passkey could not be removed.",
      );
    } finally {
      setPending(false);
    }
  }

  async function enableVaultUnlock() {
    setPending(true);
    try {
      const { vault } = await getVaultMetadata();
      if (!vault) throw new Error("Create your vault before enabling this.");
      const vaultKey = getActiveVaultKey(vault.vaultId);
      if (!vaultKey) {
        throw new Error(
          "Unlock the vault first, then return here to enable biometric unlock.",
        );
      }
      try {
        const ceremony = await passkeyClient.vaultOptions(
          vault.vaultId,
          "enroll",
        );
        const response = await startAuthentication({
          optionsJSON: preparePasskeyPrfOptions(ceremony.options),
        });
        const prfOutput = getPasskeyPrfOutput(response);
        const wrappedKey = await wrapVaultKeyWithBiometricSecret(
          getBrowserCryptoProvider(),
          vault.vaultId,
          vaultKey,
          prfOutput,
        );
        await passkeyClient.verifyVault(ceremony.flowId, response, wrappedKey);
        prfOutput.fill(0);
        toast.success("Biometric vault unlock is now enabled.");
      } finally {
        vaultKey.fill(0);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Biometric vault unlock could not be enabled.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border bg-[var(--surface)] p-6">
        <div className="flex gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
            <Fingerprint className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">Passkeys and biometrics</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Sign in using Touch ID, Android biometrics, Windows Hello, or your
              device security PIN. Envault never receives biometric data.
            </p>
          </div>
        </div>

        {passkeys.length ? (
          <div className="mt-6 space-y-3">
            {passkeys.map((passkey) => (
              <div
                className="flex items-center justify-between gap-4 rounded-xl border p-4"
                key={passkey.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {passkey.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Added {new Date(passkey.createdAt).toLocaleDateString()}
                      {passkey.backedUp ? " · Synced passkey" : ""}
                    </p>
                  </div>
                </div>
                <button
                  aria-label={`Remove ${passkey.name}`}
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-600"
                  onClick={() => setRemoving(passkey)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 max-w-md">
          <label className="block text-sm font-medium">
            Passkey name
            <input
              className="mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3"
              onChange={(event) => setName(event.target.value)}
              placeholder="Personal MacBook, Samsung phone…"
              value={name}
            />
          </label>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={pending}
            onClick={() => void enroll()}
            type="button"
          >
            <KeyRound className="size-4" />
            {pending ? "Waiting for device…" : "Add a passkey"}
          </button>
          {passkeys.length ? (
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-50"
              disabled={pending}
              onClick={() => void enableVaultUnlock()}
              type="button"
            >
              <Fingerprint className="size-4" />
              Enable biometric vault unlock
            </button>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        confirmLabel="Remove passkey"
        description={`Remove ${removing?.name ?? "this passkey"}? You will no longer be able to use it to sign in.`}
        destructive
        onConfirm={() => void remove()}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
        open={removing !== null}
        pending={pending}
        title="Remove passkey"
      />
    </>
  );
}
