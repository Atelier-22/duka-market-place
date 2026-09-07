import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Camera, ChevronRight, Download, ExternalLink, Gift, LucideIcon, Mail, MapPin, MessageCircle,
  Mic, Monitor, Moon, Phone, ShieldCheck, Smartphone, Sun, Ticket, Wallet,
} from 'lucide-react';
import { api, apiErrorMessage } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import {
  Accent, DeliveryContact, DeliveryHandoff, Language, Theme, usePreferences,
} from '../../../context/PreferencesContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import { LocationSetting } from '../../../components/domain/LocationSetting';
import { AddressBook } from '../../../components/domain/AddressBook';
import { AccountToggle } from '../../../components/layout/AccountToggle';
import { NAV_STYLES, NavStyle, useNavStyle } from '../../../hooks/useNavStyle';
import { setUnreadRemindersEnabled, unreadRemindersEnabled } from '../../../hooks/useUnreadReminder';
import { useToast } from '../../../components/ui/Toast';
import { BRAND } from '../../../config/brand';
import { FAQS } from '../../public/FaqPage';
import { SourcingType } from '../../../types';

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

export function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card padding="lg" className="mb-5">
      <h2 className="font-display text-h3 font-medium text-brand-green-deep">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[56px] w-full items-center justify-between gap-4 border-b border-line py-3 text-left last:border-0 disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-3">{description}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-green-fresh' : 'bg-brand-ink/20'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function Choice<T extends string>({ value, options, onChange, columns = 1 }: {
  value: T;
  options: { value: T; label: string; description?: string; icon?: LucideIcon }[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const grid = columns === 3 ? 'grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '';
  return (
    <div className={`grid gap-2 ${grid}`}>
      {options.map((o) => {
        const Icon = o.icon;
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className={[
              'flex min-h-[52px] items-center gap-3 rounded-2xl border p-3 text-left transition-[background-color,border-color,transform] active:scale-[0.99]',
              selected ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-line hover:bg-surface-2',
            ].join(' ')}
          >
            {Icon && <Icon size={19} strokeWidth={1.7} className={selected ? 'text-brand-green-deep' : 'text-ink-3'} />}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-brand-green-deep">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-xs text-ink-3">{o.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Honest placeholder for a feature that has no backend yet. */
function NotYet({ icon: Icon, title, body, cta }: { icon: LucideIcon; title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface-2 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-green shadow-card">
        <Icon size={22} strokeWidth={1.6} />
      </span>
      <p className="mt-4 font-medium text-brand-green-deep">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-2">{body}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export function PersonalInfoPanel() {
  const { user, refresh } = useAuth();
  const { push } = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch('/settings/profile', {
        fullName,
        email: email.trim() || null,
        phone,
        avatarUrl: avatarUrl || null,
      });
      await refresh();
      push('Account updated', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel title="Personal information" description="Your name, contact details and profile picture.">
        <div className="flex flex-col gap-4">
          <ImageUpload folder="avatars" label="Profile picture" value={avatarUrl} onChange={setAvatarUrl} />
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Phone number" type="tel" hint="This is what you log in with." value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div>
            <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
        {user?.role === 'shopper' && (
          <Link to="/shopper/profile" className="mt-5 flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm font-medium text-brand-green-deep transition-colors hover:bg-surface-2">
            Shopper profile: bio and operating area
            <ChevronRight size={17} strokeWidth={2} className="text-ink-3" />
          </Link>
        )}
      </Panel>
      <AccountSwitchPanel />
    </>
  );
}

function AccountSwitchPanel() {
  const { linkedAccounts } = useAuth();
  if (linkedAccounts.filter((a) => a.role !== 'admin').length === 0) return null;
  return (
    <Panel title="Switch account" description="You have more than one Duka account on this phone number.">
      <div className="-mt-4">
        <AccountToggle />
      </div>
    </Panel>
  );
}

export function SecurityPanel() {
  const { push } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post('/settings/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      push('Password changed', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Password & security" description="Change the password you use to sign in.">
      <div className="flex max-w-sm flex-col gap-4">
        <PasswordInput label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <PasswordInput label="New password" hint="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <div>
          <Button size="sm" disabled={saving || !currentPassword || newPassword.length < 8} onClick={save}>
            {saving ? 'Updating…' : 'Change password'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Addresses & location                                                */
/* ------------------------------------------------------------------ */

export function AddressesPanel() {
  return (
    <Panel title="Saved addresses" description="Where your orders get delivered. Change them here rather than mid-order.">
      <AddressBook />
    </Panel>
  );
}

export function LocationPanel() {
  return (
    <Panel title="Location settings" description="Used only while an order of yours is in flight, and never in the background.">
      <LocationSetting />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export function PaymentMethodsPanel() {
  return (
    <Panel title="Payment methods" description="How you pay for what your shopper buys.">
      <div className="rounded-2xl border border-brand-green-fresh bg-brand-green-mist p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-green-deep">
          <Wallet size={17} strokeWidth={1.8} /> Pay on delivery
          <span className="ml-auto rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-semibold text-white">Current</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">
          You pay your shopper in cash or by mobile money when they hand over the item. The exact amount is shown to you before you approve any purchase, and again when the order is on its way.
        </p>
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Paying inside the app with mobile money or a card is not available yet. When it is, you will be able to add it here.
      </p>
      <Link to="/app/payments" className="mt-5 flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm font-medium text-brand-green-deep transition-colors hover:bg-surface-2">
        Payment history
        <ChevronRight size={17} strokeWidth={2} className="text-ink-3" />
      </Link>
    </Panel>
  );
}

export function WalletPanel() {
  return (
    <Panel title="Duka Wallet">
      <NotYet
        icon={Wallet}
        title="Duka Wallet is not available yet"
        body="When it launches you will be able to keep money in Duka and pay for orders in one tap. For now, you pay your shopper on delivery."
        cta={<Link to="/app/payments"><Button size="sm" variant="secondary">See payment history</Button></Link>}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

export function DeliveryPreferencesPanel() {
  const { preferences, update, saving } = usePreferences();
  return (
    <Panel title="Delivery preferences" description="Your shopper sees these on every order so they know how you like the handover.">
      <p className="text-label font-semibold uppercase text-ink-3">When your shopper arrives</p>
      <div className="mt-3">
        <Choice<DeliveryHandoff>
          value={preferences.delivery_handoff}
          onChange={(v) => update({ deliveryHandoff: v })}
          options={[
            { value: 'meet', label: 'Meet me at the door', description: 'Hand the item to me directly.' },
            { value: 'gate', label: 'Leave with the gate or reception', description: 'Only if someone is there to receive it.' },
            { value: 'call', label: 'Call me first', description: 'I will come out to meet you.' },
          ]}
        />
      </div>

      <p className="mt-6 text-label font-semibold uppercase text-ink-3">How to reach you</p>
      <div className="mt-3">
        <Choice<DeliveryContact>
          value={preferences.delivery_contact}
          onChange={(v) => update({ deliveryContact: v })}
          columns={3}
          options={[
            { value: 'call', label: 'Call', icon: Phone },
            { value: 'message', label: 'Message', icon: MessageCircle },
            { value: 'either', label: 'Either', icon: Smartphone },
          ]}
        />
      </div>
      {saving && <p className="mt-3 text-xs text-ink-3">Saving…</p>}
    </Panel>
  );
}

export function DeliveryInstructionsPanel() {
  const { preferences, update } = usePreferences();
  const { push } = useToast();
  const [text, setText] = useState(preferences.delivery_instructions ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setText(preferences.delivery_instructions ?? ''); }, [preferences.delivery_instructions]);

  async function save() {
    setSaving(true);
    try {
      await update({ deliveryInstructions: text.trim() || null });
      push('Instructions saved', 'success');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Delivery instructions" description="Standing notes for every delivery. They pre-fill the notes when you make a request and show on the shopper's job page.">
      <Textarea
        label="Instructions"
        value={text}
        maxLength={500}
        onChange={(e) => setText(e.target.value)}
        placeholder="Green gate opposite the pharmacy. Ask for Sarah. Dogs are friendly."
        hint="Only what a shopper needs to find you and hand over the item. Your phone number is already shared with them."
      />
      <div className="mt-4">
        <Button size="sm" disabled={saving || text === (preferences.delivery_instructions ?? '')} onClick={save}>
          {saving ? 'Saving…' : 'Save instructions'}
        </Button>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function OrderNotificationsPanel() {
  const { user } = useAuth();
  const { preferences, update } = usePreferences();
  const [unreadReminders, setUnreadReminders] = useState(unreadRemindersEnabled());
  return (
    <Panel title="Order notifications" description="Everything about requests, offers and orders in flight.">
      <Toggle checked={preferences.notify_orders} onChange={(v) => update({ notifyOrders: v })} label="Order updates" description="Accepted, shopping, out for delivery, completed" />
      {user?.role === 'customer' && (
        <Toggle checked={preferences.notify_offers} onChange={(v) => update({ notifyOffers: v })} label="Offers" description="When a shopper offers to take your request" />
      )}
      {user?.role === 'shopper' && (
        <Toggle checked={preferences.notify_new_requests} onChange={(v) => update({ notifyNewRequests: v })} label="New jobs posted" description="When a customer posts a request you could take" />
      )}
      <Toggle checked={preferences.notify_messages} onChange={(v) => update({ notifyMessages: v })} label="Messages" description="When the other side of an order writes to you" />
      <Toggle
        checked={unreadReminders}
        onChange={(v) => { setUnreadRemindersEnabled(v); setUnreadReminders(v); }}
        label="Remind me about unread messages"
        description="Shows the newest unread message every ten minutes until you read it. Kept on this device."
      />
    </Panel>
  );
}

export function PromotionNotificationsPanel() {
  const { preferences, update } = usePreferences();
  return (
    <Panel title="Promotions" description="Occasional news and offers from Duka. Off by default.">
      <Toggle checked={preferences.notify_marketing} onChange={(v) => update({ notifyMarketing: v })} label="News and offers from Duka" description="A few times a month at most" />
    </Panel>
  );
}

export function SecurityNotificationsPanel() {
  const { preferences, update } = usePreferences();
  return (
    <Panel title="Security alerts" description="We recommend keeping these on.">
      <Toggle checked={preferences.notify_security} onChange={(v) => update({ notifySecurity: v })} label="Sign-ins and password changes" description="Know straight away if someone else gets into your account" />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

const THEMES: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const ACCENTS: { value: Accent; label: string; swatch: [string, string] }[] = [
  { value: 'green', label: 'Duka green', swatch: ['#137A4C', '#1FAE6B'] },
  { value: 'ocean', label: 'Ocean', swatch: ['#1565A3', '#2E9BD9'] },
  { value: 'sunset', label: 'Sunset', swatch: ['#B24722', '#E87435'] },
  { value: 'grape', label: 'Grape', swatch: ['#673AA8', '#9160D6'] },
  { value: 'charcoal', label: 'Charcoal', swatch: ['#3E4852', '#697784'] },
  { value: 'rose', label: 'Rose', swatch: ['#BB3769', '#E85D91'] },
  { value: 'amber', label: 'Amber', swatch: ['#B07410', '#E2A020'] },
  { value: 'teal', label: 'Teal', swatch: ['#117A7A', '#20ADAD'] },
  { value: 'indigo', label: 'Indigo', swatch: ['#4444B2', '#6A6AE0'] },
  { value: 'crimson', label: 'Crimson', swatch: ['#AF2332', '#DB3E4F'] },
  { value: 'lime', label: 'Lime', swatch: ['#6A9118', '#96C428'] },
  { value: 'plum', label: 'Plum', swatch: ['#8C2D82', '#BA4EAE'] },
  { value: 'sky', label: 'Sky', swatch: ['#1976B2', '#38AAEB'] },
  { value: 'copper', label: 'Copper', swatch: ['#94522A', '#C47440'] },
  { value: 'forest', label: 'Forest', swatch: ['#265E37', '#3E8C52'] },
  { value: 'slate', label: 'Slate', swatch: ['#3E5268', '#647E9A'] },
];

function NavStylePreview({ navStyle }: { navStyle: NavStyle }) {
  const dark = navStyle === 'dark';
  return (
    <span
      aria-hidden
      className={[
        'relative flex h-11 w-20 shrink-0 items-end justify-around rounded-2xl px-2 pb-2',
        dark ? 'bg-[rgb(var(--nav-dark-bg))]' : 'bg-surface ring-1 ring-brand-green/15',
      ].join(' ')}
    >
      {[0, 1, 2, 3].map((i) => {
        const active = i === 1;
        return (
          <span key={i} className="relative flex h-3 w-3 items-end justify-center">
            {active ? (
              <span
                className="absolute -top-3 h-5 w-5 rounded-full shadow-[0_4px_10px_-3px_rgb(var(--brand-green-fresh)/0.7)]"
                style={{
                  background: 'linear-gradient(140deg, rgb(var(--nav-indicator-a)), rgb(var(--nav-indicator-b)))',
                  boxShadow: `0 0 0 3px ${dark ? 'rgb(var(--nav-dark-bg))' : 'rgb(var(--brand-surface))'}`,
                }}
              />
            ) : (
              <span className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-white/35' : 'bg-brand-ink/25'}`} />
            )}
          </span>
        );
      })}
    </span>
  );
}

export function AppearancePanel() {
  const { preferences, update } = usePreferences();
  const [navStyle, setNavStyle] = useNavStyle();
  return (
    <Panel title="Appearance" description="Applies instantly and is remembered on this account.">
      <p className="text-label font-semibold uppercase text-ink-3">Theme</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const Icon = t.icon;
          const selected = preferences.theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ theme: t.value })}
              aria-pressed={selected}
              className={[
                'flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm font-medium transition-[background-color,border-color,transform] active:scale-[0.98]',
                selected ? 'border-brand-green-fresh bg-brand-green-mist text-brand-green-deep' : 'border-line text-ink-2 hover:bg-surface-2',
              ].join(' ')}
            >
              <Icon size={20} strokeWidth={1.6} />
              {t.label}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-label font-semibold uppercase text-ink-3">Accent colour</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ACCENTS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => update({ accent: a.value })}
            aria-pressed={preferences.accent === a.value}
            className={[
              'flex items-center gap-3 rounded-2xl border p-3 text-left transition-[background-color,border-color,transform] active:scale-[0.99]',
              preferences.accent === a.value ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-line hover:bg-surface-2',
            ].join(' ')}
          >
            <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${a.swatch[0]}, ${a.swatch[1]})` }} />
            <span className="text-sm font-semibold text-brand-green-deep">{a.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-label font-semibold uppercase text-ink-3">Phone navigation</p>
      <p className="mt-1 text-xs text-ink-3">The bar at the bottom of the screen on a phone. Kept on this device.</p>
      <div className="mt-3 flex flex-col gap-2">
        {NAV_STYLES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setNavStyle(s.key)}
            aria-pressed={navStyle === s.key}
            className={[
              'flex items-center gap-3 rounded-2xl border p-3 text-left transition-[background-color,border-color,transform] active:scale-[0.99]',
              navStyle === s.key ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-line hover:bg-surface-2',
            ].join(' ')}
          >
            <NavStylePreview navStyle={s.key} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-brand-green-deep">{s.label}</span>
              <span className="mt-0.5 block text-xs text-ink-3">{s.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

const LANGUAGES: { value: Language; label: string; note: string }[] = [
  { value: 'en', label: 'English', note: 'Default' },
  { value: 'sw', label: 'Kiswahili', note: 'Translations in progress' },
  { value: 'lg', label: 'Luganda', note: 'Translations in progress' },
];

export function LanguagePanel() {
  const { preferences, update } = usePreferences();
  return (
    <Panel title="Language" description="Your choice is saved now; the interface stays English-only until translations land.">
      <div className="flex flex-col gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => update({ language: l.value })}
            aria-pressed={preferences.language === l.value}
            className={[
              'flex min-h-[52px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] active:scale-[0.99]',
              preferences.language === l.value ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-line hover:bg-surface-2',
            ].join(' ')}
          >
            <span className="text-sm font-semibold text-brand-green-deep">{l.label}</span>
            <span className="text-xs text-ink-3">{l.note}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

const SOURCING_OPTIONS: { value: SourcingType; label: string; description: string }[] = [
  { value: 'shopper_choice', label: 'Let the shopper find it', description: 'They search nearby shops and send you priced options.' },
  { value: 'specific_market', label: 'A specific market', description: 'You name the market.' },
  { value: 'specific_shop', label: 'A specific shop', description: 'You name the shop.' },
  { value: 'social_seller', label: 'A seller on social media', description: 'You share the seller’s page.' },
];

export function ShoppingPreferencesPanel() {
  const { preferences, update, saving } = usePreferences();
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);

  useEffect(() => {
    api.get('/locations/cities').then((res) => setCities(res.data.cities ?? [])).catch(() => setCities([]));
  }, []);

  return (
    <Panel title="Shopping preferences" description="Defaults for new requests. You can always change them on the request itself.">
      <p className="text-label font-semibold uppercase text-ink-3">Where to buy, by default</p>
      <div className="mt-3">
        <Choice<SourcingType>
          value={(preferences.default_sourcing as SourcingType) ?? 'shopper_choice'}
          onChange={(v) => update({ defaultSourcing: v })}
          options={SOURCING_OPTIONS}
        />
      </div>

      <div className="mt-6">
        <Select
          label="Your town"
          value={preferences.default_city ?? ''}
          onChange={(e) => update({ defaultCity: e.target.value || null })}
        >
          <option value="">Not set</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>{c.city} ({c.count} places)</option>
          ))}
        </Select>
        <p className="mt-1.5 text-xs text-ink-3">Markets and shops in this town are listed first when you make a request.</p>
      </div>
      {saving && <p className="mt-3 text-xs text-ink-3">Saving…</p>}
    </Panel>
  );
}

export function RecommendationsPanel() {
  return (
    <Panel title="Recommendations">
      <NotYet
        icon={Gift}
        title="Recommendations are not switched on yet"
        body="Duka does not suggest products or shoppers based on your history yet. When it does, you will control it from here."
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

export function PointsPanel() {
  return (
    <Panel title="Duka Points">
      <NotYet
        icon={Gift}
        title="Duka Points are coming"
        body="You will earn points on every completed order and spend them on delivery fees. There is nothing to collect yet, so no balance is shown."
      />
    </Panel>
  );
}

export function CouponsPanel() {
  return (
    <Panel title="Coupons & referrals">
      <NotYet
        icon={Ticket}
        title="No coupons or referral codes yet"
        body="When referrals launch you will get a personal code to share, and a place to enter codes from friends. Until then there is nothing to redeem."
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Privacy & security                                                  */
/* ------------------------------------------------------------------ */

export function PrivacyPanel() {
  const { user } = useAuth();
  const { push } = useToast();
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const res = await api.get('/settings/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duka-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      push('Your data is downloading', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  }

  const deleteHref = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent('Delete my Duka account')}&body=${encodeURIComponent(
    `Please delete my Duka account.\n\nPhone: ${user?.phone ?? ''}\nName: ${user?.fullName ?? ''}\n\nI understand my order history will be removed.`
  )}`;

  return (
    <Panel title="Privacy" description="What Duka holds about you, and how to take it with you or remove it.">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4">
          <div>
            <p className="text-sm font-medium text-ink">Download your data</p>
            <p className="mt-0.5 text-xs text-ink-3">Your account, addresses, requests, orders, ratings and notifications as one file.</p>
          </div>
          <Button size="sm" variant="secondary" disabled={exporting} onClick={exportData}>
            <Download size={15} strokeWidth={2} /> {exporting ? 'Preparing…' : 'Download'}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-red/20 p-4">
          <div>
            <p className="text-sm font-medium text-ink">Delete your account</p>
            <p className="mt-0.5 text-xs text-ink-3">Handled by a person, within a few days. Open orders must finish first.</p>
          </div>
          <a href={deleteHref} className="shrink-0 rounded-xl border border-brand-red/30 px-4 py-2 text-sm font-semibold text-brand-red transition-colors hover:bg-brand-red/10">
            Request deletion
          </a>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <Link to="/privacy" className="font-medium text-brand-green-deep hover:underline">Privacy Policy</Link>
        <Link to="/cookies" className="font-medium text-brand-green-deep hover:underline">Cookie Policy</Link>
      </div>
    </Panel>
  );
}

function describeDevice(): { name: string; detail: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iPhone or iPad'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'Mac'
    : /Linux/i.test(ua) ? 'Linux'
    : 'Unknown device';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /OPR\//i.test(ua) ? 'Opera'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Safari\//i.test(ua) ? 'Safari'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : 'Browser';
  return { name: `${browser} on ${os}`, detail: 'This device' };
}

export function DevicesPanel({ onLogout }: { onLogout: () => void }) {
  const device = describeDevice();
  return (
    <Panel title="Devices" description="Where you are signed in to Duka.">
      <div className="flex items-center gap-3 rounded-2xl border border-brand-green-fresh bg-brand-green-mist p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-brand-green">
          <Smartphone size={19} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-green-deep">{device.name}</p>
          <p className="text-xs text-ink-3">{device.detail} · signed in now</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Duka does not keep a list of your other devices yet, so logging out here signs out this device only. If you think someone else is using your account, change your password: that locks out everyone.
      </p>
      <div className="mt-4">
        <Button size="sm" variant="secondary" onClick={onLogout}>Log out of this device</Button>
      </div>
    </Panel>
  );
}

type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';

const PERMISSIONS: { key: string; name: PermissionName | 'notifications'; label: string; why: string; icon: LucideIcon }[] = [
  { key: 'geolocation', name: 'geolocation' as PermissionName, label: 'Location', why: 'So your shopper can find you while an order is in flight.', icon: MapPin },
  { key: 'camera', name: 'camera' as PermissionName, label: 'Camera', why: 'Profile pictures, item photos and receipts.', icon: Camera },
  { key: 'microphone', name: 'microphone' as PermissionName, label: 'Microphone', why: 'Voice notes in order chats.', icon: Mic },
  { key: 'notifications', name: 'notifications', label: 'Notifications', why: 'Alerts when something needs you.', icon: Bell },
];

const PERM_LABEL: Record<PermState, string> = {
  granted: 'Allowed',
  denied: 'Blocked',
  prompt: 'Asks each time',
  unsupported: 'Not on this device',
  unknown: 'Unknown',
};

export function PermissionsPanel() {
  const [states, setStates] = useState<Record<string, PermState>>({});

  useEffect(() => {
    let cancelled = false;
    async function read() {
      const next: Record<string, PermState> = {};
      for (const p of PERMISSIONS) {
        try {
          if (p.name === 'notifications') {
            next[p.key] = typeof Notification === 'undefined' ? 'unsupported'
              : Notification.permission === 'default' ? 'prompt' : (Notification.permission as PermState);
            continue;
          }
          if (!navigator.permissions?.query) { next[p.key] = 'unknown'; continue; }
          const status = await navigator.permissions.query({ name: p.name });
          next[p.key] = status.state as PermState;
        } catch {
          next[p.key] = 'unknown';
        }
      }
      if (!cancelled) setStates(next);
    }
    void read();
    return () => { cancelled = true; };
  }, []);

  return (
    <Panel title="Permissions" description="What this browser lets Duka use. Change them in your browser's site settings for Duka.">
      <div className="flex flex-col">
        {PERMISSIONS.map((p) => {
          const state = states[p.key] ?? 'unknown';
          const Icon = p.icon;
          const tone = state === 'granted' ? 'bg-brand-green/15 text-brand-green-deep'
            : state === 'denied' ? 'bg-brand-red/10 text-brand-red'
            : 'bg-brand-ink/8 text-ink-2';
          return (
            <div key={p.key} className="flex min-h-[64px] items-center gap-3 border-b border-line py-3 last:border-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
                <Icon size={17} strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{p.label}</p>
                <p className="text-xs text-ink-3">{p.why}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{PERM_LABEL[state]}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Location is also controlled inside Duka under <Link to="../location" relative="path" className="font-medium text-brand-green-deep hover:underline">Location settings</Link>.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Help & support                                                      */
/* ------------------------------------------------------------------ */

export function HelpCenterPanel() {
  const [open, setOpen] = useState<number | null>(0);
  const categories = Array.from(new Set(FAQS.map((f) => f.category)));
  return (
    <Panel title="Help Center" description="Answers to the questions we hear most often.">
      {categories.map((cat) => (
        <div key={cat} className="mb-5 last:mb-0">
          <p className="mb-2 text-label font-semibold uppercase text-ink-3">{cat}</p>
          <div className="flex flex-col gap-2">
            {FAQS.filter((f) => f.category === cat).map((faq) => {
              const idx = FAQS.indexOf(faq);
              const isOpen = open === idx;
              return (
                <button
                  key={faq.q}
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{faq.q}</span>
                    <span className="shrink-0 text-brand-green-fresh">{isOpen ? '−' : '+'}</span>
                  </span>
                  {isOpen && <span className="mt-2 block text-sm text-ink-2">{faq.a}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <Link to="/how-it-works" className="mt-2 flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm font-medium text-brand-green-deep transition-colors hover:bg-surface-2">
        How Duka works, step by step
        <ExternalLink size={16} strokeWidth={2} className="text-ink-3" />
      </Link>
    </Panel>
  );
}

export function ContactSupportPanel() {
  const phoneDigits = BRAND.supportPhone.replace(/[^\d]/g, '');
  const rows: { icon: LucideIcon; label: string; value: string; href: string }[] = [
    { icon: MessageCircle, label: 'WhatsApp', value: BRAND.supportPhone, href: `https://wa.me/${phoneDigits}` },
    { icon: Phone, label: 'Call', value: BRAND.supportPhone, href: `tel:${BRAND.supportPhone.replace(/\s+/g, '')}` },
    { icon: Mail, label: 'Email', value: BRAND.supportEmail, href: `mailto:${BRAND.supportEmail}` },
  ];
  return (
    <Panel title="Contact Support" description="A real person answers. Include your order number if it is about an order.">
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <a
              key={r.label}
              href={r.href}
              target={r.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-line px-4 py-3 transition-[background-color,transform] hover:bg-surface-2 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
                <Icon size={17} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{r.label}</span>
                <span className="block truncate text-xs text-ink-3">{r.value}</span>
              </span>
              <ChevronRight size={17} strokeWidth={2} className="text-ink-3" />
            </a>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Duka is run by {BRAND.operatorName} in {BRAND.country}. Something wrong with an order in progress? Open the order and tap "Something went wrong" so support sees the details.
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-ink-3">
        <ShieldCheck size={14} strokeWidth={2} className="text-brand-green" /> Support will never ask for your password.
      </div>
    </Panel>
  );
}
