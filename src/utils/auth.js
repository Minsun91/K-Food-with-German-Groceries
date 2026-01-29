import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const provider = new GoogleAuthProvider();

// 구글 로그인 함수
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user; // 로그인 성공 시 사용자 정보 반환
    } catch (error) {
        console.error("Login Error:", error);
        return null;
    }
};

// 로그아웃 함수
export const logout = () => signOut(auth);
