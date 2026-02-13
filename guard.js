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
  try {
    if (typeof window.__FIREBASE_ENV_OK__ === 'boolean') {
      window.__SKIP_FIREBASE__ = !window.__FIREBASE_ENV_OK__;
    }
  } catch {}
})();
