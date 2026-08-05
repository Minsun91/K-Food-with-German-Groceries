export const TRANSLATIONS = {
    KR: {
      // 공통 및 메인 화면 텍스트
      subtitle: 'Guten Tag! 🇩🇪',
      title: 'K-Food & Beauty 최저가',
      popularTitle: '🔥 실시간 인기 최저가 아이템',
      requestBannerTitle: '🔍 찾는 상품의 최저가가 없나요?',
      requestBannerSub: '클릭하고 최저가 등록 요청하기',
      
      // 후원 & 취업 배너
      supportTag: 'SUPPORT',
      coffeeTitle: '개발자에게 커피 한 잔 선물하기 ☕',
      coffeeDesc: '더 빠르고 정확한 최저가 정보를 제공해 드릴게요!',
      coffeeBtn: '후원',
      careerTag: 'CAREER',
      jobTitle: '독일 취업, ',
      jobHighlight: '월드케이잡',
      jobDesc: '해외 한인 채용 정보 공유 사이트',
      jobBtn: '방문 →',
      
      // 푸터
      footerDesc: '독일 내 한인 마트 및 K-뷰티 실시간 가격 비교 플랫폼',
      contact: '문의: contact@kfoodtracker.com',
      copyright: '© 2026 K-Food Tracker. All rights reserved.',
  
      // 비교(Compare) 화면 전용 텍스트
      compareTitle: '가격 비교',
      placeholder: '상품명 또는 카테고리 검색',
      catAll: '전체',
      catFood: '식품',
      catBeauty: '뷰티',
      emptyText: '해당하는 상품이 없습니다 😅',
      shareBtn: '공유 🔗',
      
      // 카테고리 목록
      categories: [
        { id: 'ramen', label: '라면', icon: '🍜', keyword: '라면' },
        { id: 'kimchi', label: '김치/반찬', icon: '🥬', keyword: '김치' },
        { id: 'snack', label: '간식/음료', icon: '🍫', keyword: '과자' },
        { id: 'beauty', label: 'K-뷰티', icon: '✨', keyword: '크림' },
        { id: 'sauce', label: '양념/장류', icon: '🌶️', keyword: '고추장' },
      ],
  
      // 공유 메시지 템플릿
      shareMessage: (title: string, price: string, url: string) =>
        `🔥 ${title} 최저가 떴어요! 지금 ${price}€에 득템하고 절약하세요! 👇\n\n👉 가격 확인하기: ${url}`,
    },
  
    EN: {
      subtitle: 'Guten Tag! 🇩🇪',
      title: 'K-Food & Beauty Lowest Price',
      popularTitle: '🔥 Live Popular Deals',
      requestBannerTitle: '🔍 Can’t find your item?',
      requestBannerSub: 'Tap here to request price tracking',
      
      supportTag: 'SUPPORT',
      coffeeTitle: 'Buy Developer a Coffee ☕',
      coffeeDesc: 'Helps us keep price updates fast and accurate!',
      coffeeBtn: 'Donate',
      careerTag: 'CAREER',
      jobTitle: 'Jobs in DE, ',
      jobHighlight: 'WorldKJob',
      jobDesc: 'Global Korean Hiring Portal',
      jobBtn: 'Visit →',
      
      footerDesc: 'Real-time K-Food & K-Beauty price tracker in Germany',
      contact: 'Contact: contact@kfoodtracker.com',
      copyright: '© 2026 K-Food Tracker. All rights reserved.',
  
      compareTitle: 'Price Comparison',
      placeholder: 'Search product or category...',
      catAll: 'All',
      catFood: 'Food',
      catBeauty: 'Beauty',
      emptyText: 'No products found 😅',
      shareBtn: 'Share 🔗',
      
      categories: [
        { id: 'ramen', label: 'Ramen', icon: '🍜', keyword: 'ramen' },
        { id: 'kimchi', label: 'Kimchi/Side', icon: '🥬', keyword: 'kimchi' },
        { id: 'snack', label: 'Snacks/Drinks', icon: '🍫', keyword: 'snack' },
        { id: 'beauty', label: 'K-Beauty', icon: '✨', keyword: 'cream' },
        { id: 'sauce', label: 'Sauces/Paste', icon: '🌶️', keyword: 'sauce' },
      ],
  
      shareMessage: (title: string, price: string, url: string) =>
        `🔥 Lowest price for ${title}! Get it for ${price}€ and save big now! 👇\n\n👉 Check Price: ${url}`,
    },
  
    DE: {
      subtitle: 'Guten Tag! 🇩🇪',
      title: 'K-Food & Beauty Bestpreis',
      popularTitle: '🔥 Live Beliebte Angebote',
      requestBannerTitle: '🔍 Produkt nicht gefunden?',
      requestBannerSub: 'Klicken, um Preisvergleich anzufordern',
      
      supportTag: 'SUPPORT',
      coffeeTitle: 'Unterstütze Entwickler ☕',
      coffeeDesc: 'Hilft uns, Preise schnell und genau zu halten!',
      coffeeBtn: 'Spenden',
      careerTag: 'KARRIERE',
      jobTitle: 'Jobs in DE, ',
      jobHighlight: 'WorldKJob',
      jobDesc: 'Karriereportal für Koreaner im Ausland',
      jobBtn: 'Besuchen →',
      
      footerDesc: 'Echtzeit-Preistracker für K-Food & Kosmetik in Deutschland',
      contact: 'Kontakt: contact@kfoodtracker.com',
      copyright: '© 2026 K-Food Tracker. Alle Rechte vorbehalten.',
  
      compareTitle: 'Preisvergleich',
      placeholder: 'Produkt oder Kategorie suchen...',
      catAll: 'Alle',
      catFood: 'Lebensmittel',
      catBeauty: 'Beauty',
      emptyText: 'Keine Produkte gefunden 😅',
      shareBtn: 'Teilen 🔗',
      
      categories: [
        { id: 'ramen', label: 'Ramen', icon: '🍜', keyword: 'ramen' },
        { id: 'kimchi', label: 'Kimchi/Beilage', icon: '🥬', keyword: 'kimchi' },
        { id: 'snack', label: 'Snacks/Getränke', icon: '🍫', keyword: 'snack' },
        { id: 'beauty', label: 'K-Beauty', icon: '✨', keyword: 'creme' },
        { id: 'sauce', label: 'Soßen/Paste', icon: '🌶️', keyword: 'soße' },
      ],
  
      shareMessage: (title: string, price: string, url: string) =>
        `🔥 Bestpreis für ${title}! Jetzt für ${price}€ sichern und sparen! 👇\n\n👉 Preis prüfen: ${url}`,
    },
  };
  
  export type Language = 'KR' | 'EN' | 'DE';