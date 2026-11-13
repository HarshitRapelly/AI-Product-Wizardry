import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Setup color palette
const navy = [15, 23, 42]; // #0F172A
const blue = [37, 99, 235]; // #2563EB
const emerald = [16, 185, 129]; // #10B981
const amber = [245, 158, 11]; // #F59E0B
const bgSubtle = [241, 245, 249]; // #F1F5F9

// --- PAGE 1: WHERE IDEAS BECOME PRODUCTS PEOPLE LOVE ---
doc.setFillColor(navy[0], navy[1], navy[2]);
doc.rect(0, 0, 210, 297, 'F');

// Top badge
doc.setFillColor(blue[0], blue[1], blue[2]);
doc.rect(20, 20, 6, 36, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.text('FOR UNDERGRADUATES • POWERED BY NIAT x NXTWAVE', 32, 26);

// Main Title
doc.setFontSize(26);
doc.text('AI PRODUCT WIZARDRY', 32, 38);

doc.setFontSize(13);
doc.setFont('helvetica', 'normal');
doc.setTextColor(203, 213, 225);
doc.text('Where ideas become products people love.', 32, 48);

// Divider
doc.setDrawColor(51, 65, 85);
doc.setLineWidth(0.5);
doc.line(32, 54, 190, 54);

// Philosophy Callout
doc.setFillColor(30, 41, 59);
doc.roundedRect(20, 64, 170, 56, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.text('Great code builds the product. Product thinking decides if anyone keeps it.', 28, 76);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(203, 213, 225);
const p1Lines = [
  'AI Product Wizardry teaches the half of tech that most classrooms skip: choosing the right problem,',
  'shaping an idea people want, and carrying it from a sketch to a launch.',
  'Story-led, hands-on, and made for students who like to make things.',
  '',
  'Duration: 6 Months | 12 Modules (Idea to Launch) | 3-4 Hours a Week'
];
let y = 84;
p1Lines.forEach(l => {
  doc.text(l, 28, y);
  y += 5.5;
});

// Three Questions Every Product Wizard Learns to Ask
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('THREE QUESTIONS EVERY PRODUCT WIZARD LEARNS TO ASK', 20, 132);

const questions = [
  {
    q: '1. A real problem?',
    sub: 'Start from a person\'s need, not a feature.',
    desc: 'Notice what frustrates real people in their daily workflows before writing code.'
  },
  {
    q: '2. Will people want it?',
    sub: 'Listen, test, and let users surprise you.',
    desc: 'Prototype quickly, observe true user reactions, and validate assumptions early.'
  },
  {
    q: '3. Will they return?',
    sub: 'Earn a permanent place on the home screen.',
    desc: 'Build habits and retention loops that turn casual users into lifelong fans.'
  }
];

let qx = 20;
questions.forEach((item) => {
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(qx, 138, 53, 50, 3, 3, 'F');

  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(qx, 138, 53, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(item.q, qx + 5, 148);

  doc.setTextColor(147, 197, 253);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const subLines = doc.splitTextToSize(item.sub, 44);
  doc.text(subLines, qx + 5, 155);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(7.5);
  const descLines = doc.splitTextToSize(item.desc, 44);
  doc.text(descLines, qx + 5, 168);

  qx += 58.5;
});

// 3 Pedagogical Pillars & Tuition Card
doc.setFillColor(30, 41, 59);
doc.roundedRect(20, 200, 170, 70, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('PROGRAM METHODOLOGY & BATCH 1 ENROLLMENT', 28, 212);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(203, 213, 225);
doc.text('• STORIES FIRST: Every topic opens with a real product story in plain words. Concepts second, building always.', 28, 222);
doc.text('• LEARN BY BUILDING: Work in a team to find a problem, shape the idea, build it and test it with real users.', 28, 230);
doc.text('• HEAR FROM MAKERS: Guest lectures from people who ship products, held now and then, mostly on weekends.', 28, 238);
doc.text('• THE FEE: 11,000 INR from Batch 2 onwards. 100% Free Scholarship for Batch 1 Fellows.', 28, 248);
doc.text('• WHAT WE ASK: Show up. Light up. Keep going. (Commitment · Enthusiasm · Consistency)', 28, 256);

// Page 1 Footer
doc.setTextColor(148, 163, 184);
doc.setFontSize(8);
doc.text('AI Product Wizardry • Official Undergraduate Curriculum Specification', 20, 285);
doc.text('Page 1 of 2', 178, 285);

// --- PAGE 2: THE 12 MODULES & JOURNEY ---
doc.addPage();

// Header
doc.setFillColor(navy[0], navy[1], navy[2]);
doc.rect(0, 0, 210, 30, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.text('THE 12-MODULE CURRICULUM (IDEA TO LAUNCH)', 20, 16);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(203, 213, 225);
doc.text('Two modules a month for six months. Every module ends with a written document and a live jury defense.', 20, 23);

// 12 Modules Table
const modules = [
  { num: 'Module 0', title: 'Orientation & Program Essentials', desc: 'Expectations, team formation, tooling & student mindset.' },
  { num: 'Module 1', title: 'Foundations of Product Management', desc: 'Great code builds the product; product thinking decides retention.' },
  { num: 'Module 2', title: 'Market Discovery & Opportunity Assessment', desc: 'Notice what frustrates real people & estimate addressable markets.' },
  { num: 'Module 3', title: 'Problem Framing: Empathize & Define', desc: 'Start from a person\'s need, not a feature. How Might We frameworks.' },
  { num: 'Module 4', title: 'User Research: Methods & Synthesis', desc: 'Listen, test, and let users surprise you. Unbiased customer interviews.' },
  { num: 'Module 5', title: 'Ideation & Concept Validation', desc: 'Turn a spark of curiosity into a clear plan and prioritization matrix.' },
  { num: 'Module 6', title: 'Product Definition: From MVP to Roadmap', desc: 'Structured PRDs, user stories, feature scoping & release timelines.' },
  { num: 'Module 7', title: 'Prototyping & Usability Testing', desc: 'Build a first working version; test with real users and observe friction.' },
  { num: 'Module 8', title: 'Execution: Agile Delivery with Engineering', desc: 'Sprint planning, backlog grooming, scope trade-offs & hand-offs.' },
  { num: 'Module 9', title: 'Metrics, Analytics & Experimentation', desc: 'North Star metrics, cohort retention, activation funnels & A/B testing.' },
  { num: 'Module 10', title: 'Go-to-Market & Product Lifecycle', desc: 'Earn a permanent place on the home screen; onboarding & growth.' },
  { num: 'Module 11', title: 'Product Sense, Case Studies & Capstone', desc: 'Defend your thinking live before a jury of industry leaders.' }
];

let my = 38;
modules.forEach((mod, idx) => {
  if (idx % 2 === 0) {
    doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
    doc.roundedRect(18, my - 3, 174, 15, 1.5, 1.5, 'F');
  }

  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(20, my - 1, 2, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(mod.num + ' — ' + mod.title, 25, my + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(mod.desc, 25, my + 8);

  my += 16.5;
});

// Certificate Grading & Career Box
doc.setFillColor(navy[0], navy[1], navy[2]);
doc.roundedRect(18, 238, 174, 44, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.text('CERTIFICATE STANDARDS & CAREER TRAJECTORIES', 24, 246);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(203, 213, 225);
doc.text('EVALUATION: 50% Written Assignments | 30% Capstone Jury Defense | 20% Content MCQs (Score > 70% to pass)', 24, 254);
doc.text('OFFLINE BATCHES: Also require 80% attendance and 80% MCQ completion to qualify for alumni recommendations.', 24, 261);
doc.text('CAREER DOORS: Product Manager, Product Engineer, Startup Founder, Product Analyst, Forward-Deployed Engineer.', 24, 268);
doc.text('The certificate improves your profile and portfolio; it does not guarantee a job.', 24, 275);

// Page 2 Footer
doc.setTextColor(148, 163, 184);
doc.setFontSize(8);
doc.text('AI Product Wizardry Academy • Admissions & Program Inquiries: admissions@aiproductwizardry.edu', 20, 290);
doc.text('Page 2 of 2', 178, 290);

// Ensure output dir exists
const assetsDir = path.join(__dirname, '..', 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const outputPath = path.join(assetsDir, 'ai-product-wizardry-brochure.pdf');
const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

console.log('Successfully regenerated official brochure at:', outputPath);
