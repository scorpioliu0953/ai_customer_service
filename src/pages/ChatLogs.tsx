import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, User, Bot, Clock } from 'lucide-react';

export default function ChatLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">歷史對話記錄</h2>
          <p className="text-gray-500">顯示最近 100 筆通訊記錄</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Clock className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">時間</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">發送者</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">對話內容</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">AI 類型</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">尚無記錄</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {log.sender === 'user' ? (
                          <>
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">用戶 ({log.line_user_id.substring(0, 8)}...)</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-700">AI 客服</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-md">
                        {log.message}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.ai_type && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.ai_type === 'gpt' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {log.ai_type.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
