/* FPS 2026 — engine.js : original football-franchise simulation engine.
   Pure logic over the game state (no DOM). Strong ratings, finances, fans,
   morale, coaches, owners, trades, FA, draft, scouting, expansion/relocation. */
'use strict';
const ENG = (() => {
  const rng = (() => { let s = 1234567; const f = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.seed = n => { s = (n>>>0) || 1234567; }; return f; })();   // mulberry32 — full 2^32 period, no JS precision overflow
  const reseed = n => rng.seed(n);   // call once per new career so every playthrough is its own timeline
  const ri = (a,b)=> a + Math.floor(rng()*(b-a+1));
  const pick = arr => arr[Math.floor(rng()*arr.length)];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const round1=v=>Math.round(v*10)/10;

  const POS_VAL={QB:1.7,WR:1.15,DE:1.12,CB:1.1,T:1.05,S:1.0,RB:0.9,TE:0.9,DT:1.0,OLB:1.0,ILB:0.88,G:0.85,C:0.85,K:0.45,P:0.4,FB:0.5};
  const OFF=new Set(['QB','RB','FB','WR','TE','T','G','C']);
  const DEF=new Set(['DE','DT','OLB','ILB','CB','S']);
  const QUOTA=[['QB',3],['RB',4],['FB',1],['WR',6],['TE',3],['T',5],['G',4],['C',2],['DE',4],['DT',4],['OLB',5],['ILB',4],['CB',5],['S',5],['K',1],['P',1]];
  // ---- authentic FPS Football Pro gameplay vocabulary (from HIKE.EXE OFFFRM/DEFFRM + the manual) ----
  const OFF_FORM=['the I-Formation','the Pro Set','the Shotgun','a Spread set','a Lone Back set','Trips Wing','the I-Slot','a Double Wing','the Near formation','a 3-WR set'];
  const DEF_FORM=['a 4-3','a 3-4','a 4-4','the 46','Nickel','Dime','a 3-5-3','a Flex front'];
  const RUN_PLAY=['HB dive','an off-tackle run','a sweep','a toss','a power run','a counter','a draw','a trap','an iso','a pitch'];
  const ROUTE=['slant','out','curl','post','corner','dig','drag','streak','fade','comeback','hitch','wheel','seam route','flat'];
  const PASS_SET=['','play-action, ','from the pocket, ','on a bootleg, ','off a roll-out, ','quick game, '];
  const DEF_CALL=['man coverage','zone','Cover 2','Cover 3','press man','a corner blitz','a safety blitz','a zone blitz','double coverage'];

  // ---- ratings (FPS-style: built from per-player attributes) ----
  function starters(team){ return team.roster.filter(p=>p.starter); }
  // attribute accessor with graceful fallback to OVR-derived value for players w/o full attrs
  function A(p,key){ const a=p.attrs; let v=(a&&a[key]!=null)?a[key]:clamp(p.ovr-8,20,99);
    if(p._hurt){ v=clamp(Math.round(v*(1-p._hurt.drop)+(p._hurt.hit&&p._hurt.hit[key]||0)),5,99); }   // playing hurt = lower EFFECTIVE attrs for this game only
    if(p._rust>0 && !(p.out>0)){ v=clamp(Math.round(v*(1-Math.min(0.10,p._rust*0.022))),5,99); }      // first games back from a major injury: not himself yet (decays per game played)
    return v; }
  const avail=p=>!(p.out>0)&&!p.ir&&!p.benched;   // injured/IR/benched-for-development players don't count toward ratings/box
  function best(team,pos,n){ return team.roster.filter(p=>p.pos===pos&&avail(p)).sort((a,b)=>b.ovr-a.ovr).slice(0,n); }
  function bestIn(team,arr,n){ return team.roster.filter(p=>arr.includes(p.pos)&&avail(p)).sort((a,b)=>b.ovr-a.ovr).slice(0,n); }
  const mor=p=>0.78+0.22*(p.morale||70)/100;                 // morale multiplier 0.78-1.0
  // weighted average of a per-player formula over the depth chart (morale + depth weighted)
  function weighted(players,fn){ if(!players.length) return 55; let t=0,w=0; players.forEach((p,i)=>{const k=1-i*0.12; t+=fn(p)*mor(p)*k; w+=k;}); return t/w; }
  function ovrAvg(players){ return weighted(players,p=>p.ovr); }
  // FPS ratings are position-relative: a QB's ST is arm strength, IN is reads, etc.
  function passOff(team){
    const qb=best(team,'QB',1)[0], rec=bestIn(team,['WR','TE'],4), ol=bestIn(team,['T','G','C'],5);
    const q = qb? (A(qb,'ST')*0.42 + A(qb,'IN')*0.30 + A(qb,'DI')*0.18 + A(qb,'AC')*0.10)*mor(qb) : 55;
    const r = weighted(rec, p=>A(p,'HA')*0.50 + A(p,'SP')*0.30 + A(p,'AG')*0.20);
    const o = weighted(ol,  p=>A(p,'ST')*0.60 + A(p,'AG')*0.20 + A(p,'IN')*0.20);   // pass protection
    return clamp(q*0.50 + r*0.30 + o*0.20, 40,99);
  }
  function rushOff(team){
    const rb=bestIn(team,['RB','FB'],2), ol=bestIn(team,['T','G','C'],5);
    const r = rb.length? weighted(rb, p=>A(p,'SP')*0.30 + A(p,'AC')*0.25 + A(p,'AG')*0.25 + A(p,'ST')*0.20):55;
    const o = weighted(ol, p=>A(p,'ST')*0.60 + A(p,'AG')*0.25 + A(p,'IN')*0.15);     // run blocking
    return clamp(r*0.50 + o*0.50, 40,99);
  }
  function passDef(team){
    const dl=bestIn(team,['DE','DT','OLB'],4), db=bestIn(team,['CB','S'],4);
    const rush = weighted(dl, p=>A(p,'ST')*0.45 + A(p,'AG')*0.30 + A(p,'AC')*0.25);  // pass rush
    const cov  = weighted(db, p=>A(p,'SP')*0.32 + A(p,'AG')*0.26 + A(p,'IN')*0.22 + A(p,'HA')*0.20);
    return clamp(rush*0.42 + cov*0.58, 40,99);
  }
  function rushDef(team){
    const front=bestIn(team,['DT','DE'],4), lb=bestIn(team,['ILB','OLB'],3);
    const f = weighted(front, p=>A(p,'ST')*0.55 + A(p,'AG')*0.25 + A(p,'DI')*0.20);
    const l = weighted(lb,    p=>A(p,'ST')*0.35 + A(p,'IN')*0.30 + A(p,'AG')*0.20 + A(p,'SP')*0.15);
    return clamp(f*0.50 + l*0.50, 40,99);
  }
  // derived position grade (for display): how good a player is at his core job, 0-99
  function grade(p){ const pos=p.pos;
    const f={ QB:q=>A(q,'ST')*0.42+A(q,'IN')*0.30+A(q,'DI')*0.18+A(q,'AC')*0.10,
      RB:x=>A(x,'SP')*0.3+A(x,'AC')*0.25+A(x,'AG')*0.25+A(x,'ST')*0.2, FB:x=>A(x,'ST')*0.5+A(x,'SP')*0.25+A(x,'HA')*0.25,
      WR:x=>A(x,'HA')*0.45+A(x,'SP')*0.3+A(x,'AG')*0.25, TE:x=>A(x,'HA')*0.4+A(x,'ST')*0.35+A(x,'SP')*0.25,
      T:x=>A(x,'ST')*0.6+A(x,'AG')*0.2+A(x,'IN')*0.2, G:x=>A(x,'ST')*0.6+A(x,'AG')*0.2+A(x,'IN')*0.2, C:x=>A(x,'ST')*0.55+A(x,'IN')*0.25+A(x,'AG')*0.2,
      DE:x=>A(x,'ST')*0.45+A(x,'AG')*0.3+A(x,'AC')*0.25, DT:x=>A(x,'ST')*0.6+A(x,'AG')*0.25+A(x,'AC')*0.15,
      OLB:x=>A(x,'ST')*0.3+A(x,'SP')*0.25+A(x,'AG')*0.25+A(x,'IN')*0.2, ILB:x=>A(x,'ST')*0.3+A(x,'IN')*0.35+A(x,'AG')*0.2+A(x,'SP')*0.15,
      CB:x=>A(x,'SP')*0.35+A(x,'AG')*0.25+A(x,'HA')*0.2+A(x,'IN')*0.2, S:x=>A(x,'SP')*0.3+A(x,'IN')*0.25+A(x,'AG')*0.2+A(x,'HA')*0.25,
      K:x=>A(x,'ST')*0.6+A(x,'DI')*0.4, P:x=>A(x,'ST')*0.6+A(x,'DI')*0.4 }[pos];
    return f?Math.round(clamp(f(p),25,99)):p.ovr; }
  // back-compat unit rating (now attribute-blended)
  function unitRtg(team, posSet){
    if(posSet===OFF) return (passOff(team)*0.58 + rushOff(team)*0.42);
    if(posSet===DEF) return (passDef(team)*0.58 + rushDef(team)*0.42);
    const s=team.roster.filter(p=>posSet.has(p.pos)).sort((a,b)=>b.ovr-a.ovr); return s.length?ovrAvg(s.slice(0,13)):60;
  }
  function teamOff(team){ const c=team.coach?(team.coach.off-70)*0.12:0; const oc=team.staff?(team.staff.oc.ovr-70)*0.06:0; return clamp(unitRtg(team,OFF)+c+oc,40,99); }
  function teamDef(team){ const c=team.coach?(team.coach.def-70)*0.12:0; const dc=team.staff?(team.staff.dc.ovr-70)*0.06:0; return clamp(unitRtg(team,DEF)+c+dc,40,99); }
  function teamOvr(team){ const hc=team.coach?(team.coach.ovr-70)*0.08:0; return round1(clamp((teamOff(team)+teamDef(team))/2+hc,40,99)); }

  // ---- awards engine (replicates AWARDS.INI scoring: Player of Game/Week, MVP, All-Pro, HoF) ----
  const POSGRP=pos=>({QB:'QB',RB:'RB',FB:'RB',WR:'WR',TE:'WR',T:'OL',G:'OL',C:'OL',DE:'DL',DT:'DL',OLB:'LB',ILB:'LB',CB:'DB',S:'DB',K:'K',P:'P'}[pos]||'OL');
  const stepPts=(v,thr,s)=>Math.max(0,(v-thr)/s);
  function awardScore(pos, st){   // points for one game's line (AWARDS.INI defaults)
    st=st||{}; const g=POSGRP(pos);
    const pyd=st.pyd||0,ptd=st.ptd||0,int=st.intp||0,ryd=st.ryd||0,rtd=st.rtd||0,recy=st.recyd||0,rectd=st.rectd||0,sack=st.sack||0,intc=st.intc||0,tkl=st.tkl||0;
    let pt=0;
    if(g==='QB')      pt = 5 + stepPts(pyd,150,10)*1 + ptd*12 + rtd*10 - int*15;
    else if(g==='RB') pt = 5 + stepPts(ryd,0,10)*1 + rtd*10 + stepPts(recy,0,10)*1 + rectd*10;
    else if(g==='WR') pt = 5 + stepPts(recy,0,15)*1 + rectd*12;
    else if(g==='DL') pt = 5 + sack*10 + tkl*1 + intc*15;
    else if(g==='LB') pt = 5 + sack*10 + tkl*1 + intc*15;
    else if(g==='DB') pt = 15 + sack*10 + tkl*3 + intc*18;
    else              pt = 5;
    return Math.round(pt);
  }
  // ---- game sim (phase matchups: pass O vs pass D, rush O vs rush D) ----
  function simGame(home, away, rules){
    rules = rules||{};
    const qLen = rules.quarter||15;            // 10/12/15 min quarters scale scoring
    const qScale = qLen/15;
    const twoPt = rules.twoPoint!==false;
    // home field: base + a real crowd boost (fan morale + stadium quality), minus the visitors' road tax.
    // neutral sites (international games, the title game) wash out home-field entirely.
    const HFA = rules.neutral ? 0 : (1.5 + (home.fans?(home.fans.morale-60)/26:0) + ((home.stadium?home.stadium.quality:60)-60)/55);
    const fatH=(home._fatigue||0), fatA=(away._fatigue||0);   // worn-down teams sag late in the year; off a bye = fresh
    const base=18.4;
    const hc=home.coach?(home.coach.off-70)*0.12:0, ac=away.coach?(away.coach.off-70)*0.12:0;
    const hdc=home.coach?(home.coach.def-70)*0.12:0, adc=away.coach?(away.coach.def-70)*0.12:0;
    // expected points from facet matchups, then realized as TDs + FGs + XP/2pt.
    // edge kept strong (favorites still win), but per-game variance is WIDE so blowouts AND defensive slugfests both happen.
    function scoreFor(o,d,oc,dc,boost){
      const passEdge=(o.pass+oc)-(d.passD+dc), rushEdge=(o.rush+oc)-(d.rushD+dc);
      const noise=(rng()-0.5)*18 + (rng()-0.5)*18;   // two-roll spread: realistic bell with fat-enough tails for blowouts & shutouts
      let exp = base + (passEdge*0.6+rushEdge*0.4)*0.82 + boost + noise;
      exp = clamp(exp,0,58)*qScale;
      let tds = Math.max(0, Math.round((exp-3)/7.0 + (rng()-0.5)));
      let fgs = clamp(Math.round((exp - tds*7)/3 + (rng()-0.4)),0,5);
      let pts=0, two=0;
      for(let i=0;i<tds;i++){ pts+=6;
        if(twoPt && rng()<0.16){ if(rng()<0.5){ pts+=2; two++; } }   // 2pt try, ~50% good
        else pts+=1; }                                              // XP good
      pts += fgs*3;
      return {pts:clamp(pts,0,62), tds, fgs, two};
    }
    const ho={pass:passOff(home),rush:rushOff(home)}, ao={pass:passOff(away),rush:rushOff(away)};
    const hd={passD:passDef(home),rushD:rushDef(home)}, ad={passD:passDef(away),rushD:rushDef(away)};
    // difficulty: a point swing for/against the USER's team only (AI-vs-AI games untouched)
    const uAb=rules.userAbbr, ue=rules.userEdge||0;
    const hEdge=uAb?(home.abbr===uAb?ue:(away.abbr===uAb?-ue:0)):0, aEdge=uAb?(away.abbr===uAb?ue:(home.abbr===uAb?-ue:0)):0;
    const hDyn=(home._dynasty||0)*2.6, aDyn=(away._dynasty||0)*2.6;   // DYNASTY EDGE: a great, stable system wins the margins (0 for fresh teams → calibration untouched)
    let H=scoreFor(ho,ad,hc,adc,HFA-fatH+hEdge+hDyn), Aw=scoreFor(ao,hd,ac,hdc,-fatA+aEdge+aDyn);
    let hs=H.pts, as=Aw.pts, ot=false;
    if(hs===as){ ot=true; const w=rng()<0.5?'h':'a'; const fin = rng()<0.4?6:3; if(w==='h')hs+=fin; else as+=fin; } // OT
    const box=boxScore(home,away,hs,as);
    // Player of the Game: highest award score across both rosters (winners weighted slightly)
    const winAb = hs>=as?home.abbr:away.abbr;
    const lines=[...box.home.lines.map(l=>({...l,team:home.abbr})),...box.away.lines.map(l=>({...l,team:away.abbr}))];
    lines.forEach(l=>{ l.aw=awardScore(l.pos,l) + (l.team===winAb?6:0); });
    const potg=lines.slice().sort((a,b)=>b.aw-a.aw)[0]||null;
    return {home:home.abbr, away:away.abbr, hs, as, ot, box, lines,
      potg: potg?{id:potg.id,name:potg.name,team:potg.team,pos:potg.pos,stat:potg.stat,aw:potg.aw}:null,
      units:{home:{...ho,...hd},away:{...ao,...ad}} };
  }
  // ---- injuries (per game): risk scales with WEAR + usage + low endurance; severe + career-ending tiers ----
  const HIGH_CONTACT=new Set(['RB','WR','TE','CB','S','DE','DT','OLB','ILB','FB']);
  const INJ_BODY={
    soft:['hamstring','groin','calf','quad','shoulder'],
    joint:['ankle','knee','wrist','elbow'],
    trench:['knee','back','neck','ankle'],
    severe:['ACL','Achilles','fractured ankle','torn pec','neck']
  };
  function injuryBody(p, conc, severe){
    if(conc) return 'head';
    if(severe){
      // real-world major mix: ACL is the most common season-ender (~2 per team-season), Achilles
      // skews to age 27+ (and spiked league-wide on turf), torn pec lives in the trenches
      const trench=['T','G','C','DT','DE'].includes(p.pos);
      const rows=[['ACL',10],['Achilles',(p.age>=27?6:3)],['fractured ankle',4],['torn pec',trench?4:1.5],['neck',1.5]];
      let s=rows.reduce((a,r)=>a+r[1],0), roll=rng()*s;
      for(const r of rows){ roll-=r[1]; if(roll<=0) return r[0]; }
      return 'ACL';
    }
    if(['T','G','C','DT','DE'].includes(p.pos)) return pick(INJ_BODY.trench);
    if(['WR','CB','S','RB'].includes(p.pos)) return rng()<0.55?pick(INJ_BODY.soft):pick(INJ_BODY.joint);
    return rng()<0.5?pick(INJ_BODY.soft):pick(INJ_BODY.joint);
  }
  // per-player durability (mirrors app.js ensureDurability): endurance + a stable per-player roll − age
  function durabilityOf(p){ if(p.durability!=null) return p.durability;
    const en=(p.attrs&&p.attrs.EN)||62; let d=50+(en-62)*0.7+((((p.id||1)*2654435761)>>>0)%25-12); d-=Math.max(0,((p.age||25)-30))*1.4;
    p.durability=clamp(Math.round(d),12,95); return p.durability; }
  function gameInjuries(home, away, rules){
    rules=rules||{}; if(rules.injuries===false) return [];
    const wkLeft=rules.weeksLeft||10; const out=[];
    [home,away].forEach(team=>{
      team.roster.forEach(p=>{ if(p.out>0||p.ir) return;
        const load=clamp(p._gameUsageRisk||0,0,3);
        const dur=(100-A(p,'EN'))/100, wear=(p.wear||0)/100, usage=(HIGH_CONTACT.has(p.pos)?1.12:0.72)*(1+load*0.28), agi=(p.age>=31?1.10:1);
        const freqM=clamp(0.45+(rules.injFreq==null?50:rules.injFreq)/100*1.1,0.2,1.8);   // injury-frequency slider (50=default 1.0)
        const sevM=0.55+(rules.injSev==null?50:rules.injSev)/100*0.9;                       // injury-severity slider (50=default 1.0)
        // durability tier (Ironman ↔ Glass) + the post-major re-injury window scale personal risk —
        // real pattern: soft-tissue recurrence ~30%, prior-ACL players re-injure at ~2× for ~2 years
        const durF=clamp(1.35-durabilityOf(p)/100*0.8,0.7,1.35);
        const reinjF=(p._reinjury&&p._reinjury.mult)||1;
        const risk=(0.0058 + dur*0.0118 + wear*0.0155)*usage*agi*freqM*durF*reinjF*(team._injMod||1);   // calibrated vs real games-missed data (Career Lab: ~13/team-season with ~0.8 season-enders); turf + training facility still reduce soft-tissue risk, and the Rules injury-frequency slider still scales on top
        if(rng() < risk){ const conc=rng()<0.15; const sev=rng()/sevM;   // higher severity pushes more into the worse tiers + longer
          let wks, reason='injury', career=false, severe=false;
          if(sev<0.005 && (p.age>=32 || (p.concussions||0)>=3)){ career=true; reason='career-ending injury'; wks=99; }
          else if(sev<0.055){ severe=true; wks=Math.max(8, wkLeft); reason='major injury — out for the season'; }
          else if(conc){ wks=Math.round(ri(1,4)*sevM); reason='concussion'; }
          else { wks=Math.max(1,Math.round(ri(1,6)*sevM)); reason='injury'; }
          const body=injuryBody(p,conc,severe||career);
          p.out=wks; p.outReason=conc?'concussion':reason; if(conc)p.concussions=(p.concussions||0)+1;
          out.push({team:team.abbr,id:p.id,name:p.name,pos:p.pos,ovr:p.ovr,weeks:wks,concussion:conc,severe,career,reason,body,usageLoad:round1(load),wear:Math.round(p.wear||0)}); }
      });
    });
    return out;
  }

  // ---- the "brain": persistent player loyalty + motivation + off-field life ----
  function ensureBrain(p){
    if(p.loyalty==null) p.loyalty=clamp(58 + (A(p,'DI')-70)*0.25 + ri(-8,8), 25, 92);
    if(!p.arc) p.arc=[];
    if(!p.flags) p.flags={};
  }
  function disposition(p){
    const l=p.loyalty==null?60:p.loyalty;
    if(p.flags&&p.flags.wantsOut) return 'wants out';
    if(l>=74) return 'loyal'; if(l>=56) return 'content'; if(l>=38) return 'restless'; return 'wants out';
  }
  const START_N={QB:1,RB:1,FB:1,WR:3,TE:1,T:2,G:2,C:1,DE:2,DT:2,OLB:2,ILB:2,CB:2,S:2,K:1,P:1};
  // recompute every player's loyalty from their lived situation (wins, role, pay, morale, age)
  function updateMotivation(t){
    const gp=t.wins+t.losses, winp=gp?t.wins/gp:0.5;
    t.roster.forEach(p=>{ ensureBrain(p);
      const peers=t.roster.filter(x=>x.pos===p.pos).sort((a,b)=>b.ovr-a.ovr), rank=peers.indexOf(p);
      let d=0;
      d += (winp-0.5)*1.4;                                   // winning binds, losing erodes
      d += rank < (START_N[p.pos]||2) ? 0.3 : -0.2;          // playing vs buried (gentle)
      if(p.ovr>=82 && rank>0) d-=0.8;                        // a star who isn't starting
      const expSal=Math.max(1, playerValue(p)/9);            // rough market value
      if(p.ovr>=80 && p.salary < expSal*0.60) d-=0.6;        // underpaid star
      d += ((p.morale||70)-68)/70;
      const base=60 + (A(p,'DI')-70)*0.2 + (p.age>=33?3:0);  // personal contentment baseline
      p.loyalty = clamp((p.loyalty||60) + (base-(p.loyalty||60))*0.045 + d, 0, 100);  // mean-revert + drift
    });
  }
  // off-field life: PEDs, arrests, substance programs, serious incidents (discipline lowers risk)
  function offField(teams){
    const cands=[];
    teams.forEach(t=>t.roster.forEach(p=>{ ensureBrain(p); if(p.out>0) return;
      const risk=(100-A(p,'DI'))/100, r=rng();
      if(r < 0.00007+risk*0.00022) cands.push({p,t,tag:'SUSPENSION',reason:'suspended',games:ri(2,6),dL:-7,dM:-12,
        txt:`${p.name} (${p.pos}, ${t.city}) is suspended {G} games for violating the league's performance-enhancing substance policy.`});
      else if(r < 0.00042+risk*0.00065){ const k=pick(['arrested on a DUI charge','jailed after a nightclub altercation','named in an assault complaint','arrested on a weapons charge','detained in a domestic dispute']);
        cands.push({p,t,tag:'LEGAL',reason:'legal',games:ri(1,4),dL:-5,dM:-11,txt:`${p.name} (${p.pos}, ${t.city}) was ${k}; he is away from the team pending the league's review.`}); }
      else if(r < 0.00060+risk*0.00025) cands.push({p,t,tag:'INCIDENT',reason:'personal',games:ri(3,8),dL:-2,dM:-8,
        txt:`${p.name} (${p.pos}, ${t.city}) has entered the league's substance-abuse program and will step away from football.`});
      else if(r < 0.00005) cands.push({p,t,tag:'INCIDENT',reason:'incident',games:ri(6,15),dL:0,dM:-5,grave:true,
        txt:`${t.city} confirm ${p.name} (${p.pos}) is hospitalized after being wounded in an off-field shooting. He is expected to recover but will miss significant time; the club asks for privacy.`});
    }));
    for(let i=cands.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [cands[i],cands[j]]=[cands[j],cands[i]]; }
    const maxKeep = rng()<0.58 ? 0 : (rng()<0.92 ? 1 : 2);
    const keep=cands.slice(0, maxKeep);
    keep.forEach(e=>{ const p=e.p; p.out=Math.max(p.out||0,e.games); p.outReason=e.reason;
      p.loyalty=clamp((p.loyalty||60)+e.dL,0,100); p.morale=clamp((p.morale||70)+e.dM,5,99);
      if(e.reason==='legal'||e.reason==='suspended') p.troubled=(p.troubled||0)+1;   // off-field trouble -> tends to get worse
      e.txt=e.txt.replace('{G}',e.games); });
    return keep;
  }

  // ---- coaching staff (coordinators + position coaches) + player development ----
  const CF=['Mike','Dan','Sean','Pete','Andy','Nick','Wade','Vic','Joe','Ron','Brian','Kyle','Matt','Doug','Frank','Lou','Raheem','Zac'];
  const CL=['Carter','Walsh','Doyle','Vance','Quinn','Pace','Reed','Frost','Bowen','Hale','Stokes','Mills','Vega','Cobb','Royce','Mara','Dunn','Knox'];
  function coachName(){ return pick(CF)+' '+pick(CL); }
  // injury types: band, week range [lo,hi], attr hits while playing hurt, noPlay (no gut-it-out), base weight
  const INJ_TYPES={
    hamstring:{label:'Hamstring',band:'WK',wk:[1,3],hit:{SP:-10,AC:-12,AG:-6},w:14},
    groin:{label:'Groin',band:'WK',wk:[1,3],hit:{SP:-8,AC:-8,AG:-7},w:8},
    hi_ankle:{label:'High-ankle sprain',band:'MULTI',wk:[3,6],hit:{SP:-10,AC:-9,AG:-11},w:9},
    ankle:{label:'Ankle sprain',band:'WK',wk:[1,3],hit:{SP:-7,AG:-8,AC:-5},w:12},
    knee_mcl:{label:'MCL sprain',band:'MULTI',wk:[3,6],hit:{SP:-9,AG:-12,ST:-5},w:7},
    turf_toe:{label:'Turf toe',band:'WK',wk:[1,3],hit:{AC:-9,AG:-7,SP:-5},w:5},
    shoulder:{label:'Shoulder (AC)',band:'WK',wk:[1,3],hit:{ST:-10,HA:-7},w:9},
    hand:{label:'Hand/finger',band:'DTD',wk:[0,1],hit:{HA:-12},w:8},
    ribs:{label:'Ribs',band:'WK',wk:[1,3],hit:{ST:-8,EN:-10,AG:-5},w:7},
    back:{label:'Back spasm',band:'WK',wk:[1,3],hit:{ST:-7,AG:-7,EN:-7},w:5},
    quad:{label:'Quad/calf',band:'WK',wk:[1,2],hit:{SP:-8,AC:-7},w:6},
    concussion:{label:'Concussion',band:'WK',wk:[1,3],hit:{},noPlay:true,w:6},
    knee_acl:{label:'Torn ACL',band:'SEASON',wk:[8,18],hit:{},noPlay:true,w:3},
    achilles:{label:'Torn Achilles',band:'SEASON',wk:[8,18],hit:{},noPlay:true,w:2} };
  function injClass(pos){ return ({QB:'qb',RB:'rb',FB:'rb',WR:'skill',TE:'skill',T:'line',G:'line',C:'line',DT:'line',DE:'line',NT:'line',OLB:'lb',ILB:'lb',LB:'lb',CB:'db',S:'db',FS:'db',SS:'db',K:'spec',P:'spec'})[pos]||'skill'; }
  const INJ_CLASSW={ hamstring:{rb:1.4,skill:1.6,db:1.5,line:0.5,qb:0.6}, knee_acl:{rb:1.4,line:1.6,db:1.1,qb:0.7,skill:1.0}, shoulder:{qb:1.5,line:1.2,rb:1.1}, concussion:{qb:1.3,lb:1.3,db:1.2,skill:1.2,line:0.9}, hi_ankle:{line:1.5,rb:1.3,skill:1.2}, ankle:{line:1.4,rb:1.2}, knee_mcl:{rb:1.4,line:1.6,lb:1.2}, hand:{qb:1.2,skill:1.3,db:1.2}, ribs:{qb:1.4}, achilles:{rb:1.2} };
  function pickInjType(pos){ const cls=injClass(pos); const rows=Object.keys(INJ_TYPES).map(k=>({k,w:INJ_TYPES[k].w*((INJ_CLASSW[k]&&INJ_CLASSW[k][cls])||1)})); let sum=rows.reduce((a,r)=>a+r.w,0)||1, roll=rng()*sum; for(const r of rows){ roll-=r.w; if(roll<=0) return r.k; } return 'ankle'; }
  function ensureStaff(t){ if(t.staff){ if(!t.staff.med) t.staff.med={name:coachName(),ovr:ri(56,84)}; if(!t.staff.scout) t.staff.scout={name:coachName(),ovr:ri(56,86)}; return; }
    const mk=(lo,hi)=>({name:coachName(),ovr:ri(lo,hi)});
    t.staff={oc:mk(60,88),dc:mk(60,88),qb:mk(56,84),rb:mk(56,82),wr:mk(56,82),ol:mk(56,82),dl:mk(56,82),lb:mk(56,82),db:mk(56,82),med:mk(56,84),scout:mk(56,86)};
  }
  const POS_COACH={QB:'qb',RB:'rb',FB:'rb',WR:'wr',TE:'wr',T:'ol',G:'ol',C:'ol',DE:'dl',DT:'dl',OLB:'lb',ILB:'lb',CB:'db',S:'db',K:'qb',P:'qb'};
  const DEV_ATTRS={QB:['ST','IN','DI'],RB:['SP','AC','AG'],FB:['ST','SP'],WR:['HA','SP','AG'],TE:['HA','ST'],T:['ST','AG'],G:['ST','AG'],C:['ST','IN'],DE:['ST','AG'],DT:['ST','AG'],OLB:['SP','ST','IN'],ILB:['ST','IN'],CB:['SP','AG','HA'],S:['SP','IN','HA'],K:['ST','DI'],P:['ST','DI']};
  function posCoach(t,pos){ ensureStaff(t); const c=t.staff[POS_COACH[pos]||'qb']; return c?c.ovr:68; }
  // every player carries hidden intangibles that drive their arc — work ethic + temperament (poise under pressure)
  function ensureTraits(p){
    if(p.workEthic==null){ const a=p.attrs||{}; p.workEthic=clamp((a.DI||62)*0.7 + (a.IN||60)*0.3 + ri(-12,12),20,99); }
    if(p.temperament==null){ const a=p.attrs||{}; p.temperament=clamp((a.IN||60)*0.5 + (a.DI||62)*0.4 + ri(-14,14),15,99); }
    return p;
  }
  // POSITION AGE CURVES — grounded in NFL aging studies (nflfastR / PFF play-level aging work):
  // RBs and CBs peak earliest and fall hardest (the real "RB cliff" at ~27-28), WRs/EDGE peak
  // mid-20s, the trenches hold to ~31, QBs plateau deep into their 30s, specialists last longest.
  //   dev = last age of the growth window · prime = last age of the plateau · rate = decline steepness
  const AGE_CURVE={ QB:{dev:26,prime:33,rate:0.9}, RB:{dev:24,prime:26,rate:1.8}, FB:{dev:24,prime:27,rate:1.3},
    WR:{dev:25,prime:28,rate:1.25}, TE:{dev:26,prime:29,rate:1.1},
    T:{dev:26,prime:31,rate:1.0}, G:{dev:26,prime:31,rate:1.0}, C:{dev:26,prime:32,rate:0.95},
    DE:{dev:25,prime:28,rate:1.2}, DT:{dev:25,prime:29,rate:1.1}, OLB:{dev:25,prime:28,rate:1.2}, ILB:{dev:24,prime:28,rate:1.3},
    CB:{dev:24,prime:27,rate:1.5}, S:{dev:25,prime:28,rate:1.2}, K:{dev:27,prime:37,rate:0.7}, P:{dev:27,prime:37,rate:0.7} };
  function ageCurve(pos){ return AGE_CURVE[pos]||{dev:25,prime:29,rate:1.1}; }
  // offseason development — NEURAL: NN.dev maps age/room/work-ethic/coaching/role/market-PRESSURE -> growth or decline.
  // This is where prospects boom, bust, or crack under big-market spotlight.
  function develop(p,t,rules){
    ensureStaff(t); ensureTraits(p); rules=rules||{};
    const pc=posCoach(t,p.pos), coachF=clamp((pc-58)/40,0,1);
    const pot = p.pot!=null ? p.pot : (p.pot = clamp(p.ovr + ri(-2,10) - Math.floor((p.age-22)*0.7), 50, 99));
    const a=p.attrs||{};
    const curve=ageCurve(p.pos);
    const young = p.age<=curve.dev || (p.lateBloom && p.age<=curve.dev+4);   // late bloomers (the Brady arc) keep climbing past the normal window
    // THE SYSTEM (Walsh/Belichick): an elite, STABLE coaching staff develops players beyond their grade.
    const cc=t.coach||{};
    const sysF = clamp(((cc.ovr||70)-78)/18,0,1) * clamp(((cc.szns||0)-2)/5,0,1);   // quality × tenure (0 for fresh/churned staffs)
    const effPot = clamp(pot + Math.round(sysF*4), pot, 99);                         // the system raises the effective ceiling
    // PRESSURE: big-market team × a player who can't handle the spotlight (low temperament), worst when young/early-career
    const market=clamp(((t.market||50)-38)/40,0,1);
    const press = clamp(market*(1-p.temperament/99)*(young?1.0:0.45),0,1);
    let signal=0.5;
    if(typeof NN!=='undefined' && NN.dev){
      signal=NN.dev([ clamp((p.age-21)/20,0,1), p.ovr/99, clamp((pot-p.ovr)/30,0,1),
        p.workEthic/99, (a.EN||62)/99, (a.IN||60)/99, coachF, p.starter?1:0.45, press ]);
    } else { signal = p.age<=24?0.66:p.age<=28?0.52:p.age<=31?0.46:0.32; }
    // map signal (0..1, .5=neutral) to a rating delta (+growth / -decline), with a little career noise
    let d = Math.round((signal-0.5)*12) + ri(-1,1);
    // SOPHOMORE SLUMP — a rookie who seized a starting job regresses about a third of the time
    // (the real Y2 pattern: the league adjusts, the film catches up); makeup fights it off, and
    // top-2-round picks slump less (they're closer to their true talent than a Day-3 surprise).
    let slump=false;
    const slumpCand=(p.seasons||0)===1 && p.draftGrade!=null && !!p.starter;
    if(slumpCand){
      const slumpP=clamp(0.34-(p.workEthic-60)/220-(p.temperament-60)/320-((p.draftRound||4)<=2?0.08:0),0.08,0.50);
      if(rng()<slumpP){ slump=true; d=Math.min(d,0)-ri(1,3); p._sophSlump=true; }
    }
    // SECOND-YEAR LEAP — the biggest average improvement of any career transition (real NFL pattern):
    // a rookie season of real exposure converts to growth, more so for starters who put in the work.
    if(!slump && (p.seasons||0)===1 && p.ovr<effPot){ d += 1 + ((p.starter||(p._reps||0)>=6) ? ri(0,2) : 0) + (p.workEthic>=70?ri(0,1):0); }
    // hidden bust/boom: a high bustRisk drags growth; surviving early years near ceiling unlocks the rest
    if(p.bustRisk){ d -= (p.bustRisk>0.6 && young ? ri(1,3) : p.bustRisk>0.4 && young ? ri(0,2) : 0); }
    // BUST COLLAPSE — the real bust pattern isn't a slow fade, it's a flame-out: a risky early pick
    // who hasn't outgrown his draft grade loses the league's benefit of the doubt (and his job) fast.
    // Calibrated so ~20-30% of first-rounders genuinely fail by year 3 (the real R1 bust rate) —
    // this is what makes drafting bad makeup actually COST something and scouting worth paying for.
    if(young && (p.bustRisk||0)>0.45 && (p.seasons||0)>=1 && (p.seasons||0)<=4
       && p.draftGrade!=null && p.ovr<=p.draftGrade+4 && rng()<0.40){ d -= ri(2,5); p._bustDrop=true; }
    d -= (p.troubled?Math.min(2,p.troubled):0);
    if(p.concussions>=2 && p.age>=30) d-=1;
    // INJURY SCARS — accumulated major injuries (ACL/Achilles class) erode development and steepen
    // decline once past the growth window (players with multiple majors age visibly faster).
    if((p._scars||0)>0 && p.age>curve.dev) d -= Math.min(2, Math.ceil(p._scars*0.5));
    // POSITIONAL AGING — decline scales with how far past the positional prime he is
    if(p.age>curve.prime) d -= Math.min(5, Math.ceil((p.age-curve.prime)*0.6*curve.rate));
    if(p.ovr>=effPot && p.age>curve.dev-1) d=Math.min(d,0);    // can't exceed (system-raised) ceiling once aging
    if(young && p.ovr<effPot && d<0 && p.workEthic>70 && press<0.3 && !slump) d=Math.max(d,-1);  // grinders rarely crater young
    const facF=clamp((t.stadium&&t.stadium.upgrades&&t.stadium.upgrades.training||0)/3,0,1);   // training-facility tier (0..1)
    if(young && p.ovr<effPot && p.workEthic>=52) d+=1 + (facF>=0.66 && rng()<facF ? 1 : 0);   // young talent rises reliably; a top training facility gives an extra dev edge
    if(p.age<=curve.prime+2 && p.age>=29 && p.ovr>=82) d=Math.max(d,-2);  // stars age gracefully WITHIN their positional window (no artificial RB immortality)
    if(young && p.ovr<effPot && p.workEthic>=58 && (p.bustRisk||0)<0.6){ d += Math.min(3, Math.floor((effPot-p.ovr)/7)); }   // blue-chips with the makeup climb to their ceiling → homegrown stars
    if(sysF>0.45 && young && p.ovr<effPot) d+=1;               // the system accelerates the development of its young players
    if(sysF>0.55 && young && p.ovr>=pot-1 && p.ovr<99 && rng()<0.16) p.pot=clamp(p.pot+1,50,99);   // the system unlocks another level — permanently (a star is made)
    d = d>=0 ? Math.round(d*(rules.devSpeed||1)) : Math.round(d*(rules.ageSpeed||1));   // progression-speed dials
    d=clamp(d,-9,10);
    p.ovr=clamp(p.ovr+d,40,99);
    if(p.attrs){ const dom=DEV_ATTRS[p.pos]||['ST','IN']; dom.forEach(k=>{ if(p.attrs[k]!=null) p.attrs[k]=clamp(p.attrs[k]+d,25,99); }); p.attrs.OVR=p.ovr; }
    if(p._reinjury && --p._reinjury.seasons<=0) delete p._reinjury;   // the elevated re-injury window closes with time
    p._lastDev=d; p._lastPress=press;                          // surfaced by the franchise UI / crack events
    // CAREER LAB instrumentation (calibration harness only — window.LAB is never set in normal play)
    if(typeof window!=='undefined' && window.LAB && window.LAB.dev){
      window.LAB.dev.push({seasons:p.seasons||0,pos:p.pos,age:p.age,ovr:p.ovr,d,slump:!!p._sophSlump,cand:slumpCand,bustDrop:!!p._bustDrop});
    }
    return d;
  }
  // a player's effective retirement age drops with accumulated concussions (CTE / early exits)
  // a player's effective retirement horizon: positional (RBs walk away years before QBs/kickers),
  // shortened by accumulated concussions and by major-injury scars (bodies give out early)
  function retireAge(p){ const c=ageCurve(p.pos);
    return clamp(c.prime+7 - Math.min(5,(p.concussions||0)) - Math.min(3,(p._scars||0)), 27, 43); }

  // ---- play-by-play: a drive-by-drive account consistent with the final score ----
  function decompose(pts){ // -> scoring values; safeties are rare, not arithmetic glue for normal scores
    const solve=vals=>{
      const dp=Array(pts+1).fill(null); dp[0]=[];
      for(let p=1;p<=pts;p++) vals.forEach(v=>{ if(p>=v&&dp[p-v]){
        const cand=dp[p-v].concat(v);
        if(!dp[p] || cand.length<dp[p].length || (cand.length===dp[p].length&&rng()<0.35)) dp[p]=cand;
      } });
      return dp[pts];
    };
    let out=solve([8,7,6,3]) || solve([8,7,6,3,2]) || [];
    for(let i=out.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
    return out;
  }
  function gPlayers(box){
    const L=box.lines;
    return { qb:L.find(l=>l.pos==='QB'), rbs:L.filter(l=>l.pos==='RB'||l.pos==='FB'),
      recs:L.filter(l=>['WR','TE'].includes(l.pos)), edge:L.find(l=>l.sack), db:L.find(l=>l.intc) };
  }
  function playByPlay(home, away, r){
    const teams={
      [home.abbr]:{p:gPlayers(r.box.home),nick:home.nick,oppBox:r.box.away,oppNick:away.nick},
      [away.abbr]:{p:gPlayers(r.box.away),nick:away.nick,oppBox:r.box.home,oppNick:home.nick} };
    function outcomes(score){               // every scoring value IS realized -> PBP sums to final
      const sc=decompose(score).map(v=>({result:v>=6?'TD':v===3?'FG':'SAF',pts:v,two:v===8}));
      const fill=[]; const n=ri(4,7); for(let i=0;i<n;i++){ const x=rng(); fill.push({result:x<0.5?'PUNT':x<0.7?'INT':x<0.85?'FUMBLE':'DOWNS',pts:0}); }
      const all=sc.concat(fill); for(let i=all.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; }
      return all;
    }
    const q1=outcomes(r.hs), q2=outcomes(r.as); const seq=[];
    while(q1.length||q2.length){ if(q1.length)seq.push([home.abbr,q1.shift()]); if(q2.length)seq.push([away.abbr,q2.shift()]); }
    const perQ=Math.max(1,Math.ceil(seq.length/4)); let H=0,Aw=0; const drives=[];
    seq.forEach(([tm,oc],idx)=>{
      const T=teams[tm], qb=T.p.qb, oppD=gPlayers(T.oppBox);
      const QB=qb?qb.name:'QB';
      const rb=()=>T.p.rbs.length?pick(T.p.rbs).name:'the back';
      const rec=()=>T.p.recs.length?pick(T.p.recs).name:'his man';
      let yl=ri(20,30); const plays=[];
      const form=pick(OFF_FORM); plays.push(`<i>${T.nick} line up in ${form}${rng()<0.4?` against ${pick(DEF_FORM)}`:''}.</i>`);
      const nplays=oc.pts?ri(4,8):ri(3,6);
      for(let k=0;k<nplays-1;k++){
        const pass=rng()<0.56; let gain;
        if(pass){
          const r=rng();
          if(r<0.64){ gain=ri(3,20); plays.push(`${QB} ${pick(PASS_SET)}hits ${rec()} on a ${pick(ROUTE)} for ${gain}.`); }
          else if(r<0.72){ gain=ri(2,10); plays.push(`${rb()} on a ${pick(['screen','swing','checkdown','dump-off'])} for ${gain}.`); }
          else if(r<0.86){ gain=0; plays.push(`${QB} ${pick(PASS_SET)}incomplete${oppD.db&&rng()<0.4?` — broken up by ${oppD.db.name}`:` for ${rec()}`} on a ${pick(ROUTE)}.`); }
          else if(r<0.93){ gain=ri(4,14); plays.push(`${QB} feels the rush, scrambles for ${gain}.`); }
          else { gain=-ri(5,9); plays.push(`${pick(DEF_CALL)} gets home — ${QB} sacked for ${gain}${oppD.edge?` by ${oppD.edge.name}`:''}.`); }
        } else {
          gain=ri(-2,13); const rp=pick(RUN_PLAY);
          plays.push(`${rb()} on ${rp}${gain<0?` — stuffed for ${gain}`:gain>=12?` — breaks it for ${gain}!`:` for ${gain}`}.`);
        }
        yl=clamp(yl+gain,1,99);
      }
      if(oc.result==='TD'){ const td=ri(2,18);
        plays.push(`<b>TOUCHDOWN</b> — ${rng()<0.5&&qb?`${qb.name} ${td}-yd TD pass to ${rec()} on a ${pick(['fade','slant','post','corner','seam route','out'])}`:`${rb()} ${td}-yd TD on ${pick(RUN_PLAY)}`}.${oc.two?' Two-point conversion is GOOD!':''}`); }
      else if(oc.result==='FG'){ plays.push(`<b>FIELD GOAL</b> — ${ri(24,52)} yards, GOOD.`); }
      else if(oc.result==='SAF'){ plays.push(`<b>SAFETY</b> — ${pick(DEF_CALL)}, ${QB} dropped in the end zone.`); }
      else if(oc.result==='INT'){ plays.push(`<b>INTERCEPTED</b>${oppD.db?` by ${oppD.db.name}`:''} in ${pick(['zone','man coverage','Cover 2'])}!`); }
      else if(oc.result==='FUMBLE'){ plays.push(`<b>FUMBLE</b> — ${pick(['stripped','jarred loose','coughs it up'])}, ${T.oppNick} recover.`); }
      else if(oc.result==='DOWNS'){ plays.push(`Stopped short — turnover on downs.`); }
      else { plays.push(`${T.nick} bring on the punt unit.`); }
      if(oc.pts){ if(tm===home.abbr)H+=oc.pts; else Aw+=oc.pts; }
      const q=Math.min(4,Math.floor(idx/perQ)+1);
      drives.push({team:tm,q,plays,result:oc.result,pts:oc.pts,h:H,a:Aw});
    });
    return drives;
  }

  function boxScore(home,away,hs,as){
    const usageKey=p=>String(p&&p.id);
    const minTake=(counts,mins,needId,need)=>{
      need=Math.max(0,need-(counts[needId]||0));
      while(need>0){
        let donor=null,room=0;
        Object.keys(counts).forEach(id=>{ const spare=(counts[id]||0)-(mins[id]||0); if(id!==needId && spare>room){ donor=id; room=spare; } });
        if(!donor) break;
        counts[donor]--; counts[needId]=(counts[needId]||0)+1; need--;
      }
    };
    const allocate=(total,pool,mins)=>{
      const counts={}; mins=mins||{};
      if(total<=0||!pool.length) return counts;
      const rows=pool.map(x=>({id:usageKey(x.p),p:x.p,w:Math.max(0.01,x.w*(0.84+rng()*0.32)),raw:0,n:0,frac:0}));
      const sum=rows.reduce((a,x)=>a+x.w,0)||1;
      let used=0;
      rows.forEach(x=>{ x.raw=total*x.w/sum; x.n=Math.floor(x.raw); x.frac=x.raw-x.n; counts[x.id]=x.n; used+=x.n; });
      rows.sort((a,b)=>b.frac-a.frac);
      for(let i=0;used<total;i++,used++) counts[rows[i%rows.length].id]++;
      Object.keys(mins).forEach(id=>minTake(counts,mins,id,mins[id]));
      return counts;
    };
    const addTDs=(rows,tds,weightFn,key)=>{
      rows.forEach(x=>x[key]=x[key]||0);
      for(let i=0;i<tds;i++){
        const live=rows.filter(x=>weightFn(x)>0);
        if(!live.length) return;
        const sum=live.reduce((a,x)=>a+weightFn(x),0);
        let roll=rng()*sum, pick=live[live.length-1];
        for(const x of live){ roll-=weightFn(x); if(roll<=0){ pick=x; break; } }
        pick[key]++;
      }
    };
    const scaleYards=(rows,field,target,key,countKey)=>{
      const raw=rows.reduce((a,x)=>a+(x[field]||0),0);
      if(raw<=0) return;
      rows.forEach(x=>{ x[field]=Math.max((x[countKey]||0)?1:0, Math.round(x[field]*target/raw)); });
      let diff=target-rows.reduce((a,x)=>a+(x[field]||0),0);
      rows.sort((a,b)=>(b[field]||0)-(a[field]||0));
      for(let i=0;diff!==0&&rows.length&&i<80;i++){
        const x=rows[i%rows.length];
        if(diff>0){ x[field]++; diff--; }
        else if((x[field]||0)>((x[countKey]||0)?1:0)){ x[field]--; diff++; }
        else break;
      }
    };
    function teamBox(team, pts, oppPts){
      const r=team.roster.filter(avail);
      const qb=r.filter(p=>p.pos==='QB').sort((a,b)=>b.ovr-a.ovr)[0];
      const backs=r.filter(p=>['RB','FB'].includes(p.pos)).sort((a,b)=>b.ovr-a.ovr).slice(0,5);
      const wrs=r.filter(p=>p.pos==='WR').sort((a,b)=>b.ovr-a.ovr).slice(0,5);
      const tes=r.filter(p=>p.pos==='TE').sort((a,b)=>b.ovr-a.ovr).slice(0,3);
      const out={team:team.abbr,pts,lines:[]};
      // motivation factor: happy + contract-year players play up; sulking/holdout players play down (small, ±~10%)
      const mot=p=>p?clamp(1 + (((p.morale==null?70:p.morale)-70)/320) + (((p.years||9)<=1&&(p.morale==null?70:p.morale)>=55)?0.06:0) + ((p.flags&&p.flags.wantsBall)?-0.05:0), 0.85, 1.16):1;
      const gameScript=clamp((pts-oppPts)/14,-1.6,1.6);
      const qbArm = qb? (A(qb,'ST')*0.56+A(qb,'IN')*0.34+A(qb,'DI')*0.10) : 60;
      const passRt=passOff(team), rushRt=rushOff(team);
      let pAtt=clamp(Math.round(31 - gameScript*4 + (passRt-70)*0.07 + ri(-5,7)),16,54);
      let desiredPassYds=clamp(Math.round((122 + qbArm*1.55 + (pAtt-28)*5.0 + (rng()-0.5)*95)*mot(qb)),45,485);
      let passTD=clamp(Math.round(pts/15 + (rng()-0.55)),0,5);
      const ints=rng()<0.62?ri(0,2):0;

      const recPool=[];
      wrs.forEach((p,i)=>recPool.push({p,role:'WR',rank:i,w:[1.00,0.86,0.66,0.34,0.18][i]*(0.74+(A(p,'HA')*0.48+A(p,'SP')*0.26+A(p,'AG')*0.16)/100)*mot(p)}));
      tes.forEach((p,i)=>recPool.push({p,role:'TE',rank:i,w:[0.58,0.30,0.13][i]*(0.78+(A(p,'HA')*0.40+A(p,'ST')*0.23+A(p,'SP')*0.15)/100)*mot(p)}));
      backs.forEach((p,i)=>recPool.push({p,role:p.pos,rank:i,w:[0.24,0.13,0.06,0.04,0.03][i]*(0.86+(A(p,'HA')*0.24+A(p,'SP')*0.16)/100)*mot(p)}));
      const targetMins={};
      if(wrs[2]&&pAtt>=22) targetMins[usageKey(wrs[2])]=ri(2,4);
      if(tes[1]&&pAtt>=24) targetMins[usageKey(tes[1])]=ri(1,3);
      if(backs[1]&&pAtt>=24) targetMins[usageKey(backs[1])]=ri(1,3);
      if(wrs[3]&&pAtt>=34) targetMins[usageKey(wrs[3])]=ri(1,2);
      const targets=allocate(pAtt,recPool,targetMins);
      const recRows=recPool.map(x=>{
        const tgt=targets[usageKey(x.p)]||0;
        const hands=(A(x.p,'HA')||x.p.ovr)/100, speed=(A(x.p,'SP')||x.p.ovr)/100;
        const baseCatch=x.role==='RB'||x.role==='FB'?0.76:x.role==='TE'?0.66:0.58;
        const cr=clamp(baseCatch + (hands-0.62)*0.22 - (x.rank||0)*0.015 + (rng()-0.5)*0.08,0.34,0.88);
        let rec=clamp(Math.round(tgt*cr + (rng()-0.5)*1.7),0,tgt);
        if(tgt>=3 && rec===0) rec=1;
        let ypr;
        if(x.role==='RB'||x.role==='FB') ypr=5.2 + speed*3.2 + rng()*2.5;
        else if(x.role==='TE') ypr=7.6 + speed*3.4 + (x.rank?0:1.0) + rng()*3.0;
        else ypr=9.0 + speed*5.8 + (x.rank<2?1.6:x.rank===2?0.3:-1.0) + rng()*5.0;
        return {p:x.p,tgt,rec,recyd:Math.round(rec*ypr),rectd:0,role:x.role,rank:x.rank};
      }).filter(x=>x.tgt>0||x.rec>0);
      let pCmp=recRows.reduce((a,x)=>a+x.rec,0);
      if(pCmp<=0){ desiredPassYds=0; passTD=0; }
      scaleYards(recRows,'recyd',desiredPassYds,'recyd','rec');
      pCmp=recRows.reduce((a,x)=>a+x.rec,0);
      passTD=Math.min(passTD,pCmp);
      addTDs(recRows,passTD,x=>(x.rec?Math.max(1,x.recyd*0.35+x.tgt+(x.role==='TE'?8:0)+(x.role==='RB'?3:0)):0),'rectd');
      const passYds=recRows.reduce((a,x)=>a+x.recyd,0);
      if(qb) out.lines.push({id:qb.id,name:qb.name,pos:'QB',stat:`${pCmp}/${pAtt}, ${passYds} yds, ${passTD} TD${ints?', '+ints+' INT':''}`,fp:passYds*0.04+passTD*4-ints*2,key:passTD>=3||passYds>320,pyd:passYds,ptd:passTD,intp:ints,patt:pAtt,pcmp:pCmp});

      const rushAtt=clamp(Math.round(21 + gameScript*5 + (rushRt-70)*0.05 + ri(-5,7)),8,39);
      const rushMins={};
      if(backs[1]&&rushAtt>=14) rushMins[usageKey(backs[1])]=ri(4,7);
      if(backs[2]&&rushAtt>=24) rushMins[usageKey(backs[2])]=ri(1,3);
      const rushPool=backs.map((p,i)=>({p,w:[1.0,0.42,0.16,0.08,0.05][i]*(0.76+(A(p,'SP')*0.26+A(p,'AC')*0.24+A(p,'ST')*0.16)/100)*mot(p)}));
      const rushCounts=allocate(rushAtt,rushPool,rushMins);
      const rushRows=rushPool.map((x,i)=>{
        const car=rushCounts[usageKey(x.p)]||0;
        const skill=(A(x.p,'SP')*0.30+A(x.p,'AC')*0.24+A(x.p,'AG')*0.22+A(x.p,'ST')*0.24)/100;
        const ypc=clamp(2.75+skill*2.25+(rushRt-68)*0.018+(rng()-0.5)*1.2-(i*0.08),2.0,6.8);
        return {p:x.p,car,ryd:Math.round(car*ypc),rtd:0};
      }).filter(x=>x.car>0);
      const desiredRushYds=clamp(Math.round(rushRows.reduce((a,x)=>a+x.ryd,0) + (rng()-0.5)*28),-12,245);
      scaleYards(rushRows,'ryd',desiredRushYds,'ryd','car');
      const rushTD=clamp(Math.round(pts/24 + (rng()-0.45)),0,3);
      addTDs(rushRows,rushTD,x=>x.car?x.car+(x.p.pos==='FB'?3:0):0,'rtd');

      rushRows.forEach(x=>out.lines.push({id:x.p.id,name:x.p.name,pos:x.p.pos,stat:`${x.car} car, ${x.ryd} yds, ${x.rtd||0} TD`,fp:x.ryd*0.1+(x.rtd||0)*6,key:x.ryd>110||(x.rtd||0)>=2,ryd:x.ryd,rtd:x.rtd||0,car:x.car}));
      recRows.forEach(x=>out.lines.push({id:x.p.id,name:x.p.name,pos:x.p.pos,stat:`${x.rec} rec, ${x.recyd} yds, ${x.rectd||0} TD`,fp:x.recyd*0.1+(x.rectd||0)*6,key:x.recyd>105||((x.rectd||0)>=1&&x.recyd>80),recyd:x.recyd,rectd:x.rectd||0,rec:x.rec,tgt:x.tgt}));
      // Defensive box: distribute tackles/pressures across the full front seven and secondary, not only one headline LB.
      const dls=bestIn(team,['DE','DT'],5), lbs=bestIn(team,['ILB','OLB'],5), dbs=bestIn(team,['CB','S'],7);
      const dPool=[];
      dls.forEach((p,i)=>dPool.push({p,w:[0.78,0.66,0.48,0.34,0.22][i]||0.15}));
      lbs.forEach((p,i)=>dPool.push({p,w:[1.12,0.92,0.68,0.44,0.28][i]||0.18}));
      dbs.forEach((p,i)=>dPool.push({p,w:[0.96,0.86,0.72,0.58,0.42,0.30,0.22][i]||0.15}));
      const dMap={}; const dLine=p=>dMap[usageKey(p)]||(dMap[usageKey(p)]={p,tkl:0,sack:0,intc:0,tfl:0,pbu:0,ff:0,fr:0,pr:0,hurry:0,qbhit:0});
      const tTotal=ri(44,68) + (oppPts>=28?ri(4,10):oppPts<=13?-ri(3,8):0);
      const tCounts=allocate(Math.max(32,tTotal),dPool,{});
      Object.keys(tCounts).forEach(id=>{ const row=dPool.find(x=>usageKey(x.p)===id); if(row) dLine(row.p).tkl+=tCounts[id]; });
      const rushDefPool=[...dls.map((p,i)=>({p,w:[1.0,0.78,0.52,0.32,0.20][i]||0.12})),...lbs.map((p,i)=>({p,w:[0.72,0.52,0.34,0.22,0.14][i]||0.1}))];
      const sacks=clamp(Math.round((rng()<0.42?1:0)+(rng()<0.18?1:0)+(rng()<0.06?1:0)),0,5);
      const sackCounts=allocate(sacks,rushDefPool,{});
      Object.keys(sackCounts).forEach(id=>{ const row=rushDefPool.find(x=>usageKey(x.p)===id); if(row){ const d=dLine(row.p), n=sackCounts[id]||0; d.sack+=n; d.tfl+=n; d.qbhit+=n; d.pr+=n; d.hurry+=n; } });
      const pb=ri(2,7), pbuPool=dbs.map((p,i)=>({p,w:[1.0,0.88,0.72,0.54,0.38,0.26,0.18][i]||0.12})), pbuCounts=allocate(pb,pbuPool,{});
      Object.keys(pbuCounts).forEach(id=>{ const p=dbs.find(x=>usageKey(x)===id); if(p)dLine(p).pbu+=pbuCounts[id]||0; });
      if(rng()<0.30){ const p=pick(dbs.length?dbs:lbs); if(p){ const d=dLine(p); d.intc+=1; d.pbu+=1; } }
      if(rng()<0.18){ const p=pick([...lbs,...dls].length?[...lbs,...dls]:dPool.map(x=>x.p)); if(p){ const d=dLine(p); d.ff+=1; d.fr+=rng()<0.5?1:0; } }
      Object.values(dMap).filter(x=>x.tkl||x.sack||x.intc||x.pbu||x.pr).sort((a,b)=>(b.sack*8+b.intc*8+b.tfl*3+b.pbu*2+b.tkl)-(a.sack*8+a.intc*8+a.tfl*3+a.pbu*2+a.tkl)).slice(0,10).forEach(x=>{
        const bits=[]; if(x.tkl)bits.push(`${x.tkl} tkl`); if(x.tfl)bits.push(`${x.tfl} TFL`); if(x.sack)bits.push(`${x.sack} sk`); if(x.intc)bits.push(`${x.intc} INT`); if(x.pbu)bits.push(`${x.pbu} PBU`);
        out.lines.push({id:x.p.id,name:x.p.name,pos:x.p.pos,stat:bits.join(', '),fp:x.tkl*0.35+x.sack*2+x.intc*3+x.tfl*0.5+x.pbu*0.4+x.ff*2+x.fr*2,key:x.sack>=2||x.intc||x.tkl>=10,
          tkl:x.tkl,sack:x.sack,intc:x.intc,tfl:x.tfl,pbu:x.pbu,ff:x.ff,fr:x.fr,pr:x.pr,hurry:x.hurry,qbhit:x.qbhit});
      });
      return out;
    }
    return {home:teamBox(home,hs,as), away:teamBox(away,as,hs)};
  }

  // ---- schedule (N teams, ~17 wk) ----
  // DIVISION-AWARE schedule: opts={games, weight:'division'|'balanced'}. Division weighting plays rivals twice, then fills by conference, then cross-conference.
  function buildSchedule(teams, opts){
    opts=opts||{};
    const ids=teams.map(t=>t.abbr), n=ids.length, tm={}; teams.forEach(t=>tm[t.abbr]=t);
    const divKey=a=>((tm[a]&&tm[a].conf)||'')+'|'+((tm[a]&&tm[a].div)||'');
    const sameDiv=(a,b)=>divKey(a)===divKey(b), sameConf=(a,b)=>((tm[a]&&tm[a].conf)||'')===((tm[b]&&tm[b].conf)||'');
    const games=clamp(opts.games||clamp(n-1,14,17), Math.min(6,n-1), Math.min(20,(n-1)*2));
    const weight=opts.weight==='balanced'?'balanced':'division';
    const cnt={}; ids.forEach(a=>cnt[a]=0); const want={}; const key=(a,b)=>a<b?a+'~'+b:b+'~'+a;
    const addGame=(a,b)=>{ if(a===b||cnt[a]>=games||cnt[b]>=games)return false; want[key(a,b)]=(want[key(a,b)]||0)+1; cnt[a]++; cnt[b]++; return true; };
    // 1) division rivals twice (the rivalry core)
    if(weight==='division'){ ids.forEach(a=>ids.forEach(b=>{ if(a<b&&sameDiv(a,b)){ addGame(a,b); addGame(a,b); } })); }
    // 2) fill via round-robin rotation: conference first, then cross-conference, until everyone hits 'games'
    const arr=ids.slice(); if(arr.length%2) arr.push(null);
    const phases=weight==='balanced'?['any','any','any','any','any','any']:['conf','cross','conf','cross','conf','cross','any','any'];
    for(const ph of phases){ if(ids.every(x=>cnt[x]>=games)) break;
      let a=arr.slice();
      for(let r=0;r<arr.length-1;r++){
        for(let i=0;i<a.length/2;i++){ const h=a[i],w=a[a.length-1-i];
          if(h&&w){ if(sameDiv(h,w)&&weight==='division') continue; const cf=sameConf(h,w);
            if(ph==='conf'&&!cf) continue; if(ph==='cross'&&cf) continue;
            addGame(h,w); } }
        a.splice(1,0,a.pop());
      }
    }
    // 3) lay matchups into weeks (greedy: a team plays at most once per week) — idle weeks become byes
    const matchups=[]; Object.keys(want).forEach(k=>{ const [a,b]=k.split('~'); for(let i=0;i<want[k];i++) matchups.push(i%2?{home:a,away:b}:{home:b,away:a}); });
    for(let i=matchups.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=matchups[i]; matchups[i]=matchups[j]; matchups[j]=t; }
    const weeks=[], rem=matchups.slice(), perWeek=Math.max(1,Math.floor(n/2));
    let guard=0;
    while(rem.length && guard++<200){ const used=new Set(), wk=[];
      for(let i=0;i<rem.length && wk.length<perWeek;){ const g=rem[i]; if(!used.has(g.home)&&!used.has(g.away)){ used.add(g.home); used.add(g.away); wk.push(g); rem.splice(i,1); } else i++; }
      weeks.push(wk);
    }
    return weeks;
  }

  // ---- finances ----
  // amenity revenue helpers (luxury suites & premium clubs) — concave by tier
  function suitesRevenue(tier){ return [0,1.6,2.7,3.4][clamp(tier|0,0,3)]; }            // $M/home game by suites tier
  function clubsRevenue(tier,att,s){ const rate=tier?[0,35,55,70][clamp(tier|0,0,3)]:0; return Math.min(att,s.cap*0.12)*rate/1e6; }  // premium seats × per-game club fee
  function attendancePct(team){
    const s=team.stadium, f=team.fans;
    const u=(s&&s.upgrades)||{};                                  // stadium amenities (null-safe for old saves)
    const F=team.finance, pr=(F&&F.pricing)||{}, br=(F&&F.brand)||{};
    const winPct = (team.wins+team.losses)? team.wins/(team.wins+team.losses):0.5;
    let pct = 0.45 + f.morale/250 + winPct*0.28 + (s.quality-60)/300 + (team.market-55)/400;
    pct -= (s.ticket-110)/700;             // price sensitivity
    pct += (u.videoboard||0)*0.012 + (u.clubs||0)*0.008;          // game presentation + premium amenities pull fans in
    if(s.cap>72000) pct -= (s.cap-72000)/650000*(1.3-winPct);     // empty-seat drag: a huge house looks empty when you're losing
    // pricing gouge + fan trust governor (finances levers, null-safe)
    const conc=pr.concession==null?1:pr.concession, park=pr.parking==null?1:pr.parking, psl=pr.psl||0;
    pct -= Math.max(0,conc-1.15)*0.18 + Math.max(0,park-1.15)*0.09 + psl*0.012;
    pct += Math.max(0,((br.fanTrust==null?70:br.fanTrust)-70))/600;
    return clamp(pct,0.35,1.0);
  }
  function weeklyFinance(team, homeGame, apply){
    const s=team.stadium;
    const u=(s&&s.upgrades)||{};                                   // stadium amenities (null-safe)
    const F=team.finance, pr=(F&&F.pricing)||{};
    const conc=pr.concession==null?1:pr.concession, park=pr.parking==null?1:pr.parking;
    let rev=0, exp=0, att=0;
    if(homeGame){ att=Math.round(s.cap*attendancePct(team));
      rev += att*s.ticket/1e6;          // gate
      rev += att*28*conc/1e6;           // concessions ($28/head, scaled by concession pricing)
      rev += att*9*park/1e6;            // parking ($9/head, scaled by parking pricing)
      rev += (s.quality/100)*(s.cap/1000)*0.06; // base luxury suites scale w/ quality+size
      rev += suitesRevenue(u.suites) + clubsRevenue(u.clubs,att,s);  // premium amenity revenue (suites + club seats)
    }
    rev += 18.0;                        // weekly shared national TV (~$330M/yr /18)
    rev += team.market*0.06 + (s.quality-60)/40; // sponsorship base
    // merch/brand: anchored to merch rating + your STAR (best roster ovr) + winning — trading your star tanks jersey sales
    const bestOvr=(team.roster&&team.roster.length)?team.roster.reduce((m,p)=>Math.max(m,p.ovr||0),0):70;
    rev += (F&&F.brand?F.brand.merch:50)/100*(0.8+Math.max(0,bestOvr-82)*0.06+team.wins*0.05);
    // sponsorship/media deals (naming, TV-local, radio, jersey, concourse) — flat or revenue-share
    if(F&&F.deals) F.deals.forEach(d=>{ rev+=(d.perYr||0)/17; if(d.share) rev+=team.wins*0.25/17; });
    exp += team.roster.reduce((a,p)=>a+p.salary,0)/17;          // weekly payroll
    exp += (s.cap/1000)*0.05 + 0.8;     // stadium upkeep + gameday ops
    exp += (team.coach.ovr/30) + 1.0;   // coaching + front office
    exp += (team.scoutDept&&team.scoutDept.spent?team.scoutDept.spent:0)/17;   // scouting department salaries — a fat dept is a real P&L cost
    exp += (u.training||0)*0.18;        // training facility upkeep (every week, home or away)
    // stadium-project debt service — balance is only paid DOWN on the real weekly tick (apply); speculative UI calls stay pure
    if(s&&s.debt) s.debt.forEach(d=>{ if(d.balance>0){ const pay=Math.min(d.perWk,d.balance); exp+=pay; if(apply) d.balance=round1(d.balance-pay); } });
    const profit=rev-exp;
    return {rev:round1(rev),exp:round1(exp),profit:round1(profit),att};
  }

  // ---- morale & fans react ----
  function reactToResult(team, won, opp, scoreDiff){
    const f=team.fans; let d = won? (1.2+Math.min(2.5,scoreDiff/10)) : -(1.4+Math.min(2.8,scoreDiff/10));
    if(team.market>80) d*=0.85;
    f.morale=clamp(Math.round(f.morale*0.94 + 60*0.06 + d),5,99);  // regress toward 60, then apply result
    f.base=clamp(round1(f.base + (won?0.25:-0.1) + (f.morale>80?0.15:0)), 10, 100); // fanbase grows w/ winning
    team.roster.forEach(p=>{ p.morale=clamp(Math.round(p.morale*0.96+70*0.04+(won?ri(0,3):ri(-3,0))), 20,99); });
  }
  function teamMorale(team){ const s=starters(team); return s.length?Math.round(s.reduce((a,p)=>a+(p.morale||70),0)/s.length):70; }

  // ---- value model (trades/FA) ----
  function playerValue(p){
    const ageF = p.age<=25?1.15 : p.age<=29?1.0 : p.age<=32?0.78 : 0.5;
    const v = Math.pow(Math.max(0,p.ovr-50)/49,2.0)*100*(POS_VAL[p.pos]||1)*ageF;
    return Math.round(v);
  }
  function pickValue(round){ return Math.round([0,180,120,80,50,30,18,10][clamp(round,1,7)]||8); }

  function evalTrade(give, get){ // arrays of player objects (from team perspective receiving 'get')
    const vg=give.reduce((a,p)=>a+playerValue(p),0);
    const vt=get.reduce((a,p)=>a+playerValue(p),0);
    return {giveVal:vg, getVal:vt, fair: vt>=vg*0.92};
  }

  // ---- needs ----
  function needs(team){
    const by={}; QUOTA.forEach(([p])=>by[p]=[]);
    team.roster.forEach(p=>{ if(by[p.pos]) by[p.pos].push(p.ovr); });
    const nd={};
    QUOTA.forEach(([pos,n])=>{ const o=(by[pos]||[]).sort((a,b)=>b-a); const top=o[0]||50; nd[pos]=(99-top)+Math.max(0,(2-o.length))*8; });
    return nd;
  }

  return { rng, reseed, ri, pick, clamp, round1, POS_VAL, OFF, DEF, QUOTA, A, ATTRS:['SP','AC','AG','ST','HA','EN','DI','IN'],
    starters, teamOff, teamDef, teamOvr, unitRtg, grade,
    passOff, rushOff, passDef, rushDef, awardScore, POSGRP, playByPlay,
    ensureBrain, disposition, updateMotivation, offField,
    ensureStaff, posCoach, develop, ensureTraits, retireAge, ageCurve, coachName, INJ_TYPES, injClass, pickInjType,
    simGame, gameInjuries, buildSchedule, attendancePct, weeklyFinance, suitesRevenue, clubsRevenue,
    reactToResult, teamMorale, playerValue, pickValue, evalTrade, needs };
})();
if (typeof module!=='undefined') module.exports=ENG;
