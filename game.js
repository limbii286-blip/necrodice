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
const THIEF_SVG_TR='img/j/25.png?v=20261126_orig1';
const THIEF_SVG_EN='img/j/25_en.png?v=20261126_orig1';
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
  const cs=['tavern_bg.m4a','./tavern_bg.m4a','tavern_bg.mp3','./tavern_bg.mp3',typeof GOTHIC_MUSIC_DATA!='undefined'?GOTHIC_MUSIC_DATA:'','audio/'+fn,fn,'/audio/'+fn].filter(Boolean);

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
      ?['img/j_en/'+id+'.png?v=20261126_orig1',IMG.j_en&&IMG.j_en[id]?IMG.j_en[id]:'img/j/'+id+'.png?v=20261126_orig1']
      :['img/j/'+id+'.png?v=20261126_orig1','img/j/'+id+'.webp','j'+id+'.webp',id+'.webp','img/j'+id+'.webp','img/j/'+pd+'.webp','/img/j/'+id+'.webp','img/j/'+id+'.jpg','img/j/'+id+'.avif','img/j/j'+id+'.webp','jokers/'+id+'.webp'];
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
  if(G){
    [0,1].forEach(p=>{
      const u=avSrc(avKey(G,p));
      if(u){const im=new Image();im.decoding='async';im.src=u;if(im.decode)im.decode().catch(()=>{});}
    });
  }
  if(hiPre)return;
  hiPre=true;
  ['end_win_crest.png?v=20261123_wide2','end_lose_crest.png?v=20261123_wide2'].forEach(u=>{
    const im=new Image();im.decoding='async';im.onload=()=>{try{im.decode&&im.decode().catch(()=>{})}catch(e){}};im.src=u;
  });
  const baseDelay=entering?900:180;
  for(let n=1;n<=11;n++)setTimeout(()=>{try{numHD(n)(()=>{})}catch(e){}},baseDelay+(n-1)*45);
  setTimeout(()=>{try{backHD(()=>{})}catch(e){}},baseDelay+520);
  range(24).forEach((id,n)=>setTimeout(()=>hiLoad(id),baseDelay+560+n*75));
} // tüm HD sayı/joker kartları ve oyun sonu armaları arka planda asenkron çözülür
function hi(el,id){if(!el)return;if(id===25){if(IMG.j&&IMG.j[25]&&el.src!==IMG.j[25])el.src=IMG.j[25];return}const fb=IMG.j[id];el.onerror=()=>{el.onerror=null;if(fb)el.src=fb}; // HD açılmazsa gömülü görsele dön
  hiLoad(id,u=>{if(el.isConnected&&el.src!==u)el.src=u})}
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
    const d0=+tb.dataset.d0,d1=+tb.dataset.d1,win=+tb.dataset.win,first=+tb.dataset.first,isBot=tb.dataset.bot==='1';
    const btn=tb.querySelector('#tie-rl'),turnLbl=tb.querySelector('#tie-turn'),mo=document.querySelector('#mo');
    const cv=tb.querySelector('#tie-d20cv'),stage=tb.querySelector('.tie-d20-stage');
    if(mo)mo.style.visibility='hidden';
    const s0=tb.querySelector('#tie-s0'),s1=tb.querySelector('#tie-s1');
    const c0=tb.querySelector('.tie-side.me'),c1=tb.querySelector('.tie-side.opp');
    let curSide=first,doneCount=0,rollingSide=false;

    const initAng=(typeof getD20FaceAngles==='function')?getD20FaceAngles(20):{rx:Math.atan(1/Math.sqrt(2)),ry:Math.PI/4,rz:0};
    let rx=initAng.rx,ry=initAng.ry,rz=initAng.rz;
    const renderTieD20=(num,rolling,isCrit,isFail,scale,textPop)=>{
      if(cv&&typeof draw3DD20==='function'){
        draw3DD20(cv,rx,ry,rz,num,rolling,isCrit,isFail,scale,textPop);
      }
    };
    renderTieD20('?',false,false,false,1.0,1.0);

    const updateUi=()=>{
      if(!tb.isConnected)return;
      if(c0)c0.classList.toggle('turn-now',doneCount<2&&curSide===0);
      if(c1)c1.classList.toggle('turn-now',doneCount<2&&curSide===1);
      if(stage)stage.style.cursor=(doneCount<2&&curSide===0&&!rollingSide&&MODE!=='spectator')?'pointer':'default';
      if(doneCount>=2){
        if(btn){btn.disabled=true;btn.classList.add('used')}
        if(turnLbl)turnLbl.textContent=win===0?tr('Beraberlik Zarı Kazanıldı!','Tiebreaker Won!'):tr('Beraberlik Zarı Kaybedildi!','Tiebreaker Lost!');
        return;
      }
      if(MODE==='spectator'){
        if(btn){btn.disabled=true;btn.classList.add('used')}
        const sp0=(G&&G.specMeta&&G.specMeta.p0Name)||(G&&NAMES[avKey(G,0)])||tr('Oyuncu','Player');
        const sp1=(G&&G.specMeta&&G.specMeta.p1Name)||(G&&NAMES[avKey(G,1)])||tr('Rakip','Opponent');
        if(turnLbl)turnLbl.textContent=curSide===0?tr(`${sp0} D20 atıyor…`,`${sp0} is rolling D20…`):tr(`${sp1} D20 atıyor…`,`${sp1} is rolling D20…`);
      }else if(curSide===0){
        if(btn){btn.disabled=false;btn.classList.remove('used');btn.textContent=tr('D20 At','Roll D20')}
        if(turnLbl)turnLbl.textContent=tr('Sıra sende! D20 zarını at.','Your turn! Roll the D20.');
      }else{
        if(btn){btn.disabled=true;btn.classList.add('used')}
        if(turnLbl)turnLbl.textContent=isBot?tr('Bot D20 atıyor…','Bot is rolling D20…'):tr('Rakibin D20 atması bekleniyor…','Waiting for opponent to roll D20…');
      }
    };

    const finishTie=()=>{
      if(!tb.isConnected)return;
      if(c0){c0.classList.remove('turn-now');c0.classList.add(win===0?'win':'lose')}
      if(c1){c1.classList.remove('turn-now');c1.classList.add(win===1?'win':'lose')}
      tb.classList.add('fin');
      snd(win===0?'ok':'lose');
      if(mo)mo.style.visibility='';
    };

    const rollSide=(side,fromNet=false)=>{
      if(rollingSide||doneCount>=2||side!==curSide)return;
      rollingSide=true;
      if(!fromNet&&!isBot){
        if(MODE==='guest'&&conn&&conn.open)conn.send({k:'tie_roll'});
        else if(MODE==='host'){
          if(conn&&conn.open)conn.send({k:'tie_roll'});
          spectators.forEach(s=>{try{if(s.open)s.send({k:'tie_roll'})}catch(e){}});
        }
      }else if(isBot&&spectators.length){
        spectators.forEach(s=>{try{if(s.open)s.send({k:'tie_roll'})}catch(e){}});
      }
      if(btn){btn.disabled=true;btn.classList.add('used')}
      if(stage)stage.style.cursor='default';
      tb.classList.add('rolling');
      const sumEl=side===0?s0:s1;
      const targetVal=side===0?d0:d1;
      const tAng=(typeof getD20FaceAngles==='function')?getD20FaceAngles(targetVal):initAng;
      const startRx=rx,startRy=ry,startRz=rz;
      const endRx=tAng.rx+3*Math.PI*2,endRy=tAng.ry+2*Math.PI*2,endRz=tAng.rz+1*Math.PI*2;
      const startTime=performance.now(),duration=1850;
      snd('dice');vib([80,40,80]);

      const frame=now=>{
        if(!tb.isConnected)return;
        const progress=Math.min(1,(now-startTime)/duration);
        if(progress<1){
          const t=1-Math.pow(1-progress,4);
          rx=startRx+(endRx-startRx)*t;
          ry=startRy+(endRy-startRy)*t;
          rz=startRz+(endRz-startRz)*t;
          const lift=1+Math.sin(progress*Math.PI)*0.12*(1-progress*0.35);
          renderTieD20(targetVal,true,false,false,lift,1.0);
          requestAnimationFrame(frame);
        }else{
          tb.classList.remove('rolling');
          rx=tAng.rx;ry=tAng.ry;rz=tAng.rz;
          const popT0=performance.now();
          const settle=tNow=>{
            if(!tb.isConnected)return;
            const p=Math.min(1,(tNow-popT0)/260);
            const sc=1+0.07*Math.sin(p*Math.PI);
            const tp=0.88+0.12*(1-Math.pow(1-p,3));
            renderTieD20(targetVal,false,targetVal===20,targetVal===1,sc,tp);
            if(p<1)requestAnimationFrame(settle);
          };
          requestAnimationFrame(settle);
          if(sumEl){sumEl.textContent=String(targetVal);sumEl.classList.add('shown')}
          snd('ok');
          doneCount++;
          rollingSide=false;
          if(doneCount>=2){
            updateUi();
            setTimeout(finishTie,420);
          }else{
            curSide=1-curSide;
            updateUi();
            if(isBot&&curSide===1){
              setTimeout(()=>rollSide(1,true),780);
            }
          }
        }
      };
      requestAnimationFrame(frame);
    };

    window._triggerTieRoll=()=>{
      if(!tb.isConnected||rollingSide||doneCount>=2)return false;
      rollSide(curSide,true);
      return true;
    };
    if(window._pendingTieRoll&&(Date.now()-window._pendingTieRoll)<10000){
      window._pendingTieRoll=0;
      setTimeout(()=>{if(window._triggerTieRoll)window._triggerTieRoll()},120);
    }
    const triggerMine=e=>{if(e)e.stopPropagation();if(curSide===0&&!rollingSide&&MODE!=='spectator')rollSide(0,false)};
    if(btn)btn.onclick=triggerMine;
    if(stage)stage.onclick=triggerMine;
    updateUi();
    if(isBot&&curSide===1){
      setTimeout(()=>rollSide(1,true),780);
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
  let rolling = false, finished = false, rollStarted = false, triggered = false;
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
    if(!d.isConnected || rolling || finished || rollStarted) return;
    rollStarted = true;
    triggered = true;
    rolling = true;
    d.classList.add('rolling');
    snd('dice');vib([100,50,100]);

    const startTime = performance.now();
    const duration = 2850; // +0.8s uzatılmış gerilimli, doğal ve akıcı yavaşlama

    const totalRevX = 3;
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
            if(typeof spawnD20LandingFx==='function')spawnD20LandingFx(d);
            if(res==='death'||res==='win'){
              setTimeout(()=>{
                const mb=document.querySelector('#mb');
                const tpl=mb&&mb.querySelector('template.end-tpl');
                if(!mb||!tpl||!d.isConnected){flushUnlockToasts();return;}
                const mo=mb.querySelector('#mo'),mx=mb.querySelector('#mx');
                mb.classList.add('end-mode');
                mb.innerHTML=tpl.innerHTML;
                const row=mb.querySelector('.end-acts');
                if(row){
                  if(LAST_DEATH_CARD&&!LAST_DEATH_CARD.isSpec){
                    const sb=document.createElement('button');
                    sb.id='btn-share-card';sb.className='btn alt';
                    sb.textContent=tr('Ölüm Kartını Paylaş','Share Death Card');
                    sb.onclick=()=>{snd('click');shareDeathCard(LAST_DEATH_CARD,sb)};
                    row.appendChild(sb);
                  }
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
                const gSave=mb.querySelector('#end-save-guest');
                if(gSave){gSave.onclick=()=>{snd('click');mb.classList.remove('end-mode');openAuthModal('register',true)}}
                snd(res==='win'?'win':'lose');
                flushUnlockToasts();
              },1450);
            }else{
              setTimeout(()=>flushUnlockToasts(),450);
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

  window._triggerD20Roll=()=>{
    if(!d.isConnected||triggered||rolling||finished||rollStarted)return false;
    triggered=true;
    const b=document.querySelector('#rl');
    if(b){b.disabled=true;b.classList.add('used')}
    snd('heart');
    setTimeout(runRoll,200);
    return true;
  };
  const rl=document.querySelector('#rl');
  const stageEl=d.querySelector('.d20-stage');
  const isOnline=(MODE==='host'||MODE==='guest'||MODE==='spectator');
  if(rl&&isMe&&MODE!=='spectator') {
    const startMyD20=()=>{
      if(triggered||rolling||finished||rollStarted||rl.disabled)return;
      triggered=true;
      rl.disabled=true;
      rl.classList.add('used');
      const sendD20=()=>{
        if(MODE==='guest'&&conn&&conn.open)try{conn.send({k:'d20_roll'})}catch(e){}
        else if(MODE==='host'||MODE==='bot'){
          if(MODE==='host'&&conn&&conn.open)try{conn.send({k:'d20_roll'})}catch(e){}
          spectators.forEach(s=>{try{if(s.open)s.send({k:'d20_roll'})}catch(e){}});
        }
      };
      sendD20();
      setTimeout(sendD20,320);
      snd('heart');
      setTimeout(runRoll,200);
    };
    rl.onclick=startMyD20;
    if(stageEl){stageEl.style.cursor='pointer';stageEl.onclick=startMyD20}
  } else {
    if(rl){rl.disabled=true;rl.classList.add('used')}
    if(!isOnline){
      if(MODE==='bot'&&spectators.length){
        spectators.forEach(s=>{try{if(s.open)s.send({k:'d20_roll'})}catch(e){}});
      }
      triggered=true;
      snd('heart');
      setTimeout(runRoll, 1000);
    }else if(window._pendingD20Roll&&(Date.now()-window._pendingD20Roll)<10000){
      window._pendingD20Roll=0;
      window._triggerD20Roll();
    }else{
      // Güvenlik ağı: rakibin zar sinyali ağda kaybolursa veya gecikirse 4.5sn sonra zarı otomatik döndür
      setTimeout(()=>{
        if(d.isConnected&&!triggered&&!rolling&&!finished&&!rollStarted){
          triggered=true;
          snd('heart');
          runRoll();
        }
      },4500);
    }
  }
}

/* ---------- MOTOR ---------- */
const DUEL_CLOCK_INIT=33; // Her sırası gelen oyuncunun 33 saniyesi vardır
const ONLINE_CLOCK_INIT=33;
const initClockSec=()=>((MODE==='host'||MODE==='guest'||MODE==='spectator')?ONLINE_CLOCK_INIT:DUEL_CLOCK_INIT);
const GRACE_INIT=5;       // İlk düello ve geçişlerde jokerlere bakmak için 5 saniye hazırlık süresi
let CURSED_RULE=null,VAULT_RUN=null,PUZZLE_ACTIVE=null,LAST_DEATH_CARD=null;
let KING_TABLE=false,KING_QUEUE=[],KING_STREAK=0;
let SPEC_VOTES=[0,0],MY_SPEC_VOTE=-1;
function newBO3(S){
  const cs=initClockSec();
  if(!S.stats)S.stats={rounds:[0,0,0],draws:[0,0],jokers:[0,0],d20Surv:[0,0],startAt:Date.now()};
  S.dj=[];S.jdeck=shuf(range(24));
  const baseHand=(CURSED_RULE&&CURSED_RULE.id==='three_jokers')?5:4;
  const vaultExtraJ=(VAULT_RUN&&VAULT_RUN.relics&&VAULT_RUN.relics.includes('extra_joker'))?1:0;
  S.maxJokers=(CURSED_RULE&&CURSED_RULE.id==='three_jokers')?3:((VAULT_RUN&&VAULT_RUN.relics&&VAULT_RUN.relics.includes('triple_play'))?3:2);
  S.hand=[0,1].map(p=>{
    const cnt=baseHand+(p===0?vaultExtraJ:0);
    return avKey(S,p)==='s'?[...S.jdeck.splice(0,Math.max(1,cnt-1)),25]:S.jdeck.splice(0,cnt);
  });
  S.pts=[0,0];S.rounds=0;S.res=[];S.log=[];
  S.hpUsed=[false,false];S.d20Bonus=[0,0];
  S.clocks=[cs,cs];
  S.clockMax=cs;
  S.graceLeft=GRACE_INIT;
}
function deal(S){
  S.deck=shuf(range(11).map(n=>({id:++S.u,n})));
  if(CURSED_RULE&&CURSED_RULE.id==='two_closed'){
    S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop(),S.deck.pop()]}));
  }else{
    S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop()]}));
  }
  S.baseTg=(CURSED_RULE&&CURSED_RULE.id==='rand_tg')?[17,21,24][Math.random()*3|0]:21;
  if(CURSED_RULE&&CURSED_RULE.id==='blood_dice'&&S.jdeck&&S.jdeck.length){
    [0,1].forEach(p=>{if(S.jdeck.length&&S.hand[p].length<6)S.hand[p].push(S.jdeck.pop())});
  }
  if(VAULT_RUN&&VAULT_RUN.relics&&VAULT_RUN.relics.includes('high_closed_joker')&&S.pl[0].closed.some(c=>c.n>=10)&&S.jdeck&&S.jdeck.length&&S.hand[0].length<6){
    S.hand[0].push(S.jdeck.pop());
  }
  S.eff=[];S.pj=[];S.jUsed=[0,0];S.jTurn=[0,0];S.noJ=[false,false];S.acted=false;S.turns=0;
  S.hpMod=[0,0];S.plagueMod=[0,0];S.hpTgMod=0;S.oppPeek=[];S.oppPeek1=[];S.botPeekVal=null;S.botScry=null;S.vampBurn=null;S.thiefSteal=null;
  if(VAULT_RUN&&VAULT_RUN.relics&&VAULT_RUN.relics.includes('blood_peek')&&S.pl[1].closed.length){
    S.oppPeek.push(S.pl[1].closed[0].id);
  }
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
    if(cl){if(clZero(S))return 0;if(clDbl(S))v*=2}return v};
  let t=0;S.pl[p].open.forEach(c=>t+=f(c,0));if(wc)S.pl[p].closed.forEach(c=>t+=f(c,1));
  S.eff.forEach(e=>{if(e.neg||e.o!=p)return;if(e.id==3)t+=5;if(e.id==4)t-=5;if(e.id==22)t+=e.s*S.deck.length});
  if(S.hpMod&&S.hpMod[p])t+=S.hpMod[p];
  return t;
}
const TGS=new Set([8,9,10,11,19]),tgE=S=>S.eff.filter(e=>!e.neg&&TGS.has(e.id)).pop(),lowW=S=>{const e=tgE(S);return !!e&&e.id==19}; // hedef değiştirenlerden SON oynanan geçerli
const CLS=new Set([20,21]),clE=S=>S.eff.filter(e=>!e.neg&&CLS.has(e.id)).pop(),clZero=S=>{const e=clE(S);return !!e&&e.id==20},clDbl=S=>{const e=clE(S);return !!e&&e.id==21}; // kapalı kart kuralında da SON oynanan geçerli
function tg(S){const e=tgE(S);const base=e&&e.id<19?{8:27,9:24,10:17,11:15}[e.id]:(S.baseTg||21);return base+(S.hpTgMod||0)}
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
const playable=(S,p,id)=>S.jUsed[p]<(S.maxJokers||2)&&!S.noJ[p]&&S.hand[p].includes(id)&&(NEED[id]||[]).every(k=>opts(S,p,k).length)&&(id!=5||S.deck.length>0);
function play(S,p,id,pk){
  const q=1-p;
  const find=cid=>{for(const x of S.pl)for(const z of ['open','closed']){const i=x[z].findIndex(c=>c.id==cid);if(i>=0)return[x[z],i]}};
  const take=cid=>{const[a,i]=find(cid);return a.splice(i,1)[0]};
  S.hand[p].splice(S.hand[p].indexOf(id),1);S.used=(S.used||[]).concat(id);(S.dj=S.dj||[]).push(id);
  S.jUsed[p]++;S.jTurn=S.jTurn||[0,0];S.jTurn[p]++;
  if(S.stats&&S.stats.jokers)S.stats.jokers[p]++;
  if(id==25){
    const pjIdx=(S.pj||[]).findIndex(e=>e.uid==pk[0]);
    if(pjIdx>=0){
      const stolen=S.pj.splice(pjIdx,1)[0];
      S.eff=(S.eff||[]).filter(e=>e.uid!=pk[0]);
      S.hand[p].push(stolen.id);
      S.thiefSteal={thief:p,uid:pk[0],jid:stolen.id,seq:(S.thiefSteal?S.thiefSteal.seq:0)+1};
    }
    return;
  }
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
  hard:{rand:0,noise:0,jc:.15,jl:.06,jp:1,dm:.015,depth:2,beta:.55,gap:6,mc:1,K:1200,ms:2000,top:7,rjp:.85,bo3:1,pf:1,hero:1},
  imp:{rand:0,noise:0,jc:.09,jl:.03,jp:1,dm:.01,depth:2,beta:.85,gap:6,mc:1,K:1600,ms:1900,top:12,rjp:.95,bo3:1,pf:1,learn:1,hero:1,deepRoll:1} // imkansız: derin tarama, tam kombo ve kahraman ustalığı
};
let DIFF='med';
const unk=(S,p)=>{const seen=new Set([...S.pl[p].open,...S.pl[p].closed,...S.pl[1-p].open,...(S.dead||[])].map(c=>c.n));if(p===1&&S.botPeekVal!=null)seen.add(S.botPeekVal);return range(11).filter(n=>!seen.has(n))};
let CUR=PR.med;
function outcHero(S,p){
  let r=outc(S,p);
  if(r!==0){
    const loser=r>0?1-p:p;
    if(avKey(S,loser)==='e')r*=0.90; // Buz Devi %20 hasar savuşturup berabereye çevirebilir
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
function isRedundantJoker(S,p,id){
  const q=1-p;
  if((id===1||id===2)&&act(S,id))return true;
  if(id===22&&S.deck.length===0)return true;
  if(id===23&&(S.deck.length===0||S.eff.some(e=>e.id===23&&!e.neg&&e.o===p)))return true;
  if(id===24&&(S.hand[q].length===0||S.noJ[q]||S.jUsed[q]>=(S.maxJokers||2)))return true;
  const activeTg=tgE(S),activeCl=clE(S);
  if(TGS.has(id)&&activeTg&&activeTg.id===id)return true;
  if(CLS.has(id)&&activeCl&&activeCl.id===id)return true;
  return false;
}
function findCardInState(S,cid){
  for(let side=0;side<2;side++){
    for(const z of ['open','closed']){
      const c=S.pl[side][z].find(x=>x.id===cid);
      if(c)return{c,side,closed:z==='closed'};
    }
  }
  return null;
}
function decide(S,p,prm){ // en iyi hamleyi seç; null = pas
  CUR=prm;const d=prm.depth||0,nz=()=>prm.noise?(Math.random()+Math.random()-1)*prm.noise:0;
  if(Math.random()<prm.rand)return canDraw(S,p)&&Math.random()<.5?{t:'d'}:null;
  const low=lowW(S),Tg=tg(S),myT=total(S,p,true);
  const pool=unk(S,p);let best=null,bs=evalS(clone(S),p)+prm.dm;
  if(!low&&myT<Tg&&canDraw(S,p)&&pool.length){
    let v=0;pool.forEach(x=>{const T=clone(S);T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d)});
    v=v/pool.length+nz();if(v>bs){bs=v;best={t:'d'}}
  }
  const activeTg=tgE(S),activeCl=clE(S),oppOpen=total(S,1-p,false);
  if(!S.noJ[p])new Set(S.hand[p]).forEach(id=>{
    if(id==16||!playable(S,p,id)||isRedundantJoker(S,p,id)||Math.random()>prm.jp)return;
    combos((NEED[id]||[]).map(k=>opts(S,p,k))).forEach(pk=>{
      if(id==15&&pk[0]==pk[1])return;
      if(id==6||id==7){const fc=findCardInState(S,pk[0]);if(fc&&fc.c.o===(id==6?0:12))return}
      if(id==12){
        const ef=S.eff.find(e=>e.uid==pk[0]);
        if(!ef||(ef.o===p&&!TGS.has(ef.id)))return;
        if(TGS.has(ef.id)&&activeTg&&ef.uid!==activeTg.uid)return;
        if(CLS.has(ef.id)&&activeCl&&ef.uid!==activeCl.uid)return;
      }
      if(id==25){
        const st=(S.pj||[]).find(e=>e.uid==pk[0]);
        if(!st||st.o===p)return;
      }
      if((id==5||id==14)&&!low&&oppOpen>Tg)return;
      if(id==5&&pool.length){
        let sv=0;
        pool.forEach(x=>{const T=clone(S);T.deck=[{id:++T.u,n:x}];play(T,p,5,[]);sv+=look(T,p,d)});
        const v=sv/pool.length-(S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc)+nz();
        if(v>bs){bs=v;best={t:'j',id,pk}};
        return;
      }
      const T=clone(S);T.deck=shuf(pool.map(n=>({id:++T.u,n}))).slice(0,S.deck.length);play(T,p,id,pk);
      const v=look(T,p,d)-(S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc)+nz();if(v>bs){bs=v;best={t:'j',id,pk}}
    });
  });
  return best;
}
/* ---------- ZOR & İMKANSIZ BOT: belirsizlik altında Monte-Carlo (determinizasyon) ----------
   Bilinmeyenleri (rakibin kapalı kartı, deste sırası, rakibin jokerleri) ağırlıklı doldurup
   her aday hamleyi (pas / çek / joker) rakibin karşı hamleleriyle birlikte turun sonuna kadar oynatır. */
const ROLL={rand:0,noise:0,jc:.22,jl:.12,jp:1,dm:.02,depth:0,beta:0,gap:6,hero:1};
function listC(S,p,prm){
  CUR=prm;const d=prm.depth||0,out=[],pool=unk(S,p),low=lowW(S),Tg=tg(S),myT=total(S,p,true);
  const baseStandEv=evalS(clone(S),p);
  out.push({a:null,v:baseStandEv+prm.dm});
  if(!low&&myT<Tg&&canDraw(S,p)&&pool.length){let v=0;pool.forEach(x=>{const T=clone(S);T.log=[];T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d)});out.push({a:{t:'d'},v:v/pool.length})}
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5));
  const cost=matchPoint&&prm.deepRoll?0.02:(S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc);
  const HI_THIEF=new Set([6,7,8,9,10,11,12,14,16,17,18,19,20,21,23,24]);
  const oppOpen=total(S,1-p,false);
  const q=1-p,activeTg=tgE(S),activeCl=clE(S);
  if(!S.noJ[p])new Set(S.hand[p]).forEach(id=>{
    if(!playable(S,p,id)||isRedundantJoker(S,p,id))return;
    if(id==16){
      const myCl=S.pl[p].closed.find(c=>!c.hpImmune),opCl=S.pl[q].closed.find(c=>!c.hpImmune);
      if(!myCl||!opCl)return;
      const peekV=(p===1&&S.botPeekVal!=null)?S.botPeekVal:(opCl.o!=null?opCl.o:null);
      const cands=peekV!=null?[peekV]:pool;
      if(!cands.length)return;
      const ws=peekV!=null?[1]:oppCardWeights(S,p,prm,cands);
      const wSum=ws.reduce((a,b)=>a+b,0)||1;
      let ev16=0;
      cands.forEach((oppN, idx)=>{
        const T=clone(S);T.log=[];
        const i0=T.pl[0].closed.findIndex(c=>!c.hpImmune),i1=T.pl[1].closed.findIndex(c=>!c.hpImmune);
        if(i0>=0&&i1>=0){
          const qIdx=q===0?i0:i1,pIdx=p===0?i0:i1;
          if(T.pl[q].closed[qIdx].o==null)T.pl[q].closed[qIdx].n=oppN;
          const myOldVal=T.pl[p].closed[pIdx].o??T.pl[p].closed[pIdx].n;
          play(T,p,16,[]);
          if(p===1)T.botPeekVal=myOldVal;
          ev16+=(ws[idx]/wSum)*look(T,p,Math.min(1,d));
        }
      });
      out.push({a:{t:'j',id,pk:[]},v:ev16-cost});
      return;
    }
    combos((NEED[id]||[]).map(k=>opts(S,p,k))).forEach(pk=>{
      if(id==15&&pk[0]==pk[1])return;
      if(id==6||id==7){
        const fc=findCardInState(S,pk[0]);
        if(fc&&fc.c.o===(id==6?0:12))return;
      }
      if(id==12){
        const ef=S.eff.find(e=>e.uid==pk[0]);
        if(!ef||(ef.o===p&&!TGS.has(ef.id)))return;
        if(TGS.has(ef.id)&&activeTg&&ef.uid!==activeTg.uid)return;
        if(CLS.has(ef.id)&&activeCl&&ef.uid!==activeCl.uid)return;
      }
      if((id==5||id==14)&&!low&&oppOpen>Tg)return;
      if(id==25){
        const st=(S.pj||[]).find(e=>e.uid===pk[0]);
        if(!st)return;
        // Kendi aktif jokerini çalıp iptal etmek yasak (ancak tur kuralı aleyhimize döndüyse ve kaldırmak +0.20 kazandırıyorsa hariç)
        if(st.o===p){
          if(!TGS.has(st.id)&&!CLS.has(st.id))return;
          const Ttest=clone(S);Ttest.log=[];play(Ttest,p,25,pk);
          if(evalS(Ttest,p)<baseStandEv+0.22)return;
        }
      }
      if(id==5&&pool.length){
        let sv=0;
        pool.forEach(x=>{const T=clone(S);T.log=[];T.deck=[{id:++T.u,n:x}];play(T,p,5,[]);sv+=look(T,p,Math.min(1,d))});
        out.push({a:{t:'j',id,pk},v:sv/pool.length-cost});
        return;
      }
      const T=clone(S);T.log=[];T.deck=pool.slice(0,S.deck.length).map(n=>({id:++T.u,n}));
      let bonus=0;
      if(id===25&&prm.hero){
        const st=(S.pj||[]).find(e=>e.uid===pk[0]);
        if(st&&st.o!==p&&HI_THIEF.has(st.id))bonus=0.09;
      }
      play(T,p,id,pk);
      let val=look(T,p,d);
      // Hırsız (25) ile çalınan jokeri aynı tur içinde hemen kullanabilme kombosu
      if(id===25&&prm.hero&&T.hand[p].length&&T.jUsed[p]<(T.maxJokers||2)){
        const stolenId=T.hand[p][T.hand[p].length-1];
        if(playable(T,p,stolenId)&&!isRedundantJoker(T,p,stolenId)&&stolenId!==16){
          const subPks=combos((NEED[stolenId]||[]).map(k=>opts(T,p,k))).slice(0,6);
          subPks.forEach(spk=>{
            if(stolenId===15&&spk[0]===spk[1])return;
            const U=clone(T);U.log=[];play(U,p,stolenId,spk);
            const sv=look(U,p,0)-cost*0.5;
            if(sv>val)val=sv;
          });
        }
      }
      // 2-Hamlelik Kombo Lookahead (İmkansız Bot): Joker oynadıktan hemen sonra 1 kart çekme zincirinin EV'sini ölç
      if(prm.deepRoll&&canDraw(T,p)&&!lowW(T)&&total(T,p,true)<tg(T)){
        const pool2=unk(T,p);
        if(pool2.length){
          let dSum=0;
          for(let ci=0;ci<pool2.length;ci++){
            const U=clone(T);U.pl[p].open.push({id:++U.u,n:pool2[ci]});
            dSum+=look(U,p,0);
          }
          const comboVal=dSum/pool2.length;
          if(comboVal>val)val=val*0.3+comboVal*0.7;
        }
      }
      out.push({a:{t:'j',id,pk},v:val+bonus-(id===25?cost*0.55:cost)})});
  });
  return out;
}
function oppCardWeights(S,p,prm,pool){
  const q=1-p,Tg=tg(S),low=lowW(S),base=total(S,q,false);
  const stood=!!(S.pa&&S.pa[q]>0);
  const Lr=!!(prm&&prm.learn&&PROF.n>=6);
  const liveArr=(prm&&prm.deepRoll&&p===1&&S._liveStand&&S._liveStand.length)?S._liveStand:null;
  const liveMean=liveArr?(liveArr.reduce((a,b)=>a+b,0)/liveArr.length):null;
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
      // Canlı oyun içi adaptasyon: Bu maçta oyuncunun ortalama pas eşiğine yakın kapalı kartları ağırlıklandır
      if(!low&&liveMean!=null){
        const diff=Math.abs((Tg-t)-liveMean);
        const liveBoost=t>Tg?0.55:(diff<=1.5?1.55:diff<=3.5?1.18:0.85);
        wt*=liveBoost;
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
  if(avKey(T,p)==='c'&&T.cWins){const cw=(T.cWins[p]||0)+(r>0?1:0);if(cw>=3)cBonus+=0.07}
  if(avKey(T,q)==='c'&&T.cWins){const cw=(T.cWins[q]||0)+(r<0?1:0);if(cw>=3)cBonus-=0.07}
  if(r>0&&avKey(T,q)==='v'&&T.hand[p].length>0)cBonus-=0.06; // Vampir'e karşı tur kazanınca 1 joker yanar
  if(r<0&&avKey(T,p)==='v'&&T.hand[q].length>0)cBonus+=0.06; // Vampir kaybedince rakibin 1 jokeri yanar
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
const HI_TIER_J=new Set([8,9,10,11,12,16,19,20,23,24,25]);
function exactEndgameEvalBot(S,p,action,prm){
  // YALNIZCA rakip az önce pas geçtiyse VE biz de Pas (action===null) geçiyorsak tur anında biter!
  // Kart çekmek veya joker oynamak sırayı tekrar rakibe vereceği için kesinlikle tam Monte-Carlo rollout ile çözülmelidir.
  if(!S||!prm||!prm.deepRoll||action!==null)return null;
  const q=1-p,oppPassed=S.turns>0&&!S.acted;
  if(!oppPassed)return null;
  const pool=unk(S,p);
  const cl=S.pl[q]&&S.pl[q].closed&&S.pl[q].closed[0];
  const peekVal=(p===1&&S.botPeekVal!=null)?S.botPeekVal:(cl&&cl.o!=null?cl.o:null);
  const scoreState=T=>{const r=prm.hero?outcHero(T,p):outc(T,p);return prm.bo3?bo3v(T,p,r):r};
  if(!cl)return scoreState(clone(S));
  if(peekVal!=null){
    const T=clone(S);T.log=[];
    if(T.pl[q].closed[0]&&T.pl[q].closed[0].o==null)T.pl[q].closed[0].n=peekVal;
    return scoreState(T);
  }
  if(!pool.length)return scoreState(clone(S));
  const ws=oppCardWeights(S,p,prm,pool);
  const sm=ws.reduce((a,b)=>a+b,0)||1;
  let ev=0;
  for(let i=0;i<pool.length;i++){
    const T=clone(S);T.log=[];
    if(T.pl[q].closed[0]&&T.pl[q].closed[0].o==null)T.pl[q].closed[0].n=pool[i];
    ev+=(ws[i]/sm)*scoreState(T);
  }
  return ev;
}
function isGuaranteedPassWin(S,p){
  const q=1-p;
  if(!(S.turns>0&&!S.acted))return false; // rakip az önce pas geçmediyse garantili değil
  const cl=S.pl[q]&&S.pl[q].closed&&S.pl[q].closed[0];
  if(!cl||cl.o!=null||(p===1&&S.botPeekVal!=null)){
    const T=clone(S);
    if(cl&&cl.o==null&&p===1&&S.botPeekVal!=null)T.pl[q].closed[0].n=S.botPeekVal;
    return outc(T,p)>0;
  }
  const pool=unk(S,p);
  if(!pool.length)return outc(S,p)>0;
  for(const n of pool){
    const T=clone(S);T.pl[q].closed[0].n=n;
    if(outc(T,p)<=0)return false;
  }
  return true;
}
function decideHA(S,p,prm,done,budCap){ // zaman dilimli Monte-Carlo + Exact Endgame Solver + Sıkı Joker Disiplini
  const now=()=>(typeof performance!='undefined'?performance:Date).now();
  const low=lowW(S),Tg=tg(S),myT=total(S,p,true);
  // 1) Rakip pas geçtiyse ve Pas geçmek tüm olasılıklara karşı %100 kesin galibiyetse tek kaynak bile harcama
  if(isGuaranteedPassWin(S,p))return done(null);
  // 2) Rakip pas geçtiyse ve rakip açıktan hedefi aşıp patladıysa (ve biz patlamadıysak) hemen pas geç
  if(S.pa&&S.pa[1-p]>0&&!low&&myT<=Tg&&total(S,1-p,false)>Tg)return done(null);
  let all=listC(S,p,prm).sort((x,y)=>y.v-x.v);
  if(low||myT>=Tg)all=all.filter(c=>!(c.a&&c.a.t=='d')); // hedefte/üstündeyken veya "En az kazanır" etkisinde kart çekmek yalnızca batırır
  // Sıfır patlama riski varken (en büyük olası kartı çeksek bile hedefi aşmıyorsak) ve rakip açıktan patlamadıysa,
  // 5/21 - 10/21 gibi çok düşük toplamla boş yere pas geçip rakibe bedava tur verme
  const oppOpenNow=total(S,1-p,false),poolNow=unk(S,p),maxPool=poolNow.length?Math.max(...poolNow):11;
  const maxGain=act(S,1)?maxPool*2:maxPool;
  if(!low&&canDraw(S,p)&&poolNow.length&&oppOpenNow<=Tg&&myT+maxGain<=Tg&&all.some(c=>c.a&&c.a.t==='d')){
    all=all.filter(c=>c.a!==null);
  }
  const pass=all.find(c=>!c.a),draw=all.find(c=>c.a&&c.a.t=='d');
  // Her joker ID'sinden en yüksek puanlı en fazla 2 hedef kombinasyonunu al (çok hedefli tek joker tüm aday listesini doldurmasın)
  const top=[],perJ={};
  for(const c of all){
    if(top.length>=(prm.top||8))break;
    if(c.a&&c.a.t==='j'){
      const cntJ=perJ[c.a.id]||0;
      if(cntJ>=2)continue;
      perJ[c.a.id]=cntJ+1;
    }
    top.push(c);
  }
  [pass,draw].forEach(c=>{if(c&&!top.includes(c))top.push(c)});
  const TACTICAL=new Set([12,16,19,23,24,25]);
  TACTICAL.forEach(tid=>{const bestT=all.find(c=>c.a&&c.a.id===tid&&!top.includes(c));if(bestT)top.push(bestT)});
  if(top.length==1)return done(top[0].a);
  const matchPoint=S.rounds>=2||(S.pts&&(S.pts[0]>=1.5||S.pts[1]>=1.5));
  // Gerçekçi joker koruma maliyeti: 1. ve 2. turlarda gereksiz joker yakmayı engeller; düello sonu turlarında agresifleşir
  const rawCost=matchPoint?(prm.deepRoll?0.03:(prm.jl!=null?prm.jl:0.04)):(prm.deepRoll?0.10:prm.jc);
  const cost=prm.bo3?(matchPoint?rawCost*0.75:rawCost*0.95):rawCost;
  const exactVals=top.map(c=>exactEndgameEvalBot(S,p,c.a,prm));
  const sum=top.map(()=>0),cnt=top.map(()=>0),alive=top.map(()=>true);
  const RP={...ROLL,...(prm.rjp!=null?{jp:prm.rjp}:{}),...(prm.deepRoll?{depth:1,jc:0.085,jl:0.03,jp:1,beta:0.72}:{}),bo3:prm.bo3,hm:prm.learn&&LRN.ht>=15};
  const clkMs=S.clocks&&S.clocks[p]!=null?Math.max(1000,Math.round(S.clocks[p]*220)):99999;
  const K=top.some((_,i)=>exactVals[i]===null)?(prm.K||40):0,bud=Math.min(prm.ms||0,clkMs,budCap||99999),t0=now();let k=0;
  if(prm.pf&&pass){
    const pi=top.indexOf(pass);
    if(pi>0){
      top.splice(pi,1);top.unshift(pass);
      const ev0=exactVals.splice(pi,1)[0];exactVals.unshift(ev0);
      const al0=alive.splice(pi,1)[0];alive.unshift(al0);
    }
  }
  const meanAt=i=>{
    const mcVal=cnt[i]>0?(sum[i]/cnt[i]):top[i].v;
    return exactVals[i]!==null?(cnt[i]>0?exactVals[i]*0.65+mcVal*0.35:exactVals[i]):mcVal;
  };
  const prune=()=>{
    if(!prm.deepRoll||top.length<=3)return;
    const means=top.map((_,i)=>alive[i]?meanAt(i):-99);
    const bestM=Math.max(...means);
    if(k===40){
      let kept=0;
      for(let i=0;i<top.length;i++)if(alive[i]&&means[i]>=bestM-0.32)kept++;
      if(kept>=2)for(let i=0;i<top.length;i++)if(alive[i]&&top[i].a&&top[i].a.t==='j'&&means[i]<bestM-0.32)alive[i]=false;
    }else if(k===110){
      const ord=top.map((_,i)=>i).filter(i=>alive[i]).sort((a,b)=>means[b]-means[a]);
      if(ord.length>5)ord.slice(5).forEach(i=>{if(top[i].a&&top[i].a.t==='j')alive[i]=false});
    }
  };
  const fin=()=>{
    const rawSc=top.map((c,i)=>alive[i]?(meanAt(i)+(prm.w||0)*c.v):-99);
    let bestFreeIdx=-1,bestFreeVal=-99;
    top.forEach((c,i)=>{
      if(!c.a||c.a.t==='d'){
        if(rawSc[i]>bestFreeVal){bestFreeVal=rawSc[i];bestFreeIdx=i}
      }
    });
    let bi=bestFreeIdx>=0?bestFreeIdx:0,bestVal=bestFreeIdx>=0?bestFreeVal:rawSc[0];
    const safeWinThr=matchPoint?0.86:0.44;
    top.forEach((c,i)=>{
      const v=rawSc[i];
      if(c.a&&c.a.t==='j'){
        // Maç sayısı değilken, jokeri oynadıktan sonra bile tur büyük ihtimalle kaybediliyorsa (v < -0.22) jokeri boşa yakma!
        if(!matchPoint&&v<-0.22)return;
        const hiMult=HI_TIER_J.has(c.a.id)?0.025:0;
        const overkill=(bestFreeVal>=safeWinThr)?(matchPoint?0.08:0.16):0;
        const minGain=(overkill>0?overkill:(matchPoint?0.02:0.075))+hiMult;
        if(v>bestFreeVal+minGain&&v>bestVal+1e-9){bestVal=v;bi=i}
      }else if(v>bestVal+1e-9){
        bestVal=v;bi=i;
      }
    });
    done(top[bi].a);
  };
  if(K===0)return fin();
  const tick=()=>{const t1=now();
    while(k<K&&now()-t1<20){
      const W=world(S,p,prm,prm.deepRoll?k:null);
      for(let i=0;i<top.length;i++){
        if(!alive[i])continue;
        const T=clone(W),j0=[jCnt(T,0),jCnt(T,1)],r=rollout(T,p,top[i].a,RP);
        sum[i]+=r-cost*((jCnt(T,p)-j0[p])-.5*(jCnt(T,1-p)-j0[1-p]));
        cnt[i]++;
      }
      k++;
      if(k===40||k===110)prune();
    }
    if(k>=K||(bud&&k>=8&&now()-t0>bud))return fin();setTimeout(tick,0)};
  tick();
}
/* Bot zamanlaması: her hamleden önce düşünme süresi; jokerler ve çekmeler peş peşe gelmez */
const THINK={easy:[2600,3800],med:[2800,4200],hard:[3000,4600],imp:[2400,3400]},AFTER={easy:[2400,3200],med:[2500,3500],hard:[2600,3800],imp:[2000,2800]};
const rnd=r=>r[0]+Math.random()*(r[1]-r[0]);
let botGen=0,thinkOn=false;
function bot(){
  const S=G,prm=DIFF=='imp'?impPrm():PR[DIFF],gen=++botGen;let n=0;
  let plan=null,held=0,pid=0;
  const think=r=>{thinkOn=true;talk('think',1,.55);const d=rnd(r)*(S.clocks&&S.clocks[1]<20?.42:.75);plan=null;const my=++pid;
    const budCap=Math.max(900,Math.round(d-220));
    setTimeout(()=>{if(gen!=botGen||S!=G||S.turn!=1||S.over)return;if(n>=8){plan={a:null};return}
      const ok=a=>{if(my==pid&&gen==botGen&&S==G&&S.turn==1&&!S.over)plan={a}};
      if(prm.mc)decideHA(S,1,prm,ok,budCap);else ok(decide(S,1,prm))},20);
    setTimeout(step,d)};
  const step=()=>{
    if(gen!=botGen||S!=G)return;
    if(S.turn!=1||S.over){thinkOn=false;return}
    if(lock||(S.graceLeft&&S.graceLeft>0)){held=1;return setTimeout(step,150)}
    if(held){held=0;return setTimeout(step,420)}
    thinkOn=false;
    if(S.hpUsed&&!S.hpUsed[1]){
      const bh=avKey(S,1),bt=total(S,1),bT=tg(S),low=lowW(S);
      if(bh==='c'&&S.cWins&&S.cWins[1]>=3&&!low){
        CUR=prm;
        const curEv=evalS(clone(S),1),dp1=deathProb(S,1);
        const rwThr=prm.deepRoll?-(0.22+(1-dp1)*0.16):-0.35;
        if((bt>bT&&curEv<0.18)||(prm.hero&&curEv<rwThr)){
          execRewind(S,1);return think(AFTER[DIFF]);
        }
      }
      if(bh==='w'&&prm.hero&&S.pl[0].closed.length){
        const oppStood=!!(S.pa&&S.pa[0]>0);
        if(oppStood||low||bt>=bT-6||S.rounds>=1){
          S.hpUsed[1]=true;S.botPeekVal=S.pl[0].closed[0].n;
          S.log.push({p:1,t:'Kuzgunun Kehaneti kullandı (kapalı kartını inceledi)'});
          playHeroPowerAnim('w',1,HERO_MAP.w);snd('info');R();return think(AFTER[DIFF]);
        }
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
      if(bh==='p'&&S.hand[1].length>=1&&S.hand[1].length<=(prm.hero?4:2)&&S.jdeck.length>=2){
        let bIdx=-1;
        if(prm.hero){
          const cands=listC(S,1,prm),baseV=cands.find(x=>!x.a)?.v??0;
          let worst=1e9;
          S.hand[1].forEach((jid,idx)=>{
            // Güçlü tepki/kilit jokerlerini (İptal 12, Sustur 24, Hırsız 25 vb.) asla çöp sanıp yakma!
            if(jid===25||jid===12||jid===24)return;
            const holdFloor=HI_TIER_J.has(jid)?(baseV+0.22):(baseV-0.08);
            const bestForJ=cands.filter(x=>x.a&&x.a.id===jid).reduce((mx,x)=>Math.max(mx,x.v),holdFloor);
            if(bestForJ<worst){worst=bestForJ;bIdx=idx}
          });
          if(bIdx>=0&&worst>baseV+0.18&&S.hand[1].length>2)bIdx=-1;
        }else{
          bIdx=0;
        }
        if(bIdx>=0){execPlague(S,1,bIdx);R();return think(AFTER[DIFF])}
      }
      if(bh==='l'&&(S.pl[0].open.length||S.pl[1].open.length)){
        let useW=false;
        const oppVisBust=!low&&total(S,0,false)>bT;
        if(prm.hero&&!(oppVisBust&&bt<=bT)){
          CUR=prm;
          const before=evalS(clone(S),1);
          let sumA=0;const K=prm.deepRoll?48:28;
          for(let k=0;k<K;k++){
            const T=clone(S);T.log=[];
            if(T.pl[0].open.length)T.pl[0].open.splice(Math.floor(Math.random()*T.pl[0].open.length),1);
            if(T.pl[1].open.length)T.pl[1].open.splice(Math.floor(Math.random()*T.pl[1].open.length),1);
            sumA+=evalS(T,1);
          }
          const avgA=sumA/K;
          if((!low&&bt>bT&&avgA>before+0.06)||(avgA>before+0.18))useW=true;
        }else if(!oppVisBust&&((!low&&bt>bT)||(total(S,0,false)>=bT-2&&bt<total(S,0,false)))){
          useW=true;
        }
        if(useW){execWolf(S,1,()=>think(AFTER[DIFF]));return}
      }
    }
    const a=plan?plan.a:(n<8?(prm.mc?decideH:decide)(S,1,prm.mc?{...prm,K:90,ms:400}:prm):null);plan=null;pid++;
    if(!a){R();return pass()}
    n++;
    S.acted=true;
    if(a.t=='d'){if(S.botScry&&S.botScry.length)S.botScry.shift();const c=S.deck.pop();S.pl[1].open.push(c);if(S.stats&&S.stats.draws)S.stats.draws[1]++;S.acted=true;S.log.push({p:1,t:`kart çekti (${c.n})`});R();talk('draw',0,.3);think(AFTER[DIFF])}
    else{play(S,1,a.id,a.pk);S.log.push({p:1,t:`joker oynadı: ${J[a.id]}`});note(1,a.id,()=>{R();think(AFTER[DIFF])})}
  };
  think(THINK[DIFF]);
}

/* ---------- AKIŞ ---------- */
function pass(fromTimeout=false){
  const S=G;P=null;S.graceLeft=0;
  if(PUZZLE_ACTIVE){endRound();return;}
  S.log.push({p:S.turn,t:fromTimeout?'süresi bitti — sıra rakibe geçti':'pas dedi'});
  if(S.turn==1&&!fromTimeout)talk('pass',0,.35);
  const opp=1-S.turn;
  if(fromTimeout){
    if(S.turn==1){botGen++;thinkOn=false;}
    S.acted=false;S.turn=opp;(S.jTurn=S.jTurn||[0,0])[S.turn]=0;
    S.clocks=S.clocks||[initClockSec(),initClockSec()];S.clocks[opp]=initClockSec();
    S.timeOut=S.timeOut||[false,false];S.timeOut[opp]=false;
    R();next();
    return;
  }
  if(S.turns>0&&!S.acted){
    return endRound();
  }
  (S.pa=S.pa||[0,0])[S.turn]++;S.turns++;S.acted=false;S.turn=opp;(S.jTurn=S.jTurn||[0,0])[S.turn]=0;
  S.clocks=S.clocks||[initClockSec(),initClockSec()];S.clocks[opp]=initClockSec();
  S.timeOut=S.timeOut||[false,false];S.timeOut[opp]=false;
  R();next();
}
function next(){
  if(MODE=='tutorial'&&G&&G.turn==1&&!lock&&!G.over){setTimeout(()=>{if(MODE=='tutorial'&&G&&G.turn==1&&!lock&&!G.over)pass()},650);return}
  if(MODE=='bot'&&G&&G.turn==1&&!lock&&!G.over){
    if(entering){
      const gRef=G;
      setTimeout(()=>{if(MODE=='bot'&&G===gRef&&G.turn==1&&!lock&&!G.over)bot()},2200);
      return;
    }
    bot();
  }
}
function M(html,btn,cb,end){lock=true;const mb=$('#mb');mb.classList.remove('end-mode','an-mode','set-mode');mb.innerHTML=html+(btn?`<br><br><button id="mo" class="btn">${btn}</button>`:end?'':`<br><i>${tr('Rakibin devam etmesi bekleniyor…','Waiting for opponent to continue…')}</i>`)+(end?`<br><br><button id="mx" class="btn alt">${tr('Ana Menüye Dön','Return to Main Menu')}</button>`:'');$('#m').hidden=false;
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
  }else if(MODE=='bot'&&spectators.length){
    spectators.forEach(s=>{try{if(s.open)s.send({k:'m',html:fn(2),sd:sd&&sd(2),end,spec:true})}catch(e){}});
  }
  M(fn(0),btn,cb,end);snd(sd&&sd(0));
}
const PROF=(()=>{try{const o=JSON.parse(LS('prof')||'null');if(o&&Array.isArray(o.p)&&o.p.length==19)return o}catch(e){}return{n:0,p:new Array(19).fill(0)}})(); // oyuncunun pas geçtiği toplamlar (hedefe uzaklık) bu cihazda saklanır
function profRec(S,tot,T){if(lowW(S)||!S.pa||!(S.pa[0]>0))return;const d=Math.max(-6,Math.min(12,T-tot));S._liveStand=S._liveStand||[];S._liveStand.push(d);if(S._liveStand.length>8)S._liveStand.shift();PROF.p[d+6]++;PROF.n++;LS('prof',JSON.stringify(PROF));syncToFirebase()}

/* ---------- FIREBASE / GLOBAL BOT MEMORY ---------- */
const FB_CFG={
  apiKey: "AIzaSyBdrfPIhArtP0ck9A05--Z7s4Oq6exAZqQ",
  authDomain: "necrodice.firebaseapp.com",
  projectId: "necrodice",
  storageBucket: "necrodice.firebasestorage.app",
  messagingSenderId: "865937962056",
  appId: "1:865937962056:web:d54c137e3ca1e8cc95547d"
};
let fbDb=null,fbDoc=null,_fbInited=false;
window._initNecroFirebase=function(){
  if(_fbInited||!window.firebase)return;
  _fbInited=true;
  try{
    if(!firebase.apps||!firebase.apps.length)firebase.initializeApp(FB_CFG);
    fbDb=firebase.firestore();
    fbDoc=fbDb.collection('bot').doc('global_memory');
    fbDoc.get().then(doc=>{
      if(doc.exists){
        const d=doc.data();
        if(d.LRN)mergeGlobalLRN(d.LRN);
        if(d.PROF)mergeGlobalPROF(d.PROF);
      }
      if((LRN && LRN.ht > 0) || (PROF && PROF.n > 0))syncToFirebase();
    }).catch(e=>{
      console.warn('Firebase get error:',e);
      if((LRN && LRN.ht > 0) || (PROF && PROF.n > 0))syncToFirebase();
    });
    if(typeof USER_ACC!=='undefined'&&USER_ACC&&!USER_ACC.isGuest&&USER_ACC.key&&typeof pullAccountFromCloud==='function'){
      pullAccountFromCloud(USER_ACC.key).then(()=>{if(isRegisteredMember(USER_ACC))claimActiveSession(USER_ACC);});
    }
    if(typeof startLobbyPresence==='function')startLobbyPresence();
  }catch(e){console.warn('Firebase init error:',e)}
};
window._initNecroFirebase();

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
const ARMS=[{},{jc:.085,jl:.025},{jc:.115,jl:.035},{beta:.78,gap:6},{beta:.96,gap:7},{dm:.01},{rjp:.92},{rjp:1}];
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
function hmove(T,a,pol){ // simülasyonda oyuncunun hamlesi: akıllı rakip + öğrenilen çekme eğilimi
  const opt=decide(T,a,pol);
  if(lowW(T)||total(T,a,true)>=tg(T))return opt;
  if(opt&&opt.t==='j')return opt; // güçlü joker fırsatını asla küçümseme
  const d=Math.max(-6,Math.min(12,tg(T)-total(T,a,true)))+6,e=LRN.dp[d],n=e[0]+e[1];
  if(n<8)return opt;
  const pDraw=(e[0]+.5)/(n+1);
  if(canDraw(T,a)&&Math.random()<pDraw*0.5+(opt&&opt.t==='d'?0.5:0))return{t:'d'};
  return opt;
}
function isMobilePerf(){
  return window.innerWidth<=760||(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);
}
function dustElements(cards,crimson=false){
  if(!cards||!cards.length)return;
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
  const perCard=mob?28:52;
  const palParch=['#e7d7b8','#d5c098','#a6906c','#5c5043','#2b2520','#d4a855'];
  const palRed=['#c99c62','#8f242c','#4c2124','#3a312c','#e0c79e','#211b19'];
  const palBlood=['#dc2626','#991b1b','#f87171','#e7d7b8','#3a1518','#1c1412'];
  const pts=[];
  cards.forEach((c,idx)=>{
    const r=rects[idx];
    if(!r.width||!r.height)return;
    const isRed=c.classList.contains('bk')||c.classList.contains('opp');
    const pal=crimson?palBlood:(isRed?palRed:palParch);
    const baseD=idx*30;
    for(let i=0;i<perCard;i++){
      const u=Math.random(),v=Math.random();
      const front=(1-u)*0.65+v*0.35;
      pts.push({
        x:r.left+u*r.width,
        y:r.top+v*r.height,
        vx:38+Math.random()*95,
        vy:-18-Math.random()*62,
        sz:1.4+Math.random()*(mob?2.1:2.6),
        col:pal[(Math.random()*pal.length)|0],
        delay:baseD+front*300+Math.random()*55,
        life:380+Math.random()*320,
        phase:Math.random()*Math.PI*2,
        freq:4+Math.random()*6,
        swirl:14+Math.random()*24
      });
    }
  });
  const buckets=new Map();
  const t0=performance.now();
  const frame=now=>{
    const el=now-t0;
    ctx.clearRect(0,0,W,H);
    buckets.forEach(arr=>{arr.length=0});
    let alive=0;
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      const dt=el-p.delay;
      if(dt<0){alive++;continue}
      if(dt>=p.life)continue;
      alive++;
      const prog=dt/p.life;
      const sec=dt*0.001;
      const px=p.x+p.vx*sec*(0.4+0.8*prog)+Math.sin(sec*p.freq+p.phase)*p.swirl*prog;
      const py=p.y+p.vy*sec*(0.45+0.7*prog)+Math.cos(sec*p.freq*0.7+p.phase)*(p.swirl*0.45)*prog;
      const sz=p.sz*(1-prog*0.55);
      let b=buckets.get(p.col);
      if(!b){b=[];buckets.set(p.col,b);}
      b.push(px,py,sz);
    }
    const fade=el>520?Math.max(0,1-(el-520)/380):1;
    ctx.globalAlpha=0.88*fade;
    buckets.forEach((arr,col)=>{
      if(!arr.length)return;
      ctx.fillStyle=col;
      ctx.beginPath();
      for(let j=0;j<arr.length;j+=3)ctx.rect(arr[j],arr[j+1],arr[j+2],arr[j+2]);
      ctx.fill();
    });
    ctx.globalAlpha=1;
    if(alive>0&&el<900)requestAnimationFrame(frame);
    else cvs.remove();
  };
  requestAnimationFrame(frame);
}
function dustTableCards(){
  const cards=[...document.querySelectorAll('#opp .cards .c, #me .cards .c, #jo .e, #jm .e')];
  dustElements(cards,false);
}
function triggerVampBurnFx(vb){
  if(!vb)return;
  const btn=document.querySelector(vb.vamp===0?'#me .hp-btn':'#opp .hp-btn');
  if(btn){
    const hr=btn.getBoundingClientRect(),fx=document.createElement('div');
    fx.className='hp-cast-fx'+(vb.vamp===1?' opp':'');
    fx.style.left=(hr.left+hr.width/2)+'px';fx.style.top=(hr.top+hr.height/2)+'px';
    fx.innerHTML=`<i class="hp-cast-ring"></i><span class="hp-cast-pop">${tr('Kanlı Karşılık!','Blood Retaliation!')}</span>`;
    document.body.appendChild(fx);setTimeout(()=>fx.remove(),1350);
  }
  const jEls=vb.victim===0?[...document.querySelectorAll('#hand .j')]:[...document.querySelectorAll('#opp .opp-jhand .oj')];
  const targetEl=jEls[vb.idx]||jEls[jEls.length-1];
  if(targetEl)dustElements([targetEl],true);
}
function clearStaleAvAttackers(){
  document.querySelectorAll('.av-attacker').forEach(el=>el.remove());
  document.querySelectorAll('.who .av').forEach(av=>{if(av.style.opacity==='0')av.style.opacity='';});
}
function spawnAvAttackerClone(av,r){
  const c=av.cloneNode(false);
  c.removeAttribute('style');
  c.decoding='async';
  c.className='av-attacker';
  c.style.display='block';
  c.style.opacity='1';
  c.style.visibility='visible';
  c.style.left=r.left+'px';
  c.style.top=r.top+'px';
  c.style.width=r.width+'px';
  c.style.height=r.height+'px';
  c.style.objectPosition=av.style.objectPosition||getComputedStyle(av).objectPosition||'50% 50%';
  document.body.appendChild(c);
  av.style.opacity='0';
  return c;
}
function bindAvCloneCleanup(anim,c,av,dur){
  let done=false;
  const cleanup=()=>{
    if(done)return;
    done=true;
    if(c&&c.isConnected)c.remove();
    if(av&&av.isConnected)av.style.opacity='';
  };
  anim.onfinish=cleanup;
  setTimeout(cleanup,dur+150);
}
function triggerAvHitRecoil(dstAv){
  dstAv.classList.remove('av-hit');void dstAv.offsetWidth;dstAv.classList.add('av-hit');
  setTimeout(()=>{if(dstAv.isConnected)dstAv.classList.remove('av-hit');},620);
}
function heroAttack(winIdx,tanked=false){
  const srcAv=document.querySelector((winIdx===0?'#me':'#opp')+' .who .av');
  const dstAv=document.querySelector((winIdx===0?'#opp':'#me')+' .who .av');
  if(!srcAv||!dstAv)return;
  clearStaleAvAttackers();
  const r1=srcAv.getBoundingClientRect(),r2=dstAv.getBoundingClientRect();
  if(!r1.width||!r2.width)return;
  const dx=(r2.left+r2.width/2)-(r1.left+r1.width/2);
  const dy=(r2.top+r2.height/2)-(r1.top+r1.height/2);
  const clone=spawnAvAttackerClone(srcAv,r1);
  const dur=2550;
  const anim=clone.animate([
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0},
    {transform:`translate3d(${(-dx*0.06).toFixed(1)}px,${(-dy*0.06).toFixed(1)}px,0) scale(1.14) rotate(0deg)`,offset:0.22},
    {transform:`translate3d(${(-dx*0.12).toFixed(1)}px,${(-dy*0.12).toFixed(1)}px,0) scale(1.24) rotate(0deg)`,offset:0.38},
    {transform:`translate3d(${(dx*0.28).toFixed(1)}px,${(dy*0.28).toFixed(1)}px,0) scale(1.28) rotate(0deg)`,offset:0.52},
    {transform:`translate3d(${(dx*0.92).toFixed(1)}px,${(dy*0.92).toFixed(1)}px,0) scale(1.26) rotate(0deg)`,offset:0.62},
    {transform:`translate3d(${(dx*0.84).toFixed(1)}px,${(dy*0.84).toFixed(1)}px,0) scale(1.16) rotate(0deg)`,offset:0.69},
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:1}
  ],{duration:dur,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});

  setTimeout(()=>{
    if(!dstAv.isConnected)return;
    snd('stamp');vib([60,40,120]);
    triggerAvHitRecoil(dstAv);
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

  bindAvCloneCleanup(anim,clone,srcAv,dur);
}
function heroClash(){
  const av0=document.querySelector('#me .who .av');
  const av1=document.querySelector('#opp .who .av');
  if(!av0||!av1)return;
  clearStaleAvAttackers();
  const r0=av0.getBoundingClientRect(),r1=av1.getBoundingClientRect();
  if(!r0.width||!r1.width)return;
  const cx0=r0.left+r0.width/2,cy0=r0.top+r0.height/2;
  const cx1=r1.left+r1.width/2,cy1=r1.top+r1.height/2;
  const mx=(cx0+cx1)/2,my=(cy0+cy1)/2;
  const dx0=mx-cx0,dy0=(my-cy0)+r0.height*0.32;
  const dx1=mx-cx1,dy1=(my-cy1)-r1.height*0.32;
  const c0=spawnAvAttackerClone(av0,r0),c1=spawnAvAttackerClone(av1,r1);
  const dur=2800;
  const run=(c,dx,dy)=>c.animate([
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0},
    {transform:`translate3d(${(-dx*0.06).toFixed(1)}px,${(-dy*0.08).toFixed(1)}px,0) scale(1.12) rotate(0deg)`,offset:0.22},
    {transform:`translate3d(${(-dx*0.12).toFixed(1)}px,${(-dy*0.16).toFixed(1)}px,0) scale(1.20) rotate(0deg)`,offset:0.38},
    {transform:`translate3d(${(dx*0.30).toFixed(1)}px,${(dy*0.30).toFixed(1)}px,0) scale(1.25) rotate(0deg)`,offset:0.52},
    {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(1.24) rotate(0deg)`,offset:0.62},
    {transform:`translate3d(${(dx*0.80).toFixed(1)}px,${(dy*0.80).toFixed(1)}px,0) scale(1.14) rotate(0deg)`,offset:0.69},
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:1}
  ],{duration:dur,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});
  const a0=run(c0,dx0,dy0),a1=run(c1,dx1,dy1);
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
  bindAvCloneCleanup(a0,c0,av0,dur);
  bindAvCloneCleanup(a1,c1,av1,dur);
}
function heroVampTie(vampIdx){
  const av0=document.querySelector('#me .who .av');
  const av1=document.querySelector('#opp .who .av');
  if(!av0||!av1)return;
  clearStaleAvAttackers();
  const r0=av0.getBoundingClientRect(),r1=av1.getBoundingClientRect();
  if(!r0.width||!r1.width)return;
  const cx0=r0.left+r0.width/2,cy0=r0.top+r0.height/2;
  const cx1=r1.left+r1.width/2,cy1=r1.top+r1.height/2;
  const mx=(cx0+cx1)/2,my=(cy0+cy1)/2;
  const dx0=mx-cx0,dy0=(my-cy0)+r0.height*0.32;
  const dx1=mx-cx1,dy1=(my-cy1)-r1.height*0.32;
  const c0=spawnAvAttackerClone(av0,r0),c1=spawnAvAttackerClone(av1,r1);
  const dur=3600;
  const run=(c,dx,dy,tilt,isVamp)=>c.animate([
    {transform:'translate3d(0,0,0) scale(1) rotate(0deg)',offset:0},
    {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(1.22) rotate(0deg)`,offset:0.22},
    {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(1.22) rotate(0deg)`,offset:0.50},
    isVamp
      ?{transform:`translate3d(${(dx+(vampIdx===0?0:-6)).toFixed(1)}px,${(dy+(vampIdx===0?-22:22)).toFixed(1)}px,0) scale(1.30) rotate(0deg)`,offset:0.60}
      :{transform:`translate3d(${(dx*0.72).toFixed(1)}px,${(dy*0.72).toFixed(1)}px,0) scale(1.06) rotate(0deg)`,offset:0.62},
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
    triggerAvHitRecoil(dstAv);
    const dmg=document.createElement('div');
    dmg.className='av-dmg';
    dmg.textContent='-1';
    dmg.style.left=(dr.left+dr.width/2)+'px';
    dmg.style.top=(dr.top+dr.height/2)+'px';
    document.body.appendChild(dmg);
    setTimeout(()=>dmg.remove(),1250);
  },3050);
  bindAvCloneCleanup(a0,c0,av0,dur);
  bindAvCloneCleanup(a1,c1,av1,dur);
}
function endRound(){
  const S=G,a=[total(S,0),total(S,1)],T=tg(S);
  if(PUZZLE_ACTIVE){
    const won=outc(S,0)>0;
    S.wait=true;S.rev=true;S.winSide=won?1:-1;S.over=true;
    R();snd(won?'win':'lose');lock=true;
    setTimeout(()=>{if(typeof finishDailyPuzzle==='function')finishDailyPuzzle(won,a[0],a[1],T);},950);
    return;
  }
  let r=outc(S,0),tankedSide=-1,vampBurn=null;
  if(r!==0){
    const loser=r<0?0:1;
    if(avKey(S,loser)==='e'&&Math.random()<0.20){
      r=0;tankedSide=loser;
      S.log.push({p:loser,t:'Kadim Direnç! Hasarı savuşturup turu berabereye çevirdi!'});
    }
  }
  if(r!==0){
    const loser=r<0?0:1,winner=1-loser;
    if(avKey(S,loser)==='v'&&S.hand[winner]&&S.hand[winner].length>0){
      const bIdx=Math.floor(Math.random()*S.hand[winner].length);
      const jid=S.hand[winner][bIdx];
      vampBurn={vamp:loser,victim:winner,idx:bIdx,jid};
      S.log.push({p:loser,t:`Kanlı Karşılık! Rakibin 1 jokeri yandı (${J[jid]||''})`});
    }
  }
  if(S.stats&&S.stats.rounds){if(r>0)S.stats.rounds[0]++;else if(r<0)S.stats.rounds[1]++;else S.stats.rounds[2]++;}
  if(MODE=='bot'){profRec(S,a[0],T);lrnRound(r)}
  S.wait=true;S.rev=true;S.winSide=null;S.vampBurn=vampBurn;
  R();snd('flip');lock=true; // 1) Kapalı kartlar açılır ve masada açık kalır (düello kutusu henüz yanmaz)
  setTimeout(()=>{
    if(S!==G)return;
    // 2) Kazanan kahraman ikonu kalkıp kaybedenin ikonuna Hearthstone tarzı saldırı vuruşu yapar
    S.winSide=r;
    if(MODE=='bot'){talk(r==0?'tie':r<0?'win':(a[1]>T&&!lowW(S)?'bust':'lose'),2)}
    snd(r>0?'win':r<0?'lose':'ok');
    R();
    setTimeout(()=>{if(S===G){if(tankedSide>=0)heroAttack(1-tankedSide,true);else if(r!==0)heroAttack(r>0?0:1);else heroClash();}},1000);
    if(vampBurn){
      setTimeout(()=>{if(S===G)triggerVampBurnFx(vampBurn);},2400);
    }
    setTimeout(()=>{
      if(S!==G)return;
      // Vuruş animasyonu tamamlandıktan sonra düello kutusu (yeşil/kırmızı/gri) ve puanlar güncellenir
      if(vampBurn&&S.hand[vampBurn.victim]&&S.hand[vampBurn.victim][vampBurn.idx]===vampBurn.jid){
        S.hand[vampBurn.victim].splice(vampBurn.idx,1);
        (S.dj=S.dj||[]).push(vampBurn.jid);
      }
      S.vampBurn=null;
      if(r!==0){S.cWins=S.cWins||[0,0];S.cWins[r>0?0:1]++;}
      if(r>0)S.log.push({p:0,t:`turu kazandı (${a[0]} - ${a[1]})`});
      else if(r<0)S.log.push({p:1,t:`turu kazandı (${a[1]} - ${a[0]})`});
      else S.log.push({p:-1,t:`Tur ${S.rounds+1} berabere (${a[0]} - ${a[1]})`});
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
    S.winSide=null;S.vampBurn=null;
    if(MODE==='tutorial'){
      tutStep=8;R();tutRender();
      return;
    }
    const duelEnds=S.pts.some(x=>x>=2)||S.rounds>=3;
    if(!duelEnds){
      deal(S);R();runAfterDeal(S);
      return;
    }
    let L=S.pts[0]<S.pts[1]?0:S.pts[1]<S.pts[0]?1:-1,hx=null,how='',tieFirst=0;
    if(L<0){
      const j=S.hand.map(h=>h.length);
      if(j[0]!=j[1]){L=j[0]<j[1]?0:1;how='joker'}
      else{let x,y;do{x=d20();y=d20()}while(x==y);L=x<y?0:1;hx=[x,y];tieFirst=MODE==='bot'?0:(Math.random()<0.5?0:1);how='zar'}
    }
    const extraNeed=(CURSED_RULE&&CURSED_RULE.id==='blood_dice')?2:0;
    const th=Math.min(20,TH[Math.min(S.bo,3)]+extraNeed);
    let rawRoll=d20();
    if(L===0&&rawRoll===1&&VAULT_RUN&&VAULT_RUN.relics&&VAULT_RUN.relics.includes('reroll_one')&&!S._vRerolled){S._vRerolled=true;rawRoll=d20();}
    const vaultD20B=(L===0&&VAULT_RUN&&VAULT_RUN.relics&&VAULT_RUN.relics.includes('iron_fate'))?2:0;
    const hpB=(avKey(S,L)==='m'?2:0)+vaultD20B,execPen=avKey(S,1-L)==='n'?-2:0,roll=Math.max(1,Math.min(20,rawRoll+hpB+execPen)),surv=roll>=th;
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
          <span class="lbl">${tr('Hedef','Target')}</span>
          <span class="val">${th}</span>
        </div>
        <div class="d20-stage">
          <div class="d20-glow"></div>
          <canvas id="d20cv" class="d20-canvas" width="280" height="280"></canvas>
        </div>
        ${(rawOv==null&&(hpB||execPen))?`<div class="d20-hp-mod">${hpB?`<span class="d20-mod-pill bg3-bonus-card pos" data-val="${hpB}"><span class="mod-ic">${HP_IC.m}</span><b>${blessingName}</b><i>+${hpB}</i></span>`:''}${execPen?`<span class="d20-mod-pill bg3-bonus-card neg" data-val="-2"><span class="mod-ic">${HP_IC.n}</span><b>${decreeName}</b><i>−2</i></span>`:''}</div>`:''}
        ${L==v?`<button id="rl" class="btn d20-btn">${tr('Ölüm Zarını At','Roll Death Dice')}</button>`:`<button id="rl" class="btn d20-btn used" disabled aria-hidden="true">${tr('Ölüm Zarını At','Roll Death Dice')}</button>`}
      </div>
    </div><div class="after"><div class="after-roll"><b>${tr('Zar Sonucu','Roll Result')}: ${roll}${(hpB||execPen)&&rawOv==null?` (${rr}${hpB?`+${hpB} ${blessingName}`:''}${execPen?`−2 ${decreeName}`:''})`:''}</b></div><div class="after-msg">`+(surv?(L==v?`${tr('Kurtuldun!','You survived!')}<span class="after-sub">${tr('Hayatta kaldın.','You live to fight on.')}</span>`:tr('Rakip hayatta kaldı.','Opponent survived.')):(`<b>${L==v?`${tr('Öldün.','You died.')}<span class="after-sub">${tr('Oyunu rakip kazandı.','Opponent won the game.')}</span>`:`${tr('Rakip öldü.','Opponent died.')}<span class="after-sub">${tr('Oyunu sen kazandın!','You won the game!')}</span>`}</b>`))+'</div></div>'};
    const openDeathModal=()=>{
      HOLD_UNLOCK_TOASTS=true;
      const full=v=>mk(v,roll,surv)+(!surv&&!rig&&!uRev?`<template class="end-tpl">${buildEndScreenHtml(S,v,L,roll,th)}</template>`:''),rig=MODE=='bot'&&avKey(S,1)==='u'&&L==1&&!surv&&!S.rigDone; // Bilinmeyen (İmkansız bot): oyun başına bir kez ölümden döner
      const uRev=(MODE==='host'?(L===0||L===1):L===0)&&avKey(S,L)==='u'&&!surv&&!(S.uRevived&&S.uRevived[L]);
      if(surv||rig||uRev){const n=S.bo+2;
        if(surv&&S.stats&&S.stats.d20Surv)S.stats.d20Surv[L]++;
        if(surv&&L===0&&typeof onPlayerD20Survive==='function')onPlayerD20Survive(rawRoll,S);
        const lb=tr(`Düello ${n} ile Devam Et`,`Continue to Duel ${n}`),go=()=>{try{document.body.classList.remove('dead')}catch(e){}S.bo++;(S.mast=S.mast||[0,0])[L]=(S.mast[L]|0)+1;newBO3(S);deal(S);talk(L==0?'surv0':'surv1',2);R();runAfterDeal(S)};
        if(rig){S.rigDone=true;S.hpUsed[1]=true;impSave(mk(0,1,false,1),()=>M(mk(0,20,true,20),lb,go))}
        else if(uRev){S.uRevived=S.uRevived||[false,false];S.uRevived[L]=true;S.hpUsed[L]=true;impSave(mk(0,roll,false),()=>MM(v=>mk(v,20,true,20),lb,go),tr('Hiçlik seni geri çevirdi… Bir kez daha ölümden döndün!','The Void refused you… You have returned from death once more!'))}
        else MM(full,lb,go)}
      else{S.over=true;lrnGame(L==0);rematchReady=[false,false];rematchHeroes=[null,null];
        if(VAULT_RUN){
          const vWon=(L===1);
          if(vWon&&USER_ACC){USER_ACC.vaultBest=Math.max(USER_ACC.vaultBest||0,VAULT_RUN.stage+1);if(VAULT_RUN.stage>=4)USER_ACC.vaultWins=(USER_ACC.vaultWins||0)+1;saveSession(USER_ACC);}
          const vLbl=vWon?(VAULT_RUN.stage>=4?tr('Mahzen Zaferi (5/5)','Vault Victory (5/5)'):tr(`Kalıntı Seç (${VAULT_RUN.stage+2}/5)`,`Pick Relic (${VAULT_RUN.stage+2}/5)`)):tr('Mahzene Yeniden Gir','Retry Death Vault');
          MM(full,vLbl,()=>{if(vWon){if(VAULT_RUN.stage>=4)openVaultVictoryModal();else openVaultRelicPick();}else{VAULT_RUN=null;openVaultModal();}},null,true);
        }else if(MODE==='host'&&KING_TABLE&&KING_QUEUE.length>0){
          if(L===1)KING_STREAK++;else KING_STREAK=0;
          MM(full,tr(`Sıradaki Rakip (${KING_QUEUE.length} Sırada)`,`Next Challenger (${KING_QUEUE.length} Queued)`),()=>rotateKingTableNext(),null,true);
        }else{
          MM(full,tr('Yeniden Oyna','Play Again'),()=>chooseHero(hid=>{if(MODE==='host'){MY_HERO=hid;rematchReady[0]=true;rematchHeroes[0]=hid;checkStartOnlineRematch()}else{MY_HERO=hid;start()}},()=>{$('#menu').hidden=false;setMusic('menu')}),null,true);
        }
      }
    };
    if(how=='zar'){
      const tieFn=v=>{
        const vi=v===2?0:v,w=L===vi?1:0;
        const firstForV=tieFirst===vi?0:1;
        const sp0=(S.specMeta&&S.specMeta.p0Name)||NAMES[avKey(S,0)]||tr('Oyuncu','Player');
        const sp1=(S.specMeta&&S.specMeta.p1Name)||NAMES[avKey(S,1)]||tr('Rakip','Opponent');
        const myLbl=v===2?sp0:tr('Senin Zarın','Your Roll');
        const opLbl=v===2?sp1:(MODE==='bot'?tr('Botun Zarı','Bot\'s Roll'):tr('Rakibin Zarı','Opponent\'s Roll'));
        const resTxt=v===2?(w===0?tr(`${sp0} düelloyu kazandı!`,`${sp0} won the duel!`):tr(`${sp1} düelloyu kazandı!`,`${sp1} won the duel!`)) :(w===0?tr('Düelloyu sen kazandın!<br>Rakip Ölüm Zarı atacak.','You won the duel!<br>Opponent will roll the Death Dice.'):tr('Düelloyu rakip kazandı!<br>Ölüm Zarını sen atacaksın.','Opponent won the duel!<br>You will roll the Death Dice.'));
        return `<h3>${tr('Düello Berabere!','Duel Tied!')}</h3><p class="tie-sub">${tr('Puanlar ve kalan jokerler eşit. Sırayla D20 atılır, yüksek atan kazanır!','Points and remaining jokers are tied. Roll D20 in turn, higher wins!')}</p><div class="tie-box" data-d0="${hx[vi]}" data-d1="${hx[1-vi]}" data-win="${w}" data-first="${firstForV}" data-bot="${MODE==='bot'?1:0}"><div class="bg3-roll-card tie-d20-card"><div class="bg3-card-border"></div><i class="bg3-corner tl"></i><i class="bg3-corner tr"></i><i class="bg3-corner bl"></i><i class="bg3-corner br"></i><div id="tie-turn" class="tie-turn"></div><div class="d20-stage tie-d20-stage"><div class="d20-glow"></div><canvas id="tie-d20cv" class="d20-canvas" width="280" height="280"></canvas></div><div class="tie-sides"><div class="tie-side me"><span class="tie-lbl">${myLbl}</span><b id="tie-s0" class="tie-sum">—</b></div><div class="tie-vs">VS</div><div class="tie-side opp"><span class="tie-lbl">${opLbl}</span><b id="tie-s1" class="tie-sum">—</b></div></div><button id="tie-rl" class="btn d20-btn">${tr('D20 At','Roll D20')}</button></div><div class="tie-after"><b>${hx[vi]} – ${hx[1-vi]}</b><br>${resTxt}</div></div>`;
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
const VEIL_LOGO_SRC='limbi_favicon.png?v=limbi4';
const _veilLogoPre=(()=>{try{const i=new Image();i.src=VEIL_LOGO_SRC;if(i.decode)i.decode().catch(()=>{});return i}catch(e){return null}})();
function veil(ms=1600){
  const v=document.createElement('div');
  v.className='veil';
  v.style.animationDuration=ms+'ms';
  v.innerHTML=`<img alt="" src="${VEIL_LOGO_SRC}" width="165" height="165" decoding="sync" style="animation-duration:${ms}ms"><b>limbigames</b>`;
  document.body.appendChild(v);
  setTimeout(()=>v.remove(),ms+80);
}
function enter(fn){
  if(entering)return;
  entering=true;
  const dur=1600;
  veil(dur);
  setTimeout(()=>setMusic('game'),320);
  setTimeout(()=>{
    $('#menu').hidden=true;
    if(typeof dismissIncomingInviteBanner==='function')dismissIncomingInviteBanner();
    if(typeof updateLobbyPresence==='function')updateLobbyPresence(false);
    fn();
  },460);
  setTimeout(()=>{entering=false},dur-120);
}
let MY_HERO='c',OPP_HERO='n';
const HEROES_TR=[
  {id:'c',name:'Lanetli Tüccar',hpName:'Zamanın İadesi',desc:'Kullanıldığında masadaki tüm sayı kartları desteye geri karıştırılır. Kullanılmış Joker kartları yakılır ve yeni bir sayı kartı destesi dağıtılır. 3 tur galibiyet elde ettiğinde aktifleşir.'},
  {id:'p',name:'Veba Doktoru',hpName:'Vebalı Takas',desc:'Elindeki 1 Joker kartını yakarak desteden rastgele 2 yeni Joker kartı çek.'},
  {id:'n',name:'Kara Şövalye',passive:true,hpName:'Ölüm Fermanı',desc:'Rakibinin attığı her Ölüm Zarı sonucundan 2 çıkar.'},
  {id:'a',name:'Solmuş Kraliçe',hpName:'Yitik Yazgı',desc:'Destenin en üstündeki 2 kartı gizlice incele. Dilersen bu kartların yerlerini değiştir.'},
  {id:'s',name:'Büyücü',passive:true,hpName:'Gölge Hırsızı',desc:'Her düelloya 4. olarak Hırsız Jokeriyle başla.'},
  {id:'e',name:'Buz Devi',passive:true,hpName:'Kadim Direnç',desc:'Kaybettiğin her turda %20 ihtimalle gelen hasarı tamamen savuşturur ve turu beraberliğe dönüştürür.'},
  {id:'m',name:'Ölümün Efendisi',passive:true,hpName:'Ölümün Takdiri',desc:'Attığın her Ölüm Zarı sonucuna +2 bonus kazan.'},
  {id:'w',name:'Cadı',hpName:'Kuzgunun Kehaneti',desc:'Rakibinin kapalı sayı kartını incele.'},
  {id:'l',name:'Kurt Adam',hpName:'Kanlı Dolunay',desc:'Her iki oyuncunun da masadaki rastgele 1 açık sayı kartını imha et.'},
  {id:'v',name:'Vampir',passive:true,hpName:'Kanlı Karşılık',desc:'Bir turu kaybedince rakibin elindeki rastgele 1 Joker kartı yanar.'},
  {id:'u',name:'Bilinmeyen',passive:true,bossOnly:true,hpName:'Hiçlikten Dönüş',desc:'Ölüm zarında hedef sayının altında atarsan, ölümden bir kereliğine geri dönersin.'}
];
const HEROES_EN=[
  {id:'c',name:'Cursed Merchant',hpName:'Rewind of Time',desc:'Shuffles all number cards on the table back into the deck, burns used Jokers, and deals a fresh number hand. Unlocks after winning 3 rounds.'},
  {id:'p',name:'Plague Doctor',hpName:'Plague Trade',desc:'Burn 1 Joker card from your hand to draw 2 random new Joker cards from the deck.'},
  {id:'n',name:'Dark Knight',passive:true,hpName:'Death Decree',desc:'Subtract 2 from every Death Dice roll made by your opponent.'},
  {id:'a',name:'Withered Queen',hpName:'Lost Fate',desc:'Secretly inspect the top 2 cards of the deck. Swap their order if you wish.'},
  {id:'s',name:'Sorcerer',passive:true,hpName:'Shadow Thief',desc:'Start every duel with the Thief Joker as your 4th card.'},
  {id:'e',name:'Frost Giant',passive:true,hpName:'Ancient Resilience',desc:'Each time you lose a round, you have a 20% chance to deflect the damage and turn the round into a tie.'},
  {id:'m',name:'Lord of Death',passive:true,hpName:'Death\'s Favor',desc:'Gain a +2 bonus to every Death Dice roll you make.'},
  {id:'w',name:'Witch',hpName:'Raven\'s Prophecy',desc:'Inspect your opponent\'s hidden number card.'},
  {id:'l',name:'Werewolf',hpName:'Blood Full Moon',desc:'Destroy 1 random face-up number card on the table from both players.'},
  {id:'v',name:'Vampire',passive:true,hpName:'Blood Retaliation',desc:'Whenever you lose a round, 1 random Joker card in your opponent\'s hand is burned.'},
  {id:'u',name:'The Unknown',passive:true,bossOnly:true,hpName:'Return from the Void',desc:'If you roll below the target on the Death Dice, return from death once per match.'}
];
let HEROES=[...HEROES_TR];
let HERO_MAP=Object.fromEntries(HEROES.map(h=>[h.id,h]));
const hpImg=id=>`<img class="hp-art" src="hp_icons/${id}.jpg?v=20261127_hp_e4" alt="" decoding="async">`;
const HP_IC={
  c:hpImg('c'),
  p:hpImg('p'),
  k:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18l-2-10-4.5 4L12 5l-2.5 7L5 8l-2 10z"/></svg>',
  n:hpImg('n'),
  a:hpImg('a'),
  s:hpImg('s'),
  e:hpImg('e'),
  m:hpImg('m'),
  w:hpImg('w'),
  l:hpImg('l'),
  v:hpImg('v'),
  u:hpImg('u')
};
function start(){hiPreload();setMusic('game');try{document.body.classList.remove('dead')}catch(e){}glogOpen=false;glogLastSig='';LAST_MATCH_HIST=[];rematchReady=[false,false];rematchHeroes=[null,null];deathContReady=[false,false];deathContGo=null;const botPool=HEROES.filter(h=>!h.bossOnly||DIFF==='imp').map(h=>h.id),oppH=(VAULT_RUN&&VAULT_RUN.oppHero)?VAULT_RUN.oppHero:(MODE=='bot'?botPool[Math.floor(Math.random()*botPool.length)]:(OPP_HERO||'n'));G={u:0,bo:0,log:[],over:false,used:[],av:[MY_HERO,oppH],hero:[MY_HERO,oppH],uRevived:[false,false],vampUsed:[false,false],cWins:[0,0],vampBurn:null,mast:[0,0]};prevAv[0]=prevAv[1]=undefined;prevHpAnim=[false,false];lastThiefSeq=0;newBO3(G);deal(G);if(MODE==='bot'&&typeof startBotSpectateHost==='function')startBotSpectateHost();if(learning())armPick();sayT='';sayAt=0;botGen++;thinkOn=false;talk('hello',2);R();runAfterDeal(G)}

/* ---------- ARAYÜZ ---------- */
const cand=()=>P?opts(G,0,P.ks[P.pk.length]):[];
let prevT=false,lastLk='',flipId=null,lastTot=[0,0],lastBust=false,prevSeal='',sayT='',prevHpAnim=[false,false],lastThiefSeq=0;
function playThiefStealAnim(ev){
  if(!ev||RM||!ev.jid)return;
  const from=ev.fromRect||{left:innerWidth/2-28,top:innerHeight/2-40,width:56,height:80};
  const fx=from.left+from.width/2,fy=from.top+from.height/2;
  let targetEl=null;
  if(ev.thief===0){
    const cards=[...document.querySelectorAll('#hand .j[data-j]')];
    targetEl=cards[cards.length-1]||document.querySelector('#hand');
  }else{
    const oj=[...document.querySelectorAll('#opp .opp-jhand .oj')];
    targetEl=oj[oj.length-1]||document.querySelector('#opp .opp-jhand')||document.querySelector('#opp .who .av');
  }
  const tr=targetEl&&targetEl.getBoundingClientRect?targetEl.getBoundingClientRect():{left:innerWidth/2-40,top:ev.thief===0?innerHeight-110:70,width:80,height:120};
  const tx=tr.left+tr.width/2,ty=tr.top+tr.height/2;
  if(targetEl&&targetEl.classList&&targetEl.classList.contains('j')){
    targetEl.style.opacity='0';
  }
  const puff=document.createElement('div');
  puff.className='thief-puff';
  puff.style.left=fx+'px';
  puff.style.top=fy+'px';
  document.body.appendChild(puff);
  setTimeout(()=>{if(puff.isConnected)puff.remove()},560);

  const card=document.createElement('img');
  card.className='thief-fly-card';
  card.src=IMG.j[ev.jid]||'';
  card.alt='';
  const cw=Math.max(76,Math.min(118,tr.width||92));
  const ch=Math.round(cw*1.5);
  card.style.width=cw+'px';
  card.style.height=ch+'px';
  card.style.left=(fx-cw/2)+'px';
  card.style.top=(fy-ch/2)+'px';
  document.body.appendChild(card);
  hi(card,ev.jid);
  snd('flip');

  const dx=tx-fx,dy=ty-fy;
  const midX=dx*0.42,midY=dy*0.35+(ev.thief===0?-48:48);
  const startSc=Math.max(0.45,Math.min(0.75,(from.width||52)/cw));
  const endSc=ev.thief===0?1:0.42;
  let cleaned=false;
  const done=()=>{
    if(cleaned)return;
    cleaned=true;
    if(card.isConnected)card.remove();
    if(targetEl&&targetEl.classList&&targetEl.classList.contains('j')){
      targetEl.style.opacity='';
      targetEl.classList.add('thief-landed');
      setTimeout(()=>targetEl.classList.remove('thief-landed'),480);
    }
    snd('draw');
  };
  if(card.animate){
    const anim=card.animate([
      {transform:`translate3d(0,0,0) scale(${startSc.toFixed(3)}) rotate(-10deg)`,opacity:0.92},
      {transform:`translate3d(${midX.toFixed(1)}px,${midY.toFixed(1)}px,0) scale(1.18) rotate(${ev.thief===0?'5deg':'-5deg'})`,opacity:1,offset:0.45},
      {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(${endSc.toFixed(3)}) rotate(0deg)`,opacity:ev.thief===0?1:0.2}
    ],{duration:660,easing:'cubic-bezier(0.22,1,0.36,1)',fill:'forwards'});
    anim.onfinish=done;
    anim.oncancel=done;
  }
  setTimeout(done,740);
}
const NAMES_TR={c:'Lanetli Tüccar',p:'Veba Doktoru',n:'Kara Şövalye',a:'Solmuş Kraliçe',s:'Büyücü',e:'Buz Devi',m:'Ölümün Efendisi',w:'Cadı',l:'Kurt Adam',v:'Vampir',u:'Bilinmeyen'};
const NAMES_EN={c:'Cursed Merchant',p:'Plague Doctor',n:'Dark Knight',a:'Withered Queen',s:'Sorcerer',e:'Frost Giant',m:'Lord of Death',w:'Witch',l:'Werewolf',v:'Vampire',u:'The Unknown'};
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
function count(el,a,b){if(!el)return;if(el._cntRaf){cancelAnimationFrame(el._cntRaf);el._cntRaf=0}const target=String(b);if(a==b||RM||typeof requestAnimationFrame=='undefined'){if(el.textContent!==target)el.textContent=target;return}const t0=performance.now(),f=n=>{if(!el.isConnected){el._cntRaf=0;return}const x=Math.min(1,(n-t0)/520),e=1-Math.pow(1-x,3);const v=String(Math.round(a+(b-a)*e));if(el.textContent!==v)el.textContent=v;if(x<1)el._cntRaf=requestAnimationFrame(f);else el._cntRaf=0};el._cntRaf=requestAnimationFrame(f)}
let dealAnimUntil=0;
function fly(){ // yeni kartlar desteden teker teker, yumuşak yay çizerek uçar
  const d=$('#deck');if(!d||!d.getBoundingClientRect)return 0;
  const freshNodes=[...document.querySelectorAll('.fresh:not([data-flew])')];
  if(!freshNodes.length)return 0;
  freshNodes.forEach(el=>{el.dataset.flew='1'});
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
  const stepMs=isBatch?260:0;
  // Geçiş perdesi (.veil) tamamen açıldıktan sonra ilk kart hem görsel hem sesli olarak aynı milisaniyede çıkar
  const baseMs=entering?1180:(isBatch?140:0);
  // Son kartın uçuşu (580ms) tamamen bittikten sonra kilit açılsın (yarıda kesilip lag yapmasın)
  const totalMs=isBatch?(baseMs+(ordered.length-1)*stepMs+660):0;
  if(totalMs>0)dealAnimUntil=performance.now()+totalMs;
  const pulseDeck=()=>{
    if(!d.isConnected)return;
    d.classList.remove('pull');
    requestAnimationFrame(()=>{if(d.isConnected)d.classList.add('pull')});
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
    const launch=()=>{
      if(!el.isConnected)return;
      el.style.animation='';
      el.style.opacity='';
      pulseDeck();
      snd('draw');
    };
    if(delayMs<=0){
      launch();
    }else{
      setTimeout(launch,delayMs);
    }
  });
  setTimeout(()=>{if(d.isConnected)d.classList.remove('pull')},baseMs+(ordered.length-1)*stepMs+640);
  return totalMs;
}
function runAfterDeal(S){
  const waitMs=Math.max(0,Math.ceil(dealAnimUntil-performance.now()));
  if(waitMs<=40){next();return}
  lock=true;
  setTimeout(()=>{
    if(S!==G||S.over)return;
    lock=false;
    if(S.turn==0&&!S.wait)snd('turn');
    next();
  },waitMs);
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
function fit(){fitQ=0;FIT=1;}
const fitSoon=()=>{fitQ=0;FIT=1;};
addEventListener('resize',()=>{fitSig='';fitSoon()});addEventListener('orientationchange',()=>setTimeout(()=>{fitSig='';fitSoon()},250));
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{fitSig='';fitSoon()});
function ensureZoneParts(sel,isOpp){
  const root=$(sel);
  if(!root)return null;
  let who=root.querySelector(':scope > .who');
  let cards=root.querySelector(':scope > .cards');
  let jhand=isOpp?root.querySelector(':scope > .opp-jhand'):null;
  if(!who||!cards||(isOpp&&!jhand)){
    root.innerHTML=(isOpp?'<div class="opp-jhand"></div>':'')
      +'<div class="who">'
      +'<img class="av" alt="">'
      +'<span class="hp-slot" style="display:contents"></span>'
      +'<div class="nm"><b></b><span class="meta nick"></span></div>'
      +(isOpp?'<div class="tot"><small></small><div class="tl"><b>0</b><span class="tl-suf"></span></div></div>':'<div class="tot"><small></small><b>0</b></div>')
      +'</div>'
      +'<div class="cards"></div>';
    who=root.querySelector(':scope > .who');
    cards=root.querySelector(':scope > .cards');
    jhand=isOpp?root.querySelector(':scope > .opp-jhand'):null;
    cards.addEventListener('animationend',ev=>{
      const t=ev.target;
      if(!t||!t.classList||!t.classList.contains('c'))return;
      if(ev.animationName==='flip')t.classList.remove('flip');
      else if(ev.animationName==='cardFlyIn'||ev.animationName==='fly'){t.classList.remove('fresh');delete t.dataset.flew;}
    });
  }
  return {root,who,cards,jhand};
}
function syncWhoBox(whoEl,cfg){
  const av=whoEl.querySelector(':scope > .av');
  if(av){
    if(av.dataset.av!==String(cfg.side))av.dataset.av=String(cfg.side);
    if(av._src!==cfg.avSrc){av.src=cfg.avSrc;av._src=cfg.avSrc;}
    if(av.style.objectPosition!==cfg.fp)av.style.objectPosition=cfg.fp;
    const clsChanged=av._mCls!==cfg.mCls||av._mo!==cfg.mo;
    if(clsChanged){
      av.classList.remove('morph','mastery-1','mastery-2','mastery-3');
      if(cfg.mo)av.classList.add('morph');
      if(cfg.mCls)av.classList.add(cfg.mCls.trim());
      av.style.animationDelay=cfg.mo?`-${cfg.el.toFixed(2)}s`:'';
      av._mCls=cfg.mCls;av._mo=cfg.mo;
    }
    if(cfg.onAvClick!==undefined)av.onclick=cfg.onAvClick;
  }
  const hpSlot=whoEl.querySelector(':scope > .hp-slot');
  if(hpSlot){
    const curBtn=hpSlot.firstElementChild;
    const m=cfg.hpMeta;
    const sameBtn=curBtn&&m&&curBtn.tagName===m.tag&&curBtn.dataset.hpId===m.id&&curBtn.dataset.hpSide===String(cfg.side);
    if(sameBtn){
      curBtn.classList.toggle('passive',!!m.passive);
      curBtn.classList.toggle('used',!!m.used);
      curBtn.classList.toggle('ready',!!m.ready);
      curBtn.classList.toggle('locked',!!m.locked);
      curBtn.classList.toggle('secret-hp',!!m.secret);
      if(m.tag==='BUTTON')curBtn.setAttribute('aria-disabled',String(!m.ready));
      const progEl=curBtn.querySelector('.hp-prog');
      if(m.prog){
        if(progEl){if(progEl.textContent!==m.prog)progEl.textContent=m.prog;}
        else{const p=document.createElement('i');p.className='hp-prog';p.textContent=m.prog;curBtn.appendChild(p);}
      }else if(progEl)progEl.remove();
      const dotEl=curBtn.querySelector('.hp-dot');
      if(m.dot){
        if(dotEl){dotEl.className=`hp-dot ${m.dot}`;}
        else{const d=document.createElement('i');d.className=`hp-dot ${m.dot}`;curBtn.appendChild(d);}
      }else if(dotEl)dotEl.remove();
      hpSlot._h=cfg.hpHtml;
    }else if(hpSlot._h!==cfg.hpHtml){
      hpSlot.innerHTML=cfg.hpHtml;
      hpSlot._h=cfg.hpHtml;
    }
  }
  const nmB=whoEl.querySelector(':scope > .nm > b');
  if(nmB&&nmB.textContent!==cfg.name)nmB.textContent=cfg.name;
  const nmSub=whoEl.querySelector(':scope > .nm > .meta.nick');
  if(nmSub&&nmSub.textContent!==cfg.sub)nmSub.textContent=cfg.sub;
  const tot=whoEl.querySelector(':scope > .tot');
  if(tot){
    tot.classList.toggle('bust',!!cfg.bust);
    tot.classList.toggle('exact',!!cfg.exact);
    const sm=tot.querySelector('small');
    if(sm&&sm.textContent!==cfg.totLbl)sm.textContent=cfg.totLbl;
    if(cfg.sufHtml!=null){
      const suf=tot.querySelector('.tl-suf');
      if(suf&&suf._h!==cfg.sufHtml){suf.innerHTML=cfg.sufHtml;suf._h=cfg.sufHtml;}
    }
  }
}
function syncCardsEl(cardsEl,specs,cCnt){
  cardsEl.classList.toggle('cards-2row',cCnt>=6);
  cardsEl.classList.toggle('cards-dense',cCnt>=9);
  const byKey=new Map();
  for(const ch of [...cardsEl.children]){
    const k=ch.dataset.k;
    if(k)byKey.set(k,ch);
  }
  const desired=[];
  for(const sp of specs){
    if(sp.gap){
      let g=byKey.get('gap');
      if(!g){g=document.createElement('span');g.className='gap';g.dataset.k='gap';}
      desired.push(g);
      continue;
    }
    const key='c-'+sp.c.id;
    let el=byKey.get(key);
    const faceSig=sp.back?'bk':(sp.c.o==null?('n:'+sp.c.n):('o:'+sp.c.o));
    const wasBack=el?el._isBack:null;
    const shouldFlip=!!sp.forceFlip||(!!sp.revFlip&&wasBack===true&&!sp.back);
    if(!el||el._faceSig!==faceSig||shouldFlip){
      let node;
      if(!sp.back&&sp.c.o==null){
        node=document.createElement('img');
        node.className='c n';
        node.decoding='async';
        const cachedN=HQ['n_'+sp.c.n+'_v3'];
        node.src=(cachedN&&cachedN.complete&&cachedN.naturalWidth)?cachedN.src:IMG.n[sp.c.n];
        node.alt=String(sp.c.n);
        if(!cachedN||!cachedN.complete||!cachedN.naturalWidth){
          numHD(sp.c.n)(u=>{if(node.isConnected&&node.src!==u)node.src=u;});
        }
      }else{
        node=document.createElement('div');
        node.className='c'+(sp.back?' bk':'');
        if(!sp.back){
          node.innerHTML=`${sp.c.o??sp.c.n}${sp.c.o!=null?'<i>↺</i>':''}`;
        }
      }
      node.dataset.k=key;
      node.dataset.c=String(sp.c.id);
      if(sp.pk)node.dataset.pk='1';
      if(sp.pk&&sp.revDelay)node.style.setProperty('--fd','.08s');
      if(sp.nf)node.classList.add('fresh');
      if(shouldFlip){
        node.classList.add('flip');
        setTimeout(()=>{if(node.isConnected)node.classList.remove('flip');},720);
      }
      if(sp.hl)node.classList.add('hl');
      if(sp.pk)node.classList.add('mc');
      node._faceSig=faceSig;
      node._isBack=!!sp.back;
      if(el&&el.parentNode===cardsEl){
        cardsEl.replaceChild(node,el);
      }
      el=node;
    }else{
      el.classList.toggle('hl',!!sp.hl);
      el.classList.toggle('mc',!!sp.pk);
      if(sp.pk)el.dataset.pk='1';else delete el.dataset.pk;
    }
    desired.push(el);
  }
  const keep=new Set(desired);
  for(const ch of [...cardsEl.children]){
    if(!keep.has(ch))ch.remove();
  }
  for(let i=0;i<desired.length;i++){
    const node=desired[i];
    if(cardsEl.children[i]!==node){
      cardsEl.insertBefore(node,cardsEl.children[i]||null);
    }
  }
}
function syncEffEl(el,items,mkSpec){
  if(!el)return;
  const byUid=new Map();
  for(const ch of [...el.children]){
    const u=ch.dataset.e;
    if(u)byUid.set(u,ch);
  }
  const desired=[];
  for(const x of items){
    const sp=mkSpec(x);
    const key=String(sp.uid);
    let node=byUid.get(key);
    if(!node){
      node=document.createElement('span');
      node.dataset.e=key;
      const im=document.createElement('img');
      im.src=IMG.j[sp.id];
      im.alt='';
      node.appendChild(im);
    }
    node.className=`e${sp.block?'':' used'}${sp.neg?' neg':''}${sp.mine?' mine':' opp'}${sp.seen?'':' newc'}${sp.hl?' hl':''}`;
    desired.push(node);
  }
  const keep=new Set(desired);
  for(const ch of [...el.children]){if(!keep.has(ch))ch.remove();}
  for(let i=0;i<desired.length;i++){
    if(el.children[i]!==desired[i])el.insertBefore(desired[i],el.children[i]||null);
  }
  el._h=null;
}
function syncHandEl(handEl,ids,isSpec,k,my,S){
  if(!handEl)return;
  const n=ids.length;
  const prev=[...handEl.children].filter(ch=>ch.classList.contains('jslot'));
  if(prev.length!==handEl.children.length){handEl.innerHTML='';prev.length=0;}
  const canReuse=prev.length===n&&prev.every((slot,i)=>{
    const im=slot.querySelector('img.j');
    const id=ids[i];
    return im&&(id?im.dataset.j===String(id):(isSpec&&!im.dataset.j));
  });
  if(canReuse){
    prev.forEach((slot,i)=>{
      const id=ids[i],im=slot.querySelector('img.j');
      const rot=`${((i-(n-1)/2)*5).toFixed(1)}deg`;
      if(im.style.getPropertyValue('--r')!==rot)im.style.setProperty('--r',rot);
      if(isSpec){
        im.className='j spec-ro';
      }else{
        const cls=`j${k==='hand_j'?' hl':(my&&!P&&playable(S,0,id)?'':' dim')}`;
        if(im.className!==cls)im.className=cls;
        if(im.dataset.jidx!==String(i))im.dataset.jidx=String(i);
      }
    });
    return;
  }
  const frag=document.createDocumentFragment();
  ids.forEach((id,i)=>{
    const slot=document.createElement('span');
    slot.className='jslot';
    const im=document.createElement('img');
    im.draggable=false;
    im.alt='';
    im.style.setProperty('--r',`${((i-(n-1)/2)*5).toFixed(1)}deg`);
    if(isSpec){
      im.className='j spec-ro';
      if(id){im.dataset.j=String(id);im.dataset.jidx=String(i);im.src=IMG.j[id];hi(im,+id);}
      else{im.src=IMG.bj;}
    }else{
      im.className=`j${k==='hand_j'?' hl':(my&&!P&&playable(S,0,id)?'':' dim')}`;
      im.dataset.j=String(id);
      im.dataset.jidx=String(i);
      im.src=IMG.j[id];
      hi(im,+id);
    }
    slot.appendChild(im);
    frag.appendChild(slot);
  });
  handEl.innerHTML='';
  handEl.appendChild(frag);
  handEl._h=null;
}
function R(){
  if(!G)return;
  watch();
  const S=G,low=lowW(S),cn=cand(),k=P&&P.ks[P.pk.length],bi=Math.min(S.bo,3),T=tg(S),res=S.res||[];
  const mkCardSpec=(c,back,forceFlip,revFlip,pk)=>{
    const nf=!seen.has(c.id);
    seen.add(c.id);
    return {c,back,nf,forceFlip:!!forceFlip,revFlip:!!revFlip,revDelay:!!(pk&&S.rev),hl:cn.includes(c.id),pk:!!pk};
  };
  const pips=[0,1,2].map(i=>`<span class="pip ${res[i]==null?(i==S.rounds?'now':''):res[i]>0?'w':res[i]<0?'l':'d'}"></span>`).join('');
  const sk=TH.map((t,i)=>`<span class="sk${i<bi?' past':i==bi?' cur':''}" title="${tr(`D20 Ölüm Eşiği: ${t} veya üstü atmalısın`,`D20 Death Threshold: Roll ${t} or higher`)}">${IC.skull}<small>${t}</small></span>`).join('');
  const isSpec=MODE=='spectator';
  const modeBadge=CURSED_RULE?`<span class="mode-pill cursed" title="${escHtml(isEn()?CURSED_RULE.enD:CURSED_RULE.trD)}">${escHtml(isEn()?CURSED_RULE.enN:CURSED_RULE.trN)}</span>`:(VAULT_RUN?`<span class="mode-pill vault">${tr(`Mahzen ${VAULT_RUN.stage+1}/5`,`Vault ${VAULT_RUN.stage+1}/5`)}</span>`:(PUZZLE_ACTIVE?`<span class="mode-pill puzzle">${tr('Günün Bulmacası','Daily Puzzle')}</span>`:''));
  setH('#hdr',`<div class="hs sks">${sk}</div><div class="hc"><span class="lab">${tr('Düello','Duel')} ${S.bo+1}</span><span class="pips">${pips}</span>${modeBadge}</div><div class="hg"><button class="gear" data-g="1" aria-label="${tr('Ayarlar','Settings')}">${IC.gear}<span>${tr('Ayarlar','Settings')}</span></button></div>`);
  const oppHidZero=!S.rev&&clZero(S)&&S.pl[1].closed.length>0;
  const oppClosedKnown=!!(S.rev||oppHidZero||(S.pl[1].closed.length&&S.pl[1].closed.every(c=>c.o!=null||(S.oppPeek&&S.oppPeek.includes(c.id)))));
  const my=!isSpec&&S.turn==0&&!lock&&!S.wait,mt=total(S,0),ot=total(S,1,oppClosedKnown),bust=!low&&mt>T,obust=oppClosedKnown&&!low&&ot>T,seal=T+(low?'L':'');
  const exact=!low&&mt===T,oexact=oppClosedKnown&&!low&&ot===T;
  const avMeta=p=>{
    const hk=avKey(S,p),now=performance.now();
    if(prevAv[p]!==undefined&&prevAv[p]!==hk)morphT[p]=now;
    prevAv[p]=hk;
    const el=(now-morphT[p])/1000,mo=!!(morphT[p]&&el<1.1),fp=HERO_FOCUS[hk]||'50% 25%';
    const mCls=(p===0&&!isSpec&&typeof getHeroMastery==='function'&&typeof USER_ACC!=='undefined'&&USER_ACC)?((t=>t?`mastery-${t}`:'')(getHeroMastery(USER_ACC,hk).tier)):'';
    return {src:avSrc(hk),fp,mo,el,mCls};
  };
  const av0m=avMeta(0),av1m=avMeta(1);
  const p0Char=NAMES[avKey(S,0)]||tr('Lanetli Tüccar','Cursed Merchant');
  const p1Char=NAMES[avKey(S,1)]||tr('Kara Şövalye','Dark Knight');
  const p0Name=p0Char;
  const p1Name=(isSpec||MODE=='guest'||MODE=='host')?p1Char:(MODE=='bot'||S.av?oppName():tr('Rakip','Opponent'));
  const oppTimeOut=!!(S.timeOut&&S.timeOut[1]),meTimeOut=!!(S.timeOut&&S.timeOut[0]);
  const defClock=initClockSec();
  const c0=Math.ceil(S.clocks?S.clocks[0]:defClock),c1=Math.ceil(S.clocks?S.clocks[1]:defClock);
  const sc0=$('#sc-0'),sc1=$('#sc-1'),scSec0=$('#sc-sec-0'),scSec1=$('#sc-sec-1');
  if(scSec0){const v=(meTimeOut||c0<=0)?'✕':String(c0);if(scSec0.textContent!==v)scSec0.textContent=v;}
  if(scSec1){const v=(oppTimeOut||c1<=0)?'✕':String(c1);if(scSec1.textContent!==v)scSec1.textContent=v;}
  if(sc0){sc0.classList.toggle('ticking',S.turn==0&&!S.wait&&!(S.graceLeft>0)&&!S.reconnPause&&!meTimeOut);sc0.classList.toggle('low',c0<=10&&c0>0);sc0.classList.toggle('out',meTimeOut||c0<=0);sc0.classList.toggle('turn-on',S.turn==0&&!S.wait&&!S.over);sc0.classList.toggle('turn-off',S.turn!=0&&!S.wait&&!S.over)}
  if(sc1){sc1.classList.toggle('ticking',S.turn==1&&!S.wait&&!(S.graceLeft>0)&&!S.reconnPause&&!oppTimeOut);sc1.classList.toggle('low',c1<=10&&c1>0);sc1.classList.toggle('out',oppTimeOut||c1<=0);sc1.classList.toggle('turn-on',S.turn==1&&!S.wait&&!S.over);sc1.classList.toggle('turn-off',S.turn!=1&&!S.wait&&!S.over)}
  $('#opp').className='zone'+(S.turn==1&&!S.wait?' act':'')+(S.winSide!=null?(S.winSide>0?' round-lose':S.winSide===0?' round-tie':''):'');
  const myHId=avKey(S,0),oppHId=avKey(S,1);
  const hpUsed0=myHId==='u'?!!(S.uRevived&&S.uRevived[0]):(myHId==='m'||myHId==='e'||myHId==='n'||myHId==='s'||myHId==='c'||myHId==='v')?false:!!(S.hpUsed&&S.hpUsed[0]);
  const hpUsed1=oppHId==='u'?!!(MODE==='bot'?S.rigDone:(S.uRevived&&S.uRevived[1])):(oppHId==='m'||oppHId==='e'||oppHId==='n'||oppHId==='s'||oppHId==='w'||oppHId==='c'||oppHId==='v')?false:!!(S.hpUsed&&S.hpUsed[1]);
  const hpObj0=HERO_MAP[myHId]||HEROES[0],hpObj1=HERO_MAP[oppHId]||HEROES[0];
  const cWins0=(S.cWins&&S.cWins[0])||0,cReady=myHId!=='c'||cWins0>=3;
  const cWins1=(S.cWins&&S.cWins[1])||0,cReady1=oppHId!=='c'||cWins1>=3;
  const canHp=!isSpec&&!hpObj0.passive&&my&&!P&&!hpUsed0&&cReady;
  const cProg=(myHId==='c'&&!cReady)?`<i class="hp-prog">${Math.min(3,cWins0)}/3</i>`:'';
  const cProg1=(oppHId==='c'&&!cReady1)?`<i class="hp-prog">${Math.min(3,cWins1)}/3</i>`:'';
  const hpDot0=(!hpObj0.passive&&!cProg)?`<i class="hp-dot ${(!hpUsed0&&cReady)?'on':'off'}"></i>`:'';
  const hpDot1=(!hpObj1.passive&&!cProg1&&oppHId!=='w')?`<i class="hp-dot ${(!hpUsed1&&cReady1)?'on':'off'}"></i>`:'';
  const hpMeta0={tag:isSpec?'SPAN':'BUTTON',id:myHId,passive:!!hpObj0.passive,used:!!hpUsed0,ready:isSpec?false:!!canHp,locked:isSpec?!cReady:false,secret:false,prog:(myHId==='c'&&!cReady)?`${Math.min(3,cWins0)}/3`:'',dot:(!hpObj0.passive&&!cProg)?((!hpUsed0&&cReady)?'on':'off'):''};
  const hpMeta1={tag:'SPAN',id:oppHId,passive:!!hpObj1.passive,used:!!hpUsed1,ready:false,locked:!cReady1,secret:(oppHId==='w'),prog:(oppHId==='c'&&!cReady1)?`${Math.min(3,cWins1)}/3`:'',dot:(!hpObj1.passive&&!cProg1&&oppHId!=='w')?((!hpUsed1&&cReady1)?'on':'off'):''};
  const hpBtn0=isSpec?`<span class="hp-btn opp-hp${hpObj0.passive?' passive':''}${hpUsed0?' used':!cReady?' locked':''}" data-hp-id="${myHId}" data-hp-side="0">${HP_IC[myHId]||HP_IC.c}${cProg}${hpDot0}</span>`:`<button id="hp-btn" class="hp-btn${hpObj0.passive?' passive':''}${hpUsed0?' used':canHp?' ready':''}" data-hp="1" data-hp-id="${myHId}" data-hp-side="0" aria-disabled="${!canHp}">${HP_IC[myHId]||HP_IC.c}${cProg}${hpDot0}</button>`;
  const hpBtn1=`<span class="hp-btn opp-hp${hpObj1.passive?' passive':''}${hpUsed1?' used':!cReady1?' locked':''}${oppHId==='w'?' secret-hp':''}" data-hp-id="${oppHId}" data-hp-side="1">${HP_IC[oppHId]||HP_IC.c}${cProg1}${hpDot1}</span>`;
  const myGuest=typeof isGuestUser==='function'?isGuestUser(USER_ACC):(!USER_ACC||USER_ACC.isGuest);
  const myFl=(typeof getAccountLeague==='function'&&USER_ACC)?getAccountLeague(USER_ACC):null;
  const myBaseName=(!myGuest&&USER_ACC&&USER_ACC.username)?USER_ACC.username:tr('Misafir','Guest');
  const myNick=myFl?`${myBaseName} · ${myFl.unranked?tr('Derecesiz','Unranked'):myFl.name}`:myBaseName;
  const p0Sub=isSpec?((S.specMeta&&S.specMeta.p0Sub)?S.specMeta.p0Sub:''):myNick;
  const oppBotSub=(DIFF==='easy'?tr('Kolay Seviye Bot','Easy Level Bot'):DIFF==='med'?tr('Orta Seviye Bot','Medium Level Bot'):DIFF==='hard'?tr('Zor Seviye Bot','Hard Level Bot'):tr('İmkansız Seviye Bot','Impossible Level Bot'));
  const oppOnlineName=(OPP_PROFILE&&OPP_PROFILE.name)?OPP_PROFILE.name:tr('Çevrim İçi','Online');
  const oppOnlineLg=(OPP_PROFILE&&OPP_PROFILE.leagueName)?OPP_PROFILE.leagueName:'';
  const oppSub=isSpec?((S.specMeta&&S.specMeta.p1Sub)?S.specMeta.p1Sub:''):(MODE==='bot'?oppBotSub:(MODE==='tutorial'?tr('Eğitim','Tutorial'):(oppOnlineLg?`${oppOnlineName} · ${oppOnlineLg}`:oppOnlineName)));
  const totLbl=tr('Toplam','Total');
  const oppZ=ensureZoneParts('#opp',true);
  if(oppZ){
    const jTitle=tr(`Rakibin elindeki kapalı jokerler (${S.hand[1].length})`,`Opponent's hidden jokers (${S.hand[1].length})`);
    if(oppZ.jhand.title!==jTitle)oppZ.jhand.title=jTitle;
    const oppHandInner=S.hand[1].map((_,i)=>`<img class="oj" style="--r:${((i-(S.hand[1].length-1)/2)*4.5).toFixed(1)}deg" src="${IMG.bj}" alt="">`).join('');
    if(oppZ.jhand._h!==oppHandInner){oppZ.jhand.innerHTML=oppHandInner;oppZ.jhand._h=oppHandInner;}
    const oppSufHtml=oppHidZero?'<i class="pq">+</i><b>0</b>':oppClosedKnown?'':'<i class="pq">+</i><i class="pq">?</i>';
    syncWhoBox(oppZ.who,{side:1,avSrc:av1m.src,fp:av1m.fp,mo:av1m.mo,el:av1m.el,mCls:av1m.mCls,hpHtml:hpBtn1,hpMeta:hpMeta1,name:p1Name,sub:oppSub,bust:obust,exact:oexact,totLbl,sufHtml:oppSufHtml});
    const cCnt1=S.pl[1].open.length+S.pl[1].closed.length;
    const oppSpecs=[
      ...S.pl[1].open.map(c=>mkCardSpec(c,false,false,false,false)).reverse(),
      {gap:true},
      ...S.pl[1].closed.map(c=>mkCardSpec(c,!(S.rev||c.o!=null||(S.oppPeek&&S.oppPeek.includes(c.id))),false,!!S.rev,false))
    ];
    syncCardsEl(oppZ.cards,oppSpecs,cCnt1);
  }
  const activeTg=tgE(S),activeCl=clE(S);
  const effSpec=x=>{const e=S.eff.find(y=>y.uid==x.uid)||x,isSup=!e.neg&&((TGS.has(e.id)&&activeTg&&e.uid!==activeTg.uid)||(CLS.has(e.id)&&activeCl&&e.uid!==activeCl.uid));return {uid:e.uid,id:e.id,block:BLOCK.has(e.id),neg:!!(e.neg||isSup),mine:e.o==0,seen:seenE.has(e.uid),hl:(k=='eff'||k=='steal_j')&&cn.includes(e.uid)}};
  $('#deck b').textContent=S.deck.length;
  const drawLocked=S.eff.some(e=>e.id==23&&!e.neg&&e.o!=0);
  $('#deck').classList.toggle('can-draw',!isSpec&&my&&!P&&canDraw(S,0));
  $('#deck').classList.toggle('draw-locked',drawLocked);
  let pendingThief=null;
  if(S.thiefSteal&&S.thiefSteal.seq&&S.thiefSteal.seq!==lastThiefSeq){
    lastThiefSeq=S.thiefSteal.seq;
    const chipEl=document.querySelector(`[data-e="${S.thiefSteal.uid}"]`);
    const fbEl=document.querySelector('#jm')||document.querySelector('#jo')||document.querySelector('#seal');
    const r=(chipEl||fbEl)&&((chipEl||fbEl).getBoundingClientRect());
    pendingThief={...S.thiefSteal,fromRect:r?{left:r.left,top:r.top,width:r.width,height:r.height}:null};
  }
  syncEffEl($('#jo'),(S.pj||[]).filter(x=>x.o==1),effSpec);
  syncEffEl($('#jm'),(S.pj||[]).filter(x=>x.o==0),effSpec);
  const sl=$('#seal'),sc=(T!=21||low?' alt':'')+(low?' low':'')+(S.turn==0?' turn-me':' turn-op');
  if(!sl._o){sl._o=1;sl.addEventListener('animationend',()=>sl.classList.remove('stamp'))}
  if(sl._c!==sc){sl._c=sc;sl.className='seal'+sc+(sl.classList.contains('stamp')?' stamp':'')}
  setH('#seal',`<b>${low?tr('En az','Lowest'):T}</b>`);
  if(prevSeal&&prevSeal!=seal){sl.classList.remove('stamp');void sl.offsetWidth;sl.classList.add('stamp')}
  $('#me').className='zone'+(my?' act':'')+(S.winSide!=null?(S.winSide<0?' round-lose':S.winSide===0?' round-tie':''):'');
  const meZ=ensureZoneParts('#me',false);
  if(meZ){
    syncWhoBox(meZ.who,{side:0,avSrc:av0m.src,fp:av0m.fp,mo:av0m.mo,el:av0m.el,mCls:av0m.mCls,hpHtml:hpBtn0,hpMeta:hpMeta0,name:p0Name,sub:p0Sub,bust,exact,totLbl,onAvClick:isSpec?null:(e=>{e.stopPropagation();toggleEmoteMenu()})});
    const cCnt0=S.pl[0].open.length+S.pl[0].closed.length;
    const meSpecs=[
      ...S.pl[0].open.map(c=>mkCardSpec(c,false,false,false,false)).reverse(),
      {gap:true},
      ...S.pl[0].closed.map(c=>mkCardSpec(c,!(S.rev||c.o!=null||peek.has(c.id)),c.id==flipId,!!S.rev,true))
    ];
    syncCardsEl(meZ.cards,meSpecs,cCnt0);
  }
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
  const ends=(S.turns>0&&!S.acted)||!!PUZZLE_ACTIVE; // karşı taraf hamle yapmadan pas/süre bitirdiyse şimdi pas dersem tur biter
  $('#pass').disabled=isSpec||!(my&&!P);
  if(isSpec){
    $('#pass').style.display='none';
  }else{
    $('#pass').style.display='';
    $('#pass').textContent=ends?tr('Turu Bitir','End Round'):tr('Pas','Pass');$('#pass').className='btn sm'+(ends?'':' alt');
  }
  $('#hand').classList.toggle('joker-locked',!!(S.noJ&&S.noJ[0]));
  syncHandEl($('#hand'),S.hand[0]||[],isSpec,k,my,S);
  syncMobileHandPos();
  requestAnimationFrame(syncMobileHandPos);
  if(pendingThief)playThiefStealAnim(pendingThief);
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
  const dealMs=fly();flipId=null;
  const mt0=S.turn==0&&!S.wait;if(mt0&&!prevT&&!dealMs&&!entering)snd('turn');prevT=mt0;
  const last=S.log[S.log.length-1],lk=S.log.length+JSON.stringify(last);if(lk!=lastLk){lastLk=lk;if(last&&last.t=='pas dedi')snd('pass')}
  renderGameLog(S);
  if(typeof renderSpecSocialBar==='function')renderSpecSocialBar();
  if(MODE==='tutorial')tutApplyHighlights();
  if(MODE=='host'){
    if(conn&&conn.open)conn.send({k:'s',v:view(G),specCount:spectators.length,specNames:spectators.map(s=>s._specName||tr('Misafir','Guest'))});
  }
  if((MODE=='host'||MODE=='bot')&&spectators.length){
    const sv=specView(G);
    const sNames=spectators.map(s=>s._specName||tr('Misafir','Guest'));
    spectators.forEach(s=>{try{if(s.open)s.send({k:'s',v:sv,specCount:spectators.length,specNames:sNames})}catch(e){}});
  }
}
let glogOpen=false,glogLastSig='';
function renderGameLog(){const el=$('#glog');if(el)el.remove();}
function syncGlogMobileSize(){
  const ssb=document.getElementById('spec-social-bar');
  if(!ssb)return;
  if(window.innerWidth<=760){
    const tl=$('#hdr .hs.sks'),hc=$('#hdr .hc');
    const tr=tl?tl.getBoundingClientRect():null;
    const hr=hc?hc.getBoundingClientRect():null;
    const ref=(tr&&tr.width>40&&tr.height>16)?tr:hr;
    if(ref&&ref.width>40&&ref.height>16){
      ssb.style.left='6px';
      ssb.style.right='auto';
      ssb.style.top=Math.round(ref.bottom+5)+'px';
      ssb.style.width=Math.round(ref.width)+'px';
    }
  }else{
    ssb.style.left='';ssb.style.right='';ssb.style.top='';ssb.style.width='';
  }
}
window.addEventListener('resize',syncGlogMobileSize);
window.addEventListener('orientationchange',()=>setTimeout(syncGlogMobileSize,260));
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
function doPlay(id,pk){const S=G;P=null;if(typeof progressQuest==='function')progressQuest('jokers4',1);recMove(S,{t:'j',id,pk:[...(pk||[])]},`${tr('Joker','Joker')}: ${J[id]||id}`);if(MODE=='guest'){conn.send({k:'play',id,pk});return R()}S.graceLeft=0;lrnAct(S,'j',id);play(S,0,id,pk);S.acted=true;S.log.push({p:0,t:`joker oynadı: ${J[id]}`});note(0,id,()=>{if(MODE=='bot')talk('react',1,.5);R();if(MODE==='tutorial'&&tutStep===3)tutAdvance('joker')})}
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
function pick(v){if(MODE==='spectator')return;if(P&&P.hp==='u'){const id=v;P=null;return execSwapDeckHeroPower(0,id)}if(P&&P.hp==='a'){const id=v;P=null;return execAlchSwap(id)}if(P&&P.hp==='p'){const idx=v;P=null;if(!G||idx<0||idx>=G.hand[0].length)return R();snd('play');if(MODE==='guest'){G.hpUsed[0]=true;R();return conn.send({k:'hp_plague',idx})}execPlague(G,0,idx);return R()}P.pk.push(v);if(P.pk.length==P.ks.length)doPlay(P.id,P.pk);else R()}
function startJoker(id){if(MODE==='spectator')return;if(MODE==='tutorial'&&(tutStep!==3||id!==3))return;const ks=NEED[id]||[];if(ks.length){P={id,ks,pk:[]};R()}else doPlay(id,[])}
const HERO_FOCUS={c:'44% 28%',p:'56% 24%',n:'64% 25%',a:'50% 24%',s:'48% 25%',e:'52% 28%',m:'50% 30%',w:'45% 23%',l:'68% 28%',v:'50% 25%'};
function chooseHero(onPick,onCancel){
  lock=true;
  const cards=HEROES.filter(h=>!h.bossOnly).map(h=>{const dl=h.desc.length,dc=dl<=55?'hpc-desc-lg':dl<=105?'hpc-desc-md':'hpc-desc-sm';const mst=(typeof getHeroMastery==='function'&&typeof USER_ACC!=='undefined'&&USER_ACC)?getHeroMastery(USER_ACC,h.id):{tier:0,roman:'',w:0};return `<button class="hero-pick-card${MY_HERO===h.id?' sel':''}${mst.tier?` mastery-${mst.tier}`:''}" data-pick-hero="${h.id}">
    <div class="hpc-art">${mst.tier?`<span class="hpc-mst m${mst.tier}" title="${tr(`Ustalık ${mst.roman} (${mst.w} Zafer)`,`Mastery ${mst.roman} (${mst.w} Wins)`)}">${mst.roman}</span>`:''}<img class="hpc-av" src="${avSrc(h.id)}" alt="${h.name}" decoding="async" style="object-position:${HERO_FOCUS[h.id]||'50% 25%'};transform-origin:${HERO_FOCUS[h.id]||'50% 25%'}"></div>
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
  const pickRand=side=>{const pool=S.pl[side].open;if(!pool.length)return null;const i=Math.floor(Math.random()*pool.length);return{pool,i,c:pool[i]}};
  const r0=pickRand(0),r1=pickRand(1);
  const ids=[r0&&r0.c.id,r1&&r1.c.id].filter(Boolean);
  if(ids.length){
    playWolfClawFx(ids);
    if(MODE==='host'){
      if(conn&&conn.open)conn.send({k:'wolf_claw',ids});
      spectators.forEach(s=>{try{if(s.open)s.send({k:'wolf_claw',ids})}catch(e){}});
    }
  }else{
    snd('play');
  }
  const finish=()=>{
    if(S!==G)return;
    if(r0){const i=r0.pool.findIndex(x=>x.id===r0.c.id);if(i>=0)r0.pool.splice(i,1)}
    if(r1){const i=r1.pool.findIndex(x=>x.id===r1.c.id);if(i>=0)r1.pool.splice(i,1)}
    S.hpUsed=S.hpUsed||[false,false];S.hpUsed[p]=true;S.acted=true;S.graceLeft=0;
    const msg=ids.length===2?'Kanlı Dolunay kullandı (İki taraftan 1\'er açık kart imha edildi)':ids.length===1?'Kanlı Dolunay kullandı (1 açık kart imha edildi)':'Kanlı Dolunay kullandı (Masada açık sayı kartı yoktu)';
    S.log.push({p,t:msg});
    R();
    if(afterCb)afterCb();
  };
  setTimeout(finish,ids.length?360:120);
}
function useHeroPower(){
  const S=G;if(!S||S.over||S.wait||S.turn!==0||lock||P||(S.hpUsed&&S.hpUsed[0])||MODE==='tutorial'||MODE==='spectator')return;
  S.hpUsed=S.hpUsed||[false,false];
  const hid=avKey(S,0);
  if(hid==='c'){
    const wins=(S.cWins&&S.cWins[0])||0;
    if(wins<3)return box(`<h3>${tr('Zamanın İadesi','Rewind of Time')}</h3><p>${tr(`3 tur galibiyet elde ettiğinde aktifleşir. (Şu an: ${wins}/3)`,`Unlocks after winning 3 rounds. (Current: ${wins}/3)`)}</p>`);
    if(MODE==='guest'){S.cWins[0]=0;snd('flip');playHeroPowerAnim('c',0,HERO_MAP.c);R();return conn.send({k:'hp_rewind'})}
    execRewind(S,0);
  }else if(hid==='p'){
    if(!S.hand[0].length)return box(`<h3>${tr('Vebalı Takas','Plague Trade')}</h3><p>${tr('Elinde yakılacak Joker kartı yok.','You have no Joker cards in hand to burn.')}</p>`);
    const jLeft=S.jdeck?S.jdeck.length:(S.jdeckLen!=null?S.jdeckLen:1);
    if(jLeft<=0)return box(`<h3>${tr('Vebalı Takas','Plague Trade')}</h3><p>${tr('Joker destesinde çekilecek kart kalmadı.','No Joker cards left in the deck to draw.')}</p>`);
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
  const crestImgSrc=(won||isSpec)?'end_win_crest.png?v=20261123_wide2':'end_lose_crest.png?v=20261123_wide2';
  const eloRes=(!isSpec&&v===0&&MODE!=='tutorial'&&typeof recordMatchElo==='function')?recordMatchElo(S,won):null;
  let eloHtml='';
  if(eloRes){
    if(eloRes.unranked){
      const isG=isGuestUser(USER_ACC);
      const fl=!isG?(eloRes.afterLg||getAccountLeague(USER_ACC)):null;
      eloHtml=isG
        ?`<div class="end-elo-bar unranked">
          <div class="end-lg-mid">
            <b class="end-lg-name">${tr('Normal Oyun · Misafir','Normal Match · Guest')}</b>
            <small class="end-lg-sub">${tr('Misafir hesaplarda lig ve puan kaydedilmez','Guest accounts do not track leagues or points')}</small>
          </div>
        </div>`
        :`<div class="end-elo-bar unranked">
          <span class="end-lg-crest">${leagueCrestSvg(fl.id,30)}</span>
          <div class="end-lg-mid">
            <b class="end-lg-name">${tr('Normal Oyun','Normal Match')}</b>
            <small class="end-lg-sub">${tr('Derecesiz · Lig puanı etkilenmedi','Unranked · No League LP change')}</small>
          </div>
          <span class="end-elo-d">0 LP</span>
        </div>`;
    }else{
      const fl=eloRes.afterLg||getAccountLeague(USER_ACC);
      const cap=fl.lpCap||100;
      const pct=fl.id==='challenger'?100:Math.max(0,Math.min(100,Math.round((fl.lp/cap)*100)));
      const dSign=eloRes.lpDelta>0?'+':'';
      const dTxt=eloRes.placementMatch&&!won
        ?tr('0 LP (Koruma)','0 LP (Shield)')
        :(eloRes.shieldUsed?tr('0 LP (Koruma)','0 LP (Shield)'):`${dSign}${eloRes.lpDelta} LP`);
      const subParts=[];
      if(eloRes.placementMatch&&eloRes.placementMatch<5){
        subParts.push(tr(`Yerleştirme ${eloRes.placementMatch}/5 · Geçici Lig`,`Placement ${eloRes.placementMatch}/5 · Provisional`));
      }else if(eloRes.placementComplete){
        subParts.push(tr('5/5 Yerleştirme Tamamlandı!','5/5 Placements Complete!'));
      }else{
        subParts.push(fl.id==='challenger'?`${fl.lp} LP`:`${fl.lp} / ${cap} LP`);
      }
      if(won&&eloRes.speedBonus>=2)subParts.push(tr('Hızlı Zafer Bonusu','Fast Victory Bonus'));
      if(eloRes.demoted)subParts.push(tr('Küme Düşüldü','Demoted'));
      const promoBanner=(eloRes.doublePromoted||eloRes.promoted||eloRes.placementComplete)?`<div class="end-promo-banner ${fl.cls}${eloRes.doublePromoted?' dbl':''}">
        <div class="epb-crest">${leagueCrestSvg(fl.id,54)}</div>
        <div class="epb-txt">
          <span class="epb-kicker">${eloRes.doublePromoted?tr('Çifte Terfi! (+2 Küme)','Double Promotion! (+2 Divisions)'):(eloRes.placementComplete?tr('Ligin Belirlendi!','League Assigned!'):(eloRes.placementMatch===1?tr('Geçici Ligin Belirlendi!','Provisional League Set!'):tr('Lig Yükseldin!','Promoted!')))}</span>
          <b class="epb-rank">${escHtml(fl.name)}</b>
          ${(eloRes.beforeLg&&!eloRes.beforeLg.unranked&&eloRes.beforeLg.name!==fl.name)?`<small class="epb-from">${escHtml(eloRes.beforeLg.name)} → ${escHtml(fl.name)}</small>`:''}
        </div>
      </div>`:'';
      eloHtml=`${promoBanner}<div class="end-elo-bar ${fl.cls} ${eloRes.lpDelta>0?'pos':eloRes.lpDelta<0?'neg':'neu'}">
        <span class="end-lg-crest">${leagueCrestSvg(fl.id,36)}</span>
        <div class="end-lg-mid">
          <div class="end-lg-top"><b class="end-lg-name">${escHtml(fl.name)}${fl.provisional?` <em>${tr('Geçici','Prov.')}</em>`:''}</b><span class="end-elo-d">${dTxt}</span></div>
          <div class="end-lp-track"><i class="end-lp-fill" style="width:${pct}%;--lg-c1:${fl.c1}"></i></div>
          <small class="end-lg-sub">${subParts.join(' · ')}</small>
        </div>
      </div>`;
    }
  }
  const dcLg=eloRes?(eloRes.afterLg||getAccountLeague(USER_ACC)):(USER_ACC&&!USER_ACC.isGuest?getAccountLeague(USER_ACC):null);
  const dcLgTxt=dcLg?(dcLg.unranked?tr('Yerleştirme','Unranked'):dcLg.name):tr('Misafir','Guest');
  const dcLpD=(eloRes&&!eloRes.unranked&&eloRes.lpDelta)?` (${eloRes.lpDelta>0?'+':''}${eloRes.lpDelta} LP)`:'';
  LAST_DEATH_CARD={won,isSpec,heroId:featH,heroName:featNm,oppLabel:typeof getOppLabel==='function'?getOppLabel(S):tr('Rakip','Opponent'),rw,rl,rt,roll,th,leagueTxt:`${dcLgTxt}${dcLpD}`,playerName:(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.username)?USER_ACC.username:tr('Misafir','Guest'),durTxt};
  const guestCta=(!isSpec&&USER_ACC&&USER_ACC.isGuest)?`<button type="button" class="end-save-cta" id="end-save-guest"><span>${tr("İsmini kaydet, ligini ve başarımlarını koru","Save your name to keep your league & badges")}</span><b>${tr('Üye Ol','Sign Up')}</b></button>`:'';
  return `<div class="end-screen hs-victory ${isSpec?'spec':won?'win':'lose'}" data-res="${isSpec?'spec':won?'win':'lose'}">
    <div class="hs-crest-stage">
      <div class="hs-arch-frame">
        <img src="${avSrc(featH)}" alt="${featNm}">
      </div>
      <img class="hs-crest-img" src="${crestImgSrc}" alt="">
    </div>
    <div class="hs-wood-plaque"><span>${titleTxt}</span></div>
    ${eloHtml}
    <div class="end-stats hs-end-stats">
      <div class="end-stat" style="--d:0.12s"><span>${tr('Tur','Rounds')}</span><b>${rw}${tr('G','W')} · ${rl}${tr('M','L')}${rt?` · ${rt}${tr('B','T')}`:''}</b></div>
      <div class="end-stat" style="--d:0.20s"><span>${tr('Joker','Jokers')}</span><b>${mj} – ${oj}</b></div>
      <div class="end-stat" style="--d:0.28s"><span>${tr('Son D20','Final D20')}</span><b>${roll} / ${th}</b></div>
      <div class="end-stat" style="--d:0.36s"><span>${tr('Süre','Time')}</span><b>${durTxt}</b></div>
    </div>
    ${guestCta}
    <div class="end-acts row"></div>
  </div>`;
}
function box(html,close=true){lock=true;$('#mb').classList.remove('end-mode','an-mode','set-mode');$('#mb').innerHTML=html+(close?`<div class="row"><button id="pc" class="btn">${tr('Kapat','Close')}</button></div>`:'');$('#m').hidden=false;if(close)$('#pc').onclick=()=>{$('#m').hidden=true;lock=false;if(G)R()}}
/* ---------- BÜYÜK GÖRÜNÜM: karakter, sayı kartı, kapalı kart ---------- */
const HQ={};
function hq(key,cs,cb){let i=HQ[key];if(!i){i=HQ[key]=new Image();i.decoding='async';i._i=0;i.onload=()=>{try{i.decode&&i.decode().catch(()=>{})}catch(e){}};i.onerror=()=>{if(++i._i<cs.length)i.src=cs[i._i];else i._f=1};i.src=cs[0]}
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
  const cs=[`img/n/${n}.png?v=20261126_orig1`,`img/n/${n}.jpg?v=20261126_orig1`];
  hq('n_'+n+'_v3',cs,cb);
};
const backHD=cb=>{
  const cbKey=(typeof USER_ACC!=='undefined'&&USER_ACC&&USER_ACC.cardBack)||'classic';
  const equipped=(typeof CARDBACK_IMG_MAP!=='undefined'&&CARDBACK_IMG_MAP[cbKey])||'img/cb_classic.jpg?v=20261127_cb_rp1';
  hq('bk_'+cbKey+'_v6',[equipped,'img/cb_classic.jpg?v=20261127_cb_rp1'],cb);
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
    const cbKey=(typeof USER_ACC!=='undefined'&&USER_ACC&&USER_ACC.cardBack)||'classic';
    const initialSrc=(typeof CARDBACK_IMG_MAP!=='undefined'&&CARDBACK_IMG_MAP[cbKey])||IMG.bn;
    return zoom({src:initialSrc,cls:'card',cap:own?tr('Senin kapalı kartın','Your hidden card'):tr('Rakibin kapalı kartı','Opponent\'s hidden card'),hd:backHD,
      btn:own&&!S.rev?tr('Kartıma bak','Peek at card'):'',fn:()=>{snd('flip');peek.add(id);flipId=id;R();setTimeout(()=>zoomCard(id),80)}})}
  const val=c.o!=null?c.o:c.n;
  const initialSrc=IMG.n[c.n];
  zoom({src:initialSrc,cls:'card',cap:`${val}`,hd:numHD(c.n),
    sub:(closed?(own?tr('Senin kapalı kartın','Your hidden card'):tr('Rakibin kapalı kartı','Opponent\'s hidden card')):(own?tr('Senin açık kartın','Your open card'):tr('Rakibin açık kartın','Opponent\'s open card')))+(c.o!=null?tr(` (joker etkisiyle ${c.o} sayılıyor, kartın aslı ${c.n})`,` (counts as ${c.o} due to Joker effect, original value ${c.n})`):''),
    btn:closed&&own&&!S.rev?tr('Kartımı gizle','Hide card'):'',fn:()=>{snd('flip');peek.delete(id);flipId=id;R()}})}
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
      <li><b>Pas / Turu Bitir:</b> Kart çekmeden, joker oynamadan ve aktif güç kullanmadan pas dersen düğme <b>Turu Bitir</b> olur ve kapalı kartlar açılır (ilk tur hamlesi hariç).</li>
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
  if(spans[0])spans[0].textContent=tr('Çevrim İçi','Online');
  if(spans[1])spans[1].textContent=tr('Yapay Zekaya Karşı','VS AI');
  const dEasy=$('#mb2 .d[data-d="easy"]'),dMed=$('#mb2 .d[data-d="med"]'),dHard=$('#mb2 .d[data-d="hard"]'),dImp=$('#mb2 .d[data-d="imp"]');
  if(dEasy)dEasy.textContent=tr('Kolay','Easy');
  if(dMed)dMed.textContent=tr('Orta','Medium');
  if(dHard)dHard.textContent=tr('Zor','Hard');
  if(dImp)dImp.textContent=tr('İmkansız','Impossible');
  if($('#b2'))$('#b2').textContent=tr('Özel Oyun Oluştur','Create Private Match');
  if($('#bqm'))$('#bqm').textContent=tr('Hızlı Maç Ara','Find Quick Match');
  if($('#code'))$('#code').placeholder=tr('Oda Kodu','Room Code');
  if($('#b3'))$('#b3').textContent=tr('Özel Oyuna Katıl','Join Private Match');
  if($('#b6'))$('#b6').textContent=tr('Ayarlar','Settings');
  if($('#dock-tut-t'))$('#dock-tut-t').textContent=tr('Eğitim','Tutorial');
  if($('#b-vault'))$('#b-vault').textContent=tr('Ölüm Mahzeni','Death Vault');
  if($('#b-cursed'))$('#b-cursed').textContent=tr('Lanetli Masa','Cursed Table');
  if($('#b-puzzle'))$('#b-puzzle').textContent=tr('Günün Bulmacası','Daily Puzzle');
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
  const confirmLeaveMatch=(onYes)=>{
    if(!G||G.over||MODE==='tutorial'||MODE==='spectator'){onYes();return}
    const loss=(typeof peekLossElo==='function')?peekLossElo(G):0;
    const eloWarn=loss<0
      ?`<p class="leave-elo-warn">${loss===-1
        ?tr('Bu bir <b>Dereceli Yerleştirme</b> maçı. Şimdi ayrılırsan mağlubiyet sayılacak.','This is a <b>Ranked Placement</b> match. Leaving now counts as a defeat.')
        :tr(`Bu dereceli bir maç. Şimdi ayrılırsan mağlubiyet sayılacak ve yaklaşık <b>${loss} LP</b> kaybedeceksin.`,`This is a ranked match. Leaving now counts as a defeat and you will lose roughly <b>${loss} LP</b>.`)}</p>`
      :'';
    box(`<h3>${tr('Aktif Oyundan Ayrıl','Leave Active Match')}</h3>
      <p>${tr('Aktif bir oyundasın. Ayrılmak istediğine emin misin?','You are currently in an active match. Are you sure you want to leave?')}</p>
      ${eloWarn}
      <div class="row" style="margin-top:12px">
        <button type="button" id="lv-stay" class="btn alt">${tr('Oyuna Dön','Return to Match')}</button>
        <button type="button" id="lv-go" class="btn">${tr('Ayrıl','Leave')}</button>
      </div>`, false);
    if($('#lv-stay'))$('#lv-stay').onclick=()=>{snd('click');$('#m').hidden=true;lock=false;if(G)R()};
    if($('#lv-go'))$('#lv-go').onclick=()=>{
      snd('click');
      if(G&&!G.over&&loss<0&&typeof recordMatchElo==='function'){
        recordMatchElo(G,false);
      }
      onYes();
    };
  };
  if($('#sa'))$('#sa').onclick=()=>confirmLeaveMatch(()=>{
    botGen++;thinkOn=false;const c=$('#cast');if(c)c.remove();$('#mb').classList.remove('set-mode');$('#m').hidden=true;lock=false;P=null;
    if(G)G.over=true;chooseHero(hid=>{MY_HERO=hid;start()},()=>settings('gameplay'));
  });
  if($('#sx'))$('#sx').onclick=()=>confirmLeaveMatch(exitGame);
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
  if(G.over){ // oyun zaten bitmişti: sonuç penceresi kalsın, zar henüz dönmediyse hemen döndür
    const mb=$('#mb');
    if(!$('#m').hidden&&mb){
      if(mb.querySelector('.d20-box:not(.finished)')&&window._triggerD20Roll)window._triggerD20Roll();
      const o=$('#mo');if(o){const br=o.previousElementSibling;o.remove();if(br&&br.tagName=='BR')br.remove()}
      if(!mb.querySelector('.pl'))mb.insertAdjacentHTML('afterbegin',`<div class="pn pl">${msg}</div>`);
      if(!$('#mx')){mb.insertAdjacentHTML('beforeend',`<br><br><button id="mx" class="btn alt">${tr('Ana Menüye Dön','Return to Main Menu')}</button>`);$('#mx').onclick=exitGame}
      lock=true;return}
  }
  G.over=true;botGen++;thinkOn=false;waitM=false;
  M(`${msg}<br><b>${tr('Oyunu sen kazandın.','You won the game.')}</b>`,null,null,true);snd('win');
}
function exitGame(){ // limbigames perdesi, sonra ilk ekrana dön
  if(entering)return;entering=true;leaving=true;botGen++;thinkOn=false;
  tutClear();
  const c=$('#cast');if(c)c.remove();$('#m').hidden=true;lock=true;P=null;
  veil(1600);
  setTimeout(()=>{
    try{if(conn)conn.close()}catch(e){}
    try{spectators.forEach(s=>{try{s.close()}catch(err){}})}catch(e){}
    try{if(peer)peer.destroy()}catch(e){}
    if(typeof stopBotSpectateHost==='function')stopBotSpectateHost();
    conn=null;spectators=[];peer=null;waitM=false;specCount=0;specNames=[];CURRENT_HOST_CODE='';LAST_JOIN_CODE='';
    if(typeof clearReconnectGrace==='function')clearReconnectGrace();
    if(typeof clearActiveMatchSnapshot==='function')clearActiveMatchSnapshot();
    if(typeof cancelQuickMatch==='function')cancelQuickMatch(true);
    if(G)G.over=true;G=null;MODE='bot';CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;KING_TABLE=false;KING_QUEUE=[];KING_STREAK=0;SPEC_VOTES=[0,0];MY_SPEC_VOTE=-1;if(typeof renderSpecSocialBar==='function')renderSpecSocialBar();sayT='';try{document.body.classList.remove('dead')}catch(e){}
    st('');$('#menu').hidden=false;lock=false;setMusic('menu');
    if(typeof updateLobbyPresence==='function')updateLobbyPresence(false);
  },460);
  setTimeout(()=>{entering=false},1480);
}
function syncMobileHandPos(){
  const handEl=document.getElementById('hand');
  if(!handEl)return;
  if(window.innerWidth>760){
    if(handEl.style.getPropertyValue('--mob-hand-b'))handEl.style.removeProperty('--mob-hand-b');
    return;
  }
  const av=document.querySelector('#me .who .av');
  const slot=handEl.querySelector('.jslot');
  if(!av||!slot)return;
  const H=document.documentElement.clientHeight||window.innerHeight;
  const avB=av.getBoundingClientRect().bottom;
  const slotH=slot.getBoundingClientRect().height;
  if(!avB||!slotH||avB>=H)return;
  const visH=slotH+5;
  const free=H-avB-visH;
  const bPx=Math.max(2,Math.min(26,Math.round(free*0.44)));
  const val=bPx+'px';
  if(handEl.style.getPropertyValue('--mob-hand-b')!==val)handEl.style.setProperty('--mob-hand-b',val);
}
window.addEventListener('resize',syncMobileHandPos);
if(window.visualViewport)window.visualViewport.addEventListener('resize',syncMobileHandPos);
/* ---------- MOBİL JOKER YELPAZESİ ---------- */
let _mf=null;
function mfCanPlay(id){const S=G;return !!(S&&!S.over&&!lock&&!P&&S.turn===0&&!S.wait&&MODE!=='spectator'&&playable(S,0,id)&&(MODE!=='tutorial'||(tutStep===3&&id===3)));}
function closeMobileFan(){
  if(!_mf)return;
  const f=_mf;_mf=null;
  cancelAnimationFrame(f.raf);clearInterval(f.watch);
  document.body.classList.remove('mob-fan-open');
  if(window.clearOracleForJoker)window.clearOracleForJoker();
  f.root.classList.add('closing');
  setTimeout(()=>f.root.remove(),180);
}
function openMobileFan(startIdx){
  const S=G;
  if(!S||S.over||MODE==='spectator'||_mf)return;
  if(!$('#m').hidden)return;
  const handEls=[...document.querySelectorAll('#hand .j[data-j]')];
  if(!handEls.length)return;
  const ids=handEls.map(el=>+el.dataset.j);
  const sig=ids.join(',');
  const root=document.createElement('div');root.id='mob-fan';
  const track=document.createElement('div');track.className='mf-track';root.appendChild(track);
  const ora=document.createElement('div');ora.className='mf-ora';track.appendChild(ora);
  const cards=ids.map((id,i)=>{const im=document.createElement('img');im.className='mf-card'+(mfCanPlay(id)?'':' mf-dim');im.draggable=false;im.alt='';im.src=handEls[i].currentSrc||handEls[i].src||IMG.j[id];hi(im,id);track.appendChild(im);return im;});
  document.body.appendChild(root);
  document.body.classList.add('mob-fan-open');
  const n=ids.length,clampI=v=>Math.max(0,Math.min(n-1,v));
  const computeCardW=()=>{
    const H=document.documentElement.clientHeight||window.innerHeight;
    const W=document.documentElement.clientWidth||window.innerWidth;
    const bottomPad=6;
    const whoEl=document.querySelector('#me .who');
    const sealEl=document.getElementById('seal');
    let maxCardH=H*0.31;
    if(whoEl){
      const wr=whoEl.getBoundingClientRect();
      const sr=sealEl?sealEl.getBoundingClientRect():null;
      const sealSafe=sr&&sr.bottom>0?(sr.bottom+70):0;
      const ceilY=Math.max(sealSafe,wr.top+2);
      maxCardH=H-bottomPad-ceilY;
    }
    const cw=Math.round(Math.max(100,Math.min(W*0.40,156,maxCardH/1.5)));
    root.style.setProperty('--mfcw',cw+'px');
    return cw;
  };
  let curCardW=computeCardW();
  const f=_mf={root,ora,cards,ids,handEls,pos:clampI(Number.isFinite(startIdx)?startIdx:0),target:0,lift:0,liftTarget:0,mode:null,raf:0,watch:0,openedAt:performance.now(),oracleIdx:-1};
  f.target=f.pos;
  const spacing=()=>Math.min(window.innerWidth*0.25,Math.round(curCardW*0.68));
  function syncOra(){
    const t=document.querySelector('#me .who .ora-tot'),s=document.querySelector('#fx .seal .ora-seal, #seal .ora-seal');
    const curB=document.querySelector('#me .who .tot b');
    const curTxt=curB?curB.textContent.trim():'';
    let h='';
    if(t){
      const cls=t.classList.contains('ora-exact')?'ora-exact':t.classList.contains('ora-bust')?'ora-bust':'';
      h+=`<span class="${cls}">${tr('Toplam','Total')}: ${curTxt?curTxt+' ':''}${t.textContent}</span>`;
    }
    if(s)h+=`<span>${tr('Mühür','Seal')} ${s.textContent}</span>`;
    ora.innerHTML=h;ora.classList.toggle('on',!!h);
  }
  function layout(){
    const sp=spacing();
    for(let i=0;i<n;i++){
      const d=i-f.pos,ad=Math.abs(d);
      const isC=i===Math.round(f.pos);
      const x=d*sp, y=ad*ad*6+ad*9 + (isC?f.lift:0);
      const rot=d*9.5, sc=Math.max(0.66,1-Math.min(ad,2.5)*0.13)*(isC&&f.lift<0?1+Math.min(-f.lift/520,0.08):1);
      const c=cards[i];
      c.style.transform=`translate3d(calc(-50% + ${x.toFixed(1)}px), ${y.toFixed(1)}px, 0) rotate(${(isC&&f.lift<0?0:rot).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      c.style.zIndex=String(100-Math.round(ad*10));
      c.style.opacity=ad>2.6?'0':'1';
      c.classList.toggle('mf-center',isC);
    }
  }
  function tick(){
    if(!_mf)return;
    if(f.mode!=='swipe'){f.pos+=(f.target-f.pos)*0.22;if(Math.abs(f.target-f.pos)<0.002)f.pos=f.target;}
    if(f.mode!=='lift'){f.lift+=(0-f.lift)*0.25;if(Math.abs(f.lift)<0.3)f.lift=0;}
    layout();
    const ci=Math.round(f.pos);
    if(f.mode!=='swipe'&&f.pos===f.target&&f.oracleIdx!==ci){f.oracleIdx=ci;if(window.updateOracleForJoker)window.updateOracleForJoker(handEls[ci]);syncOra();}
    f.raf=requestAnimationFrame(tick);
  }
  let sx=0,sy=0,sPos=0,lastX=0,lastT=0,vel=0,pid=null,downCard=-1;
  root.addEventListener('pointerdown',e=>{
    e.preventDefault();e.stopPropagation();
    pid=e.pointerId;try{root.setPointerCapture(pid)}catch(err){}
    sx=lastX=e.clientX;sy=e.clientY;sPos=f.pos;lastT=performance.now();vel=0;f.mode=null;
    downCard=cards.indexOf(e.target);
  });
  root.addEventListener('pointermove',e=>{
    if(e.pointerId!==pid)return;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    if(!f.mode&&Math.hypot(dx,dy)>8){
      const ci=Math.round(f.pos);
      if(dy<0&&Math.abs(dy)>Math.abs(dx)&&downCard===ci&&mfCanPlay(ids[ci])){f.mode='lift';f.target=ci;f.pos=ci;ora.classList.remove('on');}
      else f.mode='swipe';
      if(f.mode==='swipe'){if(f.oracleIdx!==-1){f.oracleIdx=-1;if(window.clearOracleForJoker)window.clearOracleForJoker();}ora.classList.remove('on');}
    }
    if(f.mode==='swipe'){
      const now=performance.now();vel=(e.clientX-lastX)/Math.max(1,now-lastT);lastX=e.clientX;lastT=now;
      let p=sPos-dx/spacing();
      if(p<0)p=p*0.35; if(p>n-1)p=(n-1)+(p-(n-1))*0.35;
      f.pos=p;
    }else if(f.mode==='lift'){
      f.lift=Math.min(0,dy);
      cards[Math.round(f.pos)].classList.toggle('mf-ready',e.clientY<window.innerHeight*0.5);
    }
  });
  function up(e,cancel){
    if(e.pointerId!==pid)return;pid=null;
    const mode=f.mode;f.mode=null;
    if(mode==='swipe'){
      let t=Math.round(f.pos - (Math.abs(vel)>0.45?Math.sign(vel)*0.6:0));
      f.target=clampI(t);
    }else if(mode==='lift'){
      const ci=Math.round(f.pos),id=ids[ci];
      cards[ci].classList.remove('mf-ready');
      if(!cancel&&e.clientY<window.innerHeight*0.5&&mfCanPlay(id)){closeMobileFan();startJoker(id);return;}
      f.oracleIdx=-1;
    }else if(!cancel){
      if(performance.now()-f.openedAt<350)return;
      if(downCard>=0&&downCard!==Math.round(f.pos)){f.target=downCard;return;}
      if(downCard<0)closeMobileFan();
    }
  }
  root.addEventListener('pointerup',e=>up(e,false));
  root.addEventListener('pointercancel',e=>up(e,true));
  f.watch=setInterval(()=>{
    const cur=[...document.querySelectorAll('#hand .j[data-j]')].map(el=>el.dataset.j).join(',');
    if(!G||G.over||!$('#m').hidden||cur!==sig||P)closeMobileFan();
  },250);
  layout();
  f.raf=requestAnimationFrame(tick);
}
document.addEventListener('click',e=>{
  const jClick=e.target.closest&&e.target.closest('#hand .j[data-j]');
  if(!jClick&&!window._suppressJokerClick){
    document.querySelectorAll('#hand .j.pinned').forEach(el=>el.classList.remove('pinned'));
    if(window.clearOracleForJoker)window.clearOracleForJoker();
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
      const cw=hid==='c'?Math.min(3,(S.cWins&&S.cWins[side])||0):0;
      const tagTxt=hid==='c'?tr(`Aktif · Galibiyet: ${cw}/3`,`Active · Wins: ${cw}/3`):(h.passive?tr('Pasif','Passive'):tr('Aktif','Active'));
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
      openMobileFan(+t.dataset.jidx);
      return;
    }
    // Masaüstünde tıklayarak joker oynanmaz; basılı tutup masaya sürükleyerek oynanır
    return;
  }
});
function drawFromDeck(){if(MODE==='spectator')return;const S=G;if(!S||S.turn||lock||P||!canDraw(S,0))return;if(MODE==='tutorial'&&tutStep!==2)return;recMove(S,{t:'d'},tr('Kart Çek','Draw Card'));if(MODE=='guest'){snd('draw');return conn.send({k:'draw'})}S.graceLeft=0;lrnAct(S,'d');if(S.botScry&&S.botScry.length)S.botScry.shift();const c=S.deck.pop();S.pl[0].open.push(c);if(S.stats&&S.stats.draws)S.stats.draws[0]++;S.acted=true;S.log.push({p:0,t:`kart çekti (${c.n})`});R();if(MODE==='tutorial'&&tutStep===2)tutAdvance('draw')}
$('#pass').onclick=()=>{if(MODE==='spectator')return;if(G.turn==0&&!lock&&!P){if(MODE==='tutorial'&&tutStep!==7)return;recMove(G,null,$('#pass').textContent||tr('Pas','Pass'));if(MODE=='guest')conn.send({k:'pass'});else{lrnAct(G,'p');pass();if(MODE==='tutorial'&&tutStep===7)tutClearHighlights()}}};

/* ---------- ONLINE (PeerJS) ---------- */
let MODE='bot',peer,conn,spectators=[],specCount=0,specNames=[],waitM=false,rematchReady=[false,false],rematchHeroes=[null,null],deathContReady=[false,false],deathContGo=null;
let OPP_PROFILE={name:'',elo:1200,isGuest:true};
function sendMyProfile(c){
  if(!c||!c.open)return;
  const acc=(typeof USER_ACC!=='undefined'&&USER_ACC)?USER_ACC:null;
  const guest=isGuestUser(acc);
  const name=(!guest&&acc.username)?acc.username:tr('Misafir','Guest');
  const elo=(!guest&&typeof acc.elo==='number')?Math.round(acc.elo):1200;
  const fl=(!guest&&typeof getAccountLeague==='function')?getAccountLeague(acc):null;
  const leagueName=fl?(fl.unranked?tr('Derecesiz','Unranked'):fl.name):'';
  const leagueId=fl?fl.id:'guest';
  try{c.send({k:'profile',name,elo,leagueName,leagueId,queueMode:guest?'normal':QUEUE_MODE,isGuest:guest})}catch(e){}
}
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
  box(`<h3>${tr('Hazırsın','Ready')}</h3><p>${msg}</p><div class="row"><button id="rm-exit" class="btn alt">${tr('Ana Menüye Dön','Return to Main Menu')}</button></div>`,false);
  const ex=$('#rm-exit');if(ex)ex.onclick=exitGame;
}
function checkStartOnlineRematch(){
  if(rematchReady[0]&&rematchReady[1]){
    MY_HERO=rematchHeroes[0]||MY_HERO;
    OPP_HERO=rematchHeroes[1]||OPP_HERO;
    rematchReady=[false,false];rematchHeroes=[null,null];
    $('#m').hidden=true;lock=false;start();
  }else if(rematchReady[0]){
    showRematchWait(tr('Rakibin "Yeniden Oyna" demesi ve kahraman seçmesi bekleniyor…','Waiting for opponent to click "Play Again" and choose a hero…'));
  }
}
const MAX_SPECTATORS = 5;
function view(S){ // rakibe gidecek, gizli bilgisi temizlenmiş ve aynalanmış durum
  const f=a=>[a[1],a[0]],pk1=S.oppPeek1||[];
  const hu0=S.hpUsed?!!S.hpUsed[0]:false,hu1=S.hpUsed?!!S.hpUsed[1]:false;
  const visHu0=(avKey(S,0)==='w'||avKey(S,0)==='a')?false:hu0;
  return {av:f(S.av),hero:S.hero?f(S.hero):f(S.av),hpUsed:[hu1,visHu0],hpMod:S.hpMod?f(S.hpMod):[0,0],plagueMod:S.plagueMod?f(S.plagueMod):[0,0],hpTgMod:S.hpTgMod||0,uRevived:S.uRevived?f(S.uRevived):[false,false],vampUsed:S.vampUsed?f(S.vampUsed):[false,false],cWins:S.cWins?f(S.cWins):[0,0],vampBurn:S.vampBurn?{vamp:1-S.vampBurn.vamp,victim:1-S.vampBurn.victim,idx:S.vampBurn.idx,jid:S.vampBurn.jid}:null,thiefSteal:S.thiefSteal?{...S.thiefSteal,thief:1-S.thiefSteal.thief}:null,oppPeek:pk1,mast:f(S.mast),turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,reconnPause:!!S.reconnPause,turn:1-S.turn,clocks:S.clocks?f(S.clocks):[ONLINE_CLOCK_INIT,ONLINE_CLOCK_INIT],clockMax:S.clockMax||ONLINE_CLOCK_INIT,graceLeft:S.graceLeft||0,timeOut:S.timeOut?f(S.timeOut):[false,false],hadTimeout:!!S.hadTimeout,pts:f(S.pts),rev:S.rev,winSide:S.winSide==null?null:-S.winSide,res:(S.res||[]).map(x=>-x),jUsed:f(S.jUsed),jTurn:S.jTurn?f(S.jTurn):[0,0],noJ:f(S.noJ),
    hand:[S.hand[1],S.hand[0].map(()=>0)],jdeckLen:(S.jdeck&&S.jdeck.length)||0,deck:S.deck.map(()=>({id:0,n:0})),
    pl:[S.pl[1],{open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:(S.rev||pk1.includes(c.id))?c.n:0,o:c.o,hpImmune:!!c.hpImmune}))}],
    eff:S.eff.map(e=>({...e,o:1-e.o})),pj:(S.pj||[]).map(e=>({...e,o:1-e.o})),log:S.log.filter(l=>!(l.p===0&&/Kuzgunun Kehaneti|Yitik Yazgı/.test(l.t||''))).slice(-30).map(l=>({...l,p:l.p<0?-1:1-l.p}))};
}
function specView(S){ // izleyicilere gidecek durum: izlenen oyuncunun (0) gözünden canlı görünüm (kendi eli + kapalı kartı bakılabilir, rakip kapalı kartı gizli)
  const pk0=S.oppPeek0||[];
  const myFl=(typeof getAccountLeague==='function'&&typeof USER_ACC!=='undefined'&&USER_ACC)?getAccountLeague(USER_ACC):null;
  const myNm=(typeof USER_ACC!=='undefined'&&USER_ACC&&!USER_ACC.isGuest&&USER_ACC.username)?USER_ACC.username:tr('Misafir','Guest');
  const mySub=myFl?`${myNm} · ${myFl.unranked?tr('Derecesiz','Unranked'):myFl.name}`:myNm;
  const botNm=DIFF==='easy'?tr('Kolay Seviye Bot','Easy Level Bot'):DIFF==='med'?tr('Orta Seviye Bot','Medium Level Bot'):DIFF==='hard'?tr('Zor Seviye Bot','Hard Level Bot'):tr('İmkansız Seviye Bot','Impossible Level Bot');
  const oppNm=MODE==='bot'?botNm:((OPP_PROFILE&&OPP_PROFILE.name)?OPP_PROFILE.name:tr('Rakip','Opponent'));
  const oppLg=(OPP_PROFILE&&OPP_PROFILE.leagueName)?OPP_PROFILE.leagueName:'';
  const oppSub=MODE==='bot'?botNm:(oppLg?`${oppNm} · ${oppLg}`:oppNm);
  return {
    av:[S.av[0],S.av[1]],hero:S.hero?[...S.hero]:[S.av[0],S.av[1]],hpUsed:S.hpUsed?[...S.hpUsed]:[false,false],hpMod:S.hpMod?[...S.hpMod]:[0,0],plagueMod:S.plagueMod?[...S.plagueMod]:[0,0],hpTgMod:S.hpTgMod||0,uRevived:S.uRevived?[...S.uRevived]:[false,false],vampUsed:S.vampUsed?[...S.vampUsed]:[false,false],cWins:S.cWins?[...S.cWins]:[0,0],vampBurn:S.vampBurn?{...S.vampBurn}:null,thiefSteal:S.thiefSteal?{...S.thiefSteal}:null,oppPeek:[...pk0],mast:[S.mast[0],S.mast[1]],turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,reconnPause:!!S.reconnPause,turn:S.turn,clocks:S.clocks?[...S.clocks]:[ONLINE_CLOCK_INIT,ONLINE_CLOCK_INIT],clockMax:S.clockMax||ONLINE_CLOCK_INIT,graceLeft:S.graceLeft||0,timeOut:S.timeOut?[...S.timeOut]:[false,false],hadTimeout:!!S.hadTimeout,pts:S.pts,rev:S.rev,winSide:S.winSide,res:S.res,jUsed:S.jUsed,jTurn:S.jTurn?[...S.jTurn]:[0,0],noJ:S.noJ,
    hand:[S.hand[0].slice(),S.hand[1].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[
      {open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:c.n,o:c.o,hpImmune:!!c.hpImmune}))},
      {open:S.pl[1].open,closed:S.pl[1].closed.map(c=>({id:c.id,n:(S.rev||pk0.includes(c.id))?c.n:0,o:c.o,hpImmune:!!c.hpImmune}))}
    ],
    specMeta:{p0Name:myNm,p0Sub:mySub,p1Name:oppNm,p1Sub:oppSub},
    eff:S.eff.map(e=>({...e})),pj:(S.pj||[]).map(e=>({...e})),log:S.log.slice(-30).map(l=>({...l}))
  };
}
function note(p,id,cb){
  if(MODE=='host'){
    if(conn&&conn.open)conn.send({k:'j',p:1-p,id});
    spectators.forEach(s=>{try{if(s.open)s.send({k:'j',p,id})}catch(e){}});
    R();
  }else if(MODE=='bot'&&spectators.length){
    spectators.forEach(s=>{try{if(s.open)s.send({k:'j',p,id})}catch(e){}});
  }
  cast(p,id,cb);
}
let draftActive=false,draftTimer=null,draftPicked=[false,false],draftHeroes=[null,null];
let IS_QUICK_MATCH=false,matchFoundActive=false,matchFoundTimer=null;
const DRAFT_TIMEOUT_MS=60000;
function clearMatchFound(){
  matchFoundActive=false;
  if(matchFoundTimer){clearInterval(matchFoundTimer);matchFoundTimer=null;}
}
function clearOnlineDraft(){
  clearMatchFound();
  draftActive=false;
  draftPicked=[false,false];
  draftHeroes=[null,null];
  if(draftTimer){clearTimeout(draftTimer);draftTimer=null;}
}
function abortOnlineDraft(msg,notifyKey){
  clearOnlineDraft();
  IS_QUICK_MATCH=false;
  try{if(notifyKey&&conn&&conn.open)conn.send({k:notifyKey});}catch(e){}
  try{if(typeof cancelQuickMatch==='function')cancelQuickMatch(false);}catch(e){}
  try{if(typeof clearOutgoingInvite==='function')clearOutgoingInvite(null);}catch(e){}
  try{if(conn)conn.close();}catch(e){}
  try{if(peer)peer.destroy();}catch(e){}
  conn=null;peer=null;spectators=[];MODE='bot';
  const menuEl=$('#menu');if(menuEl)menuEl.hidden=false;
  setMusic('menu');
  if(msg){
    st(msg);
    box(`<h3>${tr('Kahraman Seçimi','Hero Selection')}</h3><p>${escHtml(msg)}</p>`,true);
  }else{
    $('#m').hidden=true;lock=false;st('');
  }
}
function showQuickMatchFound(isHost,oppName,oppElo,secs=10){
  clearOnlineDraft();
  matchFoundActive=true;
  IS_QUICK_MATCH=false;
  const myGuest=isGuestUser(USER_ACC);
  const myName=(!myGuest&&USER_ACC&&USER_ACC.username)?USER_ACC.username:tr('Misafir','Guest');
  const myFl=USER_ACC?getAccountLeague(USER_ACC):null;
  const myLgLabel=myFl?(myFl.unranked?tr('Derecesiz','Unranked'):myFl.name):tr('Misafir','Guest');
  const oName=String(oppName||tr('Misafir','Guest')).slice(0,22);
  const oGuest=oName===tr('Misafir','Guest');
  const oElo=Math.max(400,Math.min(4000,Math.round(+oppElo||1200)));
  const oLg=oGuest?{name:tr('Misafir','Guest'),id:'guest'}:eloRank(oElo);
  OPP_PROFILE={name:oName,elo:oElo,leagueName:oGuest?'':oLg.name,leagueId:oLg.id,isGuest:oGuest};
  let left=Math.max(1,secs|0);
  try{snd('turn');}catch(e){}
  st('');
  box(`<div class="qm-found-box">
    <h3 class="qm-found-title">${tr(`${escHtml(oName)} ile eşleştin!`,`Matched with ${escHtml(oName)}!`)}</h3>
    <p class="qm-found-sub">${QUEUE_MODE==='ranked'?tr('Dereceli · Kahraman seçim ekranına gidiliyor.','Ranked · Heading to hero selection.'):tr('Normal Oyun · Kahraman seçim ekranına gidiliyor.','Normal Game · Heading to hero selection.')}</p>
    <div class="qm-vs-stack">
      <div class="qm-vs-card me">
        <b class="qm-vs-name">${escHtml(myName)}</b>
        <span class="qm-vs-elo">${escHtml(myLgLabel)}</span>
      </div>
      <div class="qm-vs-sep"><span>VS</span></div>
      <div class="qm-vs-card opp">
        <b class="qm-vs-name">${escHtml(oName)}</b>
        <span class="qm-vs-elo">${escHtml(oLg.name)}</span>
      </div>
    </div>
    <div class="qm-vs-cd"><b id="qm-cd-num">${left}</b><span>${tr('saniye','seconds')}</span></div>
  </div>`,false);
  matchFoundTimer=setInterval(()=>{
    if(!matchFoundActive){clearMatchFound();return;}
    left--;
    const numEl=$('#qm-cd-num');
    if(numEl&&left>=0)numEl.textContent=String(left);
    if(left<=0){
      clearMatchFound();
      startOnlineHeroDraft(isHost);
    }
  },1000);
}
function showDraftWaitBox(){
  box(`<div class="lobby-box">
    <h3 style="margin-bottom:8px">${tr('Kahraman Seçildi','Hero Selected')}</h3>
    <div class="lobby-spinner"><i></i><i></i><i></i></div>
    <p id="lobbyStatus" style="font-size:17px;color:#a0b8a4;margin-top:12px">${tr('Rakibin kahraman seçmesi bekleniyor…','Waiting for opponent to choose a hero…')}</p>
  </div>`,true);
  const pc=$('#pc');
  if(pc){
    pc.textContent=tr('Vazgeç','Cancel');
    pc.onclick=()=>abortOnlineDraft('','draft_cancel');
  }
}
function finishOnlineDraft(){
  if(!draftActive)return;
  MY_HERO=draftHeroes[0]||'c';
  OPP_HERO=draftHeroes[1]||'c';
  clearOnlineDraft();
  try{if(conn&&conn.open)conn.send({k:'role',role:'player'});}catch(e){}
  $('#m').hidden=true;lock=false;
  enter(start);
}
function startOnlineHeroDraft(isHost){
  clearOnlineDraft();
  draftActive=true;
  st('');
  draftTimer=setTimeout(()=>{
    if(!draftActive)return;
    abortOnlineDraft(tr('Kahraman seçimi zaman aşımına uğradı.','Hero selection timed out.'),'draft_timeout');
  },DRAFT_TIMEOUT_MS);
  chooseHero(h=>{
    if(!draftActive)return;
    MY_HERO=h;
    if(isHost){
      draftPicked[0]=true;draftHeroes[0]=h;
      if(draftPicked[1]){finishOnlineDraft();return;}
      showDraftWaitBox();
    }else{
      draftPicked[0]=true;draftHeroes[0]=h;
      if(conn&&conn.open)conn.send({k:'draft_pick',hero:h});
      showDraftWaitBox();
    }
  },()=>{
    if(draftActive)abortOnlineDraft('','draft_cancel');
  });
}
function onGuest(m, fromConn){ // host: misafirin istekleri veya izleyiciden gelen mesajlar
  if(m.k=='query_slots'){
    const guestBusy = !!(conn && conn.open);
    fromConn.send({
      k: 'slots_info',
      slots: {
        p0: { name: tr('1. Oyuncu','Player 1'), hero: MY_HERO||'t', role: '', busy: true },
        p1: { name: tr('2. Oyuncu','Player 2'), hero: guestBusy?(OPP_HERO||'c'):'c', role: '', busy: guestBusy }
      },
      specCount: spectators.length
    });
    return;
  }
  if(m.k=='reconnect'){
    if(G&&!G.over&&MODE==='host'){
      clearReconnectGrace();
      conn=fromConn;
      fromConn._role='player';
      fromConn.on('close',()=>startReconnectGrace(true,tr('Rakip oyundan ayrıldı.','Opponent left the game.')));
      fromConn.send({k:'role',role:'player'});
      fromConn.send({k:'s',v:pub(G,1),specCount:spectators.length});
      R();
    }
    return;
  }
  if(m.k=='join_as'){
    if(m.role=='player'){
      if(!conn || !conn.open){
        conn = fromConn;
        fromConn._role = 'player';
        const isQM=!!(m.quickMatch||IS_QUICK_MATCH);
        try{if(typeof cancelQuickMatch==='function')cancelQuickMatch(true);}catch(e){}
        try{if(typeof clearOutgoingInvite==='function')clearOutgoingInvite(null);}catch(e){}
        fromConn.on('close',()=>{
          if(matchFoundActive){abortOnlineDraft(tr('Rakip eşleşmeden ayrıldı.','Opponent left the match.'),null);return;}
          if(draftActive){abortOnlineDraft(tr('Rakip kahraman seçiminden ayrıldı.','Opponent left hero selection.'),null);return;}
          startReconnectGrace(true,tr('Rakip oyundan ayrıldı.','Opponent left the game.'));
        });
        if(isQM){
          const myName=(USER_ACC&&!USER_ACC.isGuest)?USER_ACC.username:tr('Misafir','Guest');
          const myElo=Math.round((USER_ACC&&USER_ACC.elo)||1200);
          const oppName=String(m.name||tr('Misafir','Guest')).slice(0,22);
          const oppElo=Math.max(400,Math.min(4000,Math.round(+m.elo||1200)));
          fromConn.send({k:'match_found',oppName:myName,oppElo:myElo,secs:10});
          showQuickMatchFound(true,oppName,oppElo,10);
        }else{
          fromConn.send({k:'start_draft'});
          startOnlineHeroDraft(true);
        }
      }else if(KING_TABLE&&spectators.length<8){
        fromConn._role='spectator';
        fromConn._kingName=String(m.name||tr('Oyuncu','Player')).slice(0,20);
        fromConn._kingElo=Math.max(400,Math.min(4000,Math.round(+m.elo||1200)));
        spectators.push(fromConn);
        KING_QUEUE.push(fromConn);
        fromConn.send({k:'role',role:'spectator',kingQueuePos:KING_QUEUE.length});
        if(G)fromConn.send({k:'s',v:specView(G),specCount:spectators.length});
        fromConn.on('close',()=>{
          spectators=spectators.filter(x=>x!==fromConn);
          KING_QUEUE=KING_QUEUE.filter(x=>x!==fromConn);
          if(G)R();
        });
      }else{
        fromConn.send({k:'slot_full'});
      }
    }else if(m.role=='spectator'){
      if(spectators.length >= MAX_SPECTATORS){
        fromConn.send({k:'spec_full', max: MAX_SPECTATORS});
        return;
      }
      fromConn._role = 'spectator';
      fromConn._specName = String(m.name||tr('Misafir','Guest')).slice(0,18);
      spectators.push(fromConn);
      fromConn.send({k:'role', role:'spectator'});
      if(G){
        fromConn.send({k:'s', v:specView(G), specCount:spectators.length, specNames:spectators.map(s=>s._specName||tr('Misafir','Guest'))});
        R();
      }
      fromConn.on('close',()=>{
        spectators=spectators.filter(x=>x!==fromConn);
        KING_QUEUE=KING_QUEUE.filter(x=>x!==fromConn);
        if(G)R();
      });
    }
    return;
  }
  if(m.k=='spec_react'){
    const ic=String(m.ic||'✦').slice(0,4),lbl=String(m.label||'').slice(0,18);
    if(typeof showSpecReactionToast==='function')showSpecReactionToast(ic,lbl);
    if(conn&&conn.open)try{conn.send({k:'spec_react',ic,label:lbl})}catch(e){}
    spectators.forEach(s=>{try{if(s.open)s.send({k:'spec_react',ic,label:lbl})}catch(e){}});
    return;
  }
  if(m.k=='spec_vote'&&(m.side===0||m.side===1)){
    if(fromConn._votedSide===0||fromConn._votedSide===1)SPEC_VOTES[fromConn._votedSide]=Math.max(0,SPEC_VOTES[fromConn._votedSide]-1);
    fromConn._votedSide=m.side;
    SPEC_VOTES[m.side]=(SPEC_VOTES[m.side]||0)+1;
    const payload={k:'spec_votes',votes:[...SPEC_VOTES]};
    if(conn&&conn.open)try{conn.send(payload)}catch(e){}
    spectators.forEach(s=>{try{if(s.open)s.send(payload)}catch(e){}});
    if(typeof renderSpecSocialBar==='function')renderSpecSocialBar();
    return;
  }
  if(m.k=='draft_pick'){
    if(!draftActive||fromConn!==conn)return;
    draftPicked[1]=true;
    draftHeroes[1]=(m.hero&&HERO_MAP[m.hero]&&!HERO_MAP[m.hero].bossOnly)?m.hero:'c';
    if(draftPicked[0])finishOnlineDraft();
    return;
  }
  if(m.k=='draft_timeout'){
    if(fromConn!==conn)return;
    abortOnlineDraft(tr('Kahraman seçimi zaman aşımına uğradı.','Hero selection timed out.'),null);
    return;
  }
  if(m.k=='draft_cancel'){
    if(fromConn!==conn)return;
    abortOnlineDraft(tr('Rakip kahraman seçiminden ayrıldı.','Opponent left hero selection.'),null);
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
  if(m.k=='profile'&&fromConn===conn){
    OPP_PROFILE={
      name:String(m.name||tr('Misafir','Guest')).slice(0,22),
      elo:Math.max(400,Math.min(4000,Math.round(+m.elo||1200))),
      leagueName:String(m.leagueName||'').slice(0,28),
      leagueId:String(m.leagueId||'unranked').slice(0,16),
      isGuest:!!m.isGuest
    };
    if(!m.ack)sendMyProfile(fromConn);
    if(G)R();
    return;
  }
  if(m.k=='tie_roll'){
    if(fromConn!==conn&&fromConn._role!=='player')return;
    if(!(window._triggerTieRoll&&window._triggerTieRoll()))window._pendingTieRoll=Date.now();
    spectators.forEach(s=>{try{if(s.open)s.send({k:'tie_roll'})}catch(e){}});
    return;
  }
  if(m.k=='d20_roll'){
    if(fromConn!==conn&&fromConn._role!=='player')return;
    if(!(window._triggerD20Roll&&window._triggerD20Roll()))window._pendingD20Roll=Date.now();
    spectators.forEach(s=>{try{if(s.open)s.send({k:'d20_roll'})}catch(e){}});
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
    if(avKey(S,1)!=='c'||!(S.cWins&&S.cWins[1]>=3))return;
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
let PENDING_INVITE_JOIN=false,specEntering=false;
function showSpecVeil(msg){
  let v=document.getElementById('spec-veil');
  if(!v){
    v=document.createElement('div');
    v.id='spec-veil';
    v.className='spec-veil';
    v.innerHTML=`<img alt="" src="limbi_favicon.png?v=limbi4" decoding="async"><b>${escHtml(msg||tr('Canlı maça bağlanılıyor…','Connecting to live match…'))}</b>`;
    document.body.appendChild(v);
    requestAnimationFrame(()=>v.classList.add('on'));
  }else{
    const b=v.querySelector('b');if(b&&msg)b.textContent=msg;
    v.classList.remove('out');v.classList.add('on');
  }
}
function hideSpecVeil(){
  const v=document.getElementById('spec-veil');
  if(!v)return;
  v.classList.remove('on');v.classList.add('out');
  setTimeout(()=>{if(v.isConnected)v.remove()},380);
}
function revealSpecBoard(){
  if(!G||MODE!=='spectator')return;
  specEntering=false;
  const mn=$('#menu');if(mn)mn.hidden=true;
  seen.clear();seenE.clear();
  [0,1].forEach(p=>{if(G.pl&&G.pl[p]){G.pl[p].open.forEach(c=>seen.add(c.id));G.pl[p].closed.forEach(c=>seen.add(c.id));}});
  (G.pj||[]).forEach(e=>seenE.add(e.uid));
  R();
  fit();
  if(typeof syncGlogMobilePos==='function')syncGlogMobilePos();
  requestAnimationFrame(()=>requestAnimationFrame(()=>hideSpecVeil()));
}
function onHost(m){ // misafir veya izleyici: host'tan gelen durum/bildirimler
  if(m.k=='match_found'){
    PENDING_INVITE_JOIN=false;
    MODE='guest';
    showQuickMatchFound(false,m.oppName,m.oppElo,m.secs||10);
    return;
  }
  if(m.k=='start_draft'){
    PENDING_INVITE_JOIN=false;
    MODE='guest';
    startOnlineHeroDraft(false);
    return;
  }
  if(m.k=='draft_timeout'){
    abortOnlineDraft(tr('Kahraman seçimi zaman aşımına uğradı.','Hero selection timed out.'),null);
    return;
  }
  if(m.k=='draft_cancel'){
    abortOnlineDraft(tr('Rakip kahraman seçiminden ayrıldı.','Opponent left hero selection.'),null);
    return;
  }
  if(m.k=='slots_info'){
    PENDING_INVITE_JOIN=false;
    if(m.slots&&m.slots.p1&&!m.slots.p1.busy){
      if(conn&&conn.open)conn.send({k:'join_as',role:'player'});
    }else{
      abortOnlineDraft(tr('Oda dolu!','Room is full!'),null);
    }
    return;
  }
  if(m.k=='slot_full'){
    abortOnlineDraft(tr('Oda dolu!','Room is full!'),null);
    return;
  }
  if(m.k=='spec_full'){
    st(tr(`İzleyici slotu dolu! En fazla ${m.max||5} izleyici katılabilir.`,`Spectator slots are full! Up to ${m.max||5} spectators can join.`));
    const btnS = $('#btnJoinSpec');
    if(btnS){ btnS.disabled = true; btnS.textContent = `${tr('İzleyici Dolu','Spectators Full')} (${m.max||5}/${m.max||5})`; }
    return;
  }
  if(m.k=='role'){
    clearOnlineDraft();
    $('#m').hidden = true; lock = false;
    if(m.role=='spectator'){
      MODE='spectator';
      specEntering=true;
      glogOpen=false;glogLastSig='';lastThiefSeq=0;
      st('');
      setMusic('game');
      showSpecVeil(tr('Canlı yayın açılıyor…','Opening live match…'));
      if(G)revealSpecBoard();
    }else if(m.role=='player'){
      MODE='guest';
      OPP_PROFILE={name:'',elo:1200,isGuest:true};
      sendMyProfile(conn);
      st('');
      veil();setMusic('game');
    }
    return;
  }
  if(m.k=='profile'){
    OPP_PROFILE={
      name:String(m.name||tr('Misafir','Guest')).slice(0,22),
      elo:Math.max(400,Math.min(4000,Math.round(+m.elo||1200))),
      leagueName:String(m.leagueName||'').slice(0,28),
      leagueId:String(m.leagueId||'unranked').slice(0,16),
      isGuest:!!m.isGuest
    };
    if(m.queueMode==='normal'||m.queueMode==='ranked')QUEUE_MODE=m.queueMode;
    if(G)R();
    return;
  }
  if(m.k=='emote'&&EMOTE_SET.has(m.e)){
    const s=MODE==='spectator'?(m.side===1?1:0):1;
    showEmote(s,m.e);
    return;
  }
  if(m.k=='spec_react'){
    if(typeof showSpecReactionToast==='function')showSpecReactionToast(m.ic,m.label);
    return;
  }
  if(m.k=='spec_votes'&&Array.isArray(m.votes)){
    SPEC_VOTES=[m.votes[0]|0,m.votes[1]|0];
    if(typeof renderSpecSocialBar==='function')renderSpecSocialBar();
    return;
  }
  if(m.k=='s'){
    if(m.specCount!=null)specCount=m.specCount;
    if(Array.isArray(m.specNames))specNames=m.specNames;
    const prevRev=G&&G.rev,prevWin=G?G.winSide:null;
    if(!G||(G.over&&!m.v.over))LAST_MATCH_HIST=[];
    G=m.v;if(!G.over){try{document.body.classList.remove('dead')}catch(e){}}
    if(G.rev&&!prevRev)snd('flip');
    if(G.winSide!=null&&prevWin==null){
      snd(G.winSide>0?'win':G.winSide<0?'lose':'ok');
      const winW=G.winSide;
      setTimeout(()=>{if(G&&G.winSide===winW){if(winW!==0)heroAttack(winW>0?0:1);else heroClash();}},1000);
      if(G.vampBurn){const vb=G.vampBurn;setTimeout(()=>{if(G&&G.winSide===winW)triggerVampBurnFx(vb);},2400);}
      setTimeout(()=>{if(G&&G.winSide===winW)dustTableCards();},3400);
    }
    const keepModalOpen=!!(G.over||(G.wait&&document.querySelector('#mb .d20-box,#mb .end-screen,#mb .tie-box')));
    if(waitM&&!keepModalOpen){$('#m').hidden=true;lock=false;waitM=false}
    if(MODE!='spectator'&&(G.turn!=0||G.wait))P=null;
    if(specEntering){setMusic('game');revealSpecBoard();return;}
    if(!$('#menu').hidden)setTimeout(()=>{$('#menu').hidden=true},1500);
    setMusic('game');R();
  }
  else if(m.k=='m'){
    waitM=true;
    if(m.end&&MODE==='guest'){
      HOLD_UNLOCK_TOASTS=true;
      let endHtml=m.html;
      if(G&&typeof recordMatchElo==='function'){
        const guestWon=/data-res="win"|hs-victory\s+win/.test(endHtml);
        const eRes=recordMatchElo(G,guestWon);
        if(eRes&&!eRes.unranked){
          const eloBar=`<div class="end-elo-bar ${eRes.delta>=0?'pos':'neg'}"><span class="end-elo-rk">${eRes.rank.ic} ${eRes.rank.name}</span><span class="end-elo-val">${eRes.before} → <b>${eRes.after}</b></span><span class="end-elo-d">${eRes.delta>=0?'+':''}${eRes.delta} ELO</span></div>`;
          endHtml=endHtml.replace('<div class="end-stats hs-end-stats">',eloBar+'<div class="end-stats hs-end-stats">');
        }
      }
      M(endHtml,tr('Yeniden Oyna','Play Again'),()=>chooseHero(hid=>{
        MY_HERO=hid;waitM=true;
        if(conn&&conn.open)conn.send({k:'rematch_ready',hero:hid});
        showRematchWait(tr('Rakibin "Yeniden Oyna" demesi ve kahraman seçmesi bekleniyor…','Waiting for opponent to click "Play Again" and choose a hero…'));
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
    if(!(window._triggerTieRoll&&window._triggerTieRoll()))window._pendingTieRoll=Date.now();
  }
  else if(m.k=='d20_roll'){
    if(!(window._triggerD20Roll&&window._triggerD20Roll()))window._pendingD20Roll=Date.now();
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
let CURRENT_HOST_CODE='',LAST_JOIN_CODE='';
let RECONN_TIMER=null,RECONN_IV=null,RECONN_LEFT=0;
function clearReconnectGrace(){
  if(RECONN_TIMER){clearInterval(RECONN_TIMER);RECONN_TIMER=null}
  if(RECONN_IV){clearInterval(RECONN_IV);RECONN_IV=null}
  RECONN_LEFT=0;
  if(G&&G.reconnPause){G.reconnPause=false;if(MODE==='host')R();}
  const b=document.getElementById('reconn-bar');if(b)b.remove();
}
const ACTIVE_MATCH_KEY='nd_active_match_v1';
const ABANDON_GRACE_MS=30000;
function clearActiveMatchSnapshot(){
  try{localStorage.removeItem(ACTIVE_MATCH_KEY)}catch(e){}
}
function saveActiveMatchSnapshot(){
  try{
    if(!G||G.over||leaving||MODE==='tutorial'||MODE==='spectator'){
      clearActiveMatchSnapshot();
      return;
    }
    const menuEl=$('#menu');
    if(menuEl&&!menuEl.hidden)return;
    const lossDelta=(typeof peekLossElo==='function')?peekLossElo(G):0;
    const snap={
      ts:Date.now(),
      mode:MODE,
      diff:DIFF,
      roomCode:MODE==='guest'?LAST_JOIN_CODE:(MODE==='host'?CURRENT_HOST_CODE:''),
      myHero:MY_HERO,
      oppHero:OPP_HERO,
      oppLabel:(typeof getOppLabel==='function')?getOppLabel():'',
      lossDelta,
      userKey:(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.key)?USER_ACC.key:'',
      state:MODE==='bot'?G:null
    };
    localStorage.setItem(ACTIVE_MATCH_KEY,JSON.stringify(snap));
  }catch(e){}
}
function applyAbandonLoss(snap){
  if(!snap)return;
  if(!USER_ACC)createGuestAccount();
  const acc=USER_ACC;
  const before=Math.round(acc.elo||1200);
  const delta=snap.lossDelta<0?snap.lossDelta:0;
  const isUnranked=(snap.mode==='bot'&&(snap.diff==='easy'||snap.diff==='med'))||delta===0;
  const oppTxt=(snap.oppLabel||tr('Rakip','Opponent'))+` (${tr('Ayrıldı','Abandoned')})`;
  if(isUnranked){
    acc.unrankedMatches=(acc.unrankedMatches||0)+1;
    acc.unrankedLosses=(acc.unrankedLosses||0)+1;
    acc.winStreak=0;
    acc.history=acc.history||[];
    acc.history.unshift({ts:Date.now(),opp:oppTxt,won:false,delta:0,elo:before,unranked:true,mode:snap.mode,diff:snap.diff,score:'',myHero:snap.myHero||'',oppHero:snap.oppHero||''});
    if(acc.history.length>AUTH_HIST_MAX)acc.history.length=AUTH_HIST_MAX;
    saveSession(acc);
    showUnlockToast('!',tr('Maçtan Ayrıldın (30sn Doldu)','Match Abandoned (30s Expired)'),tr('30 saniye içinde dönmediğin için mağlubiyet sayıldı.','Counted as a loss because you did not return within 30s.'));
    return;
  }
  const after=Math.max(400,before+delta);
  acc.elo=after;
  acc.matches=(acc.matches||0)+1;
  acc.losses=(acc.losses||0)+1;
  acc.winStreak=0;
  if(snap.myHero){
    acc.heroStats=acc.heroStats||{};
    if(!acc.heroStats[snap.myHero])acc.heroStats[snap.myHero]={w:0,l:0};
    acc.heroStats[snap.myHero].l++;
  }
  acc.history=acc.history||[];
  acc.history.unshift({ts:Date.now(),opp:oppTxt,won:false,delta,elo:after,unranked:false,mode:snap.mode,diff:snap.mode==='bot'?snap.diff:'pvp',score:'',myHero:snap.myHero||'',oppHero:snap.oppHero||''});
  if(acc.history.length>AUTH_HIST_MAX)acc.history.length=AUTH_HIST_MAX;
  saveSession(acc);
  showUnlockToast('!',tr('Maçtan Ayrıldın (30sn Doldu)','Match Abandoned (30s Expired)'),tr(`30 saniye içinde dönmediğin için mağlubiyet sayıldı (${delta} ELO).`,`Counted as a defeat for not returning within 30s (${delta} ELO).`));
}
function checkAbandonedOrResumeMatch(){
  try{
    const raw=localStorage.getItem(ACTIVE_MATCH_KEY);
    if(!raw)return;
    const snap=JSON.parse(raw);
    clearActiveMatchSnapshot();
    if(!snap||!snap.ts)return;
    const elapsed=Date.now()-snap.ts;
    if(elapsed>ABANDON_GRACE_MS){
      applyAbandonLoss(snap);
      return;
    }
    // 30 saniye içinde geri dönüldü -> maça devam et!
    if(snap.mode==='bot'&&snap.state){
      MODE='bot';
      DIFF=snap.diff||'hard';
      MY_HERO=snap.myHero||'c';
      OPP_HERO=snap.oppHero||'n';
      G=snap.state;
      G.wait=false;
      G.graceLeft=0;
      leaving=false;
      $('#menu').hidden=true;
      $('#m').hidden=true;
      lock=false;
      setMusic('game');
      R();
      next();
      showUnlockToast('✦',tr('Maça Geri Dönüldü','Rejoined Match'),tr('30 saniye içinde döndüğün için maç kaldığı yerden devam ediyor.','Returned within 30s — match resumed.'));
    }else if(snap.mode==='guest'&&snap.roomCode){
      LAST_JOIN_CODE=snap.roomCode;
      MY_HERO=snap.myHero||'c';
      OPP_HERO=snap.oppHero||'n';
      MODE='guest';
      leaving=false;
      peer=new Peer();
      peer.on('open',()=>{
        conn=peer.connect('necrodice-'+snap.roomCode,{reliable:true});
        conn.on('data',onHost);
        conn.on('open',()=>{
          conn.send({k:'reconnect'});
          showUnlockToast('✦',tr('Online Maça Geri Dönüldü','Reconnected to Online Match'),tr('Bağlantı yenilendi, maç devam ediyor.','Connection restored, match resumed.'));
        });
        conn.on('close',()=>startReconnectGrace(false,tr('Rakip oyundan ayrıldı.','Opponent left the game.')));
      });
      peer.on('error',()=>applyAbandonLoss(snap));
    }else{
      // Host sekmeyi kapattıysa oda kapandığı için 30sn içinde dönse bile devam edilemezse ceza verilir
      applyAbandonLoss(snap);
    }
  }catch(e){clearActiveMatchSnapshot()}
}
window.addEventListener('pagehide',()=>saveActiveMatchSnapshot());
window.addEventListener('beforeunload',()=>saveActiveMatchSnapshot());

function startReconnectGrace(isHost,fallbackMsg){
  if(leaving||!G||G.over||MODE==='spectator'||MODE==='bot'){
    peerLeft(fallbackMsg);
    return;
  }
  clearReconnectGrace();
  RECONN_LEFT=30;
  if(G){G.reconnPause=true;if(isHost)R();}
  const showBar=()=>{
    let b=document.getElementById('reconn-bar');
    if(!b){
      b=document.createElement('div');
      b.id='reconn-bar';
      b.className='reconn-bar';
      document.body.appendChild(b);
    }
    b.innerHTML=`<span>${isHost?tr(`Rakibin bağlantısı koptu — geri dönmesi için ${RECONN_LEFT}sn bekleniyor…`,`Opponent disconnected — waiting ${RECONN_LEFT}s to return…`):tr(`Bağlantı koptu — yeniden bağlanılıyor (${RECONN_LEFT}sn)…`,`Connection lost — reconnecting (${RECONN_LEFT}s)…`)}</span>`;
  };
  showBar();
  RECONN_TIMER=setInterval(()=>{
    RECONN_LEFT--;
    if(RECONN_LEFT<=0){
      clearReconnectGrace();
      if(G&&!G.over){
        G.over=true;
        clearActiveMatchSnapshot();
        if(isHost&&typeof recordMatchElo==='function'){
          const eRes=recordMatchElo(G,true);
          const eloMsg=(eRes&&!eRes.unranked)?` (+${eRes.delta} ELO)`:'';
          peerLeft(tr(`Rakip 30 saniye içinde dönmedi — Hükmen Galip sayıldın!${eloMsg}`,`Opponent did not return within 30s — You win by forfeit!${eloMsg}`));
          return;
        }
      }
      peerLeft(fallbackMsg);
    }else{
      showBar();
    }
  },1000);
  if(!isHost&&LAST_JOIN_CODE){
    const tryReconn=()=>{
      if(leaving||!G||G.over||!LAST_JOIN_CODE)return;
      try{
        if(!peer||peer.destroyed)peer=new Peer();
        const nc=peer.connect('necrodice-'+LAST_JOIN_CODE,{reliable:true});
        nc.on('open',()=>{
          clearReconnectGrace();
          conn=nc;
          conn.on('data',onHost);
          conn.on('close',()=>startReconnectGrace(false,tr('Rakip oyundan ayrıldı.','Opponent left the game.')));
          conn.send({k:'reconnect'});
          snd('ok');
        });
      }catch(e){}
    };
    setTimeout(tryReconn,1200);
    RECONN_IV=setInterval(tryReconn,2800);
  }
}
let ACTIVE_OUT_INV_UNSUB=null,ACTIVE_OUT_INV_ID=null,ACTIVE_OUT_INV_TMR=null;
function clearOutgoingInvite(newStatus){
  if(ACTIVE_OUT_INV_TMR){clearTimeout(ACTIVE_OUT_INV_TMR);ACTIVE_OUT_INV_TMR=null}
  if(ACTIVE_OUT_INV_UNSUB){try{ACTIVE_OUT_INV_UNSUB()}catch(e){}ACTIVE_OUT_INV_UNSUB=null}
  if(ACTIVE_OUT_INV_ID&&newStatus&&fbDb){
    const id=ACTIVE_OUT_INV_ID;
    fbDb.collection('lobby_invites').doc(id).update({status:newStatus}).catch(()=>{});
  }
  ACTIVE_OUT_INV_ID=null;
}
function hostRoom(inviteTarget,onCodeReady){
  if(noNet())return;
  CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;
  clearOutgoingInvite('cancelled');
  MODE='host';leaving=false;sayT='';spectators=[];specCount=0;const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
  CURRENT_HOST_CODE=code;
  st(inviteTarget?tr(`${inviteTarget.name} için düello daveti hazırlanıyor…`,`Preparing duel invite for ${inviteTarget.name}…`):tr('Oda oluşturuluyor…','Creating room…'));
  peer=new Peer('necrodice-'+code);
  
  const showLobby=()=>{
    if(inviteTarget){
      box(`
        <div class="lobby-box">
          <h3 style="margin-bottom:8px">${tr('Düello Daveti Gönderildi','Duel Invite Sent')}</h3>
          <p style="color:var(--bone);font-size:17px;margin-bottom:10px">${tr(`<b>${escHtml(inviteTarget.name)}</b> (${escHtml(eloRank(inviteTarget.elo).name)}) yanıtı bekleniyor…`,`Waiting for <b>${escHtml(inviteTarget.name)}</b> (${escHtml(eloRank(inviteTarget.elo).name)})…`)}</p>
          <div class="lobby-spinner"><i></i><i></i><i></i></div>
          <p id="lobbyStatus" style="font-size:15px;color:#a0b8a4;margin-top:12px">${tr('Kabul ettiğinde düello otomatik başlayacak.','The duel will start automatically once accepted.')}</p>
        </div>
      `, true);
      const pc=$('#pc');
      if(pc){
        pc.textContent=tr('Daveti İptal Et','Cancel Invite');
        pc.onclick=()=>{
          clearOutgoingInvite('cancelled');
          try{if(peer)peer.destroy()}catch(e){}
          peer=null;conn=null;spectators=[];MODE='bot';
          $('#m').hidden=true;lock=false;st('');
        };
      }
      return;
    }
    box(`
      <div class="lobby-box">
        <h3 style="margin-bottom:8px">${tr('Çevrim İçi Lobi','Online Lobby')}</h3>
        <p style="color:var(--bone);font-size:20px;margin-bottom:14px">${tr('Bu kodu arkadaşına ilet:','Share this code with your friend:')}</p>
        <div class="lobby-code-badge" id="lobbyCodeBox" title="${tr('Kodu Kopyala','Copy Code')}">
          <span class="lobby-lbl">${tr('Oda Kodu','Room Code')}</span>
          <b class="lobby-code">${code}</b>
          <span class="lobby-copy-hint">${tr('kopyalamak için tıkla','click to copy')}</span>
        </div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:10px">
          <button type="button" id="lobbyCopyLink" class="btn alt sm">${tr('Davet Linkini Kopyala','Copy Invite Link')}</button>
        </div>
        <label class="king-opt" style="display:inline-flex;align-items:center;gap:7px;margin-top:10px;font-size:13.5px;color:#d6c7ae;cursor:pointer">
          <input type="checkbox" id="lobbyKingChk"${KING_TABLE?' checked':''}>
          <span>${tr('Kral Masası (Kazanan Kalır · 4–8 Kişi)','King of the Table (Winner Stays · 4–8 Players)')}</span>
        </label>
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
    const cl=$('#lobbyCopyLink');
    if(cl){
      cl.onclick=()=>{
        const url=`${location.origin}${location.pathname}?join=${encodeURIComponent(code)}`;
        try{
          navigator.clipboard.writeText(url);
          snd('ok');
          cl.textContent=tr('Link Kopyalandı! ✔','Link Copied! ✔');
          setTimeout(()=>{if(cl.isConnected)cl.textContent=tr('Davet Linkini Kopyala','Copy Invite Link')},2200);
        }catch(e){prompt(tr('Davet Linki:','Invite Link:'),url)}
      };
    }
    const kc=$('#lobbyKingChk');
    if(kc){kc.onchange=()=>{KING_TABLE=!!kc.checked;snd('click')}}

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
    if(typeof onCodeReady==='function'){
      onCodeReady(code);
      return;
    }
    st(inviteTarget?tr(`${inviteTarget.name} bekleniyor…`,`Waiting for ${inviteTarget.name}…`):(tr('Oda kodu: ','Room code: ')+code+tr(' — rakip bekleniyor…',' — waiting for opponent…')));
    showLobby();
    if(inviteTarget&&fbDb&&typeof getMyPresenceId==='function'){
      const invId='inv_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
      ACTIVE_OUT_INV_ID=invId;
      const myName=(USER_ACC&&!USER_ACC.isGuest)?USER_ACC.username:tr('Misafir','Guest');
      const myElo=Math.round((USER_ACC&&USER_ACC.elo)||1200);
      const myFl=USER_ACC?getAccountLeague(USER_ACC):formatLeague(null,false);
      const ref=fbDb.collection('lobby_invites').doc(invId);
      ref.set({
        id:invId,
        fromId:getMyPresenceId(),
        fromName:myName,
        fromElo:myElo,
        fromLeagueName:myFl.name,
        toId:inviteTarget.pid,
        toName:inviteTarget.name||'',
        roomCode:code,
        status:'pending',
        createdAt:Date.now()
      }).catch(()=>{});
      ACTIVE_OUT_INV_UNSUB=ref.onSnapshot(snap=>{
        if(!snap.exists)return;
        const d=snap.data();
        if(!d)return;
        if(d.status==='accepted'){
          const ls=$('#lobbyStatus');
          if(ls)ls.textContent=tr(`${inviteTarget.name} kabul etti! Kahramanını seçiyor…`,`${inviteTarget.name} accepted! Choosing hero…`);
          clearOutgoingInvite(null);
        }else if(d.status==='declined'){
          clearOutgoingInvite(null);
          try{if(peer)peer.destroy()}catch(e){}
          peer=null;conn=null;spectators=[];MODE='bot';
          snd('err');
          box(`<h3>${tr('Davet Reddedildi','Invite Declined')}</h3><p>${tr(`<b>${escHtml(inviteTarget.name)}</b> düello davetini reddetti.`,`<b>${escHtml(inviteTarget.name)}</b> declined your duel invite.`)}</p>`,true);
        }
      },()=>{});
      ACTIVE_OUT_INV_TMR=setTimeout(()=>{
        if(ACTIVE_OUT_INV_ID===invId&&!conn){
          clearOutgoingInvite('expired');
          try{if(peer)peer.destroy()}catch(e){}
          peer=null;conn=null;spectators=[];MODE='bot';
          box(`<h3>${tr('Yanıt Alınamadı','No Response')}</h3><p>${tr(`<b>${escHtml(inviteTarget.name)}</b> davete zamanında yanıt vermedi.`,`<b>${escHtml(inviteTarget.name)}</b> did not respond in time.`)}</p>`,true);
        }
      },45000);
    }
  });

  peer.on('error',e=>{
    if(e.type=='unavailable-id'){
      try{peer.destroy()}catch(err){}
      hostRoom(inviteTarget);
    }else{
      clearOutgoingInvite('cancelled');
      st(NETERR(e));
      const ls=$('#lobbyStatus');if(ls)ls.textContent=NETERR(e);
    }
  });

  peer.on('connection',c=>{
    clearOutgoingInvite(null);
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
          <span class="slot-status busy">${tr('Dolu','Full')}</span>
        </div>
        
        <div class="slot-card">
          <div class="slot-info">
            <img class="slot-av" src="${avSrc(p1.hero||'c')}" alt="${p1DispName}">
            <div class="slot-names">
              <b>${p1DispName}</b>
              <small>${p1DispRole}</small>
            </div>
          </div>
          <span class="slot-status ${p1Free?'free':'busy'}">${p1Free?tr('Boş','Open'):tr('Dolu','Full')}</span>
        </div>
      </div>
      
      <div class="slot-actions">
        <button id="btnJoinPlayer" class="btn ${p1Free?'':'dim'}" ${p1Free?'':'disabled'}>
          ${p1Free?tr('Oyuncu Olarak Katıl','Join as Player'):tr('Oda Dolu','Room Full')}
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

function joinRoom(directCode,fromInvite=false){
  if(noNet())return;
  CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;
  const code=(typeof directCode==='string'&&directCode.trim())?directCode.trim().toUpperCase():($('#code')?$('#code').value.trim().toUpperCase():'');
  if(!code)return st(tr('Oda kodunu yaz','Enter room code'));
  LAST_JOIN_CODE=code;
  PENDING_INVITE_JOIN=!!fromInvite;
  leaving=false;sayT='';st(tr('Odaya bağlanılıyor…','Connecting to room…'));peer=new Peer();
  peer.on('open',()=>{
    conn=peer.connect('necrodice-'+code,{reliable:true});
    conn.on('data',onHost);
    conn.on('open',()=>{
      st(IS_QUICK_MATCH?tr('Rakibe bağlanılıyor…','Connecting to opponent…'):tr('Oda bulundu. Kahraman seçimine geçiliyor…','Room found. Entering hero selection…'));
      const myName=(USER_ACC&&!USER_ACC.isGuest)?USER_ACC.username:tr('Misafir','Guest');
      const myElo=Math.round((USER_ACC&&USER_ACC.elo)||1200);
      conn.send({k:'join_as',role:'player',quickMatch:!!IS_QUICK_MATCH,name:myName,elo:myElo});
    });
    conn.on('close',()=>{
      if(matchFoundActive){abortOnlineDraft(tr('Rakip eşleşmeden ayrıldı.','Opponent left the match.'),null);return;}
      if(draftActive){abortOnlineDraft(tr('Rakip kahraman seçiminden ayrıldı.','Opponent left hero selection.'),null);return;}
      startReconnectGrace(false,tr('Rakip oyundan ayrıldı.','Opponent left the game.'));
    });
  });
  peer.on('error',e=>{PENDING_INVITE_JOIN=false;st(NETERR(e))});
}
function spectateRoom(code){
  if(noNet()||!code)return;
  const c=String(code).trim().toUpperCase();
  try{if(conn)conn.close()}catch(e){}
  try{if(peer)peer.destroy()}catch(e){}
  conn=null;peer=null;G=null;
  leaving=false;sayT='';MODE='spectator';specEntering=true;SPEC_VOTES=[0,0];MY_SPEC_VOTE=-1;
  showSpecVeil(tr('Canlı maça bağlanılıyor…','Connecting to live match…'));
  let joined=false;
  const failSpec=msg=>{
    clearTimeout(tmr);
    specEntering=false;
    hideSpecVeil();
    try{if(conn)conn.close()}catch(e){}
    try{if(peer)peer.destroy()}catch(e){}
    conn=null;peer=null;MODE='bot';
    st(msg);
  };
  const tmr=setTimeout(()=>{
    if(!joined&&MODE==='spectator'){
      failSpec(tr('Canlı maça bağlanılamadı (oda kapanmış veya zaman aşımına uğramış olabilir).','Could not connect to live match (room may have closed or timed out).'));
    }
  },10000);
  peer=new Peer();
  peer.on('open',()=>{
    conn=peer.connect('necrodice-'+c,{reliable:true});
    conn.on('data',m=>{if(m&&(m.k==='role'||m.k==='s')){joined=true;clearTimeout(tmr);}onHost(m)});
    conn.on('open',()=>{
      const myName=(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.username)?USER_ACC.username:tr('Misafir','Guest');
      conn.send({k:'join_as',role:'spectator',name:myName});
    });
    conn.on('error',()=>{if(!joined)failSpec(tr('Canlı maça bağlanılamadı.','Could not connect to live match.'))});
    conn.on('close',()=>{clearTimeout(tmr);hideSpecVeil();peerLeft(tr('Canlı yayın sona erdi.','Live broadcast ended.'))});
  });
  peer.on('error',e=>failSpec(NETERR(e)));
}
const on=(id,f)=>{const e=document.querySelector(id);if(e)e.onclick=f}; // bir öğe yoksa diğer düğmeler yine de çalışır
document.querySelectorAll('.d').forEach(b=>b.onclick=()=>{CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;DIFF=b.dataset.d;MODE='bot';chooseHero(h=>{MY_HERO=h;enter(start)})});
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
try{$('#slogo').src='limbi_favicon.png?v=limbi4'}catch(e){}setTimeout(()=>{const s=$('#splash');s&&s.remove()},1400);
on('#b2',()=>{if(noNet())return;CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;IS_QUICK_MATCH=false;hostRoom()});on('#b3',()=>{CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;IS_QUICK_MATCH=false;joinRoom()});on('#bqm',()=>{snd('click');CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;startQuickMatch()});
on('#b-cursed',()=>{snd('click');openWeeklyCursedModal()});
on('#b-puzzle',()=>{snd('click');if(typeof openDailyPuzzleModal==='function')openDailyPuzzleModal()});
on('#b-vault',()=>{snd('click');if(typeof openVaultModal==='function')openVaultModal()});

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
    const isMobView=window.innerWidth<=760||e.pointerType==='touch';
    if(!isMobView){
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
    const dragThresh=(e.pointerType==='touch'||window.innerWidth<=760)?16:8;
    if(!isDragging&&dist>dragThresh){
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
    const isMobView=window.innerWidth<=760||e.pointerType==='touch';
    // Masaüstünde kısa tıklama yapıldıysa: kart büyümüş şekilde elimizde kalsın (sticky mod)
    if(!cancelled&&wasDragging&&!isMobView&&maxDist<=10&&!isOverDropZone(e.clientY)){
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
      const tappedEl=dragEl;
      cleanupDrag();
      if(!cancelled&&isMobView&&maxDist<=16&&tappedEl){
        window._suppressJokerClick=true;
        setTimeout(()=>{window._suppressJokerClick=false},220);
        openMobileFan(+tappedEl.dataset.jidx);
      }
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
    if(!S||S.over||S.wait||MODE==='spectator'||!targetJ){
      clearOracle();return;
    }
    const id=+targetJ.dataset.j;
    if(!id||id===prevJId)return;
    clearOracle();
    prevJId=id;
    const sim={...S,eff:[...S.eff,{id,o:0,uid:-1}]};
    const curT=total(S,0),newT=id===22?curT:total(sim,0),curTg=tg(S),newTg=tg(sim),curLow=lowW(S),newLow=lowW(sim);
    const slots=[...document.querySelectorAll('#hand .jslot')];
    const slEl=targetJ.closest('.jslot');
    const sIdx=slEl?slots.indexOf(slEl):-1;
    const isRightSide=sIdx>=0&&slots.length>1&&sIdx>(slots.length-1)/2;
    const oraSideCls=isRightSide?' ora-left':' ora-right';
    const whoEl=document.querySelector('#me .who');
    if(id===22&&S.deck.length>0){
      if(whoEl){
        const sp=document.createElement('span');
        sp.className='ora-tot'+oraSideCls;
        sp.textContent=`±${S.deck.length}`;
        whoEl.appendChild(sp);
      }
    }else if(Number.isFinite(newT)&&newT!==curT){
      if(whoEl){
        const sp=document.createElement('span');
        const isExact=!newLow&&newT===newTg,isBust=!newLow&&newT>newTg;
        sp.className='ora-tot'+oraSideCls+(isExact?' ora-exact':isBust?' ora-bust':'');
        sp.textContent='→ '+newT;
        whoEl.appendChild(sp);
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
  window.updateOracleForJoker=targetJ=>{prevJId=null;updateOracle(targetJ);};
  window.clearOracleForJoker=clearOracle;
  let hoverActive=false;
  function clearHover(){
    if(!hoverActive&&!prevJId)return;
    hoverActive=false;
    document.querySelectorAll('#hand .j.hovered').forEach(el=>el.classList.remove('hovered'));
    clearOracle();
  }

  const handEl=document.getElementById('hand');
  const menuEl=document.getElementById('menu');
  const modalEl=document.getElementById('m');
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    if((menuEl&&!menuEl.hidden)||(modalEl&&!modalEl.hidden)){clearHover();return;}
    if(document.body.classList.contains('dragging-joker')||document.body.classList.contains('dragging-deck')){
      clearHover();return;
    }
    if(e.clientY<window.innerHeight*0.60){
      clearHover();return;
    }
    if(!handEl)return;
    if(!hoverActive&&!handEl.contains(e.target))return;
    const slots=[...handEl.querySelectorAll('.jslot')];
    if(!slots.length){clearHover();return;}

    let targetJ=null;
    for(const sl of slots){
      const r=sl.getBoundingClientRect();
      if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom){
        targetJ=sl.querySelector('.j');
        break;
      }
    }
    if(targetJ&&!targetJ.classList.contains('drag-source-hidden')){
      hoverActive=true;
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
    const cw=(hid==='c'&&G&&G.cWins)?Math.min(3,G.cWins[side]||0):0;
    const tagTxt=hid==='c'?tr(`Aktif · Galibiyet: ${cw}/3`,`Active · Wins: ${cw}/3`):(h.passive?tr('Pasif','Passive'):tr('Aktif','Active'));
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
  // Statik masa görseli tek seferlik GPU katmanında tutulur (her karede dev JPEG çizilmez)
  cvs.style.background="url('board_gothic.jpg?v=20261115_sym1') center/cover no-repeat #0a0d13";
  mainEl.insertBefore(cvs,mainEl.firstChild);
  const ctx=cvs.getContext('2d');

  let W=0,H=0,DPR=1;
  const particles=[];

  function seedParticles(){
    particles.length=0;
    for(let i=0;i<36;i++){
      const zone=i%4;
      particles.push({
        zone,
        x:Math.random(),
        y:Math.random(),
        r:1.3+Math.random()*2.2,
        vx:(Math.random()-0.5)*0.0004,
        vy:-0.0003-Math.random()*0.0005,
        phase:Math.random()*Math.PI*2
      });
    }
  }
  seedParticles();

  let cornerLights=[];
  function buildLights(){
    const lr=Math.min(W,H)*0.19;
    const defs=[
      [0.155,0.045,'rgba(255, 155, 55, 0.24)'],
      [0.845,0.045,'rgba(255, 155, 55, 0.24)'],
      [0.155,0.955,'rgba(255, 145, 45, 0.24)'],
      [0.845,0.955,'rgba(255, 145, 45, 0.24)']
    ];
    cornerLights=defs.map(([u,v,col])=>{
      const lx=W*u,ly=H*v;
      const lg=ctx.createRadialGradient(lx,ly,2,lx,ly,lr);
      lg.addColorStop(0,col);
      lg.addColorStop(1,'rgba(0,0,0,0)');
      return {x:lx-lr,y:ly-lr,s:lr*2,lg};
    });
  }
  function resize(){
    DPR=isMobilePerf()?1:Math.min(window.devicePixelRatio||1,1.25);
    W=window.innerWidth;
    H=window.innerHeight;
    cvs.width=Math.round(W*DPR);
    cvs.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    buildLights();
  }
  window.addEventListener('resize',resize);
  resize();

  let lastRender=0;
  const mEl=document.getElementById('m'),mn=document.getElementById('menu');
  const scheduleNext=(idle)=>idle?setTimeout(()=>requestAnimationFrame(render),240):requestAnimationFrame(render);
  function render(now){
    if(entering||leaving||document.hidden){scheduleNext(true);return;}
    if(mEl&&!mEl.hidden){scheduleNext(true);return;}
    const menuOpen=mn&&!mn.hidden;
    if(menuOpen){scheduleNext(true);return;}
    scheduleNext(false);
    const mob=isMobilePerf();
    const rm=document.body.classList.contains('rm');
    if(rm?now-lastRender>=500:now-lastRender>=(mob?55:42)){
      lastRender=now;
      const t=rm?0:now*0.001;
      ctx.clearRect(0,0,W,H);

      // 4 köşedeki simetrik ateş kaseleri için titreyen sıcak meşale parıltıları (önbellekli gradyan)
      const flicker = 0.78 + 0.22*Math.sin(t*7.1)*Math.cos(t*4.3);
      ctx.globalAlpha=flicker;
      for(let i=0;i<cornerLights.length;i++){
        const l=cornerLights[i];
        ctx.fillStyle=l.lg;
        ctx.fillRect(l.x,l.y,l.s,l.s);
      }
      ctx.globalAlpha=1;

      // Canlı atmosfer parçacıkları (Meşale kıvılcımları ve rün tozları)
      if(!rm)for(let i=0;i<particles.length;i++){
        const p=particles[i];
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
      }
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

  let isMobileMenuBg=false;
  let imgW=1920,imgH=1080;
  const menuImg=new Image();
  function pickMenuImg(){
    const wantMobile=window.innerWidth<=760||window.innerHeight>window.innerWidth*1.15;
    if(wantMobile===isMobileMenuBg&&menuImg.src)return;
    isMobileMenuBg=wantMobile;
    const url=wantMobile?'menu_gothic_mobile.jpg?v=20261125_keyart2':'menu_gothic_wide.jpg?v=20261125_wide1';
    cvs.style.background=`url('${url}') center/cover no-repeat #09060a`;
    menuImg.src=url;
  }
  menuImg.onload=()=>{if(menuImg.naturalWidth){imgW=menuImg.naturalWidth;imgH=menuImg.naturalHeight}};
  pickMenuImg();

  const motes=[];
  for(let i=0;i<40;i++){
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
  const mEl=document.getElementById('m'),menuEl=document.getElementById('menu');
  const scheduleNext=(idle)=>idle?setTimeout(()=>requestAnimationFrame(render),240):requestAnimationFrame(render);
  function render(now){
    if(entering||leaving||document.hidden){scheduleNext(true);return;}
    if((mEl&&!mEl.hidden)||!(menuEl&&!menuEl.hidden)){scheduleNext(true);return;}
    scheduleNext(false);
    const rm=document.body.classList.contains('rm');
    // Hareketi azalt: kül/kıvılcım yok, titreşen ışık yok; normalde akıcı GPU tasarrufu
    if(rm?now-lastMenuDraw>=500:now-lastMenuDraw>=(isMobilePerf()?55:42)){
      lastMenuDraw=now;
      const t=rm?0:now*0.001;
      ctx.clearRect(0,0,W,H);

      // Yeni key art üzerinde yalnızca yumuşak altın mum kıvılcımları süzülür (shadowBlur/gradyan tahsissiz GPU dostu çizim)
      if(!rm)for(let i=0;i<motes.length;i++){
        const e=motes[i];
        e.x+=e.vx;
        e.y+=e.vy;
        if(e.y<-0.06){e.y=1.06;e.x=Math.random()}
        if(e.x<-0.02)e.x=1.02;
        if(e.x>1.02)e.x=-0.02;
        const drift=Math.sin(t*1.9+e.phase)*14+Math.cos(t*0.9+e.phase*1.7)*6;
        const ex=e.x*W+drift;
        const ey=e.y*H;
        const flick=0.45+0.55*Math.abs(Math.sin(t*3.1+e.phase));
        if(e.kind===0){
          ctx.fillStyle=`rgba(255, 118, 32, ${0.26*flick})`;
          ctx.beginPath();
          ctx.arc(ex,ey,e.r*3.0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle=`rgba(255, 224, 148, ${0.88*flick})`;
          ctx.beginPath();
          ctx.arc(ex,ey,e.r*1.15,0,Math.PI*2);
          ctx.fill();
        }else if(e.kind===1){
          const rot=t*1.4+e.phase;
          ctx.save();
          ctx.translate(ex,ey);
          ctx.rotate(rot);
          ctx.fillStyle=`rgba(255, 90, 20, ${0.26*flick})`;
          ctx.beginPath();
          ctx.ellipse(0,0,e.r*2.4,e.r*1.4,0,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle=`rgba(255, 92, 28, ${0.82*flick})`;
          ctx.beginPath();
          ctx.ellipse(0,0,e.r*1.4,e.r*0.7,0,0,Math.PI*2);
          ctx.fill();
          ctx.restore();
        }else{
          const rot=t*1.4+e.phase;
          ctx.save();
          ctx.translate(ex,ey);
          ctx.rotate(rot);
          ctx.fillStyle=`rgba(34, 24, 22, ${0.62+0.25*flick})`;
          ctx.strokeStyle=`rgba(255, 110, 35, ${0.42*flick})`;
          ctx.lineWidth=0.9;
          ctx.beginPath();
          ctx.ellipse(0,0,e.r*1.65,e.r*0.85,0,0,Math.PI*2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }
  requestAnimationFrame(render);
})();

/* ---------- SATRANÇ SAATİ (CHESS CLOCK 66s / 55s / 44s) & 5 SN HAZIRLIK ---------- */
(function initHearthstoneTurnTimer(){
  let lastTickSec=-1,lastS0='',lastS1='',wasActive=false;
  setInterval(()=>{
    const menu=$('#menu');
    const menuOpen=!!(menu&&!menu.hidden);
    if(menuOpen&&!wasActive)return;
    const sc0=$('#sc-0');
    const sc1=$('#sc-1');
    const scSec0=$('#sc-sec-0');
    const scSec1=$('#sc-sec-1');
    const modalEl=$('#m'),mbEl=$('#mb');
    const isMenuModal=!!(modalEl&&!modalEl.hidden&&mbEl&&!mbEl.querySelector('.d20-box,.tie-box,.scry-row,#hp-p2,.hero-grid'));
    const isReconnPaused=!!(RECONN_TIMER||RECONN_LEFT>0||(G&&G.reconnPause));
    const active=!!(G && MODE!=='tutorial' && !G.over && !G.wait && !isReconnPaused && (!lock || (MODE!=='bot' && isMenuModal)) && !menuOpen);
    if(!active){
      if(wasActive||G){
        if(sc0){sc0.classList.remove('ticking','low');sc0.classList.toggle('turn-on',!!(G&&G.turn===0));sc0.classList.toggle('turn-off',!!(G&&G.turn!==0))}
        if(sc1){sc1.classList.remove('ticking','low');sc1.classList.toggle('turn-on',!!(G&&G.turn===1));sc1.classList.toggle('turn-off',!!(G&&G.turn!==1))}
      }
      wasActive=false;
      lastTickSec=-1;
      return;
    }
    wasActive=true;
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
      const t0=(G.timeOut[0]||s0<=0)?'✕':String(s0);
      const t1=(G.timeOut[1]||s1<=0)?'✕':String(s1);
      if(scSec0&&t0!==lastS0){scSec0.textContent=t0;lastS0=t0;}
      if(scSec1&&t1!==lastS1){scSec1.textContent=t1;lastS1=t1;}
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

    const t0=(G.timeOut[0]||s0<=0)?'✕':String(s0);
    const t1=(G.timeOut[1]||s1<=0)?'✕':String(s1);
    if(scSec0&&t0!==lastS0){scSec0.textContent=t0;lastS0=t0;}
    if(scSec1&&t1!==lastS1){scSec1.textContent=t1;lastS1=t1;}

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
    if(e.target.closest&&e.target.closest('button, a, input, select, .c, .j, .e, #deck, #pass, .who, #hdr .hs, #hdr .hc, #hdr .hg, #glog, .side-clock, .seal'))return;
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
    txt:tr('Her kahramanın eşsiz bir gücü vardır:<br>• <b>Aktif:</b> <b>Veba Doktoru</b> (1 joker yak, 2 çek), <b>Cadı</b> (rakibin kapalı kartına bak), <b>Kurt Adam</b> (iki taraftan 1\'er kart imha et).<br>• <b>Pasif:</b> <b>Buz Devi</b> (%20 hasar savuşturur), <b>Vampir</b> (tur kaybedince rakibin 1 jokerini yakar), <b>Ölümün Efendisi</b> (D20 +2).','Every hero has a unique power:<br>• <b>Active:</b> <b>Plague Doctor</b> (burn 1 Joker, draw 2), <b>Witch</b> (peek opponent\'s hidden card), <b>Werewolf</b> (destroy 1 card per side).<br>• <b>Passive:</b> <b>Frost Giant</b> (20% deflect), <b>Vampire</b> (burns 1 opponent Joker on round loss), <b>Lord of Death</b> (+2 D20).'),
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
    txt:tr('Artık tüm kontrol tamamen sende! Bu düelloyu <b>1 – 0</b> öndeyken <b>Kolay Seviye Bot</b> karşısında kendin tamamla. Kahraman gücünü ve kalan jokerlerini kullanmayı unutma — bol şans!','You\'re in full control now! Finish this duel from <b>1 – 0</b> ahead against the <b>Easy Level Bot</b>. Don\'t forget your Hero Power and remaining Jokers — good luck!'),
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
      if(st.finish){
        const needReg=!USER_ACC||USER_ACC.isGuest;
        exitGame();
        if(needReg)setTimeout(()=>{const mn=$('#menu');if(mn&&!mn.hidden&&(!USER_ACC||USER_ACC.isGuest))openAuthModal('register',true)},680);
        return;
      }
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
  const Tg=tg(S),low=lowW(S),noBust=clZero(S);
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
  }else if(hid==='l'&&(S.pl[0].open.length||S.pl[1].open.length)){
    if(wpPlayed<=40&&(loss>=6||matchPoint)){
      return {
        hid,name:h.hpName,
        sev:wpPlayed<=28?'high':'med',
        msg:tr(`${h.hpName} hazırdı: Kazanma şansın %${wpPlayed}'e düşmüşken masadaki kartları temizleyip dezavantajı kırabilirdin.`,`${h.hpName} was ready: With win odds down to ${wpPlayed}%, wiping table cards could reset the disadvantage.`)
      };
    }
  }else if(hid==='c'&&((S.cWins&&S.cWins[0])||0)>=3){
    if(wpPlayed<=45){
      return {
        hid,name:h.hpName,
        sev:'high',
        msg:tr(`${h.hpName} (3/3) doluydu: Dezavantajlı bu turda zamanı geri sarıp üstünlüğü ele alabilirdin.`,`${h.hpName} (3/3) was charged: Rewinding this unfavorable round could turn the duel around.`)
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
  if(!best&&!low&&oppOpen>Tg&&!clZero(S)){
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
  let idx=0,cancelled=false,anView='moves',anFilter='all',openMoveIdx=-1,selDuel=null;
  mb.classList.remove('end-mode','set-mode');
  mb.classList.add('an-mode');
  mb.innerHTML=`<div class="an-loading">
    <h3>${tr('NecroEngine v4 Maç Analizi','NecroEngine v4 Match Analysis')}</h3>
    <p class="an-sub">${tr('Kesin kombinatoryal çözücü, kahraman gücü fırsatları ve Multi-PV hatları taranıyor…','Scanning Exact Endgame Solver, Hero Power opportunities & Multi-PV lines…')}</p>
    <div class="an-pbar"><i id="an-fill"></i></div>
    <div id="an-stat" class="an-stat">0 / ${hist.length}</div>
    <button type="button" id="an-cancel" class="btn alt sm" style="margin-top:14px">${tr('İptal','Cancel')}</button>
  </div>`;
  const restoreEnd=()=>{
    cancelled=true;
    mb.classList.remove('an-mode');
    mb.classList.add('end-mode');
    mb.innerHTML=endTplHtml;
    const row=mb.querySelector('.end-acts');
    if(row){
      if(LAST_DEATH_CARD&&!LAST_DEATH_CARD.isSpec){
        const sb=document.createElement('button');
        sb.id='btn-share-card';sb.className='btn alt';
        sb.textContent=tr('Ölüm Kartını Paylaş','Share Death Card');
        sb.onclick=()=>{snd('click');shareDeathCard(LAST_DEATH_CARD,sb)};
        row.appendChild(sb);
      }
      const ab=document.createElement('button');
      ab.id='btn-analyze';ab.className='btn alt';
      ab.textContent=tr('Maçı Analiz Et','Analyze Match');
      ab.onclick=()=>openMatchAnalysis(endTplHtml,moBtn,mxBtn);
      row.appendChild(ab);
      if(moBtn){moBtn.style.visibility='';row.appendChild(moBtn)}
      if(mxBtn){mxBtn.style.visibility='';row.appendChild(mxBtn)}
    }
    const gSave=mb.querySelector('#end-save-guest');
    if(gSave){gSave.onclick=()=>{snd('click');mb.classList.remove('end-mode');openAuthModal('register',true)}}
  };
  if($('#an-cancel'))$('#an-cancel').onclick=()=>{snd('click');restoreEnd()};
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
      const duelsHtml=st.duels.map(d=>`<button type="button" class="an-duel-chip clickable" data-duel="${d.duel}"><span>${tr('Düello','Duel')} ${d.duel}</span><b>%${d.acc}</b><small>${d.moves} ${tr('hamle','moves')}</small></button>`).join('');
      const hpMissedHtml=st.hpMissed&&st.hpMissed.length
        ?`<div class="an-sec-lbl">${tr('Kahraman Gücü Fırsatları','Hero Power Opportunities')} (${st.hpMissed.length})</div>
          <div class="an-hp-list">${st.hpMissed.slice(0,4).map(m=>`<button type="button" class="an-hp-chip ${m.sev}" data-jump="${m.idx}"><b>${m.name} · #${m.idx+1}</b><span>${m.msg}</span></button>`).join('')}</div>`
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
        <div class="an-sec-lbl">${tr('Düello Bazlı Doğruluk (İncelemek için tıkla)','Duel Accuracy (Click to inspect)')}</div>
        <div class="an-duels">${duelsHtml}</div>
      </div>`;
    }else if(st.duels.length>1&&selDuel===null){
      // Çok düellolu maçlarda önce düzenli Düello listesi gösterilir; tıklayınca o düellonun hamleleri açılır
      const duelCardsHtml=st.duels.map(d=>{
        const dMoves=results.filter(r=>r.duel===d.duel);
        const dErrs=dMoves.filter(r=>r.grade.cls==='blunder'||r.grade.cls==='mistake'||r.grade.cls==='inacc').length;
        const dBests=dMoves.filter(r=>r.grade.cls==='brill'||r.grade.cls==='best').length;
        const accCls=d.acc>=85?'good':d.acc>=68?'mid':'bad';
        return `<button type="button" class="an-duel-card" data-duel="${d.duel}">
          <div class="an-dc-l">
            <b>${tr('Düello','Duel')} ${d.duel}</b>
            <small>${d.moves} ${tr('hamle','moves')} · ★ ${dBests} ${tr('en iyi','best')}${dErrs?` · ! ${dErrs} ${tr('hata','slips')}`:''}</small>
          </div>
          <div class="an-dc-r">
            <span class="an-dc-acc ${accCls}">%${d.acc}</span>
            <span class="an-dc-go">▸</span>
          </div>
        </button>`;
      }).join('');
      bodyContent=`<div class="an-duel-hint">${tr('Hamleleri incelemek istediğin düelloyu seç:','Select a duel to inspect its moves:')}</div>
      <div class="an-list an-duel-pick-list">${duelCardsHtml}</div>`;
    }else{
      const activeDuel=selDuel!==null?selDuel:(st.duels[0]?st.duels[0].duel:1);
      const duelPool=results.map((r,i)=>({r,i})).filter(({r})=>st.duels.length<=1||r.duel===activeDuel);
      const dErrCnt=duelPool.filter(({r})=>r.grade.cls==='blunder'||r.grade.cls==='mistake'||r.grade.cls==='inacc').length;
      const dBestCnt=duelPool.filter(({r})=>r.grade.cls==='brill'||r.grade.cls==='best').length;
      const shown=duelPool.filter(({r})=>{
        if(anFilter==='crit')return r.grade.cls==='blunder'||r.grade.cls==='mistake'||r.grade.cls==='inacc';
        if(anFilter==='best')return r.grade.cls==='brill'||r.grade.cls==='best';
        return true;
      });
      const rowsHtml=shown.length?shown.map(({r,i})=>{
        const isOpen=i===openMoveIdx;
        const ctx=`D${r.duel}·T${r.round} · ${tr('Toplam','Tot')} ${r.myTot}/${r.low?tr('En Az','Low'):r.tg}`;
        const exactTag=r.exactUsed?`<span class="an-exact-tag" title="${tr('Kesin Matematiksel Çözüm (%0 varyans)','Exact Combinatorial Solution (0% variance)')}">∑ ${tr('Kesin','Exact')}</span>`:'';
        const hpTag=r.hpOpp?`<span class="an-hp-tag" title="${r.hpOpp.name}">${tr('Güç','Power')}</span>`:'';
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
            ${r.hpOpp?`<div class="an-hp-alert"><b>${tr('Kahraman Gücü Fırsatı','Hero Power Opportunity')} (${r.hpOpp.name}):</b> ${r.hpOpp.msg}</div>`:''}
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
      const duelNavHtml=st.duels.length>1?`<div class="an-duel-bar">
        <button type="button" class="an-db-back" data-duel-all="1">← ${tr('Düellolar','Duels')}</button>
        <div class="an-db-pills">${st.duels.map(d=>`<button type="button" class="an-db-pill${d.duel===activeDuel?' act':''}" data-duel="${d.duel}">${tr('D','D')}${d.duel} <i>%${d.acc}</i></button>`).join('')}</div>
      </div>`:'';
      bodyContent=`${duelNavHtml}<div class="an-filters">
        <button type="button" class="an-flt${anFilter==='all'?' act':''}" data-af="all">${tr('Tümü','All')} (${duelPool.length})</button>
        <button type="button" class="an-flt${anFilter==='crit'?' act':''}" data-af="crit">${tr('Hatalar','Mistakes')} (${dErrCnt})</button>
        <button type="button" class="an-flt${anFilter==='best'?' act':''}" data-af="best">${tr('En İyiler','Best')} (${dBestCnt})</button>
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
        <button type="button" class="an-vtab${anView==='moves'?' act':''}" data-av="moves">${tr('Düellolar & Hamleler','Duels & Moves')}</button>
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
    mb.querySelectorAll('[data-duel]').forEach(b=>b.onclick=()=>{snd('click');anView='moves';selDuel=+b.dataset.duel;anFilter='all';openMoveIdx=-1;renderReport()});
    mb.querySelectorAll('[data-duel-all]').forEach(b=>b.onclick=()=>{snd('click');selDuel=null;openMoveIdx=-1;renderReport()});
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
      if(results[mi])selDuel=results[mi].duel;
      renderReport(mi);
    });
    mb.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{
      const mi=+b.dataset.jump;
      snd('click');
      anView='moves';anFilter='all';openMoveIdx=mi;
      if(results[mi])selDuel=results[mi].duel;
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
const AUTH_HIST_MAX=50;
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
/* ---------- LİG, GİZLİ MMR, LP, YERLEŞTİRME & ÇİFTE TERFİ SİSTEMİ ---------- */
function isGuestUser(acc){
  return !acc||!!acc.isGuest||!isRegisteredMember(acc);
}
function openRankedGuestGateModal(){
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode','inv-mode','play-sheet');
  mb.classList.add('auth-mode','play-sheet');
  mb.innerHTML=`<div class="ps-wrap">
    <div class="ps-head">
      <span class="ps-kicker rk">${tr('Üyelere Özel','Members Only')}</span>
      <h3>${tr('Dereceli Oyun İçin Üye Ol','Sign Up for Ranked Play')}</h3>
    </div>
    <p style="text-align:center;color:#e6d5b5;font-size:15px;line-height:1.45;margin:2px 0 6px">${tr('Misafir hesapların ligi veya puanı yoktur ve yalnızca <b>Normal Oyun</b> oynayabilirler. 5 yerleştirme maçına girip liglerde yükselmek için ücretsiz hesap oluştur.','Guest accounts have no league or points and can only play <b>Normal Games</b>. Create a free account to play placements and climb the leagues.')}</p>
    <div class="ps-body">
      <button type="button" class="ps-card ps-card-main" id="rg-reg">
        <b>${tr('Ücretsiz Üye Ol','Create Free Account')}</b>
        <small>${tr('Lig sistemini, LP ilerlemesini ve sıralamayı aç','Unlock Leagues, LP progression, and Leaderboard')}</small>
      </button>
      <button type="button" class="ps-card" id="rg-log">
        <b>${tr('Giriş Yap','Sign In')}</b>
        <small>${tr('Mevcut hesabınla dereceli maçlara devam et','Continue ranked play with your existing account')}</small>
      </button>
    </div>
    <div class="row ps-acts"><button type="button" id="rg-close" class="btn alt sm">${tr('Normal Oyunda Kal','Stay in Normal Mode')}</button></div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode','play-sheet');$('#m').hidden=true;lock=false};
  if($('#rg-close'))$('#rg-close').onclick=()=>{snd('click');close()};
  if($('#rg-reg'))$('#rg-reg').onclick=()=>{snd('click');close();openAuthModal('register',true)};
  if($('#rg-log'))$('#rg-log').onclick=()=>{snd('click');close();openAuthModal('login',true)};
}
let QUEUE_MODE=(function(){try{const v=localStorage.getItem('nd_queue_mode');return (v==='normal'||v==='special')?v:'ranked'}catch(e){return 'ranked'}})();
function setQueueMode(m,fromUser=false){
  if(m==='ranked'&&isGuestUser(USER_ACC)){
    QUEUE_MODE='normal';
    try{localStorage.setItem('nd_queue_mode','normal')}catch(e){}
    if(typeof applyQueueModeUi==='function')applyQueueModeUi();
    if(fromUser)openRankedGuestGateModal();
    return;
  }
  QUEUE_MODE=(m==='normal'||m==='special')?m:'ranked';
  try{localStorage.setItem('nd_queue_mode',QUEUE_MODE)}catch(e){}
  if(typeof applyQueueModeUi==='function')applyQueueModeUi();
}
const LEAGUE_TIERS=[
  {id:'bronze',    idx:0, tr:'Bronz',        en:'Bronze',     apex:false, c1:'#d89253', c2:'#7a4018', c3:'#f4c48c', glow:'rgba(205,127,50,.48)'},
  {id:'silver',    idx:1, tr:'Gümüş',        en:'Silver',     apex:false, c1:'#dde6f0', c2:'#647488', c3:'#ffffff', glow:'rgba(198,214,232,.46)'},
  {id:'gold',      idx:2, tr:'Altın',        en:'Gold',       apex:false, c1:'#f6cf55', c2:'#8e5d10', c3:'#fff0a8', glow:'rgba(245,200,66,.52)'},
  {id:'emerald',   idx:3, tr:'Zümrüt',       en:'Emerald',    apex:false, c1:'#3ee08a', c2:'#0e5c34', c3:'#a8ffd0', glow:'rgba(46,204,113,.50)'},
  {id:'diamond',   idx:4, tr:'Elmas',        en:'Diamond',    apex:false, c1:'#6be0ff', c2:'#1b5d9e', c3:'#d6f7ff', glow:'rgba(92,214,255,.55)'},
  {id:'master',    idx:5, tr:'Ustalık',      en:'Master',     apex:true,  c1:'#c97cff', c2:'#561a8c', c3:'#f0d4ff', glow:'rgba(192,116,255,.58)'},
  {id:'challenger',idx:6, tr:'Şampiyonluk',  en:'Challenger', apex:true,  c1:'#ffe066', c2:'#c93622', c3:'#7ef3ff', glow:'rgba(255,214,82,.68)'}
];
const DIV_ROMAN=['','I','II','III','IV']; // div: 4=IV (en alt), 1=I (en üst)
const MASTER_PROMO_LP=200; // Ustalık -> Şampiyonluk terfi eşiği

function leagueStepIndex(tier,div){
  const t=Math.max(0,Math.min(6,tier|0));
  if(t<5){
    const d=Math.max(1,Math.min(4,div|0));
    return t*4+(4-d); // 0=Bronz IV ... 19=Elmas I
  }
  return t===5?20:21; // 20=Ustalık, 21=Şampiyonluk
}
function stepIndexToLeague(step){
  const s=Math.max(0,Math.min(21,step|0));
  if(s<20){
    const tier=Math.floor(s/4);
    const div=4-(s%4);
    return {tier,div};
  }
  return {tier:s===20?5:6,div:1};
}
function leagueToMmr(tier,div,lp=0){
  const step=leagueStepIndex(tier,div);
  if(step<20)return 800+step*80+Math.round((Math.max(0,Math.min(100,lp))/100)*80);
  if(step===20)return 2400+Math.round((Math.max(0,lp)/MASTER_PROMO_LP)*250);
  return 2650+Math.round(Math.max(0,lp)*1.2);
}
function mmrToLeague(mmr){
  const e=Math.max(600,Math.round(mmr||1200));
  if(e>=2650)return {tier:6,div:1,lp:Math.min(999,Math.round((e-2650)/1.2))};
  if(e>=2400)return {tier:5,div:1,lp:Math.min(MASTER_PROMO_LP-1,Math.round(((e-2400)/250)*MASTER_PROMO_LP))};
  const offset=Math.max(0,e-800);
  const step=Math.min(19,Math.floor(offset/80));
  const rem=offset-step*80;
  const {tier,div}=stepIndexToLeague(step);
  return {tier,div,lp:Math.max(0,Math.min(99,Math.round((rem/80)*100)))};
}
function leagueScoreKey(lg){
  if(!lg||lg.unranked)return -1;
  return leagueStepIndex(lg.tier,lg.div)*10000+Math.max(0,lg.lp|0);
}
function ensureLeagueState(acc){
  if(!acc)return {unranked:true,provisional:false,placementGames:0,placementWins:0,tier:0,div:4,lp:0,peakTier:0,peakDiv:4,peakLp:0,demoteShield:0};
  if(isGuestUser(acc)&&(!acc.league||typeof acc.league!=='object'||acc.league.unranked)){
    acc.league={unranked:false,provisional:false,placementGames:5,placementWins:0,tier:0,div:2,lp:0,peakTier:0,peakDiv:2,peakLp:0,demoteShield:1};
    return acc.league;
  }
  if(acc.league&&typeof acc.league==='object'&&typeof acc.league.placementGames==='number'){
    const lg=acc.league;
    lg.tier=Math.max(0,Math.min(6,lg.tier|0));
    lg.div=lg.tier>=5?1:Math.max(1,Math.min(4,lg.div|0));
    lg.lp=Math.max(0,lg.lp|0);
    lg.placementGames=Math.max(0,Math.min(5,lg.placementGames|0));
    lg.placementWins=Math.max(0,Math.min(lg.placementGames,lg.placementWins|0));
    lg.unranked=lg.placementGames===0;
    lg.provisional=lg.placementGames>0&&lg.placementGames<5;
    if(typeof lg.peakTier!=='number'){lg.peakTier=lg.tier;lg.peakDiv=lg.div;lg.peakLp=lg.lp;}
    if(typeof lg.demoteShield!=='number')lg.demoteShield=0;
    return lg;
  }
  const m=acc.matches||0;
  if(m<=0){
    acc.league={unranked:true,provisional:false,placementGames:0,placementWins:0,tier:0,div:4,lp:0,peakTier:0,peakDiv:4,peakLp:0,demoteShield:0};
    return acc.league;
  }
  const cur=mmrToLeague(acc.elo||1200);
  const pk=mmrToLeague(Math.max(acc.peakElo||1200,acc.elo||1200));
  const pg=Math.min(5,m);
  acc.league={
    unranked:false,
    provisional:pg<5,
    placementGames:pg,
    placementWins:Math.min(pg,acc.wins||0),
    tier:cur.tier,div:cur.div,lp:cur.lp,
    peakTier:pk.tier,peakDiv:pk.div,peakLp:pk.lp,
    demoteShield:1
  };
  return acc.league;
}
function leagueCrestSvg(tierId,size=28){
  const t=LEAGUE_TIERS.find(x=>x.id===tierId);
  const id='lg_'+String(tierId||'unr')+'_'+size+'_'+(Math.random().toString(36).slice(2,6));
  if(!t){
    return `<svg class="lg-svg lg-unr" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8a9099"/><stop offset="100%" stop-color="#3c424a"/></linearGradient></defs>
      <path d="M32 6 L54 15 V33 C54 46 43 55 32 59 C21 55 10 46 10 33 V15 Z" fill="url(#${id})" stroke="#a8b0ba" stroke-width="2.5"/>
      <path d="M32 13 L47 19 V32 C47 41 39 48 32 51 C25 48 17 41 17 32 V19 Z" fill="#17191d" stroke="#666d78" stroke-width="1.5"/>
      <path d="M32 21 L39 32 L32 43 L25 32 Z" fill="#6f7782" opacity=".75"/>
    </svg>`;
  }
  const innerGlyphs={
    bronze:`<path d="M32 19 L41 32 L32 45 L23 32 Z" fill="${t.c3}" opacity=".9"/><path d="M32 24 L37 32 L32 40 L27 32 Z" fill="${t.c2}"/>`,
    silver:`<path d="M19 25 L32 17 L45 25 L39 39 L32 46 L25 39 Z" fill="${t.c1}" opacity=".92"/><path d="M32 21 L38 31 L32 41 L26 31 Z" fill="${t.c3}"/>`,
    gold:`<path d="M20 35 L23 22 L32 28 L41 22 L44 35 L32 45 Z" fill="${t.c3}"/><circle cx="32" cy="34" r="4" fill="${t.c2}"/>`,
    emerald:`<polygon points="32,16 44,28 38,45 26,45 20,28" fill="${t.c3}" opacity=".95"/><polygon points="32,21 39,29 35,41 29,41 25,29" fill="${t.c2}"/>`,
    diamond:`<polygon points="32,15 46,31 32,48 18,31" fill="${t.c3}"/><polygon points="32,20 40,31 32,42 24,31" fill="${t.c1}"/><polygon points="32,25 36,31 32,37 28,31" fill="#ffffff"/>`,
    master:`<path d="M18 33 L25 19 L32 27 L39 19 L46 33 L32 47 Z" fill="${t.c3}"/><circle cx="32" cy="32" r="5.5" fill="${t.c2}" stroke="#fff" stroke-width="1.4"/>`,
    challenger:`<path d="M16 32 L22 17 L32 25 L42 17 L48 32 L32 49 Z" fill="${t.c1}" stroke="#fff" stroke-width="1.2"/><polygon points="32,22 38,32 32,42 26,32" fill="${t.c3}"/><circle cx="32" cy="32" r="3.2" fill="#fff"/>`
  };
  const crown=t.idx>=5?`<path d="M22 11 L27 5 L32 10 L37 5 L42 11 Z" fill="${t.c3}" stroke="${t.c2}" stroke-width="1.2"/>`:'';
  return `<svg class="lg-svg lg-${t.id}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${t.c3}"/><stop offset="45%" stop-color="${t.c1}"/><stop offset="100%" stop-color="${t.c2}"/></linearGradient>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1b1512"/><stop offset="100%" stop-color="#0b0908"/></linearGradient>
    </defs>
    ${crown}
    <path d="M32 7 L54 16 V33 C54 46 43 55 32 59 C21 55 10 46 10 33 V16 Z" fill="url(#${id}a)" stroke="${t.c3}" stroke-width="2.2"/>
    <path d="M32 13 L48 19.5 V32.5 C48 42 40 49 32 52.5 C24 49 16 42 16 32.5 V19.5 Z" fill="url(#${id}b)" stroke="${t.c1}" stroke-width="1.4"/>
    ${innerGlyphs[t.id]||''}
  </svg>`;
}
function formatLeague(lg,withLp=false){
  if(!lg||lg.unranked){
    const pg=(lg&&lg.placementGames)||0;
    return {
      id:'unranked',tier:-1,div:0,lp:0,
      name:tr('Derecesiz','Unranked'),
      shortName:tr('Derecesiz','Unranked'),
      fullLabel:tr(`Derecesiz (${pg}/5)`,`Unranked (${pg}/5)`),
      lpCap:100,cls:'rk-unr',c1:'#8a9099',glow:'rgba(140,148,160,.35)',
      unranked:true,provisional:false,placementGames:pg
    };
  }
  const t=LEAGUE_TIERS[Math.max(0,Math.min(6,lg.tier|0))]||LEAGUE_TIERS[0];
  const nm=isEn()?t.en:t.tr;
  const rom=t.apex?'':(' '+(DIV_ROMAN[lg.div]||'IV'));
  const lp=Math.max(0,lg.lp|0);
  const lpCap=t.id==='master'?MASTER_PROMO_LP:100;
  const provTag=lg.provisional?` (${tr('Geçici','Prov.')})`:'';
  return {
    id:t.id,tier:t.idx,div:t.apex?1:(lg.div||4),lp,lpCap,
    name:nm+rom,
    shortName:nm+rom,
    fullLabel:nm+rom+(withLp?` · ${lp} LP`:'')+provTag,
    cls:'rk-'+t.id,c1:t.c1,glow:t.glow,
    unranked:false,provisional:!!lg.provisional,placementGames:lg.placementGames||5
  };
}
function getAccountLeague(acc){
  if(!acc)return formatLeague(null,false);
  const lg=ensureLeagueState(acc);
  return formatLeague(lg,false);
}
function eloRank(eloOrAcc){
  if(eloOrAcc&&typeof eloOrAcc==='object'){
    const fl=getAccountLeague(eloOrAcc);
    return {ic:leagueCrestSvg(fl.id,22),name:fl.name,cls:fl.cls,id:fl.id,fl};
  }
  const cur=mmrToLeague(eloOrAcc||1200);
  const fl=formatLeague({...cur,unranked:false,provisional:false,placementGames:5},false);
  return {ic:leagueCrestSvg(fl.id,22),name:fl.name,cls:fl.cls,id:fl.id,fl};
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
function mergeMatchHistory(h1,h2){
  const out=[];
  const all=[...(Array.isArray(h1)?h1:[]),...(Array.isArray(h2)?h2:[])].filter(x=>x&&typeof x==='object');
  all.sort((a,b)=>(b.ts||0)-(a.ts||0));
  for(const item of all){
    const dup=out.some(e=>e.ts===item.ts||(Math.abs((e.ts||0)-(item.ts||0))<1500&&e.opp===item.opp&&!!e.won===!!item.won&&e.delta===item.delta));
    if(!dup)out.push(item);
    if(out.length>=AUTH_HIST_MAX)break;
  }
  return out;
}
function reconcileStatsFromHistory(acc){
  if(!acc)return acc;
  const history=mergeMatchHistory(acc.history,[]);
  let hRw=0,hRl=0,hUw=0,hUl=0;
  history.forEach(h=>{if(!h)return;if(h.unranked){if(h.won)hUw++;else hUl++;}else{if(h.won)hRw++;else hRl++;}});
  const wins=Math.max(acc.wins||0,hRw),losses=Math.max(acc.losses||0,hRl);
  const uWins=Math.max(acc.unrankedWins||0,hUw),uLosses=Math.max(acc.unrankedLosses||0,hUl);
  return {...acc,history,wins,losses,matches:Math.max(acc.matches||0,wins+losses),unrankedWins:uWins,unrankedLosses:uLosses,unrankedMatches:Math.max(acc.unrankedMatches||0,uWins+uLosses)};
}
function mergeAccountData(localAcc,cloudAcc){
  if(!localAcc&&!cloudAcc)return null;
  if(!localAcc)return reconcileStatsFromHistory(cloudAcc);
  if(!cloudAcc)return reconcileStatsFromHistory(localAcc);
  const lTot=(localAcc.matches||0)+(localAcc.unrankedMatches||0);
  const cTot=(cloudAcc.matches||0)+(cloudAcc.unrankedMatches||0);
  const lUp=localAcc.updatedAt||0,cUp=cloudAcc.updatedAt||0;
  const preferLocal=(lTot>cTot)||(lTot===cTot&&lUp>=cUp);
  const pri=preferLocal?localAcc:cloudAcc;
  const sec=preferLocal?cloudAcc:localAcc;
  const history=mergeMatchHistory(localAcc.history,cloudAcc.history);
  let hRw=0,hRl=0,hUw=0,hUl=0;
  history.forEach(h=>{if(!h)return;if(h.unranked){if(h.won)hUw++;else hUl++;}else{if(h.won)hRw++;else hRl++;}});
  const wins=Math.max(localAcc.wins||0,cloudAcc.wins||0,hRw);
  const losses=Math.max(localAcc.losses||0,cloudAcc.losses||0,hRl);
  const matches=Math.max(localAcc.matches||0,cloudAcc.matches||0,wins+losses);
  const uWins=Math.max(localAcc.unrankedWins||0,cloudAcc.unrankedWins||0,hUw);
  const uLosses=Math.max(localAcc.unrankedLosses||0,cloudAcc.unrankedLosses||0,hUl);
  const uMatches=Math.max(localAcc.unrankedMatches||0,cloudAcc.unrankedMatches||0,uWins+uLosses);
  const elo=typeof pri.elo==='number'?Math.round(pri.elo):(typeof sec.elo==='number'?Math.round(sec.elo):1200);
  const peakElo=Math.max(localAcc.peakElo||localAcc.elo||1200,cloudAcc.peakElo||cloudAcc.elo||1200,elo);
  const lDay=localAcc.lastStreakDay||'',cDay=cloudAcc.lastStreakDay||'';
  const lastStreakDay=lDay>=cDay?lDay:cDay;
  const streak=lDay>cDay?(localAcc.streak||1):(cDay>lDay?(cloudAcc.streak||1):Math.max(localAcc.streak||1,cloudAcc.streak||1));
  const bestStreak=Math.max(localAcc.bestStreak||0,cloudAcc.bestStreak||0,streak);
  const achSet=new Set([...(Array.isArray(localAcc.achievements)?localAcc.achievements:[]),...(Array.isArray(cloudAcc.achievements)?cloudAcc.achievements:[])]);
  const hStats={};
  const addHS=src=>{
    if(!src||typeof src!=='object')return;
    for(const [k,v] of Object.entries(src)){
      if(!v)continue;
      if(!hStats[k])hStats[k]={w:0,l:0};
      hStats[k].w=Math.max(hStats[k].w,v.w||0);
      hStats[k].l=Math.max(hStats[k].l,v.l||0);
    }
  };
  addHS(localAcc.heroStats);addHS(cloudAcc.heroStats);
  const lq=localAcc.quests,cq=cloudAcc.quests;
  const quests=(lq&&cq&&lq.day===cq.day)?{day:lq.day,items:(lq.items||[]).map((it,i)=>({...it,cur:Math.max(it.cur||0,(cq.items&&cq.items[i]?cq.items[i].cur||0:0))}))}:((lq&&(!cq||(lq.day||'')>=(cq.day||'')))?lq:(cq||null));
  return {
    uid:pri.uid||sec.uid||('u_'+(pri.key||sec.key||'')),
    key:pri.key||sec.key||'',
    username:pri.username||sec.username||'',
    passHash:pri.passHash||sec.passHash||'',
    isGuest:false,
    elo,
    peakElo,
    wins,
    losses,
    matches,
    unrankedWins:uWins,
    unrankedLosses:uLosses,
    unrankedMatches:uMatches,
    streak,
    bestStreak,
    lastStreakDay,
    winStreak:Math.max(pri.winStreak||0,0),
    achievements:[...achSet],
    title:pri.title||sec.title||'',
    cardBack:pri.cardBack||sec.cardBack||'classic',
    diceSkin:pri.diceSkin||sec.diceSkin||'ruby',
    boardTheme:pri.boardTheme||sec.boardTheme||'classic',
    d20Effect:pri.d20Effect||sec.d20Effect||'classic',
    frame:pri.frame||sec.frame||'classic',
    puzzleStreak:Math.max(localAcc.puzzleStreak||0,cloudAcc.puzzleStreak||0),
    lastPuzzleDay:(localAcc.lastPuzzleDay||'')>=(cloudAcc.lastPuzzleDay||'')?(localAcc.lastPuzzleDay||''):(cloudAcc.lastPuzzleDay||''),
    vaultBest:Math.max(localAcc.vaultBest||0,cloudAcc.vaultBest||0),
    vaultWins:Math.max(localAcc.vaultWins||0,cloudAcc.vaultWins||0),
    heroStats:hStats,
    league:pri.league||sec.league||null,
    quests,
    history,
    createdAt:Math.min(localAcc.createdAt||Date.now(),cloudAcc.createdAt||Date.now()),
    updatedAt:Math.max(lUp,cUp,Date.now())
  };
}
function isRegisteredMember(u){
  if(!u||typeof u!=='object')return false;
  if(u.isGuest)return false;
  if(u.uid&&String(u.uid).startsWith('guest_'))return false;
  const nm=normUserKey(u.username||'');
  if(!nm||nm==='misafir'||nm==='guest')return false;
  if(!u.passHash)return false;
  return true;
}
function computeAccountSig(acc){
  if(!acc)return '';
  return hashPass(`${acc.key||''}:${Math.round(acc.elo||1200)}:${acc.wins||0}:${acc.losses||0}:${acc.matches||0}:${(acc.achievements||[]).length}`);
}
function saveSession(acc,syncCloud=true){
  if(acc){
    acc.updatedAt=Date.now();
    acc.elo=Math.max(400,Math.min(3000,Math.round(acc.elo||1200)));
    acc._sig=computeAccountSig(acc);
  }
  USER_ACC=acc;
  if(typeof applyCosmetics==='function')applyCosmetics(acc);
  try{
    if(acc)localStorage.setItem(AUTH_SESS_KEY,JSON.stringify(acc));
    else localStorage.removeItem(AUTH_SESS_KEY);
  }catch(e){}
  if(isRegisteredMember(acc)&&acc.key){
    const map=loadLocalUsers();
    map[acc.key]={...(map[acc.key]||{}),...acc};
    saveLocalUsers(map);
    if(syncCloud)syncAccountToCloud(acc);
    if(typeof claimActiveSession==='function'&&fbDb)claimActiveSession(acc);
  }else if(!acc&&typeof stopSessionWatch==='function'){
    stopSessionWatch();SESSION_KICKED=false;
  }
  renderAuthBar();
  if(typeof startLobbyPresence==='function'&&fbDb)startLobbyPresence();
}
function dayKey(offsetDays=0){
  const d=new Date();
  if(offsetDays)d.setDate(d.getDate()+offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function showStreakToast(streak,continued){
  if(!streak||streak<1)return;
  const old=document.getElementById('streak-toast');
  if(old)old.remove();
  const el=document.createElement('div');
  el.id='streak-toast';
  el.className='streak-toast';
  const title=streak===1
    ?tr('Günlük Seri Başladı!','Daily Streak Started!')
    :tr(`${streak} Günlük Seri!`,`${streak}-Day Streak!`);
  const sub=continued
    ?tr('Her gün gelmeye devam et, serini büyüt!','Keep coming back daily to grow your streak!')
    :tr('Yarın tekrar girerek serini 2 güne çıkar.','Return tomorrow to reach a 2-day streak.');
  el.innerHTML=`<span class="st-fire">✦</span><div class="st-txt"><b>${title}</b><small>${sub}</small></div>`;
  document.body.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),420)},3600);
}
function updateDailyStreak(acc,silent=false){
  if(!acc)return false;
  const today=dayKey(0),yest=dayKey(-1);
  if(acc.lastStreakDay===today){
    if(!acc.streak)acc.streak=1;
    if(!acc.bestStreak)acc.bestStreak=acc.streak;
    return false;
  }
  const continued=acc.lastStreakDay===yest;
  acc.streak=continued?((acc.streak|0)+1):1;
  acc.bestStreak=Math.max(acc.bestStreak|0,acc.streak);
  acc.lastStreakDay=today;
  saveSession(acc);
  if(!silent)showStreakToast(acc.streak,continued);
  return true;
}
const SESSION_TOKEN='s_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
let SESSION_KICKED=false,SESSION_WATCH_UNSUB=null,SESSION_WATCH_KEY='';
function stopSessionWatch(){
  if(SESSION_WATCH_UNSUB){try{SESSION_WATCH_UNSUB()}catch(e){}SESSION_WATCH_UNSUB=null}
  SESSION_WATCH_KEY='';
}
function handleSessionKicked(){
  if(SESSION_KICKED)return;
  SESSION_KICKED=true;
  botGen++;thinkOn=false;
  try{if(LOBBY_HB_TIMER){clearInterval(LOBBY_HB_TIMER);LOBBY_HB_TIMER=null}}catch(e){}
  try{if(typeof clearOnlineDraft==='function')clearOnlineDraft()}catch(e){}
  try{if(typeof stopBotSpectateHost==='function')stopBotSpectateHost()}catch(e){}
  try{if(conn)conn.close()}catch(e){}
  try{if(peer)peer.destroy()}catch(e){}
  conn=null;peer=null;spectators=[];MODE='bot';
  const menuEl=$('#menu');if(menuEl)menuEl.hidden=false;
  setMusic('menu');
  const key=USER_ACC&&USER_ACC.key;
  box(`<div class="lobby-box">
    <h3 style="margin-bottom:8px">${tr('Başka Cihazda Oturum Açıldı','Signed In on Another Device')}</h3>
    <p style="color:var(--bone);font-size:16px;line-height:1.45">${tr('Bu hesap başka bir cihazda veya sekmede açıldığı için buradaki oturum kapatıldı.','This account was opened on another device or tab, so this session has been closed.')}</p>
    <div class="row" style="margin-top:14px">
      <button type="button" id="sk-takeover" class="btn">${tr('Bu Cihazda Devam Et','Continue on This Device')}</button>
    </div>
  </div>`,false);
  const btn=$('#sk-takeover');
  if(btn)btn.onclick=async()=>{
    snd('click');
    btn.disabled=true;
    SESSION_KICKED=false;
    if(key)await pullAccountFromCloud(key);
    if(isRegisteredMember(USER_ACC))claimActiveSession(USER_ACC,true);
    $('#m').hidden=true;lock=false;st('');
    if(fbDb&&typeof startLobbyPresence==='function')startLobbyPresence();
  };
}
function claimActiveSession(acc,force=false){
  if(!fbDb||!isRegisteredMember(acc)||!acc.key)return;
  if(!force&&SESSION_WATCH_KEY===acc.key&&SESSION_WATCH_UNSUB&&!SESSION_KICKED)return;
  stopSessionWatch();
  SESSION_KICKED=false;
  SESSION_WATCH_KEY=acc.key;
  const ref=fbDb.collection('users').doc(acc.key);
  ref.set({activeSessionId:SESSION_TOKEN,activeSessionAt:Date.now()},{merge:true}).catch(()=>{});
  let seenOwn=false;
  SESSION_WATCH_UNSUB=ref.onSnapshot(snap=>{
    if(!snap.exists||!USER_ACC||USER_ACC.key!==acc.key)return;
    const d=snap.data();
    if(!d||!d.activeSessionId)return;
    if(d.activeSessionId===SESSION_TOKEN){seenOwn=true;return;}
    if(seenOwn||(d.activeSessionAt&&d.activeSessionAt>Date.now()-15000)){
      handleSessionKicked();
    }
  },()=>{});
}
function syncAccountToCloud(acc){
  if(SESSION_KICKED||!fbDb||!isRegisteredMember(acc)||!acc.key)return;
  const ref=fbDb.collection('users').doc(acc.key);
  const toPayload=a=>({
    key:a.key,
    username:a.username,
    passHash:a.passHash||'',
    elo:Math.round(a.elo||1200),
    peakElo:Math.round(a.peakElo||a.elo||1200),
    wins:a.wins||0,
    losses:a.losses||0,
    matches:a.matches||0,
    unrankedWins:a.unrankedWins||0,
    unrankedLosses:a.unrankedLosses||0,
    unrankedMatches:a.unrankedMatches||0,
    streak:a.streak||1,
    bestStreak:a.bestStreak||a.streak||1,
    lastStreakDay:a.lastStreakDay||dayKey(0),
    winStreak:a.winStreak||0,
    achievements:Array.isArray(a.achievements)?a.achievements:[],
    title:a.title||'',
    cardBack:a.cardBack||'classic',
    diceSkin:a.diceSkin||'ruby',
    boardTheme:a.boardTheme||'classic',
    d20Effect:a.d20Effect||'classic',
    frame:a.frame||'classic',
    puzzleStreak:a.puzzleStreak||0,
    lastPuzzleDay:a.lastPuzzleDay||'',
    vaultBest:a.vaultBest||0,
    vaultWins:a.vaultWins||0,
    heroStats:a.heroStats||{},
    league:a.league||null,
    quests:a.quests||null,
    _sig:a._sig||computeAccountSig(a),
    history:(a.history||[]).slice(0,AUTH_HIST_MAX),
    createdAt:a.createdAt||Date.now(),
    updatedAt:Date.now()
  });
  try{
    fbDb.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      let finalAcc=acc;
      if(snap.exists){
        const cloud=snap.data();
        if(cloud&&cloud.key===acc.key){
          finalAcc=mergeAccountData(acc,cloud);
          // Eğer iki cihazda farklı yeni dereceli maçlar oynandıysa gizli MMR'ı birleşik geçmişten tutarlı hesapla
          const rkHist=(finalAcc.history||[]).filter(h=>h&&!h.unranked);
          if(rkHist.length>0&&rkHist.length===finalAcc.matches&&rkHist.every(h=>h.mmrDelta!=null||h.lpDelta==null)){
            const calcElo=Math.max(400,Math.min(3000,1200+rkHist.reduce((s,h)=>s+(h.mmrDelta!=null?+h.mmrDelta:(+h.delta||0)),0)));
            finalAcc.elo=calcElo;
            finalAcc.peakElo=Math.max(finalAcc.peakElo||1200,calcElo);
          }
          finalAcc._sig=computeAccountSig(finalAcc);
        }
      }
      const payload=toPayload(finalAcc);
      tx.set(ref,payload,{merge:true});
      return finalAcc;
    }).then(merged=>{
      if(merged&&USER_ACC&&USER_ACC.key===merged.key){
        USER_ACC=merged;
        try{
          localStorage.setItem(AUTH_SESS_KEY,JSON.stringify(merged));
          const map=loadLocalUsers();map[merged.key]={...(map[merged.key]||{}),...merged};saveLocalUsers(map);
        }catch(e){}
        renderAuthBar();
      }
    }).catch(e=>console.warn('Account cloud sync error:',e));
  }catch(e){console.warn('Account cloud sync error:',e)}
}
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&isRegisteredMember(USER_ACC)&&USER_ACC.key&&fbDb){
    pullAccountFromCloud(USER_ACC.key).then(cloud=>{
      if(cloud&&USER_ACC&&USER_ACC.key===cloud.key){
        const merged=mergeAccountData(USER_ACC,cloud);
        if(merged&&(merged.matches!==USER_ACC.matches||merged.elo!==USER_ACC.elo)){
          saveSession(merged,false);
        }
      }
    }).catch(()=>{});
  }
});
async function pullAccountFromCloud(key){
  if(!fbDb||!key)return null;
  try{
    const snap=await fbDb.collection('users').doc(key).get();
    const cloudDoc=snap.exists?snap.data():null;
    const localMap=loadLocalUsers();
    const localBase=(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.key===key)
      ?mergeAccountData(USER_ACC,localMap[key]||null)
      :(localMap[key]||null);
    if(!cloudDoc){
      if(localBase)syncAccountToCloud(localBase);
      return localBase;
    }
    const merged=mergeAccountData(localBase,cloudDoc);
    if(!merged)return null;
    const needPush=!cloudDoc.history||(merged.history.length>(cloudDoc.history||[]).length)||((merged.matches||0)>(cloudDoc.matches||0))||((merged.unrankedMatches||0)>(cloudDoc.unrankedMatches||0));
    localMap[key]=merged;
    saveLocalUsers(localMap);
    if(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.key===key){
      USER_ACC=merged;
      try{localStorage.setItem(AUTH_SESS_KEY,JSON.stringify(merged))}catch(e){}
      renderAuthBar();
    }
    if(needPush)syncAccountToCloud(merged);
    return merged;
  }catch(e){
    console.warn('Account cloud pull error:',e);
    return null;
  }
}
function createGuestAccount(){
  const today=dayKey(0);
  const acc={
    uid:'guest_'+Date.now().toString(36),
    key:'',
    username:tr('Misafir','Guest'),
    isGuest:true,
    elo:960,
    peakElo:960,
    league:{unranked:false,provisional:false,placementGames:5,placementWins:0,tier:0,div:2,lp:0,peakTier:0,peakDiv:2,peakLp:0,demoteShield:1},
    wins:0,
    losses:0,
    matches:0,
    unrankedWins:0,
    unrankedLosses:0,
    unrankedMatches:0,
    streak:1,
    bestStreak:1,
    lastStreakDay:today,
    history:[],
    createdAt:Date.now(),
    updatedAt:Date.now()
  };
  saveSession(acc);
  showStreakToast(1,false);
  return acc;
}
function isMatchRanked(){
  if(isGuestUser(USER_ACC))return false;
  if(MODE==='tutorial'||MODE==='spectator')return false;
  if(CURSED_RULE||VAULT_RUN||PUZZLE_ACTIVE)return false;
  if(QUEUE_MODE!=='ranked')return false;
  if(MODE==='bot'&&(DIFF==='easy'||DIFF==='med'))return false;
  return true;
}
function getOppElo(){
  // Yapay zeka gizli MMR'ı (oyuncuya hiçbir yerde gösterilmez, sadece MMR/LP hesabında kullanılır)
  if(MODE==='bot'){
    if(DIFF==='hard')return 1220; // Gizli Gümüş II-III seviyesi
    if(DIFF==='imp')return 1760;  // Gizli Zümrüt IV seviyesi
    return 0;
  }
  return (OPP_PROFILE&&typeof OPP_PROFILE.elo==='number'&&OPP_PROFILE.elo>=400)?Math.round(OPP_PROFILE.elo):1200;
}
function getOppLabel(S){
  if(MODE==='bot'){
    const oppH=(S&&S.hero&&S.hero[1])||(G&&G.hero&&G.hero[1])||'';
    const hName=(oppH&&NAMES[oppH])?NAMES[oppH]:tr('Bot','Bot');
    if(DIFF==='easy')return `${hName} (${tr('Kolay','Easy')})`;
    if(DIFF==='med')return `${hName} (${tr('Orta','Medium')})`;
    if(DIFF==='hard')return `${hName} (${tr('Zor','Hard')})`;
    if(DIFF==='imp')return `${hName} (${tr('İmkansız','Impossible')})`;
  }
  if(OPP_PROFILE&&OPP_PROFILE.name)return OPP_PROFILE.name;
  return tr('Çevrim İçi Rakip','Online Opponent');
}
function calcHiddenMmrDelta(acc,won,ctx={}){
  const before=Math.round((acc&&acc.elo)||1200);
  const oppMmr=getOppElo();
  const expected=1/(1+Math.pow(10,(oppMmr-before)/400));
  const lg=ensureLeagueState(acc);
  const matches=acc.matches||0;
  const wins=acc.wins||0;
  const wr=matches>=5?(wins/matches):0.5;
  const streak=acc.winStreak||0;
  let K=(lg.placementGames<5)?68:(matches<15?36:26);
  if(MODE==='bot'&&DIFF==='hard')K=Math.round(K*0.72);
  else if(MODE==='bot'&&DIFF==='imp')K=Math.round(K*0.88);
  let delta=Math.round(K*((won?1:0)-expected));
  // Kazanma oranı momentumu (LoL gizli MMR mantığı)
  if(matches>=5){
    if(won&&wr>=0.60)delta+=Math.min(6,Math.round((wr-0.55)*22));
    else if(!won&&wr<=0.42)delta-=Math.min(5,Math.round((0.45-wr)*20));
  }
  // Hızlı / baskın galibiyet bonusu (küçük ama hissedilir)
  let speedBonus=0;
  if(won){
    const sec=ctx.sec||240,rw=ctx.rw||0,rl=ctx.rl||0;
    if(sec<=120)speedBonus+=3;
    else if(sec<=185)speedBonus+=2;
    else if(sec<=250)speedBonus+=1;
    if(rw>=2&&rl===0)speedBonus+=1;
    delta+=speedBonus;
    if(streak>=3)delta+=Math.min(8,(streak-2)*2);
    const minGain=(MODE==='bot'&&DIFF==='hard')?5:6;
    if(delta<minGain)delta=minGain;
  }else{
    const minLoss=(MODE==='bot'&&DIFF==='imp')?-8:-6;
    if(delta>minLoss)delta=minLoss;
  }
  return {delta,speedBonus};
}
function calcEloDelta(before,matches,won){
  const tmp={elo:before,matches,wins:Math.round(matches*0.5),winStreak:0,league:{placementGames:Math.min(5,matches)}};
  return calcHiddenMmrDelta(tmp,won,{}).delta;
}
function peekLossElo(S){
  if(!S||S._eloRes||!isMatchRanked())return 0;
  const acc=USER_ACC||{elo:1200,matches:0};
  const lg=ensureLeagueState(acc);
  if(lg.placementGames<5)return -1; // Yerleştirmede mağlubiyet sayılır (LP düşmez ama maç kaybedilir)
  const visMmr=leagueToMmr(lg.tier,lg.div,lg.lp);
  const mmrGap=(acc.elo||1200)-visMmr;
  return Math.max(-28,Math.min(-10,Math.round(-18+mmrGap*0.055)));
}
function recordMatchElo(S,won){
  if(typeof clearActiveMatchSnapshot==='function')clearActiveMatchSnapshot();
  if(!S||MODE==='tutorial'||MODE==='spectator')return null;
  if(S._eloRes)return S._eloRes;
  if(!USER_ACC)createGuestAccount();
  const acc=USER_ACC;
  const lg=ensureLeagueState(acc);
  const beforeMmr=Math.round(acc.elo||1200);
  let rw=0,rl=0;
  if(S.stats&&Array.isArray(S.stats.rounds)){
    rw=S.stats.rounds[0]||0;
    rl=S.stats.rounds[1]||0;
  }else if(Array.isArray(S.res)){
    rw=S.res.filter(x=>x>0).length;
    rl=S.res.filter(x=>x<0).length;
  }
  const sec=Math.max(10,Math.round((Date.now()-((S.stats&&S.stats.startAt)||Date.now()))/1000));
  const score=(rw||rl)?`${rw}-${rl}`:'';
  const myHero=(S.hero&&S.hero[0])||MY_HERO||'';
  const oppHero=(S.hero&&S.hero[1])||'';
  if(myHero){
    acc.heroStats=acc.heroStats||{};
    if(!acc.heroStats[myHero])acc.heroStats[myHero]={w:0,l:0};
    if(won)acc.heroStats[myHero].w++;
    else acc.heroStats[myHero].l++;
  }
  acc.winStreak=won?((acc.winStreak||0)+1):0;
  const myJokersUsed=(S.stats&&S.stats.jokers)?(S.stats.jokers[0]||0):0;
  const myD20Surv=(S.stats&&S.stats.d20Surv)?(S.stats.d20Surv[0]||0):0;

  // Normal Oyun, Kolay/Orta Bot ve Özel Modlar derecesizdir (LP / Lig / MMR değişmez)
  if(!isMatchRanked()){
    acc.unrankedMatches=(acc.unrankedMatches||0)+1;
    if(won)acc.unrankedWins=(acc.unrankedWins||0)+1;
    else acc.unrankedLosses=(acc.unrankedLosses||0)+1;
    acc.history=acc.history||[];
    acc.history.unshift({ts:Date.now(),opp:getOppLabel(S),won:!!won,delta:0,lpDelta:0,mmrDelta:0,elo:beforeMmr,unranked:true,mode:MODE,diff:DIFF,score,myHero,oppHero});
    if(acc.history.length>AUTH_HIST_MAX)acc.history.length=AUTH_HIST_MAX;
    if(typeof progressQuest==='function'){progressQuest('play2',1,true);if(won)progressQuest('win1',1,true)}
    if(typeof evaluateAchievements==='function')evaluateAchievements(acc,{won,mode:MODE,diff:DIFF,myJokersUsed,myD20Surv});
    saveSession(acc);
    const curFl=formatLeague(lg,false);
    S._eloRes={before:beforeMmr,after:beforeMmr,delta:0,lpBefore:lg.lp,lpAfter:lg.lp,lpDelta:0,beforeLg:curFl,afterLg:curFl,rank:eloRank(acc),unranked:true};
    return S._eloRes;
  }

  // --- DERECELİ MAÇ: GİZLİ MMR + LİG / LP / YERLEŞTİRME / ÇİFTE TERFİ ---
  const beforeLg=formatLeague(lg,false);
  const lpBefore=lg.unranked?0:(lg.lp|0);
  const {delta:mmrDelta,speedBonus}=calcHiddenMmrDelta(acc,won,{sec,rw,rl});
  const afterMmr=Math.max(600,Math.min(3400,beforeMmr+mmrDelta));
  acc.elo=afterMmr;
  acc.peakElo=Math.max(acc.peakElo||beforeMmr,afterMmr);
  acc.matches=(acc.matches||0)+1;
  if(won)acc.wins=(acc.wins||0)+1;
  else acc.losses=(acc.losses||0)+1;

  let lpDelta=0,promoted=false,doublePromoted=false,demoted=false,shieldUsed=false;
  let placementMatch=0,placementComplete=false;

  if(lg.placementGames<5){
    // 5 Maçlık Yerleştirme Süreci (LoL mantığı)
    lg.placementGames++;
    placementMatch=lg.placementGames;
    if(won)lg.placementWins=(lg.placementWins||0)+1;

    if(lg.placementGames===1){
      // 1. Maçtan sonra geçici lige yerleştir (biraz muhafazakâr başlangıç + esnek tırmanış)
      const seedMmr=Math.max(820,afterMmr-(won?150:260));
      const seeded=mmrToLeague(seedMmr);
      lg.unranked=false;
      lg.provisional=true;
      lg.tier=Math.min(3,seeded.tier); // İlk maçta en fazla Zümrüt IV
      lg.div=seeded.div;
      lg.lp=won?Math.max(25,Math.min(78,seeded.lp+20)):Math.max(0,Math.min(35,seeded.lp));
      lg.demoteShield=2;
      lpDelta=lg.lp;
      promoted=true;
    }else{
      if(won){
        const visMmr=leagueToMmr(lg.tier,lg.div,lg.lp);
        const gap=afterMmr-visMmr;
        const pGain=Math.max(42,Math.min(82,Math.round(52+gap*0.08+speedBonus*2+(acc.winStreak>=3?6:0))));
        lpDelta=pGain;
        lg.lp+=pGain;
        let step=leagueStepIndex(lg.tier,lg.div);
        while(step<19&&lg.lp>=100){
          lg.lp-=100;
          step++;
          promoted=true;
        }
        const nl=stepIndexToLeague(step);
        lg.tier=nl.tier;lg.div=nl.div;
      }else{
        // LoL yerleştirme kuralı: yerleştirmede mağlubiyet LP düşürmez, sadece gizli MMR ayarlanır
        lpDelta=0;
      }
      if(lg.placementGames>=5){
        lg.provisional=false;
        placementComplete=true;
        lg.demoteShield=3;
      }
    }
  }else{
    // Normal Dereceli Maç (5 yerleştirme sonrası)
    const visMmr=leagueToMmr(lg.tier,lg.div,lg.lp);
    const mmrGap=afterMmr-visMmr;
    const wr=acc.matches>0?(acc.wins/acc.matches):0.5;

    if(won){
      const spLp=speedBonus>=3?3:(speedBonus>=2?2:(speedBonus>=1?1:0));
      const stLp=acc.winStreak>=4?3:(acc.winStreak>=3?2:0);
      lpDelta=Math.max(13,Math.min(38,Math.round(20+mmrGap*0.065+spLp+stLp)));
      lg.lp+=lpDelta;

      let step=leagueStepIndex(lg.tier,lg.div);
      const promoCap=(step===20)?MASTER_PROMO_LP:100;
      if(step<21&&lg.lp>=promoCap){
        const overflow=lg.lp-promoCap;
        // Çifte Terfi (+2 Küme) Algoritması: Zor, kazanılmış ve MMR+Seri+WR temelli
        const canDouble=(
          step<=17 && // En fazla Elmas III -> Elmas I atlayabilir (Ustalık/Şampiyonluk atlanmaz)
          acc.matches>=6 &&
          (
            (mmrGap>=210 && acc.winStreak>=4 && wr>=0.66) ||
            (mmrGap>=300 && acc.winStreak>=3 && wr>=0.60) ||
            (acc.winStreak>=6 && mmrGap>=150 && wr>=0.70)
          )
        );
        if(canDouble){
          step=Math.min(19,step+2);
          doublePromoted=true;
          promoted=true;
          lg.lp=Math.min(40,overflow);
          lg.demoteShield=3;
        }else{
          step=Math.min(21,step+1);
          promoted=true;
          lg.lp=Math.min(99,overflow);
          lg.demoteShield=2;
        }
        const nl=stepIndexToLeague(step);
        lg.tier=nl.tier;lg.div=nl.div;
      }
    }else{
      lpDelta=Math.max(-28,Math.min(-10,Math.round(-18+mmrGap*0.055)));
      if(lg.lp>0){
        // 0 LP üstündeyken tek mağlubiyette lig düşülmez, önce 0 LP'ye iner (LoL kuralı)
        lg.lp=Math.max(0,lg.lp+lpDelta);
      }else{
        let step=leagueStepIndex(lg.tier,lg.div);
        if(step>0){
          if((lg.demoteShield||0)>0){
            lg.demoteShield--;
            shieldUsed=true;
          }else{
            step--;
            const nl=stepIndexToLeague(step);
            lg.tier=nl.tier;lg.div=nl.div;
            lg.lp=(step===20)?(MASTER_PROMO_LP-35):75;
            lg.demoteShield=1;
            demoted=true;
          }
        }
      }
    }
  }

  // Zirve Lig güncelle
  const curScore=leagueScoreKey(lg);
  const pkScore=leagueScoreKey({unranked:false,tier:lg.peakTier||0,div:lg.peakDiv||4,lp:lg.peakLp||0});
  if(curScore>pkScore){
    lg.peakTier=lg.tier;lg.peakDiv=lg.div;lg.peakLp=lg.lp;
  }

  const afterLg=formatLeague(lg,false);
  acc.history=acc.history||[];
  acc.history.unshift({
    ts:Date.now(),opp:getOppLabel(S),won:!!won,
    delta:lpDelta,lpDelta,mmrDelta,elo:afterMmr,
    leagueLabel:afterLg.name,lpAfter:lg.lp,
    promoted,doublePromoted,demoted,placementMatch,
    unranked:false,mode:MODE,diff:MODE==='bot'?DIFF:'pvp',score,myHero,oppHero
  });
  if(acc.history.length>AUTH_HIST_MAX)acc.history.length=AUTH_HIST_MAX;
  if(typeof progressQuest==='function'){progressQuest('play2',1,true);progressQuest('ranked1',1,true);if(won)progressQuest('win1',1,true)}
  if(typeof evaluateAchievements==='function')evaluateAchievements(acc,{won,mode:MODE,diff:DIFF,myJokersUsed,myD20Surv});
  saveSession(acc);
  S._eloRes={
    before:beforeMmr,after:afterMmr,delta:lpDelta,mmrDelta,
    lpBefore,lpAfter:lg.lp,lpDelta,
    beforeLg,afterLg,
    promoted,doublePromoted,demoted,shieldUsed,
    placementMatch,placementComplete,provisional:!!lg.provisional,
    speedBonus,
    rank:eloRank(acc),unranked:false
  };
  return S._eloRes;
}
let LOBBY_ONLINE_LIST=[];
let LOBBY_PRESENCE_UNSUB=null,LOBBY_INVITE_UNSUB=null,LOBBY_HB_TIMER=null,LOBBY_LISTEN_PID='';
const LOBBY_FALLBACK_PID='g_'+Math.random().toString(36).slice(2,10);
const LOBBY_JOINED_AT=Date.now();
const LOBBY_TTL_MS=45000;

function getMyPresenceId(){
  if(isRegisteredMember(USER_ACC)&&USER_ACC.key)return 'm_'+USER_ACC.key;
  if(USER_ACC&&USER_ACC.uid)return String(USER_ACC.uid);
  return LOBBY_FALLBACK_PID;
}
function updateLobbyBadge(){
  const c=document.getElementById('ab-lob-cnt');
  if(c)c.textContent=String(LOBBY_ONLINE_LIST.length);
}
let botSpecPeer=null,CURRENT_BOT_SPEC_CODE='';
function stopBotSpectateHost(){
  try{if(botSpecPeer)botSpecPeer.destroy();}catch(e){}
  botSpecPeer=null;CURRENT_BOT_SPEC_CODE='';
}
function startBotSpectateHost(retry=0){
  if(typeof Peer==='undefined'||!fbDb||MODE!=='bot')return;
  if(botSpecPeer&&!botSpecPeer.destroyed&&CURRENT_BOT_SPEC_CODE){updateLobbyPresence(false);return;}
  stopBotSpectateHost();
  const code='S'+Array.from({length:3},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
  CURRENT_BOT_SPEC_CODE=code;
  try{
    botSpecPeer=new Peer('necrodice-'+code);
    botSpecPeer.on('open',()=>{updateLobbyPresence(false);});
    botSpecPeer.on('connection',c=>{
      c.on('data',m=>{
        if(m&&m.k==='join_as'&&m.role==='spectator'){
          if(spectators.length>=MAX_SPECTATORS){c.send({k:'spec_full',max:MAX_SPECTATORS});return;}
          c._role='spectator';
          c._specName=String(m.name||tr('Misafir','Guest')).slice(0,18);
          spectators.push(c);
          c.send({k:'role',role:'spectator'});
          if(G){
            c.send({k:'s',v:specView(G),specCount:spectators.length,specNames:spectators.map(s=>s._specName||tr('Misafir','Guest'))});
            R();
          }
          c.on('close',()=>{spectators=spectators.filter(x=>x!==c);if(G)R();});
        }else if(m&&m.k==='spec_react'){
          const ic=String(m.ic||'✦').slice(0,4),lbl=String(m.label||'').slice(0,18);
          if(typeof showSpecReactionToast==='function')showSpecReactionToast(ic,lbl);
          spectators.forEach(s=>{try{if(s.open)s.send({k:'spec_react',ic,label:lbl})}catch(e){}});
        }else if(m&&m.k==='spec_vote'&&(m.side===0||m.side===1)){
          if(c._votedSide===0||c._votedSide===1)SPEC_VOTES[c._votedSide]=Math.max(0,SPEC_VOTES[c._votedSide]-1);
          c._votedSide=m.side;
          SPEC_VOTES[m.side]=(SPEC_VOTES[m.side]||0)+1;
          const payload={k:'spec_votes',votes:[...SPEC_VOTES]};
          spectators.forEach(s=>{try{if(s.open)s.send(payload)}catch(e){}});
          if(typeof renderSpecSocialBar==='function')renderSpecSocialBar();
        }
      });
    });
    botSpecPeer.on('disconnected',()=>{try{if(botSpecPeer&&!botSpecPeer.destroyed)botSpecPeer.reconnect();}catch(e){}});
    botSpecPeer.on('error',err=>{
      const t=err&&err.type;
      if(t==='unavailable-id'&&retry<3){
        CURRENT_BOT_SPEC_CODE='';
        setTimeout(()=>startBotSpectateHost(retry+1),250);
        return;
      }
      if(t==='invalid-id'||t==='server-error'||t==='socket-error'||t==='socket-closed'){
        CURRENT_BOT_SPEC_CODE='';
        updateLobbyPresence(false);
      }
    });
  }catch(e){CURRENT_BOT_SPEC_CODE='';}
}
function updateLobbyPresence(forceOffline=false){
  if(!fbDb)return;
  const pid=getMyPresenceId();
  if(!pid)return;
  const ref=fbDb.collection('lobby_presence').doc(pid);
  if(forceOffline){
    ref.delete().catch(()=>{});
    return;
  }
  const menuEl=$('#menu');
  const inGame=!!(menuEl&&menuEl.hidden);
  const name=(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.username)?USER_ACC.username:tr('Misafir','Guest');
  const elo=Math.round((USER_ACC&&USER_ACC.elo)||1200);
  const isGuest=!(USER_ACC&&!USER_ACC.isGuest);
  const fl=USER_ACC?getAccountLeague(USER_ACC):formatLeague(null,false);
  const roomCode=inGame?(MODE==='host'?CURRENT_HOST_CODE:(MODE==='guest'?LAST_JOIN_CODE:(MODE==='bot'?CURRENT_BOT_SPEC_CODE:''))):'';
  const title=(USER_ACC&&USER_ACC.title)||'';
  ref.set({
    pid,
    name,
    elo,
    isGuest,
    league:(USER_ACC&&USER_ACC.league)||null,
    leagueId:fl.id,
    leagueName:fl.name,
    leagueCls:fl.cls,
    leagueLp:fl.lp|0,
    leagueUnranked:!!fl.unranked,
    title,
    roomCode,
    status:inGame?'ingame':'menu',
    joinedAt:LOBBY_JOINED_AT,
    lastSeen:Date.now()
  },{merge:true}).catch(()=>{});
}
function dismissIncomingInviteBanner(){
  const old=document.getElementById('lob-inv-toast');
  if(old)old.remove();
}
function showIncomingInviteBanner(inv){
  if(!inv||!inv.id||!inv.roomCode)return;
  const menuEl=$('#menu');
  if(menuEl&&menuEl.hidden)return; // Aktif maç içindeyken rahatsız etme
  dismissIncomingInviteBanner();
  snd('ok');
  const el=document.createElement('div');
  el.id='lob-inv-toast';
  el.className='lob-inv-toast';
  el.dataset.invId=inv.id;
  el.innerHTML=`<div class="lit-top">
      <span class="lit-ic">◈</span>
      <div class="lit-txt">
        <b>${tr('Düello Daveti!','Duel Invite!')}</b>
        <small><em>${escHtml(inv.fromName||tr('Oyuncu','Player'))}</em> (${escHtml(inv.fromLeagueName||eloRank(inv.fromElo||1200).name)}) ${tr('seni düelloya davet ediyor.','challenges you to a duel.')}</small>
      </div>
    </div>
    <div class="lit-acts">
      <button type="button" class="btn alt sm" id="lit-acc">${tr('Kabul Et','Accept')}</button>
      <button type="button" class="btn sm" id="lit-dec">${tr('Reddet','Decline')}</button>
    </div>`;
  document.body.appendChild(el);
  const accBtn=el.querySelector('#lit-acc'),decBtn=el.querySelector('#lit-dec');
  if(decBtn)decBtn.onclick=()=>{
    snd('click');
    if(fbDb)fbDb.collection('lobby_invites').doc(inv.id).update({status:'declined'}).catch(()=>{});
    dismissIncomingInviteBanner();
  };
  if(accBtn)accBtn.onclick=()=>{
    snd('click');
    if(fbDb)fbDb.collection('lobby_invites').doc(inv.id).update({status:'accepted'}).catch(()=>{});
    dismissIncomingInviteBanner();
    const mb=$('#mb');
    if(mb)mb.classList.remove('auth-mode','lb-mode','lob-mode','pr-mode');
    if($('#m'))$('#m').hidden=true;
    lock=false;
    joinRoom(inv.roomCode,true);
  };
}
function startLobbyPresence(){
  if(!fbDb)return;
  const myPid=getMyPresenceId();
  updateLobbyPresence(false);
  if(!LOBBY_HB_TIMER){
    LOBBY_HB_TIMER=setInterval(()=>{
      if(!document.hidden)updateLobbyPresence(false);
    },15000);
    window.addEventListener('pagehide',()=>updateLobbyPresence(true));
    window.addEventListener('beforeunload',()=>updateLobbyPresence(true));
  }
  if(!LOBBY_PRESENCE_UNSUB){
    LOBBY_PRESENCE_UNSUB=fbDb.collection('lobby_presence').onSnapshot(snap=>{
      const now=Date.now();
      const arr=[];
      snap.forEach(doc=>{
        const d=doc.data();
        if(d&&d.pid&&d.lastSeen&&(now-d.lastSeen)<=LOBBY_TTL_MS){
          arr.push(d);
        }
      });
      arr.sort((a,b)=>{
        const sa=a.status==='menu'?0:1,sb=b.status==='menu'?0:1;
        if(sa!==sb)return sa-sb;
        return (b.elo||1200)-(a.elo||1200);
      });
      LOBBY_ONLINE_LIST=arr;
      updateLobbyBadge();
      const mb=$('#mb');
      if(mb&&mb.classList.contains('lob-mode')&&!$('#m').hidden){
        renderLobbyModalBody();
      }
    },()=>{});
  }
  if(LOBBY_LISTEN_PID!==myPid){
    if(LOBBY_INVITE_UNSUB){try{LOBBY_INVITE_UNSUB()}catch(e){}LOBBY_INVITE_UNSUB=null}
    LOBBY_LISTEN_PID=myPid;
    LOBBY_INVITE_UNSUB=fbDb.collection('lobby_invites').where('toId','==',myPid).onSnapshot(snap=>{
      const now=Date.now();
      let activeInv=null;
      snap.forEach(doc=>{
        const d=doc.data();
        if(d&&d.status==='pending'&&d.createdAt&&(now-d.createdAt)<=55000){
          if(!activeInv||d.createdAt>activeInv.createdAt)activeInv=d;
        }
      });
      const curBanner=document.getElementById('lob-inv-toast');
      if(!activeInv){
        if(curBanner)dismissIncomingInviteBanner();
      }else if(!curBanner||curBanner.dataset.invId!==activeInv.id){
        showIncomingInviteBanner(activeInv);
      }
    },()=>{});
  }
}
let QM_UNSUB=null,QM_TIMER=null,QM_DOC_ID=null;
function cancelQuickMatch(silent=false){
  if(QM_TIMER){clearInterval(QM_TIMER);QM_TIMER=null}
  if(QM_UNSUB){try{QM_UNSUB()}catch(e){}QM_UNSUB=null}
  if(QM_DOC_ID&&fbDb){
    fbDb.collection('lobby_queue').doc(QM_DOC_ID).delete().catch(()=>{});
    QM_DOC_ID=null;
  }
  if(!silent){
    IS_QUICK_MATCH=false;
    try{if(peer&&!conn)peer.destroy()}catch(e){}
    if(!conn){peer=null;MODE='bot';CURRENT_HOST_CODE=''}
  }
}
async function startQuickMatch(){
  if(noNet()||!fbDb)return;
  if(!USER_ACC)createGuestAccount();
  cancelQuickMatch(true);
  IS_QUICK_MATCH=true;
  const myPid=getMyPresenceId();
  const myElo=Math.round((USER_ACC&&USER_ACC.elo)||1200);
  const myName=(USER_ACC&&!USER_ACC.isGuest)?USER_ACC.username:tr('Misafir','Guest');
  const myFl=getAccountLeague(USER_ACC);
  const qMode=QUEUE_MODE==='normal'?'normal':'ranked';
  const myRankTxt=myFl.unranked?tr(`Yerleştirme (${myFl.placementGames}/5)`,`Placements (${myFl.placementGames}/5)`):myFl.name;
  let secs=0;
  const renderWait=(msg)=>{
    box(`<div class="lobby-box">
      <h3 style="margin-bottom:8px">${qMode==='ranked'?tr('Dereceli Rakip Aranıyor','Searching for Ranked Match'):tr('Normal Maç Rakibi Aranıyor','Searching for Normal Match')}</h3>
      <p style="color:var(--bone);font-size:16px;margin-bottom:8px">${qMode==='ranked'?tr(`Ligin: <b>${escHtml(myRankTxt)}</b> · Dengeli rakip aranıyor…`,`Your League: <b>${escHtml(myRankTxt)}</b> · Finding balanced opponent…`):tr('Derecesiz maç için rakip aranıyor…','Finding opponent for unranked match…')}</p>
      <div class="lobby-spinner"><i></i><i></i><i></i></div>
      <p id="lobbyStatus" style="font-size:15px;color:#a0b8a4;margin-top:10px">${msg||`${tr('Geçen süre','Elapsed')}: ${secs}s`}</p>
    </div>`,true);
    const pc=$('#pc');
    if(pc){
      pc.textContent=tr('Aramayı İptal Et','Cancel Search');
      pc.onclick=()=>{cancelQuickMatch(false);$('#m').hidden=true;lock=false;st('')};
    }
  };
  renderWait();
  try{
    const snap=await fbDb.collection('lobby_queue').where('status','==','waiting').get();
    const now=Date.now();
    const cands=[];
    snap.forEach(doc=>{
      const d=doc.data();
      const candMode=(d&&d.queueMode==='normal')?'normal':'ranked';
      if(d&&d.pid&&d.pid!==myPid&&d.roomCode&&candMode===qMode&&d.createdAt&&(now-d.createdAt)<=90000){
        cands.push({id:doc.id,...d});
      }
    });
    cands.sort((a,b)=>Math.abs((a.elo||1200)-myElo)-Math.abs((b.elo||1200)-myElo));
    for(const cand of cands){
      try{
        const ref=fbDb.collection('lobby_queue').doc(cand.id);
        const claimed=await fbDb.runTransaction(async tx=>{
          const doc=await tx.get(ref);
          if(!doc.exists||doc.data().status!=='waiting')return false;
          tx.update(ref,{status:'matched',matchedBy:myPid,matchedName:myName,matchedAt:Date.now()});
          return true;
        });
        if(claimed){
          const ls=$('#lobbyStatus');
          if(ls)ls.textContent=tr(`Rakip bulundu: ${cand.name}! Bağlanılıyor…`,`Match found: ${cand.name}! Connecting…`);
          joinRoom(cand.roomCode,true);
          return;
        }
      }catch(ce){}
    }
    // Kuyrukta bekleyen yok: oda açıp kuyruğa gir
    hostRoom(null,code=>{
      QM_DOC_ID=myPid;
      const qRef=fbDb.collection('lobby_queue').doc(myPid);
      qRef.set({pid:myPid,name:myName,elo:myElo,queueMode:qMode,roomCode:code,status:'waiting',createdAt:Date.now()}).catch(()=>{});
      QM_TIMER=setInterval(()=>{
        secs++;
        const ls=$('#lobbyStatus');
        if(ls&&!conn)ls.textContent=`${tr('Geçen süre','Elapsed')}: ${secs}s`;
        if(secs%20===0&&QM_DOC_ID)qRef.update({createdAt:Date.now()}).catch(()=>{});
        if(secs>=120&&!conn){
          cancelQuickMatch(false);
          box(`<h3>${tr('Rakip Bulunamadı','No Opponent Found')}</h3><p>${tr('Şu an kuyrukta başka oyuncu yok. Lobiden davet atabilir veya botla oynayabilirsin.','No other players in queue right now. You can invite from the Lobby or play vs AI.')}</p>`,true);
        }
      },1000);
      QM_UNSUB=qRef.onSnapshot(s=>{
        if(!s.exists)return;
        const d=s.data();
        if(d&&d.status==='matched'){
          const ls=$('#lobbyStatus');
          if(ls)ls.textContent=tr(`Rakip bulundu: ${d.matchedName||''}! Bağlanılıyor…`,`Opponent found: ${d.matchedName||''}! Connecting…`);
          cancelQuickMatch(true);
        }
      },()=>{});
    });
  }catch(e){
    cancelQuickMatch(false);
    box(`<h3>${tr('Bağlantı Hatası','Connection Error')}</h3><p>${tr('Eşleştirme başlatılamadı, tekrar dene.','Could not start matchmaking, please try again.')}</p>`,true);
  }
}
function renderLobbyModalBody(){
  const mb=$('#mb');
  if(!mb||!mb.classList.contains('lob-mode'))return;
  const myPid=getMyPresenceId();
  const now=Date.now();
  const list=LOBBY_ONLINE_LIST.filter(u=>u&&u.lastSeen&&(now-u.lastSeen)<=LOBBY_TTL_MS);
  // Misafirleri giriş sırasına göre numaralandır: Misafir, Misafir 2, Misafir 3...
  const guestOrder=list
    .filter(u=>u.isGuest||!u.name||u.name==='Misafir'||u.name==='Guest')
    .slice()
    .sort((a,b)=>((a.joinedAt||a.lastSeen||0)-(b.joinedAt||b.lastSeen||0))||String(a.pid||'').localeCompare(String(b.pid||'')));
  const guestLabelMap=new Map();
  guestOrder.forEach((u,idx)=>{
    guestLabelMap.set(u.pid,idx===0?tr('Misafir','Guest'):`${tr('Misafir','Guest')} ${idx+1}`);
  });
  const displayNameOf=u=>{
    if(guestLabelMap.has(u.pid))return guestLabelMap.get(u.pid);
    return u.name||tr('Oyuncu','Player');
  };
  const rowsHtml=list.length?list.map(u=>{
    const isMe=u.pid===myPid;
    let rk;
    if(u.league&&typeof u.league==='object'){
      const uClone={isGuest:!!u.isGuest,elo:Math.round(u.elo||1200),matches:u.leagueUnranked?0:5,league:u.league};
      const uFl=formatLeague(ensureLeagueState(uClone),false);
      rk={ic:leagueCrestSvg(uFl.id,22),name:uFl.name,cls:uFl.cls,id:uFl.id,fl:uFl};
    }else if(u.leagueId&&u.leagueName){
      rk={ic:leagueCrestSvg(u.leagueId,22),name:u.leagueName,cls:u.leagueCls||('rk-'+u.leagueId),id:u.leagueId};
    }else if(u.isGuest){
      const gFl=formatLeague({unranked:false,tier:0,div:2,lp:0,placementGames:5},false);
      rk={ic:leagueCrestSvg(gFl.id,22),name:gFl.name,cls:gFl.cls,id:gFl.id,fl:gFl};
    }else{
      rk=eloRank(u.elo);
    }
    const inGame=u.status==='ingame';
    const dispName=displayNameOf(u);
    const tLbl=(u.title&&typeof getTitleLabel==='function')?`${escHtml(getTitleLabel(u.title))} · `:'';
    const actHtml=isMe
      ?`<span class="lob-me-tag">${tr('Sen','You')}</span>`
      :(inGame
        ?(u.roomCode
          ?`<button type="button" class="btn sm lob-spec-btn" data-code="${escHtml(u.roomCode)}">${tr('İzle','Watch')}</button>`
          :`<span class="lob-busy-tag">${tr('Maçta','In Match')}</span>`)
        :`<button type="button" class="btn alt sm lob-inv-btn" data-pid="${escHtml(u.pid)}">${tr('Davet Et','Challenge')}</button>`);
    const eloVal=Math.round(u.elo||1200);
    const watchable=!isMe&&inGame&&!!u.roomCode;
    return `<div class="lob-row${isMe?' me':''}${inGame?' busy':''}${watchable?' watchable':''}"${watchable?` data-watch-code="${escHtml(u.roomCode)}"`:''}>
      <span class="lob-dot ${inGame?'busy':'free'}" title="${inGame?tr('Maçta','In Match'):tr('Müsait','Available')}"></span>
      <span class="lb-rk" title="${rk.name}">${rk.ic}</span>
      <div class="lb-u">
        <b>${escHtml(dispName)}</b>
        <small>${tLbl}${inGame?tr('Maçta','In Match'):tr('Müsait','Available')}</small>
      </div>
      <span class="lob-elo">${escHtml(rk.name)}</span>
      ${actHtml}
    </div>`;
  }).join(''):`<div class="lb-empty">${tr('Şu an lobide başka çevrim içi oyuncu yok.','No other players online in the lobby right now.')}</div>`;

  const listEl=mb.querySelector('.lob-list');
  const subEl=mb.querySelector('.lob-sub');
  if(subEl)subEl.textContent=tr(`Şu an ${list.length} oyuncu çevrim içi · Anında düello daveti gönder veya canlı izle`,`${list.length} players online now · Challenge or spectate live`);
  if(listEl){
    listEl.innerHTML=rowsHtml;
    listEl.querySelectorAll('.lob-inv-btn').forEach(btn=>{
      btn.onclick=e=>{
        e.stopPropagation();
        const target=list.find(x=>x.pid===btn.dataset.pid);
        if(!target)return;
        snd('click');
        mb.classList.remove('auth-mode','lob-mode');
        $('#m').hidden=true;lock=false;
        if(noNet())return;
        hostRoom({...target,name:displayNameOf(target)});
      };
    });
    const openWatch=code=>{
      if(!code)return;
      snd('click');
      mb.classList.remove('auth-mode','lob-mode');
      $('#m').hidden=true;lock=false;
      spectateRoom(code);
    };
    listEl.querySelectorAll('.lob-spec-btn').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();openWatch(btn.dataset.code)};
    });
    listEl.querySelectorAll('.lob-row.watchable').forEach(row=>{
      row.onclick=()=>openWatch(row.dataset.watchCode);
    });
  }
}
function openLobbyModal(){
  if(noNet())return;
  const mb=$('#mb');
  if(!mb)return;
  if(!USER_ACC)createGuestAccount();
  startLobbyPresence();
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','pr-mode');
  mb.classList.add('auth-mode','lob-mode');
  mb.innerHTML=`<div class="lb-wrap">
    <div class="lb-head">
      <h3>${tr('Çevrim İçi Lobi','Online Lobby')}</h3>
      <p class="lb-sub lob-sub">${tr('Çevrim içi oyuncular yükleniyor…','Loading online players…')}</p>
    </div>
    <div class="lb-list lob-list"></div>
    <div class="row lb-acts">
      <button type="button" id="lob-ref" class="btn alt sm">${tr('Yenile','Refresh')}</button>
      <button type="button" id="lob-close" class="btn sm">${tr('Kapat','Close')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode','lob-mode');$('#m').hidden=true;lock=false};
  if($('#lob-close'))$('#lob-close').onclick=()=>{snd('click');close()};
  if($('#lob-ref'))$('#lob-ref').onclick=()=>{snd('click');updateLobbyPresence(false);renderLobbyModalBody()};
  renderLobbyModalBody();
}
function openOnlinePlayModal(){
  const mb=$('#mb');if(!mb)return;
  const isR=QUEUE_MODE==='ranked';
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode','inv-mode');
  mb.classList.add('auth-mode','play-sheet');
  mb.innerHTML=`<div class="ps-wrap">
    <div class="ps-head">
      <span class="ps-kicker ${isR?'rk':'nm'}">${isR?tr('Dereceli Oyun · Lig & LP','Ranked Game · League & LP'):tr('Normal Oyun · Derecesiz','Normal Game · Unranked')}</span>
      <h3>${tr('Çevrim İçi Düello','Online Duel')}</h3>
    </div>
    <div class="ps-body">
      <button type="button" class="ps-card ps-card-main" id="ps-qm">
        <b>${tr('Hızlı Maç Ara','Find Quick Match')}</b>
        <small>${isR?tr('Dengeli dereceli rakiple anında eşleş','Match instantly against a balanced ranked opponent'):tr('Derecesiz çevrim içi rakiple hemen eşleş','Match instantly for a casual online duel')}</small>
      </button>
      <button type="button" class="ps-card" id="ps-host">
        <b>${tr('Özel Oda Oluştur','Create Private Room')}</b>
        <small>${tr('4 haneli oda kodu ve davet linki oluştur','Generate a 4-letter room code and invite link')}</small>
      </button>
      <div class="ps-join-box">
        <label for="ps-code">${tr('Oda Koduyla Katıl','Join with Room Code')}</label>
        <div class="ps-join-row">
          <input id="ps-code" placeholder="${tr('Örn: A7K2','e.g. A7K2')}" maxlength="4" autocomplete="off">
          <button type="button" id="ps-join" class="btn alt">${tr('Katıl','Join')}</button>
        </div>
      </div>
    </div>
    <div class="row ps-acts"><button type="button" id="ps-close" class="btn alt sm">${tr('Geri','Back')}</button></div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode','play-sheet');$('#m').hidden=true;lock=false};
  if($('#ps-close'))$('#ps-close').onclick=()=>{snd('click');close()};
  if($('#ps-qm'))$('#ps-qm').onclick=()=>{snd('click');close();CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;startQuickMatch()};
  if($('#ps-host'))$('#ps-host').onclick=()=>{snd('click');if(noNet())return;close();CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;IS_QUICK_MATCH=false;hostRoom()};
  if($('#ps-join'))$('#ps-join').onclick=()=>{
    snd('click');
    const c=($('#ps-code')?$('#ps-code').value.trim().toUpperCase():'');
    if(!c)return st(tr('Oda kodunu yaz','Enter room code'));
    close();CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;IS_QUICK_MATCH=false;joinRoom(c);
  };
  if($('#ps-code'))$('#ps-code').onkeydown=e=>{if(e.key==='Enter'&&$('#ps-join'))$('#ps-join').click()};
}
function openAiPlayModal(){
  const mb=$('#mb');if(!mb)return;
  const isR=QUEUE_MODE==='ranked';
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode','inv-mode');
  mb.classList.add('auth-mode','play-sheet');
  const diffs=isR?[
    {id:'hard',trN:'Zor',enN:'Hard',trD:'Taktiksel ve keskin kararlar',enD:'Tactical sharp decisions',cls:'ps-d-hard'},
    {id:'imp',trN:'İmkansız',enN:'Impossible',trD:'Acımasız üst düzey yapay zeka',enD:'Ruthless apex AI',cls:'ps-d-imp'}
  ]:[
    {id:'easy',trN:'Kolay',enN:'Easy',trD:'Rahat tempo',enD:'Relaxed pace',cls:'ps-d-easy'},
    {id:'med',trN:'Orta',enN:'Medium',trD:'Dengeli düello',enD:'Balanced duel',cls:'ps-d-med'},
    {id:'hard',trN:'Zor',enN:'Hard',trD:'Taktiksel yapay zeka',enD:'Tactical AI',cls:'ps-d-hard'},
    {id:'imp',trN:'İmkansız',enN:'Impossible',trD:'Acımasız yapay zeka',enD:'Ruthless AI',cls:'ps-d-imp'}
  ];
  const cardsHtml=diffs.map(d=>`<button type="button" class="ps-card ${d.cls}" data-ai-d="${d.id}">
    <b>${isEn()?d.enN:d.trN}</b>
    <small>${isEn()?d.enD:d.trD}</small>
  </button>`).join('');
  mb.innerHTML=`<div class="ps-wrap">
    <div class="ps-head">
      <h3>${tr('Yapay Zeka Seç','Select AI Opponent')}</h3>
    </div>
    <div class="ps-body ps-ai-grid ${isR?'two':''}">${cardsHtml}</div>
    <div class="row ps-acts"><button type="button" id="ps-close" class="btn alt sm">${tr('Geri','Back')}</button></div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode','play-sheet');$('#m').hidden=true;lock=false};
  if($('#ps-close'))$('#ps-close').onclick=()=>{snd('click');close()};
  mb.querySelectorAll('[data-ai-d]').forEach(b=>b.onclick=()=>{
    snd('click');const d=b.dataset.aiD;close();
    CURSED_RULE=null;VAULT_RUN=null;PUZZLE_ACTIVE=null;DIFF=d;MODE='bot';
    chooseHero(h=>{MY_HERO=h;enter(start)});
  });
}
function openSpecialModesModal(){
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode','inv-mode');
  mb.classList.add('auth-mode','play-sheet');
  mb.innerHTML=`<div class="ps-wrap">
    <div class="ps-head">
      <span class="ps-kicker sp">${tr('Özel Meydan Okumalar · Derecesiz','Special Challenges · Unranked')}</span>
      <h3>${tr('Özel Modlar','Special Modes')}</h3>
    </div>
    <div class="ps-body">
      <button type="button" class="ps-card ps-sp-vault" id="ps-vault">
        <b>${tr('Ölüm Mahzeni','Death Vault')}</b>
        <small>${tr('5 aşamalı roguelike koşu, kalıntılar ve Bilinmeyen boss','5-stage roguelike run, relics, and The Unknown boss')}</small>
      </button>
      <button type="button" class="ps-card ps-sp-cursed" id="ps-cursed">
        <b>${tr('Haftalık Lanetli Masa','Weekly Cursed Table')}</b>
        <small>${tr('Her hafta değişen lanetli kurallarla özel düello','Special duel with rotating weekly cursed rules')}</small>
      </button>
      <button type="button" class="ps-card ps-sp-puzzle" id="ps-puzzle">
        <b>${tr('Günün Bulmacası','Daily Puzzle')}</b>
        <small>${tr('Tek elde ölümcül Joker kombosunu çöz, günlük serini büyüt','Solve today\'s lethal Joker combo and grow your streak')}</small>
      </button>
    </div>
    <div class="row ps-acts"><button type="button" id="ps-close" class="btn alt sm">${tr('Geri','Back')}</button></div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode','play-sheet');$('#m').hidden=true;lock=false};
  if($('#ps-close'))$('#ps-close').onclick=()=>{snd('click');close()};
  if($('#ps-vault'))$('#ps-vault').onclick=()=>{snd('click');close();if(typeof openVaultModal==='function')openVaultModal()};
  if($('#ps-cursed'))$('#ps-cursed').onclick=()=>{snd('click');close();if(typeof openWeeklyCursedModal==='function')openWeeklyCursedModal()};
  if($('#ps-puzzle'))$('#ps-puzzle').onclick=()=>{snd('click');close();if(typeof openDailyPuzzleModal==='function')openDailyPuzzleModal()};
}
function applyQueueModeUi(){
  const mb2=$('#mb2');
  if(!mb2)return;
  const guest=isGuestUser(USER_ACC);
  if(guest&&QUEUE_MODE==='ranked')QUEUE_MODE='normal';
  const isR=!guest&&QUEUE_MODE==='ranked';
  const isS=QUEUE_MODE==='special';
  mb2.classList.toggle('queue-ranked',isR);
  mb2.classList.toggle('queue-normal',!isR&&!isS);
  mb2.classList.toggle('queue-special',isS);
  const btns=mb2.querySelectorAll('#queue-switch .qs-btn');
  btns.forEach(b=>{
    const q=b.dataset.q;
    const act=(q==='ranked'&&isR)||(q==='normal'&&!isR&&!isS)||(q==='special'&&isS);
    b.classList.toggle('act',act);
    b.classList.toggle('qs-locked',guest&&q==='ranked');
    b.setAttribute('aria-selected',act?'true':'false');
    const bEl=b.querySelector('b'),sEl=b.querySelector('small');
    if(sEl)sEl.remove();
    if(q==='normal'){
      if(bEl)bEl.textContent=tr('Normal','Normal');
    }else if(q==='special'){
      if(bEl)bEl.textContent=tr('Özel Modlar','Special');
    }else{
      if(bEl)bEl.textContent=tr('Dereceli','Ranked');
    }
  });
  if($('#play-stack-std'))$('#play-stack-std').hidden=isS;
  if($('#play-stack-special'))$('#play-stack-special').hidden=!isS;
  if($('#play-online-t'))$('#play-online-t').textContent=tr('Çevrim İçi Oyna','Play Online');
  if($('#play-online-s'))$('#play-online-s').textContent=tr('Hızlı Maç Ara · Özel Oda · Davet','Quick Match · Private Room · Invite');
  if($('#play-ai-t'))$('#play-ai-t').textContent=tr('Yapay Zekaya Karşı','VS AI');
  if($('#play-ai-s'))$('#play-ai-s').textContent=isR?tr('Zor · İmkansız','Hard · Impossible'):tr('Kolay · Orta · Zor · İmkansız','Easy · Medium · Hard · Impossible');
  if($('#sp-vault-t'))$('#sp-vault-t').textContent=tr('Ölüm Mahzeni','Death Vault');
  if($('#sp-vault-s'))$('#sp-vault-s').textContent=tr('5 aşamalı roguelike · Kalıntılar · Bilinmeyen Boss','5-stage roguelike · Relics · The Unknown Boss');
  if($('#sp-cursed-t'))$('#sp-cursed-t').textContent=tr('Haftalık Lanetli Masa','Weekly Cursed Table');
  if($('#sp-cursed-s'))$('#sp-cursed-s').textContent=tr('Her hafta değişen lanetli kurallarla özel düello','Special duel with rotating weekly cursed rules');
  if($('#sp-puzzle-t'))$('#sp-puzzle-t').textContent=tr('Günün Bulmacası','Daily Puzzle');
  if($('#sp-puzzle-s'))$('#sp-puzzle-s').textContent=tr('Tek elde ölümcül Joker kombosunu çöz, serini büyüt','Solve today\'s lethal Joker combo and grow your streak');
  if($('#dock-lob-t'))$('#dock-lob-t').textContent=tr('Lobi','Lobby');
  if($('#dock-lb-t'))$('#dock-lb-t').textContent=tr('Sıralama','Ranks');
  if($('#dock-inv-t'))$('#dock-inv-t').textContent=tr('Envanter','Inventory');
  if($('#dock-tut-t'))$('#dock-tut-t').textContent=tr('Eğitim','Tutorial');

  const strip=$('#ranked-strip');
  if(strip){
    strip.hidden=false;
    const fl=USER_ACC?getAccountLeague(USER_ACC):formatLeague(null,false);
    const cap=fl.lpCap||100;
    const pct=fl.unranked?0:(fl.id==='challenger'?100:Math.max(0,Math.min(100,Math.round((fl.lp/cap)*100))));
    if(fl.unranked||fl.provisional){
      const pg=fl.placementGames||0;
      const pips=[0,1,2,3,4].map(i=>`<i class="rs-pip${i<pg?' done':''}"></i>`).join('');
      strip.className=`ranked-strip ${fl.cls}`;
      strip.innerHTML=`<span class="rs-crest">${leagueCrestSvg(fl.id,32)}</span>
        <div class="rs-mid">
          <div class="rs-top"><b>${fl.unranked?tr('Yerleştirme Maçları','Placement Matches'):escHtml(fl.name)}</b><span>${pg}/5</span></div>
          <div class="rs-pips">${pips}<em>${fl.unranked?tr('5 maçta ligin belirlenir','5 games to place'):tr('Geçici Lig','Provisional')}</em></div>
        </div>`;
    }else{
      strip.className=`ranked-strip ${fl.cls}`;
      strip.innerHTML=`<span class="rs-crest">${leagueCrestSvg(fl.id,32)}</span>
        <div class="rs-mid">
          <div class="rs-top"><b>${escHtml(fl.name)}</b></div>
          <div class="rs-bar"><i style="width:${pct}%;--lg-c1:${fl.c1}"></i></div>
        </div>`;
    }
  }
}
document.querySelectorAll('#queue-switch .qs-btn').forEach(b=>{
  b.onclick=()=>{snd('click');setQueueMode(b.dataset.q,true)};
});
if($('#play-online'))$('#play-online').onclick=()=>{snd('click');openOnlinePlayModal()};
if($('#play-ai'))$('#play-ai').onclick=()=>{snd('click');openAiPlayModal()};
if($('#sp-vault'))$('#sp-vault').onclick=()=>{snd('click');if(typeof openVaultModal==='function')openVaultModal()};
if($('#sp-cursed'))$('#sp-cursed').onclick=()=>{snd('click');if(typeof openWeeklyCursedModal==='function')openWeeklyCursedModal()};
if($('#sp-puzzle'))$('#sp-puzzle').onclick=()=>{snd('click');if(typeof openDailyPuzzleModal==='function')openDailyPuzzleModal()};
if($('#dock-lob'))$('#dock-lob').onclick=()=>{snd('click');openLobbyModal()};
if($('#dock-lb'))$('#dock-lb').onclick=()=>{snd('click');openLeaderboardModal()};
if($('#dock-inv'))$('#dock-inv').onclick=()=>{snd('click');openInventoryModal()};

function renderAuthBar(){
  const bar=$('#auth-bar');
  if(!bar)return;
  updateLobbyBadge();
  const utilHtml=`<div class="auth-bar-right"><button type="button" class="auth-lb-btn" id="ab-guide" title="${tr('Nasıl Oynanır','How to Play')}"><span>${tr('Kurallar','Rules')}</span></button><button type="button" class="auth-lb-btn" id="ab-set" title="${tr('Ayarlar','Settings')}"><span>${tr('Ayarlar','Settings')}</span></button></div>`;
  if(!USER_ACC){
    bar.hidden=false;
    bar.innerHTML=`<div class="auth-bar-left"><button type="button" class="auth-pill auth-pill-empty" id="ab-login"><span>${tr('Giriş Yap / Kayıt Ol','Sign In / Register')}</span></button></div>${utilHtml}`;
    if($('#ab-login'))$('#ab-login').onclick=()=>{snd('click');openAuthModal('login',false)};
    if($('#ab-guide'))$('#ab-guide').onclick=()=>{snd('click');guide()};
    if($('#ab-set'))$('#ab-set').onclick=()=>{snd('click');settings()};
    applyQueueModeUi();
    return;
  }
  const guest=isGuestUser(USER_ACC);
  if(guest){
    const gFl=getAccountLeague(USER_ACC);
    bar.hidden=false;
    bar.innerHTML=`<div class="auth-bar-left"><button type="button" class="auth-pill ${gFl.cls}" id="ab-prof" title="${tr('Misafir Profili · Üye Ol','Guest Profile · Sign Up')}">
      <span class="ap-ic">${leagueCrestSvg(gFl.id,24)}</span>
      <span class="ap-info">
        <b>${tr('Misafir','Guest')}</b>
        <small>${escHtml(gFl.name)} · ${tr('Normal Oyun','Normal Play')}</small>
      </span>
    </button></div>${utilHtml}`;
    if($('#ab-prof'))$('#ab-prof').onclick=()=>{snd('click');openProfileModal('overview')};
    if($('#ab-guide'))$('#ab-guide').onclick=()=>{snd('click');guide()};
    if($('#ab-set'))$('#ab-set').onclick=()=>{snd('click');settings()};
    applyQueueModeUi();
    return;
  }
  const fl=getAccountLeague(USER_ACC);
  const nm=escHtml(USER_ACC.username);
  const stDays=Math.max(1,USER_ACC.streak||1);
  const rightPill=fl.unranked
    ?`<span class="ap-elo">${fl.placementGames}/5</span>`
    :'';
  bar.hidden=false;
  bar.innerHTML=`<div class="auth-bar-left"><button type="button" class="auth-pill ${fl.cls}" id="ab-prof" title="${tr('Profil, Lig & Günlük Seri','Profile, League & Daily Streak')}">
    <span class="ap-ic">${leagueCrestSvg(fl.id,24)}</span>
    <span class="ap-info">
      <b>${nm}</b>
      <small>${escHtml(fl.name)}${fl.provisional?` · ${fl.placementGames}/5`:''}</small>
    </span>
    <span class="ap-streak" title="${tr(`${stDays} Günlük Seri`,`${stDays}-Day Streak`)}">${stDays}${tr('g','d')}</span>
    ${rightPill}
  </button></div>${utilHtml}`;
  if($('#ab-prof'))$('#ab-prof').onclick=()=>{snd('click');openProfileModal('overview')};
  if($('#ab-guide'))$('#ab-guide').onclick=()=>{snd('click');guide()};
  if($('#ab-set'))$('#ab-set').onclick=()=>{snd('click');settings()};
  applyQueueModeUi();
}
/* ---------- BAŞARIMLAR, UNVANLAR, GÜNLÜK GÖREVLER, KOZMETİKLER & SEZONLAR ---------- */
function hasLeagueTier(a,minTier){
  if(!a||isGuestUser(a))return false;
  const lg=ensureLeagueState(a);
  if(lg.unranked)return false;
  return Math.max(lg.tier|0,lg.peakTier|0)>=minTier;
}
const totWins=a=>((a.wins||0)+(a.unrankedWins||0));
const ACHIEVEMENTS=[
  {id:'first_blood',ic:'◈',trN:'İlk Zafer',enN:'First Victory',trD:'İlk maçını kazan',enD:'Win your first match',trT:'Kan Yemini',enT:'Blood Oath'},
  {id:'nat20',ic:'✦',trN:'Nat 20 Mucizesi',enN:'Nat 20 Miracle',trD:'Ölüm Zarında 20 atarak hayatta kal',enD:'Survive Death Dice with a Natural 20',trT:'Kader Kıran',enT:'Fatebreaker'},
  {id:'imp_slayer',ic:'♛',trN:'İmkansızı Yenen',enN:'Impossible Slayer',trD:'İmkansız botu mağlup et',enD:'Defeat the Impossible AI',trT:'Hiçlik Avcısı',enT:'Void Hunter'},
  {id:'clean_win',ic:'❖',trN:'Kusursuz Zafer',enN:'Flawless Victory',trD:'Joker kullanmadan bir maç kazan',enD:'Win a match without playing any Jokers',trT:'Saf Stratejist',enT:'Pure Strategist'},
  {id:'survivor',ic:'†',trN:'Ölümsüz İrade',enN:'Undying Will',trD:'Tek maçta 2 kez Ölüm Zarından sağ çık',enD:'Survive Death Dice twice in one match',trT:'Ölümü Aldatan',enT:'Death Defier'},
  {id:'win_streak3',ic:'★',trN:'Durdurulamaz',enN:'Unstoppable',trD:'Üst üste 3 maç kazan',enD:'Win 3 matches in a row',trT:'Kızıl Fırtına',enT:'Crimson Storm'},
  {id:'veteran10',ic:'❖',trN:'Arena Gazisi',enN:'Arena Veteran',trD:'Toplam 10 maç tamamla',enD:'Complete 10 total matches',trT:'Gölge Ustası',enT:'Shadow Master'},
  {id:'blood_lord',ic:'◈',trN:'Kan Efendisi',enN:'Blood Lord',trD:'Altın Ligine ulaş',enD:'Reach Gold League',trT:'Kan Efendisi',enT:'Blood Lord'},
  {id:'necromancer',ic:'✦',trN:'Ölüm Büyücüsü',enN:'Necromancer',trD:'Zümrüt Ligine ulaş',enD:'Reach Emerald League',trT:'Ölüm Büyücüsü',enT:'Necromancer'},
  {id:'daily3',ic:'☾',trN:'Sadık Düellocu',enN:'Devoted Duelist',trD:'3 günlük giriş serisine ulaş',enD:'Reach a 3-day login streak',trT:'Ebedi Nöbetçi',enT:'Eternal Sentinel'}
];
const CARD_BACKS=[
  {id:'classic',trN:'Kuzgun Parşömeni',enN:'Raven Parchment',req:()=>true,trR:'Varsayılan',enR:'Default'},
  {id:'bone',trN:'Klasik Kemik',enN:'Classic Bone',req:()=>true,trR:'Ücretsiz Kozmetik',enR:'Free Cosmetic'},
  {id:'crimson',trN:'Kızıl Mühür',enN:'Crimson Seal',req:a=>totWins(a)>=3||hasLeagueTier(a,1),trR:'3 Zafer veya Gümüş Ligi',enR:'3 Wins or Silver League'},
  {id:'ghost',trN:'Hayalet Örtü',enN:'Ghost Shroud',req:a=>totWins(a)>=5||(a.achievements||[]).includes('survivor'),trR:'5 Zafer veya Ölümsüz İrade',enR:'5 Wins or Undying Will'},
  {id:'obsidian',trN:'Obsidyen Altın',enN:'Obsidian Gold',req:a=>totWins(a)>=10||hasLeagueTier(a,2),trR:'10 Zafer veya Altın Ligi',enR:'10 Wins or Gold League'},
  {id:'moonlight',trN:'Ay Işığı Rünü',enN:'Moonlight Rune',req:a=>(a.achievements||[]).includes('imp_slayer')||hasLeagueTier(a,3),trR:'İmkansız Bot Zaferi / Zümrüt Ligi',enR:'Beat Impossible AI / Emerald League'},
  {id:'sovereign',trN:'Ölümsüz Hükümdar',enN:'Undying Sovereign',req:a=>hasLeagueTier(a,4),trR:'Elmas Ligi',enR:'Diamond League'}
];
const DICE_SKINS=[
  {id:'ruby',trN:'Kanlı Yakut',enN:'Blood Ruby',req:()=>true,trR:'Varsayılan',enR:'Default'},
  {id:'bone',trN:'Antik Kemik',enN:'Ancient Bone',req:a=>totWins(a)>=2||(a.achievements||[]).includes('veteran10'),trR:'2 Zafer',enR:'2 Wins'},
  {id:'emerald',trN:'Zümrüt Kalp',enN:'Emerald Heart',req:a=>totWins(a)>=4||hasLeagueTier(a,1),trR:'4 Zafer veya Gümüş Ligi',enR:'4 Wins or Silver League'},
  {id:'gold',trN:'Altın Rünlü',enN:'Golden Rune',req:a=>totWins(a)>=8||hasLeagueTier(a,2),trR:'8 Zafer veya Altın Ligi',enR:'8 Wins or Gold League'},
  {id:'spectral',trN:'Hayalet Zarı',enN:'Spectral Die',req:a=>totWins(a)>=10||(a.achievements||[]).includes('survivor')||(a.achievements||[]).includes('nat20'),trR:'10 Zafer / Nat 20 / Ölümsüz İrade',enR:'10 Wins / Nat 20 / Undying Will'},
  {id:'obsidian',trN:'Obsidyen Alev',enN:'Obsidian Ember',req:a=>totWins(a)>=12||hasLeagueTier(a,3),trR:'12 Zafer veya Zümrüt Ligi',enR:'12 Wins or Emerald League'},
  {id:'void',trN:'Hiçlik Zarı',enN:'Void Die',req:a=>(a.achievements||[]).includes('imp_slayer')||hasLeagueTier(a,4),trR:'İmkansız Bot Zaferi / Elmas Ligi',enR:'Beat Impossible AI / Diamond League'}
];
const BOARD_THEMES=[
  {id:'classic',trN:'Donmuş Mahzen',enN:'Frozen Vault',req:()=>true,trR:'Varsayılan',enR:'Default'},
  {id:'gothic',trN:'Gotik Masa',enN:'Gothic Table',req:()=>true,trR:'Ücretsiz Kozmetik',enR:'Free Cosmetic'},
  {id:'emerald',trN:'Zümrüt Mahzen',enN:'Emerald Crypt',req:a=>totWins(a)>=5||hasLeagueTier(a,1),trR:'5 Zafer veya Gümüş Ligi',enR:'5 Wins or Silver League'},
  {id:'crimson',trN:'Kanlı Sunak',enN:'Blood Altar',req:a=>totWins(a)>=10||hasLeagueTier(a,2),trR:'10 Zafer veya Altın Ligi',enR:'10 Wins or Gold League'},
  {id:'void',trN:'Hiçlik Tahtı',enN:'Void Throne',req:a=>(a.achievements||[]).includes('imp_slayer')||hasLeagueTier(a,3),trR:'İmkansız Bot Zaferi / Zümrüt Ligi',enR:'Beat Impossible AI / Emerald League'},
  {id:'gold',trN:'Altın Hazine',enN:'Golden Vault',req:a=>hasLeagueTier(a,4),trR:'Elmas Ligi',enR:'Diamond League'}
];
const D20_EFFECTS=[
  {id:'classic',trN:'Klasik Parıltı',enN:'Classic Glow',req:()=>true,trR:'Varsayılan',enR:'Default'},
  {id:'sparks',trN:'Kızıl Kıvılcım',enN:'Crimson Sparks',req:a=>totWins(a)>=2,trR:'2 Zafer',enR:'2 Wins'},
  {id:'frost',trN:'Buzul Halkası',enN:'Frost Ring',req:a=>totWins(a)>=4,trR:'4 Zafer',enR:'4 Wins'},
  {id:'emerald',trN:'Zümrüt Fırtına',enN:'Emerald Surge',req:a=>totWins(a)>=6||hasLeagueTier(a,1),trR:'6 Zafer veya Gümüş Ligi',enR:'6 Wins or Silver League'},
  {id:'runes',trN:'Altın Rün Halkası',enN:'Golden Rune Ring',req:a=>totWins(a)>=10||hasLeagueTier(a,2),trR:'10 Zafer veya Altın Ligi',enR:'10 Wins or Gold League'},
  {id:'void',trN:'Mor Hiçlik Dumanı',enN:'Void Mist',req:a=>(a.achievements||[]).includes('imp_slayer')||hasLeagueTier(a,3),trR:'İmkansız Bot Zaferi / Zümrüt Ligi',enR:'Beat Impossible AI / Emerald League'}
];
function spawnD20LandingFx(dEl){
  try{
    const fxId=document.body.dataset.d20fx||'classic';
    if(!dEl||fxId==='classic'||RM)return;
    const stg=dEl.querySelector('.d20-stage');if(!stg)return;
    const old=stg.querySelector('.d20-fx-ring');if(old)old.remove();
    const ring=document.createElement('div');
    ring.className='d20-fx-ring fx-'+fxId;
    stg.appendChild(ring);
    setTimeout(()=>{if(ring.isConnected)ring.remove()},1150);
  }catch(e){}
}
const HERO_MASTERY_TITLES={
  c:{tr:'Zamanın Tüccarı',en:'Merchant of Time'},
  p:{tr:'Veba Üstadı',en:'Plague Master'},
  n:{tr:'Kara Ferman',en:'Dark Decree'},
  a:{tr:'Yazgı Kraliçesi',en:'Queen of Fate'},
  s:{tr:'Gölge Büyücüsü',en:'Shadow Archmage'},
  e:{tr:'Buzul Muhafızı',en:'Glacial Warden'},
  m:{tr:'Ölümün Elçisi',en:'Herald of Death'},
  w:{tr:'Kuzgun Kahini',en:'Raven Oracle'},
  l:{tr:'Kanlı Alfa',en:'Blood Alpha'},
  v:{tr:'Ebedi Vampir',en:'Eternal Vampire'},
  u:{tr:'Hiçlik Hükümdarı',en:'Void Sovereign'}
};
function getHeroMastery(acc,hid){
  const w=(acc&&acc.heroStats&&acc.heroStats[hid]&&acc.heroStats[hid].w)||0;
  const tier=w>=30?3:w>=15?2:w>=5?1:0;
  const next=w>=30?30:w>=15?30:w>=5?15:5;
  const roman=tier===3?'III':tier===2?'II':tier===1?'I':'';
  const name=tier===3?tr('Efsane','Legend'):tier===2?tr('Usta','Master'):tier===1?tr('Kıdemli','Veteran'):tr('Çırak','Novice');
  return {w,tier,next,roman,name};
}
const PROFILE_FRAMES=[
  {id:'classic',trN:'Antik Bronz',enN:'Ancient Bronze',req:()=>true,trR:'Varsayılan',enR:'Default'},
  {id:'crimson',trN:'Kanlı Yakut',enN:'Blood Ruby',req:a=>totWins(a)>=2,trR:'2 Zafer',enR:'2 Wins'},
  {id:'emerald',trN:'Zümrüt Mühür',enN:'Emerald Seal',req:a=>totWins(a)>=5||hasLeagueTier(a,1),trR:'5 Zafer veya Gümüş Ligi',enR:'5 Wins or Silver League'},
  {id:'gold',trN:'Kraliyet Altını',enN:'Royal Gold',req:a=>totWins(a)>=10||hasLeagueTier(a,2),trR:'10 Zafer veya Altın Ligi',enR:'10 Wins or Gold League'},
  {id:'frost',trN:'Buzul Taç',enN:'Frost Crown',req:a=>(a.achievements||[]).includes('veteran10')||hasLeagueTier(a,3),trR:'Arena Gazisi / Zümrüt Ligi',enR:'Arena Veteran / Emerald League'},
  {id:'void',trN:'Hiçlik Aurası',enN:'Void Aura',req:a=>(a.achievements||[]).includes('imp_slayer')||hasLeagueTier(a,4),trR:'İmkansız Bot Zaferi / Elmas Ligi',enR:'Beat Impossible AI / Diamond League'}
];
const DAILY_QUEST_POOL=[
  {id:'play2',trN:'2 Maç Tamamla',enN:'Complete 2 Matches',goal:2,ic:'❖'},
  {id:'win1',trN:'1 Maç Kazan',enN:'Win 1 Match',goal:1,ic:'★'},
  {id:'jokers4',trN:'4 Joker Oyna',enN:'Play 4 Jokers',goal:4,ic:'◈'},
  {id:'survive1',trN:'Ölüm Zarından 1 Kez Sağ Çık',enN:'Survive Death Dice Once',goal:1,ic:'†'},
  {id:'ranked1',trN:'1 Dereceli Maç Oyna',enN:'Play 1 Ranked Match',goal:1,ic:'✦'}
];
function getTitleLabel(id){
  if(!id)return '';
  if(String(id).startsWith('m_')){
    const mt=HERO_MASTERY_TITLES[String(id).slice(2)];
    return mt?(isEn()?mt.en:mt.tr):'';
  }
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  return a?(isEn()?a.enT:a.trT):'';
}
const BOARD_IMG_MAP={
  classic:'board_frost.jpg?v=20261125_b1',
  gothic:'board_gothic.jpg?v=20261115_sym1',
  emerald:'board_gothic.jpg?v=20261115_sym1',
  crimson:'board_crimson.jpg?v=20261125_b1',
  void:'board_gothic.jpg?v=20261115_sym1',
  gold:'board_gold.jpg?v=20261125_b1'
};
const CARDBACK_IMG_MAP={
  classic:'img/cb_classic.jpg?v=20261127_cb_rp1',
  bone:'img/cb_bone.jpg?v=20261127_cb_bone2',
  crimson:'img/cb_crimson.jpg?v=20261125_cb1',
  ghost:'img/cb_ghost.jpg?v=20261125_cb1',
  obsidian:'img/cb_obsidian.jpg?v=20261125_cb1',
  moonlight:'img/cb_moonlight.jpg?v=20261125_cb3',
  sovereign:'img/cb_sovereign.jpg?v=20261125_cb1'
};
function applyCosmetics(acc){
  try{
    const cb=(acc&&acc.cardBack)||'classic';
    const fr=(acc&&acc.frame)||'classic';
    const ds=(acc&&acc.diceSkin)||'ruby';
    const bt=(acc&&acc.boardTheme)||'classic';
    const fx=(acc&&acc.d20Effect)||'classic';
    document.body.dataset.cardback=cb;
    document.body.dataset.frame=fr;
    document.body.dataset.diceskin=ds;
    document.body.dataset.board=bt;
    document.body.dataset.d20fx=fx;
    window.D20_SKIN=ds;
    const cbUrl=CARDBACK_IMG_MAP[cb]||CARDBACK_IMG_MAP.classic;
    document.documentElement.style.setProperty('--bn',`url("${cbUrl}")`);
    const bgCvs=document.getElementById('lor-valley-bg');
    if(bgCvs){
      const imgUrl=BOARD_IMG_MAP[bt]||BOARD_IMG_MAP.classic;
      bgCvs.style.background=`url('${imgUrl}') center/cover no-repeat #070508`;
    }
  }catch(e){}
}
let HOLD_UNLOCK_TOASTS=false,QUEUED_UNLOCK_TOASTS=[];
function flushUnlockToasts(){
  HOLD_UNLOCK_TOASTS=false;
  if(!QUEUED_UNLOCK_TOASTS.length)return;
  const q=QUEUED_UNLOCK_TOASTS.splice(0);
  q.forEach((t,i)=>setTimeout(()=>showUnlockToast(t.ic,t.title,t.sub,true),i*420));
}
function showUnlockToast(ic,title,sub,forceNow=false){
  if(HOLD_UNLOCK_TOASTS&&!forceNow){
    QUEUED_UNLOCK_TOASTS.push({ic,title,sub});
    return;
  }
  const old=document.getElementById('streak-toast');
  if(old)old.remove();
  const el=document.createElement('div');
  el.id='streak-toast';
  el.className='streak-toast';
  el.innerHTML=`<span class="st-fire">${ic}</span><div class="st-txt"><b>${title}</b><small>${sub}</small></div>`;
  document.body.appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),420)},3800);
}
function ensureDailyQuests(acc){
  if(!acc)return null;
  const today=dayKey(0);
  if(acc.quests&&acc.quests.day===today&&Array.isArray(acc.quests.items)&&acc.quests.items.length===3){
    return acc.quests;
  }
  let seed=0;
  for(let i=0;i<today.length;i++)seed=(seed*31+today.charCodeAt(i))>>>0;
  const pool=[...DAILY_QUEST_POOL];
  const picked=[];
  while(picked.length<3&&pool.length){
    seed=(seed*1664525+1013904223)>>>0;
    const idx=seed%pool.length;
    const q=pool.splice(idx,1)[0];
    picked.push({id:q.id,goal:q.goal,cur:0,done:false});
  }
  acc.quests={day:today,items:picked};
  return acc.quests;
}
function progressQuest(qid,amt=1,deferSave=false){
  if(!USER_ACC||MODE==='tutorial'||MODE==='spectator')return;
  const qObj=ensureDailyQuests(USER_ACC);
  if(!qObj||!Array.isArray(qObj.items))return;
  let changed=false;
  for(const it of qObj.items){
    if(it.id===qid&&!it.done){
      it.cur=Math.min(it.goal,(it.cur||0)+amt);
      changed=true;
      if(it.cur>=it.goal){
        it.done=true;
        const meta=DAILY_QUEST_POOL.find(x=>x.id===qid);
        if(meta)showUnlockToast('✦',tr('Günlük Görev Tamamlandı!','Daily Quest Completed!'),isEn()?meta.enN:meta.trN);
      }
    }
  }
  if(changed&&!deferSave)saveSession(USER_ACC);
}
function onPlayerD20Survive(rawRoll,S){
  if(!USER_ACC||MODE==='tutorial'||MODE==='spectator')return;
  progressQuest('survive1',1,true);
  if(rawRoll===20)evaluateAchievements(USER_ACC,{nat20:true});
  saveSession(USER_ACC);
}
function evaluateAchievements(acc,ctx={}){
  if(!acc)return;
  acc.achievements=Array.isArray(acc.achievements)?acc.achievements:[];
  const has=id=>acc.achievements.includes(id);
  const totWins=(acc.wins||0)+(acc.unrankedWins||0);
  const totMatches=(acc.matches||0)+(acc.unrankedMatches||0);
  const peak=Math.max(acc.peakElo||1200,acc.elo||1200);
  const checks=[
    ['first_blood',totWins>=1],
    ['nat20',!!ctx.nat20],
    ['imp_slayer',!!(ctx.won&&ctx.mode==='bot'&&ctx.diff==='imp')],
    ['clean_win',!!(ctx.won&&ctx.myJokersUsed===0)],
    ['survivor',!!(ctx.myD20Surv>=2)],
    ['win_streak3',(acc.winStreak||0)>=3],
    ['veteran10',totMatches>=10],
    ['blood_lord',hasLeagueTier(acc,2)],
    ['necromancer',hasLeagueTier(acc,3)],
    ['daily3',(acc.bestStreak||acc.streak||1)>=3]
  ];
  let firstNew=null;
  for(const [id,ok] of checks){
    if(ok&&!has(id)){
      acc.achievements.push(id);
      if(!firstNew)firstNew=ACHIEVEMENTS.find(a=>a.id===id);
    }
  }
  if(firstNew){
    showUnlockToast('★',tr('Başarım Açıldı!','Achievement Unlocked!'),`${isEn()?firstNew.enN:firstNew.trN} · ${tr('Unvan','Title')}: ${isEn()?firstNew.enT:firstNew.trT}`);
  }
}
function getCurrentSeason(){
  const now=new Date();
  const y=now.getFullYear(),m=now.getMonth();
  const num=(y-2026)*12+(m-10)+1; // Kasım 2026 = Sezon 1
  const end=new Date(y,m+1,1,0,0,0);
  const daysLeft=Math.max(1,Math.ceil((end-now)/86400000));
  const mo=tr('Ocak,Şubat,Mart,Nisan,Mayıs,Haziran,Temmuz,Ağustos,Eylül,Ekim,Kasım,Aralık','January,February,March,April,May,June,July,August,September,October,November,December').split(',');
  return {num:Math.max(1,num),label:`${tr('Sezon','Season')} ${Math.max(1,num)} · ${mo[m]} ${y}`,daysLeft};
}

async function openLeaderboardModal(activeTab='rank'){
  const mb=$('#mb');
  if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode','lb-mode');
  const season=getCurrentSeason();
  mb.innerHTML=`<div class="lb-wrap">
    <div class="lb-head">
      <h3>${tr('Lig Sıralaması','League Leaderboard')}</h3>
      <p class="lb-sub">${season.label} · ${tr(`${season.daysLeft} gün kaldı`,`${season.daysLeft}d left`)}</p>
    </div>
    <div class="lb-loading">${tr('Sıralama yükleniyor…','Loading leaderboard…')}</div>
    <div class="row lb-acts"><button type="button" id="lb-close" class="btn alt sm">${tr('Kapat','Close')}</button></div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode','lb-mode');$('#m').hidden=true;lock=false};
  if($('#lb-close'))$('#lb-close').onclick=()=>{snd('click');close()};

  const byKey=new Map();
  const packUser=(u,k)=>{
    const clone={elo:Math.round(u.elo||1200),matches:u.matches||((u.wins||0)+(u.losses||0)),wins:u.wins||0,losses:u.losses||0,league:u.league||null};
    const lg=ensureLeagueState(clone);
    const fl=formatLeague(lg,false);
    return {key:k,username:u.username,elo:clone.elo,wins:u.wins||0,losses:u.losses||0,streak:u.streak||1,title:u.title||'',lg,fl,score:leagueScoreKey(lg)};
  };
  try{
    const localMap=loadLocalUsers();
    Object.values(localMap).forEach(u=>{
      if(isRegisteredMember(u)){
        const k=u.key||normUserKey(u.username);
        if(k)byKey.set(k,packUser(u,k));
      }
    });
  }catch(e){}
  let hofList=[];
  if(fbDb){
    try{
      const snap=await fbDb.collection('users').orderBy('elo','desc').limit(50).get();
      snap.forEach(doc=>{
        const u=doc.data();
        if(isRegisteredMember(u)){
          const k=u.key||doc.id||normUserKey(u.username);
          byKey.set(k,packUser(u,k));
        }
      });
    }catch(e){}
    try{
      const hSnap=await fbDb.collection('seasons_hof').orderBy('seasonNum','desc').limit(12).get();
      hSnap.forEach(doc=>{const d=doc.data();if(d&&d.champion)hofList.push(d)});
    }catch(e){}
  }
  if(!mb.classList.contains('lb-mode'))return;
  const list=[...byKey.values()].sort((a,b)=>(b.score-a.score)||(b.elo-a.elo)||(b.wins-a.wins)||a.username.localeCompare(b.username));
  const myKey=isRegisteredMember(USER_ACC)?(USER_ACC.key||normUserKey(USER_ACC.username)):'';
  const myIdx=myKey?list.findIndex(u=>u.key===myKey):-1;

  let curTab=activeTab;
  const renderLb=()=>{
    const tabsHtml=`<div class="pr-tabs lb-tabs">
      <button type="button" class="pr-tab${curTab==='rank'?' act':''}" data-lt="rank">${tr('Sezon Sıralaması','Season Standings')}</button>
      <button type="button" class="pr-tab${curTab==='hof'?' act':''}" data-lt="hof">${tr('Onur Listesi','Hall of Fame')}</button>
    </div>`;
    let bodyHtml='';
    if(curTab==='rank'){
      const rowsHtml=list.length?list.map((u,i)=>{
        const pos=i+1;
        const fl=u.fl;
        const isMe=!!(myKey&&u.key===myKey);
        const med=`#${pos}`;
        const tTag=u.title?`<span class="lb-title-tag">${escHtml(getTitleLabel(u.title))}</span> · `:'';
        const rightDisp=fl.unranked?`${fl.placementGames}/5 <i>${tr('Maç','Gm')}</i>`:`${fl.lp} <i>LP</i>`;
        return `<div class="lb-row${pos<=3?' top'+pos:''}${isMe?' me':''}">
          <span class="lb-pos">${med}</span>
          <span class="lb-rk" title="${escHtml(fl.name)}">${leagueCrestSvg(fl.id,28)}</span>
          <div class="lb-u">
            <b>${escHtml(u.username)}${isMe?` <em>(${tr('Sen','You')})</em>`:''}</b>
            <small><span class="lb-lg-tag ${fl.cls}">${escHtml(fl.name)}</span> · ${tTag}${u.wins}${tr('G','W')} / ${u.losses}${tr('M','L')}</small>
          </div>
          <span class="lb-elo">${rightDisp}</span>
        </div>`;
      }).join(''):`<div class="lb-empty">${tr('Henüz kayıtlı üye bulunmuyor. İlk sırayı almak için üye ol!','No registered members yet. Register to claim #1!')}</div>`;
      const myBarHtml=myIdx>=0
        ?`<div class="lb-my-bar">${tr('Senin Sıran','Your Rank')}: <b>#${myIdx+1}</b> / ${list.length} · <b>${escHtml(list[myIdx].fl.name)} (${list[myIdx].fl.lp} LP)</b></div>`
        :(USER_ACC&&USER_ACC.isGuest?`<div class="lb-my-bar guest">${tr('Sıralamaya girmek için üye ol!','Register to appear on the leaderboard!')}</div>`:'');
      bodyHtml=`<div class="lb-list">${rowsHtml}</div>${myBarHtml}`;
    }else{
      const leader=list[0];
      const liveChamp=leader
        ?`<div class="hof-card live">
            <div class="hof-s">${season.label} · <span>${tr('Güncel Lider','Current Leader')}</span></div>
            <div class="hof-name">${leagueCrestSvg(leader.fl.id,24)} ${escHtml(leader.username)}</div>
            <div class="hof-meta">${escHtml(leader.fl.name)} · ${leader.fl.lp} LP · ${leader.wins}${tr('G','W')} / ${leader.losses}${tr('M','L')} · ${tr(`${season.daysLeft} gün sonra taçlanır`,`crowned in ${season.daysLeft}d`)}</div>
          </div>`
        :`<div class="lb-empty">${tr('Bu sezon henüz lider yok.','No season leader yet.')}</div>`;
      const pastHtml=hofList.map(h=>`<div class="hof-card">
        <div class="hof-s">${escHtml(h.label||(`Sezon ${h.seasonNum}`))}</div>
        <div class="hof-name">${escHtml(h.champion)}</div>
        <div class="hof-meta">${escHtml(h.leagueName||eloRank(h.elo||1200).name)}</div>
      </div>`).join('');
      bodyHtml=`<div class="lb-list">${liveChamp}${pastHtml}</div>`;
    }
    mb.innerHTML=`<div class="lb-wrap">
      <div class="lb-head">
        <h3>${tr('Lig Sıralaması','League Leaderboard')}</h3>
        <p class="lb-sub">${season.label} · ${tr(`${list.length} üye · ${season.daysLeft} gün kaldı`,`${list.length} members · ${season.daysLeft}d left`)}</p>
      </div>
      ${tabsHtml}
      ${bodyHtml}
      <div class="row lb-acts">
        ${(USER_ACC&&USER_ACC.isGuest)?`<button type="button" id="lb-reg" class="btn alt sm">${tr('Üye Ol','Register')}</button>`:''}
        <button type="button" id="lb-close" class="btn sm">${tr('Kapat','Close')}</button>
      </div>
    </div>`;
    mb.querySelectorAll('.lb-tabs .pr-tab').forEach(b=>b.onclick=()=>{snd('click');curTab=b.dataset.lt;renderLb()});
    if($('#lb-close'))$('#lb-close').onclick=()=>{snd('click');close()};
    if($('#lb-reg'))$('#lb-reg').onclick=()=>{snd('click');mb.classList.remove('lb-mode');openAuthModal('register',true)};
  };
  renderLb();
}
function fmtMatchTime(ts){
  if(!ts)return '';
  try{
    const d=new Date(ts);
    const dk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hm=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if(dk===dayKey(0))return `${tr('Bugün','Today')} ${hm}`;
    if(dk===dayKey(-1))return `${tr('Dün','Yesterday')} ${hm}`;
    const mo=tr('Oca,Şub,Mar,Nis,May,Haz,Tem,Ağu,Eyl,Eki,Kas,Ara','Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec').split(',');
    return `${d.getDate()} ${mo[d.getMonth()]} ${hm}`;
  }catch(e){return ''}
}
function openProfileModal(initialTab='overview'){
  if(!USER_ACC)return openAuthModal('login',false);
  const mb=$('#mb');
  if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode');
  mb.classList.add('auth-mode','pr-mode');
  let curTab=initialTab;
  const close=()=>{mb.classList.remove('auth-mode','pr-mode');$('#m').hidden=true;lock=false};
  const renderProf=(acc)=>{
    ensureDailyQuests(acc);
    evaluateAchievements(acc,{});
    const lg=ensureLeagueState(acc);
    const fl=formatLeague(lg,false);
    const pkFl=lg.unranked?fl:formatLeague({unranked:false,tier:lg.peakTier,div:lg.peakDiv,lp:lg.peakLp,placementGames:5},false);
    const nm=acc.isGuest?tr('Misafir Oyuncu','Guest Player'):escHtml(acc.username);
    const eqTitle=acc.title?getTitleLabel(acc.title):'';
    const frCls='fr-'+(acc.frame||'classic');
    const rWins=acc.wins||0,rLosses=acc.losses||0,rMatches=Math.max(acc.matches||0,rWins+rLosses);
    const uWins=acc.unrankedWins||0,uLosses=acc.unrankedLosses||0,uMatches=Math.max(acc.unrankedMatches||0,uWins+uLosses);
    const totWins=rWins+uWins,totLosses=rLosses+uLosses,totMatches=rMatches+uMatches;
    const wr=totMatches?Math.round((totWins/totMatches)*100):0;
    const stCur=Math.max(1,acc.streak||1),stBest=Math.max(stCur,acc.bestStreak||1);
    const hist=Array.isArray(acc.history)?acc.history:[];
    const qDoneCnt=(acc.quests&&acc.quests.items)?acc.quests.items.filter(x=>x.done).length:0;

    let tabBody='';
    if(curTab==='overview'){
      const histHtml=hist.length
        ?hist.map(h=>{
            const tm=fmtMatchTime(h.ts);
            const sc=h.score?` · ${escHtml(h.score)}`:'';
            let oppDisp=h.opp||'';
            if(h.mode==='bot'&&h.diff==='imp'&&h.oppHero&&NAMES[h.oppHero]&&h.oppHero!=='u'&&/^(Bilinmeyen|Unknown)\s*\(/i.test(oppDisp)){
              oppDisp=`${NAMES[h.oppHero]} (${tr('İmkansız','Impossible')})`;
            }
            const rightHtml=h.unranked
              ?`<b class="pr-hunr">${tr('Normal Oyun','Normal')} <i>(0 LP)</i></b>`
              :(h.lpDelta!=null
                ?`<b>${h.lpDelta>0?'+':''}${h.lpDelta} LP <i>(${escHtml(h.leagueLabel||fl.name)})</i></b>`
                :`<b>${h.delta>=0?'+':''}${h.delta} <i>(${tr('Eski Sezon','Legacy')})</i></b>`);
            return `<div class="pr-hrow ${h.won?'w':'l'}${h.unranked?' unr':''}">
              <div class="pr-hl">
                <span>${h.won?tr('Zafer','Win'):tr('Mağlubiyet','Loss')} · ${escHtml(oppDisp)}${sc}${h.doublePromoted?` <em>(+2 ${tr('Küme','Div')})</em>`:h.promoted?` <em>(${tr('Terfi','Promo')})</em>`:''}</span>
                ${tm?`<small class="pr-htm">${tm}</small>`:''}
              </div>
              ${rightHtml}
            </div>`;
          }).join('')
        :`<div class="pr-hempty">${tr('Henüz kayıtlı maç bulunmuyor.','No recorded matches yet.')}</div>`;
      const subGames=uMatches>0?` (${rMatches} ${tr('Dereceli','Ranked')} · ${uMatches} ${tr('Normal','Normal')})`:'';
      const isG=isGuestUser(acc);
      const curLigTxt=fl.unranked?tr(`Yerleştirme (${fl.placementGames}/5)`,`Placements (${fl.placementGames}/5)`):fl.name;
      const pkLigTxt=isG?tr('Yok','None'):(fl.unranked?tr('Derecesiz','Unranked'):`${pkFl.name}`);
      tabBody=`<div class="pr-grid">
        <div class="pr-stat"><span>${tr('Güncel Lig','Current League')}</span><b>${escHtml(curLigTxt)}</b></div>
        <div class="pr-stat"><span>${tr('Zirve Lig','Peak League')}</span><b>${escHtml(pkLigTxt)}</b></div>
        <div class="pr-stat"><span>${tr('Galibiyet / Mağlubiyet','Wins / Losses')}</span><b>${totWins} / ${totLosses}</b></div>
        <div class="pr-stat"><span>${tr('Kazanma Oranı','Win Rate')}</span><b>%${wr}</b></div>
        <div class="pr-stat pr-stat-fire"><span>${tr('Günlük Seri','Daily Streak')}</span><b>${stCur} ${tr('Gün','Days')}</b></div>
        <div class="pr-stat"><span>${tr('En İyi Seri','Best Streak')}</span><b>${stBest} ${tr('Gün','Days')}</b></div>
      </div>
      <div class="pr-sec-lbl">${tr('Son Maçlar','Recent Matches')} (${hist.length})${subGames}</div>
      <div class="pr-hist">${histHtml}</div>`;
    }else if(curTab==='quests'){
      const items=(acc.quests&&acc.quests.items)||[];
      tabBody=`<div class="pr-sec-lbl">${tr('Bugünün Görevleri','Today\'s Quests')} (${qDoneCnt}/3)</div>
      <div class="pr-scroll-box">
        ${items.map(it=>{
          const meta=DAILY_QUEST_POOL.find(x=>x.id===it.id)||{ic:'✦',trN:it.id,enN:it.id};
          const pct=Math.min(100,Math.round(((it.cur||0)/Math.max(1,it.goal))*100));
          return `<div class="q-card${it.done?' done':''}">
            <span class="q-ic">${it.done?'✔':meta.ic}</span>
            <div class="q-body">
              <div class="q-top"><b>${isEn()?meta.enN:meta.trN}</b><span>${it.cur||0} / ${it.goal}</span></div>
              <div class="q-bar"><i style="width:${pct}%"></i></div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }else if(curTab==='heroes'){
      const hs={...(acc.heroStats||{})};
      if(!Object.keys(hs).length&&hist.length){
        hist.forEach(h=>{if(h.myHero){if(!hs[h.myHero])hs[h.myHero]={w:0,l:0};if(h.won)hs[h.myHero].w++;else hs[h.myHero].l++}});
      }
      const rows=Object.entries(hs).map(([hid,st])=>({hid,w:st.w||0,l:st.l||0,tot:(st.w||0)+(st.l||0)})).filter(x=>x.tot>0).sort((a,b)=>b.tot-a.tot||b.w-a.w);
      tabBody=`<div class="pr-sec-lbl">${tr('Kahraman Ustalığı & Performans','Hero Mastery & Performance')}</div>
      <div class="pr-scroll-box">
        ${rows.length?rows.map(r=>{
          const hObj=HERO_MAP[r.hid];
          const hName=hObj?hObj.name:r.hid;
          const hWr=Math.round((r.w/r.tot)*100);
          const mst=getHeroMastery(acc,r.hid);
          const mstPct=mst.tier>=3?100:Math.min(100,Math.round((r.w/mst.next)*100));
          const mTitleId='m_'+r.hid,mTitleTxt=getTitleLabel(mTitleId),eqM=acc.title===mTitleId;
          const mBadge=mst.tier?`<span class="mst-pill m${mst.tier}">${mst.name} ${mst.roman}</span>`:`<span class="mst-pill m0">${r.w}/${mst.next}</span>`;
          const mBtn=mst.tier&&mTitleTxt?`<button type="button" class="btn sm ach-eq${eqM?' alt':''}" data-title="${eqM?'':mTitleId}" title="${escHtml(mTitleTxt)}">${eqM?tr('Takılı','Equipped'):escHtml(mTitleTxt)}</button>`:'';
          return `<div class="hs-stat-row${mst.tier?` mastery-${mst.tier}`:''}">
            <img class="${mst.tier?`mastery-${mst.tier}`:''}" src="${avSrc(r.hid)}" alt="${escHtml(hName)}">
            <div class="hs-stat-info">
              <div class="q-top"><b>${escHtml(hName)} ${mBadge}</b><span>%${hWr} (${r.w}${tr('G','W')} / ${r.l}${tr('M','L')})</span></div>
              <div class="q-bar"><i style="width:${mstPct}%"></i></div>
            </div>
            ${mBtn}
          </div>`;
        }).join(''):`<div class="pr-hempty">${tr('Kahraman istatistiği için en az 1 maç oyna.','Play at least 1 match to track hero stats.')}</div>`}
      </div>`;
    }else{
      const unlocked=new Set(acc.achievements||[]);
      const dsHtml=DICE_SKINS.map(ds=>{
        const ok=ds.req(acc),sel=(acc.diceSkin||'ruby')===ds.id;
        return `<button type="button" class="cos-chip${sel?' sel':''}${ok?'':' lock'}" data-ds="${ds.id}" ${ok?'':'disabled'} title="${isEn()?ds.enR:ds.trR}">
          <i class="ds-sw ds-${ds.id}"></i><span>${isEn()?ds.enN:ds.trN}</span>${ok?'':`<small>${tr('Kilitli','Locked')}</small>`}
        </button>`;
      }).join('');
      const fxHtml=D20_EFFECTS.map(fx=>{
        const ok=fx.req(acc),sel=(acc.d20Effect||'classic')===fx.id;
        return `<button type="button" class="cos-chip${sel?' sel':''}${ok?'':' lock'}" data-fx="${fx.id}" ${ok?'':'disabled'} title="${isEn()?fx.enR:fx.trR}">
          <i class="fx-sw fx-${fx.id}"></i><span>${isEn()?fx.enN:fx.trN}</span>${ok?'':`<small>${tr('Kilitli','Locked')}</small>`}
        </button>`;
      }).join('');
      const btHtml=BOARD_THEMES.map(bt=>{
        const ok=bt.req(acc),sel=(acc.boardTheme||'classic')===bt.id;
        return `<button type="button" class="cos-chip${sel?' sel':''}${ok?'':' lock'}" data-bt="${bt.id}" ${ok?'':'disabled'} title="${isEn()?bt.enR:bt.trR}">
          <i class="bt-sw bt-${bt.id}"></i><span>${isEn()?bt.enN:bt.trN}</span>${ok?'':`<small>${tr('Kilitli','Locked')}</small>`}
        </button>`;
      }).join('');
      const cbHtml=CARD_BACKS.map(cb=>{
        const ok=cb.req(acc),sel=(acc.cardBack||'classic')===cb.id;
        return `<button type="button" class="cos-chip${sel?' sel':''}${ok?'':' lock'}" data-cb="${cb.id}" ${ok?'':'disabled'} title="${isEn()?cb.enR:cb.trR}">
          <i class="cb-sw cb-${cb.id}"></i><span>${isEn()?cb.enN:cb.trN}</span>${ok?'':`<small>${tr('Kilitli','Locked')}</small>`}
        </button>`;
      }).join('');
      const frHtml=PROFILE_FRAMES.map(fr=>{
        const ok=fr.req(acc),sel=(acc.frame||'classic')===fr.id;
        return `<button type="button" class="cos-chip${sel?' sel':''}${ok?'':' lock'}" data-fr="${fr.id}" ${ok?'':'disabled'} title="${isEn()?fr.enR:fr.trR}">
          <i class="fr-sw fr-${fr.id}"></i><span>${isEn()?fr.enN:fr.trN}</span>${ok?'':`<small>${tr('Kilitli','Locked')}</small>`}
        </button>`;
      }).join('');
      const achHtml=ACHIEVEMENTS.map(a=>{
        const ok=unlocked.has(a.id),eq=acc.title===a.id;
        return `<div class="ach-row${ok?' ok':''}">
          <span class="ach-ic">${a.ic}</span>
          <div class="ach-txt">
            <b>${isEn()?a.enN:a.trN}</b>
            <small>${isEn()?a.enD:a.trD} · <em>${isEn()?a.enT:a.trT}</em></small>
          </div>
          ${ok?`<button type="button" class="btn sm ach-eq${eq?' alt':''}" data-title="${eq?'':a.id}">${eq?tr('Takılı','Equipped'):tr('Unvanı Tak','Equip')}</button>`:`<span class="ach-lk">${tr('Kilitli','Locked')}</span>`}
        </div>`;
      }).join('');
      tabBody=`<div class="pr-scroll-box pr-cos-scroll">
        <div class="pr-sec-lbl">${tr('Ölüm Zarı (D20) Stili','Death Dice (D20) Style')}</div>
        <div class="cos-grid">${dsHtml}</div>
        <div class="pr-sec-lbl" style="margin-top:8px">${tr('Ölüm Zarı İniş Efekti','D20 Landing Effect')}</div>
        <div class="cos-grid">${fxHtml}</div>
        <div class="pr-sec-lbl" style="margin-top:8px">${tr('Masa Teması','Board Theme')}</div>
        <div class="cos-grid">${btHtml}</div>
        <div class="pr-sec-lbl" style="margin-top:8px">${tr('Kart Arkası','Card Back')}</div>
        <div class="cos-grid">${cbHtml}</div>
        <div class="pr-sec-lbl" style="margin-top:8px">${tr('Profil Çerçevesi','Profile Frame')}</div>
        <div class="cos-grid">${frHtml}</div>
        <div class="pr-sec-lbl" style="margin-top:8px">${tr('Başarımlar & Unvanlar','Achievements & Titles')} (${unlocked.size}/${ACHIEVEMENTS.length})</div>
        <div class="ach-list">${achHtml}</div>
      </div>`;
    }

    const isGProf=isGuestUser(acc);
    mb.innerHTML=`<div class="pr-wrap">
      <div class="pr-head">
        <div class="pr-badge ${isGProf?'rk-unr':fl.cls} ${frCls}">${isGProf?'—':leagueCrestSvg(fl.id,46)}</div>
        <div class="pr-titles">
          <h3>${nm}${eqTitle?` <span class="pr-eq-title">«${escHtml(eqTitle)}»</span>`:''}</h3>
          <div class="pr-rank">${escHtml(fl.name)}${fl.unranked?` · <b>${fl.placementGames}/5 ${tr('Yerleştirme','Placements')}</b>`:(fl.provisional?` <em>(${tr('Geçici','Prov.')} ${fl.placementGames}/5)</em>`:'')} · <span class="pr-st-tag">${stCur} ${tr('Gün Seri','Day Streak')}</span>${(acc.puzzleStreak||0)>0?` · <span class="pr-st-tag">${tr('Bulmaca','Puzzle')}: ${acc.puzzleStreak}</span>`:''}</div>
        </div>
      </div>
      <div class="pr-tabs">
        <button type="button" class="pr-tab${curTab==='overview'?' act':''}" data-pt="overview">${tr('Genel','Overview')}</button>
        <button type="button" class="pr-tab${curTab==='quests'?' act':''}" data-pt="quests">${tr('Görevler','Quests')} ${qDoneCnt}/3</button>
        <button type="button" class="pr-tab${curTab==='heroes'?' act':''}" data-pt="heroes">${tr('Kahramanlar','Heroes')}</button>
        <button type="button" class="pr-tab${curTab==='style'?' act':''}" data-pt="style">${tr('Envanter','Inventory')}</button>
      </div>
      ${tabBody}
      <div class="row pr-acts">
        <button type="button" id="pr-lb" class="btn alt sm">${tr('Sıralama','Ranks')}</button>
        ${acc.isGuest
          ?`<button type="button" id="pr-upg" class="btn alt sm">${tr('Üye Ol','Register')}</button>
            <button type="button" id="pr-sw" class="btn sm">${tr('Giriş Yap','Sign In')}</button>`
          :`<button type="button" id="pr-out" class="btn sm">${tr('Çıkış Yap','Sign Out')}</button>`}
        <button type="button" id="pr-close" class="btn alt sm">${tr('Kapat','Close')}</button>
      </div>
    </div>`;
    mb.querySelectorAll('.pr-tabs .pr-tab').forEach(b=>b.onclick=()=>{snd('click');if(b.dataset.pt==='style'){mb.classList.remove('pr-mode');openInventoryModal();return;}curTab=b.dataset.pt;renderProf(USER_ACC)});
    mb.querySelectorAll('.cos-chip[data-ds]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.diceSkin=b.dataset.ds;saveSession(USER_ACC);renderProf(USER_ACC)});
    mb.querySelectorAll('.cos-chip[data-fx]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.d20Effect=b.dataset.fx;saveSession(USER_ACC);renderProf(USER_ACC)});
    mb.querySelectorAll('.cos-chip[data-bt]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.boardTheme=b.dataset.bt;saveSession(USER_ACC);renderProf(USER_ACC)});
    mb.querySelectorAll('.cos-chip[data-cb]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.cardBack=b.dataset.cb;saveSession(USER_ACC);renderProf(USER_ACC)});
    mb.querySelectorAll('.cos-chip[data-fr]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.frame=b.dataset.fr;saveSession(USER_ACC);renderProf(USER_ACC)});
    mb.querySelectorAll('.ach-eq').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.title=b.dataset.title||'';saveSession(USER_ACC);renderProf(USER_ACC)});
    if($('#pr-close'))$('#pr-close').onclick=()=>{snd('click');close()};
    if($('#pr-lb'))$('#pr-lb').onclick=()=>{snd('click');openLeaderboardModal()};
    if($('#pr-upg'))$('#pr-upg').onclick=()=>{snd('click');mb.classList.remove('pr-mode');openAuthModal('register',true)};
    if($('#pr-sw'))$('#pr-sw').onclick=()=>{snd('click');mb.classList.remove('pr-mode');openAuthModal('login',false)};
    if($('#pr-out'))$('#pr-out').onclick=()=>{snd('click');mb.classList.remove('pr-mode');saveSession(null);openAuthModal('login',false)};
  };
  renderProf(USER_ACC);
  $('#m').hidden=false;
  if(!USER_ACC.isGuest&&USER_ACC.key&&fbDb){
    const prevLen=(USER_ACC.history||[]).length,prevElo=USER_ACC.elo,prevTot=(USER_ACC.matches||0)+(USER_ACC.unrankedMatches||0);
    pullAccountFromCloud(USER_ACC.key).then(fresh=>{
      if(fresh&&mb.classList.contains('pr-mode')&&!$('#m').hidden){
        const newTot=(fresh.matches||0)+(fresh.unrankedMatches||0);
        if((fresh.history||[]).length!==prevLen||fresh.elo!==prevElo||newTot!==prevTot){
          renderProf(fresh);
        }
      }
    }).catch(()=>{});
  }
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
      if(isReg&&(key==='misafir'||key==='guest')){errEl.textContent=tr('Bu kullanıcı adı kullanılamaz.','This username is reserved.');return}
      if(rawP.length<4){errEl.textContent=tr('Şifre en az 4 karakter olmalı.','Password must be at least 4 characters.');return}
      const pHash=hashPass(rawP);
      errEl.textContent='';
      if(btn){btn.disabled=true;btn.textContent=tr('Kontrol ediliyor…','Checking…')}
      try{
        let cloudDoc=null;
        let cloudErr=false;
        if(fbDb){
          try{
            const snap=await fbDb.collection('users').doc(key).get();
            if(snap.exists)cloudDoc=snap.data();
          }catch(fe){cloudErr=true}
        }
        const localMap=loadLocalUsers();
        const localMatch=localMap[key]||Object.values(localMap).find(u=>u&&normUserKey(u.username)===key)||null;
        const existing=mergeAccountData(localMatch,cloudDoc||null);
        if(isReg){
          if(existing){
            snd('err');
            errEl.textContent=tr('Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı seç.','This username is already taken. Please choose a different username.');
            if(btn){btn.disabled=false;btn.textContent=tr('Hesap Oluştur','Create Account')}
            const ui=$('#auth-u');if(ui){ui.focus();ui.select()}
            return;
          }
          if(fbDb&&cloudErr){
            snd('err');
            errEl.textContent=tr('Sunucuya bağlanılamadı, kullanıcı adı kontrol edilemedi. Tekrar dene.','Could not verify username with server. Please try again.');
            if(btn){btn.disabled=false;btn.textContent=tr('Hesap Oluştur','Create Account')}
            return;
          }
          const base=(isUpgrade&&USER_ACC&&USER_ACC.isGuest)?USER_ACC:null;
          const today=dayKey(0);
          const nowTs=Date.now();
          const newAcc={
            uid:'u_'+key+'_'+nowTs.toString(36),
            key,
            username:rawU,
            passHash:pHash,
            isGuest:false,
            elo:base?Math.round(base.elo||1200):1200,
            peakElo:base?Math.round(base.peakElo||base.elo||1200):1200,
            wins:base?(base.wins||0):0,
            losses:base?(base.losses||0):0,
            matches:base?(base.matches||0):0,
            unrankedWins:base?(base.unrankedWins||0):0,
            unrankedLosses:base?(base.unrankedLosses||0):0,
            unrankedMatches:base?(base.unrankedMatches||0):0,
            streak:base?Math.max(1,base.streak||1):1,
            bestStreak:base?Math.max(1,base.bestStreak||base.streak||1):1,
            lastStreakDay:(base&&base.lastStreakDay)||today,
            history:base?mergeMatchHistory(base.history,[]):[],
            createdAt:nowTs,
            updatedAt:nowTs
          };
          if(fbDb){
            try{
              const ref=fbDb.collection('users').doc(key);
              await fbDb.runTransaction(async tx=>{
                const doc=await tx.get(ref);
                if(doc.exists)throw new Error('USERNAME_TAKEN');
                tx.set(ref,{
                  key:newAcc.key,
                  username:newAcc.username,
                  passHash:newAcc.passHash,
                  elo:newAcc.elo,
                  peakElo:newAcc.peakElo,
                  wins:newAcc.wins,
                  losses:newAcc.losses,
                  matches:newAcc.matches,
                  unrankedWins:newAcc.unrankedWins,
                  unrankedLosses:newAcc.unrankedLosses,
                  unrankedMatches:newAcc.unrankedMatches,
                  streak:newAcc.streak,
                  bestStreak:newAcc.bestStreak,
                  lastStreakDay:newAcc.lastStreakDay,
                  history:newAcc.history.slice(0,AUTH_HIST_MAX),
                  createdAt:newAcc.createdAt,
                  updatedAt:newAcc.updatedAt
                });
              });
            }catch(txErr){
              snd('err');
              if(txErr&&txErr.message==='USERNAME_TAKEN'){
                errEl.textContent=tr('Bu kullanıcı adı daha önce alınmış. Lütfen farklı bir kullanıcı adı seç.','This username is already taken. Please choose a different username.');
                const ui=$('#auth-u');if(ui){ui.focus();ui.select()}
              }else{
                errEl.textContent=tr('Kayıt sırasında bağlantı hatası oluştu, tekrar dene.','Connection error during registration, please try again.');
              }
              if(btn){btn.disabled=false;btn.textContent=tr('Hesap Oluştur','Create Account')}
              return;
            }
          }
          saveSession(newAcc,!fbDb);
          if(!base)showStreakToast(1,false);
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
            elo:typeof existing.elo==='number'?Math.round(existing.elo):1200,
            peakElo:typeof existing.peakElo==='number'?Math.round(existing.peakElo):(existing.elo||1200),
            wins:existing.wins||0,
            losses:existing.losses||0,
            matches:existing.matches||0,
            unrankedWins:existing.unrankedWins||0,
            unrankedLosses:existing.unrankedLosses||0,
            unrankedMatches:existing.unrankedMatches||0,
            streak:existing.streak||0,
            bestStreak:existing.bestStreak||existing.streak||0,
            lastStreakDay:existing.lastStreakDay||'',
            history:mergeMatchHistory(existing.history,[]),
            createdAt:existing.createdAt||Date.now(),
            updatedAt:Date.now()
          };
          saveSession(logged);
          updateDailyStreak(logged,false);
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
  const sp=document.getElementById('splash');
  if(USER_ACC){
    if(!USER_ACC.isGuest&&USER_ACC.key){
      const localMap=loadLocalUsers();
      if(localMap[USER_ACC.key]){
        USER_ACC=mergeAccountData(USER_ACC,localMap[USER_ACC.key]);
        try{localStorage.setItem(AUTH_SESS_KEY,JSON.stringify(USER_ACC))}catch(e){}
      }
    }
    const hadNewDay=updateDailyStreak(USER_ACC,true);
    if(hadNewDay){
      const stVal=USER_ACC.streak||1;
      setTimeout(()=>showStreakToast(stVal,stVal>1),sp?1380:350);
    }
    if(!USER_ACC.isGuest&&USER_ACC.key&&fbDb){
      pullAccountFromCloud(USER_ACC.key).then(()=>{if(isRegisteredMember(USER_ACC))claimActiveSession(USER_ACC);});
    }
  }
  renderAuthBar();
  if(USER_ACC)applyCosmetics(USER_ACC);
  if(fbDb)startLobbyPresence();
  if(USER_ACC&&typeof checkAbandonedOrResumeMatch==='function'){
    setTimeout(()=>checkAbandonedOrResumeMatch(),sp?1350:250);
  }
  if(sp)setTimeout(()=>{if(sp.isConnected)sp.remove()},1350);
  // Kahraman portrelerini açılıştan sonra arka planda çöz ki Kahraman Seç modalı 0ms takılmayla açılsın
  setTimeout(()=>{
    try{
      HEROES.filter(h=>!h.bossOnly).forEach((h,i)=>{
        setTimeout(()=>{
          const im=new Image();im.decoding='async';im.src=avSrc(h.id);
          if(im.decode)im.decode().catch(()=>{});
          const hi=new Image();hi.decoding='async';hi.src=`hp_icons/${h.id}.jpg?v=20261127_hp_e4`;
          if(hi.decode)hi.decode().catch(()=>{});
        },i*90);
      });
    }catch(e){}
  },2400);
  // 1) ?join=XXXX tek tıkla davet linki ile gelindiyse doğrudan odaya bağlan
  let inviteJoinCode='';
  try{
    const qp=new URLSearchParams(location.search);
    const jc=(qp.get('join')||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
    if(jc.length===4){
      inviteJoinCode=jc;
      history.replaceState(null,'',location.pathname);
    }
  }catch(e){}
  if(inviteJoinCode){
    if(!USER_ACC)createGuestAccount();
    setTimeout(()=>{joinRoom(inviteJoinCode,true);},sp?1950:350);
  }else if(!USER_ACC){
    // 2) İlk 60 saniye kancası: kayıt engeline takılmadan misafir oluştur + Eğitim öncelikli hoş geldin ekranı aç
    createGuestAccount();
    setTimeout(()=>{
      const menu=$('#menu');
      if(menu&&!menu.hidden&&!lock&&!localStorage.getItem('nd_onboarded_v1')){
        if(typeof openFirstVisitWelcome==='function')openFirstVisitWelcome();
      }
    },sp?2150:220);
  }
})();


/* ---------- ÖZEL MOD 1: HAFTALIK LANETLİ MASA ---------- */
const WEEKLY_CURSES=[
  {id:'rand_tg',ic:'◈',trN:'Değişken Mühür',enN:'Shifting Seal',trD:'Her tur hedef sayı rastgele 17, 21 veya 24 olarak mühürlenir.',enD:'Each round, the target number shifts randomly to 17, 21, or 24.'},
  {id:'two_closed',ic:'☾',trN:'Çifte Sır',enN:'Double Secret',trD:'Her iki oyuncu da her tura 2 kapalı sayı kartıyla başlar.',enD:'Both players start every round with 2 hidden number cards.'},
  {id:'three_jokers',ic:'✦',trN:'Kaos Eli',enN:'Hand of Chaos',trD:'Her düelloya 5 Jokerle başlanır ve her turda en fazla 3 Joker oynanabilir.',enD:'Start each duel with 5 Jokers and play up to 3 Jokers per round.'},
  {id:'blood_dice',ic:'†',trN:'Kanlı Kader',enN:'Bloody Fate',trD:'Ölüm Zarı eşiği her aşamada +2 daha zordur; her tur başında iki taraf da 1 ekstra Joker çeker.',enD:'Death Dice target is +2 harder; both players draw 1 extra Joker at the start of each round.'}
];
function getCurrentWeeklyCurse(){
  const now=new Date();
  const weekNum=Math.floor((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(2026,0,5))/(7*86400000));
  const idx=((weekNum%WEEKLY_CURSES.length)+WEEKLY_CURSES.length)%WEEKLY_CURSES.length;
  return {...WEEKLY_CURSES[idx],weekNum:weekNum+1};
}
function openWeeklyCursedModal(){
  const c=getCurrentWeeklyCurse();
  const mb=$('#mb');
  if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="sp-wrap">
    <div class="sp-badge cursed">${tr('Haftalık Lanetli Masa','Weekly Cursed Table')} · ${tr('Hafta','Week')} #${c.weekNum}</div>
    <h3 class="sp-title">${c.ic} ${escHtml(isEn()?c.enN:c.trN)}</h3>
    <p class="sp-desc">${escHtml(isEn()?c.enD:c.trD)}</p>
    <div class="sp-meta">${tr('Derecesiz özel kural · Zor yapay zekaya karşı · Görevler işler','Unranked special rule · Against Hard AI · Counts toward quests')}</div>
    <div class="row sp-acts">
      <button type="button" id="sp-cursed-go" class="btn alt">${tr('Lanetli Masaya Otur','Enter Cursed Table')}</button>
      <button type="button" id="sp-cursed-x" class="btn sm">${tr('Kapat','Close')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false};
  $('#sp-cursed-x').onclick=()=>{snd('click');close()};
  $('#sp-cursed-go').onclick=()=>{
    snd('ok');
    close();
    VAULT_RUN=null;PUZZLE_ACTIVE=null;
    CURSED_RULE=c;
    DIFF='hard';MODE='bot';
    chooseHero(h=>{MY_HERO=h;enter(start)},()=>{CURSED_RULE=null;});
  };
}


/* ---------- ÖZEL MOD 2: GÜNÜN BULMACASI (DAILY LETHAL PUZZLE) ---------- */
const DAILY_PUZZLES=[
  {id:'p1',trN:'Çift Mühür Kırıcı',enN:'Twin Seal Breaker',trH:'ZOR · Tek Joker yetmez! Rakip 20, sen 19 puandasın. Doğru 2 Joker kombosunu bulup Turu Bitir.',enH:'HARD · One Joker isn\'t enough! You have 19 vs 20. Find the exact 2-Joker combo and End Round.',myOpen:[10],myClosed:[9],oppOpen:[11],oppClosed:[9],hand:[10,4,3],eff:[],myH:'c',oppH:'m'},
  {id:'p2',trN:'Teklerin Çifte Tuzağı',enN:'Double Odd Trap',trH:'ZOR · Rakip 18, sen 9 puandasın. Tek hamle yetmez — iki Jokeri sinerjiyle birleştir.',enH:'HARD · You have 9 vs 18. A single move loses — combine 2 Jokers synergistically.',myOpen:[5],myClosed:[4],oppOpen:[8],oppClosed:[10],hand:[1,3,2],eff:[],myH:'s',oppH:'e'},
  {id:'p3',trN:'Kapalı Aynanın Sırrı',enN:'Mirror of the Hidden',trH:'ZOR · Rakip tam 21! Onu patlatırken kendini patlamaktan kurtaran 2 hamlelik komboyu kur.',enH:'HARD · Opponent sits at exact 21! Bust them while saving yourself with a 2-card combo.',myOpen:[4],myClosed:[9],oppOpen:[10],oppClosed:[11],hand:[21,4,3],eff:[],myH:'a',oppH:'v'},
  {id:'p4',trN:'Mühür İptali',enN:'Seal Nullifier',trH:'ZOR · Rakip masadaki +5 Jokeriyle tam 21 puanda! Önce etkisini boz, sonra üstünlüğü al.',enH:'HARD · Opponent hits 21 via their +5 Joker on table! Neutralize it first, then overtake.',myOpen:[6],myClosed:[7],oppOpen:[9],oppClosed:[7],hand:[12,3,4],eff:[{id:3,o:1,uid:901,neg:false}],myH:'w',oppH:'n'},
  {id:'p5',trN:'Kapalılar Gölgesi',enN:'Shadow of the Hidden',trH:'ZOR · 17 vs 20 geridesin ve +5 seni patlatır. Doğru 2 Joker sırasıyla 20\'yi devir.',enH:'HARD · Trailing 17 vs 20 and +5 busts you. Use the exact 2-Joker combo to win.',myOpen:[7],myClosed:[10],oppOpen:[11],oppClosed:[9],hand:[20,3,4],eff:[],myH:'p',oppH:'m'},
  {id:'p6',trN:'Kanlı Takas',enN:'Bloody Swap',trH:'ZOR · Sadece takas beraberlik getirir! 20 puandaki rakibi yenmek için 2 Jokerini birlikte kullan.',enH:'HARD · Swapping alone only ties! Combine 2 Jokers to defeat the 20-point opponent.',myOpen:[2],myClosed:[4],oppOpen:[9],oppClosed:[11],hand:[15,3,4],eff:[],myH:'l',oppH:'a'},
  {id:'p7',trN:'Gölge Hırsızı',enN:'Shadow Thief',trH:'ZOR · Rakibin masadaki +5 Jokerini Hırsız ile çalıp ardından kendi elinden oynayarak kazan!',enH:'HARD · Steal the opponent\'s +5 Joker from the table with Thief, then play it yourself to win!',myOpen:[6],myClosed:[9],oppOpen:[8],oppClosed:[7],hand:[25,4],eff:[{id:3,o:1,uid:906,neg:false}],myH:'s',oppH:'v'}
];
function getTodayPuzzle(){
  const d=dayKey(0);
  let h=0;for(let i=0;i<d.length;i++)h=(h*31+d.charCodeAt(i))>>>0;
  return {...DAILY_PUZZLES[h%DAILY_PUZZLES.length],day:d};
}
function openDailyPuzzleModal(){
  const pz=getTodayPuzzle();
  const solved=!!(USER_ACC&&USER_ACC.lastPuzzleDay===pz.day);
  const stVal=(USER_ACC&&USER_ACC.puzzleStreak)||0;
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="sp-wrap">
    <div class="sp-badge puzzle">${tr('Günün Bulmacası','Daily Lethal Puzzle')} · ${pz.day}</div>
    <h3 class="sp-title">✦ ${escHtml(isEn()?pz.enN:pz.trN)}</h3>
    <p class="sp-desc">${escHtml(isEn()?pz.enH:pz.trH)}</p>
    <div class="sp-meta">${tr('Bulmaca Serin','Puzzle Streak')}: <b>${stVal} ${tr('Gün','Days')}</b>${solved?` · <span style="color:#86efac">${tr('Bugün Çözüldü ✔','Solved Today ✔')}</span>`:''}</div>
    <div class="row sp-acts">
      <button type="button" id="sp-pz-go" class="btn alt">${solved?tr('Tekrar Oyna','Replay'):tr('Bulmacayı Başlat','Start Puzzle')}</button>
      <button type="button" id="sp-pz-x" class="btn sm">${tr('Kapat','Close')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false};
  $('#sp-pz-x').onclick=()=>{snd('click');close()};
  $('#sp-pz-go').onclick=()=>{
    snd('ok');close();
    CURSED_RULE=null;VAULT_RUN=null;
    PUZZLE_ACTIVE=pz;
    enter(()=>startDailyPuzzle(pz));
  };
}
function startDailyPuzzle(pz){
  hiPreload();setMusic('game');
  try{document.body.classList.remove('dead')}catch(e){}
  glogOpen=false;glogLastSig='';LAST_MATCH_HIST=[];
  MODE='bot';DIFF='med';MY_HERO=pz.myH||'p';OPP_HERO=pz.oppH||'n';
  let uid=100;
  G={
    u:200,bo:0,rounds:0,pts:[0,0],res:[],over:false,wait:false,rev:false,winSide:null,
    av:[MY_HERO,OPP_HERO],hero:[MY_HERO,OPP_HERO],uRevived:[false,false],vampUsed:[false,false],
    cWins:[0,0],vampBurn:null,thiefSteal:null,mast:[0,0],
    deck:[{id:++uid,n:1},{id:++uid,n:4}],
    jdeck:[],dj:[],used:[],
    hand:[pz.hand.slice(),[]],
    pl:[
      {open:pz.myOpen.map(n=>({id:++uid,n})),closed:pz.myClosed.map(n=>({id:++uid,n}))},
      {open:pz.oppOpen.map(n=>({id:++uid,n})),closed:pz.oppClosed.map(n=>({id:++uid,n}))}
    ],
    eff:(pz.eff||[]).map(e=>({...e})),pj:(pz.eff||[]).map(e=>({id:e.id,o:e.o,uid:e.uid})),jUsed:[0,0],jTurn:[0,0],noJ:[false,false],
    acted:false,turns:1,turn:0,baseTg:21,maxJokers:2,
    hpUsed:[true,true],hpMod:[0,0],plagueMod:[0,0],hpTgMod:0,
    oppPeek:[],oppPeek1:[],clocks:[99,99],clockMax:99,graceLeft:99,timeOut:[false,false],hadTimeout:false,
    log:[{p:-1,t:`— ${isEn()?pz.enN:pz.trN} —`},{p:0,t:isEn()?pz.enH:pz.trH}]
  };
  G.pl[0].closed.forEach(c=>peek.add(c.id));
  prevAv[0]=prevAv[1]=undefined;prevHpAnim=[false,false];lastThiefSeq=0;
  sayT='';botGen++;thinkOn=false;
  R();
}
function finishDailyPuzzle(won,myTot,oppTot,T){
  const pz=PUZZLE_ACTIVE||getTodayPuzzle();
  if(won&&USER_ACC){
    const today=pz.day||dayKey(0);
    if(USER_ACC.lastPuzzleDay!==today){
      const yest=dayKey(-1);
      USER_ACC.puzzleStreak=(USER_ACC.lastPuzzleDay===yest?((USER_ACC.puzzleStreak||0)+1):1);
      USER_ACC.lastPuzzleDay=today;
      saveSession(USER_ACC);
    }
  }
  const stVal=(USER_ACC&&USER_ACC.puzzleStreak)||0;
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="sp-wrap">
    <div class="sp-badge puzzle">${tr('Günün Bulmacası','Daily Lethal Puzzle')}</div>
    <h3 class="sp-title">${won?tr('Bulmaca Çözüldü!','Puzzle Solved!'):tr('Hamle Yetersiz Kaldı','Not Quite Lethal')}</h3>
    <p class="sp-desc">${tr(`Skorun: ${myTot} · Rakip: ${oppTot} (Hedef: ${T})`,`Your total: ${myTot} · Opponent: ${oppTot} (Target: ${T})`)}</p>
    <div class="sp-meta">${tr('Bulmaca Serin','Puzzle Streak')}: <b>${stVal} ${tr('Gün','Days')}</b></div>
    <div class="row sp-acts">
      ${won?'':`<button type="button" id="sp-pz-retry" class="btn alt">${tr('Tekrar Dene','Try Again')}</button>`}
      <button type="button" id="sp-pz-home" class="btn${won?' alt':''}">${tr('Ana Menü','Main Menu')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  if($('#sp-pz-retry'))$('#sp-pz-retry').onclick=()=>{snd('click');mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false;startDailyPuzzle(pz)};
  if($('#sp-pz-home'))$('#sp-pz-home').onclick=()=>{snd('click');mb.classList.remove('auth-mode');exitGame()};
}


/* ---------- ÖZEL MOD 3: ÖLÜM MAHZENİ (ROGUELIKE PvE) ---------- */
const VAULT_STAGES=[
  {diff:'easy',trN:'1. Oda · Mahzen Bekçisi',enN:'Chamber 1 · Vault Guard'},
  {diff:'med',trN:'2. Oda · Kanlı Tüccar',enN:'Chamber 2 · Blood Broker'},
  {diff:'hard',trN:'3. Oda · Gölgeler Salonu',enN:'Chamber 3 · Hall of Shadows'},
  {diff:'hard',trN:'4. Oda · Lanetli Sunak',enN:'Chamber 4 · Cursed Altar'},
  {diff:'imp',boss:true,oppHero:'u',trN:'5. Oda · SON BOSS: Bilinmeyen',enN:'Chamber 5 · FINAL BOSS: The Unknown'}
];
const VAULT_RELICS=[
  {id:'extra_joker',ic:'◈',trN:'Karanlık Kese',enN:'Dark Satchel',trD:'Her düelloya +1 ekstra Joker ile başla.',enD:'Start every duel with +1 extra Joker.'},
  {id:'reroll_one',ic:'✦',trN:'Kırık Kader Zarı',enN:'Shattered Fate Die',trD:'Ölüm Zarında 1 atarsan bir kez otomatik yeniden at.',enD:'Automatically reroll once if you roll a 1 on Death Dice.'},
  {id:'high_closed_joker',ic:'☾',trN:'Yüksek Sır',enN:'High Secret',trD:'Kapalı kartın 10 veya 11 gelirse anında +1 Joker çek.',enD:'If your hidden card is 10 or 11, draw +1 Joker immediately.'},
  {id:'iron_fate',ic:'†',trN:'Demir Mühür',enN:'Iron Seal',trD:'Attığın her Ölüm Zarına kalıcı +2 bonus kazan.',enD:'Gain a permanent +2 bonus to all your Death Dice rolls.'},
  {id:'triple_play',ic:'★',trN:'Hızlı El',enN:'Swift Hand',trD:'Her turda en fazla 3 Joker oynayabilirsin.',enD:'You may play up to 3 Jokers per round.'},
  {id:'blood_peek',ic:'❖',trN:'Kuzgun Gözü',enN:'Raven Eye',trD:'Her turun başında rakibin kapalı kartı sana görünür olur.',enD:'Opponent\'s hidden card is revealed to you at the start of every round.'}
];
function vaultTrackHtml(curStage){
  return `<div class="vault-track">${VAULT_STAGES.map((st,i)=>`<div class="vt-node${i<curStage?' done':i===curStage?' cur':''}${st.boss?' boss':''}"><span class="vt-dot">${i<curStage?'✔':st.boss?'♛':(i+1)}</span><span>${st.boss?'Boss':(i+1)}</span></div>`).join('')}</div>`;
}
function vaultRelicBarHtml(relics){
  if(!relics||!relics.length)return '';
  return `<div class="vault-relic-bar">${relics.map(rid=>{const r=VAULT_RELICS.find(x=>x.id===rid);return r?`<span class="vr-chip" title="${escHtml(isEn()?r.enD:r.trD)}">${r.ic} ${escHtml(isEn()?r.enN:r.trN)}</span>`:''}).join('')}</div>`;
}
function openVaultModal(){
  const best=(USER_ACC&&USER_ACC.vaultBest)||0;
  const wins=(USER_ACC&&USER_ACC.vaultWins)||0;
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="sp-wrap">
    <div class="sp-badge vault">${tr('Tek Kişilik Roguelike','Solo Roguelike Mode')}</div>
    <h3 class="sp-title">♛ ${tr('Ölüm Mahzeni','Death Vault')}</h3>
    <p class="sp-desc">${tr('Kahramanını seç ve 5 aşamalı giderek zorlaşan Mahzen\'e in. Her zaferden sonra 3 Kalıcı Kalıntıdan 1 tanesini seçip güçlen ve sonunda Bilinmeyen\'i alt et.','Pick your hero and descend through 5 escalating chambers. Choose 1 of 3 permanent Relics after each victory and defeat The Unknown.')}</p>
    ${vaultTrackHtml(0)}
    <div class="sp-meta">${tr('En İyi Aşama','Best Chamber')}: <b>${best}/5</b> · ${tr('Mahzen Zaferi','Vault Clears')}: <b>${wins}</b></div>
    <div class="row sp-acts">
      <button type="button" id="sp-v-go" class="btn alt">${tr('Mahzene İn','Enter the Vault')}</button>
      <button type="button" id="sp-v-x" class="btn sm">${tr('Kapat','Close')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  const close=()=>{mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false};
  $('#sp-v-x').onclick=()=>{snd('click');close()};
  $('#sp-v-go').onclick=()=>{
    snd('ok');close();
    CURSED_RULE=null;PUZZLE_ACTIVE=null;
    chooseHero(h=>{
      MY_HERO=h;
      VAULT_RUN={stage:0,hero:h,relics:[],oppHero:''};
      startVaultStage(0,true);
    },()=>{VAULT_RUN=null;});
  };
}
function startVaultStage(stageIdx,withVeil=false){
  if(!VAULT_RUN)return;
  const stCfg=VAULT_STAGES[Math.min(stageIdx,VAULT_STAGES.length-1)];
  const pool=HEROES.filter(h=>!h.bossOnly&&h.id!==MY_HERO).map(h=>h.id);
  VAULT_RUN.stage=stageIdx;
  VAULT_RUN.oppHero=stCfg.oppHero||pool[Math.floor(Math.random()*pool.length)];
  DIFF=stCfg.diff;MODE='bot';MY_HERO=VAULT_RUN.hero;
  if(withVeil)enter(start);
  else start();
}
function openVaultRelicPick(){
  if(!VAULT_RUN)return exitGame();
  const nextStage=VAULT_RUN.stage+1;
  const avail=shuf(VAULT_RELICS.filter(r=>!VAULT_RUN.relics.includes(r.id))).slice(0,3);
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  const stCfg=VAULT_STAGES[Math.min(nextStage,VAULT_STAGES.length-1)];
  mb.innerHTML=`<div class="sp-wrap">
    <div class="sp-badge vault">${tr(`Oda ${VAULT_RUN.stage+1} Temizlendi!`,`Chamber ${VAULT_RUN.stage+1} Cleared!`)}</div>
    <h3 class="sp-title">${tr('Bir Kalıntı Seç','Choose a Relic')}</h3>
    ${vaultTrackHtml(nextStage)}
    ${vaultRelicBarHtml(VAULT_RUN.relics)}
    <div class="relic-grid">${avail.map(r=>`<button type="button" class="relic-card" data-rid="${r.id}"><span class="relic-ic">${r.ic}</span><b>${escHtml(isEn()?r.enN:r.trN)}</b><small>${escHtml(isEn()?r.enD:r.trD)}</small></button>`).join('')}</div>
    <div class="sp-meta">${tr('Sıradaki Rakip','Next Chamber')}: <b>${escHtml(isEn()?stCfg.enN:stCfg.trN)}</b></div>
  </div>`;
  $('#m').hidden=false;
  mb.querySelectorAll('.relic-card[data-rid]').forEach(b=>b.onclick=()=>{
    snd('ok');
    VAULT_RUN.relics.push(b.dataset.rid);
    mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false;
    startVaultStage(nextStage,false);
  });
}
function openVaultVictoryModal(){
  const relics=(VAULT_RUN&&VAULT_RUN.relics)||[];
  const wins=(USER_ACC&&USER_ACC.vaultWins)||1;
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="sp-wrap">
    <div class="sp-badge vault">♛ ${tr('Ölüm Mahzeni Fethedildi!','Death Vault Conquered!')}</div>
    <h3 class="sp-title">${tr('Bilinmeyen Yenildi!','The Unknown Defeated!')}</h3>
    <p class="sp-desc">${tr('5 odanın tamamını aşıp Ölüm Mahzeni\'nden zaferle çıktın.','You cleared all 5 chambers and emerged victorious from the Death Vault.')}</p>
    ${vaultTrackHtml(5)}
    ${vaultRelicBarHtml(relics)}
    <div class="sp-meta">${tr('Toplam Mahzen Zaferin','Total Vault Clears')}: <b>${wins}</b></div>
    <div class="row sp-acts">
      <button type="button" id="sp-vv-new" class="btn alt">${tr('Yeni Koşu','New Run')}</button>
      <button type="button" id="sp-vv-home" class="btn sm">${tr('Ana Menü','Main Menu')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  $('#sp-vv-new').onclick=()=>{snd('click');VAULT_RUN=null;openVaultModal()};
  $('#sp-vv-home').onclick=()=>{snd('click');mb.classList.remove('auth-mode');exitGame()};
}


/* ---------- PAYLAŞILABİLİR ÖLÜM KARTI (CANVAS PNG) ---------- */
function shareDeathCard(card,btn){
  if(!card)return;
  const cv=document.createElement('canvas');
  cv.width=1080;cv.height=600;
  const ctx=cv.getContext('2d');
  // Arka plan: koyu gotik parşömen/obsidyen degrade
  const bg=ctx.createLinearGradient(0,0,1080,600);
  bg.addColorStop(0,card.won?'#1d130b':'#1a0a0c');
  bg.addColorStop(0.55,'#0e090a');
  bg.addColorStop(1,card.won?'#26160a':'#24080c');
  ctx.fillStyle=bg;ctx.fillRect(0,0,1080,600);
  // Altın/kızıl çerçeve
  ctx.strokeStyle=card.won?'rgba(232,190,98,0.82)':'rgba(210,68,68,0.78)';
  ctx.lineWidth=6;ctx.strokeRect(24,24,1032,552);
  ctx.strokeStyle='rgba(255,255,255,0.12)';
  ctx.lineWidth=1.5;ctx.strokeRect(36,36,1008,528);

  const finishDraw=(img)=>{
    // Sol dairede kahraman portresi
    const cx=215,cy=300,rad=148;
    ctx.save();
    ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.closePath();ctx.clip();
    if(img){
      const s=Math.max((rad*2)/img.width,(rad*2)/img.height);
      const dw=img.width*s,dh=img.height*s;
      ctx.drawImage(img,cx-dw/2,cy-dh/2,dw,dh);
    }else{
      ctx.fillStyle='#241812';ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
    }
    ctx.restore();
    ctx.beginPath();ctx.arc(cx,cy,rad+3,0,Math.PI*2);
    ctx.strokeStyle=card.won?'#f5c451':'#ef4444';ctx.lineWidth=6;ctx.stroke();

    // Sağ taraf tipografi
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillStyle=card.won?'#fde68a':'#fca5a5';
    ctx.font='700 24px Georgia, serif';
    ctx.fillText('Necrodice · '+(card.won?tr('Zafer Mührü','Victory Seal'):tr('Ölüm Mührü','Death Seal')),410,126);

    ctx.fillStyle='#fff6e0';
    ctx.font='800 56px Georgia, serif';
    ctx.fillText(card.won?tr('Zafer!','Victory!'):tr('Mağlubiyet','Defeat'),410,198);

    const headline=tr(
      `${card.heroName} ile ${card.oppLabel} karşısında ${card.rw}-${card.rl}`,
      `${card.heroName} vs ${card.oppLabel} · ${card.rw}-${card.rl}`
    );
    ctx.fillStyle='#e8dbc2';
    ctx.font='600 28px Georgia, serif';
    ctx.fillText(headline.slice(0,46),410,256);

    const d20Line=tr(`Son Ölüm Zarı (D20): ${card.roll} / ${card.th}  ·  Süre: ${card.durTxt}`,`Final Death Dice (D20): ${card.roll} / ${card.th}  ·  Time: ${card.durTxt}`);
    ctx.fillStyle='#cbb999';
    ctx.font='600 24px Georgia, serif';
    ctx.fillText(d20Line,410,312);

    // Oyuncu + Lig bandı
    ctx.fillStyle='rgba(245,196,81,0.12)';
    ctx.fillRect(410,356,595,88);
    ctx.strokeStyle='rgba(245,196,81,0.45)';ctx.lineWidth=2;ctx.strokeRect(410,356,595,88);
    ctx.fillStyle='#f8e3ab';
    const bandTxt=`${card.playerName}  ·  ${card.leagueTxt||tr('Misafir','Guest')}`;
    let bf=28;
    ctx.font=`700 ${bf}px Alegreya, Georgia, serif`;
    while(bf>18&&ctx.measureText(bandTxt).width>548){bf-=2;ctx.font=`700 ${bf}px Alegreya, Georgia, serif`;}
    ctx.fillText(bandTxt,434,410);

    ctx.fillStyle='rgba(210,192,162,0.65)';
    ctx.font='600 20px Georgia, serif';
    ctx.fillText('limbii286-blip.github.io/necrodice',410,516);

    const shareTxt=tr(
      `${card.heroName} ile ${card.oppLabel} karşısında ${card.rw}-${card.rl} ${card.won?'kazandım':'oynadım'} · D20: ${card.roll}/${card.th} · ${card.elo} ELO`,
      `${card.heroName} vs ${card.oppLabel} (${card.rw}-${card.rl}) · D20: ${card.roll}/${card.th} · ${card.elo} ELO`
    );
    cv.toBlob(async blob=>{
      if(!blob)return;
      try{
        const file=new File([blob],'necrodice-olum-karti.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
          await navigator.share({title:'Necrodice',text:shareTxt,files:[file]});
          return;
        }
      }catch(e){}
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='necrodice-olum-karti.png';
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000);
      if(btn){const old=btn.textContent;btn.textContent=tr('Kart İndirildi ✔','Card Saved ✔');setTimeout(()=>{if(btn.isConnected)btn.textContent=old},2200);}
    },'image/png');
  };

  const im=new Image();
  im.crossOrigin='anonymous';
  im.onload=()=>finishDraw(im);
  im.onerror=()=>finishDraw(null);
  im.src=avSrc(card.heroId);
}

/* ---------- İZLEYİCİ ETKİLEŞİMİ (EMOJI TEPKİ + HERKESE AÇIK CANLI OYLAMA) ---------- */
function showSpecReactionToast(ic){
  const el=document.createElement('div');
  el.className='spec-float-react';
  el.textContent=String(ic||'👏').slice(0,4);
  el.style.right=(16+Math.random()*44)+'px';
  document.body.appendChild(el);
  setTimeout(()=>{if(el.isConnected)el.remove()},1950);
}
function renderSpecSocialBar(){
  let bar=document.getElementById('spec-social-bar');
  const menu=$('#menu');
  const inMatch=!!(G&&(!menu||menu.hidden));
  const isSpec=MODE==='spectator';
  const tot=(SPEC_VOTES[0]||0)+(SPEC_VOTES[1]||0);
  const liveSpecs=Math.max(spectators?spectators.length:0,specCount||0);
  const showForPlayer=!isSpec&&inMatch&&(tot>0||liveSpecs>0);
  const active=(isSpec&&inMatch)||showForPlayer;
  if(!active){if(bar)bar.remove();return;}
  if(!bar){
    bar=document.createElement('div');
    bar.id='spec-social-bar';
    bar.className='spec-social-bar';
    document.body.appendChild(bar);
  }
  bar.classList.toggle('player-view',!isSpec);
  const myNm=(USER_ACC&&!USER_ACC.isGuest&&USER_ACC.username)?USER_ACC.username:tr('Sen','You');
  const oppNm=(OPP_PROFILE&&OPP_PROFILE.name)?OPP_PROFILE.name:(NAMES[avKey(G,1)]||tr('Rakip','Opponent'));
  const p0=isSpec?((G.specMeta&&G.specMeta.p0Name)||NAMES[avKey(G,0)]||tr('Oyuncu','Player')):myNm;
  const p1=isSpec?((G.specMeta&&G.specMeta.p1Name)||NAMES[avKey(G,1)]||tr('Rakip','Opponent')):oppNm;
  const v0=MODE==='guest'?(SPEC_VOTES[1]||0):(SPEC_VOTES[0]||0);
  const v1=MODE==='guest'?(SPEC_VOTES[0]||0):(SPEC_VOTES[1]||0);
  const pct0=tot?Math.round((v0/tot)*100):50;
  const pct1=tot?100-pct0:50;
  if(!isSpec){
    const sList=(MODE==='host'||MODE==='bot')?spectators.map(s=>s._specName||tr('Misafir','Guest')):(Array.isArray(specNames)?specNames:[]);
    const uniqueNames=[...new Set(sList.filter(Boolean))];
    const fullTip=uniqueNames.length?`${tr('İzleyenler','Watchers')}: ${uniqueNames.join(', ')}`:tr('İzleyici Tahmin Oylaması','Spectator Prediction Poll');
    const shortWatcher=uniqueNames.length===1?escHtml(uniqueNames[0].slice(0,14)):(uniqueNames.length>1?`${escHtml(uniqueNames[0].slice(0,11))} +${uniqueNames.length-1}`:(liveSpecs>0?`${tr('İzleyen','Watching')} (${liveSpecs})`:`${tr('Oylama','Poll')} (${tot})`));
    bar.innerHTML=tot>0
      ?`<div class="ssb-poll-live" title="${escHtml(fullTip)}">
        <span class="ssb-pl-lbl">${shortWatcher}</span>
        <div class="ssb-pl-row"><span>${escHtml(p0.slice(0,8))} <b>%${pct0}</b></span><span><b>%${pct1}</b> ${escHtml(p1.slice(0,8))}</span></div>
        <div class="ssb-pl-bar"><i style="width:${pct0}%"></i></div>
      </div>`
      :`<div class="ssb-watch-only" title="${escHtml(fullTip)}"><i class="lob-live-dot"></i><span>${shortWatcher}</span></div>`;
    if(typeof syncGlogMobilePos==='function')syncGlogMobilePos();
    return;
  }
  bar.innerHTML=`
    <div class="ssb-reacts">
      <button type="button" class="ssb-btn ssb-em" data-ric="👏">👏</button>
      <button type="button" class="ssb-btn ssb-em" data-ric="🔥">🔥</button>
      <button type="button" class="ssb-btn ssb-em" data-ric="💀">💀</button>
      <button type="button" class="ssb-btn ssb-em" data-ric="😱">😱</button>
    </div>
    <div class="ssb-poll">
      <button type="button" class="ssb-vote${MY_SPEC_VOTE===0?' on':''}" data-v="0">${escHtml(p0.slice(0,10))} <b>%${pct0}</b></button>
      <button type="button" class="ssb-vote${MY_SPEC_VOTE===1?' on':''}" data-v="1">${escHtml(p1.slice(0,10))} <b>%${pct1}</b></button>
    </div>`;
  bar.querySelectorAll('.ssb-btn').forEach(b=>b.onclick=()=>{
    const ic=b.dataset.ric;
    showSpecReactionToast(ic);
    if(conn&&conn.open)try{conn.send({k:'spec_react',ic,label:''})}catch(e){}
  });
  bar.querySelectorAll('.ssb-vote').forEach(b=>b.onclick=()=>{
    const side=+b.dataset.v;
    MY_SPEC_VOTE=side;
    if(conn&&conn.open)try{conn.send({k:'spec_vote',side})}catch(e){}
    renderSpecSocialBar();
  });
  if(typeof syncGlogMobilePos==='function')syncGlogMobilePos();
}

/* ---------- KRAL MASASI (WINNER STAYS) ROTASYONU ---------- */
function rotateKingTableNext(){
  if(!KING_TABLE||!KING_QUEUE.length)return;
  const oldGuest=conn;
  const nextChallenger=KING_QUEUE.shift();
  spectators=spectators.filter(x=>x!==nextChallenger);
  if(oldGuest&&oldGuest.open){
    oldGuest._role='spectator';
    spectators.push(oldGuest);
    KING_QUEUE.push(oldGuest);
    try{oldGuest.send({k:'role',role:'spectator',kingQueuePos:KING_QUEUE.length})}catch(e){}
  }
  conn=nextChallenger;
  conn._role='player';
  OPP_PROFILE={name:nextChallenger._kingName||tr('Rakip','Opponent'),elo:nextChallenger._kingElo||1200,isGuest:false};
  conn.on('close',()=>startReconnectGrace(true,tr('Rakip oyundan ayrıldı.','Opponent left the game.')));
  try{conn.send({k:'role',role:'player'});conn.send({k:'start_draft'});}catch(e){}
  startOnlineHeroDraft(true);
}

/* ---------- İLK 60 SANİYE KANCASI (EĞİTİM ÖNCELİKLİ HOŞ GELDİN) ---------- */
function openFirstVisitWelcome(){
  const mb=$('#mb');if(!mb)return;
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode');
  mb.innerHTML=`<div class="sp-wrap">
    <div class="fv-welcome-title">${tr('Hoş geldin!','Welcome!')}</div>
    <h3 class="sp-title">${tr('Kaderin Kartlarda, Hayatın Zarda','Fate in Cards, Life on the Die')}</h3>
    <p class="sp-desc">${tr('21\'e en yakın toplamı kur, Jokerlerle masayı tersine çevir ve düelloyu kaybedersen Ölüm Zarından sağ çıkmaya çalış. İlk kez oynuyorsan 60 saniyelik hızlı eğitimle hemen öğren!','Get closest to 21, bend the rules with Jokers, and survive the Death Dice if you lose. New here? Learn everything in 60 seconds with the interactive tutorial!')}</p>
    <div class="row sp-acts" style="flex-direction:column;width:100%;max-width:300px;gap:8px">
      <button type="button" id="fv-tut" class="btn alt" style="width:100%">${tr('Hızlı Eğitimle Başla (60sn)','Start 60s Tutorial')}</button>
      <div class="row" style="width:100%;gap:8px">
        <button type="button" id="fv-reg" class="btn alt" style="flex:1">${tr('Üye Ol','Sign Up')}</button>
        <button type="button" id="fv-login" class="btn" style="flex:1">${tr('Giriş Yap','Sign In')}</button>
      </div>
      <button type="button" id="fv-guest" class="btn sm" style="width:100%;opacity:0.86">${tr('Misafir Olarak Devam Et','Continue as Guest')}</button>
    </div>
  </div>`;
  $('#m').hidden=false;
  const markDone=()=>{try{localStorage.setItem('nd_onboarded_v1','1')}catch(e){}};
  $('#fv-tut').onclick=()=>{snd('ok');markDone();mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false;MODE='tutorial';MY_HERO='p';OPP_HERO='n';enter(startTutorial);};
  $('#fv-reg').onclick=()=>{snd('click');markDone();mb.classList.remove('auth-mode');openAuthModal('register',true);};
  $('#fv-login').onclick=()=>{snd('click');markDone();mb.classList.remove('auth-mode');openAuthModal('login',false);};
  $('#fv-guest').onclick=()=>{snd('click');markDone();mb.classList.remove('auth-mode');$('#m').hidden=true;lock=false;};
}


/* ---------- GELİŞMİŞ GÖRSEL ENVANTER (CANLI 3D D20 + GERÇEK OYUN VARLIKLARI) ---------- */
function openInventoryModal(initialCat='dice'){
  if(!USER_ACC)createGuestAccount();
  const mb=$('#mb');if(!mb)return;
  let cat=initialCat||'dice';
  lock=true;
  mb.classList.remove('end-mode','an-mode','set-mode','lb-mode','lob-mode','pr-mode');
  mb.classList.add('auth-mode','inv-mode');

  const renderInv=(acc)=>{
    if(!acc)return;
    const unlockedAch=new Set(acc.achievements||[]);
    const heroImg=avSrc(MY_HERO||'c');
    let bodyHtml='';

    if(cat==='dice'){
      const diceCards=DICE_SKINS.map(ds=>{
        const ok=ds.req(acc),sel=(acc.diceSkin||'ruby')===ds.id;
        return `<button type="button" class="inv-card${sel?' sel':''}${ok?'':' lock'}" data-ds="${ds.id}" ${ok?'':'disabled'}>
          <div class="inv-stage inv-stage-d20">
            <canvas class="inv-d20-cv" data-skin="${ds.id}" width="160" height="160"></canvas>
          </div>
          <div class="inv-info">
            <b>${escHtml(isEn()?ds.enN:ds.trN)}</b>
            <small>${sel?tr('Aktif','Equipped'):(ok?tr('Kullanmak için tıkla','Click to equip'):escHtml(isEn()?ds.enR:ds.trR))}</small>
          </div>
          ${sel?`<span class="inv-tag on">${tr('Seçili','Active')}</span>`:(!ok?`<span class="inv-tag lk">${tr('Kilitli','Locked')}</span>`:'')}
        </button>`;
      }).join('');
      const fxCards=D20_EFFECTS.map(fx=>{
        const ok=fx.req(acc),sel=(acc.d20Effect||'classic')===fx.id;
        return `<button type="button" class="inv-card inv-card-sm${sel?' sel':''}${ok?'':' lock'}" data-fx="${fx.id}" ${ok?'':'disabled'}>
          <div class="inv-stage inv-stage-fx">
            <div class="inv-fx-demo fx-${fx.id}"><span>20</span></div>
          </div>
          <div class="inv-info">
            <b>${escHtml(isEn()?fx.enN:fx.trN)}</b>
            <small>${sel?tr('Aktif','Equipped'):(ok?tr('Kullan','Equip'):escHtml(isEn()?fx.enR:fx.trR))}</small>
          </div>
          ${sel?`<span class="inv-tag on">${tr('Seçili','Active')}</span>`:(!ok?`<span class="inv-tag lk">${tr('Kilitli','Locked')}</span>`:'')}
        </button>`;
      }).join('');
      bodyHtml=`<div class="inv-sec-lbl">${tr('3D Ölüm Zarı (D20) Stilleri','3D Death Dice (D20) Styles')}</div>
        <div class="inv-grid inv-grid-3">${diceCards}</div>
        <div class="inv-sec-lbl" style="margin-top:14px">${tr('Zar İniş Efektleri','Dice Landing Effects')}</div>
        <div class="inv-grid inv-grid-4">${fxCards}</div>`;
    }else if(cat==='cards'){
      const cbCards=CARD_BACKS.map(cb=>{
        const ok=cb.req(acc),sel=(acc.cardBack||'classic')===cb.id;
        const cbImg=(typeof CARDBACK_IMG_MAP!=='undefined'&&CARDBACK_IMG_MAP[cb.id])||'img/cb_classic.jpg?v=20261127_cb_rp1';
        return `<button type="button" class="inv-card${sel?' sel':''}${ok?'':' lock'}" data-cb="${cb.id}" ${ok?'':'disabled'}>
          <div class="inv-stage inv-stage-cb">
            <div class="inv-cb-preview cb-prev-${cb.id}"><img src="${cbImg}" alt="" decoding="async"></div>
          </div>
          <div class="inv-info">
            <b>${escHtml(isEn()?cb.enN:cb.trN)}</b>
            <small>${sel?tr('Aktif','Equipped'):(ok?tr('Kullanmak için tıkla','Click to equip'):escHtml(isEn()?cb.enR:cb.trR))}</small>
          </div>
          ${sel?`<span class="inv-tag on">${tr('Seçili','Active')}</span>`:(!ok?`<span class="inv-tag lk">${tr('Kilitli','Locked')}</span>`:'')}
        </button>`;
      }).join('');
      bodyHtml=`<div class="inv-sec-lbl">${tr('Oyun İçi Deste ve Kapalı Kart Arkaları','In-Game Deck & Hidden Card Backs')}</div>
        <div class="inv-grid inv-grid-3">${cbCards}</div>`;
    }else if(cat==='board'){
      const btCards=BOARD_THEMES.map(bt=>{
        const ok=bt.req(acc),sel=(acc.boardTheme||'classic')===bt.id;
        const bImg=(typeof BOARD_IMG_MAP!=='undefined'&&BOARD_IMG_MAP[bt.id])||'board_gothic.jpg';
        return `<button type="button" class="inv-card inv-card-wide${sel?' sel':''}${ok?'':' lock'}" data-bt="${bt.id}" ${ok?'':'disabled'}>
          <div class="inv-stage inv-stage-board bt-prev-${bt.id}">
            <img src="${bImg}" alt="" decoding="async">
          </div>
          <div class="inv-info">
            <b>${escHtml(isEn()?bt.enN:bt.trN)}</b>
            <small>${sel?tr('Aktif','Equipped'):(ok?tr('Kullanmak için tıkla','Click to equip'):escHtml(isEn()?bt.enR:bt.trR))}</small>
          </div>
          ${sel?`<span class="inv-tag on">${tr('Seçili','Active')}</span>`:(!ok?`<span class="inv-tag lk">${tr('Kilitli','Locked')}</span>`:'')}
        </button>`;
      }).join('');
      bodyHtml=`<div class="inv-sec-lbl">${tr('Savaş Masası Atmosfer Temaları','Battle Table Atmosphere Themes')}</div>
        <div class="inv-grid inv-grid-2">${btCards}</div>`;
    }else{
      const frCards=PROFILE_FRAMES.map(fr=>{
        const ok=fr.req(acc),sel=(acc.frame||'classic')===fr.id;
        return `<button type="button" class="inv-card inv-card-sm${sel?' sel':''}${ok?'':' lock'}" data-fr="${fr.id}" ${ok?'':'disabled'}>
          <div class="inv-stage inv-stage-fr">
            <img class="inv-fr-av fr-${fr.id}" src="${heroImg}" alt="" decoding="async">
          </div>
          <div class="inv-info">
            <b>${escHtml(isEn()?fr.enN:fr.trN)}</b>
            <small>${sel?tr('Aktif','Equipped'):(ok?tr('Kullan','Equip'):escHtml(isEn()?fr.enR:fr.trR))}</small>
          </div>
          ${sel?`<span class="inv-tag on">${tr('Seçili','Active')}</span>`:(!ok?`<span class="inv-tag lk">${tr('Kilitli','Locked')}</span>`:'')}
        </button>`;
      }).join('');
      const achHtml=ACHIEVEMENTS.map(a=>{
        const ok=unlockedAch.has(a.id),eq=acc.title===a.id;
        return `<div class="ach-row${ok?' ok':''}">
          <span class="ach-ic">${a.ic}</span>
          <div class="ach-txt">
            <b>${isEn()?a.enN:a.trN}</b>
            <small>${isEn()?a.enD:a.trD} · <em>${isEn()?a.enT:a.trT}</em></small>
          </div>
          ${ok?`<button type="button" class="btn sm ach-eq${eq?' alt':''}" data-title="${eq?'':a.id}">${eq?tr('Takılı','Equipped'):tr('Unvanı Tak','Equip')}</button>`:`<span class="ach-lk">${tr('Kilitli','Locked')}</span>`}
        </div>`;
      }).join('');
      bodyHtml=`<div class="inv-sec-lbl">${tr('Profil Çerçeveleri','Profile Frames')}</div>
        <div class="inv-grid inv-grid-4">${frCards}</div>
        <div class="inv-sec-lbl" style="margin-top:14px">${tr('Başarımlar ve Unvanlar','Achievements & Titles')} (${unlockedAch.size}/${ACHIEVEMENTS.length})</div>
        <div class="ach-list">${achHtml}</div>`;
    }

    mb.innerHTML=`<div class="inv-wrap">
      <div class="inv-head">
        <div>
          <h3>${tr('Envanter','Inventory')}</h3>
          <p>${tr('Ölüm zarı, kart arkası, masa teması ve profil çerçevelerini canlı önizleyerek kuşan','Preview and equip your Death Dice, card backs, table themes, and profile frames')}</p>
        </div>
        <button type="button" id="inv-close-top" class="btn sm">${tr('Kapat','Close')}</button>
      </div>
      <div class="inv-tabs">
        <button type="button" class="inv-tab${cat==='dice'?' act':''}" data-ic="dice">${tr('Ölüm Zarı','Death Dice')}</button>
        <button type="button" class="inv-tab${cat==='cards'?' act':''}" data-ic="cards">${tr('Kart Arkası','Card Backs')}</button>
        <button type="button" class="inv-tab${cat==='board'?' act':''}" data-ic="board">${tr('Masa Teması','Table Theme')}</button>
        <button type="button" class="inv-tab${cat==='frame'?' act':''}" data-ic="frame">${tr('Çerçeve & Unvan','Frames & Titles')}</button>
      </div>
      <div class="inv-scroll">${bodyHtml}</div>
    </div>`;

    // Gerçek 3D D20 canvas önizlemelerini çiz
    if(cat==='dice'&&typeof draw3DD20==='function'){
      const prevSkin=window.D20_SKIN;
      const ang=(typeof getD20FaceAngles==='function')?getD20FaceAngles(20):{rx:0.6,ry:0.78,rz:0};
      mb.querySelectorAll('.inv-d20-cv').forEach(cv=>{
        window.D20_SKIN=cv.dataset.skin||'ruby';
        draw3DD20(cv,ang.rx,ang.ry,ang.rz,20,false,false,false,1.0,1.0);
      });
      window.D20_SKIN=prevSkin;
    }

    const close=()=>{mb.classList.remove('auth-mode','inv-mode');$('#m').hidden=true;lock=false};
    if($('#inv-close-top'))$('#inv-close-top').onclick=()=>{snd('click');close()};
    mb.querySelectorAll('.inv-tab').forEach(b=>b.onclick=()=>{snd('click');cat=b.dataset.ic;renderInv(USER_ACC)});
    mb.querySelectorAll('.inv-card[data-ds]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.diceSkin=b.dataset.ds;saveSession(USER_ACC);renderInv(USER_ACC)});
    mb.querySelectorAll('.inv-card[data-fx]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.d20Effect=b.dataset.fx;saveSession(USER_ACC);renderInv(USER_ACC)});
    mb.querySelectorAll('.inv-card[data-cb]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.cardBack=b.dataset.cb;saveSession(USER_ACC);renderInv(USER_ACC)});
    mb.querySelectorAll('.inv-card[data-bt]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.boardTheme=b.dataset.bt;saveSession(USER_ACC);renderInv(USER_ACC)});
    mb.querySelectorAll('.inv-card[data-fr]').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.frame=b.dataset.fr;saveSession(USER_ACC);renderInv(USER_ACC)});
    mb.querySelectorAll('.ach-eq').forEach(b=>b.onclick=()=>{snd('ok');USER_ACC.title=b.dataset.title||'';saveSession(USER_ACC);renderInv(USER_ACC)});
  };

  renderInv(USER_ACC);
  $('#m').hidden=false;
}
