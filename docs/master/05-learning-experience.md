---

## Part 6 — Learning Experience

This is the product. Everything else exists to serve it.

### 6.0 The core promise and the content hierarchy

> **Every roadmap ends with a deployable production project.**

That single sentence is the strongest thing EgyKode can promise, and it is
worth more than fifty social features. It is also *checkable*, which is what
separates it from marketing copy: either the learner has a running system at
the end or they do not.

For the promise to be structural rather than aspirational, the content model
must have a project at the top of it. A flat list of chapters cannot make that
guarantee; this hierarchy can:

```
ROADMAP  (e.g. Cloud DevOps Engineer)
  │
  ├── PHASE        01 Linux → 02 Networking → 03 Git → 04 Docker →
  │                05 Kubernetes → 06 AWS → 07 Terraform → 08 Ansible →
  │                09 CI/CD → 10 GitOps
  │     │
  │     ├── MODULE
  │     │     ├── LESSON      the chapter — explanation (§6.2)
  │     │     ├── LAB         guided, validated, real (§6.4)
  │     │     ├── CHALLENGE   unguided; a goal and a success condition
  │     │     └── PROJECT     a component of the final system
  │     │
  │     └── ASSESSMENT        gate: quiz + lab evidence (§6.13)
  │
  └── PRODUCTION PROJECT      the whole system, deployed and observable
```

**Lesson → Lab → Challenge** is the ladder that actually produces competence.
A lesson explains, a lab walks you through, a challenge removes the walkthrough
and keeps the goal. Most platforms ship the first two and stop; the third is
where the learning happens, and it costs almost nothing to author because it is
the lab with its instructions deleted and its success condition kept.

Each phase's PROJECT is a **slice of the same final system**, so the learner is
not building ten disposable exercises — they are building one platform,
incrementally. By Phase 10 they have exactly the architecture documented in
`platform/`: a CI pipeline, a registry, a cluster, GitOps reconciliation and
monitoring, running under their own account.

**The user journey this creates:**

```
LEARN → UNDERSTAND → PRACTICE → BUILD → DEPLOY → OPERATE → SHOWCASE → GET HIRED
```

The last two links matter commercially: SHOWCASE is the public profile (§7.5),
and GET HIRED is the skill-matched jobs board (§7.7). That is the loop that
makes the jobs board serve the learning product instead of competing with it.

**Mapping to the existing corpus:** the 47 handbook chapters populate the
LESSON layer; the 20 NTI lab READMEs populate LAB; CHALLENGE and PROJECT are
the genuinely new authoring work, and they are small — a challenge is a
paragraph and a checker, a project is an assembly of work already documented in
`platform/`.

### 6.1 The source material — what already exists

EgyKode does not start from an empty content directory. Inventory of what is
already written and MUST be ingested in Phase 0:

| Source | Contents | Becomes |
|---|---|---|
| `Cloud-Native-DevOps-Handbook/` | **47 chapters, ~71,000 words** — Linux, networking, Git, Docker, AWS, VPC, IAM, Terraform, Ansible, RDS, LB, ASG, Secrets Manager, Kubernetes, kubeadm, Helm, Kustomize, Jenkins, GitHub Actions, ECR, Nexus, GitOps, ArgoCD, monitoring, Prometheus, Grafana, logging, security, NetworkPolicy, service mesh, serverless, chaos, cost, platform engineering, DR, labs, troubleshooting, glossary, interview prep | `/learn/**` — the entire chapter corpus |
| `Cloud-Native-DevOps-Platform/` | 12 Terraform modules × 3 envs, 13 Ansible roles, kubeadm cluster, ArgoCD app-of-apps, Jenkins pipeline, monitoring stack, **5 ADRs** | `/build/platform`, `/build/architecture`, `/build/decisions` — the reference architecture, with **live code embeds from the real files** |
| `CloudDevOpsProject/` + `Ivolve Final Project/` | Docker → Terraform → Ansible → K8s → Jenkins → ArgoCD → Monitoring, staged | `/learn/paths/*` — the ordered curriculum spine |
| `NTI/NTI Final Project/` | **20 lab READMEs** across 8 modules, EKS/Helm/Jenkins/observability | `/build/labs/**` — the initial lab catalogue |
| `jenkins-shared-library/` | 12 Groovy steps: `buildApp`, `sonarQubeScan`, `trivyScan`, `ecrPush`, `updateGitOpsRepo`, `deployOnK8s`… | `/build/platform/cicd` + the CI/CD simulator's real stage definitions |
| `diagrams/architecture.png` | The full annotated platform diagram | Redrawn as **interactive inline SVG** for `/build/architecture` |
| `portfolio.md` | Honest gap analysis, interview Q&A, ADR rationale | `/prepare/interview` seed + `/build/decisions` narrative |

**This is the single most important instruction in the document:** the agent's
first job is a migration, not an authoring exercise. Rewriting this corpus from
scratch would produce something worse, slower, and less credible.

Migration rules:
- Preserve the author's voice and technical claims. Restructure, do not rewrite.
- Every chapter is mapped to the §6.2 template; missing sections are marked
  `status: partial` in frontmatter and surfaced as contribution opportunities —
  **not** filled with generated filler.
- Commands and code are extracted from the real repositories at build time
  (§11.4), never retyped, so they cannot drift.

### 6.2 Chapter anatomy

Every `concept` and `howto` page follows one structure. Sections are optional
individually but the **order is fixed**, so a reader who learns the shape of
one chapter can navigate all of them.

```mdx
---
contentId: k8s-architecture          # stable join key across locales
title: Kubernetes Architecture
titleAr: بنية Kubernetes
domain: kubernetes
level: intermediate
type: concept
readingTime: 18                       # computed, not authored
prerequisites: [containers-basics, linux-processes]
objectives:
  - Describe what each control plane component does
  - Trace a `kubectl apply` from client to running container
relatedChapters: [k8s-kubeadm, k8s-networking]
labs: [lab-first-cluster]
interviewQuestions: [k8s-q-control-plane, k8s-q-etcd]
platformRefs:                         # links into the real reference repo
  - infrastructure/ansible/roles/control-plane
  - infrastructure/terraform/modules/compute
status: complete                      # complete | partial | draft
translationStatus: reviewed           # reviewed | machine-draft | missing
updated: 2026-08-08
authors: [waleed]
---
```

**Body order:**

1. **In one paragraph** — what this is, for someone in a hurry.
2. **Why it exists / what problem it solves** — the historical or operational
   pressure that produced it. Never start with a definition.
3. **How it works internally** — the mechanism, with a diagram.
4. **Terminology** — terms defined once, linked to the glossary, with the
   Arabic gloss.
5. **How we implemented it** — the real code from the reference platform, with
   a file path that links to GitHub.
6. **Commands you will actually run** — copyable, with expected output.
7. **Alternatives and trade-offs** — a table. Costs stated before benefits.
8. **Production considerations** — what changes at scale, what breaks at 3am.
9. **Security implications** — always present, never "N/A".
10. **Cost implications** — in real currency where possible.
11. **Common mistakes** — sourced from actual failures, not invented.
12. **Troubleshooting** — links into `/prepare/troubleshoot`.
13. **Hands-on lab** — an embedded `<Lab>` card.
14. **Check yourself** — a `<Quiz>` of 3–5 questions.
15. **Interview questions** — 3–5, linked to the hub.
16. **References** — upstream docs, with retrieval dates.
17. **What's next** — 2–3 explicit next chapters.

**Chapter chrome:** level badge · domain colour bar · reading time · progress
checkbox (signed in) · bookmark · "improve this page" → GitHub edit link ·
language switch showing translation status · sticky table of contents ·
prev/next · last-updated with a git link · contributor avatars.

### 6.3 Interactive roadmaps

roadmap.sh proved the format. EgyKode's differentiator is that **every node
resolves to depth we actually have** — a chapter, a lab, and a real
implementation in the reference platform — rather than a link list.

**Implementation:** React Flow, rendered as a **static SVG at build time** and
hydrated only on interaction. A 200-node canvas that ships as client JS on
first paint destroys the performance budget.

**Roadmaps to ship:**
1. **DevOps Engineer** (the flagship, ~120 nodes)
2. **Cloud Engineer — AWS**
3. **Kubernetes Specialist**
4. **Platform Engineer**
5. **SRE**
6. **DevSecOps**

**Node states:** `locked` (prerequisites unmet — visible but dimmed, never
hidden) · `available` · `in-progress` · `complete` · `mastered` (quiz passed +
lab completed).

**Node detail panel** (slides in, never navigates away): summary · why it
matters · estimated time · linked chapter · linked lab · linked interview
questions · where it appears in the reference platform · mark-complete.

**Rules:**
- Locked nodes MUST be readable. Gating content behind progress on a free
  learning platform is hostile; the lock communicates *sequence*, not
  permission.
- The whole canvas MUST be usable by keyboard: arrow keys traverse edges, Enter
  opens, Escape closes.
- A **linear list view** is mandatory as an accessible equivalent and as the
  mobile default — a 120-node graph on a 375px screen is not navigable.
- Progress persists server-side for signed-in users, `localStorage` otherwise,
  and merges on sign-in.
- Export: "download my roadmap progress" as JSON/PNG for portfolios.

### 6.4 Hands-on labs — three tiers

Fake terminals are worthless. Real environments are the differentiator, and
they are obtainable at zero cost if the tiers are chosen carefully.

**Tier 1 — Guided validated labs (free, ships first)**
The learner runs commands on **their own machine or AWS free tier** and pastes
output back; the platform validates it against expected patterns.

- Steps with copy buttons, expected output, and a checker (regex/JSONPath over
  pasted output, or a hash of a produced artifact).
- Works for Terraform, Ansible, Docker, kubectl — everything.
- Cost: **$0**. Fidelity: **real**, because they really did it.
- This is the workhorse. Roughly 80% of labs are Tier 1.

**Tier 2 — Embedded real environments (free, ships second)**
- **Killercoda** — free for content authors, gives a genuine multi-node
  Kubernetes cluster in the browser. Scenario definitions live in the EgyKode
  repo as YAML and are embedded via iframe. This is the single highest-value
  integration in the document.
- **Play with Docker / Play with Kubernetes** for container labs.
- **WebContainers (StackBlitz)** — free for open-source — for Node/Python
  tooling labs that do not need a kernel.
- Cost: **$0**, at the price of an external dependency, which MUST be declared
  in the lab card and MUST degrade to Tier 1 if the provider is unavailable.

**Tier 3 — Platform-hosted sandboxes (deferred, costs money)**
Ephemeral EC2/k3s per learner. **Explicitly out of scope until there is
revenue.** Documented here only so nobody builds it by accident.

**Lab anatomy:** objective · time · difficulty · prerequisites · what you will
build (diagram) · cost warning if AWS resources are created · steps · checkpoints
· **cleanup (mandatory, and verified)** · troubleshooting · challenge extension ·
solution (collapsed) · "submit your result" → optional public artifact on the
profile.

**The cleanup rule is non-negotiable.** Any lab that provisions cloud resources
MUST end with a verified teardown step and a prominent estimated-cost banner at
the top. A learning platform that leaves a beginner with an AWS bill has failed
them.

### 6.5 The `<Terminal>` component

Used for demonstration, not simulation, and honest about which it is.

- **Playback mode** — a recorded sequence types out, with realistic timing and
  a scrub bar. Sourced from `asciinema` casts recorded from real runs.
- **Copy mode** — static block, per-line copy, and a "copy all" that strips
  prompts and comments.
- Never invents output. Every terminal cast MUST come from a real execution,
  recorded and committed.
- Always `dir="ltr"`, even on Arabic pages (§4.3).
- Fully keyboard accessible with a text alternative for screen readers.

### 6.6 Architecture explorer

The `architecture.png` diagram, redrawn as **interactive inline SVG**.

Every component is a focusable, clickable region. Selecting one opens a panel:
what it is · why it is in this architecture · the exact Terraform module or
Ansible role that creates it (with the real file contents) · the commands to
inspect it · what fails if it fails · the security posture · the cost · links
to the chapter, the lab and the interview questions.

- Layers toggle independently: network · compute · Kubernetes · CI/CD · GitOps ·
  observability · security · data.
- Traffic-flow overlays animate a request path: user → Route 53 → ALB →
  Ingress → Service → Pod → RDS.
- Deep-linkable: `/build/architecture?focus=rds&layer=data`.
- Mobile: falls back to a grouped list with the same panels.
- Built as SVG with `<title>`/`<desc>` per region, not canvas — so it is
  accessible, searchable and printable.

### 6.7 AWS explorer

Same interaction model, scoped to AWS services as used in the reference
platform: VPC, subnets, route tables, IGW, NAT, security groups, NACLs, EC2,
ASG, ALB/NLB, ECR, RDS, S3, IAM, Secrets Manager, CloudWatch, Backup, KMS,
Route 53.

Each service: what it is · **what it costs, with the free-tier boundary stated
explicitly** · the Terraform that creates it · the CLI to inspect it · the
common misconfiguration · the security default that is wrong out of the box.

The cost column is the differentiator. Every AWS tutorial omits it; every
learner gets burned by it.

### 6.8 Simulators

**CI/CD pipeline simulator.** Stages driven by the **real** `Jenkinsfile` and
the real shared-library steps, not invented ones: Checkout → Build & Unit Test
(Maven) → Static Analysis (SonarQube ∥ Trivy FS) → **Quality Gate** → Build
Image → **Trivy Image Scan** → Push to ECR → Update GitOps Overlay (kustomize) →
Commit & Push → *hand-off*.

- Each stage shows: what runs, the real log excerpt, the duration, and what it
  would block on.
- **Failure injection** is the point: "fail the quality gate", "inject a CVE",
  "break the unit test" — and watch where the pipeline stops and why. A simulator
  that only shows the happy path teaches nothing.
- Controls: play / pause / step / restart / speed. Step mode satisfies
  `prefers-reduced-motion`.

**GitOps simulator.** Developer commit → GitHub → ArgoCD detects drift →
sync → rolling update → healthy. With the two scenarios that matter:
**manual `kubectl edit` gets reverted by selfHeal**, and **a bad image stalls
the rollout with `maxUnavailable: 0` while the old version keeps serving.**
Those two demonstrations are the entire argument for GitOps, made visible.

### 6.9 Decision catalogue (ADRs)

The five existing ADRs — kubeadm over managed Kubernetes, GitOps over push
deploys, Calico CNI, monorepo for manifests, no CPU limits — become a
first-class browsable surface at `/build/decisions`.

Each renders as: context · the decision · alternatives considered · **what this
choice costs** · consequences · status · related chapters · a comment thread.

This surface is the strongest signal of engineering seniority on the entire
platform, and it is the one nobody else builds. It MUST be prominent, not
buried in docs.

### 6.10 Interview hub

Questions levelled `junior | mid | senior | staff | platform`, tagged by
domain, and typed: `conceptual` · `scenario` · `system-design` ·
`troubleshooting` · `behavioural-technical`.

Each entry: the question · a **short answer** (what to say in 30 seconds) · a
**full answer** (what to say if pressed) · **follow-ups the interviewer will
ask next** · what a weak answer sounds like · links to the chapter.

`portfolio.md` already contains a model of this done well — "Why not EKS?",
"Why the extra hop through git?", "Walk me through a failed deploy" — including
honest answers about weaknesses. That voice is the standard.

**Practice mode:** a timed session that draws N questions at a level, reveals
answers on demand, and records self-assessed confidence, feeding the spaced
repetition scheduler (§6.13).

### 6.11 Troubleshooting hub

**Symptom-first, not tool-first.** People arrive with an error string, not a
category.

Entry structure: the symptom (verbatim, as it appears in a terminal) · what it
means · the diagnostic commands, in order · the decision tree of causes · the
fix per cause · how to prevent it · related chapters.

Seed set from `42_Troubleshooting.md` plus the classics: `CrashLoopBackOff`,
`ImagePullBackOff`, `Pending` pods, `OOMKilled`, `terraform state lock`,
`Error: cycle`, ArgoCD `OutOfSync`/`Degraded`, `x509: certificate signed by
unknown authority`, `kubectl` connection refused, NodePort unreachable, Ansible
`UNREACHABLE`, Jenkins agent offline, ECR `denied`.

Search MUST match on pasted error text — that is the primary entry point, and
it means indexing the verbatim symptom strings heavily.

### 6.12 Reference & cheat sheets

A command reference: `kubectl`, `docker`, `terraform`, `ansible`, `helm`,
`git`, `aws`, `systemctl`, `journalctl`, `ip`, `ss`, `openssl`.

Each command: syntax · the flags that matter · a real example with output · the
dangerous variant flagged · the related chapter. Reachable from the command
palette via `/` (§5.6). Printable one-page cheat sheets per tool, in both
languages.

### 6.13 Quizzes, mastery and spaced repetition

- **Quiz** types: multiple choice, multiple select, true/false, fill-the-command,
  order-the-steps, identify-the-bug-in-this-YAML.
- Every wrong answer MUST explain **why** it is wrong, not merely mark it.
- **Mastery** of a node = chapter read + quiz ≥ 80% + lab completed.
- **Spaced repetition:** a lightweight SM-2 scheduler over quiz items. Items
  resurface on the dashboard as "due for review". This is the single highest-
  leverage retention feature in the product and it is cheap to build.
- No leaderboard on quiz scores. Leaderboards on assessment produce cheating
  and anxiety; leaderboards on contribution produce contribution (§7.6).

### 6.14 Courses

Structured video paths, layered over the same chapters.

- **Video is embedded, never hosted.** Unlisted YouTube is the launch answer:
  free, unlimited, global CDN, adaptive bitrate, automatic captions that can be
  corrected. Self-hosted video is the fastest way to a bill.
- Embeds use a **facade** (`lite-youtube`): a thumbnail plus a play button that
  loads the iframe on click. A raw YouTube iframe costs ~700KB and ~1.5s of LCP.
- Course = ordered lessons; each lesson = video + the chapter + a lab + a quiz.
- Progress, resume position, and completion certificates (§7.6).
- Community-contributed courses are permitted from Phase C, moderated.

### 6.15 Certificates

Issued on course/path completion. **Honest by design:**

- States exactly what was completed and when, with a verification URL.
- Says plainly that it is a record of completion, not an industry
  certification. Overclaiming here would poison the platform's credibility.
- Verifiable at `/verify/[id]`; shareable to LinkedIn; rendered as a
  theme-aware SVG → PNG.
- Bilingual, with the holder's name in the script they enter it in.
