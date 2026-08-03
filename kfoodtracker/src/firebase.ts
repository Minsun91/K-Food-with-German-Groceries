import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// 1. Firebase Config (환경변수만 사용)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 환경변수 누락 체크 (디버깅 용도)
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase API Key가 .env 파일에 설정되지 않았습니다.");
}

// 2. Firebase 기본 서비스 인스턴스 생성
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 3. Analytics (웹 환경에서만 안전 실행)
let analytics = null;
if (Platform.OS === "web" && typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// 4. 앱 관련 식별자 상수
const appId = "recipe-blog-vsc-001";
const projectId = firebaseConfig.projectId;
const userId = "user_" + Math.random().toString(36).substring(2, 9);

// 5. Gemini API Key (환경변수 참조)
export const apiKey_gemini = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// 6. 모듈 Export
export { db, auth, analytics, app, appId, userId, storage, projectId };