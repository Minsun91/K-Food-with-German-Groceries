import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// 앱이 켜져 있을 때 알람 설정 (최신 Expo SDK 규격 반영)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // 💡 최신 타입 규격 대응
    shouldShowList: true,   // 💡 최신 타입 규격 대응
  }),
});

// 1. 푸시 알람 권한 요청 및 토큰 가져오기 (export 추가 완료!)
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4757',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('알림', '푸시 알람 권한이 거부되었습니다!');
      return;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.log('토큰 발급 실패:', e);
    }
  } else {
    console.log('실제 기기(물리 디바이스)에서만 푸시 알람 테스트가 가능합니다.');
  }

  return token;
}

// 2. 즉시 로컬 알람 보내기 테스트 함수
export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { data: 'goes here' },
    },
    trigger: null, // null이면 즉시 발송
  });
}