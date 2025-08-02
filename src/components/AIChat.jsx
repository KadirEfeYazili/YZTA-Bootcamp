import React, { useState, useEffect } from 'react';
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
  return <span>Yanıt yazıyor{dots}</span>;
};

const AIChat = ({ saveProgress, isVisible }) => {
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTypingEffect, setIsTypingEffect] = useState(false);

  const quickCommands = [
    'YDS nasıl hazırlanırım?',
    'İngilizce kaynak önerisi',
    'Dil öğrenme tavsiyeleri',
    'Motivasyon için öneriler'
  ];

  const handleSendMessage = async () => {
    if (!prompt.trim()) return;
    const userPrompt = prompt.trim();
    const newChatHistory = [...chatHistory, { role: 'user', text: userPrompt, timestamp: new Date() }];
    setChatHistory(newChatHistory);
    setPrompt('');
    setError('');
    setIsLoading(true);
    setIsTypingEffect(true);

    try {
      const payload = { contents: [{ role: 'user', parts: [{ text: userPrompt }] }] };
      const apiKey = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo"; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
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
    setPrompt(cmd);
    handleSendMessage(); // Direkt mesaj gönder
  };

  return (
    <div className={`p-6 animate-fade-in flex flex-col h-full ${isVisible ? '' : 'hidden'}`}>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
        <svg
          className="mr-3 text-sky-600 dark:text-sky-400"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <path d="M13 8H7"></path>
          <path d="M17 12H7"></path>
        </svg>
        PrepMate Sohbet Asistanı
      </h2>

      <div className="mb-4 flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
        {quickCommands.map((cmd, i) => (
          <button
            key={i}
            onClick={() => handleQuickCommandClick(cmd)}
            className="bg-violet-200 dark:bg-violet-700 text-violet-900 dark:text-violet-200 rounded-full px-4 py-1 text-sm hover:bg-violet-300 dark:hover:bg-violet-600 transition whitespace-nowrap"
          >
            {cmd}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-xl shadow-inner p-4 mb-4 overflow-y-auto flex flex-col-reverse custom-scrollbar w-full">
        {chatHistory.slice().reverse().map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex items-end gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'ai' && (
              <img
                src="/images/avatar.png"
                alt="AI asistanı avatarı"
                className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
              />
            )}
            <div
              className={`inline-block p-2 rounded-lg max-w-[85%] prose ${
                message.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-none dark:bg-violet-700'
                  : 'bg-violet-100 text-slate-800 rounded-bl-none dark:bg-violet-900 dark:text-violet-300'
              }`}
            >
              <ReactMarkdown>{message.text}</ReactMarkdown>
              <div className="text-xs mt-1 text-right text-gray-900 dark:text-gray-100 select-none">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {isTypingEffect && (
          <div className="mb-4 flex items-end gap-3 justify-start">
            <img
              src="https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/refs/heads/main/public/images/avatar.png"
              alt="AI avatar"
              className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
            />
            <div className="inline-block px-4 py-2 rounded-lg max-w-[85%] bg-violet-100 text-slate-600 dark:bg-violet-900 dark:text-violet-300 select-none">
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg my-2">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-2">
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
        ></textarea>
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:bg-sky-300"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
        </button>
      </div>
    </div>
  );
};

export default AIChat;
