import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SecuritySettings } from "@/components/settings/security-settings";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      eyebrow="Account"
      title="Settings"
      userEmail={user.email}
      userName={user.displayName}
    >
      <section className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">
          Security settings
        </h2>
        <p className="mb-8 mt-3 text-[var(--muted)]">
          Manage account verification, multi-factor authentication, and vault
          security.
        </p>
        <SecuritySettings />
      </section>
    </AppShell>
  );
}
