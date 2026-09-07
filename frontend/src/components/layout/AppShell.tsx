import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { LocationPrompt } from '../domain/LocationPrompt';
import { UnreadReminder } from '../domain/UnreadReminder';
import { MobileNav, NavItem } from './MobileNav';

interface AppShellProps {
  items: NavItem[];
  roleLabel: string;
  maxWidth?: string;
}

export function AppShell({ items, roleLabel, maxWidth = 'max-w-6xl' }: AppShellProps) {
  const location = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(56);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageKey = location.pathname.split('/').slice(0, 4).join('/');

  return (
    <div className="min-h-screen bg-page" style={{ ['--duka-topbar' as string]: `${Math.round(barHeight)}px` }}>
      <div ref={barRef}>
        <AppTopBar roleLabel={roleLabel} />
      </div>
      <MobileNav items={items} />

      <LocationPrompt />
      <UnreadReminder />

      <div className={`mx-auto flex ${maxWidth} gap-8 px-4 py-5 sm:px-5 lg:px-8 lg:py-8`}>
        <div className="hidden lg:block">
          <AppSidebar items={items} />
        </div>

        <main className="app-main min-w-0 flex-1">
          <div key={pageKey} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
