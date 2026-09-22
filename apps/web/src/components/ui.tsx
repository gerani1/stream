import type { ReactNode } from 'react';

/**
 * Shared presentational primitives — soft modern SaaS system.
 *
 * Elevation comes from `shadow-soft`/`shadow-lift` on a rounded surface, not
 * from drawn borders. Every accent here is the one confident brand colour;
 * status uses the three small semantic colours (live / warn / danger) and
 * nothing else competes with them.
 */

export function PageHeader({
  eyebrow,
  title,
  meta,
  description,
}: {
  eyebrow?: ReactNode;
  title: string;
  meta?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header>
      {eyebrow && <div className="eyebrow mb-3 text-accent">{eyebrow}</div>}
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {description && (
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted">{description}</p>
      )}
      {meta && <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-sm">{meta}</dl>}
    </header>
  );
}

export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{children}</dd>
    </div>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="eyebrow text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'live';
}) {
  const toneClass = tone === 'danger' ? 'text-danger' : tone === 'live' ? 'text-live' : '';
  return (
    <div>
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className={`mt-1.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="pill bg-subtle text-muted">{children}</span>;
}

type BadgeTone = 'neutral' | 'accent' | 'live' | 'warn' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-muted',
  accent: 'bg-accent-soft text-accent',
  live: 'bg-live-soft text-live',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};
const DOT_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  live: 'bg-live',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

export function Badge({
  tone = 'neutral',
  title,
  children,
  dot,
}: {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span title={title} className={`pill font-medium ${BADGE_TONES[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Truncated Stacks principal. Full value stays available on hover. */
export function Address({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs text-muted" title={value}>
      {value.slice(0, 8)}…{value.slice(-4)}
    </span>
  );
}

export function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warn' | 'danger';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-subtle text-muted',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
  };
  return (
    <p className={`whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return <p className="text-sm text-muted">{label}</p>;
}
