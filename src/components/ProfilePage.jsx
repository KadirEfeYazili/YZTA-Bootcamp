// src/components/ProfilePage.jsx
import React from 'react';
import { User, Mail } from 'lucide-react'; // Lucide React ikonları, Calendar ve Info kaldırıldı

const ProfilePage = ({ userName, userEmail, userAge }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-violet-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        {/* Profil Resmi/İkonu */}
        <div className="mb-6">
          <User size={96} className="text-violet-600 dark:text-violet-400 mx-auto" />
        </div>

        {/* Hoş Geldiniz Mesajı ve Kullanıcı Adı */}
        <h2 className="text-2xl font-semibold mb-1">Hoş Geldiniz,</h2> {/* mb-2'den mb-1'e düşürüldü */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          {userName}
        </h1>

        {/* E-posta Bilgisi */}
        <div className="flex items-center justify-center mb-8 text-lg"> {/* mb-4'ten mb-8'e çıkarıldı */}
          <Mail size={24} className="mr-3 text-blue-600 dark:text-blue-400" />
          <span className="font-medium">E-posta:</span>
          <span className="ml-2 text-gray-700 dark:text-gray-300">{userEmail}</span>
        </div>

        {/* Profili Düzenle Butonu */}
        <button
          onClick={() => alert("Profil düzenleme özelliği yakında geliyor!")} // Geçici alert
          className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-75"
        >
          Profili Düzenle
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;