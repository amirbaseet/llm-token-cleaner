import type { CleanOptions, CleanResult, StreamCleaner } from './types.js';
/**
 * Run the full pipeline on a complete string.
 *
 * @example
 * const { text, pct } = clean(rawLLMOutput, { preset: 'reprompt' });
 * console.log(`Saved ${pct}%`);
 */
export declare function clean(text: string, options?: CleanOptions): CleanResult;
/**
 * Convenience helper — returns only the cleaned text.
 * Use clean() if you need token stats.
 */
export declare function cleanText(text: string, options?: CleanOptions): string;
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
export declare function stream(options?: CleanOptions): StreamCleaner;
//# sourceMappingURL=pipeline.d.ts.map