import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { VaultStatusCard } from "@/components/vault/vault-status-card";
import { isEmailVerificationRequired } from "@/lib/features";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isEmailVerificationRequired() && !user.emailVerified) {
    redirect("/verify-email");
  }

  return (
    <AppShell
      eyebrow="Workspace"
      title="Overview"
      userEmail={user.email}
      userName={user.displayName}
    >
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-sm text-[var(--muted)]">Welcome back</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.035em]">
              Your environments, organized and protected.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-[var(--muted)]">
              Create the client-side encrypted vault before adding projects and
              environment variables.
            </p>
            <VaultStatusCard />
          </div>
          <aside className="rounded-2xl border bg-[var(--surface)] p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Workspace summary
            </p>
            <div className="mt-6 divide-y">
              {[
                ["Projects", "0"],
                ["Environments", "0"],
                ["Variables", "0"],
                ["Active devices", "1"],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between py-4"
                  key={label}
                >
                  <span className="text-sm text-[var(--muted)]">{label}</span>
                  <span className="font-mono text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
