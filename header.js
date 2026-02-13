// Deobfuscated and cleaned header logic

// ألغينا حد إعادة تحميل Firebase؛ أعِد الوظائف الأصلية إن وُجدت
(function(){
  try {
    if (typeof SKIP_HEADER !== 'undefined' && SKIP_HEADER) return;
    if (typeof firebase !== 'undefined' && window.__ORIG_FIREBASE__) {
      if (window.__ORIG_FIREBASE__.auth) {
        firebase.auth = window.__ORIG_FIREBASE__.auth;
      }
      if (window.__ORIG_FIREBASE__.firestore) {
        firebase.firestore = window.__ORIG_FIREBASE__.firestore;
      }
    }
  } catch {}
  try {
    if (typeof window.__FIREBASE_ENV_OK__ === 'boolean') {
      window.__SKIP_FIREBASE__ = !window.__FIREBASE_ENV_OK__;
    }
  } catch {}
})();

// Realtime Firestore toggle (to reduce "channel?VER=8" requests)
function shouldEnableRealtime(feature){
  try { if (window.__DISABLE_FIREBASE_REALTIME__ === true) return false; } catch {}
  try {
    const cfg = window.__FIREBASE_REALTIME__;
    if (cfg === true) return true;
    if (cfg && typeof cfg === 'object') {
      if (cfg.all === true) return true;
      if (feature && Object.prototype.hasOwnProperty.call(cfg, feature)) return !!cfg[feature];
    }
  } catch {}
  try {
    const perKey = feature ? ('FIREBASE_REALTIME_' + String(feature).toUpperCase()) : '';
    const perVal = perKey ? localStorage.getItem(perKey) : null;
    if (perVal === '1' || perVal === 'true') return true;
    if (perVal === '0' || perVal === 'false') return false;
    const v = localStorage.getItem('FIREBASE_REALTIME');
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  } catch {}
  return false;
}

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

// Sync theme across all pages (light/dark + body classes + meta)
(function(){
  function normalizeTheme(value){
    const t = String(value || '').toLowerCase().trim();
    return (t === 'light' || t === 'dark') ? t : '';
  }
  function readTheme(){
    let t = '';
    try { t = normalizeTheme(document.documentElement.getAttribute('data-theme')); } catch {}
    if (!t) {
      try { t = normalizeTheme(localStorage.getItem('theme')); } catch {}
    }
    return t || 'light';
  }
  function ensureMeta(name){
    try {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head && document.head.appendChild(meta);
      }
      return meta;
    } catch {
      return null;
    }
  }
  function applyTheme(theme){
    const t = normalizeTheme(theme) || 'light';
    try { document.documentElement.setAttribute('data-theme', t); } catch {}
    try {
      if (document.body) {
        document.body.classList.toggle('dark-mode', t === 'dark');
        document.body.classList.toggle('light-mode', t === 'light');
      }
    } catch {}
    try {
      const cs = ensureMeta('color-scheme');
      if (cs) cs.setAttribute('content', t === 'dark' ? 'dark light' : 'light dark');
    } catch {}
    try {
      const tc = ensureMeta('theme-color');
      if (tc) tc.setAttribute('content', t === 'dark' ? '#05050b' : '#f8f9fa');
    } catch {}
  }
  function sync(){
    applyTheme(readTheme());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync, { once: true });
  } else {
    sync();
  }
  document.addEventListener('theme:change', function(e){
    try {
      const next = e && e.detail ? e.detail.theme : '';
      if (next) applyTheme(next);
      else sync();
    } catch {}
  });
  window.addEventListener('storage', function(e){
    if (e && e.key === 'theme') sync();
  });
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
function showPageLoader(opts){
  try {
    const el = document.getElementById('preloader');
    if (!el) return;
    const hold = !!(opts && opts.hold);
    try {
      sessionStorage.setItem('nav:loader:expected','1');
      sessionStorage.setItem('nav:loader:showAt', String(Date.now()));
    } catch {}
    el.classList.remove('hidden');
    el.style.display = 'flex';
    el.style.opacity = '1';
    try {
      clearTimeout(window.__NAV_LOADER_TIMEOUT__);
      if (!hold) {
        window.__NAV_LOADER_TIMEOUT__ = setTimeout(function(){
          try { sessionStorage.removeItem('nav:loader:expected'); sessionStorage.removeItem('nav:loader:showAt'); } catch(_){ }
          try { hidePageLoader(); } catch(_){ }
        }, 300);
      }
    } catch {}
  } catch {}
}
function hidePageLoader(){
  try {
    try { if (window.__LOADER_HOLD_ACTIVE__) return; } catch {}
    const el = document.getElementById('preloader');
    if (!el) return;
    try { sessionStorage.removeItem('nav:loader:expected'); sessionStorage.removeItem('nav:loader:showAt'); } catch(_){ }
    el.classList.add('hidden');
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    setTimeout(()=>{ el.style.display = 'none'; }, 400);
  } catch {}
}
window.addEventListener('pageshow', () => { try { if (sessionStorage.getItem('nav:loader:expected') === '1') return; } catch {} hidePageLoader(); });

// Show loader during navigation for internal links
(function setupNavLoader(){
  function hasNoLoader(link){
    try {
      return link.hasAttribute('data-no-loader') || link.getAttribute('data-loader') === 'off';
    } catch { return false; }
  }
  function shouldSkipHref(href){
    if (!href) return true;
    const v = href.trim();
    if (!v || v === '#') return true;
    // Hash-only navigation handled by SPA router; don't block with loader.
    if (v.startsWith('#/')) return true;
    if (v.startsWith('javascript:')) return true;
    if (v.startsWith('mailto:') || v.startsWith('tel:')) return true;
    if (v.startsWith('#') && !v.startsWith('#/')) return true;
    return false;
  }
  function sameOrigin(url){
    try { return url.origin === location.origin; } catch { return false; }
  }
  function handleNav(e){
    try {
      const link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!link || hasNoLoader(link)) return;
      const target = (link.getAttribute('target') || '').toLowerCase();
      if (target === '_blank') return;
      const href = link.getAttribute('href') || '';
      if (shouldSkipHref(href)) return;
      let url;
      try { url = new URL(href, location.href); } catch { return; }
      if (!sameOrigin(url)) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash === location.hash) return;
      showPageLoader();
    } catch {}
  }
  document.addEventListener('pointerdown', handleNav, true);
  document.addEventListener('click', handleNav, true);
  window.addEventListener('beforeunload', function(){ try { showPageLoader(); } catch {} });
})();

// Device fingerprint helpers (per-device session id)
const DEVICE_ID_STORAGE_KEY = 'session:device:id';
function generateDeviceId(){
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
  } catch {}
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const size = 24;
  let out = '';
  try {
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const buf = new Uint8Array(size);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < size; i++) out += alphabet[buf[i] % alphabet.length];
      return out;
    }
  } catch {}
  for (let i = 0; i < size; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
function ensureDeviceFingerprint(){
  try {
    const cached = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (cached) return cached;
  } catch {}
  const id = generateDeviceId();
  try { localStorage.setItem(DEVICE_ID_STORAGE_KEY, id); } catch {}
  return id;
}
function getDeviceFingerprint(){
  return ensureDeviceFingerprint();
}
function collectDeviceInfo(){
  try {
    const nav = navigator || {};
    const uaData = nav.userAgentData || {};
    const platform = String(uaData.platform || nav.platform || '').trim();
    const brand = Array.isArray(uaData.brands) ? uaData.brands.map(b => b.brand).join(', ') : '';
    const label = [platform, brand].filter(Boolean).join(' ').trim();
    return {
      label: label || '',
      userAgent: String(nav.userAgent || ''),
      platform: platform,
      language: String(nav.language || ''),
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })()
    };
  } catch (_) {
    return {};
  }
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
function triggerSessionConflictLogout(reasonCode){
  if (sessionConflictHandled) return;
  sessionConflictHandled = true;
  clearSessionDocWatcher();
  clearAuthClientState();
  try { window.dispatchEvent(new CustomEvent('session:conflict')); } catch {}
  let message = 'انتهت الجلسة الحالية. يرجى تسجيل الدخول من جديد.';
  const code = String(reasonCode || '').trim();
  if (code === 'session_revoked') message = 'تم تسجيل الخروج من هذا الجهاز.';
  else if (code === 'session_expired') message = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.';
  else if (code === 'session_mismatch' || code === 'session_conflict') {
    message = 'تم تسجيل الدخول من جهاز آخر وتم إنهاء هذه الجلسة.';
  }
  try { alert(message); } catch {}
  performClientLogout('index.html#/login');
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
    const SESSION_ERROR_CODES = new Set(['session_missing','session_invalid','session_mismatch','session_expired','session_not_found','session_revoked','session_conflict']);
    const AUTH_ERROR_CODES = new Set([
      'auth_missing','auth_required','invalid_token','token_expired','invalid_alg','invalid_signature',
      'invalid_issuer','invalid_audience','jwk_not_found','sub_userid_mismatch','firestore_auth_missing','jwt_parse_error'
    ]);
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
    async function refreshSessionKey(){
      try {
        const cached = JSON.parse(localStorage.getItem('sessionKeyInfo') || 'null');
        const key = cached && cached.sessionKey ? String(cached.sessionKey || '') : '';
        return key || null;
      } catch {
        return null;
      }
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
    function readSessionDeviceId(){
      try {
        const cached = JSON.parse(localStorage.getItem('sessionKeyInfo') || 'null');
        const deviceId = cached && cached.deviceId ? String(cached.deviceId || '').trim() : '';
        return deviceId || '';
      } catch {
        return '';
      }
    }
    function ensureDeviceHeader(request){
      if (!requestCarriesSession(request)) return request;
      try {
        const current = request.headers.get(DEVICE_HEADER);
        if (current) return request;
      } catch {}
      const sessionDeviceId = readSessionDeviceId();
      if (!sessionDeviceId) return request;
      const updated = rebuildRequestWithHeaders(request, headers => { headers.set(DEVICE_HEADER, sessionDeviceId); });
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

      if (hasSession && isSessionCode(code)) {
        return { kind: 'session', ttlSeconds, code: code || (statusIs401 ? 'session_http_401' : '') };
      }
      if (hasAuth && (isAuthCode(code) || (statusIs401 && !code))) {
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
          const conflictCodes = new Set(['session_conflict','session_mismatch','session_revoked']);
          if (conflictCodes.has(action.code)) {
            triggerSessionConflictLogout(action.code);
            return response;
          }
          const newKey = await refreshSessionKey();
          if (!newKey) {
            triggerSessionConflictLogout(action.code);
            return response;
          }
          const updated = rebuildRequestWithHeaders(request, headers => {
            headers.set(SESSION_HEADER, newKey);
            const sessionDeviceId = readSessionDeviceId();
            if (sessionDeviceId) headers.set(DEVICE_HEADER, sessionDeviceId);
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
          if (!shouldEnableRealtime('rates')) {
            try { handleErr(); } catch {}
            return;
          }
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
  if (currentLang === LANG_OFF) return str;
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
const LANG_OFF = 'off';
const RTL_LANGS = new Set(['ar']);
const DEFAULT_LANG = (() => {
  try { return (document.documentElement.getAttribute('lang') || 'ar').toLowerCase(); } catch { return 'ar'; }
})();
const DEFAULT_DIR = (() => {
  try { return document.documentElement.getAttribute('dir') || (RTL_LANGS.has(DEFAULT_LANG) ? 'rtl' : 'ltr'); }
  catch { return RTL_LANGS.has(DEFAULT_LANG) ? 'rtl' : 'ltr'; }
})();
const langSelects = new Set();
let currentLang = null;

function normalizeLang(lang){
  const key = (lang || '').toString().toLowerCase();
  if (key === LANG_OFF) return LANG_OFF;
  return I18N_TEXT[key] ? key : DEFAULT_LANG;
}
function readStoredLang(){
  try { return localStorage.getItem(LANG_KEY); } catch { return null; }
}
function translateKey(key, fallback){
  if (!key) return fallback || '';
  if (currentLang === LANG_OFF) return (fallback != null) ? fallback : key;
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
  const isOff = next === LANG_OFF;
  const langForDom = isOff ? DEFAULT_LANG : next;
  const dirForDom = isOff ? DEFAULT_DIR : (RTL_LANGS.has(next) ? 'rtl' : 'ltr');
  try {
    const root = document.documentElement;
    root.setAttribute('lang', langForDom);
    root.setAttribute('dir', dirForDom);
    root.setAttribute('data-lang', next);
  } catch {}
  try { if (!(opts && opts.store === false)) localStorage.setItem(LANG_KEY, next); } catch {}
  try {
    const localeMap = { ar: 'ar_AR', en: 'en_US', fr: 'fr_FR' };
    const metaLocale = document.querySelector('meta[property="og:locale"]');
    if (metaLocale) metaLocale.setAttribute('content', localeMap[langForDom] || 'ar_AR');
  } catch {}
  try {
    const autoText = translateKey('home.autoRibbon', langForDom === 'ar' ? '\u062A\u0644\u0642\u0627\u0626\u064A' : 'Auto');
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
function getLang(){ return currentLang || DEFAULT_LANG; }

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
          <option value="off">\u0625\u064A\u0642\u0627\u0641\u0020\u0627\u0644\u062A\u0631\u062C\u0645\u0629</option>
        `;
      }
      if (!select.querySelector(`option[value="${LANG_OFF}"]`)) {
        const opt = document.createElement('option');
        opt.value = LANG_OFF;
        opt.textContent = '\u0625\u064A\u0642\u0627\u0641\u0020\u0627\u0644\u062A\u0631\u062C\u0645\u0629';
        select.appendChild(opt);
      }
      select.addEventListener('change', () => { setLang(select.value); });
      select.dataset.langReady = '1';
    }
    langSelects.add(select);
    if (!currentLang) currentLang = normalizeLang(readStoredLang() || LANG_OFF);
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
  const initial = normalizeLang(readStoredLang() || LANG_OFF);
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

function closeSidebarIfOpen(){
  const el = document.getElementById('sidebar');
  if (!el) return;
  if (el.classList.contains('active')) el.classList.remove('active');
}

function resolveHomeUrl(){
  try { if (window.__HOME_URL__) return String(window.__HOME_URL__); } catch {}
  try {
    const meta = document.querySelector('meta[name="home-url"]');
    if (meta && meta.content) return String(meta.content);
  } catch {}
  try {
    const url = new URL(location.href);
    url.hash = '';
    const params = new URLSearchParams(url.search || '');
    const keep = new URLSearchParams();
    if (params.has('firebase')) keep.set('firebase', params.get('firebase'));
    if (params.has('lang')) keep.set('lang', params.get('lang'));
    url.search = keep.toString();
    const path = url.pathname || '';
    const base = path.endsWith('/') ? path : path.replace(/[^/]*$/, '');
    url.pathname = (base || '/').replace(/\/?$/, '/') + 'index.html';
    return url.toString();
  } catch {}
  return 'index.html';
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
logoLink.href = resolveHomeUrl();
logoLink.style.marginLeft = '0';
logoLink.style.marginRight = 'auto';
logoLink.className = 'header-logo-link';
logoLink.setAttribute('aria-label','\u0627\u0644\u0639\u0648\u062F\u0629\u0020\u0625\u0644\u0649\u0020\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629');
logoLink.setAttribute('data-i18n-aria-label', 'brand.home');
logoLink.style.marginLeft = '';
logoLink.style.marginRight = '';
logoLink.appendChild(logo);
function navigateLogoHome(event) {
  const hasModifiers = event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
  if (hasModifiers) return;
  const isMiddle = event && typeof event.button === 'number' && event.button !== 0;
  if (isMiddle) return;
  const href = resolveHomeUrl();
  if (!href) return;
  try { sessionStorage.setItem('nav:fromHome','1'); } catch {}
  closeSidebarIfOpen();
  if (event && event.type === 'click') {
    try { event.preventDefault(); } catch {}
  }
  try {
    const current = new URL(location.href);
    const target = new URL(href, location.href);
    const sameBase = current.origin === target.origin &&
      current.pathname === target.pathname &&
      current.search === target.search;
    if (sameBase) {
      try {
        if (typeof window.navigateHome === 'function') {
          window.navigateHome();
          return;
        }
      } catch {}
      if (current.hash) {
        try { history.replaceState({}, '', target.pathname + target.search); } catch {}
      }
      try {
        sessionStorage.removeItem('nav:loader:expected');
        sessionStorage.removeItem('nav:loader:showAt');
      } catch {}
      try { hidePageLoader(); } catch {}
      return;
    }
  } catch {}
  try { showPageLoader(); } catch {}
  try { window.location.assign(href); } catch { window.location.href = href; }
}
logoLink.addEventListener('pointerdown', (e) => {
  try { logoLink.href = resolveHomeUrl(); } catch {}
  navigateLogoHome(e);
}, { passive: true });
logoLink.addEventListener('click', (e) => {
  try { logoLink.href = resolveHomeUrl(); } catch {}
  navigateLogoHome(e);
});

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

// Apply auth state to sidebar (fallback to in-memory nodes if DOM not yet attached)
function resolveSidebarNode(id, fallback){
  try { return document.getElementById(id) || fallback || null; } catch { return fallback || null; }
}
function applyAuthUi(user){
  try { window.__AUTH_LAST_USER__ = user || null; } catch {}
  const loginBtn = resolveSidebarNode('loginSidebarBtn', typeof loginLi !== 'undefined' ? loginLi : null);
  const depositBtn = resolveSidebarNode('depositBtn', typeof depositLi !== 'undefined' ? depositLi : null);
  const walletBtn = resolveSidebarNode('walletBtn', typeof walletLi !== 'undefined' ? walletLi : null);
  const transferBtn = resolveSidebarNode('transferBtn', typeof transferLi !== 'undefined' ? transferLi : null);
  const settingsBtn = resolveSidebarNode('settingsBtn', typeof settingsLi !== 'undefined' ? settingsLi : null);
  const securityBtn = resolveSidebarNode('securityBtn', typeof securityLi !== 'undefined' ? securityLi : null);
  const logoutBtn = resolveSidebarNode('logoutBtn', typeof logoutLi !== 'undefined' ? logoutLi : null);

  if (user) {
    try { localStorage.setItem(LAST_LOGGED_KEY, '1'); } catch {}
    try { if (user.uid) localStorage.setItem(LAST_UID_KEY, user.uid); } catch {}
    if (loginBtn) loginBtn.style.display = 'none';
    if (depositBtn) depositBtn.style.display = 'flex';
    if (walletBtn) walletBtn.style.display = 'flex';
    if (transferBtn) transferBtn.style.display = 'flex';
    if (settingsBtn) settingsBtn.style.display = 'flex';
    if (securityBtn) securityBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'flex';
  } else {
    try { localStorage.setItem(LAST_LOGGED_KEY, '0'); } catch {}
    try { localStorage.removeItem(LAST_UID_KEY); } catch {}
    if (loginBtn) loginBtn.style.display = 'flex';
    if (depositBtn) depositBtn.style.display = 'none';
    if (walletBtn) walletBtn.style.display = 'none';
    if (transferBtn) transferBtn.style.display = 'none';
    if (settingsBtn) settingsBtn.style.display = 'none';
    if (securityBtn) securityBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}
try { window.__applyAuthUi = applyAuthUi; } catch {}

function clearAuthClientState(){
  let uid = "";
  try { uid = localStorage.getItem(LAST_UID_KEY) || ""; } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem('sessionKeyInfo') || 'null');
    if (cached && typeof cached === 'object' && cached.uid) uid = String(cached.uid || '');
  } catch {}
  try { localStorage.removeItem('sessionKeyInfo'); } catch {}
  try { localStorage.removeItem('postLoginPayload'); } catch {}
  try { localStorage.removeItem(LAST_LOGGED_KEY); } catch {}
  try { localStorage.removeItem(LAST_UID_KEY); } catch {}
  try { localStorage.removeItem('auth:lastLoggedIn'); } catch {}
  try { localStorage.removeItem('auth:lastUid'); } catch {}
  if (uid) { try { localStorage.removeItem(BAL_KEY(uid)); } catch {} }
  try {
    if (typeof window.name === 'string' && window.name.startsWith('__Z3EM_AUTH__:')) window.name = '';
  } catch {}
  try { window.__POST_LOGIN_PAYLOAD__ = null; } catch {}
  try { window.__AUTH_LAST_USER__ = null; } catch {}
  try { window.__AUTH_RESTORE_PROMISE__ = null; } catch {}
  try { window.__AUTH_RESTORE_ATTEMPTED__ = true; } catch {}
}

function performClientLogout(redirectUrl){
  try { clearSessionDocWatcher(); } catch {}
  if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch {} unsubscribeBalance = null; }
  clearAuthClientState();
  try { applyAuthUi(null); } catch {}
  try { setHeaderBalance('0.00 $'); } catch {}
  try { broadcastBalance(0); } catch {}
  try {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().signOut().catch(()=>{});
    }
  } catch {}
  try {
    if (redirectUrl) window.location.href = redirectUrl;
    else window.location.reload();
  } catch {
    try { window.location.href = 'index.html#/login'; } catch {}
  }
}

// Gracefully block banned accounts across the site
function showBannedOverlay(reason){
  try {
    let overlay = document.getElementById('ban-block-overlay');
    const applyReason = (root) => {
      try {
        const reasonEl = root.querySelector('#banReasonText');
        if (!reasonEl) return;
        const cleanReason = (typeof reason === 'string' ? reason.trim() : '');
        reasonEl.textContent = cleanReason ? ('سبب الحظر: ' + cleanReason) : '';
        reasonEl.style.display = cleanReason ? 'block' : 'none';
      } catch {}
    };
    if (overlay) { applyReason(overlay); return overlay; }
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
      const reasonEl = document.createElement('p');
      reasonEl.id = 'banReasonText';
      reasonEl.style.margin = '0 0 18px';
      reasonEl.style.lineHeight = '1.7';
      reasonEl.style.fontSize = '0.95rem';
      reasonEl.style.display = 'none';
      const logoutBtn = card.querySelector('#banLogoutBtn');
      if (logoutBtn && logoutBtn.parentNode) logoutBtn.parentNode.insertBefore(reasonEl, logoutBtn);
      else card.appendChild(reasonEl);
      overlay.appendChild(card);
      (document.body || document.documentElement).appendChild(overlay);
      applyReason(overlay);
      return overlay;
  } catch { return null; }
}
function handleBannedAccount(reason){
  if (bannedSessionHandled) return;
  bannedSessionHandled = true;
  clearSessionDocWatcher();
  if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch {} unsubscribeBalance = null; }
    const overlay = showBannedOverlay(reason);
  const logoutBtn = overlay ? overlay.querySelector('#banLogoutBtn') : null;
  let logoutTriggered = false;
  const forceLogout = () => {
    if (logoutTriggered) return;
    logoutTriggered = true;
    try {
      const path = (location.pathname || '').toLowerCase();
      if (path.includes('login')) performClientLogout();
      else performClientLogout('index.html#/login');
    } catch { performClientLogout('index.html#/login'); }
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
ordersLi.onclick = () => navigateHomeHash('#/orders','orders');
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
// حماية الحساب
const securityLi = document.createElement('li');
securityLi.id = 'securityBtn';
securityLi.innerHTML = '<i class="fa-solid fa-shield-halved"></i><a href="#" data-i18n="nav.security">\u062D\u0645\u0627\u064A\u0629\u0020\u0627\u0644\u062D\u0633\u0627\u0628</a>';
securityLi.onclick = () => navigateHomeHash('#/security','security');
securityLi.style.display = 'none';
ul.appendChild(securityLi);
// API docs
const apiLi = document.createElement('li');
apiLi.innerHTML = '<i class="fa-solid fa-code"></i><a href="#" data-i18n="nav.api">API</a>';
apiLi.onclick = () => navigateTo('api.html');
ul.appendChild(apiLi);
// تسجيل الدخول / الخروج
const loginLi = document.createElement('li');
loginLi.id = 'loginSidebarBtn';
loginLi.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><a href="#" data-i18n="nav.login">\u062A\u0633\u062C\u064A\u0644\u0020\u0627\u0644\u062F\u062E\u0648\u0644</a>';
loginLi.onclick = () => navigateHomeHash('#/login','login');
ul.appendChild(loginLi);
const logoutLi = document.createElement('li');
logoutLi.id = 'logoutBtn';
logoutLi.style.display = 'none';
logoutLi.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i><a href="#" data-i18n="nav.logout">\u062A\u0633\u062C\u064A\u0644\u0020\u0627\u0644\u062E\u0631\u0648\u062C</a>';
logoutLi.onclick = () => {
  try { showPageLoader(); } catch {}
  try { sessionStorage.setItem('nav:fromHome','1'); } catch {}
  performClientLogout('index.html');
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

  // Re-apply auth state after sidebar/header are attached (handles early auth events).
  try {
    let user = (window.__AUTH_LAST_USER__ != null)
      ? window.__AUTH_LAST_USER__
      : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null);
    if (!user) user = buildFallbackUserFromPayload(readPostLoginPayload());
    if (typeof window.__applyAuthUi === 'function') window.__applyAuthUi(user);
  } catch {}
});

// Firebase auth + balance live update
async function ensureFirebaseCompat(){
  try { if (typeof window.__FIREBASE_ENV_OK__ === 'boolean' && !window.__FIREBASE_ENV_OK__) return false; } catch {}
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
    try { if (typeof window.__FIREBASE_ENV_OK__ === 'boolean' && !window.__FIREBASE_ENV_OK__) return false; } catch {}
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

// محاولة استعادة جلسة Firebase من بيانات مخزنة (postLoginPayload)
const POST_LOGIN_STORAGE_KEY = 'postLoginPayload';
const TRANSIENT_AUTH_PREFIX = '__Z3EM_AUTH__:';
const MANUAL_ROUTER_DEFAULT = 'https://z3em-manwal.laithqarqaz1.workers.dev/';
let __AUTH_RESTORE_ATTEMPTED__ = false;
let __AUTH_RESTORE_PROMISE__ = null;

function readPostLoginPayload(){
  try {
    const raw = localStorage.getItem(POST_LOGIN_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') return data;
    }
  } catch {}
  try {
    if (window.__POST_LOGIN_PAYLOAD__ && typeof window.__POST_LOGIN_PAYLOAD__ === 'object') {
      return window.__POST_LOGIN_PAYLOAD__;
    }
  } catch {}
  // Fallback: same-tab transfer via window.name (file:// safe)
  try {
    if (typeof window.name === 'string' && window.name.startsWith(TRANSIENT_AUTH_PREFIX)) {
      const json = window.name.slice(TRANSIENT_AUTH_PREFIX.length);
      const data = JSON.parse(json);
      if (data && typeof data === 'object') {
        try { localStorage.setItem(POST_LOGIN_STORAGE_KEY, JSON.stringify(data)); } catch {}
        try { window.__POST_LOGIN_PAYLOAD__ = data; } catch {}
        try { window.name = ''; } catch {}
        return data;
      }
    }
  } catch {}
  return null;
}
function writePostLoginPayload(payload){
  try {
    const data = { ...(payload || {}), ts: Date.now() };
    localStorage.setItem(POST_LOGIN_STORAGE_KEY, JSON.stringify(data));
    try { window.name = TRANSIENT_AUTH_PREFIX + JSON.stringify(data); } catch {}
    try { window.__POST_LOGIN_PAYLOAD__ = data; } catch {}
  } catch {}
}
function base64UrlDecode(input){
  try {
    let str = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4;
    if (pad) str += '='.repeat(4 - pad);
    return atob(str);
  } catch { return ''; }
}
function decodeJwtPayload(token){
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}
function isJwtUsable(token, leewaySec = 60){
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  const expMs = Number(payload.exp) * 1000;
  if (!Number.isFinite(expMs)) return true;
  return expMs - Date.now() > (Number(leewaySec) || 0) * 1000;
}
function buildFallbackUserFromPayload(payload){
  if (!payload) return null;
  const idToken = payload.token || payload.idToken || '';
  const hasSession = !!(payload.sessionKey || payload.session_key);
  const hasAuthKey = !!(payload.authkey || payload.authKey);
  const decoded = idToken ? (decodeJwtPayload(idToken) || {}) : {};
  const uid = payload.uid || decoded.user_id || decoded.sub || '';
  if (!uid) return null;
  if (idToken && isJwtUsable(idToken, 30)) {
    return {
      uid,
      email: payload.email || decoded.email || '',
      displayName: payload.displayName || decoded.name || '',
      photoURL: payload.photoURL || decoded.picture || '',
      isFallback: true,
      getIdToken: async () => idToken
    };
  }
  if (!hasSession && !hasAuthKey) return null;
  return {
    uid,
    email: payload.email || '',
    displayName: payload.displayName || '',
    photoURL: payload.photoURL || '',
    isFallback: true,
    getIdToken: async () => ''
  };
}
function getManualRouterBase(){
  try {
    const stored = localStorage.getItem('MANWAL_ROUTER_BASE');
    if (stored) {
      const candidate = stored.trim();
      const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
      let url = new URL(normalized);
      try {
        if (location.protocol === 'https:' && url.protocol === 'http:') {
          url = new URL(url.toString().replace(/^http:/i, 'https:'));
        }
      } catch {}
      return url.toString();
    }
  } catch {}
  return MANUAL_ROUTER_DEFAULT;
}
function buildManualAuthUrl(){
  const base = getManualRouterBase();
  try {
    const url = new URL(base);
    if (!url.searchParams.has('game')) url.searchParams.set('game','auth');
    return url.toString();
  } catch { return MANUAL_ROUTER_DEFAULT + '?game=auth'; }
}
function writeSessionInfo(uid, sessionKey, ttlSeconds, deviceId){
  if (!uid || !sessionKey) return;
  try {
    const payload = {
      uid,
      sessionKey,
      ts: Date.now(),
      ttlSeconds: Number(ttlSeconds) || 0
    };
    if (deviceId) payload.deviceId = deviceId;
    localStorage.setItem('sessionKeyInfo', JSON.stringify(payload));
  } catch {}
}
async function syncManualAuthFromToken(idToken, payload){
  if (!idToken) return null;
  let sessionKey = "";
  let sessionUid = "";
  try {
    const cached = JSON.parse(localStorage.getItem('sessionKeyInfo') || 'null');
    if (cached && typeof cached === 'object') {
      sessionKey = String(cached.sessionKey || "");
      sessionUid = String(cached.uid || cached.useruid || "");
    }
  } catch {}
  if (payload?.sessionKey) sessionKey = String(payload.sessionKey || "");
  if (payload?.uid) sessionUid = String(payload.uid || "");
  const authkey = payload?.authkey || payload?.authKey || "";
  const customToken = payload?.customToken || payload?.custom_token || "";
  if (!sessionKey && !authkey && !customToken) return null;
  return { sessionKey, uid: sessionUid || payload?.uid || "", authkey, customToken };
}
async function tryRestoreAuthFromPostLogin(){
  if (__AUTH_RESTORE_PROMISE__) return __AUTH_RESTORE_PROMISE__;
  if (__AUTH_RESTORE_ATTEMPTED__) return null;
  __AUTH_RESTORE_ATTEMPTED__ = true;
  __AUTH_RESTORE_PROMISE__ = (async () => {
    try {
      if (typeof firebase === 'undefined' || !firebase.auth) return null;
      const auth = firebase.auth();
      if (auth.currentUser) return auth.currentUser;
      const payload = readPostLoginPayload();
      if (!payload) return null;
      const customToken = payload.customToken || payload.custom_token || '';
      if (customToken && isJwtUsable(customToken, 30) && typeof auth.signInWithCustomToken === 'function') {
        try {
          await auth.signInWithCustomToken(customToken);
          return auth.currentUser || null;
        } catch (_) {}
      }
      const idToken = payload.token || payload.idToken || '';
      if (idToken && isJwtUsable(idToken, 30)) {
        // لا تقم بمزامنة الجلسة من الواجهة. الاعتماد فقط على بيانات تسجيل الدخول.
      }
    } catch {}
    return null;
  })().finally(() => { __AUTH_RESTORE_PROMISE__ = null; });
  return __AUTH_RESTORE_PROMISE__;
}
try { window.__ensureAuthReady = async function(){ await initFirebaseApp(); return tryRestoreAuthFromPostLogin(); }; } catch {}

try {
  (async ()=>{
    const ok = await initFirebaseApp();
    if (!ok || typeof firebase === 'undefined' || !firebase.auth) return;
    let authRestoreChecked = false;
    firebase.auth().onAuthStateChanged(async user => {
    if (!user && !authRestoreChecked) {
      authRestoreChecked = true;
      const restored = await tryRestoreAuthFromPostLogin();
      if (restored) return;
    }
    clearSessionDocWatcher();
    sessionConflictHandled = false;
    bannedSessionHandled = false;
    if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch (err) { console.warn('unsubscribeBalance error:', err); } unsubscribeBalance = null; }

    try {
      const displayUser = user || buildFallbackUserFromPayload(readPostLoginPayload());
      if (typeof window.__applyAuthUi === 'function') window.__applyAuthUi(displayUser);
    } catch {}

    if (user) {
      watchSessionDocForDevice(user);
      try { localStorage.setItem(LAST_UID_KEY, user.uid); } catch {}
      const cached = readCachedBalance(user.uid); if (cached != null) { try { window.__BAL_BASE__ = cached; } catch {}; setHeaderBalance((typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(cached) : (Number(cached).toFixed(2) + ' $')); broadcastBalance(cached); }
      const docRef = firebase.firestore().collection('users').doc(user.uid);
      const handleBalanceSnap = (snap) => {
        if (snap && snap.exists) {
          const data = snap.data() || {};
          if (data.isBanned === true) { handleBannedAccount(data.banReason); return; }
          const raw = data.balance ?? 0; const num = Number(raw); const val = Number.isFinite(num) ? num : 0;
          try { window.__BAL_BASE__ = val; } catch {}
          setHeaderBalance((typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(val) : (Number(val).toFixed(2) + ' $'));
          writeCachedBalance(user.uid, val); broadcastBalance(val);
        } else {
          try { window.__BAL_BASE__ = 0; } catch {};
          setHeaderBalance((typeof window.formatCurrencyFromJOD === 'function') ? window.formatCurrencyFromJOD(0) : '0.00 $');
          writeCachedBalance(user.uid, 0); broadcastBalance(0);
        }
      };
      if (shouldEnableRealtime('balance')) {
        unsubscribeBalance = docRef.onSnapshot(handleBalanceSnap, err => {
          console.error('Balance listener error:', err);
          setHeaderBalance('تعذر التحميل');
        });
      } else {
        docRef.get().then(handleBalanceSnap).catch(err => {
          console.error('Balance fetch error:', err);
          setHeaderBalance('تعذر التحميل');
        });
      }
    } else {
      setHeaderBalance('0.00 $');
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
    const orders = makeItem('<i class="fa-solid fa-list" aria-hidden="true"></i>', 'orders', 'index.html#/orders'); orders.setAttribute('aria-label','طلباتي');
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
        else if (hash === '#/orders') key = 'orders';
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

// =================== Site state (theme + maintenance) ===================
(function(){
  const log = () => {};
  try {
    let started = false;

    function ensureCss(){
      if (document.getElementById("site-state-style")) return;
      const st = document.createElement("style");
      st.id = "site-state-style";
      st.textContent = `
        #maintenance-overlay{position:fixed;inset:0;z-index:15000;display:flex;align-items:center;justify-content:center;background:rgba(5,6,20,.92);color:#f8f9ff;text-align:center;padding:30px;backdrop-filter:blur(3px);}
        #maintenance-overlay .card{background:#0f172a;border:1px solid rgba(124,126,208,.35);padding:24px 20px;border-radius:16px;max-width:520px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.45);}
        #maintenance-overlay h2{margin:0 0 10px;font-size:1.5rem;}
        #maintenance-overlay p{margin:6px 0;color:#cbd5e1;}
        #maintenance-overlay .countdown{font-weight:800;color:#fbbf24;}
        /* Disable any template background (dots/pattern) while theme effects are active. */
        body::before{display:none!important;background-image:none!important;background:none!important;}
        /* Force a clean background for seasonal themes. */
        body.theme-fall,
        body.theme-snow,
        body.theme-ramadan,
        body.theme-eid{
          background:#0b0f1d !important;
          background-image:none !important;
          background-repeat:no-repeat !important;
        }
        html[data-theme="light"] body.theme-fall,
        html[data-theme="light"] body.theme-snow,
        html[data-theme="light"] body.theme-ramadan,
        html[data-theme="light"] body.theme-eid{
          background:#f5f7ff !important;
          background-image:none !important;
          background-repeat:no-repeat !important;
        }
        body.theme-snow,
        body.theme-eid{
          padding-bottom: calc(var(--theme-bottom-pad, 0px) + env(safe-area-inset-bottom)) !important;
        }
        body.theme-snow{ --theme-bottom-pad: 140px; }
        body.theme-eid{ --theme-bottom-pad: clamp(90px, 16vh, 170px); }
        @media (max-width: 768px){
          body.mobile-has-dock.theme-snow,
          body.mobile-has-dock.theme-eid{
            padding-bottom: calc(var(--theme-bottom-pad, 0px) + 78px + env(safe-area-inset-bottom)) !important;
          }
        }
        body.theme-snow::before,
        body.theme-fall::before,
        body.theme-ramadan::before,
        body.theme-eid::before{display:none!important;background-image:none!important;}
        body.theme-snow::after{
          content:"";
          position:fixed;
          left:-10vw;right:-10vw;bottom:-40px;
          height:140px;
          background:url('ICE.png') repeat-x bottom;
          background-size:auto 140px;
          pointer-events:none;
          z-index:46;
        }
        body.theme-fall .leaf{
          position:fixed;
          top:-12%;
          font-size:26px;
          line-height:1;
          opacity:.92;
          transform:rotate(12deg);
          /* Run once then JS removes the node on animationend (continuous spawner). */
          animation:falling-leaf 11s linear forwards;
          z-index:50;
          pointer-events:none;
          filter:drop-shadow(0 3px 6px rgba(0,0,0,.25));
          right:auto!important;
          font-family:"Segoe UI Symbol","Apple Color Emoji","Noto Color Emoji",sans-serif;
          color:#f59e0b;
          text-shadow:0 2px 6px rgba(0,0,0,.25);
        }
        @keyframes falling-leaf{
          0%{transform:translate3d(0,-5%,0) rotate(0deg);}
          25%{transform:translate3d(-5vw,25vh,0) rotate(90deg);}
          50%{transform:translate3d(3vw,55vh,0) rotate(180deg);}
          75%{transform:translate3d(-8vw,85vh,0) rotate(270deg);}
          100%{transform:translate3d(-12vw,110vh,0) rotate(360deg);}
        }
        .snowflake{
          position:fixed;
          top:-8%;
          color:#e0e9ff;
          font-size:14px;
          line-height:1;
          opacity:.8;
          /* Run once then JS removes the node on animationend (continuous spawner). */
          animation:snowfall 11s linear forwards;
          pointer-events:none;
          z-index:50;
          text-shadow:0 0 6px rgba(255,255,255,.35);
          right:auto!important;
          font-family:"Segoe UI Symbol","Apple Color Emoji","Noto Color Emoji",sans-serif;
        }
        html[data-theme="light"] .snowflake{
          color:#94a3b8;
          text-shadow:0 0 4px rgba(15,23,42,.12);
        }
        @keyframes snowfall{0%{transform:translateY(-10%) translateX(0);}100%{transform:translateY(115vh) translateX(var(--dx,20px));}}

        /* Ramadan: hanging lantern */
        .ramadan-wrap{
          position:fixed;
          top:72px; /* under the header */
          right:10vw;
          z-index:60;
          pointer-events:none;
          display:flex;flex-direction:column;align-items:center;gap:4px;
          animation:swing 5.5s ease-in-out infinite alternate;
          transform-origin:top center;
        }
        .ramadan-string{
          width:2px;height:90px;
          background:linear-gradient(#facc15,#f59e0b);
          box-shadow:0 0 6px rgba(250,204,21,.55);
        }
        .ramadan-lantern{
          width:58px;height:80px;
          background:radial-gradient(circle at 50% 18%,#fff7d6 0%,#fcd34d 35%,#c2410c 95%);
          border:2px solid #7c2d12;border-radius:14px;
          box-shadow:0 10px 18px rgba(0,0,0,.30),0 0 12px rgba(251,191,36,.48);
          position:relative;overflow:hidden;
        }
        .ramadan-lantern::before,.ramadan-lantern::after{
          content:"";position:absolute;left:50%;transform:translateX(-50%);
          width:72%;height:6px;border-radius:6px;background:rgba(255,249,226,.95);
        }
        .ramadan-lantern::before{top:9px;}
        .ramadan-lantern::after{bottom:9px;}
        .ramadan-crescent{
          position:absolute;
          width:34px;height:34px;border-radius:50%;
          left:-14px;top:18px;
          box-shadow:12px 0 0 0 #facc15;
          filter:drop-shadow(0 0 6px rgba(250,204,21,.8));
        }
        @keyframes swing{
          0%{transform:rotate(-7deg);}
          50%{transform:rotate(6deg);}
          100%{transform:rotate(-5deg);}
        }

        /* Eid: grass + fireworks */
        .eid-grass{
          position:fixed;left:0;right:0;bottom:0;
          height:16vh;min-height:90px;max-height:170px;
          pointer-events:none;z-index:45;overflow:visible;
          background:none;
        }
        .eid-grass::before{
          content:"";
          position:absolute;left:-80px;right:-80px;top:-18px;bottom:-2px;
          background-image:url('pngegg(2).png');
          background-repeat:repeat-x;
          background-size:90px 120px;
          background-position:-30px 100%;
          mix-blend-mode:normal;
          opacity:1;
          filter:drop-shadow(0 -4px 10px rgba(0,0,0,.22));
          animation:grass-drift 6s ease-in-out infinite alternate;
        }
        @keyframes grass-drift{
          0%{transform:translateX(-12px);}
          100%{transform:translateX(12px);}
        }
        @keyframes grass-wind{
          0%{transform:translateX(-8px) skewX(-1deg);}
          100%{transform:translateX(8px) skewX(1deg);}
        }
        @media (prefers-reduced-motion: reduce){
          .eid-grass::before,
          .eid-grass::after{animation:none;}
        }
        .eid-firework{
          position:fixed;top:20vh;left:50vw;width:8px;height:8px;
          background:radial-gradient(circle,#fde68a 0%, #f59e0b 60%, rgba(0,0,0,0) 70%);
          border-radius:50%;opacity:0;pointer-events:none;z-index:65;
          animation:firework 1.8s ease-out forwards;
        }
        @keyframes firework{
          0%{transform:scale(.2);opacity:0;}
          40%{opacity:1;}
          100%{transform:scale(3.2);opacity:0;}
        }
      `;
      document.head.appendChild(st);
    }

    let maintTimer = null;
    function applyMaintenance(state){
      const on = state && state.on === true;
      const untilMs = state && state.until ? Date.parse(state.until) : null;
      // If maintenance expired, turn it off immediately.
      if (on && untilMs && Date.now() > untilMs) {
        log("maintenance expired", state.until);
        applyMaintenance({ on:false });
        return;
      }
      if (!on) {
        document.getElementById("maintenance-overlay")?.remove();
        if (maintTimer) { clearInterval(maintTimer); maintTimer = null; }
        log("maintenance off");
        return;
      }
      let overlay = document.getElementById("maintenance-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "maintenance-overlay";
        overlay.innerHTML = `<div class="card"><h2>الموقع في وضع الصيانة</h2><p>الرجاء العودة لاحقاً.</p><p class="countdown"></p></div>`;
        document.body.appendChild(overlay);
      }
      const cd = overlay.querySelector(".countdown");
      if (maintTimer) clearInterval(maintTimer);
      maintTimer = setInterval(() => {
        if (untilMs && Date.now() > untilMs) { applyMaintenance({ on:false }); return; }
        if (!cd) return;
        if (untilMs) {
          const diff = Math.max(0, untilMs - Date.now());
          const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
          cd.textContent = `الوقت المتبقي: ${m} دقيقة ${s} ثانية`;
        } else {
          cd.textContent = "بدون وقت انتهاء";
        }
      }, 1000);
      log("maintenance on", state);
    }

    let particleKind = null;
    let particleTimer = null;
    // Particle caps are per-theme. Leaves should be much lighter than snow.
    const PARTICLE_MAX = { snow: 90, leaf: 36 };
    function clearThemeParticles(){
      particleKind = null;
      if (particleTimer){ clearInterval(particleTimer); particleTimer = null; }
      document.querySelectorAll(".leaf,.snowflake").forEach(el=>el.remove());
    }
    function clearSpecialEffects(){ document.querySelectorAll(".ramadan-wrap,.eid-grass,.eid-firework").forEach(el=>el.remove()); }

    function spawnRamadan(){
      clearSpecialEffects(); clearThemeParticles();
      const count = 1;
      for(let i=0;i<count;i++){
        const wrap=document.createElement("div");
        wrap.className="ramadan-wrap";
        wrap.style.right=`${8+Math.random()*14}vw`;
        wrap.style.animationDuration=`${5+Math.random()*1.5}s`;
        const string=document.createElement("div"); string.className="ramadan-string";
        const lantern=document.createElement("div"); lantern.className="ramadan-lantern";
        const cres=document.createElement("div"); cres.className="ramadan-crescent";
        lantern.appendChild(cres);
        wrap.append(string,lantern);
        document.body.appendChild(wrap);
      }
    }

    function spawnEid(){
      clearSpecialEffects(); clearThemeParticles();
      const grass=document.createElement("div");
      grass.className="eid-grass";
      document.body.appendChild(grass);
      const count=8;
      const frag=document.createDocumentFragment();
      for(let i=0;i<count;i++){
        const fw=document.createElement("div");
        fw.className="eid-firework";
        fw.style.left=`${10+Math.random()*80}vw`;
        fw.style.top=`${10+Math.random()*45}vh`;
        fw.style.animationDelay=`${Math.random()*1.2}s`;
        fw.style.background=`radial-gradient(circle at center, ${Math.random()>.5?'#fde68a':'#a5b4fc'} 0%, ${Math.random()>.5?'#f97316':'#6366f1'} 55%, rgba(0,0,0,0) 70%)`;
        frag.appendChild(fw);
      }
      document.body.appendChild(frag);
    }

    function spawnThemeParticles(kind,count){
      clearThemeParticles();
      clearSpecialEffects();
      particleKind = kind;
      const max = (kind === "leaf") ? PARTICLE_MAX.leaf : PARTICLE_MAX.snow;
      const intervalMs = (kind === "leaf") ? 1400 : 700;

      const makeOne = () => {
        if (!particleKind) return;
        const selector = (kind === "leaf") ? ".leaf" : ".snowflake";
        if (document.querySelectorAll(selector).length >= max) return;
        // Leaves are intentionally sparse to avoid covering the UI.
        if (kind === "leaf" && Math.random() < 0.5) return;
        const el=document.createElement("div");
        if(kind==="leaf"){
          el.className="leaf";
          el.textContent="🍁";
          el.style.top=`-${5+Math.random()*15}%`;
          el.style.left=`${Math.random()*100}vw`;
          el.style.animationDelay=`${Math.random()*1.2}s`;
          el.style.animationDuration=`${10+Math.random()*8}s`;
          el.style.fontSize=`${20+Math.random()*10}px`;
          el.style.transform=`rotate(${Math.random()*40-20}deg)`;
        } else if(kind==="snow"){
          el.className="snowflake";
          el.textContent="❄";
          el.style.top=`-${5+Math.random()*15}%`;
          el.style.left=`${Math.random()*100}vw`;
          el.style.animationDelay=`${Math.random()*1.2}s`;
          el.style.animationDuration=`${12+Math.random()*10}s`;
          el.style.fontSize=`${12+Math.random()*10}px`;
          el.style.setProperty('--dx', `${Math.random()*80-40}px`);
        }
        el.addEventListener("animationend", ()=> el.remove(), { once:true });
        document.body.appendChild(el);
      };

      const burst = Math.max(0, Number(count) || 0);
      for(let i=0;i<burst;i++){
        const delay = (kind === "leaf" ? 220 : 120) * i + Math.random()*120;
        setTimeout(makeOne, delay);
      }
      particleTimer = setInterval(makeOne, intervalMs);
    }

    function applyTheme(theme){
      const name = String(theme?.name||"").toLowerCase().trim();
      const color = String(theme?.color||"").trim();
      document.body.classList.remove("theme-fall","theme-snow","theme-ramadan","theme-eid");
      clearSpecialEffects(); clearThemeParticles();
      if (["fall","autumn","خريف"].includes(name)) { document.body.classList.add("theme-fall"); spawnThemeParticles("leaf",6); }
      else if (["snow","winter","ثلج"].includes(name)) { document.body.classList.add("theme-snow"); spawnThemeParticles("snow",14); }
      else if (["ramadan","رمضان"].includes(name)) { document.body.classList.add("theme-ramadan"); spawnRamadan(); }
      else if (["eid","عيد"].includes(name)) { document.body.classList.add("theme-eid"); spawnEid(); }
      if (color) document.documentElement.style.setProperty("--accent-theme", color);
      log("theme applied", name, color);
    }

    function decodeFirestoreValue(val){
      if (!val || typeof val !== "object") return null;
      if (Object.prototype.hasOwnProperty.call(val, "stringValue")) return String(val.stringValue || "");
      if (Object.prototype.hasOwnProperty.call(val, "booleanValue")) return !!val.booleanValue;
      if (Object.prototype.hasOwnProperty.call(val, "integerValue")) return Number(val.integerValue);
      if (Object.prototype.hasOwnProperty.call(val, "doubleValue")) return Number(val.doubleValue);
      if (Object.prototype.hasOwnProperty.call(val, "mapValue")) {
        const out = {};
        const fields = (val.mapValue && val.mapValue.fields) ? val.mapValue.fields : {};
        Object.keys(fields).forEach(key => { out[key] = decodeFirestoreValue(fields[key]); });
        return out;
      }
      if (Object.prototype.hasOwnProperty.call(val, "arrayValue")) {
        const values = (val.arrayValue && Array.isArray(val.arrayValue.values)) ? val.arrayValue.values : [];
        return values.map(decodeFirestoreValue);
      }
      return null;
    }

    function fetchSiteStateOnce(){
      try {
        const pid = "z3em-d9b11";
        fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/config/siteState`)
          .then(r => r.json())
          .then(doc => {
            const fields = (doc && doc.fields) ? doc.fields : {};
            const data = decodeFirestoreValue({ mapValue: { fields } }) || {};
            applyTheme(data.theme || {});
            applyMaintenance(data.maintenance || {});
          })
          .catch(() => {});
      } catch {}
    }

    function startListener() {
      if (started) return;
      if (!shouldEnableRealtime('siteState')) {
        started = true;
        ensureCss();
        fetchSiteStateOnce();
        return;
      }
      if (!window.firebase || !firebase.apps?.length) { log("firebase not ready"); return; }
      started = true;
      ensureCss();
      const db = firebase.firestore();
      log("listener started");
      db.collection("config").doc("siteState").onSnapshot(
        (snap)=>{
          const data = snap && snap.exists ? snap.data() : {};
          log("snapshot", data);
          applyTheme(data.theme || {});
          applyMaintenance(data.maintenance || {});
        },
        (err)=> log("snapshot error", err?.message||err)
      );
    }

    function waitForFirebase(attempt=0){
      if (window.firebase && firebase.apps?.length) { log("firebase ready", attempt); startListener(); return; }
      if (attempt > 30) { log("firebase not ready after retries"); return; }
      setTimeout(() => waitForFirebase(attempt+1), 1000);
    }

    waitForFirebase();
  } catch (err) {
    log("siteState listener failed", err?.message||err);
  }
})();
