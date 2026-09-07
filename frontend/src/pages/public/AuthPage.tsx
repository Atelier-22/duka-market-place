import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import { PandaMascot } from '../../components/ui/PandaMascot';
import { AUTH_PHASES, prefersReducedMotion } from '../../config/motion';
import { BRAND } from '../../config/brand';
import { UserRole } from '../../types';
import { homeFor } from '../../utils/home';
import '../../styles/auth.css';
import { usePageMeta } from '../../hooks/usePageMeta';

export type AuthMode = 'login' | 'signup';
type Phase = 'idle' | 'out' | 'trough' | 'in';

const TROUGH_AT = AUTH_PHASES.cloudDelay + AUTH_PHASES.cloudCollapse;
const SWAP_AT = TROUGH_AT + AUTH_PHASES.trough;
const SETTLE_AT = SWAP_AT + AUTH_PHASES.cloudExpand;

function firstName(full: string): string {
  return full.trim().split(' ')[0] ?? '';
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, login, register } = useAuth();
  const { play } = useBrandTransition();
  const leaving = useRef(false);
  const timers = useRef<number[]>([]);

  const [shown, setShown] = useState<AuthMode>(mode);
  const [phase, setPhase] = useState<Phase>('idle');
  const [role, setRole] = useState<UserRole>(params.get('role') === 'shopper' ? 'shopper' : 'customer');

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (user && !leaving.current) navigate(homeFor(user.role), { replace: true });
  }, [user, navigate]);

  usePageMeta({
    title: shown === 'login' ? 'Sign in' : 'Create account',
    description: shown === 'login'
      ? 'Sign in to Duka to follow your orders, message your shopper and post new requests.'
      : 'Create a Duka account to get things bought and delivered, or to earn as a local shopper.',
    noindex: true,
  });

  const switchTo = useCallback((next: AuthMode) => {
    if (next === shown || phase !== 'idle') return;
    const url = next === 'login' ? '/login' : `/register${role === 'shopper' ? '?role=shopper' : ''}`;

    if (prefersReducedMotion()) {
      setShown(next);
      navigate(url, { replace: true });
      return;
    }

    setPhase('out');
    timers.current.forEach(clearTimeout);
    timers.current = [
      window.setTimeout(() => setPhase('trough'), TROUGH_AT),
      window.setTimeout(() => {
        setShown(next);
        navigate(url, { replace: true });
        setPhase('in');
      }, SWAP_AT),
      window.setTimeout(() => setPhase('idle'), SETTLE_AT),
    ];
  }, [shown, phase, role, navigate]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    leaving.current = true;
    try {
      const me = await login(identifier.trim(), password, remember);
      const first = firstName(me.fullName);
      await play({
        label: first ? `Welcome back, ${first}` : 'Welcome back',
        task: () => navigate(homeFor(me.role), { replace: true }),
      });
    } catch (err) {
      leaving.current = false;
      setLoginError(err instanceof Error ? err.message : 'Could not sign you in');
      setLoggingIn(false);
    }
  }

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newVisible, setNewVisible] = useState(false);
  const [newFocused, setNewFocused] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [consented, setConsented] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Tell us your name so your shopper knows who to look for.';
    if (phone.replace(/\D/g, '').length < 9) next.phone = 'Enter the phone number you will sign in with.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'That email does not look right.';
    if (newPassword.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== newPassword) next.confirm = 'The two passwords do not match.';
    if (!consented) next.consent = 'Please agree to the Privacy Policy and Terms before creating an account.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSignupError(null);
    if (!validate()) return;
    setSigningUp(true);
    leaving.current = true;
    try {
      await register({ role, fullName: fullName.trim(), phone: phone.trim(), email: email.trim() || undefined, password: newPassword });
      const first = firstName(fullName);
      await play({
        label: first ? `Welcome to ${BRAND.name}, ${first}` : `Welcome to ${BRAND.name}`,
        task: () => navigate(homeFor(role), { replace: true }),
      });
    } catch (err) {
      leaving.current = false;
      setSignupError(err instanceof Error ? err.message : 'Could not create your account');
      setSigningUp(false);
    }
  }

  const isLogin = shown === 'login';
  const hiding = isLogin ? passwordFocused : newFocused || confirmFocused;
  const peeking = isLogin ? passwordVisible : (newFocused && newVisible) || (confirmFocused && confirmVisible);
  const waDigits = BRAND.supportPhone.replace(/[^\d]/g, '');

  const style = {
    '--cloud-delay': `${AUTH_PHASES.cloudDelay}ms`,
    '--cloud-collapse': `${AUTH_PHASES.cloudCollapse}ms`,
    '--cloud-expand': `${AUTH_PHASES.cloudExpand}ms`,
    '--content-out': `${AUTH_PHASES.contentOut}ms`,
    '--content-in': `${AUTH_PHASES.contentIn}ms`,
    '--content-in-delay': `${AUTH_PHASES.contentInDelay}ms`,
  } as CSSProperties;

  return (
    <div className="auth" data-phase={phase} data-mode={shown} style={style}>
      <Link to="/" className="auth__home">
        <ArrowLeft size={15} strokeWidth={2} /> Back to {BRAND.name}
      </Link>

      <div className="auth__stage">
        <div className="auth__cloud" aria-hidden>
          <span className="auth__cloud-body" />
          <span className="auth__cloud-bump auth__cloud-bump--1" />
          <span className="auth__cloud-bump auth__cloud-bump--2" />
          <span className="auth__cloud-bump auth__cloud-bump--3" />
          <span className="auth__cloud-bump auth__cloud-bump--4" />
          <span className="auth__cloud-bump auth__cloud-bump--5" />
          <span className="auth__cloud-bump auth__cloud-bump--6" />
        </div>

        <aside className="auth__welcome">
          <div>
            <h2 className="auth__welcome-title">{isLogin ? 'Welcome back!' : 'Hello, friend!'}</h2>
            <p className="auth__welcome-body">
              {isLogin
                ? 'Sign in to see what your shopper has found, follow deliveries and post something new.'
                : 'Tell us what you need, choose a trusted shopper nearby, and have it brought to your door.'}
            </p>
            <button type="button" className="auth__ghost" onClick={() => switchTo(isLogin ? 'signup' : 'login')}>
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </aside>

        <div className="auth__content">
          <div className="auth__inner">
            <div className="auth__panda">
              <PandaMascot hiding={hiding} peeking={peeking} />
            </div>

            <div className="auth__brand">
              <DukaMark size={30} />
              <span className="auth__brand-name">{BRAND.name}</span>
            </div>

            {isLogin ? (
              <div key="login">
                <h1 className="auth__title">Hello!</h1>
                <p className="auth__lede">Sign in to pick up where you left off.</p>

                <form onSubmit={handleLogin} className="auth__form auth__stagger" noValidate>
                  <Input
                    label="Email or phone number"
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
                    visible={passwordVisible}
                    onVisibleChange={setPasswordVisible}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="auth__meta">
                    <label className="auth__remember">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                      Remember me
                    </label>
                    <button type="button" className="auth__link" onClick={() => setForgotOpen(true)}>
                      Forgot password?
                    </button>
                  </div>
                  {loginError && <p role="alert" className="auth__error">{loginError}</p>}
                  <Button type="submit" size="lg" fullWidth loading={loggingIn} className="auth__submit">
                    {loggingIn ? 'Signing in' : 'Sign in'}
                  </Button>
                </form>

                <p className="auth__swap">
                  Don't have an account?{' '}
                  <button type="button" className="auth__link" onClick={() => switchTo('signup')}>
                    Create one
                  </button>
                </p>
              </div>
            ) : (
              <div key="signup">
                <h1 className="auth__title">Create account</h1>
                <p className="auth__lede">It takes about a minute.</p>

                <form onSubmit={handleSignup} className="auth__form auth__stagger" noValidate>
                  <div className="auth__row auth__row--always" role="radiogroup" aria-label="Account type">
                    {([
                      { value: 'customer', label: 'Get things', icon: ShoppingBag },
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
                            'flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition-[background-color,border-color,box-shadow] duration-150',
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
                  <div className="auth__row">
                    <Input
                      label="Full name"
                      autoComplete="name"
                      icon={<User size={18} strokeWidth={1.8} />}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={fieldErrors.fullName}
                      required
                    />
                    <Input
                      label="Phone number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      icon={<Phone size={18} strokeWidth={1.8} />}
                      placeholder="0700 000 000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={fieldErrors.phone}
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
                    error={fieldErrors.email}
                  />
                  <div className="auth__row">
                    <PasswordInput
                      label="Password"
                      autoComplete="new-password"
                      icon={<Lock size={18} strokeWidth={1.8} />}
                      hint="At least 8 characters"
                      value={newPassword}
                      visible={newVisible}
                      onVisibleChange={setNewVisible}
                      onFocus={() => setNewFocused(true)}
                      onBlur={() => setNewFocused(false)}
                      onChange={(e) => setNewPassword(e.target.value)}
                      error={fieldErrors.password}
                      required
                    />
                    <PasswordInput
                      label="Confirm password"
                      autoComplete="new-password"
                      icon={<Lock size={18} strokeWidth={1.8} />}
                      value={confirm}
                      visible={confirmVisible}
                      onVisibleChange={setConfirmVisible}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      onChange={(e) => setConfirm(e.target.value)}
                      error={fieldErrors.confirm}
                      required
                    />
                  </div>
                  <ConsentCheckbox
                    checked={consented}
                    onChange={(v) => {
                      setConsented(v);
                      if (v) setFieldErrors((s) => { const { consent: _consent, ...rest } = s; return rest; });
                    }}
                    error={fieldErrors.consent}
                  >
                    I agree to the <PrivacyLink /> and the{' '}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-green-deep underline underline-offset-2">
                      Terms &amp; Conditions
                    </Link>
                    . My name and phone number are shown to the {role === 'shopper' ? 'customer' : 'shopper'} on an order I am part of.
                  </ConsentCheckbox>
                  {signupError && <p role="alert" className="auth__error">{signupError}</p>}
                  <Button type="submit" size="lg" fullWidth loading={signingUp} className="auth__submit">
                    {signingUp ? 'Creating account' : 'Create account'}
                  </Button>
                </form>

                <p className="auth__swap">
                  Already have an account?{' '}
                  <button type="button" className="auth__link" onClick={() => switchTo('login')}>
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
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
