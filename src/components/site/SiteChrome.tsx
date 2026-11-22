import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { BRAND } from '../brand/BrandLogo';
import { Icon } from '../aiw/Icon';
import { useReveal } from '../aiw/useReveal';

/** Sticky top navigation of the public site (Home · Explore · Contact · Sign in · Register). */
export const SiteNav: React.FC = () => {
  const { isAuthenticated, isPaid } = useAuthAndCourse();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : undefined);
  return (
    <header className="nav">
      <Link className="brand" to="/" aria-label={`${BRAND.name} home`}>
        <img src={BRAND.logo} alt={BRAND.name} />
      </Link>
      <nav className="nav-links" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => `hide-sm${isActive ? ' on' : ''}`}>Home</NavLink>
        <NavLink to="/explore" className={cls}>Explore</NavLink>
        <NavLink to="/contact" className={({ isActive }) => `hide-sm${isActive ? ' on' : ''}`}>Contact</NavLink>
        {isAuthenticated && isPaid ? (
          <Link to="/dashboard" className="btn btn-primary btn-sm"><Icon name="wand" size={16} /> Go to my portal</Link>
        ) : isAuthenticated ? (
          <Link to="/register" className="btn btn-primary btn-sm">Continue registration</Link>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => `hide-sm${isActive ? ' on' : ''}`}>Sign in</NavLink>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export const SiteFooter: React.FC = () => (
  <footer className="foot">
    <div className="in">
      <img src={BRAND.logo} alt={BRAND.name} />
      <div>
        The certificate improves your profile; it does not guarantee a job.
        <br />© 2026 Nxtwave · AI Product Wizardry
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn btn-ghost btn-sm" to="/contact"><Icon name="msg" size={14} /> Get in touch</Link>
        <Link className="btn btn-ghost btn-sm" to="/explore">Explore</Link>
        <Link className="btn btn-primary btn-sm" to="/register">Register</Link>
      </div>
    </div>
  </footer>
);

/**
 * Wrapper of every redesigned public page: design-system scope, nav, footer, scroll reveal,
 * a gentle page-enter transition, and scroll-to-top / hash scrolling on navigation.
 */
export const PublicSite: React.FC<{ children: React.ReactNode; footer?: boolean }> = ({ children, footer = true }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();
  useReveal(ref, [pathname]);
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return (
    <div className="aiw">
      <div className="site aiw-page" ref={ref}>
        <a href="#main" className="aiw-skip">Skip to content</a>
        <SiteNav />
        <main id="main">{children}</main>
        {footer && <SiteFooter />}
      </div>
    </div>
  );
};
