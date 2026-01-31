import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../utils/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { shareToKakao, shareToWhatsApp } from '../../utils/share';
import { langConfig, DELIVERY_INFO } from '../../constants/langConfig';

// 렌더링 시 사용법

const MART_NAMES_EN = {
    "한독몰": "Handok Mall", "코켓": "Kocket", "와이마트": "Y-Mart",
    "아마존": "Amazon", "다와요": "Dawayo", "K-shop": "K-shop",
    "JoyBuy": "JoyBuy", "GoAsia": "GoAsia"
};

const PriceComparison = ({ currentLang, onUpdateData }) => {
    const [categoryTab, setCategoryTab] = useState('food'); // 'food' 또는 'beauty'
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
// const currentDelivery = DELIVERY_INFO[currentLang] || DELIVERY_INFO['ko'];

    // Firebase 데이터 로드
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const rawData = data.data || [];
                const cleanData = rawData.filter(p => p.item && p.price && p.price !== "0");
                setPrices(cleanData);
                if (data.lastGlobalUpdate && onUpdateData) {
                    const timeString = new Date(data.lastGlobalUpdate).toLocaleString();
                    onUpdateData(timeString);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [onUpdateData]);

    // 검색어 자동 스크롤 로직 (기존 유지)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search');
        if (searchQuery && !hasAutoScrolled && prices.length > 0) {
            setSearchTerm(decodeURIComponent(searchQuery));
            setTimeout(() => {
                const searchElement = document.querySelector('.search-bar-anchor');
                if (searchElement) searchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHasAutoScrolled(true);
            }, 800);
        }
    }, [prices, hasAutoScrolled]);

    // 🌟 핵심: 데이터 필터링 및 [식품/뷰티] 자동 분류 로직
    const filteredAndGroupedData = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/[+\s]+/).filter(w => w.length > 0);

        // 1. 일차 필터링 및 카테고리 판별
        const filtered = prices.filter(p => {
            const targetText = `${p.item} ${p.mart} ${p.searchKeyword || ""}`.toLowerCase();
            const matchesSearch = searchWords.every(word => targetText.includes(word));

            // 💄 뷰티 품목 판별 로직 (리들샷, 화장품 등 키워드 기준)
            const isBeautyItem = targetText.includes("리들샷") ||
                targetText.includes("reedle") ||
                targetText.includes("cosmetic") ||
                targetText.includes("선크림");

            // 현재 선택된 탭과 상품의 카테고리가 일치하는지 확인
            const categoryMatch = categoryTab === 'beauty' ? isBeautyItem : !isBeautyItem;

            return matchesSearch && categoryMatch;
        });

        // 2. 그룹화 로직 (기존 유지 + 뷰티 전용 키워드 추가)
        const grouped = filtered.reduce((acc, obj) => {
            let key = obj.searchKeyword || "기타";
            if (key.includes("신라면")) key = "🍜 신라면 (Shin Ramyun)";
            else if (key.includes("불닭")) key = "🔥 불닭볶음면 (Buldak)";
            else if (key.includes("리들샷")) key = "💄 리들샷 (Reedle Shot)";
            else if (key.includes("김치")) key = "🥬 종가집 김치 (Kimchi)";
            // ... 나머지 키워드 생략 (기존 코드와 동일하게 유지 가능)

            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        // 3. 가격 정렬
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            grouped[key] = grouped[key].map(item => ({
                ...item,
                minPrice: parseFloat(grouped[key][0].price),
                maxPrice: parseFloat(grouped[key][grouped[key].length - 1].price)
            }));
        });

        return grouped;
    }, [prices, searchTerm, categoryTab]);

    if (loading) return <div className="py-20 text-center text-slate-400 font-bold italic animate-pulse">Lade Preise...</div>;
    const searchTexts = langConfig[currentLang]?.search || langConfig['ko'].search;

    return (
<div className="w-full bg-white animate-in fade-in duration-500">
            {/* 🚚 1. 배송비 정보 상단 바 */}
            <div className="w-full bg-white py-3 border-b border-slate-100 overflow-hidden relative group">
                <div className="flex whitespace-nowrap animate-marquee group-hover:pause">
                    {[...DELIVERY_INFO, ...DELIVERY_INFO].map((info, i) => {
                        // 마트별 색상 매핑
                        const getDotColor = (name) => {
                            switch (name) {
                                case '다와요': return 'bg-red-350';
                                case 'Y-Mart': return 'bg-blue-450';
                                case '한독몰': return 'bg-pink-500';
                                case 'Kocket': return 'bg-indigo-600';
                                case 'K-shop': return 'bg-blue-500';
                                case 'JoyBuy': return 'bg-red-500';
                                case 'GoAsia': return 'bg-red-700';
                                default: return 'bg-slate-400';
                            }
                        };

                        return (
                            <div key={i} className="flex items-center gap-2 mx-6 shrink-0">
                                {/* 마트별 고유 컬러 점 */}
                                <span className={`w-2 h-2 rounded-full shadow-sm ${getDotColor(info.name)}`} />

                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                                    {info.name}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                    {info.info}
                                </span>
                                <span className="text-slate-200 text-xs ml-4">|</span>
                            </div>
                        );
                    })}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            display: flex;
            animation: marquee 20s linear infinite; /* 속도를 조금 더 여유롭게 조정 */
        }
        .group:hover .animate-marquee {
            animation-play-state: paused;
        }
    `}} />
            </div>

            {/* 💄 2. [식품 / 뷰티] 카테고리 전환 탭 (추가됨) */}
            <div className="flex justify-center mt-6 mb-2">
                <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                    <button
                        onClick={() => { setCategoryTab('food'); setSearchTerm(""); }}
                        className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${categoryTab === 'food' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        🛒 {currentLang === 'ko' ? '한국 식품' : 'K-Food'}
                    </button>
                    <button
                        onClick={() => { setCategoryTab('beauty'); setSearchTerm(""); }}
                        className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${categoryTab === 'beauty' ? 'bg-white shadow-md text-pink-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        💄 {currentLang === 'ko' ? 'K-뷰티' : 'K-Beauty'}
                    </button>
                </div>
            </div>

            {/* 🔍 3. 검색바 */}
            <div className="px-4 md:px-6 py-4 search-bar-anchor">
    <div className="relative group">
        {/* 아이콘: 더 선명하게 */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            🔍
        </div>
        
        <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
                categoryTab === 'food' 
                    ? (langConfig[currentLang]?.foodPlaceholder || langConfig['ko'].foodPlaceholder)
                    : (langConfig[currentLang]?.beautyPlaceholder || langConfig['ko'].beautyPlaceholder)
            }
            // bg-white/50 대신 더 선명한 흰색 배경과 그림자 추가
            className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white border-2 border-slate-100 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
        />

        {/* 지우기 버튼: 입력 중일 때만 등장 */}
        {searchTerm && (
            <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-indigo-500 transition-colors"
            >
                <span className="bg-slate-100 rounded-full p-1">✕</span>
            </button>
        )}
    </div>
</div>

            {/* 📦 4. 상품 리스트 (기존 렌더링 로직 유지) */}
            <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">

                {Object.keys(filteredAndGroupedData).length > 0 ? (

                    Object.keys(filteredAndGroupedData)

                        .sort((a, b) => {

                            // 1. '기타' 카테고리는 무조건 맨 아래로

                            if (a === '기타') return 1;

                            if (b === '기타') return -1;



                            const itemsA = filteredAndGroupedData[a];

                            const itemsB = filteredAndGroupedData[b];



                            // 2. 각 카테고리에서 가장 최근 업데이트된 시간을 가져옴

                            const timeA = new Date(Math.max(...itemsA.map(i => new Date(i.updatedAt || 0)))).getTime();

                            const timeB = new Date(Math.max(...itemsB.map(i => new Date(i.updatedAt || 0)))).getTime();



                            // 3. 🌟 최신 업데이트순 정렬 (최신이 위로)

                            return timeB - timeA;
                        })

                        .map((category) => {
                            const items = filteredAndGroupedData[category];
                            const firstItem = items[0];


                            // 🌟 NEW 배지 조건 수정: 
                            const latestUpdate = Math.max(...items.map(i => new Date(i.updatedAt || 0).getTime()));
                            const isNew = (Date.now() - latestUpdate) < (48 * 60 * 60 * 1000); // 48시간 기준
                            const shareData = {
                                name: category,                       // 품목 카테고리 명 (예: 맥심 모카골드)
    price: firstItem.minPrice || "0.00",  // 최저가
    // 절약 금액: 최고가 - 최저가 (이미지의 "7.00€ 절약" 로직)
    savings: (firstItem.maxPrice && firstItem.minPrice) 
        ? (firstItem.maxPrice - firstItem.minPrice).toFixed(2) 
        : "0.00",
    bestStore: firstItem.bestStore || firstItem.mart || "마트"
                            };

                            return (
                                <div key={category} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-slate-50/30">
                                    <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-slate-600 tracking-tight flex items-center gap-1">
                                                # {category}
                                                {isNew && (
                                                    <span className="animate-pulse inline-block bg-rose-500 text-[9px] text-white px-2 py-0.5 rounded-full font-black shadow-sm">
                                                        NEW
                                                    </span>
                                                )}
                                            </h3>
                                            <span className="text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                                                {items.length}개 결과
                                            </span>
                                        </div>


                                        {/* 🔗 상단으로 옮겨진 깔끔한 공유 버튼 */}

                                        <div className="flex gap-1.5">
                                        <button onClick={() => shareToKakao(shareData, currentLang)} className="flex items-center gap-1 bg-[#FEE500] px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#3A1D1D] hover:opacity-90 transition-opacity">카톡</button>
                                           <button onClick={() => shareToWhatsApp(shareData, currentLang)} className="flex items-center gap-1 bg-[#25D366] px-2.5 py-1 rounded-lg text-[10px] font-bold text-white hover:opacity-90 transition-opacity">WA</button>
                                        </div>
                                    </div>


                                    {/* 🛒 상품 목록 */}
                                    <div className="divide-y divide-slate-100/50">
                                        {filteredAndGroupedData[category].map((p, idx) => {
                                            const currentPrice = parseFloat(p.price) || 0;
                                            const prevPrice = p.prevPrice ? parseFloat(p.prevPrice) : null;

                                            return (
                                                <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer" onClick={() => {
                                                    window.gtag?.('event', 'click_amazon_product', {
                                                        'product_name': p.item,      // 예: "고추장", "참기름"

                                                        'mart_name': p.mart,         // 예: "Amazon", "K-Shop"

                                                        'price': currentPrice,       // 클릭 당시 가격

                                                        'category': category         // 현재 보고 있는 카테고리

                                                    });

                                                }}

                                                    className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-all group ${idx === 0 ? 'bg-amber-50/20' : 'bg-white'}`}

                                                >

                                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-4">

                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">{p.mart}</span>

                                                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 truncate leading-snug">{p.item}</span>

                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">

                                                        <div className="text-right flex flex-col items-end">

                                                            <div className="flex items-center gap-1">

                                                                <span className={`text-lg font-black ${idx === 0 ? 'text-amber-600' : 'text-slate-800'}`}>€{currentPrice.toFixed(2)}</span>

                                                                {idx === 0 && <span className="text-sm">🏆</span>}

                                                            </div>

                                                            {prevPrice && Math.abs(currentPrice - prevPrice) > 0.001 && (

                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${currentPrice < prevPrice ? 'text-green-600 bg-green-50' : 'text-rose-600 bg-rose-50'}`}>

                                                                    {currentPrice < prevPrice ? `▼ €${Math.abs(currentPrice - prevPrice).toFixed(2)}` : `▲ €${(currentPrice - prevPrice).toFixed(2)}`}

                                                                </span>

                                                            )}

                                                        </div>

                                                        <span className="text-slate-300 group-hover:text-indigo-400">

                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7" /></svg>

                                                        </span>

                                                    </div>

                                                </a>

                                            );

                                        })}

                                    </div>

                                </div>

                            );

                        })

                ) : (

                    <div className="py-20 text-center text-slate-300 font-bold italic">

                        {searchTerm ? "검색 결과가 없습니다 🥲" : "데이터를 불러오는 중입니다..."}

                    </div>

                )}

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-marquee { animation: marquee 20s linear infinite; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}} />
        </div>
    );
};

export default PriceComparison;