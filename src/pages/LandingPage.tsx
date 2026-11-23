import React from 'react';
import { Link } from 'react-router-dom';
import { ExploreLink, PublicSite } from '../components/site/SiteChrome';
import { Icon, Spark, iconMarkup, type IconName } from '../components/aiw/Icon';
import { CareersArt, HeroArt, MailArt, ProblemArt, ReturnArt, RocketArt, Starfield, WantArt, Wave } from '../components/aiw/Art';
import { PROGRAM, batchStartDate, batchStartLine } from '../config/program';
import { BrochureButton } from '../components/site/BrochureDialog';

/**
 * Public home page — a faithful build of the approved reference design. "Explore" links scroll to
 * the #explore section (the six-month journey); the former /explore page was removed.
 */

const QUESTIONS: { tone: 't' | 'o' | 'g'; Art: React.FC; title: string; text: string }[] = [
  { tone: 't', Art: ProblemArt, title: 'A real problem?', text: 'Start from a person, not a feature.' },
  { tone: 'o', Art: WantArt, title: 'Will people want it?', text: 'Listen, test, be surprised.' },
  { tone: 'g', Art: ReturnArt, title: 'Will they return?', text: 'Earn a spot on the home screen.' },
];

const JOURNEY: { icon: IconName; label: string; x: number; y: number }[] = [
  { icon: 'search', label: 'Spot a problem', x: 60, y: 150 },
  { icon: 'bulb', label: 'Shape the idea', x: 240, y: 62 },
  { icon: 'rocket', label: 'Build it', x: 420, y: 140 },
  { icon: 'users', label: 'Test with users', x: 600, y: 60 },
  { icon: 'mic', label: 'Pitch to the jury', x: 780, y: 132 },
  { icon: 'star', label: 'Earn your certificate', x: 950, y: 56 },
];

const WHY: { icon: IconName; title: string; text: string; color: string }[] = [
  { icon: 'target', title: 'Hands-on product sense', text: 'Build and test a real product with your team, from first problem to launch.', color: '#2F6F6A' },
  { icon: 'bulb', title: 'AI-first from day one', text: 'Every module has an AI lens: evals, failure states, responsible AI and pricing.', color: '#C98A1C' },
  { icon: 'mic', title: 'Stories from the makers', text: 'Hear product stories straight from the industry experts who built them.', color: '#2BA39C' },
  { icon: 'users', title: 'Jury-tested thinking', text: 'Defend your decisions in front of a jury every module, and get sharper each time.', color: '#D1531F' },
  { icon: 'msg', title: 'Collaborate with the product community', text: 'Build alongside peers, mentors and makers in a community that ships together.', color: '#E8703A' },
  { icon: 'star', title: 'A portfolio that speaks', text: 'Graduate with a PRD, a tested prototype, a capstone and your certificate.', color: '#245E5A' },
];

export const LandingPage: React.FC = () => (
  <PublicSite>
    {/* Hero */}
    <section className="hero hero-home" aria-labelledby="hero-title">
      <Starfield count={50} />
      <div className="hero-grid">
        <div>
          <span className="chip"><Spark size={12} color="#fff" /> For undergraduates · {PROGRAM.batchName} open</span>
          <h1 id="hero-title" style={{ marginTop: 20 }}>Where ideas become <em>products</em> people love.</h1>
          <p className="wings"><Spark size={16} color="#F2B33D" /> Where techies get their product wings.</p>
          <p className="lead">Six hands-on months of AI product thinking: for those heading into product management, and for builders who want to build better.</p>
          <div className="ctas">
            <Link to="/register" className="btn btn-primary"><Icon name="wand" size={18} /> Register now</Link>
            <ExploreLink className="btn btn-ghost">Explore <Icon name="right" size={16} /></ExploreLink>
          </div>
          <div className="hstats">
            <span><b>{PROGRAM.months}</b> months</span>
            <span><b>{PROGRAM.modules}</b> modules</span>
            <span><b>{PROGRAM.hoursPerWeek}</b> hrs a week</span>
          </div>
        </div>
        <HeroArt />
      </div>
      <Wave />
    </section>

    {/* Three questions */}
    <section className="sec" style={{ paddingTop: 50 }} aria-labelledby="q-title">
      <p id="q-title" className="eyebrow reveal" style={{ textAlign: 'center' }}>Three questions every product wizard asks</p>
      <div className="grid3" style={{ marginTop: 22 }}>
        {QUESTIONS.map(({ tone, Art, title, text }, k) => (
          <div key={title} className={`card ${tone} lift reveal qcard`} style={{ transitionDelay: `${k * 0.12}s` }}>
            <Art />
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Journey */}
    <div className="band">
      <section className="sec" id="explore" aria-labelledby="journey-title" style={{ scrollMarginTop: 80 }}>
        <p className="eyebrow gold reveal" style={{ textAlign: 'center' }}>Your six-month journey</p>
        <h2 id="journey-title" className="reveal" style={{ textAlign: 'center' }}>From spark to launch.</h2>
        <svg className="jpath reveal" viewBox="0 0 1010 230" aria-hidden="true" focusable="false">
          <path
            className="jline"
            d="M60 150 C 150 150, 160 62, 240 62 S 340 140, 420 140 S 520 60, 600 60 S 700 132, 780 132 S 880 56, 950 56"
            fill="none" stroke="#F2B33D" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 12"
          />
          {JOURNEY.map(({ icon, label, x, y }, k) => {
            const last = k === JOURNEY.length - 1;
            return (
              <g key={label} className="jnode" style={{ animationDelay: `${0.3 + k * 0.18}s` }}>
                <circle cx={x} cy={y} r="32" fill={last ? '#D1531F' : '#1A4D49'} stroke={last ? '#F2B33D' : '#2BA39C'} strokeWidth="3" />
                <svg
                  x={x - 14} y={y - 14} width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke={last ? '#fff' : '#F2B33D'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: iconMarkup(icon) }}
                />
                <text x={x} y={y + (y > 100 ? 58 : -46)} textAnchor="middle" fill="#FAF7F2" fontSize="17" fontWeight="600" fontFamily="Inter,Arial">{label}</text>
              </g>
            );
          })}
        </svg>
        <ol className="jsteps jmobile" aria-label="Your six-month journey">
          {JOURNEY.map(({ icon, label }) => (
            <li key={label} className="jstep" style={{ listStyle: 'none' }}>
              <div className="dot"><Icon name={icon} size={22} /></div>
              <b>{label}</b>
            </li>
          ))}
        </ol>
      </section>
    </div>

    {/* Why choose */}
    <section className="sec" aria-labelledby="why-title">
      <p className="eyebrow reveal" style={{ textAlign: 'center' }}>Why choose this program</p>
      <h2 id="why-title" className="reveal" style={{ textAlign: 'center', marginBottom: 30 }}>Built for students who want to make things</h2>
      <div className="why">
        {WHY.map((w, k) => (
          <div key={w.title} className="wcard reveal" style={{ transitionDelay: `${k * 0.1}s` }}>
            <div className="wbadge" style={{ ['--c' as string]: w.color } as React.CSSProperties}>
              <Icon name={w.icon} size={30} />
              <span className="wsp"><Spark size={14} color="#F2B33D" /></span>
            </div>
            <span className="wnum" aria-hidden="true">0{k + 1}</span>
            <h3>{w.title}</h3>
            <p>{w.text}</p>
          </div>
        ))}
      </div>

      {/* Certificate */}
      <div className="certband reveal">
        <div className="cert-copy">
          <p className="eyebrow">On successful completion</p>
          <h2>Earn your AI Product Management Certificate</h2>
          <p>Complete the program and you graduate with a certificate from AI Product Wizardry, powered by Nxtwave, and a portfolio of real product work to show for it.</p>
          <p className="cdoors-cap" style={{ justifyContent: 'flex-start', marginTop: 14 }}><Spark size={12} color="#C98A1C" /> One certificate, many doors</p>
        </div>
        <div className="cert-art"><CareersArt /></div>
      </div>

      {/* Get in touch */}
      <div className="contactband reveal" id="contact">
        <MailArt />
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="eyebrow">Get in touch</p>
          <h2>Have a question before you join?</h2>
          <p>Ask us anything about the program, fees, schedule or eligibility. The program team will get back to you.</p>
        </div>
        <Link className="btn btn-dark" to="/contact"><Icon name="msg" size={18} /> Send us your query</Link>
      </div>

      {/* Final CTA */}
      <div className="ctaband reveal">
        <RocketArt />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3>Ready to become a product wizard?</h3>
          {/* No confirmed date: "Batch 1 · start date to be announced · in person" (no date is invented) */}
          <p>{batchStartLine()} · in person{batchStartDate() ? '.' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary">Register</Link>
          {/* Download starts after name, email and contact number are saved (brochure_download_user_details). */}
          <BrochureButton />
        </div>
      </div>
    </section>
  </PublicSite>
);

export default LandingPage;
