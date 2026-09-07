import { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bell, ChevronRight, CircleHelp, CreditCard, Gift, LogOut, LucideIcon, MapPin, Package,
  Search, ShieldCheck, SlidersHorizontal, Truck, User, Wallet,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { UserRole } from '../../../types';
import { homeFor } from '../../../utils/home';
import { useSignOut } from '../../../hooks/useSignOut';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { ListRow } from '../../../components/ui/ListRow';
import { PageHeader } from '../../../components/ui/PageHeader';
import {
  AddressesPanel, AppearancePanel, ContactSupportPanel, CouponsPanel, DeliveryInstructionsPanel,
  DeliveryPreferencesPanel, DevicesPanel, HelpCenterPanel, LanguagePanel, LocationPanel,
  OrderNotificationsPanel, PaymentMethodsPanel, PermissionsPanel, PersonalInfoPanel, PointsPanel,
  PrivacyPanel, PromotionNotificationsPanel, RecommendationsPanel, SecurityNotificationsPanel,
  SecurityPanel, ShoppingPreferencesPanel, SwitchAccountPanel, WalletPanel,
} from './SettingsPanels';

type Role = UserRole;

interface Item {
  id: string;
  label: string;
  description: string;
  keywords: string;
  roles?: Role[];
}

interface Group {
  id: string;
  label: string | ((role: Role) => string);
  icon: LucideIcon;
  roles?: Role[];
  items: Item[];
}

const CUSTOMER: Role[] = ['customer'];
const PEOPLE: Role[] = ['customer', 'shopper'];

const GROUPS: Group[] = [
  {
    id: 'account', label: 'Account', icon: User,
    items: [
      { id: 'personal', label: 'Personal information', description: 'Name, phone, email and photo', keywords: 'profile name phone email avatar picture photo switch account' },
      { id: 'security', label: 'Password & security', description: 'Change your password', keywords: 'password login sign in credentials' },
      { id: 'switch-account', label: 'Switch account & log out', description: 'Move between your accounts, or sign out', keywords: 'switch account change role log out sign out logout customer shopper' },
    ],
  },
  {
    id: 'addresses', label: (role) => (role === 'customer' ? 'Addresses' : 'Location'), icon: MapPin, roles: PEOPLE,
    items: [
      { id: 'addresses', label: 'Saved addresses', description: 'Where your orders get delivered', keywords: 'address home work landmark town deliver', roles: CUSTOMER },
      { id: 'location', label: 'Location settings', description: 'Share where you are during an order', keywords: 'location gps map share tracking find me nearby' },
    ],
  },
  {
    id: 'payments', label: 'Payments', icon: CreditCard, roles: CUSTOMER,
    items: [
      { id: 'payment-methods', label: 'Payment methods', description: 'How you pay your shopper', keywords: 'pay cash mobile money card history' },
      { id: 'wallet', label: 'Duka Wallet', description: 'Not available yet', keywords: 'wallet balance top up' },
    ],
  },
  {
    id: 'delivery', label: 'Delivery', icon: Truck, roles: CUSTOMER,
    items: [
      { id: 'delivery', label: 'Delivery preferences', description: 'Handover and how to reach you', keywords: 'handover door gate call message contact' },
      { id: 'instructions', label: 'Instructions', description: 'Standing notes for every delivery', keywords: 'instructions notes gate landmark directions' },
    ],
  },
  {
    id: 'notifications', label: 'Notifications', icon: Bell,
    items: [
      { id: 'notify-orders', label: 'Orders', description: 'Requests, offers, messages and order updates', keywords: 'alerts orders offers messages reminders jobs' },
      { id: 'notify-promotions', label: 'Promotions', description: 'News and offers from Duka', keywords: 'marketing news promotions email' },
      { id: 'notify-security', label: 'Security', description: 'Sign-ins and password changes', keywords: 'security sign in alerts' },
    ],
  },
  {
    id: 'preferences', label: 'Preferences', icon: SlidersHorizontal,
    items: [
      { id: 'appearance', label: 'Appearance', description: 'Theme, accent colour, phone navigation', keywords: 'theme dark light colour color accent navigation nav bar tabs' },
      { id: 'language', label: 'Language', description: 'English, Kiswahili, Luganda', keywords: 'language english swahili luganda' },
      { id: 'shopping', label: 'Shopping preferences', description: 'Defaults for new requests', keywords: 'default market shop town city sourcing', roles: CUSTOMER },
      { id: 'recommendations', label: 'Recommendations', description: 'Not switched on yet', keywords: 'recommendations suggestions', roles: CUSTOMER },
    ],
  },
  {
    id: 'rewards', label: 'Rewards', icon: Gift, roles: CUSTOMER,
    items: [
      { id: 'points', label: 'Duka Points', description: 'Coming soon', keywords: 'points rewards loyalty' },
      { id: 'coupons', label: 'Coupons & referrals', description: 'Coming soon', keywords: 'coupon promo code referral invite friend' },
    ],
  },
  {
    id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck,
    items: [
      { id: 'privacy', label: 'Privacy', description: 'Download or delete your data', keywords: 'privacy data export download delete account' },
      { id: 'devices', label: 'Devices', description: 'Where you are signed in', keywords: 'devices sessions sign out everywhere' },
      { id: 'permissions', label: 'Permissions', description: 'Location, camera, microphone, notifications', keywords: 'permissions browser camera microphone location notifications' },
    ],
  },
  {
    id: 'help', label: 'Help & Support', icon: CircleHelp,
    items: [
      { id: 'help-center', label: 'Help Center', description: 'Answers to common questions', keywords: 'help faq questions how it works' },
      { id: 'contact', label: 'Contact Support', description: 'WhatsApp, call or email us', keywords: 'contact support whatsapp phone email problem' },
    ],
  },
];

const LEGAL = [
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
];

const scrollMemory = new Map<string, number>();

function allowed(roles: Role[] | undefined, role: Role): boolean {
  if (!roles) return true;
  if (role === 'super_admin') return roles.includes('admin');
  return roles.includes(role);
}

function groupsFor(role: Role): Group[] {
  return GROUPS
    .filter((g) => allowed(g.roles, role))
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.roles, role)) }))
    .filter((g) => g.items.length > 0);
}

function groupLabel(g: Group, role: Role): string {
  return typeof g.label === 'function' ? g.label(role) : g.label;
}

export function SettingsPage() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const role: Role = user?.role ?? 'customer';
  const base = `${homeFor(role)}/settings`;

  const groups = useMemo(() => groupsFor(role), [role]);
  const items = useMemo(() => groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g }))), [groups]);
  const current = items.find((i) => i.id === section) ?? null;

  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile && !current && items.length > 0) navigate(`${base}/${items[0].id}`, { replace: true });
  }, [isMobile, current, items, base, navigate]);

  const activeKey = useRef('index');

  useEffect(() => {
    function remember() {
      scrollMemory.set(activeKey.current, window.scrollY);
    }
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, []);

  useLayoutEffect(() => {
    const key = current?.id ?? 'index';
    activeKey.current = key;
    const target = scrollMemory.get(key) ?? 0;
    window.scrollTo(0, target);
    if (target === 0) return;
    let frames = 0;
    let id = 0;
    const settle = () => {
      window.scrollTo(0, target);
      if (++frames < 3) id = requestAnimationFrame(settle);
    };
    id = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(id);
  }, [current?.id]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items.filter((i) => `${i.label} ${i.description} ${i.keywords} ${groupLabel(i.group, role)}`.toLowerCase().includes(q));
  }, [search, items, role]);

  function handleLogout() {
    void signOut();
  }

  const searching = search.trim().length > 0;
  const showIndex = isMobile ? !current : true;

  const shortcuts = role === 'shopper'
    ? [
        { to: '/shopper/orders', label: 'My jobs', icon: Package },
        { to: '/shopper/earnings', label: 'Earnings', icon: Wallet },
      ]
    : role === 'customer'
      ? [
          { to: '/app/orders', label: 'Orders', icon: Package },
          { to: '/app/payments', label: 'Payments', icon: CreditCard },
        ]
      : [];

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {(!isMobile || !current) && (
        <>
          <PageHeader title="Settings" subtitle="Make Duka work the way you want it to." className="mb-4" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings…"
            aria-label="Search settings"
            icon={<Search size={17} strokeWidth={1.8} />}
          />
        </>
      )}

      {isMobile && current && (
        <PageHeader back={base} backLabel="Settings" title={current.label} subtitle={groupLabel(current.group, role)} />
      )}

      {!searching && showIndex && shortcuts.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {shortcuts.map((sc) => (
            <Link
              key={sc.to}
              to={sc.to}
              className="surface flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl px-4 text-sm font-semibold text-brand-green-deep shadow-card transition-[border-color,transform,box-shadow] hover:border-line-strong hover:shadow-raised active:scale-[0.99]"
            >
              <sc.icon size={18} strokeWidth={1.9} className="text-brand-green" />
              {sc.label}
            </Link>
          ))}
        </div>
      )}

      {searching && (
        <div className="mt-5">
          {matches.length === 0 ? (
            <Card padding="lg" hover={false}>
              <p className="text-sm text-ink-3">No settings match "{search}".</p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="flex flex-col">
                {matches.map((i) => (
                  <Row key={i.id} to={`${base}/${i.id}`} label={i.label} description={`${groupLabel(i.group, role)} · ${i.description}`} onClick={() => setSearch('')} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!searching && (
        <div className={`mt-6 flex flex-col gap-6 ${isMobile ? '' : 'md:flex-row'}`}>
          {showIndex && (
            <div className={isMobile ? 'flex flex-col gap-4' : 'w-64 shrink-0'}>
              {isMobile && user && (
                <Link to={`${base}/personal`} className="surface flex items-center gap-3 rounded-2xl p-4 shadow-card transition-transform active:scale-[0.99]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green text-sm font-semibold text-white">
                      {user.fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{user.fullName}</span>
                    <span className="block truncate text-xs text-ink-3">{user.phone}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-ink-3" />
                </Link>
              )}

              {groups.map((g) => {
                const Icon = g.icon;
                return isMobile ? (
                  <Card key={g.id} padding="none">
                    <p className="flex items-center gap-2 px-4 pb-1 pt-3 text-label font-semibold uppercase text-ink-3">
                      <Icon size={14} strokeWidth={2} /> {groupLabel(g, role)}
                    </p>
                    <div className="flex flex-col">
                      {g.items.map((i) => (
                        <Row key={i.id} to={`${base}/${i.id}`} label={i.label} description={i.description} />
                      ))}
                    </div>
                  </Card>
                ) : (
                  <div key={g.id} className="mb-4">
                    <p className="flex items-center gap-2 px-3 pb-1 text-label font-semibold uppercase text-ink-3">
                      <Icon size={13} strokeWidth={2} /> {groupLabel(g, role)}
                    </p>
                    <nav className="flex flex-col gap-0.5">
                      {g.items.map((i) => (
                        <Link
                          key={i.id}
                          to={`${base}/${i.id}`}
                          className={[
                            'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            current?.id === i.id ? 'bg-brand-green-mist text-brand-green-deep' : 'text-ink-2 hover:bg-surface-2',
                          ].join(' ')}
                        >
                          {i.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                );
              })}

              <div className={isMobile ? 'mt-2' : 'mt-2 border-t border-line pt-4'}>
                <div className={isMobile ? 'flex flex-col' : 'flex flex-col gap-0.5'}>
                  {LEGAL.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={isMobile
                        ? 'flex min-h-[48px] items-center justify-between px-2 text-sm font-medium text-ink-2'
                        : 'rounded-xl px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2'}
                    >
                      {l.label}
                      {isMobile && <ChevronRight size={17} strokeWidth={2} className="text-ink-3" />}
                    </Link>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={[
                    'mt-3 flex items-center gap-3 rounded-xl text-sm font-semibold text-brand-red transition-[background-color,transform] hover:bg-brand-red/10 active:scale-[0.99]',
                    isMobile ? 'surface min-h-[52px] w-full justify-center rounded-2xl px-4' : 'w-full px-3 py-2.5',
                  ].join(' ')}
                >
                  <LogOut size={18} strokeWidth={1.9} /> Log out
                </button>
                {isMobile && (
                  <p className="mt-4 text-center text-[11px] text-ink-3">Duka · signed in as {user?.phone}</p>
                )}
              </div>
            </div>
          )}

          {current && (
            <div className="min-w-0 flex-1">
              <PanelFor id={current.id} onLogout={handleLogout} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ to, label, description, onClick }: { to: string; label: string; description: string; onClick?: () => void }) {
  return <ListRow to={to} onClick={onClick} label={label} description={description} />;
}

function PanelFor({ id, onLogout }: { id: string; onLogout: () => void }): ReactNode {
  switch (id) {
    case 'personal': return <PersonalInfoPanel />;
    case 'security': return <SecurityPanel />;
    case 'switch-account': return <SwitchAccountPanel onLogout={onLogout} />;
    case 'addresses': return <AddressesPanel />;
    case 'location': return <LocationPanel />;
    case 'payment-methods': return <PaymentMethodsPanel />;
    case 'wallet': return <WalletPanel />;
    case 'delivery': return <DeliveryPreferencesPanel />;
    case 'instructions': return <DeliveryInstructionsPanel />;
    case 'notify-orders': return <OrderNotificationsPanel />;
    case 'notify-promotions': return <PromotionNotificationsPanel />;
    case 'notify-security': return <SecurityNotificationsPanel />;
    case 'appearance': return <AppearancePanel />;
    case 'language': return <LanguagePanel />;
    case 'shopping': return <ShoppingPreferencesPanel />;
    case 'recommendations': return <RecommendationsPanel />;
    case 'points': return <PointsPanel />;
    case 'coupons': return <CouponsPanel />;
    case 'privacy': return <PrivacyPanel />;
    case 'devices': return <DevicesPanel onLogout={onLogout} />;
    case 'permissions': return <PermissionsPanel />;
    case 'help-center': return <HelpCenterPanel />;
    case 'contact': return <ContactSupportPanel />;
    default: return null;
  }
}
