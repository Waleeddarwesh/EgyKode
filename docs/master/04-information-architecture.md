---

## Part 5 — Information Architecture

### 5.1 Navigation model

The prior prompt listed twelve top-level items. Twelve is not navigation, it is
a sitemap. EgyKode uses **five primary destinations plus search**, with depth
reached by drilling, because a person can hold five things in mind and cannot
hold twelve.

**Primary navigation (persistent):**

| Item | AR | Contains |
|---|---|---|
| **Learn** | تعلّم | Handbook chapters, roadmaps, courses, glossary |
| **Build** | ابنِ | Labs, the reference platform, architecture explorer, simulators |
| **Prepare** | استعد | Interview hub, quizzes, troubleshooting, cheat sheets |
| **Community** | المجتمع | Feed, discussions, contributors, chat |
| **Jobs** | وظائف | Board, saved searches, applications |

**Persistent chrome:** logo/home · primary nav · **⌘K search** · theme toggle ·
language toggle · notifications · avatar menu (signed in) / Sign in + Get
started (signed out).

**Signed-out home** is the landing page (§5.4).
**Signed-in home** is the personalised dashboard (§5.5) — *not* the feed. The
feed is a tab within Community. Making the feed the home page converts a
learning platform into a doomscroll and destroys the retention metric that
matters.

### 5.2 Route map

```
/[locale]/
├─ (marketing)
│  ├─ /                          Landing (signed out) | Dashboard (signed in)
│  ├─ /about  /manifesto  /roadmap-public  /changelog  /contribute
│  └─ /pricing                   ("Free. Here's how that stays true.")
│
├─ /learn
│  ├─ /learn                     Curriculum overview, all paths
│  ├─ /learn/paths/[path]        beginner|intermediate|advanced|expert|platform
│  ├─ /learn/[domain]            e.g. /learn/kubernetes  (domain hub)
│  ├─ /learn/[domain]/[chapter]  The chapter page (§6.2)
│  ├─ /learn/glossary            Bilingual term index
│  └─ /learn/courses
│     ├─ /learn/courses/[slug]           Course landing
│     └─ /learn/courses/[slug]/[lesson]  Lesson player
│
├─ /roadmaps
│  ├─ /roadmaps                  All roadmaps
│  └─ /roadmaps/[slug]           Interactive canvas (§6.3)
│
├─ /build
│  ├─ /build/labs                Lab catalogue, filterable
│  ├─ /build/labs/[slug]         Lab runner (§6.4)
│  ├─ /build/platform            The reference platform, documented
│  ├─ /build/platform/[section]  infrastructure | k8s | cicd | gitops | observability | security
│  ├─ /build/architecture        Interactive architecture explorer (§6.6)
│  ├─ /build/aws                 AWS service explorer (§6.7)
│  ├─ /build/simulators/cicd     CI/CD pipeline simulator (§6.8)
│  ├─ /build/simulators/gitops   GitOps sync simulator (§6.8)
│  ├─ /build/decisions           ADR catalogue (§6.9)
│  └─ /build/projects            Community project showcase
│
├─ /prepare
│  ├─ /prepare/interview         Question bank, levelled (§6.10)
│  ├─ /prepare/interview/[slug]  A single question with answer + follow-ups
│  ├─ /prepare/troubleshoot      Symptom-first troubleshooting hub (§6.11)
│  ├─ /prepare/troubleshoot/[slug]
│  ├─ /prepare/quizzes           Quiz index + mock exams
│  └─ /prepare/cheatsheets       Command reference (§6.12)
│
├─ /community
│  ├─ /community                 Feed (§7.2)
│  ├─ /community/post/[id]       Permalink + thread
│  ├─ /community/topics/[tag]    Topic feed
│  ├─ /community/contributors    Leaderboard + credit
│  └─ /community/events          Meetups, streams (later phase)
│
├─ /jobs
│  ├─ /jobs                      Board with filters
│  ├─ /jobs/[id]                 Detail + apply
│  └─ /jobs/post                 Employer submission (moderated)
│
├─ /chat                         Direct + group messaging (§7.4)
│  └─ /chat/[threadId]
│
├─ /u/[handle]                   Public profile (§7.5)
│  ├─ /u/[handle]/progress       Public learning record (opt-in)
│  └─ /u/[handle]/projects
│
├─ /dashboard                    Personal home (signed in) (§5.5)
│  ├─ /dashboard/progress  /bookmarks  /certificates  /submissions
│  └─ /settings/{profile,account,security,notifications,appearance,privacy}
│
├─ /search                       Full search results page
└─ /api/*                        BFF routes → Django (§9.6)
```

### 5.3 Content taxonomy

Three orthogonal axes. Every piece of content carries all three.

**Domain** (what it is about) — `linux` `networking` `git` `docker`
`containerd` `kubernetes` `helm` `kustomize` `terraform` `ansible` `aws`
`jenkins` `github-actions` `argocd` `gitops` `prometheus` `grafana` `loki`
`security` `sre` `platform-engineering` `cost`.

**Level** — `beginner` `intermediate` `advanced` `expert`.

**Type** — `concept` `howto` `reference` `lab` `decision` `troubleshooting`
`interview` `course`.

The Type axis maps to the Diátaxis framework (concept=explanation,
howto=tutorial/how-to, reference=reference) and MUST discipline the writing:
a `concept` page that turns into a step-by-step is misfiled, and a `reference`
page that editorialises is misfiled.

### 5.4 Landing page

Not a hero + feature grid. A landing page for a reference platform must
demonstrate the reference in the first screen.

| Band | Content | Notes |
|---|---|---|
| 1. Hero | Headline, sub, two CTAs (**Start learning** / **See the platform**), and a **live architecture diagram** that is the real one, not decoration | Diagram is inline SVG, animated on load once, `prefers-reduced-motion` safe. **No autoplay video, no canvas particle field.** |
| 2. Proof strip | Chapter count · lab count · languages · MIT · GitHub stars (cached, ISR) | Real numbers from the content index at build time — never hardcoded |
| 3. The thesis | Three cards: *One real system* / *Arabic and English* / *Free and open* | |
| 4. Choose your path | Five path cards with time estimates and "start here" | The single most important conversion element |
| 5. Interactive taste | The CI/CD simulator, embedded and runnable **without an account** | Prove the platform is alive before asking for anything |
| 6. Inside the platform | Tabbed code from the *actual* repo: Terraform module, Ansible role, Jenkinsfile, ArgoCD Application | Sourced from the real files, not hand-written samples |
| 7. Roadmap preview | Miniature of the DevOps roadmap, clickable | |
| 8. Community | Recent posts, contributor avatars, Discord/GitHub | |
| 9. Contribute | "This is a community reference. Here is how to add to it." | Positioning, per §1.4 |
| 10. Footer | Full sitemap, language, theme, license, status page | |

**Constraint:** the landing page MUST reach LCP < 2.0s on a simulated Moto G4 /
Slow 4G. That budget dictates every choice above.

### 5.5 Dashboard (signed-in home)

Answers exactly one question: **"What should I do next?"**

- **Continue** — resume the last chapter/lab/lesson, with progress ring.
- **Your path** — current node in the roadmap, next 3 unlocked nodes.
- **Streak & XP** — current streak, week grid, XP to next level (§7.6).
- **Due for review** — spaced-repetition items from quizzes (§6.13).
- **Your feed, condensed** — 5 items max, replies to you first.
- **Jobs matching your skills** — 3, based on completed domains.
- **Continue contributing** — open issues tagged `good-first-issue`, chapters
  missing Arabic translation.

Every widget is dismissible and the layout is user-orderable, persisted server
side.

### 5.6 Command palette (⌘K / Ctrl+K)

The primary navigation method for returning users. Craft's
`components/ui/command-palette.tsx` is the starting implementation.

Modes, switched by a leading sigil:

| Trigger | Mode |
|---|---|
| *(none)* | Unified search: chapters, labs, questions, commands, people, jobs |
| `>` | Commands: toggle theme, switch language, go to settings, sign out |
| `#` | Topics/tags |
| `@` | People |
| `/` | Terminal-command lookup — `/kubectl get pods` → the reference entry |
| `?` | Help & shortcuts |

Requirements: opens in < 50ms with a warm index; keyboard-only complete;
recent + suggested when empty; results grouped by type with counts; Arabic
queries normalised per §4.6; full-page fallback at `/search` for sharing.

### 5.7 Global keyboard shortcuts

`⌘K` search · `⌘/` shortcut help · `g h` home · `g l` learn · `g b` build ·
`g c` community · `g j` jobs · `g p` profile · `t` cycle theme · `l` toggle
language · `[` `]` previous/next chapter · `b` bookmark current page ·
`c` copy current code block · `Esc` close overlay.

All discoverable via `⌘/`. All disabled while a text input has focus.
