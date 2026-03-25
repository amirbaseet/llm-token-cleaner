/** Unique identifier for each pipeline stage */
export type StageId =
  | 'box' | 'emoji' | 'geo' | 'zero'
  | 'hdr' | 'emph' | 'fences' | 'icode' | 'links' | 'tables' | 'lists' | 'html' | 'ents' | 'fnref' | 'cit'
  | 'ell' | 'isp' | 'seps' | 'blk' | 'trail';

/** Which noise category a stage belongs to */
export type StageCategory = 'hot' | 'struct' | 'clean';

/** A single pipeline stage descriptor */
export interface Stage {
  readonly id: StageId;
  readonly label: string;
  readonly category: StageCategory;
  /** If true, the stage fn is only applied outside triple-backtick fences */
  readonly fenceGuard: boolean;
  readonly fn: (text: string) => string;
}

/** Named presets that configure which stages are enabled */
export type PresetName = 'reprompt' | 'human' | 'codesafe';

/** Per-stage savings breakdown */
export interface StageStat {
  readonly id: StageId;
  readonly saved: number;
}

/** Result of a clean() call */
export interface CleanResult {
  /** The cleaned text */
  readonly text: string;
  /** Estimated token count of the input */
  readonly tokensIn: number;
  /** Estimated token count of the output */
  readonly tokensOut: number;
  /** Tokens saved = tokensIn - tokensOut */
  readonly saved: number;
  /** Percentage reduction, 0-100 */
  readonly pct: number;
  /** Per-stage breakdown — only stages that were enabled and saved > 0 */
  readonly stats: readonly StageStat[];
}

/** Options for clean() and StreamCleaner */
export interface CleanOptions {
  /** Named preset. Overridden by stages if both provided. Default: 'reprompt' */
  preset?: PresetName;
  /** Explicit per-stage enable map. Partial — unspecified stages inherit the preset value. */
  stages?: Partial<Record<StageId, boolean>>;
  /**
   * Custom token counter. Defaults to the built-in char-estimate (~8% error vs cl100k).
   * Swap in gpt-tokenizer or tiktoken for exact counts:
   *
   * @example
   * import { encode } from 'gpt-tokenizer';
   * clean(text, { tokenizer: t => encode(t).length });
   *
   * @example
   * import { get_encoding } from '@dqbd/tiktoken';
   * const enc = get_encoding('cl100k_base');
   * clean(text, { tokenizer: t => { const r = enc.encode(t).length; return r; } });
   */
  tokenizer?: (text: string) => number;
}

/** Stateful streaming cleaner — buffers chunks and applies the pipeline safely */
export interface StreamCleaner {
  /**
   * Push a chunk from a streaming LLM response.
   * Returns the cleaned text that is safe to emit now
   * (holds back content that might be mid-fence or mid-pattern).
   */
  push(chunk: string): string;
  /**
   * Signal end of stream. Flushes and cleans the remaining buffer.
   */
  flush(): string;
  /** Reset internal buffer — reuse the same instance for a new stream */
  reset(): void;
}
