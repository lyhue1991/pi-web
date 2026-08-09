import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estimateTokens, estimateContentTokens } from "./token-estimate.ts";

describe("estimateTokens", () => {
  it("counts CJK characters as ~1 token each (not /4)", () => {
    assert.equal(estimateTokens("今天天气很好"), 6);
  });

  it("keeps the ~4 chars/token rule for ASCII", () => {
    assert.equal(estimateTokens("abcdefgh"), 2);
  });

  it("mixes CJK and ASCII", () => {
    assert.equal(estimateTokens("你好世界abcd"), 5);
  });

  it("returns 0 for empty input", () => {
    assert.equal(estimateTokens(""), 0);
  });
});

describe("estimateContentTokens", () => {
  it("sums tokens across text and thinking blocks", () => {
    const blocks = [
      { type: "text", text: "你好世界" },
      { type: "thinking", thinking: "abcd" },
    ];
    assert.equal(estimateContentTokens(blocks), 5);
  });

  it("serialises tool-call input and counts its CJK", () => {
    const blocks = [{ type: "toolCall", input: { msg: "你好" } }];
    // {"msg":"你好"} -> 2 CJK (2) + 10 ASCII (2.5) = 4.5
    assert.equal(estimateContentTokens(blocks), 4.5);
  });
});
