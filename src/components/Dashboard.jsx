import React, { useEffect } from 'react';
import { Lightbulb, BarChart2, BrainCircuit, GraduationCap, Activity, Clock, BookOpen, XCircle } from 'lucide-react';

// Yardımcı fonksiyon: Yeterlilik seviyesini hesapla
// Bu fonksiyon artık doğrudan Dashboard.jsx içinde tanımlıdır.
const calculateProficiencyLevel = (progress) => {
    // Gelen progress nesnesinin ve reading özelliğinin varlığını kontrol et
    if (!progress || !progress.reading) {
        console.warn("calculateProficiencyLevel: 'progress' veya 'progress.reading' tanımsız. Varsayılan olarak 0 döndürülüyor.");
        return 0; // Eğer progress veya reading tanımsızsa 0 döndür
    }

    const { correct, total } = progress.reading;

    // correct ve total değerlerinin sayı olduğundan emin ol ve eğer undefined/null ise 0 olarak al
    const safeCorrect = typeof correct === 'number' ? correct : 0;
    const safeTotal = typeof total === 'number' ? total : 0;

    if (safeTotal === 0) {
        return 0;
    }
    // Yüzdeyi hesaplarken sadece okuma verilerini kullanıyoruz.
    return (safeCorrect / safeTotal) * 100;
};

const Dashboard = ({ userProgress, handleRemoveLearnedWord }) => {
    // userProgress prop'unun içeriğini konsola yazdır
    useEffect(() => {
        console.log("Dashboard Bileşeni yüklendi.");
        console.log("Dashboard useEffect: userProgress", userProgress);
        if (userProgress) {
            console.log("Dashboard useEffect: userProgress.reading", userProgress.reading);
            console.log("Dashboard useEffect: userProgress.grammar", userProgress.grammar);
            console.log("Dashboard useEffect: userProgress.learnedWords", userProgress.learnedWords);
            console.log("Dashboard useEffect: userProgress.activities", userProgress.activities);
        } else {
            console.log("Dashboard useEffect: userProgress tanımsız veya boş.");
        }
    }, [userProgress]); // userProgress değiştiğinde bu effect'i tekrar çalıştır

    // userProgress'in undefined olmaması için varsayılan değerler sağlayın
    // Bu, prop'un tamamen boş gelmesi durumunda bile bileşenin çökmesini engeller.
    const safeUserProgress = userProgress || {
        reading: { correct: 0, total: 0 },
        grammar: { correct: 0, total: 0 },
        learnedWords: [],
        activities: [],
        chatHistory: []
    };

    // calculateProficiencyLevel'a safeUserProgress gönder
    const proficiencyLevel = calculateProficiencyLevel(safeUserProgress);
    console.log("Hesaplanan Uzmanlık Seviyesi:", proficiencyLevel);

    // Reading, grammar, learnedWords ve activities verilerine güvenli erişim için
    // safeUserProgress'ten desctructuring yapıyoruz.
    const { reading, grammar, learnedWords, activities } = safeUserProgress;

    // Her bir değerin de varsayılan olarak doğru olduğundan emin olalım
    const currentReading = reading || { correct: 0, total: 0 };
    const currentGrammar = grammar || { correct: 0, total: 0 };
    const currentActivities = activities || [];
    const currentLearnedWords = learnedWords || [];


    return (
        <div className="p-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 flex items-center">
                <svg className="mr-3 text-violet-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                İlerleme Paneli
            </h2>

            {/* General Progress Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-violet-100 dark:border-slate-700 transition-all hover:shadow-xl">
                    <BookOpen className="text-purple-500" size={32} />
                    <div>
                        <p className="text-slate-500 dark:text-slate-400">Okuduğunu Anlama</p>
                        <p className="text-2xl font-semibold text-slate-800 dark:text-white">{currentReading.correct} / {currentReading.total} Doğru</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-violet-100 dark:border-slate-700 transition-all hover:shadow-xl">
                    <BrainCircuit className="text-violet-500" size={32} />
                    <div>
                        <p className="text-slate-500 dark:text-slate-400">Dilbilgisi</p>
                        <p className="text-2xl font-semibold text-slate-800 dark:text-white">{currentGrammar.correct} / {currentGrammar.total} Doğru</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-violet-100 dark:border-slate-700 transition-all hover:shadow-xl">
                    <GraduationCap className="text-fuchsia-500" size={32} />
                    <div>
                        <p className="text-slate-500 dark:text-slate-400">Genel Uzmanlık Seviyesi</p>
                        <p className="text-2xl font-semibold text-slate-800 dark:text-white">{proficiencyLevel.toFixed(1)}%</p> {/* Yüzde olarak göster */}
                    </div>
                </div>
            </div>

            {/* Learned Words */}
            <div className="mb-8">
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                    <Lightbulb className="mr-2 text-amber-500" size={24} />
                    Öğrenilen Kelimeler ({currentLearnedWords.length})
                </h3>
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
                    <p className="text-slate-500 dark:text-slate-400">Henüz öğrenilen kelimeniz yok. Kelimeleri "Öğrenildi" olarak işaretleyerek buraya ekleyebilirsiniz.</p>
                )}
            </div>

            {/* Recent Activities */}
            <div className="mb-8">
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                    <Activity className="mr-2 text-rose-500" size={24} />
                    Son Etkinlikler
                </h3>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
                    <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                        {currentActivities.length > 0 ? (
                            // Firestore Timestamp objelerini JavaScript Date objelerine çevirerek sırala
                            currentActivities.slice().sort((a, b) => {
                                const timestampA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
                                const timestampB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
                                return timestampB - timestampA; // En yeni en üstte
                            }).map((activity, index) => (
                                <li key={index} className="flex items-center">
                                    <Clock className="inline mr-3 text-slate-400" size={16} />
                                    {activity.text} - {activity.timestamp ? new Date(activity.timestamp.toDate ? activity.timestamp.toDate() : activity.timestamp).toLocaleString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Zaman Damgası Yok'}
                                </li>
                            ))
                        ) : (
                            <li className="text-slate-400 flex items-center"><Clock className="inline mr-3 text-slate-400" size={16} /> Henüz bir etkinlik yok.</li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Words to Review */}
            <div>
                <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
                    <BookOpen className="mr-2 text-sky-500" size={24} />
                    Gözden Geçirilecek Kelimeler
                </h3>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">Gözden geçirmeniz gereken kelimeler yakında burada listelenecek.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
