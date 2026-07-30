import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { langConfig } from "../../constants/langConfig";

// 🌟 Swiper 라이브러리 및 CSS import
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

const HomeView = ({ currentLang, setCurrentLang, recipes = [] }) => {
  const navigate = useNavigate();

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

  const popularItems = [
    { name: "신라면 (Shin Ramyun)", tag: "BEST", price: "0,89 € ~", icon: "🍜" },
    { name: "종가집 김치 (Kimchi)", tag: "HOT", price: "3,49 € ~", icon: "🥬" },
    { name: "조선미녀 선크림 (Beauty of Joseon)", tag: "K-BEAUTY", price: "11,90 € ~", icon: "✨" },
    { name: "불닭볶음면 (Buldak)", tag: "POPULAR", price: "1,19 € ~", icon: "🔥" },
  ];

  return (
    <div className="flex flex-col items-center pt-16 md:pt-20 pb-40 px-4 bg-white font-sans overflow-x-hidden">
      {/* 🌟 스르르 부드럽게 흐르는 슬라이드 스타일 (linear transition) */}
      <style>{`
        .smooth-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
        }
      `}</style>

      {/* 상단 뱃지 */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black tracking-wider uppercase mb-6 shadow-xs">
        <span>🇩🇪</span> K-Food Helper in Germany
      </div>

      {/* 메인 타이틀 */}
      <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight text-center leading-[1.15] break-keep max-w-4xl">
        {currentLang === "ko" ? (
          <>
            독일 생활의 <span className="text-indigo-500 font-extrabold">스마트한</span> 선택
          </>
        ) : currentLang === "de" ? (
          <>
            Die <span className="text-indigo-500 font-extrabold">smarte</span> Wahl für Ihr Leben in Deutschland
          </>
        ) : (
          t.title
        )}
      </h1>

      {/* 서브 타이틀 */}
      <p className="text-slate-500 text-sm md:text-base mb-8 text-center max-w-2xl leading-relaxed font-medium px-4">
        {currentLang === "ko" ? (
          <>
            독일 마트(REWE, Lidl, Aldi) 재료로 즐기는 한식 레시피 & 최저가 비교<br />
            <span className="text-xs text-slate-400 font-normal">
              Create Korean recipes using ingredients easily found in German supermarkets.
            </span>
          </>
        ) : (
          "Create Korean recipes using ingredients easily found in German supermarkets & compare prices."
        )}
      </p>

      {/* 통계 섹션 */}
      <div className="flex flex-wrap justify-center gap-10 md:gap-20 mb-16 text-center">
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

      {/* 🌟 ✨ [스르르~ 흐르는 Continuous Ticker] ✨ 🌟 */}
      <div className="w-full max-w-4xl bg-slate-50/80 backdrop-blur border border-slate-100 rounded-3xl p-4 md:p-5 mb-12 shadow-inner">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Trending Price Tracking
          </span>
          <span 
            onClick={() => handleNavigation("price", "/price")}
            className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline flex items-center gap-0.5"
          >
            {currentLang === "ko" ? "전체 가격 비교" : "Alle Preise"} →
          </span>
        </div>
        
        {/* Swiper continuous ticker */}
        <Swiper
          modules={[Autoplay]}
          spaceBetween={16}
          slidesPerView={"auto"}
          loop={true}
          speed={4000} // 4초 동안 스르륵 물 흐르듯 지속 이동 (숫자가 커질수록 천천히 이동)
          autoplay={{
            delay: 0, // 멈춤 시간 0초!
            disableOnInteraction: false,
          }}
          className="w-full !py-1 smooth-swiper"
        >
          {/* 부드러운 무한 롤링을 위해 3번 늘려 렌더링 */}
          {[...popularItems, ...popularItems, ...popularItems].map((item, idx) => (
            <SwiperSlide key={idx} style={{ width: "220px", flexShrink: 0 }}>
              <div 
                onClick={() => handleNavigation("price", "/price")}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-full group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">
                    {item.tag}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                  {item.name}
                </div>
                <div className="text-xs font-black text-slate-900 mt-1">
                  {item.price}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* ☕ 커피 후원 섹션 */}
      <div className="w-full max-w-4xl mx-auto bg-[#FFFCF0] border border-yellow-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 mt-16 shadow-xs">
        <div className="flex items-center gap-5 text-left">
          <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-yellow-50">
            <span className="text-2xl md:text-3xl animate-pulse">🌱</span>
          </div>
          <div>
            <div className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[9px] font-black uppercase tracking-wider mb-1.5">
              Support
            </div>
            <h3 className="text-base md:text-lg font-black text-slate-800 leading-tight">
              {t.coffee_title}
            </h3>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              {t.coffee_desc}
            </p>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto">
          <a
            href="https://ko-fi.com/kfoodtracker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center bg-[#0F172A] text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-indigo-600 transition-all shadow-md text-center">
            {t.coffee_button}
          </a>
        </div>
      </div>

      {/* 🚀 WorldKJob 배너 섹션 */}
      <div className="w-full max-w-4xl mx-auto mt-6"> 
        <a 
          href="https://www.worldkjob.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-r from-[#FFF5F5] to-[#F5F3FF] border border-pink-100 shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
            <div className="flex items-center gap-5 md:gap-8 text-left">
              <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-pink-50 group-hover:rotate-3 transition-transform">
                <span className="text-2xl md:text-3xl">🚀</span>
              </div>
              <div>
                <div className="inline-block px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 text-[9px] font-black uppercase tracking-wider mb-1.5">
                  Career in Germany
                </div>
                <h3 className="text-base md:text-lg font-black text-slate-800 leading-tight">
                  독일 한인 회사 취업, <span className="text-indigo-500">월드케이잡</span>에서 확인하세요
                </h3>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  해외 한인 채용 정보 공유 사이트
                </p>
              </div>
            </div>
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