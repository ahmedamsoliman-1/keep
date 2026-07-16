"use client";

import { EnvaultClient } from "@envault/api-client";
import type { ProjectDto } from "@envault/api-contract";
import { Folder, LockKeyhole, Plus, Search } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import {
  getVaultKeyState,
  lockedVaultKeyState,
  subscribeToVaultKey,
} from "@/lib/vault-key-store";
import { getUserFacingError } from "@/lib/user-errors";

const client = new EnvaultClient({ baseUrl: "" });

export function ProjectWorkspace() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const vaultState = useSyncExternalStore(
    subscribeToVaultKey,
    getVaultKeyState,
    () => lockedVaultKeyState,
  );

  useEffect(() => {
    void client.projects
      .list()
      .then((result) => setProjects(result.projects))
      .catch((caughtError: unknown) =>
        setError(
          getUserFacingError(caughtError, "Projects could not be loaded."),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.name.toLocaleLowerCase().includes(query) ||
        project.description?.toLocaleLowerCase().includes(query),
    );
  }, [projects, search]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const project = await client.projects.create({
        name,
        description: description.trim() || null,
      });
      setProjects((current) => [project, ...current]);
      setName("");
      setDescription("");
      setCreating(false);
    } catch (caughtError) {
      setError(
        getUserFacingError(caughtError, "The project could not be created."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className="focus:ring-3 w-full rounded-xl border bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-indigo-500/10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects"
            type="search"
            value={search}
          />
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!vaultState.unlocked}
          onClick={() => setCreating(true)}
          type="button"
        >
          <Plus className="size-4" />
          New project
        </button>
      </div>

      {!vaultState.unlocked ? (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-3">
            <LockKeyhole className="size-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium">Vault locked</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Unlock the vault before creating or modifying projects.
              </p>
            </div>
          </div>
          <Link
            className="text-sm font-medium text-amber-700 hover:underline"
            href="/app/vault"
          >
            Unlock
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {creating ? (
        <form
          className="mt-6 rounded-2xl border bg-[var(--surface)] p-6"
          onSubmit={(event) => {
            void createProject(event);
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">Create project</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Group related environments under a product or service.
              </p>
            </div>
            <button
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => setCreating(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium">
              Project name
              <input
                autoFocus
                className="focus:ring-3 mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-indigo-500/10"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                placeholder="Cosmos"
                required
                value={name}
              />
            </label>
            <label className="text-sm font-medium">
              Description
              <input
                className="focus:ring-3 mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-indigo-500/10"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Customer-facing API"
                value={description}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                className="h-44 animate-pulse rounded-2xl border bg-[var(--surface)]"
                key={item}
              />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link
                className="group rounded-2xl border bg-[var(--surface)] p-5 hover:-translate-y-0.5 hover:border-indigo-500/35 hover:shadow-lg hover:shadow-black/[0.03]"
                href={`/app/projects/${project.id}`}
                key={project.id}
              >
                <div className="flex size-10 items-center justify-center rounded-xl border bg-[var(--app-background)]">
                  <Folder className="size-5 text-indigo-500" />
                </div>
                <h3 className="mt-5 font-semibold">{project.name}</h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]">
                  {project.description ?? "No description"}
                </p>
                <p className="mt-5 text-xs text-[var(--muted)]">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-[var(--surface)] px-6 py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border">
              <Folder className="size-5 text-[var(--muted)]" />
            </div>
            <h3 className="mt-5 font-semibold">No projects yet</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Unlock your vault and create the first project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
