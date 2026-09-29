const STORAGE_KEY = 'clearpath_history_v1';

const getEndpoint = () => window.APP_CONFIG?.sheetsUrl || '';

export function loadLocalHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export function saveLocalRecord(record) {
  const next = [record, ...loadLocalHistory()].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearLocalHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function saveRecord(record) {
  const history = saveLocalRecord(record);
  const endpoint = getEndpoint();
  if (!endpoint) return { history, synced: false };
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(record), mode: 'cors' });
    if (!response.ok) throw new Error(`Sheets returned ${response.status}`);
    return { history, synced: true };
  } catch (error) {
    console.warn('Sheets sync unavailable; local history retained.', error);
    return { history, synced: false, error };
  }
}

export async function retrieveHistory() {
  const local = loadLocalHistory();
  const endpoint = getEndpoint();
  if (!endpoint) return local;
  try {
    const response = await fetch(endpoint, { method: 'GET', mode: 'cors', cache: 'no-store' });
    if (!response.ok) throw new Error(`Sheets returned ${response.status}`);
    const remote = await response.json();
    return Array.isArray(remote.rows) ? remote.rows : local;
  } catch (error) {
    console.warn('Sheets history unavailable; showing local history.', error);
    return local;
  }
}
