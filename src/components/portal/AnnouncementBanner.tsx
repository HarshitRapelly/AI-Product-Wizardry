import React, { useEffect, useState } from 'react';
import { Icon } from '../aiw/Icon';
import { fetchLiveAnnouncements, type Announcement } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { readStored, userKey, writeStored } from '../../lib/userStorage';

/**
 * Announcements from the program team (public.announcements, migration 20261124001100):
 * shown on the dashboard while published and within their dates. A student can hide one
 * on this device (remembered per student); nothing is shown when there are none or when
 * the database predates the migration.
 */
export const AnnouncementBanner: React.FC = () => {
  const { userId } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const key = userId ? userKey(userId, 'hidden_announcements') : null;
  const [hidden, setHidden] = useState<number[]>(() => (key ? readStored<number[]>(key, []) : []));

  useEffect(() => {
    let alive = true;
    void fetchLiveAnnouncements().then((r) => { if (alive && r.ok) setItems(r.value); });
    return () => { alive = false; };
  }, [userId]);

  const visible = items.filter((a) => !hidden.includes(a.id));
  if (!visible.length) return null;
  const hide = (id: number) => {
    const next = [...hidden, id].slice(-50);
    setHidden(next);
    if (key) writeStored(key, next);
  };

  return (
    <div className="ann-stack" data-testid="announcements">
      {visible.map((a) => (
        <section key={a.id} className={`ann ${a.tone}`} role={a.tone === 'important' ? 'alert' : 'status'} aria-label={`Announcement: ${a.title}`}>
          <span className="ann-ico" aria-hidden="true"><Icon name={a.tone === 'important' ? 'alert' : 'msg'} size={18} /></span>
          <div className="ann-body">
            <b>{a.title}</b>
            <p>{a.body}</p>
            {a.link_url && <a href={a.link_url} target="_blank" rel="noopener noreferrer">Open link <Icon name="right" size={13} /></a>}
          </div>
          <button type="button" className="ann-x" onClick={() => hide(a.id)} aria-label={`Hide announcement: ${a.title}`}>
            <Icon name="x" size={16} />
          </button>
        </section>
      ))}
    </div>
  );
};
