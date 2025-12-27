(function(){
  try{
    var LOADER_IMG = "loading.png";
    if (document.head && !document.querySelector("link[rel='preload'][as='image'][href='"+LOADER_IMG+"']")) {
      var l = document.createElement('link'); l.rel='preload'; l.as='image'; l.href=LOADER_IMG; document.head.appendChild(l);
    }
    var im = new Image();
    im.decoding = 'async';
    try { im.fetchPriority = 'high'; } catch(_){ }
    im.loading = 'eager';
    im.src = LOADER_IMG;
  }catch(_){ }
})();

(function(){
  try{
    var h = (location.hostname||'');
    var isLocal = h === 'localhost' || h === '127.0.0.1' || /^0\.0\.0\.0$/.test(h) || /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h);
    var isSecure = (typeof window.isSecureContext === 'boolean' ? window.isSecureContext : false) || location.protocol === 'https:' || isLocal;
    if ('serviceWorker' in navigator && isSecure) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(){});
    }
  }catch(_){ }
})();

document.addEventListener('DOMContentLoaded', function(){
  var pre = document.getElementById('preloader');
  if (!pre) return;

  try{
    var LOADER_IMG = "loading.png";
    var ring = pre.querySelector('.loader');
    if (ring && !ring.querySelector('img.loader-logo')){
      var img = document.createElement('img');
      img.className = 'loader-logo';
      img.alt = 'Loading...';
      img.decoding = 'async';
      try { img.fetchPriority = 'high'; } catch(_){ }
      img.loading = 'eager';
      img.src = LOADER_IMG;
      ring.appendChild(img);
    }
  }catch(_){ }

  var KEY_FLAG = 'nav:loader:expected';
  var KEY_TIME = 'nav:loader:showAt';

  function cleanup(){ try{ sessionStorage.removeItem(KEY_FLAG); sessionStorage.removeItem(KEY_TIME); }catch(_){ } }

  function hide(){
    try{
      pre.style.transition = 'opacity 0.4s ease';
      pre.style.opacity = '0';
      pre.classList.add('hidden');
      setTimeout(function(){ pre.style.display = 'none'; }, 400);
    }catch(_){ }
  }

  window.addEventListener('pageshow', function(e){ if (e && e.persisted) { hide(); cleanup(); } });

  var expected = false; var shownAt = 0;
  try { expected = sessionStorage.getItem(KEY_FLAG) === '1'; shownAt = Number(sessionStorage.getItem(KEY_TIME) || 0) || 0; } catch(_){ }

  if (expected) {
    var MIN_HOLD = 300;   
    var MAX_SAFETY = 1600;
    var now = Date.now();
    var remain = Math.max(0, MIN_HOLD - (now - shownAt));

    var done = false;
    function doHide(){ if (done) return; done = true; try{ requestAnimationFrame(function(){ requestAnimationFrame(function(){ hide(); cleanup(); }); }); } catch(_){ hide(); cleanup(); } }

    setTimeout(function(){
      if (document.visibilityState === 'visible') { doHide(); }
      else {
        var vis = function(){ if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', vis); doHide(); } };
        document.addEventListener('visibilitychange', vis);
        setTimeout(doHide, 600);
      }
    }, remain);

    setTimeout(doHide, Math.max(remain + 800, MAX_SAFETY));
  } else {
    var INITIAL_HOLD = 180; 
    var capped = false;
    function safeHide(){ if (capped) return; capped = true; try{ requestAnimationFrame(function(){ requestAnimationFrame(hide); }); } catch(_){ hide(); } }
    setTimeout(function(){
      if (document.visibilityState === 'visible') safeHide();
      else {
        var onv = function(){ if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', onv); safeHide(); } };
        document.addEventListener('visibilitychange', onv);
        setTimeout(safeHide, 600);
      }
    }, INITIAL_HOLD);
    setTimeout(safeHide, 1500);
  }

  window.addEventListener('popstate', function(){ hide(); cleanup(); });
});

