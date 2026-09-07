import { CSSProperties, FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, MessageCircle, Phone, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBrandTransition } from '../../components/ui/BrandTransition';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConsentCheckbox, PrivacyLink } from '../../components/ui/ConsentCheckbox';
import { DukaMark } from '../../components/ui/DukaLogo';
import { AuthIllustration } from '../../components/ui/AuthIllustration';
import { AUTH_SPRING, AUTH_TEXT_DURATION, springTransition } from '../../config/motion';
import { BRAND } from '../../config/brand';
import { UserRole } from '../../types';
import { homeFor } from '../../utils/home';
import '../../styles/auth.css';

export type AuthMode = 'login' | 'signup';

function firstName(full: string): string {
  return full.trim().split(' ')[0] ?? '';
}

/** Hidden panels are inert so keyboard focus and screen readers skip them. */
function inertWhen(hidden: boolean): Record<string, string> {
  return hidden ? { inert: '' } : {};
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, login, register } = useAuth();
  const { play } = useBrandTransition();
  const transitioning = useRef(false);

  const initialRole: UserRole = params.get('role') === 'shopper' ? 'shopper' : 'customer';
  const [role, setRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    if (user && !transitioning.current) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    document.title = mode === 'login' ? `Sign in · ${BRAND.name}` : `Create account · ${BRAND.name}`;
  }, [mode]);

  function switchTo(next: AuthMode) {
    navigate(next === 'login' ? '/login' : `/register${role === 'shopper' ? '?role=shopper' : ''}`, { replace: true });
  }

  const spring = springTransition(AUTH_SPRING);
  const style = {
    '--auth-ms': `${spring.duration}ms`,
    '--auth-ease': spring.easing,
    '--auth-text-ms': `${AUTH_TEXT_DURATION}ms`,
  } as CSSProperties;

  /* ---------------- Login ---------------- */
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    transitioning.current = true;
    try {
      const me = await login(identifier.trim(), password, remember);
      const first = firstName(me.fullName);
      await play({
        label: first ? `Welcome back, ${first}` : 'Welcome back',
        task: () => navigate(homeFor(me.role), { replace: true }),
      });
    } catch (err) {
      transitioning.current = false;
      setLoginError(err instanceof Error ? err.message : 'Could not sign you in');
      setLoggingIn(false);
    }
  }

  /* ---------------- Sign up ---------------- */
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consented, setConsented] = useState(false);
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState(false);

  function validateSignup(): boolean {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Tell us your name so your shopper knows who to look for.';
    if (phone.replace(/\D/g, '').length < 9) next.phone = 'Enter the phone number you will log in with.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'That email does not look right.';
    if (newPassword.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== newPassword) next.confirm = 'The two passwords do not match.';
    if (!consented) next.consent = 'Please agree to the Privacy Policy and Terms before creating an account.';
    setSignupErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSignupError(null);
    if (!validateSignup()) return;
    setSigningUp(true);
    transitioning.current = true;
    try {
      await register({ role, fullName: fullName.trim(), phone: phone.trim(), email: email.trim() || undefined, password: newPassword });
      const first = firstName(fullName);
      await play({
        label: first ? `Welcome to ${BRAND.name}, ${first}` : `Welcome to ${BRAND.name}`,
        task: () => navigate(homeFor(role), { replace: true }),
      });
    } catch (err) {
      transitioning.current = false;
      setSignupError(err instanceof Error ? err.message : 'Could not create your account');
      setSigningUp(false);
    }
  }

  const isLogin = mode === 'login';
  const waDigits = BRAND.supportPhone.replace(/[^\d]/g, '');

  return (
    <div className="auth" style={style}>
      <Link to="/" className="auth__home">
        <ArrowLeft size={15} strokeWidth={2} /> Back to {BRAND.name}
      </Link>

      <div className="auth__stage" data-mode={mode}>
        <div className="auth__surface" aria-hidden />

        <div className="auth__welcomes">
          <aside className="auth__panel auth__panel--welcome auth__panel--welcome-login" aria-hidden={!isLogin} {...inertWhen(!isLogin)}>
            <div className="auth__panel-inner">
              <h2 className="auth__welcome-title">Welcome back!</h2>
              <p className="auth__welcome-body">
                Sign in to see what your shopper has found, follow deliveries and post something new.
              </p>
              <button type="button" className="auth__ghost" onClick={() => switchTo('signup')}>
                New here? Create an account
              </button>
            </div>
          </aside>
          <aside className="auth__panel auth__panel--welcome auth__panel--welcome-signup" aria-hidden={isLogin} {...inertWhen(isLogin)}>
            <div className="auth__panel-inner">
              <h2 className="auth__welcome-title">Hello, friend!</h2>
              <p className="auth__welcome-body">
                Tell us what you need, choose a trusted shopper nearby, and have it brought to your door.
              </p>
              <button type="button" className="auth__ghost" onClick={() => switchTo('login')}>
                Already with us? Sign in
              </button>
            </div>
          </aside>
        </div>

        <div className="auth__forms">
          {/* ---------------- Login form ---------------- */}
          <section className="auth__panel auth__panel--form auth__panel--login" aria-hidden={!isLogin} {...inertWhen(!isLogin)}>
            <div className="auth__panel-inner">
              <div className="flex items-center gap-2.5">
                <DukaMark size={34} />
                <span className="font-display text-xl font-semibold leading-none text-brand-green-deep">{BRAND.name}</span>
              </div>
              <h1 className="mt-6 font-display text-h1 font-medium text-brand-green-deep">Sign in</h1>
              <p className="mt-1 text-body text-ink-2">Good to see you again.</p>
              <AuthIllustration className="mt-5 h-20 w-full max-w-[300px]" />

              <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-4" noValidate>
                <Input
                  label="Phone number or email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  icon={<User size={18} strokeWidth={1.8} />}
                  placeholder="0700 000 000 or you@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <PasswordInput
                  label="Password"
                  autoComplete="current-password"
                  icon={<Lock size={18} strokeWidth={1.8} />}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-line-strong accent-brand-green"
                    />
                    Remember me
                  </label>
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-sm font-medium text-brand-green hover:underline">
                    Forgot password?
                  </button>
                </div>
                {loginError && <p role="alert" className="text-sm font-medium text-brand-red">{loginError}</p>}
                <Button type="submit" size="lg" fullWidth loading={loggingIn}>
                  {loggingIn ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-2">
                Don't have an account?{' '}
                <button type="button" onClick={() => switchTo('signup')} className="font-semibold text-brand-green hover:underline">
                  Create one
                </button>
              </p>
            </div>
          </section>

          {/* ---------------- Sign-up form ---------------- */}
          <section className="auth__panel auth__panel--form auth__panel--signup" aria-hidden={isLogin} {...inertWhen(isLogin)}>
            <div className="auth__panel-inner">
              <div className="flex items-center gap-2.5">
                <DukaMark size={34} />
                <span className="font-display text-xl font-semibold leading-none text-brand-green-deep">{BRAND.name}</span>
              </div>
              <h1 className="mt-5 font-display text-h1 font-medium text-brand-green-deep">Create account</h1>
              <p className="mt-1 text-body text-ink-2">It takes about a minute.</p>

              <form onSubmit={handleSignup} className="mt-5 flex flex-col gap-3.5" noValidate>
                <div>
                  <p className="mb-1.5 block text-sm font-medium text-ink">I want to</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                    {([
                      { value: 'customer', label: 'Get things delivered', icon: ShoppingBag },
                      { value: 'shopper', label: 'Shop for others', icon: User },
                    ] as { value: UserRole; label: string; icon: typeof User }[]).map((opt) => {
                      const selected = role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setRole(opt.value)}
                          className={[
                            'flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-left text-sm font-medium transition-[background-color,border-color,box-shadow] duration-150',
                            selected
                              ? 'border-brand-green bg-brand-green-mist text-brand-green-deep shadow-focus'
                              : 'border-line bg-surface text-ink-2 hover:border-line-strong',
                          ].join(' ')}
                        >
                          <opt.icon size={16} strokeWidth={1.9} className="shrink-0" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="auth__grid">
                  <Input
                    label="Full name"
                    autoComplete="name"
                    icon={<User size={18} strokeWidth={1.8} />}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={signupErrors.fullName}
                    required
                  />
                  <Input
                    label="Phone number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    icon={<Phone size={18} strokeWidth={1.8} />}
                    placeholder="0700 000 000"
                    hint="You sign in with this."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={signupErrors.phone}
                    required
                  />
                </div>
                <Input
                  label="Email address (optional)"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  icon={<Mail size={18} strokeWidth={1.8} />}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={signupErrors.email}
                />
                <div className="auth__grid">
                  <PasswordInput
                    label="Password"
                    autoComplete="new-password"
                    icon={<Lock size={18} strokeWidth={1.8} />}
                    hint="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    error={signupErrors.password}
                    required
                  />
                  <PasswordInput
                    label="Confirm password"
                    autoComplete="new-password"
                    icon={<Lock size={18} strokeWidth={1.8} />}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    error={signupErrors.confirm}
                    required
                  />
                </div>
                <ConsentCheckbox
                  checked={consented}
                  onChange={(v) => { setConsented(v); if (v) setSignupErrors((s) => { const { consent, ...rest } = s; return rest; }); }}
                  error={signupErrors.consent}
                >
                  I agree to the <PrivacyLink /> and the{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-green-deep underline underline-offset-2">
                    Terms &amp; Conditions
                  </Link>
                  . My name and phone number are shown to the {role === 'shopper' ? 'customer' : 'shopper'} on an order I am part of.
                </ConsentCheckbox>
                {signupError && <p role="alert" className="text-sm font-medium text-brand-red">{signupError}</p>}
                <Button type="submit" size="lg" fullWidth loading={signingUp}>
                  {signingUp ? 'Creating your account…' : 'Create account'}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-2">
                Already have an account?{' '}
                <button type="button" onClick={() => switchTo('login')} className="font-semibold text-brand-green hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Forgot your password?" maxWidth="max-w-md">
        <p className="text-sm text-ink-2">
          Resetting it yourself is not available yet. Message support with the phone number on your account and a person will reset it for you, usually within the hour.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <a
            href={`https://wa.me/${waDigits}?text=${encodeURIComponent('Hi Duka, please reset my password.')}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[48px] items-center gap-3 rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <MessageCircle size={18} strokeWidth={1.8} className="text-brand-green" /> WhatsApp {BRAND.supportPhone}
          </a>
          <a
            href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent('Password reset')}`}
            className="flex min-h-[48px] items-center gap-3 rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <Mail size={18} strokeWidth={1.8} className="text-brand-green" /> {BRAND.supportEmail}
          </a>
        </div>
      </Modal>
    </div>
  );
}
