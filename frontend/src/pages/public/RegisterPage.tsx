import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { DukaMark } from '../../components/ui/DukaLogo';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = (params.get('role') as UserRole) === 'shopper' ? 'shopper' : 'customer';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ role, fullName, phone, email: email || undefined, password });
      navigate(role === 'shopper' ? '/shopper' : '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  // Redirect declaratively — calling navigate() during render warns and can loop.
  if (user) return <Navigate to={user.role === 'shopper' ? '/shopper' : '/app'} replace />;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-16">
      <GlassCard glow="green" padding="lg" className="w-full">
        {/* The logo, on the two pages where someone is deciding whether
            they trust this site with a password. */}
        <DukaMark size={48} />
        <h1 className="mt-4 font-display text-2xl font-medium text-brand-green-deep">Create your account</h1>
        <p className="mt-1 text-sm text-brand-ink/60">Join as a customer or a shopper.</p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-brand-green-mist p-1">
          {(['customer', 'shopper'] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={[
                'rounded-full py-2 text-sm font-semibold capitalize transition-all',
                role === r ? 'bg-white text-brand-green-deep shadow-glass' : 'text-brand-ink/50',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Phone number" type="tel" placeholder="0700 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput label="Password" hint="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm font-medium text-brand-red">{error}</p>}
          <GlassButton type="submit" disabled={loading} fullWidth>
            {loading ? 'Creating account…' : `Sign up as a ${role}`}
          </GlassButton>
        </form>

        <p className="mt-6 text-center text-sm text-brand-ink/60">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-green-deep">Log in</Link>
        </p>
      </GlassCard>
    </div>
  );
}
