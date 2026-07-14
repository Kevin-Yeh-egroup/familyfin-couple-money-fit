(function runCoupleMoneyQuiz() {
  "use strict";

  const data = window.QuizData;
  const scoring = window.QuizScoring;
  const app = document.getElementById("app");
  const toast = document.getElementById("toast");
  const encoder = new TextEncoder();
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
    result: null,
    resultLink: "",
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

  function base64UrlEncode(bytes) {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function createEncryptedToken(payload) {
    if (!window.crypto?.subtle) {
      throw new Error("這個瀏覽器不支援安全邀請連結，請改用近期版本的瀏覽器。");
    }
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(JSON.stringify(payload))
    );
    const rawKey = await crypto.subtle.exportKey("raw", key);
    return [
      "v1",
      base64UrlEncode(iv),
      base64UrlEncode(new Uint8Array(ciphertext)),
      base64UrlEncode(new Uint8Array(rawKey))
    ].join(".");
  }

  async function readEncryptedToken(token) {
    const [version, ivValue, ciphertextValue, keyValue] = String(token).split(".");
    if (version !== "v1" || !ivValue || !ciphertextValue || !keyValue) {
      throw new Error("連結格式不完整，請請伴侶重新產生邀請。");
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
    setScreen("landing");
    app.innerHTML = `
      <section class="screen landing" aria-labelledby="landing-title">
        <div class="hero-copy">
          <span class="eyebrow">好理家在・雙人娛樂測驗</span>
          <h1 class="hero-title" id="landing-title">我們的錢，<span>合不合拍？</span></h1>
          <p class="hero-lead">14 個生活情境，兩人各自填完，再一起看見：哪些地方本來就合拍、哪些不同反而能互補、哪一件事最好先說清楚。</p>
          <ul class="trust-row" aria-label="測驗資訊">
            <li>14 題</li>
            <li>約 4–6 分鐘</li>
            <li>不用輸入金額</li>
            <li>沒有標準答案</li>
          </ul>
          <div class="cta-row">
            <button class="button button-primary" id="start-remote">先測我的金錢節奏</button>
            <button class="button button-secondary" id="start-same">同一台裝置一起測</button>
          </div>
          <p class="trust-copy">不用登入、不會上傳逐題答案。遠端配對資料會在你的瀏覽器內加密後放進邀請連結。</p>
        </div>
        <div class="hero-visual" aria-label="兩種金錢節奏交會成共同默契的抽象圖形">
          <div class="orbit" aria-hidden="true">
            <div class="orbit-note one">各自填，不先偷看</div>
            <div class="orbit-note two">差異也可能是互補</div>
            <div class="orbit-note three">最後帶走一條約定</div>
            <div class="orbit-center"><strong>2 人</strong><span>1 份共同報告</span></div>
          </div>
        </div>
      </section>
    `;
    document.getElementById("start-remote").addEventListener("click", () => startQuiz("remote-a"));
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
            <button class="button button-quiet" id="skip-question">暫時不回答</button>
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
    if (state.mode === "remote-a" || state.mode === "same-a") {
      state.answersA = { ...state.answers };
      renderPersonalPreview(state.mode === "same-a");
      return;
    }
    state.answersB = { ...state.answers };
    renderSecondConsent();
  }

  function renderPersonalPreview(sameDevice) {
    setScreen("preview");
    const preview = scoring.personalPreview(state.answersA);
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="preview-title">
        <span class="eyebrow">第一份完成</span>
        <h1 id="preview-title">先看看你的金錢節奏</h1>
        <p>這不是評分。等另一半完成後，系統才會整理雙人默契與差異。</p>
        <ul class="preview-list">
          <li><strong>你的第一個節奏</strong><br>${preview.rhythm}</li>
          <li><strong>你需要的支持</strong><br>${preview.support}</li>
          <li><strong>你想先改變的事</strong><br>${preview.goal}</li>
        </ul>
        ${preview.skippedCount ? `<p class="info-strip">你保留了 ${preview.skippedCount} 題。這不會扣分，只會讓配對報告的信心度稍低。</p>` : ""}
        ${personalPrivateNote(state.answersA)}
        <label class="consent-box">
          <input type="checkbox" id="consent-a">
          <span>我同意產生雙人報告。共享頁只顯示合併後的構面，不顯示我的逐題答案或私密提醒。</span>
        </label>
        <div class="cta-row">
          <button class="button button-primary" id="preview-next" disabled>${sameDevice ? "交給伴侶作答" : "產生伴侶邀請連結"}</button>
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
      } else {
        generateInviteLink(next);
      }
    });
    document.getElementById("preview-restart").addEventListener("click", () => startQuiz(state.mode));
    focusMain();
  }

  async function generateInviteLink(button) {
    button.disabled = true;
    button.textContent = "正在保護邀請內容…";
    try {
      const token = await createEncryptedToken({
        type: "invite",
        version: data.version,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        answersA: state.answersA
      });
      renderInviteLink(shareUrl("invite", token));
    } catch (error) {
      renderError(error.message);
    }
  }

  function renderInviteLink(link) {
    setScreen("invite-link");
    app.innerHTML = `
      <section class="screen flow-card" aria-labelledby="invite-link-title">
        <span class="privacy-pill">7 天有效・瀏覽器內加密</span>
        <h1 id="invite-link-title">邀請連結準備好了</h1>
        <p>把連結傳給伴侶。對方看不到你的逐題答案，完成後只會看到合併報告。</p>
        <textarea class="link-box" id="invite-link-value" readonly aria-label="伴侶邀請連結"></textarea>
        <div class="invite-actions">
          <button class="button button-primary" id="copy-invite">複製邀請連結</button>
          <button class="button button-secondary" id="share-invite">使用手機分享</button>
          <button class="button button-quiet" id="invite-home">回到首頁</button>
        </div>
        <p class="trust-copy">連結本身就是存取憑證，請只傳給你的伴侶，不要貼到公開社群。</p>
      </section>
    `;
    const textarea = document.getElementById("invite-link-value");
    textarea.value = link;
    document.getElementById("copy-invite").addEventListener("click", () => copyText(link, "邀請連結已複製"));
    const shareButton = document.getElementById("share-invite");
    if (!navigator.share) shareButton.hidden = true;
    shareButton.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "我們的錢，合不合拍？",
          text: "我完成了情侶金錢默契測驗，換你填完就能一起看報告。",
          url: link
        });
      } catch (_error) {
        // The user may close the native share sheet; no error message is needed.
      }
    });
    document.getElementById("invite-home").addEventListener("click", resetQuiz);
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
        <h1 id="invite-title">對方已經填完，現在換你</h1>
        <p>你不會看到對方的答案。14 題完成後，雙方只會看到合併後的默契、互補與待約定事項。</p>
        <ul class="trust-row">
          <li>約 4–6 分鐘</li>
          <li>沒有標準答案</li>
          <li>不輸入金額</li>
          <li>逐題答案不共享</li>
        </ul>
        <button class="button button-primary" id="start-invitee">開始我的 14 題</button>
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
          <li><strong>你想先改變的事</strong><br>${preview.goal}</li>
        </ul>
        ${personalPrivateNote(state.answersB)}
        <div class="info-strip"><strong>共享：</strong>默契指標、六個合併構面、結果類型與對話卡。<br><strong>不共享：</strong>逐題答案、誰觸發敏感提醒、個人私密說明。</div>
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

  async function createReport(button) {
    button.disabled = true;
    button.textContent = "正在整理兩人的結果…";
    state.result = scoring.calculatePairResult(state.answersA, state.answersB);
    try {
      const token = await createEncryptedToken({
        type: "result",
        version: data.version,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        answersA: state.answersA,
        answersB: state.answersB
      });
      state.resultLink = shareUrl("result", token);
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

  function renderReport() {
    setScreen("report");
    const result = state.result;
    const cards = pickDialogueCards(result);
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
            <p>這張圖顯示兩人的協作狀態，不公開個別逐題答案。</p>
            <div class="radar-wrap">
              <canvas id="radar-chart" width="420" height="420" role="img" aria-label="六個金錢關係構面的雷達圖"></canvas>
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
            <h2 id="summary-title">先看三件最重要的事</h2>
            <ul class="preview-list">
              <li><strong>你們本來就有的默契</strong><br>${result.strengths.map((axis) => axis.shortLabel).join("、")}是目前最穩定的支點。</li>
              <li><strong>可能剛好互補</strong><br>${result.complement.shortLabel}的不同，不一定需要誰改成誰；先把分工與界線說清楚。</li>
              <li><strong>最值得先談</strong><br>${result.focus.conversation}</li>
            </ul>
          </section>

          <section class="report-section full" aria-labelledby="dialogue-title">
            <h2 id="dialogue-title">今晚可以直接用的對話卡</h2>
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

          <section class="report-section" aria-labelledby="action-title">
            <h2 id="action-title">這週只做一件事</h2>
            <div class="action-banner">
              <span class="action-number" aria-hidden="true">1</span>
              <div><h3>${result.focus.shortLabel}</h3><p>${result.focus.action}</p></div>
            </div>
          </section>

          <section class="report-section" aria-labelledby="guide-title">
            <h2 id="guide-title">對話引導器</h2>
            <p>選一個現在最需要的幫忙。這是規則式引導，不會把你們診斷成任何人格。</p>
            <div class="cta-row">
              <button class="button button-secondary guide-button" data-guide="gentle">說得不傷人</button>
              <button class="button button-secondary guide-button" data-guide="rule">把差異變規則</button>
              <button class="button button-secondary guide-button" data-guide="twenty">安排 20 分鐘</button>
            </div>
            <div class="info-strip" id="guide-output">先選一個方向，這裡會出現可以直接照著說的開場。</div>
          </section>
        </div>

        <p class="private-note">共享報告不顯示任何一方的私密提醒。若出現強迫交出帳密、限制用錢、威脅或報復，請優先私下尋求可信任的人或專業支持，不要只靠一次伴侶對話處理。</p>

        <div class="report-actions">
          ${state.resultLink ? `<button class="button button-primary" id="copy-result">複製共同報告連結</button>` : ""}
          <button class="button button-secondary" id="restart-report">重新測一次</button>
        </div>
        <p class="trust-copy">指標已四捨五入到 5 分，只作為關係對話入口，不是心理衡鑑、婚配判定或財務建議。</p>
      </section>
    `;
    if (state.resultLink) {
      document.getElementById("copy-result").addEventListener("click", () =>
        copyText(state.resultLink, "共同報告連結已複製")
      );
    }
    document.getElementById("restart-report").addEventListener("click", resetQuiz);
    app.querySelectorAll(".guide-button").forEach((button) => {
      button.addEventListener("click", () => renderGuide(button.dataset.guide, result));
    });
    window.requestAnimationFrame(() => drawRadar(result.axes));
    focusMain();
  }

  function renderGuide(kind, result) {
    const output = document.getElementById("guide-output");
    const focus = result.focus.shortLabel;
    const guides = {
      gentle: `可以這樣開始：「我不是想檢查你，也不是要現在就決定。測驗說我們在『${focus}』有不同節奏，我想先聽你在意的是什麼。」`,
      rule: `把差異改成一句可測試的規則：「接下來兩週，只要會影響共同目標的支出就先說；其他個人花費保留自由。兩週後再一起調整。」`,
      twenty: `20 分鐘安排：前 5 分鐘各自說在意的事；中間 10 分鐘只討論一條規則；最後 5 分鐘確認何時回顧。任何一方需要暫停，都先約好回來談的時間。`
    };
    output.textContent = guides[kind];
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
    context.strokeStyle = "#c8dbd5";
    context.fillStyle = "rgba(220, 238, 232, 0.24)";
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
    context.fillStyle = "rgba(31, 111, 104, 0.24)";
    context.strokeStyle = "#1f6f68";
    context.lineWidth = 3;
    context.fill();
    context.stroke();

    axes.forEach((axis, index) => {
      const point = pointAt(index, axis.score / 100);
      context.beginPath();
      context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
      context.fillStyle = "#df745d";
      context.fill();

      const labelPoint = pointAt(index, 1.3);
      context.fillStyle = "#173b3b";
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
        <span class="eyebrow">連結暫時不能使用</span>
        <h1 id="error-title">需要一份新的邀請</h1>
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
      result: null,
      resultLink: "",
      transitionLocked: false
    });
    renderLanding();
  }

  async function initialize() {
    const hash = window.location.hash.slice(1);
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
