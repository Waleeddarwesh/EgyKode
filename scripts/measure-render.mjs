/**
 * Render cost of the heaviest pages, on a throttled mobile profile.
 *
 * Bytes are only half the story: the topics and question-bank pages are tiny
 * compressed (16kB and 52kB brotli) but render 148 and 215 cards. Layout and
 * paint are what a phone actually struggles with, so this measures those.
 *
 * Run: node scripts/measure-render.mjs [origin]
 */
import { chromium } from "@playwright/test";

const ORIGIN = process.argv[2] ?? "http://localhost:3210";

const PAGES = [
  ["home", "/en"],
  ["topics", "/en/topics"],
  ["questions", "/en/prepare/questions"],
  ["chapter", "/en/learn/kubernetes/kubernetes"],
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 780 },
  deviceScaleFactor: 2,
});

console.log("page         nodes   rendered   LCP      CLS     longTasks  transfer");
console.log("-".repeat(74));

for (const [name, path] of PAGES) {
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  // A mid-range phone, not the developer's laptop.
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  let transfer = 0;
  page.on("response", async (r) => {
    try {
      const len = Number((await r.allHeaders())["content-length"] ?? 0);
      transfer += len;
    } catch {}
  });

  await page.goto(ORIGIN + path, { waitUntil: "load" });
  await page.waitForTimeout(1200);

  const m = await page.evaluate(async () => {
    const lcp = await new Promise((resolve) => {
      let value = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) value = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(value), 400);
    });
    let cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });

    const long = performance.getEntriesByType("longtask")?.length ?? 0;
    const all = document.getElementsByTagName("*").length;
    // Elements the browser actually laid out — content-visibility skips the rest.
    const rendered = [...document.querySelectorAll(".list-virtual > *, .reveal-items > *")]
      .filter((el) => el.getBoundingClientRect().height > 0).length;

    return { lcp: Math.round(lcp), cls: cls.toFixed(3), long, all, rendered };
  });

  console.log(
    `${name.padEnd(12)} ${String(m.all).padStart(5)}   ${String(m.rendered).padStart(8)}   ` +
      `${String(m.lcp + "ms").padEnd(8)} ${m.cls.padEnd(7)} ${String(m.long).padStart(9)}  ` +
      `${(transfer / 1024).toFixed(0)}kB`,
  );
  await page.close();
}

await browser.close();
