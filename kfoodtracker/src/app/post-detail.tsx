import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  setDoc,
  deleteDoc, // 💡 deleteDoc 추가
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { TRANSLATIONS } from '../constants/translations';

// 다국어 텍스트 정의
const UI_TEXT = {
  KR: {
    back: '뒤로',
    loading: '로딩 중...',
    anonymous: '익명 사용자',
    member: '회원',
    comments: '댓글',
    inputPlaceholder: '댓글을 입력하세요...',
    send: '등록',
    menuTitle: '옵션 선택',
    reportContent: '콘텐츠 신고',
    blockUser: '작성자 차단',
    delete: '삭제하기', // 💡 추가
    cancel: '취소',
    reportTitle: '신고 사유 선택',
    reportReasons: ['부적절한 내용', '스팸 및 광고', '욕설 및 비방', '기타'],
    reportSuccessTitle: '신고 접수 완료',
    reportSuccessMsg: '신고가 접수되었습니다. 24시간 이내에 검토 후 조치됩니다.',
    reportError: '신고 처리 중 오류가 발생했습니다.',
    blockSelfMsg: '본인은 차단할 수 없습니다.',
    blockSuccessTitle: '차단 완료',
    blockSuccessMsg: '해당 사용자가 차단되었습니다.',
    blockError: '차단 처리 중 오류가 발생했습니다.',
    deleteConfirmTitle: '삭제 확인', // 💡 추가
    deleteConfirmMsg: '정말로 삭제하시겠습니까?', // 💡 추가
    deleteSuccessMsg: '삭제되었습니다.', // 💡 추가
    deleteError: '삭제 처리 중 오류가 발생했습니다.', // 💡 추가
    alertTitle: '알림',
  },
  EN: {
    back: 'Back',
    loading: 'Loading...',
    anonymous: 'Anonymous User',
    member: 'Member',
    comments: 'Comments',
    inputPlaceholder: 'Write a comment...',
    send: 'Send',
    menuTitle: 'Options',
    reportContent: 'Report Content',
    blockUser: 'Block Author',
    delete: 'Delete',
    cancel: 'Cancel',
    reportTitle: 'Select Report Reason',
    reportReasons: ['Inappropriate Content', 'Spam & Ads', 'Abuse & Harassment', 'Other'],
    reportSuccessTitle: 'Report Submitted',
    reportSuccessMsg: 'Your report has been submitted. It will be reviewed within 24 hours.',
    reportError: 'An error occurred while submitting the report.',
    blockSelfMsg: 'You cannot block yourself.',
    blockSuccessTitle: 'User Blocked',
    blockSuccessMsg: 'This user has been blocked.',
    blockError: 'An error occurred while blocking the user.',
    deleteConfirmTitle: 'Confirm Delete',
    deleteConfirmMsg: 'Are you sure you want to delete this?',
    deleteSuccessMsg: 'Deleted successfully.',
    deleteError: 'An error occurred while deleting.',
    alertTitle: 'Notice',
  },
  DE: {
    back: 'Zurück',
    loading: 'Laden...',
    anonymous: 'Anonymer Benutzer',
    member: 'Mitglied',
    comments: 'Kommentare',
    inputPlaceholder: 'Kommentar schreiben...',
    send: 'Senden',
    menuTitle: 'Optionen',
    reportContent: 'Inhalt melden',
    blockUser: 'Autor blockieren',
    delete: 'Löschen',
    cancel: 'Abbrechen',
    reportTitle: 'Grund für Meldung wählen',
    reportReasons: ['Unangemessener Inhalt', 'Spam & Werbung', 'Beleidigung', 'Sonstiges'],
    reportSuccessTitle: 'Meldung eingereicht',
    reportSuccessMsg: 'Ihre Meldung wurde eingereicht. Sie wird innerhalb von 24 Stunden überprüft.',
    reportError: 'Fehler beim Einreichen der Meldung.',
    blockSelfMsg: 'Sie können sich nicht selbst blockieren.',
    blockSuccessTitle: 'Benutzer blockiert',
    blockSuccessMsg: 'Dieser Benutzer wurde blockiert.',
    blockError: 'Fehler beim Blockieren des Benutzers.',
    deleteConfirmTitle: 'Löschen bestätigen',
    deleteConfirmMsg: 'Möchten Sie dies wirklich löschen?',
    deleteSuccessMsg: 'Erfolgreich gelöscht.',
    deleteError: 'Fehler beim Löschen.',
    alertTitle: 'Hinweis',
  },
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [lang, setLang] = useState<'KR' | 'EN' | 'DE'>('KR');
  const t = TRANSLATIONS[lang];
  const ui = UI_TEXT[lang];
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const currentUser = auth.currentUser;

  // 1. 차단 유저 리스트 가져오기
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setBlockedUsers(snapshot.data().blockedUsers || []);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 2. 게시글 및 댓글 수신
  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      const docRef = doc(db, 'posts', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      }
    };
    fetchPost();

    const q = query(
      collection(db, 'posts', id as string, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentList);
    });

    return () => unsubscribe();
  }, [id]);

  // 💡 삭제 처리 함수 (게시글 / 댓글 구분)
  const handleDelete = (type: 'post' | 'comment', targetId: string) => {
    Alert.alert(ui.deleteConfirmTitle, ui.deleteConfirmMsg, [
      { text: ui.cancel, style: 'cancel' },
      {
        text: ui.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            if (type === 'post') {
              await deleteDoc(doc(db, 'posts', targetId));
              Alert.alert(ui.alertTitle, ui.deleteSuccessMsg);
              router.back(); // 게시글 삭제 후 목록으로 돌아가기
            } else {
              await deleteDoc(doc(db, 'posts', id as string, 'comments', targetId));
            }
          } catch (error) {
            console.error('삭제 오류:', error);
            Alert.alert(ui.alertTitle, ui.deleteError);
          }
        },
      },
    ]);
  };

  // 사용자 차단 처리
  const handleBlockUser = async (targetUserId: string) => {
    if (!currentUser) {
      Alert.alert(t.alertLoginTitle, t.alertLoginMsg);
      return;
    }
    if (targetUserId === currentUser.uid) {
      Alert.alert(ui.alertTitle, ui.blockSelfMsg);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userRef,
        { blockedUsers: arrayUnion(targetUserId) },
        { merge: true }
      );
      Alert.alert(ui.blockSuccessTitle, ui.blockSuccessMsg);
    } catch (error) {
      console.error('차단 오류:', error);
      Alert.alert(ui.alertTitle, ui.blockError);
    }
  };

  // 신고 처리
  const handleReport = async (type: 'post' | 'comment', targetId: string, authorId: string) => {
    if (!currentUser) {
      Alert.alert(t.alertLoginTitle, t.alertLoginMsg);
      return;
    }

    const sendReport = async (reason: string) => {
      try {
        await addDoc(collection(db, 'reports'), {
          reporterId: currentUser.uid,
          targetType: type,
          targetId: targetId,
          authorId: authorId,
          reason: reason,
          createdAt: serverTimestamp(),
        });
        Alert.alert(ui.reportSuccessTitle, ui.reportSuccessMsg);
      } catch (error) {
        console.error('신고 오류:', error);
        Alert.alert(ui.alertTitle, ui.reportError);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...ui.reportReasons, ui.cancel],
          cancelButtonIndex: ui.reportReasons.length,
          title: ui.reportTitle,
        },
        (buttonIndex) => {
          if (buttonIndex < ui.reportReasons.length) {
            sendReport(ui.reportReasons[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert(ui.reportTitle, '', [
        ...ui.reportReasons.map((reason) => ({
          text: reason,
          onPress: () => sendReport(reason),
        })),
        { text: ui.cancel, style: 'cancel' },
      ]);
    }
  };

  // 💡 더보기 메뉴 (내 글: 삭제 / 남의 글: 신고, 차단)
  const openMenu = (type: 'post' | 'comment', targetId: string, authorId: string) => {
    const isMyItem = currentUser && currentUser.uid === authorId;

    if (isMyItem) {
      // 내가 쓴 글/댓글인 경우
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [ui.delete, ui.cancel],
            destructiveButtonIndex: 0,
            cancelButtonIndex: 1,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) handleDelete(type, targetId);
          }
        );
      } else {
        Alert.alert(ui.menuTitle, '', [
          { text: ui.delete, onPress: () => handleDelete(type, targetId), style: 'destructive' },
          { text: ui.cancel, style: 'cancel' },
        ]);
      }
    } else {
      // 다른 사용자의 글/댓글인 경우
      const options = [ui.reportContent, ui.blockUser, ui.cancel];
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            destructiveButtonIndex: [0, 1],
            cancelButtonIndex: 2,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) handleReport(type, targetId, authorId);
            if (buttonIndex === 1) handleBlockUser(authorId);
          }
        );
      } else {
        Alert.alert(ui.menuTitle, '', [
          { text: ui.reportContent, onPress: () => handleReport(type, targetId, authorId) },
          { text: ui.blockUser, onPress: () => handleBlockUser(authorId) },
          { text: ui.cancel, style: 'cancel' },
        ]);
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      Alert.alert(t.alertLoginTitle, t.alertLoginMsg);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'posts', id as string, 'comments'), {
        text: newComment,
        authorId: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error('댓글 작성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={{ color: '#6B7280' }}>{ui.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 차단된 유저의 댓글 숨김 처리
  const filteredComments = comments.filter((c) => !blockedUsers.includes(c.authorId));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {ui.back}</Text>
          </TouchableOpacity>

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

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.postCard}>
            <View style={styles.postHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{post.title}</Text>
                <Text style={styles.author}>
                  {post.isAnonymous ? ui.anonymous : ui.member}
                </Text>
              </View>
              {/* 게시글 더보기 버튼 */}
              <TouchableOpacity
                onPress={() => openMenu('post', post.id, post.authorId || post.userId)}
                style={styles.moreBtn}
              >
                <Text style={styles.moreText}>⋮</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            )}

            <Text style={styles.postContent}>{post.content}</Text>
          </View>

          <Text style={styles.commentHeader}>
            💬 {ui.comments} ({filteredComments.length})
          </Text>

          {filteredComments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentAuthor}>
                  {comment.isAnonymous ? ui.anonymous : ui.member}
                </Text>
                {/* 댓글 더보기 버튼 */}
                <TouchableOpacity
                  onPress={() => openMenu('comment', comment.id, comment.authorId)}
                  style={styles.moreBtn}
                >
                  <Text style={styles.moreText}>⋮</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder={ui.inputPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity
            style={styles.commentSubmitBtn}
            onPress={handleAddComment}
            disabled={loading}
          >
            <Text style={styles.commentSubmitText}>{ui.send}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  langSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  langBtnActive: { backgroundColor: '#FFFFFF' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  langTextActive: { color: '#FF4757' },
  content: { padding: 16, paddingBottom: 30 },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 6 },
  author: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  moreBtn: { padding: 4 },
  moreText: { fontSize: 18, color: '#9CA3AF', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },
  postImage: { width: '100%', height: 220, borderRadius: 8, marginBottom: 16, resizeMode: 'cover' },
  postContent: { fontSize: 15, color: '#374151', lineHeight: 22 },
  commentHeader: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  commentCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  commentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#1F2937' },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    marginRight: 8,
  },
  commentSubmitBtn: {
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  commentSubmitText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});