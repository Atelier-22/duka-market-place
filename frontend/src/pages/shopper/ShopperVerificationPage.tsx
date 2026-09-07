import { useEffect, useRef, useState } from 'react';
import { Camera, Check, CheckCircle2, Image as ImageIcon, Lock, X, XCircle } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConsentCheckbox, PrivacyLink } from '../../components/ui/ConsentCheckbox';
import { labelClasses } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';

interface SubmitResult {
  status: 'pending' | 'rejected';
  reason: string | null;
}

const STEPS = ['Your document', 'Our review', 'Verified'];

function Stepper({ current, failed = false }: { current: number; failed?: boolean }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Verification progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === STEPS.length - 1;
        return (
          <li
            key={label}
            className={`flex items-center gap-2 ${last ? 'shrink-0' : 'min-w-0 flex-1'}`}
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-bold',
                done
                  ? 'bg-brand-green text-white'
                  : active
                  ? failed
                    ? 'bg-brand-red text-white'
                    : 'border-2 border-brand-green bg-surface text-brand-green'
                  : 'border border-line-strong bg-surface text-ink-3',
              ].join(' ')}
            >
              {done ? <Check size={14} strokeWidth={2.5} aria-label="Done" /> : i + 1}
            </span>
            <span className={`hidden truncate text-small sm:block ${active ? 'font-semibold text-ink' : done ? 'text-ink-2' : 'text-ink-3'}`}>
              {label}
            </span>
            {!last && <span aria-hidden className={`h-px min-w-[12px] flex-1 ${done ? 'bg-brand-green' : 'bg-line'}`} />}
          </li>
        );
      })}
    </ol>
  );
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

  const failed = result?.status === 'rejected';
  const step = result?.status === 'pending' ? 1 : 0;
  const stepTitle = failed
    ? 'We could not accept that document'
    : result
    ? 'Under review'
    : 'Add a photo of your document';
  const stepBody = failed
    ? result?.reason ?? 'Take a clearer photo of the whole document and send it again.'
    : result
    ? 'Submitted. A reviewer will check it and your status will update here.'
    : 'Choose the document type, add a clear photo of the whole document, and send it for review.';

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        title="Verification"
        subtitle="We check every shopper before they can work. Your document is never given a public link, and it is deleted as soon as a decision is made."
      />

      <div className="flex flex-col gap-6">
        <Card hover={false} tone={failed ? 'danger' : result ? 'success' : 'default'}>
          <Stepper current={step} failed={failed} />
          <div className="mt-5 flex items-start gap-3">
            {result && (
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  failed ? 'bg-danger-soft text-brand-red' : 'bg-brand-green-mist text-brand-green'
                }`}
                aria-hidden
              >
                {failed ? <XCircle size={20} strokeWidth={2} /> : <CheckCircle2 size={20} strokeWidth={2} />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-label font-semibold uppercase text-ink-3">
                Step {step + 1} of {STEPS.length}
              </p>
              <p className="mt-1 font-display text-h3 font-medium text-brand-green-deep">{stepTitle}</p>
              <p className="mt-1 text-small text-ink-2">{stepBody}</p>
              {failed && (
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    setResult(null);
                    setConsented(false);
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          </div>
        </Card>

        {!result && (
          <Card hover={false}>
            <div className="flex flex-col gap-5">
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
                <p className={labelClasses}>Photo of the document</p>
                <div
                  className={`relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-2 ${
                    previewUrl ? 'border border-line' : 'border border-dashed border-line-strong'
                  }`}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="The document you selected" className="h-full w-full object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-1.5 text-caption text-ink-3">
                      <ImageIcon size={26} strokeWidth={1.5} aria-hidden />
                      No photo yet
                    </span>
                  )}
                  {file && (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="Remove photo"
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      <X size={15} strokeWidth={2.25} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => libraryRef.current?.click()}>
                    <ImageIcon size={15} strokeWidth={2} /> Choose a photo
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => cameraRef.current?.click()}>
                    <Camera size={15} strokeWidth={2} /> Take a photo
                  </Button>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-caption text-ink-3">
                  <Lock size={12} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
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

              <Button fullWidth loading={submitting} disabled={!file || !consented} onClick={handleSubmit}>
                Submit for review
              </Button>
            </div>
          </Card>
        )}
      </div>

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
