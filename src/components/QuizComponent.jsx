import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const QuizComponent = () => {
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  // ✅ JSON dosyasını fetch et
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/quizzes.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Veri yüklenemedi');
        return res.json();
      })
      .then((data) => {
        setQuestions(data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Veri çekme hatası:', err);
        setStatus('error');
      });
  }, []);

  const handleAnswerSelect = (option) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setIsAnswered(false);
      setSelectedAnswer(null);
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setStatus('finished');
    }
  };

  const getButtonClass = (option) => {
    if (!isAnswered) {
      return "bg-white dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600";
    }
    if (option === questions[currentQuestionIndex].answer) {
      return "bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-white";
    }
    if (option === selectedAnswer) {
      return "bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-white";
    }
    return "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-60 cursor-not-allowed";
  };

  if (status === 'loading') {
    return <div className="text-center p-8 text-slate-500">Yükleniyor...</div>;
  }

  if (status === 'error') {
    return <div className="text-center p-8 text-red-500">Veri yüklenemedi. Lütfen dosya yolunu kontrol edin.</div>;
  }

  if (questions.length === 0 && status !== 'finished') {
    return <div className="text-center p-8 text-slate-500">Çözülecek soru bulunamadı.</div>;
  }

  if (status === 'finished') {
    return (
      <div className="text-center p-8 animate-fade-in max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Test Tamamlandı!</h2>
        <p className="text-xl mt-4 text-slate-600 dark:text-slate-300">Skorunuz:</p>
        <p className="text-6xl font-bold my-4 text-violet-600 dark:text-violet-400">{score} / {questions.length}</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl">
          Yeniden Başla
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Soru {currentQuestionIndex + 1} / {questions.length}</p>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{currentQuestion.category}</p>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
          <div className="bg-violet-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl md:text-2xl font-medium text-slate-800 dark:text-white leading-relaxed">{currentQuestion.question}</h2>
      </div>

      <div className="space-y-3 my-6">
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
        <div className="mt-6 text-center animate-fade-in">
          <button
            onClick={handleNextQuestion}
            className="mt-6 bg-slate-800 hover:bg-slate-900 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Testi Bitir' : 'Sıradaki Soru'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
