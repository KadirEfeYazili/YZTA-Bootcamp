import React, { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  fetchSignInMethodsForEmail,
  signInAnonymously,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { GraduationCap, LayoutDashboard, Component, BookOpen, BrainCircuit, Map, Loader2, XCircle, Chrome, Sun, Moon, User, BellRing, BookText } from 'lucide-react';

// Firebase yapılandırma ve başlatma
// Yollar güncellendi: '.js' uzantısı eklendi
import { auth, db, firebaseConfig } from './config/firebase.js';

// Ana uygulama bileşenleri
// Yollar güncellendi: '.jsx' uzantıları eklendi
import Dashboard from './components/Dashboard.jsx';
import WordCard from './components/WordCard.jsx';
import QuizComponent from './components/QuizComponent.jsx';
import MindMapper from './components/MindMapper.jsx';
import WordComparer from './components/WordComparer.jsx';
import ReadingPractice from './components/ReadingPractice.jsx';
import AIChat from './components/AIChat.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import NotificationScheduler from './components/NotificationScheduler.jsx';
import Notebook from './components/Notebook.jsx';

// FastAPI backend'inizin temel URL'si
const API_BASE_URL = 'http://127.0.0.1:8000';

const App = () => {
  // Authentication ve Kullanıcı Durumu
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Giriş/Kayıt Akışı State'leri
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [authMode, setAuthMode] = useState('initial');

  const [userProfile, setUserProfile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Uygulama İçeriği State'leri
  const [userProgress, setUserProgress] = useState({
    reading: { correct: 0, total: 0 },
    learnedWords: [],
    activities: []
  });
  // Ana içeriği kontrol eden state: Varsayılan olarak 'dashboard' gösterilir
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Bu state şu an kullanılmıyor ama kodda bırakıldı
  const [darkMode, setDarkMode] = useState(true);

  // New state for user's full name and email for profile page
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAge, setUserAge] = useState(null);

  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // Dark Mode useEffect - DOM'u güncellemek için
  useEffect(() => {
    console.log("Dark mode useEffect çalıştı. darkMode:", darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Firebase Authentication durumunu dinle ve kullanıcıyı ayarla
  useEffect(() => {
    console.log("Auth durumu dinleyicisi başlatılıyor...");
    const initFirebase = async () => {
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          setUserId(user.uid);
          console.log("Kullanıcı oturum açtı:", user.uid, user.email);
          setUserEmail(user.email);

          try {
            const idToken = await user.getIdToken();
            const profile = await callApi('/users/me/', 'GET', idToken);
            setUserName(`${profile.name} ${profile.surname}`);
            setUserAge(profile.age);
            console.log("Kullanıcı profil bilgileri alındı:", profile);
          } catch (error) {
            console.error("Kullanıcı profil bilgileri alınırken hata:", error);
            setUserName(user.email);
            setUserAge(null);
          }
        } else {
          setUserId(null);
          setAuthMode('initial');
          setEmail('');
          setPassword('');
          setName('');
          setSurname('');
          setAge('');
          setUserName('');
          setUserEmail('');
          setUserAge(null);
          console.log("Kullanıcı oturumu kapandı.");
        }
        setIsAuthReady(true);
        console.log("isAuthReady true olarak ayarlandı.");
      });
      return () => unsubscribeAuth();
    };
    initFirebase();
  }, []);

  // Kullanıcı profilini çekmek için useEffect
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser || !userId) {
        setUserProfile(null);
        return;
      }

      try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/users/me/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Profil bilgileri çekilirken hata oluştu.');
        }

        const data = await response.json();
        setUserProfile(data);
        console.log("Kullanıcı profil bilgileri App.jsx içinde çekildi:", data);

      } catch (err) {
        console.error("Profil bilgileri çekilirken hata:", err);
        setStatusMessage("Profil yüklenirken hata oluştu: " + err.message);
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [currentUser, userId, API_BASE_URL, setStatusMessage]);

  // Kullanıcı ilerlemesini Firestore'dan dinle
  useEffect(() => {
    console.log("Firestore dinleyicisi useEffect çalıştı. Durum: db:", !!db, "userId:", !!userId, "isAuthReady:", isAuthReady);
    if (!db || !userId || !isAuthReady) {
      console.log("Firestore dinleyicisi başlatılamadı: db, userId veya isAuthReady hazır değil.");
      return;
    }

    const userProgressDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/progress/userProgress`);
    console.log("Firestore belge yolu:", userProgressDocRef.path);

    const unsubscribeSnapshot = onSnapshot(userProgressDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Firestore'dan kullanıcı ilerlemesi alındı:", data);

        const activities = data.activities?.map(activity => ({
          ...activity,
          timestamp: activity.timestamp?.toDate?.() || new Date()
        })) || [];

        setUserProgress({
          reading: data.reading || { correct: 0, total: 0 },
          learnedWords: data.learnedWords || [],
          activities: activities
        });

      } else {
        console.log("Kullanıcı ilerleme belgesi Firestore'da bulunamadı. Yeni belge oluşturuluyor...");
        setDoc(userProgressDocRef, {
          reading: { correct: 0, total: 0 },
          learnedWords: [],
          activities: []
        }).then(() => {
          console.log("Başlangıç ilerlemesi başarıyla ayarlandı.");
          setUserProgress({
            reading: { correct: 0, total: 0 },
            learnedWords: [],
            activities: []
          });
        }).catch(e => console.error("Başlangıç ilerlemesi ayarlanırken hata:", e));
      }
    }, (error) => {
      console.error("Kullanıcı ilerlemesi dinlenirken hata:", error);
      setStatusMessage("İlerleme yüklenirken hata oluştu: " + error.message);
    });

    return () => {
      unsubscribeSnapshot();
      console.log("Firestore dinleyicisi temizlendi.");
    };
  }, [db, userId, isAuthReady, firebaseConfig.appId]);

  // Firestore Auth'un başlatıldığından emin olmak için test useEffect
  useEffect(() => {
    const testEmail = "berkeiou@outlook.com";
    const testSignInMethods = async () => {
      if (!auth) {
        console.warn(">> TEST: Auth objesi henüz tanımlı değil. Firebase başlatılmamış olabilir.");
        return;
      }
      try {
        console.log(`>> TEST: "${testEmail}" için giriş yöntemleri kontrol ediliyor...`);
        const methods = await fetchSignInMethodsForEmail(auth, testEmail);
        console.log(`>> TEST: "${testEmail}" için giriş yöntemleri yanıtı:`, methods);
        if (methods && methods.length > 0) {
          console.log(`>> TEST: "${testEmail}" Firebase Auth'ta KAYITLI.`);
        } else {
          console.log(`>> TEST: "${testEmail}" Firebase Auth'ta KAYITLI DEĞİL.`);
        }
      } catch (err) {
        console.error(`>> TEST: "${testEmail}" kontrol edilirken hata:`, err);
      }
    };
    if (isAuthReady) {
      testSignInMethods();
    } else {
      console.log(">> TEST: isAuthReady henüz true değil, test bekletiliyor.");
    }
  }, [isAuthReady]);

  // Firestore'a ilerleme kaydetme fonksiyonu
  const saveProgressToFirestore = async (newProgress) => {
    console.log("Firestore'a ilerleme kaydetme çağrıldı. Yeni ilerleme:", newProgress);
    if (!db || !userId) {
      setStatusMessage("İlerleme kaydedilemedi: Kullanıcı oturumu açık değil veya veritabanı hazır değil.");
      console.error("İlerleme kaydedilemedi: db veya userId eksik.");
      return;
    }
    const userProgressDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/progress/userProgress`);
    try {
      await updateDoc(userProgressDocRef, newProgress);
      console.log("İlerleme başarıyla güncellendi.");
    } catch (error) {
      if (error.code === 'not-found') {
        console.warn("İ ilerleme belgesi bulunamadı, yeni belge oluşturuluyor...");
        await setDoc(userProgressDocRef, newProgress, { merge: true });
        console.log("Yeni ilerleme belgesi oluşturuldu ve kaydedildi.");
      } else {
        console.error("İlerleme güncellenirken hata:", error);
        setStatusMessage("İlerleme kaydedilirken hata oluştu: " + error.message);
      }
    }
  };

  // Öğrenilen kelimeyi kaldırma
  const handleRemoveLearnedWord = async (wordToRemove) => {
    console.log(`"${wordToRemove}" kelimesi öğrenilenlerden kaldırılıyor.`);
    await saveProgressToFirestore({
      learnedWords: arrayRemove(wordToRemove),
      activities: arrayUnion({
        text: `"${wordToRemove}" kelimesini öğrenilenlerden çıkardınız.`,
        timestamp: serverTimestamp()
      })
    });
    console.log(`"${wordToRemove}" kelimesi kaldırma işlemi tamamlandı.`);
  };

  // FastAPI API çağrısı yardımcı fonksiyonu
  const callApi = async (endpoint, method, token = null, body = null) => {
    console.log(`API çağrısı: ${method} ${API_BASE_URL}${endpoint}`);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log("API çağrısı için token mevcut.");
    }

    const config = {
      method: method,
      headers: headers,
    };
    if (body) {
      config.body = JSON.stringify(body);
      console.log("API çağrısı body:", body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();
      console.log("API yanıtı:", data);

      if (!response.ok) {
        console.error("API yanıtı OK değil:", response.status, data.detail);
        throw new Error(data.detail || `API hatası: ${response.status}`);
      }
      console.log("API çağrısı başarılı.");
      return data;
    } catch (error) {
      console.error("API Çağrısı Hatası:", error);
      throw error;
    }
  };

  // --- E-posta/Şifre ile Kayıt İşlemi ---
  const handleSignup = async () => {
    setStatusMessage('Kaydolunuyor...');
    console.log("Kaydol butonu tıklandı. Bilgiler:", { name, surname, age, email });
    try {
      if (!name || !surname || !age || !email || !password) {
        setStatusMessage('Lütfen tüm alanları doldurun.');
        console.warn("Kayıt için eksik alanlar var.");
        return;
      }
      if (password.length < 6) {
        setStatusMessage('Şifre en az 6 karakter olmalıdır.');
        console.warn("Şifre 6 karakterden kısa.");
        return;
      }
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        setStatusMessage('Lütfen geçerli bir yaş girin (1-120 arası).');
        console.warn("Geçersiz yaş girişi:", age);
        return;
      }

      console.log("Firebase Auth ile kullanıcı oluşturuluyor...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Firebase kullanıcısı oluşturuldu:", user.uid, user.email);
      const idToken = await user.getIdToken();
      console.log("Firebase ID Token alındı.");

      console.log("FastAPI backend'e profil bilgileri gönderiliyor...");
      await callApi('/users/initialize_profile/', 'POST', idToken, {
        name: name,
        surname: surname,
        age: parsedAge,
        email: email
      });
      console.log("FastAPI profil oluşturma başarılı.");

      setUserName(`${name} ${surname}`);
      setUserEmail(email);
      setUserAge(parsedAge);

      setStatusMessage('Kayıt başarılı! Hoş geldiniz, ' + name + ' ' + surname + '.');
      setEmail('');
      setPassword('');
      setName('');
      setSurname('');
      setAge('');
      console.log("Kayıt işlemi tamamlandı, form temizlendi.");

    } catch (error) {
      console.error("Kayıt Hatası:", error);
      let errorMessage = 'Kayıt hatası oluştu.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setStatusMessage(errorMessage);
    }
  };

  // --- E-posta/Şifre ile Giriş İşlemi (Initial moddan direkt deneme) ---
  const handleLoginAttemptFromInitial = async () => {
    setStatusMessage('Giriş yapılıyor...');
    console.log("Giriş Yap butonu tıklandı (initial mode). E-posta:", email);
    try {
      if (!email || !password) {
        setStatusMessage('Lütfen e-posta ve şifrenizi girin.');
        console.warn("Giriş için e-posta veya şifre boş.");
        return;
      }

      console.log("Firebase Auth ile giriş yapılıyor...");
      await signInWithEmailAndPassword(auth, email, password);
      setStatusMessage('Giriş başarılı!');
      setEmail('');
      setPassword('');
      console.log("Giriş işlemi başarılı, form temizlendi.");

    } catch (error) {
      console.error("Giriş Hatası (initial mode):", error);
      let errorMessage = 'Giriş hatası oluştu.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Belirtilen e-posta adresi ve/veya şifre doğru değil.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi biçimi.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setStatusMessage(errorMessage);
    }
  };

  // Google ile Giriş
  const handleGoogleSignIn = async () => {
    setStatusMessage('Google ile giriş yapılıyor...');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google ile giriş başarılı:", user.uid, user.email);

      const idToken = await user.getIdToken();
      // Check if user profile already exists, if not, create it
      // This is a simplified check, a more robust solution would be in your FastAPI backend
      try {
        await callApi('/users/me/', 'GET', idToken);
        console.log("Google kullanıcısının profili zaten mevcut.");
      } catch (error) {
        if (error.message.includes("not found")) { // Adjust based on your FastAPI error message
          console.log("Google kullanıcısının profili bulunamadı, oluşturuluyor...");
          await callApi('/users/initialize_profile/', 'POST', idToken, {
            name: user.displayName.split(' ')[0] || '',
            surname: user.displayName.split(' ').slice(1).join(' ') || '',
            age: null, // Google'dan yaş bilgisi gelmediği için null
            email: user.email
          });
          console.log("Google kullanıcısının profili başarıyla oluşturuldu.");
        } else {
          throw error; // Rethrow other errors
        }
      }

      setStatusMessage('Google ile giriş başarılı!');
    } catch (error) {
      console.error("Google Giriş Hatası:", error);
      let errorMessage = 'Google ile giriş hatası oluştu.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Google giriş penceresi kapatıldı.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setStatusMessage(errorMessage);
    }
  };

  // Anonim Giriş
  const handleAnonymousSignIn = async () => {
    setStatusMessage('Anonim olarak giriş yapılıyor...');
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      console.log("Anonim giriş başarılı:", user.uid);

      // Anonim kullanıcı için de profil oluşturma veya kontrol etme
      const idToken = await user.getIdToken();
      try {
        await callApi('/users/me/', 'GET', idToken);
        console.log("Anonim kullanıcının profili zaten mevcut.");
      } catch (error) {
        if (error.message.includes("not found")) {
          console.log("Anonim kullanıcının profili bulunamadı, oluşturuluyor...");
          await callApi('/users/initialize_profile/', 'POST', idToken, {
            name: 'Anonymous',
            surname: 'User',
            age: null,
            email: `anon-${user.uid}@example.com` // Firebase anonim e-posta sağlamaz
          });
          console.log("Anonim kullanıcısının profili başarıyla oluşturuldu.");
        } else {
          throw error;
        }
      }
      setStatusMessage('Anonim giriş başarılı!');
    } catch (error) {
      console.error("Anonim Giriş Hatası:", error);
      setStatusMessage('Anonim giriş hatası: ' + error.message);
    }
  };

  // Şifre Sıfırlama E-postası Gönderme
  const handleForgotPassword = async () => {
    setStatusMessage('Şifre sıfırlama e-postası gönderiliyor...');
    if (!email) {
      setStatusMessage('Lütfen şifrenizi sıfırlamak istediğiniz e-posta adresini girin.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setStatusMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      setAuthMode('initial'); // E-posta gönderildikten sonra başlangıç görünümüne dön
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      let errorMessage = 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setStatusMessage(errorMessage);
    }
  };

  // Çıkış Yap
  const signOut = async () => {
    setStatusMessage('Çıkış yapılıyor...');
    try {
      await firebaseSignOut(auth);
      setStatusMessage('Başarıyla çıkış yapıldı.');
      // State'ler onAuthStateChanged listener'ı tarafından temizlenecek
    } catch (error) {
      console.error("Çıkış Hatası:", error);
      setStatusMessage('Çıkış yaparken bir hata oluştu.');
    }
  };

  // Ana içerik renderlama fonksiyonu
  const renderMainContent = () => {
    if (!isAuthReady) {
      return (
        <div className="flex justify-center items-center h-full text-lg text-slate-500 dark:text-slate-400">
          <Loader2 className="animate-spin mr-2" size={24} />
          Uygulama yükleniyor...
        </div>
      );
    }

    if (!currentUser) {
      // Kimlik doğrulama ekranı (değişiklik yok, mevcut kodunuz)
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-slate-900 dark:to-slate-800 p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100 hover:scale-[1.01] border border-violet-200 dark:border-slate-700">
            <h2 className="text-4xl font-extrabold text-center text-slate-800 dark:text-white mb-6 animate-fade-in-up">
              {authMode === 'signup' ? 'Hesap Oluştur' : authMode === 'forgotPassword' ? 'Şifremi Unuttum' : 'Giriş Yap'}
            </h2>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-lg">
              {authMode === 'signup' ? 'Yeni bir hesap oluşturun' : authMode === 'forgotPassword' ? 'Yeni şifre belirlemek için e-posta adresinizi girin' : 'Devam etmek için giriş yapın'}
            </p>

            {statusMessage && (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between animate-fade-in">
                <span>{statusMessage}</span>
                <button onClick={() => setStatusMessage('')} className="ml-2 text-blue-500 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100">
                  <XCircle size={18} />
                </button>
              </div>
            )}

            {(authMode === 'signup' || authMode === 'initial' || authMode === 'forgotPassword') && (
              <form className="space-y-5" onSubmit={(e) => {
                e.preventDefault();
                if (authMode === 'signup') handleSignup();
                else if (authMode === 'initial') handleLoginAttemptFromInitial();
                else if (authMode === 'forgotPassword') handleForgotPassword();
              }}>
                {authMode === 'signup' && (
                  <>
                    <input
                      type="text"
                      placeholder="Ad"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 transition-all"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Soyad"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 transition-all"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Yaş"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 transition-all"
                      min="1" max="120"
                      required
                    />
                  </>
                )}
                <input
                  type="email"
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 transition-all"
                  required
                />
                {authMode !== 'forgotPassword' && (
                  <input
                    type="password"
                    placeholder="Şifre"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-300 transition-all"
                    required={authMode === 'initial' || authMode === 'signup'}
                  />
                )}

                <button
                  type="submit"
                  className="w-full bg-violet-600 text-white p-4 rounded-lg font-semibold hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all shadow-md transform hover:-translate-y-0.5"
                >
                  {authMode === 'signup' ? 'Kaydol' : authMode === 'forgotPassword' ? 'Şifre Sıfırlama E-postası Gönder' : 'Giriş Yap'}
                </button>
              </form>
            )}

            <div className="flex justify-center items-center mt-6 text-slate-500 dark:text-slate-400">
              <span className="h-px w-1/4 bg-slate-300 dark:bg-slate-600"></span>
              <span className="mx-4">veya</span>
              <span className="h-px w-1/4 bg-slate-300 dark:bg-slate-600"></span>
            </div>

            <div className="space-y-3 mt-6">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center p-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all shadow-md transform hover:-translate-y-0.5"
              >
                <Chrome className="mr-3" size={20} /> Google ile Giriş Yap
              </button>
              <button
                onClick={handleAnonymousSignIn}
                className="w-full flex items-center justify-center p-4 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all shadow-md transform hover:-translate-y-0.5"
              >
                Anonim Giriş Yap
              </button>
            </div>

            <div className="flex justify-between items-center mt-6 text-sm">
              {authMode === 'initial' && (
                <>
                  <button
                    onClick={() => setAuthMode('forgotPassword')}
                    className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                  >
                    Şifremi Unuttum?
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setStatusMessage('');
                    }}
                    className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                  >
                    Yeni Hesap Oluştur
                  </button>
                </>
              )}
              {(authMode === 'signup' || authMode === 'forgotPassword') && (
                <button
                  onClick={() => {
                    setAuthMode('initial');
                    setStatusMessage('');
                    setEmail('');
                    setPassword('');
                  }}
                  className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  Zaten Bir Hesabım Var
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Kullanıcı giriş yapmışsa ana uygulama arayüzü
    return (
      <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-white flex flex-col p-5 shadow-2xl">
          <div className="flex items-center justify-center mb-10 mt-5">
            <svg
              className="w-10 h-10 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h14M12 5l7 7-7 7"
              ></path>
            </svg>
            <span className="text-3xl font-extrabold text-white ml-3">E-Öğren</span>
          </div>

          <nav className="flex-1">
            <ul className="space-y-3">
              {/* Dashboard butonu */}
              <li>
                <button
                  onClick={() => setActiveTab('dashboard')} // activeTab'ı 'dashboard' olarak ayarlar
                  className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === 'dashboard' ? 'bg-violet-700 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="mr-3" size={20} />
                  Dashboard
                </button>
              </li>
              {/* Kelime Kartları, Quiz ve Akıl Haritası butonları buradan kaldırıldı. */}
              {/* Artık bu bileşenlere Dashboard üzerinden erişilecek. */}

              {/* Okuma Pratiği butonu */}
              <li>
                <button
                  onClick={() => setActiveTab('readingpractice')} // activeTab'ı 'readingpractice' olarak ayarlar
                  className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === 'readingpractice' ? 'bg-violet-700 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <BookOpen className="mr-3" size={20} />
                  Okuma Pratiği
                </button>
              </li>
              {/* Defterim butonu */}
              <li>
                <button
                  onClick={() => setActiveTab('notebook')} // activeTab'ı 'notebook' olarak ayarlar
                  className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === 'notebook' ? 'bg-violet-700 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <BookText className="mr-3" size={20} />
                  Defterim
                </button>
              </li>
              {/* Bildirimler butonu */}
              <li>
                <button
                  onClick={() => setActiveTab('notifications')} // activeTab'ı 'notifications' olarak ayarlar
                  className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === 'notifications' ? 'bg-violet-700 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <BellRing className="mr-3" size={20} />
                  Bildirimler
                </button>
              </li>
              {/* Profil butonu */}
              <li>
                <button
                  onClick={() => setActiveTab('profile')} // activeTab'ı 'profile' olarak ayarlar
                  className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === 'profile' ? 'bg-violet-700 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <User className="mr-3" size={20} />
                  Profil
                </button>
              </li>
              {/* Dark Mode Toggle */}
              <li>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200 mt-4"
                >
                  {darkMode ? <Sun className="mr-3" size={20} /> : <Moon className="mr-3" size={20} />}
                  {darkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
                </button>
              </li>
              {/* Çıkış Yap butonu */}
              <li>
                <button
                  onClick={signOut}
                  className="w-full flex items-center p-3 text-red-400 hover:bg-red-700 hover:text-white rounded-lg transition-colors duration-200 mt-4"
                >
                  Çıkış Yap
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Ana İçerik Alanı */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">
              {userName || userEmail || 'Misafir'}
            </h1>
            {/* Kullanıcı profil açılır menüsü/avatarı buraya eklenebilir */}
          </header>

          {/* activeTab state'ine göre doğru bileşeni render et */}
          {activeTab === 'dashboard' && (
            <Dashboard
              userProgress={userProgress}
              handleRemoveLearnedWord={handleRemoveLearnedWord}
              onSelectComponent={setActiveTab} // Dashboard'a setActiveTab'ı prop olarak iletiyoruz
            />
          )}
          {activeTab === 'wordcard' && <WordCard />}
          {activeTab === 'quiz' && <QuizComponent />}
          {activeTab === 'mindmapper' && <MindMapper />}
          {activeTab === 'readingpractice' && <ReadingPractice />}
          {activeTab === 'notebook' && <Notebook userId={userId} />}
          {activeTab === 'notifications' && <NotificationScheduler userId={userId} />}
          {activeTab === 'profile' && (
            <ProfilePage
              userName={userName}
              userEmail={userEmail}
              userAge={userAge}
              userProfile={userProfile}
              // ProfilePage'in ihtiyaç duyduğu diğer propları buraya ekleyin
            />
          )}
          {/* AIChat, kayan bir bileşen olduğu için activeTab'ın bir parçası olmayabilir */}
          {/* Bu kısım orijinal App.jsx kodunuzda zaten var, olduğu gibi bırakıldı */}
          {currentUser && (
            <AIChat
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              userId={userId}
              userProfile={userProfile}
              addActivity={
                async (text) => await saveProgressToFirestore({ activities: arrayUnion({ text, timestamp: serverTimestamp() }) })
              }
            />
          )}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="fixed bottom-6 right-6 bg-violet-600 text-white p-4 rounded-full shadow-lg hover:bg-violet-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-violet-300"
            title="AI Chat Aç/Kapat"
          >
            <BrainCircuit size={24} />
          </button>
        </div>
      </div>
    );
  };

  return renderMainContent();
};

export default App;
