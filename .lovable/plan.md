

# Plan: Eliminate `/chat/new` — Submit Before Navigating

## Problem
On native iOS, the handoff from HomePage/RecordingPage to `/chat/new` keeps failing — text lands in the input but never auto-submits. Multiple fix attempts have not resolved this.

## Solution
Remove `/chat/new` entirely. Call the `reflect` edge function **before** navigating, then go directly to `/chat/:entryId`.

```text
Before (broken):  HomePage → navigate("/chat/new") → ChatPage reads handoff → calls reflect
After:            HomePage → show loader → call reflect → navigate("/chat/:entryId")
```

## Implementation

### 1. Create `src/hooks/useCreateLoop.ts`
A shared hook that:
- Accepts text (and optionally image data)
- Calls the `reflect` edge function
- Returns the new entry ID on success
- Exposes `loading` and `error` state

### 2. Update `src/pages/HomePage.tsx`
- On text submit: show loading overlay, call `useCreateLoop`, navigate to `/chat/:entryId`
- On image submit: same flow with image data
- Remove `savePendingChatPrefill` and `/chat/new` navigation

### 3. Update `src/pages/RecordingPage.tsx`
- After transcription: show loading, call `useCreateLoop`, navigate to `/chat/:entryId`
- Remove `savePendingChatPrefill` and `/chat/new` navigation

### 4. Update `src/pages/ChatPage.tsx`
- Remove all `/chat/new` logic: `isNew` flag, `resolveInitialChatPrefill`, `queuedAutoSubmitRef`, `autoSubmitFiredRef`, controlled draft text, storage reads
- Page always loads an existing entry by ID
- Keep exploration flow and manual follow-up intact

### 5. Update `src/pages/OnboardingPage.tsx`
- After saving profile with seed text: call `useCreateLoop` with the seed, navigate to `/chat/:entryId`
- If no seed selected, navigate to `/` (home)

### 6. Update `src/pages/InsightsPage.tsx`
- Change CTA button from `navigate("/chat/new")` to `navigate("/")` (home)

### 7. Delete `src/lib/pending-chat-prefill.ts`
- No longer needed — no handoff to manage

## Files
- **New**: `src/hooks/useCreateLoop.ts`
- **Edit**: `src/pages/HomePage.tsx`, `src/pages/RecordingPage.tsx`, `src/pages/ChatPage.tsx`, `src/pages/OnboardingPage.tsx`, `src/pages/InsightsPage.tsx`
- **Delete**: `src/lib/pending-chat-prefill.ts`

## What stays the same
- The `reflect` edge function is unchanged
- ChatPage loading/displaying existing entries works identically
- ChatInput component visuals unchanged
- Exploration flow within ChatPage untouched

## Validation
- Native typed submit from Home → loader → reflection page with entry
- Native voice recording → transcription → loader → reflection page
- Onboarding seed → loader → first reflection
- Insights CTA → goes to home
- Input is never stuck with unsubmitted text

