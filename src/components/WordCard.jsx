// src/components/WordCard.jsx
import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';

const WordCard = ({ word, meaning, example, onMarkAsLearned }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Yeni kelime geldiğinde kartı sıfırla
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handlePlaySound = (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="relative w-80 h-48 rounded-xl shadow-lg cursor-pointer" onClick={handleFlip}>
      {/* Transition container */}
      <div className="relative w-full h-full">
        {/* Front Side - İngilizce Kelime */}
        <div
          className={`absolute inset-0 w-full h-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 flex flex-col items-center justify-center border border-purple-100 dark:border-slate-700 shadow-inner transition-all duration-500 ${
            isFlipped ? 'opacity-0 rotate-y-180 scale-95' : 'opacity-100 rotate-y-0 scale-100'
          }`}
          style={{
            transform: isFlipped ? 'rotateY(180deg) scale(0.95)' : 'rotateY(0deg) scale(1)',
            backfaceVisibility: 'hidden'
          }}
        >
          <h3 className="text-3xl font-bold text-violet-700 dark:text-violet-300 mb-4 text-center">
            {word}
          </h3>
          <button 
            onClick={handlePlaySound}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200 hover:scale-110 transform"
            title="Kelimeyi dinle"
          >
            <Volume2 size={24} />
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
            Türkçe anlamını görmek için tıkla
          </p>
        </div>

        {/* Back Side - Türkçe Anlam */}
        <div
          className={`absolute inset-0 w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-700 dark:to-purple-800 rounded-xl p-6 flex flex-col items-center justify-center text-white border border-violet-600 dark:border-violet-800 shadow-inner transition-all duration-500 ${
            isFlipped ? 'opacity-100 rotate-y-0 scale-100' : 'opacity-0 rotate-y-180 scale-95'
          }`}
          style={{
            transform: isFlipped ? 'rotateY(0deg) scale(1)' : 'rotateY(-180deg) scale(0.95)',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="text-center">
            <p className="text-2xl font-semibold mb-4">{meaning}</p>
            <p className="text-sm italic text-violet-100 dark:text-violet-200 mb-4 leading-relaxed">
              "{example}"
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsLearned(word);
              }}
              className="px-6 py-2 bg-white text-violet-600 rounded-full font-medium hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-md"
            >
              ✓ Öğrendim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordCard;