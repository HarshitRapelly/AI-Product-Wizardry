import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthAndCourse } from '../context/AuthAndCourseContext';
import { Sparkles, Eye, EyeOff, ArrowRight, Lock, Mail, CheckCircle2, X } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogleDemo, isPaid, learningMode } = useAuthAndCourse();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const redirectAfterAuth = () => {
    // If from state exists, or check payment status
    if (!isPaid) {
      navigate('/checkout');
    } else if (!learningMode) {
      navigate('/choose-learning-mode');
    } else {
      navigate(learningMode === 'online' ? '/online/dashboard' : '/offline/dashboard');
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      login(email);
      setIsSubmitting(false);
      redirectAfterAuth();
    }, 400);
  };

  const handleGoogleAuth = () => {
    loginWithGoogleDemo();
    redirectAfterAuth();
  };

  const handleDemoFill = () => {
    setEmail('alex.mercer@executive-ai.com');
    setPassword('wizardry2026');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-accent/15 selection:text-accent font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 group mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-subtle group-hover:bg-accent transition-colors">
            <Sparkles className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors" />
          </div>
          <div className="text-left">
            <span className="font-bold text-xl text-primary tracking-tight block">AI Product Wizardry</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">Student & Fellow Portal</span>
          </div>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-extrabold text-primary">
          Log In to Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-text-muted">
          New to the Academy?{' '}
          <Link to="/register" className="font-semibold text-accent hover:text-accent-hover transition-colors">
            Enroll & create profile
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 sm:px-10 rounded-2xl border border-border shadow-card">
          
          {/* Simulated Google Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-xl shadow-subtle bg-surface hover:bg-slate-50 text-sm font-semibold text-secondary transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google (Simulated)</span>
            </button>
            <p className="mt-1.5 text-center text-[11px] text-text-muted">
              Simulated Google OAuth authentication flow
            </p>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-text-muted font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com"
                  className={`block w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                    errors.email ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordModalOpen(true);
                    setResetEmailSent(false);
                  }}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`block w-full pl-9 pr-10 py-2 text-sm rounded-lg border ${
                    errors.password ? 'border-rose-400 focus:ring-rose-400' : 'border-border focus:ring-accent focus:border-accent'
                  } bg-background focus:outline-none focus:ring-1`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-secondary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-subtle bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Verifying...' : 'Log In to Academy'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Demo helper */}
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Reviewing prototype?</span>
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-accent hover:underline font-semibold"
            >
              Fill Demo Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Interactive Modal */}
      {forgotPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-elevated max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-primary">Reset Password</h3>
              <button
                onClick={() => setForgotPasswordModalOpen(false)}
                className="p-1 text-text-muted hover:text-primary rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetEmailSent ? (
              <div className="py-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-primary">Reset Link Generated</h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  In this prototype, password recovery is simulated. You may log in immediately using the credentials <span className="font-semibold text-text">alex.mercer@executive-ai.com</span> or your registered email.
                </p>
                <button
                  onClick={() => setForgotPasswordModalOpen(false)}
                  className="w-full mt-2 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  Enter your registered corporate or personal email. A simulated reset token will be issued.
                </p>
                <input
                  type="email"
                  defaultValue={email || 'alex.mercer@executive-ai.com'}
                  placeholder="name@enterprise.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                />
                <button
                  type="button"
                  onClick={() => setResetEmailSent(true)}
                  className="w-full py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                >
                  Send Simulated Reset Instructions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
