// تقويم منبثق بسيط مع إبراز الأيام
const CAL = { el: null, year: 0, month: 0 };
function openCalendar(){
  const minDateStr = getMinDateStr(3);
  if (!SELECTED_DATE_STR || SELECTED_DATE_STR < minDateStr) {
    SELECTED_DATE_STR = minDateStr;
    SELECTED_DATE_MANUAL = false; // تم تعيينه تلقائيًا كحد أدنى
  }
  const base = (SELECTED_DATE_STR || getTodayStr()).split('-').map(Number);
  CAL.year = base[0] || (new Date()).getFullYear();
  CAL.month = ((base[1]||1) - 1);
  if (!CAL.el){
    const overlay = document.createElement('div');
    overlay.className = 'calendar-popover';
    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closeCalendar(); });
    const panel = document.createElement('div');
    panel.className = 'calendar-panel';
    panel.innerHTML = `
      <div class="calendar-header">
        <button type="button" class="cal-nav" id="calPrev">‹</button>
        <div class="cal-title" id="calTitle"></div>
        <button type="button" class="cal-nav" id="calNext">›</button>
      </div>
      <div class="calendar-sub">
        <div class="calendar-mode">
          <button type="button" class="calendar-mode-btn" id="calModeSingle">يوم واحد</button>
          <button type="button" class="calendar-mode-btn" id="calModeRange">نطاق</button>
        </div>
        <div class="calendar-selection" id="calSelectionText"></div>
      </div>
      <div class="calendar-grid" id="calGrid"></div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    CAL.el = overlay;
    panel.querySelector('#calPrev').onclick = ()=> shiftMonth(-1);
    panel.querySelector('#calNext').onclick = ()=> shiftMonth(+1);
    // تبديل وضع التاريخ
    const btnSingle = panel.querySelector('#calModeSingle');
    const btnRange = panel.querySelector('#calModeRange');
    if (btnSingle) btnSingle.onclick = () => {
      DATE_MODE = 'single';
      renderCalendar(CAL.year, CAL.month);
    };
    if (btnRange) btnRange.onclick = () => {
      DATE_MODE = 'range';
      // إن لم يكن من/إلى محددَين، عين البداية اليوم
      if (!DATE_RANGE.from){ DATE_RANGE.from = SELECTED_DATE_STR || getTodayStr(); }
      renderCalendar(CAL.year, CAL.month);
    };
  }
  renderCalendar(CAL.year, CAL.month);
}
function closeCalendar(){ try{ if (CAL.el){ CAL.el.remove(); CAL.el = null; } }catch(_){}}
function shiftMonth(delta){ let y=CAL.year, m=CAL.month+delta; if(m<0){m=11;y--;} else if(m>11){m=0;y++;} CAL.year=y; CAL.month=m; renderCalendar(y,m); }
function renderCalendar(year, month){
  if (!CAL.el) return;
  const titleEl = CAL.el.querySelector('#calTitle');
  const grid = CAL.el.querySelector('#calGrid');
  const counts = computeDateCounts();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0).getDate();
  const dow = first.getDay();
  const todayStr = getTodayStr();
  const minDateStr = getMinDateStr(3);
  // ضبط أزرار التنقل حسب الحدود (لا شهر قادم ولا قبل 3 أشهر)
  try{
    const prevBtn = CAL.el.querySelector('#calPrev');
    const nextBtn = CAL.el.querySelector('#calNext');
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();
    const [minY, minM] = minDateStr.split('-').map(Number);
    const atMin = (year < minY) || (year === minY && month <= (minM-1));
    const atMax = (year > curY) || (year === curY && month >= curM);
    if (prevBtn){ prevBtn.disabled = atMin; prevBtn.setAttribute('aria-disabled', atMin?'true':'false'); prevBtn.style.opacity = atMin?'.5':'1'; prevBtn.onclick = () => { if (!prevBtn.disabled) shiftMonth(-1); }; }
    if (nextBtn){ nextBtn.disabled = atMax; nextBtn.setAttribute('aria-disabled', atMax?'true':'false'); nextBtn.style.opacity = atMax?'.5':'1'; nextBtn.onclick = () => { if (!nextBtn.disabled) shiftMonth(+1); }; }
  }catch{}
  try{ titleEl.textContent = first.toLocaleDateString('ar-EG',{month:'long',year:'numeric'}); }catch{ titleEl.textContent = `${year}-${pad2(month+1)}`; }
  // وضع الأزرار ونص الاختيار
  try{
    const b1 = CAL.el.querySelector('#calModeSingle');
    const b2 = CAL.el.querySelector('#calModeRange');
    if (b1) b1.classList.toggle('active', DATE_MODE === 'single');
    if (b2) b2.classList.toggle('active', DATE_MODE === 'range');
    const sel = CAL.el.querySelector('#calSelectionText');
    if (sel){
      if (DATE_MODE === 'range'){
        const f = DATE_RANGE.from, t = DATE_RANGE.to;
        if (f && t) sel.textContent = `من ${formatArDateStr(f)} إلى ${formatArDateStr(t)}`;
        else if (f && !t) sel.textContent = `ابدأ: ${formatArDateStr(f)} — اختر النهاية`;
        else sel.textContent = 'اختر نطاق تاريخ';
      } else {
        const ymd = SELECTED_DATE_STR || getTodayStr();
        sel.textContent = `${formatArDateStr(ymd)}`;
      }
    }
  }catch{}
  const weekdays = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  let html = '';
  for(let i=0;i<7;i++){ html += `<div class="calendar-weekday">${weekdays[i]}</div>`; }
  for(let i=0;i<dow;i++){ html += `<div class="calendar-spacer"></div>`; }
  const selected = SELECTED_DATE_STR || todayStr;
  const f = DATE_RANGE?.from || null;
  const t = DATE_RANGE?.to || null;
  const from = (f && t && f > t) ? t : f;
  const to = (f && t && f > t) ? f : t;
  for(let d=1; d<=lastDay; d++){
    const ymd = `${year}-${pad2(month+1)}-${pad2(d)}`;
    const cnt = counts[ymd]||0;
    const has = cnt>0 ? ' has' : '';
    let active = '';
    let rangeCls = '';
    if (DATE_MODE === 'range'){
      if (from && to && ymd > from && ymd < to) rangeCls += ' in-range';
      if (from && ymd === from) { rangeCls += ' range-start'; active = ' active'; }
      if (to && ymd === to) { rangeCls += ' range-end'; active = ' active'; }
    } else {
      active = (ymd===selected) ? ' active' : '';
    }
    const disabled = (ymd > todayStr || ymd < minDateStr) ? ' disabled' : '';
    const disAttr = disabled ? ' disabled aria-disabled="true"' : '';
    html += `<button type="button" class="calendar-day${has}${rangeCls}${active}${disabled}" data-date="${ymd}"${disAttr}><span class="num">${d}</span>${cnt? `<span class="count">${cnt}</span>`:''}</button>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.calendar-day').forEach(btn=>{
    if (btn.classList.contains('disabled')) return;
    btn.onclick = ()=>{
      const ymd = btn.getAttribute('data-date');
      if (DATE_MODE === 'range'){
        if (!DATE_RANGE.from || (DATE_RANGE.from && DATE_RANGE.to)){
          DATE_RANGE = { from: ymd, to: null };
          renderCalendar(year, month);
          return;
        } else if (DATE_RANGE.from && !DATE_RANGE.to){
          if (ymd < DATE_RANGE.from){ DATE_RANGE = { from: ymd, to: DATE_RANGE.from }; }
          else { DATE_RANGE.to = ymd; }
          closeCalendar();
          syncToolbarUI();
          recomputeAndRender();
          return;
        }
      } else {
        SELECTED_DATE_STR = ymd || getTodayStr();
        SELECTED_DATE_MANUAL = true; // تم اختيار التاريخ يدويًا من التقويم
        closeCalendar();
        syncToolbarUI();
        recomputeAndRender();
      }
    };
  });
}// ===== Firebase init =====
const ordersFirebaseConfig = (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__)
  ? window.__FIREBASE_CONFIG__
  : {
      apiKey:"AIzaSyBRVEViuKnCUZqBoD0liuA-P0DVN7mTePA",
      authDomain:"z3em-d9b11.firebaseapp.com",
      projectId:"z3em-d9b11",
      storageBucket:"z3em-d9b11.firebasestorage.app",
      messagingSenderId:"236716520945",
      appId:"1:236716520945:web:a0c336db7dc7079c190050",
      measurementId:"G-1GG6DE12K6"
    };

// Reuse existing app if already initialized on this page
const app = (firebase.apps && firebase.apps.length)
  ? firebase.app()
  : firebase.initializeApp(ordersFirebaseConfig);
const ordersDb = firebase.firestore();
const ordersAuth = firebase.auth();

// ========= Manual Worker base (for provider-check) =========
const WORKER_DEFAULT = "https://z3em-manwal.laithqarqaz1.workers.dev/";
function getManualBase() {
  try {
    const custom = localStorage.getItem("MANWAL_ROUTER_BASE");
    if (custom) return custom;
  } catch (_) {}
  return WORKER_DEFAULT;
}
function buildProviderCheckUrl({ orderUuid = "", orderId = "" } = {}) {
  const uuid = String(orderUuid || "").trim();
  const id = String(orderId || "").trim();
  try {
    const url = new URL(getManualBase());
    url.searchParams.set("mode", "provider-check");
    if (uuid) url.searchParams.set("order_uuid", uuid);
    else if (id) url.searchParams.set("order_id", id);
    return url.toString();
  } catch (_) {
    if (uuid) return `${WORKER_DEFAULT}?mode=provider-check&order_uuid=${encodeURIComponent(uuid)}`;
    return `${WORKER_DEFAULT}?mode=provider-check&order_id=${encodeURIComponent(id)}`;
  }
}
function getStoredSessionKey(uid) {
  try {
    const raw = localStorage.getItem("sessionKeyInfo");
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== "object") return "";
    if (uid && obj.uid && String(obj.uid) !== String(uid)) return "";
    return (obj.sessionKey || "").toString().trim();
  } catch (_) {
    return "";
  }
}

// ========= إعدادات عامة =========
const STATUS_REFRESH_WINDOW_DAYS = 7; // عدد الأيام التي نحدّث فيها حالة الطلب عند كل دخول
const PAGINATION = { size: Number.MAX_SAFE_INTEGER, page: 1, orders: [] };
const ORDER_ANIM_EXIT_MS = 220;
// عند تغيّر الفلاتر/البحث نريد إعادة رسم فوري بدون أنيميشن (لتجنب القلتشات وإعادة التحريك).
let SUPPRESS_ORDER_ANIM = false;
// Keep order details open across re-renders (initial sync, filters, etc.).
const OPEN_ORDER_CODES = new Set();

// تفضيلات العرض (مثل المحفظة)
let ORDERS_FILTER = 'all';   // all | pending | approved | rejected
let SELECTED_DATE_STR = null; // 'YYYY-MM-DD' — التاريخ المختار (محلي)
let SELECTED_DATE_MANUAL = false; // هل اختاره المستخدم يدويًا؟
// وضع التاريخ: يوم واحد أو نطاق
let DATE_MODE = 'single'; // 'single' | 'range'
let DATE_RANGE = { from: null, to: null }; // في حال النطاق
let SEARCH_QUERY = ""; // نص البحث الحر (كود الطلب، الايدي، المزود، ... )

function pad2(n){ return (n<10? '0':'') + n; }
function getTodayStr(){ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function getMinDateStr(monthsBack){ const d=new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - (monthsBack||0)); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function formatArDateStr(str){ try{ const [y,m,da]=str.split('-').map(Number); const d=new Date(y, (m||1)-1, da||1); return d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}); }catch{ return str; } }
function isSameDayMs(ms, ymd){ if(!ms||!ymd) return false; try{ const d=new Date(ms); const s=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; return s===ymd; }catch{ return false; } }

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonParse(str, fallback = null){
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatLinkDisplay(raw){
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("data:")) {
    return `<span>${escapeHtml(trimmed)}</span>`;
  }
  let href = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes(".")) href = `https://${trimmed}`;
    else return `<span>${escapeHtml(trimmed)}</span>`;
  }
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(trimmed)}</a>`;
}

function pickTextValue(value){
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function extractProviderResponseFromParsed(parsed){
  if (!parsed) return "";
  if (Array.isArray(parsed)) {
    const responses = parsed.map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      return pickTextValue(entry.response) || pickTextValue(entry.note);
    }).filter(Boolean);
    return responses.length ? responses.join("\n") : "";
  }
  if (typeof parsed === "object") {
    const direct = pickTextValue(parsed.response) || pickTextValue(parsed.note);
    if (direct) return direct;
    const nested =
      pickTextValue(parsed.data?.response) ||
      pickTextValue(parsed.data?.note) ||
      pickTextValue(parsed.data?.order?.response) ||
      pickTextValue(parsed.data?.order?.note) ||
      pickTextValue(parsed.order?.response) ||
      pickTextValue(parsed.order?.note);
    if (nested) return nested;
  }
  return "";
}

// إخفاء معلومات حساسة قد تظهر في رد المزود (legacy data) مثل before/after/amount/uuid
function redactProviderUserText(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  const SENSITIVE_KEYS = new Set(["before", "befor", "after", "amount", "uuid"]);
  const redactObject = (value) => {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(redactObject);
    if (typeof value !== "object") return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = String(k || "").trim().toLowerCase();
      if (SENSITIVE_KEYS.has(key)) out[k] = "[redacted]";
      else out[k] = redactObject(v);
    }
    return out;
  };

  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(redactObject(parsed));
  } catch {}

  return text.replace(
    /(\b(?:after|befor|before|amount|uuid)\b\s*[:=]\s*)(\"[^\"]*\"|[^\s,]+)/gi,
    "$1[redacted]"
  );
}

function extractProviderCodes(parsed){
  const codes = new Set();
  const consume = (obj) => {
    if (!obj || typeof obj !== "object") return;
    const candidates = [
      obj.code, obj.Code, obj.CODE,
      obj.voucher, obj.voucher_code, obj.voucherCode,
      obj.serial, obj.serial_code, obj.serialCode,
      obj.pin, obj.pin_code, obj.pinCode,
      obj.coupon, obj.coupon_code, obj.couponCode,
      obj.key, obj.activationKey, obj.card, obj.card_number
    ];
    candidates.forEach((v)=>{ const s = pickTextValue(v); if (s) codes.add(s); });
    if (obj.data) consume(obj.data);
    if (obj.order) consume(obj.order);
    if (obj.result) consume(obj.result);
  };
  if (Array.isArray(parsed)) parsed.forEach(consume);
  else consume(parsed);
  return Array.from(codes);
}

function normalizeOffersArray(raw){
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed)) return parsed;
  }
  return [];
}

function isValidPlayerId(value) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (/^0+$/.test(v)) return false; // 0 / 00 / 0000 ...
  if (/^(?:غير\s*متوفر|غير\s*موجود|غير\s*مطلوب)$/i.test(v)) return false;
  return true;
}

function splitOffersText(raw){
  const text = String(raw || "").replace(/\r/g, "").trim();
  if (!text) return [];
  let parts = text.split("•").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1 && text.includes("\n")) {
    parts = text.split("\n").map((p) => p.trim()).filter(Boolean);
  }
  return parts
    .map((p) => p.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function formatOffersHtml(order){
  const offersList = normalizeOffersArray(order?.offers || order?.offersList || order?.offerItems);
  if (offersList.length) {
    const items = offersList.map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const name = entry.name || entry.title || entry.label || entry.offer || entry.offerName || entry.productName || entry.product || "";
      const qty = entry.qty ?? entry.quantity ?? entry.count;
      if (!name && (qty == null || qty === "")) return "";
      const safeName = escapeHtml(String(name || "-").trim());
      const qtyText = (qty == null || qty === "") ? "" : `<div class="offer-qty">الكمية: ${escapeHtml(String(qty))}</div>`;
      return `<li class="offer-item"><div class="offer-name">${safeName}</div>${qtyText}</li>`;
    }).filter(Boolean).join("");
    return items ? `<ul class="offers-list">${items}</ul>` : "";
  }
  const offersText = order?.["العروض"] || order?.offersText || "";
  const parts = splitOffersText(offersText);
  if (!parts.length) return "";
  const items = parts.map((part) => `<li>${escapeHtml(part)}</li>`).join("");
  return `<ul style="padding-right:20px;">${items}</ul>`;
}

function getCurrencyContext(){
  let rates = null;
  let base = null;
  let selected = null;
  try { rates = window.__CURRENCIES__ || null; } catch {}
  try { base = window.__CURRENCY_BASE__ || null; } catch {}
  try {
    if (typeof window.getSelectedCurrencyCode === "function") {
      selected = window.getSelectedCurrencyCode();
    }
  } catch {}
  if (!selected) {
    try { selected = localStorage.getItem("currency:selected"); } catch {}
  }
  if (selected) selected = String(selected).toUpperCase();
  if (base) base = String(base).toUpperCase();
  return { rates, base, selected };
}

function normalizeCurrencyCode(value, rates){
  if (!value || !rates) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (rates[upper]) return upper;
  const rawLower = raw.toLowerCase();
  for (const cur of Object.values(rates)) {
    if (!cur || typeof cur !== "object") continue;
    const code = String(cur.code || "").toUpperCase();
    const symbol = String(cur.symbol || "").trim();
    const nameAr = String(cur.nameAr || "").trim();
    const name = String(cur.name || "").trim();
    if (code && rawLower === code.toLowerCase()) return code;
    if (symbol && raw === symbol) return code || null;
    if (nameAr && raw === nameAr) return code || null;
    if (name && rawLower === name.toLowerCase()) return code || null;
  }
  return null;
}

function convertAmountWithRates(amount, fromCode, toCode, rates, base){
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (!fromCode || !toCode || !rates) return null;
  const baseCode = base || "";
  if (fromCode === toCode) return n;
  const rFrom = (fromCode === baseCode) ? 1 : Number(rates[fromCode]?.rate);
  const rTo = (toCode === baseCode) ? 1 : Number(rates[toCode]?.rate);
  if (!Number.isFinite(rFrom) || rFrom <= 0) return null;
  if (!Number.isFinite(rTo) || rTo <= 0) return null;
  const baseAmt = (fromCode === baseCode) ? n : (n / rFrom);
  return (toCode === baseCode) ? baseAmt : (baseAmt * rTo);
}

function getCurrencySymbol(code, rates){
  if (!code) return "";
  const cur = rates && rates[code];
  return (cur && (cur.symbol || cur.code)) ? (cur.symbol || cur.code) : code;
}

function formatAmountDisplay(totalStr, total, currency){
  const parseAmount = (value) => {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      if (!cleaned) return null;
      const num = Number(cleaned);
      if (Number.isFinite(num)) return num;
    }
    return null;
  };
  const fromStr = parseAmount(totalStr);
  const fromTotal = parseAmount(total);
  const rawAmount = fromStr != null ? fromStr : fromTotal;
  let fallbackAmount = null;
  if (fromStr != null) fallbackAmount = fromStr.toFixed(2);
  else if (fromTotal != null) fallbackAmount = fromTotal.toFixed(2);
  else if (totalStr) fallbackAmount = String(totalStr);
  else fallbackAmount = total != null ? String(total) : "-";

  const { rates, base, selected } = getCurrencyContext();
  if (rawAmount != null && rates && selected) {
    const toCode = normalizeCurrencyCode(selected, rates);
    const hasCurrency = currency != null && String(currency).trim() !== "";
    let fromCode = normalizeCurrencyCode(currency, rates);
    if (!fromCode && !hasCurrency && base) fromCode = base;
    if (fromCode && toCode) {
      const converted = convertAmountWithRates(rawAmount, fromCode, toCode, rates, base);
      if (Number.isFinite(converted)) {
        const symbol = getCurrencySymbol(toCode, rates);
        return `${converted.toFixed(2)} ${symbol}`.trim();
      }
    }
  }

  if (currency) return `${fallbackAmount} ${currency}`.trim();
  return fallbackAmount;
}

// نص زر التاريخ: إن كان الاختيار يدويًا لا نعرض "اليوم" حتى لو كان نفس يوم اليوم
function getDateChipText(){
  if (DATE_MODE === 'range'){
    // لا نعرض تفاصيل النطاق في الأعلى — فقط عنوان مختصر
    return 'التاريخ';
  }
  const today = getTodayStr();
  const ymd = SELECTED_DATE_STR || today;
  return 'التاريخ: ' + formatArDateStr(ymd);
}

function normOrderStatus(s){
  const v = String(s || '').toLowerCase();
  if (
    v.includes('تم_الشحن') ||
    v.includes('تم الشحن') ||
    v.includes('shipped') ||
    v.includes('تم-الشحن') ||
    v.includes('completed') ||
    v.includes('success') ||
    v.includes('partial') ||
    v.includes('مكتمل') ||
    v.includes('مكتمل جزئ')
  ) return 'approved';
  if (
    v.includes('reject') ||
    v.includes('رفض') ||
    v.includes('مرفوض') ||
    v.includes('cancel') ||
    v.includes('ملغي') ||
    v.includes('fail')
  ) return 'rejected';
  return 'pending';
}

function formatStatusLabel(value){
  const raw = String(value || '').trim();
  if (!raw) return 'قيد المعالجة';
  if (raw === 'تم_الشحن') return 'تم الشحن';
  const normalized = raw.toLowerCase();
  if (normalized.includes('مكتمل') || normalized === 'completed' || normalized === 'success') return 'مكتمل';
  if (normalized === 'partial') return 'مكتمل جزئياً';
  if (normalized.includes('ملغي') || normalized === 'canceled' || normalized === 'cancelled') return 'ملغي';
  if (normalized.includes('مرفوض') || normalized.startsWith('reject') || normalized === 'failed' || normalized === 'fail') return 'مرفوض';
  if (
    normalized.includes('pending') ||
    normalized.includes('processing') ||
    normalized.includes('progress') ||
    normalized.includes('running')
  ) return 'قيد التنفيذ';
  return raw;
}

function getOrderTimeMs(o){
  try {
    const t = o && o.timestamp; if (!t) return 0;
    if (t.toDate) return t.toDate().getTime();
    if (typeof t === 'object' && t.seconds) return (t.seconds * 1000) | 0;
    const ms = new Date(t).getTime();
    return Number.isFinite(ms) ? ms : 0;
  } catch { return 0; }
}

function applyOrdersFilter(list){
  if (ORDERS_FILTER === 'all') return list;
  return (list || []).filter(o => {
    const n = normOrderStatus(o?.status);
    if (ORDERS_FILTER === 'approved') return n === 'approved';
    if (ORDERS_FILTER === 'rejected') return n === 'rejected';
    return n === 'pending';
  });
}

function applyDateFilter(list){
  const arr = list || [];
  if (DATE_MODE === 'range'){
    const f = DATE_RANGE?.from, t = DATE_RANGE?.to;
    if (f && t){
      const from = f <= t ? f : t;
      const to = t >= f ? t : f;
      return arr.filter(o => {
        const ms = getOrderTimeMs(o); if(!ms) return false;
        const d = new Date(ms); const ymd = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
        return (ymd >= from && ymd <= to);
      });
    }
    if (f && !t){
      return arr.filter(o => isSameDayMs(getOrderTimeMs(o), f));
    }
    return arr; // لا فلترة إن لم يُحدَّد شيء
  }
  const ymd = SELECTED_DATE_STR || getTodayStr();
  return arr.filter(o => isSameDayMs(getOrderTimeMs(o), ymd));
}

// فلترة نصية (كود الطلب، الايدي، المزود، المزود رقم الطلب، العروض)
function normalizeSearchText(v){
  return String(v || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "") // إزالة التشكيل
    .trim();
}

function orderMatchesSearch(o, qNorm){
  if (!qNorm) return true;
  const fields = [];
  fields.push(o?.code);
  fields.push(o?.playerId || o?.playerID || o?.useruid || o?.uid);
  fields.push(o?.player || o?.playerName || o?.player_name || o?.playerUid || o?.player_uid || o?.userId || o?.user_id);
  if (o?.__pub && typeof o.__pub === 'object'){
    fields.push(o.__pub.player);
    fields.push(o.__pub.playerId || o.__pub.playerID);
  }
  fields.push(o?.providerOrderId || o?.provider_order_id || o?.orderId || o?.order_id);
  // المبلغ
  const amtRaw = (o?.total ?? o?.amount ?? o?.price ?? o?.cost);
  const amtNum = Number(amtRaw);
  const symMap = { USD: "$", EUR: "€", GBP: "£", SAR: "ر.س", AED: "د.إ", KWD: "د.ك", QAR: "ر.ق", BHD: "د.ب", OMR: "ر.ع", JOD: "د.ا" };
  const curCode = (o?.currency || "").toUpperCase();
  const sym = symMap[curCode] || "";
  if (Number.isFinite(amtNum)) {
    fields.push(String(amtNum));
    fields.push(amtNum.toFixed(2));
    fields.push(`${amtNum}`.replace('.', ',')); // دعم فواصل
    if (curCode) {
      fields.push(`${amtNum.toFixed(2)} ${curCode}`);
      if (sym) fields.push(`${sym}${amtNum.toFixed(2)}`);
    }
  }
  if (o?.currency) fields.push(o.currency);
  if (o?.totalStr || o?.totalDisplay) fields.push(o.totalStr || o.totalDisplay);

  const normFields = fields.filter(Boolean).map(normalizeSearchText);
  const isDigitsOnly = /^[0-9]+$/.test(qNorm);
  if (isDigitsOnly) {
    return normFields.some(f => f === qNorm || f.includes(qNorm));
  }
  return normFields.some(f => f.includes(qNorm));
}

function applySearchFilter(list){
  const q = normalizeSearchText(SEARCH_QUERY);
  if (!q) return list || [];
  return (list || []).filter(o => orderMatchesSearch(o, q));
}

// لم يعد هناك فرز زمني قابل للتبديل

function recomputeAndRender(){
  const uid = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid;
  if (!uid) return;
  SUPPRESS_ORDER_ANIM = true;
  try {
    renderOrders(cacheToSortedArray(uid));
  } finally {
    SUPPRESS_ORDER_ANIM = false;
  }
}

/* ===================== Theme (اختياري) ===================== */
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
  } catch (e) {}
});

let __ORDERS_AUTH_BOUND__ = false;
function isOrdersViewActive(){
  try{
    const path = (location.pathname || '').toLowerCase();
    if (path.endsWith('talabat.html')) return true;
    const hash = (location.hash || '').toLowerCase();
    return hash === '#/orders';
  }catch(_){ return false; }
}
function ordersUiReady(){
  return !!(document.getElementById('ordersToolbar') && document.getElementById('ordersList'));
}
// عند تحقق تسجيل الدخول (يُفعّل فقط عندما تكون صفحة الطلبات نشطة)
function bindOrdersAuthListener(){
  if (__ORDERS_AUTH_BOUND__) return;
  __ORDERS_AUTH_BOUND__ = true;
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.warn('orders: firebase not available');
    return;
  }
  ordersAuth.onAuthStateChanged(async user => {
    if (!isOrdersViewActive()) return;
    if (!ordersUiReady()) return;
    if (!user) {
      alert("يجب تسجيل الدخول أولاً");
      window.location.href = "index.html";
      return;
    }
    // إعادة الضبط إلى القيم الافتراضية لكل جلسة جديدة
    ORDERS_FILTER = 'all';
    DATE_MODE = 'single';
    DATE_RANGE = { from: null, to: null };
    SELECTED_DATE_STR = getTodayStr();
    SELECTED_DATE_MANUAL = false;
    SEARCH_QUERY = '';
    const chipsWrap = document.getElementById('ordersToolbar');
    if (chipsWrap){
      chipsWrap.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', (c.dataset.filter||'all')===ORDERS_FILTER));
      const dc = document.getElementById('dateChip');
      if (dc){ dc.textContent = getDateChipText(); }
    }
    const searchEl = document.getElementById('ordersSearch');
    if (searchEl) searchEl.value = '';
    await loadOrdersCacheFirst(user.uid);   // اعرض من الكاش أو اجلب مرة واحدة إذا فاضي
    await syncOrdersMerge(user.uid);        // عند كل دخول: اجلب وادمج الطلبات الجديدة وتحديث حالاتها
    refreshRecentStatuses(user.uid);        // كتحسين: حدّث حديثة فقط (احتياطي)
    listenOrdersRealtime(user.uid);         // متابعة فورية لأي طلب جديد/معدل
  });
}

// تهيئة صفحة الطلبات عند الطلب (مناسبة للـ SPA)
window.__initOrdersPage = function(){
  if (!ordersUiReady()) return false;
  if (window.__ORDERS_PAGE_ACTIVE__) return true;
  window.__ORDERS_PAGE_ACTIVE__ = true;
  try { syncToolbarUI(); } catch(_){}
  bindOrdersAuthListener();
  return true;
};

// تحديث خفيف عند العودة للصفحة من الـ hash
window.__ORDERS_REFRESH__ = function(opts){
  if (!ordersUiReady()) return;
  if (!isOrdersViewActive()) return;
  const user = (ordersAuth.currentUser || firebase.auth().currentUser);
  if (!user) return;
  const force = !!(opts && opts.force);
  try { syncToolbarUI(); } catch(_){}
  if (force) { try { showOrdersSkeleton(2); } catch(_){ } }
  try {
    const p = loadOrdersCacheFirst(user.uid);
    if (p && typeof p.then === 'function') {
      p.then(() => syncOrdersMerge(user.uid)).catch(()=>{});
    } else {
      syncOrdersMerge(user.uid);
    }
  } catch(_){ }
  try { refreshRecentStatuses(user.uid); } catch(_){}
};

// تهيئة تلقائية فقط عند صفحة talabat.html (النسخة المنفصلة)
(function autoInitOrders(){
  try{
    const path = (location.pathname || '').toLowerCase();
    if (!path.endsWith('talabat.html')) return;
    const boot = () => { try { window.__initOrdersPage && window.__initOrdersPage(); } catch(_){ } };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
      return;
    }
    if (!ordersUiReady()) {
      document.addEventListener('DOMContentLoaded', boot);
      return;
    }
    boot();
  }catch(_){}
})();

/* ===================== LocalStorage Helpers ===================== */
const MEMORY_CACHE = new Map();

const LS = {
  read(uid) {
    return MEMORY_CACHE.get(uid) || { byCode: {}, lastSync: 0 };
  },
  replace(uid, ordersArray) {
    const byCode = {};
    (ordersArray || []).forEach(o => { if (o?.code) byCode[o.code] = o; });
    LS._save(uid, { byCode, lastSync: Date.now() });
  },
  merge(uid, ordersArray) {
    const cur = LS.read(uid);
    (ordersArray || []).forEach(o => {
      if (!o?.code) return;
      cur.byCode[o.code] = { ...(cur.byCode[o.code] || {}), ...o };
    });
    cur.lastSync = Date.now();
    LS._save(uid, cur);
  },
  upsert(uid, orderObj) {
    if (!orderObj?.code) return;
    const cur = LS.read(uid);
    cur.byCode[orderObj.code] = { ...(cur.byCode[orderObj.code] || {}), ...orderObj };
    cur.lastSync = Date.now();
    LS._save(uid, cur);
  },
  _save(uid, obj) {
    MEMORY_CACHE.set(uid, obj);
  },
  clear(uid) {
    MEMORY_CACHE.delete(uid);
  }
};

// تحويل الكاش إلى مصفوفة مرتبة زمنياً
function cacheToSortedArray(uid) {
  const { byCode } = LS.read(uid);
  const arr = Object.values(byCode || {});
  return arr.sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tB - tA;
  });
}

// أداة: حساب إن كان الطلب حديثًا (≤ N أيام)
function isWithinDays(ts, days) {
  if (!ts) return true; // إذا التاريخ غير معروف نعتبره حديثًا لتحديثه بحذر
  const t = new Date(ts).getTime();
  if (isNaN(t)) return true;
  const diffMs = Date.now() - t;
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

/* ===================== Skeleton أثناء التحميل ===================== */
function showOrdersSkeleton(count = 3) {
  const list = document.getElementById("ordersList");
  if (!list) return;
  list.querySelectorAll(".order-card.loading").forEach(n => n.remove());
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "order-card loading";
    list.appendChild(sk);
  }
}

/* ===================== تحميل الطلبات: Cache-First ===================== */
async function loadOrdersCacheFirst(uid) {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  // اعرض المخزن أولًا إن وُجد
  const cachedArr = cacheToSortedArray(uid);
  if (cachedArr.length) {
    renderOrders(cachedArr);
    return;
  }

  // الكاش فاضي -> قراءة واحدة من Firebase ثم تخزين
  ordersList.innerHTML = "";
  showOrdersSkeleton(1);

  try {
    const fresh = await fetchOrdersFromFirebaseOnce(uid);
    LS.replace(uid, fresh);
    renderOrders(fresh);
  } catch (e) {
    console.error(e);
    ordersList.querySelectorAll(".order-card.loading").forEach(n => n.remove());
    handleOrdersFirestoreError(e);
  }
}

// قراءة مرّة واحدة لكل الطلبات الخاصة بالمستخدم (لملء الكاش فقط عند فراغه)
async function fetchOrdersFromFirebaseOnce(uid) {
  // محاولة أولى: الشكل المجمّع orders/<uid> (byCode)
  try {
    const doc = await ordersDb.collection('orders').doc(uid).get();
    if (doc.exists) {
      const data = doc.data() || {};
      const byCode = data.byCode || {};
      const arr = Object.keys(byCode).map(k => {
        const entry = byCode[k] || {};
        const pub = entry.public || {};
        const priv = entry.private || {};
        return { code: entry.code || k, ...pub, __pub: pub, __priv: priv };
      });
      arr.sort((a,b)=>{ const tA=a.timestamp?new Date(a.timestamp).getTime():0; const tB=b.timestamp?new Date(b.timestamp).getTime():0; return tB-tA; });
      if (arr.length) return arr;
    }
  } catch(_){}

  // رجوع: الشكل القديم (orders/<code> + public/main)
  const snapshot = await ordersDb.collection("orders").where("userId", "==", uid).get();
  const promises = snapshot.docs.map(async (doc) => {
    const orderData = doc.data() || {};
    const pubSnap = await doc.ref.collection("public").doc("main").get();
    const pubData = pubSnap.exists ? pubSnap.data() : {};
    return { code: orderData.code || doc.id, ...pubData, proof: orderData.proof || "", __fetchedAt: Date.now() };
  });
  const ordersArray = await Promise.all(promises);
  return ordersArray.sort((a,b)=>{ const tA=a.timestamp?new Date(a.timestamp).getTime():0; const tB=b.timestamp?new Date(b.timestamp).getTime():0; return tB-tA; });
}

// تحديث طلب واحد فقط من Firestore (بعد provider-check) بدون إعادة جلب كل الطلبات
async function refreshSingleOrderFromFirebase(uid, code) {
  if (!uid || !code) return false;
  const doc = await ordersDb.collection("orders").doc(uid).get();
  if (!doc.exists) return false;
  const data = doc.data() || {};
  const byCode = data.byCode || {};
  let entry = byCode[code] || null;
  if (!entry) {
    const foundKey = Object.keys(byCode).find((k) => ((byCode[k] || {}).code || k) === code);
    if (foundKey) entry = byCode[foundKey] || null;
  }
  if (!entry) return false;
  const pub = entry.public || {};
  const priv = entry.private || {};
  LS.upsert(uid, { code: entry.code || code, ...pub, __pub: pub, __priv: priv, __fetchedAt: Date.now() });
  return true;
}

// جلب جميع الطلبات ودمجها مع الكاش (يضمن ظهور الجديدة بعد كل دخول)
async function syncOrdersMerge(uid) {
  try {
    const doc = await ordersDb.collection('orders').doc(uid).get();
    if (doc.exists) {
      const data = doc.data() || {}; const byCode = data.byCode || {};
      const fresh = Object.keys(byCode).map(k=>{ const entry=byCode[k]||{}; const pub=entry.public||{}; const priv=entry.private||{}; return { code: entry.code||k, ...pub, __pub: pub, __priv: priv, __fetchedAt: Date.now() }; });
      LS.merge(uid, fresh); renderOrders(cacheToSortedArray(uid)); return;
    }
  } catch(_){ }
  try {
    const snapshot = await ordersDb.collection('orders').where('userId','==',uid).get();
    const promises = snapshot.docs.map(async (doc)=>{ const orderData=doc.data()||{}; const pubSnap=await doc.ref.collection('public').doc('main').get(); const pubData=pubSnap.exists?pubSnap.data():{}; return { code: orderData.code||doc.id, ...pubData, proof: orderData.proof||'', __fetchedAt: Date.now() }; });
    const fresh = await Promise.all(promises); LS.merge(uid, fresh); renderOrders(cacheToSortedArray(uid));
  }catch(e){
    console.error('syncOrdersMerge error:', e);
    handleOrdersFirestoreError(e);
  }
}

/* ===================== تحديث حالة الطلبات الحديثة عند كل دخول ===================== */
/**
 * يجلب public/main لكل طلب حديث (≤ 7 أيام) لتحديث الحقول (خصوصًا status).
 * الأقدم من 7 أيام لا يُجلب ويوثق من الكاش فقط.
 */
async function refreshRecentStatuses(uid) {
  const cache = LS.read(uid);
  const codes = Object.keys(cache.byCode || {});
  if (!codes.length) return;

  const recentCodes = codes.filter(code => {
    const o = cache.byCode[code];
    // نحدّث فقط إذا كان الطلب حديثًا (≤ 7 أيام)
    return isWithinDays(o?.timestamp, STATUS_REFRESH_WINDOW_DAYS);
  });

  if (!recentCodes.length) return;

  try {
    // أولوية: القراءة من الوثيقة المجمّعة orders/<uid>
    const doc = await ordersDb.collection('orders').doc(uid).get();
    if (doc.exists) {
      const data = doc.data() || {}; const byCode = data.byCode || {};
      // ابنِ فهرسًا بالكود الأصلي → المدخل
      const idx = {};
      Object.keys(byCode).forEach(k => { const entry = byCode[k] || {}; const code = entry.code || k; idx[code] = entry; });
      const updates = recentCodes.map(code => {
        const entry = idx[code]; if (!entry) return null;
        const pub = entry.public || {};
        const priv = entry.private || {};
        return { code, ...pub, __pub: pub, __priv: priv, __lastStatusRefreshAt: Date.now() };
      }).filter(Boolean);

      if (updates.length) {
        LS.merge(uid, updates);
        renderOrders(cacheToSortedArray(uid));
      }
      return;
    }

    // رجوع: النموذج القديم — اجلب public/main لكل كود حديث
    const updates = await Promise.all(recentCodes.map(async (code) => {
      try {
        const orderRef = ordersDb.collection('orders').doc(code);
        const pubSnap = await orderRef.collection('public').doc('main').get();
        const pub = pubSnap.exists ? pubSnap.data() : {};
        return { code, ...pub, __lastStatusRefreshAt: Date.now() };
      } catch (e) { console.warn('تعذّر تحديث حالة الطلب:', code, e); return null; }
    }));

    const valid = updates.filter(Boolean);
    if (valid.length) {
      LS.merge(uid, valid);
      // أعد الرسم بعد الدمج
      renderOrders(cacheToSortedArray(uid));
    }
  } catch (e) {
    console.error("refreshRecentStatuses error:", e);
  }
}

/* ===================== عرض الطلبات ===================== */
function renderOrders(orders) {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  // لو كان فيه Skeleton قديم (loading) احذفه عند وصول بيانات فعلية
  try { ordersList.querySelectorAll(".order-card.loading").forEach(n => n.remove()); } catch (_) {}

  // حفظ البيانات وتبديل إلى الصفحة الأولى
  let list = Array.isArray(orders) ? orders.slice() : [];
  const searchActive = normalizeSearchText(SEARCH_QUERY) !== '';

  const countOriginal = list.length;
  if (!searchActive) {
    list = applyOrdersFilter(list);
  }
  const countAfterStatus = list.length;

  if (!searchActive) {
    list = applyDateFilter(list);
  }
  const countAfterDate = list.length;

  list = applySearchFilter(list);
  const countAfterSearch = list.length;
  PAGINATION.orders = list;
  PAGINATION.page = 1;

  drawOrdersPage();
}

function drawOrdersPage() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  // تأمين: احذف أي Skeleton متبقّي قبل رسم البطاقات
  try { ordersList.querySelectorAll(".order-card.loading").forEach(n => n.remove()); } catch (_) {}

  // احذف رسالة الفراغ القديمة إن وُجدت قبل إعادة الرسم
  const oldEmpty = document.getElementById('ordersEmptyMessage');
  if (oldEmpty) oldEmpty.remove();

  // خزّن البطاقات الحالية لمعرفة ما سيزال
  const prevMap = new Map();
  Array.from(ordersList.children).forEach(el => {
    if (el.id && el.id.startsWith('order-')) {
      prevMap.set(el.id.replace('order-',''), el);
    }
  });
  // ضع علامة خروج على البطاقات غير الموجودة في القائمة الجديدة
  const nextCodes = new Set(PAGINATION.orders.map(o => o?.code).filter(Boolean));
  prevMap.forEach((el, code) => {
    if (!nextCodes.has(code)) {
      if (SUPPRESS_ORDER_ANIM) {
        el.remove();
        return;
      }
      el.classList.add('anim-exit-right');
      const remover = () => { try { el.remove(); } catch (_) {} };
      el.addEventListener('animationend', (e)=>{ if (e.animationName === 'orderCardOutRight') remover(); }, { once: true });
      setTimeout(remover, ORDER_ANIM_EXIT_MS + 40); // تأمين في حال لم يُستدعَ الحدث
    }
  });
  // أزل سريعًا البطاقات التي ستبقى لإعادة بنائها، واترك الخارجة لتكمل التحريك
  prevMap.forEach((el, code) => { if (nextCodes.has(code)) el.remove(); });

  const total = PAGINATION.orders.length;
  // عرض رسالة مناسبة عند عدم وجود عناصر
  if (total === 0) {
    const wrapId = 'ordersEmptyMessage';
    let msgEl = document.getElementById(wrapId);
    if (!msgEl) { msgEl = document.createElement('div'); msgEl.id = wrapId; }
    const isToday = (SELECTED_DATE_STR || getTodayStr()) === getTodayStr();
    let message = 'لا توجد طلبات';
    if (ORDERS_FILTER === 'approved') message = 'لا توجد طلبات مشحونة';
    else if (ORDERS_FILTER === 'rejected') message = 'لا توجد طلبات مرفوضة';
    else if (ORDERS_FILTER === 'pending') message = 'لا توجد طلبات قيد الانتظار';
    // عبارة بحسب وضع التاريخ
    message += (DATE_MODE === 'range' ? ' خلال هذه الفترة' : ' في هذا التاريخ');
    msgEl.innerHTML = `
      <svg class="illu" width="96" height="90" viewBox="0 0 96 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="overflow:visible">
        <!-- الخلفية: أزحناها قليلًا لليسار -->
        <g opacity="0.9" transform="translate(-8,2)">
          <rect x="12" y="14" rx="8" ry="8" width="56" height="68" fill="#0f1024" opacity="0.15"/>
          <rect x="20" y="8" rx="8" ry="8" width="56" height="68" class="paper" fill="#e5e7eb"/>
          <rect x="34" y="4" width="28" height="10" rx="3" class="clip" fill="#7c3aed"/>
          <circle cx="48" cy="3" r="3" class="dot" fill="#a78bfa"/>
        </g>
        <!-- الأمامية: أزحناها قليلًا لليمين ليصبح المركز بينهما -->
        <g transform="translate(8,6)">
          <rect x="12" y="14" rx="8" ry="8" width="56" height="68" fill="#0f1024" opacity="0.15"/>
          <rect x="20" y="8" rx="8" ry="8" width="56" height="68" class="paper" fill="#e5e7eb"/>
          <rect x="34" y="4" width="28" height="10" rx="3" class="clip" fill="#7c3aed"/>
          <circle cx="48" cy="3" r="3" class="dot" fill="#a78bfa"/>
        </g>
      </svg>
      <div class="caption">${message}</div>
    `;
    ordersList.innerHTML = '';
    ordersList.appendChild(msgEl);
    // اخفِ أي ترقيم موجود بعد القائمة إن وُجد
    const pager = document.getElementById('ordersPagination');
    if (pager) pager.remove();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGINATION.size));
  const page = Math.min(Math.max(1, PAGINATION.page), totalPages);
  PAGINATION.page = page;

  const start = (page - 1) * PAGINATION.size;
  const end = Math.min(start + PAGINATION.size, total);
  const slice = PAGINATION.orders.slice(start, end);

  slice.forEach(order => {
    const {
      code,
      playerId,
      total,
      totalStr,
      currency,
      title,
      quantity,
      provider,
      game,
      providerOrderId,
      providerStatus,
      timestamp,
      status,
      proof
    } = order || {};
    if (!code) return;

    const existing = prevMap.get(code);
    if (existing) existing.remove(); // سنعيد إنشاءه بمحتوى محدث

    let formattedDate = "";
    try {
      formattedDate = new Date(timestamp).toLocaleString("ar-EG", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      formattedDate = timestamp || "غير معروف";
    }

    const offersFormatted = formatOffersHtml(order);

    const priv = order?.__priv || {};
    const providerKey = String(provider || game || "").toLowerCase();
    const isSmm = providerKey === "smm";
    const serviceSnapshot = isSmm ? safeJsonParse(priv.serviceSnapshot, null) : null;
    const providerPayload = isSmm ? safeJsonParse(priv.providerPayload, null) : null;
    const smmServiceName = title || priv.serviceName || serviceSnapshot?.name || "";
    const smmQuantity = quantity ?? priv.quantity ?? providerPayload?.quantity ?? null;
    const smmLink = (priv.link || providerPayload?.link || "").trim();
    const smmRuns = priv.runs ?? providerPayload?.runs ?? null;
    const smmInterval = priv.interval ?? providerPayload?.interval ?? null;
    const smmProviderOrderId = providerOrderId || priv.providerOrderId || "";
    const smmProviderStatus = providerStatus || priv.providerStatus || "";
    const providerResponseRawValue = priv.providerResponse;
    const providerResponseRaw = typeof providerResponseRawValue === "string"
      ? providerResponseRawValue.trim()
      : "";
    const providerResponseParsed = (providerResponseRawValue && typeof providerResponseRawValue === "object")
      ? providerResponseRawValue
      : safeJsonParse(providerResponseRaw, null);
    const providerCodes = extractProviderCodes(providerResponseParsed);
    let providerResponseText = "";
    if (Array.isArray(providerResponseParsed)) {
      providerResponseText = providerResponseParsed.map((entry, idx) => {
        if (!entry || typeof entry !== "object") return "";
        const parts = [];
        if (entry.providerOrderId) parts.push(`orderId: ${entry.providerOrderId}`);
        if (entry.status) parts.push(`status: ${entry.status}`);
        if (entry.orderUuid) parts.push(`uuid: ${entry.orderUuid}`);
        const header = parts.length ? `#${idx + 1} ${parts.join(" | ")}` : `#${idx + 1}`;
        const responseBody = entry.response || entry.note || "";
        return responseBody ? `${header}\n${responseBody}` : header;
      }).filter(Boolean).join("\n\n");
      if (!providerResponseText && providerResponseRaw) providerResponseText = providerResponseRaw;
    } else if (providerResponseRaw) {
      providerResponseText = providerResponseRaw;
    } else if (providerResponseParsed && typeof providerResponseParsed === "object") {
      try { providerResponseText = JSON.stringify(providerResponseParsed); } catch {}
    }
    const providerResponseDisplay = providerResponseText.length > 2000
      ? providerResponseText.slice(0, 2000) + "..."
      : providerResponseText;
    const providerResponseSummaryRaw = String(priv.response || priv.providerNote || priv.note || "").trim();
    const providerResponseSummaryText = redactProviderUserText(providerResponseSummaryRaw || extractProviderResponseFromParsed(providerResponseParsed));
    const providerResponseSummaryHtml = providerResponseSummaryText
      ? `<p><strong>الرد:</strong> ${escapeHtml(providerResponseSummaryText).replace(/\n/g, "<br>")}</p>`
      : "";
    const safeCode = escapeHtml(code);
    const providerOrderUuidForCheck = (() => {
      if (Array.isArray(providerResponseParsed)) {
        for (const entry of providerResponseParsed) {
          const u = pickTextValue(entry?.orderUuid) || pickTextValue(entry?.order_uuid) || pickTextValue(entry?.uuid);
          if (u) return u;
        }
      }
      return (
        pickTextValue(providerResponseParsed?.orderUuid) ||
        pickTextValue(providerResponseParsed?.order_uuid) ||
        pickTextValue(providerResponseParsed?.uuid) ||
        ""
      );
    })();
    const refreshProviderBtnHtml = providerOrderUuidForCheck
      ? `<div class="order-actions">
           <button type="button" class="btn-refresh-order" data-code="${safeCode}" data-orderuuid="${escapeHtml(providerOrderUuidForCheck)}" data-orderid="${escapeHtml(smmProviderOrderId)}">تحديث الرد</button>
         </div>`
      : "";
    const noteText = redactProviderUserText(pickTextValue(priv.note) || pickTextValue(order.note) || pickTextValue(order.notes));
    const noteHtml = noteText
      ? `<p><strong>🗒️ ملاحظات:</strong> ${escapeHtml(noteText).replace(/\n/g, "<br>")}</p>`
      : "";
    const providerCodesHtml = providerCodes.length
      ? `<div class="codes-box">
           <p><strong>🎟️ أكواد المزود:</strong></p>
           <ul class="codes-list">
             ${providerCodes.map((c, idx)=>`<li><span class="code-text">${escapeHtml(c)}</span><button class="btn-copy-code" data-code="${escapeHtml(c)}" title="نسخ الكود">📋</button></li>`).join("")}
           </ul>
         </div>`
      : "";

    const amountDisplay = formatAmountDisplay(totalStr, total, currency || priv.currency);
    const playerIdClean = String(playerId ?? "").trim();

    // عنوان رأس الكرت: اسم المنتج (أو خدمة SMM) + (اختياري) معرف اللاعب + السعر
    const productHeaderValue = (() => {
      if (smmServiceName) return smmServiceName;
      const offersListLocal = normalizeOffersArray(order?.offers || order?.offersList || order?.offerItems);
      for (const entry of offersListLocal) {
        if (!entry || typeof entry !== "object") continue;
        const n = String(entry.name || entry.title || entry.label || entry.offer || entry.offerName || entry.productName || entry.product || "").trim();
        if (n) return n;
      }
      const offersText = (order?.["العروض"] || order?.offersText || "").toString().trim();
      const parts = splitOffersText(offersText);
      if (parts.length) return parts[0];
      return "-";
    })();
    const playerHeaderValue = productHeaderValue;
    const statusSource = status || smmProviderStatus;
    const normalizedStatus = normOrderStatus(statusSource);
    const statusText = formatStatusLabel(statusSource);
    const safeHeaderPlayer = escapeHtml(playerHeaderValue);
    const playerIdUsable = isValidPlayerId(playerIdClean);
    const safeAmountDisplay = escapeHtml(amountDisplay);
    const headerRightSegment = playerIdUsable
      ? `🆔 <strong>${escapeHtml(playerIdClean)}</strong>`
      : `💵 <strong>${safeAmountDisplay}</strong>`;
    const safeStatusText = escapeHtml(statusText);
    const safeDateText = escapeHtml(formattedDate);
    const safeProofSrc = proof ? escapeHtml(proof) : "";
    const showOffersLine = !isSmm || !!offersFormatted;
    const playerLineHtml = playerIdUsable
      ? `<p><strong>🆔 معرف اللاعب:</strong> ${escapeHtml(playerIdClean)}</p>`
      : "";

    const extraFieldsHtml = (() => {
      const allowIdFields = !playerIdUsable;
      const raw =
        order?.playerFields ??
        order?.player_fields ??
        order?.fields ??
        order?.inputs ??
        priv?.playerFields ??
        priv?.player_fields ??
        null;
      if (!raw) return "";

      let parsed = raw;
      if (typeof parsed === "string") {
        parsed = safeJsonParse(parsed, null);
      }
      if (!parsed || typeof parsed !== "object") return "";

      const isPlayerLike = (v) =>
        /^(player(_)?id|playerid|player|uid|user(_)?id|userid|account(_)?id|accountid|player_id)$/i
          .test(String(v || "").trim().toLowerCase()) ||
        /player(_)?id|uid|user(_)?id|account(_)?id|ايدي|معرف/i.test(String(v || "").trim());

      const formatExtraLabel = (key) => {
        const rawKey = String(key || "").trim();
        if (!rawKey) return "";
        const normalized = rawKey.toLowerCase().replace(/[\s_-]+/g, "");
        const known = {
          playerid: "🆔 معرف اللاعب",
          userid: "👤 معرف المستخدم",
          uid: "🆔 UID",
          accountid: "🧾 معرف الحساب",
          server: "🖥️ السيرفر",
          region: "🌍 المنطقة",
          zone: "🌍 المنطقة",
          email: "📧 البريد",
          phone: "📱 الهاتف",
          whatsapp: "💬 واتساب",
          link: "🔗 الرابط"
        };
        if (known[normalized]) return known[normalized];
        // fallback: make it more human readable (Player_ID -> Player ID)
        return rawKey.replace(/[_-]+/g, " ").trim();
      };

      const pairs = [];
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (!entry || typeof entry !== "object") return;
          const key = entry.key ?? entry.name ?? entry.field ?? entry.id ?? "";
          const value = entry.value ?? entry.val ?? entry.data ?? entry.input ?? entry.text ?? "";
          if (!key) return;
          if (!allowIdFields && isPlayerLike(key)) return;
          const vText = String(value ?? "").trim();
          if (!vText) return;
          pairs.push([formatExtraLabel(key), vText]);
        });
      } else {
        Object.keys(parsed).forEach((key) => {
          if (!key) return;
          if (!allowIdFields && isPlayerLike(key)) return;
          const vText = String(parsed[key] ?? "").trim();
          if (!vText) return;
          pairs.push([formatExtraLabel(key), vText]);
        });
      }

      if (!pairs.length) return "";

      return `${pairs.map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join("")}`;
    })();
    const offersLineHtml = showOffersLine ? `<p><strong>🎁 العروض:</strong> ${offersFormatted || "-"}</p>` : "";
    const refundAmountCandidate = priv.refundAmount ?? order?.refundAmount;
    let refundAmountNumber = null;
    if (refundAmountCandidate !== undefined && refundAmountCandidate !== null && refundAmountCandidate !== "") {
      const parsedRefund = typeof refundAmountCandidate === "number" ? refundAmountCandidate : Number(refundAmountCandidate);
      if (Number.isFinite(parsedRefund)) refundAmountNumber = parsedRefund;
    }
    const refundAmountHasValue = refundAmountNumber !== null;
    const refundAmountStr = priv.refundAmountStr || order?.refundAmountStr || "";
    const refundAmountDisplay = (refundAmountStr || refundAmountHasValue)
      ? formatAmountDisplay(refundAmountStr || null, refundAmountHasValue ? refundAmountNumber : null, currency || priv.currency)
      : "";
    const isRejectedStatus = normalizedStatus === "rejected";
    const refundIssuedFlag = priv.refunded === true || priv.refundIssued === true || order?.refunded === true || order?.refundIssued === true;
    let refundLineHtml = "";
    if (isRejectedStatus) {
      const refundText = refundIssuedFlag
        ? (refundAmountDisplay ? `تمت إعادة ${refundAmountDisplay}` : "تمت إعادة المبلغ")
        : "لم يتم إرجاع المبلغ بعد";
      refundLineHtml = `<p><strong>💰 حالة الاسترداد:</strong> ${escapeHtml(refundText)}</p>`;
    }

    let statusClass = "";
    if (normalizedStatus === "rejected") statusClass = "مرفوض";
    else if (normalizedStatus === "approved") statusClass = "تم_الشحن";

    const smmDetailsParts = [];
    if (isSmm && smmServiceName) {
      smmDetailsParts.push(`<p><strong>🎯 الخدمة:</strong> ${escapeHtml(smmServiceName)}</p>`);
    }
    if (isSmm && smmQuantity !== null && smmQuantity !== undefined && smmQuantity !== "") {
      smmDetailsParts.push(`<p><strong>📦 الكمية:</strong> ${escapeHtml(smmQuantity)}</p>`);
    }
    if (isSmm && smmLink) {
      const linkMarkup = formatLinkDisplay(smmLink) || escapeHtml(smmLink);
      smmDetailsParts.push(`<p><strong>🔗 الرابط:</strong> ${linkMarkup}</p>`);
    }
    if (isSmm && smmProviderOrderId) {
      smmDetailsParts.push(`<p><strong>🆔 رقم الطلب:</strong> ${escapeHtml(smmProviderOrderId)}</p>`);
    }
    if (isSmm && smmProviderStatus) {
      smmDetailsParts.push(`<p><strong>⚙️ حالة الطلب:</strong> ${escapeHtml(formatStatusLabel(smmProviderStatus))}</p>`);
    }
    if (isSmm && (smmRuns || smmInterval)) {
      const bits = [];
      if (smmRuns) bits.push(`عدد الدفعات: ${escapeHtml(smmRuns)}`);
      if (smmInterval) bits.push(`الفاصل: ${escapeHtml(smmInterval)}`);
      smmDetailsParts.push(`<p><strong>⏱️ التكرار:</strong> ${bits.join(" / ")}</p>`);
    }
    const smmDetailsBlock = smmDetailsParts.join("");

    const openKey = String(code || "");
    const isOpen = OPEN_ORDER_CODES.has(openKey);

    const card = document.createElement("div");
    card.className = `order-card${isOpen ? " open" : ""}`;
    card.id = `order-${code}`;

    card.innerHTML = `
      <div class="order-header" onclick="toggleDetails('${code}')">
        <div class="order-header-text">
          <div class="order-code-line"><strong>كود الطلب:</strong> <span class="order-code">${safeCode}</span></div>
          <div class="order-meta-line">🎮 <strong>${safeHeaderPlayer}</strong> | ${headerRightSegment}</div>
        </div>
        <div class="order-status ${statusClass}">
          ${safeStatusText}
        </div>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="order-details" id="details-${code}" style="display:${isOpen ? "block" : "none"};">
        ${playerLineHtml}
        ${extraFieldsHtml}
        ${smmDetailsBlock}
        ${offersLineHtml}
        ${refundLineHtml}
        <p><strong>💵 المجموع:</strong> ${safeAmountDisplay}</p>
        <p><strong>📅 تاريخ الإرسال:</strong> ${safeDateText}</p>
        ${refreshProviderBtnHtml}
        ${providerResponseSummaryHtml}
        ${noteHtml}
        ${providerCodesHtml}
        ${
          proof
            ? `<p>
                 <strong>📸 إثبات التحويل:</strong>
                 <button class="btn-show-proof" data-code="${safeCode}">عرض الصورة</button><br>
                 <img id="proof-img-${safeCode}" src="${safeProofSrc}" alt="إثبات التحويل" style="display:none; max-width:100%; margin-top:10px;">
               </p>`
            : ``
        }
      </div>
    `;

    if (!existing && !SUPPRESS_ORDER_ANIM) {
      card.classList.add('anim-enter-right');
      card.addEventListener('animationend', (e)=>{ if (e.animationName === 'orderCardInRight') card.classList.remove('anim-enter-right'); }, { once:true });
    }

  ordersList.appendChild(card);
});

attachProofButtons();
attachCopyCodeButtons();
attachRefreshOrderButtons();
renderPaginationControls(total, page, totalPages, start, end);
}

// مزامنة الواجهة مع التفضيلات الحالية (إذا وُجدت العناصر)
function syncToolbarUI(){
  try{
    const wrap = document.getElementById('ordersToolbar');
    if (!wrap) return false;
    wrap.querySelectorAll('.chip').forEach(c=>{
      if (!c.dataset || !c.dataset.filter) return;
      const f = c.dataset.filter;
      c.classList.toggle('active', f === ORDERS_FILTER);
    });
    // حدّث نص زر التاريخ دائمًا ليطابق الاختيار
    try{
      const dc = document.getElementById('dateChip');
      if (dc){ dc.textContent = getDateChipText(); }
    }catch{}
    return true;
  }catch{ return false; }
}

// حساب عدد الطلبات لكل يوم (بالفلتر الحالي)
function computeDateCounts(){
  try{
    const uid = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid;
    if (!uid) return {};
    const { byCode } = LS.read(uid);
    const arr = Object.values(byCode || {});
    const filtered = applyOrdersFilter(arr);
    const map = {};
    for (const o of filtered){
      const ms = getOrderTimeMs(o);
      if (!ms) continue;
      const d = new Date(ms);
      const ymd = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      map[ymd] = (map[ymd]||0) + 1;
    }
    return map;
  }catch{ return {}; }
}

// مستمع نقرة عام (تفويض) للفلاتر
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#ordersToolbar .chip');
  if (!btn) return;
  if (btn.id === 'dateChip') { openCalendar(); return; }
  ORDERS_FILTER = btn.dataset.filter || 'all';
  syncToolbarUI();
  recomputeAndRender();
});

// تغيير التاريخ عبر مُنتقي التاريخ
document.addEventListener('change', (e) => {
  const input = e.target && e.target.id === 'ordersDatePicker' ? e.target : null;
  if (!input) return;
  const val = String(input.value || '').trim();
  // التحويل إلى وضع اليوم الواحد عند استخدام حقل التاريخ العادي
  DATE_MODE = 'single';
  DATE_RANGE = { from: null, to: null };
  SELECTED_DATE_STR = val || getTodayStr();
  SELECTED_DATE_MANUAL = !!val; // اختيار يدوي فقط إذا كان هناك تاريخ محدد
  syncToolbarUI();
  recomputeAndRender();
});

// عند اكتمال تحميل DOM حاول مزامنة الواجهة (قد تكون العناصر أنشئت هناك)
function refreshOrdersCurrency() {
  if (!PAGINATION.orders || PAGINATION.orders.length === 0) return;
  SUPPRESS_ORDER_ANIM = true;
  try { drawOrdersPage(); }
  finally { SUPPRESS_ORDER_ANIM = false; }
}
try { window.addEventListener('currency:change', refreshOrdersCurrency); } catch {}
try { window.addEventListener('currency:rates:change', refreshOrdersCurrency); } catch {}
try { window.addEventListener('currency:ready', refreshOrdersCurrency); } catch {}

document.addEventListener('DOMContentLoaded', () => { setTimeout(syncToolbarUI, 0); });

// نسخة تفويض للأزرار/الحقل لضمان العمل حتى لو لم يُلتقطت عند DOMContentLoaded
(function(){
  let debounceId = null;
  function applySearchFrom(val){
    SEARCH_QUERY = (val || '').trim();
    recomputeAndRender();
  }
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || el.id !== 'ordersSearch') return;
    clearTimeout(debounceId);
    const v = el.value;
    debounceId = setTimeout(() => applySearchFrom(v), 180);
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!el || el.id !== 'ordersSearch') return;
    if (e.key === 'Enter') { e.preventDefault(); applySearchFrom(el.value); }
  });
})();

function attachProofButtons() {
  document.querySelectorAll('.btn-show-proof').forEach(btn => {
    btn.onclick = () => {
      const code = btn.dataset.code;
      const img = document.getElementById(`proof-img-${code}`);
      if (img.style.display === 'none' || !img.style.display) {
        img.style.display = 'block';
        btn.textContent = 'إخفاء الصورة';
      } else {
        img.style.display = 'none';
        btn.textContent = 'عرض الصورة';
      }
    };
  });
}

function attachRefreshOrderButtons() {
  document.querySelectorAll(".btn-refresh-order").forEach((btn) => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const code = (btn.dataset.code || "").toString().trim();
      const orderUuid = (btn.dataset.orderuuid || "").toString().trim();
      const orderId = (btn.dataset.orderid || "").toString().trim();

      const uid = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid;
      if (!uid) return;

      if (!orderUuid && !orderId) {
        alert("لا يوجد رقم تتبع للمزود لهذا الطلب.");
        return;
      }

      const prevText = btn.textContent;
      try {
        btn.disabled = true;
        btn.textContent = "جارٍ التحديث...";

        const headers = {};
        const sessionKey = getStoredSessionKey(uid);
        if (sessionKey) headers["X-SessionKey"] = sessionKey;
        try {
          const user = ordersAuth.currentUser || firebase.auth().currentUser;
          if (user && typeof user.getIdToken === "function") {
            const idToken = await user.getIdToken();
            if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
          }
        } catch (_) {}

        const url = buildProviderCheckUrl({ orderUuid, orderId });
        const res = await fetch(url, { method: "GET", headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false || data?.ok === false) {
          throw new Error(data?.error || data?.message || "فشل تحديث الرد");
        }

        await refreshSingleOrderFromFirebase(uid, code);
        // حافظ على فتح تفاصيل الطلب بعد التحديث
        OPEN_ORDER_CODES.add(code);
        renderOrders(cacheToSortedArray(uid));
      } catch (err) {
        alert(err?.message || "فشل تحديث الرد");
      } finally {
        btn.disabled = false;
        btn.textContent = prevText || "تحديث الرد";
      }
    };
  });
}

function attachCopyCodeButtons() {
  document.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.onclick = () => {
      const code = btn.dataset.code || "";
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "✅";
          setTimeout(() => { btn.textContent = "📋"; }, 1200);
        }).catch(() => alert("تعذر نسخ الكود، انسخه يدويًا."));
      } else {
        alert("انسخ الكود يدويًا: " + code);
      }
    };
  });
}

function handleOrdersFirestoreError(err){
  const code = (err && err.code) ? String(err.code) : "";
  if (code !== "permission-denied" && code !== "unavailable") return;
  try { if (_ordersUnsub) { _ordersUnsub(); _ordersUnsub = null; } } catch {}
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;
  const wrapId = 'ordersEmptyMessage';
  let msgEl = document.getElementById(wrapId);
  if (!msgEl) { msgEl = document.createElement('div'); msgEl.id = wrapId; }
  const message = (code === "permission-denied")
    ? "لا يمكن عرض الطلبات بسبب الصلاحيات. تأكد من تسجيل الدخول وصلاحيات Firestore."
    : "تعذر الاتصال بقاعدة البيانات مؤقتًا. حاول لاحقًا.";
  msgEl.innerHTML = `<div class="caption">${message}</div>`;
  ordersList.innerHTML = '';
  ordersList.appendChild(msgEl);
  const pager = document.getElementById('ordersPagination');
  if (pager) pager.remove();
}

/* ===================== استماع فوري لتغيرات الطلبات ===================== */
let _ordersUnsub = null;
function listenOrdersRealtime(uid) {
  try { if (_ordersUnsub) { _ordersUnsub(); _ordersUnsub = null; } } catch {}
  try {
    const docRef = ordersDb.collection('orders').doc(uid);
    _ordersUnsub = docRef.onSnapshot((snap)=>{
      try{
        if (!snap.exists) return;
        const data = snap.data() || {}; const byCode = data.byCode || {};
        const fresh = Object.keys(byCode).map(k=>{ const entry=byCode[k]||{}; const pub=entry.public||{}; const priv=entry.private||{}; return { code: entry.code||k, ...pub, __pub: pub, __priv: priv, __fetchedAt: Date.now() }; });
        const uidNow = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid; if (uidNow){ LS.merge(uidNow, fresh); renderOrders(cacheToSortedArray(uidNow)); }
      }catch(e){ console.warn('agg realtime merge failed', e); }
    }, (err)=>{
      console.warn('orders realtime snapshot error', err);
      handleOrdersFirestoreError(err);
    });
  } catch (e) {
    console.warn('listenOrdersRealtime failed', e);
    handleOrdersFirestoreError(e);
  }
}

function renderPaginationControls(total, page, totalPages, start, end) {
  const ordersList = document.getElementById('ordersList');
  if (!ordersList) return;

  let pager = document.getElementById('ordersPagination');
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'ordersPagination';
    pager.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0;flex-wrap:wrap';
    ordersList.insertAdjacentElement('afterend', pager);
  }

  if (total <= PAGINATION.size) {
    pager.innerHTML = '';
    pager.style.display = 'none';
    return;
  }
  pager.style.display = 'flex';

  const info = document.createElement('div');
  info.textContent = `عرض ${start + 1}–${end} من ${total}`;
  info.style.marginInlineStart = '8px';

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '6px';

  const mkBtn = (label, disabled, handler) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:6px 10px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer';
    if (document.body.classList.contains('dark-mode')) {
      b.style.background = '#0f1024'; b.style.color = '#f0f1ff'; b.style.borderColor = '#2b2d52';
    }
    b.disabled = !!disabled;
    if (disabled) { b.style.opacity = '0.6'; b.style.cursor = 'not-allowed'; }
    if (handler) b.addEventListener('click', handler);
    return b;
  };

  // Previous
  controls.appendChild(mkBtn('السابق', page <= 1, () => { PAGINATION.page = Math.max(1, page - 1); drawOrdersPage(); }));

  // Page numbers (compact: 1 ... p-1 p p+1 ... N)
  const addPageBtn = (p) => {
    const btn = mkBtn(String(p), false, () => { PAGINATION.page = p; drawOrdersPage(); });
    if (p === page) { btn.style.fontWeight = '800'; btn.style.borderColor = '#5c5ebf'; }
    controls.appendChild(btn);
  };
  const addEllipsis = () => {
    const span = document.createElement('span'); span.textContent = '...'; span.style.padding = '6px 4px';
    controls.appendChild(span);
  };
  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) addPageBtn(p);
  } else {
    addPageBtn(1);
    if (page > 3) addEllipsis();
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) addPageBtn(p);
    if (page < totalPages - 2) addEllipsis();
    addPageBtn(totalPages);
  }

  // Next
  controls.appendChild(mkBtn('التالي', page >= totalPages, () => { PAGINATION.page = Math.min(totalPages, page + 1); drawOrdersPage(); }));

  pager.innerHTML = '';
  pager.appendChild(info);
  pager.appendChild(controls);
}

/* ===================== تفاصيل الطلب: Cache-First ثم Firebase لهذا الطلب ===================== */
async function showOrderDetails(code) {
  const detailsBox = document.getElementById("orderDetails");
  if (!detailsBox) return;

  if (!code) {
    detailsBox.style.display = "none";
    return;
  }

  const uid = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid;
  if (!uid) return;

  // حاول من الكاش أولاً
  const cache = LS.read(uid);
  const cachedOrder = cache.byCode[code];

  if (cachedOrder?.__pub && cachedOrder?.__priv) {
    renderDetailsTable(cachedOrder.__pub, cachedOrder.__priv, detailsBox);
    return;
  }

  // خلاف ذلك: اجلب لهذا الطلب فقط ثم خزّنه
  try {
    const orderRef = ordersDb.collection("orders").doc(code);
    const [pubSnap, privSnap] = await Promise.all([
      orderRef.collection("public").doc("main").get(),
      orderRef.collection("private").doc("main").get()
    ]);

    const pub = pubSnap.exists ? pubSnap.data() : {};
    const priv = privSnap.exists ? privSnap.data() : {};

    // خزّن ضمن نفس عنصر الطلب في الكاش
    LS.upsert(uid, { code, __pub: pub, __priv: priv });

    renderDetailsTable(pub, priv, detailsBox);
  } catch (e) {
    console.error(e);
    detailsBox.style.display = "none";
  }
}

function renderDetailsTable(pub, priv, detailsBox) {
  let rows = '';
  const formatValue = (value) => {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return escapeHtml(value);
    if (typeof value === "number" || typeof value === "boolean") return escapeHtml(String(value));
    if (typeof value === "object") {
      try { return escapeHtml(JSON.stringify(value, null, 2)).replace(/\n/g, "<br>"); } catch {}
      return escapeHtml(String(value));
    }
    return escapeHtml(String(value));
  };
  const appendRow = (label, value) => {
    rows += `<tr>
               <td style="padding:10px;font-weight:bold;border:1px solid #ccc;">${formatValue(label)}</td>
               <td style="padding:10px;border:1px solid #ccc;">${formatValue(value)}</td>
             </tr>`;
  };

  rows += `<tr><td colspan="2" style="background:#eee;padding:10px;font-weight:bold;">📂 Public</td></tr>`;
  Object.entries(pub || {}).forEach(([k, v]) => appendRow(k, v));

  rows += `<tr><td colspan="2" style="background:#eee;padding:10px;font-weight:bold;">🔒 Private</td></tr>`;
  Object.entries(priv || {}).forEach(([k, v]) => appendRow(k, v));

  detailsBox.innerHTML = `<table style="width:100%;direction:rtl;border-collapse:collapse;">${rows}</table>`;
  detailsBox.style.display = "block";
}

/* ===================== اتفاقية المستخدم (كما لديك) ===================== */
// أبقِ هذا الحدث للاتفاقية فقط — بدون استدعاء تحميلات هنا
window.addEventListener("DOMContentLoaded", () => {
  const agreed = localStorage.getItem('userAgreementAccepted');
  if (agreed !== 'true') {
    const box = document.getElementById('user-agreement');
    if (box) {
      box.style.display = 'flex';
      box.style.alignItems = 'center';
      box.style.justifyContent = 'center';
    }
  }
});

/* ===================== أدوات واجهة بسيطة (اختيارية) ===================== */
// زر تحديت/مسح الكاش (إن أضفتهما في الصفحة)
document.addEventListener('DOMContentLoaded', () => {
  const btnRefresh = document.getElementById('btnRefresh');
  const btnClear = document.getElementById('btnClearCache');

  if (btnRefresh) {
    btnRefresh.onclick = async () => {
      const uid = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid;
      if (!uid) return;
      showOrdersSkeleton(1);
      try {
        const fresh = await fetchOrdersFromFirebaseOnce(uid);
        LS.replace(uid, fresh);
        renderOrders(fresh);
      } catch (e) {
        console.error(e);
      }
    };
  }

  if (btnClear) {
    btnClear.onclick = () => {
      const uid = (ordersAuth.currentUser || firebase.auth().currentUser)?.uid;
      if (!uid) return;
      LS.clear(uid);
      const ordersList = document.getElementById("ordersList");
      if (ordersList) ordersList.innerHTML = "";
    };
  }
});

/* ===================== أدوات صغيرة ===================== */
function toggleDetails(code) {
  const d = document.getElementById(`details-${code}`);
  const card = document.getElementById(`order-${code}`);
  if (!d || !card) return;
  const isOpen = d.style.display === 'block';
  d.style.display = isOpen ? 'none' : 'block';
  card.classList.toggle('open', !isOpen);
  const key = String(code || "");
  if (key) {
    if (isOpen) OPEN_ORDER_CODES.delete(key);
    else OPEN_ORDER_CODES.add(key);
  }
}
