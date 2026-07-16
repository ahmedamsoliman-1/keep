"use client";

import { EnvaultClient } from "@envault/api-client";
import type { VariableDto } from "@envault/api-contract";
import { decryptVariableValue, encryptVariableValue } from "@envault/crypto";
import { getBrowserCryptoProvider } from "@envault/crypto/browser";
import { Eye, EyeOff, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { getUserFacingError } from "@/lib/user-errors";
import { getActiveVaultKey, getVaultKeyState } from "@/lib/vault-key-store";

const client = new EnvaultClient({ baseUrl: "" });

export function VariableWorkspace({
  environmentId,
  projectId,
}: {
  environmentId: string;
  projectId: string;
}) {
  const [variables, setVariables] = useState<VariableDto[]>([]);
  const [version, setVersion] = useState(0);
  const [creating, setCreating] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [visibility, setVisibility] =
    useState<VariableDto["visibility"]>("secret");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client.variables
      .list(environmentId)
      .then((result) => {
        setVariables(result.variables);
        setVersion(result.version);
      })
      .catch((caught) =>
        setError(getUserFacingError(caught, "Variables could not be loaded.")),
      );
  }, [environmentId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const state = getVaultKeyState();
    const vaultKey = state.vaultId ? getActiveVaultKey(state.vaultId) : null;
    if (!state.vaultId || !vaultKey) {
      setError("Unlock the vault before adding a variable.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const payload = await encryptVariableValue(
        getBrowserCryptoProvider(),
        vaultKey,
        value,
        {
          vaultId: state.vaultId,
          projectId,
          environmentId,
          variableId: id,
          encryptionVersion: 1,
        },
      );
      vaultKey.fill(0);
      const result = await client.variables.create(environmentId, {
        id,
        projectId,
        key,
        encryptedValue: payload.ciphertext,
        encryptionIv: payload.iv,
        encryptionVersion: 1,
        visibility,
        tags: [],
        description: null,
        expectedVersion: version,
      });
      setVariables((current) => [result.variable, ...current]);
      setVersion(result.version);
      setKey("");
      setValue("");
      setCreating(false);
    } catch (caught) {
      setError(
        getUserFacingError(caught, "The variable could not be created."),
      );
    } finally {
      setPending(false);
    }
  }

  async function toggleReveal(variable: VariableDto) {
    if (revealed[variable.id]) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[variable.id];
        return next;
      });
      return;
    }
    const vaultKey = getActiveVaultKey(variable.vaultId);
    if (!vaultKey) {
      setError("Unlock the vault before revealing secret values.");
      return;
    }
    try {
      const plaintext = await decryptVariableValue(
        getBrowserCryptoProvider(),
        vaultKey,
        {
          version: 1,
          algorithm: "AES-GCM",
          ciphertext: variable.encryptedValue,
          iv: variable.encryptionIv,
          additionalDataVersion: 1,
        },
        {
          vaultId: variable.vaultId,
          projectId: variable.projectId,
          environmentId: variable.environmentId,
          variableId: variable.id,
          encryptionVersion: variable.encryptionVersion,
        },
      );
      setRevealed((current) => ({ ...current, [variable.id]: plaintext }));
      window.setTimeout(() => {
        setRevealed((current) => {
          const next = { ...current };
          delete next[variable.id];
          return next;
        });
      }, 30_000);
    } catch {
      setError("This value could not be decrypted.");
    } finally {
      vaultKey.fill(0);
    }
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          onClick={() => setCreating(true)}
          type="button"
        >
          <Plus className="size-4" />
          Add variable
        </button>
      </div>
      {creating ? (
        <form
          className="mt-6 grid gap-4 rounded-2xl border bg-[var(--surface)] p-6 lg:grid-cols-[1fr_1.4fr_170px_auto]"
          onSubmit={(event) => void submit(event)}
        >
          <input
            className="rounded-xl border bg-transparent px-3.5 py-3 font-mono text-sm"
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="API_URL"
            required
            value={key}
          />
          <input
            className="rounded-xl border bg-transparent px-3.5 py-3 font-mono text-sm"
            onChange={(event) => setValue(event.target.value)}
            placeholder="Secret value"
            required
            type="password"
            value={value}
          />
          <select
            className="rounded-xl border bg-[var(--surface)] px-3.5 py-3 text-sm"
            onChange={(event) =>
              setVisibility(event.target.value as VariableDto["visibility"])
            }
            value={visibility}
          >
            <option value="secret">Secret</option>
            <option value="protected">Protected</option>
            <option value="plain">Plain</option>
          </select>
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            Add
          </button>
        </form>
      ) : null}
      {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-[var(--surface)]">
        <div className="grid min-w-[760px] grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_130px_60px] border-b px-5 py-3 text-xs font-medium uppercase text-[var(--muted)]">
          <span>Key</span>
          <span>Value</span>
          <span>Visibility</span>
          <span />
        </div>
        {variables.map((variable) => (
          <div
            className="grid min-w-[760px] grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)_130px_60px] items-center border-b px-5 py-4 last:border-0"
            key={variable.id}
          >
            <code className="text-sm font-medium">{variable.key}</code>
            <code className="truncate pr-4 text-sm text-[var(--muted)]">
              {revealed[variable.id] ?? "••••••••••••••••"}
            </code>
            <span className="text-xs capitalize text-[var(--muted)]">
              {variable.visibility}
            </span>
            <button
              aria-label={revealed[variable.id] ? "Hide value" : "Reveal value"}
              className="rounded-lg p-2 hover:bg-[var(--surface-hover)]"
              onClick={() => void toggleReveal(variable)}
              type="button"
            >
              {revealed[variable.id] ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        ))}
        {variables.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-[var(--muted)]">
            No variables in this environment.
          </p>
        ) : null}
      </div>
    </div>
  );
}
