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
              onChange={e => setInp
