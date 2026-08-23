# Search indexing: reading the Search Console reports

Search Console reports what Google *found*, not what is *wrong*. A large share
of what it lists under "Page with redirect" is the site working exactly as
intended and will never clear, while a genuine fault can sit inside "Not found
(404)" looking identical to junk. This is the record of which is which, and how
each one was diagnosed, so the next report can be triaged in minutes rather than
re-derived.

The site is a static export behind CloudFront. There is no server and no Next
middleware in production — `output: export` removes both. **All** routing is the
viewer-request function in
`infrastructure/terraform/production/cloudfront.tf`, tested by
`scripts/test-edge-router.mjs`, which reads the function out of the Terraform
heredoc rather than from a copy. If a URL misbehaves in production, that
function is where the answer is.

---

## The one rule that explains most of it

`trailingSlash: true`. The canonical form of every page URL ends in a slash:

    /en/learn/aws/vpc/     canonical, 200
    /en/learn/aws/vpc      308 → the above

So *any* URL emitted anywhere without its trailing slash becomes a redirect the
moment Google follows it. Most "Page with redirect" reports trace back to
something emitting the unslashed form.

---

## "Page with redirect" — 83 URLs, and most of them are correct

Three groups, only one of which was a defect.

### Permanently expected — will never clear, and should not

    http://egykode.com/                     → https  (301)
    https://www.egykode.com/en/topics/      → apex   (301)
    https://egykode.com/                    → /en/   (308)

These are host and root canonicalisation. Google knows the URLs, so it lists
them; a redirect is the correct answer and the report is not asking for a fix.
Removing these redirects would be the actual bug — the site would then serve
identical content on four hostnames and split its own ranking signals.

**Do not "fix" these.** Confirm the destination is right and move on.

### The real defect — structured data emitted unslashed URLs

Rows like `https://egykode.com/en/learn/terraform/terraform` — the canonical
page, minus its slash. Nothing on the site *linked* to that form. The JSON-LD
did: breadcrumbs and `url` fields were built from raw content paths, so every
breadcrumb trail Google followed pointed one redirect away from the real page.
Structured data is crawled like anything else.

Fixed by the `pageUrl()` helper in `apps/web/lib/structured-data.ts`, which
appends the slash for anything that is a page and leaves fragments (`/#organization`)
and files (`/icon.svg`) alone.

Chapters and labs dominate the list because breadcrumbs are what point at them.

### Already-superseded URLs

`/en/learn/courses` was a "coming soon" placeholder that shipped before the real
`/courses` page and named the homepage as its canonical. The page is deleted and
the router 308s the old URL to the real one.

---

## "Not found (404)" — 13 URLs, three different causes

This is the report worth reading carefully, because the three causes need three
different responses.

### A. Locale-less content paths — a genuine bug, now fixed

    https://egykode.com/learn/aws/vpc
    https://egykode.com/learn/kubernetes/kubernetes
    https://egykode.com/learn/prometheus/prometheus
    https://egykode.com/learn/sre/disaster-recovery

Every one of these pages exists, one segment away, at `/en/learn/…/`.

What made it non-obvious is that they did not 404 directly. The router had no
locale rule beyond `/` → `/en/`, so `/learn/aws/vpc` — no extension, therefore
treated as a page — fell through to the trailing-slash branch at the bottom of
the function, 308'd to `/learn/aws/vpc/`, and *that* resolved to no
`index.html`. A redirect chain ending in a 404. Anyone testing the redirect in
isolation would see a perfectly good 308 and conclude the routing was fine.

Fixed by a locale-less redirect in the router: `/learn/aws/vpc` → `/en/learn/aws/vpc/`
in one hop, with the trailing slash added there so it is not two.

It is an **allow-list** of the segments that exist under `/en/`, deliberately,
not a catch-all for "paths without a locale". The bucket root also holds
`/privacy/`, `/offline/`, `/icons/`, `/authors/`, `/brand/`, `/diagrams/`,
`/search/` and the metadata files, none of which live under a locale. A
catch-all would redirect all of those into `/en/`, where they do not exist —
breaking working URLs in the course of fixing broken ones. `test-edge-router.mjs`
pins both directions, including that `/learning-resources` is not caught by the
`learn` entry.

### B. Metadata images — fixed earlier, awaiting recrawl

    https://egykode.com/en/learn/argocd/argocd/opengraph-image?…

Next writes metadata images as extensionless *files*: `…/opengraph-image` is a
PNG, not a directory. Having no dot, all 58 were treated as pages by the
trailing-slash rule and redirected to a URL that resolved to nothing — so every
chapter advertised an `og:image` that 404'd, and every share of a chapter on
LinkedIn or WhatsApp lost its preview.

Already fixed in the router, which now serves the four metadata names as-is, and
in the deploy workflow, which uploads them with an explicit `image/png` type
(`s3 sync` infers `binary/octet-stream` from the missing extension, which every
social scraper refuses).

The last-crawled dates on these rows are 14–16 August, which predate the fix.
Nothing further to do but let Google recrawl.

### C. URL-shaped strings out of code samples — correctly 404, leave them

    https://egykode.com/metrics
    https://egykode.com/spec/replicas
    https://egykode.com/28

These are not links and never were. They are fragments of the curriculum that
happen to look like paths: `/metrics` is the Prometheus scrape endpoint,
`/spec/replicas` a `kubectl` JSONPath, and `/28` the prefix length from a CIDR
block in the VPC chapter. Nothing on the site links to them — grepping the whole
export for `href="/metrics"` and the other two returns zero pages.

A 404 is the correct response. There is no fix, and inventing pages to satisfy
them would be worse than the report. Google drops URLs like this on its own.

The one thing that *was* worth fixing is what those visitors saw when they
arrived — see below.

---

## The 404 page itself

CloudFront maps both 404 and 403 to `/404.html`, so that one file is what every
wrong URL on the site serves.

It used to be Next's built-in default: "404: This page could not be found." in
the browser's default font, on a white page, with no branding and no link
anywhere. It rendered that way because `app/layout.tsx` is a pass-through — it
returns bare `children` so that `app/[locale]/layout.tsx` can own `<html>` and
put the right `lang` and `dir` on it — and nothing else supplied a document.

`apps/web/app/not-found.tsx` now renders its own `<html>`, which is valid
precisely because the root layout wraps children in no element. The 404 page has
the site's fonts, theme, and three ways back into the curriculum.

The same root cause had left `/privacy/` and `/offline/` without a document
shell; those are fixed by the `(standalone)` route group. `check-export`
asserts an `<h1>` on every page in the export, the 404 included.

One thing worth knowing if you edit that file: it needs its `metadata` export,
and both fields in it are load-bearing. Because the page renders its own
`<head>`, Next appends the inherited root-layout metadata into it — so without
an explicit `title` the page ships two `<title>` tags, and without an explicit
`robots` it ships the root layout's `index, follow` alongside the `noindex`
Next adds for a not-found page. Both were measured on the built output, not
assumed. The `robots` line looks redundant next to Next's automatic `noindex`
and is not.

---

## Triage checklist for the next report

1. **Is the destination correct?** If the URL redirects somewhere sensible, it
   is not a defect. Host and root canonicalisation live here permanently.
2. **Does the page exist under a different URL?** If yes, it is a routing gap —
   the router is the fix, and it needs a test in `test-edge-router.mjs`.
3. **Follow the whole chain, not the first hop.** The locale-less bug produced a
   valid-looking 308 whose destination 404'd. A single `curl -I` would have
   shown a healthy redirect.
4. **Check whether anything actually links to it.** `grep -r 'href="/thing"'`
   over the export. Nothing linking to it means Google found a string, not a
   page, and there is nothing to fix.
5. **Check the last-crawled date against the fix date** before concluding a fix
   failed. Several rows in these reports were already fixed and simply not
   recrawled.

After deploying a routing change, request validation in Search Console for the
affected issue. Validation runs over the URLs already in the report; new URLs
are picked up on the next crawl, not by the validation run.

---

## Where each mechanism lives

| Concern | File |
| --- | --- |
| All production routing | `infrastructure/terraform/production/cloudfront.tf` |
| Routing tests | `scripts/test-edge-router.mjs` |
| Canonical URLs in structured data | `apps/web/lib/structured-data.ts` |
| Sitemap URLs | `apps/web/app/sitemap.ts` |
| The 404 page | `apps/web/app/not-found.tsx` |
| Export invariants (`h1`, assets, preload) | `scripts/check-export.mjs` |
| Upload and content types | `.github/workflows/deploy-production.yml` |

Note that `redirects()` in `next.config.mjs` does **nothing** in production —
the build prints a warning saying so. It is kept only so `next dev` behaves like
the deployed site. Any redirect that must work in production belongs in the
CloudFront function.
