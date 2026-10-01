import type { EggId } from "../lib/eggs";
import type { EducationId, JourneyId } from "./profile";

export type Locale = "vi" | "en";

export type ChapterId =
  | "hero"
  | "about"
  | "journey"
  | "principles"
  | "projects"
  | "education"
  | "direction"
  | "skills"
  | "contact";

/** Section label shown as "03 — Hành trình". */
type Kicker = string;

/** Wrap a phrase in *asterisks* to emphasise it; see `splitEmphasis`. */
type RichText = string;

export interface JourneyText {
  role: string;
  org: string;
  story: RichText[];
  tags: string[];
}

export interface Content {
  meta: { title: string; description: string };
  nav: {
    skipToContent: string;
    switchLocale: string;
    switchLocaleLabel: string;
    contact: string;
    backToTop: string;
    chapterRail: string;
  };
  chapters: Record<ChapterId, string>;
  present: string;
  hero: {
    kicker: Kicker;
    tagline: string[];
    intro: RichText[];
    cta: string;
    scrollHint: string;
  };
  about: { kicker: Kicker; heading: string; paragraphs: RichText[] };
  journey: {
    kicker: Kicker;
    heading: string;
    items: Record<JourneyId, JourneyText>;
    designStats: string[];
    silkStages: string[];
    vmoTracks: string[];
  };
  principles: {
    kicker: Kicker;
    heading: string;
    items: { title: string; body: string }[];
  };
  projects: {
    kicker: Kicker;
    heading: string;
    lead: string;
    items: { title: string; body: string }[];
  };
  education: {
    kicker: Kicker;
    items: Record<EducationId, { school: string; major: string }>;
  };
  direction: {
    kicker: Kicker;
    heading: string;
    focus: string;
    paragraphs: RichText[];
    network: { people: string; process: string; coordination: string; result: string };
  };
  skills: {
    kicker: Kicker;
    toolsHeading: string;
    languageHeading: string;
    language: string;
  };
  contact: {
    kicker: Kicker;
    heading: string;
    body: string;
    emailLabel: string;
    phoneLabel: string;
    copy: string;
    copied: string;
  };
  marquee: string[];
  eggs: {
    /** Footer nudge; `{count}` becomes the number of secrets. */
    hint: string;
    found: string;
    allFound: string;
    cocoonLabel: string;
    replayLabel: string;
    messages: Record<EggId, string>;
  };
}
