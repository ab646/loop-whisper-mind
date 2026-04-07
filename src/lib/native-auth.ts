import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

/**
 * Handles OAuth sign-in for both web (Lovable proxy) and native (Capacitor).
 *
 * On web: uses Lovable's cloud auth proxy (default behavior).
 * On native iOS/Android: uses Supabase OAuth directly with the system browser,
 * because Google blocks sign-in from embedded WebViews.
 */
export async function signInWithOAuth(
  provider: "google" | "apple",
  options?: { redirectAfterLogin?: string }
): Promise<{ error?: Error; redirected?: boolean }> {
  // On web, use Lovable's auth proxy as before
  if (!Capacitor.isNativePlatform()) {
    return lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
  }

  // On native, use Supabase OAuth directly with system browser.
  // Redirect back to the app via the custom URL scheme.
  const redirectTo = "app.loop.journal://callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true, // We'll handle the browser ourselves
    },
  });

  if (error) {
    return { error };
  }

  if (data?.url) {
    // Open the OAuth URL in the system browser (Safari) instead of WebView
    await Browser.open({ url: data.url });

    // Listen for the app to be resumed after OAuth completes
    Browser.addListener("browserFinished", () => {
      Browser.removeAllListeners();
    });

    return { redirected: true };
  }

  return { error: new Error("No OAuth URL returned") };
}
