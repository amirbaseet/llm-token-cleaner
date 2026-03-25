import { describe, it, expect } from 'vitest';
import { clean, cleanText, stream } from '../src/pipeline.js';

describe('clean(): one-shot pipeline', () => {
  it('returns CleanResult shape', () => {
    const r = clean('**bold** text');
    expect(r).toHaveProperty('text');
    expect(r).toHaveProperty('tokensIn');
    expect(r).toHaveProperty('tokensOut');
    expect(r).toHaveProperty('saved');
    expect(r).toHaveProperty('pct');
    expect(r).toHaveProperty('stats');
  });

  it('reprompt preset strips everything', () => {
    const r = clean('## Title\n**bold** 🔥\n- item\n', { preset: 'reprompt' });
    expect(r.text).not.toContain('##');
    expect(r.text).not.toContain('**');
    expect(r.text).not.toContain('🔥');
    expect(r.text).not.toContain('- ');
  });

  it('human preset preserves markdown', () => {
    const r = clean('## Title\n**bold**\n- item', { preset: 'human' });
    expect(r.text).toContain('## Title');
    expect(r.text).toContain('**bold**');
    expect(r.text).toContain('- item');
  });

  it('codesafe preset preserves fences and inline code', () => {
    const r = clean('```py\ncode()\n```\nuse `x` here', { preset: 'codesafe' });
    expect(r.text).toContain('```');
    expect(r.text).toContain('`x`');
  });

  it('tokensIn >= tokensOut always', () => {
    const inputs = ['hello', '**bold**', '🔥 emoji', '┌──┐\n│hi│', ''];
    for (const inp of inputs) {
      const r = clean(inp);
      expect(r.tokensIn).toBeGreaterThanOrEqual(r.tokensOut);
    }
  });

  it('pct is 0 for empty string', () => {
    expect(clean('').pct).toBe(0);
  });

  it('stats only includes enabled stages with savings > 0', () => {
    const r = clean('**bold**', { preset: 'reprompt' });
    for (const s of r.stats) {
      expect(s.saved).toBeGreaterThan(0);
    }
  });

  it('stages override merges with preset', () => {
    // reprompt has fences: true, we disable it
    const r = clean('```py\ncode()\n```', { preset: 'reprompt', stages: { fences: false } });
    expect(r.text).toContain('```');
  });

  it('partial stages override leaves others intact', () => {
    // Disable only box, everything else from reprompt should still run
    const r = clean('**bold** ┌──┐', { preset: 'reprompt', stages: { box: false } });
    expect(r.text).not.toContain('**');   // emph still ran
    expect(r.text).toContain('┌');       // box was disabled
  });
});

describe('cleanText(): convenience wrapper', () => {
  it('returns only the text string', () => {
    expect(typeof cleanText('**hello**')).toBe('string');
    expect(cleanText('**hello**')).not.toContain('**');
  });
});

describe('stream(): stateful streaming cleaner', () => {
  it('produces same result as clean() when flushed', () => {
    const input = '## Title\n**bold** 🔥\n- item\n```\ncode\n```\n';
    const expected = clean(input, { preset: 'reprompt' }).text;
    const cleaner = stream({ preset: 'reprompt' });
    let out = cleaner.push(input);
    out += cleaner.flush();
    expect(out).toBe(expected);
  });

  it('handles chunked input', () => {
    const input = '**bold** text\n*italic* text\n';
    const chunks = input.match(/.{1,5}/g) ?? [];
    const cleaner = stream({ preset: 'reprompt' });
    let out = '';
    for (const chunk of chunks) out += cleaner.push(chunk);
    out += cleaner.flush();
    expect(out).not.toContain('**');
    expect(out).not.toContain('*');
    expect(out).toContain('bold');
    expect(out).toContain('italic');
  });

  it('reset() clears the buffer', () => {
    const cleaner = stream({ preset: 'reprompt' });
    cleaner.push('partial line with no newline');
    cleaner.reset();
    // After reset, flush should return nothing
    expect(cleaner.flush()).toBe('');
  });

  it('does not emit partial lines mid-stream', () => {
    const cleaner = stream({ preset: 'reprompt' });
    // push a chunk that ends mid-line — should hold it back
    const emitted = cleaner.push('**bold** text with no newline yet');
    expect(emitted).toBe(''); // held back, no newline
  });

  it('emits complete lines as they arrive', () => {
    const cleaner = stream({ preset: 'reprompt' });
    const emitted = cleaner.push('**bold** text\n');
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted).not.toContain('**');
  });

  it('multiple pushes accumulate correctly', () => {
    const cleaner = stream({ preset: 'reprompt' });
    let out = '';
    out += cleaner.push('## Head');
    out += cleaner.push('er\n');
    out += cleaner.push('**bo');
    out += cleaner.push('ld**\n');
    out += cleaner.flush();
    expect(out).not.toContain('##');
    expect(out).not.toContain('**');
    expect(out).toContain('Header');
    expect(out).toContain('bold');
  });
});

describe('clean(): pluggable tokenizer', () => {
  it('uses custom tokenizer for counting', () => {
    // A tokenizer that counts words — clearly distinct from char-estimate
    const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;
    const r = clean('hello world foo', { tokenizer: wordCount });
    expect(r.tokensIn).toBe(3);   // 3 words in
  });

  it('custom tokenizer affects tokensOut and saved', () => {
    const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;
    // reprompt strips "- " markers, reducing word count slightly
    const r = clean('- one\n- two\n- three\n', {
      preset: 'reprompt',
      tokenizer: wordCount,
    });
    expect(r.tokensOut).toBeLessThanOrEqual(r.tokensIn);
  });

  it('falls back to estimateTokens when no tokenizer provided', async () => {
    const { estimateTokens } = await import('../src/tokens.js');
    const r = clean('hello world');
    expect(r.tokensIn).toBe(estimateTokens('hello world'));
  });

  it('custom tokenizer does not affect stage transforms', () => {
    // Transforms should be identical regardless of tokenizer
    const noop = (_: string) => 0;
    const r1 = clean('**bold** 🔥', { preset: 'reprompt' });
    const r2 = clean('**bold** 🔥', { preset: 'reprompt', tokenizer: noop });
    expect(r1.text).toBe(r2.text);
  });
});
