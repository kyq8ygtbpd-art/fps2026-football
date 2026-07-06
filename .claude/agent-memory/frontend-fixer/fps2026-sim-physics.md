---
name: fps2026-sim-physics
description: Key patterns and bugs discovered while implementing pass arc + tackle physics in sim.js
metadata:
  type: project
---

## Speed Rule — NEVER compress carrier speed to hit minT

`runCarrier` must NOT use minT-based ease. The old `bc+=0.38; tx=MAX(tx, los+gainTarget*ease)` pattern sprints the carrier to the stop point within minT — feels broken when minT is short (1.3–1.7s). Correct approach: carrier runs at natural physics speed (speedMul ≈ 0.98–1.0 of maxSpd when open), decelerates only within 0.55yd of the stop point (speedMul 0.28). `readyToResolve()` holds the play-end gate regardless. Duration is free.

## Ball Speed Model

`spd = clamp(13 + throwPow/99*4 - airDist*0.05, 9, 17)` gives ~0.9–1.1s air for a 15-yd pass — realistic feel. Old `15+pow/99*7` was too fast, compressing the arc. Ball lead: `leadT = airTime * 0.90` so ball arrives where the receiver actually will be (in-stride catch).

## Catch-in-stride (catchResolve)

After completion, preserve receiver velocity — do NOT zero it. Only nudge `r.vx = max(r.vx, ms*0.35)` if receiver is nearly stopped (e.g. came out of a curl). This eliminates the stop-then-restart glitch at catch.

## Pass Physics (sim.js `throwTo` / ball step / `catchResolve`)

**Ball object fields after `throwTo`:**
- `ox/oy`: origin (QB position at throw time)
- `tx/ty`: target landing point (receiver pos + lead)
- `airTime`: total flight time in seconds (airDist/spd)
- `arcH`: peak height in yards (airDist*0.18+0.8, clamped 1–9)
- `t0`: sim.t when thrown
- `z`: current arc height computed in step() as `arcH * sin(frac * PI)`
- `frac`: elapsed/airTime, clamped 0–1

**Arc step loop:** `frac>=1` → call `catchResolve()`. If `!readyToResolve()`, ball sits at landing spot (z=0) until minT passes.

**Critical bug fixed:** After `catchResolve` resolves a completion, `this.thrown=false` but `this.play==='pass'` — the late sack check `if(!this.thrown && t>3.2)` fires and sacks the QB even though receiver caught it. Fixed by adding `this._catchDone=true` in `catchResolve` and guarding: `!this.thrown && !this._catchDone && t>3.2`.

## Pursuit Physics (sim.js `pursue`)

Old: `steer(e, car.x+car.vx*0.5, car.y+car.vy*0.5, dt, mul)` — fixed 0.5s lead, no speed awareness.

New: intercept-angle pursuit — lookAhead time = dist/(max(0.5, pursuerSpd - carSpd*0.4)), clamped 0.12–1.8s. Steers to `car.x + cvx*lookAhead, car.y + cvy*lookAhead`.

## Script Tackler Intercept

Old: steer to `min(car.x+1.3, tkX+0.6)` — arbitrary lead.

New: solve `timeToSpot = |tkX - car.x| / carrSpd`, steer to `(tkX+0.4, car.y + car.vy*min(timeToSpot, 0.9))`. Much tighter convergence on the scripted stop point.

## DB Coverage During Ball Flight

DBs now steer to `ball.tx/ty` (landing spot) rather than `ball.tx/ty` from step loop — ensures they break on the ball's endpoint, not the receiver's moving feet.

## Visual Arc Rendering

`liftScale = H * 0.038` (px per yard-of-height). At 500px canvas this is ~19px/yd. A 22-yd pass peaks at arcH≈4.76 yds → ~90px of visual lift — clearly parabolic trail in top-down view. Ball shadow gets dimmer as height increases (alpha 0.35 - bz*0.025).

Ball spot on hash is hidden while ball is in flight (`if(ballEnt && !(this.ball && this.thrown))`).

## Scouting Tests — Must Always Pass

- `check_scouting_depth.js` exits 0, `failures:[]`
- `scouting_staff_smoke.js` ALL CHECKS PASSED, PAGE ERRORS: 0
