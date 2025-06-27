import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export const initFirebase = async (firebaseConfig, initialAuthToken, setDb, setUserId, setIsAuthReady) => {
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    console.error("Firebase config is missing or empty.");
    setIsAuthReady(true);
    return;
  }
  try {
    const app = initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);
    setDb(dbInstance);

    onAuthStateChanged(authInstance, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthReady(true);
    });

    if (initialAuthToken) {
      try {
        await signInWithCustomToken(authInstance, initialAuthToken);
      } catch (tokenError) {
        console.warn("A problem occurred with the provided user token, proceeding with a temporary session.", `Error details: ${tokenError.message}`);
        await signInAnonymously(authInstance);
      }
    } else {
      await signInAnonymously(authInstance);
    }
  } catch (error) {
    console.error("A critical Firebase error occurred during initialization:", error);
    setIsAuthReady(true);
  }
};

export const saveProgressToFirestore = async (db, userId, appId, newProgress) => {
  if (!db || !userId) return;
  const userProgressDocRef = doc(db, `artifacts/${appId}/users/${userId}/progress/userProgress`);
  await updateDoc(userProgressDocRef, newProgress);
};

export const listenToProgress = (db, userId, appId, setUserProgress, userProgress) => {
  if (!db || !userId) return () => {};
  const userProgressDocRef = doc(db, `artifacts/${appId}/users/${userId}/progress/userProgress`);
  const unsubscribe = onSnapshot(userProgressDocRef, (docSnap) => {
    if (docSnap.exists()) {
      setUserProgress(docSnap.data());
    } else {
      setDoc(userProgressDocRef, userProgress, { merge: true });
    }
  });
  return unsubscribe;
};

export { arrayUnion, arrayRemove };