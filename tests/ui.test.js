"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const data = require("../data.js");

const styles = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

test("touch quiz options do not use sticky hover as a selected state", () => {
  assert.match(styles, /\.option-button\.selected\s*\{/);
  assert.doesNotMatch(styles, /\.option-button:hover\s*,\s*\.option-button\.selected/);
  assert.match(
    styles,
    /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*?\.option-button:hover:not\(:disabled\)/
  );
  assert.equal((styles.match(/\.option-button:hover/g) || []).length, 1);
  assert.match(styles, /-webkit-tap-highlight-color:\s*transparent/);
});

test("P0 and P1 wording changes preserve the existing scoring contracts", () => {
  const signatures = {
    q2: [
      ["a", 3, null],
      ["b", 4, null],
      ["c", 4, null],
      ["d", 1, null]
    ],
    q6: [
      ["a", 4, null],
      ["b", 4, null],
      ["c", 4, null],
      ["d", 0, "control"]
    ],
    q7: [
      [0, null, null],
      [1, null, null],
      [2, null, null],
      [3, null, null]
    ],
    q8: [
      ["a", 3, null],
      ["b", 4, null],
      ["c", 4, null],
      ["d", 0, "control"]
    ],
    q10: [
      ["a", 4, null],
      ["b", 4, null],
      ["c", 4, null],
      ["d", 0, "control"]
    ]
  };

  for (const [questionId, expected] of Object.entries(signatures)) {
    const question = data.questions.find((item) => item.id === questionId);
    assert.deepEqual(
      question.options.map((option) => [option.value, option.score ?? null, option.flag ?? null]),
      expected
    );
    assert.ok(question.options.every((option) => option.label.includes("：")));
  }
});

test("P1 preserves the original constructs and adds everyday anchors", () => {
  const expectedContexts = {
    q2: ["旅行住宿", "原預算", "升級"],
    q3: ["週五晚上", "約會", "預算"],
    q4: ["鞋子", "3C", "比平常高"],
    q5: ["一年後", "旅行", "每月"],
    q6: ["必要支出", "家電故障", "分開負擔"],
    q10: ["買房", "換車", "共同投資"]
  };

  for (const [questionId, keywords] of Object.entries(expectedContexts)) {
    const question = data.questions.find((item) => item.id === questionId);
    const searchable = [question.eyebrow, question.text, question.helper || "", ...question.options.map((option) => option.label)].join(" ");
    for (const keyword of keywords) assert.match(searchable, new RegExp(keyword));
    assert.ok(question.text.length <= 42, `${questionId} question should stay scannable`);
    assert.ok(
      question.options.every((option) => option.label.includes("：") && option.label.length <= 32),
      `${questionId} options should use a short label and stay compact`
    );
  }

  const questionCopy = data.questions.map((question) => `${question.text} ${question.helper || ""}`).join(" ");
  assert.doesNotMatch(questionCopy, /一起吃火鍋|家裡常用的東西壞了|限量鞋，說以後可能保值|自己的錢換機車/);
  assert.doesNotMatch(questionCopy, /投資後帳面跌了 15%|基金或 ETF/);
  assert.match(questionCopy, /旅行、搬家或換車存錢/);
  assert.match(appSource, /都不太像，先略過/);
  assert.match(appSource, /約會怎麼花、旅行要不要升級、共同目標怎麼準備/);
  assert.match(appSource, /用雷達圖整理安心感、花費、未來準備/);
  assert.doesNotMatch(appSource, /一件這週就能一起試試看的小行動/);
});

test("P1 keeps preference order and collaboration risk flags stable", () => {
  const signatures = {
    q2: [["a", 3, null], ["b", 4, null], ["c", 4, null], ["d", 1, null]],
    q3: [[0, null, null], [1, null, null], [2, null, null], [3, null, null]],
    q4: [["a", 4, null], ["b", 4, null], ["c", 1, null], ["d", 0, "control"]],
    q5: [[0, null, null], [1, null, null], [2, null, null], [3, null, null]],
    q6: [["a", 4, null], ["b", 4, null], ["c", 4, null], ["d", 0, "control"]],
    q10: [["a", 4, null], ["b", 4, null], ["c", 4, null], ["d", 0, "control"]]
  };

  for (const [questionId, expected] of Object.entries(signatures)) {
    const question = data.questions.find((item) => item.id === questionId);
    assert.deepEqual(
      question.options.map((option) => [option.value, option.score ?? null, option.flag ?? null]),
      expected
    );
  }
});

test("question 5 uses an everyday savings rhythm and question 8 separates consent levels", () => {
  const q5 = data.questions.find((item) => item.id === "q5");
  assert.match(q5.helper, /沒有共同帳戶也可以回答/);
  assert.deepEqual(
    q5.options.map((option) => option.label.split("：")[0]),
    ["先存再花", "固定準備", "彈性準備", "有多再存"]
  );

  const q8 = data.questions.find((item) => item.id === "q8");
  assert.deepEqual(
    q8.options.map((option) => option.label.split("：")[0]),
    ["這次完整分享", "只看相關項目", "先訂查看規則", "直接交出帳密"]
  );
  assert.deepEqual(
    q8.options.map((option) => [option.value, option.score, option.flag ?? null]),
    [["a", 3, null], ["b", 4, null], ["c", 4, null], ["d", 0, "control"]]
  );
});

test("round two uses 12 core questions and moves personalization out of scoring", () => {
  assert.equal(data.questions.length, 12);
  assert.deepEqual(data.questions.map((question) => question.id), [
    "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12"
  ]);
  assert.deepEqual(data.personalizationQuestions.map((question) => question.id), ["q13", "q14"]);
  assert.match(appSource, /12 題核心測驗已完成/);
  assert.match(appSource, /讓提醒更貼近你/);
  assert.doesNotMatch(appSource, /想讓私人提醒更貼近你嗎/);
  assert.match(appSource, /選填・不計分/);
  assert.match(appSource, /data-growth-goal/);
  assert.match(appSource, /growthGoalId|selectedGrowthGoal/);
  assert.match(appSource, /會和本次結果一起放到個人中心/);
  assert.match(appSource, /savedCurrent\?\.growthGoalId/);
  assert.doesNotMatch(appSource, /14 題|14 個生活情境/);
});

test("other services look expandable and growth saving is gated to the member platform", () => {
  assert.match(appSource, /查看其他 \$\{otherServices\.length\} 項服務/);
  assert.match(appSource, /點一下展開全部好理家在資源/);
  assert.match(styles, /\.service-more summary[\s\S]*?width:\s*100%/);
  assert.match(styles, /\.service-more-action[\s\S]*?background:\s*var\(--gold\)/);
  assert.match(appSource, /FamilyFinGrowthTrackingAdapter/);
  assert.match(appSource, /保存到個人中心/);
  assert.doesNotMatch(appSource, /window\.localStorage|clear-growth|清除瀏覽器資料後/);
});
