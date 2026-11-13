import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Receipt, 
  Download
} from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const { user, paymentDetails } = useAuthAndCourse();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }
  }, []);

  const txId = paymentDetails?.transactionId || 'AIW-ADM-78291';
  const txDate = paymentDetails?.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const txMethod = paymentDetails?.method || 'Batch 1 Fellowship Grant (100% Waived)';

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-accent/15 selection:text-accent">
      <div className="max-w-xl mx-auto w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">AI Product Wizardry</span>
          </Link>
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">
            Enrollment Confirmed!
          </h1>
          <p className="text-sm text-text-muted mt-2">
            Your fellowship admission is approved. Welcome to AI Product Wizardry Batch 1.
          </p>
        </div>

        {/* Transaction Receipt Card */}
        <div className="bg-surface rounded-2xl border border-border shadow-card p-6 sm:p-8 space-y-6 text-left">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Official Admission Receipt
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              ENROLLED & VERIFIED
            </span>
          </div>

          {/* Details Table */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted">Admission Reference ID</span>
              <span className="font-mono font-bold text-primary">{txId}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted">Enrolled Fellow</span>
              <span className="font-semibold text-primary">{user?.name || 'Fellow'}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted">Registered Email</span>
              <span className="font-semibold text-primary">{user?.email || 'student@university.edu'}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted">Program Registered</span>
              <span className="font-semibold text-primary">AI Product Wizardry (12 Modules)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted">Funding Type</span>
              <span className="font-medium text-emerald-700">{txMethod}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-text-muted">Admission Date</span>
              <span className="text-secondary">{txDate}</span>
            </div>

            <div className="pt-2 flex justify-between text-sm font-bold text-primary">
              <span>Total Fee Charged</span>
              <span className="text-emerald-600 text-base">₹0 (100% Free Scholarship)</span>
            </div>
          </div>

          {/* Next Step Guidance Alert */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Next Step: Select Your Learning Mode</span>
            </span>
            <p className="text-blue-800 leading-relaxed">
              Now choose whether you wish to attend as an <span className="font-semibold">Online Cohort Fellow</span> or join the <span className="font-semibold">In-Person Campus Batch</span>.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 space-y-3">
            <button
              onClick={() => navigate('/choose-learning-mode')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl shadow-premium bg-accent hover:bg-accent-hover text-white text-base font-bold transition-all transform hover:-translate-y-0.5"
            >
              <span>Choose Learning Mode</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <a
              href="/assets/ai-product-wizardry-brochure.pdf"
              download="ai-product-wizardry-brochure.pdf"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4 text-text-muted" />
              <span>Download Official Curriculum Brochure (PDF)</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
