import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LucideIcon, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { NavStyle, useNavStyle } from '../../hooks/useNavStyle';
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

const TAB_COUNT = 5;

function isActivePath(to: string, pathname: string): boolean {
  if (to.split('/').length <= 2) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

const SLIDE = 'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

function slotClasses(navStyle: NavStyle, isActive: boolean): string {
  const base =
    'relative z-10 flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition-colors duration-200';
  if (navStyle === 'glow') {
    return `${base} ${isActive ? 'text-brand-red' : 'text-white/45'}`;
  }
  return `${base} ${isActive ? 'text-brand-green-deep' : 'text-brand-ink/45'}`;
}

function Slot({
  navStyle,
  icon: Icon,
  label,
  count,
  isActive,
}: {
  navStyle: NavStyle;
  icon: LucideIcon;
  label: string;
  count: number;
  isActive: boolean;
}) {
  const badge = count > 0 && (
    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-brand-white">
      {count > 9 ? '9+' : count}
    </span>
  );

  if (navStyle === 'pop') {
    return (
      <>
        <span
          className={[
            'relative flex h-11 w-11 items-center justify-center rounded-full transition-all',
            SLIDE,
            isActive
              ? '-translate-y-3.5 bg-brand-green text-white shadow-glass'
              : 'translate-y-0 bg-transparent',
          ].join(' ')}
        >
          <Icon size={22} strokeWidth={isActive ? 2.15 : 1.75} />
          {badge}
        </span>
        <span
          className={`max-w-full truncate px-0.5 transition-all ${SLIDE} ${
            isActive ? 'pointer-events-none -translate-y-2 opacity-0' : 'opacity-100'
          }`}
        >
          {label}
        </span>
      </>
    );
  }

  if (navStyle === 'glow') {
    return (
      <span
        className={`relative transition-transform ${SLIDE} ${isActive ? '-translate-y-0.5 scale-110' : ''}`}
      >
        <Icon size={23} strokeWidth={isActive ? 2.2 : 1.75} />
        {badge}
      </span>
    );
  }

  return (
    <>
      <span className={`relative transition-transform ${SLIDE} ${isActive ? '-translate-y-0.5' : ''}`}>
        <Icon size={22} strokeWidth={isActive ? 2.15 : 1.75} />
        {badge}
      </span>
      <span
        className={`max-w-full truncate px-0.5 transition-transform ${SLIDE} ${isActive ? '-translate-y-0.5' : ''}`}
      >
        {label}
      </span>
      <span
        aria-hidden
        className={`h-1 w-1 rounded-full bg-brand-green-fresh transition-opacity duration-200 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

export function MobileNav({ items }: MobileNavProps) {
  const { user, logout } = useAuth();
  const { totalUnread } = useConversations(!!user);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navStyle] = useNavStyle();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  const tabs = items.slice(0, TAB_COUNT);
  const overflow = items.slice(TAB_COUNT);
  const overflowActive = overflow.some((i) => isActivePath(i.to, location.pathname));

  function badgeFor(item: NavItem) {
    return item.badge === 'messages' ? totalUnread : 0;
  }

  const slotCount = tabs.length + 1;
  const tabIndex = tabs.findIndex((i) => isActivePath(i.to, location.pathname));
  const activeIndex = tabIndex >= 0 ? tabIndex : overflowActive ? tabs.length : -1;

  return (
    <>

      <nav
        className="fixed z-40 lg:hidden"
        style={{
          left: '0.75rem',
          right: '0.75rem',
          bottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
        aria-label="Main"
      >
        <div
          className={[
            'relative flex items-stretch rounded-xl3 shadow-glass-lg',
            navStyle === 'glow'
              ? 'bg-brand-ink/95 backdrop-blur-md'
              : 'glass border border-brand-green/10',
          ].join(' ')}
        >

          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-1.5 left-0 flex items-center justify-center px-1 transition-all ${SLIDE}`}
            style={{
              width: `${100 / slotCount}%`,
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              opacity: activeIndex < 0 ? 0 : 1,
            }}
          >
            {navStyle === 'labeled' && (
              <span className="block h-full w-full rounded-[1.6rem] bg-brand-green-mist" />
            )}
            {navStyle === 'glow' && (
              <span className="block h-11 w-11 rounded-full bg-brand-red/35 blur-md" />
            )}
            {navStyle === 'pop' && (
              <span className="block h-full w-full rounded-[1.6rem] bg-brand-green-mist/60" />
            )}
          </span>

          {tabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) => slotClasses(navStyle, isActive)}
            >
              {({ isActive }) => (
                <Slot
                  navStyle={navStyle}
                  icon={item.icon}
                  label={item.label}
                  count={badgeFor(item)}
                  isActive={isActive}
                />
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More"
            aria-expanded={menuOpen}
            className={slotClasses(navStyle, overflowActive)}
          >
            <Slot
              navStyle={navStyle}
              icon={MoreHorizontal}
              label="More"
              count={0}
              isActive={overflowActive}
            />
          </button>
        </div>
      </nav>

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
                          ? 'bg-brand-green text-white'
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
