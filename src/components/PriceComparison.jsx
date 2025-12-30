import React, { useState } from 'react';

const PriceComparison = () => {
  const [prices] = useState([
    { id: 1, item: "김포쌀 (9.07kg)", mart: "한독몰", price: "27.90", link: "https://handokmall.de/kr/gimpo-gimpo-9.07kg/16010" },
    { id: 2, item: "김포쌀 (9.07kg)", mart: "와이마트", price: "29.90", link: "https://www.y-mart.de/de/kategorie/reis-getreide-obst-gemuese/reis-brauner-reis-klebreis-schwarzer-reis/kimpo-kimpo-reis.9120027410031-1253863977.html" },
    { id: 3, item: "종가집 포기김치 (1kg)", mart: "한독몰", price: "12.50", link: "https://handokmall.de/kr/jonggajip-pogigimchi-1kg-naengjang/11289" },
    { id: 4, item: "종가집 포기김치 (1kg)", mart: "다와요", price: "9.34", link: "https://dawayo.de/product/sale-%ec%a2%85%ea%b0%80%ec%a7%91-%ed%8f%ac%ea%b8%b0%ea%b9%80%ec%b9%98-1kg-2/" },
    { id: 5, item: "종가집 포기김치 (1kg)", mart: "K-Shop", price: "13.50", link: "https://k-shop.eu/ko/kimchi-tofu-gesalzen-gekuhlt/13110-%EB%83%89%EC%9E%A5-%EC%A2%85%EA%B0%80%EC%A7%91-%ED%8F%AC%EA%B8%B0%EA%B9%80%EC%B9%98-1kg-%EC%9C%A0%ED%86%B5%EA%B8%B0%ED%95%9C-30042022-808248144025.html" },
    { id: 6, item: "종가집 포기김치 (1kg)", mart: "와이마트", price: "14.60", link: "https://www.y-mart.de/de/kategorie/kuehlkost/kimchi-beilagen/jongga-pogi-kimchi-ganz.0808248144025-1119131758.html" },
    { id: 7, item: "신라면 번들", mart: "와이마트", price: "7.59", link: "https://www.y-mart.de/de/kategorie/ramen-nudeln/ramen-instant-noodeln/nongshim-shin-ramen-buendel.8801043014830-1192752829.html" },
    { id: 8, item: "신라면 번들", mart: "한독몰", price: "6.99", link: "https://handokmall.de/kr/nongsim-sinramyeon-5gaeip/13103" },
    { id: 9, item: "신라면 번들", mart: "다와요", price: "14.60", link: "https://dawayo.de/product/%eb%82%b4%ec%88%98%ec%9a%a9-%eb%86%8d%ec%8b%ac-%ec%8b%a0%eb%9d%bc%eb%a9%b4-%eb%a9%80%ed%8b%b0-600g120g5-2/" },
  ]);

  const categories = ["김포쌀", "종가집 포기김치", "신라면"];

  // 마트별 테마 컬러 설정
  const martThemes = {
    '한독몰': 'bg-red-50 text-red-700 border-red-100',
    '와이마트': 'bg-blue-50 text-blue-700 border-blue-100',
    '다와요': 'bg-orange-50 text-orange-700 border-orange-100',
    'K-Shop': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 mt-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800">🇰🇷 한인마트 실시간 최저가</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">인기 품목별 가장 저렴한 마트를 확인하세요.</p>
        </div>
        <span className="text-xs text-gray-400 font-medium italic bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          Last update: Today 09:00
        </span>
      </div>

      <div className="space-y-10">
        {categories.map((catName) => {
          const filteredItems = prices.filter(p => p.item.includes(catName));
          if (filteredItems.length === 0) return null;

          return (
            <div key={catName}>
              <h3 className="font-bold text-indigo-600 mb-5 flex items-center gap-2 text-xl">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">✓</span>
                {filteredItems[0].item}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredItems.map(p => (
    <a 
      key={p.id} 
      href={p.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group flex flex-col p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 hover:bg-slate-50/50 transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-6">
        {/* 마트 뱃지도 배경을 투명하게 하고 테두리만 강조 */}
        <span className={`px-3 py-1 rounded-full text-[10px] font-black border tracking-tighter ${martThemes[p.mart] || 'border-slate-200 text-slate-500'}`}>
          {p.mart}
        </span>
        <span className="text-[10px] text-slate-300 font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
          Direkt Link ↗
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Current Price</span>
          <span className="text-2xl font-black text-slate-800 tracking-tighter">€{p.price}</span>
        </div>
        
        {/* ✅ 배경색을 없애고 호버 시에만 아이콘 색상이 변하도록 수정 */}
        <div className="w-10 h-10 flex items-center justify-center text-slate-300 group-hover:text-slate-800 transition-colors duration-300">
          <span className="text-xl grayscale group-hover:grayscale-0 transition-all">🛒</span>
        </div>
      </div>
    </a>
  ))}
</div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-50 text-center">
        <p className="text-[11px] text-gray-400 font-medium">
          * 배송비 정책은 각 마트 사이트에서 확인해 주세요. 
          <br className="sm:hidden" />
          <span className="mx-2 hidden sm:inline">|</span>
          수익이 서비스 운영비로 사용될 수 있게 도와주세요.
        </p>
      </div>
    </div>
  );
};

export default PriceComparison;