import { CheckCircle2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { KeepLogo, KeepMark } from "@/components/brand/keep-logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-[var(--app-background)] lg:grid-cols-[minmax(0,1.1fr)_minmax(440px,0.9fr)]">
      <section className="relative hidden overflow-hidden border-r bg-[#111318] p-12 text-white lg:flex lg:flex-col">
        <div className="auth-grid absolute inset-0 opacity-25" />
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-12rem] size-[30rem] rounded-full bg-violet-500/10 blur-3xl" />

        <Link className="relative z-10" href="/">
          <KeepLogo className="[--foreground:white] [--logo-cutout:#111318]" />
        </Link>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
            <Sparkles className="size-3.5 text-indigo-300" />
            Built for focused developer workflows
          </div>
          <h2 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.045em]">
            Secrets stay yours.
            <span className="block text-white/45">
              Environments stay organized.
            </span>
          </h2>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/55">
            One secure workspace for every project and environment, protected
            with client-side encryption before data leaves your device.
          </p>

          <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { icon: KeyRound, label: "Local encryption" },
              { icon: ShieldCheck, label: "Zero knowledge" },
              { icon: CheckCircle2, label: "Revision safe" },
            ].map((item) => (
              <div
                className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
                key={item.label}
              >
                <item.icon className="size-4 text-indigo-300" />
                <p className="mt-3 text-xs font-medium text-white/70">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/35">
          Keep security architecture · Protocol v1
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <Link className="mb-12 inline-flex lg:hidden" href="/">
            <KeepLogo />
          </Link>

          <div className="mb-8 hidden size-11 items-center justify-center rounded-xl border bg-[var(--surface)] lg:flex">
            <KeepMark className="size-7 text-[var(--foreground)]" />
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">
            {title}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-[var(--muted)]">
            {footer}
          </div>
        </div>
      </section>
    </main>
  );
}
