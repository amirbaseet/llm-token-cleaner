/**
 * Applies `fn` only to text segments that lie outside triple-backtick fences.
 *
 * Handles:
 *   - Trailing spaces after lang tag:  ```python   \n
 *   - 4+ backtick fences:              ````
 *   - Unclosed fences:                 consumed to end-of-string
 *   - Nested fence lengths:            ```` only closed by ````
 */
export function outside(text, fn) {
    // Capture group 1 = the opening backtick run, so \1 matches the same length closer
    const FENCE = /^(`{3,})[ \t]*\w*[ \t]*\n[\s\S]*?(?:\n\1[ \t]*(?=\n|$)|$)/gm;
    const parts = [];
    let last = 0;
    let m;
    while ((m = FENCE.exec(text)) !== null) {
        parts.push([false, text.slice(last, m.index)]);
        parts.push([true, m[0]]);
        last = m.index + m[0].length;
    }
    parts.push([false, text.slice(last)]);
    return parts.map(([fenced, value]) => (fenced ? value : fn(value))).join('');
}
//# sourceMappingURL=fence.js.map