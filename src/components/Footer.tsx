import { localeHomePath, otherLocale } from "../content/locale";
import type { Content, Locale } from "../content/types";
import { EGG_IDS } from "../lib/eggs";

interface Props {
  name: string;
  locale: Locale;
  nav: Content["nav"];
  eggHint: string;
}

export function Footer({ name, locale, nav, eggHint }: Props) {
  return (
    <footer className="site-footer">
      <p>
        © {new Date().getFullYear()} {name}
      </p>
      <p className="footer-hint">✦ {eggHint.replace("{count}", String(EGG_IDS.length))}</p>
      <nav>
        <a href={localeHomePath(otherLocale(locale))} hrefLang={otherLocale(locale)}>
          {nav.switchLocaleLabel}
        </a>
        <a href="#hero">{nav.backToTop} ↑</a>
      </nav>
    </footer>
  );
}
