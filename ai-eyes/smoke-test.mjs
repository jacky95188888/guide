// AI Eyes read-only smoke test. Node.js 20+.
// Usage: node ai-eyes/smoke-test.mjs
// Optional: ACCESS_TOKEN=... AI_EYES_URL=https://... node ai-eyes/smoke-test.mjs
// This script NEVER deploys or changes Cloudflare settings.
const base = (process.env.AI_EYES_URL || "https://ai-eyes-video.rhtm9y855y.workers.dev").replace(/\/$/, "");
const token = process.env.ACCESS_TOKEN || "";
const timeoutMs = 25000;
async function call(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : {
        "content-type": "application/json",
        "authorization": "Bearer " + token
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { invalidJson: true }; }
    return { status: res.status, ms: Date.now() - start, data };
  } finally { clearTimeout(timer); }
}
try {
  const health = await call("/health");
  console.log("health", { status: health.status, ms: health.ms, version: health.data.version, ok: health.data.ok });
  if (health.status !== 200 || !health.data.ok) process.exitCode = 1;
  if (!token) {
    console.log("No ACCESS_TOKEN supplied; skipping authenticated diagnostics.");
  } else {
    const models = await call("/models", {});
    console.log("models", {
      http: models.status,
      ok: models.data.ok,
      count: models.data.total,
      configuredModelListed: models.data.configuredModelListed,
      upstreamStatus: models.data.error?.upstreamStatus,
      ms: models.ms
    });
    if (!models.data.ok) process.exitCode = 1;
    // Intentionally avoid /text and /analyze to prevent unrequested API charges.
  }
} catch (error) {
  console.error("Smoke test failed:", error.name, error.message);
  process.exitCode = 1;
}
