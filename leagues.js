/* ============================================================
   FPS 2026 — leagues.js : a library of loadable leagues. The NFL 2026
   preset uses the real bundled rosters; every other league is generated
   on the fly (full rosters, varied team strength) so you can start a
   career in a Canadian league, a world league, a spring league, etc.
   Depends on app.js globals (ENG, genFiller, ensurePicks, backfillRoster)
   resolved at runtime when a league is built.
   ============================================================ */
(function(){
  'use strict';
  const T=(abbr,city,nick,conf,div,pri,sec,pres)=>({abbr,city,nick,conf,div,pri,sec:sec||'#ffffff',pres:pres||60});
  const PRESETS={
    nfl:{ name:'NFL 2026', real:true, blurb:'The real 2026 NFL — 30 teams, real rosters, full draft pipeline.' },
    cfl:{ name:'Canadian League', blurb:'9 Canadian clubs, North & South. 3-down football flavor.', rules:{downs:3}, teams:[
      T('BC','Vancouver','Lions','CFL','West','#f47920','#000',64),T('CGY','Calgary','Stampeders','CFL','West','#c8102e','#000',70),
      T('EDM','Edmonton','Elks','CFL','West','#13573f','#fff',58),T('SSK','Saskatchewan','Roughriders','CFL','West','#006341','#fff',66),
      T('WPG','Winnipeg','Blue Bombers','CFL','West','#103a5c','#d4a017',72),
      T('HAM','Hamilton','Tiger-Cats','CFL','East','#000','#f2a900',68),T('TOR','Toronto','Argonauts','CFL','East','#0b1f3a','#a6a8ab',62),
      T('OTT','Ottawa','Redblacks','CFL','East','#9e1b32','#000',60),T('MTL','Montreal','Alouettes','CFL','East','#005f9e','#fff',64) ] },
    world:{ name:'World League', blurb:'12 fictional clubs from across the globe — two conferences.', teams:[
      T('LDN','London','Monarchs','World','Europe','#5b2a86','#ffd700',74),T('BER','Berlin','Thunder','World','Europe','#111','#00a3e0',66),
      T('MAD','Madrid','Conquistadors','World','Europe','#c8102e','#ffd700',64),T('PAR','Paris','Musketeers','World','Europe','#0055a4','#fff',68),
      T('TOK','Tokyo','Samurai','World','Pacific','#1a1a1a','#bc002d',72),T('SEO','Seoul','Tigers','World','Pacific','#003478','#fff',62),
      T('SYD','Sydney','Surge','World','Pacific','#00843d','#ffcd00',60),T('DXB','Dubai','Falcons','World','Pacific','#c19a3a','#000',58),
      T('MEX','Mexico City','Aztecs','World','Americas','#006341','#ce1126',66),T('SAO','São Paulo','Jaguars','World','Americas','#ffdf00','#009c3b',64),
      T('RIO','Rio','Tide','World','Americas','#00a4e4','#fff',56),T('YYZ','Toronto','Northmen','World','Americas','#b3001b','#fff',62) ] },
    spring:{ name:'Spring League', blurb:'8 fictional spring-football franchises. Wide-open, high-scoring.', teams:[
      T('BIR','Birmingham','Stallions','Spring','Dixie','#b3001b','#000',66),T('MEM','Memphis','Showboats','Spring','Dixie','#1a1a2e','#e0a526',58),
      T('NOL','New Orleans','Breakers','Spring','Dixie','#0b6e4f','#fff',60),T('TPA','Tampa Bay','Bandits','Spring','Dixie','#b3001b','#d4a017',62),
      T('MICH','Detroit','Panthers','Spring','North','#4b0082','#c0c0c0',64),T('NJ','New Jersey','Generals','Spring','North','#b22222','#fff',70),
      T('PHL','Philadelphia','Stars','Spring','North','#102a52','#c0c0c0',68),T('ARL','Arlington','Renegades','Spring','North','#1a1a1a','#c8102e',56) ] },
    legends:{ name:'Legends League', blurb:'12 fictional powerhouse clubs — a deep, balanced league for a long dynasty.', teams:[
      T('TIT','Titan City','Colossus','Legends','Iron','#2c3e50','#e67e22',72),T('VAN','Vanguard','Sentinels','Legends','Iron','#16a085','#fff',68),
      T('APX','Apex','Predators','Legends','Iron','#8e44ad','#f1c40f',74),T('FRT','Fortress','Wardens','Legends','Iron','#34495e','#e74c3c',64),
      T('STM','Storm Bay','Tempest','Legends','Iron','#2980b9','#ecf0f1',66),T('GRD','Granite','Miners','Legends','Iron','#7f8c8d','#f39c12',60),
      T('BLZ','Blaze','Inferno','Legends','Fire','#c0392b','#f1c40f',76),T('FRO','Frost','Wolves','Legends','Fire','#5dade2','#2c3e50',70),
      T('SOL','Solaris','Comets','Legends','Fire','#f39c12','#2c3e50',68),T('OBS','Obsidian','Reapers','Legends','Fire','#1a1a1a','#9b59b6',72),
      T('VRD','Verde','Serpents','Legends','Fire','#27ae60','#fff',62),T('AUR','Aurora','Lightning','Legends','Fire','#f1c40f','#34495e',64) ] }
  };
  function leagueList(){ return Object.keys(PRESETS).map(k=>({key:k, name:PRESETS[k].name, blurb:PRESETS[k].blurb, size:k==='nfl'?30:PRESETS[k].teams.length})); }
  function leagueTeamDefs(key){ if(key==='nfl') return (typeof GAMEDATA!=='undefined'?GAMEDATA.teams:[]); return (PRESETS[key]?PRESETS[key].teams:[]); }
  function leagueRules(key){ return (PRESETS[key]&&PRESETS[key].rules)||{}; }
  // build a full, playable team (roster + staff + finances) for a generated league
  function genLeagueTeam(def){
    const pres=def.pres||60;
    const t={abbr:def.abbr,city:def.city,nick:def.nick,conf:def.conf,div:def.div,pri:def.pri,sec:def.sec,
      cap:(typeof GAMEDATA!=='undefined'?GAMEDATA.capMax:255), wins:0,losses:0,ties:0,pf:0,pa:0,
      cash:ENG.ri(35,90), market:ENG.clamp(pres-10+ENG.ri(-8,8),25,90),
      stadium:{name:def.city+' Stadium',cap:ENG.ri(48,72)*1000,quality:ENG.clamp(pres-5+ENG.ri(-10,10),40,95),built:ENG.ri(1975,2025),ticket:ENG.ri(70,160)},
      fans:{base:ENG.clamp(pres-15+ENG.ri(-8,8),15,80),morale:62,loyalty:ENG.ri(35,70)},
      owner:{name:ENG.pick(['Arthur','Eleanor','Marcus','Diana','Walter','Priya','Sergei','Nadia'])+' '+ENG.pick(['Crane','Vance','Holt','Brandt','Okafor','Reyes','Voss','Sato']),wealth:ENG.ri(55,95),patience:ENG.ri(45,90),ambition:ENG.ri(55,95)},
      coach:{name:ENG.pick(['Mike','Dan','Sean','Pete','Andy','Nick','Wade','Vic','Ron','Joel'])+' '+ENG.pick(['Carter','Walsh','Doyle','Vance','Quinn','Pace','Reed','Frost','Boone','Hale']),ovr:ENG.clamp(pres-6+ENG.ri(-6,8),58,92),off:ENG.clamp(pres-6+ENG.ri(-8,8),55,92),def:ENG.clamp(pres-6+ENG.ri(-8,8),55,92)},
      roster:[], picks:[] };
    ENG.QUOTA.forEach(([pos,cnt])=>{ for(let k=0;k<cnt;k++){
      const band = k===0? [pres-2,pres+13] : k===1? [pres-12,pres+1] : [pres-24,pres-8];
      const p=genFiller(pos, ENG.clamp(band[0],44,92), ENG.clamp(band[1],50,96)); p.starter=(k===0); p.depth=k+1; p.age=ENG.ri(22,33);
      t.roster.push(p); } });
    // a marquee star or two for flavor
    ['QB','WR','DE'].forEach(pos=>{ const best=t.roster.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr)[0]; if(best && ENG.rng()<0.6){ best.ovr=ENG.clamp(pres+ENG.ri(8,18),70,99); if(best.attrs)best.attrs.OVR=best.ovr; } });
    for(let r=1;r<=7;r++) t.picks.push({year:(typeof GAMEDATA!=='undefined'?GAMEDATA.season:2026)+1,round:r,from:def.abbr});
    return t;
  }
  function buildLeagueTeams(key){ if(key==='nfl') return null; return (PRESETS[key]?PRESETS[key].teams.map(genLeagueTeam):null); }
  window.LEAGUES={ list:leagueList, teamDefs:leagueTeamDefs, rules:leagueRules, build:buildLeagueTeams, presets:PRESETS };
})();
