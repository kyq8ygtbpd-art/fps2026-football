---
name: fps2026-field-renderer
description: Full-field broadcast renderer in sim.js draw(); hash model; app.js wiring points
metadata:
  type: project
---

## Field Renderer (sim.js)

`draw()` method is at ~line 415 in sim.js. The old renderer used a 36-yard zoom window (cx±18 yards). The new one renders all 120 yards (FL=120) mapped to the full canvas width.

Key constants defined at module level:
- `FL=120, FW=53.3, EZ=10` — field length, width, end-zone depth
- `HASH_L=18.5, HASH_R=FW-18.5` — hash row y-positions in yard space

**Coordinate transform**: `X=x=>x*sx, Y=y=>y*sy` where `sx=W/FL, sy=H/FW`

**Hash model**: `this.ballHash` (0=left, 1=center, 2=right) on FieldSim. Set explicitly or auto-derived from carrier y-position in draw(). Default=1 (center). Updated in app.js on each play at CG.ballHash.

**Logo**: async image load from `logos/<abbr>.png`; cached on `window.__fieldLogoCache`; colored-circle+abbr fallback while loading. Drawn at `X(FL/2)` = midfield.

**Overlay**: `this.gameState` must have `{down, toGo, ballOn, poss}` for overlay to show down/distance. `cgApplyFieldEnvironment()` now populates these. `this.ballHash` drives hash name in overlay.

**Players**: scaled to `R=max(5,min(10,W/130))` — smaller than the zoomed view but still readable. Team-colored chips (homePri/awayPri) with role letter. Carrier gets white chip + gold ball pip + pulsing spotlight.

## app.js wiring

Three key places to wire homeTeam/awayTeam/gameState into FieldSim:

1. **`cgMountField()`** (~line 7100) — the `mk()` lambda now sets `sim.homeTeam`, `sim.awayTeam`, `sim.gameState`, `sim.ballHash` before calling setup().

2. **`cgApplyFieldEnvironment()`** (~line 6814) — already sets `sim.homeTeam`/`sim.awayTeam`; now also sets `sim.gameState.down/toGo/ballOn` and `sim.ballHash`.

3. **`CG.ballHash`**: initialized to 1 in `cgResolveCoin()`; updated after each play in the advance block (firstDown→1, otherwise random 0-2).

## Playwright injection pattern

sim.js uses `const SIM = (() => { 'use strict'; ... })()` at module level. In Playwright:
- `addInitScript` doesn't work because `const` in strict mode is block-scoped to the IIFE wrapper
- `eval()` of the raw code fails for the same reason  
- **Working pattern**: wrap the code: `'(function(){\n' + simCode.replace("'use strict';", '') + '\nwindow.SIM = SIM;\n})();'` then `pg.evaluate((code)=>eval(code), wrapped)`

**Why:** Removing `'use strict'` from inside the IIFE allows the `const SIM` to leak to the calling scope (the function wrapper's scope), and then `window.SIM = SIM` exposes it globally.
