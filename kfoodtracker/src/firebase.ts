import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// 1. firebase/auth 메인에서 getAuth만 깔끔하게 가져옵니다.
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Expo Fast Refresh 중복 생성 방지
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // 모듈 해결 에러가 절대 나지 않는 표준 getAuth
const storage = getStorage(app);

let analytics = null;
if (Platform.OS === "web" && typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

const appId = "recipe-blog-vsc-001";
const projectId = firebaseConfig.projectId;
const userId = "user_" + Math.random().toString(36).substring(2, 9);

export const apiKey_gemini = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export { db, auth, analytics, app, appId, userId, storage, projectId };