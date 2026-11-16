import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import App from "./App";
import "./styles.css";
import "./workspace.css";
import "./tft-visuals.css";
import "./comp-guide.css";
import "./level-guide.css";
import "./game-guide.css";
import "./workspace-refresh.css";
import "./comp-tiers.css";
import "./overlay-refresh.css";
import "./shop-medal.css";
import "./zyon-design.css";
import "./control-room.css";
import "./duo.css";
import "./account.css";
import "./controls.css";
import "./updates.css";
import "./overlay-planner-polish.css";
import "./overlay-controls.css";
import "./planner-workbench.css";
import "./duo-requests.css";
import "./planner-studio.css";
import "./database-catalog.css";
import "./social-lobby.css";
import "./calibration.css";
import "./scrollbars.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
