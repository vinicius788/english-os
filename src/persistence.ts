import type { AppData } from './domain';
import { defaultData, importUdemyCatalog, mergeProgress, bundledCatalog } from './domain';

const KEY = 'english-os:v1';
const DB = 'english-os';
const STORE = 'app';

function restoreData(value: AppData): AppData {
  const restored = mergeProgress(value, defaultData());
  // Upgrade older local snapshots once. Re-importing the bundled catalog on every
  // load would overwrite metadata from a later, user-authorized CSV/JSON import.
  return restored.catalogImport?.importedLessonCount === bundledCatalog.lessons.length
    && restored.catalogImport?.importedTestCount === bundledCatalog.tests.length
    ? restored
    : importUdemyCatalog(restored, bundledCatalog);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadData(): Promise<AppData> {
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openDb();
      const value = await new Promise<AppData | undefined>((resolve, reject) => {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(request.result as AppData | undefined);
        request.onerror = () => reject(request.error);
      });
      db.close();
      if (value?.version === 1) return restoreData(value);
    } catch { /* localStorage is the compatibility fallback */ }
  }
  try { const value = localStorage.getItem(KEY); return value ? restoreData(JSON.parse(value) as AppData) : defaultData(); }
  catch { return defaultData(); }
}

export async function saveData(data: AppData): Promise<void> {
  const serialized = JSON.stringify(data);
  try { localStorage.setItem(KEY, serialized); } catch { /* IndexedDB can still be available in restricted browser modes. */ }
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(data, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch { /* localStorage copy remains available */ }
}

export async function clearData(): Promise<void> {
  localStorage.removeItem(KEY);
  if (typeof indexedDB === 'undefined') return;
  try { const db = await openDb(); await new Promise<void>((resolve, reject) => { const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error); }); db.close(); } catch { /* no-op */ }
}

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const isRecordArray = (value: unknown): value is JsonRecord[] => Array.isArray(value) && value.every(isRecord);

/** Validate a user backup before merging it with this browser's progress. */
export function mergeBackupData(current: AppData, value: unknown): AppData {
  const envelope = isRecord(value) ? value : null;
  const incoming = envelope && 'progress' in envelope ? envelope.progress : value;
  if (!isRecord(incoming)
    || incoming.version !== 1
    || !isRecord(incoming.activities)
    || !Object.values(incoming.activities).every((record) => isRecord(record)
      && ['todo', 'done', 'skipped'].includes(String(record.status))
      && typeof record.updatedAt === 'string')
    || !isRecord(incoming.dayNotes)
    || !Array.isArray(incoming.lectures)
    || !incoming.lectures.every((item) => isRecord(item) && Number.isInteger(item.sequence) && typeof item.title === 'string' && typeof item.id === 'string')
    || !Array.isArray(incoming.watched)
    || !incoming.watched.every((id) => typeof id === 'string')
    || !Array.isArray(incoming.cards)
    || !isRecord(incoming.overrides)
    || !isRecord(incoming.settings)
    || typeof incoming.settings.startDate !== 'string'
    || typeof incoming.settings.targetMinutes !== 'number'
    || typeof incoming.settings.timezone !== 'string'
    || typeof incoming.settings.level !== 'string') {
    throw new Error('Backup inválido ou incompatível. Importe um JSON exportado pelo English OS.');
  }
  const optionalArrays = ['courseTests', 'assessments', 'speaking', 'skillAttempts', 'tutorSessions', 'activityHistory'];
  if (optionalArrays.some((key) => incoming[key] !== undefined && !isRecordArray(incoming[key]))) {
    throw new Error('Backup inválido: uma das listas de progresso está corrompida.');
  }
  const backup = incoming as unknown as AppData;
  const merged = mergeProgress(current, backup);
  const currentHasUserCatalog = current.catalogImport?.source && current.catalogImport.source !== bundledCatalog.metadata.source;
  const catalog = currentHasUserCatalog ? current : backup;
  const completionForLesson = (sequence: number) => [current, backup]
    .flatMap((data) => data.lectures.filter((item) => item.sequence === sequence))
    .find((item) => item.status === 'watched' || dataForLectureWasWatched(item.id, current, backup));
  const lectures = catalog.lectures.map((lesson) => {
    const completion = completionForLesson(lesson.sequence);
    return completion
      ? { ...lesson, status: 'watched' as const, completedAt: completion.completedAt }
      : lesson;
  });
  const courseTests = (catalog.courseTests || []).map((test) => {
    const wasCompleted = [current, backup].flatMap((data) => data.courseTests || [])
      .find((item) => item.sequence === test.sequence && item.status === 'completed');
    return wasCompleted ? { ...test, status: 'completed' as const, completedAt: wasCompleted.completedAt } : test;
  });
  return {
    ...merged,
    lectures,
    courseTests,
    catalogImport: currentHasUserCatalog ? current.catalogImport : backup.catalogImport || current.catalogImport,
    settings: { ...backup.settings, ...current.settings },
  };
}

function dataForLectureWasWatched(id: string, ...data: AppData[]) {
  return data.some((item) => item.watched.includes(id));
}

export const storageKey = KEY;
