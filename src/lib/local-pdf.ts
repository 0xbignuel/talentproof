import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { coverWork, serviceList, type Profile } from './portfolio';
const printable = (text: string) => text.replace(/[^\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac\n]/g, '');
export async function localPdf(p: Profile): Promise<Uint8Array> {
  if (!p.validated || !p.name.trim() || !p.bio.trim() || !p.works.length) throw new Error('Vérifiez et validez votre présentation avant de créer le PDF.');
  const doc = await PDFDocument.create(); const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold); const serif = await doc.embedFont(StandardFonts.TimesRoman);
  doc.setTitle(`${p.name} — Portfolio`); doc.setAuthor(p.name);
  let page = doc.addPage([595, 842]); let y = 780; const ink = rgb(.08, .17, .33); const blue = rgb(.19, .38, .93); const muted = rgb(.42, .5, .63);
  function footer() { page.drawLine({ start: { x: 46, y: 45 }, end: { x: 549, y: 45 }, color: rgb(.88, .92, .98), thickness: .6 }); page.drawText('talentproof.  ·  Informations fournies par l’artisane.', { x: 46, y: 28, size: 8, font, color: muted }); }
  function next() { footer(); page = doc.addPage([595, 842]); y = 780; }
  function paragraph(value: string, size = 12, selected: PDFFont = font, color = ink) {
    const gap = size * 1.55;
    for (const part of printable(value).split('\n')) {
      let line = '';
      const draw = () => { if (y < 75) next(); page.drawText(line, { x: 46, y, size, font: selected, color }); y -= gap; line = ''; };
      for (const word of part.split(/\s+/).filter(Boolean)) {
        if (selected.widthOfTextAtSize(`${line} ${word}`.trim(), size) <= 503) { line = `${line} ${word}`.trim(); continue; }
        if (line) draw();
        for (const char of word) { if (selected.widthOfTextAtSize(line + char, size) > 503) draw(); line += char; }
      }
      draw();
    }
  }
  async function photo(image: string, height: number) {
    const bytes = Uint8Array.from(atob(image.slice(image.indexOf(',') + 1)), char => char.charCodeAt(0));
    const embedded = image.startsWith('data:image/png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const ratio = Math.min(503 / embedded.width, height / embedded.height); const width = embedded.width * ratio; const h = embedded.height * ratio;
    page.drawRectangle({ x: 46, y: y - height, width: 503, height, color: rgb(.94, .96, 1) });
    page.drawImage(embedded, { x: 46 + (503 - width) / 2, y: y - height + (height - h) / 2, width, height: h }); y -= height + 20;
  }
  paragraph('PORTFOLIO PROFESSIONNEL', 9, bold, blue); y -= 22; paragraph(p.name, 34, serif); y -= 8;
  if (p.tagline) paragraph(p.tagline, 13, font, muted);
  paragraph(`${p.job} · ${p.city}`, 11, font, muted); y -= 20;
  const cover = coverWork(p);
  if (cover) { if (y < 350) next(); await photo(cover.image, Math.min(430, y - 140)); paragraph(cover.title, 11, font, muted); }
  next(); paragraph('MON ATELIER', 9, bold, blue); y -= 18; paragraph(p.bio, 14, serif, muted); y -= 20;
  paragraph('MES PRESTATIONS', 9, bold, blue); y -= 10;
  for (const [i, service] of serviceList(p).entries()) { paragraph(`${i + 1}. ${service}`); y -= 6; }
  y -= 18; paragraph(`Localisation : ${p.city}`, 11, font, muted);
  if (p.availability) paragraph(`Disponibilités : ${p.availability}`, 11, font, muted);
  if (p.experience) paragraph(`Mon parcours : ${p.experience}`, 11, font, muted);
  if (p.showContact && p.phone) { y -= 15; paragraph(`Contact : ${p.phone}`, 16, bold, blue); }
  for (const work of p.works) { next(); paragraph('MES RÉALISATIONS', 9, bold, blue); y -= 15; await photo(work.image, 420); paragraph(work.title, 20, serif); if (work.description) { y -= 8; paragraph(work.description, 12, font, muted); } }
  footer(); return doc.save();
}
