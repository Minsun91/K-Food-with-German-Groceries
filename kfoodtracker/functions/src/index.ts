import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 🌐 언어별 푸시 메시지 템플릿
const getPushContent = (lang: string, productName: string) => {
  switch (lang) {
    case "EN":
      return {
        title: "Price Drop!",
        body: `The price for [${productName}] in your favorites has changed! Check it out in the app.`,
      };
    case "DE":
      return {
        title: "Preis gesenkt!",
        body: `Der Preis für [${productName}] auf Ihrer Wunschliste hat sich geändert! Jetzt in der App prüfen.`,
      };
    case "KR":
    default:
      return {
        title: "가격 할인 알림!",
        body: `찜해둔 [${productName}]의 가격이 변경되었습니다! 앱에서 확인해보세요. `,
      };
  }
};

// ⚙️ 가격 변동 감지 및 알림 발송 공통 핵심 로직
async function processPriceChangePush(event: any, docLabel: string) {
  console.log(`🔔 [트리거 감지] ${docLabel} 문서가 업데이트되었습니다.`);

  if (!event.data) {
    console.log("❌ event.data가 존재하지 않습니다.");
    return;
  }

  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  const beforeList: any[] = beforeData?.data || [];
  const afterList: any[] = afterData?.data || [];

  // 1. 실제 가격이 변경된 상품 추적
  const changedProducts: Array<{ name: string; id?: string }> = [];

  afterList.forEach((afterItem: any) => {
    const productName = String(afterItem.item || afterItem.name || afterItem.title || "").trim();
    const newPrice = Number(afterItem.price);

    const beforeItem = beforeList.find(
      (b: any) =>
        (b.item && afterItem.item && String(b.item).trim() === String(afterItem.item).trim()) ||
        (b.id && afterItem.id && String(b.id) === String(afterItem.id))
    );

    if (beforeItem) {
      const oldPrice = Number(beforeItem.price);
      if (!isNaN(newPrice) && !isNaN(oldPrice) && oldPrice !== newPrice) {
        changedProducts.push({
          name: productName,
          id: afterItem.id ? String(afterItem.id) : undefined,
        });
      }
    }
  });

  console.log(`🔎 [${docLabel}] 변경 감지된 상품 수: ${changedProducts.length}개`);

  if (changedProducts.length === 0) {
    console.log(`⚠️ [${docLabel}] 실제 가격이 변동된 상품이 없습니다.`);
    return;
  }

  // 2. 가입 유저 목록 전체 조회
  const usersSnapshot = await db.collection("users").get();
  const pushMessages: Array<{
    to: string;
    sound: string;
    title: string;
    body: string;
    data: { productName: string };
  }> = [];

  // 3. 유저별 찜 목록 매칭
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    const favorites: Array<any> = userData.favorites || [];
    const pushToken: string | undefined = userData.pushToken;

    if (!pushToken) return;

    const matchedProducts = changedProducts.filter((prod) =>
      favorites.some((fav) => {
        const favName = String(fav.item || fav.name || "").trim().toLowerCase();
        const prodName = String(prod.name || "").trim().toLowerCase();

        const isNameMatched = favName !== "" && prodName !== "" && favName === prodName;
        const isIdMatched = fav.id && prod.id && String(fav.id) === String(prod.id);

        return isNameMatched || isIdMatched;
      })
    );

    if (matchedProducts.length > 0) {
      const userLang = userData.language || "KR";
      const productName = matchedProducts[0].name || "찜한 상품";
      const msgContent = getPushContent(userLang, productName);

      console.log(`🎯 [매칭 성공] 유저(${doc.id}) -> 상품명: ${productName}`);

      pushMessages.push({
        to: pushToken,
        sound: "default",
        title: msgContent.title,
        body: msgContent.body,
        data: { productName: productName },
      });
    }
  });

  console.log(`📱 [${docLabel}] 발송할 푸시 메시지 수: ${pushMessages.length}개`);

  if (pushMessages.length === 0) {
    console.log(`⚠️ [${docLabel}] 변동된 상품을 찜한 유저가 없거나 푸시 토큰이 없습니다.`);
    return;
  }

  // 4. Expo Push API 전송
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
    console.log(`✅ [${docLabel}] 푸시 알림 전송 성공 결과:`, JSON.stringify(result));
  } catch (error) {
    console.error(`❌ [${docLabel}] 푸시 알림 전송 에러:`, error);
  }
}

// 🔥 1. 식품 가격 변동 감지 트리거
export const onPriceUpdateSendPush = onDocumentUpdated(
  "prices/latest",
  async (event) => {
    await processPriceChangePush(event, "prices/latest");
  }
);

// 🔥 2. 뷰티 가격 변동 감지 트리거
export const onBeautyPriceUpdateSendPush = onDocumentUpdated(
  "beauty_prices/latest",
  async (event) => {
    await processPriceChangePush(event, "beauty_prices/latest");
  }
);