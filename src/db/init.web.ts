import { ensureWebStorage } from './webStore';

let initPromise: Promise<void> | null = null;

export async function initDb() {
  if (!initPromise) {
    initPromise = Promise.resolve().then(() => {
      ensureWebStorage();
    });
  }
  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}
