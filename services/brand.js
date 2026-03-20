/**
 * Brand memory layer — loads guidelines.md + corrections.json
 * and returns formatted strings ready to inject into Claude's system prompt.
 *
 * To update brand behavior:
 *   - Edit brand/guidelines.md for general rules and tone
 *   - Add entries to brand/corrections.json for specific past mistakes
 *
 * No server restart needed — files are read on every request (hot reload).
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_DIR = resolve(__dirname, "../brand");

/**
 * Returns the brand guidelines as a formatted string for Claude.
 * Falls back gracefully if the file is missing or unreadable.
 */
export function loadBrandGuidelines() {
  try {
    return readFileSync(resolve(BRAND_DIR, "guidelines.md"), "utf-8");
  } catch {
    return "";
  }
}

/**
 * Returns learned corrections formatted as a Claude-readable block.
 * Falls back gracefully if the file is missing, empty, or invalid JSON.
 */
export function loadCorrections() {
  try {
    const raw = readFileSync(resolve(BRAND_DIR, "corrections.json"), "utf-8");
    const corrections = JSON.parse(raw);
    if (!corrections.length) return "";

    const lines = corrections.map((c, i) => {
      return [
        `תיקון #${i + 1} (${c.date || "ללא תאריך"}):`,
        `  פרופיל: ${c.profile_summary}`,
        `  מה הומלץ בטעות: ${c.what_was_recommended}`,
        `  מה היה נכון: ${c.what_should_be_recommended}`,
        `  למה: ${c.reason}`,
        `  כלל לזכור: ${c.rule_to_remember}`,
      ].join("\n");
    });

    return [
      "=== LEARNED CORRECTIONS — תיקונים מהשטח, חובה ליישם ===",
      "אלו הן טעויות שנעשו בעבר ותוקנו ידנית. אסור לחזור עליהן.",
      "",
      ...lines,
      "=== END CORRECTIONS ===",
    ].join("\n");
  } catch {
    return "";
  }
}

/**
 * Returns the full brand context block (guidelines + corrections)
 * ready to append to Claude's system prompt.
 */
export function getBrandContext() {
  const guidelines = loadBrandGuidelines();
  const corrections = loadCorrections();
  const parts = [];
  if (guidelines) parts.push("=== BRAND GUIDELINES ===\n" + guidelines + "\n=== END BRAND GUIDELINES ===");
  if (corrections) parts.push(corrections);
  return parts.join("\n\n");
}
