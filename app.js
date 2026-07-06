/* FPS 2026 — app.js : state, controller, UI, season loop. Original game by Claude. */
'use strict';
let G=null, USER=null, VIEW='week';
const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const money=v=>'$'+ (Math.round(v*10)/10).toFixed(1)+'M';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ovrColor=o=> o>=90?'#37d39b':o>=82?'#7fd14b':o>=74?'#ffd23f':o>=66?'#ff9f43':'#ff5d6c';
// high-contact positions take on more wear per game (mirrors engine.js gameInjuries)
const HIGH_CONTACT=new Set(['RB','WR','TE','CB','S','DE','DT','OLB','ILB','FB']);
const LOGOS=new Set(['ari','atl','bal','buf','car','chi','cin','dal','den','det','gb','ind','jax','kc','lac','lar','lv','mia','min','ne','no','nyg','nyj','phi','pit','sea','sf','tb','ten','was']);
function logoTag(t,size){ if(!t) return ''; size=size||18; const ab=(t.abbr||'').toLowerCase();
  if(LOGOS.has(ab)) return `<img class="lg" src="logos/${ab}.png" width="${size}" height="${size}" alt="${t.abbr}">`;
  if(typeof window!=='undefined' && window.teamLogoSVG) return window.teamLogoSVG(t,size);   // generated SVG crest for fictional/expansion/relocated teams
  return `<span class="lgfx" style="width:${size}px;height:${size}px;background:${t.pri};font-size:${Math.round(size*0.4)}px">${t.abbr}</span>`; }
function faceTag(t,h){ if(!t || (typeof G!=='undefined'&&G&&G.fantasy)) return ''; const ab=(t.abbr||'').toLowerCase(); if(!LOGOS.has(ab)) return '';
  if(t.roster&&t.roster.length){ const tp=t.roster.slice().sort((a,b)=>b.ovr-a.ovr)[0]; if(tp&&tp.fictional) return ''; }
  return `<img class="face" src="faces/${ab}.png" style="height:${h}px;width:${Math.round(h*1.18)}px" alt="">`; }
// two-way players (Travis Hunter goes both ways) — primary pos stays, p.two is the secondary side
const TWO_WAY={'Travis Hunter':{pos2:'CB',ovr:90,attrs:{SP:96,AC:94,AG:97,ST:73,HA:93,EN:90,DI:80,IN:91}}};
function applyTwoWay(){ G.teams.forEach(t=>t.roster.forEach(p=>{ const tw=TWO_WAY[p.name]; if(tw){
  p.two=tw.pos2; if(tw.ovr)p.ovr=tw.ovr; if(tw.attrs){ p.attrs=Object.assign(p.attrs||{},tw.attrs); p.attrs.OVR=p.ovr; } } })); }
function toast(m){let t=el('div','toast',m);document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}

/* ---------- save / load ---------- */
/* ---------- save slots: multiple named leagues / careers ---------- */
const SLOT_REG='fps2026_slots';
function slotKey(id){ return 'fps2026_slot_'+id; }
function listSlots(){ try{ return (JSON.parse(localStorage.getItem(SLOT_REG))||[]).sort((a,b)=>b.ts-a.ts); }catch(e){ return []; } }
function writeReg(list){ try{ localStorage.setItem(SLOT_REG, JSON.stringify(list)); }catch(e){} }
function newSlotId(){ return 's'+Date.now().toString(36)+Math.floor(Math.random()*1e5).toString(36); }
function slotMeta(){ const t=ut(); return {id:G._slot, name:G._slotName||(t?`${t.city} ${t.nick} dynasty`:'Career'), team:USER, season:G.season, week:G.week, phase:G.phase, ts:Date.now()}; }
// canonical lz-string compressToUTF16 / decompressFromUTF16
var LZString=(function(){var f=String.fromCharCode;var LZString={
compressToUTF16:function(input){if(input==null)return"";return LZString._compress(input,15,function(a){return f(a+32);})+" ";},
decompressFromUTF16:function(compressed){if(compressed==null)return"";if(compressed=="")return null;return LZString._decompress(compressed.length,16384,function(index){return compressed.charCodeAt(index)-32;});},
_compress:function(uncompressed,bitsPerChar,getCharFromInt){if(uncompressed==null)return"";var i,value,context_dictionary={},context_dictionaryToCreate={},context_c="",context_wc="",context_w="",context_enlargeIn=2,context_dictSize=3,context_numBits=2,context_data=[],context_data_val=0,context_data_position=0,ii;
for(ii=0;ii<uncompressed.length;ii+=1){context_c=uncompressed.charAt(ii);if(!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)){context_dictionary[context_c]=context_dictSize++;context_dictionaryToCreate[context_c]=true;}
context_wc=context_w+context_c;if(Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)){context_w=context_wc;}else{if(Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)){if(context_w.charCodeAt(0)<256){for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}}
value=context_w.charCodeAt(0);for(i=0;i<8;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}else{value=1;for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|value;if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=0;}
value=context_w.charCodeAt(0);for(i=0;i<16;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}
context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}delete context_dictionaryToCreate[context_w];}else{value=context_dictionary[context_w];for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}
context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}context_dictionary[context_wc]=context_dictSize++;context_w=String(context_c);}}
if(context_w!==""){if(Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)){if(context_w.charCodeAt(0)<256){for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}}
value=context_w.charCodeAt(0);for(i=0;i<8;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}else{value=1;for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|value;if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=0;}
value=context_w.charCodeAt(0);for(i=0;i<16;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}
context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}delete context_dictionaryToCreate[context_w];}else{value=context_dictionary[context_w];for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}}
value=2;for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}
while(true){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data.push(getCharFromInt(context_data_val));break;}else context_data_position++;}return context_data.join("");},
_decompress:function(length,resetValue,getNextValue){var dictionary=[],next,enlargeIn=4,dictSize=4,numBits=3,entry="",result=[],i,w,bits,resb,maxpower,power,c,data={val:getNextValue(0),position:resetValue,index:1};
for(i=0;i<3;i+=1){dictionary[i]=i;}bits=0;maxpower=Math.pow(2,2);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}
switch(next=bits){case 0:bits=0;maxpower=Math.pow(2,8);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}c=f(bits);break;case 1:bits=0;maxpower=Math.pow(2,16);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}c=f(bits);break;case 2:return "";}
dictionary[3]=c;w=c;result.push(c);while(true){if(data.index>length){return "";}bits=0;maxpower=Math.pow(2,numBits);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}
switch(c=bits){case 0:bits=0;maxpower=Math.pow(2,8);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}dictionary[dictSize++]=f(bits);c=dictSize-1;enlargeIn--;break;case 1:bits=0;maxpower=Math.pow(2,16);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}dictionary[dictSize++]=f(bits);c=dictSize-1;enlargeIn--;break;case 2:return result.join("");}
if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++;}if(dictionary[c]){entry=dictionary[c];}else{if(c===dictSize){entry=w+w.charAt(0);}else{return null;}}result.push(entry);dictionary[dictSize++]=w+entry.charAt(0);enlargeIn--;w=entry;if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++;}}}
};return LZString;})();
// compress saves (game JSON compresses ~6x) so a big fictional league fits localStorage; \u0001 prefix marks a compressed blob, plain JSON (old saves) still loads.
function saveBlob(obj){ try{ return '\u0001'+LZString.compressToUTF16(JSON.stringify(obj)); }catch(e){ return JSON.stringify(obj); } }
function loadBlob(str){ if(str && str.charCodeAt(0)===1){ return JSON.parse(LZString.decompressFromUTF16(str.slice(1))); } return JSON.parse(str); }
function save(quiet){ try{
  if(!G._slot) G._slot=newSlotId();
  try{ localStorage.removeItem('fps2026'); }catch(e){}   // free the old full-size legacy mirror FIRST (it doubled every save and blew the quota)
  const fst=G._fantasySourceTeams; if(fst!=null) delete G._fantasySourceTeams;   // a full second copy of every roster, only used during the fantasy draft — never persist it
  try{ localStorage.setItem(slotKey(G._slot), saveBlob({G,USER})); }
  finally{ if(fst!=null) G._fantasySourceTeams=fst; }                            // keep it in memory in case we're still mid-draft
  const reg=listSlots().filter(s=>s.id!==G._slot); reg.unshift(slotMeta()); writeReg(reg);
  if(!quiet) toast('Saved.');
}catch(e){ toast('Save failed — storage full. Open Saves and delete an old career.'); } }
function loadSlot(id){ try{ const s=localStorage.getItem(slotKey(id)); if(!s)return false; const d=loadBlob(s); G=d.G; USER=d.USER; G._slot=id; if(window.PHYS)PHYS.ensureLeague(G); return true; }catch(e){ return false; } }
function deleteSlot(id){ try{ localStorage.removeItem(slotKey(id)); }catch(e){} writeReg(listSlots().filter(s=>s.id!==id)); }
function renameSlot(id,name){ const reg=listSlots(); const s=reg.find(x=>x.id===id); if(s){ s.name=name; writeReg(reg); } if(id===G._slot)G._slotName=name; }
function load(){ const reg=listSlots(); if(reg.length) return loadSlot(reg[0].id);   // most-recent slot
  const s=localStorage.getItem('fps2026'); if(!s) return false; try{ const d=loadBlob(s); G=d.G; USER=d.USER; G._slot=d._slot||null; if(window.PHYS)PHYS.ensureLeague(G); return true; }catch(e){ return false; } }
// in-game save manager
function savesModal(){
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl') closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:560px;width:92%;max-height:85vh;overflow:auto';
  const slots=listSlots();
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">💾 Saved Careers</h2><button class="btn sec" id="svclose">✕</button></div>
   <p class="muted" style="font-size:12px">Each career is its own league — switch between dynasties anytime. Saves live in this browser.</p>
   <div class="row" style="gap:8px;margin:8px 0;flex-wrap:wrap"><button class="btn" id="svnow">Save current</button>
     <button class="btn sec" id="svrename">Rename current</button>
     <button class="btn sec" id="svnew">New / switch league</button></div>
   <div id="svlist"></div>`;
  const list=box.querySelector('#svlist');
  if(!slots.length) list.innerHTML='<p class="muted">No saved careers yet.</p>';
  slots.forEach(s=>{ const cur=s.id===G._slot; const t=team(s.team);
    const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px';
    row.innerHTML=`<div>${t?logoTag(t,22):''} <b>${esc(s.name)}</b> ${cur?'<span class="tag">current</span>':''}<div class="muted" style="font-size:11px">${esc(s.team||'?')} · Season ${s.season} · ${s.phase==='regular'?'Week '+(s.week+1):esc(s.phase)} · saved ${timeAgo(s.ts)}</div></div>
      <div class="flex" style="gap:6px">${cur?'':`<button class="btn" style="padding:3px 10px" data-load="${s.id}">Load</button>`}<button class="btn sec" style="padding:3px 10px" data-del="${s.id}">Delete</button></div>`;
    list.appendChild(row); });
  ov.appendChild(box); document.body.appendChild(ov);
  box.querySelector('#svclose').onclick=closeOvl;
  box.querySelector('#svnow').onclick=()=>{ save(); closeOvl(); savesModal(); };
  box.querySelector('#svrename').onclick=()=>{ const nm=prompt('Name this career:', G._slotName||''); if(nm){ renameSlot(G._slot,nm.trim().slice(0,80)); save(true); closeOvl(); savesModal(); } };
  box.querySelector('#svnew').onclick=()=>{ if(confirm('Start or load a different league? (Save this one first if you want to keep it.)')){ closeOvl(); G=null; USER=null; setupScreen(); } };
  list.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{ if(loadSlot(b.dataset.load)){ closeOvl(); VIEW='week'; boot(); toast('Career loaded.'); } });
  list.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this saved career permanently?')){ const del=b.dataset.del; deleteSlot(del); if(del===G._slot)G._slot=null; closeOvl(); savesModal(); } });
}
function timeAgo(ts){ if(!ts)return 'recently'; const s=Math.floor((Date.now()-ts)/1000); if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; }
window.savesModal=savesModal;

/* ---------- new league setup ---------- */
const SETUP_LOCATIONS=[
  {k:'buf',label:'Great Lakes Snow Belt',city:'Buffalo',market:46,base:38,loyalty:77,cash:94,climate:'cold',tag:'lake-effect snow, blue-collar crowds'},
  {k:'mia',label:'South Florida Heat',city:'Miami',market:84,base:70,loyalty:60,cash:142,climate:'heat',tag:'humidity, palm trees, fast turf fatigue'},
  {k:'dal',label:'Texas Metroplex',city:'Dallas',market:95,base:86,loyalty:71,cash:205,climate:'heat',tag:'huge suites, national attention'},
  {k:'la',label:'Los Angeles Basin',city:'Los Angeles',market:99,base:78,loyalty:52,cash:220,climate:'mild',tag:'star power, perfect-weather nights'},
  {k:'sea',label:'Puget Sound Rain',city:'Seattle',market:78,base:66,loyalty:76,cash:150,climate:'rain',tag:'rain, noise, travel edge'},
  {k:'chi',label:'Lakefront Wind',city:'Chicago',market:88,base:78,loyalty:81,cash:165,climate:'wind',tag:'wind, winter, impatient tradition'},
  {k:'den',label:'Mile High Air',city:'Denver',market:73,base:62,loyalty:72,cash:132,climate:'cold',tag:'thin air, late-season cold'},
  {k:'lv',label:'Vegas Strip',city:'Las Vegas',market:86,base:62,loyalty:45,cash:190,climate:'heat',tag:'tourists, dome shows, hot camps'},
  {k:'ny',label:'New York Megamarket',city:'New York',market:99,base:90,loyalty:64,cash:230,climate:'cold',tag:'media pressure, winter winds'},
  {k:'sf',label:'Bay Area Tech Coast',city:'San Francisco',market:94,base:77,loyalty:66,cash:220,climate:'mild',tag:'cash-rich, mild, high expectations'},
  {k:'phl',label:'Philly Rowhouse Fire',city:'Philadelphia',market:86,base:82,loyalty:88,cash:155,climate:'cold',tag:'hostile noise, grass, brutal patience'},
  {k:'kc',label:'Plains Thunder',city:'Kansas City',market:70,base:74,loyalty:90,cash:128,climate:'wind',tag:'tailgates, wind, cold playoff air'},
  {k:'nsh',label:'Music City River',city:'Nashville',market:70,base:58,loyalty:61,cash:138,climate:'rain',tag:'humidity, storms, booming growth'},
  {k:'atl',label:'Atlanta Dome Market',city:'Atlanta',market:82,base:64,loyalty:55,cash:172,climate:'dome',tag:'indoor speed, corporate suites'},
  {k:'tor',label:'Toronto Lakeshore',city:'Toronto',market:88,base:68,loyalty:67,cash:158,climate:'cold',tag:'international TV, cold roads'},
  {k:'ldn',label:'London Showcase',city:'London',market:92,base:58,loyalty:50,cash:188,climate:'rain',tag:'global brand, wet autumns'},
  {k:'mex',label:'Mexico City Altitude',city:'Mexico City',market:91,base:76,loyalty:73,cash:165,climate:'mild',tag:'altitude, wild noise, huge reach'},
  {k:'aus',label:'Austin Growth Market',city:'Austin',market:77,base:57,loyalty:48,cash:155,climate:'heat',tag:'new money, heat, young fan base'},
  {k:'por',label:'Portland Rain Bowl',city:'Portland',market:64,base:51,loyalty:63,cash:108,climate:'rain',tag:'rain, grass roots, tough travel'},
  {k:'slc',label:'Salt Lake Mountain',city:'Salt Lake',market:60,base:50,loyalty:68,cash:112,climate:'cold',tag:'altitude, cold, patient fans'}
];
const SETUP_STADIUMS=[
  {k:'open_grass',label:'Open-Air Grass Cathedral',name:'{city} Field',roof:'open',surface:'grass',cap:69000,quality:78,ticket:124,tag:'classic sight lines, real grass wear'},
  {k:'river_grass',label:'Riverfront Natural Bowl',name:'{city} River Bowl',roof:'open',surface:'grass',cap:64000,quality:73,ticket:112,tag:'wind corridors, muddy rain games'},
  {k:'snow_fort',label:'Tundra Fortress',name:'{city} Tundra Fortress',roof:'open',surface:'grass',cap:71000,quality:82,ticket:130,tag:'snow piles, loud lower bowl'},
  {k:'desert_canopy',label:'Desert Canopy',name:'{city} Canopy',roof:'retract',surface:'grass',cap:66500,quality:86,ticket:158,tag:'shade panels, fast dry grass'},
  {k:'retro_concrete',label:'Retro Concrete Bowl',name:'{city} Municipal Bowl',roof:'open',surface:'turf',cap:61500,quality:61,ticket:88,tag:'old-school noise, hard turf'},
  {k:'black_dome',label:'Black Box Dome',name:'{city} Black Box',roof:'dome',surface:'turf',cap:65000,quality:88,ticket:174,tag:'lights, speed, no weather'},
  {k:'mega_dome',label:'Megastructure Dome',name:'{city} Megastructure',roof:'dome',surface:'turf',cap:82000,quality:93,ticket:205,tag:'massive board, luxury revenue'},
  {k:'retract_vault',label:'Retractable Sky Vault',name:'{city} Sky Vault',roof:'retract',surface:'turf',cap:73500,quality:91,ticket:188,tag:'weather control, big-event feel'},
  {k:'coastal_wave',label:'Coastal Wave Stadium',name:'{city} Wave Stadium',roof:'open',surface:'grass',cap:70200,quality:87,ticket:167,tag:'ocean air, sunset games'},
  {k:'mountain_bowl',label:'Mountain Bowl',name:'{city} Mountain Bowl',roof:'open',surface:'grass',cap:67200,quality:79,ticket:129,tag:'altitude, swirls, grass divots'},
  {k:'tech_coliseum',label:'Tech Coliseum',name:'{city} Tech Coliseum',roof:'open',surface:'turf',cap:70500,quality:90,ticket:184,tag:'LED ribbons, clean lines'},
  {k:'party_deck',label:'Party-Deck Dome',name:'{city} Party Deck',roof:'dome',surface:'turf',cap:62200,quality:80,ticket:150,tag:'rowdy, compact, fast'},
  {k:'college_mega',label:'College Mega-Bowl',name:'{city} Alumni Stadium',roof:'open',surface:'grass',cap:90000,quality:74,ticket:92,tag:'huge capacity, old grass'},
  {k:'industrial_grid',label:'Industrial Gridiron',name:'{city} Industrial Grid',roof:'open',surface:'turf',cap:67600,quality:77,ticket:118,tag:'steel decks, wind, tough footing'},
  {k:'solar_terrace',label:'Solar Terrace',name:'{city} Solar Terrace',roof:'retract',surface:'grass',cap:68200,quality:89,ticket:162,tag:'sun control, pristine grass'},
  {k:'international',label:'International Showcase',name:'{city} Global Bowl',roof:'retract',surface:'grass',cap:76000,quality:86,ticket:172,tag:'neutral-site scale, mixed crowds'},
  {k:'soccer_convert',label:'Soccer Conversion',name:'{city} Grounds',roof:'open',surface:'grass',cap:53500,quality:70,ticket:104,tag:'tight sidelines, slippery grass'},
  {k:'noise_box',label:'Compact Noise Box',name:'{city} Noise Box',roof:'open',surface:'turf',cap:58500,quality:84,ticket:145,tag:'steep seats, chaos, artificial speed'},
  {k:'foundry',label:'Downtown Foundry',name:'{city} Foundry',roof:'retract',surface:'turf',cap:69200,quality:85,ticket:151,tag:'industrial roof, huge scoreboard'},
  {k:'palms',label:'Palm-Side Grass Bowl',name:'{city} Palm Bowl',roof:'open',surface:'grass',cap:65500,quality:83,ticket:140,tag:'heat shimmer, grass burn, open ends'}
];
function setupLoc(k){ return SETUP_LOCATIONS.find(x=>x.k===k); }
function setupStad(k){ return SETUP_STADIUMS.find(x=>x.k===k); }
function setupApplyTeamEdit(t, edit){
  if(!t||!edit) return t;
  if(edit.city) t.city=String(edit.city).trim().slice(0,32);
  if(edit.nick) t.nick=String(edit.nick).trim().slice(0,32);
  if(edit.abbr){ const a=String(edit.abbr).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4); if(a.length>=2) t.abbr=a; }   // the abbreviation follows the new identity
  if(edit.pri) t.pri=edit.pri;
  if(edit.sec) t.sec=edit.sec;
  const loc=setupLoc(edit.loc);
  if(loc){
    t.location={key:loc.k,label:loc.label,climate:loc.climate,tag:loc.tag,city:loc.city};
    t.market=loc.market; t.cash=Math.max(t.cash||0, loc.cash);
    t.fans=Object.assign({},t.fans||{}, {base:loc.base,morale:(t.fans&&t.fans.morale)||62,loyalty:loc.loyalty});
  }
  const st=setupStad(edit.stadium);
  if(st){
    const nm=(edit.stadiumName||st.name).replace('{city}', t.city||'Home');
    t.stadium=Object.assign({},t.stadium||{}, {name:nm,cap:st.cap,quality:st.quality,built:2026,ticket:st.ticket,
      roof:st.roof,surface:st.surface,profile:st.k,tag:st.tag,_custom:true,_named:true});
  } else if(edit.stadiumName && t.stadium){
    t.stadium.name=String(edit.stadiumName).trim().slice(0,48); t.stadium._custom=true; t.stadium._named=true;
  }
  return t;
}
function setupCloneTeam(t, edit){ const c=JSON.parse(JSON.stringify(t)); setupApplyTeamEdit(c, edit); return c; }
function setupClimateLabel(t){ const loc=t&&t.location; if(loc) return `${loc.label} · ${loc.climate}`; return `${t&&t.city?t.city:'Default'} market`; }

/* ===================== LEAGUE CUSTOMIZATION (setup + mid-save commissioner) ===================== */
const CUSTOM_PRESETS={
  realistic:{conferences:0,divisions:0,games:0,schedWeight:'division',playoffTeams:0,playoffReseed:true,injFreq:50,injSev:50,devSpeed:1,ageSpeed:1,classStrength:1,capBase:0,capGrowth:5,capFloor:89,draftRounds:7,draftOrder:'record',draftSnake:false,compPicks:true,tradeFuture:2,tradeDeadlinePct:52,aiTrade:'normal'},
  arcade:{injFreq:25,injSev:30,devSpeed:1.3,ageSpeed:0.75,classStrength:1.3,capGrowth:8,capFloor:0,draftOrder:'record',aiTrade:'frenzy',tradeFuture:3},
  hardcore:{injFreq:75,injSev:70,devSpeed:0.75,ageSpeed:1.3,classStrength:0.7,capGrowth:4,capFloor:90,draftOrder:'record',aiTrade:'normal',tradeFuture:2},
  sandbox:{injFreq:50,injSev:50,devSpeed:1,ageSpeed:1,classStrength:1.3,capBase:400,capGrowth:8,capFloor:0,draftOrder:'lottery',draftSnake:true,aiTrade:'frenzy',tradeFuture:3},
  classic:{divisions:4,games:0,schedWeight:'division',playoffTeams:7,injFreq:50,injSev:50,devSpeed:1,ageSpeed:1,classStrength:1,capGrowth:5,draftRounds:7,draftOrder:'record'}
};
function customizeHTML(r){ r=Object.assign({},DEFAULT_RULES,r||{});
  const sel=(id,cur,opts)=>`<select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
  const chk=(id,cur)=>`<input type="checkbox" id="${id}" ${cur?'checked':''}>`;
  const rng=(id,cur,mn,mx)=>`<input type="range" id="${id}" min="${mn}" max="${mx}" value="${cur}" oninput="if(this.nextElementSibling)this.nextElementSibling.textContent=this.value"> <b style="min-width:30px;display:inline-block">${cur}</b>`;
  const row=(label,ctrl)=>`<label class="opt"><span>${label}</span> ${ctrl}</label>`;
  return `<div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">⚙ Customize League</h3>
      <label class="opt" style="margin:0">Quick setup ${sel('c_preset','',[['','Custom…'],['realistic','Realistic Sim'],['arcade','Arcade'],['hardcore','Hardcore Ironman'],['sandbox','Sandbox'],['classic','Classic NFL']])}</label></div>
    <div class="muted" style="font-size:11px;margin:2px 0 8px">Pick a preset or tune any of it — all optional; defaults play like the real NFL.</div>
    <div class="rulesgrid">
      ${row('Conferences', sel('c_conf', r.conferences||0, [['0','Keep'],['2','2'],['3','3'],['4','4']]))}
      ${row('Divisions / conf', sel('c_div', r.divisions||0, [['0','Keep'],['2','2'],['3','3'],['4','4'],['6','6'],['8','8']]))}
      ${row('Games / season', sel('c_games', r.games||0, [['0','Auto'],['9','9'],['12','12'],['14','14'],['16','16'],['17','17'],['18','18']]))}
      ${row('Schedule', sel('c_weight', r.schedWeight, [['division','Division-weighted'],['balanced','Balanced']]))}
      ${row('Playoff teams / conf', sel('c_poteams', r.playoffTeams||0, [['0','Auto'],['1','1'],['2','2'],['4','4'],['6','6'],['7','7']]))}
      ${row('Reseed each round', chk('c_reseed', r.playoffReseed!==false))}
      ${row('Salary cap $M (0=preset)', `<input type="number" id="c_capbase" min="0" max="900" step="10" value="${r.capBase||0}" style="width:78px">`)}
      ${row('Cap growth %/yr', rng('c_capgrow', r.capGrowth, 0, 12))}
      ${row('Cap floor %', rng('c_capfloor', r.capFloor, 0, 100))}
      ${row('Injury frequency', rng('c_injfreq', r.injFreq, 0, 100))}
      ${row('Injury severity', rng('c_injsev', r.injSev, 0, 100))}
      ${row('Development speed', sel('c_dev', r.devSpeed, [['0.75','Slow'],['1','Normal'],['1.3','Fast']]))}
      ${row('Aging / decline', sel('c_age', r.ageSpeed, [['0.75','Gentle'],['1','Normal'],['1.3','Harsh']]))}
      ${row('Draft class strength', sel('c_class', r.classStrength, [['0.7','Weak'],['1','Normal'],['1.3','Strong'],['1.6','Stacked']]))}
      ${row('Draft rounds', sel('c_rounds', r.draftRounds, [1,2,3,4,5,6,7,8,9,10].map(x=>[x,String(x)])))}
      ${row('Draft order', sel('c_order', r.draftOrder, [['record','Inverse record'],['lottery','Lottery']]))}
      ${row('Snake draft', chk('c_snake', r.draftSnake))}
      ${row('Compensatory picks', chk('c_comp', r.compPicks!==false))}
      ${row('Trade future picks', sel('c_future', r.tradeFuture, [['0','None'],['1','1 yr'],['2','2 yrs'],['3','3 yrs']]))}
      ${row('Trade deadline (% season)', rng('c_deadline', r.tradeDeadlinePct, 30, 90))}
      ${row('AI trade market', sel('c_aitrade', r.aiTrade, [['calm','Calm'],['normal','Normal'],['frenzy','Frenzy']]))}
    </div>`;
}
function readCustomizeRules(){ const v=id=>{const e=$('#'+id);return e?e.value:undefined;}, ck=id=>{const e=$('#'+id);return e?e.checked:undefined;};
  const o={}, num=(k,id)=>{const x=v(id); if(x!=null&&x!=='')o[k]=+x;}, str=(k,id)=>{const x=v(id); if(x!=null)o[k]=x;}, bool=(k,id)=>{const x=ck(id); if(x!=null)o[k]=x;};
  num('conferences','c_conf'); num('divisions','c_div'); num('games','c_games'); str('schedWeight','c_weight');
  num('playoffTeams','c_poteams'); bool('playoffReseed','c_reseed');
  num('capBase','c_capbase'); num('capGrowth','c_capgrow'); num('capFloor','c_capfloor');
  num('injFreq','c_injfreq'); num('injSev','c_injsev');
  num('devSpeed','c_dev'); num('ageSpeed','c_age'); num('classStrength','c_class');
  num('draftRounds','c_rounds'); str('draftOrder','c_order'); bool('draftSnake','c_snake'); bool('compPicks','c_comp');
  num('tradeFuture','c_future'); num('tradeDeadlinePct','c_deadline'); str('aiTrade','c_aitrade');
  return o; }
function applyCustomPreset(name){ const p=CUSTOM_PRESETS[name]; if(!p) return;
  const set=(id,val)=>{const e=$('#'+id); if(!e)return; if(e.type==='checkbox')e.checked=!!val; else { e.value=val; const b=e.nextElementSibling; if(b&&b.tagName==='B')b.textContent=val; }};
  const M={conferences:'c_conf',divisions:'c_div',games:'c_games',schedWeight:'c_weight',playoffTeams:'c_poteams',playoffReseed:'c_reseed',capBase:'c_capbase',capGrowth:'c_capgrow',capFloor:'c_capfloor',injFreq:'c_injfreq',injSev:'c_injsev',devSpeed:'c_dev',ageSpeed:'c_age',classStrength:'c_class',draftRounds:'c_rounds',draftOrder:'c_order',draftSnake:'c_snake',compPicks:'c_comp',tradeFuture:'c_future',tradeDeadlinePct:'c_deadline',aiTrade:'c_aitrade'};
  Object.keys(p).forEach(k=>{ if(M[k])set(M[k],p[k]); }); }
window.applyCustomPreset=applyCustomPreset;
function commishModal(){ if(!G)return; closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=e=>{if(e.target.id==='ovl')closeOvl();};
  const box=el('div','card'); box.style.cssText='max-width:680px;width:94%;max-height:88vh;overflow:auto';
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:4px"><h2 style="margin:0">🏛 Commissioner — League Settings</h2><button class="btn sec" id="cmx">✕</button></div>
    <p class="muted" style="font-size:12px;margin:0 0 8px">Tune the league mid-dynasty. Dials (injuries, development, cap growth, draft & trade rules) take effect right away; structure & schedule changes apply next season.</p>
    ${customizeHTML(G.rules)}
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn" id="cmapply">Apply settings</button><button class="btn sec" id="cmcancel">Cancel</button></div>`;
  o.appendChild(box); document.body.appendChild(o);
  const ps=$('#c_preset'); if(ps)ps.onchange=()=>applyCustomPreset(ps.value);
  $('#cmx').onclick=closeOvl; $('#cmcancel').onclick=closeOvl;
  $('#cmapply').onclick=()=>{ Object.assign(G.rules, readCustomizeRules()); if(G.rules.capBase>0)G.capMax=G.rules.capBase;
    addNews('LEAGUE','The competition committee updated the league settings.'); save(); closeOvl(); toast('League settings updated.'); render(); };
}
window.commishModal=commishModal;
function setupScreen(){
  const teams=GAMEDATA.teams;
  const leagueList=(window.LEAGUES?LEAGUES.list():[{key:'nfl',name:'NFL 2026',size:30}]);
  let leagueKey='nfl', curTeams=teams, chosen=teams[0].abbr, teamEdits={};
  let active=new Set(teams.slice(0,30).map(t=>t.abbr));
  const currentLimit=()=> leagueKey==='nfl' ? +($('#nteams')?$('#nteams').value:30) : curTeams.length;
  const shownTeams=()=>curTeams.slice().sort((a,b)=>String(a.conf||'').localeCompare(String(b.conf||''))||String(a.div||'').localeCompare(String(b.div||''))||a.abbr.localeCompare(b.abbr));
  // pick `target` teams split evenly across conferences, then spread across divisions — never all-one-conference
  const balancedPick=(target)=>{ const pool=curTeams.slice(); const cap=Math.max(1,Math.min(target,pool.length));
    const byConf={}; pool.forEach(t=>{ (byConf[t.conf||'?']=byConf[t.conf||'?']||[]).push(t); });
    const confs=Object.keys(byConf).sort(); const sel=new Set(); let per=Math.floor(cap/confs.length), extra=cap-per*confs.length;
    confs.forEach(cf=>{ let take=per+(extra-->0?1:0); const byDiv={}; byConf[cf].forEach(t=>{ (byDiv[t.div||'?']=byDiv[t.div||'?']||[]).push(t); });
      const divs=Object.keys(byDiv); let di=0,guard=0;
      while(take>0 && guard++<300){ if(divs.every(d=>!byDiv[d].length)) break; const d=divs[di++%divs.length]; if(byDiv[d]&&byDiv[d].length){ sel.add(byDiv[d].shift().abbr); take--; } } });
    return sel; };
  const resetActive=()=>{ active=new Set(shownTeams().map(t=>t.abbr)); chosen=shownTeams()[0]?shownTeams()[0].abbr:chosen; };
  const wrap=el('div'); wrap.id='setup';
  wrap.innerHTML=`<h1><b>FPS</b> FOOTBALL <i>2026</i></h1>
   <p class="sub">Build the league first, then take the headset.</p>
   <div id="savedwrap"></div>
   <div class="card" style="margin:14px 0"><h3>Choose a League</h3>
     <div class="row" style="flex-wrap:wrap;gap:8px;align-items:center">
       <select id="leaguePick" style="min-width:200px">${leagueList.map(l=>`<option value="${l.key}">${l.name} (${l.size} teams)</option>`).join('')}</select>
       <span class="muted" id="leagueBlurb" style="flex:1;font-size:12px">The real 2026 NFL — 30 teams, real rosters.</span></div>
   </div>
   ${window.UNIVERSES?`<div class="card" id="univcard" style="margin:14px 0;border:1px solid #3a4a7a;background:radial-gradient(circle at 50% 0%, #6d28d918, transparent 70%)">
     <h3 style="margin:0">🌌 Or drop into a Universe</h3>
     <p class="muted" style="margin:4px 0 10px;font-size:12px">Original leagues with a fabricated past — dynasties, droughts, a record book. Read last season's story in the Gazette, then write the next chapter.</p>
     <div class="row" style="flex-wrap:wrap;gap:8px" id="univbtns">
       ${UNIVERSES.keys.map(k=>{const u=UNIVERSES.defs[k];return `<button class="btn" data-univ="${k}" style="flex:1 1 30%;min-width:140px;text-align:left;padding:9px 11px"><b>${u.name}</b><br><span class="muted" style="font-size:11px">${u.size} teams · ${u.era} seasons of history</span></button>`;}).join('')}
     </div></div>`:''}
   <div class="card" id="sizecard" style="margin:14px 0">
     <h3>League Size</h3>
     <div class="row"><input id="nteams" type="range" min="8" max="40" value="30"><b id="ntlbl" style="min-width:90px">30 teams</b></div>
     <p class="muted" id="ntdesc" style="margin:6px 0 0">Full 2026 NFL (30 teams, 8 divisions).</p>
   </div>
   <div class="card"><h3>Start Mode</h3>
     <label class="opt"><input type="radio" name="mode" value="keep" checked> <b>Keep real 2026 rosters</b> — every team as it stands today.</label>
     <label class="opt"><input type="radio" name="mode" value="fantasy"> <b>Fantasy Draft</b> — all players go into one pool; every team drafts from scratch (snake order).</label>
     <div id="fpool" style="display:none;margin:8px 0 2px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#0a121d">
       <h3 style="margin-bottom:5px">Fantasy Player Pool</h3>
       <div class="rulesgrid">
        <label class="opt"><input type="radio" name="fpool" value="all" checked> <b>All players</b> — the whole loaded player universe enters the draft.</label>
        <label class="opt"><input type="radio" name="fpool" value="selected"> <b>Selected teams only</b> — draft only from the teams you activated.</label>
        <label class="opt"><input type="radio" name="fpool" value="fictional"> <b>Fictional archetypes</b> — invented players modeled after real role types.</label>
       </div>
     </div>
   </div>
   <div class="card"><h3>League Rules</h3><div class="rulesgrid">
     <label class="opt"><input type="checkbox" id="r_2pt" checked> Two-point conversions</label>
     <label class="opt"><input type="checkbox" id="r_inj" checked> Injuries</label>
     <label class="opt"><input type="checkbox" id="r_cap" checked> Salary cap enforced</label>
     <label class="opt"><input type="checkbox" id="r_dead" checked> Dead money on cuts &amp; trades <span class="muted" style="font-size:11px">— uncheck for a <b>simple cap</b>: release a player, reclaim his full salary, no penalty</span></label>
     <label class="opt"><span>Overtime</span> <select id="r_ot"><option value="sudden">Sudden death</option><option value="full">Full period</option></select></label>
     <label class="opt"><span>Quarter length</span> <select id="r_q"><option value="15">15 min</option><option value="12">12 min</option><option value="10">10 min</option></select></label>
     <label class="opt"><span>Difficulty</span> <select id="r_diff"><option value="easy">Easy</option><option value="normal" selected>Normal</option><option value="hard">Hard</option><option value="ironman">Ironman</option></select></label>
     <label class="opt"><span>Scenario</span> <select id="r_scn"><option value="none" selected>None — standard start</option><option value="rebuild">Teardown rebuild</option><option value="caphell">Cap hell</option><option value="winnow">Win-now mandate</option></select></label>
   </div><p class="muted" style="font-size:11px;margin:6px 2px 0">Difficulty tunes your game edge, the AI's trade savvy, free-agent competition, and owner patience. Scenarios change your starting situation.</p></div>
   <div class="card" id="customizecard">${customizeHTML(DEFAULT_RULES)}</div>
   <div class="card"><h3>League Lab</h3>
     <div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
       <div>
        <div id="teamSummary" class="muted" style="font-size:12px"></div>
        <div class="muted" style="font-size:11px;margin-top:4px">👤 Click <b>Coach</b> on the team you want to control. Toggle <b>In league / Add</b> to set who else is in. <b>Edit</b> changes identity, market or stadium.</div>
       </div>
       <div class="row" style="gap:7px;flex-wrap:wrap">
        <button class="btn sec" style="padding:5px 10px" id="actall">Select all</button>
        <button class="btn sec" style="padding:5px 10px" id="actbalanced">⚖ Balanced fill</button>
        <button class="btn sec" style="padding:5px 10px" id="actrandom">🎲 Random</button>
        <button class="btn sec" style="padding:5px 10px" id="actclear">Clear</button>
       </div>
     </div>
     <div class="teamgrid setup-grid" id="tgrid"></div>
   </div>
   <div class="row" style="margin-top:16px"><button class="btn" id="startbtn">Start Dynasty →</button>
   <button class="btn sec" id="loadbtn">Load Saved</button></div>`;
  document.body.innerHTML=''; document.body.appendChild(wrap);
  // ---- saved careers (continue / load / delete) ----
  (function(){ const slots=listSlots(); const sw=$('#savedwrap'); if(!slots.length){ sw.style.display='none'; return; }
    const c=el('div','card'); c.style.margin='14px 0'; c.innerHTML='<h3>📁 Continue a Career</h3>';
    slots.slice(0,8).forEach(s=>{ const t=teams.find(x=>x.abbr===s.team);
      const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px';
      row.innerHTML=`<div>${t?logoTag(t,22):''} <b>${esc(s.name)}</b><div class="muted" style="font-size:11px">${s.team||'?'} · Season ${s.season} · ${s.phase==='regular'?'Week '+(s.week+1):s.phase} · saved ${timeAgo(s.ts)}</div></div>
        <div class="flex" style="gap:6px"><button class="btn" style="padding:4px 12px" data-load="${s.id}">Continue</button><button class="btn sec" style="padding:4px 10px" data-del="${s.id}">✕</button></div>`;
      c.appendChild(row); });
    sw.appendChild(c);
    sw.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{ if(loadSlot(b.dataset.load)){ VIEW='week'; boot(); } else toast('Load failed'); });
    sw.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this saved career?')){ deleteSlot(b.dataset.del); setupScreen(); } });
  })();
  const grid=$('#tgrid'); const ns=$('#nteams');
  function previewTeam(t){ return setupCloneTeam(t, teamEdits[t.abbr]); }
  const drawGrid=()=>{ const list=shownTeams(); grid.innerHTML=''; if(!list.find(t=>t.abbr===chosen)&&list[0]) chosen=list[0].abbr;
    const activeShown=list.filter(t=>active.has(t.abbr));
    const confCounts={}; activeShown.forEach(t=>{ confCounts[t.conf||'?']=(confCounts[t.conf||'?']||0)+1; });
    const cKeys=Object.keys(confCounts).sort(), cStr=cKeys.map(c=>`${confCounts[c]} ${c}`).join(' · ');
    const cVals=cKeys.map(c=>confCounts[c]), bal=cVals.length<=1||(Math.min.apply(0,cVals) >= Math.max.apply(0,cVals)*0.66);
    if($('#teamSummary')) $('#teamSummary').innerHTML=`<b>${activeShown.length}</b> of ${shownTeams().length} teams in · 👤 you coach <b>${esc(chosen)}</b>${cStr?` · <b style="color:${bal?'var(--good)':'#ff7b7b'}">${cStr} ${bal?'✓ balanced':'⚠ lopsided'}</b>`:''} · ${document.querySelector('input[name=mode]:checked')&&document.querySelector('input[name=mode]:checked').value==='fantasy'?'fantasy draft':'real rosters'}`;
    list.forEach(t=>{
      const v=previewTeam(t), isActive=active.has(t.abbr), edited=!!teamEdits[t.abbr];
      const d=el('div','tsel setup-tile'+(t.abbr===chosen?' on':isActive?' in':' off')); d.style.borderLeft='4px solid '+(isActive?(v.pri||t.pri):'#2a3550');
      d.innerHTML=`<div class="setup-actions"><label class="mini-check" style="color:${isActive?'var(--good,#46d39a)':'var(--dim)'}"><input type="checkbox" data-active="${t.abbr}" ${isActive?'checked':''}> ${isActive?'✓ In league':'+ Add'}</label><div style="display:flex;gap:5px"><button class="btn ${t.abbr===chosen?'':'sec'}" style="padding:3px 8px;font-size:10px" data-pick="${t.abbr}">${t.abbr===chosen?'👤 You':'Coach'}</button><button class="btn sec" style="padding:3px 8px" data-edit="${t.abbr}">${edited?'Edit*':'Edit'}</button></div></div>
        ${t.abbr===chosen?`<div style="background:var(--acc);color:#04101e;font-weight:800;font-size:9.5px;letter-spacing:1px;padding:2px 7px;border-radius:6px;margin-bottom:7px;text-transform:uppercase;display:inline-block">👤 Your Team</div>`:''}<div class="tselrow">${logoTag(v,28)}<div><div class="ab" style="color:${(v.pri||'')==='#101010'||(v.pri||'')==='#0b1220'?'#ccc':v.pri}">${v.abbr}</div><div class="nm">${esc(v.city)} ${esc(v.nick)}</div></div></div>
        <div class="muted" style="font-size:10.5px;margin-top:8px;line-height:1.35"><span class="tag" style="font-size:9px">${esc(t.conf||'')} ${esc(t.div||'')}</span><br>${esc(v.stadium&&v.stadium.name?v.stadium.name:'Default stadium')}<br>${esc(setupClimateLabel(v))}</div>`;
      d.onclick=e=>{ if(e.target.closest('button')||e.target.closest('label')) return; active.add(t.abbr); chosen=t.abbr; drawGrid(); };
      d.querySelector('[data-active]').onchange=e=>{ if(e.target.checked) active.add(t.abbr); else active.delete(t.abbr);
        if(!active.has(chosen)){ const first=list.find(x=>active.has(x.abbr)); if(first) chosen=first.abbr; }
        drawGrid(); };
      d.querySelector('[data-edit]').onclick=e=>{ e.stopPropagation(); openTeamEditor(t.abbr); };
      d.querySelector('[data-pick]').onclick=e=>{ e.stopPropagation(); active.add(t.abbr); chosen=t.abbr; drawGrid(); };
      grid.appendChild(d);
    });
  };
  const upd=()=>{ const n=+ns.value; $('#ntlbl').textContent=n+' teams';
    $('#ntdesc').textContent = n<curTeams.length?`Reduced ${n}-team league — auto-picked balanced across conferences; toggle any team below.`: n===curTeams.length?`Full league (${curTeams.length} teams).`: `Expanded ${n}-team league — ${n-curTeams.length} expansion franchise(s) added.`;
    active = n>=curTeams.length ? new Set(curTeams.map(t=>t.abbr)) : balancedPick(n);
    if(!active.has(chosen)){ const fa=[...active][0]; if(fa) chosen=fa; }
    drawGrid(); };
  ns.oninput=upd; upd();
  function openTeamEditor(abbr){
    const base=curTeams.find(t=>t.abbr===abbr); if(!base) return;
    const e=Object.assign({city:base.city,nick:base.nick,abbr:base.abbr,pri:base.pri,sec:base.sec,loc:'',stadium:'',stadiumName:''}, teamEdits[abbr]||{});
    const v=setupCloneTeam(base,e);
    const locOptions='<option value="">Keep current market</option>'+SETUP_LOCATIONS.map(x=>`<option value="${x.k}" ${e.loc===x.k?'selected':''}>${x.label} — ${x.city}</option>`).join('');
    const stadOptions='<option value="">Keep current stadium</option>'+SETUP_STADIUMS.map(x=>`<option value="${x.k}" ${e.stadium===x.k?'selected':''}>${x.label} (${x.surface}, ${x.roof})</option>`).join('');
    closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=ev=>{ if(ev.target.id==='ovl') closeOvl(); };
    const box=el('div','card'); box.style.cssText='max-width:720px;width:94%;max-height:88vh;overflow:auto';
    box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:flex-start">
       <div><h2 style="font-family:var(--disp);letter-spacing:.5px;margin:0;text-transform:uppercase">Edit ${esc(base.abbr)}</h2>
       <div class="muted" style="font-size:12px">${esc(v.city)} ${esc(v.nick)} · ${esc(v.stadium&&v.stadium.name?v.stadium.name:'Default stadium')}</div></div>
       <button class="btn sec" id="edClose">X</button></div>
      <div class="split" style="margin-top:14px">
       <div>
        <label class="opt"><span>City</span><input id="edCity" type="text" value="${esc(e.city)}"></label>
        <label class="opt"><span>Nickname</span><input id="edNick" type="text" value="${esc(e.nick)}"></label>
        <label class="opt"><span>Abbreviation</span><input id="edAbbr" type="text" maxlength="4" style="text-transform:uppercase" value="${esc(e.abbr||'')}"> <button class="btn sec" type="button" id="edAbbrAuto" style="padding:2px 8px;font-size:11px">Auto</button></label>
        <label class="opt"><span>Primary</span><input id="edPri" type="color" value="${esc(e.pri||'#5bbcff')}"></label>
        <label class="opt"><span>Secondary</span><input id="edSec" type="color" value="${esc(e.sec||'#ffffff')}"></label>
       </div>
       <div>
        <label class="opt"><span>Location</span><select id="edLoc">${locOptions}</select></label>
        <label class="opt"><span>Stadium</span><select id="edStadium">${stadOptions}</select></label>
        <label class="opt"><span>Name</span><input id="edStadiumName" type="text" placeholder="Optional custom stadium name" value="${esc(e.stadiumName||'')}"></label>
       </div>
      </div>
      <div id="edPreview" class="card" style="margin-top:12px;background:#0c1320"></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn sec" id="edReset">Reset</button><button class="btn" id="edSave">Save Team</button></div>`;
    ov.appendChild(box); document.body.appendChild(ov);
    const readEdit=()=>({city:box.querySelector('#edCity').value.trim(),nick:box.querySelector('#edNick').value.trim(),abbr:box.querySelector('#edAbbr').value.trim().toUpperCase(),pri:box.querySelector('#edPri').value,
      sec:box.querySelector('#edSec').value,loc:box.querySelector('#edLoc').value,stadium:box.querySelector('#edStadium').value,stadiumName:box.querySelector('#edStadiumName').value.trim()});
    const taken=()=>curTeams.filter(x=>x.abbr!==abbr).map(x=>(teamEdits[x.abbr]&&teamEdits[x.abbr].abbr)||x.abbr);
    const autoAbbr=()=>{ const f=box.querySelector('#edAbbr'); if(window.suggestAbbr) f.value=suggestAbbr(box.querySelector('#edCity').value,box.querySelector('#edNick').value,taken()); updatePreview(); };
    const updatePreview=()=>{ const p=setupCloneTeam(base, readEdit()), loc=p.location, st=p.stadium||{};
      box.querySelector('#edPreview').innerHTML=`<div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div>${logoTag(p,34)} <b>${esc(p.city)} ${esc(p.nick)}</b><div class="muted" style="font-size:12px">${esc(st.name||'Default Stadium')} · ${esc(st.surface||'default surface')} · ${esc(st.roof||'open')}</div></div><div><span class="tag">Market ${p.market||'-'}</span> <span class="tag">Fans ${(p.fans&&p.fans.base)||'-'}</span> <span class="tag">Loyalty ${(p.fans&&p.fans.loyalty)||'-'}</span></div></div><div class="muted" style="margin-top:8px;font-size:12px">${esc(loc?loc.tag:'Keeps the original city climate and fan profile.')}${st.tag?` · ${esc(st.tag)}`:''}</div>`; };
    box.querySelectorAll('input,select').forEach(x=>x.oninput=updatePreview); updatePreview();
    { const ab=box.querySelector('#edAbbrAuto'); if(ab) ab.onclick=autoAbbr; if(!e.abbr) autoAbbr(); }
    box.querySelector('#edClose').onclick=closeOvl;
    box.querySelector('#edReset').onclick=()=>{ delete teamEdits[abbr]; active.add(abbr); chosen=abbr; closeOvl(); drawGrid(); };
    box.querySelector('#edSave').onclick=()=>{ teamEdits[abbr]=readEdit(); active.add(abbr); chosen=abbr; closeOvl(); drawGrid(); };
  }
  // ---- league picker ----
  const lp=$('#leaguePick');
  if(lp) lp.onchange=()=>{ leagueKey=lp.value; curTeams=window.LEAGUES?LEAGUES.teamDefs(leagueKey):teams; chosen=curTeams[0].abbr;
    teamEdits={};
    const pr=window.LEAGUES&&LEAGUES.presets[leagueKey]; if($('#leagueBlurb'))$('#leagueBlurb').textContent=pr?pr.blurb:'';
    $('#sizecard').style.display = leagueKey==='nfl'?'':'none';   // only the NFL preset is resizable
    resetActive(); if(leagueKey==='nfl'){ upd(); } else { drawGrid(); } };
  // ---- universe quick-pick: set the league dropdown + draw its team grid so you can pick a club ----
  document.querySelectorAll('#univbtns [data-univ]').forEach(b=>{ b.onclick=e=>{ e.preventDefault();
    const k=b.getAttribute('data-univ'); if(lp){ lp.value=k; lp.onchange(); }
    document.querySelectorAll('#univbtns [data-univ]').forEach(x=>x.style.outline=''); b.style.outline='2px solid #8b7bff';
    const sc=$('#teamgrid')||$('#sizecard'); if(sc&&sc.scrollIntoView) sc.scrollIntoView({behavior:'smooth',block:'center'}); }; });
  document.querySelectorAll('input[name=mode]').forEach(r=>r.onchange=()=>{ $('#fpool').style.display=r.value==='fantasy'&&r.checked?'block':(document.querySelector('input[name=mode]:checked').value==='fantasy'?'block':'none'); drawGrid(); });
  const _ensureChosen=()=>{ if(!active.has(chosen)){ const fa=[...active][0]; if(fa) chosen=fa; } };
  $('#actall').onclick=()=>{ active=new Set(curTeams.map(t=>t.abbr)); drawGrid(); };
  $('#actbalanced').onclick=()=>{ active=balancedPick(Math.min(+ns.value,curTeams.length)); _ensureChosen(); drawGrid(); };
  $('#actclear').onclick=()=>{ active=new Set([chosen]); drawGrid(); };
  $('#actrandom').onclick=()=>{ const pool=curTeams.slice(); for(let i=pool.length-1;i>0;i--){ const j=Math.floor(ENG.rng()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; } active=new Set(pool.slice(0,Math.min(+ns.value,pool.length)).map(t=>t.abbr)); active.add(chosen); _ensureChosen(); drawGrid(); };
  { const cps=$('#c_preset'); if(cps)cps.onchange=()=>applyCustomPreset(cps.value); }
  $('#startbtn').onclick=()=>{
    const list=shownTeams(), activeList=list.filter(t=>active.has(t.abbr)).map(t=>t.abbr);
    if(activeList.length<4){ toast('Activate at least four teams.'); return; }
    if(!active.has(chosen)){ chosen=activeList[0]; }
    const opts={ league:leagueKey, fantasy: document.querySelector('input[name=mode]:checked').value==='fantasy',
      fantasyPool:(document.querySelector('input[name=fpool]:checked')||{}).value||'all',
      setup:{active:activeList, edits:teamEdits},
      difficulty:($('#r_diff')||{}).value||'normal', scenario:($('#r_scn')||{}).value||'none',
      rules:Object.assign({ twoPoint:$('#r_2pt').checked, injuries:$('#r_inj').checked, salaryCap:$('#r_cap').checked,
        deadMoney:$('#r_dead')?$('#r_dead').checked:true,
        overtime:$('#r_ot').value, quarter:+$('#r_q').value }, readCustomizeRules()) };
    const _tgt=+ns.value, _n = leagueKey!=='nfl' ? curTeams.length : (_tgt>curTeams.length ? _tgt : activeList.length);
    newLeague(_n, chosen, opts);
  };
  $('#loadbtn').onclick=()=>{ if(load()){ boot(); } else toast('No save found'); };
}

function expansionTeam(i){
  const cities=[['San Antonio','Stallions','SA','#0a3d62','#e58e26'],['Portland','Pioneers','POR','#2c3e50','#27ae60'],
    ['Oklahoma City','Outlaws','OKC','#6c2c2f','#d4a017'],['Salt Lake','Sentinels','SLC','#1b3a4b','#9b59b6'],
    ['Louisville','Lightning','LOU','#1e272e','#feca57'],['Memphis','Mavericks','MEM','#34495e','#1abc9c'],
    ['Omaha','Outpost','OMA','#2d3436','#0984e3'],['Honolulu','Hammerheads','HON','#006266','#f6b93b'],
    ['Sacramento','Surge','SAC','#5758BB','#fdcb6e'],['Toronto','Thunder','TOR','#b71540','#3c6382']];
  const c=cities[i%cities.length];
  return {abbr:c[2],city:c[0],nick:c[1],conf:i%2?'AFC':'NFC',div:['East','North','South','West'][i%4],pri:c[3],sec:c[4]};
}

const DEFAULT_RULES={twoPoint:true,overtime:'sudden',injuries:true,salaryCap:true,deadMoney:true,quarter:15,
  // ---- league customization (all optional; 0/auto = derive from league size) ----
  divisions:0,                                  // divisions per conference (0 = keep preset structure)
  games:0, schedWeight:'division',              // season length (0=auto), schedule emphasis: 'division' | 'balanced'
  playoffTeams:0, playoffByes:1, playoffReseed:true,   // playoff field per conference (0=auto)
  capBase:0, capGrowth:5, capFloor:0,           // cap $M (0=preset), annual growth %, spending floor % (0=off)
  injFreq:50, injSev:50,                        // 0-100 sliders
  devSpeed:1, ageSpeed:1, classStrength:1,      // progression multipliers (.75 slow / 1 / 1.3 fast)
  draftRounds:7, draftOrder:'record', draftSnake:false, compPicks:true,   // draft config
  tradeFuture:2, tradeDeadlinePct:52, aiTrade:'normal'};                   // future-pick years, deadline (% of season), AI market
// custom league STRUCTURE — re-bucket teams into N conferences and/or N divisions per conference, with optional custom names
function applyLeagueStructure(){ const r=(G&&G.rules)||{}, nc=r.conferences||0, nd=r.divisions||0; if(!nc&&!nd) return;
  const CN=(r.confNames&&r.confNames.length)?r.confNames:['American','National','Continental','Pacific'];
  const DN=(r.divNames&&r.divNames.length)?r.divNames:['East','North','South','West','Central','Atlantic','Pacific','Mountain'];
  if(nc) G.teams.forEach((t,i)=>{ t.conf=CN[i%nc]||('Conf '+(i%nc+1)); });
  if(nd){ const byConf={}; G.teams.forEach(t=>{ (byConf[t.conf=t.conf||'AFC']=byConf[t.conf]||[]).push(t); });
    Object.keys(byConf).forEach(cf=>{ const list=byConf[cf], per=Math.max(1,Math.ceil(list.length/nd));
      list.forEach((t,i)=>{ t.div=DN[Math.floor(i/per)]||('Div '+(Math.floor(i/per)+1)); }); }); } }
// Generated/fictional leagues use the lower genFiller/genLeagueTeam salary scale, so the
// real-NFL cap (GAMEDATA.capMax ≈ 279) never binds — teams sit far under it and FA is
// frictionless. Derive a cap from the league's own payrolls so a couple of clubs land over
// it (must trim/restructure) while the median keeps moderate room. Self-calibrates to any preset.
function generatedLeagueCap(teams){
  const pays=(teams||[]).map(t=>(t.roster||[]).reduce((a,p)=>a+(p.salary||0),0)).filter(x=>x>0).sort((a,b)=>a-b);
  if(pays.length<2) return null;
  const p80=pays[Math.min(pays.length-1,Math.floor(0.80*pays.length))];
  return ENG.clamp(Math.round(p80*1.06/5)*5, 90, GAMEDATA.capMax);   // round to $5M, never above the real cap
}
function newLeague(n, userAbbr, opts){
  opts=opts||{};
  // every new career gets its own RNG timeline (unique dynasties, scandals, draft classes). Tests can pass opts.seed for reproducibility.
  const seed = (opts.seed!=null) ? opts.seed : ((Date.now()>>>0) ^ Math.floor(Math.random()*0x7fffffff));
  ENG.reseed(seed);
  const lk=opts.league||'nfl';
  const presetTeams=(window.LEAGUES&&lk!=='nfl')?LEAGUES.build(lk):null;   // generated league, or null for the real NFL
  const setup=opts.setup||{};
  // when the user explicitly picked teams, start from the FULL pool so ANY team (not just the first n) can join; else legacy first-n.
  let baseTeams = presetTeams || ((setup.active && setup.active.length) ? GAMEDATA.teams.slice() : GAMEDATA.teams.slice(0,Math.min(n,GAMEDATA.teams.length)));
  const fantasySourceTeams=JSON.parse(JSON.stringify(baseTeams));           // "all players" fantasy drafts can still use the whole source pool
  if(setup.active && setup.active.length){
    const keep=new Set(setup.active); keep.add(userAbbr);
    baseTeams=baseTeams.filter(t=>keep.has(t.abbr));
    if(!baseTeams.find(t=>t.abbr===userAbbr) && baseTeams[0]) userAbbr=baseTeams[0].abbr;
  }
  if(setup.edits){ const ed=setup.edits[userAbbr]; baseTeams.forEach(t=>setupApplyTeamEdit(t, setup.edits[t.abbr]));
    if(ed && ed.abbr){ const na=String(ed.abbr).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4); if(na.length>=2 && baseTeams.some(t=>t.abbr===na)) userAbbr=na; }   // if you renamed your own franchise's abbr, you stay its GM
  }
  const presetRules=(window.LEAGUES?LEAGUES.rules(lk):{});
  G=JSON.parse(JSON.stringify({season:GAMEDATA.season,week:0,teams:baseTeams,league:lk,
    prospects:GAMEDATA.prospects,capMax:GAMEDATA.capMax,news:[],history:[],records:{},phase:'regular',playoffs:null,faPool:[],
    rules:Object.assign({},DEFAULT_RULES,presetRules,opts.rules||{}), fantasy:!!opts.fantasy, fantasyPool:opts.fantasyPool||'all'}));
  G.difficulty=opts.difficulty||'normal'; G.scenario=opts.scenario||null;   // GM-skill + starting-situation preset
  G.rules.userAbbr=userAbbr; G.rules.userEdge=diffEdge();                    // a point swing in the user's own simmed games
  if(G.fantasyPool!=='selected') G._fantasySourceTeams=fantasySourceTeams;
  // expansion: add teams beyond 30 with a quick expansion roster (NFL preset only)
  if(lk==='nfl' && n>GAMEDATA.teams.length){
    let pid=20000;
    for(let i=0;i<n-30;i++){ const t=expansionTeam(i);
      t.cap=G.capMax; t.market=ENG.ri(40,65); t.wins=0;t.losses=0;t.ties=0;t.pf=0;t.pa=0; t.cash=ENG.ri(30,70);
      t.stadium={name:t.city+' Field',cap:ENG.ri(58,68)*1000,quality:ENG.ri(55,80),built:2026,ticket:ENG.ri(80,140)};
      t.fans={base:ENG.ri(20,40),morale:60,loyalty:ENG.ri(30,55)};
      t.coach={name:'New Coach',ovr:ENG.ri(58,70),off:ENG.ri(55,72),def:ENG.ri(55,72)};
      t.owner={name:'Expansion Group',wealth:ENG.ri(50,95),patience:ENG.ri(60,90),ambition:ENG.ri(60,90)};
      t.roster=[]; ENG.QUOTA.forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){ pid++;
        const ovr=ENG.ri(58,72); const xp={id:pid,first:'FA',last:'Player'+pid,name:'Expansion '+pos+(k+1),pos,age:ENG.ri(22,29),ovr,num:'',attrs:{OVR:ovr},starter:k===0,depth:k+1,morale:62,salary:ENG.round1(Math.max(0.9,(ovr-55)*0.4)),years:ENG.ri(1,3)}; if(window.PHYS)PHYS.fresh(xp); t.roster.push(xp); } });
      t.capUsed=ENG.round1(t.roster.reduce((a,p)=>a+p.salary,0));
      G.teams.push(t);
    }
  }
  if(G.rules&&G.rules.capBase>0) G.capMax=G.rules.capBase;   // custom salary cap (explicit override wins)
  else if(lk!=='nfl'){ const fc=generatedLeagueCap(G.teams);   // fictional leagues: bind the cap to their lower salary scale
    if(fc){ G.capMax=fc; G.teams.forEach(t=>{ t.cap=fc; }); } }
  applyLeagueStructure();                                     // custom conferences/divisions
  USER=userAbbr;
  G._slot=newSlotId(); { const ut0=G.teams.find(x=>x.abbr===userAbbr); G._slotName=ut0?`${ut0.city} ${ut0.nick} dynasty`:'New career'; }
  G.prospects=makeProspectClass(G.season);                     // calibrated board: NFL-style rookie grades, fresh names
  if(window.ncaaInit) ncaaInit(true);                           // college universe starts immediately, not just in April
  G.teams.forEach(t=>t.roster.forEach(p=>{ ENG.ensureTraits(p); // give existing players intangibles too
    if(p.seasons==null||p.seasons===0) p.seasons=ENG.clamp((p.age||24)-22,0,16); // years pro ≈ age−22 so résumés/HOF read true
    seedHistory(p); }));   // back-fill real career stats + accolades for the opening veterans
  applyTwoWay();
  G.teams.forEach(t=>{ ENG.ensureStaff(t); ensureTeamPlaybook(t,true); ensurePicks(t); ensureScoutDept(t); repairRosterLegality(t,'new league'); t.roster.forEach(p=>{ p.stats=blankStats(); p.out=0; }); });   // legal rosters from day one
  G.teams.forEach(t=>{ ensureStadium(t); ensureFinance(t); });   // front-office economy: stadium amenities + finance levers from day one
  if(window.PHYS) PHYS.ensureLeague(G);   // position-calibrated ht/wt/40 + QB arm ratings
  applyStadiumNames();   // Futurist League branded stadium names + roof types
  G.schedule=ENG.buildSchedule(G.teams,{games:(G.rules&&G.rules.games)||0,weight:(G.rules&&G.rules.schedWeight)||'division'});
  G.maxWeek=G.schedule.length;
  announceInternationalSlate(assignInternationalGames(G.schedule));
  G.seed=seed;
  applyScenario(userAbbr);   // apply the starting-situation preset (rebuild / cap hell / win-now) before the owner sets a mandate
  G.startSeason=G.season; G._jobYears=1; { const u=G.teams.find(x=>x.abbr===userAbbr); ensureOwner(u); setExpectation(u); }   // owner mandate + hot seat
  if(G.fantasy){ fantasyDraft(); return; }   // fantasy draft takes over the boot flow
  addNews('LEAGUE',`The ${G.season} season is set — ${G.teams.length} teams, kickoff is here. Owner mandate: ${ut().owner.expectation.label}.`);
  if(window.UNIVERSES && UNIVERSES.isUniverse(lk)) UNIVERSES.apply(lk);   // fabricate the universe's history + Preseason Edition gazette
  save(); boot();
}
// ---- DIFFICULTY (GM skill) ----
function diffEdge(){ return ({easy:3,normal:0,hard:-3,ironman:-6})[(G&&G.difficulty)||'normal']; }   // points for/against the user per game
function diffFA(){ return ({easy:0.82,normal:1,hard:1.18,ironman:1.32})[(G&&G.difficulty)||'normal']; } // rival FA bidding aggressiveness
function diffOwner(){ return ({easy:0.6,normal:1,hard:1.35,ironman:1.7})[(G&&G.difficulty)||'normal']; } // how harshly the owner reacts
function diffLabel(){ return ({easy:'Easy',normal:'Normal',hard:'Hard',ironman:'Ironman'})[(G&&G.difficulty)||'normal']; }
// ---- SCENARIO PRESETS (applied once at league start, to the user's club) ----
function applyScenario(ab){ const t=team(ab); if(!t||!G.scenario||G.scenario==='none') return;
  if(G.scenario==='rebuild'){ t.roster.slice().sort((a,b)=>b.ovr-a.ovr).forEach((p,i)=>{ if(i<14){ p.ovr=ENG.clamp(p.ovr-ENG.ri(8,16),40,99); if(p.attrs)p.attrs.OVR=p.ovr; p.peak=Math.max(p.peak||p.ovr,p.ovr); } });
    t.cash=ENG.round1((t.cash||40)+20); addNews('LEAGUE',`Scenario — Teardown: you inherit a bare ${t.city} cupboard. Build it back.`); }
  else if(G.scenario==='caphell'){ t.dead=t.dead||[]; const over=ENG.round1((G.capMax||200)*0.12); t.dead.push({name:'Prior regime',amt:over,season:G.season});
    t.cash=ENG.round1(Math.min(t.cash||30,12)); addNews('LEAGUE',`Scenario — Cap Hell: the ${t.city} books carry $${over}M in dead money and no room. Dig out.`); }
  else if(G.scenario==='winnow'){ ensureOwner(t); t.owner.ambition=95; t.owner.patience=ENG.ri(34,48); t.owner._arch=null;
    t.cash=ENG.round1((t.cash||40)+40); addNews('LEAGUE',`Scenario — Win Now: the ${t.city} owner wants a title immediately. The war chest is full; the clock is loud.`); }
}
const STAT_KEYS=['pyd','ptd','intp','patt','pcmp','ryd','rtd','car','rec','recyd','rectd','tgt','tkl','sack','intc','fum','lng',
  'pass20','run10','rec20','xpass','xrush','xrec','big','pr','hurry','qbhit','tfl','pbu','ff','fr','sfty'];
function blankStats(){ const s={g:0}; STAT_KEYS.forEach(k=>s[k]=0); return s; }
function normalizeLineStats(l){
  if(!l) return l;
  if(l.ratt!=null && l.car==null) l.car=l.ratt;
  if(l.pint!=null && l.intp==null) l.intp=l.pint;
  if(l.dint!=null && l.intc==null) l.intc=l.dint;
  const n=k=>+l[k]||0, car=n('car'), rec=n('rec'), cmp=n('pcmp');
  if(l.pass20==null) l.pass20=Math.min(cmp, Math.max(0, Math.floor(n('pyd')/70)));
  if(l.rec20==null) l.rec20=Math.min(rec, Math.max(0, Math.floor(n('recyd')/45)));
  if(l.run10==null) l.run10=Math.min(car, Math.max(0, Math.floor(Math.max(0,n('ryd'))/38)));
  if(l.xpass==null) l.xpass=l.pass20||0;
  if(l.xrec==null) l.xrec=l.rec20||0;
  if(l.xrush==null) l.xrush=l.run10||0;
  if(l.big==null) l.big=(l.xpass||0)+(l.xrec||0)+(l.xrush||0);
  if(['DE','DT','OLB','ILB','CB','S'].includes(l.pos)){
    if(l.tfl==null) l.tfl=(n('sack')||0)+Math.floor(n('tkl')/6);
    if(l.qbhit==null) l.qbhit=Math.round(n('sack')*1.5 + (['DE','DT','OLB'].includes(l.pos)&&n('tkl')>=4?1:0));
    if(l.hurry==null) l.hurry=Math.round(n('sack')*1.8 + (['DE','DT','OLB'].includes(l.pos)?Math.max(0,n('tkl')-2)/5:0));
    if(l.pr==null) l.pr=(l.sack||0)+(l.qbhit||0)+(l.hurry||0);
    if(l.pbu==null) l.pbu=(n('intc')||0)+(['CB','S','ILB','OLB'].includes(l.pos)?Math.floor(n('tkl')/7):0);
  }
  return l;
}
function lineStatText(l){
  l=normalizeLineStats(l||{});
  const n=k=>+l[k]||0, bits=[];
  if(l.pos==='QB'||n('patt')||n('pyd')||n('ptd')||n('intp')) return `${n('pcmp')}/${n('patt')}, ${n('pyd')} yd, ${n('ptd')} TD${n('intp')?', '+n('intp')+' INT':''}`;
  if(n('car')||n('ryd')||n('rtd')) return `${n('car')} car, ${n('ryd')} yd, ${n('rtd')} TD`;
  if(n('rec')||n('recyd')||n('rectd')||n('tgt')) return `${n('rec')} rec, ${n('recyd')} yd, ${n('rectd')} TD${n('tgt')?' on '+n('tgt')+' tgt':''}`;
  if(n('tkl')) bits.push(`${n('tkl')} tkl`);
  if(n('sack')) bits.push(`${n('sack')} sk`);
  if(n('intc')) bits.push(`${n('intc')} INT`);
  if(n('tfl')) bits.push(`${n('tfl')} TFL`);
  if(n('pr')) bits.push(`${n('pr')} pressures`);
  return bits.join(', ')||l.stat||'played';
}
function lineFP(l){ l=normalizeLineStats(l||{}); return (l.pyd||0)*0.04+(l.ptd||0)*4-(l.intp||0)*2+(l.ryd||0)*0.1+(l.rtd||0)*6+(l.recyd||0)*0.1+(l.rectd||0)*6+(l.sack||0)*2+(l.intc||0)*3+(l.tkl||0)*0.35+(l.tfl||0)*0.5+(l.ff||0)*2+(l.fr||0)*2; }
function boxLineFromTally(x){
  const l={id:x.p.id,name:x.p.name,pos:x.p.pos,pyd:x.pyd||0,ptd:x.ptd||0,intp:x.intp||x.pint||0,ryd:x.ryd||0,rtd:x.rtd||0,
    recyd:x.recyd||0,rectd:x.rectd||0,rec:x.rec||0,patt:x.patt||0,pcmp:x.pcmp||0,car:x.car||x.ratt||0,tgt:x.tgt||0,
    tkl:x.tkl||0,sack:x.sack||0,intc:x.intc||x.dint||0,fum:x.fum||0,pass20:x.pass20||0,run10:x.run10||0,rec20:x.rec20||0,
    xpass:x.xpass||0,xrush:x.xrush||0,xrec:x.xrec||0,big:x.big||0,pr:x.pr||0,hurry:x.hurry||0,qbhit:x.qbhit||0,tfl:x.tfl||0,pbu:x.pbu||0,ff:x.ff||0,fr:x.fr||0,sfty:x.sfty||0};
  normalizeLineStats(l); l.stat=lineStatText(l); l.fp=lineFP(l); l.key=(l.ptd>=2||l.rtd>=2||l.rectd>=2||l.pyd>300||l.ryd>90||l.recyd>90||l.sack>=2||l.intc>=1||l.big>=3);
  return l;
}
function resetSeasonPlayerState(p){
  p.stats=blankStats(); p.out=0; p.outReason=null; p.ir=false; p.injury=null; p.awardPts=0; p.wear=0; p.usageLoad=0; p.lastUsage=null; p.benched=false; p._starved=0;
  if(p.flags){ p.flags.wantsOut=false; p.flags.wantsBall=false; }
  p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(-2,6),20,100);
}
// NFL passer rating (0–158.3) from the season line
function passerRating(s){ const a=s.patt||0; if(a<1) return 0;
  const c=ENG.clamp(((s.pcmp/a)-0.3)*5,0,2.375), y=ENG.clamp((s.pyd/a-3)*0.25,0,2.375), t=ENG.clamp((s.ptd/a)*20,0,2.375), i=ENG.clamp(2.375-(s.intp/a)*25,0,2.375);
  return Math.round(((c+y+t+i)/6)*100*10)/10; }

/* ---------- player generation: camp bodies / UDFAs / street free agents ----------
   keeps a roster legal across seasons (no empty position groups, no shrinking dynasty) */
const RFIRST=['Jaylen','Marcus','Trey','DeMarcus','Khalil','Tyrell','Brock','Cade','Jaxon','Malik','DeShawn','Cooper','Bryce','Isaiah','Tank','Rashad','Devon','Quinn','Amari','Jett','Zion','Roman','Dante','Kemp','Brennan','Silas','Omar','Tyree','Beau','Nico','Darnell','Hollis','Pierce','Rocco','Cyrus','Emmitt','Gage','Boston','Kade','Xavier','Jamarion','Cohen','Dax','Rory','Tre','Kenji','Ledger','Bo','Camden','Micah','Landon','Easton','Jalen','Kyren','Marquise','Antonio','Colton','Mason','Hunter','Garrett','Tanner','Brady','Javon','Dontae','Quinton','Caleb','Logan','Terrell','Rashawn','Cordell','Trayvon','Darius','Jermaine','Zaire','Kobe','David','Michael','Elijah','John','James','Trevon','Beckett','Avery','Makai','Simeon','Drew','Luca','Reed','Tavian','Jaylon','Demario','Treylon','Tyriq','Braxton','Chase','Maliki','Deion','Carson','Brycen','Israel','Tariq','Davion','Quincy','Amir','Jaden','Roderick','Donovan','Keon','Brenden','Solomon','Omari','Tyrone','Nehemiah','Darian','Preston','Keenan','Demond','Jabari','Cael','Ezra','Kobi','Marquez','Shaun','Terron','Jacoby','Lamar','Deonte','Bryson','Khari','Tyson','Calvin','Marvin','Raheem','Sincere','Wyatt','Zane','Theo','Andre','Damon','Frankie','Malachi','Jules','Devontae','Rylan','Kaden','Tristan','Emory','Lennox','Bodie','Crew','Jaxton','Maddox','Koa','Ronin','Zaid','Kashon','Demetrius','Lavar','Reggie','Vince','Marcellus','Octavius','Jamal','Rakeem','Donte','Cassius','Royce','Saint','Tarik','Wendell','Apollo'];
const RLAST=['Whitfield','Brooks','Okafor','Sanders','Mercer','Holloway','Vance','Castillo','Bowers','Friel','Ellison','Mbeki','Rourke','Delgado','Province','Hampton','Greer','Abara','Newsome','Tatum','Calloway','Briggs','Sefolosha','Udeh','Mathis','Caruso','Belton','Frazier','Reyes','Okonkwo','Latu','Pace','Sweat','Dunmore','Galloway','Reddick','Onyema','Boseman','Quigley','Vasquez','Ferreira','Nakamura','Stallworth','Eze','Brantley','Coker','Wells','Davis','Phillips','Edwards','Roberts','Johnson','King','Scott','Turner','Hayes','Rhodes','Ortiz','Stewart','Morris','Green','Collins','Banks','Mitchell','Campbell','Lewis','Parker','Pope','Childs','Means','Murphy','Cruz','Adams','Cook','Bailey','Whitmore','Brookins','Adeyemi','Sandoval','Merriweather','Halloran','Vann','Castellano','Bowen','Friedman','Ellis','Mwangi','Delacroix','Prince','Hammond','Greene','Achebe','Newton','Brigham','Udoka','Mathison','Carrasco','Bellamy','Reyna','Latimore','Paige','Sweet','Dunbar','Galindo','Reddix','Onwuka','Quintero','Velasquez','Ferraro','Nishimura','Stallings','Cofield','Welch','Dawson','Pham','Easley','Robinson','Knight','Sumner','Tucker','Hayward','Rhoden','Ortega','Stovall','Morrow','Collier','Bankston','Campos','Leblanc','Poston','Childress','Murdock','Adkins','Cooke','Okeke','Diallo','Traore','Nwosu','Sablan','Tuiasosopo','Leota','Kealoha','Akana','Soto','Rivera','Vargas','Mendez','Salinas','Aguirre','Holt','Webb','Crockett','Sterling','Vaughn','Ashby','Calderon','Whitlock','Brewer','Fontaine','Garrison','Hollins','Marsh','Pennington','Sloan','Thorne','Winslow'];

// hometowns — deterministic per player id (stable across saves; works for every player, no migration). Football-rich US cities.
const HOMETOWNS=['Houston, TX','Dallas, TX','Austin, TX','San Antonio, TX','Miami, FL','Tampa, FL','Orlando, FL','Jacksonville, FL','Atlanta, GA','Savannah, GA','New Orleans, LA','Baton Rouge, LA','Birmingham, AL','Mobile, AL','Jackson, MS','Memphis, TN','Nashville, TN','Charlotte, NC','Greensboro, NC','Columbia, SC','Los Angeles, CA','Long Beach, CA','Oakland, CA','Fresno, CA','San Diego, CA','Phoenix, AZ','Las Vegas, NV','Denver, CO','Seattle, WA','Portland, OR','Chicago, IL','Detroit, MI','Flint, MI','Cleveland, OH','Cincinnati, OH','Columbus, OH','Akron, OH','Indianapolis, IN','Gary, IN','Milwaukee, WI','Minneapolis, MN','St. Louis, MO','Kansas City, MO','Omaha, NE','Tulsa, OK','Oklahoma City, OK','Little Rock, AR','Louisville, KY','Pittsburgh, PA','Philadelphia, PA','Harrisburg, PA','Newark, NJ','Camden, NJ','Brooklyn, NY','The Bronx, NY','Buffalo, NY','Baltimore, MD','Washington, DC','Richmond, VA','Norfolk, VA','Boston, MA','Hartford, CT','Compton, CA','Inglewood, CA','Stockton, CA','Sacramento, CA','El Paso, TX','Fort Worth, TX','Beaumont, TX','Shreveport, LA','Montgomery, AL','Tuscaloosa, AL','Pensacola, FL','Fort Lauderdale, FL','Tallahassee, FL','Macon, GA','Augusta, GA','Knoxville, TN','Chattanooga, TN','Durham, NC','Fayetteville, NC','Honolulu, HI','American Samoa','Toledo, OH','Dayton, OH','Fort Wayne, IN','Des Moines, IA','Wichita, KS','Albuquerque, NM','Salt Lake City, UT','Tacoma, WA','Bakersfield, CA','Riverside, CA','Lubbock, TX','Waco, TX','Lafayette, LA'];
function hometownOf(p){ if(!p) return ''; if(p.hometown) return p.hometown; const i=(((p.id||0)>>>0)*2654435761>>>0)%HOMETOWNS.length; p.hometown=HOMETOWNS[i]; return p.hometown; }
function htCity(p){ return String(hometownOf(p)||'').split(',')[0].trim(); }
function htState(p){ const x=String(hometownOf(p)||'').split(','); return (x[1]||'').trim(); }
const CITY_STATE={'Buffalo':'NY','New York':'NY','Brooklyn':'NY','Miami':'FL','Tampa Bay':'FL','Tampa':'FL','Jacksonville':'FL','Orlando':'FL','Dallas':'TX','Houston':'TX','San Antonio':'TX','Austin':'TX','Los Angeles':'CA','San Francisco':'CA','San Diego':'CA','Oakland':'CA','Sacramento':'CA','Seattle':'WA','Chicago':'IL','Denver':'CO','Las Vegas':'NV','Philadelphia':'PA','Pittsburgh':'PA','Kansas City':'MO','St. Louis':'MO','Nashville':'TN','Memphis':'TN','Tennessee':'TN','Atlanta':'GA','New Orleans':'LA','Detroit':'MI','Minneapolis':'MN','Minnesota':'MN','Cleveland':'OH','Cincinnati':'OH','Columbus':'OH','Indianapolis':'IN','Baltimore':'MD','Washington':'DC','Charlotte':'NC','Carolina':'NC','Green Bay':'WI','Milwaukee':'WI','Phoenix':'AZ','Arizona':'AZ','Boston':'MA','New England':'MA','Portland':'OR','Salt Lake City':'UT'};
function stateOfCity(city){ return CITY_STATE[String(city||'').trim()]||''; }
const BIG_METROS=new Set(['Houston','Dallas','Los Angeles','Long Beach','Compton','Inglewood','Miami','Fort Lauderdale','Chicago','Philadelphia','Brooklyn','The Bronx','Atlanta','Phoenix','San Diego','Boston','Washington','Detroit','Seattle','Las Vegas','Newark','Baltimore','San Antonio','Austin','San Francisco']);
function fromBigCity(p){ return BIG_METROS.has(htCity(p)); }
// how a personality responds to a hometown homecoming / big stage: + rises to it, - presses
const RISE_FACTOR={captain:0.7, gamer:1.0, trash_talker:0.9, showman:1.1, quiet_pro:0.25, diva:-0.5, headcase:-1.0};
function hometownGameEffect(p, hostTeam, primetime){ if(!p||!hostTeam) return null;
  const f=RISE_FACTOR[p.persona]!=null?RISE_FACTOR[p.persona]:0.3;
  const hc=htCity(p), hs=htState(p), tc=String(hostTeam.city||'').trim(), ts=stateOfCity(tc);
  let intensity=0, where='';
  if(hc && hc===tc){ intensity=1.0; where=`back home in ${hc}`; }
  else if(hs && ts && hs===ts){ intensity=0.55; where=`back in his home state of ${hs}`; }
  const bigMkt=(hostTeam.market||60)>=86 || primetime;
  let stage=0; if(bigMkt && !fromBigCity(p)) stage=primetime?0.6:0.4; else if(bigMkt && fromBigCity(p)) stage=0.22;
  if(!intensity && !stage) return null;
  const scale=ENG.clamp((p.ovr-66)/26,0.25,1.2);
  const homeDelta=intensity*f*2.4*scale;
  const stageDelta=stage*(f<0?f:Math.min(f,0.8))*1.5*scale*(fromBigCity(p)?0.5:1);
  const delta=ENG.clamp(homeDelta+stageDelta,-3.2,3.2);
  if(Math.abs(delta)<0.2 && !where) return null;
  if(!where && stage) where = fromBigCity(p)?`right at home under ${primetime?'the primetime':'the big-market'} lights`:`under ${primetime?'the primetime':'the big-market'} lights he's not used to`;
  const note = where?`${p.name} (${PERSONA_LBL[p.persona]||'pro'}) is ${where} — ${f>=0?'the type who feeds off it':'and that kind of pressure has bitten him before'}.`:'';
  return {delta, note, where, rise:f>=0}; }
function teamHomeAffinity(t,p){ if(!t||!p) return 0; const hc=htCity(p), hs=htState(p), tc=String(t.city||'').trim(), ts=stateOfCity(tc);
  if(hc && hc===tc) return 1.0; if(hs && ts && hs===ts) return 0.62; return 0; }
function homePullWeight(p){ if(!p) return 0; let w=0.16+((p.loyalty||60)-55)/360;
  const adj={quiet_pro:0.10,captain:0.09,headcase:0.05,gamer:0.02,trash_talker:-0.05,showman:-0.07,diva:-0.06}[p.persona]||0;
  return ENG.clamp(w+adj,0.04,0.42); }
// at coach-game start: each team's net hometown/big-stage energy → a small ball-team edge + notes for the booth
function cgComputeEmotion(){ if(!CG) return; CG._emo={h:0,a:0}; CG._emoNotes=[];
  const ht=team(CG.home), at=team(CG.away); if(!ht||!at) return; const prime=!!(CG.slot&&CG.slot.prime);
  const calc=(t,side)=>{ let sum=0; const actv=t.roster.filter(p=>!(p.out>0)&&!p.ir&&!p.benched).sort((a,b)=>b.ovr-a.ovr).slice(0,8);
    actv.forEach(p=>{ const e=hometownGameEffect(p,ht,prime); if(!e) return; sum+=e.delta*(p.pos==='QB'?1.35:1);
      if(Math.abs(e.delta)>=0.7 && e.note && CG._emoNotes.length<4) CG._emoNotes.push({id:p.id,name:p.name,where:e.where,delta:e.delta,note:e.note,side}); });
    return ENG.clamp(sum*0.16,-2.6,2.6); };
  CG._emo.h=calc(ht,'h'); CG._emo.a=calc(at,'a'); }
const MINPOS={QB:2,RB:3,FB:1,WR:5,TE:2,T:4,G:3,C:2,DE:3,DT:3,OLB:4,ILB:3,CB:4,S:4,K:1,P:1};   // legal-roster floor per position
const ROSTER_TARGET=58, ROSTER_USER_MAX=63;
function genName(){ return ENG.pick(RFIRST)+' '+ENG.pick(RLAST); }
function genUniqueName(used){ let nm=genName(), guard=0; while(used&&used.has(nm)&&guard++<40) nm=genName();
  if(used&&used.has(nm)){ outer: for(let li=0;li<RLAST.length;li++)for(let fi=0;fi<RFIRST.length;fi++){ const c=RFIRST[fi]+' '+RLAST[li]; if(!used.has(c)){ nm=c; break outer; } } }   // exhausted the random space → deterministic-walk a fresh combo
  if(used)used.add(nm); return nm; }
// nicknames — earned by stars; position-flavored + universal
const NICKS={ QB:['The General','Gunslinger','Captain Comeback','Cool Hand','The Sheriff','Ice','The Cannon','Maestro'],
  RB:['Bulldozer','Lightning','The Truck','Flash','Smoke','Thunder','Skates','The Hammer'], FB:['The Bus','Bruiser'],
  WR:['Hands','Sauce','Smooth','Jets','The Cheetah','Stretch','Money','Glue'], TE:['The Mismatch','Big Cat','Red Zone','The Wall'],
  DE:['The Closer','Sack Master','The Edge','Mayhem','The Freak'], DT:['The Mountain','Plug','Boulder'],
  OLB:['Heat','The Hunter','Missile'], ILB:['The Enforcer','Tackle Machine','The Mike'],
  CB:['Island','Lockdown','Sticky','The Eraser'], S:['The Hammer','Centerfield','Ballhawk','Big Hit'],
  K:['Automatic','Lefty','Money'], P:['The Leg','Boomstick'] };
const NICK_ANY=['Prime','The Franchise','Mr. Reliable','Captain','The Dawg','Cold Blood','The Truth'];
function ensureNick(p){ if(p.nick!=null) return; const pool=(NICKS[p.pos]||[]).concat(NICK_ANY); p.nick=pool[((p.id*2654435761)>>>0)%pool.length]; }
let _fillSeq=700000;
function genFiller(pos, lo, hi){ const ovr=ENG.clamp(ENG.ri(lo,hi),38,88); const A=()=>ENG.clamp(ovr+ENG.ri(-9,9),30,93);
  const nm=genName(), sp=nm.indexOf(' ');
  _fillSeq=Math.max(_fillSeq, (G&&G._fillN)||700000)+1;   // collision-proof even before G exists (preset-league build)
  if(G) G._fillN=_fillSeq;
  const p={id:_fillSeq,first:nm.slice(0,sp),last:nm.slice(sp+1),name:nm,pos,age:ENG.ri(22,28),ovr,num:'',
    attrs:{SP:A(),AC:A(),AG:A(),ST:A(),HA:A(),EN:A(),DI:A(),IN:A(),OVR:ovr},
    starter:false,depth:9,morale:ENG.ri(58,74),salary:ENG.round1(Math.max(0.9,(ovr-52)*0.25)),years:ENG.ri(1,2),
    loyalty:ENG.ri(45,66),seasons:0,peak:ovr,flags:{}};
  if(window.PHYS) PHYS.fresh(p); return p; }
function fillerRange(pos){
  if(pos==='QB') return [60,72];
  if(pos==='K'||pos==='P') return [64,78];
  if(['T','G','C','WR','CB','S'].includes(pos)) return [56,70];
  return [54,68];
}
// fill any thin/empty position group up to its minimum with camp bodies (called each new season)
function backfillRoster(t){ Object.keys(MINPOS).forEach(pos=>{ let have=t.roster.filter(p=>p.pos===pos).length;
  while(have<MINPOS[pos]){ const r=fillerRange(pos); t.roster.push(genFiller(pos,r[0],r[1])); have++; } }); }
function normalizeDepthChart(t){
  const order=pos=>{ const i=ENG.QUOTA.findIndex(q=>q[0]===pos); return i<0?99:i; };
  const seen={};
  t.roster.sort((a,b)=>order(a.pos)-order(b.pos)||b.ovr-a.ovr).forEach(p=>{
    seen[p.pos]=(seen[p.pos]||0)+1; p.depth=seen[p.pos]; p.starter=seen[p.pos]===1;
  });
}
function syncCapUsed(t){ if(t&&t.roster) t.capUsed=ENG.round1(t.roster.reduce((a,p)=>a+(p.salary||0),0)); return t?t.capUsed:0; }
function syncAllCapUsed(){ if(G&&G.teams) G.teams.forEach(syncCapUsed); }
function enforceUniquePlayerOwnership(reason){
  if(!G||!G.teams) return 0;
  const seen=new Map(); let removed=0, userLost=[];
  G.teams.forEach(t=>{
    const keep=[];
    t.roster.forEach(p=>{
      if(seen.has(p.id)){ removed++; if(t.abbr===USER) userLost.push(p.name); return; }
      seen.set(p.id,t.abbr); keep.push(p);
    });
    t.roster=keep;
  });
  if(userLost.length) addNews('ROSTER',`${ut().city} corrected duplicate roster ownership for ${userLost.join(', ')} (${reason||'audit'}).`);
  return removed;
}
function repairRosterLegality(t, reason){
  if(!t||!t.roster) return 0;
  const before=t.roster.length; backfillRoster(t); normalizeDepthChart(t);
  syncCapUsed(t);
  const added=t.roster.length-before;
  if(added && reason && t.abbr===USER) addNews('ROSTER',`${t.city} signed ${added} emergency depth player${added!==1?'s':''} to keep the roster legal (${reason}).`);
  return added;
}
function repairAllRosters(reason){ if(!G||!G.teams) return 0; let n=G.teams.reduce((sum,t)=>sum+repairRosterLegality(t,reason),0);
  const dup=enforceUniquePlayerOwnership(reason); if(dup) n+=G.teams.reduce((sum,t)=>sum+repairRosterLegality(t,reason),0);
  syncAllCapUsed(); return n+dup; }
function rosterLegalityIssues(){
  const out=[]; if(!G||!G.teams) return out;
  G.teams.forEach(t=>Object.keys(MINPOS).forEach(pos=>{ const have=t.roster.filter(p=>p.pos===pos).length;
    if(have<MINPOS[pos]) out.push({team:t.abbr,pos,have,need:MINPOS[pos]}); }));
  return out;
}
function legalAfterSending(t, assets){
  const out={}; (assets||[]).filter(a=>a&&a.kind!=='pick').forEach(p=>{ out[p.pos]=(out[p.pos]||0)+1; });
  const bad=Object.keys(out).find(pos=>t.roster.filter(p=>p.pos===pos).length-out[pos]<MINPOS[pos]);
  return bad?`${t.abbr} would fall below legal ${bad} depth`:null;
}
function canSparePlayer(t,p){ return !!(t&&p&&t.roster.filter(x=>x.pos===p.pos).length-1>=MINPOS[p.pos]); }
function trimRoster(t,max,reason){
  let cut=0, guard=0; max=max||ROSTER_TARGET; normalizeDepthChart(t);
  while(t.roster.length>max && guard++<30){
    const cand=t.roster.filter(p=>!p.starter&&canSparePlayer(t,p)&&!franchiseProtected(t,p))
      .sort((a,b)=>((a.ovr||55)+((a.age||30)<=24?4:0)-(a.salary||1)*0.35)-((b.ovr||55)+((b.age||30)<=24?4:0)-(b.salary||1)*0.35))[0];
    if(!cand) break;
    t.roster=t.roster.filter(p=>p.id!==cand.id); cut++;
  }
  if(cut && t.abbr===USER) addNews('ROSTER',`${t.city} trimmed ${cut} depth player${cut!==1?'s':''} to reach the roster limit (${reason||'camp cuts'}).`);
  normalizeDepthChart(t); syncCapUsed(t); return cut;
}
function capDiscipline(t){
  if(!G||!G.rules||G.rules.salaryCap===false||t.abbr===USER) return 0;
  let cut=0, guard=0;
  while(capSpace(t)<-25 && guard++<12){
    const cand=t.roster.filter(p=>!p.starter&&canSparePlayer(t,p)&&!franchiseProtected(t,p))
      .sort((a,b)=>((b.salary||0)*2-(b.ovr||55)*0.18)-((a.salary||0)*2-(a.ovr||55)*0.18))[0];
    if(!cand) break;
    t.roster=t.roster.filter(p=>p.id!==cand.id); cut++;
  }
  if(cut) normalizeDepthChart(t);
  let restructured=0; guard=0;
  while(capSpace(t)<-20 && guard++<40){
    const p=t.roster.slice().sort((a,b)=>(b.salary||0)-(a.salary||0))[0];
    if(!p || (p.salary||0)<=1.2) break;
    const relief=Math.min((p.salary||1)-1.0, Math.max(1, Math.abs(capSpace(t))-18));
    p.salary=ENG.round1(Math.max(1.0,(p.salary||1)-relief)); restructured++;
  }
  syncCapUsed(t); return cut+restructured;
}
function aiCapSweep(){ let n=0; if(G&&G.teams) G.teams.forEach(t=>{ n+=capDiscipline(t); }); return n; }
function preseasonRosterAudit(){
  let added=0, cut=0, capCuts=0;
  G.teams.forEach(t=>{ added+=repairRosterLegality(t,'preseason audit'); cut+=trimRoster(t,t.abbr===USER?ROSTER_USER_MAX:ROSTER_TARGET,'preseason cutdown'); capCuts+=capDiscipline(t); repairRosterLegality(t,'post-cutdown'); });
  if(cut||capCuts) addNews('ROSTER',`League roster cutdown: ${cut} depth release${cut!==1?'s':''}${capCuts?`, including ${capCuts} AI cap move${capCuts!==1?'s':''}`:''}.`);
  return {added,cut,capCuts};
}

// seed plausible PRE-GAME career history so veterans carry real résumés (HOF, milestones, stat totals) from day one.
// the visible 2026 roster has real names/ages but zero career stats — this back-fills what they'd already have done.
function seedHistory(p){
  if(p._seeded) return; p._seeded=true; const c=p.career=p.career||{};
  const yrs=p.seasons||ENG.clamp((p.age||24)-22,0,16); if(yrs<=0) return;
  // estimate PRIME ability — an aging legend's current OVR has declined, so credit who he WAS (vets were better young)
  const prime=ENG.clamp((p.ovr||60)+Math.max(0,(p.age||27)-28)*1.35, p.ovr||60, 99);
  p.peak=Math.max(p.peak||0, prime);                                          // résumé/HOF should reflect the peak, not the decline
  const peak=p.peak, q=ENG.clamp((peak-58)/40,0.08,1.2);                      // career quality factor
  const tot=perYr=>Math.round(yrs*perYr*q*(0.62+ENG.rng()*0.45));             // ramp-up + per-player variance
  const add=(k,v)=>{ c[k]=(c[k]||0)+v; };
  if(p.pos==='QB'){ add('pyd',tot(3650)); add('ptd',tot(25)); add('ryd',tot(170)); add('rtd',tot(2)); }
  else if(p.pos==='RB'||p.pos==='FB'){ add('ryd',tot(820)); add('rtd',tot(6)); add('recyd',tot(300)); add('rectd',tot(2)); }
  else if(p.pos==='WR'){ add('recyd',tot(820)); add('rectd',tot(6)); add('rec',tot(62)); }
  else if(p.pos==='TE'){ add('recyd',tot(520)); add('rectd',tot(4)); add('rec',tot(48)); }
  else if(p.pos==='DE'||p.pos==='OLB'){ add('sack',tot(7)); add('tkl',tot(42)); }
  else if(p.pos==='DT'){ add('sack',tot(3.5)); add('tkl',tot(38)); }
  else if(p.pos==='CB'||p.pos==='S'){ add('intc',tot(2.2)); add('tkl',tot(52)); }
  else if(p.pos==='ILB'){ add('sack',tot(1.4)); add('intc',tot(1)); add('tkl',tot(80)); }
  // accolades — quality + longevity gated, so only genuine stars carry hardware
  const eliteYrs=Math.floor(yrs*ENG.clamp((peak-82)/16,0,0.72));              // seasons spent as a real star
  p.proBowls=(p.proBowls||0)+eliteYrs;
  p.allPros=(p.allPros||0)+Math.floor(eliteYrs*0.45);
  if(peak>=95 && p.pos==='QB') p.mvps=(p.mvps||0)+(yrs>=6?ENG.ri(1,2):yrs>=3?ENG.ri(0,1):0);
  else if(peak>=94) p.mvps=(p.mvps||0)+(yrs>=6&&ENG.rng()<0.5?1:0);
  if(peak>=88 && ENG.rng()<yrs*0.025) p.rings=(p.rings||0)+ENG.ri(1,2);       // rings are scarce
  p.careerPts=(p.careerPts||0)+Math.round(yrs*q*120 + p.proBowls*60 + p.allPros*120 + (p.mvps||0)*260);
  // don't re-announce milestones a veteran already passed before the save began
  p._mile=p._mile||{}; const map={cpyd:'pyd',cptd:'ptd',cryd:'ryd',crtd:'rtd',crecyd:'recyd',crectd:'rectd',csack:'sack',cintc:'intc'};
  Object.keys(MILESTONES).forEach(ck=>{ const totv=c[map[ck]]||0; MILESTONES[ck].forEach(m=>{ if(totv>=m.n) p._mile[ck+m.n]=1; }); });
}

// ---- prospect FATES: hidden intangibles the consensus grade can't see ----
// the visible `grade` is the scouting consensus; these hidden traits decide who booms, busts, or cracks.
const ARCHE_LBL={boom:'boom-or-bust',sleeper:'sleeper',floor:'high-floor',risk:'character risk',solid:'solid',gem:'hidden gem'};
function enrichProspect(p, force){
  if(p.temperament!=null && !force) return p;
  p.workEthic = ENG.clamp(ENG.ri(34,96) + (p.grade>=88?ENG.ri(-12,4):0), 18, 99);   // some elite talents coast
  p.temperament = ENG.clamp(ENG.ri(28,93), 15, 99);                                  // poise under the spotlight
  // true ceiling vs the board — top of the class gets real blue-chip upside so each draft mints future stars.
  const ceilTail = p.grade>=82 ? ENG.ri(5,17) : p.grade>=76 ? ENG.ri(2,15) : p.grade>=66 ? ENG.ri(-3,13) : ENG.ri(-9,11);
  p._ceiling = ENG.clamp(p.grade + ceilTail, 50, 99);
  const makeup=(p.workEthic+p.temperament)/2;
  p.bustRisk = ENG.clamp(0.52 - (makeup-55)/95 + (p.grade>=85?0.12:0) - (p._ceiling-p.grade)/60, 0.05, 0.85);
  p.archetype = p.bustRisk>0.55 ? 'boom' : (p._ceiling-p.grade>=10 ? 'sleeper' : (p.workEthic>=82&&p.temperament>=78 ? 'floor' : (makeup<45 ? 'risk' : 'solid')));
  // THE BRADY ARC — a rare hidden gem the whole league misjudges. Low board grade, HIDDEN elite ceiling, grinder makeup,
  // late bloom. The team won't know what they have until he develops (the reveal under-sells him on purpose). ~1-3 per class.
  if(p.grade<78 && ENG.rng() < (p.grade<60?0.022:p.grade<70?0.013:0.006)){
    p.gem=true; p.lateBloom=true;
    p._ceiling = ENG.clamp(ENG.ri(88,98), p._ceiling, 99);                 // the real, hidden ceiling
    p.workEthic = ENG.clamp(ENG.ri(78,98), p.workEthic, 99);               // chip-on-the-shoulder film grinder
    p.temperament = ENG.clamp(ENG.ri(74,97), p.temperament, 99);
    p.bustRisk = ENG.clamp(p.bustRisk*0.35, 0.04, 0.35);
    p.archetype = 'gem';
  }
  // position-calibrated measurables (ht/wt/40 + SP/AC/AG/ST, QB arm) — rolled off the board GRADE so the combine numbers match the talent
  if(window.PHYS && p.ht==null){ const keepOvr=p.ovr; p.ovr=(p.grade!=null?p.grade:p.ovr!=null?p.ovr:60); PHYS.fresh(p); if(keepOvr==null) delete p.ovr; else p.ovr=keepOvr; }
  return p;
}
const PROSPECT_CAL_V=2, ROOKIE_MAX_OVR=84;
function prospectRoundFromGrade(g){ return g>=78?1:g>=72?2:g>=67?3:g>=62?4:g>=58?5:g>=54?6:7; }
function calibratedProspectGrade(p,i){
  const r=ENG.clamp(p.projRound||prospectRoundFromGrade(p.grade||55),1,7);
  const base=[0,78,72,67,62,58,54,50][r]||50;
  const classCurve=(i<8?ENG.ri(1,4):i<32?ENG.ri(-1,3):ENG.ri(-4,2));
  // QB is the scarcest, highest-impact position: a class carries only ~12 QBs, and the league
  // must replace 30 starters as the opening-day stars age out. Without a position premium + a
  // higher ceiling, ~1 startable QB enters per year and league passing (and scoring) erodes
  // over a long franchise. The premium also lifts pot (ceiling=ovr+ri), so classes self-sustain.
  const qb=p.pos==='QB';
  return ENG.clamp(base+(qb?5:0)+classCurve+ENG.ri(-3,3),44,qb?88:ROOKIE_MAX_OVR);
}
function normalizeProspect(p,i,season,opts){
  opts=opts||{};
  const q=Object.assign({},p);
  if(opts.freshName){ const nm=genUniqueName(opts.usedNames), sp=nm.indexOf(' '); q.first=nm.slice(0,sp); q.last=nm.slice(sp+1); q.name=nm; }
  const needsCal=q._prospectCal!==PROSPECT_CAL_V || (q.grade||0)>ROOKIE_MAX_OVR;
  if(needsCal){ q.grade=calibratedProspectGrade(q,i); q.projRound=prospectRoundFromGrade(q.grade); q._prospectCal=PROSPECT_CAL_V; }
  q._nameCal=PROSPECT_CAL_V;
  q.id=opts.id!=null?opts.id:(q.id||40000+season*400+i); q.scouted=q.scouted||0;
  return enrichProspect(q, needsCal||opts.forceTraits);
}
function normalizeProspectBoard(){ if(!G||!G.prospects) return; const used=new Set(), firstSeen={};
  G.prospects=G.prospects.map((p,i)=>{ const fn=p.first||String(p.name||'').split(' ')[0]||''; const repeat=(firstSeen[fn]||0)>=2; firstSeen[fn]=(firstSeen[fn]||0)+1;
    return normalizeProspect(p,i,G.season,{freshName:p._nameCal!==PROSPECT_CAL_V||repeat,usedNames:used}); }).sort((a,b)=>b.grade-a.grade); }
function rookieOverall(prospect){ const cap=prospect.pos==='QB'?88:ROOKIE_MAX_OVR; return ENG.clamp((prospect.grade||60)+ENG.ri(-3,0),38,cap); }
// each year's class keeps a realistic position/grade/school SHAPE but gets FRESH names + a class-strength wobble,
// so no two draft classes (or Heisman races) ever repeat across a long career
function makeProspectClass(season){ const used=new Set();
  const list=GAMEDATA.prospects.map((p,i)=>normalizeProspect({pos:p.pos,school:p.school,age:p.age,projRound:p.projRound,grade:p.grade},i,season,{freshName:true,usedNames:used,id:40000+season*400+i,forceTraits:true}));
  const cs=(typeof G!=='undefined'&&G&&G.rules&&G.rules.classStrength)||1;   // draft-class strength dial (weak↔stacked, with per-class variance)
  if(cs!==1){ const yr=(cs-1)+(ENG.rng()-0.5)*0.18; list.forEach(p=>{ const cap=p.pos==='QB'?88:ROOKIE_MAX_OVR; p.grade=ENG.clamp(Math.round(p.grade+yr*ENG.ri(4,11)),40,cap); p.projRound=prospectRoundFromGrade(p.grade); }); }
  return list; }

/* ---------- college universe: season-long storylines feeding the Gazette + draft board ---------- */
const COLLEGE_YEARS=['FR','RS-FR','SO','JR','SR','JUCO'];
const COLLEGE_ARCHES=[
  {k:'heisman_freshman',label:'Freshman Heisman storm',txt:'the freshman taking the Heisman race by storm'},
  {k:'juco_record',label:'JUCO record breaker',txt:'the JUCO transfer rewriting the record book'},
  {k:'small_school_riser',label:'Small-school riser',txt:'the small-school monster scouts keep flying in to see'},
  {k:'blue_blood_pressure',label:'Blue-blood pressure',txt:'the five-star talent carrying a blue-blood offense'},
  {k:'injury_return',label:'Comeback season',txt:'the former injured star proving the burst is back'},
  {k:'transfer_leap',label:'Portal leap',txt:'the portal gamble that became a national story'},
  {k:'late_bloomer',label:'Late bloomer',txt:'the senior who finally put the tools together'},
  {k:'two_way',label:'Two-way chess piece',txt:'the rare two-phase weapon forcing scouts to pick a position'}
];
// G5/FCS programs in the prospect pool — everything else is a power-conference / blue-blood school
const SMALL_SCHOOLS=new Set(['Appalachian State','Boise State','Liberty','Memphis','South Dakota State','Toledo']);
function isSmallSchool(name){ return SMALL_SCHOOLS.has(name); }
function archFitsSchool(archKey, school){ if(archKey==='small_school_riser') return isSmallSchool(school); if(archKey==='blue_blood_pressure') return !isSmallSchool(school); return true; }
function pickSchoolArch(p,i){ const top=(i==null?64:i)<64; let arch=top?ENG.pick(COLLEGE_ARCHES):COLLEGE_ARCHES[6]; let g=0;
  while(!archFitsSchool(arch.k,p.school)&&g++<10) arch=ENG.pick(COLLEGE_ARCHES);
  if(!archFitsSchool(arch.k,p.school)) arch=COLLEGE_ARCHES.find(a=>a.k==='late_bloomer')||COLLEGE_ARCHES[6]; return arch; }
function archHook(arch,pos){ const isDef=['DE','DT','OLB','ILB','CB','S'].includes(pos), isOL=['T','G','C'].includes(pos); let hook=arch.txt;
  if(arch.k==='blue_blood_pressure' && isDef) hook='the five-star talent carrying a blue-blood defense';
  if(arch.k==='blue_blood_pressure' && isOL) hook='the blue-blood blocker anchoring a playoff offense';
  if(arch.k==='juco_record' && isOL) hook='the JUCO mauler putting violent tape on every reel';
  if(arch.k==='heisman_freshman' && isDef) hook='the freshman defender crashing the national awards race'; return hook; }
function ensureCollegeProfile(p,i){
  if(!p) return p;
  const statDefaults={g:0,passYds:0,passTd:0,int:0,rushYds:0,rushTd:0,rec:0,recYds:0,recTd:0,tkl:0,sack:0,pbu:0,pancake:0,sacksAllowed:0};
  if(p.college&&p.college.season===G.season){ p.college.stat=Object.assign(statDefaults,p.college.stat||{});
    if(p.college.arch && !archFitsSchool(p.college.arch, p.school)){ const a=pickSchoolArch(p,i); p.college.arch=a.k; p.college.archLabel=a.label; p.college.hook=archHook(a,p.pos);
      if(p.college.headlines&&p.college.headlines.length) p.college.headlines[p.college.headlines.length-1]=`${p.name} (${p.pos}, ${p.school}) opens camp as ${p.college.hook}.`; }
    return p; }
  const top=i<64, grade=p.grade||60, arch=pickSchoolArch(p,i);
  let hook=archHook(arch,p.pos);
  let yr=ENG.pick(COLLEGE_YEARS);
  if(arch.k==='heisman_freshman') yr=ENG.pick(['FR','RS-FR']);
  if(arch.k==='juco_record') yr='JUCO';
  const heat=ENG.clamp(30 + (grade-60)*1.4 + (i<8?22:i<32?12:4) + ENG.ri(-8,12),5,99);
  p.college={season:G.season,year:yr,arch:arch.k,archLabel:arch.label,hook,heat,stock:0,
    stat:Object.assign({},statDefaults),
    headlines:[`${p.name} (${p.pos}, ${p.school}) opens camp as ${hook}.`]};
  return p;
}
function collegeStatLine(p){
  const s=(p.college&&p.college.stat)||{}, pos=p.pos;
  if(pos==='QB') return `${s.passYds||0} pass yds, ${s.passTd||0} TD, ${s.int||0} INT${s.rushYds?`, ${s.rushYds} rush`:''}`;
  if(pos==='RB'||pos==='FB') return `${s.rushYds||0} rush yds, ${s.rushTd||0} TD${s.rec?`, ${s.rec} rec`:''}`;
  if(pos==='WR'||pos==='TE') return `${s.rec||0} rec, ${s.recYds||0} yds, ${s.recTd||0} TD`;
  if(['T','G','C'].includes(pos)) return `${s.pancake||0} pancakes, ${s.sacksAllowed||0} sacks allowed`;
  if(['DE','DT','OLB','ILB'].includes(pos)) return `${s.tkl||0} tkl, ${s.sack||0} sack, ${s.pbu||0} havoc`;
  if(['CB','S'].includes(pos)) return `${s.tkl||0} tkl, ${s.int||0} INT, ${s.pbu||0} PBU`;
  return `${s.g||0} games · ${p.college?p.college.archLabel:'prospect'}`;
}
function collegeHeismanScore(p){
  const s=(p.college&&p.college.stat)||{}, c=p.college||{};
  const pos=p.pos;
  let prod=0;
  if(pos==='QB') prod=s.passYds*0.020+s.passTd*7-s.int*5+s.rushYds*0.012+s.rushTd*4;
  else if(pos==='RB'||pos==='FB') prod=s.rushYds*0.030+s.rushTd*7+s.recYds*0.012;
  else if(pos==='WR'||pos==='TE') prod=s.recYds*0.034+s.recTd*8+s.rec*0.35;
  else prod=s.tkl*0.22+s.sack*9+s.int*11+s.pbu*2.2;
  return Math.round(prod+(p.grade||60)*0.45+(c.heat||0)*0.35+(c.stock||0)*1.5);
}
function ncaaStoryFor(p,kind){
  const c=p.college||{}, line=collegeStatLine(p), dir=(c.stock||0)>=4?'rising':(c.stock||0)<=-4?'sliding':'holding';
  const pool={
    stat:[`${p.name} (${p.pos}, ${p.school}) stacks another monster Saturday: ${line}. Scouts call the trajectory ${dir}.`,
      `${p.school}'s ${p.name} keeps owning the weekend spotlight — ${line}, and the Round ${p.projRound||'?'} grade is under review.`],
    heisman:[`${p.name} (${p.pos}, ${p.school}) has crashed the Heisman race as ${c.hook||'one of the class stories'} — ${line}.`,
      `Heisman watch: ${p.name} is no longer a niche scout favorite. ${p.school} is building the whole Saturday around him.`],
    stock:[`Draft stock move: ${p.name} (${p.pos}, ${p.school}) is ${dir} after evaluators dug back into the tape.`,
      `${p.name}'s board grade has moved to ${p.grade}/84; the ${c.archLabel||'prospect'} storyline is getting real.`]
  };
  return ENG.pick(pool[kind]||pool.stat);
}
function ncaaInit(force){
  if(!G||!G.prospects) return;
  if(G.college && G.college.season===G.season && !force){
    G.prospects.slice(0,64).forEach((p,i)=>ensureCollegeProfile(p,i));
    return;
  }
  G.prospects.slice().sort((a,b)=>b.grade-a.grade).slice(0,96).forEach((p,i)=>ensureCollegeProfile(p,i));
  const hot=G.prospects.slice(0,40).filter(p=>p.college).slice(0,10);
  G.college={season:G.season,week:0,stories:[],heisman:[],spotlight:hot.map(p=>p.id)};
  G.collegeHot=[0,1,2,3].map(i=>{ const p=hot[i]||G.prospects[i]; return {name:ENG.coachName(),school:p?p.school:ENG.pick(['Alabama','Ohio State','Oregon','Texas']),ovr:ENG.ri(74,91),why:p?`built a top-${i+1} attack around ${p.name}`:'modernized the offense'}; });
  hot.slice(0,6).forEach(p=>G.college.stories.push({wk:0,tag:'NCAA',txt:`Preseason board: ${p.name} (${p.pos}, ${p.school}) enters ${G.season} as ${p.college.hook}.`}));
  if(window.ncaaTeamInit) ncaaTeamInit(force);   // the ratings-based team season (AP Top 25, champion) runs in the background
}
function ncaaTick(){
  if(!G||!G.prospects) return; ncaaInit(false);
  const c=G.college; if(!c||c.week>=15) return; c.week++;
  const board=G.prospects.slice().sort((a,b)=>b.grade-a.grade).slice(0,96);
  board.forEach((p,i)=>{
    ensureCollegeProfile(p,i); const s=p.college.stat, star=Math.max(0,(p.grade||60)-58), pop=(p.college.heat||40)/100;
    s.g++;
    if(p.pos==='QB'){ s.passYds+=ENG.ri(210,355)+Math.round(star*2.2); s.passTd+=ENG.ri(1,4); s.int+=ENG.rng()<0.34?1:0; if(ENG.rng()<0.45){ s.rushYds+=ENG.ri(18,88); s.rushTd+=ENG.rng()<0.26?1:0; } }
    else if(p.pos==='RB'||p.pos==='FB'){ s.rushYds+=ENG.ri(70,155)+Math.round(star*2.6); s.rushTd+=ENG.rng()<0.66?ENG.ri(1,2):0; s.rec+=ENG.ri(0,4); s.recYds+=s.rec?ENG.ri(5,44):0; }
    else if(p.pos==='WR'||p.pos==='TE'){ const rec=ENG.ri(3,9)+(p.pos==='WR'&&ENG.rng()<0.35?ENG.ri(2,5):0); s.rec+=rec; s.recYds+=rec*ENG.ri(9,18)+Math.round(star*1.5); s.recTd+=ENG.rng()<0.56?ENG.ri(1,2):0; }
    else if(['T','G','C'].includes(p.pos)){ s.pancake+=ENG.ri(3,9)+Math.round(star*0.20); s.sacksAllowed+=ENG.rng()<0.18?1:0; }
    else { s.tkl+=ENG.ri(3,10); if(['DE','DT','OLB','ILB'].includes(p.pos)) s.sack+=ENG.rng()<0.52?ENG.ri(1,2):0; if(['CB','S','OLB','ILB'].includes(p.pos)) s.int+=ENG.rng()<0.16?1:0; s.pbu+=ENG.rng()<0.48?ENG.ri(1,3):0; }
    const swing=(ENG.rng()<0.22?ENG.ri(-2,3):0)+(pop>0.70&&ENG.rng()<0.18?1:0);
    if(swing){ p.college.stock=ENG.clamp((p.college.stock||0)+swing,-14,14); p.grade=ENG.clamp((p.grade||60)+Math.sign(swing),44,ROOKIE_MAX_OVR); p.projRound=prospectRoundFromGrade(p.grade); }
    p.college.heat=ENG.clamp((p.college.heat||40)+swing+ENG.ri(-1,2),1,99);
  });
  c.heisman=board.slice(0,64).map(p=>({id:p.id,name:p.name,pos:p.pos,school:p.school,score:collegeHeismanScore(p),line:collegeStatLine(p)})).sort((a,b)=>b.score-a.score).slice(0,8);
  const focus=[board.find(p=>p.pos==='QB'&&p.college&&p.college.year.includes('FR')), board.find(p=>p.college&&p.college.arch==='juco_record'), board[ENG.ri(0,Math.min(31,board.length-1))]].filter(Boolean);
  focus.slice(0,2).forEach((p,i)=>{ const txt=ncaaStoryFor(p,i===0?'heisman':'stat'); p.college.headlines.unshift(txt); if(p.college.headlines.length>6)p.college.headlines.pop(); c.stories.unshift({wk:G.week,tag:'NCAA',txt,id:p.id}); addNews('NCAA',txt); });
  if(c.stories.length>80)c.stories.length=80;
  if(window.ncaaTeamTick) ncaaTeamTick();   // play the week's college slate (standings, rankings, upsets, eventual champion)
  const N=G.ncaa; if(N&&N.rankRows){ const top12=new Set(N.rankRows.slice(0,12).map(x=>x.name));   // a star on a ranked team gets the Heisman spotlight
    board.forEach(p=>{ if(p.college&&top12.has(p.school)) p.college.heat=ENG.clamp((p.college.heat||40)+ENG.ri(1,2),1,99); }); }
}
window.ncaaInit=ncaaInit; window.ncaaTick=ncaaTick; window.collegeStatLine=collegeStatLine; window.collegeHeismanScore=collegeHeismanScore;

/* ---------- fantasy draft (optional league start) ---------- */
function fantasyPoolLabel(mode){ return mode==='selected'?'Selected teams only':mode==='fictional'?'Fictional archetypes':'All players'; }
function cloneFantasyPlayer(p, fromTeam){
  const c=JSON.parse(JSON.stringify(p)); c.fromTeam=fromTeam||c.fromTeam; c.stats=blankStats(); c.out=0; c.outReason=null; c.starter=false; c.depth=9;
  return c;
}
function fantasySourceTeams(mode){
  if(mode==='all' && G._fantasySourceTeams && G._fantasySourceTeams.length) return G._fantasySourceTeams;
  return G.teams||[];
}
function archetypeFromTemplate(p){
  const a=p.attrs||{}, pos=p.pos, sp=a.SP||p.ovr||60, st=a.ST||p.ovr||60, ha=a.HA||p.ovr||60, iq=a.IN||p.ovr||60, ag=a.AG||p.ovr||60;
  if(pos==='QB') return sp>82?'Dual-threat creator':iq>84?'Pocket surgeon':'Vertical rhythm passer';
  if(pos==='RB') return ha>82?'Receiving back':st>83?'Power finisher':'One-cut slasher';
  if(pos==='FB') return st>78?'Lead-block hammer':'Move fullback';
  if(pos==='WR') return sp>88?'Field stretcher':ha>86?'Route artist':'Contested-catch X';
  if(pos==='TE') return ha>82?'Flex mismatch':st>82?'Inline mauler':'Red-zone target';
  if(['T','G','C'].includes(pos)) return st>84?'Gap-game people mover':iq>82?'Pass-pro technician':'Zone-fit blocker';
  if(['DE','OLB'].includes(pos)) return sp>84?'Speed rusher':st>84?'Power edge':'Hybrid pressure piece';
  if(pos==='DT') return st>85?'Interior anchor':ag>78?'Three-tech disruptor':'Pocket pusher';
  if(pos==='ILB') return sp>80?'Range linebacker':iq>83?'Green-dot processor':'Downhill thumper';
  if(pos==='CB') return sp>87?'Press-man burner':ha>80?'Ballhawk corner':'Zone mirror';
  if(pos==='S') return st>80?'Box enforcer':ha>82?'Centerfield ballhawk':'Split-safety eraser';
  if(pos==='K') return 'Big-leg kicker';
  if(pos==='P') return 'Hang-time punter';
  return 'Pro archetype';
}
function makeFictionalPlayerFromTemplate(tpl, usedNames){
  const base=ENG.clamp((tpl&&tpl.ovr)||ENG.ri(56,82),42,99);
  const ovr=ENG.clamp(base+ENG.ri(-3,2),42,99);   // mirror the real role's TRUE tier — full elite range, not capped at 88
  const lo=ENG.clamp(ovr-2,38,99), hi=ENG.clamp(ovr+1,40,99);
  const p=genFiller(tpl.pos||'WR',lo,hi), nm=genUniqueName(usedNames), sp=nm.indexOf(' ');
  p.first=nm.slice(0,sp); p.last=nm.slice(sp+1); p.name=nm; p.age=ENG.ri(21,31); p.seasons=ENG.clamp(p.age-22+ENG.ri(-1,2),0,8);
  const ta=(tpl&&tpl.attrs)||{}, attrs={}; ['SP','AC','AG','ST','HA','EN','DI','IN'].forEach(k=>{
    attrs[k]=ENG.clamp((ta[k]||ovr)+ENG.ri(-6,6),32,99);
  });
  p.ovr=ovr; attrs.OVR=ovr; p.attrs=attrs; p.peak=ENG.clamp(ovr+ENG.ri(0,6),ovr,99);
  p.salary=ENG.round1(Math.max(0.9,(ovr-52)*0.34 + (p.age>28?0.8:0)));
  p.years=ENG.ri(1,4); p.morale=ENG.ri(56,78); p.loyalty=ENG.ri(42,72); p.flags={};
  p.fictional=true; p.fromTeam='fictional'; p.archetypeLabel=archetypeFromTemplate(tpl||p);
  p.scoutNote=`${p.archetypeLabel}; modeled as a familiar NFL role without carrying the real name.`;
  ENG.ensureTraits(p); seedHistory(p); p.stats=blankStats(); p.out=0;
  return p;
}
function makeFictionalDraftPool(target){
  const used=new Set(), byPos={};
  fantasySourceTeams('all').forEach(t=>t.roster.forEach(p=>{ (byPos[p.pos]||(byPos[p.pos]=[])).push(p); }));
  Object.keys(byPos).forEach(pos=>byPos[pos].sort((a,b)=>b.ovr-a.ovr));
  const pool=[], quota=ENG.QUOTA||[['QB',2],['RB',4],['WR',6],['TE',3],['T',4],['G',4],['C',2],['DE',4],['DT',4],['OLB',4],['ILB',3],['CB',5],['S',4],['K',1],['P',1]];
  let guard=0;
  while(pool.length<target && guard++<80){
    quota.forEach(([pos,cnt])=>{ for(let i=0;i<cnt && pool.length<target;i++){
      const src=byPos[pos]&&byPos[pos].length?ENG.pick(byPos[pos]):genFiller(pos,54,74);
      pool.push(makeFictionalPlayerFromTemplate(src, used));
    } });
  }
  return pool;
}
function fantasyDraft(){
  // pool players, clear rosters, snake-draft by best-available (user gets a pick UI)
  const mode=G.fantasyPool||'all';
  let pool=[];
  if(mode==='fictional'){
    pool=makeFictionalDraftPool(Math.max(G.teams.length*54, G.teams.length*46+90));
  } else {
    const seen=new Set();
    fantasySourceTeams(mode).forEach(t=>{ (t.roster||[]).forEach(p=>{ if(seen.has(p.id)) return; seen.add(p.id); pool.push(cloneFantasyPlayer(p,t.abbr)); }); });
  }
  G.teams.forEach(t=>{ t.roster=[]; });
  pool.sort((a,b)=>b.ovr-a.ovr);
  G.fdraft={pool, order:[], pick:0, round:1, picksPerTeam:46, log:[], mode};
  // snake order over teams (worst market first to be fair-ish; user can be anywhere)
  const base=G.teams.map(t=>t.abbr);
  const order=[];
  for(let r=0;r<G.fdraft.picksPerTeam;r++){ const row=(r%2===0)?base:base.slice().reverse(); order.push(...row); }
  G.fdraft.order=order;
  document.body.innerHTML=`<div id="top"></div><div id="side"><div class="nav" id="nav"></div></div><div id="main"></div>`;
  runFantasyAuto();
}
function fdNeedScore(t,p){ // higher = team needs this pos more
  const have=t.roster.filter(x=>x.pos===p.pos).length;
  const want=(ENG.QUOTA.find(q=>q[0]===p.pos)||[,2])[1];
  return (have<want? (want-have)*6 : -have*2);
}
function runFantasyAuto(){
  const fd=G.fdraft;
  while(fd.pick<fd.order.length){
    const ab=fd.order[fd.pick];
    if(ab===USER){ renderFantasyPick(); return; }   // stop for the user
    const t=team(ab);
    // AI: best available weighted by need
    const cand=fd.pool.slice(0,12).map(p=>({p,s:p.ovr*0.6+ENG.playerValue(p)*0.02+fdNeedScore(t,p)}));
    cand.sort((a,b)=>b.s-a.s); const pick=cand[0].p;
    assignFantasy(t,pick); fd.pick++;
  }
  finishFantasy();
}
function assignFantasy(t,p){
  const i=G.fdraft.pool.indexOf(p); if(i>=0)G.fdraft.pool.splice(i,1);
  p.starter=false; p.stats=blankStats(); p.out=0; t.roster.push(p);
  G.fdraft.log.unshift(`R${Math.floor(G.fdraft.pick/G.teams.length)+1}: ${t.abbr} select ${p.name} (${p.pos} ${p.ovr})`);
}
window.fantasyTake=id=>{ const fd=G.fdraft; const p=fd.pool.find(x=>x.id===id); if(!p)return;
  if(window._fdClockTimer){ clearInterval(window._fdClockTimer); window._fdClockTimer=null; }
  assignFantasy(ut(),p); fd.pick++; runFantasyAuto(); };
function fdStartClock(){
  if(window._fdClockTimer){ clearInterval(window._fdClockTimer); window._fdClockTimer=null; }
  const fd=G.fdraft; if(!fd) return; fd.deadline=Date.now()+60000;
  const tick=()=>{ const e=$('#fdclock'), f=G.fdraft; if(!f||f.order[f.pick]!==USER){ if(window._fdClockTimer){clearInterval(window._fdClockTimer);window._fdClockTimer=null;} return; }
    const ms=Math.max(0,(f.deadline||0)-Date.now()), s=Math.ceil(ms/1000);
    if(e){ const mm=Math.floor(s/60),ss=s%60; e.textContent=`${mm}:${ss<10?'0':''}${ss}`; e.style.color=s<=10?'#ef5b6b':s<=20?'#e8b341':'#46d39a'; }
    if(ms<=0){ clearInterval(window._fdClockTimer); window._fdClockTimer=null; toast('Clock expired — auto-pick.'); const best=f.pool[0]; if(best) fantasyTake(best.id); } };
  tick(); window._fdClockTimer=setInterval(tick,250);
}
window.fdSetFilter=(g)=>{ window._fdFilter=g; renderFantasyPick(); };
function finishFantasy(){
  const mode=(G.fdraft&&G.fdraft.mode)||G.fantasyPool;   // capture before the draft state is torn down
  // set starters by depth at each position
  G.teams.forEach(t=>repairRosterLegality(t,'fantasy draft'));
  // fictional/generated rosters use the low gen salary scale, so the real-NFL cap never binds —
  // rebind it to the freshly drafted payrolls (real all/selected NFL pools keep their 279 cap).
  if((mode==='fictional' || G.league!=='nfl') && !(G.rules&&G.rules.capBase>0)){
    const fc=generatedLeagueCap(G.teams);
    if(fc){ G.capMax=fc; G.teams.forEach(t=>{ t.cap=fc; }); }
  }
  delete G._fantasySourceTeams;
  delete G.fdraft;
  G._fantasySourceTeams=null;   // draft done — release the source-roster copy
  addNews('LEAGUE',`Fantasy draft complete (${fantasyPoolLabel(G.fantasyPool)}) — ${G.teams.length} brand-new rosters. The ${G.season} season is set.`);
  toast('Fantasy draft complete!'); save(); boot();
}
function renderFantasyPick(){
  const fd=G.fdraft; const rd=Math.floor(fd.pick/G.teams.length)+1; const onClock=ut();
  const filt=window._fdFilter||'ALL';
  const m=$('#main'); const top=$('#top'); const nav=$('#nav'); nav.innerHTML='';
  top.innerHTML=`<div class="logo"><b>FPS</b> <i>2026</i></div><div class="meta"><span>FANTASY DRAFT</span><span>${fantasyPoolLabel(fd.mode)}</span><span>Round <b>${rd}</b>/${fd.picksPerTeam}</span><span>Overall pick <b>${fd.pick+1}</b></span></div>`;
  m.innerHTML='';
  head(m,`${onClock.city} ${onClock.nick} — War Room`,`Snake draft from ${fantasyPoolLabel(fd.mode).toLowerCase()}. Every AI team is drafting by need and value.`);
  // on-the-clock banner + clock
  const ban=el('div','card'); ban.style.cssText='border:1px solid #f0b23f;box-shadow:0 0 0 1px #f0b23f55;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';
  ban.innerHTML=`<div style="display:flex;align-items:center;gap:12px">${logoTag(onClock,38)}<div><div class="muted" style="font-size:11px;letter-spacing:.08em">🟢 YOU ARE ON THE CLOCK</div><h3 style="margin:2px 0">${onClock.city} ${onClock.nick}</h3><span class="muted">Round ${rd} · Overall #${fd.pick+1}</span></div></div>
    <div style="display:flex;align-items:center;gap:14px"><div style="text-align:center"><div class="muted" style="font-size:10px;letter-spacing:.1em">CLOCK</div><div id="fdclock" style="font-family:var(--mono);font-weight:800;font-size:28px;line-height:1">1:00</div></div>
    <div class="flex" style="gap:8px"><button class="btn" id="autopick">⚡ Auto-pick</button><button class="btn sec" id="simrest">⏭ Sim rest</button></div></div>`;
  m.appendChild(ban);

  const wrap=el('div'); wrap.style.cssText='display:flex;gap:12px;margin-top:12px;align-items:flex-start;flex-wrap:wrap';
  // ===== board (filterable) =====
  const c=el('div','card'); c.style.cssText='flex:3 1 440px;min-width:340px';
  const filterBtns=POS_GROUPS.map(([g,lbl])=>`<button class="btn ${filt===g?'':'sec'}" style="padding:3px 9px;font-size:11px" onclick="fdSetFilter('${g}')">${lbl}</button>`).join(' ');
  const list=fd.pool.filter(p=>prospectInGroup(p,filt)).slice(0,40);
  c.innerHTML=`<h3 style="margin:0">📋 Best Available <span class="acc" style="font-weight:400;font-size:11px">— DRAFT to select</span></h3><div style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 4px">${filterBtns}</div>`;
  const tbl=el('table');
  tbl.innerHTML='<tr><th>Pos</th><th>Player</th><th>Style</th><th>Age</th><th>OVR</th><th>Ceil</th><th></th></tr>'+
    list.map(p=>`<tr><td><span class="tag">${p.pos}</span></td><td class="pname" onclick="showPlayer(${p.id})">${p.name}<div class="muted" style="font-size:10.5px">${p.fromTeam&&p.fromTeam!=='fictional'?'from '+p.fromTeam:''}</div></td><td>${p.archetypeLabel?`<span class="tag">${esc(p.archetypeLabel)}</span>`:''}</td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td class="muted">${p.pot&&p.pot>p.ovr?p.pot:'—'}</td><td><button class="btn" style="padding:3px 10px" onclick="fantasyTake(${p.id})">Draft</button></td></tr>`).join('');
  c.appendChild(tbl); if(!list.length) c.appendChild(el('p','muted','No players match this filter.'));
  wrap.appendChild(c);
  // ===== your roster + recent picks =====
  const r=el('div','card'); r.style.cssText='flex:2 1 280px;min-width:240px;max-height:640px;overflow:auto';
  r.innerHTML='<h3 style="margin:0 0 6px">Your Roster ('+onClock.roster.length+')</h3>'+
    (onClock.roster.length? '<table>'+onClock.roster.slice().sort((a,b)=>b.ovr-a.ovr).map(p=>`<tr><td><span class="tag">${p.pos}</span></td><td>${p.name}<div class="muted" style="font-size:10.5px">${p.archetypeLabel||''}</div></td><td>${ovrBadge(p.ovr)}</td></tr>`).join('')+'</table>':'<p class="muted">No picks yet.</p>')+
    '<h3 style="margin-top:12px">📡 Recent Picks</h3>'+fd.log.slice(0,12).map(l=>`<div class="news">${l}</div>`).join('');
  wrap.appendChild(r); m.appendChild(wrap);

  $('#autopick').onclick=()=>{ const best=fd.pool[0]; if(best) fantasyTake(best.id); };
  $('#simrest').onclick=()=>{ if(window._fdClockTimer){clearInterval(window._fdClockTimer);window._fdClockTimer=null;} G._fdAuto=true; while(G.fdraft && G.fdraft.pick<G.fdraft.order.length){ const ab=G.fdraft.order[G.fdraft.pick]; const t=team(ab); const cand=G.fdraft.pool.slice(0,12).map(p=>({p,s:p.ovr*0.6+fdNeedScore(t,p)})).sort((a,b)=>b.s-a.s); assignFantasy(t,cand[0].p); G.fdraft.pick++; } finishFantasy(); };
  fdStartClock();
}

/* ---------- helpers ---------- */
const team=ab=>G.teams.find(t=>t.abbr===ab);
const ut=()=>team(USER);
// ---- SALARY-CAP REALISM: dead money + franchise tag + signing-bonus acceleration ----
// Dead money is charged to the season the cut takes effect: in-season cuts hit now; offseason
// cuts hit the upcoming year (G.season increments at startNewSeasonAfterDraft). teamDead() only
// counts charges for the CURRENT season, so prior-year dead naturally rolls off.
function capYear(){ return (G.phase==='offseason'||G.phase==='draft')?G.season+1:G.season; }   // offseason moves bind the UPCOMING cap year
function deadSeason(){ return capYear(); }
function teamDead(t){ if(G.rules&&G.rules.deadMoney===false) return 0;   // SIMPLE CAP: no dead money on the books, ever
  const y=capYear(); return ENG.round1(((t&&t.dead)||[]).filter(d=>d.season===y).reduce((a,d)=>a+(d.amt||0),0)); }
// what cutting/trading a player leaves on the books: a franchise tag is fully guaranteed; a real
// multi-year deal accelerates ~45% of the remaining money; rookie deals are cheaper to escape; an
// expiring contract (years<=0) leaves nothing.
function deadCapOf(p){ if(!p || (G.rules&&G.rules.deadMoney===false)) return 0;   // SIMPLE CAP: cut/trade reclaims the FULL salary, no penalty
  const yrs=Math.max(0,(p.years||0)); if(yrs<=0) return 0;
  if(p.tagged) return ENG.round1(p.salary||0);
  return ENG.round1(Math.max(0,(p.salary||0)*yrs*0.45)*(p.rookie?0.6:1)); }
function capSpace(t){ return ENG.round1(t.cap - t.roster.reduce((a,p)=>a+p.salary,0) - teamDead(t)); }
// franchise-tag price: top-5 salary at the position (×1.05), never below a 20% raise on the player.
function tagSalary(p){ const peers=allPlayers().filter(x=>x.pos===p.pos).sort((a,b)=>(b.salary||0)-(a.salary||0)).slice(0,5);
  const avg=peers.length?peers.reduce((a,x)=>a+(x.salary||0),0)/peers.length:(p.salary||4); return ENG.round1(Math.max(avg*1.05,(p.salary||1)*1.2,3)); }
window.franchiseTag=id=>{ const t=ut(); const p=t.roster.find(x=>x.id===id); if(!p)return;
  if(t._tagYr===G.season){ toast('Only one franchise tag per year.'); return; }
  if((p.years||0)>1){ toast(`${p.name} is already under contract — no need to tag.`); return; }
  const sal=tagSalary(p), delta=sal-(p.salary||0);
  if(G.rules.salaryCap && capSpace(t)-delta<0){ toast(`Not enough cap for the tag ($${sal}M).`); return; }
  if(!confirm(`Franchise-tag ${p.name} for 1 year at $${sal}M (fully guaranteed)? It locks him out of free agency, but he won't love it.`)) return;
  p.salary=sal; p.years=1; p.tagged=true; p.tagSeason=G.season; p.flags=p.flags||{}; p.flags.wantsOut=false;
  p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(2,8),20,90); p.morale=ENG.clamp((p.morale||70)-ENG.ri(3,9),20,99); t._tagYr=G.season; syncCapUsed(t);   // paid, but wanted long-term security — a little sore
  addNews('ROSTER',`${t.city} place the franchise tag on ${p.name} ($${sal}M, 1 yr).`);
  if(window.VOICES&&p.ovr>=84) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🔖 ${t.abbr} franchise-tag ${p.name} (${p.pos}) — $${sal}M guaranteed for one year.`,'NEWS',true);
  toast(`Tagged ${p.name} ($${sal}M).`); save(); render(); };
// jersey numbers (so Hall-of-Famers have a number to retire). Position-appropriate, unique on the team.
const NUM_RANGE={QB:[1,19],RB:[20,40],FB:[40,49],WR:[10,19],TE:[80,89],T:[60,79],G:[60,79],C:[50,79],DE:[90,99],DT:[90,99],OLB:[40,59],ILB:[40,59],CB:[20,39],S:[20,39],K:[1,9],P:[1,9]};
function jerseyNumber(t,pos){ const r=NUM_RANGE[pos]||[1,99]; const used=new Set(((t&&t.roster)||[]).map(p=>+p.num).filter(n=>n));
  for(let i=0;i<40;i++){ const n=ENG.ri(r[0],r[1]); if(!used.has(n)) return String(n); }
  for(let n=1;n<=99;n++){ if(!used.has(n)) return String(n); } return String(ENG.ri(1,99)); }
function addNews(tag,txt){ G.news.unshift({wk:G.week,tag,txt}); if(G.news.length>120)G.news.pop(); }
const conf=t=>t.conf; 
function standings(){ return G.teams.slice().sort((a,b)=> (b.wins-b.losses)-(a.wins-a.losses) || b.pf-b.pa-(a.pf-a.pa)); }

/* ---------- WEEK CENTER: the weekly gate + intra-week task inbox ---------- */
function ensureWeekState(){
  if(!G) return;
  const key=G.season+'|'+G.week+'|'+G.phase;
  if(G._weekKey===key) return;
  G._weekKey=key; G.pendingUserResult=null; G._offers=null;
  if(G.phase==='regular' && G.week<G.maxWeek){
    const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER);
    G.weekGameDone=!g;                 // a bye week has nothing to resolve
    G._offers=generateOffers();        // a fresh batch of trade offers each week
  } else { G.weekGameDone=true; G._offers=null; }   // playoffs/offseason: Trade Center regenerates on demand
}
// the user's roster issues that still need a decision this week (demands, holdouts, unhappy stars)
function playerIssues(t){
  t=t||ut(); if(!t) return []; const wk=G.season+'_'+G.week; const out=[];
  t.roster.forEach(p=>{ if(ENG.ensureBrain)ENG.ensureBrain(p); if(!p.flags)p.flags={};
    if(p.flags.issueAck===wk) return;                        // already handled/acknowledged this week
    if(p.flags.wantsOut) out.push({p,kind:'demand'});
    else if(p.flags.payme) out.push({p,kind:'payme'});
    else if(p.flags.ringchase) out.push({p,kind:'ringchase'});
    else if(p.outReason==='holdout' && p.out>0) out.push({p,kind:'holdout'});
    else if(p.flags.spotlight) out.push({p,kind:'spotlight'});
    else if(p.ovr>=80 && (p.morale||70)<46) out.push({p,kind:'morale'});
  });
  return out.sort((a,b)=>b.p.ovr-a.p.ovr).slice(0,6);
}
function openTaskCount(){ if(!G||G.phase!=='regular'||G.week>=G.maxWeek) return 0; ensureWeekState();
  return (G.weekGameDone?0:1) + (G._offers?G._offers.length:0) + playerIssues().length; }
// resolving your game stores the result but does NOT advance — you handle your week first, then advance the league
function markGameResolved(result){ G.pendingUserResult=result; G.weekGameDone=true; VIEW='week'; save(); render(); }
function simUserGame(){
  const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER);
  if(!g){ G.weekGameDone=true; save(); render(); return; }
  try{ applyHurtFlags(team(g.home)); applyHurtFlags(team(g.away)); }catch(e){}
  const _rested=[]; try{ [team(g.home),team(g.away)].forEach(tm=>tm&&tm.roster.forEach(p=>{ if(p._sitWk===G.week && !p.benched){ p.benched=true; _rested.push(p); } })); }catch(e){}   // rested players sit this sim too
  const r=ENG.simGame(team(g.home),team(g.away),G.rules); markGameResolved(r);
  _rested.forEach(p=>p.benched=false);
  try{ rollAggravation(ut()); clearHurtFlags(team(g.home)); clearHurtFlags(team(g.away)); }catch(e){}
  toast(`Final: ${g.away} ${r.as} — ${r.hs} ${g.home}`);
}
window.simUserGame=simUserGame;
// ---- player-issue resolutions ----
window.taskMeet=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; const wk=G.season+'_'+G.week;
  const persuade=ENG.clamp(42 + (t.coach?((t.coach.off+t.coach.def)/2-70)*0.5:0) + (t.owner?(t.owner.patience-50)*0.2:0), 18, 86);
  if(ENG.rng()*100<persuade){ p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(10,20),25,95); p.morale=ENG.clamp((p.morale||70)+ENG.ri(6,14),20,99); p.flags.wantsOut=false; p.flags.issueAck=wk;
    recordArc(p,'MEETING',`Cleared the air with the front office; agreed to stay and compete.`);
    addNews('REQUEST',`${p.name} (${p.pos}) and ${t.city} have patched things up after a sit-down — he's staying, for now.`); toast('He bought in.'); }
  else { p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(2,8),18,90); p.flags.issueAck=wk;
    recordArc(p,'MEETING',`The meeting went nowhere; he still wants out.`);
    addNews('REQUEST',`${p.name} met with ${t.city} brass but is unmoved — he still wants out.`); toast('That went poorly.'); }
  save(); render(); };
window.taskShop=(pid)=>shopPlayer(pid);
// proactively shop a player — but word can get out. Doing it often, or shopping a loyal/happy guy, risks souring him.
window.shopPlayer=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return;
  if(G.tradeDeadlinePassed){ toast('Trade deadline has passed — no deals until the offseason.'); return; }
  if(!canSparePlayer(t,p)){ toast(`Cannot shop ${p.pos}; roster would fall below legal depth.`); return; }
  p.flags=p.flags||{}; p.flags.onBlock=true; p._shopped=(p._shopped||0)+1;
  const loyalHappy=((p.loyalty||60)>=70?0.15:0)+((p.morale||70)>=78?0.08:0);
  const getsWind = !(p.flags.wantsOut) && ENG.rng() < (0.30 + (p._shopped-1)*0.22 + (G._shopHeat||0)*0.06 + loyalHappy);
  if(getsWind){ const hit=ENG.ri(6,15)+(p._shopped-1)*4; p.morale=ENG.clamp((p.morale||70)-hit,8,99); p.loyalty=ENG.clamp((p.loyalty||60)-Math.round(hit*0.7),10,95);
    if((p.loyalty||60)<46 && ENG.rng()<0.45) p.flags.wantsOut=true;
    recordArc(p,'DRAMA',`Caught wind he was being shopped — and he's not happy about it.`);
    addNews('REQUEST',`${p.name} (${p.pos}, ${t.city}) has learned he's being shopped — and the relationship just took a hit.`);
    toast(`${p.last} found out he's on the block — he's upset.`);
  }
  G._shopHeat=(G._shopHeat||0)+1;   // shopping a lot of guys raises the league chatter (cools off over the weeks)
  const offers=generateShopOffers(p);
  G._offers=offers; G._shopContext={pid:p.id,name:p.name,pos:p.pos,ovr:p.ovr,count:offers.length,wk:G.week,season:G.season};
  TB={give:[p],get:[],other:offers[0]?offers[0].other:null}; VIEW='trade'; closeOvl();
  if(offers.length) toast(`Shopped ${p.last}: ${offers.length} team${offers.length>1?'s':''} made offer${offers.length>1?'s':''}.`);
  else toast(`Shopped ${p.last}: no firm offers yet. Try a manual counter.`);
  save(); render(); };
window.taskHoldFirm=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; p.flags.issueAck=G.season+'_'+G.week;
  const wasMoney=p.flags.payme||p.flags.spotlight; p.flags.payme=false; p.flags.ringchase=false; p.flags.spotlight=false;
  p.morale=ENG.clamp((p.morale||70)-ENG.ri(3,9),15,99); p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(4,12),12,95);
  if(wasMoney && (p.loyalty||60)<42 && ENG.rng()<0.5){ p.flags.wantsOut=true; }   // refuse to pay a star and he may force his way out
  recordArc(p,'REQUEST',`The team held the line; he's unhappy but still in the building.`);
  addNews('REQUEST',`${t.city} won't budge on ${p.name}. The locker room is watching.`); toast('You held firm.'); save(); render(); };
// pay a star: big extension that resolves pay-me / spotlight / ring-chase
window.taskExtendStar=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; const wk=G.season+'_'+G.week;
  const cost=ENG.round1(Math.max(6,p.ovr*0.32)), raise=ENG.round1(p.salary*ENG.ri(18,38)/100);
  if(t.cash<cost){ toast(`Need $${cost}M cash for this deal.`); return; }
  if(G.rules.salaryCap!==false && capSpace(t)-raise<0){ toast('No cap room for that extension.'); return; }
  t.cash=ENG.round1(t.cash-cost); p.salary=ENG.round1(p.salary+raise); p.years=Math.max(p.years||1,3)+ENG.ri(0,2);
  p.flags.payme=false; p.flags.spotlight=false; p.flags.ringchase=false; p.flags.wantsOut=false; p.flags.issueAck=wk;
  p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(14,24),35,98); p.morale=ENG.clamp((p.morale||70)+ENG.ri(10,18),35,99);
  recordArc(p,'CONTRACT',`Signed a top-of-market extension to stay with ${t.city}.`);
  addNews('SIGNING',`${t.city} reward ${p.name} with a new top-of-market extension ($${cost}M bonus, +$${raise}M/yr). He's locked in.`); toast('Star extended.'); save(); render(); };
window.taskRework=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; const wk=G.season+'_'+G.week;
  const cost=ENG.round1(Math.max(6,p.ovr*0.28)), raise=ENG.round1(p.salary*ENG.ri(12,28)/100);
  if(t.cash<cost){ toast(`Not enough cash — needs $${cost}M.`); return; }
  if(G.rules.salaryCap!==false && capSpace(t)-raise<0){ toast('No cap room to rework his deal.'); return; }
  t.cash=ENG.round1(t.cash-cost); p.salary=ENG.round1(p.salary+raise); p.years=(p.years||1)+ENG.ri(1,2);
  p.out=0; p.outReason=null; p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(12,22),30,96); p.morale=ENG.clamp((p.morale||70)+ENG.ri(8,16),30,99); p.flags.issueAck=wk;
  recordArc(p,'HOLDOUT',`Holdout over — signed a reworked deal and reported.`);
  addNews('SIGNING',`${t.city} end ${p.name}'s holdout with a reworked deal ($${cost}M bonus, +$${raise}M/yr). He reports immediately.`); toast('Holdout resolved.'); save(); render(); };
window.taskWaitOut=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; p.flags.issueAck=G.season+'_'+G.week;
  // leverage = your coach's command + owner patience + how badly he wants to play (low loyalty = wants leverage, not to sit)
  const lev=ENG.clamp((t.coach?(t.coach.ovr-70)/2:0)+(t.owner?((t.owner.patience||60)-50)/3:0)+((p.loyalty||60)-50)/4,-18,38);
  const r=ENG.rng()*100;
  if(r < 34+lev){ // he blinks first — reports with no new deal
    p.out=0; p.outReason=null; p.morale=ENG.clamp((p.morale||70)-ENG.ri(2,7),12,99); p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(1,5),14,92);
    recordArc(p,'RESOLVE',`Blinked first — ended his holdout and reported without a new deal.`);
    addNews('RESOLVE',`${p.name} caves — he's ended his holdout and reported to ${t.city} with no new deal. The team won the staredown.`); toast('He caved and reported.');
  } else if(r > 86-lev*0.4){ // it sours into a full trade demand
    p.flags.wantsOut=true; p.out=0; p.outReason=null; p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(10,20),12,80); p.morale=ENG.clamp((p.morale||70)-ENG.ri(8,16),12,90);
    recordArc(p,'REQUEST',`Holdout soured into a trade demand.`);
    addNews('REQUEST',`The standoff with ${p.name} has turned ugly — he now wants OUT of ${t.city} entirely.`); toast('It soured — he wants out now.');
  } else { // drags on another week or two
    p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(4,9),16,90); p.out=Math.max(p.out||0,ENG.ri(1,2));
    recordArc(p,'HOLDOUT',`The standoff drags on — neither side blinking.`);
    addNews('HOLDOUT',`${t.city} won't blink on ${p.name}'s holdout — the standoff hardens.`); toast('Standoff drags on.');
  }
  save(); render(); };
// hardball: fine the holdout daily. Often forces him back fast — but it scorches the relationship and can backfire.
window.taskFineHoldout=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; p.flags.issueAck=G.season+'_'+G.week;
  p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(8,16),10,85); p.morale=ENG.clamp((p.morale||70)-ENG.ri(6,12),10,90);
  if(ENG.rng()<0.6){ p.out=Math.min(p.out||1,1); recordArc(p,'HOLDOUT',`Fined daily; grudgingly reporting — but he won't forget it.`);
    addNews('HOLDOUT',`${t.city} are fining ${p.name} for every missed day. He's expected back shortly — bitter, but back.`); toast('Fines applied — he\'ll be back, and bitter.'); }
  else { if(ENG.rng()<0.45) p.flags.wantsOut=true; recordArc(p,'HOLDOUT',`Fines only dug him in deeper.`);
    addNews('HOLDOUT',`Fining ${p.name} backfired — he's dug in, and the relationship is fracturing.`); toast('Backfired — he dug in.'); }
  save(); render(); };
window.taskAddress=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; p.morale=ENG.clamp((p.morale||70)+ENG.ri(8,18),20,99); p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(3,9),20,95); p.flags.issueAck=G.season+'_'+G.week;
  recordArc(p,'MORALE',`A check-in from the staff lifted his spirits.`); toast(`Checked in with ${p.last}.`); save(); render(); };
window.taskIgnore=(pid)=>{ const t=ut(),p=t.roster.find(x=>x.id===pid); if(!p)return; p.flags.issueAck=G.season+'_'+G.week; toast('Set aside for now.'); save(); render(); };

/* ---------- season / sim ---------- */
function advanceWeek(opts){
  opts=opts||{};
  if(G.phase==='regular'){
    if(G.week>=G.maxWeek){ startPlayoffs(); render(); return; }
    ensureWeekState();
    // YOU must play or sim your own game before the league moves on
    if(!G.weekGameDone && !opts.force){ toast('Play or sim your game first.'); VIEW='week'; render(); return; }
    // snapshot who's ALREADY sidelined (injury/holdout) — they sit THIS week's game, then heal AFTER it.
    // (fixes the play-through-holdout off-by-one: out=1 used to decrement to 0 before kickoff.)
    const sidelined=new Set(); G.teams.forEach(t=>t.roster.forEach(p=>{ if(p.out>0) sidelined.add(p.id); }));
    repairAllRosters('week start');
    const games=G.schedule[G.week]; const results=[]; const ur=opts.userResult||G.pendingUserResult;
    G.teams.forEach(t=>t.roster.forEach(p=>{ p._gameUsageRisk=0; }));
    // ---- BYE WEEKS + FATIGUE: teams not playing this week rest (recover wear + an extra heal); set each team's fatigue from accumulated wear
    const playing=new Set(); games.forEach(g=>{ playing.add(g.home); playing.add(g.away); });
    G.teams.forEach(t=>{
      if(!playing.has(t.abbr)){ t.roster.forEach(p=>{ p.wear=ENG.clamp((p.wear||0)-22,0,100); }); if(t.abbr===USER) addNewsIf(true,'LEAGUE',`${t.city} are on their bye — a week to get healthy and rested.`); }
      const start=t.roster.slice().sort((a,b)=>b.ovr-a.ovr).slice(0,22); const aw=start.reduce((s,p)=>s+(p.wear||0),0)/(start.length||1);
      t._fatigue=ENG.clamp(aw/100*2.1 - (playing.has(t.abbr)?0:1.2), 0, 3);   // worn = penalty; off a bye = fresh (gentle, so late-season scoring stays realistic)
    });
    const injRules=Object.assign({weeksLeft:Math.max(6,G.maxWeek-G.week)}, G.rules);
    games.forEach(g=>{ const h=team(g.home), a=team(g.away); if(!h||!a) return;
      // your resolved result (coached/quick-sim/sim) counts; everyone else is simmed.
      // international games are neutral-site: no home-field edge (passed via rules.neutral).
      const wxKey = g.intl ? g.intl.wx : gameWeather(g.home,G.week);
      const simRules = g.intl ? Object.assign({neutral:true}, G.rules) : G.rules;
      const r=(ur && (g.home===USER||g.away===USER)) ? ur : ENG.simGame(h,a,simRules); results.push(r);
      h.pf+=r.hs;h.pa+=r.as;a.pf+=r.as;a.pa+=r.hs;
      if(r.hs>r.as){h.wins++;a.losses++;} else {a.wins++;h.losses++;}
      ENG.reactToResult(h,r.hs>r.as,a,Math.abs(r.hs-r.as));
      ENG.reactToResult(a,r.as>r.hs,h,Math.abs(r.hs-r.as));
      accumStats(r); trackRecords(r);
      applyGameUsageLoad(r,[h,a],wxKey);
      // WEAR: up with usage, down with rest. Snap-share by role/position; low-usage players actually recover (sideline rest); endurance resists.
	      const heatWear=(WX[wxKey]&&WX[wxKey].fatigue)?1.34:1.0;
	      [h,a].forEach(t=>t.roster.forEach(p=>{ const snap = p.starter ? (HIGH_CONTACT.has(p.pos)?1.0:0.7) : 0.22;
	        const en=((p.attrs&&p.attrs.EN)||62)/100;
	        if(snap>=0.4) p.wear=ENG.clamp((p.wear||0) + snap*ENG.ri(6,11)*(1.25-en*0.6)*heatWear, 0,100);   // heavy usage → more wear, endurance blunts it
	        else p.wear=ENG.clamp((p.wear||0) - ENG.ri(0,3), 0,100); }));                            // barely played → rested up
	      if(wxKey==='heat' && (g.home===USER||g.away===USER)) addNews('LEAGUE',`🔥 Heat was a factor in ${team(g.away).city} at ${team(g.home).city}; starters logged extra fatigue and hydration mattered late.`);
      // INTERNATIONAL TRAVEL: a long flight + time-zone change wears down BOTH clubs (jet lag), endurance resists a little
      if(g.intl){ [h,a].forEach(t=>t.roster.forEach(p=>{ const en=((p.attrs&&p.attrs.EN)||62)/100; p.wear=ENG.clamp((p.wear||0)+ENG.ri(5,10)*(1.2-en*0.5),0,100); }));
        addNewsIf(g.home===USER||g.away===USER,'LEAGUE',`${g.intl.flag} ${team(g.away).city} ${results[results.length-1].as}, ${team(g.home).city} ${results[results.length-1].hs} at ${g.intl.venue}. The travel will leave its mark — legs were heavy.`); }

      // turf + training facility lower soft-tissue injury risk (floor ~0.83)
      [h,a].forEach(tm=>{ const uu=(tm.stadium&&tm.stadium.upgrades)||{}; tm._injMod=ENG.clamp(1-(uu.turf||0)*0.04-(uu.training||0)*0.03,0.83,1); });
      // injuries — wear-scaled, with season-ending & career-ending tiers
      ENG.gameInjuries(h,a,injRules).forEach(inj=>{ const tm=team(inj.team), isU=inj.team===USER, pl=tm.roster.find(x=>x.id===inj.id);
        if(inj.career){ if(pl){ tm.roster=tm.roster.filter(x=>x.id!==inj.id); processRetirement(pl,tm); }
          addNews('INJURY',`💔 ${inj.name} (${inj.pos}, ${tm.city}) suffers a CAREER-ENDING injury and is forced to retire.`);
          if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`💔 Heartbreak: ${inj.name} (${inj.pos}, ${tm.abbr}) suffers a career-ending injury. An emotional locker room.`,'NEWS',inj.ovr>=82); }
        else if(inj.severe){ if(pl) registerInjury(tm,pl,inj); addNews('INJURY',`🚑 ${inj.name} (${inj.pos}, ${tm.city}) is lost for the season — ${inj.body||'major'} ${inj.reason}.`);
          if(window.VOICES&&inj.ovr>=80) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚑 Tough blow: ${inj.name} (${inj.pos}, ${tm.abbr}) is out for the season.`,'NEWS',true); }
        else { if(pl) registerInjury(tm,pl,inj); addNewsIf(isU,'INJURY',`${inj.name} (${inj.pos}, ${tm.city}) ${inj.concussion?'is in the concussion protocol':`has a ${inj.body||'soft-tissue'} injury`} — out ${inj.weeks} week${inj.weeks>1?'s':''}.`); } });
    });
    // NOW the sidelined heal a week — AFTER they've actually missed this week's game (bye teams heal a touch faster).
    // New injuries suffered today aren't in `sidelined`, so they keep their full timeline.
    G.teams.forEach(t=>{ const onBye=!playing.has(t.abbr); ensureMedical(t); t.roster.forEach(p=>{ if(!sidelined.has(p.id)||p.out<=0) return;
      const ho=p.outReason==='holdout', med=trainerRating(t), irBonus=p.ir?0.45:0; p.out--; if(onBye && p.out>0 && ENG.rng()<0.5) p.out--;
      if(!ho && p.out>0 && (p.ir||onBye) && ENG.rng()<ENG.clamp((med-60)/95+irBonus,0.08,0.62)) p.out--;
      if(p.injury) p.injury.weeks=Math.max(0,p.out||0);
      if(p.injury){ const noPlay=p.injury.noPlayThru||p.ir; ensureDurability(p);
        if(p.out>=2){ p.injury.status='OUT'; p.injury.playable=false; }
        else if(p.out===1 && !noPlay){ const tough=(p.durability-50)/50, qC=ENG.clamp(0.5+tough*0.2+(med-68)*0.004,0.25,0.85);
          if(ENG.rng()<qC){ p.injury.playable=true; p.injury.status=(p.durability>=58?'QUESTIONABLE':'DOUBTFUL'); } else { p.injury.playable=false; p.injury.status='DOUBTFUL'; } }
        else if(p.out===1){ p.injury.status='OUT'; p.injury.playable=false; }
        else { p.injury.status='PROBABLE'; p.injury.playable=false; } }
      if(p.out===0){ if(ho){ p.outReason=null; p.morale=ENG.clamp((p.morale||70)+ENG.ri(4,9),12,99); p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(2,6),12,98);
          const txt=`${p.name} (${p.pos}) has ended his holdout and reported to ${t.city} — the two sides found common ground.`; recordArc(p,'RESOLVE',txt); addNews('RESOLVE',txt); }
        else if(p.ir){ if(p.injury){ p.injury.notes=p.injury.notes||[]; p.injury.notes.unshift(`Medically cleared in week ${G.week+1}; still on IR until activated.`); } addNewsIf(t.abbr===USER,'INJURY',`${p.name} (${p.pos}) is medically cleared but remains on IR until activated.`); }
        else { p.outReason=null; if(p.injury) p.injury.clearedWeek=G.week+1; addNewsIf(t.abbr===USER,'INJURY',`${p.name} (${p.pos}) is cleared to return for ${t.city}.`); } } }); });
    // stadium construction advances a week BEFORE finances (completed projects pay off immediately)
    G.teams.forEach(t=>{ try{ tickStadiumProjects(t); }catch(e){} });
    // finances for everyone (half home each week approx) — apply=true pays down stadium debt
    G.teams.forEach(t=>{ const home=results.find(r=>r.home===t.abbr); const f=ENG.weeklyFinance(t,!!home,true); t.cash=ENG.round1(t.cash+f.profit); t._lastFin=f; });
    if(scoutingOpen()) G.teams.forEach(autoScoutWeek);   // the whole league's scout departments work the board automatically
    { const ug=results.find(r=>r.home===USER||r.away===USER); if(ug){ const won=(ug.home===USER?ug.hs>ug.as:ug.as>ug.hs); const t=ut(); ensureOwner(t); t.owner.confidence=ENG.clamp(t.owner.confidence+(won?0.9:-1.1),0,100); ownerReact(t,won); } }
    G.lastResults=results; G.week++; G.pendingUserResult=null;
    ownerEvents();
    weeklyAward(results);
    writeWeekNews(results);
    usageMoraleTick(results);   // feed your stars or they get squeaky — usage drives morale; contract-year guys ball out
    brainTick();          // motivation + off-field life (the running brain)
    personaTick();        // personalities drive the room — captains steady it, head cases (the AB arc) blow it up
    qbCarouselTick();     // losing teams hand the keys to a young QB down the stretch
    rivalryTick(results); // QB–QB and WR–CB rivalries build through their meetings
    autoFA();             // AI teams work the free-agent market (you have to compete)
    aiTradeTick();        // AI teams trade with each other — the market moves without you
    tradeDeadlineTick();  // mid-season deadline buzz → flurry → hard freeze
    repairAllRosters('post-transaction sweep'); aiCapSweep();
    storyEngine(results);
    if(window.ncaaTick) ncaaTick();                // the college season plays its Saturday slate
    try{ runAutoManagement(ut()); }catch(e){}     // "Just Coach" — the front office handles the busywork
    scandalTick();                                 // tabloid soap operas — reporters, betrayals, owners' families, locker-room nukes
    if(window.VOICES) VOICES.feedTick(results);   // the social timeline reacts to the week
    starNarrativeTick(results);                    // the league's biggest stars take over the headlines
    if(typeof pregameTrash!=='undefined') pregameTrash();   // mouthy stars fire shots before the next slate; rivalries gain heat
    if(typeof aiScenarioTick!=='undefined') aiScenarioTick();   // Claude (if a key is set) drops a fresh, never-repeating storyline
    autoGazette();        // the Newsroom writes this week's Gazette (if your key is set)
    ensureWeekState();    // build the new week's tasks now (game + offers + issues)
    if(G.phase==='regular') VIEW='week';   // land on the new week's hub
  } else if(G.phase==='playoffs'){ playoffRound(); }
  save(); render();
}
function addNewsIf(cond,tag,txt){ if(cond) addNews(tag,txt); }
// accumulate per-player season stats + award points from a game's box score
// career milestone thresholds (announced once when crossed)
const MILESTONES={ cpyd:[{n:10000,t:'10,000 career passing yards'},{n:25000,t:'25,000 career passing yards'},{n:40000,t:'40,000 career passing yards — all-time great'},{n:60000,t:'60,000 passing yards — legend'}],
  cptd:[{n:100,t:'100 career passing TDs'},{n:200,t:'200 career passing TDs'},{n:300,t:'300 passing TDs — Canton-bound'}],
  cryd:[{n:5000,t:'5,000 career rushing yards'},{n:10000,t:'10,000 career rushing yards'},{n:15000,t:'15,000 rushing yards — all-time great'}],
  crtd:[{n:50,t:'50 career rushing TDs'},{n:100,t:'100 career rushing TDs — elite'}],
  crecyd:[{n:5000,t:'5,000 career receiving yards'},{n:10000,t:'10,000 career receiving yards'},{n:15000,t:'15,000 receiving yards — legend'}],
  crectd:[{n:50,t:'50 career receiving TDs'},{n:100,t:'100 receiving TDs — all-time great'}],
  csack:[{n:50,t:'50 career sacks'},{n:100,t:'100 career sacks — Hall of Fame résumé'}],
  cintc:[{n:20,t:'20 career interceptions'},{n:40,t:'40 career INTs — ballhawk legend'}] };
function checkMilestones(p,t){ p._mile=p._mile||{}; const c=p.career||{};
  const map={cpyd:'pyd',cptd:'ptd',cryd:'ryd',crtd:'rtd',crecyd:'recyd',crectd:'rectd',csack:'sack',cintc:'intc'};
  Object.keys(MILESTONES).forEach(ck=>{ const tot=c[map[ck]]||0; MILESTONES[ck].forEach(m=>{ const key=ck+m.n;
    if(tot>=m.n && !p._mile[key]){ p._mile[key]=1; ensureNick(p);
      addNews('MILESTONE',`🎖️ ${p.name} (${p.pos}, ${t.abbr}) reaches ${m.t}.`);
      if(window.VOICES) VOICES.feedPush({h:'@GridironStats',n:'Gridiron Stats',v:true,c:'#46d39a'},`🎖️ MILESTONE: ${p.name}${p.nick?' "'+p.nick+'"':''} hits ${m.t}.`,'NEWS',m.n>=10000||m.n>=100); } }); });
}
function accumStats(r){
  const seen=new Set();
  (r.lines||[...r.box.home.lines,...r.box.away.lines]).forEach(l=>{ normalizeLineStats(l); const f=findPlayer(l.id); if(!f)return; const p=f.p; const t=f.t; const s=p.stats||(p.stats=blankStats());
    if(!seen.has(l.id)){ s.g++; seen.add(l.id); }
    const car=p.career||(p.career={});
    const carries = l.car!=null ? l.car : (l.ratt!=null ? l.ratt : 0);   // coach-mode lines use ratt
    if(carries){ s.car=(s.car||0)+carries; car.car=(car.car||0)+carries; }
    STAT_KEYS.filter(k=>k!=='g'&&k!=='car'&&k!=='lng').forEach(k=>{ if(l[k]){ s[k]=(s[k]||0)+l[k]; car[k]=(car[k]||0)+l[k]; } });
    const big=Math.max(l.pyd||0,l.ryd||0,l.recyd||0); if(big>(s.lng||0)) s.lng=big;
    p.awardPts=(p.awardPts||0)+ENG.awardScore(p.pos,l);
    checkMilestones(p,t); });
}
// single-game record book (most pass yds, rush yds, etc.)
function trackRecords(r){
  const R=G.records||(G.records={}); const breaks=[];
  [r.box.home,r.box.away].forEach(side=>{ side.lines.forEach(l=>{
    const chk=(key,val,label,unit)=>{ if(val>0 && (!R[key]||val>R[key].val)){ const prev=R[key]; R[key]={val,name:l.name,team:side.team,season:G.season,week:G.week+1,label};
      if(prev && val>prev.val) breaks.push({name:l.name,team:side.team,val,prev:prev.val,label,unit,id:l.id}); } };
    chk('passYds',l.pyd,'Pass Yds (game)','pass yds'); chk('rushYds',l.ryd,'Rush Yds (game)','rush yds');
    chk('recYds',l.recyd,'Rec Yds (game)','rec yds'); chk('sacks',l.sack,'Sacks (game)','sacks');
  }); });
  const topScore=Math.max(r.hs,r.as), wTeam=(r.hs>=r.as?r.home:r.away);
  if(topScore>0 && (!R.teamPts||topScore>R.teamPts.val)){ const prev=R.teamPts; R.teamPts={val:topScore,name:team(wTeam).city,team:wTeam,season:G.season,week:G.week+1,label:'Team Pts (game)'};
    if(prev && topScore>prev.val) breaks.push({name:team(wTeam).city,team:wTeam,val:topScore,prev:prev.val,label:'Team Pts (game)',unit:'points'}); }
  // LIVE record-break headlines — rare, so they pop when they happen
  breaks.forEach(b=>{ const what=b.label.replace(' (game)','').toLowerCase();
    addNews('RECORD',`📕 RECORD! ${b.name} (${b.team}) sets a new single-game ${what} mark — ${b.val} ${b.unit} (old ${b.prev}).`);
    if(window.VOICES) VOICES.feedPush({h:'@GridironGazette',n:'The Gazette',v:true,c:'#caa46a'},`📕 RECORD BOOK: ${b.name} — ${b.val} ${b.unit}, a new single-game league record.`,'NEWS',true);
    if(b.id){ const fp=findPlayer(b.id); if(fp&&fp.p){ fp.p.morale=ENG.clamp((fp.p.morale||70)+ENG.ri(5,10),12,99); fp.p.loyalty=ENG.clamp((fp.p.loyalty||60)+ENG.ri(2,5),12,98); } } });   // record day = a happy, bought-in player
}

function startPlayoffs(){
  G.phase='playoffs';
  const byConf={};
  G.teams.forEach(t=>{ (byConf[t.conf]=byConf[t.conf]||[]).push(t); });
  const seeds={};
  // seed count scales with conference size so the regular season always matters:
  // small leagues don't let everyone in (4-team conf → top 2), big leagues cap at 7 (NFL stays 7).
  Object.keys(byConf).forEach(c=>{ const n=byConf[c].length, auto=ENG.clamp(n<=2?1:n<=5?2:Math.round(n*0.55),1,7), take=ENG.clamp((G.rules&&G.rules.playoffTeams)||auto,1,n);
    seeds[c]=byConf[c].slice().sort((a,b)=>(b.wins-b.losses)-(a.wins-a.losses)||(b.pf-b.pa)-(a.pf-a.pa)).slice(0,take); });
  G.playoffs={seeds,round:1,bracket:seeds,log:[],champ:null};
  addNews('PLAYOFFS',`The regular season is over. Playoffs begin!`);
}
// a playoff game: simulate for the SCORE, but the winner is rating-driven (with a small higher-seed edge),
// so a dominant team reliably advances and can win it all — dynasties are possible, upsets still happen
function syncBoxPoints(r){ if(r&&r.box){ if(r.box.home)r.box.home.pts=r.hs; if(r.box.away)r.box.away.pts=r.as; } return r; }
function playoffWinner(a,b){ const r=ENG.simGame(a,b,G.rules); const d=ENG.teamOvr(a)-ENG.teamOvr(b);
  const pa=1/(1+Math.pow(10,-(d+1.5)/7)); const w=ENG.rng()<pa?a:b;   // clearly-better teams win reliably; close games stay coin-flips
  if((w===a)!==(r.hs>=r.as)){
    // rating-driven flip: normalize score + attempt to keep box plausible (do not just swap hs/as blindly)
    if(w===a){ r.hs=Math.max(r.as+3, r.hs||0); r.as=Math.min(r.hs-3, r.as||0); }
    else { r.as=Math.max(r.hs+3, r.as||0); r.hs=Math.min(r.as-3, r.hs||0); }
    if(r.box){ r.box.home.pts=r.hs; r.box.away.pts=r.as; }
    syncBoxPoints(r);
  }
  return {w,r:syncBoxPoints(r)}; }
function playoffRound(){
  const po=G.playoffs; const next={}; const confs=Object.keys(po.bracket);
  let anyMulti=false; const roundGames=[];
  confs.forEach(c=>{ let teams=po.bracket[c].slice(); const winners=[];
    for(let i=0;i<Math.floor(teams.length/2);i++){ const hi=teams[i], lo=teams[teams.length-1-i];
      const {w,r}=playoffWinner(hi,lo); winners.push(w); roundGames.push({conf:c,home:hi.abbr,away:lo.abbr,hs:r.hs,as:r.as,winner:w.abbr,ot:!!r.ot}); }
    if(teams.length%2){ const bye=teams[Math.floor(teams.length/2)]; winners.push(bye); roundGames.push({conf:c,bye:bye.abbr,winner:bye.abbr}); } // bye
    if(!(G.rules&&G.rules.playoffReseed===false)) winners.sort((a,b)=>(b.wins-b.losses)-(a.wins-a.losses));   // reseed after each round (toggle)
    next[c]=winners; if(winners.length>1)anyMulti=true;
  });
  po.log.push({round:po.round, games:roundGames});
  po.bracket=next; po.round++;
  // each conf down to 1 -> championship
  const champs=confs.filter(c=>next[c].length===1).map(c=>next[c][0]);
  if(champs.length===confs.length && confs.length>=2){
    const {w:champ,r}=playoffWinner(champs[0],champs[1]);
    po.champ=champ; po.finalScore=r;
    po.log.push({round:'Championship', games:[{conf:'FINAL',home:champs[0].abbr,away:champs[1].abbr,hs:r.hs,as:r.as,winner:champ.abbr,ot:!!r.ot}]});
    addNews('CHAMPION',`🏆 The ${champ.city} ${champ.nick} win the ${G.season} championship!`);
    endSeason(champ);
  } else if(confs.every(c=>next[c].length===1) && confs.length===1){
    po.champ=next[confs[0]][0]; po.finalScore=null;
    addNews('CHAMPION',`🏆 The ${po.champ.city} ${po.champ.nick} win the ${G.season} championship!`);
    endSeason(po.champ);
  } else {
    addNews('PLAYOFFS',`Playoff round ${po.round-1} complete.`);
  }
}
// league-wide stat leaders (uses accumulated p.stats); returns {cat:[{name,team,pos,val}]}
function allPlayers(){ const out=[]; G.teams.forEach(t=>t.roster.forEach(p=>out.push({p,t}))); return out; }
function leaders(cat, n){
  n=n||10; const key={pass:'pyd',passTD:'ptd',rush:'ryd',rushTD:'rtd',rec:'recyd',recTD:'rectd',tackle:'tkl',sack:'sack',int:'intc',
    pressure:'pr',hurry:'hurry',hit:'qbhit',tfl:'tfl',pbu:'pbu',ff:'ff',explosive:'big',xpass:'xpass',xrush:'xrush',xrec:'xrec'}[cat];
  return allPlayers().filter(x=>x.p.stats&&x.p.stats[key]>0)
    .sort((a,b)=>b.p.stats[key]-a.p.stats[key]).slice(0,n)
    .map(x=>({name:x.p.name,team:x.t.abbr,pos:x.p.pos,val:x.p.stats[key],id:x.p.id}));
}
// season awards from accumulated award points (AWARDS.INI: MVP, OPOY, DPOY, ROY, All-Pro)
function seasonAwards(){
  const all=allPlayers();
  const fmt=x=>x?{name:x.p.name,pos:x.p.pos,team:x.t.abbr,id:x.p.id,pts:x.p.awardPts||0}:null;
  // major awards weight production AND quality (OVR), position value, and team success —
  // so an elite QB on a winner beats a high-touch depth back (matches the Vegas odds model).
  const ov=x=>x.p.ovr||(x.p.attrs&&x.p.attrs.OVR)||60, win=x=>x.t.wins||0;
  const mvpScore =x=>(x.p.awardPts||0)+ov(x)*2  +(x.p.pos==='QB'?55:['RB','WR'].includes(x.p.pos)?14:0)+win(x)*3.2;
  const opoyScore=x=>(x.p.awardPts||0)+ov(x)*2  +(x.p.pos==='QB'?30:0)+win(x)*2;
  const dpoyScore=x=>(x.p.awardPts||0)*1.3+ov(x)*2+(['DE','OLB'].includes(x.p.pos)?12:0)+win(x)*2;
  const royScore =x=>(x.p.awardPts||0)+ov(x)*2.4;
  const mvp =all.slice().sort((a,b)=>mvpScore(b)-mvpScore(a))[0];
  const opoy=all.filter(x=>ENG.OFF.has(x.p.pos)).sort((a,b)=>opoyScore(b)-opoyScore(a))[0];
  const dpoy=all.filter(x=>ENG.DEF.has(x.p.pos)).sort((a,b)=>dpoyScore(b)-dpoyScore(a))[0];
  const roy =all.filter(x=>x.p.rookie).sort((a,b)=>royScore(b)-royScore(a))[0];
  const posList=['QB','RB','WR','TE','T','G','C','DE','DT','OLB','ILB','CB','S','K','P'];
  // All-Pro = best at the position: blend production (awardPts) with QUALITY (OVR) + team success,
  // so an elite homegrown star is recognized even if a compiler piled up counting stats.
  const apScore=x=>(x.p.awardPts||0)+ov(x)*3.2+win(x)*1.4;
  const at=(pos,n)=>{ const r=all.filter(x=>x.p.pos===pos).sort((a,b)=>apScore(b)-apScore(a)); return r[n]?{pos,...fmt(r[n])}:null; };
  const allPro=posList.map(p=>at(p,0)).filter(Boolean);     // 1st team All-Pro
  const allPro2=posList.map(p=>at(p,1)).filter(Boolean);    // 2nd team All-Pro
  all.forEach(x=>{ x.p.careerPts=(x.p.careerPts||0)+(x.p.awardPts||0);   // career total for Hall of Fame
    if(x.p.rookie) x.p.rookie=false; });   // rookie status lasts exactly one season — clear it after ROY is decided
  return {season:G.season, mvp:fmt(mvp), opoy:fmt(opoy), dpoy:fmt(dpoy), roy:fmt(roy), allPro, allPro2};
}
// Pro Bowl — conference all-star rosters + a loose all-star game; credits players' résumés
function runProBowl(){
  const all=allPlayers(); const POS=[['QB',1],['RB',2],['WR',3],['TE',1],['T',2],['G',2],['C',1],['DE',2],['DT',2],['OLB',2],['ILB',2],['CB',3],['S',2],['K',1],['P',1]];
  const pbScore=x=>(x.p.awardPts||0)+((x.p.ovr||(x.p.attrs&&x.p.attrs.OVR)||60))*3+( x.t.wins||0)*1.2;   // Pro Bowl rewards quality + production, not just volume
  const roster=filter=>{ const r=[]; POS.forEach(([pos,n])=>{ all.filter(x=>x.p.pos===pos && filter(x)).sort((a,b)=>pbScore(b)-pbScore(a)).slice(0,n).forEach(x=>{ x.p.proBowls=(x.p.proBowls||0)+1; r.push({id:x.p.id,name:x.p.name,pos,team:x.t.abbr}); }); }); return r; };
  let confs=[...new Set(G.teams.map(t=>t.conf))], nameA,nameB,a,b;
  if(confs.length>=2){ confs=confs.sort((x,y)=>G.teams.filter(t=>t.conf===y).length-G.teams.filter(t=>t.conf===x).length).slice(0,2);
    nameA=confs[0]; nameB=confs[1]; a=roster(x=>x.t.conf===confs[0]); b=roster(x=>x.t.conf===confs[1]); }
  else { nameA='Stars'; nameB='Stripes'; a=roster(x=>stadiumHash(x.t.abbr)%2===0); b=roster(x=>stadiumHash(x.t.abbr)%2===1); }
  const aS=ENG.ri(24,45), bS=ENG.ri(24,45); const winR=aS>=bS?a:b;
  const skill=winR.filter(p=>['QB','RB','WR','TE'].includes(p.pos)); const mvp=skill.length?ENG.pick(skill):(winR[0]||{name:'—'});
  G.proBowl={season:G.season, a:{name:nameA,roster:a,score:aS}, b:{name:nameB,roster:b,score:bS}, mvp:mvp.name, mvpTeam:mvp.team||''};
  addNews('AWARD',`⭐ Pro Bowl: ${nameA} ${aS}, ${nameB} ${bS} — ${mvp.name} named MVP.`);
  if(window.VOICES) VOICES.feedPush({h:'@FPSFootball',n:'FPS Football',v:true,c:'#1d9bf0'}, `⭐ PRO BOWL — ${nameA} ${aS}, ${nameB} ${bS}. MVP: ${mvp.name}. All-star rosters announced.`,'AWARD',true);
}
function endSeason(champ){
  G.phase='offseason';
  const snap=c=>{ const L=leaders(c,1)[0]; return L?`${L.name} (${L.team}) ${L.val}`:'—'; };
  const aw=seasonAwards();
  G.awards=G.awards||{weekly:[],season:[]}; G.awards.season.unshift(aw);
  const nm=x=>x?`${x.name} (${x.team})`:'—';
  runProBowl();
  addNews('AWARD',`🏅 ${G.season} MVP: ${nm(aw.mvp)}.`);
  addNews('AWARD',`Offensive POY: ${nm(aw.opoy)} · Defensive POY: ${nm(aw.dpoy)}${aw.roy?` · Rookie of the Year: ${nm(aw.roy)}`:''}.`);
  G.history.push({season:G.season, champ:champ.abbr, runnerUp:(G.playoffs.finalScore?(champ.abbr===G.playoffs.finalScore.home?G.playoffs.finalScore.away:G.playoffs.finalScore.home):''),
    finalScore:G.playoffs.finalScore?`${Math.max(G.playoffs.finalScore.hs,G.playoffs.finalScore.as)}-${Math.min(G.playoffs.finalScore.hs,G.playoffs.finalScore.as)}`:'',
    standings:standings().slice(0,5).map(t=>t.abbr), mvp:aw.mvp, allPro:aw.allPro, allPro2:aw.allPro2, proBowl:G.proBowl,
    leaders:{pass:snap('pass'),rush:snap('rush'),rec:snap('rec'),sack:snap('sack')}});
  // ---- career milestones (feed the neural-net retirement + Hall-of-Fame models) ----
  G.teams.forEach(t=>t.roster.forEach(p=>{ p.seasons=(p.seasons||0)+1; p.peak=Math.max(p.peak||p.ovr,p.ovr); }));
  champ.roster.forEach(p=>{ p.rings=(p.rings||0)+1; });
  if(aw.mvp){ const f=findPlayer(aw.mvp.id); if(f)f.p.mvps=(f.p.mvps||0)+1; }
  (aw.allPro||[]).forEach(a=>{ const f=findPlayer(a.id); if(f)f.p.allPros=(f.p.allPros||0)+1; });
  // ---- COACH CAREERS + the DYNASTY BOOST (consistency compounds — Belichick/Walsh) ----
  G.teams.forEach(t=>{ const c=ensureCoachCareer(t); if(!c) return;
    const made = G.playoffs.seeds[t.conf]&&G.playoffs.seeds[t.conf].includes(t);
    c.szns++; c.cw=(c.cw||0)+t.wins; c.cl=(c.cl||0)+t.losses; if(made)c.playoffs=(c.playoffs||0)+1; if(t===champ)c.rings=(c.rings||0)+1;
    const prev=t._dynasty||0; t._dynasty=dynastyBoost(t);   // the engine reads _dynasty as a small game edge; develop() reads coach tenure for the system bump
    if(t._dynasty>=0.6 && prev<0.6) addNews('DYNASTY',`🏛️ ${t.city} have built something: HC ${c.name} (yr ${c.szns}, ${c.rings} title${c.rings!==1?'s':''}) has the system humming — players are developing beyond their draft grade.`);
    if(t._dynasty>=0.6 && (t.abbr===USER || t._dynasty>=0.8) && window.VOICES && ENG.rng()<0.5) VOICES.feedPush({h:'@CoachingWire',n:'Coaching Wire',v:true,c:'#8b5cf6'},`${t.abbr}'s machine keeps humming — ${c.name} in year ${c.szns}. That's what continuity buys. 🏆`,'NEWS',t._dynasty>=0.82);
  });
  // ---- owner verdicts + the HOT SEAT ----
  G.teams.forEach(t=>{ const made = G.playoffs.seeds[t.conf]&&G.playoffs.seeds[t.conf].includes(t);
    if(t.abbr===USER){ const r=ownerSeasonReview(t,champ,made);
      let line;
      if(t===champ) line=`Owner ${t.owner.name}: "A championship. Exactly what we built toward." Your seat could not be safer.`;
      else if(r.conf>=80) line=`Owner ${t.owner.name} is thrilled with the direction. "We're building something."`;
      else if(r.conf>=55) line=`Owner ${t.owner.name}: "${made?'A playoff berth — good.':'We came up short, but'} I want more next year."`;
      else if(r.conf>=25) line=`Owner ${t.owner.name} is losing patience after ${t.wins}-${t.losses}. "You're on the hot seat."`;
      else line=`Owner ${t.owner.name} has seen enough.`;
      addNews('OWNER',line);
      if(r.conf<({easy:14,normal:25,hard:32,ironman:40})[(G&&G.difficulty)||'normal'] && (G._jobYears||1)>=2){ G.pendingFire=true; }   // fired — but never in year one (threshold scales with difficulty)
    }
  });
  // record this season into the franchise log for the continuity UI
  G.teams.forEach(t=>{ t.seasonLog=t.seasonLog||[]; const made=G.playoffs.seeds[t.conf]&&G.playoffs.seeds[t.conf].includes(t);
    const finish=t===champ?'🏆 Champions':made?'Playoffs':'Missed playoffs';
    t.seasonLog.push({season:G.season,w:t.wins,l:t.losses,finish,conf:t.owner?t.owner.confidence:null}); if(t.seasonLog.length>30)t.seasonLog.shift(); });
  // re-authorize staff budgets, and let AI clubs (re)stock their scouting departments up to ~70-90% of cap
  G.teams.forEach(t=>{ try{ ensureScoutDept(t); recomputeStaffBudget(t); if(t.abbr!==USER) autoStaffBudget(t); }catch(e){} });
  try{ financeSeasonTick(); }catch(e){}   // expire deals, drift brand/trust, regenerate offseason offers, AI signs naming
}
/* ---------- owner PERSONALITIES + expectations + hot-seat ---------- */
const OWNER_ARCH=[
  {key:'mogul',   label:'Win-Now Mogul',         blurb:'Deep pockets, zero patience — a title now or heads roll.',          spend:1.7, fire:1.45, meddle:1.2, goal:1,  win:['"That\'s what I pay for."','"More. I want more."'], loss:['is FUMING in the owner\'s box.','"Unacceptable. Fix it."']},
  {key:'builder', label:'Patient Builder',        blurb:'Trusts the process and gives his GM room to build it right.',       spend:1.0, fire:0.45, meddle:0.6, goal:-1, win:['"Brick by brick. I love it."','nods approvingly from the box.'], loss:['"One game. We stay the course."','"I still believe in the plan."']},
  {key:'meddler', label:'The Meddler',            blurb:"Can't help himself — guarantees, hot takes, locker-room drop-ins.", spend:1.1, fire:1.2,  meddle:2.1, goal:0,  win:['"I told everybody we\'d do this."','takes a victory lap on local radio.'], loss:['second-guesses the play-calling on air.','"Maybe I need to be more involved."']},
  {key:'frugal',  label:'Frugal Traditionalist',  blurb:'Old-school and tight with a dollar; wins on a budget or not at all.', spend:0.5, fire:0.9,  meddle:0.8, goal:0,  win:['"And we did it the right way — under budget."'], loss:['grumbles about "wasted money."']},
  {key:'players', label:"Players' Owner",         blurb:'Beloved in the locker room; spends on his guys and keeps the faith.', spend:1.45,fire:0.5,  meddle:0.7, goal:0,  win:['celebrates in the locker room with the team.'], loss:['tells the room he has their backs.']},
  {key:'absentee',label:'Hands-Off Absentee',     blurb:'Rarely around; lets football people run football.',                 spend:0.8, fire:0.6,  meddle:0.3, goal:-1, win:['sends a congratulatory text from his yacht.'], loss:['was reportedly unreachable.']}
];
function ownerArchetype(o){ if(o&&o._arch){ const f=OWNER_ARCH.find(a=>a.key===o._arch); if(f)return f; }
  const w=(o&&o.wealth)||60,p=(o&&o.patience)||60,a=(o&&o.ambition)||60; let key;
  if(w>=78&&a>=80&&p<56) key='mogul'; else if(p<52&&a>=72) key='meddler'; else if(w<55) key='frugal';
  else if(w>=70&&p>=66) key='players'; else if(a<60) key='absentee'; else key='builder';
  if(o)o._arch=key; return OWNER_ARCH.find(x=>x.key===key); }
// the owner reacts to YOUR weekly result in his own voice (ambient flavor, not a chore)
function ownerReact(t,won){ const o=t.owner, a=ownerArchetype(o); if(ENG.rng()>0.32*a.meddle) return;
  addNews('OWNER',`Owner ${o.name} ${won?ENG.pick(a.win):ENG.pick(a.loss)}`); }
function ensureOwner(t){ if(!t.owner)t.owner={name:'Owner',patience:60,ambition:60,wealth:60}; if(t.owner.confidence==null)t.owner.confidence=60; if(!t.owner._arch)ownerArchetype(t.owner); if(!t.owner.expectation)setExpectation(t); return t.owner; }
function setExpectation(t){ if(!t.owner)t.owner={name:'Owner',patience:60,ambition:60,wealth:60,confidence:60}; const ov=ENG.teamOvr(t), W=G.maxWeek||17; let tier,label,winGoal,deep=false;
  if(ov>=86){tier='title';label='Win the championship';winGoal=Math.round(W*0.72);deep=true;}
  else if(ov>=80){tier='deep';label='Make a deep playoff run';winGoal=Math.round(W*0.62);deep=true;}
  else if(ov>=74){tier='playoffs';label='Make the playoffs';winGoal=Math.round(W*0.53);}
  else if(ov>=68){tier='wildcard';label='Compete for a wild-card spot';winGoal=Math.round(W*0.47);}
  else {tier='build';label='Show progress and build for the future';winGoal=Math.round(W*0.38);}
  const a=ownerArchetype(t.owner); winGoal=ENG.clamp(winGoal+(a.goal||0),3,W);   // a Win-Now Mogul demands more; a Builder, less
  if(t.abbr===USER) winGoal=ENG.clamp(winGoal+({easy:-2,normal:0,hard:2,ironman:3})[(G&&G.difficulty)||'normal'],3,W);   // difficulty raises the bar
  t.owner.expectation={tier,label,winGoal,deep}; return t.owner.expectation; }
function ownerSeasonReview(t,champ,made){ ensureOwner(t); const e=t.owner.expectation||setExpectation(t); const a=ownerArchetype(t.owner);
  let dc=(t.wins-e.winGoal)*3.5;
  if(t===champ) dc+=36; else if(made && e.deep) dc+=7; else if(made) dc+=15;
  if(!made && e.tier!=='build') dc-=15;
  if(!made && (e.tier==='title'||e.tier==='deep')) dc-=10;
  if(dc<0){ dc*=a.fire; if(t.abbr===USER) dc*=diffOwner(); }   // impatient owners punish harder; difficulty sharpens it for the user
  t.owner.confidence=ENG.clamp(Math.round((t.owner.confidence||60)+dc),0,100);
  return {dc,conf:t.owner.confidence}; }
function hotSeatLabel(c){ return c>=80?'Rock solid':c>=60?'Secure':c>=42?'Stable':c>=25?'Warming up':'HOT SEAT'; }
function hotSeatColor(c){ return c>=60?'var(--good,#46d39a)':c>=25?'#e8b341':'var(--bad,#ef5b6b)'; }
function hotSeatHTML(t){ ensureOwner(t); const c=t.owner.confidence, e=t.owner.expectation||setExpectation(t);
  return `<div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="margin:0">🪑 Owner Confidence</h3><span style="font-family:var(--mono);font-weight:800;color:${hotSeatColor(c)}">${c} · ${hotSeatLabel(c)}</span></div>
    <div class="bar" style="margin:8px 0"><i style="width:${c}%;background:${hotSeatColor(c)}"></i></div>
    <div class="muted" style="font-size:12px">${t.owner.name}'s mandate this year: <b>${e.label}</b> (~${e.winGoal} wins). ${c<25?'<span class="bad">One more bad year and you\'re gone.</span>':c>=80?'You\'ve earned the long leash.':''}</div>`; }
function fireModal(){ closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=ev=>{ if(ev.target.id==='ovl')return; }; const box=el('div','card'); box.style.cssText='max-width:560px;width:92%';
  const cands=G.teams.filter(t=>t.abbr!==USER).sort((a,b)=>(a.wins-a.losses)-(b.wins-b.losses)).slice(0,3);
  box.innerHTML=`<h2 style="margin:0">🪑 You've Been Fired</h2><p class="muted">${team(USER).owner.name} has relieved you of your duties after a ${team(USER).wins}-${team(USER).losses} season. But the phone is ringing — other clubs want a GM.</p><div id="firejobs"></div>
    <div style="margin-top:10px"><button class="btn sec" id="fireretire">Walk away (end this career)</button></div>`;
  const jl=box.querySelector('#firejobs');
  cands.forEach(t=>{ const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px';
    row.innerHTML=`<div>${logoTag(t,22)} <b>${t.city} ${t.nick}</b> <span class="muted">(${t.wins}-${t.losses}, rating ${ENG.teamOvr(t)})</span><div class="muted" style="font-size:11px">A rebuild — but a clean slate and a fresh mandate.</div></div><button class="btn" data-take="${t.abbr}">Take the job</button>`;
    jl.appendChild(row); });
  ov.appendChild(box); document.body.appendChild(ov);
  jl.querySelectorAll('[data-take]').forEach(b=>b.onclick=()=>takeJob(b.dataset.take));
  box.querySelector('#fireretire').onclick=()=>{ if(confirm('End this GM career and return to the main menu?')){ closeOvl(); G=null;USER=null; setupScreen(); } };
}
function takeJob(abbr){ USER=abbr; const t=team(abbr); ensureOwner(t); t.owner.confidence=52; setExpectation(t); G._jobYears=1; G._slotName=`${t.city} ${t.nick} (GM)`;
  addNews('OWNER',`You're hired: the ${t.city} ${t.nick} name you their new GM. Rebuild it.`); G.pendingFire=false; closeOvl(); VIEW='week'; save(); render(); toast(`Welcome to ${t.city}!`); }

/* ---------- owner events / blunders ---------- */
function ownerEvents(){
  const t=ut(); const o=t.owner; const a=ownerArchetype(o);
  if(ENG.rng()<0.16*a.meddle){    // meddlers act far more often than absentees
    const roll=ENG.rng();
    if(roll<0.3 && o.patience<58){ addNews('OWNER',`${o.name} (${a.label}) publicly guaranteed a deep run — the pressure's on you now.`); }
    else if(roll<0.5){ const inc=ENG.ri(3,9); t.stadium.ticket=ENG.clamp(t.stadium.ticket+inc,60,260); addNews('OWNER',`${o.name} hiked ticket prices $${inc} without asking. Fans grumble.`); t.fans.morale=ENG.clamp(t.fans.morale-3,5,99); }
    else if(roll<0.5+0.32*a.spend){ const inj=Math.round(ENG.ri(8,25)*a.spend); t.cash=ENG.round1(t.cash+inj); addNews('OWNER',`${o.name} opened the checkbook — $${inj}M added to your war chest.`); }
    else { addNews('OWNER',`${o.name} did a radio hit second-guessing the staff. Locker room rolls its eyes.`); t.roster.forEach(p=>p.morale=ENG.clamp(p.morale-1,20,99)); }
  }
}
/* ---------- LEAGUE MOTION: the world moves without you ---------- */
// AI teams trade with EACH OTHER during the season (need-based, ~fair) — the market is alive
function aiTradeTick(){
  if(G.tradeDeadlinePassed) return;   // market is frozen after the deadline
  const aiT=(G.rules&&G.rules.aiTrade)||'normal'; const act=aiT==='frenzy'?0.82:aiT==='calm'?0.24:0.5;   // AI trade-market intensity dial
  if(ENG.rng()>act) return; const ai=G.teams.filter(t=>t.abbr!==USER); if(ai.length<2) return;
  for(let tries=0;tries<7;tries++){ const A=ENG.pick(ai), B=ENG.pick(ai); if(A===B) continue;
    const nA=ENG.needs(A), nB=ENG.needs(B);
    const wantA=Object.keys(nA).sort((x,y)=>nA[y]-nA[x])[0], wantB=Object.keys(nB).sort((x,y)=>nB[y]-nB[x])[0];
    const give=B.roster.filter(p=>p.pos===wantA&&!p.starter&&canSparePlayer(B,p)&&!franchiseProtected(B,p)).sort((a,b)=>b.ovr-a.ovr)[0];   // B -> A
    const get =A.roster.filter(p=>p.pos===wantB&&!p.starter&&canSparePlayer(A,p)&&!franchiseProtected(A,p)).sort((a,b)=>b.ovr-a.ovr)[0];   // A -> B
    if(!give||!get||give.id===get.id) continue;
    // Guard: never strip a last specialist even if canSpare said ok at filter time
    if(B.roster.filter(x=>x.pos===give.pos).length <= MINPOS[give.pos]) continue;
    if(A.roster.filter(x=>x.pos===get.pos).length <= MINPOS[get.pos]) continue;
    if(Math.abs(tradeValue(give)-tradeValue(get))>15) continue;   // keep it roughly fair
    B.roster=B.roster.filter(p=>p.id!==give.id); give.starter=false; A.roster.push(give);
    A.roster=A.roster.filter(p=>p.id!==get.id);  get.starter=false;  B.roster.push(get);
    repairAllRosters('AI trade');
    addNews('TRADE',`Around the league: ${A.city} acquire ${give.name} (${give.pos}, ${give.ovr}) from ${B.city} for ${get.name} (${get.pos}, ${get.ovr}).`);
    if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'}, `🔁 Sources: ${A.abbr} acquiring ${give.name} (${give.pos}) from ${B.abbr} for ${get.name} (${get.pos}).`,'TRADE',false);
    return; }
}
// ---- TRADE DEADLINE: a mid-season buzz, then a flurry of contender-vs-seller deals, then a hard freeze ----
function tradeDeadlineWeek(){ return Math.max(5, Math.round((G.maxWeek||17)*(((G.rules&&G.rules.tradeDeadlinePct)||52)/100))); }   // configurable deadline
function tradeDeadlineTick(){
  if(G.phase!=='regular' || G.tradeDeadlinePassed) return;
  const DL=tradeDeadlineWeek(), wk=G.week;   // G.week is the upcoming week (already incremented this tick)
  if(wk===DL-1){
    addNews('TRADE',`📣 The trade deadline is one week out — front offices are working the phones hard.`);
    if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`Deadline week looms. My phone is melting. Contenders are shopping, sellers are listening — somebody's about to get a LOT better.`,'TRADE',false);
  } else if(wk>=DL){ tradeDeadlineFlurry(); G.tradeDeadlinePassed=true; }
}
function tradeDeadlineFlurry(){
  const teams=G.teams.slice();
  const rec=t=>{ const gp=t.wins+t.losses; return gp? t.wins/gp : 0.5; };
  const contenders=teams.filter(t=>rec(t)>=0.55).sort((a,b)=>b.wins-a.wins);
  const sellers=teams.filter(t=>rec(t)<=0.42).sort((a,b)=>rec(a)-rec(b));
  addNews('TRADE',`🚨 TRADE DEADLINE DAY — the league is buzzing.`);
  if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚨 DEADLINE DAY is here. Strap in — this is the busiest day on the NFL calendar that isn't a game.`,'TRADE',true);
  let deals=0; const want=ENG.ri(3,6);
  for(let i=0;i<sellers.length && deals<want;i++){ const S=sellers[i]; if(!contenders.length) break;
    const B=contenders[ENG.ri(0,Math.min(contenders.length-1,4))]; if(!B||B===S) continue;
    // a seller ships a quality veteran (not a true cornerstone) to a contender for a younger player + a pick
    const chip=S.roster.filter(p=>p.ovr>=74&&p.ovr<=87&&(p.age||27)>=27&&!(p.out>0)&&!p.ir&&canSparePlayer(S,p)&&!franchiseProtected(S,p)).sort((a,b)=>b.ovr-a.ovr)[0];
    if(!chip) continue;
    const ret=B.roster.filter(p=>p.ovr<=chip.ovr-3&&(p.age||27)<=25&&canSparePlayer(B,p)&&!franchiseProtected(B,p)).sort((a,b)=>b.ovr-a.ovr)[0]
            || B.roster.filter(p=>!p.starter&&canSparePlayer(B,p)&&!franchiseProtected(B,p)).sort((a,b)=>a.ovr-b.ovr)[0];
    if(!ret||ret.id===chip.id) continue;
    S.roster=S.roster.filter(p=>p.id!==chip.id); chip.starter=false; chip.years=Math.max(chip.years||1,1); B.roster.push(chip);
    B.roster=B.roster.filter(p=>p.id!==ret.id); ret.starter=false; S.roster.push(ret);
    repairAllRosters('deadline trade');
    deals++;
    addNews('TRADE',`🚨 DEADLINE: ${B.city} acquire ${chip.name} (${chip.pos}, ${chip.ovr}) from ${S.city} for ${ret.name} (${ret.pos}, ${ret.ovr}) and a ${G.season+1} pick.`);
    if(window.VOICES) VOICES.feedTrade([{kind:'player',name:ret.name},{kind:'pick',year:G.season+1,round:ENG.ri(2,5)}],[{kind:'player',name:chip.name}],S,B);
  }
  pruneOffers();   // any standing offers for moved players die
  addNews('TRADE',`The deadline has passed — rosters are frozen until the offseason. ${deals} deal${deals!==1?'s':''} crossed the wire.`);
  if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`That's a wrap on deadline day — ${deals} trades done. Contenders loaded up, sellers stockpiled for the future. No more deals until spring. 🔒`,'TRADE',true);
}

/* ---------- RELOCATION (move a franchise to a new market) ---------- */
const RELO_CITIES=[
  ['San Diego','Surf','SD','#0a6ebd','#ffcf33',64],['St. Louis','Gateway','STL','#9b1b30','#d8b15a',60],
  ['San Antonio','Stallions','SAT','#0a3d62','#e58e26',58],['Toronto','Northmen','TOR','#b71540','#3c6382',66],
  ['Mexico City','Aztecs','MEX','#0b6e4f','#f4c20d',78],['London','Monarchs','LDN','#1e3a8a','#dc2626',82],
  ['Portland','Pioneers','POR','#1b4332','#74c69d',57],['Las Vegas','Aces','LVA','#0b0b0b','#d4af37',63],
  ['Salt Lake City','Sentinels','SLC','#1b3a4b','#9b59b6',55],['Orlando','Comets','ORL','#5b2c8f','#00b3a4',61] ];
function reloAvailable(){ return RELO_CITIES.filter(c=>!G.teams.some(t=>t.abbr===c[2]||t.city===c[0])); }
function relocateTeam(t,dest){ const old=`${t.city} ${t.nick}`, oldAbbr=t.abbr, newAbbr=dest[2];
  if(newAbbr!==oldAbbr && !G.teams.some(x=>x!==t&&x.abbr===newAbbr)){
    (G.schedule||[]).forEach(wk=>wk.forEach(g=>{ if(g.home===oldAbbr)g.home=newAbbr; if(g.away===oldAbbr)g.away=newAbbr; }));
    if(G._offers) G._offers.forEach(o=>{ if(o.other===oldAbbr)o.other=newAbbr; });
    t.abbr=newAbbr; if(USER===oldAbbr) USER=newAbbr;
  }
  t.city=dest[0]; t.nick=dest[1]; t.pri=dest[3]; t.sec=dest[4]; t.market=dest[5];
  t.stadium=Object.assign({},t.stadium,{name:t.city+' Stadium',cap:68000,quality:90,ticket:Math.max(105,(t.stadium&&t.stadium.ticket)||110),built:G.season,_named:false});
  // fresh-market stadium: wipe amenities, debt, and any in-flight construction
  t.stadium.upgrades={suites:0,clubs:0,videoboard:0,roofLevel:roofToLevel(t.stadium.roof),turf:0,training:0};
  t.stadium.debt=[]; t.stadiumProjects=[];
  // location-bound deals (naming + concourse) don't survive the move
  if(t.finance&&t.finance.deals) t.finance.deals=t.finance.deals.filter(d=>d.type!=='naming'&&d.type!=='concourse');
  if(t.fans) t.fans.morale=ENG.clamp((t.fans.morale||60)+18,45,99);
  t.relocated={from:old,season:G.season};
  addNews('RELOCATION',`🚚 RELOCATION: the ${old} are moving — reborn as the ${t.city} ${t.nick}! A gleaming new stadium and a hungry new market.`);
  if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚚 BREAKING: the ${old} franchise is relocating to ${t.city} and rebranding as the ${t.nick}. The end of an era.`,'NEWS',true);
}
function maybeAIRelocation(){ if(ENG.rng()>0.16) return; const avail=reloAvailable(); if(!avail.length) return;
  const cand=G.teams.filter(t=>t.abbr!==USER && t.fans && t.fans.morale<50 && (t.market||60)<58).sort((a,b)=>a.fans.morale-b.fans.morale)[0];
  if(cand) relocateTeam(cand, ENG.pick(avail)); }
function relocateModal(){ const t=ut(); const avail=reloAvailable(); const cost=75;
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl')closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:560px;width:92%;max-height:80vh;overflow:auto';
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🚚 Relocate Franchise</h2><button class="btn sec" id="rx">✕</button></div>
    <p class="muted" style="font-size:12px">Move the ${t.city} ${t.nick} to a new market — new identity, new stadium, a honeymoon bump in fan enthusiasm. Keeps your roster, coach and cash. Cost: $${cost}M · Cash: ${money(t.cash)}.</p><div id="rlist"></div>`;
  const list=box.querySelector('#rlist');
  if(!avail.length) list.innerHTML='<p class="muted">No markets are open right now.</p>';
  avail.forEach(c=>{ const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px';
    row.innerHTML=`<div><b>${c[0]} ${c[1]}</b> <span class="tag">${c[2]}</span><div class="muted" style="font-size:11px">Market grade ${c[5]} · <span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${c[3]};vertical-align:middle"></span> <span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:${c[4]};vertical-align:middle"></span></div></div><button class="btn" data-i="${RELO_CITIES.indexOf(c)}">Move · $${cost}M</button>`;
    list.appendChild(row); });
  ov.appendChild(box); document.body.appendChild(ov);
  box.querySelector('#rx').onclick=closeOvl;
  list.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{ if(t.cash<cost){ toast('Not enough cash to relocate.'); return; }
    const dest=RELO_CITIES[+b.dataset.i]; if(!confirm(`Relocate to ${dest[0]} as the ${dest[1]}? This rebrands your franchise.`)) return;
    t.cash=ENG.round1(t.cash-cost); relocateTeam(t,dest); closeOvl(); toast('Franchise relocated!'); save(); render(); });
}

/* ---------- MID-CAREER EXPANSION DRAFT (add 1–2 franchises, stocked from exposed players) ---------- */
function buildExpansionFranchise(idx,conf,div){ const t=expansionTeam(idx);
  t.conf=conf||t.conf; t.div=div||t.div;
  t.cap=G.capMax; t.market=ENG.ri(48,66); t.wins=0;t.losses=0;t.ties=0;t.pf=0;t.pa=0; t.cash=ENG.ri(45,85);
  t.stadium={name:t.city+' Stadium',cap:ENG.ri(60,68)*1000,quality:ENG.ri(80,93),built:G.season,ticket:ENG.ri(95,140)};
  t.fans={base:ENG.ri(26,42),morale:66,loyalty:ENG.ri(30,50)};
  t.coach={name:ENG.coachName(),ovr:ENG.ri(64,78),off:ENG.ri(60,80),def:ENG.ri(60,80)};
  t.owner={name:'Expansion Group',wealth:ENG.ri(62,98),patience:ENG.ri(66,92),ambition:ENG.ri(62,92)};
  t.roster=[]; ensurePicks(t); ENG.ensureStaff(t); ensureOwner(t);   // roster must exist before teamOvr (ownerExpectation)
  return t;
}
// numNew expansion teams; userProtectIds = Set/array of the user's protected player ids (AI auto-protects its best PROTECT)
function runExpansionDraft(numNew, userProtectIds){
  numNew=Math.max(1,Math.min(2,numNew||1));
  const existing=G.teams.slice(); const PROTECT=10;
  const exposed={};
  const protSet = userProtectIds? new Set(userProtectIds.map(x=>typeof x==='object'?x.id:x)) : null;
  existing.forEach(tm=>{ let prot;
    if(tm.abbr===USER && protSet) prot=protSet;
    else prot=new Set(tm.roster.slice().sort((a,b)=>b.ovr-a.ovr).slice(0,PROTECT).map(p=>p.id));
    exposed[tm.abbr]=tm.roster.filter(p=>!prot.has(p.id)).sort((a,b)=>b.ovr-a.ovr);
  });
  const newTeams=[];
  for(let i=0;i<numNew;i++){
    const confs=[...new Set(G.teams.map(t=>t.conf))]; const byConf={}; G.teams.concat(newTeams).forEach(t=>byConf[t.conf]=(byConf[t.conf]||0)+1);
    const conf=confs.sort((a,b)=>(byConf[a]||0)-(byConf[b]||0))[0]||'AFC';
    const divs=['East','North','South','West']; const byDiv={}; G.teams.concat(newTeams).filter(t=>t.conf===conf).forEach(t=>byDiv[t.div]=(byDiv[t.div]||0)+1);
    const div=divs.sort((a,b)=>(byDiv[a]||0)-(byDiv[b]||0))[0];
    newTeams.push(buildExpansionFranchise(i,conf,div));
  }
  const takenFrom={}; const picks=[]; const TARGET=24; let round=0;
  while(round<50){ round++; let anyPick=false;
    newTeams.forEach(nt=>{ if(nt.roster.length>=TARGET) return;
      const need=ENG.needs(nt); let bestT=null,bestP=null,bestScore=-1;
      existing.forEach(et=>{ if((takenFrom[et.abbr]||0)>=2) return; const pool=exposed[et.abbr]; if(!pool||!pool.length) return;
        pool.slice(0,4).filter(cand=>canSparePlayer(et,cand)&&!franchiseProtected(et,cand)).forEach(cand=>{ const sc=cand.ovr + (need[cand.pos]||0)*4; if(sc>bestScore){ bestScore=sc; bestT=et; bestP=cand; } }); });
      if(bestT&&bestP){ exposed[bestT.abbr]=exposed[bestT.abbr].filter(x=>x.id!==bestP.id); bestT.roster=bestT.roster.filter(x=>x.id!==bestP.id);
        bestP.starter=false; nt.roster.push(bestP); takenFrom[bestT.abbr]=(takenFrom[bestT.abbr]||0)+1; picks.push({to:nt.abbr,from:bestT.abbr,player:bestP}); anyPick=true; }
    });
    if(!anyPick) break;
  }
  newTeams.forEach(nt=>{ G.teams.push(nt); });
  G.teams.forEach(t=>{ repairRosterLegality(t,'expansion draft'); t.capUsed=ENG.round1(t.roster.reduce((a,p)=>a+(p.salary||1),0)); });   // every team stays legal — donors refill via "FA"
  G.schedule=ENG.buildSchedule(G.teams,{games:(G.rules&&G.rules.games)||0,weight:(G.rules&&G.rules.schedWeight)||'division'}); G.maxWeek=G.schedule.length;
  G.tradeDeadlinePassed=false; announceInternationalSlate(assignInternationalGames(G.schedule));
  const names=newTeams.map(t=>`${t.city} ${t.nick}`).join(' and ');
  addNews('EXPANSION',`🎉 LEAGUE EXPANSION: welcome the ${names}! ${picks.length} players changed hands in the expansion draft. The league now fields ${G.teams.length} teams.`);
  if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🎉 EXPANSION: the league welcomes the ${names}, stocked from exposed players across the league. ${G.teams.length} teams now. New rivalries incoming.`,'NEWS',true);
  return {newTeams,picks};
}
function expansionModal(){
  if(G.phase!=='offseason'){ toast('Expansion is set up in the offseason (between seasons).'); return; }
  const t=ut(); const PROTECT=10; const ros=t.roster.slice().sort((a,b)=>b.ovr-a.ovr);
  const protectedIds=new Set(ros.slice(0,PROTECT).map(p=>p.id));   // default: your best 10
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl')closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:620px;width:94%;max-height:84vh;overflow:auto';
  const render2=()=>{ box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🎉 Expansion Draft</h2><button class="btn sec" id="ex">✕</button></div>
    <p class="muted" style="font-size:12px">New franchises join the league. Every team protects up to ${PROTECT} players; the rest are exposed. Protect your core — you can lose up to 2 players.</p>
    <div class="row" style="gap:8px;margin:8px 0"><span class="muted">Add</span><button class="btn ${G._expN!==2?'':'sec'}" data-n="1">1 team</button><button class="btn ${G._expN===2?'':'sec'}" data-n="2">2 teams</button>
      <span style="flex:1"></span><span class="tag">Protected ${[...protectedIds].length}/${PROTECT}</span></div>
    <div id="proster"></div><button class="btn" id="runexp" style="width:100%;margin-top:10px">Run Expansion Draft →</button>`;
    const pr=box.querySelector('#proster'); pr.innerHTML=ros.slice(0,32).map(p=>{ const on=protectedIds.has(p.id);
      return `<div class="row" data-pid="${p.id}" style="justify-content:space-between;align-items:center;padding:4px 8px;border-radius:6px;cursor:pointer;background:${on?'#10331f':'#0c1320'};margin-top:4px">
        <span>${on?'🛡️ ':'⚠️ '}<b>${p.name}</b> <span class="tag">${p.pos}</span> ${ovrBadge(p.ovr)}</span><span class="muted" style="font-size:11px">${on?'PROTECTED':'exposed'}</span></div>`; }).join('');
    pr.querySelectorAll('[data-pid]').forEach(row=>row.onclick=()=>{ const id=+row.dataset.pid;
      if(protectedIds.has(id)) protectedIds.delete(id); else { if(protectedIds.size>=PROTECT){ toast(`You can only protect ${PROTECT}.`); return; } protectedIds.add(id); } render2(); });
    box.querySelector('#ex').onclick=closeOvl;
    box.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{ G._expN=+b.dataset.n; render2(); });
    box.querySelector('#runexp').onclick=()=>{ closeOvl(); const res=runExpansionDraft(G._expN||1,[...protectedIds]);
      const lost=res.picks.filter(p=>p.from===USER).map(p=>p.player.name);
      toast(lost.length?`Expansion draft done — you lost ${lost.join(', ')}.`:'Expansion draft complete — your protections held!'); save(); render(); };
  };
  render2(); ov.appendChild(box); document.body.appendChild(ov);
}

/* ---------- LEAGUE OPS screen (Commissioner: international, deadline, relocation, expansion) ---------- */
function scrOps(m,t){
  head(m,'League Ops','Commissioner’s desk — the international series, the trade deadline, relocation and expansion.');
  { const cs=el('div','card'); cs.style.marginBottom='12px';
    cs.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><h3 style="margin:0">⚙ League Settings</h3><span class="muted" style="font-size:12px">Structure, schedule, playoffs, economy, progression, draft & trade rules — tune mid-dynasty.</span></div><button class="btn" id="opscommish">Open settings…</button></div>`;
    m.appendChild(cs); setTimeout(()=>{ const b=$('#opscommish'); if(b)b.onclick=commishModal; },0); }
  // International Series
  const intlGames=[]; (G.schedule||[]).forEach((wk,wi)=>wk.forEach(g=>{ if(g.intl) intlGames.push({g,wi}); }));
  const ic=el('div','card'); ic.innerHTML='<h3>🌍 International Series</h3>';
  if(intlGames.length){ const tb=el('table'); tb.innerHTML='<tr><th>Wk</th><th>Matchup</th><th>Venue</th><th>City</th></tr>'+
    intlGames.map(x=>{ const me=(x.g.home===USER||x.g.away===USER); return `<tr${me?' style="background:#0c1a2e"':''}><td>${x.wi+1}</td><td>${team(x.g.away).abbr} vs ${team(x.g.home).abbr}${me?' <span class="acc" style="font-size:10px">YOU</span>':''}</td><td>${x.g.intl.flag} ${x.g.intl.venue}</td><td class="muted">${x.g.intl.city}</td></tr>`; }).join('');
    ic.appendChild(tb); const note=el('p','muted'); note.style.cssText='font-size:11px;margin-top:6px'; note.textContent='Neutral-site games — no home-field edge, and the long travel piles extra wear on both clubs.'; ic.appendChild(note); }
  else ic.innerHTML+='<p class="muted">No international games scheduled this season.</p>';
  m.appendChild(ic);
  // Trade deadline
  const dc=el('div','card'); const DL=tradeDeadlineWeek();
  dc.innerHTML=`<h3>🔁 Trade Deadline</h3><p class="muted" style="font-size:12px">${G.tradeDeadlinePassed?'🔒 Passed — the market is frozen until the offseason.':`Week <b>${DL}</b>${G.phase==='regular'?` · ${Math.max(0,DL-G.week)} week(s) out`:''}. Expect a flurry of contender-vs-seller deals, then a hard freeze.`}</p>`;
  m.appendChild(dc);
  // Relocation
  const rc=el('div','card'); rc.innerHTML=`<h3>🚚 Relocation</h3><p class="muted" style="font-size:12px">Move the ${t.city} ${t.nick} to a new market — new identity, new stadium, a honeymoon with fresh fans. $75M.</p><button class="btn" id="opsrelo">Relocate franchise…</button>`;
  m.appendChild(rc);
  // Expansion
  const ec=el('div','card'); ec.innerHTML=`<h3>🎉 Expansion Draft</h3><p class="muted" style="font-size:12px">Add 1–2 new franchises. Protect your core; expose the rest. ${G.phase==='offseason'?'Available now (offseason).':'Set up in the offseason — finish the season first.'}</p><button class="btn ${G.phase==='offseason'?'':'sec'}" id="opsexp">Open expansion draft…</button>`;
  m.appendChild(ec);
  // Player rivalries
  const rivs=(G.rivalries||[]).slice().sort((a,b)=>b.heat-a.heat).slice(0,8);
  const vc=el('div','card'); vc.innerHTML='<h3>⚔️ Player Rivalries</h3>';
  if(rivs.length){ const tb=el('table'); tb.innerHTML='<tr><th>Type</th><th>Matchup</th><th>Head-to-head</th><th>Heat</th></tr>'+
    rivs.map(r=>{ const lead=r.aw===r.bw?`${r.aw}-${r.bw}`:r.aw>r.bw?`${r.a.name} ${r.aw}-${r.bw}`:`${r.b.name} ${r.bw}-${r.aw}`;
      return `<tr><td><span class="tag">${r.type==='QB'?'QB duel':'WR–CB'}</span></td><td><b>${r.a.name}</b> <span class="muted">${r.a.abbr}</span> vs <b>${r.b.name}</b> <span class="muted">${r.b.abbr}</span></td><td>${lead} <span class="muted">(${r.meet} mtgs)</span></td><td><div class="bar" style="width:70px;display:inline-block;vertical-align:middle"><i style="width:${r.heat}%;background:${r.heat>=60?'var(--bad)':'var(--acc2,#f0b23f)'}"></i></div></td></tr>`; }).join('');
    vc.appendChild(tb); }
  else vc.innerHTML+='<p class="muted">No rivalries yet — they build as elite QBs and WR/CB pairs face off repeatedly.</p>';
  m.appendChild(vc);
  setTimeout(()=>{ const a=$('#opsrelo'); if(a)a.onclick=relocateModal; const b=$('#opsexp'); if(b)b.onclick=expansionModal; },0);
}
// offseason coaching carousel — struggling AI clubs fire their HC and hire a new one
function coachingCarousel(){ let moves=0;
  G.teams.forEach(t=>{ if(t.abbr===USER||!t.coach) return; const gp=t.wins+t.losses, wp=gp?t.wins/gp:0.5;
    const fireP=(wp<0.30?0.6:wp<0.42?0.32:0)+(t.coach.ovr<66?0.18:0);
    if(moves<7 && ENG.rng()<fireP){ const old=t.coach.name;
      // candidate pool, in order of buzz: a hot college HC (poach), a former-player coordinator, or a fresh name.
      const col=(G.collegeHot&&G.collegeHot.length&&ENG.rng()<0.45)? G.collegeHot.shift() : null;
      const ex=(!col && G.exCoaches&&G.exCoaches.length&&ENG.rng()<0.5)? G.exCoaches.splice(ENG.ri(0,G.exCoaches.length-1),1)[0] : null;
      let tag='';
      if(col){ // college success is a gamble at the next level — downside-skewed translation
        const nf=ENG.clamp(col.ovr+ENG.ri(-9,4),58,93); t.coach={name:col.name,ovr:nf,off:ENG.clamp(nf+ENG.ri(-5,5),55,95),def:ENG.clamp(nf+ENG.ri(-5,5),55,95),fromCollege:col.school};
        tag=` away from ${col.school}`;
        if(window.VOICES) VOICES.feedPush({h:'@CoachingWire',n:'Coaching Wire',v:true,c:'#8b5cf6'}, `📈 ${t.city} are going to the college ranks — hiring ${col.name} (${col.why}) out of ${col.school}. Can it translate?`,'NEWS',col.ovr>=86);
      } else if(ex){ t.coach={name:ex.name,ovr:ENG.clamp(ex.ovr+ENG.ri(-1,7),62,93),off:ex.off,def:ex.def}; tag=` (former ${ex.pos})`; }
      else { t.coach={name:ENG.coachName(),ovr:ENG.ri(64,90),off:ENG.ri(60,90),def:ENG.ri(60,90)}; }
      ensureTeamPlaybook(t,true);
      moves++;
      addNews('STAFF',`Coaching carousel: ${t.city} fire HC ${old} after a ${t.wins}-${t.losses} year; hire ${t.coach.name}${col?` from ${col.school}`:ex?` (former ${ex.pos})`:''} (${t.coach.ovr} OVR).`);
      if(!col && window.VOICES) VOICES.feedPush({h:'@CoachingWire',n:'Coaching Wire',v:true,c:'#8b5cf6'}, `🔥 ${t.city} part ways with ${old}. ${t.coach.name}${ex?', a former '+ex.pos+',':''} takes over as head coach.`,'NEWS',false);
    } });
}
// ---- COACH CAREER + DYNASTY BOOST: continuity + sustained success compound into a real edge (Belichick/Walsh) ----
// A fresh coach object has no career fields → tenure resets to 0, so firing/churn RESETS the dynasty. Consistency is rewarded.
function ensureCoachCareer(t){ const c=t&&t.coach; if(!c) return null;
  if(c.since==null) c.since=(G?G.season:2026); if(c.szns==null) c.szns=0;
  if(c.rings==null) c.rings=0; if(c.playoffs==null) c.playoffs=0; if(c.cw==null) c.cw=0; if(c.cl==null) c.cl=0;
  return c; }
// 0..1 dynasty rating: gated by coach QUALITY (a bad coach never builds one), built by TENURE + SUCCESS.
function dynastyBoost(t){ const c=t&&t.coach; if(!c) return 0; ensureCoachCareer(t);
  const quality=ENG.clamp(((c.ovr||70)-76)/20,0,1);              // 76→0, 96→1
  const tenure =ENG.clamp(((c.szns||0)-2)/6,0,1);               // needs ~3 yrs to take root, maxes ~8
  const success=ENG.clamp(((c.rings||0)*2+(c.playoffs||0))/8,0,1);
  return ENG.clamp((quality*0.5+tenure*0.3+success*0.2)*Math.max(quality,0.2),0,1); }
window.dynastyBoost=dynastyBoost;

/* ---------- gazette news + weekly award ---------- */
// running MVP race — same scoring as the end-of-season MVP, refreshed weekly for the Gazette + History.
function computeMvpRace(){
  const all=allPlayers(); if(!all.length) return [];
  const ov=x=>x.p.ovr||(x.p.attrs&&x.p.attrs.OVR)||60, win=x=>x.t.wins||0;
  const sc=x=>(x.p.awardPts||0)+ov(x)*2+(x.p.pos==='QB'?55:['RB','WR'].includes(x.p.pos)?14:0)+win(x)*3.2;
  return all.filter(x=>(x.p.awardPts||0)>0).sort((a,b)=>sc(b)-sc(a)).slice(0,5)
    .map((x,i)=>({rank:i+1,id:x.p.id,name:x.p.name,pos:x.p.pos,team:x.t.abbr,ovr:ov(x),rec:`${x.t.wins}-${x.t.losses}`,score:Math.round(sc(x))}));
}
function weeklyAward(results){
  const cand=results.map(r=>r.potg).filter(Boolean).sort((a,b)=>b.aw-a.aw)[0];
  G.awards=G.awards||{weekly:[],season:[]};
  if(cand){ G.awards.weekly.unshift({week:G.week,name:cand.name,pos:cand.pos,team:cand.team,stat:cand.stat,season:G.season});
    if(G.awards.weekly.length>60) G.awards.weekly.pop();
    const tm=team(cand.team); addNews('AWARD',`⭐ Player of the Week: ${cand.name} (${cand.pos}, ${tm?tm.city:cand.team}) — ${cand.stat}.`); }
  // refresh the MVP race; announce when a new front-runner emerges (after the picture clears, ~week 4+)
  const race=computeMvpRace(); G.mvpRace=race;
  if(race[0] && G._mvpLeader!==race[0].name && G.week>=4){ G._mvpLeader=race[0].name;
    const tm=team(race[0].team); addNews('AWARD',`🏆 MVP Watch: ${race[0].name} (${race[0].pos}, ${tm?tm.city:race[0].team}) seizes the lead in the MVP race.`);
    if(window.VOICES) VOICES.feedPush({h:'@GridironGazette',n:'The Gazette',v:true,c:'#caa46a'},`🏆 MVP WATCH: ${race[0].name} (${race[0].pos}, ${race[0].team}) has taken over the MVP race. Carrying that team.`,'AWARD',true);
    const ld=findPlayer(race[0].id); if(ld&&ld.p){ ld.p.morale=ENG.clamp((ld.p.morale||70)+ENG.ri(2,5),12,99); ld.p.loyalty=ENG.clamp((ld.p.loyalty||60)+ENG.ri(1,3),12,98); } }
}
function writeWeekNews(results){
  // feature the biggest games (by combined award value of their POTG)
  results.slice().sort((a,b)=>((b.potg?b.potg.aw:0))-((a.potg?a.potg.aw:0))).slice(0,4).forEach(r=>{
    const w=r.hs>=r.as?r.home:r.away, l=r.hs>=r.as?r.away:r.home; const sc=Math.max(r.hs,r.as)+'-'+Math.min(r.hs,r.as);
    const verb=Math.abs(r.hs-r.as)<=3?'edge':(Math.abs(r.hs-r.as)>=21?'rout':'beat');
    addNews('GAME',`${team(w).city} ${verb} ${team(l).city} ${sc}${r.ot?' (OT)':''}${r.potg?` — ${r.potg.name}: ${r.potg.stat}`:''}.`); });
}

/* ---------- the running brain: motivation, off-field events, holdouts ---------- */
function recordArc(p,tag,txt){ if(!p.arc)p.arc=[]; p.arc.unshift({season:G.season,wk:G.week,tag,txt}); if(p.arc.length>12)p.arc.pop(); }
const SQUEAKY_TWEETS=['Just wanna compete. That\'s all I\'ll say.','idk man. throw it up. i\'ll go get it. 🤷‍♂️','I didn\'t come here to block. Respectfully.','Pray on it. 🙏','Feed me or trade me. (didn\'t say that. but...)','some of yall need to watch the tape on who\'s open','I know my role. I just don\'t agree with it.'];
// AFTER-GAME usage → morale loop: feed your stars and they quiet down; starve a WR1/RB1 and the gripes build, linger, then go public.
// Contract-year players who ball out get "pay the man" buzz. Storylines RESOLVE when addressed, and some linger if ignored.
function usageMoraleTick(results){
  (results||[]).forEach(r=>{ [r.home,r.away].forEach(ab=>{ const t=team(ab); if(!t) return; const isU=ab===USER;
    // simGame gives a flat r.lines (team-tagged); a coached game gives r.box.{home,away}.lines — handle both
    let lines=(r.lines||[]).filter(l=>l.team===ab);
    if(!lines.length && r.box){ lines = (ab===r.home? (r.box.home&&r.box.home.lines) : (r.box.away&&r.box.away.lines))||[]; }
    lines.forEach(l=>{ const p=t.roster.find(x=>x.id===l.id); if(!p||!['WR','TE','RB'].includes(p.pos)||p.ovr<78) return; ENG.ensureBrain(p);
      const touches=(l.rec||0)+(l.car||0), yds=(l.recyd||0)+(l.ryd||0), tds=(l.rectd||0)+(l.rtd||0);
      const top = t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr)[0]===p;   // the clear #1 at his spot
      const fed = touches>=6 || yds>=85 || tds>=1, starved = top && touches<=2 && yds<35 && tds===0;
      if(fed){ p.morale=ENG.clamp((p.morale||70)+ENG.ri(2,6),12,99); p._starved=0;
        if(p.flags && p.flags.wantsBall){ p.flags.wantsBall=false; p.morale=ENG.clamp(p.morale+ENG.ri(4,8),12,99); p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(3,7),12,98);
          const txt=`${p.name} (${p.pos}, ${t.city}) is all smiles after a big workload (${yds} yds) — the usage gripes have quieted.`;
          recordArc(p,'RESOLVE',txt); addNewsIf(isU||p.ovr>=84,'RESOLVE',txt);
          if(window.VOICES&&p.ovr>=84) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`📈 Feed your stars: ${p.name} got the ball (${yds} yds) and suddenly all is well in ${t.abbr}. Funny how that works.`,'NEWS',false); }
      } else if(starved){ p.morale=ENG.clamp((p.morale||70)-ENG.ri(2,5),12,99); p._starved=(p._starved||0)+1;
        if(p._starved>=3 && !(p.flags&&p.flags.wantsBall) && (p.loyalty||60)<72){ p.flags=p.flags||{}; p.flags.wantsBall=true;
          const txt=`${p.name} (${p.pos}, ${t.city}) is frustrated — three straight games as an afterthought, and now he wants the ball.`;
          recordArc(p,'DRAMA',txt); addNews('DRAMA',txt);
          if(window.VOICES) VOICES.feedPush({h:'@'+(p.first?p.first[0]:'')+(p.last||'').replace(/[^A-Za-z]/g,''),n:p.name,v:p.ovr>=82,c:'#cdd8ec'},ENG.pick(SQUEAKY_TWEETS),'TAKE',p.ovr>=86); }
      }
      if((p.years||9)<=1 && (yds>=110||tds>=2) && ENG.rng()<0.45 && window.VOICES)
        VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`💰 Contract-year alert: ${p.name} (${p.pos}, ${t.abbr}) is BALLING OUT (${yds} yds${tds?`, ${tds} TD`:''}) at exactly the right time. Pay. The. Man.`,'NEWS',false);
    });
  }); });
}
// TRAINING-CAMP HOLDOUTS: the offseason holdout story. A few unhappy contract-year stars don't report to camp;
// they sit (into the early weeks) until the team pays/reworks. Capped league-wide so it's a storyline, not noise.
function campHoldouts(){
  const cands=[];
  G.teams.forEach(t=>t.roster.forEach(p=>{ ENG.ensureBrain(p);
    if(p.pos==='K'||p.pos==='P') return;
    // a STAR entering his contract year wants to get paid — money-driven (an unhappy one is likelier)
    if(p.ovr>=82 && (p.years||9)<=1 && ENG.rng()< (0.16 + ((p.loyalty||60)<60?0.14:0))) cands.push({p,t}); }));
  cands.sort((a,b)=>b.p.ovr-a.p.ovr).slice(0,5).forEach(({p,t})=>{ const g=ENG.ri(1,3); p.out=g; p.outReason='holdout'; p.flags=p.flags||{}; p.flags.issueAck=null;
    const txt=`${p.name} (${p.pos}, ${t.city}) is holding out of training camp for a new deal — he won't report until it's resolved.`;
    recordArc(p,'HOLDOUT',txt); addNews('HOLDOUT',txt);
    if(window.VOICES&&p.ovr>=84) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`📋 Camp holdout: ${p.name} (${p.pos}, ${t.abbr}) isn't reporting — wants a new deal. ${t.abbr} have a call to make.`,'NEWS',p.ovr>=88); });
}
/* ---------- PLAYER PERSONALITIES: every player has a persona that drives his arc ---------- */
const PERSONA_LBL={captain:'Locker-room leader',trash_talker:'Trash talker',headcase:'Head case',diva:'Diva',gamer:'Competitor',quiet_pro:'Quiet pro',showman:'Showman'};
const PERSONA_EMOJI={captain:'🧢',trash_talker:'🗣️',headcase:'🧨',diva:'💅',gamer:'😤',quiet_pro:'🤐',showman:'🎬'};
function ensurePersona(p){
  if(p.persona) return p.persona; ENG.ensureTraits(p);
  const di=(p.attrs&&p.attrs.DI)||62, tm=p.temperament||60, we=p.workEthic||60, ovr=p.ovr||60, r=ENG.rng();
  const w={quiet_pro:2.6,gamer:1.6,captain:0,trash_talker:0,diva:0,headcase:0,showman:0};
  if(we>=72&&tm>=66&&p.age>=25) w.captain+=4.5;        // veteran high-character → leader
  else if(p.age>=28&&we>=62) w.captain+=1.5;           // grizzled vets lean leader
  if(tm<=52) w.trash_talker+=3;                        // low poise → mouthy
  if(['WR','CB','RB','TE'].includes(p.pos)&&ovr>=74) w.diva+=2.4;   // skill stars get diva-prone
  if(ovr>=72 && (di<=58||tm<=52)) w.headcase+=2.6;     // talented + volatile = the AB type (~2-3%)
  if(we>=76&&tm>=62) w.gamer+=2;
  if(ovr>=78) w.showman+=2.6;                          // the bigger the name, the bigger the show
  const E=Object.entries(w).filter(([,v])=>v>0); const sum=E.reduce((s,[,v])=>s+v,0)||1;
  let x=r*sum; p.persona='quiet_pro'; for(const [k,v] of E){ x-=v; if(x<=0){ p.persona=k; break; } }
  return p.persona;
}
// THE AB ARC — a brilliant head case who escalates, gets suspended, demands out, and bounces around the league.
function headcaseEscalate(p,t,ctrl){
  const dramaMult=ENG.clamp(1-ctrl,0.4,1.5); p._hc=p._hc||0;
  if(ENG.rng() > 0.05*dramaMult) return;   // a strong, stable coach (Belichick) contains him longer
  p._hc++;
  if(p._hc===1){
    p.morale=ENG.clamp((p.morale||70)-ENG.ri(4,10),6,99); teamMoraleHit(t,0,2);
    const txt=`${p.name} (${p.pos}, ${t.city}) aired out the organization on a livestream — ripping his role and the staff. The room didn't need the distraction.`;
    recordArc(p,'DRAMA',txt); addNews('DRAMA',txt);
    if(window.VOICES){ VOICES.athleteTweet(p,'loss',{tag:'NEWS'},true); feedTea(`☕ ${t.abbr}'s ${p.name} going SCORCHED EARTH on his own team on live. messy. 🍿`,true); }
  } else if(p._hc===2){
    p.out=Math.max(p.out||0,ENG.ri(1,3)); p.outReason='suspended'; p.troubled=(p.troubled||0)+1;
    p.morale=ENG.clamp((p.morale||70)-ENG.ri(8,16),6,99); teamMoraleHit(t,1,3);
    const txt=`${t.city} suspend ${p.name} (${p.pos}) ${p.out} game(s) for conduct detrimental to the team — the latest in a string of incidents.`;
    recordArc(p,'SUSPENSION',txt); addNews('SUSPENSION',txt);
    if(window.VOICES) VOICES.athleteTweet(p,'suspended',{tag:'NEWS'},true);
  } else {
    p.flags=p.flags||{}; p.flags.wantsOut=true; p.flags.headcaseOut=true; p._hcOutWk=0;
    const txt=`${p.name} (${p.pos}) demands a trade from ${t.city} and says he's played his last snap for them — a turbulent tenure boiling over.`;
    recordArc(p,'REQUEST',txt); addNews('REQUEST',txt);
    if(window.VOICES) VOICES.athleteTweet(p,'contract',{tag:'NEWS'},true);
    p._hc=0;
  }
}
function personaTick(){
  G.teams.forEach(t=>{ const ctrl=t.coach?ENG.clamp((t.coach.ovr-70)/40,-0.4,0.6):0;
    t.roster.forEach(p=>ensurePersona(p));
    // a respected captain steadies the room + mentors a young player (the Woodson/Brees effect)
    const cap=t.roster.find(p=>p.persona==='captain'&&!(p.out>0)&&!p.ir&&p.ovr>=72);
    if(cap){ t.roster.forEach(p=>{ if(!(p.out>0)) p.morale=ENG.clamp((p.morale||70)+1,12,99); });
      const kid=t.roster.filter(p=>p.age<=24&&(p.pot||p.ovr)>p.ovr&&!(p.out>0)).sort((a,b)=>(b.pot||b.ovr)-(a.pot||a.ovr))[0];
      if(kid){ kid._reps=(kid._reps||0)+1; kid.loyalty=ENG.clamp((kid.loyalty||60)+1,0,100); } }
    // head cases escalate (a strong coach delays the inevitable)
    t.roster.forEach(p=>{ if(p.persona==='headcase'&&p.ovr>=74&&!(p.out>0)&&!p.ir&&!(p.flags&&p.flags.headcaseOut)) headcaseEscalate(p,t,ctrl); });
  });
  // a head case who forced his way out gets shipped to a team willing to gamble on the talent (the bounce-around arc)
  G.teams.forEach(t=>{ t.roster.filter(p=>p.flags&&p.flags.headcaseOut).forEach(p=>{ p._hcOutWk=(p._hcOutWk||0)+1;
    if(p._hcOutWk>=2 && ENG.rng()<0.5){ const dest=ENG.pick(G.teams.filter(x=>x.abbr!==t.abbr)); if(!dest) return;
      t.roster=t.roster.filter(x=>x.id!==p.id); p.flags.wantsOut=false; p.flags.headcaseOut=false; p._hcOutWk=0; p._hc=0;
      p.morale=ENG.clamp((p.morale||70)+ENG.ri(10,20),12,99); p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(6,14),0,100);   // fresh-start bump
      dest.roster.push(p); t.picks=t.picks||[]; t.picks.push({year:G.season+2,round:4,from:dest.abbr,via:'trade'});
      const txt=`BLOCKBUSTER: ${dest.city} roll the dice on ${p.name} (${p.pos}), acquiring the mercurial talent from ${t.city} for a future pick. Can a new home finally unlock him — or is it the same movie?`;
      addNews('TRADE',txt);
      if(window.VOICES){ VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚨 ${dest.abbr} are acquiring ${p.name} from ${t.abbr}. High risk, high reward — we've seen how this story goes…`,'TRADE',true); VOICES.athleteTweet(p,'traded',{dest:dest.city,tag:'TRADE'},true); }
      repairRosterLegality(t,'headcase trade'); repairRosterLegality(dest,'headcase trade');
    }
  }); });
}
// STARS TAKE OVER THE LEAGUE — the biggest names dominate the discourse + the headlines.
function starPower(x){ return x.p.ovr*1.2 + (x.p.awardPts||0)*0.05 + (((x.t.market||60)-50))*0.1
  + ((x.p.persona==='showman'||x.p.persona==='trash_talker')?4:0) + (x.p.mvps||0)*3 + (x.p.allPros||0)*1.5; }
function starNarrativeTick(results){
  if(G.phase!=='regular') return; const all=allPlayers(); if(!all.length) return;
  all.forEach(x=>ensurePersona(x.p));
  const ranked=all.slice().sort((a,b)=>starPower(b)-starPower(a));
  G.leagueStars=ranked.slice(0,6).map(x=>({id:x.p.id,name:x.p.name,pos:x.p.pos,team:x.t.abbr,ovr:x.p.ovr,persona:x.p.persona,sp:Math.round(starPower(x))}));
  const top=ranked[0]; if(!top||!window.VOICES) return;
  if(top.p.ovr>=90 && ENG.rng()<0.4){
    const gp=Math.max(1,G.week), projY=cat=>{ const L=leaders(cat,1)[0]; return L?Math.round(L.val/gp*(G.maxWeek||17)):0; };
    const kind = (top.p.mvps>=1||top.p.ovr>=94) ? ENG.pick(['face','mvp','tear']) : ENG.pick(['face','tear','record']);
    const x={teamAbbr:top.t.abbr};
    if(kind==='record'){ const cat=top.p.pos==='QB'?'pass':top.p.pos==='RB'?'rush':'rec'; x.pace=`${projY(cat)} ${cat==='pass'?'passing yards':cat==='rush'?'rushing yards':'receiving yards'}`; }
    VOICES.starTakeover({name:top.p.name,pos:top.p.pos}, kind, x);
  }
  // the week's best individual performance gets a quote from the man himself, in his own voice
  const potg=(results||[]).map(r=>r.potg).filter(Boolean).sort((a,b)=>(b.aw||0)-(a.aw||0))[0];
  if(potg && ENG.rng()<0.6){ const f=findPlayer(potg.id); if(f){ ensurePersona(f.p); VOICES.athleteTweet(f.p,'win',{tag:'GAME'}, f.p.ovr>=88); } }
}
function brainTick(){
  G._shopHeat=Math.max(0,(G._shopHeat||0)-2);   // trade-block chatter cools off week to week
  // 1) recompute loyalty/motivation league-wide from how the season is going
  G.teams.forEach(t=>ENG.updateMotivation(t));
  // 2) off-field life — suspensions, arrests, incidents
  ENG.offField(G.teams).forEach(e=>{ recordArc(e.p,e.tag,e.txt); addNews(e.tag,e.txt); });
  // 3) unhappy stars push back: trade demands + holdouts. A strong HC keeps the room in check (Belichick); a weak staff → a shitshow.
  G.teams.forEach(t=>{
    const ctrl=t.coach? ENG.clamp((t.coach.ovr-70)/40, -0.4, 0.6) : 0;   // +60% fewer issues for an elite coach; +40% more for a bad one
    const dramaMult=ENG.clamp(1-ctrl,0.4,1.4);
    t.roster.forEach(p=>{ p.morale=ENG.clamp((p.morale||70)+(ctrl>0.2?1:ctrl<-0.12?-1:0),12,99); });  // good coaches steady morale; bad ones let it sag
    t.roster.forEach(p=>{ ENG.ensureBrain(p); if(p.out>0||p.ir||p.flags.wantsOut||p.pos==='K'||p.pos==='P') return;   // kickers/punters don't stage holdouts or demand trades
      const L=p.loyalty||60;
      // a deeply unhappy star forces his way out (any contract)
      if(p.ovr>=76 && L<44 && ENG.rng()<0.10*dramaMult){
        p.flags.wantsOut=true; const txt=`${p.name} (${p.pos}) has formally requested a trade from ${t.city}, sources say — frustrated by ${ENG.pick(['his contract','the team\'s direction','a reduced role','all the losing','a fractured relationship with the staff'])}.`;
        recordArc(p,'REQUEST',txt); addNews('REQUEST',txt);
      }
      // (holdouts are a TRAINING-CAMP story now — see campHoldouts() — not a random mid-season event.
      //  A contract-year star unhappy in-season just simmers as a trade-request candidate above.)
    });
    // 4) SUCCESS-driven drama — fires even when you're WINNING (the agent's note: good teams saw no drama)
    const gp=t.wins+t.losses, wp=gp?t.wins/gp:0.5;
    t.roster.forEach(p=>{ if(p.out>0||p.ir||p.flags.wantsOut||p.flags.payme||p.flags.ringchase||p.flags.spotlight||p.pos==='K'||p.pos==='P') return; const aw=p.awardPts||0;
      if(p.ovr>=85 && (aw>=850 || (p.years||9)<=1) && wp>=0.45 && ENG.rng()<0.06){   // pay-me: top star wants top-of-market money after a big year
        p.flags.payme=true; const txt=`${p.name} (${p.pos}) and ${t.city} are at an impasse on a new deal — he wants to be paid at the top of the market after the year he's having.`;
        recordArc(p,'CONTRACT',txt); addNews('CONTRACT',txt);
      } else if(p.ovr>=82 && p.age>=30 && wp<=0.40 && ENG.rng()<0.07){               // ring chase: aging star on a sinking team wants out to a contender
        p.flags.ringchase=true; const txt=`At ${p.age}, ${p.name} (${p.pos}, ${t.city}) is said to want a shot at a ring while he still can. A contender could come calling.`;
        recordArc(p,'REQUEST',txt); addNews('REQUEST',txt);
      } else if(p.ovr>=80 && p.age<=25 && (p._lastDev||0)>=3 && ENG.rng()<0.06){      // spotlight: a young breakout wants the role + the raise
        p.flags.spotlight=true; const txt=`${p.name} (${p.pos}, ${t.city}) has broken out — his camp wants an expanded role and a new deal to match.`;
        recordArc(p,'CONTRACT',txt); addNews('CONTRACT',txt);
      }
    });
    // 5) INTRA-TEAM DRAMA — feuds, motivation cliffs, shock walk-aways (low morale here surfaces as a manageable issue)
    const stars=t.roster.filter(p=>p.ovr>=83&&!(p.out>0)&&!p.ir);
    if(stars.length>=2 && ENG.rng()<0.014*dramaMult){   // a star skill player feuds with the QB over touches (Hurts–AJ Brown); good coaches defuse it
      const sk=stars.find(p=>['WR','TE','RB'].includes(p.pos)), qb=stars.find(p=>p.pos==='QB');
      if(sk&&qb&&sk!==qb){ sk.morale=ENG.clamp((sk.morale||70)-ENG.ri(12,24),8,99); sk.loyalty=ENG.clamp((sk.loyalty||60)-ENG.ri(6,14),12,95);
        sk.flags=sk.flags||{}; sk.flags.wantsBall=true;   // he wants the ball — feed him and it resolves (usageMoraleTick)
        const txt=`Tension in ${t.city}: ${sk.name} (${sk.pos}) is frustrated with his usage and reportedly at odds with ${qb.name} — a locker-room rift to watch.`;
        recordArc(sk,'DRAMA',txt); addNews('DRAMA',txt);
        if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`👀 ${t.abbr} drama: ${sk.name} wants the ball; sources cite friction with ${qb.name}.`,'NEWS',true); } }
    t.roster.forEach(p=>{ if(p.ovr>=82 && !(p.out>0) && !p.ir && ENG.rng()<0.006*dramaMult){   // motivation cliff — a star inexplicably checks out (Rodgers-esque); a strong coach mitigates
      p.loyalty=ENG.clamp((p.loyalty||60)-ENG.ri(18,30),8,90); p.morale=ENG.clamp((p.morale||70)-ENG.ri(16,28),8,99);
      const txt=`${p.name} (${p.pos}, ${t.city}) has gone quiet — teammates say his head isn't in it. A cornerstone suddenly disengaged.`;
      recordArc(p,'DRAMA',txt); addNews('DRAMA',txt); } });
    const shock=t.roster.find(p=>p.ovr>=78 && p.age>=26 && p.age<=31 && !(p.out>0) && !p.ir && ENG.rng()<0.0011);  // shock retirement in his prime (Andrew Luck)
    if(shock){ t.roster=t.roster.filter(x=>x.id!==shock.id); processRetirement(shock,t);
      addNews('RETIRE',`🚨 SHOCKER: ${shock.name} (${shock.pos}, ${shock.ovr} OVR, age ${shock.age}) abruptly retires, walking away from football in his prime.`);
      if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚨 STUNNER: ${shock.name} (${shock.pos}, ${t.abbr}) is retiring — in his prime. Nobody saw this coming.`,'NEWS',true); }
  });
}
// ---- SCANDAL ENGINE: tabloid soap operas that can genuinely wreck a locker room. Many flavors, real stakes, multi-week arcs ----
const TEA={h:'@EndzoneTea',n:'Endzone Tea ☕',v:false,c:'#ff7ad1'};
function pickPlayer(t,f){ const r=t.roster.filter(p=>!(p.out>0)&&!p.ir&&(!f||f(p))); return r.length?ENG.pick(r):null; }
function teamMoraleHit(t,lo,hi){ t.roster.forEach(p=>{ p.morale=ENG.clamp((p.morale||70)-ENG.ri(lo,hi),6,99); }); }
function feedTea(txt,big){ if(window.VOICES) VOICES.feedPush(TEA,txt,'NEWS',!!big); }
function scandalTick(){
  if(G.phase!=='regular') return; G.scandals=G.scandals||[];
  if(G.scandals.length<2 && ENG.rng()<0.085){ const sc=startScandal(); if(sc) G.scandals.push(sc); }   // ~1–2 per season
  G.scandals=G.scandals.filter(sc=>{ const t=team(sc.abbr); if(!t) return false;
    if(sc.stage>=2 && (sc.type==='teammate_betrayal'||sc.type==='same_sex')) teamMoraleHit(t,0,2);   // ongoing distraction drag
    if(ENG.rng()>0.45) return true;                                                                  // slow burn
    sc.stage++; return advanceScandal(sc,t);                                                          // false → resolved
  });
}
function startScandal(){
  const teams=G.teams.filter(t=>t.coach&&t.coach.name&&t.roster.length>18); if(!teams.length) return null;
  const roll=ENG.rng(); const type = roll<0.26?'reporter_coach' : roll<0.54?'teammate_betrayal' : roll<0.73?'same_sex' : roll<0.88?'owner_family' : 'wild';
  let t=(type==='reporter_coach' && teams.find(x=>x.abbr==='NE') && ENG.rng()<0.35)? teams.find(x=>x.abbr==='NE') : ENG.pick(teams);
  const sc={type,abbr:t.abbr,stage:1,id:(G._scandalSeq=(G._scandalSeq||0)+1)};
  if(type==='reporter_coach'){ sc.rep=ENG.pick(['Brooke Halliday','Sabrina Voss','Camille Reyes','Jordy Vance']); sc.coach=t.coach.name;
    addNews('GOSSIP',`👀 Sideline buzz: reporter ${sc.rep} and ${t.city} HC ${sc.coach} were spotted leaving the facility together after "extended film study."`);
    feedTea(`👀 SPOTTED: ${sc.rep} & ${t.city} coach ${sc.coach} slipping out the back after "film study." 🍿 we see you.`,true);
  } else if(type==='teammate_betrayal'){ const a=pickPlayer(t,p=>p.ovr>=68), b=pickPlayer(t,p=>p.ovr>=68&&(!a||p.id!==a.id)); if(!a||!b) return null;
    sc.a=a.id; sc.b=b.id; sc.an=a.name; sc.bn=b.name; sc.rel=ENG.pick(['wife','fiancée','longtime girlfriend','MOTHER','sister-in-law']);
    a.morale=ENG.clamp((a.morale||70)-ENG.ri(8,16),6,99); b.morale=ENG.clamp((b.morale||70)-ENG.ri(20,34),6,99);
    addNews('GOSSIP',`🚨 Locker-room bombshell in ${t.city}: whispers that ${sc.an} has been involved with ${sc.bn}'s ${sc.rel}. Teammates are stunned.`);
    feedTea(`🚨🚨 ${t.abbr} locker room is IMPLODING — word is ${sc.an} got with ${sc.bn}'s ${sc.rel}. you canNOT make this up. 😳🍿`,true);
  } else if(type==='same_sex'){ const a=pickPlayer(t,p=>p.ovr>=66); if(!a) return null; sc.a=a.id; sc.an=a.name; sc.withCoach=ENG.rng()<0.35;
    if(sc.withCoach){ sc.coach=t.coach.name; addNews('GOSSIP',`👀 ${t.city} buzz: rumors of a relationship between ${sc.an} and HC ${sc.coach}. The room is talking.`); feedTea(`👀 ${t.abbr}: rumored thing between ${sc.an} and coach ${sc.coach}. the group chat is FERAL rn.`,true); }
    else { const b=pickPlayer(t,p=>p.id!==a.id); sc.b=b?b.id:null; sc.bn=b?b.name:'a teammate'; addNews('GOSSIP',`👀 ${t.city} buzz: ${sc.an} and ${sc.bn} are reportedly together — and it has the locker room divided.`); feedTea(`👀 ${t.abbr}: ${sc.an} & ${sc.bn} reportedly an item. half the room supportive, half weird about it. messy.`,true); }
  } else if(type==='owner_family'){ const a=pickPlayer(t,p=>p.ovr>=70); if(!a) return null; sc.a=a.id; sc.an=a.name; sc.rel=ENG.pick(['daughter','son','ex-wife','granddaughter']);
    addNews('GOSSIP',`👀 Awkward in ${t.city}: ${sc.an} is reportedly dating the owner's ${sc.rel}. This can only go well.`); feedTea(`👀 ${t.abbr}: ${sc.an} is DATING THE OWNER'S ${sc.rel.toUpperCase()}. sir that is your boss's kid. 💀`,true);
  } else { const a=pickPlayer(t,p=>p.ovr>=66); if(!a) return null; sc.a=a.id; sc.an=a.name;
    sc.wild=ENG.pick(['is in a televised reality-dating-show love triangle','got catfished by someone posing as a pop star','is beefing with a teammate over a viral TikTok','is in a bizarre paternity drama with a reality-TV star','livestreamed a 3am Waffle House altercation','adopted 14 emotional-support raccoons']);
    addNews('GOSSIP',`👀 Only in ${t.city}: ${sc.an} ${sc.wild}. The internet is feasting.`); feedTea(`😂 ${t.abbr}: ${sc.an} ${sc.wild}. not him 😭😭`,false);
  }
  return sc;
}
function advanceScandal(sc,t){
  const A=sc.a?t.roster.find(p=>p.id===sc.a):null, B=sc.b?t.roster.find(p=>p.id===sc.b):null;
  if(sc.type==='reporter_coach'){
    if(sc.stage===2){ addNews('GOSSIP',`☕ The ${sc.rep}–Coach ${sc.coach} situation in ${t.city} is "very much not just professional," per sources. PR is sweating.`); feedTea(`☕ the ${sc.rep} & coach ${sc.coach} thing is officially A Thing. ${t.abbr} PR has gone dark. 💅`,true); return true; }
    if(sc.stage===3){ addNews('GOSSIP',`🚨 PHOTOS surface of ${sc.rep} and Coach ${sc.coach} getting cozy in the ${t.city} players' lot. The owner did not love it.`); feedTea(`🚨🚨 PHOTOS. ${sc.rep} + coach ${sc.coach}, ${t.abbr} lot. the booth went silent for 4 seconds. iconic.`,true); return true; }
    ensureOwner(t); if(t.owner) t.owner.confidence=ENG.clamp((t.owner.confidence||60)-ENG.ri(5,10),0,100);
    if(ENG.rng()<0.5){ addNews('GOSSIP',`💥 Fallout: ${t.city}'s owner is furious — Coach ${sc.coach}'s seat just got hot. ${sc.rep} was "reassigned to the 6am international game."`); feedTea(`💥 ${t.abbr} owner LIVID. coach ${sc.coach} = hot seat. ${sc.rep} mysteriously reassigned. justice? 😌`,true); }
    else { addNews('GOSSIP',`💍 ${sc.rep} and Coach ${sc.coach} go public and are "very happy." The league is normal about it (it is not).`); feedTea(`💍 they hard-launched. ${sc.rep} & coach ${sc.coach}. we love love 😭`,true); }
    return false;
  }
  if(sc.type==='teammate_betrayal'){
    if(A) A.morale=ENG.clamp((A.morale||70)-ENG.ri(3,8),6,99); if(B) B.morale=ENG.clamp((B.morale||70)-ENG.ri(5,10),6,99); teamMoraleHit(t,1,3);
    if(sc.stage===2){ addNews('GOSSIP',`🔥 The ${t.city} locker room is fracturing — ${sc.an} and ${sc.bn} reportedly had to be separated at practice.`); feedTea(`🔥 ${t.abbr}: ${sc.an} & ${sc.bn} had to be SEPARATED at practice. the ${sc.rel} situation is nuclear. 🍿`,true); return true; }
    if(B){ B.flags=B.flags||{}; B.flags.wantsOut=true; recordArc(B,'REQUEST',`Wants out after the ${sc.rel} betrayal by ${sc.an}.`);
      addNews('REQUEST',`💥 Fallout: ${sc.bn} demands a trade from ${t.city} — he refuses to share a locker room with ${sc.an} after the betrayal.`);
      feedTea(`💥 ${sc.bn} wants OUT of ${t.abbr}. can't blame him. ${sc.an} blew that locker room to pieces.`,true); }
    teamMoraleHit(t,3,7);   // the room is wrecked for a while
    return false;
  }
  if(sc.type==='same_sex'){
    const ctrl=t.coach?ENG.clamp((t.coach.ovr-70)/40,-0.4,0.6):0;   // a strong culture holds; a weak one splits
    if(sc.stage===2){ if(ctrl>0.2){ addNews('GOSSIP',`${t.city} HC ${t.coach.name} addresses the ${sc.an} story head-on — "we're a family." The room rallies.`); t.roster.forEach(p=>p.morale=ENG.clamp((p.morale||70)+ENG.ri(0,3),6,99)); feedTea(`💪 ${t.abbr} coach handled the ${sc.an} situation like a pro. room's tighter for it. respect.`,false); }
      else { addNews('GOSSIP',`The ${sc.an} situation is dividing the ${t.city} locker room — cliques are forming, per sources.`); teamMoraleHit(t,2,5); feedTea(`😬 ${t.abbr} room is SPLIT over the ${sc.an} thing. cliques forming. coach has lost the room.`,true); }
      return true; }
    if(ctrl>0.2){ addNews('GOSSIP',`${t.city} move past the ${sc.an} story united — a non-issue now. Culture win.`); feedTea(`✅ ${t.abbr} fully moved on. ${sc.an} thriving. culture > everything.`,false); }
    else { teamMoraleHit(t,3,6); if(A&&ENG.rng()<0.4){ A.flags=A.flags||{}; A.flags.wantsOut=true; } addNews('GOSSIP',`💥 The ${sc.an} saga has poisoned the ${t.city} locker room — chemistry is shot.`); feedTea(`💥 ${t.abbr} never recovered from the ${sc.an} mess. locker room = toxic.`,true); }
    return false;
  }
  if(sc.type==='owner_family'){
    if(sc.stage===2){ addNews('GOSSIP',`😬 The ${sc.an}–owner's-${sc.rel} romance is "complicating" things in ${t.city}. The owner reportedly hates it.`); feedTea(`😬 ${t.abbr}: the ${sc.an} & owner's ${sc.rel} thing is getting AWKWARD. imagine that film session.`,true); return true; }
    ensureOwner(t); if(t.owner) t.owner.confidence=ENG.clamp((t.owner.confidence||60)-ENG.ri(4,9),0,100);
    if(ENG.rng()<0.45 && A){ A.flags=A.flags||{}; A.flags.wantsOut=true; addNews('REQUEST',`💥 The owner has seen enough — ${t.city} are shopping ${sc.an} after the family drama.`); feedTea(`💥 ${t.abbr} SHOPPING ${sc.an} bc he's dating the owner's ${sc.rel}. wildest reason to get traded ever. 😭`,true); }
    else { addNews('GOSSIP',`🤷 ${sc.an} and the owner's ${sc.rel} are still together — the owner is "learning to live with it." Tense.`); feedTea(`🤷 ${t.abbr}: ${sc.an} still with the owner's ${sc.rel}. thanksgiving's gonna be AWKWARD.`,false); }
    return false;
  }
  // wild
  if(sc.stage===2){ addNews('GOSSIP',`😂 The ${sc.an} saga continues in ${t.city} — it's now a full national story.`); feedTea(`😂 ${t.abbr}'s ${sc.an} saga is the only thing on my timeline. never change.`,false); return true; }
  if(A) A.morale=ENG.clamp((A.morale||70)+ENG.ri(-4,2),6,99);
  addNews('GOSSIP',`🎬 The ${sc.an} circus finally dies down in ${t.city}. He says he's "locked in now." Sure.`); feedTea(`🎬 ${sc.an} says he's "locked in now." we'll see. 😂`,false);
  return false;
}
// LOSING TEAMS LOOK TO THE FUTURE: out of contention down the stretch, a club benches its vet QB for a young arm —
// who then banks reps that pay off in development. (avail/best skip benched players, so the kid actually plays.)
function qbCarouselTick(){
  if(G.phase!=='regular' || G.week < Math.round((G.maxWeek||17)*0.55)) return;
  G.teams.forEach(t=>{ const gp=t.wins+t.losses, wp=gp?t.wins/gp:0.5; if(wp>0.40) return;   // contenders ride their guy
    const qbs=t.roster.filter(p=>p.pos==='QB'&&!(p.out>0)&&!p.ir).sort((a,b)=>b.ovr-a.ovr);
    const vet=qbs[0];
    const kid=t.roster.filter(p=>p.pos==='QB'&&!(p.out>0)&&!p.ir&&!p.benched&&p.age<=25).sort((a,b)=>(b.pot||b.ovr)-(a.pot||a.ovr))[0];
    if(vet&&kid&&vet!==kid&&vet.age>=26&&!t._qbSwitched&&!vet.benched&&ENG.rng()<0.28){
      // commit to the kid: bench every QB rated above him so he's the clear starter
      t.roster.filter(p=>p.pos==='QB'&&p!==kid&&!(p.out>0)&&!p.ir&&p.ovr>kid.ovr).forEach(v=>v.benched=true);
      kid.benched=false; t._qbSwitched=true; kid.starter=true;
      const txt=`${t.city} are turning to the future at QB — ${kid.name} (${kid.age}) takes over for ${vet.name}. With the season slipping away, it's time to see what the kid's got.`;
      recordArc(kid,'DEPTH',txt); addNews('STAFF',txt);
      if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`📋 ${t.abbr} are benching ${vet.name} for young ${kid.name}. Evaluation season has arrived.`,'NEWS',false);
    }
    const starter=t.roster.filter(p=>p.pos==='QB'&&!(p.out>0)&&!p.ir&&!p.benched).sort((a,b)=>b.ovr-a.ovr)[0];
    if(starter&&starter.age<=26) starter._reps=(starter._reps||0)+1;   // banks toward offseason development
  });
}
// PLAYER RIVALRIES: elite QB duels (Manning–Brady) + WR↔CB chess matches that build through repeated meetings.
function maybeRivalry(type,a,at,b,bt,aWon){
  G.rivalries=G.rivalries||[]; const k=[a.id,b.id].sort((x,y)=>x-y).join('~'); let rv=G.rivalries.find(x=>x.key===k);
  if(!rv){ if(ENG.rng()<0.55) return;   // not every elite meeting becomes a rivalry
    rv={key:k,type,a:{id:a.id,name:a.name,abbr:at.abbr,pos:a.pos},b:{id:b.id,name:b.name,abbr:bt.abbr,pos:b.pos},meet:0,aw:0,bw:0,heat:0,born:G.season};
    G.rivalries.unshift(rv);
    if(window.VOICES) VOICES.feedPush({h:'@CoverThree',n:'Brett Cosell',v:true,c:'#8b5cf6'}, type==='QB'?`A rivalry is brewing: ${a.name} (${at.abbr}) vs ${b.name} (${bt.abbr}). This could be the next great quarterback duel.`:`${a.name} vs ${b.name} is becoming appointment viewing — a genuine WR–CB chess match.`,'NEWS',false); }
  rv.meet++; rv.heat=Math.min(100,rv.heat+ENG.ri(8,16)); if(aWon)rv.aw++; else rv.bw++;
  if(rv.meet>=2 && window.VOICES && ENG.rng()<0.7){
    const lead=rv.aw===rv.bw?`all square ${rv.aw}-${rv.bw}`:rv.aw>rv.bw?`${a.name} leads ${rv.aw}-${rv.bw}`:`${b.name} leads ${rv.bw}-${rv.aw}`;
    VOICES.feedPush({h:'@CoverThree',n:'Brett Cosell',v:true,c:'#8b5cf6'}, `Another chapter in ${a.name} vs ${b.name} (head-to-head: ${lead}). ${type==='QB'?'These two keep trading haymakers.':'Lock in — this matchup travels.'}`,'NEWS',rv.heat>=60); }
}
function rivalryTick(results){
  (results||[]).forEach(r=>{ const h=team(r.home), a=team(r.away); if(!h||!a) return; const hWon=r.hs>r.as;
    const topAt=(t,poss)=>t.roster.filter(p=>poss.includes(p.pos)&&!(p.out>0)&&!p.ir&&!p.benched).sort((x,y)=>y.ovr-x.ovr)[0];
    const q1=topAt(h,['QB']), q2=topAt(a,['QB']);
    if(q1&&q2&&q1.ovr>=86&&q2.ovr>=86) maybeRivalry('QB',q1,h,q2,a,hWon);
    [[topAt(h,['WR']),h,topAt(a,['CB']),a,hWon],[topAt(a,['WR']),a,topAt(h,['CB']),h,!hWon]].forEach(([wr,wt,cb,ct,wrWon])=>{
      if(wr&&cb&&wr.ovr>=85&&cb.ovr>=85) maybeRivalry('WRCB',wr,wt,cb,ct,wrWon); });
  });
  if(G.rivalries&&G.rivalries.length>40) G.rivalries.length=40;
}
function dispColor(d){ return d==='loyal'?'var(--good)':d==='content'?'var(--acc)':d==='restless'?'var(--acc2)':'var(--bad)'; }
const REASON_LBL={injury:'Injured',concussion:'Concussion protocol',suspended:'Suspended',legal:'Away (legal)',personal:'Away (personal)',incident:'Out (incident)',holdout:'Holdout'};
function medWeekKey(){ return `${G.season}_${G.week}_${G.phase||'regular'}`; }
function trainerRating(t){ ENG.ensureStaff(t); return (t.staff&&t.staff.med&&t.staff.med.ovr)||68; }
function trainerPointMax(t){ const r=trainerRating(t); return ENG.clamp(2+Math.floor((r-56)/10),2,6); }
function ensureMedical(t){
  if(!t) return null; ENG.ensureStaff(t); if(!t.staff.med)t.staff.med={name:ENG.coachName(),ovr:68};
  t.medical=t.medical||{};
  const key=medWeekKey();
  if(t.medical.weekKey!==key){ t.medical.weekKey=key; t.medical.pointsLeft=trainerPointMax(t); t.medical.treated={}; }
  if(t.medical.pointsLeft==null) t.medical.pointsLeft=trainerPointMax(t);
  if(!t.medical.treated) t.medical.treated={};
  return t.medical;
}
function injuryTypeLabel(p){
  if(!p) return 'Healthy';
  if(p.ir) return p.out>0?'IR - rehabbing':'IR - eligible to return';
  if(p.out>0) return REASON_LBL[p.outReason]||'Out';
  return 'Healthy';
}
function injuryRiskBand(p){
  const wear=p&&p.wear||0, load=p&&p.usageLoad||0, age=p&&p.age||25;
  const score=wear*0.75+load*16+(age>=31?8:0)+(HIGH_CONTACT.has(p&&p.pos)?6:0)-(((p&&p.attrs&&p.attrs.EN)||62)-62)*0.28;
  return {score:Math.round(ENG.clamp(score,0,100)),label:score>=72?'High':score>=48?'Elevated':score>=25?'Normal':'Low'};
}
function gameLinesForTeam(r, ab){
  let lines=(r.lines||[]).filter(l=>l.team===ab);
  if(!lines.length && r.box){ lines=(ab===r.home? (r.box.home&&r.box.home.lines) : (r.box.away&&r.box.away.lines))||[]; }
  return lines.map(l=>normalizeLineStats(Object.assign({},l)));
}
function usageLoadFromLine(l,p){
  const carries=l.car||l.ratt||0, rec=l.rec||0, tgt=l.tgt||0, patt=l.patt||0;
  const def=(l.tkl||0)+(l.sack||0)*2+(l.tfl||0)*0.9+(l.pbu||0)*0.5+(l.pr||0)*0.35+(l.hurry||0)*0.25+(l.qbhit||0)*0.8;
  const off=carries*0.11+rec*0.08+tgt*0.04+patt*0.025+(l.pcmp||0)*0.006;
  const big=((l.xrush||0)+(l.xrec||0)+(l.xpass||0))*0.08;
  const posBoost=HIGH_CONTACT.has(p.pos)?0.18:0;
  return ENG.round1(ENG.clamp(off+def*0.09+big+posBoost,0,3));
}
function applyGameUsageLoad(r, teams, wxKey){
  (teams||[]).forEach(t=>{
    if(!t) return;
    gameLinesForTeam(r,t.abbr).forEach(l=>{ const p=t.roster.find(x=>x.id===l.id); if(!p) return;
      const load=usageLoadFromLine(l,p), touches=(l.car||l.ratt||0)+(l.rec||0), pass=(l.patt||0), def=(l.tkl||0)+(l.sack||0)+(l.pr||0)+(l.hurry||0);
      p._gameUsageRisk=Math.max(p._gameUsageRisk||0,load);
      p.usageLoad=ENG.round1((p.usageLoad||0)*0.55+load*0.45);
      p.lastUsage={week:G.week+1,load,touches,pass,def,weather:wxKey};
      if(load>0.8){ const en=((p.attrs&&p.attrs.EN)||62)/100, heat=(WX[wxKey]&&WX[wxKey].fatigue)?1.25:1;
        p.wear=ENG.clamp((p.wear||0)+load*ENG.ri(2,5)*(1.16-en*0.45)*heat,0,100); }
    });
  });
}
function ensureDurability(p){ if(p&&p.durability!=null) return p.durability; if(!p) return 50;
  const en=(p.attrs&&p.attrs.EN)||62; let d=50+(en-62)*0.7+(((p.id*2654435761)>>>0)%25-12); d-=Math.max(0,((p.age||25)-30))*1.4;
  p.durability=ENG.clamp(Math.round(d),12,95); return p.durability; }
function durTier(d){ return d>=80?{l:'Ironman',c:'#46d39a'}:d>=65?{l:'Durable',c:'#5bbcff'}:d>=45?{l:'Average',c:'#93a4c4'}:d>=30?{l:'Injury-prone',c:'#e8b341'}:{l:'Glass',c:'#ef5b6b'}; }
function injStatusInfo(s){ return ({PROBABLE:{l:'Probable',c:'#46d39a'},QUESTIONABLE:{l:'Questionable',c:'#e8b341'},DOUBTFUL:{l:'Doubtful',c:'#f08a3c'},OUT:{l:'Out',c:'#ef5b6b'}})[s]||null; }
// can this player suit up for THIS week's game? (rest sits him; a play-hurt opt-in suits him despite the injury)
function pCanPlay(p){ if(!p) return false; if(p._sitWk===G.week) return false; if(p._playHurt===G.week) return true; return !(p.out>0)&&!p.ir&&!p.benched; }
function registerInjury(tm, p, inj){
  if(!tm||!p||!inj) return;
  const key = inj.career?'achilles' : inj.severe?'knee_acl' : inj.concussion?'concussion' : (ENG.pickInjType?ENG.pickInjType(p.pos):'ankle');
  const T=(ENG.INJ_TYPES&&ENG.INJ_TYPES[key])||{label:'injury',band:'WK',hit:{}};
  const band=inj.career?'CAREER':inj.severe?'SEASON':T.band;
  const severe=inj.career?'Career-ending':inj.severe?'Season-ending':key==='concussion'?'Concussion':'Week-to-week';
  ensureDurability(p);
  p.injury={ key, label:T.label, band, body:inj.body||T.label, type:inj.reason||p.outReason||'injury', severity:severe,
    initialWeeks:inj.weeks, weeks:inj.weeks, baseWeeks:inj.weeks, noPlayThru:!!T.noPlay||band==='SEASON'||band==='CAREER',
    aggravations:0, playable:false, status:'OUT', playedThru:0,
    season:G.season,week:G.week+1,team:tm.abbr,ir:false,irWeek:null,usageLoad:inj.usageLoad||p._gameUsageRisk||0,wear:inj.wear==null?Math.round(p.wear||0):inj.wear,notes:[]};
  p.ir=false;
  recordArc(p,'INJURY',`${severe} ${p.injury.body} injury; out ${inj.weeks} week${inj.weeks!==1?'s':''}.`);
}
// before THIS week's game: stamp a transient _hurt (lower effective attrs) on any player the coach chose to gut out
function applyHurtFlags(t){ if(!t) return; t.roster.forEach(p=>{ if(p._playHurt===G.week && p.injury && !p.injury.noPlayThru){
    const T=ENG.INJ_TYPES&&ENG.INJ_TYPES[p.injury.key]; const drop0=p.injury.status==='DOUBTFUL'?0.20:0.10;
    const ease=ENG.clamp((((p.durability!=null?p.durability:ensureDurability(p))-50)/50)*0.06,-0.03,0.06);
    p._hurt={drop:ENG.clamp(drop0-ease,0.05,0.24),hit:(T&&T.hit)||{}}; } else { delete p._hurt; } }); }
function clearHurtFlags(t){ if(!t) return; t.roster.forEach(p=>{ delete p._hurt; }); }
// after the game: a played-hurt player rolls AGGRAVATION — gut it out, or lose him for longer
function rollAggravation(t){ if(!t) return; t.roster.forEach(p=>{ if(p._playHurt!==G.week||!p.injury){ return; }
    ensureDurability(p); p.injury.playedThru=(p.injury.playedThru||0)+1; p.durability=ENG.clamp(p.durability-1,8,95);
    const tough=(p.durability-50)/50, base=p.injury.status==='DOUBTFUL'?0.40:0.22;
    const aggP=ENG.clamp(base*(1-tough*0.30)*(1-(trainerRating(t)-68)*0.006),0.05,0.70);
    if(ENG.rng()<aggP){ const bump=ENG.ri(2,3)+(p.injury.aggravations||0); p.injury.aggravations++;
      p.out=Math.max(p.out||0,p.injury.weeks||1)+bump; p.injury.weeks=p.out; p.injury.status='OUT'; p.injury.playable=false; p.durability=ENG.clamp(p.durability-ENG.ri(2,4),8,95);
      addNewsIf(t.abbr===USER,'INJURY',`💥 ${p.name} (${p.pos}) re-aggravated the ${p.injury.label||'injury'} — now out ${p.out} week${p.out>1?'s':''}. You knew the risk.`);
    } else { if(p.out<=1){ p.out=0; p.outReason=null; if(p.injury) p.injury.status='PROBABLE'; }
      addNewsIf(t.abbr===USER,'INJURY',`💪 ${p.name} (${p.pos}) gutted out the ${p.injury.label||'injury'} and held up. Warrior stuff.`); }
    p._playHurt=null; }); }
function injurySummary(p){
  if(!p||(!p.out&&!p.ir&&!p.injury)) return 'Healthy';
  const i=p.injury||{}, body=i.body||'undisclosed';
  if(!(p.out>0)&&!p.ir) return i.body?`Healthy - recent ${body}`:'Healthy';
  if(p.ir&&p.out<=0) return `IR eligible - ${body}`;
  return `${injuryTypeLabel(p)} · ${body}${p.out>0?` · ${p.out} wk`:''}`;
}
function placeOnIR(id){
  const t=ut(), p=t.roster.find(x=>x.id===id); if(!p) return;
  if(!(p.out>0)){ toast('Only injured players can go on IR.'); return; }
  if(p.out<4 && !(p.injury&&p.injury.severity==='Season-ending')){ toast('IR is for longer injuries (4+ weeks).'); return; }
  p.ir=true; p.injury=p.injury||{body:'undisclosed',type:p.outReason||'injury',initialWeeks:p.out,weeks:p.out,season:G.season,week:G.week+1,notes:[]};
  p.injury.ir=true; p.injury.irWeek=G.week; p.injury.irMin=4;
  p.out=Math.max(p.out,4);
  p.injury.notes.unshift(`Placed on IR in week ${G.week+1}.`);
  addNews('INJURY',`${t.city} place ${p.name} (${p.pos}) on injured reserve.`);
  toast(`${p.name} moved to IR.`); save(); render();
}
function activateFromIR(id){
  const t=ut(), p=t.roster.find(x=>x.id===id); if(!p||!p.ir) return;
  const min=(p.injury&&p.injury.irMin)||4, stayed=Math.max(0,G.week-((p.injury&&p.injury.irWeek)||G.week));
  if(p.out>0){ toast(`${p.name} is not medically cleared yet.`); return; }
  if(stayed<min){ toast(`IR minimum not met (${min-stayed} week${min-stayed!==1?'s':''} left).`); return; }
  p.ir=false; p.outReason=null; if(p.injury){ p.injury.ir=false; p.injury.clearedWeek=G.week+1; p.injury.notes.unshift(`Activated from IR in week ${G.week+1}.`); }
  addNews('INJURY',`${p.name} (${p.pos}) is activated from IR and cleared for ${t.city}.`);
  toast(`${p.name} activated.`); save(); render();
}
function treatInjury(id){
  const t=ut(), med=ensureMedical(t), p=t.roster.find(x=>x.id===id); if(!p) return;
  if(!(p.out>0)){ toast('Player is not currently out.'); return; }
  if((med.pointsLeft||0)<=0){ toast('No trainer points left this week.'); return; }
  if(med.treated[id]){ toast('Already treated this week.'); return; }
  med.pointsLeft--; med.treated[id]=1;
  const protocol=p.outReason==='concussion';
  const chance=ENG.clamp(0.42+(trainerRating(t)-68)*0.008+(p.ir?0.10:0),0.25,0.78);
  const improved=!protocol || ENG.rng()<chance;
  if(improved) p.out=Math.max(0,(p.out||0)-1);
  p.wear=ENG.clamp((p.wear||0)-ENG.ri(6,12),0,100);
  p.injury=p.injury||{body:'undisclosed',type:p.outReason||'injury',initialWeeks:p.out+1,notes:[]};
  p.injury.notes=p.injury.notes||[];
  p.injury.weeks=Math.max(0,p.out||0);
  p.injury.notes.unshift(`${t.staff.med.name} used a trainer point in week ${G.week+1}${improved?'; timeline improved.':'; protocol held firm.'}`);
  if(p.out===0&&!p.ir){ p.outReason=null; p.injury.clearedWeek=G.week+1; addNews('INJURY',`${p.name} (${p.pos}) is cleared after extra work with ${t.city}'s training staff.`); }
  toast(improved?'Timeline improved.':'Treatment helped conditioning, but timeline held.');
  save(); render();
}
window.placeOnIR=placeOnIR; window.activateFromIR=activateFromIR; window.treatInjury=treatInjury;

/* ---------- story engine: pro rumors/buzz + NCAA storylines from live state ---------- */
function posNoun(pos){ return {QB:'quarterbacks',RB:'running backs',FB:'fullbacks',WR:'receivers',TE:'tight ends',T:'tackles',G:'guards',C:'centers',DE:'edge rushers',DT:'defensive tackles',OLB:'linebackers',ILB:'linebackers',CB:'cornerbacks',S:'safeties',K:'kickers',P:'punters'}[pos]||pos; }
function storyEngine(results){
  const R=ENG.rng, pk=a=>a[Math.floor(R()*a.length)], shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const out=[];                 // {tag, txt}
  const allP=allPlayers();
  const stars=allP.filter(x=>x.p.ovr>=84);
  const gp=G.week||1;
  // ----- PRO: contract / free-agency rumors -----
  const expiring=allP.filter(x=>x.p.ovr>=80 && (x.p.years||9)<=1);
  if(expiring.length) out.push({tag:'RUMOR',txt:pk([
    (()=>{const e=pk(expiring);return `${e.p.name} (${e.p.pos}) is in the final year of his deal — sources say he wants to reset the market for ${posNoun(e.p.pos)}.`;})(),
    (()=>{const e=pk(expiring);return `Agents for ${e.p.name} (${e.p.pos}, ${e.t.city}) have begun extension talks; a holdout isn't off the table.`;})(),
    (()=>{const e=pk(expiring);return `Rival execs expect ${e.p.name} to hit free agency — at least four contenders are already circling.`;})(),
  ])});
  const richTeam=shuf(G.teams).find(t=>capSpace(t)>25);
  if(richTeam){ const nd=ENG.needs(richTeam); const need=Object.keys(nd).sort((a,b)=>nd[b]-nd[a])[0];
    out.push({tag:'RUMOR',txt:`${richTeam.city} are sitting on ${money(capSpace(richTeam))} in cap space and are said to be hunting a ${need}.`}); }
  // ----- PRO: trade winds -----
  const dealTeam=pk(G.teams);
  out.push({tag:'BUZZ',txt:pk([
    `${dealTeam.city} are reportedly fielding calls and could be sellers if the slide continues.`,
    `Front offices are watching ${pk(stars.length?stars:allP).p.name}'s situation closely ahead of the deadline.`,
    `One GM called this "the deepest trade market in years" — expect fireworks.`,
  ])});
  // ----- PRO: hot seat / power shift -----
  const sorted=standings();
  const hot=sorted[sorted.length-1], top=sorted[0];
  out.push({tag:'STORY',txt:pk([
    `Pressure is mounting on ${hot.coach.name} in ${hot.city} after a ${hot.wins}-${hot.losses} start.`,
    `${top.city} (${top.wins}-${top.losses}) look like the team to beat in the ${top.conf}.`,
    `The ${hot.city} ${hot.nick} have become the league's biggest disappointment at ${hot.wins}-${hot.losses}.`,
  ])});
  // ----- PRO: pace / breakout -----
  if(gp>=2){ const cat=pk([['pass','passing yards'],['rush','rushing yards'],['rec','receiving yards'],['sack','sacks']]);
    const L=leaders(cat[0],1)[0]; if(L){ const proj=Math.round(L.val/gp*G.maxWeek);
      out.push({tag:'BUZZ',txt:`${L.name} (${L.team}) is on pace for ${proj.toLocaleString()} ${cat[1]} — ${cat[0]==='sack'&&proj>20?'record territory':'one of the league\'s best'}.`}); } }
  // ----- NCAA storylines -----
  const pros=(G.prospects||[]);
  if(pros.length){
    ncaaInit(false);
    const p1=pk(pros.slice(0,40)); ensureCollegeProfile(p1,pros.indexOf(p1));
    const liveStory=(G.college&&G.college.stories&&G.college.stories[0]&&G.college.stories[0].txt);
    out.push({tag:'NCAA',txt:liveStory||pk([
      ncaaStoryFor(p1,'heisman'),
      ncaaStoryFor(p1,'stat'),
      ncaaStoryFor(p1,'stock'),
      `${p1.school} star ${p1.name} (${p1.pos}) is carrying the ${p1.college?p1.college.archLabel.toLowerCase():'draft'} storyline into November.`,
    ])});
    const needyTeam=pk(sorted.slice(-8)); const nd=ENG.needs(needyTeam); const need=Object.keys(nd).sort((a,b)=>nd[b]-nd[a])[0];
    const match=pk(pros.filter(p=>p.pos===need).slice(0,10)) || pk(pros.slice(0,20));
    if(match) out.push({tag:'NCAA',txt:`Mock-draft chatter pairs ${needyTeam.city} with ${match.name} (${match.pos}, ${match.school}) — a clean fit for their biggest hole.`});
  }
  // emit 3-4 fresh items, shuffled
  shuf(out).slice(0,4).forEach(s=>addNews(s.tag,s.txt));
}

/* ---------- GM: free agency / trade / draft ---------- */
/* ---------- free agency: multi-pronged desires, an agent, a live market ---------- */
const AGENT_NAMES=['Rosenhaus & Co.','Apex Sports','CAA Football','Klutch','Vanguard Reps','SportStar','Athletes First','Premier Talent'];
function faDesires(p){   // what this client actually wants, weighted (money / winning / role / loyalty)
  const vet=p.age>=31, star=p.ovr>=82;
  let money=vet?0.30:0.44, winning=vet?0.36:0.16, role=star?0.14:0.28, loyalty=0.16;
  const s=money+winning+role+loyalty; return {money:money/s, winning:winning/s, role:role/s, loyalty:loyalty/s};
}
function faAsk(p){ const v=tradeValue(p); return { aav:ENG.round1(0.8+Math.pow(v/100,2.2)*36), years: v>=70?ENG.ri(3,5):v>=45?ENG.ri(2,4):ENG.ri(1,2) }; }
function buildFAPool(){
  if(G.faPool && G.faPool.length) return;
  const pool=[]; const add=p=>{ ENG.ensureBrain(p); const ask=faAsk(p);
    pool.push(Object.assign({},p,{value:tradeValue(p), askAAV:ask.aav, askYears:ask.years, desires:faDesires(p), agent:ENG.pick(AGENT_NAMES)})); };
  // available vets shaken loose from rosters
  G.teams.forEach(t=>{ t.roster.forEach(p=>{ if(ENG.rng()<0.05 && !p.starter){ add(Object.assign({},p,{from:t.abbr})); } }); });
  // a real generated market — street free agents + camp cuts the user can actually sign to rebuild
  const N=ENG.ri(26,40);
  for(let i=0;i<N;i++){ const pos=ENG.pick(ENG.QUOTA)[0]; const r=ENG.rng(); const ovr= r<0.07?ENG.ri(76,82): r<0.38?ENG.ri(68,75): ENG.ri(57,67);
    add(Object.assign(genFiller(pos,ovr,ovr),{age:ENG.ri(23,32),from:'FA'})); }
  G.faPool=pool.sort((a,b)=>b.value-a.value);
}
// how well a concrete offer satisfies the player's weighted desires (0..~1.1)
function faFit(p,offer){ const d=p.desires||faDesires(p); const ask=p.askAAV||faAsk(p).aav; const t=team(offer.teamAbbr);
  const money=ENG.clamp(offer.aav/ask,0,1.2);
  const winning=t?ENG.clamp((ENG.teamOvr(t)-66)/16,0,1):0.5;
  const role={starter:1,rotation:0.6,depth:0.3}[offer.role]||0.5;
  const loyalty=(offer.teamAbbr===p.from)?1:0.4;
  const home = t?teamHomeAffinity(t,p):0;   // a natural pull toward a club near where he grew up
  return d.money*money + d.winning*winning + d.role*role + d.loyalty*loyalty + homePullWeight(p)*home;
}
// the competing market: which AI teams want him and their implied offers
function faSuitors(p){
  return G.teams.filter(t=>t.abbr!==USER && (!G.rules.salaryCap || capSpace(t)>=(p.askAAV||faAsk(p).aav)*0.8))
    .map(t=>{ const nd=ENG.needs(t); const st=t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr);
      const role=(!st[0]||p.ovr>st[0].ovr)?'starter':(st[1]&&p.ovr>st[1].ovr?'rotation':'depth');
      const offer={aav:ENG.round1(p.askAAV*(0.85+ENG.rng()*0.25)),years:p.askYears,role,teamAbbr:t.abbr};
      return {t,offer,fit:faFit(p,offer)+(nd[p.pos]||0)*0.01}; })
    .sort((a,b)=>b.fit-a.fit).slice(0,3);
}
// ---- FREE-AGENT BIDDING WAR: rival clubs react to the user's bid and the player picks the best fit ----
// how high a club will go on this player (need + talent), clamped to its cap room.
function faMaxAAV(t,p){ const nd=ENG.needs(t)[p.pos]||0; const base=p.askAAV||faAsk(p).aav;
  let max=ENG.round1(base*ENG.clamp(0.9+nd*0.02+Math.max(0,(p.ovr-72))*0.03,0.85,1.5));
  if(G.rules.salaryCap) max=Math.min(max,Math.max(0,capSpace(t))); return max; }
// build the competing market AFTER seeing the user's offer; rivals push toward/over it when they want him.
function faRunBidding(p,userOffer){
  const dfa=diffFA();   // harder difficulty → rivals bid more aggressively
  const rivals=G.teams.filter(t=>t.abbr!==USER).map(t=>{ const st=t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr);
      const role=(!st[0]||p.ovr>st[0].ovr)?'starter':(st[1]&&p.ovr>st[1].ovr?'rotation':'depth');
      const nd=ENG.needs(t)[p.pos]||0; const interest=(nd*0.02+Math.max(0,(p.ovr-66))*0.02+(role==='starter'?0.15:0))*dfa;
      return {t,role,nd,interest}; })
    .filter(r=>r.interest>0.18 && (!G.rules.salaryCap || capSpace(r.t)>=(p.askAAV||faAsk(p).aav)*0.7))
    .sort((a,b)=>b.interest-a.interest).slice(0,4)
    .map(r=>{ const max=faMaxAAV(r.t,p);
      const target=Math.max((p.askAAV||4)*(0.9+r.interest*0.4), (userOffer.aav||0)*(r.interest>0.5?(1.0+0.04*dfa):0.9));
      const aav=ENG.round1(ENG.clamp(Math.min(target,max||target),1,Math.max(1,max||target)));
      const offer={aav,years:p.askYears,role:r.role,teamAbbr:r.t.abbr}; return {t:r.t,offer,fit:faFit(p,offer)}; })
    .sort((a,b)=>b.fit-a.fit);
  return {rivals, userFit:faFit(p,userOffer), bestRival:rivals[0]||null}; }
// sign a free agent to an AI club (used when the player picks a rival over the user)
function signFAtoTeam(t,p,offer){ const from=team(p.from); if(from) from.roster=from.roster.filter(x=>x.id!==p.id);
  const np=Object.assign({},p); ['from','ask','value','askAAV','askYears','desires','agent','suitors'].forEach(k=>delete np[k]);
  np.salary=offer.aav; np.years=p.askYears; np.starter=false; np.morale=75; np.loyalty=Math.max(np.loyalty||60,66); if(!np.num)np.num=jerseyNumber(t,np.pos);
  t.roster.push(np); G.faPool=(G.faPool||[]).filter(x=>x.id!==p.id);
  if(from) repairRosterLegality(from,'free agency departure'); repairRosterLegality(t,'free agent signing');
  addNews('SIGNING',`${t.city} sign ${p.name} (${p.pos}, ${p.ovr}) — ${money(offer.aav)} AAV.`);
  if(window.VOICES && p.ovr>=78) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`✍️ ${p.name} (${p.pos}, ${p.ovr}) signs with the ${t.city} ${t.nick} — ${money(offer.aav)} AAV. They won the bidding war.`,'NEWS',p.ovr>=84); }
// heuristic agent verdict (used directly, and as the fallback when no Claude key)
function faVerdict(p,offer){ const fit=faFit(p,offer), money=offer.aav/(p.askAAV||1), best=(faSuitors(p)[0]||{fit:0.4}).fit;
  if(money>=0.92 && fit>=best*0.96) return {verdict:'ACCEPT', reason:'These terms work for my client.'};
  if(money>=0.74 && fit>=best*0.82) return {verdict:'COUNTER', reason:'We\'re in the ballpark — close the gap.', counterAAV:Math.round(p.askAAV), counterYears:p.askYears};
  return {verdict:'REJECT', reason: money<0.74?'The money is light for where the market is.':'A better situation is on the table.'};
}
// Claude plays the agent (optional; JSON verdict). Falls back to faVerdict.
async function claudeAgent(p,offer,cb){
  const heur=faVerdict(p,offer);
  if(!AI.ready()){ cb(heur,null); return; }
  const d=p.desires, top=Object.entries(d).sort((a,b)=>b[1]-a[1])[0][0];
  try{
    const sys=`You are ${p.agent}, the agent for ${p.name} (${p.pos}, ${p.ovr} OVR, age ${p.age}) in a fictional pro-football league. Your client most values ${top} (priorities — money ${Math.round(d.money*100)}%, winning ${Math.round(d.winning*100)}%, role ${Math.round(d.role*100)}%, loyalty ${Math.round(d.loyalty*100)}%). Reply with JSON: {"verdict":"ACCEPT"|"COUNTER"|"REJECT","reason":"one sentence","counterAAV":number,"counterYears":number}.`;
    const t=team(offer.teamAbbr);
    const usr=`Market ask: $${p.askAAV}M AAV over ${p.askYears} yrs. Offer from the ${t.city} ${t.nick} (a ${ENG.teamOvr(t)}-rated team): $${offer.aav}M AAV, ${offer.years} yrs, ${offer.role} role. Respond as the agent.`;
    const txt=await AI.call(sys,usr,260); let obj; try{ obj=JSON.parse((txt.match(/\{[\s\S]*\}/)||[txt])[0]); }catch(e){ obj=heur; }
    cb(heur,obj);
  }catch(e){ cb(heur,null); }
}
function doSignFA(p,aav,years){ const t=ut(); if(G.rules.salaryCap && capSpace(t)<aav){ toast('Not enough cap space.'); return false; }
  const from=team(p.from); if(from) from.roster=from.roster.filter(x=>x.id!==p.id);
  const np=Object.assign({},p); ['from','ask','value','askAAV','askYears','desires','agent','suitors'].forEach(k=>delete np[k]);
  np.salary=aav; np.years=years; np.starter=false; np.morale=76; np.loyalty=Math.max(np.loyalty||60,68); if(!np.num)np.num=jerseyNumber(t,np.pos);
  t.roster.push(np); G.faPool=G.faPool.filter(x=>x.id!==p.id);
  if(from) repairRosterLegality(from,'free agency departure'); repairRosterLegality(t,'free agent signing');
  addNews('SIGNING',`${t.city} sign ${p.name} (${p.pos}, ${p.ovr}) — ${years} yr / ${money(aav)} AAV.`);
  if(window.VOICES && p.ovr>=78) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`✍️ The ${t.city} ${t.nick} win the ${p.name} (${p.pos}, ${p.ovr}) sweepstakes — ${years} yr, ${money(aav)} AAV.`,'NEWS',p.ovr>=84);
  if(p.ovr>=82) t.roster.forEach(q=>{ if(q.id!==np.id) q.morale=ENG.clamp((q.morale||70)+ENG.ri(0,2),12,99); });   // landing a star energizes the locker room
  save(); return true;
}
// AI teams work the market too (depletes the pool; you have to compete)
function autoFA(){ buildFAPool(); if(!G.faPool.length) return; let n=0;
  for(let i=0;i<G.faPool.length && n<2; i++){ const p=G.faPool[i]; const s=faSuitors(p)[0];
    if(s && ENG.rng()<0.45 && (!G.rules.salaryCap || capSpace(s.t)>=s.offer.aav)){
      const from=team(p.from); if(from) from.roster=from.roster.filter(x=>x.id!==p.id);
      const np=Object.assign({},p); ['from','value','askAAV','askYears','desires','agent','suitors'].forEach(k=>delete np[k]);
      np.salary=s.offer.aav; np.years=p.askYears; np.starter=false; np.morale=74;
      s.t.roster.push(np); G.faPool.splice(i,1); i--; n++;
      if(from) repairRosterLegality(from,'free agency departure'); repairRosterLegality(s.t,'free agent signing');
      addNews('SIGNING',`${s.t.city} sign ${p.name} (${p.pos}, ${p.ovr}) — ${money(s.offer.aav)} AAV.`);
    } }
}
window.signFA=(pid)=>{ buildFAPool(); const p=(G.faPool||[]).find(x=>x.id===pid); if(p) faNegotiateModal(p); };   // open negotiation as a pop-up
// negotiation as a centered modal so it's always visible (it used to render below a 40-row table, off-screen)
function faNegotiateModal(p){
  const t=ut(); const top=Object.entries(p.desires).sort((a,b)=>b[1]-a[1])[0][0]; const suit=faSuitors(p);
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl') closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:560px;width:94%';
  const space=capSpace(t);
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Negotiate — ${p.name}</h2><button class="btn sec" id="fx">✕</button></div>
    <p class="muted" style="font-size:12px">${p.agent} reps ${p.name} (${p.pos} ${p.ovr}, age ${p.age}) <span title="hometown">📍 ${esc(hometownOf(p))}</span>${homePullWeight(p)>=0.27?` <span class="tag" title="he'd take a discount to play closer to home">🏠 wants home</span>`:''}. Client priorities: <b>${top}</b> — money ${Math.round(p.desires.money*100)} / win ${Math.round(p.desires.winning*100)} / role ${Math.round(p.desires.role*100)} / loyalty ${Math.round(p.desires.loyalty*100)}${teamHomeAffinity(ut(),p)>0?` / <b class="good">home ${Math.round(homePullWeight(p)*teamHomeAffinity(ut(),p)*100)}</b>`:''}. Market ask: <b>${money(p.askAAV)}/yr × ${p.askYears}</b>. Your cap space: <b class="${space<0?'bad':'good'}">${money(space)}</b>.</p>
    ${suit.length?`<p class="muted" style="font-size:12px">Competing: ${suit.map(s=>`${s.t.abbr} (${s.offer.role}, ${money(s.offer.aav)})`).join(' · ')}</p>`:'<p class="muted" style="font-size:12px">No other suitors right now — you have leverage.</p>'}
    <div class="row" style="flex-wrap:wrap;gap:12px;margin-top:10px;align-items:flex-end">
      <label class="opt"><span>AAV $M</span><input type="number" id="faav" value="${Math.round(p.askAAV)}" style="width:84px"></label>
      <label class="opt"><span>Years</span><select id="fyrs">${[1,2,3,4,5].map(y=>`<option ${y===p.askYears?'selected':''}>${y}</option>`).join('')}</select></label>
      <label class="opt"><span>Role</span><select id="frole"><option value="starter">Starter</option><option value="rotation">Rotation</option><option value="depth">Depth</option></select></label>
      <button class="btn" id="fsubmit">Submit Offer</button>
    </div><div id="fastat" class="muted" style="margin-top:10px;min-height:20px"></div>`;
  ov.appendChild(box); document.body.appendChild(ov);
  box.querySelector('#fx').onclick=closeOvl;
  box.querySelector('#fsubmit').onclick=()=>{ const aav=ENG.round1(+box.querySelector('#faav').value||1), years=+box.querySelector('#fyrs').value, role=box.querySelector('#frole').value;
    const st=box.querySelector('#fastat'); st.innerHTML='The agent is taking your offer to the market…';
    if(G.rules.salaryCap && capSpace(t)<aav){ st.innerHTML=`<span class="bad">✗ You only have ${money(capSpace(t))} in cap space. Lower the AAV or clear cap first.</span>`; return; }
    const userOffer={aav,years,role,teamAbbr:USER}; const bid=faRunBidding(p,userOffer); const rival=bid.bestRival; const rivalFit=rival?rival.fit:0;
    const board=rival?`<div class="muted" style="font-size:11px;margin-top:6px">Rival bids — ${bid.rivals.map(r=>`${r.t.abbr} ${money(r.offer.aav)} (${r.offer.role})`).join(' · ')}</div>`:'<div class="muted" style="font-size:11px;margin-top:6px">No rival bids — the room is yours.</div>';
    claudeAgent(p,userOffer,(heur,ai)=>{ const reason=ai?ai.reason:heur.reason; const moneyOK=aav>=(p.askAAV||1)*0.78;
      if(bid.userFit>=rivalFit*0.999 && moneyOK){
        if(doSignFA(p,aav,years)){ st.innerHTML=`<span class="good">✓ He's coming! ${p.name} signs with ${t.city}. ${reason}</span>${board}`; toast(`Signed ${p.last}!`); setTimeout(()=>{ closeOvl(); render(); },1100); }
        else st.innerHTML=`<span class="bad">✗ Not enough cap space (${money(capSpace(t))}).</span>`;
      } else if(bid.userFit>=rivalFit*0.9 || !moneyOK){
        st.innerHTML=`<span class="acc">↔ ${reason} ${rival?`${rival.t.abbr} are in at ${money(rival.offer.aav)} (${rival.offer.role}) — beat it.`:`He wants ~${money(p.askAAV)}/yr.`}</span>${board}`;
      } else if(rival){
        signFAtoTeam(rival.t,p,rival.offer); st.innerHTML=`<span class="bad">✗ ${p.name} signs with ${rival.t.city} (${money(rival.offer.aav)}). ${reason}</span>${board}`;
        toast(`${p.last} signed elsewhere.`); setTimeout(()=>{ closeOvl(); render(); },1500);
      } else st.innerHTML=`<span class="bad">✗ ${reason}</span>`;
    }); };
}
/* ---------- neural-net trade engine + Claude as the opposing GM ---------- */
// learned trade value of a player (0-100 points)
function franchisePremium(p){
  if(!p||p.kind==='pick') return 0;
  let v=0;
  if(p.pos==='QB' && p.ovr>=84) v += 18 + (p.ovr-84)*5 + Math.max(0,30-(p.age||30))*1.8;
  if(p.ovr>=92) v += 18 + (p.ovr-92)*4;
  if((p.age||30)<=25 && p.ovr>=85) v += 14;
  return Math.round(v);
}
function tradeValue(p){ const base=NN.value([ p.ovr/99, ENG.clamp((30-p.age)/12,0,1), (ENG.POS_VAL[p.pos]||1)/1.7, ENG.clamp((p.years||2)/5,0,1) ])*100;
  return Math.round(base + franchisePremium(p)); }
function rosterRank(t,p){ if(!t||!p||p.kind==='pick') return 99;
  return t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>(b.ovr||0)-(a.ovr||0)).findIndex(x=>x.id===p.id)+1 || 99; }
function franchiseProtected(t,p){
  if(!p||p.kind==='pick') return false;
  if(p.flags && (p.flags.onBlock||p.flags.wantsOut)) return false;
  const next=t&&t.roster?t.roster.filter(x=>x.pos===p.pos&&x.id!==p.id).sort((a,b)=>b.ovr-a.ovr)[0]:null;
  // stronger elite/scarce protection per world-class GM rules
  if(p.pos==='QB' && p.ovr>=84 && (!next || next.ovr<76)) return true;
  if(p.pos==='QB' && p.ovr>=90) return true;
  if(['WR','RB','TE','DE','CB'].includes(p.pos) && (p.age||30)<=27 && (p.ovr||0)>=82 && rosterRank(t,p)<=1) return true;
  if(['WR','RB','TE'].includes(p.pos) && (p.ovr||0)>=80 && rosterRank(t,p)<=1 && (!next || next.ovr<76)) return true;
  if(p.ovr>=94 && (p.age||30)<=29) return true;
  // last viable starter at a thin position
  if(next && next.ovr<72 && ['QB','T','C','K','P'].includes(p.pos)) return true;
  return false;
}
const PICK_VAL=[0,55,38,26,17,11,7,4];                       // round-1..7 trade points
function pickVal(pk){
  const yrs=Math.max(0,(pk.year||G.season+1)-(G.season+1));
  let v = Math.round((PICK_VAL[pk.round]||4) * (yrs===0?1:yrs===1?0.78:0.64));
  // dynamic: current record + future uncertainty (better picks for bad teams; more variance on futures)
  const rec = (pk.from && team(pk.from) && (team(pk.from).wins + team(pk.from).losses)) ? (team(pk.from).wins / Math.max(1,team(pk.from).wins+team(pk.from).losses)) : 0.5;
  if(pk.round===1) v = Math.round(v * (1.0 + (0.5 - rec)*0.25)); // bad teams get slight premium on their 1sts
  return Math.max(3, v);
}
function assetVal(a){ return a.kind==='pick'?pickVal(a):tradeValue(a); }
function pkgVal(arr){ return arr.reduce((s,a)=>s+assetVal(a),0); }
function teamPicks(t){ if(G&&t) ensurePicks(t); return (t.picks||[]).slice().sort((a,b)=>(a.year-b.year)||(a.round-b.round)||String(a.from).localeCompare(String(b.from))); }
function ensurePicks(t){
  t.picks=t.picks||[];
  const target=G.season+3;
  const through=t._picksInitThrough||Math.max(0,...t.picks.map(pk=>pk.year||0));
  for(let y=Math.max(G.season+1,through+1); y<=target; y++) for(let r=1;r<=7;r++) t.picks.push({year:y,round:r,from:t.abbr});
  t._picksInitThrough=Math.max(through,target);
}
// does this package fill a need / improve the receiving team?
function needFit(t, incoming){
  const nd=ENG.needs(t); let fit=0;
  incoming.filter(a=>a.kind!=='pick').forEach(p=>{ const starters=t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr); const best=starters[0]?starters[0].ovr:50;
    if(p.ovr>best) fit+=(p.ovr-best)*1.5; fit+=(nd[p.pos]||0)*0.4; });
  return fit;
}
// the other team's verdict on a deal (NN value + need); returns {accept, delta, line}
// difficulty sets how shrewd the AI is: on easy it'll eat a loss, on hard it demands to win the deal.
function aiTradeThreshold(){ return ({easy:-10,normal:-2,hard:4,ironman:10})[G.difficulty||'normal']; }
function evalTradeNN(give, get, otherT){     // give = assets the user sends to otherT; get = assets the user receives
  const inToOther=pkgVal(give), outFromOther=pkgVal(get);
  // symmetric valuation: the AI weighs filling its OWN needs, with only a mild discount for the value we gain.
  const fit=needFit(otherT, give)*0.22 - needFit(ut(), get)*0.10;
  const margin = inToOther - outFromOther + fit;       // >0 means the other team profits
  const protectedOut=get.filter(a=>a.kind!=='pick').find(p=>franchiseProtected(otherT,p));
  const illegalOut=legalAfterSending(otherT,get);
  const thr=aiTradeThreshold();
  const accept = margin >= thr && !illegalOut && !(protectedOut && margin<40);   // fair value (tuned by difficulty), but never roster-breaking/franchise giveaways
  return {accept, inToOther, outFromOther, margin:Math.round(margin),
    line: accept? `${otherT.city} accept.` : illegalOut?`${otherT.city} reject — ${illegalOut}.`:protectedOut?`${otherT.city} reject — ${protectedOut.name} is a franchise piece, not a throw-in.`:(margin<thr-9?`${otherT.city} reject — not nearly enough value.`:`${otherT.city} are close, but want a bit more.`) };
}
function execTrade(give, get, otherAbbr){
  if(G.tradeDeadlinePassed){ toast('🔒 The trade deadline has passed — no deals until the offseason.'); return; }
  const t=ut(), o=team(otherAbbr);
  const myIssue=legalAfterSending(t,give), theirIssue=legalAfterSending(o,get);
  if(myIssue||theirIssue){ toast(myIssue||theirIssue); return; }
  const ev=evalTradeNN(give,get,o);
  if(!ev.accept){ toast(ev.line); return; }
  // a traded player gets a clean slate — old holdout/trade-request/block flags don't follow him to the new team
  const fresh=p=>{ if(!p||p.kind==='pick') return; p.flags=p.flags||{}; ['wantsOut','payme','ringchase','spotlight','wantsBall','onBlock','issueAck'].forEach(k=>p.flags[k]=false); p._starved=0;
    if(p.outReason==='holdout'){ p.out=0; p.outReason=null; } p.morale=ENG.clamp((p.morale||70)+ENG.ri(2,8),30,99); p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(0,6),25,95); };
  const moveAssets=(from,to,assets)=>{ assets.forEach(a=>{ if(a.kind==='pick'){ from.picks=(from.picks||[]).filter(x=>!(x.round===a.round&&x.year===a.year&&x.from===a.from)); a.from=a.from; (to.picks=to.picks||[]).push(a); }
    else { from.roster=from.roster.filter(p=>p.id!==a.id); a.starter=false; fresh(a); to.roster.push(a); } }); };
  let tradeDead=0; if(G.rules.salaryCap){ give.forEach(a=>{ if(a&&a.kind!=='pick'){ const d=deadCapOf(a); if(d>0){ tradeDead+=d; t.dead=t.dead||[]; t.dead.push({name:a.name,amt:d,season:deadSeason()}); } } }); tradeDead=ENG.round1(tradeDead); }
  moveAssets(t,o,give); moveAssets(o,t,get);
  repairAllRosters('trade');
  if(tradeDead>0){ addNews('ROSTER',`Trade accelerates $${tradeDead}M in bonus money onto the ${t.city} cap.`); }
  G._shopContext=null;
  pruneOffers();   // any other outstanding offer for a player/pick that just moved is now dead
  const nm=a=>a.kind==='pick'?`${a.year} R${a.round}`:`${a.name} (${a.pos} ${a.ovr})`;
  const players=[...give,...get].filter(a=>a.kind!=='pick').sort((a,b)=>(b.ovr||0)-(a.ovr||0));
  const big=players[0] && players[0].ovr>=82;   // a star changed teams → headline news
  addNews('TRADE',`${big?'🔁 BLOCKBUSTER — ':'Trade: '}${t.city} send ${give.map(nm).join(', ')} to ${o.city} for ${get.map(nm).join(', ')}.`);
  G._recentTrade={season:G.season,week:G.week,from:t.abbr,to:o.abbr,give:give.map(nm),get:get.map(nm),star:players[0]?players[0].name:null,big};
  if(window.VOICES){ VOICES.feedTrade(give,get,t,o);
    if(big) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚨 BLOCKBUSTER: the ${t.city} ${t.nick} are trading ${give.filter(a=>a.kind!=='pick').map(a=>a.name).join(' & ')||'a package'} to ${o.city}. A franchise-altering move.`,'TRADE',true); }
  toast('Trade complete!'); save(); render();
}
// an offer is only valid while every asset it names still sits on the expected team
function offerValid(o){ const t=ut(), other=team(o.other); if(!t||!other) return false;
  const has=(a,tm)=> a.kind==='pick' ? (tm.picks||[]).some(pk=>pk.round===a.round&&pk.year===a.year&&pk.from===a.from)
                                     : tm.roster.some(p=>p.id===a.id);
  return o.give.every(a=>has(a,t)) && o.get.every(a=>has(a,other)); }
// drop any outstanding offer that references a player/pick that has since moved (traded, cut, signed away)
function pruneOffers(){ if(G._offers) G._offers=G._offers.filter(offerValid); }
// AI teams pitch the user weighted offers (need-fit × fair value)
function generateOffers(){
  const t=ut(); const offers=[]; const myNd=ENG.needs(t);
  const myNeeds=Object.keys(myNd).sort((a,b)=>myNd[b]-myNd[a]).slice(0,4);
  ENG.pick; const pool=G.teams.filter(x=>x.abbr!==USER);
  for(let i=0;i<28 && offers.length<4;i++){ const o=pool[Math.floor(ENG.rng()*pool.length)];
    const oNd=ENG.needs(o); const oWants=Object.keys(oNd).sort((a,b)=>oNd[b]-oNd[a]).slice(0,4);
    // they want one of our movable players at a position of their need; we get one at a position of ours
    const youGive=t.roster.filter(p=>oWants.includes(p.pos)&&canSparePlayer(t,p)&&!franchiseProtected(t,p)).sort((a,b)=>b.ovr-a.ovr)[ENG.ri(0,2)];
    const theyGive=o.roster.filter(p=>myNeeds.includes(p.pos) && !p.starter&&canSparePlayer(o,p)&&!franchiseProtected(o,p)).sort((a,b)=>b.ovr-a.ovr)[0]
                 || o.roster.filter(p=>myNeeds.includes(p.pos)&&canSparePlayer(o,p)&&!franchiseProtected(o,p)).sort((a,b)=>b.ovr-a.ovr)[1];
    if(!youGive||!theyGive) continue;
    let give=[youGive], get=[theyGive];
    let ev=evalTradeNN(give,get,o);
    // close the gap with the single pick whose value best matches it (AI sweetens its own offers to ~fair)
    if(ev.margin>6){ const pk=teamPicks(o).map(p=>({p,d:Math.abs(pickVal(p)-ev.margin)})).sort((a,b)=>a.d-b.d)[0]; if(pk)get.push(Object.assign({kind:'pick'},pk.p)); }
    else if(ev.margin<-6){ const pk=teamPicks(t).map(p=>({p,d:Math.abs(pickVal(p)+ev.margin)})).sort((a,b)=>a.d-b.d)[0]; if(pk)give.push(Object.assign({kind:'pick'},pk.p)); }
    ev=evalTradeNN(give,get,o);
    // only pitch the user offers that are fair or in the user's favor (not a gouge)
    if(ev.margin<=7 && ev.margin>=-24 && !offers.some(x=>x.other===o.abbr)){ offers.push({other:o.abbr, give, get, ev, weight:needFit(t,get)-Math.max(0,ev.margin)}); }
  }
  return offers.sort((a,b)=>b.weight-a.weight);
}
function pickClone(pk){ return Object.assign({kind:'pick'},pk); }
function assetKey(a){ return a.kind==='pick'?`pick-${a.year}-${a.round}-${a.from}`:`player-${a.id}`; }
function uniqAssets(arr){ const seen=new Set(); return arr.filter(a=>{ const k=assetKey(a); if(seen.has(k)) return false; seen.add(k); return true; }); }
function shopInterest(o,p){
  const posGroup=o.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr);
  const best=posGroup[0], second=posGroup[1];
  const starterUpgrade=Math.max(0,(p.ovr||50)-((best&&best.ovr)||50));
  const depthUpgrade=Math.max(0,(p.ovr||50)-((second&&second.ovr)||48)-4);
  const need=(ENG.needs(o)[p.pos]||0);
  const contender=(o.wins||0)>=(o.losses||0)?4:0;
  const cheap=(p.years||1)>=2 && (p.salary||0)<Math.max(3,(p.ovr||60)*0.12)?3:0;
  const drama=(p.flags&&(p.flags.wantsOut||p.flags.onBlock))?5:0;
  return need*0.32 + starterUpgrade*3.1 + depthUpgrade*1.4 + contender + cheap + drama;
}
function shopReturnEligible(buyer,q,incoming,sellerNeeds){
  if(!buyer||!q||q.kind==='pick') return true;
  const unsettled=q.flags&&(q.flags.wantsOut||q.flags.onBlock), rank=rosterRank(buyer,q), buyerNeeds=ENG.needs(buyer);
  const premiumPos=['QB','RB','WR','TE','DE','CB'].includes(q.pos), skill=['QB','RB','WR','TE'].includes(q.pos);
  if(franchiseProtected(buyer,q) && !unsettled) return false;
  if(q.pos==='QB' && rank<=2 && !unsettled) return false;
  if(skill && rank<=2 && (q.ovr||0)>=76 && !unsettled) return false;
  if(premiumPos && rank<=1 && (q.ovr||0)>=(incoming.ovr||0)-1 && !unsettled) return false;
  if((q.ovr||0)>(incoming.ovr||0)+1 && !unsettled) return false;
  if((buyerNeeds[q.pos]||0)>30 && (q.ovr||0)>=72 && !unsettled) return false;
  if(!sellerNeeds.includes(q.pos) && (q.ovr||0)>=72 && !unsettled) return false;
  return true;
}
function closeShopPackage(give,get,o,limitMargin){
  let ev=evalTradeNN(give,get,o), out=get.slice();
  if(ev.margin>8){
    const used=new Set(out.filter(a=>a.kind==='pick').map(assetKey));
    const pk=teamPicks(o).map(pickClone).filter(p=>!used.has(assetKey(p)))
      .map(p=>({p,d:Math.abs(pickVal(p)-ev.margin)})).sort((a,b)=>a.d-b.d)[0];
    if(pk) out.push(pk.p);
  }
  out=uniqAssets(out); ev=evalTradeNN(give,out,o);
  if(!ev.accept || ev.margin>limitMargin || ev.margin<-3) return null;
  return {get:out,ev};
}
function generateShopOffers(p){
  const seller=ut(); if(!seller||!p||legalAfterSending(seller,[p])) return [];
  const sellerNd=ENG.needs(seller);
  const sellerNeeds=Object.keys(sellerNd).sort((a,b)=>sellerNd[b]-sellerNd[a]).slice(0,6);
  const give=[p], seen=new Set(), offers=[];
  G.teams.filter(o=>o.abbr!==USER).forEach(ensurePicks);
  const buyers=G.teams.filter(o=>o.abbr!==USER).map(o=>({o,interest:shopInterest(o,p)}))
    .filter(x=>x.interest>=8).sort((a,b)=>b.interest-a.interest).slice(0,14);
  buyers.forEach(({o,interest})=>{
    const playerGets=o.roster.filter(q=>canSparePlayer(o,q)&&!franchiseProtected(o,q)&&q.id!==p.id)
      .filter(q=>shopReturnEligible(o,q,p,sellerNeeds))
      .map(q=>({q,score:(sellerNeeds.includes(q.pos)?22:0)+needFit(seller,[q])*0.9+tradeValue(q)*0.22-(ENG.needs(o)[q.pos]||0)*0.18}))
      .sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.q);
    const tries=[];
    playerGets.forEach(q=>tries.push([q]));
    const picks=teamPicks(o).map(pickClone).sort((a,b)=>pickVal(b)-pickVal(a));
    let pickPkg=[], val=0, target=Math.max(8,tradeValue(p)*0.72);
    for(const pk of picks){
      const pv=pickVal(pk);
      if(pickPkg.length<3 && (val<target || (pickPkg.length===0 && pv<tradeValue(p)+18))){ pickPkg.push(pk); val+=pv; }
      if(val>=target) break;
    }
    if(pickPkg.length) tries.push(pickPkg);
    tries.forEach(pkg=>{
      if(legalAfterSending(o,pkg)) return;
      const closed=closeShopPackage(give,pkg,o,28);
      if(!closed) return;
      const sig=o.abbr+'|'+closed.get.map(assetKey).sort().join(',');
      if(seen.has(sig)) return; seen.add(sig);
      offers.push({other:o.abbr,give,get:closed.get,ev:closed.ev,weight:interest+needFit(seller,closed.get)-Math.max(0,closed.ev.margin),shopFor:p.id});
    });
  });
  return offers.sort((a,b)=>b.weight-a.weight).slice(0,6);
}
// Claude plays the opposing GM (optional; falls back to the NN verdict)
async function claudeGM(give,get,otherAbbr,onDone){
  const o=team(otherAbbr); const nn=evalTradeNN(give,get,o);
  if(!AI.ready()){ onDone(nn, null); return; }
  const nm=a=>a.kind==='pick'?`a ${a.year} round-${a.round} pick`:`${a.name} (${a.pos}, ${a.ovr} OVR, age ${a.age})`;
  try{
    const sys=`You are the GM of the ${o.city} ${o.nick} in a fictional pro-football league. A rival GM proposes a trade. Judge it for YOUR team's benefit (value + roster needs). Reply with a JSON object: {"verdict":"ACCEPT"|"REJECT"|"COUNTER","reason":"one sentence","counter":"if COUNTER, what you'd want instead, one sentence"}.`;
    const usr=`Your needs: ${Object.keys(ENG.needs(o)).sort((a,b)=>ENG.needs(o)[b]-ENG.needs(o)[a]).slice(0,3).join(', ')}. `
      +`You would RECEIVE: ${give.map(nm).join(', ')}. You would GIVE UP: ${get.map(nm).join(', ')}. `
      +`(A neutral model rates this ${nn.margin>=0?'+':''}${nn.margin} in your favor.) Respond as the GM.`;
    const txt=await AI.call(sys,usr,300); const j=AI.gazette? null:null;
    let obj; try{ obj=JSON.parse((txt.match(/\{[\s\S]*\}/)||[txt])[0]); }catch(e){ obj={verdict: nn.accept?'ACCEPT':'REJECT', reason:txt.slice(0,120)}; }
    onDone(nn, obj);
  }catch(e){ onDone(nn, null); }
}
function runDraft(){
  // 7 rounds, reverse-standings order; the OWNER of each slot's pick selects (picks are tradeable)
  if(!G.prospects.length){ toast('No prospects left.'); return; }
  G.teams.forEach(t=>ensurePicks(t));
  const draftYear=G.season+1;
  const slots=standings().slice().reverse(); let made=0;
  for(let round=1;round<=7;round++){
    slots.forEach(slot=>{ if(!G.prospects.length)return;
      const owner=G.teams.find(tm=>(tm.picks||[]).some(pk=>pk.year===draftYear&&pk.round===round&&pk.from===slot.abbr))||slot;
      owner.picks=(owner.picks||[]).filter(pk=>!(pk.year===draftYear&&pk.round===round&&pk.from===slot.abbr));
      let prospect;
      if(owner.abbr===USER) prospect=scoutedProspects(owner,1)[0]||G.prospects[0];
      else { const nd=ENG.needs(owner); prospect=G.prospects.slice(0,8).sort((a,b)=>(b.grade+(nd[b.pos]||0)*0.3)-(a.grade+(nd[a.pos]||0)*0.3))[0]; }
      const i=G.prospects.indexOf(prospect); G.prospects.splice(i,1);
      const ovr=rookieOverall(prospect);
      const np={id:prospect.id,first:prospect.first,last:prospect.last,name:prospect.name,pos:prospect.pos,age:prospect.age,ovr,num:jerseyNumber(owner,prospect.pos),attrs:Object.assign({},prospect.attrs,{OVR:ovr}),starter:false,depth:9,morale:70,salary:ENG.round1(Math.max(0.9,(8-prospect.projRound))*1.4),years:4,rookie:true,pot:ENG.clamp(ovr+ENG.ri(2,14),50,99),seasons:0,peak:ovr,
        ht:prospect.ht,wt:prospect.wt,t40:prospect.t40,TP:prospect.TP,TA:prospect.TA,home:prospect.home,college:prospect.college||prospect.school};
      if(window.PHYS) PHYS.backfill(np);   // carry the scouted combine numbers; backfill is idempotent (fills only what's missing)
      owner.roster.push(np);
      if(owner.abbr===USER) addNews('DRAFT',`R${round}: ${owner.city} draft ${prospect.name} (${prospect.pos}, ${prospect.school})${owner!==slot?` — via ${slot.abbr}`:''}.`);
      made++;
    });
  }
  G.teams.forEach(t=>{ t.picks=(t.picks||[]).filter(pk=>pk.year>draftYear); ensurePicks(t); });   // preserve traded future picks, add the next outer year
  addNews('DRAFT',`The ${G.season} draft is complete — ${made} selections.`); toast('Draft complete!'); save(); render();
}
function scoutWeekKey(){ return `${G.season}_${G.week}_${G.phase||'regular'}`; }
// scoutRating now derives from the scouting DEPARTMENT tier so legacy callers (scoutPointMax, finance, autoStaff) keep a sane 0-99 number.
function scoutRating(t){ if(!t) return 55; ENG.ensureStaff(t); if(!t.staff.scout)t.staff.scout={name:ENG.coachName(),ovr:68}; return ENG.clamp(45 + scoutTier(t)*10, 45, 95); }
function scoutPointMax(t){ const r=scoutRating(t); return ENG.clamp(6+Math.floor((r-55)/5),6,15); }
function ensureScouting(t){
  if(!t) return null; ENG.ensureStaff(t); if(!t.staff.scout)t.staff.scout={name:ENG.coachName(),ovr:68};
  t.scouting=t.scouting||{};
  const key=scoutWeekKey();
  if(t.scouting.weekKey!==key){ t.scouting.weekKey=key; t.scouting.pointsLeft=scoutPointMax(t); t.scouting.focus=t.scouting.focus||'ALL'; }
  if(t.scouting.pointsLeft==null) t.scouting.pointsLeft=scoutPointMax(t);
  return t.scouting;
}
/* ============================================================
   SCOUTING DEPARTMENT — staff-driven, per-team prospect views
   ============================================================ */
let _scoutIdSeq=1;
function newScoutId(){ return _scoutIdSeq++; }
const SCOUT_TIERS=[null,
  {tier:1,title:'Area Scout (intern)',salary:1.5,sigma:10,bustUnlock:4,bustConf:0.30},
  {tier:2,title:'Area Scout',salary:3,sigma:7,bustUnlock:3,bustConf:0.22},
  {tier:3,title:'Regional Scout',salary:5,sigma:5,bustUnlock:2,bustConf:0.15},
  {tier:4,title:'National Scout',salary:8,sigma:3,bustUnlock:2,bustConf:0.09},
  {tier:5,title:'Dir. of College Scouting',salary:13,sigma:2,bustUnlock:1,bustConf:0.05}];
const SCOUT_SALARY=[0,1.5,3,5,8,13];
const BUST_UNLOCK=[0,4,3,2,2,1], BUST_CONF=[0,.30,.22,.15,.09,.05], TIER_SIGMA=[0,10,7,5,3,2];
const SCOUT_SPECIALTIES=['ALL','OFF','DEF','BIGBOARD','CHARACTER','TRENCHES','SKILL'];
const SCOUT_SPEC_LBL={ALL:'All prospects',OFF:'Offense',DEF:'Defense',BIGBOARD:'Top of the board',CHARACTER:'Character & makeup',TRENCHES:'The trenches (OL/DL)',SKILL:'Skill positions'};
const OFF_POS=new Set(['QB','RB','FB','WR','TE','T','G','C','OL']), DEF_POS=new Set(['DE','DT','DL','OLB','ILB','LB','MLB','CB','S','FS','SS']);
const TRENCH_POS=new Set(['T','G','C','OL','DE','DT','DL']), SKILL_POS=new Set(['QB','WR','RB','TE']);
function specialtyCovers(spec,p){ if(!p) return false; const pos=p.pos;
  switch(spec){ case 'ALL': return true; case 'OFF': return OFF_POS.has(pos); case 'DEF': return DEF_POS.has(pos);
    case 'TRENCHES': return TRENCH_POS.has(pos); case 'SKILL': return SKILL_POS.has(pos); case 'CHARACTER': return true;
    case 'BIGBOARD': { const top=(G.prospects||[]).slice().sort((a,b)=>(b.grade||0)-(a.grade||0)).slice(0,32); return top.indexOf(p)>=0; }
    default: return false; } }
function ensureScoutDept(t){ if(!t) return null;
  if(!t.scoutDept){ ENG.ensureStaff(t); const ovr=(t.staff&&t.staff.scout&&t.staff.scout.ovr)||68;
    const tier=ovr>=90?5:ovr>=82?4:ovr>=74?3:ovr>=64?2:1;
    t.scoutDept={budgetCap:0,spent:0,focus:'ALL',scouts:[{id:newScoutId(),name:(t.staff&&t.staff.scout?t.staff.scout.name:ENG.coachName()),salary:SCOUT_SALARY[tier],tier,specialty:'ALL',region:'National'}]}; }
  if(!t.scoutDept.scouts) t.scoutDept.scouts=[];
  if(!t.scoutDept.focus) t.scoutDept.focus='ALL';
  recomputeStaffBudget(t); t.scoutDept.spent=ENG.round1((t.scoutDept.scouts||[]).reduce((a,s)=>a+(s.salary||0),0)); return t.scoutDept; }
function scoutTier(t){ const d=ensureScoutDept(t),s=d.scouts||[]; if(!s.length) return 1;
  const best=Math.max(...s.map(x=>x.tier||1)), avg=s.reduce((a,x)=>a+(x.tier||1),0)/s.length; return ENG.clamp(best*0.6+avg*0.4,1,5); }
function deptTierFor(t,p){ const d=ensureScoutDept(t), base=scoutTier(t);
  const m=(d.scouts||[]).some(s=>specialtyCovers(s.specialty,p)); return ENG.clamp(base+(m?1:0),1,5); }
/* ---- staff budget: market + profit + cash → an authorized $M/yr cap ---- */
function recomputeStaffBudget(t){ if(!t) return 0; const mkt=ENG.clamp(((t.market||55)-40)/45,0,1);
  let profitYr=0; try{ const fin=ENG.weeklyFinance(t,true); profitYr=(fin.profit||0)*17; }catch(e){}
  const cash=ENG.clamp((t.cash||0)/120,0,1);
  const cap=12 + mkt*22 + ENG.clamp(profitYr*0.18,0,14) + cash*8;
  t.staffBudget=ENG.round1(ENG.clamp(cap,12,55)); if(t.scoutDept)t.scoutDept.budgetCap=t.staffBudget; return t.staffBudget; }
/* ---- AI fills its department up to ~70-90% of cap, best tier affordable, top-down ---- */
function autoStaffBudget(t){ const d=ensureScoutDept(t); recomputeStaffBudget(t);
  const target=t.staffBudget*(0.70+ENG.rng()*0.20);
  let guard=0;
  while((d.scouts.length<4) && guard++<12){
    const spent=d.scouts.reduce((a,s)=>a+(s.salary||0),0), room=t.staffBudget-spent;
    let tier=0; for(let k=5;k>=1;k--){ if(SCOUT_SALARY[k]<=room){ tier=k; break; } }
    if(!tier) break;
    if(spent>=target && d.scouts.length>=1) break;
    const specs=['ALL','OFF','DEF','TRENCHES']; const spec=specs[d.scouts.length%specs.length];
    d.scouts.push({id:newScoutId(),name:ENG.coachName(),salary:SCOUT_SALARY[tier],tier,specialty:spec,region:'National'});
  }
  d.spent=ENG.round1(d.scouts.reduce((a,s)=>a+(s.salary||0),0)); return d; }
/* ---- per-team prospect view (replaces global p.scouted) ---- */
function viewOf(p,t){ if(!p||!t) return {lvl:0,err:null,seenWk:0}; p.view=p.view||{}; return p.view[t.abbr]||(p.view[t.abbr]={lvl:0,err:null,seenWk:G.week}); }
function viewLvl(p,t){ return viewOf(p,t).lvl||0; }
function revealOne(t,p){ const v=viewOf(p,t);
  if(v.err==null){ const tier=Math.round(deptTierFor(t,p)); const sigma=TIER_SIGMA[tier]||5;
    v.err=(scoutNoise(p,31+(t.abbr?t.abbr.length:0))*2-1)*sigma; }
  v.lvl=Math.min(5,(v.lvl||0)+1); v.seenWk=G.week;
  if((v.lvl||0)>(p.scouted||0)) p.scouted=v.lvl;   // keep legacy derived max-lvl alive
}
function boardPriority(p,t,nd){ return (p.grade||60) + ((nd[p.pos]||0)*0.05) - (((p.projRound||4)>=5)?1.2:0) + (deptTierFor(t,p)>scoutTier(t)?0.8:0); }
function scoutingOpen(){ return G.phase!=='draft'; }
function autoScoutWeek(t){ const d=ensureScoutDept(t); if(!(d.scouts||[]).length) return;
  const nd=ENG.needs(t)||{}; let looks=d.scouts.reduce((a,s)=>a+(2+(s.tier||1)),0);
  const focus=d.focus||'ALL';
  const board=(G.prospects||[]).map(p=>({p,s:boardPriority(p,t,nd)+(focus!=='ALL'&&specialtyMatchesFocus(focus,p)?6:0)})).sort((a,b)=>b.s-a.s);
  for(const {p} of board){ if(looks<=0)break; let g=0; while(looks>0&&viewLvl(p,t)<4&&g++<3){ revealOne(t,p); looks--; } }
  for(const {p} of board){ if(looks<=0)break; if(viewLvl(p,t)>=1)continue; revealOne(t,p); looks--; } }
function specialtyMatchesFocus(focus,p){ return specialtyCovers(focus,p); }
function scoutNoise(p,salt){ const x=Math.sin(((p&&p.id)||1)*12.9898 + salt*78.233)*43758.5453; return x-Math.floor(x); }
function scoutCost(p){
  const r=p.projRound||prospectRoundFromGrade(p.grade||60), lvl=p.scouted||0;
  return Math.max(1,(r<=2?2:1)+(lvl>=3?1:0));
}
function scoutSpread(level, rating){
  const l=ENG.clamp(level||0,0,5), base=[15,12,9,6,4,1][l];
  return ENG.clamp(Math.round(base-(rating-68)*0.08), l>=5?0:2, 16);
}
function scoutEstimate(p,t){
  t=t||ut(); const v=viewOf(p,t), lvl=ENG.clamp(v.lvl||0,0,5), tier=Math.round(deptTierFor(t,p));
  if(lvl<=0){ const pub=12-tier;
    const lo=ENG.clamp((p.grade||60)-pub,40,ROOKIE_MAX_OVR), hi=ENG.clamp((p.grade||60)+pub,40,ROOKIE_MAX_OVR);
    return {lvl,level:lvl,tier,est:p.grade,lo,hi,range:pub,conf:'Public',score:(lo+hi)/2}; }
  const shrink=[1,1,.7,.5,.3,0][lvl]; const err=Math.round((v.err||0)*shrink);
  const est=ENG.clamp((p.grade||60)+(lvl>=5?0:err),40,ROOKIE_MAX_OVR); const sigma=TIER_SIGMA[tier]||5;
  const range=lvl>=5?1:ENG.clamp(Math.round(sigma*shrink)+1,2,16);
  const lo=ENG.clamp(est-range,40,ROOKIE_MAX_OVR), hi=ENG.clamp(est+range,40,ROOKIE_MAX_OVR);
  const conf=['Public','Thin','Area','Position','Cross-check','Board lock'][lvl]||'Public';
  return {lvl,level:lvl,tier,est,lo,hi,range,conf,score:lvl>=5?(p.grade||est):est};
}
// Bust read — unlocks at a tier-dependent look level, with a confidence band; a strong dept surfaces gems/red flags.
function bustRead(p,t){ const v=viewOf(p,t), tier=Math.round(deptTierFor(t,p)); if((v.lvl||0)<BUST_UNLOCK[tier]) return null;
  const conf=BUST_CONF[tier]; const shown=ENG.clamp((p.bustRisk||0.4)+(scoutNoise(p,55)*2-1)*conf,0.02,0.95);
  const pct=Math.round(shown*100), band=Math.round(conf*100); const label=shown>=0.55?'HIGH':shown>=0.38?'Moderate':'Low';
  return {pct,band,label,sure:tier>=4}; }
function scoutGradeHTML(p,t,compact){
  const s=scoutEstimate(p,t);
  if(s.level<=0) return compact?`<span class="muted">${s.lo}-${s.hi}</span>`:`<span class="muted">Public ${s.lo}-${s.hi}</span>`;
  if(s.level>=5) return `${ovrBadge(p.grade)} <span class="good" style="font-size:10px">LOCK</span>`;
  if(s.level<3) return `<span class="muted">${s.conf} ${s.lo}-${s.hi}</span>`;
  return `${ovrBadge(s.est)} <span class="muted" style="font-size:10px">${s.lo}-${s.hi}</span>`;
}
function scoutBoardScore(p,t){ const s=scoutEstimate(p,t); return s.score + ((p.college&&p.college.stock)||0)*0.25 + (s.level>=3?1.2:0); }
function scoutedProspects(t, limit){ return (G.prospects||[]).slice().sort((a,b)=>scoutBoardScore(b,t)-scoutBoardScore(a,t)).slice(0,limit||G.prospects.length); }
function scoutTraitLabel(v){ return v>=82?'excellent':v>=72?'strong':v>=60?'solid':v>=48?'uneven':'red flag'; }
// effective-tier × look-level unlock thresholds (lower lvl needed as the dept gets better)
function colorUnlock(kind,tier){
  if(kind==='archetype') return tier>=4?2:tier===3?3:tier===2?4:5;
  if(kind==='makeup')    return tier>=4?2:tier===3?3:tier===2?4:5;
  if(kind==='scheme')    return tier>=4?1:tier===3?2:tier===2?2:3;
  return 5;
}
function scoutNotesFor(p,t){
  const s=scoutEstimate(p,t), c=p.college||{}, out=[], tier=s.tier||1, lvl=s.lvl||0;
  if(lvl<=0) return [`Public buzz only: ${p.pos} from ${p.school}, projected R${p.projRound}. Your department will work the board automatically each week.`];
  out.push(`${s.conf} look: grade band ${s.lo}-${s.hi}, working estimate ${s.est}.`);
  if(lvl>=colorUnlock('scheme',tier)){ const fits=['wins with tempo','needs clean coaching','traits pop on tape','production matches the tools','scheme fit needs checking','senior-bowl type mover'];
    const fit=fits[Math.floor(scoutNoise(p,44+lvl)*fits.length)]||fits[0]; out.push(`${p.pos} report: ${fit}; ${c.hook||c.archLabel||'college profile'} — stock ${c.stock>0?'up '+c.stock:c.stock<0?'down '+Math.abs(c.stock):'steady'}.`); }
  const br=bustRead(p,t);
  if(lvl>=colorUnlock('makeup',tier)) out.push(`Makeup: work ethic ${scoutTraitLabel(p.workEthic||60)}, temperament ${scoutTraitLabel(p.temperament||60)}${br?`, bust risk ${br.pct}% ±${br.band}% (${br.label})`:''}.`);
  if(lvl>=colorUnlock('archetype',tier)) out.push(`Archetype: ${(ARCHE_LBL[p.archetype]||p.archetype||'solid')} profile${p.gem&&tier>=4?' — GEM ALERT: tools point above the public grade.':''}.`);
  if(lvl>=5) out.push(`Final cross-check: board grade ${p.grade}/${ROOKIE_MAX_OVR}, ${(ARCHE_LBL[p.archetype]||p.archetype||'solid')} profile.`);
  return out;
}
function applyScoutLook(t,p){
  const dept=ensureScouting(t); if(!p) return {ok:false,reason:'No prospect selected.'};
  const cost=scoutCost(p);
  if((dept.pointsLeft||0)<cost) return {ok:false,reason:`Not enough scouting points (${cost} needed).`,cost};
  if((p.scouted||0)>=5) return {ok:false,reason:`${p.name} already has a final cross-check.`,cost};
  dept.pointsLeft-=cost; p.scouted=Math.min(5,(p.scouted||0)+1);
  p.reports = p.reports || [];
  const fresh=scoutNotesFor(p,t).slice(-1)[0];
  if(fresh && !p.reports.includes(fresh)) p.reports.push(fresh);
  return {ok:true,cost,dept,conf:scoutEstimate(p,t).conf};
}
function scout(pid){
  const t=ut(), p=G.prospects.find(x=>x.id===pid); if(!p)return;
  const res=applyScoutLook(t,p);
  if(!res.ok){ toast(res.reason); return; }
  addNewsIf(p.scouted>=4,'SCOUTING',`${t.city}'s staff cross-check ${p.name} (${p.pos}, ${p.school}). Board confidence is now ${scoutEstimate(p,t).conf.toLowerCase()}.`);
  toast(`Scouted ${p.name}: ${res.conf} report. ${res.dept.pointsLeft} pts left.`);
  save(); render();
}
window.showProspect=(id)=>{ const p=(G.prospects||[]).find(x=>x.id===id); if(!p)return; const t=ut(); ensureScouting(t); ensureCollegeProfile(p,(G.prospects||[]).indexOf(p));
  const c=p.college||{}, headlines=(c.headlines||[]).slice(0,6);
  const s=scoutEstimate(p,t), notes=scoutNotesFor(p,t), reports=(p.reports||[]).slice(-5);
  closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=e=>{if(e.target.id==='ovl')closeOvl();};
  o.innerHTML=`<div class="pc" style="width:620px"><div class="pchd"><div><div class="big">${p.name}</div><div class="muted">${c.year||''} ${p.pos} · ${p.school} · projected R${p.projRound}</div></div><span class="x" onclick="closeOvl()">✕</span></div>
    <div class="pcbody"><div class="cards" style="grid-template-columns:repeat(3,minmax(120px,1fr));margin-bottom:12px">
      <div class="card"><h3>Scout Grade</h3><div class="stat">${s.level>=5?p.grade:(s.level>=3?s.est:`${s.lo}-${s.hi}`)}</div><div class="muted">${s.level>=5?'final grade':`${s.lo}-${s.hi} range`} · ${s.conf}</div></div>
      <div class="card"><h3>Stock</h3><div class="stat ${c.stock>0?'good':c.stock<0?'bad':''}">${c.stock>0?'+':''}${c.stock||0}</div><div class="muted">${c.archLabel||'prospect'}</div></div>
      <div class="card"><h3>Heisman</h3><div class="stat">${collegeHeismanScore(p)}</div><div class="muted">${collegeStatLine(p)}</div></div></div>
      <div class="grphd">Scouting Story</div><p style="line-height:1.55">${p.name} is ${c.hook||'one of the draft-class names scouts are tracking'} at ${p.school}. Your department has a <b>${s.conf.toLowerCase()}</b> view: ${s.level>=5?`final board grade ${p.grade}/84`:`estimated ${s.est} with a ${s.lo}-${s.hi} band`}, projected Round ${p.projRound}.</p>
      <div class="grphd">Scout File</div>${notes.map(x=>`<div class="news">${esc(x)}</div>`).join('')}
      <div class="grphd">Notebook</div>${(reports.length||headlines.length)?[...reports,...headlines].slice(-7).map(x=>`<div class="news">${esc(x)}</div>`).join(''):'<p class="muted">No reports yet.</p>'}</div></div>`;
  document.body.appendChild(o);
};

/* ---------- franchise actions ---------- */
function setTicket(v){ ut().stadium.ticket=+v; render(); }
function buildStadium(kind){ const t=ut(); ensureStadium(t); const cost=kind==='upgrade'?45:120;
  if(t.cash<cost){ toast('Not enough cash.'); return; } t.cash=ENG.round1(t.cash-cost);
  if(kind==='upgrade'){ t.stadium.quality=ENG.clamp(t.stadium.quality+15,0,99); addNews('STADIUM',`${t.city} upgrade their stadium (+quality).`); }
  else { t.stadium.cap+=8000; t.stadium.quality=ENG.clamp(t.stadium.quality+25,0,99); t.stadium.built=G.season;
    t.stadium.upgrades={suites:0,clubs:0,videoboard:0,roofLevel:roofToLevel(t.stadium.roof),turf:0,training:0};   // a new build wipes amenities
    if(t.finance&&t.finance.deals) t.finance.deals=t.finance.deals.filter(d=>d.type!=='naming'&&d.type!=='concourse');   // location-bound deals don't survive a rebuild
    addNews('STADIUM',`${t.city} break ground on a new ${t.stadium.cap.toLocaleString()}-seat stadium!`); }
  toast('Done.'); save(); render();
}
function hireCoach(){ const t=ut();
  const tiers=[ {lbl:'Budget hire',cost:8,lo:66,hi:76,blurb:'Cheap, but limited command of the locker room.'},
    {lbl:'Proven coach',cost:26,lo:78,hi:85,blurb:'Respected; steadies the room and develops talent.'},
    {lbl:'Elite, title pedigree',cost:52,lo:87,hi:94,blurb:'A culture-setter — keeps the locker room in line, big development + close-game edge.'} ];
  const ex=(G.exCoaches&&G.exCoaches[0]);
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl') closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:560px;width:92%';
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Hire a Head Coach</h2><button class="btn sec" id="hcx">✕</button></div>
   <p class="muted" style="font-size:12px">Better coaches cost more — and a strong staff keeps the locker room in check, develops players, and wins the close ones. Cash: ${money(t.cash)}.</p><div id="hclist"></div>`;
  const list=box.querySelector('#hclist');
  // poach a hot college coach (downside-skewed translation — a real gamble, like the NFL)
  const col=(G.collegeHot&&G.collegeHot[0]);
  if(col){ const nf=ENG.clamp(col.ovr+ENG.ri(-9,4),58,93); const row=el('div','card'); row.style.cssText='margin-top:8px;background:#161226;border:1px solid #4a3a7a;display:flex;justify-content:space-between;align-items:center;gap:10px';
    row.innerHTML=`<div><b>${col.name}</b> <span class="tag" style="background:#3a2d63">🎓 college</span><div class="muted" style="font-size:11px">~${nf} OVR · ${col.why} at ${col.school}. College success doesn't always translate — high upside, real bust risk.</div></div><button class="btn" data-c="40" data-o="${nf}" data-n="${col.name}" data-col="${col.school}">$40M</button>`;
    list.appendChild(row); }
  tiers.forEach((ti,i)=>{ const ovr=ENG.ri(ti.lo,ti.hi), exHire=(i===2&&ex&&!col), name=exHire?ex.name:ENG.coachName();
    const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px';
    row.innerHTML=`<div><b>${name}</b> <span class="tag">${ti.lbl}</span>${exHire?` <span class="acc" style="font-size:10px">former ${ex.pos}</span>`:''}<div class="muted" style="font-size:11px">~${ovr} OVR · ${ti.blurb}</div></div><button class="btn" data-c="${ti.cost}" data-o="${ovr}" data-n="${name}" data-ex="${exHire?1:0}">$${ti.cost}M</button>`;
    list.appendChild(row); });
  ov.appendChild(box); document.body.appendChild(ov);
  box.querySelector('#hcx').onclick=closeOvl;
  list.querySelectorAll('button[data-c]').forEach(b=>b.onclick=()=>{ const cost=+b.dataset.c; if(t.cash<cost){ toast('Not enough cash for that hire.'); return; }
    t.cash=ENG.round1(t.cash-cost); const ovr=+b.dataset.o;
    if(b.dataset.col){ if(G.collegeHot&&G.collegeHot.length)G.collegeHot.shift(); }
    else if(b.dataset.ex==='1'&&G.exCoaches&&G.exCoaches.length)G.exCoaches.shift();
    t.coach={name:b.dataset.n,ovr,off:ENG.clamp(ovr+ENG.ri(-5,5),55,95),def:ENG.clamp(ovr+ENG.ri(-5,5),55,95),fromCollege:b.dataset.col||undefined};
    ensureTeamPlaybook(t,true);
    addNews('STAFF',`${t.city} hire head coach ${t.coach.name}${b.dataset.col?` away from ${b.dataset.col}`:''} (${t.coach.ovr} OVR) on a $${cost}M deal.`); closeOvl(); toast('Coach hired!'); save(); render(); });
}

/* ---------- RENDER ---------- */
const NAV=[['week','🏈','This Week'],['dash','📊','Dashboard'],['roster','📋','Roster'],['depth','🪜','Depth Chart'],['medical','🩺','Medical'],['justcoach','🧑‍🏫','Just Coach'],['SEP','','GM OFFICE'],
  ['trade','🔁','Trades'],['fa','✍️','Free Agency'],['draft','🎓','Draft'],['scout','🔍','Scouting'],
  ['SEP2','','FRANCHISE'],['franchise','🏛️','Franchise'],['finance','💰','Finances'],['stadium','🏟️','Stadium'],['staff','👔','Staff'],['owner','🎩','Owner'],
  ['SEP3','','LEAGUE'],['scores','🏟️','Game Center'],['standings','🏆','Standings'],['schedule','🗓️','Schedule'],['league','🌐','Teams'],['ops','🌍','League Ops'],
  ['players','🧑‍🤝‍🧑','Players'],['leaders','📈','Leaders'],['college','🎓','College'],['odds','🎰','Odds'],['history','📜','History'],['wire','📡','The Wire'],['feed','🐦','The Feed'],['storylines','🎭','Storylines'],['simlab','🧪','Sim Lab'],['rules','⚖️','Rules'],['gazette','📰','Gazette'],['settings','⚙️','Settings']];

function boot(){
  try{ if(G&&G.teams) G.teams.forEach(t=>{ ensureStadium(t); ensureFinance(t); }); }catch(e){}   // lazy-migrate old saves into the front-office economy
  if(G){ G._gazBusy=false; G._gazErr=null; if(window._gazTick){clearInterval(window._gazTick);window._gazTick=null;} }   // transient write-state must never survive a reload (else the Write button stays stuck on "Cancel")
  document.body.innerHTML=`<div id="top"></div><div id="side"><div class="nav" id="nav"></div></div><div id="main"></div>`;
  render();
}
function render(){
  if(window._cgPlayClockTimer){ clearInterval(window._cgPlayClockTimer); window._cgPlayClockTimer=null; }
  if(window._draftClockTimer){ clearInterval(window._draftClockTimer); window._draftClockTimer=null; }
  if(!G){ setupScreen(); return; }
  normalizeProspectBoard();
  if(G.teams) G.teams.forEach(t=>ensureTeamPlaybook(t));
  if(window.ncaaInit) ncaaInit(false);
  const t=ut(); ensureWeekState();
  if(!DRAFT && G.draft && G.draft.active){ DRAFT=G.draft; if(!DRAFT.onClock) setTimeout(draftStep,600); }   // resume a draft after reload/load
  $('#top').innerHTML=`<div class="logo"><b>FPS</b> <i>2026</i></div>
    <div class="meta"><span>Season <b>${G.season}</b></span><span>Week <b>${Math.min(G.week+ (G.phase==='regular'?1:0),G.maxWeek)}/${G.maxWeek}</b></span>
    <span>${logoTag(t,22)} <b>${t.city} ${t.nick}</b> (${t.wins}-${t.losses})</span>
    <span>Cap <b class="${capSpace(t)<0?'bad':'good'}">${money(capSpace(t))}</b>${teamDead(t)>0?` <span class="muted" style="font-size:10px">(${money(teamDead(t))} dead)</span>`:''}</span><span>Cash <b>${money(t.cash)}</b></span>${G.difficulty&&G.difficulty!=='normal'?`<span class="tag" title="GM difficulty">${diffLabel()}</span>`:''}</div>
    <div class="spacer"></div>
    <button class="btn" id="adv">${G.phase==='regular'?(G.week>=G.maxWeek?'Start Playoffs ▶':(!G.weekGameDone?'🏈 Resolve Game':'Advance Week ▶')):G.phase==='playoffs'?'Sim Playoff Round ▶':G.phase==='draft'?'📋 Draft Room':'Offseason ▶'}</button>
    <button class="btn sec" id="savb">Save</button><button class="btn sec" id="savesb">Saves</button>`;
  $('#adv').onclick=()=>{ if(G.phase==='draft'){ VIEW='draft'; render(); } else if(G.phase==='offseason'){ offseasonScreen(); } else if(G.phase==='regular'&&G.week<G.maxWeek&&!G.weekGameDone){ VIEW='week'; render(); } else advanceWeek(); };
  $('#savb').onclick=()=>save();
  $('#savesb').onclick=savesModal;
  const nav=$('#nav'); nav.innerHTML='';
  NAV.forEach(([k,ic,lbl])=>{ if(k.startsWith('SEP')){ nav.appendChild(el('div','grp',lbl)); return; }
    let label=lbl; if(k==='week'){ const n=openTaskCount(); if(n>0) label+=` <span style="background:#f0b23f;color:#08111f;border-radius:9px;padding:0 6px;font-size:10px;font-weight:800;margin-left:5px;vertical-align:middle">${n}</span>`; }
    const a=el('a',VIEW===k?'on':'',`<span class="ic">${ic}</span>${label}`); a.href='#'; a.onclick=e=>{e.preventDefault();VIEW=k;render();}; nav.appendChild(a); });
  if(typeof FSIM!=='undefined' && FSIM && VIEW!=='field'){ FSIM.stop(); FSIM=null; }   // halt the physics loop when leaving The Field
  if(typeof CGSIM!=='undefined' && CGSIM && VIEW!=='field'){ CGSIM.stop(); CGSIM=null; }   // halt the coach-mode physics canvas when you leave the field
  const m=$('#main'); m.innerHTML='';
  document.body.classList.toggle('cg-gamemode', !!(typeof CG!=='undefined' && CG && CG.active && !CG.over && VIEW==='field'));
  ({week:scrWeek,dash:scrDash,roster:scrRoster,depth:scrDepth,medical:scrMedical,justcoach:scrJustCoach,trade:scrTrade,fa:scrFA,draft:scrDraft,scout:scrScout,finance:scrFinance,
    franchise:scrFranchise,stadium:scrStadium,staff:scrStaff,owner:scrOwner,standings:scrStandings,schedule:scrSchedule,league:scrLeague,odds:scrOdds,
    scores:scrScores,wire:scrWire,field:scrField,
    players:scrPlayers,leaders:scrLeaders,college:scrCollege,history:scrHistory,feed:scrFeed,storylines:(typeof scrStorylines!=='undefined'?scrStorylines:scrDash),simlab:scrSimLab,rules:scrRules,gazette:scrGazette,ops:scrOps,settings:scrSettings}[VIEW]||scrDash)(m,t);
}
function head(m,title,sub){ m.appendChild(el('h1','scr',title)); if(sub)m.appendChild(el('p','sub',sub)); }
function ovrBadge(o){ return `<span class="ovr" style="background:${ovrColor(o)};color:#08111f">${o}</span>`; }

function oppScoutReport(opp){
  const tp=cgTop(opp)||{}, offS=(opp.coach&&opp.coach.offScheme)||'', defS=(opp.coach&&opp.coach.defScheme)||'';
  const passLean=/air|spread|vertical|west_coast|spread_air|spread_rpo/.test(offS)?'pass-first':/power|wide_zone|ball_control|te_heavy|power_run/.test(offS)?'run-first':'balanced';
  const threat=[tp.qb,tp.rb,(tp.receivers||[])[0]].filter(Boolean).sort((a,b)=>b.ovr-a.ovr)[0]||null;
  const tType=threat?(threat.pos==='QB'?'qb':threat.pos==='RB'?'run':'pass'):'pass';
  const defId=/blitz|pressure|man|fire/.test(defS)?'a pressure defense — they blitz':/cover|two|quarter|tampa|dime/.test(defS)?'a coverage shell — they cap the deep ball':'a balanced front';
  const runD=Math.round(ENG.rushDef?ENG.rushDef(opp):70), passD=Math.round(ENG.passDef?ENG.passDef(opp):70);
  return {passLean,threat,tType,defId,weak:runD<=passD?'run':'pass',runD,passD};
}
function cgGamePlanModal(oppAb){
  const opp=team(oppAb); if(!opp) return; const sc=oppScoutReport(opp), wp=G._weekPlan&&G._weekPlan.opp===oppAb?G._weekPlan:(G._weekPlan={opp:oppAb});
  const tn=sc.threat?sc.threat.name:'their playmaker', tl=sc.threat?sc.threat.last:'their star';
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl')closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:640px;width:94%;max-height:90vh;overflow:auto';
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:flex-start"><h2 style="margin:0;font-family:var(--disp);letter-spacing:.5px;text-transform:uppercase">📋 Game Plan</h2><button class="btn sec" onclick="closeOvl()">✕</button></div>
   <div class="muted" style="font-size:12px;margin-top:2px">${logoTag(opp,18)} ${esc(opp.city)} ${esc(opp.nick)} · ${opp.wins}-${opp.losses} · ${ENG.teamOvr(opp)} OVR</div>
   <div class="cg-panel" style="margin-top:12px"><div class="cg-panel-title">🔍 SCOUTING REPORT</div>
     <div style="font-size:13px;line-height:1.65">They run a <b>${sc.passLean}</b> offense built around <b>${esc(tn)}</b>${sc.threat?` (${sc.threat.pos} ${sc.threat.ovr})`:''}. On defense it's <b>${sc.defId}</b>.<br>Their soft spot: <b style="color:var(--good)">${sc.weak==='run'?'the run defense':'the pass defense'}</b> <span class="muted">(run-D ${sc.runD} · pass-D ${sc.passD})</span>.</div></div>
   <div class="cg-panel-title" style="margin-top:14px">SET YOUR PLAN</div>
   <div class="cg-gp-row"><span class="cg-gp-lbl">🎯 Neutralize</span><button class="btn ${wp.neutralize?'':'sec'}" data-wp="neut">Take away ${esc(tl)}</button><button class="btn ${!wp.neutralize?'':'sec'}" data-wp="noneut">Play it straight</button></div>
   <div class="cg-gp-row"><span class="cg-gp-lbl">⚔️ Attack</span><button class="btn ${wp.attack==='run'?'':'sec'}" data-wp="run">Pound the run</button><button class="btn ${wp.attack==='pass'?'':'sec'}" data-wp="pass">Air it out</button><button class="btn ${!wp.attack?'':'sec'}" data-wp="bal">Stay balanced</button></div>
   <div class="cg-gp-row"><span class="cg-gp-lbl">📜 Opening</span><button class="btn ${wp.script?'':'sec'}" data-wp="script">Script the first drive</button><button class="btn ${!wp.script?'':'sec'}" data-wp="noscript">Improvise</button></div>
   <p class="muted" style="font-size:12px;margin-top:12px">Your plan carries into the game: <b>Neutralize</b> pre-sets your key-on, <b>Attack</b> biases your call sheet toward their soft spot, the <b>script</b> gives your opening drive an edge. Or skip it — coach on instinct.</p>
   <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn sec" id="wpskip">Skip — just coach</button><button class="btn" id="wpgo">✓ Lock it in & coach →</button></div>`;
  ov.appendChild(box); document.body.appendChild(ov);
  setTimeout(()=>{ box.querySelectorAll('[data-wp]').forEach(b=>b.onclick=()=>{ const k=b.dataset.wp, p=G._weekPlan;
      if(k==='neut'){ p.neutralize=true; p.threatId=sc.threat?sc.threat.id:null; p.threatType=sc.tType; } else if(k==='noneut'){ p.neutralize=false; p.threatId=null; }
      else if(k==='run'||k==='pass'){ p.attack=k; } else if(k==='bal'){ p.attack=null; }
      else if(k==='script'){ p.script=true; } else if(k==='noscript'){ p.script=false; }
      cgGamePlanModal(oppAb); });
    const coach=()=>{ closeOvl(); const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER); if(g) startCoachGame(g.home,g.away,{week:true}); };
    const go=$('#wpgo'); if(go)go.onclick=coach; const sk=$('#wpskip'); if(sk)sk.onclick=()=>{ G._weekPlan=null; coach(); };
  },20);
}
function cgWeekStoryHTML(u){
  if(!u) return ''; ensureOwner(u); const exp=u.owner.expectation||setExpectation(u), W=G.maxWeek||17, wkNum=Math.min(G.week+1,W);
  const ord=n=>n+(n%10===1&&n%100!==11?'st':n%10===2&&n%100!==12?'nd':n%10===3&&n%100!==13?'rd':'th');
  const st=standings(); const divRank=st.filter(x=>x.conf===u.conf&&x.div===u.div).findIndex(x=>x.abbr===u.abbr)+1;
  const confRank=st.filter(x=>x.conf===u.conf).findIndex(x=>x.abbr===u.abbr)+1;
  const goal=exp.winGoal||9, pct=Math.min(100,Math.round(u.wins/Math.max(1,goal)*100));
  const conf=Math.round(u.owner.confidence!=null?u.owner.confidence:60);
  const seat = conf>=66?{t:'Owner is thrilled',c:'#46d39a'}:conf>=44?{t:'Owner is patient',c:'#5bbcff'}:conf>=26?{t:'You\'re on notice',c:'#e8b341'}:{t:'🔥 HOT SEAT',c:'#ef5b6b'};
  let stakes='';
  const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER);
  if(g){ const oppAb=g.home===USER?g.away:g.home, opp=team(oppAb), rival=(typeof rivalryName==='function')?rivalryName(USER,oppAb):null, div=opp&&opp.conf===u.conf&&opp.div===u.div, d=opp?opp.wins-opp.losses:0;
    const me=u.wins-u.losses;
    if(rival) stakes=`⚔️ <b>${esc(rival.replace(/^an? /,''))}</b> — ${opp.city} ${opp.nick} (${opp.wins}-${opp.losses}). Throw the records out.`;
    else if(div) stakes=`🏈 Division game vs <b>${opp.city} ${opp.nick}</b> (${opp.wins}-${opp.losses}) — these count double in the race.`;
    else if(d>=3) stakes=`🔥 <b>${opp.city} ${opp.nick}</b> roll in at ${opp.wins}-${opp.losses} — your stiffest test yet.`;
    else if(d<=-3) stakes=`<b>${opp.city} ${opp.nick}</b> (${opp.wins}-${opp.losses}) are reeling — a game you should take.`;
    else if(me>=2) stakes=`You're rolling at ${u.wins}-${u.losses} — keep it going against <b>${opp.city} ${opp.nick}</b>.`;
    else if(me<=-2) stakes=`Need a get-right game — <b>${opp.city} ${opp.nick}</b> (${opp.wins}-${opp.losses}) is the chance.`;
    else stakes=`<b>${opp.city} ${opp.nick}</b> (${opp.wins}-${opp.losses}) — a swing game.`;
  } else stakes=`🌴 Bye week — rest up and handle business.`;
  return `<div class="card cg-storycard">
    <div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div><div class="muted" style="font-size:10.5px;letter-spacing:1px">${logoTag(u,16)} ${esc(u.city)} ${esc(u.nick)} · ${G.season} · WEEK ${wkNum}</div>
        <h2 style="margin:4px 0 0;font-size:25px;font-family:var(--disp,sans-serif)">${u.wins}-${u.losses}${u.ties?'-'+u.ties:''} <span class="muted" style="font-size:13px;font-weight:600">${divRank?`· ${ord(divRank)} in ${esc(u.div)}`:''}${confRank?`, ${ord(confRank)} in the ${esc(u.conf)}`:''}</span></h2></div>
      <div style="text-align:right"><div style="font-weight:800;font-size:13px;color:${seat.c}">${seat.t}</div><div class="muted" style="font-size:10.5px">Owner confidence ${conf}%</div></div></div>
    <div class="cg-goal"><div class="cg-goal-lbl">🎯 <b>${esc(exp.label)}</b> <span class="muted">— ${u.wins} of ${goal} wins</span></div><div class="cg-goal-bar"><i style="width:${pct}%;background:${pct>=100?'var(--good)':seat.c}"></i></div></div>
    <div class="cg-stakes">${stakes}</div></div>`;
}
function cgCrowdBed(on){ try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    const ac=window._cgAudio||(window._cgAudio=new AC()); if(ac.state==='suspended') ac.resume();
    if(!on){ if(window._cgBed){ try{window._cgBed.src.stop();}catch(e){} try{window._cgBed.lfo.stop();}catch(e){} window._cgBed=null; } return; }
    if(window._cgBed) return;
    const len=Math.floor(ac.sampleRate*4), buf=ac.createBuffer(1,len,ac.sampleRate), dd=buf.getChannelData(0);
    let last=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; dd[i]=last*3.0; }   // brown-ish crowd rumble
    const src=ac.createBufferSource(); src.buffer=buf; src.loop=true;
    const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=520;
    const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=0.6;
    const g=ac.createGain(); g.gain.value=0.045;
    const lfo=ac.createOscillator(); lfo.frequency.value=0.16; const lg=ac.createGain(); lg.gain.value=0.012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(lp); lp.connect(g); src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start();
    window._cgBed={src,lfo,g,ac};
  }catch(e){} }
function scrWeek(m,t){
  ensureWeekState();
  if(G.phase==='playoffs'){ head(m,'Playoffs',`Season ${G.season} — the tournament is on.`);
    const c=el('div','card'); c.innerHTML=`<h3>Playoff Round</h3><p class="muted">Sim the next round, or check the bracket on Standings.</p><button class="btn" id="wkpo">▶ Sim Playoff Round</button>`;
    m.appendChild(c); setTimeout(()=>{const b=$('#wkpo'); if(b)b.onclick=()=>advanceWeek();},0); return; }
  if(G.phase==='draft'){ head(m,`${G.season} Draft`,'The draft is underway.');
    const c=el('div','card'); c.innerHTML=`<h3>📋 On the Clock</h3><p class="muted">The ${G.season} draft is in progress — head to the war room.</p><button class="btn" id="wkdr">▶ Open Draft Room</button>`;
    m.appendChild(c); setTimeout(()=>{const b=$('#wkdr'); if(b)b.onclick=()=>{VIEW='draft';render();};},0); return; }
  if(G.phase==='offseason'){ head(m,'Offseason',`The ${G.season} season is in the books.`);
    const c=el('div','card'); c.innerHTML=`<h3>Offseason</h3><p class="muted">Player aging & development, retirements, Hall-of-Fame voting, re-signings — then the draft.</p><button class="btn" id="wkos">▶ Begin Offseason & Draft</button>`;
    m.appendChild(c); setTimeout(()=>{const b=$('#wkos'); if(b)b.onclick=()=>offseasonScreen();},0); return; }
  // ---- regular season ----
  const wkNum=Math.min(G.week+1,G.maxWeek);
  const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER);
  pruneOffers();   // never show an offer for a player who's already gone
  const issues=playerIssues(t), offers=G._offers||[];
  const openN=(G.weekGameDone?0:1)+offers.length+issues.length;
  head(m,`This Week — Week ${wkNum}`, openN?`${openN} item${openN>1?'s':''} on your desk. Resolve your game, then advance the league.`:'Your desk is clear — advance the league when you\'re ready.');
  m.insertAdjacentHTML('beforeend', cgWeekStoryHTML(t));   // season story: record · standing · owner mandate · this week's stakes
  { const a=t.auto; if(a&&a.master&&a.lastReport&&a.lastReport.lines&&a.lastReport.lines.length){
      m.insertAdjacentHTML('beforeend', `<div class="card" style="border-left:3px solid var(--acc,#5bbcff)"><div class="grphd" style="margin:0 0 6px">🧑\u200d🏫 Front Office Report <span class="muted" style="text-transform:none;font-weight:400">— your staff handled it</span></div>${a.lastReport.lines.map(l=>`<div style="font-size:12.5px;padding:2px 0">${esc(l)}</div>`).join('')}<div class="muted" style="font-size:10.5px;margin-top:6px">Manage what runs itself in <b>Just Coach</b>.</div></div>`); } }

  if(typeof rivalryBanner!=='undefined'){ const rb=rivalryBanner(); if(rb) m.appendChild(rb); }   // ⚔️ splash a rivalry banner when you face a rival this week
  // YOUR GAME (the gate)
  const gc=el('div','card'); gc.style.cssText='border:1px solid '+(G.weekGameDone?'var(--line,#1b2940)':'#f0b23f');
  if(!g){ gc.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><div><div class="muted" style="font-size:11px;letter-spacing:.05em">YOUR GAME</div><h3 style="margin:2px 0">BYE WEEK</h3><span class="muted">No game this week — handle your business and advance.</span></div><div style="font-size:30px">🌴</div></div>`; }
  else { const oppAb=g.home===USER?g.away:g.home, opp=team(oppAb), homeMark=g.home===USER?'vs':'@';
    if(G.weekGameDone && G.pendingUserResult){ const r=G.pendingUserResult, won=(g.home===USER?r.hs>r.as:r.as>r.hs);
      gc.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div><div class="muted" style="font-size:11px;letter-spacing:.05em">YOUR GAME — RESOLVED</div>
          <h3 style="margin:3px 0">${logoTag(opp,24)} ${homeMark} ${opp.city} ${opp.nick}</h3>
          <span class="${won?'good':'bad'}" style="font-weight:800;font-family:var(--mono);font-size:15px">${won?'WIN':'LOSS'} ${Math.max(r.hs,r.as)}–${Math.min(r.hs,r.as)}</span>${r.potg?` <span class="muted">· POTG ${r.potg.name} (${r.potg.stat})</span>`:''}</div>
        <div class="muted" style="font-size:12px;text-align:right">Result locked in.<br>Advance to play it out across the league.</div></div>`; }
    else { gc.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div><div class="muted" style="font-size:11px;letter-spacing:.05em;color:#f0b23f">YOUR GAME — MUST RESOLVE</div>
          <h3 style="margin:3px 0">${logoTag(opp,26)} Week ${wkNum} ${homeMark} ${opp.city} ${opp.nick}</h3>
          <span class="muted">Opp rating ${ENG.teamOvr(opp)} · ${opp.wins}-${opp.losses}</span>${g.intl?`<div style="margin-top:6px"><span style="background:#1d6fa5;color:#fff;font-family:var(--mono);font-size:10px;font-weight:800;letter-spacing:1px;padding:2px 9px;border-radius:9px">${g.intl.flag} INTERNATIONAL — ${g.intl.venue}, ${g.intl.city}</span> <span class="muted" style="font-size:11px">neutral site · ${g.intl.note} · expect heavy legs from the travel</span></div>`:''}</div>
        <div class="flex" style="gap:8px;flex-wrap:wrap">${(G._weekPlan&&G._weekPlan.opp===oppAb&&(G._weekPlan.neutralize||G._weekPlan.attack||G._weekPlan.script))?`<span class="tag" style="background:#11331f;color:#46d39a;align-self:center">✓ Plan set</span>`:``}<button class="btn sec" id="wkplan">📋 Game Plan</button><button class="btn" id="wkcoach">🎮 Coach the Game</button><button class="btn sec" id="wksim">⏭ Sim It</button></div></div>`; } }
  m.appendChild(gc);

  // TRADE OFFERS
  if(offers.length){ const oc=el('div','card'); oc.innerHTML=`<h3>📨 Trade Offers <span class="muted" style="font-weight:400;font-size:12px">— ${offers.length} on the table</span></h3>`;
    const nm=a=>a.kind==='pick'?`<span class="tag">PICK</span> ${a.year} R${a.round}`:`<span class="pname" onclick="showPlayer(${a.id})">${a.name}</span> <span class="tag">${a.pos}</span> ${ovrBadge(a.ovr)}`;
    offers.forEach((o,i)=>{ const ot=team(o.other), fair=ENG.clamp(50+o.ev.margin*-2.2,5,95);
      const row=el('div','card'); row.style.cssText='margin-top:10px;background:#0c1320';
      row.innerHTML=`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>${logoTag(ot,20)} <b>${ot.city} ${ot.nick}</b> want to deal:</div>
        <div style="text-align:right"><div class="muted" style="font-size:11px">YOU GET</div>${o.get.map(nm).join(' + ')}</div></div>
        <div class="muted" style="font-size:11px;margin-top:6px">YOU GIVE</div>${o.give.map(nm).join(' + ')}
        <div class="bar" style="margin-top:8px"><i style="width:${fair}%;background:${fair>=50?'var(--good)':'var(--acc2)'}"></i></div>
        <div class="row" style="justify-content:space-between;margin-top:8px;flex-wrap:wrap;gap:6px"><span class="muted" style="font-size:11px">${fair>=50?'Fair / in your favor':'Slightly their favor'} · NN ${o.ev.margin>=0?'+':''}${o.ev.margin}</span>
        <span><button class="btn" style="padding:4px 12px" onclick="acceptOffer(${i})">Accept</button> <button class="btn sec" style="padding:4px 12px" onclick="declineOffer(${i})">Pass</button> <button class="btn sec" style="padding:4px 12px" id="wkcounter${i}">Counter</button></span></div>`;
      oc.appendChild(row); });
    m.appendChild(oc); }

  // PLAYER ISSUES
  if(issues.length){ const pc=el('div','card'); pc.innerHTML=`<h3>🧑‍🤝‍🧑 Player Issues <span class="muted" style="font-weight:400;font-size:12px">— ${issues.length} need a decision</span></h3>`;
    issues.forEach(({p,kind})=>{ const row=el('div','card'); row.style.cssText='margin-top:10px;background:#0c1320'; let title,desc,btns;
      if(kind==='demand'){ title=`🚩 ${p.name} (${p.pos}, ${p.ovr}) wants a trade`; desc=`Loyalty ${Math.round(p.loyalty||60)}. He's pushing to get out. Talk him down, put him on the block, or hold firm.`;
        btns=`<button class="btn" onclick="taskMeet(${p.id})">Meet with him</button> <button class="btn sec" onclick="taskShop(${p.id})">Put on block</button> <button class="btn sec" onclick="taskHoldFirm(${p.id})">Hold firm</button>`; }
      else if(kind==='payme'){ title=`💸 ${p.name} (${p.pos}, ${p.ovr}) wants to be paid`; desc=`A star after a big year wants top-of-market money. Pay him to lock him in, or hold the line and risk it.`;
        btns=`<button class="btn" onclick="taskExtendStar(${p.id})">Pay him (extension)</button> <button class="btn sec" onclick="taskHoldFirm(${p.id})">Hold the line</button>`; }
      else if(kind==='ringchase'){ title=`💍 ${p.name} (${p.pos}, ${p.ovr}), ${p.age}, wants a ring`; desc=`An aging star wants out to chase a title elsewhere. Trade him for value, talk him into one more run, or hold firm.`;
        btns=`<button class="btn" onclick="taskShop(${p.id})">Trade for value</button> <button class="btn sec" onclick="taskMeet(${p.id})">One more run</button> <button class="btn sec" onclick="taskHoldFirm(${p.id})">Hold firm</button>`; }
      else if(kind==='holdout'){ title=`💰 ${p.name} (${p.pos}, ${p.ovr}) is holding out`; desc=`Won't suit up (out ${p.out} wk) until he gets a new deal — makes $${p.salary}M now. Pay him, wait him out (he may cave, fester, or demand a trade), fine him, or move him.`;
        btns=`<button class="btn" onclick="taskRework(${p.id})">Rework his deal</button> <button class="btn sec" onclick="taskWaitOut(${p.id})">Wait him out</button> <button class="btn sec" onclick="taskFineHoldout(${p.id})">Fine him</button> <button class="btn sec" onclick="taskShop(${p.id})">Trade him</button>`; }
      else if(kind==='spotlight'){ title=`⭐ ${p.name} (${p.pos}, ${p.ovr}) broke out`; desc=`A young star wants an expanded role and a new deal. Reward him now, or wait and risk resentment.`;
        btns=`<button class="btn" onclick="taskExtendStar(${p.id})">Give role + raise</button> <button class="btn sec" onclick="taskIgnore(${p.id})">Not yet</button>`; }
      else { title=`😟 ${p.name} (${p.pos}, ${p.ovr}) is unhappy`; desc=`Morale ${p.morale||70}. A star sliding — get ahead of it before it spreads to the room.`;
        btns=`<button class="btn" onclick="taskAddress(${p.id})">Address it</button> <button class="btn sec" onclick="taskIgnore(${p.id})">Ignore</button>`; }
      row.innerHTML=`<div style="font-weight:700;margin-bottom:2px">${title}</div><div class="muted" style="font-size:12px;margin-bottom:8px">${desc}</div><div class="flex" style="gap:8px;flex-wrap:wrap">${btns}</div>`;
      pc.appendChild(row); });
    m.appendChild(pc); }

  if(!offers.length && !issues.length){ const q=el('div','card'); q.innerHTML=`<p class="muted" style="margin:0">No trade offers or player issues this week.${g&&G.weekGameDone?' Your game is resolved —':''} advance when ready.</p>`; m.appendChild(q); }

  // ADVANCE
  const adv=el('div','card'); adv.style.cssText='margin-top:14px;text-align:center';
  if(!G.weekGameDone){ adv.innerHTML=`<button class="btn" disabled style="opacity:.45;cursor:not-allowed">Advance Week ▶</button><div class="muted" style="margin-top:6px;font-size:12px">Resolve your game above to advance the league.</div>`; }
  else { const open=offers.length+issues.length; adv.innerHTML=`<button class="btn" id="wkadv" style="padding:10px 26px;font-size:15px">Advance to Week ${Math.min(wkNum+1,G.maxWeek)} ▶</button>${open?`<div class="muted" style="margin-top:6px;font-size:12px">${open} item${open>1?'s':''} still open — they'll carry over if you advance now.</div>`:''}`; }
  m.appendChild(adv);

  setTimeout(()=>{
    const c=$('#wkcoach'); if(c&&g)c.onclick=()=>startCoachGame(g.home,g.away,{week:true});
    const wkp=$('#wkplan'); if(wkp&&g)wkp.onclick=()=>cgGamePlanModal(g.home===USER?g.away:g.home);
    const s=$('#wksim'); if(s)s.onclick=()=>simUserGame();
    const a=$('#wkadv'); if(a)a.onclick=()=>advanceWeek();
    offers.forEach((o,i)=>{ const b=$('#wkcounter'+i); if(b)b.onclick=()=>{ TB={give:[...o.give],get:[...o.get],other:o.other}; VIEW='trade'; render(); }; });
  },0);
}
// tiny inline OVR sparkline for career arcs
function sparkline(hist,w,h){ w=w||120;h=h||28; if(!hist||hist.length<2)return ''; const v=hist.map(x=>x.o); const mn=Math.min(...v)-2,mx=Math.max(...v)+2,rng=mx-mn||1;
  const pts=hist.map((x,i)=>`${((i/(hist.length-1))*w).toFixed(1)},${(h-((x.o-mn)/rng)*h).toFixed(1)}`).join(' ');
  const col=v[v.length-1]>=v[0]?'#46d39a':'#ef5b6b';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2"/></svg>`; }
function scrFranchise(m,t){
  head(m,'Franchise',`${t.city} ${t.nick} — your dynasty at a glance`);
  const hs=el('div','card'); hs.innerHTML=hotSeatHTML(t); m.appendChild(hs);
  const split=el('div','split'); split.style.marginTop='12px';
  // season by season
  const sl=el('div','card'); sl.innerHTML='<h3>Season by Season</h3>';
  const log=(t.seasonLog||[]).slice().reverse();
  if(!log.length) sl.innerHTML+='<p class="muted">Your first season is underway — the record book opens when it ends.</p>';
  else { const tb=el('table'); tb.innerHTML='<tr><th>Year</th><th>Record</th><th>Finish</th><th>Owner</th></tr>'+
    log.map(s=>`<tr><td>${s.season}</td><td><b>${s.w}-${s.l}</b></td><td>${s.finish}</td><td>${s.conf!=null?`<span style="color:${hotSeatColor(s.conf)}">${s.conf}</span>`:'—'}</td></tr>`).join(''); sl.appendChild(tb); }
  split.appendChild(sl);
  // draft ROI
  const dr=el('div','card'); dr.innerHTML='<h3>Your Draft Picks <span class="muted" style="font-weight:400;font-size:11px">— grade vs reality</span></h3>';
  const drafted=[]; G.teams.forEach(tm=>tm.roster.forEach(p=>{ if(p.draftedBy===USER&&p.draftYear) drafted.push({p,tm}); }));
  drafted.sort((a,b)=>(b.p.draftYear-a.p.draftYear)||(a.p.draftOverall-b.p.draftOverall));
  if(!drafted.length) dr.innerHTML+='<p class="muted">No drafted players in the league yet — your classes show here with how they panned out.</p>';
  else { const tb=el('table'); tb.innerHTML='<tr><th>Yr</th><th>#</th><th>Player</th><th>Grd→OVR</th><th>Verdict</th></tr>'+
    drafted.slice(0,20).map(({p,tm})=>{ const g=p.draftGrade||p.ovr; const v=p.ovr>=g+5?'<span class="good">📈 Boom</span>':p.ovr<=g-8?'<span class="bad">📉 Bust</span>':'On track'; const away=tm.abbr===USER?'':` <span class="muted">(${tm.abbr})</span>`;
      return `<tr><td>${p.draftYear}</td><td>${p.draftOverall}</td><td class="pname" onclick="showPlayer(${p.id})">${p.name}${away}</td><td>${g}→${ovrBadge(p.ovr)}</td><td>${v}</td></tr>`; }).join(''); dr.appendChild(tb); }
  split.appendChild(dr); m.appendChild(split);
  // career trajectories (sparklines)
  const arcs=t.roster.filter(p=>p.ovrHistory&&p.ovrHistory.length>=2).sort((a,b)=>b.ovr-a.ovr).slice(0,8);
  if(arcs.length){ const ac=el('div','card'); ac.style.marginTop='12px'; ac.innerHTML='<h3>Career Trajectories <span class="muted" style="font-weight:400;font-size:11px">— OVR over the years</span></h3>';
    arcs.forEach(p=>{ const row=el('div'); row.style.cssText='display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--line2,#16223a)';
      row.innerHTML=`<div style="flex:1"><span class="pname" onclick="showPlayer(${p.id})">${p.name}</span> <span class="tag">${p.pos}</span> <span class="muted">age ${p.age}${p.archetype?' · '+(ARCHE_LBL[p.archetype]||p.archetype):''}</span></div><div>${sparkline(p.ovrHistory)}</div><div style="width:36px;text-align:right">${ovrBadge(p.ovr)}</div>`;
      ac.appendChild(row); });
    m.appendChild(ac); }
}
function scrDash(m,t){
  const hd=el('div','teamhead'); hd.innerHTML=`${logoTag(t,58)}<div><h1 class="scr" style="margin:0">${t.city} ${t.nick}</h1><p class="sub" style="margin:3px 0 0">${t.conf} ${t.div} · Owner ${t.owner.name} · HC ${t.coach.name}</p></div><div style="flex:1"></div>${faceTag(t,72)}`;
  m.appendChild(hd);
  const cards=el('div','cards');
  const add=(h,v,s)=>{const c=el('div','card',`<h3>${h}</h3><div class="stat">${v}</div>${s?`<div class="muted" style="margin-top:4px">${s}</div>`:''}`);cards.appendChild(c);};
  add('Record',`${t.wins}-${t.losses}${t.ties?'-'+t.ties:''}`, `Pts ${t.pf} / ${t.pa}`);
  add('Team Rating', ENG.teamOvr(t), `Off ${Math.round(ENG.teamOff(t))} · Def ${Math.round(ENG.teamDef(t))}`);
  add('Cap Space', money(capSpace(t)), `of ${money(t.cap)}`);
  add('Cash', money(t.cash), 'owner war chest');
  add('Fan Morale', t.fans.morale+'%', `base ${t.fans.base} · loyalty ${t.fans.loyalty}%`);
  add('Team Morale', ENG.teamMorale(t)+'%', '');
  add('Stadium', t.stadium.cap.toLocaleString(), `quality ${t.stadium.quality} · built ${t.stadium.built}`);
  if(t._lastFin) add('Last Wk Profit', money(t._lastFin.profit), `rev ${money(t._lastFin.rev)} / exp ${money(t._lastFin.exp)}`);
  m.appendChild(cards);
  // owner confidence / hot seat
  const hs=el('div','card'); hs.style.marginTop='14px'; hs.innerHTML=hotSeatHTML(t); m.appendChild(hs);
  // recent results + news
  const split=el('div','split'); split.style.marginTop='16px';
  const left=el('div','card'); left.innerHTML='<h3>Around the League — Latest</h3>';
  G.news.slice(0,8).forEach(n=>{ left.appendChild(el('div','news',`<b>${n.tag}</b> ${n.txt}`)); });
  const right=el('div','card'); right.innerHTML='<h3>Top of the Roster</h3>';
  const tbl=el('table'); tbl.innerHTML='<tr><th>Pos</th><th>Player</th><th>Age</th><th>OVR</th></tr>'+
    t.roster.slice().sort((a,b)=>b.ovr-a.ovr).slice(0,8).map(p=>`<tr><td><span class="tag">${p.pos}</span></td><td class="pname" onclick="showPlayer(${p.id})">${p.name}</td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td></tr>`).join('');
  right.appendChild(tbl);
  split.appendChild(left); split.appendChild(right); m.appendChild(split);
}
function scrRoster(m,t){
  head(m,'Roster',`${t.roster.length} players · cap used ${money(t.roster.reduce((a,p)=>a+p.salary,0))} / ${money(t.cap)}`);
  const c=el('div','card'); const tbl=el('table');
  tbl.innerHTML='<tr><th>Pos</th><th>Player</th><th>Age</th><th>OVR</th><th>Grd</th><th>ST</th><th>SP</th><th>IN</th><th>Salary</th><th>Yrs</th><th>Mor</th><th></th></tr>'+
    t.roster.slice().sort((a,b)=>(ENG.QUOTA.findIndex(q=>q[0]===a.pos))-(ENG.QUOTA.findIndex(q=>q[0]===b.pos))||b.ovr-a.ovr)
    .map(p=>{ const av=k=>(p.attrs&&p.attrs[k]!=null)?p.attrs[k]:'—';
      return `<tr><td><span class="tag">${p.pos}</span></td><td class="pname" onclick="showPlayer(${p.id})">${p.starter?'★ ':''}${p.name}${p.rookie?' <span class="acc">R</span>':''}${p.ir?` <span class="bad" title="${esc(injurySummary(p))}">IR</span>`:(p.out>0?` <span class="bad" title="${esc(injurySummary(p))}">✚${p.out}</span>`:'')}</td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td><b>${ENG.grade(p)}</b></td><td>${av('ST')}</td><td>${av('SP')}</td><td>${av('IN')}</td><td>${money(p.salary)}</td><td>${p.years}</td><td>${p.morale||70}</td><td><button class="btn" style="padding:3px 8px" onclick="shopPlayer(${p.id})">Shop</button> <button class="btn sec" style="padding:3px 8px" onclick="cutPlayer(${p.id})">Cut</button></td></tr>`; }).join('');
  c.appendChild(tbl); m.appendChild(c);
  // Visual depth chart (starters + top 2) — simple but immediate GM upgrade for roster strategy
  const dc=el('div','card'); dc.style.marginTop='10px'; dc.innerHTML='<h3>Depth Chart (Starters + Top 2)</h3>';
  const posGroups = [['QB','RB','FB','WR','TE','T','G','C'],['DE','DT','OLB','ILB','CB','S','K','P']];
  posGroups.forEach(group=>{
    const row=el('div','row'); row.style.cssText='margin:4px 0;font-size:11px;gap:6px;flex-wrap:wrap';
    group.forEach(pos=>{
      const ps = t.roster.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr).slice(0,3);
      if(!ps.length) return;
      const s=ps[0]; const b1=ps[1], b2=ps[2];
      let html = `<span class="tag">${pos}</span> <b onclick="showPlayer(${s.id})" style="cursor:pointer">${s.name} ${ovrBadge(s.ovr)}</b>`;
      if(b1) html += ` <span class="muted" onclick="showPlayer(${b1.id})" style="cursor:pointer;font-size:10px">• ${b1.name} ${b1.ovr}</span>`;
      row.innerHTML += html + ' ';
    });
    dc.appendChild(row);
  });
  m.appendChild(dc);
}
window.cutPlayer=id=>{ const t=ut(); const p=t.roster.find(x=>x.id===id); if(!p)return; if(t.roster.length<=46){toast('Roster too small to cut.');return;}
  if(!canSparePlayer(t,p)){ toast(`Cannot cut ${p.pos}; roster would fall below legal depth.`); return; }
  const dead=G.rules.salaryCap?deadCapOf(p):0; if(dead>0){ t.dead=t.dead||[]; t.dead.push({name:p.name,amt:dead,season:deadSeason()}); }
  t.roster=t.roster.filter(x=>x.id!==id); repairRosterLegality(t,'cut'); pruneOffers(); addNews('ROSTER',`${t.city} release ${p.name}.${dead>0?` $${dead}M dead cap.`:''}`);
  if(window.VOICES && p.ovr>=78) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`✂️ ${t.city} are releasing ${p.name} (${p.pos}, ${p.ovr})${dead>0?` — eating $${dead}M in dead money`:''}. He'll have a market.`,'NEWS',p.ovr>=84);
  if(p.ovr>=82) t.roster.forEach(q=>{ q.morale=ENG.clamp((q.morale||70)-ENG.ri(0,3),12,99); });   // cutting a respected vet unsettles the locker room
  toast(`Cut ${p.name}${dead>0?` · $${dead}M dead`:''}`); save(); render(); };

function aggPct(p,t){ if(!p||!p.injury) return 0; const d=p.durability!=null?p.durability:ensureDurability(p); const tough=(d-50)/50, base=p.injury.status==='DOUBTFUL'?0.40:0.22; return Math.round(ENG.clamp(base*(1-tough*0.30)*(1-(trainerRating(t)-68)*0.006),0.05,0.70)*100); }
window.cgSetPlayHurt=id=>{ const f=findPlayer(id); if(f){ f.p._playHurt=G.week; f.p._sitWk=null; toast(`${f.p.name} will gut it out.`); render(); } };
window.cgSetRest=id=>{ const f=findPlayer(id); if(f){ f.p._sitWk=G.week; f.p._playHurt=null; toast(`${f.p.name} will rest this week.`); render(); } };
window.cgClearRest=id=>{ const f=findPlayer(id); if(f){ f.p._sitWk=null; f.p._playHurt=null; render(); } };
function scrDepth(m,t){ t=t||ut(); resyncDepth(t);
  const wkNum=Math.min(G.week+1,G.maxWeek||17);
  const q=t.roster.filter(p=>p.injury&&p.injury.playable&&p.out<=1&&p._sitWk!==G.week);
  const resting=t.roster.filter(p=>p._sitWk===G.week), hurting=t.roster.filter(p=>p._playHurt===G.week);
  head(m,'Depth Chart',`Week ${wkNum} — drag a player to set your order. Rest a banged-up starter, or send a hurt star out to gut it out.`);
  const sum=el('div','card'); sum.style.marginBottom='12px';
  sum.innerHTML=`<div class="row" style="gap:18px;flex-wrap:wrap;font-size:13px">
    <div><b style="color:#e8b341">${q.length}</b> <span class="muted">questionable</span></div>
    <div><b style="color:#ef5b6b">${hurting.length}</b> <span class="muted">playing hurt</span></div>
    <div><b style="color:#5bbcff">${resting.length}</b> <span class="muted">resting this week</span></div>
    <div class="muted" style="font-size:11px;align-self:center">Trainer: <b style="color:${durTier(trainerRating(t)).c}">${trainerRating(t)}</b></div></div>
    <div class="muted" style="font-size:11px;margin-top:6px">\u2195 Drag to reorder \u2014 set your <b>QB1</b> and starters here. Benching a star QB or RB makes news.</div>`;
  m.appendChild(sum);
  const UNITS=[['Offense',['QB','RB','FB','WR','TE','T','G','C']],['Defense',['DE','DT','OLB','ILB','CB','S']],['Special teams',['K','P']]];
  UNITS.forEach(([unit,poslist])=>{
    const present=poslist.filter(pos=>t.roster.some(p=>p.pos===pos)); if(!present.length) return;
    const card=el('div','card'); card.style.marginBottom='10px';
    let h=`<div class="grphd" style="margin:0 0 8px">${unit}</div>`;
    present.forEach(pos=>{
      const grp=t.roster.filter(p=>p.pos===pos).sort((a,b)=>(a.depth||99)-(b.depth||99)||b.ovr-a.ovr);
      const pl=posNoun(pos), lbl=pl.charAt(0).toUpperCase()+pl.slice(1);
      const startN=pos==='WR'?3:(pos==='CB'?2:1);
      h+=`<div class="cg-depth-poslabel">${lbl}${t._depthPinned&&t._depthPinned[pos]?' <span style="color:var(--acc,#5bbcff)">\u00b7 custom order</span>':''}</div><div class="cg-depth-list" data-pos="${pos}">`;
      grp.forEach((p,i)=>{ ensureDurability(p); const inj=p.injury, stt=inj&&inj.status&&inj.status!=='PROBABLE'?injStatusInfo(inj.status):null;
        const playing=pCanPlay(p), starter=playing&&i<startN, tier=durTier(p.durability);
        let badge = p._sitWk===G.week?`<span style="color:#5bbcff;font-weight:700">RESTING</span>`
          : p._playHurt===G.week?`<span style="color:#ef5b6b;font-weight:700">PLAYING HURT</span>`
          : stt?`<span style="color:${stt.c};font-weight:700">${stt.l}${p.out>0?` (out ${p.out})`:''}</span>`
          : (p.out>0||p.ir)?`<span class="bad">Out ${p.ir?'(IR)':p.out+' wk'}</span>`
          : starter?`<span style="color:#46d39a;font-weight:700">${pos==='QB'&&i===0?'QB1 \u00b7 STARTER':'STARTER'}</span>`:`<span class="muted">#${i+1} depth</span>`;
        let ctrl='';
        if(inj&&inj.playable&&p.out<=1&&!inj.noPlayThru){ const ap=aggPct(p,t), hurtOn=p._playHurt===G.week;
          ctrl=`<button class="btn ${hurtOn?'':'sec'}" style="padding:4px 8px;font-size:11px" onclick="cgSetPlayHurt(${p.id})">\ud83d\udcaa Play hurt \u00b7 ${ap}%</button> <button class="btn ${p._sitWk===G.week||!hurtOn?'':'sec'}" style="padding:4px 8px;font-size:11px" onclick="cgSetRest(${p.id})">\ud83d\udecb Rest</button>`;
        } else if(playing && i<startN+1){ const restOn=p._sitWk===G.week;
          ctrl=restOn?`<button class="btn" style="padding:4px 8px;font-size:11px" onclick="cgClearRest(${p.id})">\u21a9 Un-rest</button>`:`<button class="btn sec" style="padding:4px 8px;font-size:11px" onclick="cgSetRest(${p.id})">\ud83d\udecb Rest</button>`; }
        h+=`<div class="cg-drow" draggable="true" data-id="${p.id}" data-pos="${pos}"><span class="cg-draghandle" title="drag to reorder">\u283f</span>${ovrBadge(p.ovr)}<div style="min-width:0;flex:1"><span class="pname" onclick="showPlayer(${p.id})" style="cursor:pointer">${p.name}</span> <span class="muted" style="font-size:10px;color:${tier.c}" title="durability">${tier.l}</span><br><span style="font-size:11px">${badge}</span></div><div style="white-space:nowrap">${ctrl}</div></div>`;
      });
      h+=`</div>`;
    });
    card.innerHTML=h; m.appendChild(card);
  });
  setTimeout(cgWireDepthDnD,0);
}
function cgDnDAfter(list,y){ const rows=[...list.querySelectorAll('.cg-drow:not(.dragging)')]; let best=null,bestOff=-Infinity;
  rows.forEach(r=>{ const b=r.getBoundingClientRect(), off=y-b.top-b.height/2; if(off<0&&off>bestOff){ bestOff=off; best=r; } }); return best; }
function cgWireDepthDnD(){ document.querySelectorAll('.cg-depth-list').forEach(list=>{
    list.querySelectorAll('.cg-drow').forEach(row=>{
      row.addEventListener('dragstart',e=>{ row.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',row.dataset.id);}catch(_){} });
      row.addEventListener('dragend',()=>{ row.classList.remove('dragging'); const ids=[...list.querySelectorAll('.cg-drow')].map(r=>+r.dataset.id); cgReorderDepth(list.dataset.pos, ids); });
    });
    list.addEventListener('dragover',e=>{ const dragging=document.querySelector('.cg-drow.dragging'); if(!dragging||dragging.dataset.pos!==list.dataset.pos) return; e.preventDefault();
      const after=cgDnDAfter(list,e.clientY); if(after==null) list.appendChild(dragging); else list.insertBefore(dragging,after); });
  });
}
window.cgToggleAuto=(key)=>{ const a=ensureAuto(ut()); if(key==='master'){ a.master=!a.master; } else if(a.master){ a[key]=!a[key]; } save(); render(); };
function scrJustCoach(m,t){ t=t||ut(); const a=ensureAuto(t);
  head(m,'Just Coach','Let your front office run the busywork \u2014 you focus on game day. Flip any piece on or off.');
  const mc=el('div','card'); mc.style.cssText='margin-bottom:12px;border:1px solid '+(a.master?'#2e6b46':'#2a3142');
  mc.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 style="margin:0">${a.master?'\ud83d\udfe2':'\u26aa'} JUST COACH</h3><div class="muted" style="font-size:12px;margin-top:3px">${a.master?'Your staff is running the franchise. You coach.':'Off \u2014 you handle every GM decision yourself.'}</div></div><button class="btn ${a.master?'':'sec'}" onclick="cgToggleAuto('master')" style="padding:9px 18px">${a.master?'On':'Turn on'}</button></div>`;
  m.appendChild(mc);
  const CATS=[['scout','\ud83d\udd0e Auto-Scouting','Spends your weekly scouting points on the best board \u00d7 need prospects.','live'],
    ['depth','\ud83e\ude9c Auto Depth Chart','Sets the best lineup, benches the injured, rests a banged-up star when you have a cushion.','live'],
    ['finance','\ud83d\udcb0 Auto Finances','Keeps you cap-legal \u2014 restructures before you go over.','live'],
    ['resign','\u270d Auto Re-sign','Keeps your core; lets aging depth walk.','live'],
    ['fa','\ud83d\uded2 Auto Free Agency','Signs to need within the cap (1/wk).','live'],
    ['draft','\ud83c\udfaf Auto Draft','Best-available \u00d7 need off your scouted board.','live'],
    ['staff','\ud83e\uddd1\u200d\ud83c\udfeb Auto Staff','Upgrades coordinators / scout / medical when affordable.','live'],
    ['trades','\ud83d\udd01 Auto Trades','Conservative \u2014 blocks a depth surplus near the deadline. Never your stars.','live']];
  const card=el('div','card'); let h='<div class="grphd" style="margin:0 0 8px">What runs itself</div>';
  CATS.forEach(([key,label,desc,state])=>{ const on=a[key], dis=!a.master||state==='soon';
    h+=`<div class="row" style="justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);${dis?'opacity:.55':''}">
      <div style="flex:1;min-width:0"><b style="font-size:13px">${label}</b> ${state==='soon'?'<span class="tag" style="font-size:8px">soon</span>':''}<div class="muted" style="font-size:11px">${desc}</div></div>
      ${state==='live'?`<button class="btn ${on&&a.master?'':'sec'}" ${dis?'disabled':''} onclick="cgToggleAuto('${key}')" style="padding:5px 13px;font-size:11px">${on?'On':'Off'}</button>`:'<span class="muted" style="font-size:10px">coming</span>'}</div>`; });
  card.innerHTML=h; m.appendChild(card);
  const prot=el('div','card'); prot.style.marginTop='10px';
  const protList=(a.protect||[]).map(id=>{ const p=t.roster.find(x=>x.id===id); return p?`${p.name} (${p.pos})`:null; }).filter(Boolean);
  prot.innerHTML=`<div class="grphd" style="margin:0 0 6px">\ud83d\udd12 Protected from the CPU</div><div class="muted" style="font-size:12px">${protList.length?protList.join(' \u00b7 '):'Your franchise QB is auto-protected.'} \u2014 the auto-GM will never cut, trade, or bench these.</div>`;
  m.appendChild(prot);
}
function scrMedical(m,t){
  const med=ensureMedical(t), active=t.roster.filter(p=>p.out>0||p.ir), atRisk=t.roster.filter(p=>!(p.out>0)&&!p.ir).map(p=>({p,r:injuryRiskBand(p)})).sort((a,b)=>b.r.score-a.r.score).slice(0,14);
  const ir=t.roster.filter(p=>p.ir);
  head(m,'Medical Center',`${active.length} unavailable · ${ir.length} on IR · ${med.pointsLeft}/${trainerPointMax(t)} trainer points`);
  const cards=el('div','cards');
  cards.appendChild(el('div','card',`<h3>Head Trainer</h3><div class="stat s" style="color:${ovrColor(trainerRating(t))}">${trainerRating(t)}</div><div class="muted">${esc(t.staff.med.name)} · recovery staff</div><div class="muted" style="font-size:11px;margin-top:4px">Trainer points reset every week. Use them on specific players to shorten timelines.</div>`));
  cards.appendChild(el('div','card',`<h3>Trainer Points</h3><div class="stat s">${med.pointsLeft}/${trainerPointMax(t)}</div><div class="muted">Spend on rehab, conditioning, swelling control, protocol management.</div>`));
  cards.appendChild(el('div','card',`<h3>Roster Health</h3><div class="stat s">${Math.round(t.roster.reduce((s,p)=>s+(p.wear||0),0)/(t.roster.length||1))}</div><div class="muted">Average wear · heat/travel/usage drive this up.</div>`));
  cards.appendChild(el('div','card',`<h3>Upgrade Staff</h3><button class="btn" onclick="hireTrainer()">Upgrade trainer — $4M</button><p class="muted" style="font-size:11px;margin-top:8px">Better trainers give more points and improve bye/IR recovery checks.</p>`));
  m.appendChild(cards);

  const board=el('div','card'); board.style.marginTop='14px';
  board.innerHTML=`<h3>Active Injuries / IR</h3>${active.length?`<table><tr><th>Player</th><th>Status</th><th>Injury</th><th>Weeks</th><th>Usage at Injury</th><th>Wear</th><th>Actions</th></tr>`+
    active.slice().sort((a,b)=>(b.out||0)-(a.out||0)||b.ovr-a.ovr).map(p=>{ const i=p.injury||{}, load=i.usageLoad!=null?i.usageLoad:(p.lastUsage&&p.lastUsage.load)||0, weeks=p.ir&&p.out<=0?'Eligible':(p.out||0);
      const canIR=p.out>=4&&!p.ir, canAct=p.ir&&p.out<=0, treated=med.treated&&med.treated[p.id];
      return `<tr><td class="pname" onclick="showPlayer(${p.id})">${p.name} <span class="tag">${p.pos}</span> ${ovrBadge(p.ovr)}</td><td>${p.ir?'<span class="bad">IR</span>':esc(injuryTypeLabel(p))}</td><td>${esc(i.body||'undisclosed')} <span class="muted">${esc(i.severity||i.type||'')}</span></td><td>${weeks}</td><td>${load||'—'}</td><td>${Math.round(p.wear||0)}</td><td><button class="btn sec" style="padding:3px 9px" onclick="treatInjury(${p.id})" ${treated?'disabled':''}>Treat</button> ${canIR?`<button class="btn warn" style="padding:3px 9px" onclick="placeOnIR(${p.id})">IR</button>`:''}${canAct?`<button class="btn" style="padding:3px 9px" onclick="activateFromIR(${p.id})">Activate</button>`:''}</td></tr>`;
    }).join('')+`</table>`:'<p class="muted">No active injuries. Enjoy it while it lasts.</p>'}`;
  m.appendChild(board);

  const risk=el('div','card'); risk.style.marginTop='14px';
  risk.innerHTML=`<h3>Usage / Injury Risk Watch</h3><table><tr><th>Player</th><th>Risk</th><th>Wear</th><th>Last Usage</th><th>Why it matters</th></tr>`+
    atRisk.map(x=>{ const p=x.p, u=p.lastUsage||{}, high=x.r.score>=60;
      const why=[(p.wear||0)>=55?'wear load':null,(u.load||0)>=1.2?'heavy touches/snaps':null,HIGH_CONTACT.has(p.pos)?'contact position':null,((p.attrs&&p.attrs.EN)||62)<58?'low endurance':null].filter(Boolean).join(' · ')||'normal rotation';
      return `<tr><td class="pname" onclick="showPlayer(${p.id})">${p.name} <span class="tag">${p.pos}</span></td><td class="${high?'bad':x.r.score>=40?'warn':'good'}"><b>${x.r.label}</b> ${x.r.score}</td><td>${Math.round(p.wear||0)}</td><td>${u.load!=null?`${u.load} load · ${u.touches||0} touches · ${u.def||0} def acts`:'No recent line'}</td><td class="muted">${esc(why)}</td></tr>`;
    }).join('')+`</table><p class="muted" style="font-size:12px;margin-top:8px">High usage now increases the next injury roll. Heat, travel, hurry-up tempo and poor endurance stack on top of wear.</p>`;
  m.appendChild(risk);

  const league=allPlayers().filter(x=>x.p.out>0||x.p.ir).sort((a,b)=>b.p.ovr-a.p.ovr).slice(0,40);
  const lw=el('div','card'); lw.style.marginTop='14px';
  lw.innerHTML=`<h3>League Injury Wire</h3>${league.length?`<table><tr><th>Player</th><th>Team</th><th>Status</th><th>Injury</th><th>Weeks</th></tr>`+
    league.map(x=>{ const p=x.p,i=p.injury||{}; return `<tr><td class="pname" onclick="showPlayer(${p.id})">${p.name} <span class="tag">${p.pos}</span> ${ovrBadge(p.ovr)}</td><td>${logoTag(x.t,16)} ${x.t.abbr}</td><td>${p.ir?'IR':esc(injuryTypeLabel(p))}</td><td>${esc(i.body||p.outReason||'undisclosed')} <span class="muted">${esc(i.severity||'')}</span></td><td>${p.ir&&p.out<=0?'Eligible':p.out}</td></tr>`; }).join('')+`</table>`:'<p class="muted">No league injuries reported.</p>'}`;
  m.appendChild(lw);
}
window.hireTrainer=()=>{ const t=ut(); ensureMedical(t); if(t.cash<4){ toast('Not enough cash'); return; }
  t.cash=ENG.round1(t.cash-4); t.staff.med={name:ENG.coachName(),ovr:ENG.clamp((t.staff.med&&t.staff.med.ovr||68)+ENG.ri(4,11),58,96)};
  t.medical.weekKey=null; ensureMedical(t); addNews('STAFF',`${t.city} upgrade the training room, hiring ${t.staff.med.name} (${t.staff.med.ovr}) as head trainer.`); toast('Training staff upgraded.'); save(); render(); };

let TB={give:[],get:[],other:null};   // trade-builder selection
function scrTrade(m,t){
  ensurePicks(t);
  head(m,'Trade Center','Neural-net valuations · weighted AI offers · Claude is the GM across the table.');
  if(G.phase==='regular'){ const DL=tradeDeadlineWeek(); const note=el('div','news');
    if(G.tradeDeadlinePassed){ note.style.cssText='border-left-color:var(--bad,#ff5d6c)'; note.innerHTML='🔒 <b>The trade deadline has passed.</b> Rosters are frozen until the offseason — no trades can be made.'; }
    else { const out=DL-G.week; note.style.cssText='border-left-color:#f0b23f'; note.innerHTML=`⏳ Trade deadline: <b>Week ${DL}</b> ${out<=0?'(this week!)':`(in ${out} week${out>1?'s':''})`}. After that, the market freezes until spring.`; }
    m.appendChild(note); }
  const movable=t.roster.filter(p=>canSparePlayer(t,p)).sort((a,b)=>tradeValue(b)-tradeValue(a));
  const shopCard=el('div','card'); shopCard.style.marginTop='12px';
  shopCard.innerHTML=`<h3>Shop A Player</h3>
    <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
      <select id="shopselect" style="min-width:260px;flex:1">${movable.map(p=>`<option value="${p.id}">${esc(p.name)} - ${p.pos} ${p.ovr} - value ${tradeValue(p)}${p.flags&&p.flags.wantsOut?' - wants out':''}</option>`).join('')}</select>
      <button class="btn" id="shopbtn" ${(!movable.length||G.tradeDeadlinePassed)?'disabled':''}>Call the league</button>
    </div>
    <div class="muted" style="font-size:12px;margin-top:8px">${movable.length?'Teams will return firm offers for that player only. Shopping loyal or happy players can leak and hurt the relationship.':'No one can be shopped without breaking legal roster depth.'}</div>`;
  m.appendChild(shopCard);
  // ---- incoming offers (weighted) ----
  if(!G._offers) G._offers=generateOffers(); else pruneOffers();
  const ic=el('div','card'); ic.innerHTML='<h3>Offers On The Table <button class="btn sec" style="float:right;padding:3px 10px" id="refoff">↻ Shop the league</button></h3>';
  if(G._shopContext) ic.innerHTML+=`<div class="news" style="margin-bottom:10px;border-left-color:var(--acc2,#f0b23f)"><b>Shopping:</b> ${esc(G._shopContext.name)} <span class="tag">${G._shopContext.pos}</span> ${ovrBadge(G._shopContext.ovr)}. These offers are for that player.</div>`;
  const nm=a=>a.kind==='pick'?`<span class="tag">PICK</span> ${a.year} R${a.round}`:`<span class="pname" onclick="showPlayer(${a.id})">${a.name}</span> <span class="tag">${a.pos}</span> ${ovrBadge(a.ovr)}`;
  if(!G._offers.length) ic.innerHTML+='<p class="muted">No offers right now — shop the league or build your own below.</p>';
  G._offers.forEach((o,i)=>{ const ot=team(o.other); const fair=ENG.clamp(50+o.ev.margin*-2.2,5,95);
    const row=el('div','card'); row.style.cssText='margin-top:10px;background:#0c1320';
    row.innerHTML=`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>${logoTag(ot,20)} <b>${ot.city} ${ot.nick}</b> offer:</div>
      <div style="text-align:right"><div class="muted" style="font-size:11px">YOU GET</div>${o.get.map(nm).join(' + ')}</div></div>
      <div class="muted" style="font-size:11px;margin-top:6px">YOU GIVE</div>${o.give.map(nm).join(' + ')}
      <div class="bar" style="margin-top:8px"><i style="width:${fair}%;background:${fair>=50?'var(--good)':'var(--acc2)'}"></i></div>
      <div class="row" style="justify-content:space-between;margin-top:8px"><span class="muted" style="font-size:11px">${fair>=50?'Fair / in your favor':'Slightly their favor'} · NN ${o.ev.margin>=0?'+':''}${o.ev.margin}</span>
      <span><button class="btn" style="padding:4px 12px" onclick="acceptOffer(${i})">Accept</button> <button class="btn sec" style="padding:4px 12px" onclick="declineOffer(${i})">Pass</button></span></div>`;
    ic.appendChild(row); });
  m.appendChild(ic);
  setTimeout(()=>{ const s=$('#shopselect'), b=$('#shopbtn'); if(s&&b)b.onclick=()=>shopPlayer(+s.value);
    const r=$('#refoff'); if(r)r.onclick=()=>{ G._shopContext=null; G._offers=generateOffers(); render(); }; },0);
  // ---- propose a trade ----
  const other = TB.other && team(TB.other) && TB.other!==USER ? TB.other : (G.teams.find(x=>x.abbr!==USER)||{}).abbr; TB.other=other; const oT=team(other);
  const pb=el('div','card'); pb.style.marginTop='14px';
  const myAssets=[...t.roster.slice().sort((a,b)=>b.ovr-a.ovr), ...teamPicks(t).map(p=>Object.assign({kind:'pick'},p))];
  const oAssets=[...oT.roster.slice().sort((a,b)=>b.ovr-a.ovr), ...teamPicks(oT).map(p=>Object.assign({kind:'pick'},p))];
  const aId=a=>a.kind==='pick'?'pk'+a.round+'_'+a.year+'_'+a.from:'pl'+a.id;
  const aLabel=a=>a.kind==='pick'?`${a.year} R${a.round} pick (${pickVal(a)})`:`${a.name} · ${a.pos} ${a.ovr} (${tradeValue(a)})`;
  const opt=(a,arr)=>`<label class="opt" style="padding:3px 0"><input type="checkbox" data-aid="${aId(a)}" ${arr.some(x=>aId(x)===aId(a))?'checked':''}> ${aLabel(a)}</label>`;
  pb.innerHTML=`<h3>Propose a Trade</h3>
    <div class="split">
      <div><div class="muted" style="font-size:11px;margin-bottom:4px">YOU SEND — value <b id="gv">${pkgVal(TB.give)}</b></div>
        <input type="text" id="givesrch" placeholder="🔍 filter your players…" style="width:100%;margin-bottom:6px;font-size:12px">
        <div style="max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px" id="givebox">${myAssets.map(a=>opt(a,TB.give)).join('')}</div></div>
      <div><div class="muted" style="font-size:11px;margin-bottom:4px">FROM <select id="toteam">${G.teams.filter(x=>x.abbr!==USER).map(x=>`<option value="${x.abbr}" ${x.abbr===other?'selected':''}>${x.city} ${x.nick}</option>`).join('')}</select> — value <b id="rv">${pkgVal(TB.get)}</b></div>
        <input type="text" id="getsrch" placeholder="🔍 filter their players…" style="width:100%;margin-bottom:6px;font-size:12px">
        <div style="max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px" id="getbox">${oAssets.map(a=>opt(a,TB.get)).join('')}</div></div>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn" id="propose">Send Offer to GM</button><span id="tbverdict" class="muted" style="flex:1"></span></div>`;
  m.appendChild(pb);
  // wire builder
  setTimeout(()=>{
    $('#toteam').onchange=e=>{ TB.other=e.target.value; TB.get=[]; render(); };
    const wireSearch=(inp,box)=>{ const i=$(inp); if(i) i.oninput=()=>{ const q=i.value.toLowerCase(); $(box).querySelectorAll('label.opt').forEach(l=>{ l.style.display=l.textContent.toLowerCase().includes(q)?'':'none'; }); }; };
    wireSearch('#givesrch','#givebox'); wireSearch('#getsrch','#getbox');
    $('#givebox').querySelectorAll('input').forEach(cb=>cb.onchange=()=>{ const a=myAssets.find(x=>aId(x)===cb.dataset.aid); if(cb.checked)TB.give.push(a); else TB.give=TB.give.filter(x=>aId(x)!==cb.dataset.aid); $('#gv').textContent=pkgVal(TB.give); });
    $('#getbox').querySelectorAll('input').forEach(cb=>cb.onchange=()=>{ const a=oAssets.find(x=>aId(x)===cb.dataset.aid); if(cb.checked)TB.get.push(a); else TB.get=TB.get.filter(x=>aId(x)!==cb.dataset.aid); $('#rv').textContent=pkgVal(TB.get); });
    $('#propose').onclick=()=>{ if(!TB.give.length||!TB.get.length){toast('Pick players/picks on both sides.');return;}
      const v=$('#tbverdict'); v.textContent='The GM is reviewing…'; const give=TB.give.slice(),get=TB.get.slice(),oth=TB.other;
      claudeGM(give,get,oth,(nn,ai)=>{
        const verdict = ai? ai.verdict : (nn.accept?'ACCEPT':'REJECT');
        if(verdict==='ACCEPT'){ v.innerHTML=`<span class="good">✓ ${ai?ai.reason:'Deal accepted.'}</span>`; setTimeout(()=>{ execTrade(give,get,oth); TB={give:[],get:[],other:oth}; G._offers=null; },500); }
        else if(verdict==='COUNTER'){ v.innerHTML=`<span class="acc">↔ Counter: ${ai?(ai.counter||ai.reason):'they want more.'}</span>`; }
        else { v.innerHTML=`<span class="bad">✗ ${ai?ai.reason:nn.line}</span>`; }
      });
    };
  },0);
}
window.acceptOffer=(i)=>{ const o=(G._offers||[])[i]; if(!o)return; G._offers.splice(i,1); execTrade(o.give,o.get,o.other); };
window.declineOffer=(i)=>{ if(G._offers)G._offers.splice(i,1); toast('Passed on the offer.'); save(); render(); };
let FANEG=null;   // id of the FA currently being negotiated
let FAQ={q:'',pos:'ALL',sort:'ovr'};
function scrFA(m,t){
  buildFAPool(); head(m,'Free Agency',`${G.faPool.length} available · cap space ${money(capSpace(t))} · search, sort, and negotiate with agents`);
  const desBar=d=>{ const seg=(c,v)=>`<span style="display:inline-block;height:6px;width:${Math.round(v*46)}px;background:${c}"></span>`;
    return `<span title="money/winning/role/loyalty">${seg('var(--acc2)',d.money)}${seg('var(--good)',d.winning)}${seg('var(--acc)',d.role)}${seg('#c4b5ff',d.loyalty)}</span>`; };
  // ---- search + filter + sort controls ----
  const POSES=['ALL','QB','RB','WR','TE','OL','DL','LB','DB','K','P']; const GRP={T:'OL',G:'OL',C:'OL',DE:'DL',DT:'DL',OLB:'LB',ILB:'LB',CB:'DB',S:'DB',FB:'RB'};
  const ctrl=el('div','card'); ctrl.style.cssText='margin-bottom:10px';
  ctrl.innerHTML=`<div class="row" style="flex-wrap:wrap;gap:8px;align-items:center">
    <input type="text" id="faq" placeholder="🔍 Search free agents by name…" value="${FAQ.q}" style="flex:1;min-width:200px">
    <select id="fapos">${POSES.map(p=>`<option ${FAQ.pos===p?'selected':''}>${p}</option>`).join('')}</select>
    <select id="fasort">${[['ovr','OVR ↓'],['age','Age ↑'],['ask','Ask $ ↓'],['pos','Position']].map(([k,l])=>`<option value="${k}" ${FAQ.sort===k?'selected':''}>${l}</option>`).join('')}</select>
  </div>`;
  m.appendChild(ctrl);
  let pool=G.faPool.slice();
  if(FAQ.q) pool=pool.filter(p=>p.name.toLowerCase().includes(FAQ.q.toLowerCase()));
  if(FAQ.pos!=='ALL') pool=pool.filter(p=>(GRP[p.pos]||p.pos)===FAQ.pos);
  pool.sort(FAQ.sort==='age'?(a,b)=>a.age-b.age:FAQ.sort==='ask'?(a,b)=>b.askAAV-a.askAAV:FAQ.sort==='pos'?(a,b)=>a.pos.localeCompare(b.pos)||b.ovr-a.ovr:(a,b)=>b.ovr-a.ovr);
  const c=el('div','card'); const tbl=el('table');
  tbl.innerHTML=`<tr><th>Pos</th><th>Player</th><th>Age</th><th>OVR</th><th>Wants (mny·win·role·loy)</th><th>Ask</th><th>Top suitor</th><th></th></tr>`+
    (pool.length? pool.slice(0,60).map(p=>{ const s=faSuitors(p)[0]; const lead = s? `${s.t.abbr}` : '—';
      return `<tr><td><span class="tag">${p.pos}</span></td><td class="pname" onclick="showPlayer(${p.id})">${p.name}</td><td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td>${desBar(p.desires)}</td><td>${money(p.askAAV)}·${p.askYears}y</td><td class="muted">${lead}</td><td><button class="btn" style="padding:3px 10px" onclick="signFA(${p.id})">Negotiate</button></td></tr>`; }).join('')
      : `<tr><td colspan="8" class="muted" style="text-align:center;padding:14px">No free agents match your search.</td></tr>`);
  c.appendChild(tbl); m.appendChild(c);
  setTimeout(()=>{ const q=$('#faq'); if(q){ q.oninput=()=>{ FAQ.q=q.value; }; q.onchange=()=>render(); q.onkeyup=e=>{ if(e.key==='Enter'){FAQ.q=q.value;render();} }; }
    const ps=$('#fapos'); if(ps) ps.onchange=()=>{ FAQ.pos=ps.value; render(); };
    const so=$('#fasort'); if(so) so.onchange=()=>{ FAQ.sort=so.value; render(); }; },0);
}
/* ---------- THE DRAFT — a live, pick-by-pick event with commentary ---------- */
let DRAFT=null;
function buildDraftOrder(){
  G.teams.forEach(t=>ensurePicks(t));
  const draftYear=G.season+1, R=(G.rules&&G.rules.draftRounds)||7, snake=!!(G.rules&&G.rules.draftSnake);
  let slots=standings().slice().reverse();   // worst record picks first
  if(G.rules&&G.rules.draftOrder==='lottery'){   // weighted lottery among the bottom of the league for the early picks
    const L=Math.min(slots.length,Math.max(4,Math.round(slots.length*0.45))), bottom=slots.slice(0,L), rest=slots.slice(L), reorder=[];
    while(bottom.length){ let tot=0; bottom.forEach((t,i)=>tot+=(bottom.length-i)); let r=ENG.rng()*tot, idx=bottom.length-1;
      for(let i=0;i<bottom.length;i++){ r-=(bottom.length-i); if(r<=0){idx=i;break;} } reorder.push(bottom.splice(idx,1)[0]); }
    slots=[...reorder,...rest];
  }
  const order=[]; let overall=0;
  for(let round=1;round<=R;round++){ const seq=(snake&&round%2===0)?slots.slice().reverse():slots;
    seq.forEach(slot=>{ overall++;
      const owner=G.teams.find(tm=>(tm.picks||[]).some(pk=>pk.year===draftYear&&pk.round===round&&pk.from===slot.abbr))||slot;
      order.push({overall,round,slot:slot.abbr,owner:owner.abbr,year:draftYear}); }); }
  return order;
}
function startDraft(){
  G.prospects.sort((a,b)=>b.grade-a.grade);
  DRAFT={active:true, order:buildDraftOrder(), idx:0, made:[], onClock:false, simRest:false};
  G.draft=DRAFT; G.phase='draft'; VIEW='draft'; save(true); render();
  setTimeout(draftStep, 600);
}
// AI drafts off its OWN scouted view (scoutEstimate.score), not perfect grade knowledge —
// so a rich, well-staffed club drafts sharply while a one-intern club reaches on busts.
function aiPickFor(owner){ const nd=ENG.needs(owner); ensureScoutDept(owner);
  return G.prospects.slice(0,40).map(p=>({p,v:scoutEstimate(p,owner)}))
    .sort((a,b)=>(b.v.score+(nd[b.p.pos]||0)*3)-(a.v.score+(nd[a.p.pos]||0)*3))[0]?.p || G.prospects[0]; }
function makePickFor(ownerAbbr, prospect, pi){
  const owner=team(ownerAbbr); const ovr=rookieOverall(prospect);
  owner.picks=(owner.picks||[]).filter(pk=>!(pk.year===pi.year&&pk.round===pi.round&&pk.from===pi.slot));
  const rookieMorale=ENG.clamp(72+(pi.round<=1?10:pi.round<=2?6:pi.round<=4?3:0)+ENG.ri(-3,3),55,96);   // higher picks arrive more confident
  owner.roster.push({id:prospect.id,first:prospect.first,last:prospect.last,name:prospect.name,pos:prospect.pos,age:prospect.age,ovr,num:jerseyNumber(owner,prospect.pos),attrs:{OVR:ovr},starter:false,depth:9,morale:rookieMorale,salary:ENG.round1(Math.max(0.9,(8-(prospect.projRound||4))*1.4)),years:4,rookie:true,
    pot:prospect._ceiling||ENG.clamp(ovr+ENG.ri(2,14),50,99),                                  // hidden true ceiling
    workEthic:prospect.workEthic,temperament:prospect.temperament,bustRisk:prospect.bustRisk,archetype:prospect.archetype,gem:prospect.gem,lateBloom:prospect.lateBloom,draftGrade:prospect.grade,collegeHonors:prospect.honors||null,
    seasons:0,peak:ovr,draftedBy:ownerAbbr,draftOverall:pi.overall,draftYear:pi.year});
  G.prospects=G.prospects.filter(x=>x.id!==prospect.id);
  const reach=pi.round-(prospect.projRound||pi.round);
  if(owner.fans){ owner.fans.morale=ENG.clamp((owner.fans.morale||60) + (reach<=-1?2:reach>=2?-1:0) + (pi.round===1?1:0), 5, 99); }   // fanbase reacts to value/reach (public info)
  const blurb=window.VOICES?VOICES.draftCommentary(owner,prospect,pi.overall,pi.round):'';
  DRAFT.made.unshift({overall:pi.overall,round:pi.round,year:pi.year,owner:ownerAbbr,via:pi.slot!==ownerAbbr?pi.slot:null,name:prospect.name,pos:prospect.pos,school:prospect.school,grade:prospect.grade,blurb,user:ownerAbbr===USER});
  if(window.VOICES && (pi.overall<=32 || ownerAbbr===USER)) VOICES.feedDraftPick(owner,prospect,pi.overall,pi.round,reach);   // only the meaningful picks make the social timeline (Day-3 picks don't flood it)
  if(ownerAbbr===USER) addNews('DRAFT',`R${pi.round} (#${pi.overall}): ${owner.city} select ${prospect.name} (${prospect.pos}, ${prospect.school}).`);
  if(AI.ready() && (pi.overall<=15 || ownerAbbr===USER)) aiDraftBlurb(DRAFT.made[0]);   // Claude adds a sharper line (async)
}
function draftStep(){
  if(!DRAFT||!DRAFT.active) return;
  if(DRAFT.idx>=DRAFT.order.length || !G.prospects.length){ finishDraft(); return; }
  const pi=DRAFT.order[DRAFT.idx];
  if(pi.owner===USER && !DRAFT.simRest){ const au=team(USER).auto;
    if(au&&au.master&&au.draft){ const t=team(USER), nd=ENG.needs(t); const p=scoutedProspects(t,18).sort((a,b)=>(scoutBoardScore(b,t)+(nd[b.pos]||0)*2.2)-(scoutBoardScore(a,t)+(nd[a.pos]||0)*2.2))[0]||aiPickFor(t);
      makePickFor(USER,p,pi); DRAFT.idx++; if(DRAFT.idx>=DRAFT.order.length||!G.prospects.length){ render(); finishDraft(); return; } render(); setTimeout(draftStep, DRAFT.simRest?0:400); return; }
    DRAFT.onClock=true; DRAFT.deadline=Date.now()+90000; VIEW='draft'; render(); return; }   // your pick — the war-room clock starts
  makePickFor(pi.owner, aiPickFor(team(pi.owner)), pi); DRAFT.idx++;
  if(DRAFT.idx>=DRAFT.order.length || !G.prospects.length){ render(); finishDraft(); return; }
  render(); setTimeout(draftStep, DRAFT.simRest?0:600);
}
function draftSelect(pid){ if(!DRAFT||!DRAFT.onClock)return; const p=G.prospects.find(x=>x.id===pid); if(!p)return;
  const pi=DRAFT.order[DRAFT.idx]; const est=scoutEstimate(p, team(USER));   // capture your pre-pick read for the reveal verdict
  if(window._draftClockTimer){ clearInterval(window._draftClockTimer); window._draftClockTimer=null; }
  makePickFor(USER,p,pi); DRAFT.idx++; DRAFT.onClock=false; DRAFT.deadline=null;
  const rp=team(USER).roster.find(x=>x.id===p.id); render();
  if(rp) showDraftReveal(rp, est, pi);   // THE REVEAL — true OVR, ceiling, makeup unlocked now that he's yours
  if(DRAFT.idx<DRAFT.order.length && G.prospects.length) setTimeout(draftStep,650); else finishDraft(); }
function draftAutoUser(){ if(!DRAFT||!DRAFT.onClock)return; const t=team(USER), nd=ENG.needs(t);
  const p=scoutedProspects(t,18).sort((a,b)=>(scoutBoardScore(b,t)+(nd[b.pos]||0)*2.2)-(scoutBoardScore(a,t)+(nd[a.pos]||0)*2.2))[0] || aiPickFor(t);
  draftSelect(p.id);
}
function draftSimRest(){ if(!DRAFT)return; DRAFT.simRest=true; if(DRAFT.onClock){ DRAFT.onClock=false; setTimeout(draftStep,0); } render(); }
function finishDraft(){
  if(!DRAFT)return; DRAFT.active=false; DRAFT.onClock=false;
  const draftYear=G.season+1;
  G.teams.forEach(t=>{ t.picks=(t.picks||[]).filter(pk=>pk.year>draftYear); ensurePicks(t); });   // preserve traded future picks
  addNews('DRAFT',`The ${G.season} draft is complete — ${DRAFT.made.length} selections.`);
  startNewSeasonAfterDraft();
}
async function aiDraftBlurb(pickRec){ try{ const owner=team(pickRec.owner);
  const sys='You are a sharp NFL draft analyst on a fictional-league broadcast. In ONE punchy sentence (max 30 words), react to a draft pick. Ground it in the data; no fluff.';
  const usr=`The ${owner.city} ${owner.nick} just drafted ${pickRec.name}, a ${pickRec.pos} from ${pickRec.school}, with pick #${pickRec.overall} (round ${pickRec.round}). Scouting grade ${pickRec.grade}/84. Give the instant analysis.`;
  const txt=await AI.call(sys,usr,90); if(txt){ pickRec.blurb=txt.trim(); pickRec.byAI=true; if(VIEW==='draft')render(); } }catch(e){} }
window.draftSelect=draftSelect; window.draftAutoUser=draftAutoUser; window.draftSimRest=draftSimRest;

/* ========================= DRAFT WAR ROOM ========================= */
function potLabel(pot){ return pot>=92?'franchise cornerstone':pot>=86?'future Pro Bowl ceiling':pot>=80?'quality NFL starter':pot>=74?'solid contributor':pot>=68?'rotational piece':'developmental project'; }
const ARCHE_DESC={
  boom:'Boom-or-bust — a sky-high ceiling riding on real bust risk.',
  sleeper:'Sleeper — your staff sees a player the consensus board missed.',
  floor:'High-floor — pro-ready, dependable, very low bust risk.',
  risk:'Character risk — the talent is there; the makeup is the question.',
  solid:'Solid — a steady, projectable pro with a defined role.',
  gem:'Hidden gem — the whole league misjudged him. The tape lies; the ceiling is real.',
  flier:'Developmental flier — raw, late-round traits the staff is betting on. Could be a camp body… could be the steal nobody saw.'
};
ARCHE_LBL.flier='developmental flier';
const POS_GROUPS=[['ALL','All'],['QB','QB'],['RB','RB'],['WR','WR'],['TE','TE'],['OL','OL'],['DL','DL'],['LB','LB'],['DB','DB']];
const POS_IN_GROUP={OL:['T','G','C','OT','OG','OL'],DL:['DE','DT','EDGE','NT','DL'],LB:['LB','ILB','OLB','MLB'],DB:['CB','S','FS','SS','DB','NB']};
function prospectInGroup(p,g){ if(g==='ALL')return true; if(POS_IN_GROUP[g])return POS_IN_GROUP[g].includes(p.pos); return p.pos===g; }
function traitBar(label,v){ v=ENG.clamp(v||60,0,99); const col=v>=80?'#46d39a':v>=62?'#5bbcff':v>=48?'#e8b341':'#ef5b6b';
  return `<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:11px"><span class="muted">${label}</span><b style="color:${col}">${v}</b></div>
    <div style="height:6px;background:#0c1320;border-radius:4px;overflow:hidden"><div style="height:100%;width:${v}%;background:${col}"></div></div></div>`; }

// THE REVEAL — true OVR, hidden ceiling, archetype and makeup unlocked the moment a player becomes yours.
window.showDraftReveal=(rp, est, pi)=>{
  if(!rp) return; est=est||{est:rp.draftGrade||rp.ovr,level:0,conf:'Public'};
  const trueGrade=rp.draftGrade||rp.ovr, diff=trueGrade-(est.est||trueGrade);
  const verdict = (est.level||0)<3 ? {t:'BOARD GAMBLE',c:'#e8b341',s:`You had only a ${(est.conf||'public').toLowerCase()} look — this was a swing on the board.`}
    : diff>=5 ? {t:'STEAL',c:'#46d39a',s:`Your board had him at ${est.est}; he checks in at ${trueGrade}. The war room nailed it.`}
    : diff<=-5 ? {t:'REACH',c:'#ef5b6b',s:`Your board had him at ${est.est}; he grades out at ${trueGrade}. A bet on traits over the tape.`}
    : {t:'ON TARGET',c:'#5bbcff',s:`Right where your scouts had him (${est.est}). Clean, confident pick.`};
  const owner=team(USER), arche=rp.archetype||'solid';
  // a true hidden gem stays a SECRET at the draft (unless you fully cross-checked him) — the Brady surprise emerges through development.
  const isGem = !!rp.gem && (est.level||0)<5;
  const showPot = isGem ? Math.min(rp.pot, (rp.draftGrade||rp.ovr)+ENG.ri(4,9)) : rp.pot;
  const showArche = isGem ? 'flier' : arche;
  closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=e=>{ if(e.target.id==='ovl') closeOvl(); };
  o.innerHTML=`<div class="pc" style="width:560px;border:1px solid ${verdict.c}">
    <div class="pchd" style="background:linear-gradient(90deg,${verdict.c}22,transparent)"><div>
      <div class="muted" style="font-size:11px;letter-spacing:.1em">THE PICK IS IN — R${pi?pi.round:'?'} · #${pi?pi.overall:'?'}</div>
      <div class="big">${rp.name}</div><div class="muted">${rp.pos} · ${rp.school||''} · ${owner.city} ${owner.nick}</div></div>
      <span class="x" onclick="closeOvl()">✕</span></div>
    <div class="pcbody">
      <div style="text-align:center;margin:2px 0 14px"><span style="display:inline-block;background:${verdict.c};color:#08111f;font-weight:800;font-size:13px;letter-spacing:.08em;padding:4px 14px;border-radius:14px">${verdict.t}</span>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin:9px 4px 0">${verdict.s}</p></div>
      <div class="cards" style="grid-template-columns:repeat(2,1fr);margin-bottom:12px">
        <div class="card" style="text-align:center"><h3>Overall</h3><div class="stat">${ovrBadge(rp.ovr)}</div><div class="muted">true rating, unlocked</div></div>
        <div class="card" style="text-align:center"><h3>Ceiling</h3><div class="stat" style="color:${showPot>=86?'#46d39a':showPot>=78?'#5bbcff':'#e8b341'}">${showPot}${isGem?'?':''}</div><div class="muted">${isGem?'projected — raw upside':potLabel(showPot)}</div></div></div>
      <div class="card" style="margin-bottom:10px"><h3>Player Profile — ${(ARCHE_LBL[showArche]||showArche)}</h3>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin:2px 0 8px">${ARCHE_DESC[showArche]||'A projectable pro.'}</p>
        ${traitBar('Work ethic',rp.workEthic)}${traitBar('Temperament',rp.temperament)}
        <div class="muted" style="font-size:11px;margin-top:6px">Bust risk: <b style="color:${rp.bustRisk>=0.55?'#ef5b6b':rp.bustRisk>=0.38?'#e8b341':'#46d39a'}">${rp.bustRisk>=0.55?'high':rp.bustRisk>=0.38?'moderate':'low'}</b> · these stay hidden on un-drafted prospects.</div></div>
      <p class="muted" style="font-size:12px;line-height:1.5">Welcome to ${owner.city}. ${rp.name} reports to camp at <b>${rp.morale}%</b> morale${(!isGem&&rp.pot>=88)?' — and the building is buzzing about the ceiling.':isGem?' — a long-shot flier, but the makeup intrigues the staff.':rp.bustRisk>=0.55?' — the staff knows the room has to bring out the best in him.':'.'}</p>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" onclick="closeOvl()">Back to the War Room ▶</button></div>
    </div></div>`;
  document.body.appendChild(o);
  // wire the reveal into the league: Gazette headline + buzz on a true steal/franchise piece
  if((est.level||0)>=3 && diff>=6) addNews('DRAFT',`Scouts are calling ${rp.name} (${rp.pos}) a heist for ${owner.city} — board had him five-plus points higher than where he went.`);
  if(rp.pot>=90 && window.VOICES) VOICES.feedPush({n:'@DraftDeskHQ',c:'#5bbcff'},`${owner.abbr} might've just landed the steal of the draft. ${rp.name} has legit franchise-cornerstone tools. War room W.`,'DRAFT',true);
};

// the live 90-second war-room clock (auto-picks BPA-by-need if you let it run out)
function draftStartClock(){
  if(window._draftClockTimer){ clearInterval(window._draftClockTimer); window._draftClockTimer=null; }
  if(!DRAFT||!DRAFT.onClock||!DRAFT.deadline) return;
  const tick=()=>{ const el2=$('#draftclock'); if(!DRAFT||!DRAFT.onClock){ if(window._draftClockTimer){clearInterval(window._draftClockTimer);window._draftClockTimer=null;} return; }
    const ms=Math.max(0,(DRAFT.deadline||0)-Date.now()), s=Math.ceil(ms/1000);
    if(el2){ const mm=Math.floor(s/60), ss=s%60; el2.textContent=`${mm}:${ss<10?'0':''}${ss}`;
      el2.style.color = s<=10?'#ef5b6b':s<=25?'#e8b341':'#46d39a'; }
    if(ms<=0){ clearInterval(window._draftClockTimer); window._draftClockTimer=null; toast('Clock expired — auto-pick.'); draftAutoUser(); } };
  tick(); window._draftClockTimer=setInterval(tick,250);
}
window.draftSetFilter=(g)=>{ window._draftFilter=g; render(); };

// TRADE DOWN — field offers from teams that want to jump up to your slot (war-room realism)
window.draftFieldOffers=()=>{
  if(!DRAFT||!DRAFT.onClock){ toast('You can only field offers while on the clock.'); return; }
  const myIdx=DRAFT.idx, mySlot=DRAFT.order[myIdx];
  // candidates: AI teams picking soon after you (a realistic move up)
  const cands=[]; for(let j=myIdx+2;j<Math.min(DRAFT.order.length,myIdx+14);j++){ const e=DRAFT.order[j]; if(e.owner!==USER && team(e.owner)) cands.push({j,e}); }
  if(!cands.length){ toast('No teams behind you are willing to move up.'); return; }
  // pick up to 3 suitors; comp pick richer the further they jump
  const picks=[]; const step=Math.max(1,Math.floor(cands.length/3));
  for(let i=0;i<cands.length && picks.length<3;i+=step) picks.push(cands[i]);
  const offers=picks.map(({j,e})=>{ const jump=DRAFT.order[j].overall-mySlot.overall; const compRound=jump>=12?2:jump>=7?3:jump>=4?4:5;
    return {j,owner:e.owner,overall:DRAFT.order[j].overall,compRound,compYear:G.season+2,jump}; });
  closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=ev=>{ if(ev.target.id==='ovl') closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:560px;width:94%';
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">📞 The Phones Are Ringing</h2><button class="btn sec" id="dfx">✕</button></div>
    <p class="muted" style="font-size:12px">Trade <b>down</b> from pick #${mySlot.overall}. You'll pick later — and bank a future pick. (You keep board control; the suitor jumps ahead of the run on a position.)</p>
    <div id="dofflist"></div>`;
  const list=box.querySelector('#dofflist');
  offers.forEach((of,i)=>{ const ot=team(of.owner); const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px';
    row.innerHTML=`<div style="display:flex;align-items:center;gap:10px">${logoTag(ot,26)}<div><b>${ot.city} ${ot.nick}</b> want pick #${mySlot.overall}<div class="muted" style="font-size:11px">You drop to #${of.overall} (−${of.jump}) and get their <b>${of.compYear} Round ${of.compRound}</b> pick.</div></div></div>
      <button class="btn" data-i="${i}">Accept</button>`;
    list.appendChild(row); });
  o.appendChild(box); document.body.appendChild(o);
  box.querySelector('#dfx').onclick=closeOvl;
  list.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{ draftAcceptTrade(offers[+b.dataset.i]); });
};
function draftAcceptTrade(of){
  if(!DRAFT||!DRAFT.onClock||!of) return;
  const myIdx=DRAFT.idx, a=DRAFT.order[myIdx], b=DRAFT.order[of.j]; if(!a||!b) return;
  const suitor=team(of.owner), me=team(USER);
  const tmp=a.owner; a.owner=b.owner; b.owner=tmp;   // swap who picks at each slot
  me.picks=me.picks||[]; me.picks.push({year:of.compYear,round:of.compRound,from:of.owner,via:'trade'});   // comp pick to you
  if(window.VOICES) VOICES.feedTrade?.([{kind:'pick',year:a.year,round:a.round}],[{kind:'pick',year:of.compYear,round:of.compRound},{kind:'pick',year:b.year,round:b.round}],me,suitor);
  addNews('TRADE',`${me.city} trade down — sending pick #${a.overall} to ${suitor.city} for #${b.overall} and a ${of.compYear} R${of.compRound}.`);
  toast(`Traded down to #${b.overall}; banked a ${of.compYear} R${of.compRound} pick.`);
  DRAFT.onClock=false; DRAFT.deadline=null; if(window._draftClockTimer){clearInterval(window._draftClockTimer);window._draftClockTimer=null;}
  closeOvl(); render(); setTimeout(draftStep,400);
}
window.draftAcceptTrade=draftAcceptTrade;

// THE DRAFT IS A TELEVISED EVENT — the commissioner's podium call for a pick (the draft's play-by-play).
const DRAFT_POS_NOUN={QB:'a QUARTERBACK',RB:'a RUNNING BACK',WR:'a WIDE RECEIVER',TE:'a TIGHT END',T:'an OFFENSIVE TACKLE',G:'a GUARD',C:'a CENTER',DE:'an EDGE RUSHER',DT:'a DEFENSIVE TACKLE',OLB:'an EDGE',ILB:'a LINEBACKER',MLB:'a LINEBACKER',LB:'a LINEBACKER',CB:'a CORNERBACK',S:'a SAFETY',FS:'a SAFETY',SS:'a SAFETY',K:'a KICKER',P:'a PUNTER'};
function draftPodiumLead(pk){
  return pk.overall===1?'WITH THE FIRST OVERALL PICK': pk.overall<=5?`WITH THE NO. ${pk.overall} PICK`: pk.round===1?`ON THE CLOCK AT ${pk.overall} OVERALL`:`WITH PICK ${pk.overall}, ROUND ${pk.round}`;
}
// the big "the pick is in" announcement card for the most recent selection
function draftPodiumHTML(){
  if(!DRAFT||!DRAFT.made||!DRAFT.made.length) return `<div class="card" style="text-align:center;border:1px solid var(--line)"><div class="muted" style="letter-spacing:.14em;font-size:12px">🎙️ THE COMMISSIONER STEPS TO THE PODIUM…</div><div style="font-size:15px;margin-top:4px">${G.season} Draft is underway.</div></div>`;
  const pk=DRAFT.made[0], ot=team(pk.owner), noun=DRAFT_POS_NOUN[pk.pos]||('a '+pk.pos), c=pk.user?'#5bbcff':'#caa46a';
  return `<div class="card" style="text-align:center;border:1px solid ${c};background:radial-gradient(circle at 50% 0%, ${c}1f, transparent 70%);overflow:hidden">
    <div class="muted" style="font-family:var(--mono);letter-spacing:.16em;font-size:11px">🎙️ AT THE PODIUM</div>
    <div style="font-weight:800;letter-spacing:.08em;font-size:13px;color:${c};margin:5px 0 2px">${draftPodiumLead(pk)}, THE ${ot.city.toUpperCase()} ${ot.nick.toUpperCase()} SELECT…</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:6px 0 2px">${logoTag(ot,40)}
      <div><div class="big" style="font-size:30px;line-height:1.05;font-family:var(--disp,sans-serif);font-weight:900">${pk.name}</div>
      <div class="muted" style="font-size:13px;margin-top:2px">${noun.replace(/^an? /,'').toUpperCase()} · ${pk.school}${pk.via?` · via ${pk.via}`:''}</div></div></div>
    <div style="font-weight:800;letter-spacing:.2em;font-size:11px;color:${c};margin-top:6px">✓ THE PICK IS IN</div>
    ${pk.blurb?`<p class="muted" style="font-size:12.5px;line-height:1.5;margin:8px auto 0;max-width:620px;font-style:italic">${esc(pk.blurb)} ${pk.byAI?'<span class="acc">✨</span>':''}</p>`:''}</div>`;
}
function scrDraft(m,t){
  // ---- LIVE DRAFT WAR ROOM ----
  if(DRAFT && DRAFT.active){
    const pi=DRAFT.order[DRAFT.idx]; const onClock=DRAFT.onClock&&pi&&pi.owner===USER;
    const oc=pi?team(pi.owner):null;
    const filt=window._draftFilter||'ALL';
    head(m,`${G.season} NFL Draft — War Room`,`Pick ${pi?pi.overall:DRAFT.order.length} of ${DRAFT.order.length} · Round ${pi?pi.round:7}`);
    m.insertAdjacentHTML('beforeend', draftPodiumHTML());   // the televised "the pick is in" announcement — the draft's play-by-play
    // how many picks until YOU are on the clock
    const myNextIdx=DRAFT.order.findIndex((e,j)=>j>=DRAFT.idx && e.owner===USER);
    const picksAway = onClock?0 : (myNextIdx>=0 ? myNextIdx-DRAFT.idx : -1);
    // ---- on-the-clock banner with the live clock ----
    const ban=el('div','card'); ban.style.marginTop='10px'; ban.style.cssText+=';border:1px solid '+(onClock?'#f0b23f':'var(--line,#1b2940)')+';display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap'+(onClock?';box-shadow:0 0 0 1px #f0b23f55':'');
    ban.innerHTML=`<div style="display:flex;align-items:center;gap:12px">${oc?logoTag(oc,38):''}<div><div class="muted" style="font-size:11px;letter-spacing:.08em">${onClock?'🟢 YOU ARE ON THE CLOCK':'ON THE CLOCK'}</div><h3 style="margin:2px 0">${oc?oc.city+' '+oc.nick:'—'} ${pi&&pi.slot!==pi.owner?`<span class="muted" style="font-size:12px">(via ${pi.slot})</span>`:''}</h3><span class="muted">Round ${pi?pi.round:''} · Pick ${pi?pi.overall:''}${picksAway>0?` · <span class="acc">🎯 you're up in ${picksAway} pick${picksAway>1?'s':''}</span>`:picksAway<0?' · <span class="muted">no more picks for you</span>':''}</span></div></div>
      <div style="display:flex;align-items:center;gap:14px">${onClock?`<div style="text-align:center"><div class="muted" style="font-size:10px;letter-spacing:.1em">CLOCK</div><div id="draftclock" style="font-family:var(--mono);font-weight:800;font-size:28px;line-height:1">1:30</div></div>`:''}
      <div class="flex" style="gap:8px;flex-wrap:wrap">${onClock?`<button class="btn" id="dauto">⚡ Auto-pick</button><button class="btn sec" id="dtrade">📞 Field offers</button>`:''}<button class="btn sec" id="dsimrest">⏭ Sim rest</button></div></div>`;
    m.appendChild(ban);

    const nd=ENG.needs(t); const needList=Object.keys(nd).filter(k=>nd[k]>0).sort((a,b)=>nd[b]-nd[a]).slice(0,5);
    const myNeeds=needList.slice(0,4);
    const myPicks=DRAFT.order.filter((e,j)=>j>=DRAFT.idx && e.owner===USER);
    const nextPick=myPicks[0];

    const wrap=el('div'); wrap.style.cssText='display:flex;gap:12px;margin-top:12px;align-items:flex-start;flex-wrap:wrap';
    // ===== LEFT RAIL: your war room =====
    const rail=el('div','card'); rail.style.cssText='flex:1 1 230px;min-width:220px;max-width:300px';
    const sd=scoutRating(t);
    rail.innerHTML=`<h3 style="margin:0 0 8px">🧠 ${t.abbr} War Room</h3>
      <div class="muted" style="font-size:11px;letter-spacing:.06em;margin-bottom:4px">TEAM NEEDS</div>
      ${needList.length?needList.map(p=>{ const sev=nd[p]; const c=sev>=3?'#ef5b6b':sev>=2?'#e8b341':'#5bbcff'; return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0"><span><span class="tag">${p}</span></span><span style="color:${c};font-size:11px;font-weight:700">${sev>=3?'critical':sev>=2?'need':'depth'}</span></div>`; }).join(''):'<div class="muted" style="font-size:12px">Roster is balanced.</div>'}
      <div class="muted" style="font-size:11px;letter-spacing:.06em;margin:12px 0 4px">YOUR PICKS LEFT (${myPicks.length})</div>
      ${myPicks.length?myPicks.slice(0,6).map(e=>`<div class="muted" style="font-size:12px;padding:2px 0">R${e.round} · #${e.overall}${e===nextPick?' <span class="acc" style="font-size:10px">NEXT</span>':''}</div>`).join(''):'<div class="muted" style="font-size:12px">No more picks.</div>'}
      <div class="muted" style="font-size:11px;letter-spacing:.06em;margin:12px 0 4px">SCOUT DEPARTMENT</div>
      <div style="font-size:12px">Lead scout rating <b style="color:${sd>=82?'#46d39a':sd>=70?'#5bbcff':'#e8b341'}">${sd}</b><div class="muted" style="font-size:11px;margin-top:2px">Better scouts → tighter grade bands. Scout prospects on the Scouting screen between weeks.</div></div>`;
    wrap.appendChild(rail);

    // ===== CENTER: the big board (filterable, clickable) =====
    const board=el('div','card'); board.style.cssText='flex:3 1 420px;min-width:340px';
    let boardList=scoutedProspects(t, 80).filter(p=>prospectInGroup(p,filt)).slice(0,40);
    const filterBtns=POS_GROUPS.map(([g,lbl])=>`<button class="btn ${filt===g?'':'sec'}" style="padding:3px 9px;font-size:11px" onclick="draftSetFilter('${g}')">${lbl}</button>`).join(' ');
    board.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><h3 style="margin:0">📋 Big Board ${onClock?'<span class="acc" style="font-weight:400;font-size:11px">— DRAFT to select</span>':'<span class="muted" style="font-weight:400;font-size:11px">— click a name to study</span>'}</h3></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 4px">${filterBtns}</div>`;
    const tbl=el('table'); tbl.style.marginTop='4px';
    tbl.innerHTML='<tr><th>#</th><th>Prospect</th><th>Pos</th><th>School</th><th>Scout Grd</th><th>Conf</th><th>Proj</th><th></th></tr>'+
      boardList.map((p,i)=>{ const se=scoutEstimate(p,t); const need=myNeeds.includes(p.pos);
        return `<tr><td class="muted">${i+1}</td><td><span class="pname" onclick="showProspect(${p.id})">${p.name}</span>${need?' <span class="acc" title="fills a need">●</span>':''}</td><td><span class="tag">${p.pos}</span></td><td class="muted">${p.school}</td><td>${scoutGradeHTML(p,t,true)}</td><td class="muted">${se.conf}</td><td>R${p.projRound}</td><td>${onClock?`<button class="btn" style="padding:2px 10px;font-size:11px" onclick="draftSelect(${p.id})">Draft</button>`:''}</td></tr>`; }).join('');
    board.appendChild(tbl);
    if(!boardList.length) board.appendChild(el('p','muted','No prospects match this filter.'));
    wrap.appendChild(board);

    // ===== RIGHT: the picks ticker =====
    const logc=el('div','card'); logc.style.cssText='flex:2 1 280px;min-width:240px;max-height:640px;overflow:auto';
    logc.innerHTML='<h3 style="margin:0 0 6px">📡 The Picks</h3>';
    if(!DRAFT.made.length) logc.innerHTML+='<p class="muted">Commissioner steps to the podium…</p>';
    DRAFT.made.slice(0,30).forEach(pk=>{ const ot=team(pk.owner); const row=el('div'); row.style.cssText='padding:8px 0;border-bottom:1px solid var(--line2,#16223a)'+(pk.user?';background:linear-gradient(90deg,#5bbcff14,transparent);padding-left:6px':'');
      row.innerHTML=`<div style="display:flex;align-items:center;gap:7px"><b style="font-family:var(--mono);color:var(--acc,#5bbcff)">${pk.overall}.</b> ${logoTag(ot,18)} <b>${pk.name}</b> <span class="tag">${pk.pos}</span> ${pk.user?'<span class="acc" style="font-size:10px">YOU</span>':''}</div>
        <div class="muted" style="font-size:11.5px;margin-top:3px;line-height:1.4">${pk.blurb||''} ${pk.byAI?'<span class="acc" style="font-size:10px">✨</span>':''}</div>`;
      logc.appendChild(row); });
    wrap.appendChild(logc);
    m.appendChild(wrap);

    setTimeout(()=>{ const a=$('#dauto'); if(a)a.onclick=draftAutoUser; const s=$('#dsimrest'); if(s)s.onclick=draftSimRest;
      const tr=$('#dtrade'); if(tr)tr.onclick=window.draftFieldOffers; if(onClock) draftStartClock(); },0);
    return;
  }
  // ---- DRAFT COMPLETE (just finished) or OFF-SEASON SCOUTING BOARD ----
  head(m,`${G.season} Draft Board`,`${G.prospects.length} prospects on the board · the draft is held each offseason`);
  if(DRAFT && DRAFT.made && DRAFT.made.length){ const rc=el('div','card'); rc.innerHTML='<h3>Your Draft Haul</h3>';
    const mine=DRAFT.made.filter(p=>p.user).sort((a,b)=>a.overall-b.overall);
    rc.innerHTML+= mine.length? mine.map(pk=>`<div style="padding:6px 0;border-bottom:1px solid var(--line2,#16223a)"><b>R${pk.round} #${pk.overall}</b> — ${pk.name} <span class="tag">${pk.pos}</span> <span class="muted">${pk.school}</span><div class="muted" style="font-size:12px">${pk.blurb||''}</div></div>`).join('') : '<p class="muted">No picks this year.</p>';
    m.appendChild(rc); }
  const c2=el('div','card'); c2.style.marginTop='12px'; const tbl=el('table');
  tbl.innerHTML='<tr><th>Rank</th><th>Prospect</th><th>Pos</th><th>School</th><th>Scout Grade</th><th>Conf</th><th>Proj</th></tr>'+
    scoutedProspects(t,30).map((p,i)=>{ const se=scoutEstimate(p,t); return `<tr><td>${i+1}</td><td><span class="pname" onclick="showProspect(${p.id})">${p.name}</span></td><td><span class="tag">${p.pos}</span></td><td class="muted">${p.school}</td><td>${scoutGradeHTML(p,t,true)}</td><td class="muted">${se.conf}</td><td>R${p.projRound}</td></tr>`; }).join('');
  c2.appendChild(tbl); m.appendChild(c2);
}
function scrCollege(m,t){
  ncaaInit(false);
  const c=G.college||{stories:[],heisman:[]};
  head(m,'College Football','Draft universe, Heisman race, and first/second-round storylines');
  const top=G.prospects.slice().sort((a,b)=>b.grade-a.grade).slice(0,64);
  const hero=top[0];
  const lead=el('div','card'); lead.style.cssText='border-color:#2b4768;background:linear-gradient(135deg,#0c1726,#111827)';
  lead.innerHTML=`<div class="row" style="justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">
    <div><div class="muted" style="font-family:var(--mono);font-size:10px;letter-spacing:2px">SATURDAY LEAD</div>
    <h3 style="margin:3px 0">${hero?`${hero.name} · ${hero.school}`:'College board loading'}</h3>
    <div class="muted" style="font-size:13px;line-height:1.5">${hero&&hero.college?`${hero.college.year} ${hero.pos} · ${hero.college.hook}. ${collegeStatLine(hero)}.`:'Advance a week to start the college notebook.'}</div></div>
    <div style="text-align:right"><div class="muted" style="font-size:11px">Board</div><div class="stat s">${top.length}</div><div class="muted" style="font-size:11px">1st/2nd round watch</div></div></div>`;
  m.appendChild(lead);
  // the live college season — ratings-based games, AP Top 25, eventual national champion
  const N=G.ncaa;
  if(N&&N.rankRows&&N.rankRows.length){
    const std=el('div','card'); std.style.marginTop='12px';
    let sh=`<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h3 style="margin:0">AP Top 25 ${N.done?'\u2014 Final':`\u00b7 Week ${N.week}`}</h3>${N.champ?`<span class="tag" style="background:#b9892f;color:#0b0e0c;font-weight:800">\ud83c\udfc6 ${esc(N.champ.name)} \u2014 National Champions</span>`:N.lastUpset?`<span class="muted" style="font-size:11px">Latest shocker: ${esc(N.lastUpset)}</span>`:''}</div>`;
    const tb=el('table'); tb.style.marginTop='8px';
    tb.innerHTML='<tr><th>#</th><th>Team</th><th>Conf</th><th>Rec</th><th>PF/PA</th></tr>'+
      N.rankRows.slice(0,25).map((tm,i)=>`<tr><td>${i+1}</td><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${tm.c};margin-right:6px"></span><b>${esc(tm.name)}</b> <span class="muted">${esc(tm.nick)}</span></td><td class="muted">${esc(tm.conf)}</td><td>${tm.w}-${tm.l}</td><td class="muted">${tm.pf}/${tm.pa}</td></tr>`).join('');
    std.innerHTML=sh; std.appendChild(tb); m.appendChild(std);
  }
  const split=el('div','split'); split.style.marginTop='12px';
  const h=el('div','card'); h.innerHTML='<h3>Heisman Race</h3>';
  const heis=(c.heisman&&c.heisman.length?c.heisman:top.slice(0,8).map(p=>({id:p.id,name:p.name,pos:p.pos,school:p.school,score:collegeHeismanScore(p),line:collegeStatLine(p)})).sort((a,b)=>b.score-a.score));
  h.innerHTML+=heis.slice(0,8).map((x,i)=>`<div style="display:flex;gap:9px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line2,#16223a)">
    <b style="font-family:var(--mono);color:var(--acc)">${i+1}</b><div style="flex:1"><span class="pname" onclick="showProspect(${x.id})">${x.name}</span> <span class="tag">${x.pos}</span><div class="muted" style="font-size:11px">${x.school} · ${x.line}</div></div><b>${x.score}</b></div>`).join('');
  split.appendChild(h);
  const note=el('div','card'); note.innerHTML='<h3>Saturday Notebook</h3>';
  const stories=(c.stories||[]).slice(0,10);
  note.innerHTML+=stories.length?stories.map(s=>`<div class="news" style="font-size:12px"><b>${s.tag||'NCAA'}</b> ${s.txt}</div>`).join(''):'<p class="muted">No college stories yet. Advance a week and Saturdays will start to write themselves.</p>';
  split.appendChild(note); m.appendChild(split);
  const board=el('div','card'); board.style.marginTop='12px'; board.innerHTML='<h3>First & Second Round Universe</h3>';
  const tbl=el('table');
  tbl.innerHTML='<tr><th>#</th><th>Prospect</th><th>Story</th><th>Stats</th><th>Scout Grade</th><th>Stock</th></tr>'+
    top.map((p,i)=>{ const c=p.college||{}; const st=c.stock||0; return `<tr><td>${i+1}</td><td><span class="pname" onclick="showProspect(${p.id})">${p.name}</span> <span class="tag">${p.pos}</span><div class="muted">${p.school} · ${c.year||''}</div></td><td>${c.archLabel||'Prospect'}<div class="muted" style="font-size:11px">${c.hook||''}</div></td><td class="muted">${collegeStatLine(p)}</td><td>${scoutGradeHTML(p,t,true)}</td><td class="${st>0?'good':st<0?'bad':'muted'}">${st>0?'+':''}${st}</td></tr>`; }).join('');
  board.appendChild(tbl); m.appendChild(board);
}
function scrScout(m,t){
  const dept=ensureScoutDept(t); const tier=scoutTier(t).toFixed(1);
  const board=scoutedProspects(t,60);
  const locked=(G.prospects||[]).filter(p=>viewLvl(p,t)>=5).length, looked=(G.prospects||[]).filter(p=>viewLvl(p,t)>0).length;
  head(m,'Scouting Department',`${dept.scouts.length} scout${dept.scouts.length!==1?'s':''} · $${ENG.round1(dept.spent)}M / $${dept.budgetCap}M budget · ${looked} prospects worked · ${locked} board locks`);
  // ---- budget meter ----
  const pct=dept.budgetCap>0?ENG.clamp(dept.spent/dept.budgetCap*100,0,140):0;
  const meterColor=dept.spent>dept.budgetCap?'#ff5d6c':pct>85?'#ffb13f':'#37d39b';
  const bk=el('div','card'); bk.style.marginBottom='12px';
  bk.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Front-Office Budget</h3><b style="color:${meterColor}">$${ENG.round1(dept.spent)}M / $${dept.budgetCap}M</b></div>
    <div class="bar" style="margin-top:8px;height:10px;background:#16223a;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100,pct)}%;background:${meterColor}"></i></div>
    <p class="muted" style="font-size:11px;margin-top:6px">Your owner authorizes a yearly staff budget from market size, profit, and cash. Better, deeper departments tighten grade bands, surface bust risk earlier, and lock the board faster — but cost real P&L money.</p>`;
  m.appendChild(bk);
  // ---- focus board dropdown ----
  const focusRow=el('div','row'); focusRow.style.cssText='align-items:center;gap:8px;margin-bottom:12px';
  focusRow.innerHTML=`<span class="muted" style="font-size:12px">Focus board:</span><select onchange="setScoutFocus(this.value)" style="padding:4px 8px">`+
    SCOUT_SPECIALTIES.map(s=>`<option value="${s}" ${dept.focus===s?'selected':''}>${SCOUT_SPEC_LBL[s]}</option>`).join('')+`</select>`+
    `<span class="muted" style="font-size:11px">— biases which prospects your scouts work first each week.</span>`;
  m.appendChild(focusRow);
  // ---- scout cards ----
  const cards=el('div','cards');
  dept.scouts.forEach(s=>{ const meta=SCOUT_TIERS[s.tier]||SCOUT_TIERS[1];
    cards.appendChild(el('div','card',`<h3>${'★'.repeat(s.tier)}<span class="muted" style="font-weight:400">${'★'.repeat(5-s.tier)}</span></h3>
      <div style="font-weight:800">${esc(s.name)}</div>
      <div class="muted" style="font-size:12px">${meta.title}</div>
      <div class="muted" style="font-size:11px;margin-top:4px">Specialty: <b>${SCOUT_SPEC_LBL[s.specialty]||s.specialty}</b> · $${s.salary}M/yr</div>
      <button class="btn warn" style="padding:3px 10px;margin-top:8px;font-size:11px" onclick="fireScout(${s.id})">Fire</button>`)); });
  const full=dept.scouts.length>=4, broke=dept.spent>=dept.budgetCap;
  const hireCard=el('div','card'); hireCard.style.cssText='display:flex;flex-direction:column;justify-content:center;align-items:center';
  hireCard.innerHTML=`<h3 style="margin:0 0 6px">＋ Hire Scout</h3>`+
    (full?'<div class="muted" style="font-size:11px;text-align:center">Department full (4 slots).</div>':
     broke?'<div class="muted" style="font-size:11px;text-align:center">No budget room — fire a scout or wait for the owner to re-authorize.</div>':
     `<button class="btn" style="padding:4px 12px" onclick="openHireScout()">Open hire menu</button>`);
  cards.appendChild(hireCard);
  m.appendChild(cards);
  // ---- the board ----
  const expl=el('div','news'); expl.style.margin='12px 0'; expl.innerHTML='<b>Confidence ladder:</b> Public → Thin → Area → Position → Cross-check → Board lock. Your department works the board automatically every week — no manual grind.';
  m.appendChild(expl);
  const c=el('div','card'); c.style.marginTop='12px'; const tbl=el('table');
  tbl.innerHTML='<tr><th>#</th><th>Prospect</th><th>Pos</th><th>School</th><th>Scout Grade</th><th>Conf</th><th>Bust Risk</th><th>Color / Flags</th><th>Looks</th></tr>'+
    board.map((p,i)=>{ ensureCollegeProfile(p,(G.prospects||[]).indexOf(p));
      const se=scoutEstimate(p,t), br=bustRead(p,t), lvl=viewLvl(p,t);
      // bust risk cell
      let bustCell;
      if(!br) bustCell='<span class="muted" style="font-size:11px">— deeper look —</span>';
      else { const col=br.label==='HIGH'?'#ff5d6c':br.label==='Moderate'?'#ffb13f':'#37d39b';
        bustCell=`<span style="color:${col};font-weight:700">${br.pct}% ±${br.band}%</span> <span class="muted" style="font-size:10px">${br.label}${br.sure?'':' ~'}</span>`; }
      // color/flags cell
      const flags=[]; const tierE=se.tier||1;
      if(lvl>=colorUnlock('archetype',tierE)) flags.push(`<span class="muted">${(ARCHE_LBL[p.archetype]||p.archetype||'solid')}</span>`);
      if(p.gem && tierE>=4 && lvl>=BUST_UNLOCK[tierE]) flags.push('<span style="color:#37d39b;font-weight:700">GEM ALERT</span>');
      if(br && br.label==='HIGH' && tierE>=3) flags.push('<span style="color:#ff5d6c;font-weight:700">RED FLAG</span>');
      if(lvl>=colorUnlock('scheme',tierE) && (p.college&&p.college.hook)) flags.push('<span class="acc" style="font-size:10px">SCHEME FIT</span>');
      const flagCell=flags.length?flags.join(' · '):'<span class="muted" style="font-size:11px">—</span>';
      // looks dot meter (read-only)
      const dots=Array.from({length:5},(_,k)=>`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:2px;background:${k<lvl?'#5bbcff':'#2a3a55'}"></span>`).join('');
      return `<tr><td>${i+1}</td><td><span class="pname" onclick="showProspect(${p.id})">${p.name}</span></td><td><span class="tag">${p.pos}</span></td><td class="muted">${p.school}</td><td>${scoutGradeHTML(p,t)}</td><td class="muted">${se.conf}</td><td>${bustCell}</td><td style="font-size:11.5px">${flagCell}</td><td title="${lvl}/5 looks">${dots}</td></tr>`;
    }).join('');
  c.appendChild(tbl); m.appendChild(c);
}
window.scout=scout;
// ---- scouting department handlers ----
function openHireScout(){ const t=ut(); const dept=ensureScoutDept(t);
  closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=e=>{ if(e.target.id==='ovl') closeOvl(); };
  const room=dept.budgetCap-dept.spent;
  const tierRows=[1,2,3,4,5].map(tier=>{ const meta=SCOUT_TIERS[tier]; const afford=meta.salary<=room+1e-6;
    return `<div class="card" style="margin-bottom:8px;${afford?'':'opacity:.5'}">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div><b>${'★'.repeat(tier)}${'☆'.repeat(5-tier)} ${meta.title}</b> <span class="muted">— $${meta.salary}M/yr</span></div>
        <select id="spec${tier}" style="padding:3px 6px">${SCOUT_SPECIALTIES.map(s=>`<option value="${s}">${SCOUT_SPEC_LBL[s]}</option>`).join('')}</select>
      </div>
      <div class="muted" style="font-size:11px;margin-top:4px">Grade band ±${TIER_SIGMA[tier]} · bust read unlocks at ${BUST_UNLOCK[tier]} look${BUST_UNLOCK[tier]>1?'s':''} (±${Math.round(BUST_CONF[tier]*100)}%).</div>
      <button class="btn" style="padding:3px 10px;margin-top:6px;font-size:11px" ${afford?'':'disabled'} onclick="hireScoutNew(${tier},document.getElementById('spec${tier}').value)">Hire — $${meta.salary}M/yr</button>
    </div>`; }).join('');
  o.innerHTML=`<div class="pc" style="width:560px"><div class="pchd"><div><div class="big">Hire a Scout</div><div class="muted">Budget room: $${ENG.round1(room)}M of $${dept.budgetCap}M · ${dept.scouts.length}/4 slots used</div></div><span class="x" onclick="closeOvl()">✕</span></div>
    <div class="pcbody">${tierRows}<p class="muted" style="font-size:11px">A deeper, higher-tier department tightens every band, surfaces bust risk and gems earlier, and locks the top of the board faster. Each scout is a recurring P&L cost.</p></div></div>`;
  document.body.appendChild(o);
}
window.openHireScout=openHireScout;
window.hireScoutNew=(tier,specialty)=>{ const t=ut(); const dept=ensureScoutDept(t); tier=ENG.clamp(+tier||1,1,5);
  if(dept.scouts.length>=4){ toast('Department is full (4 scouts).'); return; }
  const salary=SCOUT_SALARY[tier];
  if(dept.spent+salary>dept.budgetCap+1e-6){ toast("Owner won't authorize — over staff budget."); return; }
  dept.scouts.push({id:newScoutId(),name:ENG.coachName(),salary,tier,specialty:(SCOUT_SPECIALTIES.includes(specialty)?specialty:'ALL'),region:'National'});
  dept.spent=ENG.round1(dept.scouts.reduce((a,s)=>a+(s.salary||0),0));
  addNews('STAFF',`${t.city} hire a ${(SCOUT_TIERS[tier]||{}).title} ($${salary}M/yr) to the scouting department.`);
  toast('Scout hired.'); closeOvl(); save(); render(); };
window.fireScout=(id)=>{ const t=ut(); const dept=ensureScoutDept(t);
  const idx=dept.scouts.findIndex(s=>s.id===id); if(idx<0) return;
  dept.scouts.splice(idx,1); dept.spent=ENG.round1(dept.scouts.reduce((a,s)=>a+(s.salary||0),0));
  toast('Scout released.'); save(); render(); };
window.setScoutFocus=(v)=>{ const t=ut(); const dept=ensureScoutDept(t); dept.focus=(SCOUT_SPECIALTIES.includes(v)?v:'ALL'); save(); render(); };

/* =====================================================================
   FRONT-OFFICE ECONOMY — Stadium Development + Finances Levers
   ===================================================================== */
const roofToLevel=r=>r==='dome'?2:r==='retract'?1:0;
const levelToRoof=l=>l>=2?'dome':l>=1?'retract':'open';
// lazy migration so old saves load: stadium amenities, debt ledger, project queue
function ensureStadium(t){ if(!t||!t.stadium) return t&&t.stadium;
  const s=t.stadium;
  if(!s.upgrades) s.upgrades={suites:0,clubs:0,videoboard:0,roofLevel:roofToLevel(s.roof),turf:0,training:0};
  else { const u=s.upgrades; ['suites','clubs','videoboard','turf','training'].forEach(k=>{ if(u[k]==null)u[k]=0; }); if(u.roofLevel==null)u.roofLevel=roofToLevel(s.roof); }
  if(!Array.isArray(s.debt)) s.debt=[];
  if(!Array.isArray(t.stadiumProjects)) t.stadiumProjects=[];
  return s; }
const STADIUM_PROJECTS={
  expand_sm:{label:'Add Upper Deck (+6,000)',kind:'expand',addCap:6000,cost:55,weeks:8,qBump:2,capMax:78000,blurb:'A second-deck expansion — more seats, more gate.'},
  expand_lg:{label:'End-Zone Bowls (+10,000)',kind:'expand',addCap:10000,cost:95,weeks:14,qBump:3,capMax:90000,blurb:'Close the bowls — a true big-house build.'},
  suites:{label:'Luxury Suites',kind:'upgrade',field:'suites',maxTier:3,cost:[40,65,95],weeks:[10,12,14],qBump:[5,4,3],blurb:'Corporate boxes — premium revenue every home game.'},
  clubs:{label:'Premium Club Level',kind:'upgrade',field:'clubs',maxTier:3,cost:[35,55,80],weeks:[8,10,12],qBump:[4,4,3],blurb:'Club seats with concourse access — fans pay up.'},
  videoboard:{label:'Video Board & Sound',kind:'upgrade',field:'videoboard',maxTier:2,cost:[28,46],weeks:[6,8],qBump:[5,4],blurb:'A jaw-dropping board lifts the gameday draw.'},
  roof:{label:'Add Retractable Roof',kind:'upgrade',field:'roofLevel',maxTier:2,cost:[80,140],weeks:[20,30],qBump:[6,6],blurb:'Beat the weather — a roof reshapes home field.'},
  turf:{label:'Playing Surface',kind:'upgrade',field:'turf',maxTier:2,cost:[12,22],weeks:[3,4],qBump:[2,2],blurb:'A modern surface — fewer soft-tissue injuries.'},
  training:{label:'Training Facility',kind:'upgrade',field:'training',maxTier:3,cost:[30,50,75],weeks:[10,12,16],qBump:[3,3,2],blurb:'Sports science & rehab — develops talent, keeps it healthy.'},
  rebuild:{label:'Build New Stadium',kind:'rebuild',setCap:75000,setQuality:92,cost:140,weeks:34,blurb:'Tear it down and start over — a crown jewel.'}};
const projCost=(p,t)=>Array.isArray(p.cost)?p.cost[t]:p.cost;
const projWeeks=(p,t)=>Array.isArray(p.weeks)?p.weeks[t]:p.weeks;
const projQBump=(p,t)=>Array.isArray(p.qBump)?p.qBump[t]:p.qBump;
// the current tier of an upgrade project (0 = none built yet)
function projTier(s,key,p){ if(p.kind!=='upgrade') return 0; return (s.upgrades&&s.upgrades[p.field])||0; }
function projMaxed(s,key,p){ if(p.kind!=='upgrade') return false; return projTier(s,key,p)>=p.maxTier; }
function projQueued(t,key){ return (t.stadiumProjects||[]).some(pr=>pr.key===key); }
function startProject(key,financed){ const t=ut(); const p=STADIUM_PROJECTS[key]; if(!p) return; ensureStadium(t);
  if((t.stadiumProjects||[]).length>=2){ toast('You can only run 2 projects at once.'); return; }
  if(projQueued(t,key)){ toast('That project is already under construction.'); return; }
  const tier=projTier(t.stadium,key,p);
  if(p.kind==='upgrade' && tier>=p.maxTier){ toast('That amenity is already maxed out.'); return; }
  if(p.kind==='expand' && t.stadium.cap+p.addCap>(p.capMax||90000)){ toast('That expansion would exceed the league capacity limit.'); return; }
  const cost=projCost(p,tier);
  if(financed){ const balance=ENG.round1(cost*(1+0.09*4)); const perWk=ENG.round1(balance/(4*22));   // 4-season note @9%/yr simple
    t.stadium.debt.push({name:p.label,principal:cost,balance,rate:0.09,perWk,season0:G.season}); }
  else { if(t.cash<cost){ toast('Not enough cash — try financing it.'); return; } t.cash=ENG.round1(t.cash-cost); }
  const weeks=projWeeks(p,tier);
  t.stadiumProjects.push({key,label:p.label,kind:p.kind,field:p.field,tier,weeksLeft:weeks,totalWeeks:weeks,
    addCap:p.addCap||0,capMax:p.capMax||90000,setCap:p.setCap||0,setQuality:p.setQuality||0,qBump:projQBump(p,tier),financed:!!financed,cost});
  addNews('STADIUM',`🏗️ ${t.city} break ground: ${p.label}${p.kind==='upgrade'&&p.maxTier>1?` (tier ${tier+1})`:''} — ${weeks} weeks${financed?', financed':''}.`);
  toast(financed?'Project financed & under construction.':'Project under construction.'); save(); render(); }
window.startProject=startProject;
// advance every team's active builds; on completion, apply the upgrade/expansion/rebuild
function tickStadiumProjects(t){ ensureStadium(t); const s=t.stadium; if(!t.stadiumProjects||!t.stadiumProjects.length) return;
  const done=[];
  t.stadiumProjects.forEach(pr=>{ pr.weeksLeft--; if(pr.weeksLeft<=0) done.push(pr); });
  done.forEach(pr=>{
    if(pr.kind==='expand'){ s.cap=Math.min((pr.capMax||90000), s.cap+(pr.addCap||0)); }
    else if(pr.kind==='rebuild'){ s.cap=pr.setCap||75000; s.quality=pr.setQuality||92; s.built=G.season;
      s.upgrades={suites:0,clubs:0,videoboard:0,roofLevel:roofToLevel(s.roof),turf:0,training:0}; }
    else if(pr.kind==='upgrade'){ s.upgrades=s.upgrades||{}; s.upgrades[pr.field]=pr.tier+1;
      if(pr.field==='roofLevel'){ s.roof=levelToRoof(s.upgrades.roofLevel); } }
    s.quality=ENG.clamp(s.quality+(pr.qBump||0),0,99);
    addNewsIf(t.abbr===USER,'STADIUM',`✅ ${t.city} complete construction: ${pr.label}. Stadium quality is now ${s.quality}/99.`);
  });
  if(done.length) t.stadiumProjects=t.stadiumProjects.filter(pr=>pr.weeksLeft>0);
}

/* ---------------- FINANCES: deals, pricing, brand, PSLs ---------------- */
const clampMerchFn=t=>ENG.clamp(Math.round((((t&&t.market)||50)+(t&&t.fans?t.fans.base:50))/2),20,95);
function ensureFinance(t){ if(!t) return null; const F=t.finance=t.finance||{};
  if(!Array.isArray(F.deals)) F.deals=[];
  if(!F.pricing) F.pricing={concession:1.0,parking:1.0,psl:0};
  else { if(F.pricing.concession==null)F.pricing.concession=1.0; if(F.pricing.parking==null)F.pricing.parking=1.0; if(F.pricing.psl==null)F.pricing.psl=0; }
  if(!F.brand) F.brand={merch:clampMerchFn(t),fanTrust:70};
  else { if(F.brand.merch==null)F.brand.merch=clampMerchFn(t); if(F.brand.fanTrust==null)F.brand.fanTrust=70; }
  if(!Array.isArray(F.offers)) F.offers=[];
  return F; }
const DEAL_LABEL={naming:'Naming Rights',tv_local:'Local TV',radio:'Radio',jersey:'Jersey Patch',concourse:'Concourse'};
function teamWinPct(t){ const gp=(t.wins||0)+(t.losses||0); return gp?t.wins/gp:0.5; }
function bestRosterOvr(t){ return (t.roster&&t.roster.length)?t.roster.reduce((m,p)=>Math.max(m,p.ovr||0),0):70; }
// generate a fresh offer of a given type for team t
function makeOffer(t,type){ const F=ensureFinance(t); const s=t.stadium; const market=t.market||55, succ=0.6+teamWinPct(t)*0.7+(t._dynasty||0)*0.3;
  const merch=F.brand.merch, q=s.quality||70;
  if(type==='naming'){ const qual=0.7+(q-60)/120, base=(market/100)*9, years=ENG.ri(5,10);
    const perYr=ENG.round1(ENG.clamp(base*succ*qual*(1+(years-7)*0.03),2,28));
    return {type,partner:dealPartner(type),years,perYr,prestige:ENG.round1(ENG.clamp(succ*qual,0.3,1.4))}; }
  if(type==='tv_local'){ const years=ENG.ri(3,5), perYr=ENG.round1(ENG.clamp((market/100)*5*succ,1,12)); return {type,partner:dealPartner(type),years,perYr,prestige:ENG.round1(succ)}; }
  if(type==='radio'){ const years=ENG.ri(3,4), perYr=ENG.round1(ENG.clamp((market/100)*1.8*succ,0.4,4)); return {type,partner:dealPartner(type),years,perYr,prestige:ENG.round1(succ)}; }
  if(type==='jersey'){ const years=ENG.ri(2,4), perYr=ENG.round1(ENG.clamp((market/100)*4*(0.8+merch/100),1,9)); return {type,partner:dealPartner(type),years,perYr,prestige:ENG.round1(ENG.clamp(0.5+merch/120,0.4,1.3))}; }
  if(type==='concourse'){ const years=ENG.ri(3,5), perYr=ENG.round1(ENG.clamp(((s.cap||65000)/1000)*0.12,1,8)); return {type,partner:dealPartner(type),years,perYr,prestige:0.7}; }
  return null; }
const DEAL_BRANDS={naming:['Apex','Vertex','Cobalt','Summit','Ironclad','Helios','Northwind','Granite','Liberty','Stratos','Pinnacle','Vanguard'],
  tv_local:['Channel 7','MetroSports','RegionOne','CityCast','SportsNet'],radio:['97.3 The Fan','SportsRadio','AM Gameday','The Ticket'],
  jersey:['Forge Athletics','Quasar','BoltGear','TrueNorth','Apex Wear'],concourse:['GoldKey Hospitality','Skyline Concessions','Prime Eats','Civic Partners']};
function dealPartner(type){ return ENG.pick(DEAL_BRANDS[type]||['Partner']); }
function activeDeal(t,type){ const F=ensureFinance(t); return (F.deals||[]).find(d=>d.type===type); }
function namingStadiumName(t,partner){ return `${partner} ${t.city} Field`; }
// sign an offer (deal object) for the user team
function signOffer(idx){ const t=ut(); const F=ensureFinance(t); const o=F.offers[idx]; if(!o) return; ensureStadium(t);
  if(o.type==='naming'){ const ex=activeDeal(t,'naming');
    if(ex){ const remaining=Math.max(0,ex.years-(G.season-ex.since)); const buyout=ENG.round1(remaining*ex.perYr*0.5);
      if(!confirm(`Breaking your current naming deal early costs a $${buyout}M buyout and dents fan trust. Sign the new deal?`)) return;
      if(t.cash<buyout){ toast('Not enough cash for the buyout.'); return; }
      t.cash=ENG.round1(t.cash-buyout); F.brand.fanTrust=ENG.clamp(F.brand.fanTrust-6,0,100);
      F.deals=F.deals.filter(d=>d!==ex); }
    t.stadium.name=namingStadiumName(t,o.partner); t.stadium._named=true;
    F.deals.push({type:o.type,partner:o.partner,years:o.years,perYr:o.perYr,since:G.season,prestige:o.prestige});
    addNews('FINANCE',`💰 ${t.city} sign a naming-rights deal: ${t.stadium.name} — $${o.perYr}M/yr for ${o.years} years.`);
  } else {
    let perYr=o.perYr, share=false;
    if((o.type==='tv_local'||o.type==='radio') && o._share){ perYr=ENG.round1(o.perYr*0.6); share=true; }
    const d={type:o.type,partner:o.partner,years:o.years,perYr,since:G.season,prestige:o.prestige}; if(share)d.share=true;
    F.deals.push(d);
    if(o.type==='jersey' && o.prestige<0.6){ F.brand.merch=ENG.clamp(F.brand.merch-3,20,95); d._merchHit=true; }
    addNews('FINANCE',`💰 ${t.city} sign a ${DEAL_LABEL[o.type]||o.type} deal with ${o.partner} — $${perYr}M/yr for ${o.years} yr${share?' (revenue share)':''}.`);
  }
  F.offers.splice(idx,1);
  toast('Deal signed!'); save(); render(); }
window.signOffer=signOffer;
window.passOffer=idx=>{ const t=ut(); const F=ensureFinance(t); F.offers.splice(idx,1); toast('Offer passed.'); save(); render(); };
window.toggleOfferShare=idx=>{ const t=ut(); const F=ensureFinance(t); const o=F.offers[idx]; if(o&&(o.type==='tv_local'||o.type==='radio')){ o._share=!o._share; render(); } };
// pricing sliders (0.7–1.6)
window.setConcession=v=>{ const t=ut(); const F=ensureFinance(t); F.pricing.concession=ENG.clamp(+v,0.7,1.6); if(+v>1.15) F.brand.fanTrust=ENG.clamp(F.brand.fanTrust-0.4,0,100); save(); if(VIEW==='finance')render(); };
window.setParking=v=>{ const t=ut(); const F=ensureFinance(t); F.pricing.parking=ENG.clamp(+v,0.7,1.6); if(+v>1.15) F.brand.fanTrust=ENG.clamp(F.brand.fanTrust-0.3,0,100); save(); if(VIEW==='finance')render(); };
// PSL: one-time lump sum, irreversible, costs fan trust
function sellPSL(tier){ const t=ut(); const F=ensureFinance(t); tier=ENG.clamp(tier|0,1,3); ensureStadium(t);
  if((F.pricing.psl||0)>0){ toast('You have already sold personal seat licenses.'); return; }
  const market=t.market||55, lump=ENG.round1((market/100)*tier*22*(0.7+F.brand.fanTrust/300));
  if(!confirm(`Sell Tier ${tier} PSLs for a one-time $${lump}M? This is irreversible and dents fan trust.`)) return;
  t.cash=ENG.round1(t.cash+lump); F.pricing.psl=tier; F.brand.fanTrust=ENG.clamp(F.brand.fanTrust-tier*2,0,100);
  addNews('FINANCE',`💺 ${t.city} sell Tier ${tier} Personal Seat Licenses — a one-time $${lump}M into the war chest.`);
  toast(`PSLs sold: +$${lump}M.`); save(); render(); }
window.sellPSL=sellPSL;
// offseason: expire deals, drift brand/trust, regenerate offers, AI signs naming
function financeSeasonTick(){ (G.teams||[]).forEach(t=>{ const F=ensureFinance(t); ensureStadium(t);
  // expire deals whose term has run out
  const keep=[];
  (F.deals||[]).forEach(d=>{ const left=(d.years||0)-(G.season-(d.since||G.season));
    if(left<=0){ if(d.type==='naming'){ t.stadium.name=t.city+' Stadium'; t.stadium._named=false; }
      if(d.type==='jersey' && d._merchHit){ F.brand.merch=ENG.clamp(F.brand.merch+3,20,95); }
      addNewsIf(t.abbr===USER,'FINANCE',`📄 ${t.city}'s ${DEAL_LABEL[d.type]||d.type} deal with ${d.partner} has expired.`); }
    else keep.push(d); });
  F.deals=keep;
  // brand drift: fan trust mean-reverts to 70, merch anchors to its baseline (+3 for a dynasty)
  F.brand.fanTrust=ENG.round1(ENG.clamp(F.brand.fanTrust*0.85+70*0.15,0,100));
  const anchor=clampMerchFn(t)+((t._dynasty||0)>=0.6?3:0);
  F.brand.merch=ENG.round1(ENG.clamp(F.brand.merch+(anchor-F.brand.merch)*0.4,20,95));
  if(t.abbr===USER){
    // regenerate offers ONCE per offseason (no reroll farming)
    const offers=[];
    if(!activeDeal(t,'naming')) offers.push(makeOffer(t,'naming'));
    ['tv_local','radio','jersey','concourse'].forEach(ty=>{ if(!activeDeal(t,ty) && ENG.rng()<0.7) offers.push(makeOffer(t,ty)); });
    F.offers=offers.filter(Boolean);
  } else {
    // AI clubs auto-sign naming when open → league stadium names evolve over time
    if(!activeDeal(t,'naming') && ENG.rng()<0.6){ const o=makeOffer(t,'naming'); if(o){ t.stadium.name=namingStadiumName(t,o.partner); t.stadium._named=true;
      F.deals.push({type:'naming',partner:o.partner,years:o.years,perYr:o.perYr,since:G.season,prestige:o.prestige}); } }
    ['tv_local','radio','jersey'].forEach(ty=>{ if(!activeDeal(t,ty) && ENG.rng()<0.4){ const o=makeOffer(t,ty); if(o) F.deals.push({type:o.type,partner:o.partner,years:o.years,perYr:o.perYr,since:G.season,prestige:o.prestige}); } });
  }
}); }

function scrFinance(m,t){
  ensureStadium(t); const F=ensureFinance(t);
  // seed the OPENING offer table once, so a brand-new GM has deals to act on from day one (offers otherwise only refresh at the offseason)
  if(t.abbr===USER && !F._seeded){ F._seeded=true;
    if(!activeDeal(t,'naming')) F.offers.push(makeOffer(t,'naming'));
    ['tv_local','radio','jersey','concourse'].forEach(ty=>{ if(!activeDeal(t,ty) && ENG.rng()<0.7) F.offers.push(makeOffer(t,ty)); });
    F.offers=F.offers.filter(Boolean);
  }
  head(m,'Finances','Revenue, expenses, sponsorships, and the owner war chest.');
  const f=ENG.weeklyFinance(t,true);
  const sponsorYr=ENG.round1((F.deals||[]).reduce((a,d)=>a+(d.perYr||0),0));
  const ft=F.brand.fanTrust, ftCol=ft>=75?'var(--good)':ft>=55?'var(--acc2,#ffb13f)':'#ff5d6c';
  const cards=el('div','cards');
  const add=(h,v,s)=>cards.appendChild(el('div','card',`<h3>${h}</h3><div class="stat s">${v}</div><div class="muted">${s||''}</div>`));
  add('Cash on Hand', money(t.cash),'owner war chest');
  add('Player Payroll', money(t.roster.reduce((a,p)=>a+p.salary,0)),`cap ${money(t.cap)}`);
  if(G.rules.salaryCap!==false){ const cs=capSpace(t); add('Cap Space', `<span class="${cs<0?'bad':'good'}">${money(cs)}</span>`, `of ${money(t.cap)}`); }
  add('Sponsorship Income', money(sponsorYr)+'/yr', `${(F.deals||[]).length} active deal${(F.deals||[]).length!==1?'s':''}`);
  add('Fan Trust', `<span style="color:${ftCol}">${Math.round(ft)}</span>`, ft>=75?'fans are all-in':ft>=55?'steady':'eroding — ease the gouge');
  add('Merch / Brand', Math.round(F.brand.merch), 'jersey & retail strength');
  add('Home Gate (est)', money(f.att*t.stadium.ticket/1e6),`${f.att.toLocaleString()} fans @ $${t.stadium.ticket}`);
  add('Weekly Profit (home)', money(f.profit), `rev ${money(f.rev)} / exp ${money(f.exp)}`);
  m.appendChild(cards);
  // ---- stadium debt (integrates with Part A) ----
  const debts=(t.stadium.debt||[]).filter(d=>d.balance>0);
  if(debts.length){ const totWk=ENG.round1(debts.reduce((a,d)=>a+Math.min(d.perWk,d.balance),0)), totBal=ENG.round1(debts.reduce((a,d)=>a+d.balance,0));
    const dc=el('div','card'); dc.style.cssText='margin-top:14px;border:1px solid #4a3a2a';
    dc.innerHTML=`<h3>🏦 Stadium Debt</h3><div class="row" style="justify-content:space-between"><b style="color:#ffb13f">$${totWk}M / wk</b><span class="muted">$${totBal}M outstanding</span></div>`
      +debts.map(d=>`<div class="muted" style="font-size:12px;margin-top:4px">${esc(d.name)} — $${d.perWk}M/wk · $${d.balance}M left</div>`).join('');
    m.appendChild(dc); }
  // ---- offers on the table ----
  const oc=el('div','card'); oc.style.marginTop='14px'; oc.innerHTML='<h3>📨 Offers on the Table</h3>';
  if(!(F.offers||[]).length) oc.appendChild(el('p','muted','No offers right now — new sponsorship offers come in each offseason.'));
  (F.offers||[]).forEach((o,i)=>{ const row=el('div','card'); row.style.cssText='margin-top:8px;background:#0c1320;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap';
    const share=(o.type==='tv_local'||o.type==='radio');
    const shown=share&&o._share?ENG.round1(o.perYr*0.6):o.perYr;
    let note='';
    if(o.type==='naming'){ const ex=activeDeal(t,'naming'); if(ex){ const rem=Math.max(0,ex.years-(G.season-ex.since)); note=` · <span style="color:#ff8c66">replaces ${esc(ex.partner)} (buyout $${ENG.round1(rem*ex.perYr*0.5)}M)</span>`; } }
    row.innerHTML=`<div><b>${esc(o.partner)}</b> <span class="tag">${DEAL_LABEL[o.type]||o.type}</span><div class="muted" style="font-size:11px">$${shown}M/yr × ${o.years} yr${share?` · ${o._share?'revenue share (lower base, upside on wins)':'flat'}`:''}${note}</div></div>
      <div class="flex" style="gap:6px">${share?`<button class="btn sec" style="padding:4px 9px;font-size:11px" onclick="toggleOfferShare(${i})">${o._share?'Make Flat':'Make Share'}</button>`:''}<button class="btn" style="padding:4px 11px" onclick="signOffer(${i})">Sign</button><button class="btn sec" style="padding:4px 11px" onclick="passOffer(${i})">Pass</button></div>`;
    oc.appendChild(row); });
  m.appendChild(oc);
  // ---- active deals ----
  const ac=el('div','card'); ac.style.marginTop='14px'; ac.innerHTML='<h3>📑 Active Deals</h3>';
  if(!(F.deals||[]).length) ac.appendChild(el('p','muted','No sponsorship deals signed yet.'));
  (F.deals||[]).forEach(d=>{ const left=Math.max(0,(d.years||0)-(G.season-(d.since||G.season)));
    ac.appendChild(el('div','muted',`${DEAL_LABEL[d.type]||d.type}: <b>${esc(d.partner)}</b> — $${d.perYr}M/yr${d.share?' (share)':''} · ${left} yr left`)); });
  m.appendChild(ac);
  // ---- pricing & gate ----
  const pc=el('div','card'); pc.style.marginTop='14px';
  pc.innerHTML=`<h3>🎟️ Pricing & Gate</h3>
    <div class="row" style="align-items:center"><span style="min-width:110px">Ticket</span><input type="range" min="60" max="260" value="${t.stadium.ticket}" oninput="setTicket(this.value)"><b style="min-width:70px">$${t.stadium.ticket}</b></div>
    <div class="row" style="align-items:center"><span style="min-width:110px">Concessions</span><input type="range" min="0.7" max="1.6" step="0.05" value="${F.pricing.concession}" oninput="setConcession(this.value)"><b style="min-width:70px">${F.pricing.concession.toFixed(2)}×</b></div>
    <div class="row" style="align-items:center"><span style="min-width:110px">Parking</span><input type="range" min="0.7" max="1.6" step="0.05" value="${F.pricing.parking}" oninput="setParking(this.value)"><b style="min-width:70px">${F.pricing.parking.toFixed(2)}×</b></div>
    <p class="muted" style="margin-top:6px">Gouging the gate raises short-term revenue but bleeds attendance and fan trust. Projected attendance: <b>${Math.round(ENG.attendancePct(t)*100)}%</b> of ${t.stadium.cap.toLocaleString()}.</p>`;
  m.appendChild(pc);
  // ---- PSLs ----
  const psl=el('div','card'); psl.style.marginTop='14px';
  if((F.pricing.psl||0)>0){ psl.innerHTML=`<h3>💺 Personal Seat Licenses</h3><p class="muted">Tier ${F.pricing.psl} PSLs are sold — a permanent fixture (and a small standing drag on walk-up demand).</p>`; }
  else { psl.innerHTML=`<h3>💺 Premium Memberships / PSLs</h3><p class="muted" style="margin-bottom:8px">A one-time cash windfall — sell the right to buy season tickets. Irreversible, and it costs you fan trust.</p>
    <div class="flex">${[1,2,3].map(tr=>{ const market=t.market||55, lump=ENG.round1((market/100)*tr*22*(0.7+F.brand.fanTrust/300)); return `<button class="btn" onclick="sellPSL(${tr})">Tier ${tr} — +$${lump}M (−${tr*2} trust)</button>`; }).join('')}</div>`; }
  m.appendChild(psl);
}
window.setTicket=v=>{ut().stadium.ticket=+v; render();};
function scrStadium(m,t){
  const s=ensureStadium(t); const u=s.upgrades||{};
  head(m,'Stadium Development', `${s.name} · built ${s.built}`);
  const art=el('div','card'); art.style.cssText='padding:0;overflow:hidden;margin-bottom:12px'; art.innerHTML=venueArt(t, gameWeather(t.abbr, G.week), 180); m.appendChild(art);
  // ---- summary cards ----
  const cards=el('div','cards');
  cards.appendChild(el('div','card',`<h3>Capacity</h3><div class="stat s">${s.cap.toLocaleString()}</div><div class="muted">${s.cap>=90000?'league max':s.cap>=78000?'big house':'expandable'}</div>`));
  cards.appendChild(el('div','card',`<h3>Quality</h3><div class="stat s">${s.quality}/99</div><div class="bar" style="margin-top:6px"><i style="width:${s.quality}%"></i></div>`));
  cards.appendChild(el('div','card',`<h3>Attendance</h3><div class="stat s">${Math.round(ENG.attendancePct(t)*100)}%</div><div class="muted">of capacity</div>`));
  cards.appendChild(el('div','card',`<h3>Suite Revenue</h3><div class="stat s">${money(ENG.suitesRevenue(u.suites)+ENG.clubsRevenue(u.clubs,Math.round(s.cap*ENG.attendancePct(t)),s))}</div><div class="muted">per home game</div>`));
  m.appendChild(cards);
  // ---- amenities grid ----
  const tierBadge=(v,max)=>`<span class="tag" style="background:${v>=max?'#2a5a3a':v>0?'#3a3a5a':'#2a2a2a'}">${v>0?('Tier '+v):'—'}/${max}</span>`;
  const am=el('div','card'); am.style.marginTop='12px';
  am.innerHTML=`<h3>Amenities</h3><div class="row" style="flex-wrap:wrap;gap:14px;font-size:13px">
    <div>Luxury Suites ${tierBadge(u.suites||0,3)}</div>
    <div>Premium Clubs ${tierBadge(u.clubs||0,3)}</div>
    <div>Video Board ${tierBadge(u.videoboard||0,2)}</div>
    <div>Playing Surface ${tierBadge(u.turf||0,2)}</div>
    <div>Training Facility ${tierBadge(u.training||0,3)}</div>
    <div>Roof <span class="tag">${(u.roofLevel||0)>=2?'Dome':(u.roofLevel||0)>=1?'Retractable':'Open-air'}</span></div></div>`;
  m.appendChild(am);
  // ---- under construction ----
  const projs=t.stadiumProjects||[];
  if(projs.length){ const uc=el('div','card'); uc.style.marginTop='12px'; uc.innerHTML='<h3>🏗️ Under Construction</h3>';
    projs.forEach(pr=>{ const pct=Math.round((1-pr.weeksLeft/Math.max(1,pr.totalWeeks))*100);
      const row=el('div'); row.style.marginTop='8px';
      row.innerHTML=`<div class="row" style="justify-content:space-between"><b>${esc(pr.label)}${pr.kind==='upgrade'&&pr.tier!=null?` (tier ${pr.tier+1})`:''}</b><span class="muted">${pr.weeksLeft} wk left${pr.financed?' · financed':''}</span></div>
        <div class="bar" style="margin-top:5px;height:9px;background:#16223a;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:#37d39b"></i></div>`;
      uc.appendChild(row); });
    m.appendChild(uc); }
  // ---- project cards ----
  const grid=el('div','card'); grid.style.marginTop='12px';
  grid.innerHTML=`<h3>Build & Upgrade</h3><p class="muted" style="font-size:11px;margin-bottom:8px">Max 2 projects at once. Cash: ${money(t.cash)}. Financing spreads the cost over 4 seasons at 9%/yr (≈36% more total).</p>`;
  const wrap=el('div'); wrap.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px';
  Object.keys(STADIUM_PROJECTS).forEach(key=>{ const p=STADIUM_PROJECTS[key]; if(p.kind==='rebuild') return;
    const tier=projTier(s,key,p), maxed=projMaxed(s,key,p), queued=projQueued(t,key);
    const expandBlocked = p.kind==='expand' && s.cap+p.addCap>(p.capMax||90000);
    const cost=projCost(p,tier), weeks=projWeeks(p,tier);
    const tierTxt = p.kind==='upgrade'&&p.maxTier>1 ? `Tier ${Math.min(tier+1,p.maxTier)}/${p.maxTier}` : '';
    const card=el('div','card'); card.style.cssText='background:#0c1320';
    let body=`<div class="row" style="justify-content:space-between;align-items:center"><b>${esc(p.label)}</b>${tierTxt?`<span class="tag">${tierTxt}</span>`:''}</div>
      <div class="muted" style="font-size:11px;margin:4px 0 8px">${esc(p.blurb||'')}</div>`;
    if(maxed){ body+='<div class="tag" style="background:#2a5a3a">✓ Maxed out</div>'; }
    else if(queued){ body+='<div class="tag" style="background:#3a3a5a">Under construction</div>'; }
    else if(expandBlocked){ body+='<div class="muted" style="font-size:11px">Would exceed the 90k league cap.</div>'; }
    else { body+=`<div class="muted" style="font-size:12px;margin-bottom:6px">$${cost}M · ${weeks} weeks</div>
      <div class="flex" style="gap:6px"><button class="btn" style="padding:4px 10px" onclick="startProject('${key}',false)" ${t.cash<cost?'disabled':''}>Pay Cash</button>
      <button class="btn sec" style="padding:4px 10px" onclick="startProject('${key}',true)">Finance 4yr·9%</button></div>`; }
    card.innerHTML=body; wrap.appendChild(card); });
  grid.appendChild(wrap); m.appendChild(grid);
  // ---- big bets ----
  const big=el('div','card'); big.style.marginTop='12px';
  const rb=STADIUM_PROJECTS.rebuild, rbQueued=projQueued(t,'rebuild');
  big.innerHTML=`<h3>🏟️ Big Bets</h3><div class="flex" style="gap:8px;flex-wrap:wrap">
    ${rbQueued?'<span class="tag" style="background:#3a3a5a">New stadium under construction</span>':
      `<button class="btn warn" onclick="startProject('rebuild',false)" ${t.cash<rb.cost?'disabled':''}>Build New Stadium — $${rb.cost}M · ${rb.weeks} wk</button>
       <button class="btn sec" onclick="startProject('rebuild',true)">Finance New Stadium</button>`}
    <button class="btn sec" onclick="relocateModal()">🚚 Relocate Franchise — $75M</button></div>
    <p class="muted" style="margin-top:8px;font-size:11px">A rebuild resets to a 75k-seat, 92-quality crown jewel and wipes existing amenities. Relocation gives a fresh market and a brand-new stadium.</p>`;
  m.appendChild(big);
  // ---- outstanding debt ----
  const debts=(s.debt||[]).filter(d=>d.balance>0);
  if(debts.length){ const dc=el('div','card'); dc.style.marginTop='12px'; dc.innerHTML='<h3>Outstanding Construction Debt</h3>';
    debts.forEach(d=>dc.appendChild(el('div','muted',`${esc(d.name)} — $${d.balance}M left · $${d.perWk}M/wk`)));
    m.appendChild(dc); }
}
window.buildStadium=buildStadium;
function scrStaff(m,t){
  ENG.ensureStaff(t);
  const pb=ensureTeamPlaybook(t), tier=coachTier(t);
  const dept=ensureScoutDept(t);
  head(m,'Coaching Staff', `Head coach: ${t.coach.name} · ${pb.off.label} / ${pb.def.label}`);
  // ---- top staff-budget banner (coaches + scouts) ----
  { const bar=el('div','card'); bar.style.marginBottom='12px';
    const pct=dept.budgetCap>0?ENG.clamp(dept.spent/dept.budgetCap*100,0,140):0;
    const col=dept.spent>dept.budgetCap?'#ff5d6c':pct>85?'#ffb13f':'#37d39b';
    bar.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Front-Office Staff Budget</h3><b style="color:${col}">Scout dept $${ENG.round1(dept.spent)}M / $${t.staffBudget}M authorized</b></div>
      <div class="bar" style="margin-top:8px;height:9px;background:#16223a;border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100,pct)}%;background:${col}"></i></div>
      <p class="muted" style="font-size:11px;margin-top:6px">Your owner authorizes a yearly staff budget from market, profit, and cash. Coordinators and position coaches are one-off hires; the scouting department is a recurring salary line.</p>`;
    m.appendChild(bar); }
  const cards=el('div','cards');
  cards.appendChild(el('div','card',`<h3>Head Coach</h3><div class="stat s">${t.coach.ovr}</div><div class="muted">${t.coach.name} · ${tier}</div><div class="muted" style="font-size:11px;margin-top:3px">Adapt ${t.coach.adapt||60} · Risk ${t.coach.risk||50}</div>`));
  cards.appendChild(el('div','card',`<h3>Playbook Identity</h3><div style="font-weight:800;color:var(--acc)">${pb.off.label}</div><div class="muted" style="font-size:12px;margin:3px 0">${pb.off.summary}</div><div style="font-weight:800;color:#cdbcff">${pb.def.label}</div><div class="muted" style="font-size:12px;margin-top:3px">${pb.def.summary}</div>`));
  cards.appendChild(el('div','card',`<h3>Offensive Coord.</h3><div class="stat s" style="color:${ovrColor(t.staff.oc.ovr)}">${t.staff.oc.ovr}</div><div class="muted">${t.staff.oc.name}</div>`));
  cards.appendChild(el('div','card',`<h3>Defensive Coord.</h3><div class="stat s" style="color:${ovrColor(t.staff.dc.ovr)}">${t.staff.dc.ovr}</div><div class="muted">${t.staff.dc.name}</div>`));
  cards.appendChild(el('div','card',`<h3>Head Trainer</h3><div class="stat s" style="color:${ovrColor(trainerRating(t))}">${trainerRating(t)}</div><div class="muted">${t.staff.med.name}</div><div class="muted" style="font-size:11px;margin-top:3px">${trainerPointMax(t)} trainer points / week</div>`));
  cards.appendChild(el('div','card',`<h3>Scouting Department</h3><div class="stat s" style="color:${ovrColor(scoutRating(t))}">★${scoutTier(t).toFixed(1)}</div><div class="muted">${dept.scouts.length} scout${dept.scouts.length!==1?'s':''} · $${ENG.round1(dept.spent)}M/yr</div><button class="btn sec" style="padding:3px 9px;margin-top:6px;font-size:11px" onclick="VIEW='scout';render()">Manage →</button>`));
  m.appendChild(cards);
  const sheet=el('div','card'); sheet.style.marginTop='14px';
  const offCalls=(pb.off.keys||[]).slice(0,10).map(k=>OFF_META[k]&&OFF_META[k].label).filter(Boolean).join(' · ');
  const defCalls=(pb.def.keys||[]).slice(0,10).map(k=>DEF_META[k]&&DEF_META[k].label).filter(Boolean).join(' · ');
  sheet.innerHTML=`<h3>Game-Day Call Sheet</h3><div class="row" style="gap:12px;align-items:flex-start;flex-wrap:wrap">
    <div style="flex:1;min-width:260px"><div class="grphd">Offense</div><p class="muted" style="line-height:1.45;margin:4px 0">${offCalls}</p><div class="muted" style="font-size:11px">${pb.off.tags&&pb.off.tags.length?pb.off.tags.join(' · '):'built from roster strengths'} · Pass bias ${Math.round(pb.off.passBias*100)}%</div></div>
    <div style="flex:1;min-width:260px"><div class="grphd">Defense</div><p class="muted" style="line-height:1.45;margin:4px 0">${defCalls}</p><div class="muted" style="font-size:11px">${pb.def.tags&&pb.def.tags.length?pb.def.tags.join(' · '):'built from unit strengths'}</div></div></div>`;
  m.appendChild(sheet);
  { const cc=t.coach||{}, szns=cc.szns||0, sysF=ENG.clamp(((cc.ovr||70)-78)/18,0,1)*ENG.clamp((szns-2)/5,0,1), dyn=t._dynasty||0;
    const sysLabel = sysF>=0.55?'\ud83d\udd25 Elite system — makes stars': sysF>=0.25?'\ud83d\udcc8 System taking root': szns>=3?'Stable — still earning it':'New staff — no system edge yet';
    const OFF_FIT={wide_zone:'athletic linemen, one-cut backs, play-action QBs',west_coast:'accurate QBs and sure-handed YAC receivers',spread_rpo:'dual-threat QBs and space receivers',power_run:'maulers up front, downhill backs, blocking TEs',vertical:'big-arm QBs and burner receivers',spread_air:'quick-trigger QBs and a deep WR room',te_heavy:'mismatch tight ends and balanced lines',ball_control:'physical lines, possession WRs, grinder backs'};
    const DEF_FIT={match_quarters:'rangy safeties and smart corners',pressure:'edge rushers and blitzing LBs',man_press:'lockdown corners with a pass rush',run_fit:'thumper LBs and a stout front',two_high:'ball-hawk safeties',hybrid_spy:'versatile LBs and DBs'};
    const offFit=OFF_FIT[cc.offScheme]||'players who fit the system', defFit=DEF_FIT[cc.defScheme]||'players who fit the front';
    const ex=el('div','card'); ex.style.marginTop='14px';
    ex.innerHTML=`<h3>\ud83e\udde0 What Your Staff Does for the Roster</h3><div class="muted" style="line-height:1.65;font-size:13px">`
      +`<b style="color:var(--acc)">Develops players.</b> A quality, stable staff pushes young players toward — and past — their ceiling. Your system: <b style="color:${sysF>=0.4?'var(--good)':sysF>0?'var(--acc2)':'var(--dim)'}">${sysLabel}</b> (HC ${cc.ovr} OVR \u00b7 ${szns} yr${szns!==1?'s':''} tenure${dyn>=0.6?' \u00b7 \ud83c\udfdb\ufe0f DYNASTY':''}). Continuity compounds — churn the staff and you lose it.<br>`
      +`<b style="color:var(--acc)">Sets the identity.</b> Your <b>${esc(pb.off.label)}</b> (${Math.round(pb.off.passBias*100)}% pass) and <b>${esc(pb.def.label)}</b> shape every call and the run/pass balance.<br>`
      +`<b style="color:var(--acc)">Rewards the right players.</b> This system thrives with <b>${offFit}</b> on offense and <b>${defFit}</b> on defense — fit the roster to the scheme, or change the scheme to fit the roster.</div>`;
    m.appendChild(ex); }
  const pc=el('div','card'); pc.style.marginTop='14px'; pc.innerHTML='<h3>Position Coaches — drive player development</h3>';
  const tbl=el('table'); const groups=[['qb','Quarterbacks'],['rb','Running Backs'],['wr','Receivers'],['ol','Offensive Line'],['dl','Defensive Line'],['lb','Linebackers'],['db','Defensive Backs']];
  tbl.innerHTML='<tr><th>Unit</th><th>Coach</th><th>Rating</th><th></th></tr>'+groups.map(([k,lbl])=>{const c=t.staff[k];
    return `<tr><td>${lbl}</td><td>${c.name}</td><td><b style="color:${ovrColor(c.ovr)}">${c.ovr}</b></td><td><button class="btn sec" style="padding:3px 9px" onclick="hireAssistant('${k}')">Upgrade — $4M</button></td></tr>`;}).join('');
  pc.appendChild(tbl); m.appendChild(pc);
  const c=el('div','card');c.style.marginTop='12px';
  c.innerHTML=`<div class="flex"><button class="btn" onclick="hireCoach()">Hire New Head Coach — $12M</button>
    <button class="btn sec" onclick="hireCoord('oc')">Upgrade OC — $6M</button>
    <button class="btn sec" onclick="hireCoord('dc')">Upgrade DC — $6M</button>
    <button class="btn sec" onclick="VIEW='scout';render()">Scouting Department →</button></div>
   <p class="muted" style="margin-top:8px">Coordinators raise your offense/defense rating; position coaches speed development, trainers manage injuries, and the scouting department drives draft accuracy. Cash: ${money(t.cash)}.</p>`;
  m.appendChild(c);
  const top=el('div','card'); top.style.marginTop='12px';
  const rows=G.teams.slice().sort((a,b)=>coachGrade(b)-coachGrade(a)).slice(0,10).map(tm=>{ const p=ensureTeamPlaybook(tm), cg=coachGrade(tm); const dd=ensureScoutDept(tm);
    return `<tr><td>${logoTag(tm,18)} ${tm.city} ${tm.nick}</td><td><b>${tm.coach.name}</b></td><td>${ovrBadge(cg)}</td><td class="muted">${p.off.label}</td><td class="muted">${p.def.label}</td><td class="muted">$${ENG.round1(dd.spent)}M</td><td>★${scoutTier(tm).toFixed(1)}</td></tr>`; }).join('');
  top.innerHTML=`<h3>Top Coaches Around the League</h3><table><tr><th>Team</th><th>Coach</th><th>Grade</th><th>Offense</th><th>Defense</th><th>Scout $</th><th>Dept Tier</th></tr>${rows}</table>`;
  m.appendChild(top);
}
window.hireCoach=hireCoach;
window.hireCoord=(k)=>{ const t=ut(); if(t.cash<6){toast('Not enough cash');return;} t.cash=ENG.round1(t.cash-6);
  t.staff[k]={name:ENG.coachName(),ovr:ENG.clamp(t.staff[k].ovr+ENG.ri(4,12),60,97)};
  ensureTeamPlaybook(t,true);
  addNews('STAFF',`${t.city} hire ${t.staff[k].name} as ${k==='oc'?'offensive':'defensive'} coordinator (${t.staff[k].ovr}).`); toast('Coordinator hired!'); save(); render(); };
window.hireAssistant=(k)=>{ const t=ut(); if(t.cash<4){toast('Not enough cash');return;} t.cash=ENG.round1(t.cash-4);
  t.staff[k]={name:ENG.coachName(),ovr:ENG.clamp(t.staff[k].ovr+ENG.ri(4,11),58,96)};
  toast('Position coach upgraded!'); save(); render(); };
window.hireScout=()=>{ const t=ut(); ensureScouting(t); if(t.cash<5){toast('Not enough cash');return;} t.cash=ENG.round1(t.cash-5);
  t.staff.scout={name:ENG.coachName(),ovr:ENG.clamp((t.staff.scout&&t.staff.scout.ovr||68)+ENG.ri(5,13),58,97)};
  t.scouting.weekKey=null; ensureScouting(t); addNews('STAFF',`${t.city} hire ${t.staff.scout.name} as scouting director (${t.staff.scout.ovr}).`); toast('Scouting department upgraded.'); save(); render(); };
function scrOwner(m,t){
  ensureOwner(t); const o=t.owner; const a=ownerArchetype(o);
  head(m,'Ownership', `${o.name} · ${a.label}`);
  const per=el('div','card'); per.innerHTML=`<div class="row" style="align-items:center;gap:14px">
    <div style="width:54px;height:54px;border-radius:50%;flex:none;background:linear-gradient(135deg,${t.pri||'#33415e'},#0a0f18);display:flex;align-items:center;justify-content:center;font-family:var(--disp,sans-serif);font-weight:800;font-size:20px;color:#fff">${o.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
    <div><div style="font-weight:700">${o.name} <span class="tag">${a.label}</span></div><div class="muted" style="font-size:13px;margin-top:2px">${a.blurb}</div></div></div>
    <div style="margin-top:10px">${hotSeatHTML(t)}</div>`;
  m.appendChild(per);
  const cards=el('div','cards'); cards.style.marginTop='12px';
  cards.appendChild(el('div','card',`<h3>Wealth</h3><div class="stat s">${o.wealth}/99</div><div class="muted">funds your budget</div>`));
  cards.appendChild(el('div','card',`<h3>Patience</h3><div class="stat s">${o.patience}/99</div><div class="muted">${o.patience<50?'short fuse — win now':'gives you time'}</div>`));
  cards.appendChild(el('div','card',`<h3>Ambition</h3><div class="stat s">${o.ambition}/99</div><div class="muted">${o.ambition>80?'demands a title':'wants steady progress'}</div>`));
  m.appendChild(cards);
  const c=el('div','card');c.style.marginTop='14px';c.innerHTML='<h3>Owner Notes</h3>';
  G.news.filter(n=>n.tag==='OWNER').slice(0,6).forEach(n=>c.appendChild(el('div','news',n.txt)));
  if(!G.news.some(n=>n.tag==='OWNER')) c.appendChild(el('p','muted','No owner activity yet. Advance the season.'));
  m.appendChild(c);
}
function scrStandings(m){
  head(m,'Standings',`Season ${G.season}`);
  const byConf={}; G.teams.forEach(t=>{(byConf[t.conf]=byConf[t.conf]||[]).push(t);});
  if(G.playoffs && (G.playoffs.log||[]).length){
    const pc=el('div','card'); pc.style.marginBottom='12px';
    let html='<h3>Playoff Bracket</h3>';
    if(G.playoffs.champ) html+=`<p class="good" style="font-weight:800">Champion: ${logoTag(G.playoffs.champ,20)} ${G.playoffs.champ.city} ${G.playoffs.champ.nick}</p>`;
    (G.playoffs.log||[]).forEach(r=>{
      html+=`<div class="muted" style="font-family:var(--mono);font-size:11px;margin:10px 0 4px">ROUND ${r.round}</div>`;
      html+=(r.games||[]).map(g=>g.bye
        ? `<div class="news"><b>${g.bye}</b> earned a bye.</div>`
        : `<div class="news"><b>${g.away}</b> ${g.as} at <b>${g.home}</b> ${g.hs}${g.ot?' (OT)':''} <span class="tag">WINNER ${g.winner}</span></div>`).join('');
    });
    pc.innerHTML=html; m.appendChild(pc);
  }
  // playoff field per conference (same take rule as startPlayoffs) → badge who's currently in
  const seedAbbrs=new Set();
  Object.keys(byConf).forEach(cf=>{ const n=byConf[cf].length, auto=ENG.clamp(n<=2?1:n<=5?2:Math.round(n*0.55),1,7), take=ENG.clamp((G.rules&&G.rules.playoffTeams)||auto,1,n);
    byConf[cf].slice().sort((a,b)=>(b.wins-b.losses)-(a.wins-a.losses)||(b.pf-b.pa)-(a.pf-a.pa)).slice(0,take).forEach(t=>seedAbbrs.add(t.abbr)); });
  const rowFor=(t,rank)=>`<tr><td>${rank!=null?`<span class="muted" style="font-family:var(--mono);font-size:10px;margin-right:5px">${rank}</span>`:''}${seedAbbrs.has(t.abbr)?'<span class="acc" title="in the playoff field">▸</span> ':''}${logoTag(t,18)} ${t.abbr===USER?'<b>':''}${t.city} ${t.nick}${t.abbr===USER?'</b>':''}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.pf}</td><td>${t.pa}</td><td>${t.pf-t.pa>0?'+':''}${t.pf-t.pa}</td><td>${ENG.teamOvr(t)}</td></tr>`;
  Object.keys(byConf).sort().forEach(cf=>{
    const c=el('div','card');c.style.marginBottom='12px';c.innerHTML=`<h3>${cf}</h3>`;
    // group by DIVISION — but for smaller / winnowed leagues, sparse divisions (1-2 teams) read badly,
    // so fall back to a single flat conference table unless every division is meaningfully filled (>=3).
    const byDiv={}; byConf[cf].forEach(t=>{ const d=t.div||'—'; (byDiv[d]=byDiv[d]||[]).push(t); });
    const divs=Object.keys(byDiv).sort();
    const minDiv=divs.length?Math.min(...divs.map(d=>byDiv[d].length)):0;
    const showDivs = divs.length>1 && minDiv>=3;
    (showDivs?divs:[null]).forEach(dv=>{
      const list=(dv==null?byConf[cf]:byDiv[dv]).slice().sort((a,b)=>(b.wins-b.losses)-(a.wins-a.losses)||(b.pf-b.pa)-(a.pf-a.pa));
      if(dv!=null) c.insertAdjacentHTML('beforeend',`<div class="muted" style="font-family:var(--mono);font-size:11px;letter-spacing:.06em;margin:11px 0 3px">${cf} ${dv}</div>`);
      const tbl=el('table'); tbl.innerHTML='<tr><th>Team</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th><th>Rtg</th></tr>'+
        list.map((t,i)=>rowFor(t, dv!=null?i+1:null)).join('');
      c.appendChild(tbl);
    });
    m.appendChild(c);
  });
}
function scrSchedule(m,t){
  head(m,'Schedule', `${t.city} ${t.nick}`);
  const c=el('div','card'); const tbl=el('table'); let rows='';
  G.schedule.forEach((wk,i)=>{ const g=wk.find(g=>g.home===USER||g.away===USER); if(!g)return; const home=g.home===USER;
    const opp=team(home?g.away:g.home); const played=i<G.week;
    let res=''; if(played&&G.lastResults&&i===G.week-1){} 
    rows+=`<tr><td>Wk ${i+1}</td><td>${home?'vs':'@'} ${opp.city} ${opp.nick}</td><td>${ovrBadge(ENG.teamOvr(opp))}</td><td class="${played?'muted':''}">${played?'played':'upcoming'}</td></tr>`; });
  tbl.innerHTML='<tr><th>Week</th><th>Opponent</th><th>Opp Rtg</th><th>Status</th></tr>'+rows; c.appendChild(tbl); m.appendChild(c);
}
function scrLeague(m){
  head(m,'League', `${G.teams.length} teams`);
  const c=el('div','card'); const tbl=el('table');
  tbl.innerHTML='<tr><th>Team</th><th>Conf/Div</th><th>Rtg</th><th>Coach</th><th>Playbook</th><th>Cap Space</th><th>Fan Morale</th><th>Stadium</th></tr>'+
    G.teams.slice().sort((a,b)=>ENG.teamOvr(b)-ENG.teamOvr(a)).map(t=>{ const pb=ensureTeamPlaybook(t);
      return `<tr><td>${logoTag(t,18)} ${t.city} ${t.nick}</td><td class="muted">${t.conf} ${t.div}</td><td>${ovrBadge(ENG.teamOvr(t))}</td><td>${t.coach.name} <span class="muted">${coachGrade(t)}</span></td><td class="muted">${pb.off.label}</td><td class="${capSpace(t)<0?'bad':''}">${money(capSpace(t))}</td><td>${t.fans.morale}%</td><td class="muted">${(t.stadium.cap/1000)|0}k</td></tr>`; }).join('');
  c.appendChild(tbl); m.appendChild(c);
}
// QUOTE OF THE WEEK — a persona-voiced quote from a player in the news (drama) or the league's top star.
function gazetteQuoteBox(){
  if(!window.VOICES||!VOICES.quote) return '';
  let p=null, ctx='mvp';
  const drama=(G.news||[]).filter(n=>n.wk>=G.week-1 && ['REQUEST','SUSPENSION','DRAMA','CONTRACT'].includes(n.tag));
  if(drama.length){ outer: for(const t of G.teams){ for(const pl of t.roster){ if(drama.some(n=>n.txt.includes(pl.name))){ p=pl; ctx=(pl.flags&&pl.flags.wantsOut)?'contract':(pl.outReason==='suspended'?'suspended':(pl.flags&&pl.flags.wantsBall)?'frustrated':'loss'); break outer; } } } }
  if(!p){ // a star genuinely starved of touches makes the juiciest, most-grounded "complaint"
    const fr=[]; for(const t of G.teams){ for(const pl of t.roster){ if(pl.flags&&pl.flags.wantsBall&&pl.ovr>=78) fr.push(pl); } }
    if(fr.length){ p=fr.sort((a,b)=>b.ovr-a.ovr)[0]; ctx='frustrated'; } }
  if(!p && G.leagueStars && G.leagueStars.length){ const f=findPlayer(G.leagueStars[0].id); if(f) p=f.p; }
  if(!p) return '';
  ensurePersona(p); const q=VOICES.quote(p,ctx,{}); const f=findPlayer(p.id), ab=f?f.t.abbr:'';
  return `<div class="gbox"><h4>🗣️ Quote of the Week</h4><p style="font-style:italic;line-height:1.5">“${esc(q)}”</p>
    <p class="muted" style="font-size:11px;margin-top:5px">— <b>${esc(p.name)}</b>, ${p.pos}${ab?', '+ab:''} <span class="tag" style="font-size:9px">${PERSONA_EMOJI[p.persona]||''} ${PERSONA_LBL[p.persona]||''}</span></p></div>`;
}
function scrGazette(m,t){
  head(m,'The Gridiron Gazette','The league newspaper — written by Claude, automatically.');
  { const hint=el('div','news'); hint.style.margin='0 0 12px'; hint.innerHTML='⚙️ AI coverage &amp; spoken play-by-play settings now live in the <b>Settings</b> tab.'; m.appendChild(hint); }
  scrGazetteBody(m,t);
}
// ===== SETTINGS — broadcast: automatic AI coverage + spoken play-by-play. Moved out of the Gazette. =====
function scrSettings(m,t){
  head(m,'Settings','Broadcast & integration settings — automatic AI coverage and spoken play-by-play. (League gameplay rules live under ⚖️ Rules.)');
  // ---- Newsroom (in-browser Claude) ----
  const cf=AI.cfg();
  const nr=el('div','card'); nr.style.marginBottom='14px';
  const connected=AI.ready(); const prov=AI.provider();
  // status pill reflects the LAST ACTUAL call: green only after a successful Test/Write, red after a failure, neutral until tested.
  const pill=(bg,fg,txt)=>`<span style="background:${bg};color:${fg};font-size:11px;font-weight:700;padding:2px 9px;border-radius:9px;margin-left:6px">${txt}</span>`;
  const aiBadge = prov==='local' ? pill('#11223a','#5bbcff',`🖥️ LOCAL · ${AI.localModel()}`)
    : prov!=='cloud' ? pill('#2a3142','#93a4c4','○ templates')
    : !connected ? pill('#2a3142','#93a4c4','○ add a key')
    : G._aiOk ? pill('#11331f','#46d39a','✓ CLAUDE CONNECTED')
    : G._gazErr ? pill('#3a1620','#ff7b8a','✗ NOT CONNECTED')
    : pill('#2a2618','#e8b341','○ key set · untested');
  nr.innerHTML=`<h3>📡 Newsroom — automatic AI coverage ${aiBadge}</h3>
   <div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="muted" style="font-size:11px;align-self:center">Engine:</span>
     <button class="btn ${prov==='local'?'':'sec'}" data-prov="local" style="padding:3px 10px;font-size:11px">🖥️ Local (Ollama)</button>
     <button class="btn ${prov==='cloud'?'':'sec'}" data-prov="cloud" style="padding:3px 10px;font-size:11px">☁️ Cloud (Claude)</button>
     <button class="btn ${prov==='off'?'':'sec'}" data-prov="off" style="padding:3px 10px;font-size:11px">Off (templates)</button></div>
   ${prov==='local'?`<div class="row" style="flex-wrap:wrap;gap:8px">
       <select id="aimodelL" style="width:185px" title="installed Ollama models"><option value="${AI.localModel()}" selected>${AI.localModel()}</option></select>
       <input type="text" id="aiurl" placeholder="http://localhost:11434" value="${AI.localUrl()}" style="width:210px">
       <button class="btn sec" id="aitest">🔌 Test</button>
       <button class="btn" id="aigen">${G._gazBusy?'✕ Cancel':'Write this week'}</button></div>
     <div id="ailive" style="margin-top:9px;font-size:12px"><span class="muted">⏳ checking local AI…</span></div>
     <p class="muted" style="margin-top:8px">Runs on <b>your machine</b> via Ollama — free, private, offline. Live booth color comes in on big plays; the Gazette can write locally too. <b>One-time:</b> launch Ollama so the game (a <code>file://</code> page) is allowed — <code>OLLAMA_ORIGINS=* OLLAMA_KEEP_ALIVE=-1 ollama serve</code> (allows this page + keeps the model warm) — then hit Test.${G._gazErr?` <span class="bad">Last error: ${G._gazErr}</span>`:''}</p>`
   :prov==='cloud'?`<div class="row" style="flex-wrap:wrap;gap:8px">
       <input type="password" id="aikey" placeholder="Paste Anthropic API key (sk-ant-…)" value="${cf.key?'••••••••'+cf.key.slice(-4):''}" style="flex:1;min-width:240px">
       <input type="text" id="aimodel" placeholder="model" value="${cf.model||'claude-opus-4-8'}" style="width:170px">
       <button class="btn sec" id="aitestcloud">🔌 Test</button>
       <button class="btn" id="aigen">${G._gazBusy?'✕ Cancel':'Write this week'}</button></div>
     <div class="row" style="gap:6px;margin-top:7px;flex-wrap:wrap;align-items:center"><span class="muted" style="font-size:11px">Model:</span>
       ${[['claude-opus-4-8','⭐ Best · Opus'],['claude-sonnet-5','⚡ Fast · Sonnet'],['claude-haiku-4-5-20251001','🏃 Fastest · Haiku']].map(([id,lbl])=>`<button class="btn ${(cf.model||'claude-opus-4-8')===id?'':'sec'}" data-aimodel="${id}" style="padding:3px 9px;font-size:11px">${lbl}</button>`).join('')}
       <span class="muted" style="font-size:11px">— the weekly write is long; <b>Sonnet</b> is ~2-3× faster than Opus with great prose, <b>Haiku</b> faster still.</span></div>
     <p class="muted" style="margin-top:8px">Your key lives ONLY in this browser (localStorage) and calls Anthropic directly — never written into the game's code.${G._gazErr?` <span class="bad">Last error: ${G._gazErr}</span>`:''}</p>`
   :`<p class="muted" style="margin-top:8px">AI coverage is off — the game uses its built-in procedural commentary, Gazette and takes (instant, fully offline). Pick <b>Local</b> (Ollama on your machine) or <b>Cloud</b> to bring the AI booth alive.</p>`}
   <label class="opt" style="padding:4px 0"><input type="checkbox" id="aiauto" ${cf.auto?'checked':''}> Auto-write the Gazette each week</label>`;
  m.appendChild(nr);
  // ---- Voice (spoken play-by-play) ----
  { const tc=TTS.cfg(), teng=TTS.engine(), brVoices=TTS.voices();
    const vr=el('div','card'); vr.style.marginBottom='14px';
    vr.innerHTML=`<h3>🔊 Voice — spoken play-by-play ${tc.on?'<span style="background:#11331f;color:#46d39a;font-size:11px;font-weight:700;padding:2px 9px;border-radius:9px;margin-left:6px">ON</span>':'<span style="background:#2a3142;color:#93a4c4;font-size:11px;font-weight:700;padding:2px 9px;border-radius:9px;margin-left:6px">off</span>'}</h3>
      ${TTS.isDisabled?(TTS.isDisabled()?'<div class="news" style="margin:6px 0;border-left:3px solid #e8b341;padding:8px 10px;font-size:12px">🔇 <b>Spoken play-by-play is turned off right now</b> while the broadcast pacing is being reworked. Your settings below are saved and apply automatically when the voice booth is switched back on.</div>':''):''}
      <label class="opt" style="padding:4px 0"><input type="checkbox" id="ttson" ${tc.on?'checked':''} ${TTS.isDisabled&&TTS.isDisabled()?'disabled':''}> Read the play-by-play aloud during games</label>
      <label class="opt" style="padding:4px 0"><input type="checkbox" id="ttsera" ${tc.era!=='modern'?'checked':''}> 📻 Golden-Age Radio call — period play-by-play, "from right to left on your dial" (AM-radio sound)</label>
      <div class="row" style="gap:6px;margin:6px 0;flex-wrap:wrap"><span class="muted" style="font-size:11px;align-self:center">Voice engine:</span>
        <button class="btn ${teng==='browser'?'':'sec'}" data-teng="browser" style="padding:3px 10px;font-size:11px">🆓 Browser (free, offline)</button>
        <button class="btn ${teng==='eleven'?'':'sec'}" data-teng="eleven" style="padding:3px 10px;font-size:11px">🎙️ ElevenLabs (your key)</button>
        <button class="btn ${teng==='openai'?'':'sec'}" data-teng="openai" style="padding:3px 10px;font-size:11px">🔊 OpenAI (your key)</button>
        <button class="btn ${teng==='azure'?'':'sec'}" data-teng="azure" style="padding:3px 10px;font-size:11px">🗣️ Azure Speech (your key)</button></div>
      ${teng==='eleven'?(()=>{ const tmodel=tc.elevenModel||'eleven_multilingual_v2';
        return `<div class="row" style="flex-wrap:wrap;gap:8px">
          <input type="password" id="ttskey" placeholder="Paste ElevenLabs API key" value="${tc.elevenKey?'••••••••'+esc(tc.elevenKey.slice(-4)):''}" style="flex:1;min-width:220px">
          <button class="btn sec" id="ttstest">▶ Test the voice</button></div>
        <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center">
          <span class="tag" style="background:#1a2740;color:#9fd0ff;font-weight:700">🎙️ The Veteran Play-by-Play</span>
          <input type="text" id="ttsvoiceid" placeholder="ElevenLabs Voice ID (paste to use your designed voice)" value="${esc(TTS.pbpVoice()||'')}" style="flex:1;min-width:240px"></div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="muted" style="font-size:11px;align-self:center">Quality:</span>
          <button class="btn ${tmodel==='eleven_multilingual_v2'?'':'sec'}" data-tmodel="eleven_multilingual_v2" style="padding:3px 9px;font-size:11px">⭐ Best (multilingual v2)</button>
          <button class="btn ${tmodel==='eleven_v3'?'':'sec'}" data-tmodel="eleven_v3" style="padding:3px 9px;font-size:11px">🎭 Most expressive (v3)</button>
          <button class="btn ${tmodel==='eleven_turbo_v2_5'?'':'sec'}" data-tmodel="eleven_turbo_v2_5" style="padding:3px 9px;font-size:11px">⚡ Fast (turbo)</button></div>
        <p class="muted" style="margin-top:8px">The booth uses <b>one announcer — the Veteran Play-by-Play</b> (an energetic American sportscaster that works on the free tier). To use your <b>exact designed voice</b>: open it in ElevenLabs → <b>My Voices</b>, copy its <b>Voice ID</b>, and paste it above. A Voice-Lab <i>design link</i> can't be called by the API directly — you have to create the voice first. Key + ID live ONLY in this browser; if a request is blocked (CORS/quota/bad key) it falls back to a free browser voice.${G._ttsErr?` <span class="bad">Last: ${esc(G._ttsErr)}</span>`:''}</p>`; })()
       :teng==='openai'?(()=>{ const omodel=TTS.openaiModel(), ovoice=TTS.openaiVoice();
        return `<div class="row" style="flex-wrap:wrap;gap:8px">
          <input type="password" id="ttsopenaikey" placeholder="Paste OpenAI API key (sk-…)" value="${tc.openaiKey?'••••••••'+esc(tc.openaiKey.slice(-4)):''}" style="flex:1;min-width:220px">
          <button class="btn sec" id="ttstest">▶ Test the voice</button></div>
        <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center">
          <span class="tag" style="background:#1a2740;color:#9fd0ff;font-weight:700">🎙️ The Veteran Play-by-Play</span>
          <select id="ttsoaivoice" style="min-width:200px">${TTS.OPENAI_VOICES.map(v=>`<option value="${esc(v)}" ${ovoice===v?'selected':''}>${esc(v)}${v==='onyx'?' (deep male — the Veteran)':''}</option>`).join('')}</select></div>
        <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="muted" style="font-size:11px;align-self:center">Quality:</span>
          <button class="btn ${omodel==='gpt-4o-mini-tts'?'':'sec'}" data-toaimodel="gpt-4o-mini-tts" style="padding:3px 9px;font-size:11px">⭐ Best (gpt-4o-mini-tts)</button>
          <button class="btn ${omodel==='tts-1'?'':'sec'}" data-toaimodel="tts-1" style="padding:3px 9px;font-size:11px">⚡ Cheapest (tts-1)</button></div>
        <p class="muted" style="margin-top:8px">OpenAI TTS — paid API (~$15/1M chars, ~10× cheaper than ElevenLabs), needs your own OpenAI key. <b>onyx</b> is the Veteran Play-by-Play; the voice select just lets you swap. Key lives only in this browser; if a request is blocked (CORS/quota/bad key) it falls back to a free browser voice.${G._ttsErr?` <span class="bad">Last: ${esc(G._ttsErr)}</span>`:''}</p>`; })()
       :teng==='azure'?(()=>{ const azvoice=TTS.azureVoice();
        return `<div class="row" style="flex-wrap:wrap;gap:8px">
          <input type="password" id="ttsazurekey" placeholder="Paste Azure Speech key" value="${tc.azureKey?'••••••••'+esc(tc.azureKey.slice(-4)):''}" style="flex:1;min-width:220px">
          <input type="text" id="ttsazureregion" placeholder="e.g. eastus, westus2" value="${esc(TTS.azureRegion())}" style="width:160px">
          <button class="btn sec" id="ttstest">▶ Test the voice</button></div>
        <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center">
          <span class="tag" style="background:#1a2740;color:#9fd0ff;font-weight:700">🎙️ The Veteran Play-by-Play</span>
          <select id="ttsazurevoice" style="min-width:240px">${TTS.AZURE_VOICES.map(v=>`<option value="${esc(v)}" ${azvoice===v?'selected':''}>${esc(v)}${v==='en-US-AndrewMultilingualNeural'?' (the Veteran)':''}</option>`).join('')}</select></div>
        <p class="muted" style="margin-top:8px">Azure AI Speech — enterprise neural voices with SSML pacing/pauses; needs an Azure Speech key + region. Key stays only in this browser.${G._ttsErr?` <span class="bad">Last: ${esc(G._ttsErr)}</span>`:''}</p>`; })()
       :`<div class="row" style="flex-wrap:wrap;gap:8px">
          <select id="ttsbrvoice" style="min-width:235px"><option value="">Auto (best English)</option>${brVoices.filter(v=>/^en/i.test(v.lang)).map(v=>`<option value="${esc(v.name)}" ${tc.browserVoice===v.name?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select>
          <button class="btn sec" id="ttstest">▶ Test</button></div>
        <p class="muted" style="margin-top:8px">Uses your browser's built-in voices — free, instant, no account, fully offline. ${brVoices.length?`${brVoices.length} voices available.`:'Loading voices… reload if the list is empty.'} For broadcast-quality voices, switch to ElevenLabs or OpenAI and paste your key.</p>`}`;
    m.appendChild(vr);
    // ---- Reset: wipe saved games, KEEP the AI key + voice settings ----
    { const rz=el('div','card'); rz.style.marginTop='14px';
      rz.innerHTML=`<h3>🧹 Reset</h3><p class="muted" style="font-size:12px;margin:4px 0 8px">Wipe all saved games and start a brand-new league. Your AI key and voice settings are kept.</p><button class="btn warn" id="resetgame" style="padding:4px 12px">Reset game…</button>`;
      m.appendChild(rz);
      setTimeout(()=>{ const rb=$('#resetgame'); if(rb) rb.onclick=()=>{ if(confirm('Wipe ALL saved games and start a fresh league?\n\nYour API key and settings are kept. This cannot be undone.')){ ['fps2026','fps2026_slots','fps_coachedonce'].forEach(k=>{ try{localStorage.removeItem(k);}catch(e){} }); location.reload(); } }; },0); }
    setTimeout(()=>{
      const on=$('#ttson'); if(on)on.onchange=()=>{ TTS.setCfg({on:on.checked}); if(!on.checked)TTS.stop(); render(); };
      const era=$('#ttsera'); if(era)era.onchange=()=>{ TTS.setCfg({era:era.checked?'radio':'modern'}); render(); };
      vr.querySelectorAll('[data-teng]').forEach(b=>b.onclick=()=>{ TTS.setCfg({engine:b.dataset.teng}); render(); });
      const kk=$('#ttskey'), saveTk=()=>{ if(kk&&kk.value&&!kk.value.startsWith('•')){ TTS.setCfg({elevenKey:kk.value.trim()}); toast('✓ ElevenLabs key saved.'); render(); } };
      if(kk){ kk.onchange=saveTk; kk.addEventListener('paste',()=>setTimeout(saveTk,30)); }
      const vid=$('#ttsvoiceid'); if(vid){ const sv=()=>{ const v=vid.value.trim(); TTS.setCfg({elevenVoice:v||null}); }; vid.onchange=sv; vid.addEventListener('paste',()=>setTimeout(sv,30)); }
      vr.querySelectorAll('[data-tmodel]').forEach(b=>b.onclick=()=>{ TTS.setCfg({elevenModel:b.dataset.tmodel}); render(); });
      const ok=$('#ttsopenaikey'), saveOk=()=>{ if(ok&&ok.value&&!ok.value.startsWith('•')){ TTS.setCfg({openaiKey:ok.value.trim()}); toast('✓ OpenAI key saved.'); render(); } };
      if(ok){ ok.onchange=saveOk; ok.addEventListener('paste',()=>setTimeout(saveOk,30)); }
      const ov=$('#ttsoaivoice'); if(ov)ov.onchange=()=>TTS.setCfg({openaiVoice:ov.value});
      vr.querySelectorAll('[data-toaimodel]').forEach(b=>b.onclick=()=>{ TTS.setCfg({openaiModel:b.dataset.toaimodel}); render(); });
      const az=$('#ttsazurekey'), saveAz=()=>{ if(az&&az.value&&!az.value.startsWith('•')){ TTS.setCfg({azureKey:az.value.trim()}); toast('✓ Azure Speech key saved.'); render(); } };
      if(az){ az.onchange=saveAz; az.addEventListener('paste',()=>setTimeout(saveAz,30)); }
      const azr=$('#ttsazureregion'); if(azr){ const svr=()=>{ const v=azr.value.trim(); TTS.setCfg({azureRegion:v||null}); }; azr.onchange=svr; azr.addEventListener('paste',()=>setTimeout(svr,30)); }
      const azv=$('#ttsazurevoice'); if(azv)azv.onchange=()=>TTS.setCfg({azureVoice:azv.value});
      const bv=$('#ttsbrvoice'); if(bv)bv.onchange=()=>TTS.setCfg({browserVoice:bv.value});
      const tt=$('#ttstest'); if(tt)tt.onclick=async()=>{ const o=tt.textContent; tt.textContent='…'; const r=await TTS.test(); tt.textContent=o; if(!r||!r.ok)toast('Voice test failed'+(r&&r.err?': '+r.err:'')); else if(r.engine==='browser'&&!r.voices)toast('No browser voices found on this device'); };
    }, 30); }
  setTimeout(()=>{
    nr.querySelectorAll('[data-prov]').forEach(b=>b.onclick=()=>{ AI.setCfg({provider:b.dataset.prov}); if(b.dataset.prov==='local'&&AI.warm)AI.warm(); render(); });
    const k=$('#aikey'); const saveKey=()=>{ if(k && k.value && !k.value.startsWith('•')){ AI.setCfg({key:k.value.trim()}); G._aiOk=undefined; G._gazErr=null; toast('✓ Claude key saved — hit Test to verify.'); render(); } };
    if(k){ k.onchange=saveKey; k.addEventListener('paste',()=>setTimeout(saveKey,30)); }
    const mo=$('#aimodel'); if(mo) mo.onchange=()=>AI.setCfg({model:mo.value.trim()});
    nr.querySelectorAll('[data-aimodel]').forEach(b=>b.onclick=()=>{ AI.setCfg({model:b.dataset.aimodel}); toast('Model set — '+b.textContent.replace(/^[^ ]+ /,'')); render(); });
    const ml=$('#aimodelL'); if(ml) ml.onchange=()=>{ AI.setCfg({localModel:ml.value.trim()}); if(AI.warm)AI.warm(); render(); };
    // live connection status + populate the installed-model dropdown
    if(prov==='local'){ const live=$('#ailive'), sel=$('#aimodelL');
      (async()=>{
        try{
          const tags=await fetch(AI.localUrl()+'/api/tags').then(r=>r.ok?r.json():Promise.reject('http '+r.status));
          const models=(tags.models||[]).map(x=>x.name);
          if(sel && models.length){ const cur=AI.localModel(); sel.innerHTML=models.map(mm=>`<option value="${mm}" ${mm===cur?'selected':''}>${mm}</option>`).join(''); }
          const t0=performance.now(); let txt=''; try{ txt=await AI.color('You are an NFL color analyst. ONE short sentence.','React to: a deep 38-yard strike.',{numPredict:40}); }catch(e){}
          const ms=Math.round(performance.now()-t0);
          if(live){ if(txt) live.innerHTML=`<span style="color:#46d39a;font-weight:700">✓ Local AI connected</span> <span class="muted">· ${AI.localModel()} · ${ms}ms warm${ms>2500?' — try a 1b model for speed':''}</span>`;
            else live.innerHTML=`<span style="color:#e8b341;font-weight:700">⚠ Ollama reached, but no reply</span> <span class="muted">— is "${AI.localModel()}" pulled? <code>ollama pull ${AI.localModel()}</code></span>`; }
        }catch(e){ if(live) live.innerHTML=`<span class="bad" style="font-weight:700">✗ Ollama not reachable</span> <span class="muted">— start it: <code>OLLAMA_ORIGINS=* OLLAMA_KEEP_ALIVE=-1 ollama serve</code></span>`; }
      })();
    }
    const url=$('#aiurl'); if(url) url.onchange=()=>AI.setCfg({localUrl:url.value.trim()});
    const au=$('#aiauto'); if(au) au.onchange=()=>AI.setCfg({auto:au.checked});
    const tb=$('#aitest'); if(tb) tb.onclick=async()=>{ tb.textContent='Testing…'; try{ const t0=Date.now(); const txt=await AI.color('You are a fired-up NFL color analyst. ONE punchy sentence, max 20 words. No preamble.','React to: a 40-yard touchdown bomb on 3rd-and-long.',{numPredict:46}); const ms=Date.now()-t0; if(txt){ toast(`✓ Local AI live (${ms}ms): ${txt.slice(0,70)}`); } else { toast('No response — is Ollama up with OLLAMA_ORIGINS set?'); } }catch(e){ toast('Test failed: '+String(e.message||e).slice(0,80)); } tb.textContent='🔌 Test'; };
    const gb=$('#aigen'); if(gb) gb.onclick=()=>{ if(G._gazBusy){ if(AI.cancel)AI.cancel(); G._gazBusy=false; if(window._gazTick){clearInterval(window._gazTick);window._gazTick=null;} render(); return; } const kk=$('#aikey'); if(kk&&kk.value&&!kk.value.startsWith('•'))AI.setCfg({key:kk.value.trim()}); const mm=$('#aimodel'); if(mm)AI.setCfg({model:mm.value.trim()}); generateGazette(true); };
    const gbt=$('#aitestcloud'); if(gbt) gbt.onclick=async()=>{ const kk=$('#aikey'); if(kk&&kk.value&&!kk.value.startsWith('•'))AI.setCfg({key:kk.value.trim()}); const mm=$('#aimodel'); if(mm&&mm.value)AI.setCfg({model:mm.value.trim()});
      const o=gbt.textContent; gbt.textContent='Testing…';
      try{ const t0=Date.now(); const txt=await AI.call('Reply with exactly: OK','OK',16); G._gazErr=null; G._aiOk=true; toast(txt?`✓ Claude reachable (${Date.now()-t0}ms)`:'Connected, but the reply was empty.'); render(); return; }
      catch(e){ G._gazErr=String(e&&e.message||e); G._aiOk=false; toast('✗ '+String(e&&e.message||e).slice(0,150)); render(); return; }
      gbt.textContent=o; };
  },0);
}
// ===== THE NEWSPAPER — renders under the Gazette tab =====
function scrGazetteBody(m,t){
  // ---- rich edition: Claude's if written, otherwise the procedural prose paper ----
  let ai=G.gazettes&&G.gazettes[gazKey()];
  if(!ai && window.VOICES){ try{ ai=VOICES.proceduralGazette(); }catch(e){ ai=null; } }
  if(ai){ ai=sanitizeGazette(ai); renderAIGazette(m,ai); return; }
  const g=el('div','gaz'); const phaseLbl=G.phase==='offseason'?'OFFSEASON':G.phase==='playoffs'?'PLAYOFFS':`WEEK ${Math.min(G.week,G.maxWeek)}`;
  let html=`<h2>THE GRIDIRON GAZETTE</h2><div class="ged"><span>Vol. ${G.season-2025} · ${G.season} Season</span><span>${phaseLbl}</span><span>FPS Football 2026</span></div>`;
  // ---- lead story ----
  const lead = G.news.find(n=>['CHAMPION','AWARD','GAME'].includes(n.tag)) || G.news[0];
  if(lead) html+=`<h3 class="lead">${lead.txt}</h3>`;
  // ---- Player of the Week box ----
  const potw=G.awards&&G.awards.weekly&&G.awards.weekly[0];
  // ---- season award strip (offseason) ----
  const sa=G.awards&&G.awards.season&&G.awards.season[0];
  html+='<div class="gcols">';
  // main column: recaps
  html+='<div class="gmain">';
  if(sa && G.phase==='offseason'){
    const nm=x=>x?`${x.name} <span class="gsub">(${x.team})</span>`:'—';
    html+=`<div class="gbox"><h4>${sa.season} SEASON AWARDS</h4>
      <p><b>Most Valuable Player:</b> ${nm(sa.mvp)}</p>
      <p><b>Offensive Player of the Year:</b> ${nm(sa.opoy)}</p>
      <p><b>Defensive Player of the Year:</b> ${nm(sa.dpoy)}</p>
      ${sa.roy?`<p><b>Rookie of the Year:</b> ${nm(sa.roy)}</p>`:''}</div>`;
  }
  const games=G.news.filter(n=>n.tag==='GAME').slice(0,6);
  if(games.length){ html+='<h4 class="ghd">Around the League</h4>'; games.forEach(n=>html+=`<p class="gart">${n.txt}</p>`); }
  const trans=G.news.filter(n=>['TRADE','SIGNING','DRAFT','ROSTER','HOF'].includes(n.tag)).slice(0,5);
  if(trans.length){ html+='<h4 class="ghd">Transactions & Notes</h4>'; trans.forEach(n=>html+=`<p class="gart"><b>${n.tag}.</b> ${n.txt}</p>`); }
  const owner=G.news.filter(n=>['OWNER','RULES'].includes(n.tag)).slice(0,3);
  if(owner.length){ html+='<h4 class="ghd">League Office</h4>'; owner.forEach(n=>html+=`<p class="gart">${n.txt}</p>`); }
  html+='</div>';
  // sidebar: POTW + leaders + standings
  html+='<div class="gside">';
  if(potw){ const tm=team(potw.team); html+=`<div class="gbox star"><h4>★ Player of the Week</h4><div class="gstar">${potw.name}</div><div class="gsub">${potw.pos} · ${tm?tm.city+' '+tm.nick:potw.team}</div><div class="gsub">${potw.stat}</div></div>`; }
  if(typeof gazetteDigestBox!=='undefined') html+=gazetteDigestBox();
  html+=gazetteQuoteBox();
  const lb=(cat,label)=>{ const L=leaders(cat,5); if(!L.length)return ''; return `<div class="gbox"><h4>${label}</h4>`+L.map((x,i)=>`<div class="glead"><span>${i+1}. ${x.name} <span class="gsub">${x.team}</span></span><b>${x.val}</b></div>`).join('')+'</div>'; };
  html+=lb('pass','Passing Yards')+lb('rush','Rushing Yards')+lb('rec','Receiving Yards')+lb('sack','Sacks');
  // standings leaders
  const top=standings().slice(0,6);
  html+='<div class="gbox"><h4>Top of the League</h4>'+top.map(t=>`<div class="glead"><span>${t.city} ${t.nick}</span><b>${t.wins}-${t.losses}</b></div>`).join('')+'</div>';
  html+='</div></div>';
  g.innerHTML=html; m.appendChild(g);
}
function renderAIGazette(m,s){
  const wk=G.week, phaseLbl=wk===0?'PRESEASON':G.phase==='playoffs'?'PLAYOFFS':`WEEK ${Math.min(wk,G.maxWeek)}`;
  const E=x=>String(x==null?'':x);
  const lead=s.lead||{headline:s.lead_headline,body:s.lead_story,byline:'The Gazette',deck:'',dateline:'',pull_quote:''};
  const poll=s.power_poll||[], btn=s.by_the_numbers||[];
  const g=el('div','gaz news'); let h='';
  h+=`<div class="gmast"><div class="gmast-name">THE GRIDIRON GAZETTE</div>${s.edition_kicker?`<div class="gmast-kick">${E(s.edition_kicker)}</div>`:''}<div class="ged"><span>Vol. ${G.season-2025}, No. ${Math.min(wk,G.maxWeek||17)}</span><span>${phaseLbl}</span><span>"All the league that's fit to print"</span></div></div>`;
  h+=`<div class="gcols"><div class="gmain">`;
  h+=`<h3 class="lead">${E(lead.headline)}</h3>`;
  if(lead.deck) h+=`<div class="deck">${E(lead.deck)}</div>`;
  h+=`<div class="byline">By ${E(lead.byline||'The Gazette')}</div>`;
  if(lead.pull_quote) h+=`<div class="pq">${E(lead.pull_quote)}</div>`;
  h+=`<p class="gart drop">${lead.dateline?`<span class="dateline">${E(lead.dateline)}</span>`:''}${E(lead.body)}</p>`;
  if(s.preseason) h+=`<p class="gart">${E(s.preseason)}</p>`;
  if(s.column&&s.column.body) h+=`<div class="gcol"><div class="gcol-kick">THE MARIUCCI COLUMN</div><div class="mug">HM</div><h4 class="gcol-hd">${E(s.column.headline)}</h4><div class="byline">By ${E(s.column.byline||'Hank Mariucci')}</div><p class="gart">${E(s.column.body)}</p></div>`;
  h+=`</div><div class="gside">`;
  if(poll.length){ h+=`<div class="gbox poll"><h4>Power Poll</h4>`+poll.slice(0,8).map(p=>{ const a=p.move==='up'?`<span class="up">▲${p.delta||''}</span>`:p.move==='down'?`<span class="down">▼${p.delta||''}</span>`:p.move==='new'?`<span class="new">NEW</span>`:`<span class="same">—</span>`; return `<div class="pollrow"><span class="pr-rank">${p.rank}</span><b>${E(p.team)}</b> <span class="muted">${E(p.record)}</span> ${a}<div class="pr-blurb">${E(p.blurb)}</div></div>`; }).join('')+`</div>`; }
  else if(s.power_rankings) h+=`<div class="gbox"><h4>Power Rankings</h4><p>${E(s.power_rankings)}</p></div>`;
  if(btn.length) h+=`<div class="gbox numbers"><h4>By the Numbers</h4>`+btn.map(n=>`<div class="numrow"><span class="numstat">${E(n.stat)}</span><span class="numctx">${E(n.context)}</span></div>`).join('')+`</div>`;
  if(s.quote_of_week&&s.quote_of_week.text) h+=`<div class="gbox"><h4>🗣️ Quote of the Week</h4><p style="font-style:italic;line-height:1.5">“${E(s.quote_of_week.text)}”</p><p class="muted" style="font-size:11px;margin-top:5px">${E(s.quote_of_week.attribution)}</p></div>`;
  else h+=gazetteQuoteBox();
  h+=`</div></div>`;
  if(s.feature&&s.feature.body){ const fe=s.feature;
    h+=`<div class="gdiv">■ GAME OF THE WEEK ■</div><div class="feature"><div class="feat-kicker">${E(fe.kicker||'GAME OF THE WEEK')}</div><h3 class="feat-hd">${E(fe.headline)}</h3><div class="byline" style="text-align:center">By ${E(fe.byline||'Hank Mariucci')}${fe.dateline?` · <span class="dateline">${E(fe.dateline)}</span>`:''}</div>${fe.pull_quote?`<div class="pq" style="text-align:center;border:none;max-width:520px;margin:8px auto">${E(fe.pull_quote)}</div>`:''}<div class="gart drop feat-body">${E(fe.body)}</div></div>`; }
  const stories=s.game_stories||(s.game_features||[]).map(f=>({headline:f.headline,body:f.body}));
  if(stories.length){ h+=`<div class="gdiv">■ THE GAMES ■</div>`; stories.forEach(st=>{ h+=`<div class="gstory"><h4 class="ghd">${E(st.headline)}</h4>${st.byline?`<div class="byline">By ${E(st.byline)}${st.dateline?` · <span class="dateline">${E(st.dateline)}</span>`:''}</div>`:''}${st.turning_point?`<p class="turning"><b>TURNING POINT —</b> ${E(st.turning_point)}</p>`:''}<p class="gart">${E(st.body)}</p>${st.pull_quote?`<div class="pq small">${E(st.pull_quote)}</div>`:''}</div>`; }); }
  const nb=s.notebook||[], wire=s.wire||{}, beat=s.beat_notes;
  if(nb.length||(wire.transactions&&wire.transactions.length)||beat){ h+=`<div class="gdiv">■ AROUND THE LEAGUE ■</div><div class="gcols"><div class="gmain">`;
    if(nb.length) h+=`<div class="notebook"><h4 class="ghd">The Notebook</h4>`+nb.map(n=>`<p class="nbitem"><b>${E(n.tag)}.</b> ${E(n.hit)}</p>`).join('')+`</div>`;
    if(beat&&beat.body) h+=`<div class="gcol beat"><div class="gcol-kick">BRIGGS ON THE ${E(((team(beat.team)||{}).nick)||beat.team).toUpperCase()}</div><h4 class="gcol-hd">${E(beat.headline)}</h4><div class="byline">By ${E(beat.byline||'Theo Briggs')}</div><p class="gart">${E(beat.body)}</p>${(beat.notes||[]).length?`<ul class="beatnotes">`+beat.notes.map(x=>`<li>${E(x)}</li>`).join('')+`</ul>`:''}</div>`;
    h+=`</div><div class="gside">`;
    if((wire.transactions&&wire.transactions.length)||(wire.injuries&&wire.injuries.length)){ h+=`<div class="gbox wire"><h4>The Wire</h4>`; if(wire.transactions&&wire.transactions.length) h+=`<div class="wsub">TRANSACTIONS</div>`+wire.transactions.map(x=>`<p class="wln">${E(x)}</p>`).join(''); if(wire.injuries&&wire.injuries.length) h+=`<div class="wsub">INJURY REPORT</div>`+wire.injuries.map(x=>`<p class="wln">${E(x)}</p>`).join(''); h+=`</div>`; }
    else if(s.fa_rumors) h+=`<div class="gbox"><h4>Notebook</h4><p>${E(s.fa_rumors)}</p></div>`;
    if(s.game_balls&&s.game_balls.length) h+=`<div class="gbox balls"><h4>🏈 Game Balls</h4>`+s.game_balls.map(b=>`<div class="ballrow"><b>${E(b.player)}</b> <span class="muted">${E(b.team)}</span><div class="muted" style="font-size:11px">${E(b.reason)}</div></div>`).join('')+`</div>`;
    h+=`</div></div>`; }
  if(s.campus&&s.campus.body){ h+=`<div class="gdiv">■ CAMPUS &amp; BEYOND ■</div><div class="gcol campus"><div class="gcol-kick">CAMPUS REPORT</div><h4 class="gcol-hd">${E(s.campus.headline)}</h4><div class="byline">By ${E(s.campus.byline||'Sallie Crane')}</div><p class="gart">${E(s.campus.body)}</p>${(s.campus.heisman_watch||[]).length?`<div class="hwatch"><b>HEISMAN WATCH:</b> ${s.campus.heisman_watch.map(E).join(' · ')}</div>`:''}${s.campus.draft_riser?`<div class="hwatch"><b>DRAFT RISER:</b> ${E(s.campus.draft_riser)}</div>`:''}</div>`; }
  else if(s.ncaa_report) h+=`<div class="gdiv">■ CAMPUS ■</div><p class="gart">${E(s.ncaa_report)}</p>`;
  if(s.winners_losers&&((s.winners_losers.winners||[]).length||(s.winners_losers.losers||[]).length)){ const wl=s.winners_losers; h+=`<div class="wlbox"><div class="wlcol"><h4 class="win">✓ Winners</h4>${(wl.winners||[]).map(x=>`<p>${E(x)}</p>`).join('')}</div><div class="wlcol"><h4 class="lose">✗ Losers</h4>${(wl.losers||[]).map(x=>`<p>${E(x)}</p>`).join('')}</div></div>`; }
  if(s.mailbag&&s.mailbag.length) h+=`<div class="gdiv">■ THE MAILBAG ■</div><div class="mailbag">`+s.mailbag.map(q=>`<div class="mail"><p class="mq"><i>“${E(q.question)}”</i> <span class="muted">— ${E(q.from)}</span></p><p class="ma"><b>THE MAILMAN:</b> ${E(q.answer)}</p></div>`).join('')+`</div>`;
  if(s.analytics_desk&&s.analytics_desk.body) h+=`<div class="gcol analytics"><div class="gcol-kick">THE ANALYTICS DESK</div><h4 class="gcol-hd">${E(s.analytics_desk.headline)}</h4><div class="byline">By ${E(s.analytics_desk.byline||'Dr. Vanessa Pruitt')}</div><p class="gart">${E(s.analytics_desk.body)}</p></div>`;
  g.innerHTML=h; m.appendChild(g);
  if(s.talk_show){ const ts=el('div','card'); ts.style.cssText='margin-top:14px;background:#0c1320';
    ts.innerHTML='<h3>🎙️ The Two-Minute Drill</h3><div class="tshow">'+E(s.talk_show).split('\n').filter(Boolean).map(line=>{ const mh=line.match(/^\s*(MARV|DEION)\s*:\s*(.*)$/i); return mh?`<p class="tsl"><b>${mh[1].toUpperCase()}:</b> ${mh[2]}</p>`:`<p class="tsl">${line}</p>`; }).join('')+'</div>';
    m.appendChild(ts); }
}

/* ---------- Game Center (scoreboard + play-by-play) ---------- */
function scrScores(m){
  const res=G.lastResults||[];
  head(m,'Game Center', res.length?`Week ${G.week} — click any game for the full play-by-play`:'No games played yet — advance a week.');
  const grid=el('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(286px,1fr));gap:12px';
  if(!res.length){ (G.schedule[G.week]||[]).forEach(g=>{ const h=team(g.home),a=team(g.away); if(!h||!a)return;
      const c=el('div','card'); c.innerHTML=`<div class="gcrow"><span>${logoTag(a,24)} ${a.abbr}</span><span class="muted">${ENG.teamOvr(a)}</span></div><div class="gcrow"><span>${logoTag(h,24)} ${h.abbr}</span><span class="muted">${ENG.teamOvr(h)}</span></div><div class="muted gcfoot">UPCOMING</div>`;
      grid.appendChild(c); }); m.appendChild(grid); return; }
  res.forEach(r=>{ const h=team(r.home),a=team(r.away); if(!h||!a)return; const aw=r.as>=r.hs;
    const c=el('div','card gcard'); c.onclick=()=>showGame(r.home,r.away);
    c.innerHTML=`<div class="gcrow ${aw?'win':''}"><span>${logoTag(a,24)} ${a.city} ${a.nick}</span><b class="gcsc">${r.as}</b></div>
      <div class="gcrow ${!aw?'win':''}"><span>${logoTag(h,24)} ${h.city} ${h.nick}</span><b class="gcsc">${r.hs}</b></div>
      <div class="muted gcfoot">FINAL${r.ot?' · OT':''}${r.potg?` &nbsp;·&nbsp; ★ ${r.potg.name}`:''}</div>`;
    grid.appendChild(c); });
  m.appendChild(grid);
}
window.showGame=(homeAb,awayAb)=>{
  const r=(G.lastResults||[]).find(x=>x.home===homeAb&&x.away===awayAb); if(!r)return;
  const h=team(homeAb),a=team(awayAb); const pbp=resultPBP(r);
  const perf=[...r.box.away.lines,...r.box.home.lines].filter(l=>l.key).sort((x,y)=>(y.fp||0)-(x.fp||0)).slice(0,6);
  // ---- ordered reveal tokens: quarter headers, drive headers, then each play ----
  const tokens=[]; let curq=0;
  pbp.forEach(d=>{ if(d.q!==curq){ curq=d.q; tokens.push({t:'q', beat:360, html:`<div class="qhd">Quarter ${curq}</div>`}); }
    const dt=team(d.team), scoring=!!d.pts;
    tokens.push({t:'drive', beat:scoring?460:240, html:`<div class="drv"><div class="drvh">${logoTag(dt,16)} <b>${dt.abbr}</b> <span class="${scoring?'acc':'muted'}">${d.result}${d.pts?' +'+d.pts:''}</span><span class="drvsc">${d.h}–${d.a}</span></div></div>`});
    (d.plays||[]).forEach(p=>{ const big=/touchdown|intercept|fumble|\bGONE\b|sack/i.test(p); tokens.push({t:'play', beat:big?230:95, html:`<div class="ply">${p}</div>`}); }); });
  pbpBuildStop();
  closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=e=>{if(e.target.id==='ovl'){pbpBuildStop();closeOvl();}};
  o.innerHTML=`<div class="pc" style="width:700px">
    <div class="pchd gamehd"><div class="gscore">
      <div class="gtm">${logoTag(a,44)}<div>${a.abbr}</div></div>
      <div class="gfinal">${r.as}<span class="muted"> – </span>${r.hs}</div>
      <div class="gtm">${logoTag(h,44)}<div>${h.abbr}</div></div>
    </div><span class="x" onclick="pbpBuildStop();closeOvl()">✕</span></div>
    <div class="pcbody">
      <div class="muted" style="text-align:center;margin-bottom:10px">FINAL${r.ot?' · OVERTIME':''} — ${a.city} ${a.nick} at ${h.city} ${h.nick}</div>
      ${perf.length?`<div class="grphd">Top Performers</div><div class="perfrow">`+perf.map(l=>`<span class="perf"><span class="pname" onclick="showPlayer(${l.id})">${l.name}</span> <span class="tag">${l.pos}</span> ${l.stat}</span>`).join('')+`</div>`:''}
      <div class="grphd" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px">Play-by-Play <button id="pbpskip" class="btn sec" style="padding:2px 10px;font-size:11px">⏭ Skip to end</button></div>
      <div id="pbpstream" class="pbpstream" style="max-height:48vh;overflow:auto;padding-right:4px"></div>
    </div></div>`;
  document.body.appendChild(o);
  pbpBuildStart(tokens);
};
// ---- progressive play-by-play: reveal the game drive-by-drive, play-by-play, like it's happening live ----
function pbpBuildStop(){ if(window._pbpBuildTimer){ clearTimeout(window._pbpBuildTimer); window._pbpBuildTimer=null; } }
function pbpAppendToken(tok){
  const stream=document.getElementById('pbpstream'); if(!stream) return null;
  if(tok.t==='play' && window._pbpCurDrive){ window._pbpCurDrive.insertAdjacentHTML('beforeend', tok.html); return window._pbpCurDrive.lastElementChild; }
  stream.insertAdjacentHTML('beforeend', tok.html); const node=stream.lastElementChild;
  window._pbpCurDrive = (tok.t==='drive') ? node : (tok.t==='q' ? null : window._pbpCurDrive);
  return node;
}
function pbpBuildStart(tokens){
  window._pbpTokens=tokens; window._pbpIdx=0; window._pbpCurDrive=null;
  const skip=document.getElementById('pbpskip'); if(skip) skip.onclick=pbpBuildAll;
  const step=()=>{
    const toks=window._pbpTokens; if(!toks) return;
    if(window._pbpIdx>=toks.length){ pbpBuildStop(); const sk=document.getElementById('pbpskip'); if(sk) sk.style.display='none'; return; }
    const tok=toks[window._pbpIdx++], node=pbpAppendToken(tok);
    if(node && node.animate){ try{ node.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:200,easing:'ease-out'}); }catch(e){} }
    const s=document.getElementById('pbpstream'); if(s) s.scrollTop=s.scrollHeight;
    window._pbpBuildTimer=setTimeout(step, tok.beat||120);
  };
  step();
}
function pbpBuildAll(){
  pbpBuildStop(); const toks=window._pbpTokens; if(!toks) return;
  while(window._pbpIdx<toks.length){ pbpAppendToken(toks[window._pbpIdx++]); }
  const s=document.getElementById('pbpstream'); if(s) s.scrollTop=s.scrollHeight;
  const skip=document.getElementById('pbpskip'); if(skip) skip.style.display='none';
}

/* ---------- season data (shared by the in-browser Claude newsroom + the export) ---------- */
function stripHTML(x){ return String(x||'').replace(/<\/?[^>]+>/g,'').replace(/\s+/g,' ').trim(); }
function resultPBP(r){
  if(!r) return [];
  if(Array.isArray(r.pbp)&&r.pbp.length) return r.pbp;
  const h=team(r.home), a=team(r.away);
  r.pbp=(h&&a&&r.box) ? ENG.playByPlay(h,a,r) : [];
  return r.pbp;
}
function resultSideBox(r, ab){ return r&&r.box ? (r.home===ab?r.box.home:r.away===ab?r.box.away:null) : null; }
function resultLines(r, ab){ const b=resultSideBox(r,ab); return b&&b.lines ? b.lines.map(normalizeLineStats) : []; }
function topLine(r, ab, pred, score){
  return resultLines(r,ab).filter(pred).sort((a,b)=>score(b)-score(a))[0]||null;
}
function driveCounts(pbp, ab){
  const d={TD:0,FG:0,SAF:0,INT:0,FUMBLE:0,DOWNS:0,PUNT:0};
  (pbp||[]).filter(x=>x.team===ab).forEach(x=>{ d[x.result]=(d[x.result]||0)+1; });
  return d;
}
function boxTurnovers(r, ab){ return resultLines(r,ab).reduce((a,l)=>a+(l.intp||0)+(l.fum||0),0); }
function sourcedGameRecap(r){
  const h=team(r.home), a=team(r.away); if(!h||!a) return null;
  const hw=r.hs>=r.as, w=hw?h:a, l=hw?a:h, ws=hw?r.hs:r.as, ls=hw?r.as:r.hs;
  const pbp=resultPBP(r), wc=driveCounts(pbp,w.abbr), lc=driveCounts(pbp,l.abbr);
  const wQB=topLine(r,w.abbr,x=>x.pos==='QB'||x.patt||x.pyd,x=>x.pyd||0);
  const wRB=topLine(r,w.abbr,x=>x.car||x.ryd||x.rtd,x=>(x.ryd||0)+(x.rtd||0)*28+(x.car||0));
  const wRec=topLine(r,w.abbr,x=>x.rec||x.recyd||x.rectd,x=>(x.recyd||0)+(x.rectd||0)*30+(x.rec||0)*4);
  const lQB=topLine(r,l.abbr,x=>x.pos==='QB'||x.patt||x.pyd,x=>x.pyd||0);
  const lRB=topLine(r,l.abbr,x=>x.car||x.ryd||x.rtd,x=>(x.ryd||0)+(x.rtd||0)*28+(x.car||0));
  const lRec=topLine(r,l.abbr,x=>x.rec||x.recyd||x.rectd,x=>(x.recyd||0)+(x.rectd||0)*30+(x.rec||0)*4);
  const wDef=topLine(r,w.abbr,x=>x.sack||x.intc||x.tkl||x.pr,x=>(x.sack||0)*12+(x.intc||0)*12+(x.pr||0)*2+(x.tkl||0));
  const lDef=topLine(r,l.abbr,x=>x.sack||x.intc||x.tkl||x.pr,x=>(x.sack||0)*12+(x.intc||0)*12+(x.pr||0)*2+(x.tkl||0));
  const compact=l=>l?`${l.name} (${l.pos}) ${lineStatText(l)}`:'';
  const flow=`${w.abbr} scoring: ${wc.TD||0} TD, ${wc.FG||0} FG${wc.SAF?`, ${wc.SAF} safety`:''}; ${l.abbr} scoring: ${lc.TD||0} TD, ${lc.FG||0} FG${lc.SAF?`, ${lc.SAF} safety`:''}.`;
  const wTO=boxTurnovers(r,w.abbr), lTO=boxTurnovers(r,l.abbr);
  const turnoverLine=(wTO||lTO)?` Box-score turnovers: ${w.abbr} ${wTO}, ${l.abbr} ${lTO}.`:'';
  const headline=`${w.city} defeat ${l.city}, ${ws}-${ls}${r.ot?' (OT)':''}`;
  const facts=[compact(wQB),compact(wRB),compact(wRec)].filter(Boolean).slice(0,3).join('; ');
  const answer=[compact(lQB),compact(lRB),compact(lRec)].filter(Boolean).slice(0,2).join('; ');
  const defense=[compact(wDef),compact(lDef)].filter(Boolean).join('; ');
  return {headline, body:`${w.city} ${w.nick} beat ${l.city} ${l.nick} ${ws}-${ls}${r.ot?' in overtime':''}. ${facts?`For ${w.abbr}, ${facts}. `:''}${answer?`${l.abbr}'s best production: ${answer}. `:''}${defense?`Defensive notes: ${defense}. `:''}${flow}${turnoverLine} Every note here comes from the saved game record.`};
}
function sourcedGameFeatures(results,n){
  return (results||[]).slice().sort((a,b)=>Math.abs((b.hs||0)-(b.as||0))-Math.abs((a.hs||0)-(a.as||0))).slice(0,n||3).map(sourcedGameRecap).filter(Boolean);
}
window.sourcedGameFeatures=sourcedGameFeatures;
function sanitizeGazette(s){
  s=s||{};
  const gf=sourcedGameFeatures(G.lastResults||[],3);
  if(gf.length){ s.game_features=gf;
    if(Array.isArray(s.game_stories)){ s.game_stories=s.game_stories.map((st,i)=>gf[i]?Object.assign({},st,{headline:st.headline||gf[i].headline,body:gf[i].body}):st); }
    else s.game_stories=gf.map(f=>({headline:f.headline,byline:'The Gazette',body:f.body})); }
  return s;
}
// pick the most dramatic game of the week — feeds the long-form feature
function cgGameOfWeek(results){ if(!results||!results.length) return null;
  let best=null,bestSc=-1;
  results.forEach(r=>{ if(r.hs==null) return; const margin=Math.abs(r.hs-r.as), combined=r.hs+r.as;
    let sc=62 - margin*2.2 + (r.ot?40:0) + combined*0.45 + (Math.min(r.hs,r.as)>=24?12:0);
    try{ const dr=resultPBP(r); let led=null,changes=0; dr.forEach(d=>{ const h=d.score?d.score[0]:d.h, a=d.score?d.score[1]:d.a; const cur=h>a?'h':a>h?'a':null; if(cur&&led&&cur!==led)changes++; if(cur)led=cur; }); sc+=changes*9; }catch(e){}
    if(sc>bestSc){ bestSc=sc; best=r; } });
  return best; }
function cgGowLabel(r){ if(!r) return ''; const m=Math.abs(r.hs-r.as), c=r.hs+r.as;
  return r.ot?'an overtime classic':m<=3?'a one-score thriller':c>=60?'a shootout for the ages':m<=8?'a fourth-quarter slugfest':'the marquee tilt'; }
function buildSeasonData(){
  const myGame=(G.lastResults||[]).find(r=>r.home===USER||r.away===USER);
  const pbp = myGame ? resultPBP(myGame).map(d=>({team:d.team,q:d.q,result:d.result,pts:d.pts,score:[d.h,d.a],plays:d.plays.map(stripHTML)})) : [];
  const gameExport=(G.lastResults||[]).map(r=>({home:r.home,away:r.away,hs:r.hs,as:r.as,ot:r.ot,potg:r.potg,
      box:[...r.box.home.lines,...r.box.away.lines].map(l=>{ normalizeLineStats(l); return {name:l.name,pos:l.pos,stat:lineStatText(l),id:l.id,
        pyd:l.pyd||0,ptd:l.ptd||0,intp:l.intp||0,patt:l.patt||0,pcmp:l.pcmp||0,ryd:l.ryd||0,rtd:l.rtd||0,car:l.car||0,rec:l.rec||0,recyd:l.recyd||0,rectd:l.rectd||0,tgt:l.tgt||0,
        tkl:l.tkl||0,sack:l.sack||0,intc:l.intc||0,pr:l.pr||0,hurry:l.hurry||0,qbhit:l.qbhit||0,tfl:l.tfl||0,pbu:l.pbu||0,ff:l.ff||0,fr:l.fr||0,big:l.big||0}; }),
      pbp:resultPBP(r).map(d=>({team:d.team,q:d.q,result:d.result,pts:d.pts,score:[d.h,d.a],plays:d.plays.map(stripHTML)}))}));
  return {
    season:G.season, week:G.week, user:USER, rules:G.rules,
    standings:standings().map(t=>({team:t.abbr,city:t.city,nick:t.nick,conf:t.conf,div:t.div,w:t.wins,l:t.losses,pf:t.pf,pa:t.pa,ovr:ENG.teamOvr(t)})),
    results:gameExport,
    sourced_game_features:sourcedGameFeatures(G.lastResults||[],3),
    userGamePBP:{game:myGame?{home:myGame.home,away:myGame.away,hs:myGame.hs,as:myGame.as}:null, drives:pbp},
    game_of_week:(()=>{ const g=cgGameOfWeek(G.lastResults||[]); if(!g) return null;
      return { home:g.home, away:g.away, homeCity:(team(g.home)||{}).city, awayCity:(team(g.away)||{}).city, hs:g.hs, as:g.as, ot:!!g.ot, potg:g.potg, label:cgGowLabel(g),
        box:[...g.box.home.lines,...g.box.away.lines].filter(l=>(l.pyd||l.ryd||l.recyd||l.sack||l.intc||l.ptd||l.rtd||l.rectd)).slice(0,16).map(l=>{normalizeLineStats(l);return {name:l.name,pos:l.pos,team:l.team,stat:lineStatText(l)};}),
        drives:resultPBP(g).map(d=>({team:d.team,q:d.q,result:d.result,pts:d.pts,score:[d.score?d.score[0]:d.h,d.score?d.score[1]:d.a],plays:d.plays.map(stripHTML)})) }; })(),
    leaders:{pass:leaders('pass',6),rush:leaders('rush',6),rec:leaders('rec',6),sack:leaders('sack',6),pressure:leaders('pressure',6),explosive:leaders('explosive',6),tfl:leaders('tfl',6)},
    awards:(G.awards&&G.awards.weekly||[]).slice(0,4),
    mvpRace:(G.mvpRace||[]).slice(0,5),
    records:Object.values(G.records||{}).map(r=>({label:r.label,val:r.val,name:r.name,team:r.team})),
    offField:G.news.filter(n=>['SUSPENSION','LEGAL','INCIDENT','HOLDOUT','REQUEST','INJURY'].includes(n.tag)).slice(0,8).map(n=>n.txt),
    transactions:G.news.filter(n=>['TRADE','SIGNING','ROSTER','STAFF'].includes(n.tag)).slice(0,10).map(n=>n.txt),
    freeAgents:(()=>{buildFAPool();return G.faPool.slice(0,24).map(p=>({name:p.name,pos:p.pos,age:p.age,ovr:p.ovr,ask:p.ask,from:p.from}));})(),
    expiringStars:allPlayers().filter(x=>x.p.ovr>=80&&(x.p.years||9)<=1).slice(0,16).map(x=>({name:x.p.name,pos:x.p.pos,team:x.t.abbr,ovr:x.p.ovr,age:x.p.age})),
    college:G.college?{week:G.college.week,heisman:(G.college.heisman||[]).slice(0,8),stories:(G.college.stories||[]).slice(0,12).map(s=>s.txt)}:null,
    prospects:(G.prospects||[]).slice(0,40).map(p=>({name:p.name,pos:p.pos,school:p.school,grade:p.grade,projRound:p.projRound,
      college:p.college?{year:p.college.year,story:p.college.archLabel,stock:p.college.stock,stat:collegeStatLine(p)}:null})),
    teamNeeds:G.teams.map(t=>{const nd=ENG.needs(t);const top=Object.keys(nd).sort((a,b)=>nd[b]-nd[a]).slice(0,3);return {team:t.abbr,needs:top,cap:capSpace(t)};})
  };
}
function exportSeason(){
  const data=buildSeasonData();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=el('a'); a.href=URL.createObjectURL(blob); a.download=`fps2026_season${data.season}_wk${data.week}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Exported — or just set your key in the Newsroom for automatic Gazettes.');
}
window.exportSeason=exportSeason;

/* ---------- in-browser Claude newsroom: writes the Gazette automatically ---------- */
function gazKey(){ return G.season+'_'+G.week; }
async function generateGazette(manual){
  if(!AI.ready()){ if(manual)toast('Add your Anthropic API key in the Newsroom first.'); return; }
  if(G._gazBusy) return;
  G._gazBusy=true; G._gazErr=null; if(VIEW==='gazette'||VIEW==='settings')render();
  G._gazT0=Date.now(); if(window._gazTick)clearInterval(window._gazTick);   // live elapsed counter on the Cancel button so a long write shows progress, never a frozen "Writing…"
  window._gazTick=setInterval(()=>{ if(!G||!G._gazBusy){ if(window._gazTick){clearInterval(window._gazTick);window._gazTick=null;} return; } const b=(typeof $==='function')&&$('#aigen'); if(b)b.textContent='✕ Cancel · '+Math.round((Date.now()-G._gazT0)/1000)+'s'; },500);
  try{
    const ai=sanitizeGazette(await AI.gazette(buildSeasonData()));
    const proc=(window.VOICES&&VOICES.proceduralGazette)?VOICES.proceduralGazette():{};
    const empty=v=>v==null||v===''||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length);
    const s=Object.assign({},proc);   // procedural backfill — a complete paper even if the model omits/truncates fields
    Object.keys(ai).forEach(k=>{ if(!empty(ai[k])) s[k]=ai[k]; });   // the AI's own sections win where present
    G.gazettes=G.gazettes||{}; G.gazettes[gazKey()]=s;
    const _lead=s.lead||{headline:s.lead_headline,body:s.lead_story};
    window.STORIES=[{headline:_lead.headline,body:_lead.body}]
      .concat((s.game_stories||s.game_features||[]).map(x=>({headline:x.headline,body:x.body})))
      .concat(s.column?[{headline:s.column.headline,body:s.column.body}]:[])
      .concat(s.beat_notes?[{headline:s.beat_notes.headline,body:s.beat_notes.body}]:[])
      .concat(s.campus?[{headline:s.campus.headline,body:s.campus.body}]:[]).filter(x=>x&&x.body);
    G._aiOk=true; toast('📰 Newsroom: this week\'s Gazette is in.');
  }catch(e){ G._gazErr=String(e.message||e); G._aiOk=false; if(manual)toast('Newsroom error — see the Gazette page.'); }
  G._gazBusy=false; if(window._gazTick){clearInterval(window._gazTick);window._gazTick=null;} save(); if(VIEW==='gazette'||VIEW==='wire'||VIEW==='settings')render();
}
window.generateGazette=generateGazette;
function autoGazette(){ if(AI.cfg().auto && AI.ready()) generateGazette(false); }

/* ---------- The Field — live physics-sim visualizer (modern rebuild of HIKE's engine) ---------- */
let FSIM=null, FLOS=40, FOPP=null, FAUTO=0, CGSIM=null;
/* ============================================================
   COACH MODE — interactive, decision-driven gameplay.
   You call offense AND defense; plays resolve through a matchup
   matrix (your call vs theirs + ratings + variance). Clock, downs,
   momentum, 4th-down & 2-pt calls, commentary, drama.
   ============================================================ */
let CG=null;
const OFF_PLAYS=[
  {k:'inside', label:'Duo / Inside Zone', type:'run',  family:'run', profile:'inside', personnel:'12', formation:'Singleback Ace', hint:'double teams, downhill read'},
  {k:'outside',label:'Wide Zone',         type:'run',  family:'run', profile:'outside',personnel:'21', formation:'Strong I',        hint:'stretch the front, cut back'},
  {k:'short',  label:'Stick / Quick Game',type:'pass', family:'quick',profile:'short',  personnel:'11', formation:'Trips Right',     hint:'rhythm throw, blitz answer'},
  {k:'pa',     label:'Play-Action Flood', type:'pass', family:'shot', profile:'pa',     personnel:'12', formation:'Ace Y-Flex',      hint:'sell run, hit the sideline'},
  {k:'screen', label:'RB Screen',         type:'pass', family:'quick',profile:'screen', personnel:'11', formation:'Shotgun Doubles',  hint:'invite pressure, release'},
  {k:'deep',   label:'Four Verticals',    type:'pass', family:'shot', profile:'deep',   personnel:'10', formation:'Spread',          hint:'stress safeties vertically'},
  {k:'power',label:'Power O',type:'run',family:'run',profile:'inside',personnel:'21',formation:'I-Right',hint:'pull guard, downhill'},
  {k:'counter',label:'Counter Trey',type:'run',family:'run',profile:'inside',personnel:'12',formation:'Wing Tight',hint:'misdirection gap run'},
  {k:'trap',label:'Wham / Trap',type:'run',family:'run',profile:'inside',personnel:'22',formation:'Jumbo Ace',hint:'hit inside fast'},
  {k:'draw',label:'Shotgun Draw',type:'run',family:'run',profile:'inside',personnel:'11',formation:'Gun Doubles',hint:'use pass rush against them'},
  {k:'toss',label:'Crack Toss',type:'run',family:'run',profile:'outside',personnel:'21',formation:'Strong Slot',hint:'edge speed, WR crack'},
  {k:'stretch',label:'Outside Stretch',type:'run',family:'run',profile:'outside',personnel:'12',formation:'Singleback Wing',hint:'race to the landmark'},
  {k:'pinpull',label:'Pin-Pull Sweep',type:'run',family:'run',profile:'outside',personnel:'12',formation:'Bunch Wing',hint:'linemen in space'},
  {k:'iso',label:'Lead Iso',type:'run',family:'run',profile:'inside',personnel:'21',formation:'I-Formation',hint:'fullback into the hole'},
  {k:'zone_read',label:'Zone Read',type:'run',family:'run',profile:'outside',personnel:'11',formation:'Pistol Slot',hint:'read the edge defender'},
  {k:'rpo_bubble',label:'RPO Bubble',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Gun Trips',hint:'conflict the apex'},
  {k:'slants',label:'Double Slants',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Gun Doubles',hint:'win inside leverage'},
  {k:'mesh',label:'Mesh Crossers',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Gun Bunch',hint:'rub routes vs man'},
  {k:'hoss',label:'Hoss Juke',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Empty',hint:'seams outside, option inside'},
  {k:'levels',label:'Levels',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Trips Open',hint:'high-low linebackers'},
  {k:'drive',label:'Drive Concept',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Singleback Trips',hint:'dig plus shallow'},
  {k:'spacing',label:'Spacing',type:'pass',family:'quick',profile:'short',personnel:'10',formation:'Spread Empty',hint:'cheap completion'},
  {k:'y_cross',label:'Y-Cross',type:'pass',family:'shot',profile:'pa',personnel:'11',formation:'Gun Trips',hint:'crosser vs zone'},
  {k:'boot',label:'Bootleg Sail',type:'pass',family:'shot',profile:'pa',personnel:'12',formation:'Ace Boot',hint:'move the pocket'},
  {k:'dagger',label:'Dagger',type:'pass',family:'shot',profile:'pa',personnel:'11',formation:'Gun Doubles',hint:'clearout plus dig'},
  {k:'mills',label:'Mills Shot',type:'pass',family:'shot',profile:'deep',personnel:'11',formation:'Gun Slot',hint:'post over dig'},
  {k:'switch',label:'Switch Verticals',type:'pass',family:'shot',profile:'deep',personnel:'10',formation:'Trips Wide',hint:'release switch'},
  {k:'deep_over',label:'Deep Over',type:'pass',family:'shot',profile:'pa',personnel:'12',formation:'Singleback Pair',hint:'bend behind LBs'},
  {k:'shallow_screen',label:'WR Tunnel Screen',type:'pass',family:'quick',profile:'screen',personnel:'11',formation:'Trips Stack',hint:'blockers in front'},
  {k:'te_screen',label:'TE Leak Screen',type:'pass',family:'quick',profile:'screen',personnel:'12',formation:'Wing Pair',hint:'delay and release'},
  {k:'wheel',label:'RB Wheel',type:'pass',family:'shot',profile:'pa',personnel:'21',formation:'Pistol Strong',hint:'back up the sideline'},
  {k:'red_fade',label:'Goal-Line Fade',type:'pass',family:'shot',profile:'deep',personnel:'11',formation:'Red Zone Trips',hint:'isolate the mismatch'},
  {k:'qb_power',label:'QB Power',type:'run',family:'run',profile:'inside',personnel:'11',formation:'Pistol Heavy',hint:'extra blocker, keeper'},
  {k:'jet_sweep',label:'Jet Sweep',type:'run',family:'run',profile:'outside',personnel:'11',formation:'Orbit Motion',hint:'speed to the edge'},
  {k:'sneak',label:'QB Sneak',type:'run',family:'run',profile:'inside',personnel:'23',formation:'Heavy Tight',hint:'one yard, no drama'},
  {k:'jumbo_power',label:'Jumbo Power',type:'run',family:'run',profile:'inside',pkg:'jumbo',personnel:'Jumbo',formation:'6 OL Heavy',hint:'extra tackle, move bodies'},
  {k:'jumbo_blast',label:'Goal-Line Blast',type:'run',family:'run',profile:'inside',pkg:'jumbo',personnel:'Jumbo 23',formation:'Goal Line',hint:'fullback and extra gaps'},
  {k:'jumbo_toss',label:'Heavy Toss Crack',type:'run',family:'run',profile:'outside',pkg:'jumbo',personnel:'Jumbo 22',formation:'Unbalanced Wing',hint:'big bodies seal the edge'},
  {k:'jumbo_leak',label:'Jumbo PA Leak',type:'pass',family:'shot',profile:'pa',pkg:'jumbo',personnel:'Jumbo',formation:'Heavy Leak',hint:'sell power, hide the TE'},
  {k:'hands_choice',label:'Hands Choice',type:'pass',family:'quick',profile:'short',pkg:'hands',personnel:'Hands',formation:'Trips Choice',hint:'best hands, option routes'},
  {k:'hands_stick',label:'Hands Stick',type:'pass',family:'quick',profile:'short',pkg:'hands',personnel:'Hands',formation:'Empty Secure',hint:'safe throw, protect the ball'},
  {k:'hands_screen',label:'Hands Screen',type:'pass',family:'quick',profile:'screen',pkg:'hands',personnel:'Hands',formation:'Bunch Screen',hint:'catch it clean, get down'},
  {k:'four_minute',label:'Four-Minute Dive',type:'run',family:'run',profile:'inside',pkg:'hands',personnel:'Hands 12',formation:'Ace Tight',hint:'secure the ball, burn clock'},
  {k:'glance',label:'RPO Glance',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Gun Trips',hint:'read the box, throw the slant'},
  {k:'slant_flat',label:'Slant-Flat',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Gun Doubles',hint:'man-zone beater, easy read'},
  {k:'smash',label:'Smash-7',type:'pass',family:'shot',profile:'pa',personnel:'11',formation:'Trips Right',hint:'high-low the corner'},
  {k:'seam',label:'Seam Shot',type:'pass',family:'shot',profile:'deep',personnel:'11',formation:'Gun Bunch',hint:'split the safeties'},
  {k:'duo_lead',label:'Duo Lead',type:'run',family:'run',profile:'inside',personnel:'21',formation:'Offset I',hint:'vertical double teams'},
  {k:'crack_sweep',label:'Crack Sweep',type:'run',family:'run',profile:'outside',personnel:'11',formation:'Gun Trips',hint:'WR cracks, tackle leads'},
  {k:'split_zone',label:'Split Zone',type:'run',family:'run',profile:'inside',personnel:'12',formation:'Ace Wing',hint:'TE seals the backside'},
  {k:'gt_counter',label:'GT Counter',type:'run',family:'run',profile:'inside',personnel:'21',formation:'Gun Offset',hint:'guard-tackle pull power'},
  {k:'mid_zone',label:'Mid Zone',type:'run',family:'run',profile:'outside',personnel:'11',formation:'Gun Doubles',hint:'press the gap, read the cut'},
  {k:'power_read',label:'Power Read',type:'run',family:'run',profile:'outside',personnel:'11',formation:'Pistol Slot',hint:'pull the guard, read the end'},
  {k:'flood',label:'Flood / Sail',type:'pass',family:'shot',profile:'pa',personnel:'11',formation:'Trips Right',hint:'three levels, one side'},
  {k:'sail_cross',label:'Drive-Sail',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Gun Trips',hint:'shallow + dig, easy read'},
  {k:'stick_nod',label:'Stick-Nod',type:'pass',family:'quick',profile:'short',personnel:'11',formation:'Trips Right',hint:'hesitate, then up the seam'},
  {k:'post_wheel',label:'Post-Wheel',type:'pass',family:'shot',profile:'deep',personnel:'11',formation:'Gun Slot',hint:'post clears, wheel under'},
  {k:'te_seam',label:'TE Seam',type:'pass',family:'shot',profile:'deep',personnel:'12',formation:'Ace Y-Iso',hint:'mismatch up the hash'},
  {k:'slot_choice',label:'Slot Choice',type:'pass',family:'quick',profile:'short',personnel:'10',formation:'Empty',hint:'let the slot win his leverage'},
];
const DEF_PLAYS=[
  {k:'base',    label:'Nickel Cover 3',     profile:'base', front:'4-2-5', shell:'single-high zone', hint:'balanced early-down answer'},
  {k:'run_stop',label:'Bear Front',         profile:'run_stop', front:'5-2',   shell:'single-high run fit', hint:'extra hat in the box'},
  {k:'blitz',   label:'Zero Pressure',      profile:'blitz', front:'nickel',shell:'cover 0 blitz', hint:'heat now, corners alone'},
  {k:'press',   label:'Press Man Free',     profile:'press', front:'4-2-5', shell:'man with post safety', hint:'jam timing routes'},
  {k:'cover',   label:'Two-High Quarters',  profile:'cover', front:'4-2-5', shell:'split safety', hint:'cap explosives'},
  {k:'spy',     label:'Robber Spy',         profile:'spy', front:'nickel',shell:'low-hole robber', hint:'contain QB movement'},
  {k:'under',label:'4-3 Under',profile:'base',front:'4-3 under',shell:'match Cover 3',hint:'set the edge'},
  {k:'over',label:'4-3 Over',profile:'base',front:'4-3 over',shell:'quarters read',hint:'balanced run/pass fit'},
  {k:'tite',label:'Tite Front',profile:'run_stop',front:'3-3-5 tite',shell:'split safety fit',hint:'close interior gaps'},
  {k:'goal_bear',label:'Goal-Line Bear',profile:'run_stop',front:'6-2 heavy',shell:'zero run fit',hint:'win the inch'},
  {k:'tampa2',label:'Tampa 2',profile:'cover',front:'4-2-5',shell:'2-deep, mike runs the seam',hint:'cap seams, rally up'},
  {k:'fire_zone',label:'Fire Zone',profile:'blitz',front:'nickel',shell:'3-deep 3-under fire',hint:'5 rush, drop a lineman'},
  {k:'cov1_robber',label:'Cover 1 Robber',profile:'press',front:'4-2-5',shell:'man-free, rat in the hole',hint:'jam outside, rob the dig'},
  {k:'dime_soft',label:'Dime Soft',profile:'cover',front:'3-3-5',shell:'2-deep prevent',hint:'no explosives, tackle in front'},
  {k:'pinch',label:'Pinch Slant',profile:'run_stop',front:'4-2-5 pinch',shell:'single-high',hint:'slant into zone runs'},
  {k:'wide9',label:'Wide-9 Rush',profile:'blitz',front:'wide-9 nickel',shell:'Cover 1',hint:'scream off the edge'},
  {k:'sim_pressure',label:'Sim Pressure',profile:'blitz',front:'4-2-5 mug',shell:'three-deep fire zone',hint:'show six, bring four'},
  {k:'double_a',label:'Double-A Mug',profile:'blitz',front:'nickel mug',shell:'hot pressure',hint:'stress protection calls'},
  {k:'slot_fire',label:'Slot Fire Zone',profile:'blitz',front:'nickel',shell:'three-under three-deep',hint:'nickel off the edge'},
  {k:'green_dog',label:'Green-Dog Blitz',profile:'blitz',front:'4-2-5',shell:'man match',hint:'back blocks, LB comes'},
  {k:'cover1',label:'Cover 1 Rat',profile:'press',front:'4-2-5',shell:'man free robber',hint:'rob the middle'},
  {k:'two_man',label:'Two-Man Under',profile:'press',front:'dime',shell:'two-high man',hint:'trail with help'},
  {k:'press2',label:'Press Cover 2',profile:'press',front:'nickel',shell:'cloud corners',hint:'jam then sink'},
  {k:'quarters',label:'Palms / Quarters',profile:'cover',front:'4-2-5',shell:'pattern-match quarters',hint:'bracket verticals'},
  {k:'tampa2',label:'Tampa 2',profile:'cover',front:'4-3 nickel',shell:'middle-runner zone',hint:'make them check down'},
  {k:'cover6',label:'Cover 6',profile:'cover',front:'nickel',shell:'quarter-quarter-half',hint:'lean to the passing strength'},
  {k:'bracket',label:'Bracket WR1',profile:'cover',front:'dime',shell:'two-high bracket',hint:'erase their star'},
  {k:'cloud',label:'Cloud Corner',profile:'cover',front:'nickel',shell:'rolled coverage',hint:'trap the flat'},
  {k:'spy2',label:'QB Spy Nickel',profile:'spy',front:'4-2-5',shell:'spy plus quarters',hint:'eyes on the QB'},
  {k:'contain',label:'Edge Contain',profile:'spy',front:'5-man contain',shell:'Cover 3',hint:'keep rush lanes'},
  {k:'banjo',label:'Banjo Bunch Check',profile:'base',front:'nickel',shell:'switch-match',hint:'handle stacks and picks'},
  {k:'red_zone_match',label:'Red-Zone Match',profile:'cover',front:'4-2-5',shell:'goal-line quarters',hint:'windows get tiny'},
  {k:'prevent',label:'Prevent Dime',profile:'cover',front:'3-man rush',shell:'deep umbrella',hint:'keep it in front'},
  {k:'punt_safe',label:'Safe Pressure Look',profile:'base',front:'safe front',shell:'return alert',hint:'watch the fake'},
  {k:'creeper',label:'Creeper Pressure',profile:'blitz',front:'4-2-5 creep',shell:'drop-out fire zone',hint:'rush 4 from odd angles'},
  {k:'cover2_invert',label:'Cover 2 Invert',profile:'cover',front:'nickel',shell:'safety-drop invert',hint:'disguise the rotation'},
  {k:'match3',label:'Rip/Liz Match 3',profile:'base',front:'4-2-5',shell:'pattern-match Cover 3',hint:'carry the verticals'},
];
const OFF_META=Object.fromEntries(OFF_PLAYS.map(p=>[p.k,p]));
const DEF_META=Object.fromEntries(DEF_PLAYS.map(p=>[p.k,p]));
// ---- PLAY CONCEPT MAP: the fine-grained choreography bucket for each play key (feeds FieldSim so the
// on-field motion matches what the coach actually called, not just the coarse run/pass "profile"). ----
const OFF_CONCEPT={
  // run — delayed/downhill draw look (QB or RB rides the pass fake, then hits the crease)
  draw:'draw',
  // run — QB keeps it himself (keeper/power/sneak/scramble-designed)
  qb_power:'qb_keeper', sneak:'qb_keeper',
  // run — pitch/toss to the sideline: real toss action, carrier bounces WIDE before turning upfield
  toss:'sweep', stretch:'sweep', pinpull:'sweep', jumbo_toss:'sweep', crack_sweep:'sweep', power_read:'sweep',
  // run — jet/end-around: a WR goes in motion and takes the carry around the edge
  jet_sweep:'jet_sweep',
  // run — mesh/option look: QB and RB ride the mesh point, ball goes to one of them
  zone_read:'zone_read',
  // run — downhill between/off the tackles behind a lead blocker
  inside:'inside', power:'inside', counter:'inside', trap:'inside', iso:'inside', outside:'inside',
  jumbo_power:'inside', jumbo_blast:'inside', four_minute:'inside', duo_lead:'inside', split_zone:'inside', gt_counter:'inside', mid_zone:'inside',
  // pass — real crossing/mesh concepts: receivers actually cross the field
  mesh:'crossing', drive:'crossing', sail_cross:'crossing', dagger:'crossing',
  // pass — quick slants / hitches, inside-leverage throws
  slants:'slant', glance:'slant', slant_flat:'slant', rpo_bubble:'slant',
  // pass — vertical shot plays
  deep:'deep', switch:'deep', seam:'deep', mills:'deep', te_seam:'deep', red_fade:'deep',
  // pass — screens (existing 'screen' routeKind already handles these)
  screen:'screen', shallow_screen:'screen', te_screen:'screen', hands_screen:'screen',
  // pass — play-action shots (existing 'pa' routeKind)
  pa:'pa', boot:'pa', y_cross:'pa', deep_over:'pa', flood:'pa', smash:'pa', wheel:'pa', post_wheel:'pa', jumbo_leak:'pa',
  // pass — quick game short (existing 'short' routeKind fallback)
  short:'short', hands_choice:'short', hands_stick:'short', levels:'short', hoss:'short', spacing:'short', stick_nod:'short', slot_choice:'short',
};
function offConcept(offKey){ const m=OFF_META[offKey]; return OFF_CONCEPT[offKey] || (m&&m.profile) || offKey || 'inside'; }
function playKeys(list, pred){ return list.filter(pred).map(p=>p.k); }
function pickKey(keys){ return keys[Math.floor(ENG.rng()*keys.length)] || (keys[0]||'base'); }
const OFF_RUN_KEYS=playKeys(OFF_PLAYS,p=>p.type==='run');
const OFF_RUN_SET=new Set(OFF_RUN_KEYS);
// enforce a team's intended run/pass identity (passBias) on its base weights — rescales the run:pass
// ratio to the target while preserving each play's relative weight inside its bucket. Without this the
// pass-leaning profile bonuses dominate and the whole league throws ~75% (real NFL is ~57%).
function pbApplyPassBias(w, bias){
  if(bias==null) return; let runSum=0,passSum=0;
  for(const k in w){ if(OFF_RUN_SET.has(k)) runSum+=w[k]; else passSum+=w[k]; }
  if(runSum<=0||passSum<=0) return;
  bias=Math.max(0.33, bias-0.065);   // situational pass-adds (3rd-and-long, 2-min) add ~7pts on top; pre-bake that in so the league lands ~57%
  const total=runSum+passSum, pf=(total*bias)/passSum, rf=(total*(1-bias))/runSum;
  for(const k in w){ w[k]*= OFF_RUN_SET.has(k)?rf:pf; }
}
const OFF_QUICK_KEYS=playKeys(OFF_PLAYS,p=>p.family==='quick');
const OFF_SHOT_KEYS=playKeys(OFF_PLAYS,p=>p.family==='shot');
const OFF_SCREEN_KEYS=playKeys(OFF_PLAYS,p=>p.profile==='screen');
const OFF_INSIDE_KEYS=playKeys(OFF_PLAYS,p=>p.profile==='inside');
const OFF_OUTSIDE_KEYS=playKeys(OFF_PLAYS,p=>p.profile==='outside');
const OFF_JUMBO_KEYS=playKeys(OFF_PLAYS,p=>p.pkg==='jumbo');
const OFF_HANDS_KEYS=playKeys(OFF_PLAYS,p=>p.pkg==='hands');
const DEF_BASE_KEYS=playKeys(DEF_PLAYS,p=>p.profile==='base');
const DEF_RUN_KEYS=playKeys(DEF_PLAYS,p=>p.profile==='run_stop');
const DEF_BLITZ_KEYS=playKeys(DEF_PLAYS,p=>p.profile==='blitz');
const DEF_PRESS_KEYS=playKeys(DEF_PLAYS,p=>p.profile==='press');
const DEF_COVER_KEYS=playKeys(DEF_PLAYS,p=>p.profile==='cover');
const DEF_SPY_KEYS=playKeys(DEF_PLAYS,p=>p.profile==='spy');
/* ---- team / coach / player-specific playbooks ---- */
const PLAYBOOK_VERSION=4;   // bumped: normalized scheme picker → existing saves re-derive schemes
const OFF_SCHEMES={
  wide_zone:{label:'Wide Zone Play-Action',summary:'outside zone, bootlegs, crossers, and hidden tight ends',passBias:.53,
    core:['outside','stretch','boot','pa','deep_over','y_cross','toss','pinpull','inside','wheel'], aux:['counter','te_screen','jumbo_leak','hands_choice','crack_sweep','smash']},
  west_coast:{label:'West Coast Rhythm',summary:'quick-game spacing, YAC throws, screens, and tempo answers',passBias:.60,
    core:['short','slants','mesh','levels','drive','spacing','screen','rpo_bubble','outside','pa'], aux:['hands_stick','hoss','shallow_screen','boot','slant_flat','glance']},
  spread_rpo:{label:'Spread RPO / QB Run',summary:'RPO conflict, option keepers, empty answers, and QB movement',passBias:.61,
    core:['rpo_bubble','zone_read','qb_power','hoss','spacing','mesh','slants','jet_sweep','screen','deep'], aux:['switch','draw','hands_choice','boot','glance','crack_sweep']},
  power_run:{label:'Power Run / Heavy PA',summary:'gap runs, fullback looks, jumbo packages, and shot play-action',passBias:.46,
    core:['power','counter','trap','iso','inside','pa','deep_over','wheel','jumbo_power','jumbo_blast','jumbo_toss'], aux:['sneak','jumbo_leak','four_minute','red_fade','duo_lead','smash']},
  vertical:{label:'Vertical Strike',summary:'deep shots, switch releases, posts, and isolation routes',passBias:.66,
    core:['deep','switch','mills','dagger','wheel','red_fade','slants','short','draw','screen'], aux:['hoss','levels','hands_choice','pa','seam','smash']},
  spread_air:{label:'Spread Air Raid',summary:'empty spacing, option routes, mesh, and high-volume passing',passBias:.69,
    core:['hoss','spacing','mesh','levels','drive','switch','deep','shallow_screen','rpo_bubble','hands_stick'], aux:['screen','slants','draw','red_fade','seam','slant_flat']},
  te_heavy:{label:'12 Personnel Matchup',summary:'tight ends, condensed formations, seams, and leak screens',passBias:.56,
    core:['inside','pa','te_screen','jumbo_leak','hoss','boot','deep_over','counter','trap','hands_choice'], aux:['red_fade','jumbo_power','levels','mesh','smash','duo_lead']},
  ball_control:{label:'Ball-Control Pro Style',summary:'efficient runs, safe throws, four-minute offense, and field position',passBias:.51,
    core:['inside','outside','short','drive','screen','hands_stick','four_minute','power','pa','levels'], aux:['jumbo_power','hands_screen','spacing','sneak','slant_flat','duo_lead']}
};
const DEF_SCHEMES={
  match_quarters:{label:'Match Quarters',summary:'pattern-match zone, disguise, and explosive prevention',
    core:['quarters','cover6','cover','banjo','red_zone_match','sim_pressure','base','cloud'], aux:['bracket','tampa2','contain','match3','cover2_invert']},
  pressure:{label:'Pressure Front',summary:'simulated pressure, mug looks, blitz paths, and hot throws',
    core:['sim_pressure','double_a','slot_fire','green_dog','wide9','cover1','press','base'], aux:['blitz','contain','two_man','creeper']},
  man_press:{label:'Press Man',summary:'jam timing, challenge WRs, and live with help rules',
    core:['press','cover1','two_man','press2','bracket','wide9','base','red_zone_match'], aux:['green_dog','spy2','cloud','creeper']},
  run_fit:{label:'Run-Fit Front',summary:'heavy boxes, slants, edge setting, and early-down control',
    core:['run_stop','tite','goal_bear','pinch','under','over','base','contain'], aux:['press2','green_dog','red_zone_match','match3']},
  two_high:{label:'Two-High Shell',summary:'Tampa, quarters, cloud corners, and patient coverage',
    core:['tampa2','cover','quarters','cover6','cloud','prevent','bracket','base'], aux:['spy2','banjo','sim_pressure','cover2_invert']},
  hybrid_spy:{label:'Hybrid Spy',summary:'contain rush lanes, robber help, and QB-control rules',
    core:['spy','spy2','contain','banjo','base','cover6','sim_pressure','red_zone_match'], aux:['run_stop','press','cloud','match3']}
};
const TEAM_OFF_SCHEME={
  ARI:'spread_rpo',ATL:'te_heavy',BAL:'spread_rpo',BUF:'spread_rpo',CAR:'west_coast',CHI:'spread_rpo',CIN:'spread_air',CLE:'power_run',
  DAL:'west_coast',DEN:'wide_zone',DET:'power_run',GB:'wide_zone',HOU:'vertical',IND:'spread_rpo',JAX:'west_coast',KC:'spread_air',
  LV:'power_run',LAC:'vertical',LAR:'wide_zone',MIA:'wide_zone',MIN:'vertical',NE:'ball_control',NO:'west_coast',NYG:'vertical',
  NYJ:'wide_zone',PHI:'power_run',PIT:'ball_control',SEA:'vertical',SF:'wide_zone',TB:'spread_air',TEN:'power_run',WAS:'spread_rpo'
};
const TEAM_DEF_SCHEME={
  ARI:'hybrid_spy',ATL:'match_quarters',BAL:'pressure',BUF:'two_high',CAR:'run_fit',CHI:'match_quarters',CIN:'man_press',CLE:'pressure',
  DAL:'pressure',DEN:'man_press',DET:'run_fit',GB:'match_quarters',HOU:'pressure',IND:'two_high',JAX:'run_fit',KC:'match_quarters',
  LV:'man_press',LAC:'two_high',LAR:'pressure',MIA:'man_press',MIN:'pressure',NE:'hybrid_spy',NO:'run_fit',NYG:'pressure',
  NYJ:'man_press',PHI:'pressure',PIT:'pressure',SEA:'hybrid_spy',SF:'match_quarters',TB:'run_fit',TEN:'run_fit',WAS:'hybrid_spy'
};
// ===== "JUST COACH" auto-management — the CPU runs the busywork through the SAME committed APIs an AI team uses =====
function ensureAuto(t){ if(!t) return null; if(!t.auto){ t.auto={master:false,scout:true,depth:true,finance:true,resign:true,fa:false,draft:true,staff:true,trades:false,protect:[],lastReport:null,log:[]};
  const qb=t.roster.filter(p=>p.pos==='QB').sort((a,b)=>b.ovr-a.ovr)[0]; if(qb&&qb.ovr>=84) t.auto.protect.push(qb.id); }
  if(!t.auto.protect) t.auto.protect=[]; return t.auto; }
function autoScout(t){ ensureScouting(t); let pts=t.scouting.pointsLeft||0; if(pts<=0) return [];
  const nd=ENG.needs(t)||{}; const start=pts;
  const board=(G.prospects||[]).filter(p=>(p.scouted||0)<5).map(p=>({p,s:scoutBoardScore(p,t)+((nd[p.pos]||0)*0.04)-((p.projRound||4)>=5?1.2:0)})).sort((a,b)=>b.s-a.s);
  // pass 1: lock the top board × need prospects up toward a cross-check
  for(const {p} of board){ if((t.scouting.pointsLeft||0)<=0) break; let g=0; while((t.scouting.pointsLeft||0)>0 && (p.scouted||0)<4 && g++<5){ const r=applyScoutLook(t,p); if(!r||!r.ok) break; } }
  // pass 2: breadth — one look on anyone still fully public
  for(const {p} of board){ if((t.scouting.pointsLeft||0)<=0) break; if((p.scouted||0)>=1) continue; const r=applyScoutLook(t,p); if(!r||!r.ok) break; }
  const spent=start-(t.scouting.pointsLeft||0); if(!spent) return [];
  const locks=(G.prospects||[]).filter(p=>(p.scouted||0)>=4).length;
  return [`🔎 Scouting: spent ${spent} point${spent>1?'s':''} on the board — ${locks} prospect${locks!==1?'s':''} near-locked.`]; }
function autoDepth(t){ const acts=[], byPos={}; t.roster.forEach(p=>{ (byPos[p.pos]=byPos[p.pos]||[]).push(p); });
  const cushion=(t.wins-t.losses)>=2;
  const fit=(p,pos)=>{ let f=(p.ovr||50); const a=p.attrs||{}; if(['WR','CB','RB','S','OLB'].includes(pos)) f+=((a.SP||60)-70)*0.10; if(['T','G','C','DE','DT','ILB','FB'].includes(pos)) f+=((a.ST||60)-70)*0.08; if(p.out>0||p.ir) f-=1000; return f; };
  Object.keys(byPos).forEach(pos=>{ const arr=byPos[pos]; const prevStarter=arr.find(p=>p.starter);
    arr.sort((a,b)=>fit(b,pos)-fit(a,pos)); arr.forEach((p,i)=>{ p.depth=i+1; p.starter=(i===0&&!(p.out>0||p.ir)); });
    const ns=arr[0]; if(ns&&prevStarter&&ns!==prevStarter&&(prevStarter.out>0||prevStarter.ir)&&ns.ovr>=72) acts.push(`📋 ${POS_NOUN_S(pos)}: ${ns.name} starts with ${prevStarter.name} out.`); });
  if(cushion){ t.roster.forEach(p=>{ if(p.starter&&p.injury&&p.injury.playable&&p.out<=1&&p._sitWk!==G.week&&(p.durability||50)<55){ p._sitWk=G.week; acts.push(`🛋 Rested ${p.name} (${p.pos}) — banged up, ${t.wins}-${t.losses} cushion.`); } }); }
  return acts; }
function autoFinance(t){ const acts=[]; if(!(G.rules&&G.rules.salaryCap)) return acts;
  if(capSpace(t)<0){ try{ capDiscipline(t); }catch(e){} if(capSpace(t)>=0) acts.push(`💰 Restructured to get cap-legal (room now $${capSpace(t)}M).`); else acts.push(`⚠ Over the cap by $${(-capSpace(t)).toFixed(1)}M — needs a roster move.`); }
  return acts; }
function autoResign(t){ const acts=[], buf=4;
  const exp=t.roster.filter(p=>(p.years||9)<=1 && !p.tagged).sort((a,b)=>b.ovr-a.ovr);
  for(const p of exp){ const top2=t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr).slice(0,2).indexOf(p)>=0;
    const keep=(p.ovr>=78)||(top2&&p.ovr>=72)||(p.age<=26&&(p.pot||p.ovr)>=75); if(!keep) continue;
    let aav=p.salary||1; try{ const a=faAsk(p); aav=ENG.round1(Math.max(p.salary||1,(a&&a.aav)||p.salary*1.15)); }catch(e){ aav=ENG.round1((p.salary||1)*1.18); }
    if(G.rules.salaryCap && capSpace(t)-(aav-(p.salary||0))<buf) continue;
    p.salary=aav; p.years=4; p.flags=p.flags||{}; p.flags.wantsOut=false; p.tagged=false;
    acts.push(`\u270d Re-signed ${p.name} (${p.pos}) \u2014 4 yrs / $${aav}M.`); if(acts.length>=2) break; }
  return acts; }
function autoFAUser(t){ const acts=[]; if(G._autoFAwk===G.week) return acts; try{ buildFAPool(); }catch(e){}
  if(!G.faPool||!G.faPool.length) return acts; const nd=ENG.needs(t);
  const needPos=Object.keys(nd).filter(k=>nd[k]>25).sort((a,b)=>nd[b]-nd[a]).slice(0,2); if(!needPos.length) return acts;
  const cand=G.faPool.filter(p=>needPos.includes(p.pos)).sort((a,b)=>b.ovr-a.ovr)[0]; if(!cand) return acts;
  if(G.rules.salaryCap && capSpace(t)-(cand.askAAV||1)<4) return acts;
  let ok=false; try{ ok=doSignFA(cand,cand.askAAV,cand.askYears); }catch(e){}
  if(ok){ G._autoFAwk=G.week; acts.push(`\ud83d\uded2 Signed FA ${cand.name} (${cand.pos}, ${cand.ovr} OVR) \u2014 filled a need.`); }
  return acts; }
function autoStaff(t){ const acts=[]; if(t._autoStaffYr===G.season) return acts; try{ ENG.ensureStaff(t); }catch(e){}
  if((t.cash||0)<12 || !t.staff) return acts;
  for(const [k,lbl] of [['scout','Director of Scouting'],['med','Head Trainer'],['oc','Offensive Coordinator'],['dc','Defensive Coordinator']]){
    const sl=t.staff[k]; if(sl && (sl.ovr||68)<68){ sl.ovr=ENG.clamp((sl.ovr||66)+ENG.ri(6,12),68,90); sl.name=ENG.coachName(); t.cash=ENG.round1((t.cash||0)-ENG.ri(4,8)); t._autoStaffYr=G.season; acts.push(`\ud83e\uddd1\u200d\ud83c\udfeb Upgraded ${lbl} to ${sl.ovr} OVR.`); break; } }
  return acts; }
function autoTrades(t){ const acts=[]; if(G.tradeDeadlinePassed) return acts;
  const dl=(typeof tradeDeadlineWeek==='function')?tradeDeadlineWeek():12; if((G.week||0)<dl-1) return acts;
  const a=ensureAuto(t), qb1=(t.roster.filter(x=>x.pos==='QB').sort((m,n)=>n.ovr-m.ovr)[0]||{}).id, byPos={};
  t.roster.forEach(p=>{ (byPos[p.pos]=byPos[p.pos]||[]).push(p); });
  for(const pos of Object.keys(byPos)){ const arr=byPos[pos].slice().sort((x,y)=>x.ovr-y.ovr);
    if(arr.length-1 < (MINPOS[pos]||1)+2) continue;   // need a real surplus (3+ above the floor)
    const cand=arr.find(p=>!a.protect.includes(p.id) && !(p.flags&&p.flags.onBlock) && p.ovr<78 && p.id!==qb1);
    if(cand){ cand.flags=cand.flags||{}; cand.flags.onBlock=true; acts.push(`\ud83d\udd01 Put ${cand.name} (${cand.pos}, depth surplus) on the block before the deadline.`); break; } }
  return acts; }
function POS_NOUN_S(pos){ const n=posNoun(pos); return n.charAt(0).toUpperCase()+n.slice(1); }
function runAutoManagement(t){ const a=ensureAuto(t); if(!a||!a.master) return; const r={wk:G.week,season:G.season,lines:[]};
  // scouting is now fully automated for every team via autoScoutWeek() in advanceWeek — no per-user points grind here.
  try{ if(a.depth) r.lines.push(...autoDepth(t)); }catch(e){}
  try{ if(a.resign) r.lines.push(...autoResign(t)); }catch(e){}
  try{ if(a.fa) r.lines.push(...autoFAUser(t)); }catch(e){}
  try{ if(a.staff) r.lines.push(...autoStaff(t)); }catch(e){}
  try{ if(a.trades) r.lines.push(...autoTrades(t)); }catch(e){}
  try{ if(a.finance) r.lines.push(...autoFinance(t)); }catch(e){}
  if(r.lines.length){ a.lastReport=r; a.log=[...r.lines.map(l=>({wk:G.week,l})),...(a.log||[])].slice(0,60);
    if(typeof addNews==='function') addNews('FRONTOFFICE',`🧑\u200d🏫 Front office handled ${r.lines.length} item${r.lines.length>1?'s':''} this week.`); } }
function pbDepth(t, poss, n){ return (t&&t.roster?t.roster:[]).filter(p=>poss.includes(p.pos)&&!(p.out>0)&&!p.ir&&!p.benched&&!(p._sitWk===G.week)).sort((a,b)=>(a.depth||99)-(b.depth||99)||(b.ovr||0)-(a.ovr||0)).slice(0,n); }
function pbAttr(p, keys){ if(!p) return 60; const a=p.attrs||{}; keys=Array.isArray(keys)?keys:[keys]; return keys.reduce((s,k)=>s+(a[k]!=null?a[k]:(p.ovr||60)),0)/keys.length; }
function pbAvg(players, fn){ players=(players||[]).filter(Boolean); return players.length?players.reduce((s,p)=>s+fn(p),0)/players.length:60; }
function pbOffProfile(t){
  const qb=pbDepth(t,['QB'],1)[0], rb=pbDepth(t,['RB','FB'],2), wr=pbDepth(t,['WR'],4), te=pbDepth(t,['TE'],2), ol=pbDepth(t,['T','G','C'],5);
  return {qb,rb:rb[0],wr1:wr[0],te1:te[0],
    qbMob:pbAttr(qb,['SP','AC']), qbArm:pbAttr(qb,['ST','IN']), rbPow:pbAvg(rb,p=>pbAttr(p,['ST','AG'])), rbRec:pbAvg(rb,p=>pbAttr(p,['HA','SP'])),
    wrSpeed:pbAvg(wr.slice(0,3),p=>pbAttr(p,['SP','AC'])), wrHands:pbAvg(wr.slice(0,3),p=>pbAttr(p,['HA','IN'])), teMatch:pbAvg(te,p=>(p.ovr||60)*.65+pbAttr(p,['HA','ST'])*.35),
    ol:pbAvg(ol,p=>(p.ovr||60)*.75+pbAttr(p,['ST','AG'])*.25), topSkill:Math.max((rb[0]&&rb[0].ovr)||60,(wr[0]&&wr[0].ovr)||60,(te[0]&&te[0].ovr)||60)};
}
function pbDefProfile(t){
  const dl=pbDepth(t,['DE','DT'],5), lb=pbDepth(t,['OLB','ILB','LB','MLB'],5), db=pbDepth(t,['CB','S','FS','SS'],6);
  return {rush:pbAvg(dl.slice(0,4),p=>(p.ovr||60)*.7+pbAttr(p,['ST','AG'])*.3), lb:pbAvg(lb.slice(0,3),p=>(p.ovr||60)*.7+pbAttr(p,['IN','SP'])*.3),
    db:pbAvg(db.slice(0,5),p=>(p.ovr||60)*.7+pbAttr(p,['SP','HA','IN'])*.3), cb1:db.find(p=>p.pos==='CB')||db[0]};
}
// deterministic per-coach signature → coaches have scheme IDENTITY even on uniform (fictional) rosters
function coachHash(c){ const s=((c&&c.name)||'x')+'|'+((c&&c.ovr)||70); let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function chooseOffScheme(t){
  if(t && TEAM_OFF_SCHEME[t.abbr] && !(G&&G.fantasy)) return TEAM_OFF_SCHEME[t.abbr];
  const p=pbOffProfile(t), c=t.coach||{}, off=c.off||72, risk=c.risk||50;
  // NORMALIZED fit (weighted average, 0..100) — an average roster scores ~equal across schemes, so the roster's actual STRENGTHS pick the scheme, not the raw weight totals
  const raw={
    wide_zone:[[p.ol,.25],[p.rbPow,.18],[p.qbMob,.14],[off,.14],[p.teMatch,.12]],
    west_coast:[[p.wrHands,.25],[p.qbArm,.22],[p.ol,.14],[off,.16],[p.rbRec,.08]],
    spread_rpo:[[p.qbMob,.31],[p.wrSpeed,.18],[p.rbRec,.12],[off,.12]],
    power_run:[[p.ol,.28],[p.rbPow,.24],[p.teMatch,.15],[100-risk,.10]],
    vertical:[[p.qbArm,.25],[p.wrSpeed,.28],[p.topSkill,.10],[risk,.18]],
    spread_air:[[p.qbArm,.22],[p.wrHands,.24],[p.wrSpeed,.16],[off,.16],[risk,.08]],
    te_heavy:[[p.teMatch,.32],[p.ol,.18],[p.rbPow,.14],[off,.10]],
    ball_control:[[p.ol,.21],[p.wrHands,.14],[p.rbPow,.16],[100-risk,.18]]
  };
  const keys=Object.keys(raw), scores={};
  keys.forEach(k=>{ let sM=0,w=0; raw[k].forEach(([v,wt])=>{ sM+=(v||70)*wt; w+=wt; }); scores[k]=sM/w; });
  const mean=keys.reduce((a,k)=>a+scores[k],0)/keys.length; keys.forEach(k=>scores[k]=mean+(scores[k]-mean)*0.5);   // halve roster-fit spread so coach identity (not noise) drives the pick
  // per-coach signature lean: each coach favors one scheme (hash); aggressive coaches tilt to vertical/air, conservative to power/ball-control
  const h=coachHash(c); scores[keys[h%keys.length]] += 7;
  if(risk>=62) scores[h%2?'vertical':'spread_air'] += 2.6; else if(risk<=42) scores[h%2?'power_run':'ball_control'] += 2.6;
  return keys.sort((a,b)=>scores[b]-scores[a])[0]||'west_coast';
}
function chooseDefScheme(t){
  if(t && TEAM_DEF_SCHEME[t.abbr] && !(G&&G.fantasy)) return TEAM_DEF_SCHEME[t.abbr];
  const p=pbDefProfile(t), c=t.coach||{}, def=c.def||72, risk=c.risk||50, adapt=c.adapt||62;
  const raw={
    match_quarters:[[p.db,.24],[p.lb,.18],[def,.18],[adapt,.16]],
    pressure:[[p.rush,.28],[p.lb,.16],[def,.14],[risk,.16]],
    man_press:[[p.db,.30],[p.rush,.16],[def,.15],[risk,.08]],
    run_fit:[[p.rush,.20],[p.lb,.26],[def,.14],[100-risk,.08]],
    two_high:[[p.db,.28],[p.lb,.14],[def,.16],[100-risk,.10]],
    hybrid_spy:[[p.lb,.24],[p.db,.20],[p.rush,.12],[adapt,.16]]
  };
  const keys=Object.keys(raw), scores={};
  keys.forEach(k=>{ let sM=0,w=0; raw[k].forEach(([v,wt])=>{ sM+=(v||70)*wt; w+=wt; }); scores[k]=sM/w; });
  const mean=keys.reduce((a,k)=>a+scores[k],0)/keys.length; keys.forEach(k=>scores[k]=mean+(scores[k]-mean)*0.5);
  const h=coachHash(c)>>>3; scores[keys[h%keys.length]] += 7;
  if(risk>=62) scores[h%2?'pressure':'man_press'] += 2.6; else if(risk<=42) scores[h%2?'run_fit':'two_high'] += 2.6;
  return keys.sort((a,b)=>scores[b]-scores[a])[0]||'match_quarters';
}
function coachGrade(t){ ENG.ensureStaff(t); const c=t.coach||{}, s=t.staff||{}; return Math.round((c.ovr||70)*.46+(c.off||70)*.18+(c.def||70)*.18+(((s.oc&&s.oc.ovr)||68)+((s.dc&&s.dc.ovr)||68))*.09); }
function coachTier(t){ const g=coachGrade(t); return g>=88?'elite':g>=80?'top':g>=72?'solid':'developing'; }
function pbAddWeights(weights, keys, w){ (keys||[]).forEach(k=>{ if(OFF_META[k]||DEF_META[k]) weights[k]=(weights[k]||0)+w; }); }
function buildOffPlaybook(t, scheme){
  const arch=OFF_SCHEMES[scheme]||OFF_SCHEMES.west_coast, p=pbOffProfile(t), c=t.coach||{}, weights={};
  pbAddWeights(weights,arch.core,8); pbAddWeights(weights,arch.aux,4);
  const tags=[];
  if(p.qb&&p.qbMob>=82){ pbAddWeights(weights,['zone_read','qb_power','boot','rpo_bubble'],4.5); tags.push(`QB run: ${p.qb.last||p.qb.name}`); }
  if(p.qb&&p.qbArm>=84){ pbAddWeights(weights,['deep','switch','mills','dagger','deep_over'],3.6); tags.push(`arm talent: ${p.qb.last||p.qb.name}`); }
  if(p.rb&&p.rbPow>=82){ pbAddWeights(weights,['inside','power','counter','iso','four_minute','jumbo_power'],3.8); tags.push(`workhorse: ${p.rb.last||p.rb.name}`); }
  if(p.rb&&p.rbRec>=80) pbAddWeights(weights,['screen','wheel','hands_screen'],3.2);
  if(p.wr1&&p.wrSpeed>=83){ pbAddWeights(weights,['deep','switch','mills','jet_sweep','red_fade'],3.4); tags.push(`WR stress: ${p.wr1.last||p.wr1.name}`); }
  if(p.wrHands>=82) pbAddWeights(weights,['slants','mesh','levels','drive','hands_choice','hands_stick'],3.2);
  if(p.te1&&p.teMatch>=80){ pbAddWeights(weights,['te_screen','jumbo_leak','hoss','pa','boot'],3.5); tags.push(`TE matchup: ${p.te1.last||p.te1.name}`); }
  if(p.ol>=80) pbAddWeights(weights,['outside','stretch','power','trap','jumbo_blast'],2.8);
  if(p.ol<72) pbAddWeights(weights,['short','screen','spacing','hands_stick'],4.2);
  const depth=(c.ovr||70)>=88?20:(c.ovr||70)>=80?17:(c.ovr||70)>=72?15:12;
  const keys=Object.keys(weights).sort((a,b)=>weights[b]-weights[a]).slice(0,depth);
  const passBias=ENG.clamp(arch.passBias + ((c.off||70)-72)*.003 + (p.qbArm-76)*.002 + (p.wrSpeed-76)*.0015 - (p.ol>=81&&p.rbPow>=82?.035:0), .39, .72);
  return {scheme,label:arch.label,summary:arch.summary,passBias,keys,weights,tags:tags.slice(0,3)};
}
function buildDefPlaybook(t, scheme){
  const arch=DEF_SCHEMES[scheme]||DEF_SCHEMES.match_quarters, p=pbDefProfile(t), c=t.coach||{}, weights={};
  pbAddWeights(weights,arch.core,8); pbAddWeights(weights,arch.aux,4);
  if(p.rush>=82) pbAddWeights(weights,['wide9','sim_pressure','green_dog','double_a','contain'],3.6);
  if(p.db>=82) pbAddWeights(weights,['quarters','cover6','bracket','two_man','press'],3.8);
  if(p.lb>=80) pbAddWeights(weights,['spy','spy2','tite','run_stop','red_zone_match'],3.4);
  if(p.rush<72) pbAddWeights(weights,['cloud','cover','tampa2','prevent'],3.0);
  const depth=(c.ovr||70)>=88?17:(c.ovr||70)>=80?15:(c.ovr||70)>=72?13:11;
  const keys=Object.keys(weights).sort((a,b)=>weights[b]-weights[a]).slice(0,depth);
  return {scheme,label:arch.label,summary:arch.summary,keys,weights,tags:[`rush ${Math.round(p.rush)}`,`coverage ${Math.round(p.db)}`,`LB ${Math.round(p.lb)}`]};
}
function ensureTeamPlaybook(t, force){
  if(!t) return null; ENG.ensureStaff(t); t.coach=t.coach||{name:ENG.coachName(),ovr:70,off:70,def:70};
  const c=t.coach;
  if(c.adapt==null) c.adapt=ENG.clamp((c.ovr||70)+ENG.ri(-8,10),45,98);
  if(c.risk==null) c.risk=ENG.clamp((c.off||70)+ENG.ri(-18,18),30,90);
  if(!force && t.playbook && t.playbook.v===PLAYBOOK_VERSION && c.offScheme && c.defScheme) return t.playbook;
  if(force || !c.offScheme || !t.playbook || t.playbook.v!==PLAYBOOK_VERSION) c.offScheme=chooseOffScheme(t);
  if(force || !c.defScheme || !t.playbook || t.playbook.v!==PLAYBOOK_VERSION) c.defScheme=chooseDefScheme(t);
  t.playbook={v:PLAYBOOK_VERSION,off:buildOffPlaybook(t,c.offScheme),def:buildDefPlaybook(t,c.defScheme)};
  return t.playbook;
}
function pbRowsFromWeights(meta, weights){ return Object.keys(weights).filter(k=>meta[k]).map(k=>({k,w:Math.max(.05,weights[k])})); }
function pickWeightedPlay(rows){ rows=(rows||[]).filter(x=>x&&x.w>0); const sum=rows.reduce((s,x)=>s+x.w,0)||1; let r=ENG.rng()*sum; for(const x of rows){ r-=x.w; if(r<=0) return x.k; } return rows[0]&&rows[0].k; }
function offRowsFor(t, ctx){
  const pb=ensureTeamPlaybook(t), w=Object.assign({},(pb&&pb.off&&pb.off.weights)||{}), c=t&&t.coach||{};
  ctx=ctx||{}; const add=(keys,val)=>pbAddWeights(w,keys,val);
  pbApplyPassBias(w, pb&&pb.off&&pb.off.passBias);   // lock in the scheme's run/pass identity BEFORE situational tweaks
  const gp = (typeof CG!=='undefined' && CG && CG.gameplan) || {};
  if (gp.runPass > 0.65) add(['inside','outside','power','counter','zone_read','jumbo_power','draw'], 6);
  if (gp.runPass < 0.35) add(['deep','switch','mills','pa','boot','screen'], 6);
  if (gp.featureRB) add(['outside','zone_read','screen','wheel','draw'], 5);
  if (gp.attackWR1) add(['deep','switch','mills','pa','slants'], 5);
  if (gp.protectPass) add(['short','slants','mesh','hands_choice','screen'], 4);
  if(ctx.toGo<=2) add(['jumbo_power','jumbo_blast','sneak','inside','power'],8);
  if(ctx.ballOn>=94) add(['jumbo_blast','jumbo_leak','red_fade','sneak'],9);
  if(ctx.lateLead) add(['hands_choice','hands_stick','four_minute','hands_screen'],9);
  if(ctx.down>=3 && ctx.toGo>=7){ add(['levels','mesh','drive','screen'],6+(c.adapt||60)/40); add(['deep','switch'],2.4); }   // favor move-the-sticks concepts over low-pct bombs
  if(ctx.down>=3 && ctx.toGo<=4) add(['short','slants','mesh','hands_choice','qb_power','inside'],5);
  if(ctx.down>=3 && ctx.toGo>=5 && ctx.toGo<=8) add(['short','slants','spacing','mesh','drive','levels'],8);   // 3rd-and-medium: intermediate routes that move the sticks (was falling through to base weights)
  if(ctx.ballOn>=80) add(['red_fade','pa','inside','power','hoss','jumbo_leak'],4);
  if(ctx.trailing && ctx.q>=4) add(['deep','switch','mills','dagger','levels'],7);
  return pbRowsFromWeights(OFF_META,w).sort((a,b)=>b.w-a.w);
}
function defRowsFor(t, ctx){
  const pb=ensureTeamPlaybook(t), w=Object.assign({},(pb&&pb.def&&pb.def.weights)||{}), c=t&&t.coach||{};
  ctx=ctx||{}; const add=(keys,val)=>pbAddWeights(w,keys,val);
  const gp = (typeof CG!=='undefined' && CG && CG.gameplan) || {};
  if (gp.protectPass || gp.runPass < 0.4) add(['cover','quarters','tampa2','prevent','cloud'], 5);
  if (gp.spyQB) add(['spy','spy2','contain','green_dog'], 6);
  if (gp.attackWR1) add(['bracket','press','cover1','double_a'], 4);
  if(ctx.toGo<=2) add(['run_stop','goal_bear','tite','pinch','green_dog'],8);
  if(ctx.ballOn>=90) add(['red_zone_match','goal_bear','press2','bracket'],8);
  if(ctx.down>=3 && ctx.toGo>=7) add(['quarters','cover6','tampa2','sim_pressure','double_a','prevent'],6+(c.adapt||60)/38);
  if(ctx.down>=3 && ctx.toGo<=4) add(['press','cover1','sim_pressure','run_stop','spy'],5);
  if(ctx.trailing && ctx.q>=4) add(['double_a','slot_fire','green_dog','wide9'],6);
  return pbRowsFromWeights(DEF_META,w).sort((a,b)=>b.w-a.w);
}
function teamCallOff(t, ctx){ return pickWeightedPlay(offRowsFor(t,ctx)) || pickKey(OFF_QUICK_KEYS); }
function teamCallDef(t, ctx){ return pickWeightedPlay(defRowsFor(t,ctx)) || pickKey(DEF_BASE_KEYS); }
function teamPlaySheet(t, side, ctx){
  const rows=(side==='def'?defRowsFor(t,ctx):offRowsFor(t,ctx));
  const limit=side==='def'?12:14;
  return rows.slice(0,limit).map(r=>(side==='def'?DEF_META:OFF_META)[r.k]).filter(Boolean);
}
function cgPlayCtx(possSide){
  if(!CG) return {};
  const side=possSide||CG.poss, margin=side==='h'?CG.hs-CG.as:CG.as-CG.hs;
  return {down:CG.down,toGo:Math.max(1,CG.toGo),ballOn:CG.ballOn,q:CG.q,clock:CG.clock,
    lateLead:CG.q>=4&&margin>0, trailing:margin<0, redZone:CG.ballOn>=80, tempo:CG.tempo};
}
/* ---- weather: deterministic per game, affects the coached game (not the back-test calibration) ---- */
const WX={ dome:{label:'Dome',icon:'🏟️',comp:0,fum:0,fg:0,deep:0,run:0},
  clear:{label:'Clear',icon:'☀️',comp:0,fum:0,fg:0,deep:0,run:0},
  heat:{label:'Heat',icon:'🔥',comp:-0.025,fum:0.004,fg:0,deep:-0.02,run:-0.10,fatigue:1.0},
  wind:{label:'Windy',icon:'💨',comp:-0.03,fum:0.002,fg:-0.10,deep:-0.06,run:0},
  rain:{label:'Rain',icon:'🌧️',comp:-0.05,fum:0.010,fg:-0.05,deep:-0.05,run:0.3},
  snow:{label:'Snow',icon:'❄️',comp:-0.09,fum:0.018,fg:-0.12,deep:-0.10,run:0.5},
  cold:{label:'Cold',icon:'🥶',comp:-0.02,fum:0.004,fg:-0.04,deep:-0.03,run:0} };
// THE FUTURIST LEAGUE blueprint — real branded stadium names + roof type per franchise (drives weather + art).
// roof: 'dome' = permanent (climate-controlled, no weather) · 'retract' = mostly closed · 'open' = full weather.
const STADIUM_META={
  ARI:{name:'State Farm Solar Terraces',roof:'retract'}, ATL:{name:'Delta Flight Vault',roof:'dome'},
  BAL:{name:'Under Armour Citadel',roof:'open'}, BUF:{name:'Highmark Tundra Fortress',roof:'open'},
  CAR:{name:'Bank of America Monolith',roof:'open'}, CHI:{name:'The Monolith Dome',roof:'dome'},
  CIN:{name:'Procter & Gamble Stripe Vault',roof:'open'}, CLE:{name:'Progressive Industrial Grid',roof:'open'},
  DAL:{name:'AT&T Megastructure',roof:'retract'}, DEN:{name:'Coors Light Mountain Fortress',roof:'open'},
  DET:{name:'Ford Heavy Metal Dome',roof:'dome'}, GB:{name:'Titletown Concrete Pack-House',roof:'open'},
  HOU:{name:'NRG Energy Monolith',roof:'retract'}, IND:{name:'Lucas Oil Foundry',roof:'retract'},
  JAX:{name:'TIAA Bank Oasis Vault',roof:'open'}, KC:{name:'GEHA Arrowhead Bastion',roof:'open'},
  LV:{name:'Allegiant Black Box',roof:'dome'}, LAC:{name:'SoFi Coastal Wave',roof:'open'},
  LAR:{name:'Hollywood Concrete Coliseum',roof:'open'}, MIA:{name:'Hard Rock Apex',roof:'open'},
  MIN:{name:'U.S. Bank Glacial Ridge',roof:'dome'}, NE:{name:'Gillette Coastal Foundry',roof:'open'},
  NO:{name:'Caesars Concrete Bayou',roof:'dome'}, NYG:{name:'MetLife Concrete Gridiron',roof:'open'},
  NYJ:{name:'MetLife Aero-Bunker',roof:'open'}, PHI:{name:'Lincoln Financial Talon',roof:'open'},
  PIT:{name:'U.S. Steel Industrial Monolith',roof:'open'}, SF:{name:"Levi's Silicon Bastion",roof:'open'},
  SEA:{name:'Obsidian Bowl',roof:'open'}, WAS:{name:'FedEx Fieldwork Bastion',roof:'open'},
  TEN:{name:'Nissan Steel Stadium',roof:'open'}, TB:{name:'Raymond James Concrete Bay',roof:'open'} };
function stadiumRoof(ab){ const tm=(G&&G.teams&&team)?team(ab):null; return (tm&&tm.stadium&&tm.stadium.roof) || (STADIUM_META[ab]&&STADIUM_META[ab].roof)||'open'; }
// venue art: use saved stadium art (fields/<ABBR>.jpg interior, then stadiums/<ABBR>.jpg/png exterior) if present;
// otherwise fall back to the procedural stadium SVG. Plug-and-play — drop files in and they appear.
window.venueImgErr=function(im){ let fb=[]; try{ fb=JSON.parse(im.dataset.fb||'[]'); }catch(e){} if(fb.length){ im.dataset.fb=JSON.stringify(fb.slice(1)); im.src=fb[0]; }
  else { if(im.parentElement) im.parentElement.classList.remove('has-photo'); im.remove(); } };
// cached TOP-DOWN field photo (fields/top/<ABBR>.png) used as the live canvas playing surface (falls back to procedural turf if absent)
const ASSET_MANIFEST={
  // Populated from on-disk assets (graphics/output + fps2026/stadiums + fields). Only request what exists to kill 404 spam.
  fields:new Set([]), // fields/<ABBR>.jpg|png interiors (sparse)
  fieldTop:new Set([]), // fields/top/<ABBR>.png top-down photos for canvas (mostly fallbacks; add when you drop files)
  stadiumsJpg:new Set([]),
  stadiumsPng:new Set(['ARI','ATL','BAL','BUF','CAR','CHI','CIN','DAL','DEN','DET','GB','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'])
};
const BAD_STADIUM_ASSETS=new Set([]);
const NATURAL_GRASS_TEAMS=new Set(['ARI','BAL','CHI','DEN','GB','JAX','KC','LV','MIA','PHI','PIT','SF','TB','WAS']);
const _topImg={};
function fieldTopImg(ab){ ab=(ab||'').toUpperCase(); if(Object.prototype.hasOwnProperty.call(_topImg,ab)) return _topImg[ab];
  if(!ASSET_MANIFEST.fieldTop.has(ab)){ _topImg[ab]=null; return null; }
  const im=new Image(); im.src='fields/top/'+ab+'.png'; _topImg[ab]=im; return im; }
function venueArt(t, wx, h, opts){ h=h||150; opts=opts||{}; const ab=(t.abbr||'').toUpperCase();
  let svg=''; try{ svg=opts.stage?stadiumStageSVG(t,wx,h,opts):stadiumSVG(t,wx,h,opts); }catch(e){}
  const imgs=[];
  if(!opts.noPhoto){
    if(ASSET_MANIFEST.fields.has(ab)) imgs.push(`fields/${ab}.jpg`,`fields/${ab}.png`);
    if(ASSET_MANIFEST.stadiumsJpg.has(ab)) imgs.push(`stadiums/${ab}.jpg`);
    if(ASSET_MANIFEST.stadiumsPng.has(ab)) imgs.push(`stadiums/${ab}.png`);
  }
  const fit=opts.fit||'cover', pos=opts.stage?'center 62%':'center center';
  const bg=imgs.length?`background-image:linear-gradient(180deg,rgba(3,7,12,.03),rgba(3,7,12,.26)),url('${imgs[0]}');background-size:${fit};background-position:${pos};background-repeat:no-repeat;`:'';
  const img=imgs.length?`<img class="venue-photo-img" src="${imgs[0]}" alt="" data-fb='${JSON.stringify(imgs.slice(1))}' onerror="venueImgErr(this)" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:${pos};background:#07101d">`:'';
  return `<div class="venue-art${imgs.length?' has-photo':''}" style="position:relative;height:${h}px;overflow:hidden;line-height:0;${bg}">${svg}${img}</div>`;
}
function applyStadiumNames(){ (G.teams||[]).forEach(t=>{ const meta=STADIUM_META[t.abbr]; if(t.stadium&&t.stadium._custom) return; if(meta&&t.stadium&&!t.stadium._named){ t.stadium.name=meta.name; t.stadium.roof=meta.roof; t.stadium._named=true; } }); }
const DOME_TEAMS=new Set(Object.keys(STADIUM_META).filter(a=>STADIUM_META[a].roof==='dome'));
const COLD_TEAMS=new Set(['BUF','GB','CHI','NE','DEN','PIT','KC','CIN','NYJ','NYG','PHI','BAL','WAS','SEA','CLE']);
const HEAT_TEAMS=new Set(['MIA','TB','JAX','CAR','TEN','ARI','LAC','LAR','DAL','WAS']);
function stadiumSurface(ab){ const tm=(G&&G.teams&&team)?team(ab):null; if(tm&&tm.stadium&&tm.stadium.surface) return tm.stadium.surface; return NATURAL_GRASS_TEAMS.has((ab||'').toUpperCase())?'grass':'turf'; }
function gameWeather(homeAbbr, week){
  const ab=(homeAbbr||'').toUpperCase(), tm=(G&&G.teams&&team)?team(ab):null, climate=tm&&tm.location&&tm.location.climate;
  const roof=stadiumRoof(ab);
  if(roof==='dome') return 'dome';                                   // permanent dome — always controlled
  const r=((week+1)*13 + ((ab.charCodeAt(0)||66)+(ab.charCodeAt(ab.length-1)||70))*7)%100;
  if(week<=6 && (climate==='heat'||HEAT_TEAMS.has(ab)) && r<42) return 'heat';      // September/early October southern heat matters
  if(roof==='retract') return r<82?'clear':r<90?'wind':'rain';       // retractable — usually closed/clear
  if(climate==='rain') return r<30?'rain':r<48?'wind':r<58?'cold':'clear';
  if(climate==='wind') return r<36?'wind':r<49?'rain':r<64?'cold':'clear';
  if(climate==='mild') return r<10?'rain':r<18?'wind':'clear';
  if(climate==='cold'){
    const late=week>=9; return late?(r<30?'snow':r<56?'cold':r<78?'wind':'clear'):(r<18?'rain':r<36?'wind':'clear');
  }
  const late=week>=11;
  if(late && COLD_TEAMS.has(ab)) return r<28?'snow':r<55?'cold':r<78?'wind':'clear';
  if(late) return r<22?'cold':r<44?'wind':r<62?'rain':'clear';
  return r<14?'rain':r<34?'wind':'clear';
}
/* ---- data-grounded play model (calibrated to nflfastR league aggregates) ---- */
const NFLREF={ ypc:4.3, comp:65, ypa:7.0, ycomp:11.3, sackPct:6.8, intPct:2.3, passRate:57,
  fourthConv:57, thirdConv:39, rzTD:58, ptsPerTeam:22.5, playsPerTeam:63, fgOverall:85 };
function fgPct(d){ return d<=29?0.98:d<=39?0.95:d<=49?0.85:d<=55?0.74:0.56; }   // make % by distance
// per-play-type real profiles: each play, called league-typically, reproduces its NFL distribution
const PROF={
  inside:{run:1,stuff:0.24,fum:0.009},
  outside:{run:1,stuff:0.26,fum:0.013,wide:1},
  short: {pass:1,airLo:0, airHi:8, comp:0.71,yac:4,sackP:0.040,intP:0.023},
  pa:    {pass:1,airLo:7, airHi:15,comp:0.60,yac:2,sackP:0.075,intP:0.040,big:0.12},
  screen:{pass:1,airLo:-3,airHi:4, comp:0.835,yac:6,sackP:0.020,intP:0.024,big:0.09},
  deep:  {pass:1,airLo:18,airHi:38,comp:0.385,yac:1,sackP:0.075,intP:0.076,big:0.28},
};
// how the defensive call tilts the offense's numbers (the fun layer; ~zero-mean across league play so aggregates hold)
const DEFMOD={
  base:{}, run_stop:{run:-2.4,comp:0.05,sack:0.01}, blitz:{run:0.6,sack:0.05,big:0.10,comp:-0.03},
  press:{comp:-0.06,deepComp:-0.04}, cover:{run:1.2,shortComp:0.05,deepComp:-0.20,intDeep:0.05},
  spy:{run:-0.6,screen:-0.06},
};
function cgUserOnO(){ return CG.poss===CG.userSide; }
function cgTeam(side){ return team(side==='h'?CG.home:CG.away); }
function sampleRunYds(pr, edge, defRun){
  const r=ENG.rng(); let g;
  if(r<0.30) g=ENG.ri(-5,1); else if(r<0.74) g=ENG.ri(1,5); else if(r<0.89) g=ENG.ri(5,9);
  else if(r<0.96) g=ENG.ri(9,17); else if(r<0.99) g=ENG.ri(16,38);   // 3% breakaway
  else g=ENG.ri(38,75);   // ~1% HOUSE CALL — breaks the second level and he's GONE (mean held ~4.0 so calibration holds)
  if(pr.wide) g=Math.round(g + (ENG.rng()-0.5)*4);   // outside runs are higher-variance
  return Math.round(g + edge*0.05 + (defRun||0));
}
// unified resolver used by Coach Mode AND the full-game sim/back-test
function simPlay(off, def, offKey, defKey, opts){
  opts=opts||{}; const om=OFF_META[offKey]||{}, dm0=DEF_META[defKey]||{};
  const profile=om.profile||offKey;
  const pr=PROF[offKey]||PROF[profile]||PROF.short, dm=DEFMOD[defKey]||DEFMOD[dm0.profile]||{};
  const passEdge=ENG.passOff(off)-ENG.passDef(def), rushEdge=ENG.rushOff(off)-ENG.rushDef(def);
  const mom=opts.mom||0;
  const rz=opts.rz, cap=opts.toGoal||99, wx=opts.wx, hfa=opts.hfa||0, read=opts.read||0;   // read: did the D guess your call? (+ off open, − D wins)
  const down=opts.down||1, toGo=Math.max(1,opts.toGo||10), third=down>=3, longYds=toGo>=7;
  const lift=opts.coachLift||1;   // coached-game scoring dial (your offense only); 1 = no effect. See resolvePlay.
  const fatigueEdge=(opts.defFatigue||0)-(opts.offFatigue||0);
  const heatLoad=wx&&wx.fatigue ? (0.35 + (opts.q>=3?0.35:0) + (opts.q>=4?0.25:0)) : 0;
  if(pr.run){
    let y=sampleRunYds(pr, rushEdge, dm.run||0) + mom*0.02 + (wx?wx.run:0) + hfa*0.12 + fatigueEdge*0.55 - heatLoad*0.35;
    if(om.pkg==='jumbo') y += toGo<=2?0.95:0.25;
    if(toGo<=1) y+=1.4; else if(toGo<=2) y+=1.0; else if(toGo===3) y+=0.5;   // short-yardage push (decoupled from avg ypc) → NFL-like 3rd/4th-and-short conversion
    if(om.pkg==='hands') y -= 0.15;
    if(third && toGo>=4) y-=0.4; if(third && longYds) y-=0.35;
    if(rz){y=Math.min(y,cap); if(y>4)y=Math.round(y*0.95);} y=Math.round(y*(1+read*0.10));
    if(read<=-0.6 && y>1 && ENG.rng()<0.40) y=ENG.ri(-3,1);   // the D blew it up — stuffed at the line (softened)
    if(lift>1 && y>0) y=Math.round(y*lift);   // coached-only: lift your own run gains (losses untouched)
    y=Math.round(y);
    const ballSecure=om.pkg==='hands'?-0.004:om.pkg==='jumbo'?0.002:0;
    if(ENG.rng() < pr.fum + ballSecure + (wx?wx.fum*0.6:0) + Math.max(0,opts.offFatigue||0)*0.0015){      // a fumble — but the offense recovers about half of them
      if(ENG.rng()<0.5) return {isPass:false,result:'FUM',yards:Math.max(0,y),turnover:'FUM'};   // lost
      return {isPass:false,result:'gain',yards:Math.max(0,Math.min(y,2)),fumbled:true};          // recovered by the offense — no turnover
    }
    return {isPass:false, result:y>=15?'big':y<=0?'stuff':'gain', yards:y};
  }
  // pass
  let sackP=(pr.sackP||0.06)+(dm.sack||0)-passEdge*0.0009 - read*0.05 + Math.max(0,opts.offFatigue||0)*0.012 - Math.max(0,opts.defFatigue||0)*0.004;   // symmetric: winning the read protects, losing it gets the QB hit
  const gp2 = (typeof CG!=='undefined' && CG && CG.gameplan) || {};
  if (gp2.protectPass) sackP -= 0.025; // gameplan protect reduces sack risk when you call pass concepts

  // explicit protection vs rush (OL ST helps vs edges; blitz hurts more)
  const olPass = ENG.bestIn ? ENG.bestIn(off,['T','G','C'],5) : [];
  const edgeRush = ENG.bestIn ? ENG.bestIn(def,['DE','OLB'],3) : [];
  const prot = olPass.length ? ENG.weighted(olPass, p=> (p.attrs&&p.attrs.ST)||p.ovr ) : 70;
  const rush = edgeRush.length ? ENG.weighted(edgeRush, p=> (p.attrs&&p.attrs.ST)||p.ovr ) : 70;
  sackP += (rush - prot) * 0.0018;
  if(third){ sackP += longYds?0.018:0.008; }
  if(ENG.rng()<ENG.clamp(sackP,0.01,0.30)) return {isPass:true,result:'sack',yards:-ENG.ri(5,9)};
  let comp=pr.comp + 0.006 + (dm.comp||0) + passEdge*0.004 + mom*0.0008 - (rz?0.045:0) + (wx?wx.comp+(profile==='deep'?wx.deep:0):0) + hfa*0.008 + read*0.11 + fatigueEdge*0.018 - heatLoad*0.015;   // +0.006 recenters completion after the mulberry32 RNG upgrade
  if(om.pkg==='hands') comp+=0.035;
  if(om.pkg==='jumbo' && profile==='pa') comp-=0.015;
  if(third){ comp -= longYds?0.030:0.0; }   // softened so 3rd-down conversion lands ~39% (NFL); no penalty on the convertible medium downs
  if(profile==='deep') comp+=(dm.deepComp||0); if(profile==='short'||profile==='screen') comp+=(dm.shortComp||0);
  if(read<=-0.6) comp-=0.09;   // extreme-mismatch bite, softened to keep the layer ~zero-mean
  if(lift>1) comp+=(lift-1)*0.5;   // coached-only: your QB is a touch sharper (1.08 -> +0.04 completion)
  // simple receiver vs DB matchup proxy (use rec component of passEdge + slight DB coverage tilt)
  const recTilt = (passEdge * 0.0008) + ((dm && dm.shortComp||0) - (dm && dm.intDeep||0)) * 0.4;
  comp += recTilt;
  comp=ENG.clamp(comp,0.03,0.96);
  if(ENG.rng()<comp){ let air=Math.min(ENG.ri(pr.airLo,pr.airHi), cap); let y=air+Math.max(0,Math.round((ENG.rng())*pr.yac*2));
    // Deep-shot explosive roll. A coached human (read>0) can hand-pick the best shot matchup
    // every snap and was hitting the big play unrealistically often; trim the boom-roll on the
    // coached deep ball so explosives land near the realistic rate. read=0 (AI-vs-AI back-test)
    // is exactly unaffected — this only fires on a live human read.
    const bigDamp=(read>0 && profile==='deep') ? 0.68 : 1;
    if(pr.big && !rz && ENG.rng()<(pr.big+(dm.big||0))*bigDamp) y+=ENG.ri(6,20);
    y=Math.round(y*(1+read*0.06));   // symmetric: tight coverage limits YAC, a busted coverage springs it (softened so a well-coached read helps without a runaway; read=0 AI path unaffected)
    if(om.pkg==='hands') y=Math.round(y*0.92);
    if(down===3 && !rz && y>0 && y<toGo && ENG.rng()<0.30) y=toGo+ENG.ri(0,1);   // 3rd-down: routes break to the sticks → NFL-like conversion on the money down
    if(lift>1 && y>0) y=Math.round(y*lift);   // coached-only: lift your own pass gains
    y=Math.max(-3,Math.min(y,cap)); return {isPass:true,result:y>=20?'big':'gain',yards:y,air}; }
  let intP=(pr.intP||0.02)+(profile==='deep'?(dm.intDeep||0):0)+(read<=-0.6?0.014:0);   // jumping a well-covered route → picks (softened)
  if(om.pkg==='hands') intP-=0.010;
  if(ENG.rng()<intP) return {isPass:true,result:'INT',yards:0,turnover:'INT'};
  return {isPass:true,result:'incomplete',yards:0};
}
// Coach-mode adapter (keeps the old call signature + momentum)
// play-calling chess — the actual matchup matrix. read>0 = offense open; read<0 = the defense wins the call.
// columns are the real defensive playcalls (base/run_stop/blitz/press/cover/spy).
const OFAM=Object.fromEntries(OFF_PLAYS.map(p=>[p.k,p.family || (p.type==='run'?'run':'quick')]));
// ZERO-MEAN per row: neutral/random calling → league average; smart calling rewarded, bad calling punished.
// (Each row sums to ~0 so the chess layer adds skill expression without shifting league-wide calibration.)
const MATCH={
  run:   {base:0.08, run_stop:-0.52, blitz:-0.28, press:0.24,  cover:0.36,  spy:0.12},   // run beats light boxes, dies vs loaded fronts
  quick: {base:-0.02,run_stop:0.28,  blitz:0.40,  press:-0.70, cover:0.02,  spy:0.02},   // quick game answers pressure, jammed by press
  shot:  {base:0.00, run_stop:0.34,  blitz:-0.22, press:0.40,  cover:-0.66, spy:0.14},   // shots beat man/press, capped by two-high
};
function defProfile(defKey){ return (DEF_META[defKey]&&DEF_META[defKey].profile)||defKey; }
function readFactor(offKey,defKey){ const o=OFAM[offKey]||'quick', d=defProfile(defKey), row=MATCH[o]||{}; return row[d]!=null?row[d]:0; }
function resolvePlay(offKey, defKey){
  const off=cgTeam(CG.poss), def=cgTeam(CG.poss==='h'?'a':'h');
  const ht=team(CG.home); const hfaMag=2.2 + ((ht.fans?ht.fans.morale-60:0))/18 + (((ht.stadium?ht.stadium.quality:60)-60))/40;   // crowd + venue
  const offEmo=CG._emo?(CG.poss==='h'?CG._emo.h:CG._emo.a):0, defEmo=CG._emo?(CG.poss==='h'?CG._emo.a:CG._emo.h):0;
  const emo=offEmo-0.45*defEmo;   // hometown / big-stage energy riding with the ball-team (undefined outside a coached game → no calibration impact)
  const hfa=(CG.poss==='h'?1:-1)*hfaMag + emo;   // home offense rides the crowd; visiting offense fights the noise
  // play-calling chess applies to LIVE coached snaps (your calls matter). Muted during auto sim-to-end so AI-vs-AI stays calibrated.
  let read = CG._auto ? 0 : readFactor(offKey,defKey);
  if(!CG._auto){
    ensureTeamPlaybook(off); ensureTeamPlaybook(def);
    const oc=((off.coach&&off.coach.off)||70)+(((off.staff&&off.staff.oc&&off.staff.oc.ovr)||68)-68)*0.35;
    const dc=((def.coach&&def.coach.def)||70)+(((def.staff&&def.staff.dc&&def.staff.dc.ovr)||68)-68)*0.35;
    read += ENG.clamp((oc-dc)*0.007,-0.18,0.18);
    if((off.playbook&&off.playbook.off&&off.playbook.off.keys||[]).includes(offKey)) read += ((off.coach&&off.coach.adapt)||60)>=82?0.06:0.025;
    if((def.playbook&&def.playbook.def&&def.playbook.def.keys||[]).includes(defKey)) read -= ((def.coach&&def.coach.adapt)||60)>=82?0.06:0.025;
  }
  // Gameplan biases (your pre-snap choices affect the math). Use the CALLED play's type — `r` doesn't exist yet (read feeds simPlay).
  const gp = CG && CG.gameplan || {};
  const callPass = !!(OFF_META[offKey] && OFF_META[offKey].type==='pass');
  if (gp.runPass > 0.65 && !callPass) read += 0.12; // run-heavy gameplan helps the run when you call it
  if (gp.runPass < 0.35 && callPass) read += 0.10;  // pass-heavy gameplan helps the pass when you call it
  if (gp.spyQB && !callPass) read -= 0.08;           // spying the QB softens your run fit
  if (CG._scriptEdge>0 && CG.poss===CG.userSide && !CG._auto){ read += 0.06; CG._scriptEdge--; }   // scripted opening drive
  if (CG.keyOn && CG.poss!==CG.userSide){             // you're defending and you keyed a man — take away his threat, give a touch elsewhere
    const kt=CG.keyOn.type;
    if (kt==='pass') read += callPass ? -0.13 : 0.06;
    else if (kt==='run') read += !callPass ? -0.14 : 0.06;
    else if (kt==='qb' && !callPass) read -= 0.07;
  }

  if(!CG._auto && CG.poss===CG.userSide){ CG._ucalls=CG._ucalls||[]; const fam=OFAM[offKey]||'bal';
    if(CG._ucalls.slice(-3).filter(f=>f===fam).length>=2) read-=0.8;   // predictable → the defense keys on it
    CG._ucalls.push(fam); if(CG._ucalls.length>6) CG._ucalls.shift();
  }
  // Dampen the HUMAN play-calling edge: a well-coached snap should still beat a neutral one,
  // but a coach who picks the perfect matchup every down was compounding into a runaway
  // (double the realistic explosives). Scale the POSITIVE read down and cap it; leave negative
  // read (predictability / bad matchup) fully intact so mistakes still bite. AI auto-sim keeps
  // read=0, so the calibrated AI-vs-AI baseline is untouched by this.
  if(!CG._auto && CG.poss===CG.userSide && read>0) read=Math.min(read*0.45, 0.20);
  const elapsed=(CG.q-1)*900+(900-CG.clock), heat=CG.weather==='heat' ? 1 : 0;
  const offFat=(off._fatigue||0)*0.35 + (off._hurryGas||0)*0.55 + heat*(0.25 + elapsed/3600*1.15);   // no-huddle GAS degrades the offense the longer you lean on it
  const defFat=(def._fatigue||0)*0.35 + (def._hurryGas||0)*0.50 + heat*(0.20 + elapsed/3600*0.95);
  // COACHED-GAME SCORING DIAL — lifts ONLY the human's own offense on hand-coached snaps, for a livelier
  // shootout feel. 1.00 = realistic (AI-calibrated) · 1.08 = default nudge · 1.15+ = arcade. It is gated to
  // (!CG._auto && offense === your team): the AI-vs-AI league sim, cgSimToEnd auto-sim, the record book,
  // and the AI scoring ON you are all untouched. Change the default below, or set window.FPS_COACH_SCORE_LIFT
  // in the browser console to retune live (e.g. FPS_COACH_SCORE_LIFT=1.0 turns the nudge off).
  const coachLift=(!CG._auto && CG.poss===CG.userSide) ? ((typeof window!=='undefined'&&window.FPS_COACH_SCORE_LIFT)||1.08) : 1;
  const r=simPlay(off,def,offKey,defKey,{mom:CG.mom*(CG.poss===CG.userSide?1:-1), wx:WX[CG.weather], hfa, read, down:CG.down, toGo:CG.toGo, q:CG.q, offFatigue:offFat, defFatigue:defFat, coachLift});
  r.offKey=offKey; r.defKey=defKey; return r;
}
// AI play-calling (situational)
function cgAICallOff(){
  if(CG){ const t=cgTeam(CG.poss); if(t) return teamCallOff(t,cgPlayCtx(CG.poss)); }
  const fp=Math.max(1,CG&&CG.toGo||10); const r=ENG.rng();
  if(fp<=2) return r<0.46?pickKey(OFF_JUMBO_KEYS):r<0.78?pickKey(OFF_INSIDE_KEYS):pickKey(OFF_SHOT_KEYS);
  return r<0.42?pickKey(OFF_RUN_KEYS):r<0.76?pickKey(OFF_QUICK_KEYS):pickKey(OFF_SHOT_KEYS);
}
function cgAICallDef(){
  if(CG){ const side=CG.poss==='h'?'a':'h', t=cgTeam(side); if(t){ const ctx=cgPlayCtx(side); return teamCallDef(t,ctx); } }
  const fp=Math.max(1,CG&&CG.toGo||10); const r=ENG.rng();
  if(fp<=2) return r<0.60?pickKey(DEF_RUN_KEYS):pickKey(DEF_BLITZ_KEYS);
  return r<0.24?pickKey(DEF_BASE_KEYS):r<0.42?pickKey(DEF_RUN_KEYS):r<0.60?pickKey(DEF_BLITZ_KEYS):r<0.77?pickKey(DEF_PRESS_KEYS):r<0.93?pickKey(DEF_COVER_KEYS):pickKey(DEF_SPY_KEYS);
}
function cgDepth(t,poss,n){ return t.roster.filter(p=>poss.includes(p.pos)&&pCanPlay(p)).sort((a,b)=>(a.depth||99)-(b.depth||99)||b.ovr-a.ovr).slice(0,n); }
// keep depth numbers tidy: unpinned positions auto-sort by OVR; positions the coach arranged keep their manual order
function resyncDepth(t){ if(!t) return; const byPos={}; t.roster.forEach(p=>{ (byPos[p.pos]=byPos[p.pos]||[]).push(p); });
  Object.keys(byPos).forEach(pos=>{ const arr=byPos[pos], pinned=t._depthPinned&&t._depthPinned[pos];
    if(pinned) arr.sort((a,b)=>(a.depth||99)-(b.depth||99)||b.ovr-a.ovr); else arr.sort((a,b)=>b.ovr-a.ovr);
    arr.forEach((p,i)=>{ p.depth=i+1; p.starter=(i===0); }); }); }
// the coach drags a position into a new order → set depth, pin it, and report a benched star
function cgReorderDepth(pos, orderedIds){ const t=ut(); if(!t) return;
  const grp=t.roster.filter(p=>p.pos===pos); const before={}; grp.forEach(p=>before[p.id]=p.depth);
  orderedIds.forEach((id,i)=>{ const p=grp.find(x=>x.id===id); if(p) p.depth=i+1; });
  let n=orderedIds.length; grp.filter(p=>orderedIds.indexOf(p.id)<0).sort((a,b)=>b.ovr-a.ovr).forEach(p=>p.depth=++n);
  grp.forEach(p=>p.starter=(p.depth===1));
  t._depthPinned=t._depthPinned||{}; t._depthPinned[pos]=true;
  grp.forEach(p=>{ if((pos==='QB'||pos==='RB') && p.ovr>=80 && before[p.id]===1 && p.depth>1) benchReport(t,p); });
  save(); render();
}
function benchReport(t,p){ const starter=t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>(a.depth||99)-(b.depth||99))[0];
  const txt=`🚨 ${t.city} bench ${p.name} (${p.pos}, ${p.ovr} OVR)${starter&&starter!==p?` in favor of ${starter.name}`:''} — a stunning depth-chart shake-up.`;
  if(typeof addNews==='function') addNews('DRAMA',txt); if(typeof recordArc==='function') recordArc(p,'DRAMA',`Benched${starter&&starter!==p?` for ${starter.name}`:''}.`);
  if(window.VOICES){ try{ VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🚨 Benching alert: ${t.abbr} are sitting ${p.name} (${p.pos}, ${p.ovr} OVR). A star on the pine — locker-room fallout to watch.`,'NEWS',true);
    if(VOICES.athleteTweet){ ensurePersona(p); VOICES.athleteTweet(p,'loss',{tag:'NEWS'},true); } }catch(e){} }
  p.morale=ENG.clamp((p.morale||70)-ENG.ri(8,16),12,99);
}
function cgPickWeighted(rows){
  rows=rows.filter(x=>x&&x.p&&x.w>0);
  if(!rows.length) return null;
  const sum=rows.reduce((a,x)=>a+x.w,0)||1; let roll=ENG.rng()*sum;
  for(const x of rows){ roll-=x.w; if(roll<=0) return x.p; }
  return rows[rows.length-1].p;
}
function cgTop(t){
  const qbs=cgDepth(t,['QB'],2), backs=cgDepth(t,['RB','FB'],5), wrs=cgDepth(t,['WR'],5), tes=cgDepth(t,['TE'],3);
  return {qb:qbs[0], rb:backs[0], rbs:backs, wrs, tes, receivers:[...wrs,...tes,...backs.slice(0,2)]};
}
function cgRunCarrier(tp, offKey){
  const m=OFF_META[offKey]||{}, concept=offConcept(offKey);
  // QB-designed runs (sneak / QB power / keeper / QB draw) go to the QUARTERBACK — not the back
  if(tp.qb && (concept==='qb_keeper' || /^qb_/.test(offKey) || /\bQB\b/.test(m.label||'') || /keeper|quarterback/i.test(m.hint||''))) return tp.qb;
  // zone_read: the mesh point sends the QB himself a portion of the time (the "read" side) — the rest
  // stays a give to the back. Real option look, decided here so FieldSim knows who to carry.
  if(tp.qb && concept==='zone_read' && ENG.rng()<0.32) return tp.qb;
  // jet/end-around sweep: a WR goes in motion and takes the handoff around the edge
  if(concept==='jet_sweep' && tp.wrs && tp.wrs.length){
    return cgPickWeighted(tp.wrs.map((p,i)=>{
      const a=p.attrs||{}, speed=((a.SP||p.ovr)+(a.AC||p.ovr))/2;
      return {p, w:([1,0.32,0.12][i]||0.05)*(0.7+speed/100)};
    })) || tp.wrs[0] || tp.rb || tp.qb;
  }
  const backs=tp.rbs&&tp.rbs.length?tp.rbs:[tp.rb||tp.qb].filter(Boolean);
  return cgPickWeighted(backs.map((p,i)=>{
    let w=[1,0.26,0.10,0.05,0.03][i]||0.02;   // feature back dominates the carries (and the PBP name); change-of-pace back still spells him
    const a=p.attrs||{}, speed=((a.SP||p.ovr)+(a.AC||p.ovr))/2, power=((a.ST||p.ovr)+(a.AG||p.ovr))/2;
    w*=0.7+((concept==='sweep'||concept==='zone_read'||offKey==='outside')?speed:power)/100;
    return {p,w};
  })) || tp.rb || tp.qb;
}
function cgPassTarget(tp, offKey){
  const meta=OFF_META[offKey]||{}, profile=meta.profile||offKey, family=meta.family||OFAM[offKey]||'quick';
  const rows=[];
  const add=(p,w)=>{ if(p) rows.push({p,w:w*(0.76+(((p.attrs&&p.attrs.HA)||p.ovr)/100)*0.34)}); };
  const w=tp.wrs||[], te=tp.tes||[], rb=tp.rbs||[];
  if(meta.pkg==='hands'){
    add(w[0],0.88); add(w[1],0.82); add(w[2],0.72); add(te[0],0.64); add(rb[0],0.54); add(te[1],0.32); add(rb[1],0.28);
  } else if(meta.pkg==='jumbo'){
    add(te[0],0.92); add(te[1],0.62); add(rb[0],0.36); add(w[0],0.34); add(w[1],0.18);
  } else if(profile==='deep'){
    add(w[0],1.00); add(w[1],0.92); add(w[2],0.58); add(w[3],0.26); add(te[0],0.20);
  } else if(profile==='pa'){
    add(w[0],0.88); add(w[1],0.74); add(te[0],0.76); add(w[2],0.42); add(te[1],0.28); add(rb[0],0.12);
  } else if(profile==='screen'){
    add(rb[0],1.00); add(rb[1],0.48); add(w[2],0.36); add(te[0],0.14); add(w[0],0.10);
  } else if(family==='shot'){
    add(w[0],0.94); add(w[1],0.82); add(te[0],0.48); add(w[2],0.36); add(rb[0],0.10);
  } else {
    add(w[0],0.86); add(w[1],0.78); add(w[2],0.66); add(te[0],0.58); add(rb[0],0.34); add(te[1],0.26); add(rb[1],0.17); add(w[3],0.16);
  }
  return cgPickWeighted(rows) || w[0] || te[0] || rb[0] || tp.qb;
}
function cgTally(p,o){ if(!p)return; const id=p.id; const tl=CG.tally[id]||(CG.tally[id]={p,pyd:0,ptd:0,ryd:0,rtd:0,recyd:0,rectd:0,rec:0,patt:0,pcmp:0,pint:0,ratt:0,tgt:0,tkl:0,sack:0,intc:0,pass20:0,run10:0,rec20:0,xpass:0,xrush:0,xrec:0,big:0,pr:0,hurry:0,qbhit:0,tfl:0,pbu:0,ff:0,fr:0}); Object.keys(o).forEach(k=>tl[k]=(tl[k]||0)+o[k]); }
function cgDefRows(dp,kind,opts){
  opts=opts||{}; const rows=[], y=opts.yards||0, prof=defProfile(opts.defKey);
  const add=(arr,w)=>{ (arr||[]).forEach((p,i)=>{ if(p) rows.push({p,w:Math.max(0.02,w*(1-i*0.11)*(0.78+(((p.attrs&&p.attrs.IN)||p.ovr)/100)*0.28))}); }); };
  if(kind==='sack'){ add(dp.edges,prof==='blitz'?1.35:1.05); add(dp.lbs,prof==='blitz'?0.85:0.38); add(dp.dls,0.48); }
  else if(kind==='run'){
    if(y<=0){ add(dp.dls,1.20); add(dp.lbs,1.05); add(dp.edges,0.55); add(dp.dbs,0.18); }
    else if(y<5){ add(dp.lbs,1.15); add(dp.dls,0.75); add(dp.edges,0.45); add(dp.dbs,0.32); }
    else if(y<12){ add(dp.lbs,0.85); add(dp.dbs,0.70); add(dp.edges,0.34); add(dp.dls,0.22); }
    else { add(dp.dbs,1.15); add(dp.lbs,0.50); add(dp.edges,0.18); }
  } else if(kind==='pass_tackle'){
    if(y<=0){ add(dp.lbs,0.82); add(dp.dbs,0.72); add(dp.edges,0.22); }
    else if(y<8){ add(dp.dbs,0.85); add(dp.lbs,0.75); add(dp.edges,0.18); }
    else { add(dp.dbs,1.22); add(dp.lbs,0.42); add(dp.edges,0.12); }
  } else if(kind==='pbu'||kind==='int'){ add(dp.dbs,1.20); add(dp.lbs,0.35); }
  else if(kind==='pressure'){ add(dp.edges,1.05); add(dp.dls,0.72); add(dp.lbs,prof==='blitz'?0.68:0.28); }
  if(!rows.length) add(dp.all,0.5);
  return rows;
}
function cgCreditDef(dp,kind,stats,opts,addFn){
  addFn=addFn||cgTally; const p=cgPickWeighted(cgDefRows(dp,kind,opts)); if(p) addFn(p,stats); return p;
}
function cgApplySnapStats(tp,dp,r,offKey,defKey,carrier,target,isTD,addFn){
  addFn=addFn||cgTally;
  // remember WHO made the play on defense — pbpLine names the actual credited man instead of
  // always defaulting to the same two star defenders, so the call matches the box score.
  if(CG) CG._credit=null;
  const credit=p=>{ if(CG&&p) CG._credit=p; return p; };
  if(r.isPass){
    addFn(tp.qb,{patt:1}); if(r.result!=='sack') addFn(target,{tgt:1});
    if(r.result==='sack') credit(cgCreditDef(dp,'sack',{sack:1,tkl:1,tfl:1,qbhit:1,hurry:1,pr:1},{defKey},addFn));
    else if(r.result==='INT'){ addFn(tp.qb,{pint:1}); credit(cgCreditDef(dp,'int',{intc:1,pbu:1},{defKey},addFn)); }
    else if(r.result!=='incomplete'){
      const y=Math.max(0,r.yards), ex=y>=20?{pass20:1,xpass:1,big:1}:{};
      addFn(tp.qb,Object.assign({pcmp:1,pyd:y},ex));
      addFn(target,Object.assign({rec:1,recyd:y},y>=20?{rec20:1,xrec:1,big:1}:{}));
      if(!isTD) credit(cgCreditDef(dp,'pass_tackle',Object.assign({tkl:1},r.yards<=0?{tfl:1}:{}),{yards:r.yards,defKey},addFn));
      if(ENG.rng()<0.18) cgCreditDef(dp,'pressure',{hurry:1,pr:1},{defKey},addFn);
    } else {
      if(ENG.rng()<0.48) credit(cgCreditDef(dp,'pbu',{pbu:1},{defKey},addFn));
      if(ENG.rng()<0.40) cgCreditDef(dp,'pressure',{hurry:1,pr:1},{defKey},addFn);
    }
  } else {
    const y=r.yards, runEx=y>=10?{run10:1,xrush:1,big:1}:{};
    addFn(carrier||tp.rb||tp.qb,Object.assign({ratt:1,ryd:y},runEx));
    if(r.turnover==='FUM') credit(cgCreditDef(dp,'run',{tkl:1,ff:1,fr:1},{yards:y,defKey},addFn));
    else if(!isTD) credit(cgCreditDef(dp,'run',Object.assign({tkl:1},y<=0?{tfl:1}:{}),{yards:y,defKey},addFn));
  }
}

// ---- broadcast helpers: NFL time slots, play-by-play voice, live box score, league scoreboard ----
/* ---------- INTERNATIONAL SERIES (London / Germany / Mexico / etc.) ---------- */
// neutral-site games abroad: no home-field, plus jet-lag wear on BOTH clubs (real NFL travel toll).
const INTL_VENUES=[
  {city:'London',venue:'Tottenham Hotspur Stadium',flag:'🇬🇧',wx:'rain',note:'London Series'},
  {city:'London',venue:'Wembley Stadium',flag:'🇬🇧',wx:'clear',note:'London Series'},
  {city:'Munich',venue:'Allianz Arena',flag:'🇩🇪',wx:'cold',note:'Germany Series'},
  {city:'Frankfurt',venue:'Deutsche Bank Park',flag:'🇩🇪',wx:'rain',note:'Germany Series'},
  {city:'Madrid',venue:'Estadio Santiago Bernabéu',flag:'🇪🇸',wx:'clear',note:'Spain Series'},
  {city:'Dublin',venue:'Croke Park',flag:'🇮🇪',wx:'wind',note:'Ireland Series'},
  {city:'Mexico City',venue:'Estadio Azteca',flag:'🇲🇽',wx:'clear',note:'Mexico Series — 7,200 ft altitude'},
  {city:'São Paulo',venue:'Arena Corinthians',flag:'🇧🇷',wx:'clear',note:'Brazil Series'} ];
// tag ~5 games per season as international, spread across early/mid weeks, no team abroad twice.
function assignInternationalGames(schedule){
  if(!schedule||!schedule.length) return;
  const used=new Set(); const order=ENG.shuffle?ENG.shuffle(INTL_VENUES.slice()):INTL_VENUES.slice().sort(()=>ENG.rng()-0.5);
  let vi=0; const count=Math.min(5+(G&&G.season?G.season%2:0), order.length);
  const weeks=[]; for(let w=2; w<Math.min(schedule.length-3,12); w++) weeks.push(w);
  for(let i=weeks.length-1;i>0;i--){ const j=Math.floor(ENG.rng()*(i+1)); [weeks[i],weeks[j]]=[weeks[j],weeks[i]]; }
  let placed=0;
  for(const w of weeks){ if(placed>=count) break;
    const g=(schedule[w]||[]).find(x=>!x.intl && !used.has(x.home) && !used.has(x.away));
    if(g){ const v=order[vi++%order.length]; g.intl={city:v.city,venue:v.venue,flag:v.flag,wx:v.wx,note:v.note,week:w};
      used.add(g.home); used.add(g.away); placed++; }
  }
  return placed;
}
// look up the international tag for a given matchup this week (or any week)
function gameIntl(homeAbbr, awayAbbr, week){ week = (week==null?G.week:week);
  const g=(G.schedule[week]||[]).find(x=>(x.home===homeAbbr&&x.away===awayAbbr)||(x.home===awayAbbr&&x.away===homeAbbr));
  return g&&g.intl||null; }
function announceInternationalSlate(){
  const games=[]; (G.schedule||[]).forEach((wk,wi)=>wk.forEach(g=>{ if(g.intl) games.push({g,wi}); }));
  if(!games.length) return;
  const byCity={}; games.forEach(x=>{ (byCity[x.g.intl.city]=byCity[x.g.intl.city]||[]).push(x); });
  addNews('LEAGUE',`🌍 ${G.season} International Series announced: ${games.length} games abroad — ${[...new Set(games.map(x=>x.g.intl.flag+' '+x.g.intl.city))].join(', ')}.`);
  games.forEach(x=>{ const inv=(x.g.home===USER||x.g.away===USER);
    addNewsIf(inv,'LEAGUE',`✈️ ${team(x.g.away).city} and ${team(x.g.home).city} will play Week ${x.wi+1} at ${x.g.intl.venue}, ${x.g.intl.city} (${x.g.intl.note}).`); });
  if(window.VOICES) VOICES.feedPush({h:'@NFLUK',n:'NFL International',v:true,c:'#1d9bf0'},`🌍 The ${G.season} International Series is set — ${games.length} games across ${[...new Set(games.map(x=>x.g.intl.city))].join(', ')}. Global football is here. ${games.map(x=>x.g.intl.flag).join('')}`,'NEWS',true);
}
function gameSlot(week, idx, total){
  const g=(G.schedule[week]||[])[idx];
  if(g&&g.intl) return {label:`${g.intl.flag} INTERNATIONAL · ${g.intl.city.toUpperCase()} · 9:30 AM ET`,net:'NFL Network',prime:true,intl:g.intl};
  if(idx===0) return {label:'THURSDAY NIGHT FOOTBALL',net:'Prime Video',prime:true};
  if(idx===total-1) return {label:'MONDAY NIGHT FOOTBALL',net:'ESPN',prime:true};
  if(idx===total-2) return {label:'SUNDAY NIGHT FOOTBALL',net:'NBC',prime:true};
  if((idx*3+week*7+3)%5===0) return {label:'SUNDAY · 4:25 PM ET',net:idx%2?'CBS':'FOX',prime:false};
  return {label:'SUNDAY · 1:00 PM ET',net:idx%2?'CBS':'FOX',prime:false};
}
function userGameSlot(){ const sch=G.schedule[G.week]||[]; const i=sch.findIndex(x=>x.home===USER||x.away===USER); return i<0?null:gameSlot(G.week,i,sch.length); }
function cgTopD(t){ const depth=(poss,n)=>t.roster.filter(p=>poss.includes(p.pos)&&!(p.out>0)&&!p.ir&&!p.benched).sort((a,b)=>b.ovr-a.ovr).slice(0,n);
  const edges=depth(['DE','OLB'],5), dls=depth(['DT','DE'],5), lbs=depth(['ILB','OLB','MLB','LB'],6), dbs=depth(['CB','S','FS','SS'],8);
  const seen=new Set(), all=[]; [...edges,...dls,...lbs,...dbs].forEach(p=>{ if(p&&!seen.has(p.id)){ seen.add(p.id); all.push(p); } });
  return { edge:edges[0], dl:dls[0], lb:lbs[0], db:dbs[0], edges,dls,lbs,dbs,all }; }
// broadcast-quality play-by-play, using the actual ball-carrier / target
// the SPECIFIC ball-carrier's physicals shape the play: a burner extends gains, a tall WR high-points it, a power back falls forward.
// Centered on a league-average player (SP 70 / equal height) so it's mean-neutral; only runs in the coached game, never in the calibrated sim.
// Physical-matchup FLAVOR for coached games — the carrier's speed/height/strength shapes the result with REAL drama
// (breakaways, mossed deep balls, churn-for-the-first). Each effect is measured RELATIVE TO THE DEFENDER it beats,
// so it's symmetric across matchups and nets to ~0 yards over a season — the drama redistributes yards, it doesn't
// manufacture them. That keeps coached single-game stats on the same scale as the AI sim, so the record book stays fair.
function cgPhysFlavor(r, carrier, target, off, def){
  if(!r || r.turnover || r.result==='sack' || r.result==='incomplete' || r.result==='INT') return;
  const aOf=(p,k)=>(p&&p.attrs&&p.attrs[k]!=null)?p.attrs[k]:((p&&p.ovr)||70);
  const carr = r.isPass ? target : carrier, D=cgTopD(def)||{};
  // SPEED → YAC / breakaway, vs the speed of the man chasing him (fast carrier pulls away, slow one is run down) → net ~0
  if(carr && r.yards>=5 && r.yards<62){ const sp=aOf(carr,'SP');
    const ext=ENG.clamp((sp-84)*0.10,-5,6);   // centered on skill-position speed: elite burners pull away, slow carriers get run down — symmetric, nets ~0
    if(Math.abs(ext)>=1){ r.yards=Math.max(1, Math.round(r.yards + ext*(r.yards>=11?1:0.4))); if(ext>=4 && r.yards>=18) r._burst=true; } }
  // HEIGHT → contested deep ball: tall WR over a short DB goes up and gets it (_moss); a taller DB knocks it down to a shorter grab → two-sided
  if(r.isPass && target && r.yards>=16){ const wrH=target.ht||73, dbH=(D.db&&D.db.ht)||72;
    if(wrH-dbH>=3 && ENG.rng()<0.45){ r._moss=true; r.yards=Math.round(r.yards*1.05); }
    else if(dbH-wrH>=2 && ENG.rng()<0.38){ r.yards=Math.max(9, Math.round(r.yards*0.90)); } }
  // POWER → short yardage: a strong back falls forward for the line (_churn), or a stout front stuffs a weaker one short → contest, net ~0
  if(!r.isPass && carrier && CG && CG.toGo<=2 && r.yards>=0){ const st=aOf(carrier,'ST'), dSt=(D.dl&&aOf(D.dl,'ST'))||(D.lb&&aOf(D.lb,'ST'))||77;
    if(r.yards<CG.toGo && st-dSt>=4 && ENG.rng()<(st-dSt)*0.035){ r.yards=CG.toGo; r._churn=true; }
    else if(r.yards>=CG.toGo && dSt-st>=4 && ENG.rng()<(dSt-st)*0.03){ r.yards=Math.max(0, CG.toGo-1); } }
}
function cgRadio(){ return typeof TTS!=='undefined' && TTS.cfg && TTS.cfg().era!=='modern'; }   // golden-age radio is the default voice
function cgRadioDir(){ if(!CG) return 'right to left'; return ((CG.q + (CG.poss==='h'?0:1)) % 2) ? 'right to left' : 'left to right'; }
function cgRadioLead(){ if(!CG||!window.PBPGEN) return ''; const P=window.PBPGEN, rp=window.rpick;
  const rr=ENG.rng();
  if(rr<0.07){ const tm=cgTeam(CG.poss); return `The ${tm.city} ${tm.nick} working from ${cgRadioDir()} on your dial. `; }   // orientation gimmick — sparingly, once-a-drive scene-set
  if(rr<0.40){ const dn=CG.down===1?'First':CG.down===2?'Second':CG.down===3?'Third':'Fourth';
    const goal=CG.toGo>=100-CG.ballOn, tg=goal?'goal':CG.toGo;
    const opp=cgTeam(CG.poss==='h'?'a':'h');
    const terr = CG.ballOn===50?'at midfield' : CG.ballOn<50?`at their own ${CG.ballOn}` : `at the ${(opp&&opp.city)||'opponent'} ${100-CG.ballOn}`;  // always whose-territory, never a bare flipping number
    return `${dn} and ${tg} ${terr}. `; }
  return rp(P.radio.lead); }
function pbpLine(off,def,offKey,defKey,r,act){
  const RAD = (cgRadio() && window.PBPGEN && window.PBPGEN.radio) ? window.PBPGEN.radio : null;
  const P=window.PBPGEN, fill=window.fillTpl, rp=window.rpick;
  const qb=act.qb?act.qb.last:'the QB', rb=act.rb?act.rb.last:'the back', tgt=act.target?act.target.last:'his target';
  const D=cgTopD(def)||{};
  // the man who ACTUALLY made the play (stat credit from cgApplySnapStats) gets named in the call —
  // not the same two star defenders every snap
  const cr=CG&&CG._credit, crPos=cr&&cr.pos||'';
  const edge=(/^(DE|OLB|DT)$/.test(crPos)&&cr.last)||(D.edge&&D.edge.last)||(D.dl&&D.dl.last)||'the rush',
        lb=(/^(ILB|OLB|MLB|LB)$/.test(crPos)&&cr.last)||(D.lb&&D.lb.last)||'the linebacker',
        db=(/^(CB|S|FS|SS)$/.test(crPos)&&cr.last)||(D.db&&D.db.last)||'the corner';
  const wx=(CG&&CG.weather==='snow')?' in the snow':(CG&&CG.weather==='rain')?' through the rain':(CG&&CG.weather==='heat')?' in the heat':(CG&&CG.weather==='wind')?' into the wind':'';
  if(!P||!fill){ return r.isPass? `${qb} to ${tgt} for ${r.yards}.` : `${rb} for ${r.yards}.`; }   // pool missing — safe fallback
  const vars={qb,rb,tgt,lb,db,edge,yards:Math.abs(r.yards),off:off.abbr,def:def.abbr,wx};
  const dead = !!r.turnover || r.result==='sack' || r.result==='incomplete' || r.result==='INT';
  const td = !!(CG && !dead && (CG.ballOn+r.yards>=100));   // play reaches the end zone
  // ---- situational lead-in (grounds the stakes of THIS down) ----
  let lead='';
  if(RAD){ lead=cgRadioLead(); }
  else if(CG){ const togo=CG.toGo, late=CG.q>=4 && CG.clock<=120;
    if(CG.down>=4) lead=rp(P.lead.fourth);
    else if(CG.down===3 && togo>=7) lead=rp(P.lead.thirdLong);
    else if(CG.down===3 && togo<=3) lead=rp(P.lead.thirdShort);
    else if(CG.ballOn>=90) lead=rp(P.lead.redzone);
    else if(late) lead=rp(P.lead.twoMinute);
    else lead=rp(P.lead.neutral);
  }
  // ---- body (true to the outcome; TD-flavored pools only on an actual score) ----
  let body, bucket;
  if(r.turnover==='FUM'){ body=`${rb} takes the handoff — hit by ${lb}, and the ball is OUT! ${def.abbr} recover. ${off.abbr} cough it up.`; }
  else if(!r.isPass){
    bucket = (td&&r.yards>=8)?'big' : r.yards>=12?'chunk' : r.yards>=6?'solid' : r.yards>=1?'short' : 'stuff';
    body=fill(rp((RAD?RAD.run:P.run)[bucket]||P.run[bucket]),vars);
    if(td && bucket!=='big' && !RAD) body=body.replace(/[.!]$/,'')+' — TOUCHDOWN!';
  } else {
    bucket = r.result==='sack'?'sack' : r.result==='INT'?'int' : r.result==='incomplete'?'incomplete'
           : (td&&r.yards>=18)?'bomb' : r.yards>=22?'deep' : r.yards>=11?'mid' : 'short';
    body=fill(rp((RAD?RAD.pass:P.pass)[bucket]||P.pass[bucket]),vars);
    if(td && bucket!=='bomb' && !dead && !RAD) body=body.replace(/[.!]$/,'')+' — TOUCHDOWN!';
  }
  // ---- conversion suffix (did this snap move the chains, or come up short?) ----
  let suffix='';
  if(CG && !dead && !td){ const converted=r.yards>=CG.toGo;
    // fill() the suffix too — the radio 'first' pool carries a ${off} token that otherwise leaks raw
    if(converted && CG.down>=2) suffix=fill(rp(RAD?RAD.first:P.suffix.firstDown),vars);
    else if(!converted && CG.down>=3){
      // a STOP — strip any "and a safe gain / a fine gain / keeps the chains moving" flourish so the body doesn't contradict "they hold 'em"
      const yn=String(vars.yards).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      body=body.replace(new RegExp(yn+'\\b[^.!?]*[.!?]?\\s*$'), String(vars.yards)).replace(/[\s.—,!-]+$/,'').trim();
      suffix=fill(rp(RAD?RAD.short:P.suffix.shortOf),vars);
    }
  }
  if(!RAD && !suffix && !dead && !td && Math.abs(r.yards)>=22 && Math.random()<0.4) suffix=rp(P.suffix.bigMomentum);
  // ---- PLAYER COLOR TAIL: real information on the man who touched it — his day so far, his
  // physical edge (from cgPhysFlavor), or the defender who made the stop. ~2 of 5 snaps, never on a score.
  let tail='';
  if(!dead && !td && CG && CG.tally){
    const S=p=>p&&p.id&&CG.tally[p.id];
    if(Math.random()<0.42){
      if(!r.isPass && act.rb){ const s=S(act.rb);
        if(r._churn) tail=` ${rb} WANTED that one — powers through for the line to gain.`;
        else if(r._burst && window.PHYS && act.rb.t40) tail=` That's ${PHYS.fmt40(act.rb.t40)} speed on full display.`;
        else if(s && s.ratt>=4) tail=` That's ${s.ratt} carries for ${s.ryd} yards today${s.rtd?` and ${s.rtd} score${s.rtd>1?'s':''}`:''}.`;
      } else if(r.isPass && act.target){ const s=S(act.target), q=S(act.qb);
        if(r._moss) tail=` Went UP over ${db} and took it away.`;
        else if(s && s.rec>=3) tail=` ${s.rec} catches, ${s.recyd} yards on the day${s.rectd?' — and a score':''}.`;
        else if(q && q.patt>=8 && Math.random()<0.5) tail=` ${qb} is now ${q.pcmp} of ${q.patt} for ${q.pyd}.`;
      }
    }
    if(!tail && cr && !r.isPass && r.yards<=1 && Math.random()<0.5 && body.indexOf(cr.last)<0){ const cs=S(cr);
      tail=` ${cr.last} with the stop${cs&&cs.tkl>=4?` — his ${cs.tkl}th tackle of the day`:''}.`; }
  }
  return (lead+body+suffix+tail).replace(/\s{2,}/g,' ').trim();
}
// ---- COLOR COMMENTARY: the booth analyst reacting to the play, alongside the play-by-play ----
const ANALYSTS=['Coach Prime','Big Q','The Professor','Hollywood','Tank','Sarge','Doc'];
// the booth must not repeat itself — remember the last ~18 takes across ALL kinds and avoid them
const _boothSeen=[];
function _boothPick(arr){ if(!arr||!arr.length) return '';
  let v; for(let i=0;i<10;i++){ v=arr[Math.floor(ENG.rng()*arr.length)]; if(_boothSeen.indexOf(v)<0) break; }
  _boothSeen.push(v); if(_boothSeen.length>18)_boothSeen.shift(); return v; }
function cgColor(kind, def){ def=def||'the D';
  const L={
    td:[`THAT'S how you finish a drive! Saw the leverage and took it. Money.`,`Touchdown! Perfect timing, perfect throw — you cannot defend that.`,`Six! Grown-man football right there. Pay that man.`,`He walked in. Somebody on ${def} has some explaining to do in the film room.`,`Capitalize! That's how you turn field position into points.`],
    int:[`OH you can NOT do that! Threw it right to him — read the safety, baby!`,`Backbreaker. That's a season-defining mistake right there.`,`Picked! He stared his man down the whole way. Welcome to the league.`,`Jumped the route — ${def} read the eyes the whole way.`],
    fum:[`Ball security is JOB security — and he just got fired.`,`Put it on the ground, you put your season on the ground. Ugly.`,`The ${def} punched it out. That's a want-to play. Effort wins.`,`Strip sack or strip run — either way, turnover city.`],
    sack:[`Protection broke DOWN. That tackle's gonna see this one all week.`,`Coverage sack — nobody open, and ${def} made him pay. Great rush.`,`Gotta feel that pocket! He held it a half-second too long.`,`Interior pressure collapsed the pocket — no escape.`],
    big:[`EXPLOSIVE! Once he's in the open field, hang it up. Gone.`,`That's a CHUNK! Schemed up beautifully. Defense is reeling.`,`Whoa! Flipped the field in a heartbeat. Big-time players, big-time moments.`,`YAC machine! One cut and the angle was gone.`],
    firstdown:[`Move the chains! That's the dirty-work stuff that wins games.`,`Money down — converted. That's good vs. great right there.`,`Stayed on schedule. Now the whole playbook opens up.`,`First down football — they are winning the little battles.`],
    incomplete:[`Gotta come down with that! That's a catch at this level.`,`Broken up — tip your cap to ${def}, that's a rep won.`,`Off the mark. He's gotta give his guy a chance there.`,`Good coverage, better throw next time.`],
    gain:[`Nice little chunk. Keeps the defense honest.`,`They took what the defense gave them — smart football.`,`Ahead of the chains. That's how you wear a front down.`,`Short gain. The next call has to do the work.`,`Useful yards only matter if the next call has an answer.`],
    stuff:[`No gain, no excuses. ${def} won the point of attack.`,`Stuff city. The front fit it clean. Back to the drawing board.`,`STUFFED! The ${def} front won that rep clean. Hat on a hat.`,`Nowhere to go — blew it up at the snap. Somebody missed a block.`],
    punt:[`Punt pins them deep. Hidden points.`,`Good hang time, good roll — field position battle won.`,`Field-position game now. Flip it and trust your defense.`],
    fg_good:[`Good from 45 — cash. Points on the board.`,`Kicker splits the uprights. Drive ends in three.`,`Automatic. Points win games — bank it and move on.`],
    fg_miss:[`OH NO. You can't leave points out there like that. That'll haunt 'em.`,`WIDE! All that work for nothing. Brutal.`] };
  return _boothPick(L[kind]||L.gain);
}
// the ANALYST CONTEXT BEAT — real game detail (live stat lines, scoreboard, drive, momentum), shown ~every other play.
function cgStatOf(p){ return (p&&CG&&CG.tally&&CG.tally[p.id])||{}; }
// PLAYERS WITH PERSONALITY — a character beat tied to the man who made the play (archetype, morale, streak, age, the moment).
// ── PRE-GAME BROADCAST PREP — the booth's prepared sheet (matchup, stakes, players to watch, storylines) ──
function cgPregameHTML(){ const p=CG&&CG._prep; if(!p) return '';
  return `<div class="card" style="border:1px solid #4a3a7a;background:radial-gradient(circle at 50% 0%, #5bbcff14, transparent 70%)">
    <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><h3 style="margin:0">📋 Pregame — The Storylines</h3><span class="muted" style="font-size:12px">${esc(p.matchup)}</span></div>
    ${p.aiPreview?`<p style="font-size:14px;line-height:1.55;color:#dbe6f5;margin:8px 0 4px">${esc(p.aiPreview)}</p>`:p.stakes.length?`<p class="muted" style="font-size:13px;line-height:1.5;margin:8px 0 4px">${esc(p.stakes.join(' '))}</p>`:'<p class="muted" style="font-size:12px;margin:8px 0 0">The booth is finalizing its notes…</p>'}
    ${p.watch.length?`<div class="cg-panel-title" style="margin-top:6px">PLAYERS TO WATCH</div>${p.watch.map(w=>`<div style="font-size:12.5px;padding:2px 0"><b>${esc(w.name)}</b> <span class="tag">${w.pos}</span> <span class="muted">${w.team} · 📍${esc(w.home||"")}</span> — ${esc(w.note)}</div>`).join('')}`:''}
    ${(p.rivalries&&p.rivalries.length)?`<div class="cg-panel-title" style="margin-top:8px">RENEWED RIVALRIES</div>${p.rivalries.map(x=>`<div style="font-size:12px;padding:1px 0;color:#ffb0b8">⚔ ${esc(x)}</div>`).join('')}`:''}
    ${p.storylines.length?`<div class="cg-panel-title" style="margin-top:8px">STORYLINES</div>${p.storylines.map(x=>`<div class="muted" style="font-size:12px;padding:1px 0">• ${esc(x)}</div>`).join('')}`:''}
    ${(p.news&&p.news.length)?`<div class="cg-panel-title" style="margin-top:8px">FROM THE WIRE THIS WEEK</div>${p.news.map(x=>`<div class="muted" style="font-size:12px;padding:1px 0">📰 ${esc(x)}</div>`).join('')}`:''}</div>`;
}
function cgWatchNote(p,t){ const z=p.stats||{};
  if(p.pos==='QB') return `${z.pyd||0} pass yds, ${z.ptd||0} TD this year (${p.ovr} OVR)`;
  if((z.ryd||0)>=(z.recyd||0) && (z.ryd||0)>0) return `${z.ryd} rush yds, ${z.rtd||0} TD — the engine of this offense`;
  if((z.recyd||0)>0) return `${z.rec||0} grabs, ${z.recyd} yds, ${z.rectd||0} TD on the year`;
  if(typeof ENG!=='undefined'&&ENG.DEF&&ENG.DEF.has(p.pos)) return `${p.ovr} OVR — a wrecking ball on that defense`;
  return `${p.ovr} OVR`;
}
function cgPregamePrep(home, away){ if(!home||!away||!CG) return null;
  const prep={matchup:`${away.city} ${away.nick} (${away.wins||0}-${away.losses||0}) at ${home.city} ${home.nick} (${home.wins||0}-${home.losses||0})`, stakes:[], watch:[], storylines:[], facts:[], drops:[], aiPreview:''};
  if(CG.rivalry) prep.stakes.push(`A real rivalry — ${CG.rivalry}. Throw the records out.`);
  if(CG.slot&&CG.slot.prime) prep.stakes.push(`Primetime stage: ${CG.slot.label}.`);
  if(home.conf===away.conf && home.div===away.div) prep.stakes.push(`A division game — these two know each other cold.`);
  const late=(G.week||0)>=Math.round((G.maxWeek||17)*0.66);
  if(late) [home,away].forEach(t=>{ if((t.wins-t.losses)>=2) prep.stakes.push(`${t.abbr} (${t.wins}-${t.losses}) are squarely in the playoff hunt.`); });
  if(CG.weather && CG.weather!=='clear' && CG.weather!=='dome') prep.stakes.push(`Conditions to watch: ${CG.weather}.`);
  const stars=t=>{ const tp=cgTop(t), dp=cgTopD(t), out=[]; if(tp.qb)out.push(tp.qb);
    const sk=[tp.rb,...(tp.wrs||[]).slice(0,2),...(tp.tes||[]).slice(0,1)].filter(Boolean).sort((a,b)=>(((b.stats&&(b.stats.recyd||b.stats.ryd))||0))-(((a.stats&&(a.stats.recyd||a.stats.ryd))||0)))[0]; if(sk)out.push(sk);
    const ds=(dp.all||[]).slice().sort((a,b)=>b.ovr-a.ovr)[0]; if(ds)out.push(ds); return out.slice(0,2); };
  [away,home].forEach(t=>stars(t).forEach(p=>prep.watch.push({team:t.abbr,name:p.name,pos:p.pos,id:p.id,home:hometownOf(p),note:cgWatchNote(p,t)})));
  [home,away].forEach(t=>t.roster.forEach(p=>{ if(prep.storylines.length>=4) return;
    if(p.ovr>=84 && (p.years||9)<=1) prep.storylines.push(`${p.name} (${p.pos}, ${t.abbr}) is playing for a new contract — and the tape shows it.`);
    else if(p.rookie && (((p.stats&&(p.stats.recyd||p.stats.ryd||p.stats.pyd))||0))>=350) prep.storylines.push(`Rookie ${p.name} (${p.pos}, ${t.abbr}) is having a year nobody on the draft board saw coming.`);
  }));
  [home,away].forEach(t=>{ if(prep.storylines.length>=5) return; const oc=t.owner&&t.owner.confidence; if(oc!=null&&oc<34 && t.coach) prep.storylines.push(`The seat is warming up for ${t.coach.name} in ${t.city} after a rough stretch.`); });
  // player rivalries renewed in this game (QB vs QB, WR vs CB)
  const _ids=new Set([...home.roster,...away.roster].map(p=>p.id));
  prep.rivalries=(G.rivalries||[]).filter(rv=>rv&&rv.a&&rv.b&&_ids.has(rv.a.id)&&_ids.has(rv.b.id)).slice(0,2).map(rv=>{ const lead=rv.aw===rv.bw?`dead even ${rv.aw}-${rv.bw}`:rv.aw>rv.bw?`${rv.a.name} leads ${rv.aw}-${rv.bw}`:`${rv.b.name} leads ${rv.bw}-${rv.aw}`; return `${rv.a.name} and ${rv.b.name} renew their ${rv.type==='QB'?'quarterback':'WR-CB'} rivalry — ${lead} head-to-head.`; });
  // news from the week mentioning either team (transactions, results, injuries, the wire)
  const _esc=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); const _tn=new RegExp(`(${[home.city,home.nick,away.city,away.nick].map(_esc).join('|')})`,'i');
  prep.news=(G.news||[]).filter(n=>n&&(n.wk>=(G.week||0)-1)&&_tn.test(n.txt)).slice(0,3).map(n=>String(n.txt).replace(/<[^>]+>/g,''));
  (CG._emoNotes||[]).forEach(n=>{ if(n.note && prep.storylines.length<7 && !prep.storylines.includes(n.note)) prep.storylines.push(n.note); });
  prep.facts=[prep.matchup, ...prep.stakes, ...prep.rivalries, ...prep.watch.map(w=>`Watch ${w.name} (${w.pos}, ${w.team}, hometown ${w.home}): ${w.note}`), ...prep.storylines, ...prep.news.map(n=>`This week's news: ${n}`)];
  // the deterministic drops the booth can sprinkle in mid-game even with no AI
  prep.drops=[...prep.storylines, ...prep.rivalries, ...prep.watch.map(w=>`Keep an eye on ${w.name}, out of ${w.home} — ${w.note}.`), ...prep.news.map(n=>`In the news this week — ${n}`)];
  return prep;
}
function cgPregameAI(){ if(typeof AI==='undefined'||!AI.on||!AI.on()||!CG||!CG._prep) return;
  const tok=CG._gameTok=(CG._gameTok||0)+1;
  const facts=CG._prep.facts.slice(0,12);   // cap notes → faster prompt processing (latency-free pre-game)
  const sys=`You are an NFL broadcast crew. Using ONLY the notes below, write a vivid 3-sentence pregame preview that sets the stage — the matchup, the stakes, and a star or two to watch. Use ONLY the names, teams and numbers given; never invent a stat, player, team or score. Just the 3 sentences — no lists, no emoji, no quotes.`;
  const usr=`PREGAME NOTES:\n${facts.join('\n')}\n\nThe 3-sentence preview:`;
  AI.color(sys,usr,{numPredict:150,temp:0.5}).then(txt=>{ if(!txt||!CG||CG._gameTok!==tok||!CG._prep) return;
    txt=stripHTML(txt).trim().replace(/\s*\n+\s*/g,' ').replace(/\s{2,}/g,' ');
    const lc=txt.toLowerCase();
    if((G.teams||[]).some(t=>t.abbr!==CG.home&&t.abbr!==CG.away&&(lc.includes(' '+String(t.nick).toLowerCase())||lc.includes(String(t.city).toLowerCase())))) return;   // foreign team → drop
    if(/\b(as an ai|language model|here'?s|notes:|preview:)\b/i.test(txt)) return;
    if(txt.length>=50 && txt.length<700){ CG._prep.aiPreview=txt; if(VIEW==='field') render(); }
  }).catch(()=>{});
}
function cgPlayerBeat(off, def, r, act, pre){
  if(!CG||!act||!r) return null;
  const isPass=r.isPass, star=isPass?act.target:act.rb, qb=act.qb, A=[], pick=ENG.pick, y=r.yards||0;
  const m=CG.hs-CG.as, late=CG.q>=4, clutch=late&&Math.abs(m)<=8;
  const td=!r.turnover && pre && (pre.ballOn+y>=100);
  const fd = pre && y>=pre.toGo && !r.turnover;
  const big=td||r.turnover||(isPass&&y>=18)||(!isPass&&y>=12)||r.result==='sack';
  if(CG._emoNotes && star && y>=6){ const en=CG._emoNotes.find(n=>n.id===star.id); if(en && ENG.rng()<0.5){ return en.delta>=0?`${star.name} is feeling it — ${en.where}, and it shows on that one.`:`${star.name} is pressing — ${en.where} getting to him.`; } }
  const sst=star&&cgStatOf(star), touches=sst?((sst.rec||0)+(sst.ratt||0)):0, yds=sst?((sst.recyd||0)+(sst.ryd||0)):0;
  const arche=star&&star.archetype, mor=(star&&star.morale)||70, age=(star&&star.age)||26, ovr=(star&&star.ovr)||70, temp=(star&&star.temperament)||60, last=star&&star.last;
  if(r.result==='INT'&&qb) A.push(`${qb.last} forced it — ${(qb.morale||70)<60?'and the frustration is boiling over out there.':'a throw he wants back the instant it leaves his hand.'}`);
  if(r.result==='sack'&&qb) A.push(`${qb.last} held it a tick too long — he has to feel that rush and cut it loose.`);
  if(td&&isPass&&qb&&star) A.push(`${qb.last} to ${last} — the connection this whole offense is built around. 🔥`);
  if(td&&!isPass&&star) A.push(`${last} punches it in, running ANGRY — and the sideline is electric.`);
  if(big&&star&&(arche==='boom'||arche==='risk'||temp>=78)&&!r.turnover) A.push(`…and ${last} makes sure the whole stadium hears about it. Zero lack of confidence in that one.`);
  if(star&&touches>=2&&yds>=35&&y>=5) A.push(`${last} is heating up — ${touches} touches for ${yds}. He's got that look in his eye.`);
  if(star&&star.rookie&&y>=9) A.push(`The rookie ${last} again — poised beyond his years; the staff loves what they're seeing.`);
  if(star&&clutch&&age>=30&&ovr>=80&&y>=5) A.push(`Ice water — ${last} has been here a hundred times, the moment doesn't faze him.`);
  if(star&&(mor<=58||(star.flags&&star.flags.wantsBall))&&y>=7) A.push(`${last}'s been barking for the ball — feed him and watch the body language flip.`);
  if(!isPass&&sst&&(sst.ratt||0)>=6&&y>=3) A.push(`${last} just keeps coming — ${sst.ratt} carries of pure will, wearing this front DOWN.`);
  if(isPass&&qb){ const q=cgStatOf(qb); if((q.pcmp||0)>=4&&(q.pyd||0)>=60&&y>=6) A.push(`${qb.last} is in a rhythm now — seeing it clean and letting it rip on time.`); }
  if(fd&&star&&!big&&!A.length&&ENG.rng()<0.5) A.push(`${last} does the dirty work to move the chains — unglamorous, exactly what they need.`);
  if(!A.length) return null;
  let out=pick(A); if(out===CG._lastBeatTxt && A.length>1) out=pick(A.filter(x=>x!==CG._lastBeatTxt));
  CG._lastBeatTxt=out; return out;
}
function cgColorBeat(off, def){
  if(!CG) return null;
  if(CG._prep&&CG._prep.drops&&CG._prep.drops.length&&ENG.rng()<0.16){ return ENG.pick(["Like we talked about pregame, ","Remember what we said before kickoff — ",""])+ENG.pick(CG._prep.drops); }
  const tp=cgTop(off), dp=cgTopD(def), A=[];
  const margin=CG.hs-CG.as, per=CG.q>4?'overtime':`the ${['','1st','2nd','3rd','4th'][CG.q]||(CG.q+'th')}`;
  const qb=tp.qb, q=cgStatOf(qb);
  if(qb && (q.patt||0)>=3){ const cmp=q.pcmp||0, att=q.patt||0, ypa=(q.pyd||0)/(att||1);
    const take=(q.pint||0)>=2?`but man, those ${q.pint} picks — that's the whole story right now`:ypa>=8.5?`and I tell ya, he's just carving 'em up`:cmp/(att||1)<0.5?`but he's still hunting for a rhythm out there`:`and he's taking exactly what they give him, no panic in his game`;
    A.push(ENG.pick(["You watch ","I'm telling you — ","Look at "])+`${qb.last} — ${cmp} of ${att} for ${q.pyd||0}${q.ptd?`, ${q.ptd} touchdown${q.ptd>1?'s':''}`:''} ${take}.`); }
  const rb=tp.rb, rs=cgStatOf(rb);
  if(rb && (rs.ratt||0)>=4){ const ypc=(rs.ryd||0)/(rs.ratt||1);
    const take=ypc>=4.8?`and I'm telling you, that front's getting tired of tackling him`:ypc<=2.4?`but the defense is winning that line of scrimmage so far`:`just grinding it out, churning between the tackles`;
    A.push(ENG.pick(["Keep feeding ","You gotta love ","I'll tell you what, "])+`${rb.last} — ${rs.ratt} carr${rs.ratt===1?'y':'ies'}, ${rs.ryd||0} yards${rs.rtd?` and ${rs.rtd} score${rs.rtd>1?'s':''}`:''}, ${take}.`); }
  const recX=(tp.receivers||[]).map(p=>({p,s:cgStatOf(p)})).filter(x=>(x.s.rec||0)>=2||(x.s.tgt||0)>=4).sort((a,b)=>(b.s.recyd||0)-(a.s.recyd||0))[0];
  if(recX){ const s=recX.s; A.push(`And how about ${recX.p.last}? ${s.rec||0} grab${(s.rec||0)===1?'':'s'} for ${s.recyd||0}${s.rectd?` and a score`:''} — that's the matchup they keep going back to, and honestly I don't blame 'em.`); }
  const dX=(dp.all||[]).map(p=>({p,s:cgStatOf(p)})).filter(x=>(x.s.sack||0)>=1||(x.s.intc||0)>=1||(x.s.tfl||0)>=2).sort((a,b)=>((b.s.sack||0)*2+(b.s.intc||0)*2+(b.s.tfl||0))-((a.s.sack||0)*2+(a.s.intc||0)*2+(a.s.tfl||0)))[0];
  if(dX){ const s=dX.s, bits=[]; if(s.sack)bits.push(`${s.sack} sack${s.sack>1?'s':''}`); if(s.intc)bits.push(`${s.intc} pick${s.intc>1?'s':''}`); if(s.tfl)bits.push(`${s.tfl} TFL`); if(bits.length) A.push(`${dX.p.last} is living in that backfield — ${bits.join(', ')}. He's wrecking the whole game plan by himself.`); }
  if(margin===0) A.push(`Dead even in ${per}, and you can feel it — next big play, somebody takes control of this thing.`);
  else { const ld=margin>0?team(CG.home):team(CG.away); A.push(ENG.pick(["I'll say this — ",""])+`${ld.abbr}'s out front by ${Math.abs(margin)}, but ${Math.abs(margin)>=14?`they're starting to pull away now`:Math.abs(margin)<=4?`it's one score — anybody's ballgame`:`don't let that fool ya, this one's a long way from over`}.`); }
  if(Math.abs(CG.mom)>=26) A.push(`You feel that? Momentum just swung hard — whole building can sense it here in ${per}.`);
  return A.length? ENG.pick(A) : null;
}
// LIVE AI COLOR (optional local Ollama / cloud): replaces the template booth take on NOTABLE plays, async + never blocks.
// The play already resolved with the instant template; if a fresher AI line comes back, it swaps in a beat later.
function cgEnrichColor(kind, off, def, r, line){
  if(typeof AI==='undefined' || !AI.on || !AI.on() || !CG) return;
  const tok=CG._playTok, act=CG._lastAct||{}, isPass=!!(r&&r.isPass);
  const star=isPass?act.target:act.rb, qb=act.qb;
  const sst=(star&&cgStatOf(star))||{}, qst=(qb&&cgStatOf(qb))||{};
  const isTD=kind==='td';
  // TIGHT, low-temp, strongly-grounded prompt — small local models hallucinate teams/scores/TDs if given any rope.
  const facts=[`Teams: ${off.city} (${off.abbr}) have the ball, ${def.city} (${def.abbr}) on defense.`,
    `The one play to react to: ${stripHTML(line)}`];
  if(star&&(sst.rec||sst.ratt)) facts.push(`${star.name} on the day: ${isPass?`${sst.rec||0} catch${(sst.rec||0)===1?'':'es'}, ${sst.recyd||0} yds`:`${sst.ratt||0} carr${(sst.ratt||0)===1?'y':'ies'}, ${sst.ryd||0} yds`}.`);
  if(qb&&qst.patt) facts.push(`${qb.name} on the day: ${qst.pcmp||0}/${qst.patt||0}, ${qst.pyd||0} yds${qst.ptd?`, ${qst.ptd} TD`:''}${qst.pint?`, ${qst.pint} INT`:''}.`);
  const persona=ENG.pick((typeof ANALYSTS!=='undefined'&&ANALYSTS)||['a sharp analyst']);
  const sys=`You are ${persona}, a former player turned NFL color analyst, chatting casually with your play-by-play partner in the booth. In EXACTLY 2 short, CONVERSATIONAL sentences, react to the one play — like you're talking, not reading a script. Use contractions and a natural, casual voice ("you watch", "I tell ya", "man", "love that", "honestly"). Rules: mention ONLY the players and teams named in the facts; use the real numbers; do NOT mention any score, lead, touchdown, or end zone unless the play text explicitly says so; never invent a player, team, stat, or down. No preamble, no quotes, no emoji.`;
  const usr=`${facts.join('\n')}\n\nYour 2 sentences:`;
  AI.color(sys,usr,{numPredict:80,temp:0.55}).then(txt=>{
    if(!txt||!CG||CG._playTok!==tok) return;            // a newer snap happened → drop the stale line
    txt=stripHTML(txt).replace(/^["'\s]+|["'\s]+$/g,'').replace(/\s*\n+\s*/g,' ').replace(/\s{2,}/g,' ').trim();
    // ── HALLUCINATION GATE — a tiny model invents names/teams/TDs; never let garbage replace the good deterministic line.
    if(txt.length<14 || txt.length>300) return;
    if(/\b(fifth|sixth|seventh|eighth|ninth|tenth|0th)\s+down\b/i.test(txt)) return;
    if(/\b(as an ai|language model|i cannot|i can'?t|here'?s|reaction:|facts:|2 sentence|stage direction)\b/i.test(txt)) return;
    if(!isTD && /\b(touchdown|end ?zone|in the end|to the house|house call|for the score|six points|paydirt|in for six|scores?\b|the lead|extend(?:s|ing)? (?:the|their) lead)\b/i.test(txt)) return;   // invented a score/TD
    const lc=txt.toLowerCase();
    if((G.teams||[]).some(t=> t.abbr!==off.abbr && t.abbr!==def.abbr && (lc.includes(' '+String(t.nick).toLowerCase())||lc.includes(String(t.city).toLowerCase())) )) return;   // mentioned a foreign team
    if(!/[.!?]$/.test(txt)) txt+='.';
    CG.lastColor=txt; CG._colorAI=true; if(VIEW==='field') render();
  }).catch(()=>{});
}

// ============================================================
// BOOTH FACTS — game-specific announcer notes, each used once.
//
// CG.facts = [{text: string, used: false}, ...]
//
// Generation: cgGenerateFacts() fires once at game start (async,
// non-blocking). Procedural facts are the immediate baseline; LLM
// facts replace/extend when they arrive.
//
// Delivery: cgPickFact() returns one unused fact (or null) and marks
// it used. Injected into cgAfter() on calm plays, rate-limited to
// at most 1 fact every 3 snaps, never on big/turnover moments.
// ============================================================

// Build a pool of facts from the prepared sheet — always available, no AI needed.
function cgBuildProceduralFacts(){
  if(!CG||!CG._prep) return [];
  const p=CG._prep;
  const out=[];
  const home=team(CG.home), away=team(CG.away);
  // record/standing
  out.push(`${away.city} ${away.nick} come in at ${away.wins||0}-${away.losses||0}; ${home.city} ${home.nick} are ${home.wins||0}-${home.losses||0} at home.`);
  // stakes from prep
  p.stakes.forEach(s=>{ if(s && out.length<10) out.push(s); });
  // storylines
  p.storylines.forEach(s=>{ if(s && out.length<10) out.push(s); });
  // player watches — convert to single-sentence booth note
  (p.watch||[]).forEach(w=>{
    if(out.length>=10) return;
    if(w&&w.name&&w.note) out.push(`Keep an eye on ${w.name} (${w.pos}, ${w.team}) — ${w.note}`);
  });
  // rivalries
  (p.rivalries||[]).forEach(r=>{ if(r&&out.length<10) out.push(r); });
  // news
  (p.news||[]).forEach(n=>{ if(n&&out.length<10) out.push(`Off the wire: ${n}`); });
  // weather note
  if(CG.weather&&CG.weather!=='clear'&&CG.weather!=='dome') out.push(`Weather's a factor today — ${CG.weather} conditions could affect the kicking game.`);
  return out.filter(Boolean).slice(0,10).map(text=>({text, used:false}));
}

// Async — fires once at game start; populates CG.facts immediately with procedural
// baseline, then upgrades with LLM facts when available. Never blocks game start.
function cgGenerateFacts(){
  if(!CG||CG._factsInit) return;   // guard against double-fire
  CG._factsInit=true;
  // Procedural baseline is always set immediately (synchronous)
  CG.facts=cgBuildProceduralFacts();
  // Try to upgrade with LLM facts (async, non-blocking)
  if(typeof AI==='undefined'||!AI.on||!AI.on()||!AI.facts||!CG._prep) return;
  const tok=CG._gameTok;
  const p=CG._prep;
  const home=team(CG.home), away=team(CG.away);
  const matchupSummary={
    home:{abbr:home&&home.abbr,city:home&&home.city,nick:home&&home.nick,record:`${(home&&home.wins)||0}-${(home&&home.losses)||0}`},
    away:{abbr:away&&away.abbr,city:away&&away.city,nick:away&&away.nick,record:`${(away&&away.wins)||0}-${(away&&away.losses)||0}`},
    stakes:p.stakes,storylines:p.storylines,
    players_to_watch:p.watch,rivalries:p.rivalries,
    news:p.news
  };
  AI.facts(matchupSummary).then(arr=>{
    if(!CG||CG._gameTok!==tok||!Array.isArray(arr)||!arr.length) return;   // stale / empty → keep procedural
    // Hallucination guard: reject strings that mention teams not in this game
    const validTeams=new Set([home&&home.abbr,away&&away.abbr,home&&home.city,away&&away.city,home&&home.nick,away&&away.nick].filter(Boolean).map(s=>s.toLowerCase()));
    const clean=arr.filter(f=>{
      const lf=String(f).toLowerCase();
      // Drop if it names a city/nick that isn't either team
      if(typeof G!=='undefined'&&G.teams){
        for(const t of G.teams){
          if(t.abbr===home.abbr||t.abbr===away.abbr) continue;
          if(lf.includes(String(t.nick).toLowerCase())||lf.includes(String(t.city).toLowerCase())) return false;
        }
      }
      return true;
    });
    if(!clean.length) return;   // all rejected → keep procedural
    // Merge: prepend LLM facts (higher quality), keep unused procedural ones as tail for depth
    const unused=CG.facts.filter(f=>!f.used);
    CG.facts=[...clean.map(text=>({text,used:false})),...unused];
  }).catch(()=>{});  // any error → keep procedural pool
}

// Return one unused booth fact and mark it used, or null if none left / rate-limited.
// Rate limit: at most one fact every 3 snaps (CG._factSnap tracks last delivery snap).
function cgPickFact(){
  if(!CG||!CG.facts||!CG.facts.length) return null;
  const snap=CG._colorN||0;
  if(CG._factSnap!=null && snap-CG._factSnap<3) return null;   // too soon
  const avail=CG.facts.filter(f=>!f.used);
  if(!avail.length) return null;
  const picked=avail[0];
  picked.used=true;
  CG._factSnap=snap;
  return picked.text;
}

// BIG-MOMENT presentation: classify a just-resolved play and sell it — a flashing headline + crowd reaction
function cgMoment(kind, yds){
  const off=cgUserOnO();
  const M={ TD:{label:'TOUCHDOWN!',c:'#46d39a',good:off}, INT:{label:'INTERCEPTED!!',c:'#ff5d6c',good:!off},
    FUM:{label:'FUMBLE!! IT\'S LOOSE!',c:'#ff5d6c',good:!off}, SACK:{label:'SACK!',c:'#ffb84a',good:!off},
    BIG:{label:(yds>=40?'GONE!':'BIG PLAY!'),c:'#5bbcff',good:off}, CLUTCH:{label:'MOVE THE CHAINS!',c:'#9ecbff',good:off}, STAND:{label:'4TH-DOWN STAND!',c:'#ff5d6c',good:!off} }[kind];
  if(!M) return null;
  const benef = (kind==='TD'||kind==='BIG'||kind==='CLUTCH') ? CG.poss : (CG.poss==='h'?'a':'h');
  const crowd = CG.intl ? 'The international crowd roars.' : (benef==='h' ? 'The home crowd erupts.' : 'The home crowd goes quiet.');
  return {kind, label:M.label, c:M.c, crowd, good:M.good};
}
function cgProgress(){ const total=4*900; const e=CG.q>4?total:(CG.q-1)*900+(900-CG.clock); return ENG.clamp(e/total,0,1); }
// break a final into REAL scoring plays (7=TD, 3=FG, 2=safety, 6=TD no-XP, 8=TD+2) scattered across the game,
// so the around-the-league ticker shows legitimate running scores (0,3,7,10,14…) — never a "4" or "1".
function scorePath(total){ if(total<=0) return [];
  let pts=total, ev=[]; const NR=new Set([1,2,4,5,8,11]);   // scores NOT reachable by {3,7} alone → seed one special play
  if(NR.has(pts)){ const fix = (pts===2||pts===5)?2 : (pts===8||pts===11)?8 : 6; ev.push(fix); pts-=fix; }
  while(pts>=3){ if(pts>=7 && ENG.rng()<0.62){ ev.push(7); pts-=7; } else { ev.push(3); pts-=3; } }
  if(pts>0 && ev.length) ev[ev.length-1]+=pts;   // exact sum guaranteed
  return ev.map(p=>({p, at:0.05+ENG.rng()*0.92})).sort((a,b)=>a.at-b.at); }
function cgLeagueScores(){ if(!CG.league||!CG.league.length)return []; const Q=CG.over?4:Math.min(4,Math.floor(cgProgress()*4)+1);
  return CG.league.map(g=>{ let hs=0,as=0;
    if(CG.over){ hs=g.fhs; as=g.fas; }
    else if(g.drives&&g.drives.length){ g.drives.forEach(d=>{ if(d.q<=Q){ hs=d.h; as=d.a; } }); }   // running score from the real drives played so far
    else { hs=g.fhs; as=g.fas; }
    return {home:g.home,away:g.away,hs,as,q:CG.over?'FINAL':'Q'+Q}; }); }
function cgBoxLines(t){ const lines=Object.values(CG.tally).filter(x=>t.roster.some(p=>p.id===x.p.id));
  return { QB:lines.filter(x=>x.patt).sort((a,b)=>b.pyd-a.pyd), RB:lines.filter(x=>x.ratt).sort((a,b)=>b.ryd-a.ryd),
    REC:lines.filter(x=>x.rec).sort((a,b)=>b.recyd-a.recyd), DEF:lines.filter(x=>x.tkl||x.sack||x.intc).sort((a,b)=>((b.sack||0)*3+(b.intc||0)*3+(b.tkl||0))-((a.sack||0)*3+(a.intc||0)*3+(a.tkl||0))) }; }
function cgBoxHTML(){ const BS='font-family:var(--mono);font-size:10px;letter-spacing:1px;color:var(--acc);margin:9px 0 2px', BR='display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:2px 0;border-bottom:1px solid var(--line2,#16223a)';
  const tbl=t=>{ const b=cgBoxLines(t); let h=`<div style="font-weight:700;margin:6px 0 2px">${logoTag(t,16)} ${t.city} ${t.nick}</div>`;
    const sec=(lbl,arr,fmt)=>{ if(!arr.length)return''; return `<div style="${BS}">${lbl}</div>`+arr.map(x=>`<div style="${BR}"><span class="pname" onclick="showPlayer(${x.p.id})">${x.p.name} <span class="muted">${x.p.pos}</span></span><span style="font-family:var(--mono)">${fmt(x)}</span></div>`).join(''); };
    h+=sec('PASSING',b.QB,x=>`${x.pcmp||0}/${x.patt}, ${x.pyd} yd, ${x.ptd||0} TD${x.pint?', '+x.pint+' INT':''}`);
    h+=sec('RUSHING',b.RB,x=>`${x.ratt} car, ${x.ryd} yd, ${x.rtd||0} TD`);
    h+=sec('RECEIVING',b.REC,x=>`${x.rec} rec, ${x.recyd} yd, ${x.rectd||0} TD`);
    h+=sec('DEFENSE',b.DEF,x=>`${x.tkl||0} tkl${x.sack?', '+x.sack+' sk':''}${x.intc?', '+x.intc+' INT':''}${x.pr?', '+x.pr+' pr':''}`);
    if(!b.QB.length&&!b.RB.length&&!b.REC.length&&!b.DEF.length) h+='<div class="muted" style="font-size:12px">No stats yet.</div>';
    return h; };
  return `<div class="split">${'<div>'+tbl(team(CG.away))+'</div>'}${'<div>'+tbl(team(CG.home))+'</div>'}</div>`; }
function cgBoxMiniHTML(){ const row=(name,val)=>`<div class="cg-mini-row"><span>${name}</span><b>${val}</b></div>`;
  const tbl=t=>{ const b=cgBoxLines(t); const qb=b.QB[0], rb=b.RB[0], rec=b.REC.slice(0,2);
    let h=`<div class="cg-mini-team"><div class="cg-panel-title">${t.abbr} stats</div>`;
    h+=qb?row(qb.p.last||qb.p.name,`${qb.pcmp||0}/${qb.patt||0} ${qb.pyd||0}y`):row('Passing','—');
    h+=rb?row(rb.p.last||rb.p.name,`${rb.ratt||0}-${rb.ryd||0}`):row('Rushing','—');
    h+=rec.length?rec.map(x=>row(x.p.last||x.p.name,`${x.rec||0}-${x.recyd||0}`)).join(''):row('Receiving','—');
    return h+'</div>'; };
  return `<div class="cg-mini-split">${tbl(team(CG.away))}${tbl(team(CG.home))}</div>`; }
function cgLeagueHTML(){ const ls=cgLeagueScores(); if(!ls.length)return '<div class="muted" style="font-size:12px">Exhibition game — no league slate today.</div>';
  return ls.map((g,i)=>{ const a=team(g.away),h=team(g.home),final=g.q==='FINAL',aw=g.as>=g.hs;
    const clk=final&&CG.league&&CG.league[i]&&CG.league[i].box;   // box score available once the game is final
    return `<div ${clk?`onclick="cgLeagueBox(${i})" title="View box score"`:''} style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px;border-bottom:1px solid var(--line2,#16223a);font-size:13px${clk?';cursor:pointer':''}">
      <span style="flex:1">${logoTag(a,16)} ${a.abbr} <b style="${final&&!aw?'opacity:.5':''}">${g.as}</b></span>
      <span class="muted" style="font-size:10px;width:42px;text-align:center">${final?'<span class="acc">FINAL</span>':g.q}</span>
      <span style="flex:1;text-align:right"><b style="${final&&aw?'opacity:.5':''}">${g.hs}</b> ${h.abbr} ${logoTag(h,16)}</span></div>`; }).join(''); }

// click a FINAL around-the-league game to see its box score (real simmed stat lines)
window.cgLeagueBox=function(i){ const g=CG&&CG.league&&CG.league[i]; if(!g||!g.box)return;
  const a=team(g.away),h=team(g.home);
  closeOvl(); const ov=el('div'); ov.id='ovl'; ov.onclick=e=>{ if(e.target.id==='ovl')closeOvl(); };
  const box=el('div','card'); box.style.cssText='max-width:680px;width:94%;max-height:84vh;overflow:auto';
  const won=side=>side==='a'?g.fas>=g.fhs:g.fhs>g.fas;
  const col=(t,bx,win)=>{ const lines=(bx.lines||[]).slice().sort((x,y)=>(y.fp||0)-(x.fp||0));
    return `<div style="flex:1;min-width:260px">
      <div class="row" style="gap:8px;align-items:center;margin-bottom:6px">${logoTag(t,22)}<b>${esc(t.abbr)}</b>
        <b style="margin-left:auto;font-size:18px;${win?'':'opacity:.55'}">${bx.pts}</b></div>
      ${lines.map(l=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--line2,#16223a)">
        <span><span class="tag" style="font-size:9px">${l.pos}</span> ${esc(l.name)}${l.key?' <span class="acc">★</span>':''}</span>
        <span class="muted" style="text-align:right">${esc(l.stat)}</span></div>`).join('')}</div>`; };
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center">
      <h2 style="margin:0;font-size:17px">${esc(a.abbr)} ${g.fas} — ${g.fhs} ${esc(h.abbr)} <span class="acc" style="font-size:11px">FINAL</span></h2>
      <button class="btn sec" id="bxX">✕</button></div>
    <div class="row" style="gap:18px;align-items:flex-start;margin-top:10px;flex-wrap:wrap">
      ${col(a,g.box.away,won('a'))}${col(h,g.box.home,won('h'))}</div>`;
  ov.appendChild(box); document.body.appendChild(ov);
  box.querySelector('#bxX').onclick=closeOvl;
};

// the X-and-O field: offense (O), defense (X) and the ball; static play tableau.
function cgFieldHTML(){
  const offT=cgTeam(CG.poss), defT=cgTeam(CG.poss==='h'?'a':'h');
  const an=CG._anim||{}; const from=(an.from!=null?an.from:CG.ballOn), to=(an.to!=null?an.to:from), isPass=!!an.isPass;
  const map=p=>9+(ENG.clamp(p,2,98)/100)*82;   // offense attacks RIGHT
  const los=map(from), end=map(to), rng=ENG.rng, ri=ENG.ri, cl=(v)=>ENG.clamp(v,5,95);
  const sack=isPass&&to<from, incomp=isPass&&to===from, comp=isPass&&to>from, run=!isPass;
  const offC='#eef3fa', defC=(defT.pri && defT.pri!=='#101010'?defT.pri:'#cf2e3f');
  const marks=[]; const add=(kind,path,lab)=>marks.push({kind,path,lab});   // path=[[l,t],…]; [0]=snap spot; lab=position
  // ---- OFFENSE: a real formation (5 OL, QB shotgun, RB offset, X/slot/TE/Z) ----
  ['LT','LG','C','RG','RT'].forEach((lab,i)=>{ const t=38+i*6; add('o',[[los-1.5,t],[run?los+2:los-0.3,t]],lab); });
  add('o', run?[[los-6,50],[los-4,50]] : sack?[[los-6,50],[los-9,50],[end,52]] : [[los-6,50],[los-9.5,50]], 'QB');
  const hole=run?cl(42+ri(-6,20)):50;
  add('o', run?[[los-8.5,44],[los-2,46],[Math.max(los+2,end-6),hole],[end,hole]] : [[los-8.5,44],[los-4,49]], 'RB');
  const recv=[{t:9,lab:'WR'},{t:24,lab:'SL'},{t:67,lab:'TE'},{t:91,lab:'WR'}];
  const tgt=comp?ri(0,3):-1; let catchPt=[end,50];
  recv.forEach((w,i)=>{ if(i===tgt){ const ct=cl(w.t+ri(-12,12)); catchPt=[end,ct]; add('o',[[los-0.5,w.t],[los+10,w.t],[end,ct]],w.lab); }
    else { add('o', rng()<0.5?[[los-0.5,w.t],[los+14,w.t],[end+2,w.t]]:[[los-0.5,w.t],[los+8,w.t],[los+11,cl(w.t+ri(-14,14))]], w.lab); } });
  // ---- DEFENSE: 4 D-line, 3 LB, 2 CB on the WRs, 2 deep S ----
  ['LE','DT','DT','RE'].forEach((lab,i)=>{ const t=41+i*7; add('x', sack?[[los+2,t],[los-5,cl(48+ri(-6,6))]]:run?[[los+2,t],[los-0.4,t]]:[[los+2,t],[los-2.5,t]],lab); });
  ['LB','MLB','LB'].forEach((lab,i)=>{ const t=36+i*14; add('x', run?[[los+7,t],[Math.max(los+1,end-4),cl(t+ri(-7,7))]]:[[los+7,t],[los+5.5,t]],lab); });
  [11,89].forEach(t=>{ const p=[[los+4,t],[los+9,t]]; if(comp) p.push([catchPt[0]-2,cl(catchPt[1]+ri(-4,4))]); add('x',p,'CB'); });
  [38,62].forEach(t=>{ const p=[[los+14,t],[los+13,t]]; if(comp) p.push([catchPt[0]+2,cl(catchPt[1]+ri(-5,5))]); add('x',p,'S'); });
  // ---- BALL ----
  if(run) add('ball',[[los,50],[Math.max(los+2,end-6),hole],[end,hole]]);
  else if(sack) add('ball',[[los-6,50],[end,52]]);
  else if(incomp) add('ball',[[los-6,50],[end+(rng()<.5?7:-7),cl(ri(10,90))]]);
  else add('ball',[[los-6,50],catchPt]);
  // ---- render ----
  let h=`<div id="cgfield" style="position:relative;height:212px;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:repeating-linear-gradient(90deg,#0d401f 0,#0d401f 9.6%,#11491f 9.6%,#11491f 19.2%);margin-bottom:10px">`;
  h+=`<div style="position:absolute;left:0;top:0;bottom:0;width:9%;background:${(offT.pri&&offT.pri!=='#101010'?offT.pri:'#2a3550')};opacity:.6;display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-size:9px;font-family:var(--mono);writing-mode:vertical-rl;letter-spacing:2px">${offT.abbr}</span></div>`;
  h+=`<div style="position:absolute;right:0;top:0;bottom:0;width:9%;background:${defC};opacity:.6;display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-size:9px;font-family:var(--mono);writing-mode:vertical-rl;letter-spacing:2px">${defT.abbr}</span></div>`;
	  for(let x=10;x<100;x+=10) h+=`<div style="position:absolute;left:${map(x)}%;top:0;bottom:0;width:${x===50?2:1}px;background:rgba(255,255,255,.13)"></div>`;
	  for(let x=20;x<100;x+=20) h+=`<div style="position:absolute;left:${map(x)}%;bottom:8px;color:rgba(255,255,255,.22);font-family:var(--mono);font-size:13px;font-weight:800;transform:translateX(-50%)">${x<=50?x:100-x}</div>`;
	  h+=`<div style="position:absolute;left:${los}%;top:0;bottom:0;width:2px;background:rgba(255,255,255,.6)"></div>`;   // line of scrimmage
	  const fdLine=map(CG.ballOn+CG.toGo); h+=`<div style="position:absolute;left:${fdLine}%;top:0;bottom:0;width:3px;background:#ffd24a;box-shadow:0 0 6px #ffd24a"></div>`;   // first-down marker
	  h+=`<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none">`;
	  marks.filter(mk=>mk.kind==='o'&&mk.path.length>1&& !['LT','LG','C','RG','RT','QB'].includes(mk.lab)).forEach(mk=>{ h+=`<polyline points="${mk.path.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="rgba(238,243,250,.48)" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`; });
	  marks.filter(mk=>mk.kind==='x'&&mk.path.length>1&&['CB','S','LB','MLB'].includes(mk.lab)).slice(0,5).forEach(mk=>{ h+=`<polyline points="${mk.path.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="rgba(255,100,112,.34)" stroke-width=".55" stroke-dasharray="1.5 1.8" stroke-linecap="round" stroke-linejoin="round"/>`; });
	  h+=`</svg>`;
	  marks.forEach(mk=>{ const p0=mk.path[Math.max(0,mk.path.length-1)], pd=` data-path='${JSON.stringify(mk.path)}'`;
    if(mk.kind==='ball') h+=`<div class="cgmk"${pd} style="position:absolute;left:${p0[0]}%;top:${p0[1]}%;transform:translate(-50%,-50%);font-size:14px;z-index:7;filter:drop-shadow(0 1px 2px #000)">🏈</div>`;
    else { const isO=mk.kind==='o'; h+=`<div class="cgmk"${pd} style="position:absolute;left:${p0[0]}%;top:${p0[1]}%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:${isO?'50%':'4px'};background:${isO?offC:defC};border:1.5px solid ${isO?'#16202e':'#fff'};box-shadow:0 1px 3px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;font-family:var(--mono);color:${isO?'#16202e':'#fff'};z-index:${isO?5:4}">${mk.lab||''}</div>`; } });
  h+=`</div>`; return h;
}
function startCoachGame(homeAb, awayAb, opts){
  try{ resyncDepth(ut()); applyHurtFlags(team(homeAb)); applyHurtFlags(team(awayAb)); }catch(e){}   // gut-it-out players carry a reduced-effectiveness penalty
  { const _h=team(homeAb),_a=team(awayAb); if(_h)_h._hurryGas=0; if(_a)_a._hurryGas=0; }   // fresh legs each game
  if(FSIM)FSIM.stop();
  if(typeof AI!=='undefined' && AI.warm) AI.warm();   // preload the local model so the first AI color line isn't a cold start
  const userSide = homeAb===USER?'h':'a';
  const intl=gameIntl(homeAb,awayAb,G.week);
  const coinCall=ENG.rng()<0.5?'heads':'tails', coinFlip=ENG.rng()<0.5?'heads':'tails', coinWinner=coinCall===coinFlip?'a':'h';
	  CG={ active:true, home:homeAb, away:awayAb, userSide, hs:0,as:0,
	    poss: coinWinner, ballOn:25, down:1, toGo:10, q:1, clock:900, mom:0,
	    to:{h:3,a:3}, hurry:false, tempo:'normal', simpleSheet:!(typeof localStorage!=='undefined'&&localStorage.getItem('fps_coachedonce')), tally:{}, log:[], radio:[], opts:opts||{}, pat:null, over:false, lastText:'Pregame coin toss at midfield.', tab:'log',
    slot:(opts&&opts.week)?userGameSlot():null, weather: intl? intl.wx : gameWeather(homeAb, G.week), rivalry:rivalryName(homeAb,awayAb), intl:intl||null, _drive:null, _lastDrive:null };
  if(typeof TTS!=='undefined'&&TTS.setTeams) TTS.setTeams(G.teams);   // give the booth abbr→city so it says 'Buffalo' not 'B-U-F'
  if(typeof TTS!=='undefined'&&TTS.enabled&&TTS.enabled()) cgCrowdBed(true);   // stadium atmosphere under the broadcast
  cgComputeEmotion(); CG._prep=cgPregamePrep(team(homeAb),team(awayAb)); cgPregameAI();   // the booth's prepared sheet + one richer pre-game AI call (latency-free here)
  cgGenerateFacts();   // async, non-blocking — procedural baseline is instant; LLM facts arrive shortly after
  CG.coin={pending:true, caller:'a', call:coinCall, flip:coinFlip, winner:coinWinner, aiChoice:coinWinner===userSide?null:(ENG.rng()<0.72?'defer':'receive')};
  CG.gameplan = { runPass: 0.5, featureRB: false, attackWR1: false, protectPass: false, spyQB: false, tempo:'normal' }; // user gameplan biases the call sheet + resolution edges
  if(G._weekPlan && (G._weekPlan.opp===homeAb||G._weekPlan.opp===awayAb)){ const _wp=G._weekPlan;
    if(_wp.attack==='run') CG.gameplan.runPass=0.70; else if(_wp.attack==='pass') CG.gameplan.runPass=0.30;
    if(_wp.neutralize && _wp.threatId) CG.keyOn={id:_wp.threatId,type:_wp.threatType};
    if(_wp.script) CG._scriptEdge=4; }
  if(opts&&opts.week){ CG.league=(G.schedule[G.week]||[]).filter(g=>g.home!==USER&&g.away!==USER&&team(g.home)&&team(g.away))
    .map(g=>{ const r=ENG.simGame(team(g.home),team(g.away),G.rules);
      let drives=[]; try{ drives=ENG.playByPlay(team(g.home),team(g.away),r); }catch(e){}   // REAL drive-by-drive — the ticker follows actual scoring drives
      return {home:g.home,away:g.away,fhs:r.hs,fas:r.as,drives,box:r.box}; }); }
  CG.log.unshift(`Coin toss: ${cgTeam('a').abbr} call ${coinCall.toUpperCase()}; it lands ${coinFlip.toUpperCase()}. ${cgTeam(coinWinner).abbr} win the toss.`);
  CG.analyst=ENG.pick(ANALYSTS); CG.lastColor=ENG.pick([`Big one here — the building is ELECTRIC. Let's go to work.`,`Love this matchup. Whoever wins the line of scrimmage wins the game.`,`Strap in, folks. This one's got a little juice to it.`]);
  cgCommitRadio('Pregame');
  if(window.VOICES&&VOICES.sideline){ try{ CG._sideline=VOICES.sideline(team(homeAb),team(awayAb),null); }catch(e){} }   // greet from the sideline at kickoff
  VIEW='field'; render();
}
function cgClockStr(v){ const s=Math.max(0,(v&&v.clock!=null)?v.clock:CG.clock); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function cgWinProb(v){ // crude but fun
  const S=v||CG, diff=(CG.userSide==='h'?S.hs-S.as:S.as-S.hs);
  const left=(4-S.q)*900+S.clock; const t=left/3600;
  let wp=50 + diff*2.4 - (S.poss===CG.userSide?0:3)*t + (diff>0?(1-t)*10:diff<0?-(1-t)*10:0);
  return Math.round(ENG.clamp(wp,1,99));
}
function cgResetPlayClock(){ if(!CG) return; CG.playClock=22; CG._playClockStart=Date.now(); CG._clockAutoFired=false; }
function cgKeyOnHTML(){ if(cgUserOnO()) return ''; const offT=cgTeam(CG.poss), tp=offT&&cgTop(offT); if(!tp) return '';
  const rb=tp.rb, wr=(tp.receivers||[])[0], qb=tp.qb, cur=CG.keyOn, opts=[];
  if(wr) opts.push({id:wr.id,t:'pass',l:`🎯 Bracket ${wr.last}`}); if(rb) opts.push({id:rb.id,t:'run',l:`📦 Key ${rb.last}`}); if(qb) opts.push({id:qb.id,t:'qb',l:`👁 Spy ${qb.last}`});
  if(!opts.length) return '';
  return `<div class="cg-keyon"><span class="cg-keyon-ttl">KEY ON</span>`+opts.map(o=>`<button class="btn ${cur&&cur.id===o.id?'':'sec'}" data-keyon="${o.id}~${o.t}">${o.l}</button>`).join('')+`<button class="btn ${cur?'sec':''}" data-keyon="">None</button></div>`; }
function cgPlayClockLeft(){ if(!CG) return 0; if(!CG._playClockStart) cgResetPlayClock(); const max=CG.playClock||22; return ENG.clamp(Math.ceil((max*1000-(Date.now()-CG._playClockStart))/1000),0,max); }
function cgWirePlayClock(){
  const root=$('#cgplayclock'); if(!root||!CG||CG.over||CG.pat||CG._scoreView||CG.coin&&CG.coin.pending) return;
  if(window._cgPlayClockTimer) clearInterval(window._cgPlayClockTimer);
  const tick=()=>{
    if(!CG||!root.isConnected){ clearInterval(window._cgPlayClockTimer); window._cgPlayClockTimer=null; return; }
    const left=cgPlayClockLeft(), max=CG.playClock||40, pct=Math.max(0,left/max*100);
    const n=root.querySelector('.cg-pc-num'), b=root.querySelector('.cg-pc-bar>i');
    if(n) n.textContent=String(left).padStart(2,'0');
    if(b){ b.style.width=pct+'%'; b.style.background=left<=5?'var(--bad)':left<=10?'var(--acc2)':'var(--good)'; }
    root.classList.toggle('hot',left<=10);
    if(left<=0 && !CG._clockAutoFired){
      CG._clockAutoFired=true;
      const btn=document.querySelector('.playbtn[data-k]');
      if(btn){ CG.log.unshift('Play clock expired — headset auto-sent the suggested call.'); btn.click(); }
    }
  };
  tick(); window._cgPlayClockTimer=setInterval(tick,250);
}
function cgPlayTabs(uOnO){
  const tabs=uOnO?[['suggest',(CG&&CG.down>=4?'Go For It':'Suggested')],['run','Run'],['quick','Quick'],['shot','Shot']]:[['suggest','Suggested'],['base','Sound'],['pressure','Pressure'],['coverage','Coverage'],['run','Run']];
  if(!tabs.some(t=>t[0]===CG.sheetCat)) CG.sheetCat='suggest';
  return tabs;
}
function cgFourthInfo(){
  if(!CG||CG.down<4) return {active:false};
  const fgDist=100-CG.ballOn+17, margin=CG.userSide==='h'?CG.hs-CG.as:CG.as-CG.hs;
  return {active:true,fgDist,short:CG.toGo<=2,medium:CG.toGo>=3&&CG.toGo<=6,long:CG.toGo>=7,veryLong:CG.toGo>=14,desperate:CG.q>=4&&margin<=-4};
}
function cgFourthPreferredKeys(uOnO){
  if(!uOnO||!CG||CG.down<4) return [];
  if(CG.toGo<=2) return ['sneak','jumbo_power','jumbo_blast','inside','power','qb_power','jumbo_leak','pa'];
  if(CG.toGo<=6) return ['short','mesh','drive','levels','hands_choice','hands_stick','rpo_bubble','slants','pa','jumbo_leak'];
  if(CG.toGo<=13) return ['levels','drive','mesh','hoss','dagger','y_cross','deep_over','switch','screen','wheel'];
  return ['dagger','y_cross','deep_over','switch','mills','deep','levels','drive','hoss','wheel'];
}
function cgFourthPreferredPlays(all,uOnO){
  const keys=cgFourthPreferredKeys(uOnO);
  if(!keys.length) return [];
  const by=Object.fromEntries((all||[]).map(p=>[p.k,p]));
  const rows=keys.map(k=>by[k]).filter(Boolean);
  return rows.length?rows:[];
}
function cgFourthBadRunSheet(uOnO){ return !!(uOnO&&CG&&CG.down>=4&&CG.toGo>=7&&CG.sheetCat==='run'); }
function cgVisiblePlays(all,uOnO){
  const cat=CG.sheetCat||'suggest';
  let rows=all.slice();
  if(uOnO&&CG.down>=4&&CG.toGo>=5){
    rows=cgFourthPreferredPlays(all,uOnO);
    if(rows.length) return rows.slice().sort((a,b)=>cgSuggestScore(b,uOnO)-cgSuggestScore(a,uOnO)).slice(0,8);
  }
  if(cat!=='suggest'){
    if(uOnO){
      rows=all.filter(p=> cat==='run'?p.type==='run' : cat==='quick'?(p.family==='quick'||p.profile==='screen') : cat==='shot'?(p.family==='shot'||p.profile==='pa'||p.profile==='deep') : true);
    } else {
      rows=all.filter(p=> cat==='base'?['base','spy'].includes(p.profile) : cat==='pressure'?p.profile==='blitz' : cat==='coverage'?['cover','press'].includes(p.profile) : cat==='run'?p.profile==='run_stop' : true);
    }
  }
  if(rows.length<3) rows=all.slice();
  if(cat==='suggest') rows=rows.slice().sort((a,b)=>cgSuggestScore(b,uOnO)-cgSuggestScore(a,uOnO));
  return rows.slice(0,9);
}
function cgPlayFamilyKey(p,uOnO){ return uOnO?(p.family||p.profile||p.type||p.k):(p.profile||p.shell||p.k); }
function cgSuggestScore(p,uOnO){
  if(!CG||!p) return 0;
  let s=0;
  if(uOnO){
    if(CG.down>=4){
      const k=p.k, sticks=['short','mesh','drive','levels','hoss','hands_choice','hands_stick'], shots=['dagger','y_cross','deep_over','switch','mills','deep','wheel'], close=['sneak','jumbo_power','jumbo_blast','inside','power','qb_power','jumbo_leak'];
      if(CG.toGo<=2){
        if(close.includes(k)||p.pkg==='jumbo'||p.type==='run') s+=24;
        if(p.profile==='pa') s+=8;
      } else if(CG.toGo<=6){
        if(sticks.includes(k)) s+=24;
        if(['pa','deep'].includes(p.profile)) s+=10;
        if(p.type==='run') s-=18;
      } else if(CG.toGo<=13){
        if(sticks.includes(k)||shots.includes(k)) s+=24;
        if(p.profile==='screen') s+=2;
        if(p.type==='run') s-=34;
      } else {
        if(shots.includes(k)) s+=30;
        if(sticks.includes(k)) s+=15;
        if(p.profile==='screen') s-=8;
        if(p.type==='run') s-=48;
      }
    }
    if(CG.toGo<=2 && (p.pkg==='jumbo'||p.type==='run')) s+=9;
    if(CG.down>=3 && CG.toGo>=7 && ['quick','screen','pa','deep'].includes(p.profile)) s+=6;
    if(CG.ballOn>=80 && ['pa','quick','inside'].includes(p.profile)) s+=5;
  } else {
    if(CG.toGo<=2 && ['run_stop','blitz'].includes(p.profile)) s+=9;
    if(CG.down>=3 && CG.toGo>=7 && ['cover','blitz'].includes(p.profile)) s+=6;
    if(CG.ballOn>=80 && ['press','run_stop','cover'].includes(p.profile)) s+=5;
  }
  const fam=cgPlayFamilyKey(p,uOnO), recent=(uOnO?(CG._ucalls||[]):(CG._udcalls||[])).slice(-3);
  s-=recent.filter(x=>x===fam).length*5;
  const cold=uOnO?(CG._coldOffKeys||[]):(CG._coldDefKeys||[]);
  s-=cold.filter(x=>x===p.k).length*12;
  s+=(p.w||0);
  return s;
}
function cgSituationName(){
  if(!CG) return 'Opening call';
  if(CG.down>=4) return `Fourth down: 4th & ${CG.toGo}`;
  if(CG.down>=3) return `Money down: ${CG.down} & ${CG.toGo}`;
  if(CG.ballOn>=80) return 'Red zone';
  if(CG.q>=4 && Math.abs(CG.hs-CG.as)<=7) return 'Late-game leverage';
  if(CG.toGo<=2) return 'Short-yardage';
  return 'Early-down chess';
}
function cgOpponentHint(uOnO){
  if(!CG) return '';
  if(uOnO){
    if(CG.down>=4&&CG.toGo>=14) return 'Do not call a give-up run unless you are conceding. You need protection, a route at the sticks, and a bailout answer.';
    if(CG.down>=4&&CG.toGo>=7) return 'Conversion sheet: protect first, attack the marker, and make the throw past the sticks.';
    if(CG.down>=4) return 'Short fourth down. Power is live, but the defense is selling out for the run.';
    if(CG.down>=3 && CG.toGo>=7) return 'Expect coverage or simulated pressure. You need the sticks, not a hero ball.';
    if(CG.toGo<=2) return 'Expect bodies in the box. A heavy run is safe; play-action is the shot.';
    if(CG.ballOn>=80) return 'Space is tight. Use quick winners, leverage, or a heavy misdirection.';
    return 'The defense is reading tendency. Mix run, quick game, and shots before they key you.';
  }
  if(CG.down>=3 && CG.toGo>=7) return 'The offense wants a clean pocket and a route at the marker. Make the QB process.';
  if(CG.toGo<=2) return 'Expect downhill run or a quick answer. Fit the run first, then rally.';
  if(CG.ballOn>=80) return 'Condensed field. Take away the first read and force a contested throw.';
  return 'Win early down without selling out. Keep the offense behind schedule.';
}
function cgRiskText(p,uOnO){
  const profile=p&&p.profile||'base';
  if(uOnO){
    if(CG&&CG.down>=4&&CG.toGo>=7&&p&&p.type==='run') return 'Concession risk - likely turnover on downs';
    if(CG&&CG.down>=4&&CG.toGo>=7&&p&&p.type==='pass') return 'Conversion call - must reach the sticks';
    if(CG&&CG.down>=4&&CG.toGo<=2&&p&&p.pkg==='jumbo') return 'Short-yardage answer, sells out protection';
    if(profile==='deep'||profile==='pa') return 'Higher reward, sack/turnover risk';
    if(profile==='screen'||profile==='quick'||p&&p.pkg==='hands') return 'Low risk, smaller explosives';
    if(p&&p.pkg==='jumbo') return 'Strong short-yardage, predictable if spammed';
    return p&&p.type==='run'?'Clock-friendly, can get stuffed':'Balanced risk';
  }
  if(profile==='blitz') return 'Pressure upside, explosive risk';
  if(profile==='cover') return 'Limits shots, softer versus run';
  if(profile==='run_stop') return 'Kills runs, vulnerable to play-action';
  if(profile==='press') return 'Disrupts timing, risky if beaten';
  return 'Sound call, lower chaos';
}
function cgPlayReason(p,uOnO){
  if(!p) return 'Coordinator wants the safest call for the situation.';
  if(uOnO){
    if(CG.down>=4&&CG.toGo>=14&&p.type==='run') return 'This is a concession call unless the plan is punt-field-position math.';
    if(CG.down>=4&&CG.toGo>=14) return 'Long fourth down: buy time and throw beyond the marker, with a defined outlet if pressure wins.';
    if(CG.down>=4&&CG.toGo>=7&&p.type==='run') return 'Bad math here. The room only accepts this if you are conceding the drive.';
    if(CG.down>=4&&CG.toGo>=7) return 'Designed for the sticks. Protection and route depth matter more than style points.';
    if(CG.down>=4&&CG.toGo<=2&&(p.pkg==='jumbo'||p.type==='run')) return 'Short-yardage math says trust the heavy bodies and win the line.';
    if(CG.toGo<=2 && (p.pkg==='jumbo'||p.type==='run')) return 'Best fit for short-yardage math.';
    if(CG.down>=3 && CG.toGo>=7 && (p.profile==='quick'||p.profile==='screen')) return 'Gets the ball out before pressure wins.';
    if(CG.down>=3 && CG.toGo>=7 && (p.profile==='deep'||p.profile==='pa')) return 'Attacks the sticks, but protection must hold.';
    if(CG.ballOn>=80) return 'Red-zone spacing is tight; this gives the QB a defined answer.';
    return 'Keeps the defense from sitting on your last tendency.';
  }
  if(CG.toGo<=2 && p.profile==='run_stop') return 'The front is built to close interior gaps.';
  if(CG.down>=3 && CG.toGo>=7 && p.profile==='cover') return 'Forces a throw short of the marker.';
  if(CG.down>=3 && CG.toGo>=7 && p.profile==='blitz') return 'Speeds up the QB before deep routes develop.';
  if(CG.ballOn>=80) return 'Red-zone call: deny easy windows and tackle immediately.';
  return 'A balanced answer for down, distance, and field position.';
}
function cgMatchupText(uOnO){
  const user=cgTeam(CG.userSide);
  if(!user) return '';
  if(uOnO){
    const top=cgTop(user), p=(CG.toGo<=2&&top.rb)||top.wr1||top.te1||top.qb;
    return p?`${p.last||p.name} is the matchup to feature.`:'Use your best skill player.';
  }
  const d=cgTopD(user), p=CG.down>=3?d.edge:(CG.toGo<=2?d.lb:d.db);
  return p?`${p.last||p.name} is your key defender on this snap.`:'Win with your best defender.';
}
function cgOffTendencyLabel(k){
  const p=OFF_META[k]||{};
  if(p.pkg==='jumbo') return 'jumbo';
  if(p.pkg==='hands') return 'hands';
  if(p.profile==='screen') return 'screen';
  if(p.profile==='pa') return 'play-action';
  if(p.profile==='deep') return 'shot';
  if(p.family==='run') return p.profile==='outside'?'wide run':'inside run';
  if(p.family==='quick') return 'quick';
  return p.label||k||'offense';
}
function cgDefTendencyLabel(k){
  const p=DEF_META[k]||{}, prof=p.profile||k;
  return prof==='blitz'?'pressure':prof==='run_stop'?'run fit':prof==='press'?'press':prof==='cover'?'coverage':prof==='spy'?'spy':'base';
}
function cgOwnTendencyLabel(v,uOnO){
  if(!v) return '';
  if(uOnO) return v==='shot'?'shots':v==='quick'?'quick game':v==='run'?'runs':v;
  return v==='blitz'?'pressure':v==='run_stop'?'run fits':v==='cover'?'coverage':v==='press'?'press':v==='spy'?'spy':v;
}
function cgPushRecent(name, value, max){
  if(!CG||!value) return;
  CG[name]=CG[name]||[];
  CG[name].push(value);
  while(CG[name].length>(max||6)) CG[name].shift();
}
function cgTrendSummary(vals, labelFn){
  vals=(vals||[]).slice(-3);
  if(!vals.length) return 'no live tendency yet';
  return vals.map(x=>labelFn?labelFn(x):x).join(', ');
}
function cgCountRecent(vals, wanted){
  vals=(vals||[]).slice(-5);
  return vals.filter(x=>Array.isArray(wanted)?wanted.includes(x):x===wanted).length;
}
function cgPlayCounterScore(p,uOnO,safe){
  if(!p) return -999;
  let s=cgSuggestScore(p,uOnO);
  const own=(uOnO?(CG._ucalls||[]):(CG._udcalls||[])).slice(-4);
  const oppDef=(CG._oppDefCalls||[]).slice(-3), oppOff=(CG._oppOffCalls||[]).slice(-3);
  if(safe && cgPlayFamilyKey(p,uOnO)===cgPlayFamilyKey(safe,uOnO)) s-=8;
  const cold=uOnO?(CG._coldOffKeys||[]):(CG._coldDefKeys||[]);
  s-=cold.filter(x=>x===p.k).length*14;
  s-=own.filter(x=>x===cgPlayFamilyKey(p,uOnO)).length*4;
  if(uOnO){
    if(oppDef.includes('blitz') && ['short','screen'].includes(p.profile)) s+=10;
    if(oppDef.includes('run_stop') && ['pa','deep'].includes(p.profile)) s+=9;
    if(oppDef.includes('cover') && (p.type==='run'||p.profile==='short')) s+=8;
    if(oppDef.includes('press') && ['pa','deep'].includes(p.profile)) s+=7;
    if(CG.down>=3 && CG.toGo>=6 && (p.profile==='short'||p.profile==='screen')) s+=3;
  } else {
    if(oppOff.some(x=>/run/.test(x)) && ['run_stop','blitz'].includes(p.profile)) s+=10;
    if(oppOff.some(x=>/quick|screen|hands/.test(x)) && ['press','base'].includes(p.profile)) s+=9;
    if(oppOff.some(x=>/shot|play-action|jumbo/.test(x)) && p.profile==='cover') s+=10;
    if(CG.down>=3 && CG.toGo>=6 && ['cover','blitz'].includes(p.profile)) s+=4;
  }
  return s;
}
function cgCoachPlan(uOnO, visiblePlays){
  const plays=visiblePlays||[], safe=plays[0]||null;
  let counter=plays.filter(p=>p&&(!safe||p.k!==safe.k)).sort((a,b)=>cgPlayCounterScore(b,uOnO,safe)-cgPlayCounterScore(a,uOnO,safe))[0]||plays[1]||safe;
  const oppTrend=uOnO?cgTrendSummary(CG._oppDefCalls,cgDefTendencyLabel):cgTrendSummary(CG._oppOffCalls,x=>x);
  const ownTrend=uOnO?cgTrendSummary(CG._ucalls,x=>cgOwnTendencyLabel(x,true)):cgTrendSummary(CG._udcalls,x=>cgOwnTendencyLabel(x,false));
  const safeReason=safe?cgPlayReason(safe,uOnO):'Keep the call sheet on schedule.';
  let counterReason=counter?cgPlayReason(counter,uOnO):'Change the picture before they key you.';
  if(counter){
    const safeFam=safe?cgPlayFamilyKey(safe,uOnO):'', counterFam=cgPlayFamilyKey(counter,uOnO);
    const hasOppLooks=(uOnO?(CG._oppDefCalls||[]):(CG._oppOffCalls||[])).length>0;
    if(!hasOppLooks && safeFam && counterFam && safeFam!==counterFam) counterReason=`Changeup from ${cgOwnTendencyLabel(safeFam,uOnO)} to ${cgOwnTendencyLabel(counterFam,uOnO)} so they cannot key your first answer.`;
    if(uOnO){
      const looks=(CG._oppDefCalls||[]).slice(-3), last=looks[looks.length-1], count=looks.filter(x=>x===last).length;
      if(last==='blitz') counterReason=`They have pressured ${count} of the last ${looks.length}. ${['short','screen'].includes(counter.profile)?'Use the hot answer before the rush wins.':'Punish the heat, but protect the QB.'}`;
      else if(last==='run_stop') counterReason=`They are fitting the run hard. ${['pa','deep'].includes(counter.profile)?'Sell run and throw behind the second level.':'Make them defend grass outside the box.'}`;
      else if(last==='cover') counterReason=`They are protecting deep grass. ${counter.type==='run'?'Run at the lighter box.':'Take the underneath answer and stay ahead.'}`;
      else if(last==='press') counterReason=`They have pressed ${count} of the last ${looks.length}. Use a release, switch, screen, or shot before the jam takes over.`;
    } else {
      const looks=(CG._oppOffCalls||[]).slice(-3), last=looks[looks.length-1], count=looks.filter(x=>x===last).length;
      if(/run/.test(last||'')) counterReason=`They have run ${count} of the last ${looks.length}. ${counter.profile==='run_stop'?'Add a hat and force long yardage.':'Fit first, rally second.'}`;
      else if(/quick|screen|hands/.test(last||'')) counterReason=`They are throwing rhythm. ${counter.profile==='press'?'Jam the release and make the QB hold it.':'Close windows and tackle short of the sticks.'}`;
      else if(/shot|play-action/.test(last||'')) counterReason=`They have shot-play intent. ${counter.profile==='cover'?'Put the roof back on the coverage.':'Do not give them a free explosive.'}`;
    }
  }
  const lead=cgStaffLead(uOnO);
  const coldPen=safe&&((uOnO?(CG._coldOffKeys||[]):(CG._coldDefKeys||[])).includes(safe.k))?14:0;
  const confidence=Math.round(ENG.clamp(55+(lead.ovr-70)*0.7+(safe?cgSuggestScore(safe,uOnO):0)*0.35-coldPen,35,92));
  return {safe,counter,oppTrend,ownTrend,safeReason,counterReason,confidence,lead};
}
function cgStakesText(uOnO, plan){
  const pressure=cgPressureScore(), d=CG._drive;
  if(CG.down>=4) return 'Fourth down. One call swings field position or the scoreboard.';
  if(CG.down>=3) return uOnO?'Money down: get the sticks or start the punt/FG math.':'Money down: force the throw short and get off the field.';
  if(CG.ballOn>=80) return uOnO?'Red zone: explosives shrink, execution has to be clean.':'Red zone: deny the first read and make them earn every yard.';
  if(d && d.plays>=7) return uOnO?'Long drive. Their front is getting tired, but one mistake kills it.':'Long drive allowed. Fatigue is showing; change the picture now.';
  if(pressure>=78) return 'High-leverage snap. The owner, crowd, and booth all feel it.';
  return uOnO?'Script snap: build tendency, then break it.':'Early chess: win the down without giving up the cheap counter.';
}
function cgTendencyStripHTML(uOnO, plan){
  plan=plan||cgCoachPlan(uOnO,[]);
  const you=uOnO?`You last 3: ${plan.ownTrend}`:`You last 3: ${plan.ownTrend}`;
  const them=uOnO?`Defense last 3: ${plan.oppTrend}`:`Offense last 3: ${plan.oppTrend}`;
  const risk=plan.counter?cgRiskText(plan.counter,uOnO):'Balanced';
  return `<section class="cg-tendency-strip">
    <div><span>Opponent tendency</span><b>${esc(them)}</b></div>
    <div><span>Your tendency</span><b>${esc(you)}</b></div>
    <div><span>Stakes</span><b>${esc(cgStakesText(uOnO,plan))}</b><em>${esc(risk)}</em></div>
  </section>`;
}
function cgDefFourthAlertHTML(){
  if(!CG||cgUserOnO()||CG.down<4) return '';
  const dist=100-CG.ballOn+17, off=cgTeam(CG.poss), margin=(CG.poss==='h'?CG.hs-CG.as:CG.as-CG.hs), desperate=margin<=-9&&CG.q>=4;
  let title='Fourth-down defense', body='Watch the fake, protect the sticks, and finish the drive.';
  if(dist<=52 && CG.ballOn>=58 && !desperate){ title=`Field-goal alert (${dist} yd)`; body=`${off.abbr} are likely sending the kicker. Coach return-safe, block timing, and avoid a cheap roughing flag.`; }
  else if(CG.ballOn<58 && !desperate){ title='Punt alert'; body=`${off.abbr} are likely flipping field position. Set the return, protect the fake, and avoid giving the drive back.`; }
  else title='They may go for it';
  return `<section class="cg-special-alert"><span>Special teams / fourth down</span><b>${esc(title)}</b><em>${esc(body)}</em></section>`;
}
function cgOffFourthAdviceHTML(uOnO){
  if(!CG||!uOnO||CG.down<4) return '';
  const f=cgFourthInfo(), canKick=f.fgDist<=58, badRun=cgFourthBadRunSheet(uOnO);
  let title='Fourth-down math', body='Going for it is live, but the call must match the sticks.';
  if(CG.toGo>=14){ title='Fourth-and-forever'; body=`Punt is the normal answer${canKick?`, the ${f.fgDist}-yard field goal is a low-percentage swing`:''}. If you go, call a protected sticks/shot concept, not power run.`; }
  else if(CG.toGo>=7){ title='Go-for-it sheet'; body='Call Levels, Dagger, Y-Cross, Deep Over or a similar sticks concept. A run here is basically a concession.'; }
  else if(CG.toGo>=3){ title='Manageable fourth'; body=`Quick game, mesh, stick, or a protected shot can steal it. ${canKick?`Field goal from ${f.fgDist} is also available.`:'Punt still protects field position.'}`; }
  else { title='Short fourth'; body='Power, sneak, jumbo, or play-action are all credible. The defense will load the box.'; }
  if(badRun) body='Run tab was selected, so the headset is overriding to conversion plays. Use Run only when you are intentionally conceding or the distance is short.';
  return `<section class="cg-special-alert cg-fourth-advice"><span>${badRun?'Run tab override':'Fourth-down decision'}</span><b>${esc(title)}</b><em>${esc(body)}</em></section>`;
}
function cgStaffLead(uOnO){
  const user=cgTeam(CG.userSide); if(!user) return {name:uOnO?'OC':'DC',ovr:70};
  try{ ENG.ensureStaff(user); }catch(e){}
  const role=uOnO?'oc':'dc', st=(user.staff&&user.staff[role])||{};
  return {name:st.name||user.coach&&user.coach.name||'Coordinator',ovr:st.ovr||70,role:uOnO?'OC':'DC'};
}
function cgStaffQuote(uOnO, rec){
  const lead=cgStaffLead(uOnO), play=rec&&rec.label?rec.label:'the safe call';
  let line;
  if(uOnO){
    if(CG.down>=4) line=`${play}. Know the math: convert or own the field position.`;
    else if(CG.down>=3) line=`${play}. Get the ball out and call it for the sticks.`;
    else if(CG.toGo<=2) line=`${play}. We can bully them, but do not get predictable.`;
    else line=`${play}. Stay on script, then hit them with the counter.`;
  } else {
    if(CG.down>=4) line=`${play}. End the drive right here.`;
    else if(CG.down>=3) line=`${play}. Make the QB hold it one beat too long.`;
    else if(CG.toGo<=2) line=`${play}. Fit the run first; rally to anything quick.`;
    else line=`${play}. Win first down and put the call sheet in our hands.`;
  }
  return `${lead.role} ${lead.name}: "${line}"`;
}
function cgDriveMission(uOnO, st){
  st=st||CG;
  if(uOnO){
    if(st.ballOn<=20) return {title:'Escape the shadow',target:'Earn two first downs before a punt is acceptable.'};
    if(st.ballOn>=80) return {title:'Finish the drive',target:'Touchdown standard. Field goal is only a save.'};
    if(CG.q>=4 && (CG.userSide==='h'?CG.hs-CG.as:CG.as-CG.hs)<0) return {title:'Chase points',target:'Cross midfield fast without gifting a turnover.'};
    return {title:'Win the script',target:'Stay ahead of the chains and cross midfield.'};
  }
  if(st.ballOn>=80) return {title:'Red-zone stand',target:'Hold them to three or steal the ball.'};
  if(st.ballOn>=60) return {title:'Sudden-change defense',target:'No explosives. Force the kick decision.'};
  return {title:'Get off the field',target:'Create 3rd-and-long, then force the punt.'};
}
function cgNewDrive(side, st){
  st=st||cgSnapState();
  const uOnO=side===CG.userSide, m=cgDriveMission(uOnO,st);
  return {side,startBallOn:st.ballOn,startQ:st.q,startClock:st.clock,plays:0,yards:0,mission:m.title,target:m.target};
}
function cgEnsureDrive(){
  if(!CG||CG.coin&&CG.coin.pending) return null;
  if(!CG._drive||CG._drive.side!==CG.poss) CG._drive=cgNewDrive(CG.poss,cgSnapState());
  return CG._drive;
}
function cgDriveResult(pre, r, line){
  if(r&&r.turnover) return 'Turnover';
  if(r&&pre.ballOn+(r.yards||0)>=100) return 'Touchdown';
  if(/field goal/i.test(line||'')) return /good/i.test(line)?'Field goal':'Missed field goal';
  if(/punt/i.test(line||'')) return 'Punt';
  if(CG.poss!==pre.poss) return 'Turnover on downs';
  return 'Drive continues';
}
function cgDriveBeat(pre, r, firstDown, line, d, ended){
  if(!pre||!r||!d) return '';
  const userOnO=pre.poss===CG.userSide, y=r.yards||0, td=!r.turnover&&pre.ballOn+y>=100;
  const explosive=(r.isPass&&y>=18)||(!r.isPass&&y>=12), result=cgDriveResult(pre,r,line);
  if(td) return userOnO?'Touchdown drive. The headset got the defense guessing.':'Touchdown allowed. Reset the sideline before the next series snowballs.';
  if(r.turnover) return userOnO?'Turnover. The drive died on ball security and decision quality.':'Takeaway. That is the kind of swing that changes a quarter.';
  if(result==='Field goal') return userOnO?'Points banked. Good drive, but the red-zone standard is still six.':'Held them to three. That is a defensive win if the offense answers.';
  if(result==='Missed field goal') return userOnO?'Missed kick. Field position flips and the drive leaves empty.':'Missed kick. The stand matters because the scoreboard stayed clean.';
  if(result==='Punt') return userOnO?'Drive stalled. Next series needs a cleaner first-down answer.':'Punt forced. Field-position football is working.';
  if(result==='Turnover on downs') return userOnO?'Turnover on downs. The fourth-down call sheet needs a safer answer.':'Fourth-down stand. The sideline just stole a possession.';
  if(userOnO){
    if(firstDown&&pre.down>=3) return 'Money-down conversion. Keep the pressure on their coordinator.';
    if(explosive) return 'Explosive landed. Expect the defense to protect the deep grass next.';
    if(d.plays>=10) return 'The stadium is leaning in. Long drive, tired defense, no cheap mistake now.';
    if(d.plays>=8) return 'Long drive building. The defense is tiring, but mistakes get louder now.';
    if(pre.down>=3&&!firstDown) return 'Drive is wobbling. Punt, kick, or call your best answer.';
  } else {
    if(pre.down>=3&&!firstDown) return 'Money-down stop. Finish the sequence and get off the field.';
    if(firstDown&&pre.down>=3) return 'Third-down leak. Change the look before they repeat the answer.';
    if(explosive) return 'Explosive allowed. The next call needs a roof on the coverage.';
    if(d.plays>=10) return 'Coordinator urgency rising. The crowd can feel the defense stuck on the field.';
    if(d.plays>=8) return 'Defense has been stuck out there. Fatigue and tendency are both live now.';
  }
  if(firstDown) return userOnO?'Fresh set of downs. Now break tendency before they key it.':'First down allowed. Make the next snap ugly.';
  if(y<=2) return userOnO?'Not enough. You are drifting behind schedule.':'Schedule win. Do not let the counter hit.';
  return '';
}
function cgUpdateDrive(pre, r, firstDown, line){
  if(!CG||!pre) return null;
  let d=(CG._drive&&CG._drive.side===pre.poss)?CG._drive:cgNewDrive(pre.poss,pre);
  d.plays=(d.plays||0)+1;
  d.yards=(d.yards||0)+((r&&typeof r.yards==='number')?r.yards:0);
  if(firstDown) d.firstDowns=(d.firstDowns||0)+1;
  d.last=stripHTML(line||cgResultText(r));
  const ended=CG.poss!==pre.poss || CG.pat || CG.over || (r&&pre.ballOn+(r.yards||0)>=100);
  d.beat=cgDriveBeat(pre,r,firstDown,line,d,ended)||d.beat||'';
  if(ended){ d.result=cgDriveResult(pre,r,line); CG._lastDrive=d; CG._drive=null; }
  else CG._drive=d;
  return d;
}
function cgPressureScore(){
  if(!CG) return 40;
  const user=cgTeam(CG.userSide); if(user) ensureOwner(user);
  const diff=CG.userSide==='h'?CG.hs-CG.as:CG.as-CG.hs;
  let s=30 + (CG.down>=3?18:0) + (CG.down>=4?22:0) + (CG.ballOn>=80?12:0) + (CG.q>=4?14:0) + (diff<0?Math.min(18,-diff*2):0);
  if(user&&user.owner) s += Math.max(0,65-(user.owner.confidence||60))*0.25;
  return Math.round(ENG.clamp(s,10,99));
}
function cgPressureLabel(s){ return s>=78?'redline':s>=58?'heated':s>=38?'steady':'calm'; }
function cgSnapGrade(pre, r, firstDown, offKey, defKey){
  if(!pre||!r) return {letter:'-',label:'No grade yet',tone:'neutral'};
  const userOnO=pre.poss===CG.userSide, td=!r.turnover && pre.ballOn+(r.yards||0)>=100;
  const explosive=(!r.isPass&&r.yards>=12)||(r.isPass&&r.yards>=18), failedDown=(pre.down>=3&&!firstDown&&!td&&!r.turnover);
  let pts=55;
  if(userOnO){
    if(td) pts=98; else if(r.turnover) pts=8; else if(firstDown) pts=88; else if(explosive) pts=82; else if(r.result==='sack') pts=20; else if(failedDown) pts=26; else if((r.yards||0)>=Math.max(3,pre.toGo*.55)) pts=70; else if(r.result==='incomplete') pts=42; else if((r.yards||0)<=0) pts=35;
  } else {
    if(r.turnover) pts=98; else if(r.result==='sack') pts=92; else if(td) pts=6; else if(failedDown) pts=86; else if(firstDown) pts=28; else if(explosive) pts=20; else if((r.yards||0)<=2) pts=78; else pts=60;
  }
  const call=cgCallSummary(offKey,defKey,r);
  if(userOnO ? call.read>0.35 : call.read<-.35) pts+=5;
  if(userOnO ? call.read<-.35 : call.read>0.35) pts-=5;
  pts=ENG.clamp(Math.round(pts),0,100);
  const letter=pts>=94?'A+':pts>=86?'A':pts>=76?'B':pts>=62?'C':pts>=45?'D':'F';
  const label=pts>=86?'Great call':pts>=76?'Good answer':pts>=62?'Playable':pts>=45?'Survived it':'Bad call';
  return {letter,label,score:pts,tone:pts>=76?'good':pts>=45?'warn':'bad'};
}
function cgDrivePanelHTML(viewState){
  let d=null;
  if(viewState||CG._scoreView){
    const st=viewState||CG._scoreView;
    d=(CG._lastDrive&&CG._lastDrive.side===st.poss)?CG._lastDrive:((CG._drive&&CG._drive.side===st.poss)?CG._drive:cgNewDrive(st.poss,st));
  } else d=cgEnsureDrive();
  if(!d) return '';
  const teamNow=cgTeam(d.side), uOnO=d.side===CG.userSide, pressure=cgPressureScore();
  const spot=d.startBallOn<=50?`${teamNow.abbr} ${d.startBallOn}`:`OPP ${100-d.startBallOn}`;
  const resolving=!!(viewState||CG._scoreView);
  const last=!resolving&&CG._lastDrive?`<div class="cg-drive-last"><span>Previous drive</span><b>${esc(cgTeam(CG._lastDrive.side).abbr)} ${esc(CG._lastDrive.result||'Ended')}</b><em>${CG._lastDrive.plays||0} plays, ${CG._lastDrive.yards||0} yards</em></div>`:'';
  const result=resolving&&d.result?`<div class="cg-drive-last"><span>Drive result</span><b>${esc(cgTeam(d.side).abbr)} ${esc(d.result)}</b><em>${d.plays||0} plays, ${d.yards||0} yards</em></div>`:'';
  const beat=d.beat?`<div class="cg-drive-beat">${esc(d.beat)}</div>`:'';
  return `<section class="cg-panel cg-drive-card"><div class="cg-panel-title">${resolving?'Resolving drive':(uOnO?'Offensive drive mission':'Defensive drive mission')}</div>
    <div class="cg-drive-top"><div><h4>${esc(d.mission)}</h4><p>${esc(d.target)}</p></div><div class="cg-pressure ${cgPressureLabel(pressure)}"><span>Pressure</span><b>${pressure}</b><em>${cgPressureLabel(pressure)}</em></div></div>
    <div class="cg-drive-metrics"><span>Start: ${esc(spot)}</span><span>${d.plays||0} plays</span><span>${d.yards||0} yards</span><span>${d.firstDowns||0} first downs</span></div>${beat}${result}${last}</section>`;
}
function cgCoachCardHTML(uOnO, visiblePlays, sheetName, plan){
  plan=plan||cgCoachPlan(uOnO,visiblePlays);
  const rec=plan.safe, counter=plan.counter;
  return `<section class="cg-coach-card">
    <div><div class="cg-panel-title">Coordinator headset</div><h4>${esc(cgSituationName())}</h4><p>${esc(cgOpponentHint(uOnO))}</p></div>
    <div><span>Coordinator safe call</span><b>${esc(rec?rec.label:'Take the safe call')}</b><em>${esc(plan.safeReason||'Keep the drive on schedule.')}</em></div>
    <div><span>Counterpunch</span><b>${esc(counter?counter.label:'Change the picture')}</b><em>${esc(plan.counterReason||'Break tendency before they key you.')}</em></div>
    <div><span>Staff confidence</span><b>${esc(String(plan.confidence||65))}%</b><em>${esc(sheetName||'Team playbook')} · repeat a failed call and the room loses trust.</em></div>
    <div class="cg-headset-quote">${esc(cgStaffQuote(uOnO,rec))}</div>
  </section>`;
}
function cgCrowdBurst(kind){
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    const ac=window._cgAudio||(window._cgAudio=new AC()); if(ac.state==='suspended') ac.resume();
    const dur=kind==='td'?1.2:kind==='big'||kind==='turnover'?0.85:0.18, sr=ac.sampleRate, buf=ac.createBuffer(1,Math.max(1,Math.floor(sr*dur)),sr), data=buf.getChannelData(0);
    for(let i=0;i<data.length;i++){ const fade=1-i/data.length; data[i]=(Math.random()*2-1)*fade; }
    const src=ac.createBufferSource(), filter=ac.createBiquadFilter(), gain=ac.createGain();
    filter.type='bandpass'; filter.frequency.value=kind==='snap'?520:kind==='td'?880:700; filter.Q.value=0.55;
    gain.gain.setValueAtTime(kind==='snap'?0.018:0.04,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+dur);
    src.buffer=buf; src.connect(filter); filter.connect(gain); gain.connect(ac.destination); src.start();
  }catch(e){}
}
function cgVoiceEnabled(){ try{ return localStorage.getItem('fps_voice_pbp')==='1'; }catch(e){ return false; } }
function cgVoiceCfg(){
  try{ return Object.assign({provider:'browser',model:'gpt-4o-mini-tts',voice:'marin',analystVoice:'cedar'},JSON.parse(localStorage.getItem('fps_voice_pbp_cfg')||'{}')); }catch(e){ return {provider:'browser',model:'gpt-4o-mini-tts',voice:'marin',analystVoice:'cedar'}; }
}
function cgSetVoiceCfg(c){ try{ localStorage.setItem('fps_voice_pbp_cfg',JSON.stringify(Object.assign(cgVoiceCfg(),c||{}))); }catch(e){} }
function cgVoiceKey(){ const c=cgVoiceCfg(); return (c.key||'').trim(); }
function cgVoiceProReady(){ const c=cgVoiceCfg(); return c.provider==='openai' && cgVoiceKey().length>20; }
function cgCleanVoice(txt){
  return stripHTML(txt).replace(/[^\w\s.,!?&:'"-]/g,' ').replace(/\s+/g,' ').trim().slice(0,520);
}
function cgStopVoice(){
  try{ if(window._cgVoiceAudio){ window._cgVoiceAudio.pause(); window._cgVoiceAudio=null; } if(window._cgVoiceUrl){ URL.revokeObjectURL(window._cgVoiceUrl); window._cgVoiceUrl=null; } }catch(e){}
  try{ if('speechSynthesis' in window) window.speechSynthesis.cancel(); }catch(e){}
}
function cgSpeakBrowser(clean,kind){
  if(!('speechSynthesis' in window)||!clean) return;
  try{
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(clean);
    u.rate=kind==='moment'?1.08:1.0; u.pitch=kind==='moment'?0.86:0.94; u.volume=0.92;
    const voices=window.speechSynthesis.getVoices&&window.speechSynthesis.getVoices();
    const v=(voices||[]).find(x=>/Daniel|Alex|Samantha|Google US English|Microsoft David/i.test(x.name));
    if(v) u.voice=v;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
async function cgSpeakOpenAI(clean,kind){
  const cfg=cgVoiceCfg(), key=cgVoiceKey();
  if(!key||!clean) return false;
  const seq=(window._cgVoiceSeq||0)+1; window._cgVoiceSeq=seq;
  const res=await fetch('https://api.openai.com/v1/audio/speech',{
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${key}`},
    body:JSON.stringify({
      model:cfg.model||'gpt-4o-mini-tts',
      voice:kind==='moment'?(cfg.voice||'marin'):(cfg.analystVoice||cfg.voice||'cedar'),
      input:clean,
      response_format:'mp3',
      speed:kind==='moment'?1.06:1.0,
      instructions:kind==='moment'?'Energetic professional American football play-by-play, urgent but clear.':'Natural radio booth color voice, concise and real, like a football broadcast.'
    })
  });
  if(!res.ok){ let t=''; try{t=await res.text();}catch(e){} throw new Error(`Voice API ${res.status}: ${t.slice(0,160)}`); }
  const blob=await res.blob();
  if(window._cgVoiceSeq!==seq) return true;
  cgStopVoice();
  const url=URL.createObjectURL(blob), audio=new Audio(url);
  window._cgVoiceUrl=url; window._cgVoiceAudio=audio;
  audio.onended=()=>{ try{ URL.revokeObjectURL(url); }catch(e){} if(window._cgVoiceUrl===url) window._cgVoiceUrl=null; };
  await audio.play();
  return true;
}
function cgSpeak(txt,kind){
  if(!cgVoiceEnabled()) return;
  const clean=cgCleanVoice(txt);
  if(!clean) return;
  if(cgVoiceProReady()){
    cgSpeakOpenAI(clean,kind).catch(e=>{ try{ console.warn(e.message||e); }catch(_){} cgSpeakBrowser(clean,kind); });
  } else cgSpeakBrowser(clean,kind);
}
function cgToggleVoice(){
  const on=!cgVoiceEnabled();
  try{ localStorage.setItem('fps_voice_pbp',on?'1':'0'); }catch(e){}
  if(!on) cgStopVoice();
  if(on) cgSpeak('Voice play by play is on. The booth has the call.','moment');
  render();
}
function cgVoiceSetup(){
  const cfg=cgVoiceCfg(), existing=cfg.key?('••••••••'+cfg.key.slice(-4)):'';
  const key=prompt('OpenAI API key for pro play-by-play voice. Stored only in this browser localStorage. Leave blank to keep current key.', existing);
  if(key===null) return;
  const next={provider:'openai'};
  if(key && !key.startsWith('•')) next.key=key.trim();
  const voice=prompt('Play-by-play voice (try marin or alloy).', cfg.voice||'marin');
  if(voice) next.voice=voice.trim();
  const analyst=prompt('Color/analyst voice (try cedar or verse).', cfg.analystVoice||'cedar');
  if(analyst) next.analystVoice=analyst.trim();
  const model=prompt('TTS model.', cfg.model||'gpt-4o-mini-tts');
  if(model) next.model=model.trim();
  cgSetVoiceCfg(next);
  try{ localStorage.setItem('fps_voice_pbp','1'); }catch(e){}
  toast(cgVoiceProReady()?'Pro booth voice saved.':'Voice setup saved; add a valid key for pro booth audio.');
  cgSpeak('Pro broadcast booth is configured. The next big play has the call.','moment');
  render();
}
function cgRadioMeta(){
  if(!CG) return '';
  const S=CG._scoreView||CG, poss=cgTeam(S.poss), dd=S.down+' & '+(S.toGo>=100-S.ballOn?'Goal':S.toGo);
  const spot=S.ballOn<=50?poss.abbr+' '+S.ballOn:'OPP '+(100-S.ballOn);
  return `Q${S.q>4?'OT':S.q} ${cgClockStr(S)} - ${poss.abbr} ball - ${dd} - ${spot}`;
}
function cgCommitRadio(label){
  if(!CG) return;
  const text=stripHTML(CG.lastText||'');
  if(!text) return;
  const meta=cgRadioMeta(), note=stripHTML(CG.lastColor||''), tag=label||(CG._moment?CG._moment.label:'On the call');
  const key=[CG.q,CG.clock,CG.down,CG.toGo,CG.ballOn,CG.poss,text,CG.log&&CG.log[0]].join('|');
  if(CG._radioKey===key) return;
  CG._radioKey=key; CG.radio=CG.radio||[];
  CG.radio.unshift({tag,text,note,meta,side:CG.poss,good:!!CG._good,bad:!!CG._bad});
  if(CG.radio.length>18) CG.radio.length=18;
  const voice=[tag,text,note].filter(Boolean).join('. ');
  cgSpeak(voice,CG._moment?'moment':'call');
}
function cgRadioHTML(){
  const on=cgVoiceEnabled(), entries=(CG.radio||[]).slice(0,7);
  const current=entries[0]||{tag:'Pregame',text:stripHTML(CG.lastText||'Pregame coin toss at midfield.'),note:stripHTML(CG.lastColor||''),meta:cgRadioMeta()};
  const pro=cgVoiceProReady();
  const voiceActions=(typeof TTS!=='undefined'&&!TTS.isDisabled())?`<div class="cg-voice-actions"><button class="btn ${on?'':'sec'} cg-voice-btn" onclick="cgToggleVoice()">${on?(pro?'Pro Voice':'Voice On'):'Voice Off'}</button><button class="btn sec cg-voice-btn" onclick="cgVoiceSetup()">Setup</button></div>`:'';
  return `<div class="cg-radio-head"><div><div class="cg-panel-title">GameCast booth</div><b>${esc(current.tag||'On the call')}</b></div>${voiceActions}</div>
    <div class="cg-radio-live"><div class="cg-radio-meta">${esc(current.meta||'')}</div><div class="cg-radio-call">${esc(current.text)}</div>${current.note?`<div class="cg-radio-note">${esc(current.note)}</div>`:''}</div>
    <div class="cg-radio-feed">${entries.slice(1).map(e=>`<div class="cg-radio-row"><span>${esc(e.meta||'')}</span><b>${esc(e.text)}</b></div>`).join('')||'<div class="muted" style="font-size:12px">The booth is warming up.</div>'}</div>`;
}
function cgTimeout(){
  const side=CG.userSide; if(!CG||CG.over||CG.pat||CG._scoreView) return;
  if((CG.to[side]||0)<=0){ toast('No timeouts left.'); return; }
  CG.to[side]--; CG.tempo='normal'; CG.hurry=false;
  CG.lastText=`${cgTeam(side).abbr} call timeout. Regroup, check the call sheet, and reset the down.`;
  CG.lastColor='Clock stopped. This is where situational football matters.';
  CG.log.unshift(`${cgTeam(side).abbr} timeout (${CG.to[side]} left).`);
  cgCommitRadio('Timeout');
  cgResetPlayClock();
  save(); render();
}
function cgTempoLabel(){ return CG.tempo==='hurry'?'Hurry-up':CG.tempo==='chew'?'Chew clock':'Normal tempo'; }
function cgSideName(side){ const t=cgTeam(side); return t?t.abbr:''; }
function cgCoinStatus(){
  if(!CG||!CG.coin) return '';
  const c=CG.coin, w=cgSideName(c.winner), caller=cgSideName(c.caller);
  if(c.pending) return `${caller} called ${c.call.toUpperCase()} · ${c.flip.toUpperCase()} · ${w} won the toss`;
  return `${w} ${c.choice==='defer'?'deferred':'received'} · ${cgSideName(CG._kickoffReceiver)} received opening kick`;
}
function cgScoreState(home,away){
  const S=CG._scoreView||CG;
  const toss=CG.coin&&CG.coin.pending, dd=S.down+' & '+(S.toGo>=100-S.ballOn?'Goal':S.toGo);
  const possTeam=team(S.poss==='h'?CG.home:CG.away), spot=S.ballOn<=50?possTeam.abbr+' '+S.ballOn:'OPP '+(100-S.ballOn);
  return {toss, period:toss?'PREGAME':`Q${S.q>4?'OT':S.q}`, clock:toss?'COIN TOSS':cgClockStr(S),
    status:toss?cgCoinStatus():`${possTeam.abbr} ball · ${dd} · ${spot} · ${cgTempoLabel()}${CG._scoreView?' · play in progress':''}`,
    awayPoss:!toss&&S.poss==='a', homePoss:!toss&&S.poss==='h', as:S.as, hs:S.hs};
}
function cgJumbotronHTML(home,away){
  const st=cgScoreState(home,away);
  const wx=WX[CG.weather]||WX.clear, surface=stadiumSurface(home.abbr)==='grass'?'NATURAL GRASS':'TURF';
  const venue=(home.stadium&&home.stadium.name)||home.city+' Stadium';
  const live=st.toss?'PREGAME':`${st.period} ${st.clock}`;
  return `<div class="cg-jumbotron">
    <div class="cg-jumbo-header"><span class="cg-live-pill">${st.toss?'COIN TOSS':'LIVE'}</span><span>${esc(venue)} · ${esc(home.city)}</span><span>${wx.icon} ${esc(wx.label)} · ${surface}</span></div>
    <div class="cg-jumbo-teams">
      <div class="cg-jumbo-team" style="--team:${away.pri||'#5bbcff'};--team2:${away.sec||'#ffffff'}">
        <span>${logoTag(away,22)} ${away.abbr}${st.awayPoss?' BALL':''}</span><b class="cg-jumbo-score">${st.as}</b><em>${away.wins}-${away.losses}</em>
      </div>
      <div class="cg-jumbo-center"><div class="cg-jumbo-clock">${live}</div><div class="cg-jumbo-brand">${away.abbr} @ ${home.abbr}</div></div>
      <div class="cg-jumbo-team" style="--team:${home.pri||'#5bbcff'};--team2:${home.sec||'#ffffff'}">
        <span>${home.abbr}${st.homePoss?' BALL':''} ${logoTag(home,22)}</span><b class="cg-jumbo-score">${st.hs}</b><em>${home.wins}-${home.losses}</em>
      </div>
    </div>
    <div class="cg-jumbo-status">${esc(st.status)}</div>
    <div class="cg-ribbon-board"><span>${esc(home.nick).toUpperCase()} HOME FEED</span><span>${esc(cgTempoLabel()).toUpperCase()}</span><span>${esc(wx.label).toUpperCase()} FIELD CONDITIONS</span></div>
  </div>`;
}
function cgCallSummary(offKey, defKey, r){
  const o=OFF_META[offKey]||{label:offKey,personnel:'',formation:''}, d=DEF_META[defKey]||{label:defKey,front:'',shell:''};
  const read=readFactor(offKey,defKey);
  let edge=read>0.35?'offense liked the look':read<-0.35?'defense had the right answer':'execution decided it';
  if(r){
    if(r.turnover) edge='defense stole the snap';
    else if(r.result==='sack'||r.result==='stuff') edge='defense won the rep';
    else if(r.result==='incomplete') edge=read>0.35?'offense had a window but missed':'coverage held up';
    else if(r.yards>=Math.max(1,CG.toGo||10)) edge=read<-0.35?'offense beat a good defensive call':'offense converted the look';
    else if(r.yards>=6) edge=read<-0.35?'offense stole useful yards against the look':'offense stayed ahead of the chains';
    else if(r.yards>=3) edge='small win, next call matters';
    else if(r.yards<=2) edge='defense kept it on schedule';
  }
  return {off:o,def:d,edge,read,result:r?r.result:null};
}
function cgSnapState(){
  if(!CG) return null;
  return {poss:CG.poss,ballOn:CG.ballOn,down:CG.down,toGo:CG.toGo,q:CG.q,clock:CG.clock,hs:CG.hs,as:CG.as};
}
function cgStateText(s){
  if(!s) return '';
  if(s.ballOn>=100){ const tdTeam=cgTeam(s.poss); return `Q${s.q>4?'OT':s.q} ${cgClockStr(s)} - ${tdTeam.abbr} touchdown - PAT pending`; }
  const t=cgTeam(s.poss), dd=s.down+' & '+(s.toGo>=100-s.ballOn?'Goal':s.toGo);
  const spot=s.ballOn<=50?`${t.abbr} ${s.ballOn}`:`OPP ${100-s.ballOn}`;
  return `Q${s.q>4?'OT':s.q} ${cgClockStr(s)} - ${t.abbr} ball - ${dd} - ${spot}`;
}
function cgResultText(r){
  if(!r) return 'Snap resolved';
  if(r.turnover) return r.result==='INT'?'Interception':'Fumble lost';
  if(r.result==='sack') return `Sack ${r.yards}`;
  if(r.result==='incomplete') return 'Incomplete';
  return `${r.yards>=0?'+':''}${r.yards} yards`;
}
function cgTeachText(r, firstDown, offKey, defKey, pre){
  const call=cgCallSummary(offKey,defKey,r);
  pre=pre||cgSnapState();
  const userOnO=pre&&pre.poss===CG.userSide, y=(r&&r.yards)||0, explosive=r&&((r.isPass&&y>=18)||(!r.isPass&&y>=12));
  if(r&&r.turnover) return userOnO?'Turnover ended the drive. Next series starts with a simpler answer: secure throw, protected concept, or run to settle it.':'Takeaway. Now expect the opposing coach to get conservative; steal another down before they reset.';
  if(r&&r.result==='sack') return userOnO?'Protection lost. Next answer should be quick game, screen, boot, or extra help before calling another slow concept.':'Rush and coverage paired up. Expect screen, quick game, or movement as their counter.';
  if(r&&r.result==='stuff') return userOnO?'The front fit the run cleanly. Call a constraint next: boot, RPO, screen, or a different run family.':'The fit was clean. Now expect the offense to punish overplay with boot, RPO, or screen.';
  if(explosive) return userOnO?'Explosive hit. The defense will protect grass now, so be ready to run, screen, or take the underneath answer.':'Explosive allowed. Put the roof back on the coverage and make them drive it the hard way.';
  if(firstDown) return userOnO?'Sticks moved. Good call, but now protect the tendency before the defense keys the family.':'They converted. Change the picture now: different shell, different pressure path, or force a throw short of the marker.';
  if(r&&r.result==='incomplete') return userOnO?'Clock stops and the down gets harder. The next call needs a field-position answer, not just hope.':'Coverage held. Expect the offense to answer with run, quick game, or a safer completion.';
  if(userOnO && pre.down>=3 && !firstDown) return 'Drive is on the edge. Decide now: punt math, field-goal range, or a high-percentage fourth-down concept.';
  if(!userOnO && pre.down>=3 && !firstDown) return 'Stop earned. Finish the sequence cleanly and do not hand it back with a penalty or soft fourth-down look.';
  if(userOnO && y<=2) return 'Low-yield snap. You are behind schedule, so the next call needs an answer for pressure and the sticks.';
  if(!userOnO && y<=2) return 'Good schedule defense. Now avoid the obvious repeat; the counter is coming.';
  if(call.read<-0.35) return userOnO?'The defense had the chalk, but you survived. Counter the look before it becomes a drive killer.':'The chalk favored you. Do not show it twice without changing the disguise.';
  if(call.read>0.35) return userOnO?'Good call into the look. Now protect the tendency before the defense adjusts.':'The offense had the look. Change leverage or coverage before they repeat it.';
  return 'Neutral call. The players decided it, so the next snap is about tendency and matchup.';
}
function cgSetLastSnap(pre, off, def, offKey, defKey, r, line, firstDown){
  if(!CG) return;
  const grade=cgSnapGrade(pre,r,firstDown,offKey,defKey);
  if(grade.score<50){
    if(pre&&pre.poss===CG.userSide) cgPushRecent('_coldOffKeys',offKey,4);
    else cgPushRecent('_coldDefKeys',defKey,4);
  }
  cgUpdateDrive(pre,r,firstDown,line);
  CG._lastSnap={pre,post:cgSnapState(),off:off&&off.abbr,def:def&&def.abbr,
    call:(OFF_META[offKey]&&OFF_META[offKey].label)||offKey,
    answer:(DEF_META[defKey]&&DEF_META[defKey].label)||defKey,
    result:cgResultText(r), text:stripHTML(line||''), teach:cgTeachText(r,firstDown,offKey,defKey,pre), grade,
    r:{result:r.result,yards:r.yards,isPass:r.isPass,turnover:r.turnover}, firstDown:!!firstDown};
  CG._playerBeat = cgPlayerBeat(off,def,r,CG._lastAct,pre);
}
function cgSetSpecialSnap(pre, call, result, teach, text){
  if(!CG) return;
  cgUpdateDrive(pre,{result,yards:0},false,text||result);
  const userOnO=pre&&pre.poss===CG.userSide, made=/good/i.test(result), flipped=/flipped/i.test(result), missed=/miss|no good/i.test(result);
  let grade;
  if(userOnO) grade={letter:(made||flipped)?'A':'C',label:(made||flipped)?'Special teams win':'Special teams swing',tone:(made||flipped)?'good':'warn'};
  else if(made) grade={letter:'C',label:'Held to three',tone:'warn'};
  else if(missed||flipped) grade={letter:'A',label:'Defensive stop',tone:'good'};
  else grade={letter:'B',label:'Special teams reset',tone:'good'};
  CG._playerBeat=null;
  CG._lastSnap={pre,post:cgSnapState(),call,answer:'Special teams',result,text:stripHTML(text||result),teach,grade};
}
function cgLastSnapHTML(){
  const s=CG&&CG._lastSnap;
  if(!s) return '';
  return `<section class="cg-panel cg-last-snap"><div class="cg-panel-title">Last snap</div>
    <div class="cg-last-row"><span>Before</span><b>${esc(cgStateText(s.pre))}</b></div>
    <div class="cg-last-row"><span>After</span><b>${esc(cgStateText(s.post))}</b></div>
    <div class="cg-last-outcome"><strong>${esc(s.result)}</strong>${s.grade?`<span class="cg-grade ${s.grade.tone||''}">${esc(s.grade.letter)} · ${esc(s.grade.label)}</span>`:''}<em>${esc(s.call)} vs ${esc(s.answer)}</em></div>
    <p>${esc(s.teach)}</p></section>`;
}
function cgFieldWear(){
  if(!CG) return 0;
  const snaps=(CG.pbp&&CG.pbp.length)||CG.log.length||0;
  const qWear=Math.max(0,CG.q-1)*0.16;
  return ENG.clamp(qWear + snaps/150, 0, 1);
}
function cgApplyFieldEnvironment(sim, home){
  if(!sim||!home) return;
  const away=team(CG.away);
  sim.weather=CG.weather||'clear';
  sim.surface=stadiumSurface(home.abbr);
  sim.wear=cgFieldWear();
  sim.wearSeed=((home.abbr||'')+'-'+(CG.q||1)+'-'+(CG.clock||0)+'-'+(CG.log.length||0));
  sim.homeTeam=home;
  sim.awayTeam=away;
  sim.fieldTheme={abbr:home.abbr,city:home.city,nick:home.nick,pri:home.pri,sec:home.sec,venue:(home.stadium&&home.stadium.name)||home.city+' Stadium',surface:sim.surface, rivalry:!!CG.rivalry };
  const st=cgScoreState(home,away);
  sim.gameState={away:away&&away.abbr,home:home.abbr,as:CG.as,hs:CG.hs,period:st.period,clock:st.clock,status:st.status,poss:CG.poss,weather:CG.weather||'clear', _moment:CG._moment, down:CG.down, toGo:CG.toGo, ballOn:CG.ballOn};
  sim.ballHash=CG.ballHash!=null?CG.ballHash:1;
  if(CG.gameplan) sim.gameplan = JSON.parse(JSON.stringify(CG.gameplan)); // for visual scheme feedback in canvas
}
function fieldStaticResult(sim,onEnd){
  if(!sim) return null;
  try{
    if(sim.stop) sim.stop();
    let guard=0;
    while(!sim.result && guard<420){ sim.step(1/30); guard++; }
    sim.draw();
  }catch(e){ try{ sim.draw(); }catch(_){} }
  const res=sim.result||{outcome:'tackle',yards:0,text:'Play blown dead.'};
  if(onEnd) onEnd(res);
  return res;
}
function cgResolveCoin(choice){
  if(!CG||!CG.coin||!CG.coin.pending) return;
  const c=CG.coin, winner=c.winner, other=winner==='h'?'a':'h';
  choice=choice||c.aiChoice||'receive';
  const receiver=choice==='defer'?other:winner;
  c.pending=false; c.choice=choice;
  CG.poss=receiver; CG._kickoffReceiver=receiver; CG.ballOn=25; CG.down=1; CG.toGo=10; CG.q=1; CG.clock=900; CG.ballHash=1;
  CG._drive=null; CG._lastDrive=null;
  const w=cgTeam(winner), r=cgTeam(receiver);
  CG.lastText=`${w.abbr} win the toss and ${choice==='defer'?`defer. ${r.abbr} receive the opening kick.`:'elect to receive.'}`;
  CG.lastColor=choice==='defer'?`${w.city} trust their defense first and want the ball after halftime.`:`${w.city} want the ball right away.`;
  CG.log.unshift(`Coin toss decision: ${w.abbr} ${choice==='defer'?'defer; '+r.abbr+' receive.':'elect to receive.'}`);
  cgCommitRadio('Coin toss');
  cgResetPlayClock(); cgCrowdBurst('big');
  save(); render();
}
function cgCoinCardHTML(){
  const c=CG.coin, winner=cgTeam(c.winner), caller=cgTeam(c.caller), userWon=c.winner===CG.userSide;
  const aiChoice=c.aiChoice||'receive', receiving=aiChoice==='defer'?cgTeam(c.winner==='h'?'a':'h'):winner;
  return `<div class="card cg-control-card"><div class="cg-coin-card"><div>
    <div class="cg-panel-title">Coin toss</div>
    <h3 style="margin:0 0 6px">${winner.city} win the toss</h3>
    <div class="muted" style="font-size:12px;line-height:1.5">${caller.abbr} called <b>${c.call.toUpperCase()}</b>. The coin landed <b>${c.flip.toUpperCase()}</b>. ${userWon?'Choose how you want to open the game.':`${winner.abbr} will ${aiChoice==='defer'?`defer; ${receiving.abbr} receive.`:'receive the opening kick.'}`}</div>
    <div class="row" style="gap:8px;margin-top:10px">${userWon?`<button class="btn" id="cgreceive">Receive</button><button class="btn sec" id="cgdefer">Defer</button>`:`<button class="btn" id="cgkickoff">Begin kickoff</button>`}</div>
  </div><div class="cg-coin-face">${c.flip[0].toUpperCase()}</div></div></div>`;
}
function cgLeagueTextHTML(){ const ls=cgLeagueScores(); if(!ls.length)return '<div class="muted" style="font-size:12px">Exhibition game - no league slate today.</div>';
  return ls.map(g=>{ const a=team(g.away),h=team(g.home), final=g.q==='FINAL', aw=g.as>=g.hs;
    return `<div class="cg-text-row"><span>${a.abbr} <b class="${final&&!aw?'muted':''}">${g.as}</b></span><em>${final?'FINAL':g.q}</em><span><b class="${final&&aw?'muted':''}">${g.hs}</b> ${h.abbr}</span></div>`; }).join(''); }
function cgTextBoxHTML(){
  const fmtTeam=t=>{ const b=cgBoxLines(t), rows=[];
    if(b.QB[0]) rows.push(['QB',`${b.QB[0].p.last||b.QB[0].p.name} ${b.QB[0].pcmp||0}/${b.QB[0].patt||0}, ${b.QB[0].pyd||0} yd`]);
    if(b.RB[0]) rows.push(['Rush',`${b.RB[0].p.last||b.RB[0].p.name} ${b.RB[0].ratt||0}-${b.RB[0].ryd||0}`]);
    b.REC.slice(0,2).forEach((x,i)=>rows.push([i?'Rec 2':'Rec',`${x.p.last||x.p.name} ${x.rec||0}-${x.recyd||0}`]));
    if(b.DEF[0]) rows.push(['Def',`${b.DEF[0].p.last||b.DEF[0].p.name} ${b.DEF[0].tkl||0} tkl${b.DEF[0].sack?', '+b.DEF[0].sack+' sk':''}`]);
    if(!rows.length) rows.push(['Stats','No stats yet']);
    return `<div><div class="cg-panel-title">${t.abbr} leaders</div>${rows.map(r=>`<div class="cg-text-row"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}</div>`; };
  return `<div class="cg-text-stats">${fmtTeam(team(CG.away))}${fmtTeam(team(CG.home))}</div>`;
}
function cgTextScoreboardHTML(home,away){
  const st=cgScoreState(home,away), wx=WX[CG.weather]||WX.clear;
  const venue=(home.stadium&&home.stadium.name)||home.city+' Stadium';
  const surface=stadiumSurface(home.abbr)==='grass'?'natural grass':'turf';
  const slot=CG.slot?`${CG.slot.label} - ${CG.slot.net} - Week ${G.week+1}`:'Exhibition';
  const line=(t,side,score,poss)=>`<div class="cg-text-team ${poss?'poss':''}" style="--team:${t.pri||'#5bbcff'}"><span>${poss?'BALL':''}</span><b>${t.city} ${t.nick}</b><strong>${score}</strong><em>${t.abbr} ${t.wins}-${t.losses}</em></div>`;
  return `<section class="cg-text-scoreboard">
    <div class="cg-text-scoretop"><span>${esc(slot)}</span><span>${esc(venue)} - ${esc(home.city)} - ${esc(wx.label)} - ${surface}</span></div>
    <div class="cg-text-scoreline">${line(away,'a',st.as,st.awayPoss)}<div class="cg-text-clock"><b>${st.period}</b><strong>${st.clock}</strong><span>${esc(st.status)}</span></div>${line(home,'h',st.hs,st.homePoss)}</div>
    <div class="cg-text-meta"><span>Win chance: ${cgWinProb(CG._scoreView||CG)}%</span><span>Momentum: ${CG.mom>0?'+':''}${CG.mom}</span><span>Timeouts: ${away.abbr} ${CG.to.a||0}, ${home.abbr} ${CG.to.h||0}</span>${CG.rivalry?`<span>Rivalry: ${esc(CG.rivalry)}</span>`:''}</div>
  </section>`;
}
function cgTextStoryHTML(){
  const latest=(CG.radio&&CG.radio[0])||{};
  const liveText=stripHTML(CG.lastText||latest.text||'Pregame coin toss at midfield.'), latestText=stripHTML(latest.text||'');
  const snapMeta=CG._scoreView?cgRadioMeta():(CG._lastSnap&&CG._lastSnap.pre?cgStateText(CG._lastSnap.pre):cgRadioMeta());
  const current={
    tag:CG._moment?CG._moment.label:(liveText&&latestText&&liveText!==latestText?'On the call':latest.tag||'On the call'),
    text:liveText,
    note:stripHTML(CG.lastColor||latest.note||''),
    meta:snapMeta||latest.meta||''
  };
  const moment=CG._moment?`<div class="cg-text-moment" style="--moment:${CG._moment.c}"><b>${esc(CG._moment.label)}</b><span>${esc(CG._moment.crowd||'')}</span></div>`:'';
  return `<section class="cg-text-maincall">${moment}<div class="cg-panel-title">${esc(current.tag||'On the call')}</div><div class="cg-text-meta-line">${esc(current.meta||cgRadioMeta())}</div><h2>${esc(current.text||'Pregame coin toss at midfield.')}</h2>${current.note?`<p>${esc(current.note)}</p>`:''}${CG.lastCall?`<div class="cg-call-detail"><b>${CG.lastCall.off.personnel} ${CG.lastCall.off.formation}</b> - ${CG.lastCall.off.label} vs <b>${CG.lastCall.def.front}</b> ${CG.lastCall.def.label}. <span class="muted">${CG.lastCall.edge}.</span></div>`:''}</section>`;
}
function cgTextRadioHTML(){
  const on=cgVoiceEnabled(), entries=(CG.radio||[]).slice(1,8);
  const pro=cgVoiceProReady();
  return `<section class="cg-panel cg-text-feed"><div class="cg-radio-head"><div><div class="cg-panel-title">Radio transcript</div><b>Voice booth</b></div><div class="cg-voice-actions"><button class="btn ${on?'':'sec'} cg-voice-btn" onclick="cgToggleVoice()">${on?(pro?'Pro Voice':'Voice On'):'Voice Off'}</button><button class="btn sec cg-voice-btn" onclick="cgVoiceSetup()">Setup</button></div></div>
    ${entries.map(e=>`<div class="cg-radio-row"><span>${esc(e.meta||'')}</span><b>${esc(e.text)}</b></div>`).join('')||'<div class="muted" style="font-size:12px">The booth is warming up.</div>'}</section>`;
}
function cgTextDriveHTML(){
  return `<section class="cg-panel"><div class="cg-panel-title">Drive log</div><div class="cg-text-log">${CG.log.slice(0,14).map(x=>`<div class="ply">${x}</div>`).join('')||'<span class="muted">Kickoff.</span>'}</div></section>`;
}
function cgTextCoinCardHTML(){
  const c=CG.coin, winner=cgTeam(c.winner), caller=cgTeam(c.caller), userWon=c.winner===CG.userSide;
  const aiChoice=c.aiChoice||'receive', receiving=aiChoice==='defer'?cgTeam(c.winner==='h'?'a':'h'):winner;
  return `<div class="card cg-control-card cg-text-decision"><div class="cg-panel-title">Coin toss</div><h3>${winner.city} win the toss</h3>
    <p>${caller.abbr} called <b>${c.call.toUpperCase()}</b>. The coin landed <b>${c.flip.toUpperCase()}</b>. ${userWon?'Choose how you want to open the game.':`${winner.abbr} will ${aiChoice==='defer'?`defer; ${receiving.abbr} receive.`:'receive the opening kick.'}`}</p>
    <div class="row" style="gap:8px;margin-top:10px">${userWon?`<button class="btn" id="cgreceive">Receive</button><button class="btn sec" id="cgdefer">Defer</button>`:`<button class="btn" id="cgkickoff">Begin kickoff</button>`}</div></div>`;
}
// speak the play-by-play when it changes (guarded so re-renders/toggles don't repeat a line)
// the stadium bed ducks ~10dB under the booth so the call stays clean, then swells back when the voice stops
window.TTS_onSpeak=function(on){ try{ const bed=window._cgBed; if(!bed||!bed.g||!bed.ac) return; const now=bed.ac.currentTime, g=bed.g.gain; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(on?0.015:0.045, now+0.16); }catch(e){} };
function cgMaybeSpeak(){ if(!CG || typeof TTS==='undefined' || !TTS.enabled()) return; const t=stripHTML(CG.lastText||'').trim(); if(!t || t===CG._spokenText) return; CG._spokenText=t;
  let excite=0.25; const mo=CG._moment;   // drive the booth's energy: TD/INT erupt, routine downs stay calm
  if(mo){ excite=(mo.kind==='TD')?1.0:(mo.kind==='BIG')?0.9:(mo.kind==='INT'||mo.kind==='FUM')?0.85:(mo.kind==='SACK'||mo.kind==='STAND'||mo.kind==='CLUTCH')?0.72:0.6; }
  else if(/touchdown|\bTD\b|intercept|fumble|first down!|sacked|GONE|six points/i.test(t)) excite=0.6;
  else if(CG._bad) excite=0.5; else if(CG._good) excite=0.45;
  CG._lastExcite=excite;
  const colorTxt=stripHTML(CG.lastColor||'').trim();
  // PREFETCH the analyst's reply now so it can fire the instant the play freezes (no dead gap, but it lands AFTER the whistle)
  CG._colorPre = (TTS.twoVoice && TTS.twoVoice() && colorTxt && colorTxt!==CG._spokenColor && colorTxt.length>12 && TTS.prefetch)
    ? TTS.prefetch(colorTxt, {excite:Math.min(0.5,excite*0.5), voice:TTS.colorVoice()}) : null;
  TTS.speak(t, {excite});   // the play-by-play CALL streams and rides the field animation to its climax word
}
// the color analyst reacts AFTER the play freezes (radio rhythm: call rides the play, color reacts to the result)
function cgSpeakColor(){ if(!CG || typeof TTS==='undefined' || !TTS.enabled() || !(TTS.twoVoice&&TTS.twoVoice())) return;
  const colorTxt=stripHTML(CG.lastColor||'').trim();
  if(!colorTxt || colorTxt===CG._spokenColor || colorTxt.length<12) return; CG._spokenColor=colorTxt;
  if(CG._colorPre && CG._colorPre.then){ const pre=CG._colorPre; CG._colorPre=null; pre.then(h=>{ if(h&&h.play) h.play(); }); }
  else TTS.speak(colorTxt, {excite:Math.min(0.5,(CG._lastExcite||0.5)*0.5), voice:TTS.colorVoice()}); }
window.cgToggleVoice=function(){ if(typeof TTS==='undefined') return; const wasOn=TTS.enabled(); TTS.setCfg({on:!wasOn}); if(wasOn){ TTS.stop(); } else if(CG){ CG._spokenText=null; cgMaybeSpeak(); } render(); };
// STATIC play-by-play box — always sits directly under the scoreboard (same spot in every state); result emphasis only when a play just resolved.
function cgPbpBoxHTML(){
  const sv=!!CG._scoreView, mo=sv?CG._moment:null;
  const pbpC=CG._good?'var(--good,#46d39a)':CG._bad?'var(--bad,#ef5b6b)':'var(--acc,#5bbcff)';
  let h=`<div class="card cg-control-card cg-pbp-static" style="border-left:4px solid ${pbpC}">`;
  if(mo) h+=`<div style="text-align:center;margin:-2px 0 12px;padding:9px;border-radius:11px;background:radial-gradient(circle at 50% 0%, ${mo.c}33, transparent 72%);border:1px solid ${mo.c}"><div style="font-family:var(--disp,sans-serif);font-weight:900;letter-spacing:3px;font-size:22px;color:${mo.c};text-shadow:0 2px 10px ${mo.c}99">${mo.label}</div><div class="muted" style="font-size:12px;margin-top:1px">${mo.crowd}</div></div>`;
  h+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--dim,#7d8ba5)">📣 ON THE CALL</span>${(typeof TTS!=='undefined'&&!TTS.isDisabled())?`<button onclick="cgToggleVoice()" title="Spoken play-by-play" style="background:none;border:1px solid #2a3550;border-radius:6px;color:${TTS.enabled()?'#46d39a':'#7d8ba5'};font-size:11px;padding:2px 8px;cursor:pointer">${TTS.enabled()?'🔊 Voice on':'🔇 Voice off'}</button>`:''}</div>`;
  h+=`<div style="font-size:18px;line-height:1.45;font-weight:500;color:#eaf0fb">${CG.lastText||'The booth has the call — pick your play below.'}</div>`;
  if(CG.lastColor) h+=`<div style="margin-top:10px;padding-top:9px;border-top:1px dashed #243349"><span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#caa46a">🎙️ ${(CG.analyst||'IN THE BOOTH').toUpperCase()}</span><div style="font-size:14px;line-height:1.45;font-style:italic;color:#d6cdbb;margin-top:2px">${esc(CG.lastColor)}</div></div>`;
  if(sv){
    h+=(()=>{ const G2=CG._lastSnap&&CG._lastSnap.grade, gl=G2?G2.letter:'-'; if(gl==='-')return '';
      const gc=/^A/.test(gl)?'#46d39a':gl==='B'?'#5bbcff':gl==='C'?'#e8b341':'#ef5b6b';
      const wn=Math.round(cgWinProb()), sw=Math.round(cgWinProb()-cgWinProb(CG._lastSnap.pre));
      return `<div class="row" style="gap:10px;margin-top:11px;align-items:center;flex-wrap:wrap;border-top:1px dashed #243349;padding-top:9px"><span style="font-family:var(--mono);font-size:10px;letter-spacing:1.5px;color:var(--dim,#7d8ba5)">YOUR CALL</span><span style="font-weight:900;font-size:17px;color:${gc}">${gl}</span><span class="muted" style="font-size:12px">${esc(G2.label||'')}</span><span style="margin-left:auto;font-family:var(--mono);font-size:12px;color:#b8c6dc">WIN <b style="color:#eaf0fb">${wn}%</b> ${sw>0?`<span style="color:#46d39a">▲${sw}</span>`:sw<0?`<span style="color:#ef5b6b">▼${-sw}</span>`:''} · MOM ${CG.mom>0?'+':''}${CG.mom}</span></div>`; })();
    if(CG._playerBeat) h+=`<div style="margin-top:9px;font-size:13.5px;color:#d8e2f2">⭐ <i>${esc(CG._playerBeat)}</i></div>`;
  }
  h+=`</div>`; return h;
}
// ── compact one-strip scorebug + win bar + down/distance (replaces the 3-row scoreboard on the game screen)
function cgScorebugHTML(home,away){
  const per=CG.q>4?'OT':'Q'+CG.q, clk=`${Math.floor(CG.clock/60)}:${String(Math.max(0,CG.clock%60)).padStart(2,'0')}`;
  const poss=(CG._scoreView||CG).poss, wp=cgWinProb(CG._scoreView||CG), homeWp=CG.userSide==='h'?wp:100-wp;
  return `<div class="cg-scorebug">
    <div class="cg-sb-team away"><span class="cg-sb-dot" style="color:${away.pri||'#888'}">${poss==='a'?'●':''}</span><b class="cg-sb-ab" style="color:${away.pri||'#cfe0ff'}">${away.abbr}</b><span class="cg-sb-score">${CG.as}</span></div>
    <div class="cg-sb-clock"><div class="cg-sb-per">${per}</div><div class="cg-sb-time">${clk}</div></div>
    <div class="cg-sb-team home"><span class="cg-sb-score">${CG.hs}</span><b class="cg-sb-ab" style="color:${home.pri||'#cfe0ff'}">${home.abbr}</b><span class="cg-sb-dot" style="color:${home.pri||'#888'}">${poss==='h'?'●':''}</span></div>
  </div>
  <div class="cg-sb-bar"><i style="width:${Math.round(homeWp)}%;background:${home.pri||'var(--acc)'}"></i></div>`;
}
function cgSituationMode(){ const d=CG.down,on=CG.ballOn,clk=CG.clock,q=CG.q;
  if(CG.over) return {mode:'FINAL',color:'#8294ad'};
  if(d>=4) return {mode:'4TH DOWN',color:'#ff6470',pulse:true};
  if(on>=80) return {mode:'RED ZONE',color:'#ff6470'};
  if(d>=3) return {mode:'MUST CONVERT',color:'#e8b341'};
  if((q===2||q===4)&&clk<=120) return {mode:'TWO-MINUTE',color:'#5bbcff'};
  return {mode:'ON SCHEDULE',color:'#5bbcff'};
}
function cgSituationBarHTML(){ const m=cgSituationMode(), on=CG.ballOn;
  const dd=`${CG.down===1?'1ST':CG.down===2?'2ND':CG.down===3?'3RD':'4TH'} & ${CG.toGo>=100-on?'GOAL':CG.toGo}`;
  const field=on<=50?`OWN ${on}`:`OPP ${100-on}`;
  return `<div class="cg-situbar ${m.pulse?'cg-pulse':''}" style="--sc:${m.color}"><div class="cg-situ-dd">${dd}</div><div class="cg-situ-field">${field}</div><div class="cg-situ-chip">${m.mode}</div></div>`;
}
function cgMomentumPillHTML(){
  // CG.mom is always user-relative (+ good for the user, - bad) — see accrual sites in cgSnap.
  const m=CG.mom||0; if(Math.abs(m)<=44) return '';
  return `<div class="cg-mom-pill ${m>0?'hot-good':'hot-bad'}">🔥 MOMENTUM SWINGING ${m>0?'YOUR WAY':'AGAINST YOU'}</div>`;
}
function cgCoordStripHTML(uOnO, plan){ if(!plan||!plan.safe||!plan.safeReason) return '';
  const role=uOnO?'OC':'DC', reason=String(plan.safeReason).replace(/\.$/,'');
  return `<div class="cg-coord"><span class="cg-coord-badge">${role}</span><span class="cg-coord-line"><b>${esc(plan.safe.label)}</b> — ${esc(reason.length>74?reason.slice(0,72)+'…':reason)}</span></div>${cgMomentumPillHTML()}`;
}
function cgPlayTag(p,uOnO){ if(!uOnO) return (p.shell||p.front||'COVERAGE'); const t=p.type==='run'?'RUN':(p.profile==='deep'||p.profile==='vertical')?'DEEP SHOT':(p.profile==='pa'||p.family==='pa')?'PLAY-ACTION':(p.profile==='screen')?'SCREEN':'PASS'; return `${t}${p.personnel?' · '+p.personnel:''}`; }
// the 4 big primary calls — the focal point of the call screen
function cgPlayIntent(p, uOnO){
  if(!uOnO){ const s=((p.front||'')+' '+(p.shell||'')+' '+(p.label||'')).toLowerCase();
    if(/blitz|pressure|mug|fire|heat/.test(s)) return {label:'BLITZ',icon:'⚡',color:'#ff8fa3'};
    if(/press|man|lock|island/.test(s)) return {label:'PRESS',icon:'🔒',color:'#c79bff'};
    if(/cover|zone|quarter|two-high|shell|cloud/.test(s)) return {label:'COVER',icon:'☂',color:'#5bbcff'};
    return {label:'BASE',icon:'🛡',color:'#7bdcb5'}; }
  if(p.type==='run') return {label:'RUN',icon:'🏃',color:'#7bdcb5'};
  const pr=((p.profile||'')+' '+(p.family||'')+' '+(p.label||'')).toLowerCase();
  if(/trick|gadget|reverse|flea|gimmick/.test(pr)) return {label:'TRICK',icon:'✦',color:'#ff8fa3'};
  if(/deep|vertical|shot|go\b|post|seam/.test(pr)) return {label:'DEEP SHOT',icon:'🎯',color:'#c79bff'};
  if(/\bpa\b|boot|play.?action|naked/.test(pr)) return {label:'PLAY-ACTION',icon:'🎭',color:'#f0b96b'};
  return {label:'SHORT PASS',icon:'➡',color:'#5bbcff'};
}
function cgPrimaryButtonsHTML(plays, plan, uOnO){
  return '<div class="cg-bigcall">'+plays.slice(0,4).map(p=>{
    const isSafe=plan.safe&&p.k===plan.safe.k, isCounter=plan.counter&&p.k===plan.counter.k&&!isSafe, it=cgPlayIntent(p,uOnO);
    const concept=esc(p.label), h=p.hint||(uOnO?'':(p.front||'')), line2=h?`${concept} · ${esc(String(h).slice(0,44))}`:concept;
    return `<button class="btn playbtn cg-callbtn ${isSafe?'is-rec':''} ${isCounter?'is-counter':''}" data-k="${p.k}"><div class="cg-cb-intent" style="color:${it.color}">${it.icon} ${it.label}</div><div class="cg-cb-concept">${line2}</div></button>`;
  }).join('')+'</div>';
}
function cgVerdictWord(){ const ls=CG._lastSnap; if(!ls) return null; const r=ls.r||{}, fd=ls.firstDown, mo=CG._moment, userOff=ls.pre&&ls.pre.poss===CG.userSide;
  const wasFourth=ls.pre&&ls.pre.down>=4, wasThird=ls.pre&&ls.pre.down>=3;
  if(ls.answer==='Special teams'){ const made=/good/i.test(ls.result), miss=/miss|no good/i.test(ls.result);
    return { word: made?'GOOD! +3' : miss?'NO GOOD' : 'PUNT', cls: made?(userOff?'good':'bad') : miss?(userOff?'bad':'good') : 'neu' }; }
  if(mo&&/TD|TOUCHDOWN/i.test(mo.kind||mo.label||'')) return {word:'TOUCHDOWN!',cls:userOff?'good':'bad'};
  if(r.turnover==='INT') return {word:'INTERCEPTED!',cls:userOff?'bad':'good'};
  if(r.turnover==='FUM') return {word:'FUMBLE!',cls:userOff?'bad':'good'};
  if(r.result==='sack') return {word:userOff?'SACKED!':'SACK!',cls:userOff?'bad':'good'};
  // fourth down is win/lose-the-drive theater — a non-conversion is a TURNOVER ON DOWNS, not a quiet yardage line
  if(wasFourth && !fd) return {word:'TURNOVER ON DOWNS!',cls:userOff?'bad':'good'};
  if(wasFourth && fd) return {word:'CONVERTED! 4TH DOWN!',cls:userOff?'good':'bad'};
  if(r.result==='incomplete') return /drop/i.test(ls.text||'')?{word:'DROPPED!',cls:'bad'}:{word:'INCOMPLETE',cls:'neu'};
  if(fd) return {word:'FIRST DOWN!',cls:userOff?'good':'bad'};
  // a 3rd-down snap that stays short of the sticks is a STOP for the defense, even if yardage is positive
  if(wasThird && !fd) return {word:'STOP! NO CONVERSION',cls:userOff?'bad':'good'};
  if((r.yards||0)<=0) return {word:'STUFFED!',cls:userOff?'bad':'good'};
  if((r.yards||0)>=20) return {word:'BIG GAIN!',cls:userOff?'good':'bad'};
  return {word:`+${r.yards||0} YARDS`,cls:'neu'};
}
// SCOREBOARD CELEBRATION — a big animated banner with confetti + the updated score, on touchdowns (and made field goals)
function cgCelebrationHTML(){ const mo=CG._moment; if(!mo) return ''; const td=mo.kind==='TD', fg=mo.kind==='FG'; if(!td&&!fg) return '';
  const sd=(CG._lastSnap&&CG._lastSnap.pre&&CG._lastSnap.pre.poss)||CG.poss, t=cgTeam(sd)||{}, a=team(CG.away)||{}, h=team(CG.home)||{};
  const conf=Array.from({length:td?20:10}).map((_,i)=>`<i style="left:${(i*47%100)}%;--d:${((i*53%100)/100).toFixed(2)};--h:${['var(--c1)','var(--c2)','#fff','#ffd24a'][i%4]}"></i>`).join('');
  return `<div class="cg-celebrate ${td?'td':'fg'}" style="--c1:${t.pri||'#46d39a'};--c2:${t.sec||'#ffffff'}">
    <div class="cg-celebrate-conf">${conf}</div>
    <div class="cg-celebrate-word">${td?'🏈 TOUCHDOWN':"IT'S GOOD! +3"}</div>
    <div class="cg-celebrate-team">${esc(((t.city||'')+' '+(t.nick||'')).trim()||t.abbr||'')}</div>
    <div class="cg-celebrate-score">${esc(a.abbr||'')} <b>${CG.as}</b> &nbsp;—&nbsp; <b>${CG.hs}</b> ${esc(h.abbr||'')}</div>
  </div>`; }
function cgVerdictHeroHTML(){ const ls=CG._lastSnap, v=cgVerdictWord(), r=(ls&&ls.r)||{};
  const isTD=CG._moment&&/TD|TOUCHDOWN/i.test(CG._moment.kind||CG._moment.label||'');
  const showYds = r.result!=='incomplete' && !r.turnover && Math.abs(r.yards||0)>=1 && !isTD;
  return `<div class="cg-verdict ${v?v.cls:'neu'}">${CG._moment?`<div class="cg-vmoment" style="--mc:${CG._moment.c}">${CG._moment.label}</div>`:''}<div class="cg-verdict-word">${v?v.word:(ls?esc(ls.result):'')}</div>${showYds?`<div class="cg-verdict-yds">${(r.yards>=0?'+':'')}${r.yards}</div>`:''}<div class="cg-verdict-flavor">${esc((ls&&ls.text)||'')}</div></div>`;
}
function cgResultStatLine(){ const ls=CG._lastSnap, r=(ls&&ls.r)||{};
  const dd=`${CG.down===1?'1st':CG.down===2?'2nd':CG.down===3?'3rd':'4th'} & ${CG.toGo>=100-CG.ballOn?'Goal':CG.toGo}`;
  const clk=`${Math.floor(CG.clock/60)}:${String(Math.max(0,CG.clock%60)).padStart(2,'0')}`;
  const yd=r.result==='incomplete'?'+0':`${(r.yards>=0?'+':'')}${r.yards||0}`;
  return `${dd} → ${yd} · ${clk} · ${cgTeam(CG.poss).abbr} ball`; }
// the "needle" line — win prob swing + momentum, so a stop/TD/turnover visibly moves the room, not just a quiet stat
function cgMomentumSwingHTML(){
  const ls=CG._lastSnap; if(!ls||!ls.pre) return '';
  const wn=Math.round(cgWinProb()), before=Math.round(cgWinProb(ls.pre)), sw=wn-before;
  const arrow=sw>0?`<span class="cg-swing-up">▲ ${sw}</span>`:sw<0?`<span class="cg-swing-dn">▼ ${-sw}</span>`:`<span class="cg-swing-flat">—</span>`;
  const momAbs=Math.abs(CG.mom||0), momHot=momAbs>=45, momLabel=CG.mom>0?'YOU':'THEM';
  const momHTML=momHot?`<span class="cg-mom-hot">🔥 MOMENTUM — ${esc(momLabel)}</span>`:'';
  return `<div class="cg-needle"><span class="cg-needle-lbl">WIN</span><b class="cg-needle-val">${wn}%</b>${arrow}<span class="cg-needle-mom">MOM ${CG.mom>0?'+':''}${CG.mom}</span>${momHTML}</div>`;
}
function cgProcessGrade(){ const ls=CG._lastSnap; if(!ls||!ls.r) return ''; const r=ls.r, fd=ls.firstDown, userOff=ls.pre&&ls.pre.poss===CG.userSide, g=(ls.grade&&ls.grade.score!=null)?ls.grade.score:55;
  let txt;
  if(fd) txt='Right call, right time — on schedule.';
  else if(r.result==='incomplete'&&/drop/i.test(ls.text||'')) txt='Right look — hands let you down.';
  else if(r.turnover) txt=g>=48?'Sound call — they just made the play.':'Forced it. Take what they give next.';
  else if(g>=60) txt='Good process, tough rep.';
  else if(g<=36) txt=userOff?'Too cute for the down.':'They keyed it — change the picture next.';
  else txt='Sound call — they made the stop.';
  return `<div class="cg-yourcall"><span class="cg-yc-dot"></span>YOUR CALL · ${txt}</div>`;
}
function cgDriveSummaryLine(){ const d=CG._drive||CG._lastDrive, t=cgTeam(CG.poss);
  if(d && d.plays!=null && d.plays>0) return `${(cgTeam(d.side)||t).abbr} drive: ${d.plays} play${d.plays===1?'':'s'}, ${d.yards||0} yds${d.firstDowns?` · ${d.firstDowns} first down${d.firstDowns===1?'':'s'}`:''}`;
  return `${t.abbr} ball · ${CG.down} & ${CG.toGo>=100-CG.ballOn?'Goal':CG.toGo}`; }
// the slide-in "Coordinator" drawer — everything that used to clutter the screen lives here, opened on demand
function cgDrawerHTML(uOnO, visiblePlays, coachPlan, sheetName){
  if(!CG._drawer) return '';
  const tab=CG._drawerTab||'stats';
  const tabs=[['coach','Coach'],['gameplan','Gameplan'],['stats','Stats'],['league','League'],['setup','Setup']];
  let body='';
  if(tab==='coach'){ body=cgCoachCardHTML(uOnO,visiblePlays,sheetName,coachPlan)+cgTendencyStripHTML(uOnO,coachPlan); }
  else if(tab==='gameplan'){ const gp=CG.gameplan||{};
    body=`<div class="cg-panel-title">GAMEPLAN — biases your sheet & edges</div><div class="row" style="gap:5px;flex-wrap:wrap">`
      +`<button class="btn ${gp.runPass>0.6?'':'sec'}" data-gp="run">Run Heavy</button><button class="btn ${gp.runPass<0.4?'':'sec'}" data-gp="pass">Pass Heavy</button><button class="btn ${gp.featureRB?'':'sec'}" data-gp="rb">Feature RB</button><button class="btn ${gp.attackWR1?'':'sec'}" data-gp="wr1">Attack WR1</button><button class="btn ${gp.protectPass?'':'sec'}" data-gp="protect">Protect Pass</button><button class="btn ${gp.spyQB?'':'sec'}" data-gp="spy">Spy QB</button></div>`
      +(CG.q===3&&!CG._halftimeAdj?`<div class="cg-panel" style="border-color:#f0b23f;margin-top:10px"><div class="cg-panel-title">HALFTIME ADJUSTMENTS</div><div class="row" style="gap:5px;flex-wrap:wrap"><button class="btn" data-half="moreRun">More Run</button><button class="btn" data-half="morePass">More Pass</button><button class="btn" data-half="protect">Protect More</button><button class="btn sec" data-half="done">Done</button></div></div>`:''); }
  else if(tab==='stats'){ body=cgDrivePanelHTML()+cgTextBoxHTML()+cgTextDriveHTML(); }
  else if(tab==='league'){ body=`<div class="cg-panel-title">Around the league</div>`+cgLeagueTextHTML(); }
  else if(tab==='setup'){ body=`<div class="cg-panel-title">Game controls</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px"><button class="btn ${CG.autoAdv?'':'sec'}" id="cgautoadv">⚡ Auto-play ${CG.autoAdv?'ON':'OFF'}</button><button class="btn sec" id="cgsim">Sim to end</button><button class="btn sec" id="cgquit">Quit to menu</button></div><p class="muted" style="font-size:12px">🔊 Spoken-voice setup lives in the <b>Gazette → Voice</b> card.</p>`; }
  return `<div class="cg-drawer-scrim" id="cgdrawerscrim"></div><aside class="cg-drawer"><div class="cg-drawer-head"><b>📋 Coordinator</b><button class="cg-drawer-x" id="cgdrawerx">✕</button></div>
    <div class="cg-drawer-tabs">${tabs.map(([k,l])=>`<button class="btn ${tab===k?'':'sec'}" data-dtab="${k}">${l}</button>`).join('')}</div>
    <div class="cg-drawer-body">${body}</div></aside>`;
}
function cgWireDrawer(uOnO){
  const open=$('#cgdrawerbtn'); if(open)open.onclick=()=>{ CG._drawer=!CG._drawer; if(CG._drawer&&!CG._drawerTab)CG._drawerTab='stats'; render(); };
  const x=$('#cgdrawerx'); if(x)x.onclick=()=>{ CG._drawer=false; render(); };
  const scrim=$('#cgdrawerscrim'); if(scrim)scrim.onclick=()=>{ CG._drawer=false; render(); };
  document.querySelectorAll('[data-dtab]').forEach(b=>b.onclick=()=>{ CG._drawerTab=b.dataset.dtab; render(); });
  document.querySelectorAll('[data-gp]').forEach(b=>b.onclick=()=>{ const k=b.dataset.gp, g=CG.gameplan||(CG.gameplan={}); if(k==='run')g.runPass=0.75; else if(k==='pass')g.runPass=0.25; else if(k==='rb')g.featureRB=!g.featureRB; else if(k==='wr1')g.attackWR1=!g.attackWR1; else if(k==='protect')g.protectPass=!g.protectPass; else if(k==='spy')g.spyQB=!g.spyQB; render(); });
  document.querySelectorAll('[data-half]').forEach(b=>b.onclick=()=>{ const k=b.dataset.half, g=CG.gameplan||(CG.gameplan={}); if(k==='moreRun'){g.runPass=0.8;g.protectPass=false;} else if(k==='morePass'){g.runPass=0.2;} else if(k==='protect'){g.protectPass=true;} else if(k==='done'){CG._halftimeAdj=true;} render(); });
  const sm=$('#cgsim'); if(sm)sm.onclick=cgSimToEnd;
  const qt=$('#cgquit'); if(qt)qt.onclick=()=>{ if(confirm('Quit the game? Your game won\'t be resolved.')){ CG=null; render(); } };
  const aa=$('#cgautoadv'); if(aa)aa.onclick=()=>{ CG.autoAdv=!CG.autoAdv; render(); };
}
function cgLivePlayStripHTML(){
  const sv=CG._scoreView||CG, dn=sv.down||CG.down, tg=(sv.toGo!=null?sv.toGo:CG.toGo);   // pre-snap situation (no post-play spoiler)
  const dd=`${dn===1?'1ST':dn===2?'2ND':dn===3?'3RD':'4TH'} & ${tg>=100-CG.ballOn?'GOAL':tg}`;
  // show staged narration text (pre-snap call or read line) if set; fall back to generic play tag
  const vp=CG._lastVizScript&&CG._lastVizScript.play;
  const fallback=vp==='pass'?'the pass is up':vp==='run'?'the run is away':'the snap is away';
  const liveText=CG.lastText||(`<b>${dd}</b> · ${fallback}…`);
  return `<div class="cg-lastplay cg-live"><span class="cg-live-dot"></span><span class="cg-lp-text">${liveText}</span>${(typeof TTS!=='undefined'&&!TTS.isDisabled())?`<button onclick="cgToggleVoice()" class="cg-lp-voice" title="spoken play-by-play">${TTS.enabled()?'🔊':'🔇'}</button>`:''}</div>`; }
function cgLastPlayStripHTML(){ const t=stripHTML(CG.lastText||'').trim(); if(!t) return '';
  return `<div class="cg-lastplay"><span class="cg-lp-icon">\ud83d\udce3</span><span class="cg-lp-text">${esc(t)}</span>${(typeof TTS!=='undefined'&&!TTS.isDisabled())?`<button onclick="cgToggleVoice()" class="cg-lp-voice" title="spoken play-by-play">${TTS.enabled()?'\ud83d\udd0a':'\ud83d\udd07'}</button>`:''}</div>`; }
function cgFieldBandHTML(){ if(CG&&CG._field===false) return ''; return '<canvas class="cg-field" aria-label="play view"></canvas>'; }
function cgMountField(mode, onDone){
  if(typeof SIM==='undefined'||typeof SIM.FieldSim!=='function') return;
  const cv=document.querySelector('canvas.cg-field'); if(!cv) return;
  const dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth||cv.offsetWidth||720, h=cv.clientHeight||cv.offsetHeight||240;
  if(!w) return;
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
  const home=team(CG.home), away=team(CG.away);
  if(CGSIM){ try{CGSIM.stop();}catch(e){} CGSIM=null; }
  const mk=(o,d,play,los,script)=>{
    const sim=new SIM.FieldSim(cv);
    sim.fieldTheme=home; sim.homeTeam=home; sim.awayTeam=away;
    sim.gameState={down:CG.down,toGo:CG.toGo,ballOn:CG.ballOn,poss:CG.poss,q:CG.q,clock:CG.clock};
    sim.ballHash=CG.ballHash!=null?CG.ballHash:1;
    sim.setup(o,d,play,10+los,script||null); return sim; };
  try{
    if(mode==='play' && CG._lastVizScript){
      const v=CG._lastVizScript, o=team(v.off), d=team(v.def); if(!o||!d){ return; }
      CGSIM=mk(o,d,v.play,v.los,v.script);
      if(CG._vizShownTok!==CG._playTok){ CG._vizShownTok=CG._playTok; CGSIM.animateLive(onDone||null,1,34); return true; }
      else { let g=0; while(!CGSIM.result&&g<520){ CGSIM.step(1/30); g++; } CGSIM.draw(); }
    } else {
      const o=cgTeam(CG.poss), d=cgTeam(CG.poss==='h'?'a':'h'); if(!o||!d){ return; }
      CGSIM=mk(o,d,'run',CG.ballOn,null); CGSIM.draw();
    }
  }catch(e){}
}
function cgRenderTextCast(m){
  const home=team(CG.home), away=team(CG.away), uOnO=cgUserOnO();
  CG._viz=null; CG._anim=null; if(CGSIM)CGSIM.stop();
  cgMaybeSpeak();
  const shell=el('div','cg-shell cg-textcast'); m.appendChild(shell);
  shell.innerHTML=cgScorebugHTML(home,away);
  shell.insertAdjacentHTML('afterbegin', `<button class="cg-peek-btn" onclick="document.body.classList.toggle('cg-peek')" title="show / hide the franchise menu">\u2630</button>`);
  if(!CG._snapped && CG._prep && !CG.over) shell.insertAdjacentHTML('beforeend', cgPregameHTML());
  const seq=CG._renderSeq=(CG._renderSeq||0)+1, later=fn=>setTimeout(()=>{ if(!CG||CG._renderSeq!==seq) return; if(fn)fn(); },0);
  if(CG.coin&&CG.coin.pending){ const c=el('div'); c.innerHTML=cgTextCoinCardHTML(); shell.appendChild(c.firstChild);
    later(()=>{ const rec=$('#cgreceive'); if(rec)rec.onclick=()=>cgResolveCoin('receive'); const def=$('#cgdefer'); if(def)def.onclick=()=>cgResolveCoin('defer'); const ko=$('#cgkickoff'); if(ko)ko.onclick=()=>cgResolveCoin(); });
    return; }
  if(CG.over){ const won=(CG.userSide==='h'?CG.hs>CG.as:CG.as>CG.hs), c=el('div','card cg-control-card cg-text-final');
    c.innerHTML=`<div class="cg-panel-title">Final</div><div class="stat s" style="font-size:30px;margin:4px 0">${away.abbr} ${CG.as} - ${CG.hs} ${home.abbr}</div><div class="${won?'good':'bad'}" style="font-weight:800;font-family:var(--mono)">${won?'You win.':'Tough loss.'}</div><div style="margin-top:12px">${cgBoxHTML()}</div><div class="row" style="margin-top:12px;gap:8px">${(CG.opts&&CG.opts.week)?`<button class="btn" id="cgdoneadv" style="flex:1">Advance to next week ▶</button>`:''}<button class="btn ${(CG.opts&&CG.opts.week)?'sec':''}" id="cgdone" style="${(CG.opts&&CG.opts.week)?'':'flex:1'}">${(CG.opts&&CG.opts.week)?'Continue — handle your week first':'Continue'}</button></div>`;
    shell.appendChild(c); later(()=>{ const d=$('#cgdone'); if(d)d.onclick=cgFinish; const da=$('#cgdoneadv'); if(da)da.onclick=cgFinishAdvance; }); return; }
  if(CG.pat && !CG._scoreView){ const c=el('div','card cg-control-card'); c.innerHTML=`<h3>${cgTeam(CG.pat).abbr} touchdown — extra point?</h3><div class="flex"><button class="btn" id="cgxp">Kick XP (+1)</button><button class="btn warn" id="cg2pt">Go for 2 (+2)</button></div>`;
    shell.appendChild(c); later(()=>{ const xp=$('#cgxp'); if(xp)xp.onclick=()=>cgPAT(false); const tp2=$('#cg2pt'); if(tp2)tp2.onclick=()=>cgPAT(true); }); return; }
  const userTeam=cgTeam(CG.userSide), userPb=ensureTeamPlaybook(userTeam), sheetCtx=cgPlayCtx(CG.userSide);
  const plays=uOnO?teamPlaySheet(userTeam,'off',sheetCtx):teamPlaySheet(userTeam,'def',sheetCtx);
  const visiblePlays=cgVisiblePlays(plays,uOnO), coachPlan=cgCoachPlan(uOnO,visiblePlays), tabs=cgPlayTabs(uOnO);
  const sheetName=uOnO?userPb.off.label:userPb.def.label;
  if(CG._scoreView){
    shell.insertAdjacentHTML('beforeend', cgFieldBandHTML());
    if(CG._animating){
      // ── LIVE: the field plays the snap out, the booth CALLS it, and the verdict is WITHHELD until the play freezes ──
      shell.insertAdjacentHTML('beforeend', cgLivePlayStripHTML());
      shell.insertAdjacentHTML('beforeend', cgDrawerHTML(uOnO, visiblePlays, coachPlan, sheetName));
      later(()=>{
        const sq=CG._renderSeq;
        const reveal=()=>{
          if(!(CG&&CG._scoreView&&CG._animating&&CG._renderSeq===sq)) return;
          if(CGSIM){try{CGSIM.stop();}catch(e){}}
          CG._animating=false;
          cgCommitPendingResult();   // swap in result text/color/moment before re-render
          render();
        };
        const started=cgMountField('play', reveal);   // animation onDone → reveal exactly when the play freezes
        // The animation's onDone (guaranteed by animateLive's step guard) drives the reveal at the real play end.
        // This timer is only a backstop: generous when a field is animating (so it never truncates a long breakaway),
        // quick when there's no field to animate.
        setTimeout(reveal, started ? Math.max((CG._animMs||2100)+900, 14000) : 120);   // generous backstop so a long breakaway run is never truncated; onDone drives the real reveal
        const onKey=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); reveal(); } };   // impatient coach can skip to the result
        if(window._cgNextKey) window.removeEventListener('keydown',window._cgNextKey); window._cgNextKey=onKey; window.addEventListener('keydown',onKey);
        const cv=document.querySelector('canvas.cg-field'); if(cv){ cv.style.cursor='pointer'; cv.onclick=reveal; }
        cgWireDrawer(uOnO);
        // ── event-driven narration: wire sim physics → on-call text (replaces fixed 38%-of-duration _pendingRead timer) ──
        CG._pendingRead=null;   // retire the timer path; event bus takes over for live plays
        if(started && CGSIM){
          const _evSq=sq;   // capture seq for stale-play guard
          CGSIM.onEvent=(type,data)=>{
            if(!CG||!CG._scoreView||!CG._animating||CG._renderSeq!==_evSq) return;
            // ---- special teams: kicks narrate their own beats (snap → kick away); scrimmage pools don't apply ----
            const _vzPlay=CG._lastVizScript&&CG._lastVizScript.play;
            if(_vzPlay==='punt'||_vzPlay==='fg'){
              let stxt=null;
              if(type==='snap') stxt=_vzPlay==='punt'?'Long snap is back — the punter waits…':'Snap is down, the hold is good…';
              else if(type==='kickaway') stxt=_vzPlay==='punt'?'The punt is away — hanging up there…':`The kick is up${data&&data.dist?` from ${data.dist}`:''} — it's turning…`;
              if(stxt){ CG.lastText=stxt; const strip=document.querySelector('.cg-lastplay .cg-lp-text, .cg-live .cg-lp-text'); if(strip) strip.innerHTML=stxt; }
              return;
            }
            const act=CG._lastAct||{};
            const qbName=(act.qb&&act.qb.last)||'the QB';
            const rbName=(act.rb&&act.rb.last)||(act.qb&&act.qb.last)||'the back';
            const tgtName=(act.target&&act.target.last)||null;
            let txt=null;
            // pull varied broadcast color from the pbpgen 'live' pools; fall back to plain phrasing if unavailable
            const L=(window.PBPGEN&&PBPGEN.radio&&PBPGEN.radio.live)||null;
            const V={qb:qbName, rb:rbName, tgt:tgtName||'his man', db:'the defender'};
            const pk=(pool,fb)=>{ const a=L&&L[pool]; return (a&&a.length&&typeof rpick==='function'&&typeof fillTpl==='function')?fillTpl(rpick(a),V):fb; };
            if(type==='snap'){
              // pre-snap already showing; snap fires at frame 0 — update to action line
              txt = data.play==='pass' ? pk('snapPass',`Snap — ${qbName} dropping back…`) : pk('snapRun',`Snap — handoff to ${rbName}…`);
            } else if(type==='dropback'){
              txt = pk('dropback', tgtName ? `${qbName} drops, looking for ${tgtName}…` : `${qbName} drops back, surveying the field…`);
            } else if(type==='handoff'){
              txt = data.scramble ? pk('scramble',`${qbName} tucks it and runs!`) : pk('handoff',`Handoff to ${rbName} — hitting the line…`);
            } else if(type==='throw'){
              if(data.target&&data.target.last) V.tgt=data.target.last;
              const known=V.tgt!=='his man';
              txt = data.deep ? pk('throwDeep', known?`${qbName} launches it deep for ${V.tgt}…`:`${qbName} goes deep…`)
                              : pk('throwShort', known?`${qbName} fires for ${V.tgt}…`:`${qbName} fires downfield…`);
            } else if(type==='catch'){
              if(data.receiver&&data.receiver.last) V.tgt=data.receiver.last;
              txt = pk('catch', V.tgt!=='his man'?`Caught — ${V.tgt} with the reception!`:`Caught!`);
            } else if(type==='incomplete'){
              if(data.target&&data.target.last) V.tgt=data.target.last;
              txt = pk('incomplete', V.tgt!=='his man'?`Incomplete — off the mark for ${V.tgt}.`:`Incomplete.`);
            } else if(type==='intercepted'){
              if(data.db&&data.db.last) V.db=data.db.last;
              txt = pk('int', data.db&&data.db.last?`INTERCEPTED by ${data.db.last}!`:`INTERCEPTED!`);
            } else if(type==='pick6'){
              if(data.db&&data.db.last) V.db=data.db.last;
              txt = pk('pick6', data.db&&data.db.last?`PICK SIX — ${data.db.last} takes it the other way!`:`PICK SIX!`);
            } else if(type==='breakTackle'){
              if(data.carrier&&data.carrier.last) V.rb=data.carrier.last;
              txt = pk('breakTackle', data.carrier&&data.carrier.last?`${data.carrier.last} breaks a tackle — still going!`:`Breaks a tackle!`);
            } else if(type==='touchdown'){
              const nm=data.carrier&&data.carrier.last;
              txt = nm?`TOUCHDOWN — ${nm}!`:pk('touchdown',`TOUCHDOWN!`);
            } else if(type==='sack'){
              txt = data.monster ? `BURIED! ${qbName} is sacked!` : pk('sack',`Sacked — ${qbName} goes down!`);
            } else if(type==='tackle'){
              const nm=data.carrier&&data.carrier.last;
              const g=data.gain!=null?data.gain:null;
              if(nm&&g!=null) txt=`${nm} ${g>=0?'picks up':'loses'} ${Math.abs(g)}.`;
              else txt=null; // let reveal handle final
            }
            if(txt){
              CG.lastText=txt;
              const strip=document.querySelector('.cg-lastplay .cg-lp-text, .cg-live .cg-lp-text');
              if(strip) strip.innerHTML=txt;
            }
          };
        }
      });
      return;
    }
    // ── REVEAL: the play is over — verdict hero (color-flash + word + yards) · stat line · grade · Next ──
    shell.insertAdjacentHTML('beforeend', cgCelebrationHTML()+cgVerdictHeroHTML());
    cgSpeakColor();   // the analyst's reaction lands now, on the frozen result
    const c=el('div','card cg-control-card cg-result-foot');
    c.innerHTML=`<div class="cg-statline">${cgResultStatLine()}</div>${CG.pat?'':(cgMomentumSwingHTML()+cgProcessGrade())}`
      +(CG.lastColor?`<div style="margin-top:8px;padding:8px 10px;border-radius:7px;background:#0c1322;border-left:3px solid #c9a054"><span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#caa46a">🎙️ ${(CG.analyst||'IN THE BOOTH').toUpperCase()}</span><div style="font-size:13px;line-height:1.4;font-style:italic;color:#d6cdbb;margin-top:2px">${esc(CG.lastColor)}</div></div>`:'')
      +(CG._sideline?`<div class="cg-sideline">🎙️ <b style="color:${CG._sideline.c};font-style:normal">${CG._sideline.rep}</b>: "${esc(CG._sideline.line)}"</div>`:'')
      +(CG.pat
        ? `<div class="cg-pat-foot" style="margin-top:6px;font-family:var(--mono);font-size:12px;color:#9fb0c8">EXTRA POINT — your call</div><div class="row" style="gap:8px;margin-top:8px"><button class="btn" id="cgxp" style="flex:1;padding:13px;font-size:15px;font-weight:800">🦵 Kick XP <span style="opacity:.6;font-weight:500;font-size:12px">+1</span></button><button class="btn warn" id="cg2pt" style="flex:1;padding:13px;font-size:15px;font-weight:800">💪 Go for 2 <span style="opacity:.6;font-weight:500;font-size:12px">+2</span></button></div>`
        : `<div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="cgnext" style="flex:1;padding:13px;font-size:15px;font-weight:800">▶ Next play <span style="opacity:.6;font-weight:500;font-size:12px">— Enter / Space</span></button><button class="btn ${CG.autoAdv?'':'sec'}" id="cgautoadv2" style="padding:13px 14px;font-size:13px">⚡ Auto</button><button class="btn sec" id="cgdrawerbtn" style="padding:13px 13px" title="Coordinator — stats, gameplan, chess">📋</button></div>`);
    shell.appendChild(c);
    shell.insertAdjacentHTML('beforeend', cgDrawerHTML(uOnO, visiblePlays, coachPlan, sheetName));
    later(()=>{ cgMountField('play');
      if(CG.pat){   // TOUCHDOWN celebration is on screen — the extra-point choice lives right here
        const xp=$('#cgxp'); if(xp)xp.onclick=()=>cgPAT(false); const t2=$('#cg2pt'); if(t2)t2.onclick=()=>cgPAT(true);
        cgWireDrawer(uOnO); return;   // no auto-advance / Enter-skip — the kick is the user's call
      }
      const b=$('#cgnext'); if(b)b.onclick=cgNextPlay;
      const a2=$('#cgautoadv2'); if(a2)a2.onclick=()=>{ CG.autoAdv=!CG.autoAdv; render(); };
      const onKey=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); window.removeEventListener('keydown',onKey); window._cgNextKey=null; cgNextPlay(); } };
      if(window._cgNextKey) window.removeEventListener('keydown',window._cgNextKey); window._cgNextKey=onKey; window.addEventListener('keydown',onKey);
      cgWireDrawer(uOnO);
      if(CG.autoAdv){ const sq=CG._renderSeq; setTimeout(()=>{ if(CG&&CG._scoreView&&CG._renderSeq===sq&&CG.autoAdv) cgNextPlay(); }, 1700); } });
    return; }
  // ── CALL state: field formation · situation bar · last-play whisper · the action card (4 big calls) ──
  shell.insertAdjacentHTML('beforeend', cgFieldBandHTML());
  shell.insertAdjacentHTML('beforeend', cgSituationBarHTML());
  shell.insertAdjacentHTML('beforeend', cgLastPlayStripHTML());
  const c=el('div','card cg-control-card cg-call-card'), fourth=CG.down>=4, pcLeft=cgPlayClockLeft();
  let html=`<div class="cg-calltop"><div class="cg-callttl">${uOnO?'Call the play':'Set the defense'}</div>
    <div class="cg-calltools"><div id="cgplayclock" class="cg-playclock"><span class="cg-pc-lbl">PLAY</span><b class="cg-pc-num">${String(pcLeft).padStart(2,'0')}</b><div class="cg-pc-bar"><i style="width:${pcLeft/(CG.playClock||22)*100}%"></i></div></div>
      <select id="cgtempo" title="tempo"><option value="normal" ${CG.tempo==='normal'?'selected':''}>Normal</option><option value="hurry" ${CG.tempo==='hurry'?'selected':''}>Hurry</option><option value="chew" ${CG.tempo==='chew'?'selected':''}>Chew</option></select>
      <button class="btn sec" id="cgto" style="padding:5px 10px">⏱ ${CG.to[CG.userSide]||0}</button>
      <button class="btn sec" id="cgdrawerbtn" style="padding:5px 10px" title="Coordinator — chess, gameplan, stats">📋</button></div></div>`;
  html+=cgCoordStripHTML(uOnO, coachPlan);
  html+=cgKeyOnHTML();
  html+=cgDefFourthAlertHTML();
  html+=cgOffFourthAdviceHTML(uOnO);
  html+=cgPrimaryButtonsHTML(visiblePlays, coachPlan, uOnO);
  if(uOnO&&fourth){ const fgDist=100-CG.ballOn+17; html+=`<div class="cg-fourth"><button class="btn warn" data-sp="punt">Punt it away</button>`+(fgDist<=58?`<button class="btn warn" data-sp="fg">Field Goal (${fgDist} yd)</button>`:'')+`<span class="muted" style="align-self:center;font-size:12px">4th & ${CG.toGo}</span></div>`; }
  html+=`<button class="btn sec cg-fullsheet-toggle" id="cgfullsheet">${CG._fullSheet?'▴ Hide full sheet':`▾ Full sheet (${visiblePlays.length} plays)`}</button>`;
  if(CG._fullSheet){
    html+=`<div class="cg-sheet-tabs">${tabs.map(([k,l])=>`<button class="btn ${CG.sheetCat===k?'':'sec'}" data-cat="${k}">${l}</button>`).join('')}</div>`;
    html+='<div class="playgrid compact">'+visiblePlays.map(p=>{ const meta=uOnO?`${p.personnel} · ${p.formation}`:`${p.front} · ${p.shell}`; const isSafe=coachPlan.safe&&p.k===coachPlan.safe.k; return `<button class="btn sec playbtn ${isSafe?'suggested':''}" data-k="${p.k}"><b>${esc(p.label)}</b><span>${meta}</span><span>${p.hint}</span></button>`; }).join('')+'</div>';
  }
  c.innerHTML=html; shell.appendChild(c);
  shell.insertAdjacentHTML('beforeend', cgDrawerHTML(uOnO, visiblePlays, coachPlan, sheetName));
  later(()=>{ cgMountField('call'); const te=$('#cgtempo'); if(te)te.onchange=e=>{ CG.tempo=e.target.value; CG.hurry=CG.tempo==='hurry'; }; const to=$('#cgto'); if(to)to.onclick=cgTimeout;
    c.querySelectorAll('.playbtn').forEach(b=>b.onclick=()=>cgSnap(b.dataset.k));
    c.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>cgSpecial(b.dataset.sp));
    c.querySelectorAll('[data-keyon]').forEach(b=>b.onclick=()=>{ const v=b.dataset.keyon; CG.keyOn = v?{id:+v.split('~')[0],type:v.split('~')[1]}:null; render(); });
    c.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ CG.sheetCat=b.dataset.cat; render(); });
    const fs=$('#cgfullsheet'); if(fs)fs.onclick=()=>{ CG._fullSheet=!CG._fullSheet; render(); };
    cgWirePlayClock(); cgWireDrawer(uOnO);
    if(CG.autoAdv){ const sq=CG._renderSeq; setTimeout(()=>{ if(CG&&!CG._scoreView&&!CG.over&&!CG.pat&&!(CG.coin&&CG.coin.pending)&&CG._renderSeq===sq&&CG.autoAdv){ const k=(coachPlan&&coachPlan.safe&&coachPlan.safe.k)||(visiblePlays[0]&&visiblePlays[0].k); if(k) cgSnap(k); } }, 1300); } });
}
function cgRenderBroadcast(m){
  return cgRenderTextCast(m);
  const home=team(CG.home), away=team(CG.away), uOnO=cgUserOnO(), wx=WX[CG.weather]||WX.clear;
  const coinPending=!!(CG.coin&&CG.coin.pending);
  if(!document.getElementById('cgfx')){ const s=el('style'); s.id='cgfx'; s.textContent=''; document.head.appendChild(s); }
  const shell=el('div','cg-shell'); m.appendChild(shell);
  const grid=el('div','cg-gamegrid'), stage=el('section','cg-stadium-stage wx-'+(CG.weather||'clear')+(CG._scoreView?' cg-stage-playing':'')+(CG._moment?' cg-stage-moment':''));
  stage.style.setProperty('--home-pri', home.pri||'#5bbcff');
  stage.style.setProperty('--home-sec', home.sec||'#ffffff');
  stage.style.setProperty('--away-pri', away.pri||'#ff6470');
  stage.style.setProperty('--away-sec', away.sec||'#ffffff');
  const stageBg=el('div','cg-stadium-bg'), stageChrome=el('div','cg-stage-chrome'), stageCap=el('div','cg-stage-cap');
  const usePhoto=!BAD_STADIUM_ASSETS.has((home.abbr||'').toUpperCase());
  stageBg.innerHTML=venueArt(home,CG.weather,640,{fit:'cover',night:CG.slot&&CG.slot.prime,noPhoto:!usePhoto,stage:true});
  stageCap.innerHTML=`🏟️ <b>${(home.stadium&&home.stadium.name)||home.city+' Stadium'}</b> · ${home.city} · ${wx.icon} ${wx.label}${stadiumSurface(home.abbr)==='grass'?' · natural grass':' · turf'}${CG.intl?` · ${CG.intl.flag} ${CG.intl.venue} (neutral site)`:''}`;
  stage.appendChild(stageBg);
  stage.appendChild(el('div','cg-weather-curtain'));
  stage.appendChild(el('div','cg-crowd-vibe'+(CG._moment?' on':'')));
  if(coinPending||CG._moment) stage.insertAdjacentHTML('beforeend',cgJumbotronHTML(home,away));
  if(CG.slot){ const s=CG.slot, iv=CG.intl; const slot=el('div','cg-slot');
    slot.style.cssText+=iv?'background:linear-gradient(90deg,#0a1b2e,#103a52,#0a1b2e);border-color:#2f6f99':s.prime?'background:linear-gradient(90deg,#170f2e,#241a44,#170f2e);border-color:#4a3a7a':'';
    slot.innerHTML=`<span style="font-family:var(--disp,sans-serif);font-weight:800;letter-spacing:2px;color:${iv?'#7fd0ff':s.prime?'#cdbcff':'var(--acc,#5bbcff)'}">${iv?'':s.prime?'🌙 ':''}${s.label}</span> <span class="muted">· ${s.net} · Week ${G.week+1} · ${wx.icon} ${wx.label}</span>`+(CG.rivalry?` <span style="margin-left:8px;background:#b3001b;color:#fff;font-family:var(--mono);font-size:10px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:10px">RIVALRY · ${CG.rivalry.toUpperCase()}</span>`:'');
    stageChrome.appendChild(slot); }
  const st=cgScoreState(home,away);
  const toPips=side=>Array.from({length:3},(_,i)=>`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${i<(CG.to[side]||0)?'var(--acc)':'#263247'};margin-left:3px"></span>`).join('');
  const hud=el('div','cg-scorebug');
  hud.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center">
    <div class="row" style="gap:10px;min-width:160px">${logoTag(away,30)}<div><div class="muted" style="font-size:10px">${away.abbr}${st.awayPoss?' 🏈':''} · ${away.wins}-${away.losses} ${toPips('a')}</div><div class="stat s">${st.as}</div></div></div>
    <div style="text-align:center"><div class="stat" style="font-size:22px">${st.period} · ${st.clock}</div><div class="muted" style="font-family:var(--mono);font-size:12px">${st.status}</div></div>
    <div class="row" style="gap:10px;min-width:160px;justify-content:flex-end"><div style="text-align:right"><div class="muted" style="font-size:10px">${st.homePoss?'🏈 ':''}${home.abbr} · ${home.wins}-${home.losses} ${toPips('h')}</div><div class="stat s">${st.hs}</div></div>${logoTag(home,30)}</div></div>
    <div class="row" style="gap:14px;margin-top:6px"><span class="muted" style="font-size:10px;width:64px">WIN ${cgWinProb(CG._scoreView||CG)}%</span><div class="bar" style="flex:1"><i style="width:${50+CG.mom/2}%;background:${CG.mom>=0?'var(--good)':'var(--bad)'}"></i></div><span class="muted" style="font-size:10px;width:90px;text-align:right">MOMENTUM ${CG.mom>0?'+':''}${CG.mom}</span></div>`;
  stageChrome.appendChild(hud);
  const photoMode=usePhoto && !CG._scoreView;
  const fdwrap=el('div','cg-field cg-field-embed cg-field-live');
  if(photoMode) fdwrap.classList.add('cg-photo-field');
  if(CG._scoreView) fdwrap.classList.add('cg-snap-field');
  if(coinPending){ fdwrap.classList.add('cg-coin-field'); fdwrap.innerHTML='<div class="cg-midfield-coin"><span>Pregame</span><b>Coin toss at midfield</b></div>'; }
  else if(typeof SIM!=='undefined'){ const cv=el('canvas'); cv.id='cgcv'; cv.width=1400; cv.height=640; fdwrap.appendChild(cv); } else fdwrap.innerHTML=cgFieldHTML();
  stage.appendChild(fdwrap); stage.appendChild(stageChrome); stage.appendChild(stageCap);
  grid.appendChild(stage);
  const side=el('aside','cg-side'), call=el('div','cg-panel cg-radio-panel'), pbpC=CG._good?'var(--good)':CG._bad?'var(--bad)':'var(--acc,#5bbcff)';
  call.style.borderLeft=`4px solid ${pbpC}`;
  call.innerHTML=(CG._moment?`<div style="text-align:center;margin-bottom:8px;padding:7px;border-radius:9px;background:radial-gradient(circle at 50% 0%, ${CG._moment.c}33, #0a1320 72%);border:1px solid ${CG._moment.c}"><div style="font-family:var(--disp,sans-serif);font-weight:900;letter-spacing:2px;font-size:20px;color:${CG._moment.c};text-shadow:0 2px 10px ${CG._moment.c}99">${CG._moment.label}</div><div class="muted" style="font-size:11px">${CG._moment.crowd}</div></div>`:'')+
    cgRadioHTML()+
    (CG.lastCall?`<div class="cg-call-detail"><b style="color:#eaf0fb">${CG.lastCall.off.personnel} ${CG.lastCall.off.formation}</b> · ${CG.lastCall.off.label} vs <b style="color:#eaf0fb">${CG.lastCall.def.front}</b> ${CG.lastCall.def.label}. <span class="muted">${CG.lastCall.edge}.</span></div>`:'')+
    (CG._sideline?`<div style="margin-top:7px;padding:6px 8px;border-radius:8px;background:#130f1d;border:1px dashed #4a3a5e;font-size:12px;font-style:italic;color:#d8c8ec"><b style="color:${CG._sideline.c};font-style:normal">${CG._sideline.rep}</b>: “${CG._sideline.line}”</div>`:'');
  side.appendChild(call);
  const live=el('div','cg-panel cg-sidegrid');
  live.innerHTML=`<div>${cgBoxMiniHTML()}</div><div><div class="cg-panel-title">Drive log</div><div class="cg-log-scroll">${CG.log.slice(0,8).map(x=>`<div class="ply" style="font-size:11.5px;padding:4px 0">${x}</div>`).join('')||'<span class="muted">Kickoff!</span>'}</div></div><div><div class="cg-panel-title">Around the league</div><div style="max-height:94px;overflow:auto">${cgLeagueHTML()}</div></div>`;
  side.appendChild(live); grid.appendChild(side); shell.appendChild(grid);
  const wireField=()=>{ const cv=$('#cgcv');
    if(cv&&typeof SIM!=='undefined'){ try{ if(CGSIM)CGSIM.stop(); const bg=fieldTopImg(team(CG.home).abbr);
      if(CG._viz){ const v=CG._viz; CG._viz=null; const o=team(v.off), d=team(v.def); if(o&&d){ CGSIM=new SIM.FieldSim(cv); CGSIM.bg=bg; CGSIM.overlayMode=photoMode; CGSIM.tvMode=!!CG._scoreView; CGSIM.setup(o,d,v.play,10+v.los,v.script); cgApplyFieldEnvironment(CGSIM,home);
        // Live animation for coached snaps: the play actually unfolds on the canvas instead of jumping to final state
        if (typeof CGSIM.animateLive === 'function') {
          CGSIM.animateLive(null, 5, 48); // chunked steps + short delay = ~2.5s visible play
        } else {
          fieldStaticResult(CGSIM);
        }
      } }
      else { const o=cgTeam(CG.poss), d=cgTeam(CG.poss==='h'?'a':'h'); CGSIM=new SIM.FieldSim(cv); CGSIM.bg=bg; CGSIM.overlayMode=photoMode; CGSIM.tvMode=!!CG._scoreView; CGSIM.setup(o,d,'run',10+CG.ballOn); cgApplyFieldEnvironment(CGSIM,home); CGSIM.draw(); }
      // Replay button for the just-played snap (makes coached games replayable and more playable)
      if (CGSIM && typeof CGSIM.animateLive === 'function' && CG._lastVizScript) {
        const rp = el('div'); rp.style.cssText='position:absolute;bottom:4px;right:6px;z-index:10';
        rp.innerHTML = `<button class="btn sec" style="padding:1px 7px;font-size:9px;letter-spacing:0.5px" id="cgreplay">↻ REPLAY</button>`;
        (cv.parentNode || fdwrap).appendChild(rp);
        setTimeout(()=>{ const b = $('#cgreplay'); if(b) b.onclick = ()=>{ try{
          const v = CG._lastVizScript; if(!v) return;
          const oo=team(v.off), dd=team(v.def); if(oo&&dd){ if(CGSIM) CGSIM.stop(); CGSIM = new SIM.FieldSim(cv); CGSIM.bg=bg; CGSIM.overlayMode=photoMode; CGSIM.tvMode=!!CG._scoreView;
            CGSIM.setup(oo,dd,v.play,10+v.los,v.script); cgApplyFieldEnvironment(CGSIM, team(CG.home)); CGSIM.animateLive(null,5,48); }
        }catch(e){} }; }, 20);
      }
    }catch(e){} }
    const fld=$('#cgfield'); if(fld) fld.querySelectorAll('.cgmk[data-path]').forEach(e=>{ e.removeAttribute('data-path'); }); };
  const seq=CG._renderSeq=(CG._renderSeq||0)+1, later=fn=>setTimeout(()=>{ if(!CG||CG._renderSeq!==seq) return; wireField(); if(fn)fn(); },0);
  if(CG.coin&&CG.coin.pending){ const c=el('div'); c.innerHTML=cgCoinCardHTML(); shell.appendChild(c.firstChild);
    later(()=>{ const rec=$('#cgreceive'); if(rec)rec.onclick=()=>cgResolveCoin('receive'); const def=$('#cgdefer'); if(def)def.onclick=()=>cgResolveCoin('defer'); const ko=$('#cgkickoff'); if(ko)ko.onclick=()=>cgResolveCoin(); });
    return; }
  if(CG._scoreView){ const c=el('div','cg-live-strip');
    c.innerHTML=`<div><span>Live snap</span><b>${esc(cgTeam(CG._scoreView.poss).abbr)} ${CG._scoreView.down} & ${CG._scoreView.toGo>=100-CG._scoreView.ballOn?'Goal':CG._scoreView.toGo}</b></div><p>${esc(CG.lastText||'Play developing...')}</p>`;
    shell.appendChild(c); later(); return; }
  if(CG.over){ const won=(CG.userSide==='h'?CG.hs>CG.as:CG.as>CG.hs), c=el('div','card cg-control-card');
    c.innerHTML=`<div style="text-align:center"><div class="muted" style="font-size:11px;letter-spacing:2px">FINAL${CG._ot?' / OT':''}</div><div class="stat s" style="font-size:30px;margin:4px 0">${away.abbr} ${CG.as} — ${CG.hs} ${home.abbr}</div><div class="${won?'good':'bad'}" style="font-weight:800;font-family:var(--mono)">${won?'You win.':'Tough loss.'}</div></div><div style="margin-top:12px"><h3>Full Box Score</h3>${cgBoxHTML()}</div><button class="btn" style="margin-top:12px;width:100%" id="cgdone">Continue → handle your week</button>`;
    shell.appendChild(c); later(()=>{ const d=$('#cgdone'); if(d)d.onclick=cgFinish; }); return; }
  if(CG.pat && !CG._scoreView){ const c=el('div','card cg-control-card'); c.innerHTML=`<h3>${cgTeam(CG.pat).abbr} touchdown — extra point?</h3><div class="flex"><button class="btn" id="cgxp">Kick XP (+1)</button><button class="btn warn" id="cg2pt">Go for 2 (+2)</button></div>`;
    shell.appendChild(c); later(()=>{ const xp=$('#cgxp'); if(xp)xp.onclick=()=>cgPAT(false); const tp2=$('#cg2pt'); if(tp2)tp2.onclick=()=>cgPAT(true); }); return; }
  const userTeam=cgTeam(CG.userSide), userPb=ensureTeamPlaybook(userTeam), sheetCtx=cgPlayCtx(CG.userSide);
  const c=el('div','card cg-control-card'), fourth=CG.down>=4, plays=uOnO?teamPlaySheet(userTeam,'off',sheetCtx):teamPlaySheet(userTeam,'def',sheetCtx);
  const tabs=cgPlayTabs(uOnO), visiblePlays=cgVisiblePlays(plays,uOnO), pcLeft=cgPlayClockLeft();
  const sheetName=uOnO?userPb.off.label:userPb.def.label;
  const situation=CG.down>=3?`Money down: ${CG.down} & ${CG.toGo}`:CG.ballOn>=80?'Red zone call sheet':CG.q>=4?'Fourth-quarter management':'Stay on schedule';
  let html=`<div class="cg-callbar"><div><h3>${uOnO?'Offense - call the concept':'Defense - set the shell'}</h3><div class="muted" style="font-size:11.5px">${situation} · <span style="color:var(--acc)">${sheetName}</span></div></div>
    <div id="cgplayclock" class="cg-playclock"><span>Play clock</span><b class="cg-pc-num">${String(pcLeft).padStart(2,'0')}</b><div class="cg-pc-bar"><i style="width:${pcLeft/(CG.playClock||40)*100}%"></i></div></div>
    <span class="row" style="gap:8px"><select id="cgtempo"><option value="normal" ${CG.tempo==='normal'?'selected':''}>Normal</option><option value="hurry" ${CG.tempo==='hurry'?'selected':''}>Hurry-up</option><option value="chew" ${CG.tempo==='chew'?'selected':''}>Chew clock</option></select><button class="btn sec" id="cgto" style="padding:4px 10px">Timeout (${CG.to[CG.userSide]||0})</button></span></div>`;
  html+=`<div class="cg-sheet-tabs">${tabs.map(([k,l])=>`<button class="btn ${CG.sheetCat===k?'':'sec'}" data-cat="${k}">${l}</button>`).join('')}</div>`;
  html+='<div class="playgrid compact">'+visiblePlays.map((p,i)=>{ const meta=uOnO?`${p.personnel} · ${p.formation}`:`${p.front} · ${p.shell}`; return `<button class="btn sec playbtn ${i===0?'suggested':''}" data-k="${p.k}"><b>${p.label}</b><span>${meta}</span><span>${p.hint}</span></button>`; }).join('')+'</div>';
  if(uOnO&&fourth){ const fgDist=100-CG.ballOn+17; html+=`<div class="flex" style="margin-top:8px"><button class="btn warn" data-sp="punt">Punt</button>`+(fgDist<=58?`<button class="btn warn" data-sp="fg">Field Goal (${fgDist} yd)</button>`:'')+`<span class="muted" style="align-self:center">4th & ${CG.toGo} — go for it by calling a play above.</span></div>`; }
  html+=`<div class="row" style="margin-top:8px"><button class="btn sec" id="cgsim">⏩ Sim to end</button><button class="btn sec" id="cgquit">Quit to menu</button></div>`;
  c.innerHTML=html; shell.appendChild(c);
  later(()=>{ const te=$('#cgtempo'); if(te)te.onchange=e=>{ CG.tempo=e.target.value; CG.hurry=CG.tempo==='hurry'; }; const to=$('#cgto'); if(to)to.onclick=cgTimeout;
    c.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ CG.sheetCat=b.dataset.cat; render(); });
    c.querySelectorAll('.playbtn').forEach(b=>b.onclick=()=>cgSnap(b.dataset.k)); c.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>cgSpecial(b.dataset.sp));
    c.querySelectorAll('[data-gp]').forEach(b=>b.onclick=()=>{ const k=b.dataset.gp; const g=CG.gameplan|| (CG.gameplan={}); if(k==='run') g.runPass=0.75; else if(k==='pass') g.runPass=0.25; else if(k==='rb') g.featureRB=!g.featureRB; else if(k==='wr1') g.attackWR1=!g.attackWR1; else if(k==='protect') g.protectPass=!g.protectPass; else if(k==='spy') g.spyQB=!g.spyQB; render(); });
    c.querySelectorAll('[data-half]').forEach(b=>b.onclick=()=>{ const k=b.dataset.half; const g=CG.gameplan|| (CG.gameplan={}); if(k==='moreRun'){ g.runPass=0.8; g.protectPass=false; } else if(k==='morePass'){ g.runPass=0.2; } else if(k==='protect'){ g.protectPass=true; } else if(k==='done'){ CG._halftimeAdj=true; } render(); });
    const sm=$('#cgsim'); if(sm)sm.onclick=cgSimToEnd; const qt=$('#cgquit'); if(qt)qt.onclick=()=>{ if(confirm('Quit the game? Your game won\'t be resolved.')){ CG=null; render(); } };
    cgWirePlayClock(); });
}
function cgRender(m){
  return cgRenderBroadcast(m);
  const home=team(CG.home), away=team(CG.away), uOnO=cgUserOnO();
  // ---- establishing shot: the stadium (home venue, with today's weather + crowd) ----
  const stwrap=el('div'); stwrap.style.cssText='border-radius:10px 10px 0 0;overflow:hidden;border:1px solid var(--line);border-bottom:none;line-height:0';
  try{ stwrap.innerHTML=venueArt(home, CG.weather, 150); }catch(e){ stwrap.innerHTML=''; }
  if(stwrap.innerHTML){ const cap=el('div'); cap.style.cssText='background:#0c1320;border:1px solid var(--line);border-top:none;border-radius:0 0 10px 10px;padding:4px 10px;margin-bottom:10px;font-size:11px;color:var(--dim,#93a4c4);text-align:center';
    cap.innerHTML=`🏟️ <b style="color:#cdd8ec">${(home.stadium&&home.stadium.name)||home.city+' Stadium'}</b> · ${home.city} · ${(WX[CG.weather]||WX.clear).icon} ${(WX[CG.weather]||WX.clear).label}${CG.intl?` · ${CG.intl.flag} ${CG.intl.venue} (neutral site)`:''}`;
    m.appendChild(stwrap); m.appendChild(cap); }
  // ---- broadcast slot header ----
  const wx=WX[CG.weather]||WX.clear;
  if(CG.slot){ const s=CG.slot; const iv=CG.intl; const hd0=el('div'); hd0.style.cssText=`text-align:center;margin-bottom:10px;padding:7px;border-radius:8px;${iv?'background:linear-gradient(90deg,#0a1b2e,#103a52,#0a1b2e);border:1px solid #2f6f99':s.prime?'background:linear-gradient(90deg,#170f2e,#241a44,#170f2e);border:1px solid #4a3a7a':'background:#0c1320;border:1px solid var(--line)'}`;
    hd0.innerHTML=`<span style="font-family:var(--disp,sans-serif);font-weight:800;letter-spacing:2px;font-size:13px;color:${iv?'#7fd0ff':s.prime?'#cdbcff':'var(--acc,#5bbcff)'}">${iv?'':s.prime?'🌙 ':''}${s.label}</span> <span class="muted" style="font-size:11px">· ${s.net} · Week ${G.week+1} · ${wx.icon} ${wx.label}</span>`
      +(iv?`<div style="margin-top:5px"><span style="background:#1d6fa5;color:#fff;font-family:var(--mono);font-size:10px;font-weight:800;letter-spacing:1.2px;padding:2px 10px;border-radius:10px">${iv.flag} ${iv.venue} — ${iv.note} · neutral site</span></div>`:'')
      +(CG.rivalry?`<div style="margin-top:5px"><span style="background:#b3001b;color:#fff;font-family:var(--mono);font-size:10px;font-weight:800;letter-spacing:1.5px;padding:2px 10px;border-radius:10px">⚔ RIVALRY — ${CG.rivalry.toUpperCase()}</span></div>`:'');
    m.appendChild(hd0); }
  // ---- scorebug ----
  const hud=el('div','card'); hud.style.cssText='margin-bottom:10px;background:linear-gradient(180deg,#0e1a2b,#0a121d)';
  const dd = CG.down+' & '+(CG.toGo>=100-CG.ballOn?'Goal':CG.toGo);
  const spot = CG.ballOn<=50? cgTeam(CG.poss).abbr+' '+CG.ballOn : 'OPP '+(100-CG.ballOn);
  const toPips=side=>Array.from({length:3},(_,i)=>`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${i<(CG.to[side]||0)?'var(--acc)':'#263247'};margin-left:3px"></span>`).join('');
  hud.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center">
    <div class="row" style="gap:10px">${logoTag(away,34)}<div><div class="muted" style="font-size:10px">${away.abbr}${CG.poss==='a'?' 🏈':''} · ${away.wins}-${away.losses} ${toPips('a')}</div><div class="stat s">${CG.as}</div></div></div>
    <div style="text-align:center"><div class="stat" style="font-size:22px">Q${CG.q>4?'OT':CG.q} · ${cgClockStr()}</div><div class="muted" style="font-family:var(--mono);font-size:12px">${cgTeam(CG.poss).abbr} ball · ${dd} · ${spot} · ${cgTempoLabel()}</div></div>
    <div class="row" style="gap:10px"><div style="text-align:right"><div class="muted" style="font-size:10px">${CG.poss==='h'?'🏈 ':''}${home.abbr} · ${home.wins}-${home.losses} ${toPips('h')}</div><div class="stat s">${CG.hs}</div></div>${logoTag(home,34)}</div></div>
    <div class="row" style="gap:14px;margin-top:8px">
      <span class="muted" style="font-size:10px;width:64px">WIN ${cgWinProb()}%</span>
      <div class="bar" style="flex:1"><i style="width:${50+CG.mom/2}%;background:${CG.mom>=0?'var(--good)':'var(--bad)'}"></i></div>
      <span class="muted" style="font-size:10px;width:90px;text-align:right">MOMENTUM ${CG.mom>0?'+':''}${CG.mom}</span></div>`;
  m.appendChild(hud);
  // ---- the field: X's and O's ----
  // the field — static physics snapshot from the FPS on-field engine; X/O schematic as fallback
  const fdwrap=el('div');
  if(typeof SIM!=='undefined'){ fdwrap.style.cssText='border-radius:10px;overflow:hidden;border:1px solid var(--line);margin-bottom:10px;line-height:0;background:#0c2a17';
    const cv=el('canvas'); cv.id='cgcv'; cv.width=780; cv.height=300; cv.style.cssText='width:100%;height:auto;display:block'; fdwrap.appendChild(cv); }
  else fdwrap.innerHTML=cgFieldHTML();
  m.appendChild(fdwrap);
  // ---- BIG-MOMENT headline (static TDs, turnovers, explosives, clutch downs) ----
  if(!document.getElementById('cgfx')){ const s=el('style'); s.id='cgfx'; s.textContent=''; document.head.appendChild(s); }
  if(CG._moment){ const mo=CG._moment; const hd=el('div');
    hd.style.cssText=`text-align:center;margin-bottom:10px;padding:9px;border-radius:11px;background:radial-gradient(circle at 50% 0%, ${mo.c}33, #0a1320 72%);border:1px solid ${mo.c}`;
    hd.innerHTML=`<div style="font-family:var(--disp,sans-serif);font-weight:900;letter-spacing:3px;font-size:23px;color:${mo.c};text-shadow:0 2px 10px ${mo.c}99">${mo.label}</div><div class="muted" style="font-size:12px;margin-top:1px">${mo.crowd}</div>`;
    m.appendChild(hd); }
  // ---- play-by-play banner (the broadcast call) ----
  const lb=el('div'); const pbpC=CG._good?'var(--good)':CG._bad?'var(--bad)':'var(--acc,#5bbcff)';
  lb.style.cssText=`margin-bottom:12px;padding:10px 14px;border-radius:9px;background:linear-gradient(90deg,#0c1726,#0a1320);border:1px solid var(--line);border-left:4px solid ${pbpC}`;
  lb.innerHTML=`<div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--dim,#7d8ba5);margin-bottom:3px">📣 ON THE CALL</div><div style="font-size:16px;line-height:1.45;font-weight:500;color:#eaf0fb">${CG.lastText}</div>`
    +(CG.lastCall?`<div style="margin-top:8px;padding:7px 9px;border-radius:7px;background:#0a1320;border:1px solid #22324a;font-size:12px;color:#b8c6dc"><b style="color:#eaf0fb">${CG.lastCall.off.personnel} ${CG.lastCall.off.formation}</b> · ${CG.lastCall.off.label} vs <b style="color:#eaf0fb">${CG.lastCall.def.front}</b> ${CG.lastCall.def.label}. <span class="muted">${CG.lastCall.edge}.</span></div>`:'')
    +(CG.lastColor?`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #243349"><span style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:#caa46a">🎙️ ${(CG.analyst||'IN THE BOOTH').toUpperCase()}</span><div style="font-size:13.5px;line-height:1.4;font-style:italic;color:#d6cdbb">${CG.lastColor}</div></div>`:'');
  m.appendChild(lb);
  // ---- sideline reporter (comic relief) ----
  if(CG._sideline){ const sr=el('div'); sr.style.cssText='margin:-4px 0 12px;padding:7px 11px;border-radius:8px;background:#130f1d;border:1px dashed #4a3a5e;font-size:12.5px;font-style:italic;color:#d8c8ec';
    sr.innerHTML=`🎙️ <b style="color:${CG._sideline.c};font-style:normal">${CG._sideline.rep}</b>, from the sideline: “${CG._sideline.line}”`; m.appendChild(sr); }
  // ---- FINAL ----
  if(CG.over){ const won=(CG.userSide==='h'?CG.hs>CG.as:CG.as>CG.hs);
    const c=el('div','card'); c.innerHTML=`<div style="text-align:center"><div class="muted" style="font-size:11px;letter-spacing:2px">FINAL${CG._ot?' / OT':''}</div>
      <div class="stat s" style="font-size:30px;margin:4px 0">${away.abbr} ${CG.as} — ${CG.hs} ${home.abbr}</div>
      <div class="${won?'good':'bad'}" style="font-weight:800;font-family:var(--mono)">${won?'You win.':'Tough loss.'}</div></div>
      <div style="margin-top:14px"><h3>Box Score</h3>${cgBoxHTML()}</div>
      ${CG.league&&CG.league.length?`<div style="margin-top:14px"><h3>Around the League — Finals</h3>${cgLeagueHTML()}</div>`:''}
      <button class="btn" style="margin-top:14px;width:100%" id="cgdone">Continue → handle your week</button>`;
    m.appendChild(c); setTimeout(()=>{ const d=$('#cgdone'); if(d) d.onclick=cgFinish; },0); return; }
  // ---- PAT ----
  if(CG.pat){ const c=el('div','card'); c.innerHTML=`<h3>${cgTeam(CG.pat).abbr} TOUCHDOWN — extra point?</h3>
      <div class="flex"><button class="btn" id="cgxp">Kick XP (+1)</button><button class="btn warn" id="cg2pt">Go for 2 (+2)</button></div>`;
    m.appendChild(c); setTimeout(()=>{ const xp=$('#cgxp'); if(xp) xp.onclick=()=>cgPAT(false); const tp2=$('#cg2pt'); if(tp2) tp2.onclick=()=>cgPAT(true); },0); return; }
	  // ---- controls ----
	  const c=el('div','card'); const fourth=CG.down>=4; const plays=uOnO?OFF_PLAYS:DEF_PLAYS;
	  const situation=CG.down>=3?`Money down: ${CG.down} & ${CG.toGo}`:CG.ballOn>=80?'Red zone call sheet':CG.q>=4?'Fourth-quarter management':'Stay on schedule';
	  let html=`<div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3>${uOnO?'🏈 Offense — call the concept':'🛡️ Defense — set the shell'}</h3>
	    <span class="row" style="gap:8px"><select id="cgtempo"><option value="normal" ${CG.tempo==='normal'?'selected':''}>Normal</option><option value="hurry" ${CG.tempo==='hurry'?'selected':''}>Hurry-up</option><option value="chew" ${CG.tempo==='chew'?'selected':''}>Chew clock</option></select><button class="btn sec" id="cgto" style="padding:4px 10px">Timeout (${CG.to[CG.userSide]||0})</button></span></div>`;
	  html+=`<div style="margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#08111e;border:1px solid var(--line);font-size:12px;color:#b8c6dc"><b style="color:#eaf0fb">${situation}</b> · ${uOnO?'Pick personnel and attack the defensive answer.':'Match front, shell, and pressure to down-distance.'} Predictable play families get punished.</div>`;
	  html+='<div class="playgrid">'+plays.map(p=>{ const meta=uOnO?`${p.personnel} · ${p.formation}`:`${p.front} · ${p.shell}`;
	    return `<button class="btn sec playbtn" data-k="${p.k}"><b>${p.label}</b><span>${meta}</span><span>${p.hint}</span></button>`; }).join('')+'</div>';
  if(uOnO && fourth){ const fgDist=100-CG.ballOn+17;
    html+=`<div class="flex" style="margin-top:10px"><button class="btn warn" data-sp="punt">Punt</button>`
      +(fgDist<=58?`<button class="btn warn" data-sp="fg">Field Goal (${fgDist} yd)</button>`:'')
      +`<span class="muted" style="align-self:center">4th & ${CG.toGo} — go for it by calling a play above.</span></div>`; }
  html+=`<div class="row" style="margin-top:10px"><button class="btn sec" id="cgsim">⏩ Sim to end</button><button class="btn sec" id="cgquit">Quit to menu</button></div>`;
  c.innerHTML=html; m.appendChild(c);
  // ---- tabbed panel: Drive Log / Box Score / Around the League ----
  const tabs=[['log','📜 Drive Log'],['box','📊 Box Score'],['lg','📡 Around the League']];
  const tb=el('div','card'); tb.style.marginTop='12px';
  tb.innerHTML=`<div class="flex" style="gap:6px;margin-bottom:10px">`+tabs.map(([k,l])=>`<button class="btn ${CG.tab===k?'':'sec'}" style="padding:4px 11px;font-size:12px" data-tab="${k}">${l}</button>`).join('')+`</div><div id="cgpanel"></div>`;
  m.appendChild(tb);
  const panel=tb.querySelector('#cgpanel');
  if(CG.tab==='box') panel.innerHTML=cgBoxHTML();
  else if(CG.tab==='lg') panel.innerHTML=cgLeagueHTML();
  else panel.innerHTML=CG.log.slice(0,16).map(x=>`<div class="ply">${x}</div>`).join('')||'<span class="muted">Kickoff!</span>';
  const cgRenderSeq=CG._renderSeq=(CG._renderSeq||0)+1;
  setTimeout(()=>{
    if(!CG||CG._renderSeq!==cgRenderSeq){ return; }   // stale render timeout — do not overwrite the current play state
	    const te=$('#cgtempo'); if(te) te.onchange=e=>{ CG.tempo=e.target.value; CG.hurry=CG.tempo==='hurry'; };
	    const to=$('#cgto'); if(to) to.onclick=cgTimeout;
    c.querySelectorAll('.playbtn').forEach(b=>b.onclick=()=>cgSnap(b.dataset.k));
    c.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>cgSpecial(b.dataset.sp));
    const sm=$('#cgsim'); if(sm) sm.onclick=cgSimToEnd; const qt=$('#cgquit'); if(qt) qt.onclick=()=>{ if(confirm('Quit the game? Your game won\'t be resolved.')){ CG=null; render(); } };
    tb.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ CG.tab=b.dataset.tab; render(); });
    const fld=$('#cgfield'); if(fld) fld.querySelectorAll('.cgmk[data-path]').forEach(e=>{ e.removeAttribute('data-path'); });
    // PHYSICS CANVAS — draw the resolved play as one static snapshot (or draw a pre-snap formation)
    const cv=$('#cgcv');
    if(cv && typeof SIM!=='undefined'){ try{ if(CGSIM)CGSIM.stop();
      const bg=fieldTopImg(team(CG.home).abbr);   // the home team's top-down field photo, if dropped in
      if(CG._viz){ const v=CG._viz; CG._viz=null; const o=team(v.off), d=team(v.def); if(o&&d){ CGSIM=new SIM.FieldSim(cv); CGSIM.bg=bg; CGSIM.setup(o,d,v.play,10+v.los,v.script);
        if (typeof CGSIM.animateLive === 'function') {
          CGSIM.animateLive(null, 5, 48);
        } else {
          fieldStaticResult(CGSIM);
        }
      } }
      else { const o=cgTeam(CG.poss), d=cgTeam(CG.poss==='h'?'a':'h'); CGSIM=new SIM.FieldSim(cv); CGSIM.bg=bg; CGSIM.setup(o,d,'run',10+CG.ballOn); CGSIM.draw(); }   // static pre-snap look
    }catch(e){} }
  },0);
}
// the effective tempo for the team WITH the ball: user's pick on his drives; AI runs situational (hurry trailing late, chew with a lead)
function cgEffTempo(){ if(!CG) return 'normal';
  if(CG.poss===CG.userSide) return CG.tempo||(CG.hurry?'hurry':'normal');
  const aim=(CG.poss==='h'?CG.hs-CG.as:CG.as-CG.hs); return (CG.q>=4&&aim<=-4)?'hurry':(CG.q>=4&&aim>=5)?'chew':'normal'; }
function cgBurn(result){ let t = (result==='incomplete'||result==='oob')?6 : ENG.ri(28,42);
  // tempo only governs the team that has the ball: the USER's hurry/chew applies to HIS drives; the AI runs situational tempo
  // (hurries only when trailing late, milks the clock with a late lead). Fixes the bug where the user's hurry-up halved the
  // WHOLE game's clock — doubling both teams' plays and producing cartoon box scores (75-27, 600+ pass yds).
  const tempo=cgEffTempo();
  if(tempo==='hurry') t=Math.round(t*0.64); else if(tempo==='chew' && result!=='incomplete' && result!=='oob') t=Math.round(t*1.25);
  CG.clock-=t;
  if(CG.clock<=0){ CG.q++; if(CG.q<=4){ CG.clock=900; if(CG.q===3){ CG.poss = CG._kickoffReceiver==='h'?'a':'h'; CG.ballOn=25; CG.down=1; CG.toGo=10; CG.log.unshift('— Halftime —'); } } else { CG.clock=0; } } }
function cgStartPlayView(){ CG._playTok=(CG._playTok||0)+1; CG._colorAI=false; CG._animating=!(CG.autoAdv||CG._auto); CG._scoreView={poss:CG.poss,ballOn:CG.ballOn,down:CG.down,toGo:CG.toGo,q:CG.q,clock:CG.clock,hs:CG.hs,as:CG.as}; }
function cgChangePoss(msg){ CG.poss = CG.poss==='h'?'a':'h'; CG.ballOn=100-CG.ballOn; CG.ballOn=ENG.clamp(CG.ballOn,1,99); CG.down=1; CG.toGo=10; if(msg)CG.log.unshift(msg); cgDriveBreather(); }
function cgMissedFGSpot(ballOn){ return ENG.clamp(100-(ballOn+7),20,80); }
function cgScoreTD(){ if(CG.poss==='h')CG.hs+=6; else CG.as+=6; CG.pat=CG.poss;
  if(CG.pat!==CG.userSide) autoPAT();   // the OPPOSING coach decides his own PAT — don't make you click it
}
// the AI's extra-point decision (almost always kicks; goes for 2 only when the math demands it late)
function autoPAT(){ const t=CG.pat, mine=(t==='h'?CG.hs-CG.as:CG.as-CG.hs);
  const go2 = CG.q>=4 && (mine===-2 || mine===1 || mine===5 || mine===-5) && ENG.rng()<0.6;
  if(go2){ const ok=ENG.rng()<0.5; if(ok){ if(t==='h')CG.hs+=2; else CG.as+=2; } CG.log.unshift(`${cgTeam(t).abbr} two-point try ${ok?'GOOD':'no good'}.`); }
  else { const ok=ENG.rng()<0.94; if(ok){ if(t==='h')CG.hs+=1; else CG.as+=1; } CG.log.unshift(`${cgTeam(t).abbr} extra point ${ok?'good':'MISSED'}.`); }
  CG.pat=null; cgKickoff(t);
}
function cgPAT(go2){ const t=CG.pat;
  if(go2){ const ok=ENG.rng()<0.5; if(ok){ if(t==='h')CG.hs+=2; else CG.as+=2; } CG.log.unshift(`Two-point try ${ok?'GOOD':'no good'}.`); }
  else { const ok=ENG.rng()<0.94; if(ok){ if(t==='h')CG.hs+=1; else CG.as+=1; } CG.log.unshift(`Extra point ${ok?'good':'MISSED'}.`); }
  CG.pat=null; CG.bumpMom=0; CG._scoreView=null; CG._animating=null; CG._moment=null; CG._lastVizScript=null;   // leave the TD beat → kick off to the next drive
  if(window._cgNextKey){ window.removeEventListener('keydown',window._cgNextKey); window._cgNextKey=null; }
  cgKickoff(t); if(typeof cgResetPlayClock==='function')cgResetPlayClock(); render();
}
function cgDriveBreather(){ if(!CG) return; ['h','a'].forEach(sd=>{ const t=cgTeam(sd); if(t)t._hurryGas=Math.max(0,(t._hurryGas||0)-1.4); }); }
function cgKickoff(scoringSide){ CG.poss = scoringSide==='h'?'a':'h'; CG.ballOn=25; CG.down=1; CG.toGo=10; cgDriveBreather();
  if(!CG._kickoffReceiver) CG._kickoffReceiver=CG.poss;
  if(CG.q>4 || (CG.q===4&&CG.clock<=0)) cgEndCheck(); }
const CGLINES={ big:['Huge gain!','He breaks free!','Chunk play!','Down the sideline!'], gain:['Moves the chains.','Picks up yards.','Solid gain.'],
  incomplete:['Incomplete.','Off the mark.','Broken up!'], sack:['SACKED!','Brought down in the backfield!'],
  INT:['INTERCEPTED!','Picked off!','Turnover!'], FUM:['FUMBLE — recovered by the defense!','He coughs it up!'], TD:['TOUCHDOWN!','He\'s in!','Six points!'] };
// ── STAGED NARRATION helpers ──────────────────────────────────────────────────
// Build a pre-snap "booth call" that shows during the animation (before result is known to the viewer).
function cgPreSnapText(pre, offKey, defKey, act){
  if(!pre||!CG) return null;
  const off=cgTeam(pre.poss), def=cgTeam(pre.poss==='h'?'a':'h');
  if(!off||!def) return null;
  const oMeta=OFF_META&&OFF_META[offKey], dMeta=DEF_META&&DEF_META[defKey];
  const dn=pre.down===1?'1st':pre.down===2?'2nd':pre.down===3?'3rd':'4th';
  const tg=pre.toGo>=(100-pre.ballOn)?'goal':pre.toGo;
  const ddStr=`${dn} & ${tg}`;
  const formation=(oMeta&&(oMeta.formation||oMeta.personnel||oMeta.label))||'';
  const front=(dMeta&&(dMeta.front||dMeta.shell||dMeta.label))||'';
  const qb=act&&act.qb?act.qb.last:null;
  let line=`<b>${off.abbr}</b> break the huddle — ${ddStr}.`;
  if(formation) line+=` ${off.abbr} align in ${formation}`;
  if(front) line+=` vs. ${def.abbr} ${front}`;
  line+='.';
  if(qb) line+=` ${qb} steps to the line.`;
  return line;
}
// Build a mid-play "read" line — shown ~40% into the animation while the play develops.
function cgReadText(act, r){
  if(!CG||!act) return null;
  const qb=act.qb?act.qb.last:'the quarterback';
  const rb=(act.rb&&act.rb!==act.qb)?act.rb.last:'the back';
  const tgt=act.target?act.target.last:null;
  if(r&&r.isPass){
    if(tgt&&tgt!==qb) return `Snap — ${qb} drops back, eyes ${tgt}…`;
    return `Snap — ${qb} drops back, surveying the field…`;
  }
  return `Snap — handoff to ${rb}, hitting the line…`;
}
// Apply a stashed _pendingResult to CG and commit to the radio log. Called when animation ends.
function cgCommitPendingResult(){
  if(!CG||!CG._pendingResult) return;
  const p=CG._pendingResult; CG._pendingResult=null;
  CG.lastText=p.text; CG.lastColor=p.color;
  if(p.moment!==undefined) CG._moment=p.moment;
  if(p.good!==undefined) CG._good=p.good;
  if(p.bad!==undefined) CG._bad=p.bad;
  cgCommitRadio();
  // BOOTH FACT INJECTION (animated path) — drop a prepared note after the result lands,
  // only on calm plays (no big moment, no existing color, not a score/turnover play).
  if(CG.facts&&CG.facts.length && !CG._moment && !CG._colorAI && !p.color){
    const fact=cgPickFact();
    if(fact){ CG.lastColor='📊 '+fact; }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function cgSnap(offOrDefKey){
  if(CG._scoreView) return;
  CG._snapped=true;
  const pre=cgSnapState();
  cgStartPlayView();
  // AI offense (you're on D) makes a REAL 4th-down decision — punt or kick — so its drives actually end. (More defense, more punts.)
  if(!cgUserOnO() && CG.down>=4 && !CG.pat && !CG.over){
    const off=cgTeam(CG.poss), dist=100-CG.ballOn+17, margin=(CG.poss==='h'?CG.hs-CG.as:CG.as-CG.hs), desperate=margin<=-9 && CG.q>=4;
    const _stAnimating=!(CG.autoAdv||CG._auto);
    if(dist<=52 && CG.ballOn>=58 && !desperate){ const wxf=(WX[CG.weather]?WX[CG.weather].fg:0); const ok=ENG.rng()<ENG.clamp((0.98-(dist-20)*0.014)*(1+wxf),0.35,0.98);
      CG.lastCall=null;
      const _fgText=`<b>${off.abbr}</b> line up for a ${dist}-yard field goal - ${ok?'GOOD':'NO GOOD'}.`, _fgColor=cgColor(ok?'fg_good':'fg_miss'); CG.log.unshift(`${off.abbr} ${dist}-yd FG ${ok?'is GOOD':'NO GOOD'}.`);
      // the opponent's kick ANIMATES too — same special-teams choreography as your own
      CG._viz={off:off.abbr,def:cgTeam(CG.poss==='h'?'a':'h').abbr,play:'fg',los:CG.ballOn,script:{kind:'fg',dist,ok,minT:1.2}};
      CG._lastVizScript=JSON.parse(JSON.stringify(CG._viz));
      CG._animMs=3400; cgCrowdBurst(ok?'big':'snap');
      if(ok){ if(CG.poss==='h')CG.hs+=3; else CG.as+=3; cgBurn('gain'); cgKickoff(CG.poss); } else { const spot=cgMissedFGSpot(CG.ballOn); cgBurn('gain'); CG.poss=CG.poss==='h'?'a':'h'; CG.ballOn=spot; CG.down=1; CG.toGo=10; }
      const fgTeach=ok?(pre.poss===CG.userSide?'Take the points and reset the game script.':'You held the drive to three. Now the offense has to answer the scoreboard.'):
        'Missed field goals are field-position plays. The defense takes over at the proper missed-kick spot.';
      cgSetSpecialSnap(pre,`${dist}-yard field goal`,ok?'Good':'No good',fgTeach,_fgText);
      if(_stAnimating){ CG._pendingResult={text:_fgText,color:_fgColor,moment:null,good:false,bad:false}; CG.lastText=`<b>${off.abbr}</b> field-goal unit on — a ${dist}-yard try…`; CG.lastColor=''; CG._moment=null; }
      else { CG.lastText=_fgText; CG.lastColor=_fgColor; }
      return cgAfter(); }
    if(CG.ballOn<58 && !desperate){ CG.lastCall=null;
      const _net=ENG.ri(35,48), _ret=ENG.ri(0,9);
      const _pText=`<b>${off.abbr}</b> bring on the punt team — they flip the field.`, _pColor=cgColor('punt'); CG.log.unshift(`${off.abbr} punt.`);
      CG._viz={off:off.abbr,def:cgTeam(CG.poss==='h'?'a':'h').abbr,play:'punt',los:CG.ballOn,script:{kind:'punt',net:_net,returnYards:_ret,minT:1.2}};
      CG._lastVizScript=JSON.parse(JSON.stringify(CG._viz));
      CG._animMs=3600; cgCrowdBurst('snap');
      cgBurn('oob'); CG.poss=CG.poss==='h'?'a':'h'; CG.ballOn=ENG.clamp(100-(CG.ballOn+_net),1,80); CG.down=1; CG.toGo=10;
      cgSetSpecialSnap(pre,'Punt','Field flipped','Special teams changed the drive. Now coach the next possession from the new field position.',_pText);
      if(_stAnimating){ CG._pendingResult={text:_pText,color:_pColor,moment:null,good:false,bad:false}; CG.lastText=`<b>${off.abbr}</b> punt team on — kicking it away…`; CG.lastColor=''; CG._moment=null; }
      else { CG.lastText=_pText; CG.lastColor=_pColor; }
      return cgAfter(); }
    /* else the AI goes for it on 4th down → fall through to a normal play */
  }
  let offKey, defKey;
  const userOnOAtSnap=cgUserOnO();
  if(userOnOAtSnap){ offKey=offOrDefKey; defKey=cgAICallDef(); }
	  else { defKey=offOrDefKey; offKey=cgAICallOff(); }
  if(userOnOAtSnap) cgPushRecent('_oppDefCalls', defProfile(defKey), 6);
  else cgPushRecent('_oppOffCalls', cgOffTendencyLabel(offKey), 6);
  if(!userOnOAtSnap){ CG._udcalls=CG._udcalls||[]; CG._udcalls.push(defProfile(defKey)); if(CG._udcalls.length>6) CG._udcalls.shift(); }
  { // NO-HUDDLE FATIGUE: a hurry snap gasses both the offense (sprinting every play) and the defense (can't sub); normal tempo lets them breathe
    const _gt=cgEffTempo(), _go=cgTeam(CG.poss), _gd=cgTeam(CG.poss==='h'?'a':'h');
    if(_gt==='hurry'){ if(_go)_go._hurryGas=ENG.clamp((_go._hurryGas||0)+0.5,0,7); if(_gd)_gd._hurryGas=ENG.clamp((_gd._hurryGas||0)+0.5,0,7); }
    else { if(_go)_go._hurryGas=Math.max(0,(_go._hurryGas||0)-0.7); if(_gd)_gd._hurryGas=Math.max(0,(_gd._hurryGas||0)-0.55); } }
	  const r=resolvePlay(offKey, defKey);
  // In-game "wear" for coached games — big plays/sacks sap energy or risk injury (realism for best sim)
  if (CG && !CG._auto) {
    const big = r.yards >=12 || r.result==='sack' || r.turnover;
    if (big && ENG.rng()<0.18) {
      const sideTeam = cgTeam(CG.poss); sideTeam._fatigue = (sideTeam._fatigue||0) + 1.2;
      if (ENG.rng()<0.12 && r.isPass && cgTop(sideTeam).qb) { const qb=cgTop(sideTeam).qb; qb.wear=(qb.wear||0)+2; }   // wear only — no silent mid-game benching of the starter (real injuries still sub via the injury system)
    }
  }
	  CG.lastCall=cgCallSummary(offKey,defKey,r);
	  const off=cgTeam(CG.poss), def=cgTeam(CG.poss==='h'?'a':'h');
  const tp=cgTop(off), dp=cgTopD(def); CG._good=false; CG._bad=false; CG._moment=null;
  CG.mom=Math.round(CG.mom*0.86);   // momentum bleeds back toward neutral each snap — no permanent pinning at ±100
  // sideline dispatch for color — shows up regularly, lingers a couple plays, then clears
  if(window.VOICES&&VOICES.sideline&&ENG.rng()<0.17){ CG._sideline=VOICES.sideline(team(CG.home),team(CG.away),tp.qb); }
  else if(ENG.rng()<0.4){ CG._sideline=null; }
  const carrier=r.isPass?null:cgRunCarrier(tp,offKey);
  const target=r.isPass?cgPassTarget(tp,offKey):null;
  const act={qb:tp.qb, rb:carrier||tp.rb||tp.qb, target:target||tp.qb}; CG._lastAct=act;
  cgPhysFlavor(r, carrier, target, off, def);   // the chosen player's speed/height/strength shapes the result
  // tell the X/O field where this snap finishes (offense-perspective spot)
  CG._anim={ from:CG.ballOn, isPass:r.isPass, to:ENG.clamp(CG.ballOn + (r.result==='sack'?r.yards : r.result==='INT'?12 : r.result==='incomplete'?0 : r.result==='FUM'?Math.max(0,r.yards) : r.yards), 2, 100) };
  // hand the physics engine the play to ANIMATE (resolvePlay already decided the outcome)
	  CG._viz={ off:off.abbr, def:def.abbr, play:r.isPass?'pass':'run', los:CG.ballOn,
	    script:{isPass:r.isPass, yards:r.yards, result:r.result, turnover:r.turnover,
	      carrierId:carrier&&carrier.id, targetId:target&&target.id,
	      // offKey stays the coarse profile for back-compat (anything old reading it still works);
	      // concept is the fine-grained choreography bucket (draw/sweep/jet_sweep/zone_read/crossing/etc)
	      // that FieldSim uses to pick the actual on-field motion — this is the fix for "every run looks
	      // the same": the specific called play (rawKey) now drives the animation, not just run/pass+profile.
	      offKey:(OFF_META[offKey]&&OFF_META[offKey].profile)||offKey, rawKey:offKey, concept:offConcept(offKey), defKey, toGo:CG.toGo,
	      gameplan: JSON.parse(JSON.stringify(CG.gameplan||{})) } };  // pass gameplan for visual feedback in play-art
	  CG._lastVizScript = JSON.parse(JSON.stringify(CG._viz)); // for replay button
	  try{ if(typeof SIM!=='undefined'&&SIM.computeDrama){ const _d=SIM.computeDrama(CG._viz.script, off, def); CG._viz.script.drama=_d; CG._lastVizScript.script.drama=_d; } }catch(e){}   // one stable drama for BOTH the field viz and the call
  // Pace: short/medium plays should resolve quickly so the verdict isn't withheld for seconds after the motion's over.
  // minT is a FLOOR, not a cap — deep balls still take their natural ball-flight time, so trimming this only speeds the quick stuff.
  CG._animMs = r.turnover ? 3200
    : r.isPass ? (Math.abs(r.yards)>=25 ? 3800 : Math.abs(r.yards)>=12 ? 2600 : r.result==='sack' ? 2000 : r.result==='incomplete' ? 2000 : 2100)
    : (r.yards>=40 ? 3800 : r.yards>=22 ? 2700 : r.yards>=12 ? 2100 : r.yards>=4 ? 1700 : 1400);
  { const _minT = Math.max(1.1, (CG._animMs||2100)/1000 - 0.6);   // floor the play's minimum visible time
    if(CG._viz&&CG._viz.script) CG._viz.script.minT = _minT;
    if(CG._lastVizScript&&CG._lastVizScript.script) CG._lastVizScript.script.minT = _minT; }   // the animation reads _lastVizScript — set it there too, else the sim falls back to its slow 2.15/2.45 default
  cgCrowdBurst('snap');
	  // ---- box-score stats (passing/rushing/receiving + distributed defense) ----
	  const isTDPlay=!r.turnover && r.result!=='incomplete' && r.result!=='sack' && (CG.ballOn+r.yards>=100);
	  cgApplySnapStats(tp,dp,r,offKey,defKey,carrier,target,isTDPlay,cgTally);
  let line=pbpLine(off,def,offKey,defKey,r,act);
  const _dr = CG._viz&&CG._viz.script&&CG._viz.script.drama;   // real-football drama
  // CHRONOLOGY RULE: a call must read snap → action → result. Drama is ONLY ever appended AFTER the body resolves — never prepended,
  // and never as a separate "breaks a tackle" clause (the body pools already narrate broken tackles, spins and stiff-arms in order).
  if(_dr){
    if(_dr.pick6) line += cgRadio()? ` And away he goes — a pick six, ladies and gentlemen!` : ` <b>— PICK SIX!</b>`;
    else if(r.result==='INT' && _dr.returnYards>5) line += cgRadio()? ` He returns it ${_dr.returnYards}.` : ` Returned ${_dr.returnYards}.`;
    else if(r.result==='sack' && _dr.monsterSack) line += cgRadio()? ` Absolutely buried!` : ` <b>Absolutely BURIED!</b>`;
  }
  // ── STAGED NARRATION: set pre-snap call now; stash result for reveal at animation end ──────────
  // In auto/skip modes, _pendingResult is flushed by reveal() before render(), so the result shows immediately.
  // In manual (live) mode, the animation onDone callback fires cgCommitPendingResult() then re-renders.
  const _preSnapTxt = cgPreSnapText(pre, offKey, defKey, act) || `<b>${off.abbr}</b> snap the ball.`;
  const _readTxt = cgReadText(act, r);
  const _animating = !(CG.autoAdv || CG._auto);   // mirrors cgStartPlayView logic
  // ---- turnover ----
  if(r.turnover){ CG._bad=cgUserOnO(); CG.mom=ENG.clamp(CG.mom+(cgUserOnO()?-26:26),-100,100);
    CG._moment=cgMoment(r.result==='INT'?'INT':'FUM');
    cgCrowdBurst('turnover');
    const _resColor=cgColor(r.result==='INT'?'int':'fum', def.abbr); cgEnrichColor(r.result==='INT'?'int':'fum',off,def,r,line); CG.log.unshift(`<b>${off.abbr}</b> · ${line}`);
    const next=CG.poss==='h'?'a':'h';
    CG.ballOn=ENG.clamp(CG.ballOn + (r.result==='INT'?ENG.ri(0,18):Math.max(0,r.yards||0)),1,99);
    cgChangePoss(`Turnover — ${cgTeam(next).abbr} take over.`);
    cgBurn(r.result); cgSetLastSnap(pre,off,def,offKey,defKey,r,line,false);
    if(_animating){ CG._pendingResult={text:line,color:_resColor,moment:CG._moment,good:CG._good,bad:CG._bad}; CG.lastText=_preSnapTxt; CG.lastColor=''; CG._moment=null; CG._good=false; CG._bad=false; }
    else { CG.lastText=line; CG.lastColor=_resColor; }
    return cgAfter(); }
  // ---- advance ----
  const firstDown=r.yards>=CG.toGo, wasThird=CG.down>=3, wasFourth=CG.down>=4;
  CG.ballOn+=r.yards;
  // update hash on first down or after each run (hashes cycle: runs tend to go middle, passes spread to hashes)
  if(firstDown){ CG.ballHash=1; } // reset to center on first down
  else { CG.ballHash=r.isPass?Math.floor(Math.random()*3):[0,1,2][Math.floor(Math.random()*3)]; }
  if(CG.ballOn>=100){ CG.mom=ENG.clamp(CG.mom+(cgUserOnO()?20:-20),-100,100); CG._good=cgUserOnO(); CG._moment=cgMoment('TD',r.yards);
    CG._animMs=3600; cgCrowdBurst('td');
    if(!/TOUCHDOWN|walks in|\bhouse\b|He's IN|six points|\bGONE\b/i.test(line)) line+=' '+((cgRadio()&&window.PBPGEN&&window.PBPGEN.radio)?fillTpl(rpick(window.PBPGEN.radio.td),{off:off.abbr}):ENG.pick(['TOUCHDOWN!','He\'s IN — touchdown!','Six points!']));
    const _tdColor=cgColor('td', def.abbr); cgEnrichColor('td',off,def,r,line); CG.log.unshift(`<b>${off.abbr} TD!</b> ${line}`);
    if(r.isPass){cgTally(tp.qb,{ptd:1});cgTally(target,{rectd:1});} else cgTally(carrier||tp.rb||tp.qb,{rtd:1});
    cgScoreTD(); cgBurn(r.result); cgSetLastSnap(pre,off,def,offKey,defKey,r,line,true);
    if(_animating){ CG._pendingResult={text:line,color:_tdColor,moment:CG._moment,good:CG._good,bad:CG._bad}; CG.lastText=_preSnapTxt; CG.lastColor=''; CG._moment=null; CG._good=false; CG._bad=false; }
    else { CG.lastText=line; CG.lastColor=_tdColor; }
    return cgAfter(); }
  if(firstDown){ CG.down=1; CG.toGo=10; } else { CG.down++; CG.toGo-=r.yards; }
  if(r.result==='big'){ CG.mom=ENG.clamp(CG.mom+(cgUserOnO()?12:-12),-100,100); CG._good=cgUserOnO(); }
  // 4th-down drama carries the moment — conversions and stands ARE the ballgame
  if(wasFourth && firstDown){ line+=' '+ENG.pick(['AND THEY GOT IT — the gamble pays off, fresh set of downs!','CONVERTED on fourth down! The drive lives!','They went for it and MOVED THE STICKS — gutsy, and it worked!']); CG.mom=ENG.clamp(CG.mom+(cgUserOnO()?14:-14),-100,100); CG._good=cgUserOnO(); }
  else if(wasFourth && CG.down>4){ const tk=cgTeam(CG.poss==='h'?'a':'h').abbr; line+=' '+ENG.pick([`And they come up SHORT — turnover on downs! ${tk} take over on a STAND.`,`NO! Stopped short of the marker — the defense holds, ball goes the other way.`,`The gamble fails — a fourth-down STOP, a massive swing in field position.`]); CG.mom=ENG.clamp(CG.mom+(cgUserOnO()?-16:16),-100,100); CG._bad=cgUserOnO(); }
  else if(firstDown) line+= wasThird?' Moved the chains — FIRST DOWN!':' First down!';
  // pick the color analyst's angle from what just happened
  const ckind = r.result==='sack'?'sack' : r.result==='incomplete'?'incomplete' : firstDown?'firstdown' : r.result==='big'||r.yards>=20?'big' : (!r.isPass&&r.yards<=0)?'stuff' : 'gain';
  // COLOR = the analyst's CONTEXT layer — present ~every other play (not every snap), packed with real game detail.
  CG._colorN=(CG._colorN||0)+1;
  const colorBig = wasFourth || r.result==='big' || (r.isPass&&r.yards>=20) || (!r.isPass&&r.yards>=15) || (firstDown&&wasThird);
  let _resColor='';
  if(colorBig){ _resColor=cgColor(ckind, def.abbr); cgEnrichColor(ckind,off,def,r,line); }     // big moment → a punchy reactive take (AI may sharpen, gated)
  else if(CG._colorN%2===0){ _resColor=cgColorBeat(off,def)||cgColor(ckind, def.abbr); cgEnrichColor(ckind,off,def,r,line); }   // deterministic beat shows now; AI upgrades it async
  // else _resColor stays '' — in-between snaps stay clean
  // big-moment label for explosives, sacks, and clutch 3rd/4th-down conversions
  let _resMoment=null;
  if(r.result==='sack') _resMoment=cgMoment('SACK');
  else if(r.result==='big' || (r.isPass&&r.yards>=20) || (!r.isPass&&r.yards>=15)) _resMoment=cgMoment('BIG',r.yards);
  else if(wasFourth && CG.down>4) _resMoment=cgMoment('STAND');
  else if(wasFourth && firstDown) _resMoment=cgMoment('CLUTCH');
  else if(firstDown && wasThird) _resMoment=cgMoment('CLUTCH');
  if(_resMoment) cgCrowdBurst(_resMoment.kind==='BIG'?'big':'snap');
  CG.log.unshift(`<b>${off.abbr}</b> · ${line}`);
  if(CG.down>4){ const next=CG.poss==='h'?'a':'h'; cgChangePoss(`Turnover on downs — ${cgTeam(next).abbr} ball.`); }
  cgBurn(r.result);
  cgSetLastSnap(pre,off,def,offKey,defKey,r,line,firstDown);
  if(_animating){
    CG._pendingResult={text:line,color:_resColor,moment:_resMoment,good:CG._good,bad:CG._bad};
    CG.lastText=_preSnapTxt; CG.lastColor=''; CG._moment=null; CG._good=false; CG._bad=false;
    // store "read" line and timing for mid-animation update
    CG._pendingRead={text:_readTxt, ms:Math.round((CG._animMs||3600)*0.38)};
  } else {
    CG.lastText=line; CG.lastColor=_resColor; CG._moment=_resMoment;
  }
  cgAfter();
}
function cgSpecial(sp){
  if(CG._scoreView) return;
  const pre=cgSnapState();
  cgStartPlayView();
  const off=cgTeam(CG.poss), def=cgTeam(CG.poss==='h'?'a':'h'), kicker=cgKicker(off);
  CG.lastCall=null; cgCrowdBurst('snap');
  const _animating=!(CG.autoAdv||CG._auto);   // mirrors cgStartPlayView logic
  let finalText='', preText='', moment=null, color='';
  if(sp==='punt'){ const punter=cgKicker(off,'P');
    const net=ENG.ri(35,48), ret=ENG.ri(0,9);
    CG.log.unshift(`${off.abbr} punt.`);
    finalText=cgRadio()?`${off.city} send out ${punter} to punt — a high spiral, downed deep. Field position flips.`:`<b>${off.abbr}</b> ${punter} punts it away — field flipped.`;
    preText=`<b>${off.abbr}</b> punt team trots on — ${punter} standing deep to kick…`;
    color=cgColor('punt'); moment={kind:'PUNT',label:'PUNT — FIELD FLIPPED',c:'#9ecbff'};
    // the field ANIMATES the kick: snap → punt away → returner fields it (see FieldSim.setupSpecial)
    CG._viz={off:off.abbr,def:def.abbr,play:'punt',los:pre.ballOn,script:{kind:'punt',net,returnYards:ret,minT:1.2}};
    CG._animMs=3600;
    cgBurn('oob'); CG.poss=CG.poss==='h'?'a':'h'; CG.ballOn=ENG.clamp(100-(pre.ballOn+net),1,80); CG.down=1; CG.toGo=10;
    cgSetSpecialSnap(pre,'Punt','Field flipped','Good punt decisions are hidden points. Now coach the field position.',finalText); }
  else if(sp==='fg'){ const dist=100-CG.ballOn+17; const wxf=(WX[CG.weather]?WX[CG.weather].fg:0); const ok=ENG.rng()< ENG.clamp((0.98-(dist-20)*0.014)*(1+wxf),0.35,0.98); CG.log.unshift(`${off.abbr} ${dist}-yd field goal ${ok?'is GOOD':'is NO GOOD'}${wxf?' (weather a factor)':''}.`);
    finalText=cgRadio()?(ok?`${kicker} lines up the ${dist}-yarder — the snap, the hold, the kick is up… and it's GOOD! Three points!`:`${kicker} for ${dist}… the kick is up… and it's NO GOOD! Wide, and the chance goes begging.`):`<b>${off.abbr}</b> ${kicker} ${dist}-yd FG — ${ok?'GOOD! +3':'NO GOOD.'}`;
    preText=`<b>${off.abbr}</b> field-goal unit out — ${kicker} lining up the ${dist}-yarder…`;
    color=cgColor(ok?'fg_good':'fg_miss'); moment=ok?{kind:'FG',label:"IT'S GOOD! 🏈",c:'#46d39a'}:{kind:'FGMISS',label:'NO GOOD!',c:'#ff5d6c'};
    CG._viz={off:off.abbr,def:def.abbr,play:'fg',los:pre.ballOn,script:{kind:'fg',dist,ok,minT:1.2}};
    CG._animMs=3400; if(ok)cgCrowdBurst('big');
    if(ok){ if(CG.poss==='h')CG.hs+=3; else CG.as+=3; cgBurn('gain'); cgKickoff(CG.poss); } else { const spot=cgMissedFGSpot(CG.ballOn); cgBurn('gain'); CG.poss=CG.poss==='h'?'a':'h'; CG.ballOn=spot; CG.down=1; CG.toGo=10; }
    cgSetSpecialSnap(pre,`${dist}-yard field goal`,ok?'Good':'Missed',ok?'Bank the points. Now reset the kickoff situation.':'The miss gives the defense the ball at the missed-kick spot, not the old line of scrimmage.',finalText); }
  CG._lastVizScript=CG._viz?JSON.parse(JSON.stringify(CG._viz)):null;
  if(CG._viz&&CG._viz.script&&CG._animMs){ const _minT=Math.max(1.1,(CG._animMs/1000)-0.6); CG._viz.script.minT=_minT; if(CG._lastVizScript)CG._lastVizScript.script.minT=_minT; }
  if(_animating){ CG._pendingResult={text:finalText,color,moment,good:false,bad:false}; CG.lastText=preText; CG.lastColor=''; CG._moment=null; }
  else { CG.lastText=finalText; CG.lastColor=color; CG._moment=moment; }
  cgAfter();
}
// the man with the leg — used so kicks read with a real name, not a generic "the kicker"
function cgKicker(t, pos){ pos=pos||'K'; const p=(t&&t.roster||[]).filter(x=>x.pos===pos).sort((a,b)=>(b.ovr||0)-(a.ovr||0))[0]
    || (t&&t.roster||[]).filter(x=>x.pos===(pos==='P'?'K':'P')).sort((a,b)=>(b.ovr||0)-(a.ovr||0))[0]; return p?p.last:(pos==='P'?'the punter':'the kicker'); }
function cgAfter(){ if(CG.q>4 && CG.clock<=0 && !CG._scoreView){ return cgEndCheck(); }
  // when a result is pending (staged narration), do NOT commit the pre-snap placeholder to the radio log —
  // cgCommitPendingResult() will do the commit once the animation ends.
  if(!CG._pendingResult) cgCommitRadio();
  // BOOTH FACT INJECTION (non-animated / autoAdv path) — drop a prepared note on calm plays.
  // Animated path is handled by cgCommitPendingResult() instead.
  // Calm = no pending result, no big moment, no existing AI color, result color is empty.
  if(CG.facts&&CG.facts.length && !CG._pendingResult && !CG._moment && !CG._colorAI && !CG.lastColor){
    const fact=cgPickFact();
    if(fact){ CG.lastColor='📊 '+fact; }
  }
  save(); render();
  // the RESULT BEAT now persists (playbook hidden, PBP + stats up) until the user hits Next play — see cgNextPlay().
}
// advance out of the result beat → bring the call sheet back for the next snap
function cgNextPlay(){ if(!CG||!CG._scoreView) return;
  if(window._cgNextKey){ window.removeEventListener('keydown',window._cgNextKey); window._cgNextKey=null; }
  if(CG._pendingResult) cgCommitPendingResult();   // safety flush in case result was never revealed
  CG._scoreView=null; CG._animMs=null; CG._animating=null; CG._pendingRead=null; cgResetPlayClock();
  if(CG.q>4 && CG.clock<=0) return cgEndCheck(); save(true); render(); }
window.cgNextPlay=cgNextPlay;
// finish a coached game AND roll straight into the next week (skip the extra Advance click)
function cgFinishAdvance(){ const wasWeek=!!(CG&&CG.opts&&CG.opts.week); cgFinish(); if(wasWeek){ try{ advanceWeek({force:true}); }catch(e){} } }
window.cgFinishAdvance=cgFinishAdvance;
function cgEndCheck(){ if(CG.hs===CG.as){ /* OT: one more possession each, sudden */ CG.q=5; CG.clock=600; if(!CG._ot){CG._ot=true; CG.log.unshift('— Overtime —'); CG.poss=ENG.rng()<0.5?'h':'a'; CG.ballOn=25; CG.down=1; CG.toGo=10; save(); render(); return;} }
  CG.over=true; CG.lastText=`FINAL — ${team(CG.away).abbr} ${CG.as}, ${team(CG.home).abbr} ${CG.hs}.`; save(); render();
}
function cgSimToEnd(){ // finish the rest by actually PLAYING the remaining downs (no render per play) so the score AND box keep building from where you left off
  CG._auto=true;   // mute the live play-calling chess so the auto-sim stays at the calibrated AI-vs-AI scoring
  let guard=0;
  while(!CG.over && guard<900){ guard++;
    if(CG.q>4 && CG.clock<=0){ cgEndCheck(); continue; }          // end of regulation/OT → finish or start OT
    if(CG.pat){ const t=CG.pat; if(ENG.rng()<0.94){ if(t==='h')CG.hs+=1; else CG.as+=1; } CG.pat=null; cgKickoff(t); continue; }   // auto extra point
    if(CG.down>=4){ const dist=100-CG.ballOn+17; const wxf=(WX[CG.weather]?WX[CG.weather].fg:0);
      const trailBig=(CG.poss===CG.userSide? (CG.hs-CG.as):(CG.as-CG.hs))<=-9 && CG.q>=4;   // desperate late → go for it
      if(dist<=53 && CG.ballOn>=55 && !trailBig){ const off=cgTeam(CG.poss); const ok=ENG.rng()<ENG.clamp((0.98-(dist-20)*0.014)*(1+wxf),0.35,0.98);
          CG.log.unshift(`${off.abbr} ${dist}-yd field goal ${ok?'is GOOD':'NO GOOD'}.`);
          if(ok){ if(CG.poss==='h')CG.hs+=3; else CG.as+=3; cgBurn('gain'); cgKickoff(CG.poss); } else { const spot=cgMissedFGSpot(CG.ballOn); cgBurn('gain'); CG.poss=CG.poss==='h'?'a':'h'; CG.ballOn=spot; CG.down=1; CG.toGo=10; } continue; }
      if(CG.ballOn<55 && !trailBig){ const off=cgTeam(CG.poss); CG.log.unshift(`${off.abbr} punt — ${cgTeam(CG.poss==='h'?'a':'h').abbr} take over.`); cgBurn('oob'); CG.poss=CG.poss==='h'?'a':'h'; CG.ballOn=ENG.clamp(100-(CG.ballOn+ENG.ri(35,48)),1,80); CG.down=1; CG.toGo=10; continue; }
      /* else go for it → fall through to a normal play */ }
    // a normal snap, both sides auto — same resolution + box logic as cgSnap, just no render
    const offT=cgTeam(CG.poss), defT=cgTeam(CG.poss==='h'?'a':'h'), margin=(CG.poss==='h'?CG.hs-CG.as:CG.as-CG.hs);
    const offKey=simAutoOff(CG.down,CG.toGo,CG.ballOn,offT,CG.q,margin), defKey=simAutoDef(CG.down,CG.toGo,defT,CG.ballOn,CG.q,-margin);
    const r=resolvePlay(offKey, defKey);
    const off=offT, def=defT, tp=cgTop(off), dp=cgTopD(def);
    const carrier=r.isPass?null:cgRunCarrier(tp,offKey), target=r.isPass?cgPassTarget(tp,offKey):null;
	    const isTDPlay=!r.turnover && r.result!=='incomplete' && r.result!=='sack' && (CG.ballOn+r.yards>=100);
	    cgApplySnapStats(tp,dp,r,offKey,defKey,carrier,target,isTDPlay,cgTally);
    if(r.turnover){ cgBurn(r.result); cgChangePoss(); continue; }
    const firstDown=r.yards>=CG.toGo; CG.ballOn+=r.yards; cgBurn(r.result);
    if(CG.ballOn>=100){ if(r.isPass){cgTally(tp.qb,{ptd:1});cgTally(target,{rectd:1});} else cgTally(carrier||tp.rb||tp.qb,{rtd:1}); cgScoreTD(); continue; }
    if(firstDown){ CG.down=1; CG.toGo=10; } else { CG.down++; CG.toGo-=r.yards; }
    if(CG.down>4){ cgChangePoss(); }
  }
  CG._auto=false;
  if(!CG.over){ CG.over=true; }
  CG._simBox=null;   // the box is now built from the FULL accumulated tally (your coached drives + the simmed rest)
  CG.lastText='Simulated to the final — the box reflects the whole game.'; CG.lastColor='That\'s the ballgame. The box score tells the story.';
  CG.log.unshift('— Simulated the rest of the game —');
  save(); render();
}
function cgFinish(){ if(typeof cgCrowdBed==="function") cgCrowdBed(false);
  try{ rollAggravation(ut()); clearHurtFlags(team(CG&&CG.home)); clearHurtFlags(team(CG&&CG.away)); }catch(e){}
  try{ localStorage.setItem('fps_coachedonce','1'); }catch(e){}
  const home=team(CG.home), away=team(CG.away);
  const box=(t,pts)=>({team:t.abbr,pts,lines:Object.values(CG.tally).filter(x=>t.roster.some(p=>p.id===x.p.id))
    .sort((a,b)=>lineFP(b)-lineFP(a)).map(boxLineFromTally) });
  const result={home:home.abbr,away:away.abbr,hs:CG.hs,as:CG.as,ot:!!CG._ot,box:CG._simBox||{home:box(home,CG.hs),away:box(away,CG.as)}};
  const allL=[...result.box.home.lines,...result.box.away.lines]; const pg=allL.slice().sort((a,b)=>(b.fp||0)-(a.fp||0))[0];
  result.potg=pg?{id:pg.id,name:pg.name,team:(result.box.home.lines.includes(pg)?home.abbr:away.abbr),pos:pg.pos,stat:pg.stat}:null;
  const wasWeek=CG.opts&&CG.opts.week; CG=null;
  if(wasWeek) markGameResolved(result);              // counts: store the result, then handle your week
  else { toast('Exhibition complete.'); VIEW='field'; save(); render(); }   // exhibitions don't touch the season
}

/* ---- realistic full-game simulator (uses simPlay; drives the quick-sim, sim-to-end & back-test) ---- */
function simAutoOff(down,toGo,ballOn,offTeam,q,margin){
  if(offTeam) return teamCallOff(offTeam,{down,toGo:Math.max(1,toGo),ballOn,q:q||1,lateLead:(q||1)>=4&&(margin||0)>0,trailing:(margin||0)<0});
  let pr=0.57 + (down>=3?(toGo>=7?0.26:toGo<=2?-0.28:0):0) + (ballOn>=80?-0.10:0); pr=ENG.clamp(pr,0.18,0.92);
  if(toGo<=2 && ENG.rng()<0.34) return pickKey(OFF_JUMBO_KEYS);
  if(ballOn>=94 && toGo<=3 && ENG.rng()<0.46) return pickKey(OFF_JUMBO_KEYS);
  if(ENG.rng()>pr) return ENG.rng()<0.6?pickKey(OFF_INSIDE_KEYS):pickKey(OFF_OUTSIDE_KEYS);
  const r=ENG.rng();
  if(down>=3&&toGo<=4&&r<0.18) return pickKey(OFF_HANDS_KEYS);
  if(down>=3&&toGo>=8) return r<0.55?pickKey(OFF_QUICK_KEYS):r<0.78?pickKey(OFF_SHOT_KEYS):pickKey(OFF_SCREEN_KEYS);
  return r<0.50?pickKey(OFF_QUICK_KEYS):r<0.68?pickKey(OFF_SHOT_KEYS):r<0.81?pickKey(OFF_SCREEN_KEYS):pickKey(OFF_SHOT_KEYS);
}
function simAutoDef(down,toGo,defTeam,ballOn,q,margin){ if(defTeam) return teamCallDef(defTeam,{down,toGo:Math.max(1,toGo),ballOn:ballOn||25,q:q||1,trailing:(margin||0)<0});
  const r=ENG.rng();
  if(down>=3&&toGo>=7) return r<0.38?pickKey(DEF_BLITZ_KEYS):r<0.80?pickKey(DEF_COVER_KEYS):pickKey(DEF_BASE_KEYS);
  if(toGo<=2) return r<0.58?pickKey(DEF_RUN_KEYS):pickKey(DEF_BLITZ_KEYS);
  return r<0.24?pickKey(DEF_BASE_KEYS):r<0.42?pickKey(DEF_RUN_KEYS):r<0.60?pickKey(DEF_BLITZ_KEYS):r<0.77?pickKey(DEF_PRESS_KEYS):r<0.93?pickKey(DEF_COVER_KEYS):pickKey(DEF_SPY_KEYS); }
function simGameFull(home,away,bt,coachMode){
  const TM=s=>s==='h'?home:away; const tp={h:cgTop(home),a:cgTop(away)}; const tally={};
  const add=(p,o)=>{ if(!p)return; const t=tally[p.id]||(tally[p.id]={p,pyd:0,ptd:0,ryd:0,rtd:0,recyd:0,rectd:0,rec:0,patt:0,pcmp:0,pint:0,ratt:0,tgt:0,tkl:0,sack:0,intc:0,pass20:0,run10:0,rec20:0,xpass:0,xrush:0,xrec:0,big:0,pr:0,hurry:0,qbhit:0,tfl:0,pbu:0,ff:0,fr:0}); Object.keys(o).forEach(k=>t[k]=(t[k]||0)+o[k]); };
  let hs=0,as=0,poss=ENG.rng()<0.5?'h':'a',q=1,clock=900,ballOn=25,down=1,toGo=10,enteredRZ=false,guard=0;
  const recv2=poss==='h'?'a':'h'; let half=false;            // 2nd-half kickoff goes to the team that didn't open
  const newPoss=(side,spot)=>{ if(bt&&enteredRZ)bt.rzDrives++; enteredRZ=false; poss=side; ballOn=ENG.clamp(spot,1,99); down=1; toGo=10; };
  const endQ=()=>{ q++; clock=900; if(q===3 && !half){ half=true; if(bt&&enteredRZ)bt.rzDrives++; enteredRZ=false; poss=recv2; ballOn=25; down=1; toGo=10; } };
  while(q<=4 && guard++<700){
    const off=TM(poss), def=TM(poss==='h'?'a':'h'), oTp=tp[poss], dTp=cgTopD(def);
    if(ballOn>=80) enteredRZ=true;
    if(down===4){ const dist=100-ballOn+17, inFG=dist<=58;
      const trail=(poss==='h'?hs-as:as-hs)<0, late=q>=4&&clock<300;
      const go=(toGo<=2&&ballOn>=34)||(toGo<=3&&ballOn>=62&&!inFG)||(late&&trail&&toGo<=4&&ballOn>=44)||ballOn>=98;   // concentrate go-for-it on short yardage → NFL-like ~57% conversion
      if(!go){
        if(inFG&&ballOn>=52){ if(bt){bt.fgA++;bt.dFG++;} const made=ENG.rng()<fgPct(dist); if(made){ if(poss==='h')hs+=3;else as+=3; if(bt)bt.fgM++; } clock-=ENG.ri(18,32); newPoss(poss==='h'?'a':'h',25); continue; }
        else { clock-=ENG.ri(10,20); if(bt)bt.dPunt++; newPoss(poss==='h'?'a':'h', 100-(ballOn+ENG.ri(38,48))); continue; }   // punt
      } }
	    const margin=poss==='h'?hs-as:as-hs;
	    const offCall=simAutoOff(down,toGo,ballOn,off,q,margin), defCall=simAutoDef(down,toGo,def,ballOn,q,-margin);
	    const r=simPlay(off,def,offCall,defCall,{rz:ballOn>=80, toGoal:100-ballOn, down, toGo, q, read: coachMode?readFactor(offCall,defCall):0});   // coachMode = grade the LIVE play-calling-chess resolver (your hand-called games)
    const carrier=r.isPass?null:cgRunCarrier(oTp,offCall), target=r.isPass?cgPassTarget(oTp,offCall):null;
    if(bt){ bt.plays++; if(down===3)bt.thirdA++; if(down===4)bt.fourthA++;
      if(r.isPass){ if(r.result==='sack')bt.sacks++; else { bt.passAtt++; if(r.result==='INT')bt.ints++; else if(r.result!=='incomplete'){bt.comp++;bt.passYds+=r.yards;} } }
      else bt.rush.push(r.yards); }
	    const isTDPlay=!r.turnover && r.result!=='incomplete' && r.result!=='sack' && (ballOn+r.yards>=100);
	    cgApplySnapStats(oTp,dTp,r,offCall,defCall,carrier,target,isTDPlay,add);
    clock -= (r.result==='incomplete'?5:r.isPass?ENG.ri(22,34):ENG.ri(26,40));   // pass plays stop clock more often → ~28s avg
    if(r.turnover){ clock-=ENG.ri(2,10); if(bt)bt.dTO++; newPoss(poss==='h'?'a':'h', 100-ballOn); if(clock<=0)endQ(); continue; }
    ballOn+=r.yards;
    if(ballOn>=100){ const xp=ENG.rng()<0.94?1:0; if(poss==='h')hs+=6+xp; else as+=6+xp; if(bt)bt.dTD++;
      if(r.isPass){add(oTp.qb,{ptd:1});add(target,{rectd:1});} else add(carrier||oTp.rb||oTp.qb,{rtd:1});
      if(bt&&enteredRZ)bt.rzTD++; newPoss(poss==='h'?'a':'h',25); if(clock<=0)endQ(); continue; }
    const gained=r.yards;
    if(down===3 && gained>=toGo && bt) bt.thirdC++;
    if(down===4 && gained>=toGo && bt) bt.fourthC++;
    if(gained>=toGo){ down=1; toGo=10; } else { down++; toGo-=gained; }
    if(down>4){ clock-=ENG.ri(2,8); if(bt)bt.dDowns++; newPoss(poss==='h'?'a':'h', 100-ballOn); }
    if(clock<=0)endQ();
  }
  if(hs===as){ if(ENG.rng()<0.5)hs+=3; else as+=3; }
  const box=(t,pts)=>({team:t.abbr,pts,lines:Object.values(tally).filter(x=>t.roster.some(p=>p.id===x.p.id)).sort((a,b)=>lineFP(b)-lineFP(a)).map(boxLineFromTally) });
  const result={home:home.abbr,away:away.abbr,hs,as,ot:false,box:{home:box(home,hs),away:box(away,as)}};
  const allL=[...result.box.home.lines,...result.box.away.lines]; const pg=allL.slice().sort((a,b)=>(b.fp||0)-(a.fp||0))[0];
  result.potg=pg?{id:pg.id,name:pg.name,team:(result.box.home.lines.includes(pg)?home.abbr:away.abbr),pos:pg.pos,stat:pg.stat}:null;
  return result;
}
// back-test: simulate N games across random matchups, compare every rate to the NFL dataset
function backtestSim(N,coachMode){
  const bt={rush:[],plays:0,passAtt:0,comp:0,passYds:0,sacks:0,ints:0,thirdA:0,thirdC:0,fourthA:0,fourthC:0,fgA:0,fgM:0,rzDrives:0,rzTD:0,dTD:0,dFG:0,dPunt:0,dTO:0,dDowns:0};
  let pts=0,games=0; const TM=G.teams;
  for(let i=0;i<N;i++){ const o=TM[Math.floor(ENG.rng()*TM.length)], d=TM[Math.floor(ENG.rng()*TM.length)]; if(o===d)continue;
    const r=simGameFull(o,d,bt,coachMode); pts+=r.hs+r.as; games++; }
  const rushAvg=bt.rush.reduce((a,b)=>a+b,0)/bt.rush.length;
  const dropbacks=bt.passAtt+bt.sacks;
  return {
    ypc:rushAvg.toFixed(2), comp:Math.round(bt.comp/bt.passAtt*100), ypa:(bt.passYds/bt.passAtt).toFixed(1),
    sackPct:(bt.sacks/dropbacks*100).toFixed(1), intPct:(bt.ints/bt.passAtt*100).toFixed(1),
    passRate:Math.round(dropbacks/bt.plays*100), third:Math.round(bt.thirdC/bt.thirdA*100), fourth:bt.fourthA?Math.round(bt.fourthC/bt.fourthA*100):0,
    fg:bt.fgA?Math.round(bt.fgM/bt.fgA*100):0, rzTD:bt.rzDrives?Math.round(bt.rzTD/bt.rzDrives*100):0,
    pts:(pts/games/2).toFixed(1), plays:Math.round(bt.plays/games/2),
    dTD:(bt.dTD/games/2).toFixed(2), dFG:(bt.dFG/games/2).toFixed(2), dFGm:(bt.fgM/games/2).toFixed(2),
    dPunt:(bt.dPunt/games/2).toFixed(2), dTO:(bt.dTO/games/2).toFixed(2), dDowns:(bt.dDowns/games/2).toFixed(2),
    drives:((bt.dTD+bt.dFG+bt.dPunt+bt.dTO+bt.dDowns)/games/2).toFixed(2)
  };
}
// the metrics the validator grades the engine on, each vs the real NFL league average
const SIMLAB_METRICS=[
  {k:'ypc',  lbl:'Yards / carry',      nfl:4.3, tol:0.4, unit:''},
  {k:'comp', lbl:'Completion %',       nfl:65,  tol:3,   unit:'%'},
  {k:'ypa',  lbl:'Yards / pass att',   nfl:7.0, tol:0.6, unit:''},
  {k:'sackPct',lbl:'Sack %',           nfl:6.8, tol:1.2, unit:'%'},
  {k:'intPct', lbl:'Interception %',   nfl:2.3, tol:0.7, unit:'%'},
  {k:'passRate',lbl:'Pass-play %',     nfl:57,  tol:3,   unit:'%'},
  {k:'third',lbl:'3rd-down conv %',    nfl:39,  tol:4,   unit:'%'},
  {k:'fourth',lbl:'4th-down conv %',   nfl:57,  tol:9,   unit:'%'},
  {k:'fg',   lbl:'Field-goal %',       nfl:85,  tol:4,   unit:'%'},
  {k:'rzTD', lbl:'Red-zone TD %',      nfl:58,  tol:7,   unit:'%'},
  {k:'pts',  lbl:'Points / team',      nfl:21.8,tol:2.5, unit:''},
  {k:'plays',lbl:'Plays / team',       nfl:63,  tol:5,   unit:''},
  {k:'drives',lbl:'Drives / team',     nfl:11,  tol:1.6, unit:''},
];
function simLabTable(b){
  let pass=0; const rows=SIMLAB_METRICS.map(mt=>{
    const v=parseFloat(b[mt.k]), diff=Math.abs(v-mt.nfl);
    const ok=diff<=mt.tol, close=diff<=mt.tol*2;
    if(ok)pass++;
    const col=ok?'var(--good,#46d39a)':close?'#e8b341':'var(--bad,#ef5b6b)';
    const tag=ok?'✓ NFL':close?'≈ close':'⚠ off';
    return `<tr style="border-top:1px solid var(--line,#1b2940)">
      <td style="padding:7px 10px">${mt.lbl}</td>
      <td style="padding:7px 10px;text-align:right;font-family:var(--mono);font-weight:700">${b[mt.k]}${mt.unit}</td>
      <td style="padding:7px 10px;text-align:right;font-family:var(--mono);color:var(--muted,#93a4c4)">${mt.nfl}${mt.unit}</td>
      <td style="padding:7px 10px;text-align:right;color:${col};font-weight:700">${tag}</td></tr>`;
  }).join('');
  const grade= pass>=12?'ELITE — matches NFL play-by-play':pass>=10?'STRONG — true to the league':pass>=8?'SOLID':'NEEDS TUNING';
  const gcol= pass>=10?'var(--good,#46d39a)':pass>=8?'#e8b341':'var(--bad,#ef5b6b)';
  return `<div class="row" style="justify-content:space-between;align-items:baseline;flex-wrap:wrap;margin-bottom:10px">
      <div style="font-family:var(--mono);color:${gcol};font-weight:800;font-size:15px">${pass}/13 within NFL tolerance — ${grade}</div>
      <div class="muted" style="font-size:12px">box score / drive breakdown: ${b.dTD} TD · ${b.dFGm} FG · ${b.dPunt} punt · ${b.dTO} TO per team/game</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="text-align:left;color:var(--muted,#93a4c4);font-size:11px;letter-spacing:.04em">
        <th style="padding:4px 10px">METRIC</th><th style="padding:4px 10px;text-align:right">THIS ENGINE</th>
        <th style="padding:4px 10px;text-align:right">REAL NFL</th><th style="padding:4px 10px;text-align:right">MATCH</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
}
function scrSimLab(m,t){
  head(m,'Sim Lab','Every snap resolves from real NFL play-by-play distributions — not a coin flip. Run the validator to grade the engine against the live league.');
  const card=el('div','card');
  card.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
    <div><h3 style="margin:0">NFL Calibration Validator</h3><span class="muted" style="font-size:12px">Simulates a slate of games across random matchups and compares 13 rate stats to the real league average.</span></div>
    <div class="flex" style="gap:8px"><select id="slMode" title="Which resolver to grade"><option value="auto" selected>Engine (AI vs AI)</option><option value="coach">Coach Mode (your play-calling)</option></select><select id="slN"><option value="80">80 games</option><option value="160" selected>160 games</option><option value="320">320 games</option></select>
    <button class="btn" id="slRun">▶ Run back-test</button></div></div>
    <div id="slOut" style="margin-top:14px"><p class="muted">Crunching the opening slate…</p></div>`;
  m.appendChild(card);
  const note=el('div','card'); note.style.marginTop='12px';
  note.innerHTML=`<h3 style="margin:0 0 6px">How it works</h3>
    <p class="muted" style="margin:0;font-size:13px;line-height:1.6">Each play picks a real play type (inside/outside run, short/play-action/screen/deep pass) and draws its yardage, completion, sack and interception odds from the same profiles the NFL produces season after season. The defensive call tilts those odds — but across a full slate the aggregates hold, so the league looks like the league. The exact same resolver powers <b>Coach Mode</b>, the <b>sim-to-end</b>, and these numbers.</p>`;
  m.appendChild(note);
  const run=(N,mode)=>{ const out=$('#slOut'); if(out)out.innerHTML='<p class="muted">Simulating… resolving play-by-play across the slate.</p>';
    setTimeout(()=>{ const b=backtestSim(N, mode==='coach'); const o=$('#slOut'); if(o){ o.innerHTML=(mode==='coach'?'<p class="muted" style="margin:0 0 8px;font-size:12px">Grading the <b>live Coach-Mode resolver</b> — play-calling chess ON. Neutral calling lands at league average; out-scheming the defense beats it, getting out-schemed trails it.</p>':'')+simLabTable(b); } }, 30); };
  setTimeout(()=>{ const btn=$('#slRun'); if(btn) btn.onclick=()=>run(+($('#slN').value||160), $('#slMode').value); run(120,'auto'); }, 0);
}

function stadiumStageSVG(t, wx, h, opts){
  h=h||640; opts=opts||{};
  const pri=(t.pri&&t.pri!=='#101010')?t.pri:'#1f4f8f', sec=(t.sec&&t.sec!=='#ffffff')?t.sec:'#d9e8ff';
  const night=!!opts.night||wx==='snow', seed=stadiumHash(t.abbr), R=(salt,mod)=>(((seed^(salt*2654435761))>>>0)%mod);
  const sky1=night?'#071022':wx==='rain'?'#4d5d70':wx==='cold'?'#93a7bb':'#9ed0f5', sky2=night?'#14243f':wx==='rain'?'#7c8794':wx==='snow'?'#e5edf5':'#e9f6ff';
  let s=`<svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" style="width:100%;height:${h}px;display:block">
    <defs><linearGradient id="stageSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
    <linearGradient id="stand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2637"/><stop offset=".55" stop-color="#0c1420"/><stop offset="1" stop-color="#050912"/></linearGradient>
    <linearGradient id="fieldGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c7a3a"/><stop offset="1" stop-color="#0c3c20"/></linearGradient>
    <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1200" height="720" fill="url(#stageSky)"/>`;
  if(!night && wx!=='rain') s+=`<circle cx="${890+R(1,120)}" cy="${74+R(2,40)}" r="44" fill="#ffe48a" opacity=".82"/>`;
  s+=`<g fill="${night?'#06101f':'#263246'}" opacity="${night?.92:.78}">`;
  for(let i=0;i<16;i++){ const left=i<8, x=left?(30+i*54+R(i+5,18)):(760+(i-8)*48+R(i+17,18)), y=144-R(i+30,54), w=28+R(i+50,34), ht=170-y+R(i+70,36); s+=`<rect x="${x}" y="${y}" width="${w}" height="${ht}"/>`; }
  s+=`</g>`;
  s+=`<g opacity=".9"><path d="M0 210 C210 116 414 134 600 216 C786 134 990 116 1200 210 L1200 720 L0 720 Z" fill="url(#stand)"/>
    <path d="M42 250 C220 184 404 190 574 252 L526 516 C354 476 188 486 0 564 L0 278 Z" fill="#111b2a"/>
    <path d="M1158 250 C980 184 796 190 626 252 L674 516 C846 476 1012 486 1200 564 L1200 278 Z" fill="#111b2a"/>
    <path d="M0 352 C204 278 394 286 552 356 L540 414 C350 358 168 374 0 452 Z" fill="${pri}" opacity=".68"/>
    <path d="M1200 352 C996 278 806 286 648 356 L660 414 C850 358 1032 374 1200 452 Z" fill="${pri}" opacity=".68"/>
    <path d="M132 426 C302 386 452 402 600 452 C748 402 898 386 1068 426 L1016 636 C820 576 380 576 184 636 Z" fill="#09111c"/>
    <path d="M168 462 C320 426 466 438 600 486 C734 438 880 426 1032 462 L990 610 C810 558 390 558 210 610 Z" fill="#162033"/></g>`;
  s+=`<g fill="${sec}" opacity=".52">`;
  for(let i=0;i<190;i++){ const side=i%2?-1:1, band=Math.floor(i/2)%4, x=side<0?(64+R(i+90,440)):(696+R(i+95,440)), y=270+band*42+R(i+100,28); s+=`<circle cx="${x}" cy="${y}" r="${1+R(i+120,3)}"/>`; }
  s+=`</g>`;
  s+=`<g stroke="#e9f4ff" stroke-width="5" opacity="${night?.8:.55}" filter="url(#softGlow)">
    <line x1="70" y1="214" x2="278" y2="156"/><line x1="1130" y1="214" x2="922" y2="156"/>
    <line x1="252" y1="154" x2="948" y2="154"/><line x1="320" y1="190" x2="880" y2="190"/></g>
    <rect x="342" y="118" width="516" height="54" rx="8" fill="#07101d" opacity=".84"/>
    <rect x="370" y="132" width="460" height="26" rx="4" fill="${pri}" opacity=".92"/>
    <text x="600" y="151" fill="#f6fbff" text-anchor="middle" font-size="20" font-family="Arial" font-weight="800" letter-spacing="8">${(t.city||t.abbr||'HOME').toUpperCase()}</text>
    <path d="M162 602 C330 540 492 532 600 568 C708 532 870 540 1038 602 L1076 720 L124 720 Z" fill="url(#fieldGlow)" opacity=".9"/>
    <path d="M236 632 C400 590 800 590 964 632" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="3"/>
    <path d="M290 664 L910 664" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><path d="M600 570 L600 704" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>`;
  if(night) s+=`<rect width="1200" height="720" fill="#06101b" opacity=".28"/>`;
  s+=`</svg>`;
  return s;
}

// stylized, FUTURISTIC per-team stadium art (original renders inspired by SoFi/Mercedes-Benz/Allianz —
// translucent oculus canopies, glowing "halo" ring boards, color-changing LED facades). 5 archetypes, day/night.
function stadiumHash(a){ let s=7; for(let i=0;i<(a||'').length;i++)s=(s*31+a.charCodeAt(i))>>>0; return s; }
function stadiumSVG(t, wx, h, opts){ h=h||156; opts=opts||{};
  const pri=(t.pri&&t.pri!=='#101010')?t.pri:'#2a3550', sec=(t.sec&&t.sec!=='#ffffff')?t.sec:'#7fa8d8';
  const dome=DOME_TEAMS.has(t.abbr), night=!!opts.night||wx==='snow';
  const seed=stadiumHash(t.abbr), R=(salt,mod)=>(((seed^(salt*2654435761))>>>0)%mod);   // distinct deterministic rolls → every team is unique
  const ACC=['#7fe3ff','#ff7ad1','#7affa8','#ffd24a','#b69bff','#ff9a6b','#6bd0ff','#9dff6b','#ff6b8b','#5be0c0','#ff5b6b','#c0ff5b','#5b8bff','#ffb85b'];
  const glow=ACC[R(1,ACC.length)];
  const arch = dome ? ['oculus','halo','shell'][R(2,3)] : ['towers','wave','shell'][R(2,3)];   // even open teams vary (shell w/o full roof)
  const sky = night?'#0a1230': wx==='rain'?'#54657b':wx==='cold'?'#7d92ac':wx==='wind'?'#86a0bf':'#a9d4ff';
  const sky2= night?'#1b2750': wx==='rain'?'#79899d': wx==='snow'?'#dfe8f2':'#e8f4ff';
  const rx=186+R(4,26), ry=50+R(5,8), bY=h-6, rY=h-ry-2, GL=night?'filter="url(#gl)"':'';
  let s=`<svg viewBox="0 0 420 ${h}" preserveAspectRatio="xMidYMid slice" style="width:100%;height:${h}px;display:block">
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
    <linearGradient id="bw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pri}"/><stop offset="1" stop-color="#070b12"/></linearGradient>
    <radialGradient id="fg" cx="0.5" cy="0.5" r="0.65"><stop offset="0" stop-color="#16a34a"/><stop offset="1" stop-color="#0a5a2a"/></radialGradient>
    <filter id="gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="420" height="${h}" fill="url(#sk)"/>`;
  if(night){ for(let i=0;i<22;i++){ const x=(i*53+11)%420, y=(i*29+5)%60; s+=`<circle cx="${x}" cy="${y}" r="${i%4?0.8:1.4}" fill="#fff" opacity="${i%3?0.45:0.85}"/>`; } }
  else if(wx==='snow'||wx==='rain'){ for(let i=0;i<22;i++){ const x=(i*37)%420, y=(i*53%64)+6; s+= wx==='snow'?`<circle cx="${x}" cy="${y}" r="1.5" fill="#fff" opacity=".8"/>`:`<line x1="${x}" y1="${y}" x2="${x-3}" y2="${y+7}" stroke="#cdd9e8" stroke-width="1" opacity=".5"/>`; } }
  else s+=`<circle cx="${326+R(9,46)}" cy="${22+R(10,18)}" r="14" fill="#ffe27a" opacity=".9"/>`;
  // UNIQUE skyline — seed-driven count, positions, heights
  const ncol=6+R(7,4); const cols=[]; s+=`<g fill="${night?'#0a1326':'#1b2433'}" opacity="${night?.95:.82}">`;
  for(let i=0;i<ncol;i++){ const half=Math.ceil(ncol/2), left=i<half; const idx=left?i:i-half; const x=(left?6+idx*28:284+idx*30)+R(i+30,12); const by=56-R(i+70,24), bh=46+R(i+50,56); cols.push([x,by]); s+=`<rect x="${x}" y="${by}" width="${18+R(i+90,12)}" height="${bh}"/>`; }
  s+=`</g>`; if(night){ s+=`<g fill="#ffd86b" opacity=".7">`; cols.forEach(c=>{ for(let r=0;r<3;r++) s+=`<rect x="${c[0]+4+r*7}" y="${c[1]+6}" width="3" height="4"/>`; }); s+=`</g>`; }
  // ROOF / structure
  if(arch==='oculus'){ s+=`<path d="M${210-rx*0.95} ${rY} Q120 ${rY-50} 196 ${rY-24}" fill="none" stroke="${sec}" stroke-width="7" opacity=".8" stroke-linecap="round"/>
    <path d="M224 ${rY-24} Q300 ${rY-50} ${210+rx*0.95} ${rY}" fill="none" stroke="${sec}" stroke-width="7" opacity=".8" stroke-linecap="round"/>
    <ellipse cx="210" cy="${rY-18}" rx="15" ry="5" fill="${glow}" opacity="${night?.95:.6}" ${GL}/>`; }
  else if(arch==='halo'){ s+=`<path d="M${210-rx*0.86} ${rY} Q210 ${rY-62} ${210+rx*0.86} ${rY}" fill="${sec}" opacity=".15"/><path d="M${210-rx*0.86} ${rY} Q210 ${rY-62} ${210+rx*0.86} ${rY}" fill="none" stroke="${pri}" stroke-width="6" opacity=".85"/>
    <circle cx="210" cy="${rY-28}" r="9" fill="${sky}" stroke="${sec}" stroke-width="2"/>
    <ellipse cx="210" cy="${rY-2}" rx="${rx*0.62}" ry="13" fill="none" stroke="${glow}" stroke-width="4" opacity="${night?1:.75}" filter="url(#gl)"/>`; }
  else if(arch==='wave'){ s+=`<path d="M18 ${rY+8} Q150 ${rY-50} 402 ${rY-8}" fill="none" stroke="${pri}" stroke-width="7" opacity=".85" stroke-linecap="round"/>
    <path d="M18 ${rY+8} Q150 ${rY-50} 402 ${rY-8} L402 ${rY+2} Q150 ${rY-30} 18 ${rY+16} Z" fill="${sec}" opacity=".15"/>`; }
  else if(arch==='towers'){ s+=`<g stroke="#cfd8e6" stroke-width="2.5"><line x1="64" y1="${bY-64}" x2="64" y2="${bY-28}"/><line x1="356" y1="${bY-64}" x2="356" y2="${bY-28}"/></g>
    <rect x="52" y="${bY-72}" width="24" height="10" rx="2" fill="#fff" opacity="${night?1:.85}" ${GL}/><rect x="344" y="${bY-72}" width="24" height="10" rx="2" fill="#fff" opacity="${night?1:.85}" ${GL}/>`;
    if(night) s+=`<path d="M64 ${bY-62} L150 ${bY-18} L40 ${bY-18} Z" fill="#fff" opacity=".05"/><path d="M356 ${bY-62} L380 ${bY-18} L268 ${bY-18} Z" fill="#fff" opacity=".05"/>`; }
  // BOWL (seed-proportioned)
  s+=`<ellipse cx="210" cy="${bY}" rx="${rx}" ry="${ry}" fill="url(#bw)"/>`;
  if(arch==='shell'){ const x0=210-rx*0.92, span=rx*1.84; for(let i=0;i<24;i++){ const x=x0+i*(span/23), yb=bY-14-Math.round(Math.sin(Math.PI*i/23)*(ry-14)); s+=`<rect x="${x}" y="${yb}" width="${(span/24)-1}" height="${bY-2-yb}" rx="3" fill="${night?glow:pri}" opacity="${night?(0.4+0.4*Math.abs(Math.sin(i*1.3))):0.42}" ${night?GL:''}/>`; } }
  s+=`<ellipse cx="210" cy="${bY-ry*0.18}" rx="${rx*0.76}" ry="${ry*0.7}" fill="${sec}" opacity="${night?.26:.32}"/>`;
  s+=`<ellipse cx="210" cy="${bY-ry*0.4}" rx="${rx*0.8}" ry="${ry*0.55}" fill="none" stroke="${glow}" stroke-width="2.5" opacity="${night?.95:.55}" ${GL}/>`;   // LED ribbon in the team's glow color
  // field + team-colored end zones
  s+=`<ellipse cx="210" cy="${bY-14}" rx="118" ry="28" fill="url(#fg)"/>
    <ellipse cx="${210-104}" cy="${bY-14}" rx="14" ry="26" fill="${pri}" opacity=".5"/><ellipse cx="${210+104}" cy="${bY-14}" rx="14" ry="26" fill="${pri}" opacity=".5"/>
    <ellipse cx="210" cy="${bY-14}" rx="118" ry="28" fill="none" stroke="#fff" stroke-opacity=".35"/><line x1="210" y1="${bY-40}" x2="210" y2="${bY+10}" stroke="#fff" stroke-opacity=".3"/>`;
  // SIGNATURE element — a unique landmark per team
  const sg=R(3,7);
  if(sg===0) s+=`<g stroke="${glow}" stroke-width="3" ${GL}><line x1="46" y1="${rY-22}" x2="46" y2="${rY+8}"/><line x1="374" y1="${rY-22}" x2="374" y2="${rY+8}"/></g><circle cx="46" cy="${rY-24}" r="3" fill="${glow}"/><circle cx="374" cy="${rY-24}" r="3" fill="${glow}"/>`;
  else if(sg===1) s+=`<rect x="350" y="${rY-38}" width="7" height="${bY-rY+36}" fill="${pri}"/><circle cx="353.5" cy="${rY-40}" r="5" fill="${glow}" ${GL}/>`;
  else if(sg===2) s+=`<path d="M34 ${bY-8} Q74 ${rY+2} 114 ${bY-8}" fill="none" stroke="${sec}" stroke-width="3" opacity=".7"/><path d="M306 ${bY-8} Q346 ${rY+2} 386 ${bY-8}" fill="none" stroke="${sec}" stroke-width="3" opacity=".7"/>`;
  else if(sg===3) s+=`<rect x="372" y="${rY-12}" width="24" height="34" rx="2" fill="#0a0f18" stroke="${glow}" stroke-width="1.5"/><rect x="375" y="${rY-8}" width="18" height="12" fill="${glow}" opacity=".5"/>`;
  else if(sg===4) s+=`<path d="M150 ${rY+4} Q210 ${rY-46} 270 ${rY+4} Z" fill="${pri}" opacity=".5" stroke="${glow}" stroke-width="1.5"/>`;
  else if(sg===5) s+=Array.from({length:9},(_,i)=>{const x=72+i*34;return `<line x1="${x}" y1="${bY-42}" x2="${x}" y2="${bY-54}" stroke="#cfd8e6" stroke-width="1"/><path d="M${x} ${bY-54} l7 3 -7 3 Z" fill="${i%2?pri:sec}"/>`;}).join('');
  else s+=`<rect x="18" y="${bY-42}" width="24" height="38" rx="3" fill="${glow}" opacity="${night?.5:.25}" ${GL}/><rect x="378" y="${bY-42}" width="24" height="38" rx="3" fill="${glow}" opacity="${night?.5:.25}" ${GL}/>`;
  s+=`<text x="210" y="${bY-11}" text-anchor="middle" font-family="monospace" font-size="11" fill="#fff" opacity=".82" letter-spacing="2">${t.abbr}</text></svg>`;
  return s; }
// ---- rivalries: the games that make a league feel like a real football world ----
const RIVALS={'BUF|MIA':'AFC East','BUF|NE':'AFC East','MIA|NE':'AFC East','GB|CHI':'the Border Battle','GB|MIN':'NFC North','CHI|MIN':'NFC North','CHI|DET':'NFC North',
  'DAL|PHI':'NFC East','DAL|NYG':'NFC East','DAL|WAS':'NFC East','PHI|NYG':'NFC East','PHI|WAS':'NFC East',
  'PIT|BAL':'AFC North','PIT|CIN':'AFC North','PIT|CLE':'AFC North','BAL|CLE':'AFC North','BAL|CIN':'AFC North',
  'KC|LV':'AFC West','KC|DEN':'AFC West','LV|DEN':'AFC West','LAC|KC':'AFC West','LAC|LV':'AFC West',
  'SF|SEA':'NFC West','SF|LAR':'NFC West','SEA|LAR':'NFC West','SF|DAL':'a classic rivalry','ARI|SEA':'NFC West',
  'NO|ATL':'NFC South','TB|NO':'NFC South','ATL|CAR':'NFC South','TB|CAR':'NFC South','NYJ|NE':'AFC East','NYJ|BUF':'AFC East'};
function rivalryName(a,b){ if(!a||!b)return null; if(RIVALS[a+'|'+b])return RIVALS[a+'|'+b]; if(RIVALS[b+'|'+a])return RIVALS[b+'|'+a];
  const ta=team(a),tb=team(b); if(ta&&tb&&ta.div===tb.div&&ta.conf===tb.conf) return 'a division rivalry'; return null; }
function scrField(m,t){
  if(CG && CG.active){ cgRender(m); return; }       // a game is in progress — show the broadcast
  head(m,'The Field','Your game, your way — call every snap with a live box score and scores from around the league.');
  const sch=(G.phase==='regular'&&G.schedule[G.week])||[]; const myGame=sch.find(x=>x.home===USER||x.away===USER);
  if(myGame){ const aT=team(myGame.away), hT=team(myGame.home); const slot=userGameSlot(); const wx=gameWeather(myGame.home, G.week);
    const riv=rivalryName(myGame.home,myGame.away);
    const gc=el('div','card'); gc.style.cssText='padding:0;overflow:hidden;'+((slot&&slot.prime)?'border:1px solid #4a3a7a':'');
    gc.innerHTML=`<div style="position:relative">${venueArt(hT, wx, 150, {night:slot&&slot.prime})}<div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;font-family:var(--disp,sans-serif);font-weight:800;letter-spacing:2px;font-size:12px;color:#fff;text-shadow:0 1px 4px #000">${slot?(slot.prime?'🌙 ':'')+slot.label+' · '+slot.net:''} · ${WX[wx].icon} ${WX[wx].label}</div></div>
      <div style="padding:16px">${riv?`<div style="text-align:center;margin-bottom:10px"><span style="background:#b3001b;color:#fff;font-family:var(--mono);font-size:11px;font-weight:800;letter-spacing:1.5px;padding:3px 12px;border-radius:12px">⚔ RIVALRY — ${riv.toUpperCase()}</span></div>`:''}
      <div class="row" style="justify-content:space-around;align-items:center;text-align:center">
        <div>${logoTag(aT,54)}<div style="font-weight:700;margin-top:4px">${aT.city} ${aT.nick}</div><div class="muted" style="font-size:11px">${aT.wins}-${aT.losses} · ${ENG.teamOvr(aT)} OVR</div></div>
        <div class="muted" style="font-family:var(--disp,sans-serif);font-size:22px">@</div>
        <div>${logoTag(hT,54)}<div style="font-weight:700;margin-top:4px">${hT.city} ${hT.nick}</div><div class="muted" style="font-size:11px">${hT.wins}-${hT.losses} · ${ENG.teamOvr(hT)} OVR</div></div>
      </div>
      ${window.ODDS?(()=>{const L=ODDS.gameLine(hT,aT,wx);return `<div style="text-align:center;margin-top:12px;font-family:var(--mono);font-size:12px;color:var(--muted,#93a4c4)">📊 ${L.favAbbr} -${L.line} · O/U ${L.total.toFixed(1)} · ML ${aT.abbr} ${L.mlAway} / ${hT.abbr} ${L.mlHome}</div>`;})():''}
      <div class="flex" style="justify-content:center;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn" id="fcoach" style="padding:11px 24px;font-size:15px">▶ Kickoff — Coach the Game</button><button class="btn sec" id="fsimit">⏭ Sim It</button></div>
      <div class="muted" style="text-align:center;font-size:12px;margin-top:8px">Call offense AND defense every snap. Live play-by-play, a per-player box score, and the rest of the league's scores as they come in.</div></div>`;
    m.appendChild(gc);
    setTimeout(()=>{ const cb=$('#fcoach'); if(cb)cb.onclick=()=>startCoachGame(myGame.home,myGame.away,{week:true}); const sb=$('#fsimit'); if(sb)sb.onclick=()=>simUserGame(); },0);
  } else { const gc=el('div','card'); gc.innerHTML='<p class="muted">No game scheduled this week (bye) — run an exhibition below.</p>'; m.appendChild(gc); }
  // exhibition — coach a full game vs any opponent (does not affect the season)
  const opp = FOPP && team(FOPP) && FOPP!==USER ? FOPP : (G.teams.find(x=>x.abbr!==USER)||{}).abbr; FOPP=opp;
  const ex=el('div','card'); ex.style.marginTop='12px';
  ex.innerHTML=`<h3>Exhibition</h3><div class="row" style="flex-wrap:wrap;gap:10px;align-items:center"><span class="muted">${t.city} ${t.nick} vs</span>
    <select id="fopp">${G.teams.filter(x=>x.abbr!==USER).map(x=>`<option value="${x.abbr}" ${x.abbr===opp?'selected':''}>${x.city} ${x.nick}</option>`).join('')}</select>
    <button class="btn" id="fexplay">▶ Coach Exhibition</button><span class="muted" style="font-size:12px">a full game; doesn't count in the standings</span></div>`;
  m.appendChild(ex);
  setTimeout(()=>{ const b=$('#fexplay'); if(b)b.onclick=()=>{ FOPP=$('#fopp').value; startCoachGame(USER, FOPP, {}); }; },0);
}
// play the user's actual scheduled game with static field snapshots; the result advances the season
function playWeekGame(cv){
  if(G.phase!=='regular'){ toast('Advance to a regular-season week first.'); return; }
  const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER);
  if(!g){ toast('Bye week.'); return; }
  if(FSIM)FSIM.stop();
  const home=team(g.home), away=team(g.away);
  const st={home,away,hs:0,as:0,off:Math.random()<0.5?'h':'a',los:25,down:1,toGo:10,plays:0,max:120,quarter:1,tally:{},log:[]};
  const add=(p,o)=>{ if(!p)return; const tl=st.tally[p.id]||(st.tally[p.id]={p,pyd:0,ptd:0,ryd:0,rtd:0,recyd:0,rectd:0,rec:0,patt:0,pcmp:0,pint:0,ratt:0,tgt:0,tkl:0,sack:0,intc:0,pass20:0,run10:0,rec20:0,xpass:0,xrush:0,xrec:0,big:0,pr:0,hurry:0,qbhit:0,tfl:0,pbu:0,ff:0,fr:0}); Object.keys(o).forEach(k=>tl[k]=(tl[k]||0)+o[k]); };
  const sb=()=>{ const e=$('#fgsb'); if(e)e.innerHTML=`<b>${away.abbr} ${st.as} — ${st.hs} ${home.abbr}</b> · Q${st.quarter} · ${(st.off==='h'?home:away).abbr} ball, ${st.down}&amp;${Math.max(1,Math.round(st.toGo))} at the ${st.los<=50?'own '+st.los:'opp '+(100-st.los)}`; };
  const logLine=(s)=>{ const dl=$('#fdlog'); if(dl){ if(dl.querySelector('.muted'))dl.innerHTML=''; const d=el('div','ply'); d.innerHTML=s; dl.insertBefore(d,dl.firstChild); } };
  const turnover=(msg)=>{ if(msg)logLine(msg); st.off=st.off==='h'?'a':'h'; st.los=25; st.down=1; st.toGo=10; sb(); setTimeout(play, 650); };
  function play(){
    if(VIEW!=='field'){ return; }                  // user navigated away
    if(st.plays>=st.max){ return finish(); }
    st.plays++; st.quarter=Math.min(4,Math.floor(st.plays/30)+1);
    const offT=st.off==='h'?home:away, defT=st.off==='h'?away:home;
    if(st.down>=4){ if(st.los>=58 && Math.random()<0.62){ const good=Math.random()<0.85; if(good){ if(st.off==='h')st.hs+=3; else st.as+=3; } return turnover(`<b>FIELD GOAL</b> ${offT.nick} — ${good?'GOOD':'no good'}.`); } return turnover(`${offT.nick} punt.`); }
    const pl=Math.random()<SIM.passTendency(offT)?'pass':'run';
    if(FSIM)FSIM.stop(); FSIM=new SIM.FieldSim(cv); FSIM.setup(offT,defT,pl,st.los);
    fieldStaticResult(FSIM,res=>{
      if(pl==='pass' && !(FSIM.qb&&FSIM.qb.scrambled)){
        if(res.outcome!=='sack') add(FSIM.qb&&FSIM.qb.p,{patt:1});
        if(FSIM.target&&res.outcome!=='sack') add(FSIM.target.p,{tgt:1});
        if(['tackle','oob','TD'].includes(res.outcome)){ const y=Math.max(0,res.yards), ex=y>=20?{pass20:1,xpass:1,big:1}:{}; add(FSIM.qb&&FSIM.qb.p,Object.assign({pyd:y,pcmp:1},ex)); add(FSIM.target&&FSIM.target.p,Object.assign({recyd:y,rec:1},y>=20?{rec20:1,xrec:1,big:1}:{})); }
        if(res.outcome==='INT') add(FSIM.qb&&FSIM.qb.p,{pint:1});
      }
      else { const y=res.yards; add((FSIM.carrier&&FSIM.carrier.p)||(FSIM.qb&&FSIM.qb.p),Object.assign({ryd:y,ratt:1},y>=10?{run10:1,xrush:1,big:1}:{})); }
      logLine(`<span class="muted">${offT.abbr} ${pl}:</span> ${res.text}`);
      if(res.outcome==='INT'){ return turnover(); }
      st.los+=res.yards;
      if(st.los>=100){ if(st.off==='h')st.hs+=7; else st.as+=7;
        if(pl==='pass'&&!(FSIM.qb&&FSIM.qb.scrambled)){add(FSIM.qb&&FSIM.qb.p,{ptd:1});add(FSIM.target&&FSIM.target.p,{rectd:1});} else add((FSIM.carrier&&FSIM.carrier.p)||(FSIM.qb&&FSIM.qb.p),{rtd:1});
        return turnover(`<b>TOUCHDOWN ${offT.nick}!</b>`); }
      if(res.yards>=st.toGo){ st.down=1; st.toGo=10; } else { st.down++; st.toGo-=res.yards; }
      sb(); setTimeout(play, 420);
    });
  }
  function finish(){
    if(st.hs===st.as){ if(Math.random()<0.5)st.hs+=3; else st.as+=3; }
    const box=(tm,pts)=>({team:tm.abbr,pts,lines:Object.values(st.tally).filter(x=>tm.roster.some(p=>p.id===x.p.id))
      .sort((a,b)=>lineFP(b)-lineFP(a)).map(boxLineFromTally) });
    const result={home:home.abbr,away:away.abbr,hs:st.hs,as:st.as,ot:false,box:{home:box(home,st.hs),away:box(away,st.as)}};
    const allL=[...result.box.home.lines,...result.box.away.lines]; const pg=allL.slice().sort((a,b)=>b.fp-a.fp)[0];
    result.potg=pg?{id:pg.id,name:pg.name,team:(result.box.home.lines.includes(pg)?home.abbr:away.abbr),pos:pg.pos,stat:pg.stat}:null;
    const sbE=$('#fgsb'); if(sbE)sbE.innerHTML=`<b>FINAL · ${away.abbr} ${st.as} — ${st.hs} ${home.abbr}</b> — result locked. Handle your week, then advance.`;
    setTimeout(()=>markGameResolved(result), 900);
  }
  sb(); play();
}
window.playWeekGame=playWeekGame;

/* ---------- The Wire (stories, rumors, NCAA buzz) ---------- */
let WIRE=[];   // current wire items, referenced by index for click-through
function fmtK(n){ n=n||0; return n>=1000?(n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'K':String(n); }
function scrFeed(m,t){
  head(m,'The Feed','The league in real time — insiders, beat writers, players and fans. Neural-net generated, sharper with a Claude key.');
  if(window.VOICES && (!G.feed||!G.feed.length)) VOICES.feedSeed();
  // filter chips
  const FILT=['ALL','TRADE','DRAFT','NEWS','TAKE','GAME']; G._feedFilt=G._feedFilt||'ALL';
  const bar=el('div','card'); bar.style.cssText='display:flex;gap:6px;flex-wrap:wrap;align-items:center';
  bar.innerHTML=`<span class="muted" style="font-size:12px;margin-right:4px">Filter:</span>`+FILT.map(f=>`<button class="btn ${G._feedFilt===f?'':'sec'}" style="padding:3px 11px;font-size:12px" data-filt="${f}">${f==='ALL'?'All':f.charAt(0)+f.slice(1).toLowerCase()}</button>`).join('')+
    (AI.ready()?`<button class="btn sec" style="padding:3px 11px;font-size:12px;margin-left:auto" id="feedai">✨ Claude takes</button>`:'');
  m.appendChild(bar);
  const posts=(G.feed||[]).filter(p=>G._feedFilt==='ALL'|| p.tag===G._feedFilt || (G._feedFilt==='NEWS'&&['NEWS','AWARD'].includes(p.tag)));
  const wrap=el('div','card'); wrap.style.padding='0'; wrap.style.marginTop='12px';
  if(!posts.length) wrap.innerHTML='<p class="muted" style="padding:14px">Nothing here yet — advance a week or make a move and the timeline lights up.</p>';
  posts.slice(0,90).forEach(p=>{ const post=el('div'); post.style.cssText='display:flex;gap:11px;padding:13px 15px;border-bottom:1px solid var(--line2,#16223a)';
    post.innerHTML=`<div style="width:42px;height:42px;border-radius:50%;flex:none;background:${p.c||'#5bbcff'};display:flex;align-items:center;justify-content:center;font-weight:800;color:#08111f;font-family:var(--disp,sans-serif);font-size:15px">${(p.n||'?').replace(/[@]/g,'').slice(0,2).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px"><b>${p.n}</b>${p.v?' <span style="color:#1d9bf0">✓</span>':''} <span class="muted">${p.h} · wk ${p.week||0}</span></div>
        <div style="font-size:14px;line-height:1.5;margin:3px 0 7px;white-space:pre-wrap">${p.txt}</div>
        <div class="muted" style="font-size:12px;display:flex;gap:22px"><span>💬 ${fmtK(p.reply)}</span><span>🔁 ${fmtK(p.rt)}</span><span>❤️ ${fmtK(p.likes)}</span></div>
      </div>`;
    wrap.appendChild(post); });
  m.appendChild(wrap);
  setTimeout(()=>{ bar.querySelectorAll('[data-filt]').forEach(b=>b.onclick=()=>{ G._feedFilt=b.dataset.filt; render(); });
    const fa=$('#feedai'); if(fa) fa.onclick=()=>aiFeed(); },0);
}
// optional: Claude writes a few extra, sharper posts from the week's data
async function aiFeed(){
  if(!AI.ready()){ toast('Add your Anthropic key in the Newsroom first.'); return; }
  toast('Claude is posting…');
  try{ const top=standings().slice(0,5).map(t=>`${t.city} ${t.wins}-${t.losses}`);
    const recent=(G.news||[]).slice(0,12).map(n=>`[${n.tag}] ${n.txt}`);
    const sys='You run the social timeline for a fictional pro-football league (FPS 2026). Write punchy, authentic tweets — insider-breaking, hot-take, beat-writer and fan voices. Ground everything in the given data. Return ONLY a JSON array of objects {"handle","name","verified":bool,"text","tag"} (tag one of TRADE/DRAFT/NEWS/TAKE/GAME). 5-7 posts, each under 240 chars.';
    const usr=`Standings: ${top.join(', ')}. Recent league news:\n${recent.join('\n')}\nUser team: ${ut().city} ${ut().nick}. Write the timeline.`;
    const txt=await AI.call(sys,usr,900); const arr=JSON.parse((txt.match(/\[[\s\S]*\]/)||['[]'])[0]);
    arr.reverse().forEach(p=>VOICES.feedPush({h:p.handle||'@beat',n:p.name||'Beat',v:!!p.verified,c:'#1d9bf0'},p.text,p.tag||'NEWS',false));
    save(true); if(VIEW==='feed')render();
  }catch(e){ toast('Claude error: '+e.message.slice(0,60)); }
}
function scrWire(m){
  head(m,'The Wire','Rumors, storylines and scuttlebutt — click any story to read it in full.');
  WIRE=[];
  // featured long-form (Claude) stories — clickable to full text
  if(window.STORIES && STORIES.length){
    const feat=el('div','card'); feat.style.marginBottom='14px'; feat.innerHTML='<h3>📡 Featured — written by Claude</h3>';
    STORIES.forEach(s=>{ if(!s||!s.headline)return; const i=WIRE.push({headline:s.headline,body:s.body,tag:'FEATURE'})-1;
      feat.innerHTML+=`<div class="featrow" onclick="wireStory(${i})"><div class="feath">${s.headline}</div><div class="featx">${(s.body||'').slice(0,120)}…</div></div>`; });
    m.appendChild(feat);
  }
  const tags={RUMOR:'rumor',BUZZ:'buzz',NCAA:'ncaa',STORY:'story',TRADE:'trade',SIGNING:'sign',INJURY:'inj',HOF:'hof',AWARD:'award',
    SUSPENSION:'susp',LEGAL:'legal',INCIDENT:'incident',HOLDOUT:'holdout',REQUEST:'request',RETIRE:'retire'};
  const items=G.news.filter(n=>tags[n.tag]);
  if(!items.length && !WIRE.length){ m.appendChild(el('p','muted','The wire is quiet right now. Advance the season — stories, rumors, and college buzz will break here.')); return; }
  const wrap=el('div'); wrap.style.maxWidth='820px';
  items.slice(0,60).forEach(n=>{ const i=WIRE.push({headline:n.txt,tag:n.tag,wk:n.wk})-1;
    const d=el('div','wireitem'); d.style.cursor='pointer'; d.onclick=()=>wireStory(i);
    d.innerHTML=`<span class="wtag wt-${tags[n.tag]}">${n.tag}</span><div class="wtxt">${n.txt}${n.wk?` <span class="muted">— wk ${n.wk}</span>`:''}</div><span class="muted" style="align-self:center">›</span>`;
    wrap.appendChild(d); });
  m.appendChild(wrap);
}
// expand a wire item into a full story (Claude body if present, else a generated write-up)
window.wireStory=(i)=>{ const it=WIRE[i]; if(!it)return;
  const body = it.body || expandStory(it);
  closeOvl(); const o=el('div'); o.id='ovl'; o.onclick=e=>{if(e.target.id==='ovl')closeOvl();};
  o.innerHTML=`<div class="pc" style="width:600px"><div class="pchd">
    <div><div class="big" style="font-size:22px;line-height:1.15">${it.headline}</div><div class="muted">${it.tag||'STORY'} · The Gridiron Gazette · ${G.season} wk${it.wk||G.week}</div></div>
    <span class="x" onclick="closeOvl()">✕</span></div>
    <div class="pcbody"><div style="font-size:14px;line-height:1.6;color:#d3deef">${body.replace(/\n/g,'<br><br>')}</div></div></div>`;
  document.body.appendChild(o);
};
// procedural long-form when no Claude body exists — turns a headline into a few sourced sentences
function expandStory(it){
  const t=it.headline; const lead=['Sources around the league say','Per multiple team officials','Word out of the building is','Beat reporters confirm','One rival executive notes'];
  const tail={RUMOR:'Expect this one to dominate talk radio until there\'s resolution. Cap implications loom, and at least one contender is monitoring closely.',
    NCAA:'Scouts will be back out in force next weekend; a strong showing could lock in a Day 1 grade.',
    HOLDOUT:'Both sides publicly downplay the gap, but privately the standoff has hardened. A resolution before the next game is no longer assumed.',
    REQUEST:'The front office insists no deal is imminent — but the phone lines are open, and the price is steep.',
    SUSPENSION:'The club will lean on its depth in the interim; reinstatement is contingent on completing the league\'s program.',
    LEGAL:'The team is gathering facts and has made no decision on discipline beyond the league review.',
    INJURY:'The medical staff is taking the cautious route. A week-to-week tag is likely until he clears the next checkpoint.',
    AWARD:'It\'s the kind of performance that shifts an MVP race — and the locker room noticed.'}[it.tag]
    || 'The story is developing, and the Gazette will have more as it firms up.';
  return `${pickArr(lead)}, ${t.charAt(0).toLowerCase()+t.slice(1)} ${tail}`;
}
function pickArr(a){ return a[Math.floor(ENG.rng()*a.length)]; }

/* ---------- Players: sortable, searchable league-wide leaderboard ---------- */
let PSORT={k:'ovr',dir:-1}, PQ='', PPOS='ALL';
const PCOLS=[{k:'pos',l:'Pos'},{k:'name',l:'Player'},{k:'team',l:'Team'},{k:'age',l:'Age'},{k:'ovr',l:'OVR'},{k:'_grade',l:'Grd'},
  {k:'SP',l:'SP'},{k:'AC',l:'AC'},{k:'AG',l:'AG'},{k:'ST',l:'ST'},{k:'HA',l:'HA'},{k:'EN',l:'EN'},{k:'DI',l:'DI'},{k:'IN',l:'IN'}];
function pVal(x,k){ const p=x.p; if(k==='name')return p.name; if(k==='team')return x.t.abbr; if(k==='pos')return p.pos;
  if(k==='age'||k==='ovr')return p[k]; if(k==='_grade')return ENG.grade(p); return (p.attrs&&p.attrs[k])||0; }
function scrPlayers(m){
  head(m,'Players','Every player in the league — search by name, click any column to sort.');
  const ctrl=el('div','card');
  ctrl.innerHTML=`<div class="row"><input type="text" id="psearch" placeholder="Search player…" value="${PQ}" style="flex:1;min-width:160px">
    <select id="pposf">${['ALL'].concat(ENG.QUOTA.map(q=>q[0])).map(p=>`<option ${PPOS===p?'selected':''}>${p}</option>`).join('')}</select>
    <span class="muted" id="pcount"></span></div>`;
  m.appendChild(ctrl);
  const card=el('div','card'); card.style.marginTop='12px';
  const thead='<tr>'+PCOLS.map(c=>`<th class="sorth" data-k="${c.k}">${c.l}${PSORT.k===c.k?(PSORT.dir<0?' ▼':' ▲'):''}</th>`).join('')+'</tr>';
  card.innerHTML='<table>'+thead+'<tbody id="ptbody"></tbody></table>';
  m.appendChild(card);
  function draw(){
    let rows=allPlayers();
    if(PPOS!=='ALL') rows=rows.filter(x=>x.p.pos===PPOS);
    if(PQ){ const q=PQ.toLowerCase(); rows=rows.filter(x=>x.p.name.toLowerCase().includes(q)); }
    rows.sort((a,b)=>{ const va=pVal(a,PSORT.k), vb=pVal(b,PSORT.k); return typeof va==='string'?PSORT.dir*va.localeCompare(vb):PSORT.dir*(va-vb); });
    const show=rows.slice(0,200);
    $('#ptbody').innerHTML=show.map(x=>{ const p=x.p; const av=k=>(p.attrs&&p.attrs[k]!=null)?p.attrs[k]:'—';
      const cell=k=>{ const v=p.attrs&&p.attrs[k]; return `<td style="color:${v?ovrColor(v):'var(--dim)'}">${v??'—'}</td>`; };
      return `<tr><td><span class="tag">${p.pos}</span></td>
        <td class="pname" onclick="showPlayer(${p.id})">${p.name}${p.out>0?' <span class="bad" title="injured">✚</span>':''}</td>
        <td>${logoTag(x.t,16)} ${x.t.abbr}</td>
        <td>${p.age}</td><td>${ovrBadge(p.ovr)}</td><td><b>${ENG.grade(p)}</b></td>
        ${['SP','AC','AG','ST','HA','EN','DI','IN'].map(cell).join('')}</tr>`; }).join('')
      + (rows.length>200?`<tr><td colspan="14" class="muted">…and ${rows.length-200} more — refine your search.</td></tr>`:'');
    $('#pcount').textContent=rows.length+' players';
  }
  const s=$('#psearch'); s.oninput=()=>{ PQ=s.value; draw(); };
  $('#pposf').onchange=e=>{ PPOS=e.target.value; draw(); };
  card.querySelectorAll('.sorth').forEach(th=>th.onclick=()=>{ const k=th.dataset.k;
    if(PSORT.k===k) PSORT.dir*=-1; else PSORT={k,dir:(k==='name'||k==='team'||k==='pos')?1:-1}; render(); });
  draw();
}

/* ---------- Statistical leaders ---------- */
let LEADTAB='passing', LEADSORT={col:null,dir:-1};
function scrLeaders(m){
  head(m,'Stats Central',`Season ${G.season} · week ${Math.min(G.week,G.maxWeek)} — full leaderboards, derived metrics & team rankings`);
  const tabs=[['passing','Passing'],['rushing','Rushing'],['receiving','Receiving'],['defense','Defense'],['pressure','Pressure'],['explosives','Explosives'],['teams','Team Rankings']];
  const tb=el('div'); tb.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px';
  tb.innerHTML=tabs.map(([k,l])=>`<button class="btn ${LEADTAB===k?'':'sec'}" style="padding:5px 13px;font-size:13px" data-lt="${k}">${l}</button>`).join('');
  m.appendChild(tb);
  const all=allPlayers().filter(x=>x.p.stats&&x.p.stats.g>0);
  // sortable table: click any stat header to re-sort the WHOLE league by it (toggle ▼/▲); defKey is the tab's natural order
  const tbl=(cols, rows, defKey)=>{
    const sortKey=(LEADSORT.col && cols.some(c=>c[1]===LEADSORT.col))?LEADSORT.col:null;
    const dir=LEADSORT.dir, num=v=>{ const f=parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(f)?-Infinity:f; };
    let sorted = sortKey ? rows.slice().sort((a,b)=>(num(a[sortKey])-num(b[sortKey]))*dir) : rows.slice();
    sorted=sorted.slice(0,30);
    const c=el('div','card'); const t=el('table');
    const hd='<tr><th style="width:20px">#</th><th>Player</th>'+cols.map(cd=>{ const on=cd[1]===sortKey, prim=!sortKey&&cd[1]===defKey;
        return `<th class="leadsort" data-sc="${cd[1]}" style="text-align:right;cursor:pointer;${(on||prim)?'color:#eaf2ff':''}" title="Sort by ${cd[0]}">${cd[0]}${on?(dir<0?' ▾':' ▴'):''}</th>`; }).join('')+'</tr>';
    t.innerHTML=hd+(sorted.length?sorted.map((r,i)=>`<tr><td class="muted">${i+1}</td><td><span class="pname" onclick="showPlayer(${r.id})">${r.name}</span> <span class="muted" style="font-size:11px">${r.team}·${r.pos}</span></td>`+cols.map(cd=>{ const hot=cd[1]===(sortKey||defKey); return `<td style="text-align:right${cd[2]&&hot?';font-weight:700;color:'+cd[2]:(cd[2]?';color:'+cd[2]:'')}">${r[cd[1]]}</td>`; }).join('')+'</tr>').join('')
        :`<tr><td colspan="${cols.length+2}" class="muted" style="text-align:center;padding:14px">No qualifying players yet.</td></tr>`);
    c.appendChild(t); return c; };
  const r1=v=>Math.round(v*10)/10, pct=(a,b)=>b?Math.round(a/b*100)+'%':'0%', gp=Math.max(1,G.week||1);
  if(LEADTAB==='passing'){ const qbs=all.filter(x=>(x.p.stats.patt||0)>=Math.max(8,G.week*4)).map(x=>{const s=x.p.stats;return{id:x.p.id,name:x.p.name,team:x.t.abbr,pos:x.p.pos,
      yds:s.pyd||0,td:s.ptd||0,int:s.intp||0,cmp:pct(s.pcmp||0,s.patt||0),ypa:r1((s.pyd||0)/(s.patt||1)),ypg:r1((s.pyd||0)/Math.max(1,s.g)),rat:passerRating(s),xp:s.xpass||s.pass20||0,att:s.patt||0};}).sort((a,b)=>b.yds-a.yds);
    m.appendChild(tbl([['YDS','yds','#5bbcff'],['TD','td'],['INT','int'],['ATT','att'],['CMP%','cmp'],['Y/A','ypa'],['Y/G','ypg'],['20+','xp'],['RTG','rat','#46d39a']], qbs, 'yds')); }
  else if(LEADTAB==='rushing'){ const rb=all.filter(x=>(x.p.stats.car||0)>=Math.max(5,G.week*3)).map(x=>{const s=x.p.stats;return{id:x.p.id,name:x.p.name,team:x.t.abbr,pos:x.p.pos,
      yds:s.ryd||0,td:s.rtd||0,att:s.car||0,ypc:r1((s.ryd||0)/(s.car||1)),gpg:r1((s.ryd||0)/Math.max(1,s.g)),x:s.xrush||s.run10||0,lng:s.lng||0};}).sort((a,b)=>b.yds-a.yds);
    m.appendChild(tbl([['YDS','yds','#5bbcff'],['TD','td'],['ATT','att'],['Y/C','ypc','#46d39a'],['YPG','gpg'],['10+','x'],['LNG','lng']], rb, 'yds')); }
  else if(LEADTAB==='receiving'){ const wr=all.filter(x=>(x.p.stats.rec||0)>=Math.max(3,G.week*2)).map(x=>{const s=x.p.stats;return{id:x.p.id,name:x.p.name,team:x.t.abbr,pos:x.p.pos,
      rec:s.rec||0,yds:s.recyd||0,td:s.rectd||0,ypc:r1((s.recyd||0)/(s.rec||1)),ypg:r1((s.recyd||0)/Math.max(1,s.g)),tgt:s.tgt||0,catch:pct(s.rec||0,s.tgt||0),x:s.xrec||s.rec20||0};}).sort((a,b)=>b.yds-a.yds);
    m.appendChild(tbl([['REC','rec'],['YDS','yds','#5bbcff'],['TD','td'],['Y/C','ypc','#46d39a'],['Y/G','ypg'],['TGT','tgt'],['Catch','catch'],['20+','x']], wr, 'yds')); }
  else if(LEADTAB==='defense'){ const d=all.filter(x=>((x.p.stats.tkl||0)+(x.p.stats.sack||0)+(x.p.stats.intc||0))>0).map(x=>{const s=x.p.stats;return{id:x.p.id,name:x.p.name,team:x.t.abbr,pos:x.p.pos,
      tkl:s.tkl||0,sack:r1(s.sack||0),int:s.intc||0,tfl:s.tfl||0,pbu:s.pbu||0,ff:s.ff||0,fr:s.fr||0};}).sort((a,b)=>(b.sack*8+b.int*8+b.tfl*3+b.pbu*2+b.tkl)-(a.sack*8+a.int*8+a.tfl*3+a.pbu*2+a.tkl));
    m.appendChild(tbl([['TKL','tkl'],['TFL','tfl','#ffcf5a'],['SACK','sack','#ff9f43'],['INT','int','#46d39a'],['PBU','pbu'],['FF','ff'],['FR','fr']], d, 'tkl')); }
  else if(LEADTAB==='pressure'){ const p=all.filter(x=>((x.p.stats.pr||0)+(x.p.stats.hurry||0)+(x.p.stats.qbhit||0)+(x.p.stats.sack||0))>0).map(x=>{const s=x.p.stats;return{id:x.p.id,name:x.p.name,team:x.t.abbr,pos:x.p.pos,
      pr:s.pr||0,hur:s.hurry||0,hit:s.qbhit||0,sack:r1(s.sack||0),tfl:s.tfl||0,pg:r1((s.pr||0)/Math.max(1,s.g))};}).sort((a,b)=>(b.pr*4+b.sack*6+b.hit*2+b.tfl)-(a.pr*4+a.sack*6+a.hit*2+a.tfl));
    m.appendChild(tbl([['PR','pr','#5bbcff'],['HUR','hur'],['HIT','hit'],['SACK','sack','#ff9f43'],['TFL','tfl'],['PR/G','pg','#46d39a']], p, 'pr')); }
  else if(LEADTAB==='explosives'){ const x=all.filter(x=>((x.p.stats.big||0)+(x.p.stats.xpass||0)+(x.p.stats.xrush||0)+(x.p.stats.xrec||0))>0).map(x=>{const s=x.p.stats;return{id:x.p.id,name:x.p.name,team:x.t.abbr,pos:x.p.pos,
      big:s.big||0,pass:s.xpass||s.pass20||0,run:s.xrush||s.run10||0,rec:s.xrec||s.rec20||0,lng:s.lng||0,rate:r1((s.big||0)/Math.max(1,s.g))};}).sort((a,b)=>b.big-a.big||b.lng-a.lng);
    m.appendChild(tbl([['BIG','big','#5bbcff'],['Pass 20+','pass'],['Run 10+','run'],['Rec 20+','rec'],['BIG/G','rate','#46d39a'],['LNG','lng']], x, 'big')); }
  else { // team rankings
    const agg=t=>{ const a={pyd:0,ryd:0,recyd:0,pr:0,sack:0,intc:0,fr:0,intp:0,fum:0,big:0}; t.roster.forEach(p=>{ const s=p.stats||{}; Object.keys(a).forEach(k=>a[k]+=s[k]||0); }); return a; };
    const rows=G.teams.map(t=>{ const g=Math.max(1,t.wins+t.losses), a=agg(t), take=a.intc+a.fr, give=a.intp+a.fum; return {t,ppg:r1(t.pf/g),pag:r1(t.pa/g),yds:a.pyd+a.ryd,pass:a.pyd,rush:a.ryd,take,give,tom:take-give,pr:a.pr,sack:a.sack,big:a.big}; });
    const trow=(arr,lbl,key,head)=>{ const c=el('div','card'); c.style.cssText='flex:1;min-width:300px'; c.innerHTML=`<h3>${lbl}</h3><table><tr><th>#</th><th>Team</th><th style="text-align:right">${head||key}</th></tr>`+
      arr.slice(0,16).map((x,i)=>`<tr${x.t.abbr===USER?' style="background:#0c1a2e"':''}><td class="muted">${i+1}</td><td>${logoTag(x.t,16)} ${x.t.abbr} <span class="muted">${x.t.wins}-${x.t.losses}</span></td><td style="text-align:right"><b>${x[key]}</b></td></tr>`).join('')+'</table>'; return c; };
    const grid=el('div'); grid.style.cssText='display:flex;flex-wrap:wrap;gap:12px';
    grid.appendChild(trow(rows.slice().sort((a,b)=>b.ppg-a.ppg),'Scoring Offense','ppg','PPG'));
    grid.appendChild(trow(rows.slice().sort((a,b)=>a.pag-b.pag),'Scoring Defense','pag','PA/G'));
    grid.appendChild(trow(rows.slice().sort((a,b)=>b.big-a.big),'Explosive Plays','big','BIG'));
    grid.appendChild(trow(rows.slice().sort((a,b)=>b.tom-a.tom),'Turnover Margin','tom','TOM'));
    grid.appendChild(trow(rows.slice().sort((a,b)=>b.pr-a.pr),'Team Pressures','pr','PR'));
    grid.appendChild(trow(rows.slice().sort((a,b)=>b.yds-a.yds),'Total Offense','yds','YDS'));
    m.appendChild(grid);
  }
  setTimeout(()=>{ m.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{ LEADTAB=b.dataset.lt; LEADSORT={col:null,dir:-1}; render(); });
    m.querySelectorAll('.leadsort').forEach(h=>h.onclick=()=>{ const sc=h.dataset.sc; if(LEADSORT.col===sc) LEADSORT.dir=-LEADSORT.dir; else { LEADSORT.col=sc; LEADSORT.dir=-1; } render(); }); },0);
}

/* ---------- League history & record book ---------- */
function scrHistory(m){
  head(m,'League History & Records','Champions, the record book, and past seasons.');
  const uT=ut();
  if(uT){ const lc=el('div','card'); lc.style.marginBottom='12px';
    const titles=(G.history||[]).filter(h=>h.champ===USER).map(h=>h.season);
    const teamHof=(G.hof||[]).filter(c=>c.team===USER);
    const retired=(uT.retired||[]); const race=(G.mvpRace||[]);
    lc.innerHTML=`<h3>${logoTag(uT,20)} ${uT.city} ${uT.nick} — Franchise Legacy</h3>
      <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <span class="tag">🏆 Titles: ${titles.length}${titles.length?` (${titles.join(', ')})`:''}</span>
        <span class="tag">🏛️ Hall of Famers: ${teamHof.length}</span>
        <span class="tag">🎽 Retired #: ${retired.length}</span></div>
      ${retired.length?`<div class="grphd" style="margin:6px 0 4px">Retired Numbers</div><div class="aprow">${retired.map(r=>`<div class="apc"><b>#${r.num}</b> ${r.name} <span class="muted">${r.pos} · '${String(r.season).slice(-2)}</span></div>`).join('')}</div>`:''}
      ${teamHof.length?`<div class="grphd" style="margin:8px 0 4px">Team Hall of Famers</div><div class="aprow">${teamHof.map(c=>`<div class="apc"><span class="tag">${c.pos}</span> ${c.name} <span class="muted">${c.rings}💍 ${c.mvps}MVP</span></div>`).join('')}</div>`:''}
      ${race.length?`<div class="grphd" style="margin:8px 0 4px">MVP Race — ${G.season}</div><div class="aprow">${race.map(x=>`<div class="apc"><b>${x.rank}.</b> ${x.name} <span class="muted">${x.pos} ${x.team} · ${x.rec}</span></div>`).join('')}</div>`:''}`;
    m.appendChild(lc); }
  const rb=el('div','card'); rb.innerHTML='<h3>Record Book — single game</h3>';
  const R=G.records||{}; const keys=Object.keys(R);
  rb.innerHTML+= keys.length? '<table><tr><th>Record</th><th>Holder</th><th>Mark</th><th>Set</th></tr>'+
    keys.map(k=>{const r=R[k];return `<tr><td>${r.label}</td><td>${r.name} <span class="muted">(${r.team})</span></td><td><b>${r.val}</b></td><td class="muted">${r.season} wk${r.week}</td></tr>`;}).join('')+'</table>'
    : '<p class="muted">No records yet — play some games.</p>';
  m.appendChild(rb);
  const ch=el('div','card'); ch.style.marginTop='12px'; ch.innerHTML='<h3>Champions & MVPs</h3>';
  ch.innerHTML+= G.history.length? '<table><tr><th>Season</th><th>Champion</th><th>Final</th><th>MVP</th><th>Passing Ldr</th></tr>'+
    G.history.slice().reverse().map(h=>{const c=team(h.champ);return `<tr><td><b>${h.season}</b></td><td>${c?logoTag(c,18):''} ${c?c.city+' '+c.nick:h.champ}</td><td>${h.finalScore||'—'}</td><td class="muted">${h.mvp?h.mvp.name+' ('+h.mvp.team+')':'—'}</td><td class="muted">${h.leaders?h.leaders.pass:'—'}</td></tr>`;}).join('')+'</table>'
    : '<p class="muted">No completed seasons yet. Win a title and it lands here.</p>';
  m.appendChild(ch);
  // most recent All-Pro teams (1st & 2nd) + Pro Bowl
  const lastH=G.history.length&&G.history[G.history.length-1];
  if(lastH&&lastH.allPro&&lastH.allPro.length){ const ap=el('div','card'); ap.style.marginTop='12px';
    const row=(arr,lbl)=>`<div class="grphd" style="margin:6px 0 4px">${lbl}</div><div class="aprow">`+arr.map(a=>{const tm=team(a.team);return `<div class="apc"><span class="tag">${a.pos}</span> <span class="pname" onclick="showPlayer(${a.id})">${a.name}</span> <span class="muted">${tm?tm.abbr:a.team}</span></div>`;}).join('')+'</div>';
    ap.innerHTML=`<h3>${lastH.season} All-Pro Teams</h3>`+row(lastH.allPro,'FIRST TEAM')+(lastH.allPro2&&lastH.allPro2.length?row(lastH.allPro2,'SECOND TEAM'):'');
    m.appendChild(ap); }
  if(lastH&&lastH.proBowl){ const pb=lastH.proBowl; const pc=el('div','card'); pc.style.marginTop='12px';
    const side=s=>`<div style="flex:1;min-width:230px"><div style="font-weight:700;margin-bottom:4px">${s.name} <span class="acc" style="font-family:var(--mono)">${s.score}</span></div>`+s.roster.map(p=>{const tm=team(p.team);return `<div style="font-size:12px;padding:1px 0"><span class="tag">${p.pos}</span> <span class="pname" onclick="showPlayer(${p.id})">${p.name}</span> <span class="muted">${tm?tm.abbr:p.team}</span></div>`;}).join('')+'</div>';
    pc.innerHTML=`<h3>⭐ ${pb.season} Pro Bowl <span class="muted" style="font-size:11px;text-transform:none">— MVP: ${pb.mvp}</span></h3><div class="row" style="gap:20px;flex-wrap:wrap;align-items:flex-start">${side(pb.a)}${side(pb.b)}</div>`;
    m.appendChild(pc); }
  // Hall of Fame — neural-net scored, Claude-cited
  const hof=G.hof||[]; const hc=el('div','card'); hc.style.marginTop='12px'; hc.innerHTML='<h3>🏛️ Hall of Fame <span class="muted" style="font-size:11px;text-transform:none">— neural-net ballot</span></h3>';
  hc.innerHTML+= hof.length? '<table><tr><th>Player</th><th>Pos</th><th>Career</th><th>NN Score</th><th>Yr</th></tr>'+
    hof.slice().sort((a,b)=>(b.score||0)-(a.score||0)).map(h=>`<tr><td>${h.name}${h.citation?` <span class="muted" title="${h.citation}">ⓘ</span>`:''}</td><td><span class="tag">${h.pos}</span></td><td class="muted">${h.rings||0}🏆 · ${h.mvps||0} MVP · ${h.allPros||0} AP · ${h.proBowls||0} PB · ${h.seasons||0} yr</td><td><b style="color:${ovrColor(h.score||60)}">${h.score||'—'}</b></td><td class="muted">${h.season||h.retired||''}</td></tr>`).join('')+'</table>'
    : '<p class="muted">No inductees yet. A neural network scores every retiree on career value (rings, MVPs, All-Pros, longevity, peak); the best are enshrined, and Claude breaks ties on the bubble.</p>';
  if(hof.some(h=>h.citation)){ const cit=hof.filter(h=>h.citation).slice(-3); hc.innerHTML+='<div style="margin-top:10px">'+cit.map(h=>`<div class="news" style="border-left-color:#b9892f"><b>${h.name}</b> — ${h.citation}</div>`).join('')+'</div>'; }
  m.appendChild(hc);
  // live ballot (eligible, not yet in)
  const bal=(G.hofBallot||[]).filter(c=>!c.in).sort((a,b)=>b.score-a.score).slice(0,8);
  if(bal.length){ const bc=el('div','card'); bc.style.marginTop='12px'; bc.innerHTML='<h3>On the Ballot</h3>';
    bc.innerHTML+='<table><tr><th>Player</th><th>Pos</th><th>Career</th><th>NN Score</th><th>Eligible</th></tr>'+
      bal.map(c=>`<tr><td>${c.name}</td><td><span class="tag">${c.pos}</span></td><td class="muted">${c.rings}🏆 · ${c.mvps} MVP · ${c.allPros} AP · ${c.seasons} yr</td><td><b style="color:${ovrColor(c.score)}">${c.score}</b></td><td class="muted">${c.eligible}</td></tr>`).join('')+'</table>';
    m.appendChild(bc); }
}

/* ---------- Rules (commissioner settings) ---------- */
function scrRules(m){
  head(m,'League Rules','Commissioner settings — changes apply to upcoming games.');
  const r=G.rules; const c=el('div','card');
  c.innerHTML=`<div class="rulesgrid">
    <label class="opt"><input type="checkbox" id="rr_2pt" ${r.twoPoint?'checked':''}> Two-point conversions</label>
    <label class="opt"><input type="checkbox" id="rr_inj" ${r.injuries?'checked':''}> Injuries</label>
    <label class="opt"><input type="checkbox" id="rr_cap" ${r.salaryCap?'checked':''}> Salary cap enforced</label>
    <label class="opt"><input type="checkbox" id="rr_dead" ${r.deadMoney!==false?'checked':''}> Dead money on cuts/trades <span class="muted" style="font-size:11px">(off = simple cap, full salary back)</span></label>
    <label class="opt"><span>Overtime</span><select id="rr_ot"><option value="sudden" ${r.overtime==='sudden'?'selected':''}>Sudden death</option><option value="full" ${r.overtime==='full'?'selected':''}>Full period</option></select></label>
    <label class="opt"><span>Quarter length</span><select id="rr_q">${[15,12,10].map(q=>`<option value="${q}" ${r.quarter===q?'selected':''}>${q} min</option>`).join('')}</select></label>
  </div><p class="muted" style="margin-top:10px">Between seasons, the league's competition committee may also vote to change a rule on its own — watch the Gazette.</p>`;
  m.appendChild(c);
  const wire=()=>{ r.twoPoint=$('#rr_2pt').checked; r.injuries=$('#rr_inj').checked; r.salaryCap=$('#rr_cap').checked; r.deadMoney=$('#rr_dead').checked; r.overtime=$('#rr_ot').value; r.quarter=+$('#rr_q').value; save(); toast('Rules updated.'); render(); };
  ['rr_2pt','rr_inj','rr_cap','rr_dead','rr_ot','rr_q'].forEach(id=>{ $('#'+id).onchange=wire; });
  const sc=el('div','card'); sc.style.marginTop='12px';
  sc.innerHTML=`<h3>In Effect — ${G.season}</h3><div class="news">Two-point: <b>${r.twoPoint?'on':'off'}</b> · Injuries: <b>${r.injuries?'on':'off'}</b> · Salary cap: <b>${r.salaryCap?'on':'off'}</b> · Dead money: <b>${r.deadMoney!==false?'on':'off — simple cap'}</b> · Overtime: <b>${r.overtime}</b> · Quarters: <b>${r.quarter} min</b></div>`;
  m.appendChild(sc);
}
/* ---------- neural-net retirement + Hall of Fame ---------- */
function retireFeatures(p){ return [ ENG.clamp((p.age-22)/18,0,1), ENG.clamp((99-p.ovr)/55,0,1),
  ENG.clamp(((p.peak||p.ovr)-p.ovr)/22,0,1), Math.min(p.concussions||0,5)/5, p.starter?0:0.7, Math.min(p.seasons||0,16)/16 ]; }
function hofFeatures(p){ return [ ENG.clamp((p.careerPts||0)/4000,0,1), Math.min(p.mvps||0,3)/3, Math.min(p.allPros||0,8)/8,
  Math.min(p.rings||0,4)/4, (p.peak||p.ovr)/99, Math.min(p.seasons||0,15)/15 ]; }
const retireProb=p=>NN.retire(retireFeatures(p));
// HOF: the neural score is the backbone, but reward HARDWARE (MVPs/rings/All-Pro) and trim hollow compilers,
// so a ringed multi-All-Pro outranks a long-career stat-compiler who never won anything.
function hofScore(p){ const nn=NN.hof(hofFeatures(p));
  const acc=(p.mvps||0)*0.06 + (p.rings||0)*0.04 + (p.allPros||0)*0.025 + (p.proBowls||0)*0.008;
  const hollow=((p.mvps||0)+(p.allPros||0)+(p.rings||0)===0) ? -0.11 : 0;   // never an All-Pro/champ → rarely Canton
  return ENG.clamp(nn + acc + hollow, 0, 1); }
function processRetirement(p,t){
  const sc=hofScore(p); p.peak=Math.max(p.peak||p.ovr,p.ovr);
  const cand={name:p.name,pos:p.pos,team:t.abbr,num:p.num||'',ovr:p.peak,careerPts:p.careerPts||0,mvps:p.mvps||0,allPros:p.allPros||0,proBowls:p.proBowls||0,rings:p.rings||0,seasons:p.seasons||0,score:Math.round(sc*100),retired:G.season,eligible:G.season+1,in:false};
  if(sc>=0.42){ G.hofBallot=G.hofBallot||[]; G.hofBallot.push(cand); }   // worthy of a ballot look
  const tributeWorthy=(p.careerPts||0)>=1200 || sc>=0.5 || (p.concussions||0)>=3 || t.abbr===USER;
  if(tributeWorthy){
    const conc=(p.concussions||0)>=3 && p.age<34 ? ' — citing repeated concussions' : '';
    addNews('RETIRE',`${p.name} (${p.pos}, ${t.city}) announces his retirement after ${p.seasons||1} seasons${conc}.`);
    if(AI.ready()) aiTribute(cand);   // Claude writes a sendoff (optional)
  }
  // ---- post-career life: familiar faces stay in the world (coordinators / TV analysts who tweet) ----
  const notable=(p.peak||p.ovr)>=78 || (p.careerPts||0)>=1500; const r=ENG.rng();
  if(notable && r<0.34){   // ex-player → coordinator (later eligible to become a HC via the carousel)
    const off=ENG.OFF.has(p.pos); const cv=ENG.clamp(Math.round((p.peak||80)-7+ENG.ri(-6,6)),58,92);
    (G.exCoaches=G.exCoaches||[]).push({name:p.name,pos:p.pos,ovr:cv,off:off?cv:ENG.ri(58,72),def:off?ENG.ri(58,72):cv});
    const dest=ENG.pick(G.teams);
    addNews('STAFF',`${p.name} (ex-${p.pos}) moves into coaching — hired as ${off?'offensive':'defensive'} coordinator of ${dest.city}.`);
    if(window.VOICES) VOICES.feedPush({h:'@CoachingWire',n:'Coaching Wire',v:true,c:'#8b5cf6'},`📋 ${p.name} is getting into coaching — joins ${dest.abbr} as ${off?'OC':'DC'}. Watch this name.`,'NEWS',(p.peak||0)>=86);
  } else if(notable && r<0.64){   // ex-player → commentator/analyst with a Twitter handle (tweets takes)
    const handle='@'+((p.first||p.name||'X')[0])+(p.last||p.name||'').replace(/[^A-Za-z]/g,'').slice(0,11);
    (G.pundits=G.pundits||[]).push({name:p.name,pos:p.pos,handle,peak:p.peak||p.ovr,team:t.abbr});
    if(G.pundits.length>14) G.pundits.shift();
    addNews('MEDIA',`${p.name} (ex-${p.pos}) is joining the broadcast booth as a game analyst.`);
    if(window.VOICES) VOICES.feedPush({h:handle,n:p.name,v:true,c:'#f0b23f'},`Officially retired. Time to talk ball for a living — joining the booth, and yeah I'll be on here with takes. 📺🎙️`,'NEWS',(p.peak||0)>=86);
  }
}
// annual Hall-of-Fame vote: NN scores, class capped per AWARDS.INI, Claude breaks ties on the bubble
function hofVote(){
  G.hof=G.hof||[]; G.hofBallot=G.hofBallot||[];
  const cap = G.teams.length>=28?6 : G.teams.length>=18?5 : G.teams.length>=12?4 : 3;   // AWARDS.INI MaxPlayers
  const elig=G.hofBallot.filter(c=>!c.in && G.season>=c.eligible).sort((a,b)=>b.score-a.score);
  const inducted=[];
  for(const c of elig){ if(inducted.length>=cap) break;
    if(c.score>=58){ c.in=true; inducted.push(c); }
    else if(c.score>=46 && AI.ready()){ aiHofVote(c); }     // Claude decides the bubble cases (async)
  }
  inducted.forEach(c=>{ G.hof.push(c); const tm=team(c.team);
    if(tm && c.num){ tm.retired=tm.retired||[]; if(!tm.retired.some(rn=>String(rn.num)===String(c.num))) tm.retired.push({num:c.num,name:c.name,pos:c.pos,season:G.season}); }
    addNews('HOF',`🏛️ HALL OF FAME: ${c.name} (${c.pos}, ${c.team}) is enshrined — ${c.rings} rings, ${c.mvps} MVP, ${c.allPros} All-Pro, ${c.seasons} seasons.${c.num?` ${tm?tm.city:c.team} retire #${c.num}.`:''}`);
    if(window.VOICES) VOICES.feedPush({h:'@GridironGazette',n:'The Gazette',v:true,c:'#caa46a'},`🏛️ HALL OF FAME: ${c.name} (${c.pos}, ${c.team}) is in — ${c.rings} rings, ${c.mvps} MVP.${c.num?` ${c.team} retire #${c.num}. 🎽`:''}`,'NEWS',true);
    if(AI.ready()) aiCitation(c); });
  // drop very old, never-elected names off the ballot (AWARDS.INI YearsToIneligible)
  G.hofBallot=G.hofBallot.filter(c=>c.in || G.season - c.retired < 20);
}
// ---- Claude-informed (optional, async; gracefully no-op without a key) ----
async function aiTribute(c){ try{ const txt=await AI.call('You are a veteran NFL columnist. Write a vivid 2-sentence retirement tribute. Fictional league; ground it in the given career line.',
  `Player: ${c.name}, ${c.pos}, ${c.team}. ${c.seasons} seasons, peak OVR ${c.ovr}, ${c.rings} rings, ${c.mvps} MVP, ${c.allPros} All-Pro, ${c.careerPts} career award pts. Write the tribute only.`, 220);
  addNews('RETIRE',`📝 ${txt.trim()}`); if(VIEW==='wire'||VIEW==='history')render(); }catch(e){} }
async function aiCitation(c){ try{ const txt=await AI.call('You are the Hall of Fame committee. Write a 1-sentence enshrinement citation. Fictional league.',
  `Inductee: ${c.name}, ${c.pos}, ${c.team}. ${c.seasons} seasons, ${c.rings} rings, ${c.mvps} MVP, ${c.allPros} All-Pro. Citation only.`, 160);
  c.citation=txt.trim(); save(); if(VIEW==='history')render(); }catch(e){} }
async function aiHofVote(c){ try{ const txt=await AI.call('You are a 48-person Hall of Fame selection committee voting on a borderline candidate. Reply with exactly YES or NO then a short reason.',
  `Candidate: ${c.name}, ${c.pos}. ${c.seasons} seasons, peak ${c.ovr} OVR, ${c.rings} rings, ${c.mvps} MVP, ${c.allPros} All-Pro, ${c.careerPts} award pts. Borderline. Vote:`, 120);
  if(/^\s*yes/i.test(txt)){ c.in=true; G.hof.push(c); addNews('HOF',`🏛️ HALL OF FAME (committee vote): ${c.name} (${c.pos}, ${c.team}) gets in. ${txt.replace(/^\s*yes[.,:\- ]*/i,'').trim()}`); save(); if(VIEW==='history')render(); } }catch(e){} }

function offseasonScreen(){
  if(G.pendingFire){ fireModal(); return; }   // you were fired — choose a new job before the offseason rolls on
  // Phase 1: age + develop + history on the rosters as they stand (no movements yet)
  // Phase 2: decide retirements + contract outcomes (collect, do not mutate during iteration)
  // Phase 3: apply all removes/moves
  // Phase 4: league-wide repair + one resetSeasonPlayerState pass (prevents carry + double-age bugs)
  G.hof=G.hof||[];
  G.teams.forEach(t=>{ ENG.ensureStaff(t); ensureTeamPlaybook(t); ensureScoutDept(t); });

  // PHASE 1 — age/dev/peak/notables on current rosters (before any roster movement)
  G.teams.forEach(t=>{
    t.roster.forEach(p=>{
      p.age++; p.years=Math.max(0,p.years-1);
      const d=ENG.develop(p,t,G.rules);
      if(p.pos==='QB'&&p.age<=26&&(p._reps||0)>=3){ let g=ENG.ri(1,4); if((p.pot||p.ovr)>p.ovr+6 && ENG.rng()<0.4) g+=ENG.ri(2,5);   // a developmental QB can take a real leap after a season of starts
        p.ovr=ENG.clamp(p.ovr+g,40,99); if(p.attrs)p.attrs.OVR=p.ovr;
        addNewsIf(t.abbr===USER||p.ovr>=80,'DEV',`📈 The reps paid off: ${p.name} (QB, ${t.abbr}) grew from a season of real snaps — now ${p.ovr} OVR.`); }
      p._reps=0;
      p.peak=Math.max(p.peak||p.ovr,p.ovr);
      (p.ovrHistory=p.ovrHistory||[]).push({s:G.season,o:p.ovr}); if(p.ovrHistory.length>18)p.ovrHistory.shift();
      // THE BRADY MOMENT — a forgotten late pick blossoms into a star. The story breaks here.
      if(p.gem && !p._broke && p.ovr>=82 && (p.draftOverall||99)>32){
        p._broke=true;
        addNews('DEV',`📈 STORY OF THE YEAR: ${p.name} (${p.pos}, ${t.abbr}) — a Day-3 afterthought drafted #${p.draftOverall} — has become a star at ${p.ovr} OVR. Nobody saw this coming. The tape lied.`);
        if(window.VOICES) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`How was ${p.name} pick #${p.draftOverall}?? The ${t.abbr} ${p.pos} is now one of the best in the league. Every scouting dept is re-watching his tape and crying. 🍿`,'NEWS',true);
      }
      const notable=t.abbr===USER||p.ovr>=84;
      if(notable){
        if(d>=4 && p.seasons<=5 && !p._broke) addNews('DEV',`📈 ${p.name} (${p.pos}, ${t.abbr}) takes a leap — now ${p.ovr} OVR. The work is paying off.`);
        else if(d<=-3 && p.age<=27 && (p._lastPress||0)>0.4) addNews('DEV',`📉 ${p.name} (${p.pos}, ${t.abbr}) is pressing under the ${t.city} spotlight — down to ${p.ovr}.`);
        else if(d<=-3 && (p.bustRisk||0)>0.55 && p.seasons<=4) addNews('DEV',`📉 ${p.name} (${p.pos}, ${t.abbr}) — the tools never translated. Dropping to ${p.ovr}; the bust talk grows.`);
        else if(d<=-4) addNews('DEV',`📉 Father Time catches ${p.name} (${p.pos}, ${t.abbr}) — ${p.ovr} OVR.`);
      }
    });
    t._qbSwitched=false;
  });

  // Collect retirements (hard caps + NN) — do not remove yet
  const retireActions=[]; // {p, from:t}
  G.teams.forEach(t=>{
    const retirees=t.roster.filter(p=> p.age>=41 || p.ovr<40 || (p.age>=30 && ENG.rng() < retireProb(p)*0.9*(p.ovr>=86?0.2:p.ovr>=80?0.5:1)) );   // elite players hang on into their late 30s (Brady/Rodgers careers) → homegrown stars get a HOF window
    retirees.forEach(p=> retireActions.push({p,from:t}));
  });
  retireActions.forEach(({p,from})=>{ processRetirement(p,from); });
  // Remove retirees now (clean)
  retireActions.forEach(({p,from})=>{ from.roster=from.roster.filter(x=>x.id!==p.id); });

  // PHASE 1.5 — AI franchise tags: clubs lock down ONE elite expiring star (ovr>=85) so the
  // league's best players don't all walk every offseason. Tagged players (years=1) skip FA below.
  G.teams.forEach(t=>{ if(t.abbr===USER || t._tagYr===G.season) return;
    const star=t.roster.filter(p=>(p.years||0)<=0 && p.ovr>=85).sort((a,b)=>b.ovr-a.ovr)[0]; if(!star) return;
    const sal=tagSalary(star), delta=sal-(star.salary||0);
    if(G.rules.salaryCap && capSpace(t)-delta<0) return;
    if(ENG.rng()<0.6){ star.salary=sal; star.years=1; star.tagged=true; star.tagSeason=G.season; star.flags=star.flags||{}; star.flags.wantsOut=false; t._tagYr=G.season;
      star.morale=ENG.clamp((star.morale||70)-ENG.ri(3,9),20,99); star.loyalty=ENG.clamp((star.loyalty||60)-ENG.ri(2,7),20,92);
      addNews('ROSTER',`${t.city} franchise-tag ${star.name} (${star.pos}) — $${sal}M for one year.`);
      if(window.VOICES && star.ovr>=84) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`🔖 ${t.abbr} franchise-tag ${star.name} (${star.pos}) at $${sal}M — one more year, no long-term deal. Watch the camp drama.`,'NEWS',true); }
  });

  // PHASE 2 — collect all contract decisions without mutating rosters during the pass
  const contractActions=[]; // {p, from, action:'re-sign'|'depart', dest?, years, loyalty? }
  G.teams.forEach(t=>{
    t.roster.slice().forEach(p=>{
      ENG.ensureBrain(p);
      if((p.years||0)<=0){
        const disp=ENG.disposition(p);
        const stay = disp==='loyal'? true : disp==='content'? ENG.rng()<0.82 : disp==='restless'? ENG.rng()<0.5 : ENG.rng()<0.18;
        if(stay){
          contractActions.push({p,from:t,action:'re-sign',years:ENG.ri(2,4)});
        }else if(p.ovr>=70){
          const dest=G.teams.filter(x=>x.abbr!==t.abbr).sort((a,b)=>(ENG.needs(b)[p.pos]||0)-(ENG.needs(a)[p.pos]||0))[ENG.ri(0,2)] || G.teams.find(x=>x.abbr!==t.abbr);
          if(dest){
            const loy=ENG.clamp((p.loyalty||60)+ENG.ri(4,12),30,90);
            contractActions.push({p,from:t,action:'depart',dest,years:ENG.ri(2,4),loyalty:loy});
          }else{
            contractActions.push({p,from:t,action:'re-sign',years:ENG.ri(1,2)});
          }
        }else{
          contractActions.push({p,from:t,action:'re-sign',years:ENG.ri(1,2)});
        }
      }
    });
  });

  // PHASE 3 — apply all re-signs and departures (after decisions collected; no double-processing)
  contractActions.forEach(act=>{
    const {p,from,action,dest,years,loyalty}=act;
    from.roster=from.roster.filter(x=>x.id!==p.id);
    if(action==='re-sign'){
      p.years=years; p.flags.wantsOut=false; p.tagged=false; p.rookie=false;
      from.roster.push(p);
      if(p.ovr>=80&&p.loyalty>=74&&from.abbr===USER) addNews('SIGNING',`${p.name} (${p.pos}) re-signs with ${from.city} — "this is home."`);
    }else if(dest){
      p.years=years; p.flags={}; p.tagged=false; p.rookie=false; if(loyalty!=null) p.loyalty=loyalty;
      dest.roster.push(p);
      if(p.ovr>=80||from.abbr===USER||dest.abbr===USER) addNews('SIGNING',`${p.name} (${p.pos}, ${p.ovr} OVR) leaves ${from.city} to sign with ${dest.city}.`);
      if(window.VOICES && p.ovr>=84) VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`✍️ ${p.name} (${p.pos}) is signing with the ${dest.city} ${dest.nick} in free agency.`,'NEWS',true);
    }
  });

  // PHASE 4 — repairs then ONE league-wide reset (guarantees no carried season stats, no missed resets on arrivals)
  repairAllRosters('offseason');
  G.teams.forEach(t=>t.roster.forEach(resetSeasonPlayerState));
  // Invariant guard (catches future regressions)
  let carry=0;
  G.teams.forEach(t=>t.roster.forEach(p=>{
    if(p.stats && (p.stats.pyd||p.stats.ryd||p.stats.recyd||0)>0){ carry++; p.stats=blankStats(); }
    if(p.out>0||p.wear>0||p.awardPts>0){ carry++; p.out=0; p.wear=0; p.awardPts=0; }
  }));
  if(carry>0) addNews('ROSTER',`Offseason reset guard cleared ${carry} carried state(s).`);

  const issues=rosterLegalityIssues(); if(issues.length) addNews('ROSTER',`Roster audit found ${issues.length} depth issue${issues.length!==1?'s':''} after offseason processing.`);
  hofVote();         // neural-net Hall-of-Fame ballot + induction (Claude breaks ties on the bubble)
  ruleCommittee();   // the competition committee may change a rule
  startDraft();      // the draft is the centerpiece of the offseason — pick by pick, with commentary
}
// after the draft wraps, roll into the new season
function startNewSeasonAfterDraft(){
  coachingCarousel();   // struggling AI clubs change head coaches (uses last season's record, before the reset)
  G.season++; G.week=0; G.phase='regular'; G.playoffs=null; G.faPool=[];
  if(G.rules&&G.rules.capGrowth) G.capMax=ENG.round1(G.capMax*(1+G.rules.capGrowth/100));   // the cap grows each league year
  G.teams.forEach(t=>{ t._tagYr=0; if(t.dead) t.dead=t.dead.filter(d=>d.season>=G.season); });   // fresh tag allowance; dead money for past years rolls off the books
  G.teams.forEach(t=>ensurePicks(t));   // keep a rolling three-year future-pick inventory after the league year advances
  G.teams.forEach(t=>{t.wins=0;t.losses=0;t.ties=0;t.pf=0;t.pa=0; repairRosterLegality(t,'new season');});   // refill to a legal roster — no shrinking dynasty
  preseasonRosterAudit();
  maybeAIRelocation();   // a desperate small-market club may move cities in the offseason
  applyLeagueStructure();   // re-apply custom conferences/divisions for the new league year
  G.schedule=ENG.buildSchedule(G.teams,{games:(G.rules&&G.rules.games)||0,weight:(G.rules&&G.rules.schedWeight)||'division'}); G.maxWeek=G.schedule.length;
  G.tradeDeadlinePassed=false;   // a fresh trade market each year
  announceInternationalSlate(assignInternationalGames(G.schedule));
  G._jobYears=(G._jobYears||1)+1; { const u=ut(); ensureOwner(u); setExpectation(u); }   // new owner mandate for the year
  G.prospects=makeProspectClass(G.season);   // fresh class for next year, with hidden boom/bust/temperament traits
  if(window.ncaaInit) ncaaInit(true);        // kick off a new college season alongside the pro year
  campHoldouts();                            // a few unhappy contract-year stars hold out of camp (the offseason holdout story)
  addNews('LEAGUE',`The ${G.season} season begins. New draft class loaded; scouting points are available.`);
  ensureWeekState();
  if(window.VOICES){ G.feed=G.feed||[]; VOICES.feedSeed(); }   // preseason buzz on the timeline
  autoGazette();        // preseason edition
  toast('New season!'); VIEW='week'; save(); render();
}
// the league's competition committee occasionally adopts a rule change between seasons
function ruleCommittee(){
  if(ENG.rng()>0.4) return; const r=G.rules; const roll=ENG.rng();
  // NOTE: quarter length is deliberately NOT a committee lever. Changing it rescales league
  // scoring ~20% (12-min quarters → ~16 PPG/team vs ~21 at 15), which reads as a scoring bug
  // mid-franchise. The committee still varies overtime / two-point / injuries / cap for flavor.
  if(roll<0.34){ r.overtime = r.overtime==='sudden'?'full':'sudden'; addNews('RULES',`Competition committee: overtime is now ${r.overtime==='full'?'full 15-minute period (both teams possess)':'sudden-death'}.`); }
  else if(roll<0.68){ r.twoPoint=!r.twoPoint; addNews('RULES',`Competition committee ${r.twoPoint?'ADOPTS':'REPEALS'} the two-point conversion for ${G.season+1}.`); }
  else if(roll<0.85){ r.injuries=!r.injuries; addNews('RULES',`Injuries are now ${r.injuries?'ON':'OFF'} (player safety experiment).`); }
  else { r.salaryCap=!r.salaryCap; addNews('RULES',`The salary cap is ${r.salaryCap?'REINSTATED':'SUSPENDED'} for ${G.season+1}.`); }
}

/* ---------- start ---------- */
window.onload=()=>{ setupScreen(); };

/* ---------- player card (authentic FPS 8-rating view) ---------- */
const FPS_ATTRS=['SP','AC','AG','ST','HA','EN','DI','IN'];
const ATTR_LABEL={SP:'Speed',AC:'Acceleration',AG:'Agility',ST:'Strength',HA:'Hands',EN:'Endurance',DI:'Discipline',IN:'Intelligence'};
const ATTR_DESC={SP:'Top running speed',AC:'Reaching top speed from a standstill',AG:'Changing direction & leaping',
  ST:'Power — arm strength for a QB, push for a lineman, leg for a kicker',HA:'Catching passes & ball security',
  EN:'Resisting injury & fatigue',DI:'Poise under pressure; avoiding mistakes & penalties',IN:'Reading the game; instincts & awareness'};
// the rating that matters most at each position (for inline display)
const POS_KEY={QB:'ST',RB:'SP',FB:'ST',WR:'HA',TE:'HA',T:'ST',G:'ST',C:'ST',DE:'ST',DT:'ST',OLB:'SP',ILB:'IN',CB:'SP',S:'SP',K:'ST',P:'ST'};
const at=(p,k)=>(p.attrs&&p.attrs[k]!=null)?p.attrs[k]:'—';
function keyRating(p){ const k=POS_KEY[p.pos]||'IN'; return {k,v:at(p,k)}; }
function findPlayer(id){ for(const t of G.teams){ const p=t.roster.find(x=>x.id===id); if(p) return {p,t}; } return null; }
function closeOvl(){ if(typeof pbpBuildStop==='function')pbpBuildStop(); const o=$('#ovl'); if(o)o.remove(); }
window.showPlayer=id=>{
  const f=findPlayer(id); if(!f)return; const {p,t}=f; const a=p.attrs||{};
  ENG.ensureBrain(p); if(typeof ensurePersona==='function') ensurePersona(p); const grd=ENG.grade(p); const disp=ENG.disposition(p);
  const bar=(k)=>{ const v=a[k]??0; return `<div class="attr" title="${ATTR_LABEL[k]} — ${ATTR_DESC[k]}"><span class="lbl">${k} <span style="color:var(--dim);font-weight:400">${ATTR_LABEL[k]}</span></span><div class="bar"><i style="width:${v}%;background:${ovrColor(v)}"></i></div><span class="val" style="color:${ovrColor(v)}">${v}</span></div>`; };
  if(p.ovr>=80) ensureNick(p);   // stars earn a nickname
  closeOvl();
  const o=el('div'); o.id='ovl'; o.onclick=e=>{ if(e.target.id==='ovl') closeOvl(); };
  const st=p.stats||{};
  const statline = st.g? statLine(p) : '';
  const risk=injuryRiskBand(p), health=(p.out>0||p.ir||p.injury||p.wear||p.usageLoad)?`<div class="grphd" style="margin:14px 0 6px">Medical</div><div class="news" style="border-left-color:${p.out>0||p.ir?'var(--bad)':'var(--acc2)'}"><b>Status</b> ${esc(injurySummary(p))} · <b>Risk</b> ${risk.label} ${risk.score} · <b>Wear</b> ${Math.round(p.wear||0)}${p.lastUsage?` · <b>Last usage</b> ${p.lastUsage.load} load (${p.lastUsage.touches||0} touches, ${p.lastUsage.def||0} def acts)`:''}${p.injury&&p.injury.notes&&p.injury.notes.length?`<div class="muted" style="margin-top:5px">${esc(p.injury.notes[0])}</div>`:''}</div>`:'';
  // "face of the franchise": the team's headshot depicts its top-rated star — show it on that player's card
  const isFace = LOGOS.has((t.abbr||'').toLowerCase()) && !(G&&G.fantasy) && !p.fictional && t.roster.slice().sort((a,b)=>b.ovr-a.ovr)[0].id===p.id;
  const headArt = isFace ? `<img class="pcface" src="faces/${t.abbr.toLowerCase()}.png" alt="">` : logoTag(t,42);
  o.innerHTML=`<div class="pc"><div class="pchd${isFace?' hasface':''}">
    ${headArt}
    <div><div class="big">${p.name}${p.nick?` <span style="font-style:italic;color:var(--acc2,#ffb84a);font-size:0.8em">“${p.nick}”</span>`:''}</div><div class="muted">${logoTag(t,16)} ${t.city} ${t.nick} · <span class="tag">${p.pos}${p.two?' / '+p.two:''}</span>${p.two?' <span class="acc" style="font-size:10px">TWO-WAY</span>':''} · #${p.num||'--'} · Age ${p.age} · <span title="hometown">📍 ${esc(hometownOf(p))}</span>${window.PHYS&&p.ht?` · <span title="height · weight · 40-yard dash">${PHYS.fmtHt(p.ht)} · ${p.wt} lb · ${PHYS.fmt40(p.t40)} <span style="color:var(--dim)">40</span></span>${p.pos==='QB'&&p.TP!=null?` · <span title="throwing power / accuracy"><b>TP</b> ${p.TP} · <b>TA</b> ${p.TA} <span class="tag" style="font-size:9px">${PHYS.armLabel(p)}</span></span>`:''}`:''}${p.rookie?' · <span class="acc">Rookie</span>':''}${p.persona?` · <span class="tag" title="personality type">${PERSONA_EMOJI[p.persona]||''} ${PERSONA_LBL[p.persona]||p.persona}</span>`:''}${(p.out>0||p.ir)?` · <span class="bad">${esc(injurySummary(p))}</span>`:''}${p.flags&&p.flags.wantsOut?' · <span class="bad">Trade request</span>':''}</div></div>
    ${ovrBadge(p.ovr)}<span class="x" onclick="closeOvl()">✕</span></div>
    <div class="pcbody">
      <div class="cards" style="grid-template-columns:repeat(5,1fr);margin-bottom:14px">
        <div class="card"><h3>Overall</h3><div class="stat s">${p.ovr}</div></div>
        <div class="card"><h3>Pos Grade</h3><div class="stat s" style="color:${ovrColor(grd)}">${grd}</div></div>
        <div class="card"><h3>Loyalty</h3><div class="stat s" style="color:${dispColor(disp)}">${Math.round(p.loyalty)}</div><div class="muted" style="color:${dispColor(disp)};text-transform:capitalize">${disp}</div></div>
        <div class="card"><h3>Salary</h3><div class="stat s">${money(p.salary)}</div><div class="muted">${p.years} yr${p.years>1?'s':''}</div></div>
        <div class="card"><h3>Morale</h3><div class="stat s">${p.morale||70}%</div></div>
      </div>
      <div class="grphd" style="margin-bottom:8px">Ratings <span style="text-transform:none;color:#5e7194">(position-relative, as in the original)</span></div>
      <div class="attrgrid">${FPS_ATTRS.map(bar).join('')}</div>
      ${(p.ovrHistory&&p.ovrHistory.length>=2)?`<div class="grphd" style="margin:14px 0 6px">Career Arc</div><div style="display:flex;align-items:center;gap:14px">${sparkline(p.ovrHistory,170,36)}<div class="muted" style="font-size:12px">${p.ovrHistory[0].o} → ${p.ovr} OVR over ${p.ovrHistory.length} yrs · peak ${p.peak||p.ovr}</div></div>`:''}
      ${(p.proBowls||p.allPros||p.mvps||p.rings||p.collegeHonors)?`<div class="grphd" style="margin:14px 0 6px">Accolades</div><div class="news" style="border-left-color:#b9892f">${[p.rings?p.rings+'× 🏆 Champion':'',p.mvps?p.mvps+'× MVP':'',p.allPros?p.allPros+'× All-Pro':'',p.proBowls?p.proBowls+'× Pro Bowl':'',p.collegeHonors?'🎓 '+p.collegeHonors:''].filter(Boolean).join(' · ')||'—'}</div>`:''}
      ${(p.workEthic!=null)?`<div class="grphd" style="margin:14px 0 6px">Intangibles & Projection</div><div class="news"><b>Work ethic</b> ${Math.round(p.workEthic)} · <b>Temperament</b> ${Math.round(p.temperament)} <span class="muted">(poise under pressure)</span> · <b>Ceiling</b> ~${p.pot||p.ovr}${p.archetype?` · ${ARCHE_LBL[p.archetype]||p.archetype}`:''}${(p._lastPress||0)>0.4?` · <span class="bad">pressing in the ${t.city} spotlight</span>`:''}</div>`:''}
      ${health}
      ${statline?`<div class="grphd" style="margin:14px 0 6px">${G.season} Season</div><div class="news" style="border-left-color:var(--acc)">${statline}</div>`:''}
      ${(p.arc&&p.arc.length)?`<div class="grphd" style="margin:14px 0 6px">Storyline</div>`+p.arc.slice(0,5).map(x=>`<div class="arcitem"><span class="wtag wt-${(x.tag||'story').toLowerCase()}">${x.tag}</span><span>${x.txt} <span class="muted">— ${x.season} wk${x.wk}</span></span></div>`).join(''):''}
      ${t.abbr===USER?`<div class="grphd" style="margin:14px 0 6px">Front-Office Actions</div><div class="flex" style="gap:8px;flex-wrap:wrap"><button class="btn" onclick="shopPlayer(${p.id})">🔁 Shop on trade block</button>${(p.years||0)<=1&&!p.tagged?`<button class="btn sec" onclick="franchiseTag(${p.id});closeOvl();">🔖 Franchise tag ($${tagSalary(p)}M)</button>`:''}<button class="btn sec" onclick="if(confirm('Cut ${p.name.replace(/'/g,'')}?${G.rules.salaryCap&&deadCapOf(p)>0?` Leaves $${deadCapOf(p)}M dead cap.`:''}')){cutPlayer(${p.id});closeOvl();}">✂️ Cut${G.rules.salaryCap&&deadCapOf(p)>0?` ($${deadCapOf(p)}M dead)`:''}</button></div><div class="muted" style="font-size:11px;margin-top:6px">${p.tagged?'🔖 On the franchise tag this year. ':''}Quietly shopping a player is fine — but do it too often, or shop a loyal one, and he'll find out and sour on you.</div>`:''}
    </div></div>`;
  document.body.appendChild(o);
};
window.closeOvl=closeOvl;
// readable season stat line for a player
function statLine(p){ const s=p.stats||{}; const g=ENG.POSGRP(p.pos); const parts=[`${s.g} G`];
  if(g==='QB'){ if(s.pyd)parts.push(`${s.pyd} pass yds`); if(s.ptd)parts.push(`${s.ptd} pass TD`); if(s.intp)parts.push(`${s.intp} INT`); }
  if(g==='RB'||g==='QB'){ if(s.ryd)parts.push(`${s.ryd} rush yds`); if(s.rtd)parts.push(`${s.rtd} rush TD`); if(s.xrush)parts.push(`${s.xrush} 10+ runs`); }
  if(g==='RB'||g==='WR'){ if(s.recyd)parts.push(`${s.recyd} rec yds`); if(s.rectd)parts.push(`${s.rectd} rec TD`); if(s.xrec)parts.push(`${s.xrec} 20+ catches`); }
  if(g==='QB'&&s.xpass)parts.push(`${s.xpass} 20+ passes`);
  if(g==='DL'||g==='LB'||g==='DB'){ if(s.tkl)parts.push(`${s.tkl} tackles`); if(s.tfl)parts.push(`${s.tfl} TFL`); if(s.sack)parts.push(`${s.sack} sacks`); if(s.pr)parts.push(`${s.pr} pressures`); if(s.intc)parts.push(`${s.intc} INT`); if(s.pbu)parts.push(`${s.pbu} PBU`); }
  if(p.awardPts)parts.push(`${p.awardPts} award pts`);
  return parts.join(' · '); }
