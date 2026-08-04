import { Alert } from 'react-native';
import { auth } from '../../firebase';

const handlePressWrite = () => {
  const currentUser = auth.currentUser;

  // 익명 로그인 상태이거나 로그인이 안 되어 있는 경우
  if (!currentUser || currentUser.isAnonymous) {
    Alert.alert(
      '로그인 필요',
      '커뮤니티 글쓰기는 회원 로그인 후 이용할 수 있습니다. 마이페이지에서 로그인해 주세요!',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '마이페이지로 이동', 
          onPress: () => {
            // 라우터 경로에 맞게 수정 (예: router.push('/mypage'))
          } 
        }
      ]
    );
    return;
  }

  // 정식 회원이면 글쓰기 페이지로 이동
  // router.push('/write-post');
};