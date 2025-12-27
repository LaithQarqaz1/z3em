// Deobfuscated and cleaned header logic

// ألغينا حد إعادة تحميل Firebase؛ أعِد الوظائف الأصلية إن وُجدت
(function(){
  try {
    if (typeof firebase !== 'undefined' && window.__ORIG_FIREBASE__) {
      if (window.__ORIG_FIREBASE__.auth) {
        firebase.auth = window.__ORIG_FIREBASE__.auth;
      }
      if (window.__ORIG_FIREBASE__.firestore) {
        firebase.firestore = window.__ORIG_FIREBASE__.firestore;
      }
    }
  } catch {}
  try { window.__SKIP_FIREBASE__ = false; } catch {}
})();

// Force HTTPS when not local
(function(){
  try {
    const host = location.hostname || '';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || /^0\.0\.0\.0$/.test(host) ||
      /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    if (location.protocol === 'http:' && !isLocal) {
      const to = 'https://' + location.host + location.pathname + location.search + location.hash;
      try { window.stop && window.stop(); } catch {}
      location.replace(to);
      return;
    }
  } catch {}
})();

// Add allow=1 on .html links when clicked (for from-home navigation)
(function(){
  function ensureAllowParam(a){
    try {
      const href = a.getAttribute('href');
      if (!href) return;
      const url = new URL(href, location.href);
      if (!url.searchParams.has('allow')) {
        url.searchParams.set('allow','1');
        a.setAttribute('href', url.pathname + url.search + url.hash);
      }
    } catch {}
  }
  function onNav(e){
    try {
      const link = e.target && e.target.closest ? e.target.closest('a[href$=".html"]') : null;
      if (!link) return;
      try { sessionStorage.setItem('nav:fromHome','1'); } catch {}
      ensureAllowParam(link);
    } catch {}
  }
  document.addEventListener('pointerdown', onNav, true);
  document.addEventListener('auxclick', onNav, true);
  document.addEventListener('click', onNav, true);
})();

// Preload image asset used elsewhere
(function(){
  try {
    const imgHref = 'loading.png';
    if (document.head && !document.querySelector("link[rel='preconnect'][href='https://i.ibb.co']")){
      const ln = document.createElement('link'); ln.rel = 'preconnect'; ln.href = 'https://i.ibb.co'; ln.crossOrigin = ''; document.head.appendChild(ln);
    }
    if (document.head && !document.querySelector(`link[rel='preload'][as='image'][href='${imgHref}']`)){
      const ln2 = document.createElement('link'); ln2.rel = 'preload'; ln2.as = 'image'; ln2.href = imgHref; document.head.appendChild(ln2);
    }
    const img = new Image(); img.decoding = 'async'; try { img.fetchPriority = 'high'; } catch {} img.loading = 'eager'; img.src = imgHref;
  } catch {}
})();

// Loader controls
// Ensure a preloader element exists so pages and older scripts can safely toggle it
(function ensurePreloader(){
  try {
    if (!document.getElementById('preloader')) {
      const el = document.createElement('div');
      el.id = 'preloader';
      el.className = 'hidden';
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.display = 'none';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.background = 'rgba(15,23,42,0.28)';
      el.style.backdropFilter = 'blur(6px)';
      el.style.zIndex = '10000';
      const spinner = document.createElement('div');
      spinner.setAttribute('aria-label','جارِ التحميل');
      spinner.style.width = '48px';
      spinner.style.height = '48px';
      spinner.style.border = '4px solid #fff';
      spinner.style.borderTopColor = 'transparent';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'spin 1s linear infinite';
      el.appendChild(spinner);
      try {
        const style = document.createElement('style');
        style.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
      } catch {}
      (document.body || document.documentElement).appendChild(el);
    }
  } catch {}
})();
function showPageLoader(){
  try {
    const el = document.getElementById('preloader');
    if (!el) return;
    try {
      sessionStorage.setItem('nav:loader:expected','1');
      sessionStorage.setItem('nav:loader:showAt', String(Date.now()));
    } catch {}
    el.classList.remove('hidden');
    el.style.display = 'flex';
    el.style.opacity = '1';
  } catch {}
}
function hidePageLoader(){
  try {
    const el = document.getElementById('preloader');
    if (!el) return;
    el.classList.add('hidden');
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    setTimeout(()=>{ el.style.display = 'none'; }, 400);
  } catch {}
}
window.addEventListener('pageshow', () => { try { if (sessionStorage.getItem('nav:loader:expected') === '1') return; } catch {} hidePageLoader(); });

// Device fingerprint helpers (legacy stub — device locking disabled)
const DEVICE_ID_STORAGE_KEY = 'session:device:id';
function getDeviceFingerprint(){
  return '';
}
function ensureDeviceFingerprint(){
  return '';
}
try { window.getDeviceFingerprint = getDeviceFingerprint; } catch {}

let sessionDocUnsubscribe = null;
let sessionConflictHandled = false;
function clearSessionDocWatcher(){
  if (sessionDocUnsubscribe){
    try { sessionDocUnsubscribe(); } catch {}
    sessionDocUnsubscribe = null;
  }
}
function triggerSessionConflictLogout(){
  if (sessionConflictHandled) return;
  sessionConflictHandled = true;
  clearSessionDocWatcher();
  try { localStorage.removeItem('sessionKeyInfo'); } catch {}
  try { window.dispatchEvent(new CustomEvent('session:conflict')); } catch {}
  const message = 'تم تسجيل الدخول من جهاز آخر وتم إنهاء هذه الجلسة.';
  try { alert(message); } catch {}
  try {
    firebase.auth().signOut().catch(()=>{}).finally(() => {
      try { window.location.href = 'login.html?session=conflict'; }
      catch { window.location.reload(); }
    });
  } catch {
    try { window.location.href = 'login.html?session=conflict'; }
    catch { window.location.reload(); }
  }
}
function watchSessionDocForDevice(user){
  clearSessionDocWatcher();
}

// Auto-retry worker requests when auth/session errors occur
(function setupSessionKeyAutoRetry(){
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    if (window.__SESSION_KEY_RETRY_PATCHED__) return;
    const nativeFetch = window.fetch.bind(window);
    window.__SESSION_KEY_RETRY_PATCHED__ = true;

    const SESSION_HEADER = 'X-SessionKey';
    const AUTH_HEADER = 'Authorization';
    const DEVICE_HEADER = 'X-DeviceId';
    const SESSION_ERROR_CODES = new Set(['session_missing','session_invalid','session_mismatch','session_expired']);
    const AUTH_ERROR_CODES = new Set([
      'auth_missing','auth_required','invalid_token','token_expired','invalid_alg','invalid_signature',
      'invalid_issuer','invalid_audience','jwk_not_found','sub_userid_mismatch','firestore_auth_missing','jwt_parse_error'
    ]);
    const RAND_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const RAND_SYMBOLS = '!@#$%&';
    let rotatePromise = null;
    let authRefreshPromise = null;

    function requestCarriesSession(req){
      try { return !!req.headers.get(SESSION_HEADER); } catch { return false; }
    }
    function requestCarriesAuth(req){
      try {
        const header = req.headers.get(AUTH_HEADER) || '';
        return /^Bearer\s+\S+/i.test(header);
      } catch { return false; }
    }
    function shouldIntercept(req){
      return requestCarriesSession(req) || requestCarriesAuth(req);
    }
    function normalizeCode(val){
      return (typeof val === 'string' ? val : '').trim().toLowerCase();
    }
    function isSessionCode(code){
      if (!code) return false;
      return SESSION_ERROR_CODES.has(code) || code.startsWith('session_');
    }
    function isAuthCode(code){
      if (!code) return false;
      return AUTH_ERROR_CODES.has(code);
    }
    function grabSessionCode(payload){
      if (!payload || typeof payload !== 'object') return '';
      const fields = ['code','errorCode','error_code','error'];
      for (let i = 0; i < fields.length; i++){
        const code = normalizeCode(payload[fields[i]]);
        if (code) return code;
      }
      return '';
    }
    function extractTtl(payload){
      if (!payload || typeof payload !== 'object') return 0;
      const ttl = Number(payload.ttlSeconds ?? payload.ttl ?? payload.ttl_seconds ?? payload.ttlseconds ?? payload.sessionTtl ?? 0);
      return Number.isFinite(ttl) && ttl > 0 ? ttl : 0;
    }
    function randomFromAlphabet(alphabet, len){
      const set = (typeof alphabet === 'string' && alphabet.length) ? alphabet : RAND_ALPHA;
      const length = Math.max(1, Number(len) || 1);
      const cryptoObj = (typeof window !== 'undefined' && window.crypto) || null;
      if (cryptoObj && typeof cryptoObj.getRandomValues === 'function'){
        const buf = new Uint32Array(length);
        cryptoObj.getRandomValues(buf);
        let out = '';
        for (let i = 0; i < length; i++){ out += set[buf[i] % set.length]; }
        return out;
      }
      let fallback = '';
      for (let i = 0; i < length; i++){ fallback += set[Math.floor(Math.random() * set.length)]; }
      return fallback;
    }
    function generateSessionKey(len = 64){
      return randomFromAlphabet(RAND_ALPHA + RAND_SYMBOLS, len);
    }
    function persistSessionInfo(uid, key, ttlSeconds){
      if (!uid || !key) return;
      try {
        localStorage.setItem('sessionKeyInfo', JSON.stringify({
          uid,
          sessionKey: key,
          ts: Date.now(),
          ttlSeconds: Number(ttlSeconds) || 0
        }));
      } catch {}
    }
    async function rotateSessionKey(ttlSeconds){
      if (!window.firebase || !firebase.auth || !firebase.firestore) return null;
      const user = firebase.auth().currentUser;
      if (!user) return null;
      if (!rotatePromise){
        rotatePromise = (async () => {
          const freshKey = generateSessionKey();
          try {
            const ref = firebase.firestore().collection('users').doc(user.uid).collection('keys').doc('session');
            const payload = {
              sessionKey: freshKey,
              ttlSeconds: Number(ttlSeconds) || 0
            };
            const FieldValue = firebase.firestore.FieldValue;
            if (FieldValue && FieldValue.serverTimestamp) {
              payload.createdAt = FieldValue.serverTimestamp();
            }
            await ref.set(payload, { merge: true });
          } catch (err) {
            console.warn('Session key rotation write failed:', err);
          }
          persistSessionInfo(user.uid, freshKey, ttlSeconds);
          return freshKey;
        })().catch(err => { console.warn('Auto rotate session key failed:', err); return null; }).finally(() => { rotatePromise = null; });
      }
      return rotatePromise;
    }
    async function refreshAuthToken(){
      if (!window.firebase || !firebase.auth) return null;
      const user = firebase.auth().currentUser;
      if (!user) return null;
      if (!authRefreshPromise){
        authRefreshPromise = user.getIdToken(true).catch(err => {
          console.warn('Auth token refresh failed:', err);
          return null;
        }).finally(() => { authRefreshPromise = null; });
      }
      return authRefreshPromise;
    }
    function rebuildRequestWithHeaders(request, mutateHeaders){
      try {
        const headers = new Headers(request.headers);
        mutateHeaders(headers);
        return new Request(request, { headers, signal: request.signal });
      } catch (err) {
        console.warn('Failed to rebuild request for retry:', err);
        return null;
      }
    }
    function ensureDeviceHeader(request){
      if (!requestCarriesSession(request)) return request;
      const fingerprint = (typeof getDeviceFingerprint === 'function') ? getDeviceFingerprint() : '';
      if (!fingerprint) return request;
      try {
        const current = request.headers.get(DEVICE_HEADER);
        if (current && current === fingerprint) return request;
      } catch {}
      const updated = rebuildRequestWithHeaders(request, headers => { headers.set(DEVICE_HEADER, fingerprint); });
      return updated || request;
    }
    async function classifyForRetry(resp, req){
      if (!resp || typeof resp.clone !== 'function') return null;
      let payload = null;
      try { payload = await resp.clone().json(); } catch {}
      const code = grabSessionCode(payload);
      const ttlSeconds = extractTtl(payload);
      const statusIs401 = Number(resp.status) === 401;
      const hasSession = requestCarriesSession(req);
      const hasAuth = requestCarriesAuth(req);

      if (hasSession && (isSessionCode(code) || (statusIs401 && !code))) {
        return { kind: 'session', ttlSeconds, code: code || (statusIs401 ? 'session_http_401' : '') };
      }
      if (hasAuth && (isAuthCode(code) || (statusIs401 && !isSessionCode(code)))) {
        return { kind: 'auth', ttlSeconds: 0, code: code || (statusIs401 ? 'auth_http_401' : '') };
      }
      return null;
    }

    window.fetch = async function sessionAwareFetch(input, init){
      let request;
      try { request = new Request(input, init); }
      catch (_) { return nativeFetch(input, init); }
      request = ensureDeviceHeader(request);
      if (!shouldIntercept(request)) {
        return nativeFetch(request);
      }

      let response = await nativeFetch(request.clone());
      for (let attempt = 0; attempt < 3; attempt++){
        const action = await classifyForRetry(response, request);
        if (!action) return response;

        if (action.kind === 'session'){
          const conflictCodes = new Set(['session_mismatch','session_conflict']);
          if (conflictCodes.has(action.code)) {
            triggerSessionConflictLogout();
            return response;
          }
          const newKey = await rotateSessionKey(action.ttlSeconds);
          if (!newKey) return response;
          const updated = rebuildRequestWithHeaders(request, headers => {
            headers.set(SESSION_HEADER, newKey);
            const fingerprint = (typeof getDeviceFingerprint === 'function') ? getDeviceFingerprint() : '';
            if (fingerprint) headers.set(DEVICE_HEADER, fingerprint);
          });
          if (!updated) return response;
          request = updated;
          response = await nativeFetch(request.clone());
          continue;
        }

        if (action.kind === 'auth'){
          const freshToken = await refreshAuthToken();
          if (!freshToken) return response;
          const updated = rebuildRequestWithHeaders(request, headers => { headers.set(AUTH_HEADER, `Bearer ${freshToken}`); });
          if (!updated) return response;
          request = updated;
          response = await nativeFetch(request.clone());
          continue;
        }
      }
      return response;
    };
  } catch (err) {
    console.warn('Session auto-retry bootstrap failed:', err);
  }
})();

// =============================
// Currency utils and formatting
// =============================
(function setupCurrency(){
  try {
    const CURRENCY_KEY = 'currency:selected';
    const RATES_CACHE_KEY = 'currency:rates:cache';
    const RATES_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

    // Rates map — filled from cache or Firebase
    const CURRENCIES = {};
    let ratesListenerStarted = false;
    let ratesCacheMeta = { updatedAt: 0 };

    function readCachedRates(){
      try {
        const raw = localStorage.getItem(RATES_CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return null;
        const updatedAt = Number(data.updatedAt);
        const rates = data.rates;
        const base = typeof data.base === 'string' ? data.base.toUpperCase() : 'USD';
        if (!updatedAt || !rates || typeof rates !== 'object') return null;
        ratesCacheMeta.updatedAt = updatedAt;
        return { updatedAt, rates, base };
      } catch { return null; }
    }
    function writeCachedRates(rates, base){
      try {
        const payload = {
          updatedAt: Date.now(),
          base: (base || 'USD'),
          rates
        };
        ratesCacheMeta.updatedAt = payload.updatedAt;
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(payload));
      } catch {}
    }
    function isRatesCacheFresh(){
      if (!ratesCacheMeta.updatedAt) return false;
      try {
        return (Date.now() - ratesCacheMeta.updatedAt) < RATES_CACHE_TTL_MS;
      } catch { return false; }
    }

    function getSelected(){
      try {
        const c = localStorage.getItem(CURRENCY_KEY);
        const MAP = (function(){ try { return window.__CURRENCIES__ || CURRENCIES; } catch { return CURRENCIES; } })();
        if (c && MAP[c]) return c;
        const keys = Object.keys(MAP);
        if (keys.length) return keys[0];
      } catch {}
      return 'USD';
    }
    function setSelected(code){
      const MAP = (function(){ try { return window.__CURRENCIES__ || CURRENCIES; } catch { return CURRENCIES; } })();
      if (!MAP[code]) return;
      try { localStorage.setItem(CURRENCY_KEY, code); } catch {}
      try { window.dispatchEvent(new CustomEvent('currency:change', { detail: { code } })); } catch {}
      try { applyCurrencyNow(); } catch {}
    }

    const STORE_BASE_CODE = 'USD'; // Balance stored in database is USD.
    function getFxBase(){ try { return window.__CURRENCY_BASE__ || null; } catch { return null; } }
    function getRates(){ try { return window.__CURRENCIES__ || CURRENCIES; } catch { return CURRENCIES; } }
    function convertAmount(amount, fromCode, toCode){
      const n = Number(amount || 0);
      if (!Number.isFinite(n)) return 0;
      const MAP = getRates();
      const BASE = getFxBase();
      if (fromCode === toCode) return n;
      const rFrom = (MAP[fromCode] && Number(MAP[fromCode].rate)) || (fromCode === BASE ? 1 : null);
      const rTo   = (MAP[toCode]   && Number(MAP[toCode].rate))   || (toCode   === BASE ? 1 : null);
      let baseAmt;
      if (fromCode === BASE) baseAmt = n; else baseAmt = rFrom ? (n / rFrom) : n;
      let out;
      if (toCode === BASE) out = baseAmt; else out = rTo ? (baseAmt * rTo) : baseAmt;
      return out;
    }
    function convertFromJOD(amountJOD, toCode){
      return convertAmount(amountJOD, STORE_BASE_CODE, toCode);
    }
    function convertToJOD(amount, fromCode){
      return convertAmount(amount, fromCode, STORE_BASE_CODE);
    }
    function formatAmountFromJOD(amountJOD, toCode){
      const code = toCode || getSelected();
      const MAP = getRates();
      const cur = MAP[code] || MAP[STORE_BASE_CODE] || {};
      const val = convertFromJOD(amountJOD, code);
      return Number(val).toFixed(2) + ' ' + (cur.symbol || '');
    }

    // Expose for other scripts/pages if needed
    try {
      window.__CURRENCIES__ = CURRENCIES;
      window.__CURRENCY_BASE__ = null;
      window.getSelectedCurrencyCode = getSelected;
      window.setSelectedCurrencyCode = setSelected;
      window.convertFromJOD = convertFromJOD;
      window.formatCurrencyFromJOD = (v)=>formatAmountFromJOD(v);
    } catch {}

    // Price application helpers (best-effort DOM scan)
    function collectPriceNodes(root){
  const doc = root || document;
  const sels = [
    '#pm-price', '.pm-pill', '.offer-price', '.voucher .price',
    '.price', "[class*='price']", "[id*='price']", '#balanceAmount',
    '.buy', '.buy-btn', '.price-btn', '.card .btn', 'a.btn', 'button.btn',
    '[data-price]', '[data-price-jod]', '[data-price-usd]', '[data-amount]'
  ];
  const nodes = new Set();
  try { sels.forEach(sel => { doc.querySelectorAll(sel).forEach(el => nodes.add(el)); }); } catch {}
  return Array.from(nodes);
}
    function parseRatesJsonSafe(raw){
      try {
        if (!raw) return {};
        if (typeof raw === 'object') return raw;
        let s = String(raw)
          .replace(/\uFEFF/g,'')
          .replace(/[\u200f\u200e\u202a-\u202e]/g,'')
          .replace(/[“”«»]/g,'"')
          .replace(/[‘’]/g,"'")
          .replace(/،/g,',')
          .replace(/؛/g,',');
        // إذا كان النص ملفوفًا بعلامات اقتباس ويبدأ بـ {، أزل الاقتباس الزائد
        if (/^"\{/.test(s) && /\}"$/.test(s)) s = s.slice(1, -1);
        s = s.replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:/g,'$1"$2":');
        s = s.replace(/([\{,]\s*)'([^']*)'\s*:/g,'$1"$2":');
        s = s.replace(/:\s*'([^']*)'/g,':"$1"');
        // إزالة الفواصل الزائدة
        s = s.replace(/,(\s*[}\]])/g,'$1');
        const obj = JSON.parse(s);
        return (obj && typeof obj === 'object') ? obj : {};
      } catch (e) {
        try { console.warn('Failed to parse ratesJson:', e); } catch {}
        return {};
      }
    }
    function guessCodeFromText(t){
      try {
        const s = String(t||'');
        if (/\$/.test(s)) return 'USD';
        if (/د\.أ|دينار/.test(s)) return 'JOD';
        if (/ر\.س|ريال/.test(s)) return 'SAR';
        if (/ج\.م|جنيه/.test(s)) return 'EGP';
      } catch {}
      return '';
    }
    function parseNumberFromText(t){
      if (!t) return null;
      const s = String(t).replace(/[\u0660-\u0669]/g, (d)=> String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits ? Latin
                          .replace(/[^0-9.,]/g,'')
                          .replace(/,(?=\d{3}(\D|$))/g, '') // drop thousand commas
                          .replace(',', '.');
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    }

    function applyCurrencyToPrices(root){
      const code = getSelected();
      const els = collectPriceNodes(root);
      els.forEach(el => {
        try {
          // Skip elements that are clearly not amounts (e.g., durations with 's')
          const txt = (el.textContent || '').trim();
          if (!el.dataset) return;

          let base = null;
          // 1) Explicit base in JOD
          if (el.dataset.priceJod != null) {
            const n = Number(el.dataset.priceJod);
            if (Number.isFinite(n)) base = n;
          }
          // 2) Explicit base in USD (or any): allow data-priceUsd or data-price and data-price-base / data-currency
          if (base == null && el.dataset.priceUsd != null) {
            const n = Number(el.dataset.priceUsd);
            if (Number.isFinite(n)) base = convertToJOD(n, 'USD');
          }
          if (base == null) {
            const v = Number(el.dataset.price || el.dataset.amount);
            const cur = (el.dataset.priceBase || el.dataset.currency || '').toUpperCase();
            if (Number.isFinite(v) && cur) base = convertToJOD(v, cur);
          }
          if (base == null) {
            const n = parseNumberFromText(txt);
            if (Number.isFinite(n)) {
              // Assume initial content is JOD-based when first seen unless overridden
              const curGuess = (el.dataset.priceBase || el.dataset.currency || guessCodeFromText(txt) || 'USD').toUpperCase();
              base = convertToJOD(n, curGuess);
              el.dataset.priceJod = String(base);
            }
          }
          if (base == null) return;
          el.textContent = formatAmountFromJOD(base, code);
        } catch {}
      });
    }

    let applyPending = false;
    function applyCurrencyNow(){
      try { if (!window.__CURRENCIES_READY__) return; } catch {}
      if (applyPending) return;
      applyPending = true;
      try {
        requestAnimationFrame(()=>{ try { applyCurrencyToPrices(document); } finally { applyPending = false; } });
      } catch { try { applyCurrencyToPrices(document); } finally { applyPending = false; } }
    }

    // Observe dynamic pages to keep prices in sync
    try {
      if (window.MutationObserver) {
        const mo = new MutationObserver(()=>{ applyCurrencyNow(); });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      }
    } catch {}

    // Re-apply whenever currency changes
    window.addEventListener('currency:change', applyCurrencyNow);
    window.addEventListener('DOMContentLoaded', applyCurrencyNow);

    // Build sidebar currency selector once sidebar exists (styled like other items)
    function attachSelector(){
      try {
        const ul = document.querySelector('#sidebar ul');
        if (!ul) return;
        if (document.getElementById('currencyLi')) return; // already attached

        const li = document.createElement('li');
        li.id = 'currencyLi';
        li.style.position = 'relative';
        li.innerHTML = '<i class="fa-solid fa-sack-dollar"></i><a href="#" data-i18n="nav.currency">\u0627\u0644\u0639\u0645\u0644\u0629</a>';
        const labelA = li.querySelector('a');
        if (labelA) labelA.style.pointerEvents = 'none';

        function listCodes(){ try { return Object.keys((window.__CURRENCIES__||CURRENCIES)); } catch { return Object.keys(CURRENCIES); } }

        // Invisible select overlay to open native picker on click anywhere in li
        const select = document.createElement('select');
        select.id = 'currencySelect';
        // cover entire li but invisible
        select.style.position = 'absolute';
        select.style.inset = '0 0 0 0';
        select.style.opacity = '0';
        select.style.width = '100%';
        select.style.height = '100%';
        select.style.cursor = 'pointer';
        select.style.appearance = 'none';
        select.style.WebkitAppearance = 'none';
        select.style.MozAppearance = 'none';

        function rebuildOptions(){
          try {
            while (select.firstChild) select.removeChild(select.firstChild);
            const MAP = (function(){ try { return window.__CURRENCIES__ || CURRENCIES; } catch { return CURRENCIES; } })();
            const codes = Object.keys(MAP);
            codes.forEach(code => {
              const cur = MAP[code];
              const opt = document.createElement('option');
              opt.value = code;
              opt.textContent = `${cur?.nameAr || code} (${cur?.symbol || ''})`;
              select.appendChild(opt);
            });
            const wanted = getSelected();
            if (MAP[wanted]) select.value = wanted; else if (codes.length) select.value = codes[0];
          } catch {}
        }
        function syncSelectedOption(){
          try {
            const wanted = getSelected();
            if (wanted && select.value !== wanted) select.value = wanted;
          } catch {}
        }
        rebuildOptions();
        select.addEventListener('change', (e)=>{
          const val = e.target && e.target.value;
          setSelected(val);
          syncSelectedOption();
        });
        li.appendChild(select);

        ul.appendChild(li);
        // keep select synced if currency changed elsewhere
        window.addEventListener('currency:change', () => { syncSelectedOption(); });
        window.addEventListener('currency:rates:change', () => { rebuildOptions(); });
      } catch {}
    }
    window.addEventListener('DOMContentLoaded', attachSelector);
    // Retry a few times in case sidebar renders slightly later
    try { setTimeout(attachSelector, 200); setTimeout(attachSelector, 1000); } catch {}
    const cachedRatesPayload = readCachedRates();
    if (cachedRatesPayload && cachedRatesPayload.rates && Object.keys(cachedRatesPayload.rates).length) {
      const baseFromCache = (cachedRatesPayload.base || 'USD');
      try { window.__CURRENCY_BASE__ = baseFromCache; } catch {}
      applyRatesMap(cachedRatesPayload.rates, { base: baseFromCache, cache: false });
    }

    function ensureRatesFresh(){
      if (isRatesCacheFresh()) return;
      initRatesListener();
    }

    if (!isRatesCacheFresh()) {
      ensureRatesFresh();
    }

    try { window.addEventListener('firebase:ready', ensureRatesFresh); } catch {}

    // Live rates from Firestore (config/currency.ratesJson)
    function normalizeRates(obj){
      const out = {};
      try {
        Object.entries(obj || {}).forEach(([code, v]) => {
          const C = String(code || '').toUpperCase();
          if (!C) return;
          if (v && typeof v === 'object') {
            const rate = Number(v.rate || v.RATE || v.value);
            const symbol = v.symbol || v.sym || '';
            const nameAr = v.nameAr || v.name || C;
            if (Number.isFinite(rate) && rate > 0) out[C] = { code: C, rate, symbol, nameAr };
          } else {
            const rate = Number(v);
            if (Number.isFinite(rate) && rate > 0) out[C] = { code: C, rate, symbol: '', nameAr: C };
          }
        });
      } catch {}
      return out;
    }
    function applyRatesMap(map, options){
      try {
        const opts = options || {};
        const overrides = normalizeRates(map);
        const merged = Object.assign({}, overrides);
        Object.keys(overrides).forEach(k => { if (!merged[k]) merged[k] = overrides[k]; });
        if (opts.base) {
          try { window.__CURRENCY_BASE__ = opts.base; } catch {}
        }
        window.__CURRENCIES__ = merged;
        try { window.__CURRENCIES_READY__ = true; } catch {}
        if (opts.cache !== false && Object.keys(merged).length) {
          const baseForCache = opts.base || getFxBase() || 'USD';
          writeCachedRates(merged, baseForCache);
        }
        try { applyCurrencyNow(); } catch {}
        try {
          const base = (typeof window.__BAL_BASE__ !== 'undefined') ? window.__BAL_BASE__ : null;
          if (base != null && Number.isFinite(Number(base))) {
            const txt = (typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(base) : (Number(base).toFixed(2) + ' $');
            setHeaderBalance(txt);
          }
        } catch {}
        try { window.dispatchEvent(new CustomEvent('currency:rates:change')); } catch {}
        try { window.dispatchEvent(new Event('currency:ready')); } catch {}
      } catch {}
    }
    function initRatesListener(){
      if (ratesListenerStarted) return;
      ratesListenerStarted = true;
      const PID_FALLBACK = 'z3em-d9b11';
      try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
          const ref = firebase.firestore().collection('config').doc('currency');
          const handleSnap = (snap) => {
            try {
              if (!snap.exists) return;
              const data = snap.data() || {};
              const raw = data.ratesJson || data.rates || {};
              let parsed;
              try {
                if (typeof raw === 'object') parsed = raw; else {
                  let s = String(raw||'')
                    .replace(/\uFEFF/g,'')
                    .replace(/[\u200f\u200e\u202a-\u202e]/g,'')
                    .replace(/[“”«»]/g,'"')
                    .replace(/[‘’]/g,"'")
                    .replace(/،/g,',').replace(/؛/g,',');
                  s = s.replace(/([\{\[,]\s*)'([^']*)'\s*:/g,'$1"$2":');
                  s = s.replace(/:\s*'([^']*)'/g,':"$1"');
                  s = s.replace(/,(\s*[}\]])/g,'$1');
                  parsed = JSON.parse(s);
                }
              } catch { parsed = {}; }
              let base = 'USD';
              try {
                const b = String(data.baseCode || '').trim().toUpperCase();
                base = b || 'USD';
              } catch { base = 'USD'; }
              applyRatesMap(parsed, { base });
            } catch {}
          };
          const handleErr = () => {
            try {
              const pid = PID_FALLBACK;
              fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/config/currency`).then(r=>r.json()).then(doc=>{
                try {
                  const fields = (doc && doc.fields) || {};
                  const raw = (fields.ratesJson && fields.ratesJson.stringValue) || null;
                  let parsed = {};
                  try {
                    if (raw) {
                      let s = String(raw||'')
                        .replace(/\uFEFF/g,'')
                        .replace(/[\u200f\u200e\u202a-\u202e]/g,'')
                        .replace(/[“”«»]/g,'"')
                        .replace(/[‘’]/g,"'")
                        .replace(/،/g,',').replace(/؛/g,',')
                        .replace(/([\{\[,]\s*)'([^']*)'\s*:/g,'$1"$2":')
                        .replace(/:\s*'([^']*)'/g,':"$1"')
                        .replace(/,(\s*[}\]])/g,'$1');
                      parsed = JSON.parse(s);
                    }
                  } catch { parsed = {}; }
                  let base = 'USD';
                  try { const b = (fields.baseCode && fields.baseCode.stringValue) ? String(fields.baseCode.stringValue).toUpperCase() : 'USD'; base = b || 'USD'; } catch { base = 'USD'; }
                  applyRatesMap(parsed, { base });
                } catch {}
              }).catch(()=>{});
            } catch {}
          };
          try { ref.onSnapshot(handleSnap, handleErr); } catch { try { ref.onSnapshot(handleSnap); } catch {} }
          return;
        }
      } catch {}
      try {
        const pid = PID_FALLBACK;
        fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/config/currency`).then(r=>r.json()).then(doc=>{
          try {
            const fields = (doc && doc.fields) || {};
            function fromNumberField(f){
              if (!f) return null;
              if (typeof f.doubleValue !== 'undefined') return Number(f.doubleValue);
              if (typeof f.integerValue !== 'undefined') return Number(f.integerValue);
              if (typeof f.stringValue !== 'undefined') { const n = Number(f.stringValue); return Number.isFinite(n) ? n : null; }
              return null;
            }
            function fromStringField(f){
              if (!f) return '';
              if (typeof f.stringValue !== 'undefined') return String(f.stringValue);
              if (typeof f.integerValue !== 'undefined' || typeof f.doubleValue !== 'undefined') return String(fromNumberField(f) ?? '');
              return '';
            }
            function mapValueToPlain(mv){
              const out = {};
              try {
                const mfields = (mv && mv.mapValue && mv.mapValue.fields) || {};
                Object.keys(mfields).forEach(code => {
                  const entry = mfields[code];
                  if (entry && entry.mapValue && entry.mapValue.fields){
                    const ef = entry.mapValue.fields;
                    const rate = fromNumberField(ef.rate ?? ef.RATE ?? ef.value);
                    const symbol = fromStringField(ef.symbol ?? ef.sym);
                    const nameAr = fromStringField(ef.nameAr ?? ef.name);
                    if (Number.isFinite(rate) && rate > 0){ out[String(code).toUpperCase()] = { code: String(code).toUpperCase(), rate, symbol, nameAr: nameAr || String(code).toUpperCase() }; }
                  } else {
                    const rate = fromNumberField(entry);
                    if (Number.isFinite(rate) && rate > 0){ out[String(code).toUpperCase()] = { code: String(code).toUpperCase(), rate, symbol: '', nameAr: String(code).toUpperCase() }; }
                  }
                });
              } catch {}
              return out;
            }

            // Prefer ratesJson string, then mapValue (ratesJson or rates)
            const hasRJ = fields.ratesJson;
            const hasR = fields.rates;
            let parsed = {};
            try {
              if (hasRJ && typeof hasRJ.stringValue !== 'undefined'){
                let s = hasRJ.stringValue;
                if (typeof s === 'object') parsed = s; else {
                  s = String(s||'')
                    .replace(/\uFEFF/g,'')
                    .replace(/[\u200f\u200e\u202a-\u202e]/g,'')
                    .replace(/[“”«»]/g,'"')
                    .replace(/[‘’]/g,"'")
                    .replace(/،/g,',').replace(/؛/g,',');
                  s = s.replace(/([\{\[,]\s*)'([^']*)'\s*:/g,'$1"$2":');
                  s = s.replace(/:\s*'([^']*)'/g,':"$1"');
                  s = s.replace(/,(\s*[}\]])/g,'$1');
                  parsed = JSON.parse(s);
                }
              } else if (hasRJ && hasRJ.mapValue){
                parsed = mapValueToPlain(hasRJ);
              } else if (hasR && (hasR.mapValue || typeof hasR.stringValue !== 'undefined')){
                if (hasR.mapValue) parsed = mapValueToPlain(hasR); else {
                  let s = String(hasR.stringValue||'');
                  try {
                    s = s
                      .replace(/\uFEFF/g,'')
                      .replace(/[\u200f\u200e\u202a-\u202e]/g,'')
                      .replace(/[“”«»]/g,'"')
                      .replace(/[‘’]/g,"'")
                      .replace(/،/g,',').replace(/؛/g,',')
                      .replace(/([\{\[,]\s*)'([^']*)'\s*:/g,'$1"$2":')
                      .replace(/:\s*'([^']*)'/g,':"$1"')
                      .replace(/,(\s*[}\]])/g,'$1');
                    parsed = JSON.parse(s);
                  } catch { parsed = {}; }
                }
              }
            } catch { parsed = {}; }

            let base = 'USD';
            try {
              const b = (fields.baseCode && fields.baseCode.stringValue)
                ? String(fields.baseCode.stringValue).toUpperCase()
                : (fields.base && fields.base.stringValue ? String(fields.base.stringValue).toUpperCase() : 'USD');
              base = b || 'USD';
            } catch { base = 'USD'; }

            applyRatesMap(parsed, { base });
          } catch {}
        }).catch(()=>{});
      } catch {}
    }
  } catch {}
})();
document.addEventListener('visibilitychange', () => { try { if (sessionStorage.getItem('nav:loader:expected') === '1') return; } catch {} if (document.visibilityState === 'visible') hidePageLoader(); });

// i18n (language switcher + translations)
const I18N_TEXT = {
  ar: {
    'brand.name': '\u0645\u062A\u062C\u0631\u0020\u0632\u0639\u064A\u0645',
    'brand.home': '\u0627\u0644\u0639\u0648\u062F\u0629\u0020\u0644\u0644\u0631\u0626\u064A\u0633\u064A\u0629',
    'nav.home': '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629',
    'nav.deposit': '\u0627\u0644\u0625\u064A\u062F\u0627\u0639',
    'nav.orders': '\u0637\u0644\u0628\u0627\u062A\u064A',
    'nav.wallet': '\u0627\u0644\u0645\u062D\u0641\u0638\u0629',
    'nav.transfer': '\u062A\u062D\u0648\u064A\u0644\u0020\u0627\u0644\u0631\u0635\u064A\u062F',
    'nav.reviews': '\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A',
    'nav.settings': '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',
    'nav.api': '\u0648\u062C\u0647\u0629\u0020\u0627\u0644\u0628\u0631\u0645\u062C\u0629',
    'nav.login': '\u062A\u0633\u062C\u064A\u0644\u0020\u0627\u0644\u062F\u062E\u0648\u0644',
    'nav.logout': '\u062A\u0633\u062C\u064A\u0644\u0020\u0627\u0644\u062E\u0631\u0648\u062C',
    'nav.currency': '\u0627\u0644\u0639\u0645\u0644\u0629',
    'nav.language': '\u0627\u0644\u0644\u063A\u0629',
    'support.title': '\u0637\u0631\u0642\u0020\u0627\u0644\u062A\u0648\u0627\u0635\u0644',
    'support.credit': '\uD83D\uDD17\u0020\u062A\u0645\u0020\u062A\u0637\u0648\u064A\u0631\u0020\u0627\u0644\u0645\u0646\u0635\u0629\u0020\u0628\u0648\u0627\u0633\u0637\u0629\u0020LaithDev.',
    'support.whatsappAlt': '\u0648\u0627\u062A\u0633\u0627\u0628\u00202'
  },
  en: {
    'brand.name': 'Z3em Store',
    'brand.home': 'Back to home',
    'nav.home': 'Home',
    'nav.deposit': 'Deposit',
    'nav.orders': 'My Orders',
    'nav.wallet': 'My Wallet',
    'nav.transfer': 'Balance Transfer',
    'nav.reviews': 'Reviews',
    'nav.settings': 'Settings',
    'nav.api': 'API Docs',
    'nav.login': 'Log In',
    'nav.logout': 'Log Out',
    'nav.currency': 'Currency',
    'nav.language': 'Language',
    'support.title': "We're here to help",
    'support.credit': '\uD83D\uDD17 Platform developed by LaithDev.',
    'support.whatsappAlt': 'WhatsApp 2'
  },
  fr: {
    'brand.name': 'Boutique Z3em',
    'brand.home': 'Retour \u00E0 l\'accueil',
    'nav.home': 'Accueil',
    'nav.deposit': 'D\u00E9p\u00F4t',
    'nav.orders': 'Mes commandes',
    'nav.wallet': 'Mon portefeuille',
    'nav.transfer': 'Transfert de solde',
    'nav.reviews': 'Avis',
    'nav.settings': 'Param\u00E8tres',
    'nav.api': 'API Docs',
    'nav.login': 'Connexion',
    'nav.logout': 'D\u00E9connexion',
    'nav.currency': 'Devise',
    'nav.language': 'Langue',
    'support.title': 'Nous sommes l\u00E0 pour vous aider',
    'support.credit': '\uD83D\uDD17 Plateforme d\u00E9velopp\u00E9e par LaithDev.',
    'support.whatsappAlt': 'WhatsApp 2'
  }
};
function normalizeKey(value){
  return (value || '')
    .toString()
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
function hasArabic(value){
  return ARABIC_RE.test(String(value || ''));
}
const LATIN_RE = /[A-Za-z]/;
function hasLatin(value){
  return LATIN_RE.test(String(value || ''));
}
function isShortLatinToken(value){
  const str = normalizeKey(value);
  if (!str) return false;
  if (!hasLatin(str) || hasArabic(str)) return false;
  if (/^[A-Za-z]{1,3}$/.test(str)) return true;
  if (/^[A-Z0-9._-]+$/.test(str) && str.length <= 4) return true;
  return false;
}
function toLatinDigits(value){
  const map = { '0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9' };
  return String(value || '').replace(/[0-9]/g, (ch) => map[ch] || ch);
}
const I18N_AR_OVERRIDES = {};
try {
  const arMap = I18N_TEXT.ar || {};
  Object.keys(arMap).forEach((key) => {
    const arText = normalizeKey(arMap[key]);
    if (!arText) return;
    I18N_AR_OVERRIDES[arText] = {
      en: (I18N_TEXT.en && I18N_TEXT.en[key]) || '',
      fr: (I18N_TEXT.fr && I18N_TEXT.fr[key]) || ''
    };
  });
} catch {}
const I18N_EN_OVERRIDES = {};
try {
  const enMap = I18N_TEXT.en || {};
  Object.keys(enMap).forEach((key) => {
    const enText = normalizeKey(enMap[key]);
    if (!enText) return;
    I18N_EN_OVERRIDES[enText] = {
      ar: (I18N_TEXT.ar && I18N_TEXT.ar[key]) || '',
      fr: (I18N_TEXT.fr && I18N_TEXT.fr[key]) || ''
    };
  });
} catch {}

const I18N_RUNTIME = {
  loaded: false,
  byAr: {},
  byEn: {},
  pending: new Map(),
  timer: null,
  saveTimer: null,
  inFlight: false,
  nextAllowedAt: 0
};
const RUNTIME_STORAGE_KEY = 'i18n:runtime';
const RUNTIME_MAX_ITEMS = 600;
const RUNTIME_BATCH_MAX = 24;
const RUNTIME_BATCH_DELIM = '|||#|||';
const RUNTIME_QUEUE_DELAY = 700;
const RUNTIME_MIN_INTERVAL = 900;

function loadRuntimeDict(){
  if (I18N_RUNTIME.loaded) return;
  I18N_RUNTIME.loaded = true;
  try {
    const raw = localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (parsed.byAr && typeof parsed.byAr === 'object') I18N_RUNTIME.byAr = parsed.byAr;
      if (parsed.byEn && typeof parsed.byEn === 'object') I18N_RUNTIME.byEn = parsed.byEn;
    }
  } catch {}
}
function pruneRuntimeDict(map){
  try {
    const keys = Object.keys(map || {});
    if (keys.length <= RUNTIME_MAX_ITEMS) return;
    const drop = keys.length - RUNTIME_MAX_ITEMS;
    for (let i = 0; i < drop; i++) delete map[keys[i]];
  } catch {}
}
function scheduleRuntimeSave(){
  if (I18N_RUNTIME.saveTimer) return;
  I18N_RUNTIME.saveTimer = setTimeout(() => {
    I18N_RUNTIME.saveTimer = null;
    try {
      pruneRuntimeDict(I18N_RUNTIME.byAr);
      pruneRuntimeDict(I18N_RUNTIME.byEn);
      const payload = JSON.stringify({ byAr: I18N_RUNTIME.byAr, byEn: I18N_RUNTIME.byEn });
      localStorage.setItem(RUNTIME_STORAGE_KEY, payload);
    } catch {}
  }, 800);
}
function scheduleRuntimeFlush(delay){
  if (I18N_RUNTIME.timer) return;
  const wait = Math.max(0, delay || 0);
  I18N_RUNTIME.timer = setTimeout(() => {
    I18N_RUNTIME.timer = null;
    flushRuntimeTranslations();
  }, wait);
}
function shouldSkipRuntimeTranslation(source, text){
  if (!text || text.length < 2 || text.length > 180) return true;
  if (/https?:\/\//i.test(text) || /www\./i.test(text)) return true;
  if (/^[0-9\s.,:+\-()]+$/.test(text)) return true;
  if (source === 'en' && isShortLatinToken(text)) return true;
  return false;
}
function queueRuntimeTranslation(source, raw, target){
  try {
    if (!raw || !target || source === target) return;
    if (shouldSkipRuntimeTranslation(source, raw)) return;
    const key = `${source}|${target}`;
    let set = I18N_RUNTIME.pending.get(key);
    if (!set) { set = new Set(); I18N_RUNTIME.pending.set(key, set); }
    if (set.has(raw)) return;
    set.add(raw);
    scheduleRuntimeFlush(RUNTIME_QUEUE_DELAY);
  } catch {}
}
async function translateBatch(source, target, list){
  try {
    const joined = list.join(RUNTIME_BATCH_DELIM);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(joined)}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data && data[0] && data[0][0] && data[0][0][0];
    if (!translated || typeof translated !== 'string') return null;
    const parts = translated.split(RUNTIME_BATCH_DELIM);
    if (!parts || !parts.length) return null;
    return parts;
  } catch {
    return null;
  }
}
async function flushRuntimeTranslations(){
  if (I18N_RUNTIME.inFlight) return;
  const now = Date.now();
  if (now < I18N_RUNTIME.nextAllowedAt) {
    scheduleRuntimeFlush(I18N_RUNTIME.nextAllowedAt - now);
    return;
  }
  const entries = Array.from(I18N_RUNTIME.pending.entries());
  if (!entries.length) return;
  let pickedKey = null;
  let pickedSet = null;
  for (const [key, set] of entries) {
    if (set && set.size) { pickedKey = key; pickedSet = set; break; }
    I18N_RUNTIME.pending.delete(key);
  }
  if (!pickedSet) return;
  const [source, target] = pickedKey.split('|');
  const batch = Array.from(pickedSet).slice(0, RUNTIME_BATCH_MAX);
  batch.forEach(item => pickedSet.delete(item));
  if (!pickedSet.size) I18N_RUNTIME.pending.delete(pickedKey);
  I18N_RUNTIME.inFlight = true;
  I18N_RUNTIME.nextAllowedAt = now + RUNTIME_MIN_INTERVAL;
  const translatedParts = await translateBatch(source, target, batch);
  I18N_RUNTIME.inFlight = false;
  if (!translatedParts || translatedParts.length !== batch.length) {
    if (I18N_RUNTIME.pending.size) scheduleRuntimeFlush(RUNTIME_MIN_INTERVAL);
    return;
  }
  const runtimeMap = source === 'ar' ? I18N_RUNTIME.byAr : I18N_RUNTIME.byEn;
  for (let i = 0; i < batch.length; i++) {
    const raw = batch[i];
    const translated = translatedParts[i];
    if (!raw || !translated) continue;
    const entry = runtimeMap[raw] || {};
    entry[target] = translated;
    runtimeMap[raw] = entry;
  }
  try { rebuildPrefixList(); } catch {}
  scheduleRuntimeSave();
  try { setTimeout(() => { applyTranslations(document); }, 0); } catch {}
  if (I18N_RUNTIME.pending.size) scheduleRuntimeFlush(RUNTIME_MIN_INTERVAL);
}

const I18N_DICT_STATE = { loaded: false, prefixesBy: { ar: [], en: [] } };
let i18nDictPromise = null;
function getI18nDictByAr(){
  try { return (window.__I18N_DICT__ && window.__I18N_DICT__.byAr) || {}; } catch { return {}; }
}
function getI18nDictByEn(){
  try { return (window.__I18N_DICT__ && window.__I18N_DICT__.byEn) || {}; } catch { return {}; }
}
function buildPrefixList(dict, overrides, runtime){
  const set = new Set();
  Object.keys(dict || {}).forEach((k) => {
    const key = normalizeKey(k);
    if (key && key.length >= 6) set.add(key);
  });
  Object.keys(overrides || {}).forEach((k) => {
    const key = normalizeKey(k);
    if (key && key.length >= 6) set.add(key);
  });
  Object.keys(runtime || {}).forEach((k) => {
    const key = normalizeKey(k);
    if (key && key.length >= 6) set.add(key);
  });
  return Array.from(set).sort((a, b) => b.length - a.length);
}
function rebuildPrefixList(){
  try {
    loadRuntimeDict();
    I18N_DICT_STATE.prefixesBy = {
      ar: buildPrefixList(getI18nDictByAr(), I18N_AR_OVERRIDES, I18N_RUNTIME.byAr),
      en: buildPrefixList(getI18nDictByEn(), I18N_EN_OVERRIDES, I18N_RUNTIME.byEn)
    };
  } catch {}
}
function ensureI18nDictLoaded(){
  try {
    if (window.__I18N_DICT__ && window.__I18N_DICT__.byAr) {
      I18N_DICT_STATE.loaded = true;
      rebuildPrefixList();
      return Promise.resolve(true);
    }
  } catch {}
  if (i18nDictPromise) return i18nDictPromise;
  i18nDictPromise = new Promise((resolve) => {
    try {
      const s = document.createElement('script');
      s.src = 'i18n-dict.js';
      s.defer = true;
      s.onload = () => { try { I18N_DICT_STATE.loaded = true; rebuildPrefixList(); } catch {} resolve(true); };
      s.onerror = () => resolve(false);
      (document.head || document.documentElement).appendChild(s);
      setTimeout(() => resolve(false), 3000);
    } catch {
      resolve(false);
    }
  });
  return i18nDictPromise;
}
function translateRawText(raw){
  const norm = normalizeKey(raw);
  if (!norm) return null;
  const source = hasArabic(norm) ? 'ar' : (hasLatin(norm) ? 'en' : null);
  if (!source || source === currentLang) return null;
  if (source === 'en' && isShortLatinToken(norm)) return null;
  loadRuntimeDict();
  const overrides = source === 'ar' ? I18N_AR_OVERRIDES : I18N_EN_OVERRIDES;
  const dict = source === 'ar' ? getI18nDictByAr() : getI18nDictByEn();
  const runtime = source === 'ar' ? I18N_RUNTIME.byAr : I18N_RUNTIME.byEn;
  const entry = runtime[norm] || overrides[norm] || dict[norm];
  if (entry && entry[currentLang]) return entry[currentLang];
  const prefixes = (I18N_DICT_STATE.prefixesBy && I18N_DICT_STATE.prefixesBy[source]) || [];
  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i];
    if (!norm.startsWith(prefix)) continue;
    const remainder = norm.slice(prefix.length);
    const remTrim = remainder.replace(/^\s+/, '');
    if (source === 'ar' && remTrim && /^[\u0600-\u06FF]/.test(remTrim)) continue;
    if (source === 'en' && remTrim && /^[A-Za-z]/.test(remTrim)) {
      if (!/^[A-Z0-9()$._\/\-\s]+$/.test(remTrim)) continue;
    }
    const prefixEntry = runtime[prefix] || overrides[prefix] || dict[prefix];
    if (prefixEntry && prefixEntry[currentLang]) {
      const tail = (source === 'ar' && currentLang !== 'ar') ? toLatinDigits(remainder) : remainder;
      return prefixEntry[currentLang] + tail;
    }
  }
  try { queueRuntimeTranslation(source, norm, currentLang); } catch {}
  return null;
}
function translateStringPreserveWhitespace(raw){
  if (raw == null) return raw;
  const str = String(raw);
  if (currentLang === 'ar' && hasArabic(str)) return str;
  if (currentLang === 'en' && hasLatin(str) && !hasArabic(str)) return str;
  const leading = (str.match(/^\s*/) || [''])[0];
  const trailing = (str.match(/\s*$/) || [''])[0];
  const translated = translateRawText(str);
  if (!translated) return str;
  const finalText = currentLang === 'ar' ? translated : toLatinDigits(translated);
  return leading + finalText + trailing;
}
const TEXT_NODE_ORIG = new WeakMap();
const ATTR_ORIG = new WeakMap();
const META_ORIG = new WeakMap();
let docTitleOriginal = null;
let i18nApplying = false;
function getAttrOriginal(el, attr){
  let record = ATTR_ORIG.get(el);
  if (!record) {
    record = {};
    ATTR_ORIG.set(el, record);
  }
  if (!(attr in record)) record[attr] = el.getAttribute(attr) || '';
  return record[attr];
}
function setTranslatedAttr(el, attr){
  try {
    const current = el.getAttribute(attr) || '';
    let raw = getAttrOriginal(el, attr);
    if (current !== raw) {
      const expected = translateStringPreserveWhitespace(raw);
      if (!expected || normalizeKey(expected) !== normalizeKey(current)) {
        const record = ATTR_ORIG.get(el);
        if (record) record[attr] = current;
        raw = current;
      }
    }
    if (!raw) return;
    const translated = translateStringPreserveWhitespace(raw);
    if (translated && el.getAttribute(attr) !== translated) el.setAttribute(attr, translated);
  } catch {}
}
function syncDatasetOriginalTitle(el){
  try {
    if (!el || !el.dataset || !el.dataset.originalTitle) return;
    if (!el.dataset.i18nOriginalTitle) el.dataset.i18nOriginalTitle = el.dataset.originalTitle;
    const raw = el.dataset.i18nOriginalTitle;
    const translated = translateStringPreserveWhitespace(raw);
    if (translated) el.dataset.originalTitle = translated;
  } catch {}
}
function translateTextNode(node){
  try {
    if (!node || node.nodeType !== 3) return;
    const parent = node.parentElement;
    if (parent && parent.closest && parent.closest('[data-i18n-ignore]')) return;
    if (parent && /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName)) return;
    const current = node.nodeValue || '';
    let raw = TEXT_NODE_ORIG.get(node);
    if (raw == null) {
      raw = current; TEXT_NODE_ORIG.set(node, raw);
    } else if (current !== raw) {
      const expected = translateStringPreserveWhitespace(raw);
      if (!expected || normalizeKey(expected) !== normalizeKey(current)) {
        raw = current; TEXT_NODE_ORIG.set(node, raw);
      }
    }
    const translated = translateStringPreserveWhitespace(raw);
    if (translated != null && node.nodeValue !== translated) node.nodeValue = translated;
  } catch {}
}
function applyAutoTranslations(root){
  if (i18nApplying) return;
  i18nApplying = true;
  try {
    const scope = root && root.nodeType ? root : document;
    if (scope.nodeType === 3) {
      translateTextNode(scope);
      return;
    }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        if (!node || !node.parentElement) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest && node.parentElement.closest('[data-i18n-ignore]')) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);

    const elements = scope.querySelectorAll ? scope.querySelectorAll('*') : [];
    if (scope.nodeType === 1) {
      setTranslatedAttr(scope, 'placeholder');
      setTranslatedAttr(scope, 'title');
      setTranslatedAttr(scope, 'aria-label');
      setTranslatedAttr(scope, 'alt');
      setTranslatedAttr(scope, 'data-title');
      setTranslatedAttr(scope, 'data-label');
      if (scope.tagName === 'INPUT') {
        const type = (scope.getAttribute('type') || '').toLowerCase();
        if (type === 'button' || type === 'submit' || type === 'reset') setTranslatedAttr(scope, 'value');
      }
      syncDatasetOriginalTitle(scope);
    }
    elements.forEach((el) => {
      if (el.closest && el.closest('[data-i18n-ignore]')) return;
      setTranslatedAttr(el, 'placeholder');
      setTranslatedAttr(el, 'title');
      setTranslatedAttr(el, 'aria-label');
      setTranslatedAttr(el, 'alt');
      setTranslatedAttr(el, 'data-title');
      setTranslatedAttr(el, 'data-label');
      if (el.tagName === 'INPUT') {
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (type === 'button' || type === 'submit' || type === 'reset') setTranslatedAttr(el, 'value');
      }
      syncDatasetOriginalTitle(el);
    });
  } catch {} finally { i18nApplying = false; }
}
function applyMetaTranslations(){
  try {
    if (docTitleOriginal == null) docTitleOriginal = document.title || '';
    if (docTitleOriginal) {
      const translated = translateStringPreserveWhitespace(docTitleOriginal);
      if (translated != null) document.title = translated;
    }
  } catch {}
  try {
    const metas = document.querySelectorAll('meta[content]');
    metas.forEach((meta) => {
      const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
      if (name === 'og:locale' || name === 'viewport') return;
      const current = meta.getAttribute('content') || '';
      let raw = META_ORIG.get(meta);
      if (raw == null) {
        raw = current; META_ORIG.set(meta, raw);
      } else if (current !== raw) {
        const expected = translateStringPreserveWhitespace(raw);
        if (!expected || normalizeKey(expected) !== normalizeKey(current)) {
          raw = current; META_ORIG.set(meta, raw);
        }
      }
      if (!raw) return;
      const translated = translateStringPreserveWhitespace(raw);
      if (translated && meta.getAttribute('content') !== translated) meta.setAttribute('content', translated);
    });
  } catch {}
}
function watchI18nMutations(){
  if (!window.MutationObserver || window.__I18N_MUTATIONS__) return;
  const observer = new MutationObserver((mutations) => {
    if (i18nApplying) return;
    mutations.forEach((m) => {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => { applyAutoTranslations(node); });
      } else if (m.type === 'characterData') {
        translateTextNode(m.target);
      } else if (m.type === 'attributes') {
        applyAutoTranslations(m.target);
      }
    });
  });
  try {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt', 'data-title', 'data-label', 'value']
    });
    window.__I18N_MUTATIONS__ = observer;
  } catch {}
}
function patchI18nDialogs(){
  try {
    if (window.__I18N_DIALOGS__) return;
    window.__I18N_DIALOGS__ = true;
    if (typeof window.alert === 'function') {
      const nativeAlert = window.alert.bind(window);
      window.alert = (msg) => nativeAlert(translateStringPreserveWhitespace(String(msg || '')));
    }
    if (typeof window.confirm === 'function') {
      const nativeConfirm = window.confirm.bind(window);
      window.confirm = (msg) => nativeConfirm(translateStringPreserveWhitespace(String(msg || '')));
    }
    if (typeof window.prompt === 'function') {
      const nativePrompt = window.prompt.bind(window);
      window.prompt = (msg, def) => nativePrompt(
        translateStringPreserveWhitespace(String(msg || '')),
        translateStringPreserveWhitespace(String(def || ''))
      );
    }
  } catch {}
}
const LANG_KEY = 'site:lang';
const RTL_LANGS = new Set(['ar']);
const langSelects = new Set();
let currentLang = null;

function normalizeLang(lang){
  const key = (lang || '').toString().toLowerCase();
  return I18N_TEXT[key] ? key : 'ar';
}
function readStoredLang(){
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
}
function translateKey(key, fallback){
  if (!key) return fallback || '';
  const dict = I18N_TEXT[currentLang] || I18N_TEXT.ar || {};
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  const rawFallback = (fallback != null) ? fallback : key;
  const rawTranslated = translateRawText(rawFallback);
  return rawTranslated != null ? rawTranslated : rawFallback;
}
function applyTranslations(root){
  try {
    if (root && root.querySelectorAll) {
      root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      if (!el.dataset.i18nFallback) el.dataset.i18nFallback = el.textContent || '';
      const val = translateKey(key, el.dataset.i18nFallback);
      if (val != null) el.textContent = val;
      });
      root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      if (!el.dataset.i18nPlaceholderFallback) el.dataset.i18nPlaceholderFallback = el.getAttribute('placeholder') || '';
      const val = translateKey(key, el.dataset.i18nPlaceholderFallback);
      if (val != null) el.setAttribute('placeholder', val);
      });
      root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      if (!el.dataset.i18nAriaFallback) el.dataset.i18nAriaFallback = el.getAttribute('aria-label') || '';
      const val = translateKey(key, el.dataset.i18nAriaFallback);
      if (val != null) el.setAttribute('aria-label', val);
      });
      root.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      if (!key) return;
      if (!el.dataset.i18nAltFallback) el.dataset.i18nAltFallback = el.getAttribute('alt') || '';
      const val = translateKey(key, el.dataset.i18nAltFallback);
      if (val != null) el.setAttribute('alt', val);
      });
      root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (!key) return;
      if (!el.dataset.i18nTitleFallback) el.dataset.i18nTitleFallback = el.getAttribute('title') || '';
      const val = translateKey(key, el.dataset.i18nTitleFallback);
      if (val != null) el.setAttribute('title', val);
      });
      root.querySelectorAll('[data-i18n-data-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-data-title');
      if (!key) return;
      if (!el.dataset.i18nDataTitleFallback) el.dataset.i18nDataTitleFallback = el.getAttribute('data-title') || '';
      const val = translateKey(key, el.dataset.i18nDataTitleFallback);
      if (val != null) el.setAttribute('data-title', val);
      });
    }
  } catch {}
  try { applyAutoTranslations(root); } catch {}
  try { applyMetaTranslations(); } catch {}
}
function syncLangSelects(){
  langSelects.forEach(select => {
    try { if (select.value !== currentLang) select.value = currentLang; } catch {}
  });
}
function applyLang(lang, opts){
  const next = normalizeLang(lang);
  const prev = currentLang;
  currentLang = next;
  try {
    const root = document.documentElement;
    root.setAttribute('lang', next);
    root.setAttribute('dir', RTL_LANGS.has(next) ? 'rtl' : 'ltr');
    root.setAttribute('data-lang', next);
  } catch {}
  try { if (!(opts && opts.store === false)) localStorage.setItem(LANG_KEY, next); } catch {}
  try {
    const localeMap = { ar: 'ar_AR', en: 'en_US', fr: 'fr_FR' };
    const metaLocale = document.querySelector('meta[property="og:locale"]');
    if (metaLocale) metaLocale.setAttribute('content', localeMap[next] || 'ar_AR');
  } catch {}
  try {
    const autoText = translateKey('home.autoRibbon', next === 'ar' ? '\u062A\u0644\u0642\u0627\u0626\u064A' : 'Auto');
    document.documentElement.style.setProperty('--auto-ribbon-text', `"${autoText}"`);
  } catch {}
  applyTranslations(document);
  try { ensureI18nDictLoaded().then(() => { applyTranslations(document); }); } catch {}
  try { watchI18nMutations(); } catch {}
  syncLangSelects();
  if (!opts || opts.emit !== false) {
    try { window.dispatchEvent(new CustomEvent('language:change', { detail: { lang: next } })); } catch {}
  }
  if (opts && opts.reload && prev !== next) {
    try { location.reload(); } catch { try { location.href = location.href; } catch {} }
  }
}
function setLang(lang){ applyLang(lang, { reload: true }); }
function getLang(){ return currentLang || 'ar'; }

function setupLanguageSelect(select){
  try {
    if (!select) return;
    try { select.setAttribute('data-i18n-ignore','true'); } catch {}
    if (!select.dataset.langReady) {
      if (!select.querySelector('option')) {
        select.innerHTML = `
          <option value="ar">\u0627\u0644\u0639\u0631\u0628\u064A\u0629</option>
          <option value="en">English</option>
          <option value="fr">Fran\u00E7ais</option>
        `;
      }
      select.addEventListener('change', () => { setLang(select.value); });
      select.dataset.langReady = '1';
    }
    langSelects.add(select);
    if (!currentLang) currentLang = normalizeLang(readStoredLang() || 'ar');
    select.value = currentLang;
  } catch {}
}

function attachLanguageSelector(){
  try {
    const ul = document.querySelector('#sidebar ul');
    if (!ul || document.getElementById('langLi')) return;
    const li = document.createElement('li');
    li.id = 'langLi';
    li.style.position = 'relative';
    li.innerHTML = '<i class="fa-solid fa-language"></i><a href="#" data-i18n="nav.language">\u0627\u0644\u0644\u063A\u0629</a>';
    const select = document.createElement('select');
    select.className = 'lang-select lang-select--sidebar';
    select.setAttribute('data-i18n-aria-label', 'nav.language');
    select.style.position = 'absolute';
    select.style.inset = '0 0 0 0';
    select.style.opacity = '0';
    select.style.width = '100%';
    select.style.height = '100%';
    select.style.cursor = 'pointer';
    select.style.appearance = 'none';
    select.style.WebkitAppearance = 'none';
    select.style.MozAppearance = 'none';
    setupLanguageSelect(select);
    li.appendChild(select);
    ul.appendChild(li);
    applyTranslations(li);
  } catch {}
}

(function initI18n(){
  const initial = normalizeLang(readStoredLang() || document.documentElement.getAttribute('lang') || 'ar');
  applyLang(initial, { store: false, emit: false });
  try { patchI18nDialogs(); } catch {}
  try { ensureI18nDictLoaded().then(() => { applyTranslations(document); }); } catch {}
  try { watchI18nMutations(); } catch {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { applyTranslations(document); });
  } else {
    applyTranslations(document);
  }
  window.addEventListener('DOMContentLoaded', attachLanguageSelector);
  try { setTimeout(attachLanguageSelector, 200); setTimeout(attachLanguageSelector, 1000); } catch {}
})();

try { window.__I18N__ = { t: translateKey, setLang, getLang, applyTranslations, setupLanguageSelect }; } catch {}

// Sidebar toggle
function toggleSidebar(){
  const el = document.getElementById('sidebar');
  if (!el) { console.warn('\u0627\u0644\u0634\u0631\u064A\u0637\u0020\u0627\u0644\u062C\u0627\u0646\u0628\u064A\u0020\u063A\u064A\u0631\u0020\u0645\u0648\u062C\u0648\u062F\u0020\u0628\u0639\u062F.'); return; }
  el.classList.toggle('active');
}

const SKIP_HEADER = !!(typeof window !== 'undefined' && window.__SKIP_HEADER__);
// Build header
const header = document.createElement('header');
header.className = 'top-header';

// Hamburger
const hamburger = document.createElement('div');
hamburger.id = 'hamburger';
hamburger.onclick = toggleSidebar;
for (let i=0;i<3;i++){ hamburger.appendChild(document.createElement('span')); }
header.appendChild(hamburger);

// Logo
const logo = document.createElement('img');
logo.src = 'store.gif';
logo.className = 'header-logo';
logo.alt = 'متجر زعيم';
logo.setAttribute('data-i18n-alt', 'brand.name');
logo.setAttribute('fetchpriority','high');
logo.loading = 'eager';
logo.decoding = 'async';
(function(){ try { const href = logo.src; if (href && document.head && !document.querySelector(`link[rel='preload'][as='image'][href='${href}']`)){ const l = document.createElement('link'); l.rel='preload'; l.as='image'; l.href=href; document.head.appendChild(l); } } catch {} })();
const logoLink = document.createElement('a');
logoLink.href = 'index.html';
logoLink.style.marginLeft = '0';
logoLink.style.marginRight = 'auto';
logoLink.className = 'header-logo-link';
logoLink.setAttribute('aria-label','\u0627\u0644\u0639\u0648\u062F\u0629\u0020\u0625\u0644\u0649\u0020\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629');
logoLink.setAttribute('data-i18n-aria-label', 'brand.home');
logoLink.style.marginLeft = '';
logoLink.style.marginRight = '';
logoLink.appendChild(logo);

// Balance display with deposit shortcut
if (!document.getElementById('header-balance-style')) {
  try {
    const style = document.createElement('style');
    style.id = 'header-balance-style';
    style.textContent = `
      .header-balance {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        direction: rtl;
        color: #e2e8f0;
        letter-spacing: 0.15px;
        padding: 0;
        margin: 0;
      }
      .header-balance__metrics {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        direction: ltr;
      }
      .header-balance__currency {
        font-size: 12px;
        font-weight: 700;
        color: rgba(148, 163, 184, 0.82);
        letter-spacing: 0.3px;
        text-transform: uppercase;
        direction: ltr;
        unicode-bidi: plaintext;
      }
      .header-balance__value {
        direction: ltr;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.45px;
        background: linear-gradient(90deg, #fef3c7 0%, #fefce8 30%, #c084fc 65%, #38bdf8 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-feature-settings: 'tnum' 1, 'kern' 1;
        text-shadow: 0 8px 20px rgba(56, 189, 248, 0.22);
      }
      @media (max-width: 600px) {
        .header-balance__metrics {
          gap: 3px;
        }
        .header-balance__currency {
          font-size: 10px;
        }
        .header-balance__value {
          font-size: 17px;
          letter-spacing: 0.35px;
        }
      }
`;
    (document.head || document.documentElement).appendChild(style);
  } catch {}
}
const balanceSpan = document.createElement('span');
balanceSpan.id = 'balanceHeader';
balanceSpan.className = 'header-balance';
balanceSpan.style.marginRight = '0px';
balanceSpan.style.flex = '0 0 auto';
balanceSpan.style.padding = '0';
balanceSpan.style.minWidth = '0';
balanceSpan.innerHTML = `
  <span class="header-balance__metrics">
    <span class="header-balance__currency" id="headerBalanceCurrency">—</span>
    <span class="header-balance__value" id="headerBalanceText">…</span>
  </span>
`;


const leftContainer = document.createElement('div');
leftContainer.className = 'header-left';
leftContainer.style.display = 'flex';
leftContainer.style.alignItems = 'center';
leftContainer.style.gap = '10px';
leftContainer.appendChild(hamburger);
leftContainer.appendChild(balanceSpan);

header.appendChild(leftContainer);
header.appendChild(logoLink);

// Balance helpers
let unsubscribeBalance = null;
let bannedSessionHandled = false;
const BAL_KEY = (uid) => `balance:cache:${uid}`;
const LAST_UID_KEY = 'auth:lastUid';
const LAST_LOGGED_KEY = 'auth:lastLoggedIn';
function setHeaderBalance(text){
  const valueEl = document.getElementById('headerBalanceText') || balanceSpan.querySelector('#headerBalanceText');
  const currencyEl = document.getElementById('headerBalanceCurrency') || balanceSpan.querySelector('#headerBalanceCurrency');
  if (!valueEl) return;
  if (typeof text !== 'string') {
    valueEl.textContent = text;
    if (currencyEl) currencyEl.textContent = '—';
    return;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    valueEl.textContent = '—';
    if (currencyEl) currencyEl.textContent = '—';
    return;
  }
  const hasDigits = /[0-90-9]/.test(trimmed);
  if (!hasDigits) {
    valueEl.textContent = trimmed;
    if (currencyEl) currencyEl.textContent = '—';
    return;
  }
  const shouldSplit = /\s/.test(trimmed) || /[^\d.,+\-]/.test(trimmed.slice(-1));
  if (shouldSplit) {
    const match = trimmed.match(/^(.*\S)\s+(\S+)$/);
    if (match) {
      valueEl.textContent = match[1].trim();
      if (currencyEl) currencyEl.textContent = match[2] || '—';
      return;
    }
  }
  valueEl.textContent = trimmed;
  if (currencyEl) currencyEl.textContent = '—';
}
function readCachedBalance(uid){ try { const s = localStorage.getItem(BAL_KEY(uid)); if (s == null) return null; const n = Number(s); return Number.isFinite(n) ? n : null; } catch { return null; } }
function writeCachedBalance(uid, val){ try { localStorage.setItem(BAL_KEY(uid), String(val)); } catch {} }
function broadcastBalance(value){
  try { window.__BALANCE__ = value; window.__BAL_BASE__ = value; } catch {}
  try {
    const formatted = (typeof window.formatCurrencyFromJOD === 'function')
      ? window.formatCurrencyFromJOD(value)
      : (Number(value || 0).toFixed(2) + ' $');
    window.dispatchEvent(new CustomEvent('balance:change', { detail: { value: Number(value || 0), formatted } }));
  } catch {}
}
function seedHeaderFromCache(){
  try {
    const logged = localStorage.getItem(LAST_LOGGED_KEY) === '1';
    const uid = localStorage.getItem(LAST_UID_KEY);
    if (logged && uid){
      const cached = readCachedBalance(uid);
      if (cached != null){
        try { window.__BAL_BASE__ = cached; } catch {}
        const text = (typeof window.formatCurrencyFromJOD === 'function')
          ? window.formatCurrencyFromJOD(cached)
          : (Number(cached).toFixed(2) + ' $');
        setHeaderBalance(text);
        broadcastBalance(cached);
      }
    } else { setHeaderBalance('0.00 $'); }
  } catch {}
}
seedHeaderFromCache();

// Gracefully block banned accounts across the site
function showBannedOverlay(){
  try {
    let overlay = document.getElementById('ban-block-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ban-block-overlay';
    overlay.setAttribute('role','alertdialog');
    overlay.setAttribute('aria-label','\u062A\u0645\u0020\u062D\u0638\u0631\u0020\u0627\u0644\u062D\u0633\u0627\u0628');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '18px';
    overlay.style.background = 'rgba(5,8,20,0.68)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.zIndex = '15000';
    const card = document.createElement('div');
    card.style.maxWidth = '480px';
    card.style.width = '100%';
    card.style.background = 'linear-gradient(145deg,#0f172a,#111827)';
    card.style.color = '#f8fafc';
    card.style.borderRadius = '18px';
    card.style.padding = '22px';
    card.style.boxShadow = '0 24px 70px rgba(0,0,0,0.45)';
    card.style.border = '1px solid rgba(148,163,184,0.25)';
    card.innerHTML = `
      <h2 style="margin:0 0 12px;font-size:1.2rem;">\uD83D\uDEAB \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062D\u0638\u0648\u0631</h2>
      <p style="margin:0 0 18px;line-height:1.7;font-size:1rem;">\u062A\u0645 \u062D\u0638\u0631 \u062D\u0633\u0627\u0628\u0643 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645. \u064A\u064F\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645 \u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0639\u062A\u0642\u062F \u0623\u0646 \u0647\u0630\u0627 \u062E\u0637\u0623.</p>
      <button id="banLogoutBtn" type="button" style="width:100%;padding:12px 14px;border-radius:12px;border:none;background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;font-weight:800;font-size:1rem;cursor:pointer;">\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C</button>
    `;
    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  } catch { return null; }
}
function handleBannedAccount(){
  if (bannedSessionHandled) return;
  bannedSessionHandled = true;
  clearSessionDocWatcher();
  if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch {} unsubscribeBalance = null; }
  const overlay = showBannedOverlay();
  const logoutBtn = overlay ? overlay.querySelector('#banLogoutBtn') : null;
  let logoutTriggered = false;
  const forceLogout = () => {
    if (logoutTriggered) return;
    logoutTriggered = true;
    try { localStorage.removeItem('sessionKeyInfo'); } catch {}
    try { firebase.auth().signOut().catch(()=>{}); } catch {}
    try {
      const path = (location.pathname || '').toLowerCase();
      if (path.includes('login')) { window.location.reload(); }
      else { window.location.href = 'login.html?banned=1'; }
    } catch { window.location.href = 'login.html?banned=1'; }
  };
  if (logoutBtn) logoutBtn.addEventListener('click', forceLogout);
  setTimeout(forceLogout, 800);
}

// Update header balance text when currency changes
try {
  window.addEventListener('currency:change', function(){
    try {
      const base = (typeof window.__BAL_BASE__ !== 'undefined') ? window.__BAL_BASE__ : null;
      if (base == null || !Number.isFinite(Number(base))) return;
      const text = (typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(base) : (Number(base).toFixed(2) + ' $');
      setHeaderBalance(text);
    } catch {}
  });
} catch {}

// Navigate helper
function navigateTo(href){
  try { sessionStorage.setItem('nav:fromHome','1'); } catch {}
  toggleSidebar();
  let targetKey = href;
  let currentKey = location.pathname + location.search + location.hash;
  try {
    const targetUrl = new URL(href, location.href);
    targetKey = targetUrl.pathname + targetUrl.search + targetUrl.hash;
  } catch {}
  if (targetKey === currentKey){
    try {
      sessionStorage.removeItem('nav:loader:expected');
      sessionStorage.removeItem('nav:loader:showAt');
    } catch {}
    hidePageLoader();
    return;
  }
  showPageLoader();
  setTimeout(()=>{ window.location.href = href; }, 150);
}

function navigateHomeHash(targetHash, routeKey){
  const file = (location.pathname.split('/').pop() || '').toLowerCase();
  const isHome = file === '' || file === 'index.html';
  try { sessionStorage.setItem('nav:fromHome','1'); } catch {}
  if (isHome) {
    const already = (location.hash || '') === targetHash;
    toggleSidebar();
    if (already){
      try {
        sessionStorage.removeItem('nav:loader:expected');
        sessionStorage.removeItem('nav:loader:showAt');
      } catch {}
      try { hidePageLoader(); } catch {}
      const key = routeKey || (targetHash || '').replace(/^#\//,'');
      if (key && typeof window.__reloadInlineRoute === 'function'){
        try { window.__INLINE_FORCE_ROUTE__ = key; } catch {}
        try { window.__reloadInlineRoute(key); } catch {}
      } else if (key){
        try { window.__INLINE_FORCE_ROUTE__ = null; } catch {}
      }
      return;
    }
    try { showPageLoader(); } catch {}
    setTimeout(() => { window.location.hash = targetHash; }, 80);
  } else {
    navigateTo('index.html' + targetHash);
  }
}
//
// Sidebar
const sidebar = document.createElement('nav');
sidebar.id = 'sidebar';

// Add CSS for scrolling
sidebar.style.overflowY = 'auto'; // Enable vertical scrolling
sidebar.style.overflowX = 'hidden'; // Prevent horizontal scrolling
sidebar.style.maxHeight = '100vh'; // Full viewport height

const ul = document.createElement('ul');
// الرئيسية
const homeLi = document.createElement('li');
homeLi.onclick = () => navigateTo('index.html');
homeLi.innerHTML = '<i class="fas fa-home"></i><a href="#" data-i18n="nav.home">\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629</a>';
ul.appendChild(homeLi);
// الرئيسية
const depositLi = document.createElement('li');
depositLi.id = 'depositBtn';
depositLi.innerHTML = '<i class="fa-solid fa-circle-dollar-to-slot"></i><a href="#" data-i18n="nav.deposit">\u0627\u0644\u0625\u064A\u062F\u0627\u0639</a>';
depositLi.onclick = () => navigateTo('edaa.html');
depositLi.style.display = 'none';
ul.appendChild(depositLi);
// الرئيسية
const ordersLi = document.createElement('li');
ordersLi.onclick = () => navigateTo('talabat.html');
ordersLi.innerHTML = '<i class="fas fa-list"></i><a href="#" data-i18n="nav.orders">\u0637\u0644\u0628\u0627\u062A\u064A</a>';
ul.appendChild(ordersLi);
// الرئيسية
const walletLi = document.createElement('li');
walletLi.id = 'walletBtn';
walletLi.innerHTML = '<i class="fas fa-wallet"></i><a href="#" data-i18n="nav.wallet">\u0627\u0644\u0645\u062D\u0641\u0638\u0629</a>';
walletLi.onclick = () => navigateHomeHash('#/wallet','wallet');
walletLi.style.display = 'none';
ul.appendChild(walletLi);
// تحويل الرصيد
const transferLi = document.createElement('li');
transferLi.id = 'transferBtn';
transferLi.innerHTML = '<i class="fa-solid fa-right-left"></i><a href="#" data-i18n="nav.transfer">\u062A\u062D\u0648\u064A\u0644\u0020\u0627\u0644\u0631\u0635\u064A\u062F</a>';
transferLi.onclick = () => navigateHomeHash('#/transfer','transfer');
transferLi.style.display = 'none';
ul.appendChild(transferLi);
// الرئيسية
const reviewsLi = document.createElement('li');
reviewsLi.innerHTML = '<i class="fa-solid fa-star"></i><a href="#" data-i18n="nav.reviews">\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A</a>';
reviewsLi.onclick = () => navigateHomeHash('#/reviews','reviews');
ul.appendChild(reviewsLi);
// الرئيسية
const settingsLi = document.createElement('li');
settingsLi.id = 'settingsBtn';
settingsLi.innerHTML = '<i class="fa-solid fa-gear"></i><a href="#" data-i18n="nav.settings">\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A</a>';
settingsLi.onclick = () => navigateHomeHash('#/settings','settings');
settingsLi.style.display = 'none';
ul.appendChild(settingsLi);
// API docs
const apiLi = document.createElement('li');
apiLi.innerHTML = '<i class="fa-solid fa-code"></i><a href="#" data-i18n="nav.api">API</a>';
apiLi.onclick = () => navigateTo('api.html');
ul.appendChild(apiLi);
// تسجيل الدخول / الخروج
const loginLi = document.createElement('li');
loginLi.id = 'loginSidebarBtn';
loginLi.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><a href="#" data-i18n="nav.login">\u062A\u0633\u062C\u064A\u0644\u0020\u0627\u0644\u062F\u062E\u0648\u0644</a>';
loginLi.onclick = () => navigateTo('login.html');
ul.appendChild(loginLi);
const logoutLi = document.createElement('li');
logoutLi.id = 'logoutBtn';
logoutLi.style.display = 'none';
logoutLi.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i><a href="#" data-i18n="nav.logout">\u062A\u0633\u062C\u064A\u0644\u0020\u0627\u0644\u062E\u0631\u0648\u062C</a>';
logoutLi.onclick = () => {
  try { showPageLoader(); } catch {}
  try {
    firebase.auth().signOut().catch(()=>{}).finally(()=>{
      try { sessionStorage.setItem('nav:fromHome','1'); } catch {}
      window.location.href = 'index.html';
    });
  } catch {
    try { window.location.href = 'index.html'; } catch {}
  }
};
ul.appendChild(logoutLi);
sidebar.appendChild(ul);

// Attach to containers
window.addEventListener('DOMContentLoaded', () => {
  if (SKIP_HEADER) {
    try { if (window.__I18N__ && typeof window.__I18N__.applyTranslations === 'function') window.__I18N__.applyTranslations(document); } catch {}
    return;
  }
  const hc = document.getElementById('headerContainer'); if (hc) hc.appendChild(header);
  const sc = document.getElementById('sidebarContainer'); if (sc) sc.appendChild(sidebar);
  document.addEventListener('click', (e)=>{ const a = e.target.closest ? e.target.closest('a[href$=".html"]') : null; if (a) { try { sessionStorage.setItem('nav:fromHome','1'); } catch {} } });
  // Ensure support anchor exists for sidebar link
  try { const sec = document.querySelector('section.support-section'); if (sec && !sec.id) sec.id = 'support'; } catch {}
  try { if (window.__I18N__ && typeof window.__I18N__.applyTranslations === 'function') window.__I18N__.applyTranslations(document); } catch {}
});

// Firebase auth + balance live update
async function ensureFirebaseCompat(){
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) return true;
  return new Promise(resolve => {
    try {
      const add = (src)=>{ const s=document.createElement('script'); s.src=src; s.defer=true; s.onload=check; document.head.appendChild(s); };
      function check(){ if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) resolve(true); }
      add('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      add('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      add('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      setTimeout(()=>resolve(false), 4000);
    } catch { resolve(false); }
  });
}
async function initFirebaseApp(){
  try {
    const ok = await ensureFirebaseCompat();
    if (!ok || typeof firebase === 'undefined') return false;
    if (!firebase.apps || !firebase.apps.length){
      try {
        firebase.initializeApp({
          apiKey:"AIzaSyBRVEViuKnCUZqBoD0liuA-P0DVN7mTePA",
          authDomain:"z3em-d9b11.firebaseapp.com",
          projectId:"z3em-d9b11",
          storageBucket:"z3em-d9b11.firebasestorage.app",
          messagingSenderId:"236716520945",
          appId:"1:236716520945:web:a0c336db7dc7079c190050",
          measurementId:"G-1GG6DE12K6"
        });
      } catch {}
    }
    try { window.dispatchEvent(new Event('firebase:ready')); } catch {}
    return true;
  } catch { return false; }
}
try {
  (async ()=>{
    const ok = await initFirebaseApp();
    if (!ok || typeof firebase === 'undefined' || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(user => {
    clearSessionDocWatcher();
    sessionConflictHandled = false;
    bannedSessionHandled = false;
    if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch (err) { console.warn('unsubscribeBalance error:', err); } unsubscribeBalance = null; }
    const loginBtn = document.getElementById('loginSidebarBtn');
    const depositBtn = document.getElementById('depositBtn');
    const walletBtn = document.getElementById('walletBtn');
    const transferBtn = document.getElementById('transferBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (user) {
      watchSessionDocForDevice(user);
      try { localStorage.setItem(LAST_UID_KEY, user.uid); } catch {}
      try { localStorage.setItem(LAST_LOGGED_KEY, '1'); } catch {}
      if (loginBtn) loginBtn.style.display = 'none';
      if (depositBtn) depositBtn.style.display = 'flex';
      if (walletBtn) walletBtn.style.display = 'flex';
      if (transferBtn) transferBtn.style.display = 'flex';
      if (settingsBtn) settingsBtn.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'flex';
      const cached = readCachedBalance(user.uid); if (cached != null) { try { window.__BAL_BASE__ = cached; } catch {}; setHeaderBalance((typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(cached) : (Number(cached).toFixed(2) + ' $')); broadcastBalance(cached); }
      const docRef = firebase.firestore().collection('users').doc(user.uid);
      unsubscribeBalance = docRef.onSnapshot(snap => {
        if (snap.exists) {
          const data = snap.data() || {};
          if (data.isBanned === true) { handleBannedAccount(); return; }
          const raw = data.balance ?? 0; const num = Number(raw); const val = Number.isFinite(num) ? num : 0;
          try { window.__BAL_BASE__ = val; } catch {}
          setHeaderBalance((typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(val) : (Number(val).toFixed(2) + ' $'));
          writeCachedBalance(user.uid, val); broadcastBalance(val);
        } else { try { window.__BAL_BASE__ = 0; } catch {}; setHeaderBalance((typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(0) : '0.00 $'); writeCachedBalance(user.uid, 0); broadcastBalance(0); }
      }, err => { console.error('Balance listener error:', err); setHeaderBalance('تعذر التحميل'); });
    } else {
      setHeaderBalance('0.00 $');
      try { localStorage.setItem(LAST_LOGGED_KEY, '0'); } catch {}
      try { localStorage.removeItem(LAST_UID_KEY); } catch {}
      if (loginBtn) loginBtn.style.display = 'flex';
      if (depositBtn) depositBtn.style.display = 'none';
      if (walletBtn) walletBtn.style.display = 'none';
      if (transferBtn) transferBtn.style.display = 'none';
      if (settingsBtn) settingsBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      broadcastBalance(null);
    }
    });
  })();
} catch {}

window.addEventListener('beforeunload', () => { if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch {} } });

// Optional: mobile bottom dock (not auto-run)
function initMobileDock(){
  try {
    try { const hasFA = !!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"], link[href*="/fa"], link[href*="/all.min.css"]'); if (!hasFA) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'; l.crossOrigin = 'anonymous'; document.head.appendChild(l); } } catch {}
    const dock = document.createElement('nav'); dock.className = 'mobile-dock'; dock.setAttribute('aria-label','الشريط السفلي للجوال');
    const makeItem = (html, key, href) => { if (href) { const a = document.createElement('a'); a.href = href; a.innerHTML = html; a.className = 'dock-item'; a.dataset.key = key; return a; } else { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = html; b.className = 'dock-item'; b.dataset.key = key; return b; } };
    const wallet = makeItem('<i class="fa-solid fa-wallet" aria-hidden="true"></i>', 'wallet', 'index.html#/wallet'); wallet.setAttribute('aria-label','محفظتي');
    const store  = makeItem('<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>', 'store', 'index.html#/games'); store.setAttribute('aria-label','المتجر/الألعاب');
    const orders = makeItem('<i class="fa-solid fa-list" aria-hidden="true"></i>', 'orders', 'talabat.html'); orders.setAttribute('aria-label','طلباتي');
    const deposit= makeItem('<i class="fa-solid fa-circle-dollar-to-slot" aria-hidden="true"></i>', 'deposit', 'edaa.html'); deposit.setAttribute('aria-label','شحن الرصيد');
    const home   = makeItem('<i class="fa-solid fa-house" aria-hidden="true"></i>', 'home', 'index.html'); home.setAttribute('aria-label','الرئيسية');
    dock.appendChild(wallet); dock.appendChild(store); dock.appendChild(orders); dock.appendChild(deposit); dock.appendChild(home);
    window.addEventListener('DOMContentLoaded', () => { try { document.body.appendChild(dock); document.body.classList.add('mobile-has-dock'); } catch {} });
    wallet.addEventListener('click', () => { try { sessionStorage.setItem('nav:fromHome','1'); showPageLoader(); } catch {} });
    function updateActive(){
      try {
        const file = (location.pathname.split('/').pop() || '').toLowerCase();
        const hash = (location.hash || '').toLowerCase();
        const storePages = new Set(['games.html','freefire.html','freefireauto.html','freefiremembership.html','freefireinbut.html','freefiren.html','pubg.html','weplay.html','bloodstrike.html','roblox.html','jawaker.html','yala.html','8ball.html','mobaileg.html','instainbut.html']);
        let key = 'home';
        if (hash === '#/wallet') key = 'wallet';
        else if (hash === '#/reviews') key = 'home';
        else if (file === 'wallet.html') key = 'wallet';
        else if (hash === '#/games' || hash === '#/social' || hash === '#/software') key = 'store';
        else if (file === 'index.html') key = 'home';
        else if (file === 'talabat.html') key = 'orders';
        else if (file === 'edaa.html') key = 'deposit';
        else if (storePages.has(file)) key = 'store';
        dock.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
        if (key){
          const a = dock.querySelector(`.dock-item[data-key="${key}"]`);
          if (a) a.classList.add('active');
        }
      } catch {}
    }
    window.addEventListener('DOMContentLoaded', updateActive); window.addEventListener('pageshow', updateActive);
  } catch {}
}

// Page balance box wiring
function wirePageBalanceBox(){
  function setBox(val){
    try {
      const el = document.getElementById('balanceAmount');
      if (!el) return;
      if (val == null || !Number.isFinite(Number(val))) {
        el.textContent = 'يجب تسجيل الدخول اولا';
      } else {
        if (typeof window.formatCurrencyFromJOD === 'function') el.textContent = window.formatCurrencyFromJOD(val);
        else el.textContent = Number(val).toFixed(2) + ' $';
      }
    } catch {}
  }
  try {
    const logged = localStorage.getItem('auth:lastLoggedIn') === '1';
    const uid = localStorage.getItem('auth:lastUid');
    if (logged && uid){
      const cached = (function(){ try { const s = localStorage.getItem('balance:cache:' + uid); const n = Number(s); return Number.isFinite(n) ? n : null; } catch { return null; } })();
      if (cached != null) setBox(cached);
    }
  } catch {}
  try { window.addEventListener('balance:change', ev => { setBox(ev?.detail?.value ?? null); }); } catch {}
  try { window.addEventListener('currency:change', () => { try { setBox(window.__BAL_BASE__ ?? null); } catch {} }); } catch {}
}

// Support/contact section (basic skeleton; links overridden below)
(function(){
  try {

    const section = document.createElement('section'); section.className = 'support-section'; section.id = 'support';
    const title = document.createElement('h2'); title.className = 'support-title'; title.textContent = '\u0637\u0631\u0642\u0020\u0627\u0644\u062A\u0648\u0627\u0635\u0644'; title.setAttribute('data-i18n', 'support.title'); section.appendChild(title);
    const iconsDiv = document.createElement('div'); iconsDiv.className = 'support-icons';
    const contacts = [
      { href: '', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', class: 'whatsapp' },
      { href: '', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg', class: 'telegram' },
      { href: '', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg', class: 'facebook' },
      { href: '', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gmail_Icon.png', class: 'email' },
      { href: '', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png', class: 'instagram' },
    ];
    contacts.forEach(c => {
      const a = document.createElement('a');
      a.href = c.href;
      a.target = '_blank';
      a.className = 'support-icon ' + c.class;
      const img = document.createElement('img');
      img.src = c.iconURL;
      img.alt = c.class + ' icon';
      img.style.width = '32px';
      img.style.height = '32px';
      a.appendChild(img);
      iconsDiv.appendChild(a);
    });
    section.appendChild(iconsDiv);
    const host = document.getElementById('sidebar') || document.body;
    host.appendChild(section);

    function moveToSidebar(){
      try{
        const sidebarHost = document.getElementById('sidebar');
        if (sidebarHost && section.parentElement !== sidebarHost){
          sidebarHost.appendChild(section);
        }
      } catch(_){}
    }
    moveToSidebar();
    const schedule = [0, 150, 500, 1200];
    schedule.forEach((ms) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(moveToSidebar, ms), { once: ms===schedule[schedule.length-1] });
      } else {
        setTimeout(moveToSidebar, ms);
      }
    });

    const style = document.createElement('style');
    style.textContent = `
      #sidebar .support-section {
        background: transparent !important;
        padding: 14px 14px 8px !important;
        border: none !important;
        box-shadow: none !important;
      }
      #sidebar .support-section .support-title {
        color: #e6edff;
        font-size: 1rem;
        margin: 0 0 10px;
      }
      #sidebar .support-section .support-icons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
      }
      #sidebar .support-section .support-icon {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        position: relative;
      }
      #sidebar .support-section .support-icon img {
        width: 32px !important;
        height: 32px !important;
        filter: none !important;
      }
      #sidebar .support-section .support-icon:hover {
        transform: none;
        box-shadow: none;
      }
      #sidebar .support-section .support-rights {
        margin-top: 12px !important;
        color: #e6edff;
        font-size: 11px;
        text-align: center;
      }
      #sidebar .support-section .support-rights a {
        color: #fff !important;
        text-decoration: none;
      }
    `;
    document.head.appendChild(style);
    try { applyTranslations(section); } catch {}
  } catch {}
})();

// Override support/contact links to the latest provided ones
(function(){
  try{
    var links = {
      whatsapp: 'https://wa.me/963981983751',
      telegram: 'https://t.me/963969898534',
      instagram: 'https://www.instagram.com/z3.i.m?igsh=MXRwZGl6dXh2YTd2Zg==',
      facebook: 'https://www.facebook.com/share/1B1b48AcqV/',
      email: 'mailto:hazemediek@gmail.com'
    };

    function applySupportLinks(){
      var defs = [
        { key: 'whatsapp', sels: ['a.support-icon.whatsapp','i.fa-whatsapp'] },
        { key: 'telegram', sels: ['a.support-icon.telegram','i.fa-telegram','i.fa-telegram-plane','i.fa-paper-plane'] },
        { key: 'instagram', sels: ['a.support-icon.instagram','i.fa-instagram'] },
        { key: 'facebook', sels: ['a.support-icon.facebook','i.fa-facebook','i.fa-facebook-f'] },
        { key: 'email', sels: ['a.support-icon.email','i.fa-envelope','a[href^="mailto:"]'] }
      ];

      function ensureAnchor(el){
        if (!el) return null;
        if (el.tagName === 'A') return el;
        try{ return el.closest('a'); }catch(_){ return null; }
      }

      defs.forEach(function(d){
        try{
          var href = links[d.key];
          var finalSelector = d.sels.join(',');
          if (!href) {
            document.querySelectorAll(finalSelector).forEach(function(el){
              var a = ensureAnchor(el);
              if (a) a.remove();
            });
            return;
          }
          document.querySelectorAll(finalSelector).forEach(function(el){
            var a = ensureAnchor(el);
            if(!a) return;
            if (d.key === 'telegram') {
              var appHref = (function(){
                try {
                  var handle = href.replace(/^https?:\/\/t\.me\//i,'').replace(/^@/,'').replace(/\/.*/, '');
                  return handle ? ('tg://resolve?domain=' + handle) : href;
                } catch(_){ return href; }
              })();
              a.setAttribute('href', href); // web fallback
              a.setAttribute('data-app-href', appHref);
              a.setAttribute('target','_blank');
              a.setAttribute('rel','noopener noreferrer');
              a.addEventListener('click', function(ev){
                try{
                  ev.preventDefault();
                  var start = Date.now();
                  window.location.href = appHref;
                  setTimeout(function(){ if (Date.now() - start < 1500) { window.open(href, '_blank', 'noopener,noreferrer'); } }, 600);
                }catch(_){ try { window.open(href, '_blank', 'noopener,noreferrer'); } catch(__){} }
              }, { once: true });
            } else {
              a.setAttribute('href', href);
              a.setAttribute('target','_blank');
              a.setAttribute('rel','noopener noreferrer');
            }
          });
        }catch(_){ }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ applySupportLinks(); setTimeout(applySupportLinks, 200); setTimeout(applySupportLinks, 1000); });
    } else { applySupportLinks(); setTimeout(applySupportLinks, 200); setTimeout(applySupportLinks, 1000); }
  }catch(_){ }
})();

(function ensureSupportDevCredit(){
  try{
    var CREDIT = {
      href: 'https://wa.me/962790108559', 
      label: '\uD83D\uDD17\u0020\u062A\u0645\u0020\u062A\u0637\u0648\u064A\u0631\u0020\u0627\u0644\u0645\u0646\u0635\u0629\u0020\u0628\u0648\u0627\u0633\u0637\u0629\u0020LaithDev.',
      tagline: ''
    };

    // Add style to limit clickable area
    const creditStyle = document.createElement('style');
    creditStyle.textContent = `
      .support-icons { position: relative; }
      .support-rights {
      pointer-events: none; /* Disable clicks on container */
      }
      .support-rights a {
      pointer-events: auto; /* Re-enable clicks just on link */
      display: inline-block; /* Contains the clickable area */
      padding: 5px 10px; /* Add some padding for better touch target */
      }
      .support-icon.whatsapp-alt {
        position: relative;
      }
      .support-icon.whatsapp-alt .support-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: #ef4444;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(creditStyle);

    function applyCredit(){
      try{
        var section = document.querySelector('section.support-section');
        if (!section) return;

        var rights = section.querySelector('.support-rights');
        if (!rights){
          rights = document.createElement('div');
          rights.className = 'support-rights';
          // Add link-like styling
          rights.style.textAlign = 'center';
          rights.style.marginTop = '15px';
          section.appendChild(rights);
        }

        var anchor = rights.querySelector('a');
        if (!anchor){
          anchor = document.createElement('a');
          // Add link styling
          anchor.style.color = '#3b82f6'; // Blue color
          anchor.style.textDecoration = 'none';
          anchor.style.transition = 'all 0.2s';
          
          // Hover effect
          anchor.addEventListener('mouseover', () => {
            anchor.style.color = '#2563eb';
            anchor.style.textDecoration = 'underline';
          });
          anchor.addEventListener('mouseout', () => {
            anchor.style.color = '#3b82f6';
            anchor.style.textDecoration = 'none';
          });

          if (rights.firstChild){
            rights.insertBefore(anchor, rights.firstChild);
          } else {
            rights.appendChild(anchor);
          }
        }
        anchor.href = CREDIT.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.setAttribute('data-i18n', 'support.credit');
        anchor.textContent = CREDIT.label;

        var tagline = rights.querySelector('p');
        if (!tagline){
          tagline = document.createElement('p');
          rights.appendChild(tagline);
        }
        tagline.textContent = CREDIT.tagline;
        try { applyTranslations(rights); } catch {}
      }catch(_){ }
    }

    function schedule(){
      applyCredit();
      setTimeout(applyCredit, 200);
      setTimeout(applyCredit, 1000);
    }

    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', schedule);
    } else {
      schedule();
    }
  }catch(_){ }
})();
