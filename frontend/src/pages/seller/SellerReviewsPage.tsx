import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Textarea } from '../../components/ui/Textarea';
import { Avatar } from '../../components/ui/Avatar';
import { RatingStars } from '../../components/ui/RatingStars';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { timeAgo } from '../../market/format';

export function SellerReviewsPage() {
  usePageMeta({ title: 'Reviews', noindex: true });
  const { push } = useToast();
  const [data, setData] = useState<{ storeReviews: any[]; productReviews: any[] } | null>(null);
  const [tab, setTab] = useState<'store' | 'products'>('store');
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const load = useCallback(() => { api.get('/seller/reviews').then((r) => setData(r.data)).catch(() => setData({ storeReviews: [], productReviews: [] })); }, []);
  useEffect(load, [load]);

  async function send(id: string) {
    try {
      await api.post(`/seller/reviews/${id}/reply`, { reply: reply.trim() });
      push('Reply posted', 'success');
      setReplying(null); setReply('');
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  }

  if (!data) return <SkeletonRegion label="Loading reviews" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={4} /></div></SkeletonRegion>;
  const avg = data.storeReviews.length ? data.storeReviews.reduce((s, r) => s + Number(r.stars), 0) / data.storeReviews.length : 0;

  return (
    <div className="pb-10">
      <PageHeader title="Reviews" subtitle={data.storeReviews.length ? <span className="flex items-center gap-2"><RatingStars value={avg} /> {avg.toFixed(1)} from {data.storeReviews.length} store review{data.storeReviews.length === 1 ? '' : 's'}</span> : 'Reviews come from buyers after delivery. Reply to show you listen.'} />
      <Tabs ariaLabel="Review type" value={tab} onChange={setTab} items={[{ value: 'store', label: 'Store', count: data.storeReviews.length }, { value: 'products', label: 'Products', count: data.productReviews.length }]} />
      <div className="mt-4 flex flex-col gap-3">
        {tab === 'store' && (data.storeReviews.length === 0 ? <EmptyState icon={<Star />} title="No store reviews yet" description="Deliver a few orders and ask happy customers to leave one." /> : data.storeReviews.map((r) => (
          <Card key={r.id} padding="md">
            <div className="flex items-start gap-3">
              <Avatar name={r.author_name} src={r.author_avatar} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-ink">{r.author_name}</p><span className="text-caption text-ink-3">Order #{r.order_number} · {timeAgo(r.created_at)}</span></div>
                <RatingStars value={r.stars} />
                {r.bought && <p className="mt-0.5 text-caption text-ink-3">Bought: {r.bought}</p>}
                {r.comment && <p className="mt-1.5 text-sm text-ink-2">{r.comment}</p>}
                {r.reply ? (
                  <div className="mt-2 rounded-xl bg-surface-2 p-3 text-sm"><p className="text-caption font-semibold uppercase text-ink-3">Your reply · {timeAgo(r.replied_at)}</p><p className="mt-0.5 text-ink-2">{r.reply}</p></div>
                ) : replying === r.id ? (
                  <div className="mt-2"><Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={1000} placeholder="Thank them, or explain what happened." autoFocus /><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => send(r.id)} disabled={reply.trim().length === 0}>Post reply</Button><Button size="sm" variant="tertiary" onClick={() => { setReplying(null); setReply(''); }}>Cancel</Button></div></div>
                ) : (
                  <Button size="sm" variant="secondary" className="mt-2" onClick={() => setReplying(r.id)}><MessageSquare size={14} /> Reply</Button>
                )}
              </div>
            </div>
          </Card>
        )))}
        {tab === 'products' && (data.productReviews.length === 0 ? <EmptyState icon={<Star />} title="No product reviews yet" /> : data.productReviews.map((r) => (
          <Card key={r.id} padding="md">
            <div className="flex items-start gap-3">
              <Avatar name={r.author_name} src={r.author_avatar} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-ink">{r.author_name} <span className="font-normal text-ink-3">on {r.product_name}</span></p><span className="text-caption text-ink-3">{timeAgo(r.created_at)}</span></div>
                <RatingStars value={r.stars} />
                {r.comment && <p className="mt-1.5 text-sm text-ink-2">{r.comment}</p>}
              </div>
            </div>
          </Card>
        )))}
      </div>
    </div>
  );
}
