import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { analytics } from "./lib/analytics";

// Detect OAuth completion in the URL hash BEFORE the Supabase SDK strips
// it during session init. We set a short-lived flag in sessionStorage so
// the ReturnToLoopAppBanner can tell it was just rendered after a fresh
// OAuth sign-in (as opposed to a regular page load where a session
// already exists in localStorage). Used only on web — the native app
// handles OAuth via the appUrlOpen listener in App.tsx.
if (typeof window !== "undefined") {
  const hash = window.location.hash || "";
  if (hash.includes("access_token") && hash.includes("refresh_token")) {
    try {
      sessionStorage.setItem("loop.justCompletedOAuth", String(Date.now()));
    } catch {
      // sessionStorage can throw in some private-browsing modes — ignore,
      // banner will simply not show in that case.
    }
  }
}

analytics.init();
analytics.appOpened("organic");

createRoot(document.getElementById("root")!).render(<App />);
