"use client";

import { EnvaultClient } from "@envault/api-client";
import type { EnvironmentDto } from "@envault/api-contract";
import { Boxes, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { getUserFacingError } from "@/lib/user-errors";

const client = new EnvaultClient({ baseUrl: "" });

export function EnvironmentWorkspace({ projectId }: { projectId: string }) {
  const [environments, setEnvironments] = useState<EnvironmentDto[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<EnvironmentDto["kind"]>("development");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client.environments
      .list(projectId)
      .then((result) => setEnvironments(result.environments))
      .catch((caught) =>
        setError(
          getUserFacingError(caught, "Environments could not be loaded."),
        ),
      );
  }, [projectId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const environment = await client.environments.create(projectId, {
        name,
        kind,
      });
      setEnvironments((current) => [environment, ...current]);
      setName("");
      setCreating(false);
    } catch (caught) {
      setError(
        getUserFacingError(caught, "The environment could not be created."),
      );
    } finally {
      setPending(false);
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
          New environment
        </button>
      </div>
      {creating ? (
        <form
          className="mt-6 grid gap-4 rounded-2xl border bg-[var(--surface)] p-6 md:grid-cols-[1fr_220px_auto]"
          onSubmit={(event) => void submit(event)}
        >
          <input
            className="rounded-xl border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            onChange={(event) => setName(event.target.value)}
            placeholder="Staging"
            required
            value={name}
          />
          <select
            className="rounded-xl border bg-[var(--surface)] px-3.5 py-3 text-sm"
            onChange={(event) =>
              setKind(event.target.value as EnvironmentDto["kind"])
            }
            value={kind}
          >
            {[
              "local",
              "development",
              "testing",
              "staging",
              "production",
              "custom",
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            Create
          </button>
        </form>
      ) : null}
      {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {environments.map((environment) => (
          <Link
            className="rounded-2xl border bg-[var(--surface)] p-5 hover:border-indigo-500/35"
            href={`/app/environments/${environment.id}?projectId=${projectId}`}
            key={environment.id}
          >
            <Boxes className="size-5 text-indigo-500" />
            <div className="mt-5 flex items-center justify-between">
              <h3 className="font-semibold">{environment.name}</h3>
              <span className="rounded-full bg-[var(--app-background)] px-2.5 py-1 text-[11px] capitalize text-[var(--muted)]">
                {environment.kind}
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Version {environment.version}
            </p>
          </Link>
        ))}
      </div>
      {environments.length === 0 && !creating ? (
        <div className="mt-8 rounded-2xl border border-dashed p-14 text-center">
          <Boxes className="mx-auto size-6 text-[var(--muted)]" />
          <p className="mt-4 text-sm font-medium">No environments yet</p>
        </div>
      ) : null}
    </div>
  );
}
