/**
 * Skincare AI — Wix Custom Element
 *
 * This is a self-contained Web Component that renders the entire skincare quiz.
 * Host on Railway, load in Wix via Custom Element.
 *
 * Cart: dispatches "addToCart" CustomEvent → Velo page code listens and adds to Wix cart.
 */

const API_BASE = "https://app.lilachi.com";

class SkincareWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // State
    this._currentStep = 1;
    this._totalSteps = 5;
    this._gender = "";
    this._skinType = "";
    this._concerns = [];
    this._concernLabels = [];
    this._texturePreference = "";
    this._pregnancyStatus = "";
    this._photoDataUrl = "";
    this._verifiedToken = "";
    this._customerName = "";
    this._cameraStream = null;
    this._loadingInterval = null;
    this._recommendationData = null;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      ${this._getHTML()}
    `;
    this._setupAll();
  }

  disconnectedCallback() {
    this._stopCamera();
    if (this._loadingInterval) clearInterval(this._loadingInterval);
  }

  // ── Helpers ──────────────────────────────────────────
  $(sel) { return this.shadowRoot.querySelector(sel); }
  $$(sel) { return this.shadowRoot.querySelectorAll(sel); }

  // ── Setup ────────────────────────────────────────────
  _setupAll() {
    this._setupSinglePills("genderPills", (v) => { this._gender = v; });
    this._setupSinglePills("texturePills", (v) => { this._texturePreference = v; });
    this._setupSinglePills("pregnancyPills", (v) => { this._pregnancyStatus = v; });
    this._setupSinglePills("skinTypePills", (v) => {
      this._skinType = v;
      const otherInput = this.$("#skinTypeOther");
      if (v === "other") {
        otherInput.style.display = "block";
        otherInput.focus();
        this._skinType = otherInput.value.trim() || "other";
      } else {
        otherInput.style.display = "none";
      }
    });

    this.$("#skinTypeOther").addEventListener("input", (e) => {
      this._skinType = e.target.value.trim() || "other";
    });

    this._setupMultiPills("concernsPills", this._concerns);
    this._setupPhotoUpload();
    this._setupNavButtons();
    this._setupOTP();
  }

  // ── Single-select pills ──────────────────────────────
  _setupSinglePills(containerId, onSelect) {
    this.$(`#${containerId}`).addEventListener("click", (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      this.$$(`#${containerId} .pill`).forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");
      onSelect(pill.dataset.value);
    });
  }

  // ── Multi-select pills ──────────────────────────────
  _setupMultiPills(containerId, arr) {
    this.$(`#${containerId}`).addEventListener("click", (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      const val = pill.dataset.value;
      const label = pill.dataset.label || pill.textContent.trim();
      if (pill.classList.contains("selected")) {
        pill.classList.remove("selected");
        const idx = arr.indexOf(val);
        if (idx > -1) arr.splice(idx, 1);
        if (containerId === "concernsPills") {
          const li = this._concernLabels.indexOf(label);
          if (li > -1) this._concernLabels.splice(li, 1);
        }
      } else {
        pill.classList.add("selected");
        arr.push(val);
        if (containerId === "concernsPills") this._concernLabels.push(label);
      }
    });
  }

  // ── Navigation ───────────────────────────────────────
  _setupNavButtons() {
    // Next buttons
    this.$$("[data-action='next']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const from = parseInt(btn.dataset.from);
        this._nextStep(from);
      });
    });
    // Back buttons
    this.$$("[data-action='back']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const to = parseInt(btn.dataset.to);
        this._goToStep(to);
      });
    });
    // Restart
    const restartBtn = this.$("#btnRestart");
    if (restartBtn) restartBtn.addEventListener("click", () => this._restart());
    // Show phone section (re-send OTP)
    const resendBtn = this.$("#btnResendOtp");
    if (resendBtn) resendBtn.addEventListener("click", () => this._showPhoneSection());
  }

  _goToStep(n) {
    this.$(`#step${this._currentStep}`).classList.remove("active");
    this._currentStep = n;
    this.$(`#step${this._currentStep}`).classList.add("active");
    this.$("#progressFill").style.width = `${(this._currentStep / this._totalSteps) * 100}%`;
    this.$("#stepLabel").textContent = `שלב ${this._currentStep} מתוך ${this._totalSteps}`;
    // Only show header intro text on step 1
    this.$(".header").style.display = n === 1 ? "block" : "none";
    this.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  _nextStep(from) {
    if (!this._validateStep(from)) return;
    this._goToStep(from + 1);
  }

  // ── Validation ───────────────────────────────────────
  _validateStep(step) {
    this._clearErrors();
    if (step === 1) {
      const age = this.$("#age").value;
      if (!age || age < 10 || age > 100) {
        this.$("#ageError").textContent = "נא להזין גיל תקין (10–100).";
        return false;
      }
      if (!this._skinType) {
        this.$("#skinTypeError").textContent = "נא לבחור סוג עור.";
        return false;
      }
    }
    if (step === 2) {
      if (!this._concerns.length) {
        this.$("#concernsError").textContent = "נא לבחור לפחות מאפיין אחד.";
        return false;
      }
    }
    return true;
  }

  _clearErrors() {
    this.$$(".field-error").forEach((el) => (el.textContent = ""));
  }

  _setError(id, msg) {
    const el = this.$(`#${id}`);
    if (el) el.textContent = msg;
  }

  // ── Photo ────────────────────────────────────────────
  _setupPhotoUpload() {
    const input = this.$("#photoInput");
    const area = this.$("#uploadArea");
    const preview = this.$("#photoPreview");
    const icon = area.querySelector(".upload-icon");
    const photoOptions = this.$(".photo-options");
    const viewfinder = this.$("#cameraViewfinder");
    const video = this.$("#cameraVideo");
    const canvas = this.$("#cameraCanvas");

    const showPreview = (dataUrl) => {
      area.style.display = "block";
      photoOptions.style.display = "none";
      viewfinder.style.display = "none";
      this._photoDataUrl = dataUrl;
      preview.src = dataUrl;
      preview.style.display = "block";
      icon.style.display = "none";
      area.querySelectorAll("p").forEach((p) => (p.style.display = "none"));
      area.classList.add("has-photo");
    };

    const resetUploadArea = () => {
      this._stopCamera();
      icon.textContent = "📷";
      icon.style.display = "";
      area.querySelectorAll("p").forEach((p) => (p.style.display = ""));
      preview.style.display = "none";
      preview.src = "";
      area.classList.remove("has-photo");
      area.style.display = "none";
      photoOptions.style.display = "";
      this._photoDataUrl = "";
    };

    preview.addEventListener("click", (e) => {
      e.stopPropagation();
      resetUploadArea();
      input.value = "";
    });

    // Camera button
    this.$("#btnTakePhoto").addEventListener("click", async () => {
      try {
        this._cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        video.srcObject = this._cameraStream;
        viewfinder.style.display = "block";
        photoOptions.style.display = "none";
      } catch (err) {
        console.error("Camera error:", err);
        alert("לא הצלחנו לגשת למצלמה. ודאי שאישרת גישה למצלמה בדפדפן.");
      }
    });

    // Snap
    this.$("#btnSnap").addEventListener("click", async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      this._stopCamera();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const file = this._dataUrlToFile(dataUrl);
      try {
        const compressed = await this._compressImage(file);
        showPreview(compressed);
      } catch {
        alert("לא הצלחנו לעבד את התמונה. נסי שוב.");
        resetUploadArea();
      }
    });

    // Cancel camera
    this.$("#btnCancelCamera").addEventListener("click", () => {
      this._stopCamera();
      photoOptions.style.display = "";
    });

    // Gallery upload
    this.$("#btnUploadPhoto").addEventListener("click", () => input.click());

    const handleFile = async (file) => {
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) {
        alert("התמונה שבחרת כבדה מדי (מעל 25MB). נסי לשלוח תמונה שצולמה בפחות זום.");
        return;
      }
      area.style.display = "block";
      photoOptions.style.display = "none";
      icon.textContent = "⏳";
      icon.style.display = "";
      try {
        const compressed = await this._compressImage(file);
        showPreview(compressed);
      } catch {
        icon.textContent = "📷";
        alert("לא הצלחנו לעבד את התמונה. נסי תמונה אחרת.");
        resetUploadArea();
      }
    };

    input.addEventListener("change", (e) => handleFile(e.target.files[0]));

    // Drag & drop
    area.addEventListener("dragover", (e) => { e.preventDefault(); area.style.borderColor = "#c9836a"; });
    area.addEventListener("dragleave", () => { area.style.borderColor = ""; });
    area.addEventListener("drop", (e) => {
      e.preventDefault();
      area.style.borderColor = "";
      if (area.classList.contains("has-photo")) return;
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  _stopCamera() {
    if (this._cameraStream) {
      this._cameraStream.getTracks().forEach((t) => t.stop());
      this._cameraStream = null;
    }
    const vf = this.$("#cameraViewfinder");
    if (vf) vf.style.display = "none";
  }

  _dataUrlToFile(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new File([arr], "camera.jpg", { type: mime });
  }

  _compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("לא ניתן לקרוא את הקובץ"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("לא ניתן לפתוח את התמונה"));
        img.onload = () => {
          try {
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
            let quality = 0.88;
            let dataUrl;
            do {
              dataUrl = canvas.toDataURL("image/jpeg", quality);
              const bytes = (dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75;
              if (bytes < 4 * 1024 * 1024) break;
              quality -= 0.08;
            } while (quality > 0.1);
            resolve(dataUrl);
          } catch (err) { reject(err); }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── OTP ──────────────────────────────────────────────
  _setupOTP() {
    this.$("#sendOtpBtn").addEventListener("click", () => this._sendOTPCode());
    this.$("#verifyOtpBtn").addEventListener("click", () => this._verifyOTPCode());
  }

  _showPhoneSection() {
    this.$("#phoneSection").style.display = "block";
    this.$("#otpSection").style.display = "none";
    this.$("#phoneError").textContent = "";
    this.$("#otpError").textContent = "";
  }

  async _sendOTPCode() {
    const name = this.$("#customerName").value.trim();
    const email = this.$("#emailInput").value.trim();
    this.$("#nameError").textContent = "";
    this.$("#phoneError").textContent = "";

    if (!name || name.length < 2) {
      this.$("#nameError").textContent = "נא להזין שם מלא.";
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.$("#phoneError").textContent = "נא להזין כתובת מייל תקינה.";
      return;
    }
    this._customerName = name;

    const btn = this.$("#sendOtpBtn");
    btn.disabled = true;
    btn.textContent = "שולחת...";

    try {
      const res = await fetch(`${API_BASE}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.$("#otpSentNote").textContent = `קוד נשלח ל-${email}`;
      this.$("#phoneSection").style.display = "none";
      this.$("#otpSection").style.display = "block";
      this.$("#otpInput").focus();
    } catch (err) {
      this.$("#phoneError").textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "שלחי קוד אימות ←";
    }
  }

  async _verifyOTPCode() {
    const email = this.$("#emailInput").value.trim();
    const phone = this.$("#phoneInput").value.trim();
    const code = this.$("#otpInput").value.trim();
    this.$("#otpError").textContent = "";

    if (!code || code.length !== 6) {
      this.$("#otpError").textContent = "נא להזין קוד בן 6 ספרות.";
      return;
    }

    const btn = this.$("#verifyOtpBtn");
    btn.disabled = true;
    btn.textContent = "מאמתת...";

    try {
      const res = await fetch(`${API_BASE}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this._verifiedToken = data.token;
      this._submitForm();
    } catch (err) {
      this.$("#otpError").textContent = err.message;
      btn.disabled = false;
      btn.textContent = "✨ קבלי המלצות אישיות";
    }
  }

  // ── Loading ──────────────────────────────────────────
  _LOADING_STAGES = [
    { title: "🔍 סורקת את פרופיל העור שלך", desc: "בוחנת את המאפיינים הייחודיים שדיווחת עליהם" },
    { title: "🧬 מזהה דפוסים ביולוגיים", desc: "מזהה קשרים בין סוג העור, הגיל ואופי הבעיות" },
    { title: "⚗️ מנתחת את המנגנונים העוריים", desc: "חוקרת את הגורמים הפנימיים שמאחורי מה שרואים" },
    { title: "🌿 מחפשת פתרונות נטורופתיים", desc: "בוחנת את הקטלוג ומוצאת את מה שמתאים לפרופיל שלך" },
    { title: "💡 בוחרת מוצרים בשבילך", desc: "מתאימה כל מוצר לצרכים הספציפיים שלך" },
    { title: "📋 בונה את שגרת הטיפוח שלך", desc: "מעצבת שגרת בוקר וערב אישית" },
    { title: "✨ מסיימת את הדו״ח האישי שלך", desc: "כמעט מוכן — עוד רגע" },
  ];

  _startLoadingStages() {
    let stage = 0;
    const total = this._LOADING_STAGES.length;
    const intervalMs = 12000;

    const applyStage = (i) => {
      const s = this._LOADING_STAGES[Math.min(i, total - 1)];
      const titleEl = this.$("#loadingStageTitle");
      const descEl = this.$("#loadingStageDesc");
      const fillEl = this.$("#loadingBarFill");
      const labelEl = this.$("#loadingStageLabel");

      titleEl.style.opacity = "0";
      descEl.style.opacity = "0";
      setTimeout(() => {
        titleEl.textContent = s.title;
        descEl.textContent = s.desc;
        titleEl.style.opacity = "1";
        descEl.style.opacity = "1";
      }, 350);

      const pct = Math.round(((i + 1) / total) * 88);
      fillEl.style.width = pct + "%";
      labelEl.textContent = `שלב ${Math.min(i + 1, total)} מתוך ${total}`;

      if (i >= 1) {
        this.$("#loadingEmailNote").style.opacity = "1";
      }
    };

    applyStage(0);
    this._loadingInterval = setInterval(() => {
      stage++;
      if (stage < total) applyStage(stage);
      else clearInterval(this._loadingInterval);
    }, intervalMs);
  }

  _stopLoadingStages() {
    if (this._loadingInterval) { clearInterval(this._loadingInterval); this._loadingInterval = null; }
    const fillEl = this.$("#loadingBarFill");
    if (fillEl) fillEl.style.width = "100%";
  }

  // ── Submit ───────────────────────────────────────────
  async _submitForm() {
    const payload = {
      age: parseInt(this.$("#age").value),
      gender: this._gender,
      skinType: this._skinType,
      concerns: this._concerns,
      sensitivities: this.$("#sensitivities").value,
      texturePreference: this._texturePreference,
      pregnancyStatus: this._pregnancyStatus,
      photo: this._photoDataUrl || null,
      verifiedToken: this._verifiedToken,
      customerName: this._customerName,
    };

    this.$("#skincareForm").style.display = "none";
    this.$("#progressBar").style.display = "none";
    this.$("#stepLabel").style.display = "none";
    this.$(".header").style.display = "none";
    this.$("#loading").style.display = "block";
    this._startLoadingStages();

    try {
      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "משהו השתבש, נסי שוב.");

      this._stopLoadingStages();
      this._recommendationData = data;
      this._showResults(data);
    } catch (err) {
      this._stopLoadingStages();
      this._showError(err.message);
    }
  }

  // ── Results ──────────────────────────────────────────
  _showResults(data) {
    this.$("#loading").style.display = "none";
    const results = this.$("#results");
    results.style.display = "block";

    const analysis = data.skin_analysis || {};
    const concernTags = this._concernLabels.map((c) => `<span class="analysis-tag">${c}</span>`).join("");
    this.$("#analysisCard").innerHTML = `
      <h3>🔍 ניתוח העור שלך</h3>
      <div class="analysis-row">${concernTags}</div>
      <p class="analysis-skin-type">${analysis.skin_type_assessment || "—"}</p>
      ${analysis.root_cause_analysis ? `
        <div class="analysis-section">
          <div class="analysis-section-title">⚗️ מה קורה בעור שלך</div>
          <p class="analysis-text">${analysis.root_cause_analysis}</p>
        </div>` : ""}
      ${analysis.prognosis ? `
        <div class="analysis-section">
          <div class="analysis-section-title">🎯 לאן מכאן</div>
          <p class="analysis-text">${analysis.prognosis}</p>
        </div>` : ""}
    `;

    const grid = this.$("#productsGrid");
    const recommendations = data.recommendations || [];
    grid.innerHTML = recommendations.map((p) => {
      const badgeClass = p.priority === "must-have" ? "badge-must" : p.priority === "recommended" ? "badge-recommended" : "badge-bonus";
      const badgeLabel = p.priority === "must-have" ? "חובה" : p.priority === "recommended" ? "מומלץ" : "בונוס";
      const imageHtml = p.product_image
        ? `<img class="product-image" src="${p.product_image}" alt="${p.product_name}" />`
        : `<div class="product-image-placeholder">🌿</div>`;

      const cartBtn = p.product_id
        ? `<button class="btn-add-cart" data-product-id="${p.product_id}">🛒 הוסיפי לסל</button>`
        : "";

      return `
        <div class="product-card">
          <div class="product-badge ${badgeClass}">${badgeLabel}</div>
          ${imageHtml}
          <div class="product-body">
            <div class="product-name">${p.product_name}</div>
            <div class="product-price">${p.product_price}</div>
            <div class="product-reason">${p.reason}</div>
            <div class="product-how">💡 ${p.how_to_use}</div>
            <div class="product-actions">
              ${p.product_url ? `<a class="product-link" href="${p.product_url}" target="_blank">← פרטים</a>` : ""}
              ${cartBtn}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Wire up individual "add to cart" buttons
    this.$$(".btn-add-cart").forEach((btn) => {
      btn.addEventListener("click", () => {
        const productId = btn.dataset.productId;
        btn.textContent = "⏳";
        btn.disabled = true;
        this.dispatchEvent(new CustomEvent("addToCart", {
          detail: { productIds: [productId] },
          bubbles: true,
          composed: true,
        }));
        // Mark as added after a short delay (Velo will handle the actual cart)
        setTimeout(() => { btn.textContent = "✓ נוסף לסל"; }, 1500);
      });
    });

    // Swipe hint
    const hint = this.$("#carouselHint");
    if (hint) {
      hint.textContent = recommendations.length > 1
        ? `← גללי לצד שמאל לעוד מוצרים  •  ${recommendations.length} מוצרים בסך הכל`
        : "";
    }

    // Add-all button
    const allCartBtn = this.$("#addAllToCartBtn");
    const ids = recommendations.map((p) => p.product_id).filter(Boolean);
    if (ids.length > 0) {
      allCartBtn.style.display = "block";
      allCartBtn.onclick = () => {
        allCartBtn.textContent = "⏳ מוסיפה...";
        allCartBtn.disabled = true;
        this.dispatchEvent(new CustomEvent("addToCart", {
          detail: { productIds: ids },
          bubbles: true,
          composed: true,
        }));
        setTimeout(() => { allCartBtn.textContent = "✓ כל המוצרים נוספו לסל"; }, 1500);
      };
    } else {
      allCartBtn.style.display = "none";
    }

    // Routine
    if (data.routine_suggestion) {
      this.$("#routineCard").innerHTML = `
        <h3>📋 שגרת הטיפוח המומלצת עבורך</h3>
        <p>${data.routine_suggestion}</p>
        ${data.general_advice ? `<p style="margin-top:12px;font-style:italic;color:#9a8880;">${data.general_advice}</p>` : ""}
      `;
    }

    results.scrollIntoView({ behavior: "smooth" });
  }

  // ── Error ────────────────────────────────────────────
  _showError(msg) {
    this.$("#loading").style.display = "none";
    this.$("#errorMsg").textContent = msg || "משהו השתבש. נסה/י שוב.";
    this.$("#errorBox").style.display = "block";
    this.$("#skincareForm").style.display = "block";
    this.$("#progressBar").style.display = "block";
    this.$("#stepLabel").style.display = "block";
    this.$(".header").style.display = "block";

    this.$("#btnDismissError").addEventListener("click", () => {
      this.$("#errorBox").style.display = "none";
    }, { once: true });
  }

  // ── Restart ──────────────────────────────────────────
  _restart() {
    this.$("#results").style.display = "none";
    this.$("#skincareForm").style.display = "block";
    this.$("#progressBar").style.display = "block";
    this.$("#stepLabel").style.display = "block";
    this.$(".header").style.display = "block";

    this._gender = "";
    this._skinType = "";
    this._concerns.length = 0;
    this._concernLabels.length = 0;
    this._texturePreference = "";
    this._pregnancyStatus = "";
    this._photoDataUrl = "";
    this._verifiedToken = "";
    this._customerName = "";
    this._recommendationData = null;

    this.$("#age").value = "";
    this.$("#sensitivities").value = "";
    this.$("#customerName").value = "";
    this.$("#phoneInput").value = "";
    this.$("#emailInput").value = "";
    this.$("#otpInput").value = "";
    this._showPhoneSection();
    this.$("#skinTypeOther").style.display = "none";
    this.$("#skinTypeOther").value = "";

    const area = this.$("#uploadArea");
    const icon = area.querySelector(".upload-icon");
    icon.textContent = "📷";
    icon.style.display = "";
    area.querySelectorAll("p").forEach((p) => (p.style.display = ""));
    this.$("#photoPreview").style.display = "none";
    this.$("#photoPreview").src = "";
    area.classList.remove("has-photo");
    area.style.display = "none";
    this.$(".photo-options").style.display = "";
    this._stopCamera();
    this.$("#photoInput").value = "";

    this.$$(".pill").forEach((p) => p.classList.remove("selected"));
    this._goToStep(1);
  }

  // ── HTML ─────────────────────────────────────────────
  _getHTML() {
    return `
    <div class="app">

      <!-- Header -->
      <div class="header">
        <h1>יועצת הטיפוח האישית שלך ✨</h1>
        <p><strong>מילה מלילוש 🌿</strong><br>המערכת שלפניך היא פרי עמל של חודשים ארוכים, במהלכם הזנתי עשר שנות ניסיון נטורופתי לתוך מוח טכנולוגי מתקדם מבוסס AI. היא מכירה את כללי ההתאמה האישית שלנו, את המדע שעומד מאחורי כל מוצר, ואת ההיצע העשיר של מוצרי החנות שלנו. היא נבדקה על מאות מקרים אמיתיים מהקליניקה — והתוצאות שלה לא פחות ממדהימות.<br>אחרי שתמלאי את הפרטים, צוות נטורופתי יעבור על ההמלצה לפני שהיא יוצאת — ואם נדרש שינוי, ניצור איתך קשר ונוודא שהחבילה מתאימה לך ב-100%.<br><em>בהצלחה, לילוש והצוות</em></p>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="step-label" id="stepLabel">שלב 1 מתוך 5</div>

      <!-- Steps -->
      <form id="skincareForm">

        <!-- Step 1 -->
        <div class="step active" id="step1">
          <h2>נתחיל עם הבסיס</h2>
          <div class="field">
            <label for="age">גיל *</label>
            <input type="number" id="age" min="10" max="100" placeholder="לדוגמה: 28" inputmode="numeric" />
            <span class="field-error" id="ageError"></span>
          </div>
          <div class="field">
            <label>מין</label>
            <div class="pills" id="genderPills">
              <button type="button" class="pill" data-value="female">אישה</button>
              <button type="button" class="pill" data-value="male">גבר</button>
            </div>
          </div>
          <div class="field">
            <label>סוג עור *</label>
            <div class="pills" id="skinTypePills">
              <button type="button" class="pill" data-value="oily">שמן</button>
              <button type="button" class="pill" data-value="dry">יבש</button>
              <button type="button" class="pill" data-value="combination">מעורב</button>
              <button type="button" class="pill" data-value="normal">רגיל</button>
              <button type="button" class="pill" data-value="sensitive">רגיש</button>
              <button type="button" class="pill" data-value="other">אחר</button>
            </div>
            <input type="text" id="skinTypeOther" placeholder="תארי את סוג העור שלך..." style="display:none; margin-top:10px;" />
            <span class="field-error" id="skinTypeError"></span>
          </div>
          <button type="button" class="btn-next" data-action="next" data-from="1">המשך ←</button>
        </div>

        <!-- Step 2 -->
        <div class="step" id="step2">
          <h2>מה מאפיין את העור שלך?</h2>
          <p class="hint">ניתן לבחור מספר תשובות</p>
          <span class="field-error" id="concernsError"></span>
          <div class="pills multi" id="concernsPills">
            <button type="button" class="pill" data-value="acne" data-label="אקנה">אקנה</button>
            <button type="button" class="pill" data-value="blackheads" data-label="ראשים שחורים">ראשים שחורים</button>
            <button type="button" class="pill" data-value="hormonal acne" data-label="אקנה הורמונלי">אקנה הורמונלי</button>
            <button type="button" class="pill" data-value="oily skin" data-label="עור שמן">עור שמן</button>
            <button type="button" class="pill" data-value="post-acne marks" data-label="סימני אקנה">סימני אקנה</button>
            <button type="button" class="pill" data-value="dryness" data-label="יובש">יובש</button>
            <button type="button" class="pill" data-value="sensitivity" data-label="רגישות">רגישות</button>
            <button type="button" class="pill" data-value="fine lines" data-label="קמטוטים">קמטוטים</button>
            <button type="button" class="pill" data-value="wrinkles" data-label="קמטים">קמטים</button>
            <button type="button" class="pill" data-value="skin sagging" data-label="רפיון">רפיון</button>
            <button type="button" class="pill" data-value="pigmentation" data-label="פיגמנטציה">פיגמנטציה</button>
            <button type="button" class="pill" data-value="sun damage" data-label="נזקי שמש">נזקי שמש</button>
            <button type="button" class="pill" data-value="redness" data-label="אדמומיות">אדמומיות</button>
            <button type="button" class="pill" data-value="large pores" data-label="נקבוביות מורחבות">נקבוביות מורחבות</button>
            <button type="button" class="pill" data-value="uneven skin tone" data-label="גוון עור לא אחיד">גוון עור לא אחיד</button>
            <button type="button" class="pill" data-value="uneven texture" data-label="מרקם לא חלק">מרקם לא חלק</button>
            <button type="button" class="pill" data-value="keratosis pilaris" data-label="קרטוזיס פילריס (KP)">קרטוזיס פילריס (KP)</button>
            <button type="button" class="pill" data-value="dullness" data-label="עור עייף וחסר ברק">עור עייף וחסר ברק</button>
            <button type="button" class="pill" data-value="dark circles" data-label="כהויות בעיניים">כהויות בעיניים</button>
            <button type="button" class="pill" data-value="stretch marks" data-label="סימני מתיחה">סימני מתיחה</button>
            <button type="button" class="pill" data-value="dry lips" data-label="יובש שפתיים">יובש שפתיים</button>
            <button type="button" class="pill" data-value="dry hands" data-label="יובש כפות ידיים">יובש כפות ידיים</button>
            <button type="button" class="pill" data-value="seborrhea" data-label="סבוריאה">סבוריאה</button>
            <button type="button" class="pill" data-value="atopic dermatitis" data-label="אטופיק דרמטיטיס">אטופיק דרמטיטיס</button>
            <button type="button" class="pill" data-value="rosacea" data-label="רוזיציאה">רוזיציאה</button>
          </div>
          <div class="field" style="margin-top: 24px;">
            <label>הריון או הנקה?</label>
            <div class="pills" id="pregnancyPills">
              <button type="button" class="pill" data-value="pregnant">בהיריון</button>
              <button type="button" class="pill" data-value="breastfeeding">מניקה</button>
              <button type="button" class="pill" data-value="none">לא רלוונטי</button>
            </div>
          </div>
          <div class="field">
            <label for="sensitivities">רגישויות או אלרגיות ידועות?</label>
            <input type="text" id="sensitivities" placeholder="לדוגמה: בשמים, רטינול, אגוזים..." />
          </div>
          <div class="nav-row">
            <button type="button" class="btn-next" data-action="next" data-from="2">המשך ←</button>
            <button type="button" class="btn-back" data-action="back" data-to="1">→ חזור</button>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="step" id="step3">
          <h2>איזה מרקם קרם את אוהבת?</h2>
          <p class="hint">זה עוזר לנו להמליץ על מוצרים שתרצי להשתמש בהם</p>
          <div class="pills" id="texturePills">
            <button type="button" class="pill pill-large" data-value="light">
              קליל 🌊<br/><span class="pill-sub">נספג מהר, לא משאיר תחושת שומן</span>
            </button>
            <button type="button" class="pill pill-large" data-value="rich">
              עשיר 🧴<br/><span class="pill-sub">מזין ועוטף, אידיאלי לעור יבש</span>
            </button>
            <button type="button" class="pill pill-large" data-value="no preference">
              תחליטו בשבילי 🤷‍♀️<br/><span class="pill-sub">נבחר לפי סוג העור שלך</span>
            </button>
          </div>
          <div class="nav-row">
            <button type="button" class="btn-next" data-action="next" data-from="3">המשך ←</button>
            <button type="button" class="btn-back" data-action="back" data-to="2">→ חזור</button>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="step" id="step4">
          <h2>העלי תמונה של הפנים שלך</h2>
          <p class="hint">אופציונלי — אבל ממליצים! אור טבעי, ללא איפור — כך נוכל לראות את העור שלך בצורה הטובה ביותר.</p>
          <div class="photo-options">
            <button type="button" class="btn-photo-option" id="btnTakePhoto">📸 צלמי עכשיו</button>
            <button type="button" class="btn-photo-option" id="btnUploadPhoto">🖼️ העלי מהגלריה</button>
          </div>
          <div class="camera-viewfinder" id="cameraViewfinder" style="display:none;">
            <video id="cameraVideo" autoplay playsinline muted></video>
            <div class="camera-controls">
              <button type="button" class="btn-camera-snap" id="btnSnap">📸</button>
              <button type="button" class="btn-camera-cancel" id="btnCancelCamera">ביטול</button>
            </div>
          </div>
          <canvas id="cameraCanvas" style="display:none;"></canvas>
          <div class="upload-area" id="uploadArea" style="display:none;">
            <div class="upload-icon">📷</div>
            <p>לחצי להעלאה או גררי לכאן</p>
            <p class="upload-sub">JPEG, PNG או WebP — עד 25MB</p>
            <img id="photoPreview" src="" alt="" style="display:none;" />
          </div>
          <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" style="display:none;" />
          <div class="privacy-note">🔒 התמונה נשלחת בצורה מאובטחת לניתוח בלבד ואינה נשמרת בשרתינו.</div>
          <div class="nav-row">
            <button type="button" class="btn-next" data-action="next" data-from="4">המשך ←</button>
            <button type="button" class="btn-back" data-action="back" data-to="3">→ חזור</button>
          </div>
        </div>

        <!-- Step 5 -->
        <div class="step" id="step5">
          <h2>כמעט סיימנו ✨</h2>
          <p class="hint">נשלח אליך קוד אימות למייל כדי להמשיך</p>
          <div id="phoneSection">
            <div class="field">
              <label for="customerName">שם מלא *</label>
              <input type="text" id="customerName" placeholder="שם פרטי ושם משפחה" autocomplete="name" />
              <span class="field-error" id="nameError"></span>
            </div>
            <div class="field">
              <label for="emailInput">כתובת מייל *</label>
              <input type="email" id="emailInput" placeholder="name@example.com" inputmode="email" autocomplete="email" />
              <span class="field-error" id="phoneError"></span>
            </div>
            <div class="field">
              <label for="phoneInput">מספר טלפון (לא חובה)</label>
              <input type="tel" id="phoneInput" placeholder="050-1234567" inputmode="tel" autocomplete="tel" />
            </div>
            <button type="button" class="btn-next" id="sendOtpBtn">שלחי קוד אימות ←</button>
          </div>
          <div id="otpSection" style="display:none;">
            <p class="hint" id="otpSentNote"></p>
            <div class="field">
              <label for="otpInput">קוד אימות (6 ספרות)</label>
              <input type="text" id="otpInput" placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />
              <span class="field-error" id="otpError"></span>
            </div>
            <button type="button" class="btn-submit" id="verifyOtpBtn">✨ קבלי המלצות אישיות</button>
            <button type="button" class="btn-back" id="btnResendOtp" style="margin-top:10px; width:100%;">→ שלחי קוד מחדש / שני מייל</button>
          </div>
          <div class="nav-row" style="margin-top:16px;">
            <button type="button" class="btn-back" data-action="back" data-to="4">→ חזור</button>
          </div>
        </div>

      </form>

      <!-- Loading -->
      <div class="loading" id="loading" style="display:none;">
        <div class="loading-icon">🌿</div>
        <h2 class="loading-title" id="loadingStageTitle">סורקת את פרופיל העור שלך...</h2>
        <p class="loading-desc" id="loadingStageDesc">בוחנת את המאפיינים הייחודיים שדיווחת עליהם</p>
        <div class="loading-bar-wrap">
          <div class="loading-bar-fill" id="loadingBarFill"></div>
        </div>
        <p class="loading-stage-label" id="loadingStageLabel">שלב 1 מתוך 7</p>
        <div class="loading-email-note" id="loadingEmailNote" style="opacity:0; transition: opacity 0.8s ease;">
          📬 תקבלי את כל הממצאים גם במייל — אפשר לסגור את הדף ולחזור אליהם בכל עת
        </div>
      </div>

      <!-- Results -->
      <div class="results" id="results" style="display:none;">
        <div class="results-header"><h2>הדו"ח האישי שלך 🌿</h2></div>
        <div class="analysis-card" id="analysisCard"></div>
        <h3 class="section-title">המוצרים המומלצים עבורך</h3>
        <div class="products-grid" id="productsGrid"></div>
        <p class="carousel-hint" id="carouselHint"></p>
        <button class="btn-add-all-cart" id="addAllToCartBtn">🛒 הוסיפי את כל הסט לסל</button>
        <div class="routine-card" id="routineCard"></div>
        <button class="btn-restart" id="btnRestart">התחל/י מחדש</button>
      </div>

      <!-- Error -->
      <div class="error-box" id="errorBox" style="display:none;">
        <p id="errorMsg"></p>
        <button class="btn-back" id="btnDismissError">נסה/י שוב</button>
      </div>

    </div>
    `;
  }

  // ── CSS ──────────────────────────────────────────────
  _getStyles() {
    return `
      :host {
        display: block;
        font-family: 'Arial', 'Helvetica Neue', sans-serif;
        color: #2d2d2d;
        direction: rtl;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .analysis-card, .routine-card, .product-reason, .product-how {
        direction: rtl;
        text-align: right;
      }

      .app {
        max-width: 640px;
        margin: 0 auto;
        padding: 32px 20px 60px;
      }

      .header { text-align: center; margin-bottom: 32px; }
      .header h1 { font-size: 1.8rem; color: #4a3728; margin-bottom: 8px; }
      .header p { color: #7a6a5e; font-size: 0.95rem; line-height: 1.5; }

      .progress-bar { height: 4px; background: #e8ddd8; border-radius: 2px; margin-bottom: 6px; }
      .progress-fill {
        height: 100%; background: linear-gradient(270deg, #c9836a, #a0614d);
        border-radius: 2px; transition: width 0.4s ease; width: 20%;
        margin-right: auto; margin-left: 0; float: right;
      }
      .step-label { text-align: right; font-size: 0.8rem; color: #9a8880; margin-bottom: 28px; }

      .step { display: none; }
      .step.active { display: block; animation: fadeIn 0.3s ease; }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .step h2 { font-size: 1.4rem; color: #4a3728; margin-bottom: 6px; }
      .hint { font-size: 0.88rem; color: #9a8880; margin-bottom: 22px; }

      .field { margin-bottom: 22px; }
      .field label { display: block; font-size: 0.9rem; color: #6a5a50; margin-bottom: 8px; font-weight: 600; }
      .field input, .field textarea {
        width: 100%; padding: 12px 14px; border: 1.5px solid #ddd5cf; border-radius: 10px;
        font-size: 0.95rem; background: #fff; color: #2d2d2d; outline: none;
        transition: border-color 0.2s; font-family: inherit;
      }
      .field input:focus, .field textarea:focus { border-color: #c9836a; }

      .pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
      .pill {
        padding: 8px 16px; border: 1.5px solid #ddd5cf; border-radius: 50px;
        background: #fff; color: #6a5a50; font-size: 0.88rem; cursor: pointer;
        transition: all 0.2s; font-family: inherit;
      }
      .pill:hover { border-color: #c9836a; color: #c9836a; }
      .pill.selected { background: #c9836a; border-color: #c9836a; color: #fff; }

      .pill.pill-large {
        flex: 1; min-width: 140px; padding: 18px 20px; text-align: center;
        font-size: 1.1rem; line-height: 1.6;
      }
      .pill-sub { display: block; font-size: 0.78rem; font-weight: normal; opacity: 0.8; margin-top: 4px; }

      .photo-options { display: flex; gap: 12px; margin-bottom: 16px; }
      .btn-photo-option {
        flex: 1; padding: 20px 16px; border: 2px solid #ddd5cf; border-radius: 14px;
        background: #fff; cursor: pointer; font-size: 1rem; color: #4a3728;
        font-weight: 600; transition: border-color 0.2s, background 0.2s; text-align: center;
      }
      .btn-photo-option:hover { border-color: #c9836a; background: #fef6f3; }

      .camera-viewfinder { border-radius: 14px; overflow: hidden; position: relative; background: #000; margin-bottom: 16px; }
      .camera-viewfinder video { width: 100%; display: block; border-radius: 14px; transform: scaleX(-1); }
      .camera-controls {
        display: flex; justify-content: center; align-items: center; gap: 16px; padding: 12px;
        background: rgba(0,0,0,0.4); position: absolute; bottom: 0; left: 0; right: 0;
      }
      .btn-camera-snap {
        width: 56px; height: 56px; border-radius: 50%; border: 3px solid #fff;
        background: #c9836a; font-size: 1.5rem; cursor: pointer; transition: transform 0.15s;
      }
      .btn-camera-snap:active { transform: scale(0.9); }
      .btn-camera-cancel {
        background: none; border: 1px solid rgba(255,255,255,0.6); color: #fff;
        padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
      }

      .upload-area {
        border: 2px dashed #ddd5cf; border-radius: 14px; padding: 40px 20px;
        text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s;
        background: #fff; margin-bottom: 14px; min-height: 200px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      }
      .upload-area:hover { border-color: #c9836a; background: #fef6f3; }
      .upload-area.has-photo { border-style: solid; border-color: #c9836a; padding: 16px; }
      .upload-icon { font-size: 2.5rem; }
      .upload-area p { color: #7a6a5e; font-size: 0.92rem; }
      .upload-sub { color: #aaa !important; font-size: 0.8rem !important; }
      #photoPreview { max-width: 100%; max-height: 280px; border-radius: 10px; object-fit: cover; }
      .privacy-note { font-size: 0.78rem; color: #aaa; text-align: center; margin-bottom: 24px; }

      .btn-next, .btn-submit {
        width: 100%; padding: 14px; background: linear-gradient(135deg, #c9836a, #a0614d);
        color: #fff; border: none; border-radius: 12px; font-size: 1rem;
        font-family: inherit; cursor: pointer; transition: opacity 0.2s; margin-top: 8px;
      }
      .btn-next:hover, .btn-submit:hover { opacity: 0.88; }

      .btn-back {
        padding: 12px 20px; background: transparent; color: #9a8880;
        border: 1.5px solid #ddd5cf; border-radius: 12px; font-size: 0.9rem;
        font-family: inherit; cursor: pointer; transition: border-color 0.2s;
      }
      .btn-back:hover { border-color: #c9836a; color: #c9836a; }

      .nav-row { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
      .nav-row .btn-next, .nav-row .btn-submit { flex: 1; margin-top: 0; }

      .loading { text-align: center; padding: 60px 20px; animation: fadeIn 0.4s ease; }
      .loading h2 { color: #4a3728; margin-bottom: 10px; }
      .loading p { color: #9a8880; font-size: 0.92rem; line-height: 1.6; }
      .loading-icon { font-size: 2.8rem; margin-bottom: 20px; display: block; animation: pulse 2.4s ease-in-out infinite; }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.12); opacity: 0.75; }
      }
      .loading-title { color: #4a3728; font-size: 1.25rem; margin-bottom: 8px; min-height: 1.8em; transition: opacity 0.4s ease; }
      .loading-desc { color: #9a8880; font-size: 0.88rem; margin-bottom: 28px; min-height: 1.4em; transition: opacity 0.4s ease; }
      .loading-bar-wrap { width: 100%; max-width: 320px; height: 6px; background: #f0e6e0; border-radius: 3px; margin: 0 auto 10px; overflow: hidden; }
      .loading-bar-fill { height: 100%; width: 0%; background: linear-gradient(270deg, #c9836a, #a0614d); border-radius: 3px; transition: width 0.8s ease; }
      .loading-stage-label { color: #c9836a; font-size: 0.78rem; margin-bottom: 24px; }
      .loading-email-note {
        background: #fff8f5; border: 1px solid #f0e0d8; border-radius: 10px;
        padding: 12px 16px; font-size: 0.84rem; color: #7a6a5e; max-width: 320px;
        margin: 0 auto; line-height: 1.5;
      }

      .results { animation: fadeIn 0.4s ease; }
      .results-header { text-align: center; margin-bottom: 28px; }
      .results-header h2 { font-size: 1.5rem; color: #4a3728; }

      .analysis-card {
        background: linear-gradient(135deg, #fff8f5, #fef3ee); border: 1.5px solid #f0e0d8;
        border-radius: 16px; padding: 24px; margin-bottom: 32px;
      }
      .analysis-card h3 { color: #4a3728; margin-bottom: 14px; font-size: 1.1rem; }
      .analysis-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
      .analysis-tag {
        padding: 5px 12px; background: #c9836a22; border: 1px solid #c9836a55;
        color: #a0614d; border-radius: 50px; font-size: 0.82rem;
      }
      .analysis-skin-type { font-size: 0.9rem; font-weight: 600; color: #4a3728; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid #f0e0d8; }
      .analysis-section { margin-top: 14px; }
      .analysis-section-title { font-size: 0.82rem; font-weight: 700; color: #c9836a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
      .analysis-text { color: #6a5a50; font-size: 0.92rem; line-height: 1.7; }

      .section-title { color: #4a3728; font-size: 1.1rem; margin-bottom: 16px; }
      .products-grid { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
      .product-card { background: #fff; border: 1.5px solid #ede5e0; border-radius: 16px; overflow: hidden; display: flex; gap: 0; transition: box-shadow 0.2s; }
      .product-card:hover { box-shadow: 0 4px 20px #c9836a22; }
      .product-badge { writing-mode: vertical-lr; transform: rotate(180deg); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 12px 6px; color: #fff; min-width: 28px; text-align: center; }
      .badge-must { background: #c9836a; }
      .badge-recommended { background: #a0b89a; }
      .badge-bonus { background: #b4a8d0; }
      .product-image { width: 90px; min-width: 90px; object-fit: cover; background: #f5eeea; }
      .product-image-placeholder { width: 90px; min-width: 90px; background: linear-gradient(135deg, #f5eeea, #ede5e0); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
      .product-body { padding: 16px; flex: 1; }
      .product-name { font-size: 1rem; color: #4a3728; margin-bottom: 4px; }
      .product-price { font-size: 0.85rem; color: #9a8880; margin-bottom: 10px; }
      .product-reason { font-size: 0.88rem; color: #6a5a50; line-height: 1.55; margin-bottom: 8px; }
      .product-how { font-size: 0.82rem; color: #a09088; font-style: italic; margin-bottom: 12px; }
      .product-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .product-link { display: inline-block; padding: 7px 14px; background: #4a3728; color: #fff; border-radius: 8px; font-size: 0.82rem; text-decoration: none; transition: background 0.2s; white-space: nowrap; }
      .product-link:hover { background: #c9836a; }
      .btn-add-cart { padding: 7px 14px; background: #c9836a; color: #fff; border: none; border-radius: 8px; font-size: 0.82rem; font-family: inherit; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
      .btn-add-cart:hover { background: #a0614d; }
      .btn-add-cart:disabled { background: #a0b89a; opacity: 0.85; cursor: default; }

      .btn-add-all-cart {
        display: none; width: 100%; padding: 15px; background: linear-gradient(135deg, #c9836a, #a0614d);
        color: #fff; border: none; border-radius: 12px; font-size: 1rem; font-family: inherit;
        cursor: pointer; transition: opacity 0.2s; margin-bottom: 20px; font-weight: 600;
      }
      .btn-add-all-cart:hover { opacity: 0.88; }
      .btn-add-all-cart:disabled { background: #a0b89a; cursor: default; }

      .routine-card { background: #f5f2ff; border: 1.5px solid #ddd5f5; border-radius: 16px; padding: 24px; margin-bottom: 28px; }
      .routine-card h3 { color: #4a3728; margin-bottom: 10px; }
      .routine-card p { color: #6a5a50; font-size: 0.92rem; line-height: 1.65; }

      .btn-restart { display: block; width: 100%; padding: 13px; background: transparent; border: 1.5px solid #ddd5cf; border-radius: 12px; color: #9a8880; font-size: 0.9rem; font-family: inherit; cursor: pointer; transition: all 0.2s; }
      .btn-restart:hover { border-color: #c9836a; color: #c9836a; }

      .field-error { display: block; font-size: 0.82rem; color: #c0392b; margin-top: 6px; min-height: 1em; }

      .error-box { background: #fff5f5; border: 1.5px solid #f5c2c2; border-radius: 14px; padding: 28px; text-align: center; animation: fadeIn 0.3s ease; }
      .error-box p { color: #c0392b; margin-bottom: 16px; font-size: 0.95rem; }

      .carousel-hint { display: none; text-align: center; font-size: 0.78rem; color: #b0a09a; margin-bottom: 20px; }

      @media (max-width: 640px) {
        .app { padding: 20px 14px 48px; }
        .header { margin-bottom: 20px; }
        .header h1 { font-size: 1.4rem; }
        .header p { font-size: 0.88rem; }
        .step h2 { font-size: 1.2rem; }
        .hint { font-size: 0.82rem; margin-bottom: 16px; }
        .pill { padding: 7px 12px; font-size: 0.82rem; }
        .pill.pill-large { min-width: 120px; padding: 14px 12px; font-size: 1rem; }
        .upload-area { padding: 28px 16px; min-height: 160px; }

        .products-grid {
          flex-direction: row; overflow-x: auto; scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch; scrollbar-width: none;
          padding: 4px 14px 12px; margin: 0 -14px 8px; gap: 12px;
        }
        .products-grid::-webkit-scrollbar { display: none; }
        .product-card {
          flex-direction: column; min-width: min(82vw, 300px); max-width: min(82vw, 300px);
          flex-shrink: 0; scroll-snap-align: start; position: relative;
        }
        .product-badge {
          position: absolute; top: 10px; right: 10px; writing-mode: horizontal-tb;
          transform: none; border-radius: 20px; padding: 4px 12px; font-size: 0.72rem;
          min-width: unset; z-index: 2;
        }
        .product-image { width: 100%; height: 190px; min-width: unset; }
        .product-image-placeholder { width: 100%; height: 190px; min-width: unset; font-size: 3rem; }
        .product-body { padding: 14px; }
        .carousel-hint { display: block; }
        .loading { padding: 40px 16px; }
      }
    `;
  }
}

// Register the custom element
customElements.define("skincare-widget", SkincareWidget);
