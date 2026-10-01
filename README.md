# Nguyễn Ngọc Anh — portfolio

A bilingual scrollytelling portfolio: Vietnamese at `/`, English at `/en`.
One silk thread runs through the whole page. It is pulled from the hero's silk,
winds into a cocoon, becomes the route of her journey, stitches past her
principles and projects, crosses a globe and a function plot, branches into a
supply-chain network and ties off as the contact knot. Five easter eggs hide
along the way; the footer hints at three.

Built with Vite + React + TypeScript, GSAP (ScrollTrigger, DrawSVG,
MotionPath) and Lenis. No database.

## Change the words

| What | Where |
|---|---|
| Every Vietnamese sentence (source of truth) | `src/content/vi.ts` |
| The English mirror | `src/content/en.ts`. Same shape; `npm run typecheck` fails on a missing key and `npm test` fails on a list of a different length |
| Facts that are not words: email, phone, dates, IELTS, tools | `src/content/profile.ts`, once for both languages |
| Emphasis | wrap a phrase in `*asterisks*` |
| Page title and description for link previews | `index.html` mirrors `vi.ts`'s `meta`; a test fails if they drift |

## How the story is wired

- **Chapters** are `src/sections/*`, composed in order in `src/App.tsx`. The
  chapter rail reads that order from the page, so it has no list of its own.
- **The thread** (`src/components/StoryThread.tsx`) is drawn through invisible
  `ThreadAnchor`s that each chapter places. To reroute it, move an anchor: the
  placements are the `thread-anchor--*` rules in `src/styles/global.css`.
  Never write coordinates; the path is derived from the layout every frame.
- **Motion** runs through `useScene` (`src/lib/motion.ts`), which never runs
  for readers who prefer reduced motion. Hidden start states live only inside
  those setups, so if a script fails the text is still on the page.
- **Easter eggs** are listed once in `src/lib/eggs.ts`; the counter's total is
  that list's length.

## Checks

`npm run lint` · `npm run typecheck` · `npm test` · `npm run build`. CI
(`.github/workflows/ci.yml`) runs them on every pull request, plus
`architecture-current`, which redraws `docs/system-map.md` from the repo's
files and fails if the committed map disagrees. Never edit that file by hand.

## Deploy

Not wired yet. `wrangler.jsonc` is ready: one Cloudflare Worker named
`portfolio-for-ngoc-anh` serving `./dist/`. The guide's preview and production
workflows still assume a Supabase database, which this site does not have; they
arrive once the guide supports a no-database site.

## Run it locally (optional)

```
npm install
npm run dev
```

## What would break it

- Renaming a section `id` without renaming its key in `Content.chapters`. The
  App test fails.
- Hiding content with CSS so animation can reveal it. Start states belong in
  `useScene`, or reduced-motion readers see a blank chapter.
- Hard-coding thread coordinates. Move anchors instead.
