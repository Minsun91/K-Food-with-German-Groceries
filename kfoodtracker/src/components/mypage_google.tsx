import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../firebase';


export default function MyPageScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  // 1. 인증 상태 변화 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(
        '👤 [Auth State Changed] 현재 유저:',
        currentUser?.email || currentUser?.uid || '비로그인'
      );
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
        console.log('🚀 Google Login');
  
      const response = await GoogleSignin.signIn();
  
      console.log('Google Response:', response);
  
      if (response.type !== 'success') {
        console.log('사용자가 로그인 취소');
        return;
      }
  
      const idToken = response.data.idToken;
  
      if (!idToken) {
        Alert.alert('오류', 'Google ID Token을 받지 못했습니다.');
        return;
      }
  
      const credential = GoogleAuthProvider.credential(idToken);
  
      await signInWithCredential(auth, credential);
  
      Alert.alert('환영합니다!', '구글 로그인이 완료되었습니다.');
    } catch (error: any) {
      console.error(error);
  
      Alert.alert(
        '로그인 실패',
        error?.message ?? '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
  
      console.log('🚪 Logout Success');
  
      Alert.alert('로그아웃', '성공적으로 로그아웃되었습니다.');
    } catch (error) {
      console.error(error);
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