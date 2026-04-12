import { useState, useRef, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import {
  AudioSessionMode,
  CapacitorAudioRecorder,
  RecordingStatus,
} from "@capgo/capacitor-audio-recorder";

/** Maximum recording duration in seconds (15 minutes) */
export const MAX_RECORDING_SECONDS = 15 * 60;

/** Warn user when this many seconds remain */
export const RECORDING_WARN_SECONDS = 60;

/** Show amber timer when this many seconds remain */
export const RECORDING_AMBER_SECONDS = 120;

interface UseAudioRecorderOptions {
  /** Called when recording auto-stops at the max duration */
  onMaxDurationReached?: () => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const NATIVE_AUDIO_MIME_TYPE = "audio/mp4";

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, [clearTimer]);

  const startWebRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      resolveStopRef.current?.(blob);
      resolveStopRef.current = null;
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
    setIsPaused(false);
    setDuration(0);
    startTimer();
  }, [startTimer]);

  const startNativeRecording = useCallback(async () => {
    const permission = await CapacitorAudioRecorder.checkPermissions().catch(() => ({
      recordAudio: "prompt" as const,
    }));

    const resolvedPermission =
      permission.recordAudio === "granted"
        ? permission
        : await CapacitorAudioRecorder.requestPermissions();

    if (resolvedPermission.recordAudio !== "granted") {
      throw new Error("Microphone permission denied");
    }

    await CapacitorAudioRecorder.startRecording({
      audioSessionMode: AudioSessionMode.Measurement,
    });

    setIsRecording(true);
    setIsPaused(false);
    setDuration(0);
    startTimer();
  }, [startTimer]);

  const start = useCallback(async () => {
    chunksRef.current = [];
    resolveStopRef.current = null;

    if (Capacitor.isNativePlatform()) {
      await startNativeRecording();
      return;
    }

    await startWebRecording();
  }, [startNativeRecording, startWebRecording]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    clearTimer();

    if (Capacitor.isNativePlatform()) {
      const status = await CapacitorAudioRecorder.getRecordingStatus().catch(() => null);
      if (!status || status.status === RecordingStatus.Inactive) {
        setIsRecording(false);
        setIsPaused(false);
        return null;
      }

      const result = await CapacitorAudioRecorder.stopRecording();
      setIsRecording(false);
      setIsPaused(false);

      if (result.blob) {
        return result.blob;
      }

      if (!result.uri) {
        return null;
      }

      const response = await fetch(Capacitor.convertFileSrc(result.uri));
      const arrayBuffer = await response.arrayBuffer();
      return new Blob([arrayBuffer], { type: NATIVE_AUDIO_MIME_TYPE });
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;

    return new Promise<Blob>((resolve) => {
      resolveStopRef.current = resolve;
      recorder.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setIsPaused(false);
    });
  }, [clearTimer]);

  const pause = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      if (!isRecording || isPaused) return;

      void CapacitorAudioRecorder.pauseRecording()
        .then(() => {
          setIsPaused(true);
          clearTimer();
        })
        .catch(() => undefined);
      return;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearTimer();
    }
  }, [clearTimer, isPaused, isRecording]);

  const resume = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      if (!isRecording || !isPaused) return;

      void CapacitorAudioRecorder.resumeRecording()
        .then(() => {
          setIsPaused(false);
          startTimer();
        })
        .catch(() => undefined);
      return;
    }

    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  }, [isPaused, isRecording, startTimer]);

  const reset = useCallback(() => {
    clearTimer();

    if (Capacitor.isNativePlatform()) {
      void CapacitorAudioRecorder.getRecordingStatus()
        .then((status) => {
          if (status.status !== RecordingStatus.Inactive) {
            return CapacitorAudioRecorder.cancelRecording();
          }
          return undefined;
        })
        .catch(() => undefined);

      mediaRecorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      resolveStopRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    resolveStopRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
  }, [clearTimer]);

  // Auto-stop recording at max duration (15 min)
  const onMaxDurationRef = useRef(options?.onMaxDurationReached);
  onMaxDurationRef.current = options?.onMaxDurationReached;

  useEffect(() => {
    if (isRecording && !isPaused && duration >= MAX_RECORDING_SECONDS) {
      onMaxDurationRef.current?.();
    }
  }, [duration, isRecording, isPaused]);

  useEffect(() => {
    return () => {
      clearTimer();

      if (Capacitor.isNativePlatform()) {
        void CapacitorAudioRecorder.getRecordingStatus()
          .then((status) => {
            if (status.status !== RecordingStatus.Inactive) {
              return CapacitorAudioRecorder.cancelRecording();
            }
            return undefined;
          })
          .catch(() => undefined);
        return;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [clearTimer]);

  return { isRecording, isPaused, duration, stream: streamRef.current, start, stop, pause, resume, reset };
}
