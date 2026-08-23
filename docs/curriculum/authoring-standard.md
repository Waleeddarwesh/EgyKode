# EgyKode chapter authoring standard

The promise on the front page is the whole specification:

> Learn Cloud & DevOps by building one real production platform. Not a pile of
> disconnected tutorials.

A chapter satisfies it when a beginner finishes able to say **why they just
learned that, what it changed, and where it appears in the platform they are
building**. Everything below serves that sentence.

This document is the canonical standard. Where it disagrees with an older doc,
this one wins. It exists because the curriculum currently teaches in two
different styles, and the difference is measurable — see
[beginner-readiness-audit.md](./beginner-readiness-audit.md) for the baseline.

---

## 1. The teaching arc

Every core chapter moves through this arc. Not every chapter needs every stage
at equal depth, and the headings do not have to be these words — but a beginner
must be able to follow the sequence.

```text
WHY THIS NOW?          <- bridge from the previous phase, by name
WHAT PROBLEM EXISTS?   <- what goes wrong without the technology
WHAT IS THE CONCEPT?   <- plain language, terms defined before use
MENTAL MODEL           <- one small diagram, before the vocabulary
SMALLEST EXAMPLE       <- the least code that demonstrates the idea
BUILD IT STEP BY STEP  <- one piece at a time, each explained as it lands
HOW IT WORKS UNDERNEATH<- internals, only after the learner has used it
USE IT IN THE CAPSTONE <- the actual platform, named
BREAK IT               <- the realistic failure
TROUBLESHOOT IT        <- symptom -> evidence -> hypothesis -> test -> fix
SECURE IT              <- what a beginner would get wrong
TRADE-OFFS             <- what we chose, what we did not, when that flips
PRACTISE IT            <- the lab
VERIFY IT              <- how the learner knows they succeeded
WHY THE NEXT PHASE?    <- the new problem now visible
```

The two stages most often missing today are the first and the third-from-last:
orientation and capstone connection. They are also the cheapest to add and the
ones that turn a tutorial into an apprenticeship.

---

## 2. Zero-assumption rule

Assume basic computer literacy and nothing else. No Linux, networking, Git,
Docker, AWS, Terraform, Kubernetes, CI/CD, GitOps, observability or SRE
knowledge, and no knowledge borrowed from other sites, vendor docs, or the
author's own experience.

When a chapter needs a concept from earlier, either link the chapter that taught
it or teach the minimum inline. When it needs a concept nothing has taught yet,
that is a curriculum gap — record it, do not paper over it with a definition in
parentheses.

**Beginner-friendly never means outdated or simplified into falsehood.** The two
are unrelated, and confusing them is how a chapter ends up teaching something
that was correct in 2019.

---

## 3. Build it up, don't dump it

The strongest pattern in the reference document
(`CloudDevOpsProject-FromZero/Step2-Containerization.md`) is this: never open
with a seventy-line file and explain it afterwards. Start with one line, add the
next piece, say what it does and why it is there.

```text
services:                  -> what is a service?
  db:                      -> why does the database exist, and why is it here?
    image: mysql:8         -> what is an image? why a tag?
    environment: ...       -> why does the image need these?
    volumes: ...           -> what happens to data without this?
    healthcheck: ...       -> what breaks without it?
```

Apply the same shape everywhere:

| Technology | Incremental order |
| --- | --- |
| Terraform | provider → resource → variable → output → plan → state → module |
| Kubernetes | namespace → Deployment → Service → ConfigMap → Secret → PVC |
| Helm | chart → values → template → install → upgrade → rollback |
| Ansible | inventory → module → task → handler → role → idempotency |
| Jenkins | job → pipeline → stage → artifact → gate → publish |
| Argo CD | Application → repo → path → desired state → sync → health → drift |

Explain fields that carry meaning. Do not annotate every colon. A field earns an
explanation when a beginner would not guess what it controls, or when getting it
wrong breaks something.

---

## 4. Corrections the reference document needs

The reference teaches the right *method* with some outdated *content*. Adopt the
method; do not copy these. Each was verified against the file itself.

| In the reference | Why it is wrong now | Teach instead |
| --- | --- | --- |
| `version: '3.8'` at the top | The Compose Specification made the top-level `version` obsolete and informational; Compose applies the current schema regardless | Start the file at `services:` and say the version line is a leftover from the 2.x/3.x era |
| `docker-compose up -d --build` | That is Compose v1, a separate Python binary | `docker compose up -d --build` — a subcommand of Docker |
| `container_name: mysql-db` on every service | Pins the service to exactly one container, so it can never be scaled, for a cosmetic gain | Omit it. Teach that the **service name** (`db`) is the DNS name other services use |
| "volumes … creates a permanent folder on your host machine" | A named volume is Docker-managed storage whose location depends on the driver and platform | "A named volume stores data outside the container's writable layer, so removing and recreating the container does not remove the data" |
| `ports: ["3306:3306"]` on the database | Publishes the database to the host for no reason the example needs | Publish nothing. Let `auth-service` reach it as `DB_HOST: db`, then explain `ports` is only for reaching in from outside the Compose network — which is the same lesson as a Kubernetes `Service` vs `Ingress` later |
| `depends_on: [auth-service, roadmap-service]` described as "won't start until both backends are up and running" | The short form controls **start order only**, not readiness | Either use the long form with `condition: service_healthy`, or say plainly that this orders startup and does not wait for readiness |

The last one matters most, because the same document already teaches the correct
long form for `db` — so it contradicts itself two sections apart. That is the
failure mode this standard exists to prevent.

---

## 4b. Time, convergence, and the condition that makes a claim true

**Distributed and cloud systems are asynchronous, eventually consistent and
failure-prone unless a specific guarantee says otherwise.** Write as though that
is the default, because it is.

This is the single most productive correctness rule found so far. A review that
looked only for the word *instantly* found nine chapters describing things that
take measurable time as if they were immediate — and two of them were outright
wrong in ways a beginner could carry into production: that disabling an identity
provider ends existing AWS access, and that an RDS failover is instant and
lossless.

### Never state an outcome without the condition that makes it true

| Instead of | Write |
| --- | --- |
| "Kubernetes restarts the container." | "The kubelet restarts the container according to the Pod's restart policy when it terminates." |
| "The load balancer removes the instance." | "The load balancer stops routing to a target once it is considered unhealthy, after the configured number of consecutive failed checks." |
| "Argo CD fixes drift." | "Argo CD detects divergence from the desired Git state and reconciles it according to the Application's sync policy." |
| "A request is a guaranteed reservation." | "A request is what the scheduler uses to place the Pod; a container may exceed it when the node has capacity." |
| "Disabling the IdP removes access." | "Disabling the IdP stops new sessions; credentials already issued remain valid until they expire." |

The rewrite is usually one clause longer and teaches the mechanism instead of a
slogan. That is the trade worth making.

### The words to distrust in your own drafts

`instantly`, `immediately`, `always`, `never`, `guaranteed`, `automatically`,
`real-time`, `zero downtime`, `zero data loss`, `exactly`, `no manual
intervention`, `as soon as`, `the moment`.

None are banned — some are true. Each one is a prompt to ask what it depends on:
a polling or health-check interval, a retry policy, DNS TTL and client caching,
eventual consistency, propagation delay, a reconciliation loop, autoscaling or
startup delay, a cold start, connection reuse, credential lifetime, or an
asynchronous API.

### Classify every significant claim

For each technical claim, ask **"under what conditions is this true?"** and
place the answer:

- **Always true** — state it plainly
- **True with stated assumptions** — state the assumptions
- **Configuration dependent** — name the setting (`podManagementPolicy`,
  `restartPolicy`, `selfHeal`)
- **Environment dependent** — name what varies (a CNI that enforces
  NetworkPolicy; a cluster with more than one replica)
- **Version dependent** — say which versions, or write it version-agnostically
- **Provider dependent** — say which provider
- **Not reliably true** — do not write it

This is far more tractable than trying to prove every sentence, and it catches
the errors that greps cannot.

### Simplification is allowed; unlabelled simplification is not

Teaching simplifications are fine when the boundary is drawn:

> For this lab: a single NAT gateway keeps the architecture simple and the cost
> down.
>
> **In production:** that is a single-AZ dependency. A multi-AZ design needs a
> NAT gateway per zone, or a different egress strategy.

Better than pretending the simplified architecture is universally right, and
better than burying a beginner in enterprise architecture before they can run
the thing. The same applies to convenience commands: `kubectl create secret
--from-literal` is fine for a lab and leaves the value in shell history, and the
chapter should say both.

## 5. The four sides of every tool

For each core technology, cover four perspectives. Depth varies; presence should
not.

- **User** — how do I use it?
- **Operator** — how do I know it is working?
- **Failure** — how does it break, and how do I find that out?
- **Architect** — why this, why not the alternative, when does that flip?

Failure is the one most often skipped, and it is the one that separates someone
who has read about a tool from someone who can be trusted with it.

Teach troubleshooting as a workflow, never as a list of commands:

```text
SYMPTOM -> EVIDENCE -> HYPOTHESIS -> TEST -> ROOT CAUSE -> FIX -> VERIFY
```

Minimum realistic failures per area: Linux (failed service, full disk,
permission denied, resource hog, unreachable network); networking (DNS, routing,
blocked port, TLS, application); Docker (exits, build, pull, service-to-service,
volume permissions); Terraform (state lock, drift, failed apply, surprise
replacement); Ansible (unreachable, privilege, non-idempotent); Kubernetes
(Pending, CrashLoopBackOff, OOMKilled, ImagePullBackOff, DNS, empty endpoints,
PVC, scheduling, readiness); CI/CD (build, gate, scan, registry); GitOps
(OutOfSync, Synced-but-unhealthy, wrong path, wrong image, drift); observability
(missing metric, target down, alert silent, alert noisy); SRE (incident,
mitigation, recovery, postmortem).

---

## 6. Security and cost are threads, not chapters

Security belongs in the chapter where the decision is made — Linux permissions
and SSH, Git secrets and history, Docker non-root and image hygiene, AWS IAM and
network boundaries, Terraform state and sensitive outputs, Kubernetes RBAC and
NetworkPolicies, CI/CD credentials and gates, supply-chain scanning and
immutability. The Security phase deepens it; it does not introduce it.

Cost belongs wherever the learner can spend money. Say what is free, what is
variable, what becomes expensive unnoticed, and when to tear down. Never invent
precise figures — pricing moves by region, usage, date and plan. The learner
should finish the AWS phase able to answer "what does this architecture cost, and
why?"

**Never claim a control exists in the capstone if it does not.** Use the
established `core` / `alternative` / `extension` / `reference` classification.

---

## 7. Capstone connection

Every core chapter already declares `capstoneRole`, `capstonePhase`,
`capstoneComponent` and `capstonePurpose` in frontmatter — all 40 of them. Only
`capstoneRole` is rendered on the chapter page today, so the learner is not told
the rest. Until that is fixed, say it in prose as well, and answer:

- What did the learner just build?
- What does it enable?
- What uses it next?

Do not invent a mapping. The repository is the source of truth; if the chapter's
claim and the capstone disagree, the chapter is wrong.

---

## 8. Levels

`Level 1 → 4` is used by 52 of 57 chapters and is fine as a difficulty ladder.
What it must not do is replace orientation: a chapter that opens straight into
"Level 1 — Beginner" has told the learner nothing about why they are there.

Read the levels as:

- **Beginner** — understand the concept, perform the basic workflow
- **Practitioner** — build it realistically and troubleshoot it
- **Advanced** — internals, failure modes, trade-offs
- **Reference** — depth for when the learner actually needs it

Do not put internals before the learner has successfully used the thing.

---

## 9. Labs

Labs are practice, and their verification must be honest. That standard is
already enforced for the Killercoda scenarios and applies to lab content too:

- A verifier must **fail before the work, pass after, and reject a plausible
  wrong answer.**
- Evidence types (`command`, `state`, `reasoning`, `self-assessed`) must describe
  what actually happens. Never label a self-assessment as a command check.
- Never simulate an outcome to make a step pass. Where a managed service is
  unavailable, substituting a **real equivalent system** is sound; **faking the
  result** is not, and the substitution must be stated in the scenario.
- Do not add labs to reach a number.

---

## 10. Definition of done

A chapter is not done because it exists, is accurate, or is long. Line count is
not a quality metric: a focused 300-line chapter that teaches one concept
completely beats a 1,500-line chapter that assumes the reader knows what CIDR,
OCI, state and reconciliation mean.

It is done when a beginner can answer:

1. What is this, and why do I need it?
2. Why am I learning it now, and what problem existed before it?
3. How do I use it, and what do its important parts mean?
4. What happens when it breaks, and how do I find out?
5. What security and cost decisions does it carry?
6. What are the alternatives, and why did the capstone choose this?
7. Where does it appear in the platform, how do I practise it, and what comes
   next?

And the curriculum is done when a learner can tell this story using only
EgyKode: *I started with Linux, networking and Git because I needed the
foundations; I containerised the application because I needed something real to
deploy; I learned AWS manually so the infrastructure was not magic; I made it
reproducible with Terraform and consistent with Ansible; I moved it to
Kubernetes for orchestration and recovery; I packaged it with Helm; I automated
build, test and scan; I used GitOps so production changes came from desired
state; I added observability because deployed is not healthy; I secured the
lifecycle; I learned SRE because operating production needs reliability
decisions and incident response — and then I built the platform myself.*

---

## 11. Working rules

**Audit before rewriting.** Most chapters are technically strong. The work is
usually resequencing and adding orientation, not replacing prose. Classify each
chapter, fix what is classified, preserve what is good.

**Automated checks are gap detectors, never proof.**
`scripts/audit-chapter-teaching.mjs` finds missing and mis-ordered teaching
elements. It cannot tell whether an explanation is correct or followable. A
chapter it reports as clean has not been verified — only a person reading it can
do that. Never report a chapter as beginner-ready on the strength of a quiet
script, and never treat keyword presence as evidence a concept was taught.

**Priority order.** Core chapters on the capstone path first, then their
prerequisites, then Learn → Lab → Evidence continuity, then phase transitions,
then troubleshooting coverage, then security and cost, then trade-offs, then
reference material. Do not polish a reference chapter while a core chapter has a
beginner blocker.

**Never** invent facts or statistics, claim something is free when it is not,
teach obsolete syntax as current practice, hide a contradiction with the
capstone, present self-assessment as objective verification, or report success
because a command exited 0.
