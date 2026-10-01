import { Fragment } from "react";
import { splitEmphasis, splitWords } from "../content/locale";

const graphemes = new Intl.Segmenter("vi", { granularity: "grapheme" });

function toGraphemes(word: string): string[] {
  return Array.from(graphemes.segment(word.normalize("NFC")), (s) => s.segment);
}

/** Inline text with *emphasis* rendered as <em>. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {splitEmphasis(text).map((run) =>
        run.isEmphasis ? <em key={`e:${run.text}`}>{run.text}</em> : run.text,
      )}
    </>
  );
}

/**
 * One span per character (`.char`) inside one span per word (`.word`), for
 * letter-by-letter reveals. Screen readers get the plain text once.
 */
export function Chars({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: splits of fixed text never reorder; the same word can repeat
          <Fragment key={wordIndex}>
            {/* The space sits between words: inside an inline-block it would collapse. */}
            {wordIndex > 0 ? " " : null}
            <span className="word">
              {toGraphemes(word).map((char, charIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: as above, per character
                <span className="char" key={charIndex}>
                  {char}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}

/** One span per word (`.w`; emphasised words also carry `.em`) for scrubbed reading reveals. */
export function Words({ text }: { text: string }) {
  return (
    <>
      {splitWords(text).map(({ word, isEmphasis, hasSpaceBefore }, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: splits of fixed text never reorder; the same word can repeat
        <Fragment key={index}>
          {hasSpaceBefore ? " " : null}
          <span className={isEmphasis ? "w em" : "w"}>{word}</span>
        </Fragment>
      ))}
    </>
  );
}
