import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 2. 초기화 (설정값이 있는 경우에만 작동)
const analytics = getAnalytics(app); 
const appId = "recipe-blog-vsc-001"; // 또는 본인이 설정한 ID
const userId = "user_" + Math.random().toString(36).substr(2, 9); // 임시 유저 ID 예시
const projectId = "k-food-with-german-groceries";
  
// 3. 내보내기에 analytics 추가
export { db, auth, analytics, app, appId, userId, storage, projectId };
