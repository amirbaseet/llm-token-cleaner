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
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let nonAscii = 0;
  let ascii = 0;
  for (const char of text) {
    // codePointAt(0) is safe for surrogate pairs (emoji etc.)
    (char.codePointAt(0)! > 127 ? nonAscii++ : ascii++);
  }
  return nonAscii + Math.ceil(ascii / 4);
}
