import { useAuth } from '../../context/AuthContext';
import { useUnreadReminder } from '../../hooks/useUnreadReminder';

/**
 * Nudges the user about unread chats while they are elsewhere in the app.
 * It renders nothing itself: the reminder is delivered through the shared
 * Toast (a solid, raised surface card), so there is no styling here.
 */
export function UnreadReminder() {
  const { user } = useAuth();
  useUnreadReminder(!!user);
  return null;
}
