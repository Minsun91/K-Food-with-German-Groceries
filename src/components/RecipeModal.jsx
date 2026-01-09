import { db } from '../firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';

const kakaoKey = "c78231a56667f351595ae8b2d87b2152";

    // WhatsApp 공유 함수
    const shareToWhatsApp = (recipe) => {
        if (!recipe?.id) {
            alert(currentLang === 'de' ? "Speichere das Rezept zuerst!" : "Save the recipe first!");
            return;
        }
        const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=de`;
        const recipeName = recipe.name_de || recipe.name_en || recipe.name_ko;
        const text = `${recipeName}\nProbier dieses Rezept aus! \n\n ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToKakao = (recipe) => {
        if (!recipe || !recipe.id) {
            alert(currentLang === 'ko' ? "먼저 '레시피 저장' 버튼을 눌러주세요!" : "Please save the recipe first!");
            return;
        }

        if (window.Kakao) {
            if (!window.Kakao.isInitialized()) {
                window.Kakao.init(kakaoKey);
            }

            const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=${currentLang}`;

            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: recipe[`name_${currentLang}`] || recipe.name_ko,
                    description: '독일 마트 재료로 만든 한식 레시피!',
                    imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
                    link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl
                    },
                },
                buttons: [
                    {
                        title: '레시피 보기',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl
                        }
                    }
                ],
            });
        }
    };


const RecipeModal = ({ recipe, 
    onClose, 
    shareToKakao,
    shareToWhatsApp, 
    currentLang, 
    t}) => {
    if (!recipe) return null;

    // 마트별 검색 베이스 URL
    const MARKET_URLS = {
        rewe: "https://shop.rewe.de/auswahl?search=",
        lidl: "https://www.lidl.de/s/?q=",
        edeka: "https://www.edeka.de/suche.htm?query=",
        aldi: "https://www.aldi-sued.de/de/suche.html?q="
    };

    // 데이터 안전하게 가져오기 (언어별 필드 대응)
    const displayName = recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name;
    const displayIngredients = recipe[`ingredients_${currentLang}`] || recipe.ingredients || recipe.ingredient || [];
    const displaySteps = recipe[`steps_${currentLang}`] || recipe.instructions || recipe.steps || [];

    const PriceComparison = () => {
        const [prices, setPrices] = useState([]);
        const [loading, setLoading] = useState(true);
      
        useEffect(() => {
          // 💡 Firestore의 'prices' 컬렉션 안의 'latest' 문서를 실시간 감시합니다.
          const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data().data; // 서버에서 올린 { data: [...] } 구조
              setPrices(remoteData);
            }
            setLoading(false);
          }, (error) => {
            console.error("Firestore 구독 에러:", error);
            setLoading(false);
          });
      
          return () => unsubscribe();
        }, []);
        
    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
             onClick={onClose}>
            
            <div className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-in slide-in-from-bottom duration-300"
                 onClick={e => e.stopPropagation()}>

                {/* 상단 닫기 버튼 */}
                <button onClick={onClose}
                    className="absolute top-5 right-6 z-10 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                {/* 내부 스크롤 영역 */}
                <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    
                    {/* 레시피 제목 */}
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-8 leading-tight break-keep pr-8">
                        {displayName}
                    </h2>

                    <div className="space-y-10">
                        {/* 🛒 재료 섹션 및 마트 검색 */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                🛒 {currentLang === 'ko' ? '재료 및 마트 검색' : (currentLang === 'de' ? 'Zutaten & Suche' : 'Ingredients & Search')}
                            </h3>
                            <div className="grid gap-3">
                                {displayIngredients.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                        <span className="font-medium text-slate-700">{typeof item === 'object' ? (item.item || item.name) : item}</span>
                                        
                                        {/* 독일 마트 바로가기 버튼 */}
                                        <div className="flex gap-2">
                                            <a href={`${MARKET_URLS.rewe}${encodeURIComponent(typeof item === 'object' ? item.item : item)}`}
                                               target="_blank" rel="noreferrer"
                                               className="px-3 py-1.5 text-[11px] font-bold bg-[#CC0000] text-white rounded-lg hover:opacity-80 transition-opacity">REWE</a>
                                            <a href={`${MARKET_URLS.lidl}${encodeURIComponent(typeof item === 'object' ? item.item : item)}`}
                                               target="_blank" rel="noreferrer"
                                               className="px-3 py-1.5 text-[11px] font-bold bg-[#0050AA] text-white rounded-lg hover:opacity-80 transition-opacity">Lidl</a>
                                            <a href={`${MARKET_URLS.edeka}${encodeURIComponent(typeof item === 'object' ? item.item : item)}`}
                                               target="_blank" rel="noreferrer"
                                               className="px-3 py-1.5 text-[11px] font-bold bg-[#FFD400] text-[#003051] rounded-lg hover:opacity-80 transition-opacity">EDEKA</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 🍳 조리 순서 섹션 */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                🍳 {currentLang === 'ko' ? '조리 순서' : (currentLang === 'de' ? 'Schritte' : 'Steps')}
                            </h3>
                            <div className="space-y-4">
                                {displaySteps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                            {idx + 1}
                                        </span>
                                        <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                                            {typeof step === 'object' ? step.text : step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 공유 버튼 및 닫기 */}
                    <div className="mt-12 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button onClick={() => shareToWhatsApp?.(recipe)}
                                className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
                                <span className="text-xl">💬</span> WhatsApp
                            </button>
                            <button onClick={() => shareToKakao?.(recipe)}
                                className="flex-1 py-4 bg-[#FEE500] text-[#191919] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
                                <span className="text-xl">💛</span> Kakao
                            </button>
                        </div>
                        <button onClick={onClose}
                            className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all active:scale-95">
                            {t?.close || "Close"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};}

export default RecipeModal