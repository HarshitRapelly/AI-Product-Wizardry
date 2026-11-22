import React, { useState } from 'react';
import { spellOfTheDay } from '../../data/spells';
import { Spark } from '../aiw/Icon';

/** Flip card: the word on the front, its meaning on the back. Click / Enter / Space flips it. */
export const SpellOfTheDay: React.FC = () => {
  const spell = spellOfTheDay();
  const [flipped, setFlipped] = useState(false);
  return (
    <section className="panel spellp" aria-labelledby="spell-title">
      <div className="phead">
        <h2 id="spell-title">Spell of the day</h2>
        <span className="tag lesson">Tap to flip</span>
      </div>
      <button
        type="button"
        className={`spell${flipped ? ' flip' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? `${spell.term}: ${spell.meaning}. Activate to show the word again.` : `${spell.term}. Activate to see what it means.`}
        style={{ width: '100%', textAlign: 'inherit', padding: 0 }}
      >
        <span className="in" style={{ display: 'block' }}>
          <span className="f" aria-hidden={flipped}>
            <span style={{ display: 'flex', justifyContent: 'center' }}><Spark size={26} color="#F2B33D" /></span>
            <span className="spell-term">{spell.term}</span>
            <small style={{ opacity: 0.7 }}>What does it mean?</small>
          </span>
          <span className="b" aria-hidden={!flipped}>
            <b style={{ color: 'var(--t500)', marginBottom: 6 }}>{spell.term}</b>
            {spell.meaning}
          </span>
        </span>
      </button>
    </section>
  );
};
