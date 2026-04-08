/**
 * Branded recommendations email — sent after Claude returns results.
 * Uses Brevo (ex-Sendinblue) HTTP API (same as OTP flow).
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

export async function sendLeadNotification({ email, inputs, result }) {
  const apiKey      = process.env.BREVO_API_KEY;
  const adminTo     = process.env.ADMIN_EMAIL;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "lilach@lilachi.com";
  const senderName  = process.env.BREVO_SENDER_NAME  || "Lilachi";
  if (!apiKey || !adminTo) {
    console.warn("[email] BREVO_API_KEY or ADMIN_EMAIL not set — skipping lead notification");
    return;
  }

  const { customerName = "", age = "", skinType = "", concerns = [], phone = "", gender = "", pregnancyStatus = "" } = inputs;

  // Translate English values to Hebrew for display
  const genderMap = { female: "אישה", male: "גבר" };
  const skinTypeMap = { oily: "שמן", dry: "יבש", combination: "מעורב", normal: "רגיל", sensitive: "רגיש", other: "אחר" };
  const concernMap = {
    "acne": "אקנה", "oily skin": "עור שמן", "blackheads": "ראשים שחורים",
    "hormonal acne": "אקנה הורמונלית", "acne scars": "צלקות אקנה",
    "pigmentation": "פיגמנטציה", "sun damage": "נזקי שמש",
    "fine lines": "קמטוטים", "wrinkles": "קמטים", "dryness": "יובש",
    "redness": "אדמומיות", "large pores": "נקבוביות מורחבות",
    "uneven skin tone": "גוון עור לא אחיד", "uneven texture": "מרקם לא חלק",
    "dark circles": "כהויות בעיניים", "puffy eyes": "נפיחות בעיניים",
    "sagging": "רפיון", "dullness": "עור עייף וחסר ברק",
    "stretch marks": "סימני מתיחה", "keratosis pilaris": "קרטוזיס פילריס",
    "seborrhea": "סבוריאה", "atopic dermatitis": "אטופיק דרמטיטיס",
    "rosacea": "רוזציאה",
  };
  const pregnancyMap = { none: "לא", pregnant: "בהריון", breastfeeding: "מניקה" };

  const heGender = genderMap[gender] || gender || "—";
  const heSkinType = skinTypeMap[skinType] || skinType || "—";
  const hePregnancy = pregnancyMap[pregnancyStatus] || pregnancyStatus || "—";
  const heConcerns = (concerns || []).map((c) => concernMap[c] || c).join(", ");

  const subject = `ליד חדש 🌿 — ${customerName || email}, ${age}, ${heSkinType}`;

  const productsListHtml = (result.recommendations || [])
    .map((r) => {
      const badge = priorityLabel(r.priority);
      return `<li style="margin-bottom:6px;">
        <span style="background:${badge.color}22; color:${badge.color}; border-radius:50px; padding:1px 8px; font-size:11px; font-weight:700; margin-left:6px;">${badge.he}</span>
        <strong>${r.product_name}</strong>
      </li>`;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0; padding:0; background:${BG_PAGE}; font-family: Arial, sans-serif; direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_PAGE}; padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px; background:${BG_CARD}; border-radius:20px; border:1.5px solid ${BORDER_COLOR};">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_TERRA},${BRAND_LIGHT}); padding:24px 28px; border-radius:18px 18px 0 0; text-align:center;">
            <div style="font-size:1.8rem; margin-bottom:6px;">🌿</div>
            <h1 style="color:#fff; font-size:18px; margin:0;">ליד חדש נכנס!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <table width="100%" style="border-collapse:collapse;">
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px; width:120px;">שם</td><td style="color:${BRAND_BROWN}; font-weight:600;">${customerName}</td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px;">מייל</td><td><a href="mailto:${email}" style="color:${BRAND_TERRA};">${email}</a></td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px;">טלפון</td><td style="color:${BRAND_BROWN};">${phone || "—"}</td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px;">מין</td><td style="color:${BRAND_BROWN};">${heGender}</td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px;">גיל</td><td style="color:${BRAND_BROWN};">${age}</td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px;">הריון והנקה</td><td style="color:${BRAND_BROWN};">${hePregnancy}</td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px;">סוג עור</td><td style="color:${BRAND_BROWN};">${heSkinType}</td></tr>
              <tr><td style="padding:6px 0; color:${TEXT_MUTED}; font-size:12px; vertical-align:top;">תלונות</td><td style="color:${BRAND_BROWN};">${heConcerns}</td></tr>
            </table>

            <hr style="border:none; border-top:1px solid ${BORDER_COLOR}; margin:18px 0;" />

            <h3 style="color:${BRAND_BROWN}; font-size:14px; margin:0 0 10px;">מוצרים שהומלצו:</h3>
            <ul style="margin:0; padding:0 18px; list-style:none;">${productsListHtml}</ul>

            ${result.skin_analysis?.root_cause_analysis ? `
            <hr style="border:none; border-top:1px solid ${BORDER_COLOR}; margin:18px 0;" />
            <h3 style="color:${BRAND_BROWN}; font-size:14px; margin:0 0 8px;">ניתוח עור:</h3>
            <p style="color:${TEXT_BODY}; font-size:13px; line-height:1.6; margin:0;">${result.skin_analysis.root_cause_analysis}</p>
            ` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px; text-align:center; border-top:1px solid ${BORDER_COLOR};">
            <p style="color:${TEXT_MUTED}; font-size:11px; margin:0;">כל הלידים שמורים ב-Wix CMS תחת Collections → leads</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: adminTo }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo lead notification error ${res.status}: ${body}`);
  }
}

export async function sendRecommendationsEmail({ to, customerName, skinAnalysis, recommendations, routineSuggestion, generalAdvice }) {
  const apiKey      = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "lilach@lilachi.com";
  const senderName  = process.env.BREVO_SENDER_NAME  || "Lilachi";
  if (!apiKey) { console.warn("[email] BREVO_API_KEY not set — skipping recommendations email"); return; }

  const firstName = (customerName || "").split(" ")[0] || "";
  const subject   = firstName ? `${firstName}, הדו״ח האישי שלך מ-Lilachi 🌿` : "הדו״ח האישי שלך מ-Lilachi 🌿";

  const html = buildEmailHtml({ customerName, skinAnalysis, recommendations, routineSuggestion, generalAdvice });

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }

  return await res.json();
}
