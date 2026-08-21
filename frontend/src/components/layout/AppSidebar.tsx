import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, LucideIcon, PanelLeft } from 'lucide-react';
import { BRAND } from '../../config/brand';
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
  roleLabel: string;
}

const STORAGE_KEY = 'duka_sidebar_collapsed';

export function AppSidebar({ items, roleLabel }: AppSidebarProps) {
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
        'glass sticky top-4 mb-4 flex h-[calc(100vh-2rem)] shrink-0 flex-col rounded-xl3 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[68px] p-3' : 'w-64 p-5',
      ].join(' ')}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-1'}`}>
        {!collapsed && (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh font-display text-sm font-bold text-white">
              {BRAND.name[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-brand-green-deep">{BRAND.name}</p>
              <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">{roleLabel}</p>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-expanded={!collapsed}
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-brand-ink/50',
            'transition-colors hover:bg-brand-green-mist hover:text-brand-green-deep',
            collapsed ? '' : 'ml-auto',
          ].join(' ')}
        >
          <PanelLeft size={18} strokeWidth={1.75} />
        </button>
      </div>

      <nav className={`mt-8 flex flex-1 flex-col gap-1 ${collapsed ? 'items-center' : ''}`}>
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

      <div className={`mt-auto border-t border-brand-green/10 pt-4 ${collapsed ? 'flex flex-col items-center' : ''}`}>
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
