import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase"; 
import { shareToKakao, shareToWhatsApp } from "../../utils/share";
import { langConfig } from '../../constants/langConfig';

const MARTS = [
  { id: "handokmall", name: "한독몰", color: "bg-blue-500" },
  { id: "ymart", name: "와이마트", color: "bg-yellow-500" },
  { id: "kocket", name: "코켓", color: "bg-orange-500" },
  { id: "kshop", name: "K-Shop", color: "bg-green-600" },
  { id: "joybuy", name: "Joybuy", color: "bg-indigo-500" },
  { id: "goasia", name: "GoAsia", color: "bg-red-500" },
  { id: "momogo", name: "momogo", color: "bg-teal-500" },
  { id: "stylevana", name: "Stylevana", color: "bg-pink-500" },
  { id: "douglas", name: "Douglas", color: "bg-emerald-600" },
  { id: "flaconi", name: "Flaconi", color: "bg-purple-500" },
  { id: "sephora", name: "Sephora", color: "bg-slate-900" },
];

// 🔥 living 카테고리 적용 및 키워드 보완
const SUB_CATEGORIES = [
  { id: "all", name: "전체", emoji: "🏷️" },
  { id: "noodle", name: "라면", emoji: "🍜", keywords: ["라면", "면", "udon", "noodle", "ramen"] },
  { id: "rice", name: "쌀/곡류", emoji: "🌾", keywords: ["쌀", "햇반", "밥", "rice"] },
  { id: "sauce", name: "소스/양념", emoji: "🥫", keywords: ["장", "고추장", "된장", "간장", "소스", "sauce", "paste"] },
  { id: "snack", name: "스낵/간식", emoji: "🍪", keywords: ["스낵", "과자", "파이", "초코", "snack", "chip"] },
  { id: "living", name: "가전", emoji: "🔌", keywords: ["밥솥", "쿠쿠", "쿠첸", "가전", "포트", "cooker"] },
];

const PriceComparison = ({ currentLang }) => {
    
    const currentLangConfig = langConfig[currentLang] || langConfig.ko;
    const t = new Proxy(
      (key) => currentLangConfig[key] || key,
      {
        get: (target, prop) => currentLangConfig[prop] || target[prop]
      }
    );
    
    const [searchParams, setSearchParams] = useSearchParams();

  const categoryTab = searchParams.get("cat") || null;
  const subCatFilter = searchParams.get("sub") || "all";
  const urlSearchTerm = searchParams.get("q") || "";
  const selectedItemName = searchParams.get("item") || null;
  const packFilter = searchParams.get("pack") || "all";

  // 🔥 한글 입력 씹힘/자음 분리 방지를 위한 Local State
  const [searchInput, setSearchInput] = useState(urlSearchTerm);
  const [rawPrices, setRawPrices] = useState([]);
  const [loading, setLoading] = useState(false);

  // URL searchParam 변경 시 local state 동기화
  useEffect(() => {
    setSearchInput(urlSearchTerm);
  }, [urlSearchTerm]);

  const updateQueryParams = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const updated = { ...current, ...newParams };
    Object.keys(updated).forEach((key) => {
      if (!updated[key] || updated[key] === "all") delete updated[key];
    });
    setSearchParams(updated);
  };

  const handleSelectCategory = (cat) => {
    if (cat) setSearchParams({ cat });
    else setSearchParams({});
  };

  // 🔥 검색창 입력 시 한글 조합 유지
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    updateQueryParams({ q: val });
  };

  // Firestore DB 로드
  useEffect(() => {
    if (!categoryTab) return;

    const fetchFirestoreData = async () => {
      setLoading(true);
      try {
        const collectionName = categoryTab === "beauty" ? "beauty_prices" : "prices";
        const docRef = doc(db, collectionName, "latest");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const docData = docSnap.data();
          let itemsArray = [];

          if (Array.isArray(docData.data)) {
            itemsArray = docData.data;
          } else if (typeof docData === "object") {
            itemsArray = Object.values(docData).filter(
              (val) => typeof val === "object" && val !== null && (val.searchKeyword || val.item || val.price)
            );
          }
          setRawPrices(itemsArray);
        } else {
          setRawPrices([]);
        }
      } catch (error) {
        console.error("Firestore 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFirestoreData();
  }, [categoryTab]);

  // 데이터 그룹화 및 category 필드 보존
  const groupedProducts = useMemo(() => {
    if (!rawPrices || rawPrices.length === 0) return [];

    const map = new Map();

    rawPrices.forEach((entry) => {
      const rawKeyword = entry.searchKeyword || entry.originalItemName || entry.item || "기타 상품";
      const cleanKeyword = String(rawKeyword).trim();

      const isSingle = entry.packType === "single";
      const pType = isSingle ? "single" : "bundle";
      const groupKey = `${cleanKeyword}_${pType}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: groupKey,
          nameKey: cleanKeyword,
          nameKo: cleanKeyword,
          nameEn: entry.item || cleanKeyword,
          mainCategory: categoryTab,
          // 🔥 DB에 정해져있는 subCategory 또는 category 값 저장 (예: "living")
          subCategory: entry.subCategory || entry.category || null, 
          packType: pType,
          prices: {},
        });
      }

      const product = map.get(groupKey);
      const martKey = entry.mart ? String(entry.mart).trim() : "일반마트";

      product.prices[martKey] = {
        martName: martKey,
        price: parseFloat(entry.price) || 0,
        url: entry.link || "#",
        packSize: entry.packSize || "",
        packType: pType,
      };
    });

    return Array.from(map.values());
  }, [rawPrices, categoryTab]);

  // 🔥 DB의 living 필드 및 키워드 혼용 판별 + 필터링
  const filteredProducts = useMemo(() => {
    return groupedProducts.filter((item) => {
      // 1. single / bundle 필터
      if (packFilter !== "all" && item.packType !== packFilter) {
        return false;
      }

      // 2. 세부 카테고리 필터 (DB category 우선 검사 -> 키워드 보완)
      if (subCatFilter !== "all") {
        const itemSubCategory = (item.subCategory || "").toLowerCase();

        // 2-1. DB에 "living" 등의 값이 지정되어 있을 때
        if (itemSubCategory) {
          if (itemSubCategory !== subCatFilter) return false;
        } else {
          // 2-2. DB에 값이 없을 때 키워드로 보완
          const targetSub = SUB_CATEGORIES.find((s) => s.id === subCatFilter);
          if (targetSub && targetSub.keywords) {
            const match = targetSub.keywords.some((kw) =>
              item.nameKo.toLowerCase().includes(kw) || item.nameEn.toLowerCase().includes(kw)
            );
            if (!match) return false;
          }
        }
      }

      // 3. 검색어 필터
      if (!searchInput.trim()) return true;
      const term = searchInput.toLowerCase();
      return item.nameKo?.toLowerCase().includes(term) || item.nameEn?.toLowerCase().includes(term);
    });
  }, [groupedProducts, searchInput, packFilter, subCatFilter]);

  const selectedItem = useMemo(() => {
    if (!selectedItemName) return null;
    return groupedProducts.find((p) => p.id === selectedItemName) || null;
  }, [groupedProducts, selectedItemName]);

  const getLowestPrice = (pricesMap) => {
    const values = Object.values(pricesMap).map((p) => p.price).filter((p) => p > 0);
    return values.length > 0 ? Math.min(...values) : null;
  };

  const handleShareClick = (type, product, e) => {
    if (e) e.stopPropagation();

    const lowestPrice = getLowestPrice(product.prices);

    const sharePayload = {
      name: product.nameKo,
      title: product.nameKo,
      item: product.nameKo,
      price: lowestPrice ? lowestPrice.toFixed(2) : "0.00",
      category: categoryTab,
    };

    if (type === "kakao") {
      shareToKakao(sharePayload, currentLang);
    } else if (type === "whatsapp") {
      shareToWhatsApp(sharePayload, currentLang);
    }
  };

  if (!categoryTab) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 text-center">
       <h1>{t.title_food}</h1>
       <p className="text-slate-500 mb-10">{t.landing_sub}</p> {/* 👈 t.landing_sub 객체 접근으로 수정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <button
            onClick={() => handleSelectCategory("food")}
            className="p-8 bg-orange-50 border-2 border-orange-200 hover:border-orange-500 rounded-3xl text-left cursor-pointer transition-all hover:-translate-y-1 shadow-sm"
          >
            <div className="text-4xl mb-4">🛒</div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">{t.food_label}</h2>
            <p className="text-xs text-slate-500">{t.food_desc}</p>
          </button>

          <button
            onClick={() => handleSelectCategory("beauty")}
            className="p-8 bg-pink-50 border-2 border-pink-200 hover:border-pink-500 rounded-3xl text-left cursor-pointer transition-all hover:-translate-y-1 shadow-sm"
          >
            <div className="text-4xl mb-4">💄</div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">{t.beauty_label}</h2>
            <p className="text-xs text-slate-500">{t.beauty_desc}</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button
            onClick={() => handleSelectCategory(null)}
            className="text-xs font-bold text-slate-400 hover:text-indigo-600 mb-2 inline-block cursor-pointer"
          >
            {t.change_category}
          </button>
          <h1 className="text-3xl font-black text-slate-800">
            {categoryTab === "food" ? t.title_food : t.title_beauty}
          </h1>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => handleSelectCategory("food")}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              categoryTab === "food" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500"
            }`}
          >
            🛒 Food
          </button>
          <button
            onClick={() => handleSelectCategory("beauty")}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              categoryTab === "beauty" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500"
            }`}
          >
            💄 Beauty
          </button>
        </div>
      </div>

      {/* 세부 카테고리 필터 */}
      {categoryTab === "food" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {SUB_CATEGORIES.map((sub) => (
            <button
              key={sub.id}
              onClick={() => updateQueryParams({ sub: sub.id })}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                subCatFilter === sub.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub.emoji} {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* 검색 바 & 싱글/번들 탭 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
        <input
          type="text"
          placeholder={categoryTab === "food" ? t.foodPlaceholder : t.beautyPlaceholder}
          value={searchInput}
          onChange={handleSearchChange}
          className="w-full sm:w-80 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
        />

        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto justify-center">
          <button
            onClick={() => updateQueryParams({ pack: "all" })}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              packFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.filter_all}
          </button>
          <button
            onClick={() => updateQueryParams({ pack: "single" })}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              packFilter === "single" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            📦 {t.single}
          </button>
          <button
            onClick={() => updateQueryParams({ pack: "bundle" })}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-all ${
              packFilter === "bundle" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            🎁 {t.bundle}
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-bold">
          <div className="text-3xl mb-2 animate-spin">🔄</div>
          {t.loading}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed text-slate-400 font-bold">
          {t.no_price_data}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const lowestPrice = getLowestPrice(product.prices);

            return (
              <div
                key={product.id}
                onClick={() => updateQueryParams({ item: product.id })}
                className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{categoryTab === "food" ? "🍜" : "✨"}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {product.packType === "single" ? `📦 ${t.single}` : `🎁 ${t.bundle}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleShareClick("kakao", product, e)}
                        className="w-7 h-7 bg-yellow-300 hover:bg-yellow-400 text-yellow-950 font-black rounded-full text-xs flex items-center justify-center shadow-sm transition-transform hover:scale-110"
                        title="카카오톡 공유"
                      >
                        💬
                      </button>
                      <button
                        onClick={(e) => handleShareClick("whatsapp", product, e)}
                        className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full text-xs flex items-center justify-center shadow-sm transition-transform hover:scale-110"
                        title="WhatsApp 공유"
                      >
                        📱
                      </button>
                      {lowestPrice && (
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black px-3 py-1 rounded-full ml-1">
                          {t.best_price} €{lowestPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                    {product.nameKo}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-1">{product.nameEn}</p>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-4 space-y-2.5">
                  {Object.entries(product.prices).map(([martName, p]) => {
                    const isMin = p.price === lowestPrice;
                    const martMeta = MARTS.find((m) => m.name === martName) || { color: "bg-slate-400" };

                    return (
                      <div key={martName} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${martMeta.color}`}></span>
                          {martName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-black ${isMin ? "text-emerald-600 text-sm" : "text-slate-700"}`}>
                            €{p.price.toFixed(2)}
                          </span>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-lg font-bold transition-all"
                          >
                            {t.go_link} ↗
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => updateQueryParams({ item: null })}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-800">{selectedItem.nameKo}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {selectedItem.packType === "single" ? `📦 ${t.single}` : `🎁 ${t.bundle}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selectedItem.nameEn}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleShareClick("kakao", selectedItem, e)}
                  className="px-2.5 py-1 bg-yellow-300 hover:bg-yellow-400 text-yellow-950 font-bold text-xs rounded-xl shadow-sm"
                >
                  💬 카카오톡
                </button>
                <button
                  onClick={(e) => handleShareClick("whatsapp", selectedItem, e)}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  📱 WhatsApp
                </button>
                <button
                  onClick={() => updateQueryParams({ item: null })}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 font-bold cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase">{t.modal_title}</h4>

            <div className="space-y-3">
              {Object.entries(selectedItem.prices).map(([martName, p]) => (
                <div
                  key={martName}
                  className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">{martName}</span>
                    {p.packSize && (
                      <span className="text-[11px] text-slate-400">
                        {t.capacity}: {p.packSize} ({p.packType === "single" ? t.single : t.bundle})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900 text-base">€{p.price.toFixed(2)}</span>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      {t.buy_now} ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceComparison;