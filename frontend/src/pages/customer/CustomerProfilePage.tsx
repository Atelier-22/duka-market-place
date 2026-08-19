import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { GlassButton } from '../../components/ui/GlassButton';
import { useAuth } from '../../context/AuthContext';

export function CustomerProfilePage() {
  const { user } = useAuth();
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
    </div>
  );
}
