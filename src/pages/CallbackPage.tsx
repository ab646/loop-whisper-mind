import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth callback handler.
 *
 * After Supabase OAuth completes, the browser lands here at
 * https://loop-whisper-mind.lovable.app/callback#access_token=...
 *
 * Two scenarios:
 *
 * 1. NATIVE flow (iOS): Safari / SFSafariViewController was opened by
 *    the Capacitor Browser plugin. After OAuth, it loads this URL. We
 *    try to auto-redirect to the custom URL scheme
 *    (app.loop.journal://callback#...) which triggers the deep-link
 *    listener in App.tsx and brings the user back into the native app.
 *
 *    On modern iOS, SFSafariViewController silently blocks a pure
 *    `window.location.href = "app.loop.journal://..."` redirect when
 *    there's no user gesture. To guarantee it works, after a short
 *    delay we show a "Return to Loop" button. Tapping the button
 *    IS a user gesture and iOS reliably honors the scheme redirect.
 *
 * 2. WEB flow: The user is on the web app. The auto-redirect will do
 *    nothing, so we fall through to the web session handler, which
 *    sets the Supabase session from the tokens and navigates to "/".
 */
export default function CallbackPage() {
  const navigate = useNavigate();
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [nativeUrl, setNativeUrl] = useState<string>("");
  const [webFallbackFailed, setWebFallbackFailed] = useState(false);

  const openInApp = useCallback(() => {
    if (nativeUrl) {
      window.location.href = nativeUrl;
    }
  }, [nativeUrl]);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash.substring(1); // remove the #
      const search = window.location.search.substring(1);
      const fragment = hash || search;
      const params = new URLSearchParams(fragment);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        // No tokens — something went wrong, send back to login
        navigate("/login", { replace: true });
        return;
      }

      // Build the native deep-link URL (used by the button below too).
      const deepLink = `app.loop.journal://callback#${fragment}`;
      setNativeUrl(deepLink);

      // Attempt #1: auto-redirect. On iOS this MAY trigger the app
      // scheme and reopen Loop. On modern iOS / SFSafariViewController
      // this is commonly blocked silently with no user gesture, so we
      // also schedule a tap-to-return fallback below.
      window.location.href = deepLink;

      // After a short grace period, if the app didn't take over, show
      // the "Return to Loop" button (native) or fall through to web
      // session handling (plain web).
      setTimeout(async () => {
        // If we're still mounted, the auto-redirect didn't capture us.
        // Show the native return button AND try the web session
        // fallback in parallel — whichever applies will handle it.
        setShowReturnButton(true);

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Failed to set session from callback:", error);
          setWebFallbackFailed(true);
          return;
        }

        // Web path: we're already in the React app at this origin,
        // so navigate to home. On native (inside SFSafariViewController)
        // this navigate is harmless — the user will still see the
        // "Return to Loop" button until they tap it.
        navigate("/", { replace: true });
      }, 1500);
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="h-screen mesh-gradient-bg flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <h1 className="font-display text-2xl text-on-surface">Loop Mind</h1>

        {!showReturnButton && (
          <p className="text-on-surface-variant text-sm animate-pulse-soft">
            Signing you in...
          </p>
        )}

        {showReturnButton && !webFallbackFailed && (
          <>
            <p className="text-on-surface-variant text-sm">
              You're signed in. Tap below to return to Loop.
            </p>
            <button
              onClick={openInApp}
              className="w-full rounded-full bg-on-surface text-surface font-medium py-4 px-6 active:opacity-80 transition-opacity"
            >
              Return to Loop
            </button>
            <p className="text-on-surface-variant text-xs opacity-60">
              If nothing happens, open the Loop app manually — you're
              already signed in.
            </p>
          </>
        )}

        {webFallbackFailed && (
          <>
            <p className="text-on-surface-variant text-sm">
              Something went wrong. Please try signing in again.
            </p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full rounded-full bg-on-surface text-surface font-medium py-4 px-6 active:opacity-80 transition-opacity"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
