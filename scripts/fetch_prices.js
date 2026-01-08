// scripts/fetch_prices.js
const admin = require("firebase-admin");
const FirecrawlApp = require("@mendable/firecrawl-js");

// GitHub Secrets에서 가져올 정보들
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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

  for (const mart of marts) {
    try {
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

      if (extractResult.success) {
        const dataWithMart = extractResult.data.products.map(p => ({
          ...p,
          mart: mart.name,
          updatedAt: new Date().toISOString()
        }));
        results.push(...dataWithMart);
      }
    } catch (e) { console.error(`${mart.name} 에러:`, e); }
  }

  await db.collection("prices").doc("latest").set({ data: results });
  console.log("✅ 데이터 업데이트 완료!");
}

updatePrices();