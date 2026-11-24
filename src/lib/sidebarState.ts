import { useCallback, useState } from 'react';

/**
 * Desktop sidebar collapsed / expanded (student and admin portals). A view preference only:
 * remembered on this device (localStorage), never sent anywhere. Phones use the slide-in menu.
 */
const KEY = 'aiw:sidebar-collapsed';

function read(): boolean {
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(read);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { window.localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* private mode: keep it for this page */ }
      return next;
    });
  }, []);
  return [collapsed, toggle];
}
