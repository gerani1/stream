import type { ComponentType, ReactNode } from 'react';

/** Landing-page structure. Presentational only — no data, no client state. */

export const SHELL = 'mx-auto w-full max-w-6xl px-6';

export function Section({
  children,
  tone = 'bg',
  id,
}: {
  children: ReactNode;
  tone?: 'bg' | 'subtle' | 'ink';
  id?: string;
}) {
  const tones = { bg: 'bg-bg text-fg', subtle: 'bg-subtle text-fg', ink: 'bg-ink text-fg-invert' };
  return (
    <section id={id} className={`scroll-mt-16 ${tones[tone]}`}>
      <div className={`${SHELL} py-20 sm:py-28`}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  center = false,
  invert = false,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <span className={`eyebrow ${invert ? 'text-white/70' : 'text-accent'}`}>{eyebrow}</span>
      <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {lead && (
        <p
          className={`mt-4 text-pretty text-lg leading-relaxed ${
            invert ? 'text-muted-invert' : 'text-muted'
          }`}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

/** A rounded icon tile in the accent-soft colour. The one recurring visual motif. */
export function IconTile({
  icon: Icon,
  tone = 'accent',
}: {
  icon: ComponentType<{ className?: string }>;
  tone?: 'accent' | 'live' | 'warn' | 'danger' | 'stacks' | 'invert';
}) {
  const tones = {
    accent: 'bg-accent-soft text-accent',
    live: 'bg-live-soft text-live',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    // Brand orange, reserved for tiles that specifically reference Stacks
    // itself (the chain, StackStream) rather than a product action.
    stacks: 'bg-stacks-soft text-stacks-ink',
    invert: 'bg-white/10 text-white',
  };
  return (
    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  tone,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  tone?: 'accent' | 'live' | 'warn' | 'danger' | 'stacks';
  children: ReactNode;
}) {
  return (
    <div className="card-interactive">
      <IconTile icon={icon} tone={tone} />
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/** One step in a horizontal or vertical numbered flow. */
export function StepCard({
  n,
  title,
  children,
  active = false,
}: {
  n: number;
  title: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <div className={active ? 'card-interactive ring-2 ring-accent' : 'card-interactive'}>
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
          active ? 'bg-accent text-accent-fg' : 'bg-subtle text-muted'
        }`}
      >
        {n}
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export function CheckList({ items, tone }: { items: string[]; tone: 'does' | 'never' }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
              tone === 'does' ? 'bg-live-soft text-live' : 'bg-white/10 text-white/50'
            }`}
          >
            {tone === 'does' ? '✓' : '✕'}
          </span>
          <span className={tone === 'does' ? '' : 'text-muted-invert'}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Faq({ q, a }: { q: string; a: ReactNode }) {
  return (
    <details className="group border-b border-border py-5 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium marker:hidden">
        {q}
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-subtle text-sm text-muted transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{a}</div>
    </details>
  );
}

/**
 * A soft, out-of-focus brand-orange glow used purely as atmosphere behind a
 * hero or closing section. Absolutely positioned, ignored by layout and by
 * screen readers — never a surface anything sits "on top of" semantically.
 *
 * `size`/`position` are plain Tailwind classes so each placement can differ
 * without the component growing a geometry API.
 */
export function Glow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full bg-stacks opacity-[0.14] blur-3xl ${className}`}
    />
  );
}
