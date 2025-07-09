import React, { useState } from 'react';
import { Map, Loader2, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';

const MindMapper = ({ saveProgress }) => {
    const [topic, setTopic] = useState('');
    const [textResult, setTextResult] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [textLoading, setTextLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateText = async () => {
        if (!topic.trim()) { setError('Lütfen bir konu girin.'); return; }
        setTextLoading(true);
        setTextResult(''); setImageUrl(''); setError('');
        const prompt = `"${topic}" konusu hakkında hiyerarşik bir akıl haritası metni oluştur. Format: Ana Konu: ... - Başlık 1...`;
        try {
            const payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
            const result = await response.json();
            const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Metin oluşturulamadı.';
            setTextResult(generatedText);

            // Log activity
            await saveProgress({ activities: arrayUnion({ text: `"${topic}" konusunda akıl haritası metni oluşturdunuz.`, timestamp: serverTimestamp() }) });

        } catch (err) { setError(`Bir hata oluştu: ${err.message}`); } finally { setTextLoading(false); }
    };

    const handleVisualize = async () => {
        if (!textResult) return;
        setImageLoading(true); setImageUrl(''); setError('');
        const prompt = `Create a mind map diagram based on this text. Use a light theme with a soft lilac background (#f5f3ff). The central topic should be prominent, with elegant, curved, deep purple lines branching out to sub-topics. Nodes should be pill-shaped with a white background and have clear, dark purple text inside. Make it look like a modern, clean data visualization. Text: "${textResult}"`;
        try {
            const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
            const result = await response.json();
            const generatedImageUrl = `data:image/png;base64,${result.predictions?.[0]?.bytesBase64Encoded}`;
            setImageUrl(generatedImageUrl);

            // Log activity
            await saveProgress({ activities: arrayUnion({ text: `"${topic}" konusunda bir akıl haritası görseli oluşturdunuz.`, timestamp: serverTimestamp() }) });

        } catch (err) { setError(`Resim oluşturulurken hata: ${err.message}`); } finally { setImageLoading(false); }
    };

    return (
        <div className="p-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                <Map className="mr-3 text-rose-600 dark:text-rose-400" size={32} />
                Akıl Haritası Oluşturucu
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Akıl haritası konusu"
                    className="flex-grow bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-lg p-3 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-400 focus:outline-none transition-all shadow-sm"
                />
                <button
                    onClick={handleGenerateText}
                    disabled={textLoading}
                    className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-700 dark:hover:bg-rose-800 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:bg-rose-300 disabled:dark:bg-rose-900"
                >
                    {textLoading ? <Loader2 className="animate-spin mr-2" /> : <Map className="mr-2" />} Harita Metni Oluştur
                </button>
            </div>
            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            {textResult && (
                <div className="mt-6 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-700 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Oluşturulan Metin</h3>
                    <div className="prose max-w-none text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap mb-4">
                        <ReactMarkdown>{textResult}</ReactMarkdown>
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={handleVisualize}
                            disabled={imageLoading}
                            className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-800 text-white font-bold py-2 px-6 rounded-full flex items-center transition-colors shadow hover:shadow-md disabled:bg-violet-300 disabled:dark:bg-violet-900"
                        >
                            {imageLoading ? <Loader2 className="animate-spin mr-2" /> : <ImageIcon className="mr-2" />} Görselleştir
                        </button>
                    </div>
                </div>
            )}
            {imageLoading && (
                <div className="mt-6 flex justify-center items-center h-80 bg-violet-100/50 dark:bg-violet-900/50 rounded-lg border border-violet-200 dark:border-violet-700">
                    <Loader2 className="animate-spin text-violet-500 dark:text-violet-300" size={48} />
                </div>
            )}
            {imageUrl && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 text-center">Görselleştirilmiş Akıl Haritası</h3>
                    <div className="bg-violet-100/50 dark:bg-violet-900/50 p-4 rounded-lg border border-violet-200 dark:border-violet-700">
                        <img src={imageUrl} alt="Oluşturulan Akıl Haritası" className="rounded-md shadow-lg w-full h-auto mx-auto" />
                    </div>
                </div>
            )}
        </div>
    );
};


export default MindMapper; 

