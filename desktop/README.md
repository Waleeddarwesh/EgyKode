# EgyKode Desktop

EgyKode, installed on Windows. Not a second product, not a fork of the
curriculum, and not a reduced version of the site.

## The rule this folder exists to enforce

**There is one canonical source of content: the EgyKode web application.**

This folder contains packaging, Store metadata, scripts, docs and tests. It
contains **no chapters, no labs, no roadmaps, no JSON content of any kind**. If
you ever find yourself copying a `.mdx` file in here, the architecture has been
broken and the fix is to stop, not to keep going.

```
                    content/   (57 chapters · 114 labs · roadmaps · projects)
                        │
                        ▼
                 apps/web  — the canonical renderer, built as a PWA
                    /              \
                   ▼                ▼
            Browser              Windows app
          (any platform)      (MSIX from the same PWA)
```

The Windows app *is* the web app. The same HTML, the same routes, the same
progress rules, wrapped in a Windows shell and cached for offline use.

## Why a PWA and not Electron

The brief asked for the same content in both clients with no manual sync, and
that requirement decides the technology on its own.

| Approach | Content sync | Package size | Cost |
| --- | --- | --- | --- |
| **PWA → MSIX** (chosen) | Automatic — it loads the same site | ~1 MB shell | Free |
| Electron | Manual — you ship a copy of the app | 80–150 MB | Free, but a second runtime to patch |
| Native (WinUI) | Manual — a second renderer to build | Large | A whole second implementation |

Electron would mean a second copy of the application, a second Chromium to keep
patched, and a Store submission for every chapter correction. A PWA gets a
content fix to Windows users the moment the site deploys, without a new package.

The one thing that would justify Electron is a capability the web platform
cannot reach. EgyKode does not have one: the labs run in a terminal on
Killercoda or on the learner's own machine, not inside the app.

## Cost

**Zero.** Microsoft removed the developer registration fee — Individual and
Company accounts both onboard free through
[storedeveloper.microsoft.com](https://storedeveloper.microsoft.com). Identity
verification is required; payment is not. PWABuilder is free and open source.

## What lives where

| Concern | Where |
| --- | --- |
| Chapters, labs, roadmaps, projects | `content/` — canonical, untouched |
| Rendering, routes, progress, search | `apps/web/` — canonical |
| Web app manifest, service worker, icons | `apps/web/` — because the **web** app is the PWA |
| Store listing, packaging, validation, desktop docs | `desktop/` — this folder |

Note the third row. The manifest and service worker are not desktop files. They
make the *website* installable, which is what makes the Windows app possible —
and they improve the site for everyone at the same time.

```
desktop/
├── README.md          this file
├── docs/              architecture, offline model, update model, publishing
├── store/             Store listing text, metadata, asset requirements
├── scripts/           package validation, manifest checks
├── assets/            Store-only artwork (not app content)
├── packaging/         PWABuilder configuration and generated package notes
└── tests/             web ↔ desktop content parity
```

## Updating

Two separate lifecycles, and keeping them separate is the point:

- **Content change** — a chapter correction, a new lab, a roadmap edit. Deploy
  the website. Windows users receive it on next launch. **No Store submission.**
- **Client change** — an icon, the app name, a new capability, a manifest field.
  Rebuild the package and submit to the Store.

Almost everything EgyKode does day to day is the first kind.

## Getting started

```bash
npm run desktop:check      # validate manifest, icons and Store metadata
npm run desktop:parity     # prove web and desktop resolve the same content
```

See [docs/publishing.md](docs/publishing.md) for the Store submission steps.
