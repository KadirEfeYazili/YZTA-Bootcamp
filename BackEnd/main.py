# main.py (güncel tam sürüm)

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import os
from typing import Optional, List
from datetime import datetime

app = FastAPI(
    title="Ebral API - Kullanıcı Profili ve Kelime Etkileşim API'si",
    description="Kullanıcı profillerini ve kelime etkileşim geçmişini yönetmek için API."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme için açık, production'da sınırla
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase başlatma
try:
    service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK başarıyla başlatıldı ve Firestore'a bağlanıldı.")
except Exception as e:
    print(f"Firebase başlatılırken hata: {e}")
    db = None

# --- Modeller ---
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
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        arbitrary_types_allowed = True

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
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        arbitrary_types_allowed = True

# --- Yardımcılar ---
auth_scheme = HTTPBearer()

def verify_token(token: str):
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")

# --- API ---
@app.get("/health")
async def health_check():
    try:
        if db is not None:
            db.collection('_health_check').limit(1).get()
            return {"status": "healthy", "message": "API ve Firestore bağlantısı çalışıyor", "database": "connected"}
        else:
            return {"status": "degraded", "message": "API çalışıyor ancak Firestore bağlantısı yok", "database": "disconnected"}
    except Exception as e:
        return {"status": "unhealthy", "message": f"Health check başarısız: {str(e)}", "database": "error"}

@app.get("/")
async def read_root():
    return {"message": "Merhaba Dünya! Ebral API çalışıyor."}

@app.post("/users/", response_model=UserProfileResponse)
async def create_user_profile(profile: UserProfileCreate):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        data = profile.dict()
        data['created_at'] = firestore.SERVER_TIMESTAMP
        data['updated_at'] = firestore.SERVER_TIMESTAMP
        doc_ref = db.collection('user_profiles').add(data)
        created_doc = doc_ref[1].get()
        return {"id": created_doc.id, **created_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil oluşturulurken hata: {e}")

@app.get("/users/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(user_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        doc = db.collection('user_profiles').document(user_id).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        raise HTTPException(status_code=404, detail="Profil bulunamadı.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil alınırken hata: {e}")

@app.put("/users/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(user_id: str, profile_update: UserProfileUpdate):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        doc_ref = db.collection('user_profiles').document(user_id)
        update_data = profile_update.dict(exclude_unset=True)
        update_data['updated_at'] = firestore.SERVER_TIMESTAMP
        doc_ref.update(update_data)
        updated_doc = doc_ref.get()
        return {"id": updated_doc.id, **updated_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil güncellenirken hata: {e}")

@app.delete("/users/{user_id}")
async def delete_user_profile(user_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        db.collection('user_profiles').document(user_id).delete()
        return {"status": "success", "message": "Profil silindi."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silme hatası: {e}")

@app.get("/users/me/", response_model=UserProfileResponse)
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    return await get_user_profile(user_id)

@app.put("/users/me/", response_model=UserProfileResponse)
async def update_current_user_profile(
    profile_update: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    return await update_user_profile(user_id, profile_update)

@app.post("/word-interactions/", response_model=WordInteractionResponse)
async def create_word_interaction(interaction: WordInteractionCreate):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        data = interaction.dict()
        data['timestamp'] = firestore.SERVER_TIMESTAMP
        doc_ref = db.collection('word_interactions').add(data)
        created_doc = doc_ref[1].get()
        return {"id": created_doc.id, **created_doc.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Etkileşim oluşturulurken hata: {e}")

@app.get("/word-interactions/user/{user_id}", response_model=List[WordInteractionResponse])
async def get_user_word_interactions(user_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        docs = db.collection('word_interactions').where('user_id', '==', user_id).stream()
        interactions = []
        for doc in docs:
            data = doc.to_dict()
            if 'timestamp' in data and data['timestamp'] is not None:
                data['timestamp'] = data['timestamp']._to_datetime()
            interactions.append(WordInteractionResponse(id=doc.id, **data))
        return interactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Etkileşimler alınırken hata: {e}")
