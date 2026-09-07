import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { api, apiErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

export function ShopperProfilePage() {
  const { user, switchRole } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [bio, setBio] = useState('');
  const [operatingArea, setOperatingArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch('/shoppers/profile', { bio, operatingArea });
      push('Profile updated', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitchToCustomer() {
    setSwitching(true);
    try {
      await switchRole('customer');
      push('You are now in customer mode', 'success');
      navigate('/app');
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not switch role', 'error');
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader title="Profile" subtitle="What customers see when you make an offer." />

      <Card hover={false}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" defaultValue={user?.fullName} disabled />
            <Input label="Phone number" defaultValue={user?.phone} disabled />
          </div>
          <Input
            label="Operating area"
            placeholder="e.g. Kampala Central, near Owino"
            value={operatingArea}
            onChange={(e) => setOperatingArea(e.target.value)}
          />
          <Textarea
            label="Bio"
            placeholder="Which markets you know well, what you are good at finding, how long you have been doing this."
            hint="Shown publicly to customers. Do not put your phone number, WhatsApp or social handles here — customers already get your number once an order is matched, and contact details posted publicly can be used to scam you."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <div className="flex justify-end">
            <Button loading={saving} onClick={handleSave}>Save changes</Button>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <Card hover={false}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green" aria-hidden>
              <ShoppingCart size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-h3 font-medium text-brand-green-deep">Need something yourself?</h2>
              <p className="mt-1 text-small text-ink-2">
                The same account can post shopping requests. Switch to customer mode to have
                someone else do the running around — you can switch back any time.
              </p>
            </div>
            <Button variant="secondary" loading={switching} onClick={handleSwitchToCustomer} className="sm:shrink-0">
              Switch to customer mode
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
