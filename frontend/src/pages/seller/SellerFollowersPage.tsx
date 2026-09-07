import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { timeAgo } from '../../market/format';

export function SellerFollowersPage() {
  usePageMeta({ title: 'Followers', noindex: true });
  const [data, setData] = useState<{ followers: any[]; total: number } | null>(null);
  useEffect(() => { api.get('/seller/followers').then((r) => setData(r.data)).catch(() => setData({ followers: [], total: 0 })); }, []);
  if (!data) return <SkeletonRegion label="Loading followers" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={4} /></div></SkeletonRegion>;

  return (
    <div className="pb-10">
      <PageHeader title="Followers" subtitle={`${data.total} follower${data.total === 1 ? '' : 's'}. They hear when you publish something new.`} />
      {data.followers.length === 0 ? (
        <EmptyState icon={<Heart />} title="No followers yet" description="Share your store link. Every follower is notified of your new products." />
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-line">
            {data.followers.map((f) => (
              <li key={f.id} className="flex items-center gap-3 p-3 sm:p-4">
                <Avatar name={f.full_name} src={f.avatar_url} size={40} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{f.full_name}</p><p className="text-caption text-ink-3">{f.role === 'shopper' ? 'Shopper' : 'Customer'} · followed {timeAgo(f.followed_at)}{Number(f.orders) > 0 ? ` · ${f.orders} order${Number(f.orders) === 1 ? '' : 's'}` : ''}</p></div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
