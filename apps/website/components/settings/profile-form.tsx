"use client";

import { EnvaultClient } from "@envault/api-client";
import { UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { getUserFacingError } from "@/lib/user-errors";

const client = new EnvaultClient({ baseUrl: "" });

export function ProfileForm({
  initialDisplayName,
  email,
}: {
  initialDisplayName: string | null;
  email: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await client.profile.update({ displayName });
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(
        getUserFacingError(error, "Your profile could not be updated."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="rounded-2xl border bg-[var(--surface)] p-6"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
          <UserRound className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold">Personal information</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            How you appear inside Envault.
          </p>
        </div>
      </div>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className="text-sm font-medium">
          Display name
          <input
            className="focus:ring-3 mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-indigo-500/10"
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />
        </label>
        <label className="text-sm font-medium">
          Email address
          <input
            className="mt-2 w-full rounded-xl border bg-[var(--app-background)] px-3.5 py-3 text-sm text-[var(--muted)]"
            disabled
            value={email ?? ""}
          />
        </label>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{message}</p>
        <button
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
