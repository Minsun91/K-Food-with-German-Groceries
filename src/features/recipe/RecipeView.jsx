import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../utils/firebase';
import { 
    collection, query, orderBy, limit, getDocs, startAfter, doc, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import RecipeModal from '../../components/RecipeModal';
import { langConfig as staticLangConfig } from '../../constants/langConfig';
import { shareToKakao, shareToWhatsApp } from '../../utils/share';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const MAX_CALLS_PER_HOUR = 25;
const RATE_LIMIT_DURATION_MS = 3600000;

const RecipeView = ({ currentLang = 'ko', langConfig: propsLangConfig, rateLimit, setRateLimit, userId, appId }) => {
    const [userPrompt, setUserPrompt] = useState("");
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [recentRecipes, setRecentRecipes] = useState([]);
    const [lastVisible, setLastVisible] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const finalLangConfig = propsLangConfig && Object.keys(propsLangConfig).length > 0 ? propsLangConfig : staticLangConfig;
    const t = finalLangConfig[currentLang] || finalLangConfig['ko'] || {};

    const quickTags = {
        ko: [
            { emoji: "🔥", label: "제육볶음" }, { emoji: "🥘", label: "된장찌개" }, 
            { emoji: "🍲", label: "김치찌개" }, { emoji: "🥩", label: "불고기" }, 
            { emoji: "🍗", label: "닭갈비" }, { emoji: "🌶️", label: "떡볶이" }, 
            { emoji: "🥣", label: "미역국" }, { emoji: "🥗", label: "비빔밥" }, 
            { emoji: "🥞", label: "파전" }, { emoji: "🥓", label: "보쌈" }
        ],
        en: [
            { emoji: "🔥", label: "Jeyuk" }, { emoji: "🥘", label: "Doenjang Stew" }, 
            { emoji: "🍲", label: "Kimchi Stew" }, { emoji: "🥩", label: "Bulgogi" }, 
            { emoji: "🍗", label: "Dak-galbi" }, { emoji: "🌶️", label: "Tteokbokki" }, 
            { emoji: "🥣", label: "Seaweed Soup" }, { emoji: "🥗", label: "Bibimbap" }, 
            { emoji: "🥞", label: "Pajeon" }, { emoji: "🥓", label: "Bossam" }
        ],
        de: [
            { emoji: "🔥", label: "Jeyuk" }, { emoji: "🥘", label: "Sojabohnen Eintopf" }, 
            { emoji: "🍲", label: "Kimchi Eintopf" }, { emoji: "🥩", label: "Bulgogi" }, 
            { emoji: "🍗", label: "Dak-galbi" }, { emoji: "🌶️", label: "Tteokbokki" }, 
            { emoji: "🥣", label: "Algensuppe" }, { emoji: "🥗", label: "Bibimbap" }, 
            { emoji: "🥞", label: "Pfannkuchen" }, { emoji: "🥓", label: "Bossam" }
        ]
    };

    const currentTags = quickTags[currentLang] || quickTags['ko'];

    const fetchRecipes = async (isFirst = true) => {
        if (!db) return;
        try {
            const recipesRef = collection(db, "artifacts", "recipe-blog-vsc-001", "public_recipes");
            const q = isFirst 
                ? query(recipesRef, orderBy("timestamp", "desc"), limit(6))
                : query(recipesRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(6));

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                if (isFirst) setRecentRecipes([]);
                setHasMore(false);
                return;
            }
            const newRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setRecentRecipes(prev => isFirst ? newRecipes : [...prev, ...newRecipes]);
            if (snapshot.docs.length < 6) setHasMore(false); // 6개 미만이면 더 가져올 게 없음
        } catch (error) { console.error("Error:", error); }
    };

    useEffect(() => { fetchRecipes(true); }, [db]);

    const handleGenerateRecipe = async () => {
        window.gtag?.('event', 'generate_recipe', {
          recipe_query: userPrompt,
          language: currentLang
        });
      
        if (isLoading || !userId) return;
        if (!userPrompt) return showMsg("메뉴를 입력해주세요.", "error");
      
        if (rateLimit.count >= MAX_CALLS_PER_HOUR && rateLimit.resetTime > Date.now()) {
          const mins = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
          return showMsg(`${mins}분 후에 다시 시도해주세요.`, "error");
        }
      
        setIsLoading(true);
        setGeneratedRecipe(null);
      
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `Create a Korean recipe for "${userPrompt}" using ingredients from German supermarkets.
      Output valid JSON only with keys:
      name_${currentLang}, description_${currentLang}, ingredients (array), steps_${currentLang} (array).`;
      
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const cleanJson = text.replace(/```json|```/g, "").trim();
          const rawData = JSON.parse(cleanJson);
      
          setGeneratedRecipe(rawData);
          setIsRecipeSaved(false);
      
          // rate limit 업데이트 (경로 정합 완료)
          const newCount = rateLimit.count + 1;
          const newReset =
            rateLimit.count === 0
              ? Date.now() + RATE_LIMIT_DURATION_MS
              : rateLimit.resetTime;
      
          await setDoc(
            doc(db, `rateLimit/${appId}/${userId}`),
            {
              count: newCount,
              resetTime: newReset,
              lastCall: serverTimestamp()
            },
            { merge: true }
          );
      
          setRateLimit({ count: newCount, resetTime: newReset });
          showMsg("레시피 생성 완료!", "success");
        } catch (error) {
          console.error("🔥 Generate error:", error);
          showMsg("생성 중 에러가 발생했습니다.", "error");
        } finally {
          setIsLoading(false);
        }
      };
      
      const handleSaveRecipe = async () => {
        if (!generatedRecipe || !userId) return;
      
        try {
          const recipeRef = doc(
            collection(db, `artifacts/${appId}/public_recipes`)
          );
      
          await setDoc(recipeRef, {
            ...generatedRecipe,
            userId,
            createdAt: serverTimestamp()
          });
      
          window.gtag?.('event', 'recipe_save', {
            recipe_name: generatedRecipe[`name_${currentLang}`]
          });
      
          setIsRecipeSaved(true);
          showMsg("커뮤니티에 저장되었습니다!", "success");
          fetchRecipes(true);
        } catch (error) {
          console.error("🔥 Save error:", error);
          showMsg("저장 권한이 없습니다.", "error");
        }
      };

    return (
        <div className="max-w-5xl mx-auto pt-4 pb-24 px-4 font-sans text-slate-800">
            {/* 생성기 섹션 */}
            <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-[0_15px_50px_rgba(0,0,0,0.03)] border border-slate-50 mb-12 text-center">
                <h1 className="text-2xl md:text-3xl font-black mb-4 flex items-center justify-center gap-2">
                    <span>🔍</span> {t.title}
                </h1>
                <p className="text-slate-400 font-bold text-base mb-8">{t.subtitle}</p>

                {/* 추천 태그: currentTags를 사용하여 현재 언어에 맞는 레이블 입력 */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {currentTags.map((tag, i) => (
                        <button key={i} onClick={() => setUserPrompt(tag.label)} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-600 hover:bg-indigo-50 transition-all">
                            {tag.emoji} {tag.label}
                        </button>
                    ))}
                </div>

                <div className="bg-[#F8FAFC] rounded-[2rem] p-6 mb-6 shadow-inner border border-slate-100">
                    {/* <label className="block text-left ml-2 mb-2 text-slate-400 font-bold text-xs">{t.prompt_label}</label> */}
                    <textarea 
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder={t.placeholder}
                        className="w-full bg-transparent border-none focus:ring-0 text-base font-bold text-slate-700 placeholder:text-slate-300 resize-none h-24"
                    />
                </div>

                {/* 버튼 크기 축소: py-5, text-lg로 조정 */}
                <button onClick={handleGenerateRecipe} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-[0.98] mb-4">
                    {isLoading ? "🍳..." : (t.button_ready || "레시피 생성하기 🍚")}
                </button>

                <div className="text-slate-400 font-bold text-xs text-left ml-2">
                    {currentLang === 'ko' ? <>1시간당 25회 중 <span className="text-emerald-500 font-black">{(MAX_CALLS_PER_HOUR - (rateLimit?.count || 0))}</span> 남음</> : <>Remaining: <span className="text-emerald-500 font-black">{(MAX_CALLS_PER_HOUR - (rateLimit?.count || 0))}</span> / 25</>}
                </div>
            </div>

            {/* 리스트 섹션 */}
            <div className="px-2">
                <div className="flex items-center gap-2 mb-8">
                    <div className="bg-indigo-50 w-9 h-9 rounded-xl flex items-center justify-center text-lg">✨</div>
                    <h3 className="text-xl font-black">{t.recent_title}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {recentRecipes.map(recipe => (
                        <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 cursor-pointer hover:shadow-md transition-all group flex flex-col justify-between h-44">
                            {/* 리스트 제목 크기: text-xl로 축소 */}
                            <h4 className="font-black text-xl group-hover:text-indigo-600 transition-colors text-slate-800">
                                {recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name}
                            </h4>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-200 font-black text-[10px] tracking-widest uppercase italic">VIEW RECIPE</span>
                                <span className="text-indigo-300 text-xl transform group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 하단 더보기 버튼 추가 */}
                {hasMore && (
                    <button 
                        onClick={() => fetchRecipes(false)}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-colors"
                    >
                        {currentLang === 'ko' ? "레시피 더보기 +" : "More Recipes +"}
                    </button>
                )}
            </div>

            {selectedRecipe && (
  <RecipeModal 
    recipe={selectedRecipe} 
    onClose={() => setSelectedRecipe(null)} 
    currentLang={currentLang} 
    t={t}
    shareToKakao={shareToKakao} 
    shareToWhatsApp={shareToWhatsApp}
    handleSaveRecipe={handleSaveRecipe}
    isFromSaved={true}   // ⭐ 추가: 저장된 레시피임을 명시
  />
)}
   </div>
    );
};

export default RecipeView;