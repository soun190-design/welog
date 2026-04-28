import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { signOutUser } from '../firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function SettingsPage() {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { couple, refreshCouple } = useCouple();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleDisconnect = async () => {
    if (!user || !couple) return;
    setLoading(true);
    setError('');
    try {
      // 커플 문서에서 내 uid 제거
      const newMembers = couple.members.filter(m => m !== user.uid);
      await updateDoc(doc(db, 'couples', couple.id), {
        members: newMembers,
      });
      // 내 유저 문서에서 coupleId 제거
      await updateDoc(doc(db, 'users', user.uid), {
        coupleId: null,
      });
      await refreshUserDoc();
      await refreshCouple();
    } catch (e) {
      setError('해지 중 오류가 났어요. 다시 시도해 주세요.');
      console.error(e);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleSignOut = async () => {
    try { await signOutUser(); }
    catch (e) { console.error(e); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>설정 ⚙️</h2>
      </div>

      {/* 프로필 */}
      <div style={styles.card}>
        <div style={styles.profile}>
          <img
            src={user?.photoURL || 'https://via.placeholder.com/48'}
            alt="프로필"
            style={styles.avatar}
          />
          <div>
            <p style={styles.name}>{user?.displayName}</p>
            <p style={styles.email}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* 커플 연결 정보 */}
      <div style={styles.card}>
        <p style={styles.sectionLabel}>커플 연결</p>
        {couple?.members?.length === 2 ? (
          <p style={styles.connectedText}>💑 파트너와 연결됨</p>
        ) : (
          <p style={styles.connectedText}>⏳ 파트너 연결 대기중</p>
        )}
        <p style={styles.codeText}>초대 코드: {couple?.inviteCode}</p>

        {!showConfirm ? (
          <button
            style={styles.disconnectBtn}
            onClick={() => setShowConfirm(true)}
          >
            커플 연결 해지
          </button>
        ) : (
          <div style={styles.confirmBox}>
            <p style={styles.confirmText}>
              정말 해지할까요? 💔{'\n'}
              연결을 해지하면 공유 데이터는 유지되지만{'\n'}
              새로 연결해야 해요.
            </p>
            <div style={styles.btnRow}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowConfirm(false)}
              >
                취소
              </button>
              <button
                style={styles.confirmBtn}
                onClick={handleDisconnect}
                disabled={loading}
              >
                {loading ? '해지 중...' : '해지하기'}
              </button>
            </div>
          </div>
        )}
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* 로그아웃 */}
      <div style={styles.card}>
        <button style={styles.signOutBtn} onClick={handleSignOut}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  header: { padding: '20px 0 12px' },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  profile: { display: 'flex', alignItems: 'center', gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontWeight: 700, fontSize: 16, margin: 0 },
  email: { color: '#aaa', fontSize: 13, margin: '4px 0 0' },
  sectionLabel: { fontSize: 13, color: '#aaa', marginBottom: 8, fontWeight: 600 },
  connectedText: { fontSize: 15, fontWeight: 600, margin: '0 0 4px' },
  codeText: { fontSize: 13, color: '#aaa', marginBottom: 16 },
  disconnectBtn: {
    width: '100%',
    padding: 12,
    background: '#fff0f0',
    color: '#e53e3e',
    border: '1px solid #ffcccc',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmBox: {
    background: '#fff8f8',
    borderRadius: 12,
    padding: 16,
  },
  confirmText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 1.6,
    marginBottom: 16,
    whiteSpace: 'pre-line',
  },
  btnRow: { display: 'flex', gap: 8 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    background: '#f5f5f5',
    color: '#888',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  signOutBtn: {
    width: '100%',
    padding: 12,
    background: '#f5f5f5',
    color: '#888',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#e53e3e', fontSize: 13, marginTop: 8 },
};
