// Rough token estimate for the streaming TPS badge.
//
// The previous chars/4 heuristic is calibrated for ASCII (~4 chars/token) but
// under-counts CJK by ~4-5x: one CJK character is ~1 token in modern
// multilingual BPEs (GPT o200k, DeepSeek-V3, GLM-4). CJK code points count as
// ~1 token here; other characters keep the ~4 chars/token rule.
import type {
  AssistantContentBlock,
  TextContent,
  ThinkingContent,
  ToolCallContent,
} from "./types";

// CJK symbols/punctuation (3000-30FF), Ext A + Unified (3400-9FFF),
// compatibility ideographs (F900-FAFF), Ext B+ (20000-2FA1F), Hangul (AC00-D7AF).
const CJK_PATTERN = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}\uac00-\ud7af]/u;

export function estimateTokens(text: string): number {
  let cjk = 0;
  let rest = 0;
  for (const ch of text) {
    if (CJK_PATTERN.test(ch)) cjk++;
    else rest++;
  }
  return cjk + rest / 4;
}

export function estimateContentTokens(blocks: AssistantContentBlock[]): number {
  let tokens = 0;
  for (const b of blocks) {
    if (b.type === "text") tokens += estimateTokens((b as TextContent).text ?? "");
    else if (b.type === "thinking") tokens += estimateTokens((b as ThinkingContent).thinking ?? "");
    else if (b.type === "toolCall") tokens += estimateTokens(JSON.stringify((b as ToolCallContent).input ?? {}));
  }
  return tokens;
}
