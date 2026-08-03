import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase'; // 💡 본인의 firebase 경로에 맞춰 확인하세요.

// 마트별 이모지 리턴 함수
const getMartEmoji = (martName: string = '') => {
  const name = martName.toLowerCase();
  if (name.includes('한독')) return '🥟';
  if (name.includes('와이') || name.includes('y-mart')) return '🛍️';
  if (name.includes('k-shop') || name.includes('kshop')) return '🐳';
  if (name.includes('goasia') || name.includes('고아시아')) return '🇨🇳';
  if (name.includes('momongo') || name.includes('모몽고')) return '👾';
  if (name.includes('코켓') || name.includes('kocket')) return '🥣';
  if (name.includes('다와요') || name.includes('dawayo')) return '🚚';
  if (name.includes('더글라스') || name.includes('douglas')) return '💄';
  if (name.includes('아마존') || name.includes('amazon')) return '📦';
  return '🏪';
};

// 카테고리 퀵 메뉴 데이터
const CATEGORIES = [
  { id: 'ramen', label: '라면', icon: '🍜', keyword: '라면' },
  { id: 'kimchi', label: '김치/반찬', icon: '🥬', keyword: '김치' },
  { id: 'snack', label: '간식/음료', icon: '🍫', keyword: '과자' },
  { id: 'beauty', label: 'K-뷰티', icon: '✨', keyword: '크림' },
  { id: 'sauce', label: '양념/장류', icon: '🌶️', keyword: '고추장' },
];

interface PopularItem {
  id: string;
  name: string;
  searchKeyword: string;
  price: string;
  icon: string;
  tag: string;
}

const TRANSLATIONS = {
  KR: {
    subtitle: 'Guten Tag! 🇩🇪',
    title: 'K-Food & Beauty 최저가',
    popularTitle: '🔥 실시간 인기 최저가 아이템',
    requestBannerTitle: '🔍 찾는 상품의 최저가가 없나요?',
    requestBannerSub: '클릭하고 최저가 등록 요청하기',
    supportTag: 'SUPPORT',
    coffeeTitle: '개발자에게 커피 한 잔 선물하기 ☕',
    coffeeDesc: '더 빠르고 정확한 최저가 정보를 제공해 드릴게요!',
    coffeeBtn: '후원',
    careerTag: 'CAREER',
    jobTitle: '독일 취업, ',
    jobHighlight: '월드케이잡',
    jobDesc: '해외 한인 채용 정보 공유 사이트',
    jobBtn: '방문 →',
    footerDesc: '독일 내 한인 마트 및 K-뷰티 실시간 가격 비교 플랫폼',
    contact: '문의: contact@kfoodtracker.com',
    copyright: '© 2026 K-Food Tracker. All rights reserved.',
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
  },
};

export default function HomeScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'prices', 'latest'), (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data().data || [];
        const mapped: PopularItem[] = raw.slice(0, 10).map((item: any, idx: number) => {
          const martName = item.mart || '온라인몰';
          return {
            id: `pop_${idx}`,
            name: item.searchKeyword?.trim() || item.item,
            searchKeyword: item.searchKeyword?.trim() || item.item,
            price: `${(parseFloat(item.price) || 0).toFixed(2)} € ~`,
            icon: item.category === 'beauty' ? '💄' : '🍜',
            tag: `${getMartEmoji(martName)} ${martName}`,
          };
        });
        setPopularItems(mapped);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (popularItems.length === 0) return;
    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % popularItems.length;
      flatListRef.current?.scrollToIndex({
        index: currentIndex.current,
        animated: true,
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [popularItems]);

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  const handleSubCategoryPress = (subCatId: string) => {
  router.push({
    pathname: '/(tabs)/compare',
    params: { search: subCatId }, // 👈 '고추장' 대신 'sauce', 'snack' 등 id 자체를 전달!
  });
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 🌐 1. 상단 Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
            <Text style={styles.headerTitle}>{t.title}</Text>
          </View>
          <View style={styles.langSelector}>
            {(['KR', 'EN', 'DE'] as const).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
              >
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 📱 2. 메인 콘텐츠 1: 카테고리 퀵 메뉴 */}
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPadding}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/compare',
                    params: { search: cat.keyword },
                  });
                }}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🔥 3. 메인 콘텐츠 2: 실시간 최저가 핫딜 (횡스크롤) */}
        <View style={styles.sectionMargin}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.popularTitle}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/compare')}>
              <Text style={styles.moreText}>전체보기 ➔</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={popularItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.horizontalPadding}
            getItemLayout={(_, index) => ({
              length: 180,
              offset: 180 * index,
              index,
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/compare',
                    params: { search: item.searchKeyword },
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText} numberOfLines={1}>{item.tag}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>최저</Text>
                    <Text style={styles.itemPrice}>{item.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* 🔔 4. '최저가 요청' 컴팩트 Banner */}
        <View style={styles.horizontalPadding}>
          <TouchableOpacity
            style={styles.requestBanner}
            activeOpacity={0.8}
            onPress={() => openUrl('mailto:contact@kfoodtracker.com?subject=상품 최저가 요청')}
          >
            <View style={styles.requestBannerLeft}>
              <Text style={styles.requestBannerIcon}>💡</Text>
              <View>
                <Text style={styles.requestBannerTitle}>{t.requestBannerTitle}</Text>
                <Text style={styles.requestBannerSub}>{t.requestBannerSub}</Text>
              </View>
            </View>
            <Text style={styles.requestBannerArrow}>➔</Text>
          </TouchableOpacity>
        </View>

        {/* ☕/🚀 5. 하단 미니 배너 (커피 후원 & 월드케이잡) */}
        <View style={[styles.section, styles.horizontalPadding]}>
          <TouchableOpacity
            style={styles.compactCardYellow}
            activeOpacity={0.7}
            onPress={() => openUrl('https://ko-fi.com/kfoodtracker')}
          >
            <View style={styles.compactRow}>
              <Text style={styles.compactIcon}>☕</Text>
              <View style={styles.compactTextContainer}>
                <View style={styles.badgeRow}>
                  <Text style={styles.compactBadgeYellow}>{t.supportTag}</Text>
                  <Text style={styles.compactTitle}>{t.coffeeTitle}</Text>
                </View>
                <Text style={styles.compactDesc} numberOfLines={1}>{t.coffeeDesc}</Text>
              </View>
              <View style={styles.compactBtnYellow}>
                <Text style={styles.compactBtnTextYellow}>{t.coffeeBtn}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.compactCardBlue}
            activeOpacity={0.7}
            onPress={() => openUrl('https://www.worldkjob.com/')}
          >
            <View style={styles.compactRow}>
              <Text style={styles.compactIcon}>🚀</Text>
              <View style={styles.compactTextContainer}>
                <View style={styles.badgeRow}>
                  <Text style={styles.compactBadgeBlue}>{t.careerTag}</Text>
                  <Text style={styles.compactTitle}>
                    {t.jobTitle}<Text style={styles.jobHighlight}>{t.jobHighlight}</Text>
                  </Text>
                </View>
                <Text style={styles.compactDesc} numberOfLines={1}>{t.jobDesc}</Text>
              </View>
              <View style={styles.compactBtnBlue}>
                <Text style={styles.compactBtnTextBlue}>{t.jobBtn}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 🏢 6. 서비스 푸터 */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>K-Food Tracker 🇩🇪</Text>
          <Text style={styles.footerText}>{t.footerDesc}</Text>
          <Text style={styles.footerContact}>{t.contact}</Text>
          <Text style={styles.footerCopyright}>{t.copyright}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerSubtitle: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 2 },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 8, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  langTextActive: { color: '#111827' },

  /* 카테고리 퀵 메뉴 스타일 */
  categoryContainer: { marginVertical: 8 },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
  },
  categoryIcon: { fontSize: 16, marginRight: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },

  sectionMargin: { marginVertical: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  moreText: { fontSize: 12, color: '#FF4757', fontWeight: '700' },
  horizontalPadding: { paddingHorizontal: 20 },

  card: {
    width: 165,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#FFEAEB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconText: { fontSize: 22 },
  tagBadge: { backgroundColor: '#FFF0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, maxWidth: 100 },
  tagText: { color: '#FF4757', fontSize: 10, fontWeight: '800' },
  cardBody: { marginTop: 10 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1F2937', height: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  priceLabel: { fontSize: 10, color: '#9CA3AF', marginRight: 3 },
  itemPrice: { fontSize: 14, fontWeight: '900', color: '#FF4757' },

  /* 최저가 요청 컴팩트 배너 */
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  requestBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  requestBannerIcon: { fontSize: 20, marginRight: 12 },
  requestBannerTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  requestBannerSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  requestBannerArrow: { fontSize: 14, color: '#FF4757', fontWeight: '800' },

  section: { marginVertical: 8 },

  /* 하단 슬림 배너 스타일 */
  compactCardYellow: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  compactCardBlue: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  compactRow: { flexDirection: 'row', alignItems: 'center' },
  compactIcon: { fontSize: 18, marginRight: 10 },
  compactTextContainer: { flex: 1, marginRight: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  compactBadgeYellow: { backgroundColor: '#F59E0B', color: '#FFF', fontSize: 8, fontWeight: '800', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginRight: 6 },
  compactBadgeBlue: { backgroundColor: '#2563EB', color: '#FFF', fontSize: 8, fontWeight: '800', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginRight: 6 },
  compactTitle: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  jobHighlight: { color: '#2563EB', fontWeight: '800' },
  compactDesc: { fontSize: 11, color: '#6B7280', marginTop: 1 },

  compactBtnYellow: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  compactBtnTextYellow: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  compactBtnBlue: { backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  compactBtnTextBlue: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
  },
  footerBrand: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 4 },
  footerText: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  footerContact: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  footerCopyright: { fontSize: 11, color: '#9CA3AF' },
});