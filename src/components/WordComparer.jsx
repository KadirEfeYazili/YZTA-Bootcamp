// src/components/WordComparer.jsx
import React, { useState, useEffect } from 'react'; // useEffect eklendi
import { Send, Loader2, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';

const WordComparer = ({ userProgress, saveProgress }) => {
    const [inputWord, setInputWord] = useState('');
    const [comparisonResult, setComparisonResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCompare = async () => {
        if (!inputWord.trim()) {
            setError('Lütfen karşılaştırmak için bir kelime girin.');
            return;
        }
        setIsLoading(true);
        setComparisonResult('');
        setError('');
        const wordToCompare = inputWord.trim();
        const prompt = `YDS ve YÖKDİL sınavlarına hazırlananlar için, "${wordToCompare}" kelimesinin akademik eş anlamlılarını, zıt anlamlılarını ve aralarındaki kullanım nüanslarını karşılaştırmalı olarak açıkla. Örnek cümleler (İngilizce ve Türkçe) ekle. Yanıt Türkçe ve madde madde olsun.`;
        try {
            const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
            // Düzeltildi: API anahtarı Canvas ortamı tarafından sağlanacak şekilde boş bırakıldı.
            const apiKey = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo"; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setComparisonResult(text);
                // Başarılı API çağrısını aktivitelere ekle
                if (saveProgress) {
                    await saveProgress({
                        activities: arrayUnion({
                            text: `"${wordToCompare}" kelimesini karşılaştırdınız.`,
                            timestamp: new Date() // Düzeltildi: serverTimestamp() yerine new Date() kullanıldı
                        })
                    });
                }
            } else {
                setError('API\'den beklenen yanıt alınamadı. Lütfen tekrar deneyin.');
                console.error("API response structure unexpected:", result);
            }
        } catch (err) {
            console.error('Kelime karşılaştırma hatası:', err);
            setError('Kelime karşılaştırma sırasında bir hata oluştu: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsLearned = async () => {
        if (!inputWord.trim()) {
            setError('Öğrenildi olarak işaretlemek için önce bir kelime girin.');
            return;
        }
        const wordToMark = inputWord.trim().toLowerCase();
        if (userProgress.learnedWords.includes(wordToMark)) {
            setStatusMessage(`"${wordToMark}" kelimesi zaten öğrenilenler listenizde.`);
            return;
        }

        try {
            if (saveProgress) {
                await saveProgress({
                    learnedWords: arrayUnion(wordToMark),
                    activities: arrayUnion({
                        text: `"${wordToMark}" kelimesini öğrenildi olarak işaretlediniz.`,
                        timestamp: new Date() // Düzeltildi: serverTimestamp() yerine new Date() kullanıldı
                    })
                });
                setStatusMessage(`"${wordToMark}" başarıyla öğrenildi olarak işaretlendi!`);
            }
        } catch (err) {
            console.error("Öğrenildi olarak işaretleme hatası:", err);
            setStatusMessage('Öğrenildi olarak işaretlenirken hata oluştu: ' + err.message);
        }
    };

    // Status mesajını otomatik temizle
    const [statusMessage, setStatusMessage] = useState('');
    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => {
                setStatusMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);


    return (
        <div className="p-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 flex items-center">
                <svg className="mr-3 text-violet-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Kelime Karşılaştırma
            </h2>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700 mb-8">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                    YDS ve YÖKDİL gibi akademik sınavlara yönelik kelimelerin eş ve zıt anlamlılarını, kullanım nüanslarını ve örnek cümlelerini öğrenin.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Karşılaştırmak istediğiniz kelimeyi girin..."
                        value={inputWord}
                        onChange={(e) => setInputWord(e.target.value)}
                        className="flex-1 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                        onClick={handleCompare}
                        disabled={isLoading}
                        className="py-3 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out flex items-center justify-center"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin mr-2" size={20} />
                        ) : (
                            <Send size={20} className="mr-2" />
                        )}
                        {isLoading ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
                    </button>
                </div>
            </div>
            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            {comparisonResult && (
                <div className="mt-6 bg-violet-50/70 dark:bg-slate-700/70 border border-violet-200 dark:border-violet-700 rounded-lg p-6">
                    <div className="prose max-w-none text-slate-700 dark:text-slate-200 leading-relaxed">
                        <ReactMarkdown>{comparisonResult}</ReactMarkdown>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleMarkAsLearned}
                            disabled={!inputWord.trim() || userProgress.learnedWords.includes(inputWord.trim().toLowerCase())}
                            className="bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-full flex items-center transition-colors shadow hover:shadow-md disabled:bg-teal-200 disabled:cursor-not-allowed"
                        >
                            <PlusCircle className="mr-2" /> Öğrenildi Olarak İşaretle
                        </button>
                    </div>
                </div>
            )}
            {statusMessage && (
                <div className="mt-4 p-3 text-sm rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 text-center max-w-md mx-auto">
                    {statusMessage}
                </div>
            )}
        </div>
    );
};

export default WordComparer;
