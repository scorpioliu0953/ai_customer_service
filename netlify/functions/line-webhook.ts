import { Handler } from '@netlify/functions';
import { Client, validateSignature, WebhookEvent } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase with Service Role Key for backend access
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Fetch Settings from Supabase
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (settingsError || !settings) {
    console.error('Settings error:', settingsError);
    return { statusCode: 500, body: 'Failed to fetch settings' };
  }

  const lineConfig = {
    channelAccessToken: settings.line_channel_access_token,
    channelSecret: settings.line_channel_secret,
  };

  // 2. Validate LINE Signature
  const signature = event.headers['x-line-signature'] || '';
  if (!validateSignature(event.body || '', lineConfig.channelSecret, signature)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const lineClient = new Client(lineConfig);
  const events: WebhookEvent[] = JSON.parse(event.body || '').events;

  for (const lineEvent of events) {
    if (lineEvent.type === 'message' && lineEvent.message.type === 'text') {
      const userId = lineEvent.source.userId!;
      const userMessage = lineEvent.message.text;

      // Log user message
      await supabase.from('chat_logs').insert({
        line_user_id: userId,
        message: userMessage,
        sender: 'user',
      });

      // 3. Handle Human Handover Mode
      const { data: userState } = await supabase
        .from('user_states')
        .select('*')
        .eq('line_user_id', userId)
        .single();

      const handoverKeywords = settings.handover_keywords.split(',').map((k: string) => k.trim());
      const isKeywordHit = handoverKeywords.some((k: string) => userMessage.includes(k));

      if (isKeywordHit) {
        await supabase.from('user_states').upsert({
          line_user_id: userId,
          is_human_mode: true,
          last_human_interaction: new Date().toISOString(),
        });
        await lineClient.replyMessage(lineEvent.replyToken, {
          type: 'text',
          text: '已為您轉接真人客服，請稍候。',
        });
        continue;
      }

      // Check if human mode should timeout
      if (userState?.is_human_mode) {
        const lastInteraction = new Date(userState.last_human_interaction).getTime();
        const now = new Date().getTime();
        const timeoutMs = settings.handover_timeout_minutes * 60 * 1000;

        if (now - lastInteraction < timeoutMs) {
          // Still in human mode
          continue;
        } else {
          // Timeout, back to AI
          await supabase.from('user_states').upsert({
            line_user_id: userId,
            is_human_mode: false,
          });
        }
      }

      // 4. Check if AI is enabled
      if (!settings.is_ai_enabled) continue;

      // 5. Get Context (Last 5 messages)
      const { data: contextLogs } = await supabase
        .from('chat_logs')
        .select('message, sender')
        .eq('line_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const history = contextLogs?.reverse() || [];

      // 6. Call AI
      let aiResponse = '';
      if (settings.active_ai === 'gpt') {
        aiResponse = await callGPT(settings, history, userMessage);
      } else {
        aiResponse = await callGemini(settings, history, userMessage);
      }

      // 7. Reply and Log
      if (aiResponse) {
        await lineClient.replyMessage(lineEvent.replyToken, {
          type: 'text',
          text: aiResponse,
        });

        await supabase.from('chat_logs').insert({
          line_user_id: userId,
          message: aiResponse,
          sender: 'ai',
          ai_type: settings.active_ai,
        });
      }
    }
  }

  return { statusCode: 200, body: 'OK' };
};

async function callGPT(settings: any, history: any[], currentMessage: string) {
  const openai = new OpenAI({ apiKey: settings.gpt_api_key });
  
  const messages: any[] = [
    { role: 'system', content: `${settings.system_prompt}\n\n參考資料：\n${settings.reference_text}` }
  ];

  for (const h of history) {
    messages.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.message });
  }

  // Current message is already in history? No, history was fetched *before* logging current?
  // Let's make sure current is included if not already.
  if (history[history.length - 1]?.message !== currentMessage) {
    messages.push({ role: 'user', content: currentMessage });
  }

  const completion = await openai.chat.completions.create({
    model: settings.gpt_model_name,
    messages: messages,
    temperature: settings.gpt_temperature,
    max_tokens: settings.gpt_max_tokens,
  });

  return completion.choices[0].message.content || '';
}

async function callGemini(settings: any, history: any[], currentMessage: string) {
  const genAI = new GoogleGenerativeAI(settings.gemini_api_key);
  const model = genAI.getGenerativeModel({ model: settings.gemini_model_name });

  const chat = model.startChat({
    history: history.map(h => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.message }],
    })),
    generationConfig: {
      temperature: settings.gemini_temperature,
      maxOutputTokens: settings.gemini_max_tokens,
    },
  });

  const prompt = `System Instructions: ${settings.system_prompt}\n\nReference Info: ${settings.reference_text}\n\nUser Message: ${currentMessage}`;
  
  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  return response.text();
}
