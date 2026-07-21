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

  function scoreLevelFor(score) {
    const normalized = clamp(Number(score) || 0);
    return (
      data.scoreLevels.find((level) => normalized >= level.min && normalized <= level.max) ||
      data.scoreLevels[0]
    );
  }

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
      scoreLevel: scoreLevelFor(score),
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

  function recommendServices(result) {
    const focusId = result.focus?.id || "repair";
    const focusLabel = result.focus?.shortLabel || "目前最值得先談的地方";
    const focusPlans = {
      safety: ["financialCheck", "financialPlanning", "accounting"],
      spending: ["accounting", "financialPlanning", "askAI"],
      future: ["financialPlanning", "accounting", "financialCheck"],
      transparency: ["askAI", "timeResource", "financialAnxiety"],
      autonomy: ["timeResource", "financialPlanning", "accounting"],
      repair: ["askAI", "financialAnxiety", "consultation"]
    };
    let featuredIds = focusPlans[focusId] || focusPlans.repair;
    let recommendationKey = `focus-${focusId}`;

    if ((result.privateControlFlagCount || 0) > 0) {
      featuredIds = ["consultation", "financialAnxiety", "financialCheck"];
      recommendationKey = "safety-support";
    } else if ((result.confidence ?? 100) < 75) {
      featuredIds = ["askAI", "financialCheck", "timeResource"];
      recommendationKey = "low-confidence";
    } else if (result.typeKey === "foundation" || (result.averages?.readiness ?? 100) < 60) {
      featuredIds = ["consultation", "askAI", "financialAnxiety"];
      recommendationKey = "support-first";
    } else if (result.typeKey === "dualTrack") {
      featuredIds = ["timeResource", "financialPlanning", "accounting"];
      recommendationKey = "dual-track";
    } else if (result.typeKey === "cocreate" && result.scoreLevel?.id === "stable") {
      featuredIds = ["financialPlanning", "accounting", "financialCheck"];
      recommendationKey = "stable-cocreate";
    }

    const reasons = {
      askAI: `你們最值得先談的是「${focusLabel}」。可以先把卡住的地方整理成一句問題，找一個比較容易開始的方向。`,
      accounting: "先看一個月的日常收支，比較容易一起討論自由額度、共同開銷和存錢安排。",
      timeResource: "金錢分工不只看收入，也包含時間、體力、技能、知識與人脈；適合一起看見彼此沒有寫在帳單上的付出。",
      financialPlanning: "把旅行、結婚、買房或緊急預備金等共同目標，整理成期限與做得到的準備步驟。",
      financialAnxiety: "用 15 題整理金錢壓力來時比較容易出現的反應。這是一份自我整理，不是心理診斷。",
      financialCheck:
        (result.confidence ?? 100) < 75
          ? "這次有人保留了較多題目，可以先各自整理目前的財務狀態，再決定想一起談到哪裡。"
          : "先各自了解目前生活有哪些支撐、哪些地方比較吃力，會更容易找到兩人真正需要處理的重點。",
      consultation:
        result.typeKey === "foundation"
          ? "如果金錢壓力已經影響生活，或一談到錢就感到壓力，可以由其中一位先查看申請條件，讓專業人員協助整理個人財務狀況與方向。"
          : "如果其中一位想先釐清自己的收支、債務或重大決定，可以查看免費個人線上諮詢的申請方式。"
    };

    const orderedIds = [
      ...featuredIds,
      ...data.services.map((service) => service.id).filter((id) => !featuredIds.includes(id))
    ];

    return orderedIds.map((id, index) => {
      const service = data.services.find((item) => item.id === id);
      return {
        ...service,
        role: index === 0 ? "primary" : index < 3 ? "secondary" : "other",
        reason: reasons[id],
        recommendationKey
      };
    });
  }

  function personalPreview(answers) {
    const safetyValue = answers?.q1;
    let rhythm = "你會在安心存錢和享受生活之間，找自己舒服的比例。";
    if (safetyValue !== undefined && safetyValue !== "skipped") {
      if (Number(safetyValue) <= 0) rhythm = "你通常會先把錢留住，覺得安心後再考慮享受。";
      else if (Number(safetyValue) === 1) rhythm = "你傾向先存下大部分，也會留一點空間慶祝。";
      else if (Number(safetyValue) === 2) rhythm = "你喜歡一邊為未來打算，也一邊享受現在。";
      else rhythm = "你很重視兩人一起留下回憶，也願意為此花錢。";
    }

    const support = data.supportCopy[answers?.q13 ?? "skipped"] || data.supportCopy.skipped;
    const goal = data.goalCopy[answers?.q14 ?? "skipped"] || data.goalCopy.skipped;
    const skippedCount = data.questions.filter((question) => answers?.[question.id] === "skipped").length;

    return { rhythm, support, goal, skippedCount };
  }

  function explainStatus(status) {
    if (status === "aligned") return "本來就有默契";
    if (status === "complement") return "想法不同，但可以互補";
    return "先說好做法會更安心";
  }

  const scoring = {
    calculatePairResult,
    scoreLevelFor,
    recommendServices,
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
