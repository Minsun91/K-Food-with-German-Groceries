// 1. 뷰티 판별 로직
const checkIsBeauty = (data, cleanName) => {
    if (data && data.category === 'beauty') return true;
    const name = (cleanName || "").toLowerCase();
    const beautyKeywords = ['medicube', 'age-r', 'pdrn', 'cream', 'serum', 'skin', 'toner', 'beauty', 'ampoule', 'sunscreen', '크림', '세럼', '화장품'];
    return beautyKeywords.some(key => name.includes(key));
};

// 2. 안전한 인코딩 및 문자열 세척 (맨 앞의 '?' 및 유령문자 제거)
const safeCleanAndEncode = (str) => {
    if (!str) return "";
    // 1단계: 문자열 맨 앞의 특수기호(? 등)와 공백 제거, 보이지 않는 문자 제거
    let cleaned = str.replace(/^[^a-zA-Z0-9가-힣]+/, '').trim();
    // 2단계: 이모지 및 특수문자 한 번 더 정리
    cleaned = cleaned.replace(/[💄🛒]|(\(.*\))/g, '').trim();
    
    try {
        return { 
            encoded: encodeURIComponent(cleaned), 
            plain: cleaned 
        };
    } catch (e) {
        // 인코딩 에러 시 강제 세척
        const forceClean = cleaned.replace(/[^\x00-\x7F가-힣]/g, "");
        return { 
            encoded: encodeURIComponent(forceClean), 
            plain: forceClean 
        };
    }
};

// --- WhatsApp 공유 ---
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const { encoded: encodedName, plain: cleanName } = safeCleanAndEncode(rawName);
    
    const isBeauty = checkIsBeauty(data, cleanName);
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const baseUrl = window.location.origin;

    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodedName}&lang=${currentLang}&tab=${finalTab}`;

    const price = data.price || "0.00";
    const icon = isBeauty ? "💄" : "🛒";
    
    const msgText = currentLang === 'ko'
        ? `${icon} 🔥 ${cleanName} 최저가 떴어요! 지금 ${price}€에 득템하고 절약하세요! 👇\n\n${shareUrl}`
        : `${icon} 🔥 Lowest price for ${cleanName}! Get it for ${price}€ and save big now! 👇\n\n${shareUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};

// --- Kakao 공유 ---
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const { encoded: encodedName, plain: cleanName } = safeCleanAndEncode(rawName);

    const isBeauty = checkIsBeauty(data, cleanName);
    const finalTab = isBeauty ? 'beauty' : 'food';
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/price?search=${encodedName}&lang=${currentLang}&tab=${finalTab}`;

    const price = data.price || "0.00";
    const descriptionText = currentLang === 'ko' 
        ? `🔥 ${cleanName} 최저가 떴어요! 지금 ${price}€에 득템하고 절약하세요! 👇` 
        : `🔥 Lowest price for ${cleanName}! Get it for ${price}€ and save big now! 👇`;

    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `${isBeauty ? '💄' : '🛒'} ${cleanName}`,
            description: descriptionText,
            imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ 
            title: currentLang === 'ko' ? '가격 확인하기' : 'Check Price', 
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl } 
        }],
    });
};