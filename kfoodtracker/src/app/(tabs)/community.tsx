import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase';

export default function CommunityScreen() {
  const router = useRouter();

  const handlePressWrite = () => {
    const currentUser = auth.currentUser;

    // 로그인이 안 되어 있거나 익명 로그인 상태인 경우
    if (!currentUser || currentUser.isAnonymous) {
      Alert.alert(
        '로그인 필요',
        '커뮤니티 글쓰기는 회원 로그인 후 이용할 수 있습니다.\n정식 회원가입 (구글) 및 로그인을 해주세요!',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '마이페이지로 이동', 
            onPress: () => {
              router.push('/(tabs)/mypage_anno');
            } 
          }
        ]
      );
      return;
    }

    // 정식 회원이면 글쓰기 페이지로 이동
    router.push('/write-post' as any);
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 커뮤니티</Text>
        <TouchableOpacity style={styles.writeBtn} onPress={handlePressWrite}>
          <Text style={styles.writeBtnText}>글쓰기</Text>
        </TouchableOpacity>
      </View>
      {/* 커뮤니티 글 목록 코드가 들어가는 자리 */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  writeBtn: { backgroundColor: '#FF4757', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  writeBtnText: { color: '#fff', fontWeight: 'bold' },
});