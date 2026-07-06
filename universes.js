/* ============================================================
   FPS 2026 — universes.js : loadable fictional "universes".
   Six sized leagues (8 / 10 / 12 / 16 / 20 / 24 teams), each its
   own world — original franchises, balanced divisions, AND a
   fabricated multi-season HISTORY (champions, dynasties, droughts,
   rivalries, a record book, recurring star careers). On load we
   write a Preseason Edition of the Gazette that recaps last season
   and previews this one, so you don't start a blank slate — you
   WALK INTO a living league with a past.

   Loads AFTER app.js (needs ENG, genName, standings, ENG.teamOvr).
   Registers itself as LEAGUES presets so the setup screen's league
   picker shows all six. A one-line hook in newLeague() calls
   UNIVERSES.apply(key) once the teams + rosters + schedule exist.
   ============================================================ */
(function(){
  'use strict';
  if(!window.LEAGUES){ return; }
  // NOTE: ENG (const) and G (let) are SCRIPT-SCOPED in engine.js/app.js — reachable by bare name across scripts, NOT via window.*
  const E={ rng:()=>ENG.rng(), ri:(a,b)=>ENG.ri(a,b), pick:a=>ENG.pick(a), clamp:(v,a,b)=>ENG.clamp(v,a,b) };
  const ord=n=>{ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
  const NAME=()=> (window.genName?genName():E.pick(['Cole','Trey','Marcus','Devin','Jalen','Ezra','Roman','Silas','Tariq','Kade'])+' '+E.pick(['Vance','Holt','Boone','Reyes','Okafor','Sato','Frost','Pierce','Mack','Cross']));

  /* ---------------- master franchise pool ----------------
     M(abbr, city, nick, primary, secondary, glyph) — glyphs are
     keys the franchises.js crest engine knows, so every team gets a
     real logo. Universes compose from this pool with their own
     conference / division / prestige assignments. */
  const M=(a,c,n,p,s,g)=>({abbr:a,city:c,nick:n,pri:p,sec:s,glyph:g});
  const POOL={};
  [
    M('AUR','Aurora','Frost','#38bdf8','#0b2545','flake'),   M('BIR','Birmingham','Ironworks','#ea580c','#1c1917','hammer'),
    M('NHV','New Haven','Krakens','#0f766e','#022c22','trident'), M('DUL','Duluth','Wolves','#475569','#cbd5e1','wolf'),
    M('BTR','Baton Rouge','Reapers','#15803d','#0a0a0a','skull'),  M('LAF','Lafayette','Voodoo','#7c3aed','#fbbf24','eye'),
    M('GLF','Gulfport','Marauders','#b91c1c','#111827','fang'), M('SAV','Savannah','Spectres','#0f5132','#9ca3af','ghost'),
    M('ALB','Albany','Monarchs','#6d28d9','#f5d042','crown'), M('WIL','Wilmington','Sentinels','#1d4ed8','#e2e8f0','shield'),
    M('BLD','Boulder','Avalanche','#e5e7eb','#1e3a8a','mountain'), M('TUC','Tucson','Coyotes','#d97706','#451a03','wolf'),
    M('MES','Mesa','Scorpions','#ca8a04','#1c1917','fang'),  M('WIC','Wichita','Surge','#22d3ee','#0e7490','bolt'),
    M('ANC','Anchorage','Yetis','#67e8f9','#0c4a6e','flake'),  M('POR','Portland','Lumberjacks','#15803d','#78350f','axe'),
    M('SPO','Spokane','Wardens','#334155','#38bdf8','shield'), M('BOI','Boise','Condors','#1e293b','#f59e0b','wing'),
    M('FRE','Fresno','Solar Flares','#f97316','#7c2d12','sun'), M('OKC','Oklahoma City','Outlaws','#92400e','#1c1917','star'),
    M('ELP','El Paso','Vaqueros','#be123c','#0a0a0a','bull'), M('MOB','Mobile','Gators','#4d7c0f','#052e16','fang'),
    M('RIC','Richmond','Federals','#1e3a8a','#dc2626','star'), M('SCR','Scranton','Crows','#18181b','#a78bfa','bird'),
    M('VAB','Virginia Beach','Sharks','#0891b2','#082f49','fish'), M('HAR','Hartford','Knights','#312e81','#c0c0c0','shield'),
    M('RNO','Reno','Voltage','#facc15','#1e1b4b','bolt'), M('SAC','Sacramento','Sequoias','#166534','#7c2d12','mountain'),
    M('ABQ','Albuquerque','Vipers','#b45309','#0a0a0a','snake'), M('SDG','San Diego','Tide','#0ea5e9','#075985','wave'),
    M('LON','London','Monarchs','#5b2a86','#ffd700','crown'), M('TOK','Tokyo','Samurai','#1a1a1a','#bc002d','fang'),
    M('BER','Berlin','Thunder','#0b1220','#00a3e0','bolt'), M('PAR','Paris','Musketeers','#0055a4','#ffffff','star'),
    M('MAD','Madrid','Conquistadors','#c8102e','#ffd700','crown'), M('SYD','Sydney','Surge','#00843d','#ffcd00','wave'),
    M('MEX','Mexico City','Sol','#006341','#ce1126','sun'), M('SAO','São Paulo','Jaguars','#facc15','#009c3b','fang'),
    M('DXB','Dubai','Falcons','#c19a3a','#0a0a0a','wing'), M('SEO','Seoul','Tigers','#003478','#ffffff','fang'),
    M('ROM','Rome','Gladiators','#7c2d12','#facc15','shield'), M('IST','Istanbul','Crescents','#0e7490','#fbbf24','eye'),
  ].forEach(t=>POOL[t.abbr]=t);

  // compose a universe team list: picks = [[abbr, conf, div, pres], ...]
  function compose(picks){ return picks.map(([a,conf,div,pres])=>{ const m=POOL[a]||M(a,a,a,'#1f4f8f','#dbe7ff','star');
    return { abbr:m.abbr, city:m.city, nick:m.nick, conf, div, pri:m.pri, sec:m.sec, glyph:m.glyph, pres:pres }; }); }

  /* ---------------- the six universes ---------------- */
  const UNIV = {
    u8:{ key:'u8', name:'The Iron Eight', size:8, era:9,
      blurb:'8 elite franchises, one brutal table — the Iron Eight. Every week is a playoff. Deep, storied, no soft games.',
      lore:'a closed league of eight powers where a single bad month buries a season',
      rules:{ playoffTeams:2, games:14 },
      picks:[ ['BIR','Iron','Forge',70],['GLF','Iron','Forge',68],['MES','Iron','Forge',66],['RNO','Iron','Forge',67],
              ['AUR','Iron','Frost',71],['BLD','Iron','Frost',69],['ANC','Iron','Frost',67],['SPO','Iron','Frost',65] ] },
    u10:{ key:'u10', name:'The Frontier League', size:10, era:8,
      blurb:'10 hard-bitten clubs of the high plains and timber country. Wide-open, run-first football on a windswept frontier.',
      lore:'a rugged frontier circuit of dust, timber and long bus rides',
      rules:{ playoffTeams:3, games:16 },
      picks:[ ['OKC','Frontier','Plains',70],['ELP','Frontier','Plains',69],['TUC','Frontier','Plains',66],['ABQ','Frontier','Plains',64],['WIC','Frontier','Plains',67],
              ['SAC','Frontier','Range',69],['POR','Frontier','Range',68],['FRE','Frontier','Range',67],['DUL','Frontier','Range',68],['BOI','Frontier','Range',65] ] },
    u12:{ key:'u12', name:'The Continental Circuit', size:12, era:8,
      blurb:'12 great-city franchises across two continents — Atlantic vs. Pacific. Pageantry, rivalries, and a true world champion.',
      lore:'a transcontinental league of capital cities split Atlantic and Pacific',
      rules:{ playoffTeams:3, games:16 },
      picks:[ ['LON','Atlantic','Atlantic',71],['PAR','Atlantic','Atlantic',69],['MAD','Atlantic','Atlantic',67],['BER','Atlantic','Atlantic',68],['ROM','Atlantic','Atlantic',66],['IST','Atlantic','Atlantic',65],
              ['TOK','Pacific','Pacific',70],['SEO','Pacific','Pacific',67],['MEX','Pacific','Pacific',68],['SAO','Pacific','Pacific',67],['SYD','Pacific','Pacific',65],['DXB','Pacific','Pacific',64] ] },
    u16:{ key:'u16', name:'The Coalition', size:16, era:7,
      blurb:'16 franchises, Empire vs. Union, four divisions. A balanced, classic league built for a long dynasty chase.',
      lore:'the Coalition — Empire against Union across four hard divisions',
      rules:{ playoffTeams:4, games:16 },
      picks:[ ['AUR','Empire','North',70],['BIR','Empire','North',68],['NHV','Empire','North',66],['DUL','Empire','North',65],
              ['BTR','Empire','South',69],['LAF','Empire','South',67],['GLF','Empire','South',66],['SAV','Empire','South',64],
              ['ANC','Union','North',69],['POR','Union','North',67],['SPO','Union','North',65],['BOI','Union','North',64],
              ['FRE','Union','South',69],['OKC','Union','South',68],['ELP','Union','South',67],['MOB','Union','South',65] ] },
    u20:{ key:'u20', name:'The Confederation', size:20, era:7,
      blurb:'20 clubs, Empire & Union, Atlantic and Pacific wings. A sprawling, deep league where contenders rise and fall.',
      lore:'the twenty-team Confederation, two conferences, four wings',
      rules:{ playoffTeams:4, games:16 },
      picks:[ ['AUR','Empire','Atlantic',70],['BIR','Empire','Atlantic',68],['NHV','Empire','Atlantic',66],['ALB','Empire','Atlantic',69],['WIL','Empire','Atlantic',64],
              ['BTR','Empire','Pacific',69],['LAF','Empire','Pacific',67],['GLF','Empire','Pacific',65],['BLD','Empire','Pacific',67],['MES','Empire','Pacific',64],
              ['ANC','Union','Atlantic',70],['SCR','Union','Atlantic',67],['VAB','Union','Atlantic',65],['HAR','Union','Atlantic',68],['RIC','Union','Atlantic',66],
              ['FRE','Union','Pacific',69],['OKC','Union','Pacific',67],['ELP','Union','Pacific',66],['SAC','Union','Pacific',65],['SDG','Union','Pacific',63] ] },
    u24:{ key:'u24', name:'The Sovereign League', size:24, era:6,
      blurb:'24 franchises, two conferences, six divisions — the full Sovereign League. The deepest world: build an empire that lasts.',
      lore:'the Sovereign League — twenty-four clubs, six divisions, one crown',
      rules:{ playoffTeams:4, games:17 },
      picks:[ ['AUR','Empire','North',70],['BIR','Empire','North',68],['NHV','Empire','North',66],['DUL','Empire','North',64],
              ['BTR','Empire','South',69],['LAF','Empire','South',67],['GLF','Empire','South',65],['SAV','Empire','South',64],
              ['ALB','Empire','East',69],['WIL','Empire','East',67],['VAB','Empire','East',65],['HAR','Empire','East',67],
              ['ANC','Union','North',69],['POR','Union','North',67],['SPO','Union','North',65],['BOI','Union','North',63],
              ['FRE','Union','South',69],['OKC','Union','South',67],['ELP','Union','South',66],['MOB','Union','South',64],
              ['RNO','Union','West',68],['SAC','Union','West',66],['ABQ','Union','West',65],['SDG','Union','West',63] ] },
  };

  // register every universe as a LEAGUES preset → shows up in the setup screen's league picker
  Object.keys(UNIV).forEach(k=>{ const u=UNIV[k];
    LEAGUES.presets[k]={ name:u.name, blurb:u.blurb, universe:true, rules:u.rules, teams:compose(u.picks) }; });

  function isUniverse(key){ return !!(UNIV[key]); }

  /* ================= HISTORY FABRICATION =================
     Sim a handful of prior seasons with a light ratings model so the
     past is internally consistent: the team that won is the team that
     was good, rivalries come from teams that kept meeting in the final,
     stars build multi-MVP careers. Writes G.history + team.seasonLog. */
  const POS_W=[['QB',0.40],['WR',0.24],['RB',0.20],['DE',0.16]];
  function starPos(){ const r=E.rng(); let a=0; for(const [p,w] of POS_W){ a+=w; if(r<a) return p; } return 'QB'; }
  function makeStar(t){ const pos=starPos(); return { name:NAME(), pos, team:t.abbr, mvps:0, titles:0, seasons:0,
    pk:E.clamp((t.pres||60)+E.ri(6,20),72,99) }; }
  function statLine(pos){ if(pos==='QB') return `${4000+E.ri(0,1500)} yds, ${27+E.ri(0,19)} TD`;
    if(pos==='RB') return `${1250+E.ri(0,820)} yds, ${10+E.ri(0,14)} TD`;
    if(pos==='WR') return `${1150+E.ri(0,620)} yds, ${8+E.ri(0,11)} TD`;
    return `${13+E.ri(0,13)}.${E.ri(0,9)} sacks`; }
  function simMatch(a,b){ // a,b = {t, form} → winner gets a plausible score
    const pa=1/(1+Math.pow(10,-((a.form-b.form))/16)); const aw=E.rng()<pa;
    const W=aw?a:b, L=aw?b:a; const margin=E.clamp(Math.round(Math.abs(a.form-b.form)/6)+E.ri(0,17),1,28);
    const ws=E.clamp(17+E.ri(0,21),13,45), ls=E.clamp(ws-margin,3,ws-1);
    return { W:W.t, L:L.t, score:`${ws}-${ls}`, ws, ls }; }

  function fabricateHistory(univ){
    const teams=G.teams, season0=G.season, YEARS=E.clamp(univ.era||7,4,12);
    const strength={}, star={}, titles={}, playoffs={}, slog={};
    teams.forEach(t=>{ strength[t.abbr]=E.clamp((t.pres||60)+(E.rng()*16-8),36,94); star[t.abbr]=makeStar(t);
      titles[t.abbr]=0; playoffs[t.abbr]=0; slog[t.abbr]=[]; });
    const confs=Array.from(new Set(teams.map(t=>t.conf)));
    const history=[]; let prevChamp=null;
    for(let y=0;y<YEARS;y++){
      const season=season0-YEARS+y, games=(univ.rules&&univ.rules.games)||16;
      // season form + records
      const rec={}; teams.forEach(t=>{ const form=E.clamp(strength[t.abbr]+(E.rng()*15-7.5)+(prevChamp===t.abbr?3.5:0),20,99);
        const wp=1/(1+Math.pow(10,-(form-64)/17)); let w=Math.round(E.clamp(wp*games+(E.rng()*2-1),0,games));
        rec[t.abbr]={t,form,w,l:games-w}; });
      // playoff field per conference
      const pT=(univ.rules&&univ.rules.playoffTeams)||4; const confChamps=[], madeSet=new Set();
      confs.forEach(cf=>{ const field=teams.filter(t=>t.conf===cf).map(t=>rec[t.abbr])
          .sort((a,b)=>(b.w-a.w)||(b.form-a.form)).slice(0,Math.max(1,Math.min(pT,teams.filter(t=>t.conf===cf).length)));
        field.forEach(f=>{ playoffs[f.t.abbr]++; madeSet.add(f.t.abbr); });
        // single-elim by seed
        let alive=field.slice();
        while(alive.length>1){ const next=[]; for(let i=0;i<alive.length;i+=2){ if(!alive[i+1]){ next.push(alive[i]); continue; }
            const m=simMatch(alive[i],alive[i+1]); next.push(rec[m.W.abbr]); } alive=next; }
        confChamps.push(alive[0]); });
      // the final
      let champ,runnerUp,finalScore;
      if(confChamps.length>=2){ const cc=confChamps.slice().sort((a,b)=>b.form-a.form).slice(0,2);
        const m=simMatch(cc[0],cc[1]); champ=m.W.abbr; runnerUp=m.L.abbr; finalScore=m.score; }
      else { champ=confChamps[0].t.abbr; const others=teams.filter(t=>t.abbr!==champ).map(t=>rec[t.abbr]).sort((a,b)=>b.w-a.w);
        runnerUp=others[0]?others[0].t.abbr:champ; finalScore=`${17+E.ri(3,18)}-${13+E.ri(0,9)}`; }
      titles[champ]++; const cs=star[champ]; if(cs){ cs.titles++; }
      prevChamp=champ;
      // standings + leaders + MVP
      const order=teams.slice().sort((a,b)=>(rec[b.abbr].w-rec[a.abbr].w)||(rec[b.abbr].form-rec[a.abbr].form));
      const top5=order.slice(0,5).map(t=>t.abbr);
      // MVP: a star from one of the very best teams (slightly favors the champion)
      const mvpTeam=E.rng()<0.5?champ:order[E.ri(0,Math.min(2,order.length-1))].abbr; const ms=star[mvpTeam]; ms.mvps++; ms.seasons++;
      const mvp={ name:ms.name, team:mvpTeam, pos:ms.pos, line:statLine(ms.pos) };
      const lead=t=>{ const s=star[t]; return { name:s.name, team:t, line:statLine(s.pos) }; };
      const passT=order.find(t=>star[t.abbr].pos==='QB')||order[0], rushT=order.find(t=>star[t.abbr].pos==='RB')||order[1]||order[0],
            recT=order.find(t=>star[t.abbr].pos==='WR')||order[2]||order[0], sackT=order.find(t=>star[t.abbr].pos==='DE')||order[3]||order[0];
      const leaders={ pass:`${star[passT.abbr].name} (${passT.abbr}) ${4100+E.ri(0,1300)}`,
        rush:`${star[rushT.abbr].name} (${rushT.abbr}) ${1300+E.ri(0,700)}`,
        rec:`${star[recT.abbr].name} (${recT.abbr}) ${1200+E.ri(0,560)}`,
        sack:`${star[sackT.abbr].name} (${sackT.abbr}) ${14+E.ri(0,11)}.${E.ri(0,9)}` };
      history.push({ season, champ, runnerUp, finalScore, standings:top5, mvp, leaders });
      teams.forEach(t=>{ const r=rec[t.abbr];
        const fin = t.abbr===champ?'🏆 Champions' : (t.abbr===runnerUp?'Runner-up' : madeSet.has(t.abbr)?'Playoffs':'Missed playoffs');
        slog[t.abbr].push({season,w:r.w,l:r.l,finish:fin}); });
    }
    // commit to G
    G.history=history.slice();                              // oldest → newest (matches endSeason append order)
    teams.forEach(t=>{ t.seasonLog=slog[t.abbr].slice(-30);
      const last=slog[t.abbr][slog[t.abbr].length-1]||{};
      t._lore={ titles:titles[t.abbr], playoffs:playoffs[t.abbr], lastW:last.w||0, lastL:last.l||0, lastFinish:last.finish||'', star:star[t.abbr].name, starPos:star[t.abbr].pos };
      if(t.abbr===history[history.length-1].champ) t._defendingChamp=true; });
    return { history, titles, star, strength, YEARS, season0 };
  }

  /* ================= THE PRESEASON EDITION ================= */
  function projectPoll(){ // this season's projected top-8 from the ACTUAL rosters the user will play
    return G.teams.slice().map(t=>({t,ovr:(ENG&&ENG.teamOvr)?ENG.teamOvr(t):(t.pres||60)}))
      .sort((a,b)=>b.ovr-a.ovr); }
  function pct(w,l){ const g=w+l; return g?(w/g):0; }

  function buildIntroGazette(univ, H){
    const teams=G.teams, hist=H.history, last=hist[hist.length-1], season=G.season;
    const tm=ab=>teams.find(t=>t.abbr===ab)||{abbr:ab,city:ab,nick:'',pri:'#888'};
    const full=ab=>{ const t=tm(ab); return `${t.city} ${t.nick}`; };
    // championship ledger
    const ledger=Object.entries(H.titles).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
    const dynastyAb=ledger.length?ledger[0][0]:last.champ, dynastyN=ledger.length?ledger[0][1]:1;
    // longest active drought (no title, lowest playoff count)
    const drought=teams.slice().filter(t=>!H.titles[t.abbr]).sort((a,b)=>(H.titles[a.abbr]-H.titles[b.abbr])|| ( (a._lore.playoffs)-(b._lore.playoffs) ))[0];
    // rivalry: the two clubs that met most in finals
    const pairs={}; hist.forEach(h=>{ if(h.runnerUp&&h.runnerUp!==h.champ){ const k=[h.champ,h.runnerUp].sort().join('|'); pairs[k]=(pairs[k]||0)+1; } });
    const riv=Object.entries(pairs).sort((a,b)=>b[1]-a[1])[0];
    const poll=projectPoll();
    const fav=poll[0].t, dark=poll[Math.min(4,poll.length-1)].t;
    const champStar=H.star[last.champ];

    // ---- LEAD ----
    const leadHead=`${univ.name} Reconvenes: ${full(last.champ)} Defend the Crown`;
    const leadBody=`The ${season} season of ${univ.name} opens with the league exactly where it left it — chasing ${full(last.champ)}. `+
      `The champions closed out ${last.season} with a ${last.finalScore} win over ${full(last.runnerUp)} in a final the whole league replayed all winter, and ${champStar.name} — ${champStar.mvps>1?`a ${ord(champStar.mvps)}-time MVP`:'the reigning MVP'} — is back to run it back. `+
      `But ${univ.lore} doesn't hand out repeats. ${fav.city}'s ${fav.nick} grade out as the ${season} favorite on paper, ${dark.city} lurk as the dark horse nobody wants to draw, and ${full(drought.abbr)} are still hunting the first crown in franchise history. The headsets are on. Somebody's era starts now.`;

    // ---- FEATURE: last season's final ----
    const cW=tm(last.champ), cL=tm(last.runnerUp);
    const featHead=`How ${cW.nick} Won the ${last.season} Crown`;
    const featBody=`It came down to the two best teams in ${univ.name}, the way the best seasons should. `+
      `${full(last.champ)} and ${full(last.runnerUp)} traded the lead into the fourth quarter of the title game before the champions pulled away, ${last.finalScore}. `+
      `${champStar.name} was the difference — ${last.mvp.line} on the season, then the dagger when it mattered — and hoisted ${champStar.titles>1?`a ${ord(champStar.titles)} ring`:'a first ring'} as the confetti fell. `+
      `For ${cL.nick}, it was the second time in ${H.YEARS} years they'd reached the final and come up a play short${riv && riv[0].split('|').includes(last.runnerUp)?' against the same tormentors':''}. `+
      `The ${last.season} standings finished ${last.standings.map((a,i)=>`${i+1}. ${tm(a).nick}`).join(' · ')}. The league's stat crowns went to ${last.leaders.pass.split(' ').slice(0,2).join(' ')} through the air and ${last.leaders.rush.split(' ').slice(0,2).join(' ')} on the ground. `+
      `Now every one of them resets to 0-0 — and the champions wear the target.`;

    // ---- POWER POLL (projected this season) ----
    const moves=['the standard everyone is measuring against','a complete roster with no obvious hole','dangerous if the young legs hold up','a quietly excellent two-deep','one star away from the top tier','a live dark horse in a soft division','rebuilding, but the arrow is up','a long season looms unless the line gels'];
    const power_poll=poll.slice(0,8).map((x,i)=>{ const lore=x.t._lore||{}; let blurb;
      if(x.t._defendingChamp) blurb=`Defending champions — the standard the league is chasing.`;
      else if(i===0) blurb=`The class of the league on paper — a complete roster, the team to beat.`;
      else blurb=E.pick(moves)+'.';
      if(lore.titles) blurb+=` ${lore.titles} title${lore.titles>1?'s':''} in the ledger.`;
      return { rank:i+1, team:x.t.abbr, move: x.t._defendingChamp?'same':'new', delta:0,
        record: lore.lastW!=null?`${lore.lastW}-${lore.lastL}`:'—', blurb }; });

    // ---- BY THE NUMBERS (history) ----
    const by_the_numbers=[
      { stat:String(dynastyN), context:`${full(dynastyAb)} titles over ${H.YEARS} seasons — the league's standard-bearer` },
      { stat:String(H.YEARS), context:`seasons of ${univ.name} history on the books before kickoff` },
      { stat:`${(pct(fav._lore.lastW,fav._lore.lastL)*100).toFixed(0)}%`, context:`${fav.city} ${fav.nick} — best returning win rate, your ${season} favorite` },
      { stat: champStar.mvps>1?String(champStar.mvps):'1', context:`MVP awards for ${champStar.name}, the face of the ${full(last.champ)} dynasty` },
      { stat: riv?String(riv[1]):'—', context: riv?`title-game meetings between ${tm(riv[0].split('|')[0]).nick} and ${tm(riv[0].split('|')[1]).nick} — the rivalry of the era`:`a wide-open league with no settled order` },
      { stat:'0-0', context:`every record in ${univ.name}, as the ${season} season begins` },
    ];

    // ---- NOTEBOOK / storylines ----
    const notebook=[
      { tag:'DYNASTY', hit:`${full(dynastyAb)} have ${dynastyN} of the last ${H.YEARS} crowns. The league is built to stop them; nobody has yet.` },
      { tag:'DROUGHT', hit:`${full(drought.abbr)} have never lifted the trophy. ${drought._lore.star} is the talent to finally change that.` },
      riv?{ tag:'RIVALRY', hit:`${tm(riv[0].split('|')[0]).nick} vs. ${tm(riv[0].split('|')[1]).nick} has decided ${riv[1]} finals. Circle both meetings.` }:{ tag:'WIDE OPEN', hit:`No franchise has stacked titles — ${univ.name} enters ${season} genuinely up for grabs.` },
      { tag:'MVP RACE', hit:`${champStar.name} (${full(last.champ)}) chases another. Watch ${fav._lore.star} of ${full(fav.abbr)} to push him.` },
      { tag:'DARK HORSE', hit:`${full(dark.abbr)} grade out higher than their seed suggests. A quiet contender.` },
      { tag:'KICKOFF', hit:`Camps are open across ${univ.name}. The ${season} race is officially on.` },
    ];

    // ---- THREE CLASSIC GAMES from the era ----
    const game_stories=[];
    const sample=hist.slice().reverse().slice(0,3);
    sample.forEach(h=>{ const w=tm(h.champ), l=tm(h.runnerUp);
      game_stories.push({ headline:`${w.nick} ${h.finalScore} ${l.nick} — the ${h.season} Final`, byline:'From the Archives',
        body:`The ${h.season} title game still gets talked about: ${full(h.champ)} over ${full(h.runnerUp)}, ${h.finalScore}, with ${h.mvp.name} carving his name into ${univ.name} lore (${h.mvp.line}). It sent ${w.nick} home with the crown and ${l.nick} home with the ache.` }); });

    // ---- COLUMN ----
    const column={ byline:'Hank Mariucci', headline:`Welcome to ${univ.name}. Mind the History.`,
      body:`You're not walking into an expansion outfit. ${univ.name} has ${H.YEARS} seasons of scar tissue — dynasties built and broken, a record book with real names in it, rivalries that don't need an introduction. `+
        `${full(dynastyAb)} have set the bar with ${dynastyN} crowns. ${full(drought.abbr)} are still chasing their first and the whole league is pulling for them or against them, never neutral. `+
        `The beauty of dropping in now is that none of it is decided going forward. The ledger is written up to today and blank after it. Pick your franchise, learn its grudges, and go write the next chapter. I'll be in the booth for all of it.` };

    // ---- QUOTE ----
    const quote_of_week={ text:`History's nice. It doesn't block anybody. We line up ${season==null?'':'in '+season} like we've never won a thing.`,
      attribution:`— Head Coach, ${full(last.champ)}` };

    // ---- TALK SHOW ----
    const talk_show=[
      `MARV: Welcome in, folks — ${univ.name} is back, and we open ${season} with ${cW.nick} on top of the world.`,
      `DEION: ${champStar.name} and that ${cW.nick} club are the team to beat, Marv, but I'm telling you — ${fav.nick} are LOADED.`,
      `MARV: ${full(drought.abbr)} have never won it. ${H.YEARS} years of heartbreak. Is this the one?`,
      `DEION: If ${drought._lore.star} stays healthy? Don't laugh. Stranger things have happened in this league.`,
      `MARV: ${riv?`And we get ${tm(riv[0].split('|')[0]).nick}-${tm(riv[0].split('|')[1]).nick} again — ${riv[1]} finals between 'em.`:'Wide open at the top, which makes for great theater.'}`,
      `DEION: Strap in. Everybody's 0-0. That's the most dangerous record there is.`,
    ].join('\n');

    // ---- WIRE (offseason flavor) ----
    const wire={ transactions:[
        `${full(last.runnerUp)} restructure to keep their title window open after the ${last.season} final.`,
        `${full(drought.abbr)} hand ${drought._lore.star} a franchise-record extension — all-in on ending the drought.`,
        `${full(dark.abbr)} add veteran help, signaling a push up the ${dark.conf||''} table.`,
      ], injuries:[] };

    return {
      edition_kicker:`${univ.name.toUpperCase()} · ${season} PRESEASON · A WORLD WITH A PAST`,
      lead:{ headline:leadHead, deck:`${H.YEARS} seasons of history. One blank page ahead.`, dateline:`${(tm(last.champ).city||'').toUpperCase()} — `, byline:'The Gazette', body:leadBody, pull_quote:`Every record resets to 0-0. The champions wear the target.` },
      feature:{ kicker:`THE ${last.season} FINAL`, headline:featHead, byline:'Hank Mariucci', dateline:`${(cW.city||'').toUpperCase()} — `, body:featBody, pull_quote:`${champStar.name} hoisted the ring as the confetti fell.` },
      power_poll, by_the_numbers, notebook, game_stories, column, quote_of_week, talk_show, wire,
    };
  }

  /* ================= APPLY ================= */
  function apply(key){ try{
    const univ=UNIV[key]; if(!univ||typeof G==='undefined'||!G||!G.teams) return false;
    const H=fabricateHistory(univ);
    const g=buildIntroGazette(univ, H);
    G.gazettes=G.gazettes||{}; G.gazettes[G.season+'_0']=g;
    G._universe={ key, name:univ.name, era:H.YEARS };
    // a little wire/news so the league feels lived-in from screen one
    const champ=G.teams.find(t=>t._defendingChamp);
    if(window.addNews){ addNews('LEAGUE',`Welcome to ${univ.name} — ${H.YEARS} seasons of history on the books. ${champ?`${champ.city} ${champ.nick} are the defending champions.`:''}`);
      (g.wire.transactions||[]).slice(0,2).forEach(x=>addNews('LEAGUE',x)); }
    return true;
  }catch(e){ if(window.console)console.warn('UNIVERSES.apply',e); return false; } }

  window.UNIVERSES={ defs:UNIV, isUniverse, apply, keys:Object.keys(UNIV) };
})();
