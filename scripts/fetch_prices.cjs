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
  // { ko: "쌀", search: "Reis" },
  { ko: "두부", search: "Tofu" },
  { ko: "참기름", search: "Sesamöl" }
];

async function updatePrices() {
  let results = [];
  console.log("🚀 비용 절감 모드 가동: scrapeUrl 기반 크롤링 시작");

  for (const itemObj of targetItems) {
    console.log(`\n🔎 [${itemObj.ko}] 검색 중...`);

    for (const mart of marts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}`;
        
        // 💡 app.extract 대신 app.scrapeUrl 사용 (크레딧 대폭 절약)
        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["json"], 
          jsonOptions: {
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
          }
        });

        // ✅ scrapeResult 변수명 확인
        if (scrapeResult.success && scrapeResult.json?.products) {
          const cleanProducts = scrapeResult.json.products.filter(p => {
            const isBasicValid = p.item && p.item.trim() !== "" && p.price && p.price !== "0";
            
            const lowerItem = p.item.toLowerCase();
            const lowerKo = itemObj.ko.toLowerCase();
            const lowerSearch = itemObj.search.toLowerCase().split(' ')[0];
            
            const isRelevant = lowerItem.includes(lowerKo) || lowerItem.includes(lowerSearch);
            const isBlacklisted = ['젤리', '젤루조아', '육수', 'ice cream', 'eis'].some(word => lowerItem.includes(word));
            
            return isBasicValid && isRelevant && !isBlacklisted; 
          });

          // 마트별 최저가 1개만 추출
          if (cleanProducts.length > 0) {
            cleanProducts.sort((a, b) => parseFloat(String(a.price).replace(',', '.')) - parseFloat(String(b.price).replace(',', '.')));
            const bestOne = cleanProducts[0];
            
            results.push({
              ...bestOne,
              mart: mart.name,
              searchKeyword: itemObj.ko, 
              updatedAt: new Date().toISOString()
            });
            console.log(`✅ ${mart.name}: ${bestOne.item} (${bestOne.price}€)`);
          }
        }
      } catch (e) {
        console.error(`❌ ${mart.name} 에러:`, e.message);
      }
    }
  }

  // Firestore 저장 로직
  if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString()
    });
    console.log(`\n✨ 업데이트 완료! 남은 크레딧을 아꼈습니다.`);
  }
}

updatePrices();