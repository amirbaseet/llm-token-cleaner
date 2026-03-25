# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-03-25

### Fixed
- `clean()` now throws `TypeError` with a clear message on non-string input (previously threw a cryptic regex error)
- `clean()` now throws `TypeError` with a helpful message on invalid preset names (previously silently disabled all stages)
- `stream()` now validates preset name at construction time
- Eliminated redundant `tok(text)` call in `clean()` — `tokensIn` is now captured once before the loop instead of recalculated at the end

### Added
- `index.ts` barrel export now covered by tests (0% → 100%)
- 4 new validation tests — 99 → 103 tests total
- `*.log` added to `.gitignore`

### Coverage
- Statement coverage: 94.76% → 99.72%

---

## [1.0.0] - 2026-03-25

### Added
- 20 pipeline stages across three categories: `hot` (Unicode noise), `struct` (markdown/HTML), `clean` (whitespace)
- `clean()` — one-shot pipeline with full token stats and per-stage breakdown
- `cleanText()` — convenience wrapper returning cleaned text only
- `stream()` — stateful streaming cleaner, line-safe buffer, reusable via `reset()`
- `estimateTokens()` — fast char-estimate tokenizer (~8% error vs cl100k), zero dependencies
- Pluggable tokenizer via `CleanOptions.tokenizer` — swap in gpt-tokenizer or tiktoken for exact counts
- Three named presets: `reprompt` (all stages), `human` (keep markdown), `codesafe` (keep code fences)
- Per-stage `stages` override on top of any preset
- Hardened fence guard: handles trailing spaces after lang tags, 4+ backtick fences, unclosed fences
- 99 tests across fence guard, all 20 stages, pipeline, and streaming
- GitHub Actions CI (Node 18/20/22) and auto-publish workflow on release

### Notes
- Tags v1.0.1 and v1.0.2 exist in git but were never published to npm — they were accidental empty version bumps with no code changes
