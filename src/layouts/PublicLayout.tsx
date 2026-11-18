import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { homeFor } from '../lib/onboarding';
import { BrandLogo } from '../components/brand/BrandLogo';
import { SHOW_HOME_STATE } from '../components/guards/RouteGuards';
import { 
  Sparkles, 
  Menu, 
  X, 
  ArrowRight, 
  Download, 
  ShieldCheck, 
  Globe, 
  MapPin, 
  BookOpen, 
  Users,
  CheckCircle2
} from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { isAuthenticated, isRegistered, isPaid, learningMode, logout } = useAuthAndCourse();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Same destination rule as the route guards (single source of truth).
  const getDashboardLink = () => (isAuthenticated ? homeFor({ learningMode, isPaid, registered: isRegistered }) : '/register');

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/#' + id);
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas bg-[radial-gradient(1100px_520px_at_80%_-10%,rgba(61,142,133,0.22),transparent)] text-text selection:bg-accent/15 selection:text-accent font-sans">
      {/* Top Notification Bar without brochure download link */}
      <div className="bg-primary text-white text-xs py-2 px-4 border-b border-secondary/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse"></span>
            <span className="font-semibold text-gold">FOR UNDERGRADUATES</span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="font-medium text-slate-300">Batch 1 Applications Now Open</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300">
            <span>Powered by NIAT × NxtWave</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">6 Months · 13 Levels (0–12) · 3–4 hrs/week</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-canvas-deep/85 backdrop-blur-md border-b border-white/10 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <Link to="/" state={SHOW_HOME_STATE} className="flex items-center gap-3 group" aria-label="AI Product Wizardry home page">
              <BrandLogo imgClassName="h-16" className="transition-transform duration-300 group-hover:scale-[1.03]" />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-cream/80">
              <Link 
                to="/" state={SHOW_HOME_STATE}
                className={`px-4 py-2 rounded-full transition-all duration-300 ${location.pathname === '/' ? 'bg-white/10 text-white font-semibold' : 'hover:text-white hover:bg-white/5'}`}
              >
                Home
              </Link>
              <button 
                onClick={() => scrollToSection('overview')} 
                className="px-4 py-2 rounded-full hover:text-white hover:bg-white/5 transition-all duration-300 text-left"
              >
                Program Overview
              </button>
              
              
              
              <button
                onClick={() => scrollToSection('journey')}
                className="px-4 py-2 rounded-full hover:text-white hover:bg-white/5 transition-all duration-300 text-left"
              >
                Journey
              </button>
              <button
                onClick={() => scrollToSection('curriculum')}
                className="px-4 py-2 rounded-full hover:text-white hover:bg-white/5 transition-all duration-300 text-left"
              >
                Curriculum
              </button>
              <button 
                onClick={() => scrollToSection('faqs')} 
                className="px-4 py-2 rounded-full hover:text-white hover:bg-white/5 transition-all duration-300 text-left"
              >
                FAQs
              </button>
            </nav>

            {/* Right Action: Prompt user to Register directly */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link
                    to={getDashboardLink()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ember text-white text-sm font-semibold hover:bg-ember-hover transition-all duration-300 shadow-subtle hover:-translate-y-0.5"
                  >
                    <span>My Learning Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={logout}
                    className="text-xs text-cream/70 hover:text-white font-medium px-2 py-1"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-xs text-cream/70 hover:text-white font-medium"
                  >
                    Already registered? <span className="font-semibold text-cream hover:underline">Log In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-ember text-white text-sm font-bold hover:bg-ember-hover transition-all duration-300 shadow-elevated hover:-translate-y-0.5"
                  >
                    <span>Register Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex md:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-cream/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-canvas-deep px-4 pt-3 pb-6 space-y-3">
            <Link 
              to="/" state={SHOW_HOME_STATE}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white/5"
            >
              Home
            </Link>
            
            
            
            
            <button
              onClick={() => scrollToSection('faqs')}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-cream/80 hover:bg-white/5"
            >
              FAQs
            </button>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  to={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-ember text-white text-sm font-semibold"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-ember text-white text-sm font-bold"
                  >
                    <span>Register</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-xs text-cream/70 hover:text-white py-1"
                  >
                    Already have an account? Log In
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Corporate Footer */}
      <footer className="bg-canvas-deep text-slate-300 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 text-left">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <BrandLogo imgClassName="h-20" />
                <p className="text-xs text-slate-400">Powered by NIAT × NxtWave</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Six months of stories, building and teamwork to learn the magic behind every app you can't put down. Made for undergraduates who like to make things.
              </p>
              <div className="pt-2">
                <a
                  href="/assets/ai-product-wizardry-brochure.pdf"
                  download="ai-product-wizardry-brochure.pdf"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-accent" />
                  <span>Download Curriculum PDF</span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
           

            {/* Modalities */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Delivery Modes</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Online Live Cohorts</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Offline Campus Batches</span>
                </li>
                
                
              </ul>
            </div>

            {/* Admissions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Admissions</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <p className="font-semibold text-white">Batch 1: Cohort Admissions</p>
                <p className="text-xs">Selective enrollment for undergraduates.</p>
                <p className="text-xs">admissions@aiproductwizardry.edu</p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-300 border border-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Portfolio-Backed Certificate</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© 2026 AI Product Wizardry • Powered by NIAT × NxtWave. The certificate improves your profile; it does not guarantee a job.</p>
            <div className="flex items-center gap-6">
              <Link to="/register" className="text-gold hover:underline font-semibold">Register for Batch 1</Link>
              <Link to="/login" className="hover:text-slate-200">Log In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
