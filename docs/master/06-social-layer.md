---

## Part 7 — Community & Social Layer

The social layer is the **distribution and retention** mechanism for the
content. It is not a general-purpose social network, and every feature here is
justified by whether it makes someone learn more or contribute more.

### 7.1 Design principle: scoped social

A general feed on a learning platform decays into memes and self-promotion
within weeks. EgyKode constrains it structurally:

1. **Every post has a type** (§7.2). There is no untyped "what's on your mind".
2. **Every post is taggable to a domain**, and the domain taxonomy is the same
   one the content uses. Posts therefore enrich chapters.
3. **The feed is not the home page.** It is a destination inside Community.
4. **No infinite scroll on the dashboard.** Five items, then a link.
5. **No public follower counts as a headline metric.** Contribution is the
   status currency, not audience (§7.6).

### 7.2 Posts and the feed

**Post types**, each with its own composer and card:

| Type | Purpose | Special fields |
|---|---|---|
| `question` | Ask for help | domain, level, accepted answer, resolved flag |
| `project` | Share what you built | repo URL, stack tags, screenshots, architecture diagram |
| `learning` | Progress, milestone, certificate | auto-generated from progress events (opt-in) |
| `article` | Long-form write-up | MDX subset, reading time, cover |
| `resource` | A link worth sharing | URL, why it matters (required, ≥140 chars) |
| `job` | Cross-posted from the board | links to `/jobs/[id]` |
| `announcement` | Platform news | staff only |
| `discussion` | Opinion, trade-off debate | domain, poll (optional) |

**Composer:** markdown with live preview · code blocks with language detection
and syntax highlighting · image upload (≤4, ≤2MB each, converted to WebP) ·
domain tags (1–3, required) · language (`en`/`ar`, defaults to UI locale) ·
draft autosave · @-mentions · link preview (server-side unfurl, sanitised).

**Interactions:** upvote (not "like" — signals usefulness) · comment (threaded,
2 levels max) · bookmark · share · report. **No "repost".** Reposting inflates
feeds without adding information.

**Ranking** — a transparent, explainable score. No opaque algorithm:

```
score = log10(upvotes + 1) * 1.0
      + log10(comments + 1) * 1.4        # discussion > applause
      + domain_affinity * 0.8            # matches domains you study
      + locale_match * 0.6
      + author_reputation_bonus (capped)
      - age_hours^1.6 / gravity
      + unanswered_question_boost        # questions with 0 answers surface
```

The `unanswered_question_boost` is deliberate: the fastest way to kill a
community is for questions to go unanswered. Feed tabs: **Latest** · **Top** ·
**Unanswered** · **Following** · **My domains**.

**Feed rules:** every list is server-rendered and paginated (cursor-based), with
"load more" rather than infinite scroll; empty states suggest an action; and a
post from someone the reader follows is labelled as such.

### 7.3 Comments and discussion

- Threaded to **two levels**. Deeper nesting is unreadable on mobile and in RTL.
- Markdown + code blocks. Same sanitisation pipeline as posts.
- Question authors can **accept an answer**, which pins it and awards reputation.
- Comments on **chapters** are separate from the feed and are moderated more
  strictly: they must be about the chapter. Off-topic comments are converted to
  feed posts by moderators rather than deleted.
- Edit window of 15 minutes without a marker; after that, edits show "edited".

### 7.4 Chat

Real-time messaging. Built on **Django Channels** over WebSockets (§9.5).

**Scope for v1:**
- **Direct messages** between users who follow each other or share a thread.
- **Domain rooms** — one public room per major domain (`#kubernetes`,
  `#terraform`, `#aws`…), open to all, moderated.
- **Study groups** — private rooms of ≤20, created around a path or a lab.

**Features:** presence · typing indicators · read receipts · unread counts ·
message editing/deletion (self, and "delete for everyone" within 1 hour) ·
code blocks with highlighting · file/image attachments (≤5MB) · link unfurls ·
search within a thread · mute/leave/block · push notifications (Web Push).

**Craft's chat UI is directly reusable** — `chat-bubble`, `chat-canvas`,
`chat-daypill`, typing dots, `chat-turn` grouping and the RTL-aware bubble
corner tucks in `globals.css` are already solved. Port them with the new
tokens.

**Constraints that keep it cheap:**
- Messages are **not** stored forever in the hot path: rooms retain 90 days,
  DMs retain indefinitely but are archived to cold storage after a year.
- WebSocket connections are capped per user (3) and per IP.
- Rate limit: 20 messages/minute, 5 rooms joined concurrently.
- If the WebSocket layer is unavailable, chat degrades to polling rather than
  breaking.

### 7.5 Profiles

`/u/[handle]` — the artifact a learner shows a recruiter. This is a
**portfolio surface**, and it should be good enough that people link to it from
their CV.

**Sections:** avatar, name, handle, headline, location, links (GitHub,
LinkedIn, site) · bio · **skills, derived from verified completions rather than
self-declared** · learning record (paths, chapters, labs — opt-in public) ·
certificates · projects (repos with stack tags) · contributions (chapters
written, translations, answers accepted) · badges · activity graph · posts.

**The "verified skills" mechanic is the differentiator.** A skill appears only
when its evidence exists: chapter read + quiz passed + lab completed. A profile
that says "Kubernetes: 12/14 chapters, 4 labs, 2 accepted answers" is
information a recruiter can act on, unlike a self-rated star bar.

Craft's `Profile_Design.jpeg` — stat triple, verified badge, follow/message
pair, tabbed content — is the correct layout model. Reuse the structure.

**Privacy:** every section is individually toggleable between public /
signed-in-only / private. Default for a new account is **private learning
record**, public name and bio. Opt-in, not opt-out.

### 7.6 Gamification and reputation

Two separate currencies, deliberately not merged:

**XP — personal progress.** Earned for reading chapters, passing quizzes,
completing labs, maintaining streaks. Private by default. Drives level and the
dashboard. **Cannot be earned from social activity**, so nobody farms XP by
posting.

**Reputation — community contribution.** Earned for accepted answers, upvoted
posts, merged content PRs, **completed translations**, and reviewed
translations. Public. Drives the contributors leaderboard and unlocks
privileges: editing tags (50), reviewing translations (200), moderating a
domain room (1000).

**Badges** — achievement-shaped, never participation-shaped:
`First Cluster` · `Pipeline Green` · `Drift Detective` (completed the GitOps
selfHeal lab) · `Cost Conscious` (completed all cleanup steps in 10 labs) ·
`Translator` (10 reviewed Arabic chapters) · `Answerer` (25 accepted) ·
`Path Complete` per path · `Contributor` (first merged PR).

**Streaks** — day-granular, timezone-aware, with **two freeze days per month**
granted automatically. Streak mechanics that punish a missed day are hostile to
adults with jobs; the freeze is what makes them humane.

**Explicitly rejected:** XP for logging in, coins, purchasable boosts, public
XP leaderboards, streak-loss guilt notifications.

### 7.7 Jobs board

The most commercially valuable surface and the one most vulnerable to abuse.

**Sources, in order of trust:**
1. **Employer-submitted**, moderated before publication. Free at launch.
2. **Community-submitted** referrals, clearly labelled, with the submitter shown.
3. **Aggregated** — only from sources whose terms permit it, with attribution
   and a link to the origin. **No scraping of sites that forbid it.** This is
   both a legal and a reputational line (§13.6).

**Listing fields:** title · company (verified badge if claimed) · location +
remote policy (`onsite` / `hybrid` / `remote-egypt` / `remote-mena` /
`remote-global`) · seniority · **salary range (required — listings without one
are labelled "salary not disclosed" and rank lower)** · required skills, drawn
from the same domain taxonomy · description · how to apply · expiry (60 days,
auto-archived).

**For the learner:** filters and saved searches · alerts (email/push) ·
**skill-match score** computed against their verified skills, with the gaps
shown as "learn these" links back into the curriculum — this is the loop that
makes the jobs board serve the learning product rather than distract from it ·
saved jobs · application tracking (self-reported).

**Anti-abuse (mandatory before launch):** manual approval for the first
listing from any account · company domain verification via email · rate limits ·
a "report this listing" path with a 24h SLA · automatic rejection of listings
requesting payment from applicants · no external contact details in the body,
only through the structured apply field.

### 7.8 Notifications

Channels: in-app (bell + `/notifications`), email (digest), Web Push (opt-in).

Events: reply to your post/comment · your answer accepted · mention · new
follower · DM · job matching a saved search · content you bookmarked updated ·
translation review requested · streak at risk (once, at 20:00 local, opt-in) ·
weekly digest (Sunday, opt-out).

**Rules:** batched, never one email per event · every email has one-click
unsubscribe per category · quiet hours respected in the user's timezone ·
digest defaults on, everything else defaults off · no notification exists
solely to drive re-engagement.

### 7.9 Moderation surfaces

See §13.4 for policy. The **surfaces** required:

- Report button on every user-generated object.
- A moderation queue in **Django admin** (free, built-in — a major reason the
  Django choice pays off here).
- Soft-delete everywhere; nothing is hard-deleted for 30 days.
- Shadow-limit rather than ban for first offences: the user's posts stop being
  ranked but remain visible to them, which defuses ban-evasion.
- A public, versioned **Code of Conduct** and a transparency note on
  enforcement.
