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

// Color Palette directly retrieved from the presentation
const darkTeal = [28, 26, 23]; // #1C1A17 (Warm Charcoal Espresso)
const mintGreen = [238, 245, 252]; // Cerulean subtle
const orange = [209, 83, 31]; // #D1531F (Presentation Terracotta)
const coral = [209, 83, 31];
const cerulean = [91, 155, 213]; // #5B9BD5 (Presentation Blue)
const gold = [234, 179, 8];
const cream = [250, 247, 242]; // #FAF7F2 (Presentation Ivory Cream)
const softOrange = [253, 245, 240]; // Terracotta subtle
const textDark = [28, 26, 23];
const textMuted = [107, 100, 92]; // #6B645C
const emerald = [16, 185, 129];

// =========================================================================
// PAGE 1: WHERE IDEAS BECOME PRODUCTS PEOPLE LOVE
// =========================================================================
// Dark teal header background
doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.rect(0, 0, 210, 130, 'F');

// Logo Badge
doc.setFillColor(0, 0, 0);
doc.roundedRect(20, 15, 45, 16, 2, 2, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.text('AI PRODUCT', 24, 21);
doc.setFontSize(11);
doc.text('Wizardry', 24, 26);
doc.setFontSize(5);
doc.text('Powered by NXTWAVE', 24, 29);

// "FOR UNDERGRADUATES" Pill
doc.setFillColor(orange[0], orange[1], orange[2]);
doc.roundedRect(20, 38, 42, 6, 3, 3, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(7);
doc.setFont('helvetica', 'bold');
doc.text('FOR UNDERGRADUATES', 23, 42.5);

// Main Heading
doc.setFontSize(24);
doc.setFont('helvetica', 'bold');
doc.setTextColor(255, 255, 255);
doc.text('Where ideas become', 20, 55);
doc.text('products people', 20, 64);
doc.text('love.', 20, 73);

// Subtext
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(226, 232, 240);
const p1Sub = doc.splitTextToSize('Six months of stories, building and teamwork to learn the magic behind every app you can\'t put down.', 100);
doc.text(p1Sub, 20, 83);

// Right Side Phone & App Illustration Representation
doc.setFillColor(255, 255, 255);
doc.roundedRect(135, 25, 55, 95, 8, 8, 'F');
doc.setFillColor(30, 41, 59);
doc.roundedRect(138, 28, 49, 89, 6, 6, 'F');
// Phone icons representation
doc.setFillColor(coral[0], coral[1], coral[2]);
doc.roundedRect(144, 40, 10, 10, 2, 2, 'F');
doc.setFillColor(emerald[0] || 16, 185, 129);
doc.roundedRect(158, 40, 10, 10, 2, 2, 'F');
doc.setFillColor(255, 255, 255);
doc.roundedRect(171, 40, 10, 10, 2, 2, 'F');
doc.setFillColor(241, 245, 249);
doc.roundedRect(144, 55, 10, 10, 2, 2, 'F');
doc.setFillColor(coral[0], coral[1], coral[2]);
doc.roundedRect(158, 55, 10, 10, 2, 2, 'F');
doc.setFillColor(241, 245, 249);
doc.roundedRect(171, 55, 10, 10, 2, 2, 'F');
doc.setFillColor(13, 148, 136);
doc.circle(162, 78, 6, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(6);
doc.text('IDEA · BUILD · LAUNCH', 142, 100);

// Mid section: Philosophy statement
doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(15);
doc.setFont('helvetica', 'bold');
doc.text('Great code builds the', 20, 142);
doc.text('product. Product thinking', 20, 149);
doc.text('decides if anyone keeps it.', 20, 156);

doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
doc.setFontSize(8.5);
doc.setFont('helvetica', 'normal');
const philText = doc.splitTextToSize(
  'AI Product Wizardry teaches the half of tech that most classrooms skip: choosing the right problem, shaping an idea people want, and carrying it from a sketch to a launch. Story-led, hands-on, and made for students who like to make things.',
  90
);
doc.text(philText, 105, 142);

// Three Questions section
doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('THREE QUESTIONS EVERY PRODUCT WIZARD LEARNS TO ASK', 20, 172);

// Card 1: A real problem?
doc.setFillColor(mintGreen[0], mintGreen[1], mintGreen[2]);
doc.roundedRect(20, 176, 52, 28, 3, 3, 'F');
doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.text('A real problem?', 24, 184);
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
doc.text('Start from a person\'s need,', 24, 191);
doc.text('not a feature.', 24, 196);

// Card 2: Will people want it?
doc.setFillColor(softOrange[0], softOrange[1], softOrange[2]);
doc.roundedRect(78, 176, 52, 28, 3, 3, 'F');
doc.setTextColor(coral[0], coral[1], coral[2]);
doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.text('Will people want it?', 82, 184);
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
doc.text('Listen, test, and let users', 82, 191);
doc.text('surprise you.', 82, 196);

// Card 3: Will they return?
doc.setFillColor(cream[0], cream[1], cream[2]);
doc.roundedRect(136, 176, 54, 28, 3, 3, 'F');
doc.setTextColor(180, 83, 9);
doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.text('Will they return?', 140, 184);
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
doc.text('Earn a permanent place on', 140, 191);
doc.text('the home screen.', 140, 196);

// Bottom 3 Metric Pills
// Pill 1: 6 months
doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.roundedRect(20, 212, 85, 20, 10, 10, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('6', 28, 225);
doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.text('months of', 37, 222);
doc.text('building', 37, 227);

// Pill 2: 12 modules
doc.setFillColor(coral[0], coral[1], coral[2]);
doc.roundedRect(20, 236, 85, 20, 10, 10, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('12', 26, 249);
doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.text('modules, from', 37, 246);
doc.text('idea to launch', 37, 251);

// Pill 3: 3-4 hours
doc.setFillColor(217, 119, 6);
doc.roundedRect(20, 260, 85, 20, 10, 10, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.text('3–4', 24, 273);
doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.text('hours a week,', 37, 270);
doc.text('steady wins', 37, 275);

// Bottom Right Graphic Box: IDEA · BUILD · LAUNCH
doc.setFillColor(mintGreen[0], mintGreen[1], mintGreen[2]);
doc.roundedRect(112, 212, 78, 68, 4, 4, 'F');
doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.rect(112, 266, 78, 14, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('IDEA · BUILD · LAUNCH', 130, 275);

doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(12);
doc.text('🚀 Ready to Ship', 130, 235);
doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.text('Story-led · Team-based · Hands-on', 122, 245);

// =========================================================================
// PAGE 2: YOUR JOURNEY (FROM SPARK OF CURIOSITY TO LAUNCH)
// =========================================================================
doc.addPage();

// Header
doc.setTextColor(orange[0], orange[1], orange[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('YOUR JOURNEY', 20, 18);

doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(18);
doc.text('From a spark of curiosity to something you', 20, 26);
doc.text('built yourself.', 20, 34);

doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
const p2Sub = doc.splitTextToSize(
  'Twelve modules over six months. Module 0 sets expectations; every module after it ends with an assignment: a written document first, then a jury presentation where you defend your thinking.',
  170
);
doc.text(p2Sub, 20, 41);

// Journey Path Milestones
const journeySteps = [
  { num: '1', title: 'Spot a problem', desc: 'Notice what frustrates real people.' },
  { num: '2', title: 'Shape the idea', desc: 'Turn a hunch into a clear plan.' },
  { num: '3', title: 'Build it', desc: 'Make a first working version.' },
  { num: '4', title: 'Test with users', desc: 'Learn from real feedback.' },
  { num: '5', title: 'Pitch to the jury', desc: 'Defend your thinking, live.' },
  { num: '6', title: 'Earn certificate', desc: 'A portfolio to show for it.' }
];

let jx = 20;
journeySteps.forEach((st, idx) => {
  doc.setFillColor(softOrange[0], softOrange[1], softOrange[2]);
  doc.roundedRect(jx, 54, 26, 26, 2, 2, 'F');

  doc.setFillColor(coral[0], coral[1], coral[2]);
  doc.circle(jx + 13, 62, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(st.num, jx + 11.8, 64.5);

  doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(st.title, jx + 2, 73);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  const dLines = doc.splitTextToSize(st.desc, 22);
  doc.text(dLines, jx + 2, 77);

  jx += 29;
});

// Three Methodology Cards
// Stories First
doc.setFillColor(mintGreen[0], mintGreen[1], mintGreen[2]);
doc.roundedRect(20, 88, 52, 40, 3, 3, 'F');
doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.text('Stories first', 25, 96);
doc.setFontSize(7.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
const sfText = doc.splitTextToSize('Every topic opens with a real product story in plain words. Concepts come second, building always.', 42);
doc.text(sfText, 25, 104);

// Learn by building
doc.setFillColor(softOrange[0], softOrange[1], softOrange[2]);
doc.roundedRect(78, 88, 52, 40, 3, 3, 'F');
doc.setTextColor(coral[0], coral[1], coral[2]);
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.text('Learn by building', 83, 96);
doc.setFontSize(7.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
const lbText = doc.splitTextToSize('Work in a team to find a problem, shape the idea, build it and test it with real users, end to end.', 42);
doc.text(lbText, 83, 104);

// Hear from makers
doc.setFillColor(cream[0], cream[1], cream[2]);
doc.roundedRect(136, 88, 54, 40, 3, 3, 'F');
doc.setTextColor(180, 83, 9);
doc.setFontSize(9);
doc.setFont('helvetica', 'bold');
doc.text('Hear from makers', 141, 96);
doc.setFontSize(7.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
const hmText = doc.splitTextToSize('Guest lectures from people who ship products, held now and then, mostly on weekends.', 44);
doc.text(hmText, 141, 104);

// Career Doors
doc.setTextColor(orange[0], orange[1], orange[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('DOORS A PRODUCT MINDSET CAN OPEN', 20, 138);

const doors = [
  'Product manager',
  'Product engineer',
  'Founder',
  'Product analyst',
  'Forward-deployed engineer'
];
let dx = 20;
doors.forEach(door => {
  doc.setFillColor(mintGreen[0], mintGreen[1], mintGreen[2]);
  doc.roundedRect(dx, 143, 32, 22, 2, 2, 'F');
  doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const dLines = doc.splitTextToSize(door, 28);
  doc.text(dLines, dx + 4, 153);
  dx += 35;
});

// How You Earn the Certificate Box
doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.roundedRect(20, 175, 170, 48, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text('How you earn the certificate', 28, 185);

// 3 Metric percentages
doc.setFontSize(16);
doc.setTextColor(gold[0], gold[1], gold[2]);
doc.text('50%', 32, 198);
doc.text('30%', 88, 198);
doc.text('20%', 144, 198);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.setTextColor(255, 255, 255);
doc.text('Assignments', 32, 204);
doc.text('Capstone', 88, 204);
doc.text('Content', 144, 204);

doc.setFontSize(7.5);
doc.setTextColor(203, 213, 225);
doc.text('Score above 70% in assignments and the capstone. Offline batches also need 80% attendance and 80% of the MCQs.', 28, 215);

// The Fee & What We Ask Box
doc.setFillColor(softOrange[0], softOrange[1], softOrange[2]);
doc.roundedRect(20, 230, 80, 45, 3, 3, 'F');
doc.setTextColor(orange[0], orange[1], orange[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('THE FEE', 26, 238);
doc.setFontSize(9);
doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.text('11,000 INR from Batch 2 onwards.', 26, 246);
doc.setFillColor(orange[0], orange[1], orange[2]);
doc.roundedRect(26, 252, 36, 8, 2, 2, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(8);
doc.text('Free for this batch.', 29, 257.5);

doc.setFillColor(mintGreen[0], mintGreen[1], mintGreen[2]);
doc.roundedRect(105, 230, 85, 45, 3, 3, 'F');
doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('WHAT WE ASK OF YOU', 111, 238);
doc.setFontSize(12);
doc.text('Show up. Light up. Keep going.', 111, 248);
doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
doc.text('Commitment · Enthusiasm · Consistency', 111, 256);

doc.setFontSize(7);
doc.text('The certificate improves your profile; it does not guarantee a job.', 20, 285);

// =========================================================================
// PAGE 3: THE CURRICULUM (TWELVE MODULES, FIRST SPARK TO LAUNCH)
// =========================================================================
doc.addPage();

// Header
doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
doc.rect(0, 0, 210, 36, 'F');

doc.setTextColor(gold[0], gold[1], gold[2]);
doc.setFontSize(8);
doc.setFont('helvetica', 'bold');
doc.text('THE CURRICULUM', 20, 16);

doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.text('Twelve modules. One idea, taken from first spark to launch.', 20, 24);

doc.setFontSize(8);
doc.setFont('helvetica', 'normal');
doc.setTextColor(203, 213, 225);
doc.text('Two modules a month for six months. Module 0 sets expectations; every module after ends with an assignment.', 20, 31);

// 12 Modules (2 columns of 6 modules, exactly like PDF Page 3)
const column1 = [
  { mod: 'MODULE 0', title: 'Orientation & Program Essentials' },
  { mod: 'MODULE 1', title: 'Foundations of Product Management' },
  { mod: 'MODULE 2', title: 'Market Discovery & Opportunity Assessment' },
  { mod: 'MODULE 3', title: 'Problem Framing: Empathize & Define' },
  { mod: 'MODULE 4', title: 'User Research: Methods & Synthesis' },
  { mod: 'MODULE 5', title: 'Ideation & Concept Validation' }
];

const column2 = [
  { mod: 'MODULE 6', title: 'Product Definition: From MVP to Roadmap' },
  { mod: 'MODULE 7', title: 'Prototyping & Usability Testing' },
  { mod: 'MODULE 8', title: 'Execution: Agile Delivery with Engineering' },
  { mod: 'MODULE 9', title: 'Metrics, Analytics & Experimentation' },
  { mod: 'MODULE 10', title: 'Go-to-Market & Product Lifecycle' },
  { mod: 'MODULE 11', title: 'Product Sense, Case Studies & Capstone' }
];

let rowY = 46;
for (let i = 0; i < 6; i++) {
  // Left Column Card
  const c1 = column1[i];
  doc.setFillColor(i % 2 === 0 ? mintGreen[0] : softOrange[0], i % 2 === 0 ? mintGreen[1] : softOrange[1], i % 2 === 0 ? mintGreen[2] : softOrange[2]);
  doc.roundedRect(20, rowY, 82, 32, 3, 3, 'F');

  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(c1.mod, 26, rowY + 9);

  doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const c1Lines = doc.splitTextToSize(c1.title, 70);
  doc.text(c1Lines, 26, rowY + 17);

  // Right Column Card
  const c2 = column2[i];
  if (i === 5) {
    // Module 11 is Capstone, dark teal
    doc.setFillColor(darkTeal[0], darkTeal[1], darkTeal[2]);
    doc.roundedRect(108, rowY, 82, 32, 3, 3, 'F');
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(c2.mod, 114, rowY + 9);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const c2Lines = doc.splitTextToSize(c2.title, 70);
    doc.text(c2Lines, 114, rowY + 17);
  } else {
    doc.setFillColor(i % 2 === 1 ? mintGreen[0] : softOrange[0], i % 2 === 1 ? mintGreen[1] : softOrange[1], i % 2 === 1 ? mintGreen[2] : softOrange[2]);
    doc.roundedRect(108, rowY, 82, 32, 3, 3, 'F');
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(c2.mod, 114, rowY + 9);
    doc.setTextColor(darkTeal[0], darkTeal[1], darkTeal[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const c2Lines = doc.splitTextToSize(c2.title, 70);
    doc.text(c2Lines, 114, rowY + 17);
  }

  rowY += 37;
}

// Bottom Footer Banner
doc.setFillColor(0, 0, 0);
doc.rect(0, 272, 210, 25, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('Eleven modules of real work, one growing portfolio.', 20, 284);
doc.setFontSize(7.5);
doc.setFont('helvetica', 'normal');
doc.setTextColor(203, 213, 225);
doc.text('AI Product Wizardry • Powered by NIAT x NXTWAVE', 20, 290);
doc.text('Page 3 of 3', 180, 290);

// Ensure output dir exists
const assetsDir = path.join(__dirname, '..', 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const outputPath = path.join(assetsDir, 'ai-product-wizardry-brochure.pdf');
const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

console.log('Successfully generated authentic 3-page brochure at:', outputPath);
