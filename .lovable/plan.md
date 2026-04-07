

## Problem

The onboarding bottom buttons (Continue/Back) aren't properly pinned to the bottom on iOS. The root layout uses `h-screen` (100vh), which on iOS Safari/Capacitor includes the area behind the status bar and home indicator, causing miscalculation. Additionally, the content area for Screen 3 ("Patterns emerge") has significant content that can push buttons offscreen — the `scroll-container` class allows scrolling but the `justify-center` on the flex parent fights against it when content overflows.

## Plan

### File: `src/pages/OnboardingPage.tsx`

1. **Replace `h-screen` with `h-[100dvh]`** on the outer container — `dvh` (dynamic viewport height) correctly accounts for iOS browser chrome and home indicator, unlike `100vh`.

2. **Change content area from `justify-center` to `justify-start pt-8` for seed/text steps, keep `justify-center` for explain steps** — or simpler: switch to `overflow-y-auto` with content that naturally fills from top, using `my-auto` on the inner motion.div to center when content is short, but allowing scroll when it's tall.

3. **Restructure the content area**: Change `flex-1 min-h-0 flex flex-col justify-center` to `flex-1 min-h-0 overflow-y-auto` and let content center itself via auto margins. This ensures:
   - Short content (explain screens 1, 2, name input) centers vertically
   - Tall content (explain screen 3, seed selection with textarea) scrolls without pushing buttons off-screen

4. **Bottom container**: Keep `shrink-0` with safe-area padding. Add a subtle top border or background to visually separate it from scrollable content above.

### Technical Details

- `h-[100dvh]` is well-supported on iOS 15.4+ and all modern browsers
- The `min-h-0` on the content flex child is critical — it allows the child to shrink below its content size, enabling overflow scroll
- Each explain screen's content will get `min-h-full flex flex-col justify-center` wrapper so short screens still center, while Screen 3 can scroll

### Screens Affected
- **Screen 1 (You talk)**: Short content, will center — no issue
- **Screen 2 (Loop reflects)**: Medium content, will center — no issue  
- **Screen 3 (Patterns emerge)**: Tall content, will scroll within the area above the fixed buttons
- **Screen 4 (Name input)**: Short content, centers — keyboard handling already in place
- **Screen 5 (Seed selection)**: Medium-tall content, may need scroll when "Something else" textarea is open

