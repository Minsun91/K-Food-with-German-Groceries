import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CommunityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>독일 수다방 💬</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🇩🇪 프랑크푸르트 고아시아 신라면 할인하네요!</Text>
          <Text style={styles.cardDesc}>오늘 갔더니 1.09유로에 세일 중입니다.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💄 메디큐브 직구 배송 얼마나 걸리나요?</Text>
          <Text style={styles.cardDesc}>보통 3~5일이면 들어오는 것 같아요.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 10, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#666' },
});