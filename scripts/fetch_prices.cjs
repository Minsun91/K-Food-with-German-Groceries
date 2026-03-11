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
  { name: "GoAsia", url: "https://goasia.net/en/suche?controller=search&s=" }
];

const targetItems = [
  { ko: "신라면", search: "Nongshim Shin Ramyun" },
  { ko: "불닭볶음면", search: "Samyang Buldak Original" },
  { ko: "짜파게티", search: "Nongshim Chapagetti" },
  { ko: "종가집 김치", search: "Jongga Mat Kimchi" },
  { ko: "진간장", search: "Sempio Soy Sauce" },
  { ko: "비비고 두부(부침용)", search: "Bibigo Tofu" },
  { ko: "CJ 햇반", search: "CJ Hetbahn" },
  { ko: "조선미녀 선크림", search: "Beauty of Joseon Sunscreen" },
  { ko: "맥심 모카골드", search: "Maxim Mocha Gold" }
];

async function updatePrices() {
  let newResults = [];
  let existingData = [];

  // 1. 기존 데이터 로드
  try {
    const doc = await db.collection("prices").doc("latest").get();
    if (doc.exists) existingData = doc.data().data || [];
    console.log(`📂 기존 데이터 ${existingData.length}개 로드 완료.`);
  } catch (e) {
    console.log("기존 데이터가 없거나 로드에 실패했습니다.");
  }

  // 2. 크롤링 루프
  for (const itemObj of targetItems) {
    for (const mart of marts) {
      try {
        const isKoreanMart = ["한독몰", "와이마트", "다와요", "K-Shop"].includes(mart.name);
        const query = isKoreanMart ? itemObj.ko : itemObj.search;
        const searchUrl = `${mart.url}${encodeURIComponent(query)}`;

        console.log(`📡 [${mart.name}] 분석 시작: ${itemObj.ko}`);

        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["extract"],
          extract: {
            prompt: `Find matching products for "${itemObj.search}". 
                     Classify each as 'single' (1 unit) or 'multi' (bundle/pack of 4, 5, etc).
                     Focus on the most relevant results.`,
            schema: {
              type: "object",
              properties: {
                products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      product_name: { type: "string" },
                      price: { type: "number" },
                      type: { type: "string", enum: ["single", "multi"] },
                      pack_size: { type: "string" }
                    },
                    required: ["product_name", "price", "type"]
                  }
                }
              }
            }
          }
        });

        if (scrapeResult.success && scrapeResult.extract?.products) {
          scrapeResult.extract.products.forEach(product => {
            newResults.push({
              item: product.product_name,
              price: product.price.toFixed(2),
              packType: product.type,
              packSize: product.pack_size || "1ea",
              mart: mart.name,
              link: searchUrl,
              searchKeyword: itemObj.ko,
              updatedAt: new Date().toISOString()
            });
            console.log(`✅ [${mart.name}] ${product.type}: ${product.product_name} -> €${product.price}`);
          });
        }
      } catch (e) {
        console.error(`❌ [${mart.name}] 에러 발생:`, e.message);
      }
    }
  }

  // 3. 데이터 병합 (중복 제거 및 이전 가격 매칭)
  // 새 결과에 들어있는 '키워드+마트+팩타입' 조합은 기존 데이터에서 지우고 새 것으로 교체
  const filteredExisting = existingData.filter(old => {
    return !newResults.some(newItem => 
      newItem.searchKeyword === old.searchKeyword && 
      newItem.mart === old.mart && 
      newItem.packType === old.packType
    );
  });

  const finalData = [
    ...filteredExisting,
    ...newResults.map(newItem => {
      const oldItem = existingData.find(o => 
        o.searchKeyword === newItem.searchKeyword && 
        o.mart === newItem.mart && 
        o.packType === newItem.packType
      );
      if (oldItem) newItem.prevPrice = oldItem.price;
      return newItem;
    })
  ];

  // 4. Firebase 저장
  if (finalData.length > 0) {
    await db.collection("prices").doc("latest").set({
      data: finalData,
      lastGlobalUpdate: new Date().toISOString(),
      status: "AI-Verified-Cumulative-Multi"
    });
    console.log(`✨ 업데이트 완료! 총 ${finalData.length}개의 데이터를 저장했습니다.`);
  }
}

updatePrices();