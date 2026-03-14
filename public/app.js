// State
let currentStep = 1;
const totalSteps = 5;
let gender = "";
let skinType = "";
let concerns = [];
let texturePreference = "";
let pregnancyStatus = "";
let photoDataUrl = "";
let verifiedToken = "";
let customerName = "";

// --- Navigation ---
function goToStep(n) {
  document.querySelector(`#step${currentStep}`).classList.remove("active");
  currentStep = n;
  document.querySelector(`#step${currentStep}`).classList.add("active");
  document.getElementById("progressFill").style.width = `${(currentStep / totalSteps) * 100}%`;
  document.getElementById("stepLabel").textContent = `שלב ${currentStep} מתוך ${totalSteps}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function nextStep(from) {
  if (!validateStep(from)) return;
  goToStep(from + 1);
}

function prevStep(from) {
  goToStep(from - 1);
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}

function validateStep(step) {
  clearErrors();
  let valid = true;
  if (step === 1) {
    const age = document.getElementById("age").value;
    if (!age || age < 10 || age > 100) {
      setError("ageError", "נא להזין גיל תקין (10–100).");
      valid = false;
    }
    if (!skinType) {
      setError("skinTypeError", "נא לבחור סוג עור.");
      valid = false;
    }
  }
  if (step === 2) {
    if (!concerns.length) {
      setError("concernsError", "נא לבחור לפחות מאפיין אחד.");
      valid = false;
    }
  }
  // Step 4 (photo) is optional — no validation needed
  return valid;
}

// --- Single-select pills ---
function setupSinglePills(containerId, onSelect) {
  document.getElementById(containerId).addEventListener("click", (e) => {
    if (!e.target.classList.contains("pill")) return;
    document.querySelectorAll(`#${containerId} .pill`).forEach((p) => p.classList.remove("selected"));
    e.target.classList.add("selected");
    onSelect(e.target.dataset.value);
  });
}

// --- Multi-select pills ---
function setupMultiPills(containerId, arr) {
  document.getElementById(containerId).addEventListener("click", (e) => {
    if (!e.target.classList.contains("pill")) return;
    const val = e.target.dataset.value;
    if (e.target.classList.contains("selected")) {
      e.target.classList.remove("selected");
      const idx = arr.indexOf(val);
      if (idx > -1) arr.splice(idx, 1);
    } else {
      e.target.classList.add("selected");
      arr.push(val);
    }
  });
}

// --- Image compression (keeps quality high, stays under Claude API 5MB limit) ---
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("לא ניתן לקרוא את הקובץ"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("לא ניתן לפתוח את התמונה"));
      img.onload = () => {
        try {
          // Resize to max 2048px on longest side
          const MAX_DIM = 2048;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
            else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);

          // Reduce JPEG quality until under 4MB (Claude API cap is 5MB)
          let quality = 0.88;
          let dataUrl;
          do {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            const bytes = (dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75;
            if (bytes < 4 * 1024 * 1024) break;
            quality -= 0.08;
          } while (quality > 0.1);

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Photo upload ---
function setupPhotoUpload() {
  const input = document.getElementById("photoInput");
  const area = document.getElementById("uploadArea");
  const preview = document.getElementById("photoPreview");
  const icon = area.querySelector(".upload-icon");

  function resetUploadArea() {
    icon.textContent = "📷";
    icon.style.display = "";
    area.querySelectorAll("p").forEach((p) => (p.style.display = ""));
    preview.style.display = "none";
    preview.src = "";
    area.classList.remove("has-photo");
    photoDataUrl = "";
  }

  // Allow re-clicking the photo to change it
  preview.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUploadArea();
    input.value = "";
  });

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert("התמונה שבחרת כבדה מדי (מעל 25MB). נסי לשלוח תמונה שצולמה בפחות זום.");
      return;
    }

    // Show spinner while compressing
    icon.textContent = "⏳";
    icon.style.display = "";

    try {
      const compressed = await compressImage(file);
      photoDataUrl = compressed;
      preview.src = photoDataUrl;
      preview.style.display = "block";
      icon.style.display = "none";
      area.querySelectorAll("p").forEach((p) => (p.style.display = "none"));
      area.classList.add("has-photo");
    } catch (err) {
      icon.textContent = "📷";
      alert("לא הצלחנו לעבד את התמונה. נסי תמונה אחרת.");
    }
  });

  // Drag & drop
  area.addEventListener("dragover", (e) => { e.preventDefault(); area.style.borderColor = "#c9836a"; });
  area.addEventListener("dragleave", () => { area.style.borderColor = ""; });
  area.addEventListener("drop", (e) => {
    e.preventDefault();
    area.style.borderColor = "";
    if (area.classList.contains("has-photo")) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event("change"));
    }
  });
}

// --- OTP / Phone Verification ---

function showPhoneSection() {
  document.getElementById("phoneSection").style.display = "block";
  document.getElementById("otpSection").style.display = "none";
  document.getElementById("phoneError").textContent = "";
  document.getElementById("otpError").textContent = "";
}

async function sendOTPCode() {
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  document.getElementById("nameError").textContent = "";
  document.getElementById("phoneError").textContent = "";

  if (!name || name.length < 2) {
    document.getElementById("nameError").textContent = "נא להזין שם מלא.";
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById("phoneError").textContent = "נא להזין כתובת מייל תקינה.";
    return;
  }
  customerName = name;

  const btn = document.getElementById("sendOtpBtn");
  btn.disabled = true;
  btn.textContent = "שולחת...";

  try {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById("otpSentNote").textContent = `קוד נשלח ל-${email}`;
    document.getElementById("phoneSection").style.display = "none";
    document.getElementById("otpSection").style.display = "block";
    document.getElementById("otpInput").focus();
  } catch (err) {
    document.getElementById("phoneError").textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "שלחי קוד אימות ←";
  }
}

async function verifyOTPCode() {
  const email = document.getElementById("emailInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();
  const code = document.getElementById("otpInput").value.trim();
  document.getElementById("otpError").textContent = "";

  if (!code || code.length !== 6) {
    document.getElementById("otpError").textContent = "נא להזין קוד בן 6 ספרות.";
    return;
  }

  const btn = document.getElementById("verifyOtpBtn");
  btn.disabled = true;
  btn.textContent = "מאמתת...";

  try {
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    verifiedToken = data.token;
    submitForm();
  } catch (err) {
    document.getElementById("otpError").textContent = err.message;
    btn.disabled = false;
    btn.textContent = "✨ קבלי המלצות אישיות";
  }
}

// --- Submit ---
async function submitForm() {
  const payload = {
    age: parseInt(document.getElementById("age").value),
    gender,
    skinType,
    concerns,
    sensitivities: document.getElementById("sensitivities").value,
    texturePreference,
    pregnancyStatus,
    photo: photoDataUrl || null,
    verifiedToken,
    customerName,
  };

  // Show loading
  document.getElementById("skincareForm").style.display = "none";
  document.getElementById("progressBar").style.display = "none";
  document.getElementById("stepLabel").style.display = "none";
  document.querySelector(".header").style.display = "none";
  document.getElementById("loading").style.display = "block";

  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "משהו השתבש, נסי שוב.");

    showResults(data);
  } catch (err) {
    showError(true, err.message);
  }
}

// --- Render Results ---
function showResults(data) {
  document.getElementById("loading").style.display = "none";
  const results = document.getElementById("results");
  results.style.display = "block";

  // Skin analysis card
  const analysis = data.skin_analysis || {};
  const concernTags = (analysis.detected_concerns || []).map((c) => `<span class="analysis-tag">${c}</span>`).join("");
  document.getElementById("analysisCard").innerHTML = `
    <h3>🔍 ניתוח העור שלך</h3>
    <div class="analysis-row">${concernTags}</div>
    <p class="analysis-text"><strong>סוג עור:</strong> ${analysis.skin_type_assessment || "—"}</p>
    <p class="analysis-text" style="margin-top:8px;">${analysis.overall_condition || ""}</p>
  `;

  // Products
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = (data.recommendations || []).map((p) => {
    const badgeClass = p.priority === "must-have" ? "badge-must" : p.priority === "recommended" ? "badge-recommended" : "badge-bonus";
    const badgeLabel = p.priority === "must-have" ? "חובה" : p.priority === "recommended" ? "מומלץ" : "בונוס";
    const imageHtml = p.product_image
      ? `<img class="product-image" src="${p.product_image}" alt="${p.product_name}" />`
      : `<div class="product-image-placeholder">🌿</div>`;

    return `
      <div class="product-card">
        <div class="product-badge ${badgeClass}">${badgeLabel}</div>
        ${imageHtml}
        <div class="product-body">
          <div class="product-name">${p.product_name}</div>
          <div class="product-price">${p.product_price}</div>
          <div class="product-reason">${p.reason}</div>
          <div class="product-how">💡 ${p.how_to_use}</div>
          ${p.product_url ? `<a class="product-link" href="${p.product_url}" target="_blank">← לעמוד המוצר</a>` : ""}
        </div>
      </div>
    `;
  }).join("");

  // Routine
  if (data.routine_suggestion) {
    document.getElementById("routineCard").innerHTML = `
      <h3>📋 שגרת הטיפוח המומלצת עבורך</h3>
      <p>${data.routine_suggestion}</p>
      ${data.general_advice ? `<p style="margin-top:12px;font-style:italic;color:#9a8880;">${data.general_advice}</p>` : ""}
    `;
  }

  results.scrollIntoView({ behavior: "smooth" });
}

// --- Error ---
function showError(show, msg = "") {
  const box = document.getElementById("errorBox");
  if (show) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("errorMsg").textContent = msg || "משהו השתבש. נסה/י שוב.";
    box.style.display = "block";
    document.getElementById("skincareForm").style.display = "block";
    document.getElementById("progressBar").style.display = "block";
    document.getElementById("stepLabel").style.display = "block";
    document.querySelector(".header").style.display = "block";
  } else {
    box.style.display = "none";
  }
}

// --- Restart ---
function restart() {
  document.getElementById("results").style.display = "none";
  document.getElementById("skincareForm").style.display = "block";
  document.getElementById("progressBar").style.display = "block";
  document.getElementById("stepLabel").style.display = "block";
  document.querySelector(".header").style.display = "block";

  // Reset state
  gender = "";
  skinType = "";
  concerns.length = 0;
  texturePreference = "";
  pregnancyStatus = "";
  photoDataUrl = "";
  verifiedToken = "";
  customerName = "";
  document.getElementById("age").value = "";
  document.getElementById("sensitivities").value = "";
  document.getElementById("customerName").value = "";
  document.getElementById("phoneInput").value = "";
  document.getElementById("emailInput").value = "";
  document.getElementById("otpInput").value = "";
  showPhoneSection();
  document.getElementById("skinTypeOther").style.display = "none";
  document.getElementById("skinTypeOther").value = "";

  // Reset upload area
  const area = document.getElementById("uploadArea");
  const icon = area.querySelector(".upload-icon");
  icon.textContent = "📷";
  icon.style.display = "";
  area.querySelectorAll("p").forEach((p) => (p.style.display = ""));
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("photoPreview").src = "";
  area.classList.remove("has-photo");

  document.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));

  goToStep(1);
}

// --- Init ---
setupSinglePills("genderPills", (v) => (gender = v));
setupSinglePills("texturePills", (v) => (texturePreference = v));
setupSinglePills("pregnancyPills", (v) => (pregnancyStatus = v));
setupSinglePills("skinTypePills", (v) => {
  const otherInput = document.getElementById("skinTypeOther");
  if (v === "other") {
    otherInput.style.display = "block";
    otherInput.focus();
    skinType = otherInput.value.trim() || "other";
    otherInput.addEventListener("input", () => {
      skinType = otherInput.value.trim() || "other";
    });
  } else {
    otherInput.style.display = "none";
    skinType = v;
  }
});
setupMultiPills("concernsPills", concerns);
setupPhotoUpload();

// --- Wix iframe auto-resize ---
// Reports the page height to the parent Wix page so the iframe resizes dynamically
function reportHeight() {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "skincareAiHeight", height }, "*");
}
reportHeight();
new MutationObserver(reportHeight).observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
});
