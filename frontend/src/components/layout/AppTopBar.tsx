import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DukaLockup } from '../ui/DukaLogo';
import { useToast } from '../ui/Toast';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

/**
 * The bar across the top of every signed-in page: the logo on the left, the
 * person's picture on the right.
 *
 * The avatar is the control for changing itself. Burying "profile picture"
 * three taps deep in Settings is why most accounts here have none — the place
 * you notice it missing should be the place you can fix it.
 */
export function AppTopBar({ roleLabel }: { roleLabel: string }) {
  const { user, refresh } = useAuth();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/uploads?folder=avatars', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.patch('/settings/profile', { avatarUrl: res.data.url });
      await refresh();
      push('Profile picture updated', 'success');
      setOpen(false);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removePicture() {
    setBusy(true);
    try {
      await api.patch('/settings/profile', { avatarUrl: null });
      await refresh();
      setOpen(false);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const home = user?.role === 'shopper' ? '/shopper' : '/app';
  const item = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-brand-ink/75 transition-colors hover:bg-brand-green-mist disabled:opacity-50';

  return (
    // `glass-liquid` rather than `glass`: this bar sits over the page and the
    // colour behind it should read through, not be frosted into a slab.
    <header className="glass-liquid sticky top-0 z-40 mb-3 flex items-center justify-between gap-3 rounded-b-2xl px-4 py-2">
      <Link to={home} aria-label="Duka home">
        <DukaLockup markSize={28} roleLabel={roleLabel} />
      </Link>

      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Your profile picture"
          aria-expanded={open}
          className="block rounded-full ring-2 ring-white/50 transition-transform active:scale-95"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh text-sm font-semibold text-white">
              {initials(user?.fullName ?? '')}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={menuRef}
            className="glass absolute right-0 z-40 mt-2 w-56 rounded-xl2 p-1.5 shadow-glass-lg"
          >
            <p className="px-3 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
              Profile picture
            </p>
            <button type="button" className={item} disabled={busy} onClick={() => libraryRef.current?.click()}>
              <ImageIcon size={16} strokeWidth={1.9} /> Choose from library
            </button>
            <button type="button" className={item} disabled={busy} onClick={() => cameraRef.current?.click()}>
              <Camera size={16} strokeWidth={1.9} /> Take a photo
            </button>
            {user?.avatarUrl && (
              <button
                type="button"
                className={`${item} text-brand-red hover:bg-brand-red/10`}
                disabled={busy}
                onClick={removePicture}
              >
                <X size={16} strokeWidth={1.9} /> Remove picture
              </button>
            )}
            {busy && <p className="px-3 py-2 text-xs text-brand-ink/45">Working…</p>}
          </div>
        )}

        {/* No `capture` — this one opens the gallery. */}
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
        />
      </div>
    </header>
  );
}
