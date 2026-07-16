import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { VariableWorkspace } from "@/components/variables/variable-workspace";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EnvironmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ environmentId: string }>;
  searchParams: Promise<{ projectId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [{ environmentId }, query] = await Promise.all([params, searchParams]);
  if (!query.projectId) redirect("/app/projects");

  return (
    <AppShell
      eyebrow="Environment"
      title="Variables"
      userEmail={user.email}
      userName={user.displayName}
    >
      <section className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">
          Variables
        </h2>
        <p className="mb-8 mt-3 text-[var(--muted)]">
          Values are encrypted locally before they reach the Envault API.
        </p>
        <VariableWorkspace
          environmentId={environmentId}
          projectId={query.projectId}
        />
      </section>
    </AppShell>
  );
}
