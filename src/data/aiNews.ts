/*
 * ============================================================================
 *  TEMPORARY AI NEWS — placeholder stories, NOT real news.
 * ============================================================================
 *  Shown on the dashboard's "AI Product World" card in the local dev server and in
 *  builds with VITE_SHOW_DEMO_EVENTS=true (Preview). Production shows a neutral
 *  "coming soon" note instead. The stories are generic on purpose: no real company,
 *  outlet or date is named, so nothing can be mistaken for an actual report.
 *  Replace with a curated, sourced feed (title, source, date, link) before use.
 * ============================================================================
 */
export type AiNewsCategory = 'Models' | 'Products' | 'India' | 'Policy' | 'Careers';

export const AI_NEWS_CATEGORIES: AiNewsCategory[] = ['Models', 'Products', 'India', 'Policy', 'Careers'];

export interface AiNewsItem {
  id: number;
  category: AiNewsCategory;
  title: string;
  minutes: number;
}

export const AI_NEWS_PLACEHOLDERS: AiNewsItem[] = [
  { id: 1, category: 'Models', title: 'Smaller, faster models are winning on-device features', minutes: 3 },
  { id: 2, category: 'India', title: 'Indian startups build AI assistants for regional languages', minutes: 4 },
  { id: 3, category: 'Policy', title: 'New AI disclosure rules: what product teams must label', minutes: 3 },
  { id: 4, category: 'Products', title: 'Why the best AI products start with one narrow job', minutes: 2 },
  { id: 5, category: 'Careers', title: 'The AI product manager: skills teams are hiring for now', minutes: 4 },
  { id: 6, category: 'Products', title: 'Designing for the moment an AI feature gets it wrong', minutes: 3 },
  { id: 7, category: 'Models', title: 'Evals before prompts: how teams measure "good" answers', minutes: 3 },
  { id: 8, category: 'India', title: 'Campus builders ship AI tools for everyday college problems', minutes: 2 },
];
