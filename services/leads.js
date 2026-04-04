/**
 * Lead storage — saves user inputs + Claude output to Wix Data Collection "leads".
 * Photo (if present) is uploaded to Wix Media Manager first; the resulting URL is stored.
 *
 * Fire-and-forget: caller should .catch() errors without awaiting.
 */

async function uploadPhotoToWix(base64DataUrl) {
  const apiKey  = process.env.WIX_API_KEY;
  const siteId  = process.env.WIX_SITE_ID;

  const [header, data] = base64DataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)[1]; // e.g. "image/jpeg"
  const buffer   = Buffer.from(data, "base64");

  // 1. Request a signed upload URL from Wix Media Manager
  const urlRes = await fetch("https://www.wixapis.com/site-media/v1/files/upload/url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "wix-site-id": siteId,
    },
    body: JSON.stringify({
      mimeType,
      fileName: `lead-${Date.now()}.jpg`,
      parentFolderId: "leads-photos", // optional folder, Wix creates it if missing
    }),
  });

  if (!urlRes.ok) {
    const txt = await urlRes.text();
    throw new Error(`[leads] Media upload URL failed ${urlRes.status}: ${txt}`);
  }

  const { uploadUrl, uploadToken } = await urlRes.json();

  // 2. Upload the binary to the signed URL
  const uploadRes = await fetch(`${uploadUrl}&uploadToken=${uploadToken}`, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error(`[leads] Photo upload failed ${uploadRes.status}: ${txt}`);
  }

  const uploadData = await uploadRes.json();
  return uploadData.file?.url || "";
}

/**
 * @param {object} inputs   — raw request body from /api/recommend
 * @param {string} email    — verified email from session token
 * @param {object} result   — enriched Claude output (after product data merge)
 */
export async function saveLead(inputs, email, result) {
  const apiKey        = process.env.WIX_API_KEY;
  const siteId        = process.env.WIX_SITE_ID;
  const collectionId  = process.env.WIX_LEADS_COLLECTION || "leads";

  if (!apiKey || !siteId) {
    console.warn("[leads] WIX_API_KEY or WIX_SITE_ID not set — skipping lead save");
    return;
  }

  // Upload photo if present (may throw — caller handles via .catch())
  let photoUrl = "";
  if (inputs.photo) {
    try {
      photoUrl = await uploadPhotoToWix(inputs.photo);
    } catch (err) {
      console.error("[leads] Photo upload failed, saving lead without photo:", err.message);
    }
  }

  const recommendedProducts = (result.recommendations || [])
    .map((r) => `${r.product_name} (${r.priority})`)
    .join("\n");

  const dataItem = {
    data: {
      name:               inputs.customerName || "",
      email:              email,
      phone:              inputs.phone || "",
      age:                Number(inputs.age) || 0,
      gender:             inputs.gender || "",
      skinType:           inputs.skinType || "",
      concerns:           (inputs.concerns || []).join(", "),
      sensitivities:      inputs.sensitivities || "",
      pregnancy:          inputs.pregnancyStatus || "none",
      texture:            inputs.texturePreference || "no preference",
      photoUrl,
      skinAssessment:     result.skin_analysis?.skin_type_assessment || "",
      rootCause:          result.skin_analysis?.root_cause_analysis || "",
      prognosis:          result.skin_analysis?.prognosis || "",
      recommendedProducts,
      routine:            result.routine_suggestion || "",
      timestamp:          new Date().toISOString(),
    },
  };

  const res = await fetch("https://www.wixapis.com/wix-data/v2/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "wix-site-id": siteId,
    },
    body: JSON.stringify({ dataCollectionId: collectionId, dataItem }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`[leads] Wix Data save failed ${res.status}: ${txt}`);
  }

  console.log(`[leads] Saved lead for ${email}`);
}
