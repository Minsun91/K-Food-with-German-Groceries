import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, setDoc, orderBy, limit, getDocs, getDoc, doc, addDoc, serverTimestamp, onSnapshot, startAfter } from 'firebase/firestore';
import { db, appId, userId, apiKey_gemini } from './firebase';
import GermanMartTips from './components/GermanMartTips';
import RecipeModal from './components/RecipeModal';
import Footer from './components/Footer';
import PriceComparison from './components/PriceComparison';
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
    apiKey: apiKey_gemini,
});

// --- Rate Limiting Constants ---
const MAX_CALLS_PER_HOUR = 25; // 1시간당 최대 호출 횟수
const RATE_LIMIT_DURATION_MS = 60 * 60 * 1000; // 1시간 (밀리초)

// Firestore Paths
const rateLimitCollectionPath = (appId) => `artifacts/${appId}/public/data/rateLimits`;
const savedRecipesCollectionPath = (appId) => `artifacts/${appId}/public_recipes`;

// Language Configuration
const langConfig = {
    ko: {
        name: "한국어",
        title: "한식레시피 aus 독일마트",
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
        title: "K-Food Helper in Germany",
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
        title: "Dein K-Food Helfer",
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

    // WhatsApp 공유 함수
    const shareToWhatsApp = (recipe) => {
        if (!recipe?.id) {
            alert(currentLang === 'de' ? "Speichere das Rezept zuerst!" : "Save the recipe first!");
            return;
        }
        const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=de`;
        const recipeName = recipe.name_de || recipe.name_en || recipe.name_ko;
        const text = `${recipeName}\nProbier dieses Rezept aus! \n\n ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

const shareToKakao = (recipe, currentLang) => { 
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";

    if (!recipe || !recipe.id) {
        const alertMsg = {
            ko: "먼저 '레시피 저장' 버튼을 눌러주세요!",
            en: "Please save the recipe first!",
            de: "Bitte speichere zuerst das Rezept!"
        };
        alert(alertMsg[currentLang] || alertMsg['ko']);
        return;
    }

    if (window.Kakao) {
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(kakaoKey);
        }

        const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=${currentLang}`;

        const contentConfig = {
            ko: {
                title: recipe.name_ko || recipe.name,
                description: '독일 마트 재료로 만든 한식 레시피!',
                button: '레시피 보기'
            },
            en: {
                title: recipe.name_en || recipe.name,
                description: 'Korean recipes with German ingredients!',
                button: 'View Recipe'
            },
            de: {
                title: recipe.name_de || recipe.name,
                description: 'Koreanische Rezepte mit deutschen Zutaten!',
                button: 'Rezept ansehen'
            }
        };

        const config = contentConfig[currentLang] || contentConfig['ko'];

        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: config.title,
                description: config.description,
                imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
                link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
            },
            buttons: [
                {
                    title: config.button,
                    link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
                }
            ],
        });
    }
};
// Utility function for exponential backoff retry logic
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
const BEST_MENU_K10 = [
    { id: 1, name_ko: "제육볶음", name_de: "Schweinefleischpfanne", name_en: "Spicy Pork Fry", icon: "🔥" },
    { id: 2, name_ko: "된장찌개", name_de: "Sojabohnenpaste-Eintopf", name_en: "Soybean Paste Stew", icon: "🥘" },
    { id: 3, name_ko: "김치찌개", name_de: "Kimchi-Eintopf", name_en: "Kimchi Stew", icon: "🍲" },
    { id: 4, name_ko: "불고기", name_de: "Bulgogi", name_en: "Bulgogi", icon: "🥩" },
    { id: 5, name_ko: "닭갈비", name_de: "Dakgalbi", name_en: "Spicy Chicken Stir-fry", icon: "🍗" },
    { id: 6, name_ko: "떡볶이", name_de: "Tteokbokki", name_en: "Tteokbokki", icon: "🌶️" },
    { id: 7, name_ko: "미역국", name_de: "Seetang-Suppe", name_en: "Seaweed Soup", icon: "🥣" },
    { id: 8, name_ko: "비빔밥", name_de: "Bibimbap", name_en: "Bibimbap", icon: "🥗" },
    { id: 9, name_ko: "파전", name_de: "Pajeon (Pfannkuchen)", name_en: "Scallion Pancake", icon: "🥞" },
    { id: 10, name_ko: "보쌈", name_de: "Bossam", name_en: "Boiled Pork Wraps", icon: "🥓" }
];

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

    // useEffect(() => {
    //     if (!db || !isAuthReady) return;

    //     const recipesRef = collection(db, `artifacts/${appId}/public_recipes`);
    //     const q = query(recipesRef, orderBy("timestamp", "desc"), limit(6));

    //     const unsubscribe = onSnapshot(q, (snapshot) => {
    //         const list = [];
    //         snapshot.forEach((doc) => {
    //             // doc.data()와 doc.id를 합쳐서 넣어줘야 합니다!
    //             list.push({ id: doc.id, ...doc.data() });
    //         });
    //         setRecentRecipes(list);
    //     });

    //     return () => unsubscribe();
    // }, [db, isAuthReady]);

    // System message handler

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
        // 1. 기본 체크
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
            const systemPrompt = `You are a specialized culinary chef focused on 'German Supermarket Korean Food'. 
            Return a JSON OBJECT (not array) with: name_ko, name_en, name_de, description_ko, description_en, description_de, ingredients (array), steps_ko (array), steps_en (array), steps_de (array).`;

            const result = await genAI.models.generateContent({
                model: "gemini-2.5-flash-preview-09-2025",
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `${systemPrompt}\n\nUser Query: ${userQuery}`,
                            },
                        ],
                    },
                ],
            });

            const text = result.text

            // 5. 파싱 
            let parsedRecipe = null;
try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON pattern not found");

    // 🔴 수정된 부분: \u00A0(특수 공백)를 일반 공백으로 치환
    const cleanJson = jsonMatch[0].replace(/\u00A0/g, " "); 
    
    const rawData = JSON.parse(cleanJson); // 치환된 텍스트로 파싱
    const finalData = Array.isArray(rawData) ? rawData[0] : rawData;

    // ... 나머지 로직 (동일)
    parsedRecipe = {
        name: finalData[`name_${currentLang}`] || finalData.name || finalData.name_ko,
        description: finalData[`description_${currentLang}`] || finalData.description || finalData.description_ko,
        ingredients: finalData[`ingredients_${currentLang}`] || finalData.ingredients || finalData.ingredients_ko || [],
        instructions: finalData[`steps_${currentLang}`] || finalData.instructions || finalData.steps_ko || finalData.steps || []
    };

    if (!parsedRecipe.name) throw new Error("Invalid structure");
    setGeneratedRecipe(parsedRecipe);

} catch (e) {
    console.error("JSON 파싱 실패:", e); // 'text' 대신 에러 객체를 출력하면 원인 파악이 더 쉽습니다.
    throw new Error("레시피 형식이 올바르지 않습니다.");
}
            // 6. 상태 업데이트
            setGeneratedRecipe(parsedRecipe);
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
            setSystemMessageHandler(`에러 발생: ${error.message}`, 'error');
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

                {/* 💡 이 부분이 추가되었습니다: 저장 버튼 */}
                <div className="mt-10 border-t pt-6">
    {!isRecipeSaved ? (
        <button
            onClick={handleSaveRecipe}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3
                ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'}`}
        >
            {isLoading ? (
                currentLang === 'ko' ? '⏳ 처리 중...' : (currentLang === 'de' ? '⏳ Wird bearbeitet...' : '⏳ Processing...')
            ) : (
                currentLang === 'ko' ? '🚀 레시피 저장하기' : (currentLang === 'de' ? '🚀 Rezept speichern' : '🚀 Save Recipe')
            )}
        </button>
    ) : (
        <div className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-center border-2 border-dashed border-gray-300">
            {currentLang === 'ko' ? '✅ 저장되었습니다!' : (currentLang === 'de' ? '✅ Gespeichert!' : '✅ Saved!')}
        </div>
    )}
</div>
            </div>
        );
    };

    const [isGuideOpen, setIsGuideOpen] = useState(false);

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
                            {/* 베스트 10 추천 메뉴 버튼들 */}
                            <div className="max-w-4xl mx-auto mb-8">
                                <div className="flex flex-wrap justify-center gap-3">
                                    {BEST_MENU_K10.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                // 현재 언어 설정에 맞는 이름을 가져와서 입력창에 주입
                                                const displayName =
                                                    currentLang === 'ko' ? item.name_ko :
                                                        (currentLang === 'de' ? item.name_de : item.name_en);
                                                setUserPrompt(displayName);
                                            }}
                                            className="px-4 py-2 bg-white border border-indigo-100 rounded-full shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all text-sm font-bold flex items-center gap-2 active:scale-95"
                                        >
                                            <span>{item.icon}</span>
                                            {/* 화면에 표시되는 글자 부분 */}
                                            {currentLang === 'ko' ? item.name_ko :
                                                (currentLang === 'de' ? item.name_de : item.name_en)}
                                        </button>
                                    ))}
                                </div>
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
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="animate-bounce">⏳</span>
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

                    {selectedRecipe && selectedRecipe.ingredients && (
                        <div className="max-w-4xl mx-auto px-6 mb-8">
                            <h3 className="text-lg font-bold mb-4">🛒 마트에서 재료 찾기</h3>
                            <div className="grid gap-2">
                                {Array.isArray(selectedRecipe.ingredients) ? (
                                    selectedRecipe.ingredients.map((ing, index) => {
                                        const name = typeof ing === 'object' ? ing.item : ing;
                                        const amount = typeof ing === 'object' ? ing.quantity : '';
                                        const note = typeof ing === 'object' ? ing.notes : '';

                                        return (
                                            <div key={index} className="flex justify-between items-center p-4 border-b bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{name}</span>
                                                        {amount && <span className="text-sm text-indigo-500 font-medium">({amount})</span>}
                                                    </div>
                                                    {note && <span className="text-[11px] text-gray-400 mt-1">{note}</span>}
                                                </div>

                                                <div className="flex gap-2">
                                                    <a
                                                        href={getMarketSearchLink('lidl', name)}
                                                        target="_blank"
                                                        className="text-[10px] bg-[#0050aa] text-white px-3 py-1.5 rounded-lg font-bold hover:brightness-110 transition"
                                                    >
                                                        Lidl
                                                    </a>
                                                    <a
                                                        href={getMarketSearchLink('rewe', name)}
                                                        target="_blank"
                                                        className="text-[10px] bg-[#cc071e] text-white px-3 py-1.5 rounded-lg font-bold hover:brightness-110 transition"
                                                    >
                                                        Rewe
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-4 text-gray-400">재료 정보를 불러오는 중입니다...</div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* 최근 레시피 목록 (안전하게 처리) */}
                    <div className="mt-12 mb-8">

                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span>🔍</span> {t?.recent_title || "Recent Recipes"}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {recentRecipes.length > 0 ? (
                                recentRecipes.map((r) => {
                                    const nameData = r[`name_${currentLang}`] || r.name_ko || r.name;
                                    const finalName = typeof nameData === 'object'
                                        ? (nameData[currentLang] || nameData.ko || nameData.en || "Untitled")
                                        : (nameData || "Untitled");
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => setSelectedRecipe(r)}
                                            className="p-5 bg-white border-2 border-transparent rounded-xl shadow-sm cursor-pointer hover:border-indigo-500 transition-all group"
                                        >
                                            <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 truncate text-lg">
                                                {finalName}
                                            </h3>
                                            <p className="text-gray-400 text-xs mt-2">
                                                {currentLang === 'ko' ? '레시피 보기' : 'View Recipe'} →
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="col-span-2 text-center py-10 text-gray-400">
                                    {currentLang === 'ko' ? '공유된 레시피를 불러오는 중...' : 'Loading recipes...'}
                                </p>
                            )}
                        </div>

                        {/* 더 보기 버튼 */}
                        {hasMore && (
                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={() => fetchRecipes(false)}
                                    disabled={isMoreLoading}
                                    className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg active:scale-95
                ${isMoreLoading
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'}`}
                                >
                                    {isMoreLoading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Laden...
                                        </span>
                                    ) : (
                                        currentLang === 'ko' ? '레시피 더 보기' : 'Mehr Rezepte laden'
                                    )}
                                </button>
                            </div>
                        )}

                        {!hasMore && recentRecipes.length > 0 && (
                            <p className="text-center text-gray-400 mt-10 italic">
                                {currentLang === 'ko' ? '모든 레시피를 불러왔습니다.' : 'Alle Rezepte wurden geladen.'}
                            </p>
                        )}
                    </div>

                    <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl p-4 text-center">
                        <div className="max-w-4xl mx-auto px-6 mb-12">
                            <PriceComparison />
                        </div>
                    </div>
                </main>

                {isGuideOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                        <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-10 relative">
                            <button
                                onClick={() => setIsGuideOpen(false)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">닫기</button>
                            <GermanMartTips lang={currentLang} />
                        </div>
                    </div>
                    
                )}

<Footer currentLang={currentLang} onOpenGuide={() => setIsGuideOpen(true)} />

{/* Modal이 떴을 때 배경을 살짝 어둡게 처리하는 로직이 RecipeModal 내부에 있는지 확인하세요 */}
{selectedRecipe && (
    <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        currentLang={currentLang}
        t={t}
        shareToKakao={shareToKakao}
        shareToWhatsApp={shareToWhatsApp}
    />
)}
            </div>
            
        </div>
        
    );

};

export default App;