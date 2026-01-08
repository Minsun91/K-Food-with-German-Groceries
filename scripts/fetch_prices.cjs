const admin = require("firebase-admin");
const FirecrawlApp = require("@mendable/firecrawl-js");

// 1. 환경 변수 확인 (GitHub Actions의 env 설정과 일치해야 함)
const saData = process.env.FIREBASE_SERVICE_ACCOUNT;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!saData) {
  throw new Error("에러: FIREBASE_SERVICE_ACCOUNT 환경 변수가 없습니다.");
}

// 2. Firebase Admin 초기화 (중복 호출 방지)
try {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(saData))
  });
  console.log("Firebase Admin 초기화 성공");
} catch (error) {
  console.error("Firebase 초기화 에러:", error);
  process.exit(1);
}

const db = admin.firestore();
const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

async function updatePrices() {
  const marts = [
    { name: "한독몰", url: "https://handokmall.de" },
    { name: "와이마트", url: "https://www.y-mart.de" },
    { name: "다와요", url: "https://dawayo.de" }
  ];

  const targetItems = ["김포쌀 9.07kg", "종가집 포기김치 1kg", "신라면 번들"];
  let results = [];

  console.log("스크래핑 시작...");

  for (const mart of marts) {
    try {
      console.log(`${mart.name} 데이터 추출 중...`);
      const extractResult = await app.extract([mart.url], {
        prompt: `${targetItems.join(", ")} 상품들의 현재 가격과 해당 상품 상세페이지 URL을 찾아줘.`,
        schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  price: { type: "string" },
                  link: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extractResult.success && extractResult.data.products) {
        const dataWithMart = extractResult.data.products.map(p => ({
          ...p,
          mart: mart.name,
          updatedAt: new Date().toISOString()
        }));
        results.push(...dataWithMart);
        console.log(`${mart.name} 완료: ${dataWithMart.length}개 상품`);
      }
    } catch (e) { 
      console.error(`${mart.name} 에러 발생:`, e.message); 
    }
  }

  // Firestore 저장
  if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString()
    });
    console.log("✅ Firestore 데이터 업데이트 완료!");
  } else {
    console.log("❌ 추출된 데이터가 없어 업데이트를 건너뜁니다.");
  }
}

// 스크립트 실행
updatePrices().catch(err => {
  console.error("치명적 오류:", err);
  process.exit(1);
});