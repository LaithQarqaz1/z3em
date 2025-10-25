(function(){
  if (typeof window === 'undefined') return;
  if (window.__WALLET_SCRIPT_ATTACHED__) return;
  window.__WALLET_SCRIPT_ATTACHED__ = true;

  window.__initWalletPage = function(){
    if (window.__WALLET_PAGE_ACTIVE__) return;
    window.__WALLET_PAGE_ACTIVE__ = true;

    if (typeof firebase === 'undefined') {
      console.warn('المحفظة: Firebase غير متاح.');
      window.__WALLET_PAGE_ACTIVE__ = false;
      return;
    }

    try {
      if (window.__ORIG_FIREBASE__){
        if (window.__ORIG_FIREBASE__.auth) firebase.auth = window.__ORIG_FIREBASE__.auth;
        if (window.__ORIG_FIREBASE__.firestore) firebase.firestore = window.__ORIG_FIREBASE__.firestore;
      }
      window.__SKIP_FIREBASE__ = false;
    } catch(_){ }

    try {
      if ((!firebase.apps || !firebase.apps.length) && window.__FIREBASE_CONFIG__){
        firebase.initializeApp(window.__FIREBASE_CONFIG__);
      }
    } catch(_){ }

    var authInstance = null;
    var dbInstance = null;
    try { authInstance = (typeof window.auth !== 'undefined' && window.auth) ? window.auth : firebase.auth(); } catch(_){ }
    try { dbInstance = (typeof window.db !== 'undefined' && window.db) ? window.db : firebase.firestore(); } catch(_){ }

    if (!authInstance || !dbInstance) {
      console.warn('المحفظة: تعذر الوصول إلى Firebase.');
      window.__WALLET_PAGE_ACTIVE__ = false;
      return;
    }

    (function(auth, db){
      const listEl = document.getElementById('walletList');
      const chipsWrap = document.getElementById('walletToolbar');

      if (!listEl || !chipsWrap){
        window.__WALLET_PAGE_ACTIVE__ = false;
        return;
      }

      const CACHE_PREFIX = 'wallet:cache:';
      const FILTER_PREFIX = 'wallet:filter:';
      const LAST_CODE_PREFIX = 'wallet:lastCode:';
      const CACHE_TTL_MS = 30 * 60 * 1000; // 30 دقيقة
      const RECENT_WINDOW_DAYS = 3;
      const SOURCE_FINANCE = 'financeRequests';
      const SOURCE_ORDERS = 'orders';

      let ALL_ITEMS = [];
      let CURRENT_FILTER = 'all';

      function cardSkeleton(){ const d=document.createElement('div'); d.className='card loading'; d.style.height='92px'; return d; }
      function showSkeleton(n=3){ listEl.innerHTML=''; for(let i=0;i<n;i++) listEl.appendChild(cardSkeleton()); }
      function showEmpty(){ listEl.innerHTML = '<div class="empty">لا توجد عمليات مالية حالياً.</div>'; }

      function asDate(ts){
        try{
          if (!ts) return null;
          if (ts.toDate) return ts.toDate();
          if (typeof ts === 'object' && ts.seconds) return new Date(ts.seconds * 1000);
          return new Date(ts);
        }catch(_){ return null; }
      }
      function formatDate(ts){
        const d = asDate(ts);
        if (!d || isNaN(d.getTime())) return ts || '-';
        try{
          return d.toLocaleString('ar-EG',{ weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
        }catch(_){ return d.toString(); }
      }

      function normStatus(s){
        const v = (s||'').toString().toLowerCase();
        if (v.includes('reject') || v.includes('مرفوض')) return 'rejected';
        if (v.includes('approved') || v.includes('done') || v.includes('completed') || v.includes('تم') || v.includes('مقبول')) return 'approved';
        return 'pending';
      }
      function statusClass(s){
        const n = normStatus(s);
        if (n === 'rejected') return 'status rejected';
        if (n === 'approved') return 'status approved';
        return 'status pending';
      }
      function statusLabel(s){
        const n = normStatus(s);
        if (n === 'rejected') return 'مرفوضة';
        if (n === 'approved') return 'مقبولة';
        return 'قيد المراجعة';
      }
      function directionFromCode(code, fallback){
        const upper = (code||'').toString().toUpperCase();
        if (upper.startsWith('WDR')) return 'out';
        if (upper.startsWith('DEP')) return 'in';
        return fallback || 'in';
      }
      function directionIcon(direction){ return direction === 'out' ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'; }
      function directionText(direction){ return direction === 'out' ? 'صادر' : 'وارد'; }
      function computeDirection(data, code, fallback){
        if (data && data.direction){
          const d = String(data.direction).toLowerCase();
          if (d === 'out' || d === 'withdraw') return 'out';
          if (d === 'in'  || d === 'deposit') return 'in';
        }
        if (data && data.type){
          const t = String(data.type).toLowerCase();
          if (t === 'withdraw') return 'out';
          if (t === 'deposit') return 'in';
        }
        return directionFromCode(code, fallback);
      }
      function resolveSource(rawSource, direction){
        const val = (rawSource||'').toString();
        if (val === SOURCE_ORDERS) return SOURCE_ORDERS;
        if (val === SOURCE_FINANCE) return SOURCE_FINANCE;
        if (val === 'depositRequests' || val === 'withdrawRequests') return SOURCE_FINANCE;
        if (direction === 'out' || direction === 'in') return SOURCE_FINANCE;
        return SOURCE_FINANCE;
      }
      function isFinanceSource(source){
        return resolveSource(source, 'in') === SOURCE_FINANCE;
      }

      function renderRecords(items){
        listEl.innerHTML='';
        if (!items.length) { showEmpty(); return; }
        items.forEach(it=>{
          const code = it.code || it.depositCode || it.id || '-';
          const direction = computeDirection(it, code, 'in');
          const source = resolveSource(it.source, direction);
          const st   = it.status || it.state || it.depositStatus || 'pending';
          const ts   = it.timestamp || it.createdAt || it.created_at || '';
          const paidVal = (it.amountCurrency!=null) ? Number(it.amountCurrency) : (it.client_payAmount!=null ? Number(it.client_payAmount) : (it.payAmount!=null ? Number(it.payAmount) : null));
          const paidCur = it.currency || '';
          const paid = (paidVal!=null) ? (paidVal.toFixed(2) + (paidCur? (' ' + paidCur):'')) : '';
          const addedVal = (it.amountUSD!=null)? Number(it.amountUSD)
                        : (it.addedUSD!=null)? Number(it.addedUSD)
                        : (it.addedAmount!=null)? Number(it.addedAmount)
                        : (it.amountJOD!=null)? Number(it.amountJOD)
                        : (it.added!=null)? Number(it.added)
                        : null;
          const added = (addedVal!=null && isFinite(addedVal)) ? (addedVal.toFixed(2) + ' USD') : '';
          const addedLabel = direction === 'out' ? 'سيخصم من المحفظة' : 'سيضاف للمحفظة';
          const proof= it.proof || it.proofUrl || '';
          const method = it.methodName || it.method || '';
          const country= it.countryName || it.country || '';

          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `
            <header>
              <div class="header-left">
                <span class="direction ${direction}"><i class="fa-solid ${directionIcon(direction)}"></i>${directionText(direction)}</span>
                <span class="code"><span class="code-label">كود:</span> <button class="code-btn" data-code="${code}" data-source="${source}">${code}</button></span>
              </div>
              <button class="code-status-btn ${statusClass(st)}" data-code="${code}" data-source="${source}">${statusLabel(st)}</button>
            </header>
            <div class="meta">
              ${paid? `<span class="meta-paid"><i class="fas fa-money-bill-wave"></i> المدفوع: <b>${paid}</b></span>`:''}
              ${added? `<span class="meta-added"><i class="fas fa-plus-circle"></i> ${addedLabel}: <b>${added}</b></span>`:''}
              ${ts? `<span class="meta-date"><i class="fas fa-clock"></i> ${formatDate(ts)}</span>`:''}
            </div>
            <div class="details">
              ${(country||method) ? `<span class="meta-place"><i class="fas fa-globe"></i> ${country} ${method? '• '+method:''}</span>` : ''}
              ${proof? `<div class="proof"><i class="fas fa-image"></i> إثبات: <a href="${proof}" target="_blank" rel="noopener">عرض</a></div>`:''}
            </div>
          `;
          card.dataset.direction = direction;
          card.dataset.source = source;
          listEl.appendChild(card);
        });
      }

      function readCache(uid){
        try{
          const raw = localStorage.getItem(CACHE_PREFIX+uid);
          if (!raw) return { order:[], byCode:{}, lastSync:0 };
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object') return { order:[], byCode:{}, lastSync:0 };
          parsed.order = Array.isArray(parsed.order) ? parsed.order : [];
          parsed.byCode = (parsed.byCode && typeof parsed.byCode === 'object') ? parsed.byCode : {};
          return parsed;
        }catch(_){ return { order:[], byCode:{}, lastSync:0 }; }
      }
      function saveCache(uid, obj){
        try{ localStorage.setItem(CACHE_PREFIX+uid, JSON.stringify(obj||{})); }catch(_){ }
      }
      function replaceCache(uid, arr){
        const c = { order:[], byCode:{}, lastSync: Date.now() };
        arr.forEach(it=>{
          const code = it.code || it.depositCode || it.id;
          if (!code) return;
          c.order.push(code);
          c.byCode[code] = { ...it, code };
        });
        saveCache(uid, c);
      }
      function upsertCache(uid, code, data){
        const c = readCache(uid);
        c.byCode = c.byCode || {};
        c.order = Array.isArray(c.order) ? c.order : [];
        const existing = c.byCode[code] || {};
        const merged = { ...existing, ...data };
        const direction = computeDirection(merged, code, existing.direction || directionFromCode(code));
        const source = resolveSource(merged.source || existing.source, direction);
        c.byCode[code] = { ...merged, code, direction, source, __cachedAt: Date.now() };
        if (!c.order.includes(code)) c.order.unshift(code);
        c.lastSync = Date.now();
        saveCache(uid, c);
      }
      function cacheToArray(uid){
        const c = readCache(uid);
        const arr = (c.order||[]).map(code => {
          const stored = (c.byCode||{})[code] || {};
          const direction = computeDirection(stored, code, stored.direction || directionFromCode(code));
          const source = resolveSource(stored.source, direction);
          return { code, direction, source, ...stored };
        }).filter(x => x && (x.code||x.id));
        arr.sort((a,b)=>{
          const ta = asDate(a.createdAt || a.computedAt || a.timestamp)?.getTime() || 0;
          const tb = asDate(b.createdAt || b.computedAt || b.timestamp)?.getTime() || 0;
          return tb - ta;
        });
        return arr;
      }
      function isRecent(ts){
        const d = asDate(ts); if (!d) return true;
        return (Date.now() - d.getTime()) <= RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      }

      function updateCardFromData(card, data, direction, source){
        if (!card || !data) return;
        const code = data.code || data.id || card.querySelector('.code-btn')?.dataset.code || '';
        const dir = computeDirection(data, code, direction || card.dataset.direction || directionFromCode(code));
        const src = resolveSource(source || card.dataset.source, dir);
        const st = data.status || data.state || 'pending';
        const paidVal = (data.amountCurrency!=null)? Number(data.amountCurrency) : (data.client_payAmount!=null? Number(data.client_payAmount) : (data.payAmount!=null? Number(data.payAmount): null));
        const paidCur = data.currency || '';
        const paid = (paidVal!=null)? (paidVal.toFixed(2) + (paidCur? (' '+paidCur):'')) : '';
        const addedVal = (data.amountUSD!=null)? Number(data.amountUSD)
                        : (data.addedUSD!=null)? Number(data.addedUSD)
                        : (data.addedAmount!=null)? Number(data.addedAmount)
                        : (data.amountJOD!=null)? Number(data.amountJOD)
                        : (data.added!=null)? Number(data.added)
                        : null;
        const added = (addedVal!=null && isFinite(addedVal)) ? (addedVal.toFixed(2) + ' USD') : '';
        const addedLabel = dir === 'out' ? 'سيخصم من المحفظة' : 'سيضاف للمحفظة';
        const ts = data.createdAt || data.computedAt || data.timestamp || '';
        const method = data.methodName || data.method || '';
        const country= data.countryName || data.country || '';
        const proof = data.proof || data.proofUrl || '';

        card.dataset.direction = dir;
        card.dataset.source = src;

        const statusBtn = card.querySelector('.code-status-btn');
        if (statusBtn){ statusBtn.className = `code-status-btn ${statusClass(st)}`; statusBtn.textContent = statusLabel(st); statusBtn.dataset.source = src; }
        const codeBtn = card.querySelector('.code-btn');
        if (codeBtn){ codeBtn.dataset.source = src; }
        const dirEl = card.querySelector('.direction');
        if (dirEl){ dirEl.className = `direction ${dir}`; dirEl.innerHTML = `<i class="fa-solid ${directionIcon(dir)}"></i>${directionText(dir)}`; }
        const paidEl = card.querySelector('.meta-paid'); if (paidEl && paid) paidEl.innerHTML = `<i class="fas fa-money-bill-wave"></i> المدفوع: <b>${paid}</b>`;
        const addedEl= card.querySelector('.meta-added'); if (addedEl && added) addedEl.innerHTML = `<i class="fas fa-plus-circle"></i> ${addedLabel}: <b>${added}</b>`;
        const dateEl = card.querySelector('.meta-date'); if (dateEl && ts) dateEl.innerHTML = `<i class="fas fa-clock"></i> ${formatDate(ts)}`;
        const placeEl= card.querySelector('.meta-place'); if (placeEl) placeEl.innerHTML = `<i class="fas fa-globe"></i> ${country} ${method? '• '+method:''}`;
        const proofEl= card.querySelector('.proof a'); if (proofEl && proof) proofEl.href = proof;
      }

      function codeLooksLike(prefix, value){
        const upper = String(value || '').toUpperCase();
        return upper.startsWith(prefix);
      }

      async function fetchFinanceRequests(uid){
        const results = [];
        const seen = new Set();
        const baseRef = db.collection('users').doc(uid).collection(SOURCE_FINANCE);
        const LIMIT = 120;

        const addDocs = (snapDocs) => {
          snapDocs.forEach(doc => {
            const data = doc.data() || {};
            const code =
              data.code ||
              data.depositCode ||
              data.withdrawCode ||
              data.id ||
              doc.id;
            if (!code || seen.has(code)) return;
            const direction = computeDirection(data, code, directionFromCode(code));
            seen.add(code);
            results.push({
              id: doc.id,
              code,
              direction,
              source: SOURCE_FINANCE,
              ...data
            });
          });
        };

        try{
          const snap = await baseRef.orderBy('createdAt','desc').limit(LIMIT).get();
          addDocs(snap.docs);
        }catch(error){
          const msg = String(error && error.message || error || '');
          if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')){
            try{
              const snapFallback = await baseRef.limit(LIMIT).get();
              addDocs(snapFallback.docs);
            }catch(_){ /* ignore */ }
          } else if (error?.code === 'permission-denied') {
            // ignore silently
          } else {
            console.warn('[wallet] financeRequests query failed', error);
          }
        }

        if (!results.length){
          try{
            const snap = await baseRef.get();
            addDocs(snap.docs);
          }catch(_){ }
        }

        results.sort((a,b)=>{
          const ta = asDate(a.createdAt || a.computedAt || a.timestamp)?.getTime() || 0;
          const tb = asDate(b.createdAt || b.computedAt || b.timestamp)?.getTime() || 0;
          return tb - ta;
        });
        return results;
      }

      async function fetchFromOrdersPrefix(uid){
        try{
          const snap = await db.collection('orders').where('userUid','==',uid).orderBy('createdAt','desc').limit(20).get();
          const arr = snap.docs.map(d=>({ id:d.id, code:d.id, direction:'in', source:SOURCE_ORDERS, ...d.data() })).filter(x => codeLooksLike('DEP', x.id));
          return arr;
        }catch(_){ return []; }
      }

      function applyFilter(arr){
        if (CURRENT_FILTER === 'all') return arr.slice();
        return arr.filter(item => normStatus(item.status || item.state) === CURRENT_FILTER);
      }

      async function loadWallet(){
        const user = auth.currentUser;
        if (!user){ listEl.innerHTML = '<div class="empty">يرجى تسجيل الدخول لعرض محفظتك.</div>'; return; }
        showSkeleton();

        const uid = user.uid;
        let usedCache = false;
        const cache = readCache(uid);
        if (cache.order && cache.order.length){
          ALL_ITEMS = cacheToArray(uid);
          usedCache = true;
        } else {
          const finance = await fetchFinanceRequests(uid);
          let combined = [...finance];
          if (!combined.length){
            combined = await fetchFromOrdersPrefix(uid);
          }
          combined.sort((a,b)=>{
            const ta = asDate(a.createdAt || a.computedAt || a.timestamp)?.getTime() || 0;
            const tb = asDate(b.createdAt || b.computedAt || b.timestamp)?.getTime() || 0;
            return tb - ta;
          });
          ALL_ITEMS = combined;
          replaceCache(uid, combined);
        }

        try{
          const savedFilter = localStorage.getItem(FILTER_PREFIX+uid);
          if (savedFilter) CURRENT_FILTER = savedFilter;
        }catch(_){ }

        renderRecords(applyFilter(ALL_ITEMS));
        chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', (c.dataset.filter||'all') === CURRENT_FILTER));

        try{
          const last = localStorage.getItem(LAST_CODE_PREFIX+uid);
          if (last){
            const btn = listEl.querySelector(`.code-btn[data-code="${last}"]`) || listEl.querySelector(`.code-status-btn[data-code="${last}"]`);
            if (btn){
              const card = btn.closest('.card');
              if (card){
                card.classList.add('selected');
                const cached = readCache(uid).byCode?.[last];
                if (cached) updateCardFromData(card, cached, cached.direction, cached.source);
              }
            }
          }
        }catch(_){ }

        if (usedCache && (!cache.lastSync || (Date.now()-cache.lastSync) > CACHE_TTL_MS)){
          const recentCodes = (cache.order||[]).filter(code => {
            const it = (cache.byCode||{})[code] || {};
            return isRecent(it.createdAt || it.computedAt || it.timestamp);
          }).slice(0,20);
          for (const code of recentCodes){
            try{
              const stored = (cache.byCode||{})[code] || {};
              const direction = computeDirection(stored, code, stored.direction || directionFromCode(code));
              const source = resolveSource(stored.source, direction);
              let snap = null;
              if (source === SOURCE_FINANCE){
                snap = await db.collection('users').doc(uid).collection(SOURCE_FINANCE).doc(code).get();
              } else {
                snap = await db.collection(source).doc(code).get();
              }
              if (snap && snap.exists){
                const data = snap.data() || {};
                const freshDirection = computeDirection(data, code, direction);
                const freshSource = resolveSource(source, freshDirection);
                const fresh = { id:snap.id, code:snap.id, direction: freshDirection, source: freshSource, ...data };
                upsertCache(uid, code, fresh);
                const card = listEl.querySelector(`.code-btn[data-code="${code}"]`)?.closest('.card') || listEl.querySelector(`.code-status-btn[data-code="${code}"]`)?.closest('.card');
                if (card) updateCardFromData(card, fresh, fresh.direction, freshSource);
              }
            }catch(_){ }
          }
        }
      }

      chipsWrap.addEventListener('click', (e)=>{
        const btn = e.target.closest('.chip');
        if (!btn) return;
        CURRENT_FILTER = btn.dataset.filter || 'all';
        chipsWrap.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c===btn));
        const user = auth.currentUser;
        if (user){
          try{ localStorage.setItem(FILTER_PREFIX+user.uid, CURRENT_FILTER); }catch(_){ }
        }
        renderRecords(applyFilter(ALL_ITEMS));
      });

      listEl.addEventListener('click', async (e)=>{
        const btn = e.target.closest('.code-btn, .code-status-btn');
        if (!btn) return;
        const code = btn.dataset.code;
        const card = btn.closest('.card');
        if (!code || !card) return;
        const user = auth.currentUser;
        if (!user) return;
        const uid = user.uid;

        try{
          const cached = readCache(uid).byCode?.[code];
          if (cached) updateCardFromData(card, cached, cached.direction, cached.source);
        }catch(_){ }

        try{
          const directionHint = card.dataset.direction || directionFromCode(code);
          const source = resolveSource(btn.dataset.source || card.dataset.source, directionHint);
          let snap = null;
          if (source === SOURCE_FINANCE){
            snap = await db.collection('users').doc(uid).collection(SOURCE_FINANCE).doc(code).get();
          } else {
            snap = await db.collection(source).doc(code).get();
          }
          if (snap && snap.exists){
            const data = snap.data() || {};
            const freshDirection = computeDirection(data, code, directionHint);
            const freshSource = resolveSource(source, freshDirection);
            const fresh = { id:snap.id, code:snap.id, direction: freshDirection, source: freshSource, ...data };
            updateCardFromData(card, fresh, freshDirection, freshSource);
            upsertCache(uid, code, fresh);
            try{ localStorage.setItem(LAST_CODE_PREFIX+uid, code); }catch(_){ }
            const idx = ALL_ITEMS.findIndex(x => (x.code||x.id) === code);
            if (idx >= 0) ALL_ITEMS[idx] = { ...ALL_ITEMS[idx], ...fresh, direction: freshDirection, source: freshSource };
          }
        }catch(_){ }

        listEl.querySelectorAll('.card.selected').forEach(el => { if (el!==card) el.classList.remove('selected'); });
        card.classList.add('selected');
      });

      function init(){
        showSkeleton();
        loadWallet();
      }

      window.__WALLET_REFRESH__ = function(){ try { loadWallet(); }catch(_){ } };
      try {
        auth.onAuthStateChanged(() => { loadWallet(); });
      } catch(_){}

      if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init, { once: true });
      } else {
        init();
      }
    })(authInstance, dbInstance);
  };
})();
