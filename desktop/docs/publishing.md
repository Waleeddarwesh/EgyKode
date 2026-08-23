# Publishing to the Microsoft Store

## Cost

**None.** Microsoft removed the developer registration fee — Individual and
Company accounts both onboard free through
[storedeveloper.microsoft.com](https://storedeveloper.microsoft.com), which is
the only entry point for the new flow. Identity verification with a government
ID is required; payment is not.

PWABuilder is free and open source. Hosting is the site you already run.

## Blockers to clear first

| Blocker | Status |
| --- | --- |
| Privacy policy at a reachable URL | **Done** — `/privacy/`, required by Partner Center and the most common reason a first submission is rejected |
| Web app manifest with 192, 512 and maskable icons | **Done** — generated from the site's own mark |
| Service worker with an offline fallback | **Done** |
| App name reserved in Partner Center | **You** — this assigns the package identity |
| Support contact address | **You** — an address you will actually read |

## Steps

**1. Create the developer account.** Start at
`https://storedeveloper.microsoft.com`, choose Individual, verify your identity.
Other entry points show the legacy paid flow.

**2. Reserve the name.** In Partner Center, reserve `EgyKode`. This produces the
package identity, publisher ID and package family name. Record them in
`store/listing.md` — do not guess them, and do not commit them anywhere they
would be treated as secrets.

**3. Deploy the site with the PWA assets.** PWABuilder reads the live site, so
the manifest, service worker and icons must be published first.

```bash
npm run desktop:check      # manifest, icons, offline page, Store metadata
npm run desktop:parity     # one content source, all routes resolving
```

**4. Generate the package.** Go to [pwabuilder.com](https://www.pwabuilder.com),
enter `https://egykode.com`, and package for Windows. Supply the identity values
from step 2. PWABuilder produces:

- `.msixbundle` — upload this
- `.appinstaller` / test certificate — for local testing only, never for the Store
- Store logo assets generated from the manifest icons

**5. Test the package locally before submitting.** Install the test build and
check, in order:

- It opens on `/en/`
- Navigation stays inside the app — no page opens a browser window
- Disconnect the network: pages you opened still read, and an unvisited page
  shows the offline page rather than a browser error
- The taskbar jump list shows Learn, Labs and Roadmaps, and each opens the right
  page
- The icon is not clipped in the Start menu

**6. Submit.** Upload the bundle, paste the listing from `store/listing.md`, add
the screenshots, and set the privacy URL to `https://egykode.com/privacy/`.

Certification usually takes a few hours to a few days.

## After publishing: two different updates

This is the part that makes the architecture worth it.

**Content changed** — a chapter correction, a new lab, a roadmap edit. Deploy
the website. Installed apps pick it up on next launch, because they load the
same site. **No new package, no Store review, no waiting.**

**Client changed** — the app name, an icon, a manifest field, a new shell
capability. Rebuild with PWABuilder and submit a new package.

Almost everything EgyKode does is the first kind. If you find yourself
submitting a package for a content fix, something has gone wrong with the
architecture and it is worth stopping to find out what.

## What not to do

- **Do not commit a certificate or signing key.** Partner Center signs Store
  packages; a local test certificate is for your machine only.
- **Do not put content in the package.** Anything bundled becomes a second copy
  that ages. `desktop:parity` fails the build if content appears under
  `desktop/`.
- **Do not claim desktop-only content in the listing.** The curriculum is
  identical. Only the interface and offline reading differ.
