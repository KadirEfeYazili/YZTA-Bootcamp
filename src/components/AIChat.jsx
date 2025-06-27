import React, { useState } from 'react';
import { MessageSquareText, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AIChat = () => {
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendMessage = async () => {
    if (!prompt.trim()) return;
    const newChatHistory = [...chatHistory, { role: 'user', text: prompt }];
    setChatHistory(newChatHistory);
    setPrompt('');
    setIsLoading(true);
    setError('');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      });
      if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
      const result = await response.json();
      const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, yanıt oluşturulamadı.';
      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (err) {
      setError(`Bir hata oluştu: ${err.message}`);
      setChatHistory(prev => [...prev, { role: 'ai', text: `Hata: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 animate-fade-in flex flex-col h-full">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
        <MessageSquareText className="mr-3 text-sky-600" size={28} />
        AI Sohbet Asistanı
      </h2>
      <div className="flex-1 bg-white border border-violet-200 rounded-xl shadow-inner p-4 mb-4 overflow-y-auto flex flex-col-reverse custom-scrollbar">
        {chatHistory.slice().reverse().map((message, index) => (
          <div key={index} className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`inline-block p-3 rounded-lg max-w-[80%] ${message.role === 'user' ? 'bg-violet-600 text-white rounded-br-none' : 'bg-violet-100 text-slate-800 rounded-bl-none'} prose`}>
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-center items-center py-4"><Loader2 className="animate-spin text-violet-400" size={32} /></div>}
        {error && <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg my-2">{error}</div>}
      </div>
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="AI Asistanına bir şeyler sorun..."
          className="flex-grow bg-white border border-violet-200 rounded-lg p-3 text-slate-700 focus:ring-2 focus:ring-sky-400 focus:outline-none transition-all resize-none shadow-sm"
          rows="2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        ></textarea>
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:bg-sky-300"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
        </button>
      </div>
    </div>
  );
};

export default AIChat;