import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <a href="#main" className="skip-link">Skip to content</a>
      <PublicNavbar />
      <main id="main" className="flex-1">
        <div key={location.pathname} className="page-enter">
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" aria-label="Loading" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
