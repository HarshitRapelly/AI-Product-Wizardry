import React, { useMemo } from 'react';

/*
 * Decorative illustrations of the redesigned site, hand-converted from the approved
 * reference design. All are aria-hidden (purely decorative) except CareersArt, which
 * carries a text alternative. Animations live in src/styles/wizardry.css and are
 * switched off for users who prefer reduced motion.
 */

const sp4d = (x: number, y: number, r: number) => {
  const k = r * 0.15;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
};

/** Four-point star inside an SVG. `twinkle` adds the twinkle animation. */
const Sp4: React.FC<{ x: number; y: number; r: number; c?: string; twinkle?: boolean; delay?: string }> = ({ x, y, r, c = '#F2B33D', twinkle = true, delay }) => (
  <path className={twinkle ? 'tw' : undefined} fill={c} d={sp4d(x, y, r)} style={delay ? { animationDelay: delay } : undefined} />
);

/** Twinkling star dots for dark hero areas. Positions are fixed per mount. */
export const Starfield: React.FC<{ count?: number }> = ({ count = 50 }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        d: 2.5 + Math.random() * 4,
        dl: Math.random() * 5,
      })),
    [count],
  );
  return (
    <div className="stars" aria-hidden="true">
      {stars.map((s, i) => (
        <i
          key={i}
          className="star"
          style={{ left: `${s.left}%`, top: `${s.top}%`, ['--d' as string]: `${s.d}s`, ['--dl' as string]: `${s.dl}s` } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

/** Wavy edge between a dark band and the cream section below it. */
export const Wave: React.FC<{ color?: string }> = ({ color = '#FAF7F2' }) => (
  <div className="wave" aria-hidden="true">
    <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: '100%', height: 90 }}>
      <path fill={color} d="M0 50 C 240 100 480 0 720 40 C 960 80 1200 10 1440 50 L1440 90 L0 90Z" />
    </svg>
  </div>
);

const TILE = (c: number, r: number) => (c === 0 && r === 0 ? '#D1531F' : c === 1 && r === 1 ? '#2F6F6A' : c === 2 && r === 2 ? '#C98A1C' : '#E3DDD0');

/** Hero illustration: phone with app tiles, wizard hat, wand, chat bubbles, idea bulb, moon. */
export const HeroArt: React.FC = () => (
  <svg className="hero-art" viewBox="0 0 520 520" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="hgl" cx="50%" cy="48%" r="50%">
        <stop offset="0" stopColor="#2BA39C" stopOpacity=".45" />
        <stop offset="1" stopColor="#2BA39C" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hatg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#34B3AB" />
        <stop offset="1" stopColor="#17716C" />
      </linearGradient>
    </defs>
    <circle cx="260" cy="260" r="240" fill="url(#hgl)" />
    <g className="orbit">
      <ellipse cx="260" cy="285" rx="230" ry="78" fill="none" stroke="#F2B33D" strokeOpacity=".4" strokeWidth="2" strokeDasharray="3 12" />
      <circle cx="490" cy="285" r="6" fill="#F2B33D" />
    </g>
    <circle cx="430" cy="92" r="30" fill="#F5E9CF" opacity=".95" />
    <g className="fl1">
      <rect x="172" y="118" width="176" height="330" rx="34" fill="#1C1A17" />
      <rect x="183" y="131" width="154" height="304" rx="25" fill="#FAF7F2" />
      <rect x="236" y="140" width="48" height="8" rx="4" fill="#1C1A17" />
      {[0, 1, 2].map((c) => [0, 1, 2, 3].map((r) => <rect key={`${c}${r}`} x={199 + c * 44} y={168 + r * 44} width="34" height="34" rx="10" fill={TILE(c, r)} />))}
      <path d="M216 178c-4-5-11-2-11 3 0 5 11 11 11 11s11-6 11-11c0-5-7-8-11-3z" fill="#fff" />
      <path d="M252 229l5 5 9-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M294 268v-8M300 268v-13M306 268v-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="199" y="352" width="122" height="16" rx="8" fill="#C98A1C" />
      <circle cx="260" cy="400" r="12" fill="none" stroke="#2F6F6A" strokeWidth="3" />
    </g>
    <g className="fl2">
      <g transform="translate(282 44) rotate(16)">
        <path d="M10 95C30 70 38 30 58 8C66 0 80 4 84 12C74 14 70 22 72 34C76 60 86 80 98 95Z" fill="url(#hatg)" />
        <ellipse cx="54" cy="97" rx="64" ry="15" fill="#17716C" />
        <path d="M14 86C40 94 70 94 94 86L97 97C70 105 40 105 11 97Z" fill="#F2B33D" />
        <Sp4 x={48} y={52} r={7} twinkle={false} />
        <Sp4 x={66} y={32} r={4} twinkle={false} />
        <Sp4 x={40} y={72} r={4} twinkle={false} />
      </g>
    </g>
    <g className="fl3">
      <rect x="52" y="196" width="104" height="66" rx="18" fill="#FAF7F2" />
      <path d="M78 262l-6 16 20-16z" fill="#FAF7F2" />
      <path d="M104 214c-6-7-17-3-17 5 0 9 17 18 17 18s17-9 17-18c0-8-11-12-17-5z" fill="#D1531F" />
    </g>
    <g className="fl4">
      <rect x="364" y="300" width="112" height="70" rx="18" fill="#2F6F6A" />
      <path d="M450 370l8 16-22-16z" fill="#2F6F6A" />
      <rect x="382" y="320" width="74" height="8" rx="4" fill="#FAF7F2" />
      <rect x="382" y="338" width="52" height="8" rx="4" fill="#FAF7F2" opacity=".6" />
    </g>
    <g className="fl5">
      <circle cx="104" cy="390" r="36" fill="#C98A1C" />
      <path d="M98 404h12M100 410h8M104 372a13 13 0 0 0-8 23v4h16v-4a13 13 0 0 0-8-23z" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </g>
    <g className="fl3">
      <path d="M400 168l-62 52" stroke="#E3DDD0" strokeWidth="7" strokeLinecap="round" />
      <path d="M400 168l-14 12" stroke="#1C1A17" strokeWidth="7" strokeLinecap="round" />
      <Sp4 x={410} y={158} r={13} twinkle={false} />
      <circle cx="360" cy="190" r="3" fill="#F2B33D" className="tw" />
      <circle cx="378" cy="214" r="2.5" fill="#F2B33D" className="tw" style={{ animationDelay: '.6s' }} />
    </g>
    <Sp4 x={60} y={110} r={10} />
    <Sp4 x={470} y={220} r={8} c="#FAF7F2" />
    <Sp4 x={150} y={470} r={9} />
    <Sp4 x={380} y={470} r={7} c="#FAF7F2" />
    <Sp4 x={30} y={300} r={6} />
  </svg>
);

export const ProblemArt: React.FC = () => (
  <svg className="qart" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
    <circle cx="62" cy="42" r="15" fill="#2F6F6A" />
    <path d="M36 96Q62 52 88 96Z" fill="#2F6F6A" />
    <path d="M48 16l5-6 5 6 5-6 5 6" fill="none" stroke="#D1531F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <g className="wig">
      <circle cx="104" cy="56" r="22" fill="#fff" fillOpacity=".5" stroke="#1C1A17" strokeWidth="6" />
      <path d="M120 72l20 20" stroke="#C98A1C" strokeWidth="9" strokeLinecap="round" />
    </g>
    <Sp4 x={140} y={24} r={7} />
  </svg>
);

export const WantArt: React.FC = () => (
  <svg className="qart" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
    <rect x="16" y="14" width="78" height="50" rx="14" fill="#fff" stroke="#E3C2B2" strokeWidth="2" />
    <path d="M34 64l-4 14 16-14z" fill="#fff" />
    <path className="beat" d="M55 30c-5-6-14-3-14 4 0 7 14 15 14 15s14-8 14-15c0-7-9-10-14-4z" fill="#D1531F" />
    <rect x="74" y="52" width="70" height="44" rx="13" fill="#2F6F6A" />
    <path d="M128 96l6 12-16-12z" fill="#2F6F6A" />
    <circle className="dt" cx="94" cy="74" r="4.5" fill="#FAF7F2" />
    <circle className="dt" cx="109" cy="74" r="4.5" fill="#FAF7F2" style={{ animationDelay: '.2s' }} />
    <circle className="dt" cx="124" cy="74" r="4.5" fill="#FAF7F2" style={{ animationDelay: '.4s' }} />
  </svg>
);

export const ReturnArt: React.FC = () => (
  <svg className="qart" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
    <g className="spin">
      <path d="M30 55a50 50 0 0 1 86-35" fill="none" stroke="#C98A1C" strokeWidth="4" strokeLinecap="round" />
      <path d="M116 8v13h-13" fill="none" stroke="#C98A1C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M130 55a50 50 0 0 1-86 35" fill="none" stroke="#C98A1C" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 102V89h13" fill="none" stroke="#C98A1C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <rect x="52" y="10" width="56" height="90" rx="12" fill="#1C1A17" />
    <rect x="57" y="17" width="46" height="76" rx="8" fill="#FAF7F2" />
    {[0, 1].map((c) => [0, 1, 2].map((r) => <rect key={`${c}${r}`} x={62 + c * 20} y={24 + r * 22} width="16" height="16" rx="5" fill={c === 1 && r === 1 ? '#D1531F' : '#E3DDD0'} />))}
    <Sp4 x={90} y={54} r={5} c="#fff" twinkle={false} />
  </svg>
);

export const MailArt: React.FC<{ small?: boolean }> = ({ small }) => (
  <svg className={small ? 'mart sm' : 'mart'} viewBox="0 0 140 120" aria-hidden="true" focusable="false">
    <g className="lift2">
      <rect x="14" y="30" width="96" height="66" rx="10" fill="#FAF7F2" stroke="#2F6F6A" strokeWidth="3" />
      <path d="M16 34l46 34 46-34" fill="none" stroke="#2F6F6A" strokeWidth="3" strokeLinejoin="round" />
      <rect x="72" y="6" width="58" height="38" rx="12" fill="#D1531F" />
      <path d="M84 44l-4 12 14-12z" fill="#D1531F" />
      <circle cx="88" cy="25" r="3.5" fill="#fff" />
      <circle cx="101" cy="25" r="3.5" fill="#fff" />
      <circle cx="114" cy="25" r="3.5" fill="#fff" />
    </g>
    <path className="tw" fill="#F2B33D" d="M20 8c.8 4 3 6 7 7-4 .8-6.2 3-7 7-.8-4-3-6.2-7-7 4-.8 6.2-3 7-7z" />
    <path className="tw" style={{ animationDelay: '.7s' }} fill="#2BA39C" d="M126 96c.6 3 2.4 4.8 5.4 5.4-3 .6-4.8 2.4-5.4 5.4-.6-3-2.4-4.8-5.4-5.4 3-.6 4.8-2.4 5.4-5.4z" />
  </svg>
);

const CAREERS: [string, string][] = [
  ['Product manager', '#2F6F6A'],
  ['Product engineer', '#C98A1C'],
  ['Founder', '#245E5A'],
  ['Product analyst', '#2BA39C'],
  ['Forward-deployed engineer', '#D1531F'],
];

/** Certificate branching into five career paths. */
export const CareersArt: React.FC = () => (
  <svg
    className="cdoors"
    viewBox="0 0 460 232"
    role="img"
    aria-label="The certificate opens doors to five career paths: product manager, product engineer, founder, product analyst and forward-deployed engineer"
  >
    {CAREERS.map(([, color], i) => {
      const y = 28 + i * 44;
      return <path key={i} className="cflow" style={{ animationDelay: `${i * 0.15}s` }} d={`M150 116 C 205 116, 205 ${y}, 244 ${y}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 6" />;
    })}
    <g className="ccert">
      <rect x="8" y="66" width="128" height="96" rx="9" fill="#fff" stroke="#C98A1C" strokeWidth="2.5" />
      <rect x="16" y="74" width="112" height="80" rx="5" fill="none" stroke="#E3DDD0" strokeDasharray="3 4" />
      <text x="72" y="94" textAnchor="middle" fontFamily="Inter,Arial" fontSize="6.5" fontWeight="700" letterSpacing="1.4" fill="#D1531F">CERTIFICATE</text>
      <text x="72" y="110" textAnchor="middle" fontFamily="Source Serif 4,Georgia,serif" fontSize="11" fontWeight="700" fill="#1C1A17">AI Product</text>
      <text x="72" y="123" textAnchor="middle" fontFamily="Source Serif 4,Georgia,serif" fontSize="11" fontWeight="700" fill="#1C1A17">Management</text>
      <rect x="40" y="132" width="44" height="4" rx="2" fill="#2F6F6A" opacity=".5" />
      <circle cx="136" cy="150" r="17" fill="#D1531F" />
      <path d="M128 163l-4 14 7-4 4 6 2-15zM144 163l4 14-7-4-4 6-2-15z" fill="#C98A1C" />
      <path d="M136 141c.8 4.3 3.7 7.2 8 8-4.3.8-7.2 3.7-8 8-.8-4.3-3.7-7.2-8-8 4.3-.8 7.2-3.7 8-8z" fill="#FAF7F2" />
    </g>
    {CAREERS.map(([label, color], i) => {
      const y = 13 + i * 44;
      return (
        <g key={label} className="cpill" style={{ animationDelay: `${0.4 + i * 0.15}s` }}>
          <rect x="244" y={y} width="214" height="30" rx="15" fill={color} />
          <circle cx="260" cy={y + 15} r="6" fill="#FAF7F2" opacity=".9" />
          <text x="273" y={y + 19.5} fontFamily="Inter,Arial" fontSize="12" fontWeight="600" fill="#fff">{label}</text>
        </g>
      );
    })}
    <path className="tw" fill="#F2B33D" d="M226 10c.8 4 3 6 7 7-4 .8-6.2 3-7 7-.8-4-3-6.2-7-7 4-.8 6.2-3 7-7z" />
    <path className="tw" style={{ animationDelay: '.9s' }} fill="#2BA39C" d="M222 214c.6 3 2.4 4.8 5.4 5.4-3 .6-4.8 2.4-5.4 5.4-.6-3-2.4-4.8-5.4-5.4 3-.6 4.8-2.4 5.4-5.4z" />
  </svg>
);

export const RocketArt: React.FC = () => (
  <svg className="rart" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <g className="lift2">
      <path d="M60 12c18 14 24 36 18 62H42c-6-26 0-48 18-62z" fill="#FAF7F2" />
      <circle cx="60" cy="46" r="10" fill="#2F6F6A" stroke="#1C1A17" strokeWidth="3" />
      <path d="M42 74l-12 16 16-4zM78 74l12 16-16-4z" fill="#D1531F" />
      <path className="flame" d="M50 78c0 14 10 24 10 24s10-10 10-24z" fill="#F2B33D" />
    </g>
    <Sp4 x={18} y={30} r={7} />
    <Sp4 x={102} y={48} r={6} c="#FAF7F2" />
    <Sp4 x={96} y={100} r={5} />
  </svg>
);

/** Small wizard hat used on the portal welcome banner (inline SVG, no image request). */
export const HatArt: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hatg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#34B3AB" />
        <stop offset="1" stopColor="#17716C" />
      </linearGradient>
    </defs>
    <path d="M12 88C32 63 40 23 60 3C68-5 82-1 86 7C76 9 72 17 74 29C78 55 88 75 100 88Z" fill="url(#hatg2)" />
    <ellipse cx="56" cy="90" rx="54" ry="10" fill="#17716C" />
    <path d="M16 80C42 88 72 88 96 80L99 90C72 98 42 98 13 90Z" fill="#F2B33D" />
    <Sp4 x={50} y={46} r={7} twinkle={false} />
    <Sp4 x={68} y={26} r={4} twinkle={false} />
    <Sp4 x={42} y={66} r={4} twinkle={false} />
  </svg>
);
