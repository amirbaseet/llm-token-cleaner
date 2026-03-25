import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../src/tokens.js';

describe('estimateTokens()', () => {
  it('returns 0 for empty string',  () => expect(estimateTokens('')).toBe(0));
  it('counts non-ascii as 1 each',  () => expect(estimateTokens('🔥')).toBe(1));
  it('counts ascii at ~4 per token',() => expect(estimateTokens('abcd')).toBe(1));
  it('handles mixed',               () => expect(estimateTokens('hi 🔥')).toBeGreaterThan(1));
  it('is always non-negative',      () => {
    const inputs = ['', ' ', '\n', 'hello', '🔥🔥🔥', '┌──┐'];
    for (const s of inputs) expect(estimateTokens(s)).toBeGreaterThanOrEqual(0);
  });
});
