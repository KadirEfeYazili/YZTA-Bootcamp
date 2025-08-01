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
  return (
    <div className="flex items-center space-x-1">
      <span className="text-sm text-gray-700 dark:text-gray-200">Yanıt yazıyor</span>
      <span className="flex space-x-1 mt-[2px]">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-300 animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          ></span>
        ))}
      </span>
    </div>
  );
};

const AIChat = ({ saveProgress }) => {
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTypingEffect, setIsTypingEffect] = useState(false);

  const messagesEndRef = useRef(null);

  const quickCommands = [
    'YDS nasıl hazırlanırım?',
    'İngilizce kaynak önerisi',
    'Dil öğrenme tavsiyeleri',
    'Motivasyon için öneriler'
  ];

  useEffect(() => {
    const storedHistory = localStorage.getItem('chatHistory');
    if (storedHistory) {
      try {
        setChatHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Geçmiş sohbet verileri okunamadı:", e);
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTypingEffect]);

  const updateLocalStorage = (updatedHistory) => {
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
  };

  const sendMessage = async (messageText) => {
    const userPrompt = messageText.trim();
    if (!userPrompt) return;

    const userMessage = { role: 'user', text: userPrompt, timestamp: new Date() };
    const newChatHistory = [...chatHistory, userMessage];
    setChatHistory(newChatHistory);
    updateLocalStorage(newChatHistory);
    setPrompt('');
    setError('');
    setIsLoading(true);
    setIsTypingEffect(true);

    console.log(`[${new Date().toLocaleString()}] Kullanıcı mesajı: "${userPrompt}"`);

    try {
       const contextPrompt = `
       Sen bir İngilizce sınav hazırlık asistanısın. Uygulamanın adı PrepMate ve temel amacı, kullanıcıların YDS gibi akademik İngilizce sınavlarına etkili şekilde hazırlanmasına yardımcı olmaktır.

       Uygulama şu özellikleri içerir:
       - Kullanıcılar yapay zeka ile kelimelerin akademik anlamlarını görebilir ve benzer kelimelerle karşılaştırmalı şekilde öğrenebilir.
       - Yapay zeka ile üretilen Kelime kartları (flashcards) aracılığıyla kelime ezberleyebilir.
       - Quiz çözerek öğrendiklerini test edebilir.
       - Yapay zeka destekli Akıl haritası oluşturucu ile konuları zihinsel olarak organize edebilir.
       - Takvime çalışma hedefleri ve hatırlatmalar ekleyebilir.
       - Not alma bölümü ile önemli bilgileri kaydedebilir.

       Kullanıcı, bu alanlardan herhangi biriyle ilgili sorular sorduğunda; açık, kısa ve motive edici yanıtlar ver. Farklı bir şey sorduğunda bunlardan bashsetme. Öğrenmeyi kolaylaştıran bir dille konuş. Gerektiğinde örnek ver.
       `;

       const payload = {
         contents: [
           { role: 'user', parts: [{ text: contextPrompt }] },
           { role: 'user', parts: [{ text: userPrompt }] }
         ]
       };
      const apiKey = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`API Hatası: Sunucu ${response.status} koduyla yanıt verdi.`);

      const result = await response.json();
      const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, bir yanıt oluşturulamadı.';

      const aiMessage = { role: 'ai', text: aiResponse, timestamp: new Date() };
      const updatedHistory = [...newChatHistory, aiMessage];
      setChatHistory(updatedHistory);
      updateLocalStorage(updatedHistory);

      console.log(`[${new Date().toLocaleString()}] AI yanıtı: "${aiResponse.slice(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);

      await saveProgress({
        text: `AI Asistanına bir soru sordunuz: "${userPrompt.substring(0, 50)}${userPrompt.length > 50 ? '...' : ''}"`,
        timestamp: serverTimestamp()
      });

    } catch (err) {
      const errorMessage = `Hata: ${err.message}`;
      const errorEntry = { role: 'ai', text: errorMessage, timestamp: new Date() };
      const updatedHistory = [...chatHistory, userMessage, errorEntry];
      setChatHistory(updatedHistory);
      updateLocalStorage(updatedHistory);
      setError(`Bir hata oluştu: ${err.message}`);
      console.error(`[${new Date().toLocaleString()}] Hata oluştu:`, err.message);
    } finally {
      setIsLoading(false);
      setIsTypingEffect(false);
    }
  };

  const handleSendMessage = () => sendMessage(prompt);
  const handleQuickCommandClick = (cmd) => sendMessage(cmd);

  const clearChat = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
    setError('');
    setIsLoading(false);
    setIsTypingEffect(false);
  };

  return (
    <div className="p-6 animate-fade-in flex flex-col h-full">
      {/* Başlık ve küçük temizle butonu aynı satırda */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
          <svg className="mr-3 text-sky-600 dark:text-sky-400" width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <path d="M13 8H7"></path>
            <path d="M17 12H7"></path>
          </svg>
          PrepChatBot 
        </h2>

        <button
          onClick={clearChat}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm transition"
          type="button"
        >
          Sohbeti Temizle
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-xl shadow-inner p-4 mb-4 overflow-y-auto flex flex-col custom-scrollbar">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex items-end gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'ai' && (
              <img
                src="https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/refs/heads/main/public/images/avatar.png"
                alt="AI asistanı avatarı"
                className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
              />
            )}
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] prose ${
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
            <div className="inline-block px-4 py-3 rounded-lg max-w-[80%] bg-violet-100 text-slate-600 dark:bg-violet-900 dark:text-violet-300 select-none">
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg my-2">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="overflow-x-auto mb-3 mt-1">
        <div className="flex gap-2 w-max min-w-full">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommandClick(cmd)}
              className="whitespace-nowrap bg-violet-200 dark:bg-violet-700 text-violet-900 dark:text-violet-200 rounded-full px-4 py-1 text-sm hover:bg-violet-300 dark:hover:bg-violet-600 transition"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="AI Asistanına bir şeyler sorun..."
          className="flex-grow bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-sky-400 focus:outline-none transition-all resize-none shadow-sm text-sm"
          rows="1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
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





