// src/App.jsx

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom'; // App12.jsx'ten eklendi
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
import { GraduationCap, LayoutDashboard, Component, BookOpen, BrainCircuit, Map, Loader2, XCircle, Chrome, Sun, Moon, User, BellRing, BookText, Info } from 'lucide-react';

// Firebase yapılandırma ve başlatma
import { auth, db, firebaseConfig } from './config/firebase';

// Ana uygulama bileşenleri (orijinal halleriyle)
import AboutPage from './components/AboutPage';
import Dashboard from './components/Dashboard';
import WordComparer from './components/WordComparer';
import ReadingPractice from './components/ReadingPractice';
import MindMapper from './components/MindMapper';
import AIChat from './components/AIChat';
import NavItem from './components/NavItem';
import QuizComponent from './components/QuizComponent';
import ProfilePage from './components/ProfilePage';
import NotificationScheduler from './components/NotificationScheduler';
import WordCardDisplay from './components/WordCardDisplay';
import Notebook from './components/Notebook';

// FastAPI backend'inizin temel URL'si
const API_BASE_URL = 'https://yzta-bootcamp.onrender.com';


const PROFILE_PIC_NAMES = [
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/default_profile.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_1.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_2.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_3.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_4.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_5.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_6.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_7.png",
  "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/Gemini_8.png"
];

console.log("🎨 PROFILE_PIC_NAMES dizisi:", PROFILE_PIC_NAMES);

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [authMode, setAuthMode] = useState('initial');

  const [userProfile, setUserProfile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [userProgress, setUserProgress] = useState({
    reading: { correct: 0, total: 0 },
    learnedWords: [],
    activities: []
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const handleButtonClick = () => {
    setShowBubble(false);
    setIsChatOpen(true);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAge, setUserAge] = useState(null);
  const [userProfilePicture, setUserProfilePicture] = useState(PROFILE_PIC_NAMES[0]);

  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [selectedProfilePic, setSelectedProfilePic] = useState('');
  const [profilePicLoadStatus, setProfilePicLoadStatus] = useState({});

  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // Profil resimlerinin yüklenme durumunu test eden fonksiyon
  const testProfilePictures = async () => {
    console.log("🔍 Profil resimlerini test ediliyor...");
    const loadStatus = {};
    
    for (const imageName of PROFILE_PIC_NAMES) {
      try {
        const imageUrl = imageName;
        console.log(`📸 Test ediliyor: ${imageUrl}`);
        
        const img = new Image();
        const loadPromise = new Promise((resolve, reject) => {
          img.onload = () => {
            console.log(`✅ Başarılı: ${imageName} yüklendi`);
            resolve(true);
          };
          img.onerror = () => {
            console.error(`❌ Hata: ${imageName} yüklenemedi`);
            reject(false);
          };
        });
        
        img.src = imageUrl;
        const result = await loadPromise.catch(() => false);
        loadStatus[imageName] = result;
        
      } catch (error) {
        console.error(`💥 ${imageName} test edilirken hata:`, error);
        loadStatus[imageName] = false;
      }
    }
    
    console.log("📊 Profil resmi yükleme durumu:", loadStatus);
    setProfilePicLoadStatus(loadStatus);
    return loadStatus;
  };

  useEffect(() => {
    console.log("Dark mode useEffect çalıştı. darkMode:", darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
            setUserProfile(profile);
            const profilePicUrl = profile.profile_picture_url || PROFILE_PIC_NAMES[0];
            setUserProfilePicture(profilePicUrl);
            console.log("👤 Kullanıcı profil bilgileri alındı:", profile);
            console.log("🖼️ Backend'den gelen profil resmi URL'si:", profile.profile_picture_url);
            console.log("🖼️ Kullanılacak profil resmi URL'si:", profilePicUrl);
          } catch (error) {
            console.error("Kullanıcı profil bilgileri alınırken hata:", error);
            setUserName(user.email);
            setUserAge(null);
            setUserProfile(null);
            setUserProfilePicture(PROFILE_PIC_NAMES[0]);
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
          setUserProfile(null);
          setUserProfilePicture(PROFILE_PIC_NAMES[0]);
          console.log("Kullanıcı oturumu kapandı.");
        }
        setIsAuthReady(true);
        console.log("isAuthReady true olarak ayarlandı.");
      });
      return () => unsubscribeAuth();
    };
    initFirebase();
  }, []);

  // Profil resimlerini test et (uygulama yüklendiğinde)
  useEffect(() => {
    if (isAuthReady) {
      console.log("🚀 Uygulama hazır, profil resimleri test ediliyor...");
      testProfilePictures();
    }
  }, [isAuthReady]);

  // Modal açıldığında profil resimlerini tekrar test et
  useEffect(() => {
    if (showProfilePicModal) {
      console.log("🎭 Profil resmi modalı açıldı, resimler test ediliyor...");
      testProfilePictures();
    }
  }, [showProfilePicModal]);

  const updateUserProfile = async (updatedProfile) => {
    if (!userId || !currentUser) {
      setStatusMessage("Profil güncellenemedi: Kullanıcı oturumu açık değil.");
      return;
    }
    try {
      const idToken = await currentUser.getIdToken();
      console.log("🔄 Profil güncelleme isteği gönderiliyor:", updatedProfile);
      const response = await callApi('/users/me', 'PUT', idToken, updatedProfile);
      console.log("📥 Backend'den gelen güncelleme yanıtı:", response);

      setUserProfile(prev => ({ ...prev, ...response }));

      setUserName(`${response.name} ${response.surname}`);
      setUserEmail(response.email);
      setUserAge(response.age);
      
      // Profil resmi URL'sini güncelle
      if (response.profile_picture_url) {
        setUserProfilePicture(response.profile_picture_url);
        console.log("🖼️ Profil resmi güncellendi:", response.profile_picture_url);
      } else {
        console.log("⚠️ Backend'den profil resmi URL'si gelmedi, mevcut URL korunuyor:", userProfilePicture);
      }

      //setStatusMessage("Profil başarıyla güncellendi!");
      console.log("✅ Profil başarıyla güncellendi:", response);
    } catch (error) {
      console.error("❌ Profil güncellenemedi:", error);
      setStatusMessage("Profil güncellenirken bir hata oluştu: " + error.message);
    }
  };

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
        await setDoc(userProgressDocRef, newProgress, { merge: true });
        console.log("Yeni ilerleme belgesi oluşturuldu ve kaydedildi.");
      } else {
        console.error("İlerleme güncellenirken hata:", error);
        setStatusMessage("İlerleme kaydedilirken hata oluştu: " + error.message);
      }
    }
  };

  // src/App.jsx

const handleRemoveLearnedWord = async (wordToRemove) => {
  console.log(`"${wordToRemove}" kelimesi öğrenilenlerden kaldırılıyor.`);
  await saveProgressToFirestore({
    learnedWords: arrayRemove(wordToRemove),
    activities: arrayUnion({
      text: `"${wordToRemove}" kelimesini öğrenilenlerden çıkardınız.`,
      // FIX: Use the client's current time instead of serverTimestamp()
      timestamp: new Date() 
    })
  });
  console.log(`"${wordToRemove}" kelimesi kaldırma işlemi tamamlandı.`);
};


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

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error("API yanıtı JSON olarak ayrıştırılamadı:", jsonError);
          throw new Error(`API hatası: ${response.status} ${response.statusText || ''}. Sunucudan JSON olmayan yanıt.`);
        }
        console.error("API yanıtı OK değil:", response.status, errorData.detail);
        throw new Error(errorData.detail || `API hatası: ${response.status}`);
      }

      const data = await response.json();
      console.log("API yanıtı:", data);

      console.log("API çağrısı başarılı.");
      return data;
    } catch (error) {
      console.error("API Çağrısı Hatası:", error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error("Ağ hatası: Sunucuya ulaşılamadı. Backend'in çalışıp çalışmadığını ve adresin doğru olup olmadığını kontrol edin.");
      } else {
        throw error;
      }
    }
  };

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
      setUserProfile({
        name: name,
        surname: surname,
        age: parsedAge,
        email: email,
        gender: 'Belirtilmemiş'
      });
      setUserProfilePicture('/images/profile_pics/default_profile.png');


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

  const handleGoogleLogin = async () => {
    //setStatusMessage('Google ile giriş yapılıyor...');
    console.log("Google ile giriş butonu tıklandı.");
    try {
      const provider = new GoogleAuthProvider();
      console.log("Google pop-up açılıyor...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google ile kullanıcı giriş yaptı:", user.uid, user.email);
      const idToken = await user.getIdToken();
      console.log("Firebase ID Token alındı.");

      let profileExists = false;
      console.log("FastAPI'den kullanıcı profili kontrol ediliyor...");
      try {
        await callApi('/users/me/', 'GET', idToken);
        profileExists = true;
        console.log("FastAPI'de profil bulundu.");
      } catch (error) {
        if (error.message.includes("404")) {
          profileExists = false;
          console.log("FastAPI'de profil bulunamadı (404).");
        } else {
          console.error("FastAPI profil kontrolünde başka bir hata:", error);
          throw error;
        }
      }

      if (!profileExists) {
        const googleName = user.displayName ? user.displayName.split(' ')[0] : '';
        const googleSurname = user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '';

        console.log("Yeni Google kullanıcısı. Yaş isteniyor...");
        let ageInput = prompt("Google ile ilk girişiniz. Lütfen yaşınızı girin:");
        let parsedAge = parseInt(ageInput);
        console.log("Girilen yaş:", ageInput, "Parsed yaş:", parsedAge);

        if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
          setStatusMessage('Geçerli bir yaş girilmedi. Profil oluşturulamadı. Lütfen tekrar deneyin.');
          await firebaseSignOut(auth);
          console.warn("Geçersiz yaş girildiği için Google oturumu kapatıldı.");
          return;
        }

        console.log("FastAPI backend'e yeni profil bilgileri gönderiliyor...");
        await callApi('/users/initialize_profile/', 'POST', idToken, {
          name: googleName,
          surname: googleSurname,
          age: parsedAge,
          email: user.email
        });
        setStatusMessage('Google ile ilk girişiniz. Profiliniz oluşturuldu!');
        console.log("Google ile yeni kullanıcı kaydoldu ve profili oluşturuldu:", user.uid);

        setUserProfile({
          name: googleName,
          surname: googleSurname,
          age: parsedAge,
          email: user.email,
          gender: 'Belirtilmemiş'
        });

        setUserName(`${googleName} ${googleSurname}`);
        setUserEmail(user.email.toString());
        setUserAge(parsedAge);
        setUserProfilePicture('/images/profile_pics/default_profile.png');

      } else {
        //setStatusMessage('Google ile giriş başarılı!');
        console.log("Google ile mevcut kullanıcı giriş yaptı:", user.uid);

        try {
          const profile = await callApi('/users/me', 'GET', idToken);
          setUserProfile(profile);
          setUserName(`${profile.name} ${profile.surname}`);
          setUserEmail(profile.email);
          setUserAge(profile.age);
          setUserProfilePicture(profile.profile_picture_url || '/images/profile_pics/default_profile.png');
          console.log("Mevcut Google kullanıcısının profil bilgileri yenilendi:", profile);
        } catch (error) {
          console.error("Google kullanıcısının profil bilgileri alınırken hata:", error);
        }
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
      setEmail('');
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

  const toggleDarkMode = () => {
    setDarkMode(prevMode => {
      const newMode = !prevMode;
      console.log("Dark mode toggled. Previous:", prevMode, "New:", newMode);
      return newMode;
    });
  };

  const handleProfilePicSelect = (imageName) => {
    console.log("🖼️ Profil resmi seçildi:", imageName);
    setSelectedProfilePic(imageName);
  };

  const handleSaveProfilePic = async () => {
    if (!selectedProfilePic) {
      setStatusMessage("Lütfen bir resim seçin.");
      console.warn("⚠️ Resim seçilmeden kaydetme denendi");
      return;
    }
    const newProfilePicUrl = selectedProfilePic; // Doğrudan GitHub URL'sini kullan
    console.log("💾 Yeni profil resmi kaydediliyor:", newProfilePicUrl);

    try {
      await updateUserProfile({ profile_picture_url: newProfilePicUrl });
      setUserProfilePicture(newProfilePicUrl);
      setStatusMessage("Profil resmi başarıyla güncellendi!");
      setShowProfilePicModal(false);
      console.log("✅ Profil resmi başarıyla güncellendi:", newProfilePicUrl);
    } catch (error) {
      console.error("❌ Profil resmi güncellenirken hata:", error);
      setStatusMessage("Profil resmi güncellenirken bir hata oluştu: " + error.message);
    }
  };


  const renderAppContent = () => {
    switch (activeTab) {
          
      case 'about':
        return <AboutPage />;
      case 'dashboard': 
        // App12.jsx'ten gelen fark: Dashboard'a ek proplar eklendi
        return <Dashboard 
          userProgress={userProgress} 
          handleRemoveLearnedWord={handleRemoveLearnedWord}
          WordCardDisplay={WordCardDisplay}
          QuizComponent={QuizComponent}
          MindMapper={MindMapper}
          saveProgress={saveProgressToFirestore}
          userId={userId}
          db={db}
          firebaseAppId={firebaseConfig.appId}
        />;
      case 'word': return <WordComparer userProgress={userProgress} saveProgress={saveProgressToFirestore} db={db} userId={userId} firebaseAppId={firebaseConfig.appId} />;
      case 'reading': return <ReadingPractice userProgress={userProgress} saveProgress={saveProgressToFirestore} />;
      case 'mindmap': return <MindMapper saveProgress={saveProgressToFirestore} />;
      case 'quiz': return <QuizComponent />;
      case 'profile':
        return (
          <ProfilePage
            userName={userProfile?.name && userProfile?.surname ? `${userProfile.name} ${userProfile.surname}` : currentUser?.displayName || "Misafir Kullanıcı"}
            userEmail={userProfile?.email || currentUser?.email || "Bilgi Yok"}
            userAge={userProfile?.age}
            userGender={userProfile?.gender || 'Belirtilmemiş'}
            userProfilePicture={userProfilePicture}
            onSave={updateUserProfile}
            onOpenProfilePicModal={() => {
              setShowProfilePicModal(true);
              // Mevcut seçili resmi moda'a aktar
              setSelectedProfilePic(userProfilePicture.split('/').pop());
            }}
          />
        );
      case 'notifications':
        return <NotificationScheduler userId={userId} db={db} firebaseAppId={firebaseConfig.appId} />;
      case 'word-cards':
        return <WordCardDisplay userId={userId} db={db} firebaseAppId={firebaseConfig.appId} saveProgress={saveProgressToFirestore} />;
      case 'notebook':
        return <Notebook userId={userId} db={db} firebaseConfig={firebaseConfig} />;
      case 'chat': return <AIChat currentUser={currentUser} userId={userId} />;
      default: 
        // App12.jsx'ten gelen fark: Dashboard'a ek proplar eklendi
        return <Dashboard 
          userProgress={userProgress} 
          handleRemoveLearnedWord={handleRemoveLearnedWord}
          WordCardDisplay={WordCardDisplay}
          QuizComponent={QuizComponent}
          MindMapper={MindMapper}
          saveProgress={saveProgressToFirestore}
          userId={userId}
          db={db}
          firebaseAppId={firebaseConfig.appId}
        />;
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
        <>
          <aside
            className={`bg-white/80 dark:bg-slate-800 backdrop-blur-lg p-4 flex flex-col border-r border-violet-100 dark:border-slate-700 transition-width duration-300 ease-in-out`}
            style={{
              width: isSidebarOpen ? '16rem' : '6rem',
            }}
          >
            <div
              className={`flex items-center mb-8 px-2 cursor-pointer justify-center`}
              onClick={toggleSidebar}
            >
              <img
                src="https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/refs/heads/main/public/images/PrepmateLogo.png"
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

            <nav className="flex flex-col space-y-2">
              <NavItem tabName="profile" icon={<User className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Profilim</NavItem>

             <NavItem tabName="about" icon={<Info className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Hakkında</NavItem>
              <NavItem tabName="dashboard" icon={<LayoutDashboard className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>İlerleme Paneli</NavItem>
              <NavItem tabName="word" icon={<Component className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Anlam Karşılaştırma</NavItem>
              <NavItem tabName="reading" icon={<BookOpen className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Okuma Alıştırması</NavItem>
              <NavItem tabName="notifications" icon={<BellRing className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Günlük Bildirimler</NavItem>
              <NavItem tabName="notebook" icon={<BookText className="mr-3" size={18} />} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen}>Not Defteri</NavItem>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full py-2 px-4 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200"
              >
                <XCircle className="mr-3" size={18} /> {isSidebarOpen && <span>Çıkış Yap</span>}
              </button>
            </nav>
          </aside>

          <main className="flex-1 overflow-y-auto bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            {statusMessage && (
              <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-center">
                {statusMessage}
              </div>
            )}
            {renderAppContent()}
          </main>

           {!isChatOpen && (
             <div className="fixed bottom-8 right-8 z-40">
               <div className="relative inline-block">
                 <button
                   onClick={handleButtonClick}
                   className="bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 focus:outline-none ring-4 ring-white/30"
                   aria-label="Chat Aç"
                 >
                   <img
                     src="https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/refs/heads/main/public/images/chatavatar.png"
                     alt="Chat Aç"
                     className="w-9 h-9 transform scale-125"
                   />
                 </button>

                 {showBubble && (
                   <div className="absolute right-0 w-56 p-4 bg-white dark:bg-sky-600 rounded-lg shadow-lg text-base text-gray-900 dark:text-white" style={{ bottom: 'calc(100% + 16px)' }}>
                     PrepChatBot'a sormak istediğiniz bir şey var mı?
                   </div>
                 )}
               </div>
             </div>
           )}

           {isChatOpen && (
             <div
               className="fixed top-0 right-4 z-50 bg-violet-50 dark:bg-slate-800 rounded-l-2xl shadow-2xl h-screen flex flex-col"
               style={{ width: '480px', maxWidth: '35vw', minWidth: '320px' }}
             >
               <button
                 onClick={() => setIsChatOpen(false)}
                 className="absolute top-3 left-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 z-10"
                 aria-label="Chat Kapat"
               >
                 <XCircle size={28} />
               </button>
               <div className="flex-1 overflow-auto p-2">
                 <AIChat saveProgress={saveProgressToFirestore} />
               </div>
             </div>
           )}

          {/* Profil Resmi Seçim Modalı */}
          {showProfilePicModal && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                <button
                  onClick={() => setShowProfilePicModal(false)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100"
                >
                  <XCircle size={24} />
                </button>
                <h3 className="text-xl font-semibold mb-4 text-center">Profil Resmi Seç</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 text-center">
                  Profil resminizi değiştirmek için aşağıdaki resimlerden birini seçin.
                </p>
                <div className="grid grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
                  {PROFILE_PIC_NAMES.map((imageName) => (
                    <div
                      key={imageName}
                      className={`relative w-24 h-24 rounded-full overflow-hidden border-2 cursor-pointer transition-all duration-200 ease-in-out
                        ${selectedProfilePic === imageName ? 'border-violet-500 ring-4 ring-violet-300' : 'border-transparent hover:border-violet-400'}`}
                      onClick={() => handleProfilePicSelect(imageName)}
                    >
                      <img
                        src={imageName} // Doğrudan GitHub raw URL'sini kullan
                        alt={imageName.split('/').pop().replace('.png', '').replace(/_/g, ' ')} // Alt metni daha açıklayıcı hale getirdik
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Resim yüklenirken hata olursa varsayılan ikonu gösterebilirsiniz
                          e.target.onerror = null; // Sonsuz döngüyü önler
                          e.target.src = PROFILE_PIC_NAMES[0]; // İlk resim (default) kullan
                          console.error(`❌ Resim yüklenemedi: ${imageName}`);
                        }}
                      />
                      {selectedProfilePic === imageName && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveProfilePic}
                  className="w-full mt-6 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full shadow-md transition duration-200 ease-in-out"
                >
                  Seçimi Onayla
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 w-full">
          <div className="bg-white/80 dark:bg-slate-800 backdrop-blur-lg p-8 rounded-xl shadow-xl border border-violet-100 dark:border-slate-700 w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <img
                src="https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/refs/heads/main/public/images/PrepmateLogo.png"
                alt="PrepMate Logo"
                className="w-56 h-32 object-contain"
              />
            </div>
            <h2 className="text-3xl font-normal text-slate-800 dark:text-slate-100 mb-8">
               Hoş Geldin
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


