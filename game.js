// NECRODICE - motor + bot + arayüz (online mod için motor UI'dan ayrı tutuldu)
const $=s=>document.querySelector(s);
const setH=(sel,h)=>{const e=$(sel);if(e&&e._h!==h){e.innerHTML=h;e._h=h}}; // aynı içerik tekrar yazılmaz: animasyon/titreme olmaz
const TH=[4,8,14,18],EK={4:'e',8:'e',14:'e',18:'e'}; // D20 hayatta kalma eşikleri: 4, 8, 14, 18 (BG3 DC mantığı)
const BLOCK=new Set([1,2,3,4,8,9,10,11,19,20,21,22,23]); // blok sembollü jokerler
let LANG='tr'; // Oyun her zaman varsayılan olarak Türkçe açılır
const isEn=()=>LANG==='en';
const tr=(t,e)=>LANG==='en'?e:t;
const J_TR=['','Tekler ×2','Çiftler ÷2','+5','−5','Rakip kart çeker','Kart → 0','Kart → 12','Hedef 27','Hedef 24','Hedef 17','Hedef 15','Joker etkisiz','Kendi kartını imha','Rakip kartını imha','Açık kart takası','Kapalı kart takası','Kart çal','Kart hediye','En az kazanır','Kapalılar sayılmaz','Kapalılar ×2','Deste sayısı ±','Rakip kart çekemez','Rakip joker kullanamaz','Hırsız'];
const J_EN=['','Odds ×2','Evens ÷2','+5','−5','Opponent draws a card','Card → 0','Card → 12','Target 27','Target 24','Target 17','Target 15','Negate Joker','Destroy own card','Destroy opponent card','Swap open cards','Swap hidden cards','Steal card','Gift card','Lowest wins','Hidden cards = 0','Hidden cards ×2','Deck count ±','Block opponent draw','Block opponent jokers','Thief'];
let J=[...J_TR];
const NEED={6:['any'],7:['any'],12:['eff'],13:['my'],14:['opp'],15:['my','opp'],17:['opp'],18:['my'],22:['sign'],25:['steal_j']};
const KTXT_TR={any:'bir sayı kartı seç',my:'kendi açık kartını seç',opp:'rakibin açık kartını seç',eff:'etkisiz kılınacak jokeri seç',sign:'ekle mi çıkar mı?',steal_j:'yerden çalınacak jokeri seç'};
const KTXT_EN={any:'select a number card',my:'select your open card',opp:'select opponent\'s open card',eff:'select a joker to negate',sign:'add or subtract?',steal_j:'select a used joker to steal'};
let KTXT={...KTXT_TR};
const THIEF_SVG_TR='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 170"><rect width="120" height="170" rx="10" fill="#efe3c4" stroke="#8a6432" stroke-width="4"/><rect x="6" y="6" width="108" height="158" rx="6" fill="none" stroke="#b99352" stroke-width="1.4"/><g transform="translate(18,16) scale(3.5)" fill="none" stroke="#221712" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c2.5-3 6-3 9-1 3-2 6.5-2 9 1-1.5 4-4.5 5-9 3-4.5 2-7.5 1-9-3z" fill="#3a231c"/><circle cx="8" cy="11.5" r="1.25" fill="#fde68a" stroke="none"/><circle cx="16" cy="11.5" r="1.25" fill="#fde68a" stroke="none"/><path d="M9 17.5h6l-1 3h-4z" fill="#221712"/></g><line x1="16" y1="92" x2="104" y2="92" stroke="#8a6432" stroke-width="1.2" opacity="0.6"/><text x="60" y="106" text-anchor="middle" fill="#1c120d" font-family="Georgia,serif" font-size="8.2" font-weight="bold"><tspan x="60" dy="0">Kullanılmış bir joker</tspan><tspan x="60" dy="10.5">kartını çal. Eğer kartın</tspan><tspan x="60" dy="10.5">aktif etkisi varsa sona</tspan><tspan x="60" dy="10.5">erer. (Bu kart 2 joker</tspan><tspan x="60" dy="10.5">limitinden bağımsızdır)</tspan></text></svg>');
const THIEF_SVG_EN='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 170"><rect width="120" height="170" rx="10" fill="#efe3c4" stroke="#8a6432" stroke-width="4"/><rect x="6" y="6" width="108" height="158" rx="6" fill="none" stroke="#b99352" stroke-width="1.4"/><g transform="translate(18,16) scale(3.5)" fill="none" stroke="#221712" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c2.5-3 6-3 9-1 3-2 6.5-2 9 1-1.5 4-4.5 5-9 3-4.5 2-7.5 1-9-3z" fill="#3a231c"/><circle cx="8" cy="11.5" r="1.25" fill="#fde68a" stroke="none"/><circle cx="16" cy="11.5" r="1.25" fill="#fde68a" stroke="none"/><path d="M9 17.5h6l-1 3h-4z" fill="#221712"/></g><line x1="16" y1="92" x2="104" y2="92" stroke="#8a6432" stroke-width="1.2" opacity="0.6"/><text x="60" y="106" text-anchor="middle" fill="#1c120d" font-family="Georgia,serif" font-size="8.2" font-weight="bold"><tspan x="60" dy="0">Steal one used joker</tspan><tspan x="60" dy="10.5">card. If it has an active</tspan><tspan x="60" dy="10.5">effect, that effect ends.</tspan><tspan x="60" dy="10.5">(Ignores the 2-joker</tspan><tspan x="60" dy="10.5">per round limit.)</tspan></text></svg>');
if(typeof IMG!=='undefined'&&IMG.j){IMG.j[25]=THIEF_SVG_TR;if(IMG.j_tr)IMG.j_tr[25]=THIEF_SVG_TR;if(IMG.j_en)IMG.j_en[25]=THIEF_SVG_EN;}
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const range=n=>[...Array(n)].map((_,i)=>i+1);
const clone=o=>JSON.parse(JSON.stringify(o));
const d6=()=>1+Math.random()*6|0;
let G,P=null,lock=false;

/* ---------- SES: Web Audio (müzik ve efekt ayrı ses ayarlı) ---------- */
const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem('nd_'+k);localStorage.setItem('nd_'+k,v)}catch(e){}return null};
let AC,SG,MG,VM=+(LS('vm')??.45),VS=+(LS('vs')??.8),RM=LS('rm')=='1',CB=LS('cb')=='1',VB=LS('vb')!='0',CRT=LS('crt')!='0';
const ac=()=>{
  if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();SG=AC.createGain();MG=AC.createGain();SG.gain.value=VS*.45;MG.gain.value=VM*.22;SG.connect(AC.destination);MG.connect(AC.destination);loadSfx();playM()}
  if(AC.state!=='running'){try{AC.resume().catch(()=>{})}catch(e){}}return AC;
};
/* Müzik: menüde menu.m4a, oyunda game1/game2 sırayla. Web Audio'ya bağlı olduğu için ses ayarı iOS'ta da çalışır. */
(()=>{try{if(typeof HDAV=='undefined'){const h=document.createElement('script');h.src='hd.js?v=20261113_art';h.async=true;document.head.appendChild(h)}}catch(e){}})(); // HD görseller (gömülü): HDJ jokerler, HDAV karakterler
const FILE=location.protocol=='file:'; // çift tıkla açılınca Web Audio dosyaya erişemez: doğrudan <audio> kullan
const AUD={mus:'?',sfx:'?',hd:'?'},MISS=[];const miss=u=>{try{u=new URL(u,location.href).href}catch(e){}if(!MISS.includes(u))MISS.push(u)}; // ayarlarda gösterilen dosya durumu
const MU={menu:['music_gothic.wav'],game:['music_gothic.wav']};
let curM='menu',mel=null,gi=0;

/* Yerleşik müzik: audio/*.m4a bulunamazsa Web Audio ile üretilen karanlık ambiyans çalar (dosya gerekmez) */
let syn=null,NOF=false;
function synthM(m){
  const a=AC,out=a.createGain(),t0=a.currentTime,game=m=='game';
  out.gain.setValueAtTime(0,t0);out.gain.linearRampToValueAtTime(1,t0+1.5);out.connect(MG);
  const dl=a.createDelay(1),fb=a.createGain(),wet=a.createGain();
  dl.delayTime.value=0.235;fb.gain.value=0.28;wet.gain.value=0.32;dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(out);
  const hz=n=>440*Math.pow(2,(n-69)/12);
  // D Dorian 6/8 Orta Çağ Taverna Akorları (Dm - C - G/B - Am - Dm - F - C - Dm)
  const CH=[[50,57,62,65],[48,55,60,64],[47,55,59,62],[45,52,57,60],[50,57,62,65],[53,57,60,65],[48,55,60,64],[50,57,62,65]];
  const MEL=[62,62,65,69,69,67, 64,64,67,60,60,60, 59,62,67,65,64,62, 64,64,60,57,57,57, 62,64,65,69,69,72, 69,69,67,65,65,62, 64,65,67,64,64,60, 62,62,62,62,57,50];
  const dur=0.235;let step=0,next=a.currentTime+0.1;
  function lute(f,t,v,dMul=2.2){
    const o=a.createOscillator(),o2=a.createOscillator(),g=a.createGain(),fl=a.createBiquadFilter();
    o.type='triangle';o.frequency.value=f;
    o2.type='sawtooth';o2.frequency.value=f*2;
    fl.type='lowpass';fl.frequency.setValueAtTime(2200,t);fl.frequency.exponentialRampToValueAtTime(420,t+dur*dMul);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0008,t+dur*dMul);
    const g2=a.createGain();g2.gain.value=0.22;
    o.connect(fl);o2.connect(g2);g2.connect(fl);fl.connect(g);g.connect(out);g.connect(dl);
    o.start(t);o2.start(t);o.stop(t+dur*dMul+0.02);o2.stop(t+dur*dMul+0.02);
  }
  function flute(f,t,v,len){
    const o=a.createOscillator(),g=a.createGain(),fl=a.createBiquadFilter();
    o.type='sine';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=1600;
    g.gain.setValueAtTime(0.001,t);g.gain.linearRampToValueAtTime(v,t+0.035);g.gain.exponentialRampToValueAtTime(0.001,t+len);
    o.connect(fl);fl.connect(g);g.connect(out);g.connect(dl);o.start(t);o.stop(t+len+0.02);
  }
  function bodhran(t,acc){
    const o=a.createOscillator(),g=a.createGain();o.type='sine';
    o.frequency.setValueAtTime(acc?110:145,t);o.frequency.exponentialRampToValueAtTime(acc?58:88,t+0.18);
    g.gain.setValueAtTime(acc?0.26:0.14,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+0.24);
  }
  function sched(t){
    const bar=Math.floor(step/6)%8,b=step%6,ch=CH[bar];
    const arp=[ch[0],ch[2],ch[1],ch[3],ch[2],ch[1]][b];
    lute(hz(arp),t,b==0?0.09:(b==3?0.07:0.05));
    if(b==0)lute(hz(ch[0]-12),t,0.11,3.2);
    const mIdx=step%MEL.length,mNote=MEL[mIdx];
    if(step%2==0||b==2||b==5)flute(hz(mNote+12),t,0.055,dur*1.8);
    if(b==0)bodhran(t,true);
    else if(b==3||b==2)bodhran(t,false);
    step++;
  }
  const timer=setInterval(()=>{while(next<a.currentTime+0.4){sched(next);next+=dur}},100);
  return{m,stop(){clearInterval(timer);const t=a.currentTime;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+1.0);
    setTimeout(()=>{try{out.disconnect()}catch(e){}},1200)}};
}
function startSyn(){if(!AC||!curM||(syn&&syn.m==curM))return;if(syn)syn.stop();syn=synthM(curM)}
function playM(){
  if(syn&&syn.m!=curM){syn.stop();syn=null}
  if(!AC||!curM)return;
  // Menü ve Oyun aynı tek parça atmosferik piyano müziğini paylaşıyorsa kesinti yapma, devam ettir!
  if(mel){
    mel._m=curM;
    return;
  }
  if(NOF){startSyn();return}
  const list=MU[curM],fn=list[0];
  const cs=['tavern_bg.mp3','./tavern_bg.mp3',typeof GOTHIC_MUSIC_DATA!='undefined'?GOTHIC_MUSIC_DATA:'','audio/'+fn,fn,'/audio/'+fn].filter(Boolean);

  function spawnTrack(src,fadeIn){
    const el=new Audio(),g=AC.createGain(),t=AC.currentTime;
    el._m=curM;el._g=g;el.preload='auto';el.loop=false;el._xf=false;
    el._i=0;
    el.onerror=()=>{
      if(++el._i<cs.length){
        el.src=cs[el._i];
        el.play().catch(()=>{});
      }else{
        AUD.mus='bad';NOF=true;el.onerror=null;
        if(mel===el){mel=null}
        startSyn();
      }
    };
    el.onplaying=()=>{AUD.mus='ok'};
    el.ontimeupdate=()=>{
      if(el._xf||mel!==el||!el.duration||!isFinite(el.duration)||el.duration<6)return;
      if(el.duration-el.currentTime<=2.2){
        el._xf=true;
        const next=spawnTrack(el.src,true);
        mel=next;
        const now=AC.currentTime;
        if(!FILE&&el._g){
          el._g.gain.cancelScheduledValues(now);
          el._g.gain.setValueAtTime(el._g.gain.value,now);
          el._g.gain.linearRampToValueAtTime(0,now+2.0);
        }else if(FILE){
          const sv=el.volume;let k=0;
          const iv=setInterval(()=>{k++;el.volume=Math.max(0,sv*(1-k/20));if(k>=20)clearInterval(iv)},100);
        }
        setTimeout(()=>{try{el.pause();el.src=''}catch(e){}},2300);
      }
    };
    el.onended=()=>{
      if(!el._xf&&mel===el){
        const next=spawnTrack(el.src,false);
        mel=next;
      }
    };
    el.src=src;
    if(FILE){
      const tv=Math.min(1,VM*.22);
      if(fadeIn){
        el.volume=0;let k=0;
        const iv=setInterval(()=>{k++;el.volume=Math.min(tv,tv*(k/20));if(k>=20)clearInterval(iv)},100);
      }else el.volume=tv;
    }else{
      try{AC.createMediaElementSource(el).connect(g)}catch(e){console.warn('müzik bağlanamadı',e);return el}
      g.connect(MG);
      if(fadeIn){
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(1,t+2.0);
      }else{
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(1,t+1.2);
      }
    }
    el.play().catch(e=>console.warn('müzik çalınamadı',e));
    return el;
  }

  mel=spawnTrack(cs[0],false);
}
function setMusic(m){curM=m;playM()}
document.addEventListener('visibilitychange',()=>{if(syn&&AC){document.hidden?AC.suspend():AC.resume();return}if(!mel)return;if(document.hidden)mel.pause();else mel.play().catch(()=>{})});
/* Ses efektleri (wav): bir kez çözülüp bellekte tutulur */
const BUF={};
const getA=f=>{const k=f.replace('.wav',''),ok=r=>{if(!r.ok)throw 0;return r.arrayBuffer()};
  if(typeof SFXD!='undefined'&&SFXD[k])return fetch(SFXD[k]).then(ok).catch(()=>fetch('audio/'+f).then(ok));
  return fetch('audio/'+f).then(ok).catch(()=>fetch(f).then(ok))}; // gömülü SFXD varsa ağ beklemeden anında çözülür
function loadSfx(){
  const list=[
    ['draw','kart_cekme'],
    ['tap','kart_tiklama'],
    ['flip','kart_cevirme'],
    ['play','joker_oynama'],
    ['info','joker_bilgi'],
    ['dice_clack','zar_carpma'],
    ['click','buton_tik']
  ];
  if(FILE){
    list.forEach(([k,f])=>{BUF[k]=f});
    AUD.sfx='file';return;
  }
  list.forEach(([k,f])=>getA(f+'.wav').then(b=>AC.decodeAudioData(b)).then(d=>{BUF[k]=d;AUD.sfx=AUD.sfx=='bad'?'bad':'ok'}).catch(e=>{
    AUD.sfx='bad';miss('audio/'+f+'.wav');console.warn('efekt yüklenemedi: '+f+'.wav',e);
  }));
}
function sfx(k,v=1){
  if(!AC)return;
  if(typeof BUF[k]=='string'||!BUF[k]){
    const soundKey=BUF[k]||(k=='draw'?'kart_cekme':k=='play'?'joker_oynama':k=='flip'?'kart_cevirme':k=='tap'?'kart_tiklama':'buton_tik');
    const a=new Audio(typeof SFXD!='undefined'&&SFXD[soundKey]||'audio/'+soundKey+'.wav');
    a.volume=Math.min(1,VS*.45*v);a.play().catch(()=>{});return;
  }
  const s=AC.createBufferSource(),g=aC_g(v);s.buffer=BUF[k];s.connect(g);g.connect(SG);s.start();
}
function aC_g(v){const g=AC.createGain();g.gain.value=Math.min(1,v);return g}
/* Joker büyük görünümü: önce gömülü küçük görsel, yüksek çözünürlüklü img/j/ID.webp yüklenince değişir */
const HC={};
function hiLoad(id,cb){
  if(id===25){if(cb&&IMG.j&&IMG.j[25])cb(IMG.j[25]);return}
  const cacheKey=LANG+'_'+id;
  let i=HC[cacheKey];
  if(LANG!=='en'&&i&&i._x&&typeof HDJ!='undefined'&&HDJ[id]){i._x=0;i._e=1;i.src=HDJ[id]}
  if(!i){
    i=HC[cacheKey]=new Image();
    const pd=String(id).padStart(2,'0');
    const cs=LANG==='en'
      ?['img/j_en/'+id+'.png',IMG.j_en&&IMG.j_en[id]?IMG.j_en[id]:'img/j/'+id+'.png']
      :['img/j/'+id+'.png','img/j/'+id+'.webp','j'+id+'.webp',id+'.webp','img/j'+id+'.webp','img/j/'+pd+'.webp','/img/j/'+id+'.webp','img/j/'+id+'.jpg','img/j/'+id+'.avif','img/j/j'+id+'.webp','jokers/'+id+'.webp'];
    i._i=0;
    i.onload=()=>{AUD.hd='ok';try{i.decode&&i.decode().catch(()=>{})}catch(e){}};
    if(LANG!=='en'&&typeof HDJ!='undefined'&&HDJ[id])cs.unshift(HDJ[id]);
    if(LANG!=='en')cs.push('img/j/'+id+'.PNG',id+'.png','j/'+id+'.png','jokers/'+id+'.png');
    i.onerror=()=>{if(++i._i<cs.length)i.src=cs[i._i];else if(LANG!=='en'&&!i._e&&typeof HDJ!='undefined'&&HDJ[id]){i._e=1;i.src=HDJ[id]}else{i._x=1;if(AUD.hd!='ok')AUD.hd='fb';miss(cs[0])}};
    i.src=cs[0];
  }
  if(cb){if(i.complete&&i.naturalWidth)cb(i.src);else i.addEventListener('load',()=>cb(i.src),{once:true})}}
let hiPre=false;
function hiPreload(){
  if(hiPre)return;
  hiPre=true;
  const baseDelay=entering?1700:350;
  range(24).forEach((id,n)=>setTimeout(()=>hiLoad(id),baseDelay+n*90));
} // tüm HD jokerler geçiş sonrasında arka planda yumuşakça yüklenir
function hi(el,id){if(!el)return;if(id===25){if(IMG.j&&IMG.j[25])el.src=IMG.j[25];return}const fb=IMG.j[id];el.onerror=()=>{el.onerror=null;if(fb)el.src=fb}; // HD açılmazsa gömülü görsele dön
  hiLoad(id,u=>{if(el.isConnected)el.src=u})}
function tone(f,d,ty='sine',v=.12,w=0,sl=0){const a=ac(),t=a.currentTime+w,o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.linearRampToValueAtTime(Math.max(30,f+sl),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(SG);o.start(t);o.stop(t+d)}
function noise(d,v=.2,hp=2500,w=0){const a=ac(),t=a.currentTime+w,n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(SG);s.start(t)}
let lastDrawSnd=0;
const SND={
  draw(){const now=performance.now();if(now-lastDrawSnd<60)return;lastDrawSnd=now;sfx('draw',1)},
  tap(){sfx('tap',.9)},
  flip(){sfx('flip',1)},
  info(){sfx('info',.85)},
  play(){sfx('play',1)},
  click(){sfx('click',.8)},
  stone(){const p=0.92+Math.random()*0.16;tone(360*p,.028,'triangle',.18,0,-190);tone(780*p,.016,'sine',.09,0,-260);noise(.022,.22,1250)},
  tick(){tone(920,.045,'triangle',.09);noise(.03,.08,3200)},
  pass(){sfx('click',.9);tone(110,.18,'sine',.25)},
  turn(){sfx('tap',.7);tone(587,.12,'sine',.08);tone(880,.16,'sine',.06,.05)},
  dice(){sfx('dice_clack',1);for(let i=0;i<4;i++){setTimeout(()=>sfx('dice_clack',.6-i*.1),40+i*60)}},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,.4,'triangle',.12,i*.11))},
  lose(){[330,277,233,185].forEach((f,i)=>tone(f,.45,'sawtooth',.07,i*.14))},
  ok(){[440,554,659].forEach((f,i)=>tone(f,.35,'sine',.1,i*.09))},
  death(){tone(80,1.6,'sawtooth',.2,0,-45);tone(55,1.8,'sine',.25);noise(.9,.18,150,.1)},
  bust(){tone(90,.5,'sawtooth',.2,0,-40);noise(.25,.25,300)},
  heart(){for(let i=0;i<3;i++){tone(60,.18,'sine',.5,i*.55);tone(55,.16,'sine',.4,i*.55+.17)}},
  stamp(){tone(70,.25,'square',.2);noise(.12,.35,400)}
};
function snd(n){if(!n||VS<=0)return;try{ac();SND[n]()}catch(e){}}
// Tarayıcı kuralı: Sayfaya ilk kullanıcı etkileşimiyle birlikte AudioContext ve Müzik başlar
['pointerdown','click','keydown','touchstart'].forEach(ev=>{
  document.addEventListener(ev,()=>{try{ac()}catch(e){}},{once:false});
});
const vib=m=>{try{if(VB&&navigator.vibrate)navigator.vibrate(m)}catch(e){}};
const shake=()=>{try{if(RM)return;document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),450)}catch(e){}};
const flash=()=>{try{if(RM)return;const f=document.querySelector('#fl');f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}catch(e){}};
const PIP={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const die=n=>`<i class="die">${[...Array(9)].map((_,i)=>`<b${PIP[n].includes(i)?' class="p"':''}></b>`).join('')}</i>`;
const d20=()=>1+Math.random()*20|0;
function anim(){ // Baldur's Gate 3 tarzı kırmızı 3D D20 ölüm zarı & beraberlik zarı animasyonu
  const tb=document.querySelector('#mb .tie-box');
  if(tb){
    const d0a=+tb.dataset.d0a,d0b=+tb.dataset.d0b,d1a=+tb.dataset.d1a,d1b=+tb.dataset.d1b,win=+tb.dataset.win;
    const btn=tb.querySelector('#tie-rl'),sides=tb.querySelector('.tie-sides'),mo=document.querySelector('#mo');
    if(mo)mo.style.visibility='hidden';
    let rolled=false;
    const goRoll=(fromNet=false)=>{
      if(rolled)return;
      rolled=true;
      if(!fromNet){
        if(MODE==='guest'&&conn&&conn.open)conn.send({k:'tie_roll'});
        else if(MODE==='host'){
          if(conn&&conn.open)conn.send({k:'tie_roll'});
          spectators.forEach(s=>{try{if(s.open)s.send({k:'tie_roll'})}catch(e){}});
        }
      }
      if(btn){btn.disabled=true;btn.classList.add('used')}
      const d0El=tb.querySelector('#tie-d0'),d1El=tb.querySelector('#tie-d1');
      if(d0El)d0El.classList.add('roll');
      if(d1El)d1El.classList.add('roll');
      snd('dice');
      const iv=setInterval(()=>{
        if(!tb.isConnected){clearInterval(iv);return}
        if(d0El)d0El.innerHTML=die(d6())+die(d6());
        if(d1El)d1El.innerHTML=die(d6())+die(d6());
      },90);
      setTimeout(()=>{
        clearInterval(iv);
        if(!tb.isConnected)return;
        if(d0El){d0El.classList.remove('roll');d0El.classList.add('fin');d0El.innerHTML=die(d0a)+die(d0b)}
        if(d1El){d1El.classList.remove('roll');d1El.classList.add('fin');d1El.innerHTML=die(d1a)+die(d1b)}
        const s0=tb.querySelector('#tie-s0'),s1=tb.querySelector('#tie-s1');
        if(s0)s0.textContent=String(d0a+d0b);
        if(s1)s1.textContent=String(d1a+d1b);
        const c0=tb.querySelector('.tie-side.me'),c1=tb.querySelector('.tie-side.opp');
        if(c0)c0.classList.add(win===0?'win':'lose');
        if(c1)c1.classList.add(win===1?'win':'lose');
        tb.classList.add('fin');
        snd(win===0?'ok':'lose');
        if(mo)mo.style.visibility='';
      },780);
    };
    window._triggerTieRoll=()=>goRoll(true);
    if(MODE==='spectator'){
      if(btn){btn.disabled=true;btn.classList.add('used')}
      if(sides)sides.style.cursor='default';
    }else{
      if(btn)btn.onclick=e=>{e.stopPropagation();goRoll(false)};
      if(sides)sides.onclick=()=>goRoll(false);
    }
    return;
  }
  const d=document.querySelector('#mb .d20-box');if(!d)return;
  const finalTarget=+d.dataset.roll,rawTarget=+(d.dataset.raw||finalTarget),modVal=+(d.dataset.mod||0),dc=+d.dataset.dc,isMe=d.dataset.m=='1',res=d.dataset.s;
  const target=rawTarget;
  const cv=d.querySelector('#d20cv');
  if(!cv)return;

  // Hedef zar değerine göre gerçek D20 yüzünün iniş açısını al
  const initAng = (typeof getD20FaceAngles === 'function') ? getD20FaceAngles(20) : { rx: Math.atan(1 / Math.sqrt(2)), ry: Math.PI / 4, rz: 0 };
  const targetAng = (typeof getD20FaceAngles === 'function') ? getD20FaceAngles(target) : initAng;
  const finalAng = (typeof getD20FaceAngles === 'function') ? getD20FaceAngles(finalTarget) : targetAng;
  const targetRx = targetAng.rx;
  const targetRy = targetAng.ry;
  const targetRz = targetAng.rz;

  let rx = initAng.rx, ry = initAng.ry, rz = initAng.rz;
  let rolling = false, finished = false;
  let animId = null;

  const render = (num, isCrit, isFail, scale, textPop, ovNum) => {
    if(typeof draw3DD20=='function'){
      draw3DD20(cv, rx, ry, rz, num, rolling, isCrit, isFail, scale, textPop, ovNum);
    }
  };

  // Initial draw before roll
  render('?', false, false, 1.0);
  setTimeout(()=>{ if(d.isConnected) d.classList.add('ready'); }, 80);

  const runRoll = () => {
    if(!d.isConnected || rolling) return;
    rolling = true;
    d.classList.add('rolling');
    snd('dice');vib([100,50,100]);

    const startTime = performance.now();
    const duration = 2050; // Dengeli, doğal ve akıcı yavaşlama

    const totalRevX = 2;
    const totalRevY = 2;
    const totalRevZ = 1;

    const startRx = rx;
    const startRy = ry;
    const startRz = rz;

    const endRx = targetRx + totalRevX * Math.PI * 2;
    const endRy = targetRy + totalRevY * Math.PI * 2;
    const endRz = targetRz + totalRevZ * Math.PI * 2;

    const frame = now => {
      if(!d.isConnected) return;
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      if(progress < 1.0) {
        // Quartic ease-out: başlangıçta dinamik dönüş, sonda net ve kararlı duruş
        const t = 1.0 - Math.pow(1.0 - progress, 4.0);
        rx = startRx + (endRx - startRx) * t;
        ry = startRy + (endRy - startRy) * t;
        rz = startRz + (endRz - startRz) * t;

        // Doğal havalanma ve masaya iniş ölçeği
        const lift = 1.0 + Math.sin(progress * Math.PI) * 0.13 * (1.0 - progress * 0.35);
        render(target, false, false, lift);
        animId = requestAnimationFrame(frame);
      } else {
        // Landing & Slam
        rolling = false;
        d.classList.remove('rolling');

        // Tam hedef açısına pürüzsüz kilitlenmiş hali
        rx = targetRx;
        ry = targetRy;
        rz = targetRz;

        const finishFinal = (num, triggerEffects) => {
          finished = true;
          d.classList.add('finished');
          const isCrit = num >= 20;
          const isFail = num == 1 || res == 'death';
          const ov = (num !== rawTarget) ? num : null;
          // 60 FPS akıcı yay oturuşu (eski 4 karelik sert zıplama yerine)
          const popStart = performance.now(), popDur = 340;
          const smoothPop = tNow => {
            if(!d.isConnected) return;
            const p = Math.min(1, (tNow - popStart) / popDur);
            const damp = Math.exp(-5.2 * p) * Math.sin(p * Math.PI * 1.35);
            const sc = 1 + damp * 0.14;
            const tp = 1 + damp * 0.28;
            render(rawTarget, isCrit, isFail, sc, tp, ov);
            if(p < 1) requestAnimationFrame(smoothPop);
            else render(rawTarget, isCrit, isFail, 1.0, 1.0, ov);
          };
          requestAnimationFrame(smoothPop);
          if(triggerEffects){
            if(isCrit){snd('win');flash();vib([80,80,200])}
            else if(isFail){snd('death');if(res=='death'){try{document.body.classList.add('dead')}catch(e){}}vib([300,100,500])}
            else{snd(res);flash()}
            setTimeout(()=>{const x=document.querySelector('#mx');if(x)x.style.visibility=''},600);
            if(res==='death'||res==='win'){
              setTimeout(()=>{
                const mb=document.querySelector('#mb');
                const tpl=mb&&mb.querySelector('template.end-tpl');
                if(!mb||!tpl||!d.isConnected)return;
                const mo=mb.querySelector('#mo'),mx=mb.querySelector('#mx');
                mb.classList.add('end-mode');
                mb.innerHTML=tpl.innerHTML;
                const row=mb.querySelector('.end-acts');
                if(row){
                  if(LAST_MATCH_HIST&&LAST_MATCH_HIST.length){
                    const ab=document.createElement('button');
                    ab.id='btn-analyze';ab.className='btn alt';
                    ab.textContent=tr('Maçı Analiz Et','Analyze Match');
                    ab.onclick=()=>openMatchAnalysis(tpl.innerHTML,mo,mx);
                    row.appendChild(ab);
                  }
                  if(mo){mo.style.visibility='';row.appendChild(mo)}
                  if(mx){mx.style.visibility='';row.appendChild(mx)}
                }
                snd(res==='win'?'win':'lose');
              },1450);
            }
          }
        };

        const pills = [...d.querySelectorAll('.d20-mod-pill[data-val]')];
        if(pills.length > 0){
          // İlk zar oturuşu: 60 FPS yumuşak nefes/oturuş (keskin zıplama yok)
          const setStart = performance.now(), setDur = 280;
          const settleRaw = tNow => {
            if(!d.isConnected) return;
            const p = Math.min(1, (tNow - setStart) / setDur);
            const env = Math.sin(p * Math.PI) * (1 - p * 0.45);
            render(rawTarget, false, false, 1 + env * 0.06, 1 + env * 0.14);
            if(p < 1) requestAnimationFrame(settleRaw);
            else render(rawTarget, false, false, 1.0, 1.0);
          };
          requestAnimationFrame(settleRaw);

          let curNum = rawTarget;
          const stageEl = d.querySelector('.d20-stage');
          const glowEl = d.querySelector('.d20-glow');
          const applyNext = idx => {
            if(!d.isConnected) return;
            if(idx >= pills.length){
              finishFinal(finalTarget, true);
              return;
            }
            const pill = pills[idx];
            const delta = +pill.dataset.val;
            const isPos = delta > 0;
            const steps = Math.abs(delta);
            const stepSign = isPos ? 1 : -1;
            const nextNum = Math.max(1, Math.min(20, curNum + delta));
            pill.classList.add('igniting');
            try{
              if(isPos) tone(523, .22, 'triangle', .11, 0, 130);
              else tone(215, .24, 'triangle', .11, 0, -50);
            }catch(e){}
            if(stageEl){
              const pr = pill.getBoundingClientRect(), sr = stageEl.getBoundingClientRect();
              const sx = pr.left + pr.width / 2, sy = pr.top + pr.height / 2;
              const tx = sr.left + sr.width / 2, ty = sr.top + sr.height / 2;
              const fly = document.createElement('div');
              fly.className = 'bg3-mod-fly ' + (isPos ? 'pos' : 'neg');
              fly.textContent = isPos ? `+${delta}` : `−${steps}`;
              fly.style.left = sx + 'px';
              fly.style.top = sy + 'px';
              fly.style.setProperty('--dx', (tx - sx) + 'px');
              fly.style.setProperty('--dy', (ty - sy) + 'px');
              document.body.appendChild(fly);
              setTimeout(() => fly.remove(), 660);
            }
            setTimeout(() => {
              if(!d.isConnected) return;
              pill.classList.remove('igniting');
              pill.classList.add('applied');
              if(glowEl){
                glowEl.classList.remove('mod-pos','mod-neg');
                void glowEl.offsetWidth;
                glowEl.classList.add(isPos ? 'mod-pos' : 'mod-neg');
              }
              if(stageEl){
                const burst = document.createElement('div');
                burst.className = 'bg3-sunburst ' + (isPos ? 'pos' : 'neg');
                stageEl.appendChild(burst);
                setTimeout(() => burst.remove(), 640);
                const ring = document.createElement('div');
                ring.className = 'bg3-impact-ring ' + (isPos ? 'pos' : 'neg');
                stageEl.appendChild(ring);
                setTimeout(() => ring.remove(), 660);
              }
              // Tek kesintisiz 60 FPS rAF eğrisi ile +2 / -2 geçişi (arada donma ve çift sıçrama yok)
              const startVal = curNum;
              const totalDur = 460 + steps * 90;
              const mStart = performance.now();
              let lastSpoken = startVal;
              const modFrame = tNow => {
                if(!d.isConnected) return;
                const p = Math.min(1, (tNow - mStart) / totalDur);
                // Smooth ease-in-out sayı akışı
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                const valNow = Math.max(1, Math.min(20, Math.round(startVal + (nextNum - startVal) * eased)));
                if(valNow !== lastSpoken){
                  lastSpoken = valNow;
                  const sIdx = Math.abs(valNow - startVal);
                  try{
                    if(isPos) tone(587 + sIdx * 95, .20, 'triangle', .12);
                    else tone(205 - sIdx * 28, .22, 'triangle', .12, 0, -25);
                  }catch(e){}
                }
                // İpeksi tek nefeslik yay nabzı (çarpma anında hafif büyüyüp yumuşakça oturur)
                const pulse = Math.sin(p * Math.PI) * (1 - p * 0.25);
                const sc = 1 + pulse * 0.10;
                const tp = 1 + pulse * 0.26;
                render(rawTarget, isPos && valNow >= 20, !isPos && valNow <= 1, sc, tp, valNow);
                if(p < 1){
                  requestAnimationFrame(modFrame);
                }else{
                  render(rawTarget, isPos && nextNum >= 20, !isPos && nextNum <= 1, 1.0, 1.0, nextNum);
                  curNum = nextNum;
                  setTimeout(() => applyNext(idx + 1), 240);
                }
              };
              requestAnimationFrame(modFrame);
            }, 460);
          };
          setTimeout(() => applyNext(0), 420);
        } else {
          finishFinal(finalTarget, true);
        }
      }
    };
    animId = requestAnimationFrame(frame);
  };

  const rl=document.querySelector('#rl');
  if(rl&&isMe) {
    rl.onclick=()=>{
      rl.disabled=true;
      rl.classList.add('used');
      snd('heart');
      setTimeout(runRoll, 300);
    };
  } else {
    if(rl){rl.disabled=true;rl.classList.add('used')}
    snd('heart');
    setTimeout(runRoll, 1000);
  }
}

/* ---------- MOTOR ---------- */
const DUEL_CLOCK_INIT=33; // Her sırası gelen oyuncunun 33 saniyesi vardır
const ONLINE_CLOCK_INIT=33;
const initClockSec=()=>((MODE==='host'||MODE==='guest'||MODE==='spectator')?ONLINE_CLOCK_INIT:DUEL_CLOCK_INIT);
const GRACE_INIT=5;       // İlk düello ve geçişlerde jokerlere bakmak için 5 saniye hazırlık süresi
function newBO3(S){
  const cs=initClockSec();
  if(!S.stats)S.stats={rounds:[0,0,0],draws:[0,0],jokers:[0,0],d20Surv:[0,0],startAt:Date.now()};
  S.dj=[];S.jdeck=shuf(range(24));
  S.hand=[0,1].map(p=>avKey(S,p)==='s'?[...S.jdeck.splice(0,3),25]:S.jdeck.splice(0,4));
  S.pts=[0,0];S.rounds=0;S.res=[];
  S.hpUsed=[false,false];S.d20Bonus=[0,0];
  S.clocks=[cs,cs];
  S.clockMax=cs;
  S.graceLeft=GRACE_INIT;
}
function deal(S){
  S.deck=shuf(range(11).map(n=>({id:++S.u,n})));
  S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop()]}));
  S.eff=[];S.pj=[];S.jUsed=[0,0];S.jTurn=[0,0];S.noJ=[false,false];S.acted=false;S.turns=0;
  S.hpMod=[0,0];S.plagueMod=[0,0];S.hpTgMod=0;S.oppPeek=[];S.oppPeek1=[];S.botPeekVal=null;S.botScry=null;S.vampWinSide=-1;
  S.turn=S.pl[0].open[0].n<S.pl[1].open[0].n?0:1;
  S.wait=false;S.rev=false;S.winSide=null;S.timeOut=[false,false];S.hadTimeout=false;S.dead=[];S.pa=[0,0];S.st={pb:0,ob:0,px:0};
  const cs=initClockSec();
  S.clocks=[cs,cs];
  S.clockMax=cs;
  S.graceLeft=GRACE_INIT;
  S.log.push({p:-1,t:`— Tur ${S.rounds+1} —`},{p:S.turn,t:'başlıyor (küçük açık kart)'});
}
const act=(S,id)=>S.eff.some(e=>e.id==id&&!e.neg);
function total(S,p,wc=true){
  const pm=(S.plagueMod&&S.plagueMod[p])||0;
  const f=(c,cl)=>{const b=Math.max(0,(c.o??c.n)+pm);if(c.hpImmune)return b;let v=b;if(act(S,1)&&b%2)v=b*2;else if(act(S,2)&&b%2==0)v=b/2; // x2: tekler iki katı, ÷2: çiftler yarısı (ikisi birlikte olunca da her kart yalnızca bir kez etkilenir)
    if(cl){if(act(S,20))return 0;if(act(S,21))v*=2}return v};
  let t=0;S.pl[p].open.forEach(c=>t+=f(c,0));if(wc)S.pl[p].closed.forEach(c=>t+=f(c,1));
  S.eff.forEach(e=>{if(e.neg||e.o!=p)return;if(e.id==3)t+=5;if(e.id==4)t-=5;if(e.id==22)t+=e.s*S.deck.length});
  if(S.hpMod&&S.hpMod[p])t+=S.hpMod[p];
  return t;
}
const TGS=new Set([8,9,10,11,19]),tgE=S=>S.eff.filter(e=>!e.neg&&TGS.has(e.id)).pop(),lowW=S=>{const e=tgE(S);return !!e&&e.id==19}; // hedef değiştirenlerden SON oynanan geçerli
function tg(S){const e=tgE(S);const base=e&&e.id<19?{8:27,9:24,10:17,11:15}[e.id]:21;return base+(S.hpTgMod||0)}
function outc(S,p){ // p açısından: 1 kazan, 0 berabere, -1 kaybet
  const a=total(S,p),b=total(S,1-p),T=tg(S);
  if(lowW(S))return Math.sign(b-a);
  if(a>T&&b>T)return 0;if(a>T)return -1;if(b>T)return 1;return Math.sign(a-b);
}
const canDraw=(S,p)=>S.deck.length>0&&!S.eff.some(e=>e.id==23&&!e.neg&&e.o!=p);
function opts(S,p,k){
  if(k=='my')return S.pl[p].open.map(c=>c.id);
  if(k=='my_all')return [...S.pl[p].open,...S.pl[p].closed].map(c=>c.id);
  if(k=='opp')return S.pl[1-p].open.map(c=>c.id);
  if(k=='any')return S.pl.flatMap(x=>[...x.open,...x.closed.filter(c=>!c.hpImmune)]).map(c=>c.id);
  if(k=='eff')return S.eff.filter(e=>!e.neg&&BLOCK.has(e.id)).map(e=>e.uid);
  if(k=='steal_j')return (S.pj||[]).map(e=>e.uid);
  if(k=='hand_j')return S.hand[p].map((_,i)=>i);
  if(k=='sign')return [1,-1];
}
const playable=(S,p,id)=>(id==25||S.jUsed[p]<2)&&!S.noJ[p]&&S.hand[p].includes(id)&&(NEED[id]||[]).every(k=>opts(S,p,k).length)&&(id!=5||S.deck.length>0);
function play(S,p,id,pk){
  const q=1-p;
  const find=cid=>{for(const x of S.pl)for(const z of ['open','closed']){const i=x[z].findIndex(c=>c.id==cid);if(i>=0)return[x[z],i]}};
  const take=cid=>{const[a,i]=find(cid);return a.splice(i,1)[0]};
  S.hand[p].splice(S.hand[p].indexOf(id),1);S.used=(S.used||[]).concat(id);(S.dj=S.dj||[]).push(id);
  if(id==25){
    const pjIdx=(S.pj||[]).findIndex(e=>e.uid==pk[0]);
    if(pjIdx>=0){
      const stolen=S.pj.splice(pjIdx,1)[0];
      S.eff=(S.eff||[]).filter(e=>e.uid!=pk[0]);
      S.hand[p].push(stolen.id);
    }
    return;
  }
  S.jUsed[p]++;S.jTurn=S.jTurn||[0,0];S.jTurn[p]++;
  if(S.stats&&S.stats.jokers)S.stats.jokers[p]++;
  const uid=++S.u;(S.pj=S.pj||[]).push({id,o:p,uid});
  if(BLOCK.has(id))S.eff.push({id,o:p,uid,neg:false,s:pk[0]});
  if(id==5){if(S.botScry&&S.botScry.length)S.botScry.shift();S.pl[q].open.push(S.deck.pop())}
  if(id==6||id==7){const[a,i]=find(pk[0]);a[i].o=id==6?0:12}
  if(id==12)S.eff.find(e=>e.uid==pk[0]).neg=true;
  if(id==13||id==14)(S.dead=S.dead||[]).push(take(pk[0]));
  if(id==15){const[a,i]=find(pk[0]),[b,k]=find(pk[1]);[a[i],b[k]]=[b[k],a[i]]}
  if(id==16){const i0=S.pl[0].closed.findIndex(c=>!c.hpImmune),i1=S.pl[1].closed.findIndex(c=>!c.hpImmune);if(i0>=0&&i1>=0){const tmp=S.pl[0].closed[i0];S.pl[0].closed[i0]=S.pl[1].closed[i1];S.pl[1].closed[i1]=tmp;}}
  if(id==17)S.pl[p].open.push(take(pk[0]));
  if(id==18)S.pl[q].open.push(take(pk[0]));
  if(id==24)S.noJ[q]=true;
}

/* ---------- BOT ---------- */
// Zorluk ayarları: zor seviye bot-vs-bot oyunlarıyla (self-play) ayarlandı
const PR={
  easy:{rand:.25,noise:.35,jc:.45,jp:.4,dm:.05,depth:0},
  med:{rand:.01,noise:.06,jc:.2,jp:1,dm:.03,depth:0},
  hard:{rand:0,noise:0,jc:.15,jl:.06,jp:1,dm:.015,depth:2,beta:.55,gap:6,mc:1,K:1600,ms:3200,top:7,rjp:.85,bo3:1,pf:1,hero:1},
  imp:{rand:0,noise:0,jc:.08,jl:.03,jp:1,dm:.01,depth:2,beta:.82,gap:7,mc:1,K:35000,ms:7500,top:12,rjp:.95,bo3:1,pf:1,learn:1,hero:1,deepRoll:1} // imkansız: derin tarama, tam kombo ve kahraman ustalığı
};
let DIFF='med';
const unk=(S,p)=>{const seen=new Set([...S.pl[p].open,...S.pl[p].closed,...S.pl[1-p].open,...(S.dead||[])].map(c=>c.n));if(p===1&&S.botPeekVal!=null)seen.add(S.botPeekVal);return range(11).filter(n=>!seen.has(n))};
let CUR=PR.med;
function outcHero(S,p){
  let r=outc(S,p);
  if(r===0){
    const v0=avKey(S,0)==='v'&&!(S.vampUsed&&S.vampUsed[0]);
    const v1=avKey(S,1)==='v'&&!(S.vampUsed&&S.vampUsed[1]);
    if(v0&&!v1)r=p===0?1:-1;
    else if(v1&&!v0)r=p===1?1:-1;
  }
  if(r!==0){
    const loser=r>0?1-p:p;
    if(avKey(S,loser)==='e')r*=0.91; // Buz Devi %18 hasar savuşturup berabereye çevirebilir
  }
  return r;
}
function evalS(S,p){ // rakibin kapalı kartı bilinmiyor: olasılıklar üzerinden beklenen sonuç
  const q=1-p,cl=S.pl[q].closed[0],useH=!!(CUR&&CUR.hero),ev=()=>useH?outcHero(S,p):outc(S,p);
  if(cl.o!=null)return ev();
  if(useH&&p===1&&S.botPeekVal!=null){cl.n=S.botPeekVal;return ev()}
  const pool=unk(S,p);if(!pool.length)return ev();
  const use=CUR.beta&&S.pa&&S.pa[q]>0; // rakip pas geçtiyse toplamının hedefe yakın olma ihtimali artar
  let s=0,w=0;
  pool.forEach(n=>{cl.n=n;let wt=1;if(use){const t=total(S,q),Tg=tg(S);if(t<=Tg&&t>=Tg-CUR.gap)wt=1+CUR.beta}s+=wt*ev();w+=wt});
  return s/w;
}
function look(S,p,d){ // d adım ileriye bakarak: pas mı, çekip tekrar karar vermek mi daha iyi
  const b=evalS(S,p);if(d<=0||!canDraw(S,p))return b;
  const pool=unk(S,p);if(!pool.length)return b;
  let v=0;pool.forEach(x=>{const T=clone(S);T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d-1)});
  return Math.max(b,v/pool.length);
}
const combos=l=>l.reduce((r,o)=>r.flatMap(x=>o.map(y=>[...x,y])),[[]]);
function decide(S,p,prm){ // en iyi hamleyi seç; null = pas
  CUR=prm;const d=prm.depth||0,nz=()=>prm.noise?(Math.random()+Math.random()-1)*prm.noise:0;
  if(Math.random()<prm.rand)return canDraw(S,p)&&Math.random()<.5?{t:'d'}:null;
  const low=lowW(S),Tg=tg(S),myT=total(S,p,true);
  const pool=unk(S,p);let best=null,bs=evalS(clone(S),p)+prm.dm;
  if(!low&&myT<Tg&&canDraw(S,p)&&pool.length){
    let v=0;pool.forEach(x=>{const T=clone(S);T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d)});
    v=v/pool.length+nz();if(v>bs){bs=v;best={t:'d'}}
  }
  if(!S.noJ[p])new Set(S.hand[p]).forEach(id=>{
    if(id==16||!playable(S,p,id)||Math.random()>prm.jp)return;
    combos((NEED[id]||[]).map(k=>opts(S,p,k))).forEach(pk=>{
      if(id==15&&pk[0]==pk[1])return;
      if(id==12){const ef=S.eff.find(e=>e.uid==pk[0]);if(ef&&ef.o===p)return}
      const T=clone(S);T.deck=shuf(pool.map(n=>({id:++T.u,n}))).slice(0,S.deck.length);play(T,p,id,pk);
      const v=look(T,p,d)-(S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc)+nz();if(v>bs){bs=v;best={t:'j',id,pk}}
    });
  });
  return best;
}
/* ---------- ZOR BOT: belirsizlik altında Monte-Carlo (determinizasyon) ----------
   Bilinmeyenleri (rakibin kapalı kartı, deste sırası, rakibin jokerleri) rastgele doldurup
   her aday hamleyi (pas / çek / joker) turun sonuna kadar oynatır; ortalama sonucu en iyi olanı seçer.
   Rakibin cevabını da hesaba kattığı için "pas deyip sonra yakalanma" hatalarını yapmaz. */
const ROLL={rand:0,noise:0,jc:.25,jl:.15,jp:1,dm:.02,depth:0,beta:0,gap:6,hero:1};
function listC(S,p,prm){
  CUR=prm;const d=prm.depth||0,out=[],pool=unk(S,p),low=lowW(S),Tg=tg(S),myT=total(S,p,true);
  out.push({a:null,v:evalS(clone(S),p)+prm.dm});
  if(!low&&myT<Tg&&canDraw(S,p)&&pool.length){let v=0;pool.forEach(x=>{const T=clone(S);T.log=[];T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d)});out.push({a:{t:'d'},v:v/pool.length})}
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5));
  const cost=matchPoint&&prm.deepRoll?0.015:(S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc);
  const HI_THIEF=new Set([6,7,14,16,17,18,23,24]);
  const oppOpen=total(S,1-p,false);
  if(!S.noJ[p])new Set(S.hand[p]).forEach(id=>{
    if(!playable(S,p,id))return;
    if(id==16){const T=clone(S);T.log=[];T.deck=shuf(pool.map(n=>({id:++T.u,n}))).slice(0,S.deck.length);play(T,p,id,[]);out.push({a:{t:'j',id,pk:[]},v:look(T,p,d)-cost});return}
    combos((NEED[id]||[]).map(k=>opts(S,p,k))).forEach(pk=>{
      if(id==15&&pk[0]==pk[1])return;
      if(id==12){const ef=S.eff.find(e=>e.uid==pk[0]);if(ef&&ef.o===p)return}
      if((id==5||id==14)&&!low&&oppOpen>Tg&&!act(S,20))return; // rakip zaten açıktan patlamışsa kart verip/imha edip kurtarma
      const T=clone(S);T.log=[];T.deck=shuf(pool.map(n=>({id:++T.u,n}))).slice(0,S.deck.length);
      let bonus=0;
      if(id===25&&prm.hero){const st=(S.pj||[]).find(e=>e.uid===pk[0]);if(st&&HI_THIEF.has(st.id))bonus=0.12}
      play(T,p,id,pk);
      out.push({a:{t:'j',id,pk},v:look(T,p,d)+bonus-(id===25?0:cost)})});
  });
  return out;
}
function oppCardWeights(S,p,prm,pool){
  const q=1-p,Tg=tg(S),low=lowW(S),base=total(S,q,false);
  const stood=!!(S.pa&&S.pa[q]>0);
  const Lr=!!(prm&&prm.learn&&PROF.n>=6);
  const beta=(prm&&prm.beta)||0,gap=(prm&&prm.gap)||6;
  return pool.map(n=>{
    const t=base+n;
    let wt=1;
    if(stood&&beta){
      if(low){
        wt=n<=4?(1+beta*1.15):(n>=8?0.45:0.85);
      }else if(Lr){
        wt=PROF.p[Math.max(-6,Math.min(12,Tg-t))+6]+0.55;
      }else{
        if(t>Tg)wt=0.35; // pas geçen rakip genelde patlamamış olur
        else if(t>=Tg-3)wt=1+beta*1.35;
        else if(t>=Tg-gap)wt=1+beta*0.75;
        else wt=0.8;
      }
    }
    return Math.max(0.15,wt);
  });
}
function world(S,p,prm,stratIdx){ // bilinmeyenleri rastgele/katmanlı doldurulmuş bir "olası dünya"
  const T=clone(S),q=1-p;T.log=[];T.jdeck=[];
  let pool=shuf(unk(S,p));const cl=T.pl[q].closed[0];
  if(!pool.length)return T;
  if(prm&&prm.hero&&p===1&&S.botPeekVal!=null){
    cl.n=S.botPeekVal;
    pool=pool.filter(n=>n!==S.botPeekVal);
  }else if(cl&&cl.o==null){
    const w=oppCardWeights(S,p,prm,pool);
    const sm=w.reduce((a,b)=>a+b,0);
    let r=(stratIdx!=null?((stratIdx%16)+Math.random())/16:Math.random())*sm,i=0;
    while(i<w.length-1&&(r-=w[i])>0)i++;
    cl.n=pool[i];
    pool.splice(i,1);
  }
  if(prm&&prm.hero&&p===1&&S.botScry&&S.botScry.length){
    const scry=S.botScry.filter(n=>pool.includes(n));
    const rest=pool.filter(n=>!scry.includes(n));
    T.deck=rest.slice(0,Math.max(0,S.deck.length-scry.length)).concat([...scry].reverse()).map(n=>({id:++T.u,n}));
  }else{
    T.deck=pool.slice(0,S.deck.length).map(n=>({id:++T.u,n}));
  }
  const known=new Set([...S.hand[p],...(S.dj||[])]);
  let oppHand=shuf(range(24).filter(x=>!known.has(x))).slice(0,S.hand[q].length);
  if(prm&&prm.hero&&avKey(S,q)==='s'&&S.hand[q].length&&!(S.dj&&S.dj.includes(25))&&!oppHand.includes(25)){
    oppHand[oppHand.length-1]=25;
  }
  T.hand[q]=oppHand;
  return T;
}
function deathProb(T,who){
  const th=TH[Math.min(T.bo||0,3)];
  const mod=(avKey(T,who)==='m'?2:0)+(avKey(T,1-who)==='n'?-2:0);
  const need=th-mod; // rawRoll >= need ise kurtulur
  const deadFaces=Math.max(0,Math.min(20,need-1));
  return deadFaces/20;
}
function bo3v(T,p,r){ // tur sonucu r (p açısından) -> düelloyu kazanma değeri [-1.25,1.25]; D20 ölüm olasılığı, kahraman güçleri ve joker eşitlik kuralı dahil
  const q=1-p,np=T.pts[p]+(r>0?1:r==0?.5:0),nq=T.pts[q]+(r<0?1:r==0?.5:0);
  if(np>=2||nq>=2||T.rounds+1>=3){
    let w;if(np>nq)w=1;else if(np<nq)w=0;else{const a=T.hand[p].length,b=T.hand[q].length;w=a>b?1:a<b?0:.5}
    let val=2*w-1;
    if(val<0){
      const dp=deathProb(T,p);
      val*=0.78+0.62*dp; // yüksek D20 eşiğinde (13/16) düello kaybetmek ölümcül
      if(p===1&&avKey(T,1)==='u'&&!T.rigDone)val*=0.68; // Bilinmeyen ilk ölümden döner
    }else if(val>0){
      const dpOpp=deathProb(T,q);
      val*=0.85+0.42*dpOpp; // rakibin ölüm riski yüksekken düelloyu bitirmek çok değerli
    }
    return Math.max(-1.25,Math.min(1.25,val));
  }
  let cBonus=0;
  if(avKey(T,p)==='c'&&T.cWins){const cw=(T.cWins[p]||0)+(r>0?1:0);if(cw>=4)cBonus+=0.07}
  if(avKey(T,q)==='c'&&T.cWins){const cw=(T.cWins[q]||0)+(r<0?1:0);if(cw>=4)cBonus-=0.07}
  return Math.max(-.92,Math.min(.92,.56*(np-nq)+.035*(T.hand[p].length-T.hand[q].length)+cBonus));
}
function rollout(T,p,a,pol){
  let actor=p,n=0;
  const doPass=()=>{if(T.turns>0&&!T.acted)return true;(T.pa=T.pa||[0,0])[actor]++;T.turns++;T.acted=false;T.turn=1-T.turn;(T.jTurn=T.jTurn||[0,0])[T.turn]=0;actor=T.turn;n=0;return false};
  const doAct=(x,who)=>{if(x.t=='d')T.pl[who].open.push(T.deck.pop());else play(T,who,x.id,x.pk);T.acted=true};
  const fin=()=>pol.bo3?bo3v(T,p,pol.hero?outcHero(T,p):outc(T,p)):(pol.hero?outcHero(T,p):outc(T,p));
  if(!a){if(doPass())return fin()}else{doAct(a,p);n=1}
  for(let g=0;g<80;g++){
    const x=n++<8?(pol.hm&&actor!=p?hmove(T,actor,pol):decide(T,actor,pol)):null;
    if(!x){if(doPass())break;continue}
    doAct(x,actor);
  }
  return fin();
}
const jCnt=(T,who)=>(T.pj||[]).filter(x=>x.o==who).length;
function decideH(S,p,prm){
  const all=listC(S,p,prm).sort((x,y)=>y.v-x.v);
  const pass=all.find(c=>!c.a),draw=all.find(c=>c.a&&c.a.t=='d');
  const top=all.slice(0,prm.top||4);[pass,draw].forEach(c=>{if(c&&!top.includes(c))top.push(c)});
  const forced=all.filter(c=>c.a&&c.a.id==16&&!top.includes(c));forced.forEach(c=>top.push(c));
  if(top.length==1)return top[0].a;
  const cost=S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc,sum=top.map(()=>0),RP=prm.rjp!=null?{...ROLL,jp:prm.rjp}:ROLL;
  let k=0;const t0=(typeof performance!='undefined'?performance:Date).now(),K=prm.K||40,bud=prm.ms||0;
  for(;k<K;k++){
    if(bud&&k>=8&&(typeof performance!='undefined'?performance:Date).now()-t0>bud)break;
    const W=world(S,p,prm);
    top.forEach((c,i)=>{const T=clone(W);const j0=[jCnt(T,0),jCnt(T,1)];const r=rollout(T,p,c.a,RP);sum[i]+=r-cost*((jCnt(T,p)-j0[p])-.5*(jCnt(T,1-p)-j0[1-p]))});
  }
  const sc=sum.map((s,i)=>s/Math.max(1,k)+(prm.w||0)*top[i].v);
  let bi=0;sc.forEach((s,i)=>{if(s>sc[bi]+1e-9)bi=i});
  return top[bi].a;
}
function decideHA(S,p,prm,done,budCap){ // zaman dilimli Monte-Carlo: ekranı dondurmadan çok daha fazla örnek
  const now=()=>(typeof performance!='undefined'?performance:Date).now();
  const low=lowW(S),Tg=tg(S),myT=total(S,p,true);
  // Rakip pas geçtiyse ve rakip açıktan hedefi aşıp patladıysa (ve biz patlamadıysak) hiç kaynak harcamadan pas geç
  if(S.pa&&S.pa[1-p]>0&&!low&&myT<=Tg&&total(S,1-p,false)>Tg&&!act(S,20))return done(null);
  let all=listC(S,p,prm).sort((x,y)=>y.v-x.v);
  if(low||myT>=Tg)all=all.filter(c=>!(c.a&&c.a.t=='d')); // hedefte/üstündeyken veya "En az kazanır" etkisinde kart çekmek yalnızca batırır
  const pass=all.find(c=>!c.a),draw=all.find(c=>c.a&&c.a.t=='d');
  const top=all.slice(0,prm.top||4);[pass,draw].forEach(c=>{if(c&&!top.includes(c))top.push(c)});
  const TACTICAL=new Set([12,16,23,24,25]);
  TACTICAL.forEach(tid=>{const bestT=all.find(c=>c.a&&c.a.id===tid&&!top.includes(c));if(bestT)top.push(bestT)});
  if(top.length==1)return done(top[0].a);
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5));
  const rawCost=matchPoint&&prm.deepRoll?0.015:(S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc);
  const cost=prm.bo3?(matchPoint?rawCost*0.2:rawCost*0.45):rawCost;
  const sum=top.map(()=>0),cnt=top.map(()=>0),alive=top.map(()=>true);
  const RP={...ROLL,...(prm.rjp!=null?{jp:prm.rjp}:{}),...(prm.deepRoll?{depth:1,jc:0.06,jl:0.03,jp:1,beta:0.55}:{}),bo3:prm.bo3,hm:prm.learn&&LRN.ht>=15};
  const clkMs=S.clocks&&S.clocks[p]!=null?Math.max(1000,Math.round(S.clocks[p]*220)):99999;
  const K=prm.K||40,bud=Math.min(prm.ms||0,clkMs,budCap||99999),t0=now();let k=0;
  if(prm.pf&&pass){top.splice(top.indexOf(pass),1);top.unshift(pass)} // eşitlikte paslamak öncelikli
  const prune=()=>{
    if(!prm.deepRoll||top.length<=3)return;
    const means=top.map((_,i)=>alive[i]?(sum[i]/Math.max(1,cnt[i])):-99);
    const bestM=Math.max(...means);
    if(k===36){
      let kept=0;
      for(let i=0;i<top.length;i++)if(alive[i]&&means[i]>=bestM-0.34)kept++;
      if(kept>=2)for(let i=0;i<top.length;i++)if(alive[i]&&means[i]<bestM-0.34)alive[i]=false;
    }else if(k===96){
      const ord=top.map((_,i)=>i).filter(i=>alive[i]).sort((a,b)=>means[b]-means[a]);
      if(ord.length>4)ord.slice(4).forEach(i=>{alive[i]=false});
    }
  };
  const fin=()=>{
    const sc=top.map((c,i)=>alive[i]?(sum[i]/Math.max(1,cnt[i])+(prm.w||0)*c.v):-99);
    let bi=0;sc.forEach((v,i)=>{if(v>sc[bi]+1e-9)bi=i});
    done(top[bi].a);
  };
  const tick=()=>{const t1=now();
    while(k<K&&now()-t1<22){
      const W=world(S,p,prm,prm.deepRoll?k:null);
      for(let i=0;i<top.length;i++){
        if(!alive[i])continue;
        const T=clone(W),j0=[jCnt(T,0),jCnt(T,1)],r=rollout(T,p,top[i].a,RP);
        sum[i]+=r-cost*((jCnt(T,p)-j0[p])-.5*(jCnt(T,1-p)-j0[1-p]));
        cnt[i]++;
      }
      k++;
      if(k===36||k===96)prune();
    }
    if(k>=K||(bud&&k>=8&&now()-t0>bud))return fin();setTimeout(tick,0)};
  tick();
}
/* Bot zamanlaması: her hamleden önce düşünme süresi; jokerler ve çekmeler peş peşe gelmez */
const THINK={easy:[3000,4300],med:[3500,5200],hard:[4300,6500],imp:[10000,13000]},AFTER={easy:[3000,3800],med:[3300,4400],hard:[3600,5000],imp:[10000,13000]};
const rnd=r=>r[0]+Math.random()*(r[1]-r[0]);
let botGen=0,thinkOn=false;
function bot(){
  const S=G,prm=DIFF=='imp'?impPrm():PR[DIFF],gen=++botGen;let n=0;
  let plan=null,held=0,pid=0;
  const think=r=>{thinkOn=true;R();talk('think',1,.55);R();const d=rnd(r)*(S.clocks&&S.clocks[1]<20?.42:.75);plan=null;const my=++pid;
    // karar, düşünme süresinin hemen başında hesaplanır; hamle anında tam bütçeyle hazır olur
    const budCap=Math.max(900,Math.round(d-220));
    setTimeout(()=>{if(gen!=botGen||S!=G||S.turn!=1||S.over)return;if(n++>=8){plan={a:null};return}
      const ok=a=>{if(my==pid&&gen==botGen&&S==G&&S.turn==1&&!S.over)plan={a}};
      if(prm.mc)decideHA(S,1,prm,ok,budCap);else ok(decide(S,1,prm))},20);
    setTimeout(step,d)};
  const step=()=>{
    if(gen!=botGen||S!=G)return;
    if(S.turn!=1||S.over){thinkOn=false;return}
    if(lock||(S.graceLeft&&S.graceLeft>0)){held=1;return setTimeout(step,150)} // menü/pencere açık veya 5sn hazırlık süresi: oyun bekler
    if(held){held=0;return setTimeout(step,500)} // kapanınca kısa bir nefes payı
    thinkOn=false;
    if(S.hpUsed&&!S.hpUsed[1]){
      const bh=avKey(S,1),bt=total(S,1),bT=tg(S),low=lowW(S);
      if(bh==='c'&&S.cWins&&S.cWins[1]>=4&&!low){
        const curEv=evalS(clone(S),1),dp1=deathProb(S,1);
        const rwThr=prm.deepRoll?-(0.18+(1-dp1)*0.16):-0.35;
        if((bt>bT&&curEv<0.22)||(prm.hero&&curEv<rwThr)){
          execRewind(S,1);return think(AFTER[DIFF]);
        }
      }
      if(bh==='w'&&prm.hero&&S.pl[0].closed.length){
        S.hpUsed[1]=true;S.botPeekVal=S.pl[0].closed[0].n;
        S.log.push({p:1,t:'Kuzgunun Kehaneti kullandı (kapalı kartını inceledi)'});
        R();return think(AFTER[DIFF]);
      }
      if(bh==='a'&&prm.hero&&S.deck.length>=2){
        const dn=S.deck.length,c1=S.deck[dn-1],c2=S.deck[dn-2];
        let swap=false;
        if(prm.deepRoll){
          CUR=prm;
          const evOrd=(topC,secC)=>{
            const T1=clone(S);T1.log=[];T1.deck.pop();T1.pl[1].open.push({id:++T1.u,n:topC.n});
            const drawEv=look(T1,1,1);
            const standEv=evalS(clone(S),1)+( !low&&total(S,0,false)+topC.n>bT ? 0.14 : 0 );
            return Math.max(drawEv,standEv)+( !low&&total(S,0,false)+secC.n>bT ? 0.04 : 0 );
          };
          swap=evOrd(c2,c1)>evOrd(c1,c2)+1e-4;
        }else{
          const good1=!low?bt+c1.n<=bT:c1.n<=c2.n,good2=!low?bt+c2.n<=bT:c2.n<=c1.n;
          swap=(!low&&bt<=bT-2)?(good2&&(!good1||c2.n>c1.n)):(!low&&bt>=bT-1)?(c1.n<c2.n):(c1.n<c2.n);
        }
        if(swap){S.deck[dn-1]=c2;S.deck[dn-2]=c1}
        S.botScry=[S.deck[dn-1].n,S.deck[dn-2].n];
        S.hpUsed[1]=true;S.log.push({p:1,t:'Yitik Yazgı kullandı (destenin üstünü düzenledi)'});
        playHeroPowerAnim('a',1,HERO_MAP.a);snd('flip');R();return think(AFTER[DIFF]);
      }
      if(bh==='p'&&S.hand[1].length>=1&&S.hand[1].length<=(prm.hero?3:2)&&S.jdeck.length>=2){
        let bIdx=0;
        if(prm.hero){
          const cands=listC(S,1,prm),baseV=cands.find(x=>!x.a)?.v??0;
          let worst=1e9;
          S.hand[1].forEach((jid,idx)=>{
            if(jid===25)return;
            const bestForJ=cands.filter(x=>x.a&&x.a.id===jid).reduce((mx,x)=>Math.max(mx,x.v),-9);
            if(bestForJ<worst){worst=bestForJ;bIdx=idx}
          });
          if(worst>baseV+0.25&&S.hand[1].length>2)bIdx=-1;
        }
        if(bIdx>=0){execPlague(S,1,bIdx);R();return think(AFTER[DIFF])}
      }
      if(bh==='l'&&(S.pl[0].open.length||S.pl[0].closed.length)&&(S.pl[1].open.length||S.pl[1].closed.length)){
        let useW=false;
        const oppVisBust=!low&&total(S,0,false)>bT&&!act(S,20);
        if(prm.hero&&!(oppVisBust&&bt<=bT)){
          CUR=prm;
          const before=evalS(clone(S),1);
          let sumA=0;const K=prm.deepRoll?48:28;
          for(let k=0;k<K;k++){
            const T=clone(S);T.log=[];
            const p0=T.pl[0].open.length?T.pl[0].open:T.pl[0].closed,p1=T.pl[1].open.length?T.pl[1].open:T.pl[1].closed;
            p0.splice(Math.floor(Math.random()*p0.length),1);
            p1.splice(Math.floor(Math.random()*p1.length),1);
            sumA+=evalS(T,1);
          }
          const avgA=sumA/K;
          if((!low&&bt>bT&&avgA>before+0.02)||(avgA>before+0.12))useW=true;
        }else if(!oppVisBust&&((!low&&bt>bT)||(total(S,0,false)>=bT-2))){
          useW=true;
        }
        if(useW){execWolf(S,1,()=>think(AFTER[DIFF]));return}
      }
    }
    const a=plan?plan.a:(n++<8?(prm.mc?decideH:decide)(S,1,prm.mc?{...prm,K:90,ms:400}:prm):null);plan=null;pid++;
    if(!a){R();return pass()}
    S.acted=true;
    if(a.t=='d'){if(S.botScry&&S.botScry.length)S.botScry.shift();const c=S.deck.pop();S.pl[1].open.push(c);if(S.stats&&S.stats.draws)S.stats.draws[1]++;S.acted=true;S.log.push({p:1,t:`kart çekti (${c.n})`});R();talk('draw',0,.3);think(AFTER[DIFF])}
    else{play(S,1,a.id,a.pk);S.log.push({p:1,t:`joker oynadı: ${J[a.id]}`});note(1,a.id,()=>{R();think(AFTER[DIFF])})}
  };
  think(THINK[DIFF]);
}

/* ---------- AKIŞ ---------- */
function pass(fromTimeout=false){
  const S=G;P=null;S.graceLeft=0;
  S.log.push({p:S.turn,t:fromTimeout?'süresi bitti — sıra rakibe geçti':'pas dedi'});
  if(S.turn==1&&!fromTimeout)talk('pass',0,.35);
  const opp=1-S.turn;
  if(S.turns>0&&!S.acted){
    if(fromTimeout){
      S.wait=true;lock=true;R();
      setTimeout(()=>{if(S===G)endRound()},1000);
      return;
    }
    return endRound();
  }
  (S.pa=S.pa||[0,0])[S.turn]++;S.turns++;S.acted=false;S.turn=opp;(S.jTurn=S.jTurn||[0,0])[S.turn]=0;
  S.clocks=S.clocks||[initClockSec(),initClockSec()];S.clocks[opp]=initClockSec();
  S.timeOut=S.timeOut||[false,false];S.timeOut[opp]=false;
  R();next();
}
function next(){
  if(MODE=='tutorial'&&G&&G.turn==1&&!lock&&!G.over){setTimeout(()=>{if(MODE=='tutorial'&&G&&G.turn==1&&!lock&&!G.over)pass()},650);return}
  if(MODE=='bot'&&G.turn==1&&!lock&&!G.over)bot()
}
function M(html,btn,cb,end){lock=true;const mb=$('#mb');mb.classList.remove('end-mode','an-mode','set-mode');mb.innerHTML=html+(btn?`<br><br><button id="mo" class="btn">${btn}</button>`:end?'':`<br><i>${tr('Oda sahibinin devam etmesi bekleniyor…','Waiting for the host to continue…')}</i>`)+(end?`<br><br><button id="mx" class="btn alt">${tr('Ana menüye dön','Return to Main Menu')}</button>`:'');$('#m').hidden=false;
  if(end&&$('#mb .dice'))$('#mx').style.visibility='hidden'; // zar atılmadan sonuç sızmasın
  anim();
  let done=false;
  if(btn)$('#mo').onclick=()=>{if(done)return;done=true;$('#mb').classList.remove('end-mode','an-mode','set-mode');$('#m').hidden=true;lock=false;cb()};
  if(end)$('#mx').onclick=exitGame}
function MM(fn,btn,cb,sd,end){
  if(MODE=='host'){
    const passBtn=(!end&&btn)?btn:null;
    if(passBtn){deathContReady=[false,false];deathContGo=cb}
    if(conn&&conn.open)conn.send({k:'m',html:fn(1),btn:passBtn,sd:sd&&sd(1),end});
    spectators.forEach(s=>{try{if(s.open)s.send({k:'m',html:fn(2),sd:sd&&sd(2),end,spec:true})}catch(e){}});
    if(passBtn){
      M(fn(0),btn,()=>{deathContReady[0]=true;checkDeathCont()},end);snd(sd&&sd(0));
      return;
    }
  }
  M(fn(0),btn,cb,end);snd(sd&&sd(0));
}
const PROF=(()=>{try{const o=JSON.parse(LS('prof')||'null');if(o&&Array.isArray(o.p)&&o.p.length==19)return o}catch(e){}return{n:0,p:new Array(19).fill(0)}})(); // oyuncunun pas geçtiği toplamlar (hedefe uzaklık) bu cihazda saklanır
function profRec(S,tot,T){if(lowW(S)||!S.pa||!(S.pa[0]>0))return;const d=Math.max(-6,Math.min(12,T-tot));PROF.p[d+6]++;PROF.n++;LS('prof',JSON.stringify(PROF));syncToFirebase()}

/* ---------- FIREBASE / GLOBAL BOT MEMORY ---------- */
const FB_CFG={
  apiKey: "AIzaSyBdrfPIhArtP0ck9A05--Z7s4Oq6exAZqQ",
  authDomain: "necrodice.firebaseapp.com",
  projectId: "necrodice",
  storageBucket: "necrodice.firebasestorage.app",
  messagingSenderId: "865937962056",
  appId: "1:865937962056:web:d54c137e3ca1e8cc95547d"
};
let fbDb=null,fbDoc=null;
try{
  if(window.firebase){
    firebase.initializeApp(FB_CFG);
    fbDb=firebase.firestore();
    fbDoc=fbDb.collection('bot').doc('global_memory');
    // Global hafızayı çekip yerel LRN ve PROF ile birleştir
    fbDoc.get().then(doc=>{
      if(doc.exists){
        const d=doc.data();
        if(d.LRN)mergeGlobalLRN(d.LRN);
        if(d.PROF)mergeGlobalPROF(d.PROF);
        console.log('Firebase: Global bot hafızası yüklendi!');
      }
      // Telefonda veya yerelde daha önce birikmiş veri varsa hemen Firebase'e aktar
      if((LRN && LRN.ht > 0) || (PROF && PROF.n > 0)){
        syncToFirebase();
      }
    }).catch(e=>{
      console.warn('Firebase get error:',e);
      if((LRN && LRN.ht > 0) || (PROF && PROF.n > 0)) syncToFirebase();
    });
  }
}catch(e){console.warn('Firebase init error:',e)}

function mergeGlobalLRN(g){
  if(!g)return;
  if(Array.isArray(g.dp_d)&&Array.isArray(g.dp_p)&&g.dp_d.length==19){
    for(let i=0;i<19;i++){LRN.dp[i][0]=Math.max(LRN.dp[i][0],g.dp_d[i]||0);LRN.dp[i][1]=Math.max(LRN.dp[i][1],g.dp_p[i]||0)}
  }else if(Array.isArray(g.dp)&&g.dp.length==19){
    for(let i=0;i<19;i++){LRN.dp[i][0]=Math.max(LRN.dp[i][0],g.dp[i][0]||0);LRN.dp[i][1]=Math.max(LRN.dp[i][1],g.dp[i][1]||0)}
  }
  if(Array.isArray(g.arm_n)&&Array.isArray(g.arm_s)&&g.arm_n.length==ARMS.length){
    for(let i=0;i<ARMS.length;i++){LRN.arm[i][0]=Math.max(LRN.arm[i][0],g.arm_n[i]||0);LRN.arm[i][1]=Math.max(LRN.arm[i][1],g.arm_s[i]||0)}
  }else if(Array.isArray(g.arm)&&g.arm.length==ARMS.length){
    for(let i=0;i<ARMS.length;i++){LRN.arm[i][0]=Math.max(LRN.arm[i][0],g.arm[i][0]||0);LRN.arm[i][1]=Math.max(LRN.arm[i][1],g.arm[i][1]||0)}
  }
  LRN.ht=Math.max(LRN.ht,g.ht||0);
  LRN.hj=Math.max(LRN.hj,g.hj||0);
  if(g.g){LRN.g[0]=Math.max(LRN.g[0],g.g[0]||0);LRN.g[1]=Math.max(LRN.g[1],g.g[1]||0)}
  if(g.r){LRN.r[0]=Math.max(LRN.r[0],g.r[0]||0);LRN.r[1]=Math.max(LRN.r[1],g.r[1]||0);LRN.r[2]=Math.max(LRN.r[2],g.r[2]||0)}
  if(g.jp){for(let k in g.jp)LRN.jp[k]=Math.max(LRN.jp[k]||0,g.jp[k])}
  lrnSave(false);
}

function mergeGlobalPROF(g){
  if(!g)return;
  if(Array.isArray(g.p)&&g.p.length==19){
    for(let i=0;i<19;i++)PROF.p[i]=Math.max(PROF.p[i],g.p[i]||0);
  }
  PROF.n=Math.max(PROF.n,g.n||0);
  LS('prof',JSON.stringify(PROF));
}

let fbSyncTimer=null;
function syncToFirebase(){
  if(!fbDoc)return;
  clearTimeout(fbSyncTimer);
  fbSyncTimer=setTimeout(()=>{
    const flatLRN={v:LRN.v,dp_d:LRN.dp.map(x=>x[0]),dp_p:LRN.dp.map(x=>x[1]),arm_n:LRN.arm.map(x=>x[0]),arm_s:LRN.arm.map(x=>x[1]),ht:LRN.ht,hj:LRN.hj,jp:LRN.jp,cur:LRN.cur,g:LRN.g,r:LRN.r};
    fbDoc.set({LRN:flatLRN,PROF,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})
      .catch(e=>console.warn('Firebase sync error:',e));
  },1500);
}

/* ---------- İMKANSIZ BOT: oynadığı oyunlardan öğrenir (bu cihazda ve Firebase'de saklanır) ----------
   1) Oyuncu modeli: oyuncu hedefe ne kadar uzaktayken kart çekiyor / pas geçiyor, ne sıklıkla joker oynuyor.
      Bot, hamle seçerken oyuncunun cevabını kendi gibi değil, bu öğrendiği alışkanlıklarla simüle eder.
   2) Ayar seçimi: birkaç farklı oyun tarzı (risk, joker maliyeti, rakip tahmini) denenir; oyuncuya karşı
      en çok tur kazandıran tarz zamanla daha sık seçilir (UCB). */
const ARMS=[{},{jc:.05,jl:.02},{jc:.18,jl:.1},{beta:.4,gap:6},{beta:1,gap:8},{dm:.05},{rjp:.45},{rjp:.95}];
const LRN=(()=>{try{const o=JSON.parse(LS('lrn')||'null');if(o&&o.v==1&&Array.isArray(o.dp)&&o.dp.length==19&&Array.isArray(o.arm)&&o.arm.length==ARMS.length)return o}catch(e){}return lrnNew()})();
window.botMemory=LRN;
window.botStats=()=>{const tr=LRN.r[0]+LRN.r[1]+LRN.r[2];return{toplamHamle:LRN.ht,jokerKullanimi:LRN.hj,toplamTur:tr,turSonuclari:{botKazandi:LRN.r[0],oyuncuKazandi:LRN.r[1],berabere:LRN.r[2]},turKazanmaYuzdesi:tr>0?Math.round(100*(LRN.r[0]+LRN.r[2]/2)/tr)+'%':'0%',oyunlar:{botKazandi:LRN.g[0],toplamOyun:LRN.g[1]},detay:LRN}};
window.resetBotStats=()=>{Object.assign(LRN,lrnNew());PROF.n=0;PROF.p.fill(0);lrnSave();LS('prof',JSON.stringify(PROF));console.log('Bot hafızası sıfırlandı.');return 'Sıfırlandı'};
function lrnNew(){return{v:1,dp:Array.from({length:19},()=>[0,0]),ht:0,hj:0,jp:{},arm:ARMS.map(()=>[0,0]),cur:0,g:[0,0],r:[0,0,0]}}
const lrnSave=(sync=true)=>{LS('lrn',JSON.stringify(LRN));if(sync)syncToFirebase()},learning=()=>MODE=='bot'&&DIFF=='imp';
function lrnAct(S,kind,id){ // oyuncunun hamlesi: 'd' kart çek, 'p' pas, 'j' joker
  if(!learning())return;LRN.ht++;
  if(kind=='j'){LRN.hj++;LRN.jp[id]=(LRN.jp[id]|0)+1}
  else if(!lowW(S)){const d=Math.max(-6,Math.min(12,tg(S)-total(S,0)))+6;LRN.dp[d][kind=='d'?0:1]++}
  lrnSave()}
function armPick(){const N=LRN.arm.reduce((t,a)=>t+a[0],0);let bi=0,bs=-1;
  LRN.arm.forEach((a,i)=>{const v=a[0]?a[1]/a[0]+.3*Math.sqrt(Math.log(N+1)/a[0]):9;if(v>bs){bs=v;bi=i}});LRN.cur=bi}
function lrnRound(r){ // r: oyuncu açısından tur sonucu
  if(!learning())return;const sc=r<0?1:r==0?.5:0,a=LRN.arm[LRN.cur];a[0]++;a[1]+=sc;LRN.r[r<0?0:r>0?1:2]++;lrnSave()}
function lrnGame(botWon){if(!learning())return;LRN.g[1]++;if(botWon)LRN.g[0]++;lrnSave()}
const impPrm=()=>({...PR.imp,...ARMS[LRN.cur]});
const hjr=()=>(LRN.hj+1)/(LRN.ht+6); // oyuncunun bir hamlede joker oynama olasılığı
function hmove(T,a,pol){ // simülasyonda oyuncunun hamlesi: öğrendiği alışkanlıklar
  if(lowW(T))return decide(T,a,pol);
  const d=Math.max(-6,Math.min(12,tg(T)-total(T,a)))+6,e=LRN.dp[d],n=e[0]+e[1];
  if(n<5)return decide(T,a,pol); // bu durumda yeterli veri yok: güçlü oyuncu varsay
  if(canDraw(T,a)&&Math.random()<(e[0]+.3)/(n+.6))return{t:'d'};
  if(T.jUsed[a]<2&&!T.noJ[a]&&T.hand[a].length&&Math.random()<hjr()){const x=decide(T,a,{...pol,jp:1});if(x&&x.t=='j')return x}
  return null}
function isMobilePerf(){
  return window.innerWidth<=760||(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);
}
function dustTableCards(){
  const cards=[...document.querySelectorAll('#opp .cards .c, #me .cards .c, #jo .e, #jm .e')];
  if(!cards.length)return;
  const rects=cards.map(c=>c.getBoundingClientRect());
  try{if(VS>0){noise(.62,.14,1900);noise(.45,.09,900,.1)}}catch(e){}
  cards.forEach((c,idx)=>{
    c.style.animationDelay=(idx*35)+'ms';
    c.classList.add('dust-out');
  });
  if(RM)return;
  const cvs=document.createElement('canvas');
  cvs.className='thanos-canvas';
  const dpr=Math.min(window.devicePixelRatio||1,isMobilePerf()?1.25:2);
  const W=window.innerWidth,H=window.innerHeight;
  cvs.width=Math.round(W*dpr);cvs.height=Math.round(H*dpr);
  const ctx=cvs.getContext('2d');
  ctx.scale(dpr,dpr);
  document.body.appendChild(cvs);
  const mob=isMobilePerf();
  const perCard=mob?38:78;
  const palParch=['#e7d7b8','#d5c098','#a6906c','#5c5043','#2b2520','#d4a855'];
  const palRed=['#c99c62','#8f242c','#4c2124','#3a312c','#e0c79e','#211b19'];
  const pts=[];
  cards.forEach((c,idx)=>{
    const r=rects[idx];
    if(!r.width||!r.height)return;
    const isRed=c.classList.contains('bk')||c.classList.contains('opp');
    const pal=isRed?palRed:palParch;
    const baseD=idx*35;
    for(let i=0;i<perCard;i++){
      const u=Math.random(),v=Math.random(); // u: 0..1 left->right, v: 0..1 top->bottom
      const front=(1-u)*0.65+v*0.35; // sağ üstten sol alta doğru çözülme dalgası
      pts.push({
        x:r.left+u*r.width,
        y:r.top+v*r.height,
        vx:36+Math.random()*95,
        vy:-18-Math.random()*62,
        sz:1.3+Math.random()*(mob?2.2:2.7),
        col:pal[(Math.random()*pal.length)|0],
        delay:baseD+front*360+Math.random()*70,
        life:420+Math.random()*360,
        phase:Math.random()*Math.PI*2,
        freq:4+Math.random()*6,
        swirl:14+Math.random()*26
      });
    }
  });
  const t0=performance.now();
  const frame=now=>{
    const el=now-t0;
    ctx.clearRect(0,0,W,H);
    let alive=0;
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      const dt=el-p.delay;
      if(dt<0){alive++;continue}
      if(dt>=p.life)continue;
      alive++;
      const prog=dt/p.life;
      const ease=prog*prog;
      const sec=dt/1000;
      const px=p.x+p.vx*sec*(0.4+0.8*prog)+Math.sin(sec*p.freq+p.phase)*p.swirl*prog;
      const py=p.y+p.vy*sec*(0.45+0.7*prog)+Math.cos(sec*p.freq*0.7+p.phase)*(p.swirl*0.45)*prog;
      const alpha=(1-ease)*(prog<0.12?prog/0.12:1);
      const sz=p.sz*(1-prog*0.55);
      ctx.globalAlpha=Math.max(0,alpha);
      ctx.fillStyle=p.col;
      ctx.fillRect(px,py,sz,sz);
    }
    ctx.globalAlpha=1;
    if(alive>0&&el<1050)requestAnimationFrame(frame);
    else cvs.remove();
  };
  requestAnimationFrame(frame);
}
function heroAttack(winIdx,tanked=false){
  const srcAv=document.querySelector((winIdx===0?'#me':'#opp')+' .who .av');
  const dstAv=document.querySelector((winIdx===0?'#opp':'#me')+' .who .av');
  if(!srcAv||!dstAv)return;
  const r1=srcAv.getBoundingClientRect(),r2=dstAv.getBoundingClientRect();
  if(!r1.width||!r2.width)return;
  const dx=(r2.left+r2.width/2)-(r1.left+r1.width/2);
  const dy=(r2.top+r2.height/2)-(r1.top+r1.height/2);
  const clone=document.createElement('img');
  clone.src=srcAv.src;
  clone.className='av-attacker';
  clone.style.left=r1.left+'px';
  clone.style.top=r1.top+'px';
  clone.style.width=r1.width+'px';
  clone.style.height=r1.height+'px';
  document.body.appendChild(clone);
  srcAv.style.opacity='0';

  const anim=clone.animate([
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0},
    {transform:`translate3d(${(-dx*0.06).toFixed(1)}px,${(-dy*0.06).toFixed(1)}px,0) scale(1.14) rotate(-3deg)`,offset:0.22},
    {transform:`translate3d(${(-dx*0.12).toFixed(1)}px,${(-dy*0.12).toFixed(1)}px,0) scale(1.24) rotate(-6deg)`,offset:0.38},
    {transform:`translate3d(${(dx*0.28).toFixed(1)}px,${(dy*0.28).toFixed(1)}px,0) scale(1.28) rotate(2deg)`,offset:0.52},
    {transform:`translate3d(${(dx*0.92).toFixed(1)}px,${(dy*0.92).toFixed(1)}px,0) scale(1.26) rotate(0deg)`,offset:0.62},
    {transform:`translate3d(${(dx*0.84).toFixed(1)}px,${(dy*0.84).toFixed(1)}px,0) scale(1.16) rotate(0deg)`,offset:0.69},
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:1}
  ],{duration:2550,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});

  setTimeout(()=>{
    if(!dstAv.isConnected)return;
    snd('stamp');vib([60,40,120]);
    dstAv.classList.remove('av-hit');void dstAv.offsetWidth;dstAv.classList.add('av-hit');
    const imp=document.createElement('div');
    imp.className='av-impact';
    imp.style.left=(r2.left+r2.width/2)+'px';
    imp.style.top=(r2.top+r2.height/2)+'px';
    const dmg=document.createElement('div');
    dmg.className='av-dmg';
    dmg.textContent=tanked?'0':'-1';
    dmg.style.left=(r2.left+r2.width/2)+'px';
    dmg.style.top=(r2.top+r2.height/2)+'px';
    document.body.appendChild(imp);
    document.body.appendChild(dmg);
    setTimeout(()=>{imp.remove();dmg.remove()},1250);
    if(tanked){
      const hpEl=document.querySelector(winIdx===0?'#opp .hp-btn':'#me .hp-btn');
      if(hpEl){
        const hr=hpEl.getBoundingClientRect();
        const fx=document.createElement('div');
        fx.className='hp-cast-fx'+(winIdx===0?' opp':'');
        fx.style.left=(hr.left+hr.width/2)+'px';
        fx.style.top=(hr.top+hr.height/2)+'px';
        fx.innerHTML=`<i class="hp-cast-ring"></i><span class="hp-cast-pop">${tr('Kadim Direnç!','Ancient Resilience!')}</span>`;
        document.body.appendChild(fx);
        setTimeout(()=>fx.remove(),1350);
      }
    }
  },1180);

  anim.onfinish=()=>{
    clone.remove();
    if(srcAv.isConnected)srcAv.style.opacity='';
  };
}
function heroClash(){
  const av0=document.querySelector('#me .who .av');
  const av1=document.querySelector('#opp .who .av');
  if(!av0||!av1)return;
  const r0=av0.getBoundingClientRect(),r1=av1.getBoundingClientRect();
  if(!r0.width||!r1.width)return;
  const cx0=r0.left+r0.width/2,cy0=r0.top+r0.height/2;
  const cx1=r1.left+r1.width/2,cy1=r1.top+r1.height/2;
  const mx=(cx0+cx1)/2,my=(cy0+cy1)/2;
  const dx0=mx-cx0,dy0=(my-cy0)+r0.height*0.32;
  const dx1=mx-cx1,dy1=(my-cy1)-r1.height*0.32;
  const mkClone=(av,r)=>{
    const c=document.createElement('img');
    c.src=av.src;c.className='av-attacker';
    c.style.left=r.left+'px';c.style.top=r.top+'px';
    c.style.width=r.width+'px';c.style.height=r.height+'px';
    document.body.appendChild(c);
    av.style.opacity='0';
    return c;
  };
  const c0=mkClone(av0,r0),c1=mkClone(av1,r1);
  const dur=2800;
  const run=(c,dx,dy,tilt)=>c.animate([
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0},
    {transform:`translate3d(${(-dx*0.06).toFixed(1)}px,${(-dy*0.08).toFixed(1)}px,0) scale(1.12) rotate(${-tilt*0.6}deg)`,offset:0.22},
    {transform:`translate3d(${(-dx*0.12).toFixed(1)}px,${(-dy*0.16).toFixed(1)}px,0) scale(1.20) rotate(${-tilt}deg)`,offset:0.38},
    {transform:`translate3d(${(dx*0.30).toFixed(1)}px,${(dy*0.30).toFixed(1)}px,0) scale(1.25) rotate(${tilt*0.5}deg)`,offset:0.52},
    {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(1.24) rotate(0deg)`,offset:0.62},
    {transform:`translate3d(${(dx*0.80).toFixed(1)}px,${(dy*0.80).toFixed(1)}px,0) scale(1.14) rotate(${-tilt*0.4}deg)`,offset:0.69},
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:1}
  ],{duration:dur,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});
  const a0=run(c0,dx0,dy0,5),a1=run(c1,dx1,dy1,-5);
  setTimeout(()=>{
    if(!av0.isConnected)return;
    snd('stamp');vib([50,35,90]);
    const imp=document.createElement('div');
    imp.className='av-impact';
    imp.style.left=mx+'px';
    imp.style.top=my+'px';
    document.body.appendChild(imp);
    setTimeout(()=>imp.remove(),1100);
  },1736);
  a0.onfinish=()=>{c0.remove();if(av0.isConnected)av0.style.opacity='';};
  a1.onfinish=()=>{c1.remove();if(av1.isConnected)av1.style.opacity='';};
}
function heroVampTie(vampIdx){
  const av0=document.querySelector('#me .who .av');
  const av1=document.querySelector('#opp .who .av');
  if(!av0||!av1)return;
  const r0=av0.getBoundingClientRect(),r1=av1.getBoundingClientRect();
  if(!r0.width||!r1.width)return;
  const cx0=r0.left+r0.width/2,cy0=r0.top+r0.height/2;
  const cx1=r1.left+r1.width/2,cy1=r1.top+r1.height/2;
  const mx=(cx0+cx1)/2,my=(cy0+cy1)/2;
  const dx0=mx-cx0,dy0=(my-cy0)+r0.height*0.32;
  const dx1=mx-cx1,dy1=(my-cy1)-r1.height*0.32;
  const mkClone=(av,r)=>{
    const c=document.createElement('img');
    c.src=av.src;c.className='av-attacker';
    c.style.left=r.left+'px';c.style.top=r.top+'px';
    c.style.width=r.width+'px';c.style.height=r.height+'px';
    document.body.appendChild(c);
    av.style.opacity='0';
    return c;
  };
  const c0=mkClone(av0,r0),c1=mkClone(av1,r1);
  const dur=3600;
  const run=(c,dx,dy,tilt,isVamp)=>c.animate([
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0},
    {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(1.22) rotate(0deg)`,offset:0.22},
    {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(1.22) rotate(0deg)`,offset:0.50},
    isVamp
      ?{transform:`translate3d(${(dx+(vampIdx===0?0:-6)).toFixed(1)}px,${(dy+(vampIdx===0?-22:22)).toFixed(1)}px,0) scale(1.30) rotate(${tilt}deg)`,offset:0.60}
      :{transform:`translate3d(${(dx*0.72).toFixed(1)}px,${(dy*0.72).toFixed(1)}px,0) scale(1.06) rotate(${-tilt}deg)`,offset:0.62},
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0.86},
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:1}
  ],{duration:dur,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});
  const a0=run(c0,dx0,dy0,5,vampIdx===0),a1=run(c1,dx1,dy1,-5,vampIdx===1);
  setTimeout(()=>{
    if(!av0.isConnected)return;
    snd('stamp');vib([80,40,140]);
    const b=document.createElement('div');
    b.className='av-vamp-blood';
    b.style.left=mx+'px';
    b.style.top=(vampIdx===0?my-r1.height*0.32:my+r0.height*0.32)+'px';
    document.body.appendChild(b);
    setTimeout(()=>b.remove(),1100);
    const hpEl=document.querySelector(vampIdx===0?'#me .hp-btn':'#opp .hp-btn');
    if(hpEl){
      const hr=hpEl.getBoundingClientRect();
      const fx=document.createElement('div');
      fx.className='hp-cast-fx'+(vampIdx===1?' opp':'');
      fx.style.left=(hr.left+hr.width/2)+'px';
      fx.style.top=(hr.top+hr.height/2)+'px';
      fx.innerHTML=`<i class="hp-cast-ring"></i><span class="hp-cast-pop">${tr('Kanla Mühürlenen Kader!','Blood-Sealed Fate!')}</span>`;
      document.body.appendChild(fx);
      setTimeout(()=>fx.remove(),1350);
    }
  },1850);
  setTimeout(()=>{
    const dstAv=vampIdx===0?av1:av0,dr=vampIdx===0?r1:r0;
    if(!dstAv.isConnected)return;
    snd('stamp');vib([60,40,120]);
    dstAv.classList.remove('av-hit');void dstAv.offsetWidth;dstAv.classList.add('av-hit');
    const dmg=document.createElement('div');
    dmg.className='av-dmg';
    dmg.textContent='-1';
    dmg.style.left=(dr.left+dr.width/2)+'px';
    dmg.style.top=(dr.top+dr.height/2)+'px';
    document.body.appendChild(dmg);
    setTimeout(()=>dmg.remove(),1250);
  },3050);
  a0.onfinish=()=>{c0.remove();if(av0.isConnected)av0.style.opacity='';};
  a1.onfinish=()=>{c1.remove();if(av1.isConnected)av1.style.opacity='';};
}
function endRound(){
  const S=G,a=[total(S,0),total(S,1)],T=tg(S);
  let r=outc(S,0),tankedSide=-1,vampWinSide=-1;
  if(r!==0){
    const loser=r<0?0:1;
    if(avKey(S,loser)==='e'&&Math.random()<0.18){
      r=0;tankedSide=loser;
      S.log.push({p:loser,t:'Kadim Direnç! Hasarı savuşturup turu berabereye çevirdi!'});
    }
  }
  if(r===0){
    const vc=[0,1].filter(p=>avKey(S,p)==='v'&&!(S.vampUsed&&S.vampUsed[p]));
    if(vc.length===1){
      const vp=vc[0];
      r=vp===0?1:-1;vampWinSide=vp;
      S.vampUsed=S.vampUsed||[false,false];S.vampUsed[vp]=true;
      S.hpUsed=S.hpUsed||[false,false];S.hpUsed[vp]=true;
      S.log.push({p:vp,t:'Kanla Mühürlenen Kader! Beraberliği galibiyete çevirdi!'});
    }
  }
  if(S.stats&&S.stats.rounds){if(r>0)S.stats.rounds[0]++;else if(r<0)S.stats.rounds[1]++;else S.stats.rounds[2]++;}
  if(MODE=='bot'){profRec(S,a[0],T);lrnRound(r)}
  S.wait=true;S.rev=true;S.winSide=null;S.vampWinSide=vampWinSide;
  R();snd('flip');lock=true; // 1) Kapalı kartlar açılır ve masada açık kalır (düello kutusu henüz yanmaz)
  setTimeout(()=>{
    if(S!==G)return;
    // 2) Kazanan kahraman ikonu kalkıp kaybedenin ikonuna Hearthstone tarzı saldırı vuruşu yapar
    S.winSide=r;
    if(MODE=='bot'){talk(r==0?'tie':r<0?'win':(a[1]>T&&!lowW(S)?'bust':'lose'),2)}
    snd(r>0?'win':r<0?'lose':'ok');
    R();
    setTimeout(()=>{if(S===G){if(vampWinSide>=0){const btn=document.querySelector(vampWinSide===0?'#me .hp-btn':'#opp .hp-btn');if(btn){const hr=btn.getBoundingClientRect(),fx=document.createElement('div');fx.className='hp-cast-fx'+(vampWinSide===1?' opp':'');fx.style.left=(hr.left+hr.width/2)+'px';fx.style.top=(hr.top+hr.height/2)+'px';fx.innerHTML=`<i class="hp-cast-ring"></i><span class="hp-cast-pop">${tr('Kanla Mühürlenen Kader!','Blood-Sealed Fate!')}</span>`;document.body.appendChild(fx);setTimeout(()=>fx.remove(),1350);}heroClash();}else if(tankedSide>=0)heroAttack(1-tankedSide,true);else if(r!==0)heroAttack(r>0?0:1);else heroClash();}},1000);
    setTimeout(()=>{
      if(S!==G)return;
      // Vuruş animasyonu tamamlandıktan sonra düello kutusu (yeşil/kırmızı/gri) ve puanlar güncellenir
      if(r!==0){S.cWins=S.cWins||[0,0];S.cWins[r>0?0:1]++;}
      S.pts[0]+=r>0?1:r==0?.5:0;S.pts[1]+=r<0?1:r==0?.5:0;S.rounds++;S.res.push(r);
      if(!(S.pts.some(x=>x>=2)||S.rounds>=3)&&r==0){
        [0,1].forEach(p=>S.jdeck.length&&S.hand[p].push(S.jdeck.pop()));
      }
      R();
    },3300);
    setTimeout(()=>{
      if(S!==G)return;
      // 3) Yerdeki bütün sayı kartları tozlaşır gibi yok olur, sonra diğer tura geçilir
      dustTableCards();
      setTimeout(()=>{if(S!==G)return;lock=false;fin()},820);
    },4100);
  },750);
  function fin(){
    S.winSide=null;S.vampWinSide=-1;
    if(MODE==='tutorial'){
      tutStep=8;R();tutRender();
      return;
    }
    const duelEnds=S.pts.some(x=>x>=2)||S.rounds>=3;
    if(!duelEnds){
      deal(S);R();next();
      return;
    }
    let L=S.pts[0]<S.pts[1]?0:S.pts[1]<S.pts[0]?1:-1,hx=null,hd=null,how='';
    if(L<0){
      const j=S.hand.map(h=>h.length);
      if(j[0]!=j[1]){L=j[0]<j[1]?0:1;how='joker'}
      else{let a1,a2,b1,b2,x,y;do{a1=d6();a2=d6();b1=d6();b2=d6();x=a1+a2;y=b1+b2}while(x==y);L=x<y?0:1;hx=[x,y];hd=[[a1,a2],[b1,b2]];how='zar'}
    }
    const th=TH[Math.min(S.bo,3)],rawRoll=d20(),hpB=avKey(S,L)==='m'?2:0,execPen=avKey(S,1-L)==='n'?-2:0,roll=Math.max(1,Math.min(20,rawRoll+hpB+execPen)),surv=roll>=th;
    const mk=(v,roll,surv,rawOv)=>{const rr=rawOv!=null?rawOv:rawRoll;
      const duelWinnerTxt=isEn()?(L==v?'Opponent won the duel.':'You won the duel.'):`Düelloyu ${L==v?'rakip kazandı.':'sen kazandın.'}`;
      const howTxt=how=='joker'?`<br><span class="d20-how">${tr('Joker sayısına göre.','By remaining jokers.')}</span>`:how=='zar'?`<br><span class="d20-how">${tr(`Beraberlik zarı: ${hx[v]}–${hx[1-v]}`,`Tiebreaker dice: ${hx[v]}–${hx[1-v]}`)}</span>`:'';
      const rollerTxt=isEn()?(L==v?'You roll the Death Dice.':'Opponent rolls the Death Dice.'):`Ölüm zarını ${L==v?'sen atıyorsun.':'rakip atıyor.'}`;
      const blessingName=tr('Ölümün Takdiri','Death\'s Favor'),decreeName=tr('Ölüm Fermanı','Death Decree');
      return `${duelWinnerTxt}${howTxt}<br>${rollerTxt}<div class="d20-box" data-roll="${roll}" data-raw="${rr}" data-mod="${rawOv!=null?0:(hpB+execPen)}" data-dc="${th}" data-m="${L==v?1:0}" data-s="${surv?'ok':L==v?'death':'win'}">
      <div class="bg3-roll-card">
        <div class="bg3-card-border"></div>
        <i class="bg3-corner tl"></i><i class="bg3-corner tr"></i><i class="bg3-corner bl"></i><i class="bg3-corner br"></i>
        <div class="bg3-dc-arch">
          <span class="lbl">${tr('HEDEF','TARGET')}</span>
          <span class="val">${th}</span>
        </div>
        <div class="d20-stage">
          <div class="d20-glow"></div>
          <canvas id="d20cv" class="d20-canvas" width="280" height="280"></canvas>
        </div>
        ${(rawOv==null&&(hpB||execPen))?`<div class="d20-hp-mod">${hpB?`<span class="d20-mod-pill bg3-bonus-card pos" data-val="${hpB}"><span class="mod-ic">${HP_IC.m}</span><b>${blessingName}</b><i>+${hpB}</i></span>`:''}${execPen?`<span class="d20-mod-pill bg3-bonus-card neg" data-val="-2"><span class="mod-ic">${HP_IC.n}</span><b>${decreeName}</b><i>−2</i></span>`:''}</div>`:''}
        ${L==v?`<button id="rl" class="btn d20-btn">${tr('ÖLÜM ZARINI AT','ROLL DEATH DICE')}</button>`:`<button id="rl" class="btn d20-btn used" disabled aria-hidden="true">${tr('ÖLÜM ZARINI AT','ROLL DEATH DICE')}</button>`}
      </div>
    </div><div class="after"><div class="after-roll"><b>${tr('Zar Sonucu','Roll Result')}: ${roll}${(hpB||execPen)&&rawOv==null?` (${rr}${hpB?`+${hpB} ${blessingName}`:''}${execPen?`−2 ${decreeName}`:''})`:''}</b></div><div class="after-msg">`+(surv?(L==v?`${tr('Kurtuldun!','You survived!')}<span class="after-sub">${tr('Hayatta kaldın.','You live to fight on.')}</span>`:tr('Rakip hayatta kaldı.','Opponent survived.')):(`<b>${L==v?`${tr('Öldün.','You died.')}<span class="after-sub">${tr('Oyunu rakip kazandı.','Opponent won the game.')}</span>`:`${tr('Rakip öldü.','Opponent died.')}<span class="after-sub">${tr('Oyunu sen kazandın!','You won the game!')}</span>`}</b>`))+'</div></div>'};
    const openDeathModal=()=>{
      const full=v=>mk(v,roll,surv)+(!surv&&!rig&&!uRev?`<template class="end-tpl">${buildEndScreenHtml(S,v,L,roll,th)}</template>`:''),rig=MODE=='bot'&&avKey(S,1)==='u'&&L==1&&!surv&&!S.rigDone; // Bilinmeyen (İmkansız bot): oyun başına bir kez ölümden döner
      const uRev=(MODE==='host'?(L===0||L===1):L===0)&&avKey(S,L)==='u'&&!surv&&!(S.uRevived&&S.uRevived[L]);
      if(surv||rig||uRev){const n=S.bo+2;
        if(surv&&S.stats&&S.stats.d20Surv)S.stats.d20Surv[L]++;
        const lb=tr(`Düello ${n} ile devam et`,`Continue to Duel ${n}`),go=()=>{try{document.body.classList.remove('dead')}catch(e){}S.bo++;(S.mast=S.mast||[0,0])[L]=(S.mast[L]|0)+1;newBO3(S);deal(S);talk(L==0?'surv0':'surv1',2);R();next()};
        if(rig){S.rigDone=true;S.hpUsed[1]=true;impSave(mk(0,1,false,1),()=>M(mk(0,20,true,20),lb,go))}
        else if(uRev){S.uRevived=S.uRevived||[false,false];S.uRevived[L]=true;S.hpUsed[L]=true;impSave(mk(0,roll,false),()=>MM(v=>mk(v,20,true,20),lb,go),tr('Hiçlik seni geri çevirdi… Bir kez daha ölümden döndün!','The Void refused you… You have returned from death once more!'))}
        else MM(full,lb,go)}
      else{S.over=true;lrnGame(L==0);rematchReady=[false,false];rematchHeroes=[null,null];MM(full,tr('Yeniden oyna','Play Again'),()=>chooseHero(hid=>{if(MODE==='host'){MY_HERO=hid;rematchReady[0]=true;rematchHeroes[0]=hid;checkStartOnlineRematch()}else{MY_HERO=hid;start()}},()=>{$('#menu').hidden=false;setMusic('menu')}),null,true)}
    };
    if(how=='zar'){
      const tieFn=v=>{
        const vi=v===2?0:v,w=L===vi?1:0;
        const myLbl=v===2?tr('1. Oyuncu','Player 1'):tr('Senin Zarların','Your Dice');
        const opLbl=v===2?tr('2. Oyuncu','Player 2'):tr('Rakibin Zarları','Opponent\'s Dice');
        const resTxt=v===2?(w===0?tr('1. Oyuncu düelloyu kazandı!','Player 1 won the duel!'):tr('2. Oyuncu düelloyu kazandı!','Player 2 won the duel!')):(w===0?tr('Düelloyu sen kazandın!<br>Rakip Ölüm Zarı atacak.','You won the duel!<br>Opponent will roll the Death Dice.'):tr('Düelloyu rakip kazandı!<br>Ölüm Zarını sen atacaksın.','Opponent won the duel!<br>You will roll the Death Dice.'));
        return `<h3>${tr('Düello Berabere!','Duel Tied!')}</h3><p class="tie-sub">${tr('Puanlar ve kalan jokerler eşit.<br>Yüksek atan düelloyu kazanır!','Points and remaining jokers are tied.<br>Higher roll wins!')}</p><div class="tie-box" data-d0a="${hd[vi][0]}" data-d0b="${hd[vi][1]}" data-d1a="${hd[1-vi][0]}" data-d1b="${hd[1-vi][1]}" data-win="${w}"><div class="tie-sides"><div class="tie-side me"><span class="tie-lbl">${myLbl}</span><div id="tie-d0" class="dice tie-dice">${die(1)}${die(6)}</div><b id="tie-s0" class="tie-sum">?</b></div><div class="tie-vs">VS</div><div class="tie-side opp"><span class="tie-lbl">${opLbl}</span><div id="tie-d1" class="dice tie-dice">${die(6)}${die(1)}</div><b id="tie-s1" class="tie-sum">?</b></div></div><button id="tie-rl" class="btn d20-btn">${tr('ZAR AT','ROLL DICE')}</button><div class="tie-after"><b>${hx[vi]} – ${hx[1-vi]}</b><br>${resTxt}</div></div>`;
      };
      MM(tieFn,tr('Ölüm Zarına Geç','Proceed to Death Dice'),openDeathModal);
    }else{
      openDeathModal();
    }
  }
}
function cutscene(txt,done){ // BİLİNMEYEN: ikonu ve konuşma balonu
  lock=true;const el=document.createElement('div');el.id='cs';
  el.innerHTML=`<div class="bub"><span></span></div><img src="${avSrc('u')}" alt="">`;document.body.appendChild(el);
  try{snd('stamp');vib([200,80,400])}catch(e){}
  const sp=el.querySelector('span');let i=0,end=false,tm=null;
  const out=()=>{if(end)return;end=true;clearInterval(tm);el.remove();done()};
  setTimeout(()=>{tm=setInterval(()=>{sp.textContent=txt.slice(0,++i);if(i>=txt.length){clearInterval(tm);setTimeout(out,2800)}},48)},500);
  el.onclick=()=>{if(i<txt.length){i=txt.length;clearInterval(tm);sp.textContent=txt;setTimeout(out,2200)}else out()};
}
function impSave(html,cont,msg){ // BİLİNMEYEN ölecekken: zar düşer, sahne girer, zar yeniden atılır (Nat 20)
  if(!msg)msg=tr('Bu kadar kolay olacağını mı sandın? Bu oyunun yaratıcısı benim.','Did you think it would be that easy? I am the creator of this game.');
  M(html,'.',()=>{});$('#mb').classList.add('rig');
  const d=document.querySelector('#mb .d20-box');let n=0;
  const w=setInterval(()=>{if(!d||!d.isConnected||++n>600){clearInterval(w);return}
    if(d.classList.contains('finished')){clearInterval(w);setTimeout(()=>cutscene(msg,()=>{$('#mb').classList.remove('rig');cont()}),1000)}},120);
}
let entering=false;
function veil(ms=1900){
  const v=document.createElement('div');
  v.className='veil';
  v.style.animationDuration=ms+'ms';
  v.innerHTML=`<img alt="" src="limbi_favicon.png?v=limbi4" style="animation-duration:${ms}ms"><b>limbigames</b>`;
  document.body.appendChild(v);
  setTimeout(()=>v.remove(),ms+120);
}
function enter(fn){
  if(entering)return;
  entering=true;
  const dur=1900;
  veil(dur);
  setMusic('game');
  setTimeout(()=>{
    $('#menu').hidden=true;
    fn();
    const mn=document.querySelector('main');
    if(mn){
      mn.classList.remove('arena-enter');
      requestAnimationFrame(()=>{
        mn.classList.add('arena-enter');
        setTimeout(()=>mn.classList.remove('arena-enter'),1050);
      });
    }
  },540);
  setTimeout(()=>{entering=false},dur-220);
}
let MY_HERO='c',OPP_HERO='n';
const HEROES_TR=[
  {id:'c',name:'Lanetli Tüccar',hpName:'Zamanın İadesi',desc:'Kullanıldığında masadaki tüm sayı kartları desteye geri karıştırılır. Kullanılmış Joker kartları yakılır ve yeni bir sayı kartı destesi dağıtılır. 4 tur galibiyet elde ettiğinde aktifleşir.'},
  {id:'p',name:'Veba Doktoru',hpName:'Vebalı Takas',desc:'Elindeki 1 Joker kartını yakarak desteden rastgele 2 yeni Joker kartı çek.'},
  {id:'n',name:'Kara Şövalye',passive:true,hpName:'Ölüm Fermanı',desc:'Rakibinin attığı her Ölüm Zarı sonucundan 2 çıkar.'},
  {id:'a',name:'Solmuş Kraliçe',hpName:'Yitik Yazgı',desc:'Destenin en üstündeki 2 kartı gizlice incele. Dilersen bu kartların yerlerini değiştir.'},
  {id:'s',name:'Büyücü',passive:true,hpName:'Gölge Hırsızı',desc:'Her düelloya 4. olarak Hırsız Jokeriyle başla.'},
  {id:'e',name:'Buz Devi',passive:true,hpName:'Kadim Direnç',desc:'Kaybettiğin her turda %18 ihtimalle gelen hasarı tamamen savuşturur ve turu beraberliğe dönüştürür.'},
  {id:'m',name:'Ölümün Efendisi',passive:true,hpName:'Ölümün Takdiri',desc:'Attığın her Ölüm Zarı sonucuna +2 bonus kazan.'},
  {id:'w',name:'Cadı',hpName:'Kuzgunun Kehaneti',desc:'Rakibinin kapalı sayı kartını gizlice incele.'},
  {id:'l',name:'Kurt Adam',hpName:'Kanlı Dolunay',desc:'Her iki oyuncunun da masadaki rastgele 1 sayı kartını imha et.'},
  {id:'v',name:'Vampir',passive:true,hpName:'Kanla Mühürlenen Kader',desc:'İlk beraberlikte turu kazanmış sayılırsın. Bu güç oyun boyunca yalnızca 1 kez kullanılabilir.'},
  {id:'u',name:'Bilinmeyen',passive:true,bossOnly:true,hpName:'Hiçlikten Dönüş',desc:'Ölüm zarında hedef sayının altında atarsan, ölümden bir kereliğine geri dönersin.'}
];
const HEROES_EN=[
  {id:'c',name:'Cursed Merchant',hpName:'Rewind of Time',desc:'Shuffles all number cards on the table back into the deck, burns used Jokers, and deals a fresh number hand. Unlocks after winning 4 rounds.'},
  {id:'p',name:'Plague Doctor',hpName:'Plague Trade',desc:'Burn 1 Joker card from your hand to draw 2 random new Joker cards from the deck.'},
  {id:'n',name:'Dark Knight',passive:true,hpName:'Death Decree',desc:'Subtract 2 from every Death Dice roll made by your opponent.'},
  {id:'a',name:'Withered Queen',hpName:'Lost Fate',desc:'Secretly inspect the top 2 cards of the deck. Swap their order if you wish.'},
  {id:'s',name:'Sorcerer',passive:true,hpName:'Shadow Thief',desc:'Start every duel with the Thief Joker as your 4th card.'},
  {id:'e',name:'Frost Giant',passive:true,hpName:'Ancient Resilience',desc:'Each time you lose a round, you have an 18% chance to deflect the damage and turn the round into a tie.'},
  {id:'m',name:'Lord of Death',passive:true,hpName:'Death\'s Favor',desc:'Gain a +2 bonus to every Death Dice roll you make.'},
  {id:'w',name:'Witch',hpName:'Raven\'s Prophecy',desc:'Secretly inspect your opponent\'s hidden number card.'},
  {id:'l',name:'Werewolf',hpName:'Blood Full Moon',desc:'Destroy 1 random number card on the table from both players.'},
  {id:'v',name:'Vampire',passive:true,hpName:'Blood-Sealed Fate',desc:'On your first tied round, you win the round instead. Triggers once per match.'},
  {id:'u',name:'The Unknown',passive:true,bossOnly:true,hpName:'Return from the Void',desc:'If you roll below the target on the Death Dice, return from death once per match.'}
];
let HEROES=[...HEROES_TR];
let HERO_MAP=Object.fromEntries(HEROES.map(h=>[h.id,h]));
const HP_IC={
  c:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10M7 21h10M8 3c0 4 4 6 4 9s-4 5-4 9M16 3c0 4-4 6-4 9s4 5 4 9"/><path d="M4.5 9.5a8 8 0 0112-4.8M4.5 6v3.5H8" stroke-width="1.6"/></svg>',
  p:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="11" rx="1.5"/><rect x="13" y="9" width="8" height="11" rx="1.5"/><path d="M14 4l3-1.5L15.5 6M10 20l-3 1.5L8.5 18"/><path d="M7 8v3m-1.5-1.5h3"/></svg>',
  k:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18l-2-10-4.5 4L12 5l-2.5 7L5 8l-2 10z"/></svg>',
  n:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5v15M8.5 13.5h7M9.5 20.5h5M12 2.5l-2.5 3.5h5L12 2.5z"/></svg>',
  a:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9.5"/><path d="M12 16c-2.6 0-4.2-1.4-4.2-3.3 1.8 0 3.2.8 4.2 2.1"/><path d="M12 11.5c-2.4-.9-3.6-3-2.6-5.3.8-1.9 3.6-2.4 5.2-.9 1.6 1.5 1.1 4.2-1 5.4"/><path d="M13.6 9.5c2 .6 3 2.3 2.2 4-.6 1.3-2 1.8-3.8 1.3"/><path d="M9.5 5.2c1.2 1.1 3.1 1.2 4.3.1"/></svg>',
  s:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11c2.5-3 6-3 9-1 3-2 6.5-2 9 1-1.5 4-4.5 5-9 3-4.5 2-7.5 1-9-3z"/><circle cx="8" cy="11.5" r="1.2" fill="currentColor"/><circle cx="16" cy="11.5" r="1.2" fill="currentColor"/><path d="M9 17.5h6l-1 3h-4z"/></svg>',
  e:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.5 6.3l15 11.4M19.5 6.3l-15 11.4"/><path d="M9.5 4.2L12 6.5l2.5-2.3M9.5 19.8L12 17.5l2.5 2.3"/></svg>',
  m:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 20.5 7 20.5 17 12 22 3.5 17 3.5 7"/><polygon points="12 6.5 17 15.5 7 15.5"/><path d="M12 2v4.5M3.5 7l3.5 8.5M20.5 7l-3.5 8.5"/></svg>',
  w:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18c1-7 4.5-12 9.5-13 2 0 4.5 1 6.5 3l-3 1.5c1 2.5.5 5.5-2 8.5H4z"/><circle cx="13.5" cy="9.5" r="1.3" fill="currentColor"/><path d="M2 12s3-4 7.5-4"/></svg>',
  l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M7.5 6.5l3 11M12 5.5l1 13M16.5 6.5l-3 11"/></svg>',
  v:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14M7 4l2 8 2-8M13 4l2 8 2-8"/><path d="M12 13.5s-3.5 3.6-3.5 5.6a3.5 3.5 0 007 0c0-2-3.5-5.6-3.5-5.6z"/></svg>',
  u:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>'
};
function start(){hiPreload();setMusic('game');try{document.body.classList.remove('dead')}catch(e){}LAST_MATCH_HIST=[];rematchReady=[false,false];rematchHeroes=[null,null];deathContReady=[false,false];deathContGo=null;const botPool=HEROES.filter(h=>(!h.bossOnly||DIFF==='imp')&&!(MY_HERO==='v'&&h.id==='v')).map(h=>h.id),oppH=MODE=='bot'?botPool[Math.floor(Math.random()*botPool.length)]:(OPP_HERO||'n');G={u:0,bo:0,log:[],over:false,used:[],av:[MY_HERO,oppH],hero:[MY_HERO,oppH],uRevived:[false,false],vampUsed:[false,false],cWins:[0,0],vampWinSide:-1,mast:[0,0]};prevAv[0]=prevAv[1]=undefined;prevHpAnim=[false,false];newBO3(G);deal(G);if(learning())armPick();sayT='';sayAt=0;botGen++;thinkOn=false;talk('hello',2);R();next()}

/* ---------- ARAYÜZ ---------- */
const cand=()=>P?opts(G,0,P.ks[P.pk.length]):[];
let prevT=false,lastLk='',flipId=null,lastTot=[0,0],lastBust=false,prevSeal='',sayT='',prevHpAnim=[false,false];
const NAMES_TR={c:'Lanetli Tüccar',p:'Veba Doktoru',n:'Kara Şövalye',a:'Solmuş Kraliçe',s:'Büyücü',e:'Buz Devi',m:'Ölümün Efendisi',w:'Cadı',l:'Kurt Adam',v:'Vampir',u:'BİLİNMEYEN'};
const NAMES_EN={c:'Cursed Merchant',p:'Plague Doctor',n:'Dark Knight',a:'Withered Queen',s:'Sorcerer',e:'Frost Giant',m:'Lord of Death',w:'Witch',l:'Werewolf',v:'Vampire',u:'THE UNKNOWN'};
let NAMES={...NAMES_TR};
const avKey=(S,p)=>{if(p===0)return (S.hero&&S.hero[0])||MY_HERO||'c';if(MODE=='bot')return (S.hero&&S.hero[1])||'c';return (S.hero&&S.hero[p])||(S.av&&S.av[p])||'c'};
const HD_PORTRAITS={
  c:'corrupted_merchant.jpg?v=20261116_t21',
  p:'plague_doctor.jpg?v=20261116_t21',
  n:'dark_knight.jpg?v=20261116_t78',
  a:'withered_queen.jpg?v=20261116_t77',
  s:'crimson_oracle.jpg?v=20261116_t21',
  e:'frost_giant.jpg?v=20261116_t75',
  m:'cursed_king.jpg?v=20261116_t78',
  w:'necromancer.jpg?v=20261116_t21',
  l:'werewolf.jpg?v=20261116_t21',
  v:'vampire.jpg?v=20261116_t39',
  u:'unknown.jpg?v=20261116_t84'
};
const avSrc=k=>HD_PORTRAITS[k]||(k?AV[k]:IMG.bn),oppName=()=>NAMES[avKey(G,1)]||tr('Rakip','Opponent');
const prevAv=[undefined,undefined],morphT=[0,0];
const peek=new Set(),seen=new Set(),seenE=new Set(),DN={easy:1,med:2,hard:3,imp:5},DES=new Set([13,14,17]);
const IC={
  dif:'<svg viewBox="0 0 24 24" class="ic dif"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" fill="currentColor"/><path d="M12 7l4.6 8H7.4z" fill="none" stroke="#091217" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  skull:'<svg viewBox="0 0 24 24" class="ic"><path d="M12 2C7 2 4 5.5 4 10c0 3 1.5 4.5 3 5.5V20h10v-4.5c1.5-1 3-2.5 3-5.5 0-4.5-3-8-8-8z" fill="currentColor"/><circle cx="9" cy="11" r="2" fill="#091217"/><circle cx="15" cy="11" r="2" fill="#091217"/><path d="M10 20v-3m4 3v-3" stroke="#091217" stroke-width="1.5"/></svg>',
  gear:'<svg viewBox="0 0 24 24" class="ic"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="currentColor"/><circle cx="8" cy="17" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>'
};
/* Bot konuşmaları: karaktere (zorluğa) ve duruma göre.
   {t}=hedef, {o}=oyuncunun açık toplamı, {b}=botun açık toplamı, {k}=oyuncunun hedefe uzaklığı, {j}=oyuncunun joker sayısı */
const SAYS={
easy:{hello:['Hoş geldin dostum, zar atalım mı?','Pazarlık yok, sadece zarlar var.','Kartlarım temiz, vicdanım değil.','Gel, otur. Tezgâh açık, kesem boş.','Mal bende, şans sende. Hadi bakalım.','Bu pazarda herkes bir şey satar, ben de kartları.'],
 win:['Kazanç kazançtır, dostum.','Bu tur benim, kusura bakma.','Kesem doldu, keyfim yerinde.','Şans bana güldü, ne yapayım?','Tezgâha bir tur daha yazdım.','Al sana ders, bedava. Tur ise benim.'],
 lose:['Haa, bu tur senindi.','Bir tur sana olsun, cömertim.','Kazanan sensin, şimdilik.','Eyvah, kesem hafifledi.','Helal olsun, bu sefer zarar bende.','Zarar ettim ama müşteriyi kaybetmedim.'],
 tie:['Berabere mi? Pazarlık gibi.','İkimiz de aynı yerdeyiz.','Kimse kazanamadı, tuhaf.','Yarı yarıya, adil ticaret.','Kâr yok zarar yok, boşuna terledim.'],
 bust:['Aman, fazla çekmişim!','Tamah beni yaktı...','Bir kart fazla, bir ruh eksik.','Hesabı şaşırdım, pardon.','Kantar ayarım bozukmuş!'],
 joker:['Küçük bir hile, kimse görmedi.','Satıcının cebinde hep bir şey vardır.','Bunu sana indirimle sunuyorum.','Joker mi? Tabii ki var.','Tezgâhın altından çıktı, ben de şaşırdım.'],
 jt:['Hedefi biraz oynattım, fiyat değişti.','Rakamlar da pazarlıkla düşer, dostum.','Yeni fiyat listesi: hedef değişti!','Kantarın ayarıyla oynadım, kusura bakma.'],
 jd:['Kart yoksa hesap da yok.','Şu kartı çöpe attım, ziyan olmasın.','Mal bozulmuştu, imha ettim.','Temizlik zamanı, tezgâh dağınıktı.'],
 js:['Mal değişimi, ticaretin kuralı.','Şunu bana verir misin? Teşekkürler.','Tezgâhlar karıştı, kimin ne olduğu belli değil.','Takas dedim, soygun demedim.'],
 jb:['Şimdi sakin ol, bir süre dükkân kapalı.','Bu tezgâhta bazı şeyler yasak.','Kapıyı kapattım, içeri girme.'],
 jn:['Jokerin geçersiz, fiş kesilmemiş.','Senin jokerin bozuktu, iade ettim.','Etkisiz dedim, itiraz kabul etmem.'],
 react:['Bak sen, cebinde de varmış.','Hımm, bunu beklemiyordum.','Joker mi? Çok pahalı.','Ooo, sen de mi tezgâhın altına baktın?','Pazarlıkta hile yapılmaz, ama tamam.'],
 draw:['Bir tane daha, fiyatı sonra.','Hadi bakalım, kart gel.','Şans getir, küçük kart.','Bir dilim daha, doymadım.'],
 pass:['Ben buradayım, sıra sende.','Acele etmem, sen düşün.','Bu kadarı bana yeter.','Elim doldu, sıra sende.','Çay koyayım, sen düşün.'],
 think:['Hımm, hesap yapıyorum…','Bir saniye, abaküsü getireyim.','Düşünüyorum, acele yok.','Hesap kitap, hesap kitap…'],
 pbust:['Açıkta {o} var, hedef {t}. Aman dikkat!','Hedefi aştın dostum!','Açgözlülük pahalıya patlar.','Hedef {t}, sende {o}. Yandın galiba!','Tamah seni de yakmış, dostum.'],
 obust:['Açığım {b} oldu, hedef {t}. Tüh!','Hay aksi, hedefi geçtim.','Bu kart yanlış tezgâha düştü.','Şimdi bir jokere ihtiyacım var.'],
 pexact:['Açıkta tam {t}! Kapalı kartın var, dikkat et.','Hedefe tam oturmuşsun, kapalı kart işleri bozar.','Tam {t}, ama kapalı kart henüz konuşmadı.'],
 surv0:['Zardan kurtuldun, tebrikler.','Şanslısın, bir sonrakinde de mi?','Yırttın, helal olsun.'],
 surv1:['Zarlardan sıyrıldım, şükür!','Ölüm bu sefer beni kaçırdı.','Kıl payı, ter döktüm!']},
med:{hello:['Ruhunun fiyatını biliyorum.','Oyna ve öde.','Yine bir müşteri, ne güzel.','Sözleşmeyi okumadan imzaladın, değil mi?','Hoş geldin. Hesap hep benden yana.','Cüzdanını bırak, ruhunu da. İkisi de lazım olacak.'],
 win:['Ruhundan bir parça benim.','Cebim doluyor, sen eksiliyorsun.','Her tur biraz daha borçlusun.','Bu tur benim, faiziyle.','Makbuzunu kestim, imza gerekmez.','Kâr marjım seni aşıyor.'],
 lose:['Kazandın, borcun silinmedi.','Bunun bedelini ödeyeceksin.','Şanslı bir tur, o kadar.','Gülümse, çok sürmez.','Bir tur ver, faizini katlarım.','Ucuz kurtuldun, fatura sonra gelir.'],
 tie:['Berabere. Sinirlerim bozuldu.','Eşitlik... can sıkıcı.','Kimse kazanmadı, kan kazandı.','Eşitlikten kâr çıkmaz, rahatsızım.','Boş tur, boşa giden zaman.'],
 bust:['Hata benim, ruhum yanıyor!','Fazla çektim... lanet olsun.','Açgözlülüğümün bedeli bu.','Kendi tuzağıma düştüm, ayıp.','Aşırı kâr peşinde yandım.'],
 joker:['Hile değil, ticaret.','Kuralları ben yazıyorum.','Cebimde daha çok var.','Bunun bedeli sana ait.','Hile mi? Ben buna "sözleşme maddesi" derim.','İnce yazıyı okumamışsın.'],
 jt:['Hedefi değiştirdim. Kuralları ben yazıyorum.','Yeni hedef, yeni fiyat. İtiraz yok.','Hedef benim işime gelecek yerde olmalı.','Sözleşmeyi güncelledim, haberin yoktu.'],
 jd:['Bir kart eksildi, bir borç arttı.','Kart yırtıldı. Zararı senden alırım.','İmha ettim. Delil kalmadı.','Şu kart artık kayıtlarda yok.'],
 js:['Kartlar el değiştirdi. Kâr bana.','Takas dedim, ama kazanç hep benden yana.','Cebinden çıktı, cebime girdi.','Bunu ödünç aldım. Geri vermem.'],
 jb:['Şimdi sus ve izle.','Bu tezgâhta yasak ilan ettim.','Eller bağlı, ağız açık. Bekle.'],
 jn:['Jokerin iptal. Makbuz kesildi.','Senin jokerini çöpe attım, teşekkür etme.','Etkisiz. Faizi de ben alıyorum.'],
 react:['Cesur hamle, aptalca ama cesur.','Joker mi? Beni güldürdün.','Etkilendim, neredeyse.','Bu jokerin faturası bana mı kesilecek?','Cebini karıştırmışsın, görüyorum.','Borç yerine joker mi ödüyorsun?'],
 draw:['Bir kart daha, bir ruh daha.','Gel bana, küçük kart.','Kader kartı çekiyorum.','Her kart bir yatırım.','Kâr artıyor, kart artıyor.'],
 pass:['Sıra sende, çok düşünme.','Bekliyorum, sabrım var.','Karar senin, sonuç benim.','Acele etme, faiz işliyor.','Ben tamam. Sen yanabilirsin.'],
 think:['Hesap yapıyorum, faiziyle.','Bir saniye, defteri açayım.','Fiyatını biçiyorum…','Kartlarına bakıyorum. Zayıf.','Bu hamleyi pahalıya satacağım.'],
 pbust:['Açıkta {o}, hedef {t}. Battın, borçlusun.','Hedefi aştın, zavallı.','Çok çektin, çok yandın.','{o} mı? Hedef {t}. Hesabı bilmiyorsun.','Ne açgözlü! Hedef {t}, sende {o}.'],
 obust:['Açıkta {b}, hedef {t}. Küçük bir aksilik, o kadar.','Bu kart yanlış geldi, faturayı keserim.','Hedefi geçtim ama pes etmem.','Hata. Kimseye söyleme.'],
 pexact:['Açıkta tam {t}. Kapalı kartın seni yakar.','Tam hedefe oturmuşsun. Bir de kapalı kart var, değil mi?','{t} yapmışsın, ne kadar zarif. Ne kadar kısa sürecek.'],
 surv0:['Kurtuldun... bu sefer.','Zar sana güldü, bana değil.','Borcun ertelendi, silinmedi.'],
 surv1:['Ölüm beni geri çevirdi.','Zar benden yana, ruh benden yana.','Bu ölüm de bana kâr yazdı.']},
hard:{hello:['Zarlar atıldı. Kader mühürlendi.','Ölüm masaya oturdu.','Son nefesini bana ver.','Seni uzun zamandır bekliyordum.','Oyun başlıyor. Çıkış yok.','Hoş geldin. Kapı arkandan kapandı.'],
 win:['Ruhun benimdir.','Ölüm sabırlıdır.','Zarlar bana gülüyor.','Bir adım daha yaklaştın.','Kayıt defterine bir isim daha yazıldı.','Her kayıp, mezara bir kürek toprak.'],
 lose:['Bu kez şanslıydın.','Sıra yine bende.','Gülümse, fazla sürmez.','Ölümü kandıramazsın.','Bir tur ödünç verdim. Faizi canındır.','Kazandığını sanıyorsun. Güzel.'],
 tie:['Eşitlik... Ölüm eşitler.','Berabere. Sabrım tükenmedi.','Kimse kazanmadı. Henüz.','Terazi dengede. Ama kefenim hazır.','Ölüm kimseyi kayırmaz. Bu tur.'],
 bust:['İmkânsız... Hesap yanlıştı.','Ölüm de hata yapar.','Bu, planımın dışındaydı.','Bir kez... yalnızca bir kez.','Şanssızlık. Bunu unutmayacağım.'],
 joker:['Cesaretin takdire şayan.','Kartlarım seni izliyor.','Henüz bitmedi.','Ruhun titriyor.','Bu hamle kaderde yazılıydı.','Sen oynadığını sanıyorsun.'],
 jt:['Hedef, benim istediğim yerde duracak.','Ölçüyü değiştirdim. Artık kaçamazsın.','Kader eşiği yer değiştirdi.','Sınırı kaydırdım. Ayakların kayıyor.'],
 jd:['Bir kart toza döndü.','Bu kartın ömrü bitti.','Yok oldu. Tıpkı umutların gibi.','Küle çevirdim. Sıradaki sen olabilirsin.'],
 js:['Elindeki artık benim.','Kartların el değiştirdi. Kaderin de.','Aldım. Teşekkür etme.','Takas yok, tahsilat var.'],
 jb:['Sessizlik. Hamle hakkın kilitlendi.','Elini kolunu bağladım.','Şimdi sadece izleyeceksin.'],
 jn:['Jokerin ölü doğdu.','Hamleni sildim.','Etkisiz. Tıpkı sen gibi.'],
 react:['Bu kozunu bekliyordum.','Hamleni okudum.','Bir joker seni kurtarmaz.','Son çaren bu muydu?','Bunu hesaba kattım. Hep katarım.','Jokerlerin tükeniyor. Sabrım değil.'],
 draw:['Kader kartı bana geliyor.','Çekiyorum. Sen titriyorsun.','Her kart bir adım.','Desteden fısıltılar geliyor.','Kartı ben seçmem, kart beni seçer.'],
 pass:['Sıra sende. Geç kalma.','Hamleni yap. Bekliyorum.','Ben hazırım. Ya sen?','Bitirdim. Şimdi sen yan.','Sessizlik. Sıra sende.'],
 think:['Açık toplamın {o}. Hedef {t}. Olasılıklar dönüyor.','Kapalı kartın... tahmin ediyorum.','Destede kalan kartlar kafamda.','Elinde {j} joker var. Biliyorum.','Her ihtimali yakıyorum.','Hamleni değil, korkunu okuyorum.'],
 pbust:['Açıkta {o}. Hedef {t}. Hesap kesildi.','Battın. Ölüm bunu sever.','Çok açgözlüydün.','Hedefi aştın. Sonun geldi.','Saymayı bilmiyorsun. Ya da ölmeyi seviyorsun.'],
 obust:['Açığım {b}, hedef {t}. Hesaplı bir risk.','Hedefi geçtim. Plan hâlâ işliyor.','Ölüm bile bir kez sendeler.','Bir hata. Yalnızca bir.'],
 pexact:['{t}. Mükemmel. Kapalı kartın sonu getirecek.','Tam hedefe oturdun. Ne kadar kırılgan.','Açıkta {t}. Bir kart daha ve çökersin.'],
 surv0:['Zardan kaçtın. Ölüm unutmaz.','Bir sonrakinde kaçamazsın.','Bu kez kaçtın. Gölgem seninle.'],
 surv1:['Bana zar atmak boşuna.','Ölüm ölmez.','Beni ölüm bile reddetti.']}
};
/* BİLİNMEYEN'in dili: Kara Dil (Black Speech) sertliği + Elfçe (Sindarin/Quenya) ezgisi. Tolkien'in kayıtlı kelimesi azdır, kalanı aynı seslerle uydurulmuştur.
   Kara Dil kökleri: ash=bir, nazg=halka (hedef), durb-=egemen olmak/kazanmak, gimb-=bulmak/görmek, thrak-=getirmek/çekmek/almak, krimp-=bağlamak/engellemek,
     agh=ve, burzum=karanlık/ölüm, ghâsh-=yakmak, gûl=hayalet, snaga=köle/zayıf.
   Elfçe kökleri: ni=ben, le=sen, o=-in (aitlik), na=için, ú=değil, mellon=dost (alaycı), mor=kara, elen=yıldız, naur=ateş, dagor=savaş/oyun, firn-=ölmek,
     umbar=kader, fëa=ruh, ant-=vermek.
   Uydurma: dhaur=zar, karth=kart, dûr=hamle, gûr=el, thêl=zaman, kest-=saymak, ushk-=kaybetmek, thar-=beklemek, Ilumaur=yaratıcı.
   Ekler: -a şimdiki, -ë geçmiş, -on gelecek, -ûk emir. Sıra: özne fiil nesne. */
SAYS.imp={
 hello:['Ni gimb-a le, mellon. Dagor o burzum.','Le firn-on. Ni thar-a.','Ni Ilumaur o dagor agh o fëa.','Dhaur agh karth agh fëa o le.','Elen ú na le. Mor na ni.','Ash nazg. Ash umbar. Ash ni.','Burzum thar-a le, mellon.','Ni gimb-a. Le gimb-a ú.'],
 win:['Ni durb-ë. Le ushk-ë.','Fëa o le snaga.','Mor durb-a. Elen firn-a.','Umbar o ni. Ú umbar o le.','Le ushk-ë, mellon. Burzum gimb-a le.','Nazg krimp-ë le.','Ni kest-ë. Le firn-on.','Naur o ni ghâsh-a fëa o le.'],
 lose:['Le durb-ë. Thêl snaga.','Ni gimb-a. Ni thar-a.','Ú burzum o ni.','Umbar ú thar-a.','Elen o le ghâsh-a.','Dagor ú firn-ë. Ni thar-a.','Ú mellon, le. Ni gimb-ë.'],
 tie:['Ú durb, ú ushk. Thar-a.','Umbar thar-a.','Dhaur ú ant-ë.','Ash nazg. Ú durb-ë.','Burzum thar-a agh ni thar-a.','Mor ú firn-ë.'],
 bust:['Ú! Karth ushk-ë ni.','Ni ú kest-ë.','Dagor o ni. Ni ú ushk-on.','Ghâsh! Karth ghâsh-ë.','Nazg ú krimp-ë ni.','Mor ú firn-a.'],
 joker:['Karth o ni gimb-a le.','Dûr o ni. Umbar o ni.','Gûr o ni thrak-a.','Krimp-ûk! Ni durb-on.','Mor agh karth.','Ni thrak-a umbar.','Elen ú gimb-a dûr o ni.'],
 jt:['Nazg ú thar-a.','Ni nazg ant-a.','Nazg o le firn-a.','Ash nazg na ni.','Nazg thrak-ë. Nazg krimp-ë.','Umbar nazg ant-a.'],
 jd:['Karth o le ghâsh-a.','Ghâsh-ë. Le gimb-a ú.','Karth firn-ë.','Naur agh burzum.','Gûl karth o le.','Karth o le. Karth ú.'],
 js:['Gûr o ni thrak-ë.','Karth o le. Karth o ni.','Ú ant-a. Thrak-a.','Mor thrak-a elen.','Le ant-ë ú. Ni thrak-ë.','Krimp-ë karth o le.'],
 jb:['Ú dûr. Thar-ûk.','Le thar-ûk.','Dûr o le ú.','Krimp-ë dûr o le.','Thar-ûk, mellon.','Burzum krimp-a le.'],
 jn:['Karth o le ú.','Ghâsh-ë dûr o le.','Ú.','Krimp-ë karth o le.','Karth o le firn-ë.','Ú ú ú.'],
 react:['Ni gimb-ë. Ni gimb-ë.','Dûr o le. Ni kest-ë.','Ú umbar o le.','Ni gimb-a agh le gimb-a ú.','Mellon... mellon...','Elen firn-a.'],
 draw:['Karth thrak-a.','Ni kest-a.','Umbar karth ant-a.','Thrak-a. Kest-a. Durb-on.','Dhaur ant-a ni.','Mor karth gimb-a.'],
 pass:['Ni thar-a.','Thêl o ni.','Ú dûr. Ni durb-on.','Dagor thar-a agh ni thar-a.','Burzum thar-a.','Ash nazg. Ni thar-a.'],
 think:['Ni kest-a... kest-a...','Dhaur agh karth. Ni gimb-a.','Gûr o le gimb-a.','Mor gimb-a. Mor kest-a.','Elen ghâsh-a. Ni thar-a.','Umbar kest-a. Burzum thar-a.','Ni gimb-a fëa o le.','Ash... ash... nazg...'],
 pbust:['Le firn-ë.','Le nazg ú kest-ë.','Burzum thar-a le.','Nazg krimp-ë le.','Ú mellon. Le ushk-ë.','Fëa o le ghâsh-a.'],
 obust:['Karth ú ant-ë.','Ú. Ni gimb-a.','Umbar ú thar-ë.','Dhaur ú durb-ë.','Ghâsh. Ni thar-a.'],
 pexact:['Nazg. Gûr o le ghâsh-on.','Ash nazg. Karth ú na le.','Le gimb-a nazg. Ni gimb-a karth.','Nazg o le. Burzum o ni.','Mellon, nazg krimp-on le.','Naur thar-a gûr o le.'],
 surv0:['Le firn-ë ú. Burzum thar-a.','Dhaur ant-ë le thêl.','Thêl o le snaga.','Mellon, umbar ú durb-ë.','Burzum ú ghâsh-ë le. Thar-a.','Le thar-a. Ni thar-a.'],
 surv1:['Ni firn-ë ú.','Burzum ú gimb-a ni.','Ni Ilumaur.','Ash ni. Ash umbar.','Dagor ú firn-ë ni.','Mor ú firn-a.']
};
const SAYS_EN={
easy:{hello:['Welcome friend, care to roll the dice?','No bargaining, only dice here.','My cards are clean, my conscience is not.','Come sit. The stall is open, my pouch is empty.','I have the goods, you have the luck. Let\'s see.','Everyone sells something in this market; I sell cards.'],
 win:['Profit is profit, my friend.','This round is mine, no hard feelings.','My pouch is full, my mood is bright.','Fortune smiled on me, what can I do?','Another round tallied to the stall.','Free lesson for you. The round is mine.'],
 lose:['Ah, that round was yours.','Take a round on me, I\'m feeling generous.','You\'re the winner, for now.','Alas, my pouch feels lighter.','Well played, the loss is mine this time.','I lost coin, but kept the customer.'],
 tie:['A tie? Just like haggling.','We stand on equal ground.','Nobody won, how strange.','Half and half, fair trade.','No profit, no loss—sweated for nothing.'],
 bust:['Oops, drew one too many!','Greed burned me...','One card too many, one soul short.','Lost count, my bad.','My scales were off!'],
 joker:['A little trick, nobody saw a thing.','A merchant always has something up his sleeve.','Offering this to you at a discount.','A Joker? Of course I have one.','Found it under the counter, surprised me too.'],
 jt:['Shifted the target a bit, price changed.','Numbers drop with bargaining too, friend.','New price list: the target moved!','Tweaked the scales, pardon me.'],
 jd:['No card, no tab.','Tossed that card in the bin, no waste.','Goods were spoiled, had to destroy them.','Time to tidy up, the stall was messy.'],
 js:['Bartering goods, rule of the trade.','Mind handing that over? Much obliged.','Stalls got mixed up, who knows what\'s whose.','I said swap, not robbery.'],
 jb:['Easy now, shop\'s closed for a moment.','Some things are forbidden at this stall.','Closed the door, don\'t come in.'],
 jn:['Your Joker\'s void, no receipt issued.','Your Joker was defective, returned it.','Negated, no refunds accepted.'],
 react:['Look at that, you had one in your pocket too.','Hmm, didn\'t see that coming.','A Joker? Very pricey.','Ooh, peeking under the counter too?','No cheating in a bargain, but fine.'],
 draw:['One more, we\'ll talk price later.','Come on now, card.','Bring me luck, little card.','One more slice, still hungry.'],
 pass:['I\'m right here, your turn.','No rush, take your time.','That\'s plenty for me.','My hand\'s full, over to you.','I\'ll brew some tea while you think.'],
 think:['Hmm, doing the math…','One second, let me grab the abacus.','Thinking, no rush.','Counting coins, counting cards…'],
 pbust:['You show {o}, target is {t}. Careful now!','You went over the target, friend!','Greed costs dearly.','Target is {t}, you have {o}. Looks like you busted!','Greed burned you too, friend.'],
 obust:['My open cards hit {b}, target is {t}. Drat!','Blast it, went over the target.','That card fell on the wrong stall.','Now I really need a Joker.'],
 pexact:['Showing {t} on the dot! Mind your hidden card.','Sitting right on the target, that hidden card might ruin it.','Exactly {t}, but your hidden card hasn\'t spoken yet.'],
 surv0:['Dodged the die, congrats.','Lucky you—how about next time?','You scraped through, well done.'],
 surv1:['Slipped past the dice, thank goodness!','Death missed me this time.','By a hair\'s breadth, broke a sweat!']},
med:{hello:['I know the price of your soul.','Play and pay.','Another customer, how lovely.','You signed the contract without reading it, didn\'t you?','Welcome. The house always wins the tab.','Leave your purse, and your soul. You\'ll need both.'],
 win:['A piece of your soul is mine.','My pockets fill while you fade.','Every round puts you deeper in debt.','This round is mine, with interest.','Receipt issued, no signature needed.','My profit margin exceeds you.'],
 lose:['You won, your debt remains.','You will pay the price for this.','A lucky round, nothing more.','Smile, it won\'t last long.','Take one round, I\'ll double the interest.','You got off cheap, the bill comes later.'],
 tie:['A tie. How irritating.','A draw... how tedious.','Nobody won, only blood did.','No profit in a draw, I\'m displeased.','Empty round, wasted time.'],
 bust:['My mistake, my soul burns!','Drew too much... curse it.','The price of my own greed.','Fell into my own trap, shameful.','Burned chasing excessive profit.'],
 joker:['Not cheating, just business.','I write the rules.','Plenty more where that came from.','The cost is yours to bear.','Cheating? I call it a "contract clause".','You didn\'t read the fine print.'],
 jt:['Changed the target. I write the rules.','New target, new price. No appeals.','The target belongs where it suits me.','Updated the contract without telling you.'],
 jd:['One card less, one debt more.','Card torn. I\'ll bill you for the damages.','Destroyed. No evidence left.','That card is off the ledger now.'],
 js:['Cards changed hands. Profit is mine.','I said trade, but the gain is always mine.','Out of your pocket, into mine.','Borrowed this. Won\'t give it back.'],
 jb:['Now hush and watch.','Declared a ban at this table.','Hands tied, mouth shut. Wait.'],
 jn:['Your Joker is void. Receipt stamped.','Threw your Joker in the trash, don\'t thank me.','Negated. And I keep the interest.'],
 react:['Bold move—foolish, but bold.','A Joker? You amuse me.','I\'m impressed, almost.','Am I being billed for this Joker?','Rummaging through your pockets, I see.','Paying with Jokers instead of debt?'],
 draw:['One more card, one more soul.','Come to me, little card.','Drawing a card of fate.','Every card is an investment.','Profit rises, cards rise.'],
 pass:['Your turn, don\'t overthink it.','I\'m waiting, I have patience.','Your choice, my outcome.','Take your time, the interest is ticking.','I\'m done. You may burn.'],
 think:['Calculating, with interest.','One moment, opening the ledger.','Pricing your soul…','Looking at your cards. Weak.','I\'ll sell this move dearly.'],
 pbust:['Showing {o}, target {t}. Busted and in debt.','You passed the target, pitiful.','Drew too much, burned too much.','{o}? Target is {t}. You can\'t count.','How greedy! Target {t}, you have {o}.'],
 obust:['Showing {b}, target {t}. A minor setback, nothing more.','Wrong card arrived, I\'ll send the invoice.','Passed the target, but I never fold.','A mistake. Tell no one.'],
 pexact:['Showing {t} flat. Your hidden card will burn you.','Sitting right on the target. Still have a hidden card, don\'t you?','You hit {t}, how elegant. How brief it will be.'],
 surv0:['You survived... this time.','The die smiled at you, not me.','Your debt is postponed, not forgiven.'],
 surv1:['Death turned me away.','The die favors me, the soul favors me.','Even death wrote me a profit.']},
hard:{hello:['The dice are cast. Fate is sealed.','Death has taken a seat at the table.','Give me your final breath.','I have waited a long time for you.','The game begins. There is no exit.','Welcome. The door locked behind you.'],
 win:['Your soul is mine.','Death is patient.','The dice laugh in my favor.','You stepped closer to the abyss.','Another name written in the ledger.','Every loss is another shovel of earth on your grave.'],
 lose:['You were lucky this time.','My turn will come again.','Smile, it will not last.','You cannot deceive Death.','I lent you a round. The interest is your life.','You think you won. Good.'],
 tie:['Equilibrium... Death equalizes all.','A tie. My patience is inexhaustible.','No one won. Yet.','The scales are balanced. But my shroud is ready.','Death favors no one. This round.'],
 bust:['Impossible... The calculation was flawed.','Even Death errs once.','This was outside my design.','Once... and only once.','Misfortune. I will not forget this.'],
 joker:['Your courage is admirable.','My cards are watching you.','It is not over yet.','Your soul trembles.','This move was written in fate.','You merely think you are playing.'],
 jt:['The target stands where I command.','I altered the measure. There is no escape.','The threshold of fate has shifted.','I moved the boundary. Your footing slips.'],
 jd:['A card returned to dust.','This card\'s lifespan has ended.','Erased. Just like your hopes.','Turned to ash. You may be next.'],
 js:['What was yours is now mine.','Your cards changed hands. So did your fate.','Taken. Do not thank me.','No trade—only collection.'],
 jb:['Silence. Your right to act is sealed.','I bound your hands.','Now you will only watch.'],
 jn:['Your Joker was stillborn.','I erased your move.','Powerless. Just like you.'],
 react:['I anticipated this trump card.','I read your move.','One Joker will not save you.','Was that your last resort?','I accounted for this. I always do.','Your Jokers dwindle. My patience does not.'],
 draw:['The card of fate comes to me.','I draw. You tremble.','Every card is a step closer.','Whispers rise from the deck.','I do not choose the card; the card chooses me.'],
 pass:['Your turn. Do not tarry.','Make your move. I wait.','I am ready. Are you?','I am finished. Now burn.','Silence. Your turn.'],
 think:['Your open total is {o}. Target {t}. Probabilities turn.','Your hidden card... I already suspect it.','Every remaining card in the deck is in my mind.','You hold {j} Jokers. I know.','I burn through every possibility.','I read not your move, but your fear.'],
 pbust:['Showing {o}. Target {t}. Judgment is passed.','You busted. Death relishes this.','You were far too greedy.','You exceeded the target. Your end is here.','Either you cannot count, or you love dying.'],
 obust:['My open total is {b}, target {t}. A calculated risk.','I passed the target. The plan still holds.','Even Death stumbles once.','One error. Only one.'],
 pexact:['{t}. Perfect. Your hidden card will bring your end.','Sitting right on the target. How fragile.','Showing {t}. One more card and you collapse.'],
 surv0:['You escaped the die. Death does not forget.','You will not escape the next one.','You fled this time. My shadow remains with you.'],
 surv1:['Rolling dice against me is futile.','Death does not die.','Even death refused me.']}
};
SAYS_EN.imp=SAYS.imp;
const lastSay={};
function pickSay(cat){const bank=isEn()?SAYS_EN:SAYS;const L=(bank[DIFF]||bank.med)[cat]||bank[DIFF||'med'].joker||[];if(!L.length)return '';let i,n=0;do{i=Math.random()*L.length|0}while(L.length>1&&i==lastSay[DIFF+cat]&&n++<9);lastSay[DIFF+cat]=i;return L[i]}
const jCat=id=>[8,9,10,11,19].includes(id)?'jt':[13,14].includes(id)?'jd':[15,16,17,18].includes(id)?'js':[23,24].includes(id)?'jb':id==12?'jn':'joker';
/* Konuşma yöneticisi: öncelik 2 = sonuç (her zaman söylenir), 1 = durum/joker (en az 3.5 sn ara), 0 = gevezelik (en az 8 sn ara).
   Eski söz, yenisi gelene kadar ekranda kalır; böylece yazı saniyede birkaç kez değişmez. */
let sayAt=0;const GAP=[8000,3500];
function fillSay(s){const S=G,t=tg(S),o=total(S,0,false),b=total(S,1,false);return s.replace(/\{t\}/g,t).replace(/\{o\}/g,o).replace(/\{b\}/g,b).replace(/\{k\}/g,Math.abs(t-o)).replace(/\{j\}/g,S.hand[0].length)}
function talk(cat,pri=0,prob=1){
  if(MODE!='bot'||!G)return false;
  const now=performance.now();
  if(pri<2&&(now-sayAt<GAP[pri]||Math.random()>prob))return false;
  const s=pickSay(cat);if(!s)return false;
  sayT=fillSay(s);sayAt=now;return true;
}
const EMOTES=['👋','😂','😱','🤔','👏','🔥','💀','😈'];
const EMOTE_SET=new Set(EMOTES);
let emoteAt=0;
function closeEmoteMenu(){const el=$('#emote-pop');if(el)el.remove()}
function showEmote(side,em){
  if(!EMOTE_SET.has(em))return;
  const av=document.querySelector((side===0?'#me':'#opp')+' .who .av');
  if(!av||!av.getBoundingClientRect)return;
  const r=av.getBoundingClientRect();
  document.querySelectorAll(`.emote-bubble.s${side}`).forEach(x=>x.remove());
  const b=document.createElement('div');
  b.className=`emote-bubble s${side}`;
  b.textContent=em;
  b.style.left=Math.round(r.left+r.width/2)+'px';
  b.style.top=Math.round(side===0?r.top-8:r.bottom+8)+'px';
  document.body.appendChild(b);
  setTimeout(()=>{if(b.isConnected)b.remove()},2100);
}
function sendEmote(em){
  if(!G||MODE==='spectator'||!EMOTE_SET.has(em))return;
  const now=performance.now();
  if(now-emoteAt<1500)return;
  emoteAt=now;
  closeEmoteMenu();
  showEmote(0,em);
  snd('ok');
  if(MODE==='guest'){
    if(conn&&conn.open)conn.send({k:'emote',e:em});
  }else if(MODE==='host'){
    if(conn&&conn.open)conn.send({k:'emote',e:em});
    spectators.forEach(s=>{try{if(s.open)s.send({k:'emote',e:em,side:0})}catch(e){}});
  }else if(MODE==='bot'){
    const map={'👋':['👋','😈'],'😂':['💀','😈'],'😱':['😂','🔥'],'🤔':['🤔','👏'],'👏':['👋','🔥'],'🔥':['🔥','😈'],'💀':['💀','😱'],'😈':['😈','💀']};
    const pool=map[em]||EMOTES;
    if(Math.random()<0.72){
      setTimeout(()=>{if(G&&!G.over&&MODE==='bot')showEmote(1,pool[Math.floor(Math.random()*pool.length)])},750+Math.random()*550);
    }
  }
}
function toggleEmoteMenu(){
  if(!G||MODE==='spectator'||lock)return;
  const ex=$('#emote-pop');
  if(ex){ex.remove();return}
  const av=document.querySelector('#me .who .av');
  if(!av||!av.getBoundingClientRect)return;
  const r=av.getBoundingClientRect();
  const pop=document.createElement('div');
  pop.id='emote-pop';
  pop.innerHTML=EMOTES.map(em=>`<button type="button" class="emote-btn" data-em="${em}" aria-label="${em}">${em}</button>`).join('');
  document.body.appendChild(pop);
  const pw=pop.offsetWidth||184,ph=pop.offsetHeight||96;
  const left=Math.max(10,Math.min(window.innerWidth-pw-10,r.left+r.width/2-pw/2));
  let top=r.top-ph-10;
  if(top<10)top=r.bottom+10;
  pop.style.left=Math.round(left)+'px';
  pop.style.top=Math.round(top)+'px';
  pop.querySelectorAll('.emote-btn').forEach(btn=>{
    btn.onclick=ev=>{ev.stopPropagation();sendEmote(btn.dataset.em)};
  });
}
function watch(){ // açık kartlar hedefi geçtiyse ya da tam hedefteyse bot yorum yapar (kapalı kart hesaba katılmaz)
  const S=G;if(MODE!='bot'||!S||!S.pl||S.over||S.wait||S.rev||!S.st||lowW(S))return;
  const T=tg(S),o=total(S,0,false),b=total(S,1,false),st=S.st;
  if(o<=T)st.pb=0;else if(!st.pb&&talk('pbust',1))st.pb=1;
  if(b<=T)st.ob=0;else if(!st.ob&&talk('obust',1))st.ob=1;
  if(o!=T)st.px=0;else if(!st.px&&talk('pexact',1,.8))st.px=1;
}
function cast(p,id,cb){ // joker sahnede Runeterra büyüsü gibi belirir ve Kapat butonu olmadan otomatik oynanır
  if(lock){setTimeout(()=>{if(G)cast(p,id,cb)},250);return}
  snd('play');
  if(p==0){if(DES.has(id)){shake();snd('stamp');vib(60)}cb&&cb();return}
  lock=true;
  const oldCast=document.getElementById('cast');if(oldCast)oldCast.remove();
  const el=document.createElement('div');el.id='cast';el.className='from'+p;
  el.innerHTML=`<img src="${IMG.j[id]}" alt="">`;
  document.body.appendChild(el);
  const imgEl=el.querySelector('img');
  const oz=document.querySelector('#opp');
  if(imgEl&&oz&&oz.getBoundingClientRect){const r=oz.getBoundingClientRect();imgEl.style.setProperty('--sy',Math.round(r.top+r.height/2-innerHeight/2)+'px')}
  hi(imgEl,id);
  let done=false;
  const finish=()=>{if(done)return;done=true;if(el.isConnected)el.remove();lock=false;if(DES.has(id)){shake();snd('stamp');vib(60)}if(MODE=='bot'&&p==1){talk(jCat(id),1,.85);R()}cb&&cb()};
  el.onclick=finish;
  setTimeout(finish,1650);
}
function count(el,a,b){if(!el)return;if(a==b||RM||typeof requestAnimationFrame=='undefined'){el.textContent=b;return}const t0=performance.now(),f=n=>{const x=Math.min(1,(n-t0)/520),e=1-Math.pow(1-x,3);el.textContent=Math.round(a+(b-a)*e);if(x<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function fly(){ // yeni kartlar desteden teker teker, yumuşak yay çizerek uçar
  const d=$('#deck');if(!d||!d.getBoundingClientRect)return;
  const freshNodes=[...document.querySelectorAll('.fresh')];
  if(!freshNodes.length)return;
  const dr=d.getBoundingClientRect(),F=FIT||1;
  // Başlangıç dağıtımında (birden fazla kart): önce kapalı kartlar (senin -> rakibin), sonra açık sayı kartları (senin -> rakibin)
  let ordered=freshNodes;
  if(freshNodes.length>=2){
    const pri=el=>{
      const isMe=!!el.closest('#me');
      const isClosed=el.classList.contains('mc')||el.classList.contains('bk');
      if(isClosed&&isMe)return 0;
      if(isClosed&&!isMe)return 1;
      if(!isClosed&&isMe)return 2;
      return 3;
    };
    ordered=[...freshNodes].sort((a,b)=>pri(a)-pri(b));
  }
  // Önce tüm kartların son konumunu ölç (animasyon sıfırlanmış halde)
  ordered.forEach(el=>{el.style.animation='none';el.style.opacity='0'});
  void d.offsetWidth;
  const rects=ordered.map(el=>el.getBoundingClientRect());
  const isBatch=ordered.length>=2;
  const stepMs=isBatch?320:0;
  const baseMs=isBatch?110:0;
  const pulseDeck=()=>{
    if(!d.isConnected)return;
    d.classList.remove('pull');
    void d.offsetWidth;
    d.classList.add('pull');
  };
  ordered.forEach((el,idx)=>{
    const r=rects[idx];
    const dx=(dr.left-r.left+(dr.width-r.width)/2)/F;
    const dy=(dr.top-r.top+(dr.height-r.height)/2)/F;
    const isMe=!!el.closest('#me');
    const delayMs=baseMs+idx*stepMs;
    el.style.setProperty('--dx',dx.toFixed(1)+'px');
    el.style.setProperty('--dy',dy.toFixed(1)+'px');
    el.style.setProperty('--rot',(isMe?-11:11)+'deg');
    el.style.animationDelay=(delayMs/1000).toFixed(2)+'s';
    el.style.opacity='';
    el.style.animation='';
    if(delayMs===0){
      pulseDeck();
      snd('draw');
    }else{
      setTimeout(()=>{
        if(!el.isConnected)return;
        pulseDeck();
        snd('draw');
      },delayMs);
    }
  });
  setTimeout(()=>{if(d.isConnected)d.classList.remove('pull')},baseMs+(ordered.length-1)*stepMs+520);
}
/* Mobilde kaydırma olmasın: oyun alanı ekrana sığmıyorsa tek parça olarak küçültülür (PC'ye dokunmaz) */
let FIT=1,fitQ=0;
let fitSig='',fitK=0,fitKey='';
/* iPhone/Safari: çentik / üst bar payı bazen env() ile 0 okunuyor ve içerik yukarı yapışıyor; gerçek değeri ölçüp --sat değişkenine yazarız */
const satProbe=(()=>{const d=document.createElement('div');d.style.cssText='position:fixed;left:0;top:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';document.documentElement.appendChild(d);return d})();
let satV=-1;
function satUpdate(){let v=satProbe.getBoundingClientRect().height||0;
  const ios=/iPhone|iPad/.test(navigator.userAgent),sa=navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
  if(!v&&ios&&sa&&innerWidth<innerHeight)v=47; // ana ekrandan açılan uygulama: çentiğin altına girmesin
  v=Math.round(v);if(v==satV)return;satV=v;document.documentElement.style.setProperty('--sat',v+'px');requestAnimationFrame(()=>{fitSig='';if(G)fit()})}
['load','pageshow','resize','orientationchange'].forEach(e=>addEventListener(e,satUpdate));
if(window.visualViewport)visualViewport.addEventListener('resize',satUpdate);
[0,150,500,1500,3500].forEach(t=>setTimeout(satUpdate,t));
function fit(){document.documentElement.classList.add('fitm');try{fit0()}finally{document.documentElement.classList.remove('fitm')}} // ölçüm sırasında sıra bildirimi gizlenir
function fit0(){
  fitQ=0;FIT=1;
}
const fitSoon=()=>{if(!fitQ)fitQ=requestAnimationFrame(()=>fit())};
addEventListener('resize',()=>{fitSig='';fitSoon()});addEventListener('orientationchange',()=>setTimeout(()=>{fitSig='';fitSoon()},250));
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{fitSig='';fitSoon()});
function R(){
  if(!G)return;
  watch();fitSoon();
  const S=G,low=lowW(S),cn=cand(),k=P&&P.ks[P.pk.length],bi=Math.min(S.bo,3),T=tg(S),res=S.res||[];
  let fresh=0;
  const cd=(c,back,fl,pk)=>{const nf=!seen.has(c.id);if(nf)fresh++;seen.add(c.id);
    const f=(nf?' fresh':'')+(fl?' flip':'')+(cn.includes(c.id)?' hl':'')+(pk?' mc':''),a=`data-c="${c.id}"${pk?' data-pk="1"':''}${pk&&S.rev?' style="--fd:.6s"':''}`;
    return !back&&c.o==null?`<img class="c n${f}" ${a} src="${IMG.n[c.n]}" alt="${c.n}">`:`<div class="c${back?' bk':''}${f}" ${a}>${back?'':`${c.o??c.n}${c.o!=null?'<i>↺</i>':''}`}</div>`};
  const pips=[0,1,2].map(i=>`<span class="pip ${res[i]==null?(i==S.rounds?'now':''):res[i]>0?'w':res[i]<0?'l':'d'}"></span>`).join('');
  const sk=TH.map((t,i)=>`<span class="sk${i<bi?' past':i==bi?' cur':''}" title="${tr(`D20 Ölüm Eşiği: ${t} veya üstü atmalısın`,`D20 Death Threshold: Roll ${t} or higher`)}">${IC.skull}<small>${t}</small></span>`).join('');
  const isSpec=MODE=='spectator';
  const specHdr=isSpec?`<div class="spec-badge"><i></i>${tr('İzleyici Modu','Spectator Mode')} (${specCount||1}/${MAX_SPECTATORS})</div>`:'';
  setH('#hdr',`<div class="hs sks">${sk}</div><div class="hc"><span class="lab">${tr('Düello','Duel')} ${S.bo+1}</span><span class="pips">${pips}</span>${specHdr}</div><div class="hg"><button class="gear" data-g="1" aria-label="${tr('Ayarlar','Settings')}">${IC.gear}<span>${tr('Ayarlar','Settings')}</span></button></div>`);
  const oppHidZero=!S.rev&&act(S,20)&&S.pl[1].closed.length>0;
  const oppClosedKnown=!!(S.rev||oppHidZero||(S.pl[1].closed.length&&S.pl[1].closed.every(c=>c.o!=null||(S.oppPeek&&S.oppPeek.includes(c.id)))));
  const my=!isSpec&&S.turn==0&&!lock&&!S.wait,mt=total(S,0),ot=total(S,1,oppClosedKnown),bust=!low&&mt>T,obust=oppClosedKnown&&!low&&ot>T,seal=T+(low?'L':'');
  const exact=!low&&mt===T,oexact=oppClosedKnown&&!low&&ot===T;
  const jp=n=>`<span class="jpips" title="${tr(`Bu tur kalan joker hakkı ${n}/2`,`Jokers left this round: ${n}/2`)}">${[0,1].map(i=>`<i${i<n?' class="on"':''}></i>`).join('')}</span>`;
  const avh=p=>{const k=avKey(S,p),now=performance.now();if(prevAv[p]!==undefined&&prevAv[p]!==k)morphT[p]=now;prevAv[p]=k;
    const el=(now-morphT[p])/1000,mo=morphT[p]&&el<1.1,fp=HERO_FOCUS[k]||'50% 25%';return `<img class="av${mo?' morph':''}" data-av="${p}" style="object-position:${fp};${mo?`animation-delay:-${el.toFixed(2)}s`:''}" src="${avSrc(k)}" alt="">`};
  const av0=avh(0),av1=avh(1);
  const p0Char=NAMES[avKey(S,0)]||tr('Lanetli Tüccar','Cursed Merchant');
  const p1Char=NAMES[avKey(S,1)]||tr('Kara Şövalye','Dark Knight');
  const p0Name=isSpec?`${p0Char} (${tr('Oda Sahibi','Host')})`:p0Char;
  const p1Name=isSpec?`${p1Char} (${tr('Misafir','Guest')})`:(MODE=='guest'?`${p1Char} (${tr('Oda Sahibi','Host')})`:(MODE=='host'?`${p1Char} (${tr('Rakip','Opponent')})`:(MODE=='bot'||S.av?oppName():tr('Rakip','Opponent'))));
  const oppTimeOut=!!(S.timeOut&&S.timeOut[1]),meTimeOut=!!(S.timeOut&&S.timeOut[0]);
  const defClock=initClockSec();
  const c0=Math.ceil(S.clocks?S.clocks[0]:defClock),c1=Math.ceil(S.clocks?S.clocks[1]:defClock);
  const sc0=$('#sc-0'),sc1=$('#sc-1'),scSec0=$('#sc-sec-0'),scSec1=$('#sc-sec-1');
  if(scSec0)scSec0.textContent=(meTimeOut||c0<=0)?'✕':String(c0);
  if(scSec1)scSec1.textContent=(oppTimeOut||c1<=0)?'✕':String(c1);
  if(sc0){sc0.classList.toggle('ticking',S.turn==0&&!S.wait&&!(S.graceLeft>0)&&!meTimeOut);sc0.classList.toggle('low',c0<=10&&c0>0);sc0.classList.toggle('out',meTimeOut||c0<=0);sc0.classList.toggle('turn-on',S.turn==0&&!S.wait&&!S.over);sc0.classList.toggle('turn-off',S.turn!=0&&!S.wait&&!S.over)}
  if(sc1){sc1.classList.toggle('ticking',S.turn==1&&!S.wait&&!(S.graceLeft>0)&&!oppTimeOut);sc1.classList.toggle('low',c1<=10&&c1>0);sc1.classList.toggle('out',oppTimeOut||c1<=0);sc1.classList.toggle('turn-on',S.turn==1&&!S.wait&&!S.over);sc1.classList.toggle('turn-off',S.turn!=1&&!S.wait&&!S.over)}
  const oppHandHtml=`<div class="opp-jhand" title="${tr(`Rakibin elindeki kapalı jokerler (${S.hand[1].length})`,`Opponent's hidden jokers (${S.hand[1].length})`)}">${S.hand[1].map((_,i)=>`<img class="oj" style="--r:${((i-(S.hand[1].length-1)/2)*4.5).toFixed(1)}deg" src="${IMG.bj}" alt="">`).join('')}</div>`;
  $('#opp').className='zone'+(S.turn==1&&!S.wait?' act':'')+(S.winSide!=null?(S.winSide>0?' round-lose':S.winSide===0?' round-tie':''):'');
  const myHId=avKey(S,0),oppHId=avKey(S,1);
  const hpUsed0=myHId==='u'?!!(S.uRevived&&S.uRevived[0]):myHId==='v'?!!(S.vampUsed&&S.vampUsed[0]):(myHId==='m'||myHId==='e'||myHId==='n'||myHId==='s'||myHId==='c')?false:!!(S.hpUsed&&S.hpUsed[0]);
  const hpUsed1=oppHId==='u'?!!(MODE==='bot'?S.rigDone:(S.uRevived&&S.uRevived[1])):oppHId==='v'?!!(S.vampUsed&&S.vampUsed[1]):(oppHId==='m'||oppHId==='e'||oppHId==='n'||oppHId==='s'||oppHId==='w'||oppHId==='a'||oppHId==='c')?false:!!(S.hpUsed&&S.hpUsed[1]);
  const hpObj0=HERO_MAP[myHId]||HEROES[0],hpObj1=HERO_MAP[oppHId]||HEROES[0];
  const cWins0=(S.cWins&&S.cWins[0])||0,cReady=myHId!=='c'||cWins0>=4;
  const cWins1=(S.cWins&&S.cWins[1])||0,cReady1=oppHId!=='c'||cWins1>=4;
  const canHp=!isSpec&&!hpObj0.passive&&my&&!P&&!hpUsed0&&cReady;
  const cProg=(myHId==='c'&&!hpUsed0)?`<i class="hp-prog">${Math.min(4,cWins0)}/4</i>`:'';
  const cProg1=(oppHId==='c'&&!hpUsed1)?`<i class="hp-prog">${Math.min(4,cWins1)}/4</i>`:'';
  const isMob=window.matchMedia&&window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
  const hpBtn0=isSpec?'':`<button id="hp-btn" class="hp-btn${hpObj0.passive?' passive':''}${hpUsed0?' used':canHp?' ready':''}" data-hp="1" data-hp-id="${myHId}" data-hp-side="0"${(canHp||isMob)?'':' disabled'}>${HP_IC[myHId]||HP_IC.c}${cProg}</button>`;
  const hpBtn1=`<span class="hp-btn opp-hp${hpObj1.passive?' passive':''}${hpUsed1?' used':!cReady1?' locked':''}" data-hp-id="${oppHId}" data-hp-side="1">${HP_IC[oppHId]||HP_IC.c}${cProg1}</span>`;
  setH('#opp',`${oppHandHtml}<div class="who">${av1}${hpBtn1}<div class="nm"><b>${p1Name}</b>${MODE=='bot'?'':'<span class="meta">Online</span>'}</div><div class="tot${obust?' bust':oexact?' exact':''}"><small>${tr('Toplam','Total')}</small><div class="tl"><b>${lastTot[1]}</b>${oppHidZero?'<i class="pq">+</i><i class="pq">0</i>':oppClosedKnown?'':'<i class="pq">+</i><i class="pq">?</i>'}</div></div></div><div class="sayrow">${sayT?`<span class="say">${sayT}</span>`:''}</div><div class="cards${(S.pl[1].open.length+S.pl[1].closed.length>=6)?' cards-2row':''}">${S.pl[1].open.map(c=>cd(c)).reverse().join('')}<span class="gap"></span>${S.pl[1].closed.map(c=>cd(c,!(S.rev||c.o!=null||(S.oppPeek&&S.oppPeek.includes(c.id))),S.rev)).join('')}</div>`);
  const activeTg=tgE(S);
  const chip=x=>{const e=S.eff.find(y=>y.uid==x.uid)||x,isSup=!e.neg&&TGS.has(e.id)&&activeTg&&e.uid!==activeTg.uid;return `<span class="e${BLOCK.has(e.id)?'':' used'}${e.neg||isSup?' neg':''}${e.o==0?' mine':' opp'}${seenE.has(e.uid)?'':' newc'}${(k=='eff'||k=='steal_j')&&cn.includes(e.uid)?' hl':''}" data-e="${e.uid}"><img src="${IMG.j[e.id]}" alt=""></span>`};
  $('#deck b').textContent=S.deck.length;
  const drawLocked=S.eff.some(e=>e.id==23&&!e.neg&&e.o!=0);
  $('#deck').classList.toggle('can-draw',!isSpec&&my&&!P&&canDraw(S,0));
  $('#deck').classList.toggle('draw-locked',drawLocked);
  setH('#jo',(S.pj||[]).filter(x=>x.o==1).map(chip).join(''));
  setH('#jm',(S.pj||[]).filter(x=>x.o==0).map(chip).join(''));
  const sl=$('#seal'),sc=(T!=21||low?' alt':'')+(low?' low':'')+(S.turn==0?' turn-me':' turn-op');
  if(!sl._o){sl._o=1;sl.addEventListener('animationend',()=>sl.classList.remove('stamp'))}
  if(sl._c!==sc){sl._c=sc;sl.className='seal'+sc+(sl.classList.contains('stamp')?' stamp':'')}
  setH('#seal',`<b>${low?tr('En az','Lowest'):T}</b>`);
  if(prevSeal&&prevSeal!=seal){sl.classList.remove('stamp');void sl.offsetWidth;sl.classList.add('stamp')}
  $('#me').className='zone'+(my?' act':'')+(S.winSide!=null?(S.winSide<0?' round-lose':S.winSide===0?' round-tie':''):'');
  setH('#me',`<div class="who">${av0}${hpBtn0}<div class="nm"><b>${p0Name}</b></div><div class="tot${bust?' bust':exact?' exact':''}"><small>${tr('Toplam','Total')}</small><b>${lastTot[0]}</b></div></div><div class="cards${(S.pl[0].open.length+S.pl[0].closed.length>=6)?' cards-2row':''}">${S.pl[0].open.map(c=>cd(c)).reverse().join('')}<span class="gap"></span>${S.pl[0].closed.map(c=>cd(c,!(S.rev||c.o!=null||peek.has(c.id)),S.rev||c.id==flipId,1)).join('')}</div>`);
  const myAv=$('#me .who .av');if(myAv)myAv.onclick=e=>{e.stopPropagation();toggleEmoteMenu()};
  const pr=$('#prompt');
  pr.className=P?(P.hp?'ask'+(k==='hand_j'?' hand-mode':''):'ask has-joker'+(k==='sign'?' sign-mode':'')):'';
  if(!P){
    setH('#prompt','');
  }else if(P.hp==='u'){
    setH('#prompt',`<div class="pr-box"><div class="pr-txt">${tr('Hiçlik Değişimi','Void Shift')}: ${KTXT[k]}</div><div class="pr-btns"><button class="btn sm alt" data-x="1">${tr('Vazgeç','Cancel')}</button></div></div>`);
  }else if(P.hp==='a'){
    setH('#prompt',`<div class="pr-box"><div class="pr-txt">${tr('Dönüşüm İksiri: Destenin en üstüyle değiştireceğin kendi sayı kartını seç','Potion of Transmutation: Select your number card to swap with the top of the deck')}</div><div class="pr-btns"><button class="btn sm alt" data-x="1">${tr('Vazgeç','Cancel')}</button></div></div>`);
  }else if(P.hp==='p'){
    setH('#prompt',`<div class="pr-box"><div class="pr-txt"><b>${tr('Vebalı Takas','Plague Trade')}:</b> ${tr('Elinden yakacağın joker kartını seç','Select a joker card from your hand to burn')}</div><div class="pr-btns"><button class="btn sm alt" data-x="1">${tr('Vazgeç','Cancel')}</button></div></div>`);
  }else{
    const btns=k==='sign'?`<button class="btn sm" data-s="1">${tr('Ekle (+)','Add (+)')}</button><button class="btn sm" data-s="-1">${tr('Çıkar (−)','Subtract (−)')}</button>`:'';
    setH('#prompt',`<div class="pr-card-wrap"><img class="pr-jcard" src="${IMG.j[P.id]}" alt="${J[P.id]||''}"></div><div class="pr-box"><div class="pr-title">${J[P.id]}</div><div class="pr-txt">${KTXT[k]}</div><div class="pr-btns">${btns}<button class="btn sm alt" data-x="1">${tr('Vazgeç','Cancel')}</button></div></div>`);
    const jim=pr.querySelector('.pr-jcard');
    if(jim)hi(jim,P.id);
  }
  const ends=S.turns>0&&!S.acted; // karşı taraf hamle yapmadan pas/süre bitirdiyse şimdi pas dersem tur biter
  $('#pass').disabled=isSpec||!(my&&!P);
  if(isSpec){
    $('#pass').style.display='none';
  }else{
    $('#pass').style.display='';
    $('#pass').textContent=ends?tr('Turu bitir','End Round'):tr('Pas','Pass');$('#pass').className='btn sm'+(ends?'':' alt');
  }
  const n=S.hand[0].length;
  $('#hand').classList.toggle('joker-locked',!!(S.noJ&&S.noJ[0]));
  if(isSpec){
    setH('#hand',`<div class="spec-notice">${tr('Canlı Maç Yayını · İzleyici Modundasın','Live Match Broadcast · Spectator Mode')}</div>`);
  }else{
    setH('#hand',S.hand[0].map((id,i)=>`<span class="jslot"><img class="j${k==='hand_j'?' hl':(my&&!P&&playable(S,0,id)?'':' dim')}" draggable="false" style="--r:${((i-(n-1)/2)*5).toFixed(1)}deg" data-j="${id}" data-jidx="${i}" src="${IMG.j[id]}" alt=""></span>`).join(''));
    document.querySelectorAll('#hand .j[data-j]').forEach(im=>hi(im,+im.dataset.j));
  }
  count(document.querySelector('#me .tot b'),lastTot[0],mt);count(document.querySelector('#opp .tot b'),lastTot[1],ot);lastTot=[mt,ot];
  (S.pj||[]).forEach(e=>seenE.add(e.uid));S.hand[0].forEach(id=>hiLoad(id));
  if(prevSeal&&prevSeal!=seal)snd('stamp');prevSeal=seal;
  if(bust&&!lastBust){snd('bust');shake();vib(120)}lastBust=bust;
  // Yeni kart sesleri artık fly() içinde her kart desteden çıkarken senkron çalar
  [0,1].forEach(side=>{
    const uNow=side===0?hpUsed0:hpUsed1,hObj=side===0?hpObj0:hpObj1,hId=side===0?myHId:oppHId;
    if(uNow&&!prevHpAnim[side]&&!hObj.passive&&hId!=='w'&&hId!=='a'){
      playHeroPowerAnim(hId,side,hObj);
    }
    prevHpAnim[side]=uNow;
  });
  const mt0=S.turn==0&&!S.wait;if(mt0&&!prevT)snd('turn');prevT=mt0;
  const last=S.log[S.log.length-1],lk=S.log.length+JSON.stringify(last);if(lk!=lastLk){lastLk=lk;if(last&&last.t=='pas dedi')snd('pass')}
  fly();flipId=null;
  if(MODE==='tutorial')tutApplyHighlights();
  if(MODE=='host'){
    if(conn&&conn.open)conn.send({k:'s',v:view(G)});
    if(spectators.length){
      const sv=specView(G);
      spectators.forEach(s=>{try{if(s.open)s.send({k:'s',v:sv,specCount:spectators.length})}catch(e){}});
    }
  }
}
function playHeroPowerAnim(hId,side,hObj){
  const btn=document.querySelector(side===0?'#me .hp-btn':'#opp .hp-btn');
  if(btn){
    const r=btn.getBoundingClientRect();
    const fx=document.createElement('div');
    fx.className='hp-cast-fx'+(side===1?' opp':'');
    fx.style.left=(r.left+r.width/2)+'px';
    fx.style.top=(r.top+r.height/2)+'px';
    fx.innerHTML=`<i class="hp-cast-ring"></i><span class="hp-cast-pop">${hObj.hpName}!</span>`;
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(),1350);
  }
  const spawnBoard=(cls,el)=>{
    const b=document.createElement('div');
    b.className='hp-board-fx '+cls;
    if(el){
      const er=el.getBoundingClientRect();
      b.style.left=(er.left+er.width/2)+'px';
      b.style.top=(er.top+er.height/2)+'px';
    }else{
      b.style.left='50%';b.style.top='50%';
    }
    document.body.appendChild(b);
    setTimeout(()=>b.remove(),1200);
  };
  if(hId==='c')spawnBoard('hp-fx-rewind',document.querySelector('#fx'));
  else if(hId==='p')spawnBoard('hp-fx-plague',document.querySelector(side===0?'#me .who':'#opp .who'));
  else if(hId==='a')spawnBoard('hp-fx-alch',document.querySelector('#deck'));
  else if(hId==='w'&&side===0)spawnBoard('hp-fx-witch',document.querySelector('#opp .cards .c.bk'));
  else if(hId==='l')spawnBoard('hp-fx-wolf',document.querySelector('#fx'));
}
function doPlay(id,pk){const S=G;P=null;recMove(S,{t:'j',id,pk:[...(pk||[])]},`${tr('Joker','Joker')}: ${J[id]||id}`);if(MODE=='guest'){conn.send({k:'play',id,pk});return R()}S.graceLeft=0;lrnAct(S,'j',id);play(S,0,id,pk);S.acted=true;S.log.push({p:0,t:`joker oynadı: ${J[id]}`});note(0,id,()=>{if(MODE=='bot')talk('react',1,.5);R();if(MODE==='tutorial'&&tutStep===3)tutAdvance('joker')})}
function execAlchSwap(cid){
  const S=G;if(!S||!S.deck.length)return;
  if(MODE==='guest'){snd('flip');return conn.send({k:'hp_alch',cid})}
  for(const arr of [S.pl[0].open,S.pl[0].closed]){
    const idx=arr.findIndex(c=>c.id===cid);
    if(idx>=0){
      const old=arr[idx],rep=S.deck.pop();
      arr[idx]=rep;S.deck.push(old);
      S.hpUsed[0]=true;S.acted=true;S.graceLeft=0;
      S.log.push({p:0,t:'Dönüşüm İksiri kullandı'});snd('flip');R();
      return;
    }
  }
}
function pick(v){if(P&&P.hp==='u'){const id=v;P=null;return execSwapDeckHeroPower(0,id)}if(P&&P.hp==='a'){const id=v;P=null;return execAlchSwap(id)}if(P&&P.hp==='p'){const idx=v;P=null;if(!G||idx<0||idx>=G.hand[0].length)return R();snd('play');if(MODE==='guest'){G.hpUsed[0]=true;R();return conn.send({k:'hp_plague',idx})}execPlague(G,0,idx);return R()}P.pk.push(v);if(P.pk.length==P.ks.length)doPlay(P.id,P.pk);else R()}
function startJoker(id){if(MODE==='tutorial'&&(tutStep!==3||id!==3))return;const ks=NEED[id]||[];if(ks.length){P={id,ks,pk:[]};R()}else doPlay(id,[])}
const HERO_FOCUS={c:'44% 28%',p:'56% 24%',n:'64% 25%',a:'50% 24%',s:'48% 25%',e:'52% 28%',m:'50% 30%',w:'45% 23%',l:'68% 28%',v:'50% 25%'};
function chooseHero(onPick,onCancel){
  lock=true;
  const cards=HEROES.filter(h=>!h.bossOnly).map(h=>{const dl=h.desc.length,dc=dl<=55?'hpc-desc-lg':dl<=105?'hpc-desc-md':'hpc-desc-sm';return `<button class="hero-pick-card${MY_HERO===h.id?' sel':''}" data-pick-hero="${h.id}">
    <div class="hpc-art"><img class="hpc-av" src="${avSrc(h.id)}" alt="${h.name}" style="object-position:${HERO_FOCUS[h.id]||'50% 25%'};transform-origin:${HERO_FOCUS[h.id]||'50% 25%'}"></div>
    <div class="hpc-body">
      <div class="hpc-name">${h.name}</div>
      <div class="hpc-pw"><span class="hpc-ic">${HP_IC[h.id]}</span><b>${h.hpName}</b></div>
      <p class="hpc-desc ${dc}">${h.desc}</p>
    </div>
  </button>`}).join('');
  $('#mb').classList.remove('end-mode','an-mode','set-mode');
  $('#mb').innerHTML=`<h3>${tr('Kahramanını Seç','Choose Your Hero')}</h3><div class="hero-grid">${cards}</div><div class="row"><button id="hp-cancel" class="btn alt sm">${tr('Geri','Back')}</button></div>`;
  $('#m').hidden=false;
  $('#mb').querySelectorAll('[data-pick-hero]').forEach(btn=>btn.onclick=()=>{
    const hid=btn.dataset.pickHero;
    $('#m').hidden=true;lock=false;snd('play');onPick(hid);
  });
  $('#hp-cancel').onclick=()=>{$('#m').hidden=true;lock=false;onCancel&&onCancel()};
}
function showScryModal(c1,c2,onKeep,onSwap){
  const cardHtml=c=>`<div class="scry-card"><img src="${IMG.n[c.n]}" alt="${c.n}"><span>${c.n}</span></div>`;
  box(`<h3>${tr('Yitik Yazgı — Deste Üstü','Lost Fate — Top of Deck')}</h3><p>${c2?tr('En üstteki 2 kartı görüyorsun (soldaki sıradaki çekilecek kart). İstersen yerlerini değiştir:','You see the top 2 cards of the deck (the left one will be drawn next). Swap their order if you wish:'):tr('Destede yalnızca 1 kart kaldı:','Only 1 card remains in the deck:')}</p><div class="scry-row">${cardHtml(c1)}${c2?cardHtml(c2):''}</div>${c2?`<div class="row"><button id="scry-keep" class="btn sm">${tr('Sırayı Koru','Keep Order')}</button><button id="scry-swap" class="btn sm alt">${tr('Yerlerini Değiştir','Swap Order')}</button></div>`:''}`, !c2);
  if(c2){
    $('#scry-keep').onclick=()=>{$('#m').hidden=true;lock=false;onKeep()};
    $('#scry-swap').onclick=()=>{$('#m').hidden=true;lock=false;snd('flip');onSwap()};
  }else if($('#pc')){
    const oldClose=$('#pc').onclick;
    $('#pc').onclick=()=>{oldClose&&oldClose();onKeep()};
  }
}
function execSwapDeckHeroPower(p,cardId){
  const S=G;if(!S||!S.deck.length)return;
  const idx=S.pl[p].open.findIndex(c=>c.id===cardId);
  if(idx<0)return;
  const old=S.pl[p].open[idx];
  const rep=S.deck.pop();
  S.pl[p].open[idx]=rep;
  S.deck.push(old);
  shuf(S.deck);
  S.hpUsed[p]=true;S.acted=true;S.graceLeft=0;
  S.log.push({p,t:`Hiçlik Değişimi kullandı (${old.n} → ${rep.n})`});
  snd('flip');R();
}
function execRewind(S,p){
  const cards=[...S.pl[0].open,...S.pl[0].closed,...S.pl[1].open,...S.pl[1].closed,...(S.dead||[])];
  cards.forEach(c=>{delete c.o;delete c.hpImmune;S.deck.push(c)});
  shuf(S.deck);
  S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop()]}));
  S.eff=[];S.pj=[];S.jUsed=[0,0];S.jTurn=[0,0];S.noJ=[false,false];S.dead=[];
  S.hpMod=[0,0];S.plagueMod=[0,0];S.hpTgMod=0;S.oppPeek=[];S.oppPeek1=[];
  S.cWins=S.cWins||[0,0];S.cWins[p]=0;
  S.hpUsed=S.hpUsed||[false,false];S.hpUsed[p]=false;S.acted=true;S.graceLeft=0;
  S.log.push({p,t:'Zamanın İadesi kullandı! Kartlar desteye döndü ve yeniden dağıtıldı.'});
  snd('flip');R();
  playHeroPowerAnim('c',p,HERO_MAP.c);
}
function execPlague(S,p,idx){
  if(idx<0||idx>=S.hand[p].length)return;
  const burned=S.hand[p].splice(idx,1)[0];
  const drawn=[];
  for(let k=0;k<2&&S.jdeck.length;k++){
    const rIdx=Math.floor(Math.random()*S.jdeck.length);
    drawn.push(S.jdeck.splice(rIdx,1)[0]);
  }
  S.hand[p].push(...drawn);
  S.hpUsed=S.hpUsed||[false,false];S.hpUsed[p]=true;S.acted=true;S.graceLeft=0;
  S.log.push({p,t:`Vebalı Takas kullandı (${J[burned]} yaktı, ${drawn.length} joker çekti)`});
}
function playWolfClawFx(ids){
  if(!ids||!ids.length)return;
  try{snd('stamp');noise(.24,.24,900);shake();vib([70,40,120])}catch(e){}
  ids.forEach((cid,idx)=>{
    const el=document.querySelector(`.cards .c[data-c="${cid}"]`);
    if(!el||!el.getBoundingClientRect)return;
    const r=el.getBoundingClientRect();
    el.classList.add('wolf-slashed');
    const fx=document.createElement('div');
    fx.className='wolf-claw-fx';
    fx.style.left=(r.left+r.width/2)+'px';
    fx.style.top=(r.top+r.height/2)+'px';
    fx.style.width=Math.max(84,Math.round(r.width*1.45))+'px';
    fx.style.height=Math.max(108,Math.round(r.height*1.32))+'px';
    fx.style.animationDelay=(idx*70)+'ms';
    fx.innerHTML=`<svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wcG${idx}" x1="15" y1="12" x2="105" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fff5f5"/>
          <stop offset="32%" stop-color="#f87171"/>
          <stop offset="72%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="wc-s s1" d="M22 14 C40 44, 58 76, 78 122" stroke="url(#wcG${idx})" stroke-width="7.5" stroke-linecap="round"/>
      <path class="wc-s s2" d="M48 10 C64 46, 80 82, 98 130" stroke="url(#wcG${idx})" stroke-width="8.5" stroke-linecap="round"/>
      <path class="wc-s s3" d="M74 18 C86 50, 98 82, 110 120" stroke="url(#wcG${idx})" stroke-width="6.5" stroke-linecap="round"/>
    </svg>`;
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(),680);
  });
}
function execWolf(S,p,afterCb){
  const pickRand=side=>{const pool=S.pl[side].open.length?S.pl[side].open:S.pl[side].closed;if(!pool.length)return null;const i=Math.floor(Math.random()*pool.length);return{pool,i,c:pool[i]}};
  const r0=pickRand(0),r1=pickRand(1);
  const ids=[r0&&r0.c.id,r1&&r1.c.id].filter(Boolean);
  playWolfClawFx(ids);
  if(MODE==='host'){
    if(conn&&conn.open)conn.send({k:'wolf_claw',ids});
    spectators.forEach(s=>{try{if(s.open)s.send({k:'wolf_claw',ids})}catch(e){}});
  }
  const finish=()=>{
    if(S!==G)return;
    if(r0){const i=r0.pool.findIndex(x=>x.id===r0.c.id);if(i>=0)r0.pool.splice(i,1)}
    if(r1){const i=r1.pool.findIndex(x=>x.id===r1.c.id);if(i>=0)r1.pool.splice(i,1)}
    S.hpUsed=S.hpUsed||[false,false];S.hpUsed[p]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p,t:'Kanlı Dolunay kullandı (İki taraftan 1\'er kart imha edildi)'});
    R();
    if(afterCb)afterCb();
  };
  setTimeout(finish,360);
}
function useHeroPower(){
  const S=G;if(!S||S.over||S.wait||S.turn!==0||lock||P||(S.hpUsed&&S.hpUsed[0])||MODE==='tutorial')return;
  S.hpUsed=S.hpUsed||[false,false];
  const hid=avKey(S,0);
  if(hid==='c'){
    const wins=(S.cWins&&S.cWins[0])||0;
    if(wins<4)return box(`<h3>${tr('Zamanın İadesi','Rewind of Time')}</h3><p>${tr(`4 tur galibiyet elde ettiğinde aktifleşir. (Şu an: ${wins}/4)`,`Unlocks after winning 4 rounds. (Current: ${wins}/4)`)}</p>`);
    if(MODE==='guest'){S.cWins[0]=0;snd('flip');playHeroPowerAnim('c',0,HERO_MAP.c);R();return conn.send({k:'hp_rewind'})}
    execRewind(S,0);
  }else if(hid==='p'){
    if(!S.hand[0].length)return box(`<h3>${tr('Vebalı Takas','Plague Trade')}</h3><p>${tr('Elinde yakılacak Joker kartı yok.','You have no Joker cards in hand to burn.')}</p>`);
    if(!S.jdeck.length)return box(`<h3>${tr('Vebalı Takas','Plague Trade')}</h3><p>${tr('Joker destesinde çekilecek kart kalmadı.','No Joker cards left in the deck to draw.')}</p>`);
    P={hp:'p',ks:['hand_j'],pk:[]};
    snd('info');R();
  }else if(hid==='a'){
    if(!S.deck.length)return box(`<h3>${tr('Yitik Yazgı','Lost Fate')}</h3><p>${tr('Destede kart kalmadı.','No cards left in the deck.')}</p>`);
    if(MODE==='guest'){S.hpUsed[0]=true;R();return conn.send({k:'hp_scry'})}
    S.hpUsed[0]=true;S.graceLeft=0;
    const n=S.deck.length,c1=S.deck[n-1],c2=n>1?S.deck[n-2]:null;
    showScryModal(c1,c2,()=>R(),()=>{
      if(n>1){const tmp=S.deck[n-1];S.deck[n-1]=S.deck[n-2];S.deck[n-2]=tmp}
      R();
    });
  }else if(hid==='w'){
    if(!S.pl[1].closed.length)return;
    if(MODE==='guest'){S.hpUsed[0]=true;snd('flip');R();return conn.send({k:'hp_peek'})}
    S.oppPeek=S.pl[1].closed.map(c=>c.id);
    S.hpUsed[0]=true;
    snd('flip');R();
  }else if(hid==='l'){
    if(!(S.pl[0].open.length||S.pl[0].closed.length)||!(S.pl[1].open.length||S.pl[1].closed.length))return box(`<h3>${tr('Kanlı Dolunay','Blood Full Moon')}</h3><p>${tr('İmha edilecek yeterli kart yok.','Not enough cards on the table to destroy.')}</p>`);
    if(MODE==='guest'){S.hpUsed[0]=true;snd('play');R();return conn.send({k:'hp_wolf'})}
    execWolf(S,0);
  }else{
    return;
  }
}
function buildEndScreenHtml(S,v,L,roll,th){
  const isSpec=v===2,vi=isSpec?0:v;
  const won=L!==vi;
  const st=S.stats||{rounds:[0,0,0],draws:[0,0],jokers:[0,0],d20Surv:[0,0],startAt:Date.now()};
  const myH=avKey(S,vi),oppH=avKey(S,1-vi);
  const featH=isSpec?(L===1?myH:oppH):myH;
  const featNm=NAMES[featH]||tr('Kahraman','Hero');
  const rw=st.rounds[vi]||0,rl=st.rounds[1-vi]||0,rt=st.rounds[2]||0;
  const mj=st.jokers[vi]||0,oj=st.jokers[1-vi]||0;
  const sec=Math.max(1,Math.round((Date.now()-(st.startAt||Date.now()))/1000));
  const durTxt=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  const titleTxt=isSpec?tr('Maç Bitti!','Match Over!'):(won?tr('Zafer!','Victory!'):tr('Mağlubiyet!','Defeat!'));
  const winCrestSvg=`<svg class="hs-crest-svg nd-win-svg" viewBox="0 0 420 330" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ndGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff4bf"/><stop offset="48%" stop-color="#d8a53c"/><stop offset="100%" stop-color="#7a4f12"/></linearGradient>
      <linearGradient id="ndSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f3f4f6"/><stop offset="50%" stop-color="#9ca3af"/><stop offset="100%" stop-color="#374151"/></linearGradient>
      <linearGradient id="ndCrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b1a26"/><stop offset="55%" stop-color="#4e0c14"/><stop offset="100%" stop-color="#210508"/></linearGradient>
    </defs>
    <!-- Gothic Runic Sunburst Halo (Original Necrodice) -->
    <g class="nd-halo-spin">
      <circle cx="210" cy="154" r="118" stroke="url(#ndGold)" stroke-width="1.5" stroke-dasharray="6 7" opacity="0.72"/>
      <circle cx="210" cy="154" r="102" stroke="url(#ndGold)" stroke-width="2.2" opacity="0.82"/>
      <path d="M210 22 L218 62 L202 62 Z M210 286 L218 246 L202 246 Z M78 154 L118 146 L118 162 Z M342 154 L302 146 L302 162 Z" fill="url(#ndGold)" opacity="0.88"/>
      <path d="M116 60 L148 84 L138 94 Z M304 60 L272 84 L282 94 Z M116 248 L148 224 L138 214 Z M304 248 L272 224 L282 214 Z" fill="url(#ndGold)" opacity="0.72"/>
    </g>
    <!-- Crossed Gothic Greatswords -->
    <g stroke="#1b1208" stroke-width="1.8" stroke-linejoin="round">
      <path d="M68 58 L286 244 L276 254 L58 68 L52 46 Z" fill="url(#ndSteel)"/>
      <path d="M352 58 L134 244 L144 254 L362 68 L368 46 Z" fill="url(#ndSteel)"/>
      <rect x="64" y="64" width="32" height="7" rx="2" transform="rotate(-48 64 64)" fill="url(#ndGold)"/>
      <rect x="334" y="88" width="32" height="7" rx="2" transform="rotate(48 334 88)" fill="url(#ndGold)"/>
    </g>
    <!-- Twin Crimson-Velvet Gothic Swallowtail Pennants -->
    <path d="M84 124 L132 140 L132 288 L108 266 L84 288 Z" fill="url(#ndCrim)" stroke="url(#ndGold)" stroke-width="3" stroke-linejoin="round"/>
    <path d="M336 124 L288 140 L288 288 L312 266 L336 288 Z" fill="url(#ndCrim)" stroke="url(#ndGold)" stroke-width="3" stroke-linejoin="round"/>
    <path d="M98 142 L98 258 M118 148 L118 258 M302 148 L302 258 M322 142 L322 258" stroke="#f0c453" stroke-width="1" opacity="0.45"/>
    <!-- Apex Golden D20 Gem Crest (Signature Necrodice!) -->
    <g class="nd-d20-apex">
      <polygon points="210,14 238,32 238,62 210,78 182,62 182,32" fill="url(#ndGold)" stroke="#2b1905" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="210,20 232,48 188,48" fill="#fff4bf" opacity="0.55"/>
      <path d="M210 14 L232 48 L210 78 L188 48 Z M182 32 L232 48 M238 32 L188 48 M182 62 L238 62" stroke="#5c3a0b" stroke-width="1.3" opacity="0.8"/>
    </g>
  </svg>`;
  const defeatCrestSvg=`<svg class="hs-crest-svg nd-lose-svg" viewBox="0 0 420 330" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ndIron" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9ca3af"/><stop offset="50%" stop-color="#52525b"/><stop offset="100%" stop-color="#27272a"/></linearGradient>
      <linearGradient id="ndAsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3f3f46"/><stop offset="55%" stop-color="#27272a"/><stop offset="100%" stop-color="#121215"/></linearGradient>
    </defs>
    <!-- Shattered Obsidian Runic Ring (No Crown, No Red Box) -->
    <g opacity="0.72">
      <path d="M118 96 A108 108 0 0 1 286 78" stroke="#71717a" stroke-width="2.4" stroke-dasharray="18 8"/>
      <path d="M312 132 A108 108 0 0 1 258 250" stroke="#52525b" stroke-width="2.2" stroke-dasharray="14 10"/>
      <path d="M164 252 A108 108 0 0 1 104 148" stroke="#71717a" stroke-width="2.2" stroke-dasharray="12 9"/>
    </g>
    <!-- Broken Crossed Blades -->
    <g stroke="#0e0e11" stroke-width="1.8" stroke-linejoin="round">
      <path d="M76 74 L168 152 L158 164 L66 84 L74 64 Z" fill="url(#ndIron)"/>
      <path d="M254 222 L286 248 L276 258 L242 232 Z" fill="url(#ndIron)"/>
      <path d="M346 82 L252 162 L262 174 L356 92 L348 70 Z" fill="url(#ndIron)"/>
      <path d="M168 228 L138 252 L148 262 L178 238 Z" fill="url(#ndIron)"/>
    </g>
    <!-- Torn Charcoal-Ash Pennants -->
    <path d="M88 134 L132 146 L132 276 L116 252 L104 282 L88 262 Z" fill="url(#ndAsh)" stroke="#71717a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M332 134 L288 146 L288 280 L306 258 L318 286 L332 264 Z" fill="url(#ndAsh)" stroke="#71717a" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Shattered Dark D20 Shard at Apex (Signature Necrodice!) -->
    <g class="nd-d20-broken">
      <polygon points="205,18 182,34 184,60 206,74 202,48" fill="url(#ndIron)" stroke="#18181b" stroke-width="2.2" stroke-linejoin="round"/>
      <polygon points="216,20 238,36 236,62 214,76 218,50" fill="url(#ndIron)" stroke="#18181b" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M208 16 L204 46 L213 54 L208 78" stroke="#09090b" stroke-width="3" stroke-linecap="round"/>
    </g>
  </svg>`;
  const crestBgSvg=(won||isSpec)?winCrestSvg:defeatCrestSvg;
  const eloRes=(!isSpec&&v===0&&MODE!=='tutorial'&&typeof recordMatchElo==='function')?recordMatchElo(S,won):null;
  const eloHtml=eloRes?`<div class="end-elo-bar ${eloRes.delta>=0?'pos':'neg'}">
      <span class="end-elo-rk">${eloRes.rank.ic} ${eloRes.rank.name}</span>
      <span class="end-elo-val">${eloRes.before} → <b>${eloRes.after}</b></span>
      <span class="end-elo-d">${eloRes.delta>=0?'+':''}${eloRes.delta} ELO</span>
    </div>`:'';
  return `<div class="end-screen hs-victory ${isSpec?'spec':won?'win':'lose'}">
    <div class="end-glow"></div>
    <div class="hs-crest-stage">
      ${crestBgSvg}
      <div class="hs-arch-frame">
        <img src="${avSrc(featH)}" alt="${featNm}" style="object-position:${HERO_FOCUS[featH]||'50% 25%'}">
      </div>
      <div class="hs-wood-plaque"><span>${titleTxt}</span></div>
    </div>
    ${eloHtml}
    <div class="end-stats hs-end-stats">
      <div class="end-stat" style="--d:0.12s"><span>${tr('Tur','Rounds')}</span><b>${rw}${tr('G','W')} · ${rl}${tr('M','L')}${rt?` · ${rt}${tr('B','T')}`:''}</b></div>
      <div class="end-stat" style="--d:0.20s"><span>${tr('Joker','Jokers')}</span><b>${mj} – ${oj}</b></div>
      <div class="end-stat" style="--d:0.28s"><span>${tr('Son D20','Final D20')}</span><b>${roll} / ${th}</b></div>
      <div class="end-stat" style="--d:0.36s"><span>${tr('Süre','Time')}</span><b>${durTxt}</b></div>
    </div>
    <div class="end-acts row"></div>
  </div>`;
}
function box(html,close=true){lock=true;$('#mb').classList.remove('end-mode','an-mode','set-mode');$('#mb').innerHTML=html+(close?`<div class="row"><button id="pc" class="btn">${tr('Kapat','Close')}</button></div>`:'');$('#m').hidden=false;if(close)$('#pc').onclick=()=>{$('#m').hidden=true;lock=false;if(G)R()}}
/* ---------- BÜYÜK GÖRÜNÜM: karakter, sayı kartı, kapalı kart ---------- */
const HQ={};
function hq(key,cs,cb){let i=HQ[key];if(!i){i=HQ[key]=new Image();i._i=0;i.onerror=()=>{if(++i._i<cs.length)i.src=cs[i._i];else i._f=1};i.src=cs[0]}
  if(i._f)return;if(i.complete&&i.naturalWidth)cb(i.src);else i.addEventListener('load',()=>cb(i.src),{once:true})} // dosya varsa yüksek çözünürlüklüsü yüklenir, yoksa gömülü görsel kalır
function zoom(o){ // {src, hd:cb=>…, cls, cap, sub, btn, fn}
  const old=document.getElementById('zm');if(old)old.remove();
  const el=document.createElement('div');el.id='zm';
  el.innerHTML=`<img class="zi ${o.cls||''}" src="${o.src}" alt=""><b>${o.cap}</b>${o.sub?`<small>${o.sub}</small>`:''}<div class="row">${o.btn?`<button class="btn alt" data-zb="1">${o.btn}</button>`:''}<button class="btn" data-zc="1">${tr('Kapat','Close')}</button></div>`;
  document.body.appendChild(el);snd('info');
  const im=el.querySelector('img');if(o.hd)o.hd(u=>{if(el.isConnected)im.src=u});
  const kd=e=>{if(e.key=='Escape')close()},close=()=>{el.remove();document.removeEventListener('keydown',kd)};
  document.addEventListener('keydown',kd);
  el.onclick=e=>{const zb=e.target.closest&&e.target.closest('[data-zb]');close();if(zb&&o.fn)o.fn()}; // her yere dokunmak kapatır
}
const numHD=n=>cb=>{
  if(typeof HDN!='undefined'&&HDN[n]){cb(HDN[n]);return;}
  const cs=[`img/n/${n}.png`,`img/n/${n}.jpg`,`img/n/${n}.webp`,`img/n${n}.png`,`n${n}.png`];
  hq('n_'+n+'_v2',cs,cb);
};
const backHD=cb=>{
  if(typeof HDBK!='undefined'&&HDBK){cb(HDBK);return;}
  hq('bk_v2',['img/back.png','img/back.jpg','img/n/back.png','img/n/back.jpg','img/back.webp'],cb);
};
const HERO_LORE_TR={
  c:'Karanlık pazarlarda kemik ve altın tartıp terazisine hile karıştıran lanetli bezirgân.',
  p:'Gagalı maskesinin ardında ölümün izini süren, rakibin sırlarını okuyan gizemli hekim.',
  k:'Kafatası tahtından verdiği fermanla düellonun kader sınırını bile eğip büken ölümsüz hükümdar.',
  n:'Rünlü kalkanı ve ağır kılıcıyla düşmanın en güçlü hamlesini ezen yılmaz zırhlı savaşçı.',
  a:'Solmuş gül asası ve yakut tacıyla destenin üstündeki yazgıyı gizlice okuyan kraliçe.',
  s:'Kadim yazmalar ve mum ışığı eşliğinde destenin gelecekteki kartlarını önceden okuyan bilge.',
  e:'Buzul zırhı ve dikenli gürzüyle en ağır darbeleri bile dondurup savuşturan kadim dev.',
  m:'Ölümün kendisiyle pazarlık etmiş, her kader zarında karanlık lütufla kutsanan efendi.',
  w:'Kuzgun yoldaşı ve kemik tılsımlarıyla mezardan gizli kartlar çağıran kara büyücü.',
  l:'Dolunayın öfkesiyle avının üstüne atılıp rakibi sınırın ötesine sürükleyen vahşi canavar.',
  v:'Karanlık kadehini rakiplerinin yaşam gücüyle dolduran ölümsüz kan lordu.',
  u:'Zamanın ve kaderin ötesinden bakan, ölümden bile geri dönebilen çok kollu kozmik varlık.'
};
const HERO_LORE_EN={
  c:'A cursed trader who weighs bone and gold in dark markets, rigging the scales of fate.',
  p:'A mysterious physician behind a beaked mask who tracks death and reads the enemy\'s secrets.',
  k:'An immortal sovereign whose decree from the skull throne bends the very threshold of the duel.',
  n:'A relentless armored warrior whose runic shield and heavy blade crush the enemy\'s strongest blow.',
  a:'A queen with a withered rose scepter and ruby crown who secretly reads the fate atop the deck.',
  s:'A sage surrounded by ancient scrolls and candlelight who foresees the cards yet to come.',
  e:'An ancient colossus in glacial armor whose spiked mace freezes and deflects even the heaviest blows.',
  m:'A dark lord who bargained with Death itself, blessed with unholy favor on every fate roll.',
  w:'A dark sorceress with a raven companion and bone talismans who peers into hidden cards.',
  l:'A savage beast driven by the full moon\'s fury, tearing apart cards on both sides of the table.',
  v:'An immortal blood lord who fills his dark chalice with the life force of his rivals.',
  u:'A many-armed cosmic entity gazing from beyond time and fate, capable of returning even from death.'
};
let HERO_LORE={...HERO_LORE_TR};
function zoomAv(p){const S=G,k=avKey(S,p),nm=NAMES[k]||(p?tr('Rakip','Opponent'):tr('Sen','You'));
  const initialSrc=HD_PORTRAITS[k]||((typeof HDAV!='undefined'&&HDAV[k])?HDAV[k]:avSrc(k));
  const lore=HERO_LORE[k]||'';
  zoom({src:initialSrc,cls:'sq',cap:`${nm} (${p==0?tr('Sen','You'):tr('Rakip','Opponent')})`,sub:lore,hd:cb=>{
    if(HD_PORTRAITS[k]){cb(HD_PORTRAITS[k]);return;}
    if(typeof HDAV!='undefined'&&HDAV[k]){cb(HDAV[k]);return;}
    const cs=[`img/av/${k}.jpg`,`img/av/${k}.png`,`img/av/${k}.webp`,`img/${k}.png`];
    hq('av_'+k+'_v3',cs,cb);
  }})}
function zoomCard(id){const S=G;let f=null;
  snd('tap');
  for(const p of [0,1])for(const kd of ['open','closed']){const c=S.pl[p][kd].find(x=>x.id==id);if(c)f={c,p,closed:kd=='closed'}}
  if(!f)return;const {c,p,closed}=f,own=p==0,up=!closed||S.rev||(own&&peek.has(id)); // kart yüzü açık mı?
  if(!up){ // kapalı kart: arka yüzü
    const initialSrc=(typeof HDBK!='undefined'&&HDBK)?HDBK:IMG.bn;
    return zoom({src:initialSrc,cls:'card',cap:own?tr('Senin kapalı kartın','Your hidden card'):tr('Rakibin kapalı kartı','Opponent\'s hidden card'),hd:backHD,
      btn:own&&!S.rev?tr('Kartıma bak','Peek at card'):'',fn:()=>{snd('flip');peek.add(id);flipId=id;R();setTimeout(()=>zoomCard(id),80)}})}
  const val=c.o!=null?c.o:c.n;
  const initialSrc=(typeof HDN!='undefined'&&HDN[c.n])?HDN[c.n]:IMG.n[c.n];
  zoom({src:initialSrc,cls:'card',cap:`${val}`,hd:numHD(c.n),
    sub:(closed?(own?tr('Senin kapalı kartın','Your hidden card'):tr('Rakibin kapalı kartı','Opponent\'s hidden card')):(own?tr('Senin açık kartın','Your open card'):tr('Rakibin açık kartın','Opponent\'s open card')))+(c.o!=null?tr(` (joker etkisiyle ${c.o} sayılıyor, kartın aslı ${c.n})`,` (counts as ${c.o} due to Joker effect, original value ${c.n})`):''),
    btn:closed&&own&&!S.rev?tr('Kartımı gizle','Hide card'):'',fn:()=>{snd('flip');peek.delete(id);R()}})}
function preview(id,use,note,back){ // jokeri büyük göster: Kullan / Kapat
  lock=true;snd('info');
  $('#mb').classList.remove('end-mode','an-mode','set-mode');
  $('#mb').innerHTML=`<img class="big" src="${IMG.j[id]}" alt="${J[id]}">${note?`<div class="pn">${note}</div>`:''}<div class="row">${use?`<button id="pu" class="btn alt">${tr('Kullan','Use')}</button>`:''}<button id="pc" class="btn">${tr('Kapat','Close')}</button></div>`;
  $('#m').hidden=false;hi($('#mb .big'),id);
  $('#pc').onclick=()=>{if(back)return back();$('#m').hidden=true;lock=false;if(G)R()};
  if(use)$('#pu').onclick=()=>{$('#m').hidden=true;lock=false;startJoker(id)};
}
function codex(){box(`<h3>${tr('Joker Kodeksi','Joker Codex')}</h3><div class="cdx">${range(24).map(i=>`<img src="${IMG.j[i]}" data-k="${i}" alt="${J[i]}">`).join('')}</div>`);
  document.querySelectorAll('#mb .cdx img').forEach(im=>{hi(im,+im.dataset.k);im.onclick=()=>preview(+im.dataset.k,false,BLOCK.has(+im.dataset.k)?tr('Etkisiz kılınabilir','Can be negated'):tr('Etkisiz kılınamaz','Cannot be negated'),codex)})}
function guide(){
  if(isEn()){
    return box(`<h3>How to Play</h3>
<div class="gd-wrap">
  <div class="gd-sec">
    <h4 class="gd-h">1. Core Goal</h4>
    <p class="gd">At the end of each round, bring the sum of your open and hidden number cards closer to the <b>target number</b> (default <b>21</b>) than your opponent without going over. Exceeding the target busts you; if both players bust, the round ends in a tie.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">2. Starting Hand &amp; Cards</h4>
    <p class="gd">Each round deals <b>1 open</b> and <b>1 hidden</b> number card from <b>1–11</b>. The player with the smaller open card acts first. Tap your own hidden card anytime to peek at its value; your opponent's hidden card stays secret until the round ends.</p>
    <p class="gd">Each player starts a duel with <b>4 Jokers</b> (the Sorcerer starts every duel with the <b>Thief</b> Joker as their 4th card). After a tied round, both players draw 1 new Joker.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">3. On Your Turn</h4>
    <ul class="gd-ul">
      <li><b>Chess Clock (33s):</b> Your clock ticks only on your turn (with a 5s grace period at the start of a round). Running out of time does not lose the game — it automatically passes your turn.</li>
      <li><b>Draw a Card:</b> Tap or drag from the deck to draw as many open number cards as you want.</li>
      <li><b>Play a Joker:</b> You may play up to <b>2 Jokers</b> per round (the Thief Joker ignores this limit). Drag a Joker onto the table or tap it and press <b>Use</b>.</li>
      <li><b>Hero Power:</b> If your hero has an active power, tap the emblem next to your portrait on your turn. Passive powers trigger automatically.</li>
      <li><b>Pass / End Round:</b> Passing after your opponent has passed (without drawing, playing a Joker, or using a power) becomes <b>End Round</b> and reveals all hidden cards.</li>
    </ul>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">4. Duels &amp; The Death Dice (D20)</h4>
    <p class="gd">Each duel is a best of <b>3 rounds</b> (win = <b>1</b> pt, tie = <b>0.5</b> pt). If points are tied after 3 rounds, the player with fewer remaining Jokers loses; if still tied, dice decide.</p>
    <p class="gd">The loser of a duel rolls the crimson <b>D20 Death Dice</b>. Rolling below the threshold means death and losing the match. The threshold rises after each survived duel: <b>4 → 8 → 14 → 18</b>.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">5. Table &amp; Center Seal</h4>
    <p class="gd">The center seal displays the current <b>target</b>. The red slot on the left holds your opponent's played Jokers; the green slot on the right holds yours. Hover or tap them to inspect their effects.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">6. Block Jokers <span class="gd-tag">Can Be Negated</span></h4>
    <p class="gd">Remain active on the table until the end of the round. Only this group can be cancelled with <b>Negate Joker</b>:</p>
    <ul class="gd-ul">
      <li><b>Odds ×2 / Evens ÷2:</b> Doubles all odd cards or halves all even cards on the table.</li>
      <li><b>+5 / −5:</b> Adds or subtracts 5 from your own total only.</li>
      <li><b>Target 27 / 24 / 17 / 15 &amp; Lowest wins:</b> Share the target slot; the most recently played replaces the previous one.</li>
      <li><b>Hidden cards = 0 / Hidden cards ×2:</b> Changes how hidden cards contribute to totals.</li>
      <li><b>Deck count ±:</b> Adds or subtracts the number of remaining cards in the deck from your total.</li>
      <li><b>Block opponent draw:</b> Prevents your opponent from drawing number cards this round.</li>
    </ul>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">7. Instant Jokers <span class="gd-tag alt">Cannot Be Negated</span></h4>
    <p class="gd">Resolve immediately and cannot be negated: <b>Opponent draws a card</b>, <b>Card → 0 / 12</b>, <b>Destroy own/opponent card</b>, <b>Swap open/hidden cards</b>, <b>Steal card</b>, <b>Gift card</b>, <b>Block opponent jokers</b>, <b>Negate Joker</b>, and the Sorcerer's <b>Thief</b>. Inspect all cards in the <b>Joker Codex</b>.</p>
  </div>
</div>`);
  }
  box(`<h3>Nasıl Oynanır</h3>
<div class="gd-wrap">
  <div class="gd-sec">
    <h4 class="gd-h">1. Temel Amaç</h4>
    <p class="gd">Her tur sonunda açık ve kapalı sayı kartlarının toplamını <b>hedef sayıya</b> (varsayılan <b>21</b>) rakibinden daha yakın tut. Hedefi aşarsan turu kaybedersin; iki taraf da hedefi aşarsa tur berabere biter.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">2. Başlangıç &amp; Kartlar</h4>
    <p class="gd">Her tur oyunculara <b>1–11</b> aralığından <b>1 açık</b> ve <b>1 kapalı</b> sayı kartı dağıtılır. Açık kartı daha küçük olan oyuncu tura başlar. Kendi kapalı kartına dokunarak değerine bakabilirsin; rakibin kapalı kartı tur sonuna kadar gizli kalır.</p>
    <p class="gd">Her oyuncunun elinde <b>4 joker</b> bulunur (Büyücü her düelloya 4. kart olarak <b>Hırsız</b> jokeriyle başlar). Berabere biten turlarda iki taraf da 1'er yeni joker çeker.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">3. Sıran Geldiğinde</h4>
    <ul class="gd-ul">
      <li><b>Satranç Saati (33 sn):</b> Sıra sendeyken yalnızca senin saatin akar (ilk düello ve geçişlerde 5 sn hazırlık süresi vardır). Süren biterse oyunu kaybetmezsin; sıran otomatik olarak pas geçer.</li>
      <li><b>Kart Çek:</b> Destedeki kartlara dokunarak veya sürükleyerek istediğin kadar açık kart çekebilirsin.</li>
      <li><b>Joker Oyna:</b> Bir turda en fazla <b>2 joker</b> oynayabilirsin (Hırsız jokeri bu limitten bağımsızdır). Kartı sürükleyip masaya bırakabilir veya tıklayıp <b>Oyna</b> diyebilirsin.</li>
      <li><b>Kahraman Gücü:</b> Aktif güce sahip bir kahramanın varsa, sıra sendeyken portre yanındaki güç düğmesinden kullanabilirsin. Pasif güçler otomatik çalışır.</li>
      <li><b>Pas / Turu Bitir:</b> Kart çekmeden, joker oynamadan ve aktif güç kullanmadan pas dersen düğme <b>Turu bitir</b> olur ve kapalı kartlar açılır (ilk tur hamlesi hariç).</li>
    </ul>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">4. Düello &amp; Ölüm Zarı (D20)</h4>
    <p class="gd">Her düello <b>3 turdan</b> oluşur (galibiyet <b>1</b>, beraberlik <b>0.5</b> puan). Puanlar eşitse elinde daha az joker kalan kaybeder; o da eşitse zar belirler.</p>
    <p class="gd">Kaybeden oyuncu kırmızı <b>D20 Ölüm Zarı</b> atar. Zar sonucu ölüm eşiğinin altında kalırsa ölür ve maçı kaybeder. Eşikler her yeni düelloda yükselir: <b>4 → 8 → 14 → 18</b>.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">5. Masa &amp; Orta Mühür</h4>
    <p class="gd">Ortadaki mühür güncel <b>hedefi</b> gösterir. Soldaki kırmızı alan rakibin, sağdaki yeşil alan senin masadaki aktif jokerlerini tutar. Üzerlerine dokunarak ne yaptıklarını görebilirsin.</p>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">6. Blok Jokerler <span class="gd-tag">Etkisiz Kılınabilir</span></h4>
    <p class="gd">Oynandıktan sonra tur sonuna kadar masada kalırlar. Yalnızca bu grup <b>Joker etkisiz</b> ile iptal edilebilir (iptal edilen kart soluklaşır):</p>
    <ul class="gd-ul">
      <li><b>Tekler ×2 / Çiftler ÷2:</b> Masadaki tüm tek/çift sayılı kartları etkiler.</li>
      <li><b>+5 / −5:</b> Yalnızca oynayanın toplamına eklenir veya çıkarılır.</li>
      <li><b>Hedef 27 / 24 / 17 / 15 &amp; En az kazanır:</b> Aynı hedef yuvasını paylaşır; son oynanan öncekinin yerine geçer.</li>
      <li><b>Kapalılar sayılmaz / Kapalılar ×2:</b> Kapalı kartların toplam etkisini değiştirir.</li>
      <li><b>Deste sayısı ±:</b> Destede kalan kart sayısını toplamına ekler veya çıkarır (deste azaldıkça güncellenir).</li>
      <li><b>Rakip kart çekemez:</b> Rakibin bu tur kart çekmesini engeller.</li>
    </ul>
  </div>
  <div class="gd-sec">
    <h4 class="gd-h">7. Anlık Jokerler <span class="gd-tag alt">Etkisiz Kılınamaz</span></h4>
    <p class="gd">Oynandığı anda etki eder, masada kalmaz ve iptal edilemez: <b>Rakip kart çeker</b>, <b>Kart → 0 / 12</b>, <b>Kendi/Rakip kartını imha</b>, <b>Açık/Kapalı kart takası</b>, <b>Kart çal</b>, <b>Kart hediye</b>, <b>Rakip joker kullanamaz</b>, <b>Joker etkisiz</b> ve Büyücü'ye özel <b>Hırsız</b>. Tüm detayları <b>Joker Kodeksi</b>'nde görebilirsin.</p>
  </div>
</div>`)}
function applyLang(lang){
  LANG=lang==='en'?'en':'tr';
  document.documentElement.lang=LANG;
  J=isEn()?[...J_EN]:[...J_TR];
  KTXT=isEn()?{...KTXT_EN}:{...KTXT_TR};
  HEROES=isEn()?[...HEROES_EN]:[...HEROES_TR];
  HERO_MAP=Object.fromEntries(HEROES.map(h=>[h.id,h]));
  NAMES=isEn()?{...NAMES_EN}:{...NAMES_TR};
  HERO_LORE=isEn()?{...HERO_LORE_EN}:{...HERO_LORE_TR};
  if(typeof IMG!=='undefined'&&IMG.j){
    const srcMap=isEn()?(IMG.j_en||IMG.j_tr):(IMG.j_tr||IMG.j);
    if(srcMap)Object.assign(IMG.j,srcMap);
    IMG.j[25]=isEn()?THIEF_SVG_EN:THIEF_SVG_TR;
  }
  hiPre=false;
  hiPreload();
  const spans=document.querySelectorAll('#mb2 .hs-plaque > span');
  if(spans[0])spans[0].textContent=tr('Yapay Zekaya Karşı','VS AI');
  if(spans[1])spans[1].textContent=tr('Çevrim İçi Düello','Online Duel');
  const dEasy=$('#mb2 .d[data-d="easy"]'),dMed=$('#mb2 .d[data-d="med"]'),dHard=$('#mb2 .d[data-d="hard"]'),dImp=$('#mb2 .d[data-d="imp"]');
  if(dEasy)dEasy.textContent=tr('Kolay','Easy');
  if(dMed)dMed.textContent=tr('Orta','Medium');
  if(dHard)dHard.textContent=tr('Zor','Hard');
  if(dImp)dImp.textContent=tr('İmkansız','Impossible');
  if($('#b2'))$('#b2').textContent=tr('Oda Oluştur','Create Room');
  if($('#code'))$('#code').placeholder=tr('ODA KODU','ROOM CODE');
  if($('#b3'))$('#b3').textContent=tr('Odaya Katıl','Join Room');
  if($('#b6'))$('#b6').textContent=tr('Ayarlar','Settings');
  if($('#btut'))$('#btut').textContent=tr('Eğitim (Karga Rehberi)','Tutorial (Raven Guide)');
  if($('#b4'))$('#b4').textContent=tr('Joker Kodeksi','Joker Codex');
  if($('#b5'))$('#b5').textContent=tr('Nasıl Oynanır','How to Play');
  if($('#b7'))$('#b7').textContent=tr('İngilizceye Geç','Türkçeye Geç');
  if($('#pass')&&!G)$('#pass').textContent=tr('Pas','Pass');
  if($('#sc-1'))$('#sc-1').title=tr('Rakibin Kalan Süresi','Opponent\'s Remaining Time');
  if($('#sc-0'))$('#sc-0').title=tr('Senin Kalan Süren','Your Remaining Time');
  if($('.side-clocks'))$('.side-clocks').setAttribute('aria-label',tr('Satranç Saati','Chess Clock'));
  if(typeof renderAuthBar==='function')renderAuthBar();
  if(G){
    if(MODE==='bot'&&sayT){sayT=''}
    R();
    if(MODE==='tutorial')tutRender();
  }
}
function toggleLang(){
  snd('click');
  applyLang(isEn()?'tr':'en');
}
let setTab='gameplay',prevVM=0.6,prevVS=0.8;
function settings(tab){
  if(tab)setTab=tab;
  if(setTab==='controls')setTab='gameplay';
  const inGame=$('#menu').hidden&&!!G;
  const isMuted=(VM<=0&&VS<=0);
  const langVal=isEn()?'English':'Türkçe';
  const langBtnTxt=isEn()?'Türkçe':'English';
  const tabsHtml=`<div class="set-tabs">
    <button type="button" class="set-tab${setTab==='gameplay'?' act':''}" data-stab="gameplay">${tr('Oynanış','Gameplay')}</button>
    <button type="button" class="set-tab${setTab==='audio'?' act':''}" data-stab="audio">${tr('Ses','Audio')}</button>
    <button type="button" class="set-tab${setTab==='display'?' act':''}" data-stab="display">${tr('Görünüm','Display')}</button>
  </div>`;
  let bodyHtml='';
  if(setTab==='gameplay'){
    const matchActs=inGame
      ?`<div class="set-act-grid" style="margin-top:6px">
          <button type="button" class="btn alt sm set-act-btn" id="sk">${tr('Joker Kodeksi','Joker Codex')}</button>
          <button type="button" class="btn alt sm set-act-btn" id="sg">${tr('Nasıl Oynanır','How to Play')}</button>
          ${MODE=='bot'?`<button type="button" class="btn alt sm set-act-btn" id="sa">${tr('Tekrar Oyna','Play Again')}</button>`:`<button type="button" class="btn alt sm set-act-btn" disabled style="opacity:.4;pointer-events:none">${tr('Çevrim İçi','Online')}</button>`}
          <button type="button" class="btn alt sm set-act-btn" id="sx">${tr('Ana Menü','Main Menu')}</button>
        </div>`
      :`<div class="set-act-grid" style="margin-top:6px">
          <button type="button" class="btn alt sm set-act-btn" id="sk">${tr('Joker Kodeksi','Joker Codex')}</button>
          <button type="button" class="btn alt sm set-act-btn" id="sg">${tr('Nasıl Oynanır','How to Play')}</button>
        </div>`;
    bodyHtml=`<div class="set-panel">
      <div class="set-sec-title">${tr('Genel Oynanış','General Gameplay')}</div>
      <div class="set-item">
        <div class="set-item-txt"><b>${tr('Oyun Dili','Language')}</b><small>${tr('Mevcut: ','Current: ')}${langVal}</small></div>
        <button type="button" class="btn alt sm set-inline-btn" id="slang">${langBtnTxt}</button>
      </div>
      <label class="set-item set-toggle">
        <div class="set-item-txt"><b>${tr('Titreşim (Mobil)','Vibration (Mobile)')}</b><small>${tr('Kart ve zar dokunsal geri bildirimi','Haptic feedback on cards & dice')}</small></div>
        <input type="checkbox" id="sv" ${VB?'checked':''}>
      </label>
      ${matchActs}
    </div>`;
  }else if(setTab==='audio'){
    bodyHtml=`<div class="set-panel">
      <div class="set-sec-title">${tr('Ses Seviyeleri','Audio Levels')}</div>
      <label class="set-item set-slider">
        <span>${tr('Müzik','Music')}</span>
        <input type="range" id="sm" min="0" max="1" step=".05" value="${VM}">
        <b id="sm-v">${Math.round(VM*100)}%</b>
      </label>
      <label class="set-item set-slider">
        <span>${tr('Efektler','Effects')}</span>
        <input type="range" id="ss" min="0" max="1" step=".05" value="${VS}">
        <b id="ss-v">${Math.round(VS*100)}%</b>
      </label>
      <label class="set-item set-toggle">
        <div class="set-item-txt"><b>${tr('Tümünü Sessize Al','Mute All Audio')}</b><small>${tr('Müzik ve efektleri tek tıkla kapat','Toggle all game sound on/off')}</small></div>
        <input type="checkbox" id="smute" ${isMuted?'checked':''}>
      </label>
    </div>`;
  }else{
    bodyHtml=`<div class="set-panel">
      <div class="set-sec-title">${tr('Görünüm & Erişilebilirlik','Display & Accessibility')}</div>
      <label class="set-item set-toggle">
        <div class="set-item-txt"><b>${tr('Hareketi Azalt','Reduce Motion')}</b><small>${tr('Yoğun ekran sarsıntısı ve parlamaları azaltır','Reduces heavy flashes and motion effects')}</small></div>
        <input type="checkbox" id="sr" ${RM?'checked':''}>
      </label>
      <label class="set-item set-toggle">
        <div class="set-item-txt"><b>${tr('Renk Körü Modu','Color-blind Mode')}</b><small>${tr('Kırmızı-yeşil yerine Mavi / Turuncu paleti','Blue / Orange palette for red-green clarity')}</small></div>
        <input type="checkbox" id="scb" ${CB?'checked':''}>
      </label>
    </div>`;
  }
  const footBtn=`<div class="set-footer"><button type="button" class="btn set-close-btn" id="pc">${inGame?tr('Oyuna Dön','Resume'):tr('Kapat','Close')}</button></div>`;
  box(`<h3>${tr('Ayarlar','Settings')}</h3>${tabsHtml}${bodyHtml}${footBtn}`, false);
  $('#mb').classList.add('set-mode');
  document.querySelectorAll('#mb .set-tab').forEach(b=>b.onclick=()=>{snd('click');settings(b.dataset.stab)});
  if($('#pc'))$('#pc').onclick=()=>{$('#mb').classList.remove('set-mode');$('#m').hidden=true;lock=false;if(G)R()};
  if($('#sm'))$('#sm').oninput=e=>{VM=+e.target.value;if(VM>0)prevVM=VM;LS('vm',VM);const v=$('#sm-v');if(v)v.textContent=Math.round(VM*100)+'%';const mu=$('#smute');if(mu)mu.checked=(VM<=0&&VS<=0);ac();MG.gain.value=VM*.22;if(FILE&&mel)mel.volume=Math.min(1,VM*.22)};
  if($('#ss')){$('#ss').oninput=e=>{VS=+e.target.value;if(VS>0)prevVS=VS;LS('vs',VS);const v=$('#ss-v');if(v)v.textContent=Math.round(VS*100)+'%';const mu=$('#smute');if(mu)mu.checked=(VM<=0&&VS<=0);ac();SG.gain.value=VS*.45};$('#ss').onchange=()=>snd('draw')}
  if($('#smute'))$('#smute').onchange=e=>{
    if(e.target.checked){if(VM>0)prevVM=VM;if(VS>0)prevVS=VS;VM=0;VS=0}
    else{VM=prevVM>0?prevVM:0.6;VS=prevVS>0?prevVS:0.8}
    LS('vm',VM);LS('vs',VS);ac();MG.gain.value=VM*.22;SG.gain.value=VS*.45;if(FILE&&mel)mel.volume=Math.min(1,VM*.22);
    settings('audio');
  };
  if($('#sr'))$('#sr').onchange=e=>{RM=e.target.checked;LS('rm',RM?1:0);document.body.classList.toggle('rm',RM)};
  if($('#scb'))$('#scb').onchange=e=>{CB=e.target.checked;LS('cb',CB?1:0);document.body.classList.toggle('cb',CB)};
  if($('#sv'))$('#sv').onchange=e=>{VB=e.target.checked;LS('vb',VB?1:0)};
  if($('#slang'))$('#slang').onclick=()=>{toggleLang();settings('gameplay')};
  if($('#sk'))$('#sk').onclick=codex;if($('#sg'))$('#sg').onclick=guide;
  if($('#sa'))$('#sa').onclick=()=>{
    botGen++;thinkOn=false;const c=$('#cast');if(c)c.remove();$('#mb').classList.remove('set-mode');$('#m').hidden=true;lock=false;P=null;
    G.over=true;chooseHero(hid=>{MY_HERO=hid;start()},()=>settings('gameplay'))};
  if($('#sx'))$('#sx').onclick=exitGame;
}
let leaving=false;
function peerLeft(msg){ // rakip çıktı: ana menüye ASLA doğrudan atma, yalnızca "Ana menüye dön" ile limbigames perdesi üzerinden gidilir
  if(leaving)return;
  try{conn=null}catch(e){}
  if(MODE=='spectator'){
    // İzleyiciyken oda kapandıysa veya bağlantı koptuysa:
    M(`${tr('Oda bağlantısı kesildi.','Room connection lost.')}<br><b>${tr('Yayın sona erdi.','Broadcast ended.')}</b>`,null,null,true);
    return;
  }
  if(!G){st(msg);return}              // henüz oyun yok (lobi): sadece bilgi yaz
  const c=$('#cast');if(c)c.remove();P=null;
  if(G.over){ // oyun zaten bitmişti: sonuç penceresi kalsın, not eklensin, yeniden oyna kalksın
    const mb=$('#mb');
    if(!$('#m').hidden&&mb){const o=$('#mo');if(o){const br=o.previousElementSibling;o.remove();if(br&&br.tagName=='BR')br.remove()}
      if(!mb.querySelector('.pl'))mb.insertAdjacentHTML('afterbegin',`<div class="pn pl">${msg}</div>`);
      if(!$('#mx')){mb.insertAdjacentHTML('beforeend',`<br><br><button id="mx" class="btn alt">${tr('Ana menüye dön','Return to Main Menu')}</button>`);$('#mx').onclick=exitGame}
      lock=true;return}
  }
  G.over=true;botGen++;thinkOn=false;waitM=false;
  M(`${msg}<br><b>${tr('Oyunu sen kazandın.','You won the game.')}</b>`,null,null,true);snd('win');
}
function exitGame(){ // limbigames perdesi, sonra ilk ekrana dön
  if(entering)return;entering=true;leaving=true;botGen++;thinkOn=false;
  tutClear();
  const c=$('#cast');if(c)c.remove();$('#m').hidden=true;lock=true;P=null;
  veil(3400);
  setTimeout(()=>{
    try{if(conn)conn.close()}catch(e){}
    try{spectators.forEach(s=>{try{s.close()}catch(err){}})}catch(e){}
    try{if(peer)peer.destroy()}catch(e){}
    conn=null;spectators=[];peer=null;waitM=false;specCount=0;
    if(G)G.over=true;G=null;MODE='bot';sayT='';try{document.body.classList.remove('dead')}catch(e){}
    st('');$('#menu').hidden=false;lock=false;setMusic('menu');
  },1050);
  setTimeout(()=>{entering=false},3000);
}
document.addEventListener('click',e=>{
  const jClick=e.target.closest&&e.target.closest('#hand .j[data-j]');
  if(!jClick){
    document.querySelectorAll('#hand .j.pinned').forEach(el=>el.classList.remove('pinned'));
  }
  const S=G,t=e.target.closest&&e.target.closest('[data-c],[data-e],[data-j],[data-s],[data-x],[data-g],[data-av],[data-hp],[data-hp-id]');
  if(lock||!t)return;
  if(t.dataset.g)return settings();
  if(!S||S.over)return;
  if(t.dataset.hpId){
    if(window.matchMedia&&window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches){
      const hid=t.dataset.hpId,side=+t.dataset.hpSide,h=HERO_MAP[hid];
      if(!h)return;
      const isUsed=t.classList.contains('used'),isReady=t.classList.contains('ready');
      const cw=hid==='c'?Math.min(4,(S.cWins&&S.cWins[side])||0):0;
      const tagTxt=hid==='c'?tr(`Aktif · Galibiyet: ${cw}/4`,`Active · Wins: ${cw}/4`):(h.passive?(isUsed?tr('Pasif · Tükendi','Passive · Spent'):tr('Pasif','Passive')):(isUsed?tr('Aktif, Kullanıldı','Active, Used'):tr('Aktif, Her Düelloda 1 Kez','Active, Once per Duel')));
      const canUse=side===0&&!h.passive&&isReady&&S.turn===0&&!S.wait&&MODE!=='spectator'&&!P;
      const thiefCard=hid==='s'&&IMG.j[25]?`<img class="hp-mc-jcard" src="${IMG.j[25]}" alt="${tr('Hırsız','Thief')}">`:'';
      box(`<div class="hp-mobile-card ${side===1?'opp':'mine'}${h.passive?' passive':''}${isUsed?' used':''}"><div class="hp-mc-ic">${HP_IC[hid]||HP_IC.c}</div><div class="hp-tip-title">${h.hpName}</div><div class="hp-tip-tag">${tagTxt}</div><p class="hp-tip-desc">${h.desc}</p>${thiefCard}${canUse?`<div class="row"><button id="hp-mob-use" class="btn alt">${tr('Kullan','Use')}</button><button id="pc" class="btn">${tr('Kapat','Close')}</button></div>`:''}</div>`, !canUse);
      if(canUse){
        $('#hp-mob-use').onclick=()=>{$('#m').hidden=true;lock=false;useHeroPower()};
        $('#pc').onclick=()=>{$('#m').hidden=true;lock=false;R()};
      }
      return;
    }
    if(t.dataset.hp)return useHeroPower();
    return;
  }
  const k=P&&P.ks[P.pk.length],c=+t.dataset.c,u=+t.dataset.e;
  if(t.dataset.x){P=null;return R()}
  if(t.dataset.s)return pick(+t.dataset.s);
  if(P){ // hedef seçimi
    if(k=='hand_j'&&t.dataset.jidx!=null)return pick(+t.dataset.jidx);
    if(t.dataset.c&&k!='eff'&&k!='steal_j'&&opts(S,0,k).includes(c))pick(c);
    else if(t.dataset.e&&(k=='eff'||k=='steal_j')&&opts(S,0,k).includes(u))pick(u);
    return;
  }
  if(t.dataset.c&&t.dataset.pk){
    if(MODE==='tutorial'&&tutStep!==1)return;
    snd('flip');
    if(peek.has(c))peek.delete(c);else peek.add(c);
    flipId=c;
    R();
    if(MODE==='tutorial'&&tutStep===1)tutAdvance('peek');
    return;
  }
  if(t.dataset.e){
    if(window.matchMedia&&window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches){
      if(window.showUsedJokerInspect)window.showUsedJokerInspect(u,true);
    }
    return;
  }
  if(t.dataset.j){
    if(window._suppressJokerClick)return;
    const id=+t.dataset.j;
    const isMobView=window.matchMedia&&window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
    if(MODE==='tutorial'){
      if(tutStep!==3||id!==3)return;
      if(isMobView){
        document.querySelectorAll('#hand .j.pinned,#hand .j.hovered').forEach(el=>el.classList.remove('pinned','hovered'));
        return startJoker(id);
      }
      return; // masaüstünde sadece sürükleyerek oynanır
    }
    if(isMobView){
      const canUse=S.turn==0&&!S.wait&&MODE!=='spectator'&&playable(S,0,id);
      return preview(id,canUse,BLOCK.has(id)?tr('Etkisiz kılınabilir','Can be negated'):tr('Etkisiz kılınamaz','Cannot be negated'));
    }
    // Masaüstünde tıklayarak joker oynanmaz; basılı tutup masaya sürükleyerek oynanır
    return;
  }
});
function drawFromDeck(){const S=G;if(!S||S.turn||lock||P||!canDraw(S,0))return;if(MODE==='tutorial'&&tutStep!==2)return;recMove(S,{t:'d'},tr('Kart Çek','Draw Card'));snd('draw');if(MODE=='guest')return conn.send({k:'draw'});S.graceLeft=0;lrnAct(S,'d');if(S.botScry&&S.botScry.length)S.botScry.shift();const c=S.deck.pop();S.pl[0].open.push(c);if(S.stats&&S.stats.draws)S.stats.draws[0]++;S.acted=true;S.log.push({p:0,t:`kart çekti (${c.n})`});R();if(MODE==='tutorial'&&tutStep===2)tutAdvance('draw')}
$('#pass').onclick=()=>{if(G.turn==0&&!lock&&!P){if(MODE==='tutorial'&&tutStep!==7)return;recMove(G,null,$('#pass').textContent||tr('Pas','Pass'));if(MODE=='guest')conn.send({k:'pass'});else{lrnAct(G,'p');pass();if(MODE==='tutorial'&&tutStep===7)tutClearHighlights()}}};

/* ---------- ONLINE (PeerJS) ---------- */
let MODE='bot',peer,conn,spectators=[],specCount=0,waitM=false,rematchReady=[false,false],rematchHeroes=[null,null],deathContReady=[false,false],deathContGo=null;
function showDeathContWait(){
  box(`<h3>${tr('Hazırsın','Ready')}</h3><p>${tr('Rakibin devam etmesi bekleniyor…','Waiting for opponent to continue…')}</p>`,false);
}
function checkDeathCont(){
  if(deathContReady[0]&&deathContReady[1]){
    const goFn=deathContGo;
    deathContReady=[false,false];deathContGo=null;
    $('#m').hidden=true;lock=false;
    if(goFn)goFn();
  }else if(deathContReady[0]){
    showDeathContWait();
  }
}
function showRematchWait(msg){
  box(`<h3>${tr('Hazırsın','Ready')}</h3><p>${msg}</p><div class="row"><button id="rm-exit" class="btn alt">${tr('Ana menüye dön','Return to Main Menu')}</button></div>`,false);
  const ex=$('#rm-exit');if(ex)ex.onclick=exitGame;
}
function checkStartOnlineRematch(){
  if(rematchReady[0]&&rematchReady[1]){
    MY_HERO=rematchHeroes[0]||MY_HERO;
    OPP_HERO=rematchHeroes[1]||OPP_HERO;
    rematchReady=[false,false];rematchHeroes=[null,null];
    $('#m').hidden=true;lock=false;start();
  }else if(rematchReady[0]){
    showRematchWait(tr('Rakibin "Yeniden oyna" demesi ve kahraman seçmesi bekleniyor…','Waiting for opponent to click "Play Again" and choose a hero…'));
  }
}
const MAX_SPECTATORS = 5;
function view(S){ // rakibe gidecek, gizli bilgisi temizlenmiş ve aynalanmış durum
  const f=a=>[a[1],a[0]],pk1=S.oppPeek1||[];
  const hu0=S.hpUsed?!!S.hpUsed[0]:false,hu1=S.hpUsed?!!S.hpUsed[1]:false;
  const visHu0=(avKey(S,0)==='w'||avKey(S,0)==='a')?false:hu0;
  return {av:f(S.av),hero:S.hero?f(S.hero):f(S.av),hpUsed:[hu1,visHu0],hpMod:S.hpMod?f(S.hpMod):[0,0],plagueMod:S.plagueMod?f(S.plagueMod):[0,0],hpTgMod:S.hpTgMod||0,uRevived:S.uRevived?f(S.uRevived):[false,false],vampUsed:S.vampUsed?f(S.vampUsed):[false,false],cWins:S.cWins?f(S.cWins):[0,0],vampWinSide:S.vampWinSide>=0?1-S.vampWinSide:-1,oppPeek:pk1,mast:f(S.mast),turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:1-S.turn,clocks:S.clocks?f(S.clocks):[ONLINE_CLOCK_INIT,ONLINE_CLOCK_INIT],clockMax:S.clockMax||ONLINE_CLOCK_INIT,graceLeft:S.graceLeft||0,timeOut:S.timeOut?f(S.timeOut):[false,false],hadTimeout:!!S.hadTimeout,pts:f(S.pts),rev:S.rev,winSide:S.winSide==null?null:-S.winSide,res:(S.res||[]).map(x=>-x),jUsed:f(S.jUsed),jTurn:S.jTurn?f(S.jTurn):[0,0],noJ:f(S.noJ),
    hand:[S.hand[1],S.hand[0].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[S.pl[1],{open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:(S.rev||pk1.includes(c.id))?c.n:0,o:c.o,hpImmune:!!c.hpImmune}))}],
    eff:S.eff.map(e=>({...e,o:1-e.o})),pj:(S.pj||[]).map(e=>({...e,o:1-e.o})),log:S.log.slice(-6).map(l=>({...l,p:l.p<0?-1:1-l.p}))};
}
function specView(S){ // izleyicilere gidecek durum (0 = host/oda sahibi, 1 = misafir oyuncu, kapalı kartlar rev olmadan görünmez)
  return {
    av:[S.av[0],S.av[1]],hero:S.hero?[...S.hero]:[S.av[0],S.av[1]],hpUsed:S.hpUsed?[...S.hpUsed]:[false,false],hpMod:S.hpMod?[...S.hpMod]:[0,0],plagueMod:S.plagueMod?[...S.plagueMod]:[0,0],hpTgMod:S.hpTgMod||0,uRevived:S.uRevived?[...S.uRevived]:[false,false],vampUsed:S.vampUsed?[...S.vampUsed]:[false,false],cWins:S.cWins?[...S.cWins]:[0,0],vampWinSide:S.vampWinSide>=0?S.vampWinSide:-1,mast:[S.mast[0],S.mast[1]],turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:S.turn,clocks:S.clocks?[...S.clocks]:[ONLINE_CLOCK_INIT,ONLINE_CLOCK_INIT],clockMax:S.clockMax||ONLINE_CLOCK_INIT,graceLeft:S.graceLeft||0,timeOut:S.timeOut?[...S.timeOut]:[false,false],hadTimeout:!!S.hadTimeout,pts:S.pts,rev:S.rev,winSide:S.winSide,res:S.res,jUsed:S.jUsed,jTurn:S.jTurn?[...S.jTurn]:[0,0],noJ:S.noJ,
    hand:[S.hand[0].map(()=>0),S.hand[1].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[
      {open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:S.rev?c.n:0,o:c.o,hpImmune:!!c.hpImmune}))},
      {open:S.pl[1].open,closed:S.pl[1].closed.map(c=>({id:c.id,n:S.rev?c.n:0,o:c.o,hpImmune:!!c.hpImmune}))}
    ],
    eff:S.eff.map(e=>({...e})),pj:(S.pj||[]).map(e=>({...e})),log:S.log.slice(-6).map(l=>({...l}))
  };
}
function note(p,id,cb){
  if(MODE=='host'){
    if(conn&&conn.open)conn.send({k:'j',p:1-p,id});
    spectators.forEach(s=>{try{if(s.open)s.send({k:'j',p,id})}catch(e){}});
    R();
  }
  cast(p,id,cb);
}
function onGuest(m, fromConn){ // host: misafirin istekleri veya izleyiciden gelen mesajlar
  if(m.k=='query_slots'){
    const guestBusy = !!(conn && conn.open);
    fromConn.send({
      k: 'slots_info',
      slots: {
        p0: { name: tr('1. Oyuncu','Player 1'), hero: MY_HERO||'t', role: tr('Oda Sahibi','Room Host'), busy: true },
        p1: { name: tr('2. Oyuncu','Player 2'), hero: guestBusy?(OPP_HERO||'c'):'c', role: tr('Misafir Oyuncu','Guest Player'), busy: guestBusy }
      },
      specCount: spectators.length
    });
    return;
  }
  if(m.k=='join_as'){
    if(m.role=='player'){
      if(!conn || !conn.open){
        conn = fromConn;
        fromConn._role = 'player';
        OPP_HERO = (m.hero && HERO_MAP[m.hero]) ? m.hero : 'c';
        fromConn.send({k:'role', role:'player'});
        const ls=$('#lobbyStatus');if(ls)ls.textContent=tr('Rakip bağlandı! Oyun başlıyor…','Opponent connected! Starting game…');
        setTimeout(()=>{
          $('#m').hidden=true;lock=false;
          enter(start);
        },600);
        fromConn.on('close',()=>peerLeft(tr('Rakip oyundan ayrıldı.','Opponent left the game.')));
      }else{
        // Oyuncu slotu dolmuş, mecburen izleyiciye al veya bilgi ver
        fromConn.send({k:'slot_full'});
      }
    }else if(m.role=='spectator'){
      if(spectators.length >= MAX_SPECTATORS){
        fromConn.send({k:'spec_full', max: MAX_SPECTATORS});
        return;
      }
      fromConn._role = 'spectator';
      spectators.push(fromConn);
      fromConn.send({k:'role', role:'spectator'});
      if(G) fromConn.send({k:'s', v:specView(G), specCount:spectators.length});
      fromConn.on('close',()=>{
        spectators=spectators.filter(x=>x!==fromConn);
        if(G)R();
      });
    }
    return;
  }
  if(m.k=='emote'&&EMOTE_SET.has(m.e)){
    showEmote(1,m.e);
    spectators.forEach(s=>{try{if(s.open)s.send({k:'emote',e:m.e,side:1})}catch(e){}});
    return;
  }

  if(m.k=='rematch_ready'){
    if(fromConn!==conn)return;
    rematchReady[1]=true;
    rematchHeroes[1]=(m.hero&&HERO_MAP[m.hero]&&!HERO_MAP[m.hero].bossOnly)?m.hero:'c';
    checkStartOnlineRematch();
    return;
  }
  if(m.k=='death_cont'){
    if(fromConn!==conn)return;
    deathContReady[1]=true;
    checkDeathCont();
    return;
  }
  if(m.k=='tie_roll'){
    if(fromConn!==conn)return;
    if(window._triggerTieRoll)window._triggerTieRoll();
    spectators.forEach(s=>{try{if(s.open)s.send({k:'tie_roll'})}catch(e){}});
    return;
  }

  const S=G;if(!S||S.over||S.wait||S.turn!=1)return;
  if(fromConn !== conn) return; // Hamleleri sadece aktif rakip (conn) yapabilir!
  if(m.k=='draw'){if(!canDraw(S,1))return;S.graceLeft=0;const c=S.deck.pop();S.pl[1].open.push(c);if(S.stats&&S.stats.draws)S.stats.draws[1]++;S.acted=true;S.log.push({p:1,t:`kart çekti (${c.n})`});R()}
  else if(m.k=='pass')pass();
  else if(m.k=='play'){
    const id=m.id,ks=NEED[id]||[],pk=m.pk||[];
    if(!playable(S,1,id)||pk.length!=ks.length||!ks.every((k,i)=>opts(S,1,k).includes(pk[i])))return;
    S.graceLeft=0;play(S,1,id,pk);S.acted=true;S.log.push({p:1,t:`joker oynadı: ${J[id]}`});note(1,id,R);
  }
  else if(m.k=='hp_scry'){
    S.hpUsed=S.hpUsed||[false,false];
    if(avKey(S,1)!=='a'||S.hpUsed[1]||!S.deck.length)return;
    S.hpUsed[1]=true;S.graceLeft=0;
    const n=S.deck.length,c1=S.deck[n-1],c2=n>1?S.deck[n-2]:null;
    fromConn.send({k:'hp_scry_res',c1,c2});
    R();
  }
  else if(m.k=='hp_scry_done'){
    if(avKey(S,1)!=='a')return;
    const n=S.deck.length;
    if(m.swap&&n>1){const tmp=S.deck[n-1];S.deck[n-1]=S.deck[n-2];S.deck[n-2]=tmp}
    R();
  }
  else if(m.k=='hp_rewind'){
    if(avKey(S,1)!=='c'||!(S.cWins&&S.cWins[1]>=4))return;
    execRewind(S,1);
  }
  else if(m.k=='hp_peek'){
    S.hpUsed=S.hpUsed||[false,false];
    if(avKey(S,1)!=='w'||S.hpUsed[1]||!S.pl[0].closed.length)return;
    S.oppPeek1=S.pl[0].closed.map(c=>c.id);
    S.hpUsed[1]=true;
    R();
  }
  else if(m.k=='hp_plague'){
    S.hpUsed=S.hpUsed||[false,false];
    if(avKey(S,1)!=='p'||S.hpUsed[1])return;
    const idx=m.idx|0;
    if(idx<0||idx>=S.hand[1].length||!S.jdeck.length)return;
    S.hand[1].splice(idx,1);
    const drawn=[];
    for(let k=0;k<2&&S.jdeck.length;k++){
      const rIdx=Math.floor(Math.random()*S.jdeck.length);
      drawn.push(S.jdeck.splice(rIdx,1)[0]);
    }
    S.hand[1].push(...drawn);
    S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:`Vebalı Takas kullandı (1 joker yaktı, ${drawn.length} joker çekti)`});
    R();
  }
  else if(m.k=='hp_alch'){
    if(avKey(S,1)!=='a'||(S.hpUsed&&S.hpUsed[1])||!S.pl[1].open.length||!S.deck.length)return;
    const idx=S.pl[1].open.length-1,old=S.pl[1].open[idx],rep=S.deck.pop();
    S.pl[1].open[idx]=rep;S.deck.push(old);
    S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:'Dönüşüm İksiri kullandı'});
    R();
  }
  else if(m.k=='hp_witch'){
    S.hpUsed=S.hpUsed||[false,false];
    if(avKey(S,1)!=='w'||S.hpUsed[1])return;
    const dlt=m.delta>0?3:-3;
    S.hpTgMod=(S.hpTgMod||0)+dlt;S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:`Kara Büyü kullandı (Hedef ${dlt>0?'+3':'−3'} → ${tg(S)})`});
    R();
  }
  else if(m.k=='hp_wolf'){
    S.hpUsed=S.hpUsed||[false,false];
    if(avKey(S,1)!=='l'||S.hpUsed[1])return;
    execWolf(S,1);
  }
  else if(m.k=='hp_vamp'){
    S.hpUsed=S.hpUsed||[false,false];
    if(avKey(S,1)!=='v'||S.hpUsed[1])return;
    S.hpMod[0]=(S.hpMod[0]||0)-2;S.hpMod[1]=(S.hpMod[1]||0)+2;
    S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:'Kan Emici kullandı (Rakipten 2 çaldı)'});
    R();
  }
}
function onHost(m){ // misafir veya izleyici: host'tan gelen durum/bildirimler
  if(m.k=='slots_info'){
    showJoinModal(m.slots, m.specCount);
    return;
  }
  if(m.k=='slot_full'){
    st(tr('Oyuncu slotu doldu! İzleyici olarak katılabilirsin.','Player slot is full! You can join as a spectator.'));
    const btnP = $('#btnJoinPlayer');
    if(btnP){ btnP.disabled = true; btnP.textContent = tr('Dolu','Full'); }
    return;
  }
  if(m.k=='spec_full'){
    st(tr(`İzleyici slotu dolu! En fazla ${m.max||5} izleyici katılabilir.`,`Spectator slots are full! Up to ${m.max||5} spectators can join.`));
    const btnS = $('#btnJoinSpec');
    if(btnS){ btnS.disabled = true; btnS.textContent = `${tr('İzleyici Dolu','Spectators Full')} (${m.max||5}/${m.max||5})`; }
    return;
  }
  if(m.k=='role'){
    $('#m').hidden = true; lock = false;
    if(m.role=='spectator'){
      MODE='spectator';
      st(tr('Odaya izleyici olarak katıldın.','Joined room as spectator.'));
      veil();setMusic('game');
    }else if(m.role=='player'){
      MODE='guest';
      st(tr('Odaya oyuncu olarak katıldın.','Joined room as player.'));
      veil();setMusic('game');
    }
    return;
  }
  if(m.k=='emote'&&EMOTE_SET.has(m.e)){
    const s=MODE==='spectator'?(m.side===1?1:0):1;
    showEmote(s,m.e);
    return;
  }
  if(m.k=='s'){
    if(m.specCount!=null)specCount=m.specCount;
    const prevRev=G&&G.rev,prevWin=G?G.winSide:null;
    if(!G||(G.over&&!m.v.over))LAST_MATCH_HIST=[];
    G=m.v;if(!G.over){try{document.body.classList.remove('dead')}catch(e){}}
    if(G.rev&&!prevRev)snd('flip');
    if(G.winSide!=null&&prevWin==null){
      snd(G.winSide>0?'win':G.winSide<0?'lose':'ok');
      const winW=G.winSide;
      setTimeout(()=>{if(G&&G.winSide===winW){if(G.vampWinSide>=0){const btn=document.querySelector(G.vampWinSide===0?'#me .hp-btn':'#opp .hp-btn');if(btn){const hr=btn.getBoundingClientRect(),fx=document.createElement('div');fx.className='hp-cast-fx'+(G.vampWinSide===1?' opp':'');fx.style.left=(hr.left+hr.width/2)+'px';fx.style.top=(hr.top+hr.height/2)+'px';fx.innerHTML=`<i class="hp-cast-ring"></i><span class="hp-cast-pop">${tr('Kanla Mühürlenen Kader!','Blood-Sealed Fate!')}</span>`;document.body.appendChild(fx);setTimeout(()=>fx.remove(),1350);}heroClash();}else if(winW!==0)heroAttack(winW>0?0:1);else heroClash();}},1000);
      setTimeout(()=>{if(G&&G.winSide===winW)dustTableCards();},3400);
    }
    if(waitM){$('#m').hidden=true;lock=false;waitM=false}
    if(MODE!='spectator'&&(G.turn!=0||G.wait))P=null;
    if(!$('#menu').hidden)setTimeout(()=>{$('#menu').hidden=true},1500);
    setMusic('game');R();
  }
  else if(m.k=='m'){
    waitM=true;
    if(m.end&&MODE==='guest'){
      M(m.html,tr('Yeniden oyna','Play Again'),()=>chooseHero(hid=>{
        MY_HERO=hid;waitM=true;
        if(conn&&conn.open)conn.send({k:'rematch_ready',hero:hid});
        showRematchWait(tr('Rakibin "Yeniden oyna" demesi ve kahraman seçmesi bekleniyor…','Waiting for opponent to click "Play Again" and choose a hero…'));
      },exitGame),true);
    }else if(!m.end&&m.btn&&MODE==='guest'){
      M(m.html,m.btn,()=>{
        waitM=true;
        if(conn&&conn.open)conn.send({k:'death_cont'});
        showDeathContWait();
      },false);
    }else{
      M(m.html,null,null,m.end);
    }
    snd(m.sd);
  }
  else if(m.k=='tie_roll'){
    if(window._triggerTieRoll)window._triggerTieRoll();
  }
  else if(m.k=='wolf_claw'){
    if(Array.isArray(m.ids))playWolfClawFx(m.ids);
  }
  else if(m.k=='j')cast(m.p,m.id,R);
  else if(m.k=='hp_scry_res'){
    showScryModal(m.c1,m.c2,()=>{if(conn&&conn.open)conn.send({k:'hp_scry_done',swap:false})},()=>{if(conn&&conn.open)conn.send({k:'hp_scry_done',swap:true})});
  }
}
const st=t=>$('#st').textContent=t;
const NETERR=e=>({'network':1,'server-error':1,'socket-error':1,'socket-closed':1})[e.type]?tr('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.','Could not reach the server. Check your internet connection.'):e.type=='peer-unavailable'?tr('Oda bulunamadı','Room not found'):tr('Hata: ','Error: ')+e.type;
const noNet=()=>{if(typeof Peer=='undefined'||navigator.onLine===false){MODE='bot';st(tr('Online mod için internet bağlantısı gerekli. Bilgisayara karşı oynayabilirsin.','An internet connection is required for Online mode. You can play against the AI.'));return true}return false};
function hostRoom(){
  if(noNet())return;
  MODE='host';leaving=false;sayT='';spectators=[];specCount=0;const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
  st(tr('Oda oluşturuluyor…','Creating room…'));
  peer=new Peer('necrodice-'+code);
  
  const showLobby=()=>{
    box(`
      <div class="lobby-box">
        <h3 style="margin-bottom:8px">${tr('Çevrim İçi Lobi','Online Lobby')}</h3>
        <p style="color:var(--bone);font-size:20px;margin-bottom:14px">${tr('Bu kodu arkadaşına ilet:','Share this code with your friend:')}</p>
        <div class="lobby-code-badge" id="lobbyCodeBox" title="${tr('Kodu Kopyala','Copy Code')}">
          <span class="lobby-lbl">${tr('ODA KODU','ROOM CODE')}</span>
          <b class="lobby-code">${code}</b>
          <span class="lobby-copy-hint">${tr('kopyalamak için tıkla','click to copy')}</span>
        </div>
        <div class="lobby-spinner"><i></i><i></i><i></i></div>
        <p id="lobbyStatus" style="font-size:18px;color:#a0b8a4;margin-top:12px">${tr('Bağlantı açık · Rakip bekleniyor','Connection open · Waiting for opponent')}</p>
      </div>
    `, true);

    const cb=$('#lobbyCodeBox');
    if(cb){
      cb.onclick=()=>{
        try{
          navigator.clipboard.writeText(code);
          const h=cb.querySelector('.lobby-copy-hint');
          if(h){h.textContent=tr('Kopyalandı!','Copied!');setTimeout(()=>h.textContent=tr('kopyalamak için tıkla','click to copy'),2000)}
        }catch(e){}
      };
    }

    const pc=$('#pc');
    if(pc){
      pc.textContent=tr('Lobiyi Kapat','Close Lobby');
      pc.onclick=()=>{
        try{if(peer)peer.destroy()}catch(e){}
        peer=null;conn=null;spectators=[];MODE='bot';
        $('#m').hidden=true;lock=false;st('');
      };
    }
  };

  peer.on('open',()=>{
    st(tr('Oda kodu: ','Room code: ')+code+tr(' — rakip bekleniyor…',' — waiting for opponent…'));
    showLobby();
  });

  peer.on('error',e=>{
    if(e.type=='unavailable-id'){
      try{peer.destroy()}catch(err){}
      hostRoom();
    }else{
      st(NETERR(e));
      const ls=$('#lobbyStatus');if(ls)ls.textContent=NETERR(e);
    }
  });

  peer.on('connection',c=>{
    c.on('data', m => onGuest(m, c));
  });
}
function showJoinModal(slots, specCount){
  const p0 = slots.p0, p1 = slots.p1;
  const p1Free = !p1.busy;
  const specFree = (specCount || 0) < MAX_SPECTATORS;
  const currentCode = $('#code') ? $('#code').value.trim().toUpperCase() : '';
  const p0DispName = isEn() ? 'Player 1' : '1. Oyuncu';
  const p0DispRole = isEn() ? 'Room Host' : 'Oda Sahibi';
  const p1DispName = isEn() ? 'Player 2' : '2. Oyuncu';
  const p1DispRole = isEn() ? 'Guest Player' : 'Misafir Oyuncu';
  
  box(`
    <div class="join-modal">
      <h3 style="margin-bottom:6px">${tr('Odaya Katıl','Join Room')}</h3>
      <span class="join-code-tag">${currentCode}</span>
      <p style="font-size:18px;color:var(--bone);margin-bottom:8px">${tr('Mevcut oyuncu slotları:','Available player slots:')}</p>
      
      <div class="slot-list">
        <div class="slot-card">
          <div class="slot-info">
            <img class="slot-av" src="${avSrc(p0.hero||'c')}" alt="${p0DispName}">
            <div class="slot-names">
              <b>${p0DispName}</b>
              <small>${p0DispRole}</small>
            </div>
          </div>
          <span class="slot-status busy">${tr('DOLU','FULL')}</span>
        </div>
        
        <div class="slot-card">
          <div class="slot-info">
            <img class="slot-av" src="${avSrc(p1.hero||'c')}" alt="${p1DispName}">
            <div class="slot-names">
              <b>${p1DispName}</b>
              <small>${p1DispRole}</small>
            </div>
          </div>
          <span class="slot-status ${p1Free?'free':'busy'}">${p1Free?tr('BOŞ','OPEN'):tr('DOLU','FULL')}</span>
        </div>
      </div>
      
      <div class="slot-actions">
        <button id="btnJoinPlayer" class="btn ${p1Free?'':'dim'}" ${p1Free?'':'disabled'}>
          ${p1Free?tr('Oyuncu Olarak Katıl','Join as Player'):tr('Oyuncu Slotu Dolu','Player Slot Full')}
        </button>
        <button id="btnJoinSpec" class="btn alt ${specFree?'':'dim'}" ${specFree?'':'disabled'}>
          ${specFree ? `${tr('İzleyici Olarak Katıl','Join as Spectator')} (${specCount||0}/${MAX_SPECTATORS})` : `${tr('İzleyici Dolu','Spectators Full')} (${MAX_SPECTATORS}/${MAX_SPECTATORS})`}
        </button>
      </div>
    </div>
  `, true);

  const bp = $('#btnJoinPlayer');
  if(bp && p1Free){
    bp.onclick = () => {
      chooseHero(h => {
        MY_HERO = h;
        if(conn && conn.open){
          st(tr('Odaya katılınıyor…','Joining room…'));
          conn.send({k:'join_as', role:'player', hero:h});
        }
      }, () => {
        if(conn && conn.open) showJoinModal(slots, specCount);
      });
    };
  }

  const bs = $('#btnJoinSpec');
  if(bs && specFree){
    bs.onclick = () => {
      bs.disabled = true;
      bs.textContent = tr('İzleyici olarak giriliyor…','Joining as spectator…');
      if(conn && conn.open) conn.send({k:'join_as', role:'spectator'});
    };
  }

  const pc = $('#pc');
  if(pc){
    pc.textContent = tr('Vazgeç','Cancel');
    pc.onclick = () => {
      try{if(conn)conn.close()}catch(e){}
      try{if(peer)peer.destroy()}catch(e){}
      conn = null; peer = null; MODE = 'bot';
      $('#m').hidden = true; lock = false; st('');
    };
  }
}

function joinRoom(){
  if(noNet())return;
  const code=$('#code').value.trim().toUpperCase();if(!code)return st(tr('Oda kodunu yaz','Enter room code'));
  leaving=false;sayT='';st(tr('Odaya bağlanılıyor…','Connecting to room…'));peer=new Peer();
  peer.on('open',()=>{
    conn=peer.connect('necrodice-'+code,{reliable:true});
    conn.on('data',onHost);
    conn.on('open',()=>{
      st(tr('Oda bulundu. Slot durumu alınıyor…','Room found. Fetching slots…'));
      conn.send({k:'query_slots'});
    });
    conn.on('close',()=>peerLeft(tr('Oda sahibi oyundan ayrıldı.','Room host left the game.')));
  });
  peer.on('error',e=>st(NETERR(e)));
}
const on=(id,f)=>{const e=document.querySelector(id);if(e)e.onclick=f}; // bir öğe yoksa diğer düğmeler yine de çalışır
document.querySelectorAll('.d').forEach(b=>b.onclick=()=>{DIFF=b.dataset.d;MODE='bot';chooseHero(h=>{MY_HERO=h;enter(start)})});
on('#btut',()=>{MODE='tutorial';MY_HERO='p';OPP_HERO='n';enter(startTutorial)});
on('#b4',codex);on('#b5',guide);on('#b6',settings);on('#b7',toggleLang);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const menu=$('#menu');
  if(!menu||!menu.hidden||!G)return;
  const zm=$('#zm');
  if(zm){zm.remove();return;}
  const m=$('#m');
  if(m&&!m.hidden){
    const pc=$('#pc');
    if(pc)pc.click();
    return;
  }
  settings();
});
try{if(RM)document.body.classList.add('rm');if(CB)document.body.classList.add('cb');if(!CRT)document.documentElement.classList.add('nocrt')}catch(e){}
try{$('#slogo').src='limbi_favicon.png?v=limbi4'}catch(e){}setTimeout(()=>{const s=$('#splash');s&&s.remove()},3550);
on('#b2',()=>{if(noNet())return;chooseHero(h=>{MY_HERO=h;hostRoom()})});on('#b3',joinRoom);

/* ---------- SÜRÜKLENEBİLİR KARTLAR İÇİN ORTAK SMOOTH LERP DÖNGÜSÜ ---------- */
function createSmoothDragLoop(onFrame){
  let rafId=0,lastTs=0,curX=0,curY=0,targetX=0,targetY=0,tilt=0,curScale=1,targetScale=1.08;
  function tick(ts){
    const dt=lastTs?Math.min(0.05,Math.max(0.001,(ts-lastTs)/1000)):0.016;
    lastTs=ts;
    const posAlpha=1-Math.exp(-28*dt);
    const tiltAlpha=1-Math.exp(-18*dt);
    const scaleAlpha=1-Math.exp(-20*dt);
    const dx=targetX-curX,dy=targetY-curY;
    curX+=dx*posAlpha;
    curY+=dy*posAlpha;
    const targetTilt=Math.max(-14,Math.min(14,dx*0.42));
    tilt+=(targetTilt-tilt)*tiltAlpha;
    curScale+=(targetScale-curScale)*scaleAlpha;
    if(onFrame(curX,curY,tilt,curScale)===false){rafId=0;return}
    rafId=requestAnimationFrame(tick);
  }
  return {
    start(x,y,startScale=1,endScale=1.08){
      curX=targetX=x;curY=targetY=y;tilt=0;curScale=startScale;targetScale=endScale;lastTs=0;
      if(!rafId)rafId=requestAnimationFrame(tick);
    },
    move(x,y){targetX=x;targetY=y},
    setScale(s){targetScale=s},
    stop(){if(rafId){cancelAnimationFrame(rafId);rafId=0}lastTs=0}
  };
}

/* ---------- DESTEDEN TIKLAYARAK VEYA SÜRÜKLEYEREK KART ÇEKME (SMOOTH LERP) ---------- */
(function initDeckDragDraw(){
  let dragging=false,pointerId=null,startX=0,startY=0,ghost=null;
  const loop=createSmoothDragLoop((x,y,tilt,sc)=>{
    if(!dragging||!ghost)return false;
    ghost.style.transform=`translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  });

  function canDrawNow(){
    const S=G;
    return !!(S&&!S.over&&!lock&&!P&&S.turn==0&&!S.wait&&MODE!=='spectator'&&canDraw(S,0));
  }

  function cleanup(){
    loop.stop();
    if(ghost){ghost.remove();ghost=null}
    document.body.classList.remove('dragging-deck');
    dragging=false;pointerId=null;
  }

  document.addEventListener('dragstart',e=>{
    if(!e.target.closest||!e.target.closest('input, textarea'))e.preventDefault();
  });
  document.addEventListener('selectstart',e=>{
    if(!e.target.closest||!e.target.closest('input, textarea'))e.preventDefault();
  });
  document.addEventListener('touchmove',e=>{
    if(e.target&&e.target.closest&&e.target.closest('#mb, .gd-wrap, .cdx, .hero-grid'))return;
    if(e.cancelable)e.preventDefault();
  },{passive:false});
  window.addEventListener('scroll',()=>{if(window.scrollX||window.scrollY)window.scrollTo(0,0)},{passive:true});

  document.addEventListener('pointerdown',e=>{
    if(e.button!=null&&e.button!==0)return;
    const dk=e.target.closest&&e.target.closest('#deck');
    if(!dk||!canDrawNow())return;
    try{ac()}catch(err){}
    e.preventDefault();
    try{window.getSelection&&window.getSelection().removeAllRanges&&window.getSelection().removeAllRanges()}catch(err){}
    dragging=false;
    pointerId=e.pointerId;
    startX=e.clientX;
    startY=e.clientY;
    try{dk.setPointerCapture(e.pointerId)}catch(err){}
  });

  document.addEventListener('pointermove',e=>{
    if(pointerId==null||e.pointerId!==pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!dragging&&Math.hypot(dx,dy)>8){
      dragging=true;
      document.body.classList.add('dragging-deck');
      ghost=document.createElement('div');
      ghost.className='deck-drag-ghost';
      ghost.style.backgroundImage=`url("${IMG.bn}")`;
      ghost.style.transform=`translate3d(${e.clientX.toFixed(2)}px, ${e.clientY.toFixed(2)}px, 0) translate(-50%, -50%) scale(1)`;
      document.body.appendChild(ghost);
      loop.start(e.clientX,e.clientY,1,1.08);
    }
    if(dragging&&ghost){
      loop.move(e.clientX,e.clientY);
      const ready=e.clientY > window.innerHeight*0.50;
      ghost.classList.toggle('ready',ready);
      loop.setScale(ready?1.12:1.08);
    }
  });

  function finish(e,cancelled){
    if(pointerId==null||e.pointerId!==pointerId)return;
    const ok=!cancelled&&canDrawNow()&&(!dragging||e.clientY > window.innerHeight*0.50);
    cleanup();
    if(ok)drawFromDeck();
  }

  document.addEventListener('pointerup',e=>finish(e,false));
  document.addEventListener('pointercancel',e=>finish(e,true));
  window.addEventListener('blur',cleanup);
})();

/* ---------- JOKER SÜRÜKLE-BIRAK & TIKLAYIP ELDE TUTMA (SMOOTH GHOST LERP) ---------- */
(function initJokerDragAndDrop(){
  let dragEl=null,ghost=null,dragId=0,startX=0,startY=0,originX=0,originY=0,isDragging=false,sticky=false,pointerId=null,maxDist=0,returning=false;
  const loop=createSmoothDragLoop((x,y,tilt,sc)=>{
    if(!isDragging||!ghost||returning)return false;
    ghost.style.transform=`translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  });

  function canPlayJoker(id){
    const S=G;
    if(!S||S.over||lock||P||S.turn!=0||S.wait||MODE==='spectator'||!playable(S,0,id))return false;
    if(MODE==='tutorial')return tutStep===3&&id===3;
    return true;
  }

  function isOverDropZone(clientY){
    return clientY < window.innerHeight * 0.72;
  }

  function startGhost(x,y){
    if(isDragging||!dragEl)return;
    isDragging=true;
    returning=false;
    const rc=dragEl.getBoundingClientRect();
    originX=rc.left+rc.width/2;
    originY=rc.top+rc.height/2;
    dragEl.classList.remove('pinned','hovered');
    dragEl.classList.add('drag-source-hidden');
    document.body.classList.add('dragging-joker');
    ghost=document.createElement('img');
    ghost.className='joker-drag-ghost held';
    ghost.draggable=false;
    ghost.alt='';
    ghost.src=dragEl.currentSrc||dragEl.src||IMG.j[dragId]||'';
    hi(ghost,dragId);
    ghost.style.transform=`translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) scale(1.06)`;
    document.body.appendChild(ghost);
    loop.start(x,y,1.06,1.18);
    const hot=isOverDropZone(y);
    ghost.classList.toggle('ready',hot);
    document.body.classList.toggle('drop-ready',hot);
    try{snd('hover')}catch(err){}
  }

  function cleanupDrag(){
    loop.stop();
    if(ghost){ghost.remove();ghost=null}
    if(dragEl){dragEl.classList.remove('drag-source-hidden','is-dragging','drop-hot')}
    document.body.classList.remove('dragging-joker','drop-ready');
    dragEl=null;dragId=0;isDragging=false;sticky=false;pointerId=null;maxDist=0;returning=false;
  }

  function returnToOrigin(){
    if(!ghost||!dragEl){return cleanupDrag()}
    returning=true;
    sticky=false;
    loop.stop();
    const g=ghost,el=dragEl;
    let ox=originX,oy=originY;
    try{
      if(el.isConnected){
        const rc=el.getBoundingClientRect();
        if(rc.width>0&&rc.height>0){ox=rc.left+rc.width/2;oy=rc.top+rc.height/2}
      }
    }catch(err){}
    document.body.classList.remove('dragging-joker','drop-ready');
    g.classList.remove('ready','held');
    g.classList.add('returning');
    requestAnimationFrame(()=>{
      g.style.transform=`translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0) translate(-50%, -50%) rotate(0deg) scale(1)`;
      g.style.opacity='0.88';
    });
    ghost=null;dragEl=null;dragId=0;isDragging=false;pointerId=null;maxDist=0;
    setTimeout(()=>{
      g.remove();
      if(el)el.classList.remove('drag-source-hidden','is-dragging','drop-hot');
      returning=false;
    },210);
  }

  document.addEventListener('pointerdown',e=>{
    if(e.button!=null&&e.button!==0){
      if(sticky){e.preventDefault();returnToOrigin()}
      return;
    }
    // Eğer kart zaten tıklanarak elimizde tutuluyorsa (sticky):
    if(sticky&&isDragging&&ghost){
      e.preventDefault();
      e.stopPropagation();
      const id=dragId;
      const dropOk=isOverDropZone(e.clientY)&&canPlayJoker(id);
      window._suppressJokerClick=true;
      setTimeout(()=>{window._suppressJokerClick=false},160);
      if(dropOk){
        cleanupDrag();
        startJoker(id);
      }else{
        returnToOrigin();
      }
      return;
    }
    const jEl=e.target.closest&&e.target.closest('#hand .j[data-j]');
    if(!jEl)return;
    const id=+jEl.dataset.j;
    if(!canPlayJoker(id))return;
    e.preventDefault();
    try{window.getSelection&&window.getSelection().removeAllRanges&&window.getSelection().removeAllRanges()}catch(err){}
    dragEl=jEl;
    dragId=id;
    startX=e.clientX;
    startY=e.clientY;
    maxDist=0;
    isDragging=false;
    sticky=false;
    pointerId=e.pointerId;
    try{jEl.setPointerCapture(e.pointerId)}catch(err){}
    if(e.pointerType!=='touch'){
      startGhost(e.clientX,e.clientY);
    }
  },true);

  document.addEventListener('pointermove',e=>{
    if(sticky&&isDragging&&ghost){
      loop.move(e.clientX,e.clientY);
      const hot=isOverDropZone(e.clientY);
      ghost.classList.toggle('ready',hot);
      loop.setScale(hot?1.24:1.18);
      document.body.classList.toggle('drop-ready',hot);
      return;
    }
    if(!dragEl||e.pointerId!==pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    const dist=Math.hypot(dx,dy);
    if(dist>maxDist)maxDist=dist;
    if(!isDragging&&dist>8){
      startGhost(e.clientX,e.clientY);
    }
    if(isDragging&&ghost){
      loop.move(e.clientX,e.clientY);
      const hot=isOverDropZone(e.clientY);
      ghost.classList.toggle('ready',hot);
      loop.setScale(hot?1.24:1.16);
      document.body.classList.toggle('drop-ready',hot);
    }
  });

  function finishPointer(e,cancelled){
    if(sticky)return;
    if(!dragEl||e.pointerId!==pointerId)return;
    const wasDragging=isDragging;
    const id=dragId;
    const isDesktop=e.pointerType!=='touch';
    // Masaüstünde kısa tıklama yapıldıysa: kart büyümüş şekilde elimizde kalsın (sticky mod)
    if(!cancelled&&wasDragging&&isDesktop&&maxDist<=10&&!isOverDropZone(e.clientY)){
      sticky=true;
      pointerId=null;
      if(ghost){
        loop.setScale(1.18);
        ghost.classList.add('held');
      }
      window._suppressJokerClick=true;
      setTimeout(()=>{window._suppressJokerClick=false},160);
      return;
    }
    const dropOk=!cancelled&&wasDragging&&isOverDropZone(e.clientY)&&canPlayJoker(id);
    if(wasDragging){
      window._suppressJokerClick=true;
      setTimeout(()=>{window._suppressJokerClick=false},160);
      if(dropOk){
        cleanupDrag();
        startJoker(id);
      }else{
        returnToOrigin();
      }
    }else{
      cleanupDrag();
    }
  }

  document.addEventListener('pointerup',e=>finishPointer(e,false));
  document.addEventListener('pointercancel',e=>finishPointer(e,true));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sticky)returnToOrigin()});
  window.addEventListener('blur',cleanupDrag);
})();

/* ---------- ELDEKİ JOKERLERDE İMLEÇ ALTI KOLAY GEÇİŞ (SLOT BAZLI HOVER) ---------- */
(function initHandSlotHover(){
  let prevJId=null;
  function clearOracle(){
    prevJId=null;
    document.querySelectorAll('.ora-tot,.ora-seal').forEach(el=>el.remove());
  }
  function updateOracle(targetJ){
    const S=G;
    if(!S||S.over||S.wait||S.turn!==0||lock||(S.noJ&&S.noJ[0])||!targetJ||targetJ.classList.contains('dim')){
      clearOracle();return;
    }
    const id=+targetJ.dataset.j;
    if(!id||id===prevJId)return;
    clearOracle();
    prevJId=id;
    const sim={...S,eff:[...S.eff,{id,o:0,uid:-1}]};
    const curT=total(S,0),newT=id===22?curT:total(sim,0),curTg=tg(S),newTg=tg(sim),curLow=lowW(S),newLow=lowW(sim);
    if(id===22&&S.deck.length>0){
      const totEl=document.querySelector('#me .tot');
      if(totEl){
        const sp=document.createElement('span');
        sp.className='ora-tot';
        sp.textContent=`±${S.deck.length}`;
        totEl.appendChild(sp);
      }
    }else if(Number.isFinite(newT)&&newT!==curT){
      const totEl=document.querySelector('#me .tot');
      if(totEl){
        const sp=document.createElement('span');
        const isExact=!newLow&&newT===newTg,isBust=!newLow&&newT>newTg;
        sp.className='ora-tot'+(isExact?' ora-exact':isBust?' ora-bust':'');
        sp.textContent='→ '+newT;
        totEl.appendChild(sp);
      }
    }
    if(newTg!==curTg||newLow!==curLow){
      const sl=document.getElementById('seal');
      if(sl){
        const sm=document.createElement('small');
        sm.className='ora-seal';
        sm.textContent='→ '+(newLow?tr('En az','Lowest'):newTg);
        sl.appendChild(sm);
      }
    }
  }
  function clearHover(){
    document.querySelectorAll('#hand .j.hovered').forEach(el=>el.classList.remove('hovered'));
    clearOracle();
  }

  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    if(document.body.classList.contains('dragging-joker')||document.body.classList.contains('dragging-deck')){
      clearHover();return;
    }
    const hand=document.getElementById('hand');
    if(!hand)return;
    const slots=[...hand.querySelectorAll('.jslot')];
    if(!slots.length)return;

    let targetJ=null;
    for(const sl of slots){
      const r=sl.getBoundingClientRect();
      if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom){
        targetJ=sl.querySelector('.j');
        break;
      }
    }
    if(targetJ&&!targetJ.classList.contains('drag-source-hidden')){
      slots.forEach(s=>{const c=s.querySelector('.j');if(c&&c!==targetJ)c.classList.remove('hovered')});
      targetJ.classList.add('hovered');
      updateOracle(targetJ);
    }else{
      clearHover();
    }
  });
  document.addEventListener('pointerdown',e=>{
    if(e.target&&e.target.matches&&e.target.matches('input[type="range"]'))document.body.classList.add('dragging-range');
  });
  const endRangeDrag=()=>document.body.classList.remove('dragging-range');
  document.addEventListener('pointerup',endRangeDrag);
  document.addEventListener('pointercancel',endRangeDrag);
  window.addEventListener('blur',endRangeDrag);

  document.addEventListener('pointerleave',clearHover);
})();

/* ---------- ORTADAKİ YUVARLAK KULLANILMIŞ JOKER İKONLARI: ÜZERİNE GELİNCE (MOBİLDE DOKUNUNCA) BÜYÜK KART GÖSTERİMİ ---------- */
(function initUsedJokerHoverInspect(){
  let activeUid=null;

  function hideInspect(){
    activeUid=null;
    const old=document.getElementById('joker-inspect-pop');
    if(old)old.remove();
  }

  function showInspect(u,isMob){
    const S=G;
    if(!S||S.over||lock)return;
    const x=(S.eff&&S.eff.find(y=>y.uid==u))||(S.pj&&S.pj.find(y=>y.uid==u));
    if(!x)return;
    let pop=document.getElementById('joker-inspect-pop');
    if(!pop){
      pop=document.createElement('div');
      pop.id='joker-inspect-pop';
      document.body.appendChild(pop);
    }
    pop.className=isMob?'mob-pop':'';
    pop.style.cssText=`position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;pointer-events:${isMob?'auto':'none'}!important;`;
    if(isMob){
      pop.onpointerdown=ev=>{ev.stopPropagation();ev.preventDefault();hideInspect();};
      pop.onclick=ev=>{ev.stopPropagation();hideInspect();};
    }else{
      pop.onpointerdown=null;
      pop.onclick=null;
    }
    const statusTxt=`${x.o==0?tr('Senin Jokerin','Your Joker'):tr('Rakibin Jokeri','Opponent\'s Joker')}${x.id==22?(x.s>0?tr(' (Ekler)',' (Adds)'):tr(' (Çıkarır)',' (Subtracts)')):''}`;
    pop.innerHTML=`<div class="jip-card" style="pointer-events:none!important"><img src="${IMG.j[x.id]}" alt="${J[x.id]||''}" style="pointer-events:none!important"><div class="jip-tag ${x.o==0?'mine':'opp'}" style="pointer-events:none!important">${statusTxt}</div></div>`;
    const im=pop.querySelector('img');
    if(im)hi(im,x.id);
  }

  window.showUsedJokerInspect=(u,isMob)=>{
    activeUid=u;
    snd('info');
    showInspect(u,!!isMob);
  };
  window.hideUsedJokerInspect=hideInspect;

  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    if(window.matchMedia&&window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches)return;
    const chip=e.target&&e.target.closest&&e.target.closest('#fx .e[data-e]');
    if(!chip){
      if(activeUid!==null)hideInspect();
      return;
    }
    const u=+chip.dataset.e;
    if(u!==activeUid){
      activeUid=u;
      showInspect(u,false);
    }
  });

  document.addEventListener('pointerdown',e=>{
    const chip=e.target&&e.target.closest&&e.target.closest('#fx .e[data-e]');
    if(chip&&!P&&e.pointerType!=='touch')return;
    if(activeUid!==null)hideInspect();
  });
})();

/* ---------- HERO POWER MADALYONU: ÜZERİNDE 0.7 SN DURUNCA AÇIKLAMA KUTUSU ---------- */
(function initHeroPowerHover(){
  let activeKey=null,hoverTimer=null;

  function clearTimer(){
    if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}
  }

  function hideHpTip(){
    clearTimer();
    activeKey=null;
    const old=document.getElementById('hp-tip');
    if(old)old.remove();
  }

  function showHpTip(btn){
    const hid=btn.dataset.hpId,side=+btn.dataset.hpSide;
    const h=HERO_MAP[hid];
    if(!h)return;
    const isUsed=btn.classList.contains('used');
    const cw=(hid==='c'&&G&&G.cWins)?Math.min(4,G.cWins[side]||0):0;
    const tagTxt=hid==='c'?tr(`Aktif · Galibiyet: ${cw}/4`,`Active · Wins: ${cw}/4`):(h.passive?(isUsed?tr('Pasif · Tükendi','Passive · Spent'):tr('Pasif','Passive')):(isUsed?tr('Aktif, Kullanıldı','Active, Used'):tr('Aktif, Her Düelloda 1 Kez','Active, Once per Duel')));
    let tip=document.getElementById('hp-tip');
    if(!tip){
      tip=document.createElement('div');
      tip.id='hp-tip';
      tip.className='hp-tip';
      document.body.appendChild(tip);
    }
    const thiefCard=hid==='s'&&IMG.j[25]?`<img class="hp-tip-jcard" src="${IMG.j[25]}" alt="${tr('Hırsız','Thief')}">`:'';
    tip.className=`hp-tip ${side===1?'opp':'mine'}${h.passive?' passive':''}${isUsed?' used':''}`;
    tip.innerHTML=`<div class="hp-tip-head"><div class="hp-tip-title">${h.hpName}</div><div class="hp-tip-tag">${tagTxt}</div></div><div class="hp-tip-desc">${h.desc}</div>${thiefCard}`;
    const r=btn.getBoundingClientRect();
    const tw=tip.offsetWidth||290,th=tip.offsetHeight||120;
    const left=Math.max(10,Math.min(window.innerWidth-tw-10,r.left+r.width/2-tw/2));
    let top=side===1?(r.bottom+10):(r.top-th-10);
    if(top<10)top=r.bottom+10;
    if(top+th>window.innerHeight-10)top=Math.max(10,r.top-th-10);
    tip.style.left=`${Math.round(left)}px`;
    tip.style.top=`${Math.round(top)}px`;
  }

  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    const btn=e.target&&e.target.closest&&e.target.closest('.who .hp-btn[data-hp-id]');
    if(!btn){
      if(activeKey!==null||hoverTimer)hideHpTip();
      return;
    }
    const key=`${btn.dataset.hpSide}:${btn.dataset.hpId}:${btn.classList.contains('used')?1:0}`;
    if(key!==activeKey){
      hideHpTip();
      activeKey=key;
      hoverTimer=setTimeout(()=>{
        hoverTimer=null;
        if(activeKey===key&&btn.isConnected)showHpTip(btn);
      },700);
    }
  });

  document.addEventListener('pointerdown',()=>{
    if(activeKey!==null||hoverTimer)hideHpTip();
  });

  document.addEventListener('click',e=>{
    if(e.target&&e.target.closest&&e.target.closest('#emote-pop'))return;
    closeEmoteMenu();
  });

  document.addEventListener('pointerleave',hideHpTip);
})();

/* ---------- GOTİK TAŞLI RÜNİK DÜELLO MASASI & 4 KÖŞE ORTA ÇAĞ SAHNESİ ---------- */
(function initLoRValleyCanvas(){
  const mainEl=document.querySelector('main');
  if(!mainEl)return;
  const cvs=document.createElement('canvas');
  cvs.id='lor-valley-bg';
  cvs.setAttribute('aria-hidden','true');
  mainEl.insertBefore(cvs,mainEl.firstChild);
  const ctx=cvs.getContext('2d');

  let W=0,H=0,DPR=1;
  const bgImg=new Image();
  let bgLoaded=false;
  bgImg.onload=()=>{bgLoaded=true;requestAnimationFrame(render);};
  bgImg.src='board_gothic.jpg?v=20261115_sym1';

  const particles=[];

  function seedParticles(){
    particles.length=0;
    for(let i=0;i<42;i++){
      const zone=i%4; // 0: sol meşale/ocak, 1: sağ kazan/fener, 2: vitray ay ışığı, 3: orta taş rün
      particles.push({
        zone,
        x:Math.random(),
        y:Math.random(),
        r:1.3+Math.random()*2.3,
        vx:(Math.random()-0.5)*0.0004,
        vy:-0.0003-Math.random()*0.0005,
        phase:Math.random()*Math.PI*2
      });
    }
  }
  seedParticles();

  function resize(){
    DPR=isMobilePerf()?1:Math.min(window.devicePixelRatio||1,1.25);
    W=window.innerWidth;
    H=window.innerHeight;
    cvs.width=Math.round(W*DPR);
    cvs.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize',resize);
  resize();

  function drawCrackedLightning(points,color,glowColor,width,alpha){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();
    points.forEach((pt,i)=>{
      if(i===0)ctx.moveTo(pt[0],pt[1]);
      else ctx.lineTo(pt[0],pt[1]);
    });
    ctx.stroke();
    ctx.restore();
  }

  let lastRender=0;
  function render(now){
    requestAnimationFrame(render);
    if(entering||document.hidden)return;
    const mob=isMobilePerf();
    const mn=document.getElementById('menu');
    const menuOpen=mn&&!mn.hidden;
    const rm=document.body.classList.contains('rm');
    if(!menuOpen&&(rm?now-lastRender>=400:now-lastRender>=(mob?40:32))){
      lastRender=now;
      const t=rm?0:now*0.001;
      ctx.clearRect(0,0,W,H);

      // 1. ARKA PLAN: Üstten Görünümlü Gotik Taş Arena, 4 Çeyrekli Rünik Çember ve Orta Rün Yarığı
      if(bgLoaded && bgImg.naturalWidth>0){
        const iw=bgImg.naturalWidth, ih=bgImg.naturalHeight;
        const scale=Math.max(W/iw, H/ih);
        const dw=iw*scale, dh=ih*scale;
        const dx=(W-dw)*0.5, dy=(H-dh)*0.5;
        ctx.drawImage(bgImg, dx, dy, dw, dh);

        // 4 köşedeki simetrik ateş kaseleri için titreyen sıcak meşale parıltıları
        const flicker = 0.78 + 0.22*Math.sin(t*7.1)*Math.cos(t*4.3);
        const drawLight = (u, v, rad, col) => {
          const lx = dx + dw*u, ly = dy + dh*v, lr = Math.min(W,H)*rad;
          const lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr);
          lg.addColorStop(0, col);
          lg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = lg;
          ctx.fillRect(lx-lr, ly-lr, lr*2, lr*2);
        };
        drawLight(0.155, 0.045, 0.19, `rgba(255, 155, 55, ${0.26*flicker})`);
        drawLight(0.845, 0.045, 0.19, `rgba(255, 155, 55, ${0.26*flicker})`);
        drawLight(0.155, 0.955, 0.19, `rgba(255, 145, 45, ${0.26*flicker})`);
        drawLight(0.845, 0.955, 0.19, `rgba(255, 145, 45, ${0.26*flicker})`);
      } else {
        const g=ctx.createRadialGradient(W*0.5,H*0.5,40,W*0.5,H*0.5,Math.max(W,H)*0.75);
        g.addColorStop(0,'#1b222c');
        g.addColorStop(0.55,'#0e131a');
        g.addColorStop(1,'#05070a');
        ctx.fillStyle=g;
        ctx.fillRect(0,0,W,H);
      }

      // 2. CANLI ATMOSFER PARÇACIKLARI (Meşale Kıvılcımları ve Rün Tozları)
      if(!rm)particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if(p.y < -0.04) { p.y = 1.04; p.x = Math.random(); }
        if(p.x < 0) p.x = 1;
        if(p.x > 1) p.x = 0;
        const px = p.x * W;
        const py = p.y * H;
        const alpha = 0.35 + 0.55 * Math.abs(Math.sin(t * 2.3 + p.phase));
        let col = `rgba(255, 218, 145, ${alpha * 0.78})`;
        if(p.zone === 0) col = `rgba(255, 148, 52, ${alpha})`;
        else if(p.zone === 1) col = `rgba(245, 198, 92, ${alpha * 0.85})`;
        else if(p.zone === 2) col = `rgba(225, 92, 58, ${alpha * 0.72})`;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI*2);
        ctx.fill();
      });
    }
  }
  requestAnimationFrame(render);
})();

/* ---------- GOTİK KATEDRAL ÇALIŞMA SALONU, VİTRAY AY IŞIĞI & BÜYÜ MASASI ANA MENÜ ARKA PLANI ---------- */
(function initHearthstoneMenuCanvas(){
  const cvs=document.getElementById('hs-menu-bg');
  if(!cvs)return;
  const ctx=cvs.getContext('2d');
  let W=0,H=0,DPR=1;

  const menuImg=new Image();
  let menuImgLoaded=false;
  let isMobileMenuBg=false;
  function pickMenuImg(){
    const wantMobile=window.innerWidth<=760||window.innerHeight>window.innerWidth*1.15;
    if(wantMobile===isMobileMenuBg&&menuImg.src)return;
    isMobileMenuBg=wantMobile;
    menuImgLoaded=false;
    menuImg.src=wantMobile?'menu_gothic_mobile.jpg?v=20261116_m1':'menu_gothic.jpg?v=20261114_sanctum1';
  }
  menuImg.onload=()=>{menuImgLoaded=true;};
  pickMenuImg();

  const motes=[];
  for(let i=0;i<52;i++){
    const kind=i%3; // 0: mum/ocak altın kıvılcımı, 1: vitray ay ışığı tozu, 2: mor rün parıltısı
    motes.push({
      kind,
      x:Math.random(),
      y:Math.random(),
      r:1.1+Math.random()*2.3,
      vx:(Math.random()-0.5)*0.0003,
      vy:-0.00022-Math.random()*0.00045,
      phase:Math.random()*Math.PI*2
    });
  }

  function resize(){
    DPR=isMobilePerf()?1:Math.min(window.devicePixelRatio||1,1.25);
    W=window.innerWidth;
    H=window.innerHeight;
    cvs.width=Math.round(W*DPR);
    cvs.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    pickMenuImg();
  }
  window.addEventListener('resize',resize);
  resize();

  let lastMenuDraw=0;
  function render(now){
    requestAnimationFrame(render);
    if(entering||document.hidden)return;
    const menuEl=document.getElementById('menu');
    const rm=document.body.classList.contains('rm');
    // Hareketi azalt: kül/kıvılcım yok, titreşen ışık yok; normalde akıcı 30fps GPU tasarrufu
    if(menuEl&&!menuEl.hidden&&(rm?now-lastMenuDraw>=400:now-lastMenuDraw>=(isMobilePerf()?42:32))){
      lastMenuDraw=now;
      const t=rm?0:now*0.001;
      ctx.clearRect(0,0,W,H);

      if(menuImgLoaded && menuImg.naturalWidth>0){
        const iw=menuImg.naturalWidth, ih=menuImg.naturalHeight;
        const scale=Math.max(W/iw, H/ih);
        const dw=iw*scale, dh=ih*scale;
        const dx=(W-dw)*0.5, dy=(H-dh)*0.5;
        ctx.drawImage(menuImg, dx, dy, dw, dh);

        // Görseldeki büyü kitabının üzerindeki sabit yazıyı ("Oyna / Koleksiyon / Macera") yalnızca masaüstü görselinde ört
        if(!isMobileMenuBg){
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dx + dw*0.365, dy + dh*0.640);
        ctx.lineTo(dx + dw*0.455, dy + dh*0.626);
        ctx.lineTo(dx + dw*0.485, dy + dh*0.728);
        ctx.lineTo(dx + dw*0.392, dy + dh*0.752);
        ctx.closePath();
        const bkGrad=ctx.createLinearGradient(dx+dw*0.37, dy+dh*0.63, dx+dw*0.48, dy+dh*0.75);
        bkGrad.addColorStop(0,'#463532');
        bkGrad.addColorStop(0.5,'#382928');
        bkGrad.addColorStop(1,'#291d1e');
        ctx.fillStyle=bkGrad;
        ctx.fill();

        // Kitap kapağına parlayan mor/altın rün amblemi işle (shadowBlur yerine hafif çift katman)
        const bcx = dx + dw*0.426, bcy = dy + dh*0.688;
        ctx.translate(bcx, bcy);
        ctx.rotate(-0.18);
        ctx.scale(1, 0.72);
        const rPulse = 0.65 + 0.35*Math.sin(t*2.4);
        ctx.strokeStyle = `rgba(192, 132, 252, ${0.26*rPulse})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, dw*0.024, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(216, 150, 255, ${0.65*rPulse})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.font = `700 ${Math.round(dw*0.022)}px 'Alegreya', serif`;
        ctx.fillStyle = `rgba(235, 195, 255, ${0.8*rPulse})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ᛟ', 0, 0);
        ctx.restore();
        }

        // Ortadaki büyük Gotik vitray pencereden süzülen hareketli ay ışığı huzmeleri
        ctx.save();
        const rayPulse = 0.75 + 0.25*Math.sin(t*1.3);
        const rayGrad = ctx.createLinearGradient(dx + dw*0.50, dy + dh*0.12, dx + dw*0.44, dy + dh*0.68);
        rayGrad.addColorStop(0, `rgba(145, 210, 255, ${0.16*rayPulse})`);
        rayGrad.addColorStop(0.5, `rgba(135, 175, 255, ${0.09*rayPulse})`);
        rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(dx + dw*0.43, dy + dh*0.14);
        ctx.lineTo(dx + dw*0.57, dy + dh*0.14);
        ctx.lineTo(dx + dw*0.66, dy + dh*0.68);
        ctx.lineTo(dx + dw*0.34, dy + dh*0.68);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Şamdanlar, meşaleler, şömineler, masa mumları ve fener için canlı titreyen ışık haleleri
        const flk = 0.78 + 0.22*Math.sin(t*7.5)*Math.cos(t*4.3);
        const addHalo = (u, v, rad, col) => {
          const lx = dx + dw*u, ly = dy + dh*v, lr = Math.min(W,H)*rad;
          const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr);
          g.addColorStop(0, col);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(lx-lr, ly-lr, lr*2, lr*2);
        };
        // Üst asma demir şamdanlar
        addHalo(0.315, 0.19, 0.14, `rgba(255, 185, 75, ${0.18*flk})`);
        addHalo(0.685, 0.19, 0.14, `rgba(255, 185, 75, ${0.18*flk})`);
        // Sol ve sağ şömine ateşleri
        addHalo(0.088, 0.78, 0.18, `rgba(255, 115, 35, ${0.22*flk})`);
        addHalo(0.845, 0.65, 0.16, `rgba(255, 120, 40, ${0.20*flk})`);
        // Masa üstü mumlar, fener ve parlayan rün kartları
        addHalo(0.305, 0.66, 0.13, `rgba(255, 205, 95, ${0.22*flk})`);
        addHalo(0.703, 0.66, 0.13, `rgba(255, 195, 80, ${0.20*flk})`);
        addHalo(0.585, 0.73, 0.12, `rgba(185, 105, 255, ${0.18*(0.75+0.25*Math.sin(t*2.8))})`);
        addHalo(0.955, 0.53, 0.12, `rgba(75, 245, 225, ${0.16*(0.75+0.25*Math.cos(t*2.4))})`);
      } else {
        const bgGrad=ctx.createRadialGradient(W*0.5,H*0.42,30,W*0.5,H*0.5,Math.max(W,H)*0.8);
        bgGrad.addColorStop(0,'#1c1829');
        bgGrad.addColorStop(0.5,'#100e18');
        bgGrad.addColorStop(1,'#06050a');
        ctx.fillStyle=bgGrad;
        ctx.fillRect(0,0,W,H);
      }

      // Süzülen alev korları ve yanık kül tanecikleri (ateş külü efekti)
      if(!rm)motes.forEach(e=>{
        e.x+=e.vx;
        e.y+=e.vy;
        if(e.y<-0.06){e.y=1.06;e.x=Math.random()}
        if(e.x<-0.02)e.x=1.02;
        if(e.x>1.02)e.x=-0.02;
        const drift=Math.sin(t*1.9+e.phase)*14+Math.cos(t*0.9+e.phase*1.7)*6;
        const ex=e.x*W+drift;
        const ey=e.y*H;
        const flick=0.45+0.55*Math.abs(Math.sin(t*3.1+e.phase));
        const rot=t*1.4+e.phase;
        ctx.save();
        ctx.translate(ex,ey);
        ctx.rotate(rot);
        if(e.kind===0){
          // Parlak turuncu-altın kor kıvılcımı (yumuşak alev haleli)
          const gr=e.r*3.4;
          const g=ctx.createRadialGradient(0,0,0,0,0,gr);
          g.addColorStop(0,`rgba(255, 232, 160, ${0.95*flick})`);
          g.addColorStop(0.35,`rgba(255, 118, 32, ${0.65*flick})`);
          g.addColorStop(1,'rgba(255, 60, 10, 0)');
          ctx.fillStyle=g;
          ctx.beginPath();
          ctx.arc(0,0,gr,0,Math.PI*2);
          ctx.fill();
        }else if(e.kind===1){
          // Kızıl köz parçası (hafif oval, dönerek süzülür)
          ctx.fillStyle=`rgba(255, 78, 22, ${0.78*flick})`;
          ctx.shadowColor='rgba(255, 90, 20, 0.8)';
          ctx.shadowBlur=6;
          ctx.beginPath();
          ctx.ellipse(0,0,e.r*1.4,e.r*0.7,0,0,Math.PI*2);
          ctx.fill();
        }else{
          // Koyu yanık kül pulu (kenarında sönen turuncu kor izi)
          ctx.fillStyle=`rgba(34, 24, 22, ${0.62+0.25*flick})`;
          ctx.strokeStyle=`rgba(255, 110, 35, ${0.42*flick})`;
          ctx.lineWidth=0.9;
          ctx.beginPath();
          ctx.ellipse(0,0,e.r*1.65,e.r*0.85,0,0,Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  }
  requestAnimationFrame(render);
})();

/* ---------- SATRANÇ SAATİ (CHESS CLOCK 66s / 55s / 44s) & 5 SN HAZIRLIK ---------- */
(function initHearthstoneTurnTimer(){
  let lastTickSec=-1;
  setInterval(()=>{
    const sc0=$('#sc-0');
    const sc1=$('#sc-1');
    const scSec0=$('#sc-sec-0');
    const scSec1=$('#sc-sec-1');
    const menu=$('#menu');
    const modalEl=$('#m'),mbEl=$('#mb');
    const isMenuModal=!!(modalEl&&!modalEl.hidden&&mbEl&&!mbEl.querySelector('.d20-box,.tie-box,.scry-row,#hp-p2,.hero-grid'));
    const active=!!(G && MODE!=='tutorial' && !G.over && !G.wait && (!lock || (MODE!=='bot' && isMenuModal)) && (!menu || menu.hidden));
    if(!active){
      if(sc0){sc0.classList.remove('ticking','low');sc0.classList.toggle('turn-on',!!(G&&G.turn===0));sc0.classList.toggle('turn-off',!!(G&&G.turn!==0))}
      if(sc1){sc1.classList.remove('ticking','low');sc1.classList.toggle('turn-on',!!(G&&G.turn===1));sc1.classList.toggle('turn-off',!!(G&&G.turn!==1))}
      lastTickSec=-1;
      return;
    }
    if(!Array.isArray(G.clocks)||G.clocks.length!==2){
      const cs=initClockSec();
      G.clocks=[cs,cs];
      G.clockMax=cs;
    }
    if(!Array.isArray(G.timeOut)) G.timeOut=[false,false];

    // 5 saniyelik sessiz hazırlık süresi: iki tarafın da jokerlere/kartlara bakması için saatler hemen başlamaz
    if(G.graceLeft && G.graceLeft > 0){
      G.graceLeft=Math.max(0, G.graceLeft - 0.1);
      const s0=Math.ceil(G.clocks[0]), s1=Math.ceil(G.clocks[1]);
      if(scSec0) scSec0.textContent=(G.timeOut[0]||s0<=0)?'✕':String(s0);
      if(scSec1) scSec1.textContent=(G.timeOut[1]||s1<=0)?'✕':String(s1);
      if(sc0){sc0.classList.remove('ticking','low');sc0.classList.toggle('turn-on',G.turn===0);sc0.classList.toggle('turn-off',G.turn!==0)}
      if(sc1){sc1.classList.remove('ticking','low');sc1.classList.toggle('turn-on',G.turn===1);sc1.classList.toggle('turn-off',G.turn!==1)}
      lastTickSec=-1;
      return;
    }

    const t=G.turn===1?1:0;
    G.clocks[t]=Math.max(0, G.clocks[t] - 0.1);
    const curLeft=G.clocks[t];
    const s0=Math.ceil(G.clocks[0]), s1=Math.ceil(G.clocks[1]);
    const sec=Math.ceil(curLeft);
    const myTurn=(t===0);

    if(scSec0) scSec0.textContent=(G.timeOut[0]||s0<=0)?'✕':String(s0);
    if(scSec1) scSec1.textContent=(G.timeOut[1]||s1<=0)?'✕':String(s1);

    if(sc0){
      sc0.classList.toggle('ticking', myTurn && !G.timeOut[0]);
      sc0.classList.toggle('low', G.clocks[0]<=10 && G.clocks[0]>0);
      sc0.classList.toggle('out', !!G.timeOut[0] || G.clocks[0]<=0);
      sc0.classList.toggle('turn-on', myTurn);
      sc0.classList.toggle('turn-off', !myTurn);
    }
    if(sc1){
      sc1.classList.toggle('ticking', !myTurn && !G.timeOut[1]);
      sc1.classList.toggle('low', G.clocks[1]<=10 && G.clocks[1]>0);
      sc1.classList.toggle('out', !!G.timeOut[1] || G.clocks[1]<=0);
      sc1.classList.toggle('turn-on', !myTurn);
      sc1.classList.toggle('turn-off', myTurn);
    }

    if(curLeft<=5 && curLeft>0){
      if(sec!==lastTickSec){
        lastTickSec=sec;
        snd('tick');
      }
    }else{
      lastTickSec=-1;
    }

    if(curLeft<=0 && MODE!=='guest' && MODE!=='spectator'){
      lastTickSec=-1;
      G.clocks[t]=0;
      G.timeOut[t]=true;
      G.hadTimeout=true;
      P=null;
      pass(true);
    }
  },100);
})();

/* ---------- HEARTHSTONE TARZI TIKLANABİLİR TAŞ ARKA PLAN (PIT PIT SES + DALGA) ---------- */
(function initBoardStoneTap(){
  document.addEventListener('pointerdown',e=>{
    if(e.button!=null&&e.button!==0)return;
    const menu=$('#menu'),modal=$('#m');
    if((menu&&!menu.hidden)||(modal&&!modal.hidden))return;
    if(e.target.closest&&e.target.closest('button, a, input, select, .c, .j, .e, #deck, #pass, .who, #hdr .hs, #hdr .hc, #hdr .hg, .side-clock, .seal'))return;
    snd('stone');
    const r=document.createElement('div');
    r.className='stone-ripple';
    r.style.left=e.clientX+'px';
    r.style.top=e.clientY+'px';
    document.body.appendChild(r);
    setTimeout(()=>r.remove(),480);
  });
})();

/* ---------- İNTERAKTİF EĞİTİM MODU (KUZGUN REHBER) ---------- */
let tutStep=-1;
const RAVEN_SVG=`<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rvBg" cx="45%" cy="35%" r="65%"><stop offset="0%" stop-color="#2c1d22"/><stop offset="100%" stop-color="#0b0709"/></radialGradient>
    <linearGradient id="rvFea" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#292c38"/><stop offset="55%" stop-color="#14151c"/><stop offset="100%" stop-color="#08080b"/></linearGradient>
    <linearGradient id="rvBeak" x1="0%" y1="0%" x2="100%" y2="80%"><stop offset="0%" stop-color="#4e4b52"/><stop offset="65%" stop-color="#252328"/><stop offset="100%" stop-color="#111014"/></linearGradient>
  </defs>
  <rect width="120" height="120" fill="url(#rvBg)"/>
  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(212,168,85,0.28)" stroke-width="1.5"/>
  <path d="M22 114 C24 84 40 70 60 70 C82 70 96 86 98 114 Z" fill="url(#rvFea)"/>
  <path d="M36 92 C46 82 74 82 84 92" fill="none" stroke="#b98a38" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  <circle cx="60" cy="91" r="4.5" fill="#d4a855" stroke="#2a1c08" stroke-width="1.2"/>
  <path d="M34 62 C32 34 48 18 66 20 C82 22 90 36 86 58 C84 72 74 80 60 80 C44 80 35 72 34 62 Z" fill="url(#rvFea)"/>
  <path d="M40 34 C46 23 62 19 74 25 C64 25 50 30 42 40 Z" fill="#4c5875" opacity="0.45"/>
  <path d="M78 44 L108 53 L83 62 C80 57 78 50 78 44 Z" fill="url(#rvBeak)" stroke="#09080a" stroke-width="1.2"/>
  <path d="M80 56 L101 54 L82 61 Z" fill="#17151a"/>
  <circle cx="68" cy="44" r="7.5" fill="#0d0a0c" stroke="#c99c42" stroke-width="1.4"/>
  <circle cx="68.5" cy="44" r="4.6" fill="#f59e0b"/>
  <circle cx="69.5" cy="43.5" r="2.2" fill="#120904"/>
  <circle cx="71" cy="41.8" r="1.3" fill="#fffbeb"/>
  <path d="M46 58 C42 66 44 74 52 78 M56 60 C54 68 56 76 62 79" fill="none" stroke="#2c3142" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;
const TUT_STEPS=()=>[
  {
    sel:'#me .tot',
    pos:'top',
    title:tr('Kuzgun Rehber · Hedef 21','Raven Guide · Target 21'),
    txt:tr('Gak! Ben <b>Kuzgun</b>. Necrodice masasına hoş geldin! Amacın: açık ve kapalı sayı kartlarının toplamını <b>21</b>\'e rakibinden daha yakın tutmak. 21\'i aşarsan patlar ve turu kaybedersin.','Caw! I am the <b>Raven</b>. Welcome to Necrodice! Your goal: bring your open and hidden number cards closer to <b>21</b> than your opponent without going over 21.'),
    next:true
  },
  {
    sel:'#me .cards .c[data-pk="1"]',
    pos:'top',
    title:tr('Kapalı Sayı Kartın','Your Hidden Number Card'),
    txt:tr('Her tur başında 1 açık, <b>1 kapalı</b> kart alırsın. Kapalı kartını yalnızca sen görebilirsin. Hadi parlayan <b>kapalı kartına dokun</b> ve değerine bak!','Each round starts with 1 open and <b>1 hidden</b> card. Only you can see your hidden card. Go ahead and <b>tap your glowing hidden card</b> to peek!'),
    task:tr('Kapalı kartına tıkla','Tap your hidden card')
  },
  {
    sel:'#deck',
    pos:'bottom',
    title:tr('Desteden Kart Çekme','Drawing Number Cards'),
    txt:tr('Şu an toplamın <b>12</b> (7 + 5). Sıra sendeyken istediğin kadar sayı kartı çekebilirsin. Şimdi parlayan <b>Desteye tıkla</b> (veya sürükle) ve bir kart çek!','Your total is currently <b>12</b> (7 + 5). On your turn, you can draw as many number cards as you want. Now <b>tap the glowing Deck</b> to draw a card!'),
    task:tr('Desteden 1 kart çek','Draw 1 card from the Deck')
  },
  {
    sel:'#hand .j[data-j="3"]',
    pos:'top',
    title:tr('Joker Kartları (+5)','Joker Cards (+5)'),
    txt:tr('Harika, 4 geldi ve toplamın <b>16</b> oldu! Her tur en fazla <b>2 Joker</b> oynayabilirsin. Elindeki parlayan <b>+5 Jokerine tıkla</b> ve tam <b>21</b>\'e ulaş!','Nice! You drew a 4, reaching <b>16</b>. You may play up to <b>2 Jokers</b> per round. Tap the glowing <b>+5 Joker</b> in your hand to hit a perfect <b>21</b>!'),
    task:tr('+5 Jokerini oyna','Play the +5 Joker')
  },
  {
    sel:'#hand',
    pos:'top',
    title:tr('Joker Çeşitleri & Örnekler','Joker Types & Examples'),
    txt:tr('<b>Blok Jokerler</b> (sağ altta kalkan sembolü) tur sonuna kadar sürer: <b>+5/−5</b>, <b>Hedef 15/17/24/27</b>, <b>En Az Kazanır</b>, <b>Tekler ×2</b> gibi.<br><b>Anlık Jokerler</b> ise bozulamaz: <b>Rakip Kartını İmha</b>, <b>Kart Çal</b>, <b>Kart → 0/12</b>, <b>Açık/Kapalı Takas</b>!','<b>Block Jokers</b> (shield icon) last until round end: e.g. <b>+5/−5</b>, <b>Target 15/17/24/27</b>, <b>Lowest Wins</b>, <b>Odds ×2</b>.<br><b>Instant Jokers</b> resolve immediately: <b>Destroy Card</b>, <b>Steal Card</b>, <b>Card → 0/12</b>, <b>Swap Cards</b>!'),
    next:true
  },
  {
    sel:'#jm .e',
    pos:'bottom',
    title:tr('Masadaki Aktif Etkiler','Active Effects on Table'),
    txt:tr('Oynanan jokerler orta şeritte toplanır: <b>Altın</b> senin, <b>Kırmızı</b> rakibin jokeridir. Üzerine gelip (mobilde dokunup) ne yaptığını okuyabilir, <b>Joker Etkisiz</b> ile aktif blok jokerlerini bozabilirsin.','Played jokers gather in the center bar: <b>Gold</b> is yours, <b>Red</b> is opponent\'s. Hover (or tap on mobile) to inspect them, and use <b>Negate Joker</b> to cancel active Block Jokers.'),
    next:true
  },
  {
    sel:'#me .hp-btn',
    pos:'top',
    title:tr('Kahraman Güçleri & Örnekler','Hero Powers & Examples'),
    txt:tr('Her kahramanın eşsiz bir gücü vardır:<br>• <b>Aktif:</b> <b>Veba Doktoru</b> (1 joker yak, 2 çek), <b>Cadı</b> (rakibin kapalı kartına gizlice bak), <b>Kurt Adam</b> (iki taraftan 1\'er kart imha et).<br>• <b>Pasif:</b> <b>Buz Devi</b> (%18 hasar savuşturur), <b>Vampir</b> (ilk beraberliği kazanır), <b>Ölümün Efendisi</b> (D20 +2).','Every hero has a unique power:<br>• <b>Active:</b> <b>Plague Doctor</b> (burn 1 Joker, draw 2), <b>Witch</b> (secretly peek opponent\'s hidden card), <b>Werewolf</b> (destroy 1 card per side).<br>• <b>Passive:</b> <b>Frost Giant</b> (18% deflect), <b>Vampire</b> (wins first tie), <b>Lord of Death</b> (+2 D20).'),
    next:true
  },
  {
    sel:'#pass',
    pos:'bottom',
    title:tr('Pas Geçme ve Turu Bitirme','Passing & Ending the Round'),
    txt:tr('Toplamın tam <b>21</b>! Artık risk almaya gerek yok. Parlayan <b>Pas</b> butonuna bas; rakip de pas geçerse kapalı kartlar açılır ve ilk turu kazanırsın!','You are at a perfect <b>21</b>! No need to risk busting. Tap the glowing <b>Pass</b> button — when both pass, hidden cards reveal and you win Round 1!'),
    task:tr('Pas butonuna bas','Tap the Pass button')
  },
  {
    sel:'#hdr .hc',
    pos:'bottom',
    title:tr('Düellolar & D20 Ölüm Zarı','Duels & The D20 Death Dice'),
    txt:tr('Harika, ilk turu kazandın (<b>1 – 0</b>)! 3 turluk düelloda <b>2 puana</b> ulaşan kazanır; kaybeden ise hayatta kalmak için kırmızı <b>D20 Ölüm Zarı</b> atar (eşikler: <b>4 → 8 → 14 → 18</b>).','Awesome, you won Round 1 (<b>1 – 0</b>)! First to <b>2 points</b> in a 3-round duel wins; the loser rolls the crimson <b>D20 Death Dice</b> to survive (thresholds: <b>4 → 8 → 14 → 18</b>).'),
    next:true
  },
  {
    sel:null,
    pos:'bottom',
    title:tr('Hazırsın, Şimdi Devam Et!','You\'re Ready — Continue!'),
    txt:tr('Artık tüm kontrol tamamen sende! Bu düelloyu <b>1 – 0</b> öndeyken <b>Kolay Bot</b> karşısında kendin tamamla. Kahraman gücünü ve kalan jokerlerini kullanmayı unutma — bol şans!','You\'re in full control now! Finish this duel from <b>1 – 0</b> ahead against the <b>Easy Bot</b>. Don\'t forget your Hero Power and remaining Jokers — good luck!'),
    handoff:true
  }
];
function tutClearHighlights(){
  document.querySelectorAll('.tut-hl').forEach(el=>el.classList.remove('tut-hl'));
}
function tutApplyHighlights(){
  tutClearHighlights();
  if(MODE!=='tutorial'||tutStep<0)return;
  const st=TUT_STEPS()[tutStep];
  if(!st||!st.sel)return;
  const el=document.querySelector(st.sel);
  if(el)el.classList.add('tut-hl');
}
function tutClear(){
  tutStep=-1;
  tutClearHighlights();
  const w=$('#tut-wrap');
  if(w)w.remove();
}
function tutRender(){
  if(MODE!=='tutorial'||tutStep<0)return;
  const steps=TUT_STEPS();
  const st=steps[tutStep];
  if(!st)return tutClear();
  let w=$('#tut-wrap');
  if(!w){
    w=document.createElement('div');
    w.id='tut-wrap';
    document.body.appendChild(w);
  }
  w.className='pos-'+(st.pos||'bottom');
  const stepLbl=`${tr('Adım','Step')} ${tutStep+1}/${steps.length}`;
  const btnHtml=st.handoff
    ?`<button id="tut-next" class="btn sm">${tr('Düelloya Devam Et →','Continue Duel →')}</button>`
    :st.finish
      ?`<button id="tut-next" class="btn sm">${tr('Eğitimi Bitir','Finish Tutorial')}</button>`
      :st.next
        ?`<button id="tut-next" class="btn sm">${tr('Devam Et →','Continue →')}</button>`
        :`<span class="tut-task">${st.task}</span>`;
  w.innerHTML=`<div id="tut-card">
    <div id="tut-raven" aria-hidden="true">${RAVEN_SVG}</div>
    <div id="tut-bubble">
      <div class="tut-head"><span class="tut-title">${st.title}</span><span class="tut-step">${stepLbl}</span></div>
      <p class="tut-txt">${st.txt}</p>
      <div class="tut-foot">${btnHtml}<div class="tut-btns"><button id="tut-exit" class="btn alt sm">${tr('Çık','Exit')}</button></div></div>
    </div>
  </div>`;
  const nx=$('#tut-next');
  if(nx){
    nx.onclick=()=>{
      snd('click');
      if(st.handoff){
        tutClear();
        MODE='bot';DIFF='easy';
        deal(G);R();next();
        return;
      }
      if(st.finish){exitGame();return}
      tutStep++;
      tutRender();
    };
  }
  const ex=$('#tut-exit');
  if(ex)ex.onclick=()=>{snd('click');exitGame()};
  tutApplyHighlights();
}
function tutAdvance(evName){
  if(MODE!=='tutorial')return;
  if(evName==='peek'&&tutStep===1){tutStep=2;tutRender()}
  else if(evName==='draw'&&tutStep===2){tutStep=3;tutRender()}
  else if(evName==='joker'&&tutStep===3){tutStep=4;tutRender()}
}
function startTutorial(){
  hiPreload();setMusic('game');
  try{document.body.classList.remove('dead')}catch(e){}
  MODE='tutorial';MY_HERO='p';OPP_HERO='n';
  G={u:0,bo:0,log:[],over:false,used:[],av:['p','n'],hero:['p','n'],uRevived:[false,false],vampUsed:[false,false],cWins:[0,0],vampWinSide:-1,mast:[0,0]};
  prevAv[0]=prevAv[1]=undefined;prevHpAnim=[false,false];
  newBO3(G);
  G.hand=[[3,14,1,8],[4,9,10,11]];
  G.deck=[1,2,3,6,10,11,4].map(n=>({id:++G.u,n})); // en üstte 4 var
  G.pl=[
    {open:[{id:++G.u,n:7}],closed:[{id:++G.u,n:5}]},
    {open:[{id:++G.u,n:8}],closed:[{id:++G.u,n:9}]}
  ];
  G.eff=[];G.pj=[];G.jUsed=[0,0];G.jTurn=[0,0];G.noJ=[false,false];G.acted=false;G.turns=0;
  G.hpMod=[0,0];G.plagueMod=[0,0];G.hpTgMod=0;G.oppPeek=[];G.oppPeek1=[];G.botPeekVal=null;G.botScry=null;G.vampWinSide=-1;
  G.turn=0;G.wait=false;G.rev=false;G.winSide=null;G.timeOut=[false,false];G.hadTimeout=false;G.dead=[];G.pa=[0,0];G.st={pb:0,ob:0,px:0};
  G.graceLeft=0;
  peek.clear();seen.clear();seenE.clear();
  sayT='';sayAt=0;botGen++;thinkOn=false;
  tutStep=0;
  R();
  const tutDelay=entering?1400:320;
  setTimeout(()=>{
    if(MODE==='tutorial'&&tutStep===0)tutRender();
  },tutDelay);
}

/* ---------- NECROENGINE v4: EXACT SOLVER + HERO POWER + MULTI-PV BAYESIAN EV ---------- */
let LAST_MATCH_HIST=[];
function recMove(S,action,label){
  if(!S||S.over||MODE==='tutorial'||MODE==='spectator')return;
  const snap=clone(S);
  snap.log=[];snap.stats=null;
  const kind=!action?'pass':(action.t==='d'?'draw':'joker');
  const myOpen=(S.pl[0].open||[]).map(c=>c.o!=null?c.o:c.n);
  const myClosed=(S.pl[0].closed||[]).map(c=>c.o!=null?c.o:c.n);
  const oppOpenCards=(S.pl[1].open||[]).map(c=>c.o!=null?c.o:c.n);
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5))||(S.bo>=2);
  LAST_MATCH_HIST.push({
    duel:(S.bo||0)+1,
    round:(S.rounds||0)+1,
    d20Th:TH[Math.min(S.bo||0,3)],
    myTot:total(S,0,true),
    oppOpen:total(S,1,false),
    myOpen,
    myClosed,
    oppOpenCards,
    tg:tg(S),
    low:lowW(S),
    kind,
    matchPoint,
    action:action?clone(action):null,
    label:label||(action&&action.t==='d'?tr('Kart Çek','Draw Card'):tr('Pas','Pass')),
    snap
  });
}
function sameAct(a,b){
  if(!a&&!b)return true;
  if(!a||!b)return false;
  if(a.t!==b.t)return false;
  if(a.t==='d')return true;
  if(a.id!==b.id)return false;
  const pa=a.pk||[],pb=b.pk||[];
  return pa.length===pb.length&&pa.every((x,i)=>x===pb[i]);
}
function fmtAct(a,S){
  if(!a)return (S&&S.turns>0&&!S.acted)?tr('Turu Bitir','End Round'):tr('Pas','Pass');
  if(a.t==='d')return tr('Kart Çek','Draw Card');
  const nm=J[a.id]||`#${a.id}`;
  if(a.id===22&&a.pk&&a.pk.length)return `${nm} (${a.pk[0]>0?'+':'−'})`;
  return `${tr('Joker','Joker')}: ${nm}`;
}
function calcDeckOdds(S){
  const low=lowW(S),Tg=tg(S),myT=total(S,0,true);
  const pool=unk(S,0),n=pool.length;
  if(!n)return {poolLen:0,bustCnt:0,safeCnt:0,exactCnt:0,bustPct:0,safePct:0,exactPct:0};
  const bustCnt=low?0:pool.filter(x=>myT+x>Tg).length;
  const exactCnt=low?0:pool.filter(x=>myT+x===Tg).length;
  const safeCnt=n-bustCnt;
  return {
    poolLen:n,
    bustCnt,
    safeCnt,
    exactCnt,
    bustPct:Math.round((bustCnt/n)*100),
    safePct:Math.round((safeCnt/n)*100),
    exactPct:Math.round((exactCnt/n)*100)
  };
}
/* Kesin Matematiksel Çözücü (Exact Combinatorial Endgame Solver):
   Rakip pas geçtiğinde veya kalan bilinmeyen kart havuzu <= 6 olduğunda,
   Monte-Carlo varyansı olmadan tam Bayesian ağırlıklı kombinatoryal EV hesaplar. */
function exactCompare(myT,oppT,Tg,low,noBust){
  if(low)return myT<oppT?1:(myT>oppT?-1:0);
  const mb=!noBust&&myT>Tg,ob=!noBust&&oppT>Tg;
  if(mb&&ob)return myT<oppT?1:(myT>oppT?-1:0);
  if(mb)return -1;
  if(ob)return 1;
  return myT>oppT?1:(myT<oppT?-1:0);
}
function exactEndgameEval(S,action){
  if(!S)return null;
  if(action&&action.t!=='d')return null; // sadece Pas ve Kart Çek için kesin kapalı form
  const oppPassed=S.turns>0&&!S.acted;
  const cl=S.pl[1]&&S.pl[1].closed&&S.pl[1].closed[0];
  const peeked=!!(cl&&((S.oppPeek&&S.oppPeek.includes(cl.id))||cl.o!=null));
  const seenN=new Set([...(S.pl[0].open||[]),...(S.pl[0].closed||[]),...(S.pl[1].open||[]),...(S.dead||[])].map(c=>c.n).filter(n=>n>0));
  if(peeked&&cl.n>0)seenN.add(cl.n);
  const pool=range(11).filter(n=>!seenN.has(n));
  if(!oppPassed&&pool.length>6)return null;
  const Tg=tg(S),low=lowW(S),noBust=act(S,20);
  const myBase=total(S,0,true),oppOpenBase=total(S,1,false);
  const oppDist=[];
  if(!cl){
    oppDist.push({cOpp:0,w:1,rem:pool});
  }else if(peeked){
    oppDist.push({cOpp:cl.o!=null?cl.o:cl.n,w:1,rem:pool});
  }else if(pool.length){
    const ws=oppCardWeights(S,0,{beta:0.75,gap:6},pool);
    const sm=ws.reduce((a,b)=>a+b,0)||1;
    for(let i=0;i<pool.length;i++){
      const rem=pool.slice();rem.splice(i,1);
      oppDist.push({cOpp:pool[i],w:ws[i]/sm,rem});
    }
  }else{
    oppDist.push({cOpp:0,w:1,rem:[]});
  }
  const oppFixed=cOpp=>oppOpenBase+(cl?cOpp:0);
  if(!action){
    // Pas: doğrudan rakibin olası tüm kapalı kartları üzerinden kesin EV
    let ev=0;
    for(const d of oppDist){
      const oppT=oppFixed(d.cOpp);
      if(oppPassed||!d.rem.length){
        ev+=d.w*exactCompare(myBase,oppT,Tg,low,noBust);
      }else{
        // Rakip henüz pas geçmediyse ve kart havuzu küçükse (<=6), rakibin optimal 1-kart tepkisini kesin hesapla
        const standRes=exactCompare(myBase,oppT,Tg,low,noBust);
        let drawRes=0;
        for(const c of d.rem)drawRes+=exactCompare(myBase,oppT+c,Tg,low,noBust);
        drawRes/=d.rem.length;
        // Rakip kendisi için en iyi (bizim için en kötü) seçeneği seçer
        ev+=d.w*Math.min(standRes,drawRes);
      }
    }
    return ev;
  }
  // Kart Çek: her olası (cOpp, cDraw) çifti üzerinden kesin EV
  let ev=0;
  for(const d of oppDist){
    const oppT=oppFixed(d.cOpp);
    if(!d.rem.length){
      ev+=d.w*exactCompare(myBase,oppT,Tg,low,noBust);
      continue;
    }
    let sub=0;
    for(let j=0;j<d.rem.length;j++){
      const cDraw=d.rem[j];
      const newMy=myBase+cDraw;
      if(oppPassed){
        // Çektikten sonra durmak vs 1 kart daha çekmek (optimal devam)
        const sVal=exactCompare(newMy,oppT,Tg,low,noBust);
        let bestNext=sVal;
        if(!low&&newMy<Tg&&d.rem.length>1){
          let d2=0;
          for(let k=0;k<d.rem.length;k++){
            if(k===j)continue;
            d2+=exactCompare(newMy+d.rem[k],oppT,Tg,low,noBust);
          }
          d2/=(d.rem.length-1);
          if(d2>bestNext)bestNext=d2;
        }
        sub+=bestNext;
      }else{
        const sVal=exactCompare(newMy,oppT,Tg,low,noBust);
        let oppDraw=0;
        if(d.rem.length>1){
          for(let k=0;k<d.rem.length;k++){
            if(k===j)continue;
            oppDraw+=exactCompare(newMy,oppT+d.rem[k],Tg,low,noBust);
          }
          oppDraw/=(d.rem.length-1);
          sub+=Math.min(sVal,oppDraw);
        }else{
          sub+=sVal;
        }
      }
    }
    ev+=d.w*(sub/d.rem.length);
  }
  return ev;
}
/* Kahraman Gücü Fırsat Analizi (Hero Power Opportunity Cost) */
function analyzeHeroPowerOpp(S,played,wpPlayed,wpBest,odds,loss){
  if(!S||(S.hpUsed&&S.hpUsed[0]))return null;
  const hid=avKey(S,0);
  const h=HERO_MAP[hid];
  if(!h||h.passive)return null;
  const cl=S.pl[1]&&S.pl[1].closed&&S.pl[1].closed[0];
  const peeked=!!(cl&&((S.oppPeek&&S.oppPeek.includes(cl.id))||cl.o!=null));
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5));
  if(hid==='w'&&cl&&!peeked){
    if(loss>=6||matchPoint||(odds.bustPct>=22&&odds.bustPct<=78)){
      return {
        hid,name:h.hpName,
        sev:loss>=12||matchPoint?'high':'med',
        msg:tr(`${h.hpName} hazırdı: Rakibin kapalı kartını görüp %0 tahmin hatasıyla karar verebilirdin.`,`${h.hpName} was ready: You could reveal opponent's hidden card before making this decision.`)
      };
    }
  }else if(hid==='a'&&S.deck&&S.deck.length>0){
    const drew=played&&played.t==='d';
    if((drew&&odds.bustPct>=22)||(loss>=8&&odds.bustPct>=18&&odds.bustPct<=78)||matchPoint){
      return {
        hid,name:h.hpName,
        sev:(drew&&odds.bustPct>=40)||loss>=14?'high':'med',
        msg:tr(`${h.hpName} hazırdı: Destenin üstündeki 2 kartı önceden görüp sırasını değiştirerek patlama riskini (%${odds.bustPct}) yönetebilirdin.`,`${h.hpName} was ready: Scrying and reordering the top 2 cards would let you control the ${odds.bustPct}% bust risk.`)
      };
    }
  }else if(hid==='l'&&(S.pl[0].open.length||S.pl[0].closed.length)&&(S.pl[1].open.length||S.pl[1].closed.length)){
    if(wpPlayed<=40&&(loss>=6||matchPoint)){
      return {
        hid,name:h.hpName,
        sev:wpPlayed<=28?'high':'med',
        msg:tr(`${h.hpName} hazırdı: Kazanma şansın %${wpPlayed}'e düşmüşken masadaki kartları temizleyip dezavantajı kırabilirdin.`,`${h.hpName} was ready: With win odds down to ${wpPlayed}%, wiping table cards could reset the disadvantage.`)
      };
    }
  }else if(hid==='c'&&((S.cWins&&S.cWins[0])||0)>=4){
    if(wpPlayed<=45){
      return {
        hid,name:h.hpName,
        sev:'high',
        msg:tr(`${h.hpName} (4/4) doluydu: Dezavantajlı bu turda zamanı geri sarıp üstünlüğü ele alabilirdin.`,`${h.hpName} (4/4) was charged: Rewinding this unfavorable round could turn the duel around.`)
      };
    }
  }else if(hid==='p'&&S.hand&&S.hand[0]&&S.hand[0].length>0&&S.jdeck&&S.jdeck.length>0){
    if(wpPlayed<=42&&(!played||played.t!=='j')&&(loss>=8||matchPoint)){
      return {
        hid,name:h.hpName,
        sev:'med',
        msg:tr(`${h.hpName} hazırdı: Elindeki kullanışsız bir jokeri yakıp daha güçlü bir taktik kart arayabilirdin.`,`${h.hpName} was ready: Burning a weak joker in hand could find a decisive tactical tool.`)
      };
    }
  }
  return null;
}
function worldForPlayer(S,stratIdx){ // Oyuncunun o an bildiği bilgilere göre katmanlı Bayesian olasılık dünyası
  const T=clone(S);T.log=[];T.jdeck=[];
  const cl=T.pl[1]&&T.pl[1].closed&&T.pl[1].closed[0];
  const peeked=!!(cl&&((S.oppPeek&&S.oppPeek.includes(cl.id))||cl.o!=null));
  const seenN=new Set([...(S.pl[0].open||[]),...(S.pl[0].closed||[]),...(S.pl[1].open||[]),...(S.dead||[])].map(c=>c.n).filter(n=>n>0));
  if(peeked&&cl.n>0)seenN.add(cl.n);
  let pool=shuf(range(11).filter(n=>!seenN.has(n)));
  if(cl&&!peeked&&pool.length){
    const w=oppCardWeights(S,0,{beta:0.75,gap:6},pool);
    const sm=w.reduce((a,b)=>a+b,0);
    let r=(stratIdx!=null?((stratIdx%16)+Math.random())/16:Math.random())*sm,i=0;
    while(i<w.length-1&&(r-=w[i])>0)i++;
    cl.n=pool[i];
    pool.splice(i,1);
  }
  T.deck=pool.slice(0,(S.deck||[]).length).map(n=>({id:++T.u,n}));
  const knownJ=new Set([...(S.hand[0]||[]),...(S.dj||[])]);
  const oppLen=(S.hand[1]||[]).length;
  let oppHand=shuf(range(24).filter(x=>!knownJ.has(x))).slice(0,oppLen);
  if(avKey(S,1)==='s'&&oppLen&&!(S.dj&&S.dj.includes(25))&&!oppHand.includes(25)){
    oppHand[oppHand.length-1]=25;
  }
  T.hand[1]=oppHand;
  return T;
}
function classifyMove(loss,isSame,brilliant){
  if(isSame&&brilliant)return {cls:'brill',sym:'!!',name:tr('Harika','Brilliant')};
  if(isSame||loss<=3)return {cls:'best',sym:'★',name:tr('En İyi','Best')};
  if(loss<=9)return {cls:'good',sym:'✓',name:tr('İyi','Good')};
  if(loss<=18)return {cls:'inacc',sym:'?!',name:tr('Şüpheli','Inaccuracy')};
  if(loss<=30)return {cls:'mistake',sym:'?',name:tr('Hata','Mistake')};
  return {cls:'blunder',sym:'??',name:tr('Vahim Hata','Blunder')};
}
function explainMoveV3(S,played,best,loss,odds,wpBest,wpPlayed){
  if(loss<=3)return '';
  const low=lowW(S),Tg=tg(S),oppOpen=total(S,1,false);
  if(!best&&!low&&oppOpen>Tg&&!act(S,20)){
    return tr(`Rakip açıktan ${oppOpen}/${Tg} ile patlamışken kaynak harcamadan pas geçmek %${wpBest} kazanma şansı veriyordu.`,`Opponent was visibly busted (${oppOpen}/${Tg}); standing gave ${wpBest}% win odds without spending resources.`);
  }
  if(played&&played.t==='d'&&!best){
    return tr(`Kalan ${odds.poolLen} bilinmeyen kartın ${odds.bustCnt}'i patlatıyordu (%${odds.bustPct} patlama riski). Pas geçmek kazanma şansını %${wpBest} seviyesinde tutuyordu.`,`${odds.bustCnt} of ${odds.poolLen} unseen cards would bust you (${odds.bustPct}% bust risk). Standing kept ${wpBest}% win odds.`);
  }
  if(!played&&best&&best.t==='d'){
    return tr(`Bilinmeyen ${odds.poolLen} kartın ${odds.safeCnt}'i güvenliydi (%${odds.safePct}${odds.exactCnt?`, ${odds.exactCnt} tam hedef`:''}). Kart çekerek %${wpBest} kazanma şansına ulaşılabilirdi.`,`${odds.safeCnt} of ${odds.poolLen} unseen cards were safe (${odds.safePct}%${odds.exactCnt?`, ${odds.exactCnt} exact target`:''}). Drawing raised win odds to ${wpBest}%.`);
  }
  if(best&&best.t==='j'){
    return tr(`"${fmtAct(best,S)}" hamlesi puan/hedef dengesini lehine çevirip kazanma şansını %${wpPlayed} → %${wpBest} seviyesine taşıyordu.`,`"${fmtAct(best,S)}" swung the round/target balance, lifting win odds from ${wpPlayed}% to ${wpBest}%.`);
  }
  if(played&&played.t==='j'&&!best){
    return tr(`Bu tur joker harcamak yerine pas geçip kaynağı sonraki turlara saklamak (+%${loss} daha yüksek EV) daha kârlıydı.`,`Saving the joker for later rounds instead of spending it here gave +${loss}% higher win equity.`);
  }
  return tr(`Önerilen hat kazanma olasılığını %${wpPlayed} yerine %${wpBest} seviyesine çıkarıyordu.`,`The recommended line lifted win probability from ${wpPlayed}% to ${wpBest}%.`);
}
function evalOneMove(h){
  const S=h.snap;
  const odds=calcDeckOdds(S);
  const AN_PRM={rand:0,noise:0,jc:.07,jl:.025,jp:1,dm:.01,depth:1,beta:.75,gap:6,hero:1,bo3:1,deepRoll:1};
  const AN_RP={rand:0,noise:0,jc:.09,jl:.035,jp:.95,dm:.01,depth:1,beta:.5,gap:6,hero:1,bo3:1};
  let all=listC(S,0,AN_PRM).sort((x,y)=>y.v-x.v);
  const cands=all.slice(0,9);
  const ensure=a=>{if(!cands.some(c=>sameAct(c.a,a)))cands.push({a,v:0})};
  ensure(null);
  if(canDraw(S,0)&&!lowW(S)&&total(S,0,true)<tg(S))ensure({t:'d'});
  ensure(h.action);
  const piOrig=cands.findIndex(c=>sameAct(c.a,h.action));
  // 1. Kesin Matematiksel Çözücü kontrolü (rakip pas geçtiğinde veya kalan havuz <= 6)
  const exactVals=cands.map(c=>exactEndgameEval(S,c.a));
  const exactUsed=exactVals.some(v=>v!==null);
  const needMC=exactVals.some(v=>v===null);
  const K1=48,K2=isMobilePerf()?92:192;
  const Ktot=needMC?(K1+K2):0;
  const sums=cands.map(()=>0),cnts=cands.map(()=>0),alive=cands.map((_,i)=>exactVals[i]===null);
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5));
  const jCost=matchPoint?0.012:0.034;
  for(let k=0;k<Ktot;k++){
    const W=worldForPlayer(S,k);
    for(let i=0;i<cands.length;i++){
      if(!alive[i])continue;
      const T=clone(W);
      const j0=[jCnt(T,0),jCnt(T,1)];
      let r=0;
      try{r=rollout(T,0,cands[i].a,AN_RP)}catch(e){r=0}
      sums[i]+=r-jCost*((jCnt(T,0)-j0[0])-0.5*(jCnt(T,1)-j0[1]));
      cnts[i]++;
    }
    // Successive Halving: ilk 48 katmanlı dünyadan sonra açıkça zayıf adayları ele, bütçeyi en yakın 4 adaya + oynanan hamleye yoğunlaştır
    if(k===K1-1&&cands.length>4){
      const means=cands.map((_,i)=>exactVals[i]!==null?exactVals[i]:sums[i]/Math.max(1,cnts[i]));
      const bestM=Math.max(...means);
      const ord=cands.map((_,i)=>i).sort((a,b)=>means[b]-means[a]);
      const keep=new Set(ord.slice(0,4));
      if(piOrig>=0)keep.add(piOrig);
      for(let i=0;i<cands.length;i++){
        if(alive[i]&&!keep.has(i)&&means[i]<bestM-0.32)alive[i]=false;
      }
    }
  }
  const evs=cands.map((_,i)=>exactVals[i]!==null?exactVals[i]:sums[i]/Math.max(1,cnts[i]));
  const ordAll=cands.map((_,i)=>i).sort((a,b)=>evs[b]-evs[a]);
  const bi=ordAll[0],si=ordAll.length>1?ordAll[1]:-1;
  const pi=piOrig>=0?piOrig:0;
  const toWp=v=>Math.max(0,Math.min(100,Math.round(((Math.max(-1,Math.min(1,v))+1)/2)*100)));
  const wpBest=toWp(evs[bi]),wpPlayed=toWp(evs[pi]);
  const wpSecond=si>=0?toWp(evs[si]):wpBest;
  const loss=Math.max(0,wpBest-wpPlayed);
  const isSame=sameAct(cands[pi].a,cands[bi].a);
  const brilliant=isSame&&cands.length>=2&&(wpBest-wpSecond>=12)&&!!(cands[bi].a&&(cands[bi].a.t==='j'||cands[bi].a.t==='d'));
  const grade=classifyMove(loss,isSame,brilliant);
  const acc=100*Math.exp(-0.032*loss);
  const reason=isSame?'':explainMoveV3(S,h.action,cands[bi].a,loss,odds,wpBest,wpPlayed);
  const hpOpp=analyzeHeroPowerOpp(S,h.action,wpPlayed,wpBest,odds,loss);
  const top3=ordAll.slice(0,3).map(idx=>({
    label:fmtAct(cands[idx].a,S),
    wp:toWp(evs[idx]),
    diff:Math.max(0,wpBest-toWp(evs[idx])),
    isPlayed:idx===pi,
    isBest:idx===bi,
    isExact:exactVals[idx]!==null
  }));
  return {
    ...h,
    odds,
    top3,
    wpPlayed,
    wpBest,
    loss,
    acc,
    grade,
    reason,
    exactUsed,
    hpOpp,
    bestLabel:fmtAct(cands[bi].a,S),
    isSame
  };
}
function computeMatchStats(results){
  const n=Math.max(1,results.length);
  const avgAcc=Math.round(results.reduce((a,r)=>a+r.acc,0)/n);
  const avgLoss=results.reduce((a,r)=>a+r.loss,0)/n;
  const cnt={brill:0,best:0,good:0,inacc:0,mistake:0,blunder:0};
  results.forEach(r=>{if(cnt[r.grade.cls]!=null)cnt[r.grade.cls]++});
  // Tahmini NecroElo (900 - 2550)
  const rawElo=920+avgAcc*14.8+cnt.brill*45-cnt.blunder*65-cnt.mistake*22;
  const elo=Math.max(850,Math.min(2600,Math.round(rawElo/10)*10));
  const rank=avgAcc>=93?{g:'S+',t:tr('Efsane','Grandmaster'),c:'brill'}:avgAcc>=85?{g:'A',t:tr('Usta','Master'),c:'best'}:avgAcc>=75?{g:'B',t:tr('İyi','Strong'),c:'good'}:avgAcc>=62?{g:'C',t:tr('Orta','Solid'),c:'inacc'}:{g:'D',t:tr('Gelişmeli','Needs Work'),c:'blunder'};
  const avgOf=arr=>arr.length?Math.round(arr.reduce((a,r)=>a+r.acc,0)/arr.length):null;
  const skills=[
    {name:tr('Kart Çekme','Card Drawing'),val:avgOf(results.filter(r=>r.kind==='draw')),cnt:results.filter(r=>r.kind==='draw').length},
    {name:tr('Pas Zamanlaması','Stand / Pass'),val:avgOf(results.filter(r=>r.kind==='pass')),cnt:results.filter(r=>r.kind==='pass').length},
    {name:tr('Joker Stratejisi','Joker Play'),val:avgOf(results.filter(r=>r.kind==='joker')),cnt:results.filter(r=>r.kind==='joker').length},
    {name:tr('Kritik Anlar','Clutch Moments'),val:avgOf(results.filter(r=>r.matchPoint)),cnt:results.filter(r=>r.matchPoint).length}
  ];
  const duelMap=new Map();
  results.forEach(r=>{
    if(!duelMap.has(r.duel))duelMap.set(r.duel,[]);
    duelMap.get(r.duel).push(r);
  });
  const duels=[...duelMap.entries()].map(([d,arr])=>({duel:d,acc:avgOf(arr),moves:arr.length}));
  // Kırılma Anı (en büyük EV kaybı), En Parlak Hamle & Kaçan Kahraman Gücü Fırsatları
  let worstIdx=-1,bestIdx=-1;
  const hpMissed=[];
  let exactCount=0;
  results.forEach((r,i)=>{
    if(r.exactUsed)exactCount++;
    if(r.hpOpp)hpMissed.push({idx:i,...r.hpOpp});
    if(r.loss>0&&(worstIdx<0||r.loss>results[worstIdx].loss))worstIdx=i;
    if(bestIdx<0||(r.grade.cls==='brill'&&results[bestIdx].grade.cls!=='brill')||(r.grade.cls===results[bestIdx].grade.cls&&r.wpPlayed>results[bestIdx].wpPlayed))bestIdx=i;
  });
  return {avgAcc,avgLoss:avgLoss.toFixed(1),elo,rank,cnt,skills,duels,worstIdx,bestIdx,hpMissed,exactCount};
}
function buildWinGraphSvg(results,selectedIdx){
  if(!results.length)return '';
  const W=460,H=78,padX=14,padY=10;
  const n=results.length;
  const xOf=i=>n===1?W/2:padX+(i/(n-1))*(W-padX*2);
  const yOf=wp=>padY+((100-wp)/100)*(H-padY*2);
  const pts=results.map((r,i)=>`${xOf(i).toFixed(1)},${yOf(r.wpPlayed).toFixed(1)}`).join(' ');
  const area=`${xOf(0).toFixed(1)},${H-padY} ${pts} ${xOf(n-1).toFixed(1)},${H-padY}`;
  const colMap={brill:'#38bdf8',best:'#fde68a',good:'#4ade80',inacc:'#fbbf24',mistake:'#fb923c',blunder:'#f87171'};
  let dividers='';
  for(let i=1;i<n;i++){
    if(results[i].duel!==results[i-1].duel){
      const mx=((xOf(i-1)+xOf(i))/2).toFixed(1);
      dividers+=`<line x1="${mx}" y1="${padY}" x2="${mx}" y2="${H-padY}" stroke="rgba(212,168,85,0.28)" stroke-dasharray="2 3" stroke-width="1"/>`;
    }
  }
  const dots=results.map((r,i)=>{
    const c=colMap[r.grade.cls]||'#fde68a';
    const isSel=i===selectedIdx;
    const rad=isSel?5.5:(r.grade.cls==='blunder'||r.grade.cls==='brill')?4.2:3.1;
    return `<circle class="an-dot" data-mi="${i}" cx="${xOf(i).toFixed(1)}" cy="${yOf(r.wpPlayed).toFixed(1)}" r="${rad}" fill="${c}" stroke="${isSel?'#ffffff':'#0b0809'}" stroke-width="${isSel?2:1.2}"><title>#${i+1}: ${r.label} (%${r.wpPlayed})</title></circle>`;
  }).join('');
  return `<div class="an-graph-wrap">
    <div class="an-graph-lbl"><span>${tr('Kazanma Olasılığı Eğrisi (Hamleye tıkla)','Win Probability Curve (Click any move)')}</span><b>%50</b></div>
    <svg class="an-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="anFillG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde68a" stop-opacity="0.34"/><stop offset="100%" stop-color="#fde68a" stop-opacity="0.02"/></linearGradient></defs>
      ${dividers}
      <line x1="${padX}" y1="${(H/2).toFixed(1)}" x2="${W-padX}" y2="${(H/2).toFixed(1)}" stroke="rgba(255,255,255,0.18)" stroke-dasharray="4 4" stroke-width="1"/>
      <polygon points="${area}" fill="url(#anFillG)"/>
      <polyline points="${pts}" fill="none" stroke="#f5d07a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>
  </div>`;
}
function openMatchAnalysis(endTplHtml,moBtn,mxBtn){
  const mb=$('#mb');
  if(!mb||!LAST_MATCH_HIST.length)return;
  const hist=[...LAST_MATCH_HIST];
  const results=[];
  let idx=0,cancelled=false,anView='moves',anFilter='all',openMoveIdx=-1;
  mb.classList.remove('end-mode','set-mode');
  mb.classList.add('an-mode');
  mb.innerHTML=`<div class="an-loading">
    <h3>${tr('NecroEngine v4 Maç Analizi','NecroEngine v4 Match Analysis')}</h3>
    <p class="an-sub">${tr('Kesin kombinatoryal çözücü, kahraman gücü fırsatları ve Multi-PV hatları taranıyor…','Scanning Exact Endgame Solver, Hero Power opportunities & Multi-PV lines…')}</p>
    <div class="an-pbar"><i id="an-fill"></i></div>
    <div id="an-stat" class="an-stat">0 / ${hist.length}</div>
  </div>`;
  const restoreEnd=()=>{
    cancelled=true;
    mb.classList.remove('an-mode');
    mb.classList.add('end-mode');
    mb.innerHTML=endTplHtml;
    const row=mb.querySelector('.end-acts');
    if(row){
      const ab=document.createElement('button');
      ab.id='btn-analyze';ab.className='btn alt';
      ab.textContent=tr('Maçı Analiz Et','Analyze Match');
      ab.onclick=()=>openMatchAnalysis(endTplHtml,moBtn,mxBtn);
      row.appendChild(ab);
      if(moBtn){moBtn.style.visibility='';row.appendChild(moBtn)}
      if(mxBtn){mxBtn.style.visibility='';row.appendChild(mxBtn)}
    }
  };
  const renderReport=(scrollToIdx)=>{
    const st=computeMatchStats(results);
    const cnt=st.cnt;
    let bodyContent='';
    if(anView==='summary'){
      const kmWorst=st.worstIdx>=0?results[st.worstIdx]:null;
      const kmBest=st.bestIdx>=0?results[st.bestIdx]:null;
      const skillsHtml=st.skills.map(sk=>{
        const v=sk.val;
        const barCol=v==null?'#64748b':v>=85?'#4ade80':v>=68?'#fde68a':'#fb923c';
        return `<div class="an-sk-row">
          <div class="an-sk-top"><span>${sk.name}</span><b>${v==null?'—':`%${v}`}</b></div>
          <div class="an-sk-bar"><i style="width:${v||0}%;background:${barCol}"></i></div>
        </div>`;
      }).join('');
      const duelsHtml=st.duels.map(d=>`<div class="an-duel-chip"><span>${tr('Düello','Duel')} ${d.duel}</span><b>%${d.acc}</b><small>${d.moves} ${tr('hamle','moves')}</small></div>`).join('');
      const hpMissedHtml=st.hpMissed&&st.hpMissed.length
        ?`<div class="an-sec-lbl">${tr('Kahraman Gücü Fırsatları','Hero Power Opportunities')} (${st.hpMissed.length})</div>
          <div class="an-hp-list">${st.hpMissed.slice(0,4).map(m=>`<button type="button" class="an-hp-chip ${m.sev}" data-jump="${m.idx}"><b>⚡ ${m.name} · #${m.idx+1}</b><span>${m.msg}</span></button>`).join('')}</div>`
        :'';
      bodyContent=`<div class="an-summary-scroll">
        <div class="an-sec-lbl">${tr('Yetenek Karnesi','Skill Breakdown')}</div>
        <div class="an-skills">${skillsHtml}</div>
        <div class="an-sec-lbl">${tr('Kırılma Anları','Key Moments')}</div>
        <div class="an-km-grid">
          ${kmBest?`<button type="button" class="an-km-card good" data-jump="${st.bestIdx}"><span>${tr('En İyi Hamle','Top Move')} · #${st.bestIdx+1}</span><b>${kmBest.label}</b><small>%${kmBest.wpPlayed} ${tr('kazanma','win')}</small></button>`:''}
          ${kmWorst?`<button type="button" class="an-km-card bad" data-jump="${st.worstIdx}"><span>${tr('En Büyük Kayıp','Biggest Slip')} · #${st.worstIdx+1}</span><b>${kmWorst.label}</b><small>−%${kmWorst.loss} → ${kmWorst.bestLabel}</small></button>`:`<div class="an-km-card good"><span>${tr('Kusursuz Maç','Flawless Match')}</span><b>${tr('Büyük hata yok!','No major slips!')}</b><small>${tr('Harika disiplin','Great discipline')}</small></div>`}
        </div>
        ${hpMissedHtml}
        <div class="an-sec-lbl">${tr('Düello Bazlı Doğruluk','Duel Accuracy')}</div>
        <div class="an-duels">${duelsHtml}</div>
      </div>`;
    }else{
      const shown=results.map((r,i)=>({r,i})).filter(({r})=>{
        if(anFilter==='crit')return r.grade.cls==='blunder'||r.grade.cls==='mistake'||r.grade.cls==='inacc';
        if(anFilter==='best')return r.grade.cls==='brill'||r.grade.cls==='best';
        return true;
      });
      const rowsHtml=shown.length?shown.map(({r,i})=>{
        const isOpen=i===openMoveIdx;
        const ctx=`D${r.duel}·T${r.round} · ${tr('Toplam','Tot')} ${r.myTot}/${r.low?tr('En Az','Low'):r.tg}`;
        const exactTag=r.exactUsed?`<span class="an-exact-tag" title="${tr('Kesin Matematiksel Çözüm (%0 varyans)','Exact Combinatorial Solution (0% variance)')}">∑ ${tr('Kesin','Exact')}</span>`:'';
        const hpTag=r.hpOpp?`<span class="an-hp-tag" title="${r.hpOpp.name}">⚡ ${tr('Güç','Power')}</span>`:'';
        const rec=r.isSame||r.loss<=3
          ?`<span class="an-ok">${r.grade.cls==='brill'?tr('Harika hamle! Tek kazandıran yol.','Brilliant move! Unique winning line.'):tr('En iyi hamle!','Best move!')}</span>`
          :`<span class="an-rec">${tr('Öneri','Best')}: <b>${r.bestLabel}</b> <i>(%${r.wpBest})</i> · −%${r.loss}</span>`;
        let detailHtml='';
        if(isOpen){
          const pvHtml=(r.top3||[]).map((pv,k)=>`<div class="an-pv${pv.isPlayed?' played':''}${pv.isBest?' best':''}">
            <span class="an-pv-rk">#${k+1}</span>
            <span class="an-pv-lbl">${pv.label}${pv.isExact?' <sup>∑</sup>':''}${pv.isPlayed?` <em>(${tr('Sen','You')})</em>`:''}</span>
            <div class="an-pv-bar"><i style="width:${pv.wp}%"></i></div>
            <b class="an-pv-wp">%${pv.wp}</b>
          </div>`).join('');
          const myCardsTxt=[...(r.myOpen||[]),...(r.myClosed||[]).map(x=>`[${x}]`)].join(', ')||'—';
          const oppCardsTxt=(r.oppOpenCards||[]).join(', ')||'—';
          const oddsTxt=r.low
            ?tr('En az kazanır modu aktif','Lowest-wins mode active')
            :tr(`Patlama riski: %${r.odds.bustPct} · Güvenli çekim: %${r.odds.safePct}`,`Bust risk: ${r.odds.bustPct}% · Safe draw: ${r.odds.safePct}%`);
          detailHtml=`<div class="an-detail">
            <div class="an-pos-bar">
              <span>${tr('Kartların','Your cards')}: <b>${myCardsTxt}</b></span>
              <span>${tr('Rakip açık','Opp open')}: <b>${oppCardsTxt}</b></span>
            </div>
            <div class="an-odds-line">${oddsTxt}${r.exactUsed?` · <b>∑ ${tr('Kesin Matematiksel Çözüm','Exact Endgame Solver')}</b>`:''}</div>
            <div class="an-pv-title">${tr('Motorun En İyi 3 Hattı (Multi-PV)','Top 3 Engine Lines (Multi-PV)')}</div>
            <div class="an-pvs">${pvHtml}</div>
            ${r.hpOpp?`<div class="an-hp-alert"><b>⚡ ${tr('Kahraman Gücü Fırsatı','Hero Power Opportunity')} (${r.hpOpp.name}):</b> ${r.hpOpp.msg}</div>`:''}
            ${r.reason?`<div class="an-why">${r.reason}</div>`:''}
          </div>`;
        }
        return `<div class="an-row ${r.grade.cls}${isOpen?' open':''}" data-mi="${i}">
          <div class="an-row-main">
            <div class="an-badge ${r.grade.cls}">${r.grade.sym}</div>
            <div class="an-body">
              <div class="an-top"><span class="an-ctx">#${i+1} · ${ctx}</span><span class="an-tags">${exactTag}${hpTag}<span class="an-gname ${r.grade.cls}">${r.grade.name}</span></span></div>
              <div class="an-move"><b>${r.label}</b> <i>(%${r.wpPlayed})</i></div>
              <div class="an-bot">${rec}</div>
            </div>
            <span class="an-chev">${isOpen?'▾':'▸'}</span>
          </div>
          ${detailHtml}
        </div>`;
      }).join(''):`<div class="an-empty">${tr('Bu filtrede hamle yok.','No moves in this filter.')}</div>`;
      bodyContent=`<div class="an-filters">
        <button type="button" class="an-flt${anFilter==='all'?' act':''}" data-af="all">${tr('Tümü','All')} (${results.length})</button>
        <button type="button" class="an-flt${anFilter==='crit'?' act':''}" data-af="crit">${tr('Hatalar','Mistakes')} (${cnt.inacc+cnt.mistake+cnt.blunder})</button>
        <button type="button" class="an-flt${anFilter==='best'?' act':''}" data-af="best">${tr('En İyiler','Best')} (${cnt.brill+cnt.best})</button>
      </div>
      <div class="an-list">${rowsHtml}</div>`;
    }
    mb.innerHTML=`<div class="an-report">
      <div class="an-hdr">
        <div>
          <h3>${tr('NecroEngine v4','NecroEngine v4')}</h3>
          <div class="an-meta">${tr('Performans ELO','Perf. ELO')}: <b>${st.elo}</b> · ${tr('Ort. Kayıp','Avg Loss')}: <b>−%${st.avgLoss}</b>${st.exactCount?` · <b>∑ ${st.exactCount}</b>`:''}</div>
        </div>
        <div class="an-hdr-r">
          <div class="an-rank-box ${st.rank.c}"><b>${st.rank.g}</b><span>${st.rank.t}</span></div>
          <div class="an-acc-box"><span>${tr('Doğruluk','Accuracy')}</span><b>%${st.avgAcc}</b></div>
        </div>
      </div>
      ${buildWinGraphSvg(results,openMoveIdx)}
      <div class="an-view-tabs">
        <button type="button" class="an-vtab${anView==='moves'?' act':''}" data-av="moves">${tr('Hamleler & Multi-PV','Moves & Multi-PV')}</button>
        <button type="button" class="an-vtab${anView==='summary'?' act':''}" data-av="summary">${tr('Özet Karne','Match Report')}</button>
      </div>
      ${bodyContent}
      <div class="row an-acts">
        <button id="an-back" class="btn alt sm">${tr('← Sonuçlara Dön','← Back to Results')}</button>
        <button id="an-menu" class="btn sm">${tr('Ana Menü','Main Menu')}</button>
      </div>
    </div>`;
    mb.querySelectorAll('.an-vtab').forEach(b=>b.onclick=()=>{snd('click');anView=b.dataset.av;renderReport()});
    mb.querySelectorAll('.an-flt').forEach(b=>b.onclick=()=>{snd('click');anFilter=b.dataset.af;renderReport()});
    mb.querySelectorAll('.an-row-main').forEach(el=>el.onclick=()=>{
      const rEl=el.closest('.an-row');if(!rEl)return;
      const mi=+rEl.dataset.mi;
      snd('click');
      openMoveIdx=(openMoveIdx===mi)?-1:mi;
      renderReport();
    });
    mb.querySelectorAll('.an-dot').forEach(dot=>dot.onclick=()=>{
      const mi=+dot.dataset.mi;
      snd('click');
      anView='moves';anFilter='all';openMoveIdx=mi;
      renderReport(mi);
    });
    mb.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{
      const mi=+b.dataset.jump;
      snd('click');
      anView='moves';anFilter='all';openMoveIdx=mi;
      renderReport(mi);
    });
    if(scrollToIdx!=null&&scrollToIdx>=0){
      const target=mb.querySelector(`.an-row[data-mi="${scrollToIdx}"]`);
      if(target&&target.scrollIntoView)target.scrollIntoView({block:'center',behavior:'smooth'});
    }
    const bk=$('#an-back'),mn=$('#an-menu');
    if(bk)bk.onclick=()=>{snd('click');restoreEnd()};
    if(mn)mn.onclick=()=>{snd('click');exitGame()};
  };
  const step=()=>{
    if(cancelled||!mb.isConnected)return;
    if(idx<hist.length){
      results.push(evalOneMove(hist[idx]));
      idx++;
      const fill=$('#an-fill'),stEl=$('#an-stat');
      if(fill)fill.style.width=Math.round((idx/hist.length)*100)+'%';
      if(stEl)stEl.textContent=`${idx} / ${hist.length}`;
      setTimeout(step,0);
      return;
    }
    renderReport();
    snd('ok');
  };
  setTimeout(step,30);
}

/* ---------- ELO & ÜYELİK SİSTEMİ (KAYIT / GİRİŞ / MİSAFİR) ---------- */
const AUTH_SESS_KEY='nd_session_v1';
const AUTH_LOCAL_KEY='nd_users_local_v1';
let USER_ACC=null;

function escHtml(s){
  return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function normUserKey(u){
  return String(u||'').trim().toLowerCase().replace(/[^a-z0-9_çğıöşü-]/g,'');
}
function hashPass(p){
  const str='nd_salt_v1::'+String(p||'');
  let h1=0x811c9dc5,h2=0x9e3779b9;
  for(let i=0;i<str.length;i++){
    const c=str.charCodeAt(i);
    h1=Math.imul(h1^c,0x01000193);
    h2=Math.imul(h2^(c+i),0x85ebca6b);
  }
  return ((h1>>>0).toString(16).padStart(8,'0'))+((h2>>>0).toString(16).padStart(8,'0'));
}
function eloRank(elo){
  const e=Math.round(elo||1200);
  if(e>=1800)return {ic:'♛',name:tr('Ölümsüz Hükümdar','Undying Sovereign'),cls:'rk-sov'};
  if(e>=1600)return {ic:'✦',name:tr('Ölüm Büyücüsü','Necromancer'),cls:'rk-nec'};
  if(e>=1400)return {ic:'◈',name:tr('Kan Efendisi','Blood Lord'),cls:'rk-bld'};
  if(e>=1200)return {ic:'⚔',name:tr('Kara Şövalye','Dark Knight'),cls:'rk-knt'};
  if(e>=1000)return {ic:'☾',name:tr('Gölge Gezgini','Shadow Walker'),cls:'rk-shd'};
  return {ic:'☠',name:tr('Kemik Çırağı','Bone Initiate'),cls:'rk-bon'};
}
function loadLocalUsers(){
  try{return JSON.parse(localStorage.getItem(AUTH_LOCAL_KEY)||'{}')||{}}catch(e){return {}}
}
function saveLocalUsers(map){
  try{localStorage.setItem(AUTH_LOCAL_KEY,JSON.stringify(map))}catch(e){}
}
function loadSession(){
  try{
    const raw=localStorage.getItem(AUTH_SESS_KEY);
    if(!raw)return null;
    const o=JSON.parse(raw);
    if(o&&typeof o.elo==='number')return o;
  }catch(e){}
  return null;
}
function saveSession(acc){
  USER_ACC=acc;
  try{
    if(acc)localStorage.setItem(AUTH_SESS_KEY,JSON.stringify(acc));
    else localStorage.removeItem(AUTH_SESS_KEY);
  }catch(e){}
  if(acc&&!acc.isGuest&&acc.key){
    const map=loadLocalUsers();
    map[acc.key]={...(map[acc.key]||{}),...acc};
    saveLocalUsers(map);
    syncAccountToCloud(acc);
  }
  renderAuthBar();
}
function syncAccountToCloud(acc){
  if(!fbDb||!acc||acc.isGuest||!acc.key)return;
  try{
    fbDb.collection('users').doc(acc.key).set({
      key:acc.key,
      username:acc.username,
      passHash:acc.passHash||'',
      elo:acc.elo,
      peakElo:acc.peakElo||acc.elo,
      wins:acc.wins||0,
      losses:acc.losses||0,
      matches:acc.matches||0,
      history:(acc.history||[]).slice(0,12),
      updatedAt:Date.now()
    },{merge:true}).catch(()=>{});
  }catch(e){}
}
function createGuestAccount(){
  const acc={
    uid:'guest_'+Date.now().toString(36),
    key:'',
    username:tr('Misafir','Guest'),
    isGuest:true,
    elo:1200,
    peakElo:1200,
    wins:0,
    losses:0,
    matches:0,
    history:[],
    createdAt:Date.now()
  };
  saveSession(acc);
  return acc;
}
function getOppElo(){
  if(MODE==='bot'){
    if(DIFF==='easy')return 900;
    if(DIFF==='med')return 1150;
    if(DIFF==='hard')return 1400;
    if(DIFF==='imp')return 1750;
    return 1150;
  }
  return 1250;
}
function getOppLabel(){
  if(MODE==='bot'){
    if(DIFF==='easy')return tr('Bot (Kolay)','Bot (Easy)');
    if(DIFF==='med')return tr('Bot (Orta)','Bot (Medium)');
    if(DIFF==='hard')return tr('Bot (Zor)','Bot (Hard)');
    if(DIFF==='imp')return tr('Bilinmeyen (İmkansız)','Unknown (Impossible)');
  }
  return tr('Çevrim İçi Rakip','Online Opponent');
}
function recordMatchElo(S,won){
  if(!S||MODE==='tutorial'||MODE==='spectator')return null;
  if(S._eloRes)return S._eloRes;
  if(!USER_ACC)createGuestAccount();
  const acc=USER_ACC;
  const before=Math.round(acc.elo||1200);
  const oppElo=getOppElo();
  const expected=1/(1+Math.pow(10,(oppElo-before)/400));
  const K=(acc.matches||0)<15?32:24;
  let delta=Math.round(K*((won?1:0)-expected));
  if(won&&delta<4)delta=4;
  if(!won&&delta>-4)delta=-4;
  const after=Math.max(400,before+delta);
  acc.elo=after;
  acc.peakElo=Math.max(acc.peakElo||before,after);
  acc.matches=(acc.matches||0)+1;
  if(won)acc.wins=(acc.wins||0)+1;
  else acc.losses=(acc.losses||0)+1;
  acc.history=acc.history||[];
  acc.history.unshift({ts:Date.now(),opp:getOppLabel(),won:!!won,delta,elo:after});
  if(acc.history.length>12)acc.history.length=12;
  saveSession(acc);
  S._eloRes={before,after,delta,rank:eloRank(after)};
  return S._eloRes;
}
function renderAuthBar(){
  const bar=$('#auth-bar');
  if(!bar)return;
  if(!USER_ACC){
    bar.hidden=false;
    bar.innerHTML=`<button type="button" class="auth-pill auth-pill-empty" id="ab-login"><span>${tr('Giriş Yap / Kayıt Ol','Sign In / Register')}</span></button>`;
    const btn=$('#ab-login');
    if(btn)btn.onclick=()=>{snd('click');openAuthModal('login',false)};
    return;
  }
  const rk=eloRank(USER_ACC.elo);
  const nm=USER_ACC.isGuest?tr('Misafir','Guest'):escHtml(USER_ACC.username);
  bar.hidden=false;
  bar.innerHTML=`<button type="button" class="auth-pill ${rk.cls}" id="ab-prof" title="${tr('Profil & ELO Detayları','Profile & ELO Details')}">
    <span class="ap-ic">${rk.ic}</span>
    <span class="ap-info">
      <b>${nm}${USER_ACC.isGuest?` <em>(${tr('Misafir','Guest')})</em>`:''}</b>
      <small>${rk.name}</small>
    </span>
    <span class="ap-elo">${Math.round(USER_ACC.elo||1200)} <i>ELO</i></span>
  </button>`;
  const pb=$('#ab-prof');
  if(pb)pb.onclick=()=>{snd('click');openProfileModal()};
}
function openProfileModal(){
  if(!USER_ACC)return openAuthModal('login',false);
  const acc=USER_ACC;
  const rk=eloRank(acc.elo);
  const nm=acc.isGuest?tr('Misafir Oyuncu','Guest Player'):escHtml(acc.username);
  const wr=acc.matches?Math.round(((acc.wins||0)/acc.matches)*100):0;
  const histHtml=(acc.history&&acc.history.length)
    ?acc.history.slice(0,6).map(h=>`<div class="pr-hrow ${h.won?'w':'l'}">
        <span>${h.won?tr('Zafer','Win'):tr('Mağlubiyet','Loss')} · ${escHtml(h.opp)}</span>
        <b>${h.delta>=0?'+':''}${h.delta} ELO <i>(${h.elo})</i></b>
      </div>`).join('')
    :`<div class="pr-hempty">${tr('Henüz dereceli maç oynanmadı.','No ranked matches played yet.')}</div>`;
  const mb=$('#mb');
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="pr-wrap">
    <div class="pr-head">
      <div class="pr-badge ${rk.cls}">${rk.ic}</div>
      <div class="pr-titles">
        <h3>${nm}</h3>
        <div class="pr-rank">${rk.name} · <b>${Math.round(acc.elo||1200)} ELO</b></div>
      </div>
    </div>
    <div class="pr-grid">
      <div class="pr-stat"><span>${tr('Güncel ELO','Current ELO')}</span><b>${Math.round(acc.elo||1200)}</b></div>
      <div class="pr-stat"><span>${tr('Zirve ELO','Peak ELO')}</span><b>${Math.round(acc.peakElo||acc.elo||1200)}</b></div>
      <div class="pr-stat"><span>${tr('Galibiyet / Mağlubiyet','Wins / Losses')}</span><b>${acc.wins||0} / ${acc.losses||0}</b></div>
      <div class="pr-stat"><span>${tr('Kazanma Oranı','Win Rate')}</span><b>%${wr}</b></div>
    </div>
    <div class="pr-sec-lbl">${tr('Son Maçlar','Recent Matches')}</div>
    <div class="pr-hist">${histHtml}</div>
    <div class="row pr-acts">
      ${acc.isGuest
        ?`<button type="button" id="pr-upg" class="btn alt sm">${tr('Üye Ol (ELO’nu Kaydet)','Register (Save ELO)')}</button>
          <button type="button" id="pr-sw" class="btn sm">${tr('Giriş Yap','Sign In')}</button>`
        :`<button type="button" id="pr-out" class="btn sm">${tr('Çıkış Yap','Sign Out')}</button>`}
      <button type="button" id="pr-close" class="btn alt sm">${tr('Kapat','Close')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false};
  if($('#pr-close'))$('#pr-close').onclick=()=>{snd('click');close()};
  if($('#pr-upg'))$('#pr-upg').onclick=()=>{snd('click');openAuthModal('register',true)};
  if($('#pr-sw'))$('#pr-sw').onclick=()=>{snd('click');openAuthModal('login',false)};
  if($('#pr-out'))$('#pr-out').onclick=()=>{snd('click');saveSession(null);openAuthModal('login',false)};
}
function openAuthModal(initialTab='login',isUpgrade=false){
  let tab=initialTab==='register'?'register':'login';
  const mb=$('#mb');
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode');
  mb.classList.add('auth-mode');
  const render=()=>{
    const isReg=tab==='register';
    mb.innerHTML=`<div class="auth-wrap">
      <div class="auth-crest">⚔</div>
      <h3>${isUpgrade?tr('Misafir Hesabını Kaydet','Save Guest Progress'):tr('Necrodice Hesabı','Necrodice Account')}</h3>
      <p class="auth-sub">${isUpgrade
        ?tr(`Mevcut ${Math.round((USER_ACC&&USER_ACC.elo)||1200)} ELO puanın ve istatistiklerin yeni hesabına aktarılacak.`,`Your current ${Math.round((USER_ACC&&USER_ACC.elo)||1200)} ELO and stats will be transferred to your new account.`)
        :tr('ELO puanını kaydetmek ve rütbeni yükseltmek için giriş yap veya misafir olarak hemen oyna.','Sign in to save your ELO rating & rank, or jump right in as a guest.')}</p>
      <div class="auth-tabs">
        <button type="button" class="auth-tab${!isReg?' act':''}" data-at="login">${tr('Giriş Yap','Sign In')}</button>
        <button type="button" class="auth-tab${isReg?' act':''}" data-at="register">${tr('Kayıt Ol','Register')}</button>
      </div>
      <form id="auth-form" class="auth-form" autocomplete="off">
        <label class="auth-lbl">${tr('Kullanıcı Adı','Username')}</label>
        <input id="auth-u" class="auth-inp" type="text" minlength="3" maxlength="18" placeholder="${tr('Örn: KaraSovalye','e.g. DarkKnight')}" required>
        <label class="auth-lbl">${tr('Şifre','Password')}</label>
        <input id="auth-p" class="auth-inp" type="password" minlength="4" maxlength="32" placeholder="••••••" required>
        <div id="auth-err" class="auth-err"></div>
        <button type="submit" id="auth-sub-btn" class="btn alt auth-submit">${isReg?tr('Hesap Oluştur','Create Account'):tr('Giriş Yap','Sign In')}</button>
      </form>
      <div class="auth-div"><span>${tr('veya','or')}</span></div>
      <div class="row auth-foot">
        ${isUpgrade
          ?`<button type="button" id="auth-cancel" class="btn sm">${tr('Vazgeç','Cancel')}</button>`
          :`<button type="button" id="auth-guest" class="btn sm auth-guest-btn">${tr('Misafir Olarak Katıl','Continue as Guest')}</button>`}
      </div>
    </div>`;
    mb.querySelectorAll('.auth-tab').forEach(b=>b.onclick=()=>{snd('click');tab=b.dataset.at;render()});
    const guestBtn=$('#auth-guest');
    if(guestBtn)guestBtn.onclick=()=>{
      snd('click');
      if(!USER_ACC)createGuestAccount();
      mb.classList.remove('auth-mode');
      $('#m').hidden=true;lock=false;
      renderAuthBar();
    };
    const cancelBtn=$('#auth-cancel');
    if(cancelBtn)cancelBtn.onclick=()=>{
      snd('click');
      mb.classList.remove('auth-mode');
      $('#m').hidden=true;lock=false;
    };
    const form=$('#auth-form');
    if(form)form.onsubmit=async e=>{
      e.preventDefault();
      const errEl=$('#auth-err'),btn=$('#auth-sub-btn');
      const rawU=($('#auth-u').value||'').trim();
      const rawP=$('#auth-p').value||'';
      const key=normUserKey(rawU);
      if(key.length<3){errEl.textContent=tr('Kullanıcı adı en az 3 karakter olmalı.','Username must be at least 3 characters.');return}
      if(rawP.length<4){errEl.textContent=tr('Şifre en az 4 karakter olmalı.','Password must be at least 4 characters.');return}
      const pHash=hashPass(rawP);
      errEl.textContent='';
      if(btn){btn.disabled=true;btn.textContent=tr('Kontrol ediliyor…','Checking…')}
      try{
        let cloudDoc=null;
        if(fbDb){
          try{
            const snap=await fbDb.collection('users').doc(key).get();
            if(snap.exists)cloudDoc=snap.data();
          }catch(fe){}
        }
        const localMap=loadLocalUsers();
        const existing=cloudDoc||localMap[key]||null;
        if(isReg){
          if(existing){
            errEl.textContent=tr('Bu kullanıcı adı zaten alınmış.','This username is already taken.');
            if(btn){btn.disabled=false;btn.textContent=tr('Hesap Oluştur','Create Account')}
            return;
          }
          const base=(isUpgrade&&USER_ACC&&USER_ACC.isGuest)?USER_ACC:null;
          const newAcc={
            uid:'u_'+key+'_'+Date.now().toString(36),
            key,
            username:rawU,
            passHash:pHash,
            isGuest:false,
            elo:base?Math.round(base.elo||1200):1200,
            peakElo:base?Math.round(base.peakElo||base.elo||1200):1200,
            wins:base?(base.wins||0):0,
            losses:base?(base.losses||0):0,
            matches:base?(base.matches||0):0,
            history:base?(base.history||[]):[],
            createdAt:Date.now()
          };
          saveSession(newAcc);
          snd('ok');
          mb.classList.remove('auth-mode');
          $('#m').hidden=true;lock=false;
        }else{
          if(!existing){
            errEl.textContent=tr('Kullanıcı bulunamadı. Kayıt Ol sekmesinden hesap oluşturabilirsin.','Account not found. Switch to Register to create one.');
            if(btn){btn.disabled=false;btn.textContent=tr('Giriş Yap','Sign In')}
            return;
          }
          if(existing.passHash&&existing.passHash!==pHash){
            errEl.textContent=tr('Şifre hatalı.','Incorrect password.');
            if(btn){btn.disabled=false;btn.textContent=tr('Giriş Yap','Sign In')}
            return;
          }
          const logged={
            uid:existing.uid||('u_'+key),
            key,
            username:existing.username||rawU,
            passHash:existing.passHash||pHash,
            isGuest:false,
            elo:typeof existing.elo==='number'?existing.elo:1200,
            peakElo:typeof existing.peakElo==='number'?existing.peakElo:(existing.elo||1200),
            wins:existing.wins||0,
            losses:existing.losses||0,
            matches:existing.matches||0,
            history:Array.isArray(existing.history)?existing.history:[]
          };
          saveSession(logged);
          snd('ok');
          mb.classList.remove('auth-mode');
          $('#m').hidden=true;lock=false;
        }
      }catch(ex){
        errEl.textContent=tr('Bir hata oluştu, tekrar dene.','An error occurred, please try again.');
        if(btn){btn.disabled=false;btn.textContent=isReg?tr('Hesap Oluştur','Create Account'):tr('Giriş Yap','Sign In')}
      }
    };
  };
  $('#m').hidden=false;
  render();
}
(function initAuthAndElo(){
  USER_ACC=loadSession();
  renderAuthBar();
  // Oyun ilk açıldığında oturum yoksa açılış perdesi biterken Üyelik / Misafir modalını aç
  if(!USER_ACC){
    const hasSplash=!!document.getElementById('splash');
    setTimeout(()=>{
      const menu=$('#menu');
      if(!USER_ACC&&menu&&!menu.hidden&&!lock){
        openAuthModal('login',false);
      }
    },hasSplash?1850:220);
  }
})();
