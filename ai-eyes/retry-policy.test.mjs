import test from "node:test";
import assert from "node:assert/strict";
import { retryDelayMs, isTransient, classifyResponse, retryReadOnly, jobState } from "./retry-policy.mjs";

test("429 and 503 retryable, 400 and 403 not", () => {
  assert.equal(isTransient(429), true);
  assert.equal(isTransient(503), true);
  assert.equal(isTransient(400), false);
  assert.equal(isTransient(403), false);
});
test("Google 503 is not misclassified as Worker timeout", () => {
  assert.equal(classifyResponse({ ok: false, upstreamStatus: 503 }), "transient_upstream");
  assert.equal(classifyResponse({ ok: false, upstreamStatus: 0 }), "network_or_timeout");
});
test("503 -> 503 -> 200: three attempts, bounded waits", async () => {
  let calls = 0; const delays = [];
  const result = await retryReadOnly(async () => {
    calls++;
    return calls < 3 ? { ok: false, upstreamStatus: 503 } : { ok: true, upstreamStatus: 200 };
  }, { sleep: async ms => { delays.push(ms); }, random: () => 0.5 });
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1000, 2000]);
});
test("403: no retry", async () => {
  let calls = 0;
  const result = await retryReadOnly(async () => {
    calls++;
    return { ok: false, upstreamStatus: 403 };
  }, { sleep: async () => { throw Error("should not sleep"); } });
  assert.equal(calls, 1);
  assert.equal(result.upstreamStatus, 403);
});
test("permanent 503: stops after maxAttempts", async () => {
  let calls = 0;
  await retryReadOnly(async () => { calls++; return { ok: false, upstreamStatus: 503 }; }, {
    maxAttempts: 3, sleep: async () => {}
  });
  assert.equal(calls, 3);
});
test("Retry-After capped at 30 seconds", () => {
  assert.equal(retryDelayMs(0, 120), 30000);
});
test("failed, cancelled and unknown jobs never poll forever", () => {
  assert.equal(jobState("queued"), "pending");
  assert.equal(jobState("in_progress"), "pending");
  assert.equal(jobState("completed"), "complete");
  for (const status of ["failed", "cancelled", "incomplete", "requires_action", undefined]) {
    assert.equal(jobState(status), "terminal_error");
  }
});
test("reject invalid retry limits", async () => {
  await assert.rejects(retryReadOnly(async () => ({ ok: true }), { maxAttempts: 0 }), RangeError);
});
