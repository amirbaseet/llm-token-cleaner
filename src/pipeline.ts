import { STAGES, STAGE_IDS } from './stages.js';
import { PRESETS } from './presets.js';
import { estimateTokens } from './tokens.js';
import type { CleanOptions, CleanResult, StageId, StageStat, StreamCleaner } from './types.js';
import type { StageMap } from './presets.js';

/** Build the resolved stage enable-map from CleanOptions */
function resolveConfig(options: CleanOptions = {}): StageMap {
  const base = PRESETS[options.preset ?? 'reprompt'];
  if (!options.stages) return base;
  const merged = { ...base };
  for (const [id, enabled] of Object.entries(options.stages)) {
    if (STAGE_IDS.includes(id as StageId)) {
      (merged as Record<string, boolean>)[id] = enabled ?? false;
    }
  }
  return merged;
}

/** Resolve the token-counting function — custom if provided, else built-in estimate */
function resolveTok(options: CleanOptions = {}): (t: string) => number {
  return options.tokenizer ?? estimateTokens;
}

/**
 * Run the full pipeline on a complete string.
 *
 * @example
 * const { text, pct } = clean(rawLLMOutput, { preset: 'reprompt' });
 *
 * @example — exact counts with gpt-tokenizer
 * import { encode } from 'gpt-tokenizer';
 * const { text, pct } = clean(rawLLMOutput, {
 *   preset: 'reprompt',
 *   tokenizer: t => encode(t).length,
 * });
 */
export function clean(text: string, options: CleanOptions = {}): CleanResult {
  const cfg = resolveConfig(options);
  const tok = resolveTok(options);

  let cur = text;
  let prev = tok(text);
  const stats: StageStat[] = [];

  for (const stage of STAGES) {
    if (cfg[stage.id]) cur = stage.fn(cur);
    const now = tok(cur);
    const saved = prev - now;
    if (cfg[stage.id] && saved > 0) stats.push({ id: stage.id, saved });
    prev = now;
  }

  const tokensIn  = tok(text);
  const tokensOut = prev;
  const saved     = tokensIn - tokensOut;
  const pct       = tokensIn > 0 ? Math.round((saved / tokensIn) * 100) : 0;

  return { text: cur, tokensIn, tokensOut, saved, pct, stats };
}

/**
 * Convenience helper — returns only the cleaned text.
 * Use clean() if you need token stats.
 */
export function cleanText(text: string, options: CleanOptions = {}): string {
  return clean(text, options).text;
}

/**
 * Create a stateful streaming cleaner.
 *
 * Buffers incoming chunks and flushes only on complete lines — never splits
 * a line mid-regex, so fence guards and line-anchored patterns work correctly.
 * At most one partial line is held back at any time (~200 chars worst case).
 *
 * @example
 * const cleaner = stream({ preset: 'reprompt' });
 * for await (const chunk of llmStream) {
 *   process.stdout.write(cleaner.push(chunk));
 * }
 * process.stdout.write(cleaner.flush());
 */
export function stream(options: CleanOptions = {}): StreamCleaner {
  const cfg = resolveConfig(options);
  let buf = '';

  function applyAll(text: string): string {
    let cur = text;
    for (const stage of STAGES) {
      if (cfg[stage.id]) cur = stage.fn(cur);
    }
    return cur;
  }

  function safeFlush(final: boolean): string {
    if (!buf) return '';
    if (final) {
      const result = applyAll(buf);
      buf = '';
      return result;
    }
    const lastNewline = buf.lastIndexOf('\n');
    if (lastNewline === -1) return '';
    const safe = buf.slice(0, lastNewline + 1);
    buf = buf.slice(lastNewline + 1);
    return applyAll(safe);
  }

  return {
    push(chunk: string): string { buf += chunk; return safeFlush(false); },
    flush(): string             { return safeFlush(true); },
    reset(): void               { buf = ''; },
  };
}
