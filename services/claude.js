import Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_RULES } from "./business-rules.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeAndRecommend({ age, gender, skinType, concerns, sensitivities, texturePreference, photoBase64, photoMimeType, products }) {
  const productCatalog = products
    .map((p, i) => {
      const kitLabel = p.isKit
        ? p.kitComponents.length > 0
          ? ` [ערכה — מכילה: ${p.kitComponents.join(" + ")}]`
          : ` [ערכה]`
        : " [מוצר בודד]";
      return `[${i + 1}] ${p.name}${kitLabel}
  Description: ${p.description.slice(0, 300)}
  Price: ${p.price}
  URL: ${p.url}`;
    })
    .join("\n\n");

  const userProfile = `
Age: ${age}
Gender: ${gender || "not specified"}
Self-described skin type: ${skinType}
Main concerns: ${concerns.join(", ")}
Sensitivities/allergies: ${sensitivities || "none mentioned"}
Texture preference: ${texturePreference === "light" ? "light/fast-absorbing" : texturePreference === "rich" ? "rich/nourishing" : "no preference stated"}`.trim();

  // Business rules come from services/business-rules.js (single source of truth).
  // We append the dynamic texture preference here.
  const textureLine = `- Texture preference stated by user: ${texturePreference === "light" ? "prefer LIGHT creams" : texturePreference === "rich" ? "prefer RICH creams" : "no preference — use best judgment"}.`;
  const businessRules = BUSINESS_RULES.replace(
    "- Texture preference stated by user: follow it when choosing between cream options.",
    textureLine
  );

  // Build message content — image is optional
  const messageContent = [];

  if (photoBase64 && photoMimeType) {
    messageContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: photoMimeType,
        data: photoBase64,
      },
    });
  }

  const photoNote = photoBase64
    ? "Analyze this person's face and skin, combined with their profile, and recommend products from the catalog."
    : "No photo was provided. Base your skin analysis and recommendations solely on the user profile below.";

  messageContent.push({
    type: "text",
    text: `${photoNote}

USER PROFILE:
${userProfile}

${businessRules}

PRODUCT CATALOG:
${productCatalog}

Respond with this exact JSON structure:
{
  "skin_analysis": {
    "detected_concerns": ["list of skin concerns detected visually or inferred from profile"],
    "skin_type_assessment": "your assessment of their skin type",
    "overall_condition": "brief 1-2 sentence summary of their skin condition"
  },
  "recommendations": [
    {
      "product_name": "exact product name from catalog",
      "product_url": "URL from catalog",
      "product_image": "",
      "product_price": "price from catalog",
      "reason": "personalized explanation of why this product suits THIS person specifically (2-3 sentences, in Hebrew)",
      "how_to_use": "brief usage tip (in Hebrew)",
      "priority": "must-have | recommended | bonus"
    }
  ],
  "routine_suggestion": "A brief paragraph describing the suggested morning and/or evening routine using the recommended products (in Hebrew)",
  "general_advice": "1-2 sentences of general skincare advice tailored to this person (in Hebrew)"
}`,
  });

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: `You are an expert skincare consultant for an Israeli skincare brand.
You analyze user profiles (and facial photos when provided) to recommend the most suitable products from the brand's catalog.
All text fields in your response must be written in Hebrew (RTL). Product names should remain as-is.
Always respond in valid JSON format only — no markdown, no extra text.`,
    messages: [
      {
        role: "user",
        content: messageContent,
      },
    ],
  });

  const message = await stream.finalMessage();

  // Extract the text block
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text response from Claude");

  try {
    return JSON.parse(textBlock.text);
  } catch {
    // Try to extract JSON if there's surrounding text
    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Claude returned invalid JSON");
  }
}
