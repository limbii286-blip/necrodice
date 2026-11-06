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

/* ---------- MOTOR ---------- */
function newBO3(S){S.jdeck=shuf(range(24));S.hand=[S.jdeck.splice(0,4),S.jdeck.splice(0,4)];S.pts=[0,0];S.rounds=0}
function deal(S){
  S.deck=shuf(range(11).map(n=>({id:++S.u,n})));
  S.pl=[0,1].map(()=>({open:[S.deck.pop()],closed:[S.deck.pop()]}));
  S.eff=[];S.jUsed=[0,0];S.noJ=[false,false];S.acted=false;S.turns=0;
  S.turn=S.pl[0].open[0].n<S.pl[1].open[0].n?0:1;
  S.wait=false;S.log.push({p:-1,t:`— Tur ${S.rounds+1} —`},{p:S.turn,t:'başlıyor (küçük açık kart)'});
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
  if(id==13||id==14)take(pk[0]);
  if(id==15){const[a,i]=find(pk[0]),[b,k]=find(pk[1]);[a[i],b[k]]=[b[k],a[i]]}
  if(id==16)[S.pl[0].closed,S.pl[1].closed]=[S.pl[1].closed,S.pl[0].closed];
  if(id==17)S.pl[p].open.push(take(pk[0]));
  if(id==18)S.pl[q].open.push(take(pk[0]));
  if(id==24)S.noJ[q]=true;
}

/* ---------- BOT ---------- */
function evalS(S,p){ // kapalı kartlar şimdi açılsa beklenen sonuç
  const q=1-p,cl=S.pl[q].closed[0];
  if(cl.o!=null)return outc(S,p);
  const seen=new Set([...S.pl[p].open,...S.pl[p].closed,...S.pl[q].open].map(c=>c.n));
  const pool=range(11).filter(n=>!seen.has(n));if(!pool.length)return outc(S,p);
  let s=0;pool.forEach(n=>{cl.n=n;s+=outc(S,p)});return s/pool.length;
}
const combos=l=>l.reduce((r,o)=>r.flatMap(x=>o.map(y=>[...x,y])),[[]]);
function bot(){
  const S=G;let n=0;
  const step=()=>{
    if(S.turn!=1||S.over)return;
    const base=evalS(clone(S),1);let best=null,bs=base+.03;
    if(canDraw(S,1)){
      let v=0;S.deck.forEach((c,i)=>{const T=clone(S);T.pl[1].open.push(T.deck.splice(i,1)[0]);v+=evalS(T,1)});v/=S.deck.length;
      if(v>bs){bs=v;best={t:'d'}}
    }
    if(S.jUsed[1]<2&&!S.noJ[1])new Set(S.hand[1]).forEach(id=>{
      if(id==16||!playable(S,1,id))return;
      combos((NEED[id]||[]).map(k=>opts(S,1,k))).forEach(pk=>{
        if(id==15&&pk[0]==pk[1])return;
        const T=clone(S);T.deck=shuf(T.deck);play(T,1,id,pk);const v=evalS(T,1)-.2;
        if(v>bs){bs=v;best={t:'j',id,pk}}
      });
    });
    if(best&&n++<8){
      S.acted=true;
      if(best.t=='d'){const c=S.deck.pop();S.pl[1].open.push(c);S.log.push({p:1,t:`kart çekti (${c.n})`});R();setTimeout(step,900)}
      else{play(S,1,best.id,best.pk);S.log.push({p:1,t:`joker oynadı: ${J[best.id]}`});R();note(1,best.id,()=>{R();setTimeout(step,400)})}
    }else pass();
  };
  setTimeout(step,900);
}

/* ---------- AKIŞ ---------- */
function pass(){
  const S=G;S.log.push({p:S.turn,t:'pas dedi'});
  if(S.turns>0&&!S.acted)return endRound();
  S.turns++;S.acted=false;S.turn=1-S.turn;R();next();
}
function next(){if(MODE=='bot'&&G.turn==1&&!lock&&!G.over)bot()}
function M(html,btn,cb){lock=true;$('#mb').innerHTML=html+(btn?`<br><br><button id="mo">${btn}</button>`:'<br><i>Host devam ettirecek…</i>');$('#m').hidden=false;
  if(btn)$('#mo').onclick=()=>{$('#m').hidden=true;lock=false;cb()}}
function MM(fn,btn,cb){if(MODE=='host'&&conn&&conn.open)conn.send({k:'m',html:fn(1)});M(fn(0),btn,cb)}
function endRound(){
  const S=G,a=[total(S,0),total(S,1)],T=tg(S),r=outc(S,0);
  S.pts[0]+=r>0?1:r==0?.5:0;S.pts[1]+=r<0?1:r==0?.5:0;S.rounds++;S.wait=true;
  const pre=v=>{const w=v?-r:r;return `Kapalı kartlar açıldı.<br>Sen: ${a[v]} · Rakip: ${a[1-v]} · Hedef: ${T}${act(S,19)?' (en az kazanır)':''}<br><b>${w>0?'Turu sen kazandın':w<0?'Turu rakip kazandı':'Tur berabere'}</b>`};
  R();
  if(!(S.pts.some(x=>x>=2)||S.rounds>=3)){
    if(r==0)[0,1].forEach(p=>S.jdeck.length&&S.hand[p].push(S.jdeck.pop()));
    return MM(v=>pre(v)+(r==0?'<br>Beraberlik: ikiniz de birer joker çektiniz.':''),'Sonraki tur',()=>{deal(S);R();next()});
  }
  let L=S.pts[0]<S.pts[1]?0:S.pts[1]<S.pts[0]?1:-1,hx=null,how='';
  if(L<0){
    const j=S.hand.map(h=>h.length);
    if(j[0]!=j[1]){L=j[0]<j[1]?0:1;how='joker'}
    else{let x,y;do{x=d6()+d6();y=d6()+d6()}while(x==y);L=x<y?0:1;hx=[x,y];how='zar'}
  }
  const th=TH[Math.min(S.bo,3)],roll=d6()+d6(),surv=roll>th;
  const full=v=>pre(v)+`<hr>BO3'ü ${L==v?'rakip kazandı':'sen kazandın'}${how=='joker'?' (joker sayısı)':how=='zar'?` (zar ${hx[v]}–${hx[1-v]})`:''}.<br>${L==v?'Sen':'Rakip'} ölüm zarlarını attı: <b>${roll}</b> (${th}'ten büyük olmalı)<br>`+(surv?`${L==v?'Sen':'Rakip'} hayatta kaldı.`:`<b>${L==v?'Sen öldün. Rakip oyunu kazandı.':'Rakip öldü. Sen oyunu kazandın!'}</b>`);
  if(surv)MM(full,'Yeni BO3',()=>{S.bo++;newBO3(S);deal(S);R();next()});
  else{S.over=true;MM(full,'Yeniden oyna',start)}
}
function start(){G={u:0,bo:0,log:[],over:false,used:[]};newBO3(G);deal(G);R();next()}

/* ---------- ARAYÜZ ---------- */
const cand=()=>P?opts(G,0,P.ks[P.pk.length]):[];
function R(){
  const S=G,low=act(S,19),cn=cand(),k=P&&P.ks[P.pk.length];
  $('#hdr').innerHTML=`BO3 #${S.bo+1} · Tur ${Math.min(S.rounds+1,3)}/3 · Puan: Sen ${S.pts[0]} – ${S.pts[1]} Rakip · Ölüm eşiği >${TH[Math.min(S.bo,3)]} · Hedef <b>${low?'en az':tg(S)}</b>`;
  const cd=(c,back)=>!back&&c.o==null?`<img class="c n${cn.includes(c.id)?' hl':''}" data-c="${c.id}" src="${IMG.n[c.n]}">`:`<div class="c${back?' bk':''}${cn.includes(c.id)?' hl':''}" data-c="${c.id}">${back?'':`${c.o??c.n}${c.o!=null?'<i>↺</i>':''}`}</div>`;
  $('#opp').innerHTML=`<div class="lbl">Rakip · jokerler: <span class="jbs">${S.hand[1].map(()=>`<img class="jb" src="${IMG.bj}">`).join('')}</span> · bu tur oynadığı: ${S.jUsed[1]}/2 · açık toplam: ${total(S,1,false)}</div>`+S.pl[1].open.map(c=>cd(c)).join('')+S.pl[1].closed.map(c=>cd(c,1)).join('');
  $('#me').innerHTML=`<div class="lbl">Sen · bu tur oynadığın joker: ${S.jUsed[0]}/2 · toplamın: <b>${total(S,0)}</b></div>`+S.pl[0].open.map(c=>cd(c)).join('')+S.pl[0].closed.map(c=>cd(c)).join('')+'<div class="lbl">(sağdaki kart kapalı kartın)</div>';
  $('#fx').innerHTML=S.eff.map(e=>`<img class="e${e.neg?' neg':''}${e.o==0?' mine':''}${k=='eff'&&cn.includes(e.uid)?' hl':''}" data-e="${e.uid}" src="${IMG.j[e.id]}" title="${J[e.id]}${e.id==22?(e.s>0?' (+)':' (−)'):''}">`).join('');
  $('#log').innerHTML=S.log.slice(-4).map(l=>l.p<0?l.t:`${l.p?'Rakip':'Sen'}: ${l.t}`).join('<br>');
  const my=S.turn==0&&!lock&&!S.wait;
  $('#draw').disabled=!(my&&!P&&canDraw(S,0));$('#pass').disabled=!(my&&!P);
  $('#hand').innerHTML=S.hand[0].map(id=>`<img class="j${my&&!P&&playable(S,0,id)?'':' dim'}" data-j="${id}" src="${IMG.j[id]}" title="${J[id]}">`).join('');
  $('#prompt').innerHTML=P?`${J[P.id]}: ${KTXT[k]} ${k=='sign'?'<button data-s="1">Ekle</button> <button data-s="-1">Çıkar</button>':''} <button data-x="1">İptal</button>`:(S.turn==0?'Sıra sende':'Rakip düşünüyor…');
  if(MODE=='host'&&conn&&conn.open)conn.send({k:'s',v:view(G)});
}
function doPlay(id,pk){const S=G;P=null;if(MODE=='guest'){conn.send({k:'play',id,pk});return R()}play(S,0,id,pk);S.acted=true;S.log.push({p:0,t:`joker oynadı: ${J[id]}`});R();note(0,id,R)}
function jokerNote(p,id,cb){M(`<b>${p?'RAKİP':'SEN'} JOKER OYNADI</b><br><img class="big" src="${IMG.j[id]}"><br>${J[id]}`,'Kapat',cb)}
function pick(v){P.pk.push(v);if(P.pk.length==P.ks.length)doPlay(P.id,P.pk);else R()}
document.addEventListener('click',e=>{
  const S=G,t=e.target;if(lock||!S||S.over)return;
  if(t.dataset.x){P=null;return R()}
  if(t.dataset.s)return pick(+t.dataset.s);
  if(P){
    const k=P.ks[P.pk.length];
    if(t.dataset.c&&k!='eff'&&opts(S,0,k).includes(+t.dataset.c))pick(+t.dataset.c);
    if(t.dataset.e&&k=='eff'&&opts(S,0,k).includes(+t.dataset.e))pick(+t.dataset.e);
    return;
  }
  if(S.turn!=0)return;
  if(t.dataset.j){const id=+t.dataset.j;if(!playable(S,0,id))return;const ks=NEED[id]||[];if(ks.length){P={id,ks,pk:[]};R()}else doPlay(id,[])}
});
$('#draw').onclick=()=>{const S=G;if(S.turn||lock||P||!canDraw(S,0))return;if(MODE=='guest')return conn.send({k:'draw'});const c=S.deck.pop();S.pl[0].open.push(c);S.acted=true;S.log.push({p:0,t:`kart çekti (${c.n})`});R()};
$('#pass').onclick=()=>{if(G.turn==0&&!lock&&!P){if(MODE=='guest')conn.send({k:'pass'});else pass()}};

/* ---------- ONLINE (PeerJS) ---------- */
let MODE='bot',peer,conn,waitM=false;
function view(S){ // rakibe gidecek, gizli bilgisi temizlenmiş ve aynalanmış durum
  const f=a=>[a[1],a[0]];
  return {bo:S.bo,rounds:S.rounds,over:S.over,wait:S.wait,turn:1-S.turn,pts:f(S.pts),jUsed:f(S.jUsed),noJ:f(S.noJ),
    hand:[S.hand[1],S.hand[0].map(()=>0)],deck:S.deck.map(()=>({id:0,n:0})),
    pl:[S.pl[1],{open:S.pl[0].open,closed:S.pl[0].closed.map(c=>({id:c.id,n:0}))}],
    eff:S.eff.map(e=>({...e,o:1-e.o})),log:S.log.slice(-6).map(l=>({...l,p:l.p<0?-1:1-l.p}))};
}
function note(p,id,cb){if(MODE=='host'&&conn&&conn.open)conn.send({k:'j',p:1-p,id});jokerNote(p,id,cb)}
function onGuest(m){ // host: misafirin hamle istekleri (doğrulanır)
  const S=G;if(!S||S.over||S.wait||S.turn!=1)return;
  if(m.k=='draw'){if(!canDraw(S,1))return;const c=S.deck.pop();S.pl[1].open.push(c);S.acted=true;S.log.push({p:1,t:`kart çekti (${c.n})`});R()}
  else if(m.k=='pass')pass();
  else if(m.k=='play'){
    const id=m.id,ks=NEED[id]||[],pk=m.pk||[];
    if(!playable(S,1,id)||pk.length!=ks.length||!ks.every((k,i)=>opts(S,1,k).includes(pk[i])))return;
    play(S,1,id,pk);S.acted=true;S.log.push({p:1,t:`joker oynadı: ${J[id]}`});R();note(1,id,R);
  }
}
function onHost(m){ // misafir: host'tan gelen durum/bildirimler
  if(m.k=='s'){G=m.v;if(waitM){$('#m').hidden=true;lock=false;waitM=false}if(G.turn!=0||G.wait)P=null;$('#menu').hidden=true;R()}
  else if(m.k=='m'){waitM=true;M(m.html,null)}
  else if(m.k=='j')jokerNote(m.p,m.id,R);
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
$('#b1').onclick=()=>{MODE='bot';$('#menu').hidden=true;start()};
$('#b2').onclick=hostRoom;$('#b3').onclick=joinRoom;
