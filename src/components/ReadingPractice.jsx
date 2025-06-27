import React from 'react';
import { BookOpen } from 'lucide-react';

const ReadingPractice = ({ userProgress, saveProgress }) => {
  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 mb-6 flex items-center">
        <BookOpen className="mr-3 text-sky-600" size={32} />
        Okuduğunu Anlama Alıştırması
      </h2>
      <p className="text-slate-500 mb-4">Bu bölüm geliştirme aşamasındadır.</p>
    </div>
  );
};

export default ReadingPractice;