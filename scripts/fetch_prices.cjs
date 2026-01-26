const admin = require("firebase-admin");
const Firecrawl = require("@mendable/firecrawl-js");

const FirecrawlApp = Firecrawl.default || Firecrawl;
const saData = process.env.VITE_FIREBASE_SERVICE_ACCOUNT;
const FIRECRAWL_API_KEY = process.env.VITE_FIRECRAWL_API_KEY;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(saData))
  });
}
const db = admin.firestore();
const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
const marts = [
  { name: "한독몰", url: "https://handokmall.de/search?q=" },
  { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  { name: "다와요", url: "https://dawayo.de/?post_type=product&s=" },
  { name: "코켓", url: "https://kocket.de/search?options%5Bprefix%5D=last&q=" },
  { name: "K-Shop", url: "https://k-shop.eu/search?q=" },
  { name: "Joybuy", url: "https://www.joybuy.de/s?k=" }, 
  { name: "아마존", url: "https://www.amazon.de/s?k=", affiliateId: "kfoodtracker-21" }
];

const targetItems = [
  { ko: "신라면", search: "Nongshim Shin Ramyun" },
  { ko: "불닭볶음면", search: "Samyang Buldak Original" },
  { ko: "짜파게티", search: "Nongshim Chapagetti" },
  { ko: "CJ 햇반", search: "CJ Hetbahn" }, 
  { ko: "조선미녀 선크림", search: "Beauty of Joseon Sunscreen" },
  { ko: "맥심 모카골드", search: "Maxim Mocha Gold" }
];

async function updatePrices() {
  let newResults = [];
  
  // 1. ✅ 기존 데이터 가져오기
  let existingData = [];
  try {
    const doc = await db.collection("prices").doc("latest").get();
    if (doc.exists) {
      existingData = doc.data().data || [];
      console.log(`📂 기존 데이터 ${existingData.length}개를 불러왔습니다.`);
    }
  } catch (e) {
    console.log("기존 데이터가 없습니다. 새로 시작합니다.");
  }

  for (const itemObj of targetItems) {
    for (const mart of marts) {
      try {
        // 💡 한국 마트는 한국어로, 현지 마트는 영어로 검색하게 분기!
        const isKoreanMart = ["한독몰", "와이마트", "다와요", "코켓"].includes(mart.name);
        const query = isKoreanMart ? itemObj.ko : itemObj.search; 
        
        const searchUrl = `${mart.url}${encodeURIComponent(query)}`;
        
        console.log(`📡 [${mart.name}] AI 분석 중: ${itemObj.ko}`);

        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["extract"],
          extract: {
            prompt: `Find ONE single unit of ${itemObj.search}. Exclude bundles, cups, and multi-packs. If out of stock, still provide price but name it clearly.`,
            schema: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                price: { type: "number" }
              },
              required: ["product_name", "price"]
            }
          }
        });

        if (scrapeResult.success && scrapeResult.extract) {
          const data = scrapeResult.extract;
          newResults.push({
            item: data.product_name,
            price: data.price.toFixed(2),
            mart: mart.name,
            link: searchUrl,
            searchKeyword: itemObj.ko,
            updatedAt: new Date().toISOString()
          });
          console.log(`✅ [${mart.name}] 발견: ${data.product_name} -> €${data.price}`);
        }
      } catch (e) {
        console.error(`❌ ${mart.name} 에러:`, e.message);
      }
    }
  }

  // 2. ✅ 중복 제거 및 데이터 합치기
  const updatedData = [
    ...existingData.filter(old => {
      const matched = newResults.find(newItem => newItem.searchKeyword === old.searchKeyword && newItem.mart === old.mart);
      if (matched) {
          // 새로 수집된 데이터에 '이전 가격' 정보를 심어줍니다.
          matched.prevPrice = old.price; 
          return false;
      }
      return true;
    }),
    ...newResults
  ];

  // 3. ✅ 최종 저장
  if (updatedData.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: updatedData,
      lastGlobalUpdate: new Date().toISOString(),
      status: "AI-Verified-Cumulative"
    });
    console.log(`✨ 누적 데이터 총 ${updatedData.length}개 저장 완료! (신라면 보존됨)`);
  }
}

updatePrices();