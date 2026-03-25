/**
 * Fast token estimator — no external deps, no async.
 *
 * Algorithm:
 *   - Each non-ASCII codepoint ≈ 1 token (BPE rarely merges them)
 *   - ASCII chars ≈ 4 chars per token (GPT-2 / cl100k empirical average)
 *
 * Accuracy: within ~8% of cl100k_base on typical LLM output.
 * For exact counts, swap in gpt-tokenizer or tiktoken and replace this function.
 */
export declare function estimateTokens(text: string): number;
//# sourceMappingURL=tokens.d.ts.map