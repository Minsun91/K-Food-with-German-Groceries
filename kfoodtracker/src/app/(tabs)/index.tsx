import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TRANSLATIONS } from '../../constants/translations';

export default function HomeScreen() {
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const t = TRANSLATIONS[lang];
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [popularItems] = useState<any[]>([
    { id: '1', name: '신라면 (5개입)', price: '4.50 €', icon: '🍜', tag: 'HOT', searchKeyword: '신라면' },
    { id: '2', name: '종가집 종가김치 (1kg)', price: '9.80 €', icon: '🥬', tag: 'BEST', searchKeyword: '김치' },
    { id: '3', name: '불닭볶음면', price: '4.90 €', icon: '🔥', tag: 'SALE', searchKeyword: '불닭' },
    { id: '4', name: '진라면 매운맛', price: '3.90 €', icon: '🍜', tag: 'HIT', searchKeyword: '진라면' },
    { id: '5', name: '너구리 (5개입)', price: '4.70 €', icon: '🍜', tag: 'POP', searchKeyword: '너구리' },
    { id: '6', name: '햇반 (6개입)', price: '7.50 €', icon: '🍚', tag: 'BEST', searchKeyword: '햇반' },
    { id: '7', name: '참기름 (500ml)', price: '8.90 €', icon: '🍾', tag: 'HOT', searchKeyword: '참기름' },
    { id: '8', name: '고추장 (1kg)', price: '6.50 €', icon: '🌶️', tag: 'SALE', searchKeyword: '고추장' },
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 상단 언어 선택 토글 버튼 바 */}
        <View style={styles.topBar}>
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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* 1. 헤더 타이틀 영역 */}
          <View style={styles.headerContainer}>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
            <Text style={styles.title}>{t.title}</Text>
          </View>

          {/* 2. 카테고리 탭 영역 (다국어 자동 연동) */}
          <View style={styles.categoryContainer}>
            {t.categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryBtn}
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
          </View>

          {/* 3. 메인 콘텐츠: 실시간 최저가 핫딜 */}
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/compare',
                      params: { search: item.searchKeyword || item.name },
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

          {/* 4. 최저가 등록 요청 배너 */}
          <TouchableOpacity 
            style={styles.requestBanner}
            onPress={() => router.push('/(tabs)/mypage')}
          >
            <Text style={styles.requestBannerTitle}>{t.requestBannerTitle}</Text>
            <Text style={styles.requestBannerSub}>{t.requestBannerSub}</Text>
          </TouchableOpacity>

          {/* 5. 개발자 후원 카드 */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardBadge}>{t.supportTag}</Text>
              <Text style={styles.infoCardTitle}>{t.coffeeTitle}</Text>
            </View>
            <Text style={styles.infoCardDesc}>{t.coffeeDesc}</Text>
            <TouchableOpacity style={styles.infoCardBtn} onPress={() => Linking.openURL('https://ko-fi.com')}>
              <Text style={styles.infoCardBtnText}>{t.coffeeBtn} ☕</Text>
            </TouchableOpacity>
          </View>

          {/* 6. 월드케이잡 카드 */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={[styles.infoCardBadge, { backgroundColor: '#DBEAFE', color: '#2563EB' }]}>{t.careerTag}</Text>
              <Text style={styles.infoCardTitle}>
                {t.jobTitle}<Text style={{ color: '#2563EB' }}>{t.jobHighlight}</Text>
              </Text>
            </View>
            <Text style={styles.infoCardDesc}>{t.jobDesc}</Text>
            <TouchableOpacity 
              style={[styles.infoCardBtn, { backgroundColor: '#2563EB' }]} 
              onPress={() => Linking.openURL('https://worldkjob.com')}
            >
              <Text style={styles.infoCardBtnText}>{t.jobBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* 7. 푸터 */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerDesc}>{t.footerDesc}</Text>
            <Text style={styles.footerContact}>{t.contact}</Text>
            <Text style={styles.footerCopy}>{t.copyright}</Text>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 6 },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { color: '#FF4757' },
  content: { padding: 16, paddingBottom: 40 },
  headerContainer: { marginBottom: 14 },
  subtitle: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginTop: 2 },
  categoryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  categoryBtn: { alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, flex: 1, marginHorizontal: 2, borderWidth: 1, borderColor: '#E5E7EB' },
  categoryIcon: { fontSize: 18, marginBottom: 2 },
  categoryLabel: { fontSize: 10, fontWeight: '600', color: '#374151' },
  sectionMargin: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  moreText: { fontSize: 12, fontWeight: '600', color: '#FF4757' },
  horizontalPadding: { paddingRight: 10 },
  card: { width: 135, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  iconText: { fontSize: 16 },
  tagBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  tagText: { fontSize: 8, fontWeight: '700', color: '#DC2626' },
  cardBody: { marginTop: 2 },
  itemName: { fontSize: 12, fontWeight: '600', color: '#1F2937', height: 32, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 10, color: '#9CA3AF' },
  itemPrice: { fontSize: 12, fontWeight: '700', color: '#FF4757' },
  requestBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  requestBannerTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 2 },
  requestBannerSub: { fontSize: 11, color: '#7F1D1D' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoCardBadge: { fontSize: 10, fontWeight: '700', color: '#D97706', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  infoCardDesc: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  infoCardBtn: { backgroundColor: '#FF4757', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  infoCardBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  footerContainer: { marginTop: 10, alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  footerDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 4 },
  footerContact: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
  footerCopy: { fontSize: 9, color: '#D1D5DB' },
});