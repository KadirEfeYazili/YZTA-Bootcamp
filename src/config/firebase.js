import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAm8zrsQ82bx6a0lTEHy_CEnw73sHSGrO8",
  authDomain: "yds-assistant.firebaseapp.com",
  projectId: "yds-assistant",
  storageBucket: "yds-assistant.firebasestorage.app",
  messagingSenderId: "1082570080185",
  appId: "1:1082570080185:web:d0d848f38c98cf2cfa8068",
  measurementId: "G-BCQ2KE55PR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
