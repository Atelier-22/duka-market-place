import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';
import { OrderPerspective } from '../../types';

const REASONS: Record<OrderPerspective, string[]> = {
  customer: [
    'Wrong item or not as described',
    'Item damaged or missing',
    'Price differs from what I approved',
    'Shopper is not responding',
    'Never delivered',
    'Something else',
  ],
  shopper: [
    'Customer is not responding',
    'Customer refused to pay',
    'Customer refused the item',
    'Address is wrong or unreachable',
    'Something else',
  ],
};

interface DisputeButtonProps {
  orderId: string;
  perspective: OrderPerspective;
  onRaised?: () => void;
  size?: 'sm' | 'md';
}

/** Low-emphasis entry point to raise a dispute on an order that has gone wrong. */
export function DisputeButton({ orderId, perspective, onRaised, size = 'sm' }: DisputeButtonProps) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[perspective][0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (description.trim().length < 10) {
      push('Tell us a little more so support can help (at least 10 characters).', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/disputes', { orderId, reason, description: description.trim() });
      push('Reported. Duka support will review this order and contact you.', 'success');
      setOpen(false);
      setDescription('');
      onRaised?.();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size={size} onClick={() => setOpen(true)} className="text-ink-2">
        <CircleAlert size={16} strokeWidth={2} /> Something went wrong
      </Button>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="What went wrong?">
        <p className="text-sm text-ink-2">
          This pauses the order and sends it to Duka support with the photos, receipts and messages already on it. A person will look at it and get back to both of you.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS[perspective].map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Textarea
            label="What happened?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Say what you expected and what you got. Dates, amounts and names help."
            maxLength={2000}
          />
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(false)}>Not now</Button>
          <Button variant="danger" size="sm" disabled={busy} onClick={submit}>
            {busy ? 'Sending…' : 'Send to support'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
