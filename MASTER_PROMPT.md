# EgyKode — Master Specification

> **Single source of truth.** This document is written to be handed, whole or in
> parts, to any coding or design agent (Claude Code, Cursor, Codex, Gemini CLI,
> Copilot, Windsurf) or to a human contributor. Every section is normative:
> `MUST`, `SHOULD`, `MAY` carry their RFC 2119 meanings.

**Version** 1.0 · **Owner** Waleed Darwesh · **Status** Draft for build
**Repository** `Waleeddarwesh/EgyKode` · **License** MIT (code) / CC BY-SA 4.0 (content)

> **The promise:** Every roadmap ends with a deployable production project.
> **الوعد:** كل مسار ينتهي بمشروع production حقيقي قابل للنشر.

---

## Contents

| Part | Section |
|---|---|
| **0** | [Review of the prior prompt](#part-0--review-of-the-prior-prompt) — what to fix and why |
| **1** | [Vision & Product Strategy](#part-1--vision--product-strategy) |
| **2** | [Brand Identity](#part-2--brand-identity) — name, voice, the EK mark, usage rules |
| **3** | [Design System](#part-3--design-system) — colour, type, space, motion, components |
| **4** | [Theming, Bilingual & RTL](#part-4--theming-bilingual--rtl-system) |
| **5** | [Information Architecture](#part-5--information-architecture) — routes, nav, palette |
| **6** | [Learning Experience](#part-6--learning-experience) — the content hierarchy, roadmaps, labs, simulators |
| **7** | [Community & Social Layer](#part-7--community--social-layer) — feed, chat, jobs, profiles |
| **8** | [AI Mentor](#part-8--ai-mentor) — grounding, quotas, cost |
| **9** | [Platform Architecture](#part-9--platform-architecture) — Next.js + Django, data model, APIs |
| **10** | [Infrastructure, Cost & DevOps](#part-10--infrastructure-cost--devops) — the real run-rate |
| **11** | [Content System](#part-11--content-system) — MDX pipeline, standards, translation |
| **12** | [Search, SEO, Accessibility, Performance](#part-12--search-seo-accessibility--performance) |
| **13** | [Engineering, Security, Safety & Legal](#part-13--engineering-standards-security-safety--legal) |
| **14** | [Open Source, Sustainability & Delivery](#part-14--open-source-sustainability--delivery) — the phases |
| **15** | [Appendices](#part-15--appendices) — agent instructions, DoD, env, decision records |

**If you read only four sections:** Part 0 (what was wrong with the previous
plan), **§6.0 (the content hierarchy and the core promise)**, §6.1 (the content
that already exists and must be migrated rather than rewritten), and §14.3 (the
delivery phases).

---

## Part 0 — Review of the prior prompt

Before the specification proper, an honest assessment of the ChatGPT-authored
prompt this document supersedes. The prompt is good at *ambition* and bad at
*constraint*, which is the failure mode that kills projects of this size.

### What it got right

- **Positioning as a community reference, not a personal showcase.** This is the
  single most valuable line in it. Keep it.
- **The "every concept answers the same twelve questions" rubric.** That is a
  real content standard and it is what separates this from a blog.
- **One production architecture as the spine of the curriculum.** Correct, and
  you already have that architecture built — see below.
- **Dark-mode-first, command palette, MDX, Mermaid.** All defensible defaults.

### What must be fixed

| # | Problem | Why it matters | Resolution in this document |
|---|---------|----------------|-----------------------------|
| 1 | **Treats content as something to be written from scratch** | You already have ~71,000 words of handbook across 47 chapters, a complete Terraform/Ansible/kubeadm/ArgoCD platform, 20 NTI lab READMEs, and a Jenkins shared library. Ignoring them means re-writing your own work worse. | §11 Content System — ingestion pipeline from the existing repos is Phase 0, not Phase 4 |
| 2 | **No backend at all** | The prompt describes a static site, then asks for posts, chats, jobs, progress, quizzes and a roadmap that "unlocks progressively" — every one of which needs identity, persistence, and authorization. | §9 Platform Architecture, §10 Infrastructure — Django + DRF + Channels |
| 3 | **No Arabic** | You need ar/en. RTL is not a translation task, it is an architectural constraint that touches layout, icons, charts, code blocks, dates, numerals and search. Retrofitting it costs 5–10× building it in. | §4 Bilingual & RTL System |
| 4 | **No cost model** | "Free at the beginning with least cost" is a hard constraint, and video hosting, AI inference, search-as-a-service and always-on containers are the four things that will produce a bill. The prompt names Algolia (paid) and implies self-hosted video. | §10 Zero-Cost Infrastructure — a named free-tier stack with a $0/month target and explicit cost ceilings |
| 5 | **"Fake interactive terminals"** | Fake terminals teach nothing and reviewers see through them immediately. Real terminals are the differentiator — and they are obtainable for free. | §6.4 Labs — three tiers, including genuinely free real Kubernetes environments |
| 6 | **Three conflicting identities** | "Documentation platform" + "social network" + "portfolio piece" pull in different directions. A feed needs daily activity; a reference needs stability; a portfolio needs polish over breadth. | §1 Product Strategy — reference-first, social-as-amplifier, with an explicit sequencing |
| 7 | **No moderation, abuse, or spam plan** | A jobs board and an open feed attract scam posts within days of launch. This is not a v2 concern; it is a launch blocker. | §13.4 Trust & Safety |
| 8 | **No legal posture** | User accounts + Egypt + EU visitors = PDPL and GDPR obligations. Aggregated job listings and embedded content carry licensing questions. | §13.6 Legal & Compliance |
| 9 | **Lighthouse >95 asserted, then contradicted** | Framer Motion, React Flow, Mermaid and an animated hero on the same page will not score 95 on mobile. The goal is right; the means are unspecified. | §12.4 Performance Budget — enforced numerically in CI |
| 10 | **No MVP; ~15 subsystems demanded at once** | The prompt has no notion of sequencing, so an agent building from it produces fifteen half-finished things. | §14.3 Delivery Phases |
| 11 | **AI mentor with no cost or grounding strategy** | An unbounded LLM endpoint is both a bill and a hallucination liability on a platform whose entire value is being correct. | §8 AI Mentor — grounded retrieval, quotas, BYOK |
| 12 | **No feedback loop** | No analytics, no content health metrics, no way to learn which chapters fail readers. | §12.5 Analytics |
| 13 | **Search left as "Algolia (future)"** | Search is the primary navigation method on a reference site. Deferring it makes the platform unusable at 300 pages. Arabic search has specific requirements the prompt never considers. | §12.1 Search |
| 14 | **Brand named but not designed** | "EgyKode" needs a logo, a voice, a palette that is not Craft's green, and a resolution of the Egypt-vs-world tension in the name. | §2 Brand Identity |

### The single biggest change

The prior prompt asks an agent to **invent** a Cloud & DevOps curriculum.

This document asks an agent to **publish** one that already exists, then build
the platform that makes it navigable, practisable, translatable, and social.

That is a fundamentally easier, cheaper, faster and more credible project, and
it is the reason EgyKode can plausibly ship where "world's best learning
platform, from zero" cannot.

---

## Part 1 — Vision & Product Strategy

### 1.1 One-sentence definition

> **EgyKode** is an open, bilingual (Arabic/English) platform where engineers
> learn Cloud & DevOps by studying, running, and contributing to one real
> production-grade reference platform — and where they meet the people, jobs and
> projects that follow from it.

### 1.2 Tagline

**Primary (EN):** Learn it. Build it. Ship it.
**Primary (AR):** تعلّم. ابنِ. انشر.

**Descriptor (EN):** The open Cloud & DevOps platform — Arabic and English.
**Descriptor (AR):** منصة الـ Cloud و الـ DevOps المفتوحة — بالعربية والإنجليزية.

Rejected: "Learn • Build • Deploy • Observe • Secure • Scale" — six verbs is a
feature list, not a tagline, and it does not survive translation.

### 1.3 The thesis

Three observations, each of which is independently true, and which together
define an unoccupied position:

1. **Cloud & DevOps education in Arabic is close to nonexistent at a
   professional standard.** What exists is YouTube-shaped: long, unsearchable,
   unversioned, and impossible to contribute to. There is no Arabic equivalent
   of the Kubernetes docs.
2. **English DevOps education is abundant but fragmented into tutorials.** A
   learner finishes forty tutorials and still cannot describe a system. The
   missing artifact is a single coherent production platform explained end to
   end, with its trade-offs written down.
3. **Learning is social, and every learning platform that treats it as solitary
   loses to the Discord server that replaced it.** But a feed alone has no
   half-life — the content is the asset, the feed is the distribution.

EgyKode occupies all three: **a reference architecture, explained bilingually,
with a community attached to it.**

### 1.4 Positioning statement

> For engineers who want to work in Cloud & DevOps, EgyKode is an open learning
> platform that teaches the whole discipline through one real production system
> — unlike tutorial sites, which teach tools in isolation, and unlike bootcamps,
> which are expensive, English-only, and end when the course does.

**The promise, in one line — use this everywhere:**

> **Every roadmap ends with a deployable production project.**
> **كل مسار ينتهي بمشروع production حقيقي قابل للنشر.**

It is concrete, it is checkable, and it is the thing no competitor says.
Lead with it on the landing page, in the README, and in every description.

**Rejected positioning: "The Engineering Operating System for Cloud & DevOps."**
It sounds substantial and communicates nothing — a reader cannot tell what they
would get. "Operating system" is enterprise-vendor language for an audience
that is allergic to it. The promise above says the same ambition in words a
junior engineer can act on.

### 1.5 What EgyKode is not

Explicit non-goals protect the roadmap. EgyKode is **not**:

- A general programming school. Scope is Linux → Cloud → Containers → CI/CD →
  GitOps → Observability → SRE → Platform Engineering. No frontend frameworks,
  no mobile, no data science.
- A paid bootcamp with cohorts, deadlines, or live instruction.
- A hosted CI/CD or cloud product. It teaches those; it does not sell them.
- A general social network. The feed is scoped to Cloud/DevOps practice.
- A certification authority. Certificates are proof of completion, and the
  platform says so plainly rather than implying industry recognition.

### 1.6 The Egypt question

The name says Egypt; the ambition is global. That tension is an asset if
handled deliberately and a liability if ignored.

**Resolution — "Egypt-first, world-class":**

- Arabic is a **first-class language**, not a translation layer. Arabic pages
  are authored, reviewed and indexed to the same standard as English, and the
  Arabic experience is RTL-native, not a mirrored afterthought.
- The **default locale is decided by the visitor**, not by the brand. An
  English-speaking visitor from anywhere sees a platform that reads as
  international, with Arabic available.
- The **jobs board and community are Egypt/MENA-weighted at launch** because
  that is where the platform can be genuinely useful first, and globally open
  thereafter.
- The **technical content is locale-neutral.** Kubernetes does not have an
  Egyptian dialect. Content quality is the international bar; the language
  coverage is the local advantage.

Brand line for international audiences: *"Born in Cairo. Written for
everyone."*

### 1.7 Audiences and their jobs-to-be-done

| Audience | What they arrive wanting | What EgyKode gives them | Primary surface |
|---|---|---|---|
| Absolute beginner | "Where do I even start?" | An ordered path with time estimates and no prerequisites assumed | Roadmap → Learn |
| Student / fresh grad | A project that gets them an interview | A real reference platform they can run, fork and explain | Projects → Labs |
| Junior DevOps engineer | To fill specific gaps fast | Searchable chapters, troubleshooting hub, cheat sheets | Search → Reference |
| Backend / cloud engineer | To cross into platform work | Architecture deep-dives and design decisions with trade-offs | Architecture → ADRs |
| Senior / staff engineer | To validate approaches and argue about them | ADRs, trade-off tables, comments, contribution | Decisions → Community |
| Interview candidate | To not be caught out | Levelled question bank with scenario answers | Interview Hub |
| Arabic-first learner | Professional material in their language | Full ar experience, RTL-native | All, in `ar` |
| Hiring manager | To evaluate a candidate quickly | Public profiles showing verified progress and contributions | Profiles |
| Contributor | To build reputation | Clean contribution paths, visible credit, real ownership | Community |

### 1.8 Success metrics

Vanity metrics are excluded deliberately. Track these, in this order:

**Content health (leading indicator)**
- Chapters at "complete" quality bar (all 12 rubric sections present): target 47 at launch
- Arabic parity: % of published chapters with reviewed `ar` version — target 40% at launch, 100% at v1.0
- Broken-link and stale-command count: **0** enforced in CI

**Learning outcomes (the real product)**
- Lab completion rate per lab (a lab under 40% is broken, not hard)
- Roadmap node completion → next-node conversion
- Median chapters per returning user per week

**Reach**
- Weekly returning learners (not visitors)
- Organic search impressions for `ar` queries — the defensible moat
- GitHub stars, forks, and **contributors who are not you** (the single best signal that positioning worked)

**Community**
- Posts per week with ≥1 reply (an unreplied feed is a dead feed)
- Time-to-first-reply, median
- Job posts that receive an application

**Explicitly not tracked as goals:** pageviews, time-on-page, total signups.

### 1.9 Strategic sequencing

The three identities do not launch simultaneously. They compound in order:

```
Phase A — REFERENCE          Phase B — PRACTICE         Phase C — COMMUNITY
The content is the asset  →  The labs prove it works →  The people compound it
47 chapters, bilingual       Roadmap, labs, quizzes     Feed, chat, jobs, profiles
Static, fast, indexable      Accounts + progress        Social graph
Google is the distribution   Retention starts           Network effects
```

Building C first produces an empty room. Building A first produces something
useful on day one, that search engines index, that people arrive to — and
*then* the room fills.

---

## Part 2 — Brand Identity

### 2.1 Name

**EgyKode** — /ˈɛdʒiˌkoʊd/ — "Egy" (Egypt) + "Kode" (code, deliberately
misspelled for availability and memorability).

Written **EgyKode** in camel case, always. Never `Egykode`, `EGYKODE`, `egy
kode`, or `EgyCode`. In Arabic contexts the Latin mark is retained — **EgyKode**
— and never transliterated to «إيجي كود» in the logo, though that
transliteration MAY appear once in body copy on first mention for
pronunciation.

**Before committing:** verify `egykode.com`, `egykode.dev`, `egykode.io`, the
`@egykode` handles on GitHub / X / LinkedIn / YouTube / Discord, and run an
Egyptian trademark search. This is a 30-minute task that is very expensive to
skip.

### 2.2 Brand personality

Five attributes, each with its opposing failure mode named:

| We are | We are not |
|---|---|
| **Precise** — every command runs, every claim is checkable | Pedantic, gatekeeping |
| **Generous** — the best material is free and stays free | Naive about sustainability |
| **Plain-spoken** — short sentences, no hype, trade-offs stated | Dry, humourless, academic |
| **Practitioner** — written by someone who has operated this | Consultant-voice, theoretical |
| **Rooted** — proudly Egyptian, globally legible | Parochial, or ashamed of local identity |

### 2.3 Voice & tone

**English voice.** Direct declaratives. Second person for instructions
("Create the namespace"), first person plural for decisions we made ("We chose
kubeadm because…"). Never "simply", "just", "obviously", "as you can see" —
these words tell a stuck reader that the problem is them. State costs before
benefits when describing a choice. Name the weaknesses of anything we recommend.

**Arabic voice.** Modern Standard Arabic (فصحى مبسّطة) for all technical
content — it travels across the entire Arab world and reads as professional.
Egyptian dialect is permitted **only** in community/marketing microcopy where
warmth matters more than reach, and MUST NOT appear in chapters, labs or
reference material.

#### The Arabic technical writing model

EgyKode's Arabic is **not a translation of the English**. It is Arabic
*explanation* wrapped around English *terminology*, which is how Arab engineers
actually speak and write. The governing sentence:

> **Arabic is the language of explanation and navigation. English remains the
> canonical language of code, commands, product names, and technical terms.**

Every term falls into exactly one of three categories.

**Category A — never translated, never transliterated.** Product and protocol
names keep their Latin form: Kubernetes, Docker, Terraform, Ansible, Jenkins,
Argo CD, GitHub, AWS, Linux, Nginx, Prometheus, Grafana, Helm, Git, GitOps,
DevOps, CI/CD, API, HTTP, DNS, SSH, YAML, JSON, Dockerfile.

✅ `هنستخدم Terraform لإنشاء الـ AWS infrastructure.`
❌ «هنستخدم تيرافورم» · ❌ «الكوبرنيتس»

**Category B — English term, Arabic sentence.** Resource and concept names take
the definite article and stay in Latin script. This is the default.

| English | EgyKode Arabic |
|---|---|
| Deployment | الـ Deployment |
| Pod / Namespace / Cluster / Node | الـ Pod / الـ Namespace / … |
| Load Balancer | الـ Load Balancer |
| Security Group / Subnet | الـ Security Group / الـ Subnet |
| Infrastructure as Code | Infrastructure as Code (IaC) |

✅ `الـ Deployment مسؤول عن إدارة الـ Pods والتأكد إن العدد المطلوب شغال.`

**Category C — explained in Arabic.** Behaviour and rationale are written in
natural Arabic, with the English term retained where it is the thing being
named.

✅ `الـ Load Balancer بيوزّع الـ incoming traffic على أكتر من server بدل ما كل
الـ traffic يروح لـ server واحد.`

#### Hard rules

1. **Code is never translated.** Commands, YAML, Terraform, filenames, flags
   and paths appear exactly as they do in English — and always `dir="ltr"`.
2. **Error messages are never translated.** Show the verbatim error, then
   explain it in Arabic underneath: `معنى الخطأ: Kubernetes مش لاقي Pod باسم
   backend في الـ namespace الحالي.`
3. **Acronym on first use, then reuse it.** `Infrastructure as Code (IaC) هو
   أسلوب...` then `الـ IaC بيسهّل...`.
4. **Slugs stay Latin** in both locales (§4.2) — URLs are shared and pasted.
5. **Never machine-translate as the pipeline.** English and Arabic are written
   independently against a shared technical model; the meaning is shared, the
   prose is not (§4.4b).
6. **Mixed-script lines need bidi isolation.** Any Latin token inside Arabic
   prose is wrapped so the bidi algorithm cannot move its punctuation — this is
   what produces `?What is a VPC` when it is skipped.

#### Tone

Arabic explanations use **semi-formal Modern Standard Arabic** — professional
and direct, the register a senior engineer writes documentation in. It sits
deliberately between two failure modes:

| Too formal | Too casual | EgyKode |
|---|---|---|
| «أيٌّ من موارد Kubernetes التالية يُستخدم لإتاحة الوصول إلى تطبيق داخل الكلاستر؟» | «أنهي Kubernetes resource بيخلّيك توصل للـ app جوه الـ cluster؟» | «أي من Kubernetes resources التالية يُستخدم لإتاحة الوصول إلى تطبيق داخل الـ Cluster؟» |
| reads as a government document | reads as unprofessional, and does not travel outside Egypt | reads as a colleague explaining something |

Simplicity comes from **shorter sentences and concrete examples**, never from
dropping into dialect. A beginner struggling with `etcd quorum` is helped by a
clear analogy in correct Arabic, not by colloquial phrasing.

#### Translating assessments

Questions are the one place where a translation error changes what is being
measured, so they carry extra rules:

1. **Translate the sentence, not the terminology.** `Pod`, `Deployment`,
   `Service`, `Ingress`, `ConfigMap`, `RBAC`, `CIDR`, `VPC` and every product
   name stay in Latin script — the learner is being tested on Kubernetes, not
   on their ability to decode an Arabic paraphrase.
2. **Code, commands and file names are never translated.** `kubectl rollout
   undo deployment/api` appears verbatim; only the surrounding question and the
   options are Arabic.
3. **Difficulty must survive translation.** Scope, number of concepts,
   ambiguity and distractor quality are all part of the assessment. Turning
   "What is the difference between a Deployment and a StatefulSet?" into "What
   is a Deployment?" is not a translation, it is a different question.
4. **One canonical answer across languages.** The correct option is stored once
   on the question, never per-locale — otherwise a translation can silently
   move the right answer.

```json
{
  "id": "k8s-service-001",
  "correctAnswer": "B",
  "options": ["Pod", "Service", "Ingress", "ConfigMap"],
  "en": { "question": "Which Kubernetes object exposes a Deployment inside the cluster?" },
  "ar": { "question": "أي من Kubernetes objects يُستخدم لإتاحة الوصول إلى Deployment داخل الـ Cluster؟" }
}
```

Options that are bare technical terms are **not translated at all** — they are
the same list in both locales, which is why they live outside the per-locale
block.

5. **Never publish a machine translation of an assessment unreviewed.** The
   pipeline is AI draft → terminology check → human technical review. For
   technical content, being right matters more than reading elegantly: a
   fluent Arabic question that misdescribes Kubernetes is worse than a plainer
   one that is correct.

`content/glossary.{en,ar}.yml` holds the canonical form for every term in
Categories A and B, and a lint rule enforces it (§11.6). A term that is
transliterated anywhere in the corpus is a build failure.

### 2.4 Logo & visual identity

The mark **already exists** and is good. This section documents it and sets the
rules that keep it consistent — it does not propose a redesign.

**Source artwork**

| File | What it is |
|---|---|
| `R:\ivolve\logo.png` | Mark only, light ground |
| `R:\ivolve\name_logo.png` | Horizontal lockup: mark + "EgyKode" |
| `C:\Users\walid\Downloads\Gemini_Generated_Image_.png` | Mark on the official dark ground |

**The mark.** An **EK monogram constructed as a single upward chevron.** Two
strokes rise to a shared apex; the left descender carries the two horizontal
bars of the **E**, the right carries the diagonal legs of the **K**. It is a
one-stroke-weight, geometric, 45°/vertical construction with mitred joins and
no curves.

**Why it works** (and why it MUST NOT be replaced):

- It reads as **ascent** — growth, promotion, "up and to the right", a career
  trajectory. That is exactly the product's promise.
- It reads as a **deploy arrow**. In a DevOps context an upward chevron is
  already the visual grammar of shipping.
- The apex plus twin descenders also read as a **rooftop or a tent**: a place
  to gather. That supports the community half of the product.
- It is legible as a silhouette at 16px, which most monograms are not.

The agent MUST NOT reinterpret this as a terminal prompt, a container, a
pyramid, or an ankh. It is a rising monogram; that is the story.

**What MUST be produced (the current assets are raster and insufficient):**

| Asset | Format | Notes |
|---|---|---|
| Primary mark | **SVG** | Redrawn as clean vector paths on a 24×24 grid, `fill="currentColor"` so it inherits theme |
| Horizontal lockup | SVG | Mark + wordmark, matching `name_logo.png` spacing |
| Stacked lockup | SVG | Mark above wordmark, for square/avatar spaces |
| Monochrome | SVG | Pure `#FFFFFF` and pure `#1C2427` variants, no gradient |
| Favicon | SVG + ICO | 16 / 32 / 48 — mark only, never the lockup |
| App icons | PNG | 192, 512, **maskable 512** (mark inset to the 80% safe area) |
| OG template | SVG → PNG | 1200×630, generated per page (§12.3) |

Vectorising is a required task, not an optional polish: a raster logo cannot
scale, cannot inherit `currentColor`, cannot animate, and bloats every page it
appears on.

#### Brand colour usage rules

| Context | Value |
|---|---|
| Mark on dark | `#1FE881` (or the `--grad-brand` gradient) |
| Mark on light | `#1FE881` — permitted, because as a **graphic** it needs 3:1, not 4.5:1 |
| Brand **text** on light | **Never `#1FE881`.** Use `--clr-primary` (`#0C8A50`) |
| Wordmark on light | `#1C2427` |
| Wordmark on dark | `#F0F3F2` |
| Single-colour reproduction | Solid `#1FE881`, no gradient |
| Print / one colour | `#1C2427` or knockout white |

#### Clear space, sizing, placement

- **Clear space** on all sides equals the width of one chevron stroke, measured
  at the current size. Nothing — text, edge, image — enters that zone.
- **Minimum size:** mark 20px tall; lockup 100px wide. Below that, use the mark
  alone.
- The mark is **optically** centred, not mathematically: the chevron's visual
  mass sits above centre, so it must be nudged down ~4% in square containers
  (favicon, avatar, app icon). Mathematical centring will look wrong.

#### Prohibited uses

Never: rotate or skew · stretch non-uniformly · add drop shadows, bevels or
outer glows · recolour outside the table above · place on a busy photograph
without a scrim · outline the strokes · re-typeset the wordmark in a different
face · alter the spacing inside the lockup · add a tagline inside the lockup ·
enclose it in a box that is not the approved app-icon container · animate it as
a loading spinner (it is a brand mark, not a widget).

#### The one permitted animation

On first load of the landing page only: the chevron **draws itself upward**
(`stroke-dashoffset`, 600ms, `--ease-out`), left stroke then right, 80ms apart.
Once per session, respecting `prefers-reduced-motion`. Nowhere else.

#### Wordmark typeface

The lockup's "EgyKode" is set in a bold geometric grotesque. **Space Grotesk
Bold** (§3.3) is the closest available match and MUST be used when the wordmark
is re-typeset, so the display face in the product and the wordmark in the logo
are the same voice. The `K` retains its straight-leg form.

#### Arabic lockup

An Arabic lockup MUST be produced: the same mark with **«إيجي كود»** set in
**IBM Plex Sans Arabic Bold**, mark on the **right** in RTL contexts. The Latin
"EgyKode" wordmark remains the primary mark globally; the Arabic lockup is used
only where an all-Arabic composition demands it (Arabic social headers, Arabic
print). Never place both wordmarks in one lockup.

### 2.5 Brand-to-product relationship with Craft

EgyKode reuses the **structure** of the Craft design system (token names, theme
mechanism, component primitives, i18n approach) and replaces its **values**
(hue, type, motion feel). This is deliberate: it means every Craft component
ports with a token swap and no rewrite, while the two products remain visually
distinct. Craft is green and warm; EgyKode is teal and technical.

Anything ported from `R:\Craft\MicroServices Craft\services\customer-portal`
MUST be re-read and adapted, never copied blind — Craft's tokens carry
commerce-specific decisions (product cards, price emphasis) that do not apply.
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
---

## Part 6 — Learning Experience

This is the product. Everything else exists to serve it.

### 6.0 The core promise and the content hierarchy

> **Every roadmap ends with a deployable production project.**

That single sentence is the strongest thing EgyKode can promise, and it is
worth more than fifty social features. It is also *checkable*, which is what
separates it from marketing copy: either the learner has a running system at
the end or they do not.

For the promise to be structural rather than aspirational, the content model
must have a project at the top of it. A flat list of chapters cannot make that
guarantee; this hierarchy can:

```
ROADMAP  (e.g. Cloud DevOps Engineer)
  │
  ├── PHASE        01 Linux → 02 Networking → 03 Git → 04 Docker →
  │                05 Kubernetes → 06 AWS → 07 Terraform → 08 Ansible →
  │                09 CI/CD → 10 GitOps
  │     │
  │     ├── MODULE
  │     │     ├── LESSON      the chapter — explanation (§6.2)
  │     │     ├── LAB         guided, validated, real (§6.4)
  │     │     ├── CHALLENGE   unguided; a goal and a success condition
  │     │     └── PROJECT     a component of the final system
  │     │
  │     └── ASSESSMENT        gate: quiz + lab evidence (§6.13)
  │
  └── PRODUCTION PROJECT      the whole system, deployed and observable
```

**Lesson → Lab → Challenge** is the ladder that actually produces competence.
A lesson explains, a lab walks you through, a challenge removes the walkthrough
and keeps the goal. Most platforms ship the first two and stop; the third is
where the learning happens, and it costs almost nothing to author because it is
the lab with its instructions deleted and its success condition kept.

Each phase's PROJECT is a **slice of the same final system**, so the learner is
not building ten disposable exercises — they are building one platform,
incrementally. By Phase 10 they have exactly the architecture documented in
`platform/`: a CI pipeline, a registry, a cluster, GitOps reconciliation and
monitoring, running under their own account.

**The user journey this creates:**

```
LEARN → UNDERSTAND → PRACTICE → BUILD → DEPLOY → OPERATE → SHOWCASE → GET HIRED
```

The last two links matter commercially: SHOWCASE is the public profile (§7.5),
and GET HIRED is the skill-matched jobs board (§7.7). That is the loop that
makes the jobs board serve the learning product instead of competing with it.

**Mapping to the existing corpus:** the 47 handbook chapters populate the
LESSON layer; the 20 NTI lab READMEs populate LAB; CHALLENGE and PROJECT are
the genuinely new authoring work, and they are small — a challenge is a
paragraph and a checker, a project is an assembly of work already documented in
`platform/`.

### 6.1 The source material — what already exists

EgyKode does not start from an empty content directory. Inventory of what is
already written and MUST be ingested in Phase 0:

| Source | Contents | Becomes |
|---|---|---|
| `Cloud-Native-DevOps-Handbook/` | **47 chapters, ~71,000 words** — Linux, networking, Git, Docker, AWS, VPC, IAM, Terraform, Ansible, RDS, LB, ASG, Secrets Manager, Kubernetes, kubeadm, Helm, Kustomize, Jenkins, GitHub Actions, ECR, Nexus, GitOps, ArgoCD, monitoring, Prometheus, Grafana, logging, security, NetworkPolicy, service mesh, serverless, chaos, cost, platform engineering, DR, labs, troubleshooting, glossary, interview prep | `/learn/**` — the entire chapter corpus |
| `Cloud-Native-DevOps-Platform/` | 12 Terraform modules × 3 envs, 13 Ansible roles, kubeadm cluster, ArgoCD app-of-apps, Jenkins pipeline, monitoring stack, **5 ADRs** | `/build/platform`, `/build/architecture`, `/build/decisions` — the reference architecture, with **live code embeds from the real files** |
| `CloudDevOpsProject/` + `Ivolve Final Project/` | Docker → Terraform → Ansible → K8s → Jenkins → ArgoCD → Monitoring, staged | `/learn/paths/*` — the ordered curriculum spine |
| `NTI/NTI Final Project/` | **20 lab READMEs** across 8 modules, EKS/Helm/Jenkins/observability | `/build/labs/**` — the initial lab catalogue |
| `jenkins-shared-library/` | 12 Groovy steps: `buildApp`, `sonarQubeScan`, `trivyScan`, `ecrPush`, `updateGitOpsRepo`, `deployOnK8s`… | `/build/platform/cicd` + the CI/CD simulator's real stage definitions |
| `diagrams/architecture.png` | The full annotated platform diagram | Redrawn as **interactive inline SVG** for `/build/architecture` |
| `portfolio.md` | Honest gap analysis, interview Q&A, ADR rationale | `/prepare/interview` seed + `/build/decisions` narrative |

**This is the single most important instruction in the document:** the agent's
first job is a migration, not an authoring exercise. Rewriting this corpus from
scratch would produce something worse, slower, and less credible.

Migration rules:
- Preserve the author's voice and technical claims. Restructure, do not rewrite.
- Every chapter is mapped to the §6.2 template; missing sections are marked
  `status: partial` in frontmatter and surfaced as contribution opportunities —
  **not** filled with generated filler.
- Commands and code are extracted from the real repositories at build time
  (§11.4), never retyped, so they cannot drift.

### 6.2 Chapter anatomy

Every `concept` and `howto` page follows one structure. Sections are optional
individually but the **order is fixed**, so a reader who learns the shape of
one chapter can navigate all of them.

```mdx
---
contentId: k8s-architecture          # stable join key across locales
title: Kubernetes Architecture
titleAr: بنية Kubernetes
domain: kubernetes
level: intermediate
type: concept
readingTime: 18                       # computed, not authored
prerequisites: [containers-basics, linux-processes]
objectives:
  - Describe what each control plane component does
  - Trace a `kubectl apply` from client to running container
relatedChapters: [k8s-kubeadm, k8s-networking]
labs: [lab-first-cluster]
interviewQuestions: [k8s-q-control-plane, k8s-q-etcd]
platformRefs:                         # links into the real reference repo
  - infrastructure/ansible/roles/control-plane
  - infrastructure/terraform/modules/compute
status: complete                      # complete | partial | draft
translationStatus: reviewed           # reviewed | machine-draft | missing
updated: 2026-08-08
authors: [waleed]
---
```

**Body order:**

1. **In one paragraph** — what this is, for someone in a hurry.
2. **Why it exists / what problem it solves** — the historical or operational
   pressure that produced it. Never start with a definition.
3. **How it works internally** — the mechanism, with a diagram.
4. **Terminology** — terms defined once, linked to the glossary, with the
   Arabic gloss.
5. **How we implemented it** — the real code from the reference platform, with
   a file path that links to GitHub.
6. **Commands you will actually run** — copyable, with expected output.
7. **Alternatives and trade-offs** — a table. Costs stated before benefits.
8. **Production considerations** — what changes at scale, what breaks at 3am.
9. **Security implications** — always present, never "N/A".
10. **Cost implications** — in real currency where possible.
11. **Common mistakes** — sourced from actual failures, not invented.
12. **Troubleshooting** — links into `/prepare/troubleshoot`.
13. **Hands-on lab** — an embedded `<Lab>` card.
14. **Check yourself** — a `<Quiz>` of 3–5 questions.
15. **Interview questions** — 3–5, linked to the hub.
16. **References** — upstream docs, with retrieval dates.
17. **What's next** — 2–3 explicit next chapters.

**Chapter chrome:** level badge · domain colour bar · reading time · progress
checkbox (signed in) · bookmark · "improve this page" → GitHub edit link ·
language switch showing translation status · sticky table of contents ·
prev/next · last-updated with a git link · contributor avatars.

### 6.3 Interactive roadmaps

roadmap.sh proved the format. EgyKode's differentiator is that **every node
resolves to depth we actually have** — a chapter, a lab, and a real
implementation in the reference platform — rather than a link list.

**Implementation:** React Flow, rendered as a **static SVG at build time** and
hydrated only on interaction. A 200-node canvas that ships as client JS on
first paint destroys the performance budget.

**Roadmaps to ship:**
1. **DevOps Engineer** (the flagship, ~120 nodes)
2. **Cloud Engineer — AWS**
3. **Kubernetes Specialist**
4. **Platform Engineer**
5. **SRE**
6. **DevSecOps**

**Node states:** `locked` (prerequisites unmet — visible but dimmed, never
hidden) · `available` · `in-progress` · `complete` · `mastered` (quiz passed +
lab completed).

**Node detail panel** (slides in, never navigates away): summary · why it
matters · estimated time · linked chapter · linked lab · linked interview
questions · where it appears in the reference platform · mark-complete.

**Rules:**
- Locked nodes MUST be readable. Gating content behind progress on a free
  learning platform is hostile; the lock communicates *sequence*, not
  permission.
- The whole canvas MUST be usable by keyboard: arrow keys traverse edges, Enter
  opens, Escape closes.
- A **linear list view** is mandatory as an accessible equivalent and as the
  mobile default — a 120-node graph on a 375px screen is not navigable.
- Progress persists server-side for signed-in users, `localStorage` otherwise,
  and merges on sign-in.
- Export: "download my roadmap progress" as JSON/PNG for portfolios.

### 6.4 Hands-on labs — three tiers

Fake terminals are worthless. Real environments are the differentiator, and
they are obtainable at zero cost if the tiers are chosen carefully.

**Tier 1 — Guided validated labs (free, ships first)**
The learner runs commands on **their own machine or AWS free tier** and pastes
output back; the platform validates it against expected patterns.

- Steps with copy buttons, expected output, and a checker (regex/JSONPath over
  pasted output, or a hash of a produced artifact).
- Works for Terraform, Ansible, Docker, kubectl — everything.
- Cost: **$0**. Fidelity: **real**, because they really did it.
- This is the workhorse. Roughly 80% of labs are Tier 1.

**Tier 2 — Embedded real environments (free, ships second)**
- **Killercoda** — free for content authors, gives a genuine multi-node
  Kubernetes cluster in the browser. Scenario definitions live in the EgyKode
  repo as YAML and are embedded via iframe. This is the single highest-value
  integration in the document.
- **Play with Docker / Play with Kubernetes** for container labs.
- **WebContainers (StackBlitz)** — free for open-source — for Node/Python
  tooling labs that do not need a kernel.
- Cost: **$0**, at the price of an external dependency, which MUST be declared
  in the lab card and MUST degrade to Tier 1 if the provider is unavailable.

**Tier 3 — Platform-hosted sandboxes (deferred, costs money)**
Ephemeral EC2/k3s per learner. **Explicitly out of scope until there is
revenue.** Documented here only so nobody builds it by accident.

**Lab anatomy:** objective · time · difficulty · prerequisites · what you will
build (diagram) · cost warning if AWS resources are created · steps · checkpoints
· **cleanup (mandatory, and verified)** · troubleshooting · challenge extension ·
solution (collapsed) · "submit your result" → optional public artifact on the
profile.

**The cleanup rule is non-negotiable.** Any lab that provisions cloud resources
MUST end with a verified teardown step and a prominent estimated-cost banner at
the top. A learning platform that leaves a beginner with an AWS bill has failed
them.

### 6.5 The `<Terminal>` component

Used for demonstration, not simulation, and honest about which it is.

- **Playback mode** — a recorded sequence types out, with realistic timing and
  a scrub bar. Sourced from `asciinema` casts recorded from real runs.
- **Copy mode** — static block, per-line copy, and a "copy all" that strips
  prompts and comments.
- Never invents output. Every terminal cast MUST come from a real execution,
  recorded and committed.
- Always `dir="ltr"`, even on Arabic pages (§4.3).
- Fully keyboard accessible with a text alternative for screen readers.

### 6.6 Architecture explorer

The `architecture.png` diagram, redrawn as **interactive inline SVG**.

Every component is a focusable, clickable region. Selecting one opens a panel:
what it is · why it is in this architecture · the exact Terraform module or
Ansible role that creates it (with the real file contents) · the commands to
inspect it · what fails if it fails · the security posture · the cost · links
to the chapter, the lab and the interview questions.

- Layers toggle independently: network · compute · Kubernetes · CI/CD · GitOps ·
  observability · security · data.
- Traffic-flow overlays animate a request path: user → Route 53 → ALB →
  Ingress → Service → Pod → RDS.
- Deep-linkable: `/build/architecture?focus=rds&layer=data`.
- Mobile: falls back to a grouped list with the same panels.
- Built as SVG with `<title>`/`<desc>` per region, not canvas — so it is
  accessible, searchable and printable.

### 6.7 AWS explorer

Same interaction model, scoped to AWS services as used in the reference
platform: VPC, subnets, route tables, IGW, NAT, security groups, NACLs, EC2,
ASG, ALB/NLB, ECR, RDS, S3, IAM, Secrets Manager, CloudWatch, Backup, KMS,
Route 53.

Each service: what it is · **what it costs, with the free-tier boundary stated
explicitly** · the Terraform that creates it · the CLI to inspect it · the
common misconfiguration · the security default that is wrong out of the box.

The cost column is the differentiator. Every AWS tutorial omits it; every
learner gets burned by it.

### 6.8 Simulators

**CI/CD pipeline simulator.** Stages driven by the **real** `Jenkinsfile` and
the real shared-library steps, not invented ones: Checkout → Build & Unit Test
(Maven) → Static Analysis (SonarQube ∥ Trivy FS) → **Quality Gate** → Build
Image → **Trivy Image Scan** → Push to ECR → Update GitOps Overlay (kustomize) →
Commit & Push → *hand-off*.

- Each stage shows: what runs, the real log excerpt, the duration, and what it
  would block on.
- **Failure injection** is the point: "fail the quality gate", "inject a CVE",
  "break the unit test" — and watch where the pipeline stops and why. A simulator
  that only shows the happy path teaches nothing.
- Controls: play / pause / step / restart / speed. Step mode satisfies
  `prefers-reduced-motion`.

**GitOps simulator.** Developer commit → GitHub → ArgoCD detects drift →
sync → rolling update → healthy. With the two scenarios that matter:
**manual `kubectl edit` gets reverted by selfHeal**, and **a bad image stalls
the rollout with `maxUnavailable: 0` while the old version keeps serving.**
Those two demonstrations are the entire argument for GitOps, made visible.

### 6.9 Decision catalogue (ADRs)

The five existing ADRs — kubeadm over managed Kubernetes, GitOps over push
deploys, Calico CNI, monorepo for manifests, no CPU limits — become a
first-class browsable surface at `/build/decisions`.

Each renders as: context · the decision · alternatives considered · **what this
choice costs** · consequences · status · related chapters · a comment thread.

This surface is the strongest signal of engineering seniority on the entire
platform, and it is the one nobody else builds. It MUST be prominent, not
buried in docs.

### 6.10 Interview hub

Questions levelled `junior | mid | senior | staff | platform`, tagged by
domain, and typed: `conceptual` · `scenario` · `system-design` ·
`troubleshooting` · `behavioural-technical`.

Each entry: the question · a **short answer** (what to say in 30 seconds) · a
**full answer** (what to say if pressed) · **follow-ups the interviewer will
ask next** · what a weak answer sounds like · links to the chapter.

`portfolio.md` already contains a model of this done well — "Why not EKS?",
"Why the extra hop through git?", "Walk me through a failed deploy" — including
honest answers about weaknesses. That voice is the standard.

**Practice mode:** a timed session that draws N questions at a level, reveals
answers on demand, and records self-assessed confidence, feeding the spaced
repetition scheduler (§6.13).

### 6.11 Troubleshooting hub

**Symptom-first, not tool-first.** People arrive with an error string, not a
category.

Entry structure: the symptom (verbatim, as it appears in a terminal) · what it
means · the diagnostic commands, in order · the decision tree of causes · the
fix per cause · how to prevent it · related chapters.

Seed set from `42_Troubleshooting.md` plus the classics: `CrashLoopBackOff`,
`ImagePullBackOff`, `Pending` pods, `OOMKilled`, `terraform state lock`,
`Error: cycle`, ArgoCD `OutOfSync`/`Degraded`, `x509: certificate signed by
unknown authority`, `kubectl` connection refused, NodePort unreachable, Ansible
`UNREACHABLE`, Jenkins agent offline, ECR `denied`.

Search MUST match on pasted error text — that is the primary entry point, and
it means indexing the verbatim symptom strings heavily.

### 6.12 Reference & cheat sheets

A command reference: `kubectl`, `docker`, `terraform`, `ansible`, `helm`,
`git`, `aws`, `systemctl`, `journalctl`, `ip`, `ss`, `openssl`.

Each command: syntax · the flags that matter · a real example with output · the
dangerous variant flagged · the related chapter. Reachable from the command
palette via `/` (§5.6). Printable one-page cheat sheets per tool, in both
languages.

### 6.13 Quizzes, mastery and spaced repetition

- **Quiz** types: multiple choice, multiple select, true/false, fill-the-command,
  order-the-steps, identify-the-bug-in-this-YAML.
- Every wrong answer MUST explain **why** it is wrong, not merely mark it.
- **Mastery** of a node = chapter read + quiz ≥ 80% + lab completed.
- **Spaced repetition:** a lightweight SM-2 scheduler over quiz items. Items
  resurface on the dashboard as "due for review". This is the single highest-
  leverage retention feature in the product and it is cheap to build.
- No leaderboard on quiz scores. Leaderboards on assessment produce cheating
  and anxiety; leaderboards on contribution produce contribution (§7.6).

### 6.14 Courses

Structured video paths, layered over the same chapters.

- **Video is embedded, never hosted.** Unlisted YouTube is the launch answer:
  free, unlimited, global CDN, adaptive bitrate, automatic captions that can be
  corrected. Self-hosted video is the fastest way to a bill.
- Embeds use a **facade** (`lite-youtube`): a thumbnail plus a play button that
  loads the iframe on click. A raw YouTube iframe costs ~700KB and ~1.5s of LCP.
- Course = ordered lessons; each lesson = video + the chapter + a lab + a quiz.
- Progress, resume position, and completion certificates (§7.6).
- Community-contributed courses are permitted from Phase C, moderated.

### 6.15 Certificates

Issued on course/path completion. **Honest by design:**

- States exactly what was completed and when, with a verification URL.
- Says plainly that it is a record of completion, not an industry
  certification. Overclaiming here would poison the platform's credibility.
- Verifiable at `/verify/[id]`; shareable to LinkedIn; rendered as a
  theme-aware SVG → PNG.
- Bilingual, with the holder's name in the script they enter it in.
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
---

## Part 8 — AI Mentor

An LLM assistant on a platform whose entire value is being **correct** is a
liability unless it is grounded, bounded and honest. These constraints are not
optional polish; they are what make the feature shippable.

### 8.1 What it is

**"Ask the Handbook"** — a retrieval-grounded assistant that answers from
EgyKode's own content and says so, with citations, in Arabic or English.

It is **not** a general chatbot, not a code generator, and not a replacement
for the content. Its job is navigation and explanation of material that already
exists.

### 8.2 Grounding contract (non-negotiable)

1. **Retrieval-augmented only.** Every answer is generated from retrieved
   chunks of EgyKode content (chapters, labs, ADRs, troubleshooting entries,
   the reference repo's code).
2. **Every claim carries a citation** rendered as a link to the source chapter
   and section. An answer with no retrievable source is not returned.
3. **Refusal is a valid answer.** If retrieval confidence is below threshold,
   the assistant says "I don't have this in the handbook yet" and offers a
   search, a related chapter, and a "request this content" action that files a
   GitHub issue. This turns a failure into a content roadmap signal.
4. **Never invents commands, flags, versions, or costs.** A generated `kubectl`
   flag that does not exist is worse than no answer.
5. **Answers in the user's locale**, using the Arabic terminology rules of §2.3
   and the glossary as a constrained vocabulary.
6. Output is rendered through the same MDX sanitiser as user content.

### 8.3 Modes

| Mode | Entry point | Behaviour |
|---|---|---|
| **Ask** | ⌘K → `?`, or the floating button | Q&A over the corpus, cited |
| **Explain this** | Select text in a chapter → "explain" | Re-explains the selection at a simpler level |
| **Explain this error** | Paste terminal output | Routes to troubleshooting entries; explains the error; never guesses a fix without a source |
| **Quiz me** | Chapter footer | Generates questions **from the chapter text only**, validated against it |
| **Translate check** | Translation review UI | Suggests Arabic phrasing, human approves — never auto-publishes |

Deliberately **absent**: "write my Terraform", "debug my cluster", free-form
code generation. Those invite exactly the errors that would destroy trust.

### 8.4 Retrieval implementation

- Chunk at **section** granularity (~500–1000 tokens) with heading breadcrumbs
  preserved, so citations point at a section anchor, not a page.
- **Embeddings stored in PostgreSQL via `pgvector`.** No external vector
  database — one fewer service, one fewer bill, and the corpus is small enough
  (a few thousand chunks) that Postgres is comfortably the right tool.
- **Hybrid retrieval:** vector similarity + PostgreSQL full-text, reciprocal
  rank fusion. Pure vector search fails on exact identifiers like
  `CrashLoopBackOff` and `--dry-run=server`; keyword search catches them.
- Arabic queries are normalised per §4.6 before both retrieval paths.
- Embeddings are regenerated **only for changed chunks**, in CI, on content
  merge — content hashing prevents re-embedding the whole corpus on every push.

### 8.5 Cost control

The cost model is the reason this feature can exist on a free platform.

| Control | Value |
|---|---|
| Model | A small, cheap model is sufficient for grounded Q&A — **Claude Haiku** class. Do not use a frontier model for retrieval summarisation |
| Anonymous quota | **3 questions/day per IP**, then a sign-in prompt |
| Signed-in quota | **20 questions/day**, resetting at local midnight |
| Contributor quota | 100/day (reputation ≥ 200) |
| **BYOK** | Any user may add their own API key in settings for unlimited use — key encrypted at rest, never logged, usable only from their session |
| Caching | Question → answer cache keyed on normalised question + corpus version. Cache hit rate on a Q&A corpus like this is typically 40–60% |
| Context cap | Max 6 retrieved chunks, max 4k input tokens, max 800 output tokens |
| Kill switch | An environment flag disables the feature instantly if spend exceeds budget, degrading to plain search |

**Hard budget: $0–20/month.** If the free-tier or credit allowance is
exhausted, the assistant degrades to search rather than billing.

### 8.6 Safety and transparency

- Every response is visibly labelled as AI-generated, with the model named.
- Thumbs up/down on every answer, stored with the question and retrieved
  chunks, feeding a review queue — **low-rated answers are content gaps**, and
  that dataset is genuinely valuable for prioritising what to write next.
- Prompt-injection defence: retrieved content is delimited and the system prompt
  states that content is data, not instruction. User-generated content
  (posts, comments) is **never** in the retrieval corpus.
- No training on user data. Conversations are retained 30 days for abuse review
  then deleted, and the user can delete them immediately.
- Rate limits are enforced server-side, in Django, never in the client.
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
