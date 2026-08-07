// components/LangToggle.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LangToggleProps {
  lang: 'KR' | 'EN' | 'DE';
  setLang: (lang: 'KR' | 'EN' | 'DE') => void;
}

export default function LangToggle({ lang, setLang }: LangToggleProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.langSelector}>
        {(['KR', 'EN', 'DE'] as const).map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}
          >
            <Text style={[styles.langText, lang === l && styles.langTextActive]}>
              {l}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    alignItems: 'flex-end',
    backgroundColor: '#fff',
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#fff',
  },
  langText: {
    fontSize: 12,
    color: '#6B7280',
  },
  langTextActive: {
    fontWeight: 'bold',
    color: '#FF4757', // 💡 활성화 시 지정해주신 빨간색(#FF4757) 적용
  },
});