# src/ — how this portfolio is built

- **Her words, her voice.** Copy is first person ("mình"), taken verbatim from
  `content/vi.ts`. Never invent work, metrics, logos or photos. `en.ts` follows
  `vi.ts` in meaning; on any disagreement, `vi.ts` wins.
- **Strings live in `content/`, facts in `content/profile.ts`.** No copy in JSX.
  A fact (email, date, score) is written once, never once per language.
- **Components render; `lib/` holds the motion engine, the thread registry and
  the easter-egg store.** Sections only place `ThreadAnchor`s and call `useScene`.
- **Motion never hides text by default.** Hidden start states go inside a
  `useScene` setup, never in CSS, so reduced motion and failed scripts still read.
- **The thread's path is derived, never drawn.** Move `ThreadAnchor`s; never add
  coordinates to `StoryThread`.
- **Sound is synthesised in `lib/sound.ts`, never loaded from files.** Every voice
  plays into its one bus (room reverb, limiter, the header's on/off switch).
- **`guitar/` is one instrument with clean seams:** `physics.ts` (the strings,
  shared by the audio worklet and the tests — change it only with
  `physics.test.ts` green), `processor.ts` (a thin worklet shell), `audio.ts`
  (the bridge onto the shared bus), `instrument.ts` (the left hand: chord, capo,
  fingers), `visual.ts` + `draw.ts` (what you see), `Guitar.tsx` (input only).
- **Chapter numbers are counted by CSS** (`main section[id]`); kickers carry only
  the label.
