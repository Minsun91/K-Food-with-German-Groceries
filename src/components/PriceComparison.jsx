import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';


// 🚚 배송비 정보 데이터 (컴포넌트 외부 정의)
const DELIVERY_INFO = [
    { name: "다와요", info: "60€↑ 무료" },
    { name: "Y-Mart", info: "70€↑ 무료 (최소 30€)" },
    { name: "한독몰", info: "70€↑ 무료 (픽업 5%↓)" },
    { name: "Kocket", info: "49€↑ 무료" },
    { name: "K-shop", info: "70€↑ 무료 (냉동 제품 4.99€)"},
    { name: "JoyBuy", info: "Same day delivery €3.99" },
    { name: "GoAsia", info: "39€↑ 무료" },
];

const MART_NAMES_EN = {
    "한독몰": "Handok Mall",
    "코켓": "Kocket",
    "와이마트": "Y-Mart",
    "아마존": "Amazon",
    "다와요": "Dawayo",
    "K-shop":"K-shop",
    "JoyBuy" :"JoyBuy",
    "GoAsia":"GoAsia"
};

const PriceComparison = ({ currentLang, langConfig, onUpdateData }) => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search');

        // 이미 스크롤을 했거나 검색어가 없으면 실행 안 함
        if (searchQuery && !hasAutoScrolled && prices.length > 0) {
            const decodedSearch = decodeURIComponent(searchQuery);
            setSearchTerm(decodedSearch);

            // 검색 위치로 부드럽게 이동
            setTimeout(() => {
                const searchElement = document.querySelector('.relative.group'); // 검색창 위치
                if (searchElement) {
                    searchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                // 🌟 중요: 스크롤 완료 후 다시는 실행 안 되게 잠금!
                setHasAutoScrolled(true);
                window.history.replaceState({}, '', window.location.pathname);
            }, 800);
        }
    }, [prices, hasAutoScrolled]);
    
    const filteredAndGroupedData = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/[+\s]+/).filter(w => w.length > 0);

        const filtered = prices.filter(p => {
            // 검색어가 없으면 모든 상품 보여주기
            if (searchWords.length === 0) return true;

            // 비교할 대상 텍스트 (상품명, 마트, 키워드 합치기)
            const targetText = `${p.item} ${p.mart} ${p.searchKeyword || ""}`.toLowerCase();

            // 🌟 핵심: 모든 단어가 포함되어 있는지 체크 (every)
            // ["비비고", "햇바삭"]의 모든 단어가 targetText에 들어있어야 true
            return searchWords.every(word => targetText.includes(word));
        });

        // --- 여기서부터는 기존의 그룹화(reduce) 로직과 동일합니다 ---
        const grouped = filtered.reduce((acc, obj) => {
            let key = obj.searchKeyword || "기타";

            // 상품별 카테고리화 로직
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

        // 가격 정렬 및 최저가 계산 로직 (기존과 동일)
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            const minVal = parseFloat(grouped[key][0].price);
            const maxVal = parseFloat(grouped[key][grouped[key].length - 1].price);
            grouped[key] = grouped[key].map(item => ({
                ...item,
                groupTitle: key,
                minPrice: minVal,
                maxPrice: maxVal
            }));
        });

        return grouped;
    }, [prices, searchTerm]);

    if (loading) return <div className="py-20 text-center text-slate-400 font-bold">데이터를 불러오는 중...</div>;

    const getCleanSearchQuery = (categoryName) => {
        if (!categoryName) return "";
        let clean = categoryName.replace(/\(.*\)/g, "").trim();
        clean = clean.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, "").trim();
        const words = clean.split(/\s+/).filter(w => w.length > 0);
        return words.slice(0, 2).join(" ");
    };


    const handleKakaoShare = (item) => {
        if (!window.Kakao) return;
        if (!window.Kakao.isInitialized()) window.Kakao.init("c78231a56667f351595ae8b2d87b2152");

        // 핵심 키워드만 추출 (예: "참이슬")
        const searchKeyword = getCleanSearchQuery(item.name);
        const deepLink = `${window.location.origin}${window.location.pathname}?search=${encodeURIComponent(searchKeyword)}`;

        const savings = (item.maxPrice - item.minPrice).toFixed(2);

        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: `🛒 ${item.name} 최저가 정보`,
                description: `🥇 최저가: ${item.minPrice}€ (${item.bestStore})\n💰 지금 확인하면 ${savings}€ 절약!`,
                imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
                link: { mobileWebUrl: deepLink, webUrl: deepLink },
            },
            buttons: [{
                title: '가격 확인하기',
                link: { mobileWebUrl: deepLink, webUrl: deepLink }
            }]
        });
    };

    const handleWhatsAppShare = (item) => {
        const lang = currentLang === 'ko' ? 'en' : currentLang;
        const martEn = MART_NAMES_EN[item.bestStore] || item.bestStore;
        const savings = (item.maxPrice - item.minPrice).toFixed(2);

        // 핵심 키워드 추출
        const searchKeyword = getCleanSearchQuery(item.name);
        const deepLink = `${window.location.origin}${window.location.pathname}?search=${encodeURIComponent(searchKeyword)}`;

        const messages = {
            en: `🛒 [Price Check] ${item.name}\n🥇 Best Price: ${item.minPrice}€ at ${martEn}\n💰 Save ${savings}€ here!\n\nCheck now: ${deepLink}`,
            de: `🛒 [Preisvergleich] ${item.name}\n🥇 Bestpreis: ${item.minPrice}€ bei ${martEn}\n💰 Sparen Sie ${savings}€!\n\nJetzt prüfen: ${deepLink}`
        };

        const text = messages[lang] || messages['en'];
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const getShareMessage = (item) => {
        const lang = currentLang || 'ko';
        const savings = (item.maxPrice - item.minPrice).toFixed(2);

        // 만약 가격 차이가 없으면(검색 결과가 1개면) 절약 문구 제외
        const savingsText = savings > 0
            ? (lang === 'ko' ? `\n💡 여기서 사면 ${savings}€나 아낄 수 있어요!` : `\n💡 Save ${savings}€ here!`)
            : "";

        const messages = {
            ko: `최저가 ${item.minPrice}€ 발견! (${item.bestStore})\n지금 확인하면 ${savings}€ 절약 가능 💰`,
            en: `Best price ${item.minPrice}€ at ${item.bestStore}\nSave ${savings}€ right now! 💰`,
            de: `Bestpreis ${item.minPrice}€ bei ${item.bestStore}\nSparen Sie jetzt ${savings}€! 💰`,
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
                        className="w-full pl-11 pr-12 py-3.5 bg-slate-100/80 border-none rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />

                    {/* ❌ 검색어 초기화 (ESC 역할) 버튼 */}
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <div className="bg-slate-200/50 hover:bg-slate-200 rounded-full p-1">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* 📦 3. 상품 리스트 */}
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
                // 강제 지정 대신, 실제로 업데이트된 지 48시간 이내인 제품에 NEW를 붙임
                const latestUpdate = Math.max(...items.map(i => new Date(i.updatedAt || 0).getTime()));
                const isNew = (Date.now() - latestUpdate) < (48 * 60 * 60 * 1000); // 48시간 기준

                const shareData = {
                    name: category,
                    minPrice: firstItem.minPrice,
                    maxPrice: firstItem.maxPrice,
                    bestStore: firstItem.bestStore || firstItem.mart
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
                                                <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"onClick={() => {
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
        </div>
    );
};

export default PriceComparison;