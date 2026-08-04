import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../../firebase';

WebBrowser.maybeCompleteAuthSession();

export default function MyPageScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // 👈 본인의 Firebase 웹 클라이언트 ID 입력
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  // 인증 상태 변화 감지 콘솔
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('👤 [Auth State Changed] 현재 유저:', currentUser?.email || currentUser?.uid || '비로그인');
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 구글 로그인 응답 결과 추적 콘솔
  useEffect(() => {
    console.log('🔄 [Google Response Updated]', response);

    if (response?.type === 'success') {
      const { id_token } = response.params;
      console.log('🔑 [Google Success] id_token 획득 성공:', id_token ? '존재함' : '없음');

      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        setLoading(true);
        signInWithCredential(auth, credential)
          .then(() => {
            console.log('✅ [Firebase Login Success] 구글 계정 연동 완료');
            Alert.alert('환영합니다!', '구글 로그인이 완료되었습니다.');
          })
          .catch((error) => {
            console.error('❌ [Firebase Login Error] 구글 계정 연동 실패:', error);
            Alert.alert('로그인 실패', '구글 계정 인증 중 문제가 발생했습니다.');
          })
          .finally(() => setLoading(false));
      }
    } else if (response?.type === 'error') {
      console.error('❌ [Google Response Error]', response.error);
    }
  }, [response]);

  const handleGoogleLogin = () => {
    console.log('🚀 [Google Login Triggered] 계정 선택 창 호출 시도');
    promptAsync({
      prompt: 'select_account',
    } as any);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('🚪 [Logout Success]');
      Alert.alert('로그아웃', '성공적으로 로그아웃되었습니다.');
    } catch (error) {
      console.error('❌ [Logout Error]', error);
      Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      {!user || user.isAnonymous ? (
        <View style={styles.authBox}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.authTitle}>로그인이 필요합니다</Text>
          <Text style={styles.authSub}>
            구글 계정으로 간편하게 로그인하고{'\n'}최저가 알림과 커뮤니티 글쓰기를 이용해보세요!
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FF4757" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity
              style={styles.googleBtn}
              disabled={!request}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>🌐</Text>
              <Text style={styles.googleBtnText}>Google 계정으로 시작하기</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 24 }}>👤</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.displayName || 'K-Food 교민 사용자'}</Text>
              <Text style={styles.userEmail}>{user.email || '구글 연동 계정'}</Text>
            </View>
          </View>

          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>❤️ 찜한 최저가 상품 목록</Text>
              <Text style={styles.arrow}>➔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>🔔 최저가 변동 알림 설정</Text>
              <Text style={styles.arrow}>➔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>🌐 서비스 기본 언어 설정</Text>
              <Text style={styles.arrow}>➔</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },

  authBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  authTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  authSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28 },

  googleBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: { fontSize: 18, marginRight: 8 },
  googleBtnText: { color: '#111827', fontWeight: '700', fontSize: 14 },

  profileContainer: { padding: 20 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  userEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  menuGroup: { backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  arrow: { fontSize: 12, color: '#9CA3AF' },

  logoutBtn: { paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#FF4757', fontWeight: '700', fontSize: 13 },
});