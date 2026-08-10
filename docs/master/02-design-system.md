---

## Part 3 — Design System

The design system is a **token layer in CSS custom properties**, consumed by
Tailwind through `var()` references. This is the mechanism Craft uses and it is
correct: it means theme switching is a single attribute flip with no React
re-render, no flash, and no duplicated class lists.

### 3.1 Core principles

1. **Dark is the default and the design target.** Light is a first-class
   alternative, not a fallback — but every screen is designed dark first,
   because that is where 80%+ of this audience lives.
2. **Depth comes from surface steps, not shadows.** On dark, a hard shadow
   makes an edge look dirty. Cards read as cards because the surface beneath
   them is a measurable step lighter.
3. **Borders are felt, not seen.** On dark, a border is a hairline of light
   (`rgba(255,255,255,0.07)`), never a grey line drawn on top.
4. **Colour carries meaning or it is absent.** Brand teal means "interactive or
   ours". Semantic colours mean status. Nothing is coloured decoratively.
5. **Never more than one accent per view.** A page with three competing
   emphases has none.
6. **Type does the work that colour would otherwise do.** Hierarchy comes from
   size, weight and spacing first.
7. **Motion clarifies causality.** If an animation does not explain where
   something came from or where it went, remove it.

### 3.2 Colour system

The palette is **derived from the existing logo**, not invented. Sampling
`logo.png` and `name_logo.png` gives two brand constants that everything else
is built around:

| Sampled | Hex | Role |
|---|---|---|
| Monogram green | **`#1FE881`** (H 150° S 87% L 51%) | The brand. Immutable. |
| Wordmark charcoal | **`#1C2427`** (H 194° S 18% L 13%) | The ground the brand sits on |

That charcoal is the reason the dark theme works: the wordmark colour *is* a
surface step. Dark mode is not a reinterpretation of the brand, it is the brand
at full strength.

Sand gold is retained from the Craft family as the accent — green + gold reads
as Egyptian without resorting to pharaonic cliché, and it gives achievements
and highlights a channel that is not the primary.

#### Dark theme (default)

```css
:root,
[data-theme="dark"] {
  /* ── Brand ───────────────────────────────────────────────────────────── */
  /* --clr-brand is the logo green, exactly. It is used for the mark and for
     nothing else, so the logo never drifts from the UI or vice versa. */
  --clr-brand:          #1fe881;

  /* Interactive green: the logo value at full saturation vibrates against
     charcoal at text sizes, so the UI token pulls saturation back one step.
     Material and Apple both do this in their dark themes. */
  --clr-primary:        #22de7e;
  --clr-primary-light:  #3de895;   /* hover   */
  --clr-primary-pale:   #9ff3c5;   /* text on primary-tinted fills */
  --clr-primary-dark:   #17b665;   /* pressed */
  --clr-primary-glow:   hsla(150, 80%, 50%, 0.18);

  --clr-accent:         #d9b45b;   /* sand gold — achievements, highlights  */
  --clr-accent-light:   #efe2bf;

  /* ── Surfaces — five real steps, sampled from the dark-mode logo art ──
     The official dark artwork runs #0C1013 at the edges to #14171C at the
     centre, and the wordmark charcoal is #1C2427. Those three values are the
     first three steps, so the page, the panel and the card are literally the
     brand's own greys rather than a designer's approximation. */
  --clr-bg:             #0f1316;   /* artwork edge      */
  --clr-bg-secondary:   #14171c;   /* artwork centre    */
  --clr-surface:        #1c2124;   /* ≈ wordmark #1C2427 */
  --clr-surface-hover:  #232a2d;
  --clr-surface-active: #2c3438;
  --clr-surface-border: rgba(255, 255, 255, 0.07);

  /* ── Text — pure white on charcoal is glare; pull the ramp back ──────── */
  --clr-text:           #f0f3f2;
  --clr-text-secondary: #b3bdb9;
  --clr-text-muted:     #869094;
  --clr-text-inverse:   #101315;

  /* ── Semantic — brightened for a dark field ─────────────────────────── */
  /* Success deliberately shares the brand hue (see the note below). */
  --clr-success:        #22de7e;  --clr-success-bg: rgba(34, 222, 126, 0.13);
  --clr-warning:        #ffc857;  --clr-warning-bg: rgba(255, 200, 87, 0.13);
  --clr-danger:         #f56c6c;  --clr-danger-bg:  rgba(245, 108, 108, 0.13);
  --clr-info:           #63a9ff;  --clr-info-bg:    rgba(99, 169, 255, 0.13);

  /* ── Elevation — soft and wide; depth comes from the surface beneath ─── */
  --shadow-sm:   0 2px 8px   rgba(0,0,0,.22);
  --shadow-md:   0 6px 20px  rgba(0,0,0,.28);
  --shadow-lg:   0 8px 30px  rgba(0,0,0,.32);
  --shadow-xl:   0 18px 48px rgba(0,0,0,.38);
  --shadow-glow: 0 0 30px var(--clr-primary-glow);
}
```

#### Light theme

**The critical light-mode rule:** `#1FE881` on white measures **1.6:1**. It is
unusable as text, as a border, or as an icon on a light background. This is the
single most common way a vivid-green brand ships broken, and it MUST NOT happen
here. In light mode the primary darkens to hold **4.5:1**, while the logo mark
keeps its true green because it sits on a light ground as a *shape*, where the
3:1 non-text threshold applies.

```css
[data-theme="light"] {
  --clr-brand:          #1fe881;   /* mark only, unchanged */

  /* Same hue (150°), lightness dropped until it passes AA on white.
     #0C8A50 measures 4.62:1 on #FFFFFF and 4.31:1 on the page bg. */
  --clr-primary:        #0c8a50;
  --clr-primary-light:  #0a7343;   /* hover — darker, not lighter, on light */
  --clr-primary-pale:   #d6f7e5;   /* tinted fills */
  --clr-primary-dark:   #085c36;   /* pressed */
  --clr-primary-glow:   hsla(150, 84%, 30%, 0.12);

  --clr-accent:         hsl(42, 80%, 38%);
  --clr-accent-light:   hsl(42, 75%, 52%);

  --clr-bg:             hsl(200, 20%, 97%);
  --clr-bg-secondary:   hsl(0, 0%, 100%);
  --clr-surface:        hsl(0, 0%, 100%);
  --clr-surface-hover:  hsl(200, 16%, 97%);
  --clr-surface-active: hsl(200, 14%, 94%);
  --clr-surface-border: hsl(200, 16%, 88%);

  --clr-text:           #1c2427;   /* the wordmark charcoal, exactly */
  --clr-text-secondary: hsl(200, 12%, 36%);
  --clr-text-muted:     hsl(200, 8%, 50%);
  --clr-text-inverse:   hsl(0, 0%, 100%);

  --clr-success:        #0c8a50;              --clr-success-bg: hsla(150,84%,32%,.12);
  --clr-warning:        hsl(40, 95%, 36%);    --clr-warning-bg: hsla(40,95%,40%,.12);
  --clr-danger:         hsl(0, 72%, 43%);     --clr-danger-bg:  hsla(0,72%,48%,.10);
  --clr-info:           hsl(212, 80%, 42%);   --clr-info-bg:    hsla(212,80%,48%,.10);

  --shadow-sm: 0 1px 2px rgba(0,0,0,.05), 0 2px 4px rgba(0,0,0,.04);
  --shadow-md: 0 4px 6px rgba(0,0,0,.05), 0 10px 15px rgba(0,0,0,.04);
  --shadow-lg: 0 10px 20px rgba(0,0,0,.06), 0 20px 25px rgba(0,0,0,.04);
  --shadow-xl: 0 25px 50px rgba(0,0,0,.10), 0 15px 30px rgba(0,0,0,.06);
  --shadow-glow: 0 0 30px var(--clr-primary-glow);
}
```

#### Why success shares the brand hue

Because the brand *is* green, a separate "success green" would sit within 10°
of it and read as a mistake rather than a distinction. EgyKode therefore uses
one green, and disambiguates by **channel rather than hue**:

- **Primary** green appears only on: the mark, primary buttons, active nav,
  links, focus rings, and progress fills.
- **Success** green appears only with a **check icon and a text label**, never
  as a bare colour.
- Consequently, **a green fill with no icon is always an action**, and **a green
  fill with a check is always a state**. That rule is unambiguous to a user and
  survives colour-blindness, which a two-green system would not.

#### Domain colours

Technology families get a stable hue so a roadmap node, an architecture diagram
and a chapter badge always agree. These are **identifiers, not decoration**, and
MUST NOT be used for anything else. **Green is absent from this scale** — it is
reserved for brand and state, so a green node in a diagram always means "you
are here / this is done", never "this is Jenkins".

| Domain | Token | Dark | Light |
|---|---|---|---|
| Linux & Networking | `--dm-foundation` | `#a78bfa` | `#6d43d9` |
| Containers (Docker, containerd) | `--dm-container` | `#63a9ff` | `#1160c4` |
| Kubernetes & Helm | `--dm-orchestration` | `#6c8cff` | `#3348cc` |
| IaC (Terraform, Ansible) | `--dm-iac` | `#b388ff` | `#5b32c9` |
| Cloud (AWS) | `--dm-cloud` | `#ff9f43` | `#c26a00` |
| CI/CD (Jenkins, Actions) | `--dm-cicd` | `#38bdf8` | `#0369a1` |
| GitOps (ArgoCD) | `--dm-gitops` | `#ff7ab6` | `#c0417d` |
| Observability | `--dm-observability` | `#ffc857` | `#a37200` |
| Security | `--dm-security` | `#f56c6c` | `#c22b2b` |
| SRE & Platform | `--dm-platform` | `#2dd4bf` | `#0f766e` |

Rule: **maximum four domain colours visible in one viewport.** Beyond that,
group and use a neutral.

#### Gradients

The mark carries a subtle vertical gradient (`#2FDA7E → #7FEBB7` in the
sampled artwork). One gradient is permitted in the product, defined once:

```css
--grad-brand: linear-gradient(135deg, #1fe881 0%, #12b981 100%);
```

Permitted on: the hero headline (as `background-clip: text`, once per page),
the primary CTA on the landing page only, and achievement/badge surfaces.
**Forbidden** on: body text, cards, nav, buttons in the app shell, borders, and
anything that repeats. A gradient that appears more than twice on a page stops
being an accent and becomes a texture.

#### Accessibility contract

- Body text: **≥ 4.5:1** against its own surface, both themes.
- Large text (≥ 24px, or ≥ 19px bold): **≥ 3:1**.
- Interactive borders, focus rings, icon-only buttons: **≥ 3:1**.
- **Colour is never the only channel.** Status carries an icon and a label.
  Pipeline stages carry a shape. Diagram edges carry a stroke pattern.
- Verified by an automated contrast test over the token matrix in CI (§13.2).

### 3.3 Typography

Four faces, each with one job. All self-hosted via `next/font` — zero external
requests, no CLS, no Google Fonts privacy exposure.

| Role | Latin | Arabic | Weights |
|---|---|---|---|
| Display / headings | **Space Grotesk** | **IBM Plex Sans Arabic** | 500, 700 |
| UI / body | **Inter** (`cv11`, `ss01`) | **IBM Plex Sans Arabic** | 400, 500, 600 |
| Code / terminal | **JetBrains Mono** | *(always Latin)* | 400, 500, 700 |
| Numerals in data | **Inter** tabular (`tnum`) | Inter tabular | 400, 600 |

**IBM Plex Sans Arabic** is chosen over Cairo and Tajawal because it was
designed as a companion to a Latin technical face, so mixed-script lines — which
are constant in Arabic DevOps writing — sit on a shared baseline with matching
weight and x-height. Cairo is warmer but breaks down at small UI sizes; Noto
Kufi is display-only.

#### Type scale

Fluid via `clamp()`, capped so long-form never exceeds a comfortable measure.

| Token | Size (min → max) | Line height | Tracking | Use |
|---|---|---|---|---|
| `text-display` | 2.75 → 4.5rem | 1.05 | −0.02em | Hero only, once per page |
| `text-h1` | 2 → 3rem | 1.12 | −0.02em | Page title |
| `text-h2` | 1.5 → 2rem | 1.2 | −0.01em | Section |
| `text-h3` | 1.25 → 1.5rem | 1.3 | −0.01em | Subsection |
| `text-h4` | 1.125rem | 1.4 | 0 | Card title |
| `text-body-lg` | 1.125rem | 1.7 | 0 | Chapter prose |
| `text-body` | 1rem | 1.65 | 0 | Default |
| `text-sm` | 0.875rem | 1.55 | 0 | Meta, captions |
| `text-xs` | 0.75rem | 1.45 | 0.01em | Badges, labels |
| `text-code` | 0.875rem | 1.6 | 0 | Inline & block code |

**Measure:** prose columns are `max-width: 72ch` (Latin) / `68ch` (Arabic —
Arabic sets wider per character). Never full-bleed body text.

**Arabic adjustments (mandatory):** Arabic renders optically smaller at the
same px. Apply `font-size: 1.06em` and `line-height: 1.85` inside `[lang="ar"]`
prose, and **never** apply `letter-spacing` to Arabic — it breaks the cursive
joins.

### 3.4 Spacing, radius, elevation

**Spacing** is a 4px base scale: `0, 1(4), 2(8), 3(12), 4(16), 5(20), 6(24),
8(32), 10(40), 12(48), 16(64), 20(80), 24(96)`. Nothing off-scale ships.

**Radius:** `sm 6px` (badges, inline code) · `md 8px` (buttons, inputs) ·
`lg 12px` (cards) · `xl 16px` (panels, modals) · `2xl 20px` (hero surfaces) ·
`full` (avatars, pills).

**Elevation ladder** — five levels, never skipped:
`0` page · `1` card (`--shadow-sm` + border) · `2` hover / dropdown
(`--shadow-md`) · `3` popover / command palette (`--shadow-lg`) · `4` modal
(`--shadow-xl` + scrim `rgba(0,0,0,.6)`).

**Layout container:** `max-width: 1440px`, gutters `16px` mobile / `24px`
tablet / `32px` desktop. Docs layout is a three-column grid at ≥1280px:
`280px sidebar | 1fr content | 240px on-this-page`.

### 3.5 Motion

**Durations:** micro (hover, toggle) `120ms` · standard (dropdown, tab, card)
`200ms` · large (modal, drawer, route) `280ms` · illustrative (pipeline
simulator, diagram reveal) `400–800ms per stage`.

**Easings:**
`--ease-out: cubic-bezier(.22,1,.36,1)` — things entering
`--ease-in-out: cubic-bezier(.65,0,.35,1)` — things moving
`--ease-spring: cubic-bezier(.34,1.56,.64,1)` — success/achievement only

**Rules.**
- Animate only `transform` and `opacity`. Animating `width`, `height`, `top` or
  `box-shadow` is a defect.
- Entrances translate ≤ 8px. Anything larger reads as jitter.
- **Never animate on scroll into view for body content.** Reveal-on-scroll on
  prose actively harms reading and destroys `Ctrl+F`.
- A loading state that resolves in <200ms MUST NOT show a spinner.
- **`prefers-reduced-motion: reduce` disables all non-essential motion** — and
  the simulators MUST remain fully usable via a "step" control, not merely
  frozen.

**Signature motions** (the three moments that should feel designed):
1. **Command palette** — scrim fades 120ms, panel scales 0.96→1 with `--ease-out` over 200ms.
2. **Pipeline simulator stage advance** — the completed stage's border fills along its path, the next stage lifts 4px and its icon springs once.
3. **Lab step verified** — checkmark draws (`stroke-dashoffset`) over 260ms, row background flashes `--clr-success-bg` and settles.

### 3.6 Component inventory

Built on **shadcn/ui** primitives (copied into the repo, not a dependency) and
re-tokenised. This is the complete v1 inventory; anything not listed needs a
justification in the PR.

**Primitives** — Button (primary/secondary/ghost/danger, 3 sizes, loading,
icon-only) · Input · Textarea · Select · Combobox · Checkbox · Radio · Switch ·
Slider · Badge · Chip/Tag · Avatar (+ group, + presence dot) · Tooltip ·
Popover · Dropdown · Dialog · Sheet/Drawer · Tabs · Accordion · Breadcrumb ·
Pagination · Progress (linear, ring) · Skeleton · Toast · Alert/Callout ·
Separator · ScrollArea · Kbd · EmptyState · Spinner.

**Content components (MDX-exposed)** — `<Callout type>` (note/tip/warning/
danger/production/cost/security) · `<CodeBlock>` (title, line numbers,
highlight ranges, diff, copy, filename, language badge) · `<CodeTabs>` ·
`<Terminal>` (§6.5) · `<Mermaid>` · `<Diagram>` (inline SVG wrapper, theme-aware)
· `<Steps>` · `<Quiz>` · `<Lab>` · `<InterviewQ>` · `<TradeoffTable>` ·
`<ADRCard>` · `<CommandRef>` · `<FileTree>` · `<Timeline>` · `<Comparison>` ·
`<VideoEmbed>` (lite-youtube facade) · `<ChapterMeta>` · `<RelatedChapters>` ·
`<GlossaryTerm>`.

**Application components** — TopBar · SideNav · MobileNav · CommandPalette
(⌘K) · ThemeToggle · LangToggle · SearchDialog · TOC · ProgressRing ·
RoadmapCanvas (React Flow) · ArchitectureExplorer · PipelineSimulator ·
GitOpsSimulator · AWSExplorer · LabRunner · PostComposer · PostCard ·
CommentThread · ChatThread · ChatList · JobCard · JobFilters · CourseCard ·
LessonPlayer · ProfileHeader · ContributionGraph · BadgeShelf · Leaderboard ·
NotificationCenter · DataTable · Chart (§3.7).

**Every component MUST:** support both themes without conditional JS; work in
RTL using logical properties; expose a visible `:focus-visible` ring; be
keyboard-operable; carry an accessible name; and render server-side unless it
genuinely requires interactivity.

### 3.7 Charts & data visualisation

Charts appear in dashboards, progress views and the analytics surfaces.

- Library: **Recharts** (already proven in Craft's `components/ui/chart.tsx`).
- Colours come from a **categorical ramp derived from the domain palette**, never
  from Recharts defaults. Maximum 6 series; beyond that, group into "Other".
- Every chart MUST work in both themes — axis, grid and tooltip colours read
  from CSS variables at render, not hardcoded.
- Grid lines: horizontal only, `--clr-surface-border`, no vertical rules.
- Tooltips are the same surface token as popovers, with tabular numerals.
- **RTL:** axes and reading order mirror; a time axis in Arabic still runs
  left→right when it represents time, with the label direction flipped. State
  this explicitly in the component, because the naive mirror is wrong.
- Empty state is a labelled component, never an empty axis box.

### 3.8 Iconography

**Lucide** exclusively, at `1.5px` stroke, `20px` default (`16px` inline,
`24px` nav). Technology logos (Kubernetes, Terraform, AWS…) come from
**Simple Icons** as SVG, monochrome, tinted with the domain colour — never the
vendor's full-colour logo in UI chrome, which produces the rainbow effect the
brief rightly forbids. Full-colour vendor marks are permitted **only** in the
architecture explorer and technology grid, where recognition is the point.

**RTL:** directional icons (arrows, chevrons, `reply`, `undo`) MUST flip via
`[dir="rtl"] .icon-directional { transform: scaleX(-1) }`. Non-directional
icons MUST NOT flip. Clocks, media controls and logos never flip.
