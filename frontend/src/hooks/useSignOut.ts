import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useBrandTransition } from '../components/ui/BrandTransition';

export function useSignOut(): () => Promise<void> {
  const { user, logout } = useAuth();
  const { reset } = usePreferences();
  const { play } = useBrandTransition();
  const navigate = useNavigate();

  const first = user?.fullName?.trim().split(' ')[0] ?? '';

  return useCallback(async () => {
    await play({
      label: first ? `See you soon, ${first}` : 'See you soon',
      task: () => {
        logout();
        reset();
        navigate('/', { replace: true });
      },
    });
  }, [play, logout, reset, navigate, first]);
}
