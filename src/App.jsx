import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, addDoc, onSnapshot, collection, query, limit
} from 'firebase/firestore';

// =====================================================================
// 보안을 위해 환경에서 주입된 전역 변수를 사용하고, 오류 방지를 위한 폴백을 추가합니다.
// =====================================================================

// 사용자 정의 Firebase 구성 (전역 변수 로드 실패 시 사용될 하드코딩된 폴백)
const FALLBACK_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBCuExMq5WeAn6dvWM-Qj3rFGbYEgkUZuM",
    authDomain: "k-food-with-german-groceries.firebaseapp.com",
    projectId: "k-food-with-german-groceries",
    storageBucket: "k-food-with-german-groceries.firebasestorage.app",
    messagingSenderId: "1023501163434",
    appId: "1:1023501163434:web:8d5ac1aa46bd6aa4f4e9d3"
};

// 1. Firebase 구성 로드
let firebaseConfig = FALLBACK_FIREBASE_CONFIG;
if (typeof __firebase_config !== 'undefined') {
    try {
        const parsedConfig = JSON.parse(__firebase_config);
        if (parsedConfig && parsedConfig.apiKey && parsedConfig.projectId) {
            firebaseConfig = parsedConfig;
        } else {
             console.warn("경고: '__firebase_config'가 유효하지 않아 하드코딩된 폴백을 사용합니다.");
        }
    } catch (e) {
        console.warn("경고: '__firebase_config' 파싱 오류. 하드코딩된 폴백을 사용합니다.", e);
    }
}

// 2. Gemini API 키: 환경 변수(__gemini_api_key)를 사용합니다.
const GEMINI_API_KEY = typeof __gemini_api_key !== 'undefined' 
    ? __gemini_api_key 
    : ""; 

// 3. App ID 로드
const FALLBACK_APP_ID = 'recipe-blog-vsc-001';
const VITE_APP_ID_RAW = typeof __app_id !== 'undefined' 
    ? __app_id 
    : FALLBACK_APP_ID; 
const VITE_APP_ID = VITE_APP_ID_RAW.split('/')[0];


// 상수 정의 (이하 동일)
const MAX_RETRIES = 3;
const RATE_LIMIT_SECONDS = 3600; // 1시간 (60 * 60초)

// 텍스트 콘텐츠 정의 (다국어 지원)
const TEXT_CONTENT = {
  KR: {
    title: "독일 마트 K-레시피 🍜",
    subtitle: "현지 재료로 즐기는 한식! (한/독/영 3개국어 레시피 제공)",
    authStatus: "User ID:",
    adPlaceholder: "수익화 구역 : 상단 광고 (Top Banner Ad)",
    adLocation: "광고 코드 위치  ",
    aiSimulation: "✨ 독일 마트에서 찾는 한국의 맛",
    aiButton: "오늘의 레시피 자동 생성! 📝",
    latestRecipes: "최신 레시피 목록",
    loading: "레시피를 불러오는 중입니다...",
    authError: "(인증 오류: Firebase 설정 또는 네트워크를 확인하세요.)",
    generateErrorKey: "(API 키 오류: Gemini API 키가 올바르게 설정되지 않았습니다.)", // 메시지 강화
    generateSuccess: "새 레시피가 성공적으로 생성되었습니다!",
    generateError: "레시피 생성 중 오류 발생.",
    noRecipe: "아직 레시피가 없습니다. 생성 버튼을 눌러 시작하세요!",
    recipeGenerationInProgress: "새로운 레시피를 생성하는 중입니다...",
    languageSelector: "언어 선택:",
    korean: "한국어",
    german: "독일어",
    english: "영어",
    rateLimit: (time) => `생성 제한: ${time}분 후 다시 시도해 주세요.`,
    commentsTitle: "댓글",
    addComment: "댓글 달기",
    commentPlaceholder: "댓글을 입력하세요...",
    commentSuccess: "댓글이 등록되었습니다.",
    commentError: "댓글 등록 중 오류 발생.",
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
    generateErrorKey: "(API Key Error: Gemini API Key is not set correctly.)", 
    generateSuccess: "Neues Rezept wurde erfolgreich erstellt!",
    generateError: "Fehler beim Erstellen des Rezepts.",
    noRecipe: "Es sind noch keine Rezepte vorhanden. Starten Sie mit dem Generierungsknopf!",
    recipeGenerationInProgress: "Wir erstellen neue Rezepte..",
    languageSelector: "Sprache wählen:",
    korean: "Koreanisch",
    german: "Deutsch",
    english: "Englisch",
    rateLimit: (time) => `Limit: Bitte versuchen Sie es in ${time} Minuten erneut.`,
    commentsTitle: "Kommentare",
    addComment: "Kommentieren",
    commentPlaceholder: "Kommentar eingeben...",
    commentSuccess: "Kommentar wurde hinzugefügt.",
    commentError: "Fehler beim Hinzufügen des Kommentars.",
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
    generateErrorKey: "(API Key Error: Gemini API Key is not set correctly.)",
    generateSuccess: "New recipe successfully generated!",
    generateError: "Error generating recipe.",
    noRecipe: "No recipes yet. Click the Generation button to start!",
    recipeGenerationInProgress: "We are generating a new recipe...",
    languageSelector: "Select Language:",
    korean: "Korean",
    german: "German",
    english: "English",
    rateLimit: (time) => `Rate Limit: Please try again in ${time} minutes.`,
    commentsTitle: "Comments",
    addComment: "Add Comment",
    commentPlaceholder: "Enter your comment...",
    commentSuccess: "Comment posted successfully.",
    commentError: "Error posting comment.",
  },
};

// Firebase 초기화
let app, db, auth;
try {
  // 최소한의 설정 값이 있는지 확인합니다.
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase가 성공적으로 초기화되었습니다.");
  } else {
    // Firebase 구성 누락 시 오류 로깅
    console.error("Firebase 초기화 오류: Firebase 구성이 올바르지 않습니다.");
  }
} catch (error) {
  console.error("Firebase 초기화 오류:", error);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); 
  const [language, setLanguage] = useState('KR'); 
  
  const T = TEXT_CONTENT[language];

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
        try {
          // __initial_auth_token을 사용하여 Custom Token으로 인증을 시도하고, 
          // 토큰이 없으면 익명 인증으로 폴백합니다.
          if (typeof __initial_auth_token !== 'undefined') {
              const userCredential = await signInWithCustomToken(auth, __initial_auth_token);
              setUserId(userCredential.user.uid);
          } else {
              const anonymousUser = await signInAnonymously(auth);
              setUserId(anonymousUser.user.uid);
          }
        } catch (error) {
          console.error("인증 실패:", error);
          setUserId(null); 
        }
      }
      setAuthReady(true); // 인증 상태(성공 또는 실패)를 확인했으므로 true 설정
    });

    return () => unsubscribe();
  }, []);

  // 2. 레시피 데이터 실시간 리스너 (Firestore Snapshot)
  useEffect(() => {
    // db가 초기화되고 userId가 확정된 후에만 쿼리를 실행하여 권한 오류를 방지합니다.
    if (!db || !userId) {
      if (authReady && !userId) {
        setStatusMessage(T.authError);
      }
      return;
    }
    
    console.log("Firestore Query Running for user:", userId);

    const recipeCollectionRef = collection(db, `artifacts/${VITE_APP_ID}/public/data/recipes`);
    // orderBy() 대신 JavaScript에서 정렬을 수행하기 위해 쿼리에서 제거했습니다.
    const q = query(recipeCollectionRef, limit(10));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        let fetchedRecipes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // JavaScript에서 최신 순으로 정렬 (orderBy('createdAt', 'desc') 대체)
        fetchedRecipes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setRecipes(fetchedRecipes);
        
        // 상태 메시지 업데이트 로직
        if (fetchedRecipes.length === 0 && !isLoading) {
           setStatusMessage(T.noRecipe);
        } else if (!isLoading && !statusMessage.includes('제한')) {
           setStatusMessage("");
        }
      }, 
      (error) => {
        console.error("Firestore 데이터 로딩 오류:", error);
        // 권한 오류 발생 시 에러 메시지 업데이트
        setStatusMessage(T.authError + ` (${error.code})`);
      }
    );

    return () => unsubscribe();
  }, [authReady, T, isLoading, userId]); // userId를 의존성 배열에 명시적으로 추가하여 인증 완료 후 실행 보장


  // 3. Rate Limiting 체크 및 Gemini API 호출
  const generateRecipe = useCallback(async () => {
    if (!userId || !db) {
      setStatusMessage("🚨 사용자 인증(User ID)이 완료되지 않아 레시피를 생성할 수 없습니다.");
      return;
    }
    
    // 🚨 API 키 유효성 검사 추가
    if (!GEMINI_API_KEY) {
        console.error("Gemini API Key가 비어 있습니다. .env 파일 설정을 확인하세요.");
        setStatusMessage(T.generateErrorKey);
        return;
    }

    // Rate Limiting 체크: Rate limit 문서는 사용자 개인 경로에 저장합니다.
    const rateLimitDocRef = doc(db, `artifacts/${VITE_APP_ID}/users/${userId}/user_settings/rate_limit`);
    let lastGeneratedAt = null;

    try {
        const rateLimitSnapshot = await getDoc(rateLimitDocRef);
        if (rateLimitSnapshot.exists()) {
            lastGeneratedAt = rateLimitSnapshot.data().lastGeneratedAt;
        }
    } catch (e) {
        console.error("Rate Limit 데이터 로드 오류:", e);
    }

    const now = new Date();
    const lastTime = lastGeneratedAt ? (typeof lastGeneratedAt === 'string' ? new Date(lastGeneratedAt) : (lastGeneratedAt.toDate ? lastGeneratedAt.toDate() : new Date(lastGeneratedAt))) : null;
    
    if (lastTime) {
        const elapsedSeconds = (now.getTime() - lastTime.getTime()) / 1000;

        if (elapsedSeconds < RATE_LIMIT_SECONDS) {
            const remainingSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsedSeconds);
            const remainingMinutes = Math.ceil(remainingSeconds / 60);
            setStatusMessage(T.rateLimit(remainingMinutes));
            return;
        }
    }

    // Rate Limit 통과, API 호출 시작
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
        // GEMINI_API_KEY 변수는 이미 위에서 정의되어 있습니다.
        const apiKey = GEMINI_API_KEY; 
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        console.log(`Gemini API 호출 시도 ${i + 1}/${MAX_RETRIES}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Gemini API 호출 실패 (${response.status}):`, errorBody);
          // 403 오류의 경우, API 키 문제이므로 재시도하지 않고 바로 중단합니다.
          if (response.status === 403) {
             setStatusMessage(T.generateErrorKey);
             break; 
          }
          setStatusMessage(`🚨 Gemini API 오류 (${response.status}): 요청 실패. 콘솔을 확인하세요.`);
          break; 
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
        if (i < MAX_RETRIES - 1) {
            await delay(Math.pow(2, i) * 1000); 
        }
      }
    }

    if (success && generatedRecipe) {
      try {
        // 1. 레시피 데이터 저장: 공개 경로에 저장합니다.
        const recipeData = {
          ...generatedRecipe,
          createdAt: new Date().toISOString(),
          userId: userId,
        };
        await addDoc(collection(db, `artifacts/${VITE_APP_ID}/public/data/recipes`), recipeData);

        // 2. Rate Limit 타임스탬프 업데이트 (성공 시에만)
        await setDoc(rateLimitDocRef, { lastGeneratedAt: now.toISOString() }, { merge: true });
        
        setStatusMessage(T.generateSuccess);
      } catch (dbError) {
        console.error("Firestore 저장 또는 Rate Limit 업데이트 오류:", dbError);
        setStatusMessage(T.generateError);
      }
    } else {
        // 이미 API 오류 메시지가 설정된 경우가 아니라면 일반 오류 메시지를 설정
        if (!statusMessage.includes('API 오류') && !statusMessage.includes('API Key')) {
            setStatusMessage(T.generateError);
        }
    }

    setIsLoading(false);
  }, [userId, T, db]);

  // CommentSection Component (RecipeCard 내부에서 사용)
  const CommentSection = ({ recipeId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentStatus, setCommentStatus] = useState('');

    useEffect(() => {
        if (!db || !userId) return; // userId 확정 후 실행

        const commentsRef = collection(db, `artifacts/${VITE_APP_ID}/public/data/recipes/${recipeId}/comments`);
        const q = query(commentsRef, limit(10)); 

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const fetchedComments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // 최신 순으로 JS에서 정렬
                fetchedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setComments(fetchedComments);
            },
            (error) => {
                console.error("댓글 로딩 오류:", error);
            }
        );
        return () => unsubscribe();
    }, [recipeId, userId]); // userId를 의존성 배열에 추가하여 권한 오류 방지

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !userId) {
            setCommentStatus("댓글 내용을 입력하거나, 사용자 인증이 필요합니다.");
            return;
        }

        try {
            const commentData = {
                userId: userId,
                text: newComment.trim(),
                createdAt: new Date().toISOString(),
            };
            const commentsRef = collection(db, `artifacts/${VITE_APP_ID}/public/data/recipes/${recipeId}/comments`);
            await addDoc(commentsRef, commentData);
            
            setNewComment('');
            setCommentStatus(T.commentSuccess);
            setTimeout(() => setCommentStatus(''), 3000);

        } catch (error) {
            console.error("댓글 등록 오류:", error);
            setCommentStatus(T.commentError);
            setTimeout(() => setCommentStatus(''), 3000);
        }
    };

    return (
        <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold text-xl text-gray-800 mb-3">{T.commentsTitle} ({comments.length})</h4>
            
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                {comments.length > 0 ? comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-700">{comment.text}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {comment.userId.substring(0, 8)}... (at {new Date(comment.createdAt).toLocaleDateString()})
                        </p>
                    </div>
                )) : (
                    <p className="text-sm text-gray-400 italic">첫 댓글을 남겨주세요.</p>
                )}
            </div>

            <form onSubmit={handleAddComment}>
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={T.commentPlaceholder}
                    rows="2"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                />
                <button
                    type="submit"
                    disabled={!userId}
                    className="mt-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-700 transition disabled:bg-gray-400 text-sm"
                >
                    {T.addComment}
                </button>
                {commentStatus && (
                    <p className={`mt-2 text-xs font-medium ${commentStatus.includes('오류') || commentStatus.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {commentStatus}
                    </p>
                )}
            </form>
        </div>
    );
  };


  // 레시피 카드의 언어별 렌더링
  const RecipeCard = ({ recipe }) => {
    if (!recipe || !recipe.name || !recipe.name[language]) return null;

    return (
      <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-1 mb-6 border-l-4 border-red-500">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{recipe.name[language]}</h3>
        <p className="text-sm text-gray-500 mb-4">{T.languageSelector} {language} | {recipe.prepTimeMinutes}min | {recipe.serveCount} {language === 'KR' ? '인분' : 'Servings'}</p>
        
        <p className="text-gray-600 italic mb-4 border-b pb-2">{recipe.description[language]}</p>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-semibold text-lg text-red-600 mb-2 border-b-2 border-red-100 pb-1">
              {language === 'KR' ? '재료' : (language === 'DE' ? 'Zutaten' : 'Ingredients')}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
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
        
        <CommentSection recipeId={recipe.id} />
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
            // 로딩 중이거나 인증이 안 되었거나 생성 제한 상태이면 버튼 비활성화
            disabled={isLoading || !authReady || !userId || statusMessage.includes('제한')}
            className={`
              w-full md:w-auto px-6 py-3 rounded-full font-bold text-white transition duration-300 shadow-lg
              ${(isLoading || statusMessage.includes('제한')) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:bg-red-800 hover:shadow-xl'}
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
            <p className={`mt-3 text-sm font-medium ${statusMessage.includes('오류') || statusMessage.includes('Error') || statusMessage.includes('Fehler') || statusMessage.includes('API Key') || statusMessage.includes('제한') ? 'text-red-500' : 'text-green-600'}`}>
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