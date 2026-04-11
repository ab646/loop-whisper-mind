import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Floating banner that shows on the web build of Loop when the user has
 * just completed Google OAuth *inside* a mobile in-app browser (typically
 * SFSafariViewController opened by the native Capacitor Loop app).
 *
 * Why this exists:
 *   After signing in with Google, Supabase redirects back to the app's
 *   Site URL (app.loopmind.care) with session tokens in the URL hash.
 *   The web app happily consumes the session and renders the home screen,
 *   but the user is still stuck inside SFSafariViewController — the
 *   native app has no idea sign-in happened, and there's no UI to bounce
 *   them back.
 *
 *   This banner is the bounce. On tap (a real user gesture, which iOS
 *   reliably honors for custom URL schemes) it deep-links to
 *   `app.loop.journal://callback#access_token=…&refresh_token=…`, which
 *   triggers the `appUrlOpen` listener in the native app's App.tsx —
 *   that listener closes the SFSafariViewController and calls
 *   `supabase.auth.setSession` with the tokens, completing sign-in in
 *   the native app.
 *
 * Visibility rules (all must be true):
 *   1. We are NOT running inside the Capacitor native shell. The native
 *      app handles its own OAuth flow and shouldn't see this banner.
 *   2. The user agent is a mobile iOS / Android browser. No point
 *      showing on desktop, where there's no Loop app to open.
 *   3. OAuth was just completed in this browsing session — detected via
 *      the `loop.justCompletedOAuth` flag set in main.tsx before Supabase
 *      strips the hash, and only honored if set in the last 5 minutes.
 *   4. There is an active Supabase session.
 *
 * Dismissible so that users on regular mobile Safari (who might have
 * genuinely wanted to stay in the browser) can hide it.
 */
export function ReturnToLoopAppBanner() {
  const [visible, setVisible] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    // Rule 1: never render inside the Capacitor native shell.
    if (Capacitor.isNativePlatform()) return;

    // Rule 2: must be a mobile user agent.
    const ua = navigator.userAgent || "";
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    if (!isMobile) return;

    // Rule 3: must have just completed OAuth in this session, within the
    // last 5 minutes.
    let justCompleted = 0;
    try {
      justCompleted = Number(sessionStorage.getItem("loop.justCompletedOAuth") || "0");
    } catch {
      // sessionStorage can throw in private mode — treat as no signal.
    }
    if (!justCompleted) return;
    const ageMs = Date.now() - justCompleted;
    if (ageMs < 0 || ageMs > 5 * 60 * 1000) return;

    // Rule 4: must have an active Supabase session with both tokens.
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (cancelled) return;
      if (!session?.access_token || !session?.refresh_token) return;
      const hash = `access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}&token_type=bearer`;
      setDeepLink(`app.loop.journal://callback#${hash}`);
      setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleReturn = useCallback(() => {
    // The actual navigation is handled by the <a href> — iOS honors
    // custom URL schemes on real HTML anchor clicks inside
    // SFSafariViewController, but silently blocks JS-driven
    // window.location.href = "customscheme://...".
    //
    // We only flip visual state here so the user sees immediate
    // feedback, and set up a JS fallback after a short delay in
    // case the native app for some reason doesn't pick up the
    // custom scheme (e.g. older iOS).
    setReturning(true);
    if (deepLink) {
      window.setTimeout(() => {
        // Fallback: if we're still here 1.2s after the tap, try the
        // JS navigation too. On iOS that may trigger an "Open in Loop?"
        // prompt the user can confirm.
        try {
          window.location.assign(deepLink);
        } catch {
          // ignore
        }
      }, 1200);
    }
  }, [deepLink]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.removeItem("loop.justCompletedOAuth");
    } catch {
      // ignore
    }
  }, []);

  if (!visible || dismissed || !deepLink) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "max(env(safe-area-inset-top, 0px), 8px)",
        left: 8,
        right: 8,
        zIndex: 9999,
      }}
      role="region"
      aria-label="Return to Loop app"
    >
      <div className="rounded-2xl bg-on-surface text-surface shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight">
            {returning ? "Returning to Loop…" : "You're signed in"}
          </p>
          <p className="text-xs opacity-80 leading-tight mt-0.5">
            {returning ? "Opening the native app" : "Tap to return to the Loop app"}
          </p>
        </div>
        {/*
          Using a real anchor tag (not a button + window.location.href)
          because SFSafariViewController silently blocks JS-driven
          custom-scheme navigation, even inside a user gesture. A
          genuine <a href="customscheme://..."> click is honored.
        */}
        <a
          href={deepLink}
          onClick={handleReturn}
          className="shrink-0 rounded-full bg-surface text-on-surface font-medium text-sm px-4 py-2 active:opacity-80 transition-opacity no-underline"
          style={{ textDecoration: "none" }}
        >
          Open Loop
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-surface opacity-60 active:opacity-100 px-1 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
