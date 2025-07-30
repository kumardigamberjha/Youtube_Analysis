import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config from the console
const firebaseConfig = {
  apiKey: "AIzaSyB7p3g-Nfb-6k5u7O1AuO9rWkebayXAUik",
  authDomain: "analysis-e20f0.firebaseapp.com",
  projectId: "analysis-e20f0",
  storageBucket: "analysis-e20f0.firebasestorage.app",
  messagingSenderId: "943105706632",
  appId: "1:943105706632:web:f82c8a396d84fc4c5c2d3d",
  measurementId: "G-N1STCFX40L"
};

// Initialize Firebase - check if app already exists
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Google Auth Provider with additional configuration
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
