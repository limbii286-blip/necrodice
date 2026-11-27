const C='nd-v370-lbwr1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','style.css','retro.css','aaa.css','game.js','d20_canvas.js','images.js','avatars.js','sfxdata.js','manifest.json']).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!='GET'||r.destination=='audio'||r.destination=='video'||/\.(mp3|mp4|m4a|wav)(\?|$)/.test(r.url))return;
  const u=new URL(r.url);
  if(r.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(r).then(x=>{if(x&&x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{});}return x}).catch(()=>caches.match(r)));
    return;
  }
  const isImmutable=u.origin===self.location.origin&&(u.search.includes('v=')||/\.(png|jpg|jpeg|webp|avif|svg|woff2?)$/i.test(u.pathname))||u.hostname==='fonts.gstatic.com';
  if(isImmutable){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(x=>{if(x&&x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{});}return x})));
    return;
  }
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(x=>{if(x&&x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{});}return x});
    return hit||net;
  }));
});
