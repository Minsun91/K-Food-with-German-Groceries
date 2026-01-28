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
export const shareToWhatsApp = (recipe) => {
      if (!recipe?.id) {
          alert(currentLang === 'de' ? "Speichere das Rezept zuerst!" : "Save the recipe first!");
          return;
      }
      const shareUrl = `${window.location.origin}${window.location.pathname}?recipeId=${recipe.id}&lang=de`;
      const recipeName = recipe.name_de || recipe.name_en || recipe.name_ko;
      const text = `${recipeName}\nProbier dieses Rezept aus! \n\n ${shareUrl}`;
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
  