const C='nd-v3';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','style.css','game.js','images.js','manifest.json']).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!='GET'||r.destination=='audio'||r.destination=='video'||/\.(mp3|mp4|wav)(\?|$)/.test(r.url))return; // ses dosyaları tarayıcıya bırakılır
  e.respondWith(fetch(r).then(x=>{const cp=x.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{});return x}).catch(()=>caches.match(r)));
});
