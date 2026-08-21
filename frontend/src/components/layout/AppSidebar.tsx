import { NavLink, useNavigate } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';
import { AccountToggle } from './AccountToggle';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface AppSidebarProps {
  items: NavItem[];
  roleLabel: string;
}

export function AppSidebar({ items, roleLabel }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="glass sticky top-4 mb-4 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-xl3 p-5">
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh font-display text-sm font-bold text-white">
          {BRAND.name[0]}
        </span>
        <div>
          <p className="font-display text-base font-semibold text-brand-green-deep">{BRAND.name}</p>
          <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">{roleLabel}</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gradient-to-br from-brand-green to-brand-green-fresh text-white shadow-glass'
                  : 'text-brand-ink/65 hover:bg-brand-green-mist hover:text-brand-green-deep',
              ].join(' ')
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-brand-green/10 pt-4">
        <p className="truncate px-1 text-sm font-medium text-brand-ink">{user?.fullName}</p>
        <p className="truncate px-1 text-xs text-brand-ink/40">{user?.phone}</p>

        <AccountToggle />

        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="mt-3 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-brand-red hover:bg-brand-red/10"
        >
          ↩ Log out
        </button>
      </div>
    </aside>
  );
}
