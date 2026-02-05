import React, { useState, useEffect } from 'react';
import { db } from '../../utils/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const CommentSection = ({ postId, user, currentLang }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");

    // 해당 포스트의 댓글 실시간 로드
    useEffect(() => {
        const q = query(
            collection(db, "posts", postId, "comments"),
            orderBy("createdAt", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [postId]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!user || !newComment.trim()) return;

        try {
            await addDoc(collection(db, "posts", postId, "comments"), {
                text: newComment,
                authorName: user.displayName,
                authorPhoto: user.photoURL,
                createdAt: serverTimestamp(),
            });
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment: ", error);
        }
    };

    return (
        <div className="mt-6 pt-6 border-t border-slate-50">
            {/* 댓글 목록 */}
            <div className="space-y-4 mb-6">
                {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 items-start">
                        <img src={comment.authorPhoto} className="w-6 h-6 rounded-full" alt="" />
                        <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none flex-1">
                            <p className="text-[11px] font-black text-slate-800 mb-1">{comment.authorName}</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{comment.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 댓글 입력창 */}
            {user && (
                <form onSubmit={handleCommentSubmit} className="relative flex items-center">
                    <input 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 남겨보세요..."
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <button className="absolute right-2 text-indigo-600 font-black text-[10px] hover:text-indigo-800 transition-colors">
                        SEND
                    </button>
                </form>
            )}
        </div>
    );
};

export default CommentSection;