import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, addDoc, onSnapshot, collection, query, limit, orderBy 
} from 'firebase/firestore';

// 캔버스 환경 변수와 전역 변수를 사용하여 설정 로드
// Gemini API Key는 Canvas 환경에서 자동으로 주입되므로 빈 문자열로 설정합니다.
const VITE_GEMINI_API_KEY = ""; 

// __app_id와 __firebase_config는 캔버스 환경에서 전역으로 제공됩니다.
const VITE_APP_ID_RAW = typeof __app_id !== 'undefined' ? __app_id : 'recipe-blog-vsc-001';

// [중요 수정] Firestore 경로 오류 방지: VITE_APP_ID에 슬래시(/)가 포함되어 세그먼트 수가 짝수가 되는 것을 방지하기 위해 첫 번째 세그먼트만 사용합니다.
const VITE_APP_ID = VITE_APP_ID_RAW.split('/')[0];

// Firebase 설정은 캔버스 환경에서 제공되는 __firebase_config 전역 변수에 의존합니다.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};


// 텍스트 콘텐츠 정의 (다국어 지원)
const TEXT_CONTENT = {
  KR: {
    title: "독일 마트 K-레시피 🍜",
    subtitle: "현지 재료로 즐기는 한식! (한/독/영 3개국어 레시피 제공)",
    authStatus: "User ID:",
    adPlaceholder: "수익화 구역 : 상단 광고 (Top Banner Ad)",
    adLocation: "광고 코드 위치  ",
    aiSimulation: "✨ 독일 마트에서 찾는 한국의 맛",
    aiButton: "오늘의 레시피 자동 생성! 📝",
    latestRecipes: "최신 레시피 목록",
    loading: "레시피를 불러오는 중입니다...",
    authError: "(인증 오류: Firebase 설정 또는 네트워크를 확인하세요.)",
    generateSuccess: "새 레시피가 성공적으로 생성되었습니다!",
    generateError: "레시피 생성 중 오류 발생.",
    noRecipe: "아직 레시피가 없습니다. 생성 버튼을 눌러 시작하세요!",
    recipeGenerationInProgress: "새로운 레시피를 생성하는 중입니다...",
    languageSelector: "언어 선택:",
    korean: "한국어",
    german: "독일어",
    english: "영어",
  },
  DE: {
    title: "K-Rezept Blog für deutsche Supermärkte 🍜 ",
    subtitle: "Koreanisches Essen mit lokalen Zutaten! (Rezepte in DE/KR/EN)",
    authStatus: "User ID:",
    adPlaceholder: "Monetarisierungsbereich : Obere Werbung",
    adLocation: "Platzierung des Ad-Codes ",
    aiSimulation: "✨ Tägliche Update-Simulation",
    aiButton: "Automatisches Generieren des heutigen Rezepts! 📝",
    latestRecipes: "Neueste Rezepte",
    loading: "Rezepte werden geladen...",
    authError: "(Authentifizierungsfehler: Überprüfen Sie die Firebase-Einstellungen oder das Netzwerk.)",
    generateSuccess: "Neues Rezept wurde erfolgreich erstellt!",
    generateError: "Fehler beim Erstellen des Rezepts.",
    noRecipe: "Es sind noch keine Rezepte vorhanden. Starten Sie mit dem Generierungsknopf!",
    recipeGenerationInProgress: "Wir erstellen neue Rezepte..",
    languageSelector: "Sprache wählen:",
    korean: "Koreanisch",
    german: "Deutsch",
    english: "Englisch",
  },
  EN: {
    title: "K-Food Recipe Blog for German Groceries 🍜 ",
    subtitle: "Korean food with local ingredients! (Recipes in EN/KR/DE)",
    authStatus: "User ID:",
    adPlaceholder: "Monetization Zone : Top Banner Ad",
    adLocation: "Ad Code Placement ",
    aiSimulation: "✨ Daily Update Simulation",
    aiButton: "Generate Today's Recipe Automatically! 📝",
    latestRecipes: "Latest Recipes List",
    loading: "Loading recipes...",
    authError: "(Authentication Error: Check Firebase settings or network.)",
    generateSuccess: "New recipe successfully generated!",
    generateError: "Error generating recipe.",
    noRecipe: "No recipes yet. Click the Generation button to start!",
    recipeGenerationInProgress: "We are generating a new recipe...",
    languageSelector: "Select Language:",
    korean: "Korean",
    german: "German",
    english: "English",
  },
};

const MAX_RETRIES = 3;

// Firebase 초기화
let app, db, auth;
try {
  // firebaseConfig가 유효한지 확인합니다.
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (error) {
  console.error("Firebase 초기화 오류:", error);
}

// 지연 함수 (API 호출 시 백오프 로직에 사용)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [language, setLanguage] = useState('KR'); // KR을 기본 언어로 설정
  
  const T = TEXT_CONTENT[language]; // 선택된 언어 콘텐츠

  // 1. Firebase 인증 상태 리스너 및 초기화
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // 익명 로그인 시도 (인증이 안 되어 있을 경우)
        try {
          // __initial_auth_token이 정의되어 있으면 Custom Token으로 로그인
          if (typeof __initial_auth_token !== 'undefined') {
              const userCredential = await signInWithCustomToken(auth, __initial_auth_token);
              setUserId(userCredential.user.uid);
          } else {
              // 그렇지 않으면 익명 로그인 시도
              const anonymousUser = await signInAnonymously(auth);
              setUserId(anonymousUser.user.uid);
          }
        } catch (error) {
          console.error("인증 실패:", error);
          setUserId(null); // 로그인 실패 시 User ID를 null로 설정
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. 레시피 데이터 실시간 리스너 (Firestore Snapshot)
  useEffect(() => {
    if (!db || !authReady || !userId) {
      // 인증 준비가 안 되었거나 db 객체가 없으면 리스너를 실행하지 않음
      if (authReady && !userId) {
        // 인증 실패 시 메시지 출력
        setStatusMessage(T.authError);
      }
      return;
    }
    
    // Firestore 컬렉션 경로: /artifacts/{appId}/public/data/recipes
    const recipeCollectionRef = collection(db, `artifacts/${VITE_APP_ID}/public/data/recipes`);
    // orderBy() 대신에 JavaScript에서 정렬하기 위해 orderBy()를 제거합니다.
    const q = query(recipeCollectionRef, limit(10));
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        let fetchedRecipes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 데이터가 로드되면 createdAt 필드를 기준으로 JavaScript에서 정렬합니다.
        fetchedRecipes.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return 0;
        });

        setRecipes(fetchedRecipes);
        setStatusMessage(fetchedRecipes.length === 0 ? T.noRecipe : "");
      }, 
      (error) => {
        console.error("Firestore 데이터 로딩 오류:", error);
        setStatusMessage(T.authError); // Firestore 오류 시 인증/네트워크 오류 메시지 출력
      }
    );

    return () => unsubscribe(); // 컴포넌트 언마운트 시 리스너 해제
  }, [authReady, userId, T]);


  // 3. Gemini API 호출 및 Firestore 저장
  const generateRecipe = useCallback(async () => {
    if (!userId) {
      setStatusMessage("🚨 사용자 인증(User ID)이 완료되지 않아 레시피를 생성할 수 없습니다.");
      return;
    }

    setIsLoading(true);
    setStatusMessage(T.recipeGenerationInProgress);

    const systemPrompt = `You are a creative culinary assistant specializing in fusion recipes. Your task is to invent one unique Korean dish that exclusively uses ingredients easily found in standard German supermarkets (Lidl, Edeka, Rewe etc.). The response MUST be a JSON array containing a single recipe object. The recipe should be returned in 3 languages: Korean (ko), German (de), and English (en).

    The JSON schema must be:
    [
      {
        "name": {"ko": "...", "de": "...", "en": "..."},
        "description": {"ko": "...", "de": "...", "en": "..."},
        "ingredients": {"ko": ["...", "..."], "de": ["...", "..."], "en": ["...", "..."]},
        "steps": {"ko": ["...", "..."], "de": ["...", "..."], "en": ["...", "..."]},
        "prepTimeMinutes": 30,
        "serveCount": 2,
        "germanGroceryTip": {"ko": "...", "de": "...", "en": "..."}
      }
    ]
    
    Ensure all string contents in the JSON array are valid JSON strings (e.g., escape double quotes if used).`;

    const userQuery = "Create a savory Korean side dish (Banchan) that is perfect for a weeknight dinner using common German ingredients.";

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
              "name": { type: "OBJECT" },
              "description": { type: "OBJECT" },
              "ingredients": { type: "OBJECT" },
              "steps": { type: "OBJECT" },
              "prepTimeMinutes": { type: "INTEGER" },
              "serveCount": { type: "INTEGER" },
              "germanGroceryTip": { type: "OBJECT" },
            },
            propertyOrdering: ["name", "description", "ingredients", "steps", "prepTimeMinutes", "serveCount", "germanGroceryTip"]
          }
        }
      }
    };

    let generatedRecipe = null;
    let success = false;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        // VITE_GEMINI_API_KEY가 비어 있지만, Canvas 환경에서 자동으로 API 키를 제공합니다.
        const apiKey = VITE_GEMINI_API_KEY; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        // API 호출
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
          const parsedJson = JSON.parse(jsonText);
          generatedRecipe = parsedJson[0];
          success = true;
          break;
        }
      } catch (error) {
        console.error(`Gemini API 호출 실패 (시도 ${i + 1}/${MAX_RETRIES}):`, error);
        await delay(Math.pow(2, i) * 1000); // Exponential backoff (1s, 2s, 4s delay)
      }
    }

    if (success && generatedRecipe) {
      try {
        const recipeData = {
          ...generatedRecipe,
          createdAt: new Date().toISOString(),
          userId: userId,
        };
        // Firestore에 레시피 저장
        await addDoc(collection(db, `artifacts/${VITE_APP_ID}/public/data/recipes`), recipeData);
        setStatusMessage(T.generateSuccess);
      } catch (dbError) {
        console.error("Firestore 저장 오류:", dbError);
        setStatusMessage(T.generateError);
      }
    } else {
      setStatusMessage(T.generateError);
    }

    setIsLoading(false);
  }, [userId, T]);

  // 레시피 카드의 언어별 렌더링
  const RecipeCard = ({ recipe }) => {
    // 레시피 객체가 없거나 해당 언어 콘텐츠가 없으면 null 반환
    if (!recipe || !recipe.name || !recipe.name[language]) return null;

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-1 mb-4 border-l-4 border-red-500">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{recipe.name[language]}</h3>
        <p className="text-sm text-gray-500 mb-4">{T.languageSelector} {language} | {recipe.prepTimeMinutes}min | {recipe.serveCount} {language === 'KR' ? '인분' : 'Servings'}</p>
        
        <p className="text-gray-600 italic mb-4 border-b pb-2">{recipe.description[language]}</p>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-semibold text-lg text-red-600 mb-2 border-b-2 border-red-100 pb-1">
              {language === 'KR' ? '재료' : (language === 'DE' ? 'Zutaten' : 'Ingredients')}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {/* [수정] 배열에서 문자열만 필터링하여 React Object-as-child 오류 방지 */}
              {recipe.ingredients[language]
                ?.filter(item => typeof item === 'string')
                .map((item, index) => (
                <li key={index} className="text-sm">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-lg text-red-600 mb-2 border-b-2 border-red-100 pb-1">
              {language === 'KR' ? '조리 방법' : (language === 'DE' ? 'Zubereitung' : 'Instructions')}
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              {/* [수정] 배열에서 문자열만 필터링하여 React Object-as-child 오류 방지 */}
              {recipe.steps[language]
                ?.filter(step => typeof step === 'string')
                .map((step, index) => (
                <li key={index} className="text-sm">{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <h5 className="font-semibold text-sm text-yellow-800">
              {language === 'KR' ? '🇩🇪 마트 팁' : (language === 'DE' ? '🇩🇪 Supermarkt-Tipp' : '🇩🇪 German Grocery Tip')}
            </h5>
            <p className="text-sm text-yellow-700 mt-1">{recipe.germanGroceryTip[language]}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* 헤더 및 언어 선택 */}
        <header className="mb-8 border-b pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-red-700">{T.title}</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">{T.subtitle}</p>
          </div>
          
          {/* 언어 선택 드롭다운 */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
            <label htmlFor="language-select" className="hidden md:inline">{T.languageSelector}</label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white cursor-pointer"
            >
              <option value="KR">{T.korean} (KR)</option>
              <option value="DE">{T.german} (DE)</option>
              <option value="EN">{T.english} (EN)</option>
            </select>
          </div>
        </header>

        {/* 상태 정보 및 인증 */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-sm">
          <p className="text-gray-600">
            {T.authStatus}{' '}
            <span className={`font-semibold ${userId ? 'text-green-600' : 'text-red-500'}`}>
              {userId || T.authError}
            </span>
          </p>
        </div>

        {/* 광고 영역 (Placeholder) */}
        <div className="my-6">
          <p className="text-xs text-gray-500 mb-1">{T.adPlaceholder}</p>
          <div className="h-20 bg-gray-200 flex items-center justify-center rounded-lg border border-dashed border-gray-400 font-mono text-xs text-gray-700">
            {T.adLocation}
          </div>
        </div>

        {/* AI 시뮬레이션 섹션 */}
        <div className="bg-red-50 p-6 rounded-xl shadow-inner mb-8">
          <h2 className="text-xl font-bold text-red-700 mb-3">{T.aiSimulation}</h2>
          <button
            onClick={generateRecipe}
            disabled={isLoading || !authReady || !userId}
            className={`
              w-full md:w-auto px-6 py-3 rounded-full font-bold text-white transition duration-300 shadow-lg
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 hover:shadow-xl'}
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {T.recipeGenerationInProgress}
              </span>
            ) : T.aiButton}
          </button>
          
          {/* 상태 메시지 */}
          {statusMessage && (
            <p className={`mt-3 text-sm font-medium ${statusMessage.includes('오류') || statusMessage.includes('Error') || statusMessage.includes('Fehler') ? 'text-red-500' : 'text-green-600'}`}>
              {statusMessage}
            </p>
          )}
        </div>

        {/* 최신 레시피 목록 */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 pb-2">{T.latestRecipes}</h2>
        
        {recipes.length > 0 ? (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic p-4 bg-white rounded-lg shadow-md">{T.noRecipe}</p>
        )}
        
      </div>
    </div>
  );
}