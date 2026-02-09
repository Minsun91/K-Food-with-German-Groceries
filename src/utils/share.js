// WhatsApp 공유 함수
// WhatsApp 공유 함수
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    // 1. 데이터 추출
    const rawItem = data.item || "";
    const rawKeyword = data.searchKeyword || "";
    const rawName = data[`name_${currentLang}`] || data.name || "";
    
    // 표시할 이름 결정 (앞서 붙인 이모지가 포함되어 있을 수 있음)
    const displayName = (rawItem || rawName || rawKeyword || "K-Product").trim();
    
    // 2. 뷰티 판별 로직
    const searchTarget = (rawItem + rawKeyword + rawName).toLowerCase();
    const beautyTerms = ["serum", "sunscreen", "shot", "mist", "cream", "d'alba", "dalba", "joseon", "glow", "beauty", "세럼", "미스트", "달바", "선크림"];
    const isFoodBrand = searchTarget.includes("신라면") || searchTarget.includes("불닭") || searchTarget.includes("김치");
    const isBeauty = (beautyTerms.some(term => searchTarget.includes(term)) || data.mart === "K-Beauty") && !isFoodBrand;

    // 3. 레시피 여부
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;

    // 4. URL 구성 (검색어에서는 이모지 제거)
    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const cleanSearch = displayName.replace(/[💄🛒🍜🔥🥬✨]/g, '').trim();
    
    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodeURIComponent(cleanSearch)}&lang=${currentLang}&tab=${finalTab}`;

    console.log("🛠️ [WhatsApp] 최종 판별:", { displayName, isBeauty, tab: finalTab });

    // 5. 메시지 구성 (이모지 중복 방지 로직 추가)
    let msgText = "";
    if (isRecipe) {
        msgText = `*${displayName}*\n이 레시피 한번 해보세요! 👩‍🍳\n\n👉 ${shareUrl}`;
    } else {
        const price = data.price || "0.00";
        const savings = (data.savings && data.savings !== "0.00") ? ` (${data.savings}€ 절약!)` : "";
        
        // 🌟 [핵심 수정] 타이틀에 이미 이모지가 포함되어 있는지 확인하여 중복 방지
        const hasIcon = displayName.includes('💄') || displayName.includes('🛒');
        const icon = isBeauty ? "💄" : "🛒";
        const finalTitle = hasIcon ? `*${displayName}*` : `${icon} *${displayName}*`;

        msgText = `${finalTitle}\n최저가 정보: ${price}€${savings}\n지금 확인하고 절약하세요! 👇\n\n${shareUrl}`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};

// Kakao 공유 함수
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    // 1. 변수 선언 (ReferenceError 방지)
    const rawItem = data.item || "";
    const rawKeyword = data.searchKeyword || "";
    const rawName = data[`name_${currentLang}`] || data.name || "";
    const displayName = (rawItem || rawName || rawKeyword || "K-Product").trim();

    // 2. 뷰티 판별
    const searchTarget = (rawItem + rawKeyword + rawName).toLowerCase();
    const beautyTerms = ["serum", "sunscreen", "shot", "mist", "cream", "d'alba", "dalba", "joseon", "glow", "beauty", "세럼", "미스트", "달바", "선크림"];
    const isFoodBrand = searchTarget.includes("신라면") || searchTarget.includes("불닭") || searchTarget.includes("김치");
    const isBeauty = (beautyTerms.some(term => searchTarget.includes(term)) || data.mart === "K-Beauty") && !isFoodBrand;

    // 3. URL 구성
    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const cleanSearch = displayName.replace(/[💄🛒]/g, '').trim();
    const shareUrl = `${baseUrl}/price?search=${encodeURIComponent(cleanSearch)}&lang=${currentLang}&tab=${finalTab}`;

    console.log("🛠️ [Kakao] 최종 판별:", { displayName, isBeauty, tab: finalTab, url: shareUrl });

    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            // [수정] displayName 앞에 이미 이모지가 있다면 추가로 붙이지 않음
            title: displayName.includes('💄') || displayName.includes('🛒') 
                   ? displayName 
                   : `${isBeauty ? '💄' : '🛒'} ${displayName}`,
            description: `${displayName.replace(/[💄🛒]/g, '').trim()} 최저가를 확인해보세요!`,
            imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{
            title: '가격 확인하기',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
        }],
    });
};