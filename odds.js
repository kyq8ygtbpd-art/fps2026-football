/* ============================================================
   FPS 2026 — odds.js : a live sportsbook. Game lines (spread / total /
   moneyline) and season futures (Super Bowl, each conference, MVP, OPOY,
   DPOY, ROY, Heisman) — all recomputed from the live league each week.
   Original model off team ratings/records + award production. For a
   fictional game; no real betting. Depends on app.js/engine globals.
   ============================================================ */
(function(){
  'use strict';
  const clamp=(x,a,b)=>x<a?a:x>b?b:x;
  function amOdds(p){ p=clamp(p,0.004,0.965); return p>=0.5? '−'+Math.round(p/(1-p)*100) : '+'+Math.round((1-p)/p*100); }
  function softmax(scores,temp){ const mx=Math.max(...scores); const e=scores.map(s=>Math.exp((s-mx)/temp)); const sum=e.reduce((a,b)=>a+b,0)||1; return e.map(x=>x/sum); }
  const teamOvr=t=>ENG.teamOvr(t);
  function teamStrength(t){ const gp=t.wins+t.losses, wp=gp?t.wins/gp:0.5; return teamOvr(t)+wp*14+(t.pf-t.pa)*0.04; }

  // ---- game line ----
  function gameLine(home,away,wx){ const HFA=2.2;
    const raw=(teamOvr(home)-teamOvr(away))*0.62+HFA; const spread=Math.round(raw*2)/2;
    const wxa = wx==='snow'?-4:wx==='rain'||wx==='wind'?-2:wx==='cold'?-1:0;
    const total=clamp(Math.round((44+((teamOvr(home)+teamOvr(away))/2-80)*0.55+wxa)*2)/2,33,62);
    const pHome=1/(1+Math.pow(10,-raw/14));
    return {spread, total, homeFav:spread>=0, favAbbr:spread>=0?home.abbr:away.abbr, line:Math.abs(spread).toFixed(1), mlHome:amOdds(pHome), mlAway:amOdds(1-pHome)}; }

  // ---- futures ----
  function teamFutures(pool, temp){ const probs=softmax(pool.map(teamStrength),temp);
    return pool.map((t,i)=>({t,p:probs[i]})).sort((a,b)=>b.p-a.p); }
  function superBowlOdds(){ return teamFutures(G.teams, 6.2); }
  function confOdds(conf){ return teamFutures(G.teams.filter(t=>t.conf===conf), 5.2); }
  function confList(){ return [...new Set(G.teams.map(t=>t.conf))]; }

  function players(){ const out=[]; G.teams.forEach(t=>t.roster.forEach(p=>{ if(!(p.out>0)) out.push({p,t}); })); return out; }
  function awardBoard(filter, score, temp, n){ const c=players().filter(filter); if(!c.length) return [];
    const probs=softmax(c.map(score),temp); return c.map((x,i)=>({p:x.p,t:x.t,prob:probs[i]})).sort((a,b)=>b.prob-a.prob).slice(0,n||8); }
  const wins=t=>t.wins||0;
  function mvpOdds(){ return awardBoard(x=>true, x=>(x.p.awardPts||0)+x.p.ovr*2+(x.p.pos==='QB'?55:['RB','WR'].includes(x.p.pos)?14:0)+wins(x.t)*3.2, 26, 10); }
  function opoyOdds(){ return awardBoard(x=>ENG.OFF.has(x.p.pos), x=>(x.p.awardPts||0)+x.p.ovr*2+(x.p.pos==='QB'?30:0)+wins(x.t)*2, 22, 6); }
  function dpoyOdds(){ return awardBoard(x=>ENG.DEF.has(x.p.pos), x=>(x.p.awardPts||0)*1.3+x.p.ovr*2+(['DE','OLB'].includes(x.p.pos)?12:0)+wins(x.t)*2, 20, 6); }
  function royOdds(){ return awardBoard(x=>x.p.rookie, x=>(x.p.awardPts||0)+x.p.ovr*2.4, 18, 6); }
  function heismanOdds(){ const pr=(G.prospects||[]).filter(p=>['QB','RB','WR','TE'].includes(p.pos)); if(!pr.length) return [];
    const rank=name=>{ const r=(G.ncaa&&G.ncaa.rankRows)||[]; const i=r.findIndex(t=>t.name===name); return i<0?0:i<5?34:i<12?20:i<25?8:0; };
    const sc=pr.map(p=>p.grade*2.2+rank(p.school)+(p.pos==='QB'?14:0)); const probs=softmax(sc,5.0);
    return pr.map((p,i)=>({p,prob:probs[i]})).sort((a,b)=>b.prob-a.prob).slice(0,8); }

  // ---- the Odds screen ----
  function scrOdds(m){
    head(m,'Odds & Futures',`Sportsbook · updated through ${G.phase==='regular'?'Week '+Math.min(G.week,G.maxWeek):G.phase} · lines move every week`);
    // this week's game lines
    if(G.phase==='regular' && G.schedule[G.week]){ const c=el('div','card'); c.innerHTML='<h3>📋 This Week’s Lines</h3>';
      const tb=el('table'); tb.innerHTML='<tr><th>Matchup</th><th>Spread</th><th>O/U</th><th>Money line</th></tr>'+
        G.schedule[G.week].map(g=>{ const ho=team(g.home),aw=team(g.away); if(!ho||!aw)return''; const wx=(window.gameWeather?gameWeather(g.home,G.week):'clear'); const L=gameLine(ho,aw,wx); const me=(g.home===USER||g.away===USER);
          return `<tr${me?' style="background:#0c1a2e"':''}><td>${aw.abbr} @ ${ho.abbr}${me?' <span class="acc" style="font-size:10px">YOU</span>':''}</td><td><b>${L.favAbbr} -${L.line}</b></td><td>${L.total.toFixed(1)}</td><td class="muted">${aw.abbr} ${L.mlAway} · ${ho.abbr} ${L.mlHome}</td></tr>`; }).join('');
      c.appendChild(tb); m.appendChild(c); }
    const oddsTable=(title, rows)=>{ const c=el('div','card'); c.style.cssText='flex:1;min-width:300px'; c.innerHTML=`<h3>${title}</h3>`+
      (rows.length?'<table>'+rows.map((r,i)=>`<tr><td style="width:18px;color:var(--dim)">${i+1}</td><td>${r.name}${r.sub?` <span class="muted">${r.sub}</span>`:''}</td><td style="text-align:right;font-family:var(--mono);color:${r.odds[0]==='+'?'var(--good,#46d39a)':'var(--acc,#5bbcff)'}">${r.odds}</td><td class="muted" style="text-align:right;width:42px">${r.pct}</td></tr>`).join('')+'</table>':'<p class="muted">No line yet.</p>'); return c; };
    // futures grid
    const grid=el('div'); grid.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin-top:12px';
    grid.appendChild(oddsTable('🏆 Super Bowl', superBowlOdds().slice(0,14).map(x=>({name:x.t.city+' '+x.t.nick, odds:amOdds(x.p), pct:Math.round(x.p*100)+'%'}))));
    confList().slice(0,2).forEach(cf=> grid.appendChild(oddsTable(cf+' Champion', confOdds(cf).slice(0,8).map(x=>({name:x.t.city+' '+x.t.nick, odds:amOdds(x.p), pct:Math.round(x.p*100)+'%'})))));
    m.appendChild(grid);
    const grid2=el('div'); grid2.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin-top:12px';
    const pRow=a=>a.map(x=>({name:x.p.name, sub:x.p.pos+' · '+x.t.abbr, odds:amOdds(x.prob), pct:Math.round(x.prob*100)+'%'}));
    grid2.appendChild(oddsTable('🏅 MVP', pRow(mvpOdds())));
    grid2.appendChild(oddsTable('Offensive POY', pRow(opoyOdds())));
    grid2.appendChild(oddsTable('Defensive POY', pRow(dpoyOdds())));
    grid2.appendChild(oddsTable('Rookie of the Year', pRow(royOdds())));
    grid2.appendChild(oddsTable('🎓 Heisman Trophy', heismanOdds().map(x=>({name:x.p.name, sub:x.p.pos+' · '+x.p.school, odds:amOdds(x.prob), pct:Math.round(x.prob*100)+'%'}))));
    m.appendChild(grid2);
    const note=el('p','muted'); note.style.cssText='font-size:11px;margin-top:12px'; note.textContent='Lines and futures are a simulated model off team ratings, records and award production — for entertainment in this fictional league.';
    m.appendChild(note);
  }
  window.ODDS={gameLine, superBowlOdds, confOdds, mvpOdds, heismanOdds, amOdds}; window.scrOdds=scrOdds;
})();
