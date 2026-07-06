/* physicals.js — position-calibrated height/weight/speed (40-time→SP) + QB throwing power/accuracy.
   Exposes window.PHYS. Loaded after engine.js, before app.js. OVR is never changed — these are derived. */
(function(){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), r2=v=>Math.round(v*100)/100;
  function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function hashStr(s){ s=String(s); let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
  function gaussFrom(rng){ let u=0,v=0; while(u===0)u=rng(); while(v===0)v=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  // [htMean(in), htSD, wtMean(lb), wtSD, 40Mean(s), 40SD]  — modern combine reality
  const POS={ QB:[75,1.4,222,11,4.80,0.14], RB:[70,1.3,215,14,4.50,0.10], FB:[72,1.2,245,11,4.75,0.11],
    WR:[73,1.7,200,14,4.48,0.10], TE:[76,1.2,248,13,4.70,0.12], T:[78,1.1,312,12,5.25,0.16],
    G:[76,1.1,315,12,5.30,0.15], C:[75,1.1,302,11,5.25,0.14], DE:[76,1.3,270,16,4.75,0.14],
    DT:[75,1.2,305,16,5.05,0.16], OLB:[74,1.3,245,12,4.62,0.11], ILB:[73,1.2,240,11,4.65,0.11],
    CB:[71,1.5,193,11,4.45,0.09], S:[72,1.3,205,11,4.52,0.10], K:[73,1.5,200,14,4.95,0.18], P:[74,1.5,215,14,5.00,0.18] };
  const ATHL={ QB:[0.15,0.10], RB:[0.55,0.30], FB:[0.20,0.45], WR:[0.60,0.20], TE:[0.40,0.35], T:[0.20,0.55],
    G:[0.15,0.55], C:[0.15,0.50], DE:[0.50,0.40], DT:[0.30,0.55], OLB:[0.55,0.35], ILB:[0.40,0.40],
    CB:[0.65,0.20], S:[0.55,0.25], K:[0.05,0.05], P:[0.05,0.05] };
  function spFrom40(t){ return clamp(Math.round(99-(t-4.24)*75),5,99); }     // ABSOLUTE: a 4.45 RB and 4.45 CB both = SP 84
  function sp_to_40(sp){ return r2(4.24+(99-sp)/75); }
  function rollPhysicals(pos, ovr, rng){
    const P=POS[pos]||POS.WR, W=ATHL[pos]||[0.4,0.3], g=()=>gaussFrom(rng);
    const htM=P[0],htSD=P[1],wtM=P[2],wtSD=P[3],tM=P[4],tSD=P[5], wA=W[0],wS=W[1];
    const pull=clamp(((ovr||60)-70)/25,-1.2,1.2);
    let t=tM - wA*0.75*tSD*pull + g()*tSD*0.85; t=clamp(t, tM-2.2*tSD, tM+2.8*tSD);
    let wt=wtM + wS*0.5*wtSD*pull + g()*wtSD; wt=clamp(wt, wtM-2.5*wtSD, wtM+2.5*wtSD);
    let ht=Math.round(clamp(htM+g()*htSD, htM-2.5*htSD, htM+2.5*htSD));
    wt += (ht-htM)*(wtSD*0.35); wt=Math.round(clamp(wt, wtM-2.6*wtSD, wtM+2.8*wtSD));
    return { ht, wt, t40:r2(t) };
  }
  function stTilt(pos, wt){ const P=POS[pos]||POS.WR; return clamp(Math.round(((wt-P[2])/P[3])*4),-10,10); }
  function rollQBArm(ovr, rng){ const ri=(a,b)=>a+Math.floor(rng()*(b-a+1)); const center=clamp(Math.round((ovr||60)+ri(-6,6)),30,99); const r=rng(); let tp,ta;
    if(r<0.30){ tp=center+ri(2,9); ta=center-ri(3,9); }          // gunslinger: big arm, loose
    else if(r<0.70){ tp=center+ri(-3,4); ta=center+ri(-3,4); }   // balanced
    else { tp=center-ri(3,9); ta=center+ri(2,9); }               // game-manager: pinpoint, weaker arm
    return { TP:clamp(Math.round(tp),20,99), TA:clamp(Math.round(ta),20,99) }; }
  // assign physicals. mode 'fresh' = new player (pure positional SP); 'backfill' = loaded/preset (preserve genuine legacy speed, idempotent)
  function assign(p, mode){
    if(!p||!p.pos) return p;
    if(mode!=='fresh' && p.ht!=null) return p;
    const rng=mulberry32(hashStr((p.id||p.name||'x')+'|'+p.pos+'|'+(p.ovr||60)));
    const ph=rollPhysicals(p.pos, p.ovr||60, rng);
    if(mode!=='fresh' && p.attrs && typeof p.attrs.SP==='number') ph.t40=r2(0.55*ph.t40+0.45*sp_to_40(p.attrs.SP));   // keep a genuinely fast legacy guy fast
    p.ht=ph.ht; p.wt=ph.wt; p.t40=ph.t40; p.attrs=p.attrs||{};
    const baseAC=(p.attrs.AC!=null?p.attrs.AC:(p.ovr||60)), baseAG=(p.attrs.AG!=null?p.attrs.AG:(p.ovr||60)), baseST=(p.attrs.ST!=null?p.attrs.ST:(p.ovr||60)), baseIN=(p.attrs.IN!=null?p.attrs.IN:(p.ovr||60));
    p.attrs.SP=spFrom40(p.t40);
    p.attrs.AC=clamp(Math.round(0.5*p.attrs.SP+0.5*baseAC),5,99);
    p.attrs.AG=clamp(Math.round(0.35*p.attrs.SP+0.65*baseAG),5,99);
    p.attrs.ST=clamp(Math.round(baseST+stTilt(p.pos,p.wt)),5,99);
    if(p.pos==='QB' && (p.TP==null||p.TA==null)){ const arm=rollQBArm(p.ovr||60,rng); p.TA=clamp(Math.round(0.5*arm.TA+0.5*((baseST+baseIN)/2)),20,99); p.TP=arm.TP; }
    return p;
  }
  function fresh(p){ return assign(p,'fresh'); }
  function backfill(p){ return assign(p,'backfill'); }
  function ensureLeague(G){ if(!G) return; const seen=new Set();
    const take=p=>{ if(p&&!seen.has(p)){ seen.add(p); backfill(p); } };
    (G.teams||[]).forEach(t=>(t.roster||[]).forEach(take));
    (G.faPool||[]).forEach(take); (G.prospects||[]).forEach(take); (G.draftClass||[]).forEach(take);
  }
  const fmtHt=i=>i?Math.floor(i/12)+"'"+(i%12)+'"':'—', fmtWt=w=>w?w+' lb':'—', fmt40=t=>t?t.toFixed(2):'—';
  function armLabel(p){ if(!p||p.pos!=='QB'||p.TP==null||p.TA==null) return ''; return p.TP-p.TA>=8?'Gunslinger':p.TA-p.TP>=8?'Game Mgr':'Balanced'; }
  window.PHYS={ POS, spFrom40, sp_to_40, rollPhysicals, rollQBArm, fresh, backfill, ensureLeague, fmtHt, fmtWt, fmt40, armLabel };
})();
