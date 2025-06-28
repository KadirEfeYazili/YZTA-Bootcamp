# YDS Asistanı

YDS ve YÖKDİL sınavlarına hazırlık için geliştirilmiş React tabanlı web uygulaması.

## Özellikler

- **İlerleme Paneli**: Kullanıcının okuma, dilbilgisi ve kelime öğrenme ilerlemesini takip eder
- **Kelime Karşılaştırma**: Akademik kelimelerin eş anlamlılarını ve kullanım nüanslarını karşılaştırır
- **Akıl Haritası Oluşturucu**: Konular hakkında hiyerarşik akıl haritaları oluşturur
- **AI Sohbet Asistanı**: YDS/YÖKDİL konularında sorular sorabilirsiniz
- **Firebase Entegrasyonu**: Kullanıcı verilerini güvenli şekilde saklar

## Teknolojiler

- React 18
- Firebase (Authentication & Firestore)
- Tailwind CSS
- Lucide React (İkonlar)
- React Markdown

## Kurulum

1. Projeyi klonlayın:
```bash
git clone <repository-url>
cd yds-assistant
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Firebase konfigürasyonunu ayarlayın:
   - `src/config/firebase.js` dosyasında Firebase konfigürasyonunuzu güncelleyin

4. Uygulamayı başlatın:
```bash
npm start
```

## Proje Yapısı

```
yds-assistant/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── WordComparer.jsx
│   │   ├── ReadingPractice.jsx
│   │   ├── GrammarPractice.jsx
│   │   ├── MindMapper.jsx
│   │   ├── AIChat.jsx
│   │   └── NavItem.jsx
│   ├── utils/
│   │   └── helpers.js
│   ├── config/
│   │   └── firebase.js
│   ├── styles/
│   │   └── index.css
│   ├── App.jsx
│   └── index.js
├── package.json
└── README.md
```

## Kullanım

1. **İlerleme Paneli**: Genel ilerlemenizi ve öğrenilen kelimeleri görüntüleyin
2. **Kelime Karşılaştırma**: Kelime girin ve AI'dan detaylı karşılaştırma alın
3. **Akıl Haritası**: Konu girin ve hiyerarşik akıl haritası oluşturun
4. **AI Sohbet**: Sağ alt köşedeki sohbet butonuna tıklayarak AI asistanına sorular sorun

## Geliştirme

Bu proje modüler bir yapıda tasarlanmıştır:
- Her bileşen kendi dosyasında bulunur
- Yardımcı fonksiyonlar `utils/` klasöründe
- Firebase konfigürasyonu `config/` klasöründe
- Stiller `styles/` klasöründe

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 