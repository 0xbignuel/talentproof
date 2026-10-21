const DB = 'talentproof';
const STORE = 'drafts';
let connection: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); connection = undefined; }; resolve(db); };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('Fermez les autres onglets TalentProof pour enregistrer votre brouillon.')); };
  });
  return connection;
}
export async function readDraft<T>(key: string): Promise<T | undefined> {
  if (typeof indexedDB === 'undefined') { const raw = localStorage.getItem(`talentproof-${key}`); return raw ? JSON.parse(raw) : undefined; }
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export async function saveDraft(key: string, value: unknown): Promise<void> {
  if (typeof indexedDB === 'undefined') { localStorage.setItem(`talentproof-${key}`, JSON.stringify(value)); return; }
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const transaction = db.transaction(STORE, 'readwrite'); transaction.objectStore(STORE).put(value, key); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('Enregistrement interrompu.')); });
}
