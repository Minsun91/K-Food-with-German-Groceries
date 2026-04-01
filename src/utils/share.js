// 1. 뷰티 판별 로직 (카테고리 우선 + 키워드 보조)
const checkIsBeauty = (data, cleanName) => {
    if (data && data.category === 'beauty') return true;
    const name = (cleanName || "").toLowerCase();
    const beautyKeywords = ['medicube', 'age-r', 'pdrn', 'cream', 'serum', 'skin', 'toner', 'beauty', 'ampoule', 'sunscreen', '크림', '세럼', '화장품'];
    return beautyKeywords.some(key => name.includes(key));
};

// 2. 안전한 인코딩 (URIError 방지)
const safeEncode = (str) => {
    try {
        return encodeURIComponent(str);
    } catch (e) {
        // 인코딩 실패 시 깨진 문자/이모지 제거 후 재시도
        return encodeURIComponent(str.replace(/[^\x00-\x7F]/g, ""));
    }
};

// --- WhatsApp 공유 함수 ---
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const cleanName = rawName.replace(/[💄🛒]|(\(.*\))/g, '').trim();
    const isBeauty = checkIsBeauty(data, cleanName);
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;
    
    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const encodedName = safeEncode(cleanName);
    
    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodedName}&lang=${currentLang}&tab=${finalTab}`;

    const price = data.price || "0.00";
    const icon = isBeauty ? "💄" : "🛒";
    
    // 요청하신 동일한 메시지 포맷 적용
    const msgText = currentLang === 'ko'
        ? `${icon} 🔥 ${cleanName} 최저가 떴어요! 지금 ${price}€에 득템하고 절약하세요! 👇\n\n${shareUrl}`
        : `${icon} 🔥 Lowest price for ${cleanName}! Get it for ${price}€ and save big now! 👇\n\n${shareUrl}`;

    window.open(`https://wa.me/?text=${safeEncode(msgText)}`, '_blank');
};

// --- Kakao 공유 함수 ---
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const cleanName = rawName.replace(/[💄🛒]|(\(.*\))/g, '').trim();
    const isBeauty = checkIsBeauty(data, cleanName);

    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const encodedName = safeEncode(cleanName);
    const shareUrl = `${baseUrl}/price?search=${encodedName}&lang=${currentLang}&tab=${finalTab}`;

    const price = data.price || "0.00";
    
    // 요청하신 동일한 메시지 포맷 적용
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