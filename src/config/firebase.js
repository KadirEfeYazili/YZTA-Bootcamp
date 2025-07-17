// config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKSwjetkHMql81024nhoIj4Ka6W65AplM",
  authDomain: "yzta-akademi.firebaseapp.com",
  projectId: "yzta-akademi",
  storageBucket: "yzta-akademi.appspot.com",
  messagingSenderId: "1033195492342",
  appId: "1:1033195492342:web:8e7415ba995ba868d2edd7",
  measurementId: "G-SSZB5BX7LN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;

export { app, auth, db, firebaseConfig, appId };
