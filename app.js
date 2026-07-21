(function runCoupleMoneyQuiz() {
  "use strict";

  const data = window.QuizData;
  const pairing = window.QuizPairing;
  const scoring = window.QuizScoring;
  const tracking = window.QuizTracking;
  const growthAdapter = window.FamilyFinGrowthTrackingAdapter || null;
  const hasGrowthPlatform = Boolean(
    growthAdapter &&
    typeof growthAdapter.loadHistory === "function" &&
    typeof growthAdapter.saveSnapshot === "function"
  );
  const growthStore = {
    status: hasGrowthPlatform ? "idle" : "preview",
    history: [],
    saving: false
  };
  const app = document.getElementById("app");
  const toast = document.getElementById("toast");
  const decoder = new TextDecoder();
  const letters = ["A", "B", "C", "D"];

  const state = {
    screen: "landing",
    mode: null,
    currentIndex: 0,
    answers: {},
    answersA: null,
    answersB: null,
    invitePayload: null,
    partnerAnswers: null,
    selfCode: "",
    partnerCode: "",
    result: null,
    resultLink: "",
    growthGoal: "",
    transitionLocked: false
  };

  function setScreen(screen) {
    state.screen = screen;
    document.body.classList.toggle("quiz-mode", screen === "question");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function focusMain() {
    window.requestAnimationFrame(() => {
      app.focus({ preventScroll: true });
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  }

  function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function readEncryptedToken(token) {
    const [version, ivValue, ciphertextValue, keyValue] = String(token).split(".");
    if (version !== "v1" || !ivValue || !ciphertextValue || !keyValue) {
      throw new Error("連結格式不完整，請伴侶重新產生邀請。");
    }
    const key = await crypto.subtle.importKey(
      "raw",
      base64UrlDecode(keyValue),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlDecode(ivValue) },
      key,
      base64UrlDecode(ciphertextValue)
    );
    const payload = JSON.parse(decoder.decode(plaintext));
    if (!payload || payload.version !== data.version || !payload.expiresAt) {
      throw new Error("這份連結版本已失效，請重新產生。");
    }
    if (Date.now() > payload.expiresAt) {
      throw new Error("這份連結已過期，請重新產生。");
    }
    return payload;
  }

  function shareUrl(kind, token) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = `${kind}=${token}`;
    return url.toString();
  }

  async function copyText(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (_error) {
      const helper = document.createElement("textarea");
      helper.value = value;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast(successMessage);
  }

  function personalPrivateNote(answers) {
    const flagged = ["q4", "q6", "q8", "q10"].filter((questionId) => {
      const question = data.questions.find((item) => item.id === questionId);
      const option = question.options.find((item) => item.value === answers?.[questionId]);
      return option?.flag === "control";
    }).length;

    if (flagged === 0) return "";
    return `
      <div class="private-note">
        <strong>只給你的私密提醒</strong><br>
        當金錢壓力變大時，你可能會想把決定集中在一個人身上。先確認彼此是否真的同意，並保留可以說不、可以重新討論的空間。這段不會放進共享報告。
      </div>
    `;
  }

  function renderLanding() {
    setScreen("intro");
    app.innerHTML = `
      <section class="intro-page" aria-labelledby="landing-title">
        <div class="intro-hero">
          <div class="intro-symbol" aria-hidden="true">♡</div>
          <span class="intro-kicker">好理家在・情侶金錢默契測驗</span>
          <h1 id="landing-title"><span class="intro-title-line">想知道你們的財務，</span><span class="intro-title-line intro-title-accent">合不合拍嗎？</span></h1>
          <h2>不是看誰比較會理財，而是看看兩人怎麼一起面對金錢</h2>
          <p class="intro-lead">很多情侶不是不願意談錢，只是不知道怎麼開始。這個小測驗用 12 個生活情境，陪你們整理彼此的習慣、在意的事，以及最值得先說清楚的一件事。</p>
          <ul class="intro-facts" aria-label="測驗資訊">
            <li>📝 12 題</li>
            <li>⏱️ 每人約 3～5 分鐘</li>
            <li>🔒 不用輸入金額</li>
            <li>💗 沒有對錯</li>
          </ul>
          <button class="button button-primary intro-primary" id="intro-start">選擇作答方式 <span aria-hidden="true">→</span></button>
          <a class="scroll-cue" href="#how-it-works">往下看測驗說明 <span aria-hidden="true">↓</span></a>
        </div>

        <div class="screen intro-content">
          <section class="intro-section" id="how-it-works" aria-labelledby="how-title">
            <div class="section-heading">
              <span>HOW IT WORKS</span>
              <h2 id="how-title">這個測驗怎麼進行</h2>
              <p>各自照自己的想法回答，不需要猜對方會選什麼。</p>
            </div>
            <div class="explain-grid">
              <article class="explain-card">
                <span class="step-number">01</span>
                <h3>看到日常情境</h3>
                <p>約會怎麼花、旅行要不要升級、共同目標怎麼準備，都是生活中可能碰到的情況。</p>
              </article>
              <article class="explain-card">
                <span class="step-number">02</span>
                <h3>選最接近自己的答案</h3>
                <p>不用計算，也不用輸入收入或存款。只要選出現在最像你的做法。</p>
              </article>
              <article class="explain-card">
                <span class="step-number">03</span>
                <h3>完成後再比對</h3>
                <p>兩人都答完才會看到共同報告，不會先公開任何一方的逐題答案。</p>
              </article>
            </div>
          </section>

          <section class="intro-section soft-section" aria-labelledby="result-preview-title">
            <div class="section-heading">
              <span>YOUR RESULT</span>
              <h2 id="result-preview-title">你們會看到什麼</h2>
              <p>結果是一份談錢的起點，不是感情成績單。</p>
            </div>
            <div class="result-preview-grid">
              <article><span>結果 01</span><h3>一個整體默契提醒</h3><p>快速看見目前比較合拍、需要多聊，或適合分工的地方。</p></article>
              <article><span>結果 02</span><h3>六個金錢相處面向</h3><p>用雷達圖整理安心感、花費、未來準備、坦白與個人空間等面向。</p></article>
              <article><span>結果 03</span><h3>可以參考的對話主題</h3><p>整理三個適合你們目前結果的話題，需要時再一起聊。</p></article>
            </div>
          </section>

          <section class="intro-section phone-section" aria-labelledby="phone-title">
            <div class="phone-illustration" aria-hidden="true"><span>1</span><i>↔</i><span>2</span></div>
            <div>
              <span class="section-label">兩支手機也可以</span>
              <h2 id="phone-title">兩人可以同時作答，不用等對方填完</h2>
              <ol>
                <li>兩人各自在自己的手機開始測驗。</li>
                <li>完成後，每人會拿到一組 10 碼配對碼。</li>
                <li>交換配對碼，任一支手機都能產生共同報告。</li>
              </ol>
            </div>
          </section>

          <section class="intro-final" aria-labelledby="intro-final-title">
            <h2 id="intro-final-title">先了解彼此的想法，再慢慢找出適合你們的做法</h2>
            <p>測驗不會替你們做決定，也不會把差異判成好或壞。它只是提供一個比較容易開始的對話方式。</p>
            <button class="button button-primary" id="intro-start-bottom">我了解了，選擇作答方式 <span aria-hidden="true">→</span></button>
            <small>不用登入・答案不會上傳・這不是財務建議</small>
          </section>
        </div>
      </section>
    `;
    document.getElementById("intro-start").addEventListener("click", renderModeSelection);
    document.getElementById("intro-start-bottom").addEventListener("click", renderModeSelection);
    focusMain();
  }

  function renderModeSelection() {
    setScreen("mode");
    app.innerHTML = `
      <section class="screen mode-page" aria-labelledby="mode-title">
        <button class="back-link" id="mode-back">← 回到測驗說明</button>
        <div class="section-heading compact">
          <span>CHOOSE A MODE</span>
          <h1 id="mode-title">你們現在想怎麼作答？</h1>
          <p>兩種方式都會得到相同的共同報告，選現在最方便的就好。</p>
        </div>
        <div class="mode-grid">
          <article class="mode-card featured">
            <span class="mode-badge">推薦</span>
            <div class="mode-icon" aria-hidden="true">📱 ↔ 📱</div>
            <h2>兩支手機各自測</h2>
            <p>適合兩人坐在一起或遠端同時作答。完成後交換 10 碼配對碼。</p>
            <ul>
              <li>可以同時開始</li>
              <li>不會先看到對方答案</li>
              <li>任一方都能產生報告</li>
            </ul>
            <button class="button button-primary" id="start-pair">使用兩支手機作答</button>
          </article>
          <article class="mode-card">
            <div class="mode-icon" aria-hidden="true">📱 👩‍❤️‍👨</div>
            <h2>同一台手機輪流測</h2>
            <p>適合兩人就在旁邊。第一位完成後把手機交給另一位，不需要交換配對碼。</p>
            <ul>
              <li>只需要一台手機</li>
              <li>作答畫面會先清空</li>
              <li>兩人完成後直接看報告</li>
            </ul>
            <button class="button button-secondary" id="start-same">使用同一台手機作答</button>
          </article>
        </div>
        <p class="mode-privacy">🔒 不論選哪一種，都不用輸入姓名、收入、存款、負債金額或帳戶資料。</p>
      </section>
    `;
    document.getElementById("mode-back").addEventListener("click", renderLanding);
    document.getElementById("start-pair").addEventListener("click", () => startQuiz("pair-solo"));
    document.getElementById("start-same").addEventListener("click", () => startQuiz("same-a"));
    focusMain();
  }

  function startQuiz(mode) {
    state.mode = mode;
    state.currentIndex = 0;
    state.answers = {};
    state.transitionLocked = false;
    renderQuestion();
  }

  function renderQuestion() {
    setScreen("question");
    const question = data.questions[state.currentIndex];
    const progress = Math.round((state.currentIndex / data.questions.length) * 100);
    const selected = state.answers[question.id];
    app.innerHTML = `
      <section class="screen question-shell" aria-labelledby="question-title">
        <div class="quiz-heading">
          <span>COUPLE MONEY FIT</span>
          <h2>情侶金錢默契測驗</h2>
          <p>12 個生活情境，整理你們怎麼一起面對金錢</p>
        </div>
        <div class="question-topline">
          <span>問題 ${state.currentIndex + 1} / ${data.questions.length}</span>
          <span>${progress}% 完成</span>
        </div>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="作答進度">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <article class="question-card">
          <span class="eyebrow">${question.eyebrow}</span>
          <h1 id="question-title">${question.text}</h1>
          ${question.helper ? `<p class="question-helper">${question.helper}</p>` : ""}
          <p class="answer-guidance">選最接近你的做法就好；都不太像或還沒想過，也可以先略過。</p>
          <div class="option-list" role="group" aria-label="答案選項">
            ${question.options
              .map(
                (option, index) => `
                  <button
                    class="option-button${selected === option.value ? " selected" : ""}"
                    data-value="${String(option.value)}"
                    data-letter="${letters[index]}"
                    aria-pressed="${selected === option.value ? "true" : "false"}"
                  >${option.label}</button>
                `
              )
              .join("")}
          </div>
          <div class="question-actions">
            <button class="button button-quiet" id="previous-question" ${state.currentIndex === 0 ? "disabled" : ""}>上一題</button>
            <button class="button button-quiet" id="skip-question">都不太像，先略過</button>
            <button class="button button-quiet" id="exit-quiz">先離開</button>
          </div>
        </article>
      </section>
    `;

    app.querySelectorAll(".option-button").forEach((button) => {
      button.addEventListener("click", () => selectAnswer(question, button.dataset.value, button));
    });
    document.getElementById("previous-question").addEventListener("click", previousQuestion);
    document.getElementById("skip-question").addEventListener("click", () => {
      if (state.transitionLocked) return;
      state.answers[question.id] = "skipped";
      nextQuestion();
    });
    document.getElementById("exit-quiz").addEventListener("click", renderLanding);
    focusMain();
  }

  function selectAnswer(question, rawValue, button) {
    if (state.transitionLocked) return;
    state.transitionLocked = true;
    const option = question.options.find((candidate) => String(candidate.value) === rawValue);
    state.answers[question.id] = option.value;
    app.querySelectorAll(".option-button").forEach((candidate) => {
      candidate.disabled = true;
      candidate.classList.toggle("selected", candidate === button);
      candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false");
    });
    window.setTimeout(() => {
      state.transitionLocked = false;
      nextQuestion();
    }, 460);
  }

  function previousQuestion() {
    if (state.currentIndex === 0 || state.transitionLocked) return;
    state.currentIndex -= 1;
    renderQuestion();
  }

  function nextQuestion() {
    if (state.currentIndex < data.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      return;
    }
    completeQuiz();
  }

  function completeQuiz() {
    if (state.mode === "pair-solo" || state.mode === "same-a") {
      state.answersA = { ...state.answers };
      renderSupportChoice("a", state.mode === "same-a");
      return;
    }
    state.answersB = { ...state.answers };
    renderSupportChoice("b", false);
  }

  function renderSupportChoice(person, sameDevice) {
    setScreen("support-choice");
    const question = data.personalizationQuestions.find((item) => item.id === "q13");
    const answers = person === "a" ? state.answersA : state.answersB;
    app.innerHTML = `
      <section class="screen flow-card support-choice-card" aria-labelledby="support-choice-title">
        <span class="eyebrow">12 題核心測驗已完成</span>
        <h1 id="support-choice-title">讓提醒更貼近你</h1>
        <p>下面這題可以選填，不影響分數、配對結果，也不會出現在伴侶看到的共同報告。</p>
        <div class="optional-question">
          <span class="optional-pill">選填・不計分</span>
          <h2>${question.text}</h2>
          <div class="option-list" role="group" aria-label="私人支持偏好">
            ${question.options
              .map(
                (option, index) => `
                  <button
                    class="option-button"
                    data-support-value="${option.value}"
                    data-letter="${letters[index]}"
                    aria-pressed="false"
                  >${option.label}</button>
                `
              )
              .join("")}
          </div>
        </div>
        <button class="button button-quiet optional-skip" id="skip-support">先略過，繼續</button>
      </section>
    `;

    const continueFlow = () => {
      if (person === "a") renderPersonalPreview(sameDevice);
      else renderSecondConsent();
    };
    app.querySelectorAll("[data-support-value]").forEach((button) => {
      button.addEventListener("click", () => {
        answers.q13 = button.dataset.supportValue;
        continueFlow();
      });
    });
    document.getElementById("skip-support").addEventListener("click", () => {
      answers.q13 = "skipped";
      continueFlow();
    });
    focusMain();
  }

  function renderPersonalPreview(sameDevice) {
    setScreen("preview");
    const preview = scoring.personalPreview(state.answersA);
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="preview-title">
        <span class="eyebrow">第一份完成</span>
        <h1 id="preview-title">先看看你的金錢節奏</h1>
        <p>這不是在評分誰比較會理財。等兩人都完成後，才會整理共同的默契與差異。</p>
        <ul class="preview-list">
          <li><strong>你的第一個節奏</strong><br>${preview.rhythm}</li>
          <li><strong>你需要的支持</strong><br>${preview.support}</li>
        </ul>
        ${preview.skippedCount ? `<p class="info-strip">你在 12 題核心測驗中保留了 ${preview.skippedCount} 題。這不會扣分，配對報告會用比較保守的方式呈現。</p>` : ""}
        ${personalPrivateNote(state.answersA)}
        <label class="consent-box">
          <input type="checkbox" id="consent-a">
          <span>${sameDevice
            ? "我同意產生雙人報告。報告只顯示合併後的結果，不顯示我的逐題答案或私密提醒。"
            : "我了解配對碼代表這次的作答，並只會把它傳給伴侶。配對碼不含姓名、金額或帳戶資料。"}</span>
        </label>
        <div class="cta-row">
          <button class="button button-primary" id="preview-next" disabled>${sameDevice ? "交給伴侶作答" : state.partnerAnswers ? "比對我們的結果" : "產生我的配對碼"}</button>
          <button class="button button-quiet" id="preview-restart">重新作答</button>
        </div>
      </section>
    `;
    const consent = document.getElementById("consent-a");
    const next = document.getElementById("preview-next");
    consent.addEventListener("change", () => {
      next.disabled = !consent.checked;
    });
    next.addEventListener("click", () => {
      if (sameDevice) {
        renderSameDeviceHandoff();
      } else if (state.partnerAnswers) {
        state.answersB = { ...state.partnerAnswers };
        createReport(next);
      } else {
        renderPairCode();
      }
    });
    document.getElementById("preview-restart").addEventListener("click", () => startQuiz(state.mode));
    focusMain();
  }

  function renderPairCode() {
    setScreen("pair-code");
    state.selfCode = pairing.encodeAnswers(state.answersA);
    const shortLink = shareUrl("pair", state.selfCode);
    app.innerHTML = `
      <section class="screen flow-card pairing-card" aria-labelledby="pair-code-title">
        <span class="privacy-pill">10 碼・兩人可以同時作答</span>
        <h1 id="pair-code-title">交換配對碼，就能比對</h1>
        <p>把你的配對碼傳給伴侶，也請對方把完成後的配對碼傳給你。任一方輸入對方的碼，都能看到相同的共同報告。</p>

        <div class="pair-code-panel">
          <span>我的配對碼</span>
          <strong id="self-pair-code">${state.selfCode}</strong>
          <div class="invite-actions">
            <button class="button button-primary" id="copy-pair-code">複製配對碼</button>
            <button class="button button-secondary" id="copy-pair-link">複製短連結</button>
            <button class="button button-secondary" id="share-pair-link">用手機分享</button>
          </div>
        </div>

        <label class="pair-input-label" for="partner-pair-code">輸入對方的配對碼</label>
        <input
          class="pair-code-input"
          id="partner-pair-code"
          type="text"
          inputmode="text"
          autocomplete="off"
          autocapitalize="characters"
          maxlength="16"
          placeholder="例如：M2A-2BCD-3EF"
        >
        <p class="pair-error" id="pair-error" role="alert" hidden></p>
        <button class="button button-primary" id="compare-pair" disabled>比對我們的結果</button>
        <p class="trust-copy">配對碼不是密碼。拿到配對碼的人可以用這個測驗產生共同報告，請不要貼到公開社群。</p>
      </section>
    `;

    document.getElementById("copy-pair-code").addEventListener("click", () =>
      copyText(state.selfCode, "配對碼已複製")
    );
    document.getElementById("copy-pair-link").addEventListener("click", () =>
      copyText(shortLink, "短連結已複製")
    );
    const shareButton = document.getElementById("share-pair-link");
    if (!navigator.share) shareButton.hidden = true;
    shareButton.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "我們的錢，合不合拍？",
          text: `我的配對碼是 ${state.selfCode}。你完成 12 題後，把你的配對碼傳給我，我們就能比對。`,
          url: shortLink
        });
      } catch (_error) {
        // Closing the native share sheet is not an error.
      }
    });

    const partnerInput = document.getElementById("partner-pair-code");
    const compareButton = document.getElementById("compare-pair");
    partnerInput.addEventListener("input", () => {
      partnerInput.value = partnerInput.value.toUpperCase();
      compareButton.disabled = !pairing.isCompleteCode(partnerInput.value);
      document.getElementById("pair-error").hidden = true;
    });
    compareButton.addEventListener("click", () => comparePairCode(partnerInput.value, compareButton));
    focusMain();
  }

  function comparePairCode(code, button) {
    const error = document.getElementById("pair-error");
    try {
      state.partnerAnswers = pairing.decodeAnswers(code);
      state.partnerCode = pairing.encodeAnswers(state.partnerAnswers);
      state.answersB = { ...state.partnerAnswers };
      createReport(button);
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
      button.disabled = false;
    }
  }

  function renderPairInviteLanding() {
    setScreen("pair-invite");
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="pair-invite-title">
        <span class="eyebrow">已收到對方的配對碼</span>
        <h1 id="pair-invite-title">完成你的 12 題，就能直接比對</h1>
        <p>你不會先看到對方選了什麼。請按照自己的想法作答，完成後就會產生兩人的共同報告。</p>
        <div class="received-code"><span>收到的配對碼</span><strong>${state.partnerCode}</strong></div>
        <ul class="trust-row">
          <li>約 3～5 分鐘</li>
          <li>沒有標準答案</li>
          <li>不用輸入金額</li>
          <li>逐題答案不公開</li>
        </ul>
        <button class="button button-primary" id="start-pair-invite">開始我的 12 題</button>
        <button class="button button-quiet" id="pair-invite-home">回到首頁</button>
      </section>
    `;
    document.getElementById("start-pair-invite").addEventListener("click", () => startQuiz("pair-solo"));
    document.getElementById("pair-invite-home").addEventListener("click", resetQuiz);
    focusMain();
  }

  function renderSameDeviceHandoff() {
    setScreen("handoff");
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="handoff-title">
        <span class="eyebrow">換人時間</span>
        <h1 id="handoff-title">把畫面交給另一半</h1>
        <p>接下來不會顯示第一位的答案。第二位請依自己的感受作答，不需要猜對方選了什麼。</p>
        <div class="info-strip">兩份都完成後，還會再確認一次共享範圍，才會產生報告。</div>
        <button class="button button-primary" id="start-second">我是第二位，開始作答</button>
      </section>
    `;
    document.getElementById("start-second").addEventListener("click", () => startQuiz("same-b"));
    focusMain();
  }

  function renderRemoteInviteLanding() {
    setScreen("invite-landing");
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="invite-title">
        <span class="eyebrow">你收到一份雙人邀請</span>
        <h1 id="invite-title">對方已經完成，現在換你</h1>
        <p>你不會先看到對方的答案。完成 12 題後，才會整理兩人的默契、差異和可以先談的事。</p>
        <ul class="trust-row">
          <li>約 3～5 分鐘</li>
          <li>沒有標準答案</li>
          <li>不輸入金額</li>
          <li>逐題答案不公開</li>
        </ul>
        <button class="button button-primary" id="start-invitee">開始我的 12 題</button>
        <button class="button button-quiet" id="decline-invite">我現在不想填</button>
      </section>
    `;
    document.getElementById("start-invitee").addEventListener("click", () => {
      state.answersA = { ...state.invitePayload.answersA };
      startQuiz("remote-b");
    });
    document.getElementById("decline-invite").addEventListener("click", resetQuiz);
    focusMain();
  }

  function renderSecondConsent() {
    setScreen("consent-b");
    const preview = scoring.personalPreview(state.answersB);
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="consent-title">
        <span class="eyebrow">第二份完成</span>
        <h1 id="consent-title">報告產生前，再確認一次</h1>
        <ul class="preview-list">
          <li><strong>你需要的支持</strong><br>${preview.support}</li>
        </ul>
        ${personalPrivateNote(state.answersB)}
        <div class="info-strip"><strong>共同報告會顯示：</strong>默契指標、六個面向、你們的類型和對話卡。<br><strong>不會顯示：</strong>逐題答案、誰觸發敏感提醒、個人私密說明。</div>
        <label class="consent-box">
          <input type="checkbox" id="consent-b">
          <span>我了解共享範圍，並同意產生這份雙人報告。</span>
        </label>
        <button class="button button-primary" id="create-report" disabled>看我們的共同報告</button>
      </section>
    `;
    const consent = document.getElementById("consent-b");
    const createButton = document.getElementById("create-report");
    consent.addEventListener("change", () => {
      createButton.disabled = !consent.checked;
    });
    createButton.addEventListener("click", () => createReport(createButton));
    focusMain();
  }

  function createReport(button) {
    button.disabled = true;
    button.textContent = "正在整理兩人的結果…";
    state.result = scoring.calculatePairResult(state.answersA, state.answersB);
    try {
      const codeA = pairing.encodeAnswers(state.answersA);
      const codeB = pairing.encodeAnswers(state.answersB);
      state.resultLink = shareUrl("match", `${codeA}.${codeB}`);
      window.history.replaceState(null, "", state.resultLink);
    } catch (_error) {
      state.resultLink = "";
    }
    renderReport();
  }

  function pickDialogueCards(result) {
    const preferredByAxis = {
      safety: "free-budget",
      spending: "big-spend",
      future: "pressure",
      transparency: "pressure",
      autonomy: "big-spend",
      repair: "return"
    };
    const ids = [preferredByAxis[result.focus.id], "big-spend", "pressure", "return", "free-budget"];
    const unique = [];
    ids.forEach((id) => {
      if (!unique.includes(id) && unique.length < 3) unique.push(id);
    });
    return unique.map((id) => data.dialogueCards.find((card) => card.id === id));
  }

  function loadGrowthHistory() {
    return tracking.normalizeHistory(growthStore.history);
  }

  function personalCenterHref() {
    const rawHref = String(growthAdapter?.personalCenterHref || "").trim();
    if (!rawHref) return "";
    try {
      const url = new URL(rawHref, window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_error) {
      return "";
    }
  }

  async function hydrateGrowthHistory(result) {
    if (!hasGrowthPlatform || growthStore.status !== "idle") return;
    growthStore.status = "loading";
    refreshGrowthSection(result, { scroll: false });
    try {
      growthStore.history = tracking.normalizeHistory(await growthAdapter.loadHistory());
      const current = tracking.createSnapshot(result);
      const savedCurrent = growthStore.history.find(
        (record) => record.testedOn === current.testedOn && record.score === current.score
      );
      if (!state.growthGoal && savedCurrent?.growthGoalId) {
        state.growthGoal = savedCurrent.growthGoalId;
      }
      growthStore.status = "ready";
    } catch (_error) {
      growthStore.status = "error";
    }
    refreshGrowthSection(result, { scroll: false });
  }

  function formatTrackingDate(dateKey, compact = false) {
    const [year, month, day] = String(dateKey || "").split("-").map(Number);
    if (!year || !month || !day) return "日期待確認";
    return compact ? `${month}/${day}` : `${year} 年 ${month} 月 ${day} 日`;
  }

  function growthChartMarkup(records, currentSnapshot, currentSaved) {
    const visible = records.slice(-6);
    const width = 640;
    const height = 260;
    const plot = { left: 56, right: 22, top: 32, bottom: 50 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const pointX = (index) =>
      visible.length === 1
        ? plot.left + plotWidth / 2
        : plot.left + (plotWidth * index) / (visible.length - 1);
    const pointY = (score) => plot.top + ((100 - score) / 100) * plotHeight;
    const points = visible.map((record, index) => ({
      ...record,
      x: pointX(index),
      y: pointY(record.score),
      preview:
        !currentSaved &&
        record.testedOn === currentSnapshot.testedOn &&
        record.score === currentSnapshot.score
    }));
    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const grid = [100, 75, 50, 25, 0]
      .map((score) => {
        const y = pointY(score);
        return `
          <line x1="${plot.left}" y1="${y}" x2="${width - plot.right}" y2="${y}"></line>
          <text x="${plot.left - 12}" y="${y + 4}" text-anchor="end">${score}</text>
        `;
      })
      .join("");
    const marks = points
      .map(
        (point) => `
          <g class="growth-mark${point.preview ? " preview" : ""}">
            <circle cx="${point.x}" cy="${point.y}" r="7"></circle>
            <text class="growth-value" x="${point.x}" y="${point.y - 14}" text-anchor="middle">${point.score}</text>
            <text class="growth-date" x="${point.x}" y="${height - 18}" text-anchor="middle">${formatTrackingDate(point.testedOn, true)}</text>
          </g>
        `
      )
      .join("");
    const summary = points.map((point) => `${formatTrackingDate(point.testedOn)} ${point.score} 分`).join("、");

    return `
      <svg class="growth-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="growth-chart-title growth-chart-desc">
        <title id="growth-chart-title">金錢默契指標變化曲線</title>
        <desc id="growth-chart-desc">${summary}</desc>
        <g class="growth-grid" aria-hidden="true">${grid}</g>
        ${points.length > 1 ? `<path class="growth-line" d="${linePath}" aria-hidden="true"></path>` : ""}
        <g aria-hidden="true">${marks}</g>
      </svg>
    `;
  }

  function growthDeltaMarkup(records) {
    if (records.length < 2) return "";
    const previous = records[records.length - 2];
    const current = records[records.length - 1];
    return `
      <div class="growth-delta">
        <h3>六個面向和上次相比</h3>
        <ul>
          ${current.axes
            .map((axis) => {
              const previousAxis = previous.axes.find((item) => item.id === axis.id);
              const delta = previousAxis ? axis.score - previousAxis.score : 0;
              const deltaClass = delta > 0 ? "up" : delta < 0 ? "down" : "same";
              const deltaText = delta > 0 ? `+${delta}` : String(delta);
              return `<li><span>${axis.label}</span><strong class="${deltaClass}">${deltaText}</strong></li>`;
            })
            .join("")}
        </ul>
      </div>
    `;
  }

  function selectedGrowthGoal() {
    if (!state.growthGoal) return null;
    const question = data.personalizationQuestions.find((item) => item.id === "q14");
    const option = question?.options.find((item) => item.value === state.growthGoal);
    return option ? { id: option.value, label: option.label } : null;
  }

  function growthSectionMarkup(result) {
    const history = loadGrowthHistory();
    const growthGoal = selectedGrowthGoal();
    const currentSnapshot = tracking.createSnapshot(result, new Date(), growthGoal);
    const currentSaved = hasGrowthPlatform && tracking.containsSnapshot(history, currentSnapshot);
    const displayHistory = tracking.upsertSnapshot(history, currentSnapshot);
    const nextDate = tracking.addMonths(currentSnapshot.testedOn, 3);
    const saveLabel = history.length === 0 ? "保存到個人中心" : "保存這次重測結果";
    const statusLabel = growthStore.status === "preview"
      ? "個人中心整合預覽"
      : growthStore.status === "loading"
        ? "正在讀取紀錄"
        : growthStore.status === "error"
          ? "暫時無法讀取"
          : history.length > 0
            ? `個人中心已有 ${history.length} 次`
            : "個人中心尚無紀錄";
    const chartNote = growthStore.status === "preview"
      ? "目前是本機整合預覽；接上好理家在會員 API 後，這裡會讀取個人中心的歷次紀錄。"
      : growthStore.status === "loading"
        ? "正在從個人中心讀取歷次紀錄。"
        : growthStore.status === "error"
          ? "暫時無法讀取個人中心紀錄，請稍後再試。"
          : !currentSaved
            ? "圖上已先放入本次結果；按下保存後，會加入個人中心的成長紀錄。"
            : displayHistory.length < 2
              ? "目前只有第一次基準；下次保存後，就會形成變化曲線。"
              : "曲線顯示每次保存的整體指標，下面則整理六個面向和上次的差異。";
    const centerHref = personalCenterHref();
    const growthQuestion = data.personalizationQuestions.find((item) => item.id === "q14");
    const growthGoalMessage = state.growthGoal
      ? data.goalCopy[state.growthGoal]
      : "先一起選一個最想看到的改變，三個月後再回來比較。";

    return `
      <section class="report-section full growth-section" id="growth-section" aria-labelledby="growth-title">
        <div class="report-section-heading">
          <span>RELATIONSHIP GROWTH</span>
          <h2 id="growth-title">關係成長追蹤</h2>
          <p>把這次共同結果保存到好理家在個人中心，3 個月後再測一次，就能回來比較變化。</p>
        </div>
        <div class="growth-goal-card">
          <span class="optional-pill">三個月目標・選填</span>
          <h3>${growthQuestion.text}</h3>
          <div class="growth-goal-options" role="group" aria-label="三個月後想改善的方向">
            ${growthQuestion.options
              .map(
                (option) => `
                  <button
                    class="growth-goal-option${state.growthGoal === option.value ? " selected" : ""}"
                    data-growth-goal="${option.value}"
                    aria-pressed="${state.growthGoal === option.value ? "true" : "false"}"
                    type="button"
                  >${option.label}</button>
                `
              )
              .join("")}
          </div>
          <p class="growth-goal-message" id="growth-goal-message">${growthGoalMessage}</p>
          <small>這個選擇不影響測驗分數；按下保存後，會和本次結果一起放到個人中心。</small>
        </div>
        <div class="growth-layout">
          <div class="growth-chart-panel">
            <div class="growth-chart-heading">
              <h3>金錢默契指標變化</h3>
              <span>${statusLabel}</span>
            </div>
            ${growthChartMarkup(displayHistory, currentSnapshot, currentSaved)}
            <p class="growth-chart-note">${chartNote}</p>
          </div>
          <aside class="growth-reminder" aria-label="下次重測提醒">
            <span>3 個月後再測</span>
            <h3>${formatTrackingDate(nextDate)}</h3>
            <p>到時重新完成雙人測驗，再保存新結果，就能和這次比較。</p>
            <div class="growth-actions">
              ${currentSaved
                ? `<div class="growth-saved-status">✓ 已保存到個人中心</div>
                   ${centerHref ? `<a class="button button-secondary" href="${centerHref}">前往個人中心查看</a>` : ""}`
                : `<button class="button button-primary" id="save-growth" type="button" ${growthStore.status === "loading" || growthStore.saving ? "disabled" : ""}>${growthStore.saving ? "正在保存…" : saveLabel}</button>`}
            </div>
            <small>保存測驗日期、總分、結果類型、六個面向分數，以及選填的三個月成長目標；不含逐題答案、配對碼或私密提醒。</small>
          </aside>
        </div>
        ${growthDeltaMarkup(displayHistory)}
      </section>
    `;
  }

  function refreshGrowthSection(result, options = {}) {
    const section = document.getElementById("growth-section");
    if (!section) return;
    section.outerHTML = growthSectionMarkup(result);
    bindGrowthTracking(result);
    if (options.scroll !== false) {
      window.requestAnimationFrame(() => {
        document.getElementById("growth-section")?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }

  function bindGrowthTracking(result) {
    document.querySelectorAll("[data-growth-goal]").forEach((button) => {
      button.addEventListener("click", () => {
        state.growthGoal = button.dataset.growthGoal;
        refreshGrowthSection(result, { scroll: false });
      });
    });

    document.getElementById("save-growth")?.addEventListener("click", async () => {
      if (!hasGrowthPlatform) {
        showToast("目前是本機整合預覽；接上會員系統後才能保存到個人中心");
        return;
      }
      if (growthStore.saving) return;
      growthStore.saving = true;
      refreshGrowthSection(result, { scroll: false });
      try {
        const payload = tracking.createPlatformPayload(result, new Date(), selectedGrowthGoal());
        const response = await growthAdapter.saveSnapshot(payload);
        const returnedHistory = response?.history || response?.records;
        growthStore.history = returnedHistory
          ? tracking.normalizeHistory(returnedHistory)
          : tracking.upsertSnapshot(loadGrowthHistory(), payload);
        growthStore.status = "ready";
        growthStore.saving = false;
        refreshGrowthSection(result);
        showToast("本次結果已保存，可到個人中心查看");
      } catch (_error) {
        growthStore.saving = false;
        refreshGrowthSection(result, { scroll: false });
        showToast("目前無法保存到個人中心，請稍後再試");
      }
    });
  }

  function renderReport() {
    setScreen("report");
    const result = state.result;
    const cards = pickDialogueCards(result);
    const serviceRecommendations = scoring.recommendServices(result);
    const primaryService = serviceRecommendations.find((service) => service.role === "primary");
    const secondaryServices = serviceRecommendations.filter((service) => service.role === "secondary");
    const otherServices = serviceRecommendations.filter((service) => service.role === "other");
    const serviceCardMarkup = (service) => {
      const isPrimary = service.role === "primary";
      const rankLabel = isPrimary ? "最適合現在" : service.role === "secondary" ? "也可以從這裡開始" : "其他服務";
      return `
        <article class="service-card service-card-${service.role}">
          <div class="service-card-top">
            <span class="service-rank">${rankLabel}</span>
            <span class="service-icon" aria-hidden="true">${service.icon}</span>
          </div>
          <div class="service-card-copy">
            <h3>${service.name}</h3>
            <p>${service.reason}</p>
          </div>
          <a
            class="button ${isPrimary ? "button-primary" : "button-secondary"}"
            href="${service.href}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="${service.cta}（另開新分頁）"
          >${service.cta}<span aria-hidden="true"> ↗</span></a>
        </article>
      `;
    };
    app.innerHTML = `
      <section class="screen report-shell" aria-labelledby="report-title">
        <div class="report-hero">
          <div class="score-orb" style="--score:${result.score}" aria-label="金錢默契指標 ${result.score} 分">
            <div><span>${result.score}</span><small>金錢默契指標</small></div>
          </div>
          <div class="report-hero-copy">
            <span class="eyebrow">${result.type.kicker}</span>
            <h1 id="report-title">${result.type.name}</h1>
            <p>${result.type.description}</p>
          </div>
        </div>

        <div class="report-grid">
          <section class="report-section" aria-labelledby="radar-title">
            <h2 id="radar-title">六軸共同輪廓</h2>
            <p>這張圖顯示兩人一起處理金錢話題的狀態，不會列出個別答案。</p>
            <div class="radar-wrap">
              <canvas id="radar-chart" width="420" height="420" role="img" aria-label="六個金錢相處面向的雷達圖"></canvas>
            </div>
          </section>

          <section class="report-section" aria-labelledby="axis-title">
            <h2 id="axis-title">每個面向的默契</h2>
            <ul class="axis-list">
              ${result.axes
                .map(
                  (axis) => `
                    <li class="axis-row">
                      <strong>${axis.shortLabel}</strong>
                      <div class="axis-bar" aria-hidden="true"><span style="width:${axis.score}%"></span></div>
                      <span class="axis-score">${axis.score}</span>
                    </li>
                  `
                )
                .join("")}
            </ul>
            ${result.confidence < 100 ? `<p class="trust-copy">結果信心度 ${result.confidence}%：有人保留了部分題目，因此文字會比較保守。</p>` : ""}
          </section>

          <section class="report-section full" aria-labelledby="difference-title">
            <h2 id="difference-title">你們的差異地圖</h2>
            <ul class="difference-list">
              ${result.axes
                .map(
                  (axis) => `
                    <li class="difference-item ${axis.status}">
                      <strong>${axis.shortLabel}</strong>
                      <span>${scoring.explainStatus(axis.status)}</span>
                    </li>
                  `
                )
                .join("")}
            </ul>
          </section>

          <section class="report-section full" aria-labelledby="summary-title">
            <h2 id="summary-title">先看這三件事</h2>
            <ul class="preview-list">
              <li><strong>你們本來就有的默契</strong><br>${result.strengths.map((axis) => axis.shortLabel).join("、")}是目前最合拍的地方。</li>
              <li><strong>不同也可以互補</strong><br>在${result.complement.shortLabel}這件事上，不一定要誰改成誰；先說好兩人都能接受的做法就好。</li>
              <li><strong>最值得先談</strong><br>${result.focus.conversation}</li>
            </ul>
          </section>

          <section class="report-section full" aria-labelledby="dialogue-title">
            <h2 id="dialogue-title">可以參考的對話主題</h2>
            <div class="dialogue-grid">
              ${cards
                .map(
                  (card) => `
                    <article class="dialogue-card">
                      <h3>${card.title}</h3>
                      <p>「${card.prompt}」</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          ${growthSectionMarkup(result)}

          <section class="report-section full service-section" aria-labelledby="service-title">
            <div class="report-section-heading">
              <span>FAMILYFIN NEXT STEP</span>
              <h2 id="service-title">好理家在還可以</h2>
              <p>依照你們的結果，先從一件最有感的事開始。以下先放一個主要下一步，也保留兩個可以自行選擇的方向。</p>
            </div>
            <div class="service-recommendations">
              ${serviceCardMarkup(primaryService)}
              <div class="service-secondary-grid" aria-label="兩個次要選項">
                ${secondaryServices.map(serviceCardMarkup).join("")}
              </div>
            </div>
            <details class="service-more">
              <summary>
                <span class="service-more-copy">
                  <strong>查看其他 ${otherServices.length} 項服務</strong>
                  <small>點一下展開全部好理家在資源</small>
                </span>
                <span class="service-more-action" aria-hidden="true">
                  <span class="service-more-state"></span>
                  <span class="service-more-chevron">⌄</span>
                </span>
              </summary>
              <div class="service-other-grid">
                ${otherServices.map(serviceCardMarkup).join("")}
              </div>
            </details>
            <p class="service-note">推薦順序只根據本次共同結果產生，點擊服務時不會帶出逐題答案。進入其他服務後，登入與資料保存方式以該服務頁面說明為準。</p>
          </section>
        </div>

        <p class="private-note">共享報告不顯示任何一方的私密提醒。若出現強迫交出帳密、限制用錢、威脅或報復，請優先私下尋求可信任的人或專業支持，不要只靠一次伴侶對話處理。</p>

        <div class="report-actions">
          ${state.resultLink ? `<button class="button button-primary" id="copy-result">複製共同報告短連結</button>` : ""}
          <button class="button button-secondary" id="restart-report">重新測一次</button>
        </div>
      </section>
    `;
    if (state.resultLink) {
      document.getElementById("copy-result").addEventListener("click", () =>
        copyText(state.resultLink, "共同報告短連結已複製")
      );
    }
    document.getElementById("restart-report").addEventListener("click", resetQuiz);
    bindGrowthTracking(result);
    hydrateGrowthHistory(result);
    window.requestAnimationFrame(() => drawRadar(result.axes));
    focusMain();
  }

  function drawRadar(axes) {
    const canvas = document.getElementById("radar-chart");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const displayWidth = Math.max(280, Math.min(420, canvas.parentElement.clientWidth));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = displayWidth * dpr;
    canvas.height = displayWidth * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayWidth}px`;
    context.scale(dpr, dpr);

    const center = displayWidth / 2;
    const radius = displayWidth * 0.31;
    const points = axes.length;
    const angleFor = (index) => -Math.PI / 2 + (Math.PI * 2 * index) / points;
    const pointAt = (index, ratio) => ({
      x: center + Math.cos(angleFor(index)) * radius * ratio,
      y: center + Math.sin(angleFor(index)) * radius * ratio
    });

    context.clearRect(0, 0, displayWidth, displayWidth);
    context.lineWidth = 1;
    context.strokeStyle = "#eadedf";
    context.fillStyle = "rgba(255, 241, 242, 0.4)";
    for (let ring = 1; ring <= 5; ring += 1) {
      context.beginPath();
      axes.forEach((_axis, index) => {
        const point = pointAt(index, ring / 5);
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      if (ring === 5) context.fill();
      context.stroke();
    }

    axes.forEach((_axis, index) => {
      const outer = pointAt(index, 1);
      context.beginPath();
      context.moveTo(center, center);
      context.lineTo(outer.x, outer.y);
      context.stroke();
    });

    context.beginPath();
    axes.forEach((axis, index) => {
      const point = pointAt(index, axis.score / 100);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fillStyle = "rgba(255, 154, 158, 0.22)";
    context.strokeStyle = "#e58c91";
    context.lineWidth = 3;
    context.fill();
    context.stroke();

    axes.forEach((axis, index) => {
      const point = pointAt(index, axis.score / 100);
      context.beginPath();
      context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
      context.fillStyle = "#f4a46f";
      context.fill();

      const labelPoint = pointAt(index, 1.3);
      context.fillStyle = "#5f4b66";
      context.font = `700 ${displayWidth < 340 ? 11 : 12}px sans-serif`;
      context.textAlign = labelPoint.x < center - 8 ? "right" : labelPoint.x > center + 8 ? "left" : "center";
      context.textBaseline = labelPoint.y < center ? "bottom" : "top";
      context.fillText(axis.shortLabel, labelPoint.x, labelPoint.y);
    });
  }

  function renderError(message) {
    setScreen("error");
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="error-title">
        <span class="eyebrow">這組配對資料暫時不能使用</span>
        <h1 id="error-title">請重新取得配對碼</h1>
        <p>${message}</p>
        <button class="button button-primary" id="error-home">回到測驗首頁</button>
      </section>
    `;
    document.getElementById("error-home").addEventListener("click", resetQuiz);
    focusMain();
  }

  function resetQuiz() {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    Object.assign(state, {
      screen: "landing",
      mode: null,
      currentIndex: 0,
      answers: {},
      answersA: null,
      answersB: null,
      invitePayload: null,
      partnerAnswers: null,
      selfCode: "",
      partnerCode: "",
      result: null,
      resultLink: "",
      growthGoal: "",
      transitionLocked: false
    });
    renderLanding();
  }

  async function initialize() {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("pair=")) {
      try {
        const code = decodeURIComponent(hash.slice("pair=".length));
        state.partnerAnswers = pairing.decodeAnswers(code);
        state.partnerCode = pairing.encodeAnswers(state.partnerAnswers);
        state.mode = "pair-solo";
        renderPairInviteLanding();
      } catch (error) {
        renderError(error.message || "這組配對碼無法使用。");
      }
      return;
    }

    if (hash.startsWith("match=")) {
      try {
        const codes = decodeURIComponent(hash.slice("match=".length)).split(".");
        if (codes.length !== 2) throw new Error("共同報告連結不完整。");
        state.answersA = pairing.decodeAnswers(codes[0]);
        state.answersB = pairing.decodeAnswers(codes[1]);
        state.result = scoring.calculatePairResult(state.answersA, state.answersB);
        state.resultLink = window.location.href;
        renderReport();
      } catch (error) {
        renderError(error.message || "這份共同報告無法開啟。");
      }
      return;
    }

    if (hash.startsWith("invite=")) {
      try {
        const payload = await readEncryptedToken(hash.slice("invite=".length));
        if (payload.type !== "invite" || !payload.answersA) throw new Error("邀請內容不完整。");
        state.invitePayload = payload;
        state.mode = "remote-b";
        renderRemoteInviteLanding();
      } catch (error) {
        renderError(error.message || "這份邀請無法開啟。");
      }
      return;
    }

    if (hash.startsWith("result=")) {
      try {
        const payload = await readEncryptedToken(hash.slice("result=".length));
        if (payload.type !== "result" || !payload.answersA || !payload.answersB) {
          throw new Error("共同報告內容不完整。");
        }
        state.answersA = payload.answersA;
        state.answersB = payload.answersB;
        state.result = scoring.calculatePairResult(payload.answersA, payload.answersB);
        state.resultLink = window.location.href;
        renderReport();
      } catch (error) {
        renderError(error.message || "這份共同報告無法開啟。");
      }
      return;
    }

    renderLanding();
  }

  initialize();
})();
