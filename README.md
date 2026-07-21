# 我們的錢，合不合拍？

好理家在「情侶金錢默契測驗」公開 MVP。

## 功能

- 12 題手機優先核心測驗，六個面向各一題偏好、一題協作
- 第 12 題完成後直接進入配對或同機交接；三個月目標保留在關係成長追蹤
- P1 保留旅行、日常消費、未來準備、財務界線與重大決策等原始構念，改用不需要共同投資經驗也能回答的生活情境
- 兩支手機可同時作答，完成後交換 10 碼 M2 配對碼；仍可開啟舊版 M1 配對碼
- 同一台手機輪流作答模式
- 偏好契合度＋協作準備度雙層計分
- 四種關係財務類型、六軸雷達圖與差異地圖
- 對話卡、3 個月關係成長追蹤與精簡版共同報告連結
- 七項好理家在服務入口依作答完整度、風險提醒、關係類型與最低面向，組成一個主要下一步與兩個次要選項；其餘四項仍可展開查看
- 獨立預覽不含帳號或資料庫；答案在瀏覽器內轉成短配對碼，不會上傳伺服器
- 搬進好理家在平台後，成長追蹤透過會員 adapter 保存到按下按鈕者的個人中心；包含選填的三個月成長目標，不保存逐題答案
- Review 階段保留 `noindex`

## 本機檢查

```powershell
npm run check
npm test
python -m http.server 4173
```

開啟 `http://localhost:4173/`。

## 隱私邊界

- 不收精確收入、資產、負債金額、帳號或明細。
- 配對碼與 URL fragment 不含姓名、金額或帳戶資料，但代表這次的逐題選項；拿到配對碼的人可以產生共同報告，請勿轉傳給無關的人。
- 個人中心接收測驗日期、總分、結果類型、六軸分數，以及使用者選填的三個月成長目標；不接收逐題答案、配對碼或私密提醒。
- 這是關係對話工具，不是心理衡鑑、婚配判定或財務建議。

## 好理家在個人中心整合

正式平台需在載入 `app.js` 前提供會員 adapter：

```js
window.FamilyFinGrowthTrackingAdapter = {
  personalCenterHref: "/personal-center",
  loadHistory: async () => [],
  saveSnapshot: async (payload) => ({ history: [payload] })
};
```

- `loadHistory()`：讀取目前登入會員的歷次紀錄。
- `saveSnapshot(payload)`：依會員、`toolId` 與測驗日期新增或更新紀錄，回傳最新 `history`。Payload schema v2 可包含 `growthGoalId` 與 `growthGoalLabel`。
- API 必須由好理家在會員登入與權限機制保護；這個獨立 repo 不建立帳號、資料表或後端端點。

## 發布

- GitHub `main` 是 repo-of-record。
- Vercel Production 使用獨立專案與穩定網址。
- 搜尋索引預設關閉，除非另行核准。
