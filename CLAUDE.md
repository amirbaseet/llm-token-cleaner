# CLAUDE.md — llm-token-cleaner

## What this project is
A zero-dependency TypeScript library that strips LLM output noise to minimize token count before re-prompting. Published on npm as `llm-token-cleaner`.

## Commands

```bash
npm test                  # run all 103 tests
npm run test:coverage     # run with coverage report (target: >99%)
npm run test:watch        # watch mode
npm run build             # compile TypeScript → dist/
npm run lint              # type check only (tsc --noEmit)
npm run prepublishOnly    # runs test + build (runs automatically before npm publish)
```

## Project structure

```
src/
  types.ts      — all public TypeScript interfaces (StageId, CleanOptions, CleanResult, etc.)
  fence.ts      — fence guard utility (outside() function)
  stages.ts     — 20 pure stage functions, ordered HOT → STRUCT → CLEAN
  tokens.ts     — estimateTokens() — char-estimate, no deps
  presets.ts    — 3 named preset configs (reprompt, human, codesafe)
  pipeline.ts   — clean(), cleanText(), stream() — public API
  index.ts      — barrel export

test/
  fence.test.ts     — 8 tests for fence guard edge cases
  stages.test.ts    — 72 tests for all 20 stages
  pipeline.test.ts  — 18 tests for clean(), stream(), tokenizer, validation
  tokens.test.ts    — 5 tests for estimateTokens()
```

## Key architecture decisions

- **Pipeline order is load-bearing** — HOT before STRUCT before CLEAN. Do not reorder stages.
- **Fence guard (g:1 flag)** — STRUCT stages apply only outside triple-backtick fences via `outside()`. Never apply fence-guarded stages inside code blocks.
- **No shared state** — every stage is a pure function `(string) => string`. No globals, no closures over mutable state.
- **Streaming buffers by line** — `stream()` never flushes mid-line because regex patterns are line-anchored (`^`, `$`, `/gm`).
- **Pluggable tokenizer** — `CleanOptions.tokenizer` defaults to `estimateTokens`. Swap in gpt-tokenizer for exact BPE counts.

## How to add a new stage

1. Add a `StageId` union member to `src/types.ts`
2. Add the stage object to `STAGES` array in `src/stages.ts` (correct position in HOT/STRUCT/CLEAN order)
3. Add `fenceGuard: true` if the stage should skip code blocks — wrap fn with `g()`
4. Add the stage ID to the correct preset(s) in `src/presets.ts`
5. Add tests in `test/stages.test.ts` — at minimum one positive case and one edge case

## Publishing

```bash
npm test && npm run build   # verify before release
npm version patch           # or minor/major
git push --follow-tags
# then create a GitHub release → publish.yml workflow fires automatically
```

## Known issues / tech debt

- The emoji fallback path (stages.ts line ~28) is uncovered — it only fires on engines without Unicode property escape support. Not worth mocking RegExp to cover it.
- The streaming `push()` method does not handle a code fence opening split across two chunks (`` ` `` in one chunk, `` `` ` in the next). Extremely rare in practice.
- No `maxLength` guard in `clean()` — pathological inputs (500k+ tokens) will block the event loop.
