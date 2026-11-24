import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../aiw/Icon';

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'AW';

/**
 * The profile badge at the bottom of the sidebar (student and admin portals). Clicking it opens
 * a small menu above it: the account, "My profile" (when there is a profile page) and "Sign out".
 * Closes on outside click, Escape and navigation.
 */
export const ProfileMenu: React.FC<{
  name: string;
  subtitle: React.ReactNode;
  email?: string | null;
  profilePath?: string | null;
  onSignOut: () => void | Promise<void>;
}> = ({ name, subtitle, email, profilePath, onSignOut }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    wrap.current?.querySelector<HTMLElement>('.me-menu [role=menuitem]')?.focus();
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="me-wrap" ref={wrap}>
      {open && (
        <div className="me-menu" role="menu" aria-label="Account" data-testid="profile-menu">
          <div className="me-head">
            <b>{name}</b>
            {email && <small>{email}</small>}
          </div>
          {profilePath && (
            <Link role="menuitem" to={profilePath} className="me-item" onClick={() => setOpen(false)} data-testid="profile-menu-profile">
              <Icon name="user" size={17} /> My profile
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="me-item danger"
            disabled={busy}
            data-testid="profile-menu-signout"
            onClick={async () => { setBusy(true); await onSignOut(); setBusy(false); }}
          >
            <Icon name="logout" size={17} /> {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
      <button
        ref={button}
        type="button"
        className="me"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="profile-badge"
        title="Account"
      >
        <span className="avatar" aria-hidden="true">{initialsOf(name)}</span>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <b>{name}</b>
          <small>{subtitle}</small>
        </div>
        <Icon name="chev" size={15} className="me-chev" />
      </button>
    </div>
  );
};
