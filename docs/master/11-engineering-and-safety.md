---

## Part 13 — Engineering Standards, Security, Safety & Legal

### 13.1 Code standards

**TypeScript** — `strict: true`, `noUncheckedIndexedAccess`. **No `any`**;
`unknown` plus a narrowing guard instead. All API responses validated with Zod
at the boundary — a backend change must fail loudly in the frontend, not
silently render `undefined`. ESLint + Prettier, with the RTL logical-property
rule of §4.3 as an error.

**Python** — `ruff` (lint + format), `mypy --strict` on `apps/`, Django's own
checks in CI. Fat models, thin views, business logic in `services.py` — not in
serializers, not in views. Every queryset that crosses a relation uses
`select_related`/`prefetch_related`; an N+1 in a list endpoint is a bug, and
`nplusone` runs in the test suite to catch it.

**Universal** — Conventional Commits. Trunk-based with short-lived branches.
Squash merge. No direct pushes to `main`; branch protection with required
checks. Every PR: description, linked issue, screenshots for UI changes in
**both themes and both languages**, and a checklist.

**Comments** explain *why*, never *what*. The Craft codebase's commenting style
— a short note explaining the reasoning behind a non-obvious choice — is the
model, and it is the right one.

### 13.2 Testing

| Layer | Tool | Gate |
|---|---|---|
| Backend unit/integration | `pytest` + `pytest-django`, factories not fixtures | **≥ 80% on `apps/`**, 100% on permissions and moderation |
| API contract | `drf-spectacular` schema diff | Breaking change fails CI |
| Frontend unit | Vitest + Testing Library | Critical components |
| E2E | Playwright | The six critical paths, **in en+ar × dark+light** |
| Visual regression | Playwright screenshots | The four-state matrix (§4.7) |
| Accessibility | `axe-core` | Zero serious/critical |
| Performance | Lighthouse CI + bundlesize | §12.4 budgets |
| Content | custom linter | §11.6 |
| Security | `bandit`, `pip-audit`, `npm audit`, Trivy, `gitleaks` | No high/critical |
| Load | `k6`, before each phase launch | Documented headroom |

**The six critical E2E paths:** sign up & verify · read a chapter and mark
complete · complete a lab and submit evidence · post and receive a reply · send
and receive a chat message · search (Arabic query) and open a result.

### 13.3 Application security

- **Auth:** Django's hasher (Argon2), session cookies `HttpOnly`/`Secure`/
  `SameSite=Lax`, rotation on login, session invalidation on password change.
  Optional TOTP 2FA. Login throttled to 5/min/IP with exponential backoff.
- **Never** JWT in `localStorage`.
- **CSRF** on all state-changing requests; the BFF attaches the token.
- **CSP** with nonces, no `unsafe-inline`, no `unsafe-eval`. Plus HSTS,
  `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` denying camera/mic/geolocation.
- **User content sanitisation:** markdown → HTML through an allowlist
  sanitiser (`bleach`/`rehype-sanitize`). No raw HTML from users, ever. Links
  get `rel="nofollow ugc noopener"`.
- **Uploads:** type sniffed from content not extension, size-capped,
  re-encoded (strips EXIF and any embedded payload), served from R2 on a
  **separate origin** so a malicious file cannot execute in the app's origin.
- **SSRF:** link unfurling runs through an allowlist resolver that rejects
  private IP ranges and link-local addresses — a metadata-endpoint SSRF on an
  EC2 instance is the classic way this exact feature gets a platform breached.
  IMDSv2 is enforced regardless.
- **IDOR:** object-level permission checks in DRF permission classes, tested
  explicitly. Never trust an ID from the client.
- **Rate limits** on every write endpoint, per user and per IP.
- **Admin** behind Cloudflare Access, 2FA required, on a non-obvious path.
- **Dependencies:** Dependabot, weekly, with automated tests gating merge.
- **Disclosure:** `SECURITY.md` with a contact and a 90-day policy. A public
  hall of fame for reporters costs nothing and works.

### 13.4 Trust & safety

Launch blockers, not v2 features.

**Policy.** A public, versioned Code of Conduct (Contributor Covenant as the
base, extended for platform content). Clear rules on: spam and self-promotion,
harassment, plagiarism (a real risk on a content platform), recruitment scams,
credential sharing, and paid-course spam.

**Prevention.**
- Email verification before posting.
- Progressive trust: a new account cannot post links, DM strangers, or create
  jobs until it has read ≥3 chapters or has been active ≥48h. This single
  mechanism removes the majority of drive-by spam.
- Rate limits per §13.3.
- New-account first post enters a review queue.
- Duplicate/near-duplicate detection on posts and jobs.

**Detection.** Report on every object · keyword and link heuristics · a
reputation-weighted flag threshold that auto-hides pending review · anomaly
alerts on posting velocity.

**Response.** A queue in Django admin with an SLA (24h for reports, 4h for
harassment/scam). Graduated actions: warn → shadow-limit → temporary suspend →
ban. Every action logged with a reason and appealable to a human. Soft-delete
for 30 days.

**Special case — the jobs board.** Per §7.7. Assume recruitment scams targeting
junior engineers *will* be attempted; the manual-approval gate on first
listings is the control that matters.

### 13.5 Privacy

- **Collect the minimum.** Email, handle, and what the user chooses to add.
  Never a phone number, never a national ID, never precise location.
- No cookies beyond session and preference — hence no consent banner.
- **Data export** (JSON) and **account deletion** self-service, both required
  by GDPR and both simply correct. Deletion removes personal data and
  anonymises retained content ("[deleted user]") rather than orphaning threads.
- Retention: AI conversations 30 days · analytics aggregated, no raw IPs ·
  logs 30 days · soft-deleted content 30 days.
- Privacy policy in **both languages**, written to be readable, listing every
  sub-processor (Cloudflare, AWS, Resend, Sentry, Grafana, the AI provider).

### 13.6 Legal

- **Code: MIT.** **Content: CC BY-SA 4.0.** Both stated in `LICENSE`,
  `README`, and the footer. CC BY-SA means translations and derivatives stay
  open, which protects the commons the project is trying to build.
- **Contributor terms:** a lightweight DCO (`Signed-off-by`) rather than a CLA.
  A CLA suppresses casual contribution and EgyKode needs casual contribution.
- **Third-party content:** vendor logos used nominatively under fair use, with
  a trademark acknowledgement page. Never imply endorsement by AWS, CNCF,
  HashiCorp or Red Hat, and never use their marks in the logo or favicon.
- **Job aggregation:** only from sources whose terms permit it, with
  attribution and a link to the origin. **Do not scrape sites that forbid it** —
  the legal exposure and the reputational damage both exceed the value.
- **User content:** users retain copyright and grant a licence to display.
  A DMCA-style takedown process with a named contact.
- **Jurisdictions:** Egypt's PDPL (Law 151/2018) and the GDPR both apply in
  practice. Compliance posture: minimal collection, explicit consent for
  optional processing, export and deletion, EU-region hosting where feasible.
- **Certificates** must not claim accreditation (§6.15).
- **AI crawlers:** state the policy in `robots.txt` explicitly, in either
  direction, rather than leaving it ambiguous.

### 13.7 Operational readiness

- Structured JSON logging with a request ID propagated end to end.
- `/health` (liveness) and `/ready` (dependencies) endpoints.
- Grafana dashboards for the four golden signals; alerts route to email and
  Discord, and **every alert links to a runbook** — matching the practice the
  handbook teaches.
- Runbooks in `docs/runbooks/` for: instance down, database full, Redis down,
  tunnel down, deploy rollback, spam flood, and credential compromise.
- Postmortems for anything user-visible, published (§10.6).
- A public status page.
