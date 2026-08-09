<div align="center">

<img src="apps/web/public/brand/mark.svg" alt="EgyKode" width="96" height="106">

# EgyKode

**The open-source Cloud &amp; DevOps learning platform.**

Learn the concepts, build the infrastructure, practise in hands-on labs, and
finish with projects you can actually deploy.

[![Licence: MIT](https://img.shields.io/badge/code-MIT-1fe881?style=flat-square)](LICENSE)
[![Content: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-1fe881?style=flat-square)](LICENSE-CONTENT)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)

</div>

---

EgyKode is an open-source learning platform for **Cloud, DevOps, Kubernetes,
Infrastructure as Code, CI/CD, GitOps, Observability, Security and SRE**.

The goal is simple:

**Learn → Practise → Build → Deploy**

Instead of collecting disconnected tutorials, EgyKode connects structured
chapters to ordered roadmaps, hands-on labs and deployable projects — and every
roadmap ends with something you can run, not a reading list.

## What is in the repository today

These numbers are counted from the corpus, not aspirational:

| | Count | |
|---|---|---|
| **Chapters** | 47 | Migrated from the `Cloud-Native-DevOps-Handbook` project |
| **Topics** | 74 | Across 12 areas — *derived from the content, never hand-authored* |
| **Labs** | 19 + 19 | Each guided lab has a challenge version with the steps removed |
| **Roadmaps** | 4 | 11, 8, 8 and 8 phases |
| **Projects** | 4 | With attribution and licence metadata |
| **Interview questions** | 215 | 161 extracted from the chapters, plus 54 commonly-asked interview questions |

> **Topics are measured, not claimed.** `scripts/build-topics.mjs` derives every
> topic from the corpus and publishes one only when a chapter genuinely teaches
> it or a lab practises it. A topic page can never promise material that is not
> there, and the count grows on its own as content is added.

## ✨ Why EgyKode?

Cloud and DevOps learning often becomes a list of tools:

> Linux → Docker → Kubernetes → Terraform → AWS → Jenkins → …

EgyKode organises those tools around **engineering concepts and outcomes**. For
each one you should understand why it exists, what problem it solves, how it
fits into a larger system, how to operate it, how to secure it — and how to
build something with it.

Every topic in the corpus is checked for five things by
`scripts/audit-topics.mjs`: a definition, the mechanism, something runnable,
**how it fails**, and **the trade-off against the alternative**. A topic that
defines a thing beautifully and never shows it breaking is not finished.

## 🗺️ Learning paths

| Roadmap | Phases | Focus |
|---|---|---|
| **Cloud DevOps Engineer** | 11 | End-to-end Cloud &amp; DevOps engineering |
| **AWS Cloud Engineer** | 8 | AWS infrastructure, networking, security and operations |
| **Kubernetes Specialist** | 8 | Kubernetes administration, networking, packaging and operations |
| **DevSecOps** | 8 | Security integrated throughout the delivery lifecycle |

The roadmaps are deliberately different curricula rather than the same one
under four names. Phases exist only when there is material behind them — a
roadmap page shows its own content gaps rather than padding the phase count.

## 📚 Learning

Structured chapters covering Linux, Networking, Git &amp; GitHub, Docker, AWS,
Terraform, Ansible, Kubernetes, Helm, Kustomize, Jenkins, GitHub Actions,
GitOps, Argo CD, Prometheus, Grafana, Logging, DevSecOps, SRE, Disaster
Recovery, FinOps and Platform Engineering.

Code is highlighted at build time with Shiki, so the browser never downloads a
syntax highlighter.

## 🧪 Hands-on labs

Reading is not enough. Every lab is built on one principle: **build it
yourself.**

Each lab has a practical objective, a guided implementation, verification
criteria you check yourself, and a **challenge version with the instructions
removed** — so you move from *follow* → *understand* → *rebuild* → *solve
independently*.

## 🚀 Projects

Projects are where the curriculum comes together. They can be built by the
EgyKode team, contributed by the community, or imported from public GitHub
repositories with attribution and licence intact:

```bash
node scripts/import-github-project.mjs owner/repo --featured
```

## 🧭 Status

Being honest about what is finished matters more than a long feature list.

| Area | Status |
|---|---|
| Chapters, topics, roadmaps, labs, projects | ✅ Available |
| Interview question bank | ✅ Available |
| Search (⌘K), dark/light themes, reading progress | ✅ Available |
| Courses | 🚧 Placeholder — announced, not built |
| Community (profiles, Q&amp;A, groups, chat) | 🚧 Planned |
| Jobs | 🚧 Planned |
| Accounts &amp; cross-device sync | 🚧 Planned — progress is stored in your browser today |
| Arabic (RTL) | ⏸️ Built, currently switched off |

**On Arabic:** the RTL layout, the Arabic UI catalogue and two pilot chapters
exist and work. It is switched off because a language switcher that leads to
mostly-English pages is worse than no switcher. Re-enabling it is one line —
add `"ar"` to `PUBLIC_LOCALES` in [`apps/web/lib/locales.ts`](apps/web/lib/locales.ts)
and the switcher, `hreflang`, sitemap, pre-rendered routes and test matrix all
follow.

## 🏁 Quick start

```bash
git clone https://github.com/Waleeddarwesh/EgyKode.git
cd EgyKode
npm install
npm run dev            # http://localhost:3000
```

Node 20+ is required.

### Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server, after rebuilding tokens, topics and the search index |
| `npm run build` | Production build |
| `npm run verify` | **The gate** — every check below, then the E2E suite |
| `npm run topics` | Regenerate topics from the corpus |
| `npm run audit:topics` | Report how completely each topic is explained |
| `npm run test:e2e` | Playwright critical paths |

### The checks

`npm run verify` runs these in order, and each one exists because something
broke once:

| Check | Catches |
|---|---|
| `lint:mdx` | Unescaped MDX hazards (`{`, `<`) outside code fences |
| `content:lint` | Dead cross-links, banned phrasing, unlabelled code fences |
| `lint:rtl` | Physical-direction CSS that breaks RTL |
| `check:translation` | Translated code blocks, drifted headings, transliterated product names |
| `typecheck` · `lint` | TypeScript strict, ESLint with zero warnings |
| `build:verify` | Full production build into an isolated directory |
| `test:e2e` | Critical reader paths, in every published locale |

> `build:verify` builds into `.next-verify` rather than `.next` on purpose:
> `next dev` and `next build` share an output directory, so verifying while a
> dev server is running used to rewrite its asset hashes and leave every
> stylesheet 404-ing.

## 🧱 Architecture

```text
apps/web/          Next.js 15 App Router · React 19 · TypeScript (strict)
content/           MDX chapters, labs, JSON roadmaps, projects, questions
packages/          Design tokens — one source of truth for colour
scripts/           Migration, generation and quality-gate tooling
docs/master/       The specification, by section
```

Three decisions shape everything:

1. **Static content, dynamic community.** Chapters, roadmaps and labs build to
   static files on a CDN and never touch a backend. That is what makes running
   this nearly free.
2. **No NAT Gateway, no ALB, no EKS.** Those three cost roughly $125/month and
   are why most AWS free-tier projects generate a bill.
3. **Content-derived structure.** Topics, statistics and phase counts are
   computed from the corpus, so the site cannot advertise more than it teaches.

Running cost is about **$0.87/month** in year one (the domain; compute is inside
the AWS free tier) and **$6–14/month** at steady state.

## 📖 Documentation

[`MASTER_PROMPT.md`](MASTER_PROMPT.md) is the single source of truth — roughly
24,000 words covering vision, design system, i18n, architecture,
infrastructure, content standards and delivery phases. It is assembled from
[`docs/master/`](docs/master):

```bash
cat docs/master/*.md > MASTER_PROMPT.md
```

## 🤝 Contributing

Contributions are welcome — chapters, labs, projects, fixes and translations.

1. Fork and branch from `main`.
2. Make the change.
3. Run `npm run verify` — it must be green.
4. Open a pull request describing what a reader can now do that they could not
   before.

Adding a chapter or lab needs no code: add the MDX under `content/`, run
`npm run topics`, and the topic pages, search index and roadmap counts update
themselves.

## 📄 Licence

Code is **MIT**. Content — chapters, labs and diagrams — is
**CC BY-SA 4.0**. Imported projects keep their original licence and attribution.

<div align="center">

Built in the open, in Egypt, for everyone.

</div>
