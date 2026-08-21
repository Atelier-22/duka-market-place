import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, LucideIcon, PanelLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AccountToggle } from './AccountToggle';
import { useConversations } from '../../hooks/useConversations';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Which live counter, if any, this item shows as a badge. */
  badge?: 'messages';
}

interface AppSidebarProps {
  items: NavItem[];
}

const STORAGE_KEY = 'duka_sidebar_collapsed';

export function AppSidebar({ items }: AppSidebarProps) {
  const { user, logout } = useAuth();
  // Drives the unread badge on the Chats item.
  const { totalUnread } = useConversations(!!user);
  const navigate = useNavigate();

  // Remembered per device. Reading localStorage can throw in a private window,
  // so a failure just means "start expanded".
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Preference is a nicety; losing it is fine.
    }
  }, [collapsed]);

  return (
    <aside
      className={[
        // `overflow-hidden` so the scrolling nav below cannot spill past the
        // rounded corners; the height and offset both subtract the top bar, so
        // the footer stays on screen however many nav items there are.
        'glass sticky mb-4 flex shrink-0 flex-col overflow-hidden rounded-xl3 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[68px] p-3' : 'w-64 p-5',
      ].join(' ')}
      style={{
        top: 'calc(var(--duka-topbar, 92px) + 0.5rem)',
        height: 'calc(100dvh - var(--duka-topbar, 92px) - 1.5rem)',
      }}
    >
      {/* The toggle sits on its own row so the lockup below it can be centred
          rather than shunted off-axis by a control beside it. */}
      <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-expanded={!collapsed}
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-brand-ink/50',
            'transition-colors hover:bg-brand-green-mist hover:text-brand-green-deep',
          ].join(' ')}
        >
          <PanelLeft size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* No logo here any more — the top bar carries it, and showing it twice
          on a desktop was just the same mark in two places. */}
      {/* The only part that scrolls. Twelve items in the admin console
          overflowed and pushed the account block and Log out off the bottom of
          the screen, where they could not be reached at all. `min-h-0` is what
          lets a flex child actually shrink enough to scroll. */}
      <nav
        className={`mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5 ${
          collapsed ? 'items-center' : ''
        }`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const count = item.badge === 'messages' ? totalUnread : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'relative flex items-center rounded-xl text-sm font-medium transition-colors',
                  collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-gradient-to-br from-brand-green to-brand-green-fresh text-white shadow-glass'
                    : 'text-brand-ink/65 hover:bg-brand-green-mist hover:text-brand-green-deep',
                ].join(' ')
              }
            >
              <Icon size={18} strokeWidth={1.75} className="shrink-0" />
              {!collapsed && item.label}
              {count > 0 && (
                <span
                  className={[
                    'flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white',
                    collapsed ? 'absolute -right-0.5 -top-0.5' : 'ml-auto',
                  ].join(' ')}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={`mt-3 shrink-0 border-t border-brand-green/10 pt-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && (
          <>
            <p className="truncate px-1 text-sm font-medium text-brand-ink">{user?.fullName}</p>
            <p className="truncate px-1 text-xs text-brand-ink/40">{user?.phone}</p>
            <AccountToggle />
          </>
        )}

        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          title={collapsed ? 'Log out' : undefined}
          aria-label="Log out"
          className={[
            'mt-3 flex items-center rounded-xl text-sm font-medium text-brand-red hover:bg-brand-red/10',
            collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2 text-left',
          ].join(' ')}
        >
          <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </aside>
  );
}
