import type { SVGProps } from "react";

export function EnvaultMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
      {...props}
    >
      <path
        d="M20 3.75 33 9.1v9.6c0 8.17-5.13 14.7-13 17.55C12.13 33.4 7 26.87 7 18.7V9.1L20 3.75Z"
        fill="currentColor"
      />
      <path
        d="M13.2 14.25h13.6M13.2 20h10.1M13.2 25.75h13.6"
        stroke="var(--logo-cutout, var(--background))"
        strokeLinecap="round"
        strokeWidth="2.25"
      />
      <circle cx="27" cy="20" r="2.8" fill="var(--logo-accent, #818cf8)" />
    </svg>
  );
}

export function EnvaultLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <EnvaultMark className="size-8 shrink-0 text-[var(--foreground)]" />
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          Envault
        </span>
      ) : null}
    </span>
  );
}
