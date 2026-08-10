---

# Part 2b — Motion & Interaction System

Motion on EgyKode exists to communicate state, hierarchy and progress. It is
not decoration, and the platform should read as a professional engineering tool
rather than a SaaS landing page.

The guiding sentence: **motion should describe the learning process — learn,
practise, build, deploy — not perform for the reader.**

## §2b.0 The first rule

**Motion must never compete with learning content.** Content is immediately
readable and usable without any animation having run — before hydration, on a
browser that supports none of this, and for a reader who has asked for reduced
motion.

Motion earns its place only by communicating one of four things:

1. **Hierarchy** — what belongs together, and what is a new section
2. **State** — this is now complete, selected, loading, or failing
3. **Spatial relationship** — where this came from, or where it went
4. **Feedback** — the system received your input

Anything that communicates none of them is decoration, and decoration is what
makes a learning platform feel like a marketing site. This is the same
principle as "animate sections, not text" (§2b.4), stated generally: the
reader came for the content, and motion is only ever in service of reaching
it.

## §2b.1 The three levels

Every animation belongs to exactly one level. This is what stops the interface
becoming chaotic one component at a time.

| Level | Token | Duration | Used for |
|---|---|---|---|
| **1 — Micro** | `--dur-micro` | 120ms | Hover, focus, active, icons, checkboxes |
| **2 — Interface** | `--dur-base` / `--dur-large` | 200 / 280ms | Dialogs, command palette, disclosure, section reveal |
| **3 — Learning** | `--dur-learning` | 520ms | Roadmap progress, completion, diagrams, lab state |

Nothing in normal UI exceeds roughly one second. Level 3 is deliberately the
only band that is allowed to be noticed.

## §2b.2 Tokens

Defined once in `packages/design-tokens/tokens.json` and consumed as CSS custom
properties. Components never hardcode a duration or an easing curve.

```
--dur-micro      120ms     --ease-out       cubic-bezier(.22,1,.36,1)
--dur-base       200ms     --ease-in-out    cubic-bezier(.65,0,.35,1)
--dur-large      280ms     --ease-spring    cubic-bezier(.34,1.56,.64,1)
--dur-learning   520ms
--reveal-shift   12px      --stagger-step   60ms
```

`--ease-out` is the default: motion that decelerates into place reads as
responsive. `--ease-spring` overshoots slightly and is reserved for completion
feedback, where a small amount of personality is earned.

## §2b.3 Technology policy

**CSS and native browser APIs first.** A JavaScript animation library is
warranted only when there is a concrete interaction that CSS and native APIs
cannot express cleanly — not for reveals, hovers, dialogs or progress. Adding
one earlier means shipping JavaScript payload for motion that does not need it,
on a site whose primary job is delivering text quickly.

| Use | For |
|---|---|
| **CSS transitions** | Hover, focus, active, colour, border, simple transforms |
| **CSS animations + scroll-driven timelines** | Section reveal, dialogs, completion |
| **Native elements** (`<details>`) | Disclosure — works before hydration, ships no JS |
| **SVG** | Architecture diagrams, roadmap connections, animated paths |
| **A JS animation library** | Only when the above genuinely cannot express the interaction |
| **Canvas / WebGL** | Only for genuinely interactive visualisation, never decoration |

**Animate `transform` and `opacity` by default. Any other property requires an
explicit justification.** Those two are composited off the main thread;
`width`, `height`, `top` and `left` force layout every frame, which is what
actually makes a page feel slow — the roadmap progress bar uses `scaleX`, not
`width`, for exactly this reason.

The rule is a default, not a prohibition. Legitimate exceptions exist and
should be stated where they are used:

| Property | When it is justified |
|---|---|
| `background-color`, `border-color`, `color` | State and theme feedback — hover, focus, selection. Paint-only, and no transform can express "this became active". |
| `box-shadow` | Elevation on hover, alongside a transform |
| `width` / `height` | Only where the element genuinely must reflow its neighbours, and the animation is short and infrequent |

The test is whether the property is doing work that `transform`/`opacity`
cannot express, not whether it happens to look acceptable.

## §2b.4 The patterns

**Page entrance.** A short opacity fade on the main region (`.animate-page`).
The hero is never animated: it is above the fold, and delaying the first thing
a reader came for to animate it is a net loss.

**Section reveal** (`.reveal`). Sections fade and rise `--reveal-shift` as they
enter the viewport, driven by `animation-timeline: view()` — no scroll
listener, no IntersectionObserver, no JavaScript at all. Guarded by
`@supports`, so where it is unsupported the content is simply visible, which is
the correct fallback for a reading site.

**Animate sections, not text.** A section reveals as one unit. Paragraphs,
headings and list items never animate individually.

**Stagger** (`.stagger`, with `--i` per child). Cards in a row appear in
sequence, `--stagger-step` apart, capped at 300ms total so a long list never
leaves its last item waiting.

**Card hover.** `translateY(-2px)`, a slightly stronger shadow, and a more
visible border, at Level 1. Cards lift 2–4px — never 10–20px — and press
slightly on `:active` so a click feels acknowledged.

**Disclosure.** Native `<details>`; the chevron rotates 180°. No state, no
hydration requirement.

**Command palette.** The scrim fades at Level 1; the dialog fades and rises
6px with a 0.98 → 1 scale at Level 2. Enter only — an exit animation requires
keeping a dismissed element in the tree, and a palette that lingers is worse
than one that closes instantly.

**Roadmap progress.** `scaleX` on the fill at Level 3, with `transform-origin`
flipped under RTL.

**Completion.** A check scales 0.6 → 1.08 → 1 on `--ease-spring`. Short, flat,
and professional: no confetti on a learning platform.

## §2b.5 Reduced motion

`prefers-reduced-motion: reduce` is a requirement, not a nicety.

Two layers:

1. **Ask explicitly.** The reveal is wrapped in
   `@media (prefers-reduced-motion: no-preference)` rather than relying on
   being flattened globally. An animation with `both` fill that is merely
   shortened can leave an element stuck at its `from` state — for a reveal,
   that means *invisible content*.
2. **A global safety net** flattens durations for anything added later that
   forgets, and `.reveal` / `.stagger` children are additionally forced to
   full opacity and no transform.

## §2b.6 Never animate

- Constant floating or looping objects
- Parallax beyond the incidental
- Bouncing cards, spinning tool logos
- Animated gradients as background texture
- Automatic carousels
- Text flying in from any direction
- Anything longer than ~1s in normal UI
- Anything driven by a per-scroll-event handler

## §2b.7 Build order

1. Page and section reveal · 2. Card hover · 3. Roadmap progress ·
4. Command palette · 5. Completion feedback — **all implemented.**

Then, when the content supports them: animated statistics, the deployment
pipeline diagram, lab state transitions, and the architecture diagram. The
interactive topic graph and simulations come last, and are the first
candidates that might justify a dedicated animation library — the decision is
made then, against a real interaction, not in advance.
