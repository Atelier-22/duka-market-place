import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Store as StoreIcon, Wallet } from 'lucide-react';
import { api, apiErrorMessage } from '../../../services/api';
import { usePreferences } from '../../../context/PreferencesContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { Panel, Toggle } from './SettingsPanels';
import { SellerVerificationPanel } from '../../seller/SellerVerificationPanel';

interface SellerSettings {
  notify_orders: boolean;
  notify_reviews: boolean;
  notify_followers: boolean;
  notify_low_stock: boolean;
  notify_product_changes: boolean;
  auto_confirm_orders: boolean;
  processing_days: number;
}

function useSellerSettings() {
  const { push } = useToast();
  const [settings, setSettings] = useState<SellerSettings | null>(null);
  useEffect(() => { api.get('/seller/settings').then((r) => setSettings(r.data.settings)).catch(() => undefined); }, []);
  async function update(patch: Record<string, unknown>) {
    try {
      const res = await api.patch('/seller/settings', patch);
      setSettings(res.data.settings);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }
  return { settings, update };
}

export function StoreLinkPanel() {
  return (
    <Panel title="Store profile" description="Your public storefront: name, address, logo, cover, contact details and policies.">
      <Link to="/seller/store" className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 transition-colors hover:bg-surface-2">
        <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep"><StoreIcon size={18} /></span><span><span className="block text-sm font-medium text-ink">Edit your store</span><span className="block text-caption text-ink-3">Opens the store editor</span></span></span>
        <ArrowRight size={16} className="text-ink-3" />
      </Link>
    </Panel>
  );
}

export function SellerVerificationSettingsPanel() {
  return (
    <Panel title="Verification" description="Verified stores show a badge on the marketplace.">
      <SellerVerificationPanel />
    </Panel>
  );
}

export function SellerOrderPrefsPanel() {
  const { settings, update } = useSellerSettings();
  const [days, setDays] = useState('');
  useEffect(() => { if (settings) setDays(String(settings.processing_days)); }, [settings]);
  if (!settings) return <Panel title="Order handling"><p className="text-sm text-ink-3">Loading…</p></Panel>;
  return (
    <Panel title="Order handling" description="How new orders are treated the moment they arrive.">
      <Toggle checked={settings.auto_confirm_orders} onChange={(v) => update({ autoConfirmOrders: v })} label="Confirm orders automatically" description="Skip the confirm step. Customers cannot cancel once confirmed, so only use this when your stock is always accurate." />
      <div className="mt-4 flex items-end gap-2">
        <Input label="Processing time (days)" type="number" inputMode="numeric" min={0} max={30} value={days} onChange={(e) => setDays(e.target.value)} hint="Shown to customers as how long you take before delivery." />
        <Button size="sm" variant="secondary" className="mb-6" onClick={() => update({ processingDays: Math.max(0, Math.min(30, Number(days) || 0)) })}>Save</Button>
      </div>
    </Panel>
  );
}

export function SellerInventoryPrefsPanel() {
  const { settings, update } = useSellerSettings();
  if (!settings) return <Panel title="Inventory"><p className="text-sm text-ink-3">Loading…</p></Panel>;
  return (
    <Panel title="Inventory" description="Stock is reserved when a customer orders and released if the order is cancelled.">
      <Toggle checked={settings.notify_low_stock} onChange={(v) => update({ notifyLowStock: v })} label="Low-stock alerts" description="A notification when a product falls to its threshold. Set the threshold on each product." />
      <Link to="/seller/inventory" className="mt-4 flex min-h-[44px] items-center gap-2 text-sm font-medium text-brand-green">Open inventory <ArrowRight size={14} /></Link>
    </Panel>
  );
}

export function SellerPayoutLinkPanel() {
  return (
    <Panel title="Payouts" description="Customers pay cash on delivery today. Payout details are kept for when Duka settles online payments to you.">
      <Link to="/seller/payments" className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 transition-colors hover:bg-surface-2">
        <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep"><Wallet size={18} /></span><span><span className="block text-sm font-medium text-ink">Payments and payout details</span><span className="block text-caption text-ink-3">Collected, expected, and where to pay you</span></span></span>
        <ArrowRight size={16} className="text-ink-3" />
      </Link>
    </Panel>
  );
}

export function SellerNotificationsPanel() {
  const { settings, update } = useSellerSettings();
  if (!settings) return <Panel title="Store activity"><p className="text-sm text-ink-3">Loading…</p></Panel>;
  return (
    <Panel title="Store activity" description="What your store tells you about.">
      <Toggle checked={settings.notify_orders} onChange={(v) => update({ notifyOrders: v })} label="Orders" description="New orders and customer cancellations" />
      <Toggle checked={settings.notify_reviews} onChange={(v) => update({ notifyReviews: v })} label="Reviews" description="When a buyer reviews your store or a product" />
      <Toggle checked={settings.notify_followers} onChange={(v) => update({ notifyFollowers: v })} label="New followers" />
      <Toggle checked={settings.notify_low_stock} onChange={(v) => update({ notifyLowStock: v })} label="Low stock" />
      <Toggle checked={settings.notify_product_changes} onChange={(v) => update({ notifyProductChanges: v })} label="Product moderation" description="If Duka unpublishes or flags one of your products" />
    </Panel>
  );
}

export function StoreUpdatesPanel() {
  const { preferences, update } = usePreferences();
  return (
    <Panel title="Stores you follow" description="Stores on the marketplace you chose to follow.">
      <Toggle checked={preferences.notify_store_updates} onChange={(v) => update({ notifyStoreUpdates: v })} label="New products" description="A notification when a store you follow publishes something new" />
      <Link to="/app/following" className="mt-4 flex min-h-[44px] items-center gap-2 text-sm font-medium text-brand-green">Manage the stores you follow <ArrowRight size={14} /></Link>
    </Panel>
  );
}
