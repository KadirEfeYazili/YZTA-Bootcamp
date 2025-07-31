// App.jsx
import React, { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut, // Alias signOut to avoid conflict with local signOut function
  fetchSignInMethodsForEmail, // E-posta adresinin varlığını kontrol etmek için
  signInAnonymously, // Anonim giriş için eklendi
  sendPasswordResetEmail // Import sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { GraduationCap, LayoutDashboard, Component, BookOpen, BrainCircuit, Map, Loader2, XCircle, Chrome, Sun, Moon, User, BellRing, BookText } from 'lucide-react'; // NotebookText yerine BookText ikonu eklendi

// Firebase yapılandırma ve başlatma
import { auth, db, firebaseConfig } from './config/firebase';

// Ana uygulama bileşenleri
import Dashboard from './components/Dashboard';
import WordComparer from './components/WordComparer';
import ReadingPractice from './components/ReadingPractice';
import AIChat from './components/AIChat';
import NavItem from './components/NavItem';
import ProfilePage from './components/ProfilePage';
import NotificationScheduler from './components/NotificationScheduler';
import Notebook from './components/Notebook'; // Yeni bileşen import edildi

// FastAPI backend'inizin temel URL'si
const API_BASE_URL = 'http://127.0.0.1:8000';

const App = () => {
  // Authentication ve Kullanıcı Durumu
  const [currentUser, setCurrentUser] = useState(null); // Firebase Auth'tan gelen kullanıcı objesi
  const [userId, setUserId] = useState(null); // Kullanıcının UID'si
  const [isAuthReady, setIsAuthReady] = useState(false); // Firebase Auth'un başlangıç kontrolünü bitirip bitirmediği

  // Giriş/Kayıt Akışı State'leri
  const [email, setEmail] = useState(''); // Ortak e-posta alanı
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [authMode, setAuthMode] = useState('initial'); // 'initial', 'signup', 'forgotPassword'

  const [userProfile, setUserProfile] = useState(null); // Kullanıcı profil bilgileri için yeni state
  const [statusMessage, setStatusMessage] = useState(''); // Kullanıcıya gösterilecek durum/hata mesajları

  // Uygulama İçeriği State'leri
  const [userProgress, setUserProgress] = useState({
    reading: { correct: 0, total: 0 },
    learnedWords: [],
    activities: []
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar durumu
  const [darkMode, setDarkMode] = useState(true); // Dark Mode

  // New state for user's full name and email for profile page
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAge, setUserAge] = useState(null);

  // __initial_auth_token tanımı dışarıdan geliyorsa kontrol et
  // Bu değişkenin çalışma ortamında tanımlı olup olmadığını kontrol ederiz.
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
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => { // Added async here
        setCurrentUser(user);
        if (user) {
          setUserId(user.uid);
          console.log("Kullanıcı oturum açtı:", user.uid, user.email);
          setUserEmail(user.email); // Set user email

          // Fetch user profile from FastAPI
          try {
            const idToken = await user.getIdToken();
            const profile = await callApi('/users/me/', 'GET', idToken);
            setUserName(`${profile.name} ${profile.surname}`); // Set full name
            setUserAge(profile.age); // Set user age
            console.log("Kullanıcı profil bilgileri alındı:", profile);
          } catch (error) {
            console.error("Kullanıcı profil bilgileri alınırken hata:", error);
            setUserName(user.email); // Fallback to email if name is not found
            setUserAge(null);
          }

        } else {
          setUserId(null); // Kullanıcı yoksa UID'yi temizle
          setAuthMode('initial'); // Kullanıcı çıkış yaparsa başlangıç görünümüne dön
          setEmail(''); // E-posta alanını temizle
          setPassword(''); // Şifre alanını temizle
          setName('');
          setSurname('');
          setAge('');
          setUserName(''); // Clear user name on sign out
          setUserEmail(''); // Clear user email on sign out
          setUserAge(null); // Clear user age on sign out
          console.log("Kullanıcı oturumu kapandı.");
        }
        setIsAuthReady(true); // Kimlik doğrulama durumu kontrol edildi
        console.log("isAuthReady true olarak ayarlandı.");
      });
      return () => unsubscribeAuth();
    };
    initFirebase();
  }, []); // Bağımlılıklar boş bırakıldı, böylece sadece bir kez çalışır

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
  }, [currentUser, userId, API_BASE_URL, setStatusMessage]); // Bağımlılıkları güncelledik

  // Kullanıcı ilerlemesini Firestore'dan dinle
  useEffect(() => {
    console.log("Firestore dinleyicisi useEffect çalıştı. Durum: db:", !!db, "userId:", !!userId, "isAuthReady:", isAuthReady);
    // db, userId ve isAuthReady hazır olduğunda dinlemeye başla
    if (!db || !userId || !isAuthReady) {
      console.log("Firestore dinleyicisi başlatılamadı: db, userId veya isAuthReady hazır değil.");
      return;
    }

    // Firestore yolunu Firebase Config'ten gelen appId ile oluştur
    const userProgressDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/progress/userProgress`);
    console.log("Firestore belge yolu:", userProgressDocRef.path);

    const unsubscribeSnapshot = onSnapshot(userProgressDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Firestore'dan kullanıcı ilerlemesi alındı:", data);

        // Firestore Timestamp objelerini JavaScript Date objelerine dönüştür
        const activities = data.activities?.map(activity => ({
          ...activity,
          timestamp: activity.timestamp?.toDate?.() || new Date() // toDate() yoksa yeni Date
        })) || [];

        // Eksik alanlar için varsayılan değerler sağlayarak userProgress'i güvenle ayarla
        setUserProgress({
          reading: data.reading || { correct: 0, total: 0 }, // 'reading' yoksa varsayılanı kullan
          learnedWords: data.learnedWords || [], // 'learnedWords' yoksa boş dizi kullan
          activities: activities
        });

      } else {
        console.log("Kullanıcı ilerleme belgesi Firestore'da bulunamadı. Yeni belge oluşturuluyor...");
        // Belge yoksa, başlangıç verilerini ayarla
        setDoc(userProgressDocRef, {
          reading: { correct: 0, total: 0 },
          learnedWords: [],
          activities: []
        }).then(() => {
          console.log("Başlangıç ilerlemesi başarıyla ayarlandı.");
          // Yeni belge oluşturulduğunda state'i de güncellemeyi unutmayın
          setUserProgress({ // Bu satır onSnapshot sonrası tetiklenen render için önemli
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
      unsubscribeSnapshot(); // Cleanup function
      console.log("Firestore dinleyicisi temizlendi.");
    };
  }, [db, userId, isAuthReady, firebaseConfig.appId]); // Bağımlılıklar güncellendi

  // Firestore Auth'un başlatıldığından emin olmak için test useEffect
  useEffect(() => {
    const testEmail = "berkeiou@outlook.com"; // Test etmek istediğiniz bir e-posta
    const testSignInMethods = async () => {
      // auth objesinin tanımlı olduğundan emin olun
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
    // isAuthReady true olduğunda testi çalıştır
    if (isAuthReady) {
      testSignInMethods();
    } else {
      console.log(">> TEST: isAuthReady henüz true değil, test bekletiliyor.");
    }
  }, [isAuthReady]); // isAuthReady değiştiğinde tekrar çalıştır

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
        console.warn("İlerleme belgesi bulunamadı, yeni belge oluşturuluyor...");
        // Belge yoksa oluştur (merge: true ile mevcut alanları koru)
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
      // 1. Firebase Authentication ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Firebase kullanıcısı oluşturuldu:", user.uid, user.email);
      const idToken = await user.getIdToken(); // Firebase ID Token'ı al
      console.log("Firebase ID Token alındı.");

      // 2. FastAPI backend'e ek profil bilgilerini gönder
      console.log("FastAPI backend'e profil bilgileri gönderiliyor...");
      await callApi('/users/initialize_profile/', 'POST', idToken, {
        name: name,
        surname: surname,
        age: parsedAge,
        email: email
      });
      console.log("FastAPI profil oluşturma başarılı.");

      setUserName(`${name} ${surname}`); // Set userName after successful signup
      setUserEmail(email); // Set userEmail after successful signup
      setUserAge(parsedAge); // Set userAge after successful signup

      setStatusMessage('Kayıt başarılı! Hoş geldiniz, ' + name + ' ' + surname + '.');
      // Formu temizle
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
      // Formu temizle (optional, as the state will change and component re-renders)
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

  // --- Google ile Giriş İşlemi ---
  const handleGoogleLogin = async () => {
    setStatusMessage('Google ile giriş yapılıyor...');
    console.log("Google ile giriş butonu tıklandı.");
    try {
      const provider = new GoogleAuthProvider();
      console.log("Google pop-up açılıyor...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google ile kullanıcı giriş yaptı:", user.uid, user.email);
      const idToken = await user.getIdToken(); // Firebase ID Token'ı al
      console.log("Firebase ID Token alındı.");

      // 1. Kullanıcının profilinin Firestore'da olup olmadığını kontrol et
      let profileExists = false;
      console.log("FastAPI'den kullanıcı profili kontrol ediliyor...");
      try {
        await callApi('/users/me/', 'GET', idToken);
        profileExists = true;
        console.log("FastAPI'de profil bulundu.");
      } catch (error) {
        // 404 Not Found hatası alırsak, profil yok demektir.
        if (error.message.includes("404")) {
          profileExists = false;
          console.log("FastAPI'de profil bulunamadı (404).");
        } else {
          console.error("FastAPI profil kontrolünde başka bir hata:", error);
          throw error; // Başka bir API hatası varsa fırlat
        }
      }

      if (!profileExists) {
        // Kullanıcı ilk kez Google ile giriş yapıyor, ek bilgileri al
        const googleName = user.displayName ? user.displayName.split(' ')[0] : '';
        const googleSurname = user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '';

        console.log("Yeni Google kullanıcısı. Yaş isteniyor...");
        // Yaş bilgisini kullanıcıdan iste (Google bunu sağlamaz)
        let ageInput = prompt("Google ile ilk girişiniz. Lütfen yaşınızı girin:");
        let parsedAge = parseInt(ageInput);
        console.log("Girilen yaş:", ageInput, "Parsed yaş:", parsedAge);

        if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
          setStatusMessage('Geçerli bir yaş girilmedi. Profil oluşturulamadı. Lütfen tekrar deneyin.');
          // Profil oluşturulmazsa Firebase Auth oturumunu da kapat
          await firebaseSignOut(auth);
          console.warn("Geçersiz yaş girildiği için Google oturumu kapatıldı.");
          return;
        }

        // FastAPI backend'e ek profil bilgilerini gönder
        console.log("FastAPI backend'e yeni profil bilgileri gönderiliyor...");
        await callApi('/users/initialize_profile/', 'POST', idToken, {
          name: googleName,
          surname: googleSurname,
          age: parsedAge,
          email: user.email // Google'dan gelen e-posta
        });
        setStatusMessage('Google ile ilk girişiniz. Profiliniz oluşturuldu!');
        console.log("Google ile yeni kullanıcı kaydoldu ve profili oluşturuldu:", user.uid);

        setUserName(`${googleName} ${googleSurname}`); // Set userName for new Google user
        setUserEmail(user.email); // Set userEmail for new Google user
        setUserAge(parsedAge); // Set userAge for new Google user

      } else {
        setStatusMessage('Google ile giriş başarılı!');
        console.log("Google ile mevcut kullanıcı giriş yaptı:", user.uid);
      }

    } catch (error) {
      console.error("Google Giriş Hatası:", error);
      let errorMessage = 'Google ile giriş hatası oluştu.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Giriş penceresi kapatıldı.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setStatusMessage(errorMessage);
    }
  };

  // --- Şifre Sıfırlama İşlemi ---
  const handleForgotPassword = async () => {
    setStatusMessage('Şifre sıfırlama bağlantısı gönderiliyor...');
    console.log("Şifremi Unuttum butonu tıklandı. E-posta:", email);
    try {
      if (!email) {
        setStatusMessage('Lütfen e-posta adresinizi girin.');
        console.warn("Şifre sıfırlama için e-posta boş.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setStatusMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      setEmail(''); // E-posta alanını temizle
      console.log("Şifre sıfırlama e-postası başarıyla gönderildi.");
    } catch (error) {
      console.error("Şifre Sıfırlama Hatası:", error);
      let errorMessage = 'Şifre sıfırlama hatası oluştu.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresine sahip bir kullanıcı bulunamadı.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi biçimi.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setStatusMessage(errorMessage);
    }
  };

  // --- Çıkış Yapma İşlemi ---
  const handleSignOut = async () => {
    setStatusMessage('Çıkış yapılıyor...');
    console.log("Çıkış yap butonu tıklandı.");
    try {
      await firebaseSignOut(auth);
      setStatusMessage('Başarıyla çıkış yapıldı.');
      console.log("Firebase oturumu başarıyla kapatıldı.");
    } catch (error) {
      console.error("Çıkış Hatası:", error);
      setStatusMessage('Çıkış yaparken hata oluştu: ' + error.message);
    }
  };

  // Dark Mode Toggle
  const toggleDarkMode = () => {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      console.log("Dark mode toggled. Previous:", prevMode, "New:", newMode);
      return newMode; // Sadece state'i güncelle
    });
  };

  // Kullanıcı giriş yapmışsa ana içeriği, yapmamışsa giriş/kayıt formlarını render et
  const renderAppContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard userProgress={userProgress} handleRemoveLearnedWord={handleRemoveLearnedWord} />;
      case 'word': return <WordComparer userProgress={userProgress} saveProgress={saveProgressToFirestore} db={db} userId={userId} firebaseAppId={firebaseConfig.appId} />;
      case 'reading': return <ReadingPractice userProgress={userProgress} saveProgress={saveProgressToFirestore} />;
      case 'mindmap': return <MindMapper saveProgress={saveProgressToFirestore} />;
      case 'quiz': return <QuizComponent />;
      case 'profile':
        return (
          <ProfilePage
            userName={userProfile?.username || currentUser?.displayName || "Misafir Kullanıcı"} // userProfile'dan username'i al, yoksa currentUser'dan displayName'i kullan
            userEmail={userProfile?.email || currentUser?.email || "Bilgi Yok"} // userProfile'dan email'i al, yoksa currentUser'dan email'i kullan
            userAge={userProfile?.age} // userProfile'dan age'i al
          />
        );
      case 'notifications': // Yeni bildirimler sekmesi
        return <NotificationScheduler userId={userId} db={db} firebaseAppId={firebaseConfig.appId} />;
      case 'word-cards': // Yeni Kelime Kartları sekmesi
        return <WordCardDisplay userId={userId} db={db} firebaseAppId={firebaseConfig.appId} saveProgress={saveProgressToFirestore} />;
      case 'notebook': // Yeni Not Defteri sekmesi
        return <Notebook userId={userId} db={db} firebaseAppId={firebaseConfig.appId} />;
      case 'chat': return <AIChat currentUser={currentUser} userId={userId} />; // Eğer AIChat bileşeniniz varsa
      default: return <Dashboard userProgress={userProgress} handleRemoveLearnedWord={handleRemoveLearnedWord} />;
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-100">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="ml-3 text-lg">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'dark' : ''} flex h-screen bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans`}>
      {currentUser ? (
        // Kullanıcı giriş yapmışsa ana uygulama arayüzü
        <>
          <aside
            className={`bg-white/80 dark:bg-slate-800 backdrop-blur-lg p-4 flex flex-col border-r border-violet-100 dark:border-slate-700 transition-width duration-300 ease-in-out`}
            style={{
              width: isSidebarOpen ? '16rem' : '6rem', // Açıkken geniş, kapalıyken dar
            }}
          >
            <div
              className={`flex items-center mb-8 px-2 cursor-pointer justify-center`}
              onClick={toggleSidebar}
            >
              <img
                src="https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/refs/heads/main/public/images/PrepmateLogo.png" // logo eklendi
                alt="PrepMate Logo"
                className="w-13 h-8 object-contain transition-transform hover:scale-105 duration-200"
              />
            </div>

            <button
              onClick={toggleDarkMode}
              className="mb-4 px-4 py-2 flex items-center space-x-2 bg-violet-500 text-white rounded hover:bg-violet-600 transition duration-200"
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

            {/* Kullanıcı ID'sini gizledik (geliştirme sırasında yorum satırı olarak kalabilir)
            {userId && isSidebarOpen && ( // Sadece sidebar açıkken göster
              <div className="mb-4 text-xs text-slate-500 dark:text-slate-300 px-2">
                Kullanıcı ID: <span className="font-mono break-all">{userId}</span>
              </div>
            )}
            */}
            <nav className="flex flex-col space-y-2">
              {/* New NavItem for Profile */}
              <NavItem tabName="profile" icon={<User className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Profilim</NavItem>

              <NavItem tabName="dashboard" icon={<LayoutDashboard className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>İlerleme Paneli</NavItem>
              <NavItem tabName="word" icon={<Component className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Kelime Karşılaştırma</NavItem>
              <NavItem tabName="reading" icon={<BookOpen className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Okuma Alıştırması</NavItem>
              <NavItem tabName="notifications" icon={<BellRing className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Günlük Bildirimler</NavItem>
              {/* Yeni Not Defteri NavItem'ı */}
              <NavItem tabName="notebook" icon={<BookText className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Not Defteri</NavItem> {/* NotebookText yerine BookText kullanıldı */}
              {/* Çıkış Yap butonu NavItem olarak eklendi */}
              <button
                onClick={handleSignOut}
                className="flex items-center w-full py-2 px-4 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200"
              >
                <XCircle className="mr-3" size={18} /> {isSidebarOpen && <span>Çıkış Yap</span>}
              </button>
            </nav>
          </aside>

          <main className="flex-1 overflow-y-auto bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            {renderAppContent()}
          </main>

          {/* AI Chat açma butonu */}
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

          {/* AI Chat modalı */}
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
        </>
      ) : (
        // Kullanıcı giriş yapmamışsa giriş/kayıt arayüzü
        <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 p-4 w-full">
          <div className="bg-white p-8 rounded-xl shadow-none w-full max-w-md text-center">
            <h2 className="text-3xl font-normal text-gray-800 mb-8">
              Prepmate'e hoş geldin
            </h2>

            {statusMessage && (
              <div className="mb-4 p-3 text-sm rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200">
                {statusMessage}
              </div>
            )}

            {authMode === 'initial' && (
              <>
                <input
                  type="email"
                  placeholder="E-posta adresi"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 mb-4 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 mb-4 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleLoginAttemptFromInitial}
                  className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => { setAuthMode('forgotPassword'); setStatusMessage(''); setEmail(''); }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  Şifremi unuttum?
                </button>
                <p className="mt-6 text-gray-600">
                  Hesabın yok mu?{' '}
                  <button
                    onClick={() => { setAuthMode('signup'); setStatusMessage(''); }}
                    className="text-blue-600 hover:text-blue-800 font-semibold focus:outline-none"
                  >
                    Kaydol
                  </button>
                </p>
                <div className="my-6 flex items-center">
                  <hr className="flex-grow border-t border-gray-300" />
                  <span className="px-3 text-gray-500 text-sm">YADA</span>
                  <hr className="flex-grow border-t border-gray-300" />
                </div>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-full shadow-sm flex items-center justify-center gap-3 transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none ring-4 ring-white/30"
                >
                  <Chrome size={24} className="text-gray-700" /> Google ile devam et
                </button>
              </>
            )}

            {authMode === 'signup' && (
              <>
                <input
                  type="email"
                  placeholder="E-posta adresiniz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 mb-4 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Adınız"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 mb-3 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Soyadınız"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full p-3 mb-3 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Yaşınız"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full p-3 mb-3 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1" max="120"
                />
                <input
                  type="password"
                  placeholder="Şifre (min 6 karakter)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 mb-4 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSignup}
                  className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Kaydol
                </button>
                <button
                  onClick={() => { setAuthMode('initial'); setPassword(''); setStatusMessage(''); }}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  Geri dön
                </button>
              </>
            )}

            {authMode === 'forgotPassword' && (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Şifremi Sıfırla</h2>
                <input
                  type="email"
                  placeholder="E-posta adresinizi girin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 mb-4 rounded-full border border-blue-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleForgotPassword}
                  className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Şifre Sıfırlama Bağlantısı Gönder
                </button>
                <button
                  onClick={() => { setAuthMode('initial'); setStatusMessage(''); setEmail(''); }}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  Geri Dön
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
