import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicSite } from '../components/site/SiteChrome';
import { Icon, Spark } from '../components/aiw/Icon';
import { CareersArt, MailArt, Starfield, Wave } from '../components/aiw/Art';
import { MODULE_TITLES, PROGRAM } from '../config/program';

/**
 * /explore — the program in detail. Layout from the approved reference design; the fee,
 * grading rules, curriculum, FAQs and admissions contact were moved here from the former
 * home page (content unchanged apart from Level → Module wording and the offline-only note).
 */

const BROCHURE = '/assets/ai-product-wizardry-brochure.pdf';

export const PROGRAM_FAQS: { q: string; a: string }[] = [
  {
    q: 'Who is AI Product Wizardry designed for?',
    a: 'It is built specifically for undergraduate students and aspiring makers who love to build things. It teaches the half of tech that most classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a sketch to a launch.',
  },
  {
    q: 'How is the program structured across the 6 months?',
    a: 'The program spans 6 months across 12 modules, Module 0 to Module 11 (2 modules a month). Module 0 sets expectations. Every module after it ends with a written assignment, followed by a live jury presentation where you defend your thinking.',
  },
  {
    q: 'Can I learn online?',
    a: 'Online learning is currently unavailable to everyone, including students who registered for Online earlier. All 12 modules (Module 0–Module 11) and assignments are delivered offline: in-person classroom labs, physical whiteboarding sessions and hallway usability testing at the Innovation Campus. Every student registers and learns in the offline mode.',
  },
  {
    q: 'What are the certificate requirements?',
    a: 'You earn your certificate by scoring above 70% across assignments (50%) and the live capstone jury defense (30%), alongside content and quiz checks (20%). Offline batches also require 80% attendance and 80% MCQ completion.',
  },
  {
    q: 'What is the tuition fee?',
    a: `The program fee is ${PROGRAM.regularFee} from Batch 2 onwards. It is 100% free for this batch under the Fellowship initiative.`,
  },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const id = useId();
  return (
    <div className={`acc reveal${open ? ' open' : ''}`}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="mt">{q}</span>
        <span className="chev"><Icon name="chev" /></span>
      </button>
      <div id={id} className="body" ref={body} role="region" style={{ maxHeight: open ? body.current?.scrollHeight ?? 400 : 0 }}>
        <div>{a}</div>
      </div>
    </div>
  );
};

export const ExplorePage: React.FC = () => (
  <PublicSite>
    <section className="hero" style={{ padding: '70px 5vw 120px' }} aria-labelledby="explore-title">
      <Starfield count={40} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <p className="eyebrow gold">Explore the program</p>
        <h1 id="explore-title" style={{ fontSize: 'clamp(34px,4.5vw,58px)', marginTop: 12, maxWidth: 820 }}>Twelve modules. One idea, taken from first spark to launch.</h1>
        <p className="lead">Two modules a month for six months. Module 0 sets expectations; every module after it ends with an assignment: a written document, then a jury presentation.</p>
        <div className="ctas">
          <a className="btn btn-primary" href={BROCHURE} download="AI_Product_Wizardry_Brochure.pdf"><Icon name="down" size={18} /> Download brochure</a>
          <Link className="btn btn-ghost" to="/register">Register now</Link>
        </div>
      </div>
      <Wave />
    </section>

    <section className="sec" style={{ paddingTop: 40 }}>
      <div className="card t reveal" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: 26 }}>
        <div className="fico"><Icon name="book" size={26} /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ margin: 0, fontSize: 22 }}>Want to know more about the program?</h3>
          <p className="muted" style={{ marginTop: 4 }}>Download the brochure.</p>
        </div>
        <a className="btn btn-primary" href={BROCHURE} download="AI_Product_Wizardry_Brochure.pdf"><Icon name="down" size={18} /> Get the brochure</a>
      </div>
    </section>

    {/* Curriculum */}
    <section className="sec" style={{ paddingTop: 20 }} id="curriculum" aria-labelledby="curr-title">
      <p className="eyebrow reveal">The curriculum</p>
      <h2 id="curr-title" className="reveal">Twelve modules. One idea, taken from first spark to launch.</h2>
      <div className="currgrid">
        {MODULE_TITLES.map((t, n) => (
          <div key={t} className="cm reveal" style={{ transitionDelay: `${(n % 3) * 0.08}s` }}>
            <span className="cn" aria-hidden="true">{n}</span>
            <div><small>Module {n}</small><b>{t}</b></div>
          </div>
        ))}
      </div>
      <p className="muted reveal" style={{ marginTop: 18, textAlign: 'center' }}>Eleven modules of real work, one growing portfolio.</p>
    </section>

    {/* Doors + certificate */}
    <div className="band">
      <section className="sec">
        <div className="grid2" style={{ gap: 28 }}>
          <div>
            <p className="eyebrow gold">Doors a product mindset can open</p>
            <h2>Where this can take you</h2>
            <div className="doors" style={{ marginTop: 30 }}>
              {['Product manager', 'Product engineer', 'Founder', 'Product analyst', 'Forward-deployed engineer'].map((x) => (
                <div key={x} className="door"><div className="arch" /><b>{x}</b></div>
              ))}
            </div>
          </div>
          <div className="card" style={{ background: 'var(--cream)' }}>
            <p className="eyebrow">Your certificate</p>
            <CareersArt />
            <p className="cdoors-cap"><Spark size={12} color="#C98A1C" /> One certificate, many doors</p>
          </div>
        </div>
      </section>
    </div>

    {/* Certificate rules, fee, commitment */}
    <section className="sec" aria-labelledby="earn-title">
      <div className="grid2">
        <div className="card t reveal">
          <p className="eyebrow">Grading</p>
          <h3 id="earn-title" style={{ fontSize: 24 }}>How you earn the certificate</h3>
          <div className="weights" role="img" aria-label="Assignments 50 percent, capstone 30 percent, content 20 percent">
            <span style={{ width: '50%', background: 'var(--oTint)' }}>50%</span>
            <span style={{ width: '30%', background: 'var(--gTint)' }}>30%</span>
            <span style={{ width: '20%', background: '#fff' }}>20%</span>
          </div>
          <div className="wlabels"><span style={{ width: '50%' }}>Assignments</span><span style={{ width: '30%', textAlign: 'center' }}>Capstone</span><span style={{ width: '20%', textAlign: 'right' }}>Content</span></div>
          <p style={{ marginTop: 14, fontSize: 14.5 }}>Score above 70% in assignments and the capstone. Offline batches also need 80% attendance and 80% of the MCQs.</p>
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card g reveal">
            <p className="eyebrow">The fee</p>
            <p style={{ fontSize: 18, marginTop: 6 }}><span className="fee-old">{PROGRAM.regularFee}</span> from Batch 2 onwards.</p>
            <span className="tag due" style={{ marginTop: 10, fontSize: 13 }}>Free for this batch.</span>
          </div>
          <div className="card o reveal">
            <p className="eyebrow">What we ask of you</p>
            <p className="serif" style={{ fontSize: 26, marginTop: 6 }}>Show up. Light up. Keep going.</p>
            <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>Commitment · Enthusiasm · Consistency</p>
          </div>
        </div>
      </div>
    </section>

    {/* FAQs */}
    <section className="sec faq" style={{ paddingTop: 30 }} id="faqs" aria-labelledby="faq-title">
      <p className="eyebrow">FAQs</p>
      <h2 id="faq-title">Questions, answered</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        {PROGRAM_FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
      </div>

      {/* Admissions contact */}
      <div className="contactband reveal" id="admissions">
        <MailArt />
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="eyebrow">Admissions</p>
          <h2>Talk to the admissions team</h2>
          <p>Questions about eligibility, fees or {PROGRAM.batchName}? Send them through the contact form and the program team will reply.</p>
        </div>
        <Link className="btn btn-dark" to="/contact"><Icon name="msg" size={18} /> Contact admissions</Link>
      </div>
      <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a className="btn btn-dark" href={BROCHURE} download="AI_Product_Wizardry_Brochure.pdf"><Icon name="down" size={18} /> Get the brochure</a>
        <Link className="btn btn-primary" to="/register">Register</Link>
      </div>
    </section>
  </PublicSite>
);

export default ExplorePage;
