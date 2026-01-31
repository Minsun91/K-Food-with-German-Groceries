import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../utils/firebase';
import { 
    collection, query, orderBy, limit, getDocs, startAfter, doc, setDoc, getDoc, serverTimestamp 
} from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import RecipeModal from '../../components/RecipeModal';
import { langConfig as staticLangConfig } from '../../constants/langConfig';
import { shareToKakao, shareToWhatsApp } from '../../utils/share';
import { useSearchParams } from 'react-router-dom';
import { apiKey_gemini } from '../../utils/firebase';

const genAI = new GoogleGenerativeAI(apiKey_gemini);

const MAX_CALLS_PER_HOUR = 25;
const RATE_LIMIT_DURATION_MS = 3600000;

const RecipeView = ({ currentLang = 'ko', langConfig: propsLangConfig, rateLimit, setRateLimit, userId, appId }) => {
    const [userPrompt, setUserPrompt] = useState("");
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [generatedRecipe, setGeneratedRecipe] = useState(null); // 추가: 생성된 레시피 상태
    const [recentRecipes, setRecentRecipes] = useState([]);
    const [lastVisible, setLastVisible] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isRecipeSaved, setIsRecipeSaved] = useState(false);
    
    const [searchParams, setSearchParams] = useSearchParams(); // URL 파라미터 제어

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

    // 알림용 간단 함수 (alert 대용)
    const showMsg = (msg) => alert(msg);

    // --- 로직 1: URL에 recipeId가 있으면 자동으로 모달 띄우기 ---
    useEffect(() => {
      
      const recipeId = searchParams.get('recipeId');

        if (recipeId && db && appId) {
          const fetchSingleRecipe = async () => {
              try {
                  // 경로 주의: 실제 DB 구조가 artifacts > [appId] > public_recipes 인지 확인!
                  const docRef = doc(db, "artifacts", appId, "public_recipes", recipeId);
                  
                  const docSnap = await getDoc(docRef);
                  
                  if (docSnap.exists()) {
                      setSelectedRecipe({ id: docSnap.id, ...docSnap.data() });
                  } else {
                      console.warn("❌ 해당 ID의 레시피가 DB에 없습니다.");
                  }
              } catch (error) {
                  console.error("🔥 레시피 단일 로드 에러:", error);
              }
          };
          fetchSingleRecipe();
      }
  }, [searchParams, db, appId]);

// --- 로직 2: 레시피 목록 가져오기 (timestamp 기준 정렬) ---
const fetchRecipes = async (isFirst = true) => {
    if (!db) return;
    try {
        const recipesRef = collection(db, "artifacts", appId, "public_recipes");
        
        let q;
        if (isFirst) {
            // 기준을 timestamp로 변경
            q = query(recipesRef, orderBy("timestamp", "desc"), limit(6));
        } else {
            if (!lastVisible) {
                setHasMore(false);
                return;
            }
            // 기준을 timestamp로 변경
            q = query(recipesRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(6));
        }

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            if (isFirst) setRecentRecipes([]);
            setHasMore(false);
            return;
        }

        const newRecipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        if (isFirst) {
            setRecentRecipes(newRecipes);
        } else {
            // 중복 방지: 이미 있는 레시피는 제외하고 추가
            setRecentRecipes(prev => {
                const prevIds = new Set(prev.map(r => r.id));
                const uniqueNew = newRecipes.filter(r => !prevIds.has(r.id));
                return [...prev, ...uniqueNew];
            });
        }

        // 가져온 데이터가 6개 미만이면 진짜 마지막임
        if (snapshot.docs.length < 6) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }
        
    } catch (error) { 
        console.error("🔥 Fetch Error:", error); 
        // 💡 팁: orderBy 필드를 바꾸면 인덱스 에러가 날 수 있습니다. 
        // 콘솔창의 링크를 클릭해 새 인덱스를 만들어주세요!
        setHasMore(false);
    }
};

    useEffect(() => { fetchRecipes(true); }, [db, appId]);

    // --- 로직 3: AI 레시피 생성 ---
    const handleGenerateRecipe = async () => {
      if (isLoading || !userPrompt) return;
    
      // 1. 레이트 리밋 체크 (선택 사항: 호출 전 미리 막으려면 추가)
      if (rateLimit && rateLimit.count >= 5) { // 예: 5회 제한
        const now = Date.now();
        if (now < rateLimit.resetTime) {
          const waitMin = Math.ceil((rateLimit.resetTime - now) / 60000);
          alert(`${waitMin}분 후에 다시 시도해주세요.`);
          return;
        }
      }
    
      setIsLoading(true);
    
      try {
        // ⚠️ 요청하신 버전 절대 유지
        const model = genAI.getGenerativeModel({
          model: "models/gemini-2.5-flash-preview-09-2025"
        });
    
        // 프롬프트 강화: JSON 형식을 더 구체적으로 지정하여 파싱 에러 방지
        const prompt = `
          Create a detailed Korean recipe for "${userPrompt}" in language: ${currentLang}.
          
          IMPORTANT: Return ONLY a valid JSON object. 
          Do not include any markdown formatting like \`\`\`json.
          Do not include any conversational text or explanations.
          
          The JSON structure MUST be exactly like this:
          {
            "name_${currentLang}": "Recipe Name",
            "ingredients_${currentLang}": ["Ingredient 1", "Ingredient 2"],
            "steps_${currentLang}": ["Step 1", "Step 2"]
          }
        `;
    
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
    
        // 🔍 [에러 방지 핵심] JSON 정제 로직
        // JSON이 아닌 텍스트가 섞여 들어오는 경우를 대비해 { } 사이의 내용만 추출합니다.
        let cleaned = text.trim();
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
    
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error("Invalid JSON format received from AI");
        }
    
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        
        // 최종 파싱
        const recipe = JSON.parse(cleaned);
    
        // 상태 업데이트
        setSelectedRecipe(recipe);
    
        // ===== Rate limit 저장 로직 =====
        const newCount = (rateLimit?.count || 0) + 1;
        const newReset =
          !rateLimit || rateLimit.count === 0
            ? Date.now() + RATE_LIMIT_DURATION_MS
            : rateLimit.resetTime;
    
        await setDoc(
          doc(db, `rateLimit_${appId}`, userId),
          {
            count: newCount,
            resetTime: newReset,
            lastCall: serverTimestamp(),
          },
          { merge: true }
        );
    
        setRateLimit({ count: newCount, resetTime: newReset });
    
      } catch (error) {
        console.error("🔥 Gemini generate error:", error);
        // 사용자 피드백 추가
        alert("레시피 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsLoading(false);
      }
    };

// --- 로직 4: 레시피 저장 (핵심 수정) ---
const handleSaveRecipe = async (recipeData) => {
  // recipeToSave 대신 인자로 들어온 recipeData를 사용하거나 
  // 기존에 정의된 recipeToSave를 사용 (인자가 더 안전함)
  const targetData = recipeData || recipeToSave; 

  if (!targetData || !userId) return null;

  try {
      const recipesRef = collection(db, "artifacts", appId, "public_recipes");
      const newDocRef = doc(recipesRef); // 자동 ID 생성
      
      const saveData = {
          ...targetData,
          id: newDocRef.id, // 생성된 ID를 데이터에 포함
          userId,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp() 
      };

      await setDoc(newDocRef, saveData);

      setIsRecipeSaved(true);
      // showMsg("저장되었습니다!");
      fetchRecipes(true); 

      // ⭐ 핵심: 여기서 생성된 ID를 포함한 데이터를 통째로 혹은 ID만 리턴합니다.
      return { success: true, id: newDocRef.id }; 

  } catch (error) {
      console.error("🔥 Save error:", error);
      showMsg("저장 중 오류가 발생했습니다.");
      return null;
  }
};

const onUpdateRecipe = async (recipeId, updatedData) => {
    try {
        const docRef = doc(db, "artifacts", appId, "public_recipes", recipeId);
        await updateDoc(docRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        showMsg("레시피가 수정되었습니다!");
        fetchRecipes(true); // 목록 새로고침
    } catch (error) {
        console.error("Update Error:", error);
    }
};

    return (
        <div className="max-w-5xl mx-auto pt-4 pb-24 px-4 font-sans text-slate-800">
            {/* 생성기 섹션 */}
            <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-[0_15px_50px_rgba(0,0,0,0.03)] border border-slate-50 mb-12 text-center">
                <h1 className="text-2xl md:text-3xl font-black mb-4 flex items-center justify-center gap-2">
                    <span>🔍</span> {t.title || "AI K-Food Recipe"}
                </h1>
                <p className="text-slate-400 font-bold text-base mb-8">{t.subtitle}</p>

                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {currentTags.map((tag, i) => (
                        <button key={i} onClick={() => setUserPrompt(tag.label)} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-600 hover:bg-indigo-50 transition-all">
                            {tag.emoji} {tag.label}
                        </button>
                    ))}
                </div>

                <div className="bg-[#F8FAFC] rounded-[2rem] p-6 mb-6 shadow-inner border border-slate-100">
                    <textarea 
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder={t.placeholder}
                        className="w-full bg-transparent border-none focus:ring-0 text-base font-bold text-slate-700 placeholder:text-slate-300 resize-none h-24"
                    />
                </div>

                {/* 레시피 생성 버튼 */}
<button 
    onClick={handleGenerateRecipe} 
    disabled={isLoading} 
    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-[0.98] mb-4"
>
    {isLoading ? (
        currentLang === 'ko' ? "🍳 AI가 레시피를 짜는 중..." : 
        currentLang === 'de' ? "🍳 AI erstellt Rezept..." : "🍳 AI is cooking..."
    ) : (
        t.button_ready || (currentLang === 'ko' ? "레시피 생성하기 🍚" : "Generate Recipe 🍚")
    )}
</button>




                <div className="text-slate-400 font-bold text-xs text-left ml-2">
                    {currentLang === 'ko' ? <>1시간당 25회 중 <span className="text-emerald-500 font-black">{(MAX_CALLS_PER_HOUR - (rateLimit?.count || 0))}</span> 남음</> : <>Remaining: <span className="text-emerald-500 font-black">{(MAX_CALLS_PER_HOUR - (rateLimit?.count || 0))}</span> / 25</>}
                </div>
            </div>

            {/* 리스트 섹션 */}
            <div className="px-2">
                <div className="flex items-center gap-2 mb-8">
                    <div className="bg-indigo-50 w-9 h-9 rounded-xl flex items-center justify-center text-lg">✨</div>
                    <h3 className="text-xl font-black">{t.recent_title || "Recent Recipes"}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {recentRecipes.map(recipe => (
                        <div key={recipe.id} onClick={() => {
                            setSelectedRecipe(recipe);
                            setSearchParams({ recipeId: recipe.id }); // URL 업데이트
                        }} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 cursor-pointer hover:shadow-md transition-all group flex flex-col justify-between h-44">
                            <h4 className="font-black text-xl group-hover:text-indigo-600 transition-colors text-slate-800 break-words line-clamp-2">
                                {recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name}
                            </h4>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-200 font-black text-[10px] tracking-widest uppercase italic">VIEW RECIPE</span>
                                <span className="text-indigo-300 text-xl transform group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 레시피 목록 아래 배치 */}

<div className="mt-10 mb-10 px-4">
    {hasMore ? (
        <button 
            onClick={() => fetchRecipes(false)} // false를 넘겨서 더보기 로직 실행
            className="w-full py-5 bg-white border-2 border-indigo-100 rounded-[2rem] text-indigo-600 font-black text-base shadow-sm hover:bg-indigo-50 hover:border-indigo-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
<div className="flex justify-center items-center gap-2 mb-8 text-slate-400">
    <span className="text-sm font-bold">
        {currentLang === 'ko' ? "레시피 더보기" : 
         currentLang === 'de' ? "Mehr Rezepte" : "More Recipes"}
    </span>
</div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    ) : (
        <div className="w-full py-4 text-center text-slate-400 text-sm font-medium">
            {recentRecipes.length > 0 
                ? (currentLang === 'ko' ? "✨ 마지막 레시피입니다" : "✨ Das 끝!")
                : (currentLang === 'ko' ? "레시피를 생성해보세요!" : "Er성하세요!")
            }
        </div>
    )}
</div>
            </div>

            {/* 모달 창 */}
            {selectedRecipe && (
                <RecipeModal 
                    recipe={selectedRecipe} 
                    onClose={() => {
                        setSelectedRecipe(null);
                        setSearchParams({}); // URL 파라미터 제거
                    }} 
                    currentLang={currentLang} 
                    t={t}
                    shareToKakao={shareToKakao} 
                    shareToWhatsApp={shareToWhatsApp}
                    handleSaveRecipe={handleSaveRecipe}
                    isFromSaved={!!selectedRecipe.id}
        userId={userId} // 이것도 꼭 넘겨줘야 합니다
        onUpdateRecipe={onUpdateRecipe} // ID가 있으면 이미 저장된 것
                />
            )}
        </div>
    );
};

export default RecipeView;