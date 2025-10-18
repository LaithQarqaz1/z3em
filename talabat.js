// تقويم منبثق بسيط مع إبراز الأيام
const CAL = { el: null, year: 0, month: 0 };
function openCalendar(){
  const minDateStr = getMinDateStr(3);
  if (!SELECTED_DATE_STR || SELECTED_DATE_STR < minDateStr) {
    SELECTED_DATE_STR = minDateStr;
    SELECTED_DATE_MANUAL = false; // تم تعيينه تلقائيًا كحد أدنى
    try{
      const uid=(auth.currentUser||firebase.auth().currentUser)?.uid;
      if(uid){
        localStorage.setItem(`orders:date:${uid}`, SELECTED_DATE_STR);
        localStorage.setItem(`orders:date:manual:${uid}`, '0');
      }
    }catch{}
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
      try{ const uid=(auth.currentUser||firebase.auth().currentUser)?.uid; if(uid){ localStorage.setItem(`orders:dateMode:${uid}`, DATE_MODE); } }catch{}
      renderCalendar(CAL.year, CAL.month);
    };
    if (btnRange) btnRange.onclick = () => {
      DATE_MODE = 'range';
      // إن لم يكن من/إلى محددَين، عين البداية اليوم
      if (!DATE_RANGE.from){ DATE_RANGE.from = SELECTED_DATE_STR || getTodayStr(); }
      try{ const uid=(auth.currentUser||firebase.auth().currentUser)?.uid; if(uid){ localStorage.setItem(`orders:dateMode:${uid}`, DATE_MODE); localStorage.setItem(`orders:dateRange:${uid}`, JSON.stringify(DATE_RANGE)); } }catch{}
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
          try{ const uid=(auth.currentUser||firebase.auth().currentUser)?.uid; if(uid){ localStorage.setItem(`orders:dateRange:${uid}`, JSON.stringify(DATE_RANGE)); } }catch{}
          renderCalendar(year, month);
          return;
        } else if (DATE_RANGE.from && !DATE_RANGE.to){
          if (ymd < DATE_RANGE.from){ DATE_RANGE = { from: ymd, to: DATE_RANGE.from }; }
          else { DATE_RANGE.to = ymd; }
          try{ const uid=(auth.currentUser||firebase.auth().currentUser)?.uid; if(uid){ localStorage.setItem(`orders:dateRange:${uid}`, JSON.stringify(DATE_RANGE)); } }catch{}
          closeCalendar();
          syncToolbarUI();
          recomputeAndRender();
          return;
        }
      } else {
        SELECTED_DATE_STR = ymd || getTodayStr();
        SELECTED_DATE_MANUAL = true; // تم اختيار التاريخ يدويًا من التقويم
        try{
          const uid=(auth.currentUser||firebase.auth().currentUser)?.uid;
          if(uid){
            localStorage.setItem(`orders:date:${uid}`, SELECTED_DATE_STR);
            localStorage.setItem(`orders:date:manual:${uid}`, '1');
          }
        }catch{}
        closeCalendar();
        syncToolbarUI();
        recomputeAndRender();
      }
    };
  });
}// ===== Firebase init =====
const firebaseConfig = {
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
  : firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ========= إعدادات عامة =========
const STATUS_REFRESH_WINDOW_DAYS = 7; // عدد الأيام التي نحدّث فيها حالة الطلب عند كل دخول
const PAGINATION = { size: 20, page: 1, orders: [] };

// تفضيلات العرض (مثل المحفظة)
let ORDERS_FILTER = 'all';   // all | pending | approved | rejected
let SELECTED_DATE_STR = null; // 'YYYY-MM-DD' — التاريخ المختار (محلي)
let SELECTED_DATE_MANUAL = false; // هل اختاره المستخدم يدويًا؟
// وضع التاريخ: يوم واحد أو نطاق
let DATE_MODE = 'single'; // 'single' | 'range'
let DATE_RANGE = { from: null, to: null }; // في حال النطاق

function pad2(n){ return (n<10? '0':'') + n; }
function getTodayStr(){ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function getMinDateStr(monthsBack){ const d=new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - (monthsBack||0)); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function formatArDateStr(str){ try{ const [y,m,da]=str.split('-').map(Number); const d=new Date(y, (m||1)-1, da||1); return d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}); }catch{ return str; } }
function isSameDayMs(ms, ymd){ if(!ms||!ymd) return false; try{ const d=new Date(ms); const s=`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; return s===ymd; }catch{ return false; } }

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
  if (v.includes('تم_الشحن') || v.includes('تم الشحن') || v.includes('shipped') || v.includes('تم-الشحن')) return 'approved';
  if (v.includes('reject') || v.includes('رفض') || v.includes('مرفوض')) return 'rejected';
  return 'pending';
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

// لم يعد هناك فرز زمني قابل للتبديل

function recomputeAndRender(){
  const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
  if (!uid) return;
  renderOrders(cacheToSortedArray(uid));
}

/* ===================== Theme (اختياري) ===================== */
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
  } catch (e) {}
});

// عند تحقق تسجيل الدخول
firebase.auth().onAuthStateChanged(async user => {
  if (!user) {
    alert("يجب تسجيل الدخول أولاً");
    window.location.href = "index.html";
  } else {
    // استرداد الفلاتر والفرز المحفوظة
    try{
      const f = localStorage.getItem(`orders:filter:${user.uid}`);
      if (f) ORDERS_FILTER = f;
      // وضع التاريخ: single/range
      const savedMode = localStorage.getItem(`orders:dateMode:${user.uid}`);
      DATE_MODE = (savedMode === 'range') ? 'range' : 'single';
      if (DATE_MODE === 'range'){
        try {
          const rawRange = localStorage.getItem(`orders:dateRange:${user.uid}`);
          const parsed = rawRange ? JSON.parse(rawRange) : null;
          DATE_RANGE = (parsed && typeof parsed === 'object') ? { from: parsed.from || null, to: parsed.to || null } : { from: null, to: null };
          if (!DATE_RANGE.from){ DATE_RANGE.from = getTodayStr(); }
        } catch { DATE_RANGE = { from: getTodayStr(), to: null }; }
      } else {
        const savedDate = localStorage.getItem(`orders:date:${user.uid}`);
        const savedManual = localStorage.getItem(`orders:date:manual:${user.uid}`) === '1';
        if (savedManual && savedDate) {
          SELECTED_DATE_STR = savedDate;
          SELECTED_DATE_MANUAL = true; // تم حفظه يدويًا سابقًا
        } else {
          // افتراضيًا اعرض آخر يوم مفتوح (اليوم)
          SELECTED_DATE_STR = getTodayStr();
          SELECTED_DATE_MANUAL = false;
          try { localStorage.setItem(`orders:date:${user.uid}`, SELECTED_DATE_STR); localStorage.setItem(`orders:date:manual:${user.uid}`, '0'); } catch {}
        }
      }
      const chipsWrap = document.getElementById('ordersToolbar');
      if (chipsWrap){
        chipsWrap.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', (c.dataset.filter||'all')===ORDERS_FILTER));
        const dc = document.getElementById('dateChip');
        if (dc){ dc.textContent = getDateChipText(); }
      }
    }catch{}
    await loadOrdersCacheFirst(user.uid);   // اعرض من الكاش أو اجلب مرة واحدة إذا فاضي
    await syncOrdersMerge(user.uid);        // عند كل دخول: اجلب وادمج الطلبات الجديدة وتحديث حالاتها
    refreshRecentStatuses(user.uid);        // كتحسين: حدّث حديثة فقط (احتياطي)
    listenOrdersRealtime(user.uid);         // متابعة فورية لأي طلب جديد/معدل
  }
});

/* ===================== LocalStorage Helpers ===================== */
/**
 * نخزن الطلبات بهذا الشكل داخل localStorage:
 * key: orders_cache:<uid>
 * value: { byCode: { CODE: orderObj }, lastSync: <timestamp> }
 * ملاحظة: نضع بيانات public داخل كائن الطلب مباشرة (playerId, total, status, timestamp, العروض ...)
 * وإذا جلبنا تفاصيل pub/priv للطلب نضيفها في حقول __pub / __priv داخل نفس الطلب.
 */
const ORDERS_KEY = (uid) => `orders_cache:${uid}`;

const LS = {
  read(uid) {
    try {
      const raw = localStorage.getItem(ORDERS_KEY(uid));
      if (!raw) return { byCode: {}, lastSync: 0 };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.byCode !== 'object') return { byCode: {}, lastSync: 0 };
      return parsed;
    } catch {
      return { byCode: {}, lastSync: 0 };
    }
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
    try {
      localStorage.setItem(ORDERS_KEY(uid), JSON.stringify(obj));
    } catch (e) {
      console.warn("تعذّر الحفظ في LocalStorage (قد تكون المساحة ممتلئة).", e);
    }
  },
  clear(uid) {
    try { localStorage.removeItem(ORDERS_KEY(uid)); } catch {}
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
  }
}

// قراءة مرّة واحدة لكل الطلبات الخاصة بالمستخدم (لملء الكاش فقط عند فراغه)
async function fetchOrdersFromFirebaseOnce(uid) {
  // محاولة أولى: الشكل المجمّع orders/<uid> (byCode)
  try {
    const doc = await db.collection('orders').doc(uid).get();
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
  const snapshot = await db.collection("orders").where("userId", "==", uid).get();
  const promises = snapshot.docs.map(async (doc) => {
    const orderData = doc.data() || {};
    const pubSnap = await doc.ref.collection("public").doc("main").get();
    const pubData = pubSnap.exists ? pubSnap.data() : {};
    return { code: orderData.code || doc.id, ...pubData, proof: orderData.proof || "", __fetchedAt: Date.now() };
  });
  const ordersArray = await Promise.all(promises);
  return ordersArray.sort((a,b)=>{ const tA=a.timestamp?new Date(a.timestamp).getTime():0; const tB=b.timestamp?new Date(b.timestamp).getTime():0; return tB-tA; });
}

// جلب جميع الطلبات ودمجها مع الكاش (يضمن ظهور الجديدة بعد كل دخول)
async function syncOrdersMerge(uid) {
  try {
    const doc = await db.collection('orders').doc(uid).get();
    if (doc.exists) {
      const data = doc.data() || {}; const byCode = data.byCode || {};
      const fresh = Object.keys(byCode).map(k=>{ const entry=byCode[k]||{}; const pub=entry.public||{}; const priv=entry.private||{}; return { code: entry.code||k, ...pub, __pub: pub, __priv: priv, __fetchedAt: Date.now() }; });
      LS.merge(uid, fresh); renderOrders(cacheToSortedArray(uid)); return;
    }
  } catch(_){ }
  try {
    const snapshot = await db.collection('orders').where('userId','==',uid).get();
    const promises = snapshot.docs.map(async (doc)=>{ const orderData=doc.data()||{}; const pubSnap=await doc.ref.collection('public').doc('main').get(); const pubData=pubSnap.exists?pubSnap.data():{}; return { code: orderData.code||doc.id, ...pubData, proof: orderData.proof||'', __fetchedAt: Date.now() }; });
    const fresh = await Promise.all(promises); LS.merge(uid, fresh); renderOrders(cacheToSortedArray(uid));
  }catch(e){ console.error('syncOrdersMerge error:', e); }
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
    const doc = await db.collection('orders').doc(uid).get();
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
        const orderRef = db.collection('orders').doc(code);
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

  // حفظ البيانات وتبديل إلى الصفحة الأولى
  let list = Array.isArray(orders) ? orders.slice() : [];
  list = applyOrdersFilter(list);
  list = applyDateFilter(list);
  PAGINATION.orders = list;
  PAGINATION.page = 1;

  drawOrdersPage();
}

function drawOrdersPage() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  ordersList.innerHTML = "";

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
          <rect x="12" y="14" rx="8" ry="8" width="56" height="68" fill="#0f172a" opacity="0.15"/>
          <rect x="20" y="8" rx="8" ry="8" width="56" height="68" class="paper" fill="#e5e7eb"/>
          <rect x="34" y="4" width="28" height="10" rx="3" class="clip" fill="#7c3aed"/>
          <circle cx="48" cy="3" r="3" class="dot" fill="#a78bfa"/>
        </g>
        <!-- الأمامية: أزحناها قليلًا لليمين ليصبح المركز بينهما -->
        <g transform="translate(8,6)">
          <rect x="12" y="14" rx="8" ry="8" width="56" height="68" fill="#0f172a" opacity="0.15"/>
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
    const { code, playerId, total, country, payment, العروض: offers, timestamp, status, proof } = order;
    const existing = document.getElementById(`order-${code}`);
    if (existing) existing.remove();

    let formattedDate = "";
    try {
      formattedDate = new Date(timestamp).toLocaleString("ar-EG", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      formattedDate = timestamp || "غير معروف";
    }

    let offersFormatted = "";
    if (offers) {
      offersFormatted = offers
        .split("•")
        .filter(item => item.trim())
        .map(item => `<li>${item.trim()}</li>`)
        .join("");
      offersFormatted = `<ul style="padding-right:20px;">${offersFormatted}</ul>`;
    }

    let statusClass = "";
    if (status === "مرفوض") statusClass = "مرفوض";
    else if (status === "تم_الشحن") statusClass = "تم_الشحن";

    const card = document.createElement("div");
    card.className = "order-card";
    card.id = `order-${code}`;

    card.innerHTML = `
      <div class="order-header" onclick="toggleDetails('${code}')">
        <div>
          <strong>كود الطلب:</strong> ${code}<br>
          🎮 <strong>${playerId || "-"}</strong> | 💵 <strong>${total || "-"}</strong>
        </div>
        <div class="order-status ${statusClass}">
          ${status === "تم_الشحن" ? "تم الشحن" : (status || "قيد المعالجة")}
        </div>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="order-details" id="details-${code}" style="display:none;">
        <p><strong>🆔 معرف اللاعب:</strong> ${playerId || "غير متوفر"}</p>
        <p><strong>🎁 العروض:</strong> ${offersFormatted || "-"}</p>
        <p><strong>💵 المجموع:</strong> ${total || "-"}</p>
        <p><strong>📅 تاريخ الإرسال:</strong> ${formattedDate}</p>
        ${
          proof
            ? `<p>
                 <strong>📸 إثبات التحويل:</strong>
                 <button class="btn-show-proof" data-code="${code}">عرض الصورة</button><br>
                 <img id="proof-img-${code}" src="${proof}" alt="إثبات التحويل" style="display:none; max-width:100%; margin-top:10px;">
               </p>`
            : ``
        }
      </div>
    `;

    ordersList.appendChild(card);
  });

  attachProofButtons();
  renderPaginationControls(total, page, totalPages, start, end);
}

// مزامنة الواجهة مع التفضيلات الحالية (إذا وُجدت العناصر)
function syncToolbarUI(){
  try{
    const wrap = document.getElementById('ordersToolbar');
    if (!wrap) return false;
    wrap.querySelectorAll('.chip').forEach(c=>{
      const f = c.dataset.filter || 'all';
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
    const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
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
  try{
    const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
    if (uid) localStorage.setItem(`orders:filter:${uid}`, ORDERS_FILTER);
  }catch{}
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
  try{
    const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
    if (uid){
      localStorage.setItem(`orders:dateMode:${uid}`, DATE_MODE);
      localStorage.setItem(`orders:dateRange:${uid}`, JSON.stringify(DATE_RANGE));
      localStorage.setItem(`orders:date:${uid}`, SELECTED_DATE_STR);
      localStorage.setItem(`orders:date:manual:${uid}`, SELECTED_DATE_MANUAL ? '1' : '0');
    }
  }catch{}
  syncToolbarUI();
  recomputeAndRender();
});

// عند اكتمال تحميل DOM حاول مزامنة الواجهة (قد تكون العناصر أنشئت هناك)
document.addEventListener('DOMContentLoaded', () => { setTimeout(syncToolbarUI, 0); });

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

/* ===================== استماع فوري لتغيرات الطلبات ===================== */
let _ordersUnsub = null;
function listenOrdersRealtime(uid) {
  try { if (_ordersUnsub) { _ordersUnsub(); _ordersUnsub = null; } } catch {}
  try {
    const docRef = db.collection('orders').doc(uid);
    _ordersUnsub = docRef.onSnapshot((snap)=>{
      try{
        if (!snap.exists) return;
        const data = snap.data() || {}; const byCode = data.byCode || {};
        const fresh = Object.keys(byCode).map(k=>{ const entry=byCode[k]||{}; const pub=entry.public||{}; const priv=entry.private||{}; return { code: entry.code||k, ...pub, __pub: pub, __priv: priv, __fetchedAt: Date.now() }; });
        const uidNow = (auth.currentUser || firebase.auth().currentUser)?.uid; if (uidNow){ LS.merge(uidNow, fresh); renderOrders(cacheToSortedArray(uidNow)); }
      }catch(e){ console.warn('agg realtime merge failed', e); }
    });
  } catch (e) {
    console.warn('listenOrdersRealtime failed', e);
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
      b.style.background = '#0f172a'; b.style.color = '#e6edf3'; b.style.borderColor = '#334155';
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
    if (p === page) { btn.style.fontWeight = '800'; btn.style.borderColor = '#0077cc'; }
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

  const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
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
    const orderRef = db.collection("orders").doc(code);
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
  const appendRow = (label, value) => {
    rows += `<tr>
               <td style="padding:10px;font-weight:bold;border:1px solid #ccc;">${label}</td>
               <td style="padding:10px;border:1px solid #ccc;">${value}</td>
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
      const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
      if (!uid) return;
      showOrdersSkeleton(1);
      try {
        const fresh = await fetchOrdersFromFirebaseOnce(uid);
        LS.replace(uid, fresh);
        renderOrders(fresh);
        // بعد التحديث الكامل، ما زلنا نطبّق قاعدة 7 أيام تلقائيًا عند الدخول القادم
      } catch (e) {
        console.error(e);
      }
    };
  }

  if (btnClear) {
    btnClear.onclick = () => {
      const uid = (auth.currentUser || firebase.auth().currentUser)?.uid;
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
}



