"use strict";
const ORDER=["pokedle","loldle","smashdle"].filter(k=>window.GAMES&&GAMES[k]);
const CYC={single:["?","g","r"],set:["?","g","y","r"],ptype:["?","g","y","r"],num:["?","eq","up","down","ne"]};
const RADIX={single:2,set:3,ptype:3,num:3};
const ARROW={up:" ↑",down:" ↓",ne:" ≠"};
const $=id=>document.getElementById(id);
let randIdx=-1,gid,game,G=[],gens=new Set([1,2,3,4,5,6,7,8,9]),byName;

const label=it=>it.a?it.n+" / "+it.a:it.n;
const eqSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
const overlap=(a,b)=>a.some(x=>b.includes(x));
function fmt(at,v){
  if(Array.isArray(v))return v.length?v.join(", "):"–";
  if(at.labels)return at.labels[v];
  if(at.unit)return String(v.toFixed(1)).replace(".",",")+" "+at.unit;
  return String(v)}

// true = Kandidat c passt NICHT zur Rückmeldung s für Versuch g
function viol(at,g,c,s){
  const gv=g.v[at.k],cv=c.v[at.k];
  switch(at.kind){
    case"single":return s==="g"?gv!==cv:gv===cv;
    case"set":{const e=eqSet(gv,cv),o=overlap(gv,cv);return s==="g"?!e:s==="y"?(e||!o):o}
    case"num":return s==="eq"?cv!==gv:s==="up"?!(cv>gv):s==="down"?!(cv<gv):cv===gv;
    case"ptype":return s==="g"?cv!==gv:s==="r"?cv===gv:(cv===gv||gv==="Keiner"||c.v[at.other]!==gv)}
}
function code(at,g,c){
  const gv=g.v[at.k],cv=c.v[at.k];
  switch(at.kind){
    case"single":return gv===cv?0:1;
    case"set":return eqSet(gv,cv)?0:overlap(gv,cv)?1:2;
    case"num":return cv===gv?0:cv>gv?1:2;
    case"ptype":return cv===gv?0:(gv!=="Keiner"&&c.v[at.other]===gv)?1:2}
}
function key(g,c){let k=0;for(const at of game.attrs)k=k*RADIX[at.kind]+code(at,g,c);return k}
const pool=()=>game.items.filter(it=>!game.gens||gens.has(it.g));

function candidates(){
  const guessed=new Set(G.map(g=>g.i));
  const P=pool().filter(it=>!guessed.has(game.items.indexOf(it)));
  const scored=P.map(c=>{let v=0;for(const g of G)for(const at of game.attrs){const s=g.s[at.k];if(s!=="?"&&viol(at,game.items[g.i],c,s))v++}return{c,v}});
  const exact=scored.filter(x=>x.v===0).map(x=>x.c);
  if(exact.length||!scored.length)return{list:exact,fuzzy:0};
  const m=Math.min(...scored.map(x=>x.v));
  return{list:scored.filter(x=>x.v===m).map(x=>x.c),fuzzy:m}
}
function bestGuess(C){
  if(C.length<=2)return C[0]?{it:C[0],e:1}:null;
  const size=game.attrs.reduce((p,a)=>p*RADIX[a.kind],1),cnt=new Int32Array(size),inC=new Set(C);
  let best=null,bs=Infinity;
  const guessed=new Set(G.map(g=>game.items[g.i]));
  for(const g of pool()){if(guessed.has(g))continue;cnt.fill(0);for(const c of C)cnt[key(g,c)]++;let ss=0;for(let i=0;i<size;i++)ss+=cnt[i]*cnt[i];
    const sc=ss-(inC.has(g)?.5:0);if(sc<bs){bs=sc;best=g}}
  return{it:best,e:(bs+.5)/C.length}
}

const SKEY=()=>"dle-solver-"+gid;
function save(){try{localStorage.setItem(SKEY(),JSON.stringify({d:new Date().toDateString(),G,gens:[...gens]}))}catch(e){}}
function load(){G=[];try{const o=JSON.parse(localStorage.getItem(SKEY())||"null");if(!o)return;if(o.gens)gens=new Set(o.gens);if(o.d===new Date().toDateString())G=o.G.filter(g=>game.items[g.i])}catch(e){}}

function reroll(){
  const guessed=new Set(G.map(g=>g.i)),P=pool().filter(it=>!guessed.has(game.items.indexOf(it)));
  if(!P.length){randIdx=-1;$("randname").textContent="–";return}
  randIdx=game.items.indexOf(P[Math.floor(Math.random()*P.length)]);
  $("randname").textContent=label(game.items[randIdx]);$("randname").dataset.pick=randIdx}
function render(){
  $("rows").innerHTML=G.map((g,i)=>{const it=game.items[g.i];
    return `<tr><td class="n">${it.n}</td>`+game.attrs.map(at=>{const s=g.s[at.k],t=fmt(at,it.v[at.k]);
      return `<td><button class="chip" data-i="${i}" data-k="${at.k}" data-s="${s}" aria-label="${at.l}: ${t}">${t}${ARROW[s]||""}</button></td>`}).join("")
      +`<td><button class="x" data-del="${i}" aria-label="Versuch entfernen">✕</button></td></tr>`}).join("")
    ||`<tr><td colspan="${game.attrs.length+2}" style="color:var(--mid);padding:8px 2px">Noch kein Versuch. Starte mit dem Tipp rechts.</td></tr>`;
  const {list:C,fuzzy}=candidates();
  $("cnt").textContent=C.length;
  const w=$("warn");w.hidden=!fuzzy;
  if(fuzzy)w.textContent=`Kein Kandidat passt zu allen Feldern. Gezeigt werden die, bei denen ${fuzzy===1?"nur 1 Feld":fuzzy+" Felder"} abweicht. Prüf deine Farben, oder die Daten weichen hier vom Spiel ab.`;
  if(!C.length){$("bestl").textContent="Bester nächster Tipp";$("best").textContent="–";$("bestw").textContent=""}
  else if(C.length===1){$("bestl").textContent="Lösung";$("best").textContent=label(C[0]);$("bestw").textContent=""}
  else{const b=bestGuess(C);$("bestl").textContent="Bester nächster Tipp";$("best").textContent=label(b.it);
    $("bestw").textContent="danach im Schnitt noch ca. "+b.e.toFixed(1).replace(".",",")+" übrig"}
  $("list").innerHTML=C.slice(0,300).map(it=>`<li><button data-pick="${game.items.indexOf(it)}">${it.n}</button></li>`).join("")+(C.length>300?`<li>… und ${C.length-300} weitere</li>`:"");
  save()
}
function add(v){
  const q=v.trim().toLowerCase(),i=byName.get(q);
  if(i===undefined){$("err").textContent="Name nicht gefunden. Wähle einen Eintrag aus der Vorschlagsliste.";return}
  $("err").textContent="";const s={};game.attrs.forEach(a=>s[a.k]="?");G.push({i,s});$("inp").value="";render()
}
function selectGame(id){
  gid=ORDER.includes(id)?id:ORDER[0];game=GAMES[gid];
  document.documentElement.style.setProperty("--accent",game.accent||"#d6452f");
  document.title=game.title+" Solver";
  $("tabs").innerHTML=ORDER.map(k=>`<button data-game="${k}" aria-current="${k===gid}">${GAMES[k].title}</button>`).join("");
  $("sub").innerHTML=`Solver für den Classic-Modus von <a href="${game.url}" target="_blank" rel="noopener">${game.title}</a>. Rateversuch eintragen, Felder einfärben wie im Spiel, und rechts erscheint der Tipp, der am meisten aussortiert.`;
  $("note").textContent=[game.note,game.source].filter(Boolean).join(" ");
  $("thead").innerHTML="<tr><th>Name</th>"+game.attrs.map(a=>`<th>${a.l}</th>`).join("")+"<th></th></tr>";
  $("inp").placeholder=game.items[0].a?"Name (deutsch oder englisch)":"Name";
  byName=new Map();game.items.forEach((it,i)=>{[label(it),it.n,it.a].forEach(x=>x&&byName.set(x.toLowerCase(),i))});
  $("dl").innerHTML=game.items.map(it=>`<option value="${label(it)}">`).join("");
  $("gensbox").hidden=!game.gens;
  load();
  document.querySelectorAll("[data-gen]").forEach(cb=>cb.checked=gens.has(+cb.dataset.gen));
  $("err").textContent="";render();reroll()
}
$("gens").innerHTML=[1,2,3,4,5,6,7,8,9].map(n=>`<label><input type="checkbox" data-gen="${n}"> Gen ${n}</label>`).join("");
$("gens").addEventListener("change",e=>{const n=+e.target.dataset.gen;e.target.checked?gens.add(n):gens.delete(n);render();reroll()});
$("addb").onclick=()=>add($("inp").value);
$("inp").addEventListener("keydown",e=>{if(e.key==="Enter")add($("inp").value)});
$("reset").onclick=()=>{G=[];render();reroll()};
$("reroll").onclick=reroll;
document.addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;
  if(t.dataset.game){location.hash=t.dataset.game}
  else if(t.dataset.k){const g=G[+t.dataset.i],at=game.attrs.find(a=>a.k===t.dataset.k),c=CYC[at.kind];g.s[at.k]=c[(c.indexOf(g.s[at.k])+1)%c.length];render()}
  else if(t.dataset.del){G.splice(+t.dataset.del,1);render()}
  else if(t.dataset.pick){$("inp").value=label(game.items[+t.dataset.pick]);$("inp").focus()}});
addEventListener("hashchange",()=>selectGame(location.hash.slice(1)));
selectGame(location.hash.slice(1));
