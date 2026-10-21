export function checkPhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choisissez une photo JPG, PNG ou WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Cette photo est trop lourde (8 Mo maximum).');
}
export async function photoOnMainThread(file: File): Promise<string> {
  checkPhoto(file);
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Cette photo ne peut pas être ouverte. Essayez une autre image.')); img.src = url; });
    const ratio = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
    const context = canvas.getContext('2d'); if (!context) throw new Error('La préparation de cette photo est indisponible.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/jpeg', .72);
  } finally { URL.revokeObjectURL(url); }
}
