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
