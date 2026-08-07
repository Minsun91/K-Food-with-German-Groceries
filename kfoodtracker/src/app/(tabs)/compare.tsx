import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { signInAnonymously } from 'firebase/auth'
import { TRANSLATIONS } from '../../constants/translations';
import { useRouter } from 'expo-router';

const router = useRouter();

const getMartEmoji = (martName: string = '') => {
  const name = martName.toLowerCase();
  if (name.includes('한독')) return ' 🥟';
  if (name.includes('와이') || name.includes('y-mart')) return '🛍️';
  if (name.includes('K-Shop') || name.includes('K-Shop')) return '🐳';
  if (name.includes('GoAsia') || name.includes('고아시아')) return '🇨🇳';
  if (name.includes('momogo') || name.includes('momongo')) return '👾';
  if (name.includes('코켓') || name.includes('kocket')) return '📦';
  if (name.includes('다와요') || name.includes('dawayo')) return '🚚';
  if (name.includes('joybuy')) return '🕋';
  if (name.includes('더글라스') || name.includes('douglas')) return '💄';
  if (name.includes('아마존') || name.includes('amazon')) return '📦';
  if (name.includes('stylevana')) return '👄';
  if (name.includes('Flaconi')) return '🧴';
  if (name.includes('세포라') || name.includes('Sephora')) return '';
  if (name.includes('코켓') || name.includes('kocket')) return '🥣';
  return '🏪';
};

// 💡 NEW 상품용 반짝이는 뱃지 애니메이션 컴포넌트
const NewBadge = () => {
  const animValue = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animValue]);

  return (
    <Animated.View style={[styles.newBadge, { opacity: animValue }]}>
      <Text style={styles.newBadgeText}>NEW</Text>
    </Animated.View>
  );
};

interface RawProduct {
  item: string;
  price: string | number;
  mart: string;
  link?: string;
  category: 'food' | 'beauty';
  subCategory?: string;
  isNew?: boolean;
  packSize?: string;
}

interface MartInfo {
  mart: string;
  price: number;
  link?: string;
}

interface GroupedProduct {
  id: string;
  title: string;
  category: 'food' | 'beauty';
  subCategory: string;
  minPrice: number;
  isNew?: boolean;
  packSize?: string;
  marts: MartInfo[];
}


const CATEGORY_MAP: Record<string, string[]> = {
  sauce: ['sauce', '소스', '양념', '장', '고추장', '된장', '간장', '카레', 'paste', 'curry'],
  snack: ['snack', '과자', '스낵', '간식', '초코', '파이', '칩', 'chip'],
  noodle: ['noodle', 'ramen', '라면', '면', '우동'],
  kimchi: ['kimchi', '김치', '열무'],
  canned: ['canned', 'tuna', '참치', '스팸', '햄', '통조림'],
  frozen: ['frozen', 'dumpling', '만두', '교자', '냉동'],
  rice: ['rice', '쌀', '햇반', '밥'],
  living: ['living', 'cooker', '가전', '밥솥', '쿠쿠'],
};

const MY_WEB_BASE_URL = 'https://kfoodtracker.com';

export default function CompareScreen() {
  const params = useLocalSearchParams<{ search?: string }>();
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const [selectedCat, setSelectedCat] = useState<'all' | 'food' | 'beauty'>('all');
  const [search, setSearch] = useState('');
  const [groupedItems, setGroupedItems] = useState<GroupedProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
  
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setMyFavorites(docSnap.data().favorites || []);
      }
    });
  
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (params.search) {
      setSearch(params.search);
      setSelectedCat('all');
    }
  }, [params.search]);

  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);
      try {
        const [foodSnap, beautySnap] = await Promise.all([
          getDoc(doc(db, 'prices', 'latest')),
          getDoc(doc(db, 'beauty_prices', 'latest')),
        ]);

        let foodRaw: RawProduct[] = [];
        let beautyRaw: RawProduct[] = [];

        if (foodSnap.exists()) {
          foodRaw = (foodSnap.data().data || []).map((i: any) => ({ ...i, category: 'food' }));
        }

        if (beautySnap.exists()) {
          beautyRaw = (beautySnap.data().data || []).map((i: any) => ({ ...i, category: 'beauty' }));
        }

        processAndGroupData([...foodRaw, ...beautyRaw]);
      } catch (error) {
        console.error('가격 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  const normalizeTitle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/\d+(g|ml|kg|l|개|입|p|pk)/gi, '')
      .replace(/[^a-zA-Z0-9가-힣]/g, '')
      .trim();
  };

  // 🎈 방방 뜨는 NEW 뱃지 컴포넌트
const BouncingNewBadge = ({ color = 'yellow' }: { color?: 'yellow' | 'blue' }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5, // 위로 5px 톡 튐
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  const badgeStyle = color === 'yellow' ? styles.badgeYellow : styles.badgeBlue;
  const textStyle = color === 'yellow' ? styles.badgeTextDark : styles.badgeTextWhite;

  return (
    <Animated.View
      style={[
        styles.badgeBase,
        badgeStyle,
        { transform: [{ translateY: bounceAnim }] },
      ]}
    >
      <Text style={textStyle}>NEW</Text>
    </Animated.View>
  );
};

const handleToggleFavorite = async (item: any) => {
  const currentUser = auth.currentUser;
  
  // 💡 currentUser가 없을 때만 마이페이지로 유도
  if (!currentUser) {
    Alert.alert(
      t.alertLoginTitle,
      t.alertLoginMsg,
      [
        { text: t.alertCancel, style: 'cancel' },
        { 
          text: t.alertGoMypage, 
          onPress: () => {
            router.push('/(tabs)/mypage');
          } 
        }
      ]
    );
    return;
  }

  const userDocRef = doc(db, 'users', currentUser.uid);
  const itemName = item.title || item.name;
  const itemPrice = item.minPrice || item.price || 0;

  const exists = myFavorites.some((fav) => fav.name === itemName || fav.title === itemName);

  let updatedFavorites;
  if (exists) {
    updatedFavorites = myFavorites.filter((fav) => fav.name !== itemName && fav.title !== itemName);
  } else {
    updatedFavorites = [...myFavorites, { name: itemName, price: itemPrice }];
  }

  try {
    await setDoc(userDocRef, { favorites: updatedFavorites }, { merge: true });
    setMyFavorites(updatedFavorites);
  } catch (error) {
    console.error('찜하기 실패:', error);
  }
};
  const processAndGroupData = (rawList: RawProduct[]) => {
    const map = new Map<string, GroupedProduct>();

    rawList.forEach((item, index) => {
      const rawTitle = item.item?.trim() || '상품명 없음';
      const groupKey = normalizeTitle(rawTitle) || rawTitle.toLowerCase();
      
      const numPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price as string) || 0;
      const subCat = (item.subCategory || '').toLowerCase().trim();

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: `prod_${index}_${groupKey}`,
          title: rawTitle,
          category: item.category,
          subCategory: subCat,
          minPrice: numPrice,
          isNew: item.isNew,
          packSize: item.packSize,
          marts: [{ mart: item.mart, price: numPrice, link: item.link }],
        });
      } else {
        const existing = map.get(groupKey)!;

        const isMartExist = existing.marts.some((m) => m.mart === item.mart);
        if (!isMartExist) {
          existing.marts.push({ mart: item.mart, price: numPrice, link: item.link });
        }

        if (item.isNew) {
          existing.isNew = true;
        }

        if (!existing.subCategory && subCat) {
          existing.subCategory = subCat;
        }

        if (numPrice > 0 && (numPrice < existing.minPrice || existing.minPrice === 0)) {
          existing.minPrice = numPrice;
        }
      }
    });

    const result = Array.from(map.values()).map((prod) => ({
      ...prod,
      marts: prod.marts.sort((a, b) => a.price - b.price),
    }));

    setGroupedItems(result);
  };

  
const handleShare = async (product: GroupedProduct) => {
  try {
    const encodedTitle = encodeURIComponent(product.title);
    const langParam = lang === 'KR' ? 'ko' : lang.toLowerCase();
    const shareUrl = `${MY_WEB_BASE_URL}/price?search=${encodedTitle}&lang=${langParam}&tab=${selectedCat}`;
    const priceStr = product.minPrice.toFixed(2);

    // 💡 현재 선택된 언어(lang)에 맞는 메세지 생성
    const message = t.shareMessage(product.title, priceStr, shareUrl);

    await Share.share(
      Platform.OS === 'ios' ? { message, url: shareUrl } : { message }
    );
  } catch (error) {
    console.error('공유 실패:', error);
  }
};

const openLink = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Page load error:', err));
    }
  };

  const displayItems = groupedItems.filter((item) => {
    const matchesCategory = selectedCat === 'all' || item.category === selectedCat;

    const query = search.trim().toLowerCase();
    if (!query) return matchesCategory;

    const itemSubCat = item.subCategory;
    const itemTitle = item.title.toLowerCase();

    let matchesCategoryMap = false;
    for (const [catId, keywords] of Object.entries(CATEGORY_MAP)) {
      const isQueryInKeywords = keywords.some((kw) => query.includes(kw) || kw.includes(query));
      if (isQueryInKeywords && (itemSubCat === catId || catId.includes(query))) {
        matchesCategoryMap = true;
        break;
      }
    }

    const matchesTitle = itemTitle.includes(query);
    const matchesSubCat = itemSubCat.includes(query);

    return matchesCategory && (matchesCategoryMap || matchesTitle || matchesSubCat);
  });

  return (
    <SafeAreaView style={styles.container}>
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

      {/* 2. 검색창 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t.placeholder} // 💡 다국어 플레이스홀더 적용
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. 대카테고리 탭 */}
      <View style={styles.tabRow}>
        {[
          { key: 'all', label: t.catAll },       // 💡 다국어 탭 적용
          { key: 'food', label: t.catFood },     
          { key: 'beauty', label: t.catBeauty }, 
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedCat === tab.key && styles.activeTab]}
            onPress={() => setSelectedCat(tab.key as any)}
          >
            <Text style={[styles.tabText, selectedCat === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. 리스트 */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FF4757" />
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t.emptyText}</Text> {/* 💡 다국어 빈 화면 문구 */}
            </View>
          }
          renderItem={({ item }) => {
            const isFavorited = myFavorites.some((fav) => fav.name === item.title || fav.title === item.title);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleWrapper}>
                    <BouncingNewBadge color="yellow" />
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity 
                      style={styles.shareBtn} 
                      onPress={() => handleToggleFavorite(item)}
                    >
                      <Text style={{ fontSize: 16 }}>{isFavorited ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
          
                    <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(item)}>
                      <Text style={styles.shareBtnText}>{t.shareBtn}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
          
                <View style={styles.divider} />
          
                <View style={styles.martListContainer}>
                  {item.marts.map((m, idx) => (
                    <TouchableOpacity
                      key={`${m.mart}_${idx}`}
                      style={styles.martRow}
                      onPress={() => openLink(m.link)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.martInfo}>
                        <Text style={styles.martName}>
                          {getMartEmoji(m.mart)} {m.mart}
                        </Text>
                        {idx === 0 && <Text style={styles.bestTag}>최저가몰</Text>}
                      </View>
          
                      <View style={styles.martPriceContainer}>
                        <Text style={[styles.martPrice, idx === 0 && styles.bestPriceText]}>
                          € {m.price.toFixed(2)}
                        </Text>
                        <Text style={styles.linkArrow}>➔</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' }, // 커뮤니티와 동일한 안전 영역 추가
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
 topBar: { 
    paddingHorizontal: 20, 
    paddingTop: 6, 
    paddingBottom: 4, 
    alignItems: 'flex-end', 
    backgroundColor: 'transparent' // 흰색 배경 제거하여 공백 없애기
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' }, // 커뮤니티 폰트 컬러와 통일감 부여
  
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
  langTextActive: { fontWeight: 'bold', color: '#FF4757' },
  shareBtnText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 44, fontSize: 13, color: '#111827' },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '800' },

  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 6,
  },
  activeTab: { backgroundColor: '#FF4757' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  activeTabText: { color: '#FFFFFF' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 20 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 6,
    flexShrink: 1,
  },
  shareBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 6,
  },
  shareText: { fontSize: 12, color: '#6B7280' },
  icon: { fontSize: 24, marginRight: 10 },
  packSizeText: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  newBadge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  newBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },

  minPriceBadge: { backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  minPriceLabel: { fontSize: 9, color: '#FF4757', fontWeight: '800' },
  minPriceValue: { fontSize: 13, color: '#FF4757', fontWeight: '900' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },

  martListContainer: { marginTop: 2 },
  martRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAFA',
  },
  martInfo: { flexDirection: 'row', alignItems: 'center' },
  martName: { fontSize: 12, color: '#374151', fontWeight: '600' },
  bestTag: {
    backgroundColor: '#FF4757',
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },

  martPriceContainer: { flexDirection: 'row', alignItems: 'center' },
  martPrice: { fontSize: 12, color: '#4B5563', fontWeight: '700', marginRight: 4 },
  bestPriceText: { color: '#FF4757', fontWeight: '900' },
  linkArrow: { fontSize: 11, color: '#9CA3AF' },

  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  
  badgeBase: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeYellow: { backgroundColor: '#FFD700' },
  badgeBlue: { backgroundColor: '#2563EB' },
  badgeTextDark: { color: '#000000', fontWeight: '900', fontSize: 9 },
  badgeTextWhite: { color: '#FFFFFF', fontWeight: '900', fontSize: 9 },
});