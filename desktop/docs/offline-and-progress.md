# Offline reading, and where progress lives

## Offline is a cache, never a second source

Everything readable offline was fetched from egykode.com and kept. Nothing is
bundled into the package, and nothing is authored for offline use. When the
network returns, pages are refetched and the cache is replaced.

That ordering matters. The service worker uses **network-first for pages**: when
you are online you always see what the site currently says, and the cached copy
is only reached for when the network is not there. A stale chapter is the exact
failure this architecture exists to prevent, so the cache never wins a race
against the network.

## What gets cached, and when

| Layer | Strategy | Size |
| --- | --- | --- |
| App shell — JS, CSS, fonts, icons | Cache-first, fingerprinted so it can never be stale | ~1.4 MB |
| Pages you open | Network-first, kept afterwards | ~120 KB each |
| Pages you save deliberately | Fetched on request | Your choice |

**Nothing downloads the whole curriculum at install.** The export is about 35 MB
of HTML, and pulling that onto someone's machine — possibly a metered
connection — because they installed an app would be a decision made on their
behalf. Install cost is the shell only.

Saving for offline is therefore an action the learner takes, on a connection
they know about. The service worker accepts an `egykode:save-offline` message
with a list of canonical URLs and reports progress as it fetches them.

## Being honest in the interface

Two states have to be visible, because the difference is real:

**Available offline** — chapters, labs, roadmaps and projects you have opened,
plus anything saved deliberately. All the reading.

**Needs a connection** — running a lab in a browser terminal, anything that
talks to a cloud provider, and community pages. The practice is somewhere else
by design; a terminal is not something a cache can hold.

The `/offline/` page says exactly this when a page is requested that has not
been saved.

## Progress: one model, and a limitation worth stating plainly

There is **one** progress model, in `apps/web/lib/progress.ts`, used by both
clients because both clients are the same application. The desktop app does not
implement its own.

But EgyKode has no accounts, and progress is stored in `localStorage` on the
device. Two consequences follow, and neither should be hidden from a learner:

1. **Progress does not sync between devices.** Marking a chapter complete on
   your laptop does not mark it complete on your phone. There is no server
   holding it, which is also why nothing about your reading is collected.

2. **The browser and the installed app may not share storage.** They are
   separate contexts on Windows. Progress made in the app may not appear in a
   browser tab, and the reverse.

The brief asks that a learner start a lab on the web, open desktop, and
continue. **That is not true today, and this document says so rather than
implying otherwise.** It would require an account system, which would mean
collecting data the project currently collects none of. That is a product
decision, not an oversight, and the trade — no sync, no tracking — is worth
stating openly.

What is guaranteed today: the same chapters, the same labs, the same criteria,
the same rules for what counts as complete. The state is local; the model is
shared.

## If accounts are added later

The desktop client needs no change. It is the same application, so it inherits
whatever the web app does — which is the point of building it this way.
