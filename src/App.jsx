import React, { useState, useEffect } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { GraduationCap, LayoutDashboard, Component, BookOpen, BrainCircuit, Map, Loader2, XCircle, Sun, Moon } from 'lucide-react'; // Sun, Moon eklendi
import { auth, db, firebaseConfig } from './config/firebase';
import Dashboard from './components/Dashboard';
import WordComparer from './components/WordComparer';
import ReadingPractice from './components/ReadingPractice';
import GrammarPractice from './components/GrammarPractice';
import MindMapper from './components/MindMapper';
import AIChat from './components/AIChat';
import NavItem from './components/NavItem';

const App = () => {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const [userProgress, setUserProgress] = useState({ 
        reading: { correct: 0, total: 0 }, 
        grammar: { correct: 0, total: 0 }, 
        learnedWords: [],
        activities: []
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(true); // Dark Mode EKLENDİ

    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    useEffect(() => {
        const initFirebase = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                    console.log("Signed in with custom token.");
                } else {
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                }
            } catch (signInError) {
                console.error("Sign-in failed:", signInError);
                setIsAuthReady(true);
            }
            
            const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
                if (user) setUserId(user.uid);
                setIsAuthReady(true);
            });
            return () => unsubscribeAuth();
        };
        initFirebase();
    }, [initialAuthToken]);

    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        const userProgressDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/progress/userProgress`);

        const unsubscribeSnapshot = onSnapshot(userProgressDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const activities = data.activities?.map(activity => ({
                    ...activity,
                    timestamp: activity.timestamp?.toDate?.() || new Date()
                })) || [];
                setUserProgress({ ...data, activities });
            } else {
                setDoc(userProgressDocRef, {
                    reading: { correct: 0, total: 0 },
                    grammar: { correct: 0, total: 0 },
                    learnedWords: [],
                    activities: []
                }).catch(e => console.error("Error setting initial progress:", e));
            }
        }, (error) => {
            console.error("Error listening to user progress:", error);
        });

        return () => unsubscribeSnapshot();
    }, [db, userId, isAuthReady, firebaseConfig.appId]);

    const saveProgressToFirestore = async (newProgress) => {
        if (!db || !userId) return;
        const userProgressDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/progress/userProgress`);
        try {
            await updateDoc(userProgressDocRef, newProgress);
        } catch (error) {
            if (error.code === 'not-found') {
                await setDoc(userProgressDocRef, newProgress, { merge: true });
            } else {
                console.error("Error updating progress:", error);
            }
        }
    };

    const handleRemoveLearnedWord = async (wordToRemove) => {
        await saveProgressToFirestore({ 
            learnedWords: arrayRemove(wordToRemove),
            activities: arrayUnion({ 
                text: `"${wordToRemove}" kelimesini öğrenilenlerden çıkardınız.`, 
                timestamp: serverTimestamp() 
            })
        });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard userProgress={userProgress} handleRemoveLearnedWord={handleRemoveLearnedWord} />;
            case 'word': return <WordComparer userProgress={userProgress} saveProgress={saveProgressToFirestore} />;
            case 'reading': return <ReadingPractice userProgress={userProgress} saveProgress={saveProgressToFirestore} />;
            case 'grammar': return <GrammarPractice userProgress={userProgress} saveProgress={saveProgressToFirestore} />;
            case 'mindmap': return <MindMapper saveProgress={saveProgressToFirestore} />;
            default: return <Dashboard userProgress={userProgress} handleRemoveLearnedWord={handleRemoveLearnedWord} />;
        }
    };

    const toggleDarkMode = () => setDarkMode(!darkMode); 

    return (
        <div className={`${darkMode ? 'dark' : ''} flex h-screen bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans`}>
            <aside className={`bg-white/80 dark:bg-slate-800 backdrop-blur-lg p-4 flex flex-col border-r border-violet-100 dark:border-slate-700 transition-width duration-300 ease-in-out`} style={{
                    width: isSidebarOpen ? '16rem' : '6rem', // 16rem tam genişlik, 6rem ikonlar için dar hali
                }}>
                <div
                className="flex items-center mb-8 px-2 cursor-pointer"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                <GraduationCap className="text-violet-600 mr-3" size={30} />
                {isSidebarOpen && <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">PrepMate</h1>}
                </div>

                <button
                    onClick={toggleDarkMode}
                    className="mb-4 px-4 py-2 flex items-center space-x-2 bg-violet-500 text-white rounded hover:bg-violet-600 transition"
                    >
                    {darkMode ? (
                        <>
                        <Sun size={18} />
                        {isSidebarOpen && <span>Açık Moda Geç</span>}
                        </>
                    ) : (
                        <>
                        <Moon size={18} />
                        {isSidebarOpen && <span>Koyu Moda Geç</span>}
                        </>
                    )}
                </button>

                {userId && (
                    <div className="mb-4 text-xs text-slate-500 dark:text-slate-300 px-2">
                        Kullanıcı ID: <span className="font-mono break-all">{userId}</span>
                    </div>
                )}
                <nav className="flex flex-col space-y-2">
                <NavItem tabName="dashboard" icon={<LayoutDashboard className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>İlerleme Paneli</NavItem>
                <NavItem tabName="word" icon={<Component className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Kelime Karşılaştırma</NavItem>
                <NavItem tabName="reading" icon={<BookOpen className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Okuma Alıştırması</NavItem>
                <NavItem tabName="grammar" icon={<BrainCircuit className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Dilbilgisi</NavItem>
                <NavItem tabName="mindmap" icon={<Map className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Akıl Haritası</NavItem>
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                {isAuthReady ? renderContent() : (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-violet-500" size={48} />
                    </div>
                )}
            </main>

            {!isChatOpen && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-8 right-8 z-40 bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 focus:outline-none ring-4 ring-white/30"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </button>
            )}

            {isChatOpen && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-violet-50 dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] max-h-[700px] flex flex-col relative">
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 z-10"
                        >
                            <XCircle size={28} />
                        </button>
                        <AIChat saveProgress={saveProgressToFirestore} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

