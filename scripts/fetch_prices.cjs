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
  { ko: "신라면", search: "Shin Ramyun 120g" },
  { ko: "진라면", search: "Jin Ramyun" }, // 추가: 진라면
  { ko: "불닭볶음면", search: "Samyang Buldak" },
  { ko: "비비고 김치", search: "Bibigo Kimchi" }, // 추가: 비비고 김치
  { ko: "종가집 김치", search: "Jongga Kimchi" }, // 추가: 종가집 김치
  { ko: "비비고 만두", search: "Bibigo Mandu" },
  { ko: "고추장", search: "Gochujang 500g" },
  { ko: "쌈장", search: "Ssamjang 500g" },
  { ko: "간장", search: "Sojasauce" },
  { ko: "단량 쌀", search: "Sushi Reis 10kg" },
  { ko: "두부", search: "Tofu" },
  { ko: "참기름", search: "Sesamöl" }
  // 밀히라이스(Milchreis)는 삭제되었습니다.
];

async function updatePrices() {
  let results = [];
  console.log("🚀 품목 업데이트 완료: 정밀 크롤링 시작...");

  for (const itemObj of targetItems) {
    console.log(`\n🔎 [${itemObj.ko}] 검색 중...`);

    for (const mart of marts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}`;
        
        const extractResult = await app.extract({
          urls: [searchUrl],
          // 🔥 프롬프트를 아주 구체적인 '검증형'으로 변경
          prompt: `이 페이지는 '${itemObj.search}'를 검색한 결과 페이지야.
                   다음 규칙을 엄격히 지켜서 데이터를 추출해:
                   1. 상품 이름(item)에 반드시 '${itemObj.ko}' 또는 '${itemObj.search.split(' ')[0]}' 관련 단어가 포함된 것만 골라.
                   2. 젤리, 육수, 아이스크림 등 관련 없는 상품은 절대 포함하지 마.
                   3. 검색 결과 중 가장 관련성이 높은 실제 상품 1~2개만 추출해.
                   4. 이름에서 따옴표 제거, 가격은 숫자만, 링크는 전체 URL 유지.`,
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
        
        if (extractResult.success && extractResult.data?.products) {
          extractResult.data.products.forEach(product => {
            if (product.price && product.price !== "0") {
              results.push({
                ...product,
                mart: mart.name,
                // 프론트엔드에서 "# 종가집 김치" 등으로 그룹화될 기준 키워드
                searchKeyword: itemObj.ko, 
                updatedAt: new Date().toISOString()
              });
            }
          });
          console.log(`✅ ${mart.name}: ${extractResult.data.products.length}건 완료`);
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
    console.log(`\n✨ 총 ${results.length}개의 데이터가 업데이트되었습니다!`);
  }
}

updatePrices();