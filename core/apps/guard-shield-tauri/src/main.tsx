import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { ClerkProviderWrapper } from "./components/auth/ClerkProviderWrapper";
import { NativeRBACProvider } from "./components/auth/NativeRBACProvider";
import { SessionManager } from "./components/auth/SessionManager";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <ClerkProviderWrapper>
        <NativeRBACProvider>
          <ThemeProvider>
            <SessionManager>
              <App />
              <Toaster />
            </SessionManager>
          </ThemeProvider>
        </NativeRBACProvider>
      </ClerkProviderWrapper>
    </HashRouter>
  </React.StrictMode>,
);
