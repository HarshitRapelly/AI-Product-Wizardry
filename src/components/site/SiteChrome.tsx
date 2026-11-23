import React, { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { BRAND } from '../brand/BrandLogo';
import { Icon } from '../aiw/Icon';
import { SHOW_HOME_STATE } from '../guards/RouteGuards';
import { useReveal } from '../aiw/useReveal';

/**
 * "Explore": the #explore section (six-month journey) of the home page. On the home page it always
 * scrolls there smoothly (also when the address already ends in #explore); elsewhere it navigates
 * to /#explore and PublicSite scrolls after the page renders.
 */
export const ExploreLink: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  const { pathname } = useLocation();
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== '/' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const target = document.getElementById('explore');
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== '#explore') window.history.replaceState(window.history.state, '', '/#explore');
  };
  return (
    <Link to={{ pathname: '/', hash: '#explore' }} state={SHOW_HOME_STATE} className={className} onClick={onClick} data-testid="explore-link">
      {children}
    </Link>
  );
};

/** Sticky top navigation of the public site (Home · Explore · Contact · Sign in · Register). Explore = the #explore section of home. */
export const SiteNav: React.FC = () => {
  const { isAuthenticated, isPaid } = useAuthAndCourse();
  return (
    <header className="nav">
      <Link className="brand" to="/" aria-label={`${BRAND.name} home`}>
        <img src={BRAND.logo} alt={BRAND.name} />
      </Link>
      <nav className="nav-links" aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => `hide-sm${isActive ? ' on' : ''}`}>Home</NavLink>
        <ExploreLink>Explore</ExploreLink>
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
        <ExploreLink className="btn btn-ghost btn-sm">Explore</ExploreLink>
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
