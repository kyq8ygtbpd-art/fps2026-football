---
name: fps2026-playwright-harness
description: How to run Playwright screenshot tests for FPS2026 sim.js canvas rendering
metadata:
  type: reference
---

## Playwright harness for FPS2026 field screenshots

**Node modules**: `/Users/ztc/Desktop/fps97_2026/output/playwright/node_modules`
**Run command**: `NODE_PATH=/Users/ztc/Desktop/fps97_2026/output/playwright/node_modules node <script>.js`

**Why serve over HTTP**: logos (`logos/<abbr>.png`) and field backgrounds need HTTP base URL; file:// doesn't work for cross-origin image loads.

**Serve pattern**: standard `http.createServer` from the fps2026 dir. The existing smoke tests in `/Users/ztc/Desktop/fps97_2026/output/playwright/` show the exact pattern.

**sim.js injection** (see fps2026-field-renderer.md for details):
```js
const simCode = fs.readFileSync(path.join(APP,'sim.js'),'utf8');
const wrapped = '(function(){\n' + simCode.replace("'use strict';", '') + '\nwindow.SIM = SIM;\n})();';
await pg.evaluate((code)=>{ eval(code); }, wrapped);
```

**Existing tests** (must remain green):
- `/Users/ztc/Desktop/fps97_2026/output/playwright/scouting_staff_smoke.js`
- `/Users/ztc/Desktop/fps97_2026/output/playwright/check_scouting_depth.js`

**Scratchpad**: `/private/tmp/claude-501/-Users-ztc-Desktop/fdea6ee2-cc27-49a1-8966-1144c7a49b41/scratchpad/`

**IMPORTANT**: Always use absolute paths for APP and SCRATCHPAD — `__dirname` resolves incorrectly from the deep scratchpad path.
