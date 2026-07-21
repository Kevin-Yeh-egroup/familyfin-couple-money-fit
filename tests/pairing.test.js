"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../data.js");
const pairing = require("../pairing.js");

function sampleAnswers() {
  return data.questions.reduce((answers, question, index) => {
    answers[question.id] = index === 7 ? "skipped" : question.options[index % 4].value;
    return answers;
  }, {});
}

test("pair code round-trips all answer types and skipped answers", () => {
  const answers = sampleAnswers();
  const code = pairing.encodeAnswers(answers);
  assert.match(code, /^M2[A-Z0-9]-[A-Z0-9]{4}-[A-Z0-9]{3}$/);
  assert.equal(pairing.normalizeCode(code).length, 10);
  assert.deepEqual(pairing.decodeAnswers(code), answers);
});

test("pair code accepts lowercase and spaces", () => {
  const answers = sampleAnswers();
  const code = pairing.encodeAnswers(answers).toLowerCase().replace(/-/g, " ");
  assert.deepEqual(pairing.decodeAnswers(code), answers);
});

test("pair code rejects a mistyped checksum", () => {
  const code = pairing.encodeAnswers(sampleAnswers());
  const last = code.endsWith("0") ? "1" : "0";
  assert.throws(() => pairing.decodeAnswers(code.slice(0, -1) + last), /有誤/);
});

test("legacy M1 pair codes still decode with personalization answers", () => {
  assert.deepEqual(pairing.decodeAnswers("M11-C07H-GAAJ"), {
    q1: 1,
    q2: "b",
    q3: 0,
    q4: "b",
    q5: 1,
    q6: "a",
    q7: 1,
    q8: "a",
    q9: 0,
    q10: "c",
    q11: 3,
    q12: "c",
    q13: "space",
    q14: "skipped"
  });
});

test("new M2 codes contain core answers only", () => {
  const answers = { ...sampleAnswers(), q13: "listen", q14: "plan" };
  const decoded = pairing.decodeAnswers(pairing.encodeAnswers(answers));
  assert.deepEqual(Object.keys(decoded), data.questions.map((question) => question.id));
  assert.equal("q13" in decoded, false);
  assert.equal("q14" in decoded, false);
  assert.equal(pairing.isCompleteCode(pairing.encodeAnswers(answers)), true);
  assert.equal(pairing.isCompleteCode("M11-C07H-GAAJ"), true);
});
