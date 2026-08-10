---

## Part 4 — Theming, Bilingual & RTL System

Two axes, independent: **theme** (dark | light | system) and **locale**
(en | ar, with direction derived). Every combination must be correct — there
are four, and `ar` + `light` is the one that always ships broken because nobody
looks at it. It MUST be in the visual test matrix.

### 4.1 Theme mechanism

State lives on `<html data-theme="dark|light">`. Nothing else. React never
re-renders on theme change; CSS variables do the work.

**Flash prevention is mandatory.** A blocking inline script in `<head>` sets the
attribute before first paint, exactly as Craft does:

```html
<script>
(function () {
  try {
    var stored = localStorage.getItem('egykode_theme');
    var t = stored || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-theme-pref', stored || 'system');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
</script>
```

Requirements:
- `color-scheme: dark|light` MUST be set per theme so native scrollbars, form
  controls and `<select>` popups match. Craft's `globals.css` gets this right;
  reproduce it.
- `<meta name="theme-color">` MUST update with the theme (mobile browser chrome).
- The toggle cycles **system → light → dark → system** and announces state via
  `aria-pressed` + a visually hidden live region.
- When preference is `system`, a `prefers-color-scheme` change MUST apply live.
- Theme preference for signed-in users MUST sync to their profile so it follows
  them across devices; anonymous users keep `localStorage` only.

### 4.2 Locale routing

Path-prefixed, both locales explicit, no cookie-driven URL ambiguity:

```
/en/learn/kubernetes/architecture
/ar/learn/kubernetes/architecture
/            → 307 to /en or /ar via Accept-Language, then remembered
```

- Library: **next-intl** (App Router, server components, message extraction).
- `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` — set on the
  server, never patched on the client.
- Every page emits `<link rel="alternate" hreflang="en|ar|x-default">`.
- `x-default` points at `/en`.
- **Slugs stay Latin in both locales.** `/ar/learn/kubernetes/architecture`, not
  `/ar/تعلم/كوبرنيتس`. Rationale: shareability, terminal-friendliness, no
  percent-encoding in copied links, and one canonical content ID per page.
  Arabic titles are metadata, not URLs.
- Locale preference persists in a cookie (`egykode_locale`) **and** on the user
  profile when signed in.

### 4.3 The RTL contract

RTL is not `direction: rtl`. It is a set of rules that MUST be enforced by
lint, not by discipline.

**Rule 1 — Logical properties only.** ESLint MUST fail the build on physical
direction utilities in components.

| Forbidden | Required |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |
| `translate-x-*` (in layout) | logical variant or `rtl:` prefix |

Tailwind's logical utilities are enabled by default in v3.3+ and are the only
permitted form.

**Rule 2 — Things that MUST NOT mirror.** Getting this wrong is the tell of a
machine-translated site:

- **Code blocks, terminals, file paths, YAML, log output.** These are always
  `dir="ltr"` `text-align: start` inside an `ltr` container, even on an Arabic
  page. A mirrored YAML block is unreadable and wrong.
- **Inline code and identifiers** (`kubectl`, `--namespace`, `v1.29.4`) — wrap
  in a bidi-isolating span (`unicode-bidi: isolate`) so surrounding Arabic does
  not scramble them.
- **Version numbers, IP addresses, CIDR blocks, ports, semver.**
- **Media player controls** (play always points in the play direction).
- **Charts whose x-axis is time** (§3.7).
- **Logos and brand marks.**
- **Progress bars for a linear process that maps to a code/terminal flow** —
  these MAY mirror, but the pipeline simulator MUST mirror, since it represents
  reading order, not code.

**Rule 3 — Numerals.** Use **Western Arabic numerals (0–9)** everywhere,
including Arabic pages. Eastern Arabic numerals (٠–٩) are correct in prose but
wrong next to CLI output, and mixing them is worse than either. `Intl.NumberFormat('ar-EG-u-nu-latn')`.

**Rule 4 — Dates and relative time.** `Intl.DateTimeFormat` and
`Intl.RelativeTimeFormat` per locale. No hand-written month names. Gregorian
calendar; Hijri MAY appear as a secondary annotation in the future, never
alone.

**Rule 5 — Bidi text.** Any user-generated string rendered inside a mixed
context MUST be wrapped in `<bdi>`. Usernames, job titles and post excerpts are
the common failure points.

**Rule 6 — Physical directions in copy.** Never write "click the button on the
left". Write "in the sidebar". Enforced by a content lint rule.

### 4.4 Translation architecture

Two distinct systems, deliberately not unified:

**(a) UI strings** — `next-intl` JSON message catalogues, namespaced by feature:

```
messages/
  en/{common,nav,auth,learn,labs,roadmap,feed,chat,jobs,profile,errors}.json
  ar/{...same...}.json
```

- Keys are semantic (`nav.learn.title`), never the English string. Craft's
  English-keyed dictionary works at its scale but breaks down past ~1000 keys
  and makes copy edits into translation invalidations.
- Every key MUST exist in both catalogues. CI fails on a missing or empty `ar`
  value — no silent English fallback in production.
- Pluralisation uses ICU MessageFormat. **Arabic has six plural forms** (`zero`,
  `one`, `two`, `few`, `many`, `other`); a two-form English-shaped string is a
  bug. Enforced by the ICU linter.
- Interpolation for gendered strings uses ICU `select`, and the default for
  unknown gender is the neutral form.

**(b) Content (chapters, labs, courses, questions)** — MDX file pairs, not
message catalogues:

```
content/learn/kubernetes/architecture.en.mdx
content/learn/kubernetes/architecture.ar.mdx
```

- Both files share a `contentId` in frontmatter — that is the join key.
- Arabic content is **authored or reviewed by a human**, never published from
  raw machine translation. A machine draft is permitted as a starting point and
  MUST be marked `translationStatus: machine-draft` in frontmatter, which
  renders a visible banner and excludes the page from `sitemap.xml` until
  reviewed.
- Missing `ar` content falls back to `en` with an explicit "not yet translated"
  notice and a "help translate" link — never a silent language switch.

### 4.5 Arabic typography specifics

```css
[lang="ar"] {
  font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif;
  letter-spacing: normal !important;  /* never track Arabic */
}
[lang="ar"] .prose { font-size: 1.06em; line-height: 1.85; }
[lang="ar"] .prose :is(h1,h2,h3,h4) { line-height: 1.45; font-weight: 700; }
/* Latin fragments inside Arabic prose keep their own face and direction */
[lang="ar"] :is(code, kbd, samp, .latin) {
  font-family: "JetBrains Mono", monospace;
  direction: ltr;
  unicode-bidi: isolate;
}
```

- Arabic headings need **more** line-height than Latin at the same size because
  of ascenders/descenders on stacked diacritics.
- Do not use `font-weight: 300` or lighter for Arabic; thin Arabic loses stroke
  contrast and becomes illegible on dark.
- Justified text (`text-align: justify`) is traditional in Arabic but produces
  rivers without kashida support. Use `text-align: start`.

### 4.6 Search and Arabic

Arabic search is the hardest technical problem in this document, and getting it
wrong makes the Arabic half of the platform unusable.

Requirements the search layer MUST satisfy:

1. **Diacritic-insensitive** — `كتابة` matches `كِتابة`.
2. **Alef/Ya/Ta-marbuta normalisation** — `أ إ آ ا` fold together; `ى` ↔ `ي`;
   `ة` ↔ `ه`. Without this, most queries return nothing.
3. **Tatweel (ـــ) stripping.**
4. **Prefix stripping for clitics** — `ال`, `و`, `ب`, `ل`, `ك` as leading
   particles.
5. **Mixed-script queries work** — `كيف اعمل kubectl apply` must hit.
6. **Latin technical terms in Arabic documents are indexed as Latin.**

PostgreSQL's built-in `arabic` text-search configuration handles stemming but
**not** the normalisation in (1)–(3). The implementation MUST add an
`unaccent`-style normalisation function applied at both index and query time.
See §12.1 for the chosen implementation.

### 4.7 The four-state test matrix

Every visual regression test and every manual review MUST cover:

| | Dark | Light |
|---|---|---|
| **en** | baseline | check contrast of `--clr-primary` on white |
| **ar** | check bidi in code blocks | **the one that ships broken — check first** |

Plus: 320px viewport, 200% browser zoom, and `prefers-reduced-motion`.
