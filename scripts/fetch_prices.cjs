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
  { name: "코켓", url: "https://kocket.de/search?options%5Bprefix%5D=last&q=" },
  { name: "K-Shop", url: "https://k-shop.eu/search?q=" },
  { name: "Joybuy", url: "https://www.joybuy.de/s?k=" },
  { name: "GoAsia", url: "https://goasia.net/en/suche?controller=search&s=" }
];



const targetItems = [
   { ko: " 진라면 순한맛", search: "Ottogi Jin Ramen Mild", brand: "Ottogi" },
  { ko: "종가집 김치", search: "Jongga Mat Kimchi", brand: "Jongga" },
  { ko: "불닭볶음면", search: "Samyang Buldak Original", brand: "Samyang" },
  { ko: "짜파게티", search: "Nongshim Chapagetti" , brand : "Nongshim"},
  { ko: "CJ 햇반", search: "CJ Hetbahn", brand: "CJ" },
  { ko: "조선미녀 선크림", search: "Beauty of Joseon Sunscreen"},
  { ko: "맥심 모카골드", search: "Maxim Mocha Gold Mix", brand: "Maxim" },
  { ko: "김포쌀", search: "Gimpo Rice 9.07kg", brand: "Gimpo" }
];


async function updatePrices() {
  let newResults = [];
  let existingData = [];

  try {
    const doc = await db.collection("prices").doc("latest").get();
    if (doc.exists) existingData = doc.data().data || [];
  } catch (e) {
    console.log("기존 데이터 로드 실패(정상일 수 있음)");
  }

  // 1. 크롤링 시작 (for...of 사용으로 스코프 안정화)
  for (const itemObj of targetItems) {
    const seenStorePacksInThisLoop = new Set();

    for (const mart of marts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}`;
        console.log(`🚀 [${mart.name}] 분석 중: ${itemObj.ko}`);

        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["extract"],
          extract: {
            prompt: `You are a strict e-commerce data extractor for "${itemObj.search}".
- TASK: From the search results, extract exactly ONE 'single' pack and ONE 'multi' (bundle) pack that matches the "Original/Classic" version.
- SELECTION PRIORITY: 
    1. Prioritize the plain, classic, or original product version.
    2. Identify if the product is 'single' or 'multi' (e.g., bundle of 5, pack of 4).
- NEGATIVE CONSTRAINTS (CRITICAL):
    1. IGNORE flavor variants (e.g., Tomyum, Toomba, Black, Red, Kimchi, Spicy).
    2. IGNORE ingredient variants (e.g., Brown Rice, Black Rice, Multi-grain, Germinated).
    3. IGNORE irrelevant items: If searching for '${itemObj.search}', do not return other brands or unrelated items.
- OUTPUT: Return a list of products that are 100% relevant. If unsure, return an empty list.`,
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
                    required: ["product_name", "price", "type", "pack_size"]
                  }
                }
              }
            }
          }
        });

        if (scrapeResult.success && scrapeResult.extract?.products) {
          // for...of를 사용하여 변수 스코프 문제 원천 차단
          for (const product of scrapeResult.extract.products) {
            
            // 필터링
            const isVariant = /현미|흑미|잡곡|발아|Broken|Sushi|Tomyum|Toomba|포기|총각|열무|갓김치|Pa-Kimchi/i.test(product.product_name);
            if (isVariant) continue;
            
            if (itemObj.brand && !product.product_name.toLowerCase().includes(itemObj.brand.toLowerCase())) {
              continue;
            }

            const storePackKey = `${mart.name}-${product.type}`;
            if (seenStorePacksInThisLoop.has(storePackKey)) continue;

            newResults.push({
              item: product.product_name,
                  price: product.price.toFixed(2),
                  packType: product.type,
                  packSize: product.pack_size || "1ea",
                  mart: mart.name,
                  link: searchUrl, // 👈 링크 복구했습니다!
                  searchKeyword: itemObj.ko,
                  category: `${itemObj.ko} (${product.type === 'multi' ? '번들' : '싱글'})`,
                  updatedAt: new Date().toISOString()
                });

            seenStorePacksInThisLoop.add(storePackKey);
          }
        }
      } catch (e) {
        console.error(`❌ 에러: ${e.message}`);
      }
    }
  }

  // 2. 데이터 병합 (newResults 사용)
  const finalData = [
    ...existingData.filter(old => !newResults.some(n => n.mart === old.mart && n.searchKeyword === old.searchKeyword && n.packType === old.packType)),
    ...newResults.map(newItem => {
      const oldItem = existingData.find(o => o.mart === newItem.mart && o.searchKeyword === newItem.searchKeyword && o.packType === newItem.packType);
      if (oldItem) newItem.prevPrice = oldItem.price;
      return newItem;
    })
  ];

  // 3. 저장
  await db.collection("prices").doc("latest").set({
    data: finalData,
    lastGlobalUpdate: new Date().toISOString()
  });
  console.log(`✨ 저장 완료! 총 ${finalData.length}개.`);
}

updatePrices();