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
  const fileName = `lead-${Date.now()}.jpg`;

  console.log(`[leads] Uploading photo (${(buffer.length / 1024).toFixed(0)} KB, ${mimeType})...`);

  // 1. Request a signed upload URL from Wix Media Manager
  const urlRes = await fetch("https://www.wixapis.com/site-media/v1/files/generate-upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "wix-site-id": siteId,
    },
    body: JSON.stringify({ mimeType, fileName }),
  });

  const urlBody = await urlRes.text();
  if (!urlRes.ok) {
    throw new Error(`Media upload URL failed ${urlRes.status}: ${urlBody}`);
  }

  const urlData = JSON.parse(urlBody);
  const uploadUrl = urlData.uploadUrl;
  console.log(`[leads] generate-upload-url response: ${JSON.stringify(urlData).slice(0, 500)}`);

  // 2. Upload the binary to the signed URL (filename query param required per Wix docs)
  const separator = uploadUrl.includes("?") ? "&" : "?";
  const uploadRes = await fetch(`${uploadUrl}${separator}filename=${encodeURIComponent(fileName)}`, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: buffer,
  });

  const uploadBody = await uploadRes.text();
  console.log(`[leads] Upload PUT response (${uploadRes.status}): ${uploadBody.slice(0, 500)}`);
  if (!uploadRes.ok) {
    throw new Error(`Photo binary upload failed ${uploadRes.status}: ${uploadBody}`);
  }

  // Wix PUT may return file info or just a status — try to extract URL
  let fileUrl = "";
  try {
    const uploadData = JSON.parse(uploadBody);
    fileUrl = uploadData.file?.url || uploadData.fileUrl || uploadData.file?.fileUrl || "";
    // If response has a file ID / path, construct the static URL
    if (!fileUrl && uploadData.file?.id) {
      fileUrl = `https://static.wixstatic.com/media/${uploadData.file.id}`;
    }
  } catch {
    // PUT returned non-JSON (just a status) — check generate-upload-url response for file path
    if (urlData.file?.id) {
      fileUrl = `https://static.wixstatic.com/media/${urlData.file.id}`;
    }
  }

  console.log(`[leads] Photo result: ${fileUrl || "(no URL — check logs above)"}`);
  return fileUrl;
}

/**
 * @param {object} inputs   — raw request body from /api/recommend
 * @param {string} email    — verified email from session token
 * @param {string} phone    — verified phone from session token
 * @param {object} result   — enriched Claude output (after product data merge)
 */
export async function saveLead(inputs, email, phone, result) {
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
      phone:              phone || "",
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

  const payload = { dataCollectionId: collectionId, dataItem };
  console.log(`[leads] Saving lead for ${email} to collection "${collectionId}"...`);

  const res = await fetch("https://www.wixapis.com/wix-data/v2/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "wix-site-id": siteId,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  if (!res.ok) {
    throw new Error(`Wix Data save failed ${res.status}: ${responseText}`);
  }

  console.log(`[leads] Saved lead for ${email} — Wix response: ${responseText.slice(0, 200)}`);
}
