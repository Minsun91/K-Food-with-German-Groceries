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
// ⭐ 여기에 제미나이 키를 변수로 할당합니다 (환경변수 사용 추천)
export const apiKey_gemini = import.meta.env.VITE_GEMINI_API_KEY; 

// ⭐ export 목록에도 추가하거나, 위처럼 앞에 export를 바로 붙여주세요.
export { db, auth, analytics, app, appId, userId, storage, projectId };



