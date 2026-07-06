/* ============================================================
   FPS 2026 — voices.js : the league's voice.
   A procedural "writers' room" that turns simulated events into
   real-sounding content — a Twitter-style FEED, pick-by-pick DRAFT
   commentary, and a prose GAZETTE that reads like an actual paper.
   Everything degrades gracefully: with an Anthropic key (ai.js) the
   text gets richer, but it is fully automatic and rich without one.
   Depends on globals from app.js (G, team, ut, leaders, standings).
   ============================================================ */
(function(){
  'use strict';
  const rng=()=>ENG.rng(), ri=(a,b)=>ENG.ri(a,b), pick=arr=>arr[Math.floor(rng()*arr.length)];
  const cap=s=>s? s.charAt(0).toUpperCase()+s.slice(1):s;
  const POS_NOUN={QB:'quarterback',RB:'running back',FB:'fullback',WR:'receiver',TE:'tight end',T:'tackle',G:'guard',C:'center',DE:'edge rusher',DT:'defensive tackle',OLB:'linebacker',ILB:'linebacker',CB:'cornerback',S:'safety',K:'kicker',P:'punter'};

  /* ---------------- THE FEED (neural-net social timeline) ---------------- */
  // recurring personas with a consistent voice
  const INSIDER={h:'@AdamMortensen',n:'Adam Mortensen',v:true,c:'#1d9bf0'};
  const ANALYST={h:'@CoverThree',n:'Brett Cosell',v:true,c:'#8b5cf6'};
  const STATS  ={h:'@GridironStats',n:'Gridiron Stats',v:true,c:'#46d39a'};
  const TAKES  ={h:'@PylonTruther',n:'Pylon Truther',v:false,c:'#f0b23f'};
  const WISE   ={h:'@FootballGuy',n:'just a football guy',v:false,c:'#9aa7bd'};
  const teamAcct=t=>({h:'@'+t.abbr,n:`${t.city} ${t.nick}`,v:true,c:t.pri&&t.pri!=='#101010'?t.pri:'#5bbcff'});
  const beat=t=>({h:'@'+t.abbr+'Beat',n:`${t.city} Beat`,v:true,c:'#8aa0bf'});
  const fan=t=>({h:'@'+t.abbr.toLowerCase()+'fan'+ri(2,99),n:pick(['Diehard since birth','SuperFan','Tailgate Czar','#1 Fan','Couch GM','Section 114'])+' '+t.abbr,v:false,c:'#7a8aa3'});
  const playerAcct=p=>({h:'@'+(p.first?p.first[0]:'')+(p.last||p.name||'').replace(/[^A-Za-z]/g,''),n:p.name,v:p.ovr>=82,c:'#cdd8ec'});

  /* ---------------- SIDELINE REPORTERS (recurring on-air personalities, played for laughs) ---------------- */
  // believable broadcast names, each with a VIBE that flavors their dispatches. Brooke is the tabloid magnet.
  const SIDELINE_REPS=[
    {n:'Brooke Halliday',c:'#ff7ad1',vibe:'flirty'},
    {n:'Marcus Webb',c:'#6bd0ff',vibe:'deadpan'},
    {n:'Dana Cortez',c:'#7affa8',vibe:'savage'},
    {n:'Tony Ferraro',c:'#ffd24a',vibe:'clueless'},
    {n:'Priya Anand',c:'#b69bff',vibe:'overshare'},
    {n:'Chip Dyer',c:'#ff9a6b',vibe:'hype'} ];
  const SIDELINE_VIBE={
    flirty:[`I caught the head coach's eye on that last drive and... let's just say the chemistry on this sideline isn't only X's and O's. 😏`,
      `the coordinator told me to "stay close" for updates. I am happy to oblige. For journalism.`,
      `someone down here smells incredible and I intend to find out who before the fourth quarter. Back to you.`,
      `the QB gave me a little wave coming off the field. I'm a professional. I waved back. Twice.`],
    deadpan:[`the head coach told me, quote, "we have to score more points." Pulitzer stuff. Back to you.`,
      `I asked for an in-game adjustment. He stared at me for nine seconds and walked away. Great chat.`,
      `update from the sideline: it is a football game. The teams would each like to win. More at the half.`],
    savage:[`that punt was so bad the special-teams coach won't make eye contact with me, and frankly he shouldn't.`,
      `I've covered better tackling at a youth clinic. I said what I said.`,
      `the coordinator called that screen on 3rd-and-12 and I will be asking him about it with my full chest.`],
    clueless:[`I'm told there are "downs" and you get "four" of them. Riveting system, really.`,
      `a coach just yelled a number at me. I yelled it back. We're bonding.`,
      `is the brown one the ball? My producer is sighing. The brown one is the ball.`],
    overshare:[`reminds me of my own divorce, honestly — nobody communicating, everybody blaming the line. Anyway, 3rd down.`,
      `I haven't eaten since Tuesday and a fan just waved a hot dog at me like a hypnotist. Send help. And mustard.`,
      `my therapist says I use football to avoid my feelings. She's courtside. Hi, Deb.`],
    hype:[`ARE YOU KIDDING ME?! This sideline is ELECTRIC and so am I! WOOO! ...back to you in the booth.`,
      `I have GOOSEBUMPS. The coach has goosebumps. The MASCOT has goosebumps. This is FOOTBALL, baby!`,
      `that hit registered on my SOUL. I may never recover and I don't want to!`] };
  // returns {rep, c, line} — flavored by the reporter's vibe + the teams/star
  function sideline(home,away,star){ const rep=pick(SIDELINE_REPS), t=pick([home,away].filter(Boolean)), tn=t?(t.nick||t.city):'the home team';
    const generic=[
      `the ${tn} mascot just attempted a backflip and landed on the first-down marker. He's fine. The marker is in pieces.`,
      `it is nineteen degrees and a shirtless man in the end zone is doing pushups. Fans are simply built different.`,
      star?`${star.name} told me on his way to the bench, quote, "I'm him." That's the whole quote. That's all I got.`:`a player winked at me coming off the field and I've decided that means the ${tn} are winning.`,
      `a fan in row 4 offered me half a pretzel. I declined. I have regretted nothing more in my career.` ];
    const pool=(SIDELINE_VIBE[rep.vibe]||[]).concat(generic);
    return {rep:rep.n, c:rep.c, line:pick(pool)}; }

  function feedPush(persona,txt,tag,big){
    G.feed=G.feed||[]; const likes= big? ri(2400,58000): ri(12,4200);
    G.feed.unshift({id:(G._feedId=(G._feedId||0)+1),season:G.season,week:G.week,tag:tag||'',
      h:persona.h,n:persona.n,v:!!persona.v,c:persona.c,txt,
      likes,rt:Math.floor(likes/ri(4,9)),reply:Math.floor(likes/ri(8,20))});
    if(G.feed.length>240) G.feed.length=240;
  }
  const hashtag=t=>'#'+t.abbr+pick(['Nation','Football','sAllDay','Faithful','Up']);

  // weekly synthesis from the slate of results + recent news
  function feedTick(results){
    if(!results||!results.length) return;
    const u=results.find(r=>r.home===USER||r.away===USER);
    // your game
    if(u){ const ut2=ut(), won=(u.home===USER?u.hs>u.as:u.as>u.hs), opp=team(u.home===USER?u.away:u.home);
      const me=u.home===USER?u.hs:u.as, them=u.home===USER?u.as:u.hs;
      if(won) feedPush(beat(ut2), pick([`${ut2.nick} take care of business, ${me}-${them} over ${opp.city}. ${u.potg?u.potg.name+' was the story.':'Complementary football.'} ${hashtag(ut2)}`,
        `WIN. ${ut2.city} move to ${ut2.wins}-${ut2.losses} after a ${me}-${them} result. ${u.potg?u.potg.name+': '+u.potg.stat+'.':''}`]),'WIN');
      else feedPush(beat(ut2), pick([`Tough one for the ${ut2.nick}, ${them}-${me} to ${opp.city}. Questions to answer. ${hashtag(ut2)}`,
        `${ut2.city} drop one ${them}-${me}. Now ${ut2.wins}-${ut2.losses}. Long week ahead.`]),'LOSS');
      { const FN=(window.PBPGEN&&PBPGEN.fans)||{}, blow=Math.abs(me-them)>=21;
        const key=won?(blow?'blowoutWin':'win'):(blow?'blowoutLoss':'loss');
        const fp=(FN[key]&&FN[key].length)?FN[key]:(won?['lets go','believe']:['rough one','fix it']);
        feedPush(fan(ut2), pick(fp),''); }
    }
    // marquee result: biggest blowout in the league
    const byMargin=results.slice().sort((a,b)=>Math.abs(b.hs-b.as)-Math.abs(a.hs-a.as))[0];
    if(byMargin && Math.abs(byMargin.hs-byMargin.as)>=21){ const w=byMargin.hs>byMargin.as?team(byMargin.home):team(byMargin.away), l=byMargin.hs>byMargin.as?team(byMargin.away):team(byMargin.home);
      feedPush(ANALYST, `${w.city} ${w.nick} just dismantled ${l.city} ${Math.max(byMargin.hs,byMargin.as)}-${Math.min(byMargin.hs,byMargin.as)}. That's not a fluke — they're rolling. ${byMargin.potg?byMargin.potg.name+' ('+byMargin.potg.stat+') ate.':''}`,'GAME',true); }
    // a shootout
    const shoot=results.slice().sort((a,b)=>(b.hs+b.as)-(a.hs+a.as))[0];
    if(shoot && (shoot.hs+shoot.as)>=58){ feedPush(STATS, `${team(shoot.away).abbr} ${shoot.as}, ${team(shoot.home).abbr} ${shoot.hs} — ${shoot.hs+shoot.as} combined points. Defense optional today.`,'GAME'); }
    // POTW
    const potw=G.awards&&G.awards.weekly&&G.awards.weekly[0];
    if(potw && potw.week===G.week){ feedPush(STATS, `📊 Player of the Week: ${potw.name} (${potw.pos}, ${potw.team}) — ${potw.stat}. Put the league on notice.`,'AWARD'); }
    // turn fresh news into posts (trades/signings/holdouts/incidents already happened this tick)
    (G.news||[]).filter(n=>n.wk===G.week).slice(0,10).forEach(n=>{
      if(n.tag==='TRADE') feedPush(INSIDER, '🚨 '+n.txt+' (h/t sources)','TRADE',true);
      else if(n.tag==='REQUEST') feedPush(INSIDER, 'Sources: '+n.txt,'NEWS');
      else if(n.tag==='HOLDOUT') feedPush(beat(ut()||team(USER)), n.txt,'NEWS');
      else if(n.tag==='SIGNING' && rng()<0.5) feedPush(INSIDER, n.txt,'NEWS');
      else if(n.tag==='SUSPENSION'||n.tag==='LEGAL'||n.tag==='INCIDENT') feedPush(INSIDER, '⚠️ '+n.txt,'NEWS',true);
      else if(n.tag==='CONTRACT') feedPush(INSIDER, n.txt,'NEWS');
      else if(n.tag==='DEV') feedPush(/📈/.test(n.txt)?ANALYST:STATS, n.txt.replace(/^📈 |^📉 /,''),'NEWS');
      else if(n.tag==='OWNER' && /hot seat|fired|hired/i.test(n.txt)) feedPush(INSIDER, n.txt,'NEWS',true);
      else if(n.tag==='INJURY' && rng()<0.4) feedPush(beat(ut()||team(USER)), n.txt,'NEWS');
    });
    // ex-players in the booth weigh in (familiar faces who never left)
    if(G.pundits&&G.pundits.length && rng()<0.8){ const pu=pick(G.pundits), nn=POS_NOUN[pu.pos]||pu.pos;
      feedPush({h:pu.handle,n:pu.name,v:true,c:'#f0b23f'}, pick([
        `When I played ${nn}, we didn't ${pick(['celebrate first downs','wear gloves','have load management','need a chart to call a play'])}. Different game now. Softer. (I love it, actually.)`,
        `Tell me you've never lined up at ${nn} without telling me. The angles guys take out there are a crime.`,
        `Hot take from a man who actually did it: pay your stars. Every time. My old GM is NOT invited to respond.`,
        `${pick(G.teams).city} are a ${pick(['real','one-and-done','rebuilding','pretender'])} team and I'll die on this hill. Book it. 📺`,
        `I'm not saying I could still suit up at ${nn}. I'm saying don't rule it out entirely.`,
        `Folks asking if I miss playing. I have a headset, a hot meal, and nobody's hitting me. I'm great, thanks.`]),'TAKE',pu.peak>=88); }
    // a hot take to close the timeline
    const lead=standings()[0];
    if(rng()<0.7) feedPush(TAKES, pick([
      `Hot take: ${lead.city} are the only real team in this league and it's not close.`,
      `If your team isn't ${lead.abbr} you're just playing for second. I said what I said.`,
      `Nobody wants to admit ${lead.city} ${lead.nick} are running the whole sport right now.`,
      `${pick(G.teams).city} fans really think they're contending lmaooo`]),'TAKE');
  }

  // immediate posts for the big moments
  function feedTrade(give,get,from,to){ const nm=a=>a.kind==='pick'?`a ${a.year} R${a.round} pick`:`${a.name}`;
    feedPush(INSIDER, `🚨 BREAKING: The ${to.city} ${to.nick} are acquiring ${get.map(nm).join(' and ')} from ${from.city} in exchange for ${give.map(nm).join(' and ')}, sources tell me.`,'TRADE',true);
    feedPush(ANALYST, pick([`Love this for ${to.abbr} — fills a need without gutting the core.`,`${from.abbr} clearly playing the long game here. Picks are currency.`,`Win-now move. The window is open and they know it.`]),'TRADE');
    feedPush(fan(to), pick(['WE GOT HIM 🎉','christmas came early','front office cooking fr','okay NOW im excited']),''); }
  function feedDraftPick(t,p,overall,round,reachVal){
    const persona = overall<=5? INSIDER : (rng()<0.5?ANALYST:beat(t));
    const lead = overall===1? `With the No. 1 overall pick, ` : overall<=10? `Pick ${overall}: ` : `R${round}, ${overall} overall — `;
    let take = reachVal>1? pick([`a bit of a reach, but they clearly love the upside.`,`eyebrow-raiser this early, fit over value.`])
            : reachVal<-1? pick([`absolute STEAL at this point in the draft.`,`can't believe he slid this far — tremendous value.`])
            : pick([`good value, clean fit.`,`right where he was projected. solid.`,`makes sense for this roster.`]);
    feedPush(persona, `${lead}the ${t.city} ${t.nick} select ${p.name}, ${POS_NOUN[p.pos]||p.pos} out of ${p.school}. ${cap(take)}`,'DRAFT',overall<=5);
    if(overall<=3) feedPush(fan(t), pick(['LETS GO baby 🎉','franchise cornerstone','draft him draft him DRAFT— ok they did','generational']),'');
  }

  /* ---------------- DRAFT COMMENTARY (per pick) ---------------- */
  // a scouting-desk blurb for a pick; kind = 'user' | 'ai'
  function draftCommentary(t,p,overall,round){
    const reach = round - (p.projRound||round);           // +ve = picked earlier than projected (reach)
    const need = (ENG.needs(t)[p.pos]||0);
    const tier = p.grade>=90?'blue-chip':p.grade>=82?'first-round':p.grade>=72?'solid':p.grade>=62?'developmental':'depth';
    const valLine = reach<=-1.5? pick(['Tremendous value — the board fell their way.','A genuine steal at this slot.','They had him graded far higher; happy to see him here.'])
      : reach>=1.5? pick(['A reach on paper, but they clearly trust their evaluation.','Earlier than the consensus board — a bet on the ceiling.','Aggressive. They didn\'t want to risk losing him.'])
      : pick(['Right around where the board had him.','Sensible, value-meets-need pick.','No surprises — a clean selection.']);
    const needLine = need>=2? `It plugs a real hole at ${POS_NOUN[p.pos]||p.pos}.` : need>=1? `Adds competition at ${POS_NOUN[p.pos]||p.pos}.` : `A best-player-available luxury more than a need.`;
    const skill = pick({QB:['a live arm','quick processing','poise in the pocket','off-script creativity'],RB:['contact balance','breakaway burst','three-down ability','vision'],WR:['separation quickness','contested-catch hands','YAC juice','a huge catch radius'],TE:['a matchup-nightmare frame','soft hands','in-line toughness'],DE:['a relentless motor','first-step explosion','bend off the edge'],DT:['rare power at the point','interior quickness'],CB:['fluid hips','ball skills','press-man chops'],S:['range','a hammer in the box','centerfield instincts']}[p.pos]||['a high motor','a pro-ready frame','football smarts']);
    return `${tier==='blue-chip'?'BLUE-CHIP. ':tier==='depth'?'':''}${p.name} (${p.pos}, ${p.school}) — scouts love ${skill}. ${valLine} ${needLine}`;
  }

  /* ---------------- PROSE GAZETTE (reads like a real paper) ---------------- */
  function ordinal(n){ const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
  // ---- SPECIAL EDITIONS -------------------------------------------------------------------
  // The paper knows what week it is: an OFFSEASON SPECIAL when the league year turns over, and a
  // DRAFT SPECIAL (with the full report card) the week after the picks are in.
  function newsByTag(tags,n){ return (G.news||[]).filter(x=>tags.includes(x.tag)).slice(0,n||6); }
  function offseasonGazette(){
    const out={byline:'The Gazette staff'}, season=G.season, st=standings(), top=st[0], me=ut();
    const champ=(G.news||[]).find(n=>n.tag==='CHAMPION');
    out.edition_kicker=`OFFSEASON SPECIAL · the league year turns over`;
    out.lead={ headline: champ? champ.txt.replace(/^🏆 /,'') : `The ${season} season closes — now the real chess begins`,
      deck:`Retirements, the tag window, free agency and the draft board: the winners of ${season+1} are being decided right now.`,
      dateline:'LEAGUE OFFICES — ', byline:'The Gazette',
      body:(champ?`${champ.txt.replace(/^🏆 /,'')} The parade barely ended before the phones started ringing. `:'')+
        `Front offices around the league have moved from game-planning to roster surgery: contract calls, cap math, tag decisions and draft boards. ${top?`${top.city} finished on top of the standings, but nobody stays on top by standing still. `:''}`+
        `${me?`For ${me.city}, the offseason is where a season is quietly won — the moves made in the next few weeks set the ceiling for next year.`:''}` };
    // RETIREMENT TRIBUTE — the biggest name to hang them up this year gets the feature treatment
    const ballot=(G.hofBallot||[]).filter(c=>c.retired===season).sort((a,b)=>(b.score||0)-(a.score||0));
    const rNews=newsByTag(['RETIRE'],8);
    if(ballot[0]){ const c=ballot[0];
      out.feature={ kicker:'END OF AN ERA', headline:`${c.name} walks away`, byline:'Hank Mariucci', dateline:'',
        body:`${c.name} (${c.pos}, ${c.team}) announced his retirement this offseason, closing the book on ${c.seasons||'a career of'} seasons${c.proBowls?`, ${c.proBowls} Pro Bowl${c.proBowls>1?'s':''}`:''}${c.allPros?`, ${c.allPros} All-Pro nod${c.allPros>1?'s':''}`:''}${c.rings?` and ${c.rings} ring${c.rings>1?'s':''}`:''}. The Hall of Fame conversation starts in five years; the hole in ${c.team}'s locker room starts now. `+
          (rNews.length>1?`He headlines a retirement class that also includes ${rNews.slice(1,4).map(n=>n.txt.split(' (')[0].replace(/^📝 /,'')).join(', ')}.`:`Around the league, the generational turnover continues.`) };
    }
    // FREE-AGENCY / TAG TRACKER
    const moves=newsByTag(['SIGNING','TRADE','ROSTER'],7), staff=newsByTag(['STAFF'],4);
    out.wire={ transactions:moves.map(n=>n.txt).slice(0,6), injuries:[] };
    // AWARDS DESK
    const awards=newsByTag(['AWARD'],4);
    if(awards.length) out.notebook=[{tag:'AWARDS DESK',hit:awards.map(n=>n.txt).join(' ')}].concat(staff.map(n=>({tag:'COACHING CAROUSEL',hit:n.txt})));
    else out.notebook=staff.map(n=>({tag:'COACHING CAROUSEL',hit:n.txt}));
    // RISING & FALLING — the development stories (second-year leaps, slumps, Father Time)
    const dev=newsByTag(['DEV'],10);
    out.winners_losers={ winners:dev.filter(n=>/📈/.test(n.txt)).slice(0,4).map(n=>n.txt.replace(/^📈 /,'')),
      losers:dev.filter(n=>/📉/.test(n.txt)).slice(0,4).map(n=>n.txt.replace(/^📉 /,'')) };
    out.column={ byline:'Hank Mariucci', headline:'Offseason champions win nothing',
      body:`${gpick(["Every March somebody 'wins' the offseason and every January they're watching from the couch.","The tag is a tool, not a plan.","Retirements tell you more about a franchise than signings do."],season)} The clubs that matter are the ones quietly re-signing their own, drafting to a type, and letting the noisy teams pay retail in free agency. ${me?`${me.city} fans: watch what your front office does with its OWN guys before you judge the shopping spree.`:''} Rings are won in the building, not on the ticker.` };
    out.by_the_numbers=[ {stat:String((G.hofBallot||[]).filter(c=>c.retired===season).length||rNews.length), context:'notable retirements this offseason'},
      {stat:String(moves.length), context:'signings & trades on the wire this cycle'},
      {stat:(G.prospects&&G.prospects.length?String(G.prospects.length):'—'), context:'prospects on the incoming draft board'} ];
    { const heis=(G.college&&G.college.heisman||[])[0];
      out.campus={ byline:'Sallie Crane', headline:'The board is set', body:`The college season is in the books and the draft board is live. ${heis?`${heis.name} (${heis.pos}, ${heis.school}) sits at the top of most boards. `:''}Scouting departments are burning tape; the teams that do this month right eat for the next five years.`, heisman_watch:(G.college&&G.college.heisman||[]).slice(0,3).map(p=>`${p.name} (${p.pos}, ${p.school})`), draft_riser:'' }; }
    out.quote_of_week=(function(){ try{ const c=ballot[0]; if(!c) return null; return {text:'You always think there is one more season in the tank. The tank tells you otherwise.', attribution:`— ${c.name}, announcing his retirement`}; }catch(e){ return null; } })();
    return out;
  }
  function draftGazette(){
    const out={byline:'The Gazette staff'}, season=G.season, D=G.lastDraft, me=ut();
    const gr=(window.computeDraftGrades&&computeDraftGrades())||null;
    const first=D.made[0], r1=D.made.filter(p=>p.round===1);
    const qbs1=r1.filter(p=>p.pos==='QB').length;
    out.edition_kicker=`DRAFT SPECIAL · every pick graded inside`;
    out.lead={ headline:`${first?`${first.name} goes No. 1`:'The picks are in'} — the ${D.classYear} class arrives`,
      deck:`${r1.length} first-rounders, ${D.made.length} picks, ${qbs1?`${qbs1} quarterback${qbs1>1?'s':''} in round one, `:''}and a report card nobody in a front office wants to read.`,
      dateline:'DRAFT NIGHT — ', byline:'The Gazette',
      body:(first?`With the first pick of the ${D.classYear} draft, ${team(first.owner)?team(first.owner).city+' '+team(first.owner).nick:first.owner} selected ${first.name}, ${first.pos}, ${first.school}${first.honors?` — the ${first.honors}`:''}. `:'')+
        r1.slice(1,5).map(p=>`At ${p.overall}, ${p.owner} went ${p.name} (${p.pos}, ${p.school})`).join('. ')+
        `. ${qbs1>=3?'The quarterback run came early and often — desperation is the draft\'s oldest fuel. ':qbs1===0?'No quarterback heard his name in round one — a cold market for the most important position. ':''}`+
        `${me&&D.made.some(p=>p.owner===USER)?`${me.city}'s haul is graded below with everyone else's. The tape doesn't care about draft-night applause.`:''}` };
    if(gr){
      out.draft_grades=gr.rows.map(t=>({ team:t.team, letter:t.letter,
        best:t.best?`Best pick: ${t.best.pk.name} (${t.best.pk.pos}) R${t.best.pk.round} #${t.best.pk.overall}`:'',
        skinny:(t.rank===1?`Class of the year — value at every turn.`:t.rank<=5?`One of the cleaner boards in the league.`:t.rank>=gr.rows.length-2?`Reaches early, prayers late.`:t.letter[0]==='B'?`Solid, unspectacular, useful.`:t.letter[0]==='C'?`A board that raised eyebrows in rival war rooms.`:`Process questions all weekend.`) }));
      out.winners_losers={ winners:gr.rows.slice(0,3).map(t=>`${t.team} — ${t.letter}: ${t.best?t.best.pk.name+' headlines a real haul':'a clean board'}`),
        losers:gr.rows.slice(-3).reverse().map(t=>`${t.team} — ${t.letter}${t.worst?`: the ${t.worst.pk.name} pick drew whispers`:''}`) };
      out.by_the_numbers=[ gr.bestValue?{stat:`#${gr.bestValue.overall}`,context:`steal of the draft — ${gr.bestValue.name} (${gr.bestValue.pos}), a R${gr.bestValue.projRound||'?'} talent`}:null,
        gr.biggestReach?{stat:`#${gr.biggestReach.overall}`,context:`the reach — ${gr.biggestReach.name} to ${gr.biggestReach.owner}`}:null,
        {stat:String(qbs1),context:'quarterbacks in round one'},
        gr.firstQB?{stat:`#${gr.firstQB.overall}`,context:`first QB off the board — ${gr.firstQB.name} (${gr.firstQB.owner})`}:null ].filter(Boolean);
      out.column={ byline:'Hank Mariucci', headline:`Grades are for report cards. Careers are for tape.`,
        body:`${gr.rows[0].team} walk away with the cleanest card (${gr.rows[0].letter}) and ${gr.rows[gr.rows.length-1].team} with the ugliest (${gr.rows[gr.rows.length-1].letter}) — and none of it will matter if the development staffs don't do their jobs. ${gr.biggestReach?`The ${gr.biggestReach.name} pick at #${gr.biggestReach.overall}? Somebody in that room pounded the table, and somebody else should have pounded back. `:''}Three drafts from now we'll know who actually won this weekend. Clip this column and check my work.` };
    }
    // ROUND ONE, PICK BY PICK
    out.feature={ kicker:'ROUND ONE', headline:'The first round, pick by pick', byline:'The Gazette', dateline:'',
      body:r1.map(p=>`${p.overall}. ${p.owner}${p.via?` (via ${p.via})`:''} — ${p.name}, ${p.pos}, ${p.school}${p.arch&&p.arch!=='solid'?` (${p.arch})`:''}`).join('. ')+'.' };
    // UDFA GEM WATCH + the user's class in the notebook
    const nb=[];
    if(D.udfaTop&&D.udfaTop.length) nb.push({tag:'UDFA GEM WATCH',hit:`Undrafted but not unwatched: ${D.udfaTop.slice(0,4).map(u=>`${u.name} (${u.pos}, ${u.school||'—'})`).join(', ')} all signed priority deals. Every camp has one who sticks.`});
    const mine=D.made.filter(p=>p.owner===USER);
    if(mine.length) nb.push({tag:'YOUR CLASS',hit:`${me.city} came away with ${mine.length} picks: ${mine.slice(0,5).map(p=>`${p.name} (${p.pos}, R${p.round})`).join(', ')}${mine.length>5?'…':''}.`});
    const honored=D.made.filter(p=>p.honors).slice(0,3);
    if(honored.length) nb.push({tag:'HARDWARE',hit:`Decorated names off the board: ${honored.map(p=>`${p.name} (${p.honors})`).join('; ')}.`});
    out.notebook=nb;
    out.quote_of_week=(function(){ try{ if(!first) return null; const f=findPlayer(first.id); if(f&&f.p){ ensurePersona(f.p); const q=quote(f.p,'win',{}); if(q) return {text:q, attribution:`— ${first.name}, moments after going No. 1`}; } }catch(e){} return {text:'They passed on a lot of guys tonight. We remember that in this league.', attribution:'— a Day-3 pick, already writing the chip onto his shoulder'}; })();
    return out;
  }
  function proceduralGazette(){
    if(G.phase==='offseason') return offseasonGazette();
    if(G.week===0 && G.lastDraft && G.lastDraft.classYear===G.season) return draftGazette();
    const wk=G.week, season=G.season, results=G.lastResults||[];
    const u=results.find(r=>r.home===USER||r.away===USER), ut2=ut();
    const sortStand=standings();
    const top=sortStand[0], cellar=sortStand[sortStand.length-1];
    const news=G.news||[];
    const pn=n=>n?n.name:'—';
    const out={byline:'The Gazette staff'};
    // ---- real, persona-VOICED quotes (not stat-lines in quote marks) so the paper actually has a voice ----
    const _won=(ref,r)=>{ if(!ref||!r) return true; return ref.team===r.home ? r.hs>=r.as : ref.team===r.away ? r.as>=r.hs : true; };
    const voiced=(ref,r)=>{ try{ if(ref&&ref.id!=null){ const f=findPlayer(ref.id); if(f&&f.p){ ensurePersona(f.p); const q=quote(f.p, _won(ref,r)?'win':'loss', {}); if(q) return {text:q, by:ref.name}; } } }catch(e){} return ref?{text:ref.stat, by:ref.name}:null; };
    const pq=(ref,r)=>{ const v=voiced(ref,r); return v?`"${v.text}" — ${v.by}`:''; };
    // ---- lead ----
    if(wk===0){ out.lead_headline=`${season}: ${top.city} the team to beat, but the league is wide open`;
      out.preseason=`Training camps have broken and the ${season} season is upon us. On paper the ${top.city} ${top.nick} carry the look of a contender, but a league this deep rarely reads to script. ${ut2.city} enter the year with their own ambitions; ${ENG.teamOvr(ut2)>=82?'expectations are real':'a hungry roster looking to prove the doubters wrong'}. Across ${G.teams.length} teams, fresh faces from the draft and a restless free-agent market promise upheaval before the leaves turn. Football is back.`;
      out.lead_story=out.preseason;
    } else {
      const champLine=news.find(n=>n.tag==='CHAMPION');
      if(champLine){ out.lead_headline=champLine.txt.replace(/^🏆 /,''); out.lead_story=`${champLine.txt.replace(/^🏆 /,'')} A season of grind came down to the final whistle, and when it was over there was only one team left standing. The confetti will settle, but the ${season} champions have written their names into the league's history.`; }
      else { const blow=results.slice().sort((a,b)=>Math.abs(b.hs-b.as)-Math.abs(a.hs-a.as))[0];
        const w=blow?(blow.hs>blow.as?team(blow.home):team(blow.away)):top;
        out.lead_headline=u? (`${ut2.city} ${ (u.home===USER?u.hs>u.as:u.as>u.hs)?'roll on':'stumble'} as Week ${wk} reshapes the race`) : `${top.city} stay perfect atop the standings`;
        const lateSeason=wk>=Math.max(12,(G.maxWeek||17)-5);
        out.lead_story=`Week ${wk} is in the books, and the picture is sharpening. ${top.city} (${top.wins}-${top.losses}) sit atop the league${top.wins-top.losses>=3?', looking every bit the part of a contender':', though the chase pack is closing'}. `+
          (u? `Your ${ut2.city} ${ut2.nick} ${(u.home===USER?u.hs>u.as:u.as>u.hs)?`took care of business${u.potg&&u.potg.team===USER?`, with ${u.potg.name} (${u.potg.stat}) leading the way`:''}`:`came up short and have work to do`}. ` : '')+
          (blow&&Math.abs(blow.hs-blow.as)>=21? `Elsewhere, ${w.city} sent a message with a ${Math.max(blow.hs,blow.as)}-${Math.min(blow.hs,blow.as)} demolition. ` : '')+
          (lateSeason? `With ${(G.maxWeek||17)-wk} week${(G.maxWeek||17)-wk===1?'':'s'} left, every snap is a playoff snap — the bubble teams know exactly who they're scoreboard-watching. ` : '')+
          `At the other end, ${cellar.city} (${cellar.wins}-${cellar.losses}) are ${lateSeason?'playing for draft position now':'searching for answers'}.`;
      }
    }
    // ---- game features (prose recaps that read like a beat writer filed them) ----
    const gSeed=season*100+wk;
    out.game_features=(window.sourcedGameFeatures&&window.sourcedGameFeatures(results,3))||results.slice().sort((a,b)=>Math.abs((b.hs-b.as))-Math.abs((a.hs-a.as))).slice(0,3).map((r,gi)=>{
      const w=r.hs>=r.as?team(r.home):team(r.away), l=r.hs>=r.as?team(r.away):team(r.home), ws=Math.max(r.hs,r.as), ls=Math.min(r.hs,r.as);
      const m=ws-ls, homeWon=r.hs>=r.as;
      const lede = r.ot? gpick([`It took extra football, but ${w.city} found a way`,`Sixty minutes couldn't separate them; overtime could`,`${w.city} survived a heavyweight round that wouldn't end`],gSeed+gi)
        : m>=21? gpick([`${w.city} didn't just win — they made a statement`,`It was over by the third quarter`,`${w.city} ran ${l.city} out of their own building`,`Total control from the opening drive`],gSeed+gi)
        : m>=10? gpick([`${w.city} pulled away late and never looked back`,`A grinding, professional win for ${w.city}`,`${w.city} did the heavy lifting in the second half`],gSeed+gi)
        : gpick([`A one-score fight decided in the final minutes`,`${w.city} made one more play than ${l.city} — that was the whole game`,`Field position, third downs, and nerve — ${w.city} won all three`],gSeed+gi);
      const wRec=`${w.wins}-${w.losses}`, lRec=`${l.wins}-${l.losses}`;
      const stakes = w.wins-w.losses>=3? `The win keeps ${w.city} (${wRec}) squarely in the race` : w.losses-w.wins>=3? `For a ${wRec} ${w.nick} team, it's a rare good Sunday` : `${w.city} move to ${wRec}`;
      const lWoe = l.losses-l.wins>=3? `${l.city} (${lRec}) are running out of season` : `${l.city} fall to ${lRec}`;
      return { headline:`${w.city} ${m>=21?'rout':m>=10?'handle':r.ot?'outlast':'edge'} ${l.city}, ${ws}-${ls}${r.ot?' (OT)':''}`,
        body:`${lede}, ${homeWon?'defending home turf':'stealing one on the road'} ${ws}-${ls}${r.ot?' in overtime':''}. ${r.potg?`${r.potg.name} (${r.potg.team}) was the story of the box score — ${r.potg.stat}. `:''}${stakes}; ${lWoe}. ${gpick(['The tape will say it was closer than the score.','Complementary football, start to finish.','The locker room called it a must-have, and they had it.','One team left with answers, the other with questions.'],gSeed+gi+7)}` };
    });
    // ---- power rankings ----
    out.power_rankings=`POWER RANKINGS. `+sortStand.slice(0,5).map((t,i)=>`${i+1}. ${t.city} (${t.wins}-${t.losses})`).join('  ·  ')+`. `+
      `The ${top.city} ${top.nick} hold the top spot${top.wins-top.losses>=2?' comfortably':' by a nose'}; ${sortStand[1]?`the ${sortStand[1].city} ${sortStand[1].nick} are the most credible threat`:''}. Buyer beware lower down — ${cellar.city} have ground to make up.`;
    // ---- FA / rumor notebook ----
    const expiring=[].concat(...G.teams.map(t=>t.roster.filter(p=>p.ovr>=80&&(p.years||9)<=1).map(p=>({p,t})))).sort((a,b)=>b.p.ovr-a.p.ovr).slice(0,4);
    const demands=[].concat(...G.teams.map(t=>t.roster.filter(p=>p.flags&&p.flags.wantsOut).map(p=>({p,t})))).slice(0,3);
    const trades=(news||[]).filter(n=>n.tag==='TRADE'&&n.wk===wk).slice(0,4);   // this week's completed deals — the paper covers them
    out.fa_rumors=`THE NOTEBOOK. `+
      (trades.length? `TRANSACTION WIRE: ${trades.map(n=>n.txt.replace(/^🔁 BLOCKBUSTER — |^Trade: /,'')).join(' ')} ` : '')+
      (demands.length? `On the rumor mill: ${demands.map(d=>`${d.p.name} (${d.p.pos}, ${d.t.city})`).join(', ')} ${demands.length>1?'have':'has'} made noise about wanting out — one rival exec called it "a situation worth monitoring." ` : '')+
      (expiring.length? `Contract-year watch: ${expiring.map(e=>`${e.p.name} (${e.p.pos}, ${e.t.abbr})`).join(', ')} are all playing for their next deal, and agents are already working the phones. ` : 'The market is quiet, but quiet never lasts. ')+
      `Expect the temperature to rise as the season wears on.`;
    // ---- NCAA / draft ----
    if(window.ncaaInit) window.ncaaInit(false);
    const pros=(G.prospects||[]).slice(0,8);
    const heis=(G.college&&G.college.heisman&&G.college.heisman.length)?G.college.heisman.slice(0,3):pros.slice(0,3).map(p=>({name:p.name,pos:p.pos,school:p.school,line:window.collegeStatLine?window.collegeStatLine(p):'',score:window.collegeHeismanScore?window.collegeHeismanScore(p):p.grade}));
    const topStory=(G.college&&G.college.stories&&G.college.stories[0]&&G.college.stories[0].txt);
    out.ncaa_report=pros.length? `DRAFT ROOM. ${topStory?topStory+' ':''}Heisman watch: `+heis.map((p,i)=>`${i+1}. ${p.name} (${p.pos}, ${p.school}) ${p.line?`— ${p.line}`:''}`).join('  ')+`. `+
      `The first two rounds have real characters now: ${pros.slice(0,5).map(p=>`${p.name}, ${p.college&&p.college.archLabel?p.college.archLabel.toLowerCase():'top prospect'} at ${p.school}`).join('; ')}. Teams picking near the top are already tracking stock movement, not just grades.` : '';
    // ---- injury / off-field ----
    const inj=news.filter(n=>['INJURY','SUSPENSION','LEGAL','INCIDENT','HOLDOUT','CONCUSSION'].includes(n.tag)).slice(0,4);
    out.injury_report=inj.length? `THE WIRE. `+inj.map(n=>n.txt).join(' ') : `THE WIRE. A clean bill of health around the league this week — a rarity worth noting.`;
    // ---- talk show ----
    const a=top, b=sortStand[1]||cellar;
    { const T=window.PBPGEN&&PBPGEN.talk, seed=(G.season*1000+(G.week||0)), gp=(k,o)=>(T&&T[k]&&T[k].length)?gpick(T[k],seed+o):'';
      const uwin=u&&(u.home===USER?u.hs>u.as:u.as>u.hs);
      out.talk_show = T ?
`MARV: ${gp('marvOpen',1)}
DEION: ${gp('deionOpen',2)}
MARV: ${gp('marvBeat',3)}${u?` And your ${ut2.city} ${ut2.nick} — ${uwin?'they handled business.':'a rough one, no sugar-coating it.'}`:''}
DEION: ${gp('deionBeat',4)}${u?` ${uwin?'Credit where it\'s due, but I want to see it again.':'I\'m not panicking on them yet. Long season.'}`:''}
MARV: ${gp('marvBeat',7)}
DEION: ${gp('deionBeat',9)}
MARV: ${demands.length?`Quick hit — ${demands[0].p.name} wants out of ${demands[0].t.city}. Real or noise?`:gp('marvClose',5)}
DEION: ${demands.length?`Where there\'s smoke... that\'s a star done waiting. Somebody makes a call this week. Book it.`:gp('deionClose',6)}`
      :
`MARV: Welcome back to The Two-Minute Drill. The ${a.city} ${a.nick} keep winning.
DEION: Slow down, Marv. This race has legs.
MARV: ${u?`And your ${ut2.city} ${ut2.nick}? ${uwin?'Took care of business.':'Rough one.'}`:`The standings don't lie.`}
DEION: Ball don't lie, Marv. Ball don't lie.`;
    }
    // ===== RICH MASTHEAD SCHEMA (sports-page redesign) — same data, a real section =====
    const seed=season*1000+wk, gp2=(arr,o)=>arr&&arr.length?arr[Math.abs(seed+o)%arr.length]:'';
    const HANK_OPEN=["Thirty years on this beat and here's what I know:","Everybody wants to crown somebody. Slow down.","Call me a cynic \u2014 I've earned it.","Here's what nobody in this league wants to say out loud:","I've seen this movie, and it doesn't end how you think."];
    const tierOf=t=>{ const p=t.wins/Math.max(1,t.wins+t.losses); return p>=0.7?'elite':p>=0.5?'rising':p>=0.34?'reeling':'cellar'; };
    const POLL={elite:["looks the part; the schedule hasn't blinked","the standard the rest are chasing","complementary football that travels in January"],rising:["frisky \u2014 nobody wants to draw them","a get-right week from a real run","trending up if the arrow holds"],reeling:["searching for an identity, fast","leaking points and patience","need answers before it slips away"],cellar:["playing for next year, like it or not","a long season getting longer","the draft board is the only must-watch here"]};
    const prevRank=G._pollRank||{};
    out.power_poll=sortStand.slice(0,Math.min(16,sortStand.length)).map((tm,i)=>{ const pr=prevRank[tm.abbr]; const move=pr==null?'new':pr>i+1?'up':pr<i+1?'down':'same'; return {rank:i+1,team:tm.abbr,move,delta:pr==null?0:Math.abs(pr-(i+1)),record:`${tm.wins}-${tm.losses}`,blurb:`${gp2(POLL[tierOf(tm)],i)}.`}; });
    G._pollRank={}; sortStand.forEach((tm,i)=>G._pollRank[tm.abbr]=i+1);
    const leadR=(u&&u.potg)?u:(results[0]||null); const leadHero=(leadR&&leadR.potg)||null;
    out.lead={ headline:(out.lead_headline||'').replace(/^\ud83c\udfc6 /,''), deck:`${top.city} sit ${top.wins}-${top.losses} atop the league as Week ${wk} reshuffles the race.`, dateline:`${(u?ut2.city:top.city).toUpperCase()} \u2014 `, byline:'The Gazette', body:out.lead_story||'', pull_quote: pq(leadHero, leadR) };
    out.column={ byline:'Hank Mariucci', headline: top.wins-top.losses>=4?`Don't crown ${top.city} just yet`:`${cellar.city}'s problems run deeper than the record`,
      body:`${gp2(HANK_OPEN,wk)} ${top.city} (${top.wins}-${top.losses}) are the toast of the league, and good for them. But ${top.wins-top.losses>=4?"the trenches win in January, and I haven't seen them tested up front":"a two-game sample in October isn't a coronation"}. ${cellar.city} at the bottom? ${cellar.wins<=2?"That's not bad luck \u2014 that's a roster problem.":"Closer than the record says, but close doesn't count."}${u?` Your ${ut2.nick}? ${(u.home===USER?u.hs>u.as:u.as>u.hs)?"A win's a win, but style points matter when the bracket sets.":"That's the kind of loss that lingers if they let it."}`:''} Talk to me in December.` };
    out.game_stories=(out.game_features||[]).map((fz,i)=>{ const r=results[i]||{}; const hc=(team(r.home)||{city:''}); return { headline:fz.headline, byline:'The Gazette', dateline:`${(hc.city||'').toUpperCase()} \u2014 `, turning_point: r.potg?`${r.potg.name}'s ${r.potg.stat} swung it.`:'A second-half surge made the difference.', body:fz.body, pull_quote: pq(r.potg, r) }; });
    const num=[]; const addNum=(cat,lbl)=>{ try{ const L=(typeof leaders==='function')&&leaders(cat,1); if(L&&L[0]) num.push({stat:String(L[0].val),context:`${L[0].name} \u2014 ${lbl}`}); }catch(e){} };
    addNum('pass','passing yards'); addNum('rush','rushing yards'); addNum('rec','receiving yards'); addNum('sack','sacks'); num.push({stat:`${top.wins}-${top.losses}`,context:`${top.city} \u2014 best record in the league`});
    out.by_the_numbers=num;
    const nb=[]; (trades||[]).slice(0,2).forEach(n=>nb.push({tag:'TRANSACTION',hit:n.txt.replace(/^\ud83d\udd01 BLOCKBUSTER \u2014 |^Trade: /,'')}));
    if(demands&&demands.length) nb.push({tag:'RUMOR MILL',hit:`${demands[0].p.name} (${demands[0].p.pos}, ${demands[0].t.city}) is making noise about his future.`});
    nb.push({tag:'MVP RACE',hit:`${top.city}'s surge has the award chatter heating up.`}); (inj||[]).slice(0,2).forEach(n=>nb.push({tag:'INJURY',hit:n.txt}));
    { const _v=voiced(leadHero, leadR); if(_v && leadHero && _v.text!==leadHero.stat) nb.unshift({tag:'QUOTABLE', hit:`"${_v.text}" — ${_v.by}.`}); }   // a real voiced line in the notebook
    out.notebook=nb.slice(0,7);
    if(u){ const won=(u.home===USER?u.hs>u.as:u.as>u.hs), me=u.home===USER?u.hs:u.as, them=u.home===USER?u.as:u.hs;
      out.beat_notes={ byline:'Theo Briggs', team:USER, headline:won?`${ut2.nick} take care of business`:`${ut2.nick} let one slip`,
        body:`The ${ut2.city} ${ut2.nick} ${won?`got it done, ${me}-${them}`:`fell ${them}-${me}`}, and ${won?`the room feels it \u2014 but the schedule doesn't ease up`:`there's no panic yet, but the margin is shrinking`}. They sit ${ut2.wins}-${ut2.losses}.`,
        notes:[ `Record: ${ut2.wins}-${ut2.losses}.`, `Cap room: ${(typeof money==='function'&&typeof capSpace==='function')?money(capSpace(ut2)):'tight'}.`, `Owner mandate: ${(ut2.owner&&ut2.owner.expectation)?ut2.owner.expectation.label.toLowerCase():'compete'}.` ] }; }
    out.wire={ transactions:(trades||[]).map(n=>n.txt.replace(/^\ud83d\udd01 BLOCKBUSTER \u2014 /,'')).slice(0,5), injuries:(inj||[]).map(n=>n.txt).slice(0,5) };
    out.game_balls=results.slice().filter(r=>r.potg).sort((a,b)=>Math.abs(b.hs-b.as)-Math.abs(a.hs-a.as)).slice(0,3).map(r=>({player:r.potg.name,team:r.potg.team,reason:r.potg.stat}));
    try{ const sref=(G.leagueStars&&G.leagueStars[0])?findPlayer(G.leagueStars[0].id):null; if(sref&&sref.p){ ensurePersona(sref.p); out.quote_of_week={text:quote(sref.p,'mvp',{}),attribution:`\u2014 ${sref.p.name}, ${sref.p.pos}, ${sref.t.abbr}`}; } }catch(e){}
    if(!out.quote_of_week && leadHero){ const _v=voiced(leadHero, leadR); if(_v && _v.text!==leadHero.stat) out.quote_of_week={text:_v.text, attribution:`\u2014 ${leadHero.name}${leadHero.pos?', '+leadHero.pos:''}${leadHero.team?', '+leadHero.team:''}`}; }   // never leave the marquee quote empty
    { const NC=G.ncaa; if(NC&&NC.rankRows&&NC.rankRows.length){ const heis=((G.college&&G.college.heisman)||[]).slice(0,3);
      out.campus={ byline:'Sallie Crane', headline:NC.done?`${NC.champ?NC.champ.name:'A new champ'} reign supreme`:`${NC.rankRows[0].name} hold at No. 1`,
        body:`${NC.rankRows[0].name} (${NC.rankRows[0].w}-${NC.rankRows[0].l}) top the AP poll${NC.lastUpset?`, but ${NC.lastUpset} shook the board`:''}. The Heisman race and a deep draft class are must-watch for any front office shopping for help.`,
        heisman_watch:heis.map(p=>`${p.name} (${p.pos}, ${p.school})`), draft_riser:(G.prospects&&G.prospects[0])?`${G.prospects[0].name} (${G.prospects[0].pos}, ${G.prospects[0].school})`:'' }; } }
    { const blow=results.slice().sort((a,b)=>Math.abs(b.hs-b.as)-Math.abs(a.hs-a.as))[0];
      out.winners_losers={ winners:[ blow?`${(blow.hs>blow.as?team(blow.home):team(blow.away)).city} \u2014 a statement win`:'', `${top.city} \u2014 still atop the standings`, demands&&!demands.length?'':'' ].filter(Boolean), losers:[ blow?`${(blow.hs>blow.as?team(blow.away):team(blow.home)).city} \u2014 run off the field`:'', `${cellar.city} \u2014 sinking`, (demands&&demands.length)?`${demands[0].t.city} \u2014 locker-room noise`:'' ].filter(Boolean) }; }
    // ----- GAME OF THE WEEK: a long-form feature composed from the actual drive log -----
    try{ const gow=(typeof cgGameOfWeek==='function')&&cgGameOfWeek(results);
      if(gow){ const dr=(typeof resultPBP==='function')?resultPBP(gow):[]; const hc=team(gow.home),ac=team(gow.away);
        const win=gow.hs>=gow.as?hc:ac, lose=gow.hs>=gow.as?ac:hc, ws=Math.max(gow.hs,gow.as), ls=Math.min(gow.hs,gow.as), hero=gow.potg;
        const sd=dr.filter(d=>d.pts>0);
        let body=`Under ${ENG.pick(['a low autumn sky','the lights','a restless crowd','gathering clouds'])}, the ${win.city} ${win.nick} and the ${lose.city} ${lose.nick} traded haymakers for sixty minutes${gow.ot?' and then some':''} — and when the dust cleared it was ${win.city}, ${ws}-${ls}${gow.ot?', in overtime':''}. `;
        body+=`It was ${cgGowLabel?cgGowLabel(gow):'a game for the ages'} you circle on the calendar. `;
        sd.slice(0,7).forEach(d=>{ const t=d.team===gow.home?hc:ac; const sh=d.score?d.score[0]:d.h, sa=d.score?d.score[1]:d.a; const last=(d.plays&&d.plays.length)?stripHTML(d.plays[d.plays.length-1]):''; const kind=d.result==='TD'?'found the end zone':d.result==='FG'?'split the uprights':'put points on the board'; body+=`The ${t.nick} ${kind}${last?` — ${last}`:''}, and the scoreboard read ${sh}-${sa}. `; });
        if(hero) body+=`Through it all, ${hero.name} was the man of the hour, ${hero.stat}. `;
        body+=`When the final gun sounded across ${(hc.city||'the stadium')}, the ${win.nick} had it, ${ws}-${ls}${gow.ot?' — a finish they will be replaying for years':''}.`;
        out.feature={ kicker:'GAME OF THE WEEK', headline:`${win.city} ${win.nick} survive ${lose.city} in ${(cgGowLabel?cgGowLabel(gow):'a classic')}`, byline:'Hank Mariucci', dateline:`${(hc.city||'').toUpperCase()} \u2014 `, body, pull_quote: pq(hero, gow) };
      }
    }catch(e){}
    out.edition_kicker=`${top.city} ${top.wins}-${top.losses} \u00b7 Week ${wk} shakeup${u?` \u00b7 your ${ut2.nick} ${(u.home===USER?u.hs>u.as:u.as>u.hs)?'roll':'stumble'}`:''}`;
    return out;
  }

  // preseason / empty-timeline seed so the Feed is never blank
  function feedSeed(){ if(G.feed&&G.feed.length) return; const top=standings()[0], me=ut();
    feedPush(ANALYST,`Season ${G.season} preview: the ${top.city} ${top.nick} look like early favorites, but this league has a way of humbling front-runners.`,'PRE',true);
    feedPush(INSIDER,`Camps are open across all ${G.teams.length} teams. Storylines everywhere — contract standoffs, position battles, and a draft class scouts can't stop talking about.`,'PRE');
    if(me) feedPush(beat(me),`${me.city} ${me.nick} report to camp. ${ENG.teamOvr(me)>=82?'Expectations are sky-high this year.':'A lot to prove in '+G.season+'.'} ${hashtag(me)}`,'PRE');
    feedPush(TAKES,`calling it now: the ${pick(G.teams).city} make a run nobody sees coming. screenshot this.`,'TAKE');
    feedPush(STATS,`📊 ${G.teams.length} teams. One trophy. Let's run it back.`,'PRE'); }
  /* ---------------- PLAYER VOICES: persona-flavored quotes (the room finally has personalities) ---------------- */
  const GEN={
    win:['Team win. On to the next.','Good win. Credit the guys around me.','That\'s a W. Back to work.'],
    loss:['Tip your cap and move on.','We\'ll be better. Long season.','That one stings. We fix it.'],
    mvp:['Blessed. This is a team award.','Grateful — but I want the ring more.'],
    milestone:[x=>`${x&&x.stat||'Another milestone'} — couldn\'t do it without my guys.`],
    breakout:['Everybody passed on me. I remember every name.','Chip on my shoulder since draft night.'],
    trash:[x=>`Looking forward to ${x&&x.rival||'this week'}. Should be fun.`],
    contract:['We\'ll let the business handle itself. My focus is the team.'],
    suspended:['I take full responsibility. I\'ll be back better.'],
    traded:[x=>`Grateful for my time there. Excited for ${x&&x.dest||'the next chapter'}. Let\'s work.`],
    rivalry:[x=>`Me and ${x&&x.rival||'them'} again. These are the games you live for.`],
    retire:['What a ride. Thankful for every snap.'],
    generic:['Locked in.','Just focused on the work.','We\'ll see.']
  };
  const PQ={
    captain:{ win:['Team win. That\'s all that matters. On to the next.','Proud of this group. We do it together.'],
      loss:['That one\'s on me. We\'ll be better — I\'ll make sure of it.','Leaders own it. I will.'],
      mvp:['Individual stuff is nice. Rings are better. Thank you to my teammates.'],
      contract:['I love it here. We\'ll let the business handle itself; my focus is the team.'],
      breakout:['Just trying to be there for the young guys. The rest takes care of itself.'] },
    trash_talker:{ win:[x=>`They knew what was coming and still couldn\'t stop it. Easy work.`,'Talk is cheap. Scoreboard isn\'t. 😤'],
      loss:['We beat ourselves. Nobody on that field is better than us.'],
      trash:[x=>`${x&&x.rival||'They\'ve'} been talking all week. Hope it was worth it. 😂`, x=>`Put ${x&&x.rival||'him'} on a poster. Tune in. 🍿`],
      mvp:['Been telling y\'all I\'m the best. Now it\'s official. 🏆'],
      rivalry:[x=>`${x&&x.rival||'You'} again? I OWN this matchup. Pull up.`] },
    headcase:{ win:['I told y\'all. When I\'m right, we\'re unstoppable. Imagine if they actually used me.'],
      loss:['Hard to win when they don\'t get me the ball. Just being honest. 🤷'],
      trash:[x=>`${x&&x.rival||'He'} is overrated and everybody knows it. I\'ve been the best at my position for years.`],
      contract:['Pay me or trade me. I\'m done being disrespected by this organization. 💯'],
      suspended:['The league has had it out for me since day one. This isn\'t over.'],
      traded:[x=>`New chapter. ${x&&x.dest||'They'} actually appreciate greatness. They\'ll see what they were missing.`],
      mvp:['Finally. They couldn\'t deny me any longer. Remember who doubted me.'] },
    diva:{ win:['W. Now get me the rock more and it\'s not even close.'],
      loss:['Can\'t do it all myself out there. 🤷'],
      contract:['I put up the numbers. Numbers get paid. Simple.'],
      trash:[x=>`Throw it my way and watch what happens to ${x&&x.rival||'whoever lines up'}.`] },
    gamer:{ win:['1-0 this week. That\'s the only number I care about.'],
      loss:['Hate losing more than I love winning. We fix it. Tonight.'],
      breakout:['Chip on my shoulder since draft night. I\'m just getting started.'],
      mvp:['Cool. Now I want the next one. And the ring.'] },
    showman:{ win:['you\'re WELCOME 😤🔥 must-see TV baby'],
      loss:['we\'ll be back, relax. the show goes on 🎬'],
      mvp:['MVP?? say it louder for the people in the cheap seats 🏆🐐'],
      trash:[x=>`pull up ${x&&x.rival||'fam'}, bring your camera crew. it\'s a movie 🎥`] },
    quiet_pro:{ win:['Good team win. Credit the guys up front. Back to work Monday.'],
      loss:['Tip your cap, move on. Long season.'],
      contract:['Not my department. I just play.'],
      mvp:['Humbled. Lot of people made this possible.'] }
  };
  // a guard never begs for "the ball" — route non-skill headcases/divas to position-appropriate gripes
  const SKILL=new Set(['QB','RB','FB','WR','TE']);
  function posGroup(pos){ if(SKILL.has(pos)) return 'skill'; if(['T','G','C','DE','DT'].includes(pos)) return 'trench'; if(['OLB','ILB','LB','MLB','CB','S','FS','SS'].includes(pos)) return 'defense'; return 'st'; }
  const NONSKILL_Q={
    headcase:{
      loss:{ trench:['Can\'t win up front when the scheme wastes me. I\'m the best lineman in this league and it\'s not close.','Put a body on me, double me — still didn\'t matter. They just won\'t admit who carries this line.'],
        defense:['Hard to make plays when they sit me in coverage all day. Turn me loose and watch.','I should be the focal point of this defense. Instead they game-plan me out. Their loss.'],
        st:['I did my job. Maybe ask the other 52 about theirs.'] },
      win:{ trench:['We win because of the work up front — people just never chart it. I do.','Pancakes all game. Y\'all don\'t even keep that stat. Should.'],
        defense:['When they finally let me hunt, this is what happens. Imagine using me right.','Quiet day for whoever I lined up across from. You\'re welcome.'],
        st:['Automatic. As usual.'] },
      mvp:{ trench:['Linemen never get the credit. I\'m here to change that.'], defense:['They can\'t scheme around me anymore. Finally getting my due.'], st:['Respect the specialists for once.'] },
      contract:{ trench:['Pay the big men or watch the whole thing collapse. Simple.'], defense:['Pay me or trade me. I\'m done being disrespected. 💯'], st:['I\'m the most reliable man on this roster. Act like it.'] } },
    diva:{
      loss:{ trench:['Can\'t carry this whole line by myself out there. 🤷'], defense:['Let me blitz once in a while and we\'re not even having this talk. 🤷'], st:['I did my part. 🤷'] },
      win:{ trench:['W. Now get me some help up front and it\'s a wrap.'], defense:['W. Turn me loose more and it\'s not close.'], st:['W. Money as always.'] },
      contract:{ trench:['I anchor this line. Anchors get paid.'], defense:['I make the plays nobody charts. Pay me.'], st:['Most accurate man on the team. Numbers get paid.'] } }
  };
  function quote(p, ctx, x){ const per=(p&&p.persona)||'quiet_pro';
    const grp=p?posGroup(p.pos):'skill';
    if(grp!=='skill' && NONSKILL_Q[per] && NONSKILL_Q[per][ctx] && NONSKILL_Q[per][ctx][grp]){
      let q2=pick(NONSKILL_Q[per][ctx][grp]); if(typeof q2==='function') q2=q2(x||{}); return q2; }
    if(window.PBPGEN && PBPGEN.quotes && PBPGEN.quotes[per] && PBPGEN.quotes[per][ctx] && PBPGEN.quotes[per][ctx].length){ return pick(PBPGEN.quotes[per][ctx]); }   // large persona-flavored pools
    let pool=(PQ[per]&&PQ[per][ctx]) || GEN[ctx] || GEN.generic;
    let q=pick(pool); if(typeof q==='function') q=q(x||{}); return q; }
  // a player tweets in his own voice
  function athleteTweet(p, ctx, x, big){ if(!p) return; feedPush(playerAcct(p), quote(p,ctx,x), (x&&x.tag)||'NEWS', !!big); }
  // a dominant star takes over the discourse
  function starTakeover(star, kind, x){ if(!star) return; x=x||{}; const t=x.teamAbbr||'';
    const lines={
      face:[`Let\'s be honest: the league runs through ${star.name} right now. ${t?'The '+t+' ':''}${POS_NOUN[star.pos]||star.pos} is the best player in football and it isn\'t close.`,
        `Every week it\'s the same — ${star.name} does something that makes you put the remote down. A bona fide superstar.`],
      record:[`📊 ${star.name} is on pace for ${x.pace||'a record-setting season'}. We are watching greatness in real time.`,
        `Update on ${star.name}: ${x.pace||'historic numbers'}. Start the conversation now.`],
      mvp:[`The MVP race is over. ${star.name} has separated from the field — it\'s his award to lose.`,
        `If you\'re voting anyone but ${star.name} for MVP, I need to see your ballot. He\'s carrying ${t||'his team'}.`],
      tear:[`${star.name} is on an absolute heater. ${t?'The '+t:'They'} go as he goes, and right now he\'s unstoppable.`] };
    const pool=lines[kind]||lines.face;
    feedPush(kind==='record'?STATS:ANALYST, pick(pool), 'STAR', true); }
  // expose
  window.VOICES={feedTick,feedTrade,feedDraftPick,draftCommentary,proceduralGazette,feedPush,feedSeed,sideline,quote,athleteTweet,starTakeover,playerAcct};
})();
