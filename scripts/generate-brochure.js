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
const slate = [51, 65, 85]; // #334155
const blue = [37, 99, 235]; // #2563EB
const muted = [100, 116, 139]; // #64748B
const bgSubtle = [241, 245, 249]; // #F1F5F9

// --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
doc.setFillColor(navy[0], navy[1], navy[2]);
doc.rect(0, 0, 210, 297, 'F');

// Subtle top banner accent
doc.setFillColor(blue[0], blue[1], blue[2]);
doc.rect(20, 24, 8, 40, 'F');

// Program Badge
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.text('PROFESSIONAL ACADEMY SPECIFICATION • 2026 COHORT', 34, 30);

// Main Title
doc.setFontSize(28);
doc.text('AI PRODUCT WIZARDRY', 34, 44);

doc.setFontSize(14);
doc.setFont('helvetica', 'normal');
doc.setTextColor(203, 213, 225);
doc.text('The Executive Program for Modern AI Product Managers & Leaders', 34, 54);

// Decorative separator
doc.setDrawColor(51, 65, 85);
doc.setLineWidth(0.5);
doc.line(34, 62, 190, 62);

// Summary Card
doc.setFillColor(30, 41, 59);
doc.roundedRect(20, 75, 170, 70, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.text('Program Overview & Core Philosophy', 28, 86);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(226, 232, 240);
const summaryText = [
  'AI Product Wizardry is an intensive, 12-level professional mastery curriculum engineered specifically',
  'for product managers, senior designers, and technology executives transitioning into generative AI.',
  '',
  'Rather than focusing on high-level consumer gimmicks or pure raw machine learning mathematics,',
  'this curriculum dissects the commercial product layer: probabilistic UX patterns, token economics,',
  'hybrid RAG architectures, model fine-tuning trade-offs, and empirical LLM-as-a-Judge evaluation suites.',
  '',
  'Available in two distinct delivery formats: Immersive Online Cohort and In-Person Campus Cohort.'
];
let yOffset = 94;
summaryText.forEach(line => {
  doc.text(line, 28, yOffset);
  yOffset += 5.5;
});

// Three Pillars
const pillars = [
  { title: '12 Mastery Levels', desc: 'Progressive modular path from foundations to 0-to-1 Capstone defense.' },
  { title: 'Empirical Rigor', desc: 'Move beyond "prompt vibes" to quantitative evaluation frameworks.' },
  { title: 'Dual Modality', desc: 'Full flexibility: live virtual labs or physical campus immersion.' }
];

let px = 20;
pillars.forEach((p) => {
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(px, 155, 52, 45, 3, 3, 'F');
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(px, 155, 52, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(p.title, px + 6, 166);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const pLines = doc.splitTextToSize(p.desc, 40);
  doc.text(pLines, px + 6, 174);

  px += 59;
});

// Program Specs at Bottom
doc.setFillColor(30, 41, 59);
doc.roundedRect(20, 210, 170, 56, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.text('Key Cohort Specifications', 28, 222);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(203, 213, 225);
doc.text('• Duration: 12 Weeks (Self-paced + weekly live masterclasses or physical seminars)', 28, 231);
doc.text('• Time Commitment: 6 - 8 hours per week (Reading, quizzes, and live workshops)', 28, 238);
doc.text('• Tuition: $999 USD (All materials, recordings, evaluation sandboxes & certification included)', 28, 245);
doc.text('• Capstone: Defend an enterprise AI PRD before industry VPs and venture partners', 28, 252);

// Footer
doc.setTextColor(148, 163, 184);
doc.setFontSize(8);
doc.text('AI Product Wizardry Academy © 2026 • Confidential & Proprietary Curriculum Overview', 20, 282);
doc.text('Page 1 of 2', 178, 282);

// --- PAGE 2: 12-LEVEL CURRICULUM SYLLABUS ---
doc.addPage();

// Header
doc.setFillColor(navy[0], navy[1], navy[2]);
doc.rect(0, 0, 210, 32, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.text('THE 12-LEVEL MASTERY CURRICULUM', 20, 18);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(203, 213, 225);
doc.text('Structured progression designed by leading AI scientists and veteran product executives', 20, 25);

// Levels List Table
const levels = [
  { num: 'Level 01', title: 'Foundations of AI Product Management', desc: 'Transitioning from deterministic to probabilistic systems & uncertainty UX.' },
  { num: 'Level 02', title: 'LLM Architectures & Token Economics', desc: 'Context windows, inference latency, cache optimization & cost budgets.' },
  { num: 'Level 03', title: 'Prompt Engineering & System Directives', desc: 'Few-shot prompting, chain-of-thought, structured schemas & prompt testing.' },
  { num: 'Level 04', title: 'Retrieval-Augmented Generation (RAG)', desc: 'Chunking strategies, vector databases, hybrid retrieval & context re-ranking.' },
  { num: 'Level 05', title: 'Model Adaptation: Fine-Tuning vs RAG', desc: 'LoRA, parameter-efficient tuning, synthetic data & domain adaptation.' },
  { num: 'Level 06', title: 'AI UX Design & Human-in-the-Loop', desc: 'Steerability, latency perception, graceful failure & RLHF telemetry.' },
  { num: 'Level 07', title: 'AI Evaluation & Benchmark Frameworks', desc: 'LLM-as-a-Judge, G-Eval, synthetic benchmark suites & automated CI evals.' },
  { num: 'Level 08', title: 'Safety, Guardrails & Red-Teaming', desc: 'Jailbreak mitigation, PII redaction, NeMo guardrails & compliance audits.' },
  { num: 'Level 09', title: 'Autonomous Agents & Tool Orchestration', desc: 'ReAct pattern, multi-agent swarms, function calling & workflow execution.' },
  { num: 'Level 10', title: 'AI Economics, Unit Margins & Scaling', desc: 'Semantic routers, caching economics, API pricing & unit profitability.' },
  { num: 'Level 11', title: 'Enterprise Deployment & Governance', desc: 'SOC2, EU AI Act, private VPCs, SLAs & stakeholder change management.' },
  { num: 'Level 12', title: 'Executive Capstone: 0-to-1 AI Product', desc: 'Comprehensive PRD, working prototype, eval suite & live jury defense.' }
];

let curY = 40;
levels.forEach((lvl, idx) => {
  // Alternate background
  if (idx % 2 === 0) {
    doc.setFillColor(bgSubtle[0], bgSubtle[1], bgSubtle[2]);
    doc.roundedRect(18, curY - 3, 174, 15, 1.5, 1.5, 'F');
  }

  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(20, curY - 1, 2, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(lvl.num + ' — ' + lvl.title, 25, curY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(lvl.desc, 25, curY + 8);

  curY += 16.5;
});

// Learning Modes Comparison Table
doc.setFillColor(navy[0], navy[1], navy[2]);
doc.roundedRect(18, 240, 174, 40, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.text('Delivery Modality Comparison', 24, 248);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(203, 213, 225);
doc.text('ONLINE LEARNING: Live virtual masterclasses, on-demand video recordings, digital attendance & quizzes.', 24, 256);
doc.text('OFFLINE LEARNING: In-person campus seminars, hands-on faculty clinics, physical peer whiteboarding & quizzes.', 24, 263);
doc.text('ENROLLMENT: Visit the official portal to enroll, select your preferred learning mode, and access Level 01.', 24, 270);

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

console.log('Successfully generated official brochure at:', outputPath);
