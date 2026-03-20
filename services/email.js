/**
 * Branded recommendations email — sent after Claude returns results.
 * Uses Resend HTTP API (same as OTP flow).
 */

const BRAND_BROWN   = "#4a3728";
const BRAND_TERRA   = "#c9836a";
const BRAND_LIGHT   = "#a0614d";
const BG_PAGE       = "#fdf8f5";
const BG_CARD       = "#ffffff";
const BG_SOFT       = "#fff8f5";
const BORDER_COLOR  = "#f0e0d8";
const TEXT_MUTED    = "#9a8880";
const TEXT_BODY     = "#6a5a50";

function priorityLabel(p) {
  if (p === "must-have")   return { he: "חובה",  color: BRAND_TERRA };
  if (p === "recommended") return { he: "מומלץ", color: "#7a9a7a" };
  return                          { he: "בונוס", color: "#a0a0b0" };
}

function productBlock(rec) {
  const badge = priorityLabel(rec.priority);
  const price = rec.product_price ? `<span style="color:${TEXT_MUTED}; font-size:13px;">${rec.product_price}</span>` : "";
  const link  = rec.product_url
    ? `<a href="${rec.product_url}" style="display:inline-block; margin-top:12px; background:${BRAND_TERRA}; color:#fff; text-decoration:none; padding:8px 18px; border-radius:8px; font-size:13px;">← לדף המוצר</a>`
    : "";
  const image = rec.product_image
    ? `<img src="${rec.product_image}" alt="${rec.product_name}" style="width:80px; height:80px; object-fit:contain; float:left; margin-right:0; margin-left:16px; border-radius:8px;" />`
    : "";

  return `
    <div style="background:${BG_CARD}; border:1.5px solid ${BORDER_COLOR}; border-radius:14px; padding:18px; margin-bottom:16px; direction:rtl; overflow:hidden;">
      ${image}
      <div>
        <div style="margin-bottom:6px;">
          <span style="background:${badge.color}22; color:${badge.color}; border-radius:50px; padding:2px 10px; font-size:11px; font-weight:700;">${badge.he}</span>
        </div>
        <div style="font-size:16px; font-weight:700; color:${BRAND_BROWN}; margin-bottom:2px;">${rec.product_name}</div>
        ${price}
        <p style="color:${TEXT_BODY}; font-size:13px; line-height:1.6; margin:10px 0 6px;">${rec.reason}</p>
        <p style="color:${TEXT_MUTED}; font-size:12px; line-height:1.5; margin:0;">💡 ${rec.how_to_use}</p>
        ${link}
      </div>
      <div style="clear:both;"></div>
    </div>`;
}

function buildEmailHtml({ customerName, skinAnalysis, recommendations, routineSuggestion, generalAdvice }) {
  const firstName = (customerName || "").split(" ")[0] || "שלום";

  const skinTypeRow = skinAnalysis?.skin_type_assessment
    ? `<p style="font-size:14px; font-weight:600; color:${BRAND_BROWN}; margin:0 0 14px;">${skinAnalysis.skin_type_assessment}</p>`
    : "";

  const rootCauseBlock = skinAnalysis?.root_cause_analysis ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px; font-weight:700; color:${BRAND_TERRA}; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px;">⚗️ מה קורה בעור שלך</div>
      <p style="color:${TEXT_BODY}; font-size:13px; line-height:1.65; margin:0;">${skinAnalysis.root_cause_analysis}</p>
    </div>` : "";

  const prognosisBlock = skinAnalysis?.prognosis ? `
    <div>
      <div style="font-size:11px; font-weight:700; color:${BRAND_TERRA}; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px;">🎯 לאן מכאן</div>
      <p style="color:${TEXT_BODY}; font-size:13px; line-height:1.65; margin:0;">${skinAnalysis.prognosis}</p>
    </div>` : "";

  const productsHtml = (recommendations || []).map(productBlock).join("");

  const routineBlock = routineSuggestion ? `
    <div style="background:${BG_SOFT}; border:1.5px solid ${BORDER_COLOR}; border-radius:14px; padding:20px; margin-bottom:24px; direction:rtl;">
      <h3 style="color:${BRAND_BROWN}; font-size:15px; margin:0 0 12px;">📋 שגרת הטיפוח המומלצת עבורך</h3>
      <p style="color:${TEXT_BODY}; font-size:13px; line-height:1.7; margin:0 0 10px;">${routineSuggestion.replace(/\n/g, "<br/>")}</p>
      ${generalAdvice ? `<p style="color:${TEXT_MUTED}; font-size:12px; font-style:italic; margin:0;">${generalAdvice}</p>` : ""}
    </div>` : "";

  return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background:${BG_PAGE}; font-family: Arial, 'Helvetica Neue', sans-serif; direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_PAGE}; padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px; background:${BG_CARD}; border-radius:20px; overflow:hidden; border:1.5px solid ${BORDER_COLOR};">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg, ${BRAND_TERRA}, ${BRAND_LIGHT}); padding:32px 28px; text-align:center;">
            <div style="font-size:2rem; margin-bottom:8px;">🌿</div>
            <h1 style="color:#fff; font-size:22px; margin:0 0 4px;">הדו״ח האישי שלך מוכן</h1>
            <p style="color:rgba(255,255,255,0.85); font-size:14px; margin:0;">שלום ${firstName}, הנה הניתוח והמלצות הטיפוח האישיות שלך</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 24px 8px;">

            <!-- Skin Analysis -->
            <div style="background:linear-gradient(135deg, ${BG_SOFT}, #fef3ee); border:1.5px solid ${BORDER_COLOR}; border-radius:14px; padding:20px; margin-bottom:24px; direction:rtl;">
              <h2 style="color:${BRAND_BROWN}; font-size:15px; margin:0 0 14px;">🔍 ניתוח העור שלך</h2>
              ${skinTypeRow}
              ${rootCauseBlock}
              ${prognosisBlock}
            </div>

            <!-- Products -->
            <h2 style="color:${BRAND_BROWN}; font-size:15px; margin:0 0 14px; direction:rtl;">המוצרים המומלצים עבורך</h2>
            ${productsHtml}

            <!-- Routine -->
            ${routineBlock}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px 28px; text-align:center; border-top:1px solid ${BORDER_COLOR};">
            <p style="color:${BRAND_TERRA}; font-size:13px; margin:0 0 4px; font-weight:600;">lilachi 🌿</p>
            <p style="color:${TEXT_MUTED}; font-size:11px; margin:0;">טיפוח אישי, בדיוק בשבילך</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendRecommendationsEmail({ to, customerName, skinAnalysis, recommendations, routineSuggestion, generalAdvice }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM || "Lilachi <onboarding@resend.dev>";
  if (!apiKey) { console.warn("[email] RESEND_API_KEY not set — skipping recommendations email"); return; }

  const firstName = (customerName || "").split(" ")[0] || "";
  const subject   = firstName ? `${firstName}, הדו״ח האישי שלך מ-Lilachi 🌿` : "הדו״ח האישי שלך מ-Lilachi 🌿";

  const html = buildEmailHtml({ customerName, skinAnalysis, recommendations, routineSuggestion, generalAdvice });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }

  return await res.json();
}
