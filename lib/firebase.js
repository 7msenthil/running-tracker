import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCIXCBT5SykVhGhpKj5UgSQF1VbZ2vHokA",
  authDomain: "running-64a15.firebaseapp.com",
  projectId: "running-64a15",
  storageBucket: "running-64a15.firebasestorage.app",
  messagingSenderId: "471910299832",
  appId: "1:471910299832:web:52fe7b2a56d5523b7fdc4d"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
