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
        price_title: "한국 식품 품목별 최저가",
        price_subtitle: "주요 품목의 실시간 최저가 정보를 확인하세요.",
        last_update: "최근 업데이트",
        coffee_title: "여러분의 장바구니 물가를 덜어드리는 Kfoodtracker입니다.",
        coffee_desc: "보내주시는 따뜻한 커피 한 잔은 서버 유지비에 크나큰 힘이 됩니다!",
        coffee_button: "커피 사주기",
        mart_compare: "개 마트 비교",
        no_price_data: "비교 가능한 데이터가 아직 없습니다.",
        best_price: "최저가"
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
        price_title: "Lowest Prices by Item",
        price_subtitle: "Check real-time lowest price information for key items.",
        last_update: "Last Updated",
        coffee_title: "I'm Kfoodtracker, helping you save on your grocery bills.",
        coffee_desc: "A warm cup of coffee is a great help for server maintenance costs!",
        coffee_button: "Buy me a coffee",
        mart_compare: "marts compared",
        no_price_data: "No comparison data available yet.",
        best_price: "Best Price"
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
        price_title: "Tiefstpreise nach Artikeln",
        price_subtitle: "Prüfen Sie Echtzeit-Tiefstpreis-Informationen für wichtige Artikel.",
        last_update: "Zuletzt aktualisiert",
        coffee_title: "Ich bin Kfoodtracker und helfe euch, eure Lebensmittelkosten zu senken.",
        coffee_desc: "Ein kleiner Kaffee hilft mir, die Serverkosten zu decken!",
        coffee_button: "Kaffee spendieren",
        mart_compare: "Märkte im Vergleich",
        no_price_data: "Noch keine Vergleichsdaten verfügbar.",
        best_price: "Bester Preis"
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
    const [lastUpdate, setLastUpdate] = useState("");
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
                const jsonMatch = text.match(/\{[\s\S]*\}/);
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

            <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
                {/* 1. 최상단 헤더: 로고와 언어 선택만 깔끔하게 */}
                <header className="bg-white border-b border-slate-100">
                    <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
                        <h1 className="text-xl font-black text-indigo-900">
                            K-Food <span className="text-indigo-500 font-light">Tracker</span>
                        </h1>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {['ko', 'en', 'de'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setCurrentLang(lang)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${currentLang === lang ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                                        }`}
                                >
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-6">
                    {/* 2. 커피 후원 배너: 로고 바로 아래 한 줄로 (기존 디자인 복구) */}
                    <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between border border-amber-100/50 shadow-sm gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">☕</span>
                            <div className="text-left">
                                <p className="text-sm font-black text-amber-900 leading-tight">{t?.coffee_title}</p>
                                <p className="text-[11px] text-amber-700 mt-0.5 font-medium">{t?.coffee_desc}</p>
                            </div>
                        </div>
                        <a
                            href="https://ko-fi.com/kfoodtracker"
                            target="_blank"
                            className="w-full sm:w-auto bg-amber-800 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-amber-900 transition-all text-center shadow-md shrink-0"
                        >
                            {t?.coffee_button}
                        </a>
                    </div>

                    {/* 3. 메인 콘텐츠: 좌우 너비 동일 (w-full / grid-cols-2) */}
                    {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"> */}

                    <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-8 items-start">

                        {/* [영역 A] 레시피 생성 및 최근 레시피 (모바일에서는 아래로) */}
                        <div className="w-full space-y-6">
                            <section className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                        🍳 {t?.title}
                                    </h2>
                                    <p className="text-sm text-slate-400 font-medium mt-1">{t?.subtitle}</p>
                                </div>

                                {/* 메뉴 버튼 그룹: 클릭 시 언어별 메뉴명이 입력창에 자동으로 들어감 */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {BEST_MENU_K10.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                const menuName = currentLang === 'ko' ? item.name_ko : (currentLang === 'de' ? item.name_de : item.name_en);
                                                setUserPrompt(menuName);
                                            }}
                                            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-600 hover:border-indigo-300 transition-all active:scale-95"
                                        >
                                            {item.icon} {currentLang === 'ko' ? item.name_ko : (currentLang === 'de' ? item.name_de : item.name_en)}
                                        </button>
                                    ))}
                                </div>

                                {/* 입력창: min-h를 줘서 모바일에서도 충분한 크기 확보 */}
                                <textarea
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl resize-none focus:ring-2 focus:ring-indigo-500 min-h-[140px] text-sm"
                                    placeholder={t?.placeholder}
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                />

                                {/* 생성 버튼 */}
                                <button
                                    onClick={handleGenerateRecipe}
                                    disabled={isLoading}
                                    className="w-full mt-4 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? t?.button_loading : t?.button_ready}
                                </button>

                                {/* 생성 제한 메시지 */}
                                <div className="mt-4">
                                    {getRateLimitMessage && getRateLimitMessage()}
                                </div>
                            </section>

                            {/* 최근 레시피 목록 */}
                            <section className="mt-12 w-full">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    ✨ {t?.recent_title}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recentRecipes.map((r) => {
                                        const recipeTitle = r[`name_${currentLang}`] || r.name_ko || r.name_en || r.name_de || r.name || "Untitled Recipe";
                                        return (
                                            <div
                                                key={r.id}
                                                onClick={() => setSelectedRecipe(r)}
                                                // 🎨 디자인 복구: 배경, 테두리, 그림자, 호버 효과 추가
                                                className="group p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[110px] active:scale-[0.98]"
                                            >
                                                <h3 className="font-bold text-slate-700 group-hover:text-indigo-600 truncate text-base">
                                                    {recipeTitle}
                                                </h3>

                                                <div className="flex justify-between items-center mt-4">
                                                    <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">
                                                        {currentLang === 'ko' ? '레시피 보기' : (currentLang === 'de' ? 'Rezept ansehen' : 'View Recipe')}
                                                    </span>
                                                    {/* 🎨 호버 시 오른쪽으로 살짝 움직이는 화살표 */}
                                                    <span className="text-indigo-500 font-bold transform group-hover:translate-x-1 transition-transform">
                                                        →
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* 레시피 하단 컨트롤 영역 - 완전 중앙 정렬 및 투명 배경 적용 */}
<div className="mt-16 mb-24 w-full px-4">
    {/* justify-center를 사용하여 두 버튼을 화면 정중앙에 모읍니다 */}
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        
        {/* 1. 레시피 더 보기 버튼 */}
        {hasMore && (
            <div className="w-full sm:w-auto">
                <button
                    onClick={() => fetchRecipes(false)}
                    disabled={isMoreLoading}
                    className="w-full sm:w-[220px] px-8 py-4 rounded-2xl font-black text-sm bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isMoreLoading ? "Loading..." : (currentLang === 'ko' ? "레시피 더 보기 +" : "Show More +")}
                </button>
            </div>
        )}


        
    </div>
</div>
                            </section>
                                   
                        </div>

                        <div className="w-full">
                            <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                {/* 🎨 개선된 최저가 타이틀 영역 */}
                                <div className="p-6 md:p-8 border-b border-slate-50 flex flex-row items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">🛒 {t?.price_title}</h2>
                                        <p className="text-sm text-slate-400 font-medium mt-1">{t?.price_subtitle}</p>
                                    </div>

                                    {/* 📱 모바일에서 제목 안 깨지게 '최근 업데이트'와 '시간'을 두 줄로 분리 */}
                                    {lastUpdate ? (
                                        <div className="shrink-0 flex flex-col items-end text-right">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md mb-1">
                                                {t?.last_update || "Last Update"}
                                            </span>
                                            <span className="text-[10px] text-indigo-600 font-black leading-tight">
                                                {lastUpdate.split(', ').map((line, i) => (
                                                    <span key={i} className="block">{line}</span>
                                                ))}
                                            </span>
                                        </div>
                                    ) : (
                                        /* 데이터 로딩 전이나 없을 때 자리 표시 */
                                        <div className="shrink-0 h-10 w-20 bg-slate-50 animate-pulse rounded-xl" />
                                    )}
                                </div>

                                <div className="bg-white">
                                    {/* setLastUpdate를 넘겨서 자식 컴포넌트가 데이터를 가져오면 부모의 상태를 업데이트하게 함 */}
                                    <PriceComparison
                                        currentLang={currentLang}
                                        langConfig={langConfig}
                                        onUpdateData={(time) => setLastUpdate(time)}
                                    />
                                </div>
                                
                            </section>
                             {/* 2. 제보 버튼 (배경 투명 & 이메일 연결) */}
                             <div className="w-full mt-12 mb-20 flex flex-col items-center">
    <div className="w-full max-w-6xl px-4 flex flex-col items-center gap-3">
        {/* 설명 텍스트 (선택 사항) */}
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">
            {/* {currentLang === 'ko' ? "정보 수정 및 상품 제보" : "Report Data"} */}
        </p>
        
        <a 
            href="mailto:matagom10@gmail.com"
            className="w-full sm:w-[280px] px-8 py-4 rounded-2xl font-black text-sm bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
            <span>{currentLang === 'ko' ? "상품 및 오류 제보 ✍️" : "REPORT DATA OR ERROR ✍️"}</span>
        </a>
    </div>
</div>
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
                {selectedRecipe && (
                    <RecipeModal
                        recipe={selectedRecipe}
                       onClose={() => {
            setSelectedRecipe(null);
            setGeneratedRecipe(null); // 닫을 때 생성된 레시피도 초기화
        }}
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