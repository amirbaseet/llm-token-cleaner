import { describe, it, expect } from 'vitest';
import { STAGES } from '../src/stages.js';
import type { StageId } from '../src/types.js';

/** Run a single stage in isolation */
function run(id: StageId, input: string): string {
  const stage = STAGES.find(s => s.id === id);
  if (!stage) throw new Error(`Stage not found: ${id}`);
  return stage.fn(input);
}

// ── HOT ──────────────────────────────────────────────────────────────────────

describe('box: strip box-drawing chars', () => {
  it('strips drawing chars', ()    => expect(run('box', '┌──┐\n│hi│\n└──┘')).not.toContain('┌'));
  it('preserves content',   ()    => expect(run('box', '┌──┐\n│hi│\n└──┘')).toContain('hi'));
  it('leaves plain ascii',  ()    => expect(run('box', 'hello')).toBe('hello'));
});

describe('emoji: strip extended pictographics', () => {
  it('removes emoji',              () => expect(run('emoji', 'hi 🔥 there')).not.toContain('🔥'));
  it('preserves surrounding text', () => expect(run('emoji', 'hi 🔥 there')).toContain('hi'));
  it('handles no emoji',           () => expect(run('emoji', 'hello')).toBe('hello'));
});

describe('zero: strip zero-width chars', () => {
  it('removes ZWSP',  () => expect(run('zero', 'hel\u200Blo')).toBe('hello'));
  it('removes BOM',   () => expect(run('zero', '\uFEFFtext')).toBe('text'));
  it('removes SHY',   () => expect(run('zero', 'hy\u00ADphen')).toBe('hyphen'));
});

// ── STRUCT ────────────────────────────────────────────────────────────────────

describe('hdr: strip markdown headers', () => {
  it('strips # h1',           () => expect(run('hdr', '# Title')).toBe('Title'));
  it('strips ## h2',          () => expect(run('hdr', '## Title\ntext')).not.toContain('##'));
  it('strips h1-h6',          () => expect(run('hdr', '###### deep')).toBe('deep'));
  it('fence guard: keeps #',  () => expect(run('hdr', '```\n# comment\n```')).toContain('# comment'));
});

describe('emph: strip markdown emphasis', () => {
  it('strips **bold**',              () => expect(run('emph', '**bold** text')).toBe('bold text'));
  it('strips __bold__',              () => expect(run('emph', '__bold__ text')).toBe('bold text'));
  it('strips *italic*',              () => expect(run('emph', '*italic* text')).toBe('italic text'));
  it('strips _italic_',              () => expect(run('emph', '_italic_ text')).toBe('italic text'));
  it('strips ***bold-italic***',     () => expect(run('emph', '***bi***')).toBe('bi'));
  it('no change on unclosed **',     () => expect(run('emph', '** not closed')).toBe('** not closed'));
  it('no change on unclosed *',      () => expect(run('emph', '* item')).toBe('* item'));
  it('fence guard: keeps **',        () => expect(run('emph', '```\n**keep**\n```')).toContain('**keep**'));
  it('fence guard: trailing space',  () => expect(run('emph', '```py \n**keep**\n```')).toContain('**keep**'));
  it('fence guard: unclosed fence',  () => expect(run('emph', '```\n**keep**\nno close')).toContain('**keep**'));
  it('no catastrophic backtrack',    () => {
    const evil = '**' + 'x'.repeat(600); // no closing **
    const start = Date.now();
    run('emph', evil);
    expect(Date.now() - start).toBeLessThan(100); // must complete in <100ms
  });
});

describe('fences: strip ``` markers', () => {
  it('removes opening ```',        () => expect(run('fences', '```\ncode\n```')).not.toContain('```'));
  it('removes ```lang opening',    () => expect(run('fences', '```py\ncode\n```')).not.toContain('```'));
  it('preserves code content',     () => expect(run('fences', '```\nconst x=1\n```')).toContain('const x=1'));
});

describe('icode: strip inline backtick code', () => {
  it('strips `code`',       () => expect(run('icode', 'use `grep` to find')).toBe('use grep to find'));
  it('fence guard: keeps',  () => expect(run('icode', '```\n`keep`\n```')).toContain('`keep`'));
});

describe('links: keep label and url', () => {
  it('formats as label (url)',  () => expect(run('links', '[Claude](https://claude.ai)')).toBe('Claude (https://claude.ai)'));
  it('no silent url loss',      () => expect(run('links', '[doc](https://x.com/a)')).toContain('x.com'));
  it('no label loss',           () => expect(run('links', '[doc](https://x.com/a)')).toContain('doc'));
});

describe('tables: convert pipe tables to csv', () => {
  const TABLE = '| a | b |\n|---|---|\n| 1 | 2 |';
  it('converts to csv',            () => { const r=run('tables',TABLE); expect(r).toContain('a,b'); expect(r).toContain('1,2'); });
  it('drops separator row',        () => expect(run('tables', TABLE)).not.toContain('---'));
  it('drops :---: separator',      () => expect(run('tables', '| h |\n| :---: |\n| d |')).not.toContain(':---'));
  it('ignores single pipe line',   () => expect(run('tables', 'text\n| 90 | 95 |\ntext')).toContain('| 90 |'));
  it('fence guard: keeps table',   () => expect(run('tables', '```\n| a | b |\n| c | d |\n```')).toContain('| a | b |'));
});

describe('lists: strip list markers', () => {
  it('strips - bullet',     () => { expect(run('lists', '- item')).not.toContain('- '); });
  it('strips * bullet',     () => { expect(run('lists', '* item')).not.toContain('* '); });
  it('strips 1. numbered',  () => { expect(run('lists', '1. first')).not.toContain('1.'); });
  it('preserves content',   () => { expect(run('lists', '- item')).toContain('item'); });
});

describe('ents: decode html entities', () => {
  it('decodes &amp;',    () => expect(run('ents', 'a &amp; b')).toBe('a & b'));
  it('decodes &lt;&gt;', () => expect(run('ents', '&lt;tag&gt;')).toBe('<tag>'));
  it('decodes &nbsp;',   () => expect(run('ents', 'a&nbsp;b')).toBe('a b'));
  it('decodes &#65;',    () => expect(run('ents', '&#65;')).toBe('A'));
});

describe('fnref: strip footnote refs', () => {
  it('strips [^1]',    () => expect(run('fnref', 'text[^1] more')).not.toContain('[^'));
  it('keeps text',     () => expect(run('fnref', 'text[^1] more')).toContain('text'));
  it('strips [^abc]',  () => expect(run('fnref', 'text[^abc]')).not.toContain('[^'));
});

describe('cit: strip citation brackets', () => {
  it('strips [1]',     () => expect(run('cit', 'study [1] shows')).not.toContain('[1]'));
  it('strips [1,2]',   () => expect(run('cit', 'study [1,2] shows')).not.toContain('[1'));
  it('keeps text',     () => expect(run('cit', 'study [1] shows')).toContain('study'));
});

// ── CLEAN ─────────────────────────────────────────────────────────────────────

describe('ell: collapse ...', () => {
  it('converts ... to …',  () => expect(run('ell', 'wait...')).toBe('wait…'));
  it('leaves … alone',     () => expect(run('ell', 'wait…')).toBe('wait…'));
});

describe('isp: collapse internal double-spaces', () => {
  it('collapses double space',          () => expect(run('isp', 'word  word')).toBe('word word'));
  it('preserves indented line',         () => expect(run('isp', '    return  x')).toBe('    return  x'));
  it('preserves tab-indented line',     () => expect(run('isp', '\treturn  x')).toBe('\treturn  x'));
  it('fence guard: keeps in code',      () => expect(run('isp', '```\nreturn  x\n```')).toContain('return  x'));
});

describe('seps: strip separator lines', () => {
  it('strips ---',  () => expect(run('seps', 'text\n---\nmore')).not.toContain('---'));
  it('strips ===',  () => expect(run('seps', 'text\n===\nmore')).not.toContain('==='));
  it('strips ___',  () => expect(run('seps', '___')).toBe(''));
  it('keeps text',  () => { const r=run('seps','text\n---\nmore'); expect(r).toContain('text'); expect(r).toContain('more'); });
});

describe('blk: collapse blank lines', () => {
  it('collapses 3+ to 2',  () => expect(run('blk', 'a\n\n\n\nb')).not.toContain('\n\n\n'));
  it('keeps single blank', () => expect(run('blk', 'a\n\nb')).toBe('a\n\nb'));
});

describe('trail: trim trailing spaces', () => {
  it('removes trailing spaces',  () => expect(run('trail', 'hello   ')).toBe('hello'));
  it('removes trailing tabs',    () => expect(run('trail', 'hello\t')).toBe('hello'));
  it('trims each line',          () => expect(/ $/.test(run('trail', 'a  \nb  '))).toBe(false));
});
