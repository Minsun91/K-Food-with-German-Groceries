// 1. 뷰티 판별 로직 (더 정확하게 개선)
const checkIsBeauty = (data, cleanName) => {
    if (data && (data.category === 'beauty' || data.type === 'beauty')) return true;
    const name = (cleanName || "").toLowerCase();
    const beautyKeywords = [
        'medicube', 'age-r', 'pdrn', 'cream', 'serum', 'skin', 'toner', 
        'beauty', 'ampoule', 'sunscreen', '크림', '세럼', '화장품', '마스크팩', '선크림'
    ];
    return beautyKeywords.some(key => name.includes(key));
};

// 2. 안전한 인코딩 및 문자열 세척
const safeCleanAndEncode = (str) => {
    if (!str) return { encoded: "", plain: "K-Product" };
    
    // 이모지 및 특수 이모티콘 제거
    let cleaned = str.replace(/[💄🛒🍳🍱🏪]|(\(.*\))/g, '').trim();
    cleaned = cleaned.replace(/^[^a-zA-Z0-9가-힣]+/, '').trim();
    
    if (!cleaned) cleaned = "K-Product";

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

// 3. 타입 판별 보조 함수 (★ 엄격하게 수정!)
const checkIsRecipe = (data) => {
    if (!data) return false;
    // 단순히 필드가 존재하는 게 아니라, 실제 배열/문자열 데이터가 제대로 들어있는지 확인
    const hasIngredients = Array.isArray(data.ingredients) && data.ingredients.length > 0;
    const hasInstructions = Array.isArray(data.instructions) && data.instructions.length > 0;
    
    return !!(data.type === 'recipe' || data.recipeId || (hasIngredients && hasInstructions));
};

// 4. 가격 포맷팅 보조 함수 (0원이나 빈값 방지)
const formatPrice = (price) => {
    if (!price || price === "0" || price === "0.00" || price === 0) return null;
    return `${price}€`;
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

    const marketName = data.market || data.supermarket || data.store || ""; 
    const priceText = formatPrice(data.price);
    let msgText = "";

    if (isRecipe) {
        // 🍳 1. 레시피 공유
        msgText = currentLang === 'ko'
            ? `🍳 [독일 마트 재료 레시피] ${cleanName} 만드는 법을 확인해 보세요! 👇\n\n${shareUrl}`
            : `🍳 Check out how to make ${cleanName} with German grocery ingredients! 👇\n\n${shareUrl}`;
    } else if (marketName) {
        // 🏪 2. 특정 마트 최저가 상품 공유
        const icon = isBeauty ? "💄" : "🛒";
        const priceInfo = priceText ? `최저가 ${priceText}` : "최저가 정보";
        const priceInfoEn = priceText ? `for ${priceText}` : "best price";
        
        msgText = currentLang === 'ko'
            ? `${icon} 🔥 [${marketName}] ${cleanName} ${priceInfo} 떴어요! 지금 확인해 보세요 👇\n\n${shareUrl}`
            : `${icon} 🔥 Lowest price for ${cleanName} at [${marketName}] ${priceInfoEn}! Check it out 👇\n\n${shareUrl}`;
    } else {
        // 🛒 3. 일반 최저가 상품 공유
        const icon = isBeauty ? "💄" : "🛒";
        const priceNotice = priceText ? `지금 ${priceText}에 득템하고 절약하세요!` : "지금 최저가를 확인해 보세요!";
        const priceNoticeEn = priceText ? `Get it for ${priceText} and save big now!` : "Check out the best price now!";
        
        msgText = currentLang === 'ko'
            ? `${icon} 🔥 ${cleanName} 최저가 떴어요! ${priceNotice} 👇\n\n${shareUrl}`
            : `${icon} 🔥 Lowest price for ${cleanName}! ${priceNoticeEn} 👇\n\n${shareUrl}`;
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
    const priceText = formatPrice(data.price);

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
        const priceDesc = priceText ? `최저가 ${priceText} 떴어요!` : `최저가 정보 확인하세요!`;
        const priceDescEn = priceText ? `(${priceText})` : ``;
        
        descriptionText = currentLang === 'ko'
            ? `🔥 ${marketName}에서 ${cleanName} ${priceDesc} 👇`
            : `🔥 Lowest price at ${marketName} for ${cleanName} ${priceDescEn}! 👇`;
        buttonText = currentLang === 'ko' ? '최저가 확인' : 'Check Price';
    } else {
        // 🛒 3. 일반 최저가 상품 카카오 설정
        titleText = `${isBeauty ? '💄' : '🛒'} ${cleanName}`;
        const priceDesc = priceText ? `지금 ${priceText}에 득템하고 절약하세요!` : `지금 실시간 최저가를 확인해 보세요!`;
        const priceDescEn = priceText ? `Get it for ${priceText} and save big now!` : `Check out real-time best prices!`;

        descriptionText = currentLang === 'ko' 
            ? `🔥 ${cleanName} 최저가 떴어요! ${priceDesc} 👇` 
            : `🔥 Lowest price for ${cleanName}! ${priceDescEn} 👇`;
        buttonText = currentLang === 'ko' ? '가격 확인하기' : 'Check Price';
    }

    if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: titleText,
            description: descriptionText,
            imageUrl: data.image || data.imageUrl || `${baseUrl}/og-image.png`,
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ 
            title: buttonText, 
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl } 
        }],
    });
};