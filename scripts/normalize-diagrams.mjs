#!/usr/bin/env node
/**
 * Keep ASCII diagrams aligned in a proportional-agnostic way.
 *
 * A diagram drawn with box characters is a grid: every glyph must occupy
 * exactly one cell or the right-hand border walks off. Most box-drawing
 * characters (U+2500 and friends) are East Asian Width "Ambiguous" and render
 * single-width in every monospace font in practice, so they are fine.
 *
 * The triangles and double lines are not. `▶ ◀ ▲ ▼ ═ ║` are also Ambiguous,
 * but many fonts give them emoji-ish or double-width advances — so a line
 * containing two of them ends up two cells wider than its neighbours, and the
 * closing `│` of each row lands at a different x. That is what a reader sees
 * as a "broken" diagram even though the source is arithmetically perfect.
 *
 * Substitutions are strictly one character for one character, so padding that
 * was correct in the source stays correct.
 *
 * Only blocks that actually contain box-drawing characters are touched.
 * Elsewhere in a fence an arrow is prose, alignment is irrelevant, and `→`
 * reads better than `>`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Node 20 has no stable fs.globSync, so walk. */
function mdxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return mdxFiles(path);
    return entry.name.endsWith(".mdx") ? [path] : [];
  });
}

const SUBS = new Map([
  ["▶", ">"], ["►", ">"], ["→", ">"],
  ["◀", "<"], ["◄", "<"], ["←", "<"],
  ["▲", "^"], ["▼", "v"],
  ["═", "="], ["║", "|"],
]);

const BOX = /[┌┐└┘│─├┤┬┴┼]/;

/** Rows of a box: start and end on a box glyph, and are not bare connectors. */
const EDGE = "┌┐└┘├┤┬┴┼│";
function misalignedRows(body) {
  const rows = body
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      if (!EDGE.includes(trimmed[0]) || !EDGE.includes(trimmed.at(-1))) return false;
      return [...trimmed].some((c) => c !== "│" && c !== " ");
    });
  if (rows.length < 2) return null;
  const widths = new Set(rows.map((r) => [...r].length));
  return widths.size > 1 ? rows : null;
}

const check = process.argv.includes("--check");
const files = mdxFiles("content");
let changed = 0;
let glyphs = 0;
const problems = [];

for (const file of files) {
  const original = readFileSync(file, "utf8");
  // `\r?\n`: these files are CRLF on Windows and readFileSync does not
  // normalise, so a fence regex written as ```lang\n silently matches nothing.
  const next = original.replace(/```[a-z]*\r?\n([\s\S]*?)```/g, (whole, body) => {
    if (!BOX.test(body)) return whole;
    let out = whole;
    for (const [from, to] of SUBS) {
      const count = out.split(from).length - 1;
      if (count) {
        glyphs += count;
        if (check) problems.push(`${file}  ${count}x "${from}" in a box diagram — use "${to}"`);
        out = out.split(from).join(to);
      }
    }
    const rows = misalignedRows(out);
    if (rows) {
      problems.push(
        `${file}  box rows are not the same width: ${[...new Set(rows.map((r) => [...r].length))]
          .sort((a, b) => a - b)
          .join(", ")}`,
      );
    }
    return out;
  });
  if (!check && next !== original) {
    writeFileSync(file, next, "utf8");
    changed += 1;
    console.log(`  ${file}`);
  }
}

if (check) {
  for (const p of problems) console.error(`  ${p}`);
  console.log(
    problems.length
      ? `\ndiagram lint — ${problems.length} problem(s). Run: node scripts/normalize-diagrams.mjs`
      : `\ndiagram lint — ${files.length} files, all diagrams aligned`,
  );
  process.exit(problems.length ? 1 : 0);
}

console.log(`\nnormalised ${glyphs} glyph(s) across ${changed} file(s)`);
