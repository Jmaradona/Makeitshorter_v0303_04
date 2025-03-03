import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Check if Firebase config is available
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingVars.length > 0) {
  console.warn('Firebase configuration is incomplete. Authentication features will be disabled.');
  console.warn('Missing environment variables:', missingVars.join(', '));
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-mode',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-mode',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-mode',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-mode',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'demo-mode',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-mode'
};

let auth;
let db;
let googleProvider;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  
  // Configure Google Auth Provider
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} catch (error) {
  console.error('Firebase initialization failed:', error);
  // Provide mock implementations for Firebase services
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => callback(null),
    signInWithPopup: () => Promise.reject(new Error('Auth disabled in demo mode')),
    signOut: () => Promise.resolve()
  };
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => ({}) }),
        set: () => Promise.resolve()
      })
    })
  };
  googleProvider = {};
}

export { auth, db, googleProvider };