import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { signOutUser } from '../firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getNotifications, markAsRead, markAllAsRead } from '../firebase/notifications';

export default function SettingsPage({ onNotificationRead }) {
  const { user, refreshUserDoc } = useAuth();
  const { couple, refreshCouple } = useCouple();
  const [tab, setTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  var loadNotifications = useCallback(async function() {
    if (!couple || !user) return;
    var list = await getNotifications(couple.id, user.uid);
    setNotifications(list);
  }, [couple, user]);

  useEffect(function() { loadNotifications(); }, [loadNotifications]);

  var handleMarkAllRead = async function() {
    if (!couple || !user) return;
    await markAllAsRead(couple.id, user.uid);
    await loadNotifications();
    if (onNotificationRead) onNotificationRead();
  };

  var handleMarkRead = async function(notificationId) {
    if (!couple) return;
    await markAsRead(couple.id, notificationId);
    await loadNotifications();
    if (onNotificationRead) onNotificationRead();
  };

  var handleDisconnect = async function() {
    if (!user || !couple) return;
    setLoading(true);
    setError('');
    try {
      var newMembers = couple.members.filter(function(m) { return m !== user.uid; });
      await updateDoc(doc(db, 'couples', couple.id), { members: newMembers });
      await updateDoc(doc(db, 'users', user.uid), { coupleId: null });
      await refreshUserDoc();
      await refreshCouple();
    } catch (e) {
      setError('해지 중 오류가 났어요.');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  var getDday = function() {
    if (!couple || !couple.createdAt) return null;
    var start = couple.createdAt.toDate ? couple.createdAt.toDate() : new Date(couple.createdAt);
    var now = new Date();
    var diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  var getTypeLabel = function(type) {
    if (type === 'budget') return '💰 가계부';
    if (type === 'schedule') return '📅 일정';
    return '🔔 알림';
  };

  var formatTime = function(createdAt) {
    if (!createdAt) return '';
    var date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>설정 ⚙️</h2>
      </div>

      <div style={styles.tabRow}>
        <button style={tab === 'notifications' ? styles.tabActive : styles.tabBtn} onClick={function() { setTab('notifications'); }}>
          🔔 알림
        </button>
        <button style={tab === 'account' ? styles.tabActive : styles.tabBtn} onClick={function() { setTab('account'); }}>
          👤 계정
        </button>
      </div>

      {/* 알림 탭 */}
      {tab === 'notifications' ? (
        <div>
          <div style={styles.notiHeader}>
            <p style={styles.notiCount}>{notifications.filter(function(n) { return !n.isRead; }).length}개의 새 알림</p>
            <button style={styles.readAllBtn} onClick={handleMarkAllRead}>전체 읽음</button>
          </div>
          {notifications.length === 0 ? (
            <div style={styles.emptyCard}>
              <p style={styles.emptyText}>알림이 없어요 🔔</p>
            </div>
          ) : (
            notifications.map(function(noti) {
              return (
                <div
                  key={noti.id}
                  style={Object.assign({}, styles.notiItem, !noti.isRead ? styles.notiItemUnread : {})}
                  onClick={function() { handleMarkRead(noti.id); }}
                >
                  <div style={Object.assign({}, styles.notiIconWrap, {
                    background: noti.type === 'budget' ? '#FFF0EE' : noti.type === 'schedule' ? '#EEF7F0' : '#F0F0F5',
                  })}>
                    <span style={{ fontSize: 18 }}>
                      {noti.type === 'budget' ? '💰' : noti.type === 'schedule' ? '📅' : '🔔'}
                    </span>
                  </div>
                  <div style={styles.notiLeft}>
                    <span style={Object.assign({}, styles.notiType, {
                      color: noti.type === 'budget' ? '#FF6B6B' : noti.type === 'schedule' ? '#5A8A6A' : '#9E9083',
                    })}>
                      {noti.type === 'budget' ? '가계부' : noti.type === 'schedule' ? '일정' : '알림'}
                    </span>
                    <p style={styles.notiMessage}>{noti.message}</p>
                    <p style={styles.notiTime}>{formatTime(noti.createdAt)}</p>
                  </div>
                  {!noti.isRead ? <div style={styles.unreadDot} /> : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {/* 계정 탭 */}
      {tab === 'account' ? (
        <div>
          <div style={styles.card}>
            <div style={styles.profile}>
              <img src={(user && user.photoURL) || 'https://via.placeholder.com/48'} alt="프로필" style={styles.avatar} />
              <div>
                <p style={styles.name}>{user && user.displayName}</p>
                <p style={styles.email}>{user && user.email}</p>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <p style={styles.sectionLabel}>커플 연결</p>
            {couple && couple.members && couple.members.length === 2 ? (
              <div style={styles.connectedRow}>
                <p style={styles.connectedText}>💑 파트너와 연결됨</p>
                {getDday() !== null ? (
                  <span style={styles.ddayBadge}>D+{getDday()}</span>
                ) : null}
              </div>
            ) : (
              <p style={styles.connectedText}>⏳ 파트너 연결 대기중</p>
            )}
            <p style={styles.codeText}>초대 코드: {couple && couple.inviteCode}</p>
            {!showConfirm ? (
              <button style={styles.disconnectBtn} onClick={function() { setShowConfirm(true); }}>
                커플 연결 해지
              </button>
            ) : (
              <div style={styles.confirmBox}>
                <p style={styles.confirmText}>정말 해지할까요? 💔{'\n'}연결을 해지하면 새로 연결해야 해요.</p>
                <div style={styles.btnRow}>
                  <button style={styles.cancelBtn} onClick={function() { setShowConfirm(false); }}>취소</button>
                  <button style={styles.confirmBtn} onClick={handleDisconnect} disabled={loading}>
                    {loading ? '해지 중...' : '해지하기'}
                  </button>
                </div>
              </div>
            )}
            {error ? <p style={styles.error}>{error}</p> : null}
          </div>

          <div style={styles.card}>
            <button style={styles.signOutBtn} onClick={signOutUser}>로그아웃</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: { padding: 20, paddingBottom: 40 },
  header: { padding: '20px 0 12px' },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#2D2D2D' },
  tabRow: { display: 'flex', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, padding: '10px', border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  tabActive: {
    flex: 1, padding: '10px', border: 'none', borderRadius: 12,
    background: '#FF6B6B', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  notiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  notiCount: { fontSize: 13, color: '#9E9083', margin: 0 },
  readAllBtn: {
    padding: '4px 12px', background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  },
  notiItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#FDFAF7', borderRadius: 12, padding: 14, marginBottom: 8,
    boxShadow: '0 1px 4px rgba(180,150,130,0.10)', cursor: 'pointer',
  },
  notiItemUnread: { background: '#FFF0EE', borderLeft: '3px solid #FF6B6B' },
  notiLeft: { flex: 1 },
  notiType: { fontSize: 11, color: '#9E9083', fontWeight: 600 },
  notiMessage: { fontSize: 14, color: '#2D2D2D', margin: '4px 0 2px', fontWeight: 500 },
  notiTime: { fontSize: 11, color: '#B0A69D', margin: 0 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, background: '#FF6B6B', flexShrink: 0 },
  emptyCard: {
    background: '#FDFAF7', borderRadius: 16, padding: 40,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  emptyText: { color: '#9E9083', fontSize: 14 },
  card: {
    background: '#FDFAF7', borderRadius: 16, padding: 20,
    marginBottom: 12, boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  profile: { display: 'flex', alignItems: 'center', gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontWeight: 700, fontSize: 16, margin: 0, color: '#2D2D2D' },
  email: { color: '#9E9083', fontSize: 13, margin: '4px 0 0' },
  sectionLabel: { fontSize: 13, color: '#9E9083', marginBottom: 8, fontWeight: 600 },
  connectedRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  connectedText: { fontSize: 15, fontWeight: 600, margin: 0, color: '#2D2D2D' },
  ddayBadge: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    color: 'white', fontSize: 12, fontWeight: 800,
    padding: '3px 10px', borderRadius: 20,
    boxShadow: '0 2px 8px rgba(255,107,107,0.30)',
    letterSpacing: 0.5,
  },
  codeText: { fontSize: 13, color: '#9E9083', marginBottom: 16 },
  disconnectBtn: {
    width: '100%', padding: 12, background: '#fff0f0', color: '#e53e3e',
    border: '1px solid #ffcccc', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  confirmBox: { background: '#fff8f8', borderRadius: 12, padding: 16 },
  confirmText: { fontSize: 14, color: '#5C5049', lineHeight: 1.6, marginBottom: 16, whiteSpace: 'pre-line' },
  btnRow: { display: 'flex', gap: 8 },
  cancelBtn: {
    flex: 1, padding: 12, background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1, padding: 12, background: '#e53e3e', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  signOutBtn: {
    width: '100%', padding: 12, background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  error: { color: '#e53e3e', fontSize: 13, marginTop: 8 },
};
