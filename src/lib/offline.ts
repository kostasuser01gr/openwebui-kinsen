// IndexedDB-based offline cache for knowledge notes
// Allows degraded offline query answering

const DB_NAME = 'kinsen-offline';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';
const STORE_META = 'meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface CachedNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export async function cacheKnowledge(notes: CachedNote[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_NOTES, STORE_META], 'readwrite');
  const store = tx.objectStore(STORE_NOTES);
  const metaStore = tx.objectStore(STORE_META);

  // Clear old notes
  store.clear();
  for (const note of notes) {
    store.put(note);
  }
  metaStore.put({ key: 'lastSync', value: new Date().toISOString() });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedNotes(): Promise<CachedNote[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NOTES, 'readonly');
  const store = tx.objectStore(STORE_NOTES);
  const req = store.getAll();

  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_META, 'readonly');
  const store = tx.objectStore(STORE_META);
  const req = store.get('lastSync');

  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => reject(req.error);
  });
}

// Simple offline search — keyword matching against cached notes
export function offlineSearch(
  query: string,
  notes: CachedNote[],
): { note: CachedNote; score: number }[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return [];

  const results = notes.map((note) => {
    const text = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (text.includes(word)) score += 1;
      if (note.title.toLowerCase().includes(word)) score += 2;
      if (note.tags.some((t) => t.toLowerCase().includes(word))) score += 1.5;
    }
    return { note, score };
  });

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export async function isOffline(): Promise<boolean> {
  return !navigator.onLine;
}
