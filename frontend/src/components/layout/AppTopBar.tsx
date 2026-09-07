import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Image as ImageIcon, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DukaMark } from '../ui/DukaLogo';
import { Avatar } from '../ui/Avatar';
import { ImageLightbox } from '../ui/ImageLightbox';
import { NotificationBell } from '../domain/NotificationBell';
import { homeFor } from '../../utils/home';
import { useSignOut } from '../../hooks/useSignOut';
import { BRAND } from '../../config/brand';

export function AppTopBar({ roleLabel }: { roleLabel: string }) {
  const { user, linkedAccounts } = useAuth();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const home = homeFor(user?.role);
  const settings = `${home}/settings`;
  const canSwitch = linkedAccounts.some((a) => a.role !== 'admin' && a.id !== user?.id);
  const item =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-2';

  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-surface"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
        <Link
          to={home}
          aria-label={`${BRAND.name} home`}
          className="-ml-1 flex items-center gap-2.5 rounded-lg px-1 py-1 transition-transform active:scale-[0.98]"
        >
          <DukaMark size={30} />
          <span className="font-display text-[19px] font-semibold leading-none text-brand-green-deep">{BRAND.name}</span>
          <span className="ml-0.5 hidden rounded-full bg-brand-green-mist px-2 py-0.5 text-caption font-semibold text-brand-green-deep sm:inline-flex">
            {roleLabel}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <NotificationBell />
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={open}
              aria-haspopup="menu"
              className="flex items-center rounded-full ring-2 ring-transparent transition-[transform,box-shadow] hover:ring-line-strong active:scale-95 focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Avatar name={user?.fullName ?? ''} src={user?.avatarUrl} size={36} />
            </button>

            {open && (
              <div
                ref={menuRef}
                role="menu"
                className="surface absolute right-0 z-40 mt-2 w-56 animate-scale-in origin-top-right rounded-xl p-1.5 shadow-raised"
              >
                <div className="px-3 pb-2 pt-2">
                  <p className="truncate text-sm font-semibold text-ink">{user?.fullName}</p>
                  <p className="truncate text-caption text-ink-3">{user?.phone}</p>
                </div>
                <div className="mb-1.5 border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => {
                    setOpen(false);
                    if (user?.avatarUrl) setViewing(true);
                    else navigate(`${settings}/personal`);
                  }}
                >
                  <ImageIcon size={16} strokeWidth={1.9} />
                  {user?.avatarUrl ? 'View profile picture' : 'Add a profile picture'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => { setOpen(false); navigate(settings); }}
                >
                  <Settings size={16} strokeWidth={1.9} /> Settings
                </button>
                {canSwitch && (
                  <button
                    type="button"
                    role="menuitem"
                    className={item}
                    onClick={() => { setOpen(false); navigate(`${settings}/switch-account`); }}
                  >
                    <ArrowLeftRight size={16} strokeWidth={1.9} /> Switch account
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className={`${item} text-brand-red hover:bg-danger-soft/40`}
                  onClick={() => { setOpen(false); void signOut(); }}
                >
                  <LogOut size={16} strokeWidth={1.9} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewing && user?.avatarUrl && (
        <ImageLightbox
          src={user.avatarUrl}
          alt={user.fullName}
          caption={user.fullName}
          onClose={() => setViewing(false)}
        />
      )}
    </header>
  );
}
