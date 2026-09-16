// Run with the bundled Node runtime after loading workspace dependencies.
// RUNTIME_PACKAGES and PRESENTATIONS_SKILL may override the local defaults.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd();
const runtime = process.env.RUNTIME_PACKAGES || '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
process.env.RUNTIME_NODE_MODULES = runtime;
const skill = process.env.PRESENTATIONS_SKILL || '/Users/shivamgupta/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const python = process.env.RUNTIME_PYTHON || '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const req = createRequire(path.join(runtime, 'package.json'));
const { GlobalFonts } = req('@napi-rs/canvas');
GlobalFonts.registerFromPath(path.join(root, 'node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'), 'DM Sans');
GlobalFonts.registerFromPath(path.join(root, 'node_modules/@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'), 'DM Sans');
GlobalFonts.registerFromPath(path.join(root, 'node_modules/@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf'), 'Fraunces');
const { Presentation, PresentationFile, FileBlob } = await import(path.join(runtime, '@oai/artifact-tool/dist/artifact_tool.mjs'));
const { finalizePresentation } = await import(path.join(skill, 'container_tools/artifact_tool_utils.mjs'));
const tmp = path.join(root, '.codex-finalizer/submission');
const output = path.join(root, 'artifacts/submission');
await fs.mkdir(tmp, { recursive: true });
await fs.mkdir(output, { recursive: true });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const C = { paper: '#F8F7F3', ink: '#252638', violet: '#5753A3', soft: '#E8E6F1', muted: '#696978', line: '#D8D6DE', white: '#FFFFFF' };
function text(slide, value, x, y, w, h, size = 26, options = {}) {
  const s = slide.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { fill: 'none', width: 0 } });
  s.text = value;
  s.text.style = { typeface: 'DM Sans', fontSize: size, color: C.ink, autoFit: 'none', insets: { left: 0, right: 0, top: 0, bottom: 0 }, ...options };
  return s;
}
function box(slide, x, y, w, h, fill, stroke = 'none') {
  return slide.shapes.add({ geometry: 'rect', position: { left: x, top: y, width: w, height: h }, fill, line: { fill: stroke, width: stroke === 'none' ? 0 : 1 } });
}
function base(n, dark = false) {
  const s = p.slides.add(); s.background.fill = dark ? C.violet : C.paper;
  text(s, 'UNPAUSE', 66, 37, 180, 26, 17, { bold: true, color: dark ? C.white : C.violet });
  text(s, String(n).padStart(2, '0'), 1160, 658, 54, 24, 15, { color: dark ? '#D9D7F0' : C.muted, alignment: 'right' });
  return s;
}
function title(s, value, subtitle) {
  text(s, value, 66, 103, 1148, 120, 54, { typeface: 'Georgia' });
  if (subtitle) text(s, subtitle, 68, 226, 1090, 62, 26, { color: C.muted });
}
function notes(s, value) { s.speakerNotes.textFrame.setText(value); }

// 1. Minimal cover. The glyph echoes the pause/resume idea without a stock image.
{
  const s = base(1, true);
  box(s, 1006, 119, 18, 77, '#DAD7F0');
  box(s, 1040, 119, 18, 77, '#DAD7F0');
  s.shapes.add({ geometry: 'triangle', position: { left: 1090, top: 119, width: 77, height: 77, rotation: 90 }, fill: '#DAD7F0', line: { fill: 'none', width: 0 } });
  text(s, 'Unpause', 64, 217, 1000, 140, 116, { typeface: 'Georgia', color: C.white });
  text(s, 'Leave yourself a way back.', 69, 383, 1070, 70, 43, { color: C.white });
  text(s, 'A pocket handoff for unfinished hobbies', 70, 474, 1000, 45, 26, { color: '#E4E1F4' });
  text(s, 'Shivam Gupta · Creator', 70, 624, 850, 34, 22, { color: C.white });
  notes(s, 'Unpause pitch. Creator: Shivam Gupta. Product and pricing hypothesis, September 2026. Live web app: https://unpause-studio.web.app . Public Android emulator demo: https://www.youtube.com/watch?v=jXpOlvDShRY . No qualifying public store release, customer traction, or verified paid conversion is claimed.');
}
// 2. Pain made concrete, with honest qualitative evidence.
{
  const s = base(2);
  title(s, 'The project is waiting.\nYour context is missing.');
  text(s, '10', 67, 317, 345, 168, 150, { typeface: 'Georgia', color: C.violet });
  text(s, 'minutes free', 76, 504, 300, 45, 29);
  text(s, 'Where did I stop?\nWhat was the next step?\nWhere did I put the materials?', 488, 321, 710, 180, 36, { lineSpacing: 1.25 });
  text(s, 'Initial audience: makers with several unfinished physical projects.', 69, 600, 1120, 40, 23, { color: C.muted });
  notes(s, 'Illustrative ten-minute scenario, not a measured time-saved claim. First-person sewing discussions describe forgetting construction plans and storing projects with next-step notes. Qualitative desk research only. Sources: https://www.reddit.com/r/sewing/comments/1u4dxvf/who_fizzles_out_before_finishing_a_sewing_project/ and https://www.reddit.com/r/SewingForBeginners/comments/1u5yaxe/do_yall_ever_abandon_projects/');
}
// 3. Editable concept handoff, explicitly an illustration rather than a screenshot.
{
  const s = base(3);
  text(s, 'The handoff', 66, 111, 520, 90, 59, { typeface: 'Georgia' });
  text(s, 'One small action.\nEnough context to begin.', 70, 232, 480, 140, 35, { lineSpacing: 1.16 });
  text(s, 'Save it before you stop.\nFind it when you return.', 70, 432, 420, 100, 27, { color: C.muted });
  box(s, 606, 108, 606, 494, C.white, C.line);
  box(s, 606, 108, 8, 494, C.violet);
  text(s, 'The Sunday tote', 644, 143, 510, 58, 37, { typeface: 'Georgia' });
  text(s, 'WHERE YOU STOPPED', 647, 223, 500, 25, 15, { bold: true, color: C.muted });
  text(s, 'Body sewn. Straps pressed.', 647, 257, 500, 52, 27);
  text(s, 'YOUR NEXT TINY STEP', 647, 328, 500, 25, 15, { bold: true, color: C.violet });
  text(s, 'Pin the two straps.\nThe blue pins mark the front.', 647, 363, 500, 99, 29);
  text(s, 'MATERIALS', 647, 485, 500, 25, 15, { bold: true, color: C.muted });
  text(s, 'Canvas basket beside the machine.', 647, 523, 495, 57, 24);
  text(s, 'Illustrative resume card', 647, 624, 500, 26, 16, { color: C.muted });
  notes(s, 'Editable concept illustration, not a screenshot. Example reflects seeded Sunday tote project. Actual product includes optional photos. No claim that this exact card is the final UI.');
}
// 4. Editable process diagram.
{
  const s = base(4); title(s, 'A ten-minute return', 'The complete loop is the product.');
  const steps = [
    ['01', 'Choose your window', '10, 25, or 45 minutes.\nPick your energy.'],
    ['02', 'Read your handoff', 'The next action and\nmaterials are together.'],
    ['03', 'Make a little', 'Start a quiet session.\nStop when you need to.'],
    ['04', 'Leave a way back', 'Save a new checkpoint\nor finish the project.'],
  ];
  for (let i = 0; i < steps.length; i++) {
    const x = 70 + i * 304;
    text(s, steps[i][0], x, 326, 210, 73, 59, { typeface: 'Georgia', color: C.violet });
    box(s, x, 425, 260, 2, C.line);
    text(s, steps[i][1], x, 452, 274, 72, 27, { bold: true });
    text(s, steps[i][2], x, 540, 274, 84, 22, { color: C.muted });
  }
  notes(s, 'Product mechanics: suggestProjects filters by next-step duration and energy, excludes finished projects, and ranks blockers after ready work. Checkpoint history stores context and cumulative session minutes. The core browser and native emulator loop is verified. Current automated checks: 101 unit tests and 30 desktop/mobile browser scenarios. Final physical-device behavior remains a release check.');
}
// 5. Honest competitive comparison as an editable native table.
{
  const s = base(5); title(s, 'A focused place in a real market');
  const values = [['Alternative', 'What it emphasizes'], ['Notes / paper', 'Flexible capture, organized by the maker'], ['Krafio / Purlsy', 'Craft projects and progress journals'], ['Tapcord', 'Physical tags and a project’s history'], ['Unpause', 'Available time + next-action handoff']];
  const table = s.tables.add({ rows: 5, columns: 2, left: 70, top: 237, width: 1138, height: 313, columnWidths: [350, 788], values });
  table.borders.assign({ fill: C.line, width: 1, style: 'solid' });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
    const cell = table.getCell(r, c); cell.fill = r === 0 ? C.violet : r === 4 ? C.soft : C.paper;
    cell.text.style = { typeface: 'DM Sans', fontSize: r === 0 ? 23 : 25, bold: r === 0 || r === 4, color: r === 0 ? C.white : C.ink };
  }
  text(s, 'Our bet: an easier return ritual.\nNext test: real projects, real return visits, compared with Notes.', 72, 579, 1135, 68, 24, { color: C.muted });
  notes(s, 'Competitor features from official websites, checked September 16, 2026: https://www.krafio.app/?lang=en ; https://purlsy.com/ ; https://tapcord.app/for/crafts . Notes/paper description is an ordinary product comparison. This is not an exhaustive competitive map. No customer validation, unique-invention claim, or durable moat is asserted.');
}
// 6. Pricing and arithmetic, explicitly hypotheses.
{
  const s = base(6); title(s, 'A simple paid upgrade', 'Proposed launch pricing. Willingness to pay is still untested.');
  text(s, '3', 70, 319, 420, 120, 99, { typeface: 'Georgia', color: C.violet });
  text(s, 'unfinished projects free', 75, 459, 480, 49, 29);
  text(s, '$19.99', 664, 319, 520, 120, 99, { typeface: 'Georgia', color: C.violet });
  text(s, 'Studio, once', 673, 459, 480, 49, 29);
  text(s, 'History, reminders, and backups stay free.', 73, 537, 1114, 35, 24, { color: C.muted });
  text(s, '1,000 purchases = $19,990 gross sales, before fees and costs.\nIllustration only. Local storage avoids per-session AI costs.', 73, 597, 1114, 58, 20, { color: C.muted });
  notes(s, 'US $19.99 is a proposed lifetime price, not a live configured offering or revenue result. Free allows 3 unfinished projects. Studio removes the paid-plan active-project allowance, subject to technical storage/import limits. 1,000 × 19.99 = 19,990 gross one-time sales, not ARR, profit, or a forecast. Costs include store charges, refunds, taxes, support, and RevenueCat charges where applicable. Restore and entitlement flows need real configured purchase testing. See docs/business.md.');
}
// 7. Transparent release status and useful validation.
{
  const s = base(7); title(s, 'Live web app. Native preview.');
  text(s, 'VERIFIED TODAY', 71, 245, 520, 35, 18, { bold: true, color: C.violet });
  text(s, 'Live web app + Android preview\nFirebase account lifecycle\n101 unit + 30 browser tests\nLocal projects + portable backups', 71, 299, 535, 222, 27, { lineSpacing: 1.25 });
  text(s, 'RELEASE GATES', 680, 245, 520, 35, 18, { bold: true, color: C.violet });
  text(s, 'Live RevenueCat purchases\nPurchase-data deletion backend\nPhysical Galaxy verification\nSigned release + store approval', 680, 299, 535, 222, 27, { lineSpacing: 1.25 });
  text(s, 'Try: https://unpause-studio.web.app', 72, 563, 1128, 38, 25, { color: C.violet });
  text(s, 'Watch: https://www.youtube.com/watch?v=jXpOlvDShRY', 72, 610, 1128, 38, 23, { color: C.violet });
  notes(s, 'Status snapshot September 16, 2026. The public web app is live at https://unpause-studio.web.app . Public narrated Android emulator demo: https://www.youtube.com/watch?v=jXpOlvDShRY . Real hosted Firebase signup, reload persistence, sign-out, sign-in, account deletion, and rejection after deletion passed. Local projects survive account deletion. Firebase is primary, with Supabase a configurable fallback. Accounts do not synchronize projects. 101 unit tests and 30 browser scenarios pass. Android preview exists. iOS source and bundle configuration are prepared but no compiled iOS binary is claimed. Native physical-device auth persistence and password-reset email delivery still need acceptance evidence. No customer traction claimed. Galaxy publication requires real account approval, physical-device billing test, purchase-profile deletion backend, and public store release. Official event rules: https://revenuecat-shipaton-2026.devpost.com/rules . Release gates documented in docs/release/launch-checklist.md.');
}
const candidate = path.join(tmp, 'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
for (let i = 0; i < p.slides.items.length; i++) {
  const slide = p.slides.items[i];
  const preview = await p.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(tmp, `slide-${i + 1}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const final = path.join(output, process.env.OUTPUT_PPTX || 'Unpause-pitch-final.pptx');
const result = await finalizePresentation({
  workspaceDir: root, candidatePath: candidate, finalPath: final, pythonExecutable: python,
  explicitTotalSlideCount: 7, requiredNativeTableOwnerSlides: [5],
  integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit', '--require-native-table-slide', '5'],
  fontPolicy: { basis: 'design', families: ['DM Sans', 'Georgia'] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(tmp, `${path.basename(final)}.validation.json`),
});
const verified = await PresentationFile.importPptx(await FileBlob.load(final));
for (let i = 0; i < verified.slides.items.length; i++) {
  const preview = await verified.export({ slide: verified.slides.items[i], format: 'png', scale: 1 });
  await fs.writeFile(path.join(tmp, `final-slide-${i + 1}.png`), new Uint8Array(await preview.arrayBuffer()));
}
console.log(JSON.stringify(result, null, 2));
