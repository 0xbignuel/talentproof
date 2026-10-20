import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import sharp from 'sharp';
import { coverWork, serviceList, type Profile, type Work } from '../portfolio';

const colors = { ink: rgb(.07, .16, .29), blue: rgb(.19, .38, .93), muted: rgb(.43, .51, .63), pale: rgb(.94, .96, 1), line: rgb(.86, .9, .96) };
const printable = (text: string) => text.replace(/[^\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013-\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039-\u203a\u20ac\n]/g, '');
const shorten = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1)}…` : text;

export async function makePdf(p: Profile) {
  const doc = await PDFDocument.create(); const normal = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold); const serif = await doc.embedFont(StandardFonts.TimesRoman);
  doc.setTitle(`${p.name} — Portfolio professionnel`); doc.setAuthor(p.name); doc.setCreator('TalentProof');
  let page = doc.addPage([595.28, 841.89]); let y = 784; let pageNumber = 1;
  const margin = 46; const width = 503;
  function wrap(text: string, font: PDFFont, size: number, maxWidth = width) {
    const output: string[] = [];
    for (const paragraph of printable(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (font.widthOfTextAtSize(`${line} ${word}`.trim(), size) <= maxWidth) { line = `${line} ${word}`.trim(); continue; }
        if (line) output.push(line); line = '';
        for (const char of word) { if (font.widthOfTextAtSize(line + char, size) > maxWidth) { output.push(line); line = ''; } line += char; }
      }
      output.push(line);
    }
    return output;
  }
  function text(value: string, x: number, baseline: number, size = 11, font = normal, color = colors.ink) {
    page.drawText(printable(value), { x, y: baseline, size, font, color });
  }
  function footer() {
    page.drawLine({ start: { x: margin, y: 43 }, end: { x: 549, y: 43 }, thickness: .6, color: colors.line });
    text(shorten(p.name, 45), margin, 28, 8, normal, colors.muted); text('talentproof.', 448, 28, 8, bold, colors.blue); text(String(pageNumber).padStart(2, '0'), 535, 28, 8, normal, colors.muted);
  }
  function newPage(label: string) {
    footer(); page = doc.addPage([595.28, 841.89]); pageNumber++; y = 782;
    text(label.toLocaleUpperCase('fr'), margin, y, 8, bold, colors.blue); y -= 37;
  }
  function room(height: number, label = 'Mon identité professionnelle') { if (y - height < 72) newPage(label); }
  function paragraph(value: string, size = 11, font = normal, color = colors.ink, gap = 18) {
    for (const line of wrap(value, font, size)) { room(gap + 4); text(line, margin, y, size, font, color); y -= gap; }
  }
  function section(label: string) { room(70); y -= 16; text(label.toLocaleUpperCase('fr'), margin, y, 9, bold, colors.blue); y -= 26; }
  async function image(work: Work, x: number, top: number, boxWidth: number, boxHeight: number) {
    const bytes = Buffer.from(work.image.slice(work.image.indexOf(',') + 1), 'base64');
    const jpg = await sharp(bytes, { limitInputPixels: 20_000_000 }).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
    const embedded = await doc.embedJpg(jpg); const scale = Math.min(boxWidth / embedded.width, boxHeight / embedded.height);
    const w = embedded.width * scale; const h = embedded.height * scale;
    page.drawRectangle({ x, y: top - boxHeight, width: boxWidth, height: boxHeight, color: colors.pale });
    page.drawImage(embedded, { x: x + (boxWidth - w) / 2, y: top - boxHeight + (boxHeight - h) / 2, width: w, height: h });
  }

  // Cover: the chosen work and the real brand, without a fabricated testimonial or badge.
  page.drawRectangle({ x: margin, y: 804, width: 31, height: 3, color: colors.blue });
  text('PORTFOLIO PROFESSIONNEL', margin, 780, 9, bold, colors.blue);
  y = 733; paragraph(p.name, 37, serif, colors.ink, 43); y -= 2;
  if (p.tagline) { paragraph(p.tagline, 13, normal, colors.muted, 19); y -= 7; }
  paragraph(`${p.job}  ·  ${p.city}`, 11, normal, colors.muted, 17); y -= 20;
  const cover = coverWork(p);
  if (cover) {
    let height = Math.min(435, y - 139);
    if (height < 180) { newPage('L’atelier en images'); height = 435; }
    await image(cover, margin, y, width, height); y -= height + 20;
    paragraph(cover.title, 11, normal, colors.ink, 16);
  }

  newPage('L’atelier · Présentation et prestations');
  paragraph(p.owner ? `Derrière les créations, ${p.owner}.` : 'Une histoire de savoir-faire.', 28, serif, colors.ink, 34); y -= 20;
  paragraph(p.bio, 13, serif, colors.muted, 22);
  section('Mes prestations');
  for (const [index, service] of serviceList(p).entries()) { paragraph(`${String(index + 1).padStart(2, '0')}   ${service}`, 11, normal, colors.ink, 19); y -= 7; }
  section('Les informations pratiques');
  paragraph(`Mon atelier : ${p.city}`, 11, normal, colors.muted);
  if (p.availability) paragraph(`Disponibilités : ${p.availability}`, 11, normal, colors.muted);
  if (p.experience) paragraph(`Mon parcours : ${p.experience}`, 11, normal, colors.muted);
  if (p.showContact && p.phone) { section('Parlons de votre projet'); paragraph(p.phone, 20, bold, colors.blue, 26); }
  if (cover?.description) { section('L’histoire de la couverture'); paragraph(cover.title, 12, bold); y -= 5; paragraph(cover.description, 11, normal, colors.muted, 19); }
  y -= 22; paragraph('Informations et réalisations fournies par l’artisane.', 9, normal, colors.muted, 15);

  const remaining = p.works.filter(work => work.id !== cover?.id);
  if (remaining.length) {
    newPage('Une sélection de mes réalisations');
    paragraph('Le talent, en images.', 30, serif, colors.ink, 36); y -= 24;
    for (let index = 0; index < remaining.length; index += 2) {
      const row = remaining.slice(index, index + 2); const cellWidth = 240; const photoHeight = 205;
      const captions = row.map(work => ({ title: wrap(work.title, bold, 11, cellWidth), description: work.description ? wrap(work.description, normal, 10, cellWidth) : [] }));
      const rowHeight = Math.max(...captions.map(caption => photoHeight + 22 + caption.title.length * 16 + caption.description.length * 14 + 28));
      room(rowHeight, 'Mes réalisations · Suite');
      for (let column = 0; column < row.length; column++) {
        const work = row[column]; const x = margin + column * 263; await image(work, x, y, cellWidth, photoHeight);
        let captionY = y - photoHeight - 23;
        for (const line of captions[column].title) { text(line, x, captionY, 11, bold); captionY -= 16; }
        captionY -= 5;
        for (const line of captions[column].description) { text(line, x, captionY, 10, normal, colors.muted); captionY -= 14; }
      }
      y -= rowHeight;
    }
  }
  footer(); return Buffer.from(await doc.save());
}
