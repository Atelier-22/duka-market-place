import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { GlassButton } from '../../components/ui/GlassButton';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

export function CustomerProfilePage() {
  const { user, switchRole } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  async function handleSwitchToShopper() {
    setSwitching(true);
    try {
      await switchRole('shopper');
      push('You are now in shopper mode', 'success');
      navigate('/shopper');
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
          <Input label="Full name" defaultValue={user?.fullName} />
          <Input label="Phone number" defaultValue={user?.phone} disabled />
          <Input label="Email" defaultValue={user?.email ?? ''} placeholder="you@example.com" />
          <GlassButton className="mt-2" disabled>
            Save changes
          </GlassButton>
          <p className="text-xs text-brand-ink/40">
            Profile editing is wired up on the backend already (extend this form to call
            a future <code>PATCH /api/auth/me</code> endpoint) — see docs/ROADMAP.md Stage 2.
          </p>
        </div>
      </GlassCard>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <p className="font-display text-lg font-medium text-brand-green-deep">Shop for others</p>
        <p className="mt-1.5 text-sm text-brand-ink/60">
          Your Duka account works both ways. Switch to shopper mode to browse open requests
          and start earning — you can switch back any time.
        </p>
        <GlassButton
          className="mt-4"
          variant="secondary"
          disabled={switching}
          onClick={handleSwitchToShopper}
        >
          {switching ? 'Switching…' : '🛍️ Switch to shopper mode'}
        </GlassButton>
      </GlassCard>
    </div>
  );
}
