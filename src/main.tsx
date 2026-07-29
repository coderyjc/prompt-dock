import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/app.css";

const initialWindowMode = new URLSearchParams(window.location.search).get("window") === "manage" ? "manage" : "edit";
document.documentElement.dataset.window = initialWindowMode;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
