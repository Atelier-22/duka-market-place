import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Image as ImageIcon, Lock, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Select } from '../../components/ui/Select';
import { ConsentCheckbox, PrivacyLink } from '../../components/ui/ConsentCheckbox';
import { useToast } from '../../components/ui/Toast';

interface SubmitResult {
  status: 'pending' | 'rejected';
  reason: string | null;
}

export function ShopperVerificationPage() {
  const { push } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState('national_id');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(selected: File) {
    if (selected.size > 8 * 1024 * 1024) {
      push('That photo is larger than 8MB. Take another, or choose a smaller one.', 'error');
      return;
    }
    setFile(selected);
  }

  async function handleSubmit() {
    if (!file) {
      push('Add a photo of your document first', 'error');
      return;
    }
    if (!consented) {
      setConsentError('Please confirm you agree to us checking this document before submitting.');
      return;
    }
    setConsentError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('document', file);
      form.append('documentType', documentType);
      const res = await api.post('/verification', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFile(null);
      setResult({ status: res.data.status, reason: res.data.reason ?? null });
      if (res.data.status === 'rejected') push('We could not accept that document', 'error');
      else push('Submitted for review', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Verification</h1>
      <p className="mt-1 text-sm text-brand-ink/50">
        We check every shopper before they can work. Your document is never given a public link, and
        it is deleted as soon as a decision is made.
      </p>

      <GlassCard padding="lg" hover={false} className="mt-6">
        {result ? (
          <div>
            {result.status === 'pending' ? (
              <p className="text-sm font-medium text-brand-green-deep">
                <CheckCircle2 size={16} strokeWidth={2} className="mr-1 inline" />
                Submitted. A reviewer will check it and your status will update here.
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-brand-red">We could not accept that document.</p>
                {result.reason && <p className="mt-2 text-sm text-brand-ink/70">{result.reason}</p>}
                <GlassButton
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    setResult(null);
                    setConsented(false);
                  }}
                >
                  Try again
                </GlassButton>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Select
              label="Document type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="drivers_licence">Driving permit</option>
              <option value="refugee_id">Refugee ID</option>
            </Select>

            <div>
              <p className="mb-1.5 text-sm font-medium text-brand-green-deep">Photo of the document</p>
              <div className="glass relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl2 border-dashed">
                {previewUrl ? (
                  <img src={previewUrl} alt="The document you selected" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon size={24} strokeWidth={1.5} className="text-brand-green/40" />
                )}
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X size={14} strokeWidth={2.25} />
                  </button>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => libraryRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-brand-green/15 px-3.5 py-2 text-xs font-medium text-brand-green-deep hover:bg-brand-green-mist"
                >
                  <ImageIcon size={14} strokeWidth={2} /> Choose a photo
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-brand-green/15 px-3.5 py-2 text-xs font-medium text-brand-green-deep hover:bg-brand-green-mist"
                >
                  <Camera size={14} strokeWidth={2} /> Take a photo
                </button>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-brand-ink/50">
                <Lock size={12} strokeWidth={2} className="mt-0.5 shrink-0" />
                This photo is sent straight to our review team. It is not stored anywhere a link can
                reach.
              </p>
            </div>

            <ConsentCheckbox
              checked={consented}
              onChange={(v) => {
                setConsented(v);
                if (v) setConsentError(null);
              }}
              error={consentError ?? undefined}
            >
              I confirm this is my own identity document, and I agree to Duka checking it to verify
              me. I understand the details read from it are kept, and that only I and a Duka
              reviewer can open the photograph. See the <PrivacyLink />.
            </ConsentCheckbox>

            <GlassButton disabled={submitting || !file || !consented} onClick={handleSubmit} fullWidth>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </GlassButton>
          </div>
        )}
      </GlassCard>

      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) choose(f);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) choose(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
