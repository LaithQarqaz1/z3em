(function(){
  if (typeof window === 'undefined') return;
  if (window.__REVIEWS_SCRIPT_ATTACHED__) return;
  window.__REVIEWS_SCRIPT_ATTACHED__ = true;

  window.__initReviewsPage = function(){
    if (window.__REVIEWS_PAGE_ACTIVE__) return;
    window.__REVIEWS_PAGE_ACTIVE__ = true;

    if (typeof firebase === 'undefined') {
      console.warn('التقييمات: Firebase غير متاح.');
      window.__REVIEWS_PAGE_ACTIVE__ = false;
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
      console.warn('التقييمات: تعذر الوصول إلى Firebase.');
      window.__REVIEWS_PAGE_ACTIVE__ = false;
      return;
    }

    (function(auth, db){
      const starsNodeList = document.querySelectorAll('#starRating i');
      const stars = Array.prototype.slice.call(starsNodeList || []);
      const reviewText = document.getElementById('reviewText');
      const submitBtn = document.getElementById('submitReview');
      const codePreview = document.getElementById('codePreview');
      const currentUserName = document.getElementById('currentUserName');
      const ratingFilters = document.getElementById('ratingFilters');
      const reviewsList = document.getElementById('reviewsList');

      if (!stars.length || !reviewText || !submitBtn || !codePreview || !currentUserName || !ratingFilters || !reviewsList){
        window.__REVIEWS_PAGE_ACTIVE__ = false;
        return;
      }

      const countsElements = {
        1: document.getElementById('count-1'),
        2: document.getElementById('count-2'),
        3: document.getElementById('count-3'),
        4: document.getElementById('count-4'),
        5: document.getElementById('count-5')
      };

      const REVIEWS_SECRET = 'QusaiStore$Reviews#2025!';
      const REVIEWS_SALT = 'qs-store-salt-2025';
      const REVIEWS_DOC = db.collection('comments').doc('all');

      function bufToBase64(buf){
        try{
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i=0;i<bytes.length;i++){ bin += String.fromCharCode(bytes[i]); }
          return btoa(bin);
        }catch(_){ return ''; }
      }
      function base64ToBuf(b64){
        try{
          const bin = atob(b64);
          const len = bin.length;
          const bytes = new Uint8Array(len);
          for (let i=0;i<len;i++){ bytes[i] = bin.charCodeAt(i); }
          return bytes.buffer;
        }catch(_){ return new ArrayBuffer(0); }
      }

      async function getAesKey(){
        if (!(window.crypto && crypto.subtle)) throw new Error('Crypto unavailable');
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(REVIEWS_SECRET), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name:'PBKDF2', salt: enc.encode(REVIEWS_SALT), iterations: 150000, hash: 'SHA-256' },
          keyMaterial,
          { name:'AES-GCM', length:256 },
          false,
          ['encrypt','decrypt']
        );
      }

      async function encryptBody(body){
        try{
          if (!(window.crypto && crypto.subtle)) return JSON.stringify(body);
          const key = await getAesKey();
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const enc = new TextEncoder();
          const data = enc.encode(JSON.stringify(body||{}));
          const cipherBuf = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, data);
          const ivAndCt = new Uint8Array(iv.length + cipherBuf.byteLength);
          ivAndCt.set(iv, 0);
          ivAndCt.set(new Uint8Array(cipherBuf), iv.length);
          return 'enc:v1:' + bufToBase64(ivAndCt.buffer);
        }catch(_){ return JSON.stringify(body||{}); }
      }

      async function decryptPayloadToObject(payload){
        try{
          if (typeof payload !== 'string') return {};
          if (payload.startsWith('enc:v1:') && window.crypto && crypto.subtle){
            const b64 = payload.slice(7);
            const buf = base64ToBuf(b64);
            const bytes = new Uint8Array(buf);
            if (bytes.length < 13) return {};
            const iv = bytes.slice(0,12);
            const ct = bytes.slice(12);
            const key = await getAesKey();
            const plainBuf = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
            const dec = new TextDecoder().decode(plainBuf);
            try { return JSON.parse(dec); } catch(_){ return {}; }
          }
          try { return JSON.parse(payload); } catch(_){ }
          try { return parsePayloadSafe(payload)||{}; } catch(_){ }
          return {};
        }catch(_){ return {}; }
      }

      async function decodeDocDataToBody(data){
        try{
          if (data && typeof data.payload === 'string'){
            return await decryptPayloadToObject(data.payload);
          }
          return data || {};
        }catch(_){ return {}; }
      }

      let selectedRating = 0;
      let currentFilter = 0;
      let reviewsData = [];

      auth.onAuthStateChanged(user => {
        if (user && user.emailVerified) {
          db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
              const data = doc.data();
              currentUserName.textContent = `مرحباً ${data.username}`;
            }
          });
          submitBtn.disabled = false;
        } else {
          currentUserName.textContent = 'يجب تسجيل الدخول لإضافة تعليق.';
          submitBtn.disabled = true;
        }
      });

      submitBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (!user) {
          alert('يجب تسجيل الدخول لإرسال تعليق.');
          return;
        }

        db.collection('users').doc(user.uid).get().then(doc => {
          const userName = doc.exists ? doc.data().username : 'مستخدم';
          const now = Date.now();
          const reviewId = db.collection('comments').doc().id;

          codePreview.textContent = `كود التقييم: ${reviewId.substring(0, 8)}`;
          codePreview.style.display = 'block';

          submitBtn.disabled = true;
          submitBtn.textContent = 'جارٍ الإرسال...';

          db.runTransaction(async (tx) => {
            const snap = await tx.get(REVIEWS_DOC);
            let body = {};
            if (snap.exists) {
              const raw = snap.data()||{};
              body = await decodeDocDataToBody(raw);
            }
            body.reviews = Array.isArray(body.reviews) ? body.reviews : [];
            const newItem = {
              id: reviewId,
              rating: Number(selectedRating)||0,
              comment: reviewText.value.trim(),
              userName: userName,
              createdAtMillis: now,
              createdAtISO: new Date(now).toISOString(),
              likes: 0,
              dislikes: 0,
              votes: {},
              replies: []
            };
            body.reviews.push(newItem);
            const enc = await encryptBody(body);
            tx.set(REVIEWS_DOC, { payload: enc }, { merge: true });
          })
          .then(() => {
            reviewText.value = '';
            selectedRating = 0;
            updateStars(0);
            checkFormValid();
            loadReviews();
            submitBtn.textContent = 'تم الإرسال';
            setTimeout(() => {
              submitBtn.textContent = 'إرسال التقييم';
              codePreview.style.display = 'none';
            }, 1500);
          })
          .catch(err => {
            alert('حدث خطأ أثناء الإرسال: ' + err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'إرسال التقييم';
            codePreview.style.display = 'none';
          });
        });
      });

      function updateStars(rating) {
        stars.forEach(star => {
          const val = Number(star.getAttribute('data-value'));
          if (val <= rating) {
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid', 'selected');
            star.setAttribute('aria-checked', 'true');
            star.setAttribute('tabindex', '0');
          } else {
            star.classList.add('fa-regular');
            star.classList.remove('fa-solid', 'selected');
            star.setAttribute('aria-checked', 'false');
            star.setAttribute('tabindex', '-1');
          }
        });
      }

      function checkFormValid() {
        submitBtn.disabled = !(selectedRating > 0 && reviewText.value.trim().length > 0);
      }

      function filterReviews(rating) {
        currentFilter = rating;
        renderReviews();
        ratingFilters.querySelectorAll('.rating-filter').forEach(btn => {
          if (Number(btn.getAttribute('data-rating')) === rating) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      function renderReviews() {
        reviewsList.innerHTML = '';

        if (!reviewsData.length) {
          reviewsList.innerHTML = '<p>لا توجد تعليقات بعد.</p>';
          return;
        }

        const filteredReviews = currentFilter === 0
          ? reviewsData
          : reviewsData.filter(review => Number(review.rating) === Number(currentFilter));

        if (!filteredReviews.length) {
          reviewsList.innerHTML = '<p>لا توجد تعليقات مع التقييم المحدد.</p>';
          return;
        }

        const uid = (auth && auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : null;
        filteredReviews.forEach(data => {
          const comment = data.comment || '';
          const d = data.createdAtMillis ? new Date(data.createdAtMillis) : (data.createdAtISO ? new Date(data.createdAtISO) : null);
          const rel = (d && !isNaN(d)) ? relativeTime(d.getTime()) : '';
          const userName = data.userName || 'مستخدم';
          const repliesCount = countReplies(data.replies);
          const reviewItem = document.createElement('article');
          reviewItem.className = 'review-item';
          const userVote = (uid && data.votes && typeof data.votes==='object') ? Number(data.votes[uid]||0) : 0;
          const likeActive = userVote === 1 ? ' active' : '';
          const dislikeActive = userVote === -1 ? ' active' : '';
          const firstLetter = escapeHTML(String(userName).trim().charAt(0) || 'م');
          const toggleRepliesHTML = repliesCount > 0 
            ? '<button class="vote-btn toggle-replies" type="button" aria-label="إظهار الردود" aria-expanded="false"><span class="vote-count replies-count">'+repliesCount+'</span><i class="fa-regular fa-comments"></i></button>'
            : '';
          reviewItem.innerHTML = [
            '<div class="review-main">',
            '  <div class="review-header">',
            '    <span class="header-avatar" aria-hidden="true">'+firstLetter+'</span>',
            '    <span class="username">@'+escapeHTML(userName)+'</span>',
            rel ? '    <span class="sep">•</span><span class="time">'+rel+'</span>' : '',
            data.rating ? '    <span class="mini-stars" aria-label="'+data.rating+' نجوم">'+getStarsHTML(data.rating)+'</span>' : '',
            '  </div>',
            '  <p class="review-text">'+escapeHTML(comment)+'</p>',
            '  <div class="review-actions" data-id="'+escapeHTML(String(data.id||''))+'">',
            '    <button class="vote-btn like'+likeActive+'" type="button" aria-label="أعجبني"><span class="vote-count like-count">'+Number(data.likes||0)+'</span><i class="fa-regular fa-thumbs-up"></i></button>',
            '    <button class="vote-btn dislike'+dislikeActive+'" type="button" aria-label="لم يعجبني"><span class="vote-count dislike-count">'+Number(data.dislikes||0)+'</span><i class="fa-regular fa-thumbs-down"></i></button>',
            toggleRepliesHTML,
            '    <button class="vote-btn reply" type="button" aria-label="رد"><i class="fa-regular fa-comment"></i><span class="reply-label">رد</span></button>',
            '    <div class="reply-box">',
            '      <textarea class="reply-input" placeholder="أكتب ردّك..."></textarea>',
            '      <div>',
            '        <button class="send-reply" type="button">إرسال الرد</button>',
            '        <button class="cancel-reply" type="button">إلغاء</button>',
            '      </div>',
            '    </div>',
            '  </div>',
            renderRepliesHTML(data.replies),
            '</div>'
          ].join('');
          reviewsList.appendChild(reviewItem);
        });
      }

      function updateRatingCounts() {
        const counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        reviewsData.forEach(review => {
          const r = Number(review.rating) || 0;
          if (counts[r] != null) counts[r]++;
        });
        for (let i = 1; i <= 5; i++) {
          if (countsElements[i]) countsElements[i].textContent = String(counts[i]);
        }
      }

      stars.forEach(star => {
        star.addEventListener('click', () => {
          selectedRating = Number(star.getAttribute('data-value'));
          updateStars(selectedRating);
          checkFormValid();
        });

        star.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectedRating = Number(star.getAttribute('data-value'));
            updateStars(selectedRating);
            checkFormValid();
          }
        });

        star.addEventListener('mouseover', () => {
          updateStars(Number(star.getAttribute('data-value')));
        });

        star.addEventListener('mouseout', () => {
          updateStars(selectedRating);
        });
      });

      reviewText.addEventListener('input', checkFormValid);

      ratingFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.rating-filter');
        if (!btn) return;
        const rating = Number(btn.getAttribute('data-rating'));
        filterReviews(Number.isFinite(rating) ? rating : 0);
      });

      async function loadReviews() {
        reviewsList.innerHTML = '<p>جاري تحميل التعليقات...</p>';
        try {
          const snap = await REVIEWS_DOC.get();
          reviewsData = [];
          if (!snap.exists) {
            reviewsList.innerHTML = '<p>لا توجد تعليقات بعد.</p>';
            return;
          }
          const raw = snap.data()||{};
          const body = await decodeDocDataToBody(raw);
          const arr = Array.isArray(body.reviews) ? body.reviews : [];
          reviewsData = arr.map(r => {
            const createdAtMillis = Number(r.createdAtMillis || Date.parse(r.createdAtISO) || 0);
            return {
              id: String(r.id||''),
              rating: Number(r.rating)||0,
              comment: String(r.comment||''),
              userName: String(r.userName||'مستخدم'),
              createdAtMillis,
              createdAtISO: r.createdAtISO || (createdAtMillis ? new Date(createdAtMillis).toISOString() : ''),
              likes: Number(r.likes||0),
              dislikes: Number(r.dislikes||0),
              replies: Array.isArray(r.replies) ? r.replies : [],
              votes: (r.votes && typeof r.votes==='object') ? r.votes : {}
            };
          });
          try { reviewsData.sort((a,b) => (b.createdAtMillis||0) - (a.createdAtMillis||0)); } catch(_){ }
          updateRatingCounts();
          renderReviews();
        } catch(err) {
          reviewsList.innerHTML = '<p>حدث خطأ في تحميل التعليقات.</p>';
          console.error(err);
        }
      }

      function getStarsHTML(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
          html += i <= rating ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        }
        return html;
      }

      function countReplies(arr){
        try{
          let c = 0;
          if (Array.isArray(arr)){
            arr.forEach(r => {
              c += 1;
              if (Array.isArray(r && r.replies)) c += countReplies(r.replies);
            });
          }
          return c;
        }catch(_){ return 0; }
      }

      function relativeTime(ts){
        try{
          const now = Date.now();
          let diff = Math.max(0, now - Number(ts||0));
          const s = Math.floor(diff/1000);
          if (s < 10) return 'الآن';
          if (s < 60) return `قبل ${s} ثانية`;
          const m = Math.floor(s/60);
          if (m < 60) return `قبل ${m} دقيقة`;
          const h = Math.floor(m/60);
          if (h < 24) return `قبل ${h} ساعة`;
          const d = Math.floor(h/24);
          if (d < 30) return `قبل ${d} يوم`;
          const mo = Math.floor(d/30);
          if (mo < 12) return `قبل ${mo} شهر`;
          const y = Math.floor(mo/12);
          return `قبل ${y} سنة`;
        }catch(_){ return ''; }
      }

      function renderRepliesHTML(replies, prefix){
        try{
          var arr = Array.isArray(replies) ? replies : [];
          if (!arr.length) return '<div class="replies"></div>';
          var uid = (auth && auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid : null;
          var html = '<div class="replies collapsed"><div class="replies-list">';
          arr.forEach(function(r, i){
            var t = escapeHTML(String(r.text||''));
            var n = escapeHTML(String(r.userName||'مستخدم'));
            var ms = Number(r.createdAtMillis || Date.parse(r.createdAtISO) || 0);
            var rel = ms ? relativeTime(ms) : '';
            var first = n.trim().charAt(0) || 'م';
            var rid = String(r.rid || r.id || (ms?('ms'+ms):''));
            var idxPath = (prefix==null||prefix==='') ? String(i) : (String(prefix)+'.'+String(i));
            var likes = Number(r.likes||0);
            var dislikes = Number(r.dislikes||0);
            var votes = (r && r.votes && typeof r.votes==='object') ? r.votes : {};
            var userVote = uid ? Number(votes[uid]||0) : 0;
            var likeActive = (userVote===1) ? ' active' : '';
            var dislikeActive = (userVote===-1) ? ' active' : '';
            var childCount = Array.isArray(r.replies) ? r.replies.length : 0;
            html += '<article class="reply-item" data-rid="'+escapeHTML(rid)+'">'+
                      '<div class="review-header">'+
                        '<span class="header-avatar small" aria-hidden="true">'+escapeHTML(first)+'</span>'+ 
                        '<span class="username">@'+n+'</span>'+ 
                        (rel ? '<span class="sep">•</span><span class="time">'+rel+'</span>' : '')+
                      '</div>'+ 
                      '<div class="reply-text">'+t+'</div>'+ 
                      '<div class="review-actions reply-actions" data-parent-rid="'+escapeHTML(rid)+'" data-parent-index="'+escapeHTML(idxPath)+'">'+
                        '<button class="vote-btn like'+likeActive+'" type="button" aria-label="أعجبني"><span class="vote-count like-count">'+likes+'</span><i class="fa-regular fa-thumbs-up"></i></button>'+ 
                        '<button class="vote-btn dislike'+dislikeActive+'" type="button" aria-label="لم يعجبني"><span class="vote-count dislike-count">'+dislikes+'</span><i class="fa-regular fa-thumbs-down"></i></button>'+ 
                        (childCount>0 ? '<button class="vote-btn toggle-replies" type="button" aria-label="إظهار الردود" aria-expanded="false"><span class="vote-count replies-count">'+childCount+'</span><i class="fa-regular fa-comments"></i></button>' : '')+
                      '</div>'+ 
                      (Array.isArray(r.replies) && r.replies.length ? renderRepliesHTML(r.replies, idxPath) : '')+
                    '</article>';
          });
          html +=   '</div></div>';
          return html;
        }catch(_){ return '<div class="replies"></div>'; }
      }

      function parsePayloadSafe(s){
        if (typeof s !== 'string') return null;
        try { return JSON.parse(s); } catch(e){}
        try {
          let fixed = s.replace(/;/g, ',');
          fixed = fixed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          return JSON.parse(fixed);
        } catch(e2){ return null; }
      }

      function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      async function handleVote(reviewId, vote){
        try{
          const user = auth.currentUser;
          if (!user) { alert('يجب تسجيل الدخول للتصويت.'); return; }
          const uid = user.uid;
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(REVIEWS_DOC);
            if (!snap.exists) return;
            const data = snap.data()||{};
            let body = await decodeDocDataToBody(data);
            body.reviews = Array.isArray(body.reviews) ? body.reviews : [];
            const review = body.reviews.find(r => String(r.id||'') === String(reviewId||''));
            if (!review) return;
            review.likes = Number(review.likes||0);
            review.dislikes = Number(review.dislikes||0);
            review.votes = (review.votes && typeof review.votes==='object') ? review.votes : {};

            const prev = Number(review.votes[uid]||0);
            if (prev === vote){
              if (vote === 1 && review.likes>0) review.likes -= 1;
              if (vote === -1 && review.dislikes>0) review.dislikes -= 1;
              delete review.votes[uid];
            } else {
              if (prev === 1 && review.likes>0) review.likes -= 1;
              if (prev === -1 && review.dislikes>0) review.dislikes -= 1;
              if (vote === 1) review.likes += 1; else if (vote === -1) review.dislikes += 1;
              review.votes[uid] = vote;
            }

            const enc = await encryptBody(body);
            tx.update(REVIEWS_DOC, { payload: enc });
          });

          loadReviews();
        }catch(e){ console.error(e); alert('تعذر تطبيق التصويت حالياً.'); }
      }

      async function handleReplyVote(reviewId, rid, vote){
        try{
          const user = auth.currentUser;
          if (!user) { alert('يجب تسجيل الدخول للتصويت.'); return; }
          const uid = user.uid;
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(REVIEWS_DOC);
            if (!snap.exists) return;
            const data = snap.data()||{};
            let body = await decodeDocDataToBody(data);
            body.reviews = Array.isArray(body.reviews) ? body.reviews : [];
            const review = body.reviews.find(r => String(r.id||'') === String(reviewId||''));
            if (!review) return;
            review.replies = Array.isArray(review.replies) ? review.replies : [];
            const target = findReplyByRid(review.replies, rid);
            if (!target) return;
            target.likes = Number(target.likes||0);
            target.dislikes = Number(target.dislikes||0);
            target.votes = (target.votes && typeof target.votes==='object') ? target.votes : {};

            const prev = Number(target.votes[uid]||0);
            if (prev === vote){
              if (vote === 1 && target.likes>0) target.likes -= 1;
              if (vote === -1 && target.dislikes>0) target.dislikes -= 1;
              delete target.votes[uid];
            } else {
              if (prev === 1 && target.likes>0) target.likes -= 1;
              if (prev === -1 && target.dislikes>0) target.dislikes -= 1;
              if (vote === 1) target.likes += 1; else if (vote === -1) target.dislikes += 1;
              target.votes[uid] = vote;
            }

            const enc = await encryptBody(body);
            tx.update(REVIEWS_DOC, { payload: enc });
          });

          loadReviews();
        }catch(e){ console.error(e); alert('تعذر تطبيق التصويت على الرد حالياً.'); }
      }

      function genRid(){ try{ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }catch(_){ return String(Date.now()); } }

      function findReplyByRid(arr, rid){
        try{
          if (!Array.isArray(arr)) return null;
          for (var i=0;i<arr.length;i++){
            var r = arr[i];
            if (r && String(r.rid||'') === String(rid||'')) return r;
            var c = findReplyByRid(r && r.replies, rid);
            if (c) return c;
          }
          return null;
        }catch(_){ return null; }
      }

      function getReplyByIndexPath(arr, path){
        try{
          var parts = String(path||'').split('.').filter(Boolean);
          var node = null;
          var list = arr;
          for (var i=0;i<parts.length;i++){
            var idx = parseInt(parts[i],10);
            if (!Array.isArray(list) || isNaN(idx) || idx<0 || idx>=list.length) return null;
            node = list[idx];
            list = node && node.replies;
          }
          return node;
        }catch(_){ return null; }
      }

      async function handleReply(reviewId, text, parentRid, parentIndexPath){
        try{
          const user = auth.currentUser;
          if (!user) { alert('يجب تسجيل الدخول للرد.'); return; }
          const uid = user.uid;
          const userDoc = await db.collection('users').doc(uid).get();
          const userName = userDoc.exists ? (userDoc.data().username || 'مستخدم') : 'مستخدم';
          const now = Date.now();

          await db.runTransaction(async (tx) => {
            const snap = await tx.get(REVIEWS_DOC);
            if (!snap.exists) return;
            const data = snap.data()||{};
            let body = await decodeDocDataToBody(data);
            body.reviews = Array.isArray(body.reviews) ? body.reviews : [];
            const review = body.reviews.find(r => String(r.id||'') === String(reviewId||''));
            if (!review) return;
            review.replies = Array.isArray(review.replies) ? review.replies : [];

            const newReply = {
              rid: genRid(),
              text: text,
              userName: userName,
              createdAtMillis: now,
              createdAtISO: new Date(now).toISOString(),
              likes: 0,
              dislikes: 0,
              votes: {},
              replies: []
            };

            if (parentRid){
              const target = parentRid ? findReplyByRid(review.replies, parentRid) : null;
              if (target){
                target.replies = Array.isArray(target.replies) ? target.replies : [];
                target.replies.push(newReply);
              } else {
                review.replies.push(newReply);
              }
            } else if (parentIndexPath){
              const targetByPath = getReplyByIndexPath(review.replies, parentIndexPath);
              if (targetByPath){
                targetByPath.replies = Array.isArray(targetByPath.replies) ? targetByPath.replies : [];
                targetByPath.replies.push(newReply);
              } else {
                review.replies.push(newReply);
              }
            } else {
              review.replies.push(newReply);
            }

            const enc = await encryptBody(body);
            tx.update(REVIEWS_DOC, { payload: enc });
          });

          loadReviews();
        }catch(e){ console.error(e); alert('تعذر إرسال الرد حالياً.'); }
      }

      function attachListEvents(){
        if (reviewsList.__reviewsBound) return;
        reviewsList.__reviewsBound = true;
        reviewsList.addEventListener('click', async (e) => {
          const likeBtn = e.target.closest('.vote-btn.like');
          const dislikeBtn = e.target.closest('.vote-btn.dislike');
          const toggleRepliesBtn = e.target.closest('.vote-btn.toggle-replies');
          const replyToggle = e.target.closest('.vote-btn.reply');
          const sendReplyBtn = e.target.closest('.send-reply');
          const cancelReplyBtn = e.target.closest('.cancel-reply');
          const replyActionContainer = e.target.closest('.reply-actions');

          if (replyToggle) {
            const container = e.target.closest('.review-actions');
            if (container) {
              const box = container.querySelector('.reply-box');
              if (box) box.classList.toggle('open');
            }
            return;
          }

          const rootItem = e.target.closest('.review-item');
          const rootActions = rootItem ? rootItem.querySelector('.review-actions[data-id]') : null;
          const id = rootActions ? rootActions.getAttribute('data-id') : null;
          if (!id) return;

          if (toggleRepliesBtn){
            const replyArticle = e.target.closest('.reply-item');
            if (replyArticle){
              let repliesEl = null;
              try {
                const children = Array.from(replyArticle.children || []);
                repliesEl = children.find(el => el.classList && el.classList.contains('replies')) || replyArticle.querySelector('.replies');
              } catch(_){ }
              if (repliesEl){
                const willOpen = repliesEl.classList.contains('collapsed');
                repliesEl.classList.toggle('collapsed');
                toggleRepliesBtn.setAttribute('aria-expanded', String(willOpen));
                toggleRepliesBtn.classList.toggle('active', willOpen);
              }
              return;
            }
            if (rootItem){
              const repliesEl = rootItem.querySelector('.review-main > .replies');
              if (repliesEl){
                const willOpen = repliesEl.classList.contains('collapsed');
                repliesEl.classList.toggle('collapsed');
                toggleRepliesBtn.setAttribute('aria-expanded', String(willOpen));
                toggleRepliesBtn.classList.toggle('active', willOpen);
              }
            }
            return;
          }

          if (likeBtn) {
            if (replyActionContainer){
              const rid = replyActionContainer.getAttribute('data-parent-rid') || '';
              if (rid) { await handleReplyVote(id, rid, 1); }
            } else {
              await handleVote(id, 1);
            }
            return;
          }
          if (dislikeBtn) {
            if (replyActionContainer){
              const rid = replyActionContainer.getAttribute('data-parent-rid') || '';
              if (rid) { await handleReplyVote(id, rid, -1); }
            } else {
              await handleVote(id, -1);
            }
            return;
          }
          if (sendReplyBtn) {
            const container = e.target.closest('.review-actions');
            if (!container) return;
            const ta = container.querySelector('.reply-input');
            const text = ta ? ta.value.trim() : '';
            if (!text) return;
            const parentRid = container.getAttribute('data-parent-rid') || '';
            const parentIndex = container.getAttribute('data-parent-index') || '';
            await handleReply(id, text, parentRid, parentIndex);
            return;
          }
          if (cancelReplyBtn) {
            const container = e.target.closest('.review-actions');
            if (!container) return;
            const box = container.querySelector('.reply-box');
            if (box) {
              const ta = box.querySelector('.reply-input');
              if (ta) ta.value = '';
              box.classList.remove('open');
            }
            return;
          }
        });
        reviewsList.addEventListener('keydown', async (e) => {
          const t = e.target;
          if (!t || !t.classList || (!t.classList.contains('reply-link') && !t.classList.contains('reply'))) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const container = t.closest('.review-actions');
            if (!container) return;
            const box = container.querySelector('.reply-box');
            if (box) box.classList.toggle('open');
          }
        });
      }

      function start(){
        attachListEvents();
        loadReviews();
        filterReviews(0);
      }

      window.__REVIEWS_REFRESH__ = function(){
        try { filterReviews(currentFilter); } catch(_){ }
      };
      window.__REVIEWS_RELOAD__ = function(){
        try { loadReviews(); } catch(_){ }
      };

      if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
    })(authInstance, dbInstance);
  };
})();

