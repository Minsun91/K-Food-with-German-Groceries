import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase'

interface ProductItem {
  id: string;
  category: 'food' | 'beauty';
  name: { KR: string; EN: string; DE: string };
  price: string;
  diff: string;
  tag: string;
  icon: string;
  shop?: string;
}

const TRANSLATIONS = {
  KR: { title: '실시간 가격 비교 💶', search: '독일 K-푸드 / K-뷰티 검색...', all: '전체', food: '🍜 식품', beauty: '💄 뷰티', empty: '등록된 상품이 없습니다.' },
  EN: { title: 'Live Price Tracker 💶', search: 'Search K-Food & Beauty in DE...', all: 'All', food: '🍜 Food', beauty: '💄 Beauty', empty: 'No products found.' },
  DE: { title: 'Echtzeit-Preistracker 💶', search: 'K-Food & Beauty suchen...', all: 'Alle', food: '🍜 Lebensmittel', beauty: '💄 Kosmetik', empty: 'Keine Produkte gefunden.' },
};

export default function CompareScreen() {
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const [selectedCat, setSelectedCat] = useState<'all' | 'food' | 'beauty'>('all');
  const [search, setSearch] = useState('');
  
  // Firebase Data States
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const t = TRANSLATIONS[lang];

  // Firestore 실시간 바인딩
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productList: ProductItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ProductItem, 'id'>),
        }));
        setItems(productList);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase fetch error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCat === 'all' || item.category === selectedCat;
    const itemName = item.name?.[lang] || item.name?.KR || '';
    const matchesSearch = itemName.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. iPhone Safe Area 반영 헤더 + 언어 선택 스위처 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
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

      <View style={styles.bodyContainer}>
        {/* 2. 검색창 */}
        <TextInput
          style={styles.search}
          placeholder={t.search}
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />

        {/* 3. 카테고리 칩 */}
        <View style={styles.filterRow}>
          {(['all', 'food', 'beauty'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, selectedCat === cat && styles.chipActive]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.chipText, selectedCat === cat && styles.chipTextActive]}>
                {t[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Firebase 실시간 데이터 리스트 */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF4757" />
            <Text style={styles.loadingText}>Firebase 데이터 수신 중...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t.empty}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.icon}>{item.icon || '📦'}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.name?.[lang] || item.name?.KR}</Text>
                  <Text style={styles.price}>
                    {item.price} <Text style={styles.diff}>({item.diff})</Text>
                  </Text>
                  {item.shop && <Text style={styles.shopText}>판매처: {item.shop}</Text>}
                </View>
                {item.tag && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.tag}</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  langSelector: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#FFFFFF', elevation: 1 },
  langText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  langTextActive: { color: '#111827', fontWeight: '900' },

  bodyContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  search: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    fontSize: 14,
    color: '#111827',
  },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#FF4757', borderColor: '#FF4757' },
  chipText: { color: '#6B7280', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },

  listContent: { paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: { fontSize: 26, marginRight: 14 },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  price: { fontSize: 14, fontWeight: '800', color: '#FF4757', marginTop: 2 },
  diff: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  shopText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  tag: { backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  tagText: { color: '#FF4757', fontSize: 10, fontWeight: '800' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 10, color: '#6B7280', fontSize: 13 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});