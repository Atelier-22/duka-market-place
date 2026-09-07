import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, LucideIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AccountToggle } from './AccountToggle';
import { useConversations } from '../../hooks/useConversations';
import { Avatar } from '../ui/Avatar';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'messages';
}

interface AppSidebarProps {
  items: NavItem[];
}

const STORAGE_KEY = 'duka_sidebar_collapsed';

/** Desktop navigation: a quiet list on the page background, no container. */
export function AppSidebar({ items }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { totalUnread } = useConversations(!!user);
  const navigate = useNavigate();

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

    }
  }, [collapsed]);

  return (
    <aside
      className={[
        'sticky flex shrink-0 flex-col transition-[width] duration-200 ease-standard',
        collapsed ? 'w-14' : 'w-60',
      ].join(' ')}
      style={{
        top: 'calc(var(--duka-topbar, 56px) + 2rem)',
        height: 'calc(100dvh - var(--duka-topbar, 56px) - 4rem)',
      }}
    >
      <nav
        className={`flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto ${collapsed ? 'items-center' : ''}`}
        aria-label="Sections"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const count = item.badge === 'messages' ? totalUnread : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                [
                  'relative flex items-center rounded-lg text-sm font-medium transition-colors duration-150',
                  collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-brand-green-mist text-brand-green-deep'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.1 : 1.8} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
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
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={`mt-4 shrink-0 border-t border-line pt-3 ${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar name={user.fullName} src={user.avatarUrl} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
              <p className="truncate text-caption text-ink-3">{user.phone}</p>
            </div>
          </div>
        )}
        {!collapsed && <AccountToggle />}

        <div className={`mt-2 flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between gap-1'}`}>
          <button
            type="button"
            onClick={() => { logout(); navigate('/'); }}
            title={collapsed ? 'Log out' : undefined}
            aria-label="Log out"
            className={[
              'flex items-center rounded-lg text-sm font-medium text-brand-red transition-colors hover:bg-danger-soft/40',
              collapsed ? 'h-10 w-10 justify-center' : 'gap-2.5 px-3 py-2',
            ].join(' ')}
          >
            <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && 'Log out'}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen size={17} strokeWidth={1.8} /> : <PanelLeftClose size={17} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
