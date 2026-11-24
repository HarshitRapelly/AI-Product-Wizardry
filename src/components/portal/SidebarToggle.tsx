import React from 'react';

/**
 * Collapses the sidebar to icons and expands it again. Sits at the top of the dark sidebar, next to
 * the logo (desktop only: hidden on phones, which use the slide-in menu).
 */
export const SidebarToggle: React.FC<{ collapsed: boolean; onToggle: () => void; controls: string }> = ({ collapsed, onToggle, controls }) => (
  <button
    type="button"
    className="sidetoggle"
    onClick={onToggle}
    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    aria-expanded={!collapsed}
    aria-controls={controls}
    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    data-testid="sidebar-toggle"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
      <path className="sidetoggle-arrow" d="M15.5 10l-2 2 2 2" />
    </svg>
  </button>
);
