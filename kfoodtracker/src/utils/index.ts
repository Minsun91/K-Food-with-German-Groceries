const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 🌐 언어별 푸시 메시지 템플릿
const PUSH_MESSAGES: Record<string, (name: string, price: number) => { title: string; body: string }> = {
  KR: (name: string, price: number) => ({
    title: "🛒 찜한 상품 가격 변동!",
    body: `[${name}]의 가격이 €${price.toFixed(2)}로 변경되었습니다! 📉`,
  }),
  EN: (name: string, price: number) => ({
    title: "🛒 Price Drop Alert!",
    body: `The price for [${name}] has changed to €${price.toFixed(2)}! 📉`,
  }),
  DE: (name: string, price: number) => ({
    title: "🛒 Preisänderung bei Wunschliste!",
    body: `Der Preis für [${name}] wurde auf €${price.toFixed(2)} geändert! 📉`,
  }),
};

// 🔥 Firebase Firestore 트리거: 상품 가격이 변경되었을 때 자동 실행
export const onPriceUpdateSendPush = functions.firestore
  .document("price/latest/{productId}") // 본인의 상품 컬렉션 경로에 맞게 확인 (예: products/{productId})
  .onUpdate(async (change: any, context: any) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // 1. 가격 변경이 없는 경우 바로 종료
    if (!beforeData || !afterData || beforeData.price === afterData.price) {
      return null;
    }

    const productName = afterData.name || afterData.title || "상품";
    const newPrice = Number(afterData.price) || 0;
    const productId = context.params.productId;

    // 2. 전체 유저 목록 조회
    const usersSnapshot = await db.collection("users").get();
    const pushMessages: any[] = [];

    // 3. 찜한 유저 찾기 및 다국어 메시지 생성
    usersSnapshot.forEach((doc: any) => {
      const userData = doc.data();
      const favorites = userData.favorites || [];
      const pushToken = userData.pushToken;

      // 해당 유저가 이 상품을 찜했는지 확인
      const isFavorited = favorites.some((fav: any) => fav.name === productName || fav.id === productId);

      if (pushToken && isFavorited) {
        // 유저 언어 설정 가져오기 (없으면 KR 기본값)
        const userLang = (userData.language && PUSH_MESSAGES[userData.language]) ? userData.language : "KR";
        const msgContent = PUSH_MESSAGES[userLang](productName, newPrice);

        pushMessages.push({
          to: pushToken,
          sound: "default",
          title: msgContent.title,
          body: msgContent.body,
          data: { productId },
        });
      }
    });

    if (pushMessages.length === 0) {
      console.log("알림을 보낼 대상 유저가 없습니다.");
      return null;
    }

    // 4. Expo Push API 서버로 전송
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pushMessages),
      });

      const result = await response.json();
      console.log("푸시 알림 전송 성공:", result);
      return result;
    } catch (error) {
      console.error("푸시 알림 전송 에러:", error);
      return null;
    }
  });