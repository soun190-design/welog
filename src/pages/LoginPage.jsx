import { useState } from 'react';
import { signInWithGoogle } from '../firebase/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (e) {
      setError('로그인 중 문제가 생겼어요. 다시 시도해 주세요.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Welog 💑</h1>
        <p style={styles.sub}>우리 둘만의 공간</p>
        <button onClick={handleLogin} disabled={loading} style={styles.googleBtn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={{ width: 20, marginRight: 10 }}
          />
          {loading ? '로그인 중...' : 'Google로 시작하기'}
        </button>
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
  logo: { fontSize: 40, margin: '0 0 8px', fontWeight: 700 },
  sub: { color: '#888', marginBottom: 36, fontSize: 15 },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '14px 20px',
    border: '2px solid #e0e0e0',
    borderRadius: 12,
    background: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#e53e3e', marginTop: 16, fontSize: 14 },
};
