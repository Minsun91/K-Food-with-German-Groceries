import React from 'react';

const Header = ({ currentLang, setCurrentLang, activeTab, setActiveTab }) => {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
                <h1
                    className="text-xl font-black text-indigo-900 cursor-pointer"
                    onClick={() => setActiveTab('home')}
                >
                    K-Food <span className="text-indigo-500 font-light">Tracker</span>
                </h1>

                <nav className="flex items-center gap-2 md:gap-8">
                    <button
                        onClick={() => setActiveTab('price')}
                        className={`flex items-center gap-1 text-sm font-black ${activeTab === 'price' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
                    >
                        🛒 {currentLang === 'ko' ? '최저가' : 'Prices'}
                    </button>
                    <button
                        onClick={() => setActiveTab('recipe')}
                        className={`flex items-center gap-1 text-sm font-black ${activeTab === 'recipe' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
                    >
                        👩‍🍳 {currentLang === 'ko' ? '레시피' : 'Recipes'}
                    </button>
                    <button 
    onClick={() => setActiveTab('community')}
    className={`flex items-center gap-1 text-[13px] md:text-sm font-black whitespace-nowrap shrink-0 transition-all ${
        activeTab === 'community' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'
    }`}
>
    <span className="text-base">🤝</span>
    <span className="leading-none">{currentLang === 'ko' ? '커뮤니티' : 'Community'}</span>
</button>

                </nav>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['ko', 'en', 'de'].map(lang => (
                        <button
                            key={lang}
                            onClick={() => setCurrentLang(lang)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentLang === lang ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        </header>
    );
};

export default Header;