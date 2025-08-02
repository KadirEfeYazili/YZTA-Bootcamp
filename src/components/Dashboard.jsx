import React, { useEffect, useState } from 'react';
import {
  Lightbulb,
  BarChart2,
  BrainCircuit,
  GraduationCap,
  Activity,
  Clock,
  BookOpen,
  XCircle,
  Component,
  Map,
} from 'lucide-react';

// Yardımcı fonksiyon: Yeterlilik seviyesini hesapla
const calculateProficiencyLevel = (progress) => {
  if (!progress || !progress.reading) {
    console.warn(
      "calculateProficiencyLevel: 'progress' veya 'progress.reading' tanımsız. Varsayılan olarak 0 döndürülüyor."
    );
    return 0;
  }

  const { correct, total } = progress.reading;
  const safeCorrect = typeof correct === 'number' ? correct : 0;
  const safeTotal = typeof total === 'number' ? total : 0;

  if (safeTotal === 0) {
    return 0;
  }
  return (safeCorrect / safeTotal) * 100;
};

const Dashboard = ({ 
  userProgress, 
  handleRemoveLearnedWord, 
  WordCardDisplay, 
  QuizComponent, 
  MindMapper,
  saveProgress,
  userId,
  db,
  firebaseAppId 
}) => {
  const [showWordCard, setShowWordCard] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  
  useEffect(() => {
    console.log('Dashboard Bileşeni yüklendi.');
    console.log('Dashboard useEffect: userProgress', userProgress);
    if (userProgress) {
      console.log('Dashboard useEffect: userProgress.reading', userProgress.reading);
      console.log('Dashboard useEffect: userProgress.learnedWords', userProgress.learnedWords);
      console.log('Dashboard useEffect: userProgress.activities', userProgress.activities);
    } else {
      console.log('Dashboard useEffect: userProgress tanımsız veya boş.');
    }
  }, [userProgress]);

  const safeUserProgress = userProgress || {
    reading: { correct: 0, total: 0 },
    learnedWords: [],
    activities: [],
    chatHistory: [],
  };

  const { reading, learnedWords, activities } = safeUserProgress;
  const currentReading = reading || { correct: 0, total: 0 };
  const currentActivities = activities || [];
  const currentLearnedWords = learnedWords || [];

  useEffect(() => {
    console.log('Dashboard: currentLearnedWords güncellendi:', currentLearnedWords);
  }, [currentLearnedWords]);

  // İstatistik hesaplamaları
  const readingPercentage = calculateProficiencyLevel(safeUserProgress);
  const totalWords = currentLearnedWords.length;
  const totalActivities = currentActivities.length;
  
  // Gözden geçirilecek kelimeleri filtrele
  const wordsToReview = currentLearnedWords.filter(wordObj => {
    // Kelime nesnesinde bir `lastReviewed` tarihi yoksa, gözden geçirilmesi gerekir.
    if (!wordObj.lastReviewed) {
      return true;
    }
    // `lastReviewed` bir Firebase Timestamp veya Date nesnesi olabilir
    const lastReviewedDate = wordObj.lastReviewed.toDate ? wordObj.lastReviewed.toDate() : new Date(wordObj.lastReviewed);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // 3 gün öncesini hesapla
    
    return lastReviewedDate < threeDaysAgo;
  });

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 flex items-center">
        <svg
          className="mr-3 text-violet-600"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        İlerleme Paneli
      </h2>

      {/* Ek Özellikler - Dashboard'a özel butonlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setShowWordCard(!showWordCard)}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
        >
          <Component size={20} />
          <span>{showWordCard ? "Kelime Kartlarını Gizle" : "Kelime Kartlarını Göster"}</span>
        </button>
        <button
          onClick={() => setShowQuiz(!showQuiz)}
          className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
        >
          <BrainCircuit size={20} />
          <span>{showQuiz ? "Quiz'i Gizle" : "Quiz'i Başlat"}</span>
        </button>
        <button
          onClick={() => setShowMindMap(!showMindMap)}
          className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
        >
          <Map size={20} />
          <span>{showMindMap ? "Akıl Haritasını Gizle" : "Akıl Haritası Oluştur"}</span>
        </button>
      </div>

      {/* Dinamik Bileşen Gösterimi */}
      <div className="space-y-6 mb-8">
        {showWordCard && WordCardDisplay && (
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
              <Component className="mr-2 text-blue-500" size={24} />
              Kelime Kartları
            </h3>
            <WordCardDisplay 
              userId={userId} 
              db={db} 
              firebaseAppId={firebaseAppId} 
              saveProgress={saveProgress} 
            />
          </div>
        )}
        {showQuiz && QuizComponent && (
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
              <BrainCircuit className="mr-2 text-green-500" size={24} />
              Quiz
            </h3>
            <QuizComponent />
          </div>
        )}
        {showMindMap && MindMapper && (
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
              <Map className="mr-2 text-purple-500" size={24} />
              Akıl Haritası
            </h3>
            <MindMapper saveProgress={saveProgress} />
          </div>
        )}
      </div>

      {/* Ana İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Okuma Başarısı */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">
                Okuma Başarısı
              </h3>
              <p className="text-3xl font-bold text-violet-600">
                {readingPercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentReading.correct}/{currentReading.total} doğru
              </p>
            </div>
            <BarChart2 className="text-violet-500" size={48} />
          </div>
        </div>

        {/* Toplam Etkinlik */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">
                Toplam Etkinlik
              </h3>
              <p className="text-3xl font-bold text-sky-600">
                {totalActivities}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                etkinlik tamamlandı
              </p>
            </div>
            <Activity className="text-sky-500" size={48} />
          </div>
        </div>

        {/* Öğrenilen Kelimeler */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">
                Öğrenilen Kelimeler
              </h3>
              <p className="text-3xl font-bold text-amber-600">
                {totalWords}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                kelime öğrenildi
              </p>
            </div>
            <GraduationCap className="text-amber-500" size={48} />
          </div>
        </div>
      </div>

      {/* Öğrenilen Kelimeler */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
          <Lightbulb className="mr-2 text-amber-500" size={24} />
          Öğrenilen Kelimeler ({currentLearnedWords.length})
        </h3>
        {currentLearnedWords.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {currentLearnedWords.map((wordObj, index) => (
              <span
                key={index}
                className="bg-violet-100 dark:bg-slate-700 text-violet-800 dark:text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-sm"
              >
                {wordObj.word}
                <button
                  onClick={() => handleRemoveLearnedWord(wordObj.word)}
                  className="ml-3 text-violet-400 hover:text-red-500 focus:outline-none transition-colors"
                >
                  <XCircle size={16} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">
            Henüz öğrenilen kelimeniz yok. Kelimeleri "Öğrenildi" olarak işaretleyerek buraya ekleyebilirsiniz.
          </p>
        )}
      </div>

      {/* Son Etkinlikler */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
          <Activity className="mr-2 text-rose-500" size={24} />
          Son Etkinlikler
        </h3>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
          <ul className="space-y-2 text-slate-600 dark:text-slate-300">
            {currentActivities.length > 0 ? (
              currentActivities
                .slice()
                .sort((a, b) => {
                  const timestampA = a.timestamp?.toDate
                    ? a.timestamp.toDate().getTime()
                    : a.timestamp instanceof Date
                    ? a.timestamp.getTime()
                    : 0;
                  const timestampB = b.timestamp?.toDate
                    ? b.timestamp.toDate().getTime()
                    : b.timestamp instanceof Date
                    ? b.timestamp.getTime()
                    : 0;
                  return timestampB - timestampA;
                })
                .slice(0, 10) // Son 10 etkinliği göster
                .map((activity, index) => (
                  <li key={index} className="flex items-center">
                    <Clock className="inline mr-3 text-slate-400" size={16} />
                    {activity.text} -{' '}
                    {activity.timestamp
                      ? new Date(
                          activity.timestamp.toDate
                            ? activity.timestamp.toDate()
                            : activity.timestamp
                        ).toLocaleString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Zaman Damgası Yok'}
                  </li>
                ))
            ) : (
              <li className="text-slate-400 flex items-center">
                <Clock className="inline mr-3 text-slate-400" size={16} /> Henüz bir etkinlik yok.
              </li>
            )}
          </ul>
          {currentActivities.length > 10 && (
            <p className="text-sm text-slate-400 mt-4 text-center">
              ... ve {currentActivities.length - 10} etkinlik daha
            </p>
          )}
        </div>
      </div>

      {/* Gözden Geçirilecek Kelimeler */}
      <div>
        <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
          <BookOpen className="mr-2 text-sky-500" size={24} />
          Gözden Geçirilecek Kelimeler ({wordsToReview.length})
        </h3>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
          {wordsToReview.length > 0 ? (
            <ul className="space-y-2 text-slate-600 dark:text-slate-300">
              {wordsToReview.map((wordObj, index) => (
                <li key={index} className="flex items-center justify-between bg-violet-50 dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                  <span className="font-medium text-violet-800 dark:text-violet-200">{wordObj.word}</span>
                  <button
                    onClick={() => console.log('Gözden Geçir:', wordObj.word)} 
                    className="text-sm text-white bg-violet-600 hover:bg-violet-700 px-4 py-1 rounded-full transition-colors duration-200"
                  >
                    Gözden Geçir
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              Gözden geçirmeniz gereken bir kelime yok.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
