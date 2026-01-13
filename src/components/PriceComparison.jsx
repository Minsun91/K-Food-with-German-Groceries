import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const PriceComparison = ({ currentLang, langConfig, onUpdateData }) => {
    const [prices, setPrices] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [loading, setLoading] = useState(true);

    const t = langConfig[currentLang];

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const rawData = data.data || [];

                const cleanData = rawData.filter(p =>
                    p.item && p.item.trim() !== "" &&
                    p.price && p.price.toString().trim() !== "" &&
                    p.price !== "0"
                );

                setPrices(cleanData);

                if (data.lastGlobalUpdate) {
                    const timeString = new Date(data.lastGlobalUpdate).toLocaleString();
                    setLastUpdate(timeString);
                    // App.jsx의 헤더 날짜 업데이트를 위해 콜백 실행
                    if (onUpdateData) onUpdateData(timeString);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [onUpdateData]);

    const groupedData = useMemo(() => {
        const grouped = prices.reduce((acc, obj) => {
            let key = obj.searchKeyword || "기타";
            
            // 키워드 기반 자동 카테고리 분류 (라면끼리, 김치끼리)
            if (key.includes("Ramen") || key.includes("라면") || key.includes("Buldak")) key = "라면류 (Ramen)";
            else if (key.includes("Kimchi") || key.includes("김치")) key = "김치류 (Kimchi)";
            else if (key.includes("Maudu") || key.includes("만두")) key = "만두 (Mandu)";
            else if (key.includes("Gochujang") || key.includes("고추장") || key.includes("Paste")) key = "장류 (Sauce)";
            
            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        // 가격순 정렬
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                const getNum = (str) => parseFloat(String(str).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                return getNum(a.price) - getNum(b.price);
            });
        });
        return grouped;
    }, [prices]);

        return (
            <div className="w-full bg-white">
                {/* 스크롤 영역: max-h를 주고 커스텀 스크롤바 적용 */}
                <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
                    {Object.keys(groupedData).length > 0 ? (
                        Object.keys(groupedData)
                            .sort((a, b) => a === '기타' ? 1 : b === '기타' ? -1 : a.localeCompare(b))
                            .map((category) => (
                                <div key={category} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-slate-50/30">
                                    {/* 카테고리 헤더 */}
                                    <div className="bg-slate-100/50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-600 tracking-tight"># {category}</h3>
                                        <span className="text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                                            {groupedData[category].length}개 품목 비교
                                        </span>
                                    </div>
    
                                    {/* 리스트 영역: 불필요한 가로줄(border-b) 제거 및 디자인 정돈 */}
                                    <div className="divide-y divide-slate-100/50">
                                        {groupedData[category].map((p, idx) => (
                                            <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                                               className={`flex items-center justify-between p-4 hover:bg-white transition-all group ${idx === 0 ? 'bg-amber-50/40' : 'bg-white/50'}`}>
                                                
                                                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-4">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">
                                                        {p.mart}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 truncate leading-snug">
                                                        {p.item.replace(/['"]+/g, '')}
                                                    </span>
                                                </div>
    
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className={`text-lg font-black ${idx === 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                                                €{String(p.price).replace(/[^\d.,]/g, '').replace(',', '.')}
                                                            </span>
                                                            {idx === 0 && <span className="text-sm" title="최저가">🏆</span>}
                                                        </div>
                                                    </div>
                                                    <span className="text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className="py-20 text-center text-slate-300 font-bold italic">데이터가 없습니다.</div>
                    )}
                </div>
            </div>
        );
    };

export default PriceComparison;