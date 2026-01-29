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
        <div className="flex flex-col items-center pt-20 pb-40 px-4 bg-white font-sans">
            {/* 메인 타이틀 & 설명 - langConfig 데이터 활용 */}
            <h1 className="text-5xl font-black text-slate-800 mb-6 tracking-tight text-center leading-tight">
                {currentLang === 'ko' ? (
                    <>독일 생활의 <span className="text-indigo-500 font-extrabold">스마트한</span> 선택</>
                ) : (
                    t.title
                )}
            </h1>
            <p className="text-slate-500 text-lg mb-16 text-center max-w-2xl leading-relaxed">
                {t.subtitle || t.desc} 
            </p>

            {/* 통계 섹션 */}
            <div className="flex gap-20 mb-20 text-center">
                <div>
                    <div className="text-3xl font-black text-indigo-500 mb-1">7+</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.mart_compare}</div>
                </div>
                <div>
                    <div className="text-3xl font-black text-indigo-500 mb-1">20+</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.recent_title.split(' ')[0]}</div>
                </div>
                <div>
                    <div className="text-3xl font-black text-indigo-500 mb-1 font-mono">FREE</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentLang === 'ko' ? '이용 금액' : 'Price'}</div>
                </div>
            </div>

            {/* 커피 후원 섹션 (langConfig 데이터 활용) */}
            <div className="w-full max-w-3xl bg-[#FFFCF0] border border-yellow-100 rounded-[3rem] p-6 flex justify-between items-center mb-16 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 ml-4">
                    <span className="text-2xl animate-pulse">🌱</span>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{t.coffee_title}</div>
                        <div className="text-slate-400 text-[11px] mt-1">{t.coffee_desc}</div>
                    </div>
                </div>
                <a href="https://ko-fi.com/kfoodtracker" target="_blank" rel="noopener noreferrer"
                   className="bg-[#0F172A] text-white px-6 py-3 rounded-2xl text-xs font-bold mr-4 hover:bg-indigo-600 transition-all active:scale-95">
                    {t.coffee_button}
                </a>
            </div>

            {/* Explore 아이콘 */}
            <div className="flex flex-col items-center gap-2 text-slate-300 mb-20">
                <span className="text-[10px] font-black tracking-[0.3em] uppercase italic">Explore</span>
                <span className="text-xl animate-bounce">↓</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl px-6">
                
                {/* 1. 최저가 확인 카드 */}
                <div 
                    onClick={() => handleNavigation('price', '/price')}
                    className="cursor-pointer bg-white rounded-[3.5rem] p-16 flex flex-col items-start border-2 border-slate-50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:border-indigo-500 transition-all duration-500 group relative"
                >
                    <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 group-hover:scale-125 group-hover:rotate-6 transition-transform duration-500 ease-out">
                        <span className="text-5xl">🛒</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tight">{t.price_title}</h2>
                    <p className="text-slate-400 text-lg mb-12 leading-relaxed font-medium">{t.price_subtitle}</p>
                    <div className="bg-indigo-50 text-indigo-600 px-10 py-5 rounded-[1.5rem] text-base font-black flex items-center gap-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {currentLang === 'ko' ? '최저가 확인' : 'Check Prices'} <span className="text-xl">→</span>
                    </div>
                </div>

                {/* 2. 레시피 만들기 카드 */}
                <div 
                    onClick={() => handleNavigation('recipe', '/recipe')}
                    className="cursor-pointer bg-white rounded-[3.5rem] p-16 flex flex-col items-start border-2 border-slate-50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:border-indigo-500 transition-all duration-500 group relative"
                >
                    <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 group-hover:scale-125 group-hover:-rotate-6 transition-transform duration-500 ease-out">
                        <span className="text-5xl">👩‍🍳</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tight">{t.title}</h2>
                    <p className="text-slate-400 text-lg mb-12 leading-relaxed font-medium">{t.subtitle}</p>
                    <div className="bg-indigo-50 text-indigo-600 px-10 py-5 rounded-[1.5rem] text-base font-black flex items-center gap-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {currentLang === 'ko' ? '레시피 만들기' : 'Create Recipe'} <span className="text-xl">→</span>
                    </div>
                </div>
            </div>

           {/* 레시피 목록 섹션 (가져온 데이터 바인딩) */}
            {recipes.length > 0 && (
                <div className="mt-40 w-full max-w-6xl px-6">
                    <h3 className="text-3xl font-black text-slate-800 mb-12">{t.recent_title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {recipes.map((r) => (
                            <div key={r.id} className="bg-slate-50 p-10 rounded-[3rem] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer group">
                                <h4 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">{r.title}</h4>
                                <p className="text-slate-400 text-sm line-clamp-2">{r.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeView;