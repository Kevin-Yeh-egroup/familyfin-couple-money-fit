(function attachQuizData(globalScope) {
  "use strict";

  const axes = [
    {
      id: "safety",
      label: "安全與享受平衡",
      shortLabel: "安全 × 享受",
      weight: 0.2,
      preferenceQuestion: "q1",
      collaborationQuestion: "q2",
      conversation: "旅行、慶祝與預備金要怎麼排優先順序？",
      action: "挑一個近期想享受的計畫，先訂出兩人都安心的預算上限。"
    },
    {
      id: "spending",
      label: "消費節奏協調",
      shortLabel: "消費節奏",
      weight: 0.15,
      preferenceQuestion: "q3",
      collaborationQuestion: "q4",
      conversation: "自由花費與共同支出之間，門檻要放在哪裡？",
      action: "各自寫下一個不需要解釋的自由額度，再找出能接受的交集。"
    },
    {
      id: "future",
      label: "未來準備協調",
      shortLabel: "未來準備",
      weight: 0.2,
      preferenceQuestion: "q5",
      collaborationQuestion: "q6",
      conversation: "市場波動時，怎樣的做法能讓兩人都睡得著？",
      action: "只談一筆共同目標：用途、期限與最多能接受多少波動。"
    },
    {
      id: "transparency",
      label: "透明與界線共識",
      shortLabel: "透明 × 界線",
      weight: 0.15,
      preferenceQuestion: "q7",
      collaborationQuestion: "q8",
      conversation: "哪些資訊應主動同步？哪些仍然是合理的個人空間？",
      action: "列出三種一定要主動說的變化，以及一種彼此保留的個人空間。"
    },
    {
      id: "autonomy",
      label: "決策與自主平衡",
      shortLabel: "決策 × 自主",
      weight: 0.15,
      preferenceQuestion: "q9",
      collaborationQuestion: "q10",
      conversation: "共同管理、按比例分攤與各自管理，哪種組合最適合現在？",
      action: "選一筆共同支出，明確約定誰提案、誰確認、何時需要兩人同意。"
    },
    {
      id: "repair",
      label: "壓力修復能力",
      shortLabel: "壓力修復",
      weight: 0.15,
      preferenceQuestion: "q11",
      collaborationQuestion: "q12",
      conversation: "談錢卡住時，暫停多久、用什麼方式回來談？",
      action: "約好一句暫停暗號與最晚回來談的時間，先從 20 分鐘對話開始。"
    }
  ];

  const questions = [
    {
      id: "q1",
      axis: "safety",
      kind: "preference",
      eyebrow: "安全感與享受",
      text: "如果突然多了一筆 10,000 元的小獎金，你最想怎麼安排？",
      options: [
        { value: 0, label: "先全部留著，安全感最重要" },
        { value: 1, label: "多數留著，小部分慶祝" },
        { value: 2, label: "一半規劃、一半享受" },
        { value: 3, label: "大多拿來完成兩人一直想做的事" }
      ]
    },
    {
      id: "q2",
      axis: "safety",
      kind: "collaboration",
      eyebrow: "旅行情境",
      text: "一個人想升級旅行，另一個看到預算就緊張，你比較可能怎麼做？",
      options: [
        { value: "a", score: 3, label: "先維持原方案，等兩人都安心再升級" },
        { value: "b", score: 4, label: "列出升級與不升級的差別，再選都能接受的版本" },
        { value: "c", score: 4, label: "想升級的人負擔差額，但先確認不影響共同支出" },
        { value: "d", score: 1, label: "難得一次就別算太多，先訂了再說" }
      ]
    },
    {
      id: "q3",
      axis: "spending",
      kind: "preference",
      eyebrow: "日常消費節奏",
      text: "週五突然都有空，你心中理想的約會比較像？",
      options: [
        { value: 0, label: "散步、在家料理，不太花錢也很好玩" },
        { value: 1, label: "先定一個上限，再挑想吃想玩的" },
        { value: 2, label: "看當天心情，輪流決定" },
        { value: 3, label: "有感覺就升級，不想一直被預算綁住" }
      ]
    },
    {
      id: "q4",
      axis: "spending",
      kind: "collaboration",
      eyebrow: "大額支出",
      text: "對方買了超過兩人約定門檻的東西，你的第一反應比較像？",
      options: [
        { value: "a", score: 4, label: "先問發生什麼，再談對共同安排的影響" },
        { value: "b", score: 4, label: "先讓自己冷靜，約時間談規則是否要調整" },
        { value: "c", score: 1, label: "先不提，自己少花一點補回來" },
        { value: "d", score: 0, flag: "control", label: "要求退貨，以後大額支出要由我核准" }
      ]
    },
    {
      id: "q5",
      axis: "future",
      kind: "preference",
      eyebrow: "未來準備與風險",
      text: "一筆共同資金三年內不會使用，你比較安心的安排是？",
      options: [
        { value: 0, label: "高流動性、低波動" },
        { value: 1, label: "穩健為主，搭配少量成長" },
        { value: 2, label: "分散配置，可以接受一些起伏" },
        { value: 3, label: "願意承擔較大波動，換取成長機會" }
      ]
    },
    {
      id: "q6",
      axis: "future",
      kind: "collaboration",
      eyebrow: "市場波動",
      text: "假設共同投資帳面下跌 15%，你最希望兩人怎麼做？不投資也可以想像作答。",
      options: [
        { value: "a", score: 4, label: "先暫停動作，回看目標、期限和可承受損失" },
        { value: "b", score: 4, label: "先把風險降到兩人都睡得著，再重新討論" },
        { value: "c", score: 4, label: "依原計畫處理，但讓感到不安的人把問題問清楚" },
        { value: "d", score: 0, flag: "control", label: "交給比較懂投資的人決定，另一個不要干涉" }
      ]
    },
    {
      id: "q7",
      axis: "transparency",
      kind: "preference",
      eyebrow: "透明與個人界線",
      text: "你理想中的情侶財務透明度是？",
      helper: "四種模式都可能健康；重點是雙方同意，且不隱瞞會影響共同生活的責任。",
      options: [
        { value: 0, label: "所有帳目彼此都看得到" },
        { value: 1, label: "收入、負債、固定責任與大額支出同步，日常保留自由" },
        { value: 2, label: "共同帳戶與共同目標透明，個人帳戶保留" },
        { value: 3, label: "大多各自管理，但會影響共同生活的責任一定主動說" }
      ]
    },
    {
      id: "q8",
      axis: "transparency",
      kind: "collaboration",
      sensitive: true,
      eyebrow: "明細與界線",
      text: "伴侶說「我想看你的銀行或信用卡明細」，你希望怎麼處理？",
      options: [
        { value: "a", score: 3, label: "直接給看，對我來說沒有壓力" },
        { value: "b", score: 4, label: "先問對方在擔心什麼，再分享共同生活相關部分" },
        { value: "c", score: 4, label: "先談彼此同意的查看範圍、理由與期限" },
        { value: "d", score: 0, flag: "control", label: "不給看就是有鬼，所以彼此都應該可以直接查看" }
      ]
    },
    {
      id: "q9",
      axis: "autonomy",
      kind: "preference",
      eyebrow: "金錢管理模式",
      text: "你最喜歡哪一種情侶金錢管理模式？",
      options: [
        { value: 0, label: "幾乎全部共同管理" },
        { value: 1, label: "共同帳戶加各自的個人帳戶" },
        { value: 2, label: "共同支出按比例分攤，其餘各自管理" },
        { value: 3, label: "大多各自管理，需要時才一起出資" }
      ]
    },
    {
      id: "q10",
      axis: "autonomy",
      kind: "collaboration",
      eyebrow: "重大決策",
      text: "遇到重大的金錢意見不合，你比較能接受哪個規則？",
      options: [
        { value: "a", score: 4, label: "較懂理財的人先提方案，但雙方同意才執行" },
        { value: "b", score: 4, label: "先維持現狀，約定一個時間再討論" },
        { value: "c", score: 4, label: "不影響共同目標時各自決定；有影響才共同決定" },
        { value: "d", score: 0, flag: "control", label: "收入較高或出錢較多的人有最後決定權" }
      ]
    },
    {
      id: "q11",
      axis: "repair",
      kind: "preference",
      compatibilityMatrix: true,
      eyebrow: "壓力與修復",
      text: "錢的話題氣氛變差時，你最需要的是？",
      helper: "四種節奏沒有優劣；真正的風險是暫停後永遠不再回來談。",
      options: [
        { value: 0, label: "趁現在把話說清楚" },
        { value: 1, label: "休息 20–30 分鐘，再回來談" },
        { value: 2, label: "先睡一晚，但約好隔天何時繼續" },
        { value: 3, label: "先用訊息或紙條整理，再回來談" }
      ]
    },
    {
      id: "q12",
      axis: "repair",
      kind: "collaboration",
      sensitive: true,
      eyebrow: "壓力揭露",
      text: "若你有一筆讓自己壓力很大的債務、收入變動或家庭責任，你比較可能怎麼做？",
      helper: "這題不是誠實測驗。害怕被評價時，先說到自己覺得安全的程度也可以。",
      options: [
        { value: "a", score: 4, label: "一開始就說，也一起討論可能的影響" },
        { value: "b", score: 3, label: "整理出大致情況後再說" },
        { value: "c", score: 3, label: "先說「最近有壓力」，等安全一點再談細節" },
        { value: "d", score: 1, label: "盡量不讓伴侶知道，免得被看不起或拖累對方" }
      ]
    },
    {
      id: "q13",
      kind: "personalization",
      eyebrow: "你需要的支持",
      text: "遇到金錢壓力時，你最希望伴侶怎麼支持？",
      options: [
        { value: "listen", label: "先聽我說，不急著給答案" },
        { value: "organize", label: "陪我把數字和下一步整理出來" },
        { value: "space", label: "先給我一點空間，之後記得回來關心" },
        { value: "resource", label: "陪我找可信任的專業資源" }
      ]
    },
    {
      id: "q14",
      kind: "personalization",
      eyebrow: "三個月後",
      text: "如果三個月後再測一次，你最希望兩人先改善哪件事？",
      options: [
        { value: "surprise", label: "少一點突如其來的金錢驚嚇" },
        { value: "enjoy", label: "多一點不帶罪惡感的共同享受" },
        { value: "plan", label: "對未來有更穩定的共同計畫" },
        { value: "truth", label: "談錢時更敢說真話，也更不怕被責怪" }
      ]
    }
  ];

  const resultTypes = {
    foundation: {
      name: "安心打底型",
      kicker: "先把安全感放回對話裡",
      description: "目前有幾個話題比較容易卡住。先不用急著做大額共同決定；從一條安全的對話規則開始，讓彼此比較敢說真話。"
    },
    dualTrack: {
      name: "雙軌協商型",
      kicker: "各自有空間，也一起負責",
      description: "你們重視各自的自主，也願意為共同生活設規則。把共同責任、金額門檻與共同目標寫清楚，比要求全部合併更適合你們。"
    },
    complement: {
      name: "互補搭檔型",
      kicker: "不同節奏，可以變成好分工",
      description: "你們想法不完全一樣，但差異有機會變成分工。關鍵不是誰說服誰，而是把各自負責什麼、什麼情況要一起決定說清楚。"
    },
    cocreate: {
      name: "默契共創型",
      kicker: "合拍，也記得持續更新彼此",
      description: "你們的節奏接近，也願意一起調整。默契好不代表不用說；收入、責任或目標有變化時，還是要主動更新彼此。"
    }
  };

  const dialogueCards = [
    {
      id: "free-budget",
      title: "約會自由額度",
      prompt: "不影響共同目標時，每人每月有多少金額可以自由使用、不需要解釋？"
    },
    {
      id: "big-spend",
      title: "大額支出門檻",
      prompt: "超過多少金額要先說？需要共同同意、事前通知，還是事後同步？"
    },
    {
      id: "pressure",
      title: "壓力先說到哪裡",
      prompt: "若有收入、債務或家庭責任變化，我們希望多久內先說？第一次只說大方向，可以嗎？"
    },
    {
      id: "return",
      title: "吵架回來談的暗號",
      prompt: "需要暫停時，我們最多停多久？用哪一句話表示：我不是逃避，我會回來談？"
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
    surprise: "你希望先減少突如其來的金錢驚嚇。",
    enjoy: "你希望兩人能更安心地一起享受生活。",
    plan: "你希望建立更穩定的共同計畫。",
    truth: "你希望談錢時更敢說真話，也更不怕被責怪。",
    skipped: "先從一件最容易談的小事開始就好。"
  };

  const quizData = {
    axes,
    questions,
    resultTypes,
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
