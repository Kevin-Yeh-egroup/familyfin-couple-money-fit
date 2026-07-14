(function attachQuizScoring(globalScope) {
  "use strict";

  const data =
    (typeof module !== "undefined" && module.exports
      ? require("./data.js")
      : globalScope.QuizData);

  const clamp = (value, min = 0, max = 100) =>
    Math.max(min, Math.min(max, value));

  const roundToFive = (value) => Math.round(value / 5) * 5;

  const questionById = (id) => data.questions.find((question) => question.id === id);

  const optionFor = (questionId, value) => {
    const question = questionById(questionId);
    return question?.options.find((option) => option.value === value);
  };

  const isSkipped = (answers, questionId) =>
    !answers || answers[questionId] === undefined || answers[questionId] === "skipped";

  function standardPreferenceScore(valueA, valueB, bothReady) {
    const gap = Math.abs(Number(valueA) - Number(valueB));
    if (gap === 0) return 95;
    if (gap === 1) return bothReady ? 100 : 85;
    if (gap === 2) return 72;
    return 50;
  }

  function repairPreferenceScore(valueA, valueB) {
    const a = Number(valueA);
    const b = Number(valueB);
    if (a === b) return 95;
    const key = [a, b].sort((left, right) => left - right).join("-");
    const matrix = {
      "0-1": 85,
      "0-2": 55,
      "0-3": 70,
      "1-2": 90,
      "1-3": 90,
      "2-3": 85
    };
    return matrix[key] ?? 70;
  }

  function collaborationDetail(questionId, answersA, answersB) {
    const question = questionById(questionId);
    const values = [answersA?.[questionId], answersB?.[questionId]];
    let answered = 0;
    let scoreTotal = 0;
    let flagCount = 0;

    values.forEach((value) => {
      if (value === undefined || value === "skipped") return;
      const option = question.options.find((candidate) => candidate.value === value);
      if (!option) return;
      answered += 1;
      scoreTotal += option.score;
      if (option.flag === "control") flagCount += 1;
    });

    const averageRaw = answered > 0 ? scoreTotal / answered : 2.5;
    const score = clamp((averageRaw / 4) * 100);
    const bothReady =
      values.every((value) => {
        if (value === undefined || value === "skipped") return false;
        return (question.options.find((option) => option.value === value)?.score ?? 0) >= 3;
      });

    return { score, flagCount, answered, bothReady };
  }

  function preferenceDetail(questionId, answersA, answersB, bothReady) {
    const missingA = isSkipped(answersA, questionId);
    const missingB = isSkipped(answersB, questionId);
    if (missingA || missingB) {
      return {
        score: 75,
        gap: null,
        answered: Number(!missingA) + Number(!missingB),
        missing: true
      };
    }

    const valueA = answersA[questionId];
    const valueB = answersB[questionId];
    const question = questionById(questionId);
    const score = question.compatibilityMatrix
      ? repairPreferenceScore(valueA, valueB)
      : standardPreferenceScore(valueA, valueB, bothReady);

    return {
      score,
      gap: Math.abs(Number(valueA) - Number(valueB)),
      answered: 2,
      missing: false
    };
  }

  function calculatePairResult(answersA, answersB) {
    let totalWeighted = 0;
    let controlFlagCount = 0;
    let answeredCount = 0;
    const axisResults = data.axes.map((axis) => {
      const collaboration = collaborationDetail(
        axis.collaborationQuestion,
        answersA,
        answersB
      );
      const preference = preferenceDetail(
        axis.preferenceQuestion,
        answersA,
        answersB,
        collaboration.bothReady
      );
      const penalty = collaboration.flagCount * 12;
      const score = clamp(preference.score * 0.45 + collaboration.score * 0.55 - penalty);
      controlFlagCount += collaboration.flagCount;
      answeredCount += collaboration.answered + preference.answered;

      let status = "discuss";
      if (score >= 70 && preference.gap === 1 && collaboration.score >= 75) {
        status = "complement";
      } else if (score >= 78 && preference.score >= 85 && collaboration.score >= 70) {
        status = "aligned";
      }

      const result = {
        ...axis,
        score: Math.round(score),
        preferenceScore: Math.round(preference.score),
        preferenceGap: preference.gap,
        readinessScore: Math.round(collaboration.score),
        status,
        missing: preference.missing || collaboration.answered < 2,
        privateFlagCount: collaboration.flagCount
      };
      totalWeighted += result.score * axis.weight;
      return result;
    });

    const rawScore = clamp(totalWeighted);
    const score = roundToFive(rawScore);
    const averagePreference =
      axisResults.reduce((sum, axis) => sum + axis.preferenceScore, 0) / axisResults.length;
    const averageReadiness =
      axisResults.reduce((sum, axis) => sum + axis.readinessScore, 0) / axisResults.length;
    const minimumAxis = Math.min(...axisResults.map((axis) => axis.score));
    const transparency = axisResults.find((axis) => axis.id === "transparency");
    const autonomy = axisResults.find((axis) => axis.id === "autonomy");
    const independentPreference = ["q7", "q9"].every((questionId) => {
      if (isSkipped(answersA, questionId) || isSkipped(answersB, questionId)) return false;
      return (Number(answersA[questionId]) + Number(answersB[questionId])) / 2 >= 1.5;
    });

    let typeKey = "cocreate";
    if (
      score < 70 ||
      averageReadiness < 60 ||
      minimumAxis < 55 ||
      controlFlagCount >= 2
    ) {
      typeKey = "foundation";
    } else if (
      independentPreference &&
      transparency.score >= 70 &&
      autonomy.score >= 70
    ) {
      typeKey = "dualTrack";
    } else if (averagePreference < 80 && averageReadiness >= 75) {
      typeKey = "complement";
    }

    const sorted = [...axisResults].sort((left, right) => right.score - left.score);
    const strengths = sorted.slice(0, 2);
    const complement =
      axisResults.find((axis) => axis.status === "complement") || sorted[2];
    const focus = sorted[sorted.length - 1];
    const confidence = Math.round((answeredCount / (data.axes.length * 4)) * 100);

    return {
      score,
      rawScore: Math.round(rawScore * 10) / 10,
      typeKey,
      type: data.resultTypes[typeKey],
      axes: axisResults,
      strengths,
      complement,
      focus,
      confidence,
      privateControlFlagCount: controlFlagCount,
      averages: {
        preference: Math.round(averagePreference),
        readiness: Math.round(averageReadiness)
      }
    };
  }

  function personalPreview(answers) {
    const safetyValue = answers?.q1;
    let rhythm = "你習慣在安全感與生活享受之間找自己的節奏。";
    if (safetyValue !== undefined && safetyValue !== "skipped") {
      if (Number(safetyValue) <= 0) rhythm = "你通常會先把安全感安頓好，再考慮享受。";
      else if (Number(safetyValue) === 1) rhythm = "你偏好先留住大部分安全感，也保留一點慶祝空間。";
      else if (Number(safetyValue) === 2) rhythm = "你喜歡把規劃與享受放在同一張桌上。";
      else rhythm = "你重視一起創造回憶，不想讓金錢只剩下防守。";
    }

    const support = data.supportCopy[answers?.q13 ?? "skipped"] || data.supportCopy.skipped;
    const goal = data.goalCopy[answers?.q14 ?? "skipped"] || data.goalCopy.skipped;
    const skippedCount = data.questions.filter((question) => answers?.[question.id] === "skipped").length;

    return { rhythm, support, goal, skippedCount };
  }

  function explainStatus(status) {
    if (status === "aligned") return "本來就有默契";
    if (status === "complement") return "不同，但可能剛好互補";
    return "先約規則會更安心";
  }

  const scoring = {
    calculatePairResult,
    personalPreview,
    explainStatus,
    standardPreferenceScore,
    repairPreferenceScore,
    collaborationDetail,
    clamp,
    roundToFive,
    optionFor
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = scoring;
  }
  globalScope.QuizScoring = scoring;
})(typeof globalThis !== "undefined" ? globalThis : window);
