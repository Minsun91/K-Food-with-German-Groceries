import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, setDoc, orderBy, limit, getDocs, getDoc, doc, addDoc, serverTimestamp, onSnapshot, startAfter } from 'firebase/firestore';
import { db, appId, userId, apiKey_gemini } from './utils/firebase';
import GermanMartTips from './components/GermanMartTips';
import RecipeModal from './components/RecipeModal';
import Footer from './components/Footer';
import PriceComparison from './features/price/PriceComparison';
import { GoogleGenAI } from "@google/genai";
import { langConfig, limitMessages } from './constants/langConfig';
import { BEST_MENU_K10 } from './constants/menuData';
import Header from './components/Header';
import RecipeGenerator from './features/recipe/RecipeGenerator';
import RecentRecipes from './features/recipe/RecentRecipes';
import { shareToKakao, shareToWhatsApp } from './utils/share';
import BeautyGuide from './features/beauty/BeautyGuide';

const genAI = new GoogleGenAI({
    apiKey: apiKey_gemini,
});

// --- Rate Limiting Constants ---
const MAX_CALLS_PER_HOUR = 25; // 1시간당 최대 호출 횟수
const RATE_LIMIT_DURATION_MS = 60 * 60 * 1000; // 1시간 (밀리초)

// Firestore Paths
const rateLimitCollectionPath = (appId) => `artifacts/${appId}/public/data/rateLimits`;
const savedRecipesCollectionPath = (appId) => `artifacts/${appId}/public_recipes`;



const withExponentialBackoff = async (fn, retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Utility function to process the API response and extract text/citations
const processApiResponse = (result) => {
    let text = "";
    const candidate = result.candidates?.[0];

    if (candidate && candidate.content?.parts?.[0]?.text) {
        text = candidate.content.parts[0].text;
    }
    return { text };
};


const getMarketSearchLink = (market, itemName) => {
    const query = encodeURIComponent(itemName); // 재료명 인코딩
    const searchUrls = {
        lidl: `https://www.lidl.de/s/?q=${query}`,
        rewe: `https:// shop.rewe.de/auswahl?search=${query}`,
        edeka: `https://www.edeka.de/suche.htm?query=${query}`,
        aldi: `https://www.aldi-sued.de/de/suche.html?q=${query}`
    };
    return searchUrls[market] || "#";
};

// --- Main App Component ---
const App = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [systemMessage, setSystemMessage] = useState(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [generatedRecipe, setGeneratedRecipe] = useState(null);
    const [rateLimit, setRateLimit] = useState({ count: 0, resetTime: 0 });
    const [currentLang, setCurrentLang] = useState('ko');
    const [isRecipeSaved, setIsRecipeSaved] = useState(false);
    const [recentRecipes, setRecentRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null); // 팝업창에 띄울 레시피 저장용
    const [lastVisible, setLastVisible] = useState(null); // 마지막으로 불러온 데이터 문서 저장
    const [hasMore, setHasMore] = useState(true);        // 더 가져올 데이터가 있는지 여부
    const [isMoreLoading, setIsMoreLoading] = useState(false); // 더보기 버튼 로딩 상태
    const [lastUpdate, setLastUpdate] = useState("");
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [limitMessage, setLimitMessage] = useState("");
    const [limitTitle, setLimitTitle] = useState("");

    // ----------------------------------------------------------------------
    // 1. Firebase Initialization and Authentication 
    // ----------------------------------------------------------------------
    useEffect(() => {
        if (!isAuthReady) {
            setIsAuthReady(true);
        }
    }, []);

    // ----------------------------------------------------------------------
    // 2. Rate Limit Listener 
    // ----------------------------------------------------------------------
    useEffect(() => {
        if (!db || !isAuthReady) return;
        const params = new URLSearchParams(window.location.search);
        const recipeId = params.get('recipeId');
        const urlLang = params.get('lang');

        if (urlLang && ['ko', 'en', 'de'].includes(urlLang)) {
            setCurrentLang(urlLang);
        }

        if (recipeId) {

            const fetchSharedRecipe = async () => {
                try {
                    // 경로가 artifacts/${appId}/public_recipes 인지 꼭 확인!
                    const recipeRef = doc(db, `artifacts/${appId}/public_recipes`, recipeId);
                    const snap = await getDoc(recipeRef);

                    if (snap.exists()) {
                        // 데이터 설정 및 모달 오픈
                        setSelectedRecipe({ id: snap.id, ...snap.data() });
                        console.log("레시피 로드 완료!");
                    } else {
                        console.error("해당 ID의 레시피를 DB에서 찾을 수 없습니다.");
                        setSystemMessageHandler("레시피를 찾을 수 없습니다.", "error");
                    }
                } catch (err) {
                    console.error("Firebase 로드 에러:", err);
                    setSystemMessageHandler("레시피를 불러오는 중 오류가 발생했습니다.", "error");
                }
            };
            fetchSharedRecipe();
        }
    }, [db, isAuthReady, appId]);


    // 1. 레시피를 가져오는 통합 함수
    const fetchRecipes = async (isFirst = true) => {
        if (!db || !appId) {
            console.warn("DB 또는 appId가 없습니다.");
            return;
        }

        setIsMoreLoading(true);
        try {
            const recipesRef = collection(db, `artifacts/${appId}/public_recipes`);
            let q;

            if (isFirst) {
                q = query(recipesRef, orderBy("timestamp", "desc"), limit(6));
            } else {
                if (!lastVisible) return;
                q = query(recipesRef, orderBy("timestamp", "desc"), startAfter(lastVisible), limit(6));
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                if (isFirst) setRecentRecipes([]);
                setHasMore(false);
                return;
            }

            const newRecipes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

            if (isFirst) {
                setRecentRecipes(newRecipes);
            } else {
                setRecentRecipes(prev => [...prev, ...newRecipes]);
            }

            if (newRecipes.length < 6) setHasMore(false);

        } catch (error) {
            console.error("레시피 로드 실패 세부내용:", error);
        } finally {
            setIsMoreLoading(false);
        }
    };
    useEffect(() => {
        if (db) {
            fetchRecipes(true);
        }
    }, [db]);

    // 2. 앱 초기 로딩 및 공유 레시피 감지
    useEffect(() => {
        if (db && isAuthReady) {
            fetchRecipes(true);
        }

        const params = new URLSearchParams(window.location.search);
        const recipeId = params.get('recipeId');

        if (recipeId && db) {
            const fetchShared = async () => {
                const docRef = doc(db, `artifacts/${appId}/public_recipes`, recipeId); //recipe-blog-vsc-001
                const snap = await getDoc(docRef);
                if (snap.exists()) setSelectedRecipe({ id: snap.id, ...snap.data() });
            };
            fetchShared();
        }
    }, [db, isAuthReady, appId]);


    const setSystemMessageHandler = useCallback((message, type = 'info') => {
        if (!message || message === ';' || message.trim() === '') {
            return;
        }

        setSystemMessage({ message, type });

        const timer = setTimeout(() => setSystemMessage(null), 5000);
        return () => clearTimeout(timer);
    }, []);


    const handleSaveRecipe = async () => {
        if (!generatedRecipe || isRecipeSaved || !db || !userId) {
            console.error("저장 불가 조건:", { generatedRecipe, isRecipeSaved, db, userId });
            return;
        }

        try {
            const recipesRef = collection(db, savedRecipesCollectionPath(appId));

            const recipeData = {
                ...generatedRecipe,

                // ✅ UI가 바로 읽을 수 있는 공통 필드 (현재 언어 기준)
                name: generatedRecipe.name || generatedRecipe[`name_${currentLang}`],
                description: generatedRecipe.description || generatedRecipe[`description_${currentLang}`],
                ingredients: generatedRecipe.ingredients || generatedRecipe[`ingredients_${currentLang}`],
                instructions: generatedRecipe.instructions || generatedRecipe[`steps_${currentLang}`],

                // ✅ 관리 및 추적용 필드
                timestamp: serverTimestamp(),
                userId: userId,      // 작성자 ID
                savedBy: userId,     // 저장한 사람 (질문하신 내용 추가)
                lang: currentLang    // 저장 당시의 언어 설정
            };

            await addDoc(recipesRef, recipeData);

            setIsRecipeSaved(true);
            setSystemMessageHandler(
                currentLang === 'ko' ? "레시피가 저장되었습니다!" :
                    (currentLang === 'de' ? "Rezept gespeichert!" : "Recipe saved successfully!"),
                "success"
            );
        } catch (error) {
            console.error("Save Error:", error);
            setSystemMessageHandler("저장 중 오류가 발생했습니다.", "error");
        }
    };


    const handleGenerateRecipe = async () => {
        // 1. GA4 이벤트 전송 (추가!)
        window.gtag?.('event', 'generate_recipe', {
            'recipe_query': userInput, // ⚠️ 여기서 userInput 대신 userPrompt를 사용해야 할 것 같습니다.
            'language': currentLang
        });

        if (isLoading || !db || !userId) return;
        if (!userPrompt) {
            setSystemMessageHandler("메뉴를 선택하거나 입력해주세요.", "error");
            return;
        }

        // 2. Rate Limit 체크
        let currentCount = rateLimit.count;
        let currentResetTime = rateLimit.resetTime;
        if (currentResetTime < Date.now()) {
            currentCount = 0;
        }

        if (currentCount >= MAX_CALLS_PER_HOUR) {
            const remainingMinutes = Math.ceil((currentResetTime - Date.now()) / 60000);
            setSystemMessageHandler(
                `요청 한도 초과: 1시간당 최대 ${MAX_CALLS_PER_HOUR}회 호출 가능합니다. ${remainingMinutes > 0 ? `${remainingMinutes}분` : '잠시'} 후에 다시 시도해주세요.`,
                'error'
            );
            return;
        }

        setIsLoading(true);
        setSystemMessageHandler(langConfig[currentLang].generating_message, 'info');
        setGeneratedRecipe(null);

        try {
            const userQuery = `Create traditional Korean recipe using ingredients commonly and easily found in German supermarkets (like Rewe, Edeka, Aldi, Lidl). The recipe should be based on the following culinary idea: ${userPrompt}.`;
            // const systemPrompt = `You are a specialized culinary chef focused on 'German Supermarket Korean Food'. 
            // Return a JSON OBJECT (not array) with: name_ko, name_en, name_de, description_ko, description_en, description_de, ingredients (array), steps_ko (array), steps_en (array), steps_de (array).`;

            const systemPrompt = `
You are a system that MUST output valid JSON only.

Rules:
- Output ONLY a valid JSON object
- NO explanations
- NO markdown
- NO comments
- NO trailing commas
- All strings must be double-quoted
- Arrays must be valid JSON arrays

Schema:
{
  "name_ko": string,
  "name_en": string,
  "name_de": string,
  "description_ko": string,
  "description_en": string,
  "description_de": string,
  "ingredients": string[],
  "steps_ko": string[],
  "steps_en": string[],
  "steps_de": string[]
}
`;

            const generateWithRetry = async (retries = 3) => {
                let lastError;

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        // API 호출
                        return await genAI.models.generateContent({
                            model: "gemini-2.5-flash-preview-09-2025",
                            contents: [
                                {
                                    role: "user",
                                    parts: [{ text: `${systemPrompt}\n\nUser Query: ${userQuery}` }],
                                },
                            ],
                        });
                    } catch (error) {
                        setIsLoading(false); // 로딩 해제

                        const lang = currentLang || 'ko';
                        const apiCode = error?.error?.code || error?.status;
                        const apiMessage = error?.error?.message || error?.message || "";

                        // 🔴 429 에러 (할당량 초과) 발생 시 "즉시" 팝업창 띄우기
                        if (apiCode === 429 || apiMessage.includes("429") || apiMessage.includes("QUOTA")) {
                            setLimitTitle(limitMessages[lang].title); // 제목 상태 추가 필요
                            setLimitMessage(limitMessages[lang].limit);
                            setIsLimitModalOpen(true);
                            return;
                        }
                        // 🔴 503 에러 (서버 과부하) 발생 시 안내 메시지
                        if (apiCode === 503 || apiMessage.includes("503") || apiMessage.includes("overloaded")) {
                            setLimitTitle(limitMessages[lang].title);
                            setLimitMessage(limitMessages[lang].overloaded);
                            setIsLimitModalOpen(true);
                            return;
                        }

                        // 기타 에러
                        setSystemMessageHandler(`Error: ${apiMessage}`, 'error');
                    }
                }
                throw lastError;
            };

            const result = await generateWithRetry();
            if (!result) return;
            let text = "";

            // 1순위: result.response.text() 시도
            if (result.response && typeof result.response.text === 'function') {
                text = await result.response.text();
            }

            // 2순위: 보내주신 로그 구조처럼 candidates가 있는 경우 (안전장치)
            else if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                text = result.candidates[0].content.parts[0].text;
            }
            // 3순위: result 자체가 response 역할을 하는 경우
            else if (typeof result.text === 'function') {
                text = await result.text();
            }

            if (!text) {
                // 이 메시지가 뜨면 구조가 정말 특이한 것입니다.
                console.error("Text not found in result:", result);
                throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
            }

            // 3. 파싱 로직
            let parsedRecipe = null;
            try {
                const sanitizedText = text
                    .replace(/```json|```/g, "")
                    .replace(/^\s*[\r\n]/gm, "")
                    .trim();

                const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("JSON pattern not found");

                const cleanJson = jsonMatch[0].replace(/\u00A0/g, " ");
                const rawData = JSON.parse(cleanJson);
                const finalData = Array.isArray(rawData) ? rawData[0] : rawData;

                parsedRecipe = {
                    name: finalData[`name_${currentLang}`] || finalData.name_ko || finalData.name,
                    description: finalData[`description_${currentLang}`] || finalData.description_ko || finalData.description,
                    ingredients: finalData.ingredients || [],
                    instructions: finalData[`steps_${currentLang}`] || finalData.steps_ko || []
                };

                if (!parsedRecipe.name) throw new Error("Invalid structure");

            } catch (e) {
                console.error("JSON 파싱 실패:", e);
                throw new Error("레시피 형식이 올바르지 않습니다.");
            }

            // 4. 상태 업데이트 (성공했을 때만 이 지점에 도달함)
            setGeneratedRecipe(parsedRecipe); // 내부 보관용
            setSelectedRecipe(parsedRecipe);  // 모달 띄우기용 ⭐ 핵심
            setIsRecipeSaved(false);
            setSystemMessageHandler(langConfig[currentLang].success_message, 'success');

            // 7. Rate Limit 및 Firebase 업데이트
            const newCount = currentCount + 1;
            const newResetTime = (currentCount === 0 || rateLimit.resetTime < Date.now())
                ? Date.now() + RATE_LIMIT_DURATION_MS
                : rateLimit.resetTime;

            const limitRef = doc(db, rateLimitCollectionPath(appId), userId);
            await setDoc(limitRef, {
                count: newCount,
                resetTime: newResetTime,
                lastCall: serverTimestamp(),
            }, { merge: true });

            setRateLimit({ count: newCount, resetTime: newResetTime });

        } catch (error) {
            console.error("Generation API Error:", error);

            // 🔴 503 에러(서버 과부하) 및 일시적 오류 처리 추가
            if (error.message.includes("503") || error.message.includes("overloaded") || error.message.includes("UNAVAILABLE")) {
                setSystemMessageHandler(
                    "현재 구글 AI 서버에 접속자가 많아 잠시 지연되고 있습니다. 1~2분 후에 다시 시도해주시면 감사하겠습니다! 😊",
                    'error'
                );
            } else if (error.message.includes("permissions")) {
                setSystemMessageHandler("데이터베이스 권한 설정이 필요합니다. 관리자에게 문의해주세요.", 'error');
            } else {
                setSystemMessageHandler(`에러 발생: ${error.message}`, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };


    // --- UI Helpers ---
    const t = langConfig[currentLang];
    const [activeTab, setActiveTab] = useState('home');

    const getRateLimitMessage = () => {
        const remaining = MAX_CALLS_PER_HOUR - rateLimit.count;
        const resetMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);

        if (remaining <= 0) {
            return (
                <span className="text-red-500 font-semibold">
                    {currentLang === 'de' ? 'Limit überschritten: ' : currentLang === 'en' ? 'Limit Exceeded: ' : '한도 초과: '}
                    {currentLang === 'de' ? `Nächste Generierung in ${resetMinutes} Min.` : currentLang === 'en' ? `Next generation in ${resetMinutes} min` : `다음 생성 가능까지 ${resetMinutes}분 남음`}
                </span>
            );
        }

        return (
            <span className="text-sm font-medium text-gray-600">
                {currentLang === 'de' ? 'Von 25 Anrufen pro Stunde: ' : currentLang === 'en' ? 'Of 25 calls per hour: ' : '1시간당 25회 중 '}
                <span className="text-green-600 font-bold">{remaining}</span>
                {currentLang === 'de' ? ' übrig' : currentLang === 'en' ? ' remaining' : ' 남음'}
                {rateLimit.count > 0 && (
                    <span className="text-gray-500 text-xs ml-1">
                        {currentLang === 'de' ? ` (Reset: ${resetMinutes} Min.)` : currentLang === 'en' ? ` (Reset: ${resetMinutes} min)` : ` (재설정: ${resetMinutes}분 후)`}
                    </span>
                )}
            </span>
        );
    };

    const renderRecipeSection = (title, items) => {
        // Ensure items is an array for list rendering, or use a placeholder if needed
        const listItems = Array.isArray(items) ? items : [];

        return (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow-inner">
                <h3 className="text-xl font-bold text-indigo-700 mb-3 border-b-2 border-indigo-200 pb-1">{title}</h3>
                {listItems.length > 0 ? (
                    <ol className={`list-decimal list-inside space-y-2 ${title.includes('조리 순서') || title.includes('Steps') ? 'pl-4' : 'list-none pl-0'}`}>
                        {listItems.map((item, index) => (
                            <li key={index} className={`text-gray-700 text-base ${title.includes('재료') || title.includes('Ingredients') ? 'font-medium' : ''}`}>
                                {item}
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="text-gray-500 italic">No items listed.</p>
                )}
            </div>
        );
    };
    const handleMenuClick = (menuItem) => {
        // menuItem 객체에서 현재 언어에 맞는 이름을 추출
        const selectedMenu = menuItem[`name_${currentLang}`] || menuItem.name;
        setUserPrompt(selectedMenu); // 입력창에 현재 언어에 맞는 메뉴명 주입
    };
    const renderRecipe = () => {
        if (!generatedRecipe) return null;

        // 현재 언어에 맞는 설명글 가져오기 (없으면 통합 필드 사용)
        const displayDesc = generatedRecipe[`description_${currentLang}`] || generatedRecipe.description;
        const displayIngredients = generatedRecipe.ingredients || generatedRecipe.ingredient || [];

        return (
            <div className="mt-8 p-6 bg-white shadow-xl rounded-3xl border-2 border-indigo-100">
                <h2 className="text-2xl font-extrabold mb-2 text-indigo-900 border-b-4 border-indigo-500 pb-2 inline-block">
                    {generatedRecipe[`name_${currentLang}`] || generatedRecipe.name}
                </h2>

                <p className="text-base md:text-lg text-gray-600 mb-6 italic bg-indigo-50 p-4 rounded-xl leading-relaxed">
                    {displayDesc}
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 p-5 rounded-2xl shadow-inner">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                            <span className="text-2xl">🛒</span> {currentLang === 'ko' ? '재료' : (currentLang === 'de' ? 'Zutaten' : 'Ingredients')}
                        </h3>
                        <ul className="space-y-2">
                            {displayIngredients.map((ing, idx) => (
                                <li key={idx} className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-sm font-medium text-gray-700">
                                    {typeof ing === 'object' ? (ing.item || ing.name) : ing}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 조리 순서 섹션: generatedRecipe.instructions를 사용 */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                            <span className="text-2xl">🍳</span> {currentLang === 'ko' ? '조리 순서' : (currentLang === 'de' ? 'Schritte' : 'Steps')}
                        </h3>
                        <div className="space-y-4">
                            {generatedRecipe.instructions?.map((step, idx) => (
                                <div key={idx} className="flex gap-3 items-start">
                                    <span className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold">
                                        {idx + 1}
                                    </span>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {typeof step === 'object' ? step.text : step}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 💾 레시피 저장 및 공유 영역 */}
                <div className="mt-8 border-t border-slate-100 pt-6 px-2">
                    {!isRecipeSaved ? (
                        <button
                            onClick={handleSaveRecipe}
                            disabled={isLoading || !generatedRecipe}
                            className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3
                ${isLoading
                                    ? 'bg-slate-300 cursor-not-allowed text-white'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    {currentLang === 'ko' ? '저장 중...' : (currentLang === 'de' ? 'Wird gespeichert...' : 'Saving...')}
                                </>
                            ) : (
                                <>
                                    <span>🚀</span>
                                    {currentLang === 'ko' ? '레시피 저장하고 공유하기' : (currentLang === 'de' ? 'Rezept speichern & teilen' : 'Save & Share Recipe')}
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            {/* ✅ 저장 완료 메시지 */}
                            <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-center border-2 border-dashed border-emerald-200">
                                {currentLang === 'ko' ? '✅ 레시피가 저장되었습니다!' : (currentLang === 'de' ? '✅ Rezept gespeichert!' : '✅ Recipe Saved!')}
                            </div>

                            {/* 🔗 저장 후 나타나는 카카오톡 공유 버튼 (선택 사항) */}
                            <button
                                onClick={() => shareToKakao(generatedRecipe, currentLang)}
                                className="w-full py-3 bg-[#FEE500] text-[#3A1D1D] rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90"
                            >
                                카카오톡으로 공유하기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const [isGuideOpen, setIsGuideOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20 selection:bg-indigo-100 selection:text-indigo-700">
            <Header
                currentLang={currentLang}
                setCurrentLang={setCurrentLang}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

<main className="max-w-6xl mx-auto px-4 py-8 overflow-hidden">
                {activeTab === 'home' && (
                    <div className="py-12 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
                        <div className="text-center mb-12">
                            {/* ✅ 언어 지원: 독일 생활의 스마트한 선택 */}
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                                {currentLang === 'ko' ? <>독일 생활의 <span className="text-indigo-600">스마트한</span> 선택</> :
                                    currentLang === 'de' ? <>Die <span className="text-indigo-600">smarte</span> Wahl in DE</> :
                                        <>The <span className="text-indigo-600">Smart</span> Choice in DE</>}
                            </h2>
                            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-10">
                                {currentLang === 'ko' ? "주요 한인 마트 실시간 가격 비교부터 AI가 제안하는 맞춤형 K-레시피까지 한 곳에서 확인하세요." : t?.subtitle}
                            </p>
                            <div className="flex justify-center gap-6 md:gap-12 mb-10">
                                {/* 1. 마트 비교 통계 */}
                                <div className="text-center">
                                    <p className="text-2xl md:text-3xl font-black text-indigo-600">7+</p>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                        {currentLang === 'ko' ? "비교 마트 수" :
                                            currentLang === 'de' ? "Märkte im Vergleich" : "Marts Compared"}
                                    </p>
                                </div>

                                <div className="w-px h-10 bg-slate-100 my-auto"></div>

                                {/* 2. 레시피 생성 통계 */}
                                <div className="text-center">
                                    {/* recentRecipes 배열의 길이를 숫자로 표시 */}
                                    <p className="text-2xl md:text-3xl font-black text-indigo-600"> 20+
                                        {/* {recentRecipes?.length > 0 ? `${recentRecipes.length}+` : "20+"}  */}
                                    </p>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                        {currentLang === 'ko' ? "생성된 레시피" :
                                            currentLang === 'de' ? "Erstellte Rezepte" : "Recipes Created"}
                                    </p>
                                </div>

                                <div className="w-px h-10 bg-slate-100 my-auto"></div>

                                {/* 3. 이용료 통계 */}
                                <div className="text-center">
                                    <p className="text-2xl md:text-3xl font-black text-indigo-600">
                                        {currentLang === 'ko' ? "무료" : "FREE"}
                                    </p>
                                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                                        {currentLang === 'ko' ? "이용 금액" :
                                            currentLang === 'de' ? "Kostenloser Zugang" : "Open Access"}
                                    </p>
                                </div>
                            </div>

                            <div className="max-w-3xl mx-auto mb-16 bg-gradient-to-r from-slate-50 via-white to-amber-50 rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 text-left">
                                    <span className="text-3xl">🌱</span>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{t?.coffee_title}</p>
                                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{t?.coffee_desc}</p>
                                    </div>
                                </div>
                                <a
                                    href="https://ko-fi.com/kfoodtracker"
                                    target="_blank"
                                    className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-indigo-600 transition-all shadow-md shrink-0 active:scale-95"
                                >
                                    {currentLang === 'ko' ? "서버비 보태기" : t?.coffee_button}
                                </a>
                            </div>
                        </div>
                        <div className="flex flex-col items-center mb-12 animate-bounce opacity-40">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Explore</span>
                            <span className="text-lg">↓</span>
                        </div>


                        {/* 카드 섹션 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            {/* 최저가 카드 */}
                            <button
                                onClick={() => {
                                    setActiveTab('price');
                                    gtag('event', 'select_content', {
                                        content_type: 'tab',
                                        item_id: 'price_tab'
                                    });
                                }}
                                className="group text-left bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 hover:border-indigo-500 shadow-xl transition-all duration-300"
                            >
                                <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform">🛒</div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3">{t?.price_title}</h3>
                                <p className="text-slate-500 leading-relaxed mb-8">{t?.price_subtitle}</p>
                                <div className="inline-flex items-center px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    {currentLang === 'ko' ? "최저가 확인" : "Check Prices"} <span className="ml-2">→</span>

                                </div>
                            </button>

                            {/* 레시피 카드 */}

                            <button
                                onClick={() => {
                                    setActiveTab('recipe');
                                    gtag('event', 'select_content', {
                                        content_type: 'tab',
                                        item_id: 'recipe_tab'
                                    });
                                }}
                                className="group text-left bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 hover:border-indigo-500 shadow-xl transition-all duration-300"
                            >          <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform">👩‍🍳</div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3">{t?.title}</h3>
                                <p className="text-slate-500 leading-relaxed mb-8">{t?.subtitle}</p>
                                <div className="inline-flex items-center px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    {currentLang === 'ko' ? "레시피 만들기" : "Create Recipe"} <span className="ml-2">→</span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* --- 2. 최저가 비교 탭 --- */}
                {activeTab === 'price' && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto">

                        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">🛒 {t?.price_title}</h2>
                                    <p className="text-sm text-slate-400 font-medium mt-1">{t?.price_subtitle}</p>
                                </div>
                                {lastUpdate && (
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Last Update</span>
                                        <span className="text-[11px] text-indigo-600 font-black">{lastUpdate}</span>
                                    </div>
                                )}
                            </div>
                            <PriceComparison currentLang={currentLang} langConfig={langConfig} onUpdateData={(time) => setLastUpdate(time)} />
                        </section>
                    </div>
                )}

                {/* --- 3. 레시피 생성 탭 --- */}
                {activeTab === 'recipe' && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-3xl mx-auto space-y-12">
                        {/* 입력 및 생성부 */}
                        <RecipeGenerator
                            t={t}
                            currentLang={currentLang}
                            userPrompt={userPrompt}
                            setUserPrompt={setUserPrompt}
                            isLoading={isLoading}
                            onGenerate={handleGenerateRecipe}
                            getRateLimitMessage={getRateLimitMessage}
                        />

                        {/* 하단 목록부 */}
                        <RecentRecipes
                            t={t}
                            currentLang={currentLang}
                            recentRecipes={recentRecipes}
                            setSelectedRecipe={setSelectedRecipe}
                            hasMore={hasMore}
                            fetchRecipes={fetchRecipes}
                            isMoreLoading={isMoreLoading}
                        />
                    </div>
                )}
                {activeTab === 'beauty' && (
        <BeautyGuide t={t} currentLang={currentLang} />
    )}
            </main>

            <Footer currentLang={currentLang} onOpenGuide={() => setIsGuideOpen(true)} />

            {/* 모달/팝업 (기존과 동일) */}
            {selectedRecipe && (
                <RecipeModal recipe={selectedRecipe} onClose={() => { setSelectedRecipe(null); setGeneratedRecipe(null); }} currentLang={currentLang} t={t} shareToKakao={shareToKakao} shareToWhatsApp={shareToWhatsApp} handleSaveRecipe={handleSaveRecipe} />
            )}
            {isLimitModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] max-w-sm w-full p-8 text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="text-5xl mb-4">🍽️</div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">{limitTitle || "Limit"}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">{limitMessage}</p>
                        <button onClick={() => setIsLimitModalOpen(false)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all">
                            {limitMessages[currentLang || 'ko'].button}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;