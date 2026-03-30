// WhatsApp 공유 함수
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

// 1. 데이터 추출 및 이름 정리
const rawItem = data.item || "";
const rawKeyword = data.searchKeyword || "";
const rawName = data[`name_${currentLang}`] || data.name || "";
const displayName = (rawItem || rawName || rawKeyword || "K-Product").trim();
const cleanName = displayName.replace(/[💄🛒]|(\(.*\))/g, '').trim();

// 2. 카테고리 판별 로직 (data.category 활용)
// 데이터에 category가 있으면 그것을 따르고, 없으면 기존 mart 필드나 키워드를 보조적으로 확인
const isBeauty = data.category === 'beauty' || data.mart === 'K-Beauty';
const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;

// 3. URL 구성
const baseUrl = window.location.origin;
const finalTab = isBeauty ? 'beauty' : 'food';
const shareUrl = isRecipe 
    ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
    : `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

// 4. 메시지 구성
let msgText = "";
if (isRecipe) {
    msgText = `*${cleanName}*\n이 레시피 한번 해보세요! 👩‍🍳\n\n👉 ${shareUrl}`;
} else {
    const price = data.price || "0.00";
    let savingsText = "";
    
    if (data.maxPrice && parseFloat(data.maxPrice) > parseFloat(price)) {
        const diff = (parseFloat(data.maxPrice) - parseFloat(price)).toFixed(2);
        savingsText = `\n🔥 최고가 대비 *${diff}€* 절약 가능!`;
    }
    
    const icon = isBeauty ? "💄" : "🛒";
    msgText = `${icon} *${cleanName}*\n최저가 정보: ${price}€${savingsText}\n지금 확인하고 절약하세요! 👇\n\n${shareUrl}`;
}

window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};

// Kakao 공유 함수
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    const rawItem = data.item || "";
    const rawKeyword = data.searchKeyword || "";
    const rawName = data[`name_${currentLang}`] || data.name || "";
    const displayName = (rawItem || rawName || rawKeyword || "K-Product").trim();
    const cleanName = displayName.replace(/[💄🛒]|(\(.*\))/g, '').trim();

    // 카테고리 판별 로직 업데이트
    const isBeauty = data.category === 'beauty' || data.mart === 'K-Beauty';

    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const shareUrl = `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

    let descriptionText = `${cleanName} 최저가를 확인해보세요!`;
    const price = parseFloat(data.price || 0);
    const maxPrice = parseFloat(data.maxPrice || 0);

    if (maxPrice > price) {
        const diff = (maxPrice - price).toFixed(2);
        descriptionText = `🔥 최고가 대비 ${diff}€ 절약 가능! 지금 확인하세요.`;
    }

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
            title: '가격 확인하기',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
        }],
    });
};