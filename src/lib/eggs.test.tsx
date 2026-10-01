import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { en } from "../content/en";
import { vi } from "../content/vi";
import { createWordMatcher, discover, EGG_IDS, SECRET_WORD, useEggs } from "./eggs";

describe("createWordMatcher", () => {
  it("fires on the key that completes the word, case-insensitively", () => {
    const matches = createWordMatcher(SECRET_WORD);
    const results = [..."xxNgOcAnH"].map(matches);
    expect(results.at(-1)).toBe(true);
    expect(results.slice(0, -1).every((hit) => !hit)).toBe(true);
  });

  it("ignores modifier keys mid-word and restarts cleanly after a typo", () => {
    const matches = createWordMatcher("abc");
    expect(["a", "Shift", "b", "c"].map(matches).at(-1)).toBe(true);
    expect(["a", "x", "b", "c"].map(matches).at(-1)).toBe(false);
  });
});

describe("discover", () => {
  it("counts each egg once", () => {
    function FoundCount() {
      return <span>{useEggs().found.size}</span>;
    }
    discover("pluck");
    discover("pluck");
    expect(renderToString(<FoundCount />)).toBe("<span>1</span>");
  });
});

describe("egg copy", () => {
  it.each([
    ["vi", vi],
    ["en", en],
  ])("%s hint names the secret count through {count}", (_, content) => {
    expect(content.eggs.hint).toContain("{count}");
    expect(Object.keys(content.eggs.messages)).toEqual([...EGG_IDS]);
  });
});
