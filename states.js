// Shared states loader/apply for pages with grid cards
(function(){
  function applyCardState(card, state){
    var finalState = (state == null) ? 'on' : state;
    var titleEl = card.querySelector ? card.querySelector('h2') : null;
    var img = card.querySelector ? card.querySelector('img') : null;
    try{ card.classList.remove('loading'); }catch(_){ }
    if (finalState === 'off'){
      if (img){ try{ img.setAttribute('loading','eager'); img.setAttribute('decoding','sync'); img.setAttribute('fetchpriority','high'); }catch(_){ } }
      try{ card.classList.add('maintenance'); card.classList.remove('pending-state'); }catch(_){ }
      try{ card.removeAttribute('href'); }catch(_){ }
      if (titleEl){ try{ titleEl.textContent = '🚧 مغلق للصيانة'; }catch(_){ } }
    } else {
      try{
        if (card.dataset && card.dataset.originalHref){ card.setAttribute('href', card.dataset.originalHref); }
        card.classList.remove('maintenance','pending-state');
        if (titleEl && card.dataset && card.dataset.originalTitle){ titleEl.textContent = card.dataset.originalTitle; }
      }catch(_){ }
    }
  }

  function prepCard(card){
    try{
      if (!card.dataset.originalHref){ var href = card.getAttribute('href'); if (href) card.dataset.originalHref = href; }
      var t = card.querySelector && card.querySelector('h2');
      if (t && !card.dataset.originalTitle){ card.dataset.originalTitle = t.textContent || ''; }
    }catch(_){ }
  }

  function getPageNameFromCard(card){
    try{
      var href = (card.dataset && card.dataset.originalHref) || card.getAttribute('href') || '';
      href = href.split('?')[0].split('#')[0];
      return href.replace(/\.html$/,'');
    }catch(_){ return ''; }
  }

  var STATES_TTL_MS = 5*60*1000;
  var STATES_CACHE_KEY = 'statesCache';
  function saveStatesCache(map){ try{ localStorage.setItem(STATES_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), map: map||{} })); }catch(_){ } }
  function readStatesCache(ignoreTTL){
    try{
      var raw = localStorage.getItem(STATES_CACHE_KEY);
      if(!raw) return null;
      var obj; try{ obj = JSON.parse(raw); }catch(_){ obj=null; }
      if (obj && typeof obj === 'object'){
        if(!ignoreTTL){ var now = Date.now(); if(obj.savedAt && (now-obj.savedAt)>STATES_TTL_MS){ /* expired */ } }
        if (obj.map && typeof obj.map === 'object') return obj.map;
        if (typeof obj.stateJson === 'string'){ try{ var m=JSON.parse(obj.stateJson); if(m && typeof m==='object') return m; }catch(_){ } }
        var vals = Object.values(obj); if (vals.length && vals.every(function(v){return v==='on'||v==='off';})) return obj;
      }
      try{ var m2 = JSON.parse(raw); if (m2 && typeof m2==='object') return m2; }catch(_){ }
      return null;
    }catch(_){ return null; }
  }

  function parseStatesDoc(data){
    var map = {};
    try{
      if (typeof data.stateJson === 'string') { map = JSON.parse(data.stateJson)||{}; }
      else if (data.map && typeof data.map==='object'){ map = data.map; }
      else { map = data||{}; }
    }catch(_){ map = {}; }
    return map;
  }

  async function loadStatesMap(){
    try{
      if (typeof firebase==='undefined' || !firebase.firestore) throw new Error('no-fb');
      var ref = firebase.firestore().collection('config').doc('states');
      var snap = await ref.get({ source:'server' }).catch(function(){ return ref.get(); });
      if (!snap || !snap.exists) throw new Error('not-found');
      var map = parseStatesDoc(snap.data()||{});
      saveStatesCache(map);
      return map;
    }catch(_){ return null; }
  }

  function applyStatesToPage(){
    try{
      var cards = Array.prototype.slice.call(document.querySelectorAll('a.card, .card[href]'));
      if (!cards.length) return;
      cards.forEach(prepCard);

      var useCacheOnly = !!window.__SKIP_FIREBASE__;
      if (useCacheOnly){
        var cached = readStatesCache(true);
        if (cached){
          cards.forEach(function(card){ var name=getPageNameFromCard(card); var s = (name && cached.hasOwnProperty(name)) ? cached[name] : 'on'; applyCardState(card,s); });
        }
        return;
      }

      loadStatesMap().then(function(map){
        if (!map) { var c=readStatesCache(false)||{}; map=c; }
        cards.forEach(function(card){ var name=getPageNameFromCard(card); var s=(name && map.hasOwnProperty(name))? map[name] : 'on'; applyCardState(card,s); });
      });
    }catch(_){ }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', applyStatesToPage);
  else try{ applyStatesToPage(); }catch(_){ }
})();

