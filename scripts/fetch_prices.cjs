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
  // { name: "Joybuy", url: "https://www.joybuy.de/s?k=" },
  { name: "GoAsia", url: "https://goasia.net/en/suche?controller=search&s=" },
  // { name: "momogo", url: "https://www.momogo.de/search?q=",suffix: "&lang=en" }
];

const beautyMarts = [
  { name: "Stylevana", url: "https://www.stylevana.com/de_DE/catalogsearch/result/?q=" },
  { name: "Douglas", url: "https://www.douglas.de/de/search?q=" },
  { name: "Flaconi", url: "https://www.flaconi.de/search/?q=" }
];

const targetItems = [
  // { ko: "진라면 순한맛", search: "Ottogi Jin Ramen Mild", brand: "Ottogi" },
  // { ko: "종가집 김치", search: "Jongga Mat Kimchi", brand: "Jongga" },
  // { ko: "불닭볶음면", search: "Samyang Buldak Original", brand: "Samyang" },
  // { ko: "짜파게티", search: "Nongshim Chapagetti", brand: "Nongshim" },
  // { ko: "CJ 햇반", search: "CJ Hetbahn", brand: "CJ" },
  // { ko: "조선미녀 선크림", search: "Beauty of Joseon Sunscreen", brand: "Beauty of Joseon" },
  // { ko: "맥심 모카골드", search: "Maxim Mocha Gold Mix", brand: "Maxim" },
  // { ko: "김포쌀", search: "Gimpo Rice 9.07kg", brand: "Gimpo" },
  { ko: "너구리 라면", search: "Nongshim Neoguri", brand: "Nongshim" },
  { ko: "신라면", search: "Nongshim Shin Ramyun", brand: "Nongshim" },
  { ko: "안성탕면", search: "Nongshim Ansungtangmyun", brand: "Nongshim" },
  { ko: "팔도 비빔면", search: "Paldo Bibimmyeon", brand: "Paldo" },
  { ko: "샘표 진간장", search: "Sempio Soy Sauce", brand: "Sempio" },
  { ko: "청정원 고추장", search: "Chung Jung One Gochujang", brand: "Chung Jung One" },
  { ko: "CJ 쌈장", search: "CJ Ssamjang", brand: "CJ" },
  { ko: "비비고 왕교자", search: "Bibigo Wangkyoza", brand: "Bibigo" },
  { ko: "백설 참기름", search: "Beksul Sesame Oil", brand: "Beksul" },
  { ko: "광천김", search: "Kwangcheon Kim Seaweed", brand: "Kwangcheon" },
  { ko: "동원 참치", search: "Dongwon Tuna", brand: "Dongwon" },
  { ko: "오뚜기 카레", search: "Ottogi Curry", brand: "Ottogi" },
  { ko: "오뚜기 미역", search: "Ottogi Dried Seaweed", brand: "Ottogi" },
  { ko: "참이슬", search: "Chamisul Soju", brand: "Jinro" },
  { ko: "오뚜기 당면", search: "Ottogi Dangmyeon", brand: "Ottogi" },

  { ko: "코스알엑스 스네일 에센스", search: "COSRX Advanced Snail 96 Mucin Power Essence", brand: "COSRX" },
  { ko: "이니스프리 그린티 세럼", search: "Innisfree Green Tea Seed Serum", brand: "Innisfree" },
  { ko: "아누아 어성초 토너", search: "Anua Heartleaf 77 Toner", brand: "Anua" },
  { ko: "라운드랩 독도 토너", search: "Round Lab 1025 Dokdo Toner", brand: "Round Lab" },
  { ko: "라네즈 립 마스크", search: "Laneige Lip Sleeping Mask", brand: "Laneige" },
  { ko: "닥터자르트 시카페어", search: "Dr.Jart Cicapair Cream", brand: "Dr.Jart" },
  { ko: "SKIN1004 마다가스카르 센텔라 앰플", search: "SKIN1004 Madagascar Centella Ampoule", brand: "SKIN1004" },
{ ko: "조선미녀 인삼 아이세럼", search: "Beauty of Joseon Eye Serum", brand: "Beauty of Joseon" }
];


async function updatePrices(mode = "food") {
  const isBeautyMode = mode === "beauty";
  const targetMarts = isBeautyMode ? beautyMarts : marts;
  const collectionName = isBeautyMode ? "beauty_prices" : "prices";

  console.log(`🚀 [${mode.toUpperCase()}] 업데이트 시작...`);

  let newResults = [];
  let existingData = [];

  try {
    const doc = await db.collection(collectionName).doc("latest").get();
    if (doc.exists) existingData = doc.data().data || [];
  } catch (e) {
    console.log(`${mode} 데이터 로드 실패(정상)`);
  }

  // 루프 시작
  for (const itemObj of targetItems) {
    const beautyBrands = ["코스알엑스", "이니스프리", "아누아", "라운드랩", "라네즈", "닥터자르트", "SKIN1004", "조선미녀"];
    const isItemBeauty = beautyBrands.some(brand => itemObj.ko.includes(brand));
    
    if (isBeautyMode && !isItemBeauty) continue;
    if (!isBeautyMode && isItemBeauty) continue;

    const seenStorePacksInThisLoop = new Set();

    for (const mart of targetMarts) {
      try {
        const searchUrl = `${mart.url}${encodeURIComponent(itemObj.search)}${mart.suffix || ""}`;
        console.log(`🔍 [${mart.name}] 분석 중: ${itemObj.ko}`);

        const scrapeResult = await app.scrapeUrl(searchUrl, {
          formats: ["extract"],
          extract: {
            prompt: `You are a precision e-commerce data extractor for a German store.
            - TARGET ITEM: "${itemObj.search}"
            - LANGUAGE: The site is in German. 
                * "Stück" or "Stk" means "pcs" (Single).
                * "Packung" or "Pkg" usually means "Pack".
                * "5er Pack" or "5x120g" means "Bundle" (Multi).
            - TASK: Translate product names and units into English for the output.
            - EXCLUSION: Ignore unrelated variants like "Dumplings" when searching for "Ramen".
            - CATEGORIZE: 
                1. 'single': Individual item.
                2. 'multi': Bundles/multipacks.
            - OUTPUT: Return accurate 'product_name', 'price', 'type', and 'pack_size'.`,
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
          for (const product of scrapeResult.extract.products) {
            const isVariant = /현미|흑미|잡곡|발아|Broken|Sushi|Tomyum|Toomba|포기|총각|열무|갓김치|Pa-Kimchi/i.test(product.product_name);
            if (isVariant) continue;
            
            if (itemObj.brand && !product.product_name.toLowerCase().includes(itemObj.brand.toLowerCase())) continue;

            const storePackKey = `${mart.name}-${product.type}`;
            if (seenStorePacksInThisLoop.has(storePackKey)) continue;

            const isMulti = product.type === 'multi';

            newResults.push({
              item: product.product_name,
              price: product.price.toFixed(2),
              packType: product.type,
              packSize: product.pack_size || (isMulti ? "Bundle" : "1ea"),
              mart: mart.name,
              link: searchUrl,
              searchKeyword: itemObj.ko, 
              category: isBeautyMode ? "beauty" : (isMulti ? `${itemObj.ko} (번들)` : `${itemObj.ko} (낱개)`),
              originalItemName: itemObj.ko,
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

  const finalData = [
    ...existingData.filter(old => !newResults.some(n => n.mart === old.mart && n.category === old.category)),
    ...newResults.map(newItem => {
        const oldItem = existingData.find(o => o.mart === newItem.mart && o.category === newItem.category);
        if (oldItem) newItem.prevPrice = oldItem.price;
        return newItem;
    })
  ];

  await db.collection(collectionName).doc("latest").set({
    data: finalData,
    lastGlobalUpdate: new Date().toISOString()
  });

  console.log(`✨ [${mode.toUpperCase()}] 저장 완료!`);
}

async function start() {
  await updatePrices("food"); 
  await updatePrices("beauty"); 
}

start();