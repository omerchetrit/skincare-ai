/**
 * OTP service — email verification before Claude API call
 * Uses Nodemailer with Gmail SMTP (free).
 *
 * Required env vars:
 *   GMAIL_USER        — the Gmail address you send from (e.g. hello@lilachi.com)
 *   GMAIL_APP_PASSWORD — Gmail App Password (not your regular password)
 */

import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// In-memory store: email → { otp, expires, attempts, sendCount, lastSent }
const otpStore = new Map();

// In-memory verified tokens (single-use, 15-min TTL): token → { email, phone, expires }
const verifiedTokens = new Map();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expires < now) otpStore.delete(k);
  for (const [k, v] of verifiedTokens) if (v.expires < now) verifiedTokens.delete(k);
}, 10 * 60 * 1000);

// ── Helpers ──────────────────────────────────────────────

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP ─────────────────────────────────────────────

export async function sendOTP(email) {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const existing = otpStore.get(key);

  // Rate limit: max 3 sends per email per 10 minutes
  if (existing && existing.lastSent > now - 10 * 60 * 1000) {
    if (existing.sendCount >= 3) {
      throw new Error("יותר מדי ניסיונות שליחה. נסי שוב בעוד כמה דקות.");
    }
    // 30-second cooldown between sends
    if (existing.lastSent > now - 30 * 1000) {
      const wait = Math.ceil((existing.lastSent + 30000 - now) / 1000);
      throw new Error(`יש להמתין ${wait} שניות לפני שליחה חוזרת.`);
    }
  }

  const otp = generateOTP();
  otpStore.set(key, {
    otp,
    expires: now + 5 * 60 * 1000, // 5-minute expiry
    attempts: 0,
    sendCount: (existing?.sendCount || 0) + 1,
    lastSent: now,
  });

  await transporter.sendMail({
    from: `"lilachi ✨" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "קוד האימות שלך מ-lilachi",
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fdf9f7; border-radius: 16px; border: 1px solid #f0e6e0;">
        <h2 style="color: #4a3728; margin-bottom: 8px;">קוד האימות שלך</h2>
        <p style="color: #6a5a50; margin-bottom: 24px;">הזיני את הקוד הבא כדי להמשיך ולקבל את המלצות הטיפוח האישיות שלך:</p>
        <div style="background: #fff; border: 2px solid #c9836a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #c9836a;">${otp}</span>
        </div>
        <p style="color: #9a8880; font-size: 13px;">הקוד תקף ל-5 דקות. אם לא ביקשת קוד, ניתן להתעלם ממייל זה.</p>
        <hr style="border: none; border-top: 1px solid #f0e6e0; margin: 24px 0;" />
        <p style="color: #c9836a; font-size: 13px; text-align: center;">lilachi — טיפוח אישי, בדיוק בשבילך 🌿</p>
      </div>
    `,
  });

  return { success: true };
}

// ── Verify OTP ───────────────────────────────────────────

export function verifyOTP(email, code, phone) {
  const key = email.toLowerCase().trim();
  const record = otpStore.get(key);

  if (!record) throw new Error("לא נמצא קוד עבור כתובת זו. שלחי קוד מחדש.");
  if (Date.now() > record.expires) {
    otpStore.delete(key);
    throw new Error("הקוד פג תוקף. שלחי קוד חדש.");
  }

  record.attempts++;
  if (record.attempts > 5) {
    otpStore.delete(key);
    throw new Error("יותר מדי ניסיונות שגויים. שלחי קוד חדש.");
  }

  if (record.otp !== String(code).trim()) {
    const left = 6 - record.attempts;
    throw new Error(`קוד שגוי. נותרו ${left} ניסיונות.`);
  }

  // ✅ Valid — issue single-use session token
  otpStore.delete(key);
  const token = crypto.randomUUID();
  verifiedTokens.set(token, {
    email: key,
    phone: phone || null,
    expires: Date.now() + 15 * 60 * 1000,
  });

  return { token };
}

// ── Validate token (called by /api/recommend) ────────────

export function validateToken(token) {
  const record = verifiedTokens.get(token);
  if (!record) return null;
  if (Date.now() > record.expires) {
    verifiedTokens.delete(token);
    return null;
  }
  verifiedTokens.delete(token); // single-use
  return record;
}
