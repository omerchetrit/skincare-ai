import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeAndRecommend({ age, gender, skinType, concerns, sensitivities, routine, photoBase64, photoMimeType, products }) {
  const productCatalog = products
    .map((p, i) =>
      `[${i + 1}] ${p.name}
  Description: ${p.description.slice(0, 300)}
  Price: ${p.price}
  URL: ${p.url}`
    )
    .join("\n\n");

  const userProfile = `
Age: ${age}
Gender: ${gender || "not specified"}
Self-described skin type: ${skinType}
Main concerns: ${concerns.join(", ")}
Sensitivities/allergies: ${sensitivities || "none mentioned"}
Current routine: ${routine || "none described"}`.trim();

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: `You are an expert skincare consultant with deep knowledge of dermatology, cosmetic ingredients, and personalized skincare.
You analyze facial photos and user profiles to identify skin concerns and recommend the most suitable products from a given catalog.
The products and users are Israeli — write all text fields in Hebrew (RTL). Product names should be kept as-is.
Always respond in valid JSON format only — no markdown, no extra text.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: photoMimeType,
              data: photoBase64,
            },
          },
          {
            type: "text",
            text: `Analyze this person's face and skin, combined with their profile, and recommend products from my catalog.

USER PROFILE:
${userProfile}

PRODUCT CATALOG:
${productCatalog}

Respond with this exact JSON structure:
{
  "skin_analysis": {
    "detected_concerns": ["list of skin concerns you visually detected, e.g. dryness, acne, hyperpigmentation, etc."],
    "skin_type_assessment": "your assessment of their skin type based on the photo",
    "overall_condition": "brief 1-2 sentence summary of their skin condition"
  },
  "recommendations": [
    {
      "product_name": "exact product name from catalog",
      "product_url": "URL from catalog",
      "product_image": "",
      "product_price": "price from catalog",
      "reason": "personalized explanation of why this product suits THIS person specifically (2-3 sentences)",
      "how_to_use": "brief usage tip",
      "priority": "must-have | recommended | bonus"
    }
  ],
  "routine_suggestion": "A brief paragraph describing the suggested morning and/or evening routine using the recommended products",
  "general_advice": "1-2 sentences of general skincare advice tailored to this person"
}

Recommend between 3 and 6 products. Only recommend products that genuinely match the person's needs. Prioritize by impact.`,
          },
        ],
      },
    ],
  });

  const message = await stream.finalMessage();

  // Extract the text block (skip thinking blocks)
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text response from Claude");

  try {
    return JSON.parse(textBlock.text);
  } catch {
    // Try to extract JSON if there's any surrounding text
    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Claude returned invalid JSON");
  }
}
