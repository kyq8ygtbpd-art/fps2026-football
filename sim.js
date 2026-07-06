/* ============================================================
   FPS 2026 — sim.js : a modern rebuild of the FPS DirectDraw
   on-field physics engine. Canvas + rAF. Player movement is
   steering-physics driven by the authentic 8 ratings:
     SP top speed · AC acceleration · AG turn/cut · ST block/shed
     HA catch · IN reaction/awareness
   ============================================================ */
const SIM = (() => {
  'use strict';
  const FL = 120, FW = 53.3, EZ = 10;            // field length(yds, incl 2 endzones), width, endzone depth
  const rnd = (a,b)=>a+Math.random()*(b-a);
  const ri = (a,b)=>a+Math.floor(Math.random()*(b-a+1));
  const A = (p,k)=> (p && p.attrs && p.attrs[k]!=null) ? p.attrs[k] : (p?Math.max(40,(p.ovr||60)-8):55);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  // physical caps from ratings (yards/sec, yards/sec^2)
  const maxSpd = p => 5.8 + A(p,'SP')/99*5.2;          // ~5.8–11 yd/s
  const accel  = p => 9 + A(p,'AC')/99*15;             // ~9–24 yd/s^2
  const turn   = p => 0.55 + A(p,'AG')/99*0.4;         // steering responsiveness 0.55–0.95

  function ent(p, team, role, x, y){
    return {p,team,role,x,y,vx:0,vy:0,base:{x,y},engaged:null,broke:0,
      ms:maxSpd(p),ac:accel(p),tn:turn(p),catchT:null,route:null,ri:0,down:false,trail:[]};
  }

  // steer entity toward (tx,ty) at up to its top speed, limited by accel & agility
  function steer(e,tx,ty,dt,speedMul){
    speedMul=speedMul==null?1:speedMul;
    const dx=tx-e.x, dy=ty-e.y, d=Math.hypot(dx,dy)||1;
    const ms=e.ms*speedMul;
    const dvx=dx/d*ms - e.vx, dvy=dy/d*ms - e.vy;
    const amax=e.ac*e.tn*dt, m=Math.hypot(dvx,dvy)||1, k=Math.min(1,amax/m);
    e.vx+=dvx*k; e.vy+=dvy*k;
    const sp=Math.hypot(e.vx,e.vy); if(sp>ms){ e.vx=e.vx/sp*ms; e.vy=e.vy/sp*ms; }
    e.x+=e.vx*dt; e.y+=e.vy*dt;
    e.y=clamp(e.y,0.5,FW-0.5);
  }

  // pursue with an angle-to-intercept: estimate where the carrier will be and cut to that point
  // Rather than leading by a fixed 0.5s, we solve for the intercept: travel time = distance/speed
  function pursue(e,car,dt,mul){
    if(!car){return;}
    const es=e.ms*(mul==null?1:mul);
    // estimate carrier's velocity direction
    const cvx=car.vx||0, cvy=car.vy||0;
    const carSpd=Math.hypot(cvx,cvy)||0.01;
    // project carrier position ahead by a guess of intercept time
    // intercept time ≈ dist/(pursuerSpd - carSpd*projection), clamped to a sane range
    const d=dist(e,car)||0.1;
    const lookAhead=clamp(d/(Math.max(0.5,es-carSpd*0.4)), 0.12, 1.8);
    const tx=car.x+cvx*lookAhead, ty=car.y+cvy*lookAhead;
    steer(e, tx, ty, dt, mul);
  }
  function bodyRad(e){ return e.role==='OL'||e.role==='DL'?0.74:e.role==='LB'||e.role==='TE'?0.66:0.58; }
  function separateBodies(sim,dt){
    const ents=(sim.ents||[]).filter(e=>!e.down);
    for(let i=0;i<ents.length;i++) for(let j=i+1;j<ents.length;j++){
      const a=ents[i], b=ents[j];
      const paired=(a.assign===b || b.assign===a || a.blocker===b || b.blocker===a);
      const min=(bodyRad(a)+bodyRad(b))*(paired?0.66:0.95);
      const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||0.001;
      if(d>=min) continue;
      const nx=dx/d, ny=dy/d, push=(min-d)*(paired?0.26:0.58);
      const aKey=a.hasBall||a===sim.qb||a===sim.target, bKey=b.hasBall||b===sim.qb||b===sim.target;
      const aw=bKey?0.72:aKey?0.28:0.50, bw=aKey?0.72:bKey?0.28:0.50;
      a.x=clamp(a.x-nx*push*aw,0.5,FL-0.5); a.y=clamp(a.y-ny*push*aw,0.5,FW-0.5);
      b.x=clamp(b.x+nx*push*bw,0.5,FL-0.5); b.y=clamp(b.y+ny*push*bw,0.5,FW-0.5);
      if(push>0.05){ a.bump=Math.max(a.bump||0,paired?0.18:0.34); b.bump=Math.max(b.bump||0,paired?0.18:0.34); }
    }
    ents.forEach(e=>{ if(e.bump>0) e.bump=Math.max(0,e.bump-dt*1.5); });
  }
  function nearestDef(sim,car){
    if(!sim || !car || !sim.ents) return null;
    let best=null, bd=1e9;
    sim.ents.forEach(d=>{ if(d.team!=='def' || d.down) return; const dd=dist(d,car); if(dd<bd){ bd=dd; best=d; } });
    return best;
  }
  function assignScriptTackler(sim,car){
    if(!sim.script || !car || sim.script.result==='TD' || sim.script.result==='oob' || sim.script.result==='incomplete' || sim.script.result==='INT' || sim.script.result==='sack') return null;
    const targetX=clamp(sim.los+(sim.script.yards||0), 1, FL-EZ-0.4);
    let best=null, bd=1e9;
    sim.ents.filter(e=>e.team==='def' && !e.down && !(e.blocker&&!e.shed)).forEach(d=>{
      const roleBias=d.role==='DB'?-4:d.role==='LB'?-2:0;
      const dd=Math.hypot((d.x-targetX)*0.75,d.y-car.y)+roleBias;
      if(dd<bd){ bd=dd; best=d; }
    });
    if(best){ sim.scriptTackler=best; best.scriptTackler=true; sim.scriptTackleX=targetX; }
    return best;
  }
  // simple route library (relative to LOS, attacking +x); returns waypoints
  function route(kind, side){
    const s=side; // -1 left, +1 right of center
    const W={
      go:[[2,0],[18,0],[40,0]], slant:[[3,0],[7,-4*s],[20,-10*s]], out:[[2,0],[10,0],[12,9*s]],
      curl:[[2,0],[12,0],[10,3*s]], post:[[3,0],[14,0],[34,-16*s]], corner:[[3,0],[13,0],[28,15*s]],
      drag:[[2,0],[5,-6*s],[18,-14*s]], comeback:[[2,0],[15,0],[12,4*s]], flat:[[1,0],[3,7*s],[8,9*s]],
      wheel:[[1,0],[4,8*s],[26,4*s]], seam:[[2,0],[16,-3*s],[38,-4*s]],
      // real shallow crosser: releases, then travels laterally ALL THE WAY across the formation
      // (~24-30 yds of width) at a shallow depth — this is what makes a "crossing" play actually
      // show receivers crossing paths, instead of every route just running vertical.
      cross:[[3,0],[6,-10*s],[9,-24*s],[11,-30*s]],
      // mesh shallow: very low, tight drag that clears just past the LOS then keeps traveling across
      mesh_shallow:[[2,0],[4,-8*s],[6,-22*s],[8,-28*s]],
      // dig/in: vertical stem then a hard in-breaking cut (crossing concept's deeper route)
      dig:[[3,0],[13,0],[15,-14*s]]
    };
    return W[kind]||W.go;
  }
  function hasPos(p,pos){ return !!p && (p.pos===pos || p.two===pos); }
  function pickWithForce(team,pos,n,force){
    let arr=team.roster.filter(p=>hasPos(p,pos) && !(p.out>0)).sort((a,b)=>b.ovr-a.ovr).slice(0,n);
    if(force && hasPos(force,pos) && !arr.some(p=>p.id===force.id)) arr=[force,...arr].slice(0,n);
    return arr;
  }
  // playKey here is really the play's CONCEPT bucket (sim.concept) — draw/sweep/jet_sweep/zone_read/
  // inside/crossing/slant/deep/screen/pa/short — see app.js OFF_CONCEPT map. Falls back gracefully for
  // any raw key it doesn't recognize (treated like 'short').
  function routeKind(playKey, role, i){
    if(playKey==='crossing'){
      // Crossers actually CROSS: receivers on opposite sides run shallow/mesh routes toward and PAST
      // each other's side of the field (i even -> from left going right, i odd -> from right going left —
      // the opposite `side` sign is applied by the caller via wrSlots, so alternating cross/mesh_shallow
      // by index gives two crossing shallow routes plus a deeper dig/comeback to hold the safety.
      if(role==='TE') return i?'flat':'dig';
      return ['cross','mesh_shallow','dig','comeback'][i%4];
    }
    if(playKey==='slant'){
      if(role==='RB') return 'flat';
      if(role==='TE') return i?'flat':'slant';
      return ['slant','slant','out','flat'][i%4];
    }
    if(role==='RB') return playKey==='screen'?'wheel':'flat';
    if(role==='TE') return playKey==='deep'?'seam':playKey==='pa'?(i?'flat':'seam'):playKey==='screen'?'flat':(i?'flat':'drag');
    if(playKey==='deep') return ['go','post','corner','seam'][i%4];
    if(playKey==='pa') return ['post','corner','seam','comeback'][i%4];
    if(playKey==='screen') return i>=2?'flat':'curl';
    if(playKey==='short') return ['slant','out','curl','drag'][i%4];
    return ['slant','out','curl','go'][i%4];
  }
  function lastName(p){ return (p&&p.last) || ((p&&p.name)||'').split(' ').slice(-1)[0] || ''; }

  const avgST=arr=>arr.length?arr.reduce((s,e)=>s+A(e.p,'ST'),0)/arr.length:60;
  // run-yards drawn from the real NFL shape: ~20% stuffed, long right tail, mean ~4.3 (nflfastR)
  function sampleRunGain(adj, rbSpeed){
    const r=Math.random(); let g;
    if(r<0.18)      g=ri(-4,1);                          // 18% stuffed / TFL
    else if(r<0.66) g=ri(2,6);                           // 48% routine
    else if(r<0.86) g=ri(6,11);                          // 20% solid
    else if(r<0.955)g=ri(11,20);                         // 9.5% chunk
    else            g=ri(20, 45+Math.round(rbSpeed*0.5));// 4.5% breakaway — faster backs go longer
    return Math.round(g+adj);
  }
  // air yards drawn short-biased like real target depth (mean ~8)
  function sampleAir(){ const r=Math.random();
    if(r<0.50) return ri(0,7); if(r<0.80) return ri(8,15); if(r<0.95) return ri(16,26); return ri(27,55); }
  function sampleYAC(ag){ let y=ri(0,4)+Math.round((ag-70)*0.05); if(Math.random()<0.06)y+=ri(8,45); return Math.max(0,y); }
  function FieldSim(canvas){ this.cv=canvas; this.ctx=canvas.getContext('2d'); this.raf=0; this.weather='clear'; this.surface='grass'; this.wear=0; this.wearSeed='field'; this.homeTeam=null; this.awayTeam=null; this.fieldTheme=null; this.gameState=null; this.onEvent=null; }

  FieldSim.prototype.setup=function(off, def, play, los, script){
    this.off=off; this.def=def; this.play=play; this.los=los||40; this.t=0; this.result=null; this.ball=null; this.thrown=false; this.handoff=false; this._emitted=new Set();
    this.script=script||null;   // scripted outcome from Coach Mode; renderer snapshots the known result
    this.minT=this.script?(this.script.minT || (play==='pass'?1.7:1.3)):0;   // min visible time before the play may resolve (kept snappy so the verdict isn't withheld; deep balls still run their natural flight time)
    if(script&&script.wx) this.weather=script.wx;
    if(script&&script.surface) this.surface=script.surface;
    if(script&&script.wear!=null) this.wear=script.wear;
    this.playKey=(script&&script.offKey)||play;
    // this.concept is the fine-grained choreography bucket (draw/sweep/jet_sweep/zone_read/inside/
    // crossing/slant/deep/screen/pa/short) — falls back to playKey for callers that don't send it
    // (e.g. onePlay()/full-game sim, or an older script object) so nothing regresses.
    this.concept=(script&&script.concept)||this.playKey;
    this.forceCarrierId=script&&script.carrierId;
    this.forceTargetId=script&&script.targetId;
    this.firstDown=(script&&script.toGo!=null)?clamp(this.los+script.toGo,10,FL-EZ):null;
    // SPECIAL TEAMS: punts and field goals get their own formation + kick choreography
    if(play==='punt'||play==='fg'){ this.setupSpecial(off,def,play,script); return this; }
    const findOff=id=> id ? off.roster.find(p=>p.id===id && !(p.out>0)) : null;
    const forcedCarrier=findOff(this.forceCarrierId), forcedTarget=findOff(this.forceTargetId);
    const pickRole=(arr,weights)=>{ if(!arr.length)return null; let s=0; arr.forEach((p,i)=>s+=(weights[i]||0.04)); let r=Math.random()*s; for(let i=0;i<arr.length;i++){ r-=(weights[i]||0.04); if(r<=0)return arr[i]; } return arr[arr.length-1]; };
    // JET SWEEP: the ball carrier is a WR taking a handoff in motion, not the back — keep the RB slot
    // as a normal (non-forced) back so he stays in as a decoy/blocker, and pull the forced WR out of
    // the normal receiver pool so he isn't drawn twice (once in jet motion, once running a route).
    const jetCarrier = (this.concept==='jet_sweep' && play==='run' && hasPos(forcedCarrier,'WR')) ? forcedCarrier : null;
    // QB KEEPER (sneak / qb_power / zone_read keep): the forced carrier IS the quarterback. Forcing him
    // into the RB slot drew the same player twice — a ghost QB standing in the pocket plus an 'RB'-role
    // clone carrying the ball. Instead force him into the QB slot (one entity), keep a normal back in
    // the backfield as the mesh/decoy, and hand the QB the ball directly at the snap.
    const qbKeeper = (play==='run' && forcedCarrier && forcedCarrier.pos==='QB') ? forcedCarrier : null;
    const rbForce = (jetCarrier||qbKeeper) ? null : (play==='run' ? forcedCarrier : (hasPos(forcedTarget,'RB')||hasPos(forcedTarget,'FB') ? forcedTarget : null));
    const rbDepth=[...pickWithForce(off,'RB',3,rbForce),...pickWithForce(off,'FB',1,rbForce)];
    const oQB=pickWithForce(off,'QB',1,qbKeeper)[0], oRB=rbForce||pickRole(rbDepth,[1,0.36,0.14,0.08]),
      oWR=pickWithForce(off,'WR',4,forcedTarget).filter(p=>!jetCarrier||p.id!==jetCarrier.id), oTEs=pickWithForce(off,'TE',2,forcedTarget), oOL=[...pickWithForce(off,'T',2),...pickWithForce(off,'G',2),...pickWithForce(off,'C',1)];
    const dDL=[...pickWithForce(def,'DE',2),...pickWithForce(def,'DT',2)], dLB=[...pickWithForce(def,'OLB',2),...pickWithForce(def,'ILB',1)], dDB=[...pickWithForce(def,'CB',2),...pickWithForce(def,'S',2)];
    const L=this.los, mid=FW/2; const E=[]; const recv=[];
    // OL across the line
    oOL.forEach((p,i)=>{ if(p) E.push(ent(p,'off','OL', L-0.6, mid-4+i*2)); });
    if(oQB) { this.qb=ent(oQB,'off','QB', L-4.5, mid); if(qbKeeper)this.qb.focus=true; E.push(this.qb); }
    if(oRB) { this.rb=ent(oRB,'off','RB', L-6.5, mid+ (play==='run'?rnd(-1,1):0)); if(oRB.id===this.forceCarrierId||oRB.id===this.forceTargetId)this.rb.focus=true; E.push(this.rb); }
    // JET SWEEP carrier: starts on the side OPPOSITE the call, as if caught mid-motion at the snap —
    // he sprints laterally across the formation behind the QB, takes the handoff moving full speed,
    // and only then bends around the sweep-side edge (see the jet branch in runCarrier). Starting him
    // on the call side made the "sweep" look like a wideout who simply ran upfield.
    if(jetCarrier){
      const jetSide = Math.random()<0.5?-1:1; this._sweepSide=jetSide;
      this.jet=ent(jetCarrier,'off','WR', L-5, clamp(mid-jetSide*9,4,FW-4));
      this.jet.focus=true; E.push(this.jet);
    }
    // receivers + routes
    const wrSlots=[[mid-18,-1],[mid+18,1],[mid-9,-1],[mid+9,1]];
    oWR.forEach((p,i)=>{ if(!p)return; const sl=wrSlots[i]||[mid+10,1]; const e=ent(p,'off','WR', L-1, sl[0]);
      e.route=route(routeKind(this.concept,'WR',i), sl[1]).map(w=>[L+w[0], sl[0]+w[1]]);
      if(p.id===this.forceTargetId){ e.focus=true; this.forcedTarget=e; } recv.push(e); E.push(e); });
    oTEs.forEach((p,i)=>{ if(!p)return; const baseY=mid+(i?10:6), dir=i?-1:1; const e=ent(p,'off','TE', L-1, baseY);
      e.route=route(routeKind(this.concept,'TE',i),dir).map(w=>[L+w[0],baseY+w[1]]);
      if(p.id===this.forceTargetId){ e.focus=true; this.forcedTarget=e; } recv.push(e); E.push(e); });
    this.recv=recv;
    // DL rush
    dDL.forEach((p,i)=>{ if(p) E.push(ent(p,'def','DL', L+0.8, mid-3+i*2)); });
    // LB
    dLB.forEach((p,i)=>{ if(p) E.push(ent(p,'def','LB', L+5, mid-6+i*6)); });
    // DB cover receivers
    dDB.forEach((p,i)=>{ if(!p)return; const e=ent(p,'def','DB', L+6, mid-20+i*13); e.cover=recv[i%Math.max(1,recv.length)]; E.push(e); });
    // HARD GUARD: never render two dots for one player, whatever the pool logic above produced
    // (dual-position players can slip into two slots). Keep the ball-handling entity, re-point
    // every reference at the survivor, and drop the clone.
    {
      const pri=e=> e===this.jet?4 : e===this.qb?3 : e===this.rb?2 : 1;
      const keep={};
      E.forEach(e=>{ const k=e.team+'|'+e.p.id; if(!keep[k]||pri(e)>pri(keep[k])) keep[k]=e; });
      const live=e=> e ? keep[e.team+'|'+e.p.id] : e;
      if(E.some(e=>live(e)!==e)){
        for(let i=E.length-1;i>=0;i--){ if(live(E[i])!==E[i]) E.splice(i,1); }
        this.rb=live(this.rb)||null; this.jet=live(this.jet)||null; this.forcedTarget=live(this.forcedTarget)||null;
        E.forEach(e=>{ if(e.cover) e.cover=live(e.cover)||e.cover; });
        const seen=new Set();
        this.recv=recv.map(r=>live(r)||r).filter(r=>!seen.has(r)&&(seen.add(r),true));
      }
    }
    this.ents=E;
    if(play==='run'){ this.carrier=this.jet||(qbKeeper?this.qb:this.rb); if(this.carrier)this.carrier.hasBall=true; }
    else { this.carrier=null; if(this.qb)this.qb.hasBall=true; }   // QB holds it; not a "carrier" until scramble
    // give one LB a blitz on some pass snaps for pressure variety
    const lbs=E.filter(e=>e.role==='LB'); if(play==='pass' && lbs.length && Math.random()<0.4) lbs[0].blitz=true;
    // assign blocks at the snap: each rusher gets the nearest free lineman, and is HELD at the line until he sheds
    const rushers=E.filter(e=>e.role==='DL'||(e.role==='LB'&&e.blitz)), ols=E.filter(e=>e.role==='OL');
    rushers.forEach(r=>{ let best=null,bd=1e9; ols.forEach(o=>{ if(o._taken)return; const dd=Math.abs(o.y-r.y); if(dd<bd){bd=dd;best=o;} });
      if(best){ best._taken=true; best.assign=r; r.blocker=best; r.shed=false; } });
    // pass: the back is a checkdown option (short throws), and model a per-dropback sack chance
    if(play==='pass' && this.rb){ this.rb.route=route(routeKind(this.concept,'RB',0),1).map(w=>[L+w[0],mid+6+w[1]]);
      if(this.rb.p.id===this.forceTargetId){ this.rb.focus=true; this.forcedTarget=this.rb; } this.recv.push(this.rb); }
    this.sackP = play==='pass' ? clamp(0.075*(avgST(rushers)/avgST(ols)), 0.03, 0.15) : 0;
    // yardage anchor: physics drives the motion/visual, but the gain is modeled to NFL rates
    // (most plays land near the mean; a heavy tail produces real breakaways). Natural penetration can still stuff it early.
    this.gainTarget = 999; this.scriptTackler=null; this.scriptTackleX=null; this._reachedAt=null;
    if(play==='run' && this.carrier){
      if(this.script){ this.gainTarget = this.script.yards; assignScriptTackler(this,this.carrier); }
      else { const olST=avgST(ols), dlST=avgST(rushers);
        const adj=clamp((olST-dlST)*0.06 + (A(this.carrier.p,'SP')-72)*0.02, -2.5, 3);   // ratings shift the curve
        this.gainTarget = clamp(sampleRunGain(adj, A(this.carrier.p,'SP')), -5, 95); }
    }
    this.impacts=[]; this.fxLog=[];
    this.drama = this.script ? (this.script.drama || computeDrama(this.script, off, def)) : null;
    this.breaksLeft = this.drama ? this.drama.breaks.slice() : [];
    return this;
  };

  // ---- SPECIAL TEAMS: punt & field-goal choreography (formation → snap → kick → flight → result) ----
  FieldSim.prototype.setupSpecial=function(off,def,kind,script){
    const L=this.los, mid=FW/2, E=[], sc=script||{};
    this.recv=[]; this.impacts=[]; this.fxLog=[]; this.drama=null; this.breaksLeft=[];
    this.gainTarget=999; this.scriptTackler=null; this.scriptTackleX=null; this._reachedAt=null;
    this.carrier=null; this.rb=null; this.jet=null; this.sackP=0;
    const pickN=(team,poss,n)=>team.roster.filter(p=>poss.includes(p.pos)&&!(p.out>0)).sort((a,b)=>(b.ovr||0)-(a.ovr||0)).slice(0,n);
    const line=[...pickN(off,['T'],2),...pickN(off,['G'],2),...pickN(off,['C'],1),...pickN(off,['TE'],2)];
    line.forEach((p,i)=>{ if(p) E.push(ent(p,'off','OL', L-0.6, mid-6+i*2)); });
    const rush=[...pickN(def,['DT'],2),...pickN(def,['DE'],2),...pickN(def,['OLB'],2),...pickN(def,['ILB'],1)];
    rush.forEach((p,i)=>{ if(p) E.push(ent(p,'def','DL', L+0.8, mid-6+i*2)); });
    if(kind==='punt'){
      const punter=pickN(off,['P'],1)[0]||pickN(off,['K'],1)[0]||pickN(off,['QB'],1)[0];
      this.kicker=punter?ent(punter,'off','P', L-14, mid):null; if(this.kicker)E.push(this.kicker);
      this.qb=this.kicker;   // ball-spot + body-weight anchor
      this.gunners=pickN(off,['WR'],2).map((p,i)=>{ const g=ent(p,'off','WR', L-0.5, i?FW-5:5); E.push(g); return g; });
      const gross=clamp((sc.net!=null?sc.net:ri(36,48))+ri(2,7), 25, 72);
      this.landX=clamp(L+gross, EZ+3, FL-EZ-0.5); this.landY=clamp(mid+rnd(-9,9),6,FW-6);
      const rman=pickN(def,['CB'],2)[1]||pickN(def,['CB'],1)[0]||pickN(def,['WR'],1)[0]||pickN(def,['S'],1)[0];
      this.returner=rman?ent(rman,'def','DB', this.landX+1.5, this.landY):null; if(this.returner)E.push(this.returner);
      pickN(def,['S'],2).forEach((p,i)=>{ if(p)E.push(ent(p,'def','DB', L+11, mid-7+i*14)); });
      this.special={kind:'punt', ret: sc.returnYards!=null?sc.returnYards:ri(0,9), hang: clamp(1.35+gross*0.017,1.6,2.5)};
    } else {
      const kk=pickN(off,['K'],1)[0]||pickN(off,['P'],1)[0]||pickN(off,['QB'],1)[0];
      const holder=pickN(off,['QB'],2)[1]||pickN(off,['P'],1)[0]||pickN(off,['QB'],1)[0];
      this.holder=holder?ent(holder,'off','QB', L-7.2, mid+0.6):null; if(this.holder)E.push(this.holder);
      this.kicker=kk?ent(kk,'off','K', L-9.3, mid+2.8):null; if(this.kicker)E.push(this.kicker);
      this.qb=this.holder||this.kicker;
      pickN(off,['RB','FB'],2).forEach((p,i)=>{ if(p)E.push(ent(p,'off','OL', L-1.4, i?mid+7.4:mid-7.4)); });
      const ok=sc.ok!==false;
      this.landX=FL-0.6;
      this.landY=clamp(mid + (ok?rnd(-2.2,2.2):(Math.random()<0.5?-1:1)*rnd(4.8,8.5)), 3, FW-3);
      this.special={kind:'fg', ok, dist:sc.dist||40, hang: clamp(0.9+(sc.dist||40)*0.016,1.1,1.9)};
    }
    this.ents=E;
    return this;
  };
  FieldSim.prototype.stepSpecial=function(dt){
    if(this.result) return;
    this.t+=dt; const sp=this.special, L=this.los, t=this.t;
    const catcher = sp.kind==='punt' ? this.kicker : this.holder;
    // trenches: rushers push, the shield braces — nobody comes clean (blocked-kick drama is out of scope)
    this.ents.forEach(e=>{
      if(e.team==='def' && e.role==='DL'){ steer(e, sp.kicked?L-0.2:L-0.7, e.y, dt, sp.kicked?0.18:0.45); if(e.x<L-1.1)e.x=L-1.1; }
      else if(e.team==='off' && e.role==='OL'){ steer(e, L-0.8, e.y, dt, 0.3); }
    });
    const SNAP_T=0.45, KICK_T= sp.kind==='punt' ? 1.15 : 0.95;
    if(t>=SNAP_T && catcher && !catcher.hasBall && !sp.kicked) catcher.hasBall=true;      // snap arrives
    if(sp.kind==='fg' && this.kicker && !sp.kicked && t>KICK_T-0.34){                     // kicker steps into it
      steer(this.kicker, (this.holder?this.holder.x:L-7.2)+0.4, this.holder?this.holder.y:FW/2, dt, 0.85);
    }
    if(t>=KICK_T && !sp.kicked){
      sp.kicked=true; if(catcher)catcher.hasBall=false;
      const ox=catcher?catcher.x:L-8, oy=catcher?catcher.y:FW/2;
      this.ball={x:ox,y:oy,ox,oy,tx:this.landX,ty:this.landY,t0:t,airTime:sp.hang,arcH:sp.kind==='punt'?15:9,trail:[]};
      this.thrown=true;
      this._emit('kickaway',{kind:sp.kind, dist:sp.dist});
    }
    // coverage releases at the kick; the returner settles under the ball
    if(sp.kicked && sp.kind==='punt' && !sp.finished){
      (this.gunners||[]).forEach(g=>steer(g, this.landX-1.5, this.landY+(g.y<this.landY?-1.5:1.5), dt, 0.95));
      if(this.returner && !sp.returning) steer(this.returner, this.landX, this.landY, dt, 0.7);
    }
    // ball flight
    if(this.ball && this.thrown){
      const b=this.ball, frac=b.airTime>0?clamp((t-b.t0)/b.airTime,0,1):1;
      b.x=b.ox+(b.tx-b.ox)*frac; b.y=b.oy+(b.ty-b.oy)*frac; b.z=b.arcH*Math.sin(frac*Math.PI); b.frac=frac;
      b.trail=b.trail||[]; b.trail.push([b.x,b.y,b.z]); if(b.trail.length>22)b.trail.shift();
      if(frac>=1){
        this.thrown=false; this.ball=null;
        if(sp.kind==='punt' && this.returner && sp.ret>0){
          this.returner.hasBall=true; this.carrier=this.returner;
          sp.retEndX=clamp(this.returner.x-sp.ret, EZ+1, FL-1); sp.returning=true;
        } else { sp.finished=true; sp.doneAt=t; }
      }
    }
    // short return burst with coverage converging
    if(sp.returning && this.carrier){
      const r=this.carrier;
      steer(r, sp.retEndX, clamp(r.y+(r._retDrift||(r._retDrift=rnd(-2.5,2.5)))*dt*3, 5, FW-5), dt, 1.0);
      this.ents.filter(e=>e.team==='off'&&(e.role==='WR'||e.role==='OL')).forEach(o=>pursue(o,r,dt,0.88));
      const near=this.ents.filter(e=>e.team==='off').reduce((m,o)=>{const dd=dist(o,r);return dd<m.d?{o,d:dd}:m;},{o:null,d:1e9});
      if(r.x<=sp.retEndX+0.4 || near.d<1.0){ sp.returning=false; sp.finished=true; sp.doneAt=t; r.down=true; this.lastTackler=near.o; }
    }
    separateBodies(this,dt);
    this.ents.forEach(e=>{ if(!e.down){ e.trail=e.trail||[]; e.trail.push([e.x,e.y]); if(e.trail.length>22)e.trail.shift(); } });
    if(sp.finished && sp.doneAt!=null && t>sp.doneAt+0.55 && !this.result){
      const k=this.kicker&&this.kicker.p;
      if(sp.kind==='fg') this.result={outcome:sp.ok?'fg_good':'fg_miss', yards:0, who:k,
        text: sp.ok?`The ${sp.dist}-yard field goal is GOOD!`:`The ${sp.dist}-yarder is NO GOOD — pushed wide!`};
      else this.result={outcome:'punt', yards:0, who:k,
        text:`${k?k.name+' punts it':'Punted'} away${sp.ret>3?` — brought back ${sp.ret}`:''}. Field position flipped.`};
    }
    if(t>12 && !this.result) this.result={outcome:sp.kind==='punt'?'punt':(sp.ok?'fg_good':'fg_miss'), yards:0, text:'The kick is away.'};
  };

  // ---- EVENT BUS: emit exactly once per type per play ----
  FieldSim.prototype._emit=function(type,data){
    if(!this.onEvent) return;
    if(this._emitted && this._emitted.has(type)) return;
    if(this._emitted) this._emitted.add(type);
    try{ this.onEvent(type, data||{}); }catch(e){}
  };

  // ---- DRAMA: derive the real-football moments from the known outcome (self-contained; coach-mode viz only) ----
  function computeDrama(script, off, def){
    const d={breaks:[], monsterSack:false, pick6:false, returnYards:0};
    if(!script) return d;
    const out=script.result||script.outcome, yds=script.yards||0;
    if(out==='sack'){ d.monsterSack=(yds<=-8)||Math.random()<0.32; return d; }
    if(out==='INT'){ d.returnYards=4+Math.floor(Math.random()*22); d.pick6=Math.random()<0.11; return d; }
    if(out==='incomplete') return d;
    const id=script.carrierId||script.targetId; const carrier=id&&off ? off.roster.find(p=>p.id===id) : null;
    if(yds>=6 && carrier){ const agi=A(carrier,'AG'), str=A(carrier,'ST'), skill=(agi+str)/2;
      let nb=Math.min(3, Math.floor((yds-3)/8));
      if(nb>0 && skill<68 && Math.random()<0.5) nb--; if(skill>82 && Math.random()<0.5) nb=Math.min(3,nb+1);
      const style = str>agi+6?'power':agi>str+6?'elusive':'balanced';
      for(let i=0;i<nb;i++){ let type; const r=Math.random();
        if(style==='power'||(str>=agi&&r<0.55)) type='truck'; else if(r<0.32) type='hurdle'; else type='spin';
        d.breaks.push({type}); } }
    return d;
  }
  FieldSim.prototype.startReturn=function(db){
    if(!db){ this.end('INT', this.cdb); return; }
    this.ball=null; this.thrown=false; this.carrier=db; db.hasBall=true;
    this.returning=true; this.intReturnT0=this.t;
    const want=(this.drama&&this.drama.returnYards)||(4+Math.floor(Math.random()*22));
    const room=Math.max(0, db.x-EZ-0.5);
    this.returnYards=Math.min(want, Math.round(room));
    this.returnStopX=clamp(db.x-this.returnYards, EZ+0.4, FL);
    this.pick6=(this.drama&&this.drama.pick6) || this.returnStopX<=EZ+0.6;
    if(this.pick6){ this.returnStopX=EZ+0.3; this.returnYards=Math.round(db.x-EZ); }
    if(this.onMoment) this.onMoment({kind:'INT', who:db.p});
  };
  FieldSim.prototype.stepReturn=function(dt){
    this.t+=dt; const db=this.carrier; if(!db){ this.end('INT', this.cdb); return; }
    const off=this.ents.filter(e=>e.team==='off');
    const pursuers=off.filter(o=>!o.down).map(o=>({o,dd:dist(o,db)})).sort((a,b)=>a.dd-b.dd);
    let ty=db.y; pursuers.slice(0,2).forEach(n=>{ if(n.dd<6){ const w=(6-n.dd)/6; ty+=(db.y-n.o.y)/(n.dd||1)*w*4.5; } });
    steer(db, this.returnStopX-2, clamp(ty,4,FW-4), dt, 1.18);
    off.forEach(o=>{ if(o.down||o.fallen)return; pursue(o, db, dt, o.role==='QB'?0.86:0.8); });
    db.trail=db.trail||[]; db.trail.push([db.x,db.y]); if(db.trail.length>14)db.trail.shift();
    separateBodies(this,dt);
    if(db.x<=EZ+0.4){ this.end('pick6', db); return; }
    const near=off.filter(o=>!o.down&&!o.fallen).reduce((m,o)=>{const dd=dist(o,db);return dd<m.d?{o,d:dd}:m;},{o:null,d:1e9});
    if(this.t>this.intReturnT0+0.6 && (db.x<=this.returnStopX+0.4 || (near.o&&near.d<1.05))){ this.lastTackler=near.o; this.end(this.pick6?'pick6':'INTret', db); return; }
    if(this.t>this.intReturnT0+5){ this.end('INTret', db); }
  };
  FieldSim.prototype.step=function(dt){
    if(this.result) return;
    if(this.special){ this.stepSpecial(dt); return; }
    if(this.returning){ this.stepReturn(dt); return; }
    this.t+=dt; const L=this.los, mid=FW/2;
    const off=this.ents.filter(e=>e.team==='off'), def=this.ents.filter(e=>e.team==='def');
    const carrier=this.carrier;
    // ---- EVENT: handoff (run/scramble) or dropback (pass) — fires once when motion begins ----
    if(this.play==='run' && carrier && carrier.hasBall && this.t >= 0.12){
      this._emit('handoff', {carrier:carrier.p, yardLine:Math.round(carrier.x-EZ)});
    } else if(this.play==='pass' && !this.thrown && !this.scrambling && this.t >= 0.12){
      this._emit('dropback', {qb:this.qb&&this.qb.p});
    } else if(this.scrambling && this.t >= 0.12){
      this._emit('handoff', {carrier:this.qb&&this.qb.p, yardLine:Math.round((this.qb?this.qb.x:L)-EZ), scramble:true});
    }
    const scriptClosing=this.script && carrier && carrier.hasBall && this.gainTarget<999 && (carrier.x-this.los)>Math.max(0,this.gainTarget-7);
    this.ents.forEach(e=>{
      if(e.down) return;
      if(e.fallen){ e.vx*=0.86; e.vy*=0.86; e.x+=e.vx*dt; e.y+=e.vy*dt; return; }   // a beaten defender stumbles to the turf
      if(e.team==='off'){
        if(e.role==='OL'){ const d=e.assign; if(d){
            // Drive into the rusher: push target is 0.8yd BEHIND the rusher (downfield of them)
            // so the OL physically engages and displaces — not just blocks the path.
            // If the rusher has shed, fall off and wall off space.
            if(!d.shed){
              const dDist=dist(e,d);
              const pushX = d.x + 0.9;  // OL aims past the rusher — creates push-back feel
              steer(e, pushX, d.y, dt, dDist>1.5 ? 0.95 : 0.72); // charge in fast, then lean in
              // rusher physically pushed backward while held — slight resistance
              if(dDist < 1.2){ d.x = Math.max(L+0.5, d.x - 0.04*dt*60); }
            } else if(d.lateRelease && carrier && carrier.hasBall){
              // Rusher released late because the play moved on — the OL follows the play a few
              // steps downfield (a lineman trailing to find a second-level man) instead of
              // freezing at the LOS forever once the ball is long gone.
              steer(e, clamp(carrier.x-2, L-0.5, carrier.x+2), carrier.y, dt, 0.5);
            } else {
              // Shed: OL stumbles but recovers to wall off the lane
              steer(e, L-0.2, e.y, dt, 0.55);
            }
          } else steer(e,L-0.4,e.y,dt,0.6); }
        else if(e===carrier){ runCarrier(e,this,dt,def,L,mid); }
        else if(e===this.rb && this.play==='run' && carrier && carrier!==e){
          // NON-CARRYING BACK (QB keeper, zone-read keep, jet sweep): sell the dive fake — crash the
          // A-gap away from the real carrier's track at the snap, then throttle down into the pile,
          // instead of standing frozen at the mesh point looking like HE has the ball.
          const fakeY=mid-(this._sweepSide||1)*2;
          if(e.x < L+1.2) steer(e, L+2.5, fakeY, dt, this.t<0.6?0.92:0.6);
          else steer(e, L+2.8, fakeY, dt, 0.2);
        }
        else if(e.role==='QB' && this.play==='run'){ steer(e,L-5,mid,dt,0.6); }
        else if(e.role==='QB' && this.play==='pass'){
          if(!this.thrown){
            const dropT=0.65, dropX=L-7;
            if(this.t<dropT){
              // Initial drop: 5-step drop straight back to set depth
              steer(e, dropX, mid, dt, 0.78);
            } else {
              // Pocket movement: step up when edges are collapsing, slide away from the nearest rusher
              const rushers=def.filter(d=>d.role==='DL'||(d.role==='LB'&&d.blitz));
              // Find the nearest unblocked rusher
              const unblocked=rushers.filter(d=>d.shed||!d.blocker);
              let pocketX=dropX+0.5, pocketY=mid;
              if(unblocked.length){
                const nr=unblocked.reduce((m,d)=>{ const dd=dist(d,e); return dd<m.dd?{d,dd}:m; },{d:null,dd:1e9});
                if(nr.d && nr.dd < 5){
                  // Step up if rusher is coming from edge (far left/right of QB y)
                  // Slide away if rusher is directly behind (same y, coming from behind)
                  const rDy=nr.d.y - e.y;
                  const rDx=nr.d.x - e.x; // negative = rusher behind QB
                  if(Math.abs(rDy) > 2){ // edge rusher — step up into the pocket
                    pocketX = Math.min(dropX+2.5, e.x+0.5);
                    pocketY = clamp(mid + (rDy>0 ? -1.0 : 1.0) * clamp((5-nr.dd)/5*1.8,0,1.8), 10, FW-10);
                  } else if(rDx < 0){ // rusher coming straight from behind — stay put, slide slightly
                    pocketX = dropX+0.5;
                    pocketY = clamp(e.y + (rDy>=0?-0.6:0.6), 10, FW-10);
                  }
                }
              }
              steer(e, pocketX, pocketY, dt, 0.28);
            }
            this.tryPass(def);
          } else {
            // post-throw: QB holds with brief follow-through step then settles
            if(!e._throwT) e._throwT=this.t;
            const pt=this.t-e._throwT;
            if(pt<0.35){ steer(e, e.x+0.4, e.y, dt, 0.45); }
            else { steer(e, e.x, e.y, dt, 0.08); }
          }
        }
        else if(e.route && e!==carrier){ runRoute(e,dt); }   // WR/TE/RB-checkdown run their routes
      } else { // defense
        if(this.scriptTackler===e && carrier && carrier.hasBall){
          // Intercept pursuit: cut to where the carrier will be at the tackle spot.
          // Approach from the tackler's own side so it looks like a contain stop, not head-on.
          const tkX=this.scriptTackleX!=null?this.scriptTackleX:carrier.x;
          const dToSpot=Math.abs(tkX-carrier.x);
          const carrSpd=Math.hypot(carrier.vx||0,carrier.vy||0)||1;
          const timeToSpot=Math.max(0.1,dToSpot/carrSpd);
          const cutX=tkX+0.4;
          // Approach from same side as the tackler — creates angled wrap vs head-on collision
          const approachBias=(e.y<carrier.y ? -0.5 : 0.5);
          const cutY=carrier.y+(carrier.vy||0)*Math.min(timeToSpot,0.9)+approachBias;
          steer(e, cutX, clamp(cutY,2,FW-2), dt, 1.32);
        }
        else if(scriptClosing && (e.role==='LB' || e.role==='DB')){
          pursue(e, carrier, dt, e.role==='DB'?1.08:1.13);
        }
        else if(e.role==='DL' || (e.role==='LB'&&e.blitz)){ const aim=carrier||this.qb;
          // Once the play has clearly moved past the line (carrier well downfield, or the
          // QB has thrown/scrambled away), a held rusher releases to chase — otherwise the
          // whole D-line stays glued at the LOS forever while the action happens 20+ yards
          // away, which reads as dead/frozen instead of a live pursuit.
          const playMovedOn = (carrier && carrier.hasBall && (carrier.x-L) > 6) || (this.thrown) || (this.play==='pass' && this.t>3.4);
          if(e.blocker && !e.shed && !playMovedOn){
            const sr=(A(e.p,'ST')/(A(e.blocker.p,'ST')+1))*0.55;   // sheds/sec; stronger linemen hold longer
            if(Math.random() < sr*dt) e.shed=true;
            steer(e, aim.x, aim.y, dt, 0.16);
            if(e.x < L-1) e.x = L-1;                                // held at the line until shed
          } else { if(!e.shed){ e.shed=true; e.lateRelease=true; } pursue(e, aim, dt, 0.92); }
        }
        else if(e.role==='LB'){ pursue(e, carrier||this.qb, dt, 0.95); }
        else if(e.role==='DB'){
          if(carrier && carrier.hasBall && carrier.x>this.los+1){ pursue(e, carrier, dt, 0.97); } // ball in space — rally & tackle
          else if(this.thrown&&this.ball){
            // cut to ball's landing spot (tx/ty) rather than target's moving feet
            const b=this.ball;
            steer(e, b.tx, b.ty, dt, 0.95);
          }
          else if(e.cover){
            // Coverage leverage: DB stays between the receiver and where the ball is (QB/ball).
            // Maintain 2–3 yd cushion in x, mirror receiver y, lean toward the ball side.
            const r=e.cover;
            const ballSrcX=this.qb?this.qb.x:this.los;
            const ballSrcY=this.qb?this.qb.y:mid;
            // Leverage angle: point from receiver toward ball source
            const lvDx=ballSrcX-r.x, lvDy=ballSrcY-r.y;
            const lvLen=Math.hypot(lvDx,lvDy)||1;
            // Position: 2.5yd behind receiver (downfield cushion) and offset toward the ball
            const cushion=2.5;
            const lateralBias = (lvDy/lvLen)*1.2; // lean toward ball side by up to 1.2 yd
            const tgtX = r.x - cushion;           // stay 2.5yd behind (behind receiver = less x)
            const tgtY = clamp(r.y + lateralBias, 3, FW-3);
            // Speed: match receiver speed + small extra to maintain leverage
            steer(e, tgtX, tgtY, dt, 0.91);
          }
          else { steer(e, this.los+8, e.y, dt, 0.7); } }
      }
    });
    // ---- ball in flight: parabolic arc ----
    if(this.ball && this.thrown){ const b=this.ball;
      const elapsed=this.t - b.t0;
      const frac=b.airTime>0 ? clamp(elapsed/b.airTime, 0, 1) : 1;
      // Retarget the landing spot to the receiver's LIVE position, leading only by the airtime that's left.
      // (Before, tx/ty were fixed at throw time and over-led, so the ball flew PAST the receiver and then
      //  snapped back on the catch. Now the lead → 0 at arrival, so the ball meets him in stride — no overshoot.)
      const rcv=this.target;
      if(rcv && !rcv.down){ const remain=Math.max(0, b.airTime-elapsed);
        b.tx = rcv.x + (rcv.vx||0)*remain*0.6;
        b.ty = rcv.y + (rcv.vy||0)*remain*0.6; }
      // lerp x/y along the (retargeted) line to the receiver
      b.x = b.ox + (b.tx-b.ox)*frac;
      b.y = b.oy + (b.ty-b.oy)*frac;
      // arc height: sin(frac*PI) rises and falls; store as b.z for draw()
      b.z = b.arcH * Math.sin(frac * Math.PI);
      b.frac=frac;
      b.trail=b.trail||[]; b.trail.push([b.x,b.y,b.z]); if(b.trail.length>22)b.trail.shift();
      if(frac>=1){ this.catchResolve(); } }
    separateBodies(this,dt);
    // ---- tackle / boundary / TD ---- (only a true ball-carrier with possession)
    const car=this.carrier;
    if(car && car.hasBall && !this.result){
      if(car.x>=FL-EZ){ this.end('TD', car); return; }
      if(car.y<=0.6||car.y>=FW-0.6){ this.end('oob', car); return; }
      if(this.script && this.gainTarget<999){
        const tackler=this.scriptTackler||assignScriptTackler(this,car);
        const reached=(car.x-this.los)>=this.gainTarget-0.25;
        if(reached && tackler){
          const td=dist(tackler,car);
          // Mark wrapping state for draw() visual — tackler wraps when close
          if(td<1.8){ tackler.wrapping={t:this.t}; }
          if(this.readyToResolve()){
            if(this._reachedAt==null) this._reachedAt=this.t;
            // blow the whistle as soon as the tackler arrives — or after a short grace, so the result isn't held waiting on pursuit
            if(td<1.35 || (this.t-this._reachedAt)>0.45){ this.lastTackler=tackler; this.end('tackle', car); return; }
          }
          // carrier pulls up at the modeled spot while the tackler closes hard
          car.vx*=0.72; car.vy*=0.72;
          steer(tackler, car.x-0.2, car.y+(tackler.y<car.y?-0.2:0.2), dt, 1.7);
        }
        // gang tackle: assign a second helper pursuer to converge when carrier is near the stop point
        if(!this.gangTackler && tackler && (car.x-this.los)>=this.gainTarget-4){
          let best=null,bd=1e9;
          def.filter(e=>e!==tackler&&!e.down&&!e.fallen&&!e.blocker).forEach(d=>{
            const dd=dist(d,car); if(dd<bd&&dd<12){bd=dd;best=d;}
          });
          if(best){ this.gangTackler=best; }
        }
        if(this.gangTackler && !this.gangTackler.down && !this.gangTackler.fallen){
          // Spread gang tackler: offset target by ±1 yd laterally so it doesn't stack on the script tackler.
          // Approach angle is from the gang tackler's current side relative to the carrier.
          const gt=this.gangTackler;
          const spreadY=clamp(car.y + (gt.y<car.y ? -1.1 : 1.1), 3, FW-3);
          const spreadX=car.x + (car.vx||0)*0.25;
          steer(gt, spreadX, spreadY, dt, 1.05);
        }
      } else if(this.gainTarget<999 && (car.x-this.los)>=this.gainTarget){ this.end('tackle', car); return; }
      // an unblocked defender right on top of him can still end it early (a TFL/quick stop)
      let tk=null,td=1e9; def.forEach(d=>{ if(d.blocker && !d.shed) return; const dd=dist(d,car); if(dd<td){td=dd;tk=d;}});
      if(tk && td<0.8 && (car.x-this.los) < this.gainTarget-2 && Math.random()<0.04 && !this.script){ this.end('tackle', car); }   // scripted plays run to their modeled gain
    }
    // ---- BROKEN TACKLES: the carrier beats a closing defender (visual drama; the modeled gain is unchanged) ----
    if(car && car.hasBall && car.team==='off' && this.breaksLeft && this.breaksLeft.length && (car.x-this.los) < this.gainTarget-3 && this.t>0.5){
      for(const d of def){ if(d.down||d.fallen||d===this.scriptTackler) continue;
        if(dist(d,car)<1.3){ const mv=this.breaksLeft.shift();
          d.fallen={t:this.t,type:mv.type}; d.vx*=0.15; d.vy*=0.15;
          car.broke=(car.broke||0)+1; car.move={type:mv.type,t:this.t}; car.vx*=1.18;
          this.impacts.push({x:car.x,y:car.y,t:this.t,kind:mv.type}); this.fxLog.push(mv.type);
          if(this.onMoment) this.onMoment({kind:mv.type, who:car.p, on:d.p});
          this._emit('breakTackle', {carrier:car.p, moveType:mv.type, yardLine:Math.round(car.x-EZ)});
          break; } }
    }
    // pass play with no throw after ~3.2s + pressure -> sack/scramble or throwaway
    // Only applies if QB still has the ball (not if receiver already caught it)
    if(this.play==='pass' && !this.thrown && !this._catchDone && this.t>3.2){ const pressUp=def.some(d=>d.role!=='DB'&&dist(d,this.qb)<1.4);
      if(pressUp){ if(A(this.qb.p,'AG')>72 && Math.random()<0.5){ this.carrier=this.qb; this.qb.hasBall=true; this.handoff=true; } else this.end('sack',this.qb); }
      else if(this.t>4.0){ this.forceThrow(def); } }
    if(this.t>9){
      const late=this.carrier||carrier||this.qb;
      if(this.script && late && late.hasBall){
        const tk=this.scriptTackler||assignScriptTackler(this,late);
      if(tk && dist(tk,late)>1.15){ tk.x=late.x-0.55; tk.y=late.y+(tk.y<late.y?-0.35:0.35); }
      this.lastTackler=tk||nearestDef(this,late);
      }
      this.end('tackle', late);
    }
    this.ents.forEach(e=>{ if(!e.down){ e.trail=e.trail||[]; e.trail.push([e.x,e.y]); if(e.trail.length>22)e.trail.shift(); } });
  };

  FieldSim.prototype.tryPass=function(def){
    if(this.thrown||this.scrambling||this._decided) return;
    // SCRIPTED: resolve the predetermined outcome from resolvePlay
    if(this.script){ if(this.t < 1.15) return;
      if(this.script.result==='sack'){
        if(!this.readyToResolve()) return;
        this._decided=true; this.lastTackler=nearestDef(this,this.qb); this.end('sack', this.qb); return;
      }
      this._decided=true;
      const cands=this.recv.filter(r=>!r.down).sort((a,b)=>a.x-b.x); if(!cands.length){ this.end('sack',this.qb); return; }
      const tgt = this.forcedTarget || (this.script.yards>=17 ? cands[cands.length-1] : cands[Math.min(1,cands.length-1)]);
      this.throwTo(tgt); return; }
    const qb=this.qb, mobile=(A(qb.p,'SP')+A(qb.p,'AG'))/2;     // Lamar-type QBs take off
    const pressure = def.some(d=>d.role!=='DB' && d.shed!==false && dist(d,qb)<2.3);
    if(this.t < (pressure?0.95:1.5)) return;                 // one read, at the dropback point
    this._decided=true;
    const cands=this.recv.filter(r=>r.x>this.los+1).sort((a,b)=>a.x-b.x);   // shallow -> deep
    const open=cands.filter(r=>{ let nd=1e9; def.forEach(d=>{const dd=dist(d,r);if(dd<nd)nd=dd;}); return nd>2.2; });
    // 1) mobile QB scrambles (also how he escapes sacks)
    if(mobile>=74 && (pressure || !open.length) && Math.random() < 0.06 + (mobile-74)/100*0.5){
      this.scrambling=true; this.carrier=qb; qb.hasBall=true; qb.scrambled=true;
      this.gainTarget = Math.round(clamp(5 + (mobile-70)*0.12 + rnd(-3,4) + (Math.random()<0.08?ri(8,30):0), -3, 60)); return;
    }
    // 2) sack — a non-escaping QB goes down (~7% of dropbacks, OL/DL adjusted)
    if(Math.random() < this.sackP){ this.end('sack', qb); return; }
    // 3) throw — short-biased progression with an occasional shot
    if(!cands.length){ this.end('sack', qb); return; }
    let idx=0; const r=Math.random();
    if(r<0.46) idx=0; else if(r<0.74) idx=Math.min(1,cands.length-1); else idx=cands.length-1;
    this.throwTo(cands[idx]);
  };
  FieldSim.prototype.forceThrow=function(def){ const o=this.recv.filter(r=>!r.down).sort((a,b)=>a.x-b.x)[0]; if(o)this.throwTo(o); else this.end('sack',this.qb); };
  FieldSim.prototype.throwTo=function(r){
    this.thrown=true; this.target=r; this.qb.hasBall=false;
    const depth=Math.max(0,r.x-this.los);
    let nd=1e9,cdb=null; this.ents.filter(e=>e.team==='def').forEach(d=>{const dd=dist(d,r);if(dd<nd){nd=dd;cdb=d;}});
    this.cdb=cdb;
    // outcome decided here from a sound model (accuracy, hands, depth, coverage); renderer snapshots it
    const qbAcc=(this.qb.p.TA!=null?this.qb.p.TA:(A(this.qb.p,'ST')+A(this.qb.p,'IN'))/2);   // throwing accuracy drives completion
    let compP = clamp(70 - depth*0.6 + (A(r.p,'HA')-70)*0.3 + (qbAcc-70)*0.3 - (nd<2?(2-nd)*12:0), 12, 94);
    if(this.script){ this._complete = !(this.script.result==='incomplete'||this.script.result==='INT'); this._pick = this.script.result==='INT'; }
    else { this._complete = Math.random()*100 < compP;
      this._pick = !this._complete && cdb && Math.random() < 0.075*(A(cdb.p,'IN')/75); }   // ~7% of incompletions -> ~2.3% of attempts
    const throwPow=this.qb.p.TP!=null?this.qb.p.TP:A(this.qb.p,'ST');
    // air distance determines ball speed and arc; deep balls hang longer
    const dx=r.x-this.qb.x, dy=r.y-this.qb.y;
    const airDist=Math.hypot(dx,dy);
    // Ball speed realistic model: NFL ball travels ~50–55 mph (~73–81 ft/s ≈ 24–27 yd/s at release)
    // but accounting for yardage-coordinate scale and that a 15-yd pass should take ~0.9–1.1s:
    //   spd 13–17 yd/s gives airTime ≈ 0.88–1.15s for 15 yd — human-speed feel.
    // Throw power shifts the range. Short passes are still brisk; deep ones hang more.
    const spd=clamp(13 + throwPow/99*4 - airDist*0.05, 9, 17);
    // air time in seconds
    const airTime=airDist/Math.max(spd, 1);
    // arc height: peak height proportional to airDist (deep balls peak higher)
    // short (<5yd): ~0.8yd; medium (15yd): ~2.5yd; deep (40yd): ~7yd — realistic parabola
    const arcH=clamp(airDist*0.16+0.6, 0.8, 8.0);
    // Lead the receiver to where they will BE when the ball arrives, not where they are now.
    // Use the full airTime so the ball meets the receiver in stride.
    const leadT=airTime*0.90;
    const tx=r.x+r.vx*leadT, ty=r.y+r.vy*leadT;
    this.ball={x:this.qb.x,y:this.qb.y, tx, ty,
      ox:this.qb.x,oy:this.qb.y,   // origin for arc computation
      spd, airTime, arcH,
      t0:this.t,    // timestamp when ball was thrown
      trail:[]};
    this._emit('throw', {qb:this.qb.p, target:r.p, airYards:Math.round(depth), deep:depth>=15});
  };
  FieldSim.prototype.catchResolve=function(){
    const r=this.target;
    // Ball sits at the landing spot while we wait for minT (applies to both complete and incomplete)
    if(this.script && !this.readyToResolve()){
      this.ball.x=this.ball.tx; this.ball.y=this.ball.ty; this.ball.z=0; this.ball.trail=this.ball.trail||[];
      return;
    }
    if(this._complete){ this.ball=null; this.thrown=false; this._catchDone=true; this.carrier=r; r.hasBall=true;
      // Catch in stride: receiver keeps their current velocity — no stop-and-restart.
      // vx/vy are already set from runRoute steering; we just nudge them upfield so the
      // catch-to-YAC transition is smooth. Don't zero them out.
      const spNow=Math.hypot(r.vx,r.vy);
      if(spNow<r.ms*0.4){
        // receiver was barely moving (e.g. came out of a curl) — give them a gentle upfield push
        r.vx=Math.max(r.vx, r.ms*0.35);
      }
      this.gainTarget = this.script ? this.script.yards : Math.round(r.x-this.los) + sampleYAC(A(r.p,'AG'));
      if(this.script) assignScriptTackler(this,r);
      this._emit('catch', {receiver:r.p, yardLine:Math.round(r.x-EZ)}); }   // scripted total, else air + modeled YAC
    else {
      this._catchDone=true;
      if(this._pick){ this._emit('intercepted', {db:this.cdb&&this.cdb.p}); this.startReturn(this.cdb); }
      else { this._emit('incomplete', {target:r.p}); this.end('incomplete', r); }
    }
  };
  FieldSim.prototype.end=function(outcome,who){
    const isRet = outcome==='INTret'||outcome==='pick6';
    // Scripted plays must land on the exact modeled yardage — including sacks. Sack yardage
    // used to be reconstructed from the QB's live x position at whistle time, which drifted
    // by a yard whenever pursuit/pocket timing shifted slightly (a latent contract violation
    // that only needed the right pursuit tweak to surface). Pin it to script.yards like every
    // other outcome type; only truly unscripted plays (full-game sim) fall back to live position.
    const gained = (this.script && !['incomplete','INT','INTret','pick6'].includes(outcome)) ? Math.round(this.script.yards||0) : ((['incomplete','INT','INTret','pick6'].includes(outcome)) ? 0 : Math.round(((who?who.x:this.los)-this.los)));
    const brokeN=(who&&who.broke)||0;
    const brk = brokeN===1?'breaks a tackle':brokeN===2?'breaks two tackles':'breaks three tackles';
    let text;
    if(outcome==='TD') text=`TOUCHDOWN! ${who.p.name}${brokeN?` ${brk}, and`:''} takes it ${gained} to the house!`;
    else if(outcome==='tackle') text=`${who.p.name}${brokeN?` ${brk} and`:''} ${gained>=0?'picks up':'loses'} ${Math.abs(gained)}.`;
    else if(outcome==='oob') text=`${who.p.name}${brokeN?` ${brk},`:''} gets ${gained} and steps out.`;
    else if(outcome==='sack'){ const rusher=this.lastTackler||nearestDef(this,this.qb); const pr=rusher?A(rusher.p,'ST'):70;
      this.monsterSack=(this.drama&&this.drama.monsterSack)||(pr>80&&this.t<3.0)||gained<=-9;
      if(this.qb) this.qb.fallen={t:this.t,type:'sack'}; if(rusher){ rusher.sackPose={t:this.t}; this.lastTackler=rusher; }
      text=this.monsterSack ? `BURIED! ${this.qb.p.name} is dropped for ${Math.abs(gained)} — ${rusher?lastName(rusher.p):'the rush'} came clean!` : `Sacked! ${this.qb.p.name} goes down for ${Math.abs(gained)}.`; }
    else if(outcome==='incomplete') text=`Incomplete, intended for ${who.p.name}.`;
    else if(outcome==='INT') text=`INTERCEPTED by ${who.p.name}!`;
    else if(outcome==='INTret') text=`INTERCEPTED — ${who.p.name} returns it ${this.returnYards||0}!`;
    else if(outcome==='pick6') text=`PICK SIX! ${who.p.name} takes it ${this.returnYards||0} the other way — house call!`;
    this.result={outcome:isRet?'INT':outcome, yards:gained, text, who:who&&who.p, pick6:outcome==='pick6', returnYards:this.returnYards||0, broke:brokeN, monsterSack:!!this.monsterSack};
    if((outcome==='tackle'||outcome==='sack'||isRet) && who){
      const tk=this.lastTackler||nearestDef(this,who);
      if(tk){ this.contact={x:(who.x+tk.x)/2,y:(who.y+tk.y)/2,tackler:tk,carrier:who,outcome,
          // capture velocities at contact moment so draw() can animate brief momentum slide
          cvx:who.vx||0,cvy:who.vy||0,tvx:tk.vx||0,tvy:tk.vy||0,t0:this.t}; }
      this.impacts=this.impacts||[]; this.impacts.push({x:who.x,y:who.y,t:this.t,kind:this.monsterSack?'monster':'tackle'});
    }
    if(who) who.down = ['tackle','sack','INTret','pick6'].includes(outcome);
    // ---- EVENT: terminal outcomes ----
    if(outcome==='TD') this._emit('touchdown', {carrier:who&&who.p, yards:gained});
    else if(outcome==='sack') this._emit('sack', {qb:who&&who.p, yards:gained, monster:!!this.monsterSack});
    else if(outcome==='incomplete') { /* already emitted from catchResolve */ }
    else if(outcome==='INT'||outcome==='INTret') this._emit('intercepted', {db:who&&who.p, returnYards:this.returnYards||0});
    else if(outcome==='pick6') this._emit('pick6', {db:who&&who.p, returnYards:this.returnYards||0});
    else if(outcome==='oob'||outcome==='tackle') this._emit('tackle', {carrier:who&&who.p, yardLine:Math.round((who?who.x:this.los)-EZ), gain:gained});
  };
  FieldSim.prototype.readyToResolve=function(){ return !this.script || this.t >= (this.minT||0); };

  // ---------- rendering ----------
  // ---------- rendering: full broadcast field — all 100 yards + end zones, NFL furniture, logo, overlay ----------
  // NFL hash positions: hashes are 70'9" from each sideline = 23.58 yds inset.
  // We use approx 18.5 yd from each sideline (traditional TV rendering, slightly compressed).
  const HASH_L = 18.5, HASH_R = FW - 18.5; // yard positions of left/right hash rows

  FieldSim.prototype.draw=function(){
    const ctx=this.ctx, cv=this.cv, W=cv.width, H=cv.height, T=this.t||0;
    // ---- full-field coordinate transform: all 120 yards maps to full canvas width ----
    const sx=W/FL, sy=H/FW;
    const X=x=>x*sx, Y=y=>y*sy;
    const cleanHex=(c,fb)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:fb;
    const hexA=(h,a)=>{ const n=parseInt(cleanHex(h,'#2563eb').slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; };
    const luma=(hex)=>{ const n=parseInt(cleanHex(hex,'#2563eb').slice(1),16); const r=(n>>16)&255,g=(n>>8)&255,b=n&255; return 0.299*r+0.587*g+0.114*b; };

    const theme=this.fieldTheme||this.homeTeam||this.off||{};
    const awayTheme=this.awayTeam||this.def||{};
    const homePri=cleanHex(theme.pri,'#1a3c6e');
    const homeSec=cleanHex(theme.sec,'#c9a227');
    const awayPri=cleanHex(awayTheme.pri,'#8b1a1a');
    const homeAbbr=(theme.abbr||'').toLowerCase();
    const awayAbbr=(awayTheme.abbr||'').toLowerCase();
    const homeNick=theme.nick||theme.abbr||'HOME';
    const awayNick=awayTheme.nick||awayTheme.abbr||'AWAY';

    // ---- determine ball hash (0=left,1=center,2=right) ----
    // Use explicit ballHash if set, otherwise derive from ball/carrier y position
    let ballHash=this.ballHash!=null?this.ballHash:1;
    const focusEnt=(this.carrier&&this.carrier.hasBall&&this.carrier)||this.qb||null;
    if(this.ballHash==null && focusEnt){
      const fy=focusEnt.y;
      if(fy<FW*0.33) ballHash=0;
      else if(fy>FW*0.67) ballHash=2;
      else ballHash=1;
    }
    const hashNames=['left','center','right'];

    // ---- GRASS FIELD: alternating stripes every 5 yards ----
    ctx.clearRect(0,0,W,H);
    const stripe1='#1a4a1e', stripe2='#1e5422';
    for(let yd=0;yd<FL;yd+=5){
      ctx.fillStyle=((yd/5)%2===0)?stripe1:stripe2;
      ctx.fillRect(Math.round(X(yd)),0,Math.round(X(yd+5))-Math.round(X(yd))+1,H);
    }

    // ---- END ZONES (home=left EZ 0..10, away=right EZ 110..120) ----
    // Home end zone (offense attacks right, home defends left)
    const drawEndZone=(xStart,xEnd,pri,sec,abbr,nick,flip)=>{
      const px0=Math.round(X(xStart)), px1=Math.round(X(xEnd));
      const w=px1-px0;
      // fill with team primary color, darkened
      ctx.fillStyle=hexA(pri,0.78);
      ctx.fillRect(px0,0,w,H);
      // diagonal texture lines
      ctx.save(); ctx.beginPath(); ctx.rect(px0,0,w,H); ctx.clip();
      ctx.strokeStyle=hexA(pri,0.22); ctx.lineWidth=1;
      for(let d=-H;d<w;d+=14){
        ctx.beginPath(); ctx.moveTo(px0+d,0); ctx.lineTo(px0+d+H,H); ctx.stroke();
      }
      ctx.restore();
      // team name text along the center of the end zone
      const cx=(px0+px1)/2;
      ctx.save();
      ctx.translate(cx, H/2);
      if(flip) ctx.rotate(Math.PI);
      ctx.font='bold '+Math.max(10,Math.min(28,w*0.13))+'px Inter,system-ui,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.letterSpacing='0.12em';
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillText(nick.toUpperCase(),1.5,1.5);
      ctx.fillStyle=luma(pri)>80?'rgba(0,0,0,0.85)':'rgba(255,255,255,0.92)';
      ctx.fillText(nick.toUpperCase(),0,0);
      ctx.restore();
    };
    drawEndZone(0,EZ,homePri,homeSec,homeAbbr,homeNick,true);
    drawEndZone(FL-EZ,FL,awayPri,cleanHex(awayTheme.sec,'#999'),awayAbbr,awayNick,false);

    // ---- GOAL LINES ----
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2.5;
    for(const gl of [EZ,FL-EZ]){
      const gpx=Math.round(X(gl))+0.5;
      ctx.beginPath(); ctx.moveTo(gpx,0); ctx.lineTo(gpx,H); ctx.stroke();
    }
    // ---- GOALPOST (field-goal plays): bright uprights on the far end line so the kick has a target ----
    if(this.play==='fg'){
      const gx=X(FL-0.5), gy=Y(FW/2), half=Y(3.1)-Y(0);
      ctx.save();
      ctx.strokeStyle='#ffd23f'; ctx.lineWidth=Math.max(2.5,H*0.008); ctx.lineCap='round';
      ctx.shadowColor='#ffd23f'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(gx, gy-half); ctx.lineTo(gx, gy+half); ctx.stroke();
      ctx.fillStyle='#ffd23f';
      ctx.beginPath(); ctx.arc(gx, gy-half, Math.max(2.5,H*0.009), 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(gx, gy+half, Math.max(2.5,H*0.009), 0, 7); ctx.fill();
      ctx.restore();
    }

    // ---- YARD LINES: 5-yard faint, 10-yard bold; only in playing field (10..110) ----
    for(let yd=EZ;yd<=FL-EZ;yd+=5){
      const key=yd%10===0, goalLine=(yd===EZ||yd===FL-EZ);
      if(goalLine) continue; // already drawn
      const px=Math.round(X(yd))+0.5;
      ctx.strokeStyle=key?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.22)';
      ctx.lineWidth=key?1.5:0.75;
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    }

    // ---- SIDELINE BORDERS ----
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(X(EZ),0); ctx.lineTo(X(FL-EZ),0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(EZ),H); ctx.lineTo(X(FL-EZ),H); ctx.stroke();

    // ---- HASH MARKS: short tick every yard across the full playing field ----
    const hTickH=Math.max(3, H*0.055);
    ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.lineWidth=1;
    for(let yd=EZ;yd<=FL-EZ;yd++){
      const px=Math.round(X(yd))+0.5;
      for(const hy of [HASH_L, HASH_R]){
        const py=Math.round(Y(hy));
        ctx.beginPath(); ctx.moveTo(px,py-hTickH/2); ctx.lineTo(px,py+hTickH/2); ctx.stroke();
      }
    }

    // ---- HASH ROWS: continuous faint lines showing hash positions ----
    for(const hy of [HASH_L, HASH_R]){
      const py=Math.round(Y(hy))+0.5;
      ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=0.75;
      ctx.setLineDash([4,8]);
      ctx.beginPath(); ctx.moveTo(X(EZ),py); ctx.lineTo(X(FL-EZ),py); ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- YARD NUMBERS on both sidelines ----
    // Numbers: 10,20,30,40,50,40,30,20,10 (standard NFL — distance from nearer goal)
    const numFontH=Math.max(8,Math.min(16,H*0.085));
    const numPad=H*0.055; // distance from sideline to number center
    for(let yd=EZ+10;yd<FL-EZ;yd+=10){
      const fieldYd=yd-EZ; // 0..100
      const num=fieldYd<=50?fieldYd:100-fieldYd;
      if(num===0||num>50) continue;
      const px=X(yd);
      // top sideline number (north)
      ctx.save();
      ctx.translate(px, numPad);
      ctx.font='bold '+numFontH+'px Impact,Arial Narrow,Arial,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(String(num),1,1);
      ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.fillText(String(num),0,0);
      ctx.restore();
      // bottom sideline number (south) — rotated 180 per broadcast convention
      ctx.save();
      ctx.translate(px, H-numPad);
      ctx.rotate(Math.PI);
      ctx.font='bold '+numFontH+'px Impact,Arial Narrow,Arial,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(String(num),1,1);
      ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.fillText(String(num),0,0);
      ctx.restore();
    }

    // ---- MIDFIELD LOGO at yard 60 (the 50-yard line) ----
    const logoYd=FL/2; // absolute yard 60 = midfield
    const logoR=Math.min(W*0.055, H*0.32);
    const logoPx=X(logoYd), logoPy=H/2;
    // Try cached logo image; draw circle fallback immediately, then update on image load
    const logoKey='__logo_'+homeAbbr;
    const drawLogoFallback=()=>{
      ctx.save();
      ctx.globalAlpha=0.22;
      ctx.beginPath(); ctx.arc(logoPx,logoPy,logoR,0,Math.PI*2);
      ctx.fillStyle=homePri; ctx.fill();
      ctx.strokeStyle=homeSec; ctx.lineWidth=2; ctx.stroke();
      ctx.globalAlpha=0.55;
      ctx.font='bold '+Math.round(logoR*0.55)+'px Impact,Arial,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle=luma(homePri)>80?'rgba(0,0,0,0.7)':'rgba(255,255,255,0.8)';
      ctx.fillText((theme.abbr||'').toUpperCase(), logoPx, logoPy);
      ctx.restore();
    };
    if(homeAbbr && typeof window!=='undefined'){
      const cache=window.__fieldLogoCache||(window.__fieldLogoCache={});
      if(!cache[logoKey]){
        const img=new Image();
        img.onload=()=>{ cache[logoKey]=img; };
        img.onerror=()=>{ cache[logoKey]='err'; };
        img.src='logos/'+homeAbbr+'.png';
        cache[logoKey]='loading';
        drawLogoFallback();
      } else if(cache[logoKey]==='loading'||cache[logoKey]==='err'){
        drawLogoFallback();
      } else {
        // Draw the loaded logo centered at midfield
        ctx.save();
        ctx.globalAlpha=0.28;
        ctx.beginPath(); ctx.arc(logoPx,logoPy,logoR*1.05,0,Math.PI*2); ctx.clip();
        const img=cache[logoKey];
        ctx.drawImage(img, logoPx-logoR, logoPy-logoR, logoR*2, logoR*2);
        ctx.restore();
      }
    } else {
      drawLogoFallback();
    }

    // ---- LOS LINE (blue glow) and FIRST DOWN LINE (animated yellow) ----
    const glowLine=(xYd,core,bloom,dashed,dashOffset)=>{
      const px=Math.round(X(xYd))+0.5;
      ctx.save();
      if(dashed){ ctx.setLineDash([8,6]); ctx.lineDashOffset=dashOffset||0; }
      ctx.strokeStyle=bloom; ctx.globalAlpha=0.30; ctx.lineWidth=6;
      ctx.shadowColor=bloom; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
      ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.strokeStyle=core; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    };
    glowLine(this.los,'#5B95F2','#3D7BE0',false);
    if(this.firstDown!=null) glowLine(this.firstDown,'#FFC83D','#F0B429',true,-(T*22)%26);

    // ---- BALL SPOT on correct hash (hidden while ball is in flight — flying ball takes over) ----
    const ballEnt=focusEnt||(this.rb)||(this.qb)||null;
    if(ballEnt && !(this.ball && this.thrown)){
      // the ball rides tucked with whoever actually HAS it — it used to slide along the hash line,
      // which made QB keeps read like the ball was still with the (faking) back at the mesh.
      const held=!!ballEnt.hasBall;
      const ballX=held?ballEnt.x+0.55:ballEnt.x, ballY=held?ballEnt.y+0.45:(hashNames[ballHash]==='left'?HASH_L:hashNames[ballHash]==='right'?HASH_R:FW/2);
      const bpx=X(ballX), bpy=Y(ballY);
      ctx.save();
      ctx.fillStyle='#F0A52A'; ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1;
      ctx.shadowColor='#F0A52A'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.ellipse(bpx,bpy,5,3.5,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.stroke();
      ctx.restore();
    }

    // ---- PLAYERS: compact colored tokens in full-field context ----
    const ents=this.ents||[];
    const isLine=e=>e.role==='OL'||e.role==='DL';
    const isSkill=e=>e.role==='QB'||e.role==='RB'||e.role==='WR'||e.role==='TE';
    const letterFor=e=>{ switch(e.role){ case'QB':return'Q'; case'RB':return'R'; case'WR':return'W'; case'TE':return'T'; case'DL':return'E'; case'LB':return'L'; case'K':return'K'; case'P':return'P'; case'DB':return (e.p&&/^S/.test(e.p.pos||''))?'S':'C'; } return ''; };
    const car=this.carrier&&this.carrier.hasBall?this.carrier:null;

    // Scale player tokens to work in full-field view — smaller than zoomed view
    const R=Math.max(5, Math.min(10, W/130));
    const fontPx=r=>'700 '+Math.round(r*1.05)+'px Inter,system-ui,ui-sans-serif';

    // Contact-slide: brief momentum-carry visual after tackle/sack — entities nudge
    // forward then settle. Pure draw-layer effect: does not alter actual x/y.
    const slideWin=0.38; // seconds of slide animation after contact
    const getSlide=(e)=>{
      const c=this.contact;
      if(!c||!this.result) return {dx:0,dy:0};
      const age=T-c.t0;
      if(age<0||age>slideWin) return {dx:0,dy:0};
      const k=1-(age/slideWin); // 1→0 decay
      if(e===c.carrier){
        // carrier slides forward with decaying momentum
        return {dx:X(c.cvx*age*k*0.35), dy:Y(c.cvy*age*k*0.35)};
      } else if(e===c.tackler){
        // tackler lunges into the pile
        return {dx:X(c.tvx*age*k*0.25), dy:Y(c.tvy*age*k*0.25)};
      }
      return {dx:0,dy:0};
    };
    const drawToken=(e,carrier)=>{
      if(e.x<0||e.x>FL||e.y<0||e.y>FW) return; // out of bounds guard
      const sl=getSlide(e);
      let px=X(e.x)+sl.dx, py=Y(e.y)+sl.dy;
      const off=e.team==='off', r=isLine(e)?R*0.7:R;
      const mv=(e.move && (T-e.move.t)<0.5)?e.move:null, mvk=mv?(T-mv.t)/0.5:0;
      ctx.save();

      if(e.fallen){
        ctx.globalAlpha=0.38; ctx.translate(px,py); ctx.rotate(0.6);
        ctx.fillStyle='#4b545e'; ctx.beginPath(); ctx.ellipse(0,0,r,r*0.55,0,0,7); ctx.fill();
        ctx.restore(); return;
      }

      let scale=1, lift=0, rot=0;
      if(mv){
        if(mv.type==='hurdle'){ scale=1+Math.sin(mvk*Math.PI)*0.45; lift=Math.sin(mvk*Math.PI)*r*1.0; }
        else if(mv.type==='spin'){ rot=mvk*Math.PI*2; }
        else if(mv.type==='truck'){ scale=1+Math.sin(mvk*Math.PI)*0.16; }
      }

      if(carrier){
        py-=lift;
        if(lift>0){ ctx.globalAlpha=0.28; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(px,py+lift,r*0.75,r*0.36,0,0,7); ctx.fill(); ctx.globalAlpha=1; }
        // pulsing spotlight
        const bgl=0.10+0.05*Math.sin(T*4.2);
        ctx.save(); ctx.globalAlpha=Math.max(0.05,bgl); ctx.shadowColor='#fff'; ctx.shadowBlur=14; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px,py,r*scale*1.3,0,7); ctx.fill(); ctx.restore();
        // white chip
        const cg=ctx.createRadialGradient(px-r*0.28,py-r*0.36,1,px,py,r*scale);
        cg.addColorStop(0,'#fff'); cg.addColorStop(1,'#d0ddd8');
        ctx.fillStyle=cg; ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
        ctx.beginPath(); ctx.arc(px,py,r*scale,0,7); ctx.fill(); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
        const L=letterFor(e); if(L){ ctx.fillStyle='#0B0E0C'; ctx.font=fontPx(r*scale); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(L,px,py+r*0.05); }
        // gold ball pip
        const pipA=-0.5+(mv&&mv.type==='spin'?rot:0);
        ctx.fillStyle='#F0A52A'; ctx.beginPath(); ctx.arc(px+Math.cos(pipA)*r*0.76,py+Math.sin(pipA)*r*0.76,r*0.30,0,7); ctx.fill();
        ctx.restore(); return;
      }

      // Non-carrier: team-color chips
      // Line-of-scrimmage collision flinch: a brief scale pop when two blocked bodies
      // are actively engaged (OL vs DL) — sells the "thump" of the initial hit at the snap
      // instead of two circles silently overlapping with no sense of contact.
      const bumpK=e.bump>0?Math.min(1,e.bump/0.34):0;
      const engageScale=1+bumpK*0.22;
      ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=2; ctx.shadowOffsetY=1;
      const chipColor=off?homePri:awayPri;
      const ringColor=off?homeSec:cleanHex(awayTheme.sec,'#aaaaaa');
      ctx.fillStyle=chipColor; ctx.beginPath(); ctx.arc(px,py,r*engageScale,0,7); ctx.fill();
      ctx.shadowBlur=0; ctx.shadowOffsetY=0;
      ctx.strokeStyle=ringColor; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(px,py,r*engageScale-0.75,0,7); ctx.stroke();
      const L=letterFor(e);
      if(L && r>=7){
        ctx.fillStyle=luma(chipColor)>80?'rgba(0,0,0,0.9)':'rgba(255,255,255,0.95)';
        ctx.font=fontPx(r*engageScale); ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(L,px,py+r*0.06);
      }
      // tackle-wrap ring: pulsing red arc when defender is wrapping on the carrier
      if(e.wrapping && (T-e.wrapping.t)<0.45 && e.team==='def'){
        const wk=(T-e.wrapping.t)/0.45;
        ctx.save(); ctx.globalAlpha=(1-wk)*0.75;
        ctx.strokeStyle='#ff3a3a'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(px,py,r*(1+wk*0.7),0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };

    // ---- comet trails ----
    // Breakaway emphasis: once the carrier is clearly in open space on a big scripted gain
    // (well past the LOS with real yardage still ahead), the trail runs brighter/thicker —
    // a cheap, tasteful way to make a house call FEEL faster/bigger than a routine run,
    // without touching the underlying speed/physics.
    const bigGainInFlight = !!(car && this.script && this.gainTarget>=20 && (car.x-this.los) < this.gainTarget+2 && (car.x-this.los)>5);
    ctx.lineCap='round';
    ents.forEach(e=>{ const carr=(e===car); if(!(isSkill(e)||carr)||!e.trail||e.trail.length<2) return;
      const hot=carr&&bigGainInFlight;
      for(let i=1;i<e.trail.length;i++){ const a=(i/e.trail.length)*(carr?(hot?0.62:0.45):0.14); ctx.strokeStyle=carr?(hot?'rgba(255,232,170,'+a+')':'rgba(242,245,244,'+a+')'):'rgba(150,180,210,'+a+')'; ctx.lineWidth=carr?(hot?3.0:2.2):1.5; ctx.beginPath(); ctx.moveTo(X(e.trail[i-1][0]),Y(e.trail[i-1][1])); ctx.lineTo(X(e.trail[i][0]),Y(e.trail[i][1])); ctx.stroke(); }});

    // ---- ball in flight: ONE ball travelling its path, with a subtle lift ----
    // (No ground shadow, and the lift is small + capped — the old ~19px/yd lift floated the ball far from its
    //  shadow, so it read as TWO balls drifting apart. Top-down view: height is only a gentle hint.)
    if(this.ball && this.thrown){ const b=this.ball;
      const bz=b.z||0;                          // arc height in yards
      const liftScale = H * 0.012;              // subtle: ~6px/yd at 500px
      const capLift = H * 0.055;                // never let the ball drift more than ~5.5% of the field off its line
      const liftOf = z => Math.min((z||0)*liftScale, capLift);
      // trail (path travelled so far)
      if(b.trail && b.trail.length>1) for(let i=1;i<b.trail.length;i++){
        const age=(i/b.trail.length);
        const trailY=Y(b.trail[i][1]) - liftOf(b.trail[i][2]);
        const prevY=Y(b.trail[i-1][1]) - liftOf(b.trail[i-1][2]);
        ctx.strokeStyle='rgba(240,165,42,'+(age*0.5)+')'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(X(b.trail[i-1][0]),prevY); ctx.lineTo(X(b.trail[i][0]),trailY); ctx.stroke();
      }
      const ballPY = Y(b.y) - liftOf(bz);
      const ballScale=1+clamp(bz*0.03,0,0.2);   // grows a touch near the peak
      const angle=(b.tx-b.ox)>0 ? Math.atan2((b.ty-b.oy),(b.tx-b.ox)) : 0;
      ctx.save(); ctx.fillStyle='#F0A52A'; ctx.shadowColor='rgba(240,165,42,0.9)'; ctx.shadowBlur=8;
      ctx.translate(X(b.x), ballPY);
      ctx.rotate(angle*0.35);                    // tilt toward the throw direction
      ctx.beginPath(); ctx.ellipse(0,0, 5.2*ballScale, 3.1*ballScale, 0,0,7); ctx.fill();
      ctx.restore(); }

    // ---- impact pulses: a real "thump" — a bright flash burst at contact that
    // rings outward and fades, instead of a faint ring that's easy to miss at
    // full-field broadcast zoom. Monster hits (big sacks/breaks) get a bigger,
    // longer, hotter burst so the biggest moments read as biggest on screen. ----
    (this.impacts||[]).forEach(im=>{ const dur=im.kind==='monster'?0.75:0.6; const age=T-im.t; if(age<0||age>dur) return;
      const k=age/dur, isMon=im.kind==='monster';
      const ix=X(im.x), iy=Y(im.y);
      // core flash: hot, tight, fast-decaying — reads as the instant of contact.
      // Sized against the player-token radius (not a fixed px count) so it reads clearly
      // at full-field broadcast zoom instead of disappearing under the overlapping tokens
      // of a tackle pile.
      const flashK=Math.max(0,1-age/0.18);
      if(flashK>0){ ctx.save(); ctx.globalAlpha=flashK*(isMon?0.95:0.8);
        const fRad=(isMon?2.4:1.9)*R;
        const fg=ctx.createRadialGradient(ix,iy,0,ix,iy,fRad);
        fg.addColorStop(0,isMon?'#fff3d6':'#ffffff'); fg.addColorStop(0.6,isMon?'rgba(255,220,150,0.7)':'rgba(255,255,255,0.55)'); fg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(ix,iy,fRad,0,7); ctx.fill(); ctx.restore(); }
      // expanding shockwave ring(s) — monster hits get a double ring for extra punch
      const rad=(isMon?1.8*R:1.3*R)+k*(isMon?34:22);
      ctx.save(); ctx.globalAlpha=(1-k)*0.85; ctx.strokeStyle=isMon?'#ff5b6b':im.kind==='tackle'?'rgba(255,255,255,0.95)':'#FFC83D';
      ctx.lineWidth=isMon?3.5:2.6; ctx.beginPath(); ctx.arc(ix,iy,rad,0,7); ctx.stroke(); ctx.restore();
      if(isMon){ const rad2=1.4*R+k*20; ctx.save(); ctx.globalAlpha=(1-k)*0.55; ctx.strokeStyle='#fff'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(ix,iy,rad2,0,7); ctx.stroke(); ctx.restore(); }
    });

    // ---- BIG-MOMENT WASH: a brief gold flash across the scoring end zone on a TD/pick-6 —
    // the house-call moment should feel bigger on screen than a routine tackle. Purely a
    // draw-layer wash keyed off this.result + this.t (which freezes once the play ends), so
    // it does not touch outcome math and simply plays out over the first ~0.9s after the whistle. ----
    if(this.result && (this.result.outcome==='TD' || this.result.pick6)){
      const scoreT = this._scoreFxT0==null ? (this._scoreFxT0=T) : this._scoreFxT0;
      const age=T-scoreT;
      if(age>=0 && age<0.9){
        const k=age/0.9;
        const goingRight = this.result.outcome==='TD' ? true : false; // pick6 runs toward EZ+0.3 (home side)
        const ezX0 = goingRight ? FL-EZ : 0, ezX1 = goingRight ? FL : EZ;
        const px0=X(ezX0), px1=X(ezX1);
        ctx.save();
        ctx.globalAlpha=(1-k)*0.35;
        const wg=ctx.createLinearGradient(px0,0,px1,0);
        wg.addColorStop(0,'rgba(255,220,120,0)'); wg.addColorStop(1,'rgba(255,220,120,0.9)');
        ctx.fillStyle=wg; ctx.fillRect(Math.min(px0,px1),0,Math.abs(px1-px0),H);
        ctx.restore();
      }
    }

    // ---- draw all players ----
    ents.filter(e=>e.fallen).forEach(e=>drawToken(e,false));
    ents.filter(e=>!e.fallen&&isLine(e)).forEach(e=>drawToken(e,false));
    ents.filter(e=>!e.fallen&&!isLine(e)&&e!==car).forEach(e=>drawToken(e,false));
    if(car) drawToken(car,true);

    // ---- CARRIER SPOTLIGHT (behind player layer so it appears as field glow) ----
    if(car){ const g=ctx.createRadialGradient(X(car.x),Y(car.y),2,X(car.x),Y(car.y),44); g.addColorStop(0,'rgba(220,235,255,0.08)'); g.addColorStop(1,'rgba(220,235,255,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(X(car.x),Y(car.y),44,28,0,0,7); ctx.fill(); }

    // ---- OVERLAY: down/distance, field position, hash, possession arrow ----
    const gs=this.gameState||null;
    const down=gs?gs.down:null, toGo=gs?gs.toGo:null, poss=gs?gs.poss:null;
    const ballOnYd=this.los!=null?Math.round(this.los-EZ):null; // 0..100
    // Build overlay text
    const overlayLines=[];
    if(down!=null && toGo!=null){
      const ordinals=['','1st','2nd','3rd','4th'];
      overlayLines.push((ordinals[down]||down+'th')+' & '+toGo);
    }
    if(ballOnYd!=null){
      const fieldPos=ballOnYd<=50?'OWN '+ballOnYd:(ballOnYd<100?'OPP '+(100-ballOnYd):'GOAL');
      overlayLines.push(fieldPos+' · '+hashNames[ballHash]+' hash');
    }

    if(overlayLines.length){
      const overlayX=W*0.008, overlayY=H*0.06;
      const lineH=Math.max(11,Math.min(16,H*0.075));
      const pad=5;
      const overlayW=Math.max(...overlayLines.map(l=>{ ctx.font='600 '+lineH+'px Inter,system-ui,sans-serif'; return ctx.measureText(l).width; }))+pad*2;
      const overlayH=overlayLines.length*lineH+pad*2;
      ctx.save();
      ctx.globalAlpha=0.72; ctx.fillStyle='rgba(5,10,15,0.88)';
      ctx.beginPath(); ctx.roundRect?ctx.roundRect(overlayX,overlayY-lineH/2-pad,overlayW,overlayH,4):ctx.rect(overlayX,overlayY-lineH/2-pad,overlayW,overlayH);
      ctx.fill(); ctx.globalAlpha=1;
      ctx.font='600 '+lineH+'px Inter,system-ui,sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='top';
      overlayLines.forEach((line,i)=>{
        ctx.fillStyle='rgba(255,255,255,0.92)';
        ctx.fillText(line, overlayX+pad, overlayY-lineH/2-pad+pad+i*lineH);
      });
      ctx.restore();
    }

    // ---- POSSESSION ARROW: small colored triangle at top-right ----
    if(poss!=null){
      const posTeam=poss==='h'?theme:awayTheme;
      const posColor=cleanHex(posTeam.pri,'#2563eb');
      const posAbbr=(posTeam.abbr||'').toUpperCase();
      const arX=W-6, arY=H*0.07, arH=H*0.055;
      ctx.save();
      ctx.fillStyle=posColor; ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(arX,arY); ctx.lineTo(arX-arH*1.1,arY-arH*0.6); ctx.lineTo(arX-arH*1.1,arY+arH*0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font='bold '+Math.round(arH*0.7)+'px Inter,system-ui,sans-serif';
      ctx.textAlign='right'; ctx.textBaseline='middle';
      ctx.fillStyle=luma(posColor)>80?'#000':'#fff';
      ctx.fillText(posAbbr, arX-arH*1.3, arY);
      ctx.restore();
    }

    // ---- VIGNETTE: subtle edge darkening ----
    const vg=ctx.createRadialGradient(W*0.5,H*0.5,H*0.28,W*0.5,H*0.5,W*0.60);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.32)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  };
	  FieldSim.prototype.run=function(onEnd){
    let guard=0;
    while(!this.result && guard<420){ this.step(1/30); guard++; }
    this.draw();
    if(onEnd) onEnd(this.result||{outcome:'tackle',yards:0,text:'Play blown dead.'});
  };
  FieldSim.prototype.stop=function(){ this.raf=null; this._stopped=true; };

  // Live chunked animation for coached snaps — unfolds the play over time instead of instant final snapshot.
  // Steps physics in small batches, draws frequently for "live broadcast" feel while respecting script enforcement.
  FieldSim.prototype.animateLive = function(onDone, chunkSteps=6, frameDelay=55) {
    this._stopped=false;
    let guard = 0;
    const maxGuard = 520;
    // snap event: fires once at the very start of live animation
    this._emit('snap', {play:this.play, qb:this.qb&&this.qb.p, rb:this.rb&&this.rb.p});
    const tick = () => {
      if(this._stopped) return;
      let did = 0;
      while (!this.result && guard < maxGuard && did < chunkSteps) {
        this.step(1/30);
        guard++;
        did++;
      }
      this.draw();
      if (this.result || guard >= maxGuard) {
        if (onDone) onDone(this.result || {outcome:'tackle', yards:0, text:'Play blown dead.'});
      } else {
        setTimeout(tick, frameDelay);
      }
    };
    tick();
  };

  // ---- carrier / route behaviors ----
  // Speed reference: elite NFL skill player ~9.5–10.5 yd/s (21–23 mph) at top gear.
  // maxSpd() already gives ~5.8–11 yd/s from the SP rating (line 18).
  // We apply a realistic speedMul ≤ 1.0 for carries — no time-compression cheating.
  //
  // CONCEPT CHOREOGRAPHY: sim.concept picks which shape the carry takes before it settles into the
  // shared "past the LOS, upfield" logic below. This is what makes a draw LOOK like a draw (delayed,
  // then downhill) and a toss/sweep LOOK like a sweep (bounces wide to the sideline) instead of every
  // run being the same generic "RB up the middle."
  function runCarrier(e,sim,dt,def,L,mid){
    if(e.stun>0) e.stun-=dt;
    const scriptedRun=sim.script && sim.gainTarget<999;
    const concept=sim.concept;
    // pick (and cache) a stable sweep side for this play so the carrier commits one direction
    if(sim._sweepSide==null) sim._sweepSide = Math.random()<0.5 ? -1 : 1;
    const sweepSide=sim._sweepSide;
    const sweepY = clamp(mid + sweepSide*16, 4, FW-4);   // near-sideline landmark for toss/sweep plays

    // ---- DRAW: sell pass-pro for a beat (sit near the backfield, no downhill burst), THEN hit the hole ----
    if(concept==='draw'){
      const drawDelay = 0.55;
      if(sim.t < drawDelay){
        // mimic a pass-blocking back: drift back/settle just behind the LOS like he's protecting
        steer(e, L-6, mid + Math.sin(sim.t*3)*0.6, dt, 0.42);
        return;
      }
      // after the delay, explode downhill through the biggest interior lane — same gap-finding as inside runs
      if(e.x < L+1.5){
        const lo=mid-7, hi=mid+7;
        const front=def.filter(d=>!d.down && Math.abs(d.x-L)<3.5 && d.y>lo && d.y<hi).map(d=>d.y).sort((a,b)=>a-b);
        const cand=[lo,...front,hi]; let gapY=mid,best=-1;
        for(let i=0;i<cand.length-1;i++){ const g=cand[i+1]-cand[i]; if(g>best){best=g; gapY=(cand[i]+cand[i+1])/2;} }
        steer(e, L+3, gapY, dt, 1.0);
        return;
      }
      // fall through to the shared upfield logic below
    }
    // ---- ZONE READ: QB/RB ride the mesh point close together near the LOS before the ball is decided ----
    else if(concept==='zone_read' && e.x < L+1 && sim.t < 0.4){
      steer(e, L-1.5, mid + sweepSide*1.5, dt, 0.55);
      return;
    }
    // ---- JET MOTION: the jet carrier first crosses the WHOLE formation laterally behind the QB
    // (he lined up on the opposite side — see setup) before the edge bend below takes over. ----
    else if(concept==='jet_sweep' && e===sim.jet && (e.x-L)<2 && Math.abs(e.y-sweepY)>7){
      steer(e, L-5, sweepY, dt, 1.05);
      return;
    }
    // ---- SWEEP / JET SWEEP: real toss/pitch-and-go — carrier bounces WIDE to the sideline landmark
    // before turning upfield, instead of driving straight ahead like an inside run. ----
    else if((concept==='sweep'||concept==='jet_sweep') && (e.x-L) < 6){
      steer(e, L+2, sweepY, dt, 0.95);
      // once he's reached the edge landmark (or is far enough outside the tackles), let him turn upfield
      if(Math.abs(e.y-sweepY) > 3 && (e.x-L) < 5) return;
      // else fall through: he's reached the edge — resume normal upfield logic below with the sideline bend baked in
    }
    // ---- INSIDE (default) and everything else at/behind the line: downhill through the biggest gap ----
    if(e.x < L+1.5){
      // hit the biggest interior lane (between the tackles), running downhill
      const lo=mid-7, hi=mid+7;
      const front=def.filter(d=>!d.down && Math.abs(d.x-L)<3.5 && d.y>lo && d.y<hi).map(d=>d.y).sort((a,b)=>a-b);
      const cand=[lo,...front,hi]; let gapY=mid,best=-1;
      for(let i=0;i<cand.length-1;i++){ const g=cand[i+1]-cand[i]; if(g>best){best=g; gapY=(cand[i]+cand[i+1])/2;} }
      // at or behind the line: drive into the hole at natural speed (no boost)
      steer(e, L+3, gapY, dt, 1.0);
    } else {
      // past the line of scrimmage — upfield, bending away from the two nearest pursuers
      // Decelerate when approaching the scripted stop point so the tackle wraps naturally
      if(sim.script && sim.gainTarget<999 && (e.x-sim.los)>=sim.gainTarget-0.55 && sim.script.result!=='TD'){
        const tk=sim.scriptTackler||assignScriptTackler(sim,e);
        const drift=tk ? (e.y-tk.y)*0.22 : 0;
        // slow to ~0.3 of top speed as the carrier fights through contact
        steer(e, Math.min(e.x+0.5, sim.los+sim.gainTarget+0.3), clamp(e.y+drift,5,FW-5), dt, 0.28);
        return;
      }
      // Lateral avoidance: only react to NON-script-tacklers within 3.5 yds.
      // The script tackler is supposed to eventually catch him — ignoring their y-position
      // lets the carrier run straight-line top speed in open field instead of continuously
      // weaving away from a trailing pursuer who is supposed to tackle at the stop point.
      const near=def.filter(d=>!d.down && d!==sim.scriptTackler)
        .map(d=>({d,dd:dist(d,e)})).sort((a,b)=>a.dd-b.dd).slice(0,2);
      let py=e.y;
      near.forEach(n=>{
        if(n.dd < 3.5){  // tighter range — only avoid defenders who are actually closing in
          const w=(3.5-n.dd)/3.5;
          py += (e.y-n.d.y)/(n.dd||1)*w*3;
        }
      });
      // Natural speed: RBs/scrambling QBs run full speed; receivers on YAC are slightly slower
      let bc = (e.role==='RB'||e.role==='FB'||e.role==='QB') ? (e.broke>0?1.02:0.98) : 0.90;
      // Negative-gain plays: carrier is dragged backward slowly
      if(scriptedRun && sim.gainTarget<=0){
        steer(e, Math.min(e.x+0.8, sim.los+Math.max(-5,sim.gainTarget)+0.3), clamp(py,5,FW-5), dt, 0.52);
        return;
      }
      // Normal upfield run: steer straight ahead at full speed.
      // lookAhead target far enough that the carrier doesn't need to angle — pure forward burst.
      // Sweep/jet concepts keep tracking toward the sideline landmark a bit longer (real toss plays
      // "get north" only after turning the corner) instead of snapping back to a straight-ahead lane.
      const lookAhead=e.x+12;
      const pyFinal=(concept==='sweep'||concept==='jet_sweep') ? py*0.55+sweepY*0.45 : py;
      steer(e, lookAhead, clamp(pyFinal,5,FW-5), dt, bc);
    }
  }
  function runRoute(e,dt){
    if(!e.route||e.ri>=e.route.length){ steer(e,e.x+6,e.y,dt,0.85); return; }
    const w=e.route[e.ri];
    const dToWp=Math.hypot(w[0]-e.x,w[1]-e.y);
    // Decelerate into the break: within 2.5 yds of the waypoint, receiver plants
    // and slows sharply — creates the crisp cut shape instead of a smooth arc.
    // At exactly the waypoint, snap to full-speed heading toward the next point.
    const isLastWp=(e.ri>=e.route.length-1);
    let speedMul;
    if(dToWp < 2.5 && !isLastWp){
      // plant phase: 0.40 speed going in, sharp corner coming out
      speedMul = 0.40 + (dToWp/2.5)*0.52; // ramps down toward 0.40 as receiver arrives
    } else {
      speedMul = 0.92;
    }
    steer(e,w[0],w[1],dt,speedMul);
    if(dToWp<1.0) e.ri++;
  }
  function SIMpickRoute(){ const r=['go','slant','out','curl','post','corner','comeback','seam']; return r[Math.floor(Math.random()*r.length)]; }

  // ---- full-game possession engine (plays the real matchup, returns an ENG-compatible result) ----
  const stubCanvas = { getContext:()=>({ clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},stroke(){},
    moveTo(){},lineTo(){},fillText(){},createLinearGradient:()=>({addColorStop(){}}),set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){} }) };
  function passTendency(off){ const o=off.coach?off.coach.off:72, pb=off.playbook&&off.playbook.off;
    return clamp((pb&&pb.passBias!=null?pb.passBias:0.50) + (o-72)*0.003, 0.38, 0.72); }
  // simulate one play from a yardline; returns {yards,outcome,carrier,target,play}
  function onePlay(off,def,play,absLOS,rules){
    const s=new FieldSim(stubCanvas); s.setup(off,def,play,absLOS); let g=0;
    while(!s.result && g++<600) s.step(1/30);
    const r=s.result||{outcome:'tackle',yards:0};
    return {yards:r.yards, outcome:r.outcome, carrier:s.carrier&&s.carrier.p, target:s.target&&s.target.p, qb:s.qb&&s.qb.p, scrambled:s.qb&&s.qb.scrambled, play};
  }
  function simFullGame(home, away, rules){
    rules=rules||{};
    const drives=[]; let hs=0, as=0, off = Math.random()<0.5?'h':'a';
    const tally={};
    const add=(p,o)=>{ if(!p)return; const t=tally[p.id]||(tally[p.id]={p,pyd:0,ptd:0,ryd:0,rtd:0,recyd:0,rectd:0,rec:0,sack:0,tkl:0}); Object.keys(o).forEach(k=>t[k]+=o[k]); };
    let plays=0, quarter=1; const PLAYS_PER_Q=30;
    while(plays < PLAYS_PER_Q*4){
      const offT = off==='h'?home:away, defT = off==='h'?away:home;
      let los=25, down=1, toGo=10, scored=false, drivePlays=[];
      // a drive
      for(let d=0; d<14 && plays<PLAYS_PER_Q*4; d++){
        plays++; quarter=Math.min(4,Math.floor(plays/PLAYS_PER_Q)+1);
        const goFG = los>=62 && down>=4;
        if(down>=4 && !goFG){ if(los>=55 && Math.random()<0.55){ /*FG try*/ if(Math.random()<0.84){ if(off==='h')hs+=3;else as+=3; } drivePlays.push({txt:`${offT.nick} field goal ${los>=55?'is good':'no good'}.`}); }
          else drivePlays.push({txt:`${offT.nick} punt.`}); break; }
        const play = Math.random()<passTendency(offT)?'pass':'run';
        const r = onePlay(offT,defT,play,los,rules);
        // record stats
        if(play==='pass' && !r.scrambled){ if(['tackle','oob','TD'].includes(r.outcome)){ add(r.qb,{pyd:Math.max(0,r.yards)}); add(r.target,{recyd:Math.max(0,r.yards),rec:1}); } }
        else { add(r.carrier||r.qb,{ryd:r.yards}); }
        let txt;
        if(r.outcome==='INT'){ drivePlays.push({txt:`Intercepted! ${defT.nick} take over.`}); break; }
        if(r.outcome==='sack'){ add(r.qb,{}); }
        los += r.yards; down++; if(r.yards>=toGo){ down=1; toGo=10; } else toGo-=r.yards;
        if(los>=100){ if(off==='h')hs+=7; else as+=7; if(play==='pass'){add(r.qb,{ptd:1});add(r.target,{rectd:1});} else add(r.carrier||r.qb,{rtd:1}); drivePlays.push({txt:`TOUCHDOWN ${offT.nick}!`}); scored=true; break; }
        if(down>4){ drivePlays.push({txt:`Turnover on downs.`}); break; }
      }
      drives.push({team:offT.abbr,plays:drivePlays});
      off = off==='h'?'a':'h';
    }
    if(hs===as){ if(Math.random()<0.5)hs+=3; else as+=3; }
    // build a box score from tallies (top performers per team)
    function teamBox(t,pts){ const lines=Object.values(tally).filter(x=>t.roster.some(p=>p.id===x.p.id))
        .sort((a,b)=>(b.pyd+b.ryd+b.recyd)-(a.pyd+a.ryd+a.recyd))
        .map(x=>({id:x.p.id,name:x.p.name,pos:x.p.pos,
          pyd:x.pyd,ptd:x.ptd,ryd:x.ryd,rtd:x.rtd,recyd:x.recyd,rectd:x.rectd,rec:x.rec,
          stat:x.pyd?`${x.pyd} pass yds, ${x.ptd} TD`:x.ryd?`${x.ryd} rush yds, ${x.rtd} TD`:`${x.recyd} rec yds, ${x.rectd} TD`,
          fp:x.pyd*0.04+x.ptd*4+x.ryd*0.1+x.rtd*6+x.recyd*0.1+x.rectd*6, key:(x.ptd>=2||x.ryd>90||x.recyd>90)}));
      return {team:t.abbr,pts,lines}; }
    const box={home:teamBox(home,hs),away:teamBox(away,as)};
    const allLines=[...box.home.lines,...box.away.lines]; allLines.forEach(l=>l.aw=ENGawardish(l));
    const potg=allLines.slice().sort((a,b)=>b.aw-a.aw)[0];
    return {home:home.abbr,away:away.abbr,hs,as,ot:false,box,drives,
      potg:potg?{id:potg.id,name:potg.name,team:(box.home.lines.includes(potg)?home.abbr:away.abbr),pos:potg.pos,stat:potg.stat,aw:potg.aw}:null};
  }
  function ENGawardish(l){ return (l.pyd||0)*0.02 + (l.ptd||0)*12 + (l.ryd||0)*0.1 + (l.rtd||0)*10 + (l.recyd||0)*0.1 + (l.rectd||0)*10; }

  return { FieldSim, simFullGame, onePlay, passTendency, computeDrama };
})();
if (typeof module!=='undefined') module.exports=SIM;
