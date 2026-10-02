import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { getContent } from "./content/locale";
import { profile, toTelHref } from "./content/profile";
import type { Locale } from "./content/types";
import { CHORDS } from "./guitar/physics";

function render(locale: Locale) {
  return renderToString(<App locale={locale} content={getContent(locale)} />);
}

function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

describe.each(["vi", "en"] as const)("App (%s)", (locale) => {
  const content = getContent(locale);
  const html = render(locale);

  it("renders every chapter, in the rail's order, exactly once", () => {
    const ids = [...html.matchAll(/<section[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual(Object.keys(content.chapters));
  });

  it("names her in the page heading", () => {
    expect(html).toMatch(/<h1[^>]*id="hero-name"/);
    expect(textOf(html)).toContain(profile.name);
  });

  it("offers working contact links", () => {
    expect(html).toContain(`href="mailto:${profile.email}"`);
    expect(html).toContain(`href="${toTelHref(profile.phone)}"`);
  });

  it("renders the localized copy with emphasis markup consumed", () => {
    const text = textOf(html);
    expect(text).toContain(content.journey.heading);
    expect(text).toContain(content.contact.heading);
    expect(text).toContain(content.direction.focus);
    expect(text).not.toContain("*");
  });

  it("leaves chapter numbers to the stylesheet, which counts them in page order", () => {
    const kickers = [...html.matchAll(/class="kicker[^"]*"[^>]*>([^<]*)</g)].map(
      (match) => match[1],
    );
    expect(kickers).toHaveLength(Object.keys(content.chapters).length);
    for (const kicker of kickers) expect(kicker).not.toMatch(/\d/);
  });

  it("gives her guitar a button for every chord and string", () => {
    expect(html).toContain('class="guitar-canvas"');
    expect(html.match(/class="guitar-chord-button"/g)).toHaveLength(CHORDS.length);
    expect(html.match(/class="guitar-string-button"/g)).toHaveLength(6);
  });

  it("links to the other language", () => {
    expect(html).toContain(`href="${locale === "vi" ? "/en" : "/"}"`);
  });
});
