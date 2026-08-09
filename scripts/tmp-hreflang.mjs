/**
 * Rewrite hardcoded { en: ..., ar: ... } hreflang maps to languageAlternates(),
 * so the set of advertised locales has one source of truth.
 */
import { readFileSync, writeFileSync } from "node:fs";

const files = [
  "apps/web/app/[locale]/labs/page.tsx",
  "apps/web/app/[locale]/labs/[slug]/page.tsx",
  "apps/web/app/[locale]/layout.tsx",
  "apps/web/app/[locale]/learn/page.tsx",
  "apps/web/app/[locale]/learn/[domain]/[slug]/page.tsx",
  "apps/web/app/[locale]/prepare/questions/page.tsx",
  "apps/web/app/[locale]/projects/page.tsx",
  "apps/web/app/[locale]/projects/[slug]/page.tsx",
  "apps/web/app/[locale]/roadmaps/page.tsx",
  "apps/web/app/[locale]/roadmaps/[slug]/page.tsx",
  "apps/web/app/[locale]/topics/page.tsx",
  "apps/web/app/[locale]/topics/[domain]/page.tsx",
];

// Matches both the one-line and multi-line forms, with "..." or `...` values.
const MAP = /languages:\s*\{\s*en:\s*(["`])([^"`]+)\1,\s*ar:\s*(["`])([^"`]+)\3,?\s*(?:"x-default":\s*(["`])([^"`]+)\5,?\s*)?\}/gs;

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(MAP, (_m, _q1, enPath, _q3, _arPath, _q5, xDefault) => {
    // Turn "/en/learn/${domain}" into a locale-parameterised template.
    const template = enPath.replace(/^\/en/, "${locale}");
    const call = `languageAlternates((locale) => \`/\${locale}${template.replace("${locale}", "")}\`${xDefault ? ", { xDefault: true }" : ""})`;
    return `languages: ${call}`;
  });

  if (after !== before) {
    let out = after;
    if (!out.includes("languageAlternates")) continue;
    // Add the import to the existing "@/lib/i18n" import statement.
    out = out.replace(/import \{([^}]*)\} from "@\/lib\/i18n";/, (m, names) =>
      names.includes("languageAlternates") ? m : `import {${names.replace(/\s*$/, "")}, languageAlternates } from "@/lib/i18n";`,
    );
    writeFileSync(file, out, "utf8");
    changed += 1;
    console.log("  rewrote", file);
  }
}
console.log(`${changed} file(s) updated`);
