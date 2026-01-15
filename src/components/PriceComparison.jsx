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
            // 카테고리 자동 분류 (원하시는 대로 추가 가능)
            if (key.includes("Ramen") || key.includes("라면")) key = "라면류 (Ramen)";
            else if (key.includes("Kimchi") || key.includes("김치")) key = "김치류 (Kimchi)";
            else if (key.includes("Rice") || key.includes("쌀")) key = "곡물 (Rice)";
            else if (key.includes("Cuckoo") || key.includes("쿠쿠")) key = "가전 (Electronics)";
            
            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        });

        return grouped;
    }, [prices, searchTerm]);

    if (loading) return <div className="py-20 text-center text-slate-400 font-bold">데이터를 불러오는 중...</div>;

    return (
        <div className="w-full bg-white">
            {/* 🚚 1. 배송비 정보 상단 바 */}
           <div className="w-full bg-white py-3 border-b border-slate-100 overflow-hidden relative">
    <div className="flex whitespace-nowrap animate-marquee">
        {[...DELIVERY_INFO, ...DELIVERY_INFO].map((info, i) => (
            <div key={i} className="flex items-center gap-2 mx-6 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${
                    info.name === '다와요' ? 'bg-orange-400' : 
                    info.name === '한독몰' ? 'bg-blue-500' : 
                    info.name === 'Kocket' ? 'bg-indigo-500' : 'bg-slate-400'
                }`} />
                <span className="text-[11px] font-black text-slate-800 uppercase">{info.name}</span>
                <span className="text-[11px] font-medium text-slate-500">{info.info}</span>
                <span className="text-slate-200 text-xs ml-4">|</span>
            </div>
        ))}
    </div>

    <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            animation: marquee 20s linear infinite;
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
            <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
                {Object.keys(filteredAndGroupedData).length > 0 ? (
                    Object.keys(filteredAndGroupedData)
                        .sort((a, b) => a === '기타' ? 1 : b === '기타' ? -1 : a.localeCompare(b))
                        .map((category) => (
                            <div key={category} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-slate-50/30">
                                <div className="bg-slate-100/50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-sm font-black text-slate-600 tracking-tight"># {category}</h3>
                                    <span className="text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                                        {filteredAndGroupedData[category].length}개 결과
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-100/50">
                                    {filteredAndGroupedData[category].map((p, idx) => {
                                        // 가격 변동 계산
                                        const currentPrice = parseFloat(p.price);
                                        const prevPrice = p.prevPrice ? parseFloat(p.prevPrice) : null;
                                        const diff = prevPrice ? (currentPrice - prevPrice).toFixed(2) : 0;

                                        return (
                                            <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                                               className={`flex items-center justify-between p-4 hover:bg-white transition-all group ${idx === 0 ? 'bg-amber-50/40' : 'bg-white/50'}`}>
                                                
                                                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-4">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">
                                                        {p.mart}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 truncate leading-snug">
                                                        {p.item}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right flex flex-col items-end">
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-lg font-black ${idx === 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                                                €{currentPrice.toFixed(2)}
                                                            </span>
                                                            {idx === 0 && <span className="text-sm">🏆</span>}
                                                        </div>
                                                        {/* 📈 가격 변동 표시 보완 */}
{prevPrice && Math.abs(currentPrice - prevPrice) > 0.001 && (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
        currentPrice < prevPrice ? 'text-green-600 bg-green-50' : 'text-rose-600 bg-rose-50'
    }`}>
        {currentPrice < prevPrice ? `▼ €${Math.abs(currentPrice - prevPrice).toFixed(2)}` : `▲ €${(currentPrice - prevPrice).toFixed(2)}`}
    </span>
)}
                                                    </div>
                                                    <span className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M7 17l9.2-9.2M17 17V7H7"/>
                                                        </svg>
                                                    </span>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
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