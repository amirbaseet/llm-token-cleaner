import { STAGES, STAGE_IDS } from './stages.js';
import { PRESETS } from './presets.js';
import { estimateTokens } from './tokens.js';
/** Build the resolved stage enable-map from CleanOptions */
function resolveConfig(options = {}) {
    const base = PRESETS[options.preset ?? 'reprompt'];
    if (!options.stages)
        return base;
    const merged = { ...base };
    for (const [id, enabled] of Object.entries(options.stages)) {
        if (STAGE_IDS.includes(id)) {
            merged[id] = enabled ?? false;
        }
    }
    return merged;
}
/**
 * Run the full pipeline on a complete string.
 *
 * @example
 * const { text, pct } = clean(rawLLMOutput, { preset: 'reprompt' });
 * console.log(`Saved ${pct}%`);
 */
export function clean(text, options = {}) {
    const cfg = resolveConfig(options);
    let cur = text;
    let prev = estimateTokens(text);
    const stats = [];
    for (const stage of STAGES) {
        if (cfg[stage.id])
            cur = stage.fn(cur);
        const now = estimateTokens(cur);
        const saved = prev - now;
        if (cfg[stage.id] && saved > 0)
            stats.push({ id: stage.id, saved });
        prev = now;
    }
    const tokensIn = estimateTokens(text);
    const tokensOut = prev;
    const saved = tokensIn - tokensOut;
    const pct = tokensIn > 0 ? Math.round((saved / tokensIn) * 100) : 0;
    return { text: cur, tokensIn, tokensOut, saved, pct, stats };
}
/**
 * Convenience helper — returns only the cleaned text.
 * Use clean() if you need token stats.
 */
export function cleanText(text, options = {}) {
    return clean(text, options).text;
}
/**
 * Create a stateful streaming cleaner.
 *
 * Buffers incoming chunks and flushes only when it's safe to do so —
 * i.e., the buffer does not end mid-fence and does not end mid-pattern
 * that a stage regex could corrupt if split across chunks.
 *
 * @example
 * const cleaner = stream({ preset: 'reprompt' });
 * for await (const chunk of llmStream) {
 *   process.stdout.write(cleaner.push(chunk));
 * }
 * process.stdout.write(cleaner.flush());
 */
export function stream(options = {}) {
    const cfg = resolveConfig(options);
    let buf = '';
    /**
     * A chunk is "safe to flush up to" the last newline.
     * We never flush mid-line because:
     *   - Fence guards require complete lines to detect opening/closing ```
     *   - Most stage regexes are line-anchored (^, $, /gm)
     *
     * This means at most one partial line is held back at any time —
     * worst case ~200 chars, which is negligible.
     */
    function safeFlush(final) {
        if (!buf)
            return '';
        if (final) {
            const result = applyAll(buf);
            buf = '';
            return result;
        }
        const lastNewline = buf.lastIndexOf('\n');
        if (lastNewline === -1)
            return ''; // no complete line yet
        const safe = buf.slice(0, lastNewline + 1);
        buf = buf.slice(lastNewline + 1);
        return applyAll(safe);
    }
    function applyAll(text) {
        let cur = text;
        for (const stage of STAGES) {
            if (cfg[stage.id])
                cur = stage.fn(cur);
        }
        return cur;
    }
    return {
        push(chunk) {
            buf += chunk;
            return safeFlush(false);
        },
        flush() {
            return safeFlush(true);
        },
        reset() {
            buf = '';
        },
    };
}
//# sourceMappingURL=pipeline.js.map