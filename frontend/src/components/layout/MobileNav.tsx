import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LucideIcon, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { AccountToggle } from './AccountToggle';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'messages';
}

interface MobileNavProps {
  items: NavItem[];
}

/** How many destinations get a permanent tab; the rest live behind "More". */
const TAB_COUNT = 4;

/**
 * Phone navigation.
 *
 * The sidebar is 256px wide. On a 375px phone that leaves about a hundred
 * pixels for the actual app, which is why the site was unusable on a handset.
 * Below `lg` the sidebar is hidden entirely and replaced by this: a compact top
 * bar, and a bottom tab strip for the destinations people use constantly.
 *
 * Bottom tabs rather than a hamburger because the bottom of the screen is where
 * a thumb already is — a menu button in the top-left corner is the hardest
 * place to reach one-handed on a large phone.
 */
export function MobileNav({ items }: MobileNavProps) {
  const { user, logout } = useAuth();
  const { totalUnread } = useConversations(!!user);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating away must close the sheet, or it covers the page you just asked for.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  const tabs = items.slice(0, TAB_COUNT);
  const overflow = items.slice(TAB_COUNT);
  const overflowActive = overflow.some((i) => location.pathname === i.to);

  function badgeFor(item: NavItem) {
    return item.badge === 'messages' ? totalUnread : 0;
  }

  return (
    <>
      {/* Top bar — identity and role, nothing that competes for the thumb. */}
      {/* Bottom tabs. pb-safe keeps them clear of the iPhone home indicator. */}
      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch rounded-none border-t border-brand-green/10 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const count = badgeFor(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                [
                  'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand-green-fresh' : 'text-brand-ink/50',
                ].join(' ')
              }
            >
              <span className="relative">
                <Icon size={21} strokeWidth={1.75} />
                {count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="More"
          aria-expanded={menuOpen}
          className={[
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            overflowActive ? 'text-brand-green-fresh' : 'text-brand-ink/50',
          ].join(' ')}
        >
          <MoreHorizontal size={21} strokeWidth={1.75} />
          More
        </button>
      </nav>

      {/* Everything else, as a sheet from the bottom — same reach argument. */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-brand-ink/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass max-h-[85vh] w-full overflow-y-auto rounded-t-2xl p-5"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-brand-ink">{user?.fullName}</p>
                <p className="truncate text-xs text-brand-ink/40">{user?.phone}</p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-ink/45 hover:bg-brand-green-mist"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {overflow.map((item) => {
                const Icon = item.icon;
                const count = badgeFor(item);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-gradient-to-br from-brand-green to-brand-green-fresh text-white'
                          : 'bg-brand-green-mist/50 text-brand-ink/75',
                      ].join(' ')
                    }
                  >
                    <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {count > 0 && (
                      <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-4 border-t border-brand-green/10 pt-3">
              <AccountToggle />
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-red hover:bg-brand-red/10"
              >
                <LogOut size={18} strokeWidth={1.75} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
