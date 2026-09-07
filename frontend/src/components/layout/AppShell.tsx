import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { LocationPrompt } from '../domain/LocationPrompt';
import { MobileNav, NavItem } from './MobileNav';

interface AppShellProps {
  items: NavItem[];
  roleLabel: string;

  maxWidth?: string;
}

export function AppShell({ items, roleLabel, maxWidth = 'max-w-7xl' }: AppShellProps) {

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

      <div ref={barRef}>
        <AppTopBar roleLabel={roleLabel} />
      </div>
      <MobileNav items={items} />

      <LocationPrompt />

      <div className={`mx-auto flex ${maxWidth} gap-4 p-3 sm:p-4`}>
        <div className="hidden lg:block">
          <AppSidebar items={items} />
        </div>

        <main className="app-main min-w-0 flex-1 py-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
