const admin = require("firebase-admin");
const Firecrawl = require("@mendable/firecrawl-js");
console.log("SDK Package Keys:", Object.keys(Firecrawl));

// 1. SDK 클래스 안전하게 가져오기
const FirecrawlApp = Firecrawl.default || Firecrawl;

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
let app;

try {
  app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
  console.log("SDK Type Check:", typeof FirecrawlApp);
  app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
  console.log("Available methods on app:", Object.getOwnPropertyNames(Object.getPrototypeOf(app)));

  if (typeof app.scrapeUrl !== 'function') {
    console.log("⚠️ 여전히 scrapePage가 없습니다. 구버전일 확률 100%");
  }


  if (!app || typeof app.scrapeUrl !== 'function') {
    console.log("⚠️ scrapePage 없음, 대체 경로 시도...");
    const AltApp = require("@mendable/firecrawl-js").default || require("@mendable/firecrawl-js");
    app = new AltApp({ apiKey: FIRECRAWL_API_KEY });
  }
} catch (e) {
  console.log("⚠️ 생성 실패, 폴백 실행");
  app = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
}

const marts = [
  // { name: "한독몰", url: "https://handokmall.de/search?q=" },
  // { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  // { name: "다와요", url: "https://dawayo.de/ko/search?controller=search&s=" },
  { name: "REWE", url: "https://www.rewe.de/suche/uebersicht?searchTerm=" },
  { name: "Knuspr", url: "https://www.knuspr.de/suche?q=" },
  { name: "EDEKA24", url: "https://www.edeka24.de/#search:query=" }
];

const targetItems = [
  { ko: "신라면", search: "Shin Ramyun 120g" },
  { ko: "불닭볶음면", search: "Samyang Buldak" },
  // { ko: "비비고 김치", search: "Bibigo Kimchi" },
  // { ko: "종가집 김치", search: "Jongga Kimchi" },
  // { ko: "비비고 만두", search: "Bibigo Mandu" },
  // { ko: "고추장", search: "Gochujang 500g" },
  // { ko: "간장", search: "Sojasauce" },
  // { ko: "두부", search: "Tofu" },
];

async function updatePrices() {
  let results = [];
  console.log("🚀 크롤링 시작: scrapeUrl 모드 가동");

  for (const itemObj of targetItems) {
    console.log(`\n🔎 [${itemObj.ko}] 검색 중...`);

    for (const mart of marts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}`;

        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["extract"],
          extract: {
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
          },
          waitFor: 1000,
          onlyMainContent: true
        });

        if (scrapeResult.success && scrapeResult.json?.products) {
          const cleanProducts = scrapeResult.json.products.filter(p => {
            // 1. 기본 유효성 검사 (이름, 가격 존재 여부)
            const isBasicValid = p.item && p.item.trim() !== "" && p.price && p.price !== "0";
            if (!isBasicValid) return false;

            const lowerItem = p.item.toLowerCase();
            const lowerKo = itemObj.ko.toLowerCase();
            const firstSearchWord = itemObj.search.toLowerCase().split(' ')[0]; // 예: "shin", "samyang"

            // 2. 긍정 필터: 한글명 혹은 영문 핵심 키워드가 포함되어야 함
            const hasKeyword = lowerItem.includes(lowerKo) || lowerItem.includes(firstSearchWord);

            // 3. 부정 필터 (블랙리스트): 관련 없는 상품들 정교하게 차단
            const blacklist = [
              '젤리', '젤루조아', '육수', 'ice cream', 'eis', 'drink', '음료',
              'juice', 'snack', '과자', 'soup base', 'bowl', 'cup'
            ];

            if (itemObj.ko === "비비고 만두" && lowerItem.includes("wrapper")) return false;
            if (itemObj.ko === "고추장" && lowerItem.includes("sauce")) {
            }

            const isBlacklisted = blacklist.some(word => lowerItem.includes(word));

            return hasKeyword && !isBlacklisted;
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

            // ✅ 수정된 부분 1: 데이터를 results에 넣은 직후에 바로 저장!
            await db.collection("prices").doc("latest").set({
              data: results,
              lastGlobalUpdate: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error(`❌ ${mart.name} 에러:`, e.message);
      }
    }
  }

  // ✅ 수정된 부분 2: 모든 작업이 완전히 끝났을 때 최종 확정 로그
  console.log(`\n✨ 모든 업데이트 완료! 총 ${results.length}개의 데이터를 저장했습니다.`);
}

updatePrices();