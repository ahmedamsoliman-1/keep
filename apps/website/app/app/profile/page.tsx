import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ProfileForm } from "@/components/settings/profile-form";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      eyebrow="Account"
      title="Profile"
      userEmail={user.email}
      userName={user.displayName}
    >
      <section className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">Profile</h2>
        <p className="mb-8 mt-3 text-[var(--muted)]">
          Manage your personal details and account identity.
        </p>
        <ProfileForm initialDisplayName={user.displayName} email={user.email} />
      </section>
    </AppShell>
  );
}
