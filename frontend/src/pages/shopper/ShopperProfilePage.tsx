import { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { GlassButton } from '../../components/ui/GlassButton';
import { api, apiErrorMessage } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

export function ShopperProfilePage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [bio, setBio] = useState('');
  const [operatingArea, setOperatingArea] = useState('');
  const [saving, setSaving] = useState(false);

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
    </div>
  );
}
