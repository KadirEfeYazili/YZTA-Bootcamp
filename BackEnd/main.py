from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import os
from typing import Optional
from datetime import datetime

# --- Firebase Başlatma ---
try:
    # Render.com'un ortam değişkenlerinden veya yerel dosyadan anahtarı bul
    service_account_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')
    if not os.path.exists(service_account_path):
        local_path = 'serviceAccountKey.json'
        if os.path.exists(local_path):
            service_account_path = local_path
    
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase Admin SDK başarıyla başlatıldı.")
except Exception as e:
    print(f"❌ FATAL HATA: Firebase başlatılamadı, uygulama düzgün çalışmayabilir: {e}")
    db = None

app = FastAPI(title="PrepMate API")

# --- Genel Hata Yakalayıcı (Uygulamanın çökmesini engeller) ---
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    error_message = f"Beklenmedik sunucu hatası: {type(exc).__name__} -> {exc}"
    print(f"❌ {error_message} | İstek: {request.method} {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucuda beklenmedik bir hata oluştu."},
    )

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production için "https://kadirefeyazili.github.io" olarak değiştirilebilir
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
 )

# --- Pydantic Modelleri ---
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    age: Optional[int] = None
    profile_picture_url: Optional[str] = None
    gender: Optional[str] = None
    # Frontend'den gelen diğer tüm olası alanlar

class UserProfileInitialize(BaseModel):
    name: str
    surname: str
    email: str
    age: int

class UserProfileResponse(BaseModel):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    name: Optional[str] = None
    surname: Optional[str] = None
    age: Optional[int] = None
    profile_picture_url: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    
    class Config:
        # Datetime objelerini JSON formatına çevirir
        json_encoders = {datetime: lambda dt: dt.isoformat()}
        arbitrary_types_allowed = True

# --- Yardımcı Fonksiyonlar ---
auth_scheme = HTTPBearer()

def verify_token(token: str) -> dict:
    """Firebase ID token'ını doğrular ve kullanıcı bilgilerini döndürür."""
    try:
        return firebase_auth.verify_id_token(token)
    except Exception as e:
        print(f"!!! Token doğrulama hatası: {e}")
        raise HTTPException(status_code=401, detail=f"Geçersiz veya süresi dolmuş token: {e}")

# --- API ENDPOINT'LERİ ---

@app.get("/health", tags=["System"])
async def health_check():
    """API'nin ve veritabanı bağlantısının durumunu kontrol eder."""
    if db is None:
        raise HTTPException(status_code=503, detail="API çalışıyor ancak Firestore bağlantısı yok.")
    return {"status": "healthy", "message": "API ve Firestore bağlantısı çalışıyor."}

@app.post("/users/initialize_profile", response_model=UserProfileResponse, status_code=201, tags=["Users"])
async def initialize_user_profile(
    profile_data: UserProfileInitialize,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    """Yeni bir kullanıcı için Firestore'da profil belgesi oluşturur."""
    print(">>> /users/initialize_profile (POST) endpoint'ine istek geldi.")
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    
    if db is None: raise HTTPException(status_code=503, detail="Firestore bağlantısı yok.")
    
    doc_ref = db.collection('user_profiles').document(user_id)
    if doc_ref.get().exists:
        print(f"!!! Kullanıcı zaten mevcut, profil oluşturma atlanıyor: {user_id}")
        raise HTTPException(status_code=409, detail="Bu kullanıcı için zaten bir profil mevcut.")

    new_profile_data = profile_data.dict()
    new_profile_data['created_at'] = firestore.SERVER_TIMESTAMP
    new_profile_data['updated_at'] = firestore.SERVER_TIMESTAMP
    
    doc_ref.set(new_profile_data)
    print(f"✅ Yeni profil başarıyla oluşturuldu: {user_id}")
    
    created_doc = doc_ref.get()
    return {"id": created_doc.id, **created_doc.to_dict()}

@app.get("/users/me", response_model=UserProfileResponse, tags=["Users"])
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    """Mevcut giriş yapmış kullanıcının profilini getirir."""
    print(">>> /users/me (GET) endpoint'ine istek geldi.")
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    
    if db is None: raise HTTPException(status_code=503, detail="Firestore bağlantısı yok.")
    
    doc_ref = db.collection('user_profiles').document(user_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        print(f"!!! /users/me (GET) için kullanıcı profili bulunamadı: {user_id}")
        raise HTTPException(status_code=404, detail="Kullanıcı profili bulunamadı.")
        
    print(f"✅ Profil başarıyla bulundu ve döndürülüyor: {user_id}")
    return {"id": doc.id, **doc.to_dict()}

@app.put("/users/me", response_model=UserProfileResponse, tags=["Users"])
async def update_current_user_profile(
    profile_update: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)
):
    """Mevcut kullanıcının profilini günceller veya yoksa oluşturur (upsert)."""
    print(">>> /users/me (PUT) endpoint'ine istek geldi.")
    token = credentials.credentials
    user_info = verify_token(token)
    user_id = user_info['uid']
    
    if db is None: raise HTTPException(status_code=503, detail="Firestore bağlantısı yok.")
    
    doc_ref = db.collection('user_profiles').document(user_id)
    
    # Frontend'den gelen ve None olmayan alanları içeren bir dict oluştur
    update_data = profile_update.dict(exclude_unset=True)
    update_data['updated_at'] = firestore.SERVER_TIMESTAMP
    
    if doc_ref.get().exists:
        print(f"-> Profil bulundu, güncelleniyor: {user_id}")
        doc_ref.update(update_data)
    else:
        print(f"-> Profil bulunamadı, YENİ PROFİL OLUŞTURULUYOR: {user_id}")
        update_data['created_at'] = firestore.SERVER_TIMESTAMP
        # Yeni oluşturulan profil için email gibi temel bilgileri token'dan al
        update_data['email'] = user_info.get('email')
        doc_ref.set(update_data)

    updated_doc = doc_ref.get()
    print(f"✅ Profil işlemi (güncelleme/oluşturma) başarıyla tamamlandı: {user_id}")
    return {"id": updated_doc.id, **updated_doc.to_dict()}

