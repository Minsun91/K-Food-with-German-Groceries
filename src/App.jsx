import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, onSnapshot, serverTimestamp, 
    collection, addDoc
} from 'firebase/firestore';

// --- Global Constants (Provided by Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Hardcoded fallback configuration provided by the user
const fallbackConfig = {
    apiKey:"AIzaSyBCuExMq5WeAn6dvWM-Qj3rFGbYEgkUZuM",
    authDomain:"k-food-with-german-groceries.firebaseapp.com",
    projectId:"k-food-with-german-groceries",
    storageBucket:"k-food-with-german-groceries.firebasestorage.app",
    messagingSenderId:"1023501163434",
    appId: "1:1023501163434:web:8d5ac1aa46bd6aa4f4e9d3",
};

// **FIX:** Properly define firebaseConfig using the global __firebase_config 
// or fall back to the user-provided fallbackConfig if the global is missing.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : fallbackConfig;

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Rate Limiting Constants ---
const MAX_CALLS_PER_HOUR = 5; // 1시간당 최대 호출 횟수
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
        prompt_label: "레시피 아이디어 (예: 두부 + 스페츠레):",
        placeholder: "예시: 소시지와 양배추를 활용한 퓨전 김치볶음밥",
        button_loading: "생성 중...",
        button_ready: "레시피 생성하기 🇩🇪🍚",
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
        placeholder: "Example: Fusion Kimchi Fried Rice using Bratwurst and Sauerkraut",
        button_loading: "Generating...",
        button_ready: "Generate Recipe 🇩🇪🍚",
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
        placeholder: "Beispiel: Fusion Kimchi-Bratreis mit Wurst und Sauerkraut",
        button_loading: "Wird generiert...",
        button_ready: "Rezept generieren 🇩🇪🍚",
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
        // Guard clause to prevent Firestore queries before auth is ready
        if (!db || !isAuthReady || !userId) {
            return;
        }

        const limitRef = doc(db, rateLimitCollectionPath(appId), userId);

        const unsubscribe = onSnapshot(limitRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                let currentCount = data.count || 0;
                let currentResetTime = data.resetTime || 0;

                if (currentResetTime < Date.now()) {
                    currentCount = 0;
                }
                setRateLimit({ count: currentCount, resetTime: currentResetTime });
            } else {
                setRateLimit({ count: 0, resetTime: 0 });
            }
        }, (error) => {
            console.error("Error fetching rate limit:", error);
        });

        return () => unsubscribe();
    }, [db, isAuthReady, userId]);

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
        // End Rate Limit Check

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
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        // const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
        setSystemMessageHandler(currentLang === 'de' ? 'Rezept wird gespeichert...' : currentLang === 'en' ? 'Saving recipe...' : '레시피를 저장 중입니다...', 'info');

        try {
            const recipesRef = collection(db, savedRecipesCollectionPath(appId, userId));
            await addDoc(recipesRef, {
                ...generatedRecipe,
                timestamp: serverTimestamp(),
                savedBy: userId, 
                // Add the user prompt that generated this recipe for context
                originalPrompt: userPrompt, 
            });
            
            setIsRecipeSaved(true);
            setSystemMessageHandler(currentLang === 'de' ? 'Rezept erfolgreich gespeichert!' : currentLang === 'en' ? 'Recipe successfully saved!' : '레시피가 성공적으로 저장되었습니다!', 'success');
            
        } catch (error) {
            console.error("Error saving recipe:", error);
            setSystemMessageHandler(currentLang === 'de' ? 'Fehler beim Speichern des Rezepts.' : currentLang === 'en' ? 'Error saving recipe.' : '레시피 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- UI Helpers ---
    const t = langConfig[currentLang]; // Translation helper

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
                {currentLang === 'de' ? 'Von 5 Anrufen pro Stunde: ' : currentLang === 'en' ? 'Of 5 calls per hour: ' : '1시간당 5회 중 '}
                <span className="text-green-600 font-bold">{remaining}회</span> 
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

    const renderRecipe = () => {
        if (!generatedRecipe) return null;
        const t = langConfig[currentLang];
        
        // 현재 선택된 언어에 맞는 데이터 추출
        const name = generatedRecipe[`name_${currentLang}`] || generatedRecipe.name_ko;
        const desc = generatedRecipe[`description_${currentLang}`];
        const steps = generatedRecipe[`steps_${currentLang}`];
        const stepsTitle = t[`steps_${currentLang}`];
    
        return (
            <div className="mt-8 p-6 bg-white shadow-2xl rounded-xl border border-gray-200">
                {/* 상단 액션 바 (ID 및 저장 버튼) */}
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <span className="text-sm text-gray-500 font-mono">ID: {appId.substring(0, 8)}...</span>
                    <button 
                        onClick={handleSaveRecipe} 
                        disabled={isRecipeSaved || isLoading} 
                        className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                            isRecipeSaved ? 'bg-green-500 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                        {isRecipeSaved ? t.saved_button : t.save_button}
                    </button>
                </div>
    
                {/* 레시피 제목 및 설명 */}
                <h2 className="text-4xl font-extrabold text-indigo-900 mb-6">{name}</h2>
                
                <div className="mb-8 border-t pt-4">
                    <h3 className="text-2xl font-bold text-gray-700 mb-3 border-l-4 border-indigo-400 pl-3">{t.desc_title}</h3>
                    <p className="text-gray-800 text-lg leading-relaxed">{desc}</p>
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
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 font-sans antialiased">
            {/* Tailwind CSS import for the Canvas environment (kept for compatibility) */}
            <script src="https://cdn.tailwindcss.com"></script>
            <div className="max-w-4xl mx-auto">
                <header className="text-center py-8 bg-white rounded-xl shadow-xl mb-6 border-t-4 border-indigo-600">
                    <h1 className="text-4xl font-extrabold text-indigo-800 tracking-tight px-4">
                        {t.title}
                    </h1>
                    <p className="text-lg text-gray-600 mt-2 px-4">
                        {t.subtitle}
                    </p>
                    
                    {/* Language Selector */}
                    <div className="mt-4 flex justify-center space-x-2 px-4">
                        {['ko', 'en', 'de'].map(lang => (
                            <button
                                key={lang}
                                onClick={() => {
                                    setCurrentLang(lang);
                                    // Optionally show a confirmation message on lang change
                                    setSystemMessageHandler(
                                        lang === 'ko' ? '표시 언어가 한국어로 변경되었습니다.' : 
                                        lang === 'en' ? 'Display language changed to English.' : 
                                        'Anzeigesprache auf Deutsch geändert.', 
                                        'info'
                                    );
                                }}
                                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                                    currentLang === lang 
                                        ? 'bg-indigo-600 text-white shadow-md' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {langConfig[lang].name}
                            </button>
                        ))}
                    </div>

                    {isAuthReady && userId && (
                        <div className="mt-4 text-xs text-gray-500 px-4">
                            User ID: <span className="font-mono text-gray-600 break-all">{userId}</span>
                        </div>
                    )}
                </header>

                <main>
                    {/* System Message Box */}
                    {systemMessage && (
                        <div 
                            className={`p-4 mb-4 rounded-lg font-medium text-center transition-all duration-300 shadow-md ${
                                systemMessage.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
                                systemMessage.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 
                                'bg-blue-100 text-blue-700 border border-blue-300'
                            }`}
                        >
                            {systemMessage.message}
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border">
                        <label htmlFor="prompt" className="block text-lg font-semibold text-gray-700 mb-3">
                            {t.prompt_label}
                        </label>
                        <textarea
                            id="prompt"
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out resize-none shadow-inner"
                            rows="3"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder={t.placeholder}
                            disabled={isLoading}
                        ></textarea>
                        
                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                            <button
                                onClick={handleGenerateRecipe}
                                disabled={isLoading || userPrompt.trim() === '' || rateLimit.count >= MAX_CALLS_PER_HOUR}
                                className={`
                                    w-full sm:w-auto px-6 py-3 text-white font-bold rounded-xl transition-all duration-300 ease-in-out shadow-lg
                                    flex items-center justify-center
                                    ${isLoading || userPrompt.trim() === '' || rateLimit.count >= MAX_CALLS_PER_HOUR 
                                        ? 'bg-indigo-300 cursor-not-allowed' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl transform hover:scale-105'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t.button_loading}
                                    </>
                                ) : t.button_ready}
                            </button>
                            
                            {/* Rate Limit Display */}
                            <div className="text-right">
                                {getRateLimitMessage()}
                            </div>
                        </div>
                    </div>

                    {/* Generated Recipe Display */}
                    {renderRecipe()}

                    {/* Loading/Wait Placeholder (Only show if recipe hasn't been generated yet) */}
                    {isLoading && !generatedRecipe && (
                        <div className="text-center mt-8 p-6 bg-white rounded-xl shadow-lg">
                            <svg className="animate-spin mx-auto h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-3 text-xl font-semibold text-gray-700">{currentLang === 'de' ? 'Das Rezept wird kreiert und übersetzt. (ca. 10–30 Sek.)' : currentLang === 'en' ? 'Creating and translating the recipe. (approx. 10–30 sec)' : '레시피를 창작하고 번역 중입니다. (약 10~30초 소요)'}</p>
                            <p className="text-sm text-gray-500 mt-1">AI 셰프가 독일 재료로 최고의 퓨전 한식을 만들고 있어요!</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;