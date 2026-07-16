import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      eyebrow="Workspace"
      title="Projects"
      userEmail={user.email}
      userName={user.displayName}
    >
      <section className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-semibold tracking-[-0.035em]">Projects</h2>
        <p className="mb-8 mt-3 text-[var(--muted)]">
          Organize environments by application, service, or product.
        </p>
        <ProjectWorkspace />
      </section>
    </AppShell>
  );
}
