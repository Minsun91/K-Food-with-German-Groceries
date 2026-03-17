// WhatsApp 공유 함수
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    // 1. 데이터 추출
    const rawItem = data.item || "";
    const rawKeyword = data.searchKeyword || "";
    const rawName = data[`name_${currentLang}`] || data.name || "";
    const displayName = (rawItem || rawName || rawKeyword || "K-Product").trim();

    // 🌟 핵심: (낱개), (번들) 및 이모지가 제거된 깨끗한 이름 (URL 및 표시용)
    const cleanName = displayName.replace(/[💄🛒]|(\(.*\))/g, '').trim();

    // 2. 뷰티 판별 로직
    const searchTarget = (rawItem + rawKeyword + rawName).toLowerCase();
    const beautyTerms = ["serum", "sunscreen", "shot", "mist", "cream", "d'alba", "dalba", "joseon", "glow", "beauty", "세럼", "미스트", "달바", "선크림"];
    const isFoodBrand = searchTarget.includes("신라면") || searchTarget.includes("불닭") || searchTarget.includes("김치");
    const isBeauty = (beautyTerms.some(term => searchTarget.includes(term)) || data.mart === "K-Beauty") && !isFoodBrand;

    // 3. 레시피 여부
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;

    // 4. URL 구성
    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

    // 5. 메시지 구성
    let msgText = "";
    if (isRecipe) {
        msgText = `*${cleanName}*\n이 레시피 한번 해보세요! 👩‍🍳\n\n👉 ${shareUrl}`;
    } else {
        const price = data.price || "0.00";
        let savingsText = "";
        
        // 절약 금액 계산 로직
        if (data.maxPrice && parseFloat(data.maxPrice) > parseFloat(price)) {
            const diff = (parseFloat(data.maxPrice) - parseFloat(price)).toFixed(2);
            savingsText = `\n🔥 최고가 대비 *${diff}€* 절약 가능!`;
        } else if (data.savings && data.savings !== "0.00") {
            savingsText = ` (${data.savings}€ 절약!)`;
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

    // 🌟 핵심: (낱개), (번들) 및 이모지 제거
    const cleanName = displayName.replace(/[💄🛒]|(\(.*\))/g, '').trim();

    const searchTarget = (rawItem + rawKeyword + rawName).toLowerCase();
    const beautyTerms = ["serum", "sunscreen", "shot", "mist", "cream", "d'alba", "dalba", "joseon", "glow", "beauty", "세럼", "미스트", "달바", "선크림"];
    const isFoodBrand = searchTarget.includes("신라면") || searchTarget.includes("불닭") || searchTarget.includes("김치");
    const isBeauty = (beautyTerms.some(term => searchTarget.includes(term)) || data.mart === "K-Beauty") && !isFoodBrand;

    const baseUrl = window.location.origin;
    const finalTab = isBeauty ? 'beauty' : 'food';
    const shareUrl = `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${finalTab}`;

    // 절약 문구 생성
    let descriptionText = `${cleanName} 최저가를 확인해보세요!`;
    const price = parseFloat(data.price || 0);
    const maxPrice = parseFloat(data.maxPrice || 0);

    if (maxPrice > price) {
        const diff = (maxPrice - price).toFixed(2);
        descriptionText = `🔥 최고가 대비 ${diff}€ 절약 가능! 지금 확인하세요.`;
    } else if (data.savings && data.savings !== "0.00") {
        descriptionText = `🔥 지금 확인하면 ${data.savings}€ 절약 가능! 최저가 정보를 확인하세요.`;
    }

    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            // 🌟 Title에서도 괄호를 제거한 cleanName 사용
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