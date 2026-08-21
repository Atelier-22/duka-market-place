import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
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
  return (
    <div className="min-h-screen">
      <div className="atmosphere" />
      <MobileNav items={items} roleLabel={roleLabel} />

      <div className={`mx-auto flex ${maxWidth} gap-4 p-3 sm:p-4`}>
        <div className="hidden lg:block">
          <AppSidebar items={items} roleLabel={roleLabel} />
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
