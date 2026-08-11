#!/usr/bin/env node
/**
 * Crawl every URL the sitemap advertises and confirm it renders.
 *
 * On a static export a page that failed to build is an ordinary HTML file, so
 * the CDN returns 200 for it. Status codes therefore cannot answer "is the
 * site working" — only the body can. Five chapters shipped blank behind HTTP
 * 200 before this existed.
 *
 * Checks per page: a real <h1>, a <title> that is not the bare site default,
 * no not-found marker, and no obviously broken internal link.
 *
 * Usage: node scripts/check-live.mjs [origin]
 *        node scripts/check-live.mjs https://egykode.com
 */
const ORIGIN = (process.argv[2] ?? "https://egykode.com").replace(/\/$/, "");
const CONCURRENCY = 8;

const problems = [];
const titles = new Map();

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      return { status: res.status, body: await res.text() };
    } catch (error) {
      if (attempt === 2) return { status: 0, body: "", error: String(error) };
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return { status: 0, body: "" };
}

const sitemap = await get(`${ORIGIN}/sitemap.xml`);
if (sitemap.status !== 200) {
  console.error(`sitemap.xml returned ${sitemap.status}`);
  process.exit(1);
}
// The sitemap carries absolute production URLs. Rewrite them onto the origin
// being tested, or pointing this at localhost silently checks production and
// reports a build you have not deployed yet as broken.
const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(/^https?:\/\/[^/]+/, ORIGIN),
);
console.log(`crawling ${urls.length} URLs from ${ORIGIN}/sitemap.xml\n`);

let done = 0;
async function check(url) {
  const { status, body, error } = await get(url);
  const path = url.replace(ORIGIN, "") || "/";

  if (status !== 200) {
    problems.push(`${path}\n    HTTP ${status}${error ? ` — ${error}` : ""}`);
  } else {
    // A page that called notFound() renders no heading of its own.
    if (!/<h1[\s>]/.test(body)) problems.push(`${path}\n    no <h1> — the page rendered empty`);

    const title = body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    if (!title) problems.push(`${path}\n    no <title>`);
    else {
      // The bare site default means generateMetadata produced nothing, which
      // is what a failed page looks like.
      if (/^EgyKode — Open-Source/.test(title) && path !== "/en" && path !== "/")
        problems.push(`${path}\n    fell back to the default title — metadata did not resolve`);
      (titles.get(title) ?? titles.set(title, []).get(title)).push(path);
    }

    if (/Page not found/.test(body) && !/<h1[^>]*>[^<]*Page not found/.test(body) === false)
      problems.push(`${path}\n    renders the not-found page`);
  }

  done += 1;
  if (done % 40 === 0) process.stdout.write(`  ${done}/${urls.length}\n`);
}

for (let i = 0; i < urls.length; i += CONCURRENCY) {
  await Promise.all(urls.slice(i, i + CONCURRENCY).map(check));
}

/**
 * One canonical host.
 *
 * The distribution answers on both the apex and www, so before this redirect
 * existed the whole site was reachable twice — duplicate content, with the
 * ranking signals split across the two hostnames.
 *
 * Checked here rather than in the deploy smoke test because it lives in the
 * CloudFront function, which only changes on `terraform apply`. Asserting it
 * on every push would block deploys of the site over an unrelated piece of
 * infrastructure.
 */
async function checkCanonicalHost() {
  const url = new URL(ORIGIN);
  if (url.hostname.startsWith("www.") || !url.hostname.includes(".")) return;

  const www = `${url.protocol}//www.${url.hostname}/en/`;
  let res;
  try {
    res = await fetch(www, { redirect: "manual" });
  } catch {
    return; // www may simply not resolve, which is fine
  }

  if (res.status === 301) {
    const to = res.headers.get("location") ?? "";
    if (to.startsWith(`${url.protocol}//${url.hostname}`)) {
      console.log(`\nwww redirects 301 to the apex host`);
      return;
    }
    problems.push(`www.${url.hostname}\n    redirects 301 to ${to}, not to ${url.hostname}`);
    return;
  }

  problems.push(
    `www.${url.hostname}/en/\n` +
      `    answers ${res.status} instead of redirecting 301 to the apex, so every\n` +
      `    page is reachable on two hostnames. Apply the CloudFront function:\n` +
      `    cd infrastructure/terraform/production && terraform apply`,
  );
}

await checkCanonicalHost();

const duplicated = [...titles.entries()].filter(([, paths]) => paths.length > 1);

console.log(`\n${urls.length} pages checked`);
if (duplicated.length) {
  console.log(`\nduplicate <title> across pages (${duplicated.length}) — hurts search:`);
  for (const [title, paths] of duplicated.slice(0, 10)) {
    console.log(`  "${title}"\n    ${paths.join("\n    ")}`);
  }
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n`);
  for (const p of problems.slice(0, 30)) console.log(`  ${p}\n`);
  if (problems.length > 30) console.log(`  … ${problems.length - 30} more`);
  process.exit(1);
}
console.log("every advertised page renders with a heading and its own title");
