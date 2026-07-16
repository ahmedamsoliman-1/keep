import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { EnvironmentWorkspace } from "@/components/environments/environment-workspace";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { projectId } = await params;

  return (
    <AppShell
      eyebrow="Project"
      title="Environments"
      userEmail={user.email}
      userName={user.displayName}
    >
      <section className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">
          Environments
        </h2>
        <p className="mb-8 mt-3 text-[var(--muted)]">
          Separate configuration across local, staging, and production targets.
        </p>
        <EnvironmentWorkspace projectId={projectId} />
      </section>
    </AppShell>
  );
}
