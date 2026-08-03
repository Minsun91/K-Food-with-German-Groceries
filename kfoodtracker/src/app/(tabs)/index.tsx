import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';

// 인기 아이템 최저가 데이터
const popularItems = [
  { name: "신라면 (Shin Ramyun)", tag: "BEST", price: "1,19 € ~", icon: "🍜" },
  { name: "종가집 김치 (Kimchi)", tag: "HOT", price: "6,42 € ~", icon: "🥬" },
  { name: "메디큐브 부스터 프로 (medicube Booster Pro)", tag: "K-BEAUTY", price: "138,95 € ~", icon: "✨" },
  { name: "불닭볶음면 (Buldak)", tag: "POPULAR", price: "1,39 € ~", icon: "🔥" },
  { name: "짜파게티 (Chapagetti)", tag: "TRENDING", price: "1,19 € ~", icon: "🍝" },
  { name: "PDRN 크림 (PDRN capsule cream)", tag: "K-BEAUTY", price: "20,99 € ~", icon: "💧" },
];

// 다국어 텍스트 정의
const TRANSLATIONS = {
  KR: {
    subtitle: 'Guten Tag! 🇩🇪',
    title: 'K-Food & Beauty 최저가',
    cats: ['전체', '🍜 라면', '🥬 김치/식품', '✨ K-뷰티', '🔥 핫템'],
    popularTitle: '🔥 실시간 인기 최저가 아이템',
    supportTag: 'SUPPORT',
    coffeeTitle: '개발자에게 커피 한 잔 선물하기 ☕',
    coffeeDesc: '더 빠르고 정확한 최저가 정보를 제공해 드릴게요!',
    coffeeBtn: '후원하기',
    careerTag: 'CAREER IN GERMANY',
    jobTitle: '독일 한인 회사 취업, ',
    jobHighlight: '월드케이잡',
    jobTitleEnd: '에서 확인하세요',
    jobDesc: '해외 한인 채용 정보 공유 사이트',
    jobBtn: '방문하기 →',
    footerDesc: '독일 내 한인 마트 및 K-뷰티 실시간 가격 비교 플랫폼',
    contact: '문의: contact@kfoodtracker.com',
    copyright: '© 2026 K-Food Tracker. All rights reserved.',
  },
  EN: {
    subtitle: 'Guten Tag! 🇩🇪',
    title: 'K-Food & Beauty Lowest Price',
    cats: ['All', '🍜 Ramen', '🥬 Kimchi/Food', '✨ K-Beauty', '🔥 Hot'],
    popularTitle: '🔥 Live Popular Deals',
    supportTag: 'SUPPORT',
    coffeeTitle: 'Buy the Developer a Coffee ☕',
    coffeeDesc: 'Helps us keep price updates fast and accurate!',
    coffeeBtn: 'Donate',
    careerTag: 'CAREER IN GERMANY',
    jobTitle: 'Korean Company Jobs in DE, ',
    jobHighlight: 'WorldKJob',
    jobTitleEnd: '',
    jobDesc: 'Global Korean Career & Hiring Portal',
    jobBtn: 'Visit →',
    footerDesc: 'Real-time K-Food & K-Beauty price tracker in Germany',
    contact: 'Contact: contact@kfoodtracker.com',
    copyright: '© 2026 K-Food Tracker. All rights reserved.',
  },
  DE: {
    subtitle: 'Guten Tag! 🇩🇪',
    title: 'K-Food & Beauty Bestpreis',
    cats: ['Alle', '🍜 Ramen', '🥬 Kimchi/Essen', '✨ Kosmetik', '🔥 Hot'],
    popularTitle: '🔥 Live Beliebte Angebote',
    supportTag: 'SUPPORT',
    coffeeTitle: 'Unterstütze den Entwickler ☕',
    coffeeDesc: 'Hilft uns, Preise schnell und genau zu halten!',
    coffeeBtn: 'Spenden',
    careerTag: 'KARRIERE IN DEUTSCHLAND',
    jobTitle: 'Jobs in koreanischen Firmen, ',
    jobHighlight: 'WorldKJob',
    jobTitleEnd: '',
    jobDesc: 'Karriereportal für Koreaner im Ausland',
    jobBtn: 'Besuchen →',
    footerDesc: 'Echtzeit-Preistracker für K-Food & Kosmetik in Deutschland',
    contact: 'Kontakt: contact@kfoodtracker.com',
    copyright: '© 2026 K-Food Tracker. Alle Rechte vorbehalten.',
  },
};

export default function HomeScreen() {
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const [selectedCategory, setSelectedCategory] = useState(0);

  const t = TRANSLATIONS[lang];

  const openUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 🌐 헤더 + 언어 선택 스위처 (KR | EN | DE) */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
            <Text style={styles.headerTitle}>{t.title}</Text>
          </View>

          {/* 언어 버튼 */}
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

        {/* 1. 카테고리 횡스크롤 */}
        <View style={styles.section}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.horizontalPadding}
          >
            {t.cats.map((cat, idx) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === idx && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(idx)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === idx && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 2. 실시간 인기 아이템 횡스크롤 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.popularTitle}</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.horizontalPadding}
          >
            {popularItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{item.tag}</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>{item.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. 커피 후원 & 월드케이잡 섹션 */}
        <View style={[styles.section, styles.horizontalPadding]}>
          {/* ☕ 커피 후원 섹션 */}
          <View style={styles.coffeeCard}>
            <View style={styles.cardRow}>
              <View style={styles.iconBoxYellow}>
                <Text style={styles.iconTextLarge}>🌱</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <View style={styles.supportBadge}>
                  <Text style={styles.supportBadgeText}>{t.supportTag}</Text>
                </View>
                <Text style={styles.coffeeTitle}>{t.coffeeTitle}</Text>
                <Text style={styles.coffeeDesc}>{t.coffeeDesc}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.coffeeButton}
              onPress={() => openUrl('https://ko-fi.com/kfoodtracker')}
            >
              <Text style={styles.coffeeButtonText}>{t.coffeeBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* ✂️ 은은한 구분선 (Divider) */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerDot}>✦</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 🚀 WorldKJob 배너 섹션 */}
          <TouchableOpacity 
            style={styles.jobCard}
            onPress={() => openUrl('https://www.worldkjob.com/')}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconBoxPink}>
                <Text style={styles.iconTextLarge}>🚀</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <View style={styles.careerBadge}>
                  <Text style={styles.careerBadgeText}>{t.careerTag}</Text>
                </View>
                <Text style={styles.jobTitle}>
                  {t.jobTitle}<Text style={styles.jobHighlight}>{t.jobHighlight}</Text>{t.jobTitleEnd}
                </Text>
                <Text style={styles.jobDesc}>{t.jobDesc}</Text>
              </View>
            </View>
            <View style={styles.jobButton}>
              <Text style={styles.jobButtonText}>{t.jobBtn}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. 🏢 서비스/회사 소개 하단 푸터 (Footer) */}
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 15,
  },
  headerSubtitle: { fontSize: 13, color: '#868E96', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#212529', marginTop: 2 },
  
  // 언어 선택 스위처
  langSelector: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 8, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#FFFFFF', elevation: 1 },
  langText: { fontSize: 11, fontWeight: '700', color: '#868E96' },
  langTextActive: { color: '#212529', fontWeight: '900' },

  section: { marginBottom: 20 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#212529' },
  horizontalPadding: { paddingHorizontal: 16 },

  // 카테고리 칩
  categoryChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#E9ECEF', marginRight: 8 },
  categoryChipActive: { backgroundColor: '#FF6B6B' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#495057' },
  categoryTextActive: { color: '#FFFFFF' },

  // 횡스크롤 카드
  card: {
    width: 165,
    height: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconText: { fontSize: 26 },
  tagBadge: { backgroundColor: '#FFF0F0', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  tagText: { color: '#FF6B6B', fontSize: 10, fontWeight: 'bold' },
  cardBody: { marginTop: 6 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#343A40', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: '#FF6B6B' },

  // 카드 공통 레이아웃
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTextContainer: { flex: 1 },
  iconTextLarge: { fontSize: 22 },

  // ☕ 커피 후원
  coffeeCard: { backgroundColor: '#FFFCF0', borderColor: '#FEF08A', borderWidth: 1, borderRadius: 18, padding: 16 },
  iconBoxYellow: { width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FEF9C3', marginRight: 12 },
  supportBadge: { backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  supportBadgeText: { fontSize: 9, fontWeight: '900', color: '#A16207' },
  coffeeTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  coffeeDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  coffeeButton: { backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  coffeeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // ✂️ 구분선
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerDot: { color: '#94A3B8', fontSize: 10, marginHorizontal: 10 },

  // 🚀 WorldKJob 배너
  jobCard: { backgroundColor: '#FFF5F5', borderColor: '#FCE7F3', borderWidth: 1, borderRadius: 18, padding: 16 },
  iconBoxPink: { width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCE7F3', marginRight: 12 },
  careerBadge: { backgroundColor: '#FCE7F3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  careerBadgeText: { fontSize: 9, fontWeight: '900', color: '#DB2777' },
  jobTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B', lineHeight: 17 },
  jobHighlight: { color: '#6366F1' },
  jobDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  jobButton: { backgroundColor: '#6366F1', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  jobButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  // 🏢 푸터
  footer: {
    backgroundColor: '#F1F3F5',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    alignItems: 'center',
  },
  footerBrand: { fontSize: 14, fontWeight: '800', color: '#495057', marginBottom: 4 },
  footerText: { fontSize: 11, color: '#868E96', textAlign: 'center', marginBottom: 6 },
  footerContact: { fontSize: 11, color: '#868E96', fontWeight: '600', marginBottom: 12 },
  footerCopyright: { fontSize: 10, color: '#ADB5BD' },
});