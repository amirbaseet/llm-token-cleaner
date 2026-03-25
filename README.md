# llm-token-cleaner

Strip LLM output noise to minimize token count before re-prompting.

Removes box-drawing chars, emoji, markdown syntax, HTML, footnotes, citations and more — with configurable presets and a streaming API for real-time pipelines.

## Install

```bash
npm install llm-token-cleaner
```

## Quick start

```ts
import { clean, stream } from 'llm-token-cleaner';

// One-shot
const { text, tokensIn, tokensOut, pct } = clean(rawLLMOutput, { preset: 'reprompt' });
console.log(`Saved ${pct}% — ${tokensIn} → ${tokensOut} tokens`);

// Streaming
const cleaner = stream({ preset: 'reprompt' });
for await (const chunk of llmStream) {
  process.stdout.write(cleaner.push(chunk));
}
process.stdout.write(cleaner.flush());
```

## Presets

| Preset | What it does |
|---|---|
| `reprompt` | All stages on. Maximum compression for LLM-to-LLM chaining. |
| `human` | Strips Unicode noise only. Keeps all markdown structure. |
| `codesafe` | Strips everything except code fences and inline backticks. |

## Pipeline stages

Stages run in order. Each can be toggled independently.

### HOT — expensive Unicode
| Stage | Removes |
|---|---|
| `box` | Box-drawing chars `┌─┬┐│├┤└┴┘` |
| `emoji` | All emoji via `Extended_Pictographic` |
| `geo` | Geometric shapes, arrows, dingbats |
| `zero` | Zero-width chars, BOM, soft-hyphen |

### STRUCT — markdown & HTML
| Stage | Removes |
|---|---|
| `hdr` | `# ## ### ...` header markers |
| `emph` | `**bold**`, `*italic*`, `__`, `_` |
| `fences` | ` ``` ` opening/closing markers |
| `icode` | `` `inline code` `` backticks |
| `links` | `[label](url)` → `label (url)` |
| `tables` | Pipe tables → CSV (requires 2+ rows) |
| `lists` | `- `, `* `, `1. ` list markers |
| `html` | `<br>`, `<strong>`, any `<tag>` |
| `ents` | `&amp;`, `&lt;`, `&#65;`, etc. |
| `fnref` | `[^1]` footnote references |
| `cit` | `[1]`, `[1,2]` citation brackets |

### CLEAN — cosmetic whitespace
| Stage | Removes |
|---|---|
| `ell` | `...` → `…` (3 tokens → 1) |
| `isp` | Double spaces inside lines (skips indented lines) |
| `seps` | `---`, `===`, `___` separator lines |
| `blk` | 3+ consecutive blank lines → 2 |
| `trail` | Trailing spaces per line |

All `STRUCT` stages respect triple-backtick fences — content inside code blocks is never touched.

## Custom configuration

```ts
import { clean } from 'llm-token-cleaner';

// Disable specific stages from a preset
const { text } = clean(input, {
  preset: 'reprompt',
  stages: {
    fences: false,  // keep code fence markers
    links: false,   // keep [label](url) intact
  },
});
```

## Token stats

```ts
const { text, tokensIn, tokensOut, saved, pct, stats } = clean(input);

// Per-stage breakdown (only stages with savings > 0)
for (const s of stats) {
  console.log(`${s.id}: -${s.saved} tokens`);
}
```

## Streaming API

The `stream()` cleaner buffers incoming chunks and only emits complete lines — it never splits a line mid-regex. At most one partial line is held back at any time.

```ts
import { stream } from 'llm-token-cleaner';

const cleaner = stream({ preset: 'reprompt' });

// In an async OpenAI/Anthropic stream:
for await (const chunk of response) {
  const delta = chunk.choices[0]?.delta?.content ?? '';
  process.stdout.write(cleaner.push(delta));
}
process.stdout.write(cleaner.flush());

// Reuse the same instance for multiple requests:
cleaner.reset();
```

## API reference

```ts
clean(text: string, options?: CleanOptions): CleanResult
cleanText(text: string, options?: CleanOptions): string
stream(options?: CleanOptions): StreamCleaner
estimateTokens(text: string): number

interface CleanOptions {
  preset?: 'reprompt' | 'human' | 'codesafe';   // default: 'reprompt'
  stages?: Partial<Record<StageId, boolean>>;     // overrides preset per-stage
}

interface CleanResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  saved: number;
  pct: number;          // 0–100
  stats: StageStat[];   // only enabled stages with savings > 0
}

interface StreamCleaner {
  push(chunk: string): string;
  flush(): string;
  reset(): void;
}
```

## License

MIT
