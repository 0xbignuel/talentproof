import { localPdf } from '../lib/local-pdf';
import type { Profile } from '../lib/portfolio';
const scope = self as unknown as { onmessage: (event: MessageEvent<Profile>) => void; postMessage: (value: unknown, transfer?: Transferable[]) => void };
scope.onmessage = async event => {
  try { const bytes = await localPdf(event.data); const buffer = new Uint8Array(bytes).buffer; scope.postMessage({ result: buffer }, [buffer]); }
  catch (error) { scope.postMessage({ error: error instanceof Error ? error.message : 'Le PDF ne peut pas être préparé.' }); }
};
