import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { api } from '../../services/api';

interface ImageUploadProps {
  folder: string;
  label?: string;
  value?: string;
  onChange: (url: string) => void;
}

/**
 * Uploads through POST /api/uploads (multipart), which delegates to the
 * backend StorageService abstraction. Works identically whether the backend
 * is writing to local disk (dev) or S3 (production) — see
 * backend/src/services/storage.service.ts.
 */
export function ImageUpload({ folder, label, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium text-brand-green-deep">{label}</p>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="glass-hover glass flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl2 border-dashed text-brand-green-deep/70"
      >
        {value ? (
          <img src={value} alt="Uploaded" className="h-full w-full rounded-xl2 object-cover" />
        ) : uploading ? (
          <span className="text-sm">Uploading…</span>
        ) : (
          <>
            <Camera size={24} strokeWidth={1.5} className="text-brand-green/40" />
            <span className="text-sm font-medium">Tap to add a photo</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && <p className="mt-1 text-xs font-medium text-brand-red">{error}</p>}
    </div>
  );
}
