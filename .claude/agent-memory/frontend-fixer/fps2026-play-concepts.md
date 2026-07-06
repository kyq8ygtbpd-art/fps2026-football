---
name: fps2026-play-concepts
description: Concept-aware choreography system (2026-07) — how OFF_META play keys map to specific on-field motion in FieldSim, so a draw looks like a draw, a toss sweeps wide, jet sweep hands off to a WR, and crossing routes actually cross
metadata:
  type: project
---

## Problem (fixed 2026-07-05)

Before this fix, `cgSnap()` in app.js sent only the COARSE `profile` (`inside`/`outside`/`short`/`deep`/`pa`/`screen`) to `CG._viz.script.offKey`, which became `sim.playKey`. FieldSim's `routeKind()` and `runCarrier()` only branched on that coarse profile, so e.g. `draw`, `power`, `counter`, `trap`, `iso` all rendered as identical generic downhill runs, and `toss`/`stretch`/`pinpull` rendered identically to `inside` (straight-ahead) instead of bouncing outside. Real play concepts (crossing/mesh, jet sweep, zone read, QB draw) had no distinct visual signature.

## Fix architecture

**app.js** (~line 5020, right after `OFF_META`):
- `OFF_CONCEPT` — maps every `OFF_PLAYS` key to one of: `draw`, `qb_keeper`, `sweep`, `jet_sweep`, `zone_read`, `inside`, `crossing`, `slant`, `deep`, `screen`, `pa`, `short`.
- `offConcept(offKey)` — looks up `OFF_CONCEPT[offKey]`, falls back to `OFF_META[offKey].profile`, then to `offKey` itself.
- `cgRunCarrier(tp, offKey)` (~5625) — now uses `offConcept(offKey)`:
  - `qb_keeper` (sneak, qb_power) → QB always carries (unchanged behavior, generalized).
  - `zone_read` → 32% chance QB carries (mesh-point keep), else RB (unchanged split logic, same regex fallback preserved).
  - `jet_sweep` → picks a WR (weighted by speed) instead of the RB. New.
  - `sweep` → RB carries, weighted toward speed not power (previously only `offKey==='outside'` got the speed weighting; now any `sweep`/`zone_read` concept does).
- `cgSnap()` (~line 7849 area) — `CG._viz.script` now carries THREE offense-key fields: `offKey` (still the coarse profile — kept for back-compat, nothing besides sim.js reads it), `rawKey` (the actual play key like `'draw'`/`'toss'`/`'mesh'`, for debugging), and `concept` (the new authoritative field FieldSim actually uses).

**sim.js**:
- `FieldSim.prototype.setup()`: `this.concept = (script&&script.concept) || this.playKey` — falls back cleanly when no concept is sent (e.g. `onePlay()`/`simFullGame()` full-game-sim path, which never sets `script.concept`, and the AI-vs-AI/quick-sim calls that don't populate a rich script).
- `routeKind(playKey, role, i)` — param is really "concept" now (all 3 call sites in `setup()` changed from `this.playKey` to `this.concept`). Added `crossing` (alternates `cross`/`mesh_shallow`/`dig`/`comeback`, TEs run `dig`/`flat`) and `slant` (heavy slant/out mix) branches. Falls through to old profile-based logic (`deep`/`pa`/`screen`/`short`/default) for everything else — unchanged.
- `route()` route library — added `cross` (shallow route with big lateral displacement: `[[3,0],[6,-10*s],[9,-24*s],[11,-30*s]]`), `mesh_shallow` (similar but shallower/tighter), `dig` (vertical stem + hard in-cut). The `-N*s` sign convention means a route naturally breaks TOWARD the opposite side of the field the receiver lined up on (verified: two receivers on opposite sides running `cross`/`mesh_shallow` converge their y-gap from ~8yd to <0.5yd — genuinely cross paths).
- `runCarrier(e,sim,dt,def,L,mid)` — now branches on `sim.concept` BEFORE the old generic logic:
  - `draw`: for `sim.t < 0.55s`, carrier sits near backfield depth (steer to `L-6`, small sinusoidal wobble, speedMul 0.42 — sells pass-pro). After the delay, uses the same interior-gap-finding logic as inside runs. Verified via position tracking: carrier x barely moves 33.6→34.2 for t<0.55s, then accelerates steadily.
  - `zone_read`: for `e.x<L+1 && sim.t<0.4`, both back and QB drift to a shared mesh point near the LOS (`L-1.5`) before committing — mimics the option ride.
  - `sweep`/`jet_sweep`: while `(e.x-L)<6`, steers hard toward a sideline landmark (`sweepY = mid + sweepSide*16`, `sweepSide` cached once per play on `sim._sweepSide` so the carrier commits one direction) at speedMul 0.95, and returns early (skips the interior-gap logic) until the carrier is near that landmark. After turning the corner, blends the "avoid nearby defender" target 45% toward the sideline landmark so the run keeps an outside track instead of snapping straight upfield immediately. Verified: toss carrier's y goes 26.75→44.71 (18yd bend) while x crawls, vs. power/inside where y stays ~26→23 (flat) while x advances steadily.
  - Everything else falls through to the original "find the biggest gap between the tackles" downhill logic — this is what `inside`/`power`/`counter`/`trap`/`iso`/etc. still use, unchanged.
- **jet_sweep carrier positioning** (`setup()`): a real jet sweep needs the ball-carrying WR to start OUT WIDE (like a WR alignment, in the process of "motion"), not in the RB backfield slot. Added:
  - `jetCarrier` — detected when `concept==='jet_sweep' && play==='run' && forcedCarrier.pos==='WR'`.
  - When present: `rbForce=null` (so the real RB stays in as a decoy/blocker, not overwritten), `oWR` list filters out the jet carrier (so he isn't ALSO drawn running a route), and a dedicated `this.jet` entity is created at `ent(jetCarrier,'off','WR', L-1.5, mid+jetSide*20)` — positioned near the numbers on a randomly-chosen (but cached to `sim._sweepSide`) side.
  - `this.carrier = this.jet || this.rb` (was hardcoded to `this.rb`) — this line is also what makes the WR actually the tracked/animated ball carrier.
- **`this.gainTarget`/`assignScriptTackler` bugfix**: these were hardcoded to `this.rb` in `setup()` (`if(play==='run' && this.rb){ ... assignScriptTackler(this,this.rb) ...}`). Changed to `this.carrier` — otherwise jet_sweep (or any future non-RB run carrier) would never get `gainTarget` set, meaning the scripted-stop logic never engages and the play free-runs to the 9-second timeout instead of landing exactly on `script.yards`.

## Known pre-existing quirk (NOT fixed, flagged separately)

When a run's forced carrier is the QB himself (sneak, qb_power, and now zone_read's 32%-QB-keep branch), `setup()` creates TWO entities for the same player: `this.rb` (role:'RB', wraps the QB player object, actually carries) AND `this.qb` (role:'QB', normal QB alignment, does nothing). Visually this is two dots on the field for one real player during a QB-designed run. This existed before this session's changes (already true for `sneak`/`qb_power`); I only extended the same pattern to `zone_read`'s keep branch rather than introducing something new. Spawned as a separate background task (task_a4091f39) rather than fixed inline, since it's cosmetic and out of scope for "match the choreography to the called play" (the correct player DOES carry the correct distance — there's just an extra idle decoration).

## Verification harness pattern (for concept/carrier work specifically)

Unlike the older injection trick documented in [[fps2026-playwright-harness]] (needed when loading sim.js in ISOLATION outside the page), when testing through `index.html` normally, `sim.js` is just a plain `<script src="sim.js">` tag (see index.html load order: data→engine→sim→nn→ai→...→app.js→universes→storylines) — `SIM` is a normal page-global, no eval/wrapper needed. Pattern used for this fix:

```js
await pg.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'load'});
await pg.waitForFunction(()=>typeof newLeague==='function' && typeof SIM==='object' && typeof SIM.FieldSim==='function');
const result = await pg.evaluate(async ()=>{
  newLeague(30,'BUF',{seed:11}); startCoachGame('BUF', oppAbbr, {});
  const off=team('BUF'), def=team(oppAbbr), tp=cgTop(off);
  const cv=document.createElement('canvas'); cv.width=900; cv.height=300;  // DETACHED canvas — do NOT
  // query `canvas.cg-field` from the live DOM; startCoachGame's render() cycle can tear out any
  // canvas you append to document.body between evaluate() calls.
  const sim=new SIM.FieldSim(cv);
  sim.fieldTheme=off; sim.homeTeam=off; sim.awayTeam=def;
  sim.setup(off, def, 'run', 40, {isPass:false,yards:9,result:'tackle',carrierId:rbId,concept:'draw',toGo:10,minT:1.3});
  let g=0; while(!sim.result && g<300){ sim.step(1/30); g++; }
  // sample sim.carrier.x/y each tick to get a position track, or cv.toDataURL('image/png') for frames
});
```

To verify a concept did what it claims, prefer **numeric position tracks** (sample `sim.carrier.x/y` or `sim.recv[].x/y` every few ticks and inspect the shape) over eyeballing screenshots — e.g. crossing was confirmed by showing two receivers' y-gap shrinking from 7.9 to 0.4 over time (their paths converge/cross), and draw was confirmed by showing carrier.x essentially frozen for t<0.55s then climbing steadily. Screenshots (`canvas.toDataURL`) are still worth capturing for a human sanity check but numeric tracks are the actual proof.

Full test script saved at `/private/tmp/claude-501/-Users-ztc-Desktop/fdea6ee2-cc27-49a1-8966-1144c7a49b41/scratchpad/concept_choreo_test.js` (scratchpad — not guaranteed to persist across machine/session boundaries, but useful as a template if rebuilding this test).

## Test-writing trap: TD contract cases need a LOS that actually reaches the endzone

`FL=120, EZ=10` so the TD check is `car.x >= FL-EZ` i.e. `>=110` — this is an ABSOLUTE field position, not a function of yards gained. A contract test case like "42-yard TD" MUST use a LOS where `los+yards>=110` (e.g. LOS=70, so 70+42=112). Using the default/convenient LOS=40 for a "42-yard TD" case is a silent test bug: 40+42=82 never crosses the goal line, so the play resolves as a normal tackle at 42 yards no matter what — sim.js is correct, the test's LOS was wrong. This produced a flaky-looking contract failure (passed once, failed once) purely from RNG affecting incidental timing, not a real regression. Always sanity-check `los+yards` against `FL-EZ` before asserting `outcome==='TD'` in any FieldSim test.

## Outcome contract — still holds

All 6 canonical cases (run 3/9/42-TD, pass 14, deep 46, incomplete) still land on EXACT scripted yards/result after these changes — verified via direct `FieldSim.setup()` + step-loop calls comparing `sim.result.yards`/`sim.result.outcome` against the script's `yards`/`result`. The concept system only changes the MOTION path to the same pre-decided endpoint; `assignScriptTackler`/`gainTarget`/`readyToResolve()` still gate the actual resolution exactly as before. See [[fps2026-sim-physics]] for the general contract-preservation rules (speed, ball timing, tackler intercept) that this fix did not touch.
