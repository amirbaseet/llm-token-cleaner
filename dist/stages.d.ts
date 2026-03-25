import type { Stage } from './types.js';
/**
 * All pipeline stages in execution order.
 * Order is load-bearing:
 *   1. HOT   — strip expensive Unicode first (affects later whitespace stages)
 *   2. STRUCT — structural markdown/HTML (after Unicode, before cosmetic cleanup)
 *   3. CLEAN  — cosmetic whitespace (last, so earlier stages don't introduce new noise)
 */
export declare const STAGES: readonly Stage[];
export declare const STAGE_IDS: import("./types.js").StageId[];
//# sourceMappingURL=stages.d.ts.map