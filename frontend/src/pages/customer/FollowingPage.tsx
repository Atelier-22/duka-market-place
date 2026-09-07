import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { StoreCard } from '../../components/market/StoreCard';
import { PublicStore } from '../../market/types';

export function FollowingPage() {
  usePageMeta({ title: 'Stores you follow', noindex: true });
  const [stores, setStores] = useState<PublicStore[] | null>(null);
  useEffect(() => { api.get('/marketplace/following').then((r) => setStores(r.data.stores)).catch(() => setStores([])); }, []);

  if (!stores) return <SkeletonRegion label="Loading" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;

  return (
    <div className="pb-10">
      <PageHeader title="Following" subtitle="Stores you follow. You hear when they publish something new." />
      {stores.length === 0 ? (
        <EmptyState icon={<Heart />} title="You are not following any store yet" description="Follow a store from its page to keep up with new products." action={<Link to="/marketplace"><Button size="sm">Find stores</Button></Link>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">{stores.map((s) => <StoreCard key={s.id} store={s} />)}</div>
      )}
    </div>
  );
}
