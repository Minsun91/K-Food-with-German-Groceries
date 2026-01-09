const admin = require("firebase-admin");
const { default: FirecrawlApp } = require("@mendable/firecrawl-js");

const saData = process.env.VITE_FIREBASE_SERVICE_ACCOUNT;
const FIRECRAWL_API_KEY = process.env.VITE_FIRECRAWL_API_KEY;

if (!saData) throw new Error("FIREBASE_SERVICE_ACCOUNT 없음");

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(saData))
    });
  }
} catch (e) {
  console.error("Firebase 초기화 에러:", e);
}

const db = admin.firestore();
const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

const marts = [
  { name: "한독몰", url: "https://handokmall.de/search?q=" },
  { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  { name: "다와요", url: "https://dawayo.de/ko/search?controller=search&s=" },
  { name: "REWE", url: "https://www.rewe.de/suche/uebersicht?searchTerm=" },
  { name: "Knuspr", url: "https://www.knuspr.de/suche?q=" },
  { name: "EDEKA24", url: "https://www.edeka24.de/#search:query=" }
];

const targetItems = [
  { ko: "쌀", search: "Reis 10kg" },
  { ko: "신라면", search: "Shin Ramyun" },
  { ko: "불닭볶음면", search: "Buldak" },
  { ko: "비비고 만두", search: "Bibigo Mandu" },
  { ko: "김치", search: "Kimchi" },
  { ko: "간장", search: "Sojasauce" },
  { ko: "쌈장", search: "Ssamjang" },
  { ko: "고추장", search: "Gochujang" },
  { ko: "두부", search: "Tofu" }
];

async function updatePrices() {
  let results = [];
  console.log("🚀 마트별 검색 및 스크래핑 시작...");

  for (const itemObj of targetItems) {
    console.log(`\n--- [품목: ${itemObj.ko}] 비교 데이터 수집 ---`);

    for (const mart of marts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}`;
        
        const extractResult = await app.extract({
          urls: [searchUrl],
          prompt: `${itemObj.search} 상품 1개만 골라줘. 
                   1. 이름에서 따옴표 제거. 
                   2. 가격은 숫자만(예: 5.99). 
                   3. 링크는 https://로 시작하는 전체 URL.`,
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
                  },
                  required: ["item", "price", "link"]
                }
              }
            }
          }
        });

        if (extractResult.success && extractResult.data?.products?.length > 0) {
          const product = extractResult.data.products[0];
          results.push({
            ...product,
            mart: mart.name,
            // 🔥 여기서 searchKeyword를 '한글'로 저장해야 프론트에서 '# 신라면'으로 묶입니다!
            searchKeyword: itemObj.ko, 
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error(`❌ ${mart.name} 에러:`, e.message);
      }
    }
  }

if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString()
    });
    console.log("\n✨ 모든 마트 비교 데이터 업데이트 완료!");
  }
}

updatePrices(); 