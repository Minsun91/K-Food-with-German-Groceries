import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from 'firebase/auth';
import {
    getFirestore, doc, setDoc, onSnapshot, serverTimestamp,
    collection, addDoc, query, orderBy, limit
} from 'firebase/firestore';

const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
if (!window.Kakao.isInitialized()) {
    window.Kakao.init(kakaoKey);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'recipe-blog-vsc-001';
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Rate Limiting Constants ---
const MAX_CALLS_PER_HOUR = 25; // 1시간당 최대 호출 횟수
const RATE_LIMIT_DURATION_MS = 60 * 60 * 1000; // 1시간 (밀리초)

// Firestore Paths
const rateLimitCollectionPath = (appId) => `artifacts/${appId}/public/data/rateLimits`;
const savedRecipesCollectionPath = (appId, userId) => `artifacts/${appId}/users/${userId}/saved_recipes`;

// Language Configuration
const langConfig = {
    ko: {
        name: "한국어",
        title: "독일 마트 한식 레시피 생성기",
        subtitle: "독일 슈퍼마켓에서 쉽게 구할 수 있는 재료로 한식 레시피를 만들어보세요.",
        recent_title: "최근 생성된된 레시피",
        prompt_label: "레시피 아이디어 (예: 두부 + 스페츠레):",
        placeholder: "예시: 소시지와 양배추를 활용한 퓨전 김치볶음밥",
        button_loading: "생성 중...",
        button_ready: "레시피 생성하기 🍚",
        desc_title: "레시피 설명",
        ingredients_title: "재료",
        steps_ko: "조리 순서",
        steps_en: "Steps",
        steps_de: "Kochschritte",
        generating_message: "독일 마트 재료 기반 레시피를 생성 중입니다. 잠시만 기다려주세요...",
        success_message: "새로운 독일 마트 한식 레시피가 성공적으로 생성되었습니다.",
        save_button: "레시피 저장",
        saved_button: "저장됨 ✅",
        all_steps_title: "전체 언어 조리 순서 (All Language Steps)",
    },
    en: {
        name: "English",
        title: "German Supermarket Korean Recipe Generator",
        subtitle: "Create Korean recipes using ingredients easily found in German supermarkets.",
        prompt_label: "Recipe Idea (e.g., Tofu + Spätzle):",
        recent_title: "Recent Generated Recipes",
        placeholder: "Example: Fusion Kimchi Fried Rice using Bratwurst and Sauerkraut",
        button_loading: "Generating...",
        button_ready: "Generate Recipe 🍚",
        desc_title: "Recipe Description",
        ingredients_title: "Ingredients",
        steps_ko: "Cooking Steps ",
        steps_en: "Steps ",
        steps_de: "Kochschritte ",
        generating_message: "Generating German supermarket-based recipe...",
        success_message: "New German supermarket Korean recipe successfully generated.",
        save_button: "Save Recipe",
        saved_button: "Saved ✅",
        all_steps_title: "All Language Steps (Kochschritte in allen Sprachen)",
    },
    de: {
        name: "Deutsch",
        title: "Koreanisches Rezept-Generator (Deutsche Supermärkte)",
        subtitle: "Erstellen Sie koreanische Rezepte mit Zutaten, die leicht in deutschen Supermärkten erhältlich sind.",
        prompt_label: "Rezeptidee (z.B. Tofu + Spätzle):",
        recent_title: "Kürzlich erstellte Rezepte",
        placeholder: "Beispiel: Fusion Kimchi-Bratreis mit Wurst und Sauerkraut",
        button_loading: "Wird generiert...",
        button_ready: "Rezept generieren 🍚",
        desc_title: "Rezeptbeschreibung",
        ingredients_title: "Zutaten",
        steps_ko: "Kochschritte",
        steps_en: "Steps",
        steps_de: "Kochschritte",
        generating_message: "Generiere das Rezept basierend auf deutschen Zutaten...",
        success_message: "Neues Koreanisches Rezept (Deutschland-Basis) erfolgreich generiert.",
        save_button: "Rezept speichern",
        saved_button: "Gespeichert ✅",
        all_steps_title: "Kochschritte in allen Sprachen",
    },
};

const shareToKakao = (recipeName) => {
    if (window.Kakao) {
        try {
            if (!window.Kakao.isInitialized()) {
                window.Kakao.init(kakaoKey);
            }

            window.Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: recipeName,
                    description: '독일 마트 재료로 만든 특별한 한식 레시피를 확인해보세요! 🇩🇪🇰🇷',
                    // 실제 배포된 og-image 경로를 넣으면 더 예쁘게 나옵니다.
                    imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
                    link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href
                    },
                },
                buttons: [
                    {
                        title: '레시피 바로가기',
                        link: {
                            mobileWebUrl: window.location.href,
                            webUrl: window.location.href
                        }
                    }
                ],
            });
        } catch (error) {
            console.error("카카오 공유 에러:", error);
        }
    } else {
        alert("카카오 SDK가 로드되지 않았습니다.");
    }
};

const shareToWhatsApp = (recipeName) => {
    const url = window.location.href; // 현재 페이지 주소
    const text = `Check out this recipe: ${recipeName}\nGenerated by Cook Korean, Anywhere 🌍🍜\n${url}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
};

// Utility function for exponential backoff retry logic
const withExponentialBackoff = async (fn, retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            // console.log(`Retry attempt ${i + 1} after ${Math.floor(delay / 1000)}s...`);
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

// --- Main App Component ---
const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [systemMessage, setSystemMessage] = useState(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [generatedRecipe, setGeneratedRecipe] = useState(null);
    const [rateLimit, setRateLimit] = useState({ count: 0, resetTime: 0 });
    const [currentLang, setCurrentLang] = useState('ko');
    const [isRecipeSaved, setIsRecipeSaved] = useState(false); // New state for save status
    const [recentRecipes, setRecentRecipes] = useState([]); // 최근 레시피 목록 저장용
    const [selectedRecipe, setSelectedRecipe] = useState(null); // 팝업창에 띄울 레시피 저장용
    // ----------------------------------------------------------------------
    // 1. Firebase Initialization and Authentication 
    // ----------------------------------------------------------------------
    useEffect(() => {
        // Now firebaseConfig is guaranteed to be defined (either by global or fallback)
        if (!firebaseConfig.projectId) {
            console.error("Firebase Config is incomplete.");
            setIsAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    if (initialAuthToken) {
                        try {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } catch (e) {
                            console.error("Custom token sign-in failed, falling back to anonymous.", e);
                            await signInAnonymously(firebaseAuth);
                        }
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                }
                if (!isAuthReady) {
                    setIsAuthReady(true);
                }
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Failed to initialize Firebase:", e);
        }
    }, [isAuthReady]);

    // ----------------------------------------------------------------------
    // 2. Rate Limit Listener 
    // ----------------------------------------------------------------------
    useEffect(() => {
        if (!db || !isAuthReady) return;

        // 모든 사용자가 공유한 레시피를 가져오기 위해 공통 경로 사용
        const recipesRef = collection(db, `artifacts/${appId}/public_recipes`);
        const q = query(recipesRef, orderBy("timestamp", "desc"), limit(6));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setRecentRecipes(list);
        }, (error) => {
            console.error("최근 레시피 로드 실패:", error);
        });

        return () => unsubscribe();
    }, [db, isAuthReady]);

    // System message handler
    const setSystemMessageHandler = useCallback((message, type = 'info') => {
        setSystemMessage({ message, type });
        // Set a shorter timeout for messages
        const timer = setTimeout(() => setSystemMessage(null), 5000);
        return () => clearTimeout(timer);
    }, []);

    // ----------------------------------------------------------------------
    // 3. Recipe Generation API Call
    // ----------------------------------------------------------------------
    const handleGenerateRecipe = async () => {

        if (isLoading || !db || !userId) return;

        // Rate Limit Check
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
        setGeneratedRecipe(null); // Clear previous recipe

        const userQuery = `Create a brand new, highly creative Korean recipe using ingredients commonly and easily found in German supermarkets (like Rewe, Edeka, Aldi, Lidl). The recipe should be based on the following culinary idea: ${userPrompt}. The final recipe must be complete and detailed.`;

        const systemPrompt = `You are a specialized culinary innovator focused on 'German Supermarket Korean Food'. Generate a single, detailed, and new Korean-fusion recipe based on the user's idea, strictly limiting ingredients to those available in typical German supermarkets. The response MUST be a JSON array containing a single object, and all values MUST be clean strings without newlines (\n) or extra escape characters. The recipe must provide names, descriptions, and steps in Korean (ko), English (en), and German (de). Do not include any text outside the JSON block.`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            "name_ko": { "type": "STRING", description: "Recipe name in Korean." },
                            "name_en": { "type": "STRING", description: "Recipe name in English." },
                            "name_de": { "type": "STRING", description: "Recipe name in German." },
                            "description_ko": { "type": "STRING", description: "Brief description in Korean." },
                            "description_en": { "type": "STRING", description: "Brief description in English." },
                            "description_de": { "type": "STRING", description: "Brief description in German." },
                            "ingredients": {
                                "type": "ARRAY",
                                "items": { "type": "STRING", description: "A single ingredient item (e.g., '200g Tofu')" }
                            },
                            "steps_ko": {
                                "type": "ARRAY",
                                "items": { "type": "STRING", description: "A single cooking step in Korean, without newlines." }
                            },
                            "steps_en": {
                                "type": "ARRAY",
                                "items": { "type": "STRING", description: "A single cooking step in English, without newlines." }
                            },
                            "steps_de": {
                                "type": "ARRAY",
                                "items": { "type": "STRING", description: "A single cooking step in German, without newlines." }
                            }
                        },
                        required: ["name_ko", "name_en", "name_de", "description_ko", "description_en", "description_de", "ingredients", "steps_ko", "steps_en", "steps_de"]
                    }
                }
            }
        };

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;        // const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        console.log("현재 사용 중인 API 키 확인:", apiKey);

        try {
            const response = await withExponentialBackoff(() => fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            const { text } = processApiResponse(result);

            let parsedRecipe = null;
            try {
                // Safely parse the JSON response, removing potential markdown wrappers
                const jsonText = text.replace(/```json\s*|```/g, '').trim();
                const parsedArray = JSON.parse(jsonText);
                if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                    parsedRecipe = parsedArray[0];
                } else {
                    throw new Error("Parsed JSON is not an array or is empty.");
                }
            } catch (e) {
                console.error("Failed to parse JSON response:", e);
                setSystemMessageHandler("레시피 생성은 성공했으나, 결과 형식이 올바르지 않아 표시할 수 없습니다. 다시 시도해 주세요.", 'error');
                return;
            }

            setGeneratedRecipe(parsedRecipe);
            setIsRecipeSaved(false); // Reset save state on new generation
            setSystemMessageHandler(langConfig[currentLang].success_message, 'success');

            // Rate Limit Increment
            const newCount = currentCount + 1;
            const newResetTime = (currentCount === 0 || currentResetTime < Date.now())
                ? Date.now() + RATE_LIMIT_DURATION_MS
                : currentResetTime;

            const limitRef = doc(db, rateLimitCollectionPath(appId), userId);
            await setDoc(limitRef, {
                count: newCount,
                resetTime: newResetTime,
                lastCall: serverTimestamp(),
            }, { merge: true });

            setRateLimit({ count: newCount, resetTime: newResetTime });

        } catch (error) {
            console.error("Generation API Error:", error);
            setSystemMessageHandler('레시피 생성 중 오류가 발생했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ----------------------------------------------------------------------
    // 4. Recipe Saving Logic
    // ----------------------------------------------------------------------
    const handleSaveRecipe = async () => {
        if (!db || !userId || !generatedRecipe || isRecipeSaved) return;

        setIsLoading(true);
        try {
            // 경로를 최근 레시피 로드 경로와 동일하게 수정
            const recipesRef = collection(db, `artifacts/${appId}/public_recipes`);
            await addDoc(recipesRef, {
                ...generatedRecipe,
                timestamp: serverTimestamp(),
                savedBy: userId,
                originalPrompt: userPrompt,
            });

            setIsRecipeSaved(true);
            setSystemMessageHandler(currentLang === 'ko' ? '공유 목록에 저장되었습니다!' : 'Saved to public list!', 'success');
        } catch (error) {
            console.error("저장 오류:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- UI Helpers ---
    const t = langConfig[currentLang];

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
                {currentLang === 'de' ? 'Von 5 Anrufen pro Stunde: ' : currentLang === 'en' ? 'Of 5 calls per hour: ' : '1시간당 25회 중 '}
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

    const recommendations = ["REWE 소시지 부대찌개", "EDEKA 삼겹살 수육", "Lidl 냉동새우전", "Kaufland 굴라쉬 육개장"];

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

    const renderRecipe = () => {
        if (!generatedRecipe) return null;
        const t = langConfig[currentLang];

        // 현재 선택된 언어에 맞는 데이터 추출
        const name = generatedRecipe[`name_${currentLang}`] || generatedRecipe.name_ko;
        const desc = generatedRecipe[`description_${currentLang}`];
        const steps = generatedRecipe[`steps_${currentLang}`];
        const stepsTitle = t[`steps_${currentLang}`];

        return (
            <div className="mt-8 p-6 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] border border-gray-100 overflow-hidden relative">
                {/* 상단 액션 바 */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4 gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveRecipe}
                            disabled={isRecipeSaved || isLoading}
                            className={`px-5 py-2 text-sm font-bold rounded-full transition-all shadow-sm active:scale-95 ${isRecipeSaved ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-indigo-600'
                                }`}
                        >
                            {isRecipeSaved ? t.saved_button : t.save_button}
                        </button>

                        {/* 카카오 공유 버튼 */}
                        <button
                            onClick={() => shareToKakao(name)}
                            className="px-5 py-2 text-sm font-bold rounded-full bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            <span className="text-base">💬</span>카톡 공유
                        </button>
                    </div>
                    <span className="text-[10px] text-gray-300 font-mono hidden sm:inline">ID: {appId.substring(0, 8)}</span>
                </div>

                {/* 레시피 제목 - 모바일 대응 */}
                <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-4 leading-tight break-keep">
                    {name}
                </h2>

                <div className="mb-8 border-t border-gray-50 pt-6">
                    <h3 className="text-sm font-bold text-indigo-500 mb-2 uppercase tracking-widest">{t.desc_title}</h3>
                    <p className="text-slate-600 text-lg leading-relaxed break-keep">{desc}</p>
                </div>

                {/* 광고 자리 (레시피 설명과 재료 사이) */}
                <div className="my-8 py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[100px]">
                    <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">Sponsored</span>
                    <div className="text-slate-300 italic text-sm">추천 식재료 광고가 들어올 자리입니다</div>
                </div>

                {/* 재료 및 조리 순서 (현재 언어만 표시) */}
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        {renderRecipeSection(t.ingredients_title, generatedRecipe.ingredients)}
                    </div>
                    <div className="lg:col-span-2">
                        {/* 하단에 다른 언어들이 나오던 코드를 삭제하고 이것만 남겼습니다 */}
                        {renderRecipeSection(stepsTitle, steps)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(at_top_right,#f1f5f9_0%,transparent_50%),radial-gradient(at_top_left,#e0e7ff_0%,transparent_50%)] p-4 sm:p-8 font-sans antialiased">
            <script src="https://cdn.tailwindcss.com"></script>

            <div className="relative z-10 max-w-4xl mx-auto"></div>
            {/* <script src="https://cdn.tailwindcss.com"></script> */}

            <div className="max-w-4xl mx-auto">
                {/* 헤더 부분 */}
                <header className="text-center py-8 bg-white rounded-xl shadow-xl mb-6 border-t-4 border-indigo-600">
                    <h1 className="text-4xl font-extrabold text-indigo-800 px-4">{t?.title || "Recipe Generator"}</h1>
                    <div className="mt-4 flex justify-center space-x-2">
                        {['ko', 'en', 'de'].map(lang => (
                            <button key={lang} onClick={() => setCurrentLang(lang)}
                                className={`px-4 py-2 text-sm font-semibold rounded-full ${currentLang === lang ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {langConfig[lang]?.name || lang}
                            </button>
                        ))}
                    </div>
                </header>

                <main>
                    {/* 시스템 메시지 */}
                    {systemMessage && (
                        <div className="p-4 mb-4 rounded-lg bg-blue-100 text-blue-700 text-center shadow-md">
                            {systemMessage.message}
                        </div>
                    )}

                    {/* 입력창 */}
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border">



                        {/* 버튼 및 레이트 리밋 영역 */}
                        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-xl shadow-indigo-100/50 border border-indigo-50/50 mb-10 transition-all focus-within:shadow-2xl focus-within:shadow-indigo-200/50">
                            <label className="block text-sm font-bold text-slate-500 mb-3 ml-1 tracking-wider uppercase">
                                {t?.prompt_label}
                            </label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {recommendations.map(keyword => (
                                    <button
                                        key={keyword}
                                        onClick={() => setUserPrompt(keyword)}
                                        className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all"
                                    >
                                        # {keyword}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl resize-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg"
                                rows="3"
                                value={userPrompt}
                                onChange={(e) => setUserPrompt(e.target.value)}
                                placeholder={t?.placeholder}
                            />
                            {/* 광고 슬롯 (AdSense 등을 넣을 자리) */}
                            <div className="w-full mt-6 py-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">
                                    Sponsored Ad
                                </span>
                                {/* 나중에 이곳에 구글 애드센스 코드를 넣으시면 됩니다 */}
                            </div>
                            <div className="mt-8 flex flex-col items-center gap-5">
                                <button
                                    onClick={handleGenerateRecipe}
                                    disabled={isLoading || !userPrompt}
                                    className="group relative px-12 py-4 bg-slate-900 text-white font-bold rounded-2xl overflow-hidden transition-all hover:bg-indigo-600 active:scale-95 disabled:bg-slate-300 shadow-xl shadow-slate-200 hover:shadow-indigo-200"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <span className="animate-flip text-2xl">⏳</span>
                                                <span>{currentLang === 'ko' ? '조합 중...' : 'Mixing...'}</span>
                                            </div>
                                        ) : <><span>✨</span> {t?.button_ready}</>}
                                    </span>
                                </button>
                                {getRateLimitMessage()}
                            </div>

                        </div>

                    </div>
                    {/* 생성된 레시피 결과 */}
                    {typeof renderRecipe === 'function' && renderRecipe()}

                    {/* 최근 레시피 목록 (안전하게 처리) */}
                    <div className="mt-12 mb-8">
                        <div className="max-w-4xl mx-auto px-4 mb-10">
                            <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl p-4 text-center">
                                {/* <p className="text-[10px] text-slate-400 mb-2 tracking-tighter uppercase font-bold">Advertisement</p>
        <div className="h-[100px] w-full bg-slate-100/50 rounded-lg flex items-center justify-center text-slate-300 italic text-sm">
            맛있는 한국 양념, 여기서 구경해보세요! 
        </div> */}
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span>🔍</span> {t?.recent_title || "Recent Recipes"}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {recentRecipes.length > 0 ? (
                                recentRecipes.map((r) => (
                                    <div
                                        key={r.id}
                                        onClick={() => setSelectedRecipe(r)}
                                        className="p-5 bg-white border-2 border-transparent rounded-xl shadow-sm cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                                    >
                                        <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 truncate text-lg">
                                            {r[`name_${currentLang}`] || r.name_ko}
                                        </h3>
                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-gray-400 text-xs">
                                                {currentLang === 'ko' ? '레시피 보기' : 'View Recipe'} →
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 italic col-span-2 text-center py-10 bg-white rounded-xl border-2 border-dashed">
                                    {currentLang === 'ko' ? '아직 공유된 레시피가 없습니다. 첫 번째 레시피를 저장해보세요!' : 'No shared recipes yet.'}
                                </p>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* 상세보기 모달 (가장 하단 위치) */}
            {typeof selectedRecipe !== 'undefined' && selectedRecipe && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setSelectedRecipe(null)}>

                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedRecipe(null)} className="absolute top-6 right-6 font-bold text-gray-400">✕</button>

                        <h2 className="text-3xl font-black text-indigo-900 mb-4">{selectedRecipe[`name_${currentLang}`] || selectedRecipe.name_ko}</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {renderRecipeSection && renderRecipeSection(t?.ingredients_title || "Ingredients", selectedRecipe.ingredients)}
                            {renderRecipeSection && renderRecipeSection(t?.[`steps_${currentLang}`] || "Steps", selectedRecipe[`steps_${currentLang}`])}
                        </div>

                        {/* 상세보기 모달 하단 버튼 영역 */}
                        <div className="mt-8 flex flex-col gap-3">
                            {/* 공유 라인: WhatsApp(초록) & Kakao(노랑) */}
                            <div className="flex gap-3">
                                {/* WhatsApp 버튼 */}
                                <button
                                    onClick={() => {
                                        const target = selectedRecipe;
                                        if (target) shareToWhatsApp(target[`name_${currentLang}`] || target.name_ko);
                                    }}
                                    className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#1ebd59] transition-all active:scale-95 shadow-sm"
                                >
                                    <span className="text-xl">💬</span> WhatsApp
                                </button>

                                {/* Kakao 버튼 */}
                                <button
                                    onClick={() => {
                                        const target = selectedRecipe;
                                        if (target) shareToKakao(target[`name_${currentLang}`] || target.name_ko);
                                    }}
                                    className="flex-1 py-4 bg-[#FEE500] text-[#191919] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#fada0a] transition-all active:scale-95 shadow-sm"
                                >
                                    <span className="text-xl">💛</span> Kakao
                                </button>
                            </div>

                            {/* 닫기 버튼: 하단에 넓게 배치 */}
                            <button
                                onClick={() => setSelectedRecipe(null)}
                                className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                            >
                                {t?.close || "Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;