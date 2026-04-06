

## Record-then-Transcribe with Processing Screen

Replace live speech recognition with audio recording + server-side transcription. After stopping, show a full-screen processing view with the scribbling logo animation and sequential progress steps.

### Processing Screen UX

```text
┌─────────────────────────────┐
│                             │
│        [Scribble Logo]      │
│          (large, ~108px)    │
│                             │
│   ✓ Recording saved         │
│   ✓ Uploading audio         │
│   ● Transcribing...         │
│   ○ Deleting recording      │
│                             │
└─────────────────────────────┘
```

Steps appear sequentially with checkmarks as they complete. The current step shows a pulsing dot. Future steps are dimmed circles. "Deleting recording" confirms the audio is not stored.

### Changes

**1. New `src/hooks/useAudioRecorder.ts`**
- `MediaRecorder` API capturing webm/opus
- Exposes: `isRecording`, `isPaused`, `duration`, `start()`, `stop() → Blob`, `pause()`, `resume()`, `reset()`
- Internal timer for duration tracking

**2. New `supabase/functions/transcribe/index.ts`**
- Accepts audio blob via FormData
- Converts to base64, sends to Lovable AI gateway (`google/gemini-2.5-flash`) with multimodal content: audio inline data + "Transcribe this audio verbatim" system prompt
- Returns `{ text: string }`

**3. Update `src/pages/RecordingPage.tsx`**
- Replace `useSpeechRecognition` with `useAudioRecorder`
- Remove live transcript preview
- Add `processing` state after stop: show full-screen processing view with `ScribblingLogo` at size 108 and a step list that progresses through:
  1. "Recording saved" (instant)
  2. "Uploading audio" (while sending to edge function)
  3. "Transcribing" (while waiting for response)
  4. "Deleting recording" (brief pause after response, then navigate)
- Each step: checkmark when done, pulsing dot when active, hollow circle when pending
- On completion, navigate to `/chat/new` with transcribed text

**4. Delete `src/hooks/useSpeechRecognition.ts`**

### Files
- Create `src/hooks/useAudioRecorder.ts`
- Create `supabase/functions/transcribe/index.ts`
- Edit `src/pages/RecordingPage.tsx`
- Delete `src/hooks/useSpeechRecognition.ts`

