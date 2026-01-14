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
  { name: "한독몰", url: "https://handokmall.de/search?q=" },
  { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  { name: "다와요", url: "https://dawayo.de/?post_type=product&s=" },  
  // { name: "Knuspr", url: "https://www.knuspr.de/suche?q=" }
];

const targetItems = [
  { ko: "신라면", search: "Shin Ramyun" },
  { ko: "불닭볶음면", search: "Buldak" },
  // { ko: "간장", search: "Sojasauce" }
  { ko: "김치", search: "Kimchi" },
  // { ko: "종가집 김치", search: "Jongga Kimchi" },
  // { ko: "비비고 만두", search: "Bibigo Mandu" },
  // { ko: "고추장", search: "Gochujang 500g" },
  // { ko: "두부", search: "Tofu" },
];

async function updatePrices() {
  let results = [];
  console.log("🚀 수집 우선 모드: 일단 다 가져옵니다!");

  for (const itemObj of targetItems) {
    for (const mart of marts) {
      try {
        const query = (mart.name === "다와요" || mart.name === "한독몰") ? itemObj.ko : itemObj.search;
        const searchUrl = `${mart.url}${encodeURIComponent(query)}`;
        
        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 2000 
        });

        if (scrapeResult.success && scrapeResult.markdown) {
          const content = scrapeResult.markdown;
          const lines = content.split('\n');

          lines.forEach(line => {
            // 1. 제외 필터: 단위가격, 취소선, 너무 짧은 줄 제외
            if (line.includes('100 g') || line.includes('1 kg') || line.includes('~~') || line.trim().length < 5) return;

            const priceRegex = /(\d+[,.]\d{2})\s*(€|EUR)/i;
            const match = line.match(priceRegex);

            if (match) {
              const priceNum = parseFloat(match[1].replace(',', '.'));
              
              // 2. 가격 범위 필터: 0.5유로 미만은 봉투나 사소한 것이니 제외
              if (priceNum < 0.5) return;

              const cleanItemName = line.trim().substring(0, 60).replace(/[#*]/g, ''); // 마크다운 기호 제거

              results.push({
                item: cleanItemName,
                price: priceNum.toFixed(2),
                mart: mart.name,
                link: searchUrl,
                searchKeyword: itemObj.ko,
                updatedAt: new Date().toISOString()
              });

              console.log(`📡 [${mart.name}] 데이터 발견: ${cleanItemName} - €${priceNum}`);
            }
          });
        }
      } catch (e) {
        console.error(`❌ ${mart.name} 통신 에러:`, e.message);
      }
    }
  }

  // ✅ 모든 반복문이 끝난 후 최종 저장 (중괄호 위치 확인!)
  if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString(), // 필드명 통일
      status: "manual-check-required"
    });
    console.log(`✨ 총 ${results.length}개의 데이터 저장 완료!`);
  }
}

updatePrices();