import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Ban,
  Clock,
  Layers,
  ShieldCheck,
  Split,
  Timer,
  Users,
  Vote,
  Zap,
} from 'lucide-react';
import { StreamDemo } from '@/components/landing/StreamDemo';
import {
  CheckList,
  Faq,
  FeatureCard,
  Glow,
  IconTile,
  Section,
  SectionHeader,
  SHELL,
  StepCard,
} from '@/components/landing/sections';

export const metadata: Metadata = {
  title: 'StackStream Bounty Board — streamed bounties and grants on Stacks',
  description:
    'Post bounties and accelerator grants that pay out as a continuous stream instead of a lump sum. Non-custodial: funds live on StackStream, never on this board.',
};

/**
 * Marketing landing page.
 *
 * Fully static — no data fetching, one small client component for the animated
 * stream. It must render correctly with the API down, because that is exactly
 * when someone is most likely to be evaluating the project.
 */
export default function LandingPage() {
  return (
    <div>
      {/* ---- hero ---- */}
      <section className="relative overflow-hidden bg-bg">
        <Glow className="-left-32 -top-40 h-[28rem] w-[28rem]" />
        <Glow className="-right-40 top-20 h-96 w-96" />
        <div
          className={`${SHELL} relative grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1.1fr_auto]`}
        >
          <div>
            <span className="pill bg-stacks-soft font-medium text-stacks-ink">
              <Zap className="h-3.5 w-3.5" />
              Built on Stacks · powered by StackStream
            </span>
            <h1 className="mt-6 max-w-xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Pay builders by the second.
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted">
              Post a bounty or run a cohort accelerator where funds stream continuously to a
              builder&rsquo;s wallet while the work happens — and stop the moment it doesn&rsquo;t.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/browse" className="btn-primary">
                Browse open work
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/create" className="btn-ghost">
                Post a task
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-live" />
              Non-custodial — your deposit lives on StackStream, never on this board.
            </p>
          </div>
          <div className="relative justify-self-center lg:justify-self-end">
            <Glow className="-right-10 -top-10 h-64 w-64 opacity-[0.18]" />
            <StreamDemo />
          </div>
        </div>
      </section>

      {/* ---- feature grid ---- */}
      <Section tone="subtle">
        <SectionHeader
          eyebrow="Why it's different"
          title="Streaming solves what lump sums can't."
          lead="Pay up front and you lose leverage. Pay on completion and the builder finances the work. Streaming fixes both at once."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={Timer} title="Pays continuously">
            Value accrues every second the work is live, instead of jumping in one lump sum.
          </FeatureCard>
          <FeatureCard icon={ShieldCheck} title="Never holds funds" tone="stacks">
            Deposits live on StackStream. This board is a control surface, never a wallet.
          </FeatureCard>
          <FeatureCard icon={Split} title="One deposit, many streams" tone="stacks">
            Fund a whole cohort in one transaction — split evenly or by custom amount.
          </FeatureCard>
          <FeatureCard icon={Vote} title="Humans decide, always">
            The board surfaces data and executes votes. It never drops a project on its own.
          </FeatureCard>
        </div>
      </Section>

      {/* ---- how it works ---- */}
      <Section id="how">
        <SectionHeader
          eyebrow="How it works"
          title="Four steps. The deposit is step two."
          lead="There are no funded-looking-but-empty listings — the deposit is what brings a task into existence, and you choose recipients only after it confirms."
        />
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard n={1} title="Describe the work">
            Title, description, success criteria, skill tags, total amount.
          </StepCard>
          <StepCard n={2} title="Deposit to StackStream" active>
            One signature. Funds go to StackStream, and that&rsquo;s what creates the task.
          </StepCard>
          <StepCard n={3} title="Choose recipients">
            Set the duration and add wallets — one deposit funds every recipient in parallel.
          </StepCard>
          <StepCard n={4} title="Watch it stream">
            Streams start on selection and run to term, live on the task page.
          </StepCard>
        </ol>
      </Section>

      {/* ---- non-custodial: the one inverted section ---- */}
      <Section tone="ink" id="custody">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeader
              eyebrow="Non-custodial"
              title="We never hold your money."
              lead="Funds move from StackStream straight to the builder's wallet. The board sits beside that path, never on it."
              invert
            />
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-invert">
              One honest consequence: streamed funds are final. Pausing or stopping halts future
              disbursement only — value already delivered cannot be clawed back.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-6">
              <h3 className="text-sm font-semibold text-white">The board does</h3>
              <div className="mt-5">
                <CheckList
                  tone="does"
                  items={[
                    'Create and configure tasks',
                    'Build deposit transactions to sign',
                    'Request stream start, pause, stop',
                    'Index live stream state',
                  ]}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 p-6">
              <h3 className="text-sm font-semibold text-white">The board never</h3>
              <div className="mt-5">
                <CheckList
                  tone="never"
                  items={[
                    'Takes custody of your deposit',
                    'Operates an escrow contract',
                    'Holds a balance to drain',
                    'Asks for a seed phrase',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- product types ---- */}
      <Section id="products">
        <SectionHeader
          eyebrow="Two ways to use it"
          title="A one-week task or a three-month program."
          lead="Same rail, same spine — post, deposit, configure, select, stream, review. They differ only in review cadence and who holds the stop trigger."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="card-flat relative overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-1 bg-stacks" aria-hidden="true" />
            <IconTile icon={Zap} tone="stacks" />
            <h3 className="mt-5 text-xl font-semibold">Task / Bounty Stream</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A single deliverable, a set price, streamed to one builder.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag>One builder</Tag>
              <Tag>1–2 weeks</Tag>
              <Tag>Reviewed once</Tag>
              <Tag>Funder decides</Tag>
            </div>
          </div>
          <div className="card-flat bg-accent-soft">
            <IconTile icon={Users} />
            <h3 className="mt-5 text-xl font-semibold">Cohort Accelerator</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Several live products, one committee, growth measured over time.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag>~5 projects</Tag>
              <Tag>1–3 months</Tag>
              <Tag>Biweekly review</Tag>
              <Tag>Committee decides</Tag>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- two-strike ---- */}
      <Section tone="subtle" id="reviews">
        <SectionHeader
          eyebrow="Accountability"
          title="Nobody gets cut over one bad fortnight."
          lead="A first weak review is always a warning, never a cut — and the stream keeps running while it's decided."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          <div className="card-flat">
            <IconTile icon={Clock} tone="warn" />
            <h3 className="mt-4 font-semibold">1. Flagged, not cut</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A weak review warns the project and gives a full cycle to recover. The stream keeps
              paying at full rate.
            </p>
          </div>
          <div className="card-flat">
            <IconTile icon={ShieldCheck} tone="live" />
            <h3 className="mt-4 font-semibold">2. Recover, flag clears</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Numbers moving again means the flag lifts and the project continues normally.
            </p>
          </div>
          <div className="card-flat">
            <IconTile icon={Ban} tone="danger" />
            <h3 className="mt-4 font-semibold">3. Still flat, committee votes</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Only a drop vote stops the stream. Everything already streamed stays with the
              project.
            </p>
          </div>
        </div>
      </Section>

      {/* ---- worked example ---- */}
      <Section id="example">
        <SectionHeader
          eyebrow="Worked example"
          title="Five products enter, three graduate."
          lead="A 12-week cohort funded by a single deposit — 1,200 STX per project, biweekly reviews."
        />
        <div className="mt-12 overflow-hidden rounded-2xl border border-border shadow-soft">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="bg-subtle text-left">
                <th className="px-6 py-4 font-medium text-muted">Project</th>
                <th className="px-6 py-4 font-medium text-muted">Trajectory</th>
                <th className="px-6 py-4 font-medium text-muted">Outcome</th>
                <th className="px-6 py-4 text-right font-medium text-muted">Streamed</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['A', 'Growing throughout', 'Graduates', '1,200', 'ok'],
                  ['B', 'One flat cycle, recovered', 'Graduates', '1,200', 'ok'],
                  ['C', 'Flat from week 8', 'Dropped week 10', '~1,000', 'cut'],
                  ['D', 'Flat from week 2', 'Dropped week 4', '~400', 'cut'],
                  ['E', 'Growing throughout', 'Graduates', '1,200', 'ok'],
                ] as const
              ).map(([id, trajectory, outcome, streamed, tone]) => (
                <tr key={id} className="border-t border-border">
                  <td className="px-6 py-4 font-mono font-semibold">{id}</td>
                  <td className="px-6 py-4 text-muted">{trajectory}</td>
                  <td className="px-6 py-4">
                    <Badge tone={tone === 'cut' ? 'danger' : 'live'}>{outcome}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">{streamed} STX</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
          C and D keep everything already streamed. ~2,000 STX of the 6,000 pool goes unstreamed
          and returns to the funder — to top up graduates, or roll into the next cohort.
        </p>
      </Section>

      {/* ---- faq ---- */}
      <Section tone="subtle" id="faq">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <SectionHeader eyebrow="Questions" title="Details worth knowing." />
          <div>
            <Faq
              q="Where does my deposit actually sit?"
              a="On StackStream. The board builds an unsigned transaction, your wallet signs it, and funds go to StackStream's contract — never to the board."
            />
            <Faq
              q="Can I stop a stream if the work stalls?"
              a="Yes, any time. Stopping halts future disbursement; the unstreamed remainder stays with you. What already streamed is final and cannot be recovered."
            />
            <Faq
              q="What stops a funder pausing at 90% to avoid paying?"
              a="Pausing is time-boxed and auto-resumes after a cooling-off window. Every stop is recorded publicly on the funder's profile with the reason and amount streamed."
            />
            <Faq
              q="Does being flagged cost me money?"
              a="No. A flag is a warning that the next review is decisive — your stream keeps running at full rate through the grace cycle."
            />
            <Faq
              q="Can one deposit fund several people?"
              a="Yes. A single deposit funds any number of parallel streams, split evenly or by custom amount. Stopping one leaves the others untouched."
            />
            <Faq
              q="Do I need an account?"
              a="No. Sign-in is a message signed by your Stacks wallet — no email, no password."
            />
          </div>
        </div>
      </Section>

      {/* ---- cta ---- */}
      <section className="relative overflow-hidden bg-bg">
        <Glow className="left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.10]" />
        <div className={`${SHELL} relative py-24 text-center sm:py-28`}>
          <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Fund work that pays as it happens.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-lg leading-relaxed text-muted">
            Post a bounty in a few minutes, or see what the ecosystem is already paying for.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/create" className="btn-primary">
              Post a task
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/browse" className="btn-ghost">
              Browse open work
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="pill bg-white text-xs font-medium text-fg">{children}</span>;
}

function Badge({ tone, children }: { tone: 'live' | 'danger'; children: React.ReactNode }) {
  const tones = tone === 'live' ? 'bg-live-soft text-live' : 'bg-danger-soft text-danger';
  return <span className={`pill text-xs font-semibold ${tones}`}>{children}</span>;
}
