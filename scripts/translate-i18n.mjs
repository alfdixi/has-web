#!/usr/bin/env node
// Traduce messages/<source>.json a los locales objetivo usando Claude API.
//
// Uso:
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-i18n.mjs
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-i18n.mjs --target pt,fr
//   ANTHROPIC_API_KEY=sk-... node scripts/translate-i18n.mjs --only-missing
//
// Flags:
//   --target=<csv>      Locales a generar. Por defecto: pt,fr,en
//   --only-missing      Sólo traduce claves nuevas o que cambiaron (incremental)
//   --dry-run           Imprime qué haría sin escribir archivos
//
// Convenciones:
//   - es.json es la fuente de verdad
//   - Cada archivo destino lleva $meta con autoría y fecha
//   - Términos en PRESERVE_TERMS no se traducen nunca

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MESSAGES_DIR = path.join(ROOT, "messages");
const SOURCE_LOCALE = "es";
const DEFAULT_TARGETS = [
  "en",
  "pt",
  "fr",
  "it",
  "de",
  "ru",
  "ja",
  "zh",
  "hi",
  "ar",
];
const MODEL = "claude-opus-4-5";
const BATCH_SIZE = 60;

const PRESERVE_TERMS = [
  "Human Aging Simulators",
  "HAS",
  "Human Longevity Operating System",
  "Longevity Node",
  "Stripe",
  "OpenCollective",
  "GitHub Sponsors",
  "GitHub",
  "bioRxiv",
  "Zenodo",
  "PubMed",
  "NHANES",
  "UK Biobank",
  "UN WPP",
  "HMD",
  "IHME",
  "Eurostat",
  "World Bank",
  "AWS",
  "AWS SES",
  "Claude",
  "GPT",
  "MCP",
  "API",
  "DEXA",
  "MRI",
  "NAD+",
  "CC-BY",
  "MIT",
  "Apache",
  "MIT/Apache",
  "ML/IA",
  "V1",
  "V2",
  "Pre-V1",
  "Yamanaka",
];

const LOCALE_LABEL = {
  en: "English (US)",
  pt: "Brazilian Portuguese",
  fr: "French (France)",
  it: "Italian (Italy)",
  de: "German (Germany)",
  ru: "Russian",
  ja: "Japanese",
  zh: "Simplified Chinese",
  hi: "Hindi (India)",
  ar: "Modern Standard Arabic",
};

// ---------- args ----------
const args = process.argv.slice(2);
function flag(name) {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0) return args[idx + 1] ?? true;
  return null;
}
const targetArg = flag("target");
const targets = targetArg
  ? String(targetArg)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_TARGETS;
const onlyMissing = args.includes("--only-missing");
const dryRun = args.includes("--dry-run");

if (!process.env.ANTHROPIC_API_KEY && !dryRun) {
  console.error("Falta ANTHROPIC_API_KEY en el entorno.");
  process.exit(1);
}

// ---------- flatten / unflatten ----------
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object") flatten(item, `${key}[${i}]`, out);
        else out[`${key}[${i}]`] = item;
      });
    } else if (typeof v === "object") {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function unflatten(map) {
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const parts = [];
    let buf = "";
    for (let i = 0; i < key.length; i++) {
      const c = key[i];
      if (c === ".") {
        if (buf) parts.push({ type: "key", v: buf });
        buf = "";
      } else if (c === "[") {
        if (buf) parts.push({ type: "key", v: buf });
        buf = "";
        const end = key.indexOf("]", i);
        parts.push({ type: "idx", v: Number(key.slice(i + 1, end)) });
        i = end;
      } else {
        buf += c;
      }
    }
    if (buf) parts.push({ type: "key", v: buf });

    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const next = parts[i + 1];
      const isLast = i === parts.length - 1;
      if (p.type === "key") {
        if (isLast) {
          cur[p.v] = value;
        } else {
          if (cur[p.v] === undefined) cur[p.v] = next.type === "idx" ? [] : {};
          cur = cur[p.v];
        }
      } else {
        if (isLast) {
          cur[p.v] = value;
        } else {
          if (cur[p.v] === undefined) cur[p.v] = next.type === "idx" ? [] : {};
          cur = cur[p.v];
        }
      }
    }
  }
  return out;
}

// ---------- API ----------
async function callClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Sin JSON en respuesta");
  return JSON.parse(raw.slice(start, end + 1));
}

async function translateBatch(entries, targetLocale) {
  const localeLabel = LOCALE_LABEL[targetLocale] ?? targetLocale;
  const preserveList = PRESERVE_TERMS.map((t) => `"${t}"`).join(", ");

  const obj = Object.fromEntries(entries);

  const prompt = [
    `You are translating a UI catalog for an open-science web product called "Human Aging Simulators (HAS)" — a global, hopeful, donor-and-citizen-facing platform about extending healthy human lifespan.`,
    ``,
    `Translate the JSON values from Spanish (es) into ${localeLabel}.`,
    ``,
    `Strict rules:`,
    `- Output a single JSON object with the SAME KEYS as input. Translate only the string values.`,
    `- Keep tone hopeful, warm, inviting — match the source register.`,
    `- Preserve these terms verbatim, never translate them: ${preserveList}.`,
    `- Preserve interpolation placeholders like {year}, {count}, ICU plural syntax.`,
    `- Preserve emoji, em-dashes (—), middle dots (·), arrows (→) and HTML-like punctuation.`,
    `- Do not add or remove keys. Do not add commentary. Do not wrap in code fences.`,
    `- For RTL languages (ar), do not add markup — just translate.`,
    ``,
    `Input JSON:`,
    "```json",
    JSON.stringify(obj, null, 2),
    "```",
    ``,
    `Return only the translated JSON object.`,
  ].join("\n");

  const text = await callClaude([{ role: "user", content: prompt }]);
  const translated = extractJson(text);

  // sanity: keys must match
  for (const [k] of entries) {
    if (!(k in translated)) {
      console.warn(`  [warn] missing key in translation: ${k}`);
    }
  }
  return translated;
}

// ---------- main ----------
const sourcePath = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
if (!fs.existsSync(sourcePath)) {
  console.error(`No existe ${sourcePath}`);
  process.exit(1);
}
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceFlat = flatten(source);

console.log(
  `Source: ${SOURCE_LOCALE} (${Object.keys(sourceFlat).length} keys)`,
);
console.log(`Targets: ${targets.join(", ")}`);
console.log(
  `Mode: ${onlyMissing ? "incremental" : "full"}${dryRun ? " (dry-run)" : ""}`,
);
console.log("");

for (const locale of targets) {
  if (locale === SOURCE_LOCALE) continue;

  const targetPath = path.join(MESSAGES_DIR, `${locale}.json`);
  let existing = null;
  let existingFlat = {};
  let isPlaceholder = false;
  if (fs.existsSync(targetPath)) {
    existing = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    existingFlat = flatten(existing);
    isPlaceholder = existing?.$meta?.placeholder === true;
  }

  const toTranslate = [];
  for (const [k, v] of Object.entries(sourceFlat)) {
    if (k.startsWith("$meta")) continue;
    if (onlyMissing && !isPlaceholder && existingFlat[k] !== undefined)
      continue;
    toTranslate.push([k, v]);
  }

  if (toTranslate.length === 0) {
    console.log(`[${locale}] sin cambios`);
    continue;
  }

  console.log(`[${locale}] traducir ${toTranslate.length} claves...`);
  if (dryRun) continue;

  const translatedFlat = {};
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    process.stdout.write(
      `  batch ${i / BATCH_SIZE + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)}... `,
    );
    const t = await translateBatch(batch, locale);
    Object.assign(translatedFlat, t);
    console.log("ok");
  }

  const mergedFlat = { ...existingFlat };
  for (const [k] of toTranslate) {
    if (translatedFlat[k] !== undefined) mergedFlat[k] = translatedFlat[k];
  }
  // Drop any $meta from merged before unflatten
  for (const k of Object.keys(mergedFlat)) {
    if (k.startsWith("$meta")) delete mergedFlat[k];
  }

  const result = unflatten(mergedFlat);
  result.$meta = {
    sourceLocale: SOURCE_LOCALE,
    translatedBy: `claude/${MODEL}`,
    translatedAt: new Date().toISOString(),
    needsHumanReview: true,
    placeholder: false,
  };

  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`[${locale}] escrito ${path.relative(ROOT, targetPath)}`);
}

console.log("\nListo.");
