(function(){
  'use strict';
  if (window.__LOGIN_INLINE_BOOTED__) return;
  window.__LOGIN_INLINE_BOOTED__ = true;

  let lastLoginEmail = "";
  let lastLoginPassword = "";
  let activeModalId = null;
  let verificationTimer = null;
  let resetBusy = false;
  let pendingTotpResolve = null;
  let loginBound = false;
  let modalBound = false;
  let googleBusy = false;

  const firebaseConfig = window.__FIREBASE_CONFIG__ || {
    apiKey:"AIzaSyBRVEViuKnCUZqBoD0liuA-P0DVN7mTePA",
    authDomain:"z3em-d9b11.firebaseapp.com",
    projectId:"z3em-d9b11",
    storageBucket:"z3em-d9b11.firebasestorage.app",
    messagingSenderId:"236716520945",
    appId:"1:236716520945:web:a0c336db7dc7079c190050",
    measurementId:"G-1GG6DE12K6"
  };

  let auth = null;
  let db = null;
  let firebaseReady = false;
  let googleProvider = null;

  function ensureFirebaseCompat(){
    if (firebaseReady && auth) return true;
    try {
      if (window.__SKIP_FIREBASE__ === true) return false;
    } catch (_) {}
    if (typeof firebase === 'undefined') return false;
    try {
      if ((!firebase.apps || !firebase.apps.length) && firebaseConfig) {
        firebase.initializeApp(firebaseConfig);
      } else if (firebase.apps && firebase.apps.length) {
        firebase.app();
      }
    } catch (_) {}
    try {
      auth = firebase.auth();
      db = firebase.firestore();
    } catch (_) {
      auth = null;
      db = null;
    }
    firebaseReady = !!auth;
    return firebaseReady;
  }

  function ensureFirebaseCompatAsync(){
    if (ensureFirebaseCompat()) return Promise.resolve(true);
    if (typeof window.__loadFirebaseCompat === 'function') {
      return window.__loadFirebaseCompat()
        .then(() => ensureFirebaseCompat())
        .catch(() => false);
    }
    return Promise.resolve(false);
  }

  function ensureGoogleProvider(){
    if (!ensureFirebaseCompat()) return null;
    if (!googleProvider && firebase && firebase.auth && typeof firebase.auth.GoogleAuthProvider === 'function') {
      googleProvider = new firebase.auth.GoogleAuthProvider();
      try { googleProvider.setCustomParameters({ prompt: 'select_account' }); } catch (_) {}
    }
    return googleProvider;
  }

  const DEVICE_ID_STORAGE_KEY = "session:device:id";
  function generateDeviceId(){
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
    } catch (_) {}
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const size = 24;
    let out = "";
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        const buf = new Uint8Array(size);
        window.crypto.getRandomValues(buf);
        for (let i = 0; i < size; i++) out += alphabet[buf[i] % alphabet.length];
        return out;
      }
    } catch (_) {}
    for (let i = 0; i < size; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }
  function ensureDeviceId(){
    try {
      const cached = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (cached) return cached;
    } catch (_) {}
    const id = generateDeviceId();
    try { localStorage.setItem(DEVICE_ID_STORAGE_KEY, id); } catch (_) {}
    return id;
  }
  function getDeviceId(){
    return ensureDeviceId();
  }
  function collectDeviceInfo(){
    try {
      const nav = navigator || {};
      const uaData = nav.userAgentData || {};
      const platform = String(uaData.platform || nav.platform || "").trim();
      const brand = Array.isArray(uaData.brands) ? uaData.brands.map(b => b.brand).join(", ") : "";
      const label = [platform, brand].filter(Boolean).join(" ").trim();
      return {
        label: label || "",
        userAgent: String(nav.userAgent || ""),
        platform: platform,
        language: String(nav.language || ""),
        timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })()
      };
    } catch (_) {
      return {};
    }
  }
  try { if (!window.getDeviceFingerprint) window.getDeviceFingerprint = getDeviceId; } catch (_) {}

  const saveSessionLocal = (obj = {}) => {
    const payload = { ...obj };
    if (!payload.deviceId) payload.deviceId = getDeviceId();
    try { localStorage.setItem("sessionKeyInfo", JSON.stringify(payload)); } catch (_) {}
  };
  const getSessionLocal = () => {
    try { return JSON.parse(localStorage.getItem("sessionKeyInfo") || "null"); } catch (_) { return null; }
  };
  const POST_LOGIN_STORAGE_KEY = "postLoginPayload";
  const TRANSIENT_AUTH_PREFIX = "__Z3EM_AUTH__:";
  const savePostLoginPayload = (payload = {}) => {
    const data = { ...payload, ts: Date.now() };
    if (!data.deviceId) data.deviceId = getDeviceId();
    try { localStorage.setItem(POST_LOGIN_STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
    try { window.name = TRANSIENT_AUTH_PREFIX + JSON.stringify(data); } catch (_) {}
    try { window.__POST_LOGIN_PAYLOAD__ = data; } catch (_) {}
  };
  const readPostLoginPayload = () => {
    try {
      const raw = localStorage.getItem(POST_LOGIN_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
      }
    } catch (_) {}
    try {
      if (typeof window.name === "string" && window.name.startsWith(TRANSIENT_AUTH_PREFIX)) {
        const json = window.name.slice(TRANSIENT_AUTH_PREFIX.length);
        const data = JSON.parse(json);
        return (data && typeof data === "object") ? data : null;
      }
    } catch (_) {}
    return null;
  };

  function canUseFirebaseAuth() {
    try {
      if (window.__SKIP_FIREBASE__ === true) return false;
    } catch (_) {}
    try {
      const p = location.protocol;
      if (p !== "http:" && p !== "https:" && p !== "chrome-extension:") return false;
    } catch (_) {
      return false;
    }
    return true;
  }

  function byId(id){
    return document.getElementById(id);
  }

  const NETWORK_TIMEOUT_MS = 4500;

  let requestLoaderCount = 0;
  function showRequestLoader(){
    requestLoaderCount += 1;
    if (requestLoaderCount !== 1) return;
    try { window.__LOADER_HOLD_ACTIVE__ = true; } catch (_) {}
    try {
      if (typeof showPageLoader === "function") {
        showPageLoader({ hold: true });
        return;
      }
    } catch (_) {}
    try {
      const el = byId("preloader");
      if (el) {
        el.classList.remove("hidden");
        el.style.display = "flex";
        el.style.opacity = "1";
      }
    } catch (_) {}
  }
  function hideRequestLoader(){
    if (requestLoaderCount > 0) requestLoaderCount -= 1;
    if (requestLoaderCount !== 0) return;
    try { window.__LOADER_HOLD_ACTIVE__ = false; } catch (_) {}
    try {
      if (typeof hidePageLoader === "function") {
        hidePageLoader();
        return;
      }
    } catch (_) {}
    try {
      const el = byId("preloader");
      if (el) {
        el.classList.add("hidden");
        el.style.opacity = "0";
        setTimeout(() => { try { el.style.display = "none"; } catch (_) {} }, 300);
      }
    } catch (_) {}
  }

  function getManualRouterBase() {
    try {
      const stored = localStorage.getItem("MANWAL_ROUTER_BASE");
      if (stored) {
        const candidate = stored.trim();
        const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
        let url = new URL(normalized);
        try {
          if (location.protocol === "https:" && url.protocol === "http:") {
            url = new URL(url.toString().replace(/^http:/i, "https:"));
          }
        } catch (_) {}
        return url.toString();
      }
    } catch (_) {}
    return "https://z3em-manwal.laithqarqaz1.workers.dev/";
  }

  function getSameOriginPingUrl() {
    try {
      if (location && typeof location.origin === "string" && /^https?:/i.test(location.origin)) {
        const base = location.origin.replace(/\/+$/, "");
        return `${base}/robots.txt?ping=${Date.now()}`;
      }
    } catch (_) {}
    return "";
  }

  function getManualPingUrl() {
    try {
      const base = getManualRouterBase();
      if (!base) return "";
      const url = new URL(base);
      url.searchParams.set("ping", "1");
      url.searchParams.set("_t", String(Date.now()));
      return url.toString();
    } catch (_) {}
    return "";
  }

  function getNetworkCheckUrls() {
    const urls = [];
    const manual = getManualPingUrl();
    if (manual) urls.push(manual);
    const origin = getSameOriginPingUrl();
    if (origin) urls.push(origin);
    urls.push("https://www.gstatic.com/generate_204");
    return urls;
  }

  async function pingUrlOnce(url, timeoutMs){
    const fetchOptions = { method: "GET", mode: "no-cors", cache: "no-store" };
    let controller;
    let timer;
    if (typeof AbortController !== "undefined") {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }
    try {
      await fetch(url, fetchOptions);
      return { ok: true };
    } catch (error) {
      if (error && error.name === "AbortError") {
        return { ok: false, code: "network/timeout" };
      }
      return { ok: false, code: "network/ping-blocked" };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function pingNetwork(timeoutMs = NETWORK_TIMEOUT_MS) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { ok: false, code: "network/offline" };
    }
    const urls = getNetworkCheckUrls();
    if (!urls.length) return { ok: true };
    const perTimeout = Math.max(1500, Math.floor(timeoutMs / Math.max(1, urls.length)));
    let sawTimeout = false;
    for (const url of urls) {
      const result = await pingUrlOnce(url, perTimeout);
      if (result.ok) return { ok: true };
      if (result.code === "network/timeout") sawTimeout = true;
    }
    return { ok: false, code: sawTimeout ? "network/timeout" : "network/ping-blocked" };
  }

  async function ensureNetworkHealthy(targetEl, timeoutMs) {
    showRequestLoader();
    try {
      const status = await pingNetwork(timeoutMs);
      if (status.ok) return true;
      if (targetEl) {
        targetEl.style.color = "var(--danger, #ef4444)";
        targetEl.textContent = translateFirebaseError(status.code || "network/fetch-failed");
      }
      try { console.error("network check failed", status); } catch (_) {}
      return false;
    } finally {
      hideRequestLoader();
    }
  }

  function setButtonBusy(btn, busy = false) {
    if (!btn) return;
    btn.disabled = !!busy;
    btn.classList.toggle("is-loading", !!busy);
    if (busy) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
  }

  const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

  async function withNetworkRetry(task, retries = 1) {
    let attempt = 0;
    let lastError;
    while (attempt <= retries) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (!error || error.code !== "auth/network-request-failed" || attempt === retries) {
          break;
        }
        await sleep(1100 * (attempt + 1));
      }
      attempt++;
    }
    throw lastError;
  }

  const MANUAL_ROUTER_DEFAULT = "https://z3em-manwal.laithqarqaz1.workers.dev/";

  function buildManualAuthUrl() {
    const base = getManualRouterBase();
    try {
      const url = new URL(base);
      if (!url.searchParams.has("game")) url.searchParams.set("game", "auth");
      return url.toString();
    } catch (_) {
      return MANUAL_ROUTER_DEFAULT + "?game=auth";
    }
  }

  async function callManualAuth(action = "login", payload = {}, targetErrorEl) {
    const manualUrl = buildManualAuthUrl();
    if (!manualUrl || typeof manualUrl !== "string") {
      const err = new Error("manual_url_invalid");
      err.code = "network/url-invalid";
      if (targetErrorEl) {
        targetErrorEl.style.color = "var(--danger, #ef4444)";
        targetErrorEl.textContent = "رابط الخادم غير صالح، تحقق من MANWAL_ROUTER_BASE.";
      }
      throw err;
    }
    const body = { action, ...payload };
    if (!body.deviceId) body.deviceId = getDeviceId();
    if (!body.deviceInfo) {
      const info = collectDeviceInfo();
      if (info && Object.keys(info).length) body.deviceInfo = info;
    }
    showRequestLoader();
    try {
      const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
      const res = await fetch(manualUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined
      });
      if (timer) clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        const err = new Error(data?.error || "تعذر إتمام الطلب.");
        err.code = data?.code || `auth/http-${res.status}`;
        if (targetErrorEl) {
          targetErrorEl.style.color = "var(--danger, #ef4444)";
          targetErrorEl.textContent = translateFirebaseError(err.code);
        }
        throw err;
      }
      return data;
    } catch (err) {
      if (!err.code) err.code = "network/fetch-failed";
      if (targetErrorEl) {
        targetErrorEl.style.color = "var(--danger, #ef4444)";
        targetErrorEl.textContent = "تعذر الاتصال بالخادم، تحقق من عنوان المانوال أو الشبكة.";
        if (manualUrl) {
          targetErrorEl.textContent += ` (${manualUrl})`;
        }
      }
      try {
        const fallbackEl = byId("loginError") || byId("registerError");
        if (fallbackEl && fallbackEl !== targetErrorEl) {
          fallbackEl.style.color = "var(--danger, #ef4444)";
          fallbackEl.textContent = "تعذر الاتصال بالخادم، تحقق من عنوان المانوال أو الشبكة.";
          if (manualUrl) {
            fallbackEl.textContent += ` (${manualUrl})`;
          }
        }
      } catch (_) {}
      throw err;
    } finally {
      hideRequestLoader();
    }
  }

  function hideTotpRow() {
    const totpRow = byId('totpRow');
    const totpInput = byId('totpInput');
    if (totpRow) totpRow.style.display = "none";
    if (totpInput) totpInput.value = "";
  }

  function normalizeTotpCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 6);
  }

  function resolveTotpRequest(code) {
    if (!pendingTotpResolve) return;
    const resolver = pendingTotpResolve;
    pendingTotpResolve = null;
    resolver(code);
  }

  function openTotpModal(opts){
    const options = opts || {};
    const totpLoginModal = byId("totpLoginModal");
    if (!totpLoginModal) return;
    const totpLoginSubtitle = byId("totpLoginSubtitle");
    const totpLoginError = byId("totpLoginError");
    const totpLoginInput = byId("totpLoginInput");
    if (totpLoginSubtitle) {
      totpLoginSubtitle.textContent = options.subtitle || "من فضلك افتح تطبيق Google Authenticator وأدخل الكود المكون من 6 أرقام.";
    }
    if (totpLoginError) totpLoginError.textContent = options.error || "";
    if (totpLoginInput) totpLoginInput.value = "";
    showModal("totpLoginModal");
    setTimeout(() => {
      try { totpLoginInput && totpLoginInput.focus(); } catch (_) {}
    }, 60);
  }

  function requestTotpCodeWithModal(opts){
    if (!byId("totpLoginModal") || !byId("totpLoginInput")) return Promise.resolve("");
    if (pendingTotpResolve) resolveTotpRequest("");
    return new Promise((resolve) => {
      pendingTotpResolve = resolve;
      openTotpModal(opts || {});
    });
  }

  function confirmTotpModal() {
    const totpLoginInput = byId("totpLoginInput");
    const totpLoginError = byId("totpLoginError");
    if (!totpLoginInput) return;
    const code = normalizeTotpCode(totpLoginInput.value);
    if (totpLoginInput.value !== code) totpLoginInput.value = code;
    if (code.length !== 6) {
      if (totpLoginError) totpLoginError.textContent = "يرجى إدخال رمز تحقق من 6 أرقام.";
      return;
    }
    resolveTotpRequest(code);
    closeModal("totpLoginModal");
  }

  function updateFormTitle(form){
    const formTitleEl = byId("formTitle");
    if (!formTitleEl) return;
    if (form === "register") formTitleEl.textContent = "إنشاء حساب";
    else if (form === "reset") formTitleEl.textContent = "استعادة كلمة المرور";
    else formTitleEl.textContent = "تسجيل الدخول";
  }

  function switchForm(form){
    const loginForm = byId("loginForm");
    const resetForm = byId("resetForm");
    const registerForm = byId("registerForm");
    const resetEmailInput = byId("resetEmail");
    const resetMessageEl = byId("resetMessage");
    const resetStatusEl = byId("resetStatus");
    const emailInput = byId('emailInput');
    if (!loginForm || !resetForm || !registerForm) return;
    loginForm.classList.add("hidden");
    resetForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    hideTotpRow();
    if (form === "login") loginForm.classList.remove("hidden");
    else if (form === "reset") {
      resetForm.classList.remove("hidden");
      const fallbackEmail = (emailInput?.value || '').trim() || (lastLoginEmail || '').trim();
      if (resetEmailInput && fallbackEmail) resetEmailInput.value = fallbackEmail;
      if (resetStatusEl) { resetStatusEl.textContent = "جاهز للإرسال"; resetStatusEl.className = "pill muted"; }
      if (resetMessageEl) { resetMessageEl.textContent = ""; }
    }
    else if (form === "register") registerForm.classList.remove("hidden");
    updateFormTitle(form);
  }

  function updateBodyModalState() {
    try {
      const hasOpenModal = document.querySelector('.modal:not(.hidden)');
      const bodyEl = document.body || document.documentElement;
      if (!bodyEl) return;
      if (hasOpenModal) bodyEl.classList.add('modal-open');
      else bodyEl.classList.remove('modal-open');
    } catch (_) {}
  }

  function showModal(modalId = "emailVerificationModal") {
    const modal = byId(modalId);
    if (!modal) return;
    modal.classList.remove("hidden");
    activeModalId = modalId;
    updateBodyModalState();
  }

  function closeModal(modalId) {
    const targetId = modalId || activeModalId;
    if (!targetId) return;
    if (targetId === "totpLoginModal") {
      resolveTotpRequest("");
    }
    const modal = byId(targetId);
    if (!modal) return;
    modal.classList.add("hidden");
    if (activeModalId === targetId) activeModalId = null;
    updateBodyModalState();
  }

  const firebaseErrorMessages = {
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
    "auth/missing-email": "يرجى إدخال البريد الإلكتروني.",
    "auth/missing-credentials": "يرجى إدخال البريد وكلمة المرور.",
    "auth/missing-fields": "يرجى إدخال جميع الحقول المطلوبة.",
    "auth/user-not-found": "لا يوجد حساب مرتبط بهذا البريد.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/invalid-credential": "بيانات تسجيل الدخول غير صحيحة، تأكد من البريد وكلمة المرور.",
    "auth/invalid-login-credentials": "بيانات تسجيل الدخول غير صحيحة، تأكد من البريد وكلمة المرور.",
    "auth/invalid-credentials": "بيانات تسجيل الدخول غير صحيحة، تأكد من البريد وكلمة المرور.",
    "auth/invalid_credentials": "بيانات تسجيل الدخول غير صحيحة، تأكد من البريد وكلمة المرور.",
    "auth/too-many-requests": "تم حظر المحاولات مؤقتًا بسبب العديد من الطلبات. حاول لاحقًا.",
    "auth/email-already-in-use": "هذا البريد مستخدم بالفعل.",
    "auth/weak-password": "كلمة المرور ضعيفة، يرجى استخدام كلمة أقوى.",
    "auth/network-request-failed": "فشل الاتصال بالخادم، تحقق من الشبكة.",
    "auth/operation-not-allowed": "تم تعطيل هذا النوع من التسجيل في الوقت الحالي.",
    "auth/requires-recent-login": "يرجى تسجيل الدخول من جديد لإكمال العملية.",
    "auth/banned": "?? تم حظر حسابك.",
    "totp-required": "يرجى إدخال رمز المصادقة الثنائية.",
    "totp-code-invalid": "رمز التحقق غير صحيح.",
    "totp-not-configured": "إعدادات التحقق بخطوتين غير مكتملة.",
    "network/url-invalid": "رابط خادم المانوال غير صالح.",
    "network/fetch-failed": "تعذر الاتصال بالخادم، تحقق من عنوان المانوال أو الشبكة.",
    "network/blocked": "يبدو أن المتصفح يمنع الاتصال (Mixed Content/VPN). استخدم HTTPS لخادم المانوال.",
    "network/offline": "لا يوجد اتصال بالإنترنت حاليًا. فعّل البيانات أو اتصل بشبكة Wi-Fi أخرى ثم أعد المحاولة.",
    "network/timeout": "الاتصال بطيء أو غير مستقر، تعذر الوصول إلى الخادم. أعد المحاولة بعد لحظات أو غيّر الشبكة.",
    "network/ping-blocked": "يبدو أن جدار الحماية أو خدمة VPN تمنع الاتصال بخوادم زعيم. عطّل الحجب مؤقتًا ثم أعد المحاولة."
  };

  function translateFirebaseError(code) {
    const normalized = typeof code === "string" ? code : "";
    const key = normalized.replace(/_/g, "-");
    if (!normalized) return "حدث خطأ غير متوقع، حاول مرة أخرى.";
    if (firebaseErrorMessages[key]) return firebaseErrorMessages[key];
    if (key.includes("too-many-requests")) return firebaseErrorMessages["auth/too-many-requests"];
    if (key.startsWith("auth/http-") || key.startsWith("network/")) return firebaseErrorMessages["network/fetch-failed"];
    if (key.startsWith("auth/")) {
      return "تعذر إتمام الطلب (" + key.replace("auth/", "").replace(/-/g, " ") + ").";
    }
    if (key.startsWith("network/")) return firebaseErrorMessages["network/timeout"];
    return "حدث خطأ غير متوقع، حاول مرة أخرى.";
  }

  function setCriterionState(element, satisfied) {
    if (!element) return;
    element.classList.toggle("criterion-met", satisfied);
    const icon = element.querySelector(".icon");
    if (icon) {
      icon.classList.toggle("fa-check", satisfied);
      icon.classList.toggle("fa-xmark", !satisfied);
      icon.style.color = satisfied ? "var(--success, #22c55e)" : "var(--danger, #ef4444)";
    }
    element.style.color = satisfied ? "#16a34a" : "";
  }

  function validatePassword() {
    const registerPasswordInput = byId("registerPassword");
    if (!registerPasswordInput) return;
    const passwordCriteriaEls = {
      minLength: byId("minLength"),
      hasNumber: byId("hasNumber"),
      hasUpper: byId("hasUpper"),
      hasLower: byId("hasLower"),
      hasSymbol: byId("hasSymbol")
    };
    const strengthIndicator = byId("strengthIndicator");
    const strengthText = byId("strengthText");
    const value = registerPasswordInput.value || "";
    const hasMin = value.length >= 6;
    const hasNumber = /\d/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    const optionalCount = [hasNumber, hasUpper, hasLower, hasSymbol].filter(Boolean).length;

    setCriterionState(passwordCriteriaEls.minLength, hasMin);
    setCriterionState(passwordCriteriaEls.hasNumber, hasNumber);
    setCriterionState(passwordCriteriaEls.hasUpper, hasUpper);
    setCriterionState(passwordCriteriaEls.hasLower, hasLower);
    setCriterionState(passwordCriteriaEls.hasSymbol, hasSymbol);

    if (!strengthIndicator || !strengthText) return;
    if (!value) {
      strengthIndicator.style.width = "0%";
      strengthIndicator.style.backgroundColor = "#e5e7eb";
      strengthText.textContent = "";
      return;
    }

    const score = (hasMin ? 1 : 0) + optionalCount;
    const percent = Math.min(100, Math.max(20, Math.round((score / 5) * 100)));

    let barColor = "#ef4444";
    let label = "ضعيفة";
    if (percent >= 80) { barColor = "#22c55e"; label = "قوية"; }
    else if (percent >= 60) { barColor = "#f59e0b"; label = "متوسطة"; }
    else if (percent >= 40) { barColor = "#f97316"; label = "ضعيفة"; }

    strengthIndicator.style.width = percent + "%";
    strengthIndicator.style.backgroundColor = barColor;

    if (!hasMin) {
      strengthText.style.color = "var(--danger, #ef4444)";
      strengthText.textContent = "كلمة المرور يجب ألا تقل عن 6 أحرف.";
    } else if (optionalCount < 3) {
      const remaining = 3 - optionalCount;
      strengthText.style.color = "#f59e0b";
      strengthText.textContent = `أضف ${remaining} متطلبات اختيارية (أرقام/حروف/رموز) لزيادة الأمان.`;
    } else {
      strengthText.style.color = barColor;
      strengthText.textContent = `قوة كلمة المرور: ${label}`;
    }
  }

  async function sendResetLink() {
    const resetEmailInput = byId("resetEmail");
    const resetMessageEl = byId("resetMessage");
    const resetStatusEl = byId("resetStatus");
    const resetSubmitBtn = byId("resetSubmitBtn");
    if (!resetEmailInput || !resetMessageEl) return;
    const email = resetEmailInput.value.trim();
    resetMessageEl.style.color = "var(--danger, #ef4444)";
    resetMessageEl.textContent = "";

    if (!email) {
      resetMessageEl.textContent = "يرجى إدخال بريدك الإلكتروني.";
      if (resetStatusEl) { resetStatusEl.textContent = "أدخل بريدًا صحيحًا"; resetStatusEl.className = "pill"; }
      return;
    }
    if (resetBusy) return;
    resetBusy = true;
    showRequestLoader();

    try {
      setButtonBusy(resetSubmitBtn, true);
      if (resetStatusEl) { resetStatusEl.textContent = "جارٍ الإرسال..."; resetStatusEl.className = "pill muted"; }
      const networkReady = await ensureNetworkHealthy(resetMessageEl);
      if (!networkReady) return;
      await ensureFirebaseCompatAsync();
      if (!auth || typeof auth.sendPasswordResetEmail !== "function") {
        throw new Error("auth_unavailable");
      }
      await withNetworkRetry(() => auth.sendPasswordResetEmail(email), 1);
      resetMessageEl.style.color = "var(--success, #22c55e)";
      resetMessageEl.textContent = "تم إرسال رابط الاستعادة إلى بريدك الإلكتروني.";
      if (resetStatusEl) { resetStatusEl.textContent = "تم الإرسال"; resetStatusEl.className = "pill success"; }
      showModal("resetSuccessModal");
    } catch (error) {
      resetMessageEl.textContent = translateFirebaseError(error?.code || error?.message);
      if (resetStatusEl) { resetStatusEl.textContent = "تعذر الإرسال"; resetStatusEl.className = "pill"; }
    } finally {
      resetBusy = false;
      setButtonBusy(resetSubmitBtn, false);
      hideRequestLoader();
    }
  }

  async function sendVerificationNow() {
    const verificationMessage = byId("verificationMessage");
    const resendVerificationBtn = byId("resendVerificationBtn");
    if (verificationMessage) {
      verificationMessage.style.color = "var(--danger, #ef4444)";
      verificationMessage.textContent = "";
    }

    await ensureFirebaseCompatAsync();
    const user = auth ? auth.currentUser : null;

    if (!user) {
      if (verificationMessage) {
        verificationMessage.textContent = "يرجى تسجيل الدخول أولًا لإعادة إرسال رابط التأكيد.";
      }
      return;
    }

    try {
      showRequestLoader();
      if (resendVerificationBtn) {
        resendVerificationBtn.disabled = true;
        resendVerificationBtn.classList.add("disabled");
      }
      const networkReady = await ensureNetworkHealthy(verificationMessage);
      if (!networkReady) return;
      if (typeof user.sendEmailVerification !== "function") throw new Error("auth_unavailable");
      await withNetworkRetry(() => user.sendEmailVerification(), 1);
      if (verificationMessage) {
        verificationMessage.style.color = "var(--success, #22c55e)";
        verificationMessage.textContent = "تم إرسال رسالة التأكيد، تحقق من بريدك الوارد أو الرسائل غير المرغوبة.";
      }
    } catch (error) {
      if (verificationMessage) {
        verificationMessage.textContent = translateFirebaseError(error?.code || error?.message);
      }
    } finally {
      hideRequestLoader();
      clearTimeout(verificationTimer);
      verificationTimer = setTimeout(() => {
        if (resendVerificationBtn) {
          resendVerificationBtn.disabled = false;
          resendVerificationBtn.classList.remove("disabled");
        }
        if (verificationMessage && verificationMessage.style.color === "var(--success, #22c55e)") {
          verificationMessage.style.color = "";
        }
      }, 1500);
    }
  }

  function goHome(){
    try {
      if (typeof window.navigateHome === 'function') {
        window.navigateHome();
        return;
      }
    } catch (_) {}
    try { window.location.hash = '#/'; } catch (_) { window.location.href = 'index.html'; }
  }

  async function assertNotBanned(uid, targetErrorEl) {
    try {
      await ensureFirebaseCompatAsync();
      if (!db || typeof db.collection !== "function") throw new Error("db_unavailable");
      const snap = await db.collection("users").doc(uid).get();
      const data = snap.exists ? (snap.data() || {}) : {};
      if (data.isBanned === true) {
        if (targetErrorEl) {
          targetErrorEl.style.color = "var(--danger, #ef4444)";
          const reason = (typeof data.banReason === "string" ? data.banReason.trim() : "");
          if (reason) {
            targetErrorEl.textContent = `?? تم حظر حسابك. سبب الحظر: ${reason}`;
          } else {
            targetErrorEl.textContent = "?? تم حظر حسابك.";
          }
        }
        try { if (auth) await auth.signOut(); } catch (_) {}
        try { localStorage.removeItem("sessionKeyInfo"); } catch (_) {}
        return false;
      }
    } catch (_) {
      if (targetErrorEl) {
        targetErrorEl.style.color = "var(--danger, #ef4444)";
        targetErrorEl.textContent = "تعذر التحقق من حالة الحساب. حاول لاحقًا.";
      }
      return false;
    }
    return true;
  }

  async function performManualLogin(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    const submitLogin = byId('submitLogin');
    const emailInput = byId('emailInput');
    const passwordInput = byId('passwordInput');
    const loginError = byId('loginError');
    if (!submitLogin || !emailInput || !passwordInput || !loginError) return;
    if (submitLogin.disabled || submitLogin.getAttribute("aria-busy") === "true") return;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    loginError.textContent = "";

    if (!email || !password) {
      loginError.textContent = "يرجى إدخال البريد الإلكتروني وكلمة المرور.";
      return;
    }

    lastLoginEmail = email;
    lastLoginPassword = password;
    setButtonBusy(submitLogin, true);

    try {
      const networkReady = await ensureNetworkHealthy(loginError);
      if (!networkReady) return;

      let loginResult = null;
      let totpCode = "";
      while (true) {
        try {
          const loginPayload = { email, password, ...(totpCode ? { code: totpCode } : {}) };
          loginResult = await callManualAuth("login", loginPayload, loginError);
          break;
        } catch (err) {
          const code = err && err.code ? String(err.code) : "";
          if (code === "totp_required" || code === "totp_code_invalid") {
            loginError.textContent = "";
            const subtitle = code === "totp_code_invalid"
              ? "رمز التحقق غير صحيح. افتح تطبيق Google Authenticator وأعد المحاولة."
              : "من فضلك افتح تطبيق Google Authenticator وأدخل الكود المكون من 6 أرقام.";
            const errorText = code === "totp_code_invalid" ? "رمز التحقق غير صحيح." : "";
            const inputCode = await requestTotpCode(subtitle, errorText);
            if (!inputCode) return;
            totpCode = inputCode;
            continue;
          }
          if (code === "totp_not_configured") {
            loginError.textContent = translateFirebaseError(code);
            return;
          }
          throw err;
        }
      }

      const sessionKey = loginResult.sessionKey || "";
      const ttlSeconds = Number(loginResult.ttlSeconds) || 0;
      if (sessionKey) saveSessionLocal({ uid: loginResult.uid, sessionKey, deviceId: loginResult.deviceId || getDeviceId(), ts: Date.now(), ttlSeconds });

      const basePayload = {
        uid: loginResult.uid || "",
        email: loginResult.email || email,
        token: loginResult.idToken || loginResult.id_token || "",
        sessionKey,
        customToken: loginResult.customToken || loginResult.custom_token || "",
        authkey: loginResult.authkey || loginResult.authKey || ""
      };
      if (basePayload.token || basePayload.customToken || basePayload.sessionKey) {
        savePostLoginPayload(basePayload);
      }

      let user = null;
      const canFirebase = canUseFirebaseAuth() && !!basePayload.customToken;
      if (canFirebase) {
        await ensureFirebaseCompatAsync();
        if (auth && typeof auth.signInWithCustomToken === "function") {
          try {
            await auth.signInWithCustomToken(basePayload.customToken);
            user = auth.currentUser;
          } catch (_) {
            user = null;
          }
        }
      }

      if (user) {
        const allowed = await assertNotBanned(user.uid, loginError);
        if (!allowed) return;
      }

      let idToken = basePayload.token;
      if (user && typeof user.getIdToken === "function") {
        try { idToken = await user.getIdToken(true); } catch (_) { idToken = basePayload.token; }
      }
      if (!idToken) {
        loginError.textContent = "تعذر تأكيد الجلسة، أعد تسجيل الدخول.";
        return;
      }

      savePostLoginPayload({
        ...basePayload,
        uid: (user && user.uid) ? user.uid : basePayload.uid,
        email: (user && user.email) ? user.email : basePayload.email,
        token: idToken || basePayload.token,
        authkey: basePayload.authkey || ""
      });
      goHome();
    } catch (err) {
      try { console.error("performManualLogin error", err); } catch (_) {}
      const code = err && err.code ? String(err.code) : "";
      loginError.textContent = translateFirebaseError(code || err.message || "");
    } finally {
      setButtonBusy(submitLogin, false);
    }
  }

  async function confirmUnverifiedLogin() {
    await ensureFirebaseCompatAsync();
    const loginError = byId('loginError');
    const user = auth ? auth.currentUser : null;
    const cached = readPostLoginPayload() || {};

    try {
      if (user) {
        const allowed = await assertNotBanned(user.uid, loginError);
        if (!allowed) return;
      }
      const sessionInfo = getSessionLocal() || {};
      const sessionKey = sessionInfo.sessionKey || cached.sessionKey || "";
      if (!sessionKey) {
        if (loginError) loginError.textContent = "رمز الجلسة غير متوفر. أعد تسجيل الدخول.";
        return;
      }

      let idToken = "";
      if (user && typeof user.getIdToken === "function") {
        try { idToken = await user.getIdToken(true); } catch (_) { idToken = ""; }
      }
      if (!idToken) {
        idToken = cached.token || cached.idToken || "";
      }
      if (!idToken) {
        if (loginError) loginError.textContent = "تعذر تأكيد الجلسة، أعد تسجيل الدخول.";
        return;
      }

      savePostLoginPayload({
        uid: (user && user.uid) ? user.uid : (cached.uid || ""),
        email: (user && user.email) ? user.email : (cached.email || ""),
        token: idToken,
        sessionKey,
        customToken: cached.customToken || cached.custom_token || "",
        authkey: cached.authkey || cached.authKey || ""
      });
      goHome();
    } catch (err) {
      if (loginError) loginError.textContent = translateFirebaseError(err.code || err.message || "");
    }
  }

  async function register() {
    const username = (byId('usernameInput')?.value || '').trim();
    const email = (byId('registerEmail')?.value || '').trim();
    const password = (byId('registerPassword')?.value || '').trim();
    const msg = byId('registerError');
    if (msg) { msg.textContent = ""; msg.style.color = ""; }

    if (!username || !email || !password) {
      if (msg) {
        msg.style.color = "var(--danger, #ef4444)";
        msg.textContent = "يرجى إدخال جميع الحقول.";
      }
      return;
    }

    const phone = (window.iti && typeof window.iti.getNumber === 'function') ? window.iti.getNumber() : "";

    try {
      const networkReady = await ensureNetworkHealthy(msg);
      if (!networkReady) return;

      const registerResult = await callManualAuth("register", { username, email, password, phone }, msg);
      const sessionKey = registerResult.sessionKey || "";
      const ttlSeconds = Number(registerResult.ttlSeconds) || 0;
      if (sessionKey && registerResult.uid) {
        saveSessionLocal({ uid: registerResult.uid, sessionKey, deviceId: registerResult.deviceId || getDeviceId(), ts: Date.now(), ttlSeconds });
      }

      const basePayload = {
        uid: registerResult.uid || "",
        email: registerResult.email || email,
        token: registerResult.idToken || registerResult.id_token || "",
        sessionKey,
        customToken: registerResult.customToken || registerResult.custom_token || "",
        authkey: registerResult.authkey || registerResult.authKey || ""
      };

      let user = null;
      const canFirebase = canUseFirebaseAuth() && !!basePayload.customToken;
      if (canFirebase) {
        await ensureFirebaseCompatAsync();
        if (auth && typeof auth.signInWithCustomToken === 'function') {
          try {
            await auth.signInWithCustomToken(basePayload.customToken);
            user = auth.currentUser;
          } catch (_) {
            user = null;
          }
        }
      }

      if (user) {
        const allowed = await assertNotBanned(user.uid, msg);
        if (!allowed) {
          try { if (auth) await auth.signOut(); } catch (_) {}
          return;
        }
      }

      let idToken = basePayload.token;
      if (user && typeof user.getIdToken === 'function') {
        try { idToken = await user.getIdToken(true); } catch (_) { idToken = basePayload.token; }
      }
      if (idToken) {
        savePostLoginPayload({
          ...basePayload,
          uid: (user && user.uid) ? user.uid : basePayload.uid,
          email: (user && user.email) ? user.email : basePayload.email,
          token: idToken || basePayload.token,
          authkey: basePayload.authkey || ""
        });
        goHome();
        return;
      }

      if (msg) {
        msg.style.color = "var(--success, #22c55e)";
        msg.textContent = "تم إنشاء الحساب بنجاح.";
      }
    } catch (err) {
      if (msg) {
        msg.style.color = "var(--danger, #ef4444)";
        msg.textContent = translateFirebaseError(err.code) || "تعذر إكمال العملية، حاول مرة أخرى.";
      }
    }
  }

  function normalizeGoogleUsername(displayName, email) {
    const raw = (displayName || (email ? email.split('@')[0] : '') || '').trim();
    if (!raw) return '';
    return raw
      .replace(/[^\p{L}\p{N}_\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 24);
  }

  const GOOGLE_USERNAME_MODAL = 'completeProfileModal';
  const GOOGLE_PHONE_MODAL = 'googlePhoneModal';

  const googleFlowState = {
    entry: 'login',
    user: null,
    profile: { username: '', phone: '' }
  };

  async function requestTotpCode(message, errorText) {
    return requestTotpCodeWithModal({
      subtitle: message || "من فضلك افتح تطبيق Google Authenticator وأدخل الكود المكون من 6 أرقام.",
      error: errorText || ""
    });
  }

  async function syncGoogleSession(targetErrorEl) {
    const user = googleFlowState.user;
    if (!user) throw new Error("google_user_missing");
    const idToken = await user.getIdToken(true);
    const payload = {
      idToken,
      provider: 'google',
      username: googleFlowState.profile.username || '',
      phone: googleFlowState.profile.phone || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || ''
    };
    let totpCode = "";
    while (true) {
      try {
        const result = await callManualAuth("sync", { ...payload, ...(totpCode ? { code: totpCode } : {}) }, targetErrorEl);
        const sessionKey = result.sessionKey || "";
        const ttlSeconds = Number(result.ttlSeconds) || 0;
        if (sessionKey) saveSessionLocal({ uid: result.uid, sessionKey, deviceId: result.deviceId || getDeviceId(), ts: Date.now(), ttlSeconds });
        return { result, idToken };
      } catch (err) {
        const code = err && err.code ? String(err.code) : "";
        if (code === "totp_required" || code === "totp_code_invalid") {
          if (targetErrorEl) targetErrorEl.textContent = "";
          const subtitle = code === "totp_code_invalid"
            ? "رمز التحقق غير صحيح. افتح تطبيق Google Authenticator وأعد المحاولة."
            : "من فضلك افتح تطبيق Google Authenticator وأدخل الكود المكون من 6 أرقام.";
          const errorText = code === "totp_code_invalid" ? "رمز التحقق غير صحيح." : "";
          const inputCode = await requestTotpCode(subtitle, errorText);
          if (!inputCode) {
            const cancelErr = new Error("totp_cancelled");
            cancelErr.code = "totp_cancelled";
            throw cancelErr;
          }
          totpCode = inputCode;
          continue;
        }
        if (code === "totp_not_configured" && targetErrorEl) {
          targetErrorEl.textContent = translateFirebaseError(code);
        }
        throw err;
      }
    }
  }

  function resetGoogleFlow() {
    googleFlowState.entry = 'login';
    googleFlowState.user = null;
    googleFlowState.profile = { username: '', phone: '' };
  }

  async function finalizeGoogleLogin() {
    const loginError = byId('loginError');
    if (!googleFlowState.user) return;
    try { closeModal(GOOGLE_USERNAME_MODAL); } catch (_) {}
    try { closeModal(GOOGLE_PHONE_MODAL); } catch (_) {}
    try {
      const allowed = await assertNotBanned(googleFlowState.user.uid, loginError);
      if (!allowed) { resetGoogleFlow(); return; }
      const { result, idToken } = await syncGoogleSession(loginError);
      const sessionKey = result.sessionKey || "";
      savePostLoginPayload({
        uid: googleFlowState.user.uid,
        email: googleFlowState.user.email || '',
        token: idToken,
        sessionKey,
        customToken: result.customToken || "",
        authkey: result.authkey || result.authKey || ""
      });
      resetGoogleFlow();
      goHome();
    } catch (error) {
      if (error?.code === "totp_cancelled") return;
      if (loginError) loginError.textContent = translateFirebaseError(error?.code || error?.message);
    }
  }

  async function handleGoogleSignIn(entryPoint = 'login', triggerBtn = null) {
    if (googleBusy) return;
    googleBusy = true;
    const loginError = byId('loginError');
    if (loginError) loginError.textContent = '';
    if (triggerBtn) setButtonBusy(triggerBtn, true);
    try { closeModal(GOOGLE_USERNAME_MODAL); } catch (_) {}
    try { closeModal(GOOGLE_PHONE_MODAL); } catch (_) {}

    try {
      const networkReady = await ensureNetworkHealthy(loginError);
      if (!networkReady) return;
      googleFlowState.entry = entryPoint;
      await ensureFirebaseCompatAsync();
      const provider = ensureGoogleProvider();
      if (!auth || !provider || typeof auth.signInWithPopup !== 'function') {
        throw new Error('auth_unavailable');
      }
      const result = await auth.signInWithPopup(provider);
      const user = result.user;
      googleFlowState.user = user;

      let existingData = {};
      try {
        if (db && typeof db.collection === 'function') {
          const snap = await db.collection('users').doc(user.uid).get();
          existingData = snap.exists ? (snap.data() || {}) : {};
        }
      } catch (_) {}

      googleFlowState.profile = {
        username: existingData.username || '',
        phone: existingData.phone || ''
      };

      if (!googleFlowState.profile.username) {
        const googleUsernameInput = byId('googleUsernameInput');
        const googleUsernameError = byId('googleUsernameError');
        if (googleUsernameInput) {
          googleUsernameInput.value = normalizeGoogleUsername(user.displayName, user.email);
        }
        if (googleUsernameError) googleUsernameError.textContent = '';
        showModal(GOOGLE_USERNAME_MODAL);
        setTimeout(() => { try { googleUsernameInput && googleUsernameInput.focus(); } catch (_) {} }, 50);
        return;
      }

      if (!googleFlowState.profile.phone) {
        const phoneSaveError = byId('phoneSaveError');
        if (phoneSaveError) phoneSaveError.textContent = '';
        showModal(GOOGLE_PHONE_MODAL);
        const googlePhoneInput = byId('googlePhoneInput');
        setTimeout(() => { try { googlePhoneInput && googlePhoneInput.focus(); } catch (_) {} }, 60);
        return;
      }

      await finalizeGoogleLogin();
    } catch (err) {
      if (err && (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')) {
        if (loginError) loginError.textContent = "تم إغلاق نافذة Google قبل إكمال تسجيل الدخول.";
      } else if (loginError) {
        loginError.textContent = translateFirebaseError(err?.code || err?.message);
      }
    } finally {
      googleBusy = false;
      if (triggerBtn) setButtonBusy(triggerBtn, false);
    }
  }

  async function submitGoogleUsername() {
    const googleUsernameInput = byId('googleUsernameInput');
    const googleUsernameError = byId('googleUsernameError');
    if (!googleFlowState.user || !googleUsernameInput) return;
    const value = (googleUsernameInput.value || '').trim();
    if (value.length < 3) {
      if (googleUsernameError) googleUsernameError.textContent = "يرجى إدخال اسم مستخدم لا يقل عن 3 أحرف.";
      return;
    }
    if (googleUsernameError) googleUsernameError.textContent = '';
    googleFlowState.profile.username = value;
    closeModal(GOOGLE_USERNAME_MODAL);
    if (!googleFlowState.profile.phone) {
      const phoneSaveError = byId('phoneSaveError');
      if (phoneSaveError) phoneSaveError.textContent = '';
      showModal(GOOGLE_PHONE_MODAL);
    } else {
      await finalizeGoogleLogin();
    }
  }

  async function submitGooglePhone() {
    const googlePhoneInput = byId('googlePhoneInput');
    const phoneSaveError = byId('phoneSaveError');
    if (!googleFlowState.user || !googlePhoneInput) return;
    let phoneValue = '';
    try {
      phoneValue = (window.googlePhoneIti && typeof window.googlePhoneIti.getNumber === 'function')
        ? window.googlePhoneIti.getNumber()
        : googlePhoneInput.value;
    } catch (_) {
      phoneValue = googlePhoneInput.value;
    }
    phoneValue = (phoneValue || '').trim();
    if (!phoneValue || phoneValue.replace(/\D/g, '').length < 6) {
      if (phoneSaveError) phoneSaveError.textContent = "يرجى إدخال رقم هاتف صالح.";
      return;
    }
    if (phoneSaveError) phoneSaveError.textContent = '';
    googleFlowState.profile.phone = phoneValue;
    await finalizeGoogleLogin();
  }

  function initPhoneInputs(){
    if (typeof window.intlTelInput !== 'function') {
      setTimeout(initPhoneInputs, 250);
      return;
    }
    const phoneInput = byId('phoneInput');
    if (phoneInput && !phoneInput.dataset.itiBound) {
      window.iti = window.intlTelInput(phoneInput, {
        initialCountry: "sy",
        separateDialCode: true,
        preferredCountries: ["sy", "jo", "sa", "eg"],
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js"
      });
      phoneInput.dataset.itiBound = "1";
    }
    const googlePhoneInput = byId('googlePhoneInput');
    if (googlePhoneInput && !googlePhoneInput.dataset.itiBound) {
      window.googlePhoneIti = window.intlTelInput(googlePhoneInput, {
        initialCountry: "sy",
        separateDialCode: true,
        preferredCountries: ["sy", "jo", "sa", "eg"],
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js"
      });
      googlePhoneInput.dataset.itiBound = "1";
    }
  }

  function bindLoginDom(){
    if (loginBound) return true;
    const loginForm = byId("loginForm");
    if (!loginForm) return false;
    loginBound = true;

    const registerForm = byId("registerForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        performManualLogin(ev);
      });
    }
    if (registerForm) {
      registerForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        if (typeof window.register === "function") window.register();
      });
    }

    const submitLogin = byId("submitLogin");
    if (submitLogin) {
      try { submitLogin.type = "button"; } catch (_) {}
      submitLogin.addEventListener('click', performManualLogin);
    }

    const showResetBtn = byId("showReset");
    if (showResetBtn) showResetBtn.onclick = () => switchForm("reset");

    const toggleRegisterBtn = byId("toggleRegister");
    if (toggleRegisterBtn) toggleRegisterBtn.onclick = () => switchForm("register");

    const registerPasswordInput = byId("registerPassword");
    if (registerPasswordInput) {
      registerPasswordInput.addEventListener('input', validatePassword);
      validatePassword();
    }

    const googleButtons = [byId('googleLogin'), byId('googleLoginRegister')].filter(Boolean);
    googleButtons.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        handleGoogleSignIn(
          btn.id === 'googleLoginRegister' ? 'register' : 'login',
          btn
        );
      });
    });

    const savePhoneBtn = byId('savePhoneBtn');
    if (savePhoneBtn) {
      savePhoneBtn.addEventListener('click', (event) => {
        event.preventDefault();
        submitGooglePhone();
      });
    }

    const totpLoginInput = byId("totpLoginInput");
    const totpLoginConfirm = byId("totpLoginConfirm");
    const totpLoginClose = byId("totpLoginClose");
    const totpLoginError = byId("totpLoginError");
    if (totpLoginInput) {
      totpLoginInput.addEventListener("input", () => {
        const clean = normalizeTotpCode(totpLoginInput.value);
        if (totpLoginInput.value !== clean) totpLoginInput.value = clean;
        if (totpLoginError) totpLoginError.textContent = "";
      });
      totpLoginInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          confirmTotpModal();
        }
      });
    }
    if (totpLoginConfirm) {
      totpLoginConfirm.addEventListener("click", (event) => {
        event.preventDefault();
        confirmTotpModal();
      });
    }
    if (totpLoginClose) {
      totpLoginClose.addEventListener("click", (event) => {
        event.preventDefault();
        resolveTotpRequest("");
        closeModal("totpLoginModal");
      });
    }

    if (!modalBound) {
      modalBound = true;
      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!target) return;
        if (target.classList && target.classList.contains("modal") && !target.classList.contains("hidden")) {
          if (target.closest && !target.closest('#loginInline')) return;
          closeModal(target.id);
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const openModal = document.querySelector('#loginInline .modal:not(.hidden)');
        if (openModal) closeModal(openModal.id);
      });
    }

    return true;
  }

  async function initLoginRoute(){
    bindLoginDom();
    initPhoneInputs();
    try { switchForm('login'); } catch (_) {}
    const emailInput = byId('emailInput');
    setTimeout(() => { try { emailInput && emailInput.focus(); } catch (_) {} }, 80);
    return true;
  }

  window.__initLoginRoute = initLoginRoute;
  window.__loginRouteOnShow = function(){
    try { switchForm('login'); } catch (_) {}
  };
  window.__manualLogin = performManualLogin;

  window.submitGoogleUsername = submitGoogleUsername;
  window.submitGooglePhone = submitGooglePhone;
  window.sendResetLink = sendResetLink;
  window.sendVerificationNow = sendVerificationNow;
  window.validatePassword = validatePassword;
  window.register = register;
  window.showModal = showModal;
  window.closeModal = closeModal;
  window.switchForm = switchForm;
  window.confirmUnverifiedLogin = confirmUnverifiedLogin;
})();

