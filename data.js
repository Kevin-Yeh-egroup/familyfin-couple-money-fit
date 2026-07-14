(function attachQuizData(globalScope) {
  "use strict";

  const axes = [
    {
      id: "safety",
      label: "安心與享受平衡",
      shortLabel: "安心 × 享受",
      weight: 0.2,
      preferenceQuestion: "q1",
      collaborationQuestion: "q2",
      conversation: "旅行、慶祝和緊急預備金，兩人會怎麼排先後順序？",
      action: "挑一件近期想一起做的事，先談出兩人都安心的預算上限。"
    },
    {
      id: "spending",
      label: "日常花費協調",
      shortLabel: "日常花費",
      weight: 0.15,
      preferenceQuestion: "q3",
      collaborationQuestion: "q4",
      conversation: "哪些錢可以自己決定？花到多少要先跟對方說？",
      action: "各自寫下一個可以自由使用、不必逐筆說明的金額，再找出兩人都能接受的範圍。"
    },
    {
      id: "future",
      label: "未來準備協調",
      shortLabel: "未來準備",
      weight: 0.2,
      preferenceQuestion: "q5",
      collaborationQuestion: "q6",
      conversation: "投資有起伏時，怎麼做才能讓兩人都比較安心？",
      action: "先挑一個共同目標，談清楚用途、期限，以及最多能接受多少損失。"
    },
    {
      id: "transparency",
      label: "坦白與個人空間",
      shortLabel: "坦白 × 空間",
      weight: 0.15,
      preferenceQuestion: "q7",
      collaborationQuestion: "q8",
      conversation: "哪些金錢變化一定要主動說？哪些可以保留自己的空間？",
      action: "一起列出三種一定會主動說的變化，再留一種彼此都同意的個人空間。"
    },
    {
      id: "autonomy",
      label: "共同決定與各自作主",
      shortLabel: "一起決定",
      weight: 0.15,
      preferenceQuestion: "q9",
      collaborationQuestion: "q10",
      conversation: "一起管、按收入比例分，還是各管各的？哪種做法最適合現在的你們？",
      action: "挑一筆共同支出，說好誰先提出、誰來確認，以及什麼情況一定要兩人同意。"
    },
    {
      id: "repair",
      label: "壓力修復能力",
      shortLabel: "壓力修復",
      weight: 0.15,
      preferenceQuestion: "q11",
      collaborationQuestion: "q12",
      conversation: "談錢談不下去時，要休息多久？怎麼讓對方知道你還會回來談？",
      action: "約好一句暫停暗號和最晚回來談的時間，先試一次 20 分鐘的對話。"
    }
  ];

  const scoreLevels = [
    {
      id: "safetyFirst",
      min: 0,
      max: 54,
      name: "安全感優先",
      description: "先暫停重大的共同金錢決定，把壓力、界線和能不能安心說話放回對話裡。"
    },
    {
      id: "foundation",
      min: 55,
      max: 69,
      name: "共同打底",
      description: "已經看見差異，下一步先建立一兩條兩人都做得到的共同規則。"
    },
    {
      id: "growing",
      min: 70,
      max: 84,
      name: "協商成長",
      description: "你們有合作空間，也有一些地方需要把默契說成更具體的約定。"
    },
    {
      id: "stable",
      min: 85,
      max: 100,
      name: "穩定共創",
      description: "整體已有不錯的合作基礎，持續在生活變化時更新彼此的規則。"
    }
  ];

  const questions = [
    {
      id: "q1",
      axis: "safety",
      kind: "preference",
      eyebrow: "安全感與享受",
      text: "如果突然多了 1 萬元獎金，你最想怎麼安排？",
      options: [
        { value: 0, label: "先全部存起來，安心最重要" },
        { value: 1, label: "大部分存起來，留一點慶祝" },
        { value: 2, label: "一半存起來，一半拿來享受" },
        { value: 3, label: "大部分拿來完成兩人一直想做的事" }
      ]
    },
    {
      id: "q2",
      axis: "safety",
      kind: "collaboration",
      eyebrow: "旅行情境",
      text: "一個人想把住宿或行程升級，另一個看到預算就緊張，你比較可能怎麼做？",
      options: [
        { value: "a", score: 3, label: "先照原本的安排，等兩人都安心再升級" },
        { value: "b", score: 4, label: "把價差和差別列出來，再選兩人都能接受的版本" },
        { value: "c", score: 4, label: "想升級的人補差額，但先確認不會影響共同開銷" },
        { value: "d", score: 1, label: "難得出去玩，就先訂了再說" }
      ]
    },
    {
      id: "q3",
      axis: "spending",
      kind: "preference",
      eyebrow: "日常消費節奏",
      text: "週五晚上突然都有空，你心中理想的約會比較像哪一種？",
      options: [
        { value: 0, label: "散步、在家煮飯，不太花錢也能很開心" },
        { value: 1, label: "先說好預算，再挑想吃、想玩的" },
        { value: 2, label: "看當天心情，輪流決定" },
        { value: 3, label: "有感覺就升級，不想一直被預算綁住" }
      ]
    },
    {
      id: "q4",
      axis: "spending",
      kind: "collaboration",
      eyebrow: "大額支出",
      text: "對方買了一樣東西，金額超過兩人原本說好的上限，你的第一反應比較像哪一種？",
      options: [
        { value: "a", score: 4, label: "先問發生什麼事，再談會不會影響兩人的安排" },
        { value: "b", score: 4, label: "先讓自己冷靜，另外找時間談原本的約定要不要調整" },
        { value: "c", score: 1, label: "先不說，自己少花一點把錢補回來" },
        { value: "d", score: 0, flag: "control", label: "要求退貨，以後超過這個金額都要先經過我同意" }
      ]
    },
    {
      id: "q5",
      axis: "future",
      kind: "preference",
      eyebrow: "未來準備與風險",
      text: "如果有一筆兩人一起存的錢，三年內不會用到，你比較安心的安排是？",
      options: [
        { value: 0, label: "放在隨時能用、變動比較小的地方" },
        { value: 1, label: "大部分求穩，少部分爭取成長" },
        { value: 2, label: "分散安排，可以接受一些漲跌" },
        { value: 3, label: "可以接受比較大的漲跌，爭取更多成長機會" }
      ]
    },
    {
      id: "q6",
      axis: "future",
      kind: "collaboration",
      eyebrow: "市場波動",
      text: "如果兩人一起投資的錢暫時虧損 15%，你最希望怎麼處理？",
      helper: "目前沒有一起投資也沒關係，想像這個情況作答就好。",
      options: [
        { value: "a", score: 4, label: "先不要急著動，重新確認目標、期限和能承受的損失" },
        { value: "b", score: 4, label: "先把風險降到兩人都比較安心，再重新討論" },
        { value: "c", score: 4, label: "先照原本計畫，但讓比較不安的人把問題問清楚" },
        { value: "d", score: 0, flag: "control", label: "交給比較懂投資的人決定，另一個不要管" }
      ]
    },
    {
      id: "q7",
      axis: "transparency",
      kind: "preference",
      eyebrow: "坦白與個人空間",
      text: "你希望兩人把金錢狀況說到什麼程度？",
      helper: "沒有哪一種一定最好；重點是兩人都同意，也不隱瞞會影響共同生活的事。",
      options: [
        { value: 0, label: "彼此都看得到所有收支和帳目" },
        { value: 1, label: "收入、負債、固定負擔和大筆花費會說，日常花費保留自由" },
        { value: 2, label: "共同帳戶和共同目標說清楚，個人帳戶各自保留" },
        { value: 3, label: "大多各自管理，但會影響兩人生活的事一定主動說" }
      ]
    },
    {
      id: "q8",
      axis: "transparency",
      kind: "collaboration",
      sensitive: true,
      eyebrow: "查看明細與個人空間",
      text: "伴侶說：「我想看你的銀行或信用卡明細。」你希望怎麼處理？",
      options: [
        { value: "a", score: 3, label: "直接給對方看，對我來說沒有壓力" },
        { value: "b", score: 4, label: "先問對方在擔心什麼，只分享會影響兩人生活的部分" },
        { value: "c", score: 4, label: "先說好要看哪些內容、為什麼要看，以及看到什麼時候" },
        { value: "d", score: 0, flag: "control", label: "不給看就代表有問題，所以彼此都應該隨時能查看" }
      ]
    },
    {
      id: "q9",
      axis: "autonomy",
      kind: "preference",
      eyebrow: "金錢管理模式",
      text: "如果要一起生活，你比較喜歡怎麼管錢？",
      options: [
        { value: 0, label: "大部分的錢都一起管" },
        { value: 1, label: "有共同帳戶，也保留各自的個人帳戶" },
        { value: 2, label: "共同開銷按收入比例分，其他各自管理" },
        { value: 3, label: "大多各管各的，需要時再一起出錢" }
      ]
    },
    {
      id: "q10",
      axis: "autonomy",
      kind: "collaboration",
      eyebrow: "重大決策",
      text: "遇到重要的金錢決定，兩人意見不一樣時，你比較能接受哪個做法？",
      options: [
        { value: "a", score: 4, label: "比較懂的人先提方案，但要兩人都同意才做" },
        { value: "b", score: 4, label: "先不要改變，說好下一次要在什麼時候繼續談" },
        { value: "c", score: 4, label: "不影響共同目標就各自決定；有影響才一起決定" },
        { value: "d", score: 0, flag: "control", label: "收入比較高或出錢比較多的人做最後決定" }
      ]
    },
    {
      id: "q11",
      axis: "repair",
      kind: "preference",
      compatibilityMatrix: true,
      eyebrow: "壓力與修復",
      text: "聊到錢，兩人的氣氛開始不對時，你最需要的是？",
      helper: "每個人需要的時間不同；比較重要的是休息後還會回來把話說完。",
      options: [
        { value: 0, label: "趁現在把話說清楚" },
        { value: 1, label: "先休息 20～30 分鐘，再回來談" },
        { value: 2, label: "先睡一晚，但說好隔天什麼時候繼續" },
        { value: 3, label: "先用訊息或文字整理想法，再回來談" }
      ]
    },
    {
      id: "q12",
      axis: "repair",
      kind: "collaboration",
      sensitive: true,
      eyebrow: "壓力揭露",
      text: "如果你碰到債務、收入變少，或需要多負擔家裡開銷，你比較可能怎麼做？",
      helper: "這不是誠實測驗。如果擔心被責怪，可以先說到自己覺得安全的程度。",
      options: [
        { value: "a", score: 4, label: "一開始就告訴對方，也一起談可能會有哪些影響" },
        { value: "b", score: 3, label: "先把大概的情況整理好，再告訴對方" },
        { value: "c", score: 3, label: "先說「我最近有金錢壓力」，覺得安全一點再談細節" },
        { value: "d", score: 1, label: "先不讓伴侶知道，怕被看不起或拖累對方" }
      ]
    },
    {
      id: "q13",
      kind: "personalization",
      eyebrow: "你需要的支持",
      text: "遇到金錢壓力時，你最希望伴侶怎麼陪你？",
      options: [
        { value: "listen", label: "先聽我說，不急著給答案" },
        { value: "organize", label: "陪我把數字和下一步整理出來" },
        { value: "space", label: "先給我一點空間，之後記得回來關心" },
        { value: "resource", label: "陪我找可信任的人或專業資源" }
      ]
    },
    {
      id: "q14",
      kind: "personalization",
      eyebrow: "三個月後",
      text: "如果三個月後再測一次，你最希望兩人在哪件事上更有默契？",
      options: [
        { value: "surprise", label: "少一點沒先說的花費或金錢狀況" },
        { value: "enjoy", label: "花錢享受時，不用一直覺得不應該" },
        { value: "plan", label: "對未來有更穩定的共同計畫" },
        { value: "truth", label: "談錢時更敢說真話，也更不怕被責怪" }
      ]
    }
  ];

  const resultTypes = {
    foundation: {
      name: "安心打底型",
      kicker: "先把安全感放回對話裡",
      description: "目前有幾個話題比較容易卡住。先不用急著做大額共同決定；從一條安全的對話規則開始，讓彼此比較敢說真話。",
      rule: "整體低於 70 分、協商平均低於 60 分、任一面向低於 55 分，或出現多個控制風險提醒。"
    },
    dualTrack: {
      name: "雙軌協商型",
      kicker: "各自有空間，也一起負責",
      description: "你們重視各自的空間，也願意為共同生活說好做法。把共同責任、多少錢要先說、共同目標是什麼寫清楚，比要求全部合在一起更適合你們。",
      rule: "兩人都偏好保留個人空間，而且坦白與個人空間、共同決定兩個面向都達 70 分以上。"
    },
    complement: {
      name: "互補搭檔型",
      kicker: "不同節奏，可以變成好分工",
      description: "你們想法不完全一樣，但差異有機會變成分工。關鍵不是誰說服誰，而是把各自負責什麼、什麼情況要一起決定說清楚。",
      rule: "偏好平均低於 80 分，但協商準備平均達 75 分以上，表示差異仍有合作空間。"
    },
    cocreate: {
      name: "默契共創型",
      kicker: "很合拍，有變化也別忘了說",
      description: "你們的想法接近，也願意一起調整。默契好不代表不用說；收入、家庭負擔或共同目標有變化時，還是要記得告訴對方。",
      rule: "沒有落入前述狀況，整體偏好與協商方式相對穩定；仍需在生活改變時持續更新約定。"
    }
  };

  const services = [
    {
      id: "askAI",
      icon: "✨",
      name: "問問 AI",
      href: "https://www.familyfinhealth.com/ask-ivy",
      cta: "開啟問問 AI"
    },
    {
      id: "accounting",
      icon: "📒",
      name: "財務生活記帳助理",
      href: "https://www.familyfinhealth.com/toolbox/financial-calculator/basic-accounting",
      cta: "開始整理收支"
    },
    {
      id: "timeResource",
      icon: "⏳",
      name: "時間資源盤點助理",
      href: "https://www.familyfinhealth.com/toolbox/time-resource-inventory",
      cta: "盤點時間與資源"
    },
    {
      id: "financialPlanning",
      icon: "🎯",
      name: "夢想達成財務規劃",
      href: "https://www.familyfinhealth.com/financial-planning",
      cta: "開始規劃共同目標"
    },
    {
      id: "consultation",
      icon: "🤝",
      name: "免費線上財務諮詢",
      href: "https://www.familyfinhealth.com/online-consultation",
      cta: "查看諮詢方式"
    }
  ];

  const dialogueCards = [
    {
      id: "free-budget",
      title: "約會自由額度",
      prompt: "不影響共同目標時，每人每月可以有多少錢自由使用，不需要逐筆說明？"
    },
    {
      id: "big-spend",
      title: "大筆花費先說多少",
      prompt: "花費超過多少要先說？需要兩人都同意、事前告知，還是事後告知就好？"
    },
    {
      id: "pressure",
      title: "壓力先說到哪裡",
      prompt: "如果收入、債務或家庭負擔有變化，我們希望多久內先說？第一次只說大概也可以嗎？"
    },
    {
      id: "return",
      title: "吵架回來談的暗號",
      prompt: "需要休息時，我們最多停多久？要說哪一句話，讓對方知道我不是逃避，之後會回來談？"
    }
  ];

  const supportCopy = {
    listen: "你比較需要先被聽見，再一起找答案。",
    organize: "你比較需要有人陪你把資訊與下一步整理清楚。",
    space: "你需要一點整理時間，也希望對方記得回來關心。",
    resource: "你重視可靠的外部資源與一起尋求協助。",
    skipped: "你可以先保留，等覺得安全時再說。"
  };

  const goalCopy = {
    surprise: "你希望少一點沒先說的花費或金錢狀況。",
    enjoy: "你希望兩人花錢享受時，不用一直覺得不應該。",
    plan: "你希望建立更穩定的共同計畫。",
    truth: "你希望談錢時更敢說真話，也更不怕被責怪。",
    skipped: "先從一件最容易談的小事開始就好。"
  };

  const quizData = {
    axes,
    scoreLevels,
    questions,
    resultTypes,
    services,
    dialogueCards,
    supportCopy,
    goalCopy,
    version: 1
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = quizData;
  }
  globalScope.QuizData = quizData;
})(typeof globalThis !== "undefined" ? globalThis : window);
