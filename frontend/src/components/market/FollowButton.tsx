import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';

interface FollowButtonProps {
  slug: string;
  following: boolean;
  followerCount: number;
  onChange: (next: { following: boolean; followerCount: number }) => void;
  size?: 'sm' | 'md';
}

export function FollowButton({ slug, following, followerCount, onChange, size = 'md' }: FollowButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      try { sessionStorage.setItem('duka_return_to', `/store/${slug}`); } catch { /* storage unavailable */ }
      navigate('/login');
      return;
    }
    setBusy(true);
    try {
      const res = following
        ? await api.delete(`/marketplace/stores/${slug}/follow`)
        : await api.post(`/marketplace/stores/${slug}/follow`);
      onChange({ following: res.data.following, followerCount: res.data.followerCount });
      push(res.data.following ? 'You are following this store' : 'Unfollowed', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      size={size}
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
    >
      <Heart size={16} strokeWidth={2} className={following ? 'fill-brand-red text-brand-red' : ''} />
      {following ? 'Following' : 'Follow'}
      <span className="text-caption opacity-80">{followerCount}</span>
    </Button>
  );
}
