import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { GlassButton } from '../../components/ui/GlassButton';
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
    <div className="mx-auto max-w-xl pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Profile</h1>
      <GlassCard padding="lg" hover={false} className="mt-6">
        <div className="flex flex-col gap-4">
          <Input label="Full name" defaultValue={user?.fullName} disabled />
          <Input label="Phone number" defaultValue={user?.phone} disabled />
          <Input label="Operating area" placeholder="e.g. Kampala Central, near Owino" value={operatingArea} onChange={(e) => setOperatingArea(e.target.value)} />
          <Textarea label="Bio" placeholder="Tell customers about your experience shopping in local markets." value={bio} onChange={(e) => setBio(e.target.value)} />
          <GlassButton disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </GlassButton>
        </div>
      </GlassCard>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <p className="font-display text-lg font-medium text-brand-green-deep">Need something yourself?</p>
        <p className="mt-1.5 text-sm text-brand-ink/60">
          The same account can post shopping requests. Switch to customer mode to have
          someone else do the running around — you can switch back any time.
        </p>
        <GlassButton
          className="mt-4"
          variant="secondary"
          disabled={switching}
          onClick={handleSwitchToCustomer}
        >
          {switching ? 'Switching…' : <><ShoppingCart size={17} strokeWidth={2} /> Switch to customer mode</>}
        </GlassButton>
      </GlassCard>
    </div>
  );
}
