import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_2q14Haxf8h2KDA2jsqlbGu-Jo-XCKCc",
  authDomain: "welog-32619.firebaseapp.com",
  projectId: "welog-32619",
  storageBucket: "welog-32619.firebasestorage.app",
  messagingSenderId: "969854784142",
  appId: "1:969854784142:web:f6de53b5ba01bb41b86fdf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export default app;

