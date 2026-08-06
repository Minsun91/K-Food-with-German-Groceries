import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { TRANSLATIONS } from '../../constants/translations';
import { useRouter } from 'expo-router';

export default function CommunityScreen() {
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const t = TRANSLATIONS[lang];
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [posts, setPosts] = useState<any[]>([]); // 실시간 게시글 목록

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (initializing) setInitializing(false);
    });

    // Firestore의 posts 컬렉션에서 최신순으로 글 실시간 가져오기
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const postList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postList);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handlePressWrite = () => {
    if (initializing) return;

    if (!currentUser) {
      Alert.alert(
        t.alertLoginTitle,
        t.alertLoginMsg,
        [
          { text: t.alertCancel, style: 'cancel' },
          { 
            text: t.alertGoMypage, 
            onPress: () => {
              router.push('/(tabs)/mypage_anno');
            } 
          }
        ]
      );
      return;
    }

    router.push('/write-post' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 상단 언어 선택 토글 버튼 바 */}
        <View style={styles.topBar}>
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

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Community</Text>
            <TouchableOpacity style={styles.writeBtn} onPress={handlePressWrite}>
              <Text style={styles.writeBtnText}>✍️</Text>
            </TouchableOpacity>
          </View>

          {/* 게시글 목록 피드 */}
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.postList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.postCard}
                onPress={() =>
                  router.push({
                    pathname: '/post-detail',
                    params: { id: item.id },
                  })
                }
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: item.imageUrl ? 10 : 0 }}>
                    <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
                  </View>
                  {/* 이미지가 있다면 썸네일 표시 */}
                  {item.imageUrl && (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
                  )}
                </View>
                <Text style={styles.postAuthor}>
                  {item.isAnonymous ? '익명 사용자' : '회원'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {lang === 'KR' ? '아직 작성된 글이 없어요.' : lang === 'EN' ? 'No posts yet.' : 'Noch keine Beiträge.'}
                </Text>
              </View>
            }
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 6 },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { color: '#FF4757' },
  content: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  writeBtn: { backgroundColor: '#FF4757', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  writeBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  postList: { paddingBottom: 20 },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  postContent: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  postAuthor: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});