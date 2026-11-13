import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  Mail, 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  Globe, 
  MapPin, 
  Lock 
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { user, learningMode, selectLearningMode, processPayment } = useAuthAndCourse();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryMode = searchParams.get('mode') as 'online' | 'offline' | null;
  const activeMode: 'online' | 'offline' = queryMode || learningMode || 'online';

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('fellow@okaxis');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [isProcessing, setIsProcessing] = useState(false);

  const studentName = user?.name || 'Fellow';
  const studentEmail = user?.email || 'student@university.edu';

  const isOnline = activeMode === 'online';
  const tuitionAmount = isOnline ? 11000 : 0;

  const handleConfirmEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Ensure mode is persisted in context
    if (learningMode !== activeMode) {
      selectLearningMode(activeMode);
    }

    const methodLabel = isOnline
      ? `${paymentMethod.toUpperCase()} Payment (₹11,000)`
      : 'Campus Batch Fellowship Grant (100% Waived)';

    setTimeout(() => {
      processPayment(methodLabel, tuitionAmount);
      setIsProcessing(false);
      navigate('/payment-success');
    }, 500);
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
            {isOnline ? 'Online Cohort Tuition & Payment' : 'Campus Batch Fellowship Enrollment'}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isOnline 
              ? 'Complete your tuition payment to finalize your seat in the Online Live Virtual Cohort.' 
              : 'Review your details to claim your 100% waived seat in the Campus Batch.'}
          </p>
        </div>

        {/* Enrollment Card */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-6">
          
          {/* Program Information */}
          <div className="pb-5 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent block mb-1">
                  Selected Modality
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-primary">
                    AI Product Wizardry — {isOnline ? 'Online Learning' : 'Offline Learning'}
                  </h2>
                </div>
                <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                  {isOnline ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-cerulean" />
                      <span>Virtual Masterclasses · Recorded Sessions · 6 Months</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Campus Innovation Center · Peer Labs · 6 Months</span>
                    </>
                  )}
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                isOnline 
                  ? 'bg-accent-subtle text-accent border border-accent-light/60' 
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              }`}>
                {isOnline ? 'ONLINE COHORT' : '100% WAIVED'}
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

          {/* Pricing & Waiver Breakdown */}
          {isOnline ? (
            /* ONLINE COHORT: REALISTIC PAYMENT REQUIRED */
            <div className="space-y-4 pb-5 border-b border-border">
              <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Standard 6-Month Tuition</span>
                  <span>₹11,000</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Digital LMS & Video Recording Access</span>
                  <span className="text-emerald-700 font-semibold">Included</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm font-extrabold text-primary">
                  <span>Total Amount Due</span>
                  <span className="text-base text-accent">₹11,000</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
                  Select Payment Method
                </span>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'upi' 
                        ? 'border-accent bg-accent-subtle text-accent font-bold ring-1 ring-accent' 
                        : 'border-border bg-surface text-secondary hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'card' 
                        ? 'border-accent bg-accent-subtle text-accent font-bold ring-1 ring-accent' 
                        : 'border-border bg-surface text-secondary hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'netbanking' 
                        ? 'border-accent bg-accent-subtle text-accent font-bold ring-1 ring-accent' 
                        : 'border-border bg-surface text-secondary hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>NetBanking</span>
                  </button>
                </div>

                {/* Simulated Payment Inputs */}
                {paymentMethod === 'upi' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-border text-xs space-y-1.5">
                    <label className="text-[11px] font-semibold text-secondary block">UPI ID / VPA</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <span className="text-[10px] text-text-muted">Supports Google Pay, PhonePe, Paytm, BHIM</span>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-border text-xs space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="08/28"
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono"
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        defaultValue="842"
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'netbanking' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-border text-xs space-y-1.5">
                    <label className="text-[11px] font-semibold text-secondary block">Select Your Bank</label>
                    <select className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs">
                      <option>HDFC Bank</option>
                      <option>State Bank of India</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* OFFLINE CAMPUS BATCH: 100% WAIVED */
            <div className="space-y-4 pb-5 border-b border-border">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Campus Fellowship Waiver</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">100% WAIVED</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your seat in AI Product Wizardry has been approved under the Campus Batch Fellowship. 100% of the tuition fee is waived for admitted campus students.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Standard 6-Month Tuition</span>
                  <span className="line-through">₹11,000</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Campus Batch Fellowship Waiver</span>
                  <span>-₹11,000</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm font-extrabold text-primary">
                  <span>Total Amount Due</span>
                  <span className="text-base text-emerald-600">₹0 (100% Waived)</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <form onSubmit={handleConfirmEnrollment}>
            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl shadow-premium text-white text-sm font-bold transition-all disabled:opacity-75 ${
                isOnline 
                  ? 'bg-accent hover:bg-accent-hover' 
                  : 'bg-primary hover:bg-slate-800'
              }`}
            >
              <span>
                {isProcessing 
                  ? (isOnline ? 'Processing ₹11,000 Payment...' : 'Confirming Fellowship Waiver...') 
                  : (isOnline ? 'Pay ₹11,000 & Complete Enrollment' : 'Confirm Enrollment (100% Waived)')}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 text-xs text-text-muted pt-1">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Academic Enrollment • Instant Portal Access</span>
          </div>
        </div>

      </div>
    </div>
  );
};
