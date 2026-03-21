import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_RULES } from "./business-rules.js";
import { PRODUCT_KNOWLEDGE } from "./product-knowledge.js";
import { getBrandContext } from "./brand.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Tool definition for product recommendations.
 * Claude MUST call this tool — tool_choice forces it.
 * This guarantees valid structured output and that product IDs exist in the catalog.
 */
const RECOMMEND_TOOL = {
  name: "recommend_products",
  description: "Select products from the live catalog by their exact product_id and provide personalized Hebrew skincare recommendations.",
  input_schema: {
    type: "object",
    properties: {
      skin_analysis: {
        type: "object",
        properties: {
          detected_concerns: { type: "array", items: { type: "string" } },
          skin_type_assessment: {
            type: "string",
            description: "Short Hebrew label for the skin type — e.g. 'עור שמן עם נטייה לאקנה'. No age or parentheses.",
          },
          root_cause_analysis: {
            type: "string",
            description: "2-3 Hebrew sentences explaining the biological/naturopathic mechanism behind this person's skin condition. Use professional dermatology and naturopathy terminology (e.g. דיסרגולציה של הסבום, היפרקרטינציה, חיידק C. acnes, תגובה דלקתית, שיבוש מחסום הלחות, רגישות קולטני האנדרוגנים). Address the user directly (לשון נקבה), warm-professional tone.",
          },
          prognosis: {
            type: "string",
            description: "1-2 Hebrew sentences describing the expected improvement timeline and outcome with consistent use of the recommended products. Be realistic and encouraging. Use professional but accessible language.",
          },
        },
        required: ["detected_concerns", "skin_type_assessment", "root_cause_analysis", "prognosis"],
      },
      recommendations: {
        type: "array",
        description: "3 to 6 products. Each product_id must exactly match an [id:...] value from the catalog.",
        items: {
          type: "object",
          properties: {
            product_id: {
              type: "string",
              description: "The exact Wix product ID shown as [id: XXXX] in the catalog",
            },
            reason: {
              type: "string",
              description: "Personalized Hebrew explanation (2-3 sentences) of why this product suits THIS person specifically",
            },
            how_to_use: {
              type: "string",
              description: "Brief Hebrew usage tip: when to use (morning/evening), how much, any important notes",
            },
            priority: {
              type: "string",
              enum: ["must-have", "recommended", "bonus"],
            },
          },
          required: ["product_id", "reason", "how_to_use", "priority"],
        },
      },
      routine_suggestion: {
        type: "string",
        description: "Brief Hebrew paragraph describing the morning and/or evening routine using the recommended products",
      },
      general_advice: {
        type: "string",
        description: "1-2 sentences of general skincare advice tailored to this person (Hebrew)",
      },
      selection_reasoning: {
        type: "object",
        properties: {
          rules_applied: {
            type: "array",
            items: { type: "string" },
            description: "Every business rule that influenced choices",
          },
          products_considered_and_rejected: {
            type: "array",
            items: { type: "string" },
            description: "product name — reason NOT chosen",
          },
          anti_duplication_check: {
            type: "string",
            description: "Confirm no kit component appears separately alongside its parent kit",
          },
          per_product_logic: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product: { type: "string" },
                rule_triggered: { type: "string" },
                why_this_not_alternative: { type: "string" },
              },
              required: ["product", "rule_triggered", "why_this_not_alternative"],
            },
          },
        },
        required: ["rules_applied", "per_product_logic"],
      },
    },
    required: ["skin_analysis", "recommendations", "routine_suggestion", "general_advice", "selection_reasoning"],
  },
};

export async function analyzeAndRecommend({ age, gender, skinType, concerns, sensitivities, texturePreference, pregnancyStatus, photoBase64, photoMimeType, products }) {
  // Build catalog with full descriptions and product IDs for reliable lookup
  const productCatalog = products
    .map((p) => {
      const kitLabel = p.isKit
        ? p.kitComponents.length > 0
          ? ` [ערכה — מכילה: ${p.kitComponents.join(" + ")}]`
          : ` [ערכה]`
        : " [מוצר בודד]";
      return `[id: ${p.id}] ${p.name}${kitLabel}
  Description: ${p.description}
  Price: ${p.price}
  In stock: ${p.inStock ? "yes" : "no"}`;
    })
    .join("\n\n");

  const pregnancyLabel =
    pregnancyStatus === "pregnant" ? "pregnant"
    : pregnancyStatus === "breastfeeding" ? "breastfeeding"
    : "not pregnant / not breastfeeding";

  const userProfile = `
Age: ${age}
Gender: ${gender || "not specified"}
Self-described skin type: ${skinType}
Main concerns: ${concerns.join(", ")}
Sensitivities/allergies: ${sensitivities || "none mentioned"}
Texture preference: ${texturePreference === "light" ? "light/fast-absorbing" : texturePreference === "rich" ? "rich/nourishing" : "no preference stated"}
Pregnancy / breastfeeding status: ${pregnancyLabel}`.trim();

  const textureLine = `- Texture preference stated by user: ${texturePreference === "light" ? "prefer LIGHT creams" : texturePreference === "rich" ? "prefer RICH creams" : "no preference — use best judgment"}.`;
  const businessRules = BUSINESS_RULES.replace(
    "- Texture preference stated by user: follow it when choosing between cream options.",
    textureLine
  );

  // Brand guidelines + corrections loaded fresh on every request (hot-reloadable)
  const brandContext = getBrandContext();

  // Build message content — image is optional
  const messageContent = [];
  if (photoBase64 && photoMimeType) {
    messageContent.push({
      type: "image",
      source: { type: "base64", media_type: photoMimeType, data: photoBase64 },
    });
  }

  const photoNote = photoBase64
    ? "Analyze this person's face and skin, combined with their profile, and call recommend_products with your selections."
    : "No photo was provided. Base your skin analysis and recommendations solely on the user profile below. Call recommend_products with your selections.";

  messageContent.push({
    type: "text",
    text: `${photoNote}

USER PROFILE:
${userProfile}

${businessRules}

${PRODUCT_KNOWLEDGE}

${brandContext}

LIVE PRODUCT CATALOG (select products using the [id: ...] value — never invent IDs):
${productCatalog}`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: `You are an expert skincare consultant for Liloosh, an Israeli natural skincare brand. You combine naturopathic philosophy with evidence-based dermatology.
You analyze user profiles (and facial photos when provided) to recommend the most suitable products from the brand's catalog.
All text fields (reason, how_to_use, routine_suggestion, general_advice, root_cause_analysis, prognosis) must be written in Hebrew (RTL).
IMPORTANT: All Hebrew text must use feminine form (לשון נקבה) — address the user as "את", use feminine verbs and adjectives ("השתמשי", "נקי", "טפחי", "מתאימה לך").

SKIN ANALYSIS TONE:
- root_cause_analysis: Write as a naturopathic dermatology expert explaining the biological mechanism to the client. Use professional terms naturally — e.g. "דיסרגולציה של הסבום", "היפרקרטינציה פוליקולרית", "תגובה דלקתית", "שיבוש מחסום הלחות", "עקה חמצונית", "מיקרוביום עורי". Do NOT simplify to the point of being generic. Be specific to THIS person's profile.
- TERMINOLOGY RULE: Whenever you use a complex or technical term (medical, biological, or dermatological), immediately follow it with a plain-language explanation in parentheses. Examples: "היפרפיגמנטציה לנטיגינית (כתמי עור סולריים)", "היפרקרטיניזציה (הצטברות תאי עור מתים)", "דיסרגולציה (שיבוש האיזון הטבעי)", "עקה חמצונית (נזק מרדיקלים חופשיים)". Apply this to every non-common term — the client is not a dermatologist.
- prognosis: Be specific and concrete — mention realistic timeframes (e.g. "תוך 4-6 שבועות"), what the user can expect to see improve first, and what takes longer. Encouraging but not marketing-speak.

STRICT CONCERN RULES:
- In detected_concerns: list ONLY concerns the user explicitly stated. Do NOT add inferred, related, or typical concerns the user did not mention. Do NOT expand one concern into sub-categories. If the user said "acne and pimples", output one tag — "אקנה ופצעונים" — not "ראשים שחורים", not "אקנה הורמונלית".
- In reason and how_to_use fields: describe ONLY the specific product being recommended — its ingredients, mechanism, texture. Do NOT mention other products in the recommendation set, companion products, or products not listed in that product's catalog entry.
You MUST call the recommend_products tool. Do not respond with plain text.`,
    tools: [RECOMMEND_TOOL],
    tool_choice: { type: "tool", name: "recommend_products" },
    messages: [{ role: "user", content: messageContent }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock) throw new Error("Claude did not call the recommend_products tool");

  // toolBlock.input is already a parsed JS object — no JSON.parse needed
  return toolBlock.input;
}
