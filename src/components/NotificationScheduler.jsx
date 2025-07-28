import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { BellRing, Save, CalendarPlus, XCircle, Loader2, PlusCircle, Trash2 } from 'lucide-react';

const NotificationScheduler = ({ userId, db, firebaseAppId }) => {
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [alarms, setAlarms] = useState([]);
  const [showAddAlarmForm, setShowAddAlarmForm] = useState(false);
  const [newSelectedDate, setNewSelectedDate] = useState(() => getTodayDateString());
  const [newNotificationTime, setNewNotificationTime] = useState('09:00');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [triggeredAlarm, setTriggeredAlarm] = useState(null);

  // Alarm koleksiyonu referansını memoize et - bu döngünün ana sebebi
  const alarmsCollectionRef = useMemo(() => {
    return userId && db ? collection(db, `artifacts/${firebaseAppId}/users/${userId}/notifications`) : null;
  }, [userId, db, firebaseAppId]);

  // fetchAlarms fonksiyonunu basitleştir
  const fetchAlarms = async () => {
    if (!alarmsCollectionRef) {
      console.warn("Alarm koleksiyonu referansı yok, yükleme durduruldu.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(alarmsCollectionRef);
      const fetchedAlarms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlarms(fetchedAlarms);
      console.log("Firestore'dan çekilen alarmlar:", fetchedAlarms);
    } catch (error) {
      console.error("Alarm ayarları yüklenirken hata:", error);
      setStatusMessage("Alarm ayarları yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect'i sadeleştir - sadece component mount'ta çalışsın
  useEffect(() => {
    fetchAlarms();
  }, [alarmsCollectionRef]); // Sadece alarmsCollectionRef değiştiğinde

  const handleSaveNewAlarm = async () => {
    if (!alarmsCollectionRef) {
      setStatusMessage("Kullanıcı oturumu açık değil veya veritabanı hazır değil.");
      console.warn("alarmsCollectionRef null.");
      return;
    }

    setStatusMessage('Kaydediliyor...');
    try {
      await addDoc(alarmsCollectionRef, {
        date: newSelectedDate,
        time: newNotificationTime,
        createdAt: new Date(),
      });
      console.log("Yeni alarm kaydedildi:", newSelectedDate, newNotificationTime);
      setStatusMessage('Yeni alarm başarıyla kaydedildi!');
      setShowAddAlarmForm(false);
      
      // Yeni alarm eklendikten sonra listeyi güncelle
      await fetchAlarms();
      
      // Formu sıfırla
      setNewSelectedDate(getTodayDateString());
      setNewNotificationTime('09:00');

    } catch (error) {
      console.error("Kaydetme hatası:", error);
      setStatusMessage('Kaydetme hatası: ' + error.message);
    }
  };

  const handleDeleteAlarm = async (alarmId) => {
    if (!alarmsCollectionRef || !alarmId) {
      setStatusMessage("Alarm silinemedi: Referans eksik.");
      console.warn("Alarm referansı veya ID'si null.");
      return;
    }

    setStatusMessage('Siliniyor...');
    try {
      const alarmDocRef = doc(db, `artifacts/${firebaseAppId}/users/${userId}/notifications/${alarmId}`);
      await deleteDoc(alarmDocRef);
      console.log(`Alarm silindi: ${alarmId}`);
      setStatusMessage('Alarm başarıyla silindi!');
      
      // Alarm silindikten sonra listeyi güncelle
      await fetchAlarms();
    } catch (error) {
      console.error("Silme hatası:", error);
      setStatusMessage('Silme hatası: ' + error.message);
    }
  };

  // Bildirim kontrol efekti - localStorage yerine sessionStorage kullan veya tamamen kaldır
  useEffect(() => {
    if (isLoading || alarms.length === 0) return;

    const checkNotifications = () => {
      const now = new Date();
      alarms.forEach(alarm => {
        const [year, month, day] = alarm.date.split('-').map(Number);
        const [hour, minute] = alarm.time.split(':').map(Number);

        if (
          now.getFullYear() === year &&
          now.getMonth() + 1 === month &&
          now.getDate() === day &&
          now.getHours() === hour &&
          now.getMinutes() === minute
        ) {
          // sessionStorage kullan - tab kapanınca temizlenir
          const notificationKey = `lastNotificationTimestamp_${alarm.id}`;
          const lastNotificationTimestamp = sessionStorage.getItem(notificationKey);
          const currentTimestamp = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

          if (lastNotificationTimestamp !== currentTimestamp) {
            setTriggeredAlarm(alarm);
            setShowNotificationPopup(true);
            sessionStorage.setItem(notificationKey, currentTimestamp);
            console.log(`🎉 Bildirim tetiklendi: Alarm ID - ${alarm.id}`);
          }
        }
      });
    };

    const intervalId = setInterval(checkNotifications, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [alarms, isLoading]);

  const closeNotificationPopup = () => {
    setShowNotificationPopup(false);
    setTriggeredAlarm(null);
  };

  const handleAddEventToCalendar = (alarmToCalendar) => {
    const targetDate = alarmToCalendar ? alarmToCalendar.date : newSelectedDate;
    const targetTime = alarmToCalendar ? alarmToCalendar.time : newNotificationTime;

    const [year, month, day] = targetDate.split('-').map(Number);
    const [hour, minute] = targetTime.split(':').map(Number);

    const dtStart = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
    const dtEnd = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(hour + 1).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;

    const uid = `prepmate-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const dtStamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PrepMate//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:PrepMate Hatırlatıcısı (${alarmToCalendar ? "Mevcut Alarm" : "Yeni Alarm"})
DESCRIPTION:Öğrenme hedefin için hatırlatıcı.
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prepmate_hatirlatici_${alarmToCalendar ? alarmToCalendar.id : 'new'}.ics`);
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
    <div className="p-4 sm:p-6 animate-fade-in max-w-xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
        <BellRing className="mr-2 text-violet-600" size={28} />
        Bildirim Ayarları
      </h2>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-violet-100 dark:border-slate-700 mb-6">
        <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
          <BellRing className="mr-2 text-sky-500" size={22} />
          Mevcut Alarmlarınız
        </h3>
        {alarms.length > 0 ? (
          <ul className="space-y-3">
            {alarms.map(alarm => (
              <li key={alarm.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg shadow-sm">
                <div className="text-slate-700 dark:text-slate-200 text-sm">
                  <p className="font-medium">{alarm.date} - {alarm.time}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAddEventToCalendar(alarm)}
                    className="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    title="Takvime Ekle"
                  >
                    <CalendarPlus size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteAlarm(alarm.id)}
                    className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    title="Alarmı Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Ayarlanmış bir bildiriminiz bulunmamaktadır.
          </p>
        )}
        <button
          onClick={() => setShowAddAlarmForm(true)}
          className="mt-5 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full shadow-md transition duration-300 flex items-center justify-center text-sm"
        >
          <PlusCircle size={18} className="mr-2" />
          Yeni Alarm Oluştur
        </button>
      </div>

      {showAddAlarmForm && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
            <button
              onClick={() => setShowAddAlarmForm(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
            >
              <XCircle size={24} />
            </button>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
              <PlusCircle className="mr-2 text-green-500" size={22} />
              Yeni Alarm Ayarla
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
              Lütfen alarm için tarih ve saati seçin.
            </p>

            <div className="mb-3">
              <label htmlFor="new-notification-date-form" className="block text-slate-700 dark:text-slate-200 text-xs font-medium mb-1">
                Bildirim Tarihi:
              </label>
              <input
                type="date"
                id="new-notification-date-form"
                value={newSelectedDate}
                onChange={(e) => setNewSelectedDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-violet-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="new-notification-time-form" className="block text-slate-700 dark:text-slate-200 text-xs font-medium mb-1">
                Bildirim Saati:
              </label>
              <input
                type="time"
                id="new-notification-time-form"
                value={newNotificationTime}
                onChange={(e) => setNewNotificationTime(e.target.value)}
                className="w-full p-2 rounded-lg border border-violet-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>

            <button
              onClick={handleSaveNewAlarm}
              className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out flex items-center justify-center text-sm"
            >
              <Save size={18} className="mr-2" />
              Alarmı Kaydet
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="mt-4 p-3 text-sm rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 text-center max-w-md mx-auto">
          {statusMessage}
        </div>
      )}

      {showNotificationPopup && triggeredAlarm && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center relative">
            <button
              onClick={closeNotificationPopup}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 z-10"
            >
              <XCircle size={24} />
            </button>
            <BellRing size={40} className="text-violet-600 dark:text-violet-400 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Hatırlatıcı!</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
              **{triggeredAlarm.date}** tarihinde saat **{triggeredAlarm.time}** için belirlediğiniz alarm tetiklendi!
            </p>
            <button
              onClick={closeNotificationPopup}
              className="py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full transition duration-300 text-sm"
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
