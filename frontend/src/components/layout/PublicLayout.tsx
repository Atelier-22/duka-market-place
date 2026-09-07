import { Outlet, useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export function PublicLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <PublicNavbar />
      <main className="flex-1">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
