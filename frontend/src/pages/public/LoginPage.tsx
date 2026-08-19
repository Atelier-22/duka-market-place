import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  if (user) navigate(user.role === 'shopper' ? '/shopper' : user.role === 'admin' ? '/admin' : '/app');

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-16">
      <GlassCard glow="green" padding="lg" className="w-full">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Welcome back</h1>
        <p className="mt-1 text-sm text-brand-ink/60">Log in to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Phone number"
            type="tel"
            placeholder="0700 000 000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
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
