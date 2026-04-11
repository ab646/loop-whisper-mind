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

  // On native, use Supabase OAuth directly with the system browser.
  //
  // IMPORTANT: we redirect straight to the app's custom URL scheme
  // (`app.loop.journal://callback`) rather than bouncing through the
  // web /callback page. Supabase issues this final redirect as an HTTP
  // 302 from its OAuth callback handler, which iOS honors for custom
  // URL schemes. A JavaScript `window.location.href` redirect from the
  // web callback page (the previous approach) was being silently
  // blocked by SFSafariViewController because it lacked a user gesture,
  // leaving the user stranded in Safari after Google sign-in.
  //
  // This URL must be added to the Supabase project's allowed Redirect
  // URLs (Authentication → URL Configuration) or Supabase will refuse
  // to redirect to it.
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
