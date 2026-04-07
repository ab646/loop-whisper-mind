
Problem
- On native, both HomePage text submit and RecordingPage transcription reach `/chat/new`, but the text stays in the chat input instead of being sent automatically.

What I found
- I reviewed `src/pages/HomePage.tsx`, `src/pages/RecordingPage.tsx`, `src/pages/ChatPage.tsx`, `src/components/ChatInput.tsx`, and `src/lib/pending-chat-prefill.ts`.
- Do I know what the issue is? Likely yes.
- `ChatPage` currently only reads storage for auto-submit if URL/query/router state already says `autoSubmit`.
- On native, the text handoff appears to survive, but the auto-submit trigger is not surviving reliably on first mount.
- `ChatInput` is also only semi-controlled through `defaultValue`, so if the auto-send path is skipped, the draft remains visible in the input.

Implementation plan
1. Make the storage-backed handoff the primary source of truth on `/chat/new`.
   - Resolve pending prefill on mount even if query/state flags are missing.
   - Only auto-submit when the stored payload explicitly says `autoSubmit: true`, so onboarding prefill stays non-auto.
   - Add a one-time handoff token/nonce or consume-once behavior to avoid stale repeats.

2. Replace the mount-only auto-submit with a queued submit flow in `ChatPage`.
   - Hydrate `draftText` and `queuedAutoSubmitText` separately.
   - Run a guarded effect that submits only when the page is actually ready: `isNew`, not `loading`, not `imageValidating`.
   - Do not clear the queued text until submission really starts.

3. Make `ChatInput` properly controlled in the chat screen.
   - Add optional `value` and `onValueChange` props.
   - Use controlled mode in `ChatPage` so clearing `draftText` immediately clears the visible input.
   - Keep backward-compatible behavior for HomePage if needed.

4. Keep the producers simple.
   - `HomePage` and `RecordingPage` should keep saving the pending handoff before navigation.
   - URL query/router state can remain as a secondary hint, but ChatPage should no longer depend on them.

5. Add temporary logging while verifying the fix.
   - Log what ChatPage resolves on mount: query, router state, pending storage, queued submit text, and whether send was blocked.
   - Remove these logs after native verification.

Technical details
- Main files to update:
  - `src/lib/pending-chat-prefill.ts`
  - `src/pages/ChatPage.tsx`
  - `src/components/ChatInput.tsx`
  - likely small cleanup in `src/pages/HomePage.tsx`
  - likely small cleanup in `src/pages/RecordingPage.tsx`
- I would also keep the current onboarding behavior intact: `navigate("/chat/new", { state: { prefillText } })` should still prefill only, not auto-send.

Validation
- Native typed submit from HomePage should auto-send immediately and show the user bubble/loading state.
- Native voice transcription should auto-send the same way.
- The input should be empty during processing instead of holding the submitted text.
- Manual submit inside ChatPage should still work normally.
- Onboarding prefill should still prefill without auto-submitting.
