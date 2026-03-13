/**
 * ידע על מוצרי liloosh — מפת ערכות ומוצרים בודדים
 * ====================================================
 * קובץ זה מלמד את Claude בדיוק מה מכיל כל מוצר/ערכה,
 * כדי שיספור נכון כנגד המגבלות (2 סרומים, 2 קרמים וכו').
 *
 * לעדכון: הוסיפי/שני מוצר ובצעי git commit.
 * Claude מקבל מידע זה בכל בקשה.
 */

export const PRODUCT_KNOWLEDGE = `
=== PRODUCT KNOWLEDGE BASE — liloosh skincare ===

Use this to understand exactly what each product and kit contains,
so you can count correctly against the serum/cream limits.

--- INDIVIDUAL SERUMS ---

סרום לילה - סורבה יוזו (קיים בשני גדלים: 30מ"ל ו-50מ"ל)
  Type: SERUM (evening only)
  For: pigmentation, acne scars, post-acne redness, uneven texture
  Key ingredients: azelaic acid, niacinamide (B3), vitamin C/A/E, yuzu essential oil
  Note: This is the DEFAULT serum. Suits everyone. Evening only.

סרום מולטי ויטמין
  Type: SERUM (morning or evening)
  For: dry skin, fine lines, mature skin (45+)
  Key ingredients: vitamin C, E, omega 3/6/9

סרום חומצה היאלורונית / סרום חומצה היאלורונית-ורד (same product, two names)
  Type: SERUM (morning or evening)
  For: anti-aging, fine lines, collagen production
  Key ingredients: hyaluronic acid (nano), peptides

COBRA / סרום קוברה (also sold as 30ml or 50ml)
  Type: SERUM (morning or evening)
  For: firming, lifting, anti-wrinkle
  Key ingredients: cobra peptide (botox-like), antioxidants

סרום הבהרה לטיפול בפיגמנטציה ובכהויות
  Type: SERUM (evening only — pigmentation treatment)
  For: sun spots, hormonal pigmentation, age spots

--- INDIVIDUAL CREAMS ---

קרם פנים - חומצה היאלורונית (= קרם יום חומצה היאלורונית)
  Type: CREAM — LIGHT texture (day cream)
  For: ages 30+, fine lines, anti-aging, daily moisture
  Key ingredients: hyaluronic acid, peptides, natural oils

Liloosh Active Cream
  Type: CREAM — VERY LIGHT texture (day cream)
  For: young/active women, sports, teens to early 20s
  Key ingredients: hyaluronic acid, peptides, aloe vera

קרם יום לעור מעורב עד שמן
  Type: CREAM — LIGHT/MATTE texture (day cream)
  For: ages 12–28 with acne/oily skin
  Key ingredients: hyaluronic acid, vitamin E, green tea extract

קרם יום לעור צעיר
  Type: CREAM — LIGHT texture (day cream)
  For: ages 12–28 without acne or with minimal breakouts
  Key ingredients: aloe vera, squalane, vitamin E

קרם הבהרה והזנה ללילה
  Type: CREAM — RICH texture (evening only)
  For: pigmentation, dark spots, seborrhea, atopic dermatitis
  Note: Evening only. Also treats seborrhea and atopic dermatitis.

קרם פנים - תאי גזע
  Type: CREAM — RICH texture (day or evening)
  For: dry skin, ages 40+, anti-aging, firming
  Key ingredients: beet stem cells, geranium

COBRA Cream / קרם קוברה
  Type: CREAM — MEDIUM/SILKY texture (day or evening)
  For: firming, collagen boost, anti-aging
  Key ingredients: cobra peptide, moisturizers

קרם חומצה אזלאית (קיים בשני גדלים: 30מ"ל ו-regular)
  Type: CREAM — LIGHT texture (evening preferred)
  For: oily skin balance, redness, post-acne scars, brightening

--- INDIVIDUAL EYE PRODUCTS ---

קרם עיניים פעיל - קוויאר
  Type: EYE CREAM (day or evening)
  For: puffiness, dark circles, wrinkles around eyes
  Key ingredients: caviar oil, eye peptide, omega 3/6

שמן עיניים לטיפול בנפיחות וכהות
  Type: EYE OIL (evening preferred)
  For: dark circles, puffiness, wrinkles around eyes

--- SOAPS ---

סבון פנים אובליפיחה (קיים בשני גדלים: 120מ"ל ו-250מ"ל)
  Type: SOAP — the DEFAULT face soap for all purchases
  For: all skin types, gentle cleansing, balancing
  Note: Always recommend this UNLESS the user has acne → use סבון טבעי instead

סבון טבעי (קיים בשני גדלים)
  Type: SOAP — for acne-prone skin
  For: oily to combination skin, acne, pore cleansing
  Note: Recommend instead of אובליפיחה when user has acne

--- KITS — WHAT EACH CONTAINS (critical for counting) ---

גזע + מולטי
  Contains: קרם פנים תאי גזע (CREAM, rich) + סרום מולטי ויטמין (SERUM)
  Counts as: 1 cream + 1 serum

גזע + קוברה
  Contains: קרם פנים תאי גזע (CREAM, rich) + סרום קוברה (SERUM)
  Counts as: 1 cream + 1 serum

COBRA Kit
  Contains: סרום קוברה 50מ"ל (SERUM) + קרם קוברה 50מ"ל (CREAM)
  Counts as: 1 serum + 1 cream

Beauty Kit
  Contains: קרם פנים חומצה היאלורונית (CREAM, light) + סרום חומצה היאלורונית (SERUM)
  Counts as: 1 cream + 1 serum

ערכת לילה
  Contains: סרום לילה סורבה יוזו (SERUM, evening) + קרם הבהרה והזנה ללילה (CREAM, evening)
  Counts as: 1 serum + 1 cream
  Note: Full evening routine in one kit.

מארז יום ולילה
  Contains: קרם יום חומצה היאלורונית (CREAM, day) + קרם הבהרה והזנה ללילה (CREAM, evening)
  Counts as: 2 creams
  Note: Recommend for atopic dermatitis or seborrhea.

קיט עיניים להפחתת כהות
  Contains: קרם עיניים קוויאר (EYE CREAM) + שמן עיניים (EYE OIL)
  Counts as: 2 eye products (does NOT count against serum or cream limits)

Day, Night, Cobra
  Contains: סרום קוברה (SERUM) + קרם יום חומצה היאלורונית (CREAM, day) + קרם הבהרה ללילה (CREAM, evening)
  Counts as: 1 serum + 2 creams (3 individual items total)
  Note: Use when recommending this kit — it already fulfills both the serum and cream quotas.

הערכה המושלמת
  Contains: סבון טבעי + קרם יום לעור מעורב עד שמן + נוזל לטיפול בפצעונים + מסיכת דיטוקס פחם שחור
  Counts as: soap + 1 cream + acne treatment + mask
  For: oily skin with acne, ages 12–28

4 Steps Kit
  Contains: סבון טבעי + קרם יום מעורב עד שמן + נוזל לטיפול בפצעונים + מסיכת דיטוקס פחם שחור
  Counts as: soap + 1 cream + acne treatment + mask
  Similar to הערכה המושלמת. For: oily/acne skin.

3 Steps Kit
  Contains: סבון טבעי + קרם יום מעורב עד שמן + נוזל לטיפול בפצעונים
  Counts as: soap + 1 cream + acne treatment
  For: oily/acne skin (3-step routine)

ערכת התנסות בהתאמה אישית
  Contains: 4–5 mini products (personalized, 4–10ml each)
  Counts as: multiple mini items (not a standard recommendation)

=== END PRODUCT KNOWLEDGE ===
`;
