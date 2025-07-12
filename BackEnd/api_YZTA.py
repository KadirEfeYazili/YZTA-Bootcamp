# api_YZTA.py
# Bu dosya, api_YZTA klasörünüzün içinde yer alacak.

from fastapi import FastAPI, HTTPException, Security, Depends
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from typing import Optional, List
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# FastAPI uygulamasını başlat
app = FastAPI(
    title="API - User Profile and Word Interaction API",
    description="API for managing user profiles and word interaction history."
)

# Firebase Admin SDK'yı başlat
try:
    service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK successfully initialized and connected to Firestore.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK or connecting to Firestore: {e}")
    db = None

# --- Güvenlik Bağımlılıkları ---
security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Gelen Firebase kimlik doğrulama token'ını doğrular ve kullanıcı UID'sini döndürür.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        # Hata ayıklama için eklenen satırlar (artık bu kısmı kaldırabiliriz, ama şimdilik kalsın):
        print(f"Alınan Token (credentials.credentials): {credentials.credentials}")
        print(f"Token Tipi: {type(credentials.credentials)}")

        # Token'ı doğrulamadan önce "Bearer " ön ekini manuel olarak kaldır
        token_string = credentials.credentials
        if token_string.startswith("Bearer "):
            token_string = token_string.split(" ", 1)[1] # "Bearer " kısmını ayır ve token'ı al

        # Token'ı doğrula
        decoded_token = auth.verify_id_token(token_string) # Temizlenmiş token_string'i kullan
        # Doğrulanmış token'dan kullanıcı UID'sini al
        uid = decoded_token['uid']
        return uid
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Geçersiz veya süresi dolmuş kimlik doğrulama token'ı: {e}")

# --- Pydantic Data Models ---

# User Profile Models
class UserProfileBase(BaseModel):
    username: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        arbitrary_types_allowed = True


# Word Interaction/History Models
class WordInteractionBase(BaseModel):
    user_id: str
    word: str
    interaction_type: str
    details: Optional[dict] = None

class WordInteractionCreate(WordInteractionBase):
    pass

class WordInteractionResponse(WordInteractionBase):
    id: str
    timestamp: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        arbitrary_types_allowed = True

# --- API Endpoints ---

@app.get("/")
async def read_root():
    return {"message": "Merhaba Dünya! Ebral API çalışıyor."}

@app.post("/users/", response_model=UserProfileResponse)
async def create_user_profile(profile: UserProfileCreate):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        profile_data = profile.dict()
        profile_data['created_at'] = firestore.SERVER_TIMESTAMP
        profile_data['updated_at'] = firestore.SERVER_TIMESTAMP
        doc_ref = db.collection('user_profiles').add(profile_data)
        created_doc = doc_ref[1].get()
        return {"id": created_doc.id, **created_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili oluşturulurken hata: {e}")

@app.get("/users/me/", response_model=UserProfileResponse)
async def get_my_user_profile(uid: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        doc = db.collection('user_profiles').document(uid).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı. Lütfen önce profilinizi oluşturun.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili getirilirken hata: {e}")

@app.put("/users/me/", response_model=UserProfileResponse)
async def update_my_user_profile(profile_update: UserProfileUpdate, uid: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        doc_ref = db.collection('user_profiles').document(uid)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı. Lütfen önce profilinizi oluşturun.")
        update_data = profile_update.dict(exclude_unset=True)
        update_data['updated_at'] = firestore.SERVER_TIMESTAMP
        doc_ref.update(update_data)
        updated_doc = doc_ref.get()
        return {"id": updated_doc.id, **updated_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili güncellenirken hata: {e}")

@app.delete("/users/me/")
async def delete_my_user_profile(uid: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        doc_ref = db.collection('user_profiles').document(uid)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı.")
        db.collection('user_profiles').document(uid).delete()
        return {"status": "success", "message": "Kullanıcı profili başarıyla silindi."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili silinirken hata: {e}")

@app.post("/word-interactions/", response_model=WordInteractionResponse)
async def create_word_interaction(interaction: WordInteractionCreate, uid: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    if interaction.user_id != uid:
        raise HTTPException(status_code=403, detail="Yetkisiz işlem: Sadece kendi etkileşimlerinizi oluşturabilirsiniz.")
    try:
        interaction_data = interaction.dict()
        interaction_data['timestamp'] = firestore.SERVER_TIMESTAMP
        doc_ref = db.collection('word_interactions').add(interaction_data)
        created_doc = doc_ref[1].get()
        return {"id": created_doc.id, **created_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kelime etkileşimi oluşturulurken hata: {e}")

@app.get("/word-interactions/me/", response_model=List[WordInteractionResponse])
async def get_my_word_interactions(uid: str = Depends(verify_token)):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        docs = db.collection('word_interactions').where('user_id', '==', uid).stream()
        interactions = []
        for doc in docs:
            data = doc.to_dict()
            if 'timestamp' in data and data['timestamp'] is not None:
                data['timestamp'] = data['timestamp'].to_datetime()
            interactions.append(WordInteractionResponse(id=doc.id, **data))
        return interactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı kelime etkileşimleri getirilirken hata: {e}")

