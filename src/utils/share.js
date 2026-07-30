// 1. 뷰티 판별 로직
const checkIsBeauty = (data, cleanName) => {
    if (data && data.category === 'beauty') return true;
    const name = (cleanName || "").toLowerCase();
    const beautyKeywords = ['medicube', 'age-r', 'pdrn', 'cream', 'serum', 'skin', 'toner', 'beauty', 'ampoule', 'sunscreen', '크림', '세럼', '화장품'];
    return beautyKeywords.some(key => name.includes(key));
};

// 2. 안전한 인코딩 및 문자열 세척
const safeCleanAndEncode = (str) => {
    if (!str) return "";
    let cleaned = str.replace(/^[^a-zA-Z0-9가-힣]+/, '').trim();
    cleaned = cleaned.replace(/[💄🛒🍳🍱🏪]|(\(.*\))/g, '').trim();
    
    try {
        return { 
            encoded: encodeURIComponent(cleaned), 
            plain: cleaned 
        };
    } catch (e) {
        const forceClean = cleaned.replace(/[^\x00-\x7F가-힣]/g, "");
        return { 
            encoded: encodeURIComponent(forceClean), 
            plain: forceClean 
        };
    }
};

// 3. 타입 판별 보조 함수 (레시피 vs 상품)
const checkIsRecipe = (data) => {
    if (!data) return false;
    return !!(data.recipeId || data.ingredients || data.instructions || data.type === 'recipe');
};

// --- WhatsApp 공유 ---
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    const rawName = data[`title_${currentLang}`] || data.title || data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const { encoded: encodedName, plain: cleanName } = safeCleanAndEncode(rawName);
    
    const isRecipe = checkIsRecipe(data);
    const isBeauty = !isRecipe && checkIsBeauty(data, cleanName);
    const finalTab = isBeauty ? 'beauty' : 'food';
    const baseUrl = window.location.origin;

    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id || data.recipeId}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodedName}&lang=${currentLang}&tab=${finalTab}`;

    const marketName = data.market || data.supermarket || data.store || ""; // 마트 이름 (예: Rewe, Edeka)
    const price = data.price || "0.00";
    let msgText = "";

    if (isRecipe) {
        // 🍳 1. 레시피 공유
        msgText = currentLang === 'ko'
            ? `🍳 [독일 마트 재료 레시피] ${cleanName} 만드는 법을 확인해 보세요! 👇\n\n${shareUrl}`
            : `🍳 Check out how to make ${cleanName} with German grocery ingredients! 👇\n\n${shareUrl}`;
    } else if (marketName) {
        // 🏪 2. 특정 마트 최저가 상품 공유 (Rewe, Edeka 등 마트 정보가 있을 때)
        const icon = isBeauty ? "💄" : "🛒";
        msgText = currentLang === 'ko'
            ? `${icon} 🔥 [${marketName}] ${cleanName} 최저가 ${price}€ 떴어요! 지금 확인해 보세요 👇\n\n${shareUrl}`
            : `${icon} 🔥 Lowest price for ${cleanName} at [${marketName}] for ${price}€! Check it out 👇\n\n${shareUrl}`;
    } else {
        // 🛒 3. 일반 최저가 상품 공유
        const icon = isBeauty ? "💄" : "🛒";
        msgText = currentLang === 'ko'
            ? `${icon} 🔥 ${cleanName} 최저가 떴어요! 지금 ${price}€에 득템하고 절약하세요! 👇\n\n${shareUrl}`
            : `${icon} 🔥 Lowest price for ${cleanName}! Get it for ${price}€ and save big now! 👇\n\n${shareUrl}`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};

// --- Kakao 공유 ---
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    if (!data || !window.Kakao) return;

    const rawName = data[`title_${currentLang}`] || data.title || data[`name_${currentLang}`] || data.name || data.item || "K-Product";
    const { encoded: encodedName, plain: cleanName } = safeCleanAndEncode(rawName);

    const isRecipe = checkIsRecipe(data);
    const isBeauty = !isRecipe && checkIsBeauty(data, cleanName);
    const finalTab = isBeauty ? 'beauty' : 'food';
    const baseUrl = window.location.origin;

    const shareUrl = isRecipe 
        ? `${baseUrl}/recipe?recipeId=${data.id || data.recipeId}&lang=${currentLang}`
        : `${baseUrl}/price?search=${encodedName}&lang=${currentLang}&tab=${finalTab}`;

    const marketName = data.market || data.supermarket || data.store || "";
    const price = data.price || "0.00";

    let titleText = "";
    let descriptionText = "";
    let buttonText = "";

    if (isRecipe) {
        // 🍳 1. 레시피 카카오 설정
        titleText = `🍳 ${cleanName}`;
        descriptionText = currentLang === 'ko'
            ? `독일 마트 재료로 만드는 한식 레시피! 지금 확인해 보세요 👩‍🍳`
            : `Make Korean food with German grocery ingredients! Check it out now 👩‍🍳`;
        buttonText = currentLang === 'ko' ? '레시피 보기' : 'View Recipe';
    } else if (marketName) {
        // 🏪 2. 특정 마트 최저가 상품 카카오 설정
        titleText = `${isBeauty ? '💄' : '🏪'} [${marketName}] ${cleanName}`;
        descriptionText = currentLang === 'ko'
            ? `🔥 ${marketName}에서 ${cleanName} 최저가 ${price}€ 떴어요! 👇`
            : `🔥 Lowest price at ${marketName} for ${cleanName} (${price}€)! 👇`;
        buttonText = currentLang === 'ko' ? '최저가 확인' : 'Check Price';
    } else {
        // 🛒 3. 일반 최저가 상품 카카오 설정
        titleText = `${isBeauty ? '💄' : '🛒'} ${cleanName}`;
        descriptionText = currentLang === 'ko' 
            ? `🔥 ${cleanName} 최저가 떴어요! 지금 ${price}€에 득템하고 절약하세요! 👇` 
            : `🔥 Lowest price for ${cleanName}! Get it for ${price}€ and save big now! 👇`;
        buttonText = currentLang === 'ko' ? '가격 확인하기' : 'Check Price';
    }

    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: titleText,
            description: descriptionText,
            imageUrl: data.image || data.imageUrl || 'https://k-food-with-german-groceries.web.app/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ 
            title: buttonText, 
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl } 
        }],
    });
};