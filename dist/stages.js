import { outside } from './fence.js';
/** Apply fn guarded by fence — convenience wrapper */
const g = (fn) => (t) => outside(t, fn);
/**
 * All pipeline stages in execution order.
 * Order is load-bearing:
 *   1. HOT   — strip expensive Unicode first (affects later whitespace stages)
 *   2. STRUCT — structural markdown/HTML (after Unicode, before cosmetic cleanup)
 *   3. CLEAN  — cosmetic whitespace (last, so earlier stages don't introduce new noise)
 */
export const STAGES = [
    // ── HOT: expensive non-ASCII ─────────────────────────────────────────────
    {
        id: 'box', label: 'box-drawing', category: 'hot', fenceGuard: false,
        fn: t => t
            .replace(/[\u2500-\u257F\u2580-\u259F]/g, '')
            .replace(/[ \t]{2,}/g, ' '),
    },
    {
        id: 'emoji', label: 'emoji', category: 'hot', fenceGuard: false,
        fn: t => {
            try {
                return t.replace(/\p{Extended_Pictographic}/gu, '');
            }
            catch {
                return t.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '');
            }
        },
    },
    {
        id: 'geo', label: 'unicode symbols', category: 'hot', fenceGuard: false,
        fn: t => t
            .replace(/[\u25A0-\u25FF]/g, '-')
            .replace(/[\u2190-\u21FF\u2900-\u297F]/g, '->')
            .replace(/[\u2700-\u27BF\u2600-\u26FF]/g, ''),
    },
    {
        id: 'zero', label: 'zero-width chars', category: 'hot', fenceGuard: false,
        fn: t => t.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, ''),
    },
    // ── STRUCT: markdown & HTML ──────────────────────────────────────────────
    {
        id: 'hdr', label: 'md headers', category: 'struct', fenceGuard: true,
        fn: g(t => t.replace(/^#{1,6} +/gm, '')),
    },
    {
        id: 'emph', label: 'md emphasis', category: 'struct', fenceGuard: true,
        fn: g(t => t
            .replace(/\*{3}([^*\n]{1,500})\*{3}/g, '$1')
            .replace(/_{3}([^_\n]{1,500})_{3}/g, '$1')
            .replace(/\*{2}([^*\n]{1,500})\*{2}/g, '$1')
            .replace(/_{2}([^_\n]{1,500})_{2}/g, '$1')
            .replace(/\*([^*\s][^*\n]{0,498}[^*\s]|\S)\*/g, '$1')
            .replace(/_([^_\s][^_\n]{0,498}[^_\s]|\S)_/g, '$1')),
    },
    {
        // fenceGuard: false — this stage removes the fences themselves
        id: 'fences', label: 'code fences', category: 'struct', fenceGuard: false,
        fn: t => t
            .replace(/^`{3,}[ \t]*\w*[ \t]*\n?/gm, '')
            .replace(/^`{3,}[ \t]*$/gm, ''),
    },
    {
        id: 'icode', label: 'inline code', category: 'struct', fenceGuard: true,
        fn: g(t => t.replace(/`([^`\n]{1,200})`/g, '$1')),
    },
    {
        id: 'links', label: 'links → label(url)', category: 'struct', fenceGuard: true,
        // Preserves URL — silent data loss is worse than a few extra tokens
        fn: g(t => t.replace(/\[([^\]]{1,200})\]\(([^)]{1,500})\)/g, '$1 ($2)')),
    },
    {
        id: 'tables', label: 'pipe tables → csv', category: 'struct', fenceGuard: true,
        // Requires 2+ consecutive pipe-lines before treating as a table.
        // \n? on the last line handles tables at end-of-string with no trailing newline.
        fn: g(t => t.replace(/((?:^\|.+\|\s*\n)*(?:^\|.+\|\s*))/gm, (block) => {
            // Reject if fewer than 2 pipe-lines
            const lineCount = (block.match(/^\|/gm) ?? []).length;
            if (lineCount < 2)
                return block;
            const rows = block.split('\n').filter(Boolean).map(line => {
                // Drop separator rows: | :--- | :---: | etc.
                if (/^\s*\|[\s|:\-]+\|\s*$/.test(line))
                    return null;
                return line.split('|').slice(1, -1).map(c => c.trim()).filter(Boolean).join(',');
            }).filter((r) => r !== null);
            return rows.join('\n') + '\n';
        })),
    },
    {
        id: 'lists', label: 'list markers', category: 'struct', fenceGuard: true,
        fn: g(t => t.replace(/^(\s*)(?:[-*+]|\d+\.) +/gm, '$1')),
    },
    {
        id: 'html', label: 'html tags', category: 'struct', fenceGuard: true,
        fn: g(t => t.replace(/<[^>]{1,300}>/g, '')),
    },
    {
        id: 'ents', label: 'html entities', category: 'struct', fenceGuard: false,
        fn: t => t
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
            .replace(/&[a-z]{2,8};/g, ''),
    },
    {
        id: 'fnref', label: 'footnote refs', category: 'struct', fenceGuard: true,
        fn: g(t => t.replace(/\[\^[^\]]{1,50}\](?::[^\n]*)?\n?/g, '')),
    },
    {
        id: 'cit', label: 'citation brackets', category: 'struct', fenceGuard: true,
        fn: g(t => t.replace(/\[\d+(?:[,\s]*\d+)*\]/g, '')),
    },
    // ── CLEAN: cosmetic whitespace & punctuation ─────────────────────────────
    {
        id: 'ell', label: '... → …', category: 'clean', fenceGuard: false,
        fn: t => t.replace(/\.{3}/g, '…'),
    },
    {
        id: 'isp', label: 'internal spaces', category: 'clean', fenceGuard: true,
        // Only collapse double-spaces on lines that don't start with whitespace
        // (indented code, continuation lines must not be touched)
        fn: g(t => t
            .split('\n')
            .map(line => /^[ \t]/.test(line) ? line : line.replace(/([^\s]) {2,}([^\s])/g, '$1 $2'))
            .join('\n')),
    },
    {
        id: 'seps', label: 'separators', category: 'clean', fenceGuard: false,
        fn: t => t.replace(/^[-=_*]{3,}\s*$/gm, ''),
    },
    {
        id: 'blk', label: 'blank lines', category: 'clean', fenceGuard: false,
        fn: t => t.replace(/\n{3,}/g, '\n\n'),
    },
    {
        id: 'trail', label: 'trailing spaces', category: 'clean', fenceGuard: false,
        fn: t => t.replace(/[ \t]+$/gm, '').trim(),
    },
];
export const STAGE_IDS = STAGES.map(s => s.id);
//# sourceMappingURL=stages.js.map