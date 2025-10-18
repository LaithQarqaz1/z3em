// Fast reload guard/stub for Firebase to avoid repeated pings on quick reloads
(function(){
  try{
    var KEY='global:loadTimes';
    var now=Date.now();
    var arr=[]; try{arr=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){arr=[]}
    if(!Array.isArray(arr)) arr=[];
    arr=arr.filter(function(t){return typeof t==='number' && (now-t)<10000;});
    arr.push(now);
    try{localStorage.setItem(KEY, JSON.stringify(arr.slice(-10)));}catch(_){ }
    window.__SKIP_FIREBASE__=(arr.length>=3);

    if(window.__SKIP_FIREBASE__ && typeof firebase!=='undefined'){
      try{
        var noOp=function(){};
        var stubAuth={ onAuthStateChanged:function(cb){ try{cb(null);}catch(_){ } return noOp; }, currentUser:null, signInAnonymously:function(){ return Promise.reject(new Error('skip')); }, signOut:function(){ return Promise.resolve(); } };
        function stubDoc(){ return { get:function(){ return Promise.resolve({exists:false,data:function(){return {};},id:''}); }, set:function(){ return Promise.resolve(); }, update:function(){ return Promise.resolve(); }, onSnapshot:function(){ return noOp; } }; }
        function stubCol(){ return { doc:function(){ return stubDoc(); }, where:function(){ return stubCol(); }, orderBy:function(){ return stubCol(); }, limit:function(){ return stubCol(); }, get:function(){ return Promise.resolve({ empty:true, forEach:noOp, docs:[] }); }, onSnapshot:function(){ return noOp; } }; }
        var stubDb={ collection:function(){ return stubCol(); }, doc:function(){ return stubDoc(); } };
        try{ window.__ORIG_FIREBASE__ = { auth: firebase.auth, firestore: firebase.firestore }; }catch(_){ }
        firebase.auth = function(){ return stubAuth; };
        firebase.firestore = function(){ return stubDb; };
      }catch(_){ }
    }
  }catch(_){ window.__SKIP_FIREBASE__ = false; }
})();

