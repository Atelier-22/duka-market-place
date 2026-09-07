import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { DukaLockup } from '../../components/ui/DukaLogo';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/home';
import { useBrandTransition } from '../../components/ui/BrandTransition';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { play } = useBrandTransition();
  const transitioning = useRef(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    transitioning.current = true;
    try {
      const me = await login(identifier.trim(), password);
      const first = me.fullName.split(' ')[0];
      await play({
        label: first ? `Welcome back, ${first}` : 'Welcome back',
        task: () => navigate(homeFor(me.role), { replace: true }),
      });
    } catch (err) {
      transitioning.current = false;
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && !transitioning.current) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-16">
      <GlassCard glow="green" padding="lg" className="w-full">

        <DukaLockup markSize={56} className="mb-5" />
        <h1 className="text-center font-display text-2xl font-medium text-brand-green-deep">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-brand-ink/60">Log in to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Phone number or email"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="0700 000 000 or you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <PasswordInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm font-medium text-brand-red">{error}</p>}
          <GlassButton type="submit" disabled={loading} fullWidth>
            {loading ? 'Logging in…' : 'Log in'}
          </GlassButton>
        </form>

        <p className="mt-6 text-center text-sm text-brand-ink/60">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-green-deep">Sign up</Link>
        </p>
      </GlassCard>
    </div>
  );
}
