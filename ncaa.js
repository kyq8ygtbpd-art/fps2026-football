/* ============================================================
   FPS 2026 — ncaa.js : a college football season that sims in the
   BACKGROUND alongside the pro league each week, with its own AP-style
   Top 25, Heisman race, national title, and a college Gazette/newsletter.
   Feeds the pro draft (prospects' schools rise & fall). Depends on app.js
   globals (G, ENG, addNews, el, $, head, ovrBadge) — called at runtime.
   ============================================================ */
(function(){
  'use strict';
  const ri=(a,b)=>ENG.ri(a,b), rng=()=>ENG.rng(), pick=a=>a[Math.floor(rng()*a.length)];
  // real institutions (place/school names), generic — kept brand-neutral
  const TEAMS=[
    {name:'Alabama',nick:'Crimson Tide',conf:'SEC',pres:95,c:'#9e1b32'},{name:'Georgia',nick:'Bulldogs',conf:'SEC',pres:96,c:'#ba0c2f'},
    {name:'Texas',nick:'Longhorns',conf:'SEC',pres:90,c:'#bf5700'},{name:'LSU',nick:'Tigers',conf:'SEC',pres:88,c:'#461d7c'},
    {name:'Tennessee',nick:'Volunteers',conf:'SEC',pres:84,c:'#ff8200'},{name:'Ole Miss',nick:'Rebels',conf:'SEC',pres:80,c:'#14213d'},
    {name:'Ohio State',nick:'Buckeyes',conf:'Big Ten',pres:95,c:'#bb0000'},{name:'Michigan',nick:'Wolverines',conf:'Big Ten',pres:90,c:'#00274c'},
    {name:'Penn State',nick:'Nittany Lions',conf:'Big Ten',pres:86,c:'#041e42'},{name:'Oregon',nick:'Ducks',conf:'Big Ten',pres:88,c:'#154733'},
    {name:'USC',nick:'Trojans',conf:'Big Ten',pres:84,c:'#990000'},{name:'Washington',nick:'Huskies',conf:'Big Ten',pres:82,c:'#4b2e83'},
    {name:'Notre Dame',nick:'Fighting Irish',conf:'Ind.',pres:88,c:'#0c2340'},
    {name:'Clemson',nick:'Tigers',conf:'ACC',pres:86,c:'#f56600'},{name:'Florida State',nick:'Seminoles',conf:'ACC',pres:84,c:'#782f40'},
    {name:'Miami',nick:'Hurricanes',conf:'ACC',pres:82,c:'#f47321'},{name:'Louisville',nick:'Cardinals',conf:'ACC',pres:76,c:'#ad0000'},
    {name:'Oklahoma',nick:'Sooners',conf:'SEC',pres:86,c:'#841617'},{name:'Texas A&M',nick:'Aggies',conf:'SEC',pres:82,c:'#500000'},
    {name:'Florida',nick:'Gators',conf:'SEC',pres:82,c:'#0021a5'},{name:'Utah',nick:'Utes',conf:'Big 12',pres:80,c:'#cc0000'},
    {name:'Kansas State',nick:'Wildcats',conf:'Big 12',pres:78,c:'#512888'},{name:'Missouri',nick:'Tigers',conf:'SEC',pres:78,c:'#f1b82d'},
    {name:'Iowa',nick:'Hawkeyes',conf:'Big Ten',pres:77,c:'#ffcd00'}
  ];
  function ncaaInit(force){
    if(G.ncaa && !force && G.ncaa.season===G.season) return;
    // carry coaches across seasons (so a college HC builds a reputation before the NFL poaches him)
    const prevC={}; if(G.ncaa&&G.ncaa.teams) G.ncaa.teams.forEach(t=>{ if(t.coach) prevC[t.name]=t.coach; });
    G.ncaa={ season:G.season, week:0, done:false, champ:null, lastUpset:null, news:[],
      teams:TEAMS.map(t=>({...t, abbr:t.name.replace(/[^A-Za-z]/g,'').slice(0,4).toUpperCase(), rating:t.pres+ri(-4,4), w:0,l:0,pf:0,pa:0,streak:0,
        coach: prevC[t.name] || {name:ENG.coachName(), ovr:ENG.clamp(Math.round(t.pres*0.62+ri(8,24)),62,92), titles:0} })) };
    ncaaRank();
  }
  function ncaaRank(){ const N=G.ncaa; N.rankRows=N.teams.slice().sort((a,b)=> (b.rating+b.w*3-b.l*2.5+b.streak) - (a.rating+a.w*3-a.l*2.5+a.streak) ); }
  function ncaaSimGame(a,b){ const diff=a.rating-b.rating, p=1/(1+Math.pow(10,-diff/16)); const aw=rng()<p;
    const win=aw?a:b, lose=aw?b:a; const wp=ri(17,45), lp=ENG.clamp(wp-ri(3,28),0,wp-1);
    win.w++; lose.l++; win.pf+=wp; win.pa+=lp; lose.pf+=lp; lose.pa+=wp; win.streak=win.streak>=0?win.streak+1:1; lose.streak=lose.streak<=0?lose.streak-1:-1;
    const fav=a.rating>=b.rating?a:b; return {win,lose,wp,lp,upset:(win!==fav && Math.abs(diff)>=6)}; }
  function ncaaTick(){
    ncaaInit(); const N=G.ncaa; if(N.done) return;
    N.week++;
    const pool=N.teams.slice(); for(let i=pool.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    const games=[]; for(let i=0;i+1<pool.length;i+=2) games.push(ncaaSimGame(pool[i],pool[i+1]));
    ncaaRank();
    const top=N.rankRows[0]; const up=games.find(g=>g.upset);
    N.lastUpset = up? `${up.win.name} stun ${up.lose.name} ${up.wp}-${up.lp}` : null;
    // a couple of marquee lines for the college Gazette
    const ranked=new Set(N.rankRows.slice(0,12).map(t=>t.name));
    const marquee=games.filter(g=>ranked.has(g.win.name)||ranked.has(g.lose.name)).slice(0,4)
      .map(g=>`${g.win.name} def. ${g.lose.name}, ${g.wp}-${g.lp}`);
    N.weekly={week:N.week, top:top?top.name:'', upset:N.lastUpset, marquee};
    if(N.week>=13){ N.done=true; N.champ=top; addNews('NCAA',`🏈 College football crowns a champion: ${top.name} ${top.nick} finish ${top.w}-${top.l} and claim the national title.`);
      // college coaches build résumés → the hot ones get poached by the NFL carousel (Harbaugh/Riley pipeline)
      G.collegeHot=G.collegeHot||[];
      const addHot=(t,why)=>{ if(!t.coach) return; t.coach.titles=(t.coach.titles||0);
        G.collegeHot.unshift({name:t.coach.name, school:t.name, ovr:t.coach.ovr, why, season:G.season}); };
      if(top.coach){ top.coach.titles=(top.coach.titles||0)+1; top.coach.ovr=ENG.clamp(top.coach.ovr+ri(1,4),62,96);
        addNews('NCAA',`📋 ${top.coach.name} wins it all at ${top.name} (${top.coach.titles} title${top.coach.titles>1?'s':''}, ${top.coach.ovr} OVR) — NFL teams will come calling.`);
        if(window.VOICES) VOICES.feedPush({h:'@CoachingWire',n:'Coaching Wire',v:true,c:'#8b5cf6'},`🏆 ${top.coach.name} just won a national title at ${top.name}. Every NFL search committee just added a name.`,'NEWS',true);
        addHot(top,'national champion'); }
      // a breakout coach: big overachiever vs program prestige
      const breakout=N.teams.filter(t=>t!==top).sort((a,b)=>((b.w*3-b.l*2-b.pres*0.06))-((a.w*3-a.l*2-a.pres*0.06)))[0];
      if(breakout && breakout.w>=10 && breakout.coach){ breakout.coach.ovr=ENG.clamp(breakout.coach.ovr+ri(0,3),62,94); addHot(breakout,`${breakout.w}-${breakout.l} breakout at ${breakout.name}`); }
      if(G.collegeHot.length>8) G.collegeHot.length=8;
      // season honors: All-Americans (1st & 2nd team) + the Heisman winner
      N.allAmerican=ncaaAllAmerican();
      const pr=(G.prospects||[]); const heisPool=pr.filter(p=>['QB','RB','WR','TE'].includes(p.pos)).sort((a,b)=>b.grade-a.grade);
      N.heismanWinner=heisPool[0]||pr.slice().sort((a,b)=>b.grade-a.grade)[0]||null;
      if(N.heismanWinner){ const w=pr.find(p=>p.id===N.heismanWinner.id); if(w)w.honors='Heisman Winner'; addNews('NCAA',`🏆 Heisman Trophy: ${N.heismanWinner.name} (${N.heismanWinner.pos}, ${N.heismanWinner.school}).`); }
      N.allAmerican.first.forEach(a=>{ const p=pr.find(x=>x.id===a.id); if(p&&!p.honors)p.honors='1st Team All-American'; });
      N.allAmerican.second.forEach(a=>{ const p=pr.find(x=>x.id===a.id); if(p&&!p.honors)p.honors='2nd Team All-American'; });
      if(window.VOICES){ VOICES.feedPush({h:'@CFBInsider',n:'College Football Insider',v:true,c:'#f0b23f'}, `NATIONAL CHAMPIONS: the ${top.name} ${top.nick}! And ${N.heismanWinner?N.heismanWinner.name+' takes home the Heisman.':''}`,'NEWS',true); } }
    else { if(up) addNews('NCAA',`📊 College upset: ${N.lastUpset}.`);
      if(window.VOICES && N.week%2===0) VOICES.feedPush({h:'@CFBInsider',n:'College Football Insider',v:true,c:'#46d39a'}, `AP Top 5: ${N.rankRows.slice(0,5).map((t,i)=>`${i+1}. ${t.name}`).join(' · ')}`,'NEWS'); }
  }
  function ncaaHeisman(){ const pr=(G.prospects||[]).slice().sort((a,b)=>b.grade-a.grade).slice(0,4);
    return pr.map(p=>({name:p.name,pos:p.pos,school:p.school,grade:p.grade})); }
  function ncaaAllAmerican(){ const pr=(G.prospects||[]); const POS=['QB','RB','WR','TE','T','G','C','DE','DT','OLB','ILB','CB','S','K','P'];
    const at=(pos,n)=>{ const r=pr.filter(p=>p.pos===pos).sort((a,b)=>b.grade-a.grade); return r[n]?{name:r[n].name,pos,school:r[n].school,grade:r[n].grade,id:r[n].id}:null; };
    return { first:POS.map(p=>at(p,0)).filter(Boolean), second:POS.map(p=>at(p,1)).filter(Boolean) }; }
  // procedural college Gazette / newsletter
  function ncaaGazette(){ const N=G.ncaa; if(!N) return null; const r=N.rankRows||[]; const top=r[0]; const heis=ncaaHeisman();
    return {
      headline: N.done? `${top?top.name:'—'} are NATIONAL CHAMPIONS` : N.week===0? 'Kickoff: a new college season dawns' : `${top?top.name:'—'} hold at No. 1 as the playoff race tightens`,
      lead: N.week===0? `Saturdays are back. ${top?top.name+' open as the team to beat':'A wide-open field awaits'}, but the College Football Playoff picture won't sort itself out until December. Heisman hopefuls and future first-rounders take the field this week.`
        : `${top?`${top.name} (${top.w}-${top.l}) own the No. 1 ranking`:''}${r[1]?`, with ${r[1].name} (${r[1].w}-${r[1].l}) lurking at No. 2`:''}. ${N.lastUpset?`The week's shocker: ${N.lastUpset}. `:''}${N.done?`When the dust settled, it was ${top?top.name:'—'} hoisting the trophy.`:`Every Saturday reshuffles the board.`}`,
      top10: r.slice(0,10), heisman: heis,
      marquee: (N.weekly&&N.weekly.marquee)||[] };
  }
  // ---- the College screen ----
  function scrCollege(m){
    ncaaInit(); const N=G.ncaa; const gz=ncaaGazette();
    head(m,'College Football',`Season ${N.season} · ${N.done?'National champion crowned':'Week '+N.week} · the pipeline to your draft`);
    // college Gazette
    const g=el('div','gaz'); let h=`<h2>THE CAMPUS GAZETTE</h2><div class="ged"><span>${N.season} College Season</span><span>${N.done?'BOWL SEASON':'WEEK '+N.week}</span><span>Saturdays in the Fall</span></div>`;
    h+=`<h3 class="lead">${gz.headline}</h3><div class="gcols"><div class="gmain"><p class="gart">${gz.lead}</p>`;
    if(gz.marquee.length){ h+='<h4 class="ghd">Around the Country</h4>'+gz.marquee.map(x=>`<p class="gart">${x}</p>`).join(''); }
    h+='</div><div class="gside">';
    h+='<div class="gbox"><h4>AP Top 10</h4>'+gz.top10.map((t,i)=>`<div class="glead"><span>${i+1}. ${t.name} <span class="gsub">${t.conf}</span></span><b>${t.w}-${t.l}</b></div>`).join('')+'</div>';
    h+='<div class="gbox"><h4>🏆 Heisman Watch</h4>'+gz.heisman.map((p,i)=>`<div class="glead"><span>${i+1}. ${p.name} <span class="gsub">${p.pos} · ${p.school}</span></span><b>${p.grade}</b></div>`).join('')+'</div>';
    h+='</div></div>'; g.innerHTML=h; m.appendChild(g);
    // full Top 25
    const c=el('div','card'); c.style.marginTop='14px'; c.innerHTML='<h3>AP Top 25</h3>';
    const tb=el('table'); tb.innerHTML='<tr><th>#</th><th>Team</th><th>Conf</th><th>Rec</th><th>Pts For/Ag</th></tr>'+
      N.rankRows.slice(0,25).map((t,i)=>`<tr><td>${i+1}</td><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${t.c};margin-right:6px"></span><b>${t.name}</b> <span class="muted">${t.nick}</span></td><td class="muted">${t.conf}</td><td>${t.w}-${t.l}</td><td class="muted">${t.pf}/${t.pa}</td></tr>`).join('');
    c.appendChild(tb); m.appendChild(c);
    // season honors: Heisman winner + All-American teams (once the season is done)
    if(N.done && N.allAmerican){ const aa=el('div','card'); aa.style.marginTop='12px';
      const row=(arr,lbl)=>`<div class="grphd" style="margin:6px 0 4px">${lbl}</div><div class="aprow">`+arr.map(a=>`<div class="apc"><span class="tag">${a.pos}</span> <b>${a.name}</b> <span class="muted">${a.school}</span></div>`).join('')+'</div>';
      aa.innerHTML=`<h3>🏆 ${N.season} Heisman Trophy</h3>`+(N.heismanWinner?`<div class="news" style="border-left-color:#b9892f"><b>${N.heismanWinner.name}</b> — ${N.heismanWinner.pos}, ${N.heismanWinner.school}</div>`:'')
        +`<h3 style="margin-top:14px">All-Americans</h3>`+row(N.allAmerican.first,'FIRST TEAM')+row(N.allAmerican.second,'SECOND TEAM');
      m.appendChild(aa); }
  }
  window.ncaaInit=ncaaInit; window.ncaaTick=ncaaTick; window.ncaaGazette=ncaaGazette; window.scrCollege=scrCollege; window.ncaaHeisman=ncaaHeisman; window.ncaaAllAmerican=ncaaAllAmerican;
  window.ncaaTeamInit=ncaaInit; window.ncaaTeamTick=ncaaTick; window.ncaaTeamGazette=ncaaGazette;   // self-contained team-season sim (G.ncaa) for app.js to drive
})();
