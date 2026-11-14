import { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from '../services/authService';
import { isValidEmail } from '../lib/registrationValidation';

const COOLDOWN_SECONDS = 60;

/**
 * Shared "email me a password reset link" logic for the Login modal and the
 * /reset-password page: validation, sending state, 60-second cooldown, errors,
 * and the neutral confirmation (we never reveal whether an account exists).
 */
export function usePasswordResetRequest() {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (email: string) => {
    if (sending || cooldown > 0) return;
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setSending(true);
    const result = await sendPasswordResetEmail(email);
    setSending(false);
    if (result.ok) {
      setSentTo(result.email);
      setCooldown(COOLDOWN_SECONDS);
    } else {
      setError(result.message);
    }
  };

  const reset = () => {
    setError(null);
    setSentTo(null);
  };

  return { send, sending, cooldown, error, sentTo, reset };
}
