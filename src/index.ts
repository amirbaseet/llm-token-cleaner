// Public API — everything a consumer needs
export { clean, cleanText, stream } from './pipeline.js';
export { estimateTokens }           from './tokens.js';
export { STAGES, STAGE_IDS }        from './stages.js';
export { PRESETS }                  from './presets.js';

// Types
export type {
  StageId,
  StageCategory,
  Stage,
  PresetName,
  StageStat,
  CleanResult,
  CleanOptions,
  StreamCleaner,
} from './types.js';
