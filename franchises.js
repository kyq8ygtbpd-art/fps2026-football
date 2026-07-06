/* ============================================================
   FPS 2026 — franchises.js : fictional franchise pool + a real
   SVG CREST logo engine (sharp, branded — not flat monograms).
   Loads AFTER app.js + leagues.js. Registers a 'fictional' preset
   so the setup screen's league picker + team checkboxes let you
   build an all-original league. Logos are generated from each
   team's colors + a glyph, so EVERY non-PNG team (fictional,
   expansion, relocated) gets a crisp crest that matches its abbr.
   ============================================================ */
(function(){
  'use strict';
  // [abbr, city, nick, conf, div, primary, secondary, glyph]
  const F=[
    // ——— EMPIRE conference ———
    ['AUR','Aurora','Frost','EMPIRE','NORTH','#38bdf8','#0b2545','flake'],
    ['DUL','Duluth','Wolves','EMPIRE','NORTH','#475569','#cbd5e1','wolf'],
    ['NHV','New Haven','Krakens','EMPIRE','NORTH','#0f766e','#022c22','trident'],
    ['BIR','Birmingham','Ironworks','EMPIRE','NORTH','#ea580c','#1c1917','hammer'],
    ['BTR','Baton Rouge','Reapers','EMPIRE','SOUTH','#15803d','#0a0a0a','skull'],
    ['LAF','Lafayette','Voodoo','EMPIRE','SOUTH','#7c3aed','#fbbf24','eye'],
    ['GLF','Gulfport','Marauders','EMPIRE','SOUTH','#b91c1c','#111827','fang'],
    ['SAV','Savannah','Spectres','EMPIRE','SOUTH','#0f5132','#9ca3af','ghost'],
    ['ALB','Albany','Monarchs','EMPIRE','EAST','#6d28d9','#f5d042','crown'],
    ['WIL','Wilmington','Sentinels','EMPIRE','EAST','#1d4ed8','#e2e8f0','shield'],
    ['NOR','Norfolk','Gales','EMPIRE','EAST','#0ea5e9','#0c4a6e','wave'],
    ['PNS','Pensacola','Barracuda','EMPIRE','EAST','#06b6d4','#0a0a0a','fish'],
    ['BLD','Boulder','Avalanche','EMPIRE','WEST','#e5e7eb','#1e3a8a','mountain'],
    ['TUC','Tucson','Coyotes','EMPIRE','WEST','#d97706','#451a03','wolf'],
    ['MES','Mesa','Scorpions','EMPIRE','WEST','#ca8a04','#1c1917','fang'],
    ['WIC','Wichita','Surge','EMPIRE','WEST','#22d3ee','#0e7490','bolt'],
    // ——— UNION conference ———
    ['ANC','Anchorage','Yetis','UNION','NORTH','#67e8f9','#0c4a6e','flake'],
    ['POR','Portland','Lumberjacks','UNION','NORTH','#15803d','#78350f','axe'],
    ['SPO','Spokane','Wardens','UNION','NORTH','#334155','#38bdf8','shield'],
    ['BOI','Boise','Condors','UNION','NORTH','#1e293b','#f59e0b','wing'],
    ['FRE','Fresno','Solar Flares','UNION','SOUTH','#f97316','#7c2d12','sun'],
    ['OKC','Oklahoma City','Outlaws','UNION','SOUTH','#92400e','#1c1917','star'],
    ['ELP','El Paso','Vaqueros','UNION','SOUTH','#be123c','#0a0a0a','bull'],
    ['MOB','Mobile','Gators','UNION','SOUTH','#4d7c0f','#052e16','fang'],
    ['RIC','Richmond','Federals','UNION','EAST','#1e3a8a','#dc2626','star'],
    ['SCR','Scranton','Crows','UNION','EAST','#18181b','#a78bfa','bird'],
    ['VAB','Virginia Beach','Sharks','UNION','EAST','#0891b2','#082f49','fish'],
    ['HAR','Hartford','Knights','UNION','EAST','#312e81','#c0c0c0','shield'],
    ['RNO','Reno','Voltage','UNION','WEST','#facc15','#1e1b4b','bolt'],
    ['SAC','Sacramento','Sequoias','UNION','WEST','#166534','#7c2d12','mountain'],
    ['ABQ','Albuquerque','Vipers','UNION','WEST','#b45309','#0a0a0a','snake'],
    ['SDG','San Diego','Tide','UNION','WEST','#0ea5e9','#075985','wave'],
  ];
  const T=(a,c,n,cf,dv,p,s,g)=>({abbr:a,city:c,nick:n,conf:cf,div:dv,pri:p,sec:s,glyph:g,pres:60});
  // interleave EMPIRE/UNION so ANY prefix the user activates (8, 16, 24…) stays conference-balanced
  const FICTIONAL=(()=>{ const all=F.map(r=>T(...r)), e=all.filter(t=>t.conf==='EMPIRE'), u=all.filter(t=>t.conf==='UNION'), out=[];
    for(let i=0;i<Math.max(e.length,u.length);i++){ if(e[i])out.push(e[i]); if(u[i])out.push(u[i]); } return out; })();

  /* ---------------- SVG CREST ENGINE ---------------- */
  function hash(s){ s=String(s||''); let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function lum(hex){ hex=(hex||'#888').replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join(''); const r=parseInt(hex.slice(0,2),16)||0,g=parseInt(hex.slice(2,4),16)||0,b=parseInt(hex.slice(4,6),16)||0; return (0.299*r+0.587*g+0.114*b)/255; }
  function shade(hex,amt){ hex=(hex||'#1f4f8f').replace('#',''); if(hex.length===3)hex=hex.split('').map(c=>c+c).join(''); const f=parseInt(hex,16),r=f>>16,g=(f>>8)&255,b=f&255,t=amt<0?0:255,p=Math.abs(amt);
    const to=v=>Math.round((t-v)*p)+v; return '#'+((1<<24)+(to(r)<<16)+(to(g)<<8)+to(b)).toString(16).slice(1); }
  // glyph builders — clean, bold, centered icons drawn in `c` within radius r around (x,y). Tuned to read at 16px.
  const GLYPHS={
    bolt:(x,y,r,c)=>`<path d="M${x+r*.18} ${y-r} L${x-r*.5} ${y+r*.12} L${x-r*.04} ${y+r*.12} L${x-r*.22} ${y+r} L${x+r*.5} ${y-r*.18} L${x+r*.02} ${y-r*.18} Z" fill="${c}"/>`,
    star:(x,y,r,c)=>{ let p=''; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.42:r; p+=(i?'L':'M')+(x+Math.cos(a)*rr).toFixed(1)+' '+(y+Math.sin(a)*rr).toFixed(1)+' '; } return `<path d="${p}Z" fill="${c}"/>`; },
    flake:(x,y,r,c)=>{ let p=`<g stroke="${c}" stroke-linecap="round">`; for(let i=0;i<6;i++){ const a=i*Math.PI/3, ex=x+Math.cos(a)*r, ey=y+Math.sin(a)*r; p+=`<line x1="${x}" y1="${y}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke-width="${r*.17}"/>`; const bx=x+Math.cos(a)*r*.55, by=y+Math.sin(a)*r*.55; [-0.7,0.7].forEach(d=>{ p+=`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx+Math.cos(a+d)*r*.34).toFixed(1)}" y2="${(by+Math.sin(a+d)*r*.34).toFixed(1)}" stroke-width="${r*.13}"/>`; }); } return p+'</g>'; },
    trident:(x,y,r,c)=>`<g fill="${c}"><rect x="${x-r*.62}" y="${y-r*.52}" width="${r*1.24}" height="${r*.18}" rx="${r*.08}"/><rect x="${x-r*.09}" y="${y-r}" width="${r*.18}" height="${r*1.7}" rx="${r*.07}"/><rect x="${x-r*.58}" y="${y-r*.95}" width="${r*.17}" height="${r*.5}" rx="${r*.07}"/><rect x="${x+r*.41}" y="${y-r*.95}" width="${r*.17}" height="${r*.5}" rx="${r*.07}"/><circle cx="${x}" cy="${y+r*.82}" r="${r*.18}"/></g>`,
    hammer:(x,y,r,c)=>`<g fill="${c}" transform="rotate(-34 ${x} ${y})"><rect x="${x-r*.13}" y="${y-r*.35}" width="${r*.26}" height="${r*1.45}" rx="${r*.1}"/><path d="M${x-r*.62} ${y-r*.95} h${r*1.05} a${r*.16} ${r*.16} 0 0 1 ${r*.16} ${r*.16} v${r*.4} a${r*.16} ${r*.16} 0 0 1 -${r*.16} ${r*.16} h-${r*1.05} a${r*.5} ${r*.5} 0 0 1 0 -${r*.88} Z"/></g>`,
    skull:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r*.72} ${y-r*.15} a${r*.72} ${r*.78} 0 0 1 ${r*1.44} 0 v${r*.5} h-${r*.36} v${r*.28} h-${r*.72} v-${r*.28} h-${r*.36} Z"/><circle cx="${x-r*.33}" cy="${y-r*.05}" r="${r*.21}" fill="#0a0f1a"/><circle cx="${x+r*.33}" cy="${y-r*.05}" r="${r*.21}" fill="#0a0f1a"/><path d="M${x} ${y+r*.12} l${r*.13} ${r*.22} h-${r*.26} Z" fill="#0a0f1a"/></g>`,
    eye:(x,y,r,c)=>`<g><path d="M${x-r} ${y} Q${x} ${y-r*.92} ${x+r} ${y} Q${x} ${y+r*.92} ${x-r} ${y} Z" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r*.42}" fill="#0a0f1a"/><circle cx="${x+r*.12}" cy="${y-r*.12}" r="${r*.12}" fill="${c}"/></g>`,
    fang:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r*.72} ${y-r*.85} L${x-r*.18} ${y-r*.85} L${x-r*.45} ${y+r} Z"/><path d="M${x+r*.72} ${y-r*.85} L${x+r*.18} ${y-r*.85} L${x+r*.45} ${y+r} Z"/><rect x="${x-r*.8}" y="${y-r*.95}" width="${r*1.6}" height="${r*.2}" rx="${r*.08}"/></g>`,
    ghost:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r*.7} ${y+r*.9} V${y-r*.05} a${r*.7} ${r*.7} 0 0 1 ${r*1.4} 0 V${y+r*.9} l-${r*.23} -${r*.26} l-${r*.23} ${r*.26} l-${r*.24} -${r*.26} l-${r*.23} ${r*.26} l-${r*.23} -${r*.26} Z"/><circle cx="${x-r*.27}" cy="${y-r*.05}" r="${r*.17}" fill="#0a0f1a"/><circle cx="${x+r*.27}" cy="${y-r*.05}" r="${r*.17}" fill="#0a0f1a"/></g>`,
    crown:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r} ${y+r*.25} L${x-r*.95} ${y-r*.55} L${x-r*.42} ${y-r*.02} L${x} ${y-r*.8} L${x+r*.42} ${y-r*.02} L${x+r*.95} ${y-r*.55} L${x+r} ${y+r*.25} Z"/><rect x="${x-r}" y="${y+r*.28}" width="${r*2}" height="${r*.32}" rx="${r*.08}"/><circle cx="${x}" cy="${y-r*.82}" r="${r*.14}"/></g>`,
    shield:(x,y,r,c)=>`<g><path d="M${x} ${y-r} L${x+r*.82} ${y-r*.58} V${y+r*.05} Q${x+r*.82} ${y+r*.78} ${x} ${y+r} Q${x-r*.82} ${y+r*.78} ${x-r*.82} ${y+r*.05} V${y-r*.58} Z" fill="${c}"/><path d="M${x} ${y-r*.6} L${x+r*.5} ${y-r*.32} V${y+r*.05} Q${x+r*.5} ${y+r*.5} ${x} ${y+r*.62} Q${x-r*.5} ${y+r*.5} ${x-r*.5} ${y+r*.05} V${y-r*.32} Z" fill="#0a0f1a" opacity=".35"/></g>`,
    mountain:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r} ${y+r*.7} L${x-r*.28} ${y-r*.55} L${x+r*.04} ${y-r*.02} L${x+r*.46} ${y-r} L${x+r} ${y+r*.7} Z"/><path d="M${x+r*.28} ${y-r*.68} L${x+r*.46} ${y-r} L${x+r*.64} ${y-r*.68} L${x+r*.52} ${y-r*.6} L${x+r*.46} ${y-r*.74} L${x+r*.4} ${y-r*.6} Z" fill="#fff" opacity=".85"/></g>`,
    sun:(x,y,r,c)=>{ let p=`<circle cx="${x}" cy="${y}" r="${r*.5}" fill="${c}"/><g stroke="${c}" stroke-linecap="round" stroke-width="${r*.17}">`; for(let i=0;i<8;i++){ const a=i*Math.PI/4; p+=`<line x1="${(x+Math.cos(a)*r*.66).toFixed(1)}" y1="${(y+Math.sin(a)*r*.66).toFixed(1)}" x2="${(x+Math.cos(a)*r).toFixed(1)}" y2="${(y+Math.sin(a)*r).toFixed(1)}"/>`; } return p+'</g>'; },
    wave:(x,y,r,c)=>`<g fill="none" stroke="${c}" stroke-width="${r*.22}" stroke-linecap="round"><path d="M${x-r} ${y-r*.32} q${r*.5} -${r*.62} ${r} 0 t${r} 0"/><path d="M${x-r} ${y+r*.18} q${r*.5} -${r*.62} ${r} 0 t${r} 0"/><path d="M${x-r} ${y+r*.68} q${r*.5} -${r*.62} ${r} 0 t${r} 0"/></g>`,
    axe:(x,y,r,c)=>`<g fill="${c}"><rect x="${x-r*.11}" y="${y-r}" width="${r*.22}" height="${r*2}" rx="${r*.08}"/><path d="M${x+r*.02} ${y-r*.9} Q${x+r*1.02} ${y-r*.62} ${x+r*.82} ${y+r*.16} Q${x+r*.42} ${y-r*.18} ${x+r*.02} ${y-r*.12} Z"/><path d="M${x-r*.02} ${y-r*.9} Q${x-r*.55} ${y-r*.7} ${x-r*.5} ${y-r*.2} Q${x-r*.28} ${y-r*.4} ${x-r*.02} ${y-r*.32} Z"/></g>`,
    wing:(x,y,r,c)=>`<g fill="${c}">${[0,1,2].map(i=>`<path d="M${x-r} ${y-r*.45+i*r*.42} q${r*.55} -${r*.32} ${r*1.7} -${r*.12} q-${r*.7} ${r*.28} -${r*1.7} ${r*.26} Z"/>`).join('')}</g>`,
    bird:(x,y,r,c)=>`<g fill="${c}"><path d="M${x} ${y-r*.55} q${r*.55} -${r*.55} ${r} -${r*.2} q-${r*.45} ${r*.12} -${r*.62} ${r*.5} q${r*.4} -${r*.18} ${r*.62} ${r*.05} q-${r*.55} ${r*.6} -${r} ${r*.5} Z"/><path d="M${x} ${y-r*.55} q-${r*.55} -${r*.55} -${r} -${r*.2} q${r*.45} ${r*.12} ${r*.62} ${r*.5} q-${r*.4} -${r*.18} -${r*.62} ${r*.05} q${r*.55} ${r*.6} ${r} ${r*.5} Z"/><path d="M${x-r*.12} ${y-r*.2} h${r*.24} l-${r*.12} ${r*.95} Z"/></g>`,
    snake:(x,y,r,c)=>`<g fill="none" stroke="${c}" stroke-width="${r*.22}" stroke-linecap="round"><path d="M${x-r*.75} ${y+r} q${r*.65} -${r*.45} 0 -${r*.95} q-${r*.65} -${r*.5} ${r*.55} -${r} q${r*.55} -${r*.32} ${r*.95} ${r*.05}"/></g><circle cx="${x+r*.62}" cy="${y-r*.92}" r="${r*.15}" fill="${c}"/>`,
    bull:(x,y,r,c)=>`<g fill="${c}"><path d="M${x} ${y+r*.72} Q${x-r*.56} ${y+r*.5} ${x-r*.5} ${y-r*.12} Q${x-r*.5} ${y-r*.52} ${x} ${y-r*.46} Q${x+r*.5} ${y-r*.52} ${x+r*.5} ${y-r*.12} Q${x+r*.56} ${y+r*.5} ${x} ${y+r*.72} Z"/><path d="M${x-r*.46} ${y-r*.3} Q${x-r*1.0} ${y-r*.5} ${x-r*.92} ${y-r} Q${x-r*.7} ${y-r*.55} ${x-r*.4} ${y-r*.5} Z"/><path d="M${x+r*.46} ${y-r*.3} Q${x+r*1.0} ${y-r*.5} ${x+r*.92} ${y-r} Q${x+r*.7} ${y-r*.55} ${x+r*.4} ${y-r*.5} Z"/></g>`,
    fish:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r*.95} ${y} Q${x-r*.1} ${y-r*.72} ${x+r*.62} ${y} Q${x-r*.1} ${y+r*.72} ${x-r*.95} ${y} Z"/><path d="M${x+r*.5} ${y} L${x+r} ${y-r*.52} L${x+r} ${y+r*.52} Z"/><circle cx="${x-r*.42}" cy="${y-r*.12}" r="${r*.1}" fill="#0a0f1a"/></g>`,
    wolf:(x,y,r,c)=>`<g fill="${c}"><path d="M${x-r*.8} ${y-r} L${x-r*.3} ${y-r*.45} L${x} ${y-r*.6} L${x+r*.3} ${y-r*.45} L${x+r*.8} ${y-r} L${x+r*.6} ${y-r*.2} L${x+r*.5} ${y+r*.5} L${x} ${y+r} L${x-r*.5} ${y+r*.5} L${x-r*.6} ${y-r*.2} Z"/><path d="M${x-r*.22} ${y-r*.05} l${r*.1} ${r*.2} l${r*.12} -${r*.05} l${r*.12} ${r*.05} l${r*.1} -${r*.2}" fill="#0a0f1a" opacity=".6"/></g>`,
  };
  const KEYS=Object.keys(GLYPHS);

  // the crest: a colored shield/roundel/hex badge with a high-contrast glyph + the abbreviation.
  window.teamLogoSVG=function(t,size){
    size=size||18; const ab=(t.abbr||'??'); const h=hash(ab+'|'+(t.nick||''));
    const pri=t.pri&&t.pri!=='#101010'&&t.pri!=='#0b1220'?t.pri:'#1f4f8f', sec=t.sec&&t.sec!=='#ffffff'?t.sec:'#dbe7ff';
    const fieldDark = lum(pri)<0.5;
    const ring = lum(sec)>0.22? sec : '#eef2f7';                                  // crisp outer ring
    // glyph color: always high-contrast with the field; the secondary color leads when it pops, else white/ink
    const glyphCol = fieldDark ? (lum(sec)>0.42? sec : '#f8fafc') : (lum(sec)<0.5? sec : '#0b1220');
    const haloCol  = lum(glyphCol)>0.5 ? '#0a0f1a' : '#f4f7fb';                   // outline behind the glyph for definition
    const ink = fieldDark ? '#ffffff' : '#0b1220';                               // monogram
    const gKey = t.glyph && GLYPHS[t.glyph] ? t.glyph : KEYS[h%KEYS.length];
    const shape = (h>>4)%3;                                                       // 0 roundel · 1 shield · 2 hex
    const id='cg'+(h%99999), gid='gg'+(h%99999);
    const top=shade(pri,0.18), bot=shade(pri,-0.28);                             // vertical gradient for depth
    let d;
    if(shape===1) d=`M32 3.5 L59 14 V34 Q59 53 32 60.5 Q5 53 5 34 V14 Z`;
    else if(shape===2){ const pts=[]; for(let i=0;i<6;i++){ const a=-Math.PI/2+i*Math.PI/3; pts.push((32+Math.cos(a)*28.5).toFixed(1)+','+(31+Math.sin(a)*28.5).toFixed(1)); } d='M'+pts.join(' L')+' Z'; }
    else d=null;
    const frame = d ? `<path d="${d}" fill="url(#${gid})" stroke="${ring}" stroke-width="3.2"/>`
                    : `<circle cx="32" cy="31" r="28" fill="url(#${gid})" stroke="${ring}" stroke-width="3.2"/>`;
    const inner = d ? `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="1" opacity=".18" transform="translate(32 31) scale(.86) translate(-32 -31)"/>`
                    : `<circle cx="32" cy="31" r="23.5" fill="none" stroke="#ffffff" stroke-width="1" opacity=".18"/>`;
    const clip = d ? `<clipPath id="${id}"><path d="${d}"/></clipPath>` : `<clipPath id="${id}"><circle cx="32" cy="31" r="28"/></clipPath>`;
    const grad = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`;
    const band = `<g clip-path="url(#${id})"><rect x="0" y="44" width="64" height="22" fill="#000" opacity="0.30"/></g>`;
    const gx=32, gy=27, gr=14;
    const halo = `<g transform="translate(${gx} ${gy}) scale(1.15) translate(${-gx} ${-gy})">${GLYPHS[gKey](gx,gy,gr,haloCol)}</g>`;
    const glyph = `<g>${halo}${GLYPHS[gKey](gx,gy,gr,glyphCol)}</g>`;
    const mono = ab.replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase();
    const label = `<text x="32" y="56.5" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="12.5" letter-spacing="0.5" fill="${ink}">${mono}</text>`;
    return `<svg class="lgsvg" width="${size}" height="${size}" viewBox="0 0 64 64" style="display:inline-block;vertical-align:middle" xmlns="http://www.w3.org/2000/svg"><defs>${grad}${clip}</defs>${frame}${inner}${glyph}${band}${label}</svg>`;
  };

  // register a selectable "fictional" league preset (LEAGUES.presets === the internal PRESETS, so this is picked up everywhere)
  if(window.LEAGUES && LEAGUES.presets){
    LEAGUES.presets.fictional={ name:'Fictional League', blurb:'32 original franchises — your own world. Pick any subset; pair with a fantasy draft for a from-scratch league.', teams:FICTIONAL };
  }
  window.FICTIONAL_FRANCHISES=FICTIONAL;
  // suggest a clean abbreviation for a (re)named team — used by the setup editor so the abbr matches the new identity
  window.suggestAbbr=function(city,nick,taken){
    const clean=s=>String(s||'').toUpperCase().replace(/[^A-Z ]/g,'');
    const cw=clean(city).split(/\s+/).filter(Boolean), nw=clean(nick).split(/\s+/).filter(Boolean);
    const cand=[];
    if(cw.length>=2) cand.push(cw.map(w=>w[0]).join('').slice(0,3));     // multi-word city initials
    if(cw[0]) cand.push(cw[0].slice(0,3));                               // first 3 of city
    if(nw[0]) cand.push(nw[0].slice(0,3));                               // first 3 of nick
    if(cw[0]&&nw[0]) cand.push(cw[0][0]+nw[0].slice(0,2));
    const used=new Set((taken||[]).map(a=>String(a).toUpperCase()));
    for(const c of cand){ if(c&&c.length>=2&&!used.has(c)) return c; }
    for(const c of cand){ if(c&&c.length>=2){ for(let i=2;i<10;i++){ const v=c.slice(0,2)+i; if(!used.has(v)) return v; } } }
    return (cw[0]||nw[0]||'NEW').slice(0,3);
  };
})();
