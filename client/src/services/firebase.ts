import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from 'firebase/auth';

const firebaseConfig = {
  projectId: "pragatidesk-d9214",
  appId: "1:781652169077:web:28a9b5daf223b16b45033c",
  databaseURL: "https://pragatidesk-d9214-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "pragatidesk-d9214.firebasestorage.app",
  apiKey: "AIzaSyAlLO2orkHjWom0ULs39METRP_qRaBO5MU",
  authDomain: "pragatidesk-d9214.firebaseapp.com",
  messagingSenderId: "781652169077",
  measurementId: "G-07P9QQ81HX",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGooglePopup(): Promise<UserCredential> {
  return await signInWithPopup(auth, googleProvider);
}
