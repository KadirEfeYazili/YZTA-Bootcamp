import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowLeft, BookOpen, Trophy, Star, AlertTriangle } from 'lucide-react';

// Bu App bileşenini ana dosyanızda (örn: App.js) kullanabilirsiniz.
// export default function App() {
//   return <QuizComponent />;
// }

const QuizComponent = () => {
  // STATE Değişkenleri: Uygulamanın durumunu yönetir.
  const [allQuestions, setAllQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading', 'ready', 'error'
  const [currentView, setCurrentView] = useState('categories'); // 'categories', 'quiz', 'results'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completedCategories, setCompletedCategories] = useState({});
  const [categoryScores, setCategoryScores] = useState({});

  // useEffect: Bileşen ilk yüklendiğinde verileri çekmek için kullanılır.
  useEffect(() => {
    // DÜZELTME: Fetch yolu düzeltildi. 'public' klasöründeki dosyalara direkt '/' ile erişilir.
    // Dosya adını da 'quizzes.json' olarak varsaydım.
    fetch('/quizzes.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Veri yüklenemedi, sunucu hatası: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setAllQuestions(data);
        
        // Soruları kategorilere göre grupla
        const categoryGroups = data.reduce((acc, question) => {
          const categoryName = question.category;
          if (!acc[categoryName]) {
            acc[categoryName] = [];
          }
          acc[categoryName].push(question);
          return acc;
        }, {});

        // Kategorileri arayüz için hazırla
        const categoryList = Object.keys(categoryGroups).map((categoryName, index) => ({
          id: categoryName.replace(/\s+/g, '-').toLowerCase(), // Benzersiz bir ID oluştur
          name: categoryName,
          questions: categoryGroups[categoryName],
          questionCount: categoryGroups[categoryName].length,
          difficulty: ['Kolay', 'Orta', 'Zor'][index % 3],
          color: ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500'][index % 4],
          icon: [BookOpen, Trophy, Star, AlertTriangle][index % 4]
        }));

        setCategories(categoryList);
        setStatus('ready'); // Durumu 'hazır' olarak ayarla
      })
      .catch((err) => {
        console.error('Veri çekme hatası:', err);
        setStatus('error'); // Hata durumunu ayarla
      });
  }, []); // Boş dependency array, bu effect'in sadece bir kere çalışmasını sağlar.

  // Kategori seçildiğinde quiz'i başlatan fonksiyon
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setCurrentView('quiz');
  };

  // Bir cevap seçildiğinde çalışır
  const handleAnswerSelect = (option) => {
    if (isAnswered) return; // Zaten cevaplandıysa işlem yapma

    setSelectedAnswer(option);
    setIsAnswered(true);

    const currentQuestion = selectedCategory.questions[currentQuestionIndex];
    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1); // Doğru cevap ise skoru artır
    }
  };

  // Sonraki soruya geçme veya quiz'i bitirme fonksiyonu
  const handleNextQuestion = () => {
    const isLastQuestion = currentQuestionIndex === selectedCategory.questions.length - 1;

    if (isLastQuestion) {
      // Quiz tamamlandı
      const categoryId = selectedCategory.id;
      
      // En yüksek skoru güncelle
      const existingScore = categoryScores[categoryId] || 0;
      if (score > existingScore) {
          setCategoryScores(prev => ({ ...prev, [categoryId]: score }));
      }
      
      setCompletedCategories(prev => ({...prev, [categoryId]: true}));
      setCurrentView('results');
    } else {
      // Sonraki soruya geç
      setIsAnswered(false);
      setSelectedAnswer(null);
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // Kategoriler ekranına geri dönme
  const handleBackToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
  };

  // Cevap butonlarının class'larını belirleyen yardımcı fonksiyon
  const getButtonClass = (option) => {
    if (!isAnswered) {
      return "bg-white dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-violet-400";
    }
    const currentQuestion = selectedCategory.questions[currentQuestionIndex];
    if (option === currentQuestion.answer) {
      return "bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-white";
    }
    if (option === selectedAnswer) {
      return "bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-white";
    }
    return "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-60 cursor-not-allowed";
  };

  // --- RENDER KISMI ---

  // Yüklenme ekranı
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Quiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Hata ekranı
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center text-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Bir Hata Oluştu</h1>
            <p className="text-slate-600 dark:text-slate-300">
                Quiz verileri yüklenemedi. Lütfen `public` klasöründe `quizzes.json` dosyasının olduğundan emin olun ve internet bağlantınızı kontrol edin.
            </p>
        </div>
      </div>
    );
  }

  // Kategori seçim ekranı
  if (currentView === 'categories') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">Quiz Kategorileri</h1>
            <p className="text-slate-600 dark:text-slate-300">Öğrenmek istediğiniz konuyu seçin</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const IconComponent = category.icon;
              const isCompleted = completedCategories[category.id];
              const maxScore = category.questionCount;
              const userScore = categoryScores[category.id] || 0;
              
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-violet-300 dark:hover:border-violet-600 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${category.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    {isCompleted && <CheckCircle className="w-6 h-6 text-green-500" />}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{category.name}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{category.questionCount} soru • {category.difficulty}</p>
                  
                  {isCompleted && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300 mb-1">
                        <span>En yüksek skor</span>
                        <span>{userScore}/{maxScore}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${(userScore / maxScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  <button className="w-full bg-slate-800 dark:bg-violet-600 text-white py-2 px-4 rounded-lg hover:bg-slate-900 dark:hover:bg-violet-700 transition-colors">
                    {isCompleted ? 'Tekrar Çöz' : 'Başla'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Quiz sonuç ekranı
  if (currentView === 'results') {
    const totalQuestions = selectedCategory.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center p-8 max-w-md mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="mb-6">
            {percentage >= 80 ? (
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            ) : percentage >= 50 ? (
              <Star className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            ) : (
              <BookOpen className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{selectedCategory.name}</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">Tamamlandı!</p>
          <div className="mb-6">
            <p className="text-6xl font-bold my-4 text-violet-600 dark:text-violet-400">
              {score} / {totalQuestions}
            </p>
            <p className="text-lg text-slate-600 dark:text-slate-300">%{percentage} başarı</p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => handleCategorySelect(selectedCategory)}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              Tekrar Çöz
            </button>
            <button 
              onClick={handleBackToCategories}
              className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              Kategorilere Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz çözme ekranı
  const currentQuestion = selectedCategory.questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / selectedCategory.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToCategories}
            className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kategoriler
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{selectedCategory.name}</h1>
        </div>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
              Soru {currentQuestionIndex + 1} / {selectedCategory.questions.length}
            </p>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Skor: {score}
            </p>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
            <div 
              className="bg-violet-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
          <h2 className="text-xl md:text-2xl font-medium text-slate-800 dark:text-white leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(option)}
              disabled={isAnswered}
              className={`w-full flex items-center justify-between text-left p-4 rounded-lg border-2 transition-all duration-300 ${getButtonClass(option)}`}
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{option}</span>
              {isAnswered && option === currentQuestion.answer && <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" />}
              {isAnswered && option === selectedAnswer && option !== currentQuestion.answer && <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
        {isAnswered && (
          <div className="text-center">
            <button
              onClick={handleNextQuestion}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              {currentQuestionIndex === selectedCategory.questions.length - 1 ? 'Testi Bitir' : 'Sıradaki Soru'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizComponent;
