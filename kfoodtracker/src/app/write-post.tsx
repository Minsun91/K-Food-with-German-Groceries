import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { TRANSLATIONS } from '../constants/translations';

export default function WritePostScreen() {
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const t = TRANSLATIONS[lang];
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 갤러리에서 사진 선택하기
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('권한 필요', '사진을 첨부하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert(
        lang === 'KR' ? '알림' : 'Notice',
        lang === 'KR' ? '제목과 내용을 모두 입력해주세요.' : 'Please enter title and content.'
      );
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(t.alertLoginTitle, t.alertLoginMsg);
      return;
    }

    try {
      setLoading(true);
      let imageUrl = null;

      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `community/${Date.now()}_${currentUser.uid}.jpg`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'posts'), {
        title,
        content,
        imageUrl,
        authorId: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        lang === 'KR' ? '성공' : 'Success',
        lang === 'KR' ? '게시글이 등록되었습니다!' : 'Post created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('글 작성 실패:', error);
      Alert.alert('Error', '게시글 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        {/* 1. 최상단 언어 선택 토글 (우측 정렬) */}
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

        {/* 2. 언어 선택 바 아래 위치하는 헤더 (돌아가기 버튼) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {lang === 'KR' ? '돌아가기' : 'Back'}</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 본문 폼 */}
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.screenTitle}>
            {lang === 'KR' ? '새 글 작성하기 ✍️' : 'Write a Post ✍️'}
          </Text>

          <TextInput
            style={styles.inputTitle}
            placeholder={lang === 'KR' ? '제목을 입력하세요' : 'Enter title'}
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.inputContent}
            placeholder={lang === 'KR' ? '내용을 입력하세요...' : 'Enter content...'}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
          />

          {/* 사진 첨부 버튼 및 미리보기 */}
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            <Text style={styles.imagePickerBtnText}>
              {imageUri ? '📷 사진 변경하기' : '📷 사진 첨부하기'}
            </Text>
          </TouchableOpacity>

          {imageUri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageBtn}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>X</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.noticeText}>
            {lang === 'KR' ? '⚠️ 작성하신 글과 사진은 모든 사용자에게 공개됩니다.' : '⚠️ Your post and photo will be visible to all users.'}
          </Text>

          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.disabledBtn]} 
            onPress={handleCreatePost}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>
              {loading ? '등록 중...' : (lang === 'KR' ? '등록하기' : 'Submit')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    paddingHorizontal: 16, 
    paddingTop: 8 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { color: '#FF4757' },
  form: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  inputTitle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#1F2937',
  },
  inputContent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    height: 150,
    marginBottom: 12,
    color: '#1F2937',
  },
  imagePickerBtn: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerBtnText: { color: '#4B5563', fontWeight: '600', fontSize: 14 },
  previewContainer: { position: 'relative', marginBottom: 16, alignItems: 'center' },
  previewImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeText: { fontSize: 12, color: '#9CA3AF', marginBottom: 20, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#FF4757',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#FCA5A5' },
  submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});