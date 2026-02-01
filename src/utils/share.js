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
    const shareUrl = isRecipe 
        ? `${window.location.origin}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${window.location.origin}/price?search=${encodeURIComponent(name)}&lang=${currentLang}`;

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
    
    // 1. 모든 언어 필드 체크 (이름 누락 방지 - 왓츠앱과 통일)
    const name = data[`name_${currentLang}`] || data.name_ko || data.name_en || data.name_de || data.name || "K-Food";

    if (!data || !window.Kakao) {
        console.error("Kakao SDK 미로드 또는 데이터 없음");
        return;
    }

    if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
    }

    // 2. 레시피 판별 로직
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;
        
    // 3. URL 생성
    const shareUrl = isRecipe 
        ? `${window.location.origin}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${window.location.origin}/price?search=${encodeURIComponent(name)}&lang=${currentLang}`;

    // 4. 설명 문구 (왓츠앱처럼 다정하게 수정 ✨)
    let description = "";
    if (isRecipe) {
        // ✅ 레시피 모드: "이거 해보세요" 멘트 추가
        const inviteText = 
            currentLang === 'de' ? "Probier dieses Rezept aus! 👩‍🍳" : 
            currentLang === 'en' ? "You should try this recipe! 🍳" : 
            "이 레시피 한번 해보세요! 😋";
            
        const subText = 
            currentLang === 'de' ? "Zutaten aus deutschen Supermärkten." : 
            "독일 마트 재료로 만드는 쉽고 맛있는 한식!";
            
        description = `${inviteText}\n${subText}`;
    } else {
        // ✅ 가격 비교 모드: 절약 강조
        const savings = (data.savings && data.savings !== "0.00") ? ` (${data.savings}€ 절약!)` : "";
        description = currentLang === 'de' 
            ? `Sparen Sie ${data.savings || '0.00'}€ bei ${name}! 💸 Now or Never!` 
            : `${name} 최저가 ${data.price || '0.00'}€!${savings}\n지금 확인하고 장바구니 무게를 줄이세요! 🛒`;
    }

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: isRecipe ? `👨‍🍳 [Recipe] ${name}` : `🛒 [Lowest Price] ${name}`,
            description: description,
            imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{
            title: isRecipe 
                ? (currentLang === 'de' ? 'Rezept öffnen' : currentLang === 'en' ? 'View Recipe' : '레시피 보기') 
                : (currentLang === 'de' ? 'Preis prüfen' : '가격 확인하기'),
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
        }],
    });
};