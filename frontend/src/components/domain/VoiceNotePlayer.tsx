import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { downloadUrl } from '../../utils/download';
import { formatDuration } from '../../hooks/useVoiceRecorder';

interface VoiceNotePlayerProps {
  src: string;
  /** Recorded length in ms, captured at record time. */
  durationMs?: number | null;
  /** Own messages sit on the green bubble and need light-on-dark styling. */
  tone: 'own' | 'other';
}

/**
 * A fixed set of bar heights so a voice note looks like a voice note.
 *
 * Deliberately not a real waveform: computing one means downloading and
 * decoding the whole file before anything renders, which on a Ugandan mobile
 * connection is a long stare at an empty bubble. The bars are seeded from the
 * URL so each note keeps its own stable shape rather than all looking alike.
 */
function bars(seed: string, count = 34): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: count }, (_, i) => {
    hash = (hash * 1103515245 + 12345) | 0;
    // 0.25–1.0 of the track height, with a gentle taper at both ends so it
    // reads as speech rather than noise.
    const base = 0.25 + (Math.abs(hash >> 8) % 1000) / 1000 * 0.75;
    const taper = Math.sin((i / (count - 1)) * Math.PI) * 0.35 + 0.65;
    return Math.max(0.18, base * taper);
  });
}

export function VoiceNotePlayer({ src, durationMs, tone }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [loadedMs, setLoadedMs] = useState<number | null>(null);
  const shape = useMemo(() => bars(src), [src]);

  // Prefer the recorded duration: webm from MediaRecorder has no duration in
  // its header, so `audio.duration` is Infinity until the file has fully played
  // through at least once.
  const total = durationMs && durationMs > 0 ? durationMs : loadedMs ?? 0;
  const progress = total > 0 ? Math.min(1, positionMs / total) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setPositionMs(audio.currentTime * 1000);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setLoadedMs(audio.duration * 1000);
    };
    const onEnd = () => { setPlaying(false); setPositionMs(0); audio.currentTime = 0; };
    // Another note stealing playback pauses this one behind our back, so the
    // button state has to follow the element rather than only our own clicks.
    const onPause = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Pause every other note on the page — two people talking at once is
      // exactly the confusion voice notes are meant to avoid.
      document.querySelectorAll('audio').forEach((a) => { if (a !== audio) a.pause(); });
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || total <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = (total * ratio) / 1000;
    setPositionMs(total * ratio);
  }

  const own = tone === 'own';
  const buttonClass = own
    ? 'bg-white/25 text-white hover:bg-white/35'
    : 'bg-brand-green text-white hover:bg-brand-green-deep';
  const playedBar = own ? 'bg-white' : 'bg-brand-green';
  const unplayedBar = own ? 'bg-white/35' : 'bg-brand-ink/20';
  const metaText = own ? 'text-white/70' : 'text-brand-ink/45';

  return (
    <div className="flex min-w-[210px] items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${buttonClass}`}
      >
        {playing ? <Pause size={16} strokeWidth={2.5} /> : <Play size={16} strokeWidth={2.5} className="ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(positionMs)}
          tabIndex={0}
          onClick={seek}
          className="flex h-8 cursor-pointer items-center gap-[2px]"
        >
          {shape.map((height, i) => (
            <span
              key={i}
              className={`w-full rounded-full transition-colors ${i / shape.length <= progress ? playedBar : unplayedBar}`}
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
        <div className={`flex items-center justify-between text-[11px] ${metaText}`}>
          <span className="tabular-nums">
            {formatDuration(playing || positionMs > 0 ? positionMs : total)}
          </span>
          <button
            type="button"
            onClick={() => downloadUrl(src)}
            title="Download voice note"
            aria-label="Download voice note"
            className="flex items-center gap-1 hover:underline"
          >
            <Download size={11} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
