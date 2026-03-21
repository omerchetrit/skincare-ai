/**
 * כללי עסק להמלצת מוצרים — liloosh skincare
 * ============================================
 * קובץ זה הוא מקור האמת לכל כללי ההמלצה.
 * לעדכון כלל — ערכי כאן ובצעי git commit.
 * הכללים מוזרקים ישירות ל-prompt של Claude בכל בקשה.
 */

export const BUSINESS_RULES = `
MANDATORY BUSINESS RULES — follow these exactly, they override general skincare logic:

!!! CRITICAL ANTI-DUPLICATION RULE — CHECK THIS LAST BEFORE RESPONDING !!!
If you recommend a kit (ערכה), you MUST NOT also recommend any of its individual components separately.
The kit already includes those products — recommending them again is a duplication error.

EXAMPLES OF WHAT IS FORBIDDEN:
- Recommending "גזע + מולטי" AND ALSO "סרום מולטי ויטמין" → FORBIDDEN (מולטי is inside the kit)
- Recommending "גזע + מולטי" AND ALSO "קרם פנים תאי גזע" → FORBIDDEN (גזע is inside the kit)
- Recommending "ערכת לילה" AND ALSO "סרום לילה יוזו" → FORBIDDEN (יוזו is inside the kit)
- Recommending "ערכת לילה" AND ALSO "קרם הבהרה ללילה" → FORBIDDEN (קרם הבהרה is inside the kit)
- Recommending "מארז יום ולילה" AND ALSO "קרם יום חומצה היאלורונית" → FORBIDDEN
- Recommending "Beauty Kit" AND ALSO "סרום חומצה היאלורונית" → FORBIDDEN
- Recommending "COBRA Kit" AND ALSO "סרום קוברה" or "קרם קוברה" → FORBIDDEN

MANDATORY SELF-CHECK: Before writing your final recommendations array, go through each kit you selected and remove any individual product that is a component of that kit.

KITS vs SINGLE PRODUCTS (critical for counting):
- Each product in the catalog is tagged as either [ערכה] or [מוצר בודד].
- A kit (ערכה) contains multiple individual products. When a kit is tagged with "מכילה: X + Y", it counts as those individual products for the purpose of all limits below.
- A kit tagged only as [ערכה] without components listed: count it as 2 individual products.
- A [מוצר בודד] always counts as 1.
- Apply all the serum/cream/product limits below using this counting logic.

SERUMS:
- אין סיבה להמליץ על יותר מ-2 סרומים ברכישה — אחד ליום ואחד ללילה.
- סרום קוברה (COBRA) הוא הסרום הדיפולטיבי — מתאים לכולם, ליום ולערב. יש להמליץ עליו תמיד אלא אם קיים מצב מיוחד שמחייר סרום אחר (ראה להלן), או שהמשתמשת בהיריון/מניקה.
- פיגמנטציה → להמליץ על סרום לילה יוזו (ללילה בלבד). ניתן להוסיף אותו בנוסף לקוברה אם צריך גם סרום יומי.
- יובש → להמליץ על סרום מולטי ויטמין (מתאים ליום ולילה). ניתן להוסיף אותו בנוסף לקוברה.
- מרקם קליל / עור שמן / העדפת קלילות → סרום חומצה היאלורונית-ורד מתאים כסרום יום קליל.
- סרום מולטי ויטמין — מיועד בעיקר לנשים מגיל 45 ומעלה, עם יובש, עור עייף, או חיפוש אחר זוהר וגלואו. משתלב מצוין עם אבן גואשה. לנשים מגיל 50 ומעלה — חובה להמליץ עליו תמיד.
- סרום יוזו מתאים רק ללילה.
- סרום לילה יוזו הוא בעל עדיפות גבוהה — כאשר הוא עונה על המצב (פיגמנטציה, סימני אקנה, אקנה הורמונלית, נזקי שמש, אדמומיות, עור שמן עם אקנה), יש להמליץ עליו בעדיפות על פני סרום לילה אחר — תחת כל שאר התנאים (גיל, הריון, ערכות וכו׳).
- לנשים מתחת לגיל 25 — בדרך כלל לא ממליצים על סרום ליום. כן ממליצים על סרום קוברה ללילה.

CREAMS:
- אין סיבה להמליץ על יותר מ-2 קרמים בהמלצה.
- קרם הבהרה מתאים רק ללילה. שאר הקרמים מתאימים גם ליום וגם ללילה.
- קרם חומצה היאלורונית נחשב קליל — מתאים מגיל 30 ומעלה או בהתקיים קמטוטים.
- קרם תאי גזע נחשב עשיר — מתאים לעור יבש או לגילאי 40 ומעלה.
- קרם liloosh active cream הוא ממש קליל ומתאים לצעירות.
- קרם יום לעור מעורב עד שמן — מתאים לכל גיל עם עור שמן או אקנה (לא רק עד 28).
- קרם יום לעור צעיר — מתאים לגילאי 12–28 ללא פצעונים (או מעט פצעונים).
- Texture preference stated by user: follow it when choosing between cream options.

SOAPS:
- בכל רכישה ממליצים על הסבון שלנו: סבון פנים אובליפיחה גדול.
- אם יש אקנה — ממליצים על סבון טבעי במקום.
- IMPORTANT: The soap is its own separate product in the recommendations list. Do NOT mention the soap inside the reason or how_to_use of any other product. The soap gets its own reason and how_to_use fields.

EYE PRODUCTS:
- מוצרי עיניים — למצבים שבהם יש תלונות על עיניים.
- ככל שהתופעה כבדה יותר — יש להמליץ על יותר מוצרי עיניים.

PIGMENTATION:
- באופן כללי — טיפול בפיגמנטציה מתאים רק לטיפול לילה.

AGE-BASED RULES:
- מעל גיל 30 — תמיד להמליץ על ערכת לילה.
- גיל 40+ — קרם תאי גזע (עשיר).
- גיל 45+ — לשקול סרום מולטי ויטמין.

SPECIAL CONDITIONS:
- אם יש אטופיק דרמטיטיס או סבוריאה — להמליץ על מארז יום ולילה.

ACNE & OILY SKIN:
- אם יש אקנה, פצעונים, עור שמן, ראשים שחורים, או אקנה הורמונלית → להמליץ על קרם חומצה אזלאית (ערב) + קרם יום לעור מעורב עד שמן (בוקר). לגילאי 12–28 — ניתן להמליץ במקום על ערכת אקנה (הערכה המושלמת / 4 Steps Kit / 3 Steps Kit) לפי מורכבות המצב.
- עור שמן / עודף סבום → להעדיף מרקמים קלילים (light/matte), להימנע מקרמים עשירים. קרם יום לעור מעורב עד שמן מתאים לכל גיל עם עור שמן.
- אקנה הורמונלית (באזור הלסת/סנטר) → סרום לילה יוזו (niacinamide, azelaic acid) הוא הטיפול המתאים ביותר.

POST-ACNE & SUN DAMAGE:
- צלקות וסימני אקנה / post-acne marks → סרום לילה יוזו + קרם הבהרה ללילה (treat like pigmentation but with more emphasis on azelaic acid).
- נזקי שמש / sun damage → לטפל כמו פיגמנטציה: סרום לילה יוזו + קרם הבהרה ללילה.

FIRMNESS & SAGGING:
- רפיון / אובדן מוצקות / skin sagging → להדגיש COBRA (serum + cream) או ערכת COBRA Kit. קרם תאי גזע מתאים לגילאי 40+ עם רפיון.

STRETCH MARKS & BODY AREAS:
- סימני מתיחה (stretch marks) → המוצרים שלנו הם מוצרי פנים. ציין בעדינות שלסימני מתיחה על הגוף, הטיפול הוא בנפרד; אך ניתן להמליץ על שמן עיניים / קרם עשיר לטיפול קל בהיריון.
- יובש שפתיים / כפות ידיים → סרום מולטי ויטמין + קרם עשיר (תאי גזע). ציין שניתן להשתמש בהם גם על אזורים יבשים ספציפיים.
- משחת קלנדולה היא מוצר גוף בלבד — אין להמליץ עליה כמוצר פנים בשום מצב.

CREAM COMBINATIONS:
- קרם תאי גזע וקרם חומצה היאלורונית — אין טעם להמליץ על שניהם יחד. אם המלצת על קרם תאי גזע, אין לכלול קרם חומצה היאלורונית באותה המלצה, ולהפך.

TOTAL PRODUCTS: Recommend between 3 and 6 products. Only include products from the catalog that genuinely match.

PREGNANCY & BREASTFEEDING SAFETY:
- If the user is pregnant or breastfeeding, apply strict ingredient safety rules.
- DO NOT recommend products containing: retinol / vitamin A derivatives, salicylic acid (BHA), cobra peptide (COBRA serum or COBRA cream — avoid both).
- Safe to recommend: hyaluronic acid, niacinamide, vitamin C, vitamin E, peptides (non-cobra), aloe vera, squalane, azelaic acid (at standard concentrations).
- The סרום לילה יוזו contains azelaic acid and niacinamide — generally considered safe in pregnancy, but note it in how_to_use.
- The COBRA serum and COBRA cream both contain cobra peptide — NEVER recommend these to pregnant or breastfeeding users.
- The סרום מולטי ויטמין contains vitamin A (retinol) — NEVER recommend to pregnant or breastfeeding users.
- Any kit containing COBRA products (COBRA Kit, גזע + קוברה, Day Night Cobra) must also be avoided.
- If the user is pregnant/breastfeeding, mention in your routine_suggestion that the recommendations are adapted for pregnancy/breastfeeding safety.
`;
