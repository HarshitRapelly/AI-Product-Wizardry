import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { COURSE_PRICE } from '../data/mockData';
import { 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Building2, 
  ArrowRight, 
  BadgeCheck
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { user, processPayment } = useAuthAndCourse();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'corporate' | 'digital'>('digital');
  const [isProcessing, setIsProcessing] = useState(false);

  const studentName = user?.name || 'Fellow';
  const studentEmail = user?.email || 'student@university.edu';

  const handleConfirmEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const methodLabel = 'Batch 1 Fellowship Grant (100% Waived)';

    setTimeout(() => {
      processPayment(methodLabel);
      setIsProcessing(false);
      navigate('/payment-success');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-accent/15 selection:text-accent">
      <div className="max-w-5xl mx-auto text-left">
        
        {/* Header Breadcrumb & Brand */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 mb-8 border-b border-border gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="font-bold text-lg text-primary tracking-tight block">AI Product Wizardry</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent block">Batch 1 Enrollment Confirmation</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs text-text-muted bg-surface px-3 py-1.5 rounded-lg border border-border">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Academic Admissions Portal</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Enrollment Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Student Verification Details Card */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle">
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  1. Enrolled Student Profile
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Identity</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-text-muted">Student Name</span>
                  <p className="font-bold text-sm text-primary mt-0.5">{studentName}</p>
                </div>
                <div>
                  <span className="text-text-muted">Registered Email</span>
                  <p className="font-bold text-sm text-primary mt-0.5">{studentEmail}</p>
                </div>
              </div>
            </div>

            {/* Fellowship Grant Details */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle space-y-4">
              <div className="pb-4 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
                  2. Batch 1 Fellowship Grant
                </span>
                <p className="text-xs text-text-muted mt-1">
                  Tuition of ₹11,000 is 100% sponsored for admitted Batch 1 undergraduate fellows.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Fellowship Scholarship</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">100% WAIVED</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your seat in AI Product Wizardry has been approved under the NIAT × NxtWave Undergraduate Fellowship. No payment card or banking details are required.
                </p>
              </div>

              {/* Confirm Enrollment Button */}
              <form onSubmit={handleConfirmEnrollment} className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl shadow-premium bg-accent hover:bg-accent-hover text-white text-base font-bold transition-all disabled:opacity-75"
                >
                  <span>{isProcessing ? 'Confirming Enrollment...' : 'Accept Fellowship & Select Learning Mode'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Order Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary pb-4 border-b border-border">
                Fellowship Summary
              </h3>

              {/* Product Info */}
              <div className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-base text-primary">AI Product Wizardry</h4>
                    <span className="text-xs text-text-muted block mt-0.5">6 Months · 12 Modules · Undergraduate Fellowship</span>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-accent border border-blue-200">
                      Idea · Build · Launch
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-text-muted line-through block">₹{COURSE_PRICE.original.toLocaleString()}</span>
                    <span className="font-bold text-lg text-emerald-600">FREE</span>
                  </div>
                </div>

                <p className="text-xs text-text-muted leading-relaxed pt-2 border-t border-border/60">
                  Full unrestricted access to all 12 modules, weekly assignments, jury presentation defenses, and alumni portfolio certification.
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="py-4 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Standard Tuition Fee</span>
                  <span className="line-through">₹{COURSE_PRICE.original.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Batch 1 Fellowship Sponsorship</span>
                  <span>-₹{COURSE_PRICE.original.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Student Fee Due Today</span>
                  <span className="font-bold text-primary">₹0</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between text-sm font-bold text-primary">
                  <span>Total Payable</span>
                  <span className="text-lg text-emerald-600">₹0 (100% Free)</span>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-4 pt-4 border-t border-border space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Portfolio-backed credential upon graduation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Choose Online Cohort or Campus Batch next</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Immediate access to Module 0 & Module 1</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
