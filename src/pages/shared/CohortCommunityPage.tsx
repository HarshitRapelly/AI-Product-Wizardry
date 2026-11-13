import React, { useState } from 'react';
import { PortalLayout } from '../../layouts/PortalLayout';
import { useAuthAndCourse } from '../../context/AuthAndCourseContext';
import { 
  Users, 
  Send, 
  ArrowUp, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  Sparkles, 
  Tag, 
  CheckCircle2,
  ThumbsUp,
  Globe,
  MapPin
} from 'lucide-react';

interface CohortCommunityPageProps {
  mode: 'online' | 'offline';
}

interface PeerPost {
  id: string;
  authorName: string;
  username: string;
  avatar: string;
  campusOrCity: string;
  roleTag: string;
  title: string;
  content: string;
  tags: string[];
  upvotes: number;
  commentsCount: number;
  postedAt: string;
  isUpvoted?: boolean;
}

const INITIAL_PEER_POSTS: PeerPost[] = [
  {
    id: 'post-1',
    authorName: 'Aarav Mehta',
    username: 'u/aarav_m',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    campusOrCity: 'IIT Kharagpur · 3rd Year CS',
    roleTag: 'Engineering & Systems',
    title: 'Obsessed with Notion mobile vs desktop latency — Looking for a design-minded co-founder for Module 1',
    content: "Hey cohort! I spend way too much time reverse-engineering why daily-driver productivity apps lose users on mobile. In Module 1, I want to explore why students drop off note-taking apps after the 2nd week of classes. If anyone is passionate about user retention loops, let's team up!",
    tags: ['#LookingForTeammate', '#UserRetention', '#ProductDiscovery'],
    upvotes: 42,
    commentsCount: 9,
    postedAt: '2 hours ago'
  },
  {
    id: 'post-2',
    authorName: 'Sneha Sundaram',
    username: 'u/sneha_design',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    campusOrCity: 'PES University, Bangalore · UI/UX',
    roleTag: 'Product Design',
    title: 'Transitioning from visual design to core product thinking — The 3 questions changed how I sketch',
    content: "Hi everyone! I used to jump straight into Figma whenever a campus friend pitched an app idea. Learning that 'a product is not what you build, but what people can't stop using' completely shifted my perspective. Happy to help any team review wireframes and design teardowns!",
    tags: ['#UIUX', '#DesignThinking', '#ProductWizardry'],
    upvotes: 35,
    commentsCount: 6,
    postedAt: '5 hours ago'
  },
  {
    id: 'post-3',
    authorName: 'Devansh Joshi',
    username: 'u/devansh_j',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    campusOrCity: 'BITS Pilani · Electronics',
    roleTag: 'Full-Stack Maker',
    title: 'Tested a WhatsApp bot for campus circulars with 60 students — Here is what failed',
    content: "Ran a quick test last week before starting Module 1. Lesson learned: students didn't want circular alerts; they wanted to know when the mess menu changed and if exams got postponed! Starting from user friction rather than what I assumed was the real breakthrough.",
    tags: ['#CampusProblem', '#Fieldwork', '#LessonsLearned'],
    upvotes: 58,
    commentsCount: 14,
    postedAt: '1 day ago'
  },
  {
    id: 'post-4',
    authorName: 'Priya Nair',
    username: 'u/priya_product',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    campusOrCity: 'VIT Vellore · Business Administration',
    roleTag: 'Product & Growth',
    title: 'Non-tech background fellow loving the stories-first approach!',
    content: "I was honestly nervous that AI Product Wizardry would be pure coding syntax, but diving into the stories of Burbn and Slack showed me that empathy, observation, and distribution matter just as much as code. Excited to learn alongside all of you!",
    tags: ['#NonTechToPM', '#StoriesFirst', '#Batch1Fellow'],
    upvotes: 27,
    commentsCount: 4,
    postedAt: '2 days ago'
  }
];

export const CohortCommunityPage: React.FC<CohortCommunityPageProps> = ({ mode }) => {
  const { user } = useAuthAndCourse();
  const STORAGE_KEY = 'aiw_cohort_posts';

  const [posts, setPosts] = useState<PeerPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PEER_POSTS;
    } catch {
      return INITIAL_PEER_POSTS;
    }
  });

  const [headline, setHeadline] = useState('');
  const [aboutYouText, setAboutYouText] = useState('');
  const [selectedTag, setSelectedTag] = useState('#LookingForTeammate');
  const [isPosting, setIsPosting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const availableTags = [
    '#LookingForTeammate',
    '#ProductDiscovery',
    '#DesignThinking',
    '#FullStackMaker',
    '#CampusProblem',
    '#Intro'
  ];

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aboutYouText.trim()) return;

    setIsPosting(true);

    const studentName = user?.name || 'Cohort Fellow';
    const userHandle = 'u/' + studentName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const newPost: PeerPost = {
      id: 'post-user-' + Date.now().toString(36),
      authorName: studentName,
      username: userHandle,
      avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      campusOrCity: mode === 'online' ? 'Online Cohort Fellow' : 'Campus Batch Fellow',
      roleTag: 'Batch 1 Fellow',
      title: headline.trim() || `Hi everyone! I'm ${studentName} — Here is my product journey`,
      content: aboutYouText.trim(),
      tags: [selectedTag, '#Batch1Fellow'],
      upvotes: 1,
      commentsCount: 0,
      postedAt: 'Just now',
      isUpvoted: true
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    setHeadline('');
    setAboutYouText('');
    setIsPosting(false);
    setToastMessage('Your introduction was shared with the cohort!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggleUpvote = (postId: string) => {
    const updated = posts.map(p => {
      if (p.id === postId) {
        const currentlyUpvoted = p.isUpvoted;
        return {
          ...p,
          upvotes: currentlyUpvoted ? p.upvotes - 1 : p.upvotes + 1,
          isUpvoted: !currentlyUpvoted
        };
      }
      return p;
    });
    setPosts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <PortalLayout mode={mode} title="Cohort Hub & Peer Introductions">
      <div className="space-y-8 font-sans text-left max-w-4xl mx-auto">
        
        {/* Header Overview Banner */}
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-subtle">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-accent-subtle text-accent border border-accent-light/60">
                  Batch 1 Peer Network
                </span>
                <span className="text-xs text-text-muted">48 Active Fellows</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Cohort Introductions & Stories
              </h1>
              <p className="text-sm text-text-muted leading-relaxed">
                Meet fellow builders across university campuses, find teammates for jury defenses, and share what kind of problems you want to solve during the 6-month fellowship.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-background p-4 rounded-2xl border border-border flex-shrink-0">
              <div className="text-left">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Active Modality</span>
                <div className="text-base font-bold text-primary">{mode === 'online' ? 'Online Cohort' : 'Campus Batch'}</div>
                <span className="text-xs text-accent font-semibold">{posts.length} Introductions Shared</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-subtle">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* INTRODUCE YOURSELF TEXT BOX (Requirement 6) */}
        <div className="bg-surface rounded-2xl border-2 border-accent/40 p-6 sm:p-7 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-base text-primary">
                Introduce Yourself to the Cohort
              </h3>
            </div>
            {toastMessage && (
              <span className="text-xs font-bold text-emerald-700 animate-pulse flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {toastMessage}
              </span>
            )}
          </div>

          <form onSubmit={handleCreatePost} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-secondary block mb-1">
                Post Headline / Catchphrase (Optional)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. CS Sophomore from Pune building micro-SaaS · Looking for Module 1 teammates!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-secondary block mb-1">
                Write About You *
              </label>
              <textarea
                required
                rows={4}
                value={aboutYouText}
                onChange={(e) => setAboutYouText(e.target.value)}
                placeholder="Tell us about yourself: What college/city are you from? What is your background? What apps or products do you love? What friction or problem do you dream of solving during AI Product Wizardry?..."
                className="w-full p-3.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent text-xs leading-relaxed"
              />
            </div>

            {/* Tag Selection */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-text-muted">Primary Tag:</span>
              {availableTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedTag === t
                      ? 'bg-accent text-white shadow-subtle'
                      : 'bg-slate-100 text-secondary hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPosting || !aboutYouText.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-subtle disabled:opacity-50 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isPosting ? 'Posting...' : 'Post Introduction'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* REDDIT-STYLE COHORT FEED */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Recent Fellow Introductions ({posts.length})
            </span>
            <span className="text-xs text-text-muted">Sorted by Community Upvotes</span>
          </div>

          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-surface rounded-2xl border border-border hover:border-slate-300 shadow-card transition-all flex text-xs overflow-hidden"
            >
              {/* Left Column: Reddit-Style Upvote Gutter */}
              <div className="w-12 bg-slate-50/80 border-r border-border flex flex-col items-center py-3 flex-shrink-0">
                <button
                  onClick={() => handleToggleUpvote(post.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    post.isUpvoted 
                      ? 'bg-accent/10 text-accent font-extrabold' 
                      : 'text-text-muted hover:text-accent hover:bg-slate-100'
                  }`}
                  title="Upvote this introduction"
                >
                  <ArrowUp className={`w-4 h-4 ${post.isUpvoted ? 'stroke-[3]' : ''}`} />
                </button>
                <span className={`text-[11px] font-bold my-1 ${post.isUpvoted ? 'text-accent' : 'text-primary'}`}>
                  {post.upvotes}
                </span>
              </div>

              {/* Right Column: Post Body */}
              <div className="flex-1 p-5 space-y-2.5 text-left">
                {/* Meta Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={post.avatar}
                      alt={post.authorName}
                      className="w-7 h-7 rounded-full object-cover border border-border"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-primary">{post.authorName}</span>
                      <span className="text-text-muted text-[11px]">{post.username}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-text-muted">{post.campusOrCity}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-text-muted">
                    {post.postedAt}
                  </span>
                </div>

                {/* Post Title */}
                <h3 className="font-bold text-sm text-primary leading-snug">
                  {post.title}
                </h3>

                {/* Post Body Content */}
                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs">
                  {post.content}
                </p>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.tags.map((tg, i) => (
                    <span 
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-secondary border border-border"
                    >
                      {tg}
                    </span>
                  ))}
                </div>

                {/* Reddit Actions Bar */}
                <div className="pt-2 border-t border-border flex items-center gap-5 text-text-muted text-[11px]">
                  <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentsCount} Comments</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </PortalLayout>
  );
};
