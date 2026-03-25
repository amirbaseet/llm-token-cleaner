/**
 * Applies `fn` only to text segments that lie outside triple-backtick fences.
 *
 * Handles:
 *   - Trailing spaces after lang tag:  ```python   \n
 *   - 4+ backtick fences:              ````
 *   - Unclosed fences:                 consumed to end-of-string
 *   - Nested fence lengths:            ```` only closed by ````
 */
export declare function outside(text: string, fn: (segment: string) => string): string;
//# sourceMappingURL=fence.d.ts.map