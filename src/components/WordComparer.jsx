import React, { useState } from 'react';
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
            const apiKey = ""; // API key will be provided by Canvas runtime
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
            const result = await response.json();
            const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';
            setComparisonResult(generatedText);

            // Log activity
            await saveProgress({ activities: arrayUnion({ text: `"${wordToCompare}" kelimesini karşılaştırdınız.`, timestamp: serverTimestamp() }) });

        } catch (err) {
            setError(`Bir hata oluştu: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsLearned = async () => {
        const word = inputWord.trim().toLowerCase();
        if (word && !userProgress.learnedWords.includes(word)) {
            await saveProgress({ 
                learnedWords: arrayUnion(word),
                activities: arrayUnion({ text: `"${word}" kelimesini öğrenilenlere eklediniz.`, timestamp: serverTimestamp() })
            });
        }
    };

    return (
        <div className="p-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                <svg className="mr-3 text-purple-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
                    <circle cx="7" cy="7" r="1"></circle>
                </svg>
                Akademik Kelime Karşılaştırma
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <input
                    type="text"
                    value={inputWord}
                    onChange={(e) => setInputWord(e.target.value)}
                    placeholder="Örn: 'significant', 'crucial'"
                    className="flex-grow bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-lg p-3 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all shadow-sm"
                />
                <button
                    onClick={handleCompare}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />} Karşılaştır
                </button>
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
        </div>
    );
};

export default WordComparer;
