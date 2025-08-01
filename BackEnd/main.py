# main.py (güncel tam sürüm - düzeltilmiş)

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
origins = [
    "http://localhost",
    "http://localhost:3000",
    # Gerekirse başka adresleri de buraya ekleyebilirsiniz
]
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
    # Frontend'den gelen ek alanlar
    name: Optional[str] = None
    surname: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserProfileInitialize(BaseModel):
    name: str
    surname: str
    email: str
    age: int
    gender: Optional[str] = "Belirtilmemiş"
    profile_picture_url: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Frontend'in beklediği ek alanlar
    name: Optional[str] = None
    surname: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    profile_picture_url: Optional[str] = None

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

def convert_firestore_data_to_user_profile(doc_data: dict) -> dict:
    """
    Firestore'dan gelen veriyi UserProfile modeline uygun hale getirir
    """
    # name ve surname'den username oluştur
    if 'name' in doc_data and 'surname' in doc_data:
        username = f"{doc_data.get('name', '')} {doc_data.get('surname', '')}".strip()
        doc_data['username'] = username
    elif 'name' in doc_data:
        doc_data['username'] = doc_data['name']
    
    # Eğer username yoksa default değer ata
    if 'username' not in doc_data or not doc_data['username']:
        doc_data['username'] = "Unknown User"
    
    # Email kontrolü
    if 'email' not in doc_data or doc_data['email'] is None:
        doc_data['email'] = ""
    
    # profile_picture_url'yi avatar_url'ye map et
    if 'profile_picture_url' in doc_data:
        doc_data['avatar_url'] = doc_data.get('profile_picture_url')
    
    # Firestore timestamp'lerini datetime'a çevir
    for field in ['created_at', 'updated_at']:
        if field in doc_data and doc_data[field] is not None:
            if hasattr(doc_data[field], '_to_datetime'):
                doc_data[field] = doc_data[field]._to_datetime()
    
    return doc_data

def convert_user_profile_update_to_firestore(update_data: dict) -> dict:
    """
    UserProfile update verisini Firestore'a uygun hale getirir
    """
    firestore_data = update_data.copy()
    
    # Frontend'den gelen name ve surname'i ayrı ayrı sakla
    # username varsa onu name ve surname'e böl
    if 'username' in firestore_data:
        username = firestore_data.pop('username')
        if username and ' ' in username:
            parts = username.split(' ', 1)
            firestore_data['name'] = parts[0]
            firestore_data['surname'] = parts[1] if len(parts) > 1 else ''
        else:
            firestore_data['name'] = username or ''
            firestore_data['surname'] = ''
    
    # profile_picture_url'yi Firestore'da da sakla
    if 'profile_picture_url' in firestore_data:
        # Hem profile_picture_url hem de avatar_url'yi sakla
        firestore_data['avatar_url'] = firestore_data['profile_picture_url']
    
    # avatar_url varsa profile_picture_url'ye de map et
    if 'avatar_url' in firestore_data:
        firestore_data['profile_picture_url'] = firestore_data['avatar_url']
    
    return firestore_data

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

@app.post("/users/initialize_profile/", response_model=UserProfileResponse)
async def initialize_user_profile(
    profile_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    """
    Yeni kullanıcı için profil oluşturur (Google/Email signup için)
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    
    try:
        # Profil verilerini hazırla
        data = {
            'name': profile_data.get('name', ''),
            'surname': profile_data.get('surname', ''),
            'email': profile_data.get('email', ''),
            'age': profile_data.get('age'),
            'gender': profile_data.get('gender', 'Belirtilmemiş'),
            'profile_picture_url': profile_data.get('profile_picture_url'),
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        # Kullanıcı ID'si ile profil oluştur
        doc_ref = db.collection('user_profiles').document(user_id)
        doc_ref.set(data)
        
        # Oluşturulan profili al ve dönüştür
        created_doc = doc_ref.get()
        user_data = convert_firestore_data_to_user_profile(created_doc.to_dict())
        
        return {"id": created_doc.id, **user_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil oluşturulurken hata: {e}")

@app.post("/users/initialize_profile/", response_model=UserProfileResponse)
async def initialize_user_profile(
    profile_data: UserProfileInitialize,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    """
    Yeni kullanıcı için profil oluşturur (Google/Email signup için)
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    
    try:
        # Profil verilerini hazırla
        data = profile_data.dict()
        data['created_at'] = firestore.SERVER_TIMESTAMP
        data['updated_at'] = firestore.SERVER_TIMESTAMP
        
        # Kullanıcı ID'si ile profil oluştur
        doc_ref = db.collection('user_profiles').document(user_id)
        doc_ref.set(data)
        
        # Oluşturulan profili al ve dönüştür
        created_doc = doc_ref.get()
        user_data = convert_firestore_data_to_user_profile(created_doc.to_dict())
        
        # Frontend'in beklediği tüm alanları dahil et
        response_data = {
            "id": created_doc.id,
            **user_data
        }
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil oluşturulurken hata: {e}")

@app.post("/users/", response_model=UserProfileResponse)
async def create_user_profile(profile: UserProfileCreate):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı kurulamadı.")
    try:
        data = profile.dict()
        # username'i name olarak sakla (basit durumlar için)
        if 'username' in data:
            if ' ' in data['username']:
                parts = data['username'].split(' ', 1)
                data['name'] = parts[0]
                data['surname'] = parts[1]
            else:
                data['name'] = data['username']
                data['surname'] = ''
            data.pop('username')
        
        data['created_at'] = firestore.SERVER_TIMESTAMP
        data['updated_at'] = firestore.SERVER_TIMESTAMP
        
        doc_ref = db.collection('user_profiles').add(data)
        created_doc = doc_ref[1].get()
        
        # Veriyi uygun formata dönüştür
        user_data = convert_firestore_data_to_user_profile(created_doc.to_dict())
        return {"id": created_doc.id, **user_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil oluşturulurken hata: {e}")

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
            user_data = convert_firestore_data_to_user_profile(doc.to_dict())
            
            # Frontend'in beklediği tüm alanları dahil et
            response_data = {
                "id": doc.id,
                **user_data
            }
            
            return response_data
        raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kullanıcı profili getirilirken hata: {e}")

@app.put("/users/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(user_id: str, profile_update: UserProfileUpdate):
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        doc_ref = db.collection('user_profiles').document(user_id)
        
        # Önce dökümanın var olup olmadığını kontrol et
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı.")
        
        # Update verisini Firestore formatına çevir
        update_data = convert_user_profile_update_to_firestore(
            profile_update.dict(exclude_unset=True)
        )
        update_data['updated_at'] = firestore.SERVER_TIMESTAMP
        
        # Güncelleme işlemi
        doc_ref.update(update_data)
        
        # Güncellenmiş veriyi al ve dönüştür
        updated_doc = doc_ref.get()
        user_data = convert_firestore_data_to_user_profile(updated_doc.to_dict())
        
        # Frontend'in beklediği tüm alanları dahil et
        response_data = {
            "id": updated_doc.id,
            **user_data
        }
        
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profil güncellenirken hata: {e}")

@app.delete("/users/{user_id}")
async def delete_user_profile(user_id: str):
    print(f">>> update_user_profile fonksiyonu user_id: {user_id} ile çalıştırıldı.")
    if db is None:
        raise HTTPException(status_code=500, detail="Firestore bağlantısı yok.")
    try:
        doc_ref = db.collection('user_profiles').document(user_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı.")
        
        doc_ref.delete()
        return {"status": "success", "message": "Profil silindi."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silme hatası: {e}")

@app.get("/users/me", response_model=UserProfileResponse)
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    return await get_user_profile(user_id)

@app.put("/users/me", response_model=UserProfileResponse)
async def update_current_user_profile(
    profile_update: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    print(">>> /users/me (PUT) endpoint'ine istek geldi.")
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    print(f">>> İstek, user_id: {user_id} için update_user_profile fonksiyonuna yönlendiriliyor.")
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
        
        # Timestamp'i dönüştür
        interaction_data = created_doc.to_dict()
        if 'timestamp' in interaction_data and interaction_data['timestamp'] is not None:
            if hasattr(interaction_data['timestamp'], '_to_datetime'):
                interaction_data['timestamp'] = interaction_data['timestamp']._to_datetime()
        
        return {"id": created_doc.id, **interaction_data}
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
                if hasattr(data['timestamp'], '_to_datetime'):
                    data['timestamp'] = data['timestamp']._to_datetime()
            interactions.append(WordInteractionResponse(id=doc.id, **data))
        return interactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Etkileşimler alınırken hata: {e}")
