import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { analytics } from "./lib/analytics";

analytics.init();
analytics.sessionStarted();

createRoot(document.getElementById("root")!).render(<App />);
