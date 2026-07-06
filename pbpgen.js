/* pbpgen.js — large, varied, voiced commentary + gazette pools.
   Templates use ${qb} ${rb} ${tgt} ${lb} ${db} ${edge} ${yards} ${off} ${def} ${wx} tokens,
   substituted at runtime by fillTpl(). Strings use double-quotes so ${...} stays literal. */
(function(){
  function fillTpl(t, v){ return String(t).replace(/\$\{(\w+)\}/g, function(m,k){ return (v && v[k]!=null) ? v[k] : ''; }).replace(/\s{2,}/g,' ').replace(/\s+([.,!?;])/g,'$1').trim(); }
  // deterministic pick (week-stable gazette); pass a numeric seed
  function gpick(arr, seed){ if(!arr||!arr.length) return ''; var i=Math.abs(Math.floor(seed))%arr.length; return arr[i]; }
  // weighted-random pick (live PBP — fresh each snap)
  var _recent=[];
  function rpick(arr){ if(!arr||!arr.length) return ''; if(arr.length===1) return arr[0];
    var v; for(var t=0;t<10;t++){ v=arr[Math.floor(Math.random()*arr.length)]; if(_recent.indexOf(v)<0) break; }
    _recent.push(v); if(_recent.length>14) _recent.shift(); return v; }
  window.fillTpl=fillTpl; window.gpick=gpick; window.rpick=rpick;

  window.PBPGEN={
  // ============ PLAY-BY-PLAY (radio calls) ============
  run:{
    big:[
      "${rb} finds the crease, through the second level — there's no one home! ${yards} to the house${wx}!",
      "handoff ${rb} — cuts it back, breaks ${lb}'s angle, and he is GONE down the sideline${wx}! ${yards}!",
      "${rb} hits it downhill, shrugs off the first man — second level, third level — nobody catching him! ${yards}!",
      "give to ${rb} — one cut, full speed, ${db} takes a bad angle and pays for it! ${yards}-yard burst${wx}!",
      "${rb} bounces it outside, gets the edge — track meet now — and he's got an escort to the end zone! ${yards}!",
      "off the read, ${qb} keeps — NO, hands it late to ${rb} who splits the safeties! ${yards} and the crowd is on its feet!",
      "${rb} presses the hole, jump-cuts ${lb} out of his shoes, and it's a footrace he wins! ${yards}!",
      "the dam breaks — ${rb} through a gaping lane, stiff-arms ${db} to the turf, ${yards} and counting${wx}!",
      "${rb} patient, patient — BANG, hits it, and the angle's gone for the defense! ${yards} the other way!",
      "screen sets up perfect, ${rb} catches and follows the wall — ${yards}, untouched, are you kidding me?!"
    ],
    chunk:[
      "${rb} on the stretch, plants and gets vertical — ${yards} before ${db} drags him down.",
      "${qb} hands to ${rb} — through the arms of ${lb}, churns for ${yards}${wx}.",
      "${rb} bounces it, finds the alley — ${yards} and a fresh set knocking.",
      "good blocking up front, ${rb} downhill for ${yards} before the safety arrives.",
      "${rb} cuts back against the grain — ${lb} grabs air — ${yards} on the carry.",
      "counter to ${rb}, pulling guard leads, and he rumbles ${yards}${wx}.",
      "${rb} presses, bounces, breaks ${db}'s tackle and falls forward for ${yards}.",
      "draw play, ${rb} slips through the rush lanes for a tidy ${yards}.",
      "${rb} reads it well, one cut and go — ${yards} into the secondary.",
      "outside zone, ${rb} rides it to the numbers and turns up for ${yards}."
    ],
    solid:[
      "${rb} off tackle, lowers the pad level for ${yards}${wx}.",
      "${qb} gives to ${rb} up the gut — ${yards}, a good honest gain.",
      "${rb} follows the pulling guard, ${yards} and falling forward.",
      "inside zone, ${rb} squeezes through for ${yards} before ${lb} fits it up.",
      "${rb} behind his blocks, churns the legs for ${yards}.",
      "${rb} takes the dive, ${yards} and it's a manageable down.",
      "hard run by ${rb} — ${lb} meets him but not before ${yards}.",
      "${rb} on the zone read, keeps it tight for ${yards}${wx}.",
      "${rb} grinds out ${yards}, the kind of carry that keeps drives alive.",
      "${qb} hands it, ${rb} slashes for ${yards} between the tackles."
    ],
    short:[
      "${rb} pushes the pile for ${yards}.",
      "${rb} dives behind center — ${yards}, just enough to think about.",
      "${rb} churns ahead, ${lb} there to meet him after ${yards}.",
      "${rb} grinds it to ${yards}, nothing fancy.",
      "give to ${rb}, ${yards} and the chains barely move.",
      "${rb} follows his guard for a gritty ${yards}${wx}.",
      "${rb} lowers the shoulder into ${lb}, ${yards}.",
      "stuffed lane, ${rb} bounces it for ${yards} before he's wrapped.",
      "${rb} takes what's there — ${yards} and back to the huddle.",
      "quick hitter to ${rb}, ${yards} on the ground."
    ],
    stuff:[
      "${edge} and ${lb} knife in — ${rb} is dropped for a loss of ${yards}!",
      "blown up at the snap! ${lb} fills the hole and stones ${rb} — no gain.",
      "${edge} sheds his block, meets ${rb} in the backfield — loss of ${yards}!",
      "nowhere to go — ${rb} swallowed up at the line, ${yards}.",
      "${lb} reads it the whole way, fits it clean, ${rb} stopped cold for ${yards}.",
      "the front wins this rep — ${rb} hit immediately, ${yards}.",
      "penetration! ${edge} in the backfield, ${rb} can't even get started — ${yards}.",
      "${lb} shoots the gap and buries it — ${rb} dropped for ${yards}${wx}.",
      "stacked up — ${rb} has no crease, gang-tackled for ${yards}.",
      "${edge} blows up the pull and ${rb} pays — ${yards} on the play."
    ]
  },
  pass:{
    bomb:[
      "${qb} takes the deep drop — UNCORKS it for ${tgt}, behind everybody — CAUGHT! He walks in! ${yards}, what a strike${wx}!",
      "play-action, ${qb} pumps — lets it fly deep — ${tgt} tracks it over his shoulder — TOUCHDOWN feel, ${yards}!",
      "${qb} steps up, launches it — ${tgt} a step on ${db} — and it drops in the bucket! ${yards}, the dagger!",
      "max protect, ${qb} surveys — DEEP shot to ${tgt} — got behind the safety — ${yards} and the house is rocking!",
      "${qb} buys time, throws on the run — ${tgt} streaking — laid in perfectly! ${yards}, that's a special throw!",
      "shot play dialed up — ${qb} to ${tgt} down the seam — splits the safeties — ${yards}${wx}!",
      "${qb} airs it out — ${tgt} and ${db} stride for stride — and ${tgt} goes up and GETS IT! ${yards}!",
      "they take the top off — ${qb} hits ${tgt} in full flight — ${yards} and nobody laid a finger on him!"
    ],
    deep:[
      "${qb} downtown to ${tgt}, a step on ${db} — GOT HIM for ${yards}!",
      "${qb} drops, fires the comeback to ${tgt} — ${yards} and a big chunk${wx}.",
      "${tgt} on the dig, ${qb} threads it through traffic — ${yards}.",
      "${qb} to ${tgt} on the post — ${db} a half-step late — ${yards}!",
      "back-shoulder dime, ${qb} to ${tgt} over ${db} for ${yards}.",
      "${qb} stands tall, delivers to ${tgt} down the sideline — ${yards} before he's pushed out.",
      "${tgt} works the corner route, ${qb} drops it in — ${yards}${wx}.",
      "${qb} lets it go to ${tgt} on the deep cross — ${yards} and rolling."
    ],
    mid:[
      "${qb} rifles it to ${tgt} over the middle — ${yards} and he turns it up.",
      "${qb} threads the needle to ${tgt} — ${yards}, runs through ${db}'s tackle.",
      "${tgt} sits in the soft spot, ${qb} hits him for ${yards}.",
      "${qb} on the move, finds ${tgt} on the crosser — ${yards}${wx}.",
      "play-action, ${qb} to ${tgt} on the dig — ${yards} into the secondary.",
      "${qb} lays it in stride to ${tgt} — ${yards} and a first down look.",
      "${tgt} on the out, ${qb} on time and on the money — ${yards}.",
      "${qb} steps into it, ${tgt} on the slant — ${yards} after the catch.",
      "${qb} works the intermediate to ${tgt} — ${yards}, moving the offense.",
      "${qb} buys a beat, hits ${tgt} over the ball — ${yards}."
    ],
    short:[
      "${qb} quick to ${tgt} on the hitch — ${yards}.",
      "checkdown to ${tgt}, ${yards} and a safe completion.",
      "${qb} flips it to ${tgt} in the flat — ${yards}${wx}.",
      "${tgt} on the slant, ${qb} on rhythm — ${yards}.",
      "${qb} works the underneath to ${tgt} for ${yards}.",
      "screen to ${tgt}, blockers out front — ${yards}.",
      "${qb} dumps it to ${tgt}, ${yards} and he's wrapped.",
      "quick game, ${qb} to ${tgt} for ${yards}.",
      "${qb} finds ${tgt} on the curl — ${yards} and a manageable down.",
      "swing pass to ${tgt}, ${yards} on the catch-and-turn."
    ],
    incomplete:[
      "${qb} looks for ${tgt} — broken up by ${db}! Great coverage.",
      "${qb} airs it for ${tgt} — overthrown, sails out of bounds.",
      "${qb} to ${tgt} — DROPPED! Right in the hands and it's on the turf.",
      "pressure in his face, ${qb} throws it away — nobody home.",
      "${qb} forces it to ${tgt} — ${db} blankets him, incomplete.",
      "${qb} off his back foot — well off the mark${wx}.",
      "${tgt} and ${db} get tangled — the flag stays down — incomplete.",
      "${qb} fires low to ${tgt} — in the dirt, second down.",
      "${qb} double-clutches, then throws it away — the rush got home.",
      "${qb} to ${tgt} on the fade — just a hair too far, off the fingertips."
    ],
    sack:[
      "pressure! ${edge} comes free — ${qb} is SACKED for ${yards}! Nowhere to go.",
      "coverage holds, and ${edge} finally gets there — ${qb} down for ${yards}.",
      "${lb} on the blitz, untouched — buries ${qb} for ${yards}!",
      "the pocket collapses — ${qb} swallowed up by ${edge}, ${yards}.",
      "${qb} climbs the pocket into trouble — ${edge} drags him down, ${yards}.",
      "stunt works to perfection — ${edge} clean, ${qb} sacked for ${yards}!",
      "${qb} holds it too long — ${edge} strip-rushes, ${qb} down for ${yards}${wx}.",
      "they bring the house — ${qb} has no chance, ${lb} gets the sack, ${yards}.",
      "${edge} beats the tackle around the edge — MONSTER hit, ${qb} for ${yards}!",
      "nothing open, ${qb} tries to escape — ${edge} runs him down for ${yards}."
    ],
    int:[
      "${qb} fires over the middle — PICKED OFF! ${db} read his eyes the whole way!",
      "${qb} for ${tgt} — but ${db} jumped the route! Intercepted!",
      "tipped at the line — wobbles up for grabs — ${db} hauls it in! Turnover!",
      "${qb} under pressure throws into coverage — ${db} steps in front! Picked!",
      "${qb} underthrows it — ${db} camps under it for the interception!",
      "miscommunication! ${tgt} breaks off, ${qb} doesn't — and ${db} cashes in!",
      "${qb} stares him down — ${db} breaks on it and takes it away${wx}!",
      "the safety robs it! ${db} undercuts ${tgt} — INTERCEPTION!",
      "${qb} forces it into a window that wasn't there — ${db} with the pick!",
      "floated it — ${db} reads it like a quarterback and steps in! Takeaway!"
    ]
  },
  // ============ situational LEAD-INS (prefix; end with space; include empties) ============
  lead:{
    fourth:[ "Everything riding on this snap. ", "They leave the offense out there on 4th down — gutsy. ", "4th down, they're going for it. ", "Decision made — they keep the offense on the field. ", "Roll the dice on 4th. ", "No flinch — they go for it. ", "Season-on-the-line stuff right here. ", "Boldest call of the day. " ],
    thirdLong:[ "3rd and long, they need a chunk. ", "Money down, they're behind the sticks. ", "Long way to go on 3rd. ", "Obvious passing down. ", "They've got to find the marker here. ", "3rd and a mile. ", "Defense pinning its ears back. ", "Need it all on this one. " ],
    thirdShort:[ "3rd and short, move the sticks. ", "Short yardage, gotta have it. ", "3rd and manageable. ", "Inches to go, line up and get it. ", "One yard for a fresh set. ", "Power situation here. ", "Just need a push. ", "Convert and the drive lives. " ],
    redzone:[ "Goal to go. ", "Knocking on the door. ", "Red zone, points on the line. ", "Smell of the end zone. ", "Tight quarters down here. ", "Field shrinks in close. ", "Six is right there. ", "Money time, inside the ten. " ],
    twoMinute:[ "Clock bleeding under two. ", "Two-minute drill on. ", "Crunch time, clock's the enemy. ", "Every second matters now. ", "Hurry-up offense humming. ", "Clock and the defense both to beat. ", "Late and tight. ", "This is when legends are made. " ],
    neutral:[ "", "", "", "", "Early down. ", "", "They line it up. ", "", "Off the snap. ", "" ]
  },
  // ============ result SUFFIXES (appended after the body) ============
  suffix:{
    firstDown:[ " — and that'll move the chains!", " First down!", " — moves the sticks!", " — and they've got the marker!", " Right at the line to gain — first down!", " — drive stays alive!", " Chains move.", " — and that's a fresh set!" ],
    shortOf:[ " — but they come up short!", " — a yard shy, and that'll bring on the decision.", " — stopped before the marker!", " — not enough, turnover on downs looming.", " — and the defense holds!", " — just short of the sticks!" ],
    bigMomentum:[ " The sideline is ELECTRIC.", " You can feel the stadium shift.", " Momentum just changed hands.", " That's a back-breaker.", " Statement play.", " The bench is going crazy." ]
  },
  // ============ COLOR analyst one-liners (second voice, a beat later) ============
  color:{
    runBig:[ "That's blockin' — hat on a hat, and the back did the rest.", "Vision and patience. He let it develop and then hit it.", "Backbreaker. The whole defense is gassed now.", "He made the safety look silly on that cutback.", "That's what downhill running looks like. Get out the way.", "One missed tackle and it's six. They'll be sick watching that.", "Offensive line just imposed their will." ],
    passBig:[ "Perfect ball. Dropped it in a bucket where only his guy gets it.", "That's trust — threw him open before he was open.", "Coverage was fine. That's just a better throw.", "He climbed the pocket like a vet and let it eat.", "Safety bit on the play-fake and it was over.", "That's a dime. Put it on a tee.", "You can't defend a throw like that. Tip your cap." ],
    sack:[ "He held it a half-second too long and they made him pay.", "That's a coverage sack — nobody open, nowhere to go.", "The edge just flat won that rep. Dominant.", "Protection broke down up the middle. Can't have it.", "He's gotta feel that and get it out. Live for the next one.", "Strip-sack territory — that's how you flip a game." ],
    int:[ "He stared it down the whole way. Quarterback 101 — move the safety.", "That's a gift. Defense didn't earn it, the throw gave it to 'em.", "Receiver and quarterback weren't on the same page. Killer.", "Greedy throw. Take the checkdown there, live to fight.", "Veteran read by the DB. He was sitting on that all game.", "That changes everything. Momentum, field position, all of it." ],
    stuff:[ "Front seven won before he even turned around.", "They knew it was coming and still stuffed it. That's a tell.", "No movement up front. Gotta get a hat on the linebacker.", "That's a wasted down. Now they're behind the sticks.", "Defense is dictating now. Offense is reacting.", "Penetration kills a run game every time." ],
    convert:[ "Drives are about staying on schedule, and that's exactly it.", "Money down, money play. That's a grown-man conversion.", "That's the difference between good and great — finishing the down.", "Keeps the chains moving and the defense on its heels.", "Big-time players make plays in big-time moments." ],
    generic:[ "Methodical. They're just taking what the defense gives.", "Field position football. It adds up.", "Nothing flashy, but it's winning football.", "That's a chess match out there and they're thinking two moves ahead.", "Complementary football — that's how you win in January.", "Little plays set up the big ones. Watch.", "They're establishing a rhythm now.", "That's situational awareness right there." ]
  },
  // ============ GAZETTE — player quotes by persona ============
  quotes:{
    captain:{
      loss:[ "That one's on me. I'll watch the tape, own my mistakes, and we'll be better Sunday.", "We don't point fingers in this room. We point thumbs. Starts with me.", "Tough loss, but I've been in this league long enough to know it's a long season.", "We let one slip. Leaders own it — and I will.", "Credit to them. We've got to be cleaner, and I'll make sure we are.", "Nobody's jumping ship. We regroup, we work, we go win the next one." ],
      frustrated:[ "I'm not worried about my numbers. I'm worried about wins, and we'll find them.", "I'll do whatever this team needs — block, decoy, whatever. That's the job.", "If my role changes, fine. The standard doesn't.", "I trust the staff. My job is to be ready when my number's called.", "I've never been about touches. I've been about trophies.", "Whatever gets us a W. I'll carry water if that's what it takes." ],
      contract:[ "I love it here. We'll let the business handle itself — my focus is the room.", "I want to retire in this jersey. The rest is for the agents.", "Money's never driven me. Winning has. That hasn't changed.", "We'll get something done. I'm not going anywhere I don't want to be.", "I've earned the right to be patient. So I'll be patient." ],
      win:[ "Team win. That's all that matters. On to the next.", "Proud of this group. We do it together or not at all.", "We did our jobs. Nothing to celebrate yet — we're not done.", "That's the standard. Now go do it again." ]
    },
    gamer:{
      loss:[ "Back to the lab. We find the leak and we fix it. Simple.", "I hate losing more than I like winning. This one'll fuel me.", "No moral victories. We were close. Close loses.", "I'll be first in the building tomorrow. That's the only answer.", "We'll correct it. I don't do excuses, I do reps.", "Lost the rep, lost the game. On to the work." ],
      frustrated:[ "Usage isn't my call. Effort is. I'll keep grinding.", "I control the controllables. The rest is noise.", "I just want to be on the field. Where, how — don't care.", "I'll earn more by doing more with what I get. That's the deal.", "Frustrated? Sure. But frustration without work is just complaining.", "Put me anywhere. I'll make it count." ],
      contract:[ "I'll let my play do the talking at the table.", "Pay comes from production. I'll keep producing.", "Not thinking about it. Thinking about Sunday.", "The tape is my agent.", "Handle the business off the clock. On the clock I'm all ball." ],
      win:[ "Good. Now what's next.", "We executed. That's the bar, not the ceiling.", "One down. Long way to go.", "Did my job. Sleep, then back to work." ]
    },
    trash_talker:{
      loss:[ "We beat ourselves. Nobody on that field is better than us, period.", "Mark it — they got us once. It won't happen twice.", "They can celebrate. We'll remember. See you in the rematch.", "One game. Don't write the obituary. We're coming.", "They got lucky and they know it. Run it back, I dare 'em.", "Save the clips. I'll see all of 'em again real soon." ],
      frustrated:[ "Get me the ball and watch what happens. That's not a request.", "I'm the best matchup on the field every snap. Use me like it.", "You've got a Ferrari in the garage and you're driving the minivan.", "Other teams game-plan for me. Wish mine did.", "Feed me or don't — but don't be shocked when I go off elsewhere.", "I'm not loud for no reason. I back it up. Give me the chance." ],
      contract:[ "Pay me what I'm worth or somebody else will. Easy.", "I bet on me every time. The market will too.", "They know what I am. Time to act like it.", "I'll be the highest-paid at my spot. Screenshot it.", "Loyalty's a two-way street, and I'm watching the traffic." ],
      win:[ "Was there ever a doubt? Easy work.", "They talked all week. Scoreboard did the talking back. 😤", "Told y'all. Now run it back if you're brave.", "Put 'em on a poster. Next." ]
    },
    showman:{
      loss:[ "We'll bounce back and we'll do it with style. Stay tuned.", "Even the best show has a rough act. Sequel's better, trust me.", "Tough night, but the people still got their money's worth.", "I'll take the L tonight and put on a clinic next week.", "Down but never out. Drama's good for ratings anyway.", "We'll be back, and we'll be must-see TV." ],
      frustrated:[ "Give the fans what they came for — put the playmakers in space.", "I'm an entertainer. Hard to entertain on the bench.", "The highlight reel writes itself if you let me cook.", "People buy tickets to see plays. I make plays. Math.", "Let me be me. The building gets loud when I touch it.", "I'm not asking for the spotlight. I AM the spotlight." ],
      contract:[ "I move the needle. The contract should reflect the box office.", "Stars get paid like stars. I'm a star.", "We'll make a deal as flashy as my game.", "I bring eyes, jerseys, and wins. Price that.", "I'll sign — with a smile and a camera rolling." ],
      win:[ "Now THAT'S entertainment. You're welcome.", "Lights, camera, action — and a W.", "Gave the people a show. That's the job.", "Another episode in the books. Smash that like button." ]
    },
    quiet_pro:{
      loss:[ "We didn't do enough. We'll get back to work.", "Credit them. We'll look at the tape and move on.", "Long season. One game. We correct it.", "Not much to say. We were beaten. We'll be better.", "We'll keep our heads down and improve.", "It is what it is. Back to work tomorrow." ],
      frustrated:[ "I just do my job and let the coaches coach.", "Whatever they ask, I'll do. No complaints.", "I'm here to help the team win, however that looks.", "Numbers take care of themselves if you play the right way.", "I don't worry about touches. I worry about assignments.", "I'll keep showing up and doing the work." ],
      contract:[ "I'll let my representation handle that. I'm focused on football.", "Not something I think about during the season.", "We'll figure it out. I like it here.", "That's a business question. Ask my agent.", "I just want to play. The rest sorts itself out." ],
      win:[ "Good team win. On to the next one.", "We did our jobs. That's all.", "Happy to get the W. Back to work.", "Nothing to celebrate. We move on." ]
    },
    diva:{
      loss:[ "Hard to win when the ball doesn't find the right people.", "I did my part. Can't speak for everybody else.", "We lose as a team, but some of us touched the ball twice.", "I'm open every snap. Make of that what you will.", "I'll keep producing. Wish the plan matched the talent.", "Frustrating night. I'll let the tape speak for the open looks." ],
      frustrated:[ "Two targets? Two? I can't win you games from the sideline.", "I'm WR1 on the depth chart and an afterthought in the plan.", "Look at the all-22. I'm open. Every. Single. Week.", "I didn't come here to be a decoy.", "The talent's here. The touches aren't. Do the math.", "I want the ball in big spots. That's not selfish, that's competitive." ],
      contract:[ "I produce when they let me. Pay the producer.", "Top guys get top money. I'm a top guy.", "I'll talk extension when the targets match the title.", "I've outplayed my deal. Everybody sees it.", "Respect at the table or I'll find it elsewhere." ],
      win:[ "We won, and I got mine. That's the formula.", "Feed me and we win. Funny how that works.", "Good win. Imagine if I got TEN looks.", "That's what happens when they use me right." ]
    },
    headcase:{
      loss:[ "Same story — I'm out there making plays and the scheme wastes me.", "When I'm right, we're unstoppable. Tonight nobody let me be right.", "Ask the coaches why we lost. I did my job.", "I'm tired of carrying a plan that doesn't carry me back.", "They'll blame me. They always do. Watch the tape.", "Can't win when half the building is against you." ],
      frustrated:[ "They don't get me the ball and then act surprised. Wild.", "Everybody can see it but the people calling the plays.", "I should be the focal point. Instead I'm an afterthought.", "Maybe I need to be somewhere they actually want to win.", "I put up numbers in a system designed to bury me.", "I'm built different and used like everybody else. Makes no sense." ],
      contract:[ "Pay me or trade me. I'm done being underappreciated.", "I've earned it. They know it. Stop playing games.", "Plenty of teams would build around me. Just saying.", "Respect shows up in the bank account. I'm still waiting.", "I'll bet on myself somewhere that values it." ],
      win:[ "See? Give me chances and THIS happens. Imagine if it was every week.", "I told y'all. When I'm involved, we win.", "Finally got my touches and look at the result.", "Now do that again next week. I'll be waiting." ]
    }
  },
  // ============ GAZETTE — fan reactions (social-media energy) ============
  fans:{
    win:[ "LETS GOOOO 🔥🔥", "told yall. believe.", "best franchise in football idc", "playoffs?? PLAYOFFS.", "ok we might be him", "framing this one", "in the coach we trust", "that's MY team", "feeling dangerous rn", "back to back to back lets ride", "the vibes are immaculate", "we don't rebuild we reload 😤", "screaming in my living room rn", "bandwagon's filling up, get in", "this is the year i can feel it", "scoreboard says we good" ],
    loss:[ "fire everyone", "i cant do this anymore", "same old story man 😤", "we are SO back... to being bad", "every single year bro", "draft a whole new team pls", "i need a hobby that hurts less", "why do i do this to myself", "rebuild. burn it down. start over.", "that's a season-loser right there", "i'm not mad just disappointed (i'm mad)", "trade the whole roster i mean it", "we found a new way to lose. impressive.", "my blood pressure can't take this", "tank for a QB at this point", "lifelong fan, lifelong suffering" ],
    blowoutWin:[ "RUNNING. THEM. OUT. THE. BUILDING. 🔥", "call it early lol", "this is a massacre 😭", "put the starters on a beach chair", "they're not even trying to guard us", "send the JV in", "this is bullying and i'm here for it", "MVP chants already", "scoreboard operator needs a raise", "humbling an entire city rn", "we cooked. closed kitchen.", "mercy rule when" ],
    blowoutLoss:[ "turn it off. just turn it off.", "this is unwatchable", "down by 30 in my own house couch", "everybody's getting fired Monday", "i've seen enough for a lifetime", "this is a bye week for the other team", "embarrassing. franchise-altering embarrassing.", "refund the season tickets", "they quit. just quit.", "lowest of the lows", "i'm a punching bag with a logo", "wake me up in April" ],
    upset:[ "NOBODY BELIEVED US 🐶", "throw the records out baby", "any given sunday is REAL", "shocked the world today", "underdogs no more", "they overlooked us. big mistake.", "biggest win in years no question", "storming the field (mentally)", "david beat goliath and i was THERE", "remember the names", "they'll be talking about this one" ]
  },
  // ============ GAZETTE — talk show "The Two-Minute Drill" beat pools ============
  talk:{
    marvOpen:[ "Welcome back to The Two-Minute Drill. Big week across the league, and a lot to unpack.", "We are LIVE, and there is plenty to argue about today.", "Another wild week in the books — Deion, where do we even start?", "Strap in, folks. The race is tightening and the takes are spicy.", "Good evening. The standings shifted, the storylines deepened, let's get into it.", "Lot of football played, lot of questions answered — and a few new ones.", "Back at the desk, and I'll tell you, this league does not lack for drama.", "Let's set the table: contenders separating, pretenders exposed. Deion?", "Welcome in. If you like chaos, this was your week.", "The temperature is rising and so are the stakes. Here we go.", "Another Sunday, another set of teams who think they've figured it out.", "We've got upsets, we've got drama, we've got a show. Let's roll." ],
    deionOpen:[ "Marv, I've been waiting all week to get on this mic.", "You already know I came loaded today.", "Slow down, slow down — let me set the record straight first.", "I'll say what everybody's thinking and nobody wants to admit.", "Pull up a chair, because some of these teams need a reality check.", "I'm not here to make friends, Marv. I'm here to be right.", "Everybody's overreacting and I'm about to under-react. Watch.", "Football's a simple game and folks keep complicating it.", "I had this one called on Tuesday. Roll the receipts.", "Let me cook, Marv. Just let me cook." ],
    marvBeat:[ "The numbers don't lie — this team is for real.", "But can they keep it up when the schedule stiffens?", "I keep coming back to the trenches. That's where this was won.", "Coaching made the difference today, plain and simple.", "That's a quarterback playing the best ball of his career.", "Health is the silent story — they're getting guys back at the right time.", "I'm not ready to anoint anybody just yet.", "Turnovers told the whole story this week.", "The young guys are growing up fast. That's a scary sign for the rest.", "Special teams flipped a field and flipped a game.", "Don't sleep on the defense — that unit is rounding into form.", "Sometimes the simplest game plan is the best one.", "That locker room believes, and belief travels.", "Discipline. Fewest penalties, cleanest football, and it shows.", "The margin in this league is razor thin and they're on the right side of it.", "Give the staff credit — they had a counter for everything." ],
    deionBeat:[ "Nah, that's a mirage. Ask me again in November.", "Pressure busts pipes, and we ain't hit the pressure yet.", "I've seen this movie. It ends with them home in January.", "That's not a contender, that's a really good front-runner. Difference.", "When it gets hard — and it will — who makes the play? I'm not sure they have him.", "Stats are for losers, Marv. Show me the moment.", "They beat who they were supposed to beat. Pump the brakes.", "I need to see it on the road, in the cold, with the lights on.", "Everybody loves them now. I loved 'em before it was cool.", "One man can't carry a team to a title. They better find a second.", "That defense is living on takeaways. Those dry up.", "Soft schedule, soft conclusions. Wake me up for the real games.", "They've got a culture problem and a win streak is just makeup on it.", "I'm telling you, the cracks are there. You just gotta look.", "Talent wins games. Toughness wins titles. Jury's out on the toughness.", "Call me when they beat somebody with a pulse." ],
    marvClose:[ "We'll leave it there. Down the stretch they come.", "Plenty more to settle. We'll see you next week.", "That's our show. The race is just getting started.", "Buckle up — it only gets better from here.", "We're out of time, but never out of takes. Goodnight.", "The chase is on. Same time next week.", "Lots of football left. We'll be here for all of it.", "That's a wrap from the desk. Keep it locked.", "On to next week, where it all matters a little more.", "We'll let it breathe and revisit. Thanks for watching." ],
    deionClose:[ "Same time, same channel. Stay dangerous.", "Ball don't lie, Marv. Ball don't lie.", "I'll be right back here to say I told you so.", "Print it, frame it, we'll check it next week.", "Y'all heard it here first. As always.", "I'm never wrong, just early. Goodnight.", "Don't @ me. Just watch the games.", "The truth hurts and I'll be back with more of it.", "Book it. Bank it. See you Sunday.", "That's the word. Take it or leave it." ]
  }
  };
  // ============ GOLDEN-AGE RADIO — 1940s/50s broadcast voice (period vocabulary + the dial) ============
  window.PBPGEN.radio={
  // LIVE mid-play beats — short, varied, fired by the field event bus AS the play unfolds (snap→throw→catch→tackle).
  // Kept brief because each flashes for a beat before the next event overwrites it. Tokens: ${qb} ${rb} ${tgt} ${db}.
  live:{
    snapPass:[ "${qb} takes the snap, drops to throw…", "Snap to ${qb} — back he goes…", "${qb} under center, into the pocket…", "Ball's snapped — ${qb} sets up…", "${qb} drops, scanning the field…", "Here's the snap — ${qb} back to pass…" ],
    snapRun:[ "Snap — and it's ${rb}…", "Handed off to ${rb}…", "${qb} turns, gives to ${rb}…", "Ball to ${rb}, off he goes…", "${rb} takes the carry…", "Snap — ${rb} into the teeth of it…" ],
    dropback:[ "${qb} drops, looking for ${tgt}…", "${qb} sets his feet, eyes downfield…", "${qb} in the pocket, hunting ${tgt}…", "${qb} surveys it, climbing the pocket…", "Protection holds — ${qb} scans…", "${qb} pumps once, still looking…" ],
    handoff:[ "Handoff to ${rb} — hits the hole…", "${rb} into the line…", "${rb} follows his blockers…", "${rb} presses the front, looking for a crease…", "${rb} takes it downhill…", "${rb} reads his blocks…" ],
    scramble:[ "${qb} tucks it and runs!", "${qb} escapes the pocket — he's off!", "${qb} bolts — he'll take it himself!", "${qb} steps up and goes!", "Nothing there — ${qb} takes off!" ],
    throwShort:[ "${qb} fires for ${tgt}…", "Quick to ${tgt}…", "${qb} zips it to ${tgt}…", "Out to ${tgt} in a hurry…", "${qb} flips it to ${tgt}…", "On rhythm to ${tgt}…" ],
    throwDeep:[ "${qb} airs it out for ${tgt}…", "He lets it FLY for ${tgt}…", "${qb} heaves it deep…", "Up the field for ${tgt}…", "${qb} launches one downfield…", "Deep ball for ${tgt} — it's up!" ],
    catch:[ "${tgt} hauls it in!", "Caught — ${tgt}!", "${tgt} reels it in!", "Got it — ${tgt}!", "Reception, ${tgt}!", "${tgt} pulls it down!" ],
    incomplete:[ "Incomplete!", "It falls incomplete!", "Knocked away — no good!", "Off the mark!", "${tgt} can't hang on!", "Broken up at the last instant!" ],
    int:[ "INTERCEPTED!", "Picked off by ${db}!", "${db} steps in front — pick!", "${db} takes it away!", "${db} jumped the route — INT!", "Throws it right to ${db}!" ],
    pick6:[ "PICK SIX — ${db}!", "${db} — the other way! Pick six!", "Intercepted — and he's GONE!", "${db} picks it, off to the races!" ],
    breakTackle:[ "${rb} breaks free!", "Spins out of it — still up!", "Shakes the tackle!", "Bounces off — he's loose!", "Won't go down!", "Slips the first man!" ],
    touchdown:[ "TOUCHDOWN!", "He's IN!", "Six points!", "Across the goal — TD!", "He walks it in!", "Got the pylon — touchdown!" ],
    sack:[ "SACKED!", "${qb} goes down!", "Buried in the backfield!", "They get home — ${qb} down!", "No escape — sacked!", "Wrapped up — ${qb} eats it!" ]
  },
  run:{
    big:[
      "Handoff to ${rb} — he slants off tackle, he's into the open field! Look at him go, friends — the 30, the 20, the 10 — they'll NEVER catch him! ${yards} yards${wx}!",
      "${rb} takes the leather, cuts back against the grain — and he is GONE, ladies and gentlemen! All the way! ${yards} yards, and listen to this crowd!",
      "There he goes! ${rb} bursts through the forward wall, stiff-arms the last man — a footrace he wins going away! ${yards}!",
      "${rb} around end — he's got a convoy of blockers — to the 30, the 20 — oh, what a run, friends! ${yards} yards${wx}!",
      "The pitch to ${rb} — he bounces it outside, nothing but green grass ahead — and he's off to the races! ${yards}!",
      "${rb} hits the hole like a thunderbolt — shakes one man, then another — and there's daylight! ${yards}, friends, ${yards}!",
      "Oh my, did you see that cut! ${rb} leaves ${lb} grasping at the breeze and he's loose down the sideline — ${yards}!",
      "${rb} takes the toss, gets the corner — and the only question now is who's got the angle — and NOBODY does! ${yards}${wx}!",
      "Up the gut goes ${rb} — pops clean through the second level — they'll be chasing him a long while! ${yards}!"
    ],
    chunk:[
      "${rb} lugging the leather off-tackle — drives for ${yards} good yards before they bring him down.",
      "Handoff ${rb}, around the end — a fine gain of ${yards}, friends.",
      "${rb} knifes through the line, fights for every inch — ${yards} on the carry${wx}.",
      "${rb} on the draw — slips a tackler — picks up ${yards} into the secondary.",
      "Off-tackle slant for ${rb}, behind good blocking — ${yards} yards.",
      "${rb} presses the line, bounces it out, and rumbles ${yards} before ${db} rides him down.",
      "A good hard run by ${rb} — he carries a tackler the last few steps — ${yards}.",
      "${rb} finds the cutback lane, churns into the open for ${yards}${wx}.",
      "The counter to ${rb}, pulling guard out front — he follows it for a tidy ${yards}.",
      "${rb} slashes between the tackles and breaks an arm-tackle for ${yards}, friends."
    ],
    solid:[
      "${rb} into the line — a tough ${yards} yards${wx}.",
      "Off-tackle for ${rb}, good for ${yards}.",
      "${rb} bulls ahead behind the forward wall — ${yards}.",
      "Handoff ${rb} up the middle — he churns for ${yards}.",
      "${rb} lowers his shoulder, drags 'em an extra step — ${yards}.",
      "${rb} takes the dive, falls forward for ${yards}, friends.",
      "Honest, downhill running by ${rb} — ${yards} and a manageable down ahead.",
      "${rb} follows his fullback into the line — ${yards}, the kind that keeps the chains moving.",
      "Inside zone for ${rb}, he presses and cuts up for ${yards}${wx}.",
      "${rb} grinds it out the hard way — ${yards} between the tackles."
    ],
    short:[
      "${rb} into the middle of the line — a yard, maybe two. ${yards}.",
      "${rb} dives ahead for ${yards}, no more.",
      "${rb} bangs into the line, ${yards} and they pile him up.",
      "Quick handoff ${rb} — ${yards} on the ground.",
      "${rb} pushes the pile a couple of steps — ${yards}, friends.",
      "Give to ${rb} off-tackle — ${lb} there in a hurry, just ${yards}.",
      "${rb} lowers the pads and bulls it for ${yards}.",
      "Nothing fancy — ${rb} takes what's there, ${yards}${wx}."
    ],
    stuff:[
      "The forward wall stands 'em up! ${rb} stopped cold — a loss of ${yards}!",
      "${edge} knifes into the backfield and drops ${rb}! ${yards}.",
      "Nowhere to go for ${rb} — the line swallows him whole, ${yards}.",
      "${lb} reads it all the way and meets ${rb} at the line — ${yards}.",
      "Strung out wide — ${db} forces it back inside and they gang up on ${rb} for ${yards}!",
      "Penetration! ${edge} is in the backfield before ${rb} can blink — a loss of ${yards}, friends!",
      "${lb} shoots the gap and stones ${rb} dead in his tracks — ${yards}.",
      "They blow it up at the snap — ${rb} hit immediately for ${yards}${wx}."
    ]
  },
  pass:{
    bomb:[
      "${qb} fades to throw — he lets fly a long aerial downfield — and ${tgt} has GOT it, behind the secondary! He walks in! ${yards} yards, a beautiful spiral${wx}!",
      "${qb} drops back, looking long — fires the pigskin deep — ${tgt} is THERE! All the way, ladies and gentlemen! ${yards}!",
      "Back goes ${qb} — he heaves it downfield — ${tgt} gathers it in stride, nobody near him! ${yards} yards and the place is bedlam!",
      "${qb} steps up, throws the long one — ${tgt} tracks it over his shoulder — and he's gone! ${yards}, what a connection${wx}!",
      "Oh, he let it FLY — ${qb} to ${tgt} a country mile downfield — and he runs under it! ${yards}, friends, are you watching this!",
      "Play-action, ${qb} pulls it down and HEAVES it — ${tgt} behind ${db} — caught! Nothing but goalposts ahead! ${yards}!"
    ],
    deep:[
      "${qb} back to pass — a long aerial for ${tgt} down the sideline — and he hauls it in! ${yards} big yards!",
      "Beautiful spiral from ${qb} — ${tgt} snares it over his shoulder — ${yards}, friends!",
      "${qb} fades, fires deep for ${tgt} — caught at the stripe! ${yards}${wx}.",
      "${qb} lofts one downfield — ${tgt} goes up and takes it away — ${yards}!",
      "${qb} airs it out for ${tgt} on the post — a step on ${db} — and he reels it in for ${yards}!",
      "Back-shoulder throw, ${qb} to ${tgt} over the top of ${db} — what a dart — ${yards}.",
      "${qb} stands tall and delivers deep to ${tgt} — ${yards} before they shove him out${wx}."
    ],
    mid:[
      "${qb} fades, fires over the middle to ${tgt} — caught, and he turns it up for ${yards}.",
      "${qb} drops, finds ${tgt} on the crossing route — good for ${yards}, friends.",
      "A little aerial from ${qb} to ${tgt} — ${yards} on the play.",
      "${qb} back to throw — over the middle to ${tgt} — ${yards}${wx}.",
      "${qb} threads it to ${tgt} on the dig, in between the defenders — ${yards}.",
      "${qb} on the move, finds ${tgt} on the crosser — he runs through ${db}'s tackle for ${yards}!",
      "Play-action holds 'em — ${qb} hits ${tgt} over the ball for ${yards}.",
      "${qb} steps up and zips it to ${tgt} on the comeback — ${yards}, friends.",
      "${tgt} works open on the out route, ${qb} on the money — ${yards}.",
      "${qb} buys a beat, finds ${tgt} sitting in the soft spot — ${yards}${wx}."
    ],
    short:[
      "${qb} flips a little toss to ${tgt} — ${yards} on the catch.",
      "Short aerial to ${tgt} in the flat — ${yards}.",
      "${qb} dumps it off to ${tgt} — ${yards}, friends.",
      "Quick toss ${tgt} on the hitch — ${yards}.",
      "${qb} checks it down to ${tgt} — ${yards} and he steps out.",
      "Swing pass to ${tgt} out of the backfield — ${yards}${wx}.",
      "${qb} on rhythm, the quick slant to ${tgt} — ${yards} after the catch.",
      "Little shovel to ${tgt} underneath — ${yards}, friends."
    ],
    incomplete:[
      "${qb} back to throw — fires for ${tgt} — and it's batted away by ${db}! Incomplete.",
      "${qb} lets fly for ${tgt} — but the aerial sails high and wide. No good.",
      "${qb} looks long for ${tgt} — overthrown! The ball falls harmless to the turf.",
      "${qb} fires — and ${tgt} can't hang on! Dropped, ladies and gentlemen.",
      "${qb} throws for ${tgt} — and ${db} is all over him! Knocked away, incomplete.",
      "${qb} airs it out — but nobody's home. The pigskin sails out of bounds.",
      "${qb} forces it to ${tgt} — and ${db} breaks it up at the last instant! No good.",
      "${qb} throws it at ${tgt}'s shoetops — incomplete, friends, the chains don't move.",
      "${qb} rushed by the rush — flings it away to nobody. Incomplete.",
      "A little flutter on that one from ${qb} — ${tgt} reaches, can't corral it. Dropped.",
      "${qb} and ${tgt} weren't on the same page — the throw skips in front. No good.",
      "Up for ${tgt} — and ${db} times it perfect, knocks it loose! Incomplete.",
      "${qb} looks, looks, lets it go late — and it's behind ${tgt}. Falls incomplete.",
      "${qb} tries to fit it in — too much heat on it, off ${tgt}'s hands. No good, friends."
    ],
    sack:[
      "${qb} back to pass — he's in trouble! ${edge} breaks through and drags him down! A loss of ${yards}!",
      "The pocket caves in — ${edge} gets to ${qb}! Spilled for a loss of ${yards}!",
      "${qb} can't find a man — and the forward wall buries him! A loss of ${yards}.",
      "Here comes the blitz — ${lb} is in free and wraps up ${qb}! Down he goes, ${yards}!",
      "${qb} holds it too long — ${edge} comes around the corner and nails him! Loss of ${yards}!",
      "Coverage downfield, nowhere to throw — ${qb} eats it. They drop him for ${yards}.",
      "Oh, they got to him! ${edge} and ${lb} converge — ${qb} smothered for a loss of ${yards}!",
      "${qb} steps up to escape — right into ${edge}! No escape, a loss of ${yards}, friends.",
      "Protection breaks down in a hurry — ${qb} sacked, and it's a loss of ${yards}!",
      "${edge} bulls the tackle straight back and gets the strip-sack chance — ${qb} down for ${yards}!"
    ],
    int:[
      "${qb} fires over the middle — INTERCEPTED! ${db} steps in front and gathers it in! The other way they go, friends!",
      "Up for grabs — and ${db} comes down with it! What a turnabout, ladies and gentlemen!",
      "${qb} throws into a crowd — PICKED OFF by ${db}! Oh, he'll want that one back.",
      "${qb} looks for ${tgt} — but ${db} read his eyes the whole way! INTERCEPTION!",
      "Floated it up there, ${qb} did — and ${db} camps under it for the pick! A killer, friends.",
      "${qb} forces it deep — and ${db} goes up and TAKES it away! Stolen, ladies and gentlemen!",
      "Tipped at the line — and ${db} snatches it out of the air! What a break for the defense!",
      "${qb} late over the middle — ${db} jumps the route and it's PICKED! Oh, that's a back-breaker.",
      "Off the hands of ${tgt} — and right to ${db}! Intercepted, and you could hear the groan from here."
    ]
  },
  td:[ "Touchdown! Touchdown, ${off}! Oh, what a play, ladies and gentlemen!", "He's IN! Touchdown — listen to this crowd, friends!", "Six points! Touchdown ${off}, and the place is bedlam!", "Across the goal line he goes — TOUCHDOWN ${off}!", "He walks it in! Touchdown, ${off} — and the band strikes up!", "Got the pylon! Touchdown! Oh, what a finish, friends!", "Into the end zone — TOUCHDOWN, ${off}! Pandemonium in the stands!", "Six the hard way — touchdown ${off}, and they're dancing in the aisles!", "He dives — and he's IN! Touchdown! What a football play, ladies and gentlemen!" ],
  first:[ " First down and ten!", " And that's a fresh set of downs, friends!", " Moves the marker — first down!", " Past the sticks — first down!", " They'll move the chains on that one!", " Right at the marker — and it's a first down!", " First down, ${off}, and the drive lives on!" ],
  short:[ " — but they're stopped shy of the marker!", " — and they come up a whisker short!", " — no good, they hold 'em!", " — but it's not enough, and the chains stay put!", " — they're a foot short, friends, a foot!", " — and the defense holds right there!", " — but they don't get it, turned away short!" ],
  lead:[ "", "", "", "Here's the snap. ", "", "They line up over the ball. ", "", "Set at the line. " ]
  };
})();
