import { en } from "./en";
import type { Content, Locale } from "./types";
import { vi } from "./vi";

const CONTENT: Record<Locale, Content> = { vi, en };

export function resolveLocale(pathname: string): Locale {
  return /^\/en(\/|$)/i.test(pathname) ? "en" : "vi";
}

export function getContent(locale: Locale): Content {
  return CONTENT[locale];
}

export function localeHomePath(locale: Locale): string {
  return locale === "en" ? "/en" : "/";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "vi" : "en";
}

export interface TextRun {
  text: string;
  isEmphasis: boolean;
}

/** "a *b* c" → [a, b (emphasis), c]. Unpaired asterisks stay literal. */
export function splitEmphasis(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /\*([^*]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor)
      runs.push({ text: text.slice(cursor, match.index), isEmphasis: false });
    runs.push({ text: match[1] ?? "", isEmphasis: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), isEmphasis: false });
  return runs;
}

export interface WordToken {
  word: string;
  isEmphasis: boolean;
  /** Only true where the source had whitespace, so "rõ ràng*," keeps its comma attached. */
  hasSpaceBefore: boolean;
}

export function splitWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  let hasPendingSpace = false;
  for (const run of splitEmphasis(text)) {
    for (const part of run.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        hasPendingSpace = true;
        continue;
      }
      tokens.push({
        word: part,
        isEmphasis: run.isEmphasis,
        hasSpaceBefore: hasPendingSpace && tokens.length > 0,
      });
      hasPendingSpace = false;
    }
  }
  return tokens;
}
