import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Which container this browser can actually record.
 *
 * Chrome and Firefox give webm/opus; Safari refuses webm entirely and records
 * mp4/aac. Passing an unsupported mimeType to MediaRecorder throws, so the
 * first supported entry wins and an empty string lets the browser choose.
 */
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
  /** Local object URL for previewing before sending. */
  previewUrl: string;
  filename: string;
}

/** Voice notes longer than this are almost always an accident. */
const MAX_MS = 3 * 60_000;

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set when the user cancels, so `stop()`'s resolver knows to discard.
  const cancelledRef = useRef(false);
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null);

  const teardown = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    // Releasing the tracks is what turns off the browser's recording indicator.
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setRecording(false);
  }, []);

  // A component unmounting mid-recording must not leave the mic live.
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
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
        if (!resolve) return;
        // Cancelled, or so short it was a mis-tap rather than a message.
        if (cancelledRef.current || blob.size === 0 || durationMs < 400) {
          resolve(null);
          return;
        }
        resolve({
          blob,
          durationMs,
          previewUrl: URL.createObjectURL(blob),
          filename: `voice-note.${extensionFor(type)}`,
        });
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

  /** Resolves with the recording, or null if it was cancelled or too short. */
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
