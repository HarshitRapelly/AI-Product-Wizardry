import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../../lib/passwordRules';

// The rules live in a plain .ts module (unit-tested under Node); re-exported here for convenience.
export {
  PASSWORD_RULES,
  isStrongPassword,
  passwordIssues,
  passwordStrengthError,
  type PasswordRuleId,
} from '../../lib/passwordRules';

/**
 * Live "your password must have" checklist under a NEW-password field
 * (/register and /reset-password — never the login form). It stays out of sight
 * until the user starts typing, then slides open (and closes again if the field is
 * cleared); each rule turns green as soon as it is met. It is always rendered —
 * only hidden — so the `id` the input's aria-describedby points at always exists.
 */
export const PasswordChecklist: React.FC<{ password: string; id: string; className?: string }> = ({
  password,
  id,
  className = '',
}) => (
  <div className={`aiw-pwc${password ? ' is-open' : ''}`}>
    <div className="aiw-pwc-clip">
      <div className={className}>
        <p id={`${id}-title`} className="text-xs font-semibold text-secondary">
          Your password must have:
        </p>
        <ul id={id} aria-labelledby={`${id}-title`} aria-live="polite" className="mt-1.5 space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.id}
                aria-atomic="true"
                className={`flex items-start gap-2 text-xs leading-5 transition-colors ${met ? 'text-success-text' : 'text-text-muted'}`}
              >
                {met ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-light" aria-hidden="true" />
                )}
                <span>
                  {rule.label}
                  <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  </div>
);
