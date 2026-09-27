// Offline support: the app shell is cached so it opens without signal.
// HTML is network-first (always the newest version when online), static files
// cache-first, and Supabase requests are never cached.
var CACHE='gym-shell-v1';
var SHELL=['./','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE&&k.indexOf('gym-')===0;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.hostname.indexOf('supabase.co')>=0||url.pathname.indexOf('/.netlify/')>=0)return;
  var isHtml=req.mode==='navigate'||(url.origin===location.origin&&(url.pathname.slice(-1)==='/'||url.pathname.slice(-5)==='.html'));
  if(isHtml){
    // Network first, bypassing the HTTP cache; offline → last cached copy
    e.respondWith(fetch(req,{cache:'no-store'}).then(function(res){
      if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put('./',copy);});}
      return res;
    }).catch(function(){return caches.match('./');}));
    return;
  }
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'||url.origin===location.origin){
    // Cache first for fonts, icons and manifest
    e.respondWith(caches.match(req).then(function(hit){
      return hit||fetch(req).then(function(res){
        if(res&&(res.ok||res.type==='opaque')){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
        return res;
      });
    }));
  }
});
