import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import nodeProcess from 'node:process';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const workspaceDir = nodeProcess.cwd();
const SKILL_DIR = 'C:/Users/psoha/.codex/plugins/cache/openai-primary-runtime/presentations/26.1009.11318/skills/presentations';
const RUNTIME_PYTHON = 'C:/Users/psoha/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const outDir = path.join(workspaceDir, 'docs', 'presentation');
const buildDir = path.join(workspaceDir, '.skillbridge-presentation-build');
const FINAL_PPTX = path.join(outDir, 'SkillBridge_Project_Showcase.pptx');
const FINAL_PDF = path.join(outDir, 'SkillBridge_Project_Showcase.pdf');
const heroPath = path.join(outDir, 'assets', 'skillbridge-hero.png');
const evidenceDir = path.join(workspaceDir, 'skillbridge_blackbox_testing', 'test_results', 'ppt_evidence');

const C = {
  bg: '#FFF8F0', paper: '#FFFCF8', ink: '#2C2A28', muted: '#6F6760',
  coral: '#E9684A', saffron: '#E59A22', teal: '#2D776D', sage: '#DAE8DE',
  line: '#E8DCCD', softCoral: '#FBE4DC', softSaffron: '#FCEED2', softTeal: '#E0F0EC', white: '#FFFFFF', red: '#B64938'
};
const FONT = 'Arial';
const W = 1280, H = 720;

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function shape(slide, geometry, x, y, w, h, fill = 'none', line = 'none', name) {
  return slide.shapes.add({ geometry, name, position: { left: x, top: y, width: w, height: h }, fill, line: line === 'none' ? { style: 'solid', fill: 'none', width: 0 } : line });
}

function text(slide, value, x, y, w, h, size = 18, color = C.ink, opts = {}) {
  const s = shape(slide, 'textbox', x, y, w, h);
  s.text = value;
  s.text.style = { fontFamily: FONT, fontSize: size, color, bold: opts.bold || false, italic: opts.italic || false, align: opts.align || 'left', valign: opts.valign || 'top', autoFit: 'shrinkText' };
  s.text.insets = opts.insets ?? 0;
  return s;
}

function rect(slide, x, y, w, h, fill = C.white, line = C.line, radius = 'rounded-xl') {
  return shape(slide, 'roundRect', x, y, w, h, fill, { style: 'solid', fill: line, width: 1 }, undefined);
}

function label(slide, value, x, y, w, color = C.coral) {
  const s = shape(slide, 'roundRect', x, y, w, 26, color, { style: 'solid', fill: color, width: 0 });
  s.borderRadius = 'rounded-full';
  s.text = value.toUpperCase();
  s.text.style = { fontFamily: FONT, fontSize: 11, bold: true, color: C.white, align: 'center', valign: 'middle', autoFit: 'shrinkText' };
  return s;
}

function addChrome(slide, title, section, n) {
  slide.background.fill = C.bg;
  shape(slide, 'rect', 0, 0, W, 11, C.coral, { style: 'solid', fill: C.coral, width: 0 });
  label(slide, section, 62, 42, Math.max(130, section.length * 7.2), C.saffron);
  text(slide, title, 62, 83, 1100, 49, 33, C.ink, { bold: true });
  shape(slide, 'line', 62, 665, 1156, 0, 'none', { style: 'solid', fill: C.line, width: 1 });
  text(slide, 'SKILLBRIDGE  /  SOFTWARE ENGINEERING AND MODELING', 62, 678, 430, 16, 10, C.muted, { bold: true });
  text(slide, String(n).padStart(2, '0'), 1164, 675, 54, 18, 12, C.coral, { bold: true, align: 'right' });
}

function addSlide(deck, title, section, n, note) {
  const slide = deck.slides.add();
  addChrome(slide, title, section, n);
  slide.speakerNotes.text = note;
  return slide;
}

function addTable(slide, values, x, y, w, h, headerFill = C.ink, firstCol = false, fontSize = 14) {
  const table = slide.tables.add({ rows: values.length, columns: values[0].length, left: x, top: y, width: w, height: h, values });
  table.styleOptions = { headerRow: true, bandedRows: true, firstColumn: firstCol };
  table.borders.assign({ style: 'solid', fill: C.line, width: 1 });
  for (let c = 0; c < values[0].length; c++) {
    const cell = table.getCell(0, c);
    cell.fill = headerFill;
    cell.text.style = { fontFamily: FONT, fontSize, color: C.white, bold: true, autoFit: 'shrinkText' };
  }
  for (let r = 1; r < values.length; r++) for (let c = 0; c < values[0].length; c++) {
    const cell = table.getCell(r, c);
    cell.fill = r % 2 ? C.paper : '#FFF5EA';
    cell.text.style = { fontFamily: FONT, fontSize, color: C.ink, autoFit: 'shrinkText' };
  }
  return table;
}

function connect(slide, a, b, from = 'right', to = 'left', dashed = false, color = C.teal) {
  return slide.shapes.connect(a, b, { kind: 'straight', fromSide: from, toSide: to, line: { style: dashed ? 'dashed' : 'solid', fill: color, width: 2 }, head: { type: 'arrow', width: 'sm', length: 'sm' } });
}

function process(slide, title, sub, x, y, w = 180, h = 70, fill = C.softTeal) {
  const s = rect(slide, x, y, w, h, fill, C.teal);
  text(slide, title, x + 10, y + 11, w - 20, 25, 16, C.ink, { bold: true, align: 'center' });
  if (sub) text(slide, sub, x + 10, y + 39, w - 20, 20, 11, C.muted, { align: 'center' });
  return s;
}

function actor(slide, title, x, y, color = C.coral) {
  const head = shape(slide, 'ellipse', x + 44, y, 30, 30, color, { style: 'solid', fill: color, width: 0 });
  const body = shape(slide, 'roundRect', x + 30, y + 34, 58, 50, color, { style: 'solid', fill: color, width: 0 });
  text(slide, title, x, y + 91, 118, 26, 13, C.ink, { bold: true, align: 'center' });
  return body;
}

function database(slide, title, x, y, w = 170) {
  const s = shape(slide, 'can', x, y, w, 54, C.paper, { style: 'solid', fill: C.teal, width: 1.3 });
  text(slide, title, x + 10, y + 17, w - 20, 20, 13, C.ink, { bold: true, align: 'center' });
  return s;
}

function noteBox(slide, heading, body, x, y, w, h, tone = C.softSaffron) {
  const b = rect(slide, x, y, w, h, tone, C.line);
  text(slide, heading, x + 16, y + 14, w - 32, 25, 16, C.ink, { bold: true });
  text(slide, body, x + 16, y + 48, w - 32, h - 58, 15, C.muted, { });
  return b;
}

function addSequence(slide, names, messages, x, y, w, h) {
  const gap = w / (names.length - 1);
  const lifelines = [];
  names.forEach((name, i) => {
    const cx = x + i * gap;
    const box = rect(slide, cx - 58, y, 116, 40, i === 0 ? C.softCoral : C.softTeal, i === 0 ? C.coral : C.teal);
    text(slide, name, cx - 52, y + 12, 104, 16, 12, C.ink, { bold: true, align: 'center' });
    const line = shape(slide, 'line', cx, y + 42, 0, h - 42, 'none', { style: 'dashed', fill: C.line, width: 1 });
    lifelines.push({ box, cx, line });
  });
  messages.forEach((m, idx) => {
    const yy = y + 76 + idx * ((h - 100) / messages.length);
    const from = lifelines[m.from]; const to = lifelines[m.to];
    const left = Math.min(from.cx, to.cx); const width = Math.abs(to.cx - from.cx);
    const ln = shape(slide, 'connector', left, yy, width, 0, 'none', { style: 'solid', fill: m.back ? C.muted : C.coral, width: 1.4 });
    ln.head = { type: m.back ? 'none' : 'arrow', width: 'sm', length: 'sm' };
    if (from.cx > to.cx) { ln.rotation = 180; }
    text(slide, m.label, left + 8, yy - 18, Math.max(100, width - 16), 16, 10, m.back ? C.muted : C.ink, { align: 'center' });
  });
}

async function build() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(buildDir, { recursive: true });
  const heroBytes = await fs.readFile(heroPath);
  const invalidLoginEvidenceBytes = await fs.readFile(path.join(evidenceDir, '01_invalid_login_execution.png'));
  const selectedSuiteEvidenceBytes = await fs.readFile(path.join(evidenceDir, '05_selected_tests_summary.png'));
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  deck.theme.colorScheme = { name: 'SkillBridge Warm Light', themeColors: { accent1: C.coral, accent2: C.saffron, accent3: C.teal, accent4: '#927052', accent5: '#6D8B7B', accent6: '#D17A5C', bg1: C.bg, bg2: C.paper, tx1: C.ink, tx2: C.muted, dk1: C.ink, dk2: C.muted, lt1: C.white, lt2: C.bg, hlink: C.teal, folHlink: C.coral } };

  // 1. Cover
  { const s = deck.slides.add(); s.background.fill = C.bg;
    s.images.add({ blob: heroBytes, contentType: 'image/png', alt: 'Illustration of students exchanging skills through a campus marketplace', fit: 'cover', position: { left: 0, top: 0, width: W, height: H } });
    shape(s, 'rect', 0, 0, 620, H, '#FFF8F0', { style: 'solid', fill: '#FFF8F0', width: 0 });
    label(s, 'ACADEMIC PROJECT SHOWCASE', 64, 62, 220, C.coral);
    text(s, 'SkillBridge', 64, 136, 510, 72, 60, C.ink, { bold: true });
    text(s, 'A verified campus marketplace for student services', 66, 221, 470, 55, 26, C.muted, { });
    shape(s, 'line', 66, 308, 190, 0, 'none', { style: 'solid', fill: C.saffron, width: 4 });
    text(s, 'Software Engineering and Modeling\nMIT World Peace University (MIT-WPU)\nComputer Science and Engineering  |  Semester V  |  2026–2027', 66, 338, 470, 90, 16, C.ink, { });
    text(s, 'Soham Patil   ·   Ganesh Gaikwad\nAditya Sardesai   ·   Tirth Gangani', 66, 505, 455, 54, 17, C.ink, { bold: true });
    text(s, 'Faculty Guide: Dr. Bhavana Tiple', 66, 586, 360, 20, 14, C.muted, { });
    text(s, '01', 1166, 677, 50, 16, 12, C.coral, { bold: true, align: 'right' });
    s.speakerNotes.text = 'Source: Local SkillBridge repository; academic details confirmed by the project team. Cover image is an original AI-generated illustration created for this deck.';
  }
  // 2
  { const s = addSlide(deck, 'The campus service gap', 'INTRODUCTION', 2, 'Repository basis: app routes, profile and service types, and project documentation.');
    text(s, 'Students have skills to offer, but campus buyers need a trusted way to discover, book, and complete services.', 62, 150, 750, 62, 25, C.ink, { bold: true });
    noteBox(s, 'Discovery is fragmented', 'Buyers may rely on informal groups or referrals to find tutoring, design, technical, or creative help.', 62, 260, 320, 220, C.softSaffron);
    noteBox(s, 'Trust needs evidence', 'The implementation adds student verification, seller role controls, order history, and transaction-backed reviews.', 430, 260, 320, 220, C.softCoral);
    noteBox(s, 'Service delivery needs structure', 'Listings, checkout, order milestones, private messaging, delivery review, and payment status are recorded in the system.', 798, 260, 320, 220, C.softTeal);
    text(s, 'SkillBridge addresses these gaps through a campus-focused web marketplace with buyer, seller, and administrator workflows.', 62, 535, 1000, 30, 19, C.muted);
  }
  // 3
  { const s = addSlide(deck, 'Development methodology', 'INTRODUCTION', 3, 'Confirmed decision: Agile Scrum. Specific sprint dates and outcomes are intentionally not claimed.');
    text(s, 'Agile Scrum supports short development cycles for a product with interconnected authentication, marketplace, payment, and governance features.', 62, 151, 1040, 34, 20, C.ink, { });
    const steps = [['1','Backlog and scope'],['2','Design and implement'],['3','Integrate and test'],['4','Review and refine']];
    steps.forEach((it,i)=>{ const x=90+i*280; const c=process(s, it[1], '', x, 285, 210, 95, i===0?C.softSaffron:i===1?C.softCoral:C.softTeal); text(s,it[0],x+85,232,40,34,24,i===1?C.coral:C.saffron,{bold:true,align:'center'}); if(i<3) shape(s,'rightArrow',x+218,318,42,22,C.saffron,{style:'solid',fill:C.saffron,width:0}); });
    text(s, 'The deck describes Agile Scrum as the selected methodology. It does not infer sprint calendars, attendance, or retrospective results.', 150, 465, 900, 34, 16, C.muted, { align:'center', italic:true });
  }
  // 4
  { const s = addSlide(deck, 'Scope and functional requirements', 'SRS', 4, 'Repository basis: app routes, types/index.ts, API routes, and service libraries.');
    addTable(s, [['Area','Verified capability'],['Common','Register, authenticate, verify email, complete profile, switch buyer or seller role'],['Buyer','Explore published listings, use search and filters, create orders, pay in test mode, message seller, approve delivery, submit review'],['Seller','Create and manage listings, configure availability, receive and progress orders, submit deliverables, view earnings'],['Administrator','Review verification requests, moderate listings and reviews, view orders, users, metrics, and audit logs']], 62, 165, 1156, 390, C.ink, true, 14);
  }
  // 5
  { const s = addSlide(deck, 'Non-functional requirements and constraints', 'SRS', 5, 'Repository basis: middleware.ts, API routes, Supabase migrations, and docs. Performance numbers are not claimed because no measured benchmark was supplied.');
    noteBox(s, 'Security controls in code', 'Supabase authentication, protected routes, server-side role checks, RLS policies, participant-only order messages, and review eligibility checks.', 62, 165, 345, 220, C.softTeal);
    noteBox(s, 'Usability and compatibility', 'Responsive Next.js interface with browser form validation, route return parameters, clear empty states, notifications, and buyer/seller workspaces.', 468, 165, 345, 220, C.softSaffron);
    noteBox(s, 'Operational constraints', 'Razorpay operates in test mode. AI search and transactional email have configuration-dependent fallbacks. No availability or response-time target is reported.', 873, 165, 345, 220, C.softCoral);
    text(s, 'Claims above describe implementation controls or explicit constraints, not measured production service levels.', 62, 445, 940, 25, 16, C.muted, { italic:true });
  }
  // 6
  { const s = addSlide(deck, 'Current capabilities and project impact', 'SRS', 6, 'Repository basis: app pages, API routes, service libraries, and project documentation. Future items are separately labelled.');
    text(s,'Implemented capabilities',62,160,300,28,21,C.ink,{bold:true});
    const impl=['Student account and verification workflow','Buyer and seller modes within one profile','Published service listings with availability','Order lifecycle, escrow-style test payments, delivery and reviews','Private order messaging and notifications','Administrative moderation and audit visibility'];
    impl.forEach((v,i)=>{ shape(s,'ellipse',75,213+i*48,18,18,C.saffron,{style:'solid',fill:C.saffron,width:0}); text(s,v,108,208+i*48,520,29,17,C.ink); });
    rect(s,718,160,430,300,C.paper,C.line); text(s,'Future work',744,187,180,25,21,C.ink,{bold:true});
    text(s,'• Live payment onboarding beyond test mode\n• Production email domain verification\n• NVIDIA key configuration for AI-enhanced rankings\n• Continued accessibility and performance testing',744,232,370,170,18,C.muted);
    text(s,'The product supports a structured peer-service exchange while preserving role boundaries and a traceable order record.',62,540,1040,28,18,C.coral,{bold:true});
  }
  // 7 DFD L0
  { const s = addSlide(deck, 'Data Flow Diagram: Level 0 context', 'SYSTEM DESIGN', 7, 'Derived from app routes, API routes, payments routes, and Supabase-backed service libraries. Level 0 deliberately shows no internal processes.');
    const buyer=actor(s,'Buyer',80,270,C.coral), seller=actor(s,'Seller',80,465,C.saffron), admin=actor(s,'Admin',1060,270,C.teal);
    const app=process(s,'0. SkillBridge','Campus service marketplace',510,300,260,115,C.softCoral);
    const rzp=process(s,'Razorpay Test Mode','Payment order and signature',945,490,220,70,C.softSaffron);
    connect(s,buyer,app,'right','left'); text(s,'search, order, review',230,300,180,18,12,C.muted,{align:'center'});
    connect(s,app,buyer,'left','right',true); text(s,'listings, status, messages',230,337,180,18,12,C.muted,{align:'center'});
    connect(s,seller,app,'right','left'); text(s,'listing, availability, delivery',240,492,210,18,12,C.muted,{align:'center'});
    connect(s,app,seller,'left','right',true); text(s,'orders, notification, earnings',240,530,210,18,12,C.muted,{align:'center'});
    connect(s,admin,app,'left','right'); text(s,'moderation and review actions',807,305,220,18,12,C.muted,{align:'center'});
    connect(s,app,rzp,'right','left'); text(s,'create order and verify signature',760,469,185,18,12,C.muted,{align:'center'});
    connect(s,rzp,app,'left','right',true); text(s,'payment result',785,548,150,18,12,C.muted,{align:'center'});
  }
  // 8 DFD L1
  { const s = addSlide(deck, 'Data Flow Diagram: Level 1 decomposition', 'SYSTEM DESIGN', 8, 'Derived from profiles, services, orders, payments, messages, reviews, verification, and admin implementation files. Data flow labels are balanced with Level 0 entities.');
    const ext1=actor(s,'Students',44,284,C.coral), ext2=actor(s,'Admin',1090,284,C.teal);
    const p1=process(s,'1.0 Identity and roles','auth, profile, verification',220,165,200,70,C.softSaffron);
    const p2=process(s,'2.0 Marketplace','listing, search, availability',500,165,200,70,C.softTeal);
    const p3=process(s,'3.0 Orders and payment','checkout, delivery, review',220,390,200,70,C.softCoral);
    const p4=process(s,'4.0 Governance','verification, moderation, audit',500,390,200,70,C.softTeal);
    const d1=database(s,'D1 Profiles and verification',830,145,215), d2=database(s,'D2 Services and availability',830,275,215), d3=database(s,'D3 Orders, payments, messages, reviews',830,405,265);
    connect(s,ext1,p1,'right','left'); connect(s,p1,p2,'right','left'); connect(s,p2,p3,'bottom','top'); connect(s,p3,p4,'right','left'); connect(s,ext2,p4,'left','right');
    connect(s,p1,d1,'right','left'); connect(s,p2,d2,'right','left'); connect(s,p3,d3,'right','left'); connect(s,p4,d1,'right','left',true); connect(s,p4,d2,'right','left',true); connect(s,p4,d3,'right','left',true);
    text(s,'registration data',99,250,104,15,10,C.muted,{align:'center'}); text(s,'role context',435,190,58,15,10,C.muted,{align:'center'}); text(s,'order request',446,315,95,15,10,C.muted,{align:'center'}); text(s,'review decisions',435,422,90,15,10,C.muted,{align:'center'});
  }
  // 9 DFD L2
  { const s = addSlide(deck, 'Data Flow Diagram: Level 2 checkout and payment verification', 'SYSTEM DESIGN', 9, 'Derived from app/api/payments/create-order/route.ts and app/api/payments/verify/route.ts. This decomposes Level 1 process 3.0 only.');
    const buyer=actor(s,'Buyer',38,300,C.coral);
    const a=process(s,'3.1 Validate buyer and listing','session, UUID, published status',190,160,190,65,C.softSaffron);
    const b=process(s,'3.2 Create payment order','server price and order record',450,160,190,65,C.softCoral);
    const c=process(s,'3.3 Verify signature','payment outcome',710,160,190,65,C.softTeal);
    const d=process(s,'3.4 Update status and notify','seller_pending and notification',970,160,205,65,C.softSaffron);
    const svc=database(s,'D2 Services',210,440,160), orders=database(s,'D3 Orders and payments',510,440,210), rzp=process(s,'Razorpay Test Mode','gateway order and signature',785,330,205,62,C.softCoral);
    connect(s,buyer,a,'right','left'); connect(s,a,b,'right','left'); connect(s,b,c,'right','left'); connect(s,c,d,'right','left'); connect(s,a,svc,'bottom','top'); connect(s,b,orders,'bottom','top'); connect(s,c,rzp,'bottom','top'); connect(s,rzp,c,'top','bottom',true); connect(s,d,orders,'bottom','right');
    text(s,'checkout request',94,290,90,16,10,C.muted,{align:'center'}); text(s,'authenticated buyer + valid listing',372,188,76,26,10,C.muted,{align:'center'}); text(s,'gateway order',646,188,60,16,10,C.muted,{align:'center'}); text(s,'verified result',905,188,56,16,10,C.muted,{align:'center'});
    text(s,'The API retrieves price and seller identity from the database; it does not accept a client-submitted amount.', 190, 560, 880, 24, 16, C.red, { italic:true, align:'center' });
  }
  // 10 Use cases
  { const s = addSlide(deck, 'Use Case Diagram', 'SYSTEM DESIGN', 10, 'Derived from implemented routes and role guards. Associations show supported interactions; no include or extend relationships are asserted.');
    const buyer=actor(s,'Buyer',55,205,C.coral), seller=actor(s,'Seller',55,430,C.saffron), admin=actor(s,'Admin',1080,320,C.teal);
    const bound=rect(s,270,150,720,400,C.paper,C.teal); text(s,'SkillBridge system boundary',292,170,250,20,13,C.teal,{bold:true});
    const cases=[['Discover services',370,225],['Checkout and track order',560,225],['Message and review',755,225],['Manage listings',410,410],['Set availability and deliver work',630,410],['Verify users and moderate platform',790,410]];
    const es=[]; cases.forEach(([name,x,y])=>{ const e=shape(s,'ellipse',x,y,180,52, name==='Verify users and moderate platform'?C.softTeal:C.softSaffron,{style:'solid',fill:C.teal,width:1}); text(s,name,x+15,y+17,150,18,13,C.ink,{bold:true,align:'center'}); es.push(e); });
    [0,1,2].forEach(i=>connect(s,buyer,es[i],'right','left',true,C.muted)); [3,4].forEach(i=>connect(s,seller,es[i],'right','left',true,C.muted)); connect(s,admin,es[5],'left','right',true,C.muted);
  }
  // 11 Buyer seq
  { const s = addSlide(deck, 'Sequence Diagram: Buyer checkout workflow', 'SYSTEM DESIGN', 11, 'Derived from payment create-order and verify routes, service and order types, and Razorpay integration.');
    addSequence(s,['Buyer','Web UI','Next.js API','Supabase','Razorpay'],[
      {from:0,to:1,label:'select published service and enter requirements'}, {from:1,to:2,label:'POST create-order'}, {from:2,to:3,label:'validate user, listing, price, seller'}, {from:2,to:4,label:'create test-mode gateway order'}, {from:4,to:2,label:'gateway order ID',back:true}, {from:2,to:3,label:'store pending order and payment'}, {from:2,to:1,label:'checkout payload',back:true}, {from:1,to:4,label:'buyer authorizes payment'}, {from:1,to:2,label:'POST verify signature'}, {from:2,to:3,label:'mark paid and seller_pending'}, {from:2,to:1,label:'order confirmation',back:true}
    ],110,170,1040,420);
    text(s,'Alternate outcome: an invalid signature records a failed payment status and returns an error response.',115,600,950,20,14,C.muted,{italic:true});
  }
  // 12 Seller seq
  { const s = addSlide(deck, 'Sequence Diagram: Seller listing and delivery workflow', 'SYSTEM DESIGN', 12, 'Derived from seller authorization, services route, order transition route, and database-backed notifications.');
    addSequence(s,['Seller','Web UI','Next.js API','Supabase','Buyer'],[
      {from:0,to:1,label:'create listing or open order'}, {from:1,to:2,label:'authenticated request'}, {from:2,to:3,label:'check seller role and persist listing'}, {from:2,to:1,label:'listing or order state',back:true}, {from:0,to:1,label:'accept order / start work / submit delivery'}, {from:1,to:2,label:'POST order transition'}, {from:2,to:3,label:'authorize seller and update state'}, {from:2,to:4,label:'create buyer notification'}, {from:2,to:1,label:'updated timeline',back:true}
    ],110,170,1040,420);
    text(s,'A seller cannot manage another provider’s service, and a buyer approval triggers completion for submitted fixed-scope work.',115,600,970,20,14,C.muted,{italic:true});
  }
  // 13 domain model
  { const s = addSlide(deck, 'Domain model', 'SYSTEM DESIGN', 13, 'Derived from types/index.ts and the latest Supabase migrations. This is a domain model, not a claim that the application uses class-based persistence.');
    const profile=process(s,'Profile','roles, verification, reputation',80,170,210,70,C.softSaffron); const service=process(s,'Service','provider, status, price',400,150,210,70,C.softTeal); const order=process(s,'Order','buyer, seller, lifecycle',730,150,210,70,C.softCoral);
    const avail=process(s,'Availability slot','provider, service, time',385,380,190,65,C.paper); const booking=process(s,'Booking','buyer, seller, session',650,380,190,65,C.paper); const payment=process(s,'Payment','order, gateway reference',980,150,190,70,C.softSaffron); const review=process(s,'Review','completed order rating',900,380,190,65,C.softTeal); const msg=process(s,'Order message','sender, receiver, content',700,510,210,65,C.paper); const verify=process(s,'Verification request','student evidence and decision',80,430,210,65,C.paper);
    connect(s,profile,service,'right','left'); connect(s,service,order,'right','left'); connect(s,order,payment,'right','left'); connect(s,service,avail,'bottom','top'); connect(s,profile,verify,'bottom','top'); connect(s,avail,booking,'right','left'); connect(s,order,booking,'bottom','top'); connect(s,order,review,'bottom','top'); connect(s,order,msg,'bottom','top');
    text(s,'1 provider : many listings',290,164,110,16,10,C.muted,{align:'center'}); text(s,'1 listing : many orders',615,164,115,16,10,C.muted,{align:'center'}); text(s,'1 order : payment',942,164,38,16,10,C.muted,{align:'center'}); text(s,'buyer / seller references',645,320,180,16,10,C.muted,{align:'center'});
  }
  // 14 activity
  { const s = addSlide(deck, 'Activity Diagram: Fixed-scope order completion', 'SYSTEM DESIGN', 14, 'Derived from the order transition state machine. The consultation path can complete from accepted or in_progress; this activity focuses on fixed-scope work.');
    const start=shape(s,'ellipse',100,185,22,22,C.ink,{style:'solid',fill:C.ink,width:0}); const a=process(s,'Select a published service','',170,160,190,48,C.softSaffron); const b=process(s,'Checkout and verify payment','',430,160,210,48,C.softCoral); const c=process(s,'Seller accepts order','',730,160,190,48,C.softTeal); const d=process(s,'Seller submits deliverable','',720,330,210,48,C.softTeal); const e=process(s,'Buyer approves completion','',430,490,210,48,C.softSaffron); const fin=shape(s,'ellipse',100,510,24,24,C.white,{style:'solid',fill:C.ink,width:3});
    // In the presentation connector API, the arrowhead sits at the first attached shape.
    // Reverse attachment order so each activity-flow arrow points at its logical destination.
    connect(s,a,start,'left','right'); connect(s,b,a,'left','right'); connect(s,c,b,'left','right'); connect(s,d,c,'top','bottom'); connect(s,e,d,'top','bottom'); connect(s,fin,e,'right','left');
    const dec=shape(s,'diamond',970,330,100,70,C.paper,{style:'solid',fill:C.coral,width:1}); text(s,'Buyer\napproves?',985,349,70,34,12,C.ink,{bold:true,align:'center'}); connect(s,dec,d,'left','right'); connect(s,e,dec,'right','bottom');
    const rev=process(s,'Revision requested','returns to seller',1010,485,175,48,C.softCoral); connect(s,rev,dec,'top','bottom'); connect(s,d,rev,'right','left'); text(s,'yes',941,408,28,16,11,C.teal,{bold:true}); text(s,'no',1068,428,28,16,11,C.coral,{bold:true});
    text(s,'Completion records the final order state and enables a transaction-backed buyer review.', 180, 595, 880, 20, 15, C.muted, {align:'center', italic:true});
  }
  // 15 FP
  { const s = addSlide(deck, 'Functional size estimation', 'ESTIMATION', 15, 'Academic estimate derived from verified repository functionality. Function Point counts and low-complexity weights are stated assumptions, not measured production metrics.');
    text(s,'Function Point estimate based on the implemented marketplace scope',62,150,760,24,19,C.ink,{bold:true});
    addTable(s,[['Type','Count','Weight','UFP','Representative functions'],['EI',7,3,21,'registration, verification, listing, availability, checkout, order action, review'],['EO',6,4,24,'search results, dashboards, confirmations, notifications, rating output'],['EQ',4,3,12,'catalog, profile, order, and message queries'],['ILF',8,7,56,'profiles, services, availability, bookings, orders, payments, reviews, notifications'],['EIF',2,5,10,'Razorpay and NVIDIA integration interfaces'],['Total','','',123,'Unadjusted Function Points']],62,190,1156,300,C.ink,true,13);
    text(s,'UFP = 123. Assumed General System Characteristics total = 35. VAF = 0.65 + (0.01 × 35) = 1.00. Adjusted FP = 123 × 1.00 = 123.',62,530,1140,30,16,C.coral,{bold:true});
    text(s,'EI: External Input  |  EO: External Output  |  EQ: External Inquiry  |  ILF: Internal Logical File  |  EIF: External Interface File',62,580,1140,18,13,C.muted,{italic:true});
  }
  // 16 COCOMO
  { const s = addSlide(deck, 'FP-to-KLOC conversion and Basic COCOMO', 'ESTIMATION', 16, 'Academic estimate. Assumption: 53 LOC/FP for the TypeScript and JavaScript Next.js codebase. Basic COCOMO organic-mode formula used as a theoretical baseline.');
    const a=noteBox(s,'Functional size','123 adjusted FP',65,180,260,120,C.softSaffron); const b=noteBox(s,'Conversion assumption','123 × 53 LOC/FP = 6,519 LOC = 6.52 KLOC',365,180,310,120,C.softTeal); const c=noteBox(s,'COCOMO mode','Basic COCOMO, organic mode',715,180,250,120,C.softCoral);
    addTable(s,[['Measure','Formula','Estimated result'],['Effort','E = 2.4 × KLOC^1.05','17.3 person-months'],['Duration','T = 2.5 × E^0.38','7.4 months'],['Average staff','P = E / T','2.3 persons']],65,370,900,170,C.ink,true,15);
    text(s,'This calculation estimates relative effort from functional size. It does not report actual team effort or project duration.',65,585,1010,24,15,C.muted,{italic:true});
  }
  // 17 planning
  { const s = addSlide(deck, 'Approximate project plan and proposed responsibilities', 'PLANNING', 17, 'Confirmed decision: responsibilities may be proposed only, and undocumented dates must not be presented as historical facts.');
    addTable(s,[['Phase','Indicative focus','Status label'],['1. Scope','requirements, roles, data model, and user journeys','approximate'],['2. Build','frontend flows, API routes, Supabase schema, integrations','approximate'],['3. Integrate','orders, payments, messages, reviews, admin workflows','approximate'],['4. Validate','Selenium black-box evidence, documentation, presentation','approximate']],62,165,700,300,C.ink,true,14);
    rect(s,810,165,408,300,C.paper,C.line); text(s,'Proposed allocation',834,188,250,26,21,C.ink,{bold:true});
    text(s,'Soham Patil — frontend and integration\nGanesh Gaikwad — backend and data model\nAditya Sardesai — testing and documentation\nTirth Gangani — UX, testing, and presentation support',834,236,345,142,16,C.ink);
    text(s,'To be confirmed by the team. This slide does not claim historical individual ownership.',834,405,340,35,13,C.red,{italic:true});
  }
  // 18 strategy
  { const s = addSlide(deck, 'Testing strategy and environment', 'TESTING', 18, 'Source: skillbridge_blackbox_testing/reports/ppt_testing_evidence/SkillBridge_BlackBox_Testing_Evidence.md and junit_report.xml.');
    noteBox(s,'Method', 'Automated black-box functional testing. The test suite observes browser behavior, form constraints, toasts, routing, and visible state changes.',62,165,350,210,C.softSaffron);
    noteBox(s,'Tooling', 'Selenium WebDriver 4.51.0, pytest 9.1.1, Chrome 154 headless mode, and a local Next.js target backed by remote Supabase services.',465,165,350,210,C.softTeal);
    noteBox(s,'Techniques', 'Equivalence partitioning, decision-table testing, state-transition testing, use-case testing, boundary-value analysis, and error guessing.',868,165,350,210,C.softCoral);
    text(s,'Execution evidence separates the initial full-suite baseline from a focused selected-test rerun.',62,440,1000,26,18,C.ink,{bold:true});
  }
  // 19 scope limit
  { const s = addSlide(deck, 'White-box testing scope and evidence limit', 'TESTING', 19, 'Source: repository test artifacts. No executable code-coverage report or white-box execution record was found in the supplied evidence.');
    text(s,'The available evidence supports browser-driven black-box testing. The presentation therefore does not claim measured white-box coverage.',62,160,1040,40,23,C.ink,{bold:true});
    noteBox(s,'What the repository provides', 'TypeScript application code, SQL migrations, test scripts, and Selenium tests. These support code inspection and traceability.',62,270,335,185,C.softTeal);
    noteBox(s,'What is not claimed', 'No verified line, branch, path, or mutation coverage result. No synthetic coverage percentage is added.',472,270,335,185,C.softCoral);
    noteBox(s,'Academic next step', 'Add a unit or integration test runner with coverage instrumentation, then report measured coverage separately from browser tests.',882,270,335,185,C.softSaffron);
  }
  // 20 EP
  { const s = addSlide(deck, 'Black-box testing: Equivalence Partitioning', 'TESTING', 20, 'Source: SkillBridge_PPT_Test_Cases.csv and authentic selected execution report.');
    addTable(s,[['ID','Input class','Expected observable result','Selected rerun'],['BB-EP-02','Valid email syntax + incorrect password','Credential error; remains on login page','PASS'],['BB-EP-04','Blank mandatory email','Browser blocks submission','PASS'],['BB-EP-07','Mismatched registration passwords','Mismatch message; remains on register page','PASS']],62,175,1156,260,C.ink,true,15);
    text(s,'The selected rerun verified representative valid and invalid input partitions. It does not replace the initial 39-test baseline.',62,490,1100,26,16,C.muted,{italic:true});
  }
  // 21 decision
  { const s = addSlide(deck, 'Black-box testing: Decision Table', 'TESTING', 21, 'Source: selected test evidence and middleware.ts.');
    addTable(s,[['Condition / action','Rule 1','Rule 2','Rule 3'],['Access target','/services/create','/services/create','/admin'],['Active session token','No','Yes','No'],['Required role','Seller','Seller','Administrator'],['Expected result','Redirect to login with returnUrl','Permit route evaluation','Redirect to login with returnUrl'],['Evidence','BB-DT-06 PASS','Role guard requires session and seller authorization','BB-EG-06 screenshot in suite']],62,170,1156,320,C.ink,true,15);
    text(s,'Decision-table cases model observable routing and role-entry conditions. Server API authorization adds a second boundary behind the UI route guard.',62,545,1080,22,15,C.muted,{italic:true});
  }
  // 22 state
  { const s = addSlide(deck, 'Black-box testing: State transitions', 'TESTING', 22, 'Source: selected testing evidence and middleware.ts.');
    const landing=process(s,'S0 Landing','/',110,295,160,65,C.softSaffron); const login=process(s,'S1 Login','/login',390,295,160,65,C.softCoral); const guard=process(s,'S2 Auth Gate','returnUrl retained',670,295,180,65,C.softTeal); const seller=process(s,'S3 Seller Workspace','authorized session',970,295,180,65,C.softSaffron);
    connect(s,landing,login); connect(s,login,guard); connect(s,guard,seller); text(s,'Log in click\nBB-ST-01 PASS',272,266,110,35,12,C.muted,{align:'center'}); text(s,'direct protected route\nBB-ST-03 PASS',556,266,120,35,12,C.muted,{align:'center'}); text(s,'authenticate + seller role',850,266,112,35,12,C.muted,{align:'center'});
    text(s,'Observed transition evidence confirms Landing → Login and unauthenticated Seller Route → Auth Gate. The last transition is shown as an implemented role-gated workflow rather than a selected-rerun claim.',100,470,1050,44,16,C.muted,{align:'center',italic:true});
  }
  // 23 UC/BVA
  { const s = addSlide(deck, 'Black-box testing: Use cases and boundary values', 'TESTING', 23, 'Source: SkillBridge_PPT_Test_Cases.csv and selected test execution report.');
    addTable(s,[['ID','Technique','Scenario','Expected result','Selected rerun'],['BB-UC-04','Use case','Guest opens seller service-creation URL','Authentication gate protects seller workflow','PASS'],['BB-BVA-01','Boundary value','Registration password at 5 characters','Minimum length validation blocks submission','PASS'],['BB-BVA-02','Boundary value','Registration password at 6 characters','No minimum-length rejection','PASS']],62,175,1156,270,C.ink,true,15);
    text(s,'The BVA cases prove adjacent values around the configured six-character client-side threshold. They do not establish server-side password policy coverage.',62,505,1070,28,15,C.muted,{italic:true});
  }
  // 24 results
  { const s = addSlide(deck, 'Test execution results', 'TESTING', 24, 'Source: junit_report.xml and SkillBridge_BlackBox_Testing_Evidence.md. Full baseline: 39 tests, 22 passed, 17 failed. Selected rerun: 9/9 passed.');
    text(s,'Initial full-suite baseline',62,160,310,25,22,C.ink,{bold:true});
    const stats=[['39','Total tests',C.softSaffron],['22','Passed',C.softTeal],['17','Failed / assertion discrepancies',C.softCoral]]; stats.forEach((d,i)=>{ const x=62+i*270; rect(s,x,215,230,125,d[2],C.line); text(s,d[0],x+18,238,195,45,38,C.ink,{bold:true,align:'center'}); text(s,d[1],x+16,300,198,26,14,C.muted,{align:'center'}); });
    text(s,'Focused selected rerun',62,405,310,25,22,C.ink,{bold:true});
    rect(s,62,452,500,100,C.paper,C.teal); text(s,'9 / 9 passed',88,470,210,38,30,C.teal,{bold:true}); text(s,'Representative Selenium cases executed in 18.42 seconds',300,477,235,30,15,C.muted,{align:'center'});
    noteBox(s,'Interpretation', 'The 17 baseline failures require triage. The supplied evidence identifies route-protection assumptions as one cause; failures must not be treated automatically as product defects.', 815, 207, 360, 260, C.softSaffron);
  }
  // 25 evidence
  { const s = addSlide(deck, 'Authentic Selenium execution evidence', 'TESTING', 25, 'Source images: skillbridge_blackbox_testing/test_results/ppt_evidence/01_invalid_login_execution.png and 05_selected_tests_summary.png.');
    s.images.add({ blob: invalidLoginEvidenceBytes, contentType: 'image/png', alt:'Terminal evidence for invalid login test', fit:'contain', position:{left:62,top:175,width:535,height:350}, geometry:'roundRect', borderRadius:'rounded-xl' });
    s.images.add({ blob: selectedSuiteEvidenceBytes, contentType: 'image/png', alt:'Terminal evidence for selected pytest suite', fit:'contain', position:{left:650,top:175,width:535,height:350}, geometry:'roundRect', borderRadius:'rounded-xl' });
    text(s,'Left: invalid credential handling  |  Right: selected 9-case Selenium rerun',62,560,1120,22,15,C.muted,{align:'center',italic:true});
  }
  // 26 conclusion
  { const s = addSlide(deck, 'Conclusion', 'CONCLUSION', 26, 'Repository basis: implementation, migrations, and authentic testing evidence.');
    text(s,'SkillBridge delivers a verified campus marketplace with traceable buyer, seller, and administrator workflows.',62,160,1080,34,24,C.ink,{bold:true});
    const bullets=[['Implemented','Profiles and verification, service listings, availability, orders, test-mode payments, messaging, delivery, reviews, and moderation.'],['Testing evidence','An initial Selenium baseline recorded 22 passes and 17 failures across 39 cases. A focused 9-case rerun passed.'],['Limitations','Razorpay remains in test mode. AI search and email integrations depend on configuration. Full-suite failures need separate triage.'],['Next steps','Resolve failed cases, collect code-coverage evidence, validate production configuration, and confirm individual project responsibilities.']];
    bullets.forEach((b,i)=>{ const y=245+i*75; shape(s,'ellipse',72,y+8,18,18,[C.coral,C.saffron,C.teal,C.coral][i],{style:'solid',fill:[C.coral,C.saffron,C.teal,C.coral][i],width:0}); text(s,b[0],106,y,175,24,17,C.ink,{bold:true}); text(s,b[1],280,y,830,42,16,C.muted); });
  }
  // 27
  { const s = deck.slides.add(); s.background.fill=C.bg; shape(s,'rect',0,0,W,11,C.coral,{style:'solid',fill:C.coral,width:0});
    text(s,'Questions?',70,165,560,70,60,C.ink,{bold:true}); text(s,'Thank you',74,250,340,38,28,C.coral,{bold:true});
    text(s,'SkillBridge\nA verified campus marketplace for student services',74,345,470,66,20,C.muted);
    s.images.add({ blob: heroBytes, contentType: 'image/png', alt:'SkillBridge marketplace illustration', fit:'cover', position:{left:675,top:105,width:520,height:470}, geometry:'roundRect', borderRadius:'rounded-3xl' });
    text(s,'MIT World Peace University  |  Software Engineering and Modeling',70,660,720,18,12,C.muted,{bold:true}); text(s,'27',1166,675,50,16,12,C.coral,{bold:true,align:'right'});
    s.speakerNotes.text='Closing slide. Cover image is an original AI-generated illustration created for this deck.';
  }

  console.log('slides-created', deck.slides.items.length);
  console.log('rendering-montage');
  const montage = await deck.render({ montage: { columns: 5, slideWidth: 250, padding: 12, gap: 12, background: '#FFFFFF' } });
  await writeBlob(path.join(buildDir, 'skillbridge-montage.png'), montage);
  console.log('rendering-slides');
  const previews = await deck.render();
  for (let i=0;i<previews.length;i++) await writeBlob(path.join(buildDir, `slide-${String(i+1).padStart(2,'0')}.png`), previews[i]);
  console.log('exporting-pptx');
  const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools', 'artifact_tool_utils.mjs')).href);
  const candidatePath = path.join(buildDir, 'candidate.pptx');
  await (await PresentationFile.exportPptx(deck)).save(candidatePath);
  console.log('finalizing');
  const result = await finalizePresentation({
    explicitTotalSlideCount: 27,
    requiredNativeTableOwnerSlides: [4,15,16,17,20,21,23],
    workspaceDir,
    candidatePath,
    finalPath: FINAL_PPTX,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, 'container_tools', 'inspect_presentation_package_integrity.py'),
    layoutValidatorPath: path.join(SKILL_DIR, 'container_tools', 'inspect_presentation_layout_geometry.py'),
    layoutArgs: ['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','4','--require-native-table-slide','15','--require-native-table-slide','16','--require-native-table-slide','17','--require-native-table-slide','20','--require-native-table-slide','21','--require-native-table-slide','23'],
    // Artifact Tool emits the installed Aptos family for this deck's text defaults.
    fontPolicy: { basis:'design', families:['Aptos'] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(buildDir, 'SkillBridge_Project_Showcase.validation.json'),
  });
  await writeBlob(FINAL_PDF, await deck.export({ format:'pdf' }));
  console.log('writing-results');
  await fs.writeFile(path.join(buildDir,'finalizer-result.json'), JSON.stringify(result,null,2));
}

build().catch((err)=>{ console.error(err); nodeProcess.exitCode=1; });
