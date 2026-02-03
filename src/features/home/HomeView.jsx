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

{/* Explore 아이콘 아래 - 중간 광고/홍보 섹션 */}
{/* <div className="w-full max-w-4xl mb-20 px-4">
    <div className="relative group cursor-pointer overflow-hidden rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 p-8 md:p-10 transition-all hover:border-indigo-300">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
                <div className="text-3xl">📺</div>
                <div>
                    <h4 className="text-lg font-bold text-slate-700">독일 생활 정보가 더 궁금하다면?</h4>
                    <p className="text-slate-400 text-sm font-medium">유튜브에서 '독일 생활 브이로그'를 확인해보세요!</p>
                </div>
            </div>
            <button className="bg-white text-slate-600 px-6 py-3 rounded-xl text-xs font-bold border border-slate-200 shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                채널 구경하기
            </button>
        </div>
        
        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
</div> */}

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