/* ============================================================
   FPS 2026 — storylines.js : the Storylines hub + pre-game trash talk.
   Kept in its own file (loads AFTER app.js) so it composes with the
   franchise narrative engine without touching the gameplay screen.
   All helpers (G, ENG, VOICES, team, el, head, logoTag, showPlayer,
   allPlayers, ensurePersona, ensureCoachCareer, dynastyBoost,
   PERSONA_LBL, PERSONA_EMOJI) are app.js globals.
   ============================================================ */
(function(){
  'use strict';
  const SCANDAL_LBL={reporter_coach:'reporter–coach affair',teammate_betrayal:'locker-room betrayal',same_sex:'relationship rumor',owner_family:"dating the owner's family",wild:'tabloid circus'};
  const esc=x=>String(x==null?'':x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  // sanitize Claude-generated text on ingestion: feed/news render with innerHTML, so strip any markup the model returns.
  const clean=s=>String(s==null?'':s).replace(/[<>]/g,'').slice(0,400);

  /* ---- FRESH AI STORYLINES: Claude invents a new scenario grounded in the real league ---- */
  function buildScenarioData(){
    G.teams.forEach(tm=>tm.roster.forEach(p=>{ if(typeof ensurePersona==='function') ensurePersona(p); }));
    const notable=allPlayers().filter(x=>x.p.ovr>=80 || ['headcase','trash_talker','diva','captain'].includes(x.p.persona))
      .sort((a,b)=>b.p.ovr-a.p.ovr).slice(0,26)
      .map(x=>({name:x.p.name,pos:x.p.pos,team:x.t.abbr,ovr:x.p.ovr,persona:x.p.persona,age:x.p.age,morale:x.p.morale,yrsLeft:x.p.years}));
    const st=(typeof standings==='function')?standings():[];
    return { season:G.season, week:G.week, userTeam:USER,
      teams:G.teams.map(tm=>({abbr:tm.abbr,name:`${tm.city} ${tm.nick}`,rec:`${tm.wins}-${tm.losses}`,coach:tm.coach?tm.coach.name:''})),
      stars:(G.leagueStars||[]).slice(0,8), notable,
      topTeam:st[0]?st[0].abbr:'', bottomTeam:st.length?st[st.length-1].abbr:'',
      recentNews:(G.news||[]).slice(0,8).map(n=>n.txt) };
  }
  // apply a Claude scenario object to the league (bounded + safe)
  window.applyScenario=function(sc){
    if(!sc||typeof sc!=='object') return false;
    let pl=null, tm=null;
    if(sc.player){ for(const t of G.teams){ const p=t.roster.find(x=>x.name===sc.player); if(p){ pl=p; tm=t; break; } } }
    if(!tm && sc.team) tm=team(sc.team);
    const eff=sc.effect||{};
    if(pl){
      if(typeof eff.morale==='number') pl.morale=ENG.clamp((pl.morale||70)+ENG.clamp(eff.morale,-30,12),5,99);
      if(eff.outGames>0){ pl.out=Math.max(pl.out||0,Math.min(3,eff.outGames|0)); pl.outReason=(sc.type==='scandal'||sc.type==='drama')?'incident':'personal'; }
      if(eff.wantsOut){ pl.flags=pl.flags||{}; pl.flags.wantsOut=true; }
      if(typeof recordArc==='function') recordArc(pl,'STORY',sc.headline||sc.story||'A new storyline');
    }
    if(tm && typeof eff.moraleTeam==='number' && eff.moraleTeam<0 && typeof teamMoraleHit==='function') teamMoraleHit(tm,0,Math.min(6,(-eff.moraleTeam)|0));
    const head2=clean(sc.headline||String(sc.story||'').slice(0,80)), story2=clean(sc.story);
    if(head2 && typeof addNews==='function') addNews('STORY', '🎬 '+head2 + (story2&&story2!==head2?` — ${story2}`:''));
    if(window.VOICES && Array.isArray(sc.tweets)) sc.tweets.slice(0,3).forEach((tw,i)=>{ if(tw&&tw.text) VOICES.feedPush({h:clean(tw.handle||'@LeagueBuzz'),n:clean(tw.name||'League Buzz'),v:true,c:'#caa46a'}, clean(tw.text), 'STORY', i===0); });
    G.aiScenarios=G.aiScenarios||[]; G.aiScenarios.unshift({season:G.season,week:G.week,type:clean(sc.type||'story'),team:clean(sc.team||(tm&&tm.abbr)||''),player:clean(sc.player||''),headline:head2,story:story2,byAI:true});
    if(G.aiScenarios.length>10) G.aiScenarios.length=10;
    return true;
  };
  /* ---- FRESH QUOTES: Claude writes the week's quotes in each figure's own voice ---- */
  function findPlayerByName(nm){ for(const t of G.teams){ const p=t.roster.find(x=>x.name===nm); if(p) return {p,t}; } return null; }
  function buildQuoteReqs(){
    const reqs=[]; const seen=new Set();
    const add=(p,t,ctx,note)=>{ if(p&&t&&reqs.length<5&&!seen.has(p.name)){ seen.add(p.name); if(typeof ensurePersona==='function')ensurePersona(p); reqs.push({name:p.name,pos:p.pos,team:t.abbr,persona:p.persona,context:ctx,note:note||''}); } };
    const potg=(G.lastResults||[]).map(r=>r.potg).filter(Boolean).sort((a,b)=>(b.aw||0)-(a.aw||0))[0];
    if(potg){ const f=findPlayer(potg.id); if(f) add(f.p,f.t,'win','player of the week: '+potg.stat); }
    const mvp=(G.mvpRace||[])[0]; if(mvp){ const f=findPlayer(mvp.id); if(f) add(f.p,f.t,'mvp','leading the MVP race'); }
    for(const t of G.teams){ const hc=t.roster.find(p=>p.persona==='headcase'&&((p._hc||0)>0||(p.flags&&p.flags.headcaseOut))); if(hc){ add(hc,t,(hc.flags&&hc.flags.headcaseOut)?'contract':'loss','stirring the pot again'); break; } }
    const rv=(G.rivalries||[]).slice().sort((a,b)=>b.heat-a.heat)[0]; if(rv){ const fa=findPlayer(rv.a.id); if(fa) add(fa.p,fa.t,'rivalry','rivalry with '+rv.b.name); }
    return reqs;
  }
  window.aiQuoteTick=function(){
    if(!window.AI||!AI.ready()||!G||G.phase!=='regular'||G._aiQuoteBusy) return;
    if(ENG.rng()>0.7) return;   // most weeks
    const reqs=buildQuoteReqs(); if(!reqs.length) return;
    G._aiQuoteBusy=true;
    AI.quotes(reqs).then(arr=>{ G._aiQuoteBusy=false; if(!Array.isArray(arr)||!window.VOICES) return;
      arr.slice(0,5).forEach((q,i)=>{ if(!q||!q.text) return; const f=q.name&&findPlayerByName(q.name);
        const acct=f?VOICES.playerAcct(f.p):{h:'@'+String(q.name||'Player').replace(/[^A-Za-z]/g,'').slice(0,14),n:clean(q.name||'Player'),v:true,c:'#cdd8ec'};
        VOICES.feedPush(acct, clean(q.text), 'QUOTE', i===0); });
      G._aiQuoteOfWeek=arr[0]||null;
      if(typeof render==='function' && ['feed','storylines','gazette'].includes(VIEW)) render();
    }).catch(()=>{ G._aiQuoteBusy=false; });
  };

  // STORYLINE DIGEST for the Gazette — a quick roundup of the week's live narratives.
  window.gazetteDigestBox=function(){
    const bits=[];
    const star=(G.leagueStars||[])[0]; if(star) bits.push(`<b>${esc(star.name)}</b> (${esc(star.team)}) is the face of the league at ${star.ovr} OVR.`);
    const rv=(G.rivalries||[]).slice().sort((a,b)=>b.heat-a.heat)[0]; if(rv&&rv.heat>=35) bits.push(rv.name?`<b>${esc(rv.name)}</b> is boiling — ${esc(rv.a.name)} vs ${esc(rv.b.name)} (heat ${rv.heat}).`:`The <b>${esc(rv.a.name)}</b>–<b>${esc(rv.b.name)}</b> rivalry is boiling (heat ${rv.heat}).`);
    for(const t of G.teams){ const hc=t.roster.find(p=>p.persona==='headcase'&&((p._hc||0)>0||(p.flags&&p.flags.headcaseOut)||p.outReason==='suspended')); if(hc){ bits.push(`Drama in ${esc(t.abbr)}: <b>${esc(hc.name)}</b> is ${(hc.flags&&hc.flags.headcaseOut)?'demanding out':hc.outReason==='suspended'?'suspended':'simmering'}.`); break; } }
    const sc=(G.aiScenarios||[])[0]; if(sc&&sc.headline) bits.push(`📣 ${esc(sc.headline)}`);
    const dyn=G.teams.map(t=>({t,b:(typeof dynastyBoost==='function'?dynastyBoost(t):0)})).sort((a,b)=>b.b-a.b)[0]; if(dyn&&dyn.b>=0.6) bits.push(dyn.t._dynastyName?`<b>${esc(dyn.t._dynastyName)}</b> rolls on — ${esc(dyn.t.city)} under ${esc(dyn.t.coach?dyn.t.coach.name:'their coach')}.`:`${esc(dyn.t.abbr)} are a full-blown dynasty under ${esc(dyn.t.coach?dyn.t.coach.name:'their coach')}.`);
    if(!bits.length) return '';
    return `<div class="gbox"><h4>📋 The Storyline Digest</h4>${bits.slice(0,5).map(b=>`<p style="margin:3px 0;font-size:12.5px;line-height:1.45">• ${b}</p>`).join('')}</div>`;
  };

  /* ---- BRANDED NAMES: rivalries + dynasties get a name (Claude when a key is set, procedural otherwise) ---- */
  function proceduralRivalryName(rv){ const ta=team(rv.a.abbr), tb=team(rv.b.abbr); const a=ta?ta.city:rv.a.abbr, b=tb?tb.city:rv.b.abbr;
    const la=String(rv.a.name).split(' ').pop(), lb=String(rv.b.name).split(' ').pop();
    const opts = rv.type==='QB'? [`The ${la}–${lb} Duel`,`Gunslingers: ${a} vs ${b}`,`The ${a}–${b} Shootout`]
      : [`The ${la}–${lb} Grudge`,`${a}–${b} Bad Blood`,`The ${a}–${b} Feud`];
    return opts[Math.floor(ENG.rng()*opts.length)]; }
  function proceduralDynastyName(t){ const opts=[`The ${t.city} Dynasty`,`The ${t.nick} Empire`,`Titletown: ${t.city}`,`The ${t.coach?String(t.coach.name).split(' ').pop():t.city} Era`];
    return opts[Math.floor(ENG.rng()*opts.length)]; }
  window.aiNamesTick=function(){
    if(typeof AI==='undefined'||!AI.ready()||!G||G._aiNameBusy) return;
    const reqs=[];
    (G.rivalries||[]).forEach(rv=>{ if(!rv.name && rv.meet>=2 && rv.heat>=45 && reqs.length<6) reqs.push({kind:'rivalry',id:rv.key,a:rv.a.name,aTeam:rv.a.abbr,b:rv.b.name,bTeam:rv.b.abbr,type:rv.type,heat:rv.heat,record:`${rv.aw}-${rv.bw}`}); });
    G.teams.forEach(t=>{ if(!t._dynastyName && (typeof dynastyBoost==='function'?dynastyBoost(t):0)>=0.6 && reqs.length<8) reqs.push({kind:'dynasty',id:t.abbr,team:`${t.city} ${t.nick}`,coach:t.coach?t.coach.name:'',titles:(t.coach&&t.coach.rings)||0,years:(t.coach&&t.coach.szns)||0}); });
    if(!reqs.length) return; G._aiNameBusy=true;
    AI.names(reqs).then(arr=>{ G._aiNameBusy=false; if(!Array.isArray(arr)) return; let named=0;
      arr.forEach(n=>{ if(!n||!n.id||!n.name) return; const name=clean(String(n.name).replace(/^["'\s]+|["'\s]+$/g,'')).slice(0,42); if(!name) return;
        const rv=(G.rivalries||[]).find(r=>r.key===n.id);
        if(rv&&!rv.name){ rv.name=name; named++; if(window.VOICES) VOICES.feedPush({h:'@CoverThree',n:'Brett Cosell',v:true,c:'#8b5cf6'},`They've got a name for it now: "${name}" — ${rv.a.name} vs ${rv.b.name} has officially arrived. 🔥`,'NEWS',rv.heat>=60); return; }
        const t=team(n.id); if(t&&!t._dynastyName){ t._dynastyName=name; named++; if(window.VOICES) VOICES.feedPush({h:'@CoverThree',n:'Brett Cosell',v:true,c:'#8b5cf6'},`The dynasty has a name: the ${t.city} run under ${t.coach?t.coach.name:'their coach'} is now "${name}". 🏛️`,'NEWS',true); } });
      if(named && typeof render==='function' && ['storylines','feed','gazette'].includes(VIEW)) render();
    }).catch(()=>{ G._aiNameBusy=false; });
  };
  function nameTick(){
    if(!G||G.phase!=='regular') return;
    if((typeof AI!=='undefined')&&AI.ready()){ aiNamesTick(); return; }   // key set → let Claude brand them
    // no key → procedural fallback so the names still exist
    (G.rivalries||[]).forEach(rv=>{ if(!rv.name && rv.meet>=2 && rv.heat>=52) rv.name=proceduralRivalryName(rv); });
    G.teams.forEach(t=>{ if(!t._dynastyName && (typeof dynastyBoost==='function'?dynastyBoost(t):0)>=0.66) t._dynastyName=proceduralDynastyName(t); });
  }

  // HEAD-CASE REDEMPTION — the right culture can turn a head case into a star (you never know).
  // The flip side of the AB spiral: a strong, stable room (elite/stable coach, a captain, or a dynasty)
  // gives the talent everyone feared a real shot at maturing instead of flaming out.
  function headcaseRedemptionTick(){
    if(!G||G.phase!=='regular') return;
    const pickL=a=>a[Math.floor(ENG.rng()*a.length)];
    G.teams.forEach(t=>{
      const coachOvr=t.coach?t.coach.ovr:70;
      const hasCaptain=t.roster.some(p=>p.persona==='captain'&&!(p.out>0)&&p.ovr>=72);
      const dyn=(typeof dynastyBoost==='function')?dynastyBoost(t):0;
      const culture=(coachOvr>=86?0.45:coachOvr>=80?0.28:coachOvr>=74?0.12:0)+(hasCaptain?0.28:0)+dyn*0.4;  // 0..~1
      if(culture<0.38) return;   // only genuinely strong rooms redeem a head case
      t.roster.forEach(p=>{
        if(p.persona!=='headcase'||p._redeemed||(p.flags&&p.flags.headcaseOut)||(p.out>0)) return;
        if(!((p._hc||0)>0 || p._hcOutWk!=null || (p.seasons||0)>=2)) return;   // needs some history (or a fresh start via trade)
        if(ENG.rng() >= 0.05*culture) return;                                  // earned, not automatic (~few %/wk in a great room)
        p._redeemed=true; p._hc=0; if(p.flags) p.flags.wantsOut=false;
        p.morale=ENG.clamp((p.morale||70)+ENG.ri(8,16),12,99);
        p.loyalty=ENG.clamp((p.loyalty||60)+ENG.ri(8,16),0,100);
        p.temperament=ENG.clamp((p.temperament||60)+ENG.ri(8,16),15,99);
        p.persona=(p.workEthic>=74&&p.age>=27)?'captain':'gamer';   // matured: a leader, or a pure competitor
        const txt=`REDEMPTION: ${p.name} (${p.pos}, ${t.city}) has turned the corner — ${t.coach?t.coach.name:'the staff'} and the veterans got through to him. The talent everyone feared to draft is finally all-in.`;
        if(typeof recordArc==='function') recordArc(p,'STORY',txt);
        if(typeof addNews==='function') addNews('STORY','🌟 '+clean(txt));
        if(window.VOICES){
          VOICES.feedPush({h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'},`Never thought I'd say it: ${p.name} has completely bought in with ${t.abbr}. Right culture, right time — a real career turnaround. 🙌`,'NEWS',p.ovr>=85);
          VOICES.feedPush(VOICES.playerAcct(p), pickL(['Grew up. Thankful to the guys who never gave up on me. Locked in now. 🙏','All that noise is behind me. Just ball now.','They believed when nobody did. I owe them everything. Let\'s work.']),'NEWS',p.ovr>=85);
        }
      });
    });
  }

  // automatic: name beats + redemption + fresh quotes + a fresh storyline (async, graceful)
  window.aiScenarioTick=function(){
    nameTick();   // brand rivalries + dynasties (procedural always; Claude when a key is set)
    headcaseRedemptionTick();   // the right culture can save a head case (runs regardless of any API key)
    if(typeof AI==='undefined'||!AI.ready()||!G||G.phase!=='regular') return;
    aiQuoteTick();   // fresh in-voice quotes most weeks
    if((G.week%2)!==0 || ENG.rng()>0.5 || G._aiScenBusy) return;
    G._aiScenBusy=true;
    AI.scenario(buildScenarioData()).then(sc=>{ G._aiScenBusy=false; if(sc&&applyScenario(sc) && typeof render==='function' && ['storylines','feed','wire','gazette'].includes(VIEW)) render(); })
      .catch(()=>{ G._aiScenBusy=false; });
  };
  // manual: the user explicitly asks Claude for a fresh storyline
  window.genScenario=function(){
    const ok=window.AI&&AI.ready();
    if(!ok){ if(typeof toast==='function') toast('Set your Anthropic API key in the Newsroom (Gazette) to enable AI storylines.'); return; }
    if(G._aiScenBusy) return; G._aiScenBusy=true; if(typeof toast==='function') toast('🤖 Asking Claude for a fresh storyline…');
    AI.scenario(buildScenarioData()).then(sc=>{ G._aiScenBusy=false;
      if(sc&&applyScenario(sc)){ if(typeof save==='function')save(); if(typeof render==='function')render(); if(typeof toast==='function')toast('🎬 New storyline dropped.'); }
      else if(typeof toast==='function') toast('No storyline this time — try again.'); })
      .catch(e=>{ G._aiScenBusy=false; if(typeof toast==='function') toast('Newsroom error: '+(e&&e.message||e)); });
  };

  // STORYLINES HUB — the league's living narratives in one curated place.
  window.scrStorylines=function(m,t){
    head(m,'Storylines','The league\'s living narratives — the faces, the feuds, the dynasties, and the dramas.');
    const wrap=el('div'); wrap.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:12px';
    const card=(title,inner)=>{ const c=el('div','card'); c.innerHTML=`<h3 style="margin:0 0 8px">${title}</h3>`+inner; wrap.appendChild(c); };
    const last=n=>String(n||'').split(' ').pop();
    const pE=p=>(typeof PERSONA_EMOJI!=='undefined'&&PERSONA_EMOJI[p])||'', pL=p=>(typeof PERSONA_LBL!=='undefined'&&PERSONA_LBL[p])||'';
    // 🤖 AI storylines — fresh, never-repeating drama written by Claude
    const aiOn=window.AI&&AI.ready();
    let aiInner=(G.aiScenarios&&G.aiScenarios.length)? G.aiScenarios.slice(0,4).map(s=>`<div class="news" style="border-left-color:#caa46a"><b>${esc(s.headline)}</b>${s.story?`<div class="muted" style="font-size:12px;margin-top:2px">${esc(s.story)}</div>`:''}<div class="muted" style="font-size:10px;margin-top:3px">${esc(s.team||'')} · ${esc(s.type)} · S${s.season} wk${s.week} <span class="acc">✨ Claude</span></div></div>`).join('')
      : `<p class="muted">${aiOn?'No AI storylines yet — generate one.':'Add your Anthropic API key in the Newsroom (Gazette) and Claude will write fresh, never-repeating storylines for your league.'}</p>`;
    aiInner+=`<div style="margin-top:8px"><button class="btn ${aiOn?'':'sec'}" onclick="genScenario()">🤖 Generate a fresh storyline</button></div>`;
    card('🤖 AI Storylines <span class="muted" style="font-weight:400;font-size:11px">— written fresh by Claude</span>', aiInner);
    // ⭐ Faces of the league
    let stars=G.leagueStars||[];
    if(!stars.length){ const all=allPlayers().sort((a,b)=>b.p.ovr-a.p.ovr).slice(0,6); stars=all.map(x=>{ if(typeof ensurePersona==='function')ensurePersona(x.p); return {id:x.p.id,name:x.p.name,pos:x.p.pos,team:x.t.abbr,ovr:x.p.ovr,persona:x.p.persona}; }); }
    card('⭐ Faces of the League', stars.length? stars.map((s,i)=>`<div class="glead" style="cursor:pointer" onclick="showPlayer(${s.id})"><span>${i+1}. ${logoTag(team(s.team),16)} <b>${s.name}</b> <span class="muted">${s.pos} ${s.team}</span> <span title="${pL(s.persona)}">${pE(s.persona)}</span></span><b>${s.ovr}</b></div>`).join('') : '<p class="muted">Play a few weeks to crown the league\'s stars.</p>');
    // 🏆 MVP race
    const race=G.mvpRace||[];
    card('🏆 MVP Race', race.length? race.map(r=>`<div class="glead" style="cursor:pointer" onclick="showPlayer(${r.id})"><span>${r.rank}. <b>${r.name}</b> <span class="muted">${r.pos} ${r.team} (${r.rec})</span></span><b>${r.score}</b></div>`).join('') : '<p class="muted">The MVP race heats up once the games begin.</p>');
    // 🧨 Head-case watch
    const hc=[]; G.teams.forEach(tm=>tm.roster.forEach(p=>{ if(p.persona==='headcase'&&p.ovr>=74&&((p._hc||0)>0||(p.flags&&p.flags.headcaseOut)||p.outReason==='suspended')) hc.push({p,tm}); }));
    hc.sort((a,b)=>b.p.ovr-a.p.ovr);
    card('🧨 Head-Case Watch', hc.length? hc.slice(0,6).map(({p,tm})=>{ const stage=(p.flags&&p.flags.headcaseOut)?'wants OUT':p.outReason==='suspended'?'suspended':(p._hc>=1?'simmering':'restless'); const c=stage==='wants OUT'?'#ef5b6b':stage==='suspended'?'#e8b341':'#9aa7bd';
      return `<div class="glead" style="cursor:pointer" onclick="showPlayer(${p.id})"><span>${logoTag(tm,16)} <b>${p.name}</b> <span class="muted">${p.pos} ${tm.abbr}</span></span><span style="color:${c};font-weight:700;font-size:11px">${stage}</span></div>`; }).join('') : '<p class="muted">No locker-room fires right now. Give it time. 🍿</p>');
    // ⚔️ Rivalries
    const rivs=(G.rivalries||[]).slice().sort((a,b)=>b.heat-a.heat).slice(0,6);
    card('⚔️ Rivalries', rivs.length? rivs.map(rv=>{ const lead=rv.aw===rv.bw?`even ${rv.aw}-${rv.bw}`:rv.aw>rv.bw?`${last(rv.a.name)} ${rv.aw}-${rv.bw}`:`${last(rv.b.name)} ${rv.bw}-${rv.aw}`; const col=rv.heat>=66?'#ef5b6b':rv.heat>=40?'#e8b341':'#5bbcff';
      return `<div style="padding:5px 0;border-bottom:1px solid var(--line2,#16223a)">${rv.name?`<div style="font-weight:800;color:#e8b341;font-size:12px">${esc(rv.name)}</div>`:''}<div><b>${rv.a.name}</b> <span class="muted">${rv.a.abbr}</span> vs <b>${rv.b.name}</b> <span class="muted">${rv.b.abbr}</span></div><div style="display:flex;align-items:center;gap:8px;margin-top:3px"><div style="flex:1;height:5px;background:#0c1320;border-radius:3px;overflow:hidden"><div style="height:100%;width:${rv.heat}%;background:${col}"></div></div><span class="muted" style="font-size:10px">${rv.meet} mtgs · ${lead}</span></div></div>`; }).join('') : '<p class="muted">No rivalries yet — they build through repeated meetings.</p>');
    // 🏛️ Dynasties
    const dyn=G.teams.map(tm=>({tm,c:(typeof ensureCoachCareer==='function'?ensureCoachCareer(tm):tm.coach)||{},b:(typeof dynastyBoost==='function'?dynastyBoost(tm):0)})).filter(x=>x.b>0.15).sort((a,b)=>b.b-a.b).slice(0,6);
    card('🏛️ Dynasties', dyn.length? dyn.map(({tm,c,b})=>`<div style="padding:5px 0;border-bottom:1px solid var(--line2,#16223a)">${tm._dynastyName?`<div style="font-weight:800;color:#46d39a;font-size:12px">${esc(tm._dynastyName)}</div>`:''}<div style="display:flex;justify-content:space-between"><span>${logoTag(tm,16)} <b>${tm.city} ${tm.nick}</b></span><span class="muted" style="font-size:11px">${c.name||'—'} · yr ${c.szns||0}</span></div><div style="display:flex;align-items:center;gap:8px;margin-top:3px"><div style="flex:1;height:5px;background:#0c1320;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(b*100)}%;background:${b>=0.6?'#46d39a':'#5bbcff'}"></div></div><span class="muted" style="font-size:10px">${c.rings||0}🏆 · ${c.cw||0}-${c.cl||0}</span></div></div>`).join('') : '<p class="muted">No dynasties yet — keep a great coach and win. Continuity compounds.</p>');
    // 🃏 Breakout watch (the Brady gems blossoming)
    const gems=[]; G.teams.forEach(tm=>tm.roster.forEach(p=>{ if((p.gem||p.persona==='gem')&&(p.draftOverall||99)>20) gems.push({p,tm}); }));
    gems.sort((a,b)=>b.p.ovr-a.p.ovr);
    card('🃏 Breakout Watch <span class="muted" style="font-weight:400;font-size:11px">— late-round gems rising</span>', gems.length? gems.slice(0,6).map(({p,tm})=>`<div class="glead" style="cursor:pointer" onclick="showPlayer(${p.id})"><span>${logoTag(tm,16)} <b>${p.name}</b> <span class="muted">${p.pos} ${tm.abbr} · #${p.draftOverall}</span></span><b style="color:${p.ovr>=85?'#46d39a':'#5bbcff'}">${p.ovr}</b></div>`).join('') : '<p class="muted">No hidden gems on rosters yet — unearth one in the draft.</p>');
    // ☕ Tabloid
    const scs=(G.scandals||[]);
    if(scs.length) card('☕ Tabloid', scs.slice(0,5).map(sc=>`<div class="news"><b>${sc.abbr}</b> — ${SCANDAL_LBL[sc.type]||'drama'}${sc.an?` <span class="muted">(${sc.an})</span>`:''}</div>`).join(''));
    m.appendChild(wrap);
  };

  // PRE-GAME TRASH TALK — mouthy stars fire shots before they meet; existing rivalries gain heat.
  window.pregameTrash=function(){
    if(!G||G.phase!=='regular'||!window.VOICES) return; const slate=G.schedule&&G.schedule[G.week]; if(!slate) return; let fired=0;
    for(const g of slate){ if(fired>=2) break; const h=team(g.home), a=team(g.away); if(!h||!a) continue;
      const talkers=[{tm:h,opp:a},{tm:a,opp:h}].reduce((acc,s)=>acc.concat(s.tm.roster.filter(p=>{ if(typeof ensurePersona==='function')ensurePersona(p); return ['trash_talker','headcase','showman'].includes(p.persona)&&p.ovr>=80&&!(p.out>0)&&!p.ir; }).map(p=>({p,tm:s.tm,opp:s.opp}))),[]);
      if(!talkers.length || ENG.rng()>0.45) continue;
      const x=talkers[Math.floor(ENG.rng()*talkers.length)];
      const rival=x.opp.roster.filter(p=>p.ovr>=80&&!(p.out>0)&&!p.ir).sort((p,q)=>q.ovr-p.ovr)[0];
      const rivalName=rival?rival.name:`the ${x.opp.nick}`;
      VOICES.athleteTweet(x.p,'trash',{rival:rivalName,tag:'NEWS'}, x.p.ovr>=86);
      const rv=rival&&(G.rivalries||[]).find(r=>(r.a.id===x.p.id&&r.b.id===rival.id)||(r.b.id===x.p.id&&r.a.id===rival.id));
      if(rv){ rv.heat=Math.min(100,rv.heat+ENG.ri(4,10)); VOICES.feedPush({h:'@CoverThree',n:'Brett Cosell',v:true,c:'#8b5cf6'},`Bad blood: ${x.p.name} firing shots at ${rivalName} before they run it back. This rivalry has real heat now. 🔥`,'NEWS',rv.heat>=60); }
      fired++;
    }
  };

  // RIVALRY GAME-WEEK BANNER — when your upcoming opponent has a player in one of your players' rivalries.
  window.rivalryBanner=function(){
    if(!G||G.phase!=='regular') return null;
    const g=(G.schedule[G.week]||[]).find(x=>x.home===USER||x.away===USER); if(!g) return null;
    const me=team(USER), opp=team(g.home===USER?g.away:g.home); if(!me||!opp) return null;
    const onMe=id=>me.roster.some(p=>p.id===id), onOpp=id=>opp.roster.some(p=>p.id===id);
    const rv=(G.rivalries||[]).filter(r=>(onMe(r.a.id)&&onOpp(r.b.id))||(onMe(r.b.id)&&onOpp(r.a.id))).sort((a,b)=>b.heat-a.heat)[0];
    if(!rv || rv.heat<30) return null;
    const thread=(G.feed||[]).filter(f=>(f.txt.includes(rv.a.name)||f.txt.includes(rv.b.name))&&/firing shots|Bad blood|run it back|rivalry|haymakers|chapter|name for it/i.test(f.txt)).slice(0,2);
    const last=n=>String(n||'').split(' ').pop();
    const lead=rv.aw===rv.bw?`series even ${rv.aw}-${rv.bw}`:rv.aw>rv.bw?`${last(rv.a.name)} leads ${rv.aw}-${rv.bw}`:`${last(rv.b.name)} leads ${rv.bw}-${rv.aw}`;
    const c=el('div','card'); c.style.cssText='border:1px solid #e8b341;background:linear-gradient(90deg,#e8b34118,transparent)';
    c.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div><div class="muted" style="font-size:11px;letter-spacing:.08em">⚔️ RIVALRY ${rv.name?'GAME':'WEEK'}</div><h3 style="margin:2px 0">${rv.name?esc(rv.name):`${esc(rv.a.name)} vs ${esc(rv.b.name)}`}</h3><span class="muted">${esc(rv.a.name)} (${rv.a.abbr}) vs ${esc(rv.b.name)} (${rv.b.abbr}) · ${rv.meet} meetings · ${lead}</span></div>
      <div style="text-align:center"><div class="muted" style="font-size:10px;letter-spacing:.1em">HEAT</div><div style="font-family:var(--mono);font-weight:800;font-size:26px;line-height:1;color:${rv.heat>=66?'#ef5b6b':'#e8b341'}">${rv.heat}</div></div></div>
      ${thread.length?`<div style="margin-top:8px;border-top:1px solid var(--line2,#16223a);padding-top:7px">${thread.map(f=>`<div class="muted" style="font-size:12px;margin:3px 0">🗣️ <b>${esc(f.n)}</b>: ${esc(f.txt)}</div>`).join('')}</div>`:''}`;
    return c;
  };
})();
