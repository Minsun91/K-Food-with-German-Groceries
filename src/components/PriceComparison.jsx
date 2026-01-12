import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// App.jsx에서 currentLang과 langConfig를 props로 내려준다고 가정합니다.
const PriceComparison = ({ currentLang, langConfig }) => {
    const [prices, setPrices] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [loading, setLoading] = useState(true);

    // 현재 언어에 맞는 설정 가져오기
    const t = langConfig[currentLang];

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const rawData = data.data || [];

                // 빈 값 및 잘못된 데이터 필터링
                const cleanData = rawData.filter(p =>
                    p.item && p.item.trim() !== "" &&
                    p.price && p.price.toString().trim() !== "" &&
                    p.price !== "0"
                );

                setPrices(cleanData);

                if (data.lastGlobalUpdate) {
                    setLastUpdate(new Date(data.lastGlobalUpdate).toLocaleString());
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 데이터를 카테고리별로 그룹화 및 정렬
    const groupedData = useMemo(() => {
        const grouped = prices.reduce((acc, obj) => {
            const key = obj.searchKeyword || "기타";
            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                const getNum = (str) => parseFloat(String(str).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                return getNum(a.price) - getNum(b.price);
            });
        });
        return grouped;
    }, [prices]);

    if (loading) return (
        <div className="p-10 text-center animate-pulse text-slate-400 font-bold">
            Loading Latest Prices...
        </div>
    );

    if (!t) return null;

    return (
        <div className="w-full">
        {/* 1. 헤더 영역: 타이틀과 업데이트 시간을 한 줄로 */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              🛒 {t?.price_title || "품목별 최저가"}
            </h2>
            <p className="hidden md:block text-sm text-slate-400 font-medium mt-1">
              {t?.price_subtitle}
            </p>
          </div>
    
          {/* 오른쪽 끝에 붙는 업데이트 배지 */}
          {lastUpdate && (
            <div className="shrink-0 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight uppercase border border-indigo-100/50">
              {t.last_update}: {lastUpdate}
            </div>
          )}
        </div>

            {/* 3. 품목별 리스트 영역 */}
            <div className="space-y-10">
                {Object.keys(groupedData).length > 0 ? (
                    Object.keys(groupedData)
                        .sort((a, b) => {
                            if (a === '기타') return 1;
                            if (b === '기타') return -1;
                            return a.localeCompare(b);
                        })
                        .map((category) => (
                            <div key={category} className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-sm overflow-hidden mb-8">
                                <div className="bg-slate-50/80 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="text-xl font-black text-slate-700"># {category}</h3>
                                    <span className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm uppercase">
                                        {[...new Set(groupedData[category].map(p => p.mart))].length} {t.mart_compare}
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-50">
                                    {groupedData[category].map((p, idx) => (
                                        <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                                            className={`flex items-center justify-between p-6 hover:bg-white transition-all group ${idx === 0 ? 'bg-amber-50/30' : ''}`}>
                                            <div className="flex flex-col gap-1 overflow-hidden pr-4">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase w-16 shrink-0 tracking-tighter">{p.mart}</span>
                                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                                                        {p.item.replace(/['"]+/g, '')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 shrink-0">
                                                <div className="text-right flex flex-col items-end min-w-[70px]">
                                                    <span className={`text-2xl font-black leading-none ${idx === 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                                        €{String(p.price).replace(/[^\d.,]/g, '').replace(',', '.')}
                                                    </span>
                                                    {idx === 0 && <span className="text-lg mt-1" title={t.best_price}>🏆</span>}
                                                </div>
                                                <div className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                                        <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                                                        <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))
                ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-20 text-center">
                        <p className="text-slate-400 font-bold italic">{t.no_price_data}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceComparison;