// export const shareToKakao = (recipe, lang) => {
//     if (!window.Kakao) return;
//     const name = recipe[`name_${lang}`] || recipe.name;
    
//     window.Kakao.Share.sendDefault({
//       objectType: 'feed',
//       content: {
//         title: name,
//         description: '독일 마트 재료로 만드는 K-Food 레시피!',
//         imageUrl: 'https://your-app-url.com/logo.png',
//         link: {
//           mobileWebUrl: window.location.href,
//           webUrl: window.location.href,
//         },
//       },
//     });
//   };
  
//   export const shareToWhatsApp = (recipe, lang) => {
//     const name = recipe[`name_${lang}`] || recipe.name;
//     const text = `${name} 레시피를 확인해보세요! ${window.location.href}`;
//     window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
//   };

  // WhatsApp 공유 함수
export const shareToWhatsApp = (recipe, currentLang = 'de') => {
    // 1. 레시피 데이터 확인
    if (!recipe?.id) {
        const alertMsg = {
            de: "Bitte speichere das Rezept zuerst!",
            ko: "레시피를 먼저 저장해주세요!",
            en: "Please save the recipe first!"
        };
        alert(alertMsg[currentLang] || alertMsg.de);
        return;
    }

    // 2. 현재 언어에 맞는 이름 가져오기 (없으면 기본 name)
    const recipeName = recipe[`name_${currentLang}`] || recipe.name_de || recipe.name_ko || recipe.name || "K-Food Recipe";
    
    // 3. 언어별 초대 문구 설정
    const inviteMsg = {
        de: "Probier dieses Rezept aus!",
        ko: "이 레시피 한번 해보세요!",
        en: "Check out this Korean recipe!"
    };

    // 4. URL 구성 (lang 파라미터 강제 지정)
    const shareUrl = `${window.location.origin}/recipe?recipeId=${recipe.id}&lang=${currentLang}`;
    
    // 5. 최종 메시지 조립
    const text = `*${recipeName}*\n${inviteMsg[currentLang] || inviteMsg.de}\n\n👉 ${shareUrl}`;

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
  