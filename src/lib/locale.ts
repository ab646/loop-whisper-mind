/**
 * Locale helpers for Loop.
 *
 * On a Capacitor iOS app, navigator.language is set from the iOS device
 * locale (Settings → General → Language & Region) — not the browser.
 * That gives us the user's preferred locale for free, without prompting
 * for location or adding a Capacitor plugin.
 *
 * If we ever need higher fidelity (e.g. user lives in Germany but has
 * their iPhone in English), we can upgrade to @capacitor/device's
 * Device.getLanguageTag() which goes straight to the native API.
 */

/**
 * Returns the user's 2-letter ISO country code, lowercased, or undefined
 * if it can't be determined. Examples: "us", "fr", "gb", "br".
 */
export function getCountryCode(): string | undefined {
  if (typeof navigator === "undefined") return undefined;

  const candidates: string[] = [];
  if (navigator.language) candidates.push(navigator.language);
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);

  for (const tag of candidates) {
    // BCP 47 tags look like "en-US", "fr-FR", "pt-BR", "zh-Hant-HK".
    // The region is the first 2-letter ALL-CAPS segment after the language.
    const parts = tag.split("-");
    for (let i = 1; i < parts.length; i++) {
      if (/^[A-Z]{2}$/.test(parts[i])) {
        return parts[i].toLowerCase();
      }
    }
  }
  return undefined;
}
