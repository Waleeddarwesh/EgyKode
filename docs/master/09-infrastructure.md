---

## Part 10 — Infrastructure, Cost & DevOps

The goal: **a platform that can serve tens of thousands of readers for roughly
the price of the domain name**, on infrastructure that is itself worth teaching.

### 10.1 The free-tier traps, stated first

Most "AWS free tier" projects generate a bill because of four services that
people assume are free and are not. Designing around them is the whole game.

| Service | Real cost | Why people hit it | How EgyKode avoids it |
|---|---|---|---|
| **NAT Gateway** | **~$32/mo** + $0.045/GB | The default VPC pattern puts app servers in private subnets, which then need NAT for updates | **No private subnets in v1.** One instance in a public subnet with **no inbound ports at all** (§10.3) |
| **ALB / NLB** | **~$16–22/mo** | "You need a load balancer for HTTPS" | **Cloudflare terminates TLS.** No AWS load balancer until there is more than one instance |
| **EKS control plane** | **~$73/mo** | "Kubernetes needs EKS" | **k3s or plain Docker Compose on one box.** EKS is taught, not used |
| **Elastic IP (unattached)** | ~$3.60/mo | Left behind after teardown | No EIP at all — Cloudflare Tunnel means the origin needs no stable public IP |

Avoiding those four is worth **~$125/month**, which is the difference between
this project existing and not existing.

> ⚠️ **Verify your account's free-tier plan before building.** AWS changed the
> offer for accounts created from mid-2025: newer accounts receive a **credit-
> based plan with a ~6-month window** rather than the classic **12-month**
> always-750-hours tier. The architecture below works on either, but the
> *timeline* differs, and §10.7 assumes you have confirmed which one you have.
> Set a **zero-spend budget alert on day one**, before creating any resource.

### 10.2 Topology

```
                        ┌──────────────────────────────────┐
   Readers ───────────► │  Cloudflare  (free plan)         │
                        │  DNS · CDN · WAF · DDoS · TLS    │
                        │  Web Analytics · R2 · Pages      │
                        └───────┬──────────────┬───────────┘
                                │              │
                 static │       │              │ dynamic (proxied)
                        ▼       │              ▼
        ┌────────────────────┐  │   ┌──────────────────────────────┐
        │ Cloudflare Pages   │  │   │  cloudflared tunnel          │
        │ Next.js — content, │  │   │  (outbound only, no open     │
        │ landing, roadmaps, │  │   │   ports, no public IP)       │
        │ labs, search index │  │   └───────────────┬──────────────┘
        │ unlimited bandwidth│  │                   │
        └────────────────────┘  │                   ▼
                                │   ┌──────────────────────────────┐
                    ┌───────────┘   │  AWS · eu-central-1          │
                    ▼               │  EC2 t3.micro (free tier)    │
        ┌────────────────────┐      │  ┌────────────────────────┐  │
        │ Cloudflare R2      │◄─────┤  │ Docker Compose         │  │
        │ avatars, uploads,  │ back │  │  nginx                 │  │
        │ backups, casts     │  ups │  │  django (uvicorn/ASGI) │  │
        │ 10GB free,         │      │  │  celery worker + beat  │  │
        │ ZERO egress fees   │      │  │  postgres 16 +pgvector │  │
        └────────────────────┘      │  │  redis                 │  │
                                    │  └────────────────────────┘  │
        ┌────────────────────┐      │  Security group: 0 inbound   │
        │ Grafana Cloud free │◄─────┤  Metrics via remote_write    │
        │ Prometheus · Loki  │      └──────────────────────────────┘
        └────────────────────┘
```

**Why this shape:** static content — which is 90% of traffic — never reaches
AWS. The EC2 instance only serves API calls and WebSockets for signed-in users.
A t3.micro handles that comfortably into the low thousands of daily active
users.

### 10.3 Cloudflare Tunnel: no inbound ports

`cloudflared` runs on the instance and dials **out** to Cloudflare. The
security group therefore allows **zero inbound rules** — not even 443, not even
22.

Consequences:
- The origin cannot be port-scanned, brute-forced on SSH, or hit directly to
  bypass the WAF. This is materially more secure than the standard "open 443 to
  the world" pattern.
- SSH access goes through **Cloudflare Access + `cloudflared` short-lived
  certificates** (free tier: 50 users) or AWS SSM Session Manager — both free,
  both auditable, neither requiring an open port or a stored private key.
- No Elastic IP is needed, so instance replacement is trivial.

This is also excellent teaching material and belongs in the handbook as a
chapter: it is a genuinely better pattern than the one most tutorials show.

### 10.4 Service-by-service choices

| Need | Choice | Cost | Rationale |
|---|---|---|---|
| Domain | **egykode.com at Cloudflare** | **~$10/yr, at cost** | Cloudflare registrar sells at wholesale with no markup and free WHOIS privacy |
| DNS, CDN, WAF, DDoS, TLS | **Cloudflare free** | **$0** | Unmetered bandwidth; the single biggest cost avoidance after the load balancer |
| Frontend hosting | **Cloudflare Pages** | **$0** | Unlimited bandwidth and requests, 500 builds/mo. **Chosen over Vercel Hobby**, whose terms restrict commercial use — and a jobs board is arguably commercial. Do not build a platform on a plan you will have to leave |
| Backend compute | **EC2 t3.micro**, Docker Compose | **$0** while in free tier | Real Linux, real systemd, real Docker — the thing being taught |
| Database | **Postgres 16 + pgvector, in Docker on the instance** | **$0** | RDS free tier is an option and teaches RDS, but expires and cannot hold `pgvector` extensions as freely. Self-hosting forces real backup discipline, which is content |
| Cache / queue / channel layer | **Redis in Docker** | **$0** | One less external dependency |
| Object storage | **Cloudflare R2** | **$0** to 10GB | **Zero egress fees** — the decisive advantage over S3, whose egress is what actually bills you |
| Email | **Resend** | **$0** to 3k/mo | Simplest deliverability story. Move to SES when volume justifies the setup |
| Static search | **Orama** index, built at deploy | **$0** | Client-side, no server, and it has a real Arabic tokenizer/stemmer — which Pagefind lacks (§12.1) |
| Dynamic search | **Postgres FTS + `pg_trgm`** | **$0** | Already have the database |
| Observability | **Grafana Cloud free** + node_exporter/cAdvisor + `remote_write` | **$0** | 10k series and 50GB logs free forever — and it is the *same* Prometheus/Loki/Grafana stack the handbook teaches |
| Uptime | **UptimeRobot free** | **$0** | 50 monitors, public status page |
| Errors | **Sentry free** | **$0** | 5k events/mo, both frontend and Django |
| Product analytics | **Cloudflare Web Analytics** | **$0** | Cookieless — so **no consent banner is required**, which is both better UX and simpler compliance |
| CI/CD | **GitHub Actions** | **$0** | Unlimited minutes on public repositories — the repo being open source makes CI free |
| Container registry | **GHCR** | **$0** | Free for public images |
| Code quality | **SonarCloud** | **$0** | Free for public repositories — and it is in the pipeline being taught |
| Vulnerability scanning | **Trivy** in Actions | **$0** | Same tool as the reference platform |
| AI mentor | Haiku-class, quota'd, cached | **$0–20/mo** | §8.5, with a hard kill switch |

#### The honest cost figure

Quoting "$0.87/month" as *the* cost is misleading, and this document previously
did so. There are two numbers and both must be stated:

| | Cost | What it is |
|---|---|---|
| **Months 1–12 (or until credits exhaust)** | **≈ $0.87/mo** | The domain only. Compute, database and storage are genuinely $0 inside the AWS free tier |
| **Steady state, after the free tier** | **≈ $6–14/mo** | Domain + one small always-on server + storage + email. Everything else on this list has a **permanent** free tier, not a trial one |

The second number is the real operating cost of EgyKode, and it is the one to
plan around. The free tier is a 12-month discount on one line item, not a
business model. **Never present the free-tier number as the run-rate.**

What stays free permanently regardless: Cloudflare DNS/CDN/WAF/Tunnel/Pages,
R2 to 10GB, GitHub Actions on public repos, GHCR, SonarCloud, Grafana Cloud,
Sentry, UptimeRobot, Cloudflare Web Analytics, Killercoda, Orama. Only
**compute, database disk, and email volume** ever start billing.

#### Compute portability is a design requirement

Because the compute layer is the only line item with a cliff, it MUST be
disposable. The rule:

> The entire backend is a `docker-compose.yml` plus an Ansible playbook. Moving
> it to a different provider is a DNS change and one playbook run — target
> **under two hours**, and it MUST be drilled once before the free tier expires.

Nothing in the application may depend on an AWS-specific service. No SQS, no
Cognito, no Parameter Store in the hot path, no S3-only SDK calls (R2 is
S3-compatible, which is precisely why it was chosen). This one constraint is
what converts a free-tier cliff from an emergency into a scheduled maintenance
task.

#### Compute provider options, ranked

| Option | Spec | Cost | Verdict |
|---|---|---|---|
| **AWS EC2 t3.micro** (free tier) | 2 vCPU burst, **1GB RAM** | $0 for 12mo, then ~$9/mo | **Recommended for Phase 0–1.** Free, and dogfooding AWS is itself content. **1GB RAM is the binding constraint** — Postgres + Redis + Django + Celery + nginx on 1GB needs tuning and a 2GB swap file |
| **Hetzner CX22** | 2 vCPU, **4GB RAM**, 40GB | ~€3.8/mo | **Recommended from Phase 2.** Four times the RAM for the price of a coffee, no cliff, no surprise bill. The pragmatic long-term home |
| **Oracle Cloud Always Free** | up to **4 ARM cores / 24GB RAM**, 200GB | **$0, no time limit** | Extraordinary value and the best free tier that exists. Caveats that must be respected: ARM capacity is frequently unavailable in popular regions, and Oracle has reclaimed idle free accounts. **Viable as production only with the §10.8 backups genuinely tested** — never as the sole copy |
| **DigitalOcean / Vultr** | 1–2GB | ~$6–12/mo | Fine, no advantage over Hetzner |

**The decision:** start on the AWS free tier as planned — it is free, it is
real Linux, and running the platform on AWS while teaching AWS has genuine
narrative value. Treat it as a **12-month lease on a server**, not a permanent
home, and have the migration playbook working from week one.

**Total run-rate at launch: ≈ $0.87/month. Budget for ≈ $10/month from month
13.**

### 10.5 Scaling path and what each step costs

Cross these bridges only when a metric demands it, and add the cost knowingly.

| Trigger | Change | Added cost |
|---|---|---|
| Free tier expires / credits exhausted | t4g.small reserved, or migrate to Hetzner/Oracle | ~$8–14/mo |
| Postgres > 20GB or backup anxiety | RDS db.t4g.micro Multi-AZ, or Neon paid | ~$15–30/mo |
| >2k concurrent WebSockets | Split Channels onto its own instance | ~$8/mo |
| Media > 10GB | R2 beyond free tier | $0.015/GB/mo, egress still $0 |
| AI usage beyond quota | Raise budget or lean harder on BYOK | capped by policy |
| Need multi-instance HA | **Now** an ALB is justified, plus a second AZ | ~$25/mo |
| Real Kubernetes for the platform itself | k3s on 2–3 small instances (not EKS) | ~$20/mo |

Note what is **not** on this list: a CDN bill, an egress bill, a load balancer
before it is needed, and managed Kubernetes. Those are the four that kill small
platforms.

### 10.6 Dogfooding: EgyKode runs what EgyKode teaches

This is the strategic centrepiece, and it should be visible to every visitor.

- `infra/` is **Terraform + Ansible**, structured exactly like the reference
  platform in `platform/`, and it is **public**.
- The deploy pipeline is a **GitHub Actions workflow** that mirrors the taught
  Jenkins pipeline stage for stage: test → SonarCloud quality gate → Trivy FS →
  build image → **Trivy image scan before push** → push to GHCR → update the
  deployment manifest → deploy.
- A **public status page** and a **public read-only Grafana dashboard** show the
  platform's own latency, error rate and saturation.
- `/build/platform/egykode-itself` documents the live system: its ADRs, its
  actual costs (published monthly), its incidents and their postmortems.
- **Published incident postmortems are the highest-credibility content the
  platform can produce.** Nobody else in this space does it.

The message to a visitor: *"Everything here is explained by the site you are
reading it on."* That is the proof that turns a documentation site into a
reference.

### 10.7 Bootstrap order (day 1 → day 7)

1. Register `egykode.com` at Cloudflare. Enable DNSSEC, set up email routing.
2. **Create the AWS budget alert at $0 before creating any resource.** Enable
   IAM MFA, create a non-root admin user, enable CloudTrail.
3. `infra/terraform/bootstrap` — S3 state bucket + DynamoDB lock table (both
   within free tier), KMS key.
4. `infra/terraform/` — VPC with **public subnets only**, one security group
   with **no inbound rules**, one t3.micro with an instance profile, 30GB gp3.
5. `infra/ansible/` — baseline hardening, Docker, `cloudflared`, node_exporter,
   automatic security updates, fail2ban (belt and braces), log rotation.
6. Docker Compose up: postgres, redis, django, celery, nginx.
7. Cloudflare Tunnel → `api.egykode.com`. Cloudflare Access on `/admin`.
8. Cloudflare Pages → `egykode.com`, preview deployments on PRs.
9. R2 buckets: `egykode-media`, `egykode-backups`. Lifecycle rules.
10. Grafana Cloud, Sentry, UptimeRobot, Resend.
11. GitHub Actions: CI on PR, deploy on merge to `main`.
12. **Restore drill.** Take a backup, destroy the database, restore it, and
    write down how long it took. A backup that has not been restored is a
    hope, not a backup — and the drill is itself a chapter.

### 10.8 Backup & disaster recovery

- `pg_dump` nightly → R2, 30 daily / 12 weekly / 12 monthly retention.
- Uploaded media replicated to a second R2 bucket weekly.
- **Content and code are in git**, so the true blast radius of losing the
  instance is the database and uploads only.
- Full rebuild from zero must be reproducible from `infra/` + the latest dump.
  **Target RTO: 2 hours. Target RPO: 24 hours.** Both measured, not asserted —
  and published.
- Quarterly restore drill, with the result recorded in `docs/drills/`.

### 10.9 Environments

| Env | Where | Purpose |
|---|---|---|
| **local** | Docker Compose + `next dev` | Development. One `make up` must bring up everything |
| **preview** | Cloudflare Pages preview + shared staging API | Per-PR frontend previews |
| **staging** | Same instance, separate compose project + database | Migration rehearsal |
| **production** | As §10.2 | |

Secrets: `.env` locally (git-ignored, with `.env.example` committed), GitHub
Actions secrets in CI, and **SOPS-encrypted files or AWS Parameter Store
(free tier)** on the instance. No secret is ever committed, and `gitleaks` runs
in CI to enforce it.
