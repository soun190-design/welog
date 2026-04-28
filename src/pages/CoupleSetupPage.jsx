import { useState } from 'react';
import { createCouple, joinCouple } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function CoupleSetupPage() {
  const { user, refreshUserDoc } = useAuth();
  const [mode, setMode] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const { inviteCode: code } = await createCouple(user.uid);
      setInviteCode(code);
      await refreshUserDoc();
    } catch (e) {
      setError('코드 생성 중 오류가 났어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (inputCode.length < 6) {
      setError('6자리 코드를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinCouple(user.uid, inputCode);
      await refreshUserDoc();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>파트너와 연결하기 💌</h2>
        <p style={styles.sub}>초대 코드로 서로 연결해요</p>

        {!mode && (
          <div style={styles.btnGroup}>
            <button style={styles.primaryBtn} onClick={() => setMode('create')}>
              코드 만들기
            </button>
            <button style={styles.secondaryBtn} onClick={() => setMode('join')}>
              코드 입력하기
            </button>
          </div>
        )}

        {mode === 'create' && !inviteCode && (
          <div>
            <p style={styles.hint}>내 코드를 만들어 파트너에게 공유하세요</p>
            <button style={styles.primaryBtn} onClick={handleCreate} disabled={loading}>
              {loading ? '생성 중...' : '코드 생성'}
            </button>
            <button style={styles.backBtn} onClick={() => setMode(null)}>← 뒤로</button>
          </div>
        )}

        {mode === 'create' && inviteCode && (
          <div>
            <p style={styles.hint}>파트너에게 이 코드를 공유하세요</p>
            <div style={styles.codeBox}>{inviteCode}</div>
            <p style={styles.waiting}>⏳ 파트너가 입력하면 자동으로 연결돼요</p>
          </div>
        )}

        {mode === 'join' && (
          <div>
            <p style={styles.hint}>파트너에게 받은 코드를 입력하세요</p>
            <input
              style={styles.input}
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
            <button style={styles.primaryBtn} onClick={handleJoin} disabled={loading}>
              {loading ? '연결 중...' : '연결하기'}
            </button>
            <button style={styles.backBtn} onClick={() => setMode(null)}>← 뒤로</button>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: '48px 40px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    maxWidth: 360,
    width: '100%',
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub: { color: '#888', marginBottom: 32, fontSize: 15 },
  hint: { color: '#666', fontSize: 14, marginBottom: 16 },
  btnGroup: { display: 'flex', flexDirection: 'column', gap: 12 },
  primaryBtn: {
    width: '100%',
    padding: '14px',
    background: '#ff7043',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 8,
  },
  secondaryBtn: {
    width: '100%',
    padding: '14px',
    background: 'white',
    color: '#ff7043',
    border: '2px solid #ff7043',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    marginTop: 12,
    fontSize: 14,
  },
  codeBox: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 8,
    color: '#ff7043',
    background: '#fff3f0',
    borderRadius: 12,
    padding: '16px 24px',
    margin: '16px 0',
  },
  waiting: { color: '#aaa', fontSize: 13 },
  input: {
    width: '100%',
    padding: '14px',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: 6,
    border: '2px solid #e0e0e0',
    borderRadius: 12,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  error: { color: '#e53e3e', marginTop: 16, fontSize: 14 },
};
