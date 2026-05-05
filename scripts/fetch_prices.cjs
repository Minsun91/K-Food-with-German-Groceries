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
  // { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
  // { name: "코켓", url: "https://kocket.de/search?options%5Bprefix%5D=last&q=" },
  // { name: "K-Shop", url: "https://k-shop.eu/search?q=" },
  { name: "Joybuy", url: "https://www.joybuy.de/s?k=" },
  // { name: "GoAsia", url: "https://goasia.net/en/suche?controller=search&s=" },
  { name: "momogo", url: "https://www.momogo.de/search?q=" } // keywords 대신 q 사용 확인 필요
];



const targetItems = [
  // --- 기존 리스트 ---
  { ko: "진라면 순한맛", search: "Ottogi Jin Ramen Mild", brand: "Ottogi" },
  { ko: "종가집 김치", search: "Jongga Mat Kimchi", brand: "Jongga" },
  { ko: "불닭볶음면", search: "Samyang Buldak Original", brand: "Samyang" },
  { ko: "짜파게티", search: "Nongshim Chapagetti", brand: "Nongshim" },
  { ko: "CJ 햇반", search: "CJ Hetbahn", brand: "CJ" },
  { ko: "조선미녀 선크림", search: "Beauty of Joseon Sunscreen", brand: "Beauty of Joseon" },
  { ko: "맥심 모카골드", search: "Maxim Mocha Gold Mix", brand: "Maxim" },
  { ko: "김포쌀", search: "Gimpo Rice 9.07kg", brand: "Gimpo" },

  // --- 추가 푸드 (20개) ---
  { ko: "너구리", search: "Nongshim Neoguri", brand: "Nongshim" },
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
  { ko: "종가집 깍두기", search: "Jongga Kkakdugi", brand: "Jongga" },
  { ko: "빙그레 바나나우유", search: "Binggrae Banana Milk", brand: "Binggrae" },
  { ko: "참이슬", search: "Chamisul Soju", brand: "Jinro" },
  { ko: "농심 새우깡", search: "Nongshim Shrimp Crackers", brand: "Nongshim" },
  { ko: "해태 갈아만든 배", search: "Haitai Pear Juice", brand: "Haitai" },
  { ko: "오뚜기 당면", search: "Ottogi Dangmyeon", brand: "Ottogi" },

  // --- 추가 뷰티 (10개) ---
  { ko: "코스알엑스 굿모닝 클렌저", search: "COSRX Low pH Good Morning Gel Cleanser", brand: "COSRX" },
  { ko: "코스알엑스 스네일 에센스", search: "COSRX Advanced Snail 96 Mucin Power Essence", brand: "COSRX" },
  { ko: "이니스프리 그린티 세럼", search: "Innisfree Green Tea Seed Serum", brand: "Innisfree" },
  { ko: "아누아 어성초 토너", search: "Anua Heartleaf 77 Toner", brand: "Anua" },
  { ko: "라운드랩 독도 토너", search: "Round Lab 1025 Dokdo Toner", brand: "Round Lab" },
  { ko: "메디힐 마스크팩", search: "Mediheal Sheet Mask", brand: "Mediheal" },
  { ko: "라네즈 립 마스크", search: "Laneige Lip Sleeping Mask", brand: "Laneige" },
  { ko: "닥터자르트 시카페어", search: "Dr.Jart Cicapair Cream", brand: "Dr.Jart" }
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
            prompt: `You are a precision e-commerce data extractor.
- TARGET ITEM: "${itemObj.search}"
- STRICT FILTER: Extract ONLY the products that directly match the target item.
- EXCLUSION: If the target is "Ramen", ignore dumplings, fried rice, sauce-only, or snacks of the same brand.
- TASK:
    1. Identify the product name and current price.
    2. Determine 'pack_size' (e.g., "120g", "5x120g", "1kg").
    3. Categorize 'type':
        - 'single': Individual pack or bottle.
        - 'multi': Bundles (e.g., 4-pack, 5-pack) or bulk cases.
- DATA QUALITY: Return only the most relevant results (max 2-3 items per store) to avoid noise.`,
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

            const isMulti = product.type === 'multi';
    const displayKeyword = isMulti ? `${itemObj.ko} (번들)` : `${itemObj.ko} (낱개)`;

    newResults.push({
        item: product.product_name,
        price: product.price.toFixed(2),
        packType: product.type,
        packSize: product.pack_size || (isMulti ? "Bundle" : "1ea"),
        mart: mart.name,
        link: searchUrl,
        // searchKeyword를 분리하여 저장해야 나중에 데이터 병합(Merge) 시 
        // 싱글 가격이 멀티 가격을 덮어쓰지 않습니다.
        searchKeyword: displayKeyword, 
        category: displayKeyword,
        originalItemName: itemObj.ko, // 원본 아이템명 유지용 필드 (선택사항)
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
    // 여기서 n.searchKeyword가 이미 '진라면 (번들)' 식으로 구분되어 있으므로 
    // 자연스럽게 별개의 항목으로 취급되어 병합됩니다.
    ...existingData.filter(old => !newResults.some(n => n.mart === old.mart && n.searchKeyword === old.searchKeyword)),
    ...newResults.map(newItem => {
        const oldItem = existingData.find(o => o.mart === newItem.mart && o.searchKeyword === newItem.searchKeyword);
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