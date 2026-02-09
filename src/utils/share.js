//   // WhatsApp 공유 함수
//   export const shareToWhatsApp = (recipe, currentLang = 'ko') => {
//     // 1. 레시피 ID가 없는 경우 (저장되지 않은 경우)
//     if (!recipe?.id) {
//         const msg = currentLang === 'de' 
//             ? "Bitte speichere das Rezept zuerst!" 
//             : (currentLang === 'ko' ? "레시피를 먼저 저장해주세요!" : "Please save the recipe first!");
//         alert(msg);
//         return;
//     }

//     // 2. 공유 정보 구성
//     const recipeName = recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name;
//     const shareUrl = `${window.location.origin}/recipe?recipeId=${recipe.id}&lang=${currentLang}`;
    
//     // 3. 메시지 텍스트 (undefined 방지 및 깔끔한 포맷)
//     const inviteText = currentLang === 'de' 
//         ? "Probier dieses Rezept aus!" 
//         : (currentLang === 'ko' ? "이 레시피 한번 해보세요!" : "Check out this recipe!");

//     const text = `*${recipeName}*\n${inviteText}\n\n👉 ${shareUrl}`;

//     // 4. WhatsApp 호출
//     window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
// };

// export const shareToKakao = (recipe, currentLang) => {
//       const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
  
//       if (!recipe || !recipe.id) {
//           const alertMsg = {
//               ko: "먼저 '레시피 저장' 버튼을 눌러주세요!",
//               en: "Please save the recipe first!",
//               de: "Bitte speichere zuerst das Rezept!"
//           };
//           alert(alertMsg[currentLang] || alertMsg['ko']);
//           return;
//       }
  
//       if (window.Kakao) {
//           if (!window.Kakao.isInitialized()) {
//               window.Kakao.init(kakaoKey);
//           }
  
//           const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=${currentLang}`;
  
//           const contentConfig = {
//               ko: {
//                   title: recipe.name_ko || recipe.name,
//                   description: '독일 마트 재료로 만든 한식 레시피!',
//                   button: '레시피 보기'
//               },
//               en: {
//                   title: recipe.name_en || recipe.name,
//                   description: 'Korean recipes with German ingredients!',
//                   button: 'View Recipe'
//               },
//               de: {
//                   title: recipe.name_de || recipe.name,
//                   description: 'Koreanische Rezepte mit deutschen Zutaten!',
//                   button: 'Rezept ansehen'
//               }
//           };
  
//           const config = contentConfig[currentLang] || contentConfig['ko'];
  
//           window.Kakao.Share.sendDefault({
//               objectType: 'feed',
//               content: {
//                   title: config.title,
//                   description: config.description,
//                   imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
//                   link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
//               },
//               buttons: [
//                   {
//                       title: config.button,
//                       link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
//                   }
//               ],
//           });
//       }
//   };


  // WhatsApp 공유 함수
// WhatsApp 공유 함수
export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    // 1. 모든 언어 필드 체크 (이름 누락 방지)
    const name = data[`name_${currentLang}`] || data.name_ko || data.name_en || data.name_de || data.name || "K-Food";
    
    // 2. 레시피 판별 로직
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;

    // 3. 변수 먼저 선언 (에러 방지 핵심!)
    const cleanName = name.replace(/[💄🛒🍜🔥🥬✨]/g, '').trim();
    const shareUrl = isRecipe 
    ? `${baseUrl}/recipe?recipeId=${data.id}&lang=${currentLang}`
    : `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${isBeauty ? 'beauty' : 'food'}`;
    let msgText = "";

    if (isRecipe) {
        // ✅ 레시피 모드
        const inviteText = 
            currentLang === 'de' ? "Probier dieses Rezept aus!" : 
            currentLang === 'en' ? "Check out this recipe!" : 
            "이 레시피 한번 해보세요!";
        msgText = `*${name}*\n${inviteText}\n\n👉 ${shareUrl}`;
    } else {
        // ✅ 가격 비교 모드
        const price = data.price || "0.00";
        const savings = (data.savings && data.savings !== "0.00") ? ` (${data.savings}€ 절약!)` : "";
        const priceMsg = 
            currentLang === 'de' ? `Bester Preis: ${price}€${savings}` : 
            currentLang === 'en' ? `Best Price: ${price}€${savings}` :
            `최저가 정보: ${price}€${savings}`;
        
        const actionMsg = 
            currentLang === 'de' ? "Jetzt sparen!" : 
            currentLang === 'en' ? "Save now!" : 
            "지금 확인하고 절약하세요!";

        msgText = `🛒 *${name}*\n${priceMsg}\n${actionMsg} 👇\n${shareUrl}`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(msgText)}`, '_blank');
};


// Kakao 공유 함수
export const shareToKakao = (data, currentLang = 'ko') => {
    const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
    
    if (!data || !window.Kakao) {
        console.error("Kakao SDK 미로드 또는 데이터 없음");
        return;
    }

    if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
    }

    // 1. 이름에서 이모지 제거 (검색 정확도를 위해)
    const rawName = data[`name_${currentLang}`] || data.name || data.item || "";
    const cleanName = rawName.replace(/[💄🛒]/g, '').trim(); 

    // 2. 뷰티 판별 (매우 중요!)
    // 데이터 객체 자체에 isBeauty가 있거나, 이름에 뷰티 키워드가 있는지 확인
    const beautyKeywords = ["serum", "sunscreen", "mist", "beauty", "세럼", "미스트"];
    const isBeauty = data.isBeauty === true || 
                     beautyKeywords.some(k => cleanName.toLowerCase().includes(k));

    // 3. URL 생성 (tab 파라미터 강제 지정)
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/price?search=${encodeURIComponent(cleanName)}&lang=${currentLang}&tab=${isBeauty ? 'beauty' : 'food'}`;

    console.log("최종 발송 URL:", shareUrl); // 여기서 tab=beauty 인지 꼭 확인하세요!

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: isBeauty ? `💄 [K-Beauty] ${cleanName}` : `🛒 [K-Food] ${cleanName}`,
            description: `${cleanName} 최저가를 확인해보세요!`,
            imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{
            title: '가격 확인하기',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
        }],
    });
};