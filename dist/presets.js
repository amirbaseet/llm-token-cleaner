import { STAGE_IDS } from './stages.js';
const all = (on) => Object.fromEntries(STAGE_IDS.map(id => [id, on]));
const except = (disabled) => Object.fromEntries(STAGE_IDS.map(id => [id, !disabled.includes(id)]));
/**
 * reprompt    — all stages on. Maximum compression for LLM-to-LLM chaining.
 * human       — Unicode noise stripped, all markdown structure preserved.
 * codesafe    — everything except code fence and inline-code stripping.
 */
export const PRESETS = {
    reprompt: all(true),
    human: except(['hdr', 'emph', 'fences', 'icode', 'links', 'tables', 'lists', 'fnref', 'cit']),
    codesafe: except(['fences', 'icode']),
};
//# sourceMappingURL=presets.js.map