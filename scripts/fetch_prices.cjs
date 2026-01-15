// const admin = require("firebase-admin");
// const Firecrawl = require("@mendable/firecrawl-js");
// console.log("SDK Package Keys:", Object.keys(Firecrawl));

// // 1. SDK 클래스 안전하게 가져오기
// const FirecrawlApp = Firecrawl.default || Firecrawl;

// const saData = process.env.VITE_FIREBASE_SERVICE_ACCOUNT;
// const FIRECRAWL_API_KEY = process.env.VITE_FIRECRAWL_API_KEY;

// if (!saData) throw new Error("FIREBASE_SERVICE_ACCOUNT 없음");

// try {
//   if (!admin.apps.length) {
//     admin.initializeApp({
//       credential: admin.credential.cert(JSON.parse(saData))
//     });
//   }
// } catch (e) {
//   console.error("Firebase 초기화 에러:", e);
// }

// const db = admin.firestore();
// let app;

// try {
//   app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
//   console.log("SDK Type Check:", typeof FirecrawlApp);
//   app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
//   console.log("Available methods on app:", Object.getOwnPropertyNames(Object.getPrototypeOf(app)));

//   if (typeof app.scrapeUrl !== 'function') {
//     console.log("⚠️ 여전히 scrapePage가 없습니다. 구버전일 확률 100%");
//   }


//   if (!app || typeof app.scrapeUrl !== 'function') {
//     console.log("⚠️ scrapePage 없음, 대체 경로 시도...");
//     const AltApp = require("@mendable/firecrawl-js").default || require("@mendable/firecrawl-js");
//     app = new AltApp({ apiKey: FIRECRAWL_API_KEY });
//   }
// } catch (e) {
//   console.log("⚠️ 생성 실패, 폴백 실행");
//   app = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
// }

// const marts = [
//   { name: "한독몰", url: "https://handokmall.de/search?q=" },
//   { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
//   { name: "다와요", url: "https://dawayo.de/?post_type=product&s=" },  
//   // { name: "Knuspr", url: "https://www.knuspr.de/suche?q=" }
// ];

// const targetItems = [
//   { ko: "신라면", search: "Shin Ramyun" },
//   { ko: "불닭볶음면", search: "Buldak" },
//   // { ko: "간장", search: "Sojasauce" }
//   { ko: "김치", search: "Kimchi" },
//   // { ko: "종가집 김치", search: "Jongga Kimchi" },
//   // { ko: "비비고 만두", search: "Bibigo Mandu" },
//   // { ko: "고추장", search: "Gochujang 500g" },
//   // { ko: "두부", search: "Tofu" },
// ];

// async function updatePrices() {
//   let allResults = []; // 변수명을 확실히 구분합니다.
//   console.log("🚀 수집 및 정밀 필터링 모드 가동");

//   // 차단할 키워드들 (필요에 따라 추가하세요)
//   const blacklist = ["sauce", "소스", "cup", "컵라면", "bowl", "mini", "미니"];

//   for (const itemObj of targetItems) {
//     for (const mart of marts) {
//       try {
//         const query = (mart.name === "다와요" || mart.name === "한독몰") ? itemObj.ko : itemObj.search;
//         const searchUrl = `${mart.url}${encodeURIComponent(query)}`;
        
//         const scrapeResult = await app.scrapeUrl(searchUrl, {
//           formats: ["markdown"],
//           onlyMainContent: true,
//           waitFor: 2000 
//         });

//         if (scrapeResult.success && scrapeResult.markdown) {
//           const content = scrapeResult.markdown;
//           const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
//           lines.forEach((line, index) => {
//             const priceRegex = /(\d+[,.]\d{2})\s*(€|EUR)/i;
//             const match = line.match(priceRegex);

//             if (match) {
//               if (line.includes('100 g') || line.includes('1 kg') || line.includes('~~')) return;

//               const priceNum = parseFloat(match[1].replace(',', '.'));
//               if (priceNum < 0.5) return;

//               let itemName = line.length > 15 ? line : (lines[index - 1] || "Unknown Item");
//               itemName = itemName.replace(/[#*€]|(\d+[,.]\d{2})/g, '').trim();

//               // ❌ 정밀 필터링: 블랙리스트 키워드가 포함되면 제외
//               const lowerName = itemName.toLowerCase();
//               if (blacklist.some(word => lowerName.includes(word))) return;

//               // ✅ 긍정 필터링: 검색어 중 핵심 단어(예: 불닭, Shin)가 포함되어야 함
//               const firstWord = itemObj.search.split(' ')[0].toLowerCase();
//               if (!lowerName.includes(firstWord) && !lowerName.includes(itemObj.ko)) return;

//               allResults.push({
//                 item: itemName,
//                 price: priceNum.toFixed(2),
//                 mart: mart.name,
//                 link: searchUrl,
//                 searchKeyword: itemObj.ko,
//                 updatedAt: new Date().toISOString()
//               });
          
//               console.log(`📡 [${mart.name}] 확정: ${itemName} -> €${priceNum}`);
//             }
//           });
//         }
//       } catch (e) {
//         console.error(`❌ ${mart.name} 통신 에러:`, e.message);
//       }
//     }
//   }

//   // ✅ 모든 마트, 모든 아이템 수집 완료 후 딱 한 번 저장
//   if (allResults.length > 0) {
//     await db.collection("prices").doc("latest").set({ 
//       data: allResults,
//       lastGlobalUpdate: new Date().toISOString(),
//       status: "verified"
//     });
//     console.log(`✨ 총 ${allResults.length}개의 정제된 데이터 저장 완료!`);
//   }
// }

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
  { name: "아마존", url: "https://www.amazon.de/s?k=", affiliateId: "yourtag-21" } // ✅ 본인 태그 입력
];

const targetItems = [
  { ko: "신라면", search: "Nongshim Shin Ramyun 120g single" },
  { ko: "불닭볶음면", search: "Samyang Buldak Original 140g single" },
  { ko: "비비고 두부(부침용)", search: "Bibigo Tofu for firm/frying" },
  { ko: "김포쌀 9.07kg", search: "Gimpo Rice 9.07kg (20lbs)" },
  { ko: "참이슬 프레쉬", search: "Jjinro Chamisul Fresh Soju 360ml" },
  { ko: "종가집 김치 500g", search: "Jongga Mat Kimchi 500g" }
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
        const query = (mart.name === "다와요" || mart.name === "한독몰") ? itemObj.ko : itemObj.search;
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
  // 기존 데이터에서 이번에 새로 수집한 품목(searchKeyword)과 마트가 겹치는 건 지우고 새 걸로 교체
  const updatedData = [
    ...existingData.filter(old => 
      !newResults.some(newItem => newItem.searchKeyword === old.searchKeyword && newItem.mart === old.mart)
    ),
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