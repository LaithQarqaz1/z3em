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

// Auto-retry worker requests when session key errors occur
(function setupSessionKeyAutoRetry(){
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    if (window.__SESSION_KEY_RETRY_PATCHED__) return;
    const nativeFetch = window.fetch.bind(window);
    window.__SESSION_KEY_RETRY_PATCHED__ = true;

    const SESSION_HEADER = 'X-SessionKey';
    const SESSION_ERROR_CODES = new Set(['session_missing','session_invalid','session_mismatch','session_expired']);
    const RAND_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const RAND_SYMBOLS = '!@#$%&';
    let rotatePromise = null;

    function requestCarriesSession(req){
      try { return !!req.headers.get(SESSION_HEADER); } catch { return false; }
    }
    function normalizeCode(val){
      return (typeof val === 'string' ? val : '').trim().toLowerCase();
    }
    function isSessionCode(code){
      if (!code) return false;
      return SESSION_ERROR_CODES.has(code) || code.startsWith('session_');
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
      if (window.crypto && crypto.getRandomValues){
        const buf = new Uint32Array(length);
        crypto.getRandomValues(buf);
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
    async function detectSessionError(resp){
      if (!resp || typeof resp.clone !== 'function') return null;
      let payload = null;
      try { payload = await resp.clone().json(); } catch { payload = null; }
      if (!payload) return null;
      const code = grabSessionCode(payload);
      if (!isSessionCode(code)) return null;
      return { code, ttlSeconds: extractTtl(payload) };
    }

    window.fetch = async function sessionAwareFetch(input, init){
      let request;
      try { request = new Request(input, init); }
      catch (_) { return nativeFetch(input, init); }
      if (!requestCarriesSession(request)) {
        return nativeFetch(request);
      }

      const firstResponse = await nativeFetch(request.clone());
      const sessionError = await detectSessionError(firstResponse);
      if (!sessionError) return firstResponse;

      const newKey = await rotateSessionKey(sessionError.ttlSeconds);
      if (!newKey) return firstResponse;

      let retryRequest;
      try {
        const headers = new Headers(request.headers);
        headers.set(SESSION_HEADER, newKey);
        retryRequest = new Request(request, { headers, signal: request.signal });
      } catch (err) {
        console.warn('Failed to rebuild request for session retry:', err);
        return firstResponse;
      }
      try {
        return await nativeFetch(retryRequest);
      } catch (retryErr) {
        console.warn('Retry after session rotation failed:', retryErr);
        return firstResponse;
      }
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

    const STORE_BASE_CODE = 'USD'; // الرصيد المخزن في قاعدة البيانات بالدولار الأمريكي
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
        // مفاتيح غير مقتبسة → اقتباسها
        s = s.replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:/g,'$1"$2":');
        // مفاتيح مقتبسة بأقواس مفردة → مزدوجة
        s = s.replace(/([\{,]\s*)'([^']*)'\s*:/g,'$1"$2":');
        // قيم نصية مفردة → مزدوجة
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
      const s = String(t).replace(/[\u0660-\u0669]/g, (d)=> String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits → Latin
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
        li.innerHTML = '<i class="fa-solid fa-sack-dollar"></i><a href="#">العملة</a>';
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

// Sidebar toggle
function toggleSidebar(){
  const el = document.getElementById('sidebar');
  if (!el) { console.warn('الشريط الجانبي غير موجود بعد.'); return; }
  el.classList.toggle('active');
}

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
logo.alt = 'متجر زعيم';
logo.className = 'header-logo';
logo.setAttribute('fetchpriority','high');
logo.loading = 'eager';
logo.decoding = 'async';
(function(){ try { const href = logo.src; if (href && document.head && !document.querySelector(`link[rel='preload'][as='image'][href='${href}']`)){ const l = document.createElement('link'); l.rel='preload'; l.as='image'; l.href=href; document.head.appendChild(l); } } catch {} })();
const logoLink = document.createElement('a');
logoLink.href = 'index.html';
logoLink.setAttribute('aria-label','العودة إلى الرئيسية');
logoLink.style.marginLeft = '0';
logoLink.style.marginRight = 'auto';
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
leftContainer.style.display = 'flex';
leftContainer.style.alignItems = 'center';
leftContainer.style.gap = '10px';
leftContainer.appendChild(hamburger);
leftContainer.appendChild(balanceSpan);

header.appendChild(leftContainer);
header.appendChild(logoLink);

// Balance helpers
let unsubscribeBalance = null;
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
  const hasDigits = /[0-9٠-٩]/.test(trimmed);
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
homeLi.innerHTML = '<i class="fas fa-home"></i><a href="#">الرئيسية</a>';
ul.appendChild(homeLi);
// الإيداع
const depositLi = document.createElement('li');
depositLi.id = 'depositBtn';
depositLi.innerHTML = '<i class="fa-solid fa-circle-dollar-to-slot"></i><a href="#">الإيداع</a>';
depositLi.onclick = () => navigateTo('edaa.html');
depositLi.style.display = 'none';
ul.appendChild(depositLi);
// طلباتي
const ordersLi = document.createElement('li');
ordersLi.onclick = () => navigateTo('talabat.html');
ordersLi.innerHTML = '<i class="fas fa-list"></i><a href="#">طلباتي</a>';
ul.appendChild(ordersLi);
// محفظتي
const walletLi = document.createElement('li');
walletLi.id = 'walletBtn';
walletLi.innerHTML = '<i class="fas fa-wallet"></i><a href="#">محفظتي</a>';
walletLi.onclick = () => navigateHomeHash('#/wallet','wallet');
walletLi.style.display = 'none';
ul.appendChild(walletLi);
// تحويل الرصيد
const transferLi = document.createElement('li');
transferLi.id = 'transferBtn';
transferLi.innerHTML = '<i class="fa-solid fa-right-left"></i><a href="#">تحويل رصيد</a>';
transferLi.onclick = () => navigateHomeHash('#/transfer','transfer');
transferLi.style.display = 'none';
ul.appendChild(transferLi);
// التقييمات
const reviewsLi = document.createElement('li');
reviewsLi.innerHTML = '<i class="fa-solid fa-star"></i><a href="#">التقييمات</a>';
reviewsLi.onclick = () => navigateHomeHash('#/reviews','reviews');
ul.appendChild(reviewsLi);
// الإعدادات
const settingsLi = document.createElement('li');
settingsLi.id = 'settingsBtn';
settingsLi.innerHTML = '<i class="fa-solid fa-gear"></i><a href="#">الإعدادات</a>';
settingsLi.onclick = () => navigateHomeHash('#/settings','settings');
settingsLi.style.display = 'none';
ul.appendChild(settingsLi);
// تسجيل الدخول / الخروج
const loginLi = document.createElement('li');
loginLi.id = 'loginSidebarBtn';
loginLi.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><a href="#">تسجيل الدخول</a>';
loginLi.onclick = () => navigateTo('login.html');
ul.appendChild(loginLi);
const logoutLi = document.createElement('li');
logoutLi.id = 'logoutBtn';
logoutLi.style.display = 'none';
logoutLi.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i><a href="#">تسجيل الخروج</a>';
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
  const hc = document.getElementById('headerContainer'); if (hc) hc.appendChild(header);
  const sc = document.getElementById('sidebarContainer'); if (sc) sc.appendChild(sidebar);
  document.addEventListener('click', (e)=>{ const a = e.target.closest ? e.target.closest('a[href$=".html"]') : null; if (a) { try { sessionStorage.setItem('nav:fromHome','1'); } catch {} } });
  // Ensure support anchor exists for sidebar link
  try { const sec = document.querySelector('section.support-section'); if (sec && !sec.id) sec.id = 'support'; } catch {}
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
    if (typeof unsubscribeBalance === 'function') { try { unsubscribeBalance(); } catch (err) { console.warn('unsubscribeBalance error:', err); } unsubscribeBalance = null; }
    const loginBtn = document.getElementById('loginSidebarBtn');
    const depositBtn = document.getElementById('depositBtn');
    const walletBtn = document.getElementById('walletBtn');
    const transferBtn = document.getElementById('transferBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (user) {
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
          const raw = snap.data().balance ?? 0; const num = Number(raw); const val = Number.isFinite(num) ? num : 0;
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
    const title = document.createElement('h2'); title.className = 'support-title'; title.textContent = 'متواجدون لمساعدتك'; section.appendChild(title);
    const iconsDiv = document.createElement('div'); iconsDiv.className = 'support-icons';
    const contacts = [
      { href: '', iconURL: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg', class: 'telegram' },
      { href: '', iconURL: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg', class: 'instagram' },
      { href: '', iconURL: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg', class: 'whatsapp' },
      { href: '', iconURL: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg', class: 'facebook' },
      { href: '', iconURL: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gmail.svg', class: 'email' },
    ];
    contacts.forEach(c => { const a = document.createElement('a'); a.href = c.href; a.target = '_blank'; a.className = 'support-icon ' + c.class; const img = document.createElement('img'); img.src = c.iconURL; img.alt = c.class + ' icon'; img.style.width = '32px'; img.style.height = '32px'; a.appendChild(img); iconsDiv.appendChild(a); });
    section.appendChild(iconsDiv);
    document.body.appendChild(section);
  } catch {}
})();

// Override support/contact links to the latest provided ones
(function(){
  try{
    var links = {
      whatsapp: 'https://wa.me/963981983751',
      telegram: 'https://t.me/963969898534',
      facebook: 'https://www.facebook.com/share/1B1b48AcqV/',
      email: 'mailto:hazemediek@gmail.com',
      instagram: 'https://www.instagram.com/z3.i.m?igsh=MXRwZGl6dXh2YTd2Zg=='
    };

    function applySupportLinks(){
      var defs = [
        { key: 'whatsapp', sels: ['a.support-icon.whatsapp','i.fa-whatsapp'] },
        { key: 'telegram', sels: ['a.support-icon.telegram','i.fa-telegram','i.fa-telegram-plane','i.fa-paper-plane'] },
        { key: 'facebook', sels: ['a.support-icon.facebook','i.fa-facebook','i.fa-facebook-f'] },
        { key: 'email', sels: ['a.support-icon.email','i.fa-envelope','a[href^="mailto:"]'] },
        { key: 'instagram', sels: ['a.support-icon.instagram','i.fa-instagram'] }
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
          document.querySelectorAll(finalSelector).forEach(function(el){
            var a = ensureAnchor(el);
            if(!a) return;
            if (d.key === 'telegram') {
              var appHref = 'tg://resolve?phone=201104453086';
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
            } else if (d.key === 'email') {
              a.setAttribute('href', href);
              a.addEventListener('click', function(ev){ try{ ev.preventDefault(); window.location.href = href; }catch(_){ } }, { once: true });
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

// Ensure developer credit under قم بتغيير رقم الواتساب الخاص بالدعم بthe Support section
(function ensureSupportDevCredit(){
  try{
    var CREDIT = {
      href: 'https://wa.me/962790108559', 
      label: '🔗 تم تطوير المنصة بواسطة LaithDev.',
      tagline: ''
    };

    // Add style to limit clickable area
    const creditStyle = document.createElement('style');
    creditStyle.textContent = `
      .support-rights {
      pointer-events: none; /* Disable clicks on container */
      }
      .support-rights a {
      pointer-events: auto; /* Re-enable clicks just on link */
      display: inline-block; /* Contains the clickable area */
      padding: 5px 10px; /* Add some padding for better touch target */
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
        anchor.textContent = CREDIT.label;

        var tagline = rights.querySelector('p');
        if (!tagline){
          tagline = document.createElement('p');
          rights.appendChild(tagline);
        }
        tagline.textContent = CREDIT.tagline;
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

