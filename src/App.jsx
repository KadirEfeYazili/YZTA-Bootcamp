import React, { useState, useEffect } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { GraduationCap, LayoutDashboard, Component, BookOpen, BrainCircuit, Map, Loader2, XCircle } from 'lucide-react';
import { auth, db} from './config/firebase';
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
    const [userProgress, setUserProgress] = useState({ 
        reading: { correct: 0, total: 0 }, 
        grammar: { correct: 0, total: 0 }, 
        learnedWords: [],
        activities: [] // Initialize activities array
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isChatOpen, setIsChatOpen] = useState(false);

    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    useEffect(() => {
        const initFirebase = async () => {
            try {
                // This logic handles authentication. It tries to sign in with a custom token
                // if one is provided. If that fails (for any reason), or if no token
                // is provided, it falls back to signing in anonymously.
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                        console.log("Signed in with custom token.");
                    } else {
                        await signInAnonymously(auth);
                        console.log("Signed in anonymously (no custom token).");
                    }
                } catch (signInError) {
                    console.error("Custom token sign-in failed, falling back to anonymous sign-in:", signInError);
                    try {
                        await signInAnonymously(auth);
                        console.log("Successfully signed in anonymously after custom token failure.");
                    } catch (anonSignInError) {
                        console.error("CRITICAL: Anonymous fallback sign-in also failed:", anonSignInError);
                    }
                }
                
                const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        setUserId(null);
                    }
                    setIsAuthReady(true);
                });
                return () => unsubscribeAuth();
            } catch (error) { 
                console.error("Firebase app initialization error:", error); 
                setIsAuthReady(true);
            }
        };
        initFirebase();
    }, [initialAuthToken]); // Dependencies ensure this runs only if config changes

    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        import { firebaseConfig } from './config/firebase';

        const userProgressDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/progress/userProgress`);


        const unsubscribeSnapshot = onSnapshot(userProgressDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Convert Firestore Timestamps to Date objects for sorting
                const activities = data.activities ? data.activities.map(activity => {
                    const timestamp = activity.timestamp && typeof activity.timestamp.toDate === 'function' ? activity.timestamp.toDate() : new Date();
                    return { ...activity, timestamp };
                }) : [];
                setUserProgress({ ...userProgress, ...data, activities });
            } else {
                // Initialize user progress if it doesn't exist
                const initialProgress = { 
                    reading: { correct: 0, total: 0 }, 
                    grammar: { correct: 0, total: 0 }, 
                    learnedWords: [],
                    activities: []
                };
                setDoc(userProgressDocRef, initialProgress, { merge: true })
                    .catch(e => console.error("Error setting initial progress:", e));
            }
        }, (error) => {
            console.error("Error listening to user progress:", error);
        });

        return () => unsubscribeSnapshot();
    }, [db, userId, isAuthReady, appId]);

    const saveProgressToFirestore = async (newProgress) => {
        if (!db || !userId) {
            console.error("Firestore DB or User ID not available for saving progress.");
            return;
        }
        const userProgressDocRef = doc(db, `artifacts/${appId}/users/${userId}/progress/userProgress`);
        try {
            await updateDoc(userProgressDocRef, newProgress);
        } catch (error) {
            // If the document doesn't exist, set it instead of updating
            if (error.code === 'not-found') {
                await setDoc(userProgressDocRef, newProgress, { merge: true });
            } else {
                 console.error("Error updating user progress:", error);
            }
        }
    };

    const handleRemoveLearnedWord = async (wordToRemove) => {
        await saveProgressToFirestore({ 
            learnedWords: arrayRemove(wordToRemove),
            activities: arrayUnion({ text: `"${wordToRemove}" kelimesini öğrenilenlerden çıkardınız.`, timestamp: serverTimestamp() })
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

    return (
        <div className="flex h-screen bg-violet-50 text-slate-800 font-sans">
            <aside className="w-64 bg-white/80 backdrop-blur-lg p-4 flex flex-col border-r border-violet-100">
                <div className="flex items-center mb-8 px-2">
                    <GraduationCap className="text-violet-600 mr-3" size={30} />
                    <h1 className="text-xl font-bold text-slate-900">YDS Asistanı</h1>
                </div>
                {userId && ( // Display user ID for debugging/multi-user identification
                    <div className="mb-4 text-xs text-slate-500 px-2">
                        Kullanıcı ID: <span className="font-mono break-all">{userId}</span>
                    </div>
                )}
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

            {/* Floating Chat Button */}
            {!isChatOpen && (
                   <button
                    onClick={() => setIsChatOpen(true)}
                    title="AI Sohbet Asistanını Aç"
                    className="fixed bottom-8 right-8 z-40 bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 focus:outline-none ring-4 ring-white/30 animate-fade-in"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <path d="M13 8H7"></path>
                        <path d="M17 12H7"></path>
                    </svg>
                </button>
            )}

            {/* AI Chat Modal */}
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
                        <AIChat saveProgress={saveProgressToFirestore} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App; 
