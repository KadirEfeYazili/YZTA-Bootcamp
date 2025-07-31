// components/Dashboard.jsx
import React, { useEffect } from 'react';
import { Lightbulb, BarChart2, BrainCircuit, GraduationCap, Activity, Clock, BookOpen, XCircle } from 'lucide-react';

import WordCardDisplay from './WordCardDisplay';
import QuizComponent from './QuizComponent';
import MindMapper from './MindMapper';

const Dashboard = ({ userProgress, handleRemoveLearnedWord }) => {

    // userProgress tanımsız gelirse diye güvenli bir varsayılan oluşturuyoruz
    const safeUserProgress = userProgress || {
        reading: { correct: 0, total: 0 },
        learnedWords: [],
        activities: [],
    };
    
    // Değişkenleri güvenli userProgress'ten alıyoruz
    const { reading, learnedWords, activities } = safeUserProgress;
    const currentReading = reading || { correct: 0, total: 0 };
    const currentLearnedWords = learnedWords || [];
    const currentActivities = activities || [];

    // Artık kullanılmadığı için `calculateProficiencyLevel` fonksiyonunu kaldırdık.

    useEffect(() => {
        console.log("Dashboard yüklendi ve userProgress:", userProgress);
    }, [userProgress]);

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in space-y-12">
            
            {/* BAŞLIK */}
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center">
                <svg className="mr-3 text-violet-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                İlerleme Paneli
            </h2>

            {/* YENİ YAPI: Ana Componentler için 2 sütunlu bir grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. KELİME KARTLARI (Eski Dilbilgisi yerine) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
                    <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                        <BookOpen className="mr-2 text-sky-500" size={24} />
                        Kelime Kartları
                    </h3>
                    {/* WordCardDisplay component'ini buraya yerleştiriyoruz */}
                    <WordCardDisplay 
                        // Gerekirse WordCardDisplay'e buradan prop geçebilirsiniz.
                        // Örnek: words={someWordList}
                    />
                </div>

                {/* 2. QUIZ (Eski Genel Uzmanlık yerine) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
                    <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                        <BrainCircuit className="mr-2 text-violet-500" size={24} />
                        Quiz
                    </h3>
                    {/* QuizComponent'i buraya yerleştiriyoruz */}
                    <QuizComponent 
                         // Gerekirse QuizComponent'e buradan prop geçebilirsiniz.
                         // Örnek: userProgress={userProgress}
                    />
                </div>
            </div>

            {/* YENİ YAPI: Akıl Haritası için tam genişlikte bir alan */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                    <Map className="mr-2 text-emerald-500" size={24} />
                    Akıl Haritası Oluşturucu
                </h3>
                {/* MindMapper component'ini buraya yerleştiriyoruz */}
                <MindMapper />
            </div>

            {/* Mevcut Diğer Bölümler (Öğrenilen Kelimeler ve Son Etkinlikler) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Öğrenilen Kelimeler */}
                <div>
                    <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                        <Lightbulb className="mr-2 text-amber-500" size={24} />
                        Öğrenilen Kelimeler ({currentLearnedWords.length})
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700 min-h-[100px]">
                        {currentLearnedWords.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {currentLearnedWords.map((word, index) => (
                                    <span key={index} className="bg-violet-100 dark:bg-slate-700 text-violet-800 dark:text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-sm">
                                        {word}
                                        <button onClick={() => handleRemoveLearnedWord(word)} className="ml-3 text-violet-400 hover:text-red-500 focus:outline-none transition-colors">
                                            <XCircle size={16} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400">Henüz öğrenilen kelimeniz yok.</p>
                        )}
                    </div>
                </div>

                {/* Son Etkinlikler */}
                <div>
                    <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                        <Activity className="mr-2 text-rose-500" size={24} />
                        Son Etkinlikler
                    </h3>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
                        <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                            {currentActivities.length > 0 ? (
                                currentActivities.slice().sort((a, b) => b.timestamp - a.timestamp).map((activity, index) => (
                                    <li key={index} className="flex items-center">
                                        <Clock className="inline mr-3 text-slate-400" size={16} />
                                        {activity.text} - {new Date(activity.timestamp).toLocaleString('tr-TR')}
                                    </li>
                                ))
                            ) : (
                                <li className="text-slate-400 flex items-center"><Clock className="inline mr-3 text-slate-400" size={16} /> Henüz bir etkinlik yok.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
