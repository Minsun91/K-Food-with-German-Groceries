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
  { name: "Go Asia", url: "https://goasia.net/de/search?sSearch=" },
  { name: "K-Shop", url: "https://k-shop.eu/de/search?sSearch=" }
];

const targetItems = ["쌀 10kg", "신라면 5팩", "불닭볶음면", "비비고 왕교자", "종가집 김치"];

async function updatePrices() {
  let results = [];
  console.log("🚀 스크래핑 시작...");

  for (const mart of marts) {
    console.log(`\n--- ${mart.name} 작업 시작 ---`);
    
    // 너무 많은 요청을 방지하기 위해 상위 5개만 검색
    const itemsToSearch = targetItems.slice(0, 5); 

    for (const item of itemsToSearch) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(item)}`;
        console.log(`[${mart.name}] "${item}" 검색 중...`);

        const extractResult = await app.extract({
          urls: [searchUrl],
          // 프롬프트 보강: 통화 기호 제거 및 숫자 형식 통일 요청
          prompt: `이 검색 결과 페이지에서 '${item}'과 가장 유사한 상품 딱 하나를 찾아줘. 
                   상품 이름, 가격(숫자와 쉼표만, 예: 15.99), 그리고 상세 링크(전체 경로)를 알려줘.`,
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
                  required: ["item", "price"]
                }
              }
            }
          }
        });

        if (extractResult.success && extractResult.data?.products?.length > 0) {
          const products = extractResult.data.products;
          const dataWithMart = products.map(p => ({
            ...p,
            mart: mart.name,
            updatedAt: new Date().toISOString()
          }));
          results.push(...dataWithMart);
          console.log(`✅ ${mart.name} - ${item} 성공!`);
        }
      } catch (e) {
        console.error(`❌ ${mart.name} (${item}) 에러:`, e.message);
      }
    }
  }

  if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString()
    });
    console.log("\n✨ 모든 데이터 업데이트 완료!");
  } else {
    console.log("\n⚠️ 최종 추출된 데이터가 없습니다.");
  }
}

updatePrices(); 