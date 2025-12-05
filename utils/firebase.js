import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBqUgHZkQXAgzky_lV4tKx8_bcpO5FhtSs",
  authDomain: "solutionmap-fa49a.firebaseapp.com",
  projectId: "solutionmap-fa49a",
  storageBucket: "solutionmap-fa49a.firebasestorage.app",
  messagingSenderId: "357338871294",
  appId: "1:357338871294:web:a8b7f2d1454ebc246a7caf",
  measurementId: "G-H38QSGFT94"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);