import React from 'react';
import { LayoutDashboard, BarChart2, BrainCircuit, GraduationCap, Lightbulb, Activity, BookOpen, Clock, XCircle } from 'lucide-react';

const Dashboard = ({ userProgress, handleRemoveLearnedWord }) => (
  <div className="p-8 animate-fade-in">
    <h2 className="text-3xl font-bold text-slate-800 mb-8 flex items-center">
      <LayoutDashboard className="mr-3 text-violet-600" size={32} />
      İlerleme Paneli
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-violet-100">
        <BarChart2 className="text-purple-500" size={32} />
        <div>
          <p className="text-slate-500">Okuduğunu Anlama</p>
          <p className="text-2xl font-semibold text-slate-800">{userProgress.reading.correct} / {userProgress.reading.total} Doğru</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-violet-100">
        <BrainCircuit className="mr-2 text-violet-500" size={32} />
        <div>
          <p className="text-slate-500">Dilbilgisi</p>
          <p className="text-2xl font-semibold text-slate-800">{userProgress.grammar.correct} / {userProgress.grammar.total} Doğru</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4 border border-violet-100">
        <GraduationCap className="text-fuchsia-500" size={32} />
        <div>
          <p className="text-slate-500">Genel Uzmanlık Seviyesi</p>
          <p className="text-2xl font-semibold text-slate-800">Başlangıç</p>
        </div>
      </div>
    </div>
    <div className="mb-8">
      <h3 className="text-2xl font-semibold text-slate-700 mb-4 flex items-center">
        <Lightbulb className="mr-2 text-amber-500" size={24} />
        Öğrenilen Kelimeler ({userProgress.learnedWords.length})
      </h3>
      {userProgress.learnedWords.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {userProgress.learnedWords.map((word, index) => (
            <span key={index} className="bg-violet-100 text-violet-800 px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-sm">
              {word}
              <button onClick={() => handleRemoveLearnedWord(word)} className="ml-3 text-violet-400 hover:text-red-500 focus:outline-none transition-colors">
                <XCircle size={16} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">Henüz öğrenilen kelimeniz yok. Kelimeleri "Öğrenildi" olarak işaretleyerek buraya ekleyebilirsiniz.</p>
      )}
    </div>
    <div className="mb-8">
      <h3 className="text-2xl font-semibold text-slate-700 mb-4 flex items-center">
        <Activity className="mr-2 text-rose-500" size={24} />
        Son Etkinlikler
      </h3>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-violet-100">
        <ul className="space-y-2 text-slate-600">
          <li className="flex items-center"><Clock className="inline mr-3 text-slate-400" size={16} /> "significant" kelimesini karşılaştırdınız.</li>
          <li className="flex items-center"><Clock className="inline mr-3 text-slate-400" size={16} /> "crucial" kelimesini öğrenilenlere eklediniz.</li>
          <li className="flex items-center"><Clock className="inline mr-3 text-slate-400" size={16} /> Okuduğunu Anlama alıştırması yaptınız (3/5 doğru).</li>
          <li className="text-slate-400 flex items-center"><Clock className="inline mr-3 text-slate-400" size={16} /> Daha fazla aktivite yakında burada gösterilecek!</li>
        </ul>
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-semibold text-slate-700 mb-4 flex items-center">
        <BookOpen className="mr-2 text-sky-500" size={24} />
        Gözden Geçirilecek Kelimeler
      </h3>
      <div className="bg-white p-6 rounded-xl shadow-lg border border-violet-100">
        <p className="text-slate-500">Gözden geçirmeniz gereken kelimeler yakında burada listelenecek.</p>
      </div>
    </div>
  </div>
);

export default Dashboard;