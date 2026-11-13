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
  HelpCircle,
  FileText,
  BadgeCheck
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { user, processPayment } = useAuthAndCourse();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'corporate' | 'digital'>('card');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('888');
  const [companyName, setCompanyName] = useState('Enterprise Innovations Inc.');
  const [poNumber, setPoNumber] = useState('PO-2026-AI-883');
  const [billingCountry, setBillingCountry] = useState('United States');
  const [isProcessing, setIsProcessing] = useState(false);

  const studentName = user?.name || 'Alex Mercer';
  const studentEmail = user?.email || 'alex.mercer@enterprise.ai';

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const methodLabel = paymentMethod === 'card' 
      ? 'Credit Card (Simulated)' 
      : (paymentMethod === 'corporate' ? 'Corporate Invoicing (Simulated)' : 'Digital Wallet (Simulated)');

    setTimeout(() => {
      processPayment(methodLabel);
      setIsProcessing(false);
      navigate('/payment-success');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-accent/15 selection:text-accent">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Breadcrumb & Brand */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 mb-8 border-b border-border gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
              <Sparkles className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <span className="font-bold text-lg text-primary tracking-tight block">AI Product Wizardry</span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">Executive Enrollment Checkout</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs text-text-muted bg-surface px-3 py-1.5 rounded-lg border border-border">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Simulated Checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Payment Form (7 Cols) */}
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
                  <span className="text-text-muted">Academic Email</span>
                  <p className="font-bold text-sm text-primary mt-0.5">{studentEmail}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle">
              <div className="pb-4 border-b border-border mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  2. Select Payment Method
                </span>
                <p className="text-xs text-text-muted mt-1">
                  Prototype demonstration: No actual financial charge will occur.
                </p>
              </div>

              {/* Method Tabs */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === 'card'
                      ? 'border-accent bg-blue-50/50 shadow-subtle text-primary'
                      : 'border-border hover:bg-slate-50 text-text-muted'
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-accent' : 'text-text-muted'}`} />
                  <span className="text-xs font-semibold">Credit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('corporate')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === 'corporate'
                      ? 'border-accent bg-blue-50/50 shadow-subtle text-primary'
                      : 'border-border hover:bg-slate-50 text-text-muted'
                  }`}
                >
                  <Building2 className={`w-5 h-5 ${paymentMethod === 'corporate' ? 'text-accent' : 'text-text-muted'}`} />
                  <span className="text-xs font-semibold">Corporate PO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('digital')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === 'digital'
                      ? 'border-accent bg-blue-50/50 shadow-subtle text-primary'
                      : 'border-border hover:bg-slate-50 text-text-muted'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${paymentMethod === 'digital' ? 'text-accent' : 'text-text-muted'}`} />
                  <span className="text-xs font-semibold">Apple / GPay</span>
                </button>
              </div>

              {/* Method Specific Form Fields */}
              <form onSubmit={handlePayNow} className="space-y-4">
                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Card Number (Simulated)
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="block w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">
                          Expiration Date
                        </label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="block w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-1">
                          Security Code (CVC)
                        </label>
                        <input
                          type="text"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          className="block w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'corporate' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Company / Enterprise Entity
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="block w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">
                        Purchase Order (PO) Reference
                      </label>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        className="block w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'digital' && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-border text-center space-y-2">
                    <p className="text-xs text-text-muted">
                      Simulated 1-click tokenized payment configured for test environment.
                    </p>
                    <span className="inline-block text-xs font-bold text-accent">
                      Ready for 1-Click Simulated Authorization
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Country / Billing Jurisdiction
                  </label>
                  <select
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    className="block w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>Germany</option>
                    <option>Singapore</option>
                    <option>India</option>
                    <option>Australia</option>
                  </select>
                </div>

                {/* Trust Seal */}
                <div className="pt-2 flex items-center gap-2 text-[11px] text-text-muted">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Simulated transaction. Full mock access unlocked immediately upon confirmation.</span>
                </div>

                {/* Submit Pay Now Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl shadow-premium bg-accent hover:bg-accent-hover text-white text-base font-bold transition-all disabled:opacity-75"
                  >
                    <span>{isProcessing ? 'Authorizing Simulated Payment...' : `Confirm & Pay $${COURSE_PRICE.current} USD`}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Right Column: Order Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-subtle">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary pb-4 border-b border-border">
                Order Summary
              </h3>

              {/* Product Info */}
              <div className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-base text-primary">AI Product Wizardry</h4>
                    <span className="text-xs text-text-muted block mt-0.5">Professional Executive Academy Fellowship</span>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      12-Level Comprehensive Access
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-text-muted line-through block">${COURSE_PRICE.original}</span>
                    <span className="font-bold text-lg text-primary">${COURSE_PRICE.current}</span>
                  </div>
                </div>

                <p className="text-xs text-text-muted leading-relaxed pt-2 border-t border-border/60">
                  Full unrestricted access to Level 01, interactive reading handbooks, quizzes, upcoming live/classroom cohort sessions, and downloadable curriculum brochure.
                </p>
              </div>

              {/* Price Breakdown */}
              <div className="py-4 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between text-text-muted">
                  <span>Tuition Base Price</span>
                  <span className="line-through">${COURSE_PRICE.original}.00</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Executive Fellowship Discount</span>
                  <span>-${COURSE_PRICE.original - COURSE_PRICE.current}.00</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Estimated Taxes / Platform Fees</span>
                  <span>$0.00</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between text-sm font-bold text-primary">
                  <span>Total Amount Due</span>
                  <span className="text-lg text-accent">${COURSE_PRICE.current}.00 USD</span>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-4 pt-4 border-t border-border space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>30-Day Simulated Satisfaction Guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Choose Online or Offline Mode immediately after</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Immediate access to Level 01 Sandbox</span>
                </div>
              </div>
            </div>

            {/* Need Assistance card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <HelpCircle className="w-4 h-4" />
                <span>Questions about corporate reimbursement?</span>
              </div>
              <a
                href="/assets/ai-product-wizardry-brochure.pdf"
                download="ai-product-wizardry-brochure.pdf"
                className="text-accent hover:underline font-semibold"
              >
                Brochure
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
