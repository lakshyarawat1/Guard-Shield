import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <App />
        <Toaster />
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>,
);
