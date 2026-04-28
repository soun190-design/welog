import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoupleProvider, useCouple } from './contexts/CoupleContext';
import LoginPage from './pages/LoginPage';
import CoupleSetupPage from './pages/CoupleSetupPage';

function AppRouter() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const { isConnected, loading: coupleLoading } = useCouple();

  if (authLoading || coupleLoading) {
    return <LoadingScreen />;
  }

  if (!user) return <LoginPage />;
  if (!userDoc?.coupleId || !isConnected) return <CoupleSetupPage />;

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>💑 Welog</h1>
      <p>커플 연결 완료! 앞으로 기능을 붙여나갈 거야.</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      fontSize: 32,
    }}>
      💑
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CoupleProvider>
        <AppRouter />
      </CoupleProvider>
    </AuthProvider>
  );
}
