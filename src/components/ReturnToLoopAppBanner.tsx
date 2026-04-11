import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Invisible redirector that fires on the web build of Loop when the user
 * has just completed Google OAuth *inside* a mobile in-app browser
 * (typically SFSafariViewController opened by the native Capacitor Loop
 * app).
 *
 * Why this exists:
 *   After signing in with Google, Supabase redirects back to the app's
 *   Site URL (app.loopmind.care) with session tokens in the URL hash.
 *   The web app happily consumes the session and renders the home screen,
 *   but the user is still stuck inside SFSafariViewController — the
 *   native app has no idea sign-in happened, and there's no UI to bounce
 *   them back.
 *
 *   This component is the bounce. As soon as it detects a fresh OAuth
 *   completion plus a valid session, it immediately redirects the
 *   browser to `app.loop.journal://callback#access_token=…&refresh_token=…`,
 *   which triggers the `appUrlOpen` listener in the native app's App.tsx —
 *   that listener closes the SFSafariViewController and calls
 *   `supabase.auth.setSession` with the tokens, completing sign-in in
 *   the native app.
 *
 *   No UI. No tap required. The user's post-OAuth gesture carries
 *   through as the trusted gesture that iOS needs to allow the custom
 *   scheme navigation.
 *
 * Trigger rules (all must be true):
 *   1. We are NOT running inside the Capacitor native shell. The native
 *      app handles its own OAuth flow and shouldn't see this.
 *   2. The user agent is a mobile iOS / Android browser. No point
 *      firing on desktop, where there's no Loop app to open.
 *   3. OAuth was just completed in this browsing session — detected via
 *      the `loop.justCompletedOAuth` flag set in main.tsx before Supabase
 *      strips the hash, and only honored if set in the last 5 minutes.
 *   4. There is an active Supabase session.
 */
export function ReturnToLoopAppBanner() {
  useEffect(() => {
    // Rule 1: never run inside the Capacitor native shell.
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

    // Consume the flag immediately so we only fire once per OAuth
    // completion. If the redirect fails, we don't want to trap the
    // user in a bounce loop.
    try {
      sessionStorage.removeItem("loop.justCompletedOAuth");
    } catch {
      // ignore
    }

    // Rule 4: must have an active Supabase session with both tokens.
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (cancelled) return;
      if (!session?.access_token || !session?.refresh_token) return;
      const hash = `access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}&token_type=bearer`;
      const deepLink = `app.loop.journal://callback#${hash}`;
      // Fire immediately. No delay, no UI. iOS should honor the
      // custom scheme navigation because the user's tap through the
      // Google consent screen counts as the recent trusted gesture.
      try {
        window.location.assign(deepLink);
      } catch {
        // ignore — if this throws, there's nothing we can do from here.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
