# Beginner-readiness audit — baseline

Measured 2026-08-23 against the working tree. This is the baseline the
[authoring standard](./authoring-standard.md) is meant to move.

## What these numbers are, and are not

They come from `scripts/audit-chapter-teaching.mjs`, which detects whether a
teaching element is **present** and **early enough to do its job**. It cannot
judge whether prose is correct, clear, or followable. A chapter it reports as
clean has not been verified — only a person reading it can do that.

The detector was calibrated against the corpus, not guessed. The first attempt
reported 56 of 57 chapters missing an orientation section, which was the regex
being narrow rather than the curriculum being broken; surveying the actual first
heading of all 57 chapters produced the real finding below. Treat every number
here as "how many chapters have the shape", never as "how many chapters teach
well".

Chapters read in full for this pass: `docker`, `terraform`, `k8s-workloads`.
Everything else is classified provisionally, from structure alone, and is marked
as such.

---

## The headline: two authoring generations — CLOSED in Phase 2

*Kept as the record of what the baseline was. Core coverage is now 39/40; the
list below is the original fifteen.*

The curriculum is 57 chapters, 40 of them `capstoneRole: core`. They were not
written to one standard, and the split was visible in the first heading of each
chapter.

**15 chapters opened with a bridge** that names what came before:

| Chapter | Opening |
| --- | --- |
| `linux-foundations` | Why this chapter comes first |
| `networking-fundamentals` | Why this chapter exists |
| `git-and-github` | Why this chapter exists |
| `build-tools` | Why this comes after Git |
| `docker` | Why Docker sits exactly here |
| `aws-overview` | Why this comes after Docker |
| `jenkins` | Why this comes after Kubernetes |
| `gitops` | Why this comes after the pipeline |
| `kustomize` | Why this chapter exists |
| `supply-chain-security` | The chain, and why it is a chain |
| `sre-fundamentals` | Why this comes before breaking things |
| `start-here` | What you are going to build |
| `nexus-and-artifacts` (alternative) | Why this chapter exists |
| `hands-on-labs` (reference) | Why labs, and why these ones |
| `troubleshooting` (reference) | How to use this chapter |

**42 opened with a generic label** — 30 of them literally `## Introduction` or
`## Introduction to <Tool>`. Of those 42, **28 were core capstone-path
chapters**, including `terraform`, `kubernetes`, `k8s-workloads`,
`k8s-services-networking`, `k8s-config-storage`, `k8s-security`, `ansible`,
`helm`, `argocd`, `prometheus`, `grafana`, `observability`, `vpc`, `iam`, `ec2`,
`s3`, `ecr`.

A learner arriving at "## Introduction to Terraform" had been told the tool's
name and nothing about why they were standing there. A learner arriving at "Why
this comes after Docker" had been handed the thread of the platform. Same
curriculum, same week, different product.

All 27 have since been written, in curriculum order, each grounded in the
chapter immediately before it rather than in whichever chapter the prose happened
to reference — several pointed two phases back.

## Structural coverage

Baseline when this audit was written, and after Phase 2:

| Teaching element | All 57 (was → now) | Core 40 (was → now) |
| --- | --- | --- |
| Opens with a why-now bridge | 15 → 42 | 12 → **39** |
| Says in prose where it appears in the capstone | 5 → 31 | 4 → **30** |
| Failure modes / troubleshooting section | 11 → 33 | 10 → **32** |
| Links a lab / has a practise section | 9 → 33 | 8 → **32** |
| Uses the `Level 1–4` ladder | 52 | 38 |
| Has an Interview Questions section | 39 | 26 |

All four content rows are done — Phases 2, 3, 4 and the Chapter → Lab loop. Troubleshooting was the
starkest imbalance in the original audit — 26 core chapters carried interview
questions and 10 carried a failure section — and it is now 32 of the 33 core
**technology** chapters. The exception is `aws-overview`, a conceptual survey
whose failures belong to the VPC, IAM, EC2 and S3 chapters it introduces; the
seven orientation and summary chapters are not technologies and were not forced
to have one.

**One deliberate exemption.** `conclusion` keeps "The End of the Journey" rather
than a why-now bridge. It is the final chapter; the pattern stops helping there,
and teaching the detector to accept it would be gaming the detector.

---

## Concrete defects found

### 1. The capstone connection existed as data and was never shown — FIXED

All 40 core chapters declare `capstoneRole`, `capstonePhase`, `capstoneComponent`
and `capstonePurpose` in frontmatter. `apps/web/lib/labs.ts` and
`components/labs/architecture-state.tsx` consume `capstonePhase` /
`capstoneComponent` to drive the labs architecture view.

But `apps/web/app/[locale]/learn/[domain]/[slug]/page.tsx` renders only
`capstoneRole` (line 231). `capstonePurpose` — the sentence saying exactly what
this chapter contributes to the platform — is **never rendered anywhere**, and
is not even present on the `ChapterMeta` type in `apps/web/lib/content.ts`.

So the single most important connection in the product's promise is authored,
maintained, and invisible. Only 4 of 40 core chapters happen to also say it in
prose.

This was the cheapest high-value fix available and is now done:
`capstonePurpose` is on `ChapterMeta`, passed through the chapter page, and
rendered by `CapstoneRole` beneath the existing badge — on `core` chapters only,
since a line claiming a role in the platform would contradict an `alternative`
badge directly above it.

Verified in built output rather than assumed: all **40** English core chapter
pages in `.next-verify` now carry the sentence. The Docker chapter renders
"In the capstone: packages each service as the image the pipeline scans and
pushes to ECR, and the cluster runs."

The prose recommendation still stands for the 36 core chapters that never say it
in their own text — the badge states the connection, the chapter should still
close the loop.

### 2. `content/index.json` was stale — FIXED, and worse than first reported

The duration drift was the least of it. **Thirty of the 47 records carried a
stale `order`** — Terraform 13 in the catalogue against 21 in the chapter,
Kubernetes 19 against 23, Jenkins 23 against 34, everything from kubeadm onward
off by eight to eleven places. The file was a snapshot from before the
Kubernetes chapter was split, and every chapter after the insertion point kept
its old position. Two titles were stale as well.

The chapter MDX is now canonical and the catalogue is generated from it by
`scripts/build-content-index.mjs`, with `--check` wired into `verify` ahead of
`content:lint`. The invariant is total: one record per file, one file per
record, every compared field equal.

The domain allow-list had to move at the same time. It was derived from
`content/index.json`, so the linter validated chapters against a list assembled
out of chapters — and once the index became generated, that check would have
gone completely vacuous. Measured, not assumed: with a regenerated catalogue the
old allow-list accepts a chapter whose domain is typed `dokcer`. It now reads
`content/domains.json`, the registry backing the topic pages, and the typo is
rejected.

**A third defect surfaced while printing the sequence:** two `order` values were
claimed twice — 42 by `logging` and `supply-chain-security`, 44 by
`network-policies` and `sre-fundamentals`, in both cases a new phase's first
chapter colliding with the previous phase's last. `content.ts:113` sorts by
`order` with no tiebreak, so the sequence of each colliding pair was left to
readdir. Everything from the security phase onward shifted up by one, giving a
contiguous 0–56, and the gate now rejects a repeat.

### 2b. Why the reported symptom was not the defect

The state before the fix: 47 entries against 57 chapter files. Ten chapters with
`status: complete` are absent: `ec2`, `s3`, `gateway-api`,
`k8s-cluster-administration`, `k8s-config-storage`, `k8s-services-networking`,
`k8s-workloads`, `k8s-security`, `supply-chain-security`, `sre-fundamentals`.
Two durations have drifted from their frontmatter — `docker` (50 vs 75) and
`linux-foundations` (45 vs 75).

**This is not learner-visible.** `apps/web/lib/content.ts` reads chapter
frontmatter from disk (`readdirSync` + `matter`), and both the Learn index and
the chapter page render the same `chapter.readingTime`, so the site is
self-consistent and shows 75 for Docker in both places. The only consumer of
`content/index.json` in source is `scripts/lint-content.mjs`, which uses it to
build the domain allow-list.

So the reported "index says 75, chapter says 50" symptom is real drift in the
file but does not reach a reader. The defect is that a stale artifact is feeding
the content linter, and ten complete chapters are missing from it. Either
regenerate it from frontmatter or delete it and have the linter read the
frontmatter it already trusts.

### 3. Terraform taught the workflow before the problem — FIXED (pilot)

`content/learn/terraform/terraform.en.mdx` is 451 lines. It contains the right
section — `### What Existed Before? (Bash Scripts)` — at **line 328, 73% of the
way down**, inside "Level 2 — Intermediate", after providers, plan/apply,
variables and modules.

A presence-only check passes this chapter. A beginner meets the entire Terraform
workflow before being told which problem it solves. Compare `docker`, which puts
the same element at line 31 of 733.

This is why the audit script scores position, not just presence.

**Fixed as the pilot for the standard.** The author's own text was moved, not
rewritten, and now opens the chapter at ~11% depth. The generic introduction was
replaced by a bridge built from the learner's own work — the VPC, IAM role, EC2
instance, bucket, load balancer, auto scaling group and registry they just built
by hand — asking which of them changed last Tuesday, whether an identical
staging copy could be built this afternoon, and how long a rebuild would take.
A "When it breaks" section covers the four failures that actually hurt, and
"Practise this" links the five Terraform labs in build order. Terraform is the
first chapter clean on all six structural elements.

**One constraint discovered doing it:** `terraform.ar.mdx` is the curriculum's
only translation, and `check-translation.mjs` enforces matching heading levels,
links and code blocks between the pair. The Arabic chapter therefore carries the
same restructure. The other 27 core chapters needing a bridge have no
translation, so this cost does not repeat.

---

## Provisional classification

Using the A–G scheme. **Only the three read in full carry a confident letter**;
the rest are grouped by structural signal and must be read before being fixed.

| Class | Meaning | Read | Provisional |
| --- | --- | --- | --- |
| A | Beginner-ready and capstone-ready | `docker` | — |
| B | Technically correct, not beginner-friendly enough | `terraform`, `k8s-workloads` | the 28 core chapters opening with a generic `Introduction` |
| C | Beginner-friendly, missing capstone integration | — | the 36 core chapters with no prose capstone connection |
| D | Capstone-connected, missing critical depth | — | the 30 core chapters with no troubleshooting section |
| E | Technically incorrect / outdated | — | none identified yet; needs reading, not scripting |
| F | Duplicates another chapter | — | not yet assessed |
| G | Correctly alternative/extension/reference | — | the 17 non-core chapters, roles already declared |

Notes on the three read:

- **`docker` (A).** 733 lines. Opens with "Why Docker sits exactly here", states
  the problem before the vocabulary, separates the four words, uses a level
  ladder without losing orientation, and ends with "Where Docker appears in the
  capstone" and "What Kubernetes adds" — a genuine bridge to the next phase. It
  is the model the rest should be measured against.
- **`terraform` (B).** Strong material, wrong order — see defect 3. It also ends
  on Interview Questions with no troubleshooting section, despite state locks,
  drift and failed applies being the things that actually hurt.
- **`k8s-workloads` (B/D).** Has "Common failures" and "Practise this", which
  puts it ahead of most. Opens at "## Introduction" with no bridge from the
  previous phase, and never says where workloads appear in the capstone.

---

## Labs baseline

For continuity with the scenario work: 114 lab files, 45 with an online terminal,
backed by 45 Killercoda scenarios.

- All 45 terminal-enabled labs are `guided` or `incident`.
- All 56 `challenge` labs have no online environment. That is categorical and
  deliberate — a challenge is the self-directed version of a guided lab, and
  launching the guided walkthrough would hand over the answers.
- 13 `guided` labs have no environment. Feasibility for those is tracked in the
  scenario notes; the blocker is nearly always a managed AWS service that
  LocalStack community answers without honouring.

---

## Work order

Following the standard's priority rule — core path first, no polishing reference
material while a core chapter has a beginner blocker.

1. ~~**Render `capstonePurpose` on the chapter page.**~~ Done — see defect 1.
2. ~~**Add a why-now bridge to the core chapters that open generically.**~~ Done
   — 39 of 40, with `conclusion` exempt.
3. ~~**Fix `terraform`'s ordering**~~ Done — see defect 3. Pilot the rest of the
   standard on `networking-fundamentals` and `k8s-workloads` next.
4. ~~**Add troubleshooting to the core chapters without it.**~~ Done — 32/33
   core technology chapters, each as symptom → evidence → hypothesis → test → fix.
5. ~~**Resolve `content/index.json`**~~ Done — see defect 2.
6. ~~**Close the Chapter → Lab loop.**~~ Done — 87 lab links, 32/33 core
   technology chapters. Two curated bullets named labs that were never built
   (an AWS Auto Scaling lab and a kubeadm provisioning lab); both are recorded
   as gaps rather than linked to something else.
7. **Then** re-read for classes E and F, which scripting cannot find — the
   remaining work that no script can do.

Re-run `node scripts/audit-chapter-teaching.mjs` after each batch, remembering
what it can and cannot tell you.
