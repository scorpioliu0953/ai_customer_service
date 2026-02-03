# AI 客服系統 (LINE + Supabase + React)

這是一個完整的 AI 客服系統，支援 OpenAI GPT 與 Google Gemini，並與 LINE 串接。

## 技術棧
- **Frontend:** React (Vite + TypeScript + Tailwind CSS)
- **Backend:** Netlify Functions (Node.js)
- **Database/Auth:** Supabase
- **Messaging:** LINE Messaging API

## 快速開始

### 1. 資料庫設定 (Supabase)
1. 在 Supabase 建立新專案。
2. 前往 **SQL Editor**，複製並執行 `supabase_schema.sql` 中的所有內容。這會建立必要的資料表與安全策略。
3. 前往 **Authentication** -> **Users**，手動建立一個管理員帳號。

### 2. 環境變數設定
建立 `.env` 檔案並填入以下內容：

**前端 (.env):**
```env
VITE_SUPABASE_URL=你的_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY
```

**Netlify (在 Netlify 控制台設定):**
```env
SUPABASE_URL=你的_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=你的_SUPABASE_SERVICE_ROLE_KEY (用於後端寫入)
```

### 3. 本地開發
```bash
npm install
npm run dev
```

### 4. 部署至 Netlify
1. 將程式碼推送到 GitHub。
2. 在 Netlify 建立新專案並連結 GitHub。
3. 設定上述環境變數。
4. 部署完成後，複製產生的網址加上 `/.netlify/functions/line-webhook`。
5. 將此 Webhook URL 填入 **LINE Developers Console** 的 Webhook URL 欄位。

## 功能說明
- **AI 切換:** 可隨時在 GPT 與 Gemini 之間切換。
- **上下文記憶:** 自動帶入最近 5 筆對話，確保對話連貫。
- **真人轉接:** 當使用者輸入設定的關鍵字時，AI 會停止回答，直到設定的超時時間結束或手動切換回 AI。
- **參考資料:** 可輸入產品手冊或 FAQ，AI 會根據這些資訊回答問題。
