import { STAGE_IDS } from './stages.js';
import type { PresetName, StageId } from './types.js';

export type StageMap = Record<StageId, boolean>;

const all = (on: boolean): StageMap =>
  Object.fromEntries(STAGE_IDS.map(id => [id, on])) as StageMap;

const except = (disabled: StageId[]): StageMap =>
  Object.fromEntries(STAGE_IDS.map(id => [id, !disabled.includes(id)])) as StageMap;

/**
 * reprompt    — all stages on. Maximum compression for LLM-to-LLM chaining.
 * human       — Unicode noise stripped, all markdown structure preserved.
 * codesafe    — everything except code fence and inline-code stripping.
 */
export const PRESETS: Record<PresetName, StageMap> = {
  reprompt: all(true),
  human:    except(['hdr', 'emph', 'fences', 'icode', 'links', 'tables', 'lists', 'fnref', 'cit']),
  codesafe: except(['fences', 'icode']),
};
