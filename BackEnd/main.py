# api_YZTA.py
# Bu dosya, api_YZTA klasörünüzün içinde yer alacak.

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore
import os
from typing import Optional, List
from datetime import datetime # datetime objeleri için

# FastAPI uygulamasını başlat
app = FastAPI(
    title="Ebral API - Kullanıcı Profili ve Kelime Etkileşim API'si",
    description="Kullanıcı profillerini ve kelime etkileşim geçmişini yönetmek için API."
)

# Firebase Admin SDK'yı başlat
try:
    service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK başarıyla başlatıldı ve Firestore'a bağlanıldı.")
except Exception as e:
    print(f"Firebase Admin SDK başlatılırken veya Firestore'a bağlanırken hata oluştu: {e}")
    db = None # Bağlantı kurulamadıysa db objesini None yap

# --- Pydantic Veri Modelleri ---

# Kullanıcı Profili Modelleri
class UserProfileBase(BaseModel):
    username: str
    email: str
    avatar_url: Optional[str] = None # Opsiyonel alan
    bio: Optional[str] = None # Opsiyonel alan

class UserProfileCreate(UserProfileBase):
    pass # Oluşturma için temel model yeterli

class UserProfileUpdate(BaseModel):
    # Güncelleme için sadece değiştirilebilecek alanlar
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    id: str # Firestore belge ID'si
    created_at: Optional[datetime] = None # Firestore'dan gelen tarih/saat
    updated_at: Optional[datetime] = None # Firestore'dan gelen tarih/saat

    class Config:
        # Pydantic'in ORM modunu etkinleştirir, böylece Firestore'dan gelen verileri
        # doğrudan modele dönüştürebiliriz (örneğin timestamp objeleri)
        json_encoders = {
            datetime: lambda dt: dt.isoformat() # datetime objelerini string'e çevir
        }
        arbitrary_types_allowed = True # Firestore Timestamp objeleri için gerekli olabilir


# Kelime Etkileşimi/Geçmiş Modelleri
class WordInteractionBase(BaseModel):
    user_id: str # Bu etkileşimi yapan kullanıcının Firestore belge ID'si
    word: str # Etkileşime girilen kelime
    interaction_type: str # 'view', 'correct_guess', 'incorrect_guess', 'favorite', 'search' vb.
    details: Optional[dict] = None # Ek detaylar (örn: "doğru cevap", "yanlış cevap")

class WordInteractionCreate(WordInteractionBase):
    pass

class WordInteractionResponse(WordInteractionBase):
    id: str # Firestore belge ID'si
    timestamp: Optional[datetime] = None # Firestore'dan gelen tarih/saat

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        arbitrary_types_allowed = True

# --- API Uç Noktaları ---

# Health check endpoint - Render için gerekli
@app.get("/health")
async def health_check():
    """
    Render.com health check endpoint. API'nin sağlıklı olup olmadığını kontrol eder.
    """
    try:
        # Firestore bağlantısını da kontrol et
        if db is not None:
            # Basit bir Firestore okuma işlemi yaparak bağlantıyı test et
            # Bu, gerçek bir koleksiyon sorgusu yapmadan sadece bağlantıyı test eder
            db.collection('_health_check').limit(1).get()
            return {
                "status": "healthy",
                "message": "API ve Firestore bağlantısı çalışıyor",
                "database": "connected"
            }
        else:
            return {
                "status": "degraded",
                "message": "API çalışıyor ancak Firestore bağlantısı yok",
                "database": "disconnected"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Health check başarısız: {str(e)}",
            "database": "error"
        }

# Ana sayfa (Merhaba Dünya) uç noktası
@app.get("/")
async def read_root():
    """
    API'nin çalışıp çalışmadığını kontrol etmek için basit bir Merhaba Dünya uç noktası.
    """
    return {"message": "Merhaba Dünya! Ebral API çalışıyor."}

# --- Kullanıcı Profili Uç Noktaları ---

@app.post("/users/", response_model=UserProfileResponse)
async def create_user_profile(profile: UserProfileCreate):
    """
    Yeni bir kullanıcı profili oluşturur.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        # Firestore'a yeni bir belge ekle. Belge ID'si otomatik oluşturulacak.
        # created_at ve updated_at alanlarını sunucu zaman damgası olarak ekleyelim
        profile_data = profile.dict()
        profile_data['created_at'] = firestore.SERVER_TIMESTAMP
        profile_data['updated_at'] = firestore.SERVER_TIMESTAMP

        doc_ref = db.collection('user_profiles').add(profile_data)
        # Eklenen belgenin ID'si ile birlikte yanıt döndür
        # Firestore'dan belgeyi tekrar okuyarak doğru timestamp'leri alalım
        created_doc = doc_ref[1].get()
        return {"id": created_doc.id, **created_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili oluşturulurken hata: {e}")

@app.get("/users/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(user_id: str):
    """
    Belirli bir kullanıcı profilini ID'sine göre getirir.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        doc = db.collection('user_profiles').document(user_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili getirilirken hata: {e}")

@app.put("/users/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(user_id: str, profile_update: UserProfileUpdate):
    """
    Belirli bir kullanıcı profilini günceller.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        doc_ref = db.collection('user_profiles').document(user_id)
        # Sadece verilen alanları güncellemek için update() kullanın
        # updated_at alanını her güncellemede otomatik olarak yenileyelim
        update_data = profile_update.dict(exclude_unset=True) # Sadece set edilmiş alanları al
        update_data['updated_at'] = firestore.SERVER_TIMESTAMP

        doc_ref.update(update_data)
        # Güncellenmiş belgeyi tekrar okuyarak yanıt döndür
        updated_doc = doc_ref.get()
        return {"id": updated_doc.id, **updated_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili güncellenirken hata: {e}")

@app.delete("/users/{user_id}")
async def delete_user_profile(user_id: str):
    """
    Belirli bir kullanıcı profilini siler.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        db.collection('user_profiles').document(user_id).delete()
        return {"status": "success", "message": "Kullanıcı profili başarıyla silindi."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili silinirken hata: {e}")

# --- Kelime Etkileşimi/Geçmiş Uç Noktaları ---

@app.post("/word-interactions/", response_model=WordInteractionResponse)
async def create_word_interaction(interaction: WordInteractionCreate):
    """
    Yeni bir kelime etkileşimi (geçmiş kaydı) oluşturur.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        interaction_data = interaction.dict()
        interaction_data['timestamp'] = firestore.SERVER_TIMESTAMP # Firestore'un sunucu zaman damgasını kullan

        doc_ref = db.collection('word_interactions').add(interaction_data)
        # Firestore'dan dönen belgeyi tekrar okuyarak doğru timestamp'i alalım
        created_doc = doc_ref[1].get()
        return {"id": created_doc.id, **created_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kelime etkileşimi oluşturulurken hata: {e}")

@app.get("/word-interactions/user/{user_id}", response_model=List[WordInteractionResponse])
async def get_user_word_interactions(user_id: str):
    """
    Belirli bir kullanıcının tüm kelime etkileşim geçmişini getirir.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        # user_id alanına göre sorgulama yap
        docs = db.collection('word_interactions').where('user_id', '==', user_id).stream()
        interactions = []
        for doc in docs:
            data = doc.to_dict()
            # Firestore Timestamp objesini Pydantic modeline uygun hale getir
            if 'timestamp' in data and data['timestamp'] is not None:
                # Firestore Timestamp objesini datetime objesine dönüştür
                data['timestamp'] = data['timestamp']._to_datetime()
            interactions.append(WordInteractionResponse(id=doc.id, **data))
        return interactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı kelime etkileşimleri getirilirken hata: {e}")
