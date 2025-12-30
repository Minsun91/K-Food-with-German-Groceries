import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId:"k-food-with-german-groceries",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        apiKey_gemini: import.meta.env.VITE_GEMINI_API_KEY
    };

    const app = initializeApp(firebaseConfig);
    export const db = getFirestore(app);
    export const apiKey_gemini = firebaseConfig.apiKey_gemini;
    export const appId="recipe-blog-vsc-001";
    export const userId = "user_" + Math.random().toString(36).substring(2, 9);
