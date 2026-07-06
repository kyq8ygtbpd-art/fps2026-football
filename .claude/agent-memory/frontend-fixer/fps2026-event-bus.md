---
name: fps2026-event-bus
description: Physics→narration event bus: onEvent callback in FieldSim, consumer in app.js live path, event types and emit locations
metadata:
  type: project
---

## Event Bus Architecture (sim.js → app.js)

### sim.js side

- `FieldSim.onEvent = null` — set in constructor; caller assigns after construction (or after setup)
- `FieldSim._emitted = new Set()` — reset in `setup()`; guards double-fire per event type per play
- `FieldSim.prototype._emit(type, data)` — helper; early-returns if `!this.onEvent` or type already in `_emitted`
- Safe: wraps `onEvent` call in try/catch so a bad consumer never breaks physics

### Emit points (sim.js line ~)

| Event | Location | Condition |
|---|---|---|
| `snap` | `animateLive()` before first tick | always, once |
| `dropback` | `step()` top, `play==='pass'&&!thrown&&!scrambling&&t>=0.12` | pass plays |
| `handoff` | `step()` top, `play==='run'&&carrier.hasBall&&t>=0.12` | run plays |
| `handoff` (scramble) | `step()` top, `scrambling&&t>=0.12` | scramble |
| `throw` | end of `throwTo()` after ball object built | pass throw |
| `catch` | `catchResolve()` on `_complete` path | completion |
| `incomplete` | `catchResolve()` on `!_complete&&!_pick` path | incompletion |
| `intercepted` | `catchResolve()` on `_pick` path; also `end('INT'/'INTret')` | INT |
| `pick6` | `end('pick6')` | pick-6 |
| `breakTackle` | broken-tackle loop in `step()` | per break |
| `touchdown` | `end('TD')` | TD |
| `sack` | `end('sack')` | sack |
| `tackle` | `end('tackle'/'oob')` | terminal tackle |

Note: `incomplete` is emitted from `catchResolve` before `end('incomplete')` is called. `end()` skips re-emitting for incomplete.

### app.js consumer (live path only)

Location: inside `later()` callback in `cgRenderTextCast`, after `cgMountField('play', reveal)` returns `true`

```js
CG._pendingRead = null;  // retire 38%-of-duration timer
if(started && CGSIM) {
  const _evSq = sq;
  CGSIM.onEvent = (type, data) => {
    if (!CG || !CG._scoreView || !CG._animating || CG._renderSeq !== _evSq) return;
    // build phrase from type + CG._lastAct (qb/rb/target last names)
    // patch .cg-lastplay .cg-lp-text or .cg-live .cg-lp-text DOM directly
  };
}
```

**Stale-play guard**: captures `sq = CG._renderSeq` at wire-time; every handler checks `CG._renderSeq !== _evSq` and no-ops.

**Auto/skip path**: `CG._animating` is false in auto/skip mode → `started` is false → `CGSIM.onEvent` never set → no event narration. Result goes straight to `CG.lastText` via `cgSnap` as before.

**Terminal result**: `reveal()` / `cgCommitPendingResult()` still fires at animation end and swaps in the final full sentence. Event bus only handles mid-play beats.

### Event phrase map

| type | phrase |
|---|---|
| snap | "Snap — QB drops back…" / "Snap — handoff to RB…" |
| dropback | "QB drops, looking for Target…" |
| handoff | "Handoff to RB — hitting the line…" |
| throw | "QB fires for Target…" / "QB launches it deep for Target…" |
| catch | "Caught — Receiver with the reception!" |
| incomplete | "Incomplete — off the mark for Target." |
| intercepted | "INTERCEPTED by DB!" |
| breakTackle | "Carrier breaks a tackle — still going!" |
| touchdown | "TOUCHDOWN — Carrier!" |
| sack | "Sacked — QB goes down!" |
| tackle | "Carrier picks up N." |

**Why:** [[fps2026-sim-physics]]
