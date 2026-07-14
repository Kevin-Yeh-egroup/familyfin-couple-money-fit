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
  assert.match(code, /^M1[A-Z0-9]-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
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
