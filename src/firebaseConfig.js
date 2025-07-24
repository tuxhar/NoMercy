import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3GgAgQvcuWElNsrZ0FaZSSYoPY0tnSTw",
  authDomain: "no-mercy-28e0a.firebaseapp.com",
  projectId: "no-mercy-28e0a",
  storageBucket: "no-mercy-28e0a.appspot.com",
  messagingSenderId: "353208485106",
  appId: "1:353208485106:web:bc33f4d201cbfd95f8fc6b",
  measurementId: "G-DT0SXRFFGR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
