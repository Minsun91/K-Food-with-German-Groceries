import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // 경로가 src/firebase.js 라면 ../firebase 가 맞습니다.
import { doc, onSnapshot } from 'firebase/firestore';

const kakaoKey = "c78231a56667f351595ae8b2d87b2152";

const RecipeModal = ({ recipe, onClose, currentLang, t }) => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const remoteData = snapshot.data().data || [];

                const sortedData = [...remoteData].sort((a, b) => {
                    // 가격에서 숫자만 추출하여 비교 (예: "5,99€" -> 5.99)
                    const priceA = parseFloat(a.price.replace(/[^\d.,]/g, '').replace(',', '.'));
                    const priceB = parseFloat(b.price.replace(/[^\d.,]/g, '').replace(',', '.'));
                    return priceA - priceB;
                });
                
                setPrices(sortedData);
            }
            setLoading(false);
        }, (error) => {
            console.error("Firestore 구독 에러:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (!recipe) return null;

    // 마트별 검색 및 테마 설정
    const MARKET_URLS = {
        rewe: "https://shop.rewe.de/auswahl?search=",
        lidl: "https://www.lidl.de/s/?q=",
        edeka: "https://www.edeka.de/suche.htm?query=",
    };

    const martThemes = {
        '한독몰': 'bg-red-50 text-red-700 border-red-100',
        '와이마트': 'bg-blue-50 text-blue-700 border-blue-100',
        '다와요': 'bg-orange-50 text-orange-700 border-orange-100',
        'K-Shop': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    };

    // 공유 함수들
    const shareToWhatsApp = () => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=de`;
        const recipeName = recipe[`name_${currentLang}`] || recipe.name_ko;
        const text = `${recipeName}\nProbier dieses Rezept aus! \n\n ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareToKakao = () => {
        if (window.Kakao) {
            if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);
            const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=${currentLang}`;
            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: recipe[`name_${currentLang}`] || recipe.name_ko,
                    description: '독일 마트 재료로 만든 한식 레시피!',
                    imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
                    link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
                },
                buttons: [{ title: '레시피 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
            });
        }
    };

    const displayName = recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name;
    const displayIngredients = recipe[`ingredients_${currentLang}`] || recipe.ingredients || [];
    const displaySteps = recipe[`steps_${currentLang}`] || recipe.instructions || recipe.steps || [];

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                
                <button onClick={onClose} className="absolute top-5 right-6 z-10 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-8 leading-tight break-keep pr-8">{displayName}</h2>

                    <div className="space-y-10">
                        {/* 🛒 재료 섹션 */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                🛒 {currentLang === 'ko' ? '재료 및 마트 검색' : 'Zutaten & Suche'}
                            </h3>
                            <div className="grid gap-3">
                                {displayIngredients.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                        <span className="font-medium text-slate-700">{typeof item === 'object' ? (item.item || item.name) : item}</span>
                                        <div className="flex gap-2">
                                            {['rewe', 'lidl', 'edeka'].map(mart => (
                                                <a key={mart} href={`${MARKET_URLS[mart]}${encodeURIComponent(typeof item === 'object' ? item.item : item)}`} target="_blank" rel="noreferrer"
                                                   className={`px-3 py-1.5 text-[11px] font-bold rounded-lg hover:opacity-80 transition-opacity ${mart === 'rewe' ? 'bg-[#CC0000] text-white' : mart === 'lidl' ? 'bg-[#0050AA] text-white' : 'bg-[#FFD400] text-[#003051]'}`}>
                                                    {mart.toUpperCase()}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 🇰🇷 한인마트 실시간 최저가 섹션 (Firecrawl 데이터 반영) */}
                        <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800">🇰🇷 한인마트 실시간 정보</h3>
                    <p className="text-[10px] text-indigo-500 font-medium">Firecrawl AI가 매일 아침 업데이트합니다</p>
                </div>
                {loading && <span className="text-xs text-slate-400 animate-pulse">Checking prices...</span>}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                {prices.length > 0 ? (
                    // [개선 2] slice 범위를 조금 늘리거나 스크롤 가능하게 변경
                    prices.slice(0, 5).map((p, idx) => (
                        <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer" 
                           className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-white hover:border-indigo-300 hover:shadow-md">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${martThemes[p.mart] || 'border-slate-200'}`}>
                                        {p.mart}
                                    </span>
                                    {idx === 0 && (
                                        <span className="bg-yellow-400 text-[9px] font-black px-1.5 py-0.5 rounded text-yellow-900 animate-bounce">BEST</span>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.item}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-slate-800 group-hover:text-indigo-600">€{p.price}</span>
                                <p className="text-[10px] text-slate-400 group-hover:text-indigo-400">Jetzt kaufen ↗</p>
                            </div>
                        </a>
                    ))
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400">데이터를 불러오는 중입니다.</p>
                    </div>
                )}
            </div>
        </div>

                        {/* 🍳 조리 순서 */}
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                                🍳 {currentLang === 'ko' ? '조리 순서' : 'Schritte'}
                            </h3>
                            <div className="space-y-4">
                                {displaySteps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">{idx + 1}</span>
                                        <p className="text-slate-600 leading-relaxed text-sm">{typeof step === 'object' ? step.text : step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button onClick={shareToWhatsApp} className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
                                WhatsApp
                            </button>
                            <button onClick={shareToKakao} className="flex-1 py-4 bg-[#FEE500] text-[#191919] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
                                Kakao
                            </button>
                        </div>
                        <button onClick={onClose} className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all active:scale-95">
                            {t?.close || "Close"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeModal;