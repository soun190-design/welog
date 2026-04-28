import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// 알림 생성
export const createNotification = async (coupleId, targetUid, type, message, data) => {
  try {
    var ref = collection(db, 'couples', coupleId, 'notifications');
    await addDoc(ref, {
      type: type,
      targetUid: targetUid,
      message: message,
      data: data || {},
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) { console.error(e); }
};

// 알림 목록 조회
export const getNotifications = async (coupleId, uid) => {
  try {
    var ref = collection(db, 'couples', coupleId, 'notifications');
    var q = query(
      ref,
      where('targetUid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    var snap = await getDocs(q);
    return snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
  } catch (e) { console.error(e); return []; }
};

// 읽지 않은 알림 수
export const getUnreadCount = async (coupleId, uid) => {
  try {
    var ref = collection(db, 'couples', coupleId, 'notifications');
    var q = query(ref, where('targetUid', '==', uid), where('isRead', '==', false));
    var snap = await getDocs(q);
    return snap.size;
  } catch (e) { return 0; }
};

// 알림 읽음 처리
export const markAsRead = async (coupleId, notificationId) => {
  try {
    await updateDoc(doc(db, 'couples', coupleId, 'notifications', notificationId), { isRead: true });
  } catch (e) { console.error(e); }
};

// 전체 읽음 처리
export const markAllAsRead = async (coupleId, uid) => {
  try {
    var notifications = await getNotifications(coupleId, uid);
    var unread = notifications.filter(function(n) { return !n.isRead; });
    await Promise.all(unread.map(function(n) { return markAsRead(coupleId, n.id); }));
  } catch (e) { console.error(e); }
};
