
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-646407807-f82f6",
  "appId": "1:72987365384:web:3e9302abbe5cea63a481bd",
  "apiKey": "AIzaSyAi62oALtSVH7KUWUEflqHWKiescdJfI2o",
  "authDomain": "studio-646407807-f82f6.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "72987365384"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
