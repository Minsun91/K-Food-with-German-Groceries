import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../../firebase';

export default function MyPageScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert('로그아웃 실패', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {user ? (
          <View style={styles.profileContainer}>
            <Text style={styles.title}>K-Food Tracker</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👤 내 계정 정보</Text>
              <Text style={styles.infoText}>현재 임시(익명) 상태로 이용 중입니다.</Text>
              <Text style={styles.uidText}>UID: {user.uid}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
              <Text style={styles.buttonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={styles.title}>K-Food Tracker</Text>
            <Text style={styles.subtitle}>독일 한인마트 장보기 도우미</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              <TouchableOpacity style={styles.loginButton} onPress={handleAnonymousSignIn}>
                <Text style={styles.loginButtonText}>앱 시작하기</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  profileContainer: { alignItems: 'center', width: '100%' },
  loginContainer: { alignItems: 'center', width: '100%' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  card: { backgroundColor: '#fff', width: '100%', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  infoText: { fontSize: 14, color: '#555', marginBottom: 5 },
  uidText: { fontSize: 11, color: '#999', marginTop: 5 },
  logoutButton: { backgroundColor: '#ff4d4d', width: '100%', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loginButton: { backgroundColor: '#34A853', width: '100%', padding: 14, borderRadius: 8, alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});