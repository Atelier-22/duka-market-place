import { FormEvent, useEffect, useRef, useState } from 'react';
import { BadgeCheck, FileText, Upload, X, Check } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { VerifiedBadge } from '../../components/market/VerifiedBadge';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { timeAgo } from '../../market/format';

export function SellerVerificationPanel() {
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<{ status: string; records: any[] } | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [checks, setChecks] = useState<{ id: string; label: string; passed: boolean }[] | null>(null);

  function load() { api.get('/seller/verification').then((r) => setData(r.data)).catch(() => setData({ status: 'unverified', records: [] })); }
  useEffect(load, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (businessName.trim().length < 2) { push('Enter your business name', 'error'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('businessName', businessName.trim());
      if (registrationNumber.trim()) form.append('registrationNumber', registrationNumber.trim());
      if (note.trim()) form.append('note', note.trim());
      if (file) form.append('document', file);
      const res = await api.post('/seller/verification', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setChecks(res.data.checks ?? null);
      if (res.data.autoVerified) setCelebrate(true);
      else push('Submitted. Duka will review it and let you know.', 'success');
      setBusinessName(''); setRegistrationNumber(''); setNote(''); setFile(null);
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  if (!data) return <p className="text-sm text-ink-3">Loading…</p>;
  const pending = data.records.some((r) => r.status === 'pending');

  return (
    <div className="flex flex-col gap-4">
      <Modal open={celebrate} onClose={() => setCelebrate(false)} title="You are verified">
        <div className="flex flex-col items-center py-2 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-green-mist text-brand-green"><BadgeCheck size={44} strokeWidth={2} /></span>
          <VerifiedBadge className="mt-4" />
          <p className="mt-4 text-body text-ink-2">Your details checked out. Everyone browsing Duka now sees the green badge on your store and every product.</p>
          <Button className="mt-5" onClick={() => setCelebrate(false)}>Brilliant</Button>
        </div>
      </Modal>
      {checks && checks.some((c) => !c.passed) && data.status !== 'verified' && (
        <Card padding="lg" tone="warning">
          <p className="text-sm font-medium text-brand-green-deep">Duka could not verify automatically yet. Add these and submit again, or wait for a manual review.</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {checks.map((c) => <li key={c.id} className="flex items-center gap-2">{c.passed ? <Check size={15} className="text-brand-green" /> : <X size={15} className="text-brand-red" />}<span className={c.passed ? 'text-ink-3' : 'text-ink'}>{c.label}</span></li>)}
          </ul>
        </Card>
      )}
      <Card padding="lg">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${data.status === 'verified' ? 'bg-brand-green-mist text-brand-green' : 'bg-surface-2 text-ink-3'}`}><BadgeCheck size={22} /></span>
          <div>
            <p className="font-medium text-ink">{data.status === 'verified' ? 'Your store is verified' : data.status === 'pending' ? 'Under review' : data.status === 'rejected' ? 'Not approved yet' : 'Not verified'}</p>
            <p className="mt-0.5 text-small text-ink-2">{data.status === 'verified' ? 'Buyers see the green Verified by Duka badge on your store and every product.' : 'Duka checks your store automatically: a real business name, a logo or document, a proper description, a way to reach you, and a location. Pass them all and you are verified on the spot.'}</p>
            {data.status === 'verified' && <VerifiedBadge className="mt-2" />}
          </div>
        </div>
      </Card>

      {data.records.length > 0 && (
        <Card padding="lg">
          <p className="text-label font-semibold uppercase text-ink-3">Submissions</p>
          <ul className="mt-2 divide-y divide-line">
            {data.records.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-2.5 text-sm"><span><span className="block text-ink">{r.business_name}{r.registration_number ? ` · ${r.registration_number}` : ''}</span><span className="block text-caption text-ink-3">{timeAgo(r.created_at)}{r.review_note ? ` · ${r.review_note}` : ''}</span></span><StatusBadge status={r.status} /></li>
            ))}
          </ul>
        </Card>
      )}

      {data.status !== 'verified' && !pending && (
        <Card padding="lg">
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input label="Registered business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={150} required />
            <Input label="Registration number (optional)" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} maxLength={60} />
            <Textarea label="Anything Duka should know (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
            <div>
              <p className="text-sm font-medium text-ink">Document (optional)</p>
              <p className="text-caption text-ink-3">Certificate, trading licence, or a photo of your shop. JPEG, PNG, WEBP, HEIC or PDF up to 8 MB. Deleted after the decision.</p>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>{file ? <><FileText size={15} /> {file.name}</> : <><Upload size={15} /> Choose file</>}</Button>
            </div>
            <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit for verification'}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
