import { describe, expect, it } from "vitest";
import { describeStartupError } from "./startupError";

describe("describeStartupError", () => {
  it.each([
    ["an Error", new Error("chunk failed"), "chunk failed"],
    ["a plain object with a message", { message: "plain object" }, "plain object"],
    ["a thrown string", "boom", "boom"],
  ])("reads %s by shape", (_, thrown, detail) => {
    const text = describeStartupError(thrown);
    expect(text).toContain(detail);
    expect(text).toContain("Trang chưa tải được");
    expect(text).toContain("The page failed to load");
    expect(text).not.toContain("[object Object]");
  });
});
