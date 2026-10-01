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
