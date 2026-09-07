import { useAuth } from '../../context/AuthContext';
import { useUnreadReminder } from '../../hooks/useUnreadReminder';

export function UnreadReminder() {
  const { user } = useAuth();
  useUnreadReminder(!!user);
  return null;
}
