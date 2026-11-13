import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { Sparkles, ArrowRight, CheckCircle2, User, Mail, GraduationCap } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { user, processPayment } = useAuthAndCourse();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const studentName = user?.name || 'Fellow';
  const studentEmail = user?.email || 'student@university.edu';

  const handleConfirmEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      processPayment('Batch 1 Fellowship (Free)');
      setIsProcessing(false);
      navigate('/payment-success');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-accent/15 selection:text-accent flex flex-col justify-center">
      <div className="max-w-xl mx-auto w-full text-left">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="text-left">
              <span className="font-bold text-xl text-primary tracking-tight block">AI Product Wizardry</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent block">Powered by NxtWave</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">
            Confirm Your Enrollment
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Review your details and proceed to select your preferred learning mode.
          </p>
        </div>

        {/* Enrollment Card */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          
          {/* Program Information */}
          <div className="pb-5 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent block mb-1">
                  Selected Program
                </span>
                <h2 className="text-lg font-bold text-primary">
                  AI Product Wizardry
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  6 Months · 12 Modules · 3–4 hrs/week
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                Batch 1 · Free
              </span>
            </div>
          </div>

          {/* Student Profile Summary */}
          <div className="space-y-3 pb-5 border-b border-border text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
              Student Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Student Name</span>
                  <span className="font-semibold text-primary block truncate">{studentName}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Email Address</span>
                  <span className="font-semibold text-primary block truncate">{studentEmail}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Program Fee Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-border">
            <div>
              <span className="text-xs font-bold text-primary block">Tuition Fee</span>
              <span className="text-[11px] text-text-muted">Batch 1 fellowship sponsorship</span>
            </div>
            <span className="text-base font-extrabold text-emerald-600">
              ₹0 (Free)
            </span>
          </div>

          {/* Action Button */}
          <form onSubmit={handleConfirmEnrollment}>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl shadow-premium bg-accent hover:bg-accent-hover text-white text-sm font-bold transition-all disabled:opacity-75"
            >
              <span>{isProcessing ? 'Confirming Enrollment...' : 'Confirm Enrollment & Select Learning Mode'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-text-muted">
            No payment required for Batch 1. You will select Online or Classroom mode on the next screen.
          </p>
        </div>

      </div>
    </div>
  );
};
