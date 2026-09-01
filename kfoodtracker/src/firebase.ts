import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { Platform } from "react-native";

// 1. firebase/auth 패키지만 깔끔하게 불러옵니다.
import { initializeAuth, getAuth, Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 2. 타입 경로 에러 방지를 위해 require 방식으로 persistence 불러오기
const { getReactNativePersistence } = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

// 3. AsyncStorage 세션 유지 적용 (중복 초기화 안 되도록 안전 처리)
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

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