---
name: fps2026-booth-facts
description: Booth facts feature — announcer note pool generated at game start, delivered once each during play, shown in result-beat reveal card
metadata:
  type: project
---

## Booth Facts Feature (added 2026-06-29)

**Schema:** `CG.facts = [{text: string, used: boolean}, ...]`

**Generation:** `cgGenerateFacts()` fires once per game (`CG._factsInit` guard), called from `startCoachGame()` right after `cgPregameAI()`.
- Procedural baseline (synchronous): `cgBuildProceduralFacts()` — pulls from `CG._prep` (record/standings, stakes, storylines, player watches, rivalries, news, weather). Always available.
- LLM upgrade (async): `AI.facts(matchupSummary)` in ai.js — asks local Ollama for 7 short facts as JSON array. On success, prepends LLM facts to pool, keeps unused procedural facts as tail. Hallucination guard: rejects facts naming foreign teams.

**Delivery:** `cgPickFact()` — rate-limited (1 fact per 3 snaps via `CG._factSnap`), returns one unused fact and marks it `used:true`, or null.

**Injection — TWO paths (both needed):**
1. **Animated path** (manual mode, `_animating=true`): injected in `cgCommitPendingResult()` after clearing `_pendingResult`, only when `!p.color` (no result color = calm play) and `!CG._moment` and `!CG._colorAI`.
2. **Non-animated path** (autoAdv/auto): injected in `cgAfter()` when `!CG._pendingResult && !CG._moment && !CG._colorAI && !CG.lastColor`.

**UI Display:** Added to the REVEAL card in `cgRenderTextCast()` at the non-animated `if(CG._scoreView && !CG._animating)` branch — the `cg-result-foot` card now includes `CG.lastColor` as an analyst block (gold left-border box, italic text) between the grade and the sideline reporter.

**Key pitfall:** The `cgRender()` function (line ~7508) immediately returns to `cgRenderBroadcast()` — all lines after `return cgRenderBroadcast(m)` are DEAD CODE. Any `lastColor` display logic must be in `cgRenderTextCast()`.

**Rate-limit counter:** `CG._colorN` (incremented each snap in main snap path). `cgPickFact()` checks `_colorN - _factSnap >= 3`.

**Guard against double-fire:** `CG._factsInit` boolean, set at start of `cgGenerateFacts()`.

**`AI.facts()` location:** `ai.js`, exported on the returned object. Uses `AI.call()` (same cloud/local routing), budget ~520 tokens. Parses `[...]` from response; filters short/preamble strings.
