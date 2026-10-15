/**
 * AI Eyes V3.3 hardening: bounded retries for *read-only* Google calls.
 *
 * Deliberately DO NOT wrap POST /interactions background job creation:
 * a lost response can mean the job was created, and a retry could duplicate it.
 * This file is a tested candidate helper, NOT installed in the live Worker.
 */
export function retryDelayMs(attempt, retryAfterSeconds, random = Math.random) {
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(30000, Math.ceil(retryAfterSeconds * 1000));
  }
  const base = Math.min(16000, 1000 * 2 ** Math.max(0, attempt));
  return Math.floor(base * (0.75 + random() * 0.5));
}

export function isTransient(status) {
  return status === 429 || status === 500 || status === 502 ||
    status === 503 || status === 504;
}

export function classifyResponse(g) {
  if (!g || typeof g !== "object") return "invalid_response";
  if (g.ok) return "success";
  if (g.upstreamStatus === 0) return "network_or_timeout";
  return isTransient(g.upstreamStatus) ? "transient_upstream" : "permanent_upstream";
}

/**
 * Call only with operations that are safe to repeat:
 * GET /interactions/{id}, GET /models, or simple idempotent diagnostics.
 * fn(attempt) -> {ok:boolean, upstreamStatus:number, retryAfterSeconds?:number}
 * sleep(ms) can be injected in tests.
 */
export async function retryReadOnly(fn, {
  maxAttempts = 3,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  random = Math.random
} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new RangeError("maxAttempts must be 1..5");
  }
  let last;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      last = await fn(attempt);
    } catch (error) {
      last = { ok: false, upstreamStatus: 0, failure: String(error?.message || error) };
    }
    if (last?.ok || attempt === maxAttempts - 1) return last;
    const type = classifyResponse(last);
    if (type !== "transient_upstream" && type !== "network_or_timeout") return last;
    await sleep(retryDelayMs(attempt, last.retryAfterSeconds, random));
  }
  return last;
}

/**
 * A polling UI must only repeat while the upstream job is genuinely pending.
 * Unknown states should stop and be displayed, never loop forever.
 */
export function jobState(status) {
  if (status === "completed") return "complete";
  if (status === "queued" || status === "in_progress") return "pending";
  return "terminal_error";
}
