// NECRODICE - motor + bot + arayüz (online mod için motor UI'dan ayrı tutuldu)
const $=s=>document.querySelector(s);
const setH=(sel,h)=>{const e=$(sel);if(e&&e._h!==h){e.innerHTML=h;e._h=h}}; // aynı içerik tekrar yazılmaz: animasyon/titreme olmaz
const TH=[4,6,8,10],EK={4:'ten',6:'dan',8:'den',10:'dan'}; // eşik + ayrılma eki: 4'ten, 6'dan, 8'den, 10'dan
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
let AC,SG,MG,VM=+(LS('vm')??.5),VS=+(LS('vs')??.8),RM=LS('rm')=='1',VB=LS('vb')!='0',CRT=LS('crt')!='0';
const ac=()=>{
  if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();SG=AC.createGain();MG=AC.createGain();SG.gain.value=VS;MG.gain.value=VM*.8;SG.connect(AC.destination);MG.connect(AC.destination);loadSfx();playM()}
  if(AC.state=='suspended')AC.resume();return AC;
};
/* Müzik: menüde menu.m4a, oyunda game1/game2 sırayla. Web Audio'ya bağlı olduğu için ses ayarı iOS'ta da çalışır. */
(()=>{try{const h=document.createElement('script');h.src='hd.js';h.async=true;document.head.appendChild(h)}catch(e){}})(); // HD görseller (gömülü): HDJ jokerler, HDAV karakterler
const FILE=location.protocol=='file:'; // çift tıkla açılınca Web Audio dosyaya erişemez: doğrudan <audio> kullan
const AUD={mus:'?',sfx:'?',hd:'?'},MISS=[];const miss=u=>{try{u=new URL(u,location.href).href}catch(e){}if(!MISS.includes(u))MISS.push(u)}; // ayarlarda gösterilen dosya durumu
const MU={menu:['menu.m4a'],game:['game1.m4a','game2.m4a']};
let curM='menu',mel=null,gi=Math.random()*2|0;

/* Yerleşik müzik: audio/*.m4a bulunamazsa Web Audio ile üretilen karanlık ambiyans çalar (dosya gerekmez) */
let syn=null,NOF=false;
function synthM(m){
  const a=AC,out=a.createGain(),t0=a.currentTime,game=m=='game';
  out.gain.setValueAtTime(0,t0);out.gain.linearRampToValueAtTime(1,t0+2);out.connect(MG);
  const dl=a.createDelay(1),fb=a.createGain(),wet=a.createGain();
  dl.delayTime.value=game?.28:.42;fb.gain.value=.38;wet.gain.value=.4;dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(out);
  const lp=a.createBiquadFilter(),dg=a.createGain();lp.type='lowpass';lp.frequency.value=360;dg.gain.value=game?.2:.15;lp.connect(dg);dg.connect(out);
  const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=.07;lg.gain.value=150;lfo.connect(lg);lg.connect(lp.frequency);
  const oscs=[lfo];
  [55,55.35,82.4].forEach(f=>{const o=a.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(lp);oscs.push(o)});
  oscs.forEach(o=>o.start());
  const hz=n=>440*Math.pow(2,(n-69)/12);
  const CH=[[57,60,64,69],[53,57,60,65],[50,53,57,62],[52,56,59,64]]; // Am F Dm E
  const PAT=game?[0,2,1,3,2,3,1,2]:[0,1,2,3,2,1,2,3];
  const dur=game?.36:.55;let step=0,next=a.currentTime+.15;
  function pluck(f,t,v){
    const o=a.createOscillator(),g=a.createGain(),fl=a.createBiquadFilter();
    o.type='square';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=1800;
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur*1.8);
    o.connect(fl);fl.connect(g);g.connect(out);g.connect(dl);o.start(t);o.stop(t+dur*1.9);
  }
  function thump(t){
    const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(38,t+.25);
    g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(out);o.start(t);o.stop(t+.32);
  }
  function sched(t){
    const ch=CH[(step>>3)%4],i=step%8,n=ch[PAT[i]]+(i%4==3&&Math.random()<.4?12:0);
    if(Math.random()<.88)pluck(hz(n+12),t,game?.045:.04);
    if(i==0)pluck(hz(ch[0]-12),t,.08);
    if(game&&i%4==0)thump(t);
    step++;
  }
  const timer=setInterval(()=>{while(next<a.currentTime+.4){sched(next);next+=dur}},120);
  return{m,stop(){clearInterval(timer);const t=a.currentTime;out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(0,t+1.2);
    setTimeout(()=>{oscs.forEach(o=>{try{o.stop()}catch(e){}});try{out.disconnect()}catch(e){}},1400)}};
}
function startSyn(){if(!AC||!curM||(syn&&syn.m==curM))return;if(syn)syn.stop();syn=synthM(curM)}
function playM(){
  if(syn&&syn.m!=curM){syn.stop();syn=null}
  if(!AC||!curM||(mel&&mel._m==curM))return;
  if(NOF){if(mel){mel.onerror=null;mel.pause();mel=null}startSyn();return}
  const old=mel,list=MU[curM],el=new Audio(),g=AC.createGain(),t=AC.currentTime;
  el._m=curM;el._g=g;el.preload='auto';el.loop=curM=='menu';
  const fn=curM=='game'?list[gi++%list.length]:list[0];el.src='audio/'+fn;
  const cs=['audio/'+fn,fn,'/audio/'+fn,'../audio/'+fn];el._i=0;el.onerror=()=>{if(++el._i<cs.length){el.src=cs[el._i];el.play().catch(()=>{})}else{AUD.mus='bad';NOF=true;el.onerror=null;if(mel===el){mel=null}startSyn()}};el.onplaying=()=>{AUD.mus='ok'};
  el.onended=()=>{if(mel===el&&el._m=='game'){mel=null;playM()}}; // sıradaki parça
  if(FILE)el.volume=Math.min(1,VM*.8);
  else{try{AC.createMediaElementSource(el).connect(g)}catch(e){console.warn('müzik bağlanamadı',e);return}
    g.connect(MG);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+1.5)}
  mel=el;el.play().catch(e=>console.warn('müzik çalınamadı',e));
  if(old&&FILE){old.onerror=null;old.pause();old.src=''}
  else if(old){const gt=AC.currentTime;old._g.gain.cancelScheduledValues(gt);old._g.gain.setValueAtTime(old._g.gain.value,gt);old._g.gain.linearRampToValueAtTime(0,gt+1.2);setTimeout(()=>{old.onerror=null;old.pause();old.src=''},1300)}
}
function setMusic(m){curM=m;playM()}
document.addEventListener('visibilitychange',()=>{if(syn&&AC){document.hidden?AC.suspend():AC.resume();return}if(!mel)return;if(document.hidden)mel.pause();else mel.play().catch(()=>{})});
/* Ses efektleri (wav): bir kez çözülüp bellekte tutulur */
const BUF={};
const getA=f=>{const k=f.replace('.wav',''),ok=r=>{if(!r.ok)throw 0;return r.arrayBuffer()};
  return fetch('audio/'+f).then(ok).catch(()=>fetch(f).then(ok)).catch(()=>{if(typeof SFXD=='undefined'||!SFXD[k])throw 0;return fetch(SFXD[k]).then(ok)})}; // bulunamazsa gömülü kopya
function loadSfx(){if(FILE){BUF.draw='kart_cekme';BUF.play='joker_oynama';BUF.info='joker_bilgi';AUD.sfx='file';return}
  [['draw','kart_cekme'],['play','joker_oynama'],['info','joker_bilgi']].forEach(([k,f])=>getA(f+'.wav').then(b=>AC.decodeAudioData(b)).then(d=>{BUF[k]=d;AUD.sfx=AUD.sfx=='bad'?'bad':'ok'}).catch(e=>{AUD.sfx='bad';miss('audio/'+f+'.wav');console.warn('efekt yüklenemedi: '+f+'.wav',e)}))}
function sfx(k,v=1){if(typeof BUF[k]=='string'){const a=new Audio(typeof SFXD!='undefined'&&SFXD[BUF[k]]||'audio/'+BUF[k]+'.wav');a.volume=Math.min(1,VS*v);a.play().catch(()=>{});return}
  const s=AC.createBufferSource(),g=AC.createGain();s.buffer=BUF[k];g.gain.value=v;s.connect(g);g.connect(SG);s.start()}
/* Joker büyük görünümü: önce gömülü küçük görsel, yüksek çözünürlüklü img/j/ID.webp yüklenince değişir */
const HC={};
function hiLoad(id,cb){let i=HC[id];if(i&&i._x&&typeof HDJ!='undefined'&&HDJ[id]){i._x=0;i._e=1;i.src=HDJ[id]} // hd.js geç yüklendiyse yeniden dene
  if(!i){i=HC[id]=new Image();const pd=String(id).padStart(2,'0'),cs=['img/j/'+id+'.png','img/j/'+id+'.webp','j'+id+'.webp',id+'.webp','img/j'+id+'.webp','img/j/'+pd+'.webp','/img/j/'+id+'.webp','img/j/'+id+'.jpg','img/j/'+id+'.avif','img/j/j'+id+'.webp','jokers/'+id+'.webp'];i._i=0;
  i.onload=()=>{AUD.hd='ok';try{i.decode&&i.decode().catch(()=>{})}catch(e){}};if(typeof HDJ!='undefined'&&HDJ[id])cs.unshift(HDJ[id]); // gömülü HD kopya: klasör olmasa da, çevrimdışı da çalışır
  cs.push('img/j/'+id+'.PNG',id+'.png','j/'+id+'.png','jokers/'+id+'.png');
  i.onerror=()=>{if(++i._i<cs.length)i.src=cs[i._i];else if(!i._e&&typeof HDJ!='undefined'&&HDJ[id]){i._e=1;i.src=HDJ[id]}else{i._x=1;if(AUD.hd!='ok')AUD.hd='fb';miss(cs[0])}};i.src=cs[0]}
  if(cb){if(i.complete&&i.naturalWidth)cb(i.src);else i.addEventListener('load',()=>cb(i.src),{once:true})}}
let hiPre=false;
function hiPreload(){if(hiPre)return;hiPre=true;range(25).forEach((id,n)=>setTimeout(()=>hiLoad(id),400+n*120))} // tüm HD jokerler arka planda önceden yüklenir, tıklayınca anında hazır olur
function hi(el,id){if(!el)return;const fb=IMG.j[id];el.onerror=()=>{el.onerror=null;if(fb)el.src=fb}; // HD açılmazsa gömülü görsele dön
  hiLoad(id,u=>{if(el.isConnected)el.src=u})}
function tone(f,d,ty='sine',v=.12,w=0,sl=0){const a=ac(),t=a.currentTime+w,o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.linearRampToValueAtTime(Math.max(30,f+sl),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(SG);o.start(t);o.stop(t+d)}
function noise(d,v=.2,hp=2500,w=0){const a=ac(),t=a.currentTime+w,n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(SG);s.start(t)}
const SND={
  draw(){if(BUF.draw)return sfx('draw');noise(.14,.22,2500);tone(300,.06,'triangle',.05)},
  flip(){noise(.07,.3,4500);tone(1100,.04,'square',.04)},
  info(){if(BUF.info)sfx('info')},
  play(){if(BUF.play)return sfx('play');tone(200,.5,'sawtooth',.09,0,-120);tone(660,.3,'triangle',.08,.1);tone(880,.4,'sine',.06,.18)},
  pass(){tone(130,.15,'sine',.2);tone(90,.2,'sine',.15,.05)},
  turn(){tone(740,.1,'sine',.07);tone(988,.14,'sine',.06,.09)},
  dice(){for(let i=0;i<10;i++){noise(.035,.28,1200+Math.random()*2500,i*.1);tone(180+Math.random()*120,.05,'square',.04,i*.1)}},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,.4,'triangle',.12,i*.11))},
  lose(){[330,277,233,185].forEach((f,i)=>tone(f,.45,'sawtooth',.07,i*.14))},
  ok(){[440,554,659].forEach((f,i)=>tone(f,.35,'sine',.1,i*.09))},
  death(){tone(80,1.6,'sawtooth',.2,0,-45);tone(55,1.8,'sine',.25);noise(.9,.18,150,.1)},
  bust(){tone(90,.5,'sawtooth',.2,0,-40);noise(.25,.25,300)},
  heart(){for(let i=0;i<3;i++){tone(60,.18,'sine',.5,i*.55);tone(55,.16,'sine',.4,i*.55+.17)}},
  stamp(){tone(70,.25,'square',.2);noise(.12,.35,400)}
};
function snd(n){if(!n||VS<=0)return;try{ac();SND[n]()}catch(e){}}
document.addEventListener('pointerdown',()=>{try{ac()}catch(e){}});
const vib=m=>{try{if(VB&&navigator.vibrate)navigator.vibrate(m)}catch(e){}};
const shake=()=>{try{if(RM)return;document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),450)}catch(e){}};
const flash=()=>{try{if(RM)return;const f=document.querySelector('#fl');f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}catch(e){}};
const PIP={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const die=n=>`<i class="die">${[...Array(9)].map((_,i)=>`<b${PIP[n].includes(i)?' class="p"':''}></b>`).join('')}</i>`;
function anim(){ // ölüm zarı: yavaş takla (zarlar yerinde döner, yüzler değişir), yavaşlayarak durma (~4 sn); zarı atan taraf düğmeye basar
  const d=document.querySelector('#mb .dice');if(!d)return;
  const a=+d.dataset.a,b=+d.dataset.b,r=()=>1+Math.random()*6|0;
  const setD=(el,n)=>el.querySelectorAll('b').forEach((x,i)=>{x.className=PIP[n].includes(i)?'p':''}); // zarlar yeniden kurulmaz: CSS takla kesintisiz sürer
  const face=()=>{const ds=d.querySelectorAll('.die');if(ds.length<2)d.innerHTML=die(r())+die(r());else{setD(ds[0],r());setD(ds[1],r())}};
  const N=11,run=wait=>{
    if(!d.isConnected)return;snd('heart');
    setTimeout(()=>{
      if(!d.isConnected)return;d.classList.add('roll');snd('dice');let i=0;
      const tick=()=>{
        if(!d.isConnected)return;
        if(i++>=N){d.innerHTML=die(a)+die(b);d.classList.remove('roll');d.classList.add('fin');snd(d.dataset.s);
          setTimeout(()=>{const x=document.querySelector('#mx');if(x)x.style.visibility=''},600);
          if(d.dataset.s=='death'){try{document.body.classList.add('dead')}catch(e){}vib([200,80,400])}else flash();return}
        face();setTimeout(tick,170+i*i*2.4)}; // yavaş başlar, sonda daha da yavaşlar
      tick()},wait)};
  face();
  const rl=document.querySelector('#rl');
  if(rl&&d.dataset.m=='1')rl.onclick=()=>{rl.remove();run(800)};
  else{if(rl)rl.remove();run(1500)}
}

/* ---------- MOTOR ---------- */
function newBO3(S){S.dj=[];S.jdeck=shuf(range(24));S.hand=[S.jdeck.splice(0,4),S.jdeck.splice(0,4)];S.pts=[0,0];S.rounds=0;S.res=[]}
function deal(S){
  S.deck=shuf(range(11).map(n=>({id:++S.u,n})));
  S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop()]}));
  S.eff=[];S.pj=[];S.jUsed=[0,0];S.noJ=[false,false];S.acted=false;S.turns=0;
  S.turn=S.pl[0].open[0].n<S.pl[1].open[0].n?0:1;
  S.wait=false;S.rev=false;S.dead=[];S.pa=[0,0];S.st={pb:0,ob:0,px:0};S.log.push({p:-1,t:`— Tur ${S.rounds+1} —`},{p:S.turn,t:'başlıyor (küçük açık kart)'});
}
const act=(S,id)=>S.eff.some(e=>e.id==id&&!e.neg);
function total(S,p,wc=true){
  const f=(c,cl)=>{const b=c.o??c.n;let v=b;if(act(S,1)&&b%2)v=b*2;else if(act(S,2)&&b%2==0)v=b/2; // x2: tekler iki katı, ÷2: çiftler yarısı (ikisi birlikte olunca da her kart yalnızca bir kez etkilenir)
    if(cl){if(act(S,20))return 0;if(act(S,21))v*=2}return v};
  let t=0;S.pl[p].open.forEach(c=>t+=f(c,0));if(wc)S.pl[p].closed.forEach(c=>t+=f(c,1));
  S.eff.forEach(e=>{if(e.neg||e.o!=p)return;if(e.id==3)t+=5;if(e.id==4)t-=5;if(e.id==22)t+=e.s*S.deck.length});
  return t;
}
const TGS=new Set([8,9,10,11,19]),tgE=S=>S.eff.filter(e=>!e.neg&&TGS.has(e.id)).pop(),lowW=S=>{const e=tgE(S);return !!e&&e.id==19}; // hedef değiştirenlerden SON oynanan geçerli
function tg(S){const e=tgE(S);return e&&e.id<19?{8:27,9:24,10:17,11:15}[e.id]:21}
function outc(S,p){ // p açısından: 1 kazan, 0 berabere, -1 kaybet
  const a=total(S,p),b=total(S,1-p),T=tg(S);
  if(lowW(S))return Math.sign(b-a);
  if(a>T&&b>T)return 0;if(a>T)return -1;if(b>T)return 1;return Math.sign(a-b);
}
const canDraw=(S,p)=>S.deck.length>0&&!S.eff.some(e=>e.id==23&&!e.neg&&e.o!=p);
function opts(S,p,k){
  if(k=='my')return S.pl[p].open.map(c=>c.id);
  if(k=='opp')return S.pl[1-p].open.map(c=>c.id);
  if(k=='any')return S.pl.flatMap(x=>[...x.open,...x.closed]).map(c=>c.id);
  if(k=='eff')return S.eff.filter(e=>!e.neg&&BLOCK.has(e.id)).map(e=>e.uid);
  if(k=='sign')return [1,-1];
}
const playable=(S,p,id)=>S.jUsed[p]<2&&!S.noJ[p]&&S.hand[p].includes(id)&&(NEED[id]||[]).every(k=>opts(S,p,k).length)&&(id!=5||S.deck.length>0);
function play(S,p,id,pk){
  const q=1-p;
  const find=cid=>{for(const x of S.pl)for(const z of ['open','closed']){const i=x[z].findIndex(c=>c.id==cid);if(i>=0)return[x[z],i]}};
  const take=cid=>{const[a,i]=find(cid);return a.splice(i,1)[0]};
  S.hand[p].splice(S.hand[p].indexOf(id),1);S.used=(S.used||[]).concat(id);(S.dj=S.dj||[]).push(id);S.jUsed[p]++;
  const uid=++S.u;(S.pj=S.pj||[]).push({id,o:p,uid});
  if(BLOCK.has(id))S.eff.push({id,o:p,uid,neg:false,s:pk[0]});
  if(id==5)S.pl[q].open.push(S.deck.pop());
  if(id==6||id==7){const[a,i]=find(pk[0]);a[i].o=id==6?0:12}
  if(id==12)S.eff.find(e=>e.uid==pk[0]).neg=true;
  if(id==13||id==14)(S.dead=S.dead||[]).push(take(pk[0]));
  if(id==15){const[a,i]=find(pk[0]),[b,k]=find(pk[1]);[a[i],b[k]]=[b[k],a[i]]}
  if(id==16)[S.pl[0].closed,S.pl[1].closed]=[S.pl[1].closed,S.pl[0].closed];
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
  const doPass=()=>{if(T.turns>0&&!T.acted)return true;(T.pa=T.pa||[0,0])[actor]++;T.turns++;T.acted=false;T.turn=1-T.turn;actor=T.turn;n=0;return false};
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
    top.forEach((c,i)=>{const T=clone(W);const j0=T.jUsed.slice();const r=rollout(T,p,c.a,RP);sum[i]+=r-cost*((T.jUsed[p]-j0[p])-.5*(T.jUsed[1-p]-j0[1-p]))});
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
    while(k<K&&now()-t1<20){const W=world(S,p,prm);top.forEach((c,i)=>{const T=clone(W),j0=T.jUsed.slice(),r=rollout(T,p,c.a,RP);sum[i]+=r-cost*((T.jUsed[p]-j0[p])-.5*(T.jUsed[1-p]-j0[1-p]))});k++}
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
  const think=r=>{thinkOn=true;R();talk('think',1,.55);R();const d=rnd(r);plan=null;const my=++pid;
    // karar, düşünme süresinin başında hesaplanır; hamle anında ekran donmaz
    setTimeout(()=>{if(gen!=botGen||S!=G||S.turn!=1||S.over)return;if(n++>=8){plan={a:null};return}
      const ok=a=>{if(my==pid&&gen==botGen&&S==G&&S.turn==1&&!S.over)plan={a}};
      if(prm.mc)decideHA(S,1,prm,ok);else ok(decide(S,1,prm))},Math.min(400,d*.15));
    setTimeout(step,d)};
  const step=()=>{
    if(gen!=botGen||S!=G)return;
    if(S.turn!=1||S.over){thinkOn=false;return}
    if(lock){held=1;return setTimeout(step,150)} // menü/pencere açık: oyun bekler
    if(held){held=0;return setTimeout(step,700)} // kapanınca kısa bir nefes payı
    thinkOn=false;
    const a=plan?plan.a:(n++<8?(prm.mc?decideH:decide)(S,1,prm.mc?{...prm,K:90,ms:400}:prm):null);plan=null;pid++;
    if(!a){R();return pass()}
    S.acted=true;
    if(a.t=='d'){const c=S.deck.pop();S.pl[1].open.push(c);S.log.push({p:1,t:`kart çekti (${c.n})`});R();talk('draw',0,.3);think(AFTER[DIFF])}
    else{play(S,1,a.id,a.pk);S.log.push({p:1,t:`joker oynadı: ${J[a.id]}`});note(1,a.id,()=>{R();think(AFTER[DIFF])})}
  };
  think(THINK[DIFF]);
}

/* ---------- AKIŞ ---------- */
function pass(){
  const S=G;S.log.push({p:S.turn,t:'pas dedi'});if(S.turn==1)talk('pass',0,.35);
  if(S.turns>0&&!S.acted)return endRound();
  (S.pa=S.pa||[0,0])[S.turn]++;S.turns++;S.acted=false;S.turn=1-S.turn;R();next();
}
function next(){if(MODE=='bot'&&G.turn==1&&!lock&&!G.over)bot()}
function M(html,btn,cb,end){lock=true;$('#mb').innerHTML=html+(btn?`<br><br><button id="mo" class="btn">${btn}</button>`:end?'':'<br><i>Oda sahibinin devam etmesi bekleniyor…</i>')+(end?'<br><br><button id="mx" class="btn alt">Ana menüye dön</button>':'');$('#m').hidden=false;
  if(end&&$('#mb .dice'))$('#mx').style.visibility='hidden'; // zar atılmadan sonuç sızmasın
  anim();
  if(btn)$('#mo').onclick=()=>{$('#m').hidden=true;lock=false;cb()};
  if(end)$('#mx').onclick=exitGame}
function MM(fn,btn,cb,sd,end){if(MODE=='host'&&conn&&conn.open)conn.send({k:'m',html:fn(1),sd:sd&&sd(1),end});M(fn(0),btn,cb,end);snd(sd&&sd(0))}
const PROF=(()=>{try{const o=JSON.parse(LS('prof')||'null');if(o&&Array.isArray(o.p)&&o.p.length==19)return o}catch(e){}return{n:0,p:new Array(19).fill(0)}})(); // oyuncunun pas geçtiği toplamlar (hedefe uzaklık) bu cihazda saklanır
function profRec(S,tot,T){if(lowW(S)||!S.pa||!(S.pa[0]>0))return;const d=Math.max(-6,Math.min(12,T-tot));PROF.p[d+6]++;PROF.n++;LS('prof',JSON.stringify(PROF))}

/* ---------- İMKANSIZ BOT: oynadığı oyunlardan öğrenir (bu cihazda saklanır) ----------
   1) Oyuncu modeli: oyuncu hedefe ne kadar uzaktayken kart çekiyor / pas geçiyor, ne sıklıkla joker oynuyor.
      Bot, hamle seçerken oyuncunun cevabını kendi gibi değil, bu öğrendiği alışkanlıklarla simüle eder.
   2) Ayar seçimi: birkaç farklı oyun tarzı (risk, joker maliyeti, rakip tahmini) denenir; oyuncuya karşı
      en çok tur kazandıran tarz zamanla daha sık seçilir (UCB). */
const ARMS=[{},{jc:.05,jl:.02},{jc:.18,jl:.1},{beta:.4,gap:6},{beta:1,gap:8},{dm:.05},{rjp:.45},{rjp:.95}];
const LRN=(()=>{try{const o=JSON.parse(LS('lrn')||'null');if(o&&o.v==1&&Array.isArray(o.dp)&&o.dp.length==19&&Array.isArray(o.arm)&&o.arm.length==ARMS.length)return o}catch(e){}return lrnNew()})();
function lrnNew(){return{v:1,dp:Array.from({length:19},()=>[0,0]),ht:0,hj:0,jp:{},arm:ARMS.map(()=>[0,0]),cur:0,g:[0,0],r:[0,0,0]}}
const lrnSave=()=>LS('lrn',JSON.stringify(LRN)),learning=()=>MODE=='bot'&&DIFF=='imp';
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
function endRound(){
  const S=G,a=[total(S,0),total(S,1)],T=tg(S),r=outc(S,0);
  if(MODE=='bot'){profRec(S,a[0],T);lrnRound(r)}
  S.pts[0]+=r>0?1:r==0?.5:0;S.pts[1]+=r<0?1:r==0?.5:0;S.rounds++;S.res.push(r);S.wait=true;S.rev=true;
  const pre=v=>{const w=v?-r:r;return `Kapalı kartlar açıldı.<br>Sen: ${a[v]} · Rakip: ${a[1-v]} · Hedef: ${T}${lowW(S)?' (en düşük kazanır)':''}<br><b>${w>0?'Turu sen kazandın':w<0?'Turu rakip kazandı':'Tur berabere'}</b>`};
  R();snd('flip');lock=true; // kapalı kartlar çevrilir, sonra sonuç penceresi açılır
  setTimeout(()=>{if(S!==G)return;lock=false;fin()},1700);
  function fin(){
    if(MODE=='bot'){const Tg=tg(S);talk(r==0?'tie':r<0?'win':(a[1]>Tg&&!lowW(S)?'bust':'lose'),2);R()}
    if(!(S.pts.some(x=>x>=2)||S.rounds>=3)){
      if(r==0)[0,1].forEach(p=>S.jdeck.length&&S.hand[p].push(S.jdeck.pop()));
      return MM(v=>pre(v)+(r==0?'<br>Tur berabere bitti, ikiniz de birer joker çektiniz.':''),'Sonraki tur',()=>{deal(S);R();next()},v=>{const w=v?-r:r;return w>0?'win':w<0?'lose':'ok'});
    }
    let L=S.pts[0]<S.pts[1]?0:S.pts[1]<S.pts[0]?1:-1,hx=null,how='';
    if(L<0){
      const j=S.hand.map(h=>h.length);
      if(j[0]!=j[1]){L=j[0]<j[1]?0:1;how='joker'}
      else{let x,y;do{x=d6()+d6();y=d6()+d6()}while(x==y);L=x<y?0:1;hx=[x,y];how='zar'}
    }
    const th=TH[Math.min(S.bo,3)],d1=d6(),d2=d6(),roll=d1+d2,surv=roll>th;
    const mk=(v,d1,d2,surv)=>{const roll=d1+d2;return pre(v)+`<hr>Düelloyu ${L==v?'rakip kazandı':'sen kazandın'}${how=='joker'?' (joker sayısına göre)':how=='zar'?` (beraberlik zarı: ${hx[v]}–${hx[1-v]})`:''}.<br>Ölüm zarlarını ${L==v?'sen atıyorsun':'rakip atıyor'}: hayatta kalmak için ${th}'${EK[th]} büyük gelmeli.<div class="dice" data-a="${d1}" data-b="${d2}" data-m="${L==v?1:0}" data-s="${surv?'ok':L==v?'death':'win'}"></div>${L==v?'<button id="rl" class="btn">Ölüm zarını at</button>':''}<div class="after"><b>Toplam: ${roll}</b><br>`+(surv?(L==v?'Hayatta kaldın.':'Rakip hayatta kaldı.'):`<b>${L==v?'Öldün. Oyunu rakip kazandı.':'Rakip öldü. Oyunu sen kazandın!'}</b>`)+'</div>'};
    const full=v=>mk(v,d1,d2,surv),rig=MODE=='bot'&&DIFF=='imp'&&L==1&&!surv&&!S.rigDone; // sahne oyun başına bir kez; ikinci ölümde gerçekten ölür
    if(surv||rig){const n=S.bo+2,ek=['a','e','ye','e','e','e','ya','ye','e','a'][n%10];
      const lb=`Düello ${n}'${ek} geç`,go=()=>{S.bo++;(S.mast=S.mast||[0,0])[L]=(S.mast[L]|0)+1;newBO3(S);deal(S);talk(L==0?'surv0':'surv1',2);R();next()};
      if(rig){S.rigDone=true;impSave(mk(0,d1,d2,false),()=>M(mk(0,6,6,true),lb,go))}else MM(full,lb,go)}
    else{S.over=true;lrnGame(L==0);MM(full,'Yeniden oyna',start,null,true)}
  }
}
function cutscene(txt,done){ // BİLİNMEYEN: ikonu ve konuşma balonu
  lock=true;const el=document.createElement('div');el.id='cs';
  el.innerHTML=`<div class="bub"><span></span></div><img src="${AV.u}" alt="">`;document.body.appendChild(el);
  try{snd('stamp');vib([200,80,400])}catch(e){}
  const sp=el.querySelector('span');let i=0,end=false,tm=null;
  const out=()=>{if(end)return;end=true;clearInterval(tm);el.remove();done()};
  setTimeout(()=>{tm=setInterval(()=>{sp.textContent=txt.slice(0,++i);if(i>=txt.length){clearInterval(tm);setTimeout(out,2800)}},48)},500);
  el.onclick=()=>{if(i<txt.length){i=txt.length;clearInterval(tm);sp.textContent=txt;setTimeout(out,2200)}else out()};
}
function impSave(html,cont){ // BİLİNMEYEN ölecekken: zar düşer, sahne girer, zar yeniden atılır (6-6)
  M(html,'.',()=>{});$('#mb').classList.add('rig');
  const d=document.querySelector('#mb .dice');let n=0;
  const w=setInterval(()=>{if(!d||!d.isConnected||++n>600){clearInterval(w);return}
    if(d.classList.contains('fin')){clearInterval(w);setTimeout(()=>cutscene('Bu kadar kolay olacağını mı sandın? Bu oyunun yaratıcısı benim.',()=>{$('#mb').classList.remove('rig');cont()}),1000)}},120);
}
let entering=false;
function veil(ms=2000){const v=document.createElement('div');v.className='veil';v.style.animationDuration=ms+'ms';v.style.setProperty('--ms',ms*.9+'ms');v.innerHTML=`<img alt="" src="${IMG.logo}"><b>limbigames</b><span class="ldb"><i></i></span>`;document.body.appendChild(v);setTimeout(()=>v.remove(),ms+100)}
function enter(fn){if(entering)return;entering=true;veil();setMusic('game');setTimeout(()=>{$('#menu').hidden=true;entering=false;fn()},1700)}
function start(){hiPreload();setMusic('game');try{document.body.classList.remove('dead')}catch(e){}G={u:0,bo:0,log:[],over:false,used:[],av:Math.random()<.5?['t','c']:['c','t'],mast:[0,0]};prevAv[0]=prevAv[1]=undefined;newBO3(G);deal(G);if(learning())armPick();sayT='';sayAt=0;botGen++;thinkOn=false;talk('hello',2);R();next()}

/* ---------- ARAYÜZ ---------- */
const cand=()=>P?opts(G,0,P.ks[P.pk.length]):[];
let prevT=false,lastLk='',flipId=null,lastTot=[0,0],lastBust=false,prevSeal='',sayT='';
const NAMES={t:'Tüccar',c:'Yozlaşmış Tüccar',m:'Ölümün Efendisi',u:'BİLİNMEYEN'};
const avKey=(S,p)=>MODE=='bot'?(p==1?{easy:'t',med:'c',hard:'m',imp:'u'}[DIFF]:(S.mast&&S.mast[0]>=2?'m':S.mast&&S.mast[0]>=1?'c':'t')):(S.mast&&S.mast[p]?'m':(S.av&&S.av[p])||'t');
const avSrc=k=>k?AV[k]:IMG.bn,oppName=()=>NAMES[avKey(G,1)]||'Rakip';
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
function cast(p,id,cb){ // joker sahnede büyür ve Kapat'a basılana kadar kalır
  if(lock){setTimeout(()=>{if(G)cast(p,id,cb)},250);return} // menü/pencere açıkken bildirim gelmez, kapanınca gelir
  snd('play');
  if(p==0){if(DES.has(id)){shake();snd('stamp');vib(60)}cb&&cb();return} // kendi jokerimizin bildirimi yok, yalnızca rakibinki
  lock=true;
  const who=(MODE=='bot'?oppName():'Rakip')+' oynadı';
  const el=document.createElement('div');el.id='cast';el.className='from'+p;
  el.innerHTML=`<img src="${IMG.j[id]}" alt=""><button class="btn">Kapat</button>`;
  document.body.appendChild(el);const oz=document.querySelector('#opp');if(oz&&oz.getBoundingClientRect){const r=oz.getBoundingClientRect();el.style.setProperty('--sy',Math.round(r.top+r.height/2-innerHeight/2)+'px')}hi(el.querySelector('img'),id);
  el.onclick=()=>{if(!el.isConnected)return;el.remove();lock=false;if(DES.has(id)){shake();snd('stamp');vib(60)}if(MODE=='bot'&&p==1){talk(jCat(id),1,.85);R()}cb&&cb()};
}
function count(el,a,b){if(!el)return;if(a==b||RM||typeof requestAnimationFrame=='undefined'){el.textContent=b;return}const t0=performance.now(),f=n=>{const x=Math.min(1,(n-t0)/450);el.textContent=Math.round(a+(b-a)*x*(2-x));if(x<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function fly(){ // yeni kartlar desteden uçarak gelir
  const d=$('#deck');if(!d||!d.getBoundingClientRect)return;const dr=d.getBoundingClientRect();let i=0;const F=FIT||1;
  document.querySelectorAll('.fresh').forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--dx',(dr.left-r.left+(dr.width-r.width)/2)/F+'px');el.style.setProperty('--dy',(dr.top-r.top+(dr.height-r.height)/2)/F+'px');el.style.animationDelay=(i++*.13)+'s'});
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
  fitQ=0;const m=document.querySelector('main');if(!m)return;
  const pr=document.querySelector('#prompt'),sig=[innerWidth,innerHeight,m.getElementsByTagName('*').length,sayT.length,thinkOn?1:0,pr?pr.textContent.length:0,G&&G.turn,G?G.bo+':'+G.rounds+':'+(G.rev?1:0):''].join();
  if(sig==fitSig)return;fitSig=sig;
  const css=['transform','transformOrigin','width','maxWidth','marginLeft','marginRight','minHeight','height'];
  const reset=()=>css.forEach(k=>m.style[k]='');
  reset();FIT=1;document.documentElement.classList.remove('fit');
  if(innerWidth>700)return;
  const kids=[...m.children].filter(e=>e.offsetHeight&&getComputedStyle(e).position!='fixed');
  const bot=()=>Math.max(...kids.map(e=>{const cs=e.id=='hand'?[...e.children]:[];return cs.length?Math.max(...cs.map(c=>c.getBoundingClientRect().bottom)):e.getBoundingClientRect().bottom})); // içeriğin gerçek alt kenarı (main'in boş alt dolgusu sayılmaz)
  m.style.minHeight='0';m.style.height='auto';
  const r0=m.getBoundingClientRect(),w=r0.width,top=r0.top,av=innerHeight-2;
  const nat=bot()-top; // ölçeksiz içerik yüksekliği
  if(top+nat<=av+1){m.style.minHeight='';m.style.height='';fitK=0;return}
  const put=k=>{FIT=k;m.style.maxWidth='none';m.style.width=(w/k)+'px';m.style.marginLeft='0';m.style.marginRight='0';
    m.style.transformOrigin='0 0';m.style.transform=`scale(${k})`;m.style.height='auto';m.style.minHeight='0'};
  const key=G?G.bo+':'+G.rounds+':'+(G.rev?1:0):''; // ölçek tur boyunca sabit; kartlar sarkarsa bir kez küçülür, yeni turda eski haline döner
  let k=Math.max(.45,Math.min(1,(av-top)/nat));
  if(key==fitKey&&fitK)k=Math.min(k,fitK); // aynı tur içinde ekran büyüyüp küçülüp zıplamasın
  for(let i=0;i<4;i++){ // genişlik değişince satırlar kayabilir; alt kenar ekrana oturana kadar birkaç kez düzelt
    put(k);const vb=bot();
    if(Math.abs(vb-av)<=1||k<=.45&&vb>av)break;
    const kn=Math.max(.45,Math.min(1,k*(av-top)/(vb-top)));
    if(Math.abs(kn-k)<.002)break;k=kn;
  }
  if(key==fitKey&&fitK&&FIT>fitK+.003)put(fitK);
  fitK=FIT;fitKey=key;
  document.documentElement.classList.add('fit');
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
  const sk=TH.map((t,i)=>`<span class="sk${i<bi?' past':i==bi?' cur':''}" title="Ölüm eşiği: ${t}'${EK[t]} büyük atmalısın">${IC.skull}<small>${t}</small></span>`).join('');
  setH('#hdr',`<div class="hs sks">${sk}</div><div class="hc"><span class="lab">Düello ${S.bo+1}</span><span class="pips">${pips}</span></div><div class="hg"><button class="gear" data-g="1" aria-label="Ayarlar">${IC.gear}<span>MENÜ</span></button></div>`);
  const my=S.turn==0&&!lock&&!S.wait,mt=total(S,0),ot=total(S,1,false),bust=!low&&mt>T,seal=T+(low?'L':'');
  const jp=n=>`<span class="jpips" title="Joker hakkı ${n}/2">${[0,1].map(i=>`<i${i<n?' class="on"':''}></i>`).join('')}</span>`;
  const avh=p=>{const k=avKey(S,p),now=performance.now();if(prevAv[p]!==undefined&&prevAv[p]!==k)morphT[p]=now;prevAv[p]=k;
    const el=(now-morphT[p])/1000,mo=morphT[p]&&el<1.1;return `<img class="av${mo?' morph':''}" data-av="${p}"${mo?` style="animation-delay:-${el.toFixed(2)}s"`:''} src="${avSrc(k)}" alt="">`};
  const av0=avh(0),av1=avh(1);
  $('#opp').className='zone'+(S.turn==1&&!S.wait?' act':'');
  setH('#opp',`<div class="who">${av1}<div class="nm"><b>${MODE=='bot'||S.av?oppName():'Rakip'}</b><span class="meta">${MODE=='bot'?IC.dif.repeat(DN[DIFF]):'Online'}${jp(2-S.jUsed[1])}</span></div><span class="jbs">${S.hand[1].map(()=>`<img class="jb" src="${IMG.bj}" alt="">`).join('')}</span><div class="tot"><small>Toplam</small><div class="tl"><b>${lastTot[1]}</b>${S.rev?'':'<i class="pq">+</i><i class="pq">?</i>'}</div></div></div><div class="sayrow">${sayT?`<span class="say">${sayT}</span>`:''}</div><div class="cards">${S.pl[1].open.map(c=>cd(c)).join('')}${S.pl[1].closed.map(c=>cd(c,!S.rev,S.rev)).join('')}</div>`);
  const chip=x=>{const e=S.eff.find(y=>y.uid==x.uid)||x;return `<img class="e${BLOCK.has(e.id)?'':' used'}${e.neg?' neg':''}${e.o==0?' mine':' opp'}${seenE.has(e.uid)?'':' newc'}${k=='eff'&&cn.includes(e.uid)?' hl':''}" data-e="${e.uid}" src="${IMG.j[e.id]}" alt="">`};
  $('#deck b').textContent=S.deck.length;
  setH('#jo',(S.pj||[]).filter(x=>x.o==1).map(chip).join(''));
  setH('#jm',(S.pj||[]).filter(x=>x.o==0).map(chip).join(''));
  const sl=$('#seal'),sc=(T!=21||low?' alt':'')+(low?' low':'');
  if(!sl._o){sl._o=1;sl.addEventListener('animationend',()=>sl.classList.remove('stamp'))}
  if(sl._c!==sc){sl._c=sc;sl.className='seal'+sc+(sl.classList.contains('stamp')?' stamp':'')}
  setH('#seal',`<b>${low?'En az':T}</b>`);
  if(prevSeal&&prevSeal!=seal){sl.classList.remove('stamp');void sl.offsetWidth;sl.classList.add('stamp')}
  $('#arr').className='arr '+(S.wait||S.over?'off':S.turn==0?'me':'op');
  $('#me').className='zone'+(my?' act':'');
  setH('#me',`<div class="who">${av0}<div class="nm"><b>Sen</b><span class="meta">${jp(2-S.jUsed[0])}</span></div><div class="tot${bust?' bust':''}"><small>${bust?'Battın':'Toplamın'}</small><b>${lastTot[0]}</b></div></div><div class="cards">${S.pl[0].open.map(c=>cd(c)).join('')}<span class="gap"></span>${S.pl[0].closed.map(c=>cd(c,!(S.rev||peek.has(c.id)),S.rev||c.id==flipId,1)).join('')}</div>`);
  $('#prompt').className=P?'ask':'';
  setH('#prompt',P?`${J[P.id]}: ${KTXT[k]} ${k=='sign'?'<button class="btn sm" data-s="1">Ekle</button><button class="btn sm" data-s="-1">Çıkar</button>':''}<button class="btn sm alt" data-x="1">Vazgeç</button>`:'');
  const ends=S.turns>0&&!S.acted; // şimdi pas dersem tur biter
  $('#draw').disabled=!(my&&!P&&canDraw(S,0));$('#pass').disabled=!(my&&!P);
  $('#pass').textContent=ends?'Turu bitir':'Pas';$('#pass').className='btn sm'+(ends?'':' alt');
  const n=S.hand[0].length;
  setH('#hand',S.hand[0].map((id,i)=>`<img class="j${my&&!P&&playable(S,0,id)?'':' dim'}" style="--r:${((i-(n-1)/2)*5).toFixed(1)}deg" data-j="${id}" src="${IMG.j[id]}" alt="">`).join(''));
  count(document.querySelector('#me .tot b'),lastTot[0],mt);count(document.querySelector('#opp .tot b'),lastTot[1],ot);lastTot=[mt,ot];
  (S.pj||[]).forEach(e=>seenE.add(e.uid));S.hand[0].forEach(id=>hiLoad(id));
  if(prevSeal&&prevSeal!=seal)snd('stamp');prevSeal=seal;
  if(bust&&!lastBust){snd('bust');shake();vib(120)}lastBust=bust;
  if(fresh)snd('draw');
  const mt0=S.turn==0&&!S.wait;if(mt0&&!prevT)snd('turn');prevT=mt0;
  const last=S.log[S.log.length-1],lk=S.log.length+JSON.stringify(last);if(lk!=lastLk){lastLk=lk;if(last&&last.t=='pas dedi')snd('pass')}
  fly();flipId=null;
  if(MODE=='host'&&conn&&conn.open)conn.send({k:'s',v:view(G)});
}
function doPlay(id,pk){const S=G;P=null;if(MODE=='guest'){conn.send({k:'play',id,pk});return R()}lrnAct(S,'j',id);play(S,0,id,pk);S.acted=true;S.log.push({p:0,t:`joker oynadı: ${J[id]}`});note(0,id,()=>{if(MODE=='bot')talk('react',1,.5);R()})}
function pick(v){P.pk.push(v);if(P.pk.length==P.ks.length)doPlay(P.id,P.pk);else R()}
function startJoker(id){const ks=NEED[id]||[];if(ks.length){P={id,ks,pk:[]};R()}else doPlay(id,[])}
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
const numHD=n=>cb=>{const cs=[`img/n/${n}.webp`,`img/n/${n}.png`,`img/n/${n}.jpg`,`img/n${n}.png`,`n${n}.png`];if(typeof HDN!='undefined'&&HDN[n])cs.unshift(HDN[n]);hq('n'+n,cs,cb)};
const backHD=cb=>hq('bk',[...(typeof HDBK!='undefined'?[HDBK]:[]),'img/back.webp','img/back.png','img/n/back.png','img/n/back.webp','back.png'],cb);
function zoomAv(p){const S=G,k=avKey(S,p),nm=NAMES[k]||(p?'Rakip':'Sen');
  zoom({src:avSrc(k),cls:'sq',cap:nm,sub:p==0?'Sen':'Rakip',hd:cb=>{const cs=[];if(typeof HDAV!='undefined'&&HDAV[k])cs.push(HDAV[k]);cs.push(`img/av/${k}.webp`,`img/av/${k}.png`,`img/${k}.png`);hq('av'+k+(typeof HDAV!='undefined'?1:0),cs,cb)}})}
function zoomCard(id){const S=G;let f=null;
  for(const p of [0,1])for(const kd of ['open','closed']){const c=S.pl[p][kd].find(x=>x.id==id);if(c)f={c,p,closed:kd=='closed'}}
  if(!f)return;const {c,p,closed}=f,own=p==0,up=!closed||S.rev||(own&&peek.has(id)); // kart yüzü açık mı?
  if(!up){ // kapalı kart: arka yüzü
    return zoom({src:IMG.bn,cls:'card',cap:own?'Senin kapalı kartın':'Rakibin kapalı kartı',hd:backHD,
      btn:own&&!S.rev?'Kartıma bak':'',fn:()=>{peek.add(id);flipId=id;R();setTimeout(()=>zoomCard(id),80)}})}
  const val=c.o!=null?c.o:c.n;
  zoom({src:IMG.n[c.n],cls:'card',cap:`${val}`,hd:numHD(c.n),
    sub:(closed?(own?'Senin kapalı kartın':'Rakibin kapalı kartı'):(own?'Senin açık kartın':'Rakibin açık kartı'))+(c.o!=null?` (joker etkisiyle ${c.o} sayılıyor, kartın aslı ${c.n})`:''),
    btn:closed&&own&&!S.rev?'Kartımı gizle':'',fn:()=>{peek.delete(id);R()}})}
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
<p class="gd"><b>Sıranda:</b> istediğin kadar <b>Kart çek</b> diyebilir (çekilen kart açık gelir), tur başına en fazla 2 joker oynayabilir, sonra <b>Pas</b> dersin. Orta kutudaki ok, sıranın kimde olduğunu gösterir.</p>
<p class="gd"><b>Turun bitmesi:</b> sırası gelen oyuncu kart çekmeden ve joker oynamadan pas derse tur biter ve kapalı kartlar açılır (oyunun ilk sırası hariç). Böyle bir durumda Pas düğmesi <b>Turu bitir</b> olur.</p>
<p class="gd"><b>Düello:</b> 3 turluk bir düellodur (galibiyet 1, beraberlik yarım puan). Kaybeden iki zar atar, toplam eşikten büyük değilse ölür. Eşikler 4, 6, 8 ve 10'dur, her yeni düelloda yükselir. Puanlar eşitse elinde daha az joker kalan kaybeder, o da eşitse zar karar verir. Berabere biten turda ikiniz de birer joker çekersiniz.</p>
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
  box(`<h3>Ayarlar</h3><label>Müzik<input type="range" id="sm" min="0" max="1" step=".05" value="${VM}"></label><label>Efektler<input type="range" id="ss" min="0" max="1" step=".05" value="${VS}"></label><label class="chk"><input type="checkbox" id="sr" ${RM?'checked':''}> Hareketi azalt</label><label class="chk"><input type="checkbox" id="sv" ${VB?'checked':''}> Titreşim</label><div class="row"><button class="btn alt sm" id="sk">Joker Kodeksi</button><button class="btn alt sm" id="sg">Nasıl oynanır</button></div><p class="mem">İmkansız bot: ${LRN.ht} hamle, ${LRN.r[0]+LRN.r[1]+LRN.r[2]} tur ve ${LRN.g[1]} oyundan öğrendi${LRN.r[0]+LRN.r[1]+LRN.r[2]>0?` · tur kazanma %${Math.round(100*(LRN.r[0]+LRN.r[2]/2)/(LRN.r[0]+LRN.r[1]+LRN.r[2]))}`:''}</p><div class="row"><button class="btn sm" id="sz">Bot hafızasını sıfırla</button></div>${inGame?`<div class="row">${MODE=='bot'?'<button class="btn alt sm" id="sa">Tekrar oyna</button>':''}</div><div class="row"><button class="btn alt sm" id="sx">Oyundan çık</button></div>`:''}`);
  $('#sm').oninput=e=>{VM=+e.target.value;LS('vm',VM);ac();MG.gain.value=VM*.8;if(FILE&&mel)mel.volume=Math.min(1,VM*.8)};
  $('#ss').oninput=e=>{VS=+e.target.value;LS('vs',VS);ac();SG.gain.value=VS};$('#ss').onchange=()=>snd('draw');
  $('#sr').onchange=e=>{RM=e.target.checked;LS('rm',RM?1:0);document.body.classList.toggle('rm',RM)};
  $('#sv').onchange=e=>{VB=e.target.checked;LS('vb',VB?1:0)};
  $('#sk').onclick=codex;$('#sg').onclick=guide;
  $('#sz').onclick=()=>{if(confirm('İmkansız botun öğrendikleri silinsin mi?')){Object.assign(LRN,lrnNew());PROF.n=0;PROF.p.fill(0);lrnSave();LS('prof',JSON.stringify(PROF));settings()}};
  if($('#sa'))$('#sa').onclick=()=>{ // aynı botla baştan başla, mevcut oyun iptal
    botGen++;thinkOn=false;const c=$('#cast');if(c)c.remove();$('#m').hidden=true;lock=false;P=null;
    G.over=true;start()};
  if($('#sx'))$('#sx').onclick=exitGame;
}
let leaving=false;
function peerLeft(msg){ // rakip çıktı: ana menüye ASLA doğrudan atma, yalnızca "Ana menüye dön" ile limbigames perdesi üzerinden gidilir
  if(leaving)return;
  try{conn=null}catch(e){}
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
    try{if(conn)conn.close()}catch(e){}try{if(peer)peer.destroy()}catch(e){}conn=null;peer=null;waitM=false;
    if(G)G.over=true;G=null;MODE='bot';sayT='';try{document.body.classList.remove('dead')}catch(e){}
    st('');$('#menu').hidden=false;lock=false;entering=false;setMusic('menu');
  },1700);
}
document.addEventListener('click',e=>{
  const S=G,t=e.target.closest&&e.target.closest('[data-c],[data-e],[data-j],[data-s],[data-x],[data-g],[data-av]');
  if(lock||!t)return;
  if(t.dataset.g)return settings();
  if(!S||S.over)return;
  const k=P&&P.ks[P.pk.length],c=+t.dataset.c,u=+t.dataset.e;
  if(t.dataset.x){P=null;return R()}
  if(t.dataset.s)return pick(+t.dataset.s);
  if(P){ // hedef seçimi
    if(t.dataset.c&&k!='eff'&&opts(S,0,k).includes(c))pick(c);
    else if(t.dataset.e&&k=='eff'&&opts(S,0,k).includes(u))pick(u);
    return;
  }
  if(t.dataset.av!=null&&!t.dataset.c)return zoomAv(+t.dataset.av);
  if(t.dataset.c&&!t.dataset.e&&!t.dataset.j)return zoomCard(c); // sayı kartı / kapalı kart büyük görünüm
  if(t.dataset.e){const x=S.eff.find(y=>y.uid==u)||(S.pj||[]).find(y=>y.uid==u);if(x)preview(x.id,false,`${x.o==0?'Senin jokerin':'Rakibin jokeri'}${x.neg?' (etkisiz kılındı)':''}${BLOCK.has(x.id)?'':' (anlık etki, kullanıldı)'}${x.id==22?(x.s>0?' (ekler)':' (çıkarır)'):''}`);return}
  if(t.dataset.j){const id=+t.dataset.j;preview(id,S.turn==0&&!S.wait&&playable(S,0,id))}
});
$('#draw').onclick=()=>{const S=G;if(S.turn||lock||P||!canDraw(S,0))return;if(MODE=='guest')return conn.send({k:'draw'});lrnAct(S,'d');const c=S.deck.pop();S.pl[0].open.push(c);S.acted=true;S.log.push({p:0,t:`kart çekti (${c.n})`});R()};
$('#pass').onclick=()=>{if(G.turn==0&&!lock&&!P){if(MODE=='guest')conn.send({k:'pass'});else{lrnAct(G,'p');pass()}}};

/* ---------- ONLINE (PeerJS) ---------- */
let MODE='bot',peer,conn,waitM=false;
function view(S){ // rakibe gidecek, gizli bilgisi temizlenmiş ve aynalanmış durum
  const f=a=>[a[1],a[0]];
  return {av:[S.av[1],S.av[0]],mast:[S.mast[1],S.mast[0]],turns:S.turns,acted:S.acted,bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:1-S.turn,pts:f(S.pts),rev:S.rev,res:(S.res||[]).map(x=>-x),jUsed:f(S.jUsed),noJ:f(S.noJ),
    hand:[S.hand[1],S.hand[0].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[S.pl[1],{open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:S.rev?c.n:0,o:S.rev?c.o:undefined}))}],
    eff:S.eff.map(e=>({...e,o:1-e.o})),pj:(S.pj||[]).map(e=>({...e,o:1-e.o})),log:S.log.slice(-6).map(l=>({...l,p:l.p<0?-1:1-l.p}))};
}
function note(p,id,cb){if(MODE=='host'&&conn&&conn.open){conn.send({k:'j',p:1-p,id});R()}cast(p,id,cb)}
function onGuest(m){ // host: misafirin hamle istekleri (doğrulanır)
  const S=G;if(!S||S.over||S.wait||S.turn!=1)return;
  if(m.k=='draw'){if(!canDraw(S,1))return;const c=S.deck.pop();S.pl[1].open.push(c);S.acted=true;S.log.push({p:1,t:`kart çekti (${c.n})`});R()}
  else if(m.k=='pass')pass();
  else if(m.k=='play'){
    const id=m.id,ks=NEED[id]||[],pk=m.pk||[];
    if(!playable(S,1,id)||pk.length!=ks.length||!ks.every((k,i)=>opts(S,1,k).includes(pk[i])))return;
    play(S,1,id,pk);S.acted=true;S.log.push({p:1,t:`joker oynadı: ${J[id]}`});note(1,id,R);
  }
}
function onHost(m){ // misafir: host'tan gelen durum/bildirimler
  if(m.k=='s'){G=m.v;if(!G.over){try{document.body.classList.remove('dead')}catch(e){}}if(waitM){$('#m').hidden=true;lock=false;waitM=false}if(G.turn!=0||G.wait)P=null;if(!$('#menu').hidden)setTimeout(()=>{$('#menu').hidden=true},1500);setMusic('game');R()}
  else if(m.k=='m'){waitM=true;M(m.html,null,null,m.end);snd(m.sd)}
  else if(m.k=='j')cast(m.p,m.id,R);
}
const st=t=>$('#st').textContent=t;
const NETERR=e=>({'network':1,'server-error':1,'socket-error':1,'socket-closed':1})[e.type]?'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.':e.type=='peer-unavailable'?'Oda bulunamadı':'Hata: '+e.type;
const noNet=()=>{if(typeof Peer=='undefined'||navigator.onLine===false){MODE='bot';st('Online mod için internet bağlantısı gerekli. Bilgisayara karşı oynayabilirsin.');return true}return false};
function hostRoom(){
  if(noNet())return;
  MODE='host';leaving=false;sayT='';const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
  peer=new Peer('necrodice-'+code);
  peer.on('open',()=>st('Oda kodu: '+code+' — rakip bekleniyor…'));
  peer.on('error',e=>{if(e.type=='unavailable-id'){peer.destroy();hostRoom()}else st(NETERR(e))});
  peer.on('connection',c=>{if(conn)return;conn=c;c.on('open',()=>enter(start));c.on('data',onGuest);c.on('close',()=>peerLeft('Rakip oyundan ayrıldı.'))});
}
function joinRoom(){
  if(noNet())return;
  const code=$('#code').value.trim().toUpperCase();if(!code)return st('Oda kodunu yaz');
  MODE='guest';leaving=false;sayT='';st('Bağlanılıyor…');peer=new Peer();
  peer.on('open',()=>{conn=peer.connect('necrodice-'+code,{reliable:true});conn.on('data',onHost);conn.on('open',()=>{st('Bağlandı, oyun başlıyor…');veil();setMusic('game')});conn.on('close',()=>peerLeft('Oda sahibi oyundan ayrıldı.'))});
  peer.on('error',e=>st(NETERR(e)));
}
const on=(id,f)=>{const e=document.querySelector(id);if(e)e.onclick=f}; // bir öğe yoksa diğer düğmeler yine de çalışır
document.querySelectorAll('.d').forEach(b=>b.onclick=()=>{DIFF=b.dataset.d;MODE='bot';enter(start)});
on('#b4',codex);on('#b5',guide);on('#b6',settings);
try{if(RM)document.body.classList.add('rm');if(!CRT)document.documentElement.classList.add('nocrt')}catch(e){}
try{$('#slogo').src=IMG.logo}catch(e){}setTimeout(()=>{const s=$('#splash');s&&s.remove()},2900);
on('#b2',hostRoom);on('#b3',joinRoom);
