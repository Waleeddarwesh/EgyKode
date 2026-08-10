---

## Part 11 — Content System

### 11.1 Content lives in git

All learning content is **MDX in the repository**, not in a database. This is a
deliberate choice with consequences worth stating:

**Gains:** review via pull request; history and blame per paragraph; branch
previews; contribution by anyone who can use GitHub; no CMS to run or secure;
content builds to static files that cost nothing to serve; and the content
survives the platform.

**Costs:** non-technical contributors are excluded, and there is no WYSIWYG.

**Mitigation, not reversal:** a web editor at `/contribute/edit/[slug]` that
authenticates via GitHub OAuth and opens a pull request on the user's behalf,
with live preview. Contributors get a CMS-like experience; the repository stays
the source of truth. Django admin handles *dynamic* content (jobs, moderation),
never chapters.

### 11.2 Pipeline

```
content/**.mdx
   │
   ├─► Velite ── validate frontmatter (Zod) ── fail build on violation
   │        └─► compute readingTime, headings, wordCount, checksum
   │
   ├─► remark/rehype ── GFM · Shiki highlight · autolink headings
   │                    Mermaid · custom directives · bidi isolation
   │
   ├─► Orama index build (en + ar, normalised)          → static search
   ├─► `sync_content` → Django `Content` rows           → dynamic features
   ├─► `embed_chunks` → pgvector (changed chunks only)  → AI mentor
   └─► Next.js SSG → Cloudflare Pages                   → the site
```

Every stage fails the build loudly. Content errors must not reach production
as a rendered "undefined".

### 11.3 Frontmatter schema

Validated by Zod at build. Missing or malformed frontmatter is a build failure,
not a warning. Fields per §6.2, plus:

```ts
{ contentId, title, titleAr?, description, descriptionAr?, domain, level,
  type, status, translationStatus, prerequisites[], objectives[],
  relatedChapters[], labs[], interviewQuestions[], platformRefs[],
  authors[], reviewers[], updated, canonicalSource?, ogImage? }
```

`contentId` MUST be stable forever. It joins locales, progress records,
bookmarks, embeddings and analytics. Renaming a file is safe; changing a
`contentId` is a data migration.

### 11.4 Code embedding — the anti-drift rule

Code shown in a chapter MUST be **transcluded from the real file**, never
pasted:

```mdx
<CodeFrom
  path="platform/infrastructure/terraform/modules/vpc/main.tf"
  lines="12-48"
  highlight="20,31-34"
  title="modules/vpc/main.tf" />
```

The build resolves the path, extracts the lines, and emits the code plus a
permalink pinned to the current commit. If the file or the line range no longer
exists, **the build fails.**

This one rule is what prevents the most common decay in technical
documentation: code samples that quietly stop matching reality. It is also the
mechanism that makes "the project is the curriculum" literally true rather than
aspirational.

### 11.5 Writing standards

**Structure.** One idea per paragraph; ≤4 sentences. A heading every ~300
words. Prefer a table to a bulleted list of pairs. Prefer a diagram to a
paragraph describing a topology.

**Voice.** Per §2.3. Additionally:
- Lead with the problem, not the definition.
- Every claim about behaviour is either demonstrated by a command or cited.
- Every recommendation states what it costs.
- Numbers are checkable ("12 Terraform modules"), never invented ("80% faster").
- Screenshots are real, redacted where necessary, and dated.

**Code.**
- Every command is copy-pasteable and was actually run.
- Show the expected output. A command without its output is half a lesson.
- Destructive commands carry a `<Callout type="danger">`.
- Pin versions in examples and state the version tested.
- Placeholders use a consistent, greppable form: `<YOUR_ACCOUNT_ID>`,
  `<YOUR_REGION>` — never `123456789012` or `example.com`, which get
  copy-pasted verbatim into production.

**Accessibility of content.**
- Every image has meaningful alt text; decorative images have `alt=""`.
- Every diagram has a text equivalent or an adjacent explanatory list.
- Headings are properly nested; no level is skipped.
- Link text is descriptive — never "click here" or "this link".

### 11.6 Content linting (CI-enforced)

A build fails on any of:
- Missing/invalid frontmatter · unknown `domain`/`level`/`type`
- Broken internal link or missing `contentId` reference
- Broken external link (weekly job, not per-build)
- Missing alt text
- Skipped heading level
- Banned words: "simply", "just", "obviously", "easy", "as you can see"
- Physical direction in copy: "left", "right" (outside code)
- A term used that is not in the glossary and not in the allowlist
- Arabic file present but `translationStatus: missing`, or vice versa
- ICU plural rules missing Arabic forms
- Code fence without a language
- `<CodeFrom>` pointing at a non-existent path or range
- A secret-shaped string (gitleaks)

### 11.7 Translation workflow

1. English chapter merges.
2. A GitHub issue is auto-filed: *"Translate: <title>"*, labelled
   `translation`, `good-first-contribution`.
3. A contributor claims it. An optional AI draft is available as a **starting
   point**, marked `translationStatus: machine-draft` — which renders a visible
   banner and excludes the page from the sitemap.
4. A second contributor with reputation ≥ 200 reviews it against the glossary.
5. On approval: `translationStatus: reviewed`, banner removed, indexed,
   reputation awarded to both.

Translation is credited as authorship on the page, not hidden. This is how the
Arabic corpus actually gets built — by making it a visible, rewarded,
low-barrier contribution path.

---

## Part 12 — Search, SEO, Accessibility, Performance

### 12.1 Search

Two engines, one interface.

**Static content search — Orama, built at deploy, runs in the browser.**
- Zero infrastructure, zero cost, works on the CDN, instant results.
- Chosen over Pagefind specifically because Orama ships an **Arabic tokenizer
  and stemmer**; Pagefind's multilingual support does not handle Arabic
  morphology adequately, and Arabic is not a nice-to-have here.
- Separate index per locale, loaded lazily on first search.
- Index size budget: **≤ 400KB gzipped per locale**, enforced in CI. Beyond
  that, split by section and load on demand.

**Dynamic search — PostgreSQL.**
- `tsvector` + GIN for posts, comments, jobs, users.
- `pg_trgm` for fuzzy handle/company matching.
- Ranked with `ts_rank_cd`, filtered by permissions.

**Arabic normalisation (both engines, index and query time)** — implemented
once, in one shared function, per §4.6:

```
strip diacritics (U+064B–U+0652, U+0670)
strip tatweel (U+0640)
أ إ آ ٱ → ا      ى → ي      ة → ه      ؤ → و      ئ → ي
strip leading clitics: ال، و، ب، ل، ك، ف  (with a stop-list)
normalise Arabic-Indic digits ٠-٩ → 0-9
```

Without this, most real Arabic queries return zero results, and the Arabic half
of the platform is dead on arrival. It MUST have unit tests with real query
examples.

**Result surfaces:** ⌘K palette (top 8, grouped) · `/search` full page with
facets (type, domain, level, language) · in-page `Ctrl+F` unaffected.
**Zero-result states MUST offer**: a spelling suggestion, a broader query, the
AI mentor, and a "request this content" link.

### 12.2 SEO

Organic search is the primary distribution channel, and **Arabic Cloud/DevOps
queries are close to uncontested** — that is the growth thesis in one sentence.

- Server-rendered HTML for every indexable page. No content behind JS.
- One `<h1>` per page; semantic landmarks.
- `hreflang` for `en`, `ar`, `x-default`; self-referencing canonicals.
- `sitemap.xml`, split by section, with `lastmod` from git; excludes
  `machine-draft` pages.
- **Structured data:** `TechArticle` (chapters), `HowTo` (labs), `Course`,
  `JobPosting` (this one is high-value — it puts listings in Google Jobs,
  free), `BreadcrumbList`, `FAQPage`, `Organization`, `Person` (profiles),
  `SoftwareSourceCode`.
- **OG images generated per page** from an SVG template: title, domain colour
  bar, level badge, the mark. Generated at build for static pages, at the edge
  for dynamic ones.
- URLs are stable. A moved page gets a 301 forever, and `contentId` makes that
  automatable.
- `robots.txt` allows crawling and names the AI-crawler policy explicitly
  (§13.6).
- RSS/Atom per domain and for the blog — still the best distribution channel
  for a technical audience.

### 12.3 Accessibility — WCAG 2.2 AA, non-negotiable

- Full keyboard operability, logical tab order, visible `:focus-visible` on
  everything, skip-to-content link.
- Semantic HTML first; ARIA only where semantics are insufficient.
- All interactive targets ≥ 44×44px on touch.
- Contrast per §3.2, verified programmatically over the token matrix.
- Live regions for async results, toasts, and chat messages.
- Reduced motion honoured, with **functional equivalents** — simulators keep a
  step control, they do not merely freeze.
- 200% zoom and 320px width both usable without horizontal scroll.
- Forms: label every input, associate errors with `aria-describedby`, never
  rely on placeholder as label, never validate on keystroke.
- Screen-reader smoke tests on the critical paths: sign up, read a chapter,
  complete a lab step, post, send a message, apply to a job — in **both**
  languages, since RTL screen-reader behaviour differs.
- `axe-core` in CI on representative pages; **zero serious/critical violations**
  is a merge gate.

### 12.4 Performance budget (enforced in CI)

| Metric | Budget | Where |
|---|---|---|
| LCP | **< 2.0s** | Landing & chapter, Moto G4 / Slow 4G |
| INP | **< 200ms** | All |
| CLS | **< 0.05** | All |
| TTFB | < 400ms | Static via CDN |
| JS on a chapter page | **< 120KB gzipped** | The hard one |
| JS on the landing page | < 180KB gzipped | |
| CSS | < 40KB gzipped | |
| Fonts | < 120KB total, subset, `font-display: swap`, preloaded | |
| Search index | < 400KB gzipped per locale | |
| Lighthouse (mobile) | ≥ 95 perf / 100 a11y / 100 best-practices / 100 SEO | |

**How the budget is actually met** — the brief demanded Lighthouse >95 while
also demanding React Flow, Mermaid, Framer Motion and animation everywhere.
Both are achievable only with these rules:

1. **React Flow renders to static SVG at build time** and hydrates only on
   interaction (`content-visibility` + dynamic import on intersect).
2. **Mermaid renders at build time**, not in the browser. The client never
   loads the Mermaid bundle.
3. **Framer Motion is dynamically imported** and used only in the simulators
   and the palette. Every other animation is CSS.
4. **Shiki highlights at build time.** No client-side highlighter.
5. **Video uses a facade.** No YouTube iframe until clicked.
6. Images: AVIF/WebP, explicit dimensions, lazy below the fold, blur
   placeholder, `fetchpriority="high"` on the LCP image only.
7. `content-visibility: auto` on long lists — Craft's `.cv-auto` pattern.
8. Route-level code splitting; nothing from `/community` loads on `/learn`.
9. **A `bundlesize` check fails the PR.** A budget that is not enforced is a
   wish.

### 12.5 Analytics & feedback

Privacy-first, cookieless, no consent banner.

- **Cloudflare Web Analytics** for traffic. **Sentry** for errors. Custom events
  posted to Django for product decisions.
- Events worth tracking: chapter completed · lab step failed (**which step** —
  this is the most valuable event in the product) · quiz item missed · search
  with zero results (**the content roadmap, delivered free**) · AI answer rated
  down · roadmap node abandoned · signup funnel drop-off.
- **On every chapter: "Was this helpful?" → yes / no / confusing**, with an
  optional comment, feeding a review queue.
- No third-party trackers, no ad pixels, no session recording, ever. State this
  publicly; it is a differentiator with this audience.

### 12.6 Mobile & PWA

Mobile is the majority of Egyptian and MENA traffic. It is not a scaled-down
desktop.

- Bottom tab bar on mobile: Learn · Build · Search · Community · Profile.
- Chapters: sticky progress bar, collapsible TOC, comfortable line length,
  code blocks horizontally scrollable **within their own container** — the page
  body never scrolls sideways.
- Roadmaps default to the list view on mobile (§6.3).
- **PWA:** installable, offline shell, and **offline reading of bookmarked
  chapters** — genuinely useful on intermittent mobile data, and cheap to build
  since the content is static. Craft's PWA component is a starting point.
- Web Push for notifications (opt-in, iOS 16.4+ supported).
- A native app is **out of scope**. If one is ever built, the Flutter
  `craft_mobile` structure and its `CraftPalette` theme extension are the model
  — the token layer in `packages/design-tokens` already exports to Dart for
  exactly that reason.
