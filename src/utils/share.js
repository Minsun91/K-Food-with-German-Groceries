// 카테고리 판별 로직
const checkIsBeauty = (data) => data && data.category === 'beauty';

// 1. WhatsApp 공유 함수
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    // 이름 정리 및 판별
    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const cleanName = rawName.replace(/[💄🛒]|(\(.*\))/g, '').trim();
    const isBeauty = checkIsBeauty(data);
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;

    // URL 및 탭 설정
    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

    // 메시지 구성
    const price = data.price || "0.00";
    const icon = isBeauty ? "💄" : "🛒";
    
    // 절약 금액 계산 (있는 경우에만 추가)
    let savingsText = "";
    if (data.maxPrice && parseFloat(data.maxPrice) > parseFloat(price)) {
        const diff = (parseFloat(data.maxPrice) - parseFloat(price)).toFixed(2);
        savingsText = currentLang === 'ko' ? `\n🔥 최고가 대비 *${diff}€* 절약!` : `\n🔥 Save *${diff}€*!`;
    }

    const msgText = currentLang === 'ko'
        ? `${icon} *${cleanName}*\n최저가 정보: ${price}€${savingsText}\n지금 확인하고 절약하세요! 👇\n\n${shareUrl}`
        : `${icon} *${cleanName}*\nLowest Price: ${price}€${savingsText}\nCheck it out and save! 👇\n\n${shareUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};

// 2. Kakao 공유 함수
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    const rawName = data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const cleanName = rawName.replace(/[💄🛒]|(\(.*\))/g, '').trim();
    const isBeauty = checkIsBeauty(data);

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