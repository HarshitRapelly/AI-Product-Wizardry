import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { 
  Sparkles, 
  Menu, 
  X, 
  ArrowRight, 
  Download, 
  ShieldCheck, 
  GraduationCap, 
  Globe, 
  MapPin, 
  CheckCircle2, 
  BookOpen, 
  Users 
} from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { isAuthenticated, isPaid, learningMode, user, logout } = useAuthAndCourse();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardLink = () => {
    if (!isAuthenticated) return '/login';
    if (!isPaid) return '/checkout';
    if (!learningMode) return '/choose-learning-mode';
    return learningMode === 'online' ? '/online/dashboard' : '/offline/dashboard';
  };

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
    <div className="min-h-screen flex flex-col bg-background text-text selection:bg-accent/15 selection:text-accent font-sans">
      {/* Top Notification Bar for Corporate Prototype */}
      <div className="bg-primary text-white text-xs py-2 px-4 border-b border-secondary/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-300">Executive Academy 2026 Admissions Open</span>
            <span className="hidden md:inline text-slate-400">• Limited to 40 Fellows per cohort</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <a 
              href="/assets/ai-product-wizardry-brochure.pdf" 
              download="ai-product-wizardry-brochure.pdf"
              className="hover:text-white transition-colors flex items-center gap-1.5 underline decoration-slate-500 hover:decoration-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Brochure (PDF)</span>
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-400">Prototype 01 — Professional Edition</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
                <Sparkles className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-primary tracking-tight leading-tight">
                  AI Product Wizardry
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Professional Academy
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary">
              <Link to="/" className="hover:text-accent transition-colors">
                Home
              </Link>
              <button 
                onClick={() => scrollToSection('overview')} 
                className="hover:text-accent transition-colors text-left"
              >
                Program Overview
              </button>
              <button 
                onClick={() => scrollToSection('curriculum')} 
                className="hover:text-accent transition-colors text-left"
              >
                What You'll Learn
              </button>
              <button 
                onClick={() => scrollToSection('why-us')} 
                className="hover:text-accent transition-colors text-left"
              >
                Why Choose Us
              </button>
              <button 
                onClick={() => scrollToSection('faqs')} 
                className="hover:text-accent transition-colors text-left"
              >
                FAQs
              </button>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link
                    to={getDashboardLink()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-slate-800 transition-all shadow-subtle"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={logout}
                    className="text-xs text-text-muted hover:text-red-600 font-medium px-2 py-1"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="px-4 py-2.5 text-sm font-semibold text-secondary hover:text-primary transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all shadow-subtle shadow-accent/20"
                  >
                    <span>Get Started</span>
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
                className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-surface px-4 pt-3 pb-6 space-y-3">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-slate-50"
            >
              Home
            </Link>
            <button
              onClick={() => scrollToSection('overview')}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-secondary hover:bg-slate-50"
            >
              Program Overview
            </button>
            <button
              onClick={() => scrollToSection('curriculum')}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-secondary hover:bg-slate-50"
            >
              What You'll Learn
            </button>
            <button
              onClick={() => scrollToSection('why-us')}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-secondary hover:bg-slate-50"
            >
              Why Choose Us
            </button>
            <button
              onClick={() => scrollToSection('faqs')}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-secondary hover:bg-slate-50"
            >
              FAQs
            </button>
            <div className="pt-4 border-t border-border flex flex-col gap-2">
              <a
                href="/assets/ai-product-wizardry-brochure.pdf"
                download="ai-product-wizardry-brochure.pdf"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-secondary hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Brochure (PDF)</span>
              </a>
              {isAuthenticated ? (
                <Link
                  to={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-secondary hover:bg-slate-50"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold"
                  >
                    <span>Get Started CTA</span>
                    <ArrowRight className="w-4 h-4" />
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
      <footer className="bg-primary text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white tracking-tight">AI Product Wizardry</h3>
                  <p className="text-xs text-slate-400">Professional EdTech Academy</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                The premier executive academy training modern product leaders, senior engineers, and founders in the rigorous science of probabilistic AI systems.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="/assets/ai-product-wizardry-brochure.pdf"
                  download="ai-product-wizardry-brochure.pdf"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Official Brochure</span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Curriculum</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/#curriculum" className="hover:text-white transition-colors">12 Learning Levels</Link></li>
                <li><Link to="/#curriculum" className="hover:text-white transition-colors">Level 01 Foundations</Link></li>
                <li><Link to="/#curriculum" className="hover:text-white transition-colors">RAG & Vector Search</Link></li>
                <li><Link to="/#curriculum" className="hover:text-white transition-colors">LLM Evaluation Suites</Link></li>
                <li><Link to="/#curriculum" className="hover:text-white transition-colors">Executive Capstone</Link></li>
              </ul>
            </div>

            {/* Modalities */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Learning Modes</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Online Live Cohorts</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Offline Campus Labs</span>
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Reading</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Executive Mentorship</span>
                </li>
              </ul>
            </div>

            {/* Legal / Contact Placeholder */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Admissions</h4>
              <div className="space-y-2 text-sm text-slate-400">
                <p>admissions@aiproductwizardry.edu</p>
                <p>Innovation Tower, Suite 400</p>
                <p>Tech Center District</p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-300 border border-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Accredited Executive Syllabus</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© 2026 AI Product Wizardry Academy Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-200 cursor-pointer">Privacy Framework</span>
              <span className="hover:text-slate-200 cursor-pointer">Enterprise Terms</span>
              <span className="hover:text-slate-200 cursor-pointer">Security Certifications</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
