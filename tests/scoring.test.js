"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const scoring = require("../scoring.js");
const data = require("../data.js");

function healthyAnswers(preferenceValue = 1) {
  return {
    q1: preferenceValue,
    q2: "b",
    q3: preferenceValue,
    q4: "a",
    q5: preferenceValue,
    q6: "a",
    q7: preferenceValue,
    q8: "c",
    q9: preferenceValue,
    q10: "c",
    q11: 1,
    q12: "b"
  };
}

test("matching healthy answers produce a high but non-diagnostic score", () => {
  const result = scoring.calculatePairResult(healthyAnswers(1), healthyAnswers(1));
  assert.equal(result.score, 95);
  assert.equal(result.typeKey, "cocreate");
  assert.equal(result.privateControlFlagCount, 0);
  assert.equal(result.confidence, 100);
});

test("one-step preference differences with strong collaboration count as healthy complement", () => {
  const left = healthyAnswers(1);
  const right = healthyAnswers(2);
  right.q11 = 2;
  const result = scoring.calculatePairResult(left, right);
  assert.ok(result.axes.slice(0, 5).every((axis) => axis.preferenceScore === 100));
  assert.ok(result.axes.some((axis) => axis.status === "complement"));
  assert.ok(result.score >= 90);
});

test("matching control answers do not receive a high compatibility score", () => {
  const left = healthyAnswers(1);
  const right = healthyAnswers(1);
  for (const answer of [left, right]) {
    answer.q4 = "d";
    answer.q6 = "d";
    answer.q8 = "d";
    answer.q10 = "d";
  }
  const result = scoring.calculatePairResult(left, right);
  assert.equal(result.typeKey, "foundation");
  assert.equal(result.privateControlFlagCount, 8);
  assert.ok(result.axes.find((axis) => axis.id === "spending").score < 40);
  assert.ok(result.score < 70);
});

test("independent but transparent couples can be classified as dual track", () => {
  const left = healthyAnswers(2);
  const right = healthyAnswers(2);
  left.q7 = right.q7 = 2;
  left.q9 = right.q9 = 2;
  const result = scoring.calculatePairResult(left, right);
  assert.equal(result.typeKey, "dualTrack");
  assert.ok(result.axes.find((axis) => axis.id === "transparency").score >= 70);
  assert.ok(result.axes.find((axis) => axis.id === "autonomy").score >= 70);
});

test("skipping sensitive questions lowers confidence without creating a control flag", () => {
  const left = healthyAnswers(1);
  const right = healthyAnswers(1);
  left.q8 = "skipped";
  right.q12 = "skipped";
  const result = scoring.calculatePairResult(left, right);
  assert.equal(result.privateControlFlagCount, 0);
  assert.ok(result.confidence < 100);
  assert.ok(result.score > 70);
});

test("repair style compatibility matrix preserves useful differences", () => {
  assert.equal(scoring.repairPreferenceScore(1, 2), 90);
  assert.equal(scoring.repairPreferenceScore(0, 2), 55);
  assert.equal(scoring.repairPreferenceScore(3, 3), 95);
});

test("score levels cover every display boundary", () => {
  assert.equal(scoring.scoreLevelFor(0).id, "safetyFirst");
  assert.equal(scoring.scoreLevelFor(54).id, "safetyFirst");
  assert.equal(scoring.scoreLevelFor(55).id, "foundation");
  assert.equal(scoring.scoreLevelFor(69).id, "foundation");
  assert.equal(scoring.scoreLevelFor(70).id, "growing");
  assert.equal(scoring.scoreLevelFor(84).id, "growing");
  assert.equal(scoring.scoreLevelFor(85).id, "stable");
  assert.equal(scoring.scoreLevelFor(100).id, "stable");
});

test("service recommendations respond to type and risk without hiding other services", () => {
  const healthyResult = scoring.calculatePairResult(healthyAnswers(1), healthyAnswers(1));
  const healthyServices = scoring.recommendServices(healthyResult);
  assert.equal(healthyResult.scoreLevel.id, "stable");
  assert.equal(healthyServices[0].id, "financialPlanning");
  assert.deepEqual(
    healthyServices.slice(0, 3).map((service) => service.id),
    ["financialPlanning", "accounting", "financialCheck"]
  );
  assert.deepEqual(
    healthyServices.slice(0, 3).map((service) => service.role),
    ["primary", "secondary", "secondary"]
  );
  assert.equal(new Set(healthyServices.map((service) => service.id)).size, 7);
  assert.equal(healthyServices.filter((service) => service.role === "other").length, 4);

  const left = healthyAnswers(1);
  const right = healthyAnswers(1);
  left.q4 = right.q4 = "d";
  left.q6 = right.q6 = "d";
  const foundationResult = scoring.calculatePairResult(left, right);
  const foundationServices = scoring.recommendServices(foundationResult);
  assert.equal(foundationResult.typeKey, "foundation");
  assert.equal(foundationServices[0].id, "consultation");
  assert.deepEqual(
    foundationServices.slice(0, 3).map((service) => service.id),
    ["consultation", "financialAnxiety", "financialCheck"]
  );
});

test("service recommendations create different one-primary two-secondary combinations", () => {
  const focusPlans = {
    safety: ["financialCheck", "financialPlanning", "accounting"],
    spending: ["accounting", "financialPlanning", "askAI"],
    future: ["financialPlanning", "accounting", "financialCheck"],
    transparency: ["askAI", "timeResource", "financialAnxiety"],
    autonomy: ["timeResource", "financialPlanning", "accounting"],
    repair: ["askAI", "financialAnxiety", "consultation"]
  };
  for (const [focusId, expected] of Object.entries(focusPlans)) {
    const services = scoring.recommendServices({
      focus: { id: focusId, shortLabel: focusId },
      confidence: 100,
      privateControlFlagCount: 0,
      typeKey: "complement",
      scoreLevel: { id: "growing" }
    });
    assert.deepEqual(
      services.slice(0, 3).map((service) => service.id),
      expected,
      `${focusId} should use its expected combination`
    );
  }

  const dualTrack = scoring.recommendServices({
    focus: { id: "autonomy", shortLabel: "一起決定" },
    confidence: 100,
    privateControlFlagCount: 0,
    typeKey: "dualTrack",
    scoreLevel: { id: "growing" }
  });
  assert.deepEqual(
    dualTrack.slice(0, 3).map((service) => service.id),
    ["timeResource", "financialPlanning", "accounting"]
  );

  const lowConfidence = scoring.recommendServices({
    focus: { id: "repair", shortLabel: "壓力修復" },
    confidence: 65,
    privateControlFlagCount: 0,
    typeKey: "complement",
    scoreLevel: { id: "growing" }
  });
  assert.deepEqual(
    lowConfidence.slice(0, 3).map((service) => service.id),
    ["askAI", "financialCheck", "timeResource"]
  );

  const safetyFlag = scoring.recommendServices({
    focus: { id: "spending", shortLabel: "日常花費" },
    confidence: 65,
    privateControlFlagCount: 1,
    typeKey: "complement",
    scoreLevel: { id: "growing" }
  });
  assert.deepEqual(
    safetyFlag.slice(0, 3).map((service) => service.id),
    ["consultation", "financialAnxiety", "financialCheck"]
  );

  for (const service of lowConfidence) {
    assert.match(service.href, /^https:\/\/www\.familyfinhealth\.com\//);
    assert.ok(service.name);
    assert.ok(service.reason);
    assert.ok(service.cta);
  }
});

test("free consultation is described as an individual service", () => {
  const service = data.services.find((item) => item.id === "consultation");
  assert.equal(service.name, "免費個人線上財務諮詢");
  assert.equal(service.cta, "查看個人諮詢方式");

  const recommendation = scoring.recommendServices({
    focus: { id: "repair", shortLabel: "壓力修復" },
    confidence: 100,
    privateControlFlagCount: 0,
    typeKey: "foundation",
    scoreLevel: { id: "foundation" }
  }).find((item) => item.id === "consultation");
  assert.match(recommendation.reason, /其中一位|個人/);
  assert.doesNotMatch(recommendation.reason, /你們需要.*第三方一起/);
});
