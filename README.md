# 🤖 企業級 AI 客服系統 (LINE + Supabase + React)

這是一個完整、現代化的 AI 客服解決方案。整合了 **OpenAI GPT-5/4**、**Google Gemini 3/1.5**，並具備知識庫（PDF/純文字）讀取能力與 LINE 真人客服轉接系統。

---

## 🌟 功能亮點

*   **頂級 AI 支援**：首創支援 GPT-5 (Responses API) 與 Gemini 3 (Thinking Level) 最新規格。
*   **多模態知識庫**：可直接上傳產品手冊 (PDF) 或輸入文字，讓 AI 成為領域專家。
*   **真人轉接系統**：自動偵測關鍵字，即時發送 LINE 推送通知給客服專員。
*   **極致穩定性**：內建資料庫級去重機制，解決 LINE Webhook 重複發送導致的誤觸問題。
*   **現代化後台**：使用 React + Tailwind CSS 打造，支援深色模式與行動裝置。

---

## 🚀 快速安裝手冊

請依照以下四個步驟完成您的系統搭建：

### 步驟一：獲取專案程式碼
您可以選擇以下 **其中一種** 方式開始：

#### 方案 A：標準 Fork (推薦)
1.  點擊頁面右上角的 **Fork** 按鈕，將此專案複製到您的 GitHub 帳號。
2.  這能讓您自由修改程式碼並保有自己的版本紀錄。

#### 方案 B：一鍵自動部署 (最快)
點擊下方按鈕，Netlify 會自動幫您 Fork 專案並連結部署：

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/scorpioliu0953/ai_customer_service)

---

### 步驟二：Supabase 資料庫設定
1.  登入 [Supabase 控制台](https://supabase.com/) 並建立一個新專案。
2.  **執行 SQL 腳本**：
    *   點擊左側 **SQL Editor** -> **New Query**。
    *   複製並貼上本頁下方的 **[完整資料庫腳本]** 並執行。
3.  **建立管理員**：
    *   前往 **Authentication > Users** -> **Add User**。
    *   手動建立一組 Email 與密碼（用於登入客服後台）。

### 步驟三：Netlify 雲端設定
1.  進入您的 Netlify 專案控制台。
2.  在 **Site configuration > Environment variables** 中設定以下四個必填變數：

| 變數名稱 | 來源 (Supabase Project Settings > API) | 說明 |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **Project URL** | 前端連接資料庫 |
| `VITE_SUPABASE_ANON_KEY` | **API Key (anon/public)** | 前端公開金鑰 |
| `SUPABASE_URL` | **Project URL** | 後端 Function 呼叫 (與前端相同) |
| `SUPABASE_SERVICE_ROLE_KEY` | **API Key (service_role)** | **絕對機密！** 後端專用最高權限 |

3.  設定完畢後，前往 **Deploys** 點擊 **Trigger deploy** 重新發布，使變數生效。

### 步驟四：LINE Messaging API 串接
1.  登入 [LINE Developers Console](https://developers.line.biz/)。
2.  建立 Provider 與 Messaging API Channel。
3.  將以下資訊填入您的 **AI 客服後台 > 系統設定** 中：
    *   `Channel Access Token`
    *   `Channel Secret`
4.  **設定 Webhook**：
    *   在 LINE 後台將 Webhook URL 設為：`https://您的專案名稱.netlify.app/.netlify/functions/line-webhook`
    *   開啟 **"Use webhook"** 選項。

---

## 📜 完整資料庫腳本 (SQL)

請將以下內容完整複製並在 Supabase SQL Editor 中執行：

```sql
-- [1] 系統設定表
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_ai_enabled BOOLEAN DEFAULT true,
    active_ai TEXT DEFAULT 'gpt',
    gpt_api_key TEXT,
    gpt_model_name TEXT DEFAULT 'gpt-4.1-mini',
    gpt_temperature FLOAT DEFAULT 0.7,
    gpt_max_tokens INTEGER DEFAULT 2000,
    gpt_reasoning_effort TEXT DEFAULT 'none',
    gpt_verbosity TEXT DEFAULT 'medium',
    gemini_api_key TEXT,
    gemini_model_name TEXT DEFAULT 'gemini-pro',
    gemini_temperature FLOAT DEFAULT 1.0,
    gemini_max_tokens INTEGER DEFAULT 2000,
    gemini_thinking_level TEXT DEFAULT 'high',
    system_prompt TEXT DEFAULT '你是一個專業的客服助手。',
    reference_text TEXT DEFAULT '',
    reference_file_url TEXT DEFAULT '',
    line_channel_access_token TEXT,
    line_channel_secret TEXT,
    handover_keywords TEXT DEFAULT '真人,客服,人工',
    handover_timeout_minutes INTEGER DEFAULT 30,
    agent_user_ids TEXT DEFAULT ''
);

-- [2] 用戶狀態表
CREATE TABLE IF NOT EXISTS public.user_states (
    line_user_id TEXT PRIMARY KEY,
    nickname TEXT,
    is_human_mode BOOLEAN DEFAULT false,
    last_human_interaction TIMESTAMP WITH TIME ZONE,
    last_ai_reset_at TIMESTAMP WITH TIME ZONE,
    last_event_id TEXT -- LINE 去重機制關鍵
);

-- [3] 事件去重表
CREATE TABLE IF NOT EXISTS public.processed_events (
    event_id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- [4] 安全權限設定 (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Auth Access" ON public.settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow Auth Access States" ON public.user_states FOR ALL USING (auth.role() = 'authenticated');

-- [5] 初始化預設資料
INSERT INTO public.settings (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- [6] 儲存空間 (Storage) 權限設定
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge_base', 'knowledge_base', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Allow Public Select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'knowledge_base');
CREATE POLICY "Allow Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'knowledge_base');
CREATE POLICY "Allow Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'knowledge_base');
CREATE POLICY "Allow Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'knowledge_base');
```

---

## 🛠️ 本地開發環境

如果您想修改程式碼，建議使用以下方式同步雲端環境變數：

```bash
# 1. 安裝依賴
npm install

# 2. 安裝 Netlify CLI (推薦)
npm install -g netlify-cli

# 3. 連結雲端專案並啟動
netlify login
netlify link
netlify dev
```

---

## ⚖️ 免責聲明
本專案僅供學習與企業原型搭建使用。請確保在使用 AI API (OpenAI/Google) 時遵守相關服務條款，並妥善保護您的 API 金鑰。