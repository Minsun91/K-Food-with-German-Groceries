import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { langConfig } from "../../constants/langConfig";

const HomeView = ({ currentLang, setCurrentLang, recipes = [] }) => {
    const navigate = useNavigate();

    // 🌐 [추가] 브라우저 언어 자동 감지 로직
    useEffect(() => {
        const savedLang = localStorage.getItem("userLang");
        if (!savedLang) {
            const browserLang = navigator.language.split("-")[0];
            const supportedLangs = ["de", "en", "ko"];
            if (supportedLangs.includes(browserLang)) {
                setCurrentLang(browserLang);
            }
        }
    }, [setCurrentLang]);

    const t = langConfig[currentLang] || langConfig.ko;

    const handleNavigation = (id, path) => {
        if (window.gtag) {
            window.gtag("event", "select_content", {
                content_type: "home_card",
                item_id: id,
            });
        }
        navigate(path);
    };

    return (
        <div className="flex flex-col items-center pt-20 pb-40 px-4 bg-white font-sans overflow-x-hidden">
            {/* 메인 타이틀 - 독일어일 때 조금 더 부드러운 표현으로 보정 */}
            <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-6 tracking-tight text-center leading-[1.1] break-keep max-w-4xl">
                {currentLang === "ko" ? (
                    <>
                        독일 생활의{" "}
                        <span className="text-indigo-500 font-extrabold">
                            스마트한
                        </span>{" "}
                        선택
                    </>
                ) : currentLang === "de" ? (
                    <>
                        Die{" "}
                        <span className="text-indigo-500 font-extrabold">
                            smarte
                        </span>{" "}
                        Wahl für Ihr Leben in Deutschland
                    </>
                ) : (
                    t.title
                )}
            </h1>

            <p className="text-slate-500 text-base md:text-xl mb-16 text-center max-w-2xl leading-relaxed break-words px-4 font-medium">
                {currentLang === "de"
                    ? "Kochen Sie authentisch koreanisch mit Zutaten von REWE, Lidl, Aldi & Co."
                    : t.subtitle || t.desc}
            </p>

            {/* 통계 섹션 - 애니메이션 효과 살짝 추가 */}
            <div className="flex flex-wrap justify-center gap-10 md:gap-20 mb-20 text-center">
                {[
                    { val: "7+", label: t.mart_compare },
                    {
                        val: "20+",
                        label: currentLang === "ko" ? "레시피" : "Rezepte",
                    },
                    {
                        val: "FREE",
                        label: currentLang === "ko" ? "이용 금액" : "Preis",
                    },
                ].map((stat, i) => (
                    <div key={i} className="min-w-[80px] group">
                        <div className="text-4xl font-black text-indigo-500 mb-1 group-hover:scale-110 transition-transform">
                            {stat.val}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* 커피 후원 섹션 - 디자인 밀도 상향 */}
            <div className="w-full max-w-3xl bg-[#FFFCF0] border border-yellow-100 rounded-[2.5rem] md:rounded-[3rem] p-6 flex flex-col md:flex-row justify-between items-center gap-6 mb-16 shadow-sm">
                <div className="flex items-center gap-4 px-2">
                    <span className="text-2xl animate-pulse">🌱</span>
                    <div>
                        <div className="font-bold text-slate-800 text-sm break-words">
                            {t.coffee_title}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-1 break-words">
                            {t.coffee_desc}
                        </div>
                    </div>
                </div>
                <a
                    href="https://ko-fi.com/kfoodtracker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full md:w-auto bg-[#0F172A] text-white px-8 py-3 rounded-2xl text-xs font-bold hover:bg-indigo-600 transition-all text-center">
                    {t.coffee_button}
                </a>
            </div>
           

            {/* Explore 아이콘 */}
            <div className="flex flex-col items-center gap-3 text-slate-300 mb-20">
                <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-50">
                    Explore Now
                </span>
                <div className="w-px h-12 bg-gradient-to-b from-slate-200 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl px-4">
                {/* 🛒 최저가 확인 카드 */}
                <div
                    onClick={() => handleNavigation("price", "/price")}
                    className="cursor-pointer bg-[#F8FAFC] rounded-[3.5rem] p-10 md:p-14 flex flex-col items-start hover:bg-white border-2 border-transparent hover:border-indigo-500 transition-all duration-500 group relative overflow-hidden">
                    <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                        <span className="text-4xl">🛒</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
                        {t.price_title}
                    </h2>
                    <p className="text-slate-500 text-base mb-10 leading-relaxed font-medium">
                        {t.price_subtitle}
                    </p>
                    <div className="mt-auto bg-white text-indigo-600 px-8 py-4 rounded-2xl text-sm font-black flex items-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        {currentLang === "ko" ? "최저가 확인" : "Preise prüfen"}{" "}
                        <span>→</span>
                    </div>
                </div>

                {/* 👩‍🍳 레시피 만들기 카드 */}
                <div
                    onClick={() => handleNavigation("recipe", "/recipe")}
                    className="cursor-pointer bg-[#F8FAFC] rounded-[3.5rem] p-10 md:p-14 flex flex-col items-start hover:bg-white border-2 border-transparent hover:border-indigo-500 transition-all duration-500 group relative overflow-hidden">
                    <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mb-8 group-hover:-rotate-12 transition-transform">
                        <span className="text-4xl">👩‍🍳</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
                        {t.title}
                    </h2>
                    <p className="text-slate-500 text-base mb-10 leading-relaxed font-medium">
                        {t.subtitle}
                    </p>
                    <div className="mt-auto bg-white text-indigo-600 px-8 py-4 rounded-2xl text-sm font-black flex items-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        {currentLang === "ko"
                            ? "레시피 만들기"
                            : "Rezept erstellen"}{" "}
                        <span>→</span>
                    </div>
                </div>
            </div>

            {/* 레시피 목록 섹션 (가로 스크롤/그리드 최적화) */}
            {recipes.length > 0 && (
                <div className="mt-40 w-full max-w-6xl px-4">
                    <div className="flex justify-between items-end mb-10 px-2">
                        <h3 className="text-3xl font-black text-slate-800">
                            {t.recent_title}
                        </h3>
                        <span className="text-indigo-500 font-bold text-sm cursor-pointer hover:underline">
                            View all
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {recipes.slice(0, 6).map((r) => (
                            <div
                                key={r.id}
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
                                    🍱
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                    {r.title}
                                </h4>
                                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-6">
                                    {r.description}
                                </p>
                                <div className="mt-auto pt-4 border-t border-slate-50 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    Recipe
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

           {/* WorldKJob 푸터 직전 와이드 배너 섹션 (슬림 버전) */}
<div className="w-full mt-20 md:mt-32 px-4 max-w-4xl mx-auto"> 
    <a 
        href="https://www.worldkjob.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-r from-[#FFF5F5] to-[#F5F3FF] border border-pink-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
    >
        {/* 내부 콘텐츠 구성 - 패딩을 줄여 슬림하게 변경 */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 md:px-10 gap-6">
            
            {/* 왼쪽: 로고 및 텍스트 */}
            <div className="flex items-center gap-5 md:gap-8 text-left">
                {/* 로고 영역 - 크기를 줄임 */}
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-pink-50 group-hover:rotate-3 transition-transform">
                    <span className="text-2xl md:text-3xl">🚀</span>
                </div>
                
                <div>
                    <div className="inline-block px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 text-[9px] font-black uppercase tracking-wider mb-1.5">
                        Career in Germany
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight">
                        독일 한인 회사 취업, <span className="text-indigo-500">월드케이잡</span>에서 확인하세요
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-medium">
                        해외 한인 채용 정보 공유 사이트
                    </p>
                </div>
            </div>

            {/* 오른쪽: 버튼 - 컴팩트하게 변경 */}
            <div className="shrink-0 w-full md:w-auto">
                <div className="flex items-center justify-center bg-indigo-500 text-white px-6 py-3 rounded-xl text-xs font-black group-hover:bg-slate-800 transition-all shadow-md">
                    방문하기 <span className="ml-1.5 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </div>
        </div>
    </a>
</div>
        </div>
    );
};

export default HomeView;
