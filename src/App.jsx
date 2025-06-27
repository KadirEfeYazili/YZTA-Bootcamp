import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import WordComparer from './components/WordComparer';
import ReadingPractice from './components/ReadingPractice';
import GrammarPractice from './components/GrammarPractice';
import MindMapper from './components/MindMapper';
import AIChat from './components/AIChat';
import NavItem from './components/NavItem';
import { initFirebase, saveProgressToFirestore, listenToProgress, arrayRemove } from './firebase/firebaseConfig';
import { GraduationCap, LayoutDashboard, Component, BookOpen, BrainCircuit, Map, BotMessageSquare, XCircle, Loader2 } from 'lucide-react';
import './index.css';

const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userProgress, setUserProgress] = useState({ reading: { correct: 0, total: 0 }, grammar: { correct: 0, total: 0 }, learnedWords: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const appId = import.meta.env.VITE_APP_ID || 'default-app-id';
  const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) : {};
  const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;

  useEffect(() => {
    initFirebase(firebaseConfig, initialAuthToken, setDb, setUserId, setIsAuthReady);
  }, [appId, firebaseConfig, initialAuthToken]);

  useEffect(() => {
    const unsubscribe = listenToProgress(db, userId, appId, setUserProgress, userProgress);
    return () => unsubscribe();
  }, [db, userId, appId, userProgress]);

  const handleRemoveLearnedWord = async (wordToRemove) => {
    await saveProgressToFirestore(db, userId, appId, { learnedWords: arrayRemove(wordToRemove) });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard userProgress={userProgress} handleRemoveLearnedWord={handleRemoveLearnedWord} />;
      case 'word': return <WordComparer userProgress={userProgress} saveProgress={(newProgress) => saveProgressToFirestore(db, userId, appId, newProgress)} />;
      case 'reading': return <ReadingPractice userProgress={userProgress} saveProgress={(newProgress) => saveProgressToFirestore(db, userId, appId, newProgress)} />;
      case 'grammar': return <GrammarPractice userProgress={userProgress} saveProgress={(newProgress) => saveProgressToFirestore(db, userId, appId, newProgress)} />;
      case 'mindmap': return <MindMapper />;
      default: return <Dashboard userProgress={userProgress} handleRemoveLearnedWord={handleRemoveLearnedWord} />;
    }
  };

  return (
    <div className="flex h-screen bg-violet-50 text-slate-800 font-sans">
      <aside className="w-64 bg-white/80 backdrop-blur-lg p-4 flex flex-col border-r border-violet-100">
        <div className="flex items-center mb-8 px-2">
          <GraduationCap className="text-violet-600 mr-3" size={30} />
          <h1 className="text-xl font-bold text-slate-900">YDS Asistanı</h1>
        </div>
        <nav className="flex flex-col space-y-2">
          <NavItem tabName="dashboard" icon={<LayoutDashboard className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab}>İlerleme Paneli</NavItem>
          <NavItem tabName="word" icon={<Component className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab}>Kelime Karşılaştırma</NavItem>
          <NavItem tabName="reading" icon={<BookOpen className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab}>Okuma Alıştırması</NavItem>
          <NavItem tabName="grammar" icon={<BrainCircuit className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab}>Dilbilgisi</NavItem>
          <NavItem tabName="mindmap" icon={<Map className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab}>Akıl Haritası</NavItem>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-violet-50">
        {isAuthReady ? renderContent() : <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-violet-500" size={48} /></div>}
      </main>
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          title="AI Sohbet Asistanını Aç"
          className="fixed bottom-8 right-8 z-40 bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 focus:outline-none ring-4 ring-white/30 flex items-center space-x-2"
        >
          <BotMessageSquare size={28} />
          <span className="text-sm font-medium">AI Sohbet</span>
        </button>
      )}
      {isChatOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
          <div className="bg-violet-50 rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] max-h-[700px] flex flex-col relative">
            <button
              onClick={() => setIsChatOpen(false)}
              title="Sohbeti Kapat"
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 transition-colors z-10"
            >
              <XCircle size={28} />
            </button>
            <AIChat />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;