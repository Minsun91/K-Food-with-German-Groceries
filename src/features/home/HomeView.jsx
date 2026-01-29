import React from 'react';
import { useNavigate } from 'react-router-dom';
import { langConfig } from '../../constants/langConfig';

const HomeView = ({ currentLang, recipes = [] }) => { 
    const navigate = useNavigate();
    const t = langConfig[currentLang] || langConfig.ko;

    const handleNavigation = (id, path) => {
        if (window.gtag) {
            window.gtag('event', 'select_content', {
                content_type: 'home_card',
                item_id: id
            });
        }
        navigate(path);
    };

    return (
        <div className="flex flex-col items-center pt-20 pb-40 px-4 bg-white font-sans overflow-x-hidden">
            {/* 메인 타이틀 - text-4xl로 모바일 대응, break-keep 적용 */}
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6 tracking-tight text-center leading-tight break-keep max-w-4xl">
                {currentLang === 'ko' ? (
                    <>독일 생활의 <span className="text-indigo-500 font-extrabold">스마트한</span> 선택</>
                ) : (
                    t.title
                )}
            </h1>
            
            {/* 설명문 - max-w-2xl로 너비 제한, leading-relaxed로 가독성 확보 */}
            <p className="text-slate-500 text-base md:text-lg mb-16 text-center max-w-2xl leading-relaxed break-words px-4">
                {t.subtitle || t.desc} 
            </p>

            {/* 통계 섹션 - flex-wrap 추가 (화면 좁아지면 줄바꿈) */}
            <div className="flex flex-wrap justify-center gap-10 md:gap-20 mb-20 text-center">
                <div className="min-w-[80px]">
                    <div className="text-3xl font-black text-indigo-500 mb-1">7+</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words">{t.mart_compare}</div>
                </div>
                <div className="min-w-[80px]">
                    <div className="text-3xl font-black text-indigo-500 mb-1">20+</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-words">
                        {t.recent_title?.split(' ')[0] || 'Recipes'}
                    </div>
                </div>
                <div className="min-w-[80px]">
                    <div className="text-3xl font-black text-indigo-500 mb-1 font-mono uppercase">Free</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentLang === 'ko' ? '이용 금액' : 'Price'}</div>
                </div>
            </div>

            {/* 커피 후원 섹션 - flex-col(모바일) -> flex-row(데스크탑) 변경 */}
            <div className="w-full max-w-3xl bg-[#FFFCF0] border border-yellow-100 rounded-[2.5rem] md:rounded-[3rem] p-6 flex flex-col md:flex-row justify-between items-center gap-6 mb-16 shadow-sm">
                <div className="flex items-center gap-4 px-2">
                    <span className="text-2xl animate-pulse">🌱</span>
                    <div>
                        <div className="font-bold text-slate-800 text-sm break-words">{t.coffee_title}</div>
                        <div className="text-slate-400 text-[11px] mt-1 break-words">{t.coffee_desc}</div>
                    </div>
                </div>
                <a href="https://ko-fi.com/kfoodtracker" target="_blank" rel="noopener noreferrer"
                   className="w-full md:w-auto bg-[#0F172A] text-white px-8 py-3 rounded-2xl text-xs font-bold hover:bg-indigo-600 transition-all text-center">
                    {t.coffee_button}
                </a>
            </div>

            {/* Explore 아이콘 */}
            <div className="flex flex-col items-center gap-2 text-slate-300 mb-20">
                <span className="text-[10px] font-black tracking-[0.3em] uppercase italic">Explore</span>
                <span className="text-xl animate-bounce">↓</span>
            </div>

            {/* 카드 섹션 - p-16을 md:p-12로 줄여서 텍스트 공간 확보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl px-4">
                
                {/* 1. 최저가 확인 카드 */}
                <div 
                    onClick={() => handleNavigation('price', '/price')}
                    className="cursor-pointer bg-white rounded-[3rem] p-8 md:p-12 flex flex-col items-start border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all duration-300 group"
                >
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <span className="text-4xl">🛒</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 tracking-tight break-words w-full">{t.price_title}</h2>
                    <p className="text-slate-400 text-sm md:text-base mb-8 leading-relaxed font-medium break-words w-full">{t.price_subtitle}</p>
                    <div className="mt-auto bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl text-sm font-black flex items-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {currentLang === 'ko' ? '최저가 확인' : 'Preise prüfen'} <span>→</span>
                    </div>
                </div>

                {/* 2. 레시피 만들기 카드 */}
                <div 
                    onClick={() => handleNavigation('recipe', '/recipe')}
                    className="cursor-pointer bg-white rounded-[3rem] p-8 md:p-12 flex flex-col items-start border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-indigo-500 transition-all duration-300 group"
                >
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                        <span className="text-4xl">👩‍🍳</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 tracking-tight break-words w-full">{t.title}</h2>
                    <p className="text-slate-400 text-sm md:text-base mb-8 leading-relaxed font-medium break-words w-full">{t.subtitle}</p>
                    <div className="mt-auto bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl text-sm font-black flex items-center gap-2 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {currentLang === 'ko' ? '레시피 만들기' : 'Rezept erstellen'} <span>→</span>
                    </div>
                </div>
            </div>

            {/* 레시피 목록 섹션 */}
            {recipes.length > 0 && (
                <div className="mt-40 w-full max-w-6xl px-4">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-10">{t.recent_title}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {recipes.map((r) => (
                            <div key={r.id} className="bg-slate-50 p-8 rounded-[2.5rem] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                                <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{r.title}</h4>
                                <p className="text-slate-400 text-xs line-clamp-2 break-words">{r.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeView;