/**
 * OTP service — phone verification before Claude API call
 * Uses Twilio to send SMS codes.
 */

import twilio from "twilio";
import crypto from "crypto";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// In-memory store: normalizedPhone → { otp, expires, attempts, sendCount, lastSent }
const otpStore = new Map();

// In-memory verified tokens (single-use, 15-min TTL): token → { phone, email, expires }
const verifiedTokens = new Map();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expires < now) otpStore.delete(k);
  for (const [k, v] of verifiedTokens) if (v.expires < now) verifiedTokens.delete(k);
}, 10 * 60 * 1000);

// ── Helpers ──────────────────────────────────────────────

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return "+" + digits;
  if (digits.startsWith("0")) return "+972" + digits.slice(1);
  return "+" + digits;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP ─────────────────────────────────────────────

export async function sendOTP(rawPhone) {
  const phone = normalizePhone(rawPhone);
  const now = Date.now();
  const existing = otpStore.get(phone);

  // Rate limit: max 3 sends per phone per 10 minutes
  if (existing && existing.lastSent > now - 10 * 60 * 1000) {
    if (existing.sendCount >= 3) {
      throw new Error("יותר מדי ניסיונות שליחה. נסי שוב בעוד כמה דקות.");
    }
    // Enforce 30-second cooldown between sends
    if (existing.lastSent > now - 30 * 1000) {
      const wait = Math.ceil((existing.lastSent + 30000 - now) / 1000);
      throw new Error(`יש להמתין ${wait} שניות לפני שליחה חוזרת.`);
    }
  }

  const otp = generateOTP();
  otpStore.set(phone, {
    otp,
    expires: now + 5 * 60 * 1000, // 5-minute expiry
    attempts: 0,
    sendCount: (existing?.sendCount || 0) + 1,
    lastSent: now,
  });

  await client.messages.create({
    body: `קוד האימות שלך ל-lilachi הוא: ${otp} (תקף ל-5 דקות)`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  return { success: true };
}

// ── Verify OTP ───────────────────────────────────────────

export function verifyOTP(rawPhone, code, email) {
  const phone = normalizePhone(rawPhone);
  const record = otpStore.get(phone);

  if (!record) throw new Error("לא נמצא קוד עבור מספר זה. שלחי קוד מחדש.");
  if (Date.now() > record.expires) {
    otpStore.delete(phone);
    throw new Error("הקוד פג תוקף. שלחי קוד חדש.");
  }

  record.attempts++;
  if (record.attempts > 5) {
    otpStore.delete(phone);
    throw new Error("יותר מדי ניסיונות שגויים. שלחי קוד חדש.");
  }

  if (record.otp !== String(code).trim()) {
    throw new Error(`קוד שגוי. נותרו ${6 - record.attempts} ניסיונות.`);
  }

  // ✅ Valid — issue single-use session token
  otpStore.delete(phone);
  const token = crypto.randomUUID();
  verifiedTokens.set(token, {
    phone,
    email: email || null,
    expires: Date.now() + 15 * 60 * 1000, // 15 min to complete submission
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
