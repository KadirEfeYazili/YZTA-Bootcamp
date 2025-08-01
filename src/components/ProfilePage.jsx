// src/components/ProfilePage.jsx
import React, { useState } from 'react';
import { User, Mail, Edit, Save, X, UserCheck, Calendar, Image } from 'lucide-react';

const ProfilePage = ({ userName, userEmail, userAge, userGender = "Belirtilmemiş", userProfilePicture, onSave, onOpenProfilePicModal }) => {
  console.log("ProfilePage render - Props:", { userName, userEmail, userAge, userGender, userProfilePicture, onSave: !!onSave, onOpenProfilePicModal: !!onOpenProfilePicModal });
  console.log("🖼️ ProfilePage - userProfilePicture değeri:", userProfilePicture);

  const [isEditing, setIsEditing] = useState(false);
  const [currentName, setCurrentName] = useState(userName);
  const [currentEmail, setCurrentEmail] = useState(userEmail);
  const [currentAge, setCurrentAge] = useState(userAge);
  const [currentGender, setCurrentGender] = useState(userGender);

  // Parse the full name into first name and surname for editing
  const parseFullName = (fullName) => {
    if (!fullName) return { firstName: '', surname: '' };
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const surname = nameParts.slice(1).join(' ') || '';
    return { firstName, surname };
  };

  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedSurname, setEditedSurname] = useState('');
  const [editedEmail, setEditedEmail] = useState(userEmail);
  const [editedAge, setEditedAge] = useState(userAge);
  const [editedGender, setEditedGender] = useState(userGender);

  const handleEditClick = () => {
    console.log("Edit butonu tıklandı");
    setIsEditing(true);

    // Parse current name into first name and surname
    const { firstName, surname } = parseFullName(currentName);
    setEditedFirstName(firstName);
    setEditedSurname(surname);
    setEditedEmail(currentEmail);
    setEditedAge(currentAge);
    setEditedGender(currentGender);

    console.log("Edit modu açıldı - Parsed name:", { firstName, surname });
  };

  const handleSave = () => {
    console.log("Save butonu tıklandı");

    // Combine first name and surname
    const fullName = `${editedFirstName.trim()} ${editedSurname.trim()}`.trim();

    console.log("Kaydedilecek değerler:", {
      name: editedFirstName.trim(),
      surname: editedSurname.trim(),
      fullName,
      email: editedEmail,
      age: editedAge,
      gender: editedGender
    });

    // Validation
    if (!editedFirstName.trim()) {
      console.error("İsim boş olamaz");
      alert("İsim alanı boş olamaz.");
      return;
    }

    if (editedAge && (isNaN(editedAge) || editedAge <= 0 || editedAge > 120)) {
      console.error("Geçersiz yaş değeri:", editedAge);
      alert("Lütfen geçerli bir yaş girin (1-120 arası).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editedEmail && !emailRegex.test(editedEmail)) {
      console.error("Geçersiz email formatı:", editedEmail);
      alert("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    // Update local state with the combined name
    setCurrentName(fullName);
    setCurrentEmail(editedEmail);
    setCurrentAge(editedAge);
    setCurrentGender(editedGender);
    setIsEditing(false);

    console.log("Local state güncellendi, onSave çağrılıyor...");

    // Send to backend with separate name and surname fields
    if (onSave) {
      console.log("onSave fonksiyonu mevcut, çağrılıyor...");
      try {
        onSave({
          name: editedFirstName.trim(),
          surname: editedSurname.trim(),
          email: editedEmail,
          age: editedAge ? parseInt(editedAge) : null,
          gender: editedGender
        });
        console.log("onSave başarıyla çağrıldı");
      } catch (error) {
        console.error("onSave çağrılırken hata:", error);
        alert("Profil güncellenirken hata oluştu: " + error.message);
      }
    } else {
      console.warn("onSave fonksiyonu mevcut değil! Profil kaydedilemedi.");
      alert("Profil kaydetme fonksiyonu bulunamadı. Lütfen sayfayı yenileyin.");
    }
  };

  const handleCancel = () => {
    console.log("Cancel butonu tıklandı");
    setIsEditing(false);
    const { firstName, surname } = parseFullName(currentName);
    setEditedFirstName(firstName);
    setEditedSurname(surname);
    setEditedEmail(currentEmail);
    setEditedAge(currentAge);
    setEditedGender(currentGender);
    console.log("Edit modu iptal edildi, önceki değerler geri yüklendi");
  };

  // Props değiştiğinde local state'i güncelle
  React.useEffect(() => {
    console.log("ProfilePage useEffect - Props değişti:", { userName, userEmail, userAge, userGender, userProfilePicture });
    setCurrentName(userName);
    setCurrentEmail(userEmail);
    setCurrentAge(userAge);
    setCurrentGender(userGender);

    if (!isEditing) {
      const { firstName, surname } = parseFullName(userName);
      setEditedFirstName(firstName);
      setEditedSurname(surname);
      setEditedEmail(userEmail);
      setEditedAge(userAge);
      setEditedGender(userGender);
    }
  }, [userName, userEmail, userAge, userGender, userProfilePicture, isEditing]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-6 relative">
          {/* Profil resmi */}
          <img
            src={userProfilePicture}
            alt="Profil Resmi"
            className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-violet-600 dark:border-violet-400"
            onError={(e) => {
              console.error("Profil resmi yüklenemedi:", userProfilePicture);
              e.target.onerror = null; // Sonsuz döngüyü önler
              e.target.src = "https://raw.githubusercontent.com/KadirEfeYazili/YZTA-Bootcamp/main/public/images/profile_pics/default_profile.png";
            }}
            onLoad={() => {
              console.log("Profil resmi başarıyla yüklendi:", userProfilePicture);
            }}
          />
          {/* Resmi değiştir butonu */}
          <button
            onClick={onOpenProfilePicModal}
            className="absolute bottom-0 right-1/2 translate-x-1/2 -mb-2 bg-violet-500 hover:bg-violet-600 text-white p-2 rounded-full shadow-md transition-all duration-200"
            title="Profil Resmini Değiştir"
          >
            <Image size={20} />
          </button>
        </div>
        <h2 className="text-2xl font-semibold mb-1">Hoş Geldiniz,</h2>
        {isEditing ? (
          <div className="mb-8">
            <input
              type="text"
              value={editedFirstName}
              onChange={(e) => {
                console.log("İsim değiştirildi:", e.target.value);
                setEditedFirstName(e.target.value);
              }}
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 bg-transparent border-b-2 border-violet-600 text-center focus:outline-none focus:border-violet-700 w-full"
              placeholder="İsim"
            />
            <input
              type="text"
              value={editedSurname}
              onChange={(e) => {
                console.log("Soyisim değiştirildi:", e.target.value);
                setEditedSurname(e.target.value);
              }}
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-violet-600 text-center focus:outline-none focus:border-violet-700 w-full"
              placeholder="Soyisim"
            />
          </div>
        ) : (
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">{currentName || 'İsim Belirtilmemiş'}</h1>
        )}

        <div className="flex items-center justify-center mb-8 text-lg">
          <Mail size={24} className="mr-3 text-blue-600 dark:text-blue-400" />
          <span className="font-medium">E-posta:</span>
          {isEditing ? (
            <input
              type="email"
              value={editedEmail || ''}
              onChange={(e) => {
                console.log("Email değiştirildi:", e.target.value);
                setEditedEmail(e.target.value);
              }}
              className="ml-2 text-gray-700 dark:text-gray-300 bg-transparent border-b border-blue-600 focus:outline-none focus:border-blue-700 flex-1"
              placeholder="E-posta adresinizi girin"
            />
          ) : (
            <span className="ml-2 text-gray-700 dark:text-gray-300">{currentEmail || 'Belirtilmemiş'}</span>
          )}
        </div>

        <div className="flex items-center justify-center mb-8 text-lg">
          <Calendar size={24} className="mr-3 text-green-600 dark:text-green-400" />
          <span className="font-medium">Yaş:</span>
          {isEditing ? (
            <input
              type="number"
              value={editedAge || ''}
              onChange={(e) => {
                const newAge = e.target.value ? parseInt(e.target.value) : null;
                console.log("Yaş değiştirildi:", e.target.value, "Parsed:", newAge);
                setEditedAge(newAge);
              }}
              className="ml-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-green-600 rounded-md px-2 py-1 w-20 focus:outline-none focus:border-green-700 focus:ring-2 focus:ring-green-200"
              min="1"
              max="120"
              placeholder="Yaş"
            />
          ) : (
            <span className="ml-2 text-gray-700 dark:text-gray-300">
              {currentAge ? `${currentAge} yaşında` : 'Belirtilmemiş'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center mb-8 text-lg">
          <UserCheck size={24} className="mr-3 text-purple-600 dark:text-purple-400" />
          <span className="font-medium">Cinsiyet:</span>
          {isEditing ? (
            <select
              value={editedGender || 'Belirtilmemiş'}
              onChange={(e) => {
                console.log("Cinsiyet değiştirildi:", e.target.value);
                setEditedGender(e.target.value);
              }}
              className="ml-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-purple-600 rounded-md px-2 py-1 focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-200"
            >
              <option value="Belirtilmemiş">Belirtilmemiş</option>
              <option value="Erkek">Erkek</option>
              <option value="Kadın">Kadın</option>
              <option value="Belirtmek istemiyorum">Belirtmek istemiyorum</option>
            </select>
          ) : (
            <span className="ml-2 text-gray-700 dark:text-gray-300">{currentGender || 'Belirtilmemiş'}</span>
          )}
        </div>

        {isEditing ? (
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-full shadow">
              <div className="flex items-center justify-center">
                <Save size={20} className="mr-2" /> Kaydet
              </div>
            </button>
            <button onClick={handleCancel} className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow">
              <div className="flex items-center justify-center">
                <X size={20} className="mr-2" /> İptal
              </div>
            </button>
          </div>
        ) : (
          <button onClick={handleEditClick} className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow">
            <div className="flex items-center justify-center">
              <Edit size={20} className="mr-2" /> Profili Düzenle
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
