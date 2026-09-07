import { useCallback, useEffect, useRef, useState } from 'react';

const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/aac',
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

export const voiceRecordingSupported = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export interface Recording {
  blob: Blob;
  durationMs: number;

  previewUrl: string;
  filename: string;
}

const MAX_MS = 3 * 60_000;

export function useVoiceRecorder(onAutoStop?: (recording: Recording) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelledRef = useRef(false);
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null);

  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  const teardown = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!voiceRecordingSupported()) {
      setError('This browser cannot record audio — try Chrome or Safari.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),

        audioBitsPerSecond: 24_000,
      });
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        teardown();
        const resolve = resolveRef.current;
        resolveRef.current = null;

        const usable = !cancelledRef.current && blob.size > 0 && durationMs >= 400;
        const recording: Recording | null = usable
          ? {
              blob,
              durationMs,
              previewUrl: URL.createObjectURL(blob),
              filename: `voice-note.${extensionFor(type)}`,
            }
          : null;

        if (resolve) resolve(recording);
        else if (recording) onAutoStopRef.current?.(recording);
      };

      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
      recorder.start();

      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= MAX_MS) recorderRef.current?.stop();
      }, 200);
      return true;
    } catch {
      setError('Microphone blocked — allow microphone access to send a voice note.');
      return false;
    }
  }, [teardown]);

  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else teardown();
  }, [teardown]);

  return { recording, elapsedMs, error, start, stop, cancel, maxMs: MAX_MS };
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
