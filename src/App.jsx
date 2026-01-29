import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { db, appId, userId } from './utils/firebase';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore'; // 추가됨

// Components & Views (유지)
import Header from './components/Header';
import Footer from './components/Footer';
import HomeView from './features/home/HomeView';
import PriceComparison from './features/price/PriceComparison';
import RecipeView from './features/recipe/RecipeView';
import Community from './features/community/Community';
import RouteTracker from './components/RouteTracker';

function App() {
    const [currentLang, setCurrentLang] = useState('ko');
    const [rateLimit, setRateLimit] = useState({ count: 0, resetTime: 0 });
    const [recipes, setRecipes] = useState([]); // 레시피 상태 추가

    // 1. 실시간 Rate Limit 리스너
    useEffect(() => {
        if (!db || !userId) return;
        const limitRef = doc(db, `rateLimit_${appId}`, userId);
        const unsubscribe = onSnapshot(limitRef, (doc) => {
            if (doc.exists()) setRateLimit(doc.data());
        });
        return () => unsubscribe();
    }, []);

    // 2. 실시간 레시피 리스너 추가 (HomeView에 뿌려줄 데이터)
    useEffect(() => {
        if (!db) return;
        // 최근 생성된 6개의 레시피만 가져오기
        const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"), limit(6));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const recipeData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecipes(recipeData);
        });
        return () => unsubscribe();
    }, []);

    return (
        <Router>
            <RouteTracker />
            <Header currentLang={currentLang} setCurrentLang={setCurrentLang} /> 

            <main className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
                <Routes>
                    {/* HomeView에 recipes 데이터를 넘겨줍니다 */}
                    <Route path="/" element={<HomeView currentLang={currentLang} recipes={recipes} />} />
                    
                    <Route path="/price" element={<PriceComparison currentLang={currentLang} />} />
                    <Route path="/recipe" element={
                        <RecipeView 
                            currentLang={currentLang} 
                            rateLimit={rateLimit}
                            setRateLimit={setRateLimit}
                            userId={userId}
                            appId={appId}
                        />
                    } />
                    <Route path="/community" element={<Community currentLang={currentLang} />} />
                </Routes>
            </main>
            <Footer currentLang={currentLang} />
        </Router>
    );
}

export default App;