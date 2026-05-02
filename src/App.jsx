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
      <header style={styles.welogHeader}>
        <span style={styles.welogLogo}>♥ Welog</span>
        <button style={styles.headerBell} onClick={function() { setActiveTab('settings'); }}>
          🔔
          {unreadCount > 0 ? (
            <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          ) : null}
        </button>
      </header>
      <div style={styles.content}>
        {renderPage()}
      </div>
      <nav style={styles.tabBar}>
        {tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              style={Object.assign({}, styles.tabBtn, isActive ? styles.tabBtnActive : {})}
              onClick={function() { setActiveTab(tab.id); }}
            >
              <div style={styles.tabIconWrap}>
                {tab.id === 'home' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ) : tab.id === 'record' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                ) : tab.id === 'shared' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                ) : tab.id === 'content' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <polyline points="10 8 16 12 10 16 10 8"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                )}
                {tab.id === 'settings' && unreadCount > 0 ? (
                  <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                ) : null}
              </div>
              <span style={styles.tabLabel}>{tab.label}</span>
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
    display: 'flex', flexDirection: 'column', background: '#F5F0EB',
  },
  welogHeader: {
    background: '#FDFAF7', padding: '14px 24px',
    borderBottom: '1px solid #EDE8E3',
    position: 'sticky', top: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  welogLogo: {
    fontSize: 18, fontWeight: 800, color: '#FF6B6B', letterSpacing: -0.5,
  },
  headerBell: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 20, padding: 4, color: '#9E9083', position: 'relative',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 70,
  },
  tabBar: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, display: 'flex', background: '#FDFAF7',
    borderTop: '1px solid #EDE8E3', boxShadow: '0 -4px 20px rgba(180,150,130,0.10)',
    zIndex: 100, height: 60,
  },
  tabBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '8px 0', border: 'none',
    background: 'none', cursor: 'pointer', gap: 4,
    color: '#B0A69D',
  },
  tabBtnActive: { color: '#FF6B6B', borderTop: '2px solid #FF6B6B' },
  tabIconWrap: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    background: '#FF6B6B', color: 'white',
    fontSize: 9, fontWeight: 700,
    padding: '1px 4px', borderRadius: 8, minWidth: 14,
    textAlign: 'center',
  },
  tabLabel: { fontSize: 10, fontWeight: 600 },
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
