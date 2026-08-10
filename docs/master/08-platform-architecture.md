---

## Part 9 — Platform Architecture

### 9.1 Stack decision

**Frontend:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 3 ·
shadcn/ui · Framer Motion (sparingly) · TanStack Query · next-intl · MDX via
Velite/Contentlayer · Shiki · Mermaid · React Flow · Recharts · Lucide.

**Backend:** **Python 3.12 · Django 5 · Django REST Framework · Django
Channels · Celery · PostgreSQL 16 (+ `pgvector`) · Redis.**

#### Why Django here (the decision record)

| Reason | Detail |
|---|---|
| **Django admin is a free CMS and moderation console** | Content review, job approval, user moderation, report queues, translation workflow — all of it exists the moment the models do. Building these UIs from scratch would be weeks of work and is the single largest hidden cost in a social platform |
| **Auth, permissions, sessions, password reset, email** | Batteries included and battle-tested. Rolling your own auth is the most common way small platforms get breached |
| **The ORM and migrations** | A social graph plus progress tracking plus a jobs board is a relational problem. This is Django's home ground |
| **Channels gives WebSockets without a second service** | Chat, presence and live notifications run in the same codebase and deployment as everything else |
| **Celery covers the async work** | Digests, embeddings, unfurls, image processing, job expiry, streak rollovers |
| **pgvector in the same Postgres** | The AI mentor needs no separate vector database |
| **It matches the platform's own subject matter** | The reference architecture already runs a Python/Java stack on Kubernetes; the platform's own deployment becomes teaching material (§10.6) |

**Trade-off accepted:** two languages and two deploy targets instead of one
Next.js monolith. That cost is real. It is paid back by the admin, the auth,
and the fact that the content half of the site is static and does not need the
backend at all.

**Rejected alternatives:** FastAPI (no admin, no auth, no ORM migrations story
— we would rebuild all three); Next.js API routes only (poor fit for
WebSockets, Celery-class background work, and heavy relational modelling);
Supabase (fast start, but the moderation and content workflows would still have
to be built, and it moves the data layer off the infrastructure being taught).

### 9.2 The split: static content, dynamic everything else

This division is what keeps the platform fast and free.

```
┌─────────────────────────────────────────────────────────────┐
│  STATIC (built at deploy, served from CDN, no backend)      │
│  Chapters · roadmaps · labs · ADRs · interview bank ·        │
│  troubleshooting · cheat sheets · landing · search index     │
│  → 90% of traffic, 0% of server cost, fully indexable        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  DYNAMIC (Django)                                            │
│  Auth · progress · bookmarks · quizzes · feed · comments ·   │
│  chat · jobs · profiles · notifications · AI mentor · admin  │
└─────────────────────────────────────────────────────────────┘
```

Consequence: **an anonymous visitor reading a chapter never touches Django.**
The backend only has to scale with the logged-in community, which is a far
smaller number. This single decision is what makes "free at the beginning"
arithmetically possible.

### 9.3 Data model

Core tables, Django app by app. This is the v1 schema; it is deliberately
boring.

**`accounts`**
```
User(AbstractUser)      id, email(unique), handle(unique, citext), name,
                        avatar, headline, bio, location, links(jsonb),
                        locale, theme_pref, timezone, is_verified,
                        reputation, xp, level, created_at
Profile privacy         show_progress, show_certificates, show_activity,
                        searchable
Follow                  follower→user, following→user, created_at  [unique]
Block                   blocker, blocked, reason, created_at
EmailVerification / PasswordReset / Session (django default + rotation)
```

**`content`** — mirrors the static corpus so dynamic features can reference it
```
Content         content_id(unique), type, domain, level, slug,
                title_en, title_ar, status, translation_status,
                reading_time, published_at, updated_at, checksum
ContentChunk    content→Content, heading_path, body, lang,
                embedding vector(768), tsv tsvector      [pgvector + GIN]
Glossary        term_en, term_ar, definition_en, definition_ar, domain
```
Synced from the repo by a management command in CI (`sync_content`), so the
database never becomes a second source of truth for content.

**`learning`**
```
Progress        user, content_id, state(not_started|in_progress|complete),
                percent, last_position, completed_at   [unique user+content]
Bookmark        user, content_id, note, created_at
QuizAttempt     user, quiz_id, score, answers(jsonb), created_at
ReviewItem      user, item_id, ease, interval_days, due_at, reps   # SM-2
LabSubmission   user, lab_id, status, evidence(jsonb), artifact_url,
                validated_at
RoadmapProgress user, roadmap, node_id, state, updated_at
Streak          user, current, longest, last_active_date, freezes_left
Certificate     user, path_id, serial(uuid), issued_at, revoked
Enrollment      user, course, progress, last_lesson, completed_at
```

**`community`**
```
Post        author, type, title, body_md, body_html, lang, domains[],
            upvotes, comment_count, score, state(published|hidden|removed),
            created_at, edited_at
Comment     post, author, parent(self, max depth 2), body_md, is_accepted
Vote        user, target(generic), value(+1)              [unique]
Tag / PostTag
Report      reporter, target(generic), reason, status, handled_by, notes
Notification user, type, actor, target(generic), read_at, channels_sent
```

**`chat`**
```
Thread      type(dm|room|group), slug, title, domain, is_public, created_by
Membership  thread, user, role, joined_at, last_read_at, muted
Message     thread, sender, body, attachments(jsonb), reply_to,
            edited_at, deleted_at, created_at            [index thread,-created_at]
Presence    (Redis only — never Postgres)
```

**`jobs`**
```
Company     name, slug, website, logo, verified, domain_verified_at, owner
Job         company, title, description_md, location, remote_policy,
            seniority, salary_min, salary_max, currency, skills[],
            apply_url|apply_email, source, submitted_by,
            state(pending|published|rejected|expired), published_at, expires_at
SavedJob / JobAlert / Application(self-reported)
```

**`ai`**
```
Conversation user|null, locale, created_at
AiMessage    conversation, role, content, cited_chunks[], model,
             tokens_in, tokens_out, rating, created_at
AiQuota      user|ip_hash, date, count                    [unique]
```

**Indexing requirements:** `Post(score DESC, created_at DESC)`,
`Message(thread, created_at DESC)`, `Progress(user, content_id)`,
`ContentChunk` HNSW on `embedding` + GIN on `tsv`, `Job(state, published_at)`,
partial index on `Post` where `state='published'`.

### 9.4 API design

**DRF**, versioned at `/api/v1/`, JSON only.

- **Auth:** session cookies for the first-party web app (HttpOnly, Secure,
  SameSite=Lax) — **not** JWT in `localStorage`, which is XSS-exposed. A JWT
  path exists only for a future mobile client, with refresh rotation.
- **Pagination:** cursor-based on all feeds and lists. Offset pagination breaks
  on live data.
- **Filtering:** `django-filter`, explicit allowlists, never arbitrary field
  lookups from query params.
- **Throttling:** DRF throttles per scope — `anon` 60/min, `user` 300/min,
  `write` 30/min, `ai` per §8.5, `auth` 5/min.
- **Errors:** RFC 7807 problem+json, with a stable `code` the frontend maps to
  a localised message. **Never** return a raw English string for display.
- **Idempotency** keys on POSTs that create.
- **OpenAPI** schema generated by `drf-spectacular`, published at `/api/docs/`,
  and used to generate the TypeScript client — so frontend types cannot drift
  from the backend.

Representative endpoints:
```
POST   /api/v1/auth/{register,login,logout,verify,reset}
GET    /api/v1/me                       PATCH /api/v1/me
GET    /api/v1/progress                 PUT  /api/v1/progress/{contentId}
GET    /api/v1/roadmaps/{slug}/progress
POST   /api/v1/quizzes/{id}/attempt
GET    /api/v1/reviews/due
POST   /api/v1/labs/{slug}/submit
GET    /api/v1/feed?tab=&domain=&cursor=
POST   /api/v1/posts                    POST /api/v1/posts/{id}/vote
GET    /api/v1/posts/{id}/comments      POST /api/v1/comments
GET    /api/v1/threads                  GET  /api/v1/threads/{id}/messages
GET    /api/v1/jobs?remote=&skills=     POST /api/v1/jobs
GET    /api/v1/users/{handle}
POST   /api/v1/ai/ask
POST   /api/v1/reports
GET    /api/v1/search?q=&lang=&type=
```

### 9.5 Realtime

**Django Channels** with the Redis channel layer.

- One WebSocket per client at `/ws/`, multiplexed by subscription (chat threads,
  notifications, presence) — not one socket per feature.
- Auth on connect via the session cookie; the socket is rejected, not
  downgraded, if unauthenticated.
- **Server-side fan-out is bounded:** a message publishes to a thread group,
  never to a global group.
- Presence and typing indicators live in **Redis with TTL**, never in Postgres.
- Graceful degradation: if the socket fails, the client polls
  `/api/v1/threads/{id}/messages?since=` every 10s. Chat must never appear
  broken.
- ASGI server: **Uvicorn** behind the same container as Gunicorn's WSGI
  workers, or a single Uvicorn process serving both (simpler at this scale).

### 9.6 Frontend ↔ backend integration

- Next.js **server components** call Django directly over the internal network
  for data needed at render.
- Client mutations go through **Next.js route handlers acting as a BFF**, which
  attach the session, enforce CSRF, and normalise errors. The browser never
  holds a Django API token.
- **TanStack Query** for client cache, optimistic updates on votes/bookmarks/
  progress, and rollback on failure.
- Static content pages use ISR with on-demand revalidation triggered by the
  content sync job.

### 9.7 Repository layout

A monorepo. One clone, one issue tracker, one CI.

```
egykode/
├─ apps/
│  ├─ web/                       Next.js 15
│  │  ├─ app/[locale]/(marketing|learn|build|prepare|community|jobs|account)/
│  │  ├─ components/{ui,layout,content,learn,community,chat,jobs,charts}/
│  │  ├─ lib/{api,auth,i18n,search,analytics,mdx}/
│  │  ├─ messages/{en,ar}/
│  │  └─ styles/globals.css      ← the token layer (§3.2)
│  └─ api/                       Django project
│     ├─ egykode/{settings,asgi,wsgi,urls}.py
│     ├─ apps/{accounts,content,learning,community,chat,jobs,ai,moderation}/
│     ├─ management/commands/{sync_content,embed_chunks,expire_jobs}.py
│     └─ tests/
├─ content/
│  ├─ learn/<domain>/<slug>.{en,ar}.mdx
│  ├─ labs/  roadmaps/  interview/  troubleshoot/  decisions/  courses/
│  └─ glossary.{en,ar}.yml
├─ packages/
│  ├─ design-tokens/             single source → CSS vars, Tailwind, Flutter
│  ├─ ui/                        shared primitives
│  └─ api-client/                generated from OpenAPI
├─ platform/                     the reference architecture (submodule or vendored)
│  ├─ terraform/ ansible/ kubernetes/ gitops/ jenkins/
├─ infra/                        EgyKode's OWN infrastructure (§10)
│  ├─ terraform/ ansible/ docker/ k8s/
├─ .github/workflows/
└─ docs/                         this specification, ADRs, contributing
```

`platform/` and `infra/` are distinct and must not be confused: `platform/` is
**what we teach**, `infra/` is **what we run**. They converge over time
(§10.6), which is the point.
