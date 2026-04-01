// 1. 더 강력해진 판별 로직 (이름까지 싹 다 뒤짐)
const checkIsBeauty = (data, cleanName) => {
    // 1순위: DB 카테고리 필드 확인
    if (data && data.category === 'beauty') return true;
    
    // 2순위: 이름이나 아이템명에 'medicube'나 'beauty' 관련 단어가 있는지 확인
    const searchTarget = (cleanName + (data.item || "") + (data.searchKeyword || "")).toLowerCase();
    const beautyKeywords = ['medicube', 'age-r', 'beauty', 'makeup', 'skin', 'booster', '메디큐브', 'VT', 'sunscreen', '선크림'];
    
    return beautyKeywords.some(key => searchTarget.includes(key));
};

// 2. WhatsApp 공유 함수 (수정본)
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const cleanName = rawName.replace(/[💄🛒]|(\(.*\))/g, '').trim();

    // 🔥 여기서 cleanName까지 같이 넘겨서 2중으로 체크하게 합니다!
    const isBeauty = checkIsBeauty(data, cleanName); 
    
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;
    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';

    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

    const price = data.price || "0.00";
    const icon = isBeauty ? "💄" : "🛒";
    
    const msgText = currentLang === 'ko'
        ? `${icon} *${cleanName}*\n최저가 정보: ${price}€\n지금 확인하고 절약하세요! 👇\n\n${shareUrl}`
        : `${icon} *${cleanName}*\nLowest Price: ${price}€\nCheck it out and save! 👇\n\n${shareUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};

// 3. Kakao 공유 함수 (수정본)
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const cleanName = rawName.replace(/[💄🛒]|(\(.*\))/g, '').trim();
    
    // 🔥 여기도 2중 체크 적용!
    const isBeauty = checkIsBeauty(data, cleanName);

    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const shareUrl = `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

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