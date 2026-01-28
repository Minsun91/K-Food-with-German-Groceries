import React from 'react';

const RecentRecipes = ({ 
    t, 
    currentLang, 
    recentRecipes, 
    setSelectedRecipe, 
    hasMore, 
    fetchRecipes, 
    isMoreLoading 
}) => {
    return (
        <section className="mt-12">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600 text-sm">✨</span>
                {t?.recent_title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentRecipes.map((r) => (
                    <div 
                        key={r.id} 
                        onClick={() => setSelectedRecipe(r)} 
                        className="group p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-indigo-500 transition-all cursor-pointer"
                    >
                        <h3 className="font-bold text-slate-700 group-hover:text-indigo-600 truncate">
                            {r[`name_${currentLang}`] || r.name_ko || r.name}
                        </h3>
                        <div className="flex justify-between items-center mt-4">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                VIEW RECIPE
                            </span>
                            <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 레시피 더 보기 버튼 */}
            {hasMore && (
                <div className="flex justify-center mt-12">
                    <button
                        onClick={() => fetchRecipes(false)}
                        disabled={isMoreLoading}
                        className="px-10 py-4 rounded-2xl font-black text-sm bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isMoreLoading 
                            ? (currentLang === 'ko' ? "불러오는 중..." : "Loading...") 
                            : (currentLang === 'ko' ? "레시피 더 보기 +" : "Show More +")}
                    </button>
                </div>
            )}
        </section>
    );
};

export default RecentRecipes;