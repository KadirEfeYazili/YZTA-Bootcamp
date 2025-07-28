// src/components/WordCardDisplay.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp, setDoc } from 'firebase/firestore';
import { Loader2, BookOpen, XCircle, RefreshCw } from 'lucide-react'; // RefreshCw ikonu eklendi
import WordCard from './WordCard';

// Firebase yapılandırma ve başlatma (prop olarak geldiği için doğrudan kullanılmayacak)
// import { auth, db, firebaseConfig } from '../config/firebase';

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_KEY = "AIzaSyCSuzlRr7AmF59CsaNC9S5Asa-U9Rpx7Mo"; // Canvas ortamı bu anahtarı otomatik olarak sağlayacaktır.

const WordCardDisplay = ({ userId, db, firebaseAppId, saveProgress }) => {
  const [wordsToLearn, setWordsToLearn] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [isGeneratingWords, setIsGeneratingWords] = useState(false); // Yeni kelime üretme durumu

  // Firestore belge referansı - useMemo ile optimize et
  const userProgressDocRef = useMemo(() => {
    return userId && db ? doc(db, `artifacts/${firebaseAppId}/users/${userId}/progress/userProgress`) : null;
  }, [userId, db, firebaseAppId]);

  // Yapay zekadan kelime çekme fonksiyonu
  const fetchWordsFromAI = async () => {
    setIsGeneratingWords(true);
    setStatusMessage("YDS'ye yönelik yeni kelimeler üretiliyor...");
    console.log("AI'dan kelime çekme başlatıldı.");

    const prompt = `YDS sınavına hazırlananlar için 5 adet ileri seviye İngilizce kelime, Türkçe anlamları ve İngilizce örnek cümleleri ile birlikte JSON formatında listele. JSON yapısı şu şekilde olmalı: [{"word": "kelime", "meaning": "anlamı", "example": "örnek cümle"}]. Örnek cümleler kelimenin akademik kullanımını yansıtmalı.`;

    try {
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                "word": { "type": "STRING" },
                "meaning": { "type": "STRING" },
                "example": { "type": "STRING" }
              },
              "propertyOrdering": ["word", "meaning", "example"]
            }
          }
        }
      };

      const response = await fetch(`${API_BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API hatası: ${response.status} - ${errorData.error?.message || 'Bilinmeyen hata'}`);
      }

      const result = await response.json();
      console.log("AI'dan gelen ham yanıt:", result);

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const generated = JSON.parse(jsonString);

        if (Array.isArray(generated) && generated.length > 0) {
          setWordsToLearn(generated);
          setCurrentWordIndex(0);
          setStatusMessage("Yeni kelimeler başarıyla üretildi!");
          console.log("AI tarafından üretilen kelimeler:", generated);
          return generated; // Üretilen kelimeleri döndür
        } else {
          throw new Error("Yapay zekadan geçerli kelime listesi alınamadı.");
        }
      } else {
        throw new Error("Yapay zekadan beklenen yanıt formatı alınamadı.");
      }
    } catch (error) {
      console.error("Yapay zekadan kelime çekilirken hata:", error);
      setStatusMessage(`Kelime üretme hatası: ${error.message}. Lütfen tekrar deneyin.`);
      setWordsToLearn([]); // Hata durumunda kelime listesini temizle
      return [];
    } finally {
      setIsGeneratingWords(false);
      setIsLoading(false); // İlk yükleme bitti
    }
  };

  // Kelimeleri Firestore'dan çek veya yapay zekadan üret
  useEffect(() => {
    console.log("WordCardDisplay useEffect triggered for data fetching.");
    
    if (!userProgressDocRef) {
      console.log("userProgressDocRef is null. Setting isLoading to false and skipping fetch.");
      setIsLoading(false);
      return;
    }

    console.log("Setting up onSnapshot listener for user progress.");
    
    const unsubscribe = onSnapshot(
      userProgressDocRef, 
      async (docSnap) => { // async eklendi
        console.log("onSnapshot callback triggered.");
        let learnedWords = [];
        if (docSnap.exists()) {
          const data = docSnap.data();
          learnedWords = data.learnedWords || [];
          console.log("Firestore data received. Learned words:", learnedWords);
        } else {
          console.log("User progress document not found. Creating initial document.");
          const initialData = {
            reading: { correct: 0, total: 0 },
            learnedWords: [],
            activities: []
          };
          await setDoc(userProgressDocRef, initialData); // Belgeyi oluştur
          console.log("Initial progress document created.");
        }

        // Öğrenilecek kelime kalmadıysa veya henüz hiç kelime yoksa yeni kelimeler üret
        // Sadece ilk yüklemede veya wordsToLearn boşken AI'dan kelime çek
        if (wordsToLearn.length === 0 && !isGeneratingWords) {
            console.log("No words to learn or initial load. Fetching new words from AI.");
            const generated = await fetchWordsFromAI();
            // Eğer AI'dan kelime geldiyse ve bunlar daha önce öğrenilmemişse ekle
            if (generated && generated.length > 0) {
                const availableWords = generated.filter(
                    (wordObj) => !learnedWords.includes(wordObj.word)
                );
                setWordsToLearn(availableWords);
                setCurrentWordIndex(0);
                if (availableWords.length === 0) {
                    setStatusMessage("Üretilen tüm kelimeler zaten öğrenilmiş. Yeni kelime üretmeyi deneyin.");
                }
            } else if (learnedWords.length > 0) {
                // Eğer hiç yeni kelime üretilemediyse ve öğrenilmiş kelimeler varsa,
                // kullanıcıya tekrar başlama seçeneği sunmak için boş bırak
                setWordsToLearn([]);
            }
        } else if (wordsToLearn.length > 0) {
            // Firestore'dan gelen öğrenilen kelimeleri mevcut listeden filtrele
            const updatedAvailableWords = wordsToLearn.filter(
                (wordObj) => !learnedWords.includes(wordObj.word)
            );
            setWordsToLearn(updatedAvailableWords);
            // Eğer mevcut kelime index'i artık geçerli değilse sıfırla
            if (currentWordIndex >= updatedAvailableWords.length) {
                setCurrentWordIndex(0);
            }
        }
        setIsLoading(false);
        console.log("isLoading set to false after onSnapshot callback.");
      }, 
      (error) => {
        console.error("Error loading words or setting up snapshot:", error);
        setStatusMessage("Kelimeler yüklenirken hata oluştu.");
        setIsLoading(false);
        setWordsToLearn([]); // Hata durumunda kelime listesini temizle
        console.log("isLoading set to false after onSnapshot error.");
      }
    );

    return () => {
      console.log("Cleaning up onSnapshot listener.");
      unsubscribe();
    };
  }, [userProgressDocRef, isGeneratingWords, wordsToLearn.length]); // wordsToLearn.length eklendi

  const handleNextWord = () => {
    if (currentWordIndex < wordsToLearn.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      // Tüm kelimeler gözden geçirildiğinde yeni kelimeler üretmeyi dene
      setStatusMessage("Tüm kelimeleri gözden geçirdiniz. Yeni kelimeler üretiliyor...");
      fetchWordsFromAI(); // Yeni kelimeler üret
    }
  };

  const handleMarkAsLearned = async (word) => {
    if (!userProgressDocRef) {
      setStatusMessage("Kullanıcı oturumu açık değil veya veritabanı hazır değil.");
      return;
    }
    
    setStatusMessage(`"${word}" öğrenildi olarak işaretleniyor...`);
    
    try {
      if (saveProgress) {
        await saveProgress({
          learnedWords: arrayUnion(word),
          activities: arrayUnion({
            text: `"${word}" kelimesini öğrendiniz.`,
            timestamp: new Date()
          })
        });
      }
      
      setStatusMessage(`"${word}" başarıyla öğrenildi olarak işaretlendi!`);
      
      // Kelimeyi listeden çıkar ve bir sonraki kelimeye geç
      setWordsToLearn(prevWords => prevWords.filter(w => w.word !== word));
      setCurrentWordIndex(prevIndex => {
        const newIndex = prevIndex;
        // Eğer mevcut index, yeni filtrelenmiş listeden büyükse veya liste boşsa 0'a dön
        if (newIndex >= wordsToLearn.filter(w => w.word !== word).length && wordsToLearn.filter(w => w.word !== word).length > 0) {
          return 0;
        } else if (wordsToLearn.filter(w => w.word !== word).length === 0) {
          return 0; // Liste boşsa 0'a dön
        }
        return newIndex;
      });

      // Eğer öğrenilecek kelime kalmadıysa yeni kelimeler üret
      // Bu kontrolü, setWordsToLearn tamamlandıktan sonra yapmalıyız
      // veya wordsToLearn.length'i filtreledikten sonraki haliyle kontrol etmeliyiz.
      // setTimeout kullanarak state güncellemesinin bitmesini bekleyelim.
      setTimeout(() => {
        if (wordsToLearn.filter(w => w.word !== word).length === 0) {
          setStatusMessage("Tüm kelimeleri öğrendiniz. Yeni kelimeler üretiliyor...");
          fetchWordsFromAI();
        } else {
          setStatusMessage(''); // Başarı mesajını temizle
        }
      }, 500); // Kısa bir gecikme
      
    } catch (error) {
      console.error("Error marking word as learned:", error);
      setStatusMessage('Kaydetme hatası: ' + error.message);
    }
  };

  // Status mesajını otomatik temizle
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // "Tekrar Başla" butonu için: Öğrenilen kelimeleri sıfırla ve yeni kelimeler üret
  const handleResetWords = async () => {
    if (userProgressDocRef && saveProgress) {
      setStatusMessage("Kelime listesi sıfırlanıyor ve yeni kelimeler üretiliyor...");
      try {
        await saveProgress({ learnedWords: [] }); // Öğrenilen kelimeleri Firestore'dan temizle
        await fetchWordsFromAI(); // Yeni kelimeler üret
        setStatusMessage("Kelime listesi sıfırlandı ve yeni kelimeler üretildi!");
      } catch (e) {
        console.error("Error resetting words or fetching new ones:", e);
        setStatusMessage("Sıfırlama veya kelime üretme hatası: " + e.message);
      }
    }
  };


  if (isLoading || isGeneratingWords) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="ml-2 text-lg">{isGeneratingWords ? "Yapay zeka kelimeler üretiyor..." : "Kelimeler Yükleniyor..."}</p>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 flex items-center">
        <BookOpen className="mr-3 text-violet-600" size={32} />
        Kelime Kartları
      </h2>

      {wordsToLearn.length > 0 && wordsToLearn[currentWordIndex] ? (
        <>
          <div className="mb-4 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              {currentWordIndex + 1} / {wordsToLearn.length} kelime
            </p>
          </div>
          
          <WordCard
            word={wordsToLearn[currentWordIndex].word}
            meaning={wordsToLearn[currentWordIndex].meaning}
            example={wordsToLearn[currentWordIndex].example}
            onMarkAsLearned={handleMarkAsLearned}
          />
          
          <div className="mt-8 flex space-x-4">
            <button
              onClick={handleNextWord}
              className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
            >
              <XCircle size={20} className="mr-2" />
              Sonraki Kelime
            </button>
            <button
              onClick={fetchWordsFromAI} // Yeni kelime üretme butonu
              disabled={isGeneratingWords}
              className="py-3 px-6 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
            >
              {isGeneratingWords ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                <RefreshCw size={20} className="mr-2" />
              )}
              {isGeneratingWords ? 'Üretiliyor...' : 'Yeni Kelimeler Üret'}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
            {isLoading ? "Kelimeler Yükleniyor..." : "Öğrenilecek kelime yok veya yeni kelimeler üretiliyor."}
          </p>
          {!isLoading && wordsToLearn.length === 0 && (
            <>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                Yeni kelimeler üretmek veya öğrenilen kelimeleri sıfırlayıp tekrar başlamak için aşağıdaki butona tıklayabilirsiniz.
              </p>
              <button
                onClick={handleResetWords} // "Tekrar Başla" butonu
                disabled={isGeneratingWords}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition duration-300 transform hover:scale-105 flex items-center justify-center"
              >
                {isGeneratingWords ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  <RefreshCw size={20} className="mr-2" />
                )}
                {isGeneratingWords ? 'Üretiliyor...' : 'Tekrar Başla / Yeni Üret'}
              </button>
            </>
          )}
        </div>
      )}

      {statusMessage && (
        <div className="mt-4 p-3 text-sm rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 text-center max-w-md">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default WordCardDisplay;
