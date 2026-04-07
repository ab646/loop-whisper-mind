import { useEffect } from "react";
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
 * 1. NATIVE flow (iOS): Safari was opened by the Capacitor Browser plugin.
 *    After OAuth, Safari loads this URL. We redirect to the custom URL scheme
 *    (app.loop.journal://callback#...) which triggers the deep-link listener
 *    in App.tsx and brings the user back into the native app with tokens.
 *
 * 2. WEB flow: The user is on the web app. We extract tokens from the hash,
 *    set the Supabase session, and navigate to "/".
 *
 * To handle both: we always attempt the custom-scheme redirect first. On iOS
 * it opens the native app. On desktop/web it fails silently and we fall
 * through to the web session handler.
 */
export default function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash.substring(1); // remove the #
      const search = window.location.search.substring(1);
      const fragment = hash || search;
      const params = new URLSearchParams(fragment);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        // Attempt to open the native app via custom URL scheme.
        // On iOS (Safari opened by Capacitor), this will trigger the
        // appUrlOpen deep-link and bring the user back to the native app.
        // On desktop web, this will be ignored after a brief moment.
        const nativeUrl = `app.loop.journal://callback#${fragment}`;
        window.location.href = nativeUrl;

        // Give the native redirect a moment to fire. If we're still here
        // after 1.5s, we're on web — handle the session directly.
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Web fallback: set the Supabase session from the tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Failed to set session from callback:", error);
          navigate("/login", { replace: true });
          return;
        }

        navigate("/", { replace: true });
      } else {
        // No tokens — something went wrong, send back to login
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen mesh-gradient-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="font-display text-2xl text-on-surface">Loop</h1>
        <p className="text-on-surface-variant text-sm animate-pulse-soft">
          Signing you in...
        </p>
      </div>
    </div>
  );
}
