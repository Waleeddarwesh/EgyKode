# Bundled fonts

These `.woff2` files are redistributed with EgyKode. All four families are
published under the **SIL Open Font License 1.1**, which permits bundling and
redistribution. The licence text and full source for each are at the links
below.

Only the subsets the site actually uses are included — `latin` for the three
Latin families and `arabic` for IBM Plex Sans Arabic — which is why these are
265KB rather than the couple of megabytes the complete subset set would be.

| Family | Files here | Upstream |
|---|---|---|
| Inter | `inter-100-900.woff2` (variable) | https://github.com/rsms/inter |
| Space Grotesk | `space-grotesk-500-700.woff2` (variable) | https://github.com/floriankarsten/space-grotesk |
| JetBrains Mono | `jetbrains-mono-400-700.woff2` (variable) | https://github.com/JetBrains/JetBrainsMono |
| IBM Plex Sans Arabic | `plex-arabic-{400,500,600,700}.woff2` | https://github.com/IBM/plex |

Licence: https://openfontlicense.org — see each repository above for the
`OFL.txt` that ships with the family.

## Why these are in the repository

`next/font/google` downloads each family from `fonts.gstatic.com` during the
build. That put a network dependency on the critical path of every release, and
it failed a deploy — three retries inside `next/font`, all timing out, on a
commit with nothing wrong with it.

Runtime behaviour is unchanged: `next/font` already self-hosted these, so the
browser never contacted Google before and still does not. The only thing that
changed is that building no longer needs the public internet.

To refresh a family, download the `woff2` for the needed subset from its
upstream release and replace the file; `lib/fonts.ts` references them by name.

One thing to watch when doing that: Google's CSS API serves the *same variable
file* for every weight you request of a variable family. Asking for 400, 500
and 700 of JetBrains Mono returned three byte-identical downloads. Declare
those as a single face with a weight range, not as separate static weights —
pinning a variable font to one weight loses real bold.
