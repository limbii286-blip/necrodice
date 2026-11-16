// NECRODICE - motor + bot + arayüz (online mod için motor UI'dan ayrı tutuldu)
const $=s=>document.querySelector(s);
const setH=(sel,h)=>{const e=$(sel);if(e&&e._h!==h){e.innerHTML=h;e._h=h}}; // aynı içerik tekrar yazılmaz: animasyon/titreme olmaz
const TH=[4,9,15,18],EK={4:'e',9:'a',15:'e',18:'e'}; // D20 hayatta kalma eşikleri: 4'e, 9'a, 15'e, 18'e (BG3 DC mantığı)
const BLOCK=new Set([1,2,3,4,8,9,10,11,19,20,21,22,23]); // blok sembollü jokerler
const J=['','Tekler ×2','Çiftler ÷2','+5','−5','Rakip kart çeker','Kart → 0','Kart → 12','Hedef 27','Hedef 24','Hedef 17','Hedef 15','Joker etkisiz','Kendi kartını imha','Rakip kartını imha','Açık kart takası','Kapalı kart takası','Kart çal','Kart hediye','En az kazanır','Kapalılar sayılmaz','Kapalılar ×2','Deste sayısı ±','Rakip kart çekemez','Rakip joker kullanamaz'];
const NEED={6:['any'],7:['any'],12:['eff'],13:['my'],14:['opp'],15:['my','opp'],17:['opp'],18:['my'],22:['sign']};
const KTXT={any:'bir sayı kartı seç',my:'kendi açık kartını seç',opp:'rakibin açık kartını seç',eff:'etkisiz kılınacak jokeri seç',sign:'ekle mi çıkar mı?'};
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const range=n=>[...Array(n)].map((_,i)=>i+1);
const clone=o=>JSON.parse(JSON.stringify(o));
const d6=()=>1+Math.random()*6|0;
let G,P=null,lock=false;

/* ---------- SES: Web Audio (müzik ve efekt ayrı ses ayarlı) ---------- */
const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem('nd_'+k);localStorage.setItem('nd_'+k,v)}catch(e){}return null};
let AC,SG,MG,VM=+(LS('vm')??.45),VS=+(LS('vs')??.8),RM=LS('rm')=='1',VB=LS('vb')!='0',CRT=LS('crt')!='0';
const ac=()=>{
  if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();SG=AC.createGain();MG=AC.createGain();SG.gain.value=VS;MG.gain.value=VM*.45;SG.connect(AC.destination);MG.connect(AC.destination);loadSfx();playM()}
  if(AC.state=='suspended')AC.resume();return AC;
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
      const tv=Math.min(1,VM*.45);
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
  return fetch('audio/'+f).then(ok).catch(()=>fetch(f).then(ok)).catch(()=>{if(typeof SFXD=='undefined'||!SFXD[k])throw 0;return fetch(SFXD[k]).then(ok)})}; // bulunamazsa gömülü kopya
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
    a.volume=Math.min(1,VS*v);a.play().catch(()=>{});return;
  }
  const s=AC.createBufferSource(),g=AC.createGain();s.buffer=BUF[k];g.gain.value=Math.min(1,VS*v);s.connect(g);g.connect(SG);s.start();
}
/* Joker büyük görünümü: önce gömülü küçük görsel, yüksek çözünürlüklü img/j/ID.webp yüklenince değişir */
const HC={};
function hiLoad(id,cb){let i=HC[id];if(i&&i._x&&typeof HDJ!='undefined'&&HDJ[id]){i._x=0;i._e=1;i.src=HDJ[id]} // hd.js geç yüklendiyse yeniden dene
  if(!i){i=HC[id]=new Image();const pd=String(id).padStart(2,'0'),cs=['img/j/'+id+'.png','img/j/'+id+'.webp','j'+id+'.webp',id+'.webp','img/j'+id+'.webp','img/j/'+pd+'.webp','/img/j/'+id+'.webp','img/j/'+id+'.jpg','img/j/'+id+'.avif','img/j/j'+id+'.webp','jokers/'+id+'.webp'];i._i=0;
  i.onload=()=>{AUD.hd='ok';try{i.decode&&i.decode().catch(()=>{})}catch(e){}};if(typeof HDJ!='undefined'&&HDJ[id])cs.unshift(HDJ[id]); // gömülü HD kopya: klasör olmasa da, çevrimdışı da çalışır
  cs.push('img/j/'+id+'.PNG',id+'.png','j/'+id+'.png','jokers/'+id+'.png');
  i.onerror=()=>{if(++i._i<cs.length)i.src=cs[i._i];else if(!i._e&&typeof HDJ!='undefined'&&HDJ[id]){i._e=1;i.src=HDJ[id]}else{i._x=1;if(AUD.hd!='ok')AUD.hd='fb';miss(cs[0])}};i.src=cs[0]}
  if(cb){if(i.complete&&i.naturalWidth)cb(i.src);else i.addEventListener('load',()=>cb(i.src),{once:true})}}
let hiPre=false;
function hiPreload(){if(hiPre)return;hiPre=true;range(24).forEach((id,n)=>setTimeout(()=>hiLoad(id),400+n*120))} // tüm HD jokerler arka planda önceden yüklenir, tıklayınca anında hazır olur
function hi(el,id){if(!el)return;const fb=IMG.j[id];el.onerror=()=>{el.onerror=null;if(fb)el.src=fb}; // HD açılmazsa gömülü görsele dön
  hiLoad(id,u=>{if(el.isConnected)el.src=u})}
function tone(f,d,ty='sine',v=.12,w=0,sl=0){const a=ac(),t=a.currentTime+w,o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.linearRampToValueAtTime(Math.max(30,f+sl),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(SG);o.start(t);o.stop(t+d)}
function noise(d,v=.2,hp=2500,w=0){const a=ac(),t=a.currentTime+w,n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(SG);s.start(t)}
const SND={
  draw(){sfx('draw',1)},
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
function anim(){ // Baldur's Gate 3 tarzı kırmızı 3D D20 ölüm zarı animasyonu
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

  const render = (num, isCrit, isFail, scale, textPop) => {
    if(typeof draw3DD20=='function'){
      draw3DD20(cv, rx, ry, rz, num, rolling, isCrit, isFail, scale, textPop);
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
    const duration = 2800; // Akıcı, tatmin edici ve doğal yavaşlama

    // Hedeflenen yüzün tam iniş açıları
    // Zarın dönüşü tam hedef açıda bitecek şekilde toplam devir sayısı hesaplanır
    const totalRevX = 2; // 2 tam devir
    const totalRevY = 3; // 3 tam devir
    const totalRevZ = 1; // 1 tam devir

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
        // Yumuşak kübik yavaşlama (cubic ease-out: başlangıçta hızlı, sonra gittikçe süzülerek hedefe kilitlenir)
        const t = 1.0 - Math.pow(1.0 - progress, 3.0);
        rx = startRx + (endRx - startRx) * t;
        ry = startRy + (endRy - startRy) * t;
        rz = startRz + (endRz - startRz) * t;

        // Hafif zıplama efekti
        const bounce = 1.0 + Math.sin(progress * Math.PI) * 0.08 * (1.0 - progress);
        render(target, false, false, bounce);
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
          let popStep = 0;
          const popSeq = [
            { s: 1.15, p: 1.35 },
            { s: 1.12, p: 1.42 },
            { s: 1.05, p: 1.30 },
            { s: 0.96, p: 1.15 },
            { s: 1.02, p: 1.08 },
            { s: 1.0,  p: 1.0 }
          ];
          const doPop = () => {
            if(!d.isConnected) return;
            if(popStep < popSeq.length) {
              const fr = popSeq[popStep++];
              render(num, isCrit, isFail, fr.s, fr.p);
              setTimeout(doPop, 45);
            } else {
              render(num, isCrit, isFail, 1.0, 1.0);
            }
          };
          doPop();
          if(triggerEffects){
            if(isCrit){snd('win');flash();vib([80,80,200])}
            else if(isFail){snd('death');if(res=='death'){try{document.body.classList.add('dead')}catch(e){}}vib([300,100,500])}
            else{snd(res);flash()}
            setTimeout(()=>{const x=document.querySelector('#mx');if(x)x.style.visibility=''},600);
          }
        };

        if(modVal !== 0 && rawTarget !== finalTarget){
          render(rawTarget, false, false, 1.06, 1.15);
          setTimeout(()=>{ if(d.isConnected) render(rawTarget, false, false, 1.0, 1.0); }, 180);
          const hpModEl = d.querySelector('.d20-hp-mod');
          setTimeout(()=>{
            if(!d.isConnected) return;
            if(hpModEl) hpModEl.classList.add('fly');
            snd('play');
            const mStart = performance.now(), mDur = 480;
            const sRx = rx, sRy = ry, sRz = rz;
            const fRx = finalAng.rx, fRy = finalAng.ry, fRz = finalAng.rz;
            const modFrame = tNow => {
              if(!d.isConnected) return;
              const p = Math.min(1, (tNow - mStart) / mDur);
              const e = 1 - Math.pow(1 - p, 3);
              rx = sRx + (fRx - sRx) * e;
              ry = sRy + (fRy - sRy) * e;
              rz = sRz + (fRz - sRz) * e;
              const sc = 1 + Math.sin(p * Math.PI) * 0.14;
              render(p < 0.55 ? rawTarget : finalTarget, false, false, sc, 1 + Math.sin(p * Math.PI) * 0.25);
              if(p < 1) requestAnimationFrame(modFrame);
              else {
                rx = fRx; ry = fRy; rz = fRz;
                finishFinal(finalTarget, true);
              }
            };
            requestAnimationFrame(modFrame);
          }, 480);
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
      rl.remove();
      snd('heart');
      setTimeout(runRoll, 300);
    };
  } else {
    if(rl) rl.remove();
    snd('heart');
    setTimeout(runRoll, 1000);
  }
}

/* ---------- MOTOR ---------- */
const DUEL_CLOCK_INIT=99; // Satranç saati: düello başında iki tarafın da 99 saniyesi vardır
const ONLINE_CLOCK_INIT=99;
const initClockSec=()=>((MODE==='host'||MODE==='guest'||MODE==='spectator')?ONLINE_CLOCK_INIT:DUEL_CLOCK_INIT);
const GRACE_INIT=5;       // İlk düello ve geçişlerde jokerlere bakmak için 5 saniye hazırlık süresi
function newBO3(S){
  const cs=initClockSec();
  S.dj=[];S.jdeck=shuf(range(24));S.hand=[S.jdeck.splice(0,4),S.jdeck.splice(0,4)];
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
  S.hpMod=[0,0];S.plagueMod=[0,0];S.hpTgMod=0;S.oppPeek=[];S.oppPeek1=[];
  S.turn=S.pl[0].open[0].n<S.pl[1].open[0].n?0:1;
  S.wait=false;S.rev=false;S.winSide=null;S.timeOut=[false,false];S.hadTimeout=false;S.dead=[];S.pa=[0,0];S.st={pb:0,ob:0,px:0};
  if(!Array.isArray(S.clocks)||S.clocks.length!==2){
    const cs=initClockSec();
    S.clocks=[cs,cs];
    S.clockMax=cs;
  }
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
  if(k=='sign')return [1,-1];
}
const playable=(S,p,id)=>S.jUsed[p]<2&&!S.noJ[p]&&S.hand[p].includes(id)&&(NEED[id]||[]).every(k=>opts(S,p,k).length)&&(id!=5||S.deck.length>0);
function play(S,p,id,pk){
  const q=1-p;
  const find=cid=>{for(const x of S.pl)for(const z of ['open','closed']){const i=x[z].findIndex(c=>c.id==cid);if(i>=0)return[x[z],i]}};
  const take=cid=>{const[a,i]=find(cid);return a.splice(i,1)[0]};
  S.hand[p].splice(S.hand[p].indexOf(id),1);S.used=(S.used||[]).concat(id);(S.dj=S.dj||[]).push(id);S.jUsed[p]++;S.jTurn=S.jTurn||[0,0];S.jTurn[p]++;
  const uid=++S.u;(S.pj=S.pj||[]).push({id,o:p,uid});
  if(BLOCK.has(id))S.eff.push({id,o:p,uid,neg:false,s:pk[0]});
  if(id==5)S.pl[q].open.push(S.deck.pop());
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
  hard:{rand:0,noise:0,jc:.2,jl:.08,jp:1,dm:.02,depth:2,beta:0,gap:6,mc:1,K:500,ms:2200,top:4,rjp:.5},
  imp:{rand:0,noise:0,jc:.1,jl:.05,jp:1,dm:.02,depth:2,beta:.7,gap:7,mc:1,K:30000,ms:7200,top:6,rjp:.7,bo3:1,pf:1,learn:1} // imkansız: düello (BO3) skorunu ve joker eşitlik kuralını hesaba katar
};
let DIFF='med';
const unk=(S,p)=>{const seen=new Set([...S.pl[p].open,...S.pl[p].closed,...S.pl[1-p].open,...(S.dead||[])].map(c=>c.n));return range(11).filter(n=>!seen.has(n))};
let CUR=PR.med;
function evalS(S,p){ // rakibin kapalı kartı bilinmiyor: olasılıklar üzerinden beklenen sonuç
  const q=1-p,cl=S.pl[q].closed[0];
  if(cl.o!=null)return outc(S,p);
  const pool=unk(S,p);if(!pool.length)return outc(S,p);
  const use=CUR.beta&&S.pa&&S.pa[q]>0; // rakip pas geçtiyse toplamının hedefe yakın olma ihtimali artar
  let s=0,w=0;
  pool.forEach(n=>{cl.n=n;let wt=1;if(use){const t=total(S,q),Tg=tg(S);if(t<=Tg&&t>=Tg-CUR.gap)wt=1+CUR.beta}s+=wt*outc(S,p);w+=wt});
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
  const pool=unk(S,p);let best=null,bs=evalS(clone(S),p)+prm.dm;
  if(canDraw(S,p)&&pool.length){
    let v=0;pool.forEach(x=>{const T=clone(S);T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d)});
    v=v/pool.length+nz();if(v>bs){bs=v;best={t:'d'}}
  }
  if(S.jUsed[p]<2&&!S.noJ[p])new Set(S.hand[p]).forEach(id=>{
    if(id==16||!playable(S,p,id)||Math.random()>prm.jp)return;
    combos((NEED[id]||[]).map(k=>opts(S,p,k))).forEach(pk=>{
      if(id==15&&pk[0]==pk[1])return;
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
const ROLL={rand:0,noise:0,jc:.25,jl:.15,jp:1,dm:.02,depth:0,beta:0,gap:6};
function listC(S,p,prm){
  CUR=prm;const d=prm.depth||0,out=[],pool=unk(S,p);
  out.push({a:null,v:evalS(clone(S),p)+prm.dm});
  if(canDraw(S,p)&&pool.length){let v=0;pool.forEach(x=>{const T=clone(S);T.log=[];T.deck.pop();T.pl[p].open.push({id:++T.u,n:x});v+=look(T,p,d)});out.push({a:{t:'d'},v:v/pool.length})}
  const cost=S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc;
  if(S.jUsed[p]<2&&!S.noJ[p])new Set(S.hand[p]).forEach(id=>{
    if(!playable(S,p,id))return;
    if(id==16){const c=S.pl[p].closed[0],cv=c.o??c.n;if(cv<=5)out.push({a:{t:'j',id,pk:[]},v:-9});return}
    combos((NEED[id]||[]).map(k=>opts(S,p,k))).forEach(pk=>{
      if(id==15&&pk[0]==pk[1])return;
      const T=clone(S);T.log=[];T.deck=shuf(pool.map(n=>({id:++T.u,n}))).slice(0,S.deck.length);play(T,p,id,pk);
      out.push({a:{t:'j',id,pk},v:look(T,p,d)-cost})});
  });
  return out;
}
function world(S,p,prm){ // bilinmeyenleri rastgele doldurulmuş bir "olası dünya"
  const T=clone(S),q=1-p;T.log=[];T.jdeck=[];
  let pool=shuf(unk(S,p));const cl=T.pl[q].closed[0];
  if(!pool.length)return T;
  if(prm&&prm.beta&&S.pa&&S.pa[q]>0){const Tg=tg(S),base=total(S,q,false),Lr=prm.learn&&PROF.n>=6,w=pool.map(n=>{const t=base+n;if(Lr)return PROF.p[Math.max(-6,Math.min(12,Tg-t))+6]+.7;return t<=Tg&&t>=Tg-prm.gap?1+prm.beta:1}),sm=w.reduce((a,b)=>a+b,0);let r=Math.random()*sm,i=0;while(i<w.length-1&&(r-=w[i])>0)i++;pool=[pool[i],...pool.filter((_,j)=>j!=i)]}
  cl.n=pool[0];T.deck=pool.slice(1,1+S.deck.length).map(n=>({id:++T.u,n}));
  const known=new Set([...S.hand[p],...(S.dj||[])]);
  T.hand[q]=shuf(range(24).filter(x=>!known.has(x))).slice(0,S.hand[q].length);
  return T;
}
function bo3v(T,p,r){ // tur sonucu r (p açısından) -> düelloyu kazanma değeri [-1,1]; son turda eşitlikte fazla joker kazanır
  const q=1-p,np=T.pts[p]+(r>0?1:r==0?.5:0),nq=T.pts[q]+(r<0?1:r==0?.5:0);
  if(np>=2||nq>=2||T.rounds+1>=3){let w;if(np>nq)w=1;else if(np<nq)w=0;else{const a=T.hand[p].length,b=T.hand[q].length;w=a>b?1:a<b?0:.5}return 2*w-1}
  return Math.max(-.9,Math.min(.9,.55*(np-nq)+.03*(T.hand[p].length-T.hand[q].length)))}
function rollout(T,p,a,pol){
  let actor=p,n=0;
  const doPass=()=>{if((T.timeOut&&T.timeOut[1-T.turn])||(T.turns>0&&!T.acted))return true;(T.pa=T.pa||[0,0])[actor]++;T.turns++;T.acted=false;T.turn=1-T.turn;(T.jTurn=T.jTurn||[0,0])[T.turn]=0;actor=T.turn;n=0;return false};
  const doAct=(x,who)=>{if(x.t=='d')T.pl[who].open.push(T.deck.pop());else play(T,who,x.id,x.pk);T.acted=true};
  const fin=()=>pol.bo3?bo3v(T,p,outc(T,p)):outc(T,p);
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
    const W=world(S,p);
    top.forEach((c,i)=>{const T=clone(W);const j0=[jCnt(T,0),jCnt(T,1)];const r=rollout(T,p,c.a,RP);sum[i]+=r-cost*((jCnt(T,p)-j0[p])-.5*(jCnt(T,1-p)-j0[1-p]))});
  }
  const sc=sum.map((s,i)=>s/Math.max(1,k)+(prm.w||0)*top[i].v);
  let bi=0;sc.forEach((s,i)=>{if(s>sc[bi]+1e-9)bi=i});
  return top[bi].a;
}
function decideHA(S,p,prm,done){ // zaman dilimli Monte-Carlo: ekranı dondurmadan çok daha fazla örnek
  const now=()=>(typeof performance!='undefined'?performance:Date).now();
  let all=listC(S,p,prm).sort((x,y)=>y.v-x.v);
  if(!lowW(S)&&total(S,p,true)>=tg(S))all=all.filter(c=>!(c.a&&c.a.t=='d')); // hedefte/üstündeyken kart çekmek yalnızca batırır
  const pass=all.find(c=>!c.a),draw=all.find(c=>c.a&&c.a.t=='d');
  const top=all.slice(0,prm.top||4);[pass,draw].forEach(c=>{if(c&&!top.includes(c))top.push(c)});
  all.filter(c=>c.a&&c.a.id==16&&!top.includes(c)).forEach(c=>top.push(c));
  if(top.length==1)return done(top[0].a);
  const cost=S.rounds>=2&&prm.jl!=null?prm.jl:prm.jc,sum=top.map(()=>0),RP={...ROLL,...(prm.rjp!=null?{jp:prm.rjp}:{}),bo3:prm.bo3,hm:prm.learn&&LRN.ht>=15},K=prm.K||40,bud=prm.ms||0,t0=now();let k=0;
  if(prm.pf&&pass){top.splice(top.indexOf(pass),1);top.unshift(pass)} // eşitlikte paslamak öncelikli
  const fin=()=>{const sc=sum.map((v,i)=>v/Math.max(1,k)+(prm.w||0)*top[i].v);let bi=0;sc.forEach((v,i)=>{if(v>sc[bi]+1e-9)bi=i});done(top[bi].a)};
  const tick=()=>{const t1=now();
    while(k<K&&now()-t1<20){const W=world(S,p,prm);top.forEach((c,i)=>{const T=clone(W),j0=[jCnt(T,0),jCnt(T,1)],r=rollout(T,p,c.a,RP);sum[i]+=r-cost*((jCnt(T,p)-j0[p])-.5*(jCnt(T,1-p)-j0[1-p]))});k++}
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
  const think=r=>{thinkOn=true;R();talk('think',1,.55);R();const d=rnd(r)*(S.clocks&&S.clocks[1]<24?.42:.75);plan=null;const my=++pid;
    // karar, düşünme süresinin başında hesaplanır; hamle anında ekran donmaz
    setTimeout(()=>{if(gen!=botGen||S!=G||S.turn!=1||S.over)return;if(n++>=8){plan={a:null};return}
      const ok=a=>{if(my==pid&&gen==botGen&&S==G&&S.turn==1&&!S.over)plan={a}};
      if(prm.mc)decideHA(S,1,prm,ok);else ok(decide(S,1,prm))},Math.min(400,d*.15));
    setTimeout(step,d)};
  const step=()=>{
    if(gen!=botGen||S!=G)return;
    if(S.turn!=1||S.over){thinkOn=false;return}
    if(lock||(S.graceLeft&&S.graceLeft>0)){held=1;return setTimeout(step,150)} // menü/pencere açık veya 5sn hazırlık süresi: oyun bekler
    if(held){held=0;return setTimeout(step,500)} // kapanınca kısa bir nefes payı
    thinkOn=false;
    if(S.hpUsed&&!S.hpUsed[1]){
      const bh=avKey(S,1),bt=total(S,1),bT=tg(S),low=lowW(S);
      if(bh==='c'&&!low&&(bt===bT-2||bt===bT+2||bt>bT)){
        const dlt=bt>bT?-2:2;S.hpMod[1]=(S.hpMod[1]||0)+dlt;S.hpUsed[1]=true;S.acted=true;S.log.push({p:1,t:`Hileli Dokunuş kullandı (${dlt>0?'+2':'−2'})`});snd('play');R();return think(AFTER[DIFF]);
      }
    }
    const a=plan?plan.a:(n++<8?(prm.mc?decideH:decide)(S,1,prm.mc?{...prm,K:90,ms:400}:prm):null);plan=null;pid++;
    if(!a){R();return pass()}
    S.acted=true;
    if(a.t=='d'){const c=S.deck.pop();S.pl[1].open.push(c);S.log.push({p:1,t:`kart çekti (${c.n})`});R();talk('draw',0,.3);think(AFTER[DIFF])}
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
  // Karşı tarafın süresi zaten bittiyse (sıra tekrar süresi bitene geçmez!) veya normal iki pas olduysa tur biter:
  if((S.timeOut&&S.timeOut[opp])||(!fromTimeout&&S.turns>0&&!S.acted))return endRound();
  (S.pa=S.pa||[0,0])[S.turn]++;S.turns++;S.acted=false;S.turn=opp;(S.jTurn=S.jTurn||[0,0])[S.turn]=0;R();next();
}
function next(){if(MODE=='bot'&&G.turn==1&&!lock&&!G.over)bot()}
function M(html,btn,cb,end){lock=true;$('#mb').innerHTML=html+(btn?`<br><br><button id="mo" class="btn">${btn}</button>`:end?'':'<br><i>Oda sahibinin devam etmesi bekleniyor…</i>')+(end?'<br><br><button id="mx" class="btn alt">Ana menüye dön</button>':'');$('#m').hidden=false;
  if(end&&$('#mb .dice'))$('#mx').style.visibility='hidden'; // zar atılmadan sonuç sızmasın
  anim();
  let done=false;
  if(btn)$('#mo').onclick=()=>{if(done)return;done=true;$('#m').hidden=true;lock=false;cb()};
  if(end)$('#mx').onclick=exitGame}
function MM(fn,btn,cb,sd,end){
  if(MODE=='host'){
    if(conn&&conn.open)conn.send({k:'m',html:fn(1),sd:sd&&sd(1),end});
    spectators.forEach(s=>{try{if(s.open)s.send({k:'m',html:fn(2),sd:sd&&sd(2),end,spec:true})}catch(e){}});
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
  if(Array.isArray(g.dp)&&g.dp.length==19){
    for(let i=0;i<19;i++){LRN.dp[i][0]=Math.max(LRN.dp[i][0],g.dp[i][0]||0);LRN.dp[i][1]=Math.max(LRN.dp[i][1],g.dp[i][1]||0)}
  }
  if(Array.isArray(g.arm)&&g.arm.length==ARMS.length){
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
    fbDoc.set({LRN,PROF,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})
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
  const cards=[...document.querySelectorAll('#opp .cards .c, #me .cards .c')];
  const rects=cards.map(c=>c.getBoundingClientRect());
  const frag=document.createDocumentFragment();
  const motes=[];
  const perCard=isMobilePerf()?5:10;
  cards.forEach((c,idx)=>{
    const r=rects[idx];
    c.style.animationDelay=(idx*28)+'ms';
    c.classList.add('dust-out');
    if(r.width>0&&r.height>0){
      for(let i=0;i<perCard;i++){
        const m=document.createElement('span');
        m.className='dust-mote';
        m.style.left=(r.left+Math.random()*r.width)+'px';
        m.style.top=(r.top+Math.random()*r.height)+'px';
        m.style.setProperty('--dx',((Math.random()-0.5)*70).toFixed(1)+'px');
        m.style.setProperty('--dy',(-20-Math.random()*65).toFixed(1)+'px');
        m.style.animationDelay=(idx*25+Math.random()*160)+'ms';
        frag.appendChild(m);
        motes.push(m);
      }
    }
  });
  if(motes.length){
    document.body.appendChild(frag);
    setTimeout(()=>motes.forEach(m=>m.remove()),950);
  }
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
        fx.innerHTML='<i class="hp-cast-ring"></i><span class="hp-cast-pop">Demir İrade!</span>';
        document.body.appendChild(fx);
        setTimeout(()=>fx.remove(),1350);
      }
    }
  },1580);

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
function endRound(){
  const S=G,a=[total(S,0),total(S,1)],T=tg(S);
  let r=outc(S,0),tankedSide=-1;
  if(r!==0){
    const loser=r<0?0:1;
    if(avKey(S,loser)==='n'&&Math.random()<0.30){
      r=0;tankedSide=loser;
      S.log.push({p:loser,t:'Demir İrade! Hasarı tanklayıp turu berabereye çevirdi!'});
    }
  }
  if(MODE=='bot'){profRec(S,a[0],T);lrnRound(r)}
  S.pts[0]+=r>0?1:r==0?.5:0;S.pts[1]+=r<0?1:r==0?.5:0;S.rounds++;S.res.push(r);S.wait=true;S.rev=true;S.winSide=null;
  R();snd('flip');lock=true; // 1) Kapalı kartlar açılır ve masada açık kalır
  setTimeout(()=>{
    if(S!==G)return;
    // 2) Kazanan kahraman ikonu kalkıp kaybedenin ikonuna Hearthstone tarzı saldırı vuruşu yapar
    S.winSide=r;
    if(MODE=='bot'){talk(r==0?'tie':r<0?'win':(a[1]>T&&!lowW(S)?'bust':'lose'),2)}
    if(!(S.pts.some(x=>x>=2)||S.rounds>=3)&&r==0){
      [0,1].forEach(p=>S.jdeck.length&&S.hand[p].push(S.jdeck.pop()));
    }
    snd(r>0?'win':r<0?'lose':'ok');
    R();
    setTimeout(()=>{if(S===G){if(tankedSide>=0)heroAttack(1-tankedSide,true);else if(r!==0)heroAttack(r>0?0:1);else heroClash();}},1000);
    setTimeout(()=>{
      if(S!==G)return;
      // 3) Yerdeki bütün sayı kartları tozlaşır gibi yok olur, sonra diğer tura geçilir
      dustTableCards();
      setTimeout(()=>{if(S!==G)return;lock=false;fin()},820);
    },4100);
  },750);
  function fin(){
    S.winSide=null;
    const duelEnds=S.pts.some(x=>x>=2)||S.rounds>=3;
    if(!duelEnds){
      // Bu turda bir oyuncunun süresi bittiyse ve düello devam ediyorsa:
      // İlk turda olduysa 66 sn, 2. tur ve sonrasında 44 sn taban süre uygulanır (fazlası olanın süresi korunur, azı olan tabana tamamlanır)
      if(S.hadTimeout||(S.timeOut&&(S.timeOut[0]||S.timeOut[1]))){
        const floorSec=S.rounds===1?66:44;
        S.clocks=[Math.max(S.clocks[0]||0,floorSec),Math.max(S.clocks[1]||0,floorSec)];
        S.clockMax=Math.max(S.clocks[0],S.clocks[1],floorSec);
      }
      deal(S);R();next();
      return;
    }
    let L=S.pts[0]<S.pts[1]?0:S.pts[1]<S.pts[0]?1:-1,hx=null,how='';
    if(L<0){
      const j=S.hand.map(h=>h.length);
      if(j[0]!=j[1]){L=j[0]<j[1]?0:1;how='joker'}
      else{let x,y;do{x=d6()+d6();y=d6()+d6()}while(x==y);L=x<y?0:1;hx=[x,y];how='zar'}
    }
    const th=TH[Math.min(S.bo,3)],rawRoll=d20(),hpB=avKey(S,L)==='m'?2:0,execPen=avKey(S,1-L)==='e'?-2:0,roll=Math.max(1,Math.min(20,rawRoll+hpB+execPen)),surv=roll>=th;
    const mk=(v,roll,surv)=>{return `Düelloyu ${L==v?'rakip kazandı':'sen kazandın'}${how=='joker'?' (joker sayısına göre)':how=='zar'?` (beraberlik zarı: ${hx[v]}–${hx[1-v]})`:''}.<br>Ölüm zarını ${L==v?'sen atıyorsun':'rakip atıyor'}<div class="d20-box" data-roll="${roll}" data-raw="${rawRoll}" data-mod="${hpB+execPen}" data-dc="${th}" data-m="${L==v?1:0}" data-s="${surv?'ok':L==v?'death':'win'}">
      <div class="bg3-roll-card">
        <div class="bg3-card-border"></div>
        <i class="bg3-corner tl"></i><i class="bg3-corner tr"></i><i class="bg3-corner bl"></i><i class="bg3-corner br"></i>
        <div class="bg3-dc-arch">
          <span class="lbl">HEDEF</span>
          <span class="val">${th}</span>
        </div>
        <div class="d20-stage">
          <div class="d20-glow"></div>
          <canvas id="d20cv" class="d20-canvas" width="280" height="280"></canvas>
        </div>
        ${(hpB||execPen)?`<div class="d20-hp-mod">${hpB?`<span class="d20-mod-pill pos"><b>Kader Mühürü</b><i>+${hpB}</i></span>`:''}${execPen?`<span class="d20-mod-pill neg"><b>İnfaz Hükmü</b><i>−2</i></span>`:''}</div>`:''}
        ${L==v?'<button id="rl" class="btn d20-btn">ÖLÜM ZARINI AT</button>':''}
      </div>
    </div><div class="after"><b>Zar Sonucu: ${roll}${(hpB||execPen)?` (${rawRoll}${hpB?`+${hpB} Kader Mühürü`:''}${execPen?`−2 İnfaz Hükmü`:''})`:''}</b><br>`+(surv?(L==v?'Kurtuldun! Hayatta kaldın.':'Rakip hayatta kaldı.'):`<b>${L==v?'Öldün. Oyunu rakip kazandı.':'Rakip öldü. Oyunu sen kazandın!'}</b>`)+'</div>'};
    const full=v=>mk(v,roll,surv),rig=MODE=='bot'&&DIFF=='imp'&&L==1&&!surv&&!S.rigDone; // sahne oyun başına bir kez; ikinci ölümde gerçekten ölür
    const uRev=(MODE==='host'?(L===0||L===1):L===0)&&avKey(S,L)==='u'&&!surv&&!(S.uRevived&&S.uRevived[L]);
    if(surv||rig||uRev){const n=S.bo+2;
      const lb=`Düello ${n} ile devam et`,go=()=>{try{document.body.classList.remove('dead')}catch(e){}S.bo++;(S.mast=S.mast||[0,0])[L]=(S.mast[L]|0)+1;newBO3(S);deal(S);talk(L==0?'surv0':'surv1',2);R();next()};
      if(rig){S.rigDone=true;S.hpUsed[1]=true;impSave(mk(0,1,false),()=>M(mk(0,20,true),lb,go))}
      else if(uRev){S.uRevived=S.uRevived||[false,false];S.uRevived[L]=true;S.hpUsed[L]=true;impSave(mk(0,roll,false),()=>MM(v=>mk(v,20,true),lb,go),'Hiçlik seni geri çevirdi… Bir kez daha ölümden döndün!')}
      else MM(full,lb,go)}
    else{S.over=true;lrnGame(L==0);rematchReady=[false,false];rematchHeroes=[null,null];MM(full,'Yeniden oyna',()=>chooseHero(hid=>{if(MODE==='host'){MY_HERO=hid;rematchReady[0]=true;rematchHeroes[0]=hid;checkStartOnlineRematch()}else{MY_HERO=hid;start()}},()=>{$('#menu').hidden=false;setMusic('menu')}),null,true)}
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
function impSave(html,cont,msg='Bu kadar kolay olacağını mı sandın? Bu oyunun yaratıcısı benim.'){ // BİLİNMEYEN ölecekken: zar düşer, sahne girer, zar yeniden atılır (Nat 20)
  M(html,'.',()=>{});$('#mb').classList.add('rig');
  const d=document.querySelector('#mb .d20-box');let n=0;
  const w=setInterval(()=>{if(!d||!d.isConnected||++n>600){clearInterval(w);return}
    if(d.classList.contains('finished')){clearInterval(w);setTimeout(()=>cutscene(msg,()=>{$('#mb').classList.remove('rig');cont()}),1000)}},120);
}
let entering=false;
function veil(ms=2000){const v=document.createElement('div');v.className='veil';v.style.animationDuration=ms+'ms';v.style.setProperty('--ms',ms*.9+'ms');v.innerHTML=`<img alt="" src="limbi_favicon.png?v=limbi3"><b>limbigames</b><span class="ldb"><i></i></span>`;document.body.appendChild(v);setTimeout(()=>v.remove(),ms+100)}
function enter(fn){if(entering)return;entering=true;veil();setMusic('game');setTimeout(()=>{$('#menu').hidden=true;entering=false;fn()},1700)}
let MY_HERO='c',OPP_HERO='n';
const HEROES=[
  {id:'c',name:'Lanetli Tüccar',hpName:'Hileli Terazi',desc:'Bu turda toplamına +2 veya −2 uygula.'},
  {id:'p',name:'Veba Doktoru',hpName:'Veba Laneti',desc:'Rakibin bu eldeki tüm mevcut ve gelecek sayı kartlarına +1 veya −1 laneti uygula.'},
  {id:'n',name:'Kara Şövalye',passive:true,hpName:'Demir İrade',desc:'Kaybettiğin her turda %30 ihtimalle gelen hasarı tanklayıp turu berabereye çevirirsin.'},
  {id:'a',name:'Simyacı',hpName:'Dönüşüm İksiri',desc:'Seçtiğin bir kendi sayı kartını destenin en üstündeki kartla değiştir; seçtiğin kart destenin en üstüne gider.'},
  {id:'s',name:'Büyücü',hpName:'Kuzgun Gözü',desc:'Rakibin kapalı sayı kartına gizlice bak. (Rakip kullandığını anlamaz)'},
  {id:'e',name:'Cellat',passive:true,hpName:'İnfaz Hükmü',desc:'Rakibin attığı her ölüm zarından 2 eksiltir.'},
  {id:'m',name:'Ölümün Efendisi',passive:true,hpName:'Kader Mühürü',desc:'Attığın her ölüm zarına +2 bonus kazanırsın.'},
  {id:'w',name:'Cadı',hpName:'Kara Ayin',desc:'Desteden fazladan 1 kapalı sayı kartı çek. (Bu kart hiçbir jokerden etkilenmez)'},
  {id:'l',name:'Kurt Adam',hpName:'Vahşi Pençe',desc:'İki tarafın da masadaki rastgele bir sayı kartını imha eder.'},
  {id:'v',name:'Vampir',hpName:'Kan Emici',desc:'Bu turda rakibin toplamından 2 puan çalıp kendi toplamına eklersin.'},
  {id:'u',name:'Bilinmeyen',passive:true,bossOnly:true,hpName:'Hiçlikten Dönüş',desc:'Ölüm zarında hedeflenen sayıdan düşük atarsa, bir kereliğine hayata geri döner.'}
];
const HERO_MAP=Object.fromEntries(HEROES.map(h=>[h.id,h]));
const HP_IC={
  c:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  p:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/></svg>',
  k:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18h18l-2-10-4.5 4L12 5l-2.5 7L5 8l-2 10z"/></svg>',
  n:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l6-4m-6 0l6 4"/></svg>',
  a:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3h6m-5 0v5l-4.5 8.5A2 2 0 007.2 19h9.6a2 2 0 001.7-2.5L14 8V3"/></svg>',
  s:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="10" r="6"/><path d="M8 19h8m-6-3v3m4-3v3"/></svg>',
  e:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18M12 5c4 0 7 2 7 5s-3 5-7 5"/></svg>',
  m:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 21 8.5 18 19 6 19 3 8.5"/><path d="M12 2v17M3 8.5h18"/></svg>',
  w:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a6 6 0 00-6 6c0 2.5 1.5 4.2 2 5v2h8v-2c.5-.8 2-2.5 2-5a6 6 0 00-6-6z"/><path d="M9.5 19h5M10 10h.01M14 10h.01"/></svg>',
  l:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4l3 16M12 3l1 18M19 4l-3 16"/></svg>',
  v:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.5C12 2.5 6 9.5 6 14a6 6 0 0012 0c0-4.5-6-11.5-6-11.5z"/><path d="M9.5 15a2.5 2.5 0 002.5 2.5"/></svg>',
  u:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>'
};
function start(){hiPreload();setMusic('game');try{document.body.classList.remove('dead')}catch(e){}rematchReady=[false,false];rematchHeroes=[null,null];const oppH=MODE=='bot'?({easy:'c',med:'p',hard:'m',imp:'u'}[DIFF]||'c'):(OPP_HERO||'n');G={u:0,bo:0,log:[],over:false,used:[],av:[MY_HERO,oppH],hero:[MY_HERO,oppH],uRevived:[false,false],mast:[0,0]};prevAv[0]=prevAv[1]=undefined;prevHpAnim=[false,false];newBO3(G);deal(G);if(learning())armPick();sayT='';sayAt=0;botGen++;thinkOn=false;talk('hello',2);R();next()}

/* ---------- ARAYÜZ ---------- */
const cand=()=>P?opts(G,0,P.ks[P.pk.length]):[];
let prevT=false,lastLk='',flipId=null,lastTot=[0,0],lastBust=false,prevSeal='',sayT='',prevHpAnim=[false,false];
const NAMES={c:'Lanetli Tüccar',p:'Veba Doktoru',n:'Kara Şövalye',a:'Simyacı',s:'Büyücü',e:'Cellat',m:'Ölümün Efendisi',w:'Cadı',l:'Kurt Adam',v:'Vampir',u:'BİLİNMEYEN'};
const avKey=(S,p)=>{if(p===0)return (S.hero&&S.hero[0])||MY_HERO||'c';if(MODE=='bot')return (S.hero&&S.hero[1])||{easy:'c',med:'p',hard:'m',imp:'u'}[DIFF];return (S.hero&&S.hero[p])||(S.av&&S.av[p])||'c'};
const HD_PORTRAITS={
  c:'corrupted_merchant.jpg?v=20261116_t21',
  p:'plague_doctor.jpg?v=20261116_t21',
  n:'dark_knight.jpg?v=20261116_t21',
  a:'shadow_alchemist.jpg?v=20261116_t21',
  s:'crimson_oracle.jpg?v=20261116_t21',
  e:'iron_executioner.jpg?v=20261116_t21',
  m:'cursed_king.jpg?v=20261116_t21',
  w:'necromancer.jpg?v=20261116_t21',
  l:'werewolf.jpg?v=20261116_t21',
  v:'vampire.jpg?v=20261116_t21',
  u:'unknown.jpg?v=20261116_t21'
};
const avSrc=k=>HD_PORTRAITS[k]||(k?AV[k]:IMG.bn),oppName=()=>NAMES[avKey(G,1)]||'Rakip';
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
const lastSay={};
function pickSay(cat){const L=(SAYS[DIFF]||SAYS.med)[cat]||SAYS[DIFF||'med'].joker||[];if(!L.length)return '';let i,n=0;do{i=Math.random()*L.length|0}while(L.length>1&&i==lastSay[DIFF+cat]&&n++<9);lastSay[DIFF+cat]=i;return L[i]}
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
  const el=document.createElement('div');el.id='cast';el.className='from'+p;
  el.innerHTML=`<img src="${IMG.j[id]}" alt="">`;
  document.body.appendChild(el);const oz=document.querySelector('#opp');if(oz&&oz.getBoundingClientRect){const r=oz.getBoundingClientRect();el.style.setProperty('--sy',Math.round(r.top+r.height/2-innerHeight/2)+'px')}hi(el.querySelector('img'),id);
  let done=false;
  const finish=()=>{if(done)return;done=true;if(el.isConnected)el.remove();lock=false;if(DES.has(id)){shake();snd('stamp');vib(60)}if(MODE=='bot'&&p==1){talk(jCat(id),1,.85);R()}cb&&cb()};
  el.onclick=finish;
  setTimeout(finish,1350);
}
function count(el,a,b){if(!el)return;if(a==b||RM||typeof requestAnimationFrame=='undefined'){el.textContent=b;return}const t0=performance.now(),f=n=>{const x=Math.min(1,(n-t0)/520),e=1-Math.pow(1-x,3);el.textContent=Math.round(a+(b-a)*e);if(x<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function fly(){ // yeni kartlar desteden uçarak gelir
  const d=$('#deck');if(!d||!d.getBoundingClientRect)return;const dr=d.getBoundingClientRect();let i=0;const F=FIT||1;
  const freshCards=document.querySelectorAll('.fresh');
  if(freshCards.length){
    d.classList.remove('pull');
    void d.offsetWidth;
    d.classList.add('pull');
    setTimeout(()=>d.classList.remove('pull'),540);
  }
  const rects=[...freshCards].map(el=>el.getBoundingClientRect());
  freshCards.forEach((el,idx)=>{
    const r=rects[idx];
    el.style.setProperty('--dx',(dr.left-r.left+(dr.width-r.width)/2)/F+'px');
    el.style.setProperty('--dy',(dr.top-r.top+(dr.height-r.height)/2)/F+'px');
    el.style.animationDelay=(i++*.10)+'s';
  });
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
  const sk=TH.map((t,i)=>`<span class="sk${i<bi?' past':i==bi?' cur':''}" title="D20 Ölüm Eşiği: ${t} veya üstü atmalısın">${IC.skull}<small>${t}</small></span>`).join('');
  const isSpec=MODE=='spectator';
  const specHdr=isSpec?`<div class="spec-badge"><i></i>İzleyici Modu (${specCount||1}/${MAX_SPECTATORS})</div>`:'';
  setH('#hdr',`<div class="hs sks">${sk}</div><div class="hc"><span class="lab">Düello ${S.bo+1}</span><span class="pips">${pips}</span>${specHdr}</div><div class="hg"><button class="gear" data-g="1" aria-label="Ayarlar">${IC.gear}<span>MENÜ</span></button></div>`);
  const oppClosedKnown=!!(S.rev||(S.pl[1].closed.length&&S.pl[1].closed.every(c=>c.o!=null)));
  const my=!isSpec&&S.turn==0&&!lock&&!S.wait,mt=total(S,0),ot=total(S,1,oppClosedKnown),bust=!low&&mt>T,obust=oppClosedKnown&&!low&&ot>T,seal=T+(low?'L':'');
  const exact=!low&&mt===T,oexact=oppClosedKnown&&!low&&ot===T;
  const jp=n=>`<span class="jpips" title="Bu tur kalan joker hakkı ${n}/2">${[0,1].map(i=>`<i${i<n?' class="on"':''}></i>`).join('')}</span>`;
  const avh=p=>{const k=avKey(S,p),now=performance.now();if(prevAv[p]!==undefined&&prevAv[p]!==k)morphT[p]=now;prevAv[p]=k;
    const el=(now-morphT[p])/1000,mo=morphT[p]&&el<1.1,fp=HERO_FOCUS[k]||'50% 25%';return `<img class="av${mo?' morph':''}" data-av="${p}" style="object-position:${fp};${mo?`animation-delay:-${el.toFixed(2)}s`:''}" src="${avSrc(k)}" alt="">`};
  const av0=avh(0),av1=avh(1);
  const p0Char=NAMES[avKey(S,0)]||'Lanetli Tüccar';
  const p1Char=NAMES[avKey(S,1)]||'Kara Şövalye';
  const p0Name=isSpec?`${p0Char} (Oda Sahibi)`:p0Char;
  const p1Name=isSpec?`${p1Char} (Misafir)`:(MODE=='guest'?`${p1Char} (Oda Sahibi)`:(MODE=='host'?`${p1Char} (Rakip)`:(MODE=='bot'||S.av?oppName():'Rakip')));
  const oppTimeOut=!!(S.timeOut&&S.timeOut[1]),meTimeOut=!!(S.timeOut&&S.timeOut[0]);
  const defClock=initClockSec();
  const c0=Math.ceil(S.clocks?S.clocks[0]:defClock),c1=Math.ceil(S.clocks?S.clocks[1]:defClock);
  const sc0=$('#sc-0'),sc1=$('#sc-1'),scSec0=$('#sc-sec-0'),scSec1=$('#sc-sec-1');
  if(scSec0)scSec0.textContent=String(c0);
  if(scSec1)scSec1.textContent=String(c1);
  if(sc0){sc0.classList.toggle('ticking',S.turn==0&&!S.wait&&!(S.graceLeft>0)&&!meTimeOut);sc0.classList.toggle('low',c0<=10&&c0>0);sc0.classList.toggle('out',meTimeOut||c0<=0)}
  if(sc1){sc1.classList.toggle('ticking',S.turn==1&&!S.wait&&!(S.graceLeft>0)&&!oppTimeOut);sc1.classList.toggle('low',c1<=10&&c1>0);sc1.classList.toggle('out',oppTimeOut||c1<=0)}
  const oppHandHtml=`<div class="opp-jhand" title="Rakibin elindeki kapalı jokerler (${S.hand[1].length})">${S.hand[1].map((_,i)=>`<img class="oj" style="--r:${((i-(S.hand[1].length-1)/2)*4.5).toFixed(1)}deg" src="${IMG.bj}" alt="">`).join('')}</div>`;
  $('#opp').className='zone'+(S.turn==1&&!S.wait?' act':'')+(S.winSide!=null?(S.winSide>0?' round-lose':S.winSide===0?' round-tie':''):'');
  const myHId=avKey(S,0),oppHId=avKey(S,1);
  const hpUsed0=myHId==='u'?!!(S.uRevived&&S.uRevived[0]):(myHId==='m'||myHId==='e'||myHId==='n')?false:!!(S.hpUsed&&S.hpUsed[0]);
  const hpUsed1=oppHId==='u'?!!(MODE==='bot'?S.rigDone:(S.uRevived&&S.uRevived[1])):(oppHId==='m'||oppHId==='e'||oppHId==='n'||oppHId==='s')?false:!!(S.hpUsed&&S.hpUsed[1]);
  const hpObj0=HERO_MAP[myHId]||HEROES[0],hpObj1=HERO_MAP[oppHId]||HEROES[0];
  const canHp=!isSpec&&!hpObj0.passive&&my&&!P&&!hpUsed0;
  const hpBtn0=isSpec?'':`<button id="hp-btn" class="hp-btn${hpObj0.passive?' passive':''}${hpUsed0?' used':canHp?' ready':''}" data-hp="1" data-hp-id="${myHId}" data-hp-side="0"${canHp?'':' disabled'}>${HP_IC[myHId]||HP_IC.c}</button>`;
  const hpBtn1=`<span class="hp-btn opp-hp${hpObj1.passive?' passive':''}${hpUsed1?' used':''}" data-hp-id="${oppHId}" data-hp-side="1">${HP_IC[oppHId]||HP_IC.c}</span>`;
  setH('#opp',`${oppHandHtml}<div class="who">${av1}${hpBtn1}<div class="nm"><b>${p1Name}</b>${MODE=='bot'?'':'<span class="meta">Online</span>'}</div><div class="tot${obust?' bust':oexact?' exact':''}"><small>Toplam</small><div class="tl"><b>${lastTot[1]}</b>${oppClosedKnown?'':'<i class="pq">+</i><i class="pq">?</i>'}</div></div></div><div class="sayrow">${sayT?`<span class="say">${sayT}</span>`:''}</div><div class="cards">${S.pl[1].open.map(c=>cd(c)).reverse().join('')}<span class="gap"></span>${S.pl[1].closed.map(c=>cd(c,!(S.rev||c.o!=null||(S.oppPeek&&S.oppPeek.includes(c.id))),S.rev)).join('')}</div>`);
  const chip=x=>{const e=S.eff.find(y=>y.uid==x.uid)||x;return `<span class="e${BLOCK.has(e.id)?'':' used'}${e.neg?' neg':''}${e.o==0?' mine':' opp'}${seenE.has(e.uid)?'':' newc'}${k=='eff'&&cn.includes(e.uid)?' hl':''}" data-e="${e.uid}"><img src="${IMG.j[e.id]}" alt=""></span>`};
  $('#deck b').textContent=S.deck.length;
  const drawLocked=S.eff.some(e=>e.id==23&&!e.neg&&e.o!=0);
  $('#deck').classList.toggle('can-draw',!isSpec&&my&&!P&&canDraw(S,0));
  $('#deck').classList.toggle('draw-locked',drawLocked);
  setH('#jo',(S.pj||[]).filter(x=>x.o==1).map(chip).join(''));
  setH('#jm',(S.pj||[]).filter(x=>x.o==0).map(chip).join(''));
  const sl=$('#seal'),sc=(T!=21||low?' alt':'')+(low?' low':'')+(S.turn==0?' turn-me':' turn-op');
  if(!sl._o){sl._o=1;sl.addEventListener('animationend',()=>sl.classList.remove('stamp'))}
  if(sl._c!==sc){sl._c=sc;sl.className='seal'+sc+(sl.classList.contains('stamp')?' stamp':'')}
  setH('#seal',`<b>${low?'En az':T}</b>`);
  if(prevSeal&&prevSeal!=seal){sl.classList.remove('stamp');void sl.offsetWidth;sl.classList.add('stamp')}
  $('#me').className='zone'+(my?' act':'')+(S.winSide!=null?(S.winSide<0?' round-lose':S.winSide===0?' round-tie':''):'');
  setH('#me',`<div class="who">${av0}${hpBtn0}<div class="nm"><b>${p0Name}</b></div><div class="tot${bust?' bust':exact?' exact':''}"><small>Toplam</small><b>${lastTot[0]}</b></div></div><div class="cards">${S.pl[0].open.map(c=>cd(c)).reverse().join('')}<span class="gap"></span>${S.pl[0].closed.map(c=>cd(c,!(S.rev||c.o!=null||peek.has(c.id)),S.rev||c.id==flipId,1)).join('')}</div>`);
  const pr=$('#prompt');
  pr.className=P?(P.hp?'ask':'ask has-joker'+(k==='sign'?' sign-mode':'')):'';
  if(!P){
    setH('#prompt','');
  }else if(P.hp==='u'){
    setH('#prompt',`<div class="pr-box"><div class="pr-txt">Hiçlik Değişimi: ${KTXT[k]}</div><div class="pr-btns"><button class="btn sm alt" data-x="1">Vazgeç</button></div></div>`);
  }else if(P.hp==='a'){
    setH('#prompt',`<div class="pr-box"><div class="pr-txt">Dönüşüm İksiri: Destenin en üstüyle değiştireceğin kendi sayı kartını seç</div><div class="pr-btns"><button class="btn sm alt" data-x="1">Vazgeç</button></div></div>`);
  }else{
    const btns=k==='sign'?'<button class="btn sm" data-s="1">Ekle (+)</button><button class="btn sm" data-s="-1">Çıkar (−)</button>':'';
    setH('#prompt',`<div class="pr-card-wrap"><img class="pr-jcard" src="${IMG.j[P.id]}" alt="${J[P.id]||''}"></div><div class="pr-box"><div class="pr-title">${J[P.id]}</div><div class="pr-txt">${KTXT[k]}</div><div class="pr-btns">${btns}<button class="btn sm alt" data-x="1">Vazgeç</button></div></div>`);
    const jim=pr.querySelector('.pr-jcard');
    if(jim)hi(jim,P.id);
  }
  const ends=(S.turns>0&&!S.acted)||oppTimeOut; // rakibin süresi bittiyse veya karşı taraf pas dediyse şimdi pas dersem tur biter
  $('#pass').disabled=isSpec||!(my&&!P);
  if(isSpec){
    $('#pass').style.display='none';
  }else{
    $('#pass').style.display='';
    $('#pass').textContent=ends?'Turu bitir':'Pas';$('#pass').className='btn sm'+(ends?'':' alt');
  }
  const n=S.hand[0].length;
  $('#hand').classList.toggle('joker-locked',!!(S.noJ&&S.noJ[0]));
  if(isSpec){
    setH('#hand',`<div class="spec-notice">Canlı Maç Yayını · İzleyici Modundasın</div>`);
  }else{
    setH('#hand',S.hand[0].map((id,i)=>`<span class="jslot"><img class="j${my&&!P&&playable(S,0,id)?'':' dim'}" draggable="false" style="--r:${((i-(n-1)/2)*5).toFixed(1)}deg" data-j="${id}" src="${IMG.j[id]}" alt=""></span>`).join(''));
    document.querySelectorAll('#hand .j[data-j]').forEach(im=>hi(im,+im.dataset.j));
  }
  count(document.querySelector('#me .tot b'),lastTot[0],mt);count(document.querySelector('#opp .tot b'),lastTot[1],ot);lastTot=[mt,ot];
  (S.pj||[]).forEach(e=>seenE.add(e.uid));S.hand[0].forEach(id=>hiLoad(id));
  if(prevSeal&&prevSeal!=seal)snd('stamp');prevSeal=seal;
  if(bust&&!lastBust){snd('bust');shake();vib(120)}lastBust=bust;
  if(fresh)snd('draw');
  [0,1].forEach(side=>{
    const uNow=side===0?hpUsed0:hpUsed1,hObj=side===0?hpObj0:hpObj1,hId=side===0?myHId:oppHId;
    if(uNow&&!prevHpAnim[side]&&!hObj.passive&&!(side===1&&hId==='s')){
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
    }
    prevHpAnim[side]=uNow;
  });
  const mt0=S.turn==0&&!S.wait;if(mt0&&!prevT)snd('turn');prevT=mt0;
  const last=S.log[S.log.length-1],lk=S.log.length+JSON.stringify(last);if(lk!=lastLk){lastLk=lk;if(last&&last.t=='pas dedi')snd('pass')}
  fly();flipId=null;
  if(MODE=='host'){
    if(conn&&conn.open)conn.send({k:'s',v:view(G)});
    if(spectators.length){
      const sv=specView(G);
      spectators.forEach(s=>{try{if(s.open)s.send({k:'s',v:sv,specCount:spectators.length})}catch(e){}});
    }
  }
}
function doPlay(id,pk){const S=G;P=null;if(MODE=='guest'){conn.send({k:'play',id,pk});return R()}S.graceLeft=0;lrnAct(S,'j',id);play(S,0,id,pk);S.acted=true;S.log.push({p:0,t:`joker oynadı: ${J[id]}`});note(0,id,()=>{if(MODE=='bot')talk('react',1,.5);R()})}
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
function pick(v){if(P&&P.hp==='u'){const id=v;P=null;return execSwapDeckHeroPower(0,id)}if(P&&P.hp==='a'){const id=v;P=null;return execAlchSwap(id)}P.pk.push(v);if(P.pk.length==P.ks.length)doPlay(P.id,P.pk);else R()}
function startJoker(id){const ks=NEED[id]||[];if(ks.length){P={id,ks,pk:[]};R()}else doPlay(id,[])}
const HERO_FOCUS={c:'44% 28%',p:'56% 24%',n:'50% 22%',a:'46% 25%',s:'48% 25%',e:'52% 22%',m:'48% 24%',w:'45% 23%',l:'68% 28%',v:'50% 25%'};
function chooseHero(onPick,onCancel){
  lock=true;
  const cards=HEROES.filter(h=>!h.bossOnly).map(h=>`<button class="hero-pick-card${MY_HERO===h.id?' sel':''}" data-pick-hero="${h.id}">
    <div class="hpc-art"><img class="hpc-av" src="${avSrc(h.id)}" alt="${h.name}" style="object-position:${HERO_FOCUS[h.id]||'50% 25%'};transform-origin:${HERO_FOCUS[h.id]||'50% 25%'}"></div>
    <div class="hpc-body">
      <div class="hpc-name">${h.name}</div>
      <div class="hpc-pw"><span class="hpc-ic">${HP_IC[h.id]}</span><b>${h.hpName}</b></div>
      <p class="hpc-desc">${h.desc}</p>
    </div>
  </button>`).join('');
  $('#mb').innerHTML=`<h3>Kahramanını Seç</h3><div class="hero-grid">${cards}</div><div class="row"><button id="hp-cancel" class="btn alt sm">Geri</button></div>`;
  $('#m').hidden=false;
  $('#mb').querySelectorAll('[data-pick-hero]').forEach(btn=>btn.onclick=()=>{
    const hid=btn.dataset.pickHero;
    $('#m').hidden=true;lock=false;snd('play');onPick(hid);
  });
  $('#hp-cancel').onclick=()=>{$('#m').hidden=true;lock=false;onCancel&&onCancel()};
}
function showScryModal(c1,c2,onKeep,onSwap){
  const cardHtml=c=>`<div class="scry-card"><img src="${IMG.n[c.n]}" alt="${c.n}"><span>${c.n}</span></div>`;
  box(`<h3>Pazarlık — Deste Üstü</h3><p>${c2?'En üstteki 2 kartı görüyorsun (soldaki sıradaki çekilecek kart). İstersen yerlerini değiştir:':'Destede yalnızca 1 kart kaldı:'}</p><div class="scry-row">${cardHtml(c1)}${c2?cardHtml(c2):''}</div>${c2?'<div class="row"><button id="scry-keep" class="btn sm">Sırayı Koru</button><button id="scry-swap" class="btn sm alt">Yerlerini Değiştir</button></div>':''}`, !c2);
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
function useHeroPower(){
  const S=G;if(!S||S.over||S.wait||S.turn!==0||lock||P||(S.hpUsed&&S.hpUsed[0]))return;
  const hid=avKey(S,0);
  if(hid==='c'){
    box(`<h3>Hileli Dokunuş</h3><p>Bu turda kendi toplamına hangisini uygulamak istersin?</p><div class="row"><button id="hp-p2" class="btn sm">+2 Ekle</button><button id="hp-m2" class="btn sm alt">−2 Çıkar</button></div>`, true);
    const applyMod=dlt=>{
      $('#m').hidden=true;lock=false;snd('play');
      if(MODE==='guest')return conn.send({k:'hp_mod',delta:dlt});
      S.hpMod[0]=(S.hpMod[0]||0)+dlt;S.hpUsed[0]=true;S.acted=true;S.graceLeft=0;
      S.log.push({p:0,t:`Hileli Dokunuş kullandı (${dlt>0?'+2':'−2'})`});R();
    };
    $('#hp-p2').onclick=()=>applyMod(2);
    $('#hp-m2').onclick=()=>applyMod(-2);
  }else if(hid==='p'){
    box(`<h3>Veba Laneti</h3><p>Rakibin bu eldeki tüm mevcut ve gelecek sayı kartlarına hangi laneti uygulamak istersin?</p><div class="row"><button id="hp-plp1" class="btn sm">Tüm Kartlara +1</button><button id="hp-plm1" class="btn sm alt">Tüm Kartlara −1</button></div>`, true);
    const applyPlague=dlt=>{
      $('#m').hidden=true;lock=false;snd('play');
      if(MODE==='guest')return conn.send({k:'hp_plague',delta:dlt});
      S.plagueMod=S.plagueMod||[0,0];
      S.plagueMod[1]=dlt;S.hpUsed[0]=true;S.acted=true;S.graceLeft=0;
      S.log.push({p:0,t:`Veba Laneti kullandı (Rakip tüm kartlar ${dlt>0?'+1':'−1'})`});R();
    };
    $('#hp-plp1').onclick=()=>applyPlague(1);
    $('#hp-plm1').onclick=()=>applyPlague(-1);
  }else if(hid==='a'){
    if(!(S.pl[0].open.length||S.pl[0].closed.length)||!S.deck.length)return box('<h3>Dönüşüm İksiri</h3><p>Değiştirilecek kart veya destede kart yok.</p>');
    P={hp:'a',ks:['my_all'],pk:[]};snd('info');R();
  }else if(hid==='s'){
    if(!S.pl[1].closed.length)return;
    if(MODE==='guest'){snd('flip');return conn.send({k:'hp_peek'})}
    S.oppPeek=S.pl[1].closed.map(c=>c.id);
    S.hpUsed[0]=true;
    snd('flip');R();
  }else if(hid==='w'){
    if(!canDraw(S,0))return box('<h3>Kara Ayin</h3><p>Desteden kart çekilemiyor.</p>');
    if(MODE==='guest'){snd('draw');return conn.send({k:'hp_necro'})}
    const c=S.deck.pop();c.hpImmune=true;S.pl[0].closed.push(c);
    S.hpUsed[0]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:0,t:'Kara Ayin kullandı (1 kapalı kart çekti)'});snd('draw');R();
  }else if(hid==='l'){
    if(!(S.pl[0].open.length||S.pl[0].closed.length)||!(S.pl[1].open.length||S.pl[1].closed.length))return box('<h3>Vahşi Pençe</h3><p>İmha edilecek yeterli kart yok.</p>');
    if(MODE==='guest'){snd('play');return conn.send({k:'hp_wolf'})}
    const destroyRand=side=>{const pool=S.pl[side].open.length?S.pl[side].open:S.pl[side].closed;return pool.length?pool.splice(Math.floor(Math.random()*pool.length),1)[0]:null};
    destroyRand(0);destroyRand(1);
    S.hpUsed[0]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:0,t:'Vahşi Pençe kullandı (İki taraftan 1\'er kart imha edildi)'});snd('play');R();
  }else if(hid==='v'){
    if(MODE==='guest'){snd('play');return conn.send({k:'hp_vamp'})}
    S.hpMod[1]=(S.hpMod[1]||0)-2;S.hpMod[0]=(S.hpMod[0]||0)+2;
    S.hpUsed[0]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:0,t:'Kan Emici kullandı (Rakipten 2 çaldı)'});snd('play');R();
  }else{
    return;
  }
}
function box(html,close=true){lock=true;$('#mb').innerHTML=html+(close?'<div class="row"><button id="pc" class="btn">Kapat</button></div>':'');$('#m').hidden=false;if(close)$('#pc').onclick=()=>{$('#m').hidden=true;lock=false;if(G)R()}}
/* ---------- BÜYÜK GÖRÜNÜM: karakter, sayı kartı, kapalı kart ---------- */
const HQ={};
function hq(key,cs,cb){let i=HQ[key];if(!i){i=HQ[key]=new Image();i._i=0;i.onerror=()=>{if(++i._i<cs.length)i.src=cs[i._i];else i._f=1};i.src=cs[0]}
  if(i._f)return;if(i.complete&&i.naturalWidth)cb(i.src);else i.addEventListener('load',()=>cb(i.src),{once:true})} // dosya varsa yüksek çözünürlüklüsü yüklenir, yoksa gömülü görsel kalır
function zoom(o){ // {src, hd:cb=>…, cls, cap, sub, btn, fn}
  const old=document.getElementById('zm');if(old)old.remove();
  const el=document.createElement('div');el.id='zm';
  el.innerHTML=`<img class="zi ${o.cls||''}" src="${o.src}" alt=""><b>${o.cap}</b>${o.sub?`<small>${o.sub}</small>`:''}<div class="row">${o.btn?`<button class="btn alt" data-zb="1">${o.btn}</button>`:''}<button class="btn" data-zc="1">Kapat</button></div>`;
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
const HERO_LORE={
  c:'Karanlık pazarlarda kemik ve altın tartıp terazisine hile karıştıran lanetli bezirgân.',
  p:'Gagalı maskesinin ardında ölümün izini süren, rakibin sırlarını okuyan gizemli hekim.',
  k:'Kafatası tahtından verdiği fermanla düellonun kader sınırını bile eğip büken ölümsüz hükümdar.',
  n:'Rünlü kalkanı ve ağır kılıcıyla düşmanın en güçlü hamlesini ezen yılmaz zırhlı savaşçı.',
  a:'Yasak iksirlerle sayıları dönüştürüp kaderin sırasını laboratuvarında yeniden yazan bilgin.',
  s:'Kadim yazmalar ve mum ışığı eşliğinde destenin gelecekteki kartlarını önceden okuyan bilge.',
  e:'Paslı baltası ve soğuk hükmüyle rakibin ölüm zarındaki son şansını bile gölgeleyen infazcı.',
  m:'Ölümün kendisiyle pazarlık etmiş, her kader zarında karanlık lütufla kutsanan efendi.',
  w:'Kuzgun yoldaşı ve kemik tılsımlarıyla mezardan gizli kartlar çağıran kara büyücü.',
  l:'Dolunayın öfkesiyle avının üstüne atılıp rakibi sınırın ötesine sürükleyen vahşi canavar.',
  v:'Karanlık kadehini rakiplerinin yaşam gücüyle dolduran ölümsüz kan lordu.',
  u:'Zamanın ve kaderin ötesinden bakan, ölümden bile geri dönebilen çok kollu kozmik varlık.'
};
function zoomAv(p){const S=G,k=avKey(S,p),nm=NAMES[k]||(p?'Rakip':'Sen');
  const initialSrc=HD_PORTRAITS[k]||((typeof HDAV!='undefined'&&HDAV[k])?HDAV[k]:avSrc(k));
  const lore=HERO_LORE[k]||'';
  zoom({src:initialSrc,cls:'sq',cap:`${nm} (${p==0?'Sen':'Rakip'})`,sub:lore,hd:cb=>{
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
    return zoom({src:initialSrc,cls:'card',cap:own?'Senin kapalı kartın':'Rakibin kapalı kartı',hd:backHD,
      btn:own&&!S.rev?'Kartıma bak':'',fn:()=>{snd('flip');peek.add(id);flipId=id;R();setTimeout(()=>zoomCard(id),80)}})}
  const val=c.o!=null?c.o:c.n;
  const initialSrc=(typeof HDN!='undefined'&&HDN[c.n])?HDN[c.n]:IMG.n[c.n];
  zoom({src:initialSrc,cls:'card',cap:`${val}`,hd:numHD(c.n),
    sub:(closed?(own?'Senin kapalı kartın':'Rakibin kapalı kartı'):(own?'Senin açık kartın':'Rakibin açık kartı'))+(c.o!=null?` (joker etkisiyle ${c.o} sayılıyor, kartın aslı ${c.n})`:''),
    btn:closed&&own&&!S.rev?'Kartımı gizle':'',fn:()=>{snd('flip');peek.delete(id);R()}})}
function preview(id,use,note,back){ // jokeri büyük göster: Kullan / Kapat
  lock=true;snd('info');
  $('#mb').innerHTML=`<img class="big" src="${IMG.j[id]}" alt="${J[id]}">${note?`<div class="pn">${note}</div>`:''}<div class="row">${use?'<button id="pu" class="btn alt">Kullan</button>':''}<button id="pc" class="btn">Kapat</button></div>`;
  $('#m').hidden=false;hi($('#mb .big'),id);
  $('#pc').onclick=()=>{if(back)return back();$('#m').hidden=true;lock=false;if(G)R()};
  if(use)$('#pu').onclick=()=>{$('#m').hidden=true;lock=false;startJoker(id)};
}
function codex(){box(`<h3>Joker Kodeksi</h3><div class="cdx">${range(24).map(i=>`<img src="${IMG.j[i]}" data-k="${i}" alt="${J[i]}">`).join('')}</div>`);
  document.querySelectorAll('#mb .cdx img').forEach(im=>im.onclick=()=>preview(+im.dataset.k,false,BLOCK.has(+im.dataset.k)?'Etkisiz kılınabilir':'Etkisiz kılınamaz',codex))}
function guide(){box(`<h3>Nasıl oynanır</h3>
<p class="gd"><b>Amaç:</b> tur sonunda açık ve kapalı kartlarının toplamı <b>hedefe</b> (normalde 21) rakibinden daha yakın olsun. Hedefi aşarsan turu kaybedersin. İkiniz de aşarsanız tur berabere biter.</p>
<p class="gd"><b>Başlangıç:</b> her tur herkes bir açık, bir kapalı kart alır (kartlar 1–11). Açık kartı küçük olan başlar. Kapalı kartına dokunarak kendi kartına bakabilirsin, rakibinki tur sonuna kadar gizlidir. Her oyuncunun elinde 4 joker vardır.</p>
<p class="gd"><b>Sıranda:</b> istediğin kadar <b>Kart çek</b> diyebilir (çekilen kart açık gelir), sıra sendeyken en fazla <b>1 joker</b> oynayabilir ve 30 saniyelik hamle süresi dolmadan <b>Pas</b> dersin. Orta kutudaki ok ve kum saati sıranın kimde olduğunu ve kalan süreyi gösterir.</p>
<p class="gd"><b>Turun bitmesi:</b> sırası gelen oyuncu kart çekmeden ve joker oynamadan pas derse tur biter ve kapalı kartlar açılır (oyunun ilk sırası hariç). Böyle bir durumda Pas düğmesi <b>Turu bitir</b> olur.</p>
<p class="gd"><b>Düello:</b> 3 turluk bir düellodur (galibiyet 1, beraberlik yarım puan). Kaybeden kırmızı D20 ölüm zarını atar, sonuç ölüm eşiğinden küçükse ölür. Eşikler 4, 9, 15 ve 18'dir (BG3 DC mantığı), her yeni düelloda yükselir. Puanlar eşitse elinde daha az joker kalan kaybeder, o da eşitse zar karar verir. Berabere biten turda ikiniz de birer joker çekersiniz.</p>
<hr>
<h3>Orta kutu</h3>
<p class="gd">Ortadaki yuvarlak güncel hedefi gösterir. Soldaki kırmızı alanda rakibin, sağdaki yeşil alanda senin oynadığın jokerler durur. Üzerlerine dokunarak ne yaptıklarını görebilirsin.</p>
<hr>
<h3>Blok jokerler</h3>
<p class="gd">Bu jokerler oynandıktan sonra tur sonuna kadar masada kalır ve etkisini sürdürür. Kodekste "etkisiz kılınabilir" yazar. <b>Joker etkisiz</b> ile iptal edilebilen tek grup budur. Etkisiz kılınan joker soluklaşır.</p>
<p class="gd"><b>Tekler ×2:</b> herkesin tek sayılı kartları iki katı sayılır.<br><b>Çiftler ÷2:</b> herkesin çift sayılı kartları yarıya iner.<br><b>+5 / −5:</b> yalnızca oynayanın toplamına eklenir ya da çıkarılır.<br><b>Hedef 27 / 24 / 17 / 15 ve En az kazanır:</b> hedefi değiştirir. Hepsi aynı yuvayı paylaşır, yani sonradan oynanan öncekinin yerine geçer. En az kazanır'dan sonra bir hedef jokeri oynanırsa o geçerli olur.<br><b>Kapalılar sayılmaz:</b> kapalı kartlar 0 sayılır.<br><b>Kapalılar ×2:</b> kapalı kartlar iki katı sayılır.<br><b>Deste sayısı ±:</b> destede kalan kart sayısı, oynayanın toplamına eklenir ya da çıkarılır. Deste azaldıkça değişir.<br><b>Rakip kart çekemez:</b> rakip bu tur kart çekemez.</p>
<h3>Anlık jokerler</h3>
<p class="gd">Oynandığı anda etki eder, masada kalmaz ve etkisiz kılınamaz: rakibe kart çektirme, kartı 0 ya da 12 yapma, kart imha etme, açık ya da kapalı kart takası, kart çalma, kart hediye etme, rakibin joker kullanmasını engelleme ve Joker etkisiz'in kendisi.</p>
<p class="gd">Hepsini Joker Kodeksi'nde görebilirsin.</p>`)}
function settings(){
  const inGame=$('#menu').hidden&&!!G;
  box(`<h3>Ayarlar</h3><label>Müzik<input type="range" id="sm" min="0" max="1" step=".05" value="${VM}"></label><label>Efektler<input type="range" id="ss" min="0" max="1" step=".05" value="${VS}"></label><label class="chk"><input type="checkbox" id="sr" ${RM?'checked':''}> Hareketi azalt</label><label class="chk"><input type="checkbox" id="sv" ${VB?'checked':''}> Titreşim</label>${inGame?`<div class="row"><button class="btn alt sm" id="sk">Joker Kodeksi</button><button class="btn alt sm" id="sg">Nasıl oynanır</button></div>`:''}${inGame?`<div class="row">${MODE=='bot'?'<button class="btn alt sm" id="sa">Tekrar oyna</button>':''}</div><div class="row"><button class="btn alt sm" id="sx">Ana menüye dön</button></div>`:''}`);
  $('#sm').oninput=e=>{VM=+e.target.value;LS('vm',VM);ac();MG.gain.value=VM*.45;if(FILE&&mel)mel.volume=Math.min(1,VM*.45)};
  $('#ss').oninput=e=>{VS=+e.target.value;LS('vs',VS);ac();SG.gain.value=VS};$('#ss').onchange=()=>snd('draw');
  $('#sr').onchange=e=>{RM=e.target.checked;LS('rm',RM?1:0);document.body.classList.toggle('rm',RM)};
  $('#sv').onchange=e=>{VB=e.target.checked;LS('vb',VB?1:0)};
  if($('#sk'))$('#sk').onclick=codex;if($('#sg'))$('#sg').onclick=guide;
  if($('#sa'))$('#sa').onclick=()=>{ // aynı botla baştan başla, mevcut oyun iptal
    botGen++;thinkOn=false;const c=$('#cast');if(c)c.remove();$('#m').hidden=true;lock=false;P=null;
    G.over=true;start()};
  if($('#sx'))$('#sx').onclick=exitGame;
}
let leaving=false;
function peerLeft(msg){ // rakip çıktı: ana menüye ASLA doğrudan atma, yalnızca "Ana menüye dön" ile limbigames perdesi üzerinden gidilir
  if(leaving)return;
  try{conn=null}catch(e){}
  if(MODE=='spectator'){
    // İzleyiciyken oda kapandıysa veya bağlantı koptuysa:
    M(`Oda bağlantısı kesildi.<br><b>Yayın sona erdi.</b>`,null,null,true);
    return;
  }
  if(!G){st(msg);return}              // henüz oyun yok (lobi): sadece bilgi yaz
  const c=$('#cast');if(c)c.remove();P=null;
  if(G.over){ // oyun zaten bitmişti: sonuç penceresi kalsın, not eklensin, yeniden oyna kalksın
    const mb=$('#mb');
    if(!$('#m').hidden&&mb){const o=$('#mo');if(o){const br=o.previousElementSibling;o.remove();if(br&&br.tagName=='BR')br.remove()}
      if(!mb.querySelector('.pl'))mb.insertAdjacentHTML('afterbegin',`<div class="pn pl">${msg}</div>`);
      if(!$('#mx')){mb.insertAdjacentHTML('beforeend','<br><br><button id="mx" class="btn alt">Ana menüye dön</button>');$('#mx').onclick=exitGame}
      lock=true;return}
  }
  G.over=true;botGen++;thinkOn=false;waitM=false;
  M(`${msg}<br><b>Oyunu sen kazandın.</b>`,null,null,true);snd('win');
}
function exitGame(){ // limbigames perdesi, sonra ilk ekrana dön
  if(entering)return;entering=true;leaving=true;botGen++;thinkOn=false;
  const c=$('#cast');if(c)c.remove();$('#m').hidden=true;lock=true;P=null;
  veil();
  setTimeout(()=>{
    try{if(conn)conn.close()}catch(e){}
    try{spectators.forEach(s=>{try{s.close()}catch(err){}})}catch(e){}
    try{if(peer)peer.destroy()}catch(e){}
    conn=null;spectators=[];peer=null;waitM=false;specCount=0;
    if(G)G.over=true;G=null;MODE='bot';sayT='';try{document.body.classList.remove('dead')}catch(e){}
    st('');$('#menu').hidden=false;lock=false;entering=false;setMusic('menu');
  },1700);
}
document.addEventListener('click',e=>{
  const jClick=e.target.closest&&e.target.closest('#hand .j[data-j]');
  if(!jClick){
    document.querySelectorAll('#hand .j.pinned').forEach(el=>el.classList.remove('pinned'));
  }
  const S=G,t=e.target.closest&&e.target.closest('[data-c],[data-e],[data-j],[data-s],[data-x],[data-g],[data-av],[data-hp]');
  if(lock||!t)return;
  if(t.dataset.g)return settings();
  if(!S||S.over)return;
  if(t.dataset.hp)return useHeroPower();
  const k=P&&P.ks[P.pk.length],c=+t.dataset.c,u=+t.dataset.e;
  if(t.dataset.x){P=null;return R()}
  if(t.dataset.s)return pick(+t.dataset.s);
  if(P){ // hedef seçimi
    if(t.dataset.c&&k!='eff'&&opts(S,0,k).includes(c))pick(c);
    else if(t.dataset.e&&k=='eff'&&opts(S,0,k).includes(u))pick(u);
    return;
  }
  if(t.dataset.c&&t.dataset.pk){
    snd('flip');
    if(peek.has(c))peek.delete(c);else peek.add(c);
    flipId=c;
    return R();
  }
  if(t.dataset.j){
    if(window._suppressJokerClick)return;
    const id=+t.dataset.j;
    if(S.turn==0&&!S.wait&&MODE!=='spectator'&&playable(S,0,id)){
      document.querySelectorAll('#hand .j.pinned,#hand .j.hovered').forEach(el=>el.classList.remove('pinned','hovered'));
      return startJoker(id);
    }
    const wasPinned=t.classList.contains('pinned');
    document.querySelectorAll('#hand .j.pinned').forEach(el=>el.classList.remove('pinned'));
    if(!wasPinned){t.classList.add('pinned');snd('info')}
    return;
  }
});
function drawFromDeck(){const S=G;if(!S||S.turn||lock||P||!canDraw(S,0))return;if(MODE=='guest')return conn.send({k:'draw'});S.graceLeft=0;lrnAct(S,'d');const c=S.deck.pop();S.pl[0].open.push(c);S.acted=true;S.log.push({p:0,t:`kart çekti (${c.n})`});R()}
$('#pass').onclick=()=>{if(G.turn==0&&!lock&&!P){if(MODE=='guest')conn.send({k:'pass'});else{lrnAct(G,'p');pass()}}};

/* ---------- ONLINE (PeerJS) ---------- */
let MODE='bot',peer,conn,spectators=[],specCount=0,waitM=false,rematchReady=[false,false],rematchHeroes=[null,null];
function showRematchWait(msg){
  box(`<h3>Hazırsın</h3><p>${msg}</p><div class="row"><button id="rm-exit" class="btn alt">Ana menüye dön</button></div>`,false);
  const ex=$('#rm-exit');if(ex)ex.onclick=exitGame;
}
function checkStartOnlineRematch(){
  if(rematchReady[0]&&rematchReady[1]){
    MY_HERO=rematchHeroes[0]||MY_HERO;
    OPP_HERO=rematchHeroes[1]||OPP_HERO;
    rematchReady=[false,false];rematchHeroes=[null,null];
    $('#m').hidden=true;lock=false;start();
  }else if(rematchReady[0]){
    showRematchWait('Rakibin "Yeniden oyna" demesi ve kahraman seçmesi bekleniyor…');
  }
}
const MAX_SPECTATORS = 5;
function view(S){ // rakibe gidecek, gizli bilgisi temizlenmiş ve aynalanmış durum
  const f=a=>[a[1],a[0]],pk1=S.oppPeek1||[];
  const hu0=S.hpUsed?!!S.hpUsed[0]:false,hu1=S.hpUsed?!!S.hpUsed[1]:false;
  const visHu0=avKey(S,0)==='s'?false:hu0;
  return {av:f(S.av),hero:S.hero?f(S.hero):f(S.av),hpUsed:[hu1,visHu0],hpMod:S.hpMod?f(S.hpMod):[0,0],plagueMod:S.plagueMod?f(S.plagueMod):[0,0],hpTgMod:S.hpTgMod||0,uRevived:S.uRevived?f(S.uRevived):[false,false],oppPeek:pk1,mast:f(S.mast),turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:1-S.turn,clocks:S.clocks?f(S.clocks):[ONLINE_CLOCK_INIT,ONLINE_CLOCK_INIT],clockMax:S.clockMax||ONLINE_CLOCK_INIT,graceLeft:S.graceLeft||0,timeOut:S.timeOut?f(S.timeOut):[false,false],hadTimeout:!!S.hadTimeout,pts:f(S.pts),rev:S.rev,winSide:S.winSide==null?null:-S.winSide,res:(S.res||[]).map(x=>-x),jUsed:f(S.jUsed),jTurn:S.jTurn?f(S.jTurn):[0,0],noJ:f(S.noJ),
    hand:[S.hand[1],S.hand[0].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[S.pl[1],{open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:(S.rev||pk1.includes(c.id))?c.n:0,o:c.o,hpImmune:!!c.hpImmune}))}],
    eff:S.eff.map(e=>({...e,o:1-e.o})),pj:(S.pj||[]).map(e=>({...e,o:1-e.o})),log:S.log.slice(-6).map(l=>({...l,p:l.p<0?-1:1-l.p}))};
}
function specView(S){ // izleyicilere gidecek durum (0 = host/oda sahibi, 1 = misafir oyuncu, kapalı kartlar rev olmadan görünmez)
  return {
    av:[S.av[0],S.av[1]],hero:S.hero?[...S.hero]:[S.av[0],S.av[1]],hpUsed:S.hpUsed?[...S.hpUsed]:[false,false],hpMod:S.hpMod?[...S.hpMod]:[0,0],plagueMod:S.plagueMod?[...S.plagueMod]:[0,0],hpTgMod:S.hpTgMod||0,uRevived:S.uRevived?[...S.uRevived]:[false,false],mast:[S.mast[0],S.mast[1]],turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:S.turn,clocks:S.clocks?[...S.clocks]:[ONLINE_CLOCK_INIT,ONLINE_CLOCK_INIT],clockMax:S.clockMax||ONLINE_CLOCK_INIT,graceLeft:S.graceLeft||0,timeOut:S.timeOut?[...S.timeOut]:[false,false],hadTimeout:!!S.hadTimeout,pts:S.pts,rev:S.rev,winSide:S.winSide,res:S.res,jUsed:S.jUsed,jTurn:S.jTurn?[...S.jTurn]:[0,0],noJ:S.noJ,
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
        p0: { name: '1. Oyuncu', hero: MY_HERO||'t', role: 'Oda Sahibi', busy: true },
        p1: { name: '2. Oyuncu', hero: guestBusy?(OPP_HERO||'c'):'c', role: 'Misafir Oyuncu', busy: guestBusy }
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
        const ls=$('#lobbyStatus');if(ls)ls.textContent='Rakip bağlandı! Oyun başlıyor…';
        setTimeout(()=>{
          $('#m').hidden=true;lock=false;
          enter(start);
        },600);
        fromConn.on('close',()=>peerLeft('Rakip oyundan ayrıldı.'));
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

  if(m.k=='rematch_ready'){
    if(fromConn!==conn)return;
    rematchReady[1]=true;
    rematchHeroes[1]=(m.hero&&HERO_MAP[m.hero]&&!HERO_MAP[m.hero].bossOnly)?m.hero:'c';
    checkStartOnlineRematch();
    return;
  }

  const S=G;if(!S||S.over||S.wait||S.turn!=1)return;
  if(fromConn !== conn) return; // Hamleleri sadece aktif rakip (conn) yapabilir!
  if(m.k=='draw'){if(!canDraw(S,1))return;S.graceLeft=0;const c=S.deck.pop();S.pl[1].open.push(c);S.acted=true;S.log.push({p:1,t:`kart çekti (${c.n})`});R()}
  else if(m.k=='pass')pass();
  else if(m.k=='play'){
    const id=m.id,ks=NEED[id]||[],pk=m.pk||[];
    if(!playable(S,1,id)||pk.length!=ks.length||!ks.every((k,i)=>opts(S,1,k).includes(pk[i])))return;
    S.graceLeft=0;play(S,1,id,pk);S.acted=true;S.log.push({p:1,t:`joker oynadı: ${J[id]}`});note(1,id,R);
  }
  else if(m.k=='hp_scry'){
    if(avKey(S,1)!=='s'||(S.hpUsed&&S.hpUsed[1])||!S.deck.length)return;
    S.hpUsed[1]=true;S.graceLeft=0;
    const n=S.deck.length,c1=S.deck[n-1],c2=n>1?S.deck[n-2]:null;
    fromConn.send({k:'hp_scry_res',c1,c2});
    R();
  }
  else if(m.k=='hp_scry_done'){
    if(avKey(S,1)!=='s')return;
    const n=S.deck.length;
    if(m.swap&&n>1){const tmp=S.deck[n-1];S.deck[n-1]=S.deck[n-2];S.deck[n-2]=tmp;S.log.push({p:1,t:'Kader Kehaneti kullandı (sırayı değiştirdi)'})}
    else S.log.push({p:1,t:'Kader Kehaneti kullandı (sırayı korudu)'});
    R();
  }
  else if(m.k=='hp_mod'){
    if(avKey(S,1)!=='c'||(S.hpUsed&&S.hpUsed[1]))return;
    const dlt=m.delta>0?2:-2;
    S.hpMod[1]=(S.hpMod[1]||0)+dlt;S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:`Hileli Dokunuş kullandı (${dlt>0?'+2':'−2'})`});
    R();
  }
  else if(m.k=='hp_peek'){
    if(avKey(S,1)!=='s'||(S.hpUsed&&S.hpUsed[1])||!S.pl[0].closed.length)return;
    S.oppPeek1=S.pl[0].closed.map(c=>c.id);
    S.hpUsed[1]=true;
    R();
  }
  else if(m.k=='hp_plague'){
    if(avKey(S,1)!=='p'||(S.hpUsed&&S.hpUsed[1]))return;
    const dlt=m.delta>0?1:-1;
    S.plagueMod=S.plagueMod||[0,0];
    S.plagueMod[0]=dlt;S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:`Veba Laneti kullandı (Rakip tüm kartlar ${dlt>0?'+1':'−1'})`});
    R();
  }
  else if(m.k=='hp_alch'){
    if(avKey(S,1)!=='a'||(S.hpUsed&&S.hpUsed[1])||!S.deck.length)return;
    let done=false;
    for(const arr of [S.pl[1].open,S.pl[1].closed]){
      const idx=m.cid!=null?arr.findIndex(c=>c.id===m.cid):(arr.length-1);
      if(idx>=0){
        const old=arr[idx],rep=S.deck.pop();
        arr[idx]=rep;S.deck.push(old);
        S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
        S.log.push({p:1,t:'Dönüşüm İksiri kullandı'});
        done=true;R();break;
      }
    }
    if(!done)return;
  }
  else if(m.k=='hp_necro'){
    if(avKey(S,1)!=='w'||(S.hpUsed&&S.hpUsed[1])||!canDraw(S,1))return;
    const c=S.deck.pop();c.hpImmune=true;S.pl[1].closed.push(c);
    S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:'Kara Ayin kullandı (1 kapalı kart çekti)'});
    R();
  }
  else if(m.k=='hp_wolf'){
    if(avKey(S,1)!=='l'||(S.hpUsed&&S.hpUsed[1]))return;
    const destroyRand=side=>{const pool=S.pl[side].open.length?S.pl[side].open:S.pl[side].closed;return pool.length?pool.splice(Math.floor(Math.random()*pool.length),1)[0]:null};
    destroyRand(0);destroyRand(1);
    S.hpUsed[1]=true;S.acted=true;S.graceLeft=0;
    S.log.push({p:1,t:'Vahşi Pençe kullandı (İki taraftan 1\'er kart imha edildi)'});
    R();
  }
  else if(m.k=='hp_vamp'){
    if(avKey(S,1)!=='v'||(S.hpUsed&&S.hpUsed[1]))return;
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
    st('Oyuncu slotu doldu! İzleyici olarak katılabilirsin.');
    const btnP = $('#btnJoinPlayer');
    if(btnP){ btnP.disabled = true; btnP.textContent = 'Dolu'; }
    return;
  }
  if(m.k=='spec_full'){
    st(`İzleyici slotu dolu! En fazla ${m.max||5} izleyici katılabilir.`);
    const btnS = $('#btnJoinSpec');
    if(btnS){ btnS.disabled = true; btnS.textContent = `İzleyici Dolu (${m.max||5}/${m.max||5})`; }
    return;
  }
  if(m.k=='role'){
    $('#m').hidden = true; lock = false;
    if(m.role=='spectator'){
      MODE='spectator';
      st('Odaya izleyici olarak katıldın.');
      veil();setMusic('game');
    }else if(m.role=='player'){
      MODE='guest';
      st('Odaya oyuncu olarak katıldın.');
      veil();setMusic('game');
    }
    return;
  }
  if(m.k=='s'){
    if(m.specCount!=null)specCount=m.specCount;
    const prevRev=G&&G.rev,prevWin=G?G.winSide:null;
    G=m.v;if(!G.over){try{document.body.classList.remove('dead')}catch(e){}}
    if(G.rev&&!prevRev)snd('flip');
    if(G.winSide!=null&&prevWin==null){
      snd(G.winSide>0?'win':G.winSide<0?'lose':'ok');
      const winW=G.winSide;
      setTimeout(()=>{if(G&&G.winSide===winW){if(winW!==0)heroAttack(winW>0?0:1);else heroClash();}},1000);
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
      M(m.html,'Yeniden oyna',()=>chooseHero(hid=>{
        MY_HERO=hid;waitM=true;
        if(conn&&conn.open)conn.send({k:'rematch_ready',hero:hid});
        showRematchWait('Rakibin "Yeniden oyna" demesi ve kahraman seçmesi bekleniyor…');
      },exitGame),true);
    }else{
      M(m.html,null,null,m.end);
    }
    snd(m.sd);
  }
  else if(m.k=='j')cast(m.p,m.id,R);
  else if(m.k=='hp_scry_res'){
    showScryModal(m.c1,m.c2,()=>{if(conn&&conn.open)conn.send({k:'hp_scry_done',swap:false})},()=>{if(conn&&conn.open)conn.send({k:'hp_scry_done',swap:true})});
  }
}
const st=t=>$('#st').textContent=t;
const NETERR=e=>({'network':1,'server-error':1,'socket-error':1,'socket-closed':1})[e.type]?'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.':e.type=='peer-unavailable'?'Oda bulunamadı':'Hata: '+e.type;
const noNet=()=>{if(typeof Peer=='undefined'||navigator.onLine===false){MODE='bot';st('Online mod için internet bağlantısı gerekli. Bilgisayara karşı oynayabilirsin.');return true}return false};
function hostRoom(){
  if(noNet())return;
  MODE='host';leaving=false;sayT='';spectators=[];specCount=0;const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
  st('Oda oluşturuluyor…');
  peer=new Peer('necrodice-'+code);
  
  const showLobby=()=>{
    box(`
      <div class="lobby-box">
        <h3 style="margin-bottom:8px">Çevrim İçi Lobi</h3>
        <p style="color:var(--bone);font-size:20px;margin-bottom:14px">Bu kodu arkadaşına ilet:</p>
        <div class="lobby-code-badge" id="lobbyCodeBox" title="Kodu Kopyala">
          <span class="lobby-lbl">ODA KODU</span>
          <b class="lobby-code">${code}</b>
          <span class="lobby-copy-hint">kopyalamak için tıkla</span>
        </div>
        <div class="lobby-spinner"><i></i><i></i><i></i></div>
        <p id="lobbyStatus" style="font-size:18px;color:#a0b8a4;margin-top:12px">Bağlantı açık · Rakip bekleniyor</p>
      </div>
    `, true);

    const cb=$('#lobbyCodeBox');
    if(cb){
      cb.onclick=()=>{
        try{
          navigator.clipboard.writeText(code);
          const h=cb.querySelector('.lobby-copy-hint');
          if(h){h.textContent='Kopyalandı!';setTimeout(()=>h.textContent='kopyalamak için tıkla',2000)}
        }catch(e){}
      };
    }

    const pc=$('#pc');
    if(pc){
      pc.textContent='Lobiyi Kapat';
      pc.onclick=()=>{
        try{if(peer)peer.destroy()}catch(e){}
        peer=null;conn=null;spectators=[];MODE='bot';
        $('#m').hidden=true;lock=false;st('');
      };
    }
  };

  peer.on('open',()=>{
    st('Oda kodu: '+code+' — rakip bekleniyor…');
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
  
  box(`
    <div class="join-modal">
      <h3 style="margin-bottom:6px">Odaya Katıl</h3>
      <span class="join-code-tag">${currentCode}</span>
      <p style="font-size:18px;color:var(--bone);margin-bottom:8px">Mevcut oyuncu slotları:</p>
      
      <div class="slot-list">
        <div class="slot-card">
          <div class="slot-info">
            <img class="slot-av" src="${avSrc(p0.hero||'c')}" alt="${p0.name}">
            <div class="slot-names">
              <b>${p0.name}</b>
              <small>${p0.role}</small>
            </div>
          </div>
          <span class="slot-status busy">DOLU</span>
        </div>
        
        <div class="slot-card">
          <div class="slot-info">
            <img class="slot-av" src="${avSrc(p1.hero||'c')}" alt="${p1.name}">
            <div class="slot-names">
              <b>${p1.name}</b>
              <small>${p1.role}</small>
            </div>
          </div>
          <span class="slot-status ${p1Free?'free':'busy'}">${p1Free?'BOŞ':'DOLU'}</span>
        </div>
      </div>
      
      <div class="slot-actions">
        <button id="btnJoinPlayer" class="btn ${p1Free?'':'dim'}" ${p1Free?'':'disabled'}>
          ${p1Free?'Oyuncu Olarak Katıl':'Oyuncu Slotu Dolu'}
        </button>
        <button id="btnJoinSpec" class="btn alt ${specFree?'':'dim'}" ${specFree?'':'disabled'}>
          ${specFree ? `İzleyici Olarak Katıl (${specCount||0}/${MAX_SPECTATORS})` : `İzleyici Dolu (${MAX_SPECTATORS}/${MAX_SPECTATORS})`}
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
          st('Odaya katılınıyor…');
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
      bs.textContent = 'İzleyici olarak giriliyor…';
      if(conn && conn.open) conn.send({k:'join_as', role:'spectator'});
    };
  }

  const pc = $('#pc');
  if(pc){
    pc.textContent = 'Vazgeç';
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
  const code=$('#code').value.trim().toUpperCase();if(!code)return st('Oda kodunu yaz');
  leaving=false;sayT='';st('Odaya bağlanılıyor…');peer=new Peer();
  peer.on('open',()=>{
    conn=peer.connect('necrodice-'+code,{reliable:true});
    conn.on('data',onHost);
    conn.on('open',()=>{
      st('Oda bulundu. Slot durumu alınıyor…');
      conn.send({k:'query_slots'});
    });
    conn.on('close',()=>peerLeft('Oda sahibi oyundan ayrıldı.'));
  });
  peer.on('error',e=>st(NETERR(e)));
}
const on=(id,f)=>{const e=document.querySelector(id);if(e)e.onclick=f}; // bir öğe yoksa diğer düğmeler yine de çalışır
document.querySelectorAll('.d').forEach(b=>b.onclick=()=>{DIFF=b.dataset.d;MODE='bot';chooseHero(h=>{MY_HERO=h;enter(start)})});
on('#b4',codex);on('#b5',guide);on('#b6',settings);
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
try{if(RM)document.body.classList.add('rm');if(!CRT)document.documentElement.classList.add('nocrt')}catch(e){}
try{$('#slogo').src='limbi_favicon.png?v=limbi3'}catch(e){}setTimeout(()=>{const s=$('#splash');s&&s.remove()},2900);
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

  document.addEventListener('pointerdown',e=>{
    if(e.button!=null&&e.button!==0)return;
    const dk=e.target.closest&&e.target.closest('#deck');
    if(!dk||!canDrawNow())return;
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

/* ---------- JOKER SÜRÜKLE-BIRAK & TIKLAYINCA OYNAMA (SMOOTH GHOST LERP) ---------- */
(function initJokerDragAndDrop(){
  let dragEl=null,ghost=null,dragId=0,startX=0,startY=0,isDragging=false,pointerId=null;
  const loop=createSmoothDragLoop((x,y,tilt,sc)=>{
    if(!isDragging||!ghost)return false;
    ghost.style.transform=`translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
  });

  function canPlayJoker(id){
    const S=G;
    return !!(S&&!S.over&&!lock&&!P&&S.turn==0&&!S.wait&&playable(S,0,id));
  }

  function isOverDropZone(clientY){
    return clientY < window.innerHeight * 0.72;
  }

  function cleanupDrag(){
    loop.stop();
    if(ghost){ghost.remove();ghost=null}
    if(dragEl){dragEl.classList.remove('drag-source-hidden','is-dragging','drop-hot')}
    document.body.classList.remove('dragging-joker','drop-ready');
    dragEl=null;dragId=0;isDragging=false;pointerId=null;
  }

  document.addEventListener('pointerdown',e=>{
    if(e.button!=null&&e.button!==0)return;
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
    isDragging=false;
    pointerId=e.pointerId;
    try{jEl.setPointerCapture(e.pointerId)}catch(err){}
  });

  document.addEventListener('pointermove',e=>{
    if(!dragEl||e.pointerId!==pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(!isDragging&&Math.hypot(dx,dy)>8){
      isDragging=true;
      dragEl.classList.remove('pinned','hovered');
      dragEl.classList.add('drag-source-hidden');
      document.body.classList.add('dragging-joker');
      ghost=document.createElement('img');
      ghost.className='joker-drag-ghost';
      ghost.draggable=false;
      ghost.alt='';
      ghost.src=dragEl.currentSrc||dragEl.src||IMG.j[dragId]||'';
      hi(ghost,dragId);
      ghost.style.transform=`translate3d(${e.clientX.toFixed(2)}px, ${e.clientY.toFixed(2)}px, 0) translate(-50%, -50%) scale(1)`;
      document.body.appendChild(ghost);
      loop.start(e.clientX,e.clientY,1,1.08);
    }
    if(isDragging&&ghost){
      loop.move(e.clientX,e.clientY);
      const hot=isOverDropZone(e.clientY);
      ghost.classList.toggle('ready',hot);
      loop.setScale(hot?1.14:1.08);
      document.body.classList.toggle('drop-ready',hot);
    }
  });

  function finishPointer(e,cancelled){
    if(!dragEl||e.pointerId!==pointerId)return;
    const wasDragging=isDragging;
    const id=dragId;
    const dropOk=!cancelled&&wasDragging&&isOverDropZone(e.clientY)&&canPlayJoker(id);
    cleanupDrag();
    if(wasDragging){
      window._suppressJokerClick=true;
      setTimeout(()=>{window._suppressJokerClick=false},140);
      if(dropOk){
        startJoker(id);
      }
    }
  }

  document.addEventListener('pointerup',e=>finishPointer(e,false));
  document.addEventListener('pointercancel',e=>finishPointer(e,true));
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
        sm.textContent='→ '+(newLow?'En az':newTg);
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

  document.addEventListener('pointerleave',clearHover);
})();

/* ---------- ORTADAKİ YUVARLAK KULLANILMIŞ JOKER İKONLARI: ÜZERİNE GELİNCE BÜYÜK KART GÖSTERİMİ ---------- */
(function initUsedJokerHoverInspect(){
  let activeUid=null;

  function hideInspect(){
    activeUid=null;
    const old=document.getElementById('joker-inspect-pop');
    if(old)old.remove();
  }

  function showInspect(u){
    const S=G;
    if(!S||S.over||lock)return;
    const x=(S.eff&&S.eff.find(y=>y.uid==u))||(S.pj&&S.pj.find(y=>y.uid==u));
    if(!x)return;
    let pop=document.getElementById('joker-inspect-pop');
    if(!pop){
      pop=document.createElement('div');
      pop.id='joker-inspect-pop';
      pop.style.cssText='position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;pointer-events:none!important;';
      document.body.appendChild(pop);
    }
    const statusTxt=`${x.o==0?'Senin Jokerin':'Rakibin Jokeri'}${x.neg?' · Etkisiz Kılındı':(BLOCK.has(x.id)?' · Aktif Blok Etkisi':' · Anlık Etki (Kullanıldı)')}${x.id==22?(x.s>0?' (Ekler)':' (Çıkarır)'):''}`;
    pop.innerHTML=`<div class="jip-card" style="pointer-events:none!important"><img src="${IMG.j[x.id]}" alt="${J[x.id]||''}" style="pointer-events:none!important"><div class="jip-tag ${x.o==0?'mine':'opp'}" style="pointer-events:none!important">${statusTxt}</div></div>`;
    const im=pop.querySelector('img');
    if(im)hi(im,x.id);
  }

  document.addEventListener('pointermove',e=>{
    const chip=e.target&&e.target.closest&&e.target.closest('#fx .e[data-e]');
    if(!chip){
      if(activeUid!==null)hideInspect();
      return;
    }
    const u=+chip.dataset.e;
    if(u!==activeUid){
      activeUid=u;
      showInspect(u);
    }
  });

  document.addEventListener('pointerdown',()=>{
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
    const tagTxt=h.passive?(isUsed?'Pasif · Tükendi':'Pasif'):(isUsed?'Aktif, Kullanıldı':'Aktif, Her Düelloda 1 Kez');
    let tip=document.getElementById('hp-tip');
    if(!tip){
      tip=document.createElement('div');
      tip.id='hp-tip';
      tip.className='hp-tip';
      document.body.appendChild(tip);
    }
    tip.className=`hp-tip ${side===1?'opp':'mine'}${h.passive?' passive':''}${isUsed?' used':''}`;
    tip.innerHTML=`<div class="hp-tip-head"><div class="hp-tip-title">${h.hpName}</div><div class="hp-tip-tag">${tagTxt}</div></div><div class="hp-tip-desc">${h.desc}</div>`;
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
    DPR=isMobilePerf()?1:Math.min(window.devicePixelRatio||1,2);
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
    ctx.shadowColor=glowColor;
    ctx.shadowBlur=14;
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
    const mob=isMobilePerf();
    const mn=document.getElementById('menu');
    const menuOpen=mn&&!mn.hidden;
    if(!menuOpen&&(!mob||now-lastRender>=36)){
      lastRender=now;
      const t=now*0.001;
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
      particles.forEach(p => {
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

    if(!document.body.classList.contains('rm')||menuOpen){
      requestAnimationFrame(render);
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
    DPR=isMobilePerf()?1:Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth;
    H=window.innerHeight;
    cvs.width=Math.round(W*DPR);
    cvs.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    pickMenuImg();
  }
  window.addEventListener('resize',resize);
  resize();

  function render(now){
    const menuEl=document.getElementById('menu');
    if(menuEl&&!menuEl.hidden){
      const t=now*0.001;
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

        // Kitap kapağına parlayan mor/altın rün amblemi işle
        const bcx = dx + dw*0.426, bcy = dy + dh*0.688;
        ctx.translate(bcx, bcy);
        ctx.rotate(-0.18);
        ctx.scale(1, 0.72);
        const rPulse = 0.65 + 0.35*Math.sin(t*2.4);
        ctx.strokeStyle = `rgba(216, 150, 255, ${0.65*rPulse})`;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, dw*0.024, 0, Math.PI*2);
        ctx.stroke();
        ctx.font = `700 ${Math.round(dw*0.022)}px "Cinzel Decorative", serif`;
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

      // Süzülen mum kıvılcımları, ay ışığı tozları ve mor rün parıltıları
      motes.forEach(e=>{
        e.x+=e.vx;
        e.y+=e.vy;
        if(e.y<-0.05){e.y=1.05;e.x=Math.random()}
        if(e.x<0)e.x=1;
        if(e.x>1)e.x=0;
        const ex=e.x*W + Math.sin(t*1.6+e.phase)*10;
        const ey=e.y*H;
        const al=0.32+0.55*Math.abs(Math.sin(t*2.2+e.phase));
        let col=`rgba(255, 200, 105, ${al})`;
        if(e.kind===1) col=`rgba(165, 225, 255, ${al})`;
        else if(e.kind===2) col=`rgba(216, 140, 255, ${al})`;
        ctx.fillStyle=col;
        ctx.beginPath();
        ctx.arc(ex,ey,e.r,0,Math.PI*2);
        ctx.fill();
      });
    }
    if(!document.body.classList.contains('rm')||menuOpen){
      requestAnimationFrame(render);
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
    const isMenuModal=!!(modalEl&&!modalEl.hidden&&mbEl&&!mbEl.querySelector('.d20-box,.scry-row,#hp-p2,.hero-grid'));
    const active=!!(G && !G.over && !G.wait && (!lock || (MODE!=='bot' && isMenuModal)) && (!menu || menu.hidden));
    if(!active){
      if(sc0) sc0.classList.remove('ticking','low');
      if(sc1) sc1.classList.remove('ticking','low');
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
      if(scSec0) scSec0.textContent=String(s0);
      if(scSec1) scSec1.textContent=String(s1);
      if(sc0) sc0.classList.remove('ticking','low');
      if(sc1) sc1.classList.remove('ticking','low');
      lastTickSec=-1;
      return;
    }

    const t=G.turn===1?1:0;
    G.clocks[t]=Math.max(0, G.clocks[t] - 0.1);
    const curLeft=G.clocks[t];
    const s0=Math.ceil(G.clocks[0]), s1=Math.ceil(G.clocks[1]);
    const sec=Math.ceil(curLeft);
    const myTurn=(t===0);

    if(scSec0) scSec0.textContent=String(s0);
    if(scSec1) scSec1.textContent=String(s1);

    if(sc0){
      sc0.classList.toggle('ticking', myTurn && !G.timeOut[0]);
      sc0.classList.toggle('low', G.clocks[0]<=10 && G.clocks[0]>0);
      sc0.classList.toggle('out', !!G.timeOut[0] || G.clocks[0]<=0);
    }
    if(sc1){
      sc1.classList.toggle('ticking', !myTurn && !G.timeOut[1]);
      sc1.classList.toggle('low', G.clocks[1]<=10 && G.clocks[1]>0);
      sc1.classList.toggle('out', !!G.timeOut[1] || G.clocks[1]<=0);
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
