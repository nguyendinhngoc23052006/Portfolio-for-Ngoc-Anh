import { describe, expect, it } from "vitest";
import { localeHomePath, otherLocale, resolveLocale, splitEmphasis, splitWords } from "./locale";
import { formatPeriod, toTelHref } from "./profile";

describe("resolveLocale", () => {
  it.each([
    ["/", "vi"],
    ["/en", "en"],
    ["/en/", "en"],
    ["/EN", "en"],
    ["/english", "vi"],
    ["/vi", "vi"],
  ])("%s → %s", (path, locale) => {
    expect(resolveLocale(path)).toBe(locale);
  });

  it("round-trips through the switcher links", () => {
    expect(resolveLocale(localeHomePath(otherLocale("vi")))).toBe("en");
    expect(resolveLocale(localeHomePath(otherLocale("en")))).toBe("vi");
  });
});

describe("splitEmphasis", () => {
  it("separates *marked* phrases", () => {
    expect(splitEmphasis("a *b c* d")).toEqual([
      { text: "a ", isEmphasis: false },
      { text: "b c", isEmphasis: true },
      { text: " d", isEmphasis: false },
    ]);
  });

  it("leaves an unpaired asterisk as text", () => {
    expect(splitEmphasis("5 * 3")).toEqual([{ text: "5 * 3", isEmphasis: false }]);
  });
});

describe("splitWords", () => {
  it("keeps punctuation attached to the word before it", () => {
    const tokens = splitWords("ba điều: *rõ ràng*, *hiệu quả* và xong.");
    const rebuilt = tokens.map((t) => (t.hasSpaceBefore ? " " : "") + t.word).join("");
    expect(rebuilt).toBe("ba điều: rõ ràng, hiệu quả và xong.");
    expect(tokens.find((t) => t.word === ",")?.hasSpaceBefore).toBe(false);
    expect(tokens.filter((t) => t.isEmphasis).map((t) => t.word)).toEqual([
      "rõ",
      "ràng",
      "hiệu",
      "quả",
    ]);
  });
});

describe("profile helpers", () => {
  it("builds a dialable tel: link", () => {
    expect(toTelHref("+84 399 655 339")).toBe("tel:+84399655339");
  });

  it("formats open and closed periods", () => {
    expect(formatPeriod("2022", null, "Nay")).toBe("2022 — Nay");
    expect(formatPeriod("05/2026", "08/2026", "Present")).toBe("05/2026 — 08/2026");
  });
});
