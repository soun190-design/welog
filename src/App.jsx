import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoupleProvider, useCouple } from './contexts/CoupleContext';
import LoginPage from './pages/LoginPage';
import CoupleSetupPage from './pages/CoupleSetupPage';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import SharedPage from './pages/SharedPage';
import ContentPage from './pages/ContentPage';
import SettingsPage from './pages/SettingsPage';
import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from './firebase/notifications';

function AppRouter() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const { couple, isConnected, loading: coupleLoading } = useCouple();
  const [activeTab, setActiveTab] = useState('home');
  const [unreadCount, setUnreadCount] = useState(0);

  var loadUnread = useCallback(async function() {
    if (!user || !couple) return;
    var count = await getUnreadCount(couple.id, user.uid);
    setUnreadCount(count);
  }, [user, couple]);

  useEffect(function() {
    loadUnread();
    var interval = setInterval(loadUnread, 30000);
    return function() { clearInterval(interval); };
  }, [loadUnread]);

  if (authLoading || coupleLoading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  if (!userDoc?.coupleId || !isConnected) return <CoupleSetupPage />;

  const tabs = [
    { id: 'home',     label: '홈',    icon: '🏠' },
    { id: 'record',   label: '기록',  icon: '📓' },
    { id: 'shared',   label: '공동관리', icon: '💰' },
    { id: 'content',  label: '컨텐츠', icon: '📚' },
    { id: 'settings', label: '설정',  icon: '⚙️' },
  ];

  const renderPage = () => {
    switch (activeTab) {
      case 'home':     return <HomePage onNotificationRead={loadUnread} />;
      case 'record':   return <RecordPage />;
      case 'shared':   return <SharedPage />;
      case 'content':  return <ContentPage />;
      case 'settings': return <SettingsPage onNotificationRead={loadUnread} />;
      default:         return <HomePage />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {renderPage()}
      </div>
      <nav style={styles.tabBar}>
        {tabs.map(function(tab) {
          return (
            <button
              key={tab.id}
              style={Object.assign({}, styles.tabBtn, activeTab === tab.id ? styles.tabBtnActive : {})}
              onClick={function() { setActiveTab(tab.id); }}
            >
              <div style={styles.tabIconWrap}>
                <span style={styles.tabIcon}>{tab.icon}</span>
                {tab.id === 'settings' && unreadCount > 0 ? (
                  <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                ) : null}
              </div>
              <span style={Object.assign({}, styles.tabLabel, activeTab === tab.id ? styles.tabLabelActive : {})}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
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

const styles = {
  container: {
    maxWidth: 480, margin: '0 auto', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', background: '#FAFAF8',
  },
  content: { flex: 1, overflowY: 'auto', paddingBottom: 70 },
  tabBar: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, display: 'flex', background: 'white',
    borderTop: '1px solid #f0f0f0', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)', zIndex: 100,
  },
  tabBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '8px 0', border: 'none',
    background: 'none', cursor: 'pointer', gap: 2,
  },
  tabBtnActive: { borderTop: '2px solid #ff7043' },
  tabIconWrap: { position: 'relative' },
  tabIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -4, right: -8,
    background: '#e53e3e', color: 'white',
    fontSize: 9, fontWeight: 700,
    padding: '1px 4px', borderRadius: 8, minWidth: 14,
    textAlign: 'center',
  },
  tabLabel: { fontSize: 10, fontWeight: 600, color: '#aaa' },
  tabLabelActive: { color: '#ff7043' },
};

export default function App() {
  return (
    <AuthProvider>
      <CoupleProvider>
        <AppRouter />
      </CoupleProvider>
    </AuthProvider>
  );
}
