import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { en } from "../content/en";
import { vi } from "../content/vi";
import { createWordMatcher, discover, EGG_IDS, SECRET_WORD, useEggs } from "./eggs";

describe("createWordMatcher", () => {
  it("counts the letters of the word typed so far and completes case-insensitively", () => {
    const matches = createWordMatcher(SECRET_WORD);
    const results = [..."xxNgOcAnH"].map(matches);
    expect(results).toEqual([0, 0, 1, 2, 3, 4, 5, 6, 7]);
    expect(results.at(-1)).toBe(SECRET_WORD.length);
  });

  it("ignores non-letters and restarts cleanly after a typo", () => {
    const matches = createWordMatcher("abc");
    expect(["a", "Shift", "b", "c"].map(matches)).toEqual([1, null, 2, 3]);
    expect(["a", "x", "b", "c"].map(matches)).toEqual([1, 0, 0, 0]);
    expect(["a", "a", "b", "c"].map(matches)).toEqual([1, 1, 2, 3]);
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
