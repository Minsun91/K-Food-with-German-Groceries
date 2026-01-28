import React from 'react';
import { BEST_MENU_K10 } from '../../constants/menuData';

const RecipeGenerator = ({ 
    t, 
    currentLang, 
    userPrompt, 
    setUserPrompt, 
    isLoading, 
    onGenerate, 
    getRateLimitMessage 
}) => {
    return (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/40 transition-all">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">🍳 {t?.title}</h2>
                <p className="text-sm text-slate-400 font-medium mt-2">{t?.subtitle}</p>
            </div>

            {/* 추천 메뉴 버튼들 */}
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {BEST_MENU_K10.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            const menuName = currentLang === 'ko' ? item.name_ko : (currentLang === 'de' ? item.name_de : item.name_en);
                            setUserPrompt(menuName);
                        }}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95"
                    >
                        {item.icon} {currentLang === 'ko' ? item.name_ko : (currentLang === 'de' ? item.name_de : item.name_en)}
                    </button>
                ))}
            </div>

            {/* 입력창 */}
            <textarea
                className="w-full p-6 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-3xl resize-none min-h-[160px] text-base transition-all outline-none"
                placeholder={t?.placeholder}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
            />

            {/* 생성 버튼 */}
            <button
                onClick={onGenerate}
                disabled={isLoading}
                className="w-full mt-6 bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
                {isLoading ? t?.button_loading : t?.button_ready}
            </button>

            {/* 한도 메시지 */}
            <div className="mt-4">{getRateLimitMessage && getRateLimitMessage()}</div>
        </section>
    );
};

export default RecipeGenerator;