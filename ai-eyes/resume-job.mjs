/**
 * Browser-only helper for resuming Gemini Interactions jobs after the phone
 * browser is closed. No credentials are stored. Staging candidate, not live.
 *
 * Use only in a browser; localStorage is intentionally injected for tests.
 */
export const STORAGE_KEY = "ai-eyes:last-interaction:v1";
export function validJobId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{4,200}$/.test(id);
}
export function saveJob(storage, { id, videoUrl, model, startedAt = Date.now() }) {
  if (!validJobId(id)) throw new Error("Invalid interaction id");
  const record = {
    id,
    videoUrl: typeof videoUrl === "string" ? videoUrl.slice(0, 512) : "",
    model: typeof model === "string" ? model.slice(0, 80) : "",
    startedAt
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}
export function loadJob(storage, now = Date.now(), maxAgeMs = 7 * 86400000) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const job = JSON.parse(raw);
    if (!validJobId(job.id) || !Number.isFinite(job.startedAt) ||
        job.startedAt > now + 60000 || now - job.startedAt > maxAgeMs) return null;
    return job;
  } catch { return null; }
}
export function clearJob(storage) {
  storage.removeItem(STORAGE_KEY);
}
