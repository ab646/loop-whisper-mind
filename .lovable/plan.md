

# Revised UX Audit Implementation Plan

Same plan as before, with **Fix 6 (Single Entry Point) removed** — the ChatInput stays on the Home Page.

---

## Already Done (No Changes)
- #2 ReflectionCard, #3 Insights Empty State, #7 BottomNav

## CRITICAL
### Fix 1: Contrast Ratios
- Bump `--on-surface-variant` and `--on-surface` in `src/index.css`
- Add subtle borders to auth input fields

## HIGH PRIORITY
### Fix 4: Social Login (Google + Apple)
- Add OAuth buttons to LoginPage and SignupPage
- Divider "or continue with email"
- Enable providers in backend auth config

### Fix 5: `prefers-reduced-motion` Support
- Use `useReducedMotion` from Framer Motion in VoiceOrb, Waveform, CyclingLoader
- Replace animations with opacity fades when enabled

### Fix 8: Enhance Entry Display on Home
- Add loop type badge when reflection data exists
- Make tags more prominent

## MODERATE PRIORITY
### Fix 9: Remove Duplicate Tagline on Signup
### Fix 10: Pause/Resume on Recording Page
### Fix 11: Show Up to 4 Themes in Insights
### Fix 12: Undo Toast Instead of Delete Confirmation
### Fix 13: Consistent Glass-Panel Styling
### Fix 14: CyclingLoader Consistency
### Fix 15: Touch Target Sizes on Auth Pages

---

**Files to modify:** ~12 files — `src/index.css`, auth pages, `HomePage.tsx`, `RecordingPage.tsx`, `ChatPage.tsx`, `InsightsPage.tsx`, `VoiceOrb.tsx`, `Waveform.tsx`, `CyclingLoader.tsx`, `ReflectionCard.tsx`, `ThemeCard.tsx`, plus backend auth config.

