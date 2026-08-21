import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';

interface ImageUploadProps {
  folder: string;
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  /** Round crop, for avatars. */
  shape?: 'card' | 'circle';
}

/**
 * Uploads through POST /api/uploads (multipart), which delegates to the
 * backend StorageService abstraction — local disk, or Postgres in production.
 *
 * Two inputs rather than one, because `capture` is not a hint: with it, a phone
 * opens the camera and gives no way to reach the gallery, so a photo you
 * already took was unreachable. Without it you get the OS picker. Offering both
 * explicitly means neither route is hidden behind the other.
 */
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
      {label && <p className="mb-1.5 text-sm font-medium text-brand-green-deep">{label}</p>}

      <div className={round ? 'flex items-center gap-4' : ''}>
        <div
          className={[
            'glass relative flex items-center justify-center overflow-hidden',
            round ? 'h-24 w-24 shrink-0 rounded-full' : 'h-36 w-full rounded-xl2 border-dashed',
          ].join(' ')}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : uploading ? (
            <span className="text-sm text-brand-ink/50">Uploading…</span>
          ) : (
            <ImageIcon size={round ? 26 : 24} strokeWidth={1.5} className="text-brand-green/40" />
          )}

          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <X size={14} strokeWidth={2.25} />
            </button>
          )}
        </div>

        <div className={round ? 'flex flex-col gap-2' : 'mt-2 flex gap-2'}>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-full border border-brand-green/15 px-3.5 py-2 text-xs font-medium text-brand-green-deep transition-colors hover:bg-brand-green-mist disabled:opacity-50"
          >
            <ImageIcon size={14} strokeWidth={2} /> Choose from library
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-full border border-brand-green/15 px-3.5 py-2 text-xs font-medium text-brand-green-deep transition-colors hover:bg-brand-green-mist disabled:opacity-50"
          >
            <Camera size={14} strokeWidth={2} /> Take a photo
          </button>
        </div>
      </div>

      {/* No `capture`: this opens the gallery/file picker on every platform. */}
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      {/* `capture` opens the camera directly, for when that is what you want. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {error && <p className="mt-1 text-xs font-medium text-brand-red">{error}</p>}
    </div>
  );
}
