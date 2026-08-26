import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase';
import { 
  signInAnonymously, 
  deleteUser, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { useRouter } from 'expo-router';

// Expo 인증 라이브러리
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

WebBrowser.maybeCompleteAuthSession();

export default function MyPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]); 
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ----------------------------------------------------
  // 1. Google 로그인 설정 (ClientID 입력 필요)
  // ----------------------------------------------------
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch((error) => {
          console.error('Google 로그인 실패:', error);
          Alert.alert('오류', 'Google 로그인에 실패했습니다.');
        })
        .finally(() => setLoading(false));
    }
  }, [response]);

  // ----------------------------------------------------
  // 2. Apple 로그인 처리
  // ----------------------------------------------------
  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const provider = new OAuthProvider('apple.com');
        const firebaseCredential = provider.credential({
          idToken: credential.identityToken,
        });
        await signInWithCredential(auth, firebaseCredential);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple 로그인 실패:', e);
        Alert.alert('오류', 'Apple 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 3. Auth 및 Firestore 실시간 동기화
  // ----------------------------------------------------
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
            setFavorites(docSnap.data().favorites || []);
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

  // 익명 로그인
  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (error) {
      console.error('익명 로그인 실패:', error);
      Alert.alert('오류', '로그인 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 회원 탈퇴
  const handleDeleteAccount = () => {
    Alert.alert(
      lang === 'KR' ? '계정 탈퇴' : 'Delete Account',
      lang === 'KR' ? '정말로 탈퇴하시겠습니까? 데이터가 모두 삭제됩니다.' : 'Are you sure?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              try {
                setLoading(true);
                await deleteDoc(doc(db, 'users', user.uid));
                await deleteUser(user);
                Alert.alert('완료', '계정이 삭제되었습니다.');
                setIsLoggedIn(false);
              } catch (error: any) {
                if (error.code === 'auth/requires-recent-login') {
                  Alert.alert('재인증 필요', '로그아웃 후 다시 로그인하여 탈퇴를 진행해 주세요.');
                  await auth.signOut();
                  setIsLoggedIn(false);
                } else {
                  Alert.alert('오류', '계정 삭제 중 문제가 발생했습니다.');
                }
              } finally {
                setLoading(false);
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
        
        {/* 언어 선택 토글 */}
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
                ? `${auth.currentUser?.email || auth.currentUser?.displayName || '사용자'} 님 환영합니다! 🇩🇪` 
                : '로그인이 필요합니다.'}
            </Text>
          </View>

          {/* 로그인 버튼 영역 */}
          <View style={styles.loginContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#FF4757" style={{ marginVertical: 20 }} />
            ) : !isLoggedIn ? (
              <>
                {/* 1. Google 로그인 */}
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={() => promptAsync()}
                  disabled={!request}
                >
                  <Text style={styles.googleButtonText}>🌐 Google 계정으로 로그인</Text>
                </TouchableOpacity>

                {/* 2. Apple 로그인 (iOS 전용) */}
                {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={8}
                    style={styles.appleButton}
                    onPress={handleAppleLogin}
                  />
                )}

                {/* 3. 익명 로그인 */}
                <TouchableOpacity
                  style={[styles.socialButton, styles.anonymousButton]}
                  onPress={handleAnonymousLogin}
                >
                  <Text style={styles.anonymousButtonText}>👤 둘러보기 (익명 로그인)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.socialButton, styles.logoutButton]}
                onPress={() => {
                  auth.signOut();
                  setIsLoggedIn(false);
                }}
              >
                <Text style={styles.logoutButtonText}>로그아웃</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 찜한 상품 목록 */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {lang === 'KR' ? '⭐ 내가 찜한 최저가 상품' : '⭐ Favorites'}
            </Text>
            {!isLoggedIn ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>로그인 후 찜한 상품을 확인할 수 있어요.</Text>
              </View>
            ) : favorites.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>아직 찜한 상품이 없어요!</Text>
              </View>
            ) : (
              favorites.map((item, index) => {
                const name = typeof item === 'string' ? item : item?.name || '상품';
                const price = typeof item === 'object' ? item?.price : null;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemCard}
                    onPress={() => router.push({ pathname: '/(tabs)/compare', params: { search: name } })}
                  >
                    <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                    {price && <Text style={styles.itemPrice}>{price} €</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* 내가 쓴 글 목록 */}
          <View style={[styles.sectionContainer, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>
              {lang === 'KR' ? '📝 내가 쓴 커뮤니티 글' : '📝 My Posts'}
            </Text>
            {!isLoggedIn ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>로그인 후 작성한 글을 확인할 수 있어요.</Text>
              </View>
            ) : myPosts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>아직 작성한 글이 없어요!</Text>
              </View>
            ) : (
              myPosts.map((post) => (
                <View key={post.id} style={styles.itemCard}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{post.title}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
                      {post.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* 개인정보처리방침 및 탈퇴 */}
          <View style={styles.footerLinksContainer}>
            <TouchableOpacity onPress={() => Linking.openURL('https://your-privacy-policy-link.com')}>
              <Text style={styles.footerLinkText}>개인정보처리방침</Text>
            </TouchableOpacity>

            {isLoggedIn && (
              <TouchableOpacity onPress={handleDeleteAccount} style={{ marginTop: 12 }}>
                <Text style={[styles.footerLinkText, { color: '#EF4444' }]}>회원 탈퇴 (계정 삭제)</Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4, alignItems: 'flex-end' },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { fontWeight: 'bold', color: '#FF4757' },
  content: { padding: 20, paddingBottom: 30 },
  profileContainer: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  loginContainer: { marginBottom: 24, gap: 10 },
  socialButton: { padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' },
  googleButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  appleButton: { width: '100%', height: 48 },
  anonymousButton: { backgroundColor: '#4B5563' },
  anonymousButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  logoutButton: { backgroundColor: '#EF4444' },
  logoutButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  sectionContainer: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  emptyBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  itemCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  itemName: { fontSize: 14, color: '#374151', fontWeight: '500' },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  footerLinksContainer: { marginTop: 30, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20 },
  footerLinkText: { fontSize: 13, color: '#6B7280', textDecorationLine: 'underline' }
});