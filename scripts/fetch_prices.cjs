const admin = require("firebase-admin");
const { default: FirecrawlApp } = require("@mendable/firecrawl-js");

const saData = process.env.VITE_FIREBASE_SERVICE_ACCOUNT;
const FIRECRAWL_API_KEY = process.env.VITE_FIRECRAWL_API_KEY;

if (!saData) throw new Error("FIREBASE_SERVICE_ACCOUNT 없음");

try {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(saData))
  });
} catch (e) {}

const db = admin.firestore();
const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

async function updatePrices() {
  const marts = [
    { name: "한독몰", url: "https://handokmall.de/search?q=" },
    { name: "와이마트", url: "https://www.y-mart.de/de/search?q=" },
    { name: "다와요", url: "https://dawayo.de/ko/search?search_query=" }
  ];
  
  const targetItems = ["쌀", "김치", "신라면", "두부", "고추장", "만두", "불닭"];
  let results = [];

  console.log("스크래핑 시작...");

  for (const mart of marts) {
    try {
      console.log(`${mart.name} 데이터 추출 중...`);
          
      const searchUrl = mart.url.split('search')[0];
      const extractResult = await app.extract({
        urls: [searchUrl],
        prompt: `사이트 내에서 다음 상품들을 찾아줘: ${targetItems.join(", ")}. 
                각 상품의 '정확한 이름', '현재 가격(Euro 단위)', 그리고 해당 상품으로 연결되는 '상세페이지 URL'을 추출해줘. 
                만약 정확히 일치하는 상품이 없다면 가장 유사한 상품을 찾아줘.`,
                schema: {
                  type: "object",
                  properties: {
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item: { type: "string", description: "상품의 이름" },
                          price: { type: "string", description: "가격 (예: 15,99€)" },
                          link: { type: "string", description: "상품 상세 페이지 전체 경로" }
                        },
                        required: ["item", "price"] // 이름과 가격은 필수
                      }
                    }
                  }
                }
              });

      if (extractResult.success && extractResult.data) {
        const products = extractResult.data.products || [];
        const dataWithMart = products.map(p => ({
          ...p,
          mart: mart.name,
          updatedAt: new Date().toISOString()
        }));
        results.push(...dataWithMart);
        console.log(`${mart.name} 완료: ${dataWithMart.length}개 상품 발견`);
      }
    } catch (e) { 
      console.error(`${mart.name} 에러 발생:`, e.message); 
    }
  }

  if (results.length > 0) {
    await db.collection("prices").doc("latest").set({ 
      data: results,
      lastGlobalUpdate: new Date().toISOString()
    });
    console.log("✅ Firestore 데이터 업데이트 완료!");
  } else {
    console.log("❌ 최종 추출된 데이터가 없습니다.");
  }
}

updatePrices();