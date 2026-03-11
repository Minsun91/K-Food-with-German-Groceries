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
  // { name: "한독몰", url: "https://handokmall.de/search?q=" },
  { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  { name: "다와요", url: "https://dawayo.de/?post_type=product&s=" },
  { name: "코켓", url: "https://kocket.de/search?options%5Bprefix%5D=last&q=" },
  // { name: "K-Shop", url: "https://k-shop.eu/search?q=" },
  // { name: "Joybuy", url: "https://www.joybuy.de/s?k=" },
  { name: "GoAsia", url: "https://goasia.net/en/suche?controller=search&s=" }
];

const targetItems = [
  { ko: "신라면", search: "Nongshim Shin Ramyun", brand: "Nongshim" },
  { ko: " 진라면 매운맛", search: "Ottogi Jin Ramen Hot", brand: "Ottogi" },
  { ko: " 진라면 순한맛", search: "Ottogi Jin Ramen Mild", brand: "Ottogi" },
  // { ko: "진간장", search: "Sempio Soy Sauce", brand: "Sempio" },
  { ko: "종가집 김치", search: "Jongga Mat Kimchi", brand: "Jongga" },
  { ko: "불닭볶음면", search: "Samyang Buldak Original", brand: "Samyang" },
  { ko: "짜파게티", search: "Nongshim Chapagetti" , brand : "Nongshim"},
  // { ko: "비비고 두부(부침용)", search: "Bibigo Tofu" , brand : "bibigo" },
  { ko: "CJ 햇반", search: "CJ Hetbahn", brand: "CJ" },
  // { ko: "조선미녀 선크림", search: "Beauty of Joseon Sunscreen"},
  { ko: "맥심 모카골드", search: "Maxim Mocha Gold Mix", brand: "Maxim" },
  { ko: "김포쌀", search: "Gimpo Rice 9.07kg", brand: "Gimpo" }
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

      // 브랜드가 있다면 명시적으로 프롬프트에 넣어서 필터링 강제
      const brandRequirement = itemObj.brand 
        ? `MANDATORY: Must be from the brand "${itemObj.brand}". STRICTLY EXCLUDE products from other brands.`
        : `Focus strictly on the classic/original version.`;

      const scrapeResult = await app.scrapeUrl(searchUrl, {
        formats: ["extract"],
        extract: {
          prompt: `You are a strict e-commerce data extractor for "${itemObj.search}".

- TASK: From each store's search results, pick EXACTLY ONE 'single' pack and ONE 'multi' (bundle) pack that matches the "Original/Classic" version.
- SELECTION PRIORITY: 
    1. Always prioritize the plain, classic, or original version.
    2. Identify if the product is 'single' or 'multi' (e.g., bundle of 5, pack of 4).
- NEGATIVE CONSTRAINTS (CRITICAL):
    1. IGNORE flavor variants: No 'Tomyum', 'Toomba', 'Black', 'Red', 'Kimchi', 'Spicy', etc.
    2. IGNORE ingredient variants: No 'Brown Rice', 'Black Rice', 'Multi-grain', 'Germinated', etc.
    3. IGNORE irrelevant items: If searching for 'Maxim', do not return 'Goraebap' or other brands.
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

  // 🚀 2.5 가공 및 필터링 로직 추가 (병합 전 실행)
const processedNewResults = [];
const seenStorePacks = new Set(); 

newResults.forEach(product => {
  // 1. 마트별-타입별 중복 체크 (마트당 싱글1, 번들1)
  const storePackKey = `${product.mart}-${product.packType}`;
  if (seenStorePacks.has(storePackKey)) return;

  // 2. 쌀 & 기타 변종 키워드 필터링 (강력 보강)
  // - Broken|Sushi|Brown: 쌀 변종 방어
  // - Jasmine|Basmati: 동남아/인도 쌀 방어
  const isVariant = /현미|흑미|잡곡|발아|찹쌀|Black|Brown|Multi-grain|Tomyum|Toomba|Red|Goraebap|Broken|Sushi|Jasmine|Basmati/i.test(product.item || product.product_name);
  if (isVariant) return;

  // 3. 브랜드 검증 (선택 사항이지만 강력함)
  // 만약 targetItems에 brand를 정의했다면, 브랜드가 포함 안 된 결과는 버립니다.
  if (itemObj.brand && !product.item.toLowerCase().includes(itemObj.brand.toLowerCase())) {
      return; 
  }

  // 4. 통과된 데이터만 push
  processedNewResults.push({
      ...product,
      category: `${itemObj.ko} (${product.packType === 'multi' ? '번들' : '싱글'})`,
      updatedAt: new Date().toISOString()
  });

  seenStorePacks.add(storePackKey);
});

// 3. 데이터 병합 (중복 제거 및 이전 가격 매칭)
const finalData = [
  ...existingData.filter(old => {
    // 가공된 데이터(processedNewResults)와 비교하여 중복 제거
    return !processedNewResults.some(newItem => 
      newItem.mart === old.mart && 
      newItem.searchKeyword === old.searchKeyword && 
      newItem.packType === old.packType &&
      newItem.packSize?.replace(/\s+/g, '').toLowerCase() === old.packSize?.replace(/\s+/g, '').toLowerCase()
    );
  }),
  ...processedNewResults.map(newItem => { // newResults -> processedNewResults
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
    data: finalData, // 이제 finalData로 통일됨
    lastGlobalUpdate: new Date().toISOString(),
    status: "AI-Verified-Cumulative-Multi-v3"
  });
  console.log(`✨ 업데이트 완료! 총 ${finalData.length}개의 데이터를 저장했습니다.`);
}
}

updatePrices();