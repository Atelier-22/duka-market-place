import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Select } from '../../components/ui/Select';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useToast } from '../../components/ui/Toast';

export function ShopperVerificationPage() {
  const { push } = useToast();
  const [documentType, setDocumentType] = useState('national_id');
  const [documentUrl, setDocumentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!documentUrl) {
      push('Upload a photo of your document first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/shoppers/verification', { documentType, documentUrl });
      setSubmitted(true);
      push('Submitted for review!', 'success');
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
        We verify every shopper to keep the marketplace safe. Your documents are only visible to our review team.
      </p>

      <GlassCard padding="lg" hover={false} className="mt-6">
        {submitted ? (
          <p className="text-sm font-medium text-brand-green-deep">
            <CheckCircle2 size={16} strokeWidth={2} className="mr-1 inline" /> Submitted! We'll review your document and update your status soon.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Select label="Document type" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's license</option>
              <option value="selfie">Selfie holding your ID</option>
            </Select>
            <ImageUpload folder="verification" label="Upload document photo" value={documentUrl} onChange={setDocumentUrl} />
            <GlassButton disabled={submitting} onClick={handleSubmit} fullWidth>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
