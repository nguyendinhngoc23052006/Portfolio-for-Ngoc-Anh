import { localeHomePath, otherLocale } from "../content/locale";
import type { Content, Locale } from "../content/types";
import { setSoundOn, useSoundOn } from "../lib/sound";

interface Props {
  locale: Locale;
  nav: Content["nav"];
}

function SpeakerIcon({ isOn }: { isOn: boolean }) {
  return (
    <svg className="sound-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {isOn ? (
        <path className="sound-waves" d="M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11" />
      ) : (
        <path d="M16 9.5l5 5 M21 9.5l-5 5" />
      )}
    </svg>
  );
}

export function Header({ locale, nav }: Props) {
  const isSoundOn = useSoundOn();
  return (
    <header className="site-header">
      <a className="monogram" href="#hero" aria-label={nav.backToTop}>
        Ngọc <span>Anh</span>
      </a>
      <nav className="header-actions">
        <button
          type="button"
          className="pill-link sound-toggle"
          aria-pressed={isSoundOn}
          onClick={() => setSoundOn(!isSoundOn)}
        >
          <SpeakerIcon isOn={isSoundOn} />
          <span className="sound-label">{nav.sound}</span>
        </button>
        <a
          className="pill-link"
          href={localeHomePath(otherLocale(locale))}
          hrefLang={otherLocale(locale)}
          lang={otherLocale(locale)}
          aria-label={nav.switchLocaleLabel}
        >
          {nav.switchLocale}
        </a>
        <a className="pill-link" href="#contact">
          {nav.contact}
        </a>
      </nav>
    </header>
  );
}
