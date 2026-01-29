import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: "k-food-with-german-groceries",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: "G-601N8S5WCE"
  };
  
  
  // 2. Gemini API Key (이것도 마찬가지로 안전하게!)
  export const apiKey_gemini = import.meta.env.VITE_GEMINI_API_KEY;
  
  // 3. Firebase 초기화a
  const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);   // ⭐ 이 줄이 핵심
export const db = getFirestore(app);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

  // 4. 앱 관련 상수
  export const appId = "recipe-blog-vsc-001";
  export const userId = "user_" + Math.random().toString(36).substring(2, 9);
  export const projectId = "k-food-with-german-groceries";
  