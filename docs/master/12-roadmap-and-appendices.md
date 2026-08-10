---

## Part 14 — Open Source, Sustainability & Delivery

### 14.1 Open source posture

EgyKode is positioned as a **community reference**, not a personal showcase
(§1.4). That positioning must be reflected in the artifacts, or it is just a
claim.

Required at launch:
`README.md` (what it is, how to run it, how to contribute — in that order) ·
`CONTRIBUTING.md` with a 15-minute first contribution path ·
`CODE_OF_CONDUCT.md` · `SECURITY.md` · `LICENSE` (MIT) + `LICENSE-CONTENT`
(CC BY-SA 4.0) · `CHANGELOG.md` (Keep a Changelog) · `docs/adr/` ·
issue templates (bug / content error / new chapter / translation / feature) ·
PR template with the §13.1 checklist · `good-first-issue` and
`help-wanted` labels actually applied to real issues.

**Contribution paths, ordered by barrier — this ordering is the growth
strategy:**
1. Report a content error (one click from any chapter)
2. Fix a typo (GitHub web editor, one PR)
3. **Translate a chapter to Arabic** ← the highest-volume path, and the one
   that builds the moat
4. Add an interview question or troubleshooting entry
5. Write a lab
6. Write a chapter
7. Build a feature

**Governance.** Benevolent-dictator initially, stated honestly. A `MAINTAINERS`
file. Domain maintainers appointed as contributors emerge. Decisions of
consequence recorded as ADRs in the open.

**Credit is structural, not decorative.** Contributor avatars on every page
they touched; a contributors page; translators credited as authors; and release
notes that name people. The projects that attract contributors are the ones
where contribution is visible.

### 14.2 Sustainability

Free forever for learners. That has to be paid for, and the honest answer is
that at §10.4's run-rate, **it very nearly pays for itself**.

**Committed:** all learning content, all labs, all roadmaps, search, progress,
community, chat, and the jobs board for job seekers remain free, with no
paywall and no ads. Write this into the README so future-you cannot quietly
reverse it.

**Possible revenue, in order of fit:**

| Source | Fit | Notes |
|---|---|---|
| **GitHub Sponsors / OpenCollective** | High | Transparent ledger; publish the monthly infra bill (§10.6) — people fund things they can see |
| **Featured job listings** | High | Employers pay, seekers never do. Clearly labelled. Aligned incentives |
| **Company sponsorship** | Medium | A logo in the footer and on a sponsors page. No editorial influence, stated in policy |
| **Paid cohort/mentorship** | Medium | Human time is the only genuinely scarce good; content stays free |
| **Managed lab sandboxes (Tier 3)** | Medium | The one feature with a real marginal cost, so the one that can justify a fee |
| **Print/PDF handbook** | Low | Cheap to produce from the same MDX; a nice artifact |
| **Ads, paywalls, selling user data** | **Never** | Named here explicitly so the boundary is not negotiable later |

### 14.3 Delivery phases

The prior prompt's fatal flaw was demanding everything at once. This is the
sequence. **Do not start a phase before the previous one's exit criteria are
met.**

---

**Phase 0 — Foundation** *(weeks 1–3)*
Monorepo · design tokens · theme + locale switching · layout shell · MDX
pipeline · **migrate 10 handbook chapters** end-to-end (en, with 3 in ar) ·
static search · deployed to `egykode.com` · CI with the content linter.

*Exit:* a stranger can read a chapter in both languages and both themes on a
phone, and Lighthouse mobile ≥ 95.

---

**Phase 1 — The Reference** *(weeks 4–9)*
**All 47 chapters migrated** · glossary · domain hubs · learning paths ·
the interactive architecture explorer · ADR catalogue · troubleshooting hub ·
interview hub · cheat sheets · command palette · full SEO · RSS.

*Exit:* the platform is genuinely useful with **no account required**, and is
being indexed. **This is the point at which it should be shared publicly.**

---

**Phase 2 — Accounts & Practice** *(weeks 10–15)*
Django backend live · auth · profiles · progress · bookmarks · quizzes ·
spaced repetition · roadmaps with progress · **Tier 1 labs** · dashboard ·
certificates · notifications (email).

*Exit:* a learner can complete a full path with tracked progress and earn a
certificate.

---

**Phase 3 — Community** *(weeks 16–22)*
Feed · posts · comments · votes · reputation · badges · streaks · contributor
leaderboard · **web-based content editor** (§11.1) · translation workflow ·
moderation tooling · Killercoda **Tier 2 labs**.

*Exit:* someone other than you has merged a chapter and a translation, and the
first 100 posts exist with a median time-to-first-reply under 24h.

---

**Phase 4 — Chat, Jobs & AI** *(weeks 23–30)*
Django Channels chat (DMs, domain rooms) · jobs board with employer
verification · skill-match · saved searches and alerts · AI mentor with
grounded retrieval · Web Push · PWA offline reading.

*Exit:* the jobs board has real listings from real companies, and the AI mentor
answers with citations inside its cost budget.

---

**Phase 5 — Depth** *(ongoing)*
Courses and video paths · simulators (CI/CD, GitOps) · AWS explorer · study
groups · events · more roadmaps · community projects showcase · published
incident postmortems · Arabic parity at 100%.

---

### 14.4 Feature intake rubric

More feature ideas will arrive — including from the other agent chats yet to be
merged. Score each on this rubric before it enters the roadmap. **Anything
below 12 is declined and written down as declined**, so it does not get
re-proposed every month.

| Criterion | Weight | Question |
|---|---|---|
| **Learning value** | ×3 | Does it make someone learn more, or learn it better? |
| **Contribution value** | ×2 | Does it make contribution easier or more rewarding? |
| **Cost to run** | ×2 | Marginal monthly cost at 10k MAU. Anything over $20/mo scores 0 |
| **Cost to maintain** | ×2 | Ongoing human attention. Moderation-heavy features score low |
| **Build effort** | ×1 | Inverse |
| **Differentiation** | ×2 | Does anyone else already do this well? Does it deepen the Arabic moat? |
| **Risk** | ×2 | Abuse surface, legal exposure, dependency on a third party |

Score 1–5 each; max 70. **≥ 45 → next phase. 25–44 → backlog. < 25 → declined,
with the reason recorded.**

Worked examples:
- *Arabic translation workflow* — 68. Build immediately.
- *Killercoda embedded labs* — 61. Phase 3.
- *Published incident postmortems* — 58. Nearly free, uniquely credible.
- *Live video streaming* — 19. Declined: high cost, high maintenance, YouTube
  already does it better.
- *Self-hosted video* — 11. Declined on cost alone.
- *Public XP leaderboard* — 16. Declined: incentivises the wrong behaviour.
- *Native mobile app* — 22. Backlog: the PWA covers the need at 5% of the cost.

---

## Part 15 — Appendices

### A. Instructions to the implementing agent

Read this before writing any code.

1. **Migrate, do not invent.** The content in `R:\ivolve\` is the corpus. Your
   job is to structure, translate, interlink and present it — not to generate a
   parallel one. Generated filler is worse than an honest `status: partial`.
2. **Follow the phases.** Do not begin Phase 2 before Phase 1's exit criteria
   are met. Fifteen half-built subsystems is the failure mode this document
   exists to prevent.
3. **Ports come from real files.** When reusing Craft's design tokens, i18n,
   command palette, chat UI or PWA code, open the actual file at
   `R:\Craft\MicroServices Craft\services\customer-portal\` and adapt it. Do
   not reconstruct it from memory.
4. **The four-state matrix (§4.7) is a definition of done.** A component that
   has only been seen in `en` + dark is not finished.
5. **Budgets are gates, not targets.** If a change breaks the bundle budget,
   the change is wrong — not the budget.
6. **Never fabricate a command, a flag, a cost figure, or a benchmark.** If you
   do not know, mark it `TODO(verify)` and surface it in the PR.
7. **Ask before adding a dependency** that has a runtime cost, sends data to a
   third party, or is not on the §9.1 stack list.
8. **Every PR ships in both languages** or explicitly files the translation
   issue.
9. **Accessibility and RTL are not follow-up tickets.**
10. **When this document and a request conflict, say so** rather than silently
    picking one.

### B. Definition of done (per feature)

- [ ] Works in `en`/`ar` × dark/light
- [ ] Keyboard operable; `axe` clean; visible focus
- [ ] Responsive 320px → 2560px; touch targets ≥ 44px
- [ ] Server-rendered unless interactivity requires otherwise
- [ ] Loading, empty, error and offline states designed
- [ ] Within the performance budget (bundlesize green)
- [ ] Tests: unit + E2E for the happy path and one failure path
- [ ] Rate-limited and permission-checked if it writes
- [ ] Strings externalised to message catalogues, both locales populated
- [ ] Analytics event defined if it informs a product decision
- [ ] Documented in `docs/`, and in the changelog

### C. Environment variables

```bash
# ── web (Cloudflare Pages) ────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://egykode.com
NEXT_PUBLIC_API_URL=https://api.egykode.com
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_CF_ANALYTICS_TOKEN=
GITHUB_TOKEN=                      # stars, contributors, edit-PR flow

# ── api (Django) ──────────────────────────────────────────────────────
DJANGO_SECRET_KEY=
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=api.egykode.com
DATABASE_URL=postgres://...
REDIS_URL=redis://...
CORS_ALLOWED_ORIGINS=https://egykode.com
CSRF_TRUSTED_ORIGINS=https://egykode.com

R2_ACCOUNT_ID=  R2_ACCESS_KEY_ID=  R2_SECRET_ACCESS_KEY=
R2_BUCKET_MEDIA=egykode-media
R2_BUCKET_BACKUPS=egykode-backups
R2_PUBLIC_URL=https://cdn.egykode.com

RESEND_API_KEY=            DEFAULT_FROM_EMAIL=hello@egykode.com
SENTRY_DSN=
GRAFANA_CLOUD_PROM_URL=    GRAFANA_CLOUD_API_KEY=

AI_ENABLED=1               # the kill switch (§8.5)
AI_PROVIDER=anthropic
AI_MODEL=claude-haiku-4-5-20251001
AI_API_KEY=
AI_MONTHLY_BUDGET_USD=20

GITHUB_OAUTH_CLIENT_ID=    GITHUB_OAUTH_CLIENT_SECRET=
```

### D. Source inventory (what to migrate, and to where)

| Source path | Target |
|---|---|
| `Cloud-Native-DevOps-Handbook/*.md` (47) | `content/learn/**` |
| `Cloud-Native-DevOps-Platform/` | `platform/` + `/build/platform` |
| `Cloud-Native-DevOps-Platform/docs/adr/` (5) | `content/decisions/` |
| `Cloud-Native-DevOps-Platform/diagrams/architecture.png` | interactive SVG at `/build/architecture` |
| `CloudDevOpsProject/`, `Ivolve Final Project/` | `content/learn/paths/` |
| `NTI/NTI Final Project/**/README.md` (20) | `content/labs/` |
| `jenkins-shared-library/vars/*.groovy` (12) | `/build/platform/cicd` + CI/CD simulator stages |
| `portfolio.md` | `content/interview/` seed + decision narrative |
| `Craft/.../customer-portal/app/globals.css` | `apps/web/styles/globals.css` (retokenised) |
| `Craft/.../components/ui/{command-palette,toast,data-table,chart,skeleton}.tsx` | `packages/ui/` |
| `Craft/.../lib/i18n.tsx` | pattern reference for `next-intl` setup |
| `Craft/craft_mobile/lib/core/theme/` | `packages/design-tokens` Dart export |
| `logo.png`, `name_logo.png`, dark-mode artwork | `apps/web/public/brand/` **as SVG** |

### E. Decision record — second architecture review

A second review proposed a lower-cost, VPS-first stack. Most of it converged
independently on this document, which is a good signal. Recorded here so these
points are not re-litigated.

**Accepted — this document was wrong and has been corrected:**

| # | Point | Change |
|---|---|---|
| 1 | **"$0.87/month" misrepresented the run-rate.** It is the domain only; the free tier is a 12-month discount on compute, not a steady state | §10.4 now states two numbers: ≈$0.87/mo in months 1–12, **≈$6–14/mo steady state**, with the free-tier cliff and a named migration path |
| 2 | **The learning model needed a hierarchy, not a flat chapter list** | §6.0 adopts Roadmap → Phase → Module → {Lesson, Lab, **Challenge**, Project} + Assessment. The Challenge tier — a lab with its instructions removed and its success condition kept — is where competence actually forms, and it is nearly free to author |
| 3 | **"Every roadmap ends with a deployable production project"** is a better promise than anything previously written here | Adopted as *the* headline promise (§1.4) and made structural by §6.0 |

**Accepted as reinforcement (already specified, now stated more firmly):**
Django monolith with apps, not microservices · one Postgres with pgvector, no
separate vector database · no Elasticsearch · Redis only where needed · Docker
Compose, not Kubernetes, for the platform itself · Killercoda for real labs ·
no fake terminals · Cloudflare in front with a Tunnel and no open SSH ·
bilingual content model with per-locale fields, not string translation ·
community after learning.

**Declined, with reasons:**

| Proposal | Decision | Reason |
|---|---|---|
| **"Do not start on AWS; use a VPS"** | **Partially declined** | The critique targets EKS/RDS/NAT/ALB — all of which this document already excludes. What remains is one t3.micro in a public subnet, which *is* a VPS. Since it is free for 12 months and running on AWS while teaching AWS has real narrative value, we keep it — but treat it as a **12-month lease** with a drilled migration playbook (§10.4). The binding constraint is **1GB RAM**, not cost |
| **Route all search through Django** | **Declined** | Static content search runs client-side on the CDN (Orama). Sending anonymous chapter searches to a 1GB server is the fastest way to make it fall over, and it costs nothing to avoid. Postgres FTS handles dynamic search only (§12.1) |
| **"Basic logs and uptime checks; observability later"** | **Declined** | Grafana Cloud's free tier is $0 forever and is the *same* Prometheus/Loki/Grafana stack the handbook teaches. A platform teaching observability that runs blind is a credibility failure, not a cost saving (§10.4) |
| **A `payments/` app in the initial backend** | **Declined** | Contradicts free-at-launch and adds PCI and Egyptian regulatory surface for revenue that does not exist yet. Sponsorship (§14.2) needs no payment code |
| **Migrate to AWS "when the workload requires it"** | **Amended** | Correct for a normal product, incomplete for this one. EgyKode may migrate to EKS/ArgoCD/Prometheus *before* load requires it — because the migration is itself the flagship content, done publicly with published costs and postmortems (§10.6). That is a legitimate reason, but it must be **declared as a teaching decision**, never disguised as a scaling need |

**Not addressed by the review, and still launch blockers:** moderation and
abuse (§13.4), the RTL contract (§4.3), Arabic search normalisation (§12.1),
accessibility (§12.3), the performance budget (§12.4), legal posture (§13.6),
and the code-transclusion anti-drift rule (§11.4) — which is what makes "the
project is the curriculum" literally true rather than a slogan.

### F. Open questions requiring your decision

1. **AWS account free-tier plan** — classic 12-month or the newer credit-based
   plan? This changes the Phase 4–5 timeline, not the architecture (§10.1).
2. **AWS region** — `eu-central-1` (Frankfurt) is recommended: lowest latency
   to Egypt among GDPR-friendly regions. `me-south-1` (Bahrain) is closer but
   pricier and has no free-tier advantage.
3. **`egykode.dev` / `.io`** — worth registering defensively alongside `.com`?
4. **Discord vs GitHub Discussions** for the community's real-time home before
   Phase 4 chat exists. Recommendation: Discord, because this audience is
   already there.
5. **Trademark search** for "EgyKode" in Egypt (§2.1).
6. **The remaining agent chats** you mentioned — send them and they will be
   scored against the §14.4 rubric and merged into this document.
