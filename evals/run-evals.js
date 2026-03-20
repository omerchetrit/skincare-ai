/**
 * Evaluation runner — tests the recommendation engine against known personas.
 * Usage: node evals/run-evals.js
 *
 * Runs all test cases from evals/test-cases.json and prints the recommendations.
 * Review the output manually to verify accuracy.
 *
 * Requires the server env vars (.env) to be loaded.
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getProducts } from "../services/wix.js";
import { analyzeAndRecommend } from "../services/claude.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const testCases = JSON.parse(readFileSync(resolve(__dirname, "test-cases.json"), "utf-8"));

async function runEval(tc, products) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`▶ [${tc.id}] ${tc.description}`);
  console.log(`  Profile: age=${tc.profile.age}, skin=${tc.profile.skinType}, concerns=[${tc.profile.concerns.join(", ")}]`);
  if (tc.profile.pregnancyStatus) console.log(`  Pregnancy/BF: ${tc.profile.pregnancyStatus}`);
  console.log(`  Notes: ${tc.expected.notes}`);

  try {
    const result = await analyzeAndRecommend({
      age: tc.profile.age,
      gender: tc.profile.gender,
      skinType: tc.profile.skinType,
      concerns: tc.profile.concerns,
      sensitivities: tc.profile.sensitivities || "",
      texturePreference: tc.profile.texturePreference,
      pregnancyStatus: tc.profile.pregnancyStatus,
      photoBase64: null,
      photoMimeType: null,
      products,
    });

    console.log(`\n  ✅ Recommendations (${result.recommendations.length} products):`);
    result.recommendations.forEach((r, i) => {
      console.log(`    ${i + 1}. [${r.priority.toUpperCase()}] ${r.product_name} (id: ${r.product_id})`);
    });

    // Check must_not_include
    const violations = [];
    tc.expected.must_not_include.forEach((forbidden) => {
      const hit = result.recommendations.find(
        (r) => (r.product_name || "").toLowerCase().includes(forbidden.toLowerCase())
      );
      if (hit) violations.push(`❌ VIOLATION: "${forbidden}" was recommended but should NOT be`);
    });
    if (violations.length) {
      console.log("\n  " + violations.join("\n  "));
    } else {
      console.log("  ✅ No forbidden products detected");
    }

  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
  }
}

async function main() {
  console.log("🧪 Liloosh Recommendation Eval Runner");
  console.log(`   Running ${testCases.length} test cases...\n`);

  const products = await getProducts();
  console.log(`   Catalog: ${products.length} products loaded from Wix`);

  for (const tc of testCases) {
    await runEval(tc, products);
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ Eval run complete. Review recommendations above.");
  console.log("   To log a correction: edit brand/corrections.json");
}

main().catch(console.error);
