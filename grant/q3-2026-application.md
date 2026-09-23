# StackStream Bounty Board — Stacks Endowment Application

**Track:** Getting Started · **Requested:** $10,000 · **Split:** 20 / 30 / 50

> **Before submitting — fill these in. They are the only things not drawn from the codebase:**
> 1. `[MIYEN'S BACKGROUND]` — prior experience, technical or otherwise, and why he built this. This is the one real gap in the application: the codebase proves what he can build, but reviewers will want to know who he is beyond that. Fill this in wherever it appears.
> 2. `[DEMO URL]` — the deployed demo running on MockStreamProvider.
> 3. `[PRIOR GRANTS / PRIOR STACKS WORK]` — state plainly if this is Miyen's first grant and first Stacks project, or list what came before. Do not leave these as unanswered questions.
> 4. Confirm `github.com/gerani1/stream` is **public**. Several answers invite reviewers to clone and run the tests.
> 5. Ask StackStream for one written line confirming their commitment to the integration work — attach it or quote it. A named partner is the single strongest asset this application has.
> 6. **Decide the Milestone 1 network before submitting.** StackStream's own testnet deployment (`ST1D7YBYFW44KJE8VAAN2ACX23BCX3FDV5YQRX3RB`) returns 404 on the Hiro API — it is gone. Their live protocol is mainnet-only, at `SP2V6TCRFTYQHP8F4D9HSFZHRQNGVBQEZR0TMSM79` (verified directly; 11 real streams as of 2026-09-23). Either redeploy their open-source contracts to testnet ourselves, or integrate directly against live mainnet with small real sBTC amounts — the stronger option for a "Getting Started" application, since it proves the real thing rather than a parallel copy. Pick one and adjust Milestone 1's description and date.

---

## 02 — Project

### Project name
```
StackStream Bounty Board
```

### Website or repo
```
https://github.com/gerani1/stream — [DEMO URL]
```

### Primary category
DeFi / Payments, or an "Ecosystem tooling" option if one exists. Not AI — check the field's default.

### Secondary category
Developer tooling / Ecosystem growth, if available.

### Project Description
```
The Bounty Board turns lump-sum bounties, grants and accelerator stipends into
continuous sBTC payment streams on Stacks — without ever holding a user's
money.

A funder either pays up front and loses all leverage, or pays on completion
and asks the builder to finance their own time. Streaming fixes this: value
accrues while work happens and can be halted the moment it stops. StackStream
already provides that rail on Stacks. What it lacks is the layer above it — a
place where funders post work, builders find it, and a review loop decides
whether a stream keeps running. That layer is this board.

Streams settle in sBTC, held by the sBTC signer system rather than by
StackStream or by this board. A builder is paid in an asset whose value
depends on neither — which matters specifically for grant and treasury
funding on Stacks, where the capital deployed is increasingly Bitcoin-
denominated already.

The defining property is that the board is non-custodial. It creates tasks,
constructs deposit transactions for the funder to sign, requests
start/pause/stop against StackStream, and indexes stream state back into a
UI. It never takes custody of a deposit or operates an escrow contract, and
never sits between StackStream and the builder's wallet.

Built today and verifiable by cloning the repo: the complete domain layer —
task lifecycle state machine, allocation maths, the two-strike review
resolver, review-cadence assessment — as pure, fully tested code with no I/O.
21 API endpoints across wallet auth, task lifecycle, selection, stream
control, structured reports, committee voting and an append-only audit log.
12 database models. Five web pages including the deposit-creates-task wizard
and the committee review dashboard. 31 tests pass with no database, no Redis,
no StackStream account and no testnet funds required — `npm install && npm
test` is the whole verification path.

That last property is deliberate. All StackStream access goes through a
single adapter, with a mock implementation that simulates streaming and the
real one, which throws NOT_IMPLEMENTED on every method today — a scheduling
gap, not an open technical question. I read StackStream's contracts directly
rather than treat the integration as a black box: `stream-manager.clar` and
`stream-factory.clar` are live on Stacks mainnet at
`SP2V6TCRFTYQHP8F4D9HSFZHRQNGVBQEZR0TMSM79`, verified against the Hiro API,
with 11 real streams as of 2026-09-23 and a published, community-reviewed
security review. StackStream also ships an API — OpenClaw — that builds
unsigned transaction parameters for create-stream, claim, pause, resume and
cancel, the same non-custodial pattern this board is built on. The token
model is SIP-010 throughout, and sBTC is a SIP-010 token, so streaming it
needs no special casing on either side. What remains is wiring, not
discovery: fill in seven methods behind an already-stable interface, choose
between calling the contracts directly or going through OpenClaw, and decide
the Milestone 1 network now that StackStream's own testnet is gone.

The grant funds three things: landing the real integration, running the
first real bounty on mainnet end to end, and running a pilot cohort with a
real committee and a real drop decision executed through the board.
```

---

## 03 — Audience and ecosystem fit

### Primary audience
```
Two sides of the same marketplace, and the product only works if both show
up.

Funders — protocols, DAOs, founders and program operators who currently
choose between paying up front and losing leverage, or paying on completion
and asking a builder to carry weeks of unpaid cost. For a cohort operator,
the alternative today is a spreadsheet and manual payouts.

Builders — developers, designers and small teams who want to be paid while
they work rather than sixty days after they deliver. Money is already
flowing before anyone argues about whether the work was good enough.

The third participant is the committee — the humans who review a cohort's
progress and decide whether a stream continues, using charted metric trends
and a vote trail in place of a call where everyone tries to remember what
was promised last fortnight.
```

### Audience segmentation
```
1. Ecosystem program operators — the clearest initial user. Anyone running
   an accelerator, grant round or growth program, currently doing it with
   spreadsheets and manual transfers. The cohort flow is built for them.

2. Protocols and DAOs posting bounties — need discrete work done and want to
   stop paying if it stalls. The bounty flow serves them with one review
   point and a time-boxed pause.

3. Individual builders — paid continuously rather than on delivery, and
   accumulate a public reputation history that is the enforcement mechanism
   in a system that holds no money.

4. Funded projects inside a cohort — already-live Stacks products receiving
   a streamed stipend against biweekly metrics: users onboarded, transaction
   count, volume, retention delta.

5. StackStream itself. Every task on the board is a deposit on StackStream
   and N streams running through it — a demand generator for an existing
   protocol, not a competitor to it.
```

### Why Stacks?
```
The board exists because StackStream exists. Its entire premise — a review
decision mapping onto start, pause and stop against a live stream — is a
description of StackStream's primitives. Ported elsewhere, it would be a
different product on a different rail.

Non-custody depends on that too. The board is a pure control surface because
the money lives on StackStream's contracts and moves directly to the
builder. On a rail without programmable streams, the same product would need
an escrow contract — custody, a drainable balance, money-transmission
exposure. Stacks already provides the piece that would otherwise have to be
rebuilt as custody.

Wallet-first authentication follows the same logic. There are no passwords;
the wallet that signs in is the wallet that signs the deposit and receives
the stream. Identity, payment and authority are one key.

The settlement asset is the clearest example of why this has to be Stacks
specifically. sBTC exists because Stacks anchors to Bitcoin and can verify
Bitcoin deposits without a bridge operator holding custody. A product paying
builders in Bitcoin-backed value while never touching the money is not
portable to a chain where that asset doesn't exist.

Stacks also has the ecosystem need: a growing set of live products and a
steady flow of grant funding, but the mechanics of paying builders remain
manual.
```

### Maintenance plan
```
Miyen Samuel is the sole founder and builder — he owns the product, the
programme design, and the codebase that runs it. There is no handoff risk
because there is nothing to hand off: the person who wrote the domain layer,
the API, the data model and the web application is the person running the
programmes on top of it.

The code stays public at github.com/gerani1/stream under an open licence.
Issues are the public support channel.

Structurally, the board going down does not put anyone's money at risk.
Streams run on StackStream independently of it. If the board is offline,
builders keep getting paid and funders keep their unstreamed remainder — the
board is a control surface, not a dependency of the payment path.

Operationally it needs Postgres, Redis and a small job runner. A reconcile
job pulls stream status every five minutes, so the database is always a
cache of chain truth, never the source of it.

Ongoing cost after the grant is hosting plus gas for stream control
transactions — who pays is one of the open questions to settle before
mainnet. There is deliberately no fee at launch; that is a question for once
the board has usage data to decide with.
```

### Ecosystem fit
```
The board composes with an existing Stacks protocol instead of duplicating
one. It writes no streaming primitive, no escrow contract, no token, and
needs no new StackStream feature to ship the bounty flow — every capability
it uses already exists. The work is the marketplace and governance layer
above them, which nobody has built.

It is also useful to the Endowment's own operations: a grants programme
paying milestones in lump sums has the exact problem this product addresses,
and a cohort run on this board leaves a structured report trail behind every
continue-or-stop decision that a neutral third party can follow afterward.

On overlap: there is no other non-custodial, streamed marketplace with a
committee review loop over StackStream that we are aware of. Generic bounty
boards exist off-chain as custodial escrow services or simple listing sites.

The strongest signal is that StackStream has committed to the integration
work — and it is a concrete overlap, not just goodwill. Their own public
grant milestone plan sets a usage bar of 25 active streams and $10,000
equivalent streamed, and names "developer integrations — another Stacks app
integrates StackStream and creates streams on behalf of their users" as one
of their own paths to it. That is a description of this board. A single
pilot cohort of five projects streamed from one deposit is five real streams
toward their number in one transaction — one grant's success metric feeding
directly into another's.
```

---

## 04 — Risk and prior history

### Referral source
```
Through the Stacks ecosystem and directly through the StackStream team, with
whom I am working on the integration.
```

### Risk disclosure
```
Integration risk — the real adapter is unimplemented today; every method in
packages/provider/src/stackstream.ts throws NOT_IMPLEMENTED, deliberately,
so the product could be built and tested against a mock before the
integration existed. I verified the target rather than take it on faith:
`stream-manager.clar` and `stream-factory.clar` are live on Stacks mainnet
at `SP2V6TCRFTYQHP8F4D9HSFZHRQNGVBQEZR0TMSM79` — 11 real streams as of
2026-09-23, confirmed against the Hiro API — with a published security
review covering every public function. The token model is SIP-010 only, so
sBTC streams with no special casing; native STX would need a wrapper that
does not yet exist. Claiming is pull-based — the recipient calls `claim` to
sweep earned tokens into their wallet, which the UI needs to support
explicitly. StackStream also ships an API (OpenClaw) that already builds
unsigned transactions in the same pattern our own `buildDeposit` assumes.
What remains is a choice, not a discovery: call the contracts directly or go
through OpenClaw, and how Milestone 1 runs now that StackStream's own
testnet is gone (see the note at the top of this document).

Governance risk — stream authority is settled by the contract. `pause-stream`,
`resume-stream` and `cancel-stream` all assert the caller is the exact
principal that called `create-stream`; there is no admin override or
delegated-controller path. A funder-signed stop isn't a design choice, it's
the only model the contract supports, and that's fine for bounties since the
funder is the decision-maker anyway. For a cohort, a committee can only
enforce a drop if the committee itself is the sender — which is why the
pilot's pool is deposited from a committee-controlled multisig. Delegated
stop authority doesn't exist today; it would be a real feature request to
StackStream, and we aren't relying on it.

Product risk — streamed funds are irreversible. Pausing or stopping halts
future disbursement only; nothing already streamed can be recovered. Stated
plainly in the UI at deposit time, and every dispute mechanism operates on
the unstreamed remainder alone.

Product risk — a funder could pause at 90% to avoid paying. `resume-stream`
rejects resuming past a stream's end-block, so an abandoned pause can't just
be revived — StackStream's own answer is the permissionless `expire-stream`,
which settles the stream once the end-block passes: earned amount to the
builder, remainder to the funder, callable by anyone. Our cooling-off job (7
days) uses `resume-stream` within the window and falls back to
`expire-stream` once the original duration has elapsed, so the builder is
made whole either way. Every stop or settlement is recorded publicly with
the percentage streamed, and a builder can escalate to the committee, whose
ruling is recorded but can't reverse the outcome.

Delivery risk — solo founder, and a cohort takes real calendar time. Bus
factor is real: everything depends on one person, which is also why the
codebase is fully tested and documented rather than living in one person's
head. A twelve-week cohort can't fit inside a grant milestone, so Milestone
3 runs a shortened pilot on a weekly cadence rather than biweekly; our own
cadence rules show a short programme on biweekly review leaves too few
cycles for the two-strike mechanism to mean anything.

Adoption risk — the board needs funders and builders simultaneously.
Milestone 2 requires a bounty from a funder who isn't us.

Legal and regulatory — the board is non-custodial: no escrow, no balance, no
position between StackStream and the builder's wallet. That reduces
money-transmission exposure versus an escrow-based platform. We aren't
lawyers and would welcome the Foundation's view.

Security — the audit surface is limited to the adapter and the permission
model. Every stream control action is idempotent and keyed by an operation
id, so a retried request can't double-stop or double-start. Every transition
writes to an append-only audit log. No external audit has been done on our
side.
```

### Prior grants
```
[Miyen Samuel: state prior grants, amounts, funders and outcomes — or write
"None, this is his first" if true. Do not leave this as a placeholder in the
submitted version.]
```

### Prior Stacks work
```
[Miyen Samuel: state his prior Stacks or crypto ecosystem work — or write
"None" if there is none. If he has run programmes, funded builders, or
operated anything where paying people was the problem, lead with that; it is
direct evidence for why this product exists.]

On this project specifically: the current codebase — domain layer, API,
data model, web application and provider seam — with 31 passing tests that
require no database, chain access or StackStream account to run, and the
direct read of StackStream's Clarity contracts and mainnet state that
underpins the risk disclosure above.
```

---

## 05 — Track and qualification
Getting Started · $10,000 · Open track, no gates.

---

## 06 — Track-specific context (Getting Started)

### What are you proposing to explore or build?
```
A non-custodial marketplace layer over StackStream that turns bounties,
grants and accelerator stipends into continuous sBTC payment streams, with a
human review loop wired directly to stream control.

Two product types, one backend. A bounty: a funder posts work, deposits,
selects a builder, and a stream runs to that builder's wallet for a set
duration with one review point at submission. A cohort: a committee funds
several already-live Stacks products from one deposit, each receiving a
streamed stipend, with structured reports and a review every cycle. Both
share one spine — post, deposit, configure, apply, select, stream, review,
end — differing only in review cadence and who holds the stop trigger.

One ordering decision defines the product: the deposit is what creates the
task. There is no draft state mistaken for live, and no funded-looking but
empty listing. Recipients are attached after the deposit, which is also what
lets a single deposit fund many parallel streams — five cohort projects
backed by one transaction, where stopping one does not touch the others.

What is being explored is whether a review committee can govern money it
does not hold. The board cannot enforce anything by withholding funds,
because it never has them — enforcement depends entirely on authority
delegated on StackStream, which is why the first cohort runs from a
committee-controlled multisig rather than waiting on a protocol feature.

What we are not building: no streaming primitive, no escrow contract, no
token, no rate-adjustment or event-gated streaming. Start, pause and stop
cover every case.
```

### What user or ecosystem problem motivates the project?
```
Lump-sum payouts are a bad fit for open-ended work. The funder pays up front
and loses all leverage, or pays on completion with no visibility until the
end. The builder finances weeks of their own time and carries the risk that
acceptance never comes.

Streaming resolves it structurally: value accrues continuously and can be
halted the moment it stops. The funder's exposure at any point is only what
has streamed so far; the builder is paid for time already spent.

But a payment rail is not a marketplace. There is nowhere to post work,
nowhere to find it, and no structured loop deciding whether a stream should
keep running. A programme operator paying five projects today does it with
a spreadsheet and manual transfers, and a stalled project is cut from
memory on a call.

The deeper problem is that accountability in funded work is usually
undocumented. The board makes the structured biweekly report the audit
trail behind every decision — metrics charted over time, votes recorded
append-only, every transition logged with actor, timestamp and reason.
Disputes point at a record rather than at what someone remembers.
```

### Why is Stacks the right environment for this work?
```
Because the product is a front end for StackStream, a Stacks protocol. The
board's entire job is mapping human decisions onto its start, pause and stop
primitives — there is no version of this that is not built on that rail.

What Stacks lets us avoid building matters more. The board is non-custodial
only because programmable streaming already exists on-chain; without it,
the same product would need an escrow contract, a drainable balance and
real money-transmission exposure. The product's most important safety
property is inherited from the platform, not engineered.

Wallet-first identity follows the same logic: the wallet that signs in is
the wallet that signs the deposit and receives the stream, so there is no
account system holding credentials worth stealing.

Stacks also gives the indexing path. StackStream's contract emits a
structured print event on every state transition — exactly the shape
Chainhooks predicate on — but neither team has wired one up yet; it's on
StackStream's own roadmap as an optional mainnet addition. Until then the
board treats its database as a cache rebuilt by polling read-only functions
on a fixed interval, which is sufficient because every figure it displays
can be independently recomputed from those same calls at any time.
```

### What have you already validated, prototyped, or learned?
```
Built and verifiable by cloning the repository: the complete domain layer
as pure, fully tested code with no I/O; 21 API endpoints covering auth,
task lifecycle, selection, stream control, reports, committee voting and an
append-only audit log, behind 12 database models; five web pages including
the deposit-creates-task wizard and the committee review dashboard; 31
tests passing, including a full cohort scenario exercised end to end
against simulated time. The suite needs no database, no Redis, no
StackStream account and no testnet funds — `npm install && npm test`
verifies the whole thing in under a second.

What designing carefully first taught me: the adapter seam is why this
project isn't stuck — one interface, a mock implementation, and only one
file blocked on the real integration. Payment tracking elapsed time rather
than approval means funder approval does not gate the money; it gates
reputation and closes the task cleanly, and the UI has to be honest about
that or it lies about where control sits. Non-custody means reputation does
the enforcement work custody usually does — a funder pausing at 90% is a
real attack, met with a time-boxed pause that resumes automatically within
the cooling-off window, or settles automatically through StackStream's
permissionless path if the stream's own duration has already elapsed. Short
programmes break the two-strike mechanism: on a biweekly cadence a project
can be flat for about four weeks before being cut, but a one-month
programme only has two review points, so the board warns funders when their
chosen duration and cadence leave too few cycles.

What I have not validated: a single real stream created through this board.
What I did validate, before writing this application, is that the protocol
underneath it is real — I cloned StackStream's repository, read both
contracts function by function, and confirmed against the Hiro API that
they are live on mainnet with 11 streams already created. I would rather
build a grant application on a protocol I have actually read than on its
marketing page.
```

### Who will do the work and what experience do they bring?
```
One person. Miyen Samuel is the founder and the sole builder — the domain
layer, the 21-endpoint API, the data model, the web application, the
provider seam and the 31 passing tests are his work, along with the direct
read of StackStream's Clarity source that underpins the risk disclosure in
this application. There is no division of labour to describe, and no
handoff risk: the person who understands why the deposit creates the task,
why approval doesn't gate payment, and why the pilot cohort has to run from
a multisig, is the person who will build the rest of it.

[MIYEN'S BACKGROUND — prior experience, technical or otherwise, and what
led him to build this specifically. If he has run programmes, funded
builders, or managed work where paying people was the problem, lead with
that: it is direct evidence for why this product exists.]
```

### What is the smallest useful outcome this grant should produce?
```
One real bounty, posted by a funder who is not us, funded by a real deposit
on StackStream, streamed to a builder's wallet while they work, and
completed — every step executed through the board and verifiable on-chain.

If that happens once, the core claim is proven: the board can map real
human decisions onto a live streaming rail without ever touching the money,
a stranger understood the product well enough to fund work through it, and
a builder was paid continuously rather than after the fact. Everything
else — the cohort flow, the committee, the two-strike mechanism — is the
same spine with a different review cadence.
```

### What evidence will show the concept is worth continuing?
```
Three things, in increasing order of how much they'd change our minds. A
real stream created through the board on mainnet, verifiable on-chain —
mechanical proof the integration works. A bounty posted by a funder we did
not recruit — the real test, and the hardest of the three to get. A
committee drop decision executed through the board with a report trail a
neutral third party could follow — proof the governance loop functions
under real conditions, with real money stopping.

What would tell us to stop: if funders consistently prefer lump sums after
understanding streaming, the premise is wrong. If builders won't take
streamed work because irreversibility cuts against them in practice, the
model needs rethinking. If stream authority can't be resolved in any of the
three models, committee decisions are permanently advisory. We will publish
whichever of these we find.
```

### What dependencies or risks could affect delivery?
```
The StackStream integration, covered in full in the risk disclosure above:
both contracts are live on mainnet, independently verified, with a
published security review and an existing API (OpenClaw) that already
builds the unsigned transactions we need. What's left is choosing an
integration path and a Milestone 1 network now that StackStream's testnet
is gone.

Stream authority is the largest design risk — the board cannot enforce a
drop by withholding money it never holds. We avoid being blocked by
shipping bounties on funder-signed stops and running the first cohort from
a committee multisig, neither of which needs a new StackStream feature.

Adoption is the risk we can least engineer around: Milestone 2 requires a
bounty from a funder who is not us, which depends on relationships rather
than code.

Calendar time constrains the cohort — a full twelve-week programme cannot
fit inside a grant milestone, so Milestone 3 runs a shortened pilot on a
weekly cadence, because a short programme on biweekly review leaves too few
points for the two-strike mechanism to mean anything.

Gas costs for stream control transactions are unsettled — funder, board, or
triggering party — and need an answer before mainnet.

Deliberately out of scope: an external security audit, automated on-chain
metric verification (reports are self-submitted and committee-reviewed in
v1), and any fee model.
```

### What support from the Stacks ecosystem would help?
```
Continued engagement from StackStream, already underway — settling which
integration path to use unblocks the only file in the codebase that is
blocked. Delegated stop authority doesn't exist in the contract today; if
they build it, committee decisions could eventually be enforceable without
a multisig-owned pool, though we aren't counting on that for this grant.

Introductions to programme operators — anyone running a grant round or
growth programme who currently manages payouts by hand. One real programme
is worth more than any amount of additional building.

Funders willing to post a real bounty — Milestone 2 depends on someone
outside the team choosing to fund work through the board, and that is the
hardest single thing in this application to guarantee.

Committee participation. The design expects independent Stacks ecosystem
representation alongside StackStream and the board maintainer, since a
neutral voice makes the first cohort's decisions credible in a way I cannot
manufacture myself.

A review of the permission model before mainnet — not a full audit, but a
second opinion on the authority model and idempotency guarantees before
real money flows.
```

### How will you share progress or learnings publicly?
```
The repository stays public at github.com/gerani1/stream, including the
architectural reasoning. The README documents what's built, what's
deliberately unimplemented and why, and updates as open questions resolve.

A written update per milestone, with on-chain transaction links, shared
publicly on X. For the pilot cohort, a full public post-mortem — how many
projects took part, how many were flagged or dropped and on what evidence,
what the next iteration needs — published whether the result is flattering
or not.

The most useful thing to publish for other builders is the design
learnings that aren't written down anywhere yet: what irreversibility means
for dispute design, why approval can't gate payment when payment tracks
elapsed time, how review cadence and programme length interact to make a
drop mechanism real or merely advisory. Any team building on StackStream
will hit all of this. The StreamProvider interface itself will also be
published — there's no reason for the next team to rediscover its shape.
```

### What happens after the grant if the work succeeds?
```
Success means one real bounty completed for an outside funder and one pilot
cohort run start to finish with a real drop decision. If both land: open
the board publicly and run programmes continuously, pursue delegated
controller support on StackStream once the mechanic is proven — the
difference between a committee that advises and one that governs — and
settle sustainability with usage data rather than a guess now (a flat fee,
a percentage of streamed value, or ecosystem funding). A follow-on Builder
Grant would cover a security audit and the depth work: automated metric
verification, reputation scoring, dispute escalation, programme templates.

The long-term measure is the success criteria we set ourselves: bounties
posted by funders we never recruited, builders returning for repeat work,
every drop decision backed by a trail a neutral party could follow, and
zero incidents involving user funds. If the pilot shows funders prefer lump
sums, or that a committee cannot govern money it does not hold, we will
publish that rather than seek follow-on funding the evidence doesn't
support.
```

### Any other context reviewers should consider?
```
On budget. $10,000 tied to the milestones: $2,000 for the StackStream
integration and public deployment, $3,000 for the mainnet bounty flow
(gas, onboarding support, the first real bounty run end to end), and $5,000
for the pilot cohort (committee coordination, gas across multiple parallel
streams, the published post-mortem). No salaries beyond the build work, no
marketing spend, no token.

On the weighting. Half the money sits on the cohort because deployed code
proves only that it can be built. Real funders, real builders and a real
drop decision executed on-chain is the claim worth paying for, and the one
I am least certain of.

On what is deliberately not built. The real adapter throws NOT_IMPLEMENTED
on every method today — an architectural decision, not an unfinished
feature. 31 tests, a complete domain layer and a working web application
all exist without a single chain call having been made. When the
integration path is chosen, seven methods get filled in and one
environment variable flips; nothing else in the codebase changes.

On verification. Clone the repository, run `npm install && npm test`, and
31 tests confirm the domain layer and streaming behaviour in under a
second. The demo at [DEMO URL] runs the complete product against simulated
time. We would rather be checked than believed.
```

---

## 07 — Compliance readiness
Individual applicant (Miyen Samuel). Tick the confirmation; have one acceptable government ID ready per the Vouched guidance. Nothing is uploaded at this stage.

---

## 08 — Milestones

### Milestone 1 — 20% · $2,000
**Name**
```
Live StackStream integration on testnet
```
**Target date**
```
2026-11-15
```
**Description**
```
Implement the real adapter against `stream-manager.clar`, already live on
Stacks mainnet at `SP2V6TCRFTYQHP8F4D9HSFZHRQNGVBQEZR0TMSM79` — this is
wiring, not discovery. [DECIDE BEFORE SUBMITTING — see the note at the top
of this document: StackStream's own testnet no longer resolves, so this
either targets our own testnet redeployment of their open-source contracts,
or targets mainnet directly with small real sBTC amounts. Update this
paragraph and the target date to match.] Choose between calling the Clarity
contracts directly or going through OpenClaw, fill in the seven methods in
packages/provider/src/stackstream.ts, and flip STREAM_PROVIDER to the real
adapter — the interface is already stable and exercised by 31 passing tests
against the mock.

With the adapter live, run the complete bounty path end to end: deposit
creates task, configure recipient and duration, stream starts, live
progress displays, pause behaves correctly — including the case where the
cooling-off window outlasts the stream's own duration, resolved through
StackStream's permissionless settlement rather than a resume — and the
stream reaches natural completion, with the builder claiming their earned
balance. Deploy the board publicly.
```
**Success criteria**
```
INTEGRATION PATH CONFIRMED (DIRECT CLARITY CALLS OR OPENCLAW) AND
DOCUMENTED, INCLUDING CONFIRMED sBTC STREAM SUPPORT. StackStreamProvider
FULLY IMPLEMENTED — NO REMAINING NOT_IMPLEMENTED METHODS. FULL
DEPOSIT-TO-STREAM-TO-COMPLETION PATH EXECUTED IN sBTC ON [TARGET NETWORK —
SEE NOTE AT TOP] THROUGH THE BOARD, WITH ON-CHAIN TRANSACTION RECORDS.
PAUSE BEHAVIOUR VERIFIED, INCLUDING THE PAST-END-BLOCK SETTLEMENT CASE.
BOARD DEPLOYED AND PUBLICLY REACHABLE. REPOSITORY UPDATED WITH INTEGRATION
CODE AND DEPLOYMENT NOTES.
```
**Payment percent** `20`

**Adoption metric**
```
Real sBTC streams created and completed through the board on the Milestone
1 target network, with on-chain transaction records linking the board's
deposit-creates-task flow to StackStream's contracts, publicly verifiable
on the Stacks explorer.
```

---

### Milestone 2 — 30% · $3,000
**Name**
```
First real bounty on mainnet, funded by an outside funder
```
**Target date**
```
2026-12-15
```
**Description**
```
A funder who is not the team posts a bounty, makes a real sBTC deposit on
StackStream through the board, reviews applications, selects a builder, and
a stream runs to that builder's wallet while the work happens. The builder
submits the deliverable, the stream completes, and it's recorded on the
builder's public profile.

This also proves the dispute-adjacent mechanics under real conditions: a
pause is genuinely time-boxed and resolves correctly either way it can end,
a stop or settlement is recorded publicly with the percentage streamed, and
the audit log captures every transition. Gas responsibility is settled and
documented.

The requirement that the funder is external is the point — a board where
the team posts all the work proves nothing about demand.
```
**Success criteria**
```
BOUNTY FLOW LIVE ON STACKS MAINNET. AT LEAST ONE BOUNTY POSTED AND FUNDED
BY A FUNDER OUTSIDE THE TEAM, WITH A REAL sBTC STACKSTREAM DEPOSIT. BUILDER
SELECTED AND sBTC STREAM RUN TO COMPLETION, WITH ON-CHAIN RECORDS FOR EVERY
STREAM CONTROL ACTION. PAUSE BEHAVIOUR VERIFIED ON MAINNET. PUBLIC AUDIT
LOG AND BUILDER REPUTATION RECORD VISIBLE. GAS RESPONSIBILITY SETTLED AND
DOCUMENTED. WRITTEN MILESTONE UPDATE PUBLISHED WITH TRANSACTION LINKS.
```
**Payment percent** `30`

**Adoption metric**
```
At least one bounty funded in sBTC by a wallet belonging to a funder
outside the team and streamed to completion on Stacks mainnet, with
deposit, start and completion transactions all publicly verifiable.
```

---

### Milestone 3 — 50% · $5,000 · FINAL
**Name**
```
Pilot cohort with a committee drop decision executed on-chain
```
**Target date**
```
2027-02-01
```
**Description**
```
A committee — StackStream representation, the board maintainer, and at
least one independent Stacks ecosystem representative — funds several
already-live Stacks products from a single sBTC deposit, each receiving a
streamed stipend to their own wallet. Projects submit structured reports
(users onboarded, transaction count, volume, retention delta, what shipped,
next period's plan) before each review, and the committee reviews charted
trends rather than recollection.

The cohort runs on a weekly cadence rather than biweekly, deliberately: our
own cadence rules show a short programme on biweekly review has too few
points for the two-strike mechanism to function, and we are not ignoring
our own warning in our own pilot.

Because stream authority is unresolved, the pool is deposited from a
committee-controlled multisig so drop votes are genuinely enforceable
without waiting on a StackStream feature. The milestone requires at least
one real flag, and — if the evidence supports it — a real drop vote
executed as an on-chain stream stop. A cohort where nobody underperforms is
a weaker test of the product, so the post-mortem will report honestly on
which occurred.
```
**Success criteria**
```
PILOT COHORT RUN START TO FINISH WITH MULTIPLE ALREADY-LIVE STACKS
PRODUCTS RECEIVING PARALLEL STREAMS FROM A SINGLE DEPOSIT. COMMITTEE
CONSTITUTED INCLUDING AT LEAST ONE INDEPENDENT ECOSYSTEM REPRESENTATIVE.
STRUCTURED REPORTS SUBMITTED EACH CYCLE AND REVIEWED THROUGH THE BOARD. AT
LEAST ONE FLAG RAISED THROUGH THE TWO-STRIKE MECHANISM, WITH A DROP VOTE
EXECUTED AS AN ON-CHAIN STREAM STOP IF THE EVIDENCE SUPPORTED ONE. COMPLETE
PUBLIC AUDIT TRAIL FOR EVERY DECISION. POST-MORTEM PUBLISHED AND SHARED
PUBLICLY ON X, REGARDLESS OF WHETHER RESULTS ARE POSITIVE.
```
**Payment percent** `50`

**Final adoption metric**
```
Distinct project wallets receiving parallel sBTC streams from a single
StackStream deposit through the board over the full pilot, measured by
streams started, streams run to term, and any stream stopped by committee
vote — each transaction publicly verifiable and each decision traceable to
its report and vote record in the board's public audit log.
```
