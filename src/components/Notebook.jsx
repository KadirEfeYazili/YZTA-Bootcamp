// src/components/Notebook.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Edit, Trash2, BookOpen, Save, Loader2, Calendar, Search } from 'lucide-react';

const Notebook = ({ userId, db, firebaseAppId }) => {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState({ id: null, title: '', content: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Firestore koleksiyon referansı - useMemo ile optimize et
  const notesCollectionRef = useMemo(() => {
    return userId && db ? collection(db, `artifacts/${firebaseAppId}/users/${userId}/notes`) : null;
  }, [userId, db, firebaseAppId]);

  // Filtrelenmiş notlar
  const filteredNotes = useMemo(() => {
    if (!searchTerm) return notes;
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notes, searchTerm]);

  // Notları çek
  useEffect(() => {
    const fetchNotes = async () => {
      if (!notesCollectionRef) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const q = query(notesCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedNotes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNotes(fetchedNotes);
        setStatusMessage('');
      } catch (error) {
        console.error("Error loading notes:", error);
        setStatusMessage("Notlar yüklenirken hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [notesCollectionRef]);

  // Status mesajını otomatik temizle
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Not kaydetme/güncelleme
  const handleSaveNote = async () => {
    if (!notesCollectionRef) {
      setStatusMessage("Kullanıcı oturumu açık değil veya veritabanı hazır değil.");
      return;
    }
    
    const title = currentNote.title.trim();
    const content = currentNote.content.trim();
    
    if (!title || !content) {
      setStatusMessage("Başlık ve içerik boş bırakılamaz.");
      return;
    }

    setIsSaving(true);
    setStatusMessage('Kaydediliyor...');
    
    try {
      if (currentNote.id) {
        // Var olan notu güncelle
        const noteDocRef = doc(db, `artifacts/${firebaseAppId}/users/${userId}/notes`, currentNote.id);
        await updateDoc(noteDocRef, {
          title,
          content,
          updatedAt: serverTimestamp()
        });
        
        setNotes(prevNotes => 
          prevNotes.map(note => 
            note.id === currentNote.id 
              ? { ...note, title, content, updatedAt: new Date() } // Local state'i de güncelle
              : note
          )
        );
        setStatusMessage('Not başarıyla güncellendi!');
      } else {
        // Yeni not ekle
        const newNote = {
          title,
          content,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(notesCollectionRef, newNote);
        const noteWithId = { 
          id: docRef.id, 
          ...newNote, 
          createdAt: new Date(), // Local state için Date objesi
          updatedAt: new Date() // Local state için Date objesi
        };
        
        setNotes(prevNotes => [noteWithId, ...prevNotes]);
        setStatusMessage('Not başarıyla kaydedildi!');
      }
      
      // Formu temizle
      setCurrentNote({ id: null, title: '', content: '' });
      
    } catch (error) {
      console.error("Error saving note:", error);
      setStatusMessage('Kaydetme hatası: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Not silme
  const handleDeleteNote = async (id) => {
    if (!notesCollectionRef) {
      setStatusMessage("Kullanıcı oturumu açık değil veya veritabanı hazır değil.");
      return;
    }
    
    // confirm yerine özel bir modal kullanılması önerilir.
    if (!window.confirm('Bu notu silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    setStatusMessage('Siliniyor...');
    
    try {
      await deleteDoc(doc(db, `artifacts/${firebaseAppId}/users/${userId}/notes`, id));
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      setStatusMessage('Not başarıyla silindi!');
      
      if (currentNote.id === id) {
        setCurrentNote({ id: null, title: '', content: '' });
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      setStatusMessage('Silme hatası: ' + error.message);
    }
  };

  // Notu düzenlemek için seç
  const handleEditNote = (note) => {
    setCurrentNote({
      id: note.id,
      title: note.title,
      content: note.content
    });
    setStatusMessage('');
  };

  // Yeni not
  const handleNewNote = () => {
    setCurrentNote({ id: null, title: '', content: '' });
    setStatusMessage(''); // Yeni not oluştururken status mesajını temizle
  };

  // Tarih formatlama
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    // Firestore Timestamp objesi veya doğrudan Date objesi olabilir
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-violet-500" size={32} />
        <p className="ml-2 text-lg">Notlar Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in flex flex-col lg:flex-row gap-8 h-full">
      {/* Not Listesi */}
      <div className="w-full lg:w-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-violet-100 dark:border-slate-700 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-slate-700 dark:text-white flex items-center">
            <BookOpen className="mr-2 text-sky-500" size={24} />
            Notlarım ({notes.length})
          </h3>
        </div>

        {/* Arama ve Yeni Not */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Notlarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          
          <button
            onClick={handleNewNote}
            className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out flex items-center justify-center"
          >
            <PlusCircle size={20} className="mr-2" />
            Yeni Not Ekle
          </button>
        </div>

        {/* Not Listesi */}
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-3">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <li
                  key={note.id}
                  className={`bg-slate-50 dark:bg-slate-700 p-4 rounded-lg shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer border-l-4 ${
                    currentNote.id === note.id 
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' 
                      : 'border-transparent'
                  }`}
                  onClick={() => handleEditNote(note)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg text-slate-800 dark:text-slate-100 line-clamp-1">
                      {note.title}
                    </h4>
                    <div className="flex space-x-1 ml-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleEditNote(note); 
                        }} 
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 p-1"
                        title="Düzenle"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteNote(note.id); 
                        }} 
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 p-1"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-300 line-clamp-2 mb-2">
                    {note.content.substring(0, 80)}...
                  </p>
                  
                  <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                    <Calendar size={12} className="mr-1" />
                    {formatDate(note.updatedAt || note.createdAt)}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">
                  {searchTerm ? 'Arama kriterinize uygun not bulunamadı.' : 'Henüz notunuz yok. Yeni bir not ekleyin!'}
                </p>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Not Düzenleyici */}
      <div className="w-full lg:w-2/3 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-violet-100 dark:border-slate-700 flex flex-col">
        <h3 className="text-2xl font-semibold text-slate-700 dark:text-white mb-4 flex items-center">
          <Edit className="mr-2 text-purple-500" size={24} />
          {currentNote.id ? 'Notu Düzenle' : 'Yeni Not Oluştur'}
        </h3>
        
        <input
          type="text"
          placeholder="Not Başlığı"
          value={currentNote.title}
          onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        
        <textarea
          placeholder="Not içeriği..."
          value={currentNote.content}
          onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
          className="w-full flex-1 p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none min-h-[200px]"
        />
        
        <button
          onClick={handleSaveNote}
          disabled={isSaving || !currentNote.title.trim() || !currentNote.content.trim()}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-full shadow-md transition duration-300 ease-in-out flex items-center justify-center"
        >
          {isSaving ? (
            <Loader2 className="animate-spin mr-2" size={20} />
          ) : (
            <Save size={20} className="mr-2" />
          )}
          {isSaving ? 'Kaydediliyor...' : (currentNote.id ? 'Notu Güncelle' : 'Notu Kaydet')}
        </button>
        
        {statusMessage && (
          <div className={`mt-4 p-3 text-sm rounded-lg text-center ${
            statusMessage.includes('hata') || statusMessage.includes('Hata') 
              ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notebook;
