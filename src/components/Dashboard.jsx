import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Activity,
  Clock,
  BookOpen,
  XCircle,
} from 'lucide-react';

const Dashboard = ({ userProgress, handleRemoveLearnedWord }) => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Dashboard Bileşeni yüklendi.');
    console.log('Dashboard useEffect: userProgress', userProgress);
  }, [userProgress]);

  const safeUserProgress = userProgress || {
    reading: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    learnedWords: [],
    activities: [],
    chatHistory: [],
  };

  const { reading, grammar, learnedWords, activities } = safeUserProgress;
  const currentReading = reading || { correct: 0, total: 0 };
  const currentGrammar = grammar || { correct: 0, total: 0 };
  const currentActivities = activities || [];
  const currentLearnedWords = learnedWords || [];

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

      {/* Butonlar ile sayfa yönlendirme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/wordcard')}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
        >
          Word Card'ı Göster
        </button>
        <button
          onClick={() => navigate('/quiz')}
          className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
        >
          Quiz'i Başlat
        </button>
        <button
          onClick={() => navigate('/mindmap')}
          className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition"
        >
          Mind Map'i Göster
        </button>
      </div>

      {/* Öğrenilen Kelimeler */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
          <Lightbulb className="mr-2 text-amber-500" size={24} />
          Öğrenilen Kelimeler ({currentLearnedWords.length})
        </h3>
        {currentLearnedWords.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {currentLearnedWords.map((word, index) => (
              <span
                key={index}
                className="bg-violet-100 dark:bg-slate-700 text-violet-800 dark:text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-sm"
              >
                {word}
                <button
                  onClick={() => handleRemoveLearnedWord(word)}
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
        </div>
      </div>

      {/* Gözden Geçirilecek Kelimeler */}
      <div>
        <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
          <BookOpen className="mr-2 text-sky-500" size={24} />
          Gözden Geçirilecek Kelimeler
        </h3>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            Gözden geçirmeniz gereken kelimeler yakında burada listelenecek.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
