import React from 'react';
import { Link, useLocation } from 'react-router-dom'; // 👈 useLocation이 꼭 있어야 합니다!

const Header = ({ currentLang, setCurrentLang }) => {
    const location = useLocation();

    // 언어별 메뉴 텍스트 설정
    const menuText = {
        ko: { price: "최저가", recipe: "레시피", community: "커뮤니티" },
        en: { price: "Prices", recipe: "Recipes", community: "Community" },
        de: { price: "Preise", recipe: "Rezepte", community: "Community" }
    };

    const t = menuText[currentLang] || menuText['ko'];
    
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
               <Link to="/">
    <h1 className="text-xl font-black text-indigo-900 cursor-pointer">
        K-Food <span className="text-indigo-500 font-light">Tracker</span>
    </h1>
</Link>

              <nav className="flex md:flex items-center gap-6 md:gap-8">
  <Link
    to="/price"
    className="flex items-center gap-1.5 text-lg md:text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
  >
    🛒
    <span
      className={`hidden md:inline ${
        location.pathname === '/price'
          ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5'
          : ''
      }`}
    >
      {t.price}
    </span>
  </Link>

  <Link
    to="/recipe"
    className="flex items-center gap-1.5 text-lg md:text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
  >
    👩‍🍳
    <span
      className={`hidden md:inline ${
        location.pathname === '/recipe'
          ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5'
          : ''
      }`}
    >
      {t.recipe}
    </span>
  </Link>

  <Link
    to="/community"
    className="flex items-center gap-1.5 text-lg md:text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
  >
    🤝
    <span
      className={`hidden md:inline ${
        location.pathname === '/community'
          ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5'
          : ''
      }`}
    >
      {t.community}
    </span>
  </Link>
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