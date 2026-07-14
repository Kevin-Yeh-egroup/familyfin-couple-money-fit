# 我們的錢，合不合拍？

好理家在「情侶金錢默契測驗」公開 MVP。

## 功能

- 14 題手機優先互動測驗
- 遠端伴侶邀請連結與同裝置雙人模式
- 偏好契合度＋協作準備度雙層計分
- 四種關係財務類型、六軸雷達圖與差異地圖
- 對話卡、一週小行動與可分享結果連結
- 無帳號、無資料庫；邀請與結果資料以 Web Crypto 在瀏覽器本機加密後放在 URL fragment
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
- URL fragment 不會在一般 HTTP request 中送到伺服器，但連結本身是存取憑證，請勿轉傳給無關的人。
- 這是關係對話工具，不是心理衡鑑、婚配判定或財務建議。

## 發布

- GitHub `main` 是 repo-of-record。
- Vercel Production 使用獨立專案與穩定網址。
- 搜尋索引預設關閉，除非另行核准。
