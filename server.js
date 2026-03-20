import "dotenv/config";
import express from "express";
import cors from "cors";
import { getProducts } from "./services/wix.js";
import { analyzeAndRecommend } from "./services/claude.js";
import { sendOTP, verifyOTP, validateToken } from "./services/otp.js";
import { sendRecommendationsEmail } from "./services/email.js";

const app = express();
app.use(cors());

/**
 * Code-level anti-duplication guard.
 * If a kit is recommended, remove any individual product that is a component of that kit.
 * This enforces the anti-duplication rule in code rather than relying solely on the LLM.
 */
function enforceNoDuplication(recommendations, catalogProducts) {
  // Build a set of component names for every recommended kit
  const componentNames = new Set();
  recommendations.forEach((rec) => {
    const p = catalogProducts.find((cp) => cp.id === rec.product_id);
    if (p?.isKit && p.kitComponents.length > 0) {
      p.kitComponents.forEach((c) => componentNames.add(c.trim().toLowerCase()));
    }
  });

  if (componentNames.size === 0) return recommendations;

  const before = recommendations.length;
  const filtered = recommendations.filter((rec) => {
    const name = (rec.product_name || "").trim().toLowerCase();
    return !componentNames.has(name);
  });

  if (filtered.length < before) {
    const removed = before - filtered.length;
    console.log(`\n🛡️  [DEDUP] Removed ${removed} individual product(s) that were already inside a recommended kit.`);
  }
  return filtered;
}
app.use(express.json({ limit: "35mb" })); // photos up to 25MB → ~34MB base64
app.use(express.static("public"));

// POST /api/send-otp
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "כתובת מייל נדרשת." });
  try {
    await sendOTP(email);
    res.json({ success: true });
  } catch (err) {
    console.error("[OTP] send-otp failed:", err.message, err.code || "");
    res.status(400).json({ error: err.message });
  }
});

// POST /api/verify-otp
app.post("/api/verify-otp", (req, res) => {
  const { email, code, phone } = req.body;
  if (!email || !code) return res.status(400).json({ error: "מייל וקוד נדרשים." });
  try {
    const { token } = verifyOTP(email, code, phone);
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/recommend
// Body: { age, gender, skinType, concerns[], sensitivities, routine, photo: "data:image/jpeg;base64,..." }
app.post("/api/recommend", async (req, res) => {
  const { age, gender, skinType, concerns, sensitivities, texturePreference, pregnancyStatus, photo, verifiedToken } = req.body;

  // ── Auth check ──
  const session = validateToken(verifiedToken);
  if (!session) {
    return res.status(401).json({ error: "נדרש אימות טלפון. רעננו את הדף ונסי שוב." });
  }

  if (!age || !skinType || !concerns?.length) {
    return res.status(400).json({ error: "גיל, סוג עור ומאפיינים הם שדות חובה." });
  }

  // Parse base64 photo (optional)
  let photoBase64 = null;
  let photoMimeType = null;
  if (photo) {
    const match = photo.match(/^data:(.+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "פורמט תמונה לא תקין." });
    [, photoMimeType, photoBase64] = match;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(photoMimeType)) {
      return res.status(400).json({ error: "יש לשלוח תמונה מסוג JPEG, PNG או WebP." });
    }
  }

  try {
    const products = await getProducts();
    if (!products.length) {
      return res.status(503).json({ error: "לא הצלחנו לטעון את קטלוג המוצרים. נסה/י שוב." });
    }

    const result = await analyzeAndRecommend({
      age,
      gender,
      skinType,
      concerns,
      sensitivities,
      texturePreference,
      pregnancyStatus,
      photoBase64,
      photoMimeType,
      products,
    });

    // Resolve product data by ID (tool use guarantees valid IDs from catalog)
    result.recommendations = result.recommendations.map((rec) => {
      const product = products.find((p) => p.id === rec.product_id);
      return {
        ...rec,
        product_name: product?.name || rec.product_id,
        product_image: product?.image || "",
        product_url: product?.url || "",
        product_price: product?.price || "",
        product_id: product?.id || rec.product_id,
      };
    });

    // Code-level anti-duplication: if a kit is recommended, remove any of its components
    result.recommendations = enforceNoDuplication(result.recommendations, products);

    // ── LLM Selection Reasoning Log ──────────────────────────────
    const r = result.selection_reasoning;
    if (r) {
      console.log("\n╔══════════════════════════════════════════════════════╗");
      console.log("║           LLM SELECTION REASONING                   ║");
      console.log("╚══════════════════════════════════════════════════════╝");

      console.log("\n📋 USER PROFILE:");
      console.log(`   Age: ${age} | Skin: ${skinType} | Texture: ${texturePreference || "—"} | Pregnancy: ${pregnancyStatus || "none"}`);
      console.log(`   Concerns: ${concerns.join(", ")}`);
      if (sensitivities) console.log(`   Sensitivities: ${sensitivities}`);

      console.log("\n✅ RECOMMENDED PRODUCTS:");
      result.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.product_name} (id: ${rec.product_id})`);
      });

      if (r.rules_applied?.length) {
        console.log("\n📏 BUSINESS RULES APPLIED:");
        r.rules_applied.forEach((rule) => console.log(`   • ${rule}`));
      }

      if (r.per_product_logic?.length) {
        console.log("\n🔍 PER-PRODUCT LOGIC:");
        r.per_product_logic.forEach((p) => {
          console.log(`   ▸ ${p.product}`);
          console.log(`     Rule: ${p.rule_triggered}`);
          console.log(`     Why not alternative: ${p.why_this_not_alternative}`);
        });
      }

      if (r.products_considered_and_rejected?.length) {
        console.log("\n❌ CONSIDERED & REJECTED:");
        r.products_considered_and_rejected.forEach((p) => console.log(`   • ${p}`));
      }

      console.log("\n🛡️  ANTI-DUPLICATION CHECK:");
      console.log(`   ${r.anti_duplication_check}`);

      console.log("\n══════════════════════════════════════════════════════\n");
    }
    // ─────────────────────────────────────────────────────────────

    res.json(result);

    // Fire-and-forget — send branded recommendations email in background
    sendRecommendationsEmail({
      to: session.email,
      customerName: req.body.customerName || "",
      skinAnalysis: result.skin_analysis,
      recommendations: result.recommendations,
      routineSuggestion: result.routine_suggestion,
      generalAdvice: result.general_advice,
    }).then(() => {
      console.log(`[email] Recommendations sent to ${email}`);
    }).catch((err) => {
      console.error(`[email] Failed to send recommendations to ${email}:`, err.message);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products — useful for debugging
app.get("/api/products", async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Skincare AI running on http://localhost:${PORT}`);
  console.log(`[ENV] GMAIL_USER=${process.env.GMAIL_USER ? process.env.GMAIL_USER : "⚠️  NOT SET"}`);
  console.log(`[ENV] GMAIL_APP_PASSWORD=${process.env.GMAIL_APP_PASSWORD ? "✓ set" : "⚠️  NOT SET"}`);
});
