import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from './Button';
import { errorClasses, labelClasses } from './Input';

interface ImageUploadProps {
  folder: string;
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  shape?: 'card' | 'circle';
}

export function ImageUpload({ folder, label, value, onChange, shape = 'card' }: ImageUploadProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/uploads?folder=${folder}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.url);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const round = shape === 'circle';

  return (
    <div>
      {label && <p className={labelClasses}>{label}</p>}

      <div className={round ? 'flex items-center gap-4' : ''}>
        <div
          className={[
            'relative flex items-center justify-center overflow-hidden bg-surface-2 transition-colors duration-150',
            value ? 'border border-line' : 'border border-dashed border-line-strong',
            round ? 'h-24 w-24 shrink-0 rounded-full' : 'h-36 w-full rounded-2xl',
          ].join(' ')}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : uploading ? (
            <span className="flex flex-col items-center gap-1.5 text-caption text-ink-3" role="status">
              <Loader2 size={20} strokeWidth={2} className="animate-spin text-brand-green" aria-hidden />
              {round ? <span className="sr-only">Uploading</span> : 'Uploading…'}
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-caption text-ink-3">
              <ImageIcon size={round ? 24 : 26} strokeWidth={1.5} aria-hidden />
              {!round && 'No photo yet'}
            </span>
          )}

          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Remove photo"
              className={`absolute flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:shadow-focus ${
                round ? 'right-2.5 top-2.5' : 'right-2 top-2'
              }`}
            >
              <X size={15} strokeWidth={2.25} />
            </button>
          )}
        </div>

        <div className={round ? 'flex flex-col gap-2' : 'mt-2 flex flex-wrap gap-2'}>
          <Button variant="secondary" size="sm" onClick={() => libraryRef.current?.click()} disabled={uploading}>
            <ImageIcon size={15} strokeWidth={2} /> Choose from library
          </Button>
          <Button variant="secondary" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploading}>
            <Camera size={15} strokeWidth={2} /> Take a photo
          </Button>
        </div>
      </div>

      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {error && <p role="alert" className={errorClasses}>{error}</p>}
    </div>
  );
}
