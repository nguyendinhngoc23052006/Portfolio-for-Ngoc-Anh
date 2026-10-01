import { localeHomePath, otherLocale } from "../content/locale";
import type { Content, Locale } from "../content/types";

interface Props {
  locale: Locale;
  nav: Content["nav"];
}

export function Header({ locale, nav }: Props) {
  return (
    <header className="site-header">
      <a className="monogram" href="#hero" aria-label={nav.backToTop}>
        Ngọc <span>Anh</span>
      </a>
      <nav className="header-actions">
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
