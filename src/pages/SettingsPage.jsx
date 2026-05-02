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
  const [notiDajeong, setNotiDajeong] = useState(true);
  const [notiHealth, setNotiHealth] = useState(true);
  const [notiNight, setNotiNight] = useState(false);

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

  var formatTime = function(createdAt) {
    if (!createdAt) return '';
    var date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>설정 및 알림</h2>
        <p style={styles.subcopy}>
          {couple && couple.members && couple.members.length === 2 ? '파트너와 연결 중 ❤️' : '파트너 연결 대기 중'}
        </p>
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
          {/* 알림 설정 토글 */}
          <div style={styles.card}>
            <p style={styles.cardSectionLabel}>알림 설정</p>
            {[
              { label: '다정한 알림 받기', desc: '사소한 일상도 알림으로 받아요', val: notiDajeong, setter: setNotiDajeong, icon: '💌' },
              { label: '건강 기록 알림', desc: '파트너 컨디션 업데이트 시 알림', val: notiHealth, setter: setNotiHealth, icon: '🏃' },
              { label: '야간 알림 제한', desc: '오후 10시~오전 7시 음소거', val: notiNight, setter: setNotiNight, icon: '🌙' },
            ].map(function(item) {
              return (
                <div key={item.label} style={styles.toggleRow}>
                  <div style={styles.toggleIconWrap}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                  </div>
                  <div style={styles.toggleInfo}>
                    <p style={styles.toggleLabel}>{item.label}</p>
                    <p style={styles.toggleDesc}>{item.desc}</p>
                  </div>
                  <button
                    style={Object.assign({}, styles.toggleBtn, item.val ? styles.toggleBtnOn : {})}
                    onClick={function() { item.setter(function(p) { return !p; }); }}
                  >
                    <div style={Object.assign({}, styles.toggleKnob, item.val ? styles.toggleKnobOn : {})} />
                  </button>
                </div>
              );
            })}
          </div>

          <div style={styles.notiHeader}>
            <p style={styles.notiCount}>{notifications.filter(function(n) { return !n.isRead; }).length}개의 새 알림</p>
            <button style={styles.readAllBtn} onClick={handleMarkAllRead}>전체 읽음</button>
          </div>
          {notifications.length === 0 ? (
            <div style={styles.emptyCard}>
              <p style={styles.emptyEmoji}>🔔</p>
              <p style={styles.emptyTitle}>아직 알림이 없어요</p>
              <p style={styles.emptyDesc}>파트너 활동이 생기면 알려드릴게요</p>
            </div>
          ) : (
            notifications.map(function(noti) {
              var notiColors = {
                budget: { bg: '#FFF0EE', color: '#FF6B6B', label: '가계부' },
                schedule: { bg: '#EEF7F0', color: '#5A8A6A', label: '일정' },
              };
              var notiStyle = notiColors[noti.type] || { bg: '#F0F0F5', color: '#9E9083', label: '알림' };
              var notiIcons = { budget: '💰', schedule: '📅' };
              return (
                <div
                  key={noti.id}
                  style={Object.assign({}, styles.notiItem, !noti.isRead ? styles.notiItemUnread : {})}
                  onClick={function() { handleMarkRead(noti.id); }}
                >
                  <div style={Object.assign({}, styles.notiIconWrap, { background: notiStyle.bg })}>
                    <span style={{ fontSize: 18 }}>
                      {notiIcons[noti.type] || '🔔'}
                    </span>
                  </div>
                  <div style={styles.notiLeft}>
                    <span style={Object.assign({}, styles.notiType, { color: notiStyle.color })}>
                      {notiStyle.label}
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
  title: { fontSize: 32, fontWeight: 800, margin: 0, color: '#2D2D2D', letterSpacing: -0.5 },
  subcopy: { fontSize: 13, color: '#FF6B6B', margin: '4px 0 0', fontWeight: 600 },
  tabRow: { display: 'flex', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, padding: '10px', border: '1px solid #DDD5CE',
    borderRadius: 12, background: '#FDFAF7', fontSize: 13, cursor: 'pointer', color: '#5C5049',
  },
  tabActive: {
    flex: 1, padding: '10px', border: 'none', borderRadius: 12,
    background: '#FF6B6B', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  cardSectionLabel: { fontSize: 12, fontWeight: 700, color: '#9E9083', margin: '0 0 12px', letterSpacing: 0.5 },
  toggleRow: {
    display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14,
    marginBottom: 14, borderBottom: '1px solid #EDE8E3',
  },
  toggleIconWrap: {
    width: 40, height: 40, borderRadius: 20, background: '#F5F0EB',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: '#2D2D2D', margin: '0 0 2px' },
  toggleDesc: { fontSize: 11, color: '#B0A69D', margin: 0 },
  toggleBtn: {
    width: 44, height: 26, borderRadius: 13, background: '#DDD5CE',
    border: 'none', cursor: 'pointer', padding: 3, flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
  toggleBtnOn: { background: '#FF6B6B', justifyContent: 'flex-end' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, background: 'white' },
  toggleKnobOn: {},
  notiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  notiCount: { fontSize: 13, color: '#9E9083', margin: 0 },
  readAllBtn: {
    padding: '4px 12px', background: '#EDE8E3', color: '#9E9083',
    border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer',
  },
  notiItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#FDFAF7', borderRadius: 16, padding: 14, marginBottom: 8,
    boxShadow: '0 1px 4px rgba(180,150,130,0.10)', cursor: 'pointer', gap: 12,
  },
  notiItemUnread: { background: '#FFF0EE', borderLeft: '3px solid #FF6B6B' },
  notiIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notiLeft: { flex: 1 },
  notiType: { fontSize: 11, color: '#9E9083', fontWeight: 600 },
  notiMessage: { fontSize: 14, color: '#2D2D2D', margin: '4px 0 2px', fontWeight: 500 },
  notiTime: { fontSize: 11, color: '#B0A69D', margin: 0 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, background: '#FF6B6B', flexShrink: 0 },
  emptyCard: {
    background: '#FDFAF7', borderRadius: 20, padding: 40,
    textAlign: 'center', boxShadow: '0 2px 8px rgba(180,150,130,0.10)',
  },
  emptyEmoji: { fontSize: 40, margin: '0 0 10px' },
  emptyTitle: { color: '#2D2D2D', fontSize: 16, fontWeight: 700, margin: '0 0 6px' },
  emptyDesc: { color: '#B0A69D', fontSize: 13, margin: 0 },
  emptyText: { color: '#9E9083', fontSize: 14 },
  card: {
    background: '#FDFAF7', borderRadius: 20, padding: 20,
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
