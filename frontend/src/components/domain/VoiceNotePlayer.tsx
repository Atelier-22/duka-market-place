import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { downloadUrl } from '../../utils/download';
import { formatDuration } from '../../hooks/useVoiceRecorder';

interface VoiceNotePlayerProps {
  src: string;
  durationMs?: number | null;
  tone: 'own' | 'other';
}

function bars(seed: string, count = 34): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: count }, (_, i) => {
    hash = (hash * 1103515245 + 12345) | 0;

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
  const unplayedBar = own ? 'bg-white/35' : 'bg-line-strong';
  const metaText = own ? 'text-white/70' : 'text-ink-3';

  return (
    <div className="flex w-60 min-w-[180px] max-w-full items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 ease-standard active:scale-[0.96] focus-visible:outline-none focus-visible:shadow-focus ${buttonClass}`}
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
          className="flex h-8 cursor-pointer items-center gap-[2px] rounded-sm"
        >
          {shape.map((height, i) => (
            <span
              key={i}
              className={`w-full rounded-full transition-colors ${i / shape.length <= progress ? playedBar : unplayedBar}`}
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
        <div className={`flex items-center justify-between text-caption ${metaText}`}>
          <span className="tabular-nums">
            {formatDuration(playing || positionMs > 0 ? positionMs : total)}
          </span>
          <button
            type="button"
            onClick={() => downloadUrl(src)}
            title="Download voice note"
            aria-label="Download voice note"
            className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Download size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
