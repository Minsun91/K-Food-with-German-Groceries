import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';

const PriceComparison = () => { // 메인용이므로 recipe 인자는 일단 제외하거나 선택사항으로 둡니다.
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    const martThemes = {
        '한독몰': 'bg-red-50 text-red-700 border-red-100',
        '와이마트': 'bg-blue-50 text-blue-700 border-blue-100',
        '다와요': 'bg-orange-50 text-orange-700 border-orange-100',
        'K-Shop': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    };

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "prices", "latest"), (snapshot) => {
            if (snapshot.exists()) {
                const remoteData = snapshot.data().data || [];
                // 가격순 정렬
                const sortedData = [...remoteData].sort((a, b) => {
                    const priceA = parseFloat(a.price.replace(/[^\d.,]/g, '').replace(',', '.'));
                    const priceB = parseFloat(b.price.replace(/[^\d.,]/g, '').replace(',', '.'));
                    return priceA - priceB;
                });
                setPrices(sortedData);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 overflow-hidden text-left">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">🛒 실시간 한인마트 최저가</h3>
                        <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-wider">Live Updates from Firecrawl AI</p>
                    </div>
                    {loading && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>}
                </div>

                <div className="grid gap-3">
                    {prices.length > 0 ? (
                        prices.slice(0, 5).map((p, idx) => (
                            <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center justify-between p-4 bg-white/50 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex flex-col gap-1">
                                    <span className={`w-fit px-2 py-0.5 rounded-md text-[9px] font-black border ${martThemes[p.mart] || 'border-slate-200'}`}>{p.mart}</span>
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.item}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-slate-800">€{p.price}</span>
                                    <p className="text-[10px] text-slate-400 font-bold">SHOP NOW ↗</p>
                                </div>
                            </a>
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 py-4 text-center">데이터를 불러오는 중입니다...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PriceComparison;