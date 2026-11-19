import React from 'react';

/**
 * Official brand artwork (public/brand/):
 *   wizardry-logo.png  full "AI PRODUCT Wizardry · Powered by NXT WAVE" lock-up, transparent
 *   wizard-hat.jpg     teal wizard hat on a light background
 *   sparkle-star.jpg   orange four-point sparkle
 */
export const BRAND = {
  logo: '/brand/wizardry-logo.png',
  hat: '/brand/wizard-hat.jpg',
  star: '/brand/sparkle-star.jpg',
  name: 'AI Product Wizardry',
} as const;

/**
 * Full logo lock-up. wizardry-logo.png is the official artwork with its black
 * field keyed out to true transparency (and trimmed to the artwork), so it sits
 * directly on any dark surface with no box around it.
 * Size it with a height (imgClassName, e.g. "h-14") or a width (e.g. "w-full").
 */
export const BrandLogo: React.FC<{ className?: string; imgClassName?: string; title?: string }> = ({
  className = '',
  imgClassName = 'h-12',
  title = 'AI Product Wizardry — Powered by NxtWave',
}) => (
  <img
    src={BRAND.logo}
    alt={title}
    draggable={false}
    className={`inline-block max-w-none object-contain select-none ${imgClassName.includes('w-') ? 'h-auto' : 'w-auto'} ${imgClassName} ${className}`}
    style={{ aspectRatio: '1253 / 553' }}
  />
);

/**
 * The wizard hat as a compact mark. The artwork has a light background, so it
 * sits on a light tile and is blended (multiply) so the tile colour shows through.
 */
export const BrandHat: React.FC<{ className?: string; tileClassName?: string; title?: string; animated?: boolean }> = ({
  className = 'w-10 h-10',
  tileClassName = 'bg-cream border border-border',
  title = 'AI Product Wizardry',
  animated = false,
}) => (
  <span className={`relative inline-flex items-center justify-center rounded-xl overflow-hidden ${tileClassName} ${className}`}>
    <img
      src={BRAND.hat}
      alt={title}
      className={`w-[118%] h-[118%] max-w-none object-contain mix-blend-multiply select-none ${animated ? 'animate-aiw-float' : ''}`}
      draggable={false}
    />
  </span>
);

/** Four-point sparkle (vector version of sparkle-star.jpg) for decoration. */
export const Sparkle: React.FC<{ className?: string; color?: string; style?: React.CSSProperties }> = ({ className = 'w-4 h-4', color = '#F7941D', style }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden="true" focusable="false">
    <path
      d="M50 0 C54 30 70 46 100 50 C70 54 54 70 50 100 C46 70 30 54 0 50 C30 46 46 30 50 0 Z"
      fill={color}
    />
  </svg>
);
