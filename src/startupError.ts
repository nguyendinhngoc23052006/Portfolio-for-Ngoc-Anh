/**
 * Text shown when the app cannot start, so a broken deploy reads as a message
 * instead of a blank page. Errors are read by shape: a thrown value is not
 * always an Error.
 */
export function describeStartupError(error: unknown): string {
  const detail =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : String(error);
  return [
    "Trang chưa tải được. Vui lòng tải lại trang.",
    "The page failed to load. Please refresh.",
    "",
    detail,
  ].join("\n");
}
