import React, { useState } from 'react';
import { Map, Loader2, PlusCircle } from 'lucide-react'; 
import ReactMarkdown from 'react-markdown';
import { arrayUnion, serverTimestamp } from 'firebase/firestore'; 

// MindMapper bileşeni, saveProgress ve userProgress proplarını App.jsx'ten alacak
const MindMapper = ({ saveProgress, userProgress }) => { 
    const [topic, setTopic] = useState('');
    const [textResult, setTextResult] = useState('');
    const [textLoading, setTextLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Öğrenilen kelimeler listesini userProgress prop'undan al
    const learnedWords = userProgress?.learnedWords || [];

    /**
     * Kullanıcının konusuna göre akıl haritası metni oluşturmayı yönetir.
     * Hiyerarşik bir metin oluşturmak için gemini-2.5-flash modelini kullanır.
     */
    const handleGenerateText = async () => {
        if (!topic.trim()) { setError('Lütfen bir konu girin.'); return; }
        setTextLoading(true);
        setTextResult(''); // Önceki metin sonucunu temizle
        setError(''); // Önceki hataları temizle

        const prompt = `"${topic}" konusu hakkında hiyerarşik bir akıl haritası metni oluştur. Format: Ana Konu: ... - Başlık 1...`;

        try {
            const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
            const apiKey = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo"; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API Hatası: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Metin oluşturulamadı.';
            setTextResult(generatedText);

            // Etkinliği Firestore'a kaydet
            await saveProgress({ 
                activities: arrayUnion({ 
                    text: `"${topic}" konusunda akıl haritası metni oluşturdunuz.`, 
                    timestamp: new Date() 
                }) 
            });

        } catch (err) {
            setError(`Bir hata oluştu: ${err.message}`);
        } finally {
            setTextLoading(false); 
        }
    };

    /**
     * Mevcut konuyu öğrenilen kelimeler listesine ekler.
     */
    const handleMarkAsLearned = async () => {
        const topicToMark = topic.trim().toLowerCase();

        console.log('handleMarkAsLearned çağrıldı. Konu:', topicToMark);
        console.log('Mevcut öğrenilen kelimeler:', learnedWords);
        console.log('userProgress:', userProgress);
        console.log('saveProgress fonksiyonu:', saveProgress);

        if (!topicToMark) {
            setError('Lütfen öğrenildi olarak işaretlemek için bir konu girin.');
            return;
        }

        if (!saveProgress) {
            setError('saveProgress fonksiyonu tanımlı değil.');
            console.error('saveProgress fonksiyonu undefined!');
            return;
        }

        if (!userProgress) {
            console.log('userProgress undefined, boş obje ile devam ediliyor...');
        }

        // learnedWords içinde varsa ekleme
        if (learnedWords.includes(topicToMark)) {
            setError(`"${topicToMark}" konusu zaten öğrenilenler listenizde.`);
            return;
        }

        try {
            console.log('Firestore\'a kaydediliyor:', topicToMark);
            
            const updateData = {
                learnedWords: arrayUnion(topicToMark),
                activities: arrayUnion({
                    text: `"${topicToMark}" konusunu öğrenilenlere eklediniz.`,
                    timestamp: new Date()
                }),
            };
            
            console.log('Kaydetme verisi:', updateData);
            
            const result = await saveProgress(updateData);
            console.log('saveProgress sonucu:', result);
            
            setError(''); // Hata mesajını temizle
            console.log('Başarıyla kaydedildi:', topicToMark);
            
            // Başarı mesajı göster
            setSuccessMessage(`"${topicToMark}" başarıyla öğrenilenlere eklendi!`);
            setError(''); 
            
            // Başarı mesajını 3 saniye sonra temizle
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            
        } catch (saveError) {
            console.error("Kelime kaydedilirken hata:", saveError);
            console.error("Hata detayları:", saveError.stack);
            setError(`Konu kaydedilirken hata oluştu: ${saveError.message}`);
        }
    };

    return (
        <div className="p-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6 flex items-center"> 
                <Map className="mr-3 text-rose-600" size={32} />
                Akıl Haritası Oluşturucu 
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Akıl haritası konusu"
                    className="flex-grow bg-white border border-violet-200 rounded-lg p-3 text-slate-700 focus:ring-2 focus:ring-rose-400 focus:outline-none transition-all shadow-sm"
                />
                <button
                    onClick={handleGenerateText}
                    disabled={textLoading}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:bg-rose-300"
                >
                    {textLoading ? <Loader2 className="animate-spin mr-2" /> : <Map className="mr-2" />} Harita Metni Oluştur
                </button>
            </div>
            {error && <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
            {successMessage && <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{successMessage}</div>}

            {textResult && (
                <div className="mt-6 bg-white border border-violet-200 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Oluşturulan Metin</h3>
                    <div className="prose max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">
                        <ReactMarkdown>{textResult}</ReactMarkdown>
                    </div>
                    {/* Öğrenildi Olarak İşaretle butonu eklendi */}
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleMarkAsLearned}
                            disabled={!topic.trim() || learnedWords.includes(topic.trim().toLowerCase())}
                            className="bg-teal-500 hover:bg-teal-600 active:scale-95 text-white font-bold py-2 px-4 rounded-full flex items-center transition-all shadow hover:shadow-md disabled:bg-teal-200 disabled:cursor-not-allowed"
                        >
                            <PlusCircle className="mr-2" /> Öğrenildi Olarak İşaretle
                        </button>
                    </div>
                </div>
            )}
            
            {learnedWords.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Öğrenilen Konular</h3>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {learnedWords.map((word, index) => (
                            <span key={index} className="bg-violet-100 text-violet-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                                {word}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MindMapper;
