import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, LucideIcon, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { NavStyle, useNavStyle } from '../../hooks/useNavStyle';
import { AccountToggle } from './AccountToggle';
import { useSignOut } from '../../hooks/useSignOut';
import {
  ACTIVE_RISE,
  ACTIVE_SCALE,
  INACTIVE_SCALE,
  INDICATOR_SIZE,
  INDICATOR_TOP,
  NAVIGATION_SPRING,
  NAV_BAR_HEIGHT,
  NAV_COLOR_DURATION,
  NAV_ICON_BOX,
  NAV_LABEL_GAP,
  NAV_LABEL_HEIGHT,
  NAV_PAD_BOTTOM,
  NAV_TINT_DURATION,
  springTransition,
} from '../../config/motion';

export type NavTint = 'fresh' | 'green' | 'deep' | 'yellow' | 'red' | 'ink';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'messages';
  tint?: NavTint;
}

interface MobileNavProps {
  items: NavItem[];
}

const TAB_COUNT = 5;

const TINT_VAR: Record<NavTint, string> = {
  fresh: 'var(--brand-green-fresh)',
  green: 'var(--brand-green)',
  deep: 'var(--brand-green-deep)',
  yellow: 'var(--brand-yellow)',
  red: 'var(--brand-red)',
  ink: 'var(--brand-ink)',
};

function isActivePath(to: string, pathname: string): boolean {
  if (to.split('/').length <= 2) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

interface SlotProps {
  icon: LucideIcon;
  label: string;
  count: number;
  isActive: boolean;
  ready: boolean;
  spring: { easing: string; duration: number };
}

function Slot({ icon: Icon, label, count, isActive, ready, spring }: SlotProps) {
  const iconStyle: CSSProperties = {
    width: NAV_ICON_BOX,
    height: NAV_ICON_BOX,
    transform: isActive
      ? `translate3d(0, ${-ACTIVE_RISE}px, 0) scale(${ACTIVE_SCALE})`
      : `translate3d(0, 0, 0) scale(${INACTIVE_SCALE})`,
    transition: ready
      ? `transform ${spring.duration}ms ${spring.easing}, color ${NAV_COLOR_DURATION}ms ease`
      : 'none',
  };

  return (
    <>
      <span className="duka-nav__press">
        <span className={`duka-nav__icon ${isActive ? 'is-active' : ''}`} style={iconStyle}>
          <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
          {count > 0 && (
            <span className="duka-nav__badge">{count > 9 ? '9+' : count}</span>
          )}
        </span>
      </span>
      <span
        className="duka-nav__label"
        style={{ height: NAV_LABEL_HEIGHT, lineHeight: `${NAV_LABEL_HEIGHT}px` }}
      >
        {label}
      </span>
    </>
  );
}

export function MobileNav({ items }: MobileNavProps) {
  const { user } = useAuth();
  const signOut = useSignOut();
  const { totalUnread } = useConversations(!!user);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navStyle] = useNavStyle();

  const tabs = items.slice(0, TAB_COUNT);
  const overflow = items.slice(TAB_COUNT);
  const hasMore = overflow.length > 0;
  const overflowActive = overflow.some((i) => isActivePath(i.to, location.pathname));
  const slotCount = tabs.length + (hasMore ? 1 : 0);

  const tabIndex = tabs.findIndex((i) => isActivePath(i.to, location.pathname));
  const activeIndex = tabIndex >= 0 ? tabIndex : overflowActive ? tabs.length : -1;
  const activeItem = tabIndex >= 0 ? tabs[tabIndex] : null;

  const spring = springTransition(NAVIGATION_SPRING);

  const barRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const next = slotRefs.current
        .slice(0, slotCount)
        .map((el) => (el ? el.offsetLeft + el.offsetWidth / 2 : 0));
      setCenters((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [slotCount]);

  useEffect(() => {
    if (ready || centers.length === 0) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [centers, ready]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  function badgeFor(item: NavItem) {
    return item.badge === 'messages' ? totalUnread : 0;
  }

  const hasTarget = activeIndex >= 0 && centers[activeIndex] !== undefined;
  const indicatorX = hasTarget ? centers[activeIndex] - INDICATOR_SIZE / 2 : 0;

  const indicatorStyle: CSSProperties = {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    top: INDICATOR_TOP,
    transform: `translate3d(${indicatorX}px, 0, 0)`,
    opacity: hasTarget ? 1 : 0,
    transition: ready
      ? `transform ${spring.duration}ms ${spring.easing}, opacity ${NAV_COLOR_DURATION}ms ease, box-shadow ${NAV_TINT_DURATION}ms ease`
      : 'none',
  };

  const barStyle = {
    height: NAV_BAR_HEIGHT,
    '--nav-tint': TINT_VAR[activeItem?.tint ?? 'fresh'],
    transition: `background-color ${NAV_TINT_DURATION}ms ease, box-shadow ${NAV_TINT_DURATION}ms ease`,
  } as CSSProperties;

  const slotStyle: CSSProperties = { paddingBottom: NAV_PAD_BOTTOM, gap: NAV_LABEL_GAP };

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
          ref={barRef}
          className={`duka-nav ${navStyle === 'dark' ? 'duka-nav--dark' : ''}`}
          style={barStyle}
        >
          <span aria-hidden className="duka-nav__indicator" style={indicatorStyle} />

          {tabs.map((item, i) => (
            <NavLink
              key={item.to}
              ref={(el) => { slotRefs.current[i] = el; }}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) => `duka-nav__slot ${isActive ? 'is-active' : ''}`}
              style={slotStyle}
            >
              {({ isActive }) => (
                <Slot
                  icon={item.icon}
                  label={item.label}
                  count={badgeFor(item)}
                  isActive={isActive}
                  ready={ready}
                  spring={spring}
                />
              )}
            </NavLink>
          ))}

          {hasMore && (
            <button
              ref={(el) => { slotRefs.current[tabs.length] = el; }}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="More"
              aria-expanded={menuOpen}
              className={`duka-nav__slot ${overflowActive ? 'is-active' : ''}`}
              style={slotStyle}
            >
              <Slot
                icon={MoreHorizontal}
                label="More"
                count={0}
                isActive={overflowActive}
                ready={ready}
                spring={spring}
              />
            </button>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-brand-ink/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="surface max-h-[85vh] w-full animate-fade-up overflow-y-auto rounded-t-2xl p-5"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{user?.fullName}</p>
                <p className="truncate text-xs text-ink-3">{user?.phone}</p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-transform hover:bg-brand-green-mist active:scale-95"
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
                        'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-[background-color,transform] active:scale-[0.97]',
                        isActive
                          ? 'bg-brand-green text-white'
                          : 'bg-surface-2 text-ink-2',
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

            <AccountToggle />

            <button
              type="button"
              onClick={() => { setMenuOpen(false); void signOut(); }}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl border border-line text-sm font-semibold text-brand-red transition-[background-color,transform] hover:bg-danger-soft/40 active:scale-[0.99]"
            >
              <LogOut size={18} strokeWidth={1.9} /> Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export type { NavStyle };
