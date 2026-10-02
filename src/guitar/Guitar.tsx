import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ThreadAnchor } from "../components/ThreadAnchor";
import type { Content } from "../content/types";
import { discover } from "../lib/eggs";
import { setSoundOn, unlockAudio, useAudioState } from "../lib/sound";
import { sendToGuitar } from "./audio";
import {
  acrossOf,
  BRIDGE,
  createLayout,
  drawGuitar,
  fretAt,
  type Layout,
  NUT,
  nearestString,
  pickPositionAt,
  readPalette,
  scaleAt,
  toInstrument,
  zoneAt,
} from "./draw";
import { chordFret, Instrument, MAX_CAPO, noteName } from "./instrument";
import {
  CHORD_KEYS,
  CHORDS,
  keyLabel,
  OPEN_STRINGS,
  STRING_COUNT,
  stringIndexForNumber,
} from "./physics";
import "./guitar.css";

const STRING_NUMBERS = [1, 2, 3, 4, 5, 6] as const;
/** Holding still this long on the body rests the palm on the strings. */
const PALM_MS = 260;

interface Finger {
  zone: "neck" | "body";
  along: number;
  across: number;
  startAlong: number;
  startAcross: number;
  time: number;
  palmTimer?: number;
  isPalm: boolean;
}

/**
 * A playable guitar: a canvas for the strings and real buttons for everything
 * a keyboard or screen reader needs. All sound comes from the waveguide
 * strings in `physics.ts`, running on the audio thread.
 */
export function Guitar({ text }: { text: Content["hobby"]["guitar"] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instrumentRef = useRef<Instrument | null>(null);
  const [chordIndex, setChordIndex] = useState<number | null>(null);
  const [capo, setCapo] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const audio = useAudioState();
  const helpId = useId();
  const chord = chordIndex === null ? null : (CHORDS[chordIndex] ?? null);

  useEffect(() => {
    instrumentRef.current?.setChord(chord);
  }, [chord]);

  useEffect(() => {
    instrumentRef.current?.setCapo(capo);
  }, [capo]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !ctx) return;
    const instrument = new Instrument(sendToGuitar);
    instrumentRef.current = instrument;
    const palette = readPalette(document.documentElement);
    let layout: Layout = createLayout(1, 1, 1);

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      layout = createLayout(box.width, box.height, dpr);
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      root.dataset.layout = layout.isVertical ? "vertical" : "horizontal";
      drawGuitar(ctx, layout, instrument, palette);
    };
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);

    // Animate only while the guitar is on screen.
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      instrument.tick(Math.min(0.05, (now - last) / 1000));
      last = now;
      drawGuitar(ctx, layout, instrument, palette);
      frame = requestAnimationFrame(loop);
    };
    const watcher = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (!entry?.isIntersecting) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    });
    watcher.observe(canvas);

    const fingers = new Map<number, Finger>();
    let hover: { along: number; across: number; time: number } | null = null;

    const locate = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return toInstrument(layout, event.clientX - box.left, event.clientY - box.top);
    };

    /** Plucks every string the pick crossed between two points, in the order it crossed them. */
    const strum = (from: number, to: number, along: number, milliseconds: number) => {
      if (from === to) return;
      const direction = to > from ? 1 : -1;
      const speed = Math.abs(to - from) / Math.max(milliseconds, 4);
      const velocity = Math.min(1, 0.25 + speed * 0.35);
      const crossed = OPEN_STRINGS.map((_, string) => string)
        .filter((string) => {
          const y = acrossOf(layout, string);
          return direction > 0 ? y > from && y <= to : y < from && y >= to;
        })
        .sort((a, b) => direction * (acrossOf(layout, a) - acrossOf(layout, b)));
      // Sweeping most of the strings at once is a strum, and counts toward the four-chord loop.
      if (crossed.length >= 4 && instrument.recordStrum()) discover("progression");
      for (const string of crossed) {
        const share = Math.abs(acrossOf(layout, string) - from) / Math.abs(to - from);
        instrument.pluck(
          string,
          pickPositionAt(layout, along, instrument.fret(string)),
          velocity,
          direction,
          (share * milliseconds) / 1000,
        );
      }
    };

    const onDown = (event: PointerEvent) => {
      if (event.button > 0) return;
      const point = locate(event);
      const zone = zoneAt(layout, point.along);
      if (zone === "head") return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      const finger: Finger = {
        zone,
        ...point,
        startAlong: point.along,
        startAcross: point.across,
        time: event.timeStamp,
        isPalm: false,
      };
      const { string, distance } = nearestString(layout, point.across);
      if (zone === "neck") {
        // Pressing a fret hard enough sounds it: a hammer-on, so the neck alone plays melodies.
        instrument.press(event.pointerId, string, fretAt(scaleAt(layout, point.along)));
        instrument.pluck(string, 0.8, 0.42);
      } else {
        if (distance < layout.gap * 0.32) {
          instrument.pluck(
            string,
            pickPositionAt(layout, point.along, instrument.fret(string)),
            0.6,
          );
        }
        finger.palmTimer = window.setTimeout(() => {
          finger.isPalm = true;
          instrument.setPalm(true);
        }, PALM_MS);
      }
      fingers.set(event.pointerId, finger);
    };

    const onMove = (event: PointerEvent) => {
      const point = locate(event);
      const finger = fingers.get(event.pointerId);
      if (finger) {
        const travelled = Math.hypot(
          point.along - finger.startAlong,
          point.across - finger.startAcross,
        );
        if (travelled > 8 && finger.palmTimer !== undefined) {
          window.clearTimeout(finger.palmTimer);
          finger.palmTimer = undefined;
        }
        if (finger.zone === "neck") {
          // Dragging along the string slides the finger from fret to fret.
          if (zoneAt(layout, point.along) === "neck") {
            const pressed = nearestString(layout, finger.startAcross).string;
            instrument.press(event.pointerId, pressed, fretAt(scaleAt(layout, point.along)));
          }
        } else if (!finger.isPalm && zoneAt(layout, point.along) === "body") {
          strum(finger.across, point.across, point.along, event.timeStamp - finger.time);
        }
        finger.along = point.along;
        finger.across = point.across;
        finger.time = event.timeStamp;
        return;
      }
      if (event.pointerType === "touch") return;
      // A mouse needs no click to strum: sweeping across the strings plays them.
      if (
        hover &&
        zoneAt(layout, point.along) === "body" &&
        zoneAt(layout, hover.along) === "body"
      ) {
        strum(hover.across, point.across, point.along, event.timeStamp - hover.time);
      }
      hover = { ...point, time: event.timeStamp };
    };

    const onUp = (event: PointerEvent) => {
      hover = null;
      const finger = fingers.get(event.pointerId);
      if (!finger) return;
      fingers.delete(event.pointerId);
      window.clearTimeout(finger.palmTimer);
      if (finger.isPalm && ![...fingers.values()].some((other) => other.isPalm))
        instrument.setPalm(false);
      if (finger.zone === "neck") instrument.lift(event.pointerId);
    };

    const onLeave = () => {
      hover = null;
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    const onFullscreen = () => setIsFullscreen(document.fullscreenElement === root);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("fullscreenchange", onFullscreen);
    setCanFullscreen(Boolean(document.fullscreenEnabled && root.requestFullscreen));
    return () => {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      for (const finger of fingers.values()) window.clearTimeout(finger.palmTimer);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("fullscreenchange", onFullscreen);
      instrumentRef.current = null;
    };
  }, []);

  const pluckNumber = (number: number) => {
    const string = stringIndexForNumber(number);
    instrumentRef.current?.pluck(string, 0.22, 0.75);
  };
  const strum = (direction: 1 | -1) => {
    const instrument = instrumentRef.current;
    if (!instrument) return;
    instrument.strum(direction);
    if (instrument.recordStrum()) discover("progression");
  };
  const toggleChord = (index: number) =>
    setChordIndex((current) => (current === index ? null : index));
  const moveCapo = (by: number) =>
    setCapo((current) => Math.max(0, Math.min(MAX_CAPO, current + by)));

  /** After a mouse click on a control, hand the keyboard back to the strings so Space strums. */
  const returnFocus = (event: MouseEvent) => {
    if (event.detail > 0) canvasRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const { code } = event;
    const isOnButton = (event.target as HTMLElement).tagName === "BUTTON";
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code)?.[1];
    const chordKey = CHORD_KEYS.indexOf(code as (typeof CHORD_KEYS)[number]);
    if (digit !== undefined && Number(digit) >= 1 && Number(digit) <= STRING_COUNT) {
      if (!event.repeat) pluckNumber(Number(digit));
    } else if (digit === "0" || code === "Backquote") {
      setChordIndex(null);
    } else if (chordKey >= 0) {
      if (!event.repeat) toggleChord(chordKey);
    } else if (code === "Space" && !isOnButton) {
      if (!event.repeat) strum(event.shiftKey ? -1 : 1);
    } else if (code === "ArrowUp" || code === "ArrowDown") {
      moveCapo(code === "ArrowUp" ? 1 : -1);
    } else if (code === "Escape") {
      instrumentRef.current?.silence();
      return;
    } else {
      return;
    }
    event.preventDefault();
    // Guitar keys are notes, not letters: keep them from the page's own key listeners.
    event.stopPropagation();
  };

  const toggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen().catch(() => setCanFullscreen(false));
  };

  const start = (event: SyntheticEvent) => {
    event.preventDefault();
    if (audio === "off") setSoundOn(true);
    else unlockAudio();
    canvasRef.current?.focus({ preventScroll: true });
  };

  const stageStyle = { "--nut": `${NUT * 100}%`, "--bridge": `${BRIDGE * 100}%` } as CSSProperties;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keys reach the guitar from any control inside it.
    <div ref={rootRef} className="guitar" onKeyDown={onKeyDown}>
      <div className="guitar-stage" style={stageStyle}>
        <canvas
          ref={canvasRef}
          className="guitar-canvas"
          tabIndex={0}
          aria-label={text.stageLabel}
          aria-describedby={helpId}
        />
        <ThreadAnchor place="thread-anchor--nut" />
        <ThreadAnchor place="thread-anchor--bridge" isGap />
        {/* Stays mounted once audio runs, fading out: the page unlocks audio on pointerdown, and
            unmounting this button mid-press would swallow its own handler. */}
        <button
          type="button"
          className="guitar-start"
          data-state={audio}
          onPointerDown={start}
          onClick={start}
        >
          <span aria-hidden="true">♪</span> {audio === "off" ? text.soundOff : text.start}
        </button>
      </div>

      <div className="guitar-controls">
        <fieldset className="guitar-chords" aria-label={text.chords}>
          {CHORDS.map((shape, index) => (
            <button
              key={shape.name}
              type="button"
              className="guitar-chord-button"
              aria-pressed={chordIndex === index}
              onClick={(event) => {
                toggleChord(index);
                returnFocus(event);
              }}
            >
              <strong>{shape.name}</strong>
              <kbd>{keyLabel(CHORD_KEYS[index] ?? "")}</kbd>
            </button>
          ))}
        </fieldset>

        <div className="guitar-row">
          <fieldset className="guitar-strings" aria-label={text.strings}>
            {STRING_NUMBERS.map((number) => {
              const string = stringIndexForNumber(number);
              const fret = chordFret(chord, capo, string);
              const note = fret === null ? "×" : noteName((OPEN_STRINGS[string] ?? 40) + fret);
              return (
                <button
                  key={number}
                  type="button"
                  className="guitar-string-button"
                  aria-label={`${text.string} ${number}, ${note}`}
                  onClick={(event) => {
                    pluckNumber(number);
                    returnFocus(event);
                  }}
                >
                  <kbd>{number}</kbd>
                  <span>{note}</span>
                </button>
              );
            })}
          </fieldset>

          <div className="guitar-group">
            <button
              type="button"
              className="guitar-icon-button"
              aria-label={text.strumDown}
              title={text.strumDown}
              onClick={(event) => {
                strum(1);
                returnFocus(event);
              }}
            >
              ↓
            </button>
            <button
              type="button"
              className="guitar-icon-button"
              aria-label={text.strumUp}
              title={text.strumUp}
              onClick={(event) => {
                strum(-1);
                returnFocus(event);
              }}
            >
              ↑
            </button>
          </div>

          <div className="guitar-group guitar-capo">
            <span>{text.capo}</span>
            <button
              type="button"
              className="guitar-icon-button"
              aria-label={text.capoDown}
              disabled={capo === 0}
              onClick={() => moveCapo(-1)}
            >
              −
            </button>
            <output aria-live="polite">{capo}</output>
            <button
              type="button"
              className="guitar-icon-button"
              aria-label={text.capoUp}
              disabled={capo === MAX_CAPO}
              onClick={() => moveCapo(1)}
            >
              +
            </button>
          </div>

          {canFullscreen ? (
            <button type="button" className="guitar-text-button" onClick={toggleFullscreen}>
              {isFullscreen ? text.exitFullscreen : text.fullscreen}
            </button>
          ) : null}
        </div>

        <div id={helpId} className="guitar-help">
          <p className="guitar-help-pointer">{text.pointerHelp}</p>
          <p className="guitar-help-touch">{text.touchHelp}</p>
          <ul className="guitar-keys">
            {text.keys.map((entry) => (
              <li key={entry.keys}>
                <kbd>{entry.keys}</kbd> {entry.action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
