import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { BellRing, Save, CalendarPlus, XCircle, Loader2 } from 'lucide-react';

const NotificationScheduler = ({ userId, db, firebaseAppId }) => {
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize with today's date and default time
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // This ref should be stable or re-created carefully if userId/db can change
  const notificationDocRef = userId && db ? doc(db, `artifacts/${firebaseAppId}/users/${userId}/settings/notifications`) : null;

  // Use a separate state to track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      if (!notificationDocRef) {
        console.warn("Notification doc ref yok, yükleme durduruldu.");
        setIsLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(notificationDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Firestore verisi:", data);

          // Only set if data exists and hasn't been loaded before
          if (data.date && !initialDataLoaded) {
            setSelectedDate(data.date);
            console.log("Firestore'dan gelen tarih:", data.date);
          }

          if (data.time && !initialDataLoaded) {
            setNotificationTime(data.time);
            console.log("Firestore'dan gelen saat:", data.time);
          }
        } else {
          console.log("Firestore'da bildirim ayarları bulunamadı.");
        }
      } catch (error) {
        console.error("Bildirim ayarları yüklenirken hata:", error);
        setStatusMessage("Bildirim ayarları yüklenirken hata oluştu.");
      } finally {
        setIsLoading(false);
        setInitialDataLoaded(true); // Mark data as loaded
      }
    };

    // Only run this effect once on mount or when notificationDocRef changes
    if (!initialDataLoaded) { // Prevent re-fetching after initial load
      fetchNotificationSettings();
    }
  }, [notificationDocRef, initialDataLoaded]); // Add initialDataLoaded to dependencies

  const handleSaveNotificationTime = async () => {
    if (!notificationDocRef) {
      setStatusMessage("Kullanıcı oturumu açık değil veya veritabanı hazır değil.");
      console.warn("notificationDocRef null.");
      return;
    }

    setStatusMessage('Kaydediliyor...');
    try {
      await setDoc(notificationDocRef, {
        date: selectedDate,
        time: notificationTime,
      });
      console.log("Bildirim saati kaydedildi:", selectedDate, notificationTime);
      setStatusMessage('Bildirim zamanı ve tarihi başarıyla kaydedildi!');
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      setStatusMessage('Kaydetme hatası: ' + error.message);
    }
  };

  useEffect(() => {
    if (isLoading || !selectedDate || !notificationTime) return;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hour, minute] = notificationTime.split(':').map(Number);

    const checkNotification = () => {
      const now = new Date();
      if (
        now.getFullYear() === year &&
        now.getMonth() + 1 === month &&
        now.getDate() === day &&
        now.getHours() === hour &&
        now.getMinutes() === minute
      ) {
        const lastNotificationTimestamp = localStorage.getItem('lastNotificationTimestamp');
        // Ensure consistent format for timestamp comparison
        const currentTimestamp = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;


        if (lastNotificationTimestamp !== currentTimestamp) {
          setShowNotificationPopup(true);
          localStorage.setItem('lastNotificationTimestamp', currentTimestamp);
          console.log("🎉 Bildirim tetiklendi!");
        }
      } else {
        localStorage.removeItem('lastNotificationTimestamp');
      }
    };

    const intervalId = setInterval(checkNotification, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [selectedDate, notificationTime, isLoading]);

  const closeNotificationPopup = () => {
    setShowNotificationPopup(false);
  };

  const handleAddEventToCalendar = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hour, minute] = notificationTime.split(':').map(Number);

    // Using template literals correctly for string concatenation
    const dtStart = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
    const dtEnd = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(hour + 1).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;

    const uid = `prepmate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const dtStamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');

    // Corrected template literal for ICS content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PrepMate//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:PrepMate Hatırlatıcısı
DESCRIPTION:Öğrenme hedefin için hatırlatıcı.
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'prepmate_hatirlatici.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusMessage('Takvim etkinliği başarıyla indirildi!');
    console.log("📅 ICS dosyası oluşturuldu ve indirildi.");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="ml-2 text-lg">Ayarlar Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 flex items-center">
        <BellRing className="mr-3 text-violet-600" size={32} />
        Bildirim Ayarları
      </h2>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700 max-w-md mx-auto">
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Belirlediğiniz tarih ve saati kaydedin veya takviminize ekleyin.
        </p>

        <div className="mb-4">
          <label htmlFor="notification-date" className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
            Bildirim Tarihi:
          </label>
          <input
            type="date"
            id="notification-date"
            value={selectedDate}
            onChange={(e) => {
              console.log("Tarih değişti:", e.target.value);
              setSelectedDate(e.target.value);
            }}
            className="w-full p-3 rounded-lg border border-violet-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="notification-time" className="block text-slate-700 dark:text-slate-200 text-sm font-medium mb-2">
            Bildirim Saati:
          </label>
          <input
            type="time"
            id="notification-time"
            value={notificationTime}
            onChange={(e) => {
              console.log("Saat değişti:", e.target.value);
              setNotificationTime(e.target.value);
            }}
            className="w-full p-3 rounded-lg border border-violet-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <button
          onClick={handleSaveNotificationTime}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center mb-3"
        >
          <Save size={20} className="mr-2" />
          Kaydet
        </button>

        <button
          onClick={handleAddEventToCalendar}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
        >
          <CalendarPlus size={20} className="mr-2" />
          Takvime Ekle
        </button>

        {statusMessage && (
          <div className="mt-4 p-3 text-sm rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 text-center">
            {statusMessage}
          </div>
        )}
      </div>

      {showNotificationPopup && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center relative">
            <button
              onClick={closeNotificationPopup}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 z-10"
            >
              <XCircle size={24} />
            </button>
            <BellRing size={48} className="text-violet-600 dark:text-violet-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Hatırlatıcı!</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Belirlediğiniz tarihte ve saatte öğrenme hedeflerinize ulaşmak için hatırlatıcı.
            </p>
            <button
              onClick={closeNotificationPopup}
              className="py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full transition duration-300"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationScheduler;
