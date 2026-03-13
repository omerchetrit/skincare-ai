/**
 * כללי עסק להמלצת מוצרים — liloosh skincare
 * ============================================
 * קובץ זה הוא מקור האמת לכל כללי ההמלצה.
 * לעדכון כלל — ערכי כאן ובצעי git commit.
 * הכללים מוזרקים ישירות ל-prompt של Claude בכל בקשה.
 */

export const BUSINESS_RULES = `
MANDATORY BUSINESS RULES — follow these exactly, they override general skincare logic:

KITS vs SINGLE PRODUCTS (critical for counting):
- Each product in the catalog is tagged as either [ערכה] or [מוצר בודד].
- A kit (ערכה) contains multiple individual products. When a kit is tagged with "מכילה: X + Y", it counts as those individual products for the purpose of all limits below.
  Example: "מולטי + גזה [ערכה — מכילה: מולטי + גזה]" counts as 1 serum AND 1 other product — not as a single item.
- A kit tagged only as [ערכה] without components listed: count it as 2 individual products.
- A [מוצר בודד] always counts as 1.
- Apply all the serum/cream/product limits below using this counting logic.

SERUMS:
- אין סיבה להמליץ על יותר מ-2 סרומים ברכישה — אחד ליום ואחד ללילה.
- סרום יוזו מתאים רק ללילה. שאר הסרומים מתאימים גם ליום וגם ללילה.
- סרום יוזו מתאים לכולם והוא הסרום הדיפולטיבי — מתאים לפיגמנטציה, לטיפול בקמטים. הוא תמיד מתאים רק ללילה.
- סרום מולטי ויטמין — מתאים למצבי יובש וקמטוטים, עור בוגר מעל גיל 45. מתאים גם ליום וגם ללילה.
- לנשים מתחת לגיל 25 — בדרך כלל לא ממליצים על סרום ליום. כן ממליצים על סרום יוזו ללילה.

CREAMS:
- אין סיבה להמליץ על יותר מ-2 קרמים בהמלצה.
- קרם הבהרה מתאים רק ללילה. שאר הקרמים מתאימים גם ליום וגם ללילה.
- קרם חומצה היאלורונית נחשב קליל — מתאים מגיל 30 ומעלה או בהתקיים קמטוטים.
- קרם תאי גזע נחשב עשיר — מתאים לעור יבש או לגילאי 40 ומעלה.
- קרם liloosh active cream הוא ממש קליל ומתאים לצעירות.
- קרם יום לעור מעורב עד שמן — מתאים מגיל 12 עד גיל 28 לסובלות מאקנה.
- קרם יום לעור צעיר — מתאים לגילאי 12–28 ללא פצעונים (או מעט פצעונים).
- Texture preference stated by user: follow it when choosing between cream options.

SOAPS:
- בכל רכישה ממליצים על הסבון שלנו: סבון פנים אובליפיחה גדול.
- אם יש אקנה — ממליצים על סבון טבעי במקום.

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

TOTAL PRODUCTS: Recommend between 3 and 6 products. Only include products from the catalog that genuinely match.
`;
