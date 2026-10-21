import { checkPhoto } from '../lib/photo';
const scope = self as unknown as { onmessage: (event: MessageEvent<File>) => void; postMessage: (message: unknown) => void };
scope.onmessage = async event => {
  let bitmap: ImageBitmap | undefined;
  try {
    const file = event.data; checkPhoto(file); bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * ratio), Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Préparation indisponible.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: .72 });
    const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    scope.postMessage({ result: `data:image/jpeg;base64,${btoa(binary)}` });
  } catch (error) { scope.postMessage({ error: error instanceof Error ? error.message : 'La photo ne peut pas être préparée.' }); }
  finally { bitmap?.close(); }
};
