import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getContent, resolveLocale } from "./content/locale";
import { describeStartupError } from "./startupError";
import "./styles/global.css";

const mountPoint = document.getElementById("root");

function showStartupError(error: unknown) {
  if (!mountPoint) return;
  mountPoint.setAttribute("data-startup-error", "");
  mountPoint.textContent = describeStartupError(error);
}

if (mountPoint) {
  const locale = resolveLocale(window.location.pathname);
  const content = getContent(locale);
  document.documentElement.lang = locale;
  document.title = content.meta.title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", content.meta.description);

  // Imported dynamically so a failure while loading any section is caught here too.
  import("./App")
    .then(({ App }) => {
      createRoot(mountPoint, { onUncaughtError: showStartupError }).render(
        <StrictMode>
          <App locale={locale} content={content} />
        </StrictMode>,
      );
    })
    .catch(showStartupError);
}
