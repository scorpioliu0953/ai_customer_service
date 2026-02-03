-- Settings table to store AI and LINE configuration
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Global Switch
    is_ai_enabled BOOLEAN DEFAULT true,
    
    -- AI Selection
    active_ai TEXT DEFAULT 'gpt', -- 'gpt' or 'gemini'
    
    -- GPT Settings
    gpt_api_key TEXT,
    gpt_model_name TEXT DEFAULT 'gpt-3.5-turbo',
    gpt_temperature FLOAT DEFAULT 0.7,
    gpt_max_tokens INTEGER DEFAULT 500,
    
    -- Gemini Settings
    gemini_api_key TEXT,
    gemini_model_name TEXT DEFAULT 'gemini-pro',
    gemini_temperature FLOAT DEFAULT 0.7,
    gemini_max_tokens INTEGER DEFAULT 500,
    
    -- Common AI Settings
    system_prompt TEXT DEFAULT '你是一個專業的客服助手。',
    reference_text TEXT DEFAULT '',
    reference_file_url TEXT DEFAULT '',
    
    -- LINE Settings
    line_channel_access_token TEXT,
    line_channel_secret TEXT,
    
    -- Handover Settings
    handover_keywords TEXT DEFAULT '真人,客服,人工',
    handover_timeout_minutes INTEGER DEFAULT 30
);

-- Chat Logs table
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    line_user_id TEXT NOT NULL,
    user_name TEXT,
    message TEXT NOT NULL,
    sender TEXT NOT NULL, -- 'user' or 'ai'
    ai_type TEXT -- 'gpt' or 'gemini'
);

-- User state table to track handover mode
CREATE TABLE IF NOT EXISTS public.user_states (
    line_user_id TEXT PRIMARY KEY,
    is_human_mode BOOLEAN DEFAULT false,
    last_human_interaction TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

-- Simple policies (for prototype, usually you'd restrict to authenticated admins)
CREATE POLICY "Allow authenticated access to settings" ON public.settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to chat_logs" ON public.chat_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access to user_states" ON public.user_states
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert a default row if not exists
INSERT INTO public.settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.settings);
