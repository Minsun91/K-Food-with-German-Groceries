import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView, // 💡 아이폰 상단 잘림 방지
} from 'react-native';
import { auth, db } from '../../firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { TRANSLATIONS } from '../../constants/translations'; // 💡 다국어 파일 임포트

export default function MyPageAnno() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR'); // 💡 언어 상태 추가
  const router = useRouter();

  const t = TRANSLATIONS[lang]; // 현재 언어 딕셔너리

  // 유저 로그인 상태 및 찜 목록 실시간 감지
  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setFavorites(userData.favorites || []);
          }
        });
      } else {
        setIsLoggedIn(false);
        setFavorites([]);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
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
        
        {/* 💡 상단 언어 선택 토글 버튼 바 */}
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
                <Text style={styles.emptySubText}>
                  {lang === 'KR' ? '최저가 비교 화면에서 하트를 눌러보세요.' : lang === 'EN' ? 'Tap the heart icon in the price comparison.' : 'Tippen Sie auf das Herzsymbol.'}
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 💡 스타일 예시 (safeArea와 상단 언어 선택 버튼 스타일 추가)
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
    flex: 1,
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
  emptySubText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
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