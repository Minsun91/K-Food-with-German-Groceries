import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';
import { signInAnonymously, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import LangToggle from '../../components/LangToggle'; // 경로에 맞게 수정

export default function MyPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]); 
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const router = useRouter();

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

        unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setFavorites(userData.favorites || []);
          }
        });

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

  const handleDeleteAccount = () => {
    Alert.alert(
      lang === 'KR' ? '계정 탈퇴' : lang === 'EN' ? 'Delete Account' : 'Konto löschen',
      lang === 'KR' 
        ? '정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.' 
        : lang === 'EN' 
        ? 'Are you sure you want to delete your account? This action cannot be undone.' 
        : 'Möchten Sie Ihr Konto wirklich löschen?',
      [
        { text: lang === 'KR' ? '취소' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'KR' ? '탈퇴' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              try {
                await deleteUser(user);
                Alert.alert(
                  lang === 'KR' ? '완료' : 'Completed', 
                  lang === 'KR' ? '계정이 삭제되었습니다.' : 'Account deleted successfully.'
                );
                setIsLoggedIn(false);
              } catch (error: any) {
                if (error.code === 'auth/requires-recent-login') {
                  Alert.alert(
                    lang === 'KR' ? '재인증 필요' : 'Re-login Required',
                    lang === 'KR' 
                      ? '보안을 위해 로그아웃 후 다시 로그인한 뒤 탈퇴를 진행해 주세요.' 
                      : 'For security, please log out and log back in before deleting your account.',
                    [
                      { 
                        text: 'OK', 
                        onPress: async () => {
                          await auth.signOut();
                          setIsLoggedIn(false);
                        } 
                      }
                    ]
                  );
                } else {
                  Alert.alert(
                    lang === 'KR' ? '오류' : 'Error', 
                    lang === 'KR' ? '계정 삭제 중 문제가 발생했습니다.' : 'Failed to delete account.'
                  );
                }
              }
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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

          {/* 하단 법적 고지 / 계정 삭제 영역 */}
          <View style={styles.footerLinksContainer}>
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://your-privacy-policy-link.com')} 
              style={styles.footerLinkItem}
            >
              <Text style={styles.footerLinkText}>
                {lang === 'KR' ? '개인정보처리방침' : lang === 'EN' ? 'Privacy Policy' : 'Datenschutzerklärung'}
              </Text>
            </TouchableOpacity>

            {isLoggedIn && (
              <TouchableOpacity 
                onPress={handleDeleteAccount} 
                style={styles.footerLinkItem}
              >
                <Text style={[styles.footerLinkText, { color: '#EF4444' }]}>
                  {lang === 'KR' ? '회원 탈퇴 (계정 삭제)' : lang === 'EN' ? 'Delete Account' : 'Konto löschen'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' }, // 다른 탭과 동일한 배경색(#F8F9FA) 적용
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // 💡 상단바 배경 공백 문제 해결을 위해 투명 처리 및 패딩 정돈
  topBar: { 
    paddingHorizontal: 20, 
    paddingTop: 6, 
    paddingBottom: 4, 
    alignItems: 'flex-end', 
    backgroundColor: 'transparent' 
  },
  
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { fontWeight: 'bold', color: '#FF4757' },

  content: { padding: 20, paddingBottom: 30 },
  
  profileContainer: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' }, // 커뮤니티/가격비교와 타이틀 폰트 컬러(#1F2937) 통일
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  loginContainer: { marginBottom: 24 },
  loginButton: { backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center' },
  logoutButton: { backgroundColor: '#EF4444' },
  loginButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },

  sectionContainer: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },

  emptyBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }, // 다른 탭의 카드 UI 스타일과 일치화
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  itemCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 8, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB' 
  },
  itemName: { fontSize: 14, color: '#374151', fontWeight: '500' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#059669' },

  footerLinksContainer: { marginTop: 30, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20 },
  footerLinkItem: { marginBottom: 12 },
  footerLinkText: { fontSize: 13, color: '#6B7280', textDecorationLine: 'underline' }
});