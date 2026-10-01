import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { en } from "./en";
import { profile } from "./profile";
import { vi } from "./vi";

/** Structure of a content tree: keys, array lengths and leaf types, not the words. */
function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shapeOf);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, shapeOf(child)]),
    );
  }
  return typeof value;
}

function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((child, i) => leaves(child, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`));
  }
  return [];
}

describe("content", () => {
  it("English mirrors the Vietnamese source key for key and item for item", () => {
    expect(shapeOf(en)).toEqual(shapeOf(vi));
  });

  it.each([
    ["vi", vi],
    ["en", en],
  ])("%s has no empty strings and no unpaired *emphasis* markers", (_, content) => {
    for (const [path, text] of leaves(content)) {
      expect(text.trim(), path).not.toBe("");
      expect((text.match(/\*/g) ?? []).length % 2, path).toBe(0);
    }
  });

  it("labels every design statistic", () => {
    const design = profile.journey.find((fact) => fact.id === "design");
    expect(design?.stats.length).toBe(vi.journey.designStats.length);
  });

  it("keeps index.html's title and description in step with vi.ts", () => {
    // Crawlers and link previews read index.html before any script runs.
    const occurrences = (needle: string) => indexHtml.split(needle).length - 1;
    expect(
      occurrences(`content="${vi.meta.title}"`) + occurrences(`<title>${vi.meta.title}</title>`),
    ).toBe(2);
    expect(occurrences(`content="${vi.meta.description}"`)).toBe(2);
  });
});
