// NECRODICE - motor + bot + arayüz (online mod için motor UI'dan ayrı tutuldu)
const $=s=>document.querySelector(s);
const TH=[4,6,8,10];
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
const MU={menu:['audio/menu.m4a'],game:['audio/game1.m4a','audio/game2.m4a']};
let curM='menu',mel=null,gi=Math.random()*2|0;
function playM(){
  if(!AC||!curM||(mel&&mel._m==curM))return;
  const old=mel,list=MU[curM],el=new Audio(),g=AC.createGain(),t=AC.currentTime;
  el._m=curM;el._g=g;el.preload='auto';el.loop=curM=='menu';
  el.src=curM=='game'?list[gi++%list.length]:list[0];
  el.onended=()=>{if(mel===el&&el._m=='game'){mel=null;playM()}}; // sıradaki parça
  try{AC.createMediaElementSource(el).connect(g)}catch(e){return}
  g.connect(MG);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+1.5);
  mel=el;el.play().catch(()=>{});
  if(old){const gt=AC.currentTime;old._g.gain.cancelScheduledValues(gt);old._g.gain.setValueAtTime(old._g.gain.value,gt);old._g.gain.linearRampToValueAtTime(0,gt+1.2);setTimeout(()=>{old.pause();old.src=''},1300)}
}
function setMusic(m){curM=m;playM()}
document.addEventListener('visibilitychange',()=>{if(!mel)return;if(document.hidden)mel.pause();else mel.play().catch(()=>{})});
/* Ses efektleri (wav): bir kez çözülüp bellekte tutulur */
const BUF={};
function loadSfx(){[['draw','kart_cekme'],['play','joker_oynama'],['info','joker_bilgi']].forEach(([k,f])=>fetch('audio/'+f+'.wav').then(r=>r.arrayBuffer()).then(b=>AC.decodeAudioData(b)).then(d=>{BUF[k]=d}).catch(()=>{}))}
function sfx(k,v=1){const s=AC.createBufferSource(),g=AC.createGain();s.buffer=BUF[k];g.gain.value=v;s.connect(g);g.connect(SG);s.start()}
/* Joker büyük görünümü: önce gömülü küçük görsel, yüksek çözünürlüklü img/j/ID.webp yüklenince değişir */
const HC={};
function hiLoad(id,cb){const u='img/j/'+id+'.webp';let i=HC[id];if(!i){i=HC[id]=new Image();i.src=u}if(cb){if(i.complete&&i.naturalWidth)cb(u);else i.addEventListener('load',()=>cb(u),{once:true})}}
function hi(el,id){if(el)hiLoad(id,u=>{if(el.isConnected)el.src=u})}
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
function anim(){ // ölüm zarı: kalp atışı, sallanma, durma
  const d=document.querySelector('#mb .dice');if(!d)return;
  const a=+d.dataset.a,b=+d.dataset.b,r=()=>1+Math.random()*6|0;d.innerHTML=die(r())+die(r());snd('heart');
  setTimeout(()=>{d.classList.add('roll');snd('dice');let n=0;const iv=setInterval(()=>{
    if(++n>=14){clearInterval(iv);d.innerHTML=die(a)+die(b);d.classList.remove('roll');d.classList.add('fin');snd(d.dataset.s);
      if(d.dataset.s=='death'){try{document.body.classList.add('dead')}catch(e){}vib([200,80,400])}else flash()}
    else d.innerHTML=die(r())+die(r())},90)},1700);
}

/* ---------- MOTOR ---------- */
function newBO3(S){S.jdeck=shuf(range(24));S.hand=[S.jdeck.splice(0,4),S.jdeck.splice(0,4)];S.pts=[0,0];S.rounds=0;S.res=[]}
function deal(S){
  S.deck=shuf(range(11).map(n=>({id:++S.u,n})));
  S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop()]}));
  S.eff=[];S.jUsed=[0,0];S.noJ=[false,false];S.acted=false;S.turns=0;
  S.turn=S.pl[0].open[0].n<S.pl[1].open[0].n?0:1;
  S.wait=false;S.rev=false;S.dead=[];S.pa=[0,0];S.log.push({p:-1,t:`— Tur ${S.rounds+1} —`},{p:S.turn,t:'başlıyor (küçük açık kart)'});
}
const act=(S,id)=>S.eff.some(e=>e.id==id&&!e.neg);
function total(S,p,wc=true){
  const f=(c,cl)=>{let v=c.o??c.n;if(act(S,1)&&v%2)v*=2;if(act(S,2)&&v%2==0)v/=2;if(cl){if(act(S,20))return 0;if(act(S,21))v*=2}return v};
  let t=0;S.pl[p].open.forEach(c=>t+=f(c,0));if(wc)S.pl[p].closed.forEach(c=>t+=f(c,1));
  S.eff.forEach(e=>{if(e.neg||e.o!=p)return;if(e.id==3)t+=5;if(e.id==4)t-=5;if(e.id==22)t+=e.s*S.deck.length});
  return t;
}
function tg(S){const e=S.eff.filter(e=>!e.neg&&e.id>=8&&e.id<=11).pop();return e?{8:27,9:24,10:17,11:15}[e.id]:21}
function outc(S,p){ // p açısından: 1 kazan, 0 berabere, -1 kaybet
  const a=total(S,p),b=total(S,1-p),T=tg(S);
  if(act(S,19))return Math.sign(b-a);
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
  S.hand[p].splice(S.hand[p].indexOf(id),1);S.used=(S.used||[]).concat(id);S.jUsed[p]++;
  if(BLOCK.has(id))S.eff.push({id,o:p,uid:++S.u,neg:false,s:pk[0]});
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
  med:{rand:.04,noise:.12,jc:.2,jp:1,dm:.03,depth:0},
  hard:{rand:0,noise:0,jc:.5,jl:.25,jp:1,dm:.02,depth:2,beta:0,gap:6}
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
function bot(){
  const S=G,prm=PR[DIFF];let n=0;
  const step=()=>{
    if(S.turn!=1||S.over)return;
    const a=n++<8?decide(S,1,prm):null;
    if(!a)return pass();
    S.acted=true;
    if(a.t=='d'){const c=S.deck.pop();S.pl[1].open.push(c);S.log.push({p:1,t:`kart çekti (${c.n})`});R();setTimeout(step,900)}
    else{play(S,1,a.id,a.pk);S.log.push({p:1,t:`joker oynadı: ${J[a.id]}`});note(1,a.id,()=>{R();setTimeout(step,400)})}
  };
  setTimeout(step,900);
}

/* ---------- AKIŞ ---------- */
function pass(){
  const S=G;S.log.push({p:S.turn,t:'pas dedi'});
  if(S.turns>0&&!S.acted)return endRound();
  (S.pa=S.pa||[0,0])[S.turn]++;S.turns++;S.acted=false;S.turn=1-S.turn;R();next();
}
function next(){if(MODE=='bot'&&G.turn==1&&!lock&&!G.over)bot()}
function M(html,btn,cb){lock=true;$('#mb').innerHTML=html+(btn?`<br><br><button id="mo" class="btn">${btn}</button>`:'<br><i>Host devam ettirecek…</i>');$('#m').hidden=false;anim();
  if(btn)$('#mo').onclick=()=>{$('#m').hidden=true;lock=false;cb()}}
function MM(fn,btn,cb,sd){if(MODE=='host'&&conn&&conn.open)conn.send({k:'m',html:fn(1),sd:sd&&sd(1)});M(fn(0),btn,cb);snd(sd&&sd(0))}
function endRound(){
  const S=G,a=[total(S,0),total(S,1)],T=tg(S),r=outc(S,0);
  S.pts[0]+=r>0?1:r==0?.5:0;S.pts[1]+=r<0?1:r==0?.5:0;S.rounds++;S.res.push(r);S.wait=true;S.rev=true;
  const pre=v=>{const w=v?-r:r;return `Kapalı kartlar açıldı.<br>Sen: ${a[v]} · Rakip: ${a[1-v]} · Hedef: ${T}${act(S,19)?' (en az kazanır)':''}<br><b>${w>0?'Turu sen kazandın':w<0?'Turu rakip kazandı':'Tur berabere'}</b>`};
  R();snd('flip');lock=true; // kapalı kartlar çevrilir, sonra sonuç penceresi açılır
  setTimeout(()=>{lock=false;fin()},1700);
  function fin(){
    if(MODE=='bot'&&r!=0)say(SAY[r<0?'win':'lose'][Math.random()*3|0]);
    if(!(S.pts.some(x=>x>=2)||S.rounds>=3)){
      if(r==0)[0,1].forEach(p=>S.jdeck.length&&S.hand[p].push(S.jdeck.pop()));
      return MM(v=>pre(v)+(r==0?'<br>Beraberlik: ikiniz de birer joker çektiniz.':''),'Sonraki tur',()=>{deal(S);R();next()},v=>{const w=v?-r:r;return w>0?'win':w<0?'lose':'ok'});
    }
    let L=S.pts[0]<S.pts[1]?0:S.pts[1]<S.pts[0]?1:-1,hx=null,how='';
    if(L<0){
      const j=S.hand.map(h=>h.length);
      if(j[0]!=j[1]){L=j[0]<j[1]?0:1;how='joker'}
      else{let x,y;do{x=d6()+d6();y=d6()+d6()}while(x==y);L=x<y?0:1;hx=[x,y];how='zar'}
    }
    const th=TH[Math.min(S.bo,3)],d1=d6(),d2=d6(),roll=d1+d2,surv=roll>th;
    const full=v=>pre(v)+`<hr>BO3'ü ${L==v?'rakip kazandı':'sen kazandın'}${how=='joker'?' (joker sayısı)':how=='zar'?` (zar ${hx[v]}–${hx[1-v]})`:''}.<br>${L==v?'Sen':'Rakip'} ölüm zarlarını atıyor (${th}'ten büyük olmalı)<div class="dice" data-a="${d1}" data-b="${d2}" data-s="${surv?'ok':L==v?'death':'win'}"></div><div class="after"><b>Toplam: ${roll}</b><br>`+(surv?`${L==v?'Sen':'Rakip'} hayatta kaldı.`:`<b>${L==v?'Sen öldün. Rakip oyunu kazandı.':'Rakip öldü. Sen oyunu kazandın!'}</b>`)+'</div>';
    if(surv)MM(full,'Yeni BO3',()=>{S.bo++;newBO3(S);deal(S);R();next()});
    else{S.over=true;MM(full,'Yeniden oyna',start)}
  }
}
function start(){setMusic('game');try{document.body.classList.remove('dead')}catch(e){}G={u:0,bo:0,log:[],over:false,used:[]};newBO3(G);deal(G);R();next()}

/* ---------- ARAYÜZ ---------- */
const cand=()=>P?opts(G,0,P.ks[P.pk.length]):[];
let prevT=false,lastLk='',flipId=null,lastTot=[0,0],lastBust=false,prevSeal='',sayT='';
const peek=new Set(),seen=new Set(),seenE=new Set(),DN={easy:1,med:2,hard:3},DES=new Set([13,14,17]);
const IC={
  skull:'<svg viewBox="0 0 24 24" class="ic"><path d="M12 2C7 2 4 5.5 4 10c0 3 1.5 4.5 3 5.5V20h10v-4.5c1.5-1 3-2.5 3-5.5 0-4.5-3-8-8-8z" fill="currentColor"/><circle cx="9" cy="11" r="2" fill="#091217"/><circle cx="15" cy="11" r="2" fill="#091217"/><path d="M10 20v-3m4 3v-3" stroke="#091217" stroke-width="1.5"/></svg>',
  gear:'<svg viewBox="0 0 24 24" class="ic"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="currentColor"/><circle cx="8" cy="17" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>'
};
const SAY={joker:['Cesaretin takdire şayan.','Kartlarım seni izliyor.','Henüz bitmedi.','Ruhun titriyor.'],win:['Ruhun benimdir.','Ölüm sabırlıdır.','Zarlar bana gülüyor.'],lose:['Bu kez şanslıydın.','Sıra yine bende.','Gülümse, fazla sürmez.']};
function say(t){sayT=t;R();setTimeout(()=>{if(sayT==t){sayT='';R()}},2800)}
function cast(p,id,cb){ // joker sahnede büyür, etkisi uygulanır, kendiliğinden kapanır
  snd('play');lock=true;
  const el=document.createElement('div');el.id='cast';el.className='from'+p;el.innerHTML=`<img src="${IMG.j[id]}" alt=""><b>${J[id]}</b>`;document.body.appendChild(el);hi(el.querySelector('img'),id);
  setTimeout(()=>{el.remove();lock=false;if(DES.has(id)){shake();snd('stamp');vib(60)}if(p==1&&MODE=='bot')say(SAY.joker[Math.random()*4|0]);cb&&cb()},RM?500:1500);
}
function count(el,a,b){if(!el)return;if(a==b||RM||typeof requestAnimationFrame=='undefined'){el.textContent=b;return}const t0=performance.now(),f=n=>{const x=Math.min(1,(n-t0)/450);el.textContent=Math.round(a+(b-a)*x*(2-x));if(x<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function fly(){ // yeni kartlar desteden uçarak gelir
  const d=$('#deck');if(!d||!d.getBoundingClientRect)return;const dr=d.getBoundingClientRect();let i=0;
  document.querySelectorAll('.fresh').forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--dx',(dr.left-r.left+(dr.width-r.width)/2)+'px');el.style.setProperty('--dy',(dr.top-r.top+(dr.height-r.height)/2)+'px');el.style.animationDelay=(i++*.13)+'s'});
}
function R(){
  const S=G,low=act(S,19),cn=cand(),k=P&&P.ks[P.pk.length],bi=Math.min(S.bo,3),T=tg(S),res=S.res||[];
  let fresh=0;
  const cd=(c,back,fl,pk)=>{const nf=!seen.has(c.id);if(nf)fresh++;seen.add(c.id);
    const f=(nf?' fresh':'')+(fl?' flip':'')+(cn.includes(c.id)?' hl':'')+(pk?' mc':''),a=`data-c="${c.id}"${pk?' data-pk="1"':''}${pk&&S.rev?' style="--fd:.6s"':''}`;
    return !back&&c.o==null?`<img class="c n${f}" ${a} src="${IMG.n[c.n]}" alt="${c.n}">`:`<div class="c${back?' bk':''}${f}" ${a}>${back?'':`${c.o??c.n}${c.o!=null?'<i>↺</i>':''}`}</div>`};
  const pips=[0,1,2].map(i=>`<span class="pip ${res[i]==null?(i==S.rounds?'now':''):res[i]>0?'w':res[i]<0?'l':'d'}"></span>`).join('');
  const sk=TH.map((t,i)=>`<span class="sk${i<bi?' past':i==bi?' cur':''}" title="Ölüm eşiği: ${t}'ten büyük atmalısın">${IC.skull}<small>${t}</small></span>`).join('');
  $('#hdr').innerHTML=`<div class="hb"><span class="lab">Düello ${S.bo+1}</span><span class="pips">${pips}</span></div><div class="sc"><b>${S.pts[0]}</b><i>Sen</i><i>Rakip</i><b>${S.pts[1]}</b></div><div class="hb sks">${sk}<button class="gear" data-g="1" aria-label="Ayarlar">${IC.gear}</button></div>`;
  const my=S.turn==0&&!lock&&!S.wait,mt=total(S,0),ot=total(S,1,false),bust=!low&&mt>T,seal=T+(low?'L':'');
  const jp=n=>`<span class="jpips" title="Joker hakkı ${n}/2">${[0,1].map(i=>`<i${i<n?' class="on"':''}></i>`).join('')}</span>`;
  $('#opp').className='zone'+(S.turn==1&&!S.wait?' act':'');
  $('#opp').innerHTML=`<div class="who"><img class="av breathe" src="${IMG.bj}" alt=""><div class="nm"><b>${MODE=='bot'?'Ölümün Efendisi':'Rakip'}</b><span class="meta">${MODE=='bot'?IC.skull.repeat(DN[DIFF]):'Online'}${jp(2-S.jUsed[1])}</span>${sayT?`<small class="say">${sayT}</small>`:''}</div><span class="jbs">${S.hand[1].map(()=>`<img class="jb" src="${IMG.bj}" alt="">`).join('')}</span><div class="tot"><small>Açık toplam</small><b>${lastTot[1]}</b></div></div><div class="cards">${S.pl[1].open.map(c=>cd(c)).join('')}${S.pl[1].closed.map(c=>cd(c,!S.rev,S.rev)).join('')}</div>`;
  $('#fx').innerHTML=`<div id="deck" class="deck" title="Deste"><b>${S.deck.length}</b></div><div class="seal${T!=21||low?' alt':''}${prevSeal&&prevSeal!=seal?' stamp':''}"><small>Hedef</small><b>${low?'En az':T}</b></div><div class="chips">${S.eff.map(e=>`<img class="e${e.neg?' neg':''}${e.o==0?' mine':''}${seenE.has(e.uid)?'':' newc'}${k=='eff'&&cn.includes(e.uid)?' hl':''}" data-e="${e.uid}" src="${IMG.j[e.id]}" title="${J[e.id]}${e.id==22?(e.s>0?' (+)':' (−)'):''}" alt="${J[e.id]}">`).join('')}</div>`;
  $('#me').className='zone'+(my?' act':'');
  $('#me').innerHTML=`<div class="who"><img class="av" src="${IMG.bn}" alt=""><div class="nm"><b>Sen</b><span class="meta">${jp(2-S.jUsed[0])}</span></div><div class="tot${bust?' bust':''}"><small>${bust?'Battın':'Toplamın'}</small><b>${lastTot[0]}</b></div></div><div class="cards">${S.pl[0].open.map(c=>cd(c)).join('')}<span class="gap"></span>${S.pl[0].closed.map(c=>cd(c,!(S.rev||peek.has(c.id)),S.rev||c.id==flipId,1)).join('')}</div>`;
  $('#prompt').className=P?'ask':my?'go':'wait';
  $('#prompt').innerHTML=P?`${J[P.id]}: ${KTXT[k]} ${k=='sign'?'<button class="btn sm" data-s="1">Ekle</button><button class="btn sm" data-s="-1">Çıkar</button>':''}<button class="btn sm alt" data-x="1">Vazgeç</button>`:(S.turn==0?'Senin sıran':MODE=='bot'?'Ölümün Efendisi düşünüyor…':'Rakibin sırası');
  $('#draw').disabled=!(my&&!P&&canDraw(S,0));$('#pass').disabled=!(my&&!P);
  const n=S.hand[0].length;
  $('#hand').innerHTML=S.hand[0].map((id,i)=>`<img class="j${my&&!P&&playable(S,0,id)?'':' dim'}" style="--r:${((i-(n-1)/2)*5).toFixed(1)}deg" data-j="${id}" src="${IMG.j[id]}" alt="${J[id]}" title="${J[id]}">`).join('');
  count(document.querySelector('#me .tot b'),lastTot[0],mt);count(document.querySelector('#opp .tot b'),lastTot[1],ot);lastTot=[mt,ot];
  S.eff.forEach(e=>seenE.add(e.uid));S.hand[0].forEach(id=>hiLoad(id));
  if(prevSeal&&prevSeal!=seal)snd('stamp');prevSeal=seal;
  if(bust&&!lastBust){snd('bust');shake();vib(120)}lastBust=bust;
  if(fresh)snd('draw');
  const mt0=S.turn==0&&!S.wait;if(mt0&&!prevT)snd('turn');prevT=mt0;
  const last=S.log[S.log.length-1],lk=S.log.length+JSON.stringify(last);if(lk!=lastLk){lastLk=lk;if(last&&last.t=='pas dedi')snd('pass')}
  fly();flipId=null;
  if(MODE=='host'&&conn&&conn.open)conn.send({k:'s',v:view(G)});
}
function doPlay(id,pk){const S=G;P=null;if(MODE=='guest'){conn.send({k:'play',id,pk});return R()}play(S,0,id,pk);S.acted=true;S.log.push({p:0,t:`joker oynadı: ${J[id]}`});note(0,id,R)}
function pick(v){P.pk.push(v);if(P.pk.length==P.ks.length)doPlay(P.id,P.pk);else R()}
function startJoker(id){const ks=NEED[id]||[];if(ks.length){P={id,ks,pk:[]};R()}else doPlay(id,[])}
function box(html,close=true){lock=true;$('#mb').innerHTML=html+(close?'<div class="row"><button id="pc" class="btn alt">Kapat</button></div>':'');$('#m').hidden=false;if(close)$('#pc').onclick=()=>{$('#m').hidden=true;lock=false;if(G)R()}}
function preview(id,use,note,back){ // jokeri büyük göster: Kullan / Kapat
  lock=true;snd('info');
  $('#mb').innerHTML=`<img class="big" src="${IMG.j[id]}" alt="${J[id]}">${note?`<div class="pn">${note}</div>`:''}<div class="row">${use?'<button id="pu" class="btn">Kullan</button>':''}<button id="pc" class="btn alt">Kapat</button></div>`;
  $('#m').hidden=false;hi($('#mb .big'),id);
  $('#pc').onclick=()=>{if(back)return back();$('#m').hidden=true;lock=false;if(G)R()};
  if(use)$('#pu').onclick=()=>{$('#m').hidden=true;lock=false;startJoker(id)};
}
function codex(){box(`<h3>Joker Kodeksi</h3><div class="cdx">${range(24).map(i=>`<img src="${IMG.j[i]}" data-k="${i}" alt="${J[i]}">`).join('')}</div>`);
  document.querySelectorAll('#mb .cdx img').forEach(im=>im.onclick=()=>preview(+im.dataset.k,false,BLOCK.has(+im.dataset.k)?'Etkisiz kılınabilir':'Etkisiz kılınamaz',codex))}
function guide(){box(`<h3>Nasıl oynanır</h3><p class="gd">Amaç, tur sonunda sayı kartlarının toplamının <b>21'e</b> rakibinden daha yakın olması. 21'i geçersen turu kaybedersin. Sıranda istediğin kadar sayı kartı çekebilir, en fazla 2 joker oynayabilir, sonra pas dersin.</p><p class="gd">Rakibin bir şey yapmadan pas derse kapalı kartlar açılır. 3 turluk düelloyu kaybeden ölüm zarlarını atar, toplam eşiğin üstünde değilse ölür. Eşikler 4, 6, 8 ve 10'dur.</p><p class="gd">Joker Kodeksi'nde 24 jokerin hepsini ve hangilerinin etkisiz kılınabildiğini görebilirsin.</p>`)}
function settings(){
  box(`<h3>Ayarlar</h3><label>Müzik<input type="range" id="sm" min="0" max="1" step=".05" value="${VM}"></label><label>Efektler<input type="range" id="ss" min="0" max="1" step=".05" value="${VS}"></label><label class="chk"><input type="checkbox" id="sr" ${RM?'checked':''}> Hareketi azalt</label><label class="chk"><input type="checkbox" id="sc" ${CRT?'checked':''}> CRT efekti (tarama çizgileri)</label><label class="chk"><input type="checkbox" id="sv" ${VB?'checked':''}> Titreşim</label><div class="row"><button class="btn alt sm" id="sk">Joker Kodeksi</button><button class="btn alt sm" id="sg">Nasıl oynanır</button></div>`);
  $('#sm').oninput=e=>{VM=+e.target.value;LS('vm',VM);ac();MG.gain.value=VM*.8};
  $('#ss').oninput=e=>{VS=+e.target.value;LS('vs',VS);ac();SG.gain.value=VS};$('#ss').onchange=()=>snd('draw');
  $('#sr').onchange=e=>{RM=e.target.checked;LS('rm',RM?1:0);document.body.classList.toggle('rm',RM)};
  $('#sc').onchange=e=>{CRT=e.target.checked;LS('crt',CRT?1:0);document.documentElement.classList.toggle('nocrt',!CRT)};
  $('#sv').onchange=e=>{VB=e.target.checked;LS('vb',VB?1:0)};
  $('#sk').onclick=codex;$('#sg').onclick=guide;
}
document.addEventListener('click',e=>{
  const S=G,t=e.target.closest&&e.target.closest('[data-c],[data-e],[data-j],[data-s],[data-x],[data-g]');
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
  if(t.dataset.pk){flipId=c;peek.has(c)?peek.delete(c):peek.add(c);return R()} // kapalı kartı çevir
  if(t.dataset.e){const x=S.eff.find(y=>y.uid==u);if(x)preview(x.id,false,`${x.o==0?'Senin jokerin':'Rakibin jokeri'}${x.neg?' (etkisiz kılındı)':''}${x.id==22?(x.s>0?' (ekler)':' (çıkarır)'):''}`);return}
  if(t.dataset.j){const id=+t.dataset.j;preview(id,S.turn==0&&!S.wait&&playable(S,0,id))}
});
$('#draw').onclick=()=>{const S=G;if(S.turn||lock||P||!canDraw(S,0))return;if(MODE=='guest')return conn.send({k:'draw'});const c=S.deck.pop();S.pl[0].open.push(c);S.acted=true;S.log.push({p:0,t:`kart çekti (${c.n})`});R()};
$('#pass').onclick=()=>{if(G.turn==0&&!lock&&!P){if(MODE=='guest')conn.send({k:'pass'});else pass()}};

/* ---------- ONLINE (PeerJS) ---------- */
let MODE='bot',peer,conn,waitM=false;
function view(S){ // rakibe gidecek, gizli bilgisi temizlenmiş ve aynalanmış durum
  const f=a=>[a[1],a[0]];
  return {bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:1-S.turn,pts:f(S.pts),rev:S.rev,res:(S.res||[]).map(x=>-x),jUsed:f(S.jUsed),noJ:f(S.noJ),
    hand:[S.hand[1],S.hand[0].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[S.pl[1],{open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:S.rev?c.n:0,o:S.rev?c.o:undefined}))}],
    eff:S.eff.map(e=>({...e,o:1-e.o})),log:S.log.slice(-6).map(l=>({...l,p:l.p<0?-1:1-l.p}))};
}
function note(p,id,cb){if(MODE=='host'&&conn&&conn.open)conn.send({k:'j',p:1-p,id});cast(p,id,cb)}
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
  if(m.k=='s'){G=m.v;if(waitM){$('#m').hidden=true;lock=false;waitM=false}if(G.turn!=0||G.wait)P=null;$('#menu').hidden=true;R()}
  else if(m.k=='m'){waitM=true;M(m.html,null);snd(m.sd)}
  else if(m.k=='j')cast(m.p,m.id,R);
}
const st=t=>$('#st').textContent=t;
function hostRoom(){
  MODE='host';const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random()*32|0]).join('');
  peer=new Peer('necrodice-'+code);
  peer.on('open',()=>st('Oda kodu: '+code+' — rakip bekleniyor…'));
  peer.on('error',e=>{if(e.type=='unavailable-id'){peer.destroy();hostRoom()}else st('Hata: '+e.type)});
  peer.on('connection',c=>{if(conn)return;conn=c;c.on('open',()=>{$('#menu').hidden=true;start()});c.on('data',onGuest);c.on('close',()=>M('Rakip ayrıldı.','Tamam',()=>location.reload()))});
}
function joinRoom(){
  const code=$('#code').value.trim().toUpperCase();if(!code)return st('Oda kodunu yaz');
  MODE='guest';st('Bağlanılıyor…');peer=new Peer();
  peer.on('open',()=>{conn=peer.connect('necrodice-'+code,{reliable:true});conn.on('data',onHost);conn.on('open',()=>st('Bağlandı, oyun başlıyor…'));conn.on('close',()=>M('Bağlantı koptu.','Tamam',()=>location.reload()))});
  peer.on('error',e=>st(e.type=='peer-unavailable'?'Oda bulunamadı':'Hata: '+e.type));
}
document.querySelectorAll('.d').forEach(b=>b.onclick=()=>{DIFF=b.dataset.d;MODE='bot';$('#menu').hidden=true;start()});
$('#b4').onclick=codex;$('#b5').onclick=guide;$('#b6').onclick=settings;
try{if(RM)document.body.classList.add('rm');if(!CRT)document.documentElement.classList.add('nocrt')}catch(e){}
$('#slogo').src=IMG.logo;setTimeout(()=>{const s=$('#splash');s&&s.remove()},2900);
$('#b2').onclick=hostRoom;$('#b3').onclick=joinRoom;
