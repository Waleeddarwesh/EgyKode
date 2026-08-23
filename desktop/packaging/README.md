# Packaging

Generated artefacts live here and are **not committed** — a `.msixbundle` is a
build output, and a signing certificate is a secret.

## What PWABuilder needs

The live site with `manifest.webmanifest`, `sw.js` and the three icons
published. It reads them from the URL; nothing is uploaded from this folder.

## What it produces

| File | Use |
| --- | --- |
| `*.msixbundle` | Upload to Partner Center |
| `*.appinstaller` + test certificate | Local testing only — never submit |
| Store logo set | Generated from the manifest icons |

Keep the identity values PWABuilder asks for in `../store/listing.md`, filled in
from Partner Center after you reserve the name. Do not guess them.

Run `npm run desktop:verify` before generating a package.
