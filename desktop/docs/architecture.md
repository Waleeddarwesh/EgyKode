# Desktop architecture

## The decision

EgyKode Desktop is the EgyKode website, packaged as an MSIX and installed from
the Microsoft Store. There is no second renderer, no second content store and no
second build of the curriculum.

```
content/  ── 57 chapters · 114 labs · roadmaps · projects · courses
    │        (canonical, and the only copy)
    ▼
apps/web  ── Next.js static export + manifest + service worker
    │
    ├──────────────► egykode.com                 browser, any platform
    └──────────────► MSIX via PWABuilder         Microsoft Store, Windows
```

## Why the manifest and service worker live in `apps/web`

They are not desktop files. `app/manifest.ts`, `public/sw.js` and the icon routes
make the **website** installable — which is what makes a Windows package
possible, and which improves the site for everyone at the same time.

Putting them in `desktop/` would mean the packaging step had its own copy of the
app's identity, and the two would drift the first time a colour or a name
changed. There is one manifest, and the Store package is generated from it.

## What is actually in `desktop/`

Only things that have no meaning on the web:

| Path | Contains |
| --- | --- |
| `docs/` | This file, the offline model, the update model, publishing steps |
| `store/` | Listing text, asset requirements, submission checklist |
| `scripts/` | Validation that runs before a package is built |
| `tests/` | The parity test that proves this architecture still holds |
| `assets/` | Store artwork only — never app content |
| `packaging/` | PWABuilder configuration and package notes |

## Why not Electron

The brief asked for the same content in both clients with no manual sync. That
requirement decides the technology before anything else is considered.

Electron ships a copy of the application inside the installer. A chapter
correction would then require a new Windows package, a Store review, and a
learner who has not updated reading last month's chapter. That is precisely the
"two content platforms" outcome the architecture is meant to prevent.

The usual argument for Electron is a capability the web cannot reach. EgyKode
does not have one — the labs run on Killercoda or on the learner's own machine,
not inside the app — so the argument does not apply here.

| | PWA → MSIX | Electron |
| --- | --- | --- |
| Content sync | Automatic, on next launch | New package, Store review |
| Package size | ~1 MB shell | 80–150 MB |
| Runtime to patch | Edge WebView2, patched by Windows | A Chromium you maintain |
| Offline | Service worker cache | Bundled copy |

## Routes and deep links

Routes are identical, because they are the same pages:

```
/en/learn/linux/linux-foundations/
/en/labs/lab-23-git-branching-collaboration/
/en/roadmaps/cloud-devops-engineer/
```

A packaged PWA can also register a URI scheme, so `egykode://` links open the
installed app at the same route. That is a shell capability; it resolves to the
same content either way.

## What the desktop shell may add

Interface only. Split view, a command palette, focus mode, bookmarks, notes,
recent activity, window management, offline downloads. None of these change what
a chapter says or what a lab asks for.

Bookmarks and notes must reference canonical identifiers — `contentId`,
`labId` — and never store a copy of the content they point at. A note that
embeds the chapter text becomes a second source of truth the moment the chapter
is corrected.

## The rule, restated

> EgyKode Desktop is not another version of EgyKode. It is EgyKode, installed on
> Windows.

`desktop/tests/content-parity.mjs` enforces the mechanical half of that: no
content files under `desktop/`, every representative route resolving in the same
export, and a manifest whose scope keeps the app inside it. Run it before every
package build.
