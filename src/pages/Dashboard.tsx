import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RefreshCcw, Copy, Bot, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    fetchSettings();
    // In a real app, this would be your Netlify function URL
    setWebhookUrl(window.location.origin + '/.netlify/functions/line-webhook');
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update(settings)
        .eq('id', settings.id);

      if (error) throw error;
      alert('設定已儲存！');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    alert('Webhook URL 已複製');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `kb/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge_base')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase Upload Error Details:', uploadError);
        throw new Error(uploadError.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('knowledge_base')
        .getPublicUrl(filePath);

      setSettings({ ...settings, reference_file_url: publicUrl });
      alert('檔案上傳成功！請點擊下方的「儲存變更」按鈕。');
    } catch (error: any) {
      console.error('Full Upload Error:', error);
      alert(`上傳失敗：${error.message || '未知錯誤'}。請確認您已在 Supabase 建立名為 knowledge_base 的 Bucket。`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>載入中...</div>;
  if (!settings) return <div>找不到設定檔</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">系統主控台</h2>
          <p className="text-gray-500">管理您的 AI 客服與 LINE 串接設定</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">啟用 AI 客服</span>
            <button
              onClick={() => setSettings({ ...settings, is_ai_enabled: !settings.is_ai_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.is_ai_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.is_ai_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>

      {/* AI Provider Switch */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setSettings({ ...settings, active_ai: 'gpt' })}
          className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 ${settings.active_ai === 'gpt' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className={`p-3 rounded-lg ${settings.active_ai === 'gpt' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Bot className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className="font-bold">OpenAI GPT</h3>
            <p className="text-sm text-gray-500">使用 GPT-3.5/4 模型</p>
          </div>
        </button>
        <button
          onClick={() => setSettings({ ...settings, active_ai: 'gemini' })}
          className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 ${settings.active_ai === 'gemini' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        >
          <div className={`p-3 rounded-lg ${settings.active_ai === 'gemini' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Bot className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className="font-bold">Google Gemini</h3>
            <p className="text-sm text-gray-500">使用 Gemini Pro 模型</p>
          </div>
        </button>
      </div>

      {/* AI Specific Settings */}
      <div className="bg-white p-8 rounded-xl shadow-sm border space-y-6">
        <h3 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          {settings.active_ai === 'gpt' ? 'OpenAI 設定' : 'Gemini 設定'}
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              name={settings.active_ai === 'gpt' ? 'gpt_api_key' : 'gemini_api_key'}
              value={settings.active_ai === 'gpt' ? settings.gpt_api_key : settings.gemini_api_key}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="輸入 API 金鑰"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型名稱</label>
            <input
              type="text"
              name={settings.active_ai === 'gpt' ? 'gpt_model_name' : 'gemini_model_name'}
              value={settings.active_ai === 'gpt' ? settings.gpt_model_name : settings.gemini_model_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                name={settings.active_ai === 'gpt' ? 'gpt_temperature' : 'gemini_temperature'}
                value={settings.active_ai === 'gpt' ? settings.gpt_temperature : settings.gemini_temperature}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                name={settings.active_ai === 'gpt' ? 'gpt_max_tokens' : 'gemini_max_tokens'}
                value={settings.active_ai === 'gpt' ? settings.gpt_max_tokens : settings.gemini_max_tokens}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI System Prompt & Reference */}
      <div className="bg-white p-8 rounded-xl shadow-sm border space-y-6">
        <h3 className="text-lg font-bold border-b pb-4">AI 指令與參考資料</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI 系統指令 (System Prompt)</label>
            <textarea
              name="system_prompt"
              value={settings.system_prompt}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="例如：你是一個專業的化妝品客服，請用親切口吻回答..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">參考資料 (Raw Text)</label>
            <textarea
              name="reference_text"
              value={settings.reference_text}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="輸入 AI 可以參考的產品資訊、價格表或常見問題解答..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">參考檔案上傳 (支援 PDF, TXT)</label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <RefreshCcw className="w-8 h-8 mb-2" />
              <p>{settings.reference_file_url ? '檔案已上傳 (點擊更換)' : '拖曳檔案至此或點擊上傳'}</p>
              {settings.reference_file_url && (
                <p className="text-xs text-blue-600 mt-2 break-all">{settings.reference_file_url}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LINE Settings */}
      <div className="bg-white p-8 rounded-xl shadow-sm border space-y-6">
        <h3 className="text-lg font-bold border-b pb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          LINE 渠道設定
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL (填入 LINE Developer Console)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 font-mono text-sm"
              />
              <button onClick={handleCopyWebhook} className="p-2 border rounded-lg hover:bg-gray-100">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
              <input
                type="password"
                name="line_channel_access_token"
                value={settings.line_channel_access_token}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
              <input
                type="password"
                name="line_channel_secret"
                value={settings.line_channel_secret}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Handover Settings */}
      <div className="bg-white p-8 rounded-xl shadow-sm border space-y-6">
        <h3 className="text-lg font-bold border-b pb-4">人工客服轉接</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">轉接關鍵字 (用半形逗號隔開)</label>
            <input
              type="text"
              name="handover_keywords"
              value={settings.handover_keywords}
              onChange={handleChange}
              placeholder="真人,客服,人工"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">自動轉回 AI 時間 (分鐘)</label>
            <input
              type="number"
              name="handover_timeout_minutes"
              value={settings.handover_timeout_minutes}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
