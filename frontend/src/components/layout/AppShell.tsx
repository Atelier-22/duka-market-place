import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { LocationPrompt } from '../domain/LocationPrompt';
import { MobileNav, NavItem } from './MobileNav';

interface AppShellProps {
  items: NavItem[];
  roleLabel: string;
  /** Wider cap for the admin console, which is table-heavy. */
  maxWidth?: string;
}

/**
 * The frame every signed-in page sits in, on both a desktop and a phone.
 *
 * One shell rather than three near-identical layouts: the customer, shopper and
 * admin areas differ only in their nav items, and keeping the responsive rules
 * in one place is what stops one of them quietly regressing on mobile.
 *
 * Below `lg` the sidebar is gone and MobileNav takes over — see the note there
 * about why a 256px sidebar makes a 375px screen unusable.
 */
export function AppShell({ items, roleLabel, maxWidth = 'max-w-7xl' }: AppShellProps) {
  /**
   * The sidebar needs to know how tall the top bar is.
   *
   * The bar is sticky, so it takes up flow space and pushes the sidebar down by
   * its own height — a sidebar sized to the full viewport then hangs off the
   * bottom of the screen, taking the log-out button with it. Measured rather
   * than guessed, because the bar grows with the lockup and the role label.
   */
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(92);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ ['--duka-topbar' as string]: `${Math.round(barHeight)}px` }}>
      <div className="atmosphere" />
      {/* Logo left, your picture right, on a phone and on a desktop alike. */}
      <div ref={barRef}>
        <AppTopBar roleLabel={roleLabel} />
      </div>
      <MobileNav items={items} />

      {/* Asks about location once, then not again for a week. */}
      <LocationPrompt />

      <div className={`mx-auto flex ${maxWidth} gap-4 p-3 sm:p-4`}>
        <div className="hidden lg:block">
          <AppSidebar items={items} />
        </div>

        {/*
          `app-main` reserves room for the fixed bottom tab strip, which would
          otherwise cover the last thing on every page. Defined in index.css so
          it can use env(safe-area-inset-bottom) and drop the padding again on
          desktop, where there is no bar.
        */}
        <main className="app-main min-w-0 flex-1 py-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
