import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./app/globals.css";
import { hydrateRuntimeOptions } from "./config/options";
import { apply_theme, detect_initial_theme } from "./shared/theme/theme-context";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root not found.");
}
const root_container = container;

async function bootstrap() {
  await hydrateRuntimeOptions();
  apply_theme(detect_initial_theme());

  createRoot(root_container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
