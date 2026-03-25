import type { PresetName, StageId } from './types.js';
export type StageMap = Record<StageId, boolean>;
/**
 * reprompt    — all stages on. Maximum compression for LLM-to-LLM chaining.
 * human       — Unicode noise stripped, all markdown structure preserved.
 * codesafe    — everything except code fence and inline-code stripping.
 */
export declare const PRESETS: Record<PresetName, StageMap>;
//# sourceMappingURL=presets.d.ts.map