const admin = require("firebase-admin");
// const { default: FirecrawlApp } = require("@mendable/firecrawl-js");
const FirecrawlApp = require("@mendable/firecrawl-js").default || require("@mendable/firecrawl-js");
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
  { ko: "진라면", search: "Jin Ramyun" },
  { ko: "불닭볶음면", search: "Samyang Buldak" },
  { ko: "비비고 김치", search: "Bibigo Kimchi" },
  { ko: "종가집 김치", search: "Jongga Kimchi" },
  { ko: "비비고 만두", search: "Bibigo Mandu" },
  { ko: "고추장", search: "Gochujang 500g" },
  { ko: "쌈장", search: "Ssamjang 500g" },
  { ko: "간장", search: "Sojasauce" },
  { ko: "두부", search: "Tofu" },
  { ko: "참기름", search: "Sesamöl" }
];

async function updatePrices() {
  let results = [];
  console.log("🚀 최신 SDK 모드 가동: scrapePage 시작");

  for (const itemObj of targetItems) {
    console.log(`\n🔎 [${itemObj.ko}] 검색 중...`);

    for (const mart of marts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}`;
        
        // ✅ 최신 SDK 전용 함수와 옵션
        const scrapeResult = await app.scrapePage(searchUrl, {
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

        // ✅ 최신 SDK는 결과값이 .json 안에 들어있습니다.
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

          if (cleanProducts.length > 0) {
            cleanProducts.sort((a, b) => {
                const getP = (val) => parseFloat(String(val).replace(/[^\d.,]/g, '').replace(',', '.'));
                return getP(a.price) - getP(b.price);
            });
            
            const bestOne = cleanProducts[0];
            results.push({
              ...bestOne,
              mart: mart.name,
              searchKeyword: itemObj.ko, 
              updatedAt: new Date().toISOString()
            });
            console.log(`✅ ${mart.name}: [${bestOne.item}] 추출 성공`);
          }
        }
      } catch (e) {
        console.error(`❌ ${mart.name} 에러:`, e.message);
      }
    }
  }

  // 데이터 저장
  if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString()
    });
    console.log(`\n✨ 모든 업데이트 완료! 총 ${results.length}개의 데이터를 저장했습니다.`);
  }
}

updatePrices();