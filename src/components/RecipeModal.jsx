import React from 'react';

const RecipeModal = ({ recipe, onClose, shareToKakao, shareToWhatsApp, currentLang }) => {
    if (!recipe) return null;
    // 마트별 검색 베이스 URL
    const MARKET_URLS = {
        rewe: "https://shop.rewe.de/auswahl?search=",
        lidl: "https://www.lidl.de/s/?q=",
        edeka: "https://www.edeka.de/suche.htm?query=",
        aldi: "https://www.aldi-sued.de/de/suche.html?q="
    };

    const RecipeModal = ({ recipe, onClose }) => {
        if (!recipe) return null;

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>{recipe.name_ko}</h2>

                    <h3>재료 및 독일 마트 검색</h3>
                    <ul>
                        {recipe.ingredients.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 mb-2">
                                <span>{item}</span>
                                {/* 독일 마트 검색 버튼들 */}
                                <div className="flex gap-1">
                                    <a
                                        href={`${MARKET_URLS.rewe}${encodeURIComponent(item)}`}
                                        target="_blank"
                                        className="px-2 py-1 text-[10px] bg-red-500 text-white rounded"
                                    >REWE</a>
                                    <a
                                        href={`${MARKET_URLS.lidl}${encodeURIComponent(item)}`}
                                        target="_blank"
                                        className="px-2 py-1 text-[10px] bg-yellow-400 rounded"
                                    >Lidl</a>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <button onClick={onClose}>닫기</button>
                </div>
            </div>
        );
    };

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-8">
                {typeof selectedRecipe !== 'undefined' && selectedRecipe && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[99999] flex items-end sm:items-center justify-center"
                        onClick={() => setSelectedRecipe(null)}>

                        <div className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-in slide-in-from-bottom duration-300"
                            onClick={e => e.stopPropagation()}>

                            {/* 상단 고정 닫기 버튼 */}
                            <button onClick={() => setSelectedRecipe(null)}
                                className="absolute top-5 right-6 z-10 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            {/* 내부 스크롤 영역 */}
                            <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                                {/* 제목: 단어 단위 줄바꿈 적용 */}
                                <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-6 leading-tight break-keep pr-8">
                                    {selectedRecipe[`name_${currentLang}`] || selectedRecipe.name_ko}
                                </h2>

                                <div className="space-y-8">
                                    {/* 재료 섹션 */}
                                    <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-100">
                                        {renderRecipeSection && renderRecipeSection(t?.ingredients_title || "Ingredients", selectedRecipe.ingredients)}
                                    </div>

                                    {/* 조리법 섹션 */}
                                    <div className="px-1">
                                        {renderRecipeSection && renderRecipeSection(t?.[`steps_${currentLang}`] || "Steps", selectedRecipe[`steps_${currentLang}`])}
                                    </div>
                                </div>

                                {/* 하단 버튼 영역: 내용 가장 마지막에 배치 */}
                                <div className="mt-10 flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => shareToWhatsApp(selectedRecipe)}
                                            className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                        >
                                            <span className="text-xl">💬</span> WhatsApp
                                        </button>
                                        <button
                                            onClick={() => shareToKakao(selectedRecipe)}
                                            className="flex-1 py-4 bg-[#FEE500] text-[#191919] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                        >
                                            <span className="text-xl">💛</span> Kakao
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setSelectedRecipe(null)}
                                        className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        {t?.close || "Close"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )};
                <h2 className="text-3xl font-black mb-4">{recipe.name_ko}</h2>
                <button onClick={onClose} className="bg-gray-100 p-2 rounded-full">닫기</button>
            </div>
        </div>
    );
};



export default RecipeModal;