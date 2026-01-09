import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const PriceComparison = () => {
    const [prices, setPrices] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [loading, setLoading] = useState(true);

    // 가격 문자열을 숫자로 바꾸는 헬퍼 함수
    const getNum = (str) => parseFloat(String(str).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const rawData = data.data || [];

                // 🔥 이 부분이 핵심입니다! 빈 값들을 필터링합니다.
                const cleanData = rawData.filter(p =>
                    p.item && p.item.trim() !== "" &&  // 이름이 비어있지 않고
                    p.price && p.price.toString().trim() !== "" && // 가격이 비어있지 않고
                    p.price !== "0" // 가격이 0이 아닌 것만 통과
                );

                setPrices(cleanData); // 걸러진 깨끗한 데이터만 저장

                if (data.lastGlobalUpdate) {
                    setLastUpdate(new Date(data.lastGlobalUpdate).toLocaleString());
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // ⭐ 핵심: 데이터를 searchKeyword 별로 그룹화하고 정렬함
    const groupedData = useMemo(() => {
        const grouped = prices.reduce((acc, obj) => {
            // searchKeyword가 없으면 상품명(item)에서 키워드를 유추하거나 기본값을 줍니다.
            const key = obj.searchKeyword || (obj.item.includes("Shin") ? "라면" : "기타");
            if (!acc[key]) acc[key] = [];
            acc[key].push(obj);
            return acc;
        }, {});

        // 각 그룹 내에서 가격순으로 정렬
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                const getNum = (str) => parseFloat(String(str).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                return getNum(a.price) - getNum(b.price);
            });
        });
        return grouped;
    }, [prices]);

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">최신 가격 비교 데이터를 불러오는 중...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8">
            {/* 상단 헤더 영역: 제목은 왼쪽, 업데이트 시간은 오른쪽 정렬 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-100 pb-6 gap-4">
                <div className="flex flex-col gap-2">
                    <h3 className="text-3xl font-black text-slate-800 leading-none tracking-tight">🛒 품목별 최저가 비교</h3>
                    <p className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded w-fit">LIVE AI UPDATES</p>
                </div>
                <div className="text-left md:text-right flex flex-col md:items-end">
                    {/* <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Last Updated</span> */}
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full mt-1">
                        Last update time : {lastUpdate}
                    </span>
                </div>
            </div>

            {/* 품목별 리스트 영역 */}
            <div className="space-y-10">
            {Object.keys(groupedData).length > 0 ? (
    // ⭐ 1. 카테고리를 정렬합니다 (기타는 항상 맨 뒤로)
    Object.keys(groupedData)
        .sort((a, b) => {
            if (a === '기타') return 1;  // a가 '기타'면 뒤로 보냄
            if (b === '기타') return -1; // b가 '기타'면 뒤로 보냄
            return a.localeCompare(b);   // 나머지는 가나다순 정렬
        })
        .map((category) => (
            <div key={category} className="bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-sm overflow-hidden transition-all hover:shadow-md mb-8">
                {/* 카테고리 헤더 */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-700"># {category}</h3>
                    <span className="text-[11px] font-bold text-indigo-600 bg-white border border-indigo-100 px-3 py-1 rounded-full shadow-sm">
                        {/* ⭐ 2. 중복을 제거한 마트 개수만 표시 (Set 사용) */}
                        {[...new Set(groupedData[category].map(p => p.mart))].length}개 마트 비교
                    </span>
                </div>

                {/* 마트별 가격 리스트 */}
                <div className="divide-y divide-slate-50">
                    {groupedData[category].map((p, idx) => (
                        <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center justify-between p-5 hover:bg-white transition-all group ${idx === 0 ? 'bg-amber-50/40' : ''}`}>

                            <div className="flex flex-col gap-1 overflow-hidden pr-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter w-14 shrink-0">{p.mart}</span>
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                                        {p.item.replace(/['"]+/g, '')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 shrink-0">
                            <div className="text-right flex flex-col items-end">
    <span className={`text-xl font-black leading-none ${idx === 0 ? 'text-amber-600' : 'text-slate-800'}`}>
        €{String(p.price).replace(/[^\d.,]/g, '').replace(',', '.')}
    </span>
    {/* 'BEST' 텍스트 빼고 깔끔하게 왕관만 표시 */}
    {idx === 0 && (
        <span className="text-lg mt-1" title="최저가">🏆</span>
    )}
</div>
                                <div className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
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
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl py-20 text-center">
            <p className="text-slate-400 font-bold italic">비교 가능한 데이터가 아직 없습니다.</p>
            <p className="text-[10px] text-slate-300 mt-2 uppercase tracking-widest font-black">Waiting for AI extraction...</p>
        </div>
    )}
            </div>
        </div>
    );
};

export default PriceComparison;