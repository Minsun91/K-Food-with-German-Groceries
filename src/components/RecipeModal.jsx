import React from 'react';

const kakaoKey = "c78231a56667f351595ae8b2d87b2152";

const RecipeModal = ({ 
    recipe, 
    onClose, 
    shareToKakao,
    shareToWhatsApp, 
    currentLang, 
    t 
}) => {
    // 레시피 데이터가 없으면 아무것도 렌더링하지 않음
    if (!recipe) return null;

    // 마트별 검색 URL
    const MARKET_URLS = {
        rewe: "https://shop.rewe.de/auswahl?search=",
        lidl: "https://www.lidl.de/s/?q=",
        edeka: "https://www.edeka.de/suche.htm?query=",
        aldi: "https://www.aldi-sued.de/de/suche.html?q="
    };

    // 언어별 데이터 매핑 (안전하게 처리)
    const displayName = recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name || "Untitled";
    const displayIngredients = recipe[`ingredients_${currentLang}`] || recipe.ingredients || [];
    const displaySteps = recipe[`steps_${currentLang}`] || recipe.instructions || recipe.steps || [];

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-in slide-in-from-bottom duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* 상단 닫기 버튼 */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-6 z-10 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                {/* 내부 내용 영역 */}
                <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-8 leading-tight break-keep pr-8">
                        {displayName}
                    </h2>

                    <div className="space-y-10">
                        {/* 🛒 재료 섹션 */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                🛒 {currentLang === 'ko' ? '재료 및 마트 검색' : (currentLang === 'de' ? 'Zutaten & Suche' : 'Ingredients & Search')}
                            </h3>
                            <div className="grid gap-3">
                                {displayIngredients.map((item, idx) => {
                                    const itemName = typeof item === 'object' ? (item.item || item.name) : item;
                                    return (
                                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                            <span className="font-medium text-slate-700">{itemName}</span>
                                            <div className="flex gap-2">
                                                <a href={`${MARKET_URLS.rewe}${encodeURIComponent(itemName)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[11px] font-bold bg-[#CC0000] text-white rounded-lg hover:opacity-80">REWE</a>
                                                <a href={`${MARKET_URLS.lidl}${encodeURIComponent(itemName)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[11px] font-bold bg-[#0050AA] text-white rounded-lg hover:opacity-80">Lidl</a>
                                                <a href={`${MARKET_URLS.edeka}${encodeURIComponent(itemName)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[11px] font-bold bg-[#FFD400] text-[#003051] rounded-lg hover:opacity-80">EDEKA</a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 🍳 조리 순서 */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                🍳 {currentLang === 'ko' ? '조리 순서' : (currentLang === 'de' ? 'Schritte' : 'Steps')}
                            </h3>
                            <div className="space-y-4">
                                {displaySteps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">{idx + 1}</span>
                                        <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                                            {typeof step === 'object' ? step.text : step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 하단 공유 버튼 */}
                    <div className="mt-12 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button onClick={() => shareToWhatsApp?.(recipe)} className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                <span className="text-xl">💬</span> WhatsApp
                            </button>
                            <button onClick={() => shareToKakao?.(recipe)} className="flex-1 py-4 bg-[#FEE500] text-[#191919] rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                <span className="text-xl">💛</span> Kakao
                            </button>
                        </div>
                        <button onClick={onClose} className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 active:scale-95">
                            {t?.close || "Close"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeModal;