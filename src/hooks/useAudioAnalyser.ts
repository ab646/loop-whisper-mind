import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Connects to a MediaStream and provides real-time frequency data
 * for driving a waveform visualiser.
 */
export function useAudioAnalyser(bars: number = 20) {
  const [levels, setLevels] = useState<number[]>(() => new Array(bars).fill(0));
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const connect = useCallback((stream: MediaStream) => {
    disconnect();
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.4;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      // Map frequency bins to the requested number of bars
      const binCount = dataArray.length;
      const step = binCount / bars;
      const next: number[] = [];
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor(i * step);
        // normalise 0-255 → 0-1
        next.push(dataArray[idx] / 255);
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [bars]);

  const disconnect = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    setLevels(new Array(bars).fill(0));
  }, [bars]);

  useEffect(() => () => disconnect(), [disconnect]);

  return { levels, connect, disconnect };
}
