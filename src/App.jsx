import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { db, appId, userId } from './utils/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Components & Views
import Header from './components/Header';
import Footer from './components/Footer';
import HomeView from './features/home/HomeView'; // 메인 홈 뷰 (가칭)
import PriceComparison from './features/price/PriceComparison';
import RecipeView from './features/recipe/RecipeView';
import Community from './features/community/Community';
import RouteTracker from './components/RouteTracker'; // GA 추적 컴포넌트

// Constants
import { langConfig } from './constants/langConfig';

function App() {
    // 1. 공통 상태 관리 (언어, 한도)
    const [currentLang, setCurrentLang] = useState('ko');
    const [rateLimit, setRateLimit] = useState({ count: 0, resetTime: 0 });

    // 2. 실시간 Rate Limit 리스너 (Firebase와 동기화)
    useEffect(() => {
        if (!db || !userId) return;
        const limitRef = doc(db, `rateLimit_${appId}`, userId);
        const unsubscribe = onSnapshot(limitRef, (doc) => {
            if (doc.exists()) {
                setRateLimit(doc.data());
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <Router>
            <RouteTracker /> {/* 주소 변경 시 GA4 보고 */}
            
            {/* Header에 언어 설정 함수를 넘겨주면 언어 변경이 가능해집니다 */}
            <Header currentLang={currentLang} setCurrentLang={setCurrentLang} /> 

            <main className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
                <Routes>
                    {/* 메인 홈 */}
                    <Route path="/" element={<HomeView 
  currentLang={currentLang} 
  setCurrentLang={setCurrentLang}  // 👈 이게 반드시 있어야 합니다!
/>} />
                    
                    
                    {/* 가격 비교 */}
                    <Route path="/price" element={<PriceComparison currentLang={currentLang} />} />
                    
                    {/* 레시피 생성 및 목록 (핵심!) */}
                    <Route path="/recipe" element={
                        <RecipeView 
                            currentLang={currentLang} 
                            langConfig={langConfig}
                            rateLimit={rateLimit}
                            setRateLimit={setRateLimit}
                            userId={userId}
                            appId={appId}
                        />
                    } />
                    
                    {/* 커뮤니티 */}
                    <Route path="/community" element={<Community currentLang={currentLang} />} />
                </Routes>
            </main>

            <Footer currentLang={currentLang} />
        </Router>
    );
}

export default App;