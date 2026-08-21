import { useMemo, useState } from 'react';
import {
  Bell, Database, Download, Globe, LucideIcon, Monitor, Moon, Palette,
  Search, ShieldCheck, Sparkles, Sun, User,
} from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Accent, Language, Theme, Tone, usePreferences } from '../../context/PreferencesContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useToast } from '../../components/ui/Toast';

type SectionId = 'personalization' | 'account' | 'appearance' | 'general' | 'notifications' | 'security' | 'data';

interface Section {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  /** Extra words the search box should match beyond the visible labels. */
  keywords: string;
}

const SECTIONS: Section[] = [
  { id: 'personalization', label: 'Personalization', icon: Sparkles, keywords: 'style tone voice traits warm friendly professional candid efficient encouraging' },
  { id: 'account', label: 'Account', icon: User, keywords: 'email phone number profile picture avatar name photo' },
  { id: 'appearance', label: 'Appearance', icon: Palette, keywords: 'theme dark light system colour color accent' },
  { id: 'general', label: 'General', icon: Globe, keywords: 'language english swahili luganda region' },
  { id: 'notifications', label: 'Notifications', icon: Bell, keywords: 'alerts messages orders offers marketing email push toggle' },
  { id: 'security', label: 'Security and login', icon: ShieldCheck, keywords: 'password change sign in login credentials' },
  { id: 'data', label: 'Data controls', icon: Database, keywords: 'export download data privacy account information' },
];

const TONES: { value: Tone; label: string; blurb: string }[] = [
  { value: 'professional', label: 'Professional', blurb: 'Precise and businesslike' },
  { value: 'friendly', label: 'Friendly', blurb: 'Warm and conversational' },
  { value: 'candid', label: 'Candid', blurb: 'Direct, no sugar-coating' },
  { value: 'efficient', label: 'Efficient', blurb: 'Short, straight to the point' },
  { value: 'encouraging', label: 'Encouraging', blurb: 'Positive and supportive' },
];

const TRAITS = ['Warm', 'Enthusiastic', 'Detailed', 'Concise', 'Playful', 'Formal', 'Uses emojis', 'Plain language'];

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
];

const LANGUAGES: { value: Language; label: string; note: string }[] = [
  { value: 'en', label: 'English', note: 'Default' },
  { value: 'sw', label: 'Kiswahili', note: 'Translations in progress' },
  { value: 'lg', label: 'Luganda', note: 'Translations in progress' },
];

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <GlassCard padding="lg" hover={false} className="mb-5">
      <h2 className="font-display text-lg font-medium text-brand-green-deep">{title}</h2>
      {description && <p className="mt-1 text-sm text-brand-ink/55">{description}</p>}
      <div className="mt-5">{children}</div>
    </GlassCard>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 border-b border-brand-green/10 py-3 text-left last:border-0"
    >
      <span>
        <span className="block text-sm font-medium text-brand-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-brand-ink/45">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-green-fresh' : 'bg-brand-ink/20'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { preferences, update } = usePreferences();
  const { push } = useToast();

  const [search, setSearch] = useState('');
  const [active, setActive] = useState<SectionId>('personalization');

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => `${s.label} ${s.keywords}`.toLowerCase().includes(q));
  }, [search]);

  // A search that narrows to one section should just take you there.
  const shown = search.trim() ? matches : SECTIONS.filter((s) => s.id === active);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.patch('/settings/profile', {
        fullName,
        email: email.trim() || null,
        phone,
        avatarUrl: avatarUrl || null,
      });
      push('Account updated', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    try {
      await api.post('/settings/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      push('Password changed', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function exportData() {
    try {
      const res = await api.get('/settings/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duka-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  function toggleTrait(trait: string) {
    const has = preferences.traits.includes(trait);
    update({ traits: has ? preferences.traits.filter((t) => t !== trait) : [...preferences.traits, trait] });
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Settings</h1>
      <p className="mt-1 text-sm text-brand-ink/50">Make Duka work the way you want it to.</p>

      <div className="relative mt-5">
        <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-ink/35" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings…"
          className="w-full rounded-full border border-brand-green/15 bg-brand-white/70 py-2.5 pl-10 pr-4 text-sm text-brand-ink outline-none transition-colors placeholder:text-brand-ink/35 focus:border-brand-green-fresh"
        />
      </div>

      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        {!search.trim() && (
          <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-56 md:flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className={[
                    'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active === s.id
                      ? 'bg-brand-green-mist text-brand-green-deep'
                      : 'text-brand-ink/60 hover:bg-brand-green-mist/60',
                  ].join(' ')}
                >
                  <Icon size={17} strokeWidth={1.75} className="shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="min-w-0 flex-1">
          {search.trim() && matches.length === 0 && (
            <GlassCard padding="lg" hover={false}>
              <p className="text-sm text-brand-ink/50">No settings match "{search}".</p>
            </GlassCard>
          )}

          {shown.some((s) => s.id === 'personalization') && (
            <SectionCard
              title="Personalization"
              description="How Duka talks to you across the app — in confirmations, notifications and empty states."
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Style and tone</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update({ tone: t.value })}
                    className={[
                      'rounded-xl2 border p-3 text-left transition-all',
                      preferences.tone === t.value
                        ? 'border-brand-green-fresh bg-brand-green-mist'
                        : 'border-brand-green/15 hover:bg-brand-green-mist/50',
                    ].join(' ')}
                  >
                    <p className="text-sm font-semibold text-brand-green-deep">{t.label}</p>
                    <p className="mt-0.5 text-xs text-brand-ink/50">{t.blurb}</p>
                  </button>
                ))}
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Traits</p>
              <p className="mt-1 text-xs text-brand-ink/45">Pick any that fit. These shape wording, not what the app does.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRAITS.map((trait) => {
                  const on = preferences.traits.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => toggleTrait(trait)}
                      className={[
                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                        on
                          ? 'border-brand-green-fresh bg-brand-green-fresh text-white'
                          : 'border-brand-green/20 text-brand-ink/60 hover:bg-brand-green-mist',
                      ].join(' ')}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {shown.some((s) => s.id === 'account') && (
            <SectionCard title="Account" description="Your name, contact details and profile picture.">
              <div className="flex flex-col gap-4">
                <ImageUpload folder="avatars" label="Profile picture" value={avatarUrl} onChange={setAvatarUrl} />
                <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input
                  label="Phone number"
                  type="tel"
                  hint="This is what you log in with."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <div>
                  <GlassButton size="sm" disabled={savingProfile} onClick={saveProfile}>
                    {savingProfile ? 'Saving…' : 'Save changes'}
                  </GlassButton>
                </div>
              </div>
            </SectionCard>
          )}

          {shown.some((s) => s.id === 'appearance') && (
            <SectionCard title="Appearance" description="Applies instantly and is remembered on this account.">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Theme</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {THEMES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update({ theme: t.value })}
                      className={[
                        'flex flex-col items-center gap-2 rounded-xl2 border py-4 text-sm font-medium transition-all',
                        preferences.theme === t.value
                          ? 'border-brand-green-fresh bg-brand-green-mist text-brand-green-deep'
                          : 'border-brand-green/15 text-brand-ink/60 hover:bg-brand-green-mist/50',
                      ].join(' ')}
                    >
                      <Icon size={20} strokeWidth={1.6} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Accent colour</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => update({ accent: a.value })}
                    className={[
                      'flex items-center gap-3 rounded-xl2 border p-3 text-left transition-all',
                      preferences.accent === a.value
                        ? 'border-brand-green-fresh bg-brand-green-mist'
                        : 'border-brand-green/15 hover:bg-brand-green-mist/50',
                    ].join(' ')}
                  >
                    <span
                      className="h-8 w-8 shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${a.swatch[0]}, ${a.swatch[1]})` }}
                    />
                    <span className="text-sm font-semibold text-brand-green-deep">{a.label}</span>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {shown.some((s) => s.id === 'general') && (
            <SectionCard title="General" description="Language and regional preferences.">
              <div className="flex flex-col gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => update({ language: l.value })}
                    className={[
                      'flex items-center justify-between rounded-xl2 border px-4 py-3 text-left transition-all',
                      preferences.language === l.value
                        ? 'border-brand-green-fresh bg-brand-green-mist'
                        : 'border-brand-green/15 hover:bg-brand-green-mist/50',
                    ].join(' ')}
                  >
                    <span className="text-sm font-semibold text-brand-green-deep">{l.label}</span>
                    <span className="text-xs text-brand-ink/45">{l.note}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-brand-ink/45">
                Your choice is saved now; the interface itself is still English-only until translations land.
              </p>
            </SectionCard>
          )}

          {shown.some((s) => s.id === 'notifications') && (
            <SectionCard title="Notifications" description="Choose what reaches your bell.">
              <Toggle
                checked={preferences.notify_messages}
                onChange={(v) => update({ notifyMessages: v })}
                label="Messages"
                description="When the other side of an order writes to you"
              />
              <Toggle
                checked={preferences.notify_orders}
                onChange={(v) => update({ notifyOrders: v })}
                label="Order updates"
                description="Accepted, shopping, out for delivery, completed"
              />
              <Toggle
                checked={preferences.notify_offers}
                onChange={(v) => update({ notifyOffers: v })}
                label="Offers"
                description="When a shopper offers to take your request"
              />
              {/* Only meaningful to a shopper — a customer has no available
                  jobs list, so showing them the switch would be noise. */}
              {user?.role === 'shopper' && (
                <Toggle
                  checked={preferences.notify_new_requests}
                  onChange={(v) => update({ notifyNewRequests: v })}
                  label="New jobs posted"
                  description="When a customer posts a request you could take"
                />
              )}
              <Toggle
                checked={preferences.notify_marketing}
                onChange={(v) => update({ notifyMarketing: v })}
                label="News and offers from Duka"
                description="Occasional product news. Off by default."
              />
            </SectionCard>
          )}

          {shown.some((s) => s.id === 'security') && (
            <SectionCard title="Security and login" description="Change the password you use to sign in.">
              <div className="flex max-w-sm flex-col gap-4">
                <PasswordInput
                  label="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <PasswordInput
                  label="New password"
                  hint="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <div>
                  <GlassButton
                    size="sm"
                    disabled={savingPassword || !currentPassword || newPassword.length < 8}
                    onClick={savePassword}
                  >
                    {savingPassword ? 'Updating…' : 'Change password'}
                  </GlassButton>
                </div>
              </div>
            </SectionCard>
          )}

          {shown.some((s) => s.id === 'data') && (
            <SectionCard title="Data controls" description="Everything this account holds, in one file.">
              <GlassButton size="sm" variant="secondary" onClick={exportData}>
                <Download size={15} strokeWidth={2} /> Export my data
              </GlassButton>
              <p className="mt-3 text-xs text-brand-ink/45">
                Downloads your account details, preferences, addresses, requests, orders, ratings and
                notifications as JSON.
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
