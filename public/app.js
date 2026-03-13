// State
let currentStep = 1;
const totalSteps = 4;
let gender = "";
let skinType = "";
let concerns = [];
let photoDataUrl = "";

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
      setError("concernsError", "נא לבחור לפחות בעיה אחת.");
      valid = false;
    }
  }
  if (step === 4) {
    if (!photoDataUrl) {
      alert("נא להעלות תמונה של הפנים.");
      valid = false;
    }
  }
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

// --- Photo upload ---
function setupPhotoUpload() {
  const input = document.getElementById("photoInput");
  const area = document.getElementById("uploadArea");
  const preview = document.getElementById("photoPreview");

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("התמונה חייבת להיות קטנה מ-10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      photoDataUrl = ev.target.result;
      preview.src = photoDataUrl;
      preview.style.display = "block";
      area.querySelector(".upload-icon").style.display = "none";
      area.querySelectorAll("p").forEach((p) => (p.style.display = "none"));
      area.classList.add("has-photo");
    };
    reader.readAsDataURL(file);
  });

  // Drag & drop
  area.addEventListener("dragover", (e) => { e.preventDefault(); area.style.borderColor = "#c9836a"; });
  area.addEventListener("dragleave", () => { area.style.borderColor = ""; });
  area.addEventListener("drop", (e) => {
    e.preventDefault();
    area.style.borderColor = "";
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event("change"));
    }
  });
}

// --- Submit ---
async function submitForm() {
  if (!validateStep(4)) return;

  const morningRoutine = document.getElementById("morningRoutine").value;
  const eveningRoutine = document.getElementById("eveningRoutine").value;
  const routine = [
    morningRoutine ? `Morning: ${morningRoutine}` : "",
    eveningRoutine ? `Evening: ${eveningRoutine}` : "",
  ].filter(Boolean).join(" | ");

  const payload = {
    age: parseInt(document.getElementById("age").value),
    gender,
    skinType,
    concerns,
    sensitivities: document.getElementById("sensitivities").value,
    routine,
    photo: photoDataUrl,
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
    if (!res.ok) throw new Error(data.error || "Something went wrong");

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
  const concerns = (analysis.detected_concerns || []).map((c) => `<span class="analysis-tag">${c}</span>`).join("");
  document.getElementById("analysisCard").innerHTML = `
    <h3>🔍 ניתוח העור שלך</h3>
    <div class="analysis-row">${concerns}</div>
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
    // Re-show form elements
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
  photoDataUrl = "";
  document.getElementById("age").value = "";
  document.getElementById("sensitivities").value = "";
  document.getElementById("morningRoutine").value = "";
  document.getElementById("eveningRoutine").value = "";
  document.getElementById("photoPreview").style.display = "none";
  document.querySelectorAll(".pill").forEach((p) => p.classList.remove("selected"));
  document.getElementById("uploadArea").classList.remove("has-photo");
  document.getElementById("uploadArea").querySelector(".upload-icon").style.display = "";
  document.getElementById("uploadArea").querySelectorAll("p").forEach((p) => (p.style.display = ""));

  goToStep(1);
}

// --- Init ---
setupSinglePills("genderPills", (v) => (gender = v));
setupSinglePills("skinTypePills", (v) => (skinType = v));
setupMultiPills("concernsPills", concerns);
setupPhotoUpload();
