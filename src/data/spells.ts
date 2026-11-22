/**
 * Spell of the Day — one product-management term per day.
 * The first nine come from the approved reference design; the rest are the terms the
 * program team asked for. Keep definitions short, accurate and free of hype.
 */
export interface Spell { term: string; meaning: string }

export const SPELLS: readonly Spell[] = [
  { term: 'Solution bias', meaning: 'Treating a solution as the problem. "We need a chatbot" names an answer, not a need. Start with the person.' },
  { term: 'North Star Metric', meaning: 'The one number that best captures the value users get from your product. Every team’s work should move it.' },
  { term: 'Jobs-to-be-done', meaning: 'People "hire" products to make progress in a situation. Ask what job they need done, not what feature they want.' },
  { term: 'MVP', meaning: 'Minimum Viable Product: the smallest thing you can build to learn whether your riskiest assumption is true. Learning, not launching.' },
  { term: 'RICE', meaning: 'Reach × Impact × Confidence ÷ Effort. A way to compare priorities with numbers instead of volume.' },
  { term: 'Fake door test', meaning: 'Show a button for a feature that doesn’t exist yet and measure clicks. Cheap evidence of demand before you build.' },
  { term: 'Eval', meaning: 'A repeatable test of an AI system’s output quality. For AI product managers, evals work like the spec.' },
  { term: 'Retention cohort', meaning: 'Group users by when they joined and track how many come back over time. The truest test of "will they return?"' },
  { term: 'Human-in-the-loop', meaning: 'A design where a person reviews or corrects AI output before it reaches the user or takes effect.' },
  { term: 'Ideation', meaning: 'Generating many possible solutions to a well-understood problem before choosing which ones to test.' },
  { term: 'Retention', meaning: 'The share of users who keep coming back after their first use. High retention means the product keeps delivering value.' },
  { term: 'Churn', meaning: 'The share of users or customers who stop using or paying for a product in a given period. The opposite of retention.' },
  { term: 'Activation', meaning: 'The moment a new user first experiences the product’s core value — for example, sending a first message or finishing a first lesson.' },
  { term: 'Product-Market Fit', meaning: 'When a product satisfies a strong need in a market well enough that people keep using it, pay for it and recommend it.' },
  { term: 'Roadmap', meaning: 'A plan of the problems a team intends to solve and roughly when, tied to goals. It guides decisions; it is not a promise of dates.' },
  { term: 'Discovery', meaning: 'The work of learning what to build — talking to users, testing assumptions and prototypes — before committing to build it.' },
  { term: 'Iteration', meaning: 'Improving a product in small cycles: build, measure what happens, learn, and adjust the next version.' },
];

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 3_600_000;

/** Same spell for every student on the same calendar day (India time); changes at midnight IST. */
export function spellOfTheDay(now: Date = new Date()): Spell {
  const day = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS);
  return SPELLS[((day % SPELLS.length) + SPELLS.length) % SPELLS.length];
}
