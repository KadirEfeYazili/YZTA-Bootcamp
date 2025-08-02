import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { serverTimestamp } from 'firebase/firestore';

const formatTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const TypingDots = () => {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d.length < 3 ? d + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return `Yanıt yazıyor${dots}`;
};

const AIChat = ({ chatHistory, setChatHistory, saveProgress }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  const chatEndRef = useRef(null);

  const quickCommands = [
    'YDS nasıl hazırlanırım?',
    'İngilizce kaynak önerisi',
    'Dil öğrenme tavsiyeleri',
    'Motivasyon için öneriler'
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTypingEffect]);

  const handleSendMessage = async (messageToSend) => {
    const userPrompt = messageToSend || prompt.trim();
    if (!userPrompt) return;

    const newChatHistory = [...chatHistory, { role: 'user', text: userPrompt, timestamp: new Date() }];
    setChatHistory(newChatHistory);
    setPrompt('');
    setError('');
    setIsLoading(true);
    setIsTypingEffect(true);
    
    const apiKey = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const payload = { contents: [{ role: 'user', parts: [{ text: userPrompt }] }] };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API Hatası: Sunucu ${response.status} koduyla yanıt verdi.`);
      }

      const result = await response.json();
      const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, bir yanıt oluşturulamadı.';

      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse, timestamp: new Date() }]);

      const newActivityObject = {
        text: `AI Asistanına bir soru sordunuz: "${userPrompt.substring(0, 50)}${userPrompt.length > 50 ? '...' : ''}"`,
        timestamp: serverTimestamp()
      };
      await saveProgress(newActivityObject);
    } catch (err) {
      setError(`Bir hata oluştu: ${err.message}`);
      setChatHistory(prev => [...prev, { role: 'ai', text: `Hata: ${err.message}`, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      setIsTypingEffect(false);
    }
  };

  const handleQuickCommandClick = (cmd) => {
    handleSendMessage(cmd);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-violet-500 text-white rounded-t-lg shadow-md">
        <div className="w-10 h-10 flex-shrink-0 bg-white rounded-full flex items-center justify-center">
          <img src="/img/ai-avatar.png" alt="AI Avatar" className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold">PrepMate Sohbet Asistanı</h2>
      </div>

      {/* Quick Commands - Now with horizontal scroll */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-b border-violet-200 dark:border-violet-700 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex gap-2">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommandClick(cmd)}
              className="bg-violet-200 dark:bg-violet-700 text-violet-900 dark:text-violet-200 rounded-full px-4 py-1 text-sm hover:bg-violet-300 dark:hover:bg-violet-600 transition flex-shrink-0"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Chat History - Expanded and with reduced padding */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'ai' && (
              <div className="w-8 h-8 flex-shrink-0 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mt-1">
                <img src="/img/ai-avatar.png" alt="AI Avatar" className="w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-xl shadow-md p-3 text-sm leading-snug ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}
            >
              <ReactMarkdown>{message.text}</ReactMarkdown>
              <div
                className={`text-[10px] opacity-70 mt-1 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {isTypingEffect && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 flex-shrink-0 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mt-1">
              <img src="/img/ai-avatar.png" alt="AI Avatar" className="w-5 h-5" />
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-xl rounded-bl-none shadow-md p-3 text-sm animate-pulse">
              <TypingDots />
            </div>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-t border-violet-200 dark:border-violet-700">
        <div className="flex items-end gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI Asistanına bir şeyler sorun..."
            className="flex-grow bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-lg p-3 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-sky-400 focus:outline-none transition-all resize-none shadow-sm"
            rows="2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !prompt.trim()}
            className="flex-shrink-0 bg-violet-500 text-white rounded-lg p-3 h-11 w-11 flex items-center justify-center hover:bg-violet-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
