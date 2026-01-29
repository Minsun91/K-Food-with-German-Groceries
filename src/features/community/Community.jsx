import React, { useState, useEffect } from 'react';
import { db, auth } from '../../utils/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { loginWithGoogle, logout } from '../../utils/auth';

const Community = ({ currentLang }) => {
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState("");
    const [user, setUser] = useState(null); // 로그인 사용자 상태
    const [loading, setLoading] = useState(true);

    const translations = {
        ko: {
            welcome: "님 환영해요!",
            logout: "로그아웃",
            loginMsg: "독일 생활 이야기를 나눠보세요 🇩🇪",
            googleLogin: "Google로 로그인",
            placeholder: "오늘 마트 꿀템은 무엇인가요?",
            loginFirst: "로그인 후 글을 작성할 수 있습니다.",
            postBtn: "올리기",
            alertLogin: "로그인이 필요합니다!"
        },
        en: {
            welcome: "Welcome, ",
            logout: "Logout",
            loginMsg: "Share your life in Germany 🇩🇪",
            googleLogin: "Sign in with Google",
            placeholder: "Any good finds at the mart today?",
            loginFirst: "Please login to write a post.",
            postBtn: "Post",
            alertLogin: "Login required!"
        },
        de: {
            welcome: "Willkommen, ",
            logout: "Abmelden",
            loginMsg: "Teile dein Leben in Deutschland 🇩🇪",
            googleLogin: "Mit Google anmelden",
            placeholder: "Was hast du heute im Supermarkt gefunden?",
            loginFirst: "Bitte logge dich ein, um zu schreiben.",
            postBtn: "Posten",
            alertLogin: "Anmeldung erforderlich!"
        }
    };
    // 1. 로그인 상태 감시
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. 실시간 게시글 가져오기 (비로그인자도 가능)
    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return alert("로그인이 필요합니다!");
        if (!newPost.trim()) return;
    
        try {
            await addDoc(collection(db, "posts"), {
                content: newPost,
                authorName: user.displayName,
                authorId: user.uid,
                createdAt: serverTimestamp(),
            });
    
            // 📊 구글 애널리틱스 이벤트 전송
            if (window.gtag) {
                window.gtag('event', 'post_create', {
                    'event_category': 'community',
                    'user_name': user.displayName,
                    'content_length': newPost.length
                });
            }
    
            setNewPost("");
            alert("글이 성공적으로 등록되었습니다! 🎉");
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };
    const t = translations[currentLang] || translations['ko'];

    return (
<div className="max-w-3xl mx-auto pt-10 pb-24 px-6 space-y-12 animate-in fade-in duration-700 flex flex-col">
                {/* 프로필 영역 */}
<div className="w-full flex justify-between items-center bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100/50 backdrop-blur-sm">
                {user ? (
                    <div className="flex items-center gap-3">
                        <img src={user.photoURL} alt="profile" className="w-10 h-10 rounded-full border-2 border-white" />
                        <div>
                            <p className="text-xs font-black text-slate-800">
                                {currentLang === 'ko' ? `${user.displayName}${t.welcome}` : `${t.welcome}${user.displayName}`}
                            </p>
                            <button onClick={logout} className="text-[10px] text-rose-500 font-bold underline">{t.logout}</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <p className="text-sm font-bold text-slate-500">{t.loginMsg}</p>
                        <button onClick={loginWithGoogle} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4" alt="G" />
                            {t.googleLogin}
                        </button>
                    </div>
                )}
            </div>

            {/* 글쓰기 폼 - 디자인 복구 버전 */}
<form onSubmit={handleSubmit} className="w-full relative bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
    <textarea 
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
        disabled={!user}
        placeholder={user ? "오늘 마트 꿀템은 무엇인가요? (Was hast du heute gefunden?)" : "로그인 후 글을 작성할 수 있습니다."}
        className="w-full p-8 bg-transparent min-h-[160px] outline-none text-slate-700 font-medium placeholder:text-slate-300 resize-none text-base"
    />
    {user && (
        <div className="absolute bottom-4 right-6 flex items-center gap-3">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Share story</span>
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                POSTEN
            </button>
        </div>
    )}
</form>

            {/* 게시글 목록 (날짜 포맷도 언어에 맞게) */}
<div className="w-full space-y-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <p className="text-slate-700 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src={post.authorPhoto} className="w-5 h-5 rounded-full" alt="" />
                                <span className="text-[11px] font-bold text-slate-500">{post.authorName}</span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-medium">
                                {post.createdAt?.toDate().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : (currentLang === 'de' ? 'de-DE' : 'en-US'))}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Community;