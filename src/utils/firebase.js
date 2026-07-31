import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: "k-food-with-german-groceries",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-601N8S5WCE"
};

// 1. 기본 인스턴스 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 2. Analytics 안전 초기화 (환경 지원 여부 체크)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// 3. 앱 관련 상수 설정
const appId = "recipe-blog-vsc-001";
const projectId = "k-food-with-german-groceries";
const userId = "user_" + Math.random().toString(36).substring(2, 9);

// 4. Gemini API Key (환경변수 안전 호출)
export const apiKey_gemini = import.meta.env.VITE_GEMINI_API_KEY;

// 5. 모듈 Export
export { db, auth, analytics, app, appId, userId, storage, projectId };

