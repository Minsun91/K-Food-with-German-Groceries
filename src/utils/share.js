  // WhatsApp 공유 함수
  export const shareToWhatsApp = (recipe, currentLang = 'ko') => {
    // 1. 레시피 ID가 없는 경우 (저장되지 않은 경우)
    if (!recipe?.id) {
        const msg = currentLang === 'de' 
            ? "Bitte speichere das Rezept zuerst!" 
            : (currentLang === 'ko' ? "레시피를 먼저 저장해주세요!" : "Please save the recipe first!");
        alert(msg);
        return;
    }

    // 2. 공유 정보 구성
    const recipeName = recipe[`name_${currentLang}`] || recipe.name_ko || recipe.name;
    const shareUrl = `${window.location.origin}/recipe?recipeId=${recipe.id}&lang=${currentLang}`;
    
    // 3. 메시지 텍스트 (undefined 방지 및 깔끔한 포맷)
    const inviteText = currentLang === 'de' 
        ? "Probier dieses Rezept aus!" 
        : (currentLang === 'ko' ? "이 레시피 한번 해보세요!" : "Check out this recipe!");

    const text = `*${recipeName}*\n${inviteText}\n\n👉 ${shareUrl}`;

    // 4. WhatsApp 호출
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

export const shareToKakao = (recipe, currentLang) => {
      const kakaoKey = "c78231a56667f351595ae8b2d87b2152";
  
      if (!recipe || !recipe.id) {
          const alertMsg = {
              ko: "먼저 '레시피 저장' 버튼을 눌러주세요!",
              en: "Please save the recipe first!",
              de: "Bitte speichere zuerst das Rezept!"
          };
          alert(alertMsg[currentLang] || alertMsg['ko']);
          return;
      }
  
      if (window.Kakao) {
          if (!window.Kakao.isInitialized()) {
              window.Kakao.init(kakaoKey);
          }
  
          const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=${currentLang}`;
  
          const contentConfig = {
              ko: {
                  title: recipe.name_ko || recipe.name,
                  description: '독일 마트 재료로 만든 한식 레시피!',
                  button: '레시피 보기'
              },
              en: {
                  title: recipe.name_en || recipe.name,
                  description: 'Korean recipes with German ingredients!',
                  button: 'View Recipe'
              },
              de: {
                  title: recipe.name_de || recipe.name,
                  description: 'Koreanische Rezepte mit deutschen Zutaten!',
                  button: 'Rezept ansehen'
              }
          };
  
          const config = contentConfig[currentLang] || contentConfig['ko'];
  
          window.Kakao.Share.sendDefault({
              objectType: 'feed',
              content: {
                  title: config.title,
                  description: config.description,
                  imageUrl: 'https://k-food-with-german-groceries.web.app/og-image.png',
                  link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
              },
              buttons: [
                  {
                      title: config.button,
                      link: { mobileWebUrl: shareUrl, webUrl: shareUrl }
                  }
              ],
          });
      }
  };