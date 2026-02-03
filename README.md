# 🤖 AI 客服系統 (LINE + Supabase + React)

這是一個企業級的 AI 客服後台，支援 OpenAI GPT-5/4、Google Gemini 3/1.5 以及真人客服轉接通知。

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/scorpioliu0953/ai_customer_service)

## 🌟 功能亮點
- **雙 AI 引擎**：支援最新的 GPT-5 (Responses API) 與 Gemini 3 (Thinking Level)。
- **知識庫支援**：支援純文字與 PDF 檔案參考，AI 會根據資料內容進行回答。
- **真人轉接機制**：自動偵測關鍵字，發送 LINE 通知給專員，並提供手動轉回 AI 的管理後台。

---

## 🚀 快速安裝步驟

### 1. Fork 本專案
點擊頁面右上角的 **Fork** 按鈕，將本專案複製到您的 GitHub 帳號下。

### 2. 資料庫設定 (Supabase)
1. 建立 [Supabase](https://supabase.com/) 專案。
2. 前往 **SQL Editor**，複製並執行下方的 **「完整資料庫腳本」**。
3. 在 **Authentication > Users** 建立一組管理員帳號（用於登入後台）。

### 3. 一鍵部署至 Netlify
1. 點擊上方的 **Deploy to Netlify** 按鈕，或手動連結您的 GitHub 專案。
2. 在 Netlify 控制台的 **Environment variables** 設定以下變數：

| 變數名稱 | 來源 | 說明 |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase API | 前端連接資料庫用 |
| `VITE_SUPABASE_ANON_KEY` | Supabase API | 前端公開金鑰 |
| `SUPABASE_URL` | Supabase API | 後端 Function 用 (與前端相同) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API | **隱私** 後端專用最高權限金鑰 |

---

## 📜 完整資料庫腳本 (SQL)
請將以下內容完整複製到 Supabase 的 SQL Editor 中執行（這會自動建立 Table 與 Storage 權限）：

```sql
-- 1. 設定表
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_ai_enabled BOOLEAN DEFAULT true,
    active_ai TEXT DEFAULT 'gpt',
    gpt_api_key TEXT,
    gpt_model_name TEXT DEFAULT 'gpt-4o',
    gpt_temperature FLOAT DEFAULT 0.7,
    gpt_max_tokens INTEGER DEFAULT 500,
    gpt_reasoning_effort TEXT DEFAULT 'none',
    gpt_verbosity TEXT DEFAULT 'medium',
    gemini_api_key TEXT,
    gemini_model_name TEXT DEFAULT 'gemini-pro',
    gemini_temperature FLOAT DEFAULT 1.0,
    gemini_max_tokens INTEGER DEFAULT 500,
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

-- 2. 用戶狀態表
CREATE TABLE IF NOT EXISTS public.user_states (
    line_user_id TEXT PRIMARY KEY,
    nickname TEXT,
    is_human_mode BOOLEAN DEFAULT false,
    last_human_interaction TIMESTAMP WITH TIME ZONE,
    last_ai_reset_at TIMESTAMP WITH TIME ZONE,
    last_event_id TEXT
);

-- 3. 啟用 RLS 與初始資料
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Auth Access" ON public.settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow Auth Access States" ON public.user_states FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO public.settings (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- 4. 儲存空間權限 (Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledge_base', 'knowledge_base', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow Public Select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'knowledge_base');
CREATE POLICY "Allow Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'knowledge_base');
CREATE POLICY "Allow Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'knowledge_base');
CREATE POLICY "Allow Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'knowledge_base');
```