/* ============================================================
   FPS 2026 — ai.js : in-browser Claude integration.
   Calls the Anthropic API directly from the game (your key, stored
   locally, never sent anywhere else) so the Gazette + talk show write
   themselves automatically each week. No Python, no server.
   ============================================================ */
const AI = (() => {
  'use strict';
  const LS = 'fps_ai';
  let _curCtrl=null;   // AbortController of the in-flight request, so the UI can cancel a hung write
  function cancel(){ try{ if(_curCtrl) _curCtrl.abort(); }catch(e){} }
  // map a stale/typo'd model id to a valid current one so a bad saved config doesn't 404 every request
  function fixModel(m){ m=String(m||'').trim(); return ({'claude-sonnet-4-6':'claude-sonnet-5'})[m] || m || 'claude-opus-4-8'; }
  function cfg(){ try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch(e){ return {}; } }
  function setCfg(c){ localStorage.setItem(LS, JSON.stringify(Object.assign(cfg(), c))); }
  // provider: 'local' (Ollama on THIS machine), 'cloud' (Anthropic), or 'off'
  function provider(){ const c=cfg(); if(c.provider) return c.provider; if(c.key && c.key.length>10) return 'cloud'; return 'off'; }
  function on(){ return provider()!=='off'; }
  function localUrl(){ return (cfg().localUrl||'http://localhost:11434').replace(/\/+$/,''); }
  function localModel(){ return cfg().localModel||'llama3.2:1b'; }   // smallest/fastest by default — best latency for live booth color
  function keepAlive(){ return cfg().keepWarm||'30m'; }   // keep the model loaded so calls stay warm/fast
  function ready(){ const p=provider(); return p==='cloud'? !!(cfg().key&&cfg().key.length>10) : p==='local'; }

  async function cloudCall(system, user, maxTokens){
    const c = cfg();
    const key = String(c.key||'').trim();   // trim in case a paste carried a trailing space/newline (would break the header)
    if(!key) throw new Error('No Anthropic API key set (open Settings → Newsroom).');
    // Hard timeout so a stalled request (VPN/proxy that accepts the connection but never answers) can't hang the
    // writer forever — without this, the await never settles and the Gazette stays wedged on "Writing…".
    // The abort must cover the RESPONSE-BODY read (res.json), not just fetch() — a proxy that sends headers then
    // stalls the body would otherwise hang forever past the timeout. So the whole call runs in one try under the timer.
    const ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null; _curCtrl=ctrl;
    const timer = ctrl ? setTimeout(()=>{ try{ctrl.abort();}catch(e){} }, 150000) : null;   // 150s: Opus is slow on a full paper (~100-120s); the live elapsed timer + Cancel button let the user bail early, so a generous backstop is safe
    try{
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', signal: ctrl?ctrl.signal:undefined,
        headers:{ 'content-type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model: fixModel(c.model), max_tokens: maxTokens || 4000, system, messages:[{role:'user', content:user}] })
      });
      if(!res.ok){ let t=''; try{ t=await res.text(); }catch(e){} throw new Error(`API ${res.status} — ${t.slice(0,240)}`); }
      const j = await res.json();   // inside the timeout guard now: a stalled body aborts at 85s instead of hanging
      return (j.content||[]).map(b=>b.text||'').join('').trim();
    }catch(e){
      if(e && e.name==='AbortError') throw new Error("The request to api.anthropic.com timed out after 150s (or you hit Cancel). Opus is slow on a full paper — pick ⚡ Fast · Sonnet (it's ~2-3× faster with great prose), or 🏃 Haiku for the fastest write.");
      if(e && /^API \d/.test(String(e.message||''))) throw e;   // a real HTTP-status error (4xx/5xx) — surface it as-is
      // otherwise the request never got a response: blocked before it left the browser (ad/privacy blocker, VPN/proxy/firewall, offline)
      throw new Error("Couldn't reach api.anthropic.com — the request was blocked before leaving the browser. Likely an ad/privacy blocker extension, a VPN/proxy/firewall, or no connection. Allowlist api.anthropic.com or disable blockers for this page, then retry.");
    } finally { if(timer) clearTimeout(timer); }
  }

  // local Ollama — num_predict caps output length (the #1 latency lever); model stays warm via keep_alive.
  async function localCall(system, user, maxTokens, opts){
    opts=opts||{};
    const ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null; _curCtrl=ctrl;
    const timer = ctrl ? setTimeout(()=>{ try{ctrl.abort();}catch(e){} }, 90000) : null;   // don't let a stuck Ollama wedge the writer
    let res;
    try{
      res = await fetch(localUrl()+'/api/chat', {
        method:'POST', headers:{'content-type':'application/json'}, signal: ctrl?ctrl.signal:undefined,
        // per the latency benchmark: num_predict is the dominant lever (~9ms/token); do NOT set num_ctx (forces a reload for no gain on short prompts).
        body: JSON.stringify({ model: localModel(), stream:false, keep_alive: keepAlive(),
          options:{ num_predict: opts.numPredict || maxTokens || 512, temperature: opts.temp!=null?opts.temp:0.8, top_p: 0.9 },
          messages:[{role:'system',content:system},{role:'user',content:user}] })
      });
    }catch(e){ if(e&&e.name==='AbortError') throw new Error('Local AI (Ollama) timed out after 120s — is the model loaded? Try a smaller model or hit Test.'); throw e; }
    finally{ if(timer) clearTimeout(timer); }
    if(!res.ok){ let t=''; try{ t=await res.text(); }catch(e){} throw new Error(`Ollama ${res.status} — ${t.slice(0,200)}`); }
    const j = await res.json();
    return ((j.message&&j.message.content)||'').trim();
  }

  async function call(system, user, maxTokens, opts){ return provider()==='local' ? localCall(system,user,maxTokens,opts) : cloudCall(system,user,maxTokens); }

  // SHORT + fast + NEVER throws — for live commentary (returns '' on any failure → game falls back to templates)
  async function color(system, user, opts){ try{ if(!on()) return ''; return await call(system, user, (opts&&opts.numPredict)||36, Object.assign({numPredict:36,temp:0.8}, opts||{})); }catch(e){ return ''; } }

  // preload the local model so the first real call isn't a cold start
  async function warm(){ try{ if(provider()!=='local') return; await fetch(localUrl()+'/api/chat', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ model:localModel(), stream:false, keep_alive:keepAlive(), options:{num_predict:1}, messages:[{role:'user',content:'ok'}] }) }); }catch(e){} }

  // tolerant JSON extraction (model may wrap the object in prose/fences)
  function parseObj(txt){
    if(txt==null) throw new Error('empty AI response');
    let t=String(txt).trim().replace(/^```(?:json)?/i,'').replace(/```\s*$/,'').trim();
    const i=t.indexOf('{'); if(i<0) throw new Error('no JSON object in the AI response');
    t=t.slice(i);
    const fixCommas=x=>x.replace(/,(\s*[}\]])/g,'$1');   // strip trailing commas
    // walk with a bracket STACK so we balance both {} and [] (and ignore brackets inside strings)
    const stack=[]; let inStr=false,esc=false,end=-1;
    for(let k=0;k<t.length;k++){ const c=t[k];
      if(inStr){ if(esc)esc=false; else if(c==='\\')esc=true; else if(c==='"')inStr=false; continue; }
      if(c==='"')inStr=true;
      else if(c==='{'||c==='[')stack.push(c);
      else if(c==='}'||c===']'){ stack.pop(); if(!stack.length){ end=k; break; } } }
    if(end>=0){ try{ return JSON.parse(fixCommas(t.slice(0,end+1))); }catch(e){} }   // clean object (ignores trailing prose)
    try{ return JSON.parse(fixCommas(t)); }catch(e){}
    // truncated mid-output: close the open string + remaining brackets (reverse order) and parse what arrived
    try{ let s2=t; if(inStr) s2+='"'; s2=s2.replace(/,\s*$/,'');
      for(let k=stack.length-1;k>=0;k--) s2 += (stack[k]==='{'?'}':']');
      return JSON.parse(fixCommas(s2)); }catch(e){}
    throw new Error('AI returned malformed JSON (try Cloud, or a different model)');
  }

  const SYSTEM =
    "You are the entire masthead of THE GRIDIRON GAZETTE, the Sunday sports section of a fictional pro-football "
    + "league (FPS Football 2026). You do NOT write like a recap bot. You write like a great metro newspaper sports "
    + "desk: vivid, specific, opinionated where the byline calls for it, ironclad on facts. THE STAFF (stay in voice per byline): "
    + "THE GAZETTE = the news desk, clean AP style, present-tense headlines, datelines. "
    + "HANK MARIUCCI = lead columnist, a grizzled 30-year vet who distrusts hype, loves the trenches, writes ONE sharp argument per column, first person, has opinions, never just recaps. "
    + "DR. VANESSA PRUITT = analytics columnist; efficiency, the number nobody noticed; calm, a little contrarian to Hank; backs every claim with a stat in the data. "
    + "THEO BRIGGS = beat writer embedded with the user's club; knows the locker room, slightly partial but honest; writes the what-it-means/what's-next angle. "
    + "SALLIE CRANE = college & draft correspondent; ties the AP Top 25, Heisman race and rising prospects back to the pro teams that need them. "
    + "THE MAILMAN = wry mailbag host. MARV & DEION = the TV desk (Two-Minute Drill); Marv earnest, Deion the provocateur. "
    + "STANDARDS (non-negotiable): (1) GROUND EVERY CLAIM IN THE DATA — standings, scores, real box lines, real drive-by-drive play-by-play, leaders, mvpRace, records, transactions, freeAgents, offField, and a live college season (AP poll, Heisman, prospects). Use ONLY players, teams, coaches, scores and plays present in the data; NEVER invent a player, team, score, injury, trade or stat; take turning points from the actual play-by-play. "
    + "(2) SPECIFICITY OVER SUMMARY: a real game story has ONE turning point, ONE hero, ONE quote — name the play, the number, the moment. "
    + "(3) AP STYLE: headlines present tense, no period, <=9 words; datelines 'CITY — '; full name on first reference then last name. "
    + "(4) VIVID BUT ACCURATE: color and a sourced rumor ('one AFC GM told the Gazette') are welcome if the underlying fact is in the data. PG-13, all fictional. "
    + "(5) ANTI-REPETITION: vary sentence openings and verbs across fields; never reuse the same adjective twice in one paper; each game story opens differently; the column takes a stance the lead did NOT take. "
    + "(6) PULL QUOTES sound like that player's persona and are attributed to a real name. Return ONLY one JSON object, no markdown, no code fence.";

  function prompt(data){
    const wk = data.week||0;
    const cloud = (typeof AI!=='undefined' && AI.provider && AI.provider()==='cloud');
    const even = (wk%2===0);
    return `Week ${wk} snapshot (JSON):\n\`\`\`json\n${JSON.stringify(data).slice(0,60000)}\n\`\`\`\n\n`
      + "Produce this Sunday's GRIDIRON GAZETTE as ONE JSON object with these keys. Word counts are targets; honor the bylines and standards.\n"
      + 'ALWAYS include:\n'
      + '- "edition_kicker": <=12 words, three beats joined by " · " (the week\'s storylines).\n'
      + '- "lead": {"headline" <=9w present-tense, "deck" <=22w, "dateline" "CITY — " (home city of the lead game), "byline" "The Gazette", "body" ~180w grounded in a real score/standing/record, "pull_quote" <=18w attributed to a real player}.\n'
      + '- "feature": THE CENTERPIECE — a LONG-FORM game story (~520-650 words) on game_of_week (the marquee game of the week, a '+(data.game_of_week?data.game_of_week.label:'')+'). {"kicker" "GAME OF THE WEEK", "headline" <=11w, "byline" "Hank Mariucci", "dateline" "CITY — " (use game_of_week.homeCity), "body" the full narrative arc built ONLY from game_of_week.drives (the actual play-by-play): set the scene, trace the swings quarter by quarter citing the REAL running scores in drives[].score, name the hero(es) from game_of_week.box, build to the decisive drive and the final gun. Vivid, AP style, every beat grounded in the drives. "pull_quote" <=18w attributed to a real player in that game}. Make it sing.\n'
      + '- "game_stories": array of EXACTLY 3 (one per sourced_game_features item, same order), each {"headline" <=9w, "byline" "The Gazette", "dateline" "CITY — ", "turning_point" one sentence taken from THAT game\'s play-by-play, "body" ~120w NARRATIVE (hero+arc+stakes, not a box score), "pull_quote" <=16w attributed to a named player in that game}. Open all three differently.\n'
      + '- "power_poll": one entry per team in standings (or top 12), {"rank", "team" (abbr), "move" up|down|same|new, "delta" int, "record" "W-L", "blurb" <=24w that cites a real number}.\n'
      + '- "notebook": 5-8 {"tag","hit" <=40w} grounded in transactions/offField/mvpRace/records/streaks.\n'
      + '- "by_the_numbers": 5-7 {"stat","context" <=14w} from leaders/records/box.\n'
      + `- "beat_notes": {"byline" "Theo Briggs", "team" "${data.user}", "headline" <=10w, "body" ~150w on the ${data.user} result and what's next, "notes": 3 quick beat bullets}.\n`
      + '- "wire": {"transactions":[AP-terse, LEAD with completed trades/signings], "injuries":["PLAYER (TEAM) — status" from offField]}.\n'
      + '- "quote_of_week": {"text" <=30w, "attribution" "— Name, POS, TEAM"}.\n'
      + '- "game_balls": 3 {"player","team" (abbr),"reason" <=18w from box/PBP}.\n'
      + '- "campus": {"byline" "Sallie Crane", "headline" <=10w, "body" ~130w (AP poll movement + Heisman race + a draft riser tied to a team need), "heisman_watch":[top-3 "Name (POS, School)"], "draft_riser":"Name — the team need he fills"}. If no college data, set body "" and arrays [].\n'
      + '- "talk_show": ~320w transcript of "The Two-Minute Drill", lines "MARV: ..." and "DEION: ...", debating THIS week, ending on a Deion provocation.\n'
      + (even ? '- "winners_losers": {"winners":[3 <=16w grounded],"losers":[3 <=16w grounded]}.\n' : '')
      + (cloud
          ? ('PREMIUM (you are the cloud desk — include all):\n'
             + '- "column": {"byline" "Hank Mariucci", "headline" <=10w (a TAKE), "body" ~200w first-person opinion, ONE argument, a stance the lead did not take}.\n'
             + (even
                 ? '- "mailbag": 3 {"from" "Name, City", "question" <=30w fan voice, "answer" <=60w in The Mailman\'s wry voice, grounded}.\n'
                 : '- "analytics_desk": {"byline" "Dr. Vanessa Pruitt", "headline" <=10w, "body" ~150w making ONE efficiency argument from leaders/records}.\n'))
          : '(Local model: you may omit "column","mailbag","analytics_desk" — the paper fills those locally. Cap power_poll to top 12, notebook to 5.)\n')
      + (wk===0
          ? '\nIt is PRESEASON: make the lead a season preview and add "preseason" (~180w); set game_stories [] and game_balls [].'
          : '\nRegular-season week: set "preseason" to "".');
  }

  async function gazette(data){ const cloud=(provider()==='cloud'); return parseObj(await call(SYSTEM, prompt(data), cloud?4500:3000)); }   // cloud cut 8000→4500: ~2× faster on Sonnet; procedural backfill fills any sections the model doesn't reach

  // ---- FRESH STORYLINES: ask Claude to invent a brand-new scenario grounded in the real league ----
  const SCEN_SYS =
    "You are the head storyline writer for a fictional pro-football league (FPS Football 2026). "
    + "Given a snapshot of the league, INVENT ONE fresh, specific, surprising storyline — a feud, scandal, "
    + "holdout, breakout, locker-room saga, bold coaching gamble, viral moment, redemption, or rivalry flare-up. "
    + "Be creative and VARIED; never reuse the same beat twice. Ground it ONLY in the players, teams, and coaches "
    + "provided — use their EXACT names. Everything is FICTIONAL and PG-13 (juicy is fine, nothing graphic or hateful). "
    + "Keep effects modest and realistic. Return ONLY a JSON object, no markdown.";
  function scenPrompt(data){
    return `League snapshot (JSON):\n\`\`\`json\n${JSON.stringify(data).slice(0,9000)}\n\`\`\`\n\n`
      + 'Invent ONE storyline. Return ONLY this JSON shape:\n'
      + '{"type":"feud|scandal|holdout|breakout|drama|viral|redemption|coaching|rivalry",'
      + '"team":"<an abbr from the snapshot>","player":"<EXACT player name from the snapshot, or null>",'
      + '"player2":"<optional second exact name or null>","headline":"<8-12 word headline>",'
      + '"story":"<~45 vivid words>",'
      + '"tweets":[{"handle":"@handle","name":"Display Name","text":"<in-character tweet, <200 chars>"}],'
      + '"effect":{"morale":<-25..10>,"outGames":<0..3>,"wantsOut":<true|false>,"moraleTeam":<-6..2>}}'
      + '\nThe tweets array may hold 1-3 entries (the player, a reporter, a fan). Make it feel like real league drama.';
  }
  async function scenario(data){ return parseObj(await call(SCEN_SYS, scenPrompt(data), 700)); }

  // ---- FRESH QUOTES: one batched call writes the week's quotes in each player's own voice ----
  const QUOTE_SYS =
    "You are a sports-media ghostwriter. For EACH request, write that player's quote in his OWN voice, matching his "
    + "persona — captain: humble/accountable/team-first; trash_talker: brash, calls people out; headcase: me-first, "
    + "inflammatory, victim narrative; diva: wants the ball/the numbers; gamer: intense, all-business; showman: flashy, "
    + "entertaining; quiet_pro: clichés, deflects — and the given context. Under 180 characters each, PG-13, sound real. "
    + "Return ONLY a JSON array, one entry per request, same names.";
  function quotePrompt(reqs){
    return `Requests (JSON):\n\`\`\`json\n${JSON.stringify(reqs).slice(0,6000)}\n\`\`\`\n\n`
      + 'Return ONLY: [{"name":"<exact name from the request>","text":"<the quote>"}]';
  }
  async function quotes(reqs){
    const txt=await call(QUOTE_SYS, quotePrompt(reqs), 700);
    const m=txt.match(/\[[\s\S]*\]/); const arr=JSON.parse(m?m[0]:txt);
    return Array.isArray(arr)?arr:(arr&&arr.quotes)||[];
  }

  // ---- BRANDED NAMES: Claude names rivalries + dynasties so the headline beats feel authored ----
  const NAME_SYS =
    "You are a sports-media branding wordsmith. Give each rivalry or dynasty a punchy, evocative, BRANDABLE nickname "
    + "— in the spirit of 'The Border War', 'Bay Bridge Bowl', 'The Black-and-Gold Dynasty', 'Titletown', 'The Gunslinger "
    + "Duel'. 2-5 words, no surrounding quotes, no emoji. Lean on geography, colors, the players/coach, or the stakes. "
    + "Return ONLY a JSON array.";
  function namePrompt(reqs){
    return `Items (JSON):\n\`\`\`json\n${JSON.stringify(reqs).slice(0,5000)}\n\`\`\`\n\n`
      + 'Return ONLY: [{"id":"<exact id from the item>","name":"<the nickname>"}]';
  }
  async function names(reqs){
    const txt=await call(NAME_SYS, namePrompt(reqs), 500);
    const m=txt.match(/\[[\s\S]*\]/); const arr=JSON.parse(m?m[0]:txt);
    return Array.isArray(arr)?arr:(arr&&arr.names)||[];
  }

  // ---- BROADCAST FACTS: short game-specific notes for the announcer to drop once each during the game ----
  // Returns a Promise that resolves to an array of strings (each <=~20 words), or rejects on failure.
  // Caller is responsible for procedural fallback.
  async function facts(matchup){
    const sys =
      "You are a veteran NFL broadcast researcher handing the booth their game notes. "
      + "Given the matchup data below, write 7 SHORT broadcast facts — each ≤20 words — that a color analyst "
      + "could drop naturally during the game. Ground EVERY fact ONLY in the players, teams, records, and stats "
      + "in the data. Use specific names, numbers, and situations. NO invented stats, players, or teams. "
      + "Return ONLY a JSON array of strings, no markdown, no code fence. Example: "
      + '["PHI QB last 3 home games: 8 TDs, 0 INTs.", "DAL has won 4 straight against the spread on the road."]';
    const usr = `MATCHUP DATA:\n${typeof matchup==='string'?matchup:JSON.stringify(matchup).slice(0,3000)}\n\nThe 7 facts (JSON array):`;
    const txt = await call(sys, usr, 520);
    const m = txt.match(/\[[\s\S]*\]/);
    if(!m) throw new Error('No JSON array in facts response');
    const arr = JSON.parse(m[0]);
    if(!Array.isArray(arr) || !arr.length) throw new Error('Empty facts array');
    // strip any items that look like hallucinated AI preamble
    return arr.filter(f=>typeof f==='string' && f.length>=10 && f.length<=200
      && !/\b(as an ai|language model|here'?s|facts:|array:|note:)\b/i.test(f));
  }

  return { cfg, setCfg, ready, call, gazette, scenario, quotes, names, provider, on, color, warm, localUrl, localModel, facts, cancel };
})();
if (typeof window!=='undefined') window.AI=AI;   // expose on window so later scripts (storylines.js) can feature-detect it
if (typeof module!=='undefined') module.exports = AI;

// ============================================================
// TTS — spoken play-by-play. ElevenLabs, OpenAI, or Azure AI Speech (your
// own key, stored locally) when set; otherwise the browser's built-in voices
// (free, offline, zero setup). Falls back to the browser on any error/CORS.
// ============================================================
const TTS = (() => {
  'use strict';
  const LS='fps_tts';
  function cfg(){ try{ return JSON.parse(localStorage.getItem(LS))||{}; }catch(e){ return {}; } }
  function setCfg(c){ localStorage.setItem(LS, JSON.stringify(Object.assign(cfg(),c))); }
  // Spoken play-by-play is turned OFF for now while the broadcast pacing/cadence is reworked.
  // Flip DISABLED back to false to bring the voice booth back — all config + UI lives behind this.
  const DISABLED = true;
  function isDisabled(){ return DISABLED; }
  function enabled(){ return !DISABLED && !!cfg().on; }
  function engine(){ const e=cfg().engine||'browser'; return (e==='eleven'||e==='openai'||e==='azure')?e:'browser'; }   // 'browser' | 'eleven' | 'openai' | 'azure'
  // a few well-known FREE ElevenLabs default voices (work on the free tier)
  // ONE booth voice — "The Veteran Play-by-Play": an energetic male sportscaster, clear, fast-paced American accent.
  // Default is a free-tier premade that matches that brief; paste your own ElevenLabs Voice ID in the Newsroom
  // (Voice-Lab DESIGN links carry no voice_id — create the voice first, then copy its ID) to use your exact one.
  const VET_VOICE='pNInz6obpgDQGcFmaJgB';
  const RETIRED_VOICES=new Set(['gU0LNdkMOQCOrPrwtbee','zDBYcuJrpuZ6YQ7AgRUw','JBFqnCBsd6RMkjVDRZzb','onwK4e9ZLuTAKqWW03F9','21m00Tcm4TlvDq8ikWAM','TxGEqnHWrfWFTfGW9XjX','nPczCjzI2devNBz1zQrb']);
  const ELEVEN_VOICES=[{id:VET_VOICE,name:'🎙️ The Veteran Play-by-Play'}];
  const COLOR_VOICES=ELEVEN_VOICES;
  function pbpVoice(){ const v=cfg().elevenVoice; return (v && !RETIRED_VOICES.has(v)) ? v : VET_VOICE; }   // old presets migrate to the veteran; a genuine custom ID is kept
  function colorVoice(){ return pbpVoice(); }            // single-voice booth — the analyst, if on, shares the announcer's voice
  function twoVoice(){ return cfg().twoVoice===true; }   // default OFF: one announcer, the Veteran Play-by-Play
  // ---------- browser Web Speech ----------
  let _voices=[];
  function loadVoices(){ try{ _voices=(window.speechSynthesis&&speechSynthesis.getVoices())||[]; }catch(e){} }
  if(typeof window!=='undefined' && window.speechSynthesis){ loadVoices(); try{ speechSynthesis.onvoiceschanged=loadVoices; }catch(e){} }
  function browserVoice(){ const want=cfg().browserVoice;
    if(want){ const v=_voices.find(v=>v.name===want); if(v) return v; }
    return _voices.find(v=>/Samantha|Daniel|Aaron|Google US English|Microsoft (Guy|Aria|Davis)|Natural/i.test(v.name) && /en/i.test(v.lang))
        || _voices.find(v=>/en[-_]US/i.test(v.lang)) || _voices.find(v=>/^en/i.test(v.lang)) || _voices[0]; }
  function browserSpeak(text, opts){ return new Promise(resolve=>{ try{ if(!window.speechSynthesis){ resolve(); return; } opts=opts||{}; const ex=opts.excite!=null?opts.excite:0.3; speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text); const v=browserVoice(); if(v)u.voice=v; u.rate=(cfg().rate||1.04)+ex*0.20; u.pitch=1+ex*0.28; u.volume=1; u.onend=()=>resolve(); u.onerror=()=>resolve(); speechSynthesis.speak(u); }catch(e){ resolve(); } }); }
  // ---------- ElevenLabs ----------
  let _audio=null, _tok=0;
  function voiceOn(on){ try{ if(typeof window!=='undefined' && window.TTS_onSpeak) window.TTS_onSpeak(!!on); }catch(e){} }   // hook: lets the crowd bed duck under the voice
  function mseOK(){ try{ return typeof MediaSource!=='undefined' && MediaSource.isTypeSupported('audio/mpeg'); }catch(e){ return false; } }
  function liveModel(c,ex){ return c.elevenModel || (ex>=0.85?'eleven_turbo_v2_5':'eleven_flash_v2_5'); }   // flash/turbo STREAM fast; multilingual_v2 was the 4s laggard — dropped from the live call
  function voiceSettings(ex){ return { stability:Math.min(0.50,Math.max(0.20,0.50-ex*0.30)), similarity_boost:0.75, style:Math.min(0.60,0.15+ex*0.45), use_speaker_boost:ex>=0.85 }; }
  function streamURL(voiceId){ return `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4&output_format=mp3_44100_64`; }
  function elevenFetch(text, voiceId, key, ex){ return fetch(streamURL(voiceId),{ method:'POST',
      headers:{'xi-api-key':key,'content-type':'application/json','accept':'audio/mpeg'},
      body: JSON.stringify({ text, model_id: liveModel(cfg(),ex), voice_settings: voiceSettings(ex) }) }); }
  // play a fully-buffered clip (fallback path, and the prefetched color voice)
  function applyRadioFilter(audioEl){ try{ if(cfg().era==='modern') return;   // golden-age 'AM set' sound (radio mode only)
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    const ac=window._cgAudio||(window._cgAudio=new AC()); if(ac.state==='suspended') ac.resume();
    const hp=ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=420;
    const lp=ac.createBiquadFilter(); lp.type='lowpass';  lp.frequency.value=3000;
    const pk=ac.createBiquadFilter(); pk.type='peaking';  pk.frequency.value=1650; pk.Q.value=0.9; pk.gain.value=7;   // the honky midrange of an old speaker
    const g=ac.createGain(); g.gain.value=1.3;
    hp.connect(lp); lp.connect(pk); pk.connect(g); g.connect(ac.destination);   // build the path to the speakers FIRST
    const src=ac.createMediaElementSource(audioEl); src.connect(hp);            // then divert the element into it
  }catch(e){} }
  function playBuffer(buf){ const url=URL.createObjectURL(new Blob([buf],{type:'audio/mpeg'}));
    if(_audio){ try{_audio.pause();}catch(e){} } _audio=new Audio(url); applyRadioFilter(_audio); voiceOn(true); _audio.play().catch(()=>{});
    return new Promise(resolve=>{ _audio.onended=()=>{ voiceOn(false); try{URL.revokeObjectURL(url);}catch(e){} resolve(); }; _audio.onerror=()=>{ voiceOn(false); resolve(); }; }); }
  // STREAM first-chunk playback via MediaSource — first audio ~400ms instead of waiting ~2-4s for the whole file
  function playStream(res, tok){ return new Promise(resolve=>{
    const ms=new MediaSource(), url=URL.createObjectURL(ms);
    if(_audio){ try{_audio.pause();}catch(e){} } const audio=new Audio(); _audio=audio; audio.src=url; applyRadioFilter(audio);
    let sb=null, queue=[], readDone=false, started=false, finished=false;
    const fin=()=>{ if(finished)return; finished=true; voiceOn(false); try{URL.revokeObjectURL(url);}catch(e){} resolve(); };
    audio.onended=fin; audio.onerror=fin;
    const flush=()=>{ if(!sb||sb.updating)return; if(queue.length){ try{ sb.appendBuffer(queue.shift()); }catch(e){} } else if(readDone){ try{ if(ms.readyState==='open') ms.endOfStream(); }catch(e){} } };
    ms.addEventListener('sourceopen',()=>{ try{ sb=ms.addSourceBuffer('audio/mpeg'); }catch(e){ fin(); return; } sb.addEventListener('updateend',flush);
      const reader=res.body.getReader();
      (function read(){ reader.read().then(({done,value})=>{ if(tok!==_tok){ try{reader.cancel();}catch(e){} if(ms.readyState==='open'){try{ms.endOfStream();}catch(e){}} fin(); return; }
        if(done){ readDone=true; flush(); return; }
        queue.push(value); flush();
        if(!started){ started=true; voiceOn(true); audio.play().catch(()=>{}); }
        read();
      }).catch(()=>{ readDone=true; flush(); }); })();
    });
  }); }
  async function elevenSpeak(text, opts){ opts=opts||{}; const c=cfg(), key=c.elevenKey, voiceId=opts.voice||c.elevenVoice||ELEVEN_VOICES[0].id;
    const ex=opts.excite!=null?opts.excite:0.3;
    if(!key){ return browserSpeak(text); }   // no key → free browser voice
    const tok=++_tok;
    try{
      const res=await elevenFetch(text, voiceId, key, ex);
      if(!res.ok){ let t=''; try{t=await res.text();}catch(e){} throw new Error('ElevenLabs '+res.status+' '+t.slice(0,120)); }
      if(tok!==_tok){ try{ res.body&&res.body.cancel&&res.body.cancel(); }catch(e){} return; }
      if(mseOK() && res.body && res.body.getReader){ await playStream(res, tok); }   // instant first-chunk
      else { const buf=await res.arrayBuffer(); if(tok!==_tok) return; await playBuffer(buf); }   // fallback: still the fast /stream endpoint
    }catch(e){ if(window&&window.G) window.G._ttsErr=String(e.message||e); return browserSpeak(text, opts); }
  }
  // ---------- OpenAI Speech (your key) ----------
  // Male, sportscaster-friendly voices first. onyx (deep male) IS the Veteran Play-by-Play.
  const OPENAI_VOICES=['onyx','ash','echo','alloy','ballad','coral','fable','nova','sage','shimmer','verse'];
  const OPENAI_MODELS=['gpt-4o-mini-tts','tts-1'];
  function openaiVoice(){ const v=cfg().openaiVoice; return (v && OPENAI_VOICES.indexOf(v)>=0) ? v : 'onyx'; }
  function openaiModel(){ const m=cfg().openaiModel; return (m && OPENAI_MODELS.indexOf(m)>=0) ? m : 'gpt-4o-mini-tts'; }
  function openaiFetch(text, voice, model, key){ return fetch('https://api.openai.com/v1/audio/speech',{ method:'POST',
      headers:{'Authorization':'Bearer '+key,'content-type':'application/json'},
      body: JSON.stringify({ model, voice, input:text, response_format:'mp3', speed:1.0 }) }); }
  async function openaiSpeak(text, opts){ opts=opts||{}; const c=cfg(), key=c.openaiKey;
    if(!key){ return browserSpeak(text, opts); }   // no key → free browser voice
    const voice=opts.voice||openaiVoice(), model=opts.model||openaiModel();
    const tok=++_tok;
    try{
      const res=await openaiFetch(text, voice, model, key);
      if(!res.ok){ let t=''; try{t=await res.text();}catch(e){} throw new Error('OpenAI '+res.status+' '+t.slice(0,120)); }
      if(tok!==_tok){ try{ res.body&&res.body.cancel&&res.body.cancel(); }catch(e){} return; }
      const buf=await res.arrayBuffer(); if(tok!==_tok) return;
      await playBuffer(buf);   // SAME WebAudio path as ElevenLabs → applyRadioFilter still applies when era!=='modern'
    }catch(e){ if(window&&window.G) window.G._ttsErr=String(e.message||e); return browserSpeak(text, opts); }
  }
  // ---------- Azure AI Speech (Cognitive Services TTS — your key) ----------
  // Enterprise neural voices with SSML pacing/pauses. Male sportscaster-friendly first; Andrew Multilingual IS the Veteran Play-by-Play.
  const AZURE_VOICES=['en-US-AndrewMultilingualNeural','en-US-BrianMultilingualNeural','en-US-AndrewNeural','en-US-BrianNeural','en-US-GuyNeural','en-US-DavisNeural','en-US-JasonNeural','en-US-TonyNeural','en-US-SteffanNeural','en-US-RogerNeural','en-US-AvaMultilingualNeural','en-US-JennyNeural'];
  function azureVoice(){ const v=cfg().azureVoice; return (v && AZURE_VOICES.indexOf(v)>=0) ? v : 'en-US-AndrewMultilingualNeural'; }
  function azureRegion(){ const r=cfg().azureRegion; return (r && String(r).trim()) ? String(r).trim() : 'eastus'; }
  function xmlEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
  // SSML prosody rate from excite: calm → 0%, energetic → +12% for live PBP pacing
  function azureRate(ex){ if(ex==null) ex=0.3; if(ex>=0.85) return '+12%'; if(ex>=0.55) return '+6%'; if(ex<=0.15) return '0%'; return '+3%'; }
  function azureSSML(text, voice, ex){ return `<speak version='1.0' xml:lang='en-US'><voice name='${xmlEsc(voice)}'><prosody rate='${azureRate(ex)}'>${xmlEsc(text)}</prosody></voice></speak>`; }
  function azureFetch(text, voice, region, key, ex){ return fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,{ method:'POST',
      headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3','User-Agent':'fps2026'},
      body: azureSSML(text, voice, ex) }); }
  async function azureSpeak(text, opts){ opts=opts||{}; const c=cfg(), key=c.azureKey, region=opts.region||azureRegion();
    if(!key || !region){ return browserSpeak(text, opts); }   // no key/region → free browser voice
    const voice=opts.voice||azureVoice(), ex=opts.excite!=null?opts.excite:0.3;
    const tok=++_tok;
    try{
      const res=await azureFetch(text, voice, region, key, ex);
      if(!res.ok){ let t=''; try{t=await res.text();}catch(e){} throw new Error('Azure '+res.status+' '+t.slice(0,120)); }
      if(tok!==_tok){ try{ res.body&&res.body.cancel&&res.body.cancel(); }catch(e){} return; }
      const buf=await res.arrayBuffer(); if(tok!==_tok) return;
      await playBuffer(buf);   // SAME WebAudio path as ElevenLabs/OpenAI → applyRadioFilter still applies when era!=='modern'
    }catch(e){ if(window&&window.G) window.G._ttsErr=String(e.message||e); return browserSpeak(text, opts); }
  }
  // PREFETCH a clip (the color analyst) WHILE the play-by-play is still talking → no dead gap before voice 2
  async function prefetch(text, opts){ opts=opts||{}; if(!enabled()) return null;
    text=normalizeForTTS(String(text||'').replace(/<[^>]+>/g,'').replace(/[#*_`]/g,'').trim()); if(!text) return null; if(text.length>320) text=text.slice(0,320);
    const ex=opts.excite!=null?opts.excite:0.3; const c=cfg(), eng=engine();
    if(eng==='openai' && c.openaiKey){   // OpenAI: fully-buffered fetch, ready to fire when PBP ends
      try{ const res=await openaiFetch(text, opts.voice||openaiVoice(), opts.model||openaiModel(), c.openaiKey); if(!res.ok) return { play:()=>browserSpeak(text, opts) };
        const buf=await res.arrayBuffer();
        return { play:()=>{ _tok++; return playBuffer(buf); } };
      }catch(e){ return { play:()=>browserSpeak(text, opts) }; }
    }
    if(eng==='azure' && c.azureKey && azureRegion()){   // Azure: fully-buffered fetch, ready to fire when PBP ends
      try{ const res=await azureFetch(text, opts.voice||azureVoice(), azureRegion(), c.azureKey, ex); if(!res.ok) return { play:()=>browserSpeak(text, opts) };
        const buf=await res.arrayBuffer();
        return { play:()=>{ _tok++; return playBuffer(buf); } };
      }catch(e){ return { play:()=>browserSpeak(text, opts) }; }
    }
    const key=c.elevenKey;
    if(eng!=='eleven' || !key){ return { play:()=>browserSpeak(text, opts) }; }   // browser voice can't prefetch — just speak on cue
    const voiceId=opts.voice||colorVoice();
    try{ const res=await elevenFetch(text, voiceId, key, ex); if(!res.ok) return { play:()=>browserSpeak(text, opts) };
      const buf=await res.arrayBuffer();   // fully buffered now, ready to fire the instant PBP ends
      return { play:()=>{ _tok++; return playBuffer(buf); } };
    }catch(e){ return { play:()=>browserSpeak(text, opts) }; }
  }
  let _teamMap={};
  function setTeams(arr){ _teamMap={}; try{ (arr||[]).forEach(t=>{ if(t&&t.abbr&&t.city) _teamMap[t.abbr]=t.city; }); }catch(e){} }
  function normalizeForTTS(t){ if(!t) return t; t=String(t)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u2B50\u2728\uFE0F]/gu,'')
      .replace(/\b1st\b/g,'first').replace(/\b2nd\b/g,'second').replace(/\b3rd\b/g,'third').replace(/\b4th\b/g,'fourth')
      .replace(/&\s*goal/gi,'and goal').replace(/\s&\s/g,' and ')
      .replace(/\b(\d+)\s*[-\u2013]?\s*yd\b/gi,'$1 yard').replace(/-yard/gi,' yard').replace(/\byds\b/gi,'yards').replace(/\byd\b/gi,'yard')
      .replace(/\bTD\b/g,'touchdown').replace(/\bINT\b/g,'interception').replace(/\bFG\b/g,'field goal').replace(/\bPAT\b/g,'extra point').replace(/\bTFL\b/g,'tackle for loss').replace(/\bOVR\b/g,'').replace(/\bvs\.?\b/gi,'versus')
      .replace(/\b(\d{1,2}):(\d{2})\b/g,'$1 $2');
    t=t.replace(/\b(NO )?GOOD\b/g,m=>m.toLowerCase());
    try{ Object.keys(_teamMap).forEach(ab=>{ t=t.replace(new RegExp('\\b'+ab.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g'), _teamMap[ab]); }); }catch(e){}
    return t.replace(/\s{2,}/g,' ').trim(); }
  function speak(text, opts){ if(!enabled()) return Promise.resolve(); text=normalizeForTTS(String(text||'').replace(/<[^>]+>/g,'').replace(/[#*_`]/g,'').trim()); if(!text) return Promise.resolve();
    if(text.length>320) text=text.slice(0,320);
    const eng=engine();
    if(eng==='openai') return cfg().openaiKey ? openaiSpeak(text, opts) : browserSpeak(text, opts);
    if(eng==='azure') return (cfg().azureKey && azureRegion()) ? azureSpeak(text, opts) : browserSpeak(text, opts);
    if(eng==='eleven') return elevenSpeak(text, opts);
    return browserSpeak(text, opts); }
  function stop(){ try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){} _tok++; if(_audio){ try{_audio.pause();}catch(e){} } }
  async function test(){ const sample='Third and four. He fires over the middle — caught at the thirty, and that is a Buffalo first down!';
    return new Promise(res=>{ const c=cfg(), eng=engine();
      if(eng==='eleven' && c.elevenKey){ elevenSpeak(sample,{excite:0.9}).then(()=>res({ok:true,engine:'eleven'})).catch(e=>res({ok:false,err:String(e)})); }
      else if(eng==='openai' && c.openaiKey){ openaiSpeak(sample,{excite:0.9}).then(()=>res({ok:true,engine:'openai'})).catch(e=>res({ok:false,err:String(e)})); }
      else if(eng==='azure' && c.azureKey && azureRegion()){ azureSpeak(sample,{excite:0.9}).then(()=>res({ok:true,engine:'azure'})).catch(e=>res({ok:false,err:String(e)})); }
      else { browserSpeak(sample,{excite:0.9}); res({ok:!!(_voices.length),engine:'browser',voices:_voices.length}); } }); }
  return { cfg, setCfg, enabled, isDisabled, engine, speak, stop, test, voices:()=>_voices, ELEVEN_VOICES, COLOR_VOICES, colorVoice, pbpVoice, twoVoice, setTeams, prefetch, OPENAI_VOICES, OPENAI_MODELS, openaiVoice, openaiModel, AZURE_VOICES, azureVoice, azureRegion };
})();
if (typeof window!=='undefined') window.TTS=TTS;

