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
  export const shareToWhatsApp = (data, currentLang = 'ko') => {
    if (!data) return;

    // 🌟 판별 로직 강화: data.id가 확실히 있을 때만 레시피로 인식
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;
    const name = data[`name_${currentLang}`] || data.name_ko || data.name || "K-Food";
    
    let msgText = "";
    const shareUrl = isRecipe 
        ? `${window.location.origin}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${window.location.origin}/price?search=${encodeURIComponent(name)}&lang=${currentLang}`;

    if (isRecipe) {
        // ✅ 레시피 모드 전용 문구
        const inviteText = currentLang === 'de' ? "Probier dieses Rezept aus!" : "이 레시피 한번 해보세요!";
        msgText = `*${name}*\n${inviteText}\n\n👉 ${shareUrl}`;
    } else {
        // ✅ 가격 비교 모드 전용 문구 (Buldak 등 품목용)
        const price = data.price || "0.00";
        const savings = (data.savings && data.savings !== "0.00") ? ` (${data.savings}€ 절약!)` : "";
        const priceMsg = currentLang === 'de' ? `Bester Preis: ${price}€${savings}` : `최저가 정보: ${price}€${savings}`;
        
        msgText = `🛒 *${name} 최저가 알림*\n${priceMsg}\n지금 확인하고 절약하세요! 👇\n${shareUrl}`;
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

    // 🌟 판별 로직 강화: id가 '문자열'이면서 길이가 충분할 때만 레시피로 간주
    const isRecipe = data.id && typeof data.id === 'string' && data.id.length > 5;
    
    const name = data[`name_${currentLang}`] || data.name_ko || data.name || "K-Food";
    
    // URL 생성 로직 분리
    const shareUrl = isRecipe 
        ? `${window.location.origin}/recipe?recipeId=${data.id}&lang=${currentLang}`
        : `${window.location.origin}/price?search=${encodeURIComponent(name)}&lang=${currentLang}`;

    // 설명 문구 최적화
    const description = isRecipe 
        ? (currentLang === 'de' ? 'Koreanische Rezepte mit Zutaten aus DE' : '독일 마트 재료로 만든 한식 레시피!')
        : (currentLang === 'de' 
            ? `Sparen Sie ${data.savings || '0.00'}€ bei ${name}!` 
            : `${name} 최저가 ${data.price || '0.00'}€! 지금 확인하면 ${data.savings || '0.00'}€ 절약! 💰`);

    window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: isRecipe ? name : `🛒 ${name} 최저가 정보`,
            description: description,
            imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{
            title: isRecipe ? (currentLang === 'de' ? 'Rezept ansehen' : '레시피 보기') : '가격 확인하기',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
        }],
    });
};