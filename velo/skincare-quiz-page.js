/**
 * Skincare Quiz — Velo Page Code
 * Attach this to the "יועצת טיפוח" page in Wix Editor.
 *
 * ELEMENT IDS REQUIRED (set these in the Wix Editor):
 * ─────────────────────────────────────────────────────
 * #msbSteps          — Multi-State Box (7 states: step1–step5, loading, results)
 * #progressBar       — Progress bar element
 * #txtStepLabel      — Text: "שלב X מתוך 5"
 *
 * Step 1 (state "step1"):
 *   #inputAge              — Text input (number)
 *   #btnFemale, #btnMale   — Gender pill buttons
 *   #btnSkinOily, #btnSkinDry, #btnSkinCombo, #btnSkinNormal, #btnSkinSensitive, #btnSkinOther
 *   #inputSkinTypeOther    — Text input (hidden by default)
 *   #txtAgeError, #txtSkinTypeError — Error texts
 *   #btnNext1              — Next button
 *
 * Step 2 (state "step2"):
 *   Concern pills: #btnAcne, #btnBlackheads, #btnHormonalAcne, #btnOilySkin,
 *     #btnPostAcneMarks, #btnDryness, #btnSensitivity, #btnFineLines, #btnWrinkles,
 *     #btnSagging, #btnPigmentation, #btnSunDamage, #btnRedness, #btnLargePores,
 *     #btnUnevenTone, #btnUnevenTexture, #btnKP, #btnDullness, #btnDarkCircles,
 *     #btnStretchMarks, #btnDryLips, #btnDryHands, #btnSeborrhea, #btnAtopic, #btnRosacea
 *   #btnPregnant, #btnBreastfeeding, #btnPregnancyNone — Pregnancy pills
 *   #inputSensitivities    — Text input
 *   #txtConcernsError      — Error text
 *   #btnNext2, #btnBack2   — Nav buttons
 *
 * Step 3 (state "step3"):
 *   #btnTextureLight, #btnTextureRich, #btnTextureAuto — Texture pills
 *   #btnNext3, #btnBack3
 *
 * Step 4 (state "step4"):
 *   #btnUploadPhoto        — Wix Upload Button element
 *   #imgPreview            — Image element (hidden by default)
 *   #htmlCamera            — HTML Component for getUserMedia
 *   #btnTakePhoto          — Button to trigger camera
 *   #btnNext4, #btnBack4
 *
 * Step 5 (state "step5"):
 *   #inputName, #inputEmail, #inputPhone — Text inputs
 *   #inputOTP              — Text input
 *   #btnSendOTP            — Button
 *   #btnVerifyOTP          — Button
 *   #boxPhoneSection       — Box wrapping name/email/phone/send button
 *   #boxOtpSection         — Box wrapping OTP input/verify button (hidden initially)
 *   #txtOtpSentNote        — Text
 *   #txtNameError, #txtEmailError, #txtOtpError — Error texts
 *   #btnBack5
 *
 * Loading (state "loading"):
 *   #txtLoadingTitle       — Text
 *   #txtLoadingDesc        — Text
 *   #loadingProgressBar    — Progress bar
 *   #txtLoadingStage       — Text: "שלב X מתוך 7"
 *   #txtLoadingEmailNote   — Text (hidden initially)
 *
 * Results (state "results"):
 *   #txtAnalysisTitle      — Text
 *   #txtRootCause          — Text
 *   #txtPrognosis          — Text
 *   #repeaterProducts      — Repeater for product cards
 *   #txtRoutine            — Text (collapsed text / rich text)
 *   #txtGeneralAdvice      — Text
 *   #btnAddAllToCart        — Button
 *   #btnRestart            — Button
 */

import { sendOTP, verifyOTP, getRecommendations } from 'backend/skincareApi.jsw';
import { cart } from 'wix-stores-frontend';

// ── State ──────────────────────────────────────────────
let currentStep = 1;
const totalSteps = 5;
let gender = '';
let skinType = '';
let concerns = [];
let concernLabels = [];
let texturePreference = '';
let pregnancyStatus = '';
let photoDataUrl = '';
let verifiedToken = '';
let customerName = '';
let recommendationData = null;

// ── Pill Config ────────────────────────────────────────
// Maps button IDs to their data values (and Hebrew labels for concerns)

const GENDER_PILLS = [
  { id: '#btnFemale', value: 'female' },
  { id: '#btnMale', value: 'male' },
];

const SKIN_TYPE_PILLS = [
  { id: '#btnSkinOily', value: 'oily' },
  { id: '#btnSkinDry', value: 'dry' },
  { id: '#btnSkinCombo', value: 'combination' },
  { id: '#btnSkinNormal', value: 'normal' },
  { id: '#btnSkinSensitive', value: 'sensitive' },
  { id: '#btnSkinOther', value: 'other' },
];

const CONCERN_PILLS = [
  { id: '#btnAcne', value: 'acne', label: 'אקנה' },
  { id: '#btnBlackheads', value: 'blackheads', label: 'ראשים שחורים' },
  { id: '#btnHormonalAcne', value: 'hormonal acne', label: 'אקנה הורמונלי' },
  { id: '#btnOilySkin', value: 'oily skin', label: 'עור שמן' },
  { id: '#btnPostAcneMarks', value: 'post-acne marks', label: 'סימני אקנה' },
  { id: '#btnDryness', value: 'dryness', label: 'יובש' },
  { id: '#btnSensitivity', value: 'sensitivity', label: 'רגישות' },
  { id: '#btnFineLines', value: 'fine lines', label: 'קמטוטים' },
  { id: '#btnWrinkles', value: 'wrinkles', label: 'קמטים' },
  { id: '#btnSagging', value: 'skin sagging', label: 'רפיון' },
  { id: '#btnPigmentation', value: 'pigmentation', label: 'פיגמנטציה' },
  { id: '#btnSunDamage', value: 'sun damage', label: 'נזקי שמש' },
  { id: '#btnRedness', value: 'redness', label: 'אדמומיות' },
  { id: '#btnLargePores', value: 'large pores', label: 'נקבוביות מורחבות' },
  { id: '#btnUnevenTone', value: 'uneven skin tone', label: 'גוון עור לא אחיד' },
  { id: '#btnUnevenTexture', value: 'uneven texture', label: 'מרקם לא חלק' },
  { id: '#btnKP', value: 'keratosis pilaris', label: 'קרטוזיס פילריס (KP)' },
  { id: '#btnDullness', value: 'dullness', label: 'עור עייף וחסר ברק' },
  { id: '#btnDarkCircles', value: 'dark circles', label: 'כהויות בעיניים' },
  { id: '#btnStretchMarks', value: 'stretch marks', label: 'סימני מתיחה' },
  { id: '#btnDryLips', value: 'dry lips', label: 'יובש שפתיים' },
  { id: '#btnDryHands', value: 'dry hands', label: 'יובש כפות ידיים' },
  { id: '#btnSeborrhea', value: 'seborrhea', label: 'סבוריאה' },
  { id: '#btnAtopic', value: 'atopic dermatitis', label: 'אטופיק דרמטיטיס' },
  { id: '#btnRosacea', value: 'rosacea', label: 'רוזיציאה' },
];

const PREGNANCY_PILLS = [
  { id: '#btnPregnant', value: 'pregnant' },
  { id: '#btnBreastfeeding', value: 'breastfeeding' },
  { id: '#btnPregnancyNone', value: 'none' },
];

const TEXTURE_PILLS = [
  { id: '#btnTextureLight', value: 'light' },
  { id: '#btnTextureRich', value: 'rich' },
  { id: '#btnTextureAuto', value: 'no preference' },
];

// ── Pill Colors ────────────────────────────────────────
const PILL_DEFAULT_BG = '#FFFFFF';
const PILL_SELECTED_BG = '#c9836a';
const PILL_DEFAULT_COLOR = '#4a3728';
const PILL_SELECTED_COLOR = '#FFFFFF';

// ── Init ───────────────────────────────────────────────
$w.onReady(() => {
  // Hide optional elements
  $w('#inputSkinTypeOther').hide();
  $w('#boxOtpSection').hide();
  $w('#txtLoadingEmailNote').hide();

  // Clear error texts
  clearErrors();

  setupSinglePills(GENDER_PILLS, (val) => { gender = val; });
  setupSinglePills(PREGNANCY_PILLS, (val) => { pregnancyStatus = val; });
  setupSinglePills(TEXTURE_PILLS, (val) => { texturePreference = val; });

  setupSinglePills(SKIN_TYPE_PILLS, (val) => {
    skinType = val;
    if (val === 'other') {
      $w('#inputSkinTypeOther').show();
      $w('#inputSkinTypeOther').focus();
    } else {
      $w('#inputSkinTypeOther').hide();
    }
  });

  // Update skinType from "other" input
  $w('#inputSkinTypeOther').onInput((event) => {
    skinType = event.target.value.trim() || 'other';
  });

  setupMultiPills(CONCERN_PILLS);
  setupNavigation();
  setupOTP();
  setupPhotoUpload();
  setupResults();

  updateProgress();
});

// ── Single-select pills ────────────────────────────────
function setupSinglePills(pills, onSelect) {
  pills.forEach((pill) => {
    $w(pill.id).onClick(() => {
      // Deselect all in group
      pills.forEach((p) => {
        $w(p.id).style.backgroundColor = PILL_DEFAULT_BG;
        $w(p.id).style.color = PILL_DEFAULT_COLOR;
      });
      // Select this one
      $w(pill.id).style.backgroundColor = PILL_SELECTED_BG;
      $w(pill.id).style.color = PILL_SELECTED_COLOR;
      onSelect(pill.value);
    });
  });
}

// ── Multi-select pills (concerns) ──────────────────────
function setupMultiPills(pills) {
  pills.forEach((pill) => {
    $w(pill.id).onClick(() => {
      const idx = concerns.indexOf(pill.value);
      if (idx > -1) {
        // Deselect
        concerns.splice(idx, 1);
        concernLabels.splice(concernLabels.indexOf(pill.label), 1);
        $w(pill.id).style.backgroundColor = PILL_DEFAULT_BG;
        $w(pill.id).style.color = PILL_DEFAULT_COLOR;
      } else {
        // Select
        concerns.push(pill.value);
        concernLabels.push(pill.label);
        $w(pill.id).style.backgroundColor = PILL_SELECTED_BG;
        $w(pill.id).style.color = PILL_SELECTED_COLOR;
      }
    });
  });
}

// ── Navigation ─────────────────────────────────────────
function setupNavigation() {
  $w('#btnNext1').onClick(() => nextStep(1));
  $w('#btnNext2').onClick(() => nextStep(2));
  $w('#btnNext3').onClick(() => nextStep(3));
  $w('#btnNext4').onClick(() => nextStep(4));

  $w('#btnBack2').onClick(() => goToStep(1));
  $w('#btnBack3').onClick(() => goToStep(2));
  $w('#btnBack4').onClick(() => goToStep(3));
  $w('#btnBack5').onClick(() => goToStep(4));
}

function goToStep(n) {
  currentStep = n;
  const stateNames = ['step1', 'step2', 'step3', 'step4', 'step5', 'loading', 'results'];
  $w('#msbSteps').changeState(stateNames[n - 1]);
  updateProgress();
  $w('#msbSteps').scrollTo();
}

function updateProgress() {
  const pct = (currentStep / totalSteps) * 100;
  $w('#progressBar').targetValue = pct;
  $w('#txtStepLabel').text = `שלב ${currentStep} מתוך ${totalSteps}`;
}

function nextStep(from) {
  if (!validateStep(from)) return;
  goToStep(from + 1);
}

// ── Validation ─────────────────────────────────────────
function validateStep(step) {
  clearErrors();
  if (step === 1) {
    const age = parseInt($w('#inputAge').value);
    if (!age || age < 10 || age > 100) {
      $w('#txtAgeError').text = 'נא להזין גיל תקין (10–100).';
      $w('#txtAgeError').show();
      return false;
    }
    if (!skinType) {
      $w('#txtSkinTypeError').text = 'נא לבחור סוג עור.';
      $w('#txtSkinTypeError').show();
      return false;
    }
    return true;
  }
  if (step === 2) {
    if (!concerns.length) {
      $w('#txtConcernsError').text = 'נא לבחור לפחות מאפיין אחד.';
      $w('#txtConcernsError').show();
      return false;
    }
    return true;
  }
  return true; // Steps 3, 4 have no required fields
}

function clearErrors() {
  ['#txtAgeError', '#txtSkinTypeError', '#txtConcernsError', '#txtNameError', '#txtEmailError', '#txtOtpError'].forEach((id) => {
    try { $w(id).text = ''; $w(id).hide(); } catch (e) { /* element may not exist in current state */ }
  });
}

// ── OTP ────────────────────────────────────────────────
function setupOTP() {
  $w('#btnSendOTP').onClick(handleSendOTP);
  $w('#btnVerifyOTP').onClick(handleVerifyOTP);
}

async function handleSendOTP() {
  const name = $w('#inputName').value.trim();
  const email = $w('#inputEmail').value.trim();

  if (!name || name.length < 2) {
    $w('#txtNameError').text = 'נא להזין שם מלא.';
    $w('#txtNameError').show();
    return;
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    $w('#txtEmailError').text = 'נא להזין כתובת מייל תקינה.';
    $w('#txtEmailError').show();
    return;
  }
  customerName = name;

  $w('#btnSendOTP').disable();
  $w('#btnSendOTP').label = 'שולחת...';

  try {
    await sendOTP(email);
    $w('#txtOtpSentNote').text = `קוד נשלח ל-${email}`;
    $w('#boxPhoneSection').hide();
    $w('#boxOtpSection').show();
    $w('#inputOTP').focus();
  } catch (err) {
    $w('#txtEmailError').text = err.message;
    $w('#txtEmailError').show();
  } finally {
    $w('#btnSendOTP').enable();
    $w('#btnSendOTP').label = 'שלחי קוד אימות ←';
  }
}

async function handleVerifyOTP() {
  const email = $w('#inputEmail').value.trim();
  const phone = $w('#inputPhone').value.trim();
  const code = $w('#inputOTP').value.trim();

  if (!code || code.length !== 6) {
    $w('#txtOtpError').text = 'נא להזין קוד בן 6 ספרות.';
    $w('#txtOtpError').show();
    return;
  }

  $w('#btnVerifyOTP').disable();
  $w('#btnVerifyOTP').label = 'מאמתת...';

  try {
    const data = await verifyOTP(email, code, phone);
    verifiedToken = data.token;
    submitForm();
  } catch (err) {
    $w('#txtOtpError').text = err.message;
    $w('#txtOtpError').show();
    $w('#btnVerifyOTP').enable();
    $w('#btnVerifyOTP').label = '✨ קבלי המלצות אישיות';
  }
}

// ── Photo Upload ───────────────────────────────────────
function setupPhotoUpload() {
  // Wix Upload Button for gallery
  $w('#btnUploadPhoto').onChange((event) => {
    const file = event.target.value[0];
    if (file) {
      // The upload button returns a Wix media URL — we need base64 for the API
      // Use the upload button's fileType = "Image"
      $w('#imgPreview').src = file.url;
      $w('#imgPreview').show();
      // Store the URL — we'll need to convert or send differently
      photoDataUrl = file.url;
    }
  });

  // Camera via HTML Component
  $w('#btnTakePhoto').onClick(() => {
    $w('#htmlCamera').show();
    $w('#htmlCamera').postMessage({ type: 'startCamera' });
  });

  // Receive photo from camera HTML component
  $w('#htmlCamera').onMessage((event) => {
    if (event.data.type === 'photo') {
      photoDataUrl = event.data.dataUrl;
      $w('#imgPreview').src = photoDataUrl;
      $w('#imgPreview').show();
      $w('#htmlCamera').hide();
    }
    if (event.data.type === 'cancel') {
      $w('#htmlCamera').hide();
    }
  });
}

// ── Loading Stages ─────────────────────────────────────
const LOADING_STAGES = [
  { title: '🔍 סורקת את פרופיל העור שלך', desc: 'בוחנת את המאפיינים הייחודיים שדיווחת עליהם' },
  { title: '🧬 מזהה דפוסים ביולוגיים', desc: 'מזהה קשרים בין סוג העור, הגיל ואופי הבעיות' },
  { title: '⚗️ מנתחת את המנגנונים העוריים', desc: 'חוקרת את הגורמים הפנימיים שמאחורי מה שרואים' },
  { title: '🌿 מחפשת פתרונות נטורופתיים', desc: 'בוחנת את הקטלוג ומוצאת את מה שמתאים לפרופיל שלך' },
  { title: '💡 בוחרת מוצרים בשבילך', desc: 'מתאימה כל מוצר לצרכים הספציפיים שלך' },
  { title: '📋 בונה את שגרת הטיפוח שלך', desc: 'מעצבת שגרת בוקר וערב אישית' },
  { title: '✨ מסיימת את הדו״ח האישי שלך', desc: 'כמעט מוכן — עוד רגע' },
];

let loadingInterval = null;

function startLoadingStages() {
  let stage = 0;
  const total = LOADING_STAGES.length;
  const intervalMs = 12000;

  function applyStage(i) {
    const s = LOADING_STAGES[Math.min(i, total - 1)];
    $w('#txtLoadingTitle').text = s.title;
    $w('#txtLoadingDesc').text = s.desc;
    const pct = Math.round(((i + 1) / total) * 88);
    $w('#loadingProgressBar').targetValue = pct;
    $w('#txtLoadingStage').text = `שלב ${Math.min(i + 1, total)} מתוך ${total}`;

    if (i >= 1) {
      $w('#txtLoadingEmailNote').show('fade', { duration: 800 });
    }
  }

  applyStage(0);
  loadingInterval = setInterval(() => {
    stage++;
    if (stage < total) applyStage(stage);
    else clearInterval(loadingInterval);
  }, intervalMs);
}

function stopLoadingStages() {
  if (loadingInterval) { clearInterval(loadingInterval); loadingInterval = null; }
  $w('#loadingProgressBar').targetValue = 100;
}

// ── Submit ─────────────────────────────────────────────
async function submitForm() {
  const payload = {
    age: parseInt($w('#inputAge').value),
    gender,
    skinType,
    concerns,
    sensitivities: $w('#inputSensitivities').value,
    texturePreference,
    pregnancyStatus,
    photo: photoDataUrl || null,
    verifiedToken,
    customerName,
  };

  // Show loading
  $w('#progressBar').hide();
  $w('#txtStepLabel').hide();
  $w('#msbSteps').changeState('loading');
  startLoadingStages();

  try {
    const data = await getRecommendations(payload);
    stopLoadingStages();
    recommendationData = data;
    showResults(data);
  } catch (err) {
    stopLoadingStages();
    // Go back to step 5 with error
    $w('#progressBar').show();
    $w('#txtStepLabel').show();
    goToStep(5);
    $w('#txtOtpError').text = err.message || 'משהו השתבש, נסי שוב.';
    $w('#txtOtpError').show();
    $w('#btnVerifyOTP').enable();
    $w('#btnVerifyOTP').label = '✨ קבלי המלצות אישיות';
  }
}

// ── Results ────────────────────────────────────────────
function setupResults() {
  $w('#btnAddAllToCart').onClick(handleAddAllToCart);
  $w('#btnRestart').onClick(handleRestart);
}

function showResults(data) {
  $w('#msbSteps').changeState('results');

  // Skin analysis
  const analysis = data.skin_analysis || {};
  $w('#txtAnalysisTitle').text = analysis.skin_type_assessment || '';

  if (analysis.root_cause_analysis) {
    $w('#txtRootCause').text = analysis.root_cause_analysis;
    $w('#txtRootCause').show();
  }
  if (analysis.prognosis) {
    $w('#txtPrognosis').text = analysis.prognosis;
    $w('#txtPrognosis').show();
  }

  // Products repeater
  const recommendations = data.recommendations || [];
  $w('#repeaterProducts').data = recommendations.map((p, i) => ({
    _id: p.product_id || String(i),
    productName: p.product_name || '',
    productImage: p.product_image || '',
    productPrice: p.product_price || '',
    reason: p.reason || '',
    howToUse: p.how_to_use || '',
    priority: p.priority || 'recommended',
    productUrl: p.product_url || '',
    productId: p.product_id || '',
  }));

  $w('#repeaterProducts').onItemReady(($item, itemData) => {
    $item('#txtProductName').text = itemData.productName;
    $item('#txtProductPrice').text = itemData.productPrice;
    $item('#txtProductReason').text = itemData.reason;
    $item('#txtProductHowToUse').text = `💡 ${itemData.howToUse}`;

    if (itemData.productImage) {
      $item('#imgProduct').src = itemData.productImage;
      $item('#imgProduct').show();
    }

    // Priority badge
    const badgeLabels = { 'must-have': 'חובה', recommended: 'מומלץ', bonus: 'בונוס' };
    $item('#txtBadge').text = badgeLabels[itemData.priority] || 'מומלץ';

    // Add to cart button
    $item('#btnAddToCart').onClick(async () => {
      $item('#btnAddToCart').label = '⏳';
      $item('#btnAddToCart').disable();
      try {
        await cart.addProducts([{ productId: itemData.productId, quantity: 1 }]);
        $item('#btnAddToCart').label = '✓ נוסף לסל';
      } catch {
        $item('#btnAddToCart').label = '🛒 הוסיפי לסל';
        $item('#btnAddToCart').enable();
      }
    });

    // Product link
    if (itemData.productUrl) {
      $item('#btnProductLink').link = itemData.productUrl;
      $item('#btnProductLink').target = '_self';
      $item('#btnProductLink').show();
    }
  });

  // Routine
  if (data.routine_suggestion) {
    $w('#txtRoutine').text = data.routine_suggestion;
  }
  if (data.general_advice) {
    $w('#txtGeneralAdvice').text = data.general_advice;
  }
}

// ── Add All to Cart ────────────────────────────────────
async function handleAddAllToCart() {
  if (!recommendationData) return;

  $w('#btnAddAllToCart').label = '⏳ מוסיפה...';
  $w('#btnAddAllToCart').disable();

  const products = (recommendationData.recommendations || [])
    .filter((p) => p.product_id)
    .map((p) => ({ productId: p.product_id, quantity: 1 }));

  try {
    await cart.addProducts(products);
    $w('#btnAddAllToCart').label = '✓ כל המוצרים נוספו לסל';
  } catch {
    $w('#btnAddAllToCart').label = '🛒 הוסיפי את כל הסט לסל';
    $w('#btnAddAllToCart').enable();
  }
}

// ── Restart ────────────────────────────────────────────
function handleRestart() {
  // Reset state
  gender = '';
  skinType = '';
  concerns.length = 0;
  concernLabels.length = 0;
  texturePreference = '';
  pregnancyStatus = '';
  photoDataUrl = '';
  verifiedToken = '';
  customerName = '';
  recommendationData = null;

  // Reset inputs
  $w('#inputAge').value = '';
  $w('#inputSensitivities').value = '';
  $w('#inputName').value = '';
  $w('#inputEmail').value = '';
  $w('#inputPhone').value = '';
  $w('#inputOTP').value = '';
  $w('#inputSkinTypeOther').value = '';
  $w('#inputSkinTypeOther').hide();

  // Reset pill styles
  const allPills = [...GENDER_PILLS, ...SKIN_TYPE_PILLS, ...CONCERN_PILLS, ...PREGNANCY_PILLS, ...TEXTURE_PILLS];
  allPills.forEach((pill) => {
    try {
      $w(pill.id).style.backgroundColor = PILL_DEFAULT_BG;
      $w(pill.id).style.color = PILL_DEFAULT_COLOR;
    } catch (e) { /* element not in current state */ }
  });

  // Reset photo
  $w('#imgPreview').hide();

  // Reset OTP sections
  $w('#boxPhoneSection').show();
  $w('#boxOtpSection').hide();

  // Show progress
  $w('#progressBar').show();
  $w('#txtStepLabel').show();

  // Go to step 1
  goToStep(1);
}
