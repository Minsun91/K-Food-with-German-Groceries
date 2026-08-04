import { deleteUser } from 'firebase/auth';
import { Linking } from 'react-native';
import { Alert } from 'react-native';
import { auth } from '../../firebase';
// ... 기존 코드 내 ...

// 1. 개인정보처리방침 열기 (Notion 등 웹 링크)
const openPrivacyPolicy = () => {
  Linking.openURL('https://your-notion-or-website-link.com/privacy'); // 본인 링크로 변경
};

// 2. 계정 탈퇴 처리
const handleDeleteAccount = () => {
  Alert.alert(
    '계정 탈퇴',
    '정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: async () => {
          if (auth.currentUser) {
            try {
              await deleteUser(auth.currentUser);
              Alert.alert('완료', '계정이 삭제되었습니다.');
            } catch (error) {
              Alert.alert('오류', '재로그인 후 다시 시도해 주세요.');
            }
          }
        },
      },
    ]
  );
};