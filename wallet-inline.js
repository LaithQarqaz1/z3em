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

      const refreshBtn = document.getElementById('refreshWallet');

      if (!listEl || !chipsWrap){
        window.__WALLET_PAGE_ACTIVE__ = false;
        return;
      }

      const CACHE_PREFIX = 'wallet:cache:';
      const FILTER_PREFIX = 'wallet:filter:';
      const LAST_CODE_PREFIX = 'wallet:lastCode:';

      let ALL_ITEMS = [];
      let CURRENT_FILTER = 'all';
      let LAST_USER_ID = null;

      function cardSkeleton(){ const d=document.createElement('div'); d.className='card loading'; d.style.minHeight='118px'; return d; }
      function showSkeleton(n=3){ listEl.innerHTML=''; for(let i=0;i<n;i++) listEl.appendChild(cardSkeleton()); }
      function showEmpty(){ listEl.innerHTML = '<div class="empty">لا توجد معاملات للمحفظة حتى الآن.</div>'; }
      function showRequiresAuth(){
        listEl.innerHTML = '<div class="empty">يرجى تسجيل الدخول لعرض معاملات محفظتك.</div>';
        chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        ALL_ITEMS = [];
        CURRENT_FILTER = 'all';
        LAST_USER_ID = null;
      }

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

      function parseNumeric(value){
        if (value == null) return null;
        if (typeof value === 'number') return isFinite(value) ? value : null;
        if (typeof value === 'string'){
          var cleaned = value.replace(/[^\d\-,.]/g,'').replace(/,/g,'');
          if (!cleaned) return null;
          var num = Number(cleaned);
          return isFinite(num) ? num : null;
        }
        return null;
      }

      function pickNumber(item, keys){
        if (!item || !keys || !keys.length) return null;
        for (var i = 0; i < keys.length; i++){
          var key = keys[i];
          if (!key) continue;
          var val = item[key];
          var num = parseNumeric(val);
          if (num != null) return num;
        }
        return null;
      }

      function digitsForCurrency(cur){
        if (!cur) return 2;
        var upper = String(cur).toUpperCase();
        if (upper === 'JOD' || upper === 'JO' || upper.indexOf('دينار') >= 0) return 3;
        return 2;
      }

      function formatNumber(value, digits){
        if (value == null || !isFinite(value)) return '0';
        var precise = typeof digits === 'number' ? digits : 2;
        try{
          return Number(value).toLocaleString('ar-EG',{ minimumFractionDigits: precise, maximumFractionDigits: precise });
        }catch(_){
          try{
            return Number(value).toLocaleString('en-US',{ minimumFractionDigits: precise, maximumFractionDigits: precise });
          }catch(__){
            return Number(value).toFixed(precise);
          }
        }
      }

      function pad2(num){
        var n = Number(num) || 0;
        return n < 10 ? '0'+n : String(n);
      }

      function formatShortDate(ts){
        var d = asDate(ts);
        if (!d || isNaN(d.getTime())) return '';
        var timeStr = '';
        try{
          timeStr = d.toLocaleTimeString('ar-EG',{ hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
        }catch(_){
          timeStr = pad2(d.getHours())+':'+pad2(d.getMinutes())+':'+pad2(d.getSeconds());
        }
        var dateStr = d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
        return timeStr ? (timeStr + ' ' + dateStr) : dateStr;
      }

      function formatBalanceValue(value){
        if (value == null || !isFinite(value)) return '';
        return formatNumber(value, 3) + ' JOD';
      }

      function getKind(item){
        if (!item) return 'deposit';
        if (item.__kind) return item.__kind;
        var code = getCode(item);
        if (typeof code === 'string' && code.toUpperCase().indexOf('WDR') === 0) return 'withdraw';
        return 'deposit';
      }

      function ensureKind(item, fallback){
        var kind = getKind(item);
        if (item && !item.__kind) item.__kind = kind || fallback || 'deposit';
        return item && item.__kind ? item.__kind : (fallback || 'deposit');
      }

      function resolveChange(item){
        var kind = getKind(item);
        var amount = null;
        if (kind === 'withdraw'){
          amount = pickNumber(item, ['debited', 'debitedJOD', 'amountJOD']);
          if (amount == null) amount = pickNumber(item, ['amountCurrency']);
        } else {
          amount = pickNumber(item, ['added', 'addedAmount', 'addedUSD', 'amountUSD']);
          if (amount == null) amount = pickNumber(item, ['client_payAmount', 'amountCurrency']);
        }
        if (amount == null) amount = 0;
        var currency = '';
        if (kind === 'withdraw'){
          if (item.amountJOD != null) currency = 'JOD';
          else if (item.currency) currency = item.currency;
          else currency = 'JOD';
        } else {
          if (item.addedCurrency) currency = item.addedCurrency;
          else if (item.currency) currency = item.currency;
          else currency = 'USD';
        }
        var digits = digitsForCurrency(currency);
        var absVal = Math.abs(amount);
        var signSymbol = kind === 'withdraw' ? '-' : '+';
        return {
          signSymbol: signSymbol,
          numberText: formatNumber(absVal, digits),
          currency: currency || '',
          className: signSymbol === '+' ? 'positive' : 'negative'
        };
      }

      function resolveDepositPaid(item){
        var amount = pickNumber(item, ['client_payAmount', 'amountCurrency', 'payAmount']);
        if (amount == null) return '';
        var currency = item.currency || '';
        return formatNumber(amount, digitsForCurrency(currency)) + (currency ? ' ' + currency : '');
      }

      function resolveDepositAdded(item){
        var amount = pickNumber(item, ['added', 'addedAmount', 'addedUSD', 'amountUSD']);
        if (amount == null) return '';
        var currency = item.addedCurrency || item.currency || 'USD';
        return formatNumber(amount, digitsForCurrency(currency)) + (currency ? ' ' + currency : '');
      }

      function resolveWithdrawPayout(item){
        var amount = pickNumber(item, ['amountCurrency']);
        if (amount == null) return '';
        var currency = item.currency || '';
        return formatNumber(amount, digitsForCurrency(currency)) + (currency ? ' ' + currency : '');
      }

      function resolveBalances(item){
        return {
          after: pickNumber(item, ['balanceAfter', 'balanceAfterStr']),
          before: pickNumber(item, ['balanceBefore', 'balanceBeforeStr'])
        };
      }

      function buildMetaParts(item, kind){
        var parts = [];
        var country = item.countryName || item.country || '';
        var method = item.methodName || item.method || '';
        var transferPeer = item.transferPeer || item.transferPeerUid || '';
        var transferNote = item.transferNote || '';
        if (country){
          parts.push('<span><i class="fas fa-location-dot"></i> ' + country + '</span>');
        }
        if (method){
          parts.push('<span><i class="fas fa-building-columns"></i> ' + method + '</span>');
        }
        if (kind === 'deposit'){
          var paidText = resolveDepositPaid(item);
          var addedText = resolveDepositAdded(item);
          if (paidText) parts.push('<span><i class="fas fa-money-bill-wave"></i> ' + paidText + '</span>');
          if (addedText && addedText !== paidText) parts.push('<span><i class="fas fa-circle-plus"></i> ' + addedText + '</span>');
        } else {
          var payout = resolveWithdrawPayout(item);
          if (payout) parts.push('<span><i class="fas fa-wallet"></i> ' + payout + '</span>');
          var payoutName = item.payoutName || item.receiverName || '';
          if (payoutName) parts.push('<span><i class="fas fa-user"></i> ' + payoutName + '</span>');
        }
        if (transferPeer){
          parts.push('<span><i class="fas fa-right-left"></i> ' + transferPeer + '</span>');
        }
        if (transferNote){
          parts.push('<span><i class="fas fa-note-sticky"></i> ' + transferNote + '</span>');
        }
        return parts.join('');
      }

      function buildTransactionHTML(item){
        var data = Object.assign({}, item);
        var kind = ensureKind(data, 'deposit');
        var code = getCode(data) || '-';
        var st = data.status || data.state || data.depositStatus || 'pending';
        var change = resolveChange(data);
        var balances = resolveBalances(data);
        var method = data.methodName || data.method || '';
        var titleBase = kind === 'withdraw' ? 'طلب سحب' : 'طلب إيداع';
        var title = method ? titleBase + ' - ' + method : titleBase;
        var metaHtml = buildMetaParts(data, kind);
        var ts = data.timestamp || data.createdAt || data.created_at || data.computedAt || '';
        var shortDate = formatShortDate(ts);
        var longDate = formatDate(ts);
        var proof = data.proof || data.proofUrl || '';
        var actionIcon = kind === 'withdraw' ? 'fa-arrow-up-right' : 'fa-arrow-down-left';

        var balancePieces = [];
        if (balances.after != null) {
          balancePieces.push('<span class="balance-after">' + formatBalanceValue(balances.after) + '</span>');
        }
        if (balances.before != null) {
          balancePieces.push('<span class="balance-before">' + formatBalanceValue(balances.before) + '</span>');
        }
        var balancesHtml = balancePieces.length ? '<div class="txn-balances">' + balancePieces.join('') + '</div>' : '';

        return [
          '<div class="txn-body">',
        '<div class="txn-middle">',
          '<div class="txn-title-row">',
            '<span class="txn-title">', title, '</span>',
            '<span class="', statusClass(st), '" data-role="status">', statusLabel(st), '</span>',
          '</div>',
          metaHtml ? ('<div class="txn-meta">' + metaHtml + '</div>') : '',
        '</div>',
        '<div class="txn-amount ', change.className, '">',
          '<div class="txn-value">',
            '<span class="sign">', change.signSymbol, '</span>',
            '<span class="number">', change.numberText, '</span>',
            change.currency ? '<span class="currency">' + change.currency + '</span>' : '',
          '</div>',
          balancesHtml,
        '</div>',
          '<i class="fas ' + actionIcon + '"></i>',
        '</button>',
          '</div>',
          '<div class="txn-footer">',
        '<span class="txn-code">كود: <button class="code-btn" data-code="' + code + '">' + code + '</button></span>',
        shortDate ? '<span class="txn-date" title="' + longDate + '"><i class="fas fa-clock"></i> ' + shortDate + '</span>' : '',
        proof ? '<span class="txn-proof"><i class="fas fa-image"></i> <a href="' + proof + '" target="_blank" rel="noopener">إثبات</a></span>' : '',
          '</div>'
        ].join('');
      }

      function populateTransactionCard(card, item){
        if (!card || !item) return;
        var copy = Object.assign({}, item);
        var kind = ensureKind(copy, card.dataset ? card.dataset.kind : 'deposit');
        var code = getCode(copy) || '-';
        card.dataset.code = code;
        card.dataset.kind = kind;
        card.innerHTML = buildTransactionHTML(copy);
      }

      function renderDeposits(items){
        listEl.innerHTML = '';
        if (!items.length) { showEmpty(); return; }
        items.forEach(function(it){
          var card = document.createElement('div');
          card.className = 'card';
          populateTransactionCard(card, it);
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
        const sorted = sortByNewest(arr);
        const c = { order:[], byCode:{}, lastSync: Date.now() };
        sorted.forEach(function(it){
          const item = Object.assign({}, it);
          const code = getCode(item);
          if (!code) return;
          item.__kind = ensureKind(item, item.__kind || 'deposit');
          c.order.push(code);
          c.byCode[code] = item;
        });
        saveCache(uid, c);
      }
      function upsertCache(uid, code, data){
        const c = readCache(uid);
        c.byCode = c.byCode || {};
        c.order = Array.isArray(c.order) ? c.order : [];
        const existing = c.byCode[code] || {};
        const merged = Object.assign({}, existing, data || {}, { __cachedAt: Date.now() });
        if (!merged.code) merged.code = code;
        merged.__kind = ensureKind(merged, (data && data.__kind) || existing.__kind || (typeof code === 'string' && code.toUpperCase().indexOf('WDR') === 0 ? 'withdraw' : 'deposit'));
        c.byCode[code] = merged;
        if (!c.order.includes(code)) c.order.unshift(code);
        c.lastSync = Date.now();
        saveCache(uid, c);
      }
      function cacheToArray(uid){
        const c = readCache(uid);
        const orderList = Array.isArray(c.order) ? c.order : [];
        const byCode = c.byCode || {};
        const arr = [];
        orderList.forEach(function(code){
          const stored = byCode[code];
          if (!stored) return;
          const item = Object.assign({}, stored);
          if (!item.code) item.code = code;
          item.__kind = ensureKind(item, item.__kind);
          arr.push(item);
        });
        return sortByNewest(arr);
      }

      function getCode(item){
        if (!item) return '';
        return item.code || item.depositCode || item.id || '';
      }
      function sortByNewest(arr){
        return (arr || []).slice().sort(function(a,b){
          ensureKind(a, 'deposit');
          ensureKind(b, 'deposit');
          const da = asDate(a && (a.createdAt || a.computedAt || a.timestamp));
          const db = asDate(b && (b.createdAt || b.computedAt || b.timestamp));
          const ta = da && !isNaN(da.getTime()) ? da.getTime() : 0;
          const tb = db && !isNaN(db.getTime()) ? db.getTime() : 0;
          return tb - ta;
        });
      }
      function buildSnapshotSignature(list){
        function sig(val){
          const num = parseNumeric(val);
          return (num != null && isFinite(num)) ? num.toFixed(3) : '';
        }
        return sortByNewest(list).map(function(item){
          const kind = getKind(item);
          const code = getCode(item);
          const status = normStatus((item && (item.status || item.state || item.depositStatus)) || '');
          const createdDate = asDate(item && (item.createdAt || item.computedAt || item.timestamp));
          const created = createdDate && !isNaN(createdDate.getTime()) ? createdDate.getTime() : 0;
          const changeVal = kind === 'withdraw'
            ? pickNumber(item, ['debited', 'debitedJOD', 'amountJOD', 'amountCurrency'])
            : pickNumber(item, ['added', 'addedAmount', 'addedUSD', 'amountUSD', 'client_payAmount']);
          const balanceAfterVal = pickNumber(item, ['balanceAfter', 'balanceAfterStr']);
          return [kind, code, status, created, sig(changeVal), sig(balanceAfterVal)].join('|');
        }).join('||');
      }
      function selectLastCard(uid){
        try{
          const last = localStorage.getItem(LAST_CODE_PREFIX+uid);
          if (!last) return;
          const btn = listEl.querySelector(`.code-btn[data-code="${last}"], .code-status-btn[data-code="${last}"]`);
          if (!btn) return;
          const card = btn.closest('.card');
          if (!card) return;
          card.classList.add('selected');
          const item = ALL_ITEMS.find(x => getCode(x) === last);
          if (item) updateCardFromData(card, item);
        }catch(_){ }
      }
      function displayItems(uid, items){
        ALL_ITEMS = sortByNewest(items);
        renderDeposits(applyFilter(ALL_ITEMS));
        chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', (c.dataset.filter||'all') === CURRENT_FILTER));
        selectLastCard(uid);
      }

      function updateCardFromData(card, data){
        if (!card || !data) return;
        var code = card.dataset ? card.dataset.code : null;
        if (!code) code = getCode(data);
        var merged = Object.assign({}, data);
        if (code){
          var existing = ALL_ITEMS.find(function(x){ return getCode(x) === code; });
          if (existing) merged = Object.assign({}, existing, data);
        }
        if (!merged.code) merged.code = code;
        if (card.dataset && card.dataset.kind && !merged.__kind) merged.__kind = card.dataset.kind;
        populateTransactionCard(card, merged);
      }

      function docToItem(doc, kind){
        if (!doc) return null;
        var data = typeof doc.data === 'function' ? doc.data() : (doc || {});
        var item = Object.assign({ id: doc.id }, data || {});
        if (!item.code && doc.id) item.code = doc.id;
        item.__kind = ensureKind(item, kind || item.__kind || 'deposit');
        return item;
      }

      async function fetchFromDepositRequests(uid){
        const baseRef = db.collection('depositRequests').where('userId','==',uid);
        try{
          const snap = await baseRef.orderBy('createdAt','desc').get();
          let arr = snap.docs.map(function(d){ return docToItem(d, 'deposit'); });
          arr = arr.filter(x => String(getCode(x)).toUpperCase().startsWith('DEP'));
          return arr;
        }catch(e){
          const msg = String(e && e.message || e || '');
          if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')){
            try{
              const snap2 = await baseRef.get();
              let arr = snap2.docs.map(function(d){ return docToItem(d, 'deposit'); });
              arr = arr.filter(x => String(getCode(x)).toUpperCase().startsWith('DEP'));
              arr.sort(function(a,b){
                const taDate = asDate(a && (a.createdAt || a.timestamp));
                const tbDate = asDate(b && (b.createdAt || b.timestamp));
                const ta = taDate && !isNaN(taDate.getTime()) ? taDate.getTime() : 0;
                const tb = tbDate && !isNaN(tbDate.getTime()) ? tbDate.getTime() : 0;
                return tb - ta;
              });
              return arr;
            }catch(_){ return []; }
          }
          return [];
        }
      }

      async function fetchFromOrdersPrefix(uid){
        try{
          const snap = await db.collection('orders').where('userUid','==',uid).orderBy('createdAt','desc').limit(20).get();
          const arr = snap.docs.map(function(d){ return docToItem(d, 'deposit'); }).filter(function(x){ return String(getCode(x)).toUpperCase().startsWith('DEP'); });
          return arr;
        }catch(_){ return []; }
      }

      async function fetchFromWithdrawRequests(uid){
        const baseRef = db.collection('withdrawRequests').where('userId','==',uid);
        try{
          const snap = await baseRef.orderBy('createdAt','desc').get();
          return snap.docs.map(function(d){ return docToItem(d, 'withdraw'); });
        }catch(e){
          const msg = String(e && e.message || e || '');
          if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')){
            try{
              const snap2 = await baseRef.get();
              const arr = snap2.docs.map(function(d){ return docToItem(d, 'withdraw'); });
              arr.sort(function(a,b){
                const ta = asDate(a && (a.createdAt || a.timestamp));
                const tb = asDate(b && (b.createdAt || b.timestamp));
                const taMs = ta && !isNaN(ta.getTime()) ? ta.getTime() : 0;
                const tbMs = tb && !isNaN(tb.getTime()) ? tb.getTime() : 0;
                return tbMs - taMs;
              });
              return arr;
            }catch(_){ return []; }
          }
          return [];
        }
      }

      function mergeByCode(list){
        const map = {};
        (list || []).forEach(function(item){
          const code = getCode(item);
          if (!code) return;
          const existing = map[code];
          if (existing){
            map[code] = Object.assign({}, existing, item);
          } else {
            map[code] = Object.assign({}, item);
          }
          map[code].__kind = ensureKind(map[code], item.__kind);
        });
        return Object.keys(map).map(function(code){
          const value = map[code];
          if (!value.code) value.code = code;
          value.__kind = ensureKind(value, value.__kind);
          return value;
        });
      }

      async function fetchTransfers(uid){
        try{
          const snap = await db.collection('userTransactions').doc(uid).get();
          if (!snap || !snap.exists) return [];
          return normalizeTransferEntries(snap.data() || {});
        }catch(err){
          console.warn('fetchTransfers failed', err);
          return [];
        }
      }

      function normalizeTransferEntries(data){
        var raw = [];
        if (Array.isArray(data.entries)) raw = data.entries;
        else if (data.entries && Array.isArray(data.entries.values)){
          raw = data.entries.values.map(function(v){
            return (v && v.mapValue && v.mapValue.fields) || v;
          });
        } else {
          raw = Array.isArray(data) ? data : [];
        }
        return raw.map(function(entry){
          if (!entry) return null;
          var flat = entry;
          if (entry.mapValue && entry.mapValue.fields) flat = entry.mapValue.fields;
          function readField(obj, key){
            if (!obj) return undefined;
            if (typeof obj[key] === 'object' && obj[key] !== null){
              var valObj = obj[key];
              if (valObj.stringValue != null) return valObj.stringValue;
              if (valObj.doubleValue != null) return Number(valObj.doubleValue);
              if (valObj.integerValue != null) return Number(valObj.integerValue);
              if (valObj.timestampValue != null) return valObj.timestampValue;
            }
            return obj[key];
          }
          var kind = (readField(flat,'kind') || 'deposit').toString().toLowerCase() === 'withdraw' ? 'withdraw' : 'deposit';
          var created = readField(flat,'createdAt');
          var createdDate = null;
          if (created && typeof created.toDate === 'function') createdDate = created.toDate();
          else if (created instanceof Date) createdDate = created;
          else if (typeof created === 'string'){
            var parsed = Date.parse(created);
            if (!isNaN(parsed)) createdDate = new Date(parsed);
          } else if (created && typeof created.seconds === 'number'){
            createdDate = new Date(created.seconds * 1000);
          }
          var amount = parseNumeric(readField(flat,'amount'));
          var balanceBefore = parseNumeric(readField(flat,'balanceBefore'));
          var balanceAfter = parseNumeric(readField(flat,'balanceAfter'));
          var peer = readField(flat,'peerWebuid') || readField(flat,'peerUid') || '';
          var note = readField(flat,'note') || readField(flat,'transferNote') || '';
          var currency = readField(flat,'currency') || 'JOD';
          var item = {
            code: readField(flat,'code') || '',
            status: readField(flat,'status') || 'completed',
            methodName: readField(flat,'methodName') || (kind === 'withdraw' ? ('تحويل إلى ' + (peer || 'مستلم')) : ('تحويل من ' + (peer || 'مرسل'))),
            countryName: readField(flat,'countryName') || 'تحويل داخلي',
            transferPeer: peer,
            transferNote: note,
            createdAt: createdDate || new Date(),
            timestamp: createdDate || new Date(),
            __kind: kind
          };
          if (kind === 'withdraw'){
            item.debited = amount;
            item.debitedJOD = amount;
            item.amountCurrency = amount;
            item.currency = currency;
            item.balanceBefore = balanceBefore;
            item.balanceAfter = balanceAfter;
          } else {
            item.added = amount;
            item.addedAmount = amount;
            item.addedCurrency = currency;
            item.amountJOD = amount;
            item.currency = currency;
            item.balanceBefore = balanceBefore;
            item.balanceAfter = balanceAfter;
          }
          return item;
        }).filter(Boolean);
      }

      async function fetchAllTransactions(uid){
        const depositsPromise = (async function(){
          let depositList = await fetchFromDepositRequests(uid);
          if (!depositList.length) depositList = await fetchFromOrdersPrefix(uid);
          return depositList;
        })();
        const withdrawPromise = fetchFromWithdrawRequests(uid);
        const transfersPromise = fetchTransfers(uid);
        const results = await Promise.all([depositsPromise, withdrawPromise, transfersPromise]);
        return sortByNewest(mergeByCode([].concat(results[0] || [], results[1] || [], results[2] || [])));
      }

      function applyFilter(arr){
        if (CURRENT_FILTER === 'all') return arr.slice();
        return arr.filter(function(item){ return normStatus((item && (item.status || item.state || item.depositStatus)) || '') === CURRENT_FILTER; });
      }

      async function loadWalletFor(user, opts = {}){
        if (!user){ showRequiresAuth(); return; }
        const force = !!opts.force;
        const skipSkeleton = !!opts.skipSkeleton;
        if (!skipSkeleton) showSkeleton();

        const uid = user.uid;
        if (LAST_USER_ID && LAST_USER_ID !== uid) CURRENT_FILTER = 'all';
        LAST_USER_ID = uid;

        let items = [];
        let usedCache = false;
        const cache = readCache(uid);

        if (!force && cache.order && cache.order.length){
          items = cacheToArray(uid);
          usedCache = true;
        } else {
          items = await fetchAllTransactions(uid);
          replaceCache(uid, items);
        }

        try{
          const savedFilter = localStorage.getItem(FILTER_PREFIX+uid);
          if (savedFilter) CURRENT_FILTER = savedFilter;
        }catch(_){ }

        displayItems(uid, items);
        const previousSignature = buildSnapshotSignature(ALL_ITEMS);

        if (force) return;

        if (usedCache){
          (async ()=>{
            try{
              const fresh = await fetchAllTransactions(uid);
              replaceCache(uid, fresh);
              const newSignature = buildSnapshotSignature(fresh);
              if (newSignature !== previousSignature){
                displayItems(uid, fresh);
              }
            }catch(_){ }
          })();
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
        renderDeposits(applyFilter(ALL_ITEMS));
      });

      if (refreshBtn){
        refreshBtn.addEventListener('click', (e)=>{
          try{ e.preventDefault(); }catch(_){ }
          loadWalletFor(auth.currentUser, { force: true });
        });
      }

      listEl.addEventListener('click', async (e)=>{
        const btn = e.target.closest('.code-btn, .code-status-btn');
        if (!btn) return;
        const code = btn.dataset.code;
        const card = btn.closest('.card');
        if (!code || !card) return;
        const user = auth.currentUser;
        if (!user) return;
        const uid = user.uid;

        var cached = null;
        var knownKind = (card.dataset && card.dataset.kind) || null;

        try{
          const cacheObj = readCache(uid);
          if (cacheObj && cacheObj.byCode && cacheObj.byCode[code]){
            cached = cacheObj.byCode[code];
            if (!knownKind && cached.__kind) knownKind = cached.__kind;
          }
        }catch(_){ }

        if (!knownKind){
          const existing = ALL_ITEMS.find(function(x){ return getCode(x) === code; });
          if (existing && existing.__kind) knownKind = existing.__kind;
        }

        if (cached) updateCardFromData(card, cached);

        const collections = knownKind === 'withdraw'
          ? ['withdrawRequests', 'depositRequests']
          : ['depositRequests', 'withdrawRequests'];

        let fresh = null;
        for (let i = 0; i < collections.length; i++){
          const col = collections[i];
          try{
            const snap = await db.collection(col).doc(code).get();
            if (snap && snap.exists){
              fresh = Object.assign({ id: snap.id }, snap.data() || {});
              if (!fresh.code) fresh.code = code;
              fresh.__kind = ensureKind(fresh, col === 'withdrawRequests' ? 'withdraw' : 'deposit');
              knownKind = fresh.__kind;
              break;
            }
          }catch(_){ }
        }

        if (fresh){
          updateCardFromData(card, fresh);
          upsertCache(uid, code, fresh);
          try{ localStorage.setItem(LAST_CODE_PREFIX+uid, code); }catch(_){ }
          const idx = ALL_ITEMS.findIndex(function(x){ return getCode(x) === code; });
          if (idx >= 0){
            ALL_ITEMS[idx] = Object.assign({}, ALL_ITEMS[idx], fresh);
          } else {
            ALL_ITEMS.unshift(fresh);
          }
          card.dataset.kind = knownKind || card.dataset.kind;
        }

        listEl.querySelectorAll('.card.selected').forEach(function(el){ if (el !== card) el.classList.remove('selected'); });
        card.classList.add('selected');
      });

      function init(){
        showSkeleton();

        const current = auth.currentUser;
        let firstAuthHandled = false;

        if (typeof auth.onAuthStateChanged === 'function'){
          try{
            auth.onAuthStateChanged(user => {
              const opts = { force: true, skipSkeleton: !firstAuthHandled };
              firstAuthHandled = true;
              loadWalletFor(user, opts);
            });
          }catch(_){
            if (!current) showRequiresAuth();
          }
        } else if (current){
          loadWalletFor(current, { force: true, skipSkeleton: true });
          firstAuthHandled = true;
        } else {
          showRequiresAuth();
        }
      }

      window.__WALLET_REFRESH__ = function(opts){
        try { loadWalletFor(auth.currentUser, opts || {}); }catch(_){ }
      };

      if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init, { once: true });
      } else {
        init();
      }
    })(authInstance, dbInstance);
  };
})();
