import { useEffect } from "react";
import { ChapterRail } from "./components/ChapterRail";
import { Curtain } from "./components/Curtain";
import { EggTracker } from "./components/EggTracker";
import { Footer } from "./components/Footer";
import { Grain } from "./components/Grain";
import { Header } from "./components/Header";
import { Marquee } from "./components/Marquee";
import { SilkBurst } from "./components/SilkBurst";
import { StoryThread } from "./components/StoryThread";
import { ThreadCursor } from "./components/ThreadCursor";
import { profile } from "./content/profile";
import type { Content, Locale } from "./content/types";
import { ScrollTrigger, startSmoothScroll } from "./lib/motion";
import { installAudioUnlock } from "./lib/sound";
import { About } from "./sections/About";
import { Contact } from "./sections/Contact";
import { Direction } from "./sections/Direction";
import { Education } from "./sections/Education";
import { Hero } from "./sections/Hero";
import { Hobby } from "./sections/Hobby";
import { Journey } from "./sections/Journey";
import { Principles } from "./sections/Principles";
import { Projects } from "./sections/Projects";
import { Skills } from "./sections/Skills";

interface Props {
  locale: Locale;
  content: Content;
}

export function App({ locale, content }: Props) {
  useEffect(() => {
    const stopSmoothScroll = startSmoothScroll();
    const removeAudioUnlock = installAudioUnlock();
    // Web fonts change line lengths, and with them every pinned distance.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      stopSmoothScroll();
      removeAudioUnlock();
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        {content.nav.skipToContent}
      </a>
      <Curtain name={profile.name} />
      <Header locale={locale} nav={content.nav} />
      <StoryThread />
      <main id="main">
        <Hero name={profile.name} text={content.hero} />
        <Marquee words={content.marquee} />
        <About text={content.about} cocoonLabel={content.eggs.cocoonLabel} />
        <Journey text={content.journey} present={content.present} />
        <Principles text={content.principles} replayLabel={content.eggs.replayLabel} />
        <Projects text={content.projects} />
        <Education text={content.education} present={content.present} />
        <Direction text={content.direction} />
        <Skills text={content.skills} />
        <Hobby text={content.hobby} />
        <Contact text={content.contact} />
      </main>
      <Footer name={profile.name} locale={locale} nav={content.nav} eggHint={content.eggs.hint} />
      <ChapterRail chapters={content.chapters} label={content.nav.chapterRail} />
      <ThreadCursor />
      <SilkBurst />
      <EggTracker text={content.eggs} />
      <Grain />
    </>
  );
}
