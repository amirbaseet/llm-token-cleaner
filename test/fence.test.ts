import { describe, it, expect } from 'vitest';
import { outside } from '../src/fence.js';

const upper = (s: string) => s.toUpperCase();

describe('outside() fence guard', () => {
  it('applies fn to plain text with no fences', () => {
    expect(outside('hello world', upper)).toBe('HELLO WORLD');
  });

  it('skips content inside a standard fence', () => {
    const input = '```\nhello\n```';
    expect(outside(input, upper)).toBe(input);
  });

  it('applies fn to text before and after fences', () => {
    const input = 'before\n```\nkeep\n```\nafter';
    expect(outside(input, upper)).toBe('BEFORE\n```\nkeep\n```\nAFTER');
  });

  it('handles lang tag on fence opening', () => {
    const input = '```python\nkeep\n```';
    expect(outside(input, upper)).toBe(input);
  });

  it('handles trailing space after lang tag', () => {
    const input = '```python   \nkeep\n```';
    expect(outside(input, upper)).toBe(input);
  });

  it('handles 4-backtick fences', () => {
    const input = '````\nkeep\n````';
    expect(outside(input, upper)).toBe(input);
  });

  it('handles unclosed fence — consumes to end of string', () => {
    const input = 'before\n```\nkeep forever';
    const result = outside(input, upper);
    expect(result).toContain('BEFORE');
    expect(result).toContain('keep forever'); // not uppercased
  });

  it('handles multiple fences', () => {
    const input = 'a\n```\nfence1\n```\nb\n```\nfence2\n```\nc';
    const result = outside(input, upper);
    expect(result).toBe('A\n```\nfence1\n```\nB\n```\nfence2\n```\nC');
  });
});
