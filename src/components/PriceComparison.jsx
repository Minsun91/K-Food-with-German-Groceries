import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';


// 🚚 배송비 정보 데이터 (컴포넌트 외부 정의)
const DELIVERY_INFO = [
    { name: "다와요", info: "60€↑ 무료" },
    { name: "Y-Mart", info: "70€↑ 무료 (최소 30€)" },
    { name: "한독몰", info: "70€↑ 무료 (픽업 5%↓)" },
    { name: "Kocket", info: "49€↑ 무료" }
];

const PriceComparison = ({ currentLang, langConfig, onUpdateData }) => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const rawData = data.data || [];
                // 가격이 0이거나 유효하지 않은 데이터 필터링
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

    const filteredAndGroupedData = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        const filtered = prices.filter(p =>
            p.item.toLowerCase().includes(term) ||
            p.mart.toLowerCase().includes(term) ||
            (p.searchKeyword && p.searchKeyword.toLowerCase().includes(term))
        );

        const grouped = filtered.reduce((acc, obj) => {
            let key = obj.searchKeyword || "기타";

            // 1. 상품별 카테고리화 로직
            if (key.includes("신라면")) key = "🍜 신라면 (Shin Ramyun)";
            else if (key.includes("불닭")) key = "🔥 불닭볶음면 (Buldak)";
            else if (key.includes("짜파게티")) key = "🖤 짜파게티 (Chapagetti)";
            else if (key.includes("왕교자") || key.includes("만두")) key = "🥟 비비고 왕교자 (Mandu)";
            else if (key.includes("간장")) key = "🧴 샘표 진간장 (Soy Sauce)";
            else if (key.includes("참이슬") || key.includes("소주")) key = "🍶 참이슬 (Soju)";
            else if (key.includes("쿠쿠") || key.includes("Cuckoo")) key = "🍚 쿠쿠 밥솥 (Rice Cooker)";
            else if (key.includes("김치")) key = "🥬 종가집 김치 (Kimchi)";
            else if (key.includes("쌀")) key = "🌾 김포쌀 (Rice)";

            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        // 2. 각 그룹 내부 데이터 정렬 및 공유 데이터 주입
        Object.keys(grouped).forEach(key => {
            // 가격 오름차순 정렬
            grouped[key].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

            // 최저가와 최고가 추출 (정렬된 상태이므로 처음과 끝)
            const minVal = parseFloat(grouped[key][0].price);
            const maxVal = parseFloat(grouped[key][grouped[key].length - 1].price);

            // 🌟 중요: 그룹 내 각 아이템에 공유 시 필요한 정보들을 미리 저장
            grouped[key] = grouped[key].map(item => ({
                ...item,
                groupTitle: key,      // 카테고리 제목
                minPrice: minVal,    // 최저가
                maxPrice: maxVal     // 최고가
            }));
        });

        return grouped;
    }, [prices, searchTerm]);

    if (loading) return <div className="py-20 text-center text-slate-400 font-bold">데이터를 불러오는 중...</div>;

    const handleKakaoShare = (item) => {
        // 1. Kakao SDK가 로드되었는지 확인
        if (!window.Kakao) {
            alert("카카오 SDK를 불러오는 중입니다. 잠시만 기다려주세요.");
            return;
        }
    
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init("c78231a56667f351595ae8b2d87b2152");
        }
    
        // 3. Share 객체 존재 여부 확인 (에러 방지 핵심)
        if (!window.Kakao.Share) {
            alert("카카오 공유 기능을 사용할 수 없는 환경입니다.");
            console.error("Kakao.Share is undefined. SDK 버전을 확인하세요.");
            return;
        }
    
        // 4. 실제 공유 실행
        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: `${item.name} 최저가 정보 📍`,
                description: getShareMessage(item),
                imageUrl: 'https://k-food-with-german-groceries.web.app/og-image-v2.png', // 앱 기본 로고 사용
                link: {
                    mobileWebUrl: window.location.href,
                    webUrl: window.location.href,
                },
            },
            buttons: [{
                title: '가격 확인하기',
                link: { mobileWebUrl: window.location.href, webUrl: window.location.href }
            }]
        });
    };

    const handleWhatsAppShare = (item) => {
        const text = getShareMessage(item);
        const url = `https://wa.me/?text=${encodeURIComponent(text + '\n' + window.location.href)}`;
        window.open(url, '_blank');
    };

    const getShareMessage = (item) => {
        const lang = currentLang || 'ko';
        const savings = (item.maxPrice - item.minPrice).toFixed(2);

        // 만약 가격 차이가 없으면(검색 결과가 1개면) 절약 문구 제외
        const savingsText = savings > 0
            ? (lang === 'ko' ? `\n💡 여기서 사면 ${savings}€나 아낄 수 있어요!` : `\n💡 Save ${savings}€ here!`)
            : "";

        const messages = {
            ko: `🛒 [가격비교] ${item.name}\n🥇 최저가: ${item.minPrice}€ (${item.bestStore})${savingsText}`,
            en: `🛒 [Price Check] ${item.name}\n🥇 Best: ${item.minPrice}€ at ${item.bestStore}${savingsText}`,
            de: `🛒 [Preisvergleich] ${item.name}\n🥇 Günstigster: ${item.minPrice}€ bei ${item.bestStore}${savingsText}`,
        };

        return messages[lang];
    };

    return (
        <div className="w-full bg-white">
            {/* 🚚 1. 배송비 정보 상단 바 */}
            <div className="w-full bg-white py-3 border-b border-slate-100 overflow-hidden relative">
                <div className="flex whitespace-nowrap animate-marquee">
                    {[...DELIVERY_INFO, ...DELIVERY_INFO].map((info, i) => (
                        <div key={i} className="flex items-center gap-2 mx-6 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${info.name === '다와요' ? 'bg-orange-400' :
                                info.name === '한독몰' ? 'bg-blue-500' :
                                    info.name === 'Kocket' ? 'bg-indigo-500' : 'bg-slate-400'
                                }`} />
                            <span className="text-[11px] font-black text-slate-800 uppercase">{info.name}</span>
                            <span className="text-[11px] font-medium text-slate-500">{info.info}</span>
                            <span className="text-slate-200 text-xs ml-4">|</span>
                        </div>
                    ))}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            animation: marquee 12s linear infinite;
        }
        .animate-marquee:hover {
            animation-play-state: paused;
            
        }
    `}} />
            </div>

            {/* 🔍 2. 검색바 */}
            <div className="px-4 md:px-6 pt-4 pb-2">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        🔍
                    </div>
                    <input
                        type="text"
                        placeholder={
                            currentLang === 'ko' ? "상품명이나 마트 이름을 검색해보세요" :
                                currentLang === 'de' ? "Produkte oder Märkte suchen..." :
                                    "Search products or marts..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-100/80 border-none rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                </div>
            </div>

            {/* 📦 3. 상품 리스트 */}
{/* 📦 3. 상품 리스트 */}
<div className="max-h-[700px] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
                {Object.keys(filteredAndGroupedData).length > 0 ? (
                    Object.keys(filteredAndGroupedData)
                        .sort((a, b) => a === '기타' ? 1 : b === '기타' ? -1 : a.localeCompare(b))
                        .map((category) => {
                            // 해당 카테고리의 첫 번째 아이템 정보를 기준으로 공유 데이터 생성
                            const firstItem = filteredAndGroupedData[category][0];
                            const shareData = {
                                name: category,
                                minPrice: firstItem.minPrice,
                                maxPrice: firstItem.maxPrice,
                                bestStore: firstItem.bestStore || firstItem.mart
                            };

                            return (
                                <div key={category} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-slate-50/30">
                                    {/* 🏷️ 카테고리 헤더: 제목 + 공유 버튼 배치 */}
                                    <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-slate-600 tracking-tight"># {category}</h3>
                                            <span className="text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                                                {filteredAndGroupedData[category].length}개 결과
                                            </span>
                                        </div>
                                        
                                        {/* 🔗 상단으로 옮겨진 깔끔한 공유 버튼 */}
                                        <div className="flex gap-1.5">
                                            <button 
                                                onClick={() => handleKakaoShare(shareData)}
                                                className="flex items-center gap-1 bg-[#FEE500] px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#3A1D1D] hover:opacity-90 transition-opacity"
                                            >
                                                카톡
                                            </button>
                                            <button 
                                                onClick={() => handleWhatsAppShare(shareData)}
                                                className="flex items-center gap-1 bg-[#25D366] px-2.5 py-1 rounded-lg text-[10px] font-bold text-white hover:opacity-90 transition-opacity"
                                            >
                                                WA
                                            </button>
                                        </div>
                                    </div>

                                    {/* 🛒 상품 목록 */}
                                    <div className="divide-y divide-slate-100/50">
                                        {filteredAndGroupedData[category].map((p, idx) => {
                                            const currentPrice = parseFloat(p.price) || 0;
                                            const prevPrice = p.prevPrice ? parseFloat(p.prevPrice) : null;

                                            return (
                                                <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                                                    className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-all group ${idx === 0 ? 'bg-amber-50/20' : 'bg-white'}`}>
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
        </div>
    );
};

export default PriceComparison;