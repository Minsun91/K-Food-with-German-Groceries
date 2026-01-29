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

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
            {/* 상단 프로필/로그인 영역 */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                {user ? (
                    <div className="flex items-center gap-3">
                        <img src={user.photoURL} alt="profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                        <div>
                            <p className="text-xs font-black text-slate-800">{user.displayName}님 환영해요!</p>
                            <button onClick={logout} className="text-[10px] text-rose-500 font-bold underline">Abmelden (로그아웃)</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <p className="text-sm font-bold text-slate-500">독일 생활 이야기를 나눠보세요 🇩🇪</p>
                        <button 
                            onClick={loginWithGoogle}
                            className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4" alt="G" />
                            Google로 로그인
                        </button>
                    </div>
                )}
            </div>

            {/* 글쓰기 폼 (로그인 시에만 노출하거나 활성화) */}
            <form onSubmit={handleSubmit} className="relative group">
                <textarea 
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    disabled={!user}
                    placeholder={user ? "오늘 마트 꿀템은 무엇인가요?" : "로그인 후 글을 작성할 수 있습니다."}
                    className={`w-full p-6 bg-white border-2 ${user ? 'border-slate-100 focus:border-indigo-500' : 'border-slate-50 bg-slate-50/50'} rounded-[2rem] min-h-[140px] shadow-xl shadow-slate-200/40 transition-all outline-none text-sm`}
                />
                {user && (
                    <button className="absolute bottom-4 right-4 bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-xs hover:bg-indigo-700 transition-all shadow-lg">
                        Posten
                    </button>
                )}
            </form>

            {/* 게시글 목록 */}
            <div className="space-y-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <p className="text-slate-700 text-sm leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src={post.authorPhoto} className="w-5 h-5 rounded-full" alt="" />
                                <span className="text-[11px] font-bold text-slate-500">{post.authorName}</span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-medium">
                                {post.createdAt?.toDate().toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Community;