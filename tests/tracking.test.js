const test = require("node:test");
const assert = require("node:assert/strict");
const tracking = require("../tracking.js");

const result = (score = 80) => ({
  score,
  typeKey: "steady",
  type: { name: "穩健協作型" },
  axes: [
    { id: "safety", shortLabel: "安心感", score: 85 },
    { id: "spending", shortLabel: "日常花費", score: 75 }
  ]
});

test("creates a privacy-minimal growth snapshot", () => {
  const snapshot = tracking.createSnapshot(result(), new Date("2026-07-14T12:00:00+08:00"));
  assert.equal(snapshot.testedOn, "2026-07-14");
  assert.equal(snapshot.score, 80);
  assert.equal(snapshot.typeName, "穩健協作型");
  assert.deepEqual(snapshot.axes.map((axis) => axis.id), ["safety", "spending"]);
  assert.equal("answers" in snapshot, false);
});

test("saving again on the same day replaces instead of duplicating", () => {
  const first = tracking.createSnapshot(result(70), new Date("2026-07-14T09:00:00+08:00"));
  const second = tracking.createSnapshot(result(85), new Date("2026-07-14T20:00:00+08:00"));
  const history = tracking.upsertSnapshot(tracking.upsertSnapshot([], first), second);
  assert.equal(history.length, 1);
  assert.equal(history[0].score, 85);
});

test("three-month retest date handles shorter calendar months", () => {
  assert.equal(tracking.addMonths("2026-01-31", 3), "2026-04-30");
  assert.equal(tracking.addMonths("2026-07-14", 3), "2026-10-14");
});

test("history stays chronological and reports the next retest date", () => {
  const older = tracking.createSnapshot(result(70), new Date("2026-04-14T12:00:00+08:00"));
  const newer = tracking.createSnapshot(result(80), new Date("2026-07-14T12:00:00+08:00"));
  const history = tracking.normalizeHistory([newer, older]);
  assert.deepEqual(history.map((record) => record.score), [70, 80]);
  assert.equal(tracking.nextRetestDate(history), "2026-10-14");
  assert.equal(tracking.containsSnapshot(history, newer), true);
});
