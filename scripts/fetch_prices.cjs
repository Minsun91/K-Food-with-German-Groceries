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
  // { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  { name: "다와요", url: "https://dawayo.de/?post_type=product&s=" },
  // { name: "코켓", url: "https://kocket.de/search?options%5Bprefix%5D=last&q=" },
  // { name: "GoAsia", url: "https://goasia.net/en/suche?controller=search&s=" }
];

const targetItems = [
  { ko: "신라면", search: "Nongshim Shin Ramyun", brand: "Nongshim" },
  { ko: "진라면 매운맛", search: "Ottogi Jin Ramen Hot", brand: "Ottogi" },
  { ko: "진라면 순한맛", search: "Ottogi Jin Ramen Mild", brand: "Ottogi" },
  // { ko: "종가집 김치", search: "Jongga Mat Kimchi", brand: "Jongga" },
  // { ko: "불닭볶음면", search: "Samyang Buldak Original", brand: "Samyang" },
  // { ko: "짜파게티", search: "Nongshim Chapagetti" , brand : "Nongshim"},
  // { ko: "CJ 햇반", search: "CJ Hetbahn", brand: "CJ" },
  // { ko: "맥심 모카골드", search: "Maxim Mocha Gold Mix", brand: "Maxim" },
  // { ko: "김포쌀", search: "Gimpo Rice 9.07kg", brand: "Gimpo" }
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

  // 2. 크롤링 루프 시작
  for (const itemObj of targetItems) {
    // 아이템별로 마트마다 결과를 수집할 때 중복 막기 (싱글1, 번들1)
    const seenStorePacksInThisLoop = new Set(); 

    for (const mart of marts) {
      try {
        const isKoreanMart = ["한독몰", "와이마트", "다와요", "K-Shop"].includes(mart.name);
        const query = isKoreanMart ? itemObj.ko : itemObj.search;
        const searchUrl = `${mart.url}${encodeURIComponent(query)}`;

        console.log(`🚀 [${mart.name}] 분석 시작: ${itemObj.ko}`);

        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["extract"],
          extract: {
            prompt: `Find exactly ONE 'single' pack and ONE 'multi' pack for "${itemObj.search}". 
            STRICTLY IGNORE: variants like Tomyum, Toomba, Black, Brown rice, or other brands. 
            Must match brand: ${itemObj.brand || 'Any'}.`,
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
          scrapeResult.extract.products.forEach(product => {
            // 🛡️ 필터 1: 변종 키워드 제거
            const isVariant = /현미|흑미|잡곡|발아|Broken|Sushi|Tomyum|Toomba|포기|총각|열무|갓김치|Pa-Kimchi/i.test(product.product_name);
            if (isVariant) return;

            // 🛡️ 필터 2: 브랜드 검사
            if (itemObj.brand && !product.product_name.toLowerCase().includes(itemObj.brand.toLowerCase())) {
              return; 
            }

            // 🛡️ 필터 3: 마트별-타입별 중복 제거
            const storePackKey = `${mart.name}-${product.type}`;
            if (seenStorePacksInThisLoop.has(storePackKey)) return;

            newResults.push({
              item: product.product_name,
              price: product.price.toFixed(2),
              packType: product.type,
              packSize: product.pack_size || "1ea",
              mart: mart.name,
              link: searchUrl,
              searchKeyword: itemObj.ko,
              category: `${itemObj.ko} (${product.type === 'multi' ? '번들' : '싱글'})`,
              updatedAt: new Date().toISOString()
            });

            seenStorePacksInThisLoop.add(storePackKey);
            console.log(`✅ [${mart.name}] 통과: ${product.product_name}`);
          });
        }
      } catch (e) {
        console.error(`❌ [${mart.name}] ${itemObj.ko} 에러:`, e.message);
      }
    }
  }

  // 3. 데이터 병합 (newResults 바로 사용)
  const finalData = [
    ...existingData.filter(old => {
      return !newResults.some(newItem => 
        newItem.mart === old.mart && 
        newItem.searchKeyword === old.searchKeyword && 
        newItem.packType === old.packType &&
        newItem.packSize?.replace(/\s+/g, '').toLowerCase() === old.packSize?.replace(/\s+/g, '').toLowerCase()
      );
    }),
    ...newResults.map(newItem => {
      const oldItem = existingData.find(o => 
        o.mart === newItem.mart && 
        o.searchKeyword === newItem.searchKeyword && 
        o.packType === newItem.packType &&
        o.packSize?.replace(/\s+/g, '').toLowerCase() === newItem.packSize?.replace(/\s+/g, '').toLowerCase()
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
      status: "AI-Verified-v4-Clean"
    });
    console.log(`✨ 업데이트 완료! 총 ${finalData.length}개 저장되었습니다.`);
  }
}

updatePrices();