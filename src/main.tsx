import React from "react";
import ReactDOM from "react-dom/client";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource-variable/geologica";
import App from "./App";
import "./index.css";
import { initThemeEarly } from "./ThemeContext";
import { initUiSounds } from "./sfx";

initThemeEarly();

initUiSounds();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
