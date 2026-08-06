import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { TRANSLATIONS } from '../constants/translations';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const t = TRANSLATIONS[lang];
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      const docRef = doc(db, 'posts', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPost(docSnap.data());
      }
    };
    fetchPost();

    const q = query(
      collection(db, 'posts', id as string, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentList);
    });

    return () => unsubscribe();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(t.alertLoginTitle, t.alertLoginMsg);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'posts', id as string, 'comments'), {
        text: newComment,
        authorId: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error('댓글 작성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={{ color: '#6B7280' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {lang === 'KR' ? '뒤로' : 'Back'}</Text>
          </TouchableOpacity>

          <View style={styles.langSelector}>
            {(['KR', 'EN', 'DE'] as const).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
              >
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.postCard}>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.author}>
              {post.isAnonymous ? '익명 사용자' : '회원'}
            </Text>
            <View style={styles.divider} />

            {/* 💡 첨부된 이미지가 있다면 상세 화면에 출력 */}
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            )}

            <Text style={styles.postContent}>{post.content}</Text>
          </View>

          <Text style={styles.commentHeader}>
            💬 {lang === 'KR' ? '댓글' : 'Comments'} ({comments.length})
          </Text>

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Text style={styles.commentAuthor}>
                {comment.isAnonymous ? '익명' : '회원'}
              </Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder={lang === 'KR' ? '댓글을 입력하세요...' : 'Write a comment...'}
            placeholderTextColor="#9CA3AF"
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity 
            style={styles.commentSubmitBtn} 
            onPress={handleAddComment}
            disabled={loading}
          >
            <Text style={styles.commentSubmitText}>
              {lang === 'KR' ? '등록' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { color: '#FF4757' },
  content: { padding: 16, paddingBottom: 30 },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 6 },
  author: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },
  postImage: { width: '100%', height: 220, borderRadius: 8, marginBottom: 16, resizeMode: 'cover' },
  postContent: { fontSize: 15, color: '#374151', lineHeight: 22 },
  commentHeader: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  commentCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  commentAuthor: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#1F2937' },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    marginRight: 8,
  },
  commentSubmitBtn: {
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  commentSubmitText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});