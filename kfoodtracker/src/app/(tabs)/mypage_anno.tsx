import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { TRANSLATIONS } from '../../constants/translations';

export default function MyPageAnno() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]); // 💡 내가 쓴 글 목록 상태 추가
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const router = useRouter();

  const t = TRANSLATIONS[lang];

  // 유저 로그인 상태 및 찜 목록, 내가 쓴 글 실시간 감지
  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    let unsubscribePosts: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          await setDoc(userDocRef, { favorites: [] });
        }

        // 1. 찜 목록 실시간 동기화
        unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setFavorites(userData.favorites || []);
          }
        });

        // 2. 내가 쓴 글 목록 실시간 동기화 (authorId가 현재 유저 UID와 일치하는 것)
        const q = query(collection(db, 'posts'), where('authorId', '==', user.uid));
        unsubscribePosts = onSnapshot(q, (snapshot) => {
          const postList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMyPosts(postList);
        });

      } else {
        setIsLoggedIn(false);
        setFavorites([]);
        setMyPosts([]);
        if (unsubscribeDoc) unsubscribeDoc();
        if (unsubscribePosts) unsubscribePosts();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribePosts) unsubscribePosts();
    };
  }, []);

  const handleAnonymousLogin = async () => {
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await setDoc(userDocRef, { favorites: [] });
      }
      setIsLoggedIn(true);
    } catch (error) {
      console.error('익명 로그인 실패:', error);
    }
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

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileContainer}>
            <Text style={styles.emoji}>👤</Text>
            <Text style={styles.title}>
              {lang === 'KR' ? '마이페이지' : lang === 'EN' ? 'My Page' : 'Mein Bereich'}
            </Text>
            <Text style={styles.subtitle}>
              {isLoggedIn 
                ? (lang === 'KR' ? '환영합니다! 🇩🇪' : lang === 'EN' ? 'Welcome! 🇩🇪' : 'Willkommen! 🇩🇪') 
                : (lang === 'KR' ? '로그인이 필요합니다.' : lang === 'EN' ? 'Login required.' : 'Anmeldung erforderlich.')}
            </Text>
          </View>

          <View style={styles.loginContainer}>
            {!isLoggedIn ? (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleAnonymousLogin}
              >
                <Text style={styles.loginButtonText}>
                  {lang === 'KR' ? '익명으로 시작하기' : lang === 'EN' ? 'Start Anonymously' : 'Anonym starten'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.loginButton, styles.logoutButton]}
                onPress={() => {
                  auth.signOut();
                  setIsLoggedIn(false);
                }}
              >
                <Text style={styles.loginButtonText}>
                  {lang === 'KR' ? '로그아웃' : lang === 'EN' ? 'Logout' : 'Abmelden'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 1. 내가 찜한 상품 섹션 */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {lang === 'KR' ? '⭐ 내가 찜한 최저가 상품' : lang === 'EN' ? '⭐ My Favorite Products' : '⭐ Meine Favoriten'}
            </Text>

            {!isLoggedIn ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {lang === 'KR' ? '로그인 후 찜한 상품을 확인할 수 있어요.' : lang === 'EN' ? 'Login to view your favorites.' : 'Bitte anmelden, um Favoriten zu sehen.'}
                </Text>
              </View>
            ) : favorites.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {lang === 'KR' ? '아직 찜한 상품이 없어요!' : lang === 'EN' ? 'No favorites yet!' : 'Noch keine Favoriten!'}
                </Text>
              </View>
            ) : (
              favorites.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.itemCard}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/compare',
                      params: { search: item.name },
                    })
                  }
                >
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price} €</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* 2. 내가 쓴 커뮤니티 글 섹션 */}
          <View style={[styles.sectionContainer, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>
              {lang === 'KR' ? '📝 내가 쓴 커뮤니티 글' : lang === 'EN' ? '📝 My Community Posts' : '📝 Meine Community-Beiträge'}
            </Text>

            {!isLoggedIn ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {lang === 'KR' ? '로그인 후 작성한 글을 확인할 수 있어요.' : lang === 'EN' ? 'Login to view your posts.' : 'Bitte anmelden.'}
                </Text>
              </View>
            ) : myPosts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {lang === 'KR' ? '아직 작성한 글이 없어요!' : lang === 'EN' ? 'No posts written yet!' : 'Noch keine Beiträge geschrieben!'}
                </Text>
              </View>
            ) : (
              myPosts.map((post) => (
                <View key={post.id} style={styles.itemCard}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{post.title}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>{post.content}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  langTextActive: {
    color: '#FF4757',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  loginContainer: {
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#FF4757',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyBox: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF4757',
  },
});